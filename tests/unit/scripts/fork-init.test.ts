/**
 * @vitest-environment node
 *
 * Forced to the `node` environment (not the project default, `happy-dom`). Checked directly: a
 * throwaway test run under the default `happy-dom` environment printed `import.meta.url` as a
 * plain `file://` URL, but printed `new URL('../../..', import.meta.url).href` — the same join
 * `CLI_REPO_ROOT` below performs — as an `http://localhost:.../@fs/...` dev-server URL instead.
 * `fileURLToPath` throws on a non-`file:` URL, so `CLI_REPO_ROOT` could not be computed under
 * `happy-dom`. The need is specific to this file's `CLI_REPO_ROOT` and `TEST_FILE_DIR` (below),
 * both module-scope `import.meta.url` derivations — not to this file in general.
 * Three other files in this project already carry the same directive, each for its own, different
 * reason: tests/unit/workers/challenge-sw-response.test.ts (happy-dom's `Response` drops
 * `Set-Cookie` headers entirely), tests/unit/workers/runtimeHost-response.test.ts (happy-dom's
 * `Response` accepts a non-empty body with a null-body status that a real engine rejects), and
 * tests/unit/workers/runtime-guard-invariants.test.ts (pure source-text regex checks with no DOM
 * dependency at all).
 */
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  readdirSync,
  utimesSync,
  statSync,
  realpathSync,
  symlinkSync,
  unlinkSync,
  chmodSync,
} from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { parse as parseYaml } from 'yaml'
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import {
  parseForkInitArgs,
  runForkInit,
  ForkInitArgError,
  UPSTREAM_SLUG,
  matchesOriginGrammar,
  deriveGithubPagesOrigin,
  type ForkInitResult,
} from '../../../scripts/fork-init'

// ─── fixture builder ─────────────────────────────────────────────────────────

/** A fixed past time: real writes land after it, so a snapshot taken before and after an
 * operation that is supposed to write nothing matches only when mtimes truly did not change. */
const FIXED_PAST = new Date('2020-01-01T00:00:00Z')

/** Recursively list every file under `root`, relative path posix-joined. `node_modules` is
 *  skipped: the CLI fixture symlinks the repository's own (huge, and never touched by the
 *  engine's own exclusion list). */
function listFiles(root: string, rel = ''): string[] {
  const out: string[] = []
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const childRel = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) out.push(...listFiles(root, childRel))
    else if (entry.isFile()) out.push(childRel)
  }
  return out
}

/** Set every file's mtime to FIXED_PAST, ahead of a snapshot comparison. */
function pinMtimes(root: string) {
  for (const rel of listFiles(root)) utimesSync(join(root, rel), FIXED_PAST, FIXED_PAST)
}

/** Every file's relative path, bytes and mtimeMs — a byte- and time-exact tree snapshot. */
function snapshotTree(root: string): Array<{ path: string; bytes: string; mtimeMs: number }> {
  return listFiles(root)
    .sort()
    .map((rel) => {
      const abs = join(root, rel)
      return {
        path: rel,
        bytes: readFileSync(abs).toString('base64'),
        mtimeMs: statSync(abs).mtimeMs,
      }
    })
}

/** Overwrite the fixture's manifest with an arbitrary (possibly invalid) raw string. */
function writeManifest(root: string, raw: string) {
  writeFileSync(join(root, 'package.json'), raw)
}

// T60's minimal, SITE_BASE-deriving template — shared so workflow-state tests below can build
// "current"/"old"/"other" deploy.yml fixtures against exactly what `writeFixture` installs.
const CURRENT_TEMPLATE_LF = [
  '# WXL fork deploy — from scripts/templates/deploy.yml.template',
  'name: Deploy',
  'jobs:',
  '  build:',
  '    steps:',
  '      - name: Configure Pages',
  '        id: pages',
  '        uses: actions/configure-pages@test',
  '      - name: Build',
  '        env:',
  '          SITE_BASE: ${{ steps.pages.outputs.base_path }}/',
  '        run: pnpm build',
  '',
].join('\n')

// The frozen, verbatim copy of the template at `72327e2` (traceability.md "Workflow states" and
// T27): the engine's one known old output. Read from the ticket's own frozen fixture file so this
// test file and the engine's `KNOWN_OLD_DEPLOY_SHA256` list stay pinned to the same bytes.
const TEST_FILE_DIR = fileURLToPath(new URL('.', import.meta.url))
const OLD_TEMPLATE_LF = readFileSync(join(TEST_FILE_DIR, '../workflows/fixtures/deploy-template-72327e2.yml'), 'utf8')
// The "literal SITE_BASE" non-deriving shape, read from the frozen upstream fixture (its
// `env.SITE_BASE: /wxl-platform/` is fixed, not derived from `steps.pages.outputs.base_path`)
// rather than a hand-written minimal YAML — so the case exercises the real upstream shape.
const UPSTREAM_DEPLOY_LITERAL_SITE_BASE = readFileSync(join(TEST_FILE_DIR, '../workflows/fixtures/upstream-deploy.yml'), 'utf8')

function writeFixture(root: string) {
  const w = (rel: string, content: string) => {
    const abs = join(root, rel)
    mkdirSync(join(abs, '..'), { recursive: true })
    writeFileSync(abs, content)
  }

  w(
    'package.json',
    JSON.stringify(
      {
        name: 'wxl',
        version: '1.0.0',
        author: 'CXPh03n1x',
        description: 'Web eXploitation Laboratory — powered by WASM',
        license: 'LicenseRef-LICENSE',
        repository: { type: 'git', url: 'git+https://github.com/BrowserLaboratory/wxl-platform.git' },
        bugs: { url: 'https://github.com/BrowserLaboratory/wxl-platform/issues' },
        homepage: 'https://github.com/BrowserLaboratory/wxl-platform#readme',
      },
      null,
      2,
    ) + '\n',
  )

  // T60: the shared fixture gains A9 (upstream form) and its required `  base: siteBase,` line.
  w(
    '.vitepress/config.mts',
    [
      "const siteBase = process.env.SITE_BASE || '/'",
      '',
      'export default {',
      "  title: 'Web eXploitation Laboratory',",
      '  base: siteBase,',
      '  themeConfig: {',
      "    socialLinks: [{ icon: 'github', link: 'https://github.com/BrowserLaboratory/wxl-platform' }],",
      '  },',
      '}',
      '',
    ].join('\n'),
  )

  // A2 (the quality-gates badge, two occurrences: the image URL and the link) and A3 (the clone
  // line), in both README files (T60: the shared fixture gains A2 and a README.en.md with A2/A3).
  const readmeBody =
    '[![Quality Gates](https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/quality-gates.yml/badge.svg)]' +
    '(https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/quality-gates.yml)\n' +
    'git clone https://github.com/BrowserLaboratory/wxl-platform.git\n'
  w('README.md', readmeBody)
  w('README.en.md', readmeBody)
  // A4 (the remote add line) and A5 (the issues link, T60), in CONTRIBUTE.md.
  w(
    'CONTRIBUTE.md',
    'git remote add upstream https://github.com/BrowserLaboratory/wxl-platform.git\n' +
      'Found a bug? Open a [GitHub Issues](https://github.com/BrowserLaboratory/wxl-platform/issues) entry.\n',
  )
  // CHANGELOG carries upstream-slug links, outside any A1–A9 anchor: rebrand mode's tree walk
  // still rewrites it; anchor mode leaves it byte-identical (T3).
  w(
    'CHANGELOG.md',
    [
      '- fix: see https://github.com/BrowserLaboratory/wxl-platform/pull/1',
      '- feat: see https://github.com/BrowserLaboratory/wxl-platform/issues/2',
      '',
    ].join('\n'),
  )
  // the real template carries `wxl` in a comment + a skill path — the created deploy.yml must
  // therefore be inventoried like any other active file (not silently omitted). T60: the template
  // becomes a minimal workflow that derives SITE_BASE (a `configure-pages` step with id `pages`
  // before a `pnpm build` step setting it), keeping the `# WXL fork deploy` comment line.
  w('scripts/templates/deploy.yml.template', CURRENT_TEMPLATE_LF)

  // runtime-sensitive keys
  w('.vitepress/theme/i18n/index.ts', "export const LOCALE_STORAGE_KEY = 'wxl-locale'\n")
  w('scripts/challenge-verify-blind.ts', 'const rt = process.env.WXL_VERIFY_RUNTIME\n// workDir tmp/wxl-verify/<slug>\n')
  w('.gitignore', 'tmp/wxl-verify/\n')
  w('.github/workflows/release.yml', 'run: zip -r "../../wxl-${GITHUB_REF_NAME}.zip" .\n')

  // excluded paths (must never be touched)
  w('pnpm-lock.yaml', 'wxl: 1.0.0 # lockfile, must stay\n')
  w('.vitepress/dist/old.html', 'built wxl page — https://github.com/BrowserLaboratory/wxl-platform\n')
  // an ACTIVE sibling whose name merely begins with "dist" — must NOT be treated as build output
  w('.vitepress/dist-notes.md', 'planning note — https://github.com/BrowserLaboratory/wxl-platform\n')
  // skill identifiers are structural (they name the skill directories) — excluded from rename
  w('.agents/skills/wxl-create/SKILL.md', 'name: wxl-create — wxl brand\n')
  w('.claude/skills/wxl-create/SKILL.md', 'name: wxl-create — wxl brand\n')
  // the tool's own source must keep its literal wxl/WXL probes
  w('scripts/fork-init.ts', "const probe = /wxl-locale/ // WXL tool self\n")
  // a Title-case brand token the exact-case rename can't handle -> must be reported as residual
  w('.vitepress/theme/useWxlsh.ts', 'export function useWxlsh() {} // Wxlsh title-case identifier\n')

  // T-0015/T60: the shared fixture gains both home pages (A7) — shaped like the real files: ONE
  // frontmatter block (`hero:` and `features:` both column-0 keys INSIDE it, matching
  // platform/index.md), `hero:` holding a double-quoted `  name: "WXL"`, and `features:` holding a
  // deeper-indented `title:` that must never be mistaken for an A7 candidate — and the short-link
  // module (A8), at its upstream value.
  const heroPage = (tagline: string) =>
    [
      '---',
      'layout: home',
      '',
      'hero:',
      '  name: "WXL"',
      `  tagline: ${tagline}`,
      '',
      'features:',
      '  - icon:',
      '      src: /icons/browser.svg',
      '    title: Browser Emulator',
      '    details: Built-in sandbox',
      '---',
      '',
    ].join('\n')
  w('platform/index.md', heroPage('Browser-based web exploitation challenge platform'))
  w('platform/zh-TW/index.md', heroPage('完全基於前端 WASM 的 Web 資安挑戰平台'))
  w('.vitepress/challenge/shortLink.ts', "export const SITE_ORIGIN = 'https://wxl.browserlab.online'\n")
}

// T60: rewritten to the A9 version — a config whose A9 line is already a literal (not upstream's
// form), with its required `  base: siteBase,` line.
function writeConfigWithBase(root: string, basePath: string) {
  writeFileSync(
    join(root, '.vitepress/config.mts'),
    [
      `const siteBase = '${basePath}'`,
      '',
      'export default {',
      "  title: 'Web eXploitation Laboratory',",
      '  base: siteBase,',
      '  themeConfig: {',
      "    socialLinks: [{ icon: 'github', link: 'https://github.com/BrowserLaboratory/wxl-platform' }],",
      '  },',
      '}',
      '',
    ].join('\n'),
  )
}

const A_ARGS = ['--author', 'me', '--repo', 'me/myfork', '--base', '/myfork/']
const B_ARGS = ['--author', 'me', '--repo', 'me/myfork', '--rebrand', 'acme']

/** The two fork modes, in the shapes every describe below needs: `rebrand` is the argv tail that
 *  selects the mode for an arbitrary base argv, `args` is the full, ready-to-use argv (A_ARGS /
 *  B_ARGS). Declared once so no describe below keeps its own copy of this table. */
const MODES = [
  { label: 'anchor', rebrand: [] as string[], args: A_ARGS },
  { label: 'rebrand', rebrand: ['--rebrand', 'acme'], args: B_ARGS },
] as const

/** Run `parseForkInitArgs(argv)`, assert it throws a `ForkInitArgError`, and return it for
 *  further assertions — shared by every argument-rule test below so the throw/catch/instanceof
 *  boilerplate is written once, and so a case that unexpectedly does NOT throw fails the test
 *  loudly instead of silently falling through. */
function argError(argv: string[]): ForkInitArgError {
  let caught: unknown
  try {
    parseForkInitArgs(argv)
  } catch (e) {
    caught = e
  }
  expect(caught, `expected a throw for ${JSON.stringify(argv)}`).toBeInstanceOf(ForkInitArgError)
  return caught as ForkInitArgError
}

/** Escape a string for safe embedding inside a `RegExp` source — used to match a
 *  `JSON.stringify`-quoted value verbatim inside a larger error message. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe('UPSTREAM_SLUG', () => {
  it('is exported and equals the upstream repository slug exactly, case included', () => {
    // T44/AC-G1: this file is on the keep list, so a literal is allowed here.
    expect(UPSTREAM_SLUG).toBe('BrowserLaboratory/wxl-platform')
  })
})

describe('parseForkInitArgs', () => {
  it('requires --repo and rejects a malformed owner/repo value', () => {
    expect(() => parseForkInitArgs(['--author', 'me'])).toThrow(ForkInitArgError)
    expect(() => parseForkInitArgs(['--author', 'me', '--repo', 'not-a-slug'])).toThrow(ForkInitArgError)
  })

  it('names the missing flag in the error message (--author / --repo)', () => {
    expect(() => parseForkInitArgs(['--repo', 'me/myfork'])).toThrow(/--author/)
    expect(() => parseForkInitArgs(['--author', 'me'])).toThrow(/--repo/)
  })

  it('parses A-mode flags and defaults dryRun false, rebrand undefined', () => {
    const a = parseForkInitArgs(A_ARGS)
    expect(a.author).toBe('me')
    expect(a.repo).toBe('me/myfork')
    expect(a.base).toBe('/myfork/')
    expect(a.dryRun).toBe(false)
    expect(a.rebrand).toBeUndefined()
  })

  // Overridden (T60/AC-E4): title says the base becomes `/` (A9: `--base none` writes
  // `const siteBase = '/'`); body unchanged (toBeNull() still names parseForkInitArgs' own
  // null-means-removal argument shape, which --base none still maps to internally).
  it('--base none makes the base /, --rebrand selects B mode, --dry-run sets dryRun', () => {
    const a = parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', 'none', '--rebrand', 'acme', '--dry-run'])
    expect(a.base).toBeNull()
    expect(a.rebrand).toBe('acme')
    expect(a.dryRun).toBe(true)
  })

  it('rejects an unsafe --base value (quote or $) that could break out of the config string literal', () => {
    const bad = ["/x'); process.exit(1); ('/", '/a$b/', "/a'/", 'no-leading-slash/']
    for (const b of bad) {
      expect(() => parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', b])).toThrow(ForkInitArgError)
    }
    // a normal path and root and "none" stay accepted
    expect(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', '/ok/']).base).toBe('/ok/')
    expect(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', '/']).base).toBe('/')
  })

  it('rejects a --rebrand name whose uppercased form contains WXL (idempotency guard, case-insensitive)', () => {
    expect(() => parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--rebrand', 'fooWXLbar'])).toThrow(ForkInitArgError)
    expect(() => parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--rebrand', 'WXL2'])).toThrow(ForkInitArgError)
  })

  it('rejects a --rebrand value with injection-risk characters (quote/$/backtick/space/empty)', () => {
    const bad = ["x'+process.env.SECRET+'", 'a$b', 'a`b`', 'has space', '', 'semi;colon']
    for (const r of bad) {
      expect(() => parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--rebrand', r])).toThrow(ForkInitArgError)
    }
    // a plain identifier stays accepted
    expect(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--rebrand', 'acme-2.0_x']).rebrand).toBe('acme-2.0_x')
  })

  it('rejects a --rebrand that does not start with a letter (its uppercase seeds a JS/env identifier)', () => {
    // (a leading `-` is rejected earlier by node's parseArgs; these reach our own validation)
    for (const r of ['2cool', '.x', '_x', '3d-ctf']) {
      expect(() => parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--rebrand', r])).toThrow(ForkInitArgError)
    }
    // letter-first with interior dashes/dots is fine (interior is sanitized for the env var)
    expect(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--rebrand', 'my-ctf']).rebrand).toBe('my-ctf')
  })
})

// T32/AC-O1: a valid --origin (origin grammar, traceability.md "Origin grammar") is accepted; A8's
// hostname is written lowercased, the path (if any) unchanged.
describe('parseForkInitArgs — --origin, --site-name, --rebrand combinations', () => {
  it.each([
    ['at least two labels', 'https://a.bc', 'https://a.bc'],
    ['a label exactly 63 characters', `https://${'x'.repeat(63)}.example`, `https://${'x'.repeat(63)}.example`],
    [
      'a hostname exactly 253 characters',
      `https://${'x'.repeat(63)}.${'x'.repeat(63)}.${'x'.repeat(63)}.${'x'.repeat(61)}`,
      `https://${'x'.repeat(63)}.${'x'.repeat(63)}.${'x'.repeat(63)}.${'x'.repeat(61)}`,
    ],
    ['a non-final label all digits', 'https://1.example', 'https://1.example'],
    ['a label containing -', 'https://a-b.example', 'https://a-b.example'],
    ['an uppercase hostname', 'https://Example.COM', 'https://example.com'],
    [
      'a multi-segment path',
      'https://e.example/My_Path/a.b~c-d',
      'https://e.example/My_Path/a.b~c-d',
    ],
  ])('accepts a valid --origin (%s)', (_label, value, expected) => {
    const a = parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--origin', value])
    expect(a.origin).toBe(expected)
  })

  // T33/AC-O1: every form outside the origin grammar is an argument error naming --origin and
  // quoting the rejected value with JSON.stringify.
  it.each([
    ['empty', ''],
    ['http, not https', 'http://e.example'],
    ['uppercase scheme', 'HTTPS://e.example'],
    ['single slash', 'https:/e.example'],
    ['no scheme at all', 'e.example'],
    ['userinfo', 'https://u@e.example'],
    ['userinfo with password', 'https://u:p@e.example'],
    ['port', 'https://e.example:443'],
    ['query', 'https://e.example?q'],
    ['fragment', 'https://e.example#f'],
    ['trailing slash, no path', 'https://e.example/'],
    ['trailing slash, with path', 'https://e.example/a/'],
    ['label starts with -', 'https://-a.example'],
    ['label ends with -', 'https://a-.example'],
    ['label exactly 64 characters', `https://${'x'.repeat(64)}.example`],
    ['underscore in a label', 'https://a_b.example'],
    ['empty label', 'https://a..example'],
    ['trailing dot', 'https://e.example.'],
    ['single label', 'https://localhost'],
    ['all-digit last label (IP-shaped)', 'https://1.2.3.4'],
    ['all-digit last label', 'https://e.123'],
    [
      'hostname exactly 254 characters',
      `https://${'x'.repeat(63)}.${'x'.repeat(63)}.${'x'.repeat(63)}.${'x'.repeat(62)}`,
    ],
    ['path segment .', 'https://e.example/.'],
    ['path segment ..', 'https://e.example/..'],
    ['path contains %20', 'https://e.example/a%20b'],
    ['path contains a space', 'https://e.example/a b'],
    ['path contains @', 'https://e.example/a@b'],
    ['IDN label', 'https://bücher.example'],
  ])('rejects an invalid --origin (%s), naming --origin and JSON.stringify(value)', (_label, value) => {
    const err = argError(['--author', 'me', '--repo', 'me/myfork', '--origin', value])
    expect(err.message).toContain('--origin')
    expect(err.message).toContain(JSON.stringify(value))
  })

  // T34/AC-O1: --origin with a path together with --host cloudflare-pages is an argument error
  // naming --origin and `path`; the same origin without a path, and --host github-pages with a
  // path, are both accepted.
  it.each([
    ['one path segment', 'https://e.example/a'],
    ['two path segments', 'https://e.example/a/b'],
  ])('rejects --host cloudflare-pages with a path in --origin (%s), naming --origin and path', (_label, value) => {
    const err = argError(['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--origin', value])
    expect(err.message).toContain('--origin')
    expect(err.message).toContain('path')
    // item 5: T33's own message also contains the substring "path" (from "[/path]" in its usage
    // text), so the two assertions above alone would still pass if this were actually T33's
    // message, not T34's -- a T34-specific fragment (absent from every T33 message) tells them
    // apart.
    expect(err.message).toContain('cloudflare-pages')
  })

  // item 5: confirms "cloudflare-pages" is actually T34-specific -- no T33 rejection message
  // contains it, so the assertion above could not accidentally be satisfied by T33's message.
  it('T33 messages never contain "cloudflare-pages" (so the T34 check above actually discriminates)', () => {
    for (const value of ['', 'http://e.example', 'https://e.example/']) {
      const err = argError(['--author', 'me', '--repo', 'me/myfork', '--origin', value])
      expect(err.message).not.toContain('cloudflare-pages')
    }
  })

  it('accepts --host cloudflare-pages with the same origin without a path', () => {
    const a = parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--origin', 'https://e.example'])
    expect(a.origin).toBe('https://e.example')
  })

  it('accepts --host github-pages with a path in --origin', () => {
    const a = parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages', '--origin', 'https://e.example/a/b'])
    expect(a.origin).toBe('https://e.example/a/b')
  })

  // T35/AC-O2: --host cloudflare-pages without --origin is an argument error naming --origin and
  // cloudflare-pages; --host github-pages without --origin is accepted.
  it('rejects --host cloudflare-pages without --origin, naming --origin and cloudflare-pages', () => {
    const err = argError(['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages'])
    expect(err.message).toContain('--origin')
    expect(err.message).toContain('cloudflare-pages')
  })

  it('accepts --host github-pages without --origin', () => {
    const a = parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages'])
    expect(a.origin).toBeUndefined()
  })

  // T39/T43/AC-N1: a valid --site-name is accepted; siteName is the value after trim(). Length is
  // counted in Unicode code points (not UTF-16 code units).
  it.each([
    ['1 code point', 'x', 'x'],
    ['exactly 60 code points, all astral emoji (120 UTF-16 code units)', '\u{1F600}'.repeat(60), '\u{1F600}'.repeat(60)],
    ['leading/trailing ASCII space, U+3000, \\n and U+FEFF, all trimmed', ' \u3000\n\uFEFF Lab \uFEFF\n\u3000 ', 'Lab'],
    ['a ZWJ emoji sequence', '\u{1F469}\u200D\u{1F4BB}', '\u{1F469}\u200D\u{1F4BB}'],
    ['interior U+200C/U+200D alongside other characters', 'a\u200Cb\u200Dc', 'a\u200Cb\u200Dc'],
    ['U+FE0F (Mn, variation selector, not rejected)', 'a\uFE0F', 'a\uFE0F'],
    ['U+1F3FB (skin tone modifier, Sk)', 'a\u{1F3FB}', 'a\u{1F3FB}'],
    ['U+FDF0 (Lo, bordering the noncharacter block)', 'a\uFDF0', 'a\uFDF0'],
  ])('accepts a valid --site-name (%s)', (_label, value, expected) => {
    const a = parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--site-name', value])
    expect(a.siteName).toBe(expected)
  })

  // T40/AC-N1: a --site-name outside the character rule is an argument error naming --site-name.
  // Only characters whose Unicode category is the same in Node 22 and 24 are used.
  it.each([
    ['empty', ''],
    ['only ASCII spaces', '   '],
    ['only ZWNJ/ZWJ', '\u200C\u200D'],
    ['61 code points', 'x'.repeat(61)],
    ['Cc (bell)', '\u0007'],
    ['Cc interior (\\n)', 'a\nb'],
    ['Cs lone surrogate', '\uD800'],
    ['Zl', '\u2028'],
    ['Zp', '\u2029'],
    ['Cf (soft hyphen)', '\u00AD'],
    ['Cf (zero width space)', '\u200B'],
    ['Cf (left-to-right mark)', '\u200E'],
    ['Cf (word joiner)', '\u2060'],
    ['Cf interior BOM', 'a\uFEFFb'],
    ['Cf subdivision-flag tag character', '\u{E0067}'],
    ['noncharacter U+FDD0', '\uFDD0'],
    ['noncharacter U+FDEF', '\uFDEF'],
    ['noncharacter U+FFFE', '\uFFFE'],
    ['noncharacter U+1FFFF', '\u{1FFFF}'],
    ['noncharacter U+10FFFF', '\u{10FFFF}'],
  ])('rejects an invalid --site-name (%s), naming --site-name', (_label, value) => {
    const err = argError(['--author', 'me', '--repo', 'me/myfork', '--site-name', value])
    expect(err.message).toContain('--site-name')
  })

  // T41/AC-N2: <, > and & are each an argument error naming --site-name and the refused
  // character, at the start, middle or end of the value.
  it.each([
    ['< at the start', '<Lab'],
    ['< in the middle', 'My<Lab'],
    ['< at the end', 'Lab<'],
    ['> at the start', '>Lab'],
    ['> in the middle', 'My>Lab'],
    ['> at the end', 'Lab>'],
    ['& at the start', '&Lab'],
    ['& in the middle', 'My&Lab'],
    ['& at the end', 'Lab&'],
  ])('rejects --site-name containing %s, naming --site-name and the character', (_label, value) => {
    const err = argError(['--author', 'me', '--repo', 'me/myfork', '--site-name', value])
    expect(err.message).toContain('--site-name')
    const ch = value.replace(/[^<>&]/g, '')
    expect(err.message).toContain(JSON.stringify(ch))
  })

  // T50/AC-B1: --rebrand together with any non-empty subset of {--host, --origin, --site-name} is
  // an argument error naming --rebrand and every one of those flags given.
  const REBRAND_BASE = ['--author', 'me', '--repo', 'me/myfork', '--rebrand', 'acme']
  const FLAG_ARGS: Record<string, string[]> = {
    '--host': ['--host', 'github-pages'],
    '--origin': ['--origin', 'https://e.example'],
    '--site-name': ['--site-name', 'Lab'],
  }
  const ALL_FLAGS = ['--host', '--origin', '--site-name']

  // every non-empty subset of the 3 flags: 7 combinations
  const subsets: string[][] = []
  for (let mask = 1; mask < 8; mask++) {
    subsets.push(ALL_FLAGS.filter((_, i) => mask & (1 << i)))
  }

  it.each(subsets.map((s) => [s]))('rejects --rebrand with %j, naming --rebrand and each given flag', (flags: string[]) => {
    const argv = [...REBRAND_BASE, ...flags.flatMap((f) => FLAG_ARGS[f])]
    const err = argError(argv)
    expect(err.message).toContain('--rebrand')
    for (const f of flags) expect(err.message).toContain(f)
  })

  it('reports T50 (not T35) for --rebrand acme --host cloudflare-pages without --origin', () => {
    const err = argError([...REBRAND_BASE, '--host', 'cloudflare-pages'])
    expect(err.message).toContain('--rebrand')
    expect(err.message).toContain('--host')
  })

  it('reports T50 (not the --rebrand value check) for an invalid --rebrand value given with --host', () => {
    const err = argError(['--author', 'me', '--repo', 'me/myfork', '--rebrand', '2x', '--host', 'github-pages'])
    expect(err.message).toContain('--rebrand')
    expect(err.message).toContain('--host')
  })

  it('does not reject --rebrand together with --base, --name, --description or --dry-run', () => {
    expect(() => parseForkInitArgs([...REBRAND_BASE, '--base', '/x/'])).not.toThrow()
    expect(() => parseForkInitArgs([...REBRAND_BASE, '--name', 'pkg'])).not.toThrow()
    expect(() => parseForkInitArgs([...REBRAND_BASE, '--description', 'd'])).not.toThrow()
    expect(() => parseForkInitArgs([...REBRAND_BASE, '--dry-run'])).not.toThrow()
  })
})

// T70/AC-C1: matchesOriginGrammar (traceability.md, "Origin grammar") is the same function S6's
// component tests reuse to assert SITE_ORIGIN's shape (Note 8, T-0011). --origin's own argument
// tests above already cover the grammar's positive/negative shape through parseForkInitArgs; this
// describe instead targets matchesOriginGrammar directly, including forms --origin's path-argument
// checks never exercise (no --host, no path-vs-cloudflare interaction).
describe('matchesOriginGrammar', () => {
  it.each([
    ['http, not https', 'http://e.example'],
    ['single label', 'https://localhost'],
    ['port', 'https://e.example:443'],
    ['query', 'https://e.example?q'],
    ['fragment', 'https://e.example#f'],
    ['trailing slash', 'https://e.example/'],
    ['userinfo', 'https://u@e.example'],
  ])('rejects %s', (_label, value) => {
    expect(matchesOriginGrammar(value)).toBe(false)
  })

  it.each([
    ['a path', 'https://e.example/a/b'],
    ['an uppercase hostname (grammar accepts it; lowercasing is validateOriginValue’s own return shape)', 'https://Example.COM'],
  ])('accepts %s', (_label, value) => {
    expect(matchesOriginGrammar(value)).toBe(true)
  })
})

// T49/AC-P3: the full argument check order (traceability.md "Argument check order"). For each
// pair of checks, an argv that fails both is compared — after every JSON.stringify-quoted span in
// the message is replaced with the same placeholder — against the message an argv triggering only
// the EARLIER check produces; equal (modulo the quoted value) means the earlier check decided it.
describe('parseForkInitArgs — T49 full argument check order', () => {
  /** Replace every JSON.stringify-quoted span (a double-quoted string with standard JSON escapes)
   *  with the same placeholder, so two messages that differ only in the quoted value compare equal. */
  function placeholder(message: string): string {
    return message.replace(/"(?:[^"\\]|\\.)*"/g, '<<Q>>')
  }

  const CASES: Array<{ label: string; both: string[]; earlyOnly: string[] }> = [
    {
      label: 'T48 (unknown flag) before T47 (missing --author)',
      both: ['--bogus'],
      earlyOnly: ['--bogus', '--author', 'me', '--repo', 'me/myfork'],
    },
    {
      label: 'T47 (missing --author) before T50 (rebrand combo)',
      both: ['--repo', 'me/myfork', '--rebrand', 'acme', '--host', 'github-pages'],
      earlyOnly: ['--repo', 'me/myfork'],
    },
    {
      label: 'T50 (rebrand combo) before T17 (host+base)',
      both: ['--author', 'me', '--repo', 'me/myfork', '--rebrand', 'acme', '--host', 'github-pages', '--base', '/x/'],
      earlyOnly: ['--author', 'me', '--repo', 'me/myfork', '--rebrand', 'acme', '--host', 'github-pages'],
    },
    {
      label: 'T17 (host+base) before T16 (host value)',
      both: ['--author', 'me', '--repo', 'me/myfork', '--host', 'bogus', '--base', '/x/'],
      earlyOnly: ['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages', '--base', '/x/'],
    },
    {
      label: 'T17 (host+base) before T35 (cloudflare without origin)',
      both: ['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--base', '/x/'],
      earlyOnly: [
        '--author',
        'me',
        '--repo',
        'me/myfork',
        '--host',
        'cloudflare-pages',
        '--origin',
        'https://e.example',
        '--base',
        '/x/',
      ],
    },
    {
      label: 'T16 (host value) before --repo value (T45)',
      both: ['--author', 'me', '--repo', 'bad', '--host', 'bogus'],
      earlyOnly: ['--author', 'me', '--repo', 'me/myfork', '--host', 'bogus'],
    },
    {
      label: 'T35 (cloudflare without origin) before --repo value (T45)',
      both: ['--author', 'me', '--repo', 'bad', '--host', 'cloudflare-pages'],
      earlyOnly: ['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages'],
    },
    {
      label: '--repo value (T45) before --author value (T46)',
      both: ['--author', '\u0007', '--repo', 'bad'],
      earlyOnly: ['--author', 'me', '--repo', 'bad'],
    },
    {
      label: '--author value (T46) before --rebrand value',
      both: ['--author', '\u0007', '--repo', 'me/myfork', '--rebrand', '2x'],
      earlyOnly: ['--author', '\u0007', '--repo', 'me/myfork'],
    },
    {
      label: '--rebrand value before --base value (T21)',
      both: ['--author', 'me', '--repo', 'me/myfork', '--rebrand', '2x', '--base', "/a'/"],
      earlyOnly: ['--author', 'me', '--repo', 'me/myfork', '--rebrand', '2x'],
    },
    {
      label: '--base value (T21) before --origin value (T33)',
      both: ['--author', 'me', '--repo', 'me/myfork', '--base', "/a'/", '--origin', 'not-a-url'],
      earlyOnly: ['--author', 'me', '--repo', 'me/myfork', '--base', "/a'/"],
    },
    {
      label: 'T33 (origin grammar) before T34 (origin path + cloudflare)',
      both: ['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--origin', 'https://e.example/a/'],
      earlyOnly: ['--author', 'me', '--repo', 'me/myfork', '--origin', 'https://e.example/a/'],
    },
    {
      label: '--origin value (T33) before --site-name value (T40)',
      both: ['--author', 'me', '--repo', 'me/myfork', '--origin', 'not-a-url', '--site-name', ''],
      earlyOnly: ['--author', 'me', '--repo', 'me/myfork', '--origin', 'not-a-url'],
    },
    {
      label: 'T40 (site-name length) before T41 (refused character)',
      both: ['--author', 'me', '--repo', 'me/myfork', '--site-name', `${'x'.repeat(60)}<`],
      earlyOnly: ['--author', 'me', '--repo', 'me/myfork', '--site-name', 'x'.repeat(61)],
    },
  ]

  it.each(CASES)('$label', ({ both, earlyOnly }) => {
    const bothMessage = placeholder(argError(both).message)
    const earlyMessage = placeholder(argError(earlyOnly).message)
    expect(bothMessage).toBe(earlyMessage)
  })

  it('reports T48 when every check would otherwise fail', () => {
    const err = argError([
      '--bogus',
      '--repo',
      'bad',
      '--host',
      'bogus',
      '--rebrand',
      '2x',
      '--base',
      "/a'/",
      '--origin',
      'not-a-url',
      '--site-name',
      '',
    ])
    expect(err.message).toMatch(/unknown flag/)
  })
})

// T48 (new flags, suggested addition per the ticket's Notes): --origin, --site-name and --host
// given twice, or without a value, are each a ForkInitArgError naming the flag.
describe('parseForkInitArgs — T48 new flags given twice or without a value', () => {
  // item 6: each value is legal on its own (an illegal one, like the earlier "x", would make the
  // test pass even with the repeated-flag check itself removed -- the resulting "invalid value"
  // error also names the flag, so the test would never catch that mutation); the message is also
  // asserted to contain `more than once`, the fragment unique to the repeated-flag check itself.
  it.each(['--origin', '--site-name', '--host'])('rejects %s given twice, naming it', (flag) => {
    const value = flag === '--host' ? 'github-pages' : flag === '--origin' ? 'https://e.example' : 'New Name'
    const err = argError(['--author', 'me', '--repo', 'me/myfork', flag, value, flag, value])
    expect(err.message).toContain(flag)
    expect(err.message).toContain('more than once')
  })

  it.each(['--origin', '--site-name'])('rejects %s with no value, naming it', (flag) => {
    const err = argError(['--author', 'me', '--repo', 'me/myfork', flag])
    expect(err.message).toContain(flag)
  })
})

describe('parseForkInitArgs — --host and --base', () => {
  // T16/AC-H1: the two legal values parse into args.host; not given leaves it undefined.
  it('parses --host into args.host; undefined when not given', () => {
    expect(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages']).host).toBe(
      'github-pages',
    )
    // T35: --host cloudflare-pages needs --origin.
    expect(
      parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--origin', 'https://e.example'])
        .host,
    ).toBe('cloudflare-pages')
    expect(parseForkInitArgs(A_ARGS).host).toBeUndefined()
  })

  // T16/AC-H1: anything other than the two legal values is an argument error naming --host and
  // quoting the rejected value with JSON.stringify.
  it.each(['github', 'GitHub-Pages', '', 'cloudflare', 'github-pages '])(
    'rejects an unknown --host value (%j), naming --host and the value',
    (value) => {
      const err = argError(['--author', 'me', '--repo', 'me/myfork', '--host', value])
      expect(err.message).toContain('--host')
      expect(err.message).toContain(JSON.stringify(value))
    },
  )

  // T16/T48/AC-H1/AC-P3: --host goes through the same parser-error machinery as every other flag —
  // no value, and given twice.
  it('rejects --host with no value, and --host given twice, naming --host', () => {
    expect(argError(['--author', 'me', '--repo', 'me/myfork', '--host']).message).toContain('--host')
    expect(
      argError(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages', '--host', 'cloudflare-pages'])
        .message,
    ).toContain('--host')
  })

  // T17/AC-H1: --host together with --base is an argument error naming --base; T17 is checked
  // before T16 (the --host value check) and before T21 (the --base value check), so an invalid
  // value on either side still surfaces the T17 message.
  it('rejects --host together with --base, naming --base; T17 precedes T16 and T21', () => {
    for (const host of ['github-pages', 'cloudflare-pages']) {
      expect(argError(['--author', 'me', '--repo', 'me/myfork', '--host', host, '--base', '/x/']).message).toContain(
        '--base',
      )
      expect(argError(['--author', 'me', '--repo', 'me/myfork', '--host', host, '--base', 'none']).message).toContain(
        '--base',
      )
    }
    expect(argError(['--author', 'me', '--repo', 'me/myfork', '--host', 'bogus', '--base', '/x/']).message).toContain(
      '--base',
    )
    expect(
      argError(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages', '--base', '/../']).message,
    ).toContain('--base')
  })

  // T16/T49 (order fragment; the full order is T-0015's): T16 (the --host value check) is checked
  // before T45 (the --repo value check), so an invalid --repo alongside a bogus --host still
  // surfaces the T16 message.
  it('checks --host before --repo (T16 before T45)', () => {
    expect(argError(['--author', 'me', '--repo', 'bad', '--host', 'bogus']).message).toContain('--host')
  })

  // T21/AC-H5: every value matching the base grammar, and "none", is accepted in both modes.
  it.each(MODES)('accepts every --base value matching the base grammar, and "none" ($label)', ({ rebrand }) => {
    const good = ['/', '/x/', '/a/b/', '/.../', '/.x/', '/a.b~c-d_e/', 'none']
    for (const value of good) {
      const a = parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', ...rebrand, '--base', value])
      expect(a.base, value).toBe(value === 'none' ? null : value)
    }
  })

  // T21/AC-H5: `.` and `..` segments are newly refused, along with every other non-conforming
  // value; the message names --base and quotes the value with JSON.stringify.
  it.each(MODES)('rejects --base values with . or .. segments, or otherwise outside the grammar ($label)', ({ rebrand }) => {
    const bad = ['/./', '/../', '/a/../', '/a/./b/', '/x', 'x/', '//', '/a b/']
    for (const value of bad) {
      const err = argError(['--author', 'me', '--repo', 'me/myfork', ...rebrand, '--base', value])
      expect(err.message).toContain('--base')
      expect(err.message).toContain(JSON.stringify(value))
    }
  })
})

describe('parseForkInitArgs — argument rules', () => {
  it.each(MODES)(
    "wraps any error Node's argument parser raises into a ForkInitArgError naming the flag ($label)",
    ({ rebrand }) => {
      const cases: Array<{ argv: string[]; flag: string }> = [
        { argv: ['--bogus', ...rebrand], flag: '--bogus' },
        { argv: ['-x', ...rebrand], flag: '-x' },
        { argv: ['--no-dry-run', ...rebrand], flag: '--no-dry-run' },
        { argv: ['--repo', 'me/myfork', ...rebrand, '--author'], flag: '--author' },
        { argv: ['--repo', '--author', 'me', ...rebrand], flag: '--repo' },
        { argv: ['--dry-run=yes', ...rebrand], flag: '--dry-run' },
      ]
      for (const { argv, flag } of cases) {
        const err = argError(argv)
        expect(err.exitCode).toBe(1)
        expect(err.message).toContain(flag)
      }
    },
  )

  it("builds its own exact message for each Node parser error kind, not Node's raw text", () => {
    expect(() => parseForkInitArgs(['--bogus'])).toThrowError('unknown flag: "--bogus"')
    expect(() => parseForkInitArgs(['--repo', 'me/myfork', '--author'])).toThrowError('--author needs a value')
    expect(() => parseForkInitArgs(['--repo', '--author', 'me'])).toThrowError('--repo needs a value')
    expect(() => parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--dry-run=yes'])).toThrowError(
      '--dry-run takes no value, got: "yes"',
    )
    // Node's own "place it at the end after '--'" hint must not leak into our message.
    expect(argError(['--bogus']).message).not.toMatch(/place it at the end/)
  })

  it('rethrows a non-ERR_PARSE_ARGS_ error from Node unwrapped, not as a ForkInitArgError', () => {
    // A non-array argv makes Node's own parseArgs throw a plain TypeError coded
    // ERR_INVALID_ARG_TYPE — a real defect in the caller, not a user-input error, so it must
    // propagate as-is instead of being mislabelled with exitCode 1.
    let caught: unknown
    try {
      parseForkInitArgs(123 as unknown as string[])
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(TypeError)
    expect(caught).not.toBeInstanceOf(ForkInitArgError)
    expect((caught as NodeJS.ErrnoException).code).toBe('ERR_INVALID_ARG_TYPE')
  })

  it('echoes an unknown flag containing a control character JSON-escaped, not raw (ESC)', () => {
    const rawName = '--bogus\u001b'
    const err = argError([rawName])
    expect(err.message).toBe(`unknown flag: ${JSON.stringify(rawName)}`)
    expect(err.message).toContain('\\u001b')
  })

  it.each(MODES)('rejects a positional argument, naming it and quoting it with JSON.stringify ($label)', ({ rebrand }) => {
    const positionalCases: Array<{ argvTail: string[]; positional: string }> = [
      { argvTail: ['extra'], positional: 'extra' },
      { argvTail: ['a"b'], positional: 'a"b' },
      { argvTail: ['--', 'x'], positional: 'x' }, // positional because it follows `--`
    ]
    for (const { argvTail, positional } of positionalCases) {
      const err = argError(['--author', 'me', '--repo', 'me/myfork', ...rebrand, ...argvTail])
      expect(err.message).toContain('positional')
      expect(err.message).toContain(JSON.stringify(positional))
    }
  })

  it.each(MODES)('rejects a flag given twice, naming it ($label)', ({ rebrand }) => {
    const cases: Array<{ argv: string[]; flag: string }> = [
      { argv: ['--author', 'a', '--repo', 'me/myfork', ...rebrand, '--author', 'b'], flag: '--author' },
      { argv: ['--author', 'me', '--repo=o/n', '--repo', 'o/n', ...rebrand], flag: '--repo' },
      { argv: ['--author', 'me', '--repo', 'me/myfork', ...rebrand, '--dry-run', '--dry-run'], flag: '--dry-run' },
      { argv: ['--author', 'me', '--repo', 'me/myfork', ...rebrand, '--base', '/a/', '--base', '/b/'], flag: '--base' },
      { argv: ['--author', 'me', '--repo', 'me/myfork', '--rebrand', 'acme', '--rebrand', 'beta'], flag: '--rebrand' },
      { argv: ['--author', 'me', '--repo', 'me/myfork', ...rebrand, '--name', 'a', '--name', 'b'], flag: '--name' },
      {
        argv: ['--author', 'me', '--repo', 'me/myfork', ...rebrand, '--description', 'a', '--description', 'b'],
        flag: '--description',
      },
    ]
    for (const { argv, flag } of cases) {
      expect(argError(argv).message).toContain(flag)
    }
  })

  it.each(MODES)('rejects a missing or blank --author/--repo, naming the flag ($label)', ({ rebrand }) => {
    // U+2028/U+2029 (lone, as the entire value): String.prototype.trim() strips a LineTerminator,
    // so these land on the empty-after-trim path (T47), not the character-rule rejection path —
    // see the ticket's red -> green log (row 8) for how the embedded `a\u2028b` case differs.
    const blanks = [undefined, '', '   ', '\u3000', '\u2028', '\u2029']
    for (const blank of blanks) {
      const authorArgv = ['--repo', 'me/myfork', ...rebrand, ...(blank === undefined ? [] : ['--author', blank])]
      const authorErr = argError(authorArgv)
      expect(authorErr.exitCode).toBe(1)
      expect(authorErr.message).toContain('--author')

      const repoArgv = ['--author', 'me', ...rebrand, ...(blank === undefined ? [] : ['--repo', blank])]
      const repoErr = argError(repoArgv)
      expect(repoErr.exitCode).toBe(1)
      expect(repoErr.message).toContain('--repo')
    }
  })

  it('distinguishes a truly missing flag from one given empty after trim, in the message', () => {
    expect(argError(['--repo', 'me/myfork']).message).toBe('missing required flag: --author <name>')
    expect(argError(['--repo', 'me/myfork', '--author', '  ']).message).toBe(
      `--author must not be empty, got: ${JSON.stringify('  ')}`,
    )
    // A lone U+2028/U+2029 as the entire --author value: String.prototype.trim() strips a
    // LineTerminator, so these two values are reported through this same blank-after-trim
    // branch, carrying the flag and the JSON-quoted (now-empty-looking) value — not through the
    // character-rejection branch that handles every other disallowed code point.
    expect(argError(['--repo', 'me/myfork', '--author', '\u2028']).message).toBe(
      `--author must not be empty, got: ${JSON.stringify('\u2028')}`,
    )
    expect(argError(['--repo', 'me/myfork', '--author', '\u2029']).message).toBe(
      `--author must not be empty, got: ${JSON.stringify('\u2029')}`,
    )
    expect(argError(['--author', 'me']).message).toBe('missing required flag: --repo <owner/repo>')
    expect(argError(['--author', 'me', '--repo', '\u3000']).message).toBe(
      `--repo must not be empty, got: ${JSON.stringify('\u3000')}`,
    )
  })

  it.each(MODES)('accepts a valid --repo verbatim, without trimming ($label)', ({ rebrand }) => {
    const owners = ['a', 'a'.repeat(39), 'a-b', 'a--b']
    const names = ['x', 'x'.repeat(100), '.x', '...', 'a_b', 'git', 'x.gitx']
    for (const owner of owners) {
      for (const name of names) {
        const repo = `${owner}/${name}`
        const a = parseForkInitArgs(['--author', 'me', '--repo', repo, ...rebrand])
        expect(a.repo).toBe(repo)
      }
    }
  })

  it.each(MODES)('rejects an invalid --repo, message containing --repo and JSON.stringify(value) ($label)', ({ rebrand }) => {
    const badOwners = ['a'.repeat(40), '-a', 'a-', 'a_b', 'a.b', '']
    const badNames = ['x'.repeat(101), '.', '..', 'x.git', 'x.GIT', '.git', 'a b', 'ü']
    const badWhole = ['no-slash', 'a/b/c', '/b', 'a/', ' a/b']
    const bad = [...badOwners.map((o) => `${o}/x`), ...badNames.map((n) => `a/${n}`), ...badWhole]
    for (const value of bad) {
      // `=` form (a deviation from a plain `--repo`, `<value>` pair): some values start with `-`,
      // which Node's own parser would otherwise treat as the start of another flag.
      const err = argError(['--author', 'me', `--repo=${value}`, ...rebrand])
      expect(err.message).toContain('--repo')
      expect(err.message).toContain(JSON.stringify(value))
    }
  })

  it.each(MODES)('accepts a valid --author, trimmed ($label)', ({ rebrand }) => {
    const values = [
      'a',
      'a'.repeat(100),
      '\u{1F600}'.repeat(100),
      '林老師',
      'a\u200Db',
      'a\u200Cb',
      '\u{1F600}\uFDCF',
      '\uFDF0',
      '\uFFFD',
      '\uFDCF',
      '  Test Teacher  ',
      '\u3000林\u3000',
      '\uFEFFTeacher',
    ]
    const expected = [
      'a',
      'a'.repeat(100),
      '\u{1F600}'.repeat(100),
      '林老師',
      'a\u200Db',
      'a\u200Cb',
      '\u{1F600}\uFDCF',
      '\uFDF0',
      '\uFFFD',
      '\uFDCF',
      'Test Teacher',
      '林',
      'Teacher',
    ]
    values.forEach((value, i) => {
      const a = parseForkInitArgs(['--author', value, '--repo', 'me/myfork', ...rebrand])
      expect(a.author).toBe(expected[i])
    })
  })

  it.each(MODES)('rejects an invalid --author, message containing --author and the JSON-quoted value ($label)', ({ rebrand }) => {
    const bad = [
      'a'.repeat(101),
      '\u200C',
      '\u200D\u200C',
      '\u0007',
      '\u007F',
      '\u0085',
      '\uD800',
      'a\u2028b', // interior: unlike a bare U+2028 (trimmed away entirely, see the exact-message test above), this embedded value survives trim() and still reaches character-level rejection
      'a\u2029b', // interior, same reason for U+2029
      '\u200B',
      '\u00AD',
      '\u202E',
      `a\uFEFFb`,
      '\uFDD0',
      '\uFDEF',
      '\uFFFE',
      '\uFFFF',
      '\u{1FFFE}',
      '\u{10FFFF}',
    ]
    for (const value of bad) {
      const err = argError(['--author', value, '--repo', 'me/myfork', ...rebrand])
      expect(err.message).toContain('--author')
      expect(err.message).toContain(JSON.stringify(value))
    }
  })

  it('decides which message is thrown when several flags are wrong, by the argument check order', () => {
    const cases: Array<{ argv: string[]; expect: RegExp }> = [
      { argv: ['--repo', 'me/myfork', 'extra'], expect: /positional/ },
      { argv: ['--repo=o/n', '--repo', 'o/n'], expect: /--repo/ },
      { argv: [], expect: /--author/ },
      { argv: ['--author', '', '--repo', 'bad'], expect: /--author/ },
      { argv: ['--repo', 'bad', '--author', 'a'.repeat(101)], expect: /--repo/ },
      { argv: ['--author', '\u0007', '--repo', 'me/myfork', '--rebrand', '2x'], expect: /--author/ },
      { argv: ['--author', 'me', '--repo', 'me/myfork', '--rebrand', '2x', '--base', "/a'/"], expect: /--rebrand/ },
    ]
    for (const { argv, expect: re } of cases) {
      expect(argError(argv).message).toMatch(re)
    }
  })

  it('quotes every rejected value with JSON.stringify, including --base and --repo', () => {
    expect(() => parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', "/a'/"])).toThrow(
      new RegExp(escapeRe(JSON.stringify("/a'/"))),
    )
    expect(() => parseForkInitArgs(['--author', 'me', '--repo', 'a b'])).toThrow(new RegExp(escapeRe(JSON.stringify('a b'))))
  })

  it('rejects a --rebrand name whose uppercased form contains WXL, quoting the value with JSON.stringify', () => {
    const err1 = argError(['--author', 'me', '--repo', 'me/myfork', '--rebrand', 'fooWXLbar'])
    expect(err1.message).toContain(`got: ${JSON.stringify('fooWXLbar')}`)
    const err2 = argError(['--author', 'me', '--repo', 'me/myfork', '--rebrand', 'WXL2'])
    expect(err2.message).toContain(`got: ${JSON.stringify('WXL2')}`)
  })
})

describe('runForkInit — arguments reach the manifest', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-authorwrite-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('writes the trimmed --author to the manifest (anchor mode)', () => {
    runForkInit(parseForkInitArgs(['--author', '  Test Teacher  ', '--repo', 'me/myfork', '--base', '/myfork/']), {
      projectRoot: root,
    })
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.author).toBe('Test Teacher')
  })

  it('writes the trimmed --author to the manifest (rebrand mode)', () => {
    runForkInit(parseForkInitArgs(['--author', '  Test Teacher  ', '--repo', 'me/myfork', '--rebrand', 'acme']), {
      projectRoot: root,
    })
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.author).toBe('Test Teacher')
  })
})

describe('runForkInit — manifest (T12–T13)', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-manifest-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  const manifestStates: Array<{ label: string; apply: (r: string) => void; exactMessage?: string }> = [
    { label: 'missing', apply: (r) => rmSync(join(r, 'package.json')) },
    {
      label: 'BOM-prefixed',
      apply: (r) => writeManifest(r, '\uFEFF' + readFileSync(join(r, 'package.json'), 'utf8')),
      exactMessage: 'A1: package.json starts with a byte-order mark',
    },
    { label: 'unparsable ({)', apply: (r) => writeManifest(r, '{'), exactMessage: 'A1: package.json does not parse as JSON' },
    {
      label: 'unparsable (empty)',
      apply: (r) => writeManifest(r, ''),
      exactMessage: 'A1: package.json does not parse as JSON',
    },
    { label: 'not an object ([])', apply: (r) => writeManifest(r, '[]') },
    { label: 'not an object (null)', apply: (r) => writeManifest(r, 'null') },
    { label: 'not an object ("x")', apply: (r) => writeManifest(r, '"x"') },
    { label: 'not an object (42)', apply: (r) => writeManifest(r, '42') },
    { label: 'not an object (true)', apply: (r) => writeManifest(r, 'true') },
  ]

  for (const mode of MODES) {
    for (const state of manifestStates) {
      it(`manifest ${state.label} (${mode.label}) -> exitCode 1 naming A1/package.json, nothing written`, () => {
        state.apply(root)
        pinMtimes(root)
        const before = snapshotTree(root)
        const res = runForkInit(parseForkInitArgs(mode.args), { projectRoot: root })
        expect(res.exitCode).toBe(1)
        expect(res.message).toContain('A1')
        expect(res.message).toContain('package.json')
        // A BOM gets its own message, distinct from a generic parse failure, so the cause is named precisely.
        if (state.exactMessage) expect(res.message).toBe(state.exactMessage)
        const after = snapshotTree(root)
        expect(after).toEqual(before)
        expect(existsSync(join(root, '.github/workflows/deploy.yml'))).toBe(false)
      })
    }
  }
})

describe('runForkInit — manifest repository/bugs become objects (T13)', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-t13-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  const nonObjectValues: Array<[string, unknown]> = [
    ['string', 'https://example.com'],
    ['absent', undefined],
    ['null', null],
    ['array', ['a', 'b']],
    ['number', 1],
    ['boolean', true],
  ]

  for (const mode of MODES) {
    for (const [label, value] of nonObjectValues) {
      it(`repository/bugs ${label} -> object form, no stray indexed keys (${mode.label})`, () => {
        const raw = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
        if (value === undefined) {
          delete raw.repository
          delete raw.bugs
        } else {
          raw.repository = value
          raw.bugs = value
        }
        writeManifest(root, JSON.stringify(raw, null, 2) + '\n')
        runForkInit(parseForkInitArgs(mode.args), { projectRoot: root })
        const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
        expect(pkg.repository).toEqual({ type: 'git', url: 'git+https://github.com/me/myfork.git' })
        expect(pkg.bugs).toEqual({ url: 'https://github.com/me/myfork/issues' })
      })
    }

    it(`repository/bugs plain object -> keeps its other keys (${mode.label})`, () => {
      const raw = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
      raw.repository = { type: 'svn', url: 'svn://old.example/repo', directory: 'packages/site' }
      raw.bugs = { url: 'https://old.example/bugs', email: 'a@b.example' }
      writeManifest(root, JSON.stringify(raw, null, 2) + '\n')
      runForkInit(parseForkInitArgs(mode.args), { projectRoot: root })
      const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
      expect(pkg.repository).toEqual({
        type: 'git',
        url: 'git+https://github.com/me/myfork.git',
        directory: 'packages/site',
      })
      expect(pkg.bugs).toEqual({ url: 'https://github.com/me/myfork/issues', email: 'a@b.example' })
    })
  }
})

describe('runForkInit — result paths use /', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-slash-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  function assertNoBackslash(paths: string[]) {
    for (const p of paths) expect(p).not.toContain('\\')
  }

  it('anchor mode: changedFiles use / (deploy.yml, config.mts)', () => {
    const res = runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    expect(res.changedFiles).toContain('.github/workflows/deploy.yml')
    expect(res.changedFiles).toContain('.vitepress/config.mts')
    assertNoBackslash(res.changedFiles)
  })

  it('rebrand mode: sensitiveKeys[].files, residualFiles and residualHits[].file use /', () => {
    const res = runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    const allFiles = res.sensitiveKeys.flatMap((k) => k.files)
    expect(allFiles).toContain('.vitepress/theme/i18n/index.ts')
    expect(allFiles).toContain('.github/workflows/release.yml')
    assertNoBackslash(allFiles)
    expect(res.residualFiles).toContain('.vitepress/theme/useWxlsh.ts')
    assertNoBackslash(res.residualFiles)
    assertNoBackslash(res.residualHits.map((h) => h.file))
    expect(res.residualHits.map((h) => h.file)).toContain('.vitepress/theme/useWxlsh.ts')
  })

  it('--dry-run: changedFiles still use /', () => {
    const res = runForkInit(parseForkInitArgs([...A_ARGS, '--dry-run']), { projectRoot: root })
    assertNoBackslash(res.changedFiles)
    expect(res.changedFiles).toContain('.github/workflows/deploy.yml')
  })

  it('warnings reference deploy.yml with /', () => {
    const res = runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const tagRule = res.warnings.find((w) => w.includes('Tag rule'))
    expect(tagRule).toContain('.github/workflows/deploy.yml')
    expect(tagRule).not.toContain('.github\\workflows\\deploy.yml')

    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, '.github/workflows/deploy.yml'), 'name: MyCustomDeploy\n')
    const res2 = runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const already = res2.warnings.find((w) => w.includes('already exists with different content'))
    expect(already).toContain('.github/workflows/deploy.yml')
  })

  it('a manifest tree error names package.json with / (trivially, no separator in it)', () => {
    rmSync(join(root, 'package.json'))
    const res = runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    expect(res.message).toContain('package.json')
    expect(res.message).not.toContain('\\')
  })
})

describe('runForkInit — A mode (identity, base, URLs, deploy)', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-a-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  // Overridden (T60, traceability.md "Overridden contracts"): anchor mode no longer scans the
  // tree, so it rewrites only the A2–A5 forms — not every occurrence of the upstream slug — and
  // the config's `socialLinks` line is untouched. Renamed from "rewrites package.json identity and
  // leaves no upstream slug" (the old title no longer holds: socialLinks keeps the upstream slug).
  it("rewrites package.json identity and the A2–A5 forms; keeps the config's socialLinks", () => {
    const res = runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.version).toBe('0.1.0')
    expect(pkg.author).toBe('me')
    expect(pkg.license).toBe('ECL-2.0')
    expect(pkg.repository.url).toBe('git+https://github.com/me/myfork.git')
    expect(pkg.bugs.url).toBe('https://github.com/me/myfork/issues')
    expect(pkg.homepage).toBe('https://github.com/me/myfork#readme')
    const readme = readFileSync(join(root, 'README.md'), 'utf8')
    const contrib = readFileSync(join(root, 'CONTRIBUTE.md'), 'utf8')
    // A2 (both occurrences) and A3 in README.md; A4 and A5 in CONTRIBUTE.md; no upstream slug left.
    expect(readme.match(/me\/myfork/g)).toHaveLength(3)
    expect(contrib.match(/me\/myfork/g)).toHaveLength(2)
    expect(readme).not.toContain('BrowserLaboratory/wxl-platform')
    expect(contrib).not.toContain('BrowserLaboratory/wxl-platform')
    // the config is untouched outside its base line — socialLinks keeps the upstream slug
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain("socialLinks: [{ icon: 'github', link: 'https://github.com/BrowserLaboratory/wxl-platform' }],")
  })

  // Overridden (T60): anchor mode has no file list and no scan, so CHANGELOG.md — which holds no
  // A1–A9 form — is byte-identical. Renamed from "rewrites the upstream slug in CHANGELOG.md —
  // scan-driven, not a hardcoded file list" (the old title asserted the opposite).
  it('leaves CHANGELOG.md byte-identical in anchor mode (no file list, no scan)', () => {
    pinMtimes(root)
    const before = readFileSync(join(root, 'CHANGELOG.md'))
    const beforeMtime = statSync(join(root, 'CHANGELOG.md')).mtimeMs
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const after = readFileSync(join(root, 'CHANGELOG.md'))
    expect(after.equals(before)).toBe(true)
    expect(statSync(join(root, 'CHANGELOG.md')).mtimeMs).toBe(beforeMtime)
  })

  // Overridden (T60): only rebrand mode still walks the tree, so this path-segment-boundary
  // assertion now exercises B_ARGS; the assertions are unchanged.
  it('does not treat an active .vitepress/dist-* sibling as build output (path-segment boundary)', () => {
    runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    // the ACTIVE sibling IS processed (slug swapped) ...
    expect(readFileSync(join(root, '.vitepress/dist-notes.md'), 'utf8')).toContain('me/myfork')
    expect(readFileSync(join(root, '.vitepress/dist-notes.md'), 'utf8')).not.toContain('BrowserLaboratory/wxl-platform')
    // ... while the real dist/ directory is still skipped
    expect(readFileSync(join(root, '.vitepress/dist/old.html'), 'utf8')).toContain('BrowserLaboratory/wxl-platform')
  })

  // Overridden (T60/AC-E4): the base assertion is rewritten to A9; the existsSync assertion is
  // unchanged.
  it('sets base when a path is given and copies the deploy workflow', () => {
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain("const siteBase = '/myfork/'")
    expect(existsSync(join(root, '.github/workflows/deploy.yml'))).toBe(true)
  })

  it('warns about the github-pages tag rule when it creates the deploy workflow', () => {
    // The workflow deploys from refs/tags/v*, but a fresh repo's github-pages
    // environment authorises only the default branch. Without this warning the
    // first release fails inside the deploy job with an error that never names
    // the setting responsible — and the fork owner has no reason to look there.
    const res = runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const warning = res.warnings.find((w) => w.includes('github-pages'))
    expect(warning, 'no github-pages environment warning on a fresh fork').toBeTruthy()
    expect(warning).toMatch(/Tag rule/i)
    expect(warning).toContain('v*')
  })

  it('does not repeat the tag-rule warning when deploy.yml already matches', () => {
    // Second run on an unchanged fork: the file is already correct, so the
    // advice has been given. Repeating it on every run trains people to ignore
    // the warning block, which is where the residual inventory also lives.
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const second = runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    expect(second.warnings.some((w) => w.includes('github-pages'))).toBe(false)
  })

  // Overridden (T60/AC-E4): "--base none does not declare a base" -> the base becomes `/`, A9
  // written exactly (renamed to say so; body rewritten to A9).
  it('--base none sets the base to /', () => {
    runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', 'none']), { projectRoot: root })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain("const siteBase = '/'")
    expect(cfg.match(/^ {2}base: siteBase,$/m)).toHaveLength(1)
  })

  it('does not clobber a pre-existing deploy.yml with different content; warns instead', () => {
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, '.github/workflows/deploy.yml'), 'name: MyCustomDeploy\n')
    const res = runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    expect(readFileSync(join(root, '.github/workflows/deploy.yml'), 'utf8')).toBe('name: MyCustomDeploy\n')
    expect(res.warnings.some((w) => w.includes('deploy.yml'))).toBe(true)
  })

  // Overridden (T60/AC-E4): A9's literal form is replaced by another literal, $-safe; the title
  // line (and everything else outside A9) is untouched.
  it('replaces an existing base line exactly (H1 replacer branch), $-safe', () => {
    writeConfigWithBase(root, '/wxl-platform/')
    runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', '/a-b_c/']), { projectRoot: root })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain("const siteBase = '/a-b_c/'")
    expect(cfg).not.toContain('/wxl-platform/')
    expect(cfg).toContain("title: 'Web eXploitation Laboratory'") // untouched
  })

  // Overridden (T60/T18/AC-E4): the upstream-shaped `??` line is not A9 (traceability.md's A9
  // recognises only `^const siteBase = .+$`), so a config holding it has no A9 line at all — T18:
  // exitCode 1 naming A9, nothing written. The stale `??`-collapsing comment this test used to
  // guard is gone with the old code path (T83).
  it('collapses an env-conditional base line to a plain literal (upstream shape)', () => {
    writeFileSync(
      join(root, '.vitepress/config.mts'),
      [
        'export default {',
        "  base: process.env.SITE_BASE ?? '/',",
        "  title: 'Web eXploitation Laboratory',",
        '}',
        '',
      ].join('\n'),
    )
    const before = readFileSync(join(root, '.vitepress/config.mts'))
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', '/myfork/']), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(1)
    expect(res.message).toContain('A9')
    expect(readFileSync(join(root, '.vitepress/config.mts'))).toEqual(before)
  })

  // Overridden (T60/T18/AC-E4): a literal `base:` line (no A9 line) is the same T18 shape —
  // exitCode 1 naming A9, nothing written.
  it('--base none strips an existing base line, leaving the rest intact', () => {
    // A literal `base:` line with no A9 line at all: T18's "literal base: line" boundary.
    writeFileSync(
      join(root, '.vitepress/config.mts'),
      ['export default {', "  base: '/wxl-platform/',", "  title: 'Web eXploitation Laboratory',", '}', ''].join('\n'),
    )
    const before = readFileSync(join(root, '.vitepress/config.mts'))
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', 'none']), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(1)
    expect(res.message).toContain('A9')
    expect(readFileSync(join(root, '.vitepress/config.mts'))).toEqual(before)
  })

  it('sets package.json description only when --description is given', () => {
    runForkInit(parseForkInitArgs([...A_ARGS, '--description', 'My CTF platform']), { projectRoot: root })
    expect(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).description).toBe('My CTF platform')
    // fresh fixture, no --description -> unchanged from fixture
    const root2 = mkdtempSync(join(tmpdir(), 'fork-init-desc-'))
    writeFixture(root2)
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root2 })
    expect(JSON.parse(readFileSync(join(root2, 'package.json'), 'utf8')).description).toBe('Web eXploitation Laboratory — powered by WASM')
    rmSync(root2, { recursive: true, force: true })
  })

  it('A mode produces no residual inventory (rebrand-only concern)', () => {
    const res = runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    expect(res.residualFiles).toEqual([])
    expect(res.residualHits).toEqual([])
    expect(res.sensitiveKeys).toEqual([])
  })
})

// T39/T8/AC-N1/AC-A5: --site-name sets A6 and both A7s, all written as a JSON string literal;
// changedFiles lists exactly these three files.
describe('runForkInit — anchor mode: site name (A6, A7)', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-sitename-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  const UPSTREAM_ARGS = ['--author', 'CXPh03n1x', '--repo', 'BrowserLaboratory/wxl-platform']

  it.each([
    ["the fixture's single-quoted A6, double-quoted A7", undefined, undefined],
    [
      'a real-config double-quoted A6',
      [
        'export default {',
        '  title: "Web eXploitation Laboratory",',
        '  themeConfig: {',
        "    title: 'Nested',",
        '  },',
        '}',
        '',
      ].join('\n'),
      undefined,
    ],
    ['a single-quoted A7', undefined, "'WXL'"],
    ['a plain-scalar A7', undefined, 'WXL'],
  ])('sets A6 and both A7 (%s), changedFiles lists exactly these three files', (_label, cfgBody, a7Value) => {
    if (cfgBody) writeFileSync(join(root, '.vitepress/config.mts'), cfgBody)
    if (a7Value !== undefined) {
      for (const file of ['platform/index.md', 'platform/zh-TW/index.md']) {
        const before = readFileSync(join(root, file), 'utf8')
        writeFileSync(join(root, file), before.replace('  name: "WXL"', `  name: ${a7Value}`))
      }
    }
    // First run: converge every OTHER anchor (package.json, the doc anchors, the workflow) to
    // its steady state without touching --site-name, so the second run below changes nothing but
    // A6 and both A7s.
    runForkInit(parseForkInitArgs(UPSTREAM_ARGS), { projectRoot: root })
    const res = runForkInit(parseForkInitArgs([...UPSTREAM_ARGS, '--site-name', 'New Name']), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain('  title: "New Name",')
    const home = readFileSync(join(root, 'platform/index.md'), 'utf8')
    const homeZh = readFileSync(join(root, 'platform/zh-TW/index.md'), 'utf8')
    expect(home).toContain('  name: "New Name"')
    expect(homeZh).toContain('  name: "New Name"')
    expect(res.changedFiles.sort()).toEqual(
      ['.vitepress/config.mts', 'platform/index.md', 'platform/zh-TW/index.md'].sort(),
    )
    // frontmatter's other lines and config's deeper-indented feature title are unchanged
    expect(home).toContain('layout: home')
    expect(home).toContain('    title: Browser Emulator')
    expect(cfg).toContain('themeConfig')
    // item 8: a deeper-indented `title:` inside `themeConfig` (4-space, not A6's 2-space) must
    // survive untouched; checked here as a whole-file comparison -- the only line allowed to
    // differ from `cfgBody` is A6's own -- not just a `toContain`, which could not catch an
    // accidental extra/duplicated/reordered line elsewhere.
    if (_label === 'a real-config double-quoted A6') {
      const expectedCfg = cfgBody!.replace('  title: "Web eXploitation Laboratory",', '  title: "New Name",')
      expect(cfg).toBe(expectedCfg)
      expect(cfg).toContain("    title: 'Nested',")
    }
  })

  // T42/AC-N3: a --site-name value containing a character with special meaning in a JS string
  // literal or in unquoted YAML round-trips intact: the written A6 literal, evaluated with
  // node:vm, equals the value; both frontmatters, parsed with yaml, give hero.name equal to it.
  it.each([
    'double quote "',
    "single quote '",
    'backslash \\',
    'backtick `',
    'dollar $',
    'dollar-backtick $`',
    "dollar-quote $'",
    'double dollar $$',
    'dollar-one $1',
    `Lin's "Web" Range \\ $' $1`,
    '# x',
    '- x',
    'a: b',
    '[x]',
    '*x',
    '!x',
    'yes',
    'null',
    '123',
  ])('round-trips a value containing %j', (value) => {
    // the `=` form: several values here start with `-`, which Node's own parser would otherwise
    // treat as the start of another flag.
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', `--site-name=${value}`]), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(0)
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    const titleLine = cfg.split('\n').find((l) => l.startsWith('  title: '))!
    const literal = titleLine.slice('  title: '.length, -1) // strip the trailing comma
    expect(runInNewContext(literal)).toBe(value)

    for (const file of ['platform/index.md', 'platform/zh-TW/index.md']) {
      const raw = readFileSync(join(root, file), 'utf8')
      const frontmatter = raw.slice(raw.indexOf('\n') + 1, raw.indexOf('\n---', 1))
      const doc = parseYaml(frontmatter)
      expect((doc as { hero: { name: string } }).hero.name).toBe(value)
    }
  })

  // T43/AC-N1: the written value is the trimmed one; a ZWJ emoji sequence is written as-is.
  it.each([
    ['leading/trailing U+3000 and ASCII space', ' \u3000 Trimmed Lab \u3000 ', 'Trimmed Lab'],
    ['a ZWJ emoji sequence', '\u{1F469}\u200D\u{1F4BB}', '\u{1F469}\u200D\u{1F4BB}'],
    ['a leading U+FEFF', '\uFEFFLab', 'Lab'],
  ])('writes the trimmed value (%s)', (_label, raw, expected) => {
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', `--site-name=${raw}`]), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(0)
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain(`  title: ${JSON.stringify(expected)},`)
    const home = readFileSync(join(root, 'platform/index.md'), 'utf8')
    expect(home).toContain(`  name: ${JSON.stringify(expected)}`)
  })
})

// T32/T8/AC-O1/AC-A5: --origin writes A8 as a JSON string literal, hostname lowercased, path case
// unchanged.
// 0007 P3/D10 (T-0038): the A8 replacement warning names SITE_ORIGIN as the range's address, the
// origin of every copied link, not only the short links' origin.
function expectRangeAddressWording(warning: string | undefined) {
  expect(warning).toMatch(/^A8: /)
  expect(warning).toContain('range address')
  expect(warning).toContain('every copied link')
  expect(warning).not.toContain('short-link origin')
}

describe('runForkInit — anchor mode: short-link origin (A8)', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-origin-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  function readShortLink(): string {
    return readFileSync(join(root, '.vitepress/challenge/shortLink.ts'), 'utf8')
  }

  it('--origin without --host sets A8', () => {
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--origin', 'https://e.example']), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(0)
    expect(readShortLink()).toContain(`export const SITE_ORIGIN = "https://e.example"`)
  })

  it('--host github-pages with --origin given: the given value wins, not the derived one', () => {
    const res = runForkInit(
      parseForkInitArgs(['--author', 'me', '--repo', 'test-owner/web-range', '--host', 'github-pages', '--origin', 'https://e.example']),
      { projectRoot: root },
    )
    expect(res.exitCode).toBe(0)
    expect(readShortLink()).toContain(`export const SITE_ORIGIN = "https://e.example"`)
  })

  it('--host cloudflare-pages without a path in --origin sets A8', () => {
    const res = runForkInit(
      parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--origin', 'https://web-range.pages.dev']),
      { projectRoot: root },
    )
    expect(res.exitCode).toBe(0)
    expect(readShortLink()).toContain(`export const SITE_ORIGIN = "https://web-range.pages.dev"`)
  })

  it('lowercases the hostname but keeps the path case', () => {
    const res = runForkInit(
      parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--origin', 'https://Example.COM/My-Path']),
      { projectRoot: root },
    )
    expect(res.exitCode).toBe(0)
    expect(readShortLink()).toContain(`export const SITE_ORIGIN = "https://example.com/My-Path"`)
  })

  // T36/AC-O2: --host github-pages without --origin derives A8 as
  // `https://<owner, lowercased>.github.io/<name as given>`, on every such run.
  it.each([
    ['S7 GH', 'test-owner/web-range', 'https://test-owner.github.io/web-range'],
    ['mixed-case owner and name', 'Test-Owner/Web-Range', 'https://test-owner.github.io/Web-Range'],
    ['name containing . and _', 'owner/my.range_1', 'https://owner.github.io/my.range_1'],
    ['name looking like another owner.github.io, not the user site', 'owner/other.github.io', 'https://owner.github.io/other.github.io'],
    [
      'name that is NOT exactly owner.github.io (a .bak suffix)',
      'owner/owner.github.io.bak',
      'https://owner.github.io/owner.github.io.bak',
    ],
  ])('derives A8 (%s)', (_label, repo, expectedOrigin) => {
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', repo, '--host', 'github-pages']), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(0)
    expect(readShortLink()).toContain(`export const SITE_ORIGIN = ${JSON.stringify(expectedOrigin)}`)
  })

  it('re-derives on every run: a custom --origin run followed by a GH run without --origin resets A8, warning (T81)', () => {
    runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'test-owner/web-range', '--origin', 'https://c.example']), {
      projectRoot: root,
    })
    const res = runForkInit(
      parseForkInitArgs(['--author', 'me', '--repo', 'test-owner/web-range', '--host', 'github-pages']),
      { projectRoot: root },
    )
    expect(res.exitCode).toBe(0)
    expect(readShortLink()).toContain(`export const SITE_ORIGIN = "https://test-owner.github.io/web-range"`)
    const warning = res.warnings.find((w) => w.includes('A8'))
    expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
    expect(warning).toContain('https://c.example')
    expect(warning).toContain('https://test-owner.github.io/web-range')
    expectRangeAddressWording(warning)
  })

  // T37/AC-O2: name = <owner>.github.io (compared case-insensitively) derives the user-site A8,
  // with no path.
  it.each([
    ['exact case', 'owner/owner.github.io'],
    ['mixed case', 'Owner/OWNER.GitHub.IO'],
  ])('derives the user-site A8 with no path (%s)', (_label, repo) => {
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', repo, '--host', 'github-pages']), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(0)
    expect(readShortLink()).toContain(`export const SITE_ORIGIN = "https://owner.github.io"`)
  })

  // T38/AC-O2: with neither --origin nor --host, A8 is untouched: bytes and mtime unchanged, and
  // the file is absent from changedFiles.
  it.each([
    ['--author --repo only', ['--author', 'me', '--repo', 'me/myfork']],
    ['with --base', ['--author', 'me', '--repo', 'me/myfork', '--base', '/x/']],
    ['with --site-name', ['--author', 'me', '--repo', 'me/myfork', '--site-name', 'New Name']],
  ])('A8 untouched (%s)', (_label, argv) => {
    pinMtimes(root)
    const before = statSync(join(root, '.vitepress/challenge/shortLink.ts'))
    const beforeBytes = readFileSync(join(root, '.vitepress/challenge/shortLink.ts'))
    const res = runForkInit(parseForkInitArgs(argv), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, '.vitepress/challenge/shortLink.ts'))).toEqual(beforeBytes)
    expect(statSync(join(root, '.vitepress/challenge/shortLink.ts')).mtimeMs).toBe(before.mtimeMs)
    expect(res.changedFiles).not.toContain('.vitepress/challenge/shortLink.ts')
  })

  // T81/AC-O2: replacing an A8 value that is not upstream's warns, naming A8 and the old and new
  // values; the upstream value (either quote style) and an unchanged value never warn.
  function setShortLink(literalLine: string) {
    writeFileSync(join(root, '.vitepress/challenge/shortLink.ts'), `export const SITE_ORIGIN = ${literalLine}\n`)
  }

  it.each([
    ["single-quoted upstream value", "'https://wxl.browserlab.online'"],
    ["double-quoted upstream value", '"https://wxl.browserlab.online"'],
  ])('does not warn when the existing value is upstream\'s (%s)', (_label, literal) => {
    setShortLink(literal)
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--origin', 'https://e.example']), {
      projectRoot: root,
    })
    expect(res.warnings.some((w) => w.includes('A8'))).toBe(false)
  })

  it('does not warn and does not write when the existing value already equals the new one', () => {
    setShortLink('"https://e.example"')
    pinMtimes(root)
    const before = statSync(join(root, '.vitepress/challenge/shortLink.ts')).mtimeMs
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--origin', 'https://e.example']), {
      projectRoot: root,
    })
    expect(res.warnings.some((w) => w.includes('A8'))).toBe(false)
    expect(res.changedFiles).not.toContain('.vitepress/challenge/shortLink.ts')
    expect(statSync(join(root, '.vitepress/challenge/shortLink.ts')).mtimeMs).toBe(before)
  })

  // T8/item 4: A6-A8 are written as a JSON string literal regardless of the existing value's own
  // quoting -- comparing DECODED values for "already the target, skip" let a single-quoted line
  // holding the same value survive unrewritten (not a JSON string literal), which is wrong. The
  // write decision must compare the WHOLE LINE; the T81 warning, separately, must still compare
  // the decoded value (so this re-quoting alone never warns).
  it('a single-quoted existing value equal to the new one is rewritten to the JSON form, without a T81 warning; a second run then changes nothing', () => {
    setShortLink("'https://e.example'")
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--origin', 'https://e.example']), {
      projectRoot: root,
    })
    expect(res.warnings.some((w) => w.includes('A8'))).toBe(false)
    expect(res.changedFiles).toContain('.vitepress/challenge/shortLink.ts')
    expect(readShortLink()).toContain('export const SITE_ORIGIN = "https://e.example"')

    const second = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--origin', 'https://e.example']), {
      projectRoot: root,
    })
    expect(second.changedFiles).toEqual([])
  })

  it('warns when a custom existing value is replaced by --origin', () => {
    setShortLink("'https://custom.example'")
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--origin', 'https://e.example']), {
      projectRoot: root,
    })
    const warning = res.warnings.find((w) => w.includes('A8'))
    expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
    expect(warning).toContain('https://custom.example')
    expect(warning).toContain('https://e.example')
    expectRangeAddressWording(warning)
  })

  it('warns when a custom existing value is replaced by a derived GitHub Pages origin', () => {
    setShortLink("'https://custom.example'")
    const res = runForkInit(
      parseForkInitArgs(['--author', 'me', '--repo', 'test-owner/web-range', '--host', 'github-pages']),
      { projectRoot: root },
    )
    const warning = res.warnings.find((w) => w.includes('A8'))
    expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
    expect(warning).toContain('https://custom.example')
    expect(warning).toContain('https://test-owner.github.io/web-range')
    expectRangeAddressWording(warning)
  })

  it('does not warn when no --origin is given and none is derived', () => {
    setShortLink("'https://custom.example'")
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    expect(res.warnings.some((w) => w.includes('A8'))).toBe(false)
  })
})

// Supports C63 (0005-create-wxl override): deriveGithubPagesOrigin becomes an export, behaviour
// unchanged — create-wxl's setup summary needs to call it directly.
describe('deriveGithubPagesOrigin (exported, 0005-create-wxl override)', () => {
  it('is exported and derives the GitHub Pages origin unchanged', () => {
    expect(deriveGithubPagesOrigin('alice/alice.github.io')).toBe('https://alice.github.io')
    expect(deriveGithubPagesOrigin('Alice/r')).toBe('https://alice.github.io/r')
  })
})

// T9/T54/AC-A5: a code anchor being set (A6-A8) with zero or several candidate lines (a missing
// file counts as zero), or an unparsable existing value, returns exitCode 1 naming the anchor id
// and the file; nothing is written: every file's bytes and mtime are unchanged, no file is
// created or removed, and no `*.fork-init-tmp` is left.
describe('runForkInit — anchor mode: code anchor errors (A6–A8)', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-anchor-errors-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  function assertNothingWritten(before: ReturnType<typeof snapshotTree>) {
    const after = snapshotTree(root)
    expect(after).toEqual(before)
    for (const f of listFiles(root)) expect(f.endsWith('.fork-init-tmp')).toBe(false)
  }

  const SITE_NAME_ARGS = ['--author', 'me', '--repo', 'me/myfork', '--site-name', 'New Name']
  const ORIGIN_ARGS = ['--author', 'me', '--repo', 'me/myfork', '--origin', 'https://e.example']

  const A6_CASES: Array<[string, string | null]> = [
    ['only a 4-space-indented title:', ['export default {', "    title: 'x',", '}', ''].join('\n')],
    ['title: line not ending in a comma (not a candidate)', ['export default {', "  title: 'x', // c", '}', ''].join('\n')],
    ['config does not exist', null],
    ['two title: lines', ['export default {', "  title: 'a',", "  title: 'b',", '}', ''].join('\n')],
    ['value is an identifier (siteTitle)', ['export default {', '  title: siteTitle,', '}', ''].join('\n')],
    ['value is a template literal', ['export default {', '  title: `x`,', '}', ''].join('\n')],
    ["value is 'a' + 'b'", ['export default {', "  title: 'a' + 'b',", '}', ''].join('\n')],
    ["value is an unterminated 'a", ['export default {', "  title: 'a,", '}', ''].join('\n')],
    // T9 (A6 part): only standard ECMAScript escapes are accepted (traceability.md, "standard
    // escapes") -- an unterminated \u{, an empty \u{}, an out-of-range \u{...}, an invalid \x hex
    // pair, a \u with too few hex digits, and a numeric escape (\1, not a standard single-char
    // escape) must all fail to parse, not be silently decoded.
    ["value is '\\u{41abc' (unterminated \\u{...})", ['export default {', "  title: '\\u{41abc',", '}', ''].join('\n')],
    ["value is '\\u{}' (empty hex in \\u{...})", ['export default {', "  title: '\\u{}',", '}', ''].join('\n')],
    ["value is '\\u{110000}' (out of range)", ['export default {', "  title: '\\u{110000}',", '}', ''].join('\n')],
    ["value is '\\xZZ' (invalid hex)", ['export default {', "  title: '\\xZZ',", '}', ''].join('\n')],
    ["value is '\\u12' (too few hex digits)", ['export default {', "  title: '\\u12',", '}', ''].join('\n')],
    ["value is '\\1' (numeric escape, not standard)", ['export default {', "  title: '\\1',", '}', ''].join('\n')],
  ]
  for (const [label, body] of A6_CASES) {
    it(`A6: ${label} -> exitCode 1 naming A6 and the config path, nothing written`, () => {
      if (body === null) rmSync(join(root, '.vitepress/config.mts'))
      else writeFileSync(join(root, '.vitepress/config.mts'), body)
      pinMtimes(root)
      const before = snapshotTree(root)
      const res = runForkInit(parseForkInitArgs(SITE_NAME_ARGS), { projectRoot: root })
      expect(res.exitCode).toBe(1)
      expect(res.message).toContain('A6')
      expect(res.message).toContain('.vitepress/config.mts')
      assertNothingWritten(before)
    })
  }

  const FM = (heroBlock: string) => ['---', 'layout: home', '', heroBlock, '---', ''].join('\n')
  const A7_CASES: Array<[string, string | null]> = [
    ['hero has no name: line', FM(['hero:', '  tagline: x'].join('\n'))],
    ['name: indented 4 spaces (not a candidate)', FM(['hero:', '    name: "WXL"'].join('\n'))],
    ['name: at column 0 (sibling, outside hero)', ['---', 'hero:', '  tagline: x', 'name: "WXL"', '---', ''].join('\n')],
    [
      'name: under another column-0 key after hero',
      ['---', 'hero:', '  tagline: x', 'features:', '  name: "WXL"', '---', ''].join('\n'),
    ],
    [
      'name: only in the second --- block',
      ['---', 'hero:', '  tagline: x', '---', '---', 'hero:', '  name: "WXL"', '---', ''].join('\n'),
    ],
    ['hero has two name: lines', FM(['hero:', '  name: "WXL"', '  name: "Other"'].join('\n'))],
    ['no frontmatter at all', '# No frontmatter\n'],
    ['file does not exist', null],
    ['value is | (block literal)', FM(['hero:', '  name: |'].join('\n'))],
    ['value is > (block folded)', FM(['hero:', '  name: >'].join('\n'))],
    ['value is "WXL" # c (trailing comment)', FM(['hero:', '  name: "WXL" # c'].join('\n'))],
    ['value is 123', FM(['hero:', '  name: 123'].join('\n'))],
    ['value is true', FM(['hero:', '  name: true'].join('\n'))],
    ['value is null', FM(['hero:', '  name: null'].join('\n'))],
    ['value is [a]', FM(['hero:', '  name: [a]'].join('\n'))],
    // T9 (A7 part): the frontmatter block must start at the file's own first line (traceability.md
    // scoping rule) -- a body `---`/`---` pair that merely LOOKS like frontmatter further down the
    // file (after other prose) must not be mistaken for it, even when it has its own `hero:` /
    // `  name:` shape.
    [
      'no frontmatter at the top, but a later --- divider forms a false frontmatter-like block',
      ['# Not frontmatter at all', '', 'Some prose.', '', '---', 'hero:', '  name: "WXL"', '---', '', 'More prose.', ''].join(
        '\n',
      ),
    ],
  ]
  // T9 (A7 part)/item 9: every A7_CASES entry is run against BOTH home pages, not only
  // platform/index.md, so platform/zh-TW/index.md's own candidate-search path is exercised too.
  const A7_HOME_FILES = ['platform/index.md', 'platform/zh-TW/index.md'] as const
  for (const homeFile of A7_HOME_FILES) {
    for (const [label, body] of A7_CASES) {
      it(`A7: ${label} (${homeFile}) -> exitCode 1 naming A7 and the path, nothing written`, () => {
        if (body === null) rmSync(join(root, homeFile))
        else writeFileSync(join(root, homeFile), body)
        pinMtimes(root)
        const before = snapshotTree(root)
        const res = runForkInit(parseForkInitArgs(SITE_NAME_ARGS), { projectRoot: root })
        expect(res.exitCode).toBe(1)
        expect(res.message).toContain('A7')
        expect(res.message).toContain(homeFile)
        assertNothingWritten(before)
      })
    }
  }

  it('A7: when only one home page is broken, the other (valid) one is not written either', () => {
    rmSync(join(root, 'platform/index.md'))
    pinMtimes(root)
    const zhBefore = readFileSync(join(root, 'platform/zh-TW/index.md'))
    const before = snapshotTree(root)
    const res = runForkInit(parseForkInitArgs(SITE_NAME_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(1)
    assertNothingWritten(before)
    expect(readFileSync(join(root, 'platform/zh-TW/index.md'))).toEqual(zhBefore)
  })

  const A8_CASES: Array<[string, string | null]> = [
    ['a TS type annotation breaks the candidate form', "export const SITE_ORIGIN: string = 'x'\n"],
    ['indented (not column 0)', "  export const SITE_ORIGIN = 'x'\n"],
    ['export let, not export const', "export let SITE_ORIGIN = 'x'\n"],
    ['two lines', "export const SITE_ORIGIN = 'a'\nexport const SITE_ORIGIN = 'b'\n"],
    ['value is an identifier (location.origin)', 'export const SITE_ORIGIN = location.origin\n'],
    ['value is a template literal', 'export const SITE_ORIGIN = `x`\n'],
    ["value is 'x' // c (trailing comment)", "export const SITE_ORIGIN = 'x' // c\n"],
    // T9 (A8 part): same standard-escape rule as A6. The unterminated \u{ case used to hang
    // (evalJsStringLiteral looped forever when the closing } was never found) -- demonstrated
    // separately with a timeboxed subprocess (see the ticket's red->green log), not run in this
    // in-process loop until the fix was in place.
    ["value has an unterminated \\u{ escape", "export const SITE_ORIGIN = '\\u{41abc'\n"],
    ["value has an empty \\u{} escape", "export const SITE_ORIGIN = '\\u{}'\n"],
    ["value's \\u{...} escape is out of range", "export const SITE_ORIGIN = '\\u{110000}'\n"],
    ["value has an invalid \\x escape", "export const SITE_ORIGIN = '\\xZZ'\n"],
    ["value has a \\u escape with too few hex digits", "export const SITE_ORIGIN = '\\u12'\n"],
    ["value has a numeric escape \\1", "export const SITE_ORIGIN = '\\1'\n"],
    ['file does not exist', null],
  ]
  for (const [label, body] of A8_CASES) {
    it(`A8: ${label} -> exitCode 1 naming A8 and the short-link path, nothing written`, () => {
      if (body === null) rmSync(join(root, '.vitepress/challenge/shortLink.ts'))
      else writeFileSync(join(root, '.vitepress/challenge/shortLink.ts'), body)
      pinMtimes(root)
      const before = snapshotTree(root)
      const res = runForkInit(parseForkInitArgs(ORIGIN_ARGS), { projectRoot: root })
      expect(res.exitCode).toBe(1)
      expect(res.message).toContain('A8')
      expect(res.message).toContain('.vitepress/challenge/shortLink.ts')
      assertNothingWritten(before)
    })
  }

  // T10/AC-A5: an existing A6-A8 value containing escapes is fully replaced; the file still
  // parses and no fragment of the old value survives.
  it.each([
    ['double-quoted with escaped quotes', '"a \\"b\\" c"'],
    ['single-quoted with an escaped backslash', "'a\\\\b'"],
    ["single-quoted with an escaped quote", "'it\\'s'"],
  ])('A6: %s -> fully replaced, config still parses', (_label, oldLiteral) => {
    writeFileSync(join(root, '.vitepress/config.mts'), ['export default {', `  title: ${oldLiteral},`, '}', ''].join('\n'))
    const res = runForkInit(parseForkInitArgs(SITE_NAME_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain('  title: "New Name",')
    expect(cfg).not.toContain('a \\"b\\" c')
    expect(cfg).not.toContain('a\\\\b')
    expect(cfg).not.toContain("it\\'s")
  })

  it.each([
    ["single-quoted, doubled single quote", "'it''s'"],
    ['double-quoted with escaped quotes', '"a \\"b\\""'],
  ])('A7: %s -> fully replaced, parses with yaml to the new value', (_label, oldLiteral) => {
    const body = ['---', 'hero:', `  name: ${oldLiteral}`, '---', ''].join('\n')
    writeFileSync(join(root, 'platform/index.md'), body)
    const res = runForkInit(parseForkInitArgs(SITE_NAME_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    const raw = readFileSync(join(root, 'platform/index.md'), 'utf8')
    const frontmatter = raw.slice(raw.indexOf('\n') + 1, raw.indexOf('\n---', 1))
    const doc = parseYaml(frontmatter) as { hero: { name: string } }
    expect(doc.hero.name).toBe('New Name')
    expect(raw).not.toContain("it''s")
    expect(raw).not.toContain('a \\"b\\"')
  })

  it("A8: 'https://x\\'y.example' -> fully replaced", () => {
    writeFileSync(join(root, '.vitepress/challenge/shortLink.ts'), "export const SITE_ORIGIN = 'https://x\\'y.example'\n")
    const res = runForkInit(parseForkInitArgs(ORIGIN_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    const content = readFileSync(join(root, '.vitepress/challenge/shortLink.ts'), 'utf8')
    expect(content).toBe(`export const SITE_ORIGIN = "https://e.example"\n`)
    expect(content).not.toContain('x\\')
  })

  // T11/T4/T5 (A6-A8 part)/AC-A6/AC-A2 (suggested addition): A6-A8's files are recognised in
  // CRLF form, the written line keeps CRLF and every other byte is unchanged; a code anchor not
  // being set need not exist, and the run still succeeds.
  it('CRLF: config (A6/A9), both home pages (A7) and the short-link module (A8) each keep CRLF, other bytes unchanged', () => {
    const crlfCfg = [
      "const siteBase = process.env.SITE_BASE || '/'",
      '',
      'export default {',
      "  title: 'Web eXploitation Laboratory',",
      '  base: siteBase,',
      '}',
      '',
    ].join('\r\n')
    writeFileSync(join(root, '.vitepress/config.mts'), crlfCfg)
    const crlfHome = ['---', 'hero:', '  name: "WXL"', '---', ''].join('\r\n')
    writeFileSync(join(root, 'platform/index.md'), crlfHome)
    writeFileSync(join(root, 'platform/zh-TW/index.md'), crlfHome)
    const crlfShortLink = "export const SITE_ORIGIN = 'https://wxl.browserlab.online'\r\n"
    writeFileSync(join(root, '.vitepress/challenge/shortLink.ts'), crlfShortLink)

    const res = runForkInit(
      parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--site-name', 'New Name', '--origin', 'https://e.example']),
      { projectRoot: root },
    )
    expect(res.exitCode).toBe(0)

    // Whole-file comparison (item 8): the expected content is the ORIGINAL bytes with only the
    // written line substituted, byte for byte -- a stronger check than the line-by-line `toContain`
    // assertions this replaces, since it also catches anything the engine might change elsewhere.
    const expectedCfg = crlfCfg.replace("  title: 'Web eXploitation Laboratory',", '  title: "New Name",')
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toBe(expectedCfg)

    const expectedHome = crlfHome.replace('  name: "WXL"', '  name: "New Name"')
    const home = readFileSync(join(root, 'platform/index.md'), 'utf8')
    expect(home).toBe(expectedHome)
    const homeZh = readFileSync(join(root, 'platform/zh-TW/index.md'), 'utf8')
    expect(homeZh).toBe(expectedHome)

    const shortLink = readFileSync(join(root, '.vitepress/challenge/shortLink.ts'), 'utf8')
    expect(shortLink).toBe('export const SITE_ORIGIN = "https://e.example"\r\n')
  })

  // T4 (A6-A8 part, suggested addition): a byte outside the written line -- including one that is
  // not valid UTF-8 on its own -- round-trips unchanged; only the anchor's own line changes. Read
  // back as a Buffer (not a UTF-8 string) so the comparison itself cannot paper over a corrupted
  // byte the way decoding-then-reencoding would.
  it('A6: an invalid-UTF-8 byte outside the title: line is preserved, only that line changes', () => {
    const before = readFileSync(join(root, '.vitepress/config.mts'))
    const marked = Buffer.concat([before, Buffer.from([0xff]), Buffer.from('\n// invalid byte above\n')])
    writeFileSync(join(root, '.vitepress/config.mts'), marked)
    const res = runForkInit(parseForkInitArgs(SITE_NAME_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    const after = readFileSync(join(root, '.vitepress/config.mts'))
    // Build the expected bytes directly from `marked` (the only line allowed to differ is the
    // title line), rather than from a fresh utf8 decode/encode round trip, which would itself
    // destroy the 0xFF byte this test exists to protect.
    const beforeLines = marked.toString('latin1').split('\n')
    const titleIdx = beforeLines.findIndex((l) => /^ {2}title: .+,\r?$/.test(l))
    expect(titleIdx).toBeGreaterThanOrEqual(0)
    beforeLines[titleIdx] = '  title: "New Name",'
    expect(after.toString('latin1')).toBe(beforeLines.join('\n'))
  })

  it('A7: an invalid-UTF-8 byte outside the name: line is preserved, only that line changes', () => {
    const before = readFileSync(join(root, 'platform/index.md'))
    const marked = Buffer.concat([before, Buffer.from([0xff]), Buffer.from('\n<!-- invalid byte above -->\n')])
    writeFileSync(join(root, 'platform/index.md'), marked)
    const res = runForkInit(parseForkInitArgs(SITE_NAME_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    const after = readFileSync(join(root, 'platform/index.md'))
    const beforeLines = marked.toString('latin1').split('\n')
    const nameIdx = beforeLines.findIndex((l) => /^ {2}name: .+\r?$/.test(l))
    expect(nameIdx).toBeGreaterThanOrEqual(0)
    beforeLines[nameIdx] = '  name: "New Name"'
    expect(after.toString('latin1')).toBe(beforeLines.join('\n'))
  })

  it('A8: an invalid-UTF-8 byte outside the SITE_ORIGIN line is preserved, only that line changes', () => {
    const before = readFileSync(join(root, '.vitepress/challenge/shortLink.ts'))
    const marked = Buffer.concat([before, Buffer.from([0xff]), Buffer.from('\n// invalid byte above\n')])
    writeFileSync(join(root, '.vitepress/challenge/shortLink.ts'), marked)
    const res = runForkInit(parseForkInitArgs(ORIGIN_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    const after = readFileSync(join(root, '.vitepress/challenge/shortLink.ts'))
    const beforeLines = marked.toString('latin1').split('\n')
    const originIdx = beforeLines.findIndex((l) => /^export const SITE_ORIGIN = .+\r?$/.test(l))
    expect(originIdx).toBeGreaterThanOrEqual(0)
    beforeLines[originIdx] = 'export const SITE_ORIGIN = "https://e.example"'
    expect(after.toString('latin1')).toBe(beforeLines.join('\n'))
  })

  it('only --origin given: a missing config (A6/A9 unused) does not fail the run', () => {
    rmSync(join(root, '.vitepress/config.mts'))
    const res = runForkInit(parseForkInitArgs(ORIGIN_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
  })

  it('only --site-name given: a missing short-link module (A8 unused) does not fail the run', () => {
    rmSync(join(root, '.vitepress/challenge/shortLink.ts'))
    const res = runForkInit(parseForkInitArgs(SITE_NAME_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(existsSync(join(root, '.vitepress/challenge/shortLink.ts'))).toBe(false)
  })

  it('--base /x/ without --site-name: the config changes only the A9 line, not the title', () => {
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', '/x/']), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(0)
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain("const siteBase = '/x/'")
    expect(cfg).toContain("title: 'Web eXploitation Laboratory'")
  })
})

// T8 (A9 part), T20/AC-H5: --base writes A9 whole, as one of two exact lines; the config's
// `  base: siteBase,` line and everything else is untouched.
describe('runForkInit — A9 base', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-a9-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it("--base /x/ writes A9 as const siteBase = '/x/'; the base: siteBase line is untouched", () => {
    const cfgBefore = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', '/x/']), { projectRoot: root })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain("const siteBase = '/x/'")
    expect(cfg).toContain('  base: siteBase,')
    // nothing else in the file changed: the only different line is the A9 line itself
    const before = cfgBefore.split('\n')
    const after = cfg.split('\n')
    expect(after.length).toBe(before.length)
    const diffLines = after.filter((line, i) => line !== before[i])
    expect(diffLines).toEqual(["const siteBase = '/x/'"])
  })

  it.each([
    ['--base none', ['--author', 'me', '--repo', 'me/myfork', '--base', 'none']],
    ['--base /', ['--author', 'me', '--repo', 'me/myfork', '--base', '/']],
  ])("%s writes A9 as const siteBase = '/'", (_label, argv) => {
    runForkInit(parseForkInitArgs(argv), { projectRoot: root })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain("const siteBase = '/'")
    expect(cfg).toContain('  base: siteBase,')
  })

  // --base writes A9 from a literal (not just upstream's own form) and from an unparseable
  // expression (A9's existing value is never parsed, only replaced); either way the config is
  // listed in changedFiles.
  it.each([
    ["a literal '/old/'", '/old/'],
    ['an unparseable expression (42)', '42'],
  ])('--base /x/ writes A9 starting from %s, config listed in changedFiles', (_label, oldValue) => {
    writeFileSync(
      join(root, '.vitepress/config.mts'),
      [`const siteBase = ${/^\d+$/.test(oldValue) ? oldValue : `'${oldValue}'`}`, '', 'export default {', "  title: 'x',", '  base: siteBase,', '}', ''].join(
        '\n',
      ),
    )
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', '/x/']), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(0)
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain("const siteBase = '/x/'")
    expect(res.changedFiles).toContain('.vitepress/config.mts')
  })

  // --base on a config already at the target A9 line writes nothing — bytes and mtime unchanged,
  // and the config is absent from changedFiles.
  it('--base /x/ on a config already at the target A9 line: no write (bytes, mtime, changedFiles)', () => {
    writeConfigWithBase(root, '/x/')
    pinMtimes(root)
    const before = readFileSync(join(root, '.vitepress/config.mts'))
    const mtimeBefore = statSync(join(root, '.vitepress/config.mts')).mtimeMs
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', '/x/']), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, '.vitepress/config.mts'))).toEqual(before)
    expect(statSync(join(root, '.vitepress/config.mts')).mtimeMs).toBe(mtimeBefore)
    expect(res.changedFiles).not.toContain('.vitepress/config.mts')
  })

  // T19/T82/AC-H2: --host (either value) always resets A9 to the upstream form; a run whose A9
  // was already something else (a literal, or an unparseable expression) warns, naming A9, the old
  // line and the upstream form.
  it.each(['github-pages', 'cloudflare-pages'])(
    '--host %s resets A9 to the upstream form, warning when it was not already upstream',
    (host) => {
      writeConfigWithBase(root, '/x/')
      // T35: --host cloudflare-pages needs --origin.
      const res = runForkInit(
        parseForkInitArgs([
          '--author',
          'me',
          '--repo',
          'me/myfork',
          '--host',
          host,
          ...(host === 'cloudflare-pages' ? ['--origin', 'https://e.example'] : []),
        ]),
        { projectRoot: root },
      )
      const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
      expect(cfg).toContain(`const siteBase = process.env.SITE_BASE || '/'`)
      const warning = res.warnings.find((w) => w.includes('A9'))
      expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
      expect(warning).toContain("const siteBase = '/x/'")
      expect(warning).toContain(`const siteBase = process.env.SITE_BASE || '/'`)
    },
  )

  // The old-line '/' shape (--base none's own output) also warns on reset, and the warning
  // contains the old line and the upstream form.
  it.each(['github-pages', 'cloudflare-pages'])(
    "--host %s resets A9 from the old line '/' to the upstream form, warning on reset",
    (host) => {
      writeConfigWithBase(root, '/')
      // T35: --host cloudflare-pages needs --origin.
      const res = runForkInit(
        parseForkInitArgs([
          '--author',
          'me',
          '--repo',
          'me/myfork',
          '--host',
          host,
          ...(host === 'cloudflare-pages' ? ['--origin', 'https://e.example'] : []),
        ]),
        { projectRoot: root },
      )
      const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
      expect(cfg).toContain(`const siteBase = process.env.SITE_BASE || '/'`)
      const warning = res.warnings.find((w) => w.includes('A9'))
      expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
      expect(warning).toContain(`const siteBase = '/'`)
      expect(warning).toContain(`const siteBase = process.env.SITE_BASE || '/'`)
    },
  )

  it.each(['github-pages', 'cloudflare-pages'])(
    '--host %s warns on an unparseable existing A9 value too (A9 is never parsed, only replaced)',
    (host) => {
      // A9's existing value is never parsed (traceability.md's stated exception) — only replaced —
      // so an unparseable value such as a bare number still triggers the same reset and warning.
      writeFileSync(
        join(root, '.vitepress/config.mts'),
        ['const siteBase = 42', '', 'export default {', "  title: 'x',", '  base: siteBase,', '}', ''].join('\n'),
      )
      // T35: --host cloudflare-pages needs --origin.
      const res = runForkInit(
        parseForkInitArgs([
          '--author',
          'me',
          '--repo',
          'me/myfork',
          '--host',
          host,
          ...(host === 'cloudflare-pages' ? ['--origin', 'https://e.example'] : []),
        ]),
        { projectRoot: root },
      )
      const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
      expect(cfg).toContain(`const siteBase = process.env.SITE_BASE || '/'`)
      expect(res.warnings.some((w) => w.includes('A9') && w.includes('const siteBase = 42'))).toBe(true)
    },
  )

  it.each(['github-pages', 'cloudflare-pages'])(
    '--host %s does not write or warn when A9 is already the upstream form',
    (host) => {
      // writeFixture's config already has the upstream A9 form.
      pinMtimes(root)
      const cfgBefore = readFileSync(join(root, '.vitepress/config.mts'))
      const mtimeBefore = statSync(join(root, '.vitepress/config.mts')).mtimeMs
      // the template and the workflow must still be usable for --host to reach the A9 branch at
      // all in a meaningful way; the shared fixture's template derives SITE_BASE and is installed
      // as-is, so this run is otherwise clean
      // T35: --host cloudflare-pages needs --origin.
      const res = runForkInit(
        parseForkInitArgs([
          '--author',
          'me',
          '--repo',
          'me/myfork',
          '--host',
          host,
          ...(host === 'cloudflare-pages' ? ['--origin', 'https://e.example'] : []),
        ]),
        { projectRoot: root },
      )
      expect(res.exitCode).toBe(0)
      expect(readFileSync(join(root, '.vitepress/config.mts'))).toEqual(cfgBefore)
      expect(statSync(join(root, '.vitepress/config.mts')).mtimeMs).toBe(mtimeBefore)
      expect(res.warnings.some((w) => w.includes('A9'))).toBe(false)
      expect(res.changedFiles).not.toContain('.vitepress/config.mts')
    },
  )

  // T18/T9 (A9 part)/T54/AC-H2/AC-A5/AC-E1: --host or --base on a config without exactly one A9
  // line and exactly one `  base: siteBase,` line is a tree error naming A9, with nothing written.
  const T18_SHAPES: Array<[string, string | null]> = [
    [
      'literal base: line (no A9)',
      ['export default {', "  base: '/wxl-platform/',", "  title: 'x',", '}', ''].join('\n'),
    ],
    [
      'env-conditional ?? line (no A9)',
      ['export default {', "  base: process.env.SITE_BASE ?? '/',", "  title: 'x',", '}', ''].join('\n'),
    ],
    ['no base line at all', ['export default {', "  title: 'x',", '}', ''].join('\n')],
    [
      'A9 present, no base: siteBase line',
      [`const siteBase = process.env.SITE_BASE || '/'`, '', 'export default {', "  title: 'x',", '}', ''].join('\n'),
    ],
    [
      'base: siteBase line present, no A9',
      ['export default {', "  title: 'x',", '  base: siteBase,', '}', ''].join('\n'),
    ],
    [
      'A9 two candidate lines',
      [
        `const siteBase = process.env.SITE_BASE || '/'`,
        `const siteBase = '/other/'`,
        '',
        'export default {',
        "  title: 'x',",
        '  base: siteBase,',
        '}',
        '',
      ].join('\n'),
    ],
    [
      'base: siteBase two candidate lines',
      [
        `const siteBase = process.env.SITE_BASE || '/'`,
        '',
        'export default {',
        "  title: 'x',",
        '  base: siteBase,',
        '  base: siteBase,',
        '}',
        '',
      ].join('\n'),
    ],
    [
      'indented const siteBase line (not a candidate — A9 requires column 0)',
      ['export default {', `  const siteBase = process.env.SITE_BASE || '/',`, "  title: 'x',", '  base: siteBase,', '}', ''].join(
        '\n',
      ),
    ],
    [
      'four-space-indented base: siteBase line (not the exact candidate)',
      [
        `const siteBase = process.env.SITE_BASE || '/'`,
        '',
        'export default {',
        "  title: 'x',",
        '    base: siteBase,',
        '}',
        '',
      ].join('\n'),
    ],
    ['config file does not exist', null],
  ]
  const T18_FLAGS: Array<[string, string[]]> = [
    ['--base /x/', ['--author', 'me', '--repo', 'me/myfork', '--base', '/x/']],
    ['--base none', ['--author', 'me', '--repo', 'me/myfork', '--base', 'none']],
    ['--host github-pages', ['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages']],
    // T35: --host cloudflare-pages needs --origin.
    [
      '--host cloudflare-pages',
      ['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--origin', 'https://e.example'],
    ],
    [
      '--rebrand acme --base /x/',
      ['--author', 'me', '--repo', 'me/myfork', '--rebrand', 'acme', '--base', '/x/'],
    ],
  ]
  for (const [shapeLabel, cfgBody] of T18_SHAPES) {
    for (const [flagLabel, argv] of T18_FLAGS) {
      it(`T18: ${shapeLabel} × ${flagLabel} -> exitCode 1 naming A9, nothing written`, () => {
        if (cfgBody === null) rmSync(join(root, '.vitepress/config.mts'))
        else writeFileSync(join(root, '.vitepress/config.mts'), cfgBody)
        pinMtimes(root)
        const before = snapshotTree(root)
        const res = runForkInit(parseForkInitArgs(argv), { projectRoot: root })
        expect(res.exitCode).toBe(1)
        expect(res.message).toContain('A9')
        expect(res.message).toContain('.vitepress/config.mts')
        expect(res.message).toContain(`const siteBase = process.env.SITE_BASE || '/'`)
        expect(res.message).toContain('base: siteBase')
        expect(res.message).toContain('https://github.com/BrowserLaboratory/wxl-platform')
        const after = snapshotTree(root)
        expect(after).toEqual(before)
        expect(existsSync(join(root, '.github/workflows/deploy.yml'))).toBe(false)
      })
    }
  }

  // T5/T18 (counterexample)/AC-A5: neither --base nor --host given -> A9 need not exist at all;
  // a legacy config is not an error, exitCode 0, the base line (if any) is unchanged.
  it.each(T18_SHAPES.filter(([label]) => label !== 'config file does not exist'))(
    'no --base and no --host: A9 need not exist (%s) -> exitCode 0, config unchanged',
    (_label, cfgBody) => {
      writeFileSync(join(root, '.vitepress/config.mts'), cfgBody as string)
      const before = readFileSync(join(root, '.vitepress/config.mts'))
      const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
      expect(res.exitCode).toBe(0)
      expect(readFileSync(join(root, '.vitepress/config.mts'))).toEqual(before)
    },
  )

  // The same counterexample, in rebrand mode — legacy A9 shapes are not an A9 error
  // there either; the config only gets today's slug swap, never an A9-related failure.
  it.each(T18_SHAPES.filter(([label]) => label !== 'config file does not exist'))(
    'no --base and no --host (rebrand): A9 need not exist (%s) -> exitCode 0, config gets only the slug swap',
    (_label, cfgBody) => {
      writeFileSync(join(root, '.vitepress/config.mts'), cfgBody as string)
      const before = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
      const res = runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
      expect(res.exitCode).toBe(0)
      const after = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
      // these shapes contain neither the upstream slug nor a sensitive key, so the slug swap is a
      // no-op and the config is byte-identical — never an A9 tree error.
      expect(after).toBe(before)
    },
  )

  // T11 (A9 part)/AC-A6: A9 and base: siteBase are recognised in a CRLF config as in an LF one;
  // the written line keeps CRLF, every other byte is unchanged.
  it.each([
    ['--base /x/', ['--author', 'me', '--repo', 'me/myfork', '--base', '/x/'], "const siteBase = '/x/'"],
    ['--host github-pages', ['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages'], `const siteBase = process.env.SITE_BASE || '/'`],
    // Rebrand mode's A9 handling is also CRLF-aware.
    ['--rebrand acme --base /x/', [...B_ARGS, '--base', '/x/'], "const siteBase = '/x/'"],
  ] as Array<[string, string[], string]>)('CRLF config: %s recognised and written CRLF; other lines unchanged', (_label, argv, expectedA9) => {
    const crlfCfg =
      `const siteBase = process.env.SITE_BASE || '/'\r\n` +
      '\r\n' +
      'export default {\r\n' +
      "  title: 'Web eXploitation Laboratory',\r\n" +
      '  base: siteBase,\r\n' +
      '}\r\n'
    writeFileSync(join(root, '.vitepress/config.mts'), crlfCfg)
    runForkInit(parseForkInitArgs(argv), { projectRoot: root })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain('\r\n')
    const lines = cfg.split('\n')
    // the A9 line's full content, not just its trailing \r
    expect(lines[0]).toBe(`${expectedA9}\r`)
    // every other line keeps its own CRLF ending and content, including the closing brace line
    expect(lines[1]).toBe('\r')
    expect(lines[2]).toBe('export default {\r')
    expect(lines[3]).toBe("  title: 'Web eXploitation Laboratory',\r")
    expect(lines[4]).toBe('  base: siteBase,\r')
    expect(lines[5]).toBe('}\r')
  })

  // T11/AC-A6: a CRLF config already in the upstream form, under --host, is recognised as such —
  // no write, no T82 warning (its old line, if it HAD warned, must not carry a literal \r either).
  it('CRLF config already upstream form under --host: no write, no T82 warning', () => {
    const crlfCfg =
      `const siteBase = process.env.SITE_BASE || '/'\r\n` + 'export default {\r\n' + '  base: siteBase,\r\n' + '}\r\n'
    writeFileSync(join(root, '.vitepress/config.mts'), crlfCfg)
    const before = readFileSync(join(root, '.vitepress/config.mts'))
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages']), {
      projectRoot: root,
    })
    expect(readFileSync(join(root, '.vitepress/config.mts'))).toEqual(before)
    expect(res.warnings.some((w) => w.includes('A9'))).toBe(false)
  })

  // A CRLF config whose A9 is a literal (not upstream's form) is reset under --host like
  // an LF one; the T82 warning quotes the old line WITHOUT a trailing \r (the warning text is not
  // itself a file line, so it must not carry the file's own line ending).
  it("CRLF config with a literal A9 under --host: reset, T82 warning does not contain \\r", () => {
    const crlfCfg = `const siteBase = '/x/'\r\n` + 'export default {\r\n' + '  base: siteBase,\r\n' + '}\r\n'
    writeFileSync(join(root, '.vitepress/config.mts'), crlfCfg)
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages']), {
      projectRoot: root,
    })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg.split('\n')[0]).toBe(`const siteBase = process.env.SITE_BASE || '/'\r`)
    const warning = res.warnings.find((w) => w.includes('A9'))
    expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
    expect(warning).not.toContain('\r')
  })
})

const GH_ARGS = ['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages']
// T35: --host cloudflare-pages needs --origin.
const CF_ARGS = ['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--origin', 'https://myfork.pages.dev']

// T22/AC-H3: --host github-pages handles each of the five workflow states.
describe('runForkInit — --host workflow states', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-host-workflow-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  const DEPLOY_REL = '.github/workflows/deploy.yml'
  const OTHER_WITH_DERIVE = CURRENT_TEMPLATE_LF.replace('name: Deploy', 'name: Deploy\n# an extra comment line')
  const OTHER_WITHOUT_DERIVE_CASES: Array<[string, string]> = [
    ['name: MyCustomDeploy', 'name: MyCustomDeploy\n'],
    [
      'literal SITE_BASE',
      'name: Deploy\njobs:\n  build:\n    steps:\n      - run: pnpm build\n        env:\n          SITE_BASE: /fixed/\n',
    ],
    ['literal SITE_BASE (upstream fixture, tests/unit/workflows/fixtures/upstream-deploy.yml)', UPSTREAM_DEPLOY_LITERAL_SITE_BASE],
    ['unparseable YAML', 'name: Deploy\njobs: [\n'],
    [
      'SITE_BASE missing trailing slash',
      'name: Deploy\njobs:\n  build:\n    steps:\n      - run: pnpm build\n        env:\n          SITE_BASE: ${{ steps.pages.outputs.base_path }}\n',
    ],
    [
      'run is not exactly pnpm build',
      'name: Deploy\njobs:\n  build:\n    steps:\n      - run: pnpm build --x\n        env:\n          SITE_BASE: ${{ steps.pages.outputs.base_path }}/\n',
    ],
    // A parseable but malformed workflow (a non-object `jobs`, a null job, non-iterable steps, a
    // null step) must be judged "does not derive SITE_BASE" without derivesSiteBase throwing.
    ['jobs is a number, not an object', 'name: Deploy\njobs: 5\n'],
    ['jobs is an array, not an object', 'name: Deploy\njobs: [~]\n'],
    ['jobs with a null job', 'name: Deploy\njobs:\n  build:\n'],
    ['steps not an array (number)', 'name: Deploy\njobs:\n  build:\n    steps: 5\n'],
    ['steps not an array (object)', 'name: Deploy\njobs:\n  build:\n    steps: { a: 1 }\n'],
    ['a null step', 'name: Deploy\njobs:\n  build:\n    steps:\n      - ~\n'],
    // Naive string comparison and the yaml-parsed result diverge on these shapes too —
    // the value only appears in a comment line (not the real env), and a `run: |` block scalar
    // carries a trailing newline so it never equals the literal `pnpm build` exactly.
    [
      'SITE_BASE only in a comment line',
      'name: Deploy\njobs:\n  build:\n    steps:\n      - run: pnpm build\n        # SITE_BASE: ${{ steps.pages.outputs.base_path }}/\n        env:\n          OTHER: x\n',
    ],
    [
      'run is a block scalar (run: |)',
      'name: Deploy\njobs:\n  build:\n    steps:\n      - run: |\n          pnpm build\n        env:\n          SITE_BASE: ${{ steps.pages.outputs.base_path }}/\n',
    ],
  ]
  // Divergent shapes that DO derive once YAML-parsed, even though a naive string
  // comparison against `run: pnpm build` would miss them.
  const OTHER_WITH_DERIVE_DIVERGENT_CASES: Array<[string, string]> = [
    [
      'quoted run',
      'name: Deploy\njobs:\n  build:\n    steps:\n      - run: "pnpm build"\n        env:\n          SITE_BASE: ${{ steps.pages.outputs.base_path }}/\n',
    ],
    [
      'flow-style env',
      'name: Deploy\njobs:\n  build:\n    steps:\n      - run: pnpm build\n        env: { SITE_BASE: "${{ steps.pages.outputs.base_path }}/" }\n',
    ],
  ]

  it('absent: installed, LF-normalised to the template output, with the tag-rule warning, listed in changedFiles', () => {
    const res = runForkInit(parseForkInitArgs(GH_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, DEPLOY_REL), 'utf8')).toBe(CURRENT_TEMPLATE_LF)
    expect(res.changedFiles).toContain(DEPLOY_REL)
    expect(res.warnings.some((w) => /Tag rule/i.test(w))).toBe(true)
  })

  // writeFixture already creates `.github/workflows/release.yml`, so the test above never
  // exercises the boundary where `.github` itself does not exist yet.
  it('absent (no .github directory at all): still installed, with the tag-rule warning', () => {
    rmSync(join(root, '.github'), { recursive: true, force: true })
    const res = runForkInit(parseForkInitArgs(GH_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, DEPLOY_REL), 'utf8')).toBe(CURRENT_TEMPLATE_LF)
    expect(res.changedFiles).toContain(DEPLOY_REL)
    expect(res.warnings.some((w) => /Tag rule/i.test(w))).toBe(true)
  })

  it.each([
    ['current template output (LF)', CURRENT_TEMPLATE_LF],
    ['current template output (CRLF)', CURRENT_TEMPLATE_LF.replace(/\n/g, '\r\n')],
  ])('%s: nothing written, no workflow warning', (_label, content) => {
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), content)
    const before = readFileSync(join(root, DEPLOY_REL))
    const res = runForkInit(parseForkInitArgs(GH_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, DEPLOY_REL))).toEqual(before)
    expect(res.changedFiles).not.toContain(DEPLOY_REL)
    expect(res.warnings.some((w) => w.includes(DEPLOY_REL))).toBe(false)
  })

  it.each([
    ['known old output (LF)', OLD_TEMPLATE_LF],
    ['known old output (CRLF)', OLD_TEMPLATE_LF.replace(/\n/g, '\r\n')],
  ])('%s: replaced by the current template output, warning containing replaced and the path', (_label, content) => {
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), content)
    const res = runForkInit(parseForkInitArgs(GH_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, DEPLOY_REL), 'utf8')).toBe(CURRENT_TEMPLATE_LF)
    expect(res.changedFiles).toContain(DEPLOY_REL)
    const warning = res.warnings.find((w) => w.includes('replaced'))
    expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
    expect(warning).toContain(DEPLOY_REL)
  })

  it('other that derives SITE_BASE: left untouched, warning containing left untouched and the path', () => {
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), OTHER_WITH_DERIVE)
    const res = runForkInit(parseForkInitArgs(GH_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, DEPLOY_REL), 'utf8')).toBe(OTHER_WITH_DERIVE)
    expect(res.changedFiles).not.toContain(DEPLOY_REL)
    const warning = res.warnings.find((w) => w.includes('left untouched'))
    expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
    expect(warning).toContain(DEPLOY_REL)
  })

  it.each(OTHER_WITH_DERIVE_DIVERGENT_CASES)(
    'other that derives SITE_BASE (%s, naive string match would miss it): left untouched, warning containing left untouched and the path',
    (_label, content) => {
      mkdirSync(join(root, '.github/workflows'), { recursive: true })
      writeFileSync(join(root, DEPLOY_REL), content)
      const res = runForkInit(parseForkInitArgs(GH_ARGS), { projectRoot: root })
      expect(res.exitCode).toBe(0)
      expect(readFileSync(join(root, DEPLOY_REL), 'utf8')).toBe(content)
      expect(res.changedFiles).not.toContain(DEPLOY_REL)
      const warning = res.warnings.find((w) => w.includes('left untouched'))
      expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
      expect(warning).toContain(DEPLOY_REL)
    },
  )

  it.each(OTHER_WITHOUT_DERIVE_CASES)(
    'other that does not derive SITE_BASE (%s): left untouched, warning with path, SITE_BASE and 404',
    (_label, content) => {
      mkdirSync(join(root, '.github/workflows'), { recursive: true })
      writeFileSync(join(root, DEPLOY_REL), content)
      const res = runForkInit(parseForkInitArgs(GH_ARGS), { projectRoot: root })
      expect(res.exitCode).toBe(0)
      expect(readFileSync(join(root, DEPLOY_REL), 'utf8')).toBe(content)
      expect(res.changedFiles).not.toContain(DEPLOY_REL)
      const warning = res.warnings.find((w) => w.includes('SITE_BASE') && w.includes('404'))
      expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
      expect(warning).toContain(DEPLOY_REL)
    },
  )
})

// T23/AC-H4: --host cloudflare-pages installs no workflow; current/old output is removed, any
// other is left, with no tag-rule warning in any state.
describe('runForkInit — --host cloudflare-pages workflow states', () => {
  let root: string
  const DEPLOY_REL = '.github/workflows/deploy.yml'
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-cf-workflow-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('absent: no file created, no workflow warning, not in changedFiles', () => {
    const res = runForkInit(parseForkInitArgs(CF_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(existsSync(join(root, DEPLOY_REL))).toBe(false)
    expect(res.changedFiles).not.toContain(DEPLOY_REL)
    expect(res.warnings.some((w) => w.includes(DEPLOY_REL))).toBe(false)
  })

  it.each([
    ['current template output (LF)', CURRENT_TEMPLATE_LF],
    ['current template output (CRLF)', CURRENT_TEMPLATE_LF.replace(/\n/g, '\r\n')],
    ['known old output (LF)', OLD_TEMPLATE_LF],
    ['known old output (CRLF)', OLD_TEMPLATE_LF.replace(/\n/g, '\r\n')],
  ])('%s: removed, listed in changedFiles, warning containing removed and the path', (_label, content) => {
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), content)
    const res = runForkInit(parseForkInitArgs(CF_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(existsSync(join(root, DEPLOY_REL))).toBe(false)
    expect(res.changedFiles).toContain(DEPLOY_REL)
    const warning = res.warnings.find((w) => w.includes('removed'))
    expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
    expect(warning).toContain(DEPLOY_REL)
    expect(res.warnings.some((w) => /Tag rule/i.test(w))).toBe(false)
  })

  it.each([
    ['has derive', CURRENT_TEMPLATE_LF.replace('name: Deploy', 'name: Deploy\n# an extra comment line')],
    ['no derive', 'name: MyCustomDeploy\n'],
  ])('other (%s): left untouched, warning containing left untouched and the path, no tag-rule warning', (_label, content) => {
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), content)
    const res = runForkInit(parseForkInitArgs(CF_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, DEPLOY_REL), 'utf8')).toBe(content)
    expect(res.changedFiles).not.toContain(DEPLOY_REL)
    const warning = res.warnings.find((w) => w.includes('left untouched'))
    expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
    expect(warning).toContain(DEPLOY_REL)
    expect(res.warnings.some((w) => /Tag rule/i.test(w))).toBe(false)
  })
})

// T24/T54/AC-H3/AC-E1: --host needs a usable template; the message names the template's path and
// upstream's URL, and nothing is written (A9 not reset, workflow not installed or removed).
describe('runForkInit — --host: unusable template', () => {
  let root: string
  const DEPLOY_REL = '.github/workflows/deploy.yml'
  const TEMPLATE_REL = 'scripts/templates/deploy.yml.template'
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-host-template-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  function assertNothingWritten(before: ReturnType<typeof snapshotTree>) {
    const after = snapshotTree(root)
    expect(after).toEqual(before)
  }

  it.each(['github-pages', 'cloudflare-pages'])('%s: template missing -> exitCode 1', (host) => {
    rmSync(join(root, TEMPLATE_REL))
    pinMtimes(root)
    const before = snapshotTree(root)
    // T35: --host cloudflare-pages needs --origin.
    const res = runForkInit(
      parseForkInitArgs([
        '--author',
        'me',
        '--repo',
        'me/myfork',
        '--host',
        host,
        ...(host === 'cloudflare-pages' ? ['--origin', 'https://e.example'] : []),
      ]),
      { projectRoot: root },
    )
    expect(res.exitCode).toBe(1)
    expect(res.message).toContain(TEMPLATE_REL)
    expect(res.message).toContain('https://github.com/BrowserLaboratory/wxl-platform')
    assertNothingWritten(before)
  })

  // The fixture's A9 already starts upstream and no deploy.yml exists, so a case where
  // A9 is still a literal (something T24 would otherwise reset) and a deploy.yml already matches
  // the current template (something CF would otherwise remove) makes the "nothing written"
  // assertion load-bearing rather than vacuous.
  it.each(['github-pages', 'cloudflare-pages'])(
    '%s: template missing, A9 a literal and a current-template deploy.yml already present -> exitCode 1, both unchanged',
    (host) => {
      writeConfigWithBase(root, '/x/')
      mkdirSync(join(root, '.github/workflows'), { recursive: true })
      writeFileSync(join(root, DEPLOY_REL), CURRENT_TEMPLATE_LF)
      rmSync(join(root, TEMPLATE_REL))
      pinMtimes(root)
      const before = snapshotTree(root)
      // T35: --host cloudflare-pages needs --origin.
      const res = runForkInit(
        parseForkInitArgs([
          '--author',
          'me',
          '--repo',
          'me/myfork',
          '--host',
          host,
          ...(host === 'cloudflare-pages' ? ['--origin', 'https://e.example'] : []),
        ]),
        { projectRoot: root },
      )
      expect(res.exitCode).toBe(1)
      assertNothingWritten(before)
    },
  )

  // Cloudflare's own workflow state is irrelevant: the template check (T24) happens before either
  // host's workflow handling, so a missing template errors even with no existing workflow to act on.
  it('cloudflare-pages: template missing and workflow also absent -> exitCode 1', () => {
    rmSync(join(root, TEMPLATE_REL))
    pinMtimes(root)
    const before = snapshotTree(root)
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--origin', 'https://e.example']), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(1)
    expect(res.message).toContain(TEMPLATE_REL)
    assertNothingWritten(before)
  })

  it.each(['github-pages', 'cloudflare-pages'])(
    "%s: template's LF-normalised hash equals a known old output -> exitCode 1",
    (host) => {
      writeFileSync(join(root, TEMPLATE_REL), OLD_TEMPLATE_LF)
      pinMtimes(root)
      const before = snapshotTree(root)
      // T35: --host cloudflare-pages needs --origin.
      const res = runForkInit(
        parseForkInitArgs([
          '--author',
          'me',
          '--repo',
          'me/myfork',
          '--host',
          host,
          ...(host === 'cloudflare-pages' ? ['--origin', 'https://e.example'] : []),
        ]),
        { projectRoot: root },
      )
      expect(res.exitCode).toBe(1)
      expect(res.message).toContain(TEMPLATE_REL)
      expect(res.message).toContain('https://github.com/BrowserLaboratory/wxl-platform')
      assertNothingWritten(before)
    },
  )

  it.each(['github-pages', 'cloudflare-pages'])(
    '%s: template is a known old output (CRLF) -> exitCode 1',
    (host) => {
      writeFileSync(join(root, TEMPLATE_REL), OLD_TEMPLATE_LF.replace(/\n/g, '\r\n'))
      pinMtimes(root)
      const before = snapshotTree(root)
      // T35: --host cloudflare-pages needs --origin.
      const res = runForkInit(
        parseForkInitArgs([
          '--author',
          'me',
          '--repo',
          'me/myfork',
          '--host',
          host,
          ...(host === 'cloudflare-pages' ? ['--origin', 'https://e.example'] : []),
        ]),
        { projectRoot: root },
      )
      expect(res.exitCode).toBe(1)
      assertNothingWritten(before)
    },
  )

  it('github-pages: template does not derive SITE_BASE -> exitCode 1', () => {
    writeFileSync(join(root, TEMPLATE_REL), 'name: Deploy\njobs: {}\n')
    pinMtimes(root)
    const before = snapshotTree(root)
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages']), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(1)
    expect(res.message).toContain(TEMPLATE_REL)
    expect(res.message).toContain('https://github.com/BrowserLaboratory/wxl-platform')
    assertNothingWritten(before)
  })

  // Counterexample: cloudflare-pages does not require the template to derive SITE_BASE.
  it('cloudflare-pages: a template that does not derive SITE_BASE is still fine -> exitCode 0', () => {
    writeFileSync(join(root, TEMPLATE_REL), 'name: Deploy\njobs: {}\n')
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--origin', 'https://e.example']), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(0)
  })
})

// T25/AC-H5: without --host, today's workflow behaviour stands, compared LF-normalised.
describe('runForkInit — no --host workflow', () => {
  let root: string
  const DEPLOY_REL = '.github/workflows/deploy.yml'
  const TEMPLATE_REL = 'scripts/templates/deploy.yml.template'
  const ANCHOR_ARGS = ['--author', 'me', '--repo', 'me/myfork']
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-no-host-workflow-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('absent: installs the LF-normalised template (CRLF template installs as LF), with the tag-rule warning', () => {
    writeFileSync(join(root, TEMPLATE_REL), CURRENT_TEMPLATE_LF.replace(/\n/g, '\r\n'))
    const res = runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, DEPLOY_REL), 'utf8')).toBe(CURRENT_TEMPLATE_LF)
    expect(res.warnings.some((w) => /Tag rule/i.test(w))).toBe(true)
  })

  it('a prior --host cloudflare-pages run removed it: a later run without --host reinstalls, with the tag-rule warning', () => {
    runForkInit(parseForkInitArgs(CF_ARGS), { projectRoot: root })
    expect(existsSync(join(root, DEPLOY_REL))).toBe(false)
    const res = runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, DEPLOY_REL), 'utf8')).toBe(CURRENT_TEMPLATE_LF)
    expect(res.warnings.some((w) => /Tag rule/i.test(w))).toBe(true)
  })

  it('CRLF current template output: left untouched, no warning', () => {
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), CURRENT_TEMPLATE_LF.replace(/\n/g, '\r\n'))
    const before = readFileSync(join(root, DEPLOY_REL))
    const res = runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, DEPLOY_REL))).toEqual(before)
    expect(res.changedFiles).not.toContain(DEPLOY_REL)
    expect(res.warnings.some((w) => w.includes(DEPLOY_REL))).toBe(false)
  })

  it("known old output: not replaced, today's already-exists warning", () => {
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), OLD_TEMPLATE_LF)
    const res = runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, DEPLOY_REL), 'utf8')).toBe(OLD_TEMPLATE_LF)
    expect(res.changedFiles).not.toContain(DEPLOY_REL)
    expect(res.warnings.some((w) => w.includes('already exists with different content'))).toBe(true)
  })

  it('template missing, workflow absent: nothing installed, warning containing the template path', () => {
    rmSync(join(root, TEMPLATE_REL))
    const res = runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(existsSync(join(root, DEPLOY_REL))).toBe(false)
    expect(res.warnings.some((w) => w.includes(TEMPLATE_REL))).toBe(true)
  })

  it('template missing, workflow present: byte-identical, warning containing the template path', () => {
    rmSync(join(root, TEMPLATE_REL))
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), 'name: SomePreexisting\n')
    const before = readFileSync(join(root, DEPLOY_REL))
    const res = runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, DEPLOY_REL))).toEqual(before)
    expect(res.warnings.some((w) => w.includes(TEMPLATE_REL))).toBe(true)
  })
})

// T26/AC-H5: without --host, when A9 ends this run in the upstream form and the workflow exists
// but does not derive SITE_BASE, warn naming the path, SITE_BASE, 404 and --host github-pages.
describe('runForkInit — no --host: SITE_BASE 404 warning (T26)', () => {
  const DEPLOY_REL = '.github/workflows/deploy.yml'
  const NO_DERIVE_WORKFLOW = 'name: MyCustomDeploy\n'

  for (const mode of [
    { label: 'anchor', args: ['--author', 'me', '--repo', 'me/myfork'] },
    { label: 'rebrand', args: B_ARGS },
  ] as const) {
    it(`warns (${mode.label}): an existing workflow that does not derive SITE_BASE, A9 already upstream`, () => {
      const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-'))
      writeFixture(root)
      mkdirSync(join(root, '.github/workflows'), { recursive: true })
      writeFileSync(join(root, DEPLOY_REL), NO_DERIVE_WORKFLOW)
      const res = runForkInit(parseForkInitArgs(mode.args), { projectRoot: root })
      const warning = res.warnings.find((w) => w.includes(DEPLOY_REL) && w.includes('SITE_BASE') && w.includes('404'))
      expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
      expect(warning).toContain('--host github-pages')
      rmSync(root, { recursive: true, force: true })
    })

    it(`warns (${mode.label}): just-installed non-deriving template, A9 already upstream`, () => {
      const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-install-'))
      writeFixture(root)
      writeFileSync(join(root, 'scripts/templates/deploy.yml.template'), NO_DERIVE_WORKFLOW)
      const res = runForkInit(parseForkInitArgs(mode.args), { projectRoot: root })
      const warning = res.warnings.find((w) => w.includes(DEPLOY_REL) && w.includes('SITE_BASE') && w.includes('404'))
      expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
      rmSync(root, { recursive: true, force: true })
    })

    it(`warns (${mode.label}): a known-old (non-deriving) workflow output, A9 already upstream`, () => {
      const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-old-'))
      writeFixture(root)
      mkdirSync(join(root, '.github/workflows'), { recursive: true })
      writeFileSync(join(root, DEPLOY_REL), OLD_TEMPLATE_LF)
      const res = runForkInit(parseForkInitArgs(mode.args), { projectRoot: root })
      const warning = res.warnings.find((w) => w.includes(DEPLOY_REL) && w.includes('SITE_BASE') && w.includes('404'))
      expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
      rmSync(root, { recursive: true, force: true })
    })

    it(`does not warn (${mode.label}): --base /x/ given (A9 ends a literal, never upstream)`, () => {
      const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-nowarn-base-'))
      writeFixture(root)
      mkdirSync(join(root, '.github/workflows'), { recursive: true })
      writeFileSync(join(root, DEPLOY_REL), NO_DERIVE_WORKFLOW)
      const res = runForkInit(parseForkInitArgs([...mode.args, '--base', '/x/']), { projectRoot: root })
      expect(res.warnings.some((w) => w.includes(DEPLOY_REL) && w.includes('404'))).toBe(false)
      rmSync(root, { recursive: true, force: true })
    })

    it(`does not warn (${mode.label}): --base none given ('/' does not count as upstream form)`, () => {
      const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-nowarn-none-'))
      writeFixture(root)
      mkdirSync(join(root, '.github/workflows'), { recursive: true })
      writeFileSync(join(root, DEPLOY_REL), NO_DERIVE_WORKFLOW)
      const res = runForkInit(parseForkInitArgs([...mode.args, '--base', 'none']), { projectRoot: root })
      expect(res.warnings.some((w) => w.includes(DEPLOY_REL) && w.includes('404'))).toBe(false)
      rmSync(root, { recursive: true, force: true })
    })
  }

  // Rebrand mode with the template removed takes the walk's untransformed path for
  // deploy.yml (finalDeployRaw falls back to the pre-swap existingDeploy, fork-init.ts's own
  // comment on this path) — still warns correctly when that leftover workflow does not derive
  // SITE_BASE.
  it('warns (rebrand): template missing but a leftover non-deriving deploy.yml remains, A9 already upstream', () => {
    const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-rebrand-no-template-'))
    writeFixture(root)
    rmSync(join(root, 'scripts/templates/deploy.yml.template'))
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), NO_DERIVE_WORKFLOW)
    const res = runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    const warning = res.warnings.find((w) => w.includes(DEPLOY_REL) && w.includes('SITE_BASE') && w.includes('404'))
    expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
    expect(warning).toContain('--host github-pages')
    rmSync(root, { recursive: true, force: true })
  })

  it('warns: the upstream fixture literal-SITE_BASE shape does not derive SITE_BASE, A9 already upstream', () => {
    const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-literal-fixture-'))
    writeFixture(root)
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), UPSTREAM_DEPLOY_LITERAL_SITE_BASE)
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    const warning = res.warnings.find((w) => w.includes(DEPLOY_REL) && w.includes('SITE_BASE') && w.includes('404'))
    expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
    rmSync(root, { recursive: true, force: true })
  })

  it('warns: a run: | block scalar workflow (naive match would miss it) does not derive SITE_BASE, A9 already upstream', () => {
    const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-blockscalar-'))
    writeFixture(root)
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(
      join(root, DEPLOY_REL),
      'name: Deploy\njobs:\n  build:\n    steps:\n      - run: |\n          pnpm build\n        env:\n          SITE_BASE: ${{ steps.pages.outputs.base_path }}/\n',
    )
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    const warning = res.warnings.find((w) => w.includes(DEPLOY_REL) && w.includes('SITE_BASE') && w.includes('404'))
    expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
    rmSync(root, { recursive: true, force: true })
  })

  it.each([
    ['a null job', 'name: Deploy\njobs:\n  build:\n'],
    ['non-iterable steps', 'name: Deploy\njobs:\n  build:\n    steps: 5\n'],
  ])('warns: a malformed workflow (%s) does not derive SITE_BASE, A9 already upstream', (_label, workflow) => {
    const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-malformed-'))
    writeFixture(root)
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), workflow)
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    const warning = res.warnings.find((w) => w.includes(DEPLOY_REL) && w.includes('SITE_BASE') && w.includes('404'))
    expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
    rmSync(root, { recursive: true, force: true })
  })

  it('warns: SITE_BASE only in a comment line (naive string match would miss the real value) does not derive SITE_BASE, A9 already upstream', () => {
    const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-comment-'))
    writeFixture(root)
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(
      join(root, DEPLOY_REL),
      'name: Deploy\njobs:\n  build:\n    steps:\n      - run: pnpm build\n        # SITE_BASE: ${{ steps.pages.outputs.base_path }}/\n        env:\n          OTHER: x\n',
    )
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    const warning = res.warnings.find((w) => w.includes(DEPLOY_REL) && w.includes('SITE_BASE') && w.includes('404'))
    expect(warning, JSON.stringify(res.warnings)).toBeTruthy()
    rmSync(root, { recursive: true, force: true })
  })

  it.each([
    [
      'quoted run',
      'name: Deploy\njobs:\n  build:\n    steps:\n      - run: "pnpm build"\n        env:\n          SITE_BASE: ${{ steps.pages.outputs.base_path }}/\n',
    ],
    [
      'flow-style env',
      'name: Deploy\njobs:\n  build:\n    steps:\n      - run: pnpm build\n        env: { SITE_BASE: "${{ steps.pages.outputs.base_path }}/" }\n',
    ],
  ])('does not warn: a divergent shape that still derives SITE_BASE (%s, naive string match would miss it)', (_label, workflow) => {
    const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-derives-divergent-'))
    writeFixture(root)
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), workflow)
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    expect(res.warnings.some((w) => w.includes(DEPLOY_REL) && w.includes('404'))).toBe(false)
    rmSync(root, { recursive: true, force: true })
  })

  it('does not warn: A9 was already a literal (not upstream) to begin with', () => {
    const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-literal-'))
    writeFixture(root)
    writeConfigWithBase(root, '/x/')
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), NO_DERIVE_WORKFLOW)
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    expect(res.warnings.some((w) => w.includes(DEPLOY_REL) && w.includes('404'))).toBe(false)
    rmSync(root, { recursive: true, force: true })
  })

  it('does not warn: workflow derives SITE_BASE', () => {
    const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-derives-'))
    writeFixture(root)
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    expect(res.warnings.some((w) => w.includes(DEPLOY_REL) && w.includes('404'))).toBe(false)
    rmSync(root, { recursive: true, force: true })
  })

  it('does not warn: workflow does not exist', () => {
    const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-noworkflow-'))
    writeFixture(root)
    rmSync(join(root, 'scripts/templates/deploy.yml.template'))
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    expect(res.warnings.some((w) => w.includes(DEPLOY_REL) && w.includes('404'))).toBe(false)
    rmSync(root, { recursive: true, force: true })
  })

  it('does not warn: config has no A9 at all', () => {
    const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-noa9-'))
    writeFixture(root)
    writeFileSync(
      join(root, '.vitepress/config.mts'),
      ['export default {', "  title: 'x',", '}', ''].join('\n'),
    )
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), NO_DERIVE_WORKFLOW)
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    expect(res.warnings.some((w) => w.includes(DEPLOY_REL) && w.includes('404'))).toBe(false)
    rmSync(root, { recursive: true, force: true })
  })

  it('does not warn: --host given', () => {
    const root = mkdtempSync(join(tmpdir(), 'fork-init-t26-host-'))
    writeFixture(root)
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, DEPLOY_REL), NO_DERIVE_WORKFLOW)
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--origin', 'https://e.example']), {
      projectRoot: root,
    })
    expect(res.warnings.some((w) => w.includes(DEPLOY_REL) && w.includes('404'))).toBe(false)
    rmSync(root, { recursive: true, force: true })
  })
})

// T1, T2, T11 (doc portion): A2–A5 replace every occurrence of their form, whatever repository
// slug it held; a form with no occurrence, or a missing file, warns and the run continues; CRLF
// files are recognised as LF ones and keep their own line endings.
describe('runForkInit — anchor mode: doc anchors', () => {
  let root: string
  const ANCHOR_ARGS = ['--author', 'me', '--repo', 'me/myfork'] // no --base: Notes 1

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-doc-anchors-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it.each([
    ['upstream', 'BrowserLaboratory/wxl-platform'],
    ["the range's earlier slug", 'old-owner/old.range_1'],
    ['already the new slug', 'me/myfork'],
  ])('A2: both badge occurrences carry the new slug, other bytes unchanged (%s)', (_label, oldSlug) => {
    const body =
      `[![Quality Gates](https://github.com/${oldSlug}/actions/workflows/quality-gates.yml/badge.svg)]` +
      `(https://github.com/${oldSlug}/actions/workflows/quality-gates.yml)\n`
    writeFileSync(join(root, 'README.md'), body)
    writeFileSync(join(root, 'README.en.md'), body)
    pinMtimes(root)
    const beforeMtime = statSync(join(root, 'README.md')).mtimeMs
    const res = runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    const expected =
      '[![Quality Gates](https://github.com/me/myfork/actions/workflows/quality-gates.yml/badge.svg)]' +
      '(https://github.com/me/myfork/actions/workflows/quality-gates.yml)\n'
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe(expected)
    expect(readFileSync(join(root, 'README.en.md'), 'utf8')).toBe(expected)
    if (oldSlug === 'me/myfork') {
      // already the new slug: no write, mtime unchanged, not in changedFiles
      expect(statSync(join(root, 'README.md')).mtimeMs).toBe(beforeMtime)
      expect(res.changedFiles).not.toContain('README.md')
    } else {
      expect(res.changedFiles).toContain('README.md')
    }
  })

  it('A2: an owner outside the wildcard (underscore, leading dash) is not an occurrence', () => {
    const body =
      '[![QG](https://github.com/bad_owner/n/actions/workflows/quality-gates.yml/badge.svg)]' +
      '(https://github.com/bad_owner/n/actions/workflows/quality-gates.yml)\n' +
      '[![QG](https://github.com/-x/n/actions/workflows/quality-gates.yml/badge.svg)]' +
      '(https://github.com/-x/n/actions/workflows/quality-gates.yml)\n'
    writeFileSync(join(root, 'README.md'), body)
    runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe(body)
  })

  it('A3: the clone line carries the new slug at end of line; a dotted name backtracks past its own .git', () => {
    const line = 'git clone https://github.com/old-owner/old.range.git\n'
    writeFileSync(join(root, 'README.md'), line)
    writeFileSync(join(root, 'README.en.md'), line)
    runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe('git clone https://github.com/me/myfork.git\n')
    expect(readFileSync(join(root, 'README.en.md'), 'utf8')).toBe('git clone https://github.com/me/myfork.git\n')
  })

  it('A3: trailing text or trailing white space after the form is not an occurrence', () => {
    const body =
      'git clone https://github.com/old-owner/old-name.git mydir\n' +
      'git clone https://github.com/old-owner/old-name.git  \n'
    writeFileSync(join(root, 'README.md'), body)
    runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe(body)
  })

  it('A3: the end of the file counts as an end of the line (no trailing newline)', () => {
    writeFileSync(join(root, 'README.md'), 'git clone https://github.com/old-owner/old-name.git')
    runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe('git clone https://github.com/me/myfork.git')
  })

  it('A4: leading indentation (three spaces, a tab, none) before the form is still an occurrence', () => {
    const body =
      '   git remote add upstream https://github.com/old-owner/old-name.git\n' +
      '\tgit remote add upstream https://github.com/old-owner/old-name.git\n' +
      'git remote add upstream https://github.com/old-owner/old-name.git\n'
    writeFileSync(join(root, 'CONTRIBUTE.md'), body)
    runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(readFileSync(join(root, 'CONTRIBUTE.md'), 'utf8')).toBe(
      '   git remote add upstream https://github.com/me/myfork.git\n' +
        '\tgit remote add upstream https://github.com/me/myfork.git\n' +
        'git remote add upstream https://github.com/me/myfork.git\n',
    )
  })

  it('A5: the Markdown-link form (parentheses included) carries the new slug; a bare URL or an extra path segment does not match', () => {
    const body =
      '[GitHub Issues](https://github.com/old-owner/old-name/issues)\n' +
      'https://github.com/old-owner/old-name/issues\n' +
      '(https://github.com/old-owner/old-name/issues/12)\n' +
      '(https://github.com/old-owner/old-name/issues/new)\n'
    writeFileSync(join(root, 'CONTRIBUTE.md'), body)
    runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    const after = readFileSync(join(root, 'CONTRIBUTE.md'), 'utf8')
    expect(after).toContain('[GitHub Issues](https://github.com/me/myfork/issues)')
    expect(after).toContain('https://github.com/old-owner/old-name/issues\n')
    expect(after).toContain('(https://github.com/old-owner/old-name/issues/12)')
    expect(after).toContain('(https://github.com/old-owner/old-name/issues/new)')
  })

  it('a file mixing several forms and several old slugs: every occurrence becomes the new slug, every other byte is unchanged (hand-built expectation)', () => {
    const before =
      'Prose mentioning BrowserLaboratory/wxl-platform directly.\n' +
      'See https://github.com/BrowserLaboratory/wxl-platform/pulls for open PRs.\n' +
      '[![Release](https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/release.yml/badge.svg)]' +
      '(https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/release.yml)\n' +
      '[![Quality Gates](https://github.com/old-owner/old.range_1/actions/workflows/quality-gates.yml/badge.svg)]' +
      '(https://github.com/old-owner/old.range_1/actions/workflows/quality-gates.yml)\n' +
      'git clone https://github.com/me/myfork.git\n' +
      '中文內容不受影響。\n'
    writeFileSync(join(root, 'README.md'), before)
    runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    const expected =
      'Prose mentioning BrowserLaboratory/wxl-platform directly.\n' +
      'See https://github.com/BrowserLaboratory/wxl-platform/pulls for open PRs.\n' +
      '[![Release](https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/release.yml/badge.svg)]' +
      '(https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/release.yml)\n' +
      '[![Quality Gates](https://github.com/me/myfork/actions/workflows/quality-gates.yml/badge.svg)]' +
      '(https://github.com/me/myfork/actions/workflows/quality-gates.yml)\n' +
      'git clone https://github.com/me/myfork.git\n' +
      '中文內容不受影響。\n'
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe(expected)
  })

  // item 7(i): only the targeted anchor's own form is removed from its file — the file's OTHER
  // anchor form is left in place, so this run also proves that anchor, and the unrelated
  // manifest, are still rewritten in the very same run that warns.
  it.each([
    ['A2', 'README.md'],
    ['A2', 'README.en.md'],
    ['A3', 'README.md'],
    ['A3', 'README.en.md'],
    ['A4', 'CONTRIBUTE.md'],
    ['A5', 'CONTRIBUTE.md'],
  ] as const)(
    "%s: a file present with no occurrence of its form warns with the anchor id and path; the file's other anchor and the manifest are still rewritten",
    (anchorId, file) => {
      if (file === 'README.md' || file === 'README.en.md') {
        // the shared fixture's README body carries A2 (badge, two occurrences) and A3 (the clone
        // line); keep whichever form is NOT the one under test.
        const body =
          anchorId === 'A2'
            ? 'git clone https://github.com/BrowserLaboratory/wxl-platform.git\n' // A3 only
            : '[![Quality Gates](https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/quality-gates.yml/badge.svg)]' +
              '(https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/quality-gates.yml)\n' // A2 only
        writeFileSync(join(root, file), body)
      } else {
        // CONTRIBUTE.md carries A4 (remote-add) and A5 (the issues link); keep the other one.
        const body =
          anchorId === 'A4'
            ? 'Found a bug? Open a [GitHub Issues](https://github.com/BrowserLaboratory/wxl-platform/issues) entry.\n' // A5 only
            : 'git remote add upstream https://github.com/BrowserLaboratory/wxl-platform.git\n' // A4 only
        writeFileSync(join(root, file), body)
      }
      const res = runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
      expect(res.exitCode).toBe(0)
      expect(res.warnings.some((w) => w.includes(anchorId) && w.includes(file))).toBe(true)
      // the file's OTHER anchor form was still rewritten in this same run
      const after = readFileSync(join(root, file), 'utf8')
      expect(after).toContain('me/myfork')
      expect(after).not.toContain('BrowserLaboratory/wxl-platform')
      expect(res.changedFiles).toContain(file)
      // the manifest, unrelated to any doc anchor, is still rewritten in this same run
      const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
      expect(pkg.repository.url).toBe('git+https://github.com/me/myfork.git')
      expect(res.changedFiles).toContain('package.json')
    },
  )

  it.each([
    ['A2', 'README.md'],
    ['A2', 'README.en.md'],
    ['A3', 'README.md'],
    ['A3', 'README.en.md'],
    ['A4', 'CONTRIBUTE.md'],
    ['A5', 'CONTRIBUTE.md'],
  ] as const)('%s: a missing file warns with the anchor id and path; the run continues', (anchorId, file) => {
    rmSync(join(root, 'README.md'), { force: true })
    rmSync(join(root, 'README.en.md'), { force: true })
    rmSync(join(root, 'CONTRIBUTE.md'), { force: true })
    const res = runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(res.warnings.some((w) => w.includes(anchorId) && w.includes(file))).toBe(true)
    // the run continues: the manifest is still written despite the missing doc files
    expect(res.changedFiles).toContain('package.json')
  })

  it('a missing README.md produces one warning each for A2 and A3, not for README.en.md', () => {
    rmSync(join(root, 'README.md'))
    const res = runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    const a2 = res.warnings.filter((w) => w.includes('A2') && w.includes('README.md') && !w.includes('README.en.md'))
    const a3 = res.warnings.filter((w) => w.includes('A3') && w.includes('README.md') && !w.includes('README.en.md'))
    expect(a2).toHaveLength(1)
    expect(a3).toHaveLength(1)
  })

  it('a doc-anchor warning never mentions github-pages or deploy.yml (Notes 7)', () => {
    writeFileSync(join(root, 'README.md'), 'no anchors here\n')
    const res = runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    const docWarnings = res.warnings.filter((w) => /^A[2-5]:/.test(w))
    expect(docWarnings.length).toBeGreaterThan(0)
    for (const w of docWarnings) {
      expect(w).not.toContain('github-pages')
      expect(w).not.toContain('deploy.yml')
    }
  })

  it('CRLF: A3 (README) and A4 (CONTRIBUTE) recognise the form before a CRLF line ending; each line keeps its own ending', () => {
    const body =
      'git clone https://github.com/old-owner/old-name.git\r\n' +
      'git remote add upstream https://github.com/old-owner/old-name.git\r\n' +
      'an LF-only note stays LF\n'
    writeFileSync(join(root, 'README.md'), body)
    writeFileSync(join(root, 'CONTRIBUTE.md'), body)
    runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    // README.md: only A3 is checked there, so the A4-shaped second line is untouched
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe(
      'git clone https://github.com/me/myfork.git\r\n' +
        'git remote add upstream https://github.com/old-owner/old-name.git\r\n' +
        'an LF-only note stays LF\n',
    )
    // CONTRIBUTE.md: only A4 is checked there, so the A3-shaped first line is untouched
    expect(readFileSync(join(root, 'CONTRIBUTE.md'), 'utf8')).toBe(
      'git clone https://github.com/old-owner/old-name.git\r\n' +
        'git remote add upstream https://github.com/me/myfork.git\r\n' +
        'an LF-only note stays LF\n',
    )
  })

  it('CRLF: A2 and A5 (no end-of-line requirement) are recognised the same way in a CRLF file', () => {
    const readmeBody =
      '[![QG](https://github.com/old-owner/old-name/actions/workflows/quality-gates.yml/badge.svg)]' +
      '(https://github.com/old-owner/old-name/actions/workflows/quality-gates.yml)\r\n'
    const contribBody = '[GitHub Issues](https://github.com/old-owner/old-name/issues)\r\n'
    writeFileSync(join(root, 'README.md'), readmeBody)
    writeFileSync(join(root, 'CONTRIBUTE.md'), contribBody)
    runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe(
      '[![QG](https://github.com/me/myfork/actions/workflows/quality-gates.yml/badge.svg)]' +
        '(https://github.com/me/myfork/actions/workflows/quality-gates.yml)\r\n',
    )
    expect(readFileSync(join(root, 'CONTRIBUTE.md'), 'utf8')).toBe('[GitHub Issues](https://github.com/me/myfork/issues)\r\n')
  })

  // item 7(h): A4 gets the same trailing-text / trailing-white-space boundary A3 already had.
  it('A4: trailing text or trailing white space after the form is not an occurrence', () => {
    const body =
      'git remote add upstream https://github.com/old-owner/old-name.git extra\n' +
      'git remote add upstream https://github.com/old-owner/old-name.git  \n'
    writeFileSync(join(root, 'CONTRIBUTE.md'), body)
    runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(readFileSync(join(root, 'CONTRIBUTE.md'), 'utf8')).toBe(body)
  })

  // item 7(h): A3's trailing-text/white-space and end-of-file cases, previously only exercised on
  // README.md, also hold on README.en.md.
  it('A3: trailing text/white space and end-of-file cases hold for both README.md and README.en.md', () => {
    const trailingBody =
      'git clone https://github.com/old-owner/old-name.git mydir\n' +
      'git clone https://github.com/old-owner/old-name.git  \n'
    const eofBody = 'git clone https://github.com/old-owner/old-name.git'
    writeFileSync(join(root, 'README.md'), trailingBody)
    writeFileSync(join(root, 'README.en.md'), eofBody)
    runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe(trailingBody)
    expect(readFileSync(join(root, 'README.en.md'), 'utf8')).toBe('git clone https://github.com/me/myfork.git')
  })

  // item 5: doc-anchor files are read/written byte-preserving (latin1), so an invalid UTF-8 byte
  // outside any anchor form round-trips unchanged while the anchor form itself is still rewritten.
  it('round-trips an invalid UTF-8 byte outside any anchor form, byte for byte', () => {
    const prefix = Buffer.from('Prose with an invalid byte next: ', 'latin1')
    const invalidByte = Buffer.from([0xff]) // not valid UTF-8 in any context
    const middle = Buffer.from(' — rest of the line.\n', 'utf8')
    const anchorLine = Buffer.from('git clone https://github.com/old-owner/old-name.git\n', 'latin1')
    const before = Buffer.concat([prefix, invalidByte, middle, anchorLine])
    writeFileSync(join(root, 'README.md'), before)
    runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })
    const after = readFileSync(join(root, 'README.md'))
    const expectedProse = Buffer.concat([prefix, invalidByte, middle])
    expect(after.subarray(0, expectedProse.length).equals(expectedProse)).toBe(true)
    expect(after.toString('latin1')).toContain('git clone https://github.com/me/myfork.git\n')
  })

  // T2 governs only a missing doc-anchor file, not any other read failure: a path that is a
  // directory (EISDIR) is NOT a checked tree error — it throws, uncaught, before any write in
  // this run, the same as it did before this ticket's compute-before-write restructuring. Still
  // proves compute-before-write: the manifest (whose own write is deferred to the write phase)
  // stays unwritten, byte- and mtime-identical, because the throw happens before any write.
  it('a doc-anchor path that is a directory makes runForkInit throw before any write (the manifest stays unwritten)', () => {
    rmSync(join(root, 'README.md'))
    mkdirSync(join(root, 'README.md'))
    pinMtimes(root)
    const pkgBefore = readFileSync(join(root, 'package.json'))
    const pkgMtimeBefore = statSync(join(root, 'package.json')).mtimeMs
    expect(() => runForkInit(parseForkInitArgs(ANCHOR_ARGS), { projectRoot: root })).toThrow()
    expect(readFileSync(join(root, 'package.json'))).toEqual(pkgBefore)
    expect(statSync(join(root, 'package.json')).mtimeMs).toBe(pkgMtimeBefore)
    expect(existsSync(join(root, '.github/workflows/deploy.yml'))).toBe(false)
    for (const f of listFiles(root)) expect(f.endsWith('.fork-init-tmp')).toBe(false)
  })
})

// T3, T5: every file outside A1–A9 and the workflow is byte-identical; a code anchor whose value
// is not being set keeps its lines and need not exist.
describe('runForkInit — anchor mode: untouched files', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-untouched-'))
    writeFixture(root)
    // files outside the shared fixture's own anchor-bearing set, each holding an anchor FORM in a
    // file that is not one of A1–A9's own files — must not be touched (T3)
    mkdirSync(join(root, 'docs'), { recursive: true })
    writeFileSync(
      join(root, 'docs/README.md'),
      'git clone https://github.com/BrowserLaboratory/wxl-platform.git\n',
    )
    mkdirSync(join(root, 'platform/challenge/x'), { recursive: true })
    writeFileSync(
      join(root, 'platform/challenge/x/README.md'),
      'git clone https://github.com/BrowserLaboratory/wxl-platform.git\n',
    )
    writeFileSync(join(root, 'README.md.bak'), readFileSync(join(root, 'README.md')))
    writeFileSync(
      join(root, 'CHANGELOG.md'),
      'Found a bug? Open a [GitHub Issues](https://github.com/BrowserLaboratory/wxl-platform/issues) entry.\nSee https://github.com/BrowserLaboratory/wxl-platform/pull/9\n',
    )
    // item 7(c): a binary file (a NUL byte) and a CRLF non-anchor text file, both outside A1–A9
    // and the workflow — must stay byte- and mtime-identical, same as any other untouched file.
    mkdirSync(join(root, 'assets'), { recursive: true })
    writeFileSync(join(root, 'assets/logo.bin'), Buffer.from([0x00, 0x01, 0xff, 0x42]))
    writeFileSync(join(root, 'NOTES.crlf.md'), 'line one\r\nline two\r\n')
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('every file outside A1–A9 and the workflow is byte-identical; the after path set is the before set plus the installed workflow', () => {
    pinMtimes(root)
    const before = snapshotTree(root)
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    const after = snapshotTree(root)
    const untouchedRels = new Set([
      'package.json',
      'README.md',
      'README.en.md',
      'CONTRIBUTE.md',
      '.vitepress/config.mts',
      '.github/workflows/deploy.yml',
    ])
    for (const file of before) {
      if (untouchedRels.has(file.path)) continue
      const same = after.find((f) => f.path === file.path)
      expect(same, `${file.path} should still exist`).toEqual(file)
    }
    // item 7(c): the after path set is exactly the before set plus the newly installed workflow —
    // no file appears or disappears for any other reason (e.g. a stray temporary file).
    const beforePaths = new Set(before.map((f) => f.path))
    const afterPaths = new Set(after.map((f) => f.path))
    const expectedPaths = new Set([...beforePaths, '.github/workflows/deploy.yml'])
    expect(afterPaths).toEqual(expectedPaths)
    // item 7(c): the binary file and the CRLF text file specifically, byte- and mtime-checked.
    const binBefore = before.find((f) => f.path === 'assets/logo.bin')!
    const binAfter = after.find((f) => f.path === 'assets/logo.bin')!
    expect(binAfter).toEqual(binBefore)
    const crlfBefore = before.find((f) => f.path === 'NOTES.crlf.md')!
    const crlfAfter = after.find((f) => f.path === 'NOTES.crlf.md')!
    expect(crlfAfter).toEqual(crlfBefore)
    const allowed = new Set(['package.json', 'README.md', 'README.en.md', 'CONTRIBUTE.md', '.github/workflows/deploy.yml'])
    for (const f of res.changedFiles) expect(allowed.has(f), `unexpected changed file ${f}`).toBe(true)
    // a successful run on this fixture leaves no temporary file behind (a run that fails partway,
    // covered separately below, is not this scenario's concern)
    for (const f of listFiles(root)) expect(f.endsWith('.fork-init-tmp')).toBe(false)
  })

  it('a code anchor whose value is not being set keeps its lines and need not exist (no --site-name/--origin/--host/--base)', () => {
    pinMtimes(root)
    const cfgBefore = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    const beforeMtime = statSync(join(root, '.vitepress/config.mts')).mtimeMs
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, '.vitepress/config.mts'), 'utf8')).toBe(cfgBefore)
    expect(statSync(join(root, '.vitepress/config.mts')).mtimeMs).toBe(beforeMtime)
    expect(res.warnings.some((w) => /A6|A7|A8|A9/.test(w))).toBe(false)
  })

  it('A6 (unparsable), A7 (two candidate lines) and A8/A9 (file absent) all stay untouched when no flag sets them', () => {
    // A6: a title that is a variable, not a string literal — unparsable if it were ever set.
    writeFileSync(
      join(root, '.vitepress/config.mts'),
      ['export default {', '  title: siteTitle,', '  themeConfig: {},', '}', ''].join('\n'),
    )
    // A7: two candidate `  name: ...` lines inside the hero frontmatter.
    mkdirSync(join(root, 'platform'), { recursive: true })
    writeFileSync(
      join(root, 'platform/index.md'),
      ['---', 'hero:', '  name: |', '  name: WXL', '---', ''].join('\n'),
    )
    // platform/zh-TW/index.md (A7) and the short-link module (A8) are left absent entirely.
    // T-0015: the shared fixture now ships both (T60's fixture note) — removed here so this
    // test's own precondition (both files absent) still holds.
    rmSync(join(root, 'platform/zh-TW/index.md'), { force: true })
    rmSync(join(root, '.vitepress/challenge/shortLink.ts'), { force: true })
    const cfgBefore = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    const heroBefore = readFileSync(join(root, 'platform/index.md'), 'utf8')
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, '.vitepress/config.mts'), 'utf8')).toBe(cfgBefore)
    expect(readFileSync(join(root, 'platform/index.md'), 'utf8')).toBe(heroBefore)
    expect(existsSync(join(root, 'platform/zh-TW/index.md'))).toBe(false)
    expect(existsSync(join(root, '.vitepress/challenge/shortLink.ts'))).toBe(false)
  })
})

// T5 (item 7(d)): a dedicated fixture holding both home pages and the short-link module, across
// the three A9 config shapes (upstream form + `base: siteBase,`, the legacy `??` line, no base
// line) — none of A6–A9 is being set in this ticket (no --site-name/--origin/--host/--base), so
// every one of these files must stay byte- and mtime-identical, with no A6–A9 warning.
describe('runForkInit — anchor mode: T5 dedicated fixture (home pages, short-link module, A9 config shapes)', () => {
  function buildFixture(root: string, cfgBody: string) {
    writeFixture(root)
    writeFileSync(join(root, '.vitepress/config.mts'), cfgBody)
    mkdirSync(join(root, 'platform/zh-TW'), { recursive: true })
    const hero = ['---', 'hero:', '  name: WXL', '---', '', '# Home', ''].join('\n')
    writeFileSync(join(root, 'platform/index.md'), hero)
    writeFileSync(join(root, 'platform/zh-TW/index.md'), hero)
    mkdirSync(join(root, '.vitepress/challenge'), { recursive: true })
    writeFileSync(join(root, '.vitepress/challenge/shortLink.ts'), "export const SITE_ORIGIN = 'https://wxl.browserlab.online'\n")
  }

  const A9_FORM = [
    "const siteBase = process.env.SITE_BASE || '/'",
    '',
    'export default {',
    "  title: 'Web eXploitation Laboratory',",
    '  base: siteBase,',
    '  themeConfig: {',
    "    socialLinks: [{ icon: 'github', link: 'https://github.com/BrowserLaboratory/wxl-platform' }],",
    '  },',
    '}',
    '',
  ].join('\n')
  const LEGACY_QQ_FORM = [
    'export default {',
    "  title: 'Web eXploitation Laboratory',",
    "  base: process.env.SITE_BASE ?? '/',",
    '  themeConfig: {',
    "    socialLinks: [{ icon: 'github', link: 'https://github.com/BrowserLaboratory/wxl-platform' }],",
    '  },',
    '}',
    '',
  ].join('\n')
  const NO_BASE_LINE_FORM = [
    'export default {',
    "  title: 'Web eXploitation Laboratory',",
    '  themeConfig: {',
    "    socialLinks: [{ icon: 'github', link: 'https://github.com/BrowserLaboratory/wxl-platform' }],",
    '  },',
    '}',
    '',
  ].join('\n')

  it.each([
    ['the upstream A9 form plus `  base: siteBase,`', A9_FORM],
    ['the legacy `??` line', LEGACY_QQ_FORM],
    ['no base line', NO_BASE_LINE_FORM],
  ] as const)('config (%s), both home pages and the short-link module are byte- and mtime-unchanged; no A6–A9 warning, exitCode 0', (_label, cfgBody) => {
    const root = mkdtempSync(join(tmpdir(), 'fork-init-t5-dedicated-'))
    buildFixture(root, cfgBody)
    pinMtimes(root)
    const before = snapshotTree(root)
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    const after = snapshotTree(root)
    expect(res.exitCode).toBe(0)
    const untouchedRels = [
      '.vitepress/config.mts',
      'platform/index.md',
      'platform/zh-TW/index.md',
      '.vitepress/challenge/shortLink.ts',
    ]
    for (const rel of untouchedRels) {
      const b = before.find((f) => f.path === rel)!
      const a = after.find((f) => f.path === rel)!
      expect(a, rel).toEqual(b)
    }
    expect(res.warnings.some((w) => /A6|A7|A8|A9/.test(w))).toBe(false)
    rmSync(root, { recursive: true, force: true })
  })
})

// T4 (re-serialisation and fields outside A1), T11 (CRLF manifest), T14 (--name/--description
// trimming), T15 (version/license only on first conversion).
describe('runForkInit — anchor mode: manifest', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-anchor-manifest-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  const UPSTREAM_REPO = { type: 'git', url: 'git+https://github.com/BrowserLaboratory/wxl-platform.git' }

  it.each([
    ['four-space indent', (v: unknown) => JSON.stringify(v, null, 4)],
    ['tab indent', (v: unknown) => JSON.stringify(v, null, '\t')],
    ['single-line, no trailing newline', (v: unknown) => JSON.stringify(v)],
  ])('re-serialises the manifest as two-space JSON with a trailing LF newline (%s)', (_label, stringify) => {
    const raw = { name: 'x', version: '1.0.0', repository: UPSTREAM_REPO }
    writeManifest(root, stringify(raw))
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const after = readFileSync(join(root, 'package.json'), 'utf8')
    expect(after.endsWith('\n')).toBe(true)
    expect(after.endsWith('\n\n')).toBe(false)
    const lines = after.split('\n')
    expect(lines[1]).toMatch(/^ {2}"/)
  })

  it('keeps every field outside A1 unchanged (deep-equal): scripts, dependencies, nested objects, private', () => {
    const raw = {
      name: 'x',
      version: '1.0.0',
      private: true,
      scripts: { build: 'vitepress build', test: 'vitest' },
      dependencies: { vue: '^3.0.0' },
      nested: { a: { b: ['c', 1, null] } },
      repository: UPSTREAM_REPO,
    }
    writeManifest(root, JSON.stringify(raw, null, 2) + '\n')
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.private).toBe(true)
    expect(pkg.scripts).toEqual(raw.scripts)
    expect(pkg.dependencies).toEqual(raw.dependencies)
    expect(pkg.nested).toEqual(raw.nested)
  })

  // item 7(g): the raw manifest text itself holds the literal JSON escape `\u00e9` (the six
  // characters backslash, u, 0, 0, e, 9 — not the literal `é` character), so the comparison
  // genuinely exercises parse-then-compare, not raw bytes: a correct re-serialisation renders
  // that escape as the literal character, so the written-out bytes necessarily differ from the
  // input even though the value itself is unchanged.
  it('an escaped value is compared after parsing (deep-equal), not by raw bytes', () => {
    const raw =
      '{\n' +
      '  "name": "x",\n' +
      '  "version": "1.0.0",\n' +
      '  "note": "caf\\u00e9",\n' +
      '  "repository": { "type": "git", "url": "git+https://github.com/BrowserLaboratory/wxl-platform.git" }\n' +
      '}\n'
    expect(raw).toContain('caf\\u00e9')
    writeManifest(root, raw)
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const after = readFileSync(join(root, 'package.json'), 'utf8')
    expect(JSON.parse(after).note).toBe('café')
    expect(after).not.toBe(raw)
  })

  it('does not write the manifest when it already matches (standard form, every A1 field already correct)', () => {
    const raw = {
      name: 'wxl',
      version: '2.0.0', // NOT a first-conversion value — must survive untouched
      author: 'me',
      license: 'ECL-2.0',
      repository: { type: 'git', url: 'git+https://github.com/me/myfork.git' },
      bugs: { url: 'https://github.com/me/myfork/issues' },
      homepage: 'https://github.com/me/myfork#readme',
    }
    writeManifest(root, JSON.stringify(raw, null, 2) + '\n')
    pinMtimes(root)
    const before = statSync(join(root, 'package.json')).mtimeMs
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
    expect(res.changedFiles).not.toContain('package.json')
    expect(statSync(join(root, 'package.json')).mtimeMs).toBe(before)
  })

  it('CRLF manifest: all-CRLF stays CRLF; a first-line-LF (mixed) or a single-line (no newline) manifest outputs LF', () => {
    const base = { name: 'x', version: '1.0.0', repository: UPSTREAM_REPO }
    const allCrlf = JSON.stringify(base, null, 2).replace(/\n/g, '\r\n') + '\r\n'
    writeManifest(root, allCrlf)
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const afterCrlf = readFileSync(join(root, 'package.json'), 'utf8')
    expect(afterCrlf).toContain('\r\n')
    expect(afterCrlf.split('\n').every((l) => l === '' || l.endsWith('\r'))).toBe(true)

    const root2 = mkdtempSync(join(tmpdir(), 'fork-init-manifest-mixed-'))
    writeFixture(root2)
    const lines = JSON.stringify(base, null, 2).split('\n')
    const mixedFirstLf = lines[0] + '\n' + lines.slice(1).join('\r\n') + '\r\n'
    writeManifest(root2, mixedFirstLf)
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root2 })
    expect(readFileSync(join(root2, 'package.json'), 'utf8')).not.toContain('\r')
    rmSync(root2, { recursive: true, force: true })

    const root3 = mkdtempSync(join(tmpdir(), 'fork-init-manifest-nonewline-'))
    writeFixture(root3)
    writeManifest(root3, JSON.stringify(base)) // one line, no newline at all
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root3 })
    expect(readFileSync(join(root3, 'package.json'), 'utf8')).not.toContain('\r')
    rmSync(root3, { recursive: true, force: true })
  })

  it.each(['name', 'description'] as const)('--%s: trimmed when non-empty after trim; unchanged when empty after trim or not given', (flag) => {
    const values = ['  x  ', '\u3000x\u3000']
    for (const value of values) {
      const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', `--${flag}`, value]), { projectRoot: root })
      expect(res.exitCode).toBe(0)
      expect(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))[flag]).toBe('x')
    }
    // empty after trim, or not given: unchanged from the fixture's original value (re-seed a
    // fresh root, since the loop above already mutated this describe's shared `root`)
    const root2 = mkdtempSync(join(tmpdir(), `fork-init-${flag}-blank-`))
    writeFixture(root2)
    const before = JSON.parse(readFileSync(join(root2, 'package.json'), 'utf8'))[flag]
    for (const blank of ['', '   ', undefined]) {
      const argv = ['--author', 'me', '--repo', 'me/myfork', ...(blank === undefined ? [] : [`--${flag}`, blank])]
      runForkInit(parseForkInitArgs(argv), { projectRoot: root2 })
      expect(JSON.parse(readFileSync(join(root2, 'package.json'), 'utf8'))[flag]).toBe(before)
    }
    rmSync(root2, { recursive: true, force: true })
  })

  // item 7(a): --name/--description values containing `"`, `\` and `</script>` round-trip through
  // JSON (written via JSON.stringify, read back via JSON.parse).
  it.each(['name', 'description'] as const)('--%s: a value containing ", \\ and </script> round-trips through JSON', (flag) => {
    const value = 'He said "hi" \\ then </script> tags'
    const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', `--${flag}`, value]), {
      projectRoot: root,
    })
    expect(res.exitCode).toBe(0)
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg[flag]).toBe(value)
  })

  it.each([
    ['object url', { type: 'git', url: 'git+https://github.com/BrowserLaboratory/wxl-platform.git' }],
    ['object url, no type', { url: 'git+https://github.com/BrowserLaboratory/wxl-platform.git' }],
  ])('first conversion (%s): version becomes 0.1.0, license becomes ECL-2.0', (_label, repository) => {
    const raw = { name: 'x', version: '9.9.9', license: 'MIT', repository }
    writeManifest(root, JSON.stringify(raw, null, 2) + '\n')
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.version).toBe('0.1.0')
    expect(pkg.license).toBe('ECL-2.0')
  })

  it.each([
    ['different case', 'git+https://github.com/browserlaboratory/wxl-platform.git'],
    ['missing .git', 'git+https://github.com/BrowserLaboratory/wxl-platform'],
    ['missing git+', 'https://github.com/BrowserLaboratory/wxl-platform.git'],
    ['trailing space', 'git+https://github.com/BrowserLaboratory/wxl-platform.git '],
    ["the range's own URL", 'git+https://github.com/old-owner/old-name.git'],
  ])('not a first conversion (%s): version and license are unchanged', (_label, url) => {
    const raw = { name: 'x', version: '9.9.9', license: 'MIT', repository: { type: 'git', url } }
    writeManifest(root, JSON.stringify(raw, null, 2) + '\n')
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.version).toBe('9.9.9')
    expect(pkg.license).toBe('MIT')
  })

  // item 7(b): when not a first conversion, version/license that are ABSENT from the manifest
  // stay absent — they are not introduced by this run.
  it('not a first conversion: version and license, when absent from the manifest, stay absent', () => {
    const raw = { name: 'x', repository: { type: 'git', url: 'git+https://github.com/old-owner/old-name.git' } }
    writeManifest(root, JSON.stringify(raw, null, 2) + '\n')
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.version).toBeUndefined()
    expect(pkg.license).toBeUndefined()
  })

  it('not a first conversion when repository is a string equal to the upstream URL, or is null, or is absent', () => {
    for (const repository of ['git+https://github.com/BrowserLaboratory/wxl-platform.git', null, undefined]) {
      const root2 = mkdtempSync(join(tmpdir(), 'fork-init-firstconv-'))
      writeFixture(root2)
      const raw = JSON.parse(readFileSync(join(root2, 'package.json'), 'utf8'))
      raw.version = '9.9.9'
      raw.license = 'MIT'
      if (repository === undefined) delete raw.repository
      else raw.repository = repository
      writeManifest(root2, JSON.stringify(raw, null, 2) + '\n')
      runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root2 })
      const pkg = JSON.parse(readFileSync(join(root2, 'package.json'), 'utf8'))
      expect(pkg.version).toBe('9.9.9')
      expect(pkg.license).toBe('MIT')
      rmSync(root2, { recursive: true, force: true })
    }
  })

  it('not first conversion: the three URLs and author are still rewritten on every run, following a repo rename', () => {
    const raw = {
      name: 'x',
      version: '0.3.2',
      license: 'MIT',
      author: 'old-teacher',
      repository: { type: 'git', url: 'git+https://github.com/old-owner/old-name.git' },
      bugs: { url: 'https://github.com/old-owner/old-name/issues' },
      homepage: 'https://github.com/old-owner/old-name#readme',
    }
    writeManifest(root, JSON.stringify(raw, null, 2) + '\n')
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.version).toBe('0.3.2')
    expect(pkg.license).toBe('MIT')
    expect(pkg.author).toBe('me')
    expect(pkg.repository.url).toBe('git+https://github.com/me/myfork.git')
    expect(pkg.bugs.url).toBe('https://github.com/me/myfork/issues')
    expect(pkg.homepage).toBe('https://github.com/me/myfork#readme')
  })

  it('a manual version bump after first conversion survives an identical second run', () => {
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root }) // first conversion: version -> 0.1.0
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    pkg.version = '0.2.0'
    writeManifest(root, JSON.stringify(pkg, null, 2) + '\n')
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    expect(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version).toBe('0.2.0')
  })
})

// T55: a write failure (target 0444 in a 0555 directory) is a tree error naming the file and
// telling the teacher to run the same command again; already-written files stay; a rerun after
// restoring permissions converges.
describe('runForkInit — anchor mode: write failure', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-write-failure-'))
    writeFixture(root)
  })
  afterEach(() => {
    // restore permissions before rmSync, or the recursive remove itself fails
    try {
      chmodSync(root, 0o755)
    } catch {
      /* already restored by the test itself */
    }
    try {
      chmodSync(join(root, 'README.md'), 0o644)
    } catch {
      /* file may already be at the restored mode */
    }
    rmSync(root, { recursive: true, force: true })
  })

  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
    'a write failure returns exitCode 1 naming the file, with "run the same command again"; every file is old or new bytes; no stray temp file; a rerun after chmod converges',
    () => {
      // The bytes a fresh, fully successful run on an identical fixture would produce for every
      // path — computed BEFORE this test's own run is made to fail partway, so the "old or new
      // bytes, never partial" assertion below compares against an independently known-good tree,
      // not just "whatever this run happened to leave behind" (item 7(e)).
      const freshRoot = mkdtempSync(join(tmpdir(), 'fork-init-write-failure-reference-'))
      writeFixture(freshRoot)
      runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: freshRoot })
      const freshBytesByPath = new Map(snapshotTree(freshRoot).map((f) => [f.path, f.bytes]))
      rmSync(freshRoot, { recursive: true, force: true })

      chmodSync(join(root, 'README.md'), 0o444)
      chmodSync(root, 0o555)

      const before = snapshotTree(root)
      const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })

      // restore permissions immediately so later assertions (and other tests' cleanup) can read/write freely
      chmodSync(root, 0o755)
      chmodSync(join(root, 'README.md'), 0o644)

      expect(res.exitCode).toBe(1)
      expect(res.message).toContain('run the same command again')
      // no Node message, no absolute path, and no temp-file name leaks into the message (item 3)
      expect(res.message).not.toContain(root)
      expect(res.message).not.toContain('.fork-init-tmp')
      // the message names whichever anchor file the write reached first (order is not assumed —
      // the root directory's own 0555 blocks every root-level file, not just README.md, see the
      // ticket's Notes 3); it is a relative path with `/`.
      const candidates = ['package.json', 'README.md', 'README.en.md', 'CONTRIBUTE.md', '.vitepress/config.mts', '.github/workflows/deploy.yml']
      const namedFile = candidates.find((f) => res.message.includes(f))
      expect(namedFile, `message should name one of the anchor files: ${res.message}`).toBeTruthy()
      expect(res.changedFiles).toEqual([])
      expect(res.warnings).toEqual([])

      // every file is either still its original bytes, or EXACTLY the bytes a fresh, successful
      // run produces for that same path — never a partial write (item 7(e))
      const after = snapshotTree(root)
      const afterByPath = new Map(after.map((f) => [f.path, f]))
      for (const file of before) {
        const nowFile = afterByPath.get(file.path)
        expect(nowFile, `${file.path} should still exist`).toBeTruthy()
        const freshBytes = freshBytesByPath.get(file.path)
        const isOriginal = nowFile!.bytes === file.bytes
        const isFreshSuccess = freshBytes !== undefined && nowFile!.bytes === freshBytes
        expect(isOriginal || isFreshSuccess, `${file.path} should be original or fresh-success bytes`).toBe(true)
      }
      // the file the message names is untouched (still its original bytes)
      const namedBefore = before.find((f) => f.path === namedFile)!
      const namedAfter = afterByPath.get(namedFile!)!
      expect(namedAfter.bytes).toBe(namedBefore.bytes)
      // no directory is left holding a temporary file from this scenario (its own 0555 root
      // blocks the write before a `*.fork-init-tmp` is ever created for a root-level file)
      for (const f of listFiles(root)) expect(f.endsWith('.fork-init-tmp')).toBe(false)

      // re-run with the same arguments after permissions are restored: converges
      const second = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root })
      expect(second.exitCode).toBe(0)

      const root2 = mkdtempSync(join(tmpdir(), 'fork-init-write-failure-fresh-'))
      writeFixture(root2)
      runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork']), { projectRoot: root2 })
      const convergedTree = snapshotTree(root).map((f) => ({ path: f.path, bytes: f.bytes }))
      const freshTree = snapshotTree(root2).map((f) => ({ path: f.path, bytes: f.bytes }))
      expect(convergedTree.sort((a, b) => a.path.localeCompare(b.path))).toEqual(
        freshTree.sort((a, b) => a.path.localeCompare(b.path)),
      )
      rmSync(root2, { recursive: true, force: true })
    },
  )

  // item 7(e): a subdirectory write (the config, written first in the write phase) succeeds
  // before a root-directory write (the manifest) fails — proving "files already written stay"
  // (traceability.md, T55) is observed for a write made before the one that fails, not only for
  // ones made after it.
  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
    'a subdirectory write (the config) succeeds before a root write (the manifest) fails; the subdirectory write stays',
    () => {
      chmodSync(root, 0o555)
      const cfgBefore = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
      const pkgBefore = readFileSync(join(root, 'package.json'))

      const res = runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', '/myfork/']), {
        projectRoot: root,
      })

      chmodSync(root, 0o755)

      expect(res.exitCode).toBe(1)
      expect(res.message).toContain('package.json')

      // the subdirectory write (.vitepress is not itself made read-only) succeeded and stays
      // (T-0014: --base now writes A9, not a `base:` line; kept working under the new semantics,
      // per the ticket's carried-over note from T-0013)
      const cfgAfter = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
      expect(cfgAfter).not.toBe(cfgBefore)
      expect(cfgAfter).toContain("const siteBase = '/myfork/'")

      // the root write that failed left the manifest at its original bytes
      expect(readFileSync(join(root, 'package.json'))).toEqual(pkgBefore)
      for (const f of listFiles(root)) expect(f.endsWith('.fork-init-tmp')).toBe(false)
    },
  )
})

describe('runForkInit — B mode (rebrand: sensitive keys + honest inventory)', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-b-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('renames the four runtime-sensitive keys (structure-aware) and reports each', () => {
    const res = runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, '.vitepress/theme/i18n/index.ts'), 'utf8')).toContain('acme-locale')
    expect(readFileSync(join(root, 'scripts/challenge-verify-blind.ts'), 'utf8')).toContain('ACME_VERIFY_RUNTIME')
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toContain('tmp/acme-verify')
    expect(readFileSync(join(root, '.github/workflows/release.yml'), 'utf8')).toContain('acme-${GITHUB_REF_NAME}')
    const reported = res.sensitiveKeys.map((k) => k.key).sort()
    expect(reported).toEqual(['WXL_VERIFY_RUNTIME', 'release-asset', 'tmp/wxl-verify', 'wxl-locale'].sort())
  })

  it('renames WXL_VERIFY_RUNTIME to a VALID identifier for a kebab/dotted --rebrand', () => {
    // Regression: --rebrand my-ctf must not yield `MY-CTF_VERIFY_RUNTIME` (a JS SyntaxError in
    // unquoted key / property positions). The env-var seed is sanitized to `_`.
    runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--rebrand', 'my-ctf']), { projectRoot: root })
    const blind = readFileSync(join(root, 'scripts/challenge-verify-blind.ts'), 'utf8')
    expect(blind).toContain('MY_CTF_VERIFY_RUNTIME')
    expect(blind).not.toContain('MY-CTF_VERIFY_RUNTIME')
    // the localStorage/tmp/release forms keep the dash (string/path/filename contexts)
    expect(readFileSync(join(root, '.vitepress/theme/i18n/index.ts'), 'utf8')).toContain('my-ctf-locale')
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toContain('tmp/my-ctf-verify')
  })

  it('inventories the tool-created deploy.yml (never omitted from the honest report)', () => {
    // Regression: deploy.yml is written after the walk; its `wxl` must still be scanned so the
    // inventory is honest and idempotent (no false clean from an unscanned tool-created file).
    const res = runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    expect(existsSync(join(root, '.github/workflows/deploy.yml'))).toBe(true)
    expect(res.residualFiles).toContain('.github/workflows/deploy.yml')
    // second run: deploy.yml now exists and is still inventoried the same way (idempotent report)
    const second = runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    expect(second.changedFiles).not.toContain('.github/workflows/deploy.yml')
    expect(second.residualFiles).toContain('.github/workflows/deploy.yml')
  })

  it('inventories an EXISTING deploy.yml even when the template is absent (no false clean)', () => {
    // Edge: the walk only skips deploy.yml when the template exists (the deploy block handles it
    // then). With the template removed but an on-disk deploy.yml still carrying wxl, the walk must
    // scan it — otherwise it escapes both paths and the run falsely reports clean.
    rmSync(join(root, 'scripts/templates/deploy.yml.template'), { force: true })
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, '.github/workflows/deploy.yml'), '# WXL fork deploy (left over)\nname: Deploy\n')
    const res = runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    expect(res.residualFiles).toContain('.github/workflows/deploy.yml')
    expect(res.message).toMatch(/rebrand NOT complete/)
  })

  // C61/AC-25 (0005-create-wxl override of 0004 T51): create-wxl's setup record at the tree root
  // is never rewritten by rebrand mode, but it still goes through the residual scan — the honest
  // inventory keeps reporting it. The guard only ever matches the exact root path: a nested
  // `sub/range.json` in the same fixture is untouched by this override and still gets the slug
  // swap like any other tree-walked file.
  it('leaves a root range.json byte-identical in rebrand mode, but still inventories it', () => {
    const rangeJsonContent =
      JSON.stringify(
        { upstream: { repository: UPSTREAM_SLUG, version: '3.0.0', commit: '0'.repeat(40) } },
        null,
        2,
      ) + '\n'
    mkdirSync(join(root, 'sub'), { recursive: true })
    writeFileSync(join(root, 'range.json'), rangeJsonContent)
    writeFileSync(join(root, 'sub/range.json'), rangeJsonContent)
    const res = runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, 'range.json'), 'utf8')).toBe(rangeJsonContent)
    expect(res.changedFiles).not.toContain('range.json')
    expect(res.residualFiles).toContain('range.json')
    // the hit is surfaced with its real line/text (file:line), in the style of the Wxlsh case below
    const hit = res.residualHits.find((h) => h.file === 'range.json')
    expect(hit).toBeDefined()
    expect(hit!.line).toBe(3) // the `"repository": "<UPSTREAM_SLUG>",` line
    expect(hit!.text).toContain(UPSTREAM_SLUG)
    // only the root copy is protected — the same fixture's sub/range.json still gets the slug swap
    expect(res.changedFiles).toContain('sub/range.json')
    const subContent = readFileSync(join(root, 'sub/range.json'), 'utf8')
    expect(subContent).not.toContain(UPSTREAM_SLUG)
    expect(subContent).toContain('me/myfork')
  })

  // Pins the same C61 guarantee under --dry-run: a dry run never writes anything, so the root
  // range.json is trivially byte-identical, but the (read-only) residual scan still runs and still
  // reports it — this passes immediately, with no production change, since --dry-run already
  // skips every write in applyEdit (T55-era behaviour), unaffected by this ticket's edit.
  it('leaves a root range.json byte-identical under --dry-run, and still inventories it', () => {
    const rangeJsonContent =
      JSON.stringify(
        { upstream: { repository: UPSTREAM_SLUG, version: '3.0.0', commit: '0'.repeat(40) } },
        null,
        2,
      ) + '\n'
    writeFileSync(join(root, 'range.json'), rangeJsonContent)
    const res = runForkInit(parseForkInitArgs([...B_ARGS, '--dry-run']), { projectRoot: root })
    expect(res.exitCode).toBe(0)
    expect(readFileSync(join(root, 'range.json'), 'utf8')).toBe(rangeJsonContent)
    expect(res.changedFiles).not.toContain('range.json')
    expect(res.residualFiles).toContain('range.json')
  })

  it('does NOT blind-rename the wxlsh subsystem token (only full self-contained tokens change)', () => {
    // wxlsh contains "wxl" but must survive — it is a different identifier family.
    runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    expect(readFileSync(join(root, '.vitepress/theme/useWxlsh.ts'), 'utf8')).toContain('useWxlsh')
  })

  it('rewrites the CHANGELOG slug to the NEW repo, never to a brand-renamed link', () => {
    // Regression: a blind brand rename would also rewrite any brand token inside the slug links.
    runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    const cl = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
    expect(cl).toContain('me/myfork')
    expect(cl).not.toContain('acme')
    expect(cl).not.toContain('BrowserLaboratory/wxl-platform')
  })

  it('never touches excluded paths (lockfile, build output, both skill trees, and its own source)', () => {
    runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    expect(readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8')).toContain('wxl: 1.0.0')
    expect(readFileSync(join(root, '.vitepress/dist/old.html'), 'utf8')).toContain('built wxl page')
    // skill identifiers are structural — must remain wxl-* in both trees so the directories resolve
    expect(readFileSync(join(root, '.agents/skills/wxl-create/SKILL.md'), 'utf8')).toContain('wxl brand')
    expect(readFileSync(join(root, '.claude/skills/wxl-create/SKILL.md'), 'utf8')).toContain('wxl brand')
    // the tool's own source keeps its literal probes intact
    expect(readFileSync(join(root, 'scripts/fork-init.ts'), 'utf8')).toContain('wxl-locale')
  })

  it('protects a --repo/--author that legitimately contains "wxl" from any rewrite', () => {
    const res = runForkInit(
      parseForkInitArgs(['--author', 'wxlfan', '--repo', 'myorg/wxl-ctf', '--rebrand', 'acme']),
      { projectRoot: root },
    )
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    // identity is never corrupted (no rename touches it — safety by construction, no sentinel)
    expect(pkg.repository.url).toBe('git+https://github.com/myorg/wxl-ctf.git')
    expect(pkg.author).toBe('wxlfan')
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toContain('myorg/wxl-ctf')
    expect(res.exitCode).toBe(0)
  })

  it('does not over-strip: a distinct token that merely shares the --repo prefix is still inventoried', () => {
    // Regression: stripping the raw --repo slug from the residual check hid `myorg/wxl-ctf-mirror`
    // (a distinct project) because it shares the `myorg/wxl-ctf` prefix. No stripping now -> honest.
    writeFileSync(join(root, 'NOTES.md'), 'Mirror lives at myorg/wxl-ctf-mirror (a different project).\n')
    const res = runForkInit(
      parseForkInitArgs(['--author', 'me', '--repo', 'myorg/wxl-ctf', '--rebrand', 'acme']),
      { projectRoot: root },
    )
    expect(res.residualFiles).toContain('NOTES.md')
    expect(res.message).toMatch(/rebrand NOT complete/)
  })

  it('does NOT collapse when --author is the bare brand token (no sentinel machinery)', () => {
    // Regression for the sentinel-mask collapse: --author wxl used to make the whole rename a
    // no-op and falsely report clean. With no blind rename + no mask, the keys still rename and
    // the un-renamed brand token is still surfaced.
    const res = runForkInit(parseForkInitArgs(['--author', 'wxl', '--repo', 'me/myfork', '--rebrand', 'acme']), { projectRoot: root })
    const i18n = readFileSync(join(root, '.vitepress/theme/i18n/index.ts'), 'utf8')
    expect(i18n).toContain('acme-locale') // actually renamed, not skipped
    expect(i18n).not.toContain('wxl-locale')
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toContain('tmp/acme-verify')
    expect(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).author).toBe('wxl')
    // no false clean: the Title-case brand token is still inventoried
    expect(res.residualFiles).toContain('.vitepress/theme/useWxlsh.ts')
  })

  it('writes a --repo that embeds the old sentinel token verbatim, with no corruption', () => {
    // Regression for sentinel-token injection: the scheme is gone, so an underscore-laden repo
    // (REPO_RE allows `_`) is written as-is instead of being mangled by a restore pass.
    runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/wxl__FORKINIT_KEEP_1__', '--rebrand', 'acme']), { projectRoot: root })
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.repository.url).toBe('git+https://github.com/me/wxl__FORKINIT_KEEP_1__.git')
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toContain('me/wxl__FORKINIT_KEEP_1__')
  })

  it('does not corrupt a --repo whose name collides with a sensitive-key token (rename runs before slug swap)', () => {
    // `me/wxl-locale` would be mangled to `me/acme-locale` if the sensitive rename ran after the
    // slug swap wrote it. Ordering rename-before-slug protects the identity by construction.
    runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/wxl-locale', '--rebrand', 'acme']), { projectRoot: root })
    expect(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).repository.url).toBe('git+https://github.com/me/wxl-locale.git')
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toContain('me/wxl-locale')
  })

  it('applies A-mode identity in rebrand mode (name from --rebrand, --name wins)', () => {
    runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    let pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('acme')
    expect(pkg.version).toBe('0.1.0')
    expect(pkg.repository.url).toContain('me/myfork')
    // --name overrides the rebrand-derived name
    const root2 = mkdtempSync(join(tmpdir(), 'fork-init-name-'))
    writeFixture(root2)
    runForkInit(parseForkInitArgs([...B_ARGS, '--name', 'pkg-x']), { projectRoot: root2 })
    pkg = JSON.parse(readFileSync(join(root2, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('pkg-x')
    rmSync(root2, { recursive: true, force: true })
  })

  it('inventories residuals from the FINAL bytes (file:line) and never falsely flags a renamed key', () => {
    const res = runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    // the Title-case token is surfaced with its real line/text
    const hit = res.residualHits.find((h) => h.file === '.vitepress/theme/useWxlsh.ts')
    expect(hit).toBeDefined()
    expect(hit!.line).toBe(1)
    expect(hit!.text).toContain('Wxlsh')
    expect(res.residualFiles).toContain('.vitepress/theme/useWxlsh.ts')
    // files whose only wxl was an ACTUALLY-renamed sensitive key are NOT in the inventory
    expect(res.residualFiles).not.toContain('.gitignore')
    expect(res.residualFiles).not.toContain('.vitepress/theme/i18n/index.ts')
    expect(res.residualFiles).not.toContain('.github/workflows/release.yml')
    // the message is honest — it does not claim "clean" while wxl remains
    expect(res.message).toMatch(/rebrand NOT complete/)
    expect(res.warnings.some((w) => /case-insensitive "wxl"/.test(w))).toBe(true)
  })

  it('is idempotent: a second run finds nothing left to change', () => {
    const args = parseForkInitArgs(B_ARGS)
    runForkInit(args, { projectRoot: root })
    const second = runForkInit(args, { projectRoot: root })
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).not.toContain('wxl-verify')
    expect(readFileSync(join(root, '.vitepress/theme/i18n/index.ts'), 'utf8')).not.toContain('acacmeme')
    expect(second.changedFiles.length).toBe(0)
  })

  // Regression (T11): the CRLF rule added for anchor mode's manifest must not leak into rebrand
  // mode, which keeps writing LF regardless of the manifest's own line ending.
  it('writes the manifest with LF even when it was CRLF (CRLF rule is anchor-mode only)', () => {
    const raw = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    const crlf = JSON.stringify(raw, null, 2).replace(/\n/g, '\r\n') + '\r\n'
    writeManifest(root, crlf)
    runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    expect(readFileSync(join(root, 'package.json'), 'utf8')).not.toContain('\r')
  })

  // Regression (T14): anchor mode trims `--name`; rebrand mode keeps writing it verbatim.
  it('writes --name verbatim, without trimming (trimming is anchor-mode only)', () => {
    runForkInit(parseForkInitArgs([...B_ARGS, '--name', '  pkg-x  ']), { projectRoot: root })
    expect(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name).toBe('  pkg-x  ')
  })

  // T51 (base part)/AC-B2: rebrand mode's own differences for the base — A9, same as anchor mode
  // — while everything else about rebrand mode (the tree-wide swap, workflow comparison) stays
  // today's.
  it('--rebrand acme --base /x/ writes A9, and the config socialLinks slug is still swapped (today\'s way)', () => {
    runForkInit(parseForkInitArgs([...B_ARGS, '--base', '/x/']), { projectRoot: root })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain("const siteBase = '/x/'")
    expect(cfg).toContain('me/myfork') // today's tree-wide slug swap still applies to socialLinks
    expect(cfg).not.toContain('BrowserLaboratory/wxl-platform')
  })

  it('--rebrand acme --base none writes A9 as /', () => {
    runForkInit(parseForkInitArgs([...B_ARGS, '--base', 'none']), { projectRoot: root })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toContain("const siteBase = '/'")
  })

  it('a legacy config (no A9) with --base given exits 1; the tree walk writes nothing (CHANGELOG unchanged)', () => {
    writeFileSync(
      join(root, '.vitepress/config.mts'),
      ['export default {', "  base: '/wxl-platform/',", "  title: 'x',", '}', ''].join('\n'),
    )
    pinMtimes(root)
    const before = snapshotTree(root)
    const res = runForkInit(parseForkInitArgs([...B_ARGS, '--base', '/x/']), { projectRoot: root })
    expect(res.exitCode).toBe(1)
    expect(res.message).toContain('A9')
    const after = snapshotTree(root)
    expect(after).toEqual(before)
  })

  // T51: rebrand mode's workflow comparison stays today's — raw bytes, no LF normalisation — so a
  // CRLF-converted current-template-output is still "different content" there, unlike anchor mode.
  it("compares the workflow today's way (no LF normalisation): a CRLF current-template-output still warns", () => {
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, '.github/workflows/deploy.yml'), CURRENT_TEMPLATE_LF.replace(/\n/g, '\r\n'))
    const res = runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: root })
    expect(res.warnings.some((w) => w.includes('already exists with different content'))).toBe(true)
  })

  // T52/AC-B3: a rebrand run must never touch the upstream-only CI lines (T71), the test that
  // imports UPSTREAM_SLUG, or the engine file itself — confinement (traceability.md) holds even
  // under B mode's tree-wide swap. Real copies are added to the fixture ONLY in this test (per the
  // approved test plan), read from the actual repository so a future edit to any of them is
  // exercised here too.
  it('--author x --rebrand acme --repo me/x leaves the upstream-only if:/env lines, the UPSTREAM_SLUG import and the engine file byte-identical', () => {
    const repoRoot = resolve(__dirname, '../../..')
    const releaseYmlBefore = readFileSync(join(repoRoot, '.github/workflows/release.yml'), 'utf8')
    const qualityGatesYmlBefore = readFileSync(join(repoRoot, '.github/workflows/quality-gates.yml'), 'utf8')
    const guardTestBefore = readFileSync(join(repoRoot, 'tests/unit/scripts/upstream-guard.test.ts'), 'utf8')
    const engineFileBefore = readFileSync(join(repoRoot, 'scripts/fork-init.ts'), 'utf8')

    writeFileSync(join(root, '.github/workflows/release.yml'), releaseYmlBefore)
    writeFileSync(join(root, '.github/workflows/quality-gates.yml'), qualityGatesYmlBefore)
    mkdirSync(join(root, 'tests/unit/scripts'), { recursive: true })
    writeFileSync(join(root, 'tests/unit/scripts/upstream-guard.test.ts'), guardTestBefore)
    // Overwrites writeFixture's own self-exclude stub with the real engine file, bytes and all.
    writeFileSync(join(root, 'scripts/fork-init.ts'), engineFileBefore)

    const IF_LINE_RE = /^.*if: github\.repository == format\(.*\)\s*$/gm
    const EXPECT_UPSTREAM_LINE_RE = /^.*WXL_EXPECT_UPSTREAM:.*$/gm
    // The whole import statement (traceability.md, T52) — from `import {` to the closing
    // `from '…/scripts/fork-init'` — not only the `UPSTREAM_SLUG,` specifier line within it, so a
    // rebrand run touching any OTHER specifier on that import (or its quote style, line breaks,
    // etc.) is caught too, not only a change to the one line previously compared.
    const UPSTREAM_SLUG_IMPORT_RE = /import \{[^}]*\} from '[^']*\/scripts\/fork-init'/

    const ifLinesBefore = [...releaseYmlBefore.matchAll(IF_LINE_RE), ...qualityGatesYmlBefore.matchAll(IF_LINE_RE)].map((m) => m[0])
    const expectUpstreamLinesBefore = [...releaseYmlBefore.matchAll(EXPECT_UPSTREAM_LINE_RE), ...qualityGatesYmlBefore.matchAll(EXPECT_UPSTREAM_LINE_RE)].map((m) => m[0])
    const importBefore = guardTestBefore.match(UPSTREAM_SLUG_IMPORT_RE)?.[0]
    expect(ifLinesBefore.length).toBe(2) // positive control: both files actually hold the line
    expect(expectUpstreamLinesBefore.length).toBe(3) // release.yml: release; quality-gates.yml: test and the cross-OS job
    expect(importBefore).toBeDefined()
    // Positive control (traceability.md, T52): the SAME release.yml file holds a sensitive-key
    // token the walk DOES rewrite, proving the walk reads this file at all (not skipped whole).
    expect(releaseYmlBefore).toContain('wxl-${')

    const res = runForkInit(parseForkInitArgs(['--author', 'x', '--rebrand', 'acme', '--repo', 'me/x']), { projectRoot: root })
    expect(res.exitCode).toBe(0)

    const releaseYmlAfter = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8')
    const qualityGatesYmlAfter = readFileSync(join(root, '.github/workflows/quality-gates.yml'), 'utf8')
    const guardTestAfter = readFileSync(join(root, 'tests/unit/scripts/upstream-guard.test.ts'), 'utf8')
    const engineFileAfter = readFileSync(join(root, 'scripts/fork-init.ts'), 'utf8')

    expect([...releaseYmlAfter.matchAll(IF_LINE_RE), ...qualityGatesYmlAfter.matchAll(IF_LINE_RE)].map((m) => m[0])).toEqual(
      ifLinesBefore,
    )
    expect([...releaseYmlAfter.matchAll(EXPECT_UPSTREAM_LINE_RE), ...qualityGatesYmlAfter.matchAll(EXPECT_UPSTREAM_LINE_RE)].map((m) => m[0])).toEqual(expectUpstreamLinesBefore)
    expect(guardTestAfter.match(UPSTREAM_SLUG_IMPORT_RE)?.[0]).toBe(importBefore)
    expect(engineFileAfter).toBe(engineFileBefore)
    // the positive control: the walk DID rewrite the sensitive-key token elsewhere in this file
    expect(releaseYmlAfter).toContain('acme-${')
    expect(releaseYmlAfter).not.toContain('wxl-${')
  })
})

describe('wxl-fork-init skill is script-driven and host-agent-neutral', () => {
  const repoRoot = process.cwd()

  it.each(['.claude', '.agents'])('%s SKILL.md invokes pnpm fork:init and contains no host-agent-specific primitives', (tree) => {
    const skill = readFileSync(join(repoRoot, tree, 'skills/wxl-fork-init/SKILL.md'), 'utf8')
    expect(skill).toContain('pnpm fork:init')
    expect(skill).not.toMatch(/AskUserQuestion|EnterPlanMode|ExitPlanMode|TaskCreate|TaskUpdate|subagent_type/)
  })
})

describe('runForkInit — dry-run writes nothing', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-dry-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('previews edits but leaves every file unchanged and creates no deploy.yml', () => {
    const before = readFileSync(join(root, 'package.json'), 'utf8')
    const res = runForkInit(
      parseForkInitArgs([...B_ARGS, '--dry-run']),
      { projectRoot: root },
    )
    expect(res.exitCode).toBe(0)
    expect(res.changedFiles.length).toBeGreaterThan(0) // planned edits reported
    expect(readFileSync(join(root, 'package.json'), 'utf8')).toBe(before)
    expect(existsSync(join(root, '.github/workflows/deploy.yml'))).toBe(false)
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toContain('tmp/wxl-verify')
    // the residual inventory is computed from the would-be final bytes, not the on-disk snapshot
    expect(res.residualFiles).toContain('.vitepress/theme/useWxlsh.ts')
  })
})

// T56/AC-E2: --dry-run writes nothing; changedFiles equals (as a set) a twin fixture's real run
// on the same arguments, workflow installs/replacements/removals included; warnings and an
// error's exitCode/message also match the real run.
describe('runForkInit — anchor mode: dry-run (T56)', () => {
  const DEPLOY_REL = '.github/workflows/deploy.yml'

  /** Builds two identical fixture trees, `customize` applied to each identically, and runs `argv`
   *  for real on one and with --dry-run on the other — so the comparison is between a real run
   *  and a dry run of the SAME starting tree, never the same tree twice. */
  function runRealAndDry(argv: string[], customize: (root: string) => void = () => {}) {
    const realRoot = mkdtempSync(join(tmpdir(), 'fork-init-t56-real-'))
    const dryRoot = mkdtempSync(join(tmpdir(), 'fork-init-t56-dry-'))
    writeFixture(realRoot)
    writeFixture(dryRoot)
    customize(realRoot)
    customize(dryRoot)
    pinMtimes(dryRoot)
    const before = snapshotTree(dryRoot)
    const real = runForkInit(parseForkInitArgs(argv), { projectRoot: realRoot })
    const dry = runForkInit(parseForkInitArgs([...argv, '--dry-run']), { projectRoot: dryRoot })
    const after = snapshotTree(dryRoot)
    rmSync(realRoot, { recursive: true, force: true })
    rmSync(dryRoot, { recursive: true, force: true })
    return { real, dry, before, after }
  }

  function assertDryMatchesReal(real: ForkInitResult, dry: ForkInitResult, before: ReturnType<typeof snapshotTree>, after: ReturnType<typeof snapshotTree>) {
    expect(dry.exitCode).toBe(real.exitCode)
    expect(dry.message).toBe(dry.exitCode === 0 ? `dry-run: ${real.changedFiles.length} file(s) would change` : real.message)
    expect(new Set(dry.changedFiles)).toEqual(new Set(real.changedFiles))
    expect(new Set(dry.warnings)).toEqual(new Set(real.warnings))
    expect(after).toEqual(before)
  }

  it('no --host, workflow absent: changedFiles/warnings match a real install', () => {
    const { real, dry, before, after } = runRealAndDry(['--author', 'me', '--repo', 'me/myfork'])
    assertDryMatchesReal(real, dry, before, after)
    expect(dry.changedFiles).toContain(DEPLOY_REL)
  })

  it('--host github-pages, workflow absent: changedFiles/warnings match a real install', () => {
    const { real, dry, before, after } = runRealAndDry(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages'])
    assertDryMatchesReal(real, dry, before, after)
    expect(dry.changedFiles).toContain(DEPLOY_REL)
  })

  it('--host github-pages, workflow is a known old output: changedFiles/warnings match a real replace', () => {
    const { real, dry, before, after } = runRealAndDry(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages'], (r) => {
      mkdirSync(join(r, '.github/workflows'), { recursive: true })
      writeFileSync(join(r, DEPLOY_REL), OLD_TEMPLATE_LF)
    })
    assertDryMatchesReal(real, dry, before, after)
    expect(dry.changedFiles).toContain(DEPLOY_REL)
  })

  it('--host cloudflare-pages, workflow equals the current template output: changedFiles/warnings match a real removal; the file is still present (dry-run)', () => {
    const { real, dry, before, after } = runRealAndDry(
      ['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--origin', 'https://myfork.pages.dev'],
      (r) => {
        mkdirSync(join(r, '.github/workflows'), { recursive: true })
        writeFileSync(join(r, DEPLOY_REL), CURRENT_TEMPLATE_LF)
      },
    )
    assertDryMatchesReal(real, dry, before, after)
    expect(dry.changedFiles).toContain(DEPLOY_REL)
    expect(after.some((f) => f.path === DEPLOY_REL)).toBe(true)
  })

  it('--site-name and --origin together: A6/A7/A8 are all listed; a T81 warning still appears', () => {
    const { real, dry, before, after } = runRealAndDry(
      ['--author', 'me', '--repo', 'me/myfork', '--site-name', 'New Name', '--origin', 'https://e.example'],
      (r) => writeFileSync(join(r, '.vitepress/challenge/shortLink.ts'), "export const SITE_ORIGIN = 'https://custom.example'\n"),
    )
    assertDryMatchesReal(real, dry, before, after)
    for (const f of ['.vitepress/config.mts', 'platform/index.md', 'platform/zh-TW/index.md', '.vitepress/challenge/shortLink.ts']) {
      expect(dry.changedFiles).toContain(f)
    }
    expect(dry.warnings.some((w) => w.includes('A8'))).toBe(true)
  })

  it('error: a missing platform/zh-TW/index.md (T9) gives the same exitCode and message as a real run', () => {
    const { real, dry, before, after } = runRealAndDry(['--author', 'me', '--repo', 'me/myfork', '--site-name', 'New Name'], (r) =>
      rmSync(join(r, 'platform/zh-TW/index.md')),
    )
    assertDryMatchesReal(real, dry, before, after)
    expect(dry.exitCode).toBe(1)
    expect(dry.message).toContain('A7')
  })

  it('error: --host with the template missing (T24) gives the same exitCode and message as a real run', () => {
    const { real, dry, before, after } = runRealAndDry(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages'], (r) =>
      rmSync(join(r, 'scripts/templates/deploy.yml.template')),
    )
    assertDryMatchesReal(real, dry, before, after)
    expect(dry.exitCode).toBe(1)
  })
})

// T6/AC-A3: for each fixed argument set X, the unapplied fixture (no workflow) exits 0; a tree
// with any subset of X's writes already done, then run with X again, ends byte-identical to X
// run on the unapplied fixture. Every subset is tested — risk noted in the ticket: ~1,280 runs,
// so one baseline tree per X is built, with only the differing files overwritten per subset
// (never a fresh fixture tree per subset).
// item 12: the three fixed argument sets both T6 (convergence) and T7 (second identical run) run
// against are the same set, verbatim — a single file-level constant shared by both, rather than
// each describe keeping its own copy.
const CONVERGENCE_X_CASES: Array<{ label: string; argv: string[] }> = [
  {
    label: 'S7 GH',
    argv: [
      '--author',
      'Test Teacher',
      '--repo',
      'test-owner/web-range',
      '--host',
      'github-pages',
      '--site-name',
      '林老師的資安靶場',
    ],
  },
  {
    label: 'S7 CF',
    argv: [
      '--author',
      'Test Teacher',
      '--repo',
      'test-owner/web-range',
      '--host',
      'cloudflare-pages',
      '--origin',
      'https://web-range.pages.dev',
      '--site-name',
      `Lin's "Web" Range \\ $' $1`,
    ],
  },
  {
    label: 'custom (--base, --site-name, --origin, no --host)',
    argv: ['--author', 'a', '--repo', 'o/n', '--base', '/x/', '--site-name', 'N', '--origin', 'https://e.example'],
  },
]

describe('runForkInit — anchor mode: convergence (T6)', () => {
  describe.each(CONVERGENCE_X_CASES)('$label', ({ argv }) => {
    // The reference tree: X run once on a pristine, unapplied fixture. Its final tree is the
    // target every subset below must converge to; `changedFiles` is X's own list of write items.
    const refRoot = mkdtempSync(join(tmpdir(), 'fork-init-t6-ref-'))
    writeFixture(refRoot)
    const refResult = runForkInit(parseForkInitArgs(argv), { projectRoot: refRoot })
    if (refResult.exitCode !== 0) {
      throw new Error(`T6 reference run failed for ${JSON.stringify(argv)}: ${refResult.message}`)
    }
    const writeItems = refResult.changedFiles.slice()
    const afterContent = new Map<string, string | null>(
      writeItems.map((p) => [p, existsSync(join(refRoot, p)) ? readFileSync(join(refRoot, p), 'utf8') : null]),
    )
    const referenceSnapshot = listFiles(refRoot)
      .sort()
      .map((p) => ({ path: p, bytes: readFileSync(join(refRoot, p)).toString('base64') }))
    rmSync(refRoot, { recursive: true, force: true })

    // The work tree: one pristine fixture, reused for every subset below. Before each subset's
    // run, every write item is reset to its "before" (unapplied) content, then the subset's own
    // items are overwritten to their "after" (reference) content — reproducing a half-applied
    // tree without rebuilding the whole fixture.
    const workRoot = mkdtempSync(join(tmpdir(), 'fork-init-t6-work-'))
    writeFixture(workRoot)
    const beforeContent = new Map<string, string | null>(
      writeItems.map((p) => [p, existsSync(join(workRoot, p)) ? readFileSync(join(workRoot, p), 'utf8') : null]),
    )
    afterAll(() => rmSync(workRoot, { recursive: true, force: true }))

    function applySubset(mask: number) {
      writeItems.forEach((p, i) => {
        const inSubset = (mask & (1 << i)) !== 0
        const want = inSubset ? afterContent.get(p)! : beforeContent.get(p)!
        const abs = join(workRoot, p)
        if (want === null) {
          rmSync(abs, { force: true })
        } else {
          mkdirSync(dirname(abs), { recursive: true })
          writeFileSync(abs, want)
        }
      })
    }

    const totalSubsets = 1 << writeItems.length

    it('the unapplied fixture itself exits 0', () => {
      applySubset(0)
      const res = runForkInit(parseForkInitArgs(argv), { projectRoot: workRoot })
      expect(res.exitCode).toBe(0)
    })

    for (let mask = 0; mask < totalSubsets; mask++) {
      const bits = mask.toString(2).padStart(writeItems.length, '0')
      it(
        `subset ${bits} (of ${writeItems.length} write items) converges to the reference tree`,
        () => {
          applySubset(mask)
          const res = runForkInit(parseForkInitArgs(argv), { projectRoot: workRoot })
          expect(res.exitCode, res.message).toBe(0)
          const after = listFiles(workRoot)
            .sort()
            .map((p) => ({ path: p, bytes: readFileSync(join(workRoot, p)).toString('base64') }))
          expect(after).toEqual(referenceSnapshot)
        },
        10_000,
      )
    }
  })
})

// T7/AC-A4: a second identical run reports no changed file, leaves every file's bytes and
// modification time unchanged, and emits exactly the warnings whose condition still holds —
// never an install, replace, remove, T81 or T82 warning.
describe('runForkInit — anchor mode: second identical run (T7)', () => {
  function runTwice(argv: string[], customize: (root: string) => void = () => {}) {
    const root = mkdtempSync(join(tmpdir(), 'fork-init-t7-'))
    writeFixture(root)
    customize(root)
    const first = runForkInit(parseForkInitArgs(argv), { projectRoot: root })
    pinMtimes(root)
    const beforeSecond = snapshotTree(root)
    const second = runForkInit(parseForkInitArgs(argv), { projectRoot: root })
    const after = snapshotTree(root)
    rmSync(root, { recursive: true, force: true })
    return { first, second, beforeSecond, after }
  }

  it.each(CONVERGENCE_X_CASES)('$label: second run changes nothing; bytes and mtime unchanged', ({ argv }) => {
    const { first, second, beforeSecond, after } = runTwice(argv)
    expect(first.exitCode).toBe(0)
    expect(second.exitCode).toBe(0)
    expect(second.changedFiles).toEqual([])
    expect(after).toEqual(beforeSecond)
  })

  it.each(CONVERGENCE_X_CASES)('$label: the second run warns exactly the warnings whose condition still holds', ({ argv }) => {
    const { first, second } = runTwice(argv)
    // none of these ever survive to a second identical run (the engine keeps no state)
    const transient = (w: string) =>
      /Tag rule/i.test(w) || w.includes('replaced') || w.includes('removed') || w.includes('A8:') || w.includes('A9:')
    const firstStillApplies = new Set(first.warnings.filter((w) => !transient(w)))
    expect(new Set(second.warnings)).toEqual(firstStillApplies)
    for (const w of second.warnings) expect(transient(w)).toBe(false)
  })

  it('missing README.en.md (T2): the warning repeats identically', () => {
    const { first, second } = runTwice(['--author', 'me', '--repo', 'me/myfork'], (r) => rmSync(join(r, 'README.en.md')))
    const firstA2 = first.warnings.filter((w) => w.includes('A2') && w.includes('README.en.md'))
    const secondA2 = second.warnings.filter((w) => w.includes('A2') && w.includes('README.en.md'))
    expect(firstA2.length).toBeGreaterThan(0)
    expect(secondA2).toEqual(firstA2)
  })

  // item 10: CONTRIBUTE.md PRESENT but without A5's own form (distinct from T2's "file absent"
  // case above) -- the exact same "no occurrence of its form" warning on both runs, and a second
  // run with nothing to converge towards still changes nothing.
  it('CONTRIBUTE.md exists but has no A5 form: the same warning appears both runs; the second changes nothing', () => {
    const { first, second } = runTwice(['--author', 'me', '--repo', 'me/myfork'], (r) =>
      writeFileSync(
        join(r, 'CONTRIBUTE.md'),
        'git remote add upstream https://github.com/BrowserLaboratory/wxl-platform.git\nNo issues link here.\n',
      ),
    )
    const firstA5 = first.warnings.filter((w) => w.includes('A5') && w.includes('CONTRIBUTE.md'))
    const secondA5 = second.warnings.filter((w) => w.includes('A5') && w.includes('CONTRIBUTE.md'))
    expect(firstA5.length).toBeGreaterThan(0)
    expect(secondA5).toEqual(firstA5)
    expect(second.changedFiles).toEqual([])
  })

  it('GH, an "other" workflow that derives SITE_BASE: the warning repeats identically', () => {
    const other = CURRENT_TEMPLATE_LF.replace('name: Deploy', 'name: Deploy\n# an extra comment line')
    const { first, second } = runTwice(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages'], (r) => {
      mkdirSync(join(r, '.github/workflows'), { recursive: true })
      writeFileSync(join(r, '.github/workflows/deploy.yml'), other)
    })
    const firstW = first.warnings.filter((w) => w.includes('left untouched'))
    const secondW = second.warnings.filter((w) => w.includes('left untouched'))
    expect(firstW.length).toBeGreaterThan(0)
    expect(secondW).toEqual(firstW)
  })

  it('GH, an "other" workflow that does not derive SITE_BASE: the warning repeats identically', () => {
    const { first, second } = runTwice(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages'], (r) => {
      mkdirSync(join(r, '.github/workflows'), { recursive: true })
      writeFileSync(join(r, '.github/workflows/deploy.yml'), 'name: MyCustomDeploy\n')
    })
    const firstW = first.warnings.filter((w) => w.includes('SITE_BASE') && w.includes('404'))
    const secondW = second.warnings.filter((w) => w.includes('SITE_BASE') && w.includes('404'))
    expect(firstW.length).toBeGreaterThan(0)
    expect(secondW).toEqual(firstW)
  })

  it('CF, an "other" workflow: the warning repeats identically', () => {
    const { first, second } = runTwice(
      ['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--origin', 'https://e.example'],
      (r) => {
        mkdirSync(join(r, '.github/workflows'), { recursive: true })
        writeFileSync(join(r, '.github/workflows/deploy.yml'), 'name: MyCustomDeploy\n')
      },
    )
    const firstW = first.warnings.filter((w) => w.includes('left untouched'))
    const secondW = second.warnings.filter((w) => w.includes('left untouched'))
    expect(firstW.length).toBeGreaterThan(0)
    expect(secondW).toEqual(firstW)
  })

  it('no --host, workflow different content (T25): the warning repeats identically', () => {
    const { first, second } = runTwice(['--author', 'me', '--repo', 'me/myfork'], (r) => {
      mkdirSync(join(r, '.github/workflows'), { recursive: true })
      writeFileSync(join(r, '.github/workflows/deploy.yml'), 'name: SomePreexisting\n')
    })
    const firstW = first.warnings.filter((w) => w.includes('already exists with different content'))
    const secondW = second.warnings.filter((w) => w.includes('already exists with different content'))
    expect(firstW.length).toBeGreaterThan(0)
    expect(secondW).toEqual(firstW)
  })

  it('no --host, template missing (T25): the warning repeats identically', () => {
    const { first, second } = runTwice(['--author', 'me', '--repo', 'me/myfork'], (r) =>
      rmSync(join(r, 'scripts/templates/deploy.yml.template')),
    )
    const firstW = first.warnings.filter((w) => w.includes('scripts/templates/deploy.yml.template'))
    const secondW = second.warnings.filter((w) => w.includes('scripts/templates/deploy.yml.template'))
    expect(firstW.length).toBeGreaterThan(0)
    expect(secondW).toEqual(firstW)
  })

  it('no --host, A9 upstream, workflow not deriving SITE_BASE (T26): the warning repeats identically', () => {
    const { first, second } = runTwice(['--author', 'me', '--repo', 'me/myfork'], (r) => {
      mkdirSync(join(r, '.github/workflows'), { recursive: true })
      writeFileSync(join(r, '.github/workflows/deploy.yml'), 'name: MyCustomDeploy\n')
    })
    const firstW = first.warnings.filter((w) => w.includes('SITE_BASE') && w.includes('404'))
    const secondW = second.warnings.filter((w) => w.includes('SITE_BASE') && w.includes('404'))
    expect(firstW.length).toBeGreaterThan(0)
    expect(secondW).toEqual(firstW)
  })

  it('T81 (custom A8 + --origin) warns on the first run but never on the second', () => {
    const { first, second } = runTwice(['--author', 'me', '--repo', 'me/myfork', '--origin', 'https://e.example'], (r) =>
      writeFileSync(join(r, '.vitepress/challenge/shortLink.ts'), "export const SITE_ORIGIN = 'https://custom.example'\n"),
    )
    expect(first.warnings.some((w) => w.includes('A8'))).toBe(true)
    expect(second.warnings.some((w) => w.includes('A8'))).toBe(false)
  })

  it('T82 (literal A9 + --host) warns on the first run but never on the second', () => {
    const { first, second } = runTwice(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages'], (r) =>
      writeConfigWithBase(r, '/x/'),
    )
    expect(first.warnings.some((w) => w.includes('A9'))).toBe(true)
    expect(second.warnings.some((w) => w.includes('A9'))).toBe(false)
  })

  it('a known old workflow output, replaced on the first run, warns only once', () => {
    const { first, second } = runTwice(['--author', 'me', '--repo', 'me/myfork', '--host', 'github-pages'], (r) => {
      mkdirSync(join(r, '.github/workflows'), { recursive: true })
      writeFileSync(join(r, '.github/workflows/deploy.yml'), OLD_TEMPLATE_LF)
    })
    expect(first.warnings.some((w) => w.includes('replaced'))).toBe(true)
    expect(second.warnings.some((w) => w.includes('replaced'))).toBe(false)
  })

  it('CF removing the current-template-output workflow on the first run warns only once', () => {
    const { first, second } = runTwice(
      ['--author', 'me', '--repo', 'me/myfork', '--host', 'cloudflare-pages', '--origin', 'https://e.example'],
      (r) => {
        mkdirSync(join(r, '.github/workflows'), { recursive: true })
        writeFileSync(join(r, '.github/workflows/deploy.yml'), CURRENT_TEMPLATE_LF)
      },
    )
    expect(first.warnings.some((w) => w.includes('removed'))).toBe(true)
    expect(second.warnings.some((w) => w.includes('removed'))).toBe(false)
  })
})

// ─── S2: the CLI under type stripping ───────────────────────────────────────

/** The repo root, derived from this test file's own URL (three levels up from
 *  tests/unit/scripts/) rather than `process.cwd()`, so it is correct regardless of the
 *  directory vitest was invoked from. */
const CLI_REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))

/** A fixture under the real path of a temp dir (symlinks resolved — macOS's /tmp is one),
 *  manifest `"type": "module"`, the real engine source in place of the stub, and the
 *  repository's own `node_modules` linked in (S2, spec revision 2.1). */
function writeCliFixture(): string {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'fork-init-cli-'))
  writeFixture(root)
  const pkgPath = join(root, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  pkg.type = 'module'
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  const realSrc = readFileSync(join(CLI_REPO_ROOT, 'scripts/fork-init.ts'), 'utf8')
  writeFileSync(join(root, 'scripts/fork-init.ts'), realSrc)
  try {
    // 'junction' on Windows: a non-privileged account cannot create a 'dir' symlink there.
    symlinkSync(join(CLI_REPO_ROOT, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  } catch (err) {
    // Without this, a symlink failure here would leak the temp tree already built above it.
    rmSync(root, { recursive: true, force: true })
    throw err
  }
  return root
}

/** Reconstruct exactly the stdout bytes `main()` prints for a successful `ForkInitResult`: one
 *  string per `console.log` call, in the same order, each terminated by exactly one `\n` —
 *  matching `console.log`'s own behaviour and `main()`'s current exact format. */
function composeExpectedStdout(result: ForkInitResult): string {
  const calls: string[] = [result.message]
  if (result.changedFiles.length) {
    calls.push('\nChanged files:')
    for (const f of result.changedFiles) calls.push(`  ${f}`)
  }
  if (result.sensitiveKeys.length) {
    calls.push('\n[!] Runtime-sensitive keys renamed (verify storage/env/release impact):')
    for (const k of result.sensitiveKeys) calls.push(`  ${k.key} -> in ${k.files.join(', ')}`)
  }
  if (result.residualFiles.length) {
    calls.push(
      `\n[!] ${result.residualFiles.length} file(s) still contain a case-insensitive "wxl" (NOT auto-renamed — finish manually):`,
    )
    for (const f of result.residualFiles) calls.push(`  ${f}`)
    calls.push('    Run `git grep -in wxl` to review each; decide brand vs wxlsh-subsystem vs skill/spec dir per occurrence.')
  }
  for (const w of result.warnings) calls.push(`\n[i] ${w}`)
  return calls.map((c) => `${c}\n`).join('')
}

/** Run the fixture's copy of the CLI under `node --experimental-strip-types`, without `tsx`. */
function runCli(root: string, argv: string[]) {
  const env = { ...process.env }
  delete env.NODE_OPTIONS
  return spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/fork-init.ts', ...argv], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20_000,
    env,
  })
}

/** Node 22 prints the type-stripping ExperimentalWarning (and a --trace-warnings hint) on
 *  stderr; Node 24 does not (S2 risk noted by the ticket). Both are allowed and filtered out. */
function filterExperimentalWarnings(stderr: string): string {
  return stderr
    .split('\n')
    .filter((l) => l.trim() !== '' && !/ExperimentalWarning/.test(l) && !/--trace-warnings/.test(l))
    .join('\n')
}

/** Build a second CLI fixture as the S1 reference tree, run `expectedFn` against it, then clean it
 *  up in a `finally` — so the reference tree built for one assertion never leaks when that
 *  assertion throws. Built with `writeCliFixture()` too (type module, real engine source,
 *  `node_modules` link), so the S1 reference tree and the S2 fixture under test are truly
 *  identical trees, differing only in how they are run. */
function withS1Reference<T>(expectedFn: (s1Root: string) => T): T {
  let s1Root: string | undefined
  try {
    s1Root = writeCliFixture()
    return expectedFn(s1Root)
  } finally {
    // `writeCliFixture()` cleans up after itself if it fails partway (symlink step), so s1Root is
    // only set here once the tree fully exists.
    if (s1Root !== undefined) {
      const nodeModulesLink = join(s1Root, 'node_modules')
      if (existsSync(nodeModulesLink)) unlinkSync(nodeModulesLink)
      rmSync(s1Root, { recursive: true, force: true })
    }
  }
}

describe(
  'fork-init CLI under type stripping',
  () => {
    let root: string
    beforeEach(() => {
      root = writeCliFixture()
    })
    afterEach(() => {
      if (!root) return
      // rmSync's recursive walk does not follow a symbolic link it meets along the way — it
      // unlinks the link itself, never touching the real dependency tree the link points at, so
      // rmSync(root, { recursive: true }) alone is already safe here. Unlinking first is only a
      // belt-and-braces step: if `node_modules` were ever NOT a symlink here, unlinkSync throws
      // instead of silently taking the different (and, for a real directory, very slow) code path.
      const nodeModulesLink = join(root, 'node_modules')
      if (existsSync(nodeModulesLink)) unlinkSync(nodeModulesLink)
      rmSync(root, { recursive: true, force: true })
    })

    const ANCHOR_ARGV = ['--author', 'Test Teacher', '--repo', 'test-owner/web-range']

    it('anchor mode: exit 0, no stderr beyond an ExperimentalWarning, stdout matches an equivalent S1 run', () => {
      const expected = withS1Reference((s1Root) => runForkInit(parseForkInitArgs(ANCHOR_ARGV), { projectRoot: s1Root }))

      const res = runCli(root, ANCHOR_ARGV)
      expect(res.status).toBe(0)
      expect(filterExperimentalWarnings(res.stderr)).toBe('')

      const stdoutLines = res.stdout.split('\n')
      expect(stdoutLines[0]).toBe(expected.message)
      const changedIdx = stdoutLines.indexOf('Changed files:')
      expect(changedIdx).toBeGreaterThan(0) // the message prints first

      // Order, not just presence: every changed-file line comes after 'Changed files:', and every
      // warning line comes after the LAST changed-file line.
      const pathIndices = expected.changedFiles.map((f) => stdoutLines.indexOf(`  ${f}`))
      for (const idx of pathIndices) expect(idx).toBeGreaterThan(changedIdx)
      const lastPathIdx = Math.max(...pathIndices)
      const warningIndices = expected.warnings.map((w) => stdoutLines.indexOf(`[i] ${w}`))
      for (const idx of warningIndices) expect(idx).toBeGreaterThan(lastPathIdx)
    })

    it("rebrand mode: stdout exactly matches an equivalent S1 run, in main()'s current format", () => {
      const expected = withS1Reference((s1Root) => runForkInit(parseForkInitArgs(B_ARGS), { projectRoot: s1Root }))

      const res = runCli(root, B_ARGS)
      expect(res.status).toBe(0)
      expect(filterExperimentalWarnings(res.stderr)).toBe('')
      expect(res.stdout).toBe(composeExpectedStdout(expected))
    })

    it('invalid arguments: exit 1, empty stdout, stderr is exactly ✗ + the message S1 throws for the same argv; tree unchanged', () => {
      const argvCases: string[][] = [
        ['--bogus'],
        ['--author', 'Test Teacher', '--repo', 'test-owner/web-range', 'extra'],
        ['--author', 'a', '--repo', 'test-owner/web-range', '--author', 'b'],
        ['--repo', 'test-owner/web-range'],
        ['--author', 'Test Teacher', '--repo', 'not-a-slug'],
      ]
      for (const argv of argvCases) {
        const expectedMessage = argError(argv).message
        pinMtimes(root)
        const before = snapshotTree(root)
        const res = runCli(root, argv)
        expect(res.status).toBe(1)
        expect(res.stdout).toBe('')
        expect(filterExperimentalWarnings(res.stderr)).toBe(`✗ ${expectedMessage}`)
        expect(snapshotTree(root)).toEqual(before)
      }
    })

    it.each(['missing', 'BOM-prefixed'] as const)(
      'tree error (manifest %s): exit 1, empty stdout, stderr is exactly ✗ + the message from an equivalent S1 run, tree unchanged',
      (state) => {
        const corrupt = (r: string) => {
          if (state === 'missing') rmSync(join(r, 'package.json'))
          else writeFileSync(join(r, 'package.json'), '\uFEFF' + JSON.stringify({ type: 'module' }))
        }
        corrupt(root)

        // The top-level MODES table (anchor, rebrand), not a one-off list, so this test tracks
        // the same two modes every other S1/S2 describe above uses. The expected message is
        // computed from its own S1 reference tree, run in the SAME mode as the CLI invocation it
        // is compared against (one reference tree per mode) — a tree-error message happens not to
        // vary by mode today, but asserting mode-for-mode is what actually proves that, instead of
        // assuming it and reusing a single anchor-mode reference for both comparisons.
        for (const mode of MODES) {
          const argv = [...ANCHOR_ARGV, ...mode.rebrand]
          const expectedMessage = withS1Reference((s1Root) => {
            corrupt(s1Root)
            return runForkInit(parseForkInitArgs(argv), { projectRoot: s1Root }).message
          })

          pinMtimes(root)
          const before = snapshotTree(root)
          const res = runCli(root, argv)
          expect(res.status).toBe(1)
          expect(res.stdout).toBe('')
          expect(filterExperimentalWarnings(res.stderr)).toBe(`✗ ${expectedMessage}`)
          expect(snapshotTree(root)).toEqual(before)
        }
      },
    )
  },
  60_000,
)

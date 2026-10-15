/**
 * @vitest-environment node
 *
 * Forced to the `node` environment (not the project default, `happy-dom`). Checked directly: a
 * throwaway test run under the default `happy-dom` environment printed `import.meta.url` as a
 * plain `file://` URL, but printed `new URL('../../..', import.meta.url).href` — the same join
 * `CLI_REPO_ROOT` below performs — as an `http://localhost:.../@fs/...` dev-server URL instead.
 * `fileURLToPath` throws on a non-`file:` URL, so `CLI_REPO_ROOT` could not be computed under
 * `happy-dom`. The need is specific to this file's `CLI_REPO_ROOT`, not to this file in general.
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
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  parseForkInitArgs,
  runForkInit,
  ForkInitArgError,
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

  w(
    '.vitepress/config.mts',
    [
      'export default {',
      "  title: 'Web eXploitation Laboratory',",
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
  // therefore be inventoried like any other active file (not silently omitted).
  w('scripts/templates/deploy.yml.template', '# WXL fork deploy — from scripts/templates/deploy.yml.template\nname: Deploy\njobs: {}\n')

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
}

function writeConfigWithBase(root: string, basePath: string) {
  writeFileSync(
    join(root, '.vitepress/config.mts'),
    [
      'export default {',
      `  base: '${basePath}',`,
      "  title: 'Web eXploitation Laboratory',",
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

  it('--base none marks base for removal, --rebrand selects B mode, --dry-run sets dryRun', () => {
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

  it('sets base when a path is given and copies the deploy workflow', () => {
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toMatch(/base:\s*['"]\/myfork\/['"]/)
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

  it('--base none does not declare a base', () => {
    runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', 'none']), { projectRoot: root })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).not.toMatch(/base:/)
  })

  it('does not clobber a pre-existing deploy.yml with different content; warns instead', () => {
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, '.github/workflows/deploy.yml'), 'name: MyCustomDeploy\n')
    const res = runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    expect(readFileSync(join(root, '.github/workflows/deploy.yml'), 'utf8')).toBe('name: MyCustomDeploy\n')
    expect(res.warnings.some((w) => w.includes('deploy.yml'))).toBe(true)
  })

  it('replaces an existing base line exactly (H1 replacer branch), $-safe', () => {
    writeConfigWithBase(root, '/wxl-platform/')
    runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', '/a-b_c/']), { projectRoot: root })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toMatch(/base:\s*'\/a-b_c\/'/)
    expect(cfg).not.toContain('/wxl-platform/')
    expect(cfg).toContain("title: 'Web eXploitation Laboratory'") // untouched
  })

  it('collapses an env-conditional base line to a plain literal (upstream shape)', () => {
    // The upstream .vitepress/config.mts declares `base: process.env.SITE_BASE ?? '/'`
    // so its own tests/preview stay at root while the Pages build sets SITE_BASE.
    // A downstream `--base /path/` must still rewrite this to a plain literal.
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
    runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', '/myfork/']), { projectRoot: root })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).toMatch(/^\s*base:\s*'\/myfork\/',\s*$/m)
    expect(cfg).not.toContain('process.env.SITE_BASE')
    expect(cfg).toContain("title: 'Web eXploitation Laboratory'") // untouched
  })

  it('--base none strips an existing base line, leaving the rest intact', () => {
    writeConfigWithBase(root, '/wxl-platform/')
    runForkInit(parseForkInitArgs(['--author', 'me', '--repo', 'me/myfork', '--base', 'none']), { projectRoot: root })
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    expect(cfg).not.toMatch(/base:/)
    expect(cfg).toContain('title:')
    expect(cfg).toContain('themeConfig')
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

  it('A6 (unparsable), A7 (two candidate lines) and A8/A9 (file absent) all stay untouched: no flag sets them in this ticket', () => {
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
    const values = ['  x  ', '　x　']
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
      const cfgAfter = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
      expect(cfgAfter).not.toBe(cfgBefore)
      expect(cfgAfter).toMatch(/base:\s*['"]\/myfork\/['"]/)

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

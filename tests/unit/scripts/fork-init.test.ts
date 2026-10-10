import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  parseForkInitArgs,
  runForkInit,
  ForkInitArgError,
} from '../../../scripts/fork-init'

// ─── fixture builder ─────────────────────────────────────────────────────────

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

  w('README.md', 'git clone https://github.com/BrowserLaboratory/wxl-platform.git\n')
  w('CONTRIBUTE.md', 'git remote add upstream https://github.com/BrowserLaboratory/wxl-platform.git\n')
  // CHANGELOG carries upstream-slug links — NOT in any hardcoded file list; the scan must cover it.
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

describe('runForkInit — A mode (identity, base, URLs, deploy)', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fork-init-a-'))
    writeFixture(root)
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('rewrites package.json identity and leaves no upstream slug', () => {
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
    const cfg = readFileSync(join(root, '.vitepress/config.mts'), 'utf8')
    // the executable config's socialLinks URL is the one that matters most
    expect(readme + contrib + cfg).not.toContain('BrowserLaboratory/wxl-platform')
    expect(readme + contrib + cfg).toContain('me/myfork')
  })

  it('rewrites the upstream slug in CHANGELOG.md — scan-driven, not a hardcoded file list', () => {
    // A-mode must reach every slug-bearing active file, not just README/CONTRIBUTE/config.
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
    const cl = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
    expect(cl).not.toContain('BrowserLaboratory/wxl-platform')
    expect(cl).toContain('me/myfork/pull/1')
    expect(cl).toContain('me/myfork/issues/2')
  })

  it('does not treat an active .vitepress/dist-* sibling as build output (path-segment boundary)', () => {
    runForkInit(parseForkInitArgs(A_ARGS), { projectRoot: root })
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

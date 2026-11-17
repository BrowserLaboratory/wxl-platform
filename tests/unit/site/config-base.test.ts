import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, symlinkSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { LOCALES } from '../../../.vitepress/locales'
import { readPrimaryLocale } from '../../../.vitepress/primary-locale'
import { upstreamOnlySkipReason, readManifest, isGitWorkTree, hasRootRangeJson } from '../../__helpers__/upstreamDecision'

// ─── The "fixture root" mechanism (B14, B16, B47 preamble) ─────────────────────────────────────
// A temporary repository root, holding a minimal new-layout `platform/` tree, an optional
// `range.json`, and a copy of `.vitepress` with `node_modules` symlinked to the repository's.
// Importing the copy after `vi.resetModules()` observes the real configuration module without a
// spy. `server.fs.allow` in `vitest.config.ts` is what lets vite-node load a module from here.

const REPO_ROOT = resolve(__dirname, '../../..')
const fixtureRoots: string[] = []
afterEach(() => {
  for (const dir of fixtureRoots.splice(0)) rmSync(dir, { recursive: true, force: true })
})

interface FixtureRootOptions {
  /** Written at the fixture root itself — the one `range.json` that should ever be read. */
  rangeJson?: string
  /** A decoy, to prove the build does not read `range.json` from inside `platform/`. */
  platformRangeJson?: string
  /** A decoy, to prove the build does not read `range.json` from inside `.vitepress/`. */
  vitepressRangeJson?: string
}

function buildFixtureRoot(opts: FixtureRootOptions = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'wxl-config-fixture-'))
  fixtureRoots.push(root)
  cpSync(resolve(REPO_ROOT, '.vitepress'), join(root, '.vitepress'), { recursive: true })
  symlinkSync(resolve(REPO_ROOT, 'node_modules'), join(root, 'node_modules'), 'dir')
  mkdirSync(join(root, 'platform', 'en'), { recursive: true })
  mkdirSync(join(root, 'platform', 'zh-TW'), { recursive: true })
  writeFileSync(join(root, 'platform', 'en', 'index.md'), '---\nlayout: home\n---\n# en\n')
  writeFileSync(join(root, 'platform', 'zh-TW', 'index.md'), '---\nlayout: home\n---\n# zh-TW\n')
  if (opts.rangeJson !== undefined) writeFileSync(join(root, 'range.json'), opts.rangeJson)
  if (opts.platformRangeJson !== undefined) {
    writeFileSync(join(root, 'platform', 'range.json'), opts.platformRangeJson)
  }
  if (opts.vitepressRangeJson !== undefined) {
    writeFileSync(join(root, '.vitepress', 'range.json'), opts.vitepressRangeJson)
  }
  return root
}

async function importFixtureConfig(root: string) {
  vi.resetModules()
  const url = pathToFileURL(join(root, '.vitepress', 'config.mts')).href
  const mod = (await import(/* @vite-ignore */ url)) as {
    default: { vite?: { define?: Record<string, unknown> }; base?: string }
  }
  return mod.default
}

// The site's base path is decided once, from SITE_BASE, and the three head
// hrefs follow it: VitePress prefixes `base` onto its own assets but not onto
// hrefs written inside `head`. Each case imports the config module afresh,
// because the base is computed when the module is evaluated.

type HeadEntry = [string, Record<string, string>]

async function loadConfig(siteBase: string | undefined, cfPages?: string, smokePages?: string) {
  vi.resetModules()
  if (smokePages === undefined) delete process.env.WXL_SMOKE_PAGES
  else process.env.WXL_SMOKE_PAGES = smokePages
  if (siteBase === undefined) delete process.env.SITE_BASE
  else process.env.SITE_BASE = siteBase
  if (cfPages === undefined) delete process.env.CF_PAGES
  else process.env.CF_PAGES = cfPages
  const mod = await import('../../../.vitepress/config.mts')
  const config = mod.default as {
    base?: string
    head?: HeadEntry[]
    srcExclude?: string[]
    vite?: { define?: Record<string, unknown> }
  }
  const hrefs = (config.head ?? []).map(([, attrs]) => attrs.href)
  return {
    base: config.base,
    hrefs,
    shortLinks: config.vite?.define?.__WXL_SHORT_LINKS__,
    srcExclude: config.srcExclude ?? [],
    pages: JSON.parse(String(config.vite?.define?.__WXL_PAGES__ ?? '[]')) as string[],
  }
}

const original = process.env.SITE_BASE
const originalCfPages = process.env.CF_PAGES
const originalSmokePages = process.env.WXL_SMOKE_PAGES
afterEach(() => {
  if (originalSmokePages === undefined) delete process.env.WXL_SMOKE_PAGES
  else process.env.WXL_SMOKE_PAGES = originalSmokePages
  if (original === undefined) delete process.env.SITE_BASE
  else process.env.SITE_BASE = original
  if (originalCfPages === undefined) delete process.env.CF_PAGES
  else process.env.CF_PAGES = originalCfPages
})

describe('site base from SITE_BASE', () => {
  it('serves at the root when SITE_BASE is unset', async () => {
    const { base, hrefs } = await loadConfig(undefined)
    expect(base).toBe('/')
    expect(hrefs).toEqual(['/favicon.svg', '/favicon.png', '/apple-touch-icon.png'])
  })

  it('treats an empty SITE_BASE as unset', async () => {
    // configure-pages reports a root site's base_path as "", so the workflow
    // sets SITE_BASE to "/"; a hand-set empty value must not yield base "".
    const { base, hrefs } = await loadConfig('')
    expect(base).toBe('/')
    expect(hrefs).toEqual(['/favicon.svg', '/favicon.png', '/apple-touch-icon.png'])
  })

  it.each(['/x/', '/a/b/'])('prefixes the base and the head hrefs with %s', async (siteBase) => {
    const { base, hrefs } = await loadConfig(siteBase)
    expect(base).toBe(siteBase)
    expect(hrefs).toEqual([
      `${siteBase}favicon.svg`,
      `${siteBase}favicon.png`,
      `${siteBase}apple-touch-icon.png`,
    ])
  })

  it.each(['/sub', 'sub/', '/../', '/./', '/a/../', '/a b/'])(
    'refuses SITE_BASE %j, naming the variable',
    async (siteBase) => {
      await expect(loadConfig(siteBase)).rejects.toThrow(/SITE_BASE/)
    },
  )
})

// The link mode is fixed once per build (spec 0007, mode rule): only Cloudflare Pages' own
// build sets CF_PAGES to exactly `1`, and only that value selects short links. The constant is
// handed to the bundle as source text, like the Vue flags beside it, so the bundle sees a
// boolean — hence the strings 'true' and 'false', not booleans.
describe('link mode from CF_PAGES', () => {
  it('is the source text true for CF_PAGES=1 (M01)', async () => {
    const { shortLinks } = await loadConfig(undefined, '1')
    expect(shortLinks).toBe('true')
  })

  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['0', '0'],
    ['true', 'true'],
    ['a leading space', ' 1'],
    ['a trailing space', '1 '],
  ])('is the source text false when CF_PAGES is %s (M02, M03)', async (_label, cfPages) => {
    const { shortLinks } = await loadConfig(undefined, cfPages)
    expect(shortLinks).toBe('false')
  })
})

// M04: CF_PAGES changes nothing but the mode. Every SITE_BASE case above, again under every
// CF_PAGES value of the mode rule.
describe.each([undefined, '1', '', '0', 'true', ' 1', '1 '])('site base with CF_PAGES %j (M04)', (cfPages) => {
  it.each([
    [undefined, '/'],
    ['', '/'],
    ['/x/', '/x/'],
    ['/a/b/', '/a/b/'],
  ])('SITE_BASE %j gives base %j and matching head hrefs', async (siteBase, expected) => {
    const { base, hrefs } = await loadConfig(siteBase, cfPages)
    expect(base).toBe(expected)
    expect(hrefs).toEqual([`${expected}favicon.svg`, `${expected}favicon.png`, `${expected}apple-touch-icon.png`])
  })

  it.each(['/sub', 'sub/', '/../', '/./', '/a/../', '/a b/'])(
    'still refuses SITE_BASE %j, naming the variable',
    async (siteBase) => {
      await expect(loadConfig(siteBase, cfPages)).rejects.toThrow(/SITE_BASE/)
    },
  )
})

// The shipped primary locale (D31, D21): comes only from the root range.json, never from an
// environment variable, so it survives whichever other env combination a build runs with.
describe('the shipped primary locale (B14, B47)', () => {
  const ENV_VARS = ['SITE_BASE', 'CF_PAGES', 'WXL_SMOKE_PAGES', 'WXL_PRIMARY_LOCALE'] as const
  const originals = Object.fromEntries(ENV_VARS.map((name) => [name, process.env[name]]))
  afterEach(() => {
    for (const name of ENV_VARS) {
      if (originals[name] === undefined) delete process.env[name]
      else process.env[name] = originals[name]
    }
  })

  async function loadRealDefine() {
    vi.resetModules()
    const mod = (await import('../../../.vitepress/config.mts')) as {
      default: { vite?: { define?: Record<string, unknown> } }
    }
    return mod.default.vite?.define
  }

  const COMBOS: Array<[string | undefined, string | undefined, string | undefined, string | undefined]> = []
  for (const siteBase of [undefined, '/repo/']) {
    for (const cfPages of [undefined, '1']) {
      for (const smoke of [undefined, '1']) {
        for (const primaryEnv of [undefined, 'en']) {
          COMBOS.push([siteBase, cfPages, smoke, primaryEnv])
        }
      }
    }
  }

  function setEnv(siteBase: string | undefined, cfPages: string | undefined, smoke: string | undefined, primaryEnv: string | undefined) {
    for (const [name, value] of [
      ['SITE_BASE', siteBase],
      ['CF_PAGES', cfPages],
      ['WXL_SMOKE_PAGES', smoke],
      ['WXL_PRIMARY_LOCALE', primaryEnv],
    ] as const) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }

  // The real tree's value is upstream's own (a range sets its own root range.json): upstream-only
  // through the D124 helper.
  describe.skipIf(
    upstreamOnlySkipReason(process.env.GITHUB_REPOSITORY, readManifest(REPO_ROOT), isGitWorkTree(REPO_ROOT), hasRootRangeJson(REPO_ROOT)),
  )('the real tree (upstream-only, D124)', () => {
    it.each(COMBOS)(
      'B14: real tree gives "zh-TW" regardless of env (SITE_BASE=%j CF_PAGES=%j WXL_SMOKE_PAGES=%j WXL_PRIMARY_LOCALE=%j)',
      async (siteBase, cfPages, smoke, primaryEnv) => {
        setEnv(siteBase, cfPages, smoke, primaryEnv)
        const define = await loadRealDefine()
        expect(define?.__WXL_PRIMARY_LOCALE__).toBe('"zh-TW"')
      },
    )

    it('B47: the real tree\'s value is a JSON string, not a bare identifier', async () => {
      const define = await loadRealDefine()
      expect(define?.__WXL_PRIMARY_LOCALE__).toBe(JSON.stringify('zh-TW'))
    })
  })

  it('B14, B47: a fixture root with {"primaryLocale":"en"} gives the JSON string "en"', async () => {
    const root = buildFixtureRoot({
      rangeJson: '{"primaryLocale":"en"}',
      platformRangeJson: '{"primaryLocale":"zh-TW"}',
      vitepressRangeJson: '{"primaryLocale":"zh-TW"}',
    })
    const config = await importFixtureConfig(root)
    expect(config.vite?.define?.__WXL_PRIMARY_LOCALE__).toBe('"en"')
  })

  it.each(COMBOS)(
    'B14: a fixture root with {"primaryLocale":"en"} gives "en" regardless of env (SITE_BASE=%j CF_PAGES=%j WXL_SMOKE_PAGES=%j WXL_PRIMARY_LOCALE=%j)',
    async (siteBase, cfPages, smoke, primaryEnv) => {
      setEnv(siteBase, cfPages, smoke, primaryEnv)
      const root = buildFixtureRoot({
        rangeJson: '{"primaryLocale":"en"}',
        platformRangeJson: '{"primaryLocale":"zh-TW"}',
        vitepressRangeJson: '{"primaryLocale":"zh-TW"}',
      })
      const config = await importFixtureConfig(root)
      expect(config.vite?.define?.__WXL_PRIMARY_LOCALE__).toBe('"en"')
    },
  )
})

// The SITE_BASE check runs before range.json is even read (D123): a broken range.json must not
// mask a broken SITE_BASE, or vice versa.
describe('SITE_BASE is checked before range.json (B16)', () => {
  it('rejects with /SITE_BASE/, not PL-E03, when both are broken', async () => {
    const root = buildFixtureRoot({ rangeJson: '{' })
    process.env.SITE_BASE = 'x'
    try {
      vi.resetModules()
      const url = pathToFileURL(join(root, '.vitepress', 'config.mts')).href
      await expect(import(/* @vite-ignore */ url)).rejects.toThrow(/SITE_BASE/)
    } finally {
      delete process.env.SITE_BASE
    }
  })

  it('control: the same broken range.json alone rejects with PL-E03', async () => {
    const root = buildFixtureRoot({ rangeJson: '{' })
    delete process.env.SITE_BASE
    await expect(importFixtureConfig(root)).rejects.toThrow(/PL-E03/)
  })
})

// "Source path → URL" (traceability.md, upstream-only through the D124 helper: the table names
// upstream's own 28 pages).
const SOURCE_PATH_TO_URL: Array<[string, string]> = [
  ['en/index.md', '/en/'],
  ['en/challenges.md', '/en/challenges'],
  ['en/guide/index.md', '/en/guide/'],
  ['en/guide/python.md', '/en/guide/python'],
  ['en/guide/network.md', '/en/guide/network'],
  ['en/guide/browser.md', '/en/guide/browser'],
  ['en/guide/notes.md', '/en/guide/notes'],
  ['en/guide/troubleshooting.md', '/en/guide/troubleshooting'],
  ['en/guide/workshop.md', '/en/guide/workshop'],
  ['en/reference/attack-log-export-format.md', '/en/reference/attack-log-export-format'],
  ['en/challenge/door-is-open/index.md', '/en/challenge/door-is-open/'],
  ['en/challenge/just-a-preview/index.md', '/en/challenge/just-a-preview/'],
  ['en/challenge/selected-excerpts/index.md', '/en/challenge/selected-excerpts/'],
  ['en/challenge/staff-only/index.md', '/en/challenge/staff-only/'],
  ['zh-TW/index.md', '/'],
  ['zh-TW/challenges.md', '/challenges'],
  ['zh-TW/guide/index.md', '/guide/'],
  ['zh-TW/guide/python.md', '/guide/python'],
  ['zh-TW/guide/network.md', '/guide/network'],
  ['zh-TW/guide/browser.md', '/guide/browser'],
  ['zh-TW/guide/notes.md', '/guide/notes'],
  ['zh-TW/guide/troubleshooting.md', '/guide/troubleshooting'],
  ['zh-TW/guide/workshop.md', '/guide/workshop'],
  ['zh-TW/reference/attack-log-export-format.md', '/reference/attack-log-export-format'],
  ['zh-TW/challenge/door-is-open/index.md', '/challenge/door-is-open/'],
  ['zh-TW/challenge/just-a-preview/index.md', '/challenge/just-a-preview/'],
  ['zh-TW/challenge/selected-excerpts/index.md', '/challenge/selected-excerpts/'],
  ['zh-TW/challenge/staff-only/index.md', '/challenge/staff-only/'],
]

/** The URL entry's file form (`/` → `index.md`, `/guide/` → `guide/index.md`, `/x` → `x.md`). */
function fileForm(entry: string): string {
  return (entry.endsWith('/') ? `${entry}index` : entry).slice(1) + '.md'
}

describe.skipIf(
  upstreamOnlySkipReason(process.env.GITHUB_REPOSITORY, readManifest(REPO_ROOT), isGitWorkTree(REPO_ROOT), hasRootRangeJson(REPO_ROOT)),
)('rewrites is the function rewrittenPath(·, primary) (B40)', () => {
  it('on the real tree, config.rewrites is a function returning the zh-TW column\'s file form', async () => {
    delete process.env.SITE_BASE
    vi.resetModules()
    const mod = (await import('../../../.vitepress/config.mts')) as {
      default: { rewrites?: (id: string) => string }
    }
    expect(typeof mod.default.rewrites).toBe('function')
    for (const [source, zhTwEntry] of SOURCE_PATH_TO_URL) {
      expect(mod.default.rewrites!(source)).toBe(fileForm(zhTwEntry))
    }
  })
})

// transformPageData reads a challenge page's body through filePath (never relativePath, D78),
// with area Y's assembly wired in (B50–B52). D108's move has landed, so the fixture below needs
// only its own `challenge.yaml`, per the B50 boundary note.
describe('transformPageData (B50–B52)', () => {
  function buildTransformFixtureSrcDir(): string {
    const root = mkdtempSync(join(tmpdir(), 'wxl-transform-fixture-'))
    fixtureRoots.push(root)
    mkdirSync(join(root, 'platform', 'zh-TW', 'challenge', 'x'), { recursive: true })
    mkdirSync(join(root, 'platform', 'en', 'challenge', 'x'), { recursive: true })
    mkdirSync(join(root, 'platform', 'challenge', 'x'), { recursive: true })
    writeFileSync(join(root, 'platform', 'zh-TW', 'challenge', 'x', 'index.md'), '---\nlayout: challenge\n---\n# zh body\n')
    writeFileSync(join(root, 'platform', 'en', 'challenge', 'x', 'index.md'), '---\nlayout: challenge\n---\n# en body\n')
    writeFileSync(join(root, 'platform', 'challenge', 'x', 'challenge.yaml'), 'number: 1\n')
    return join(root, 'platform')
  }

  async function loadRealConfig() {
    vi.resetModules()
    delete process.env.SITE_BASE
    const mod = (await import('../../../.vitepress/config.mts')) as {
      default: { transformPageData?: (pageData: Record<string, unknown>, ctx: unknown) => void }
    }
    return mod.default
  }

  it('B50: a primary-folder challenge page is read through filePath, not relativePath', async () => {
    const srcDir = buildTransformFixtureSrcDir()
    const config = await loadRealConfig()
    const pageData: Record<string, unknown> = {
      relativePath: 'challenge/x/index.md',
      filePath: 'zh-TW/challenge/x/index.md',
      frontmatter: { layout: 'challenge' },
    }
    config.transformPageData!(pageData, { siteConfig: { srcDir } })
    expect((pageData.frontmatter as Record<string, unknown>).markdownBody).toBe('# zh body\n')
  })

  it('B51: a non-primary challenge page (relativePath === filePath)', async () => {
    const srcDir = buildTransformFixtureSrcDir()
    const config = await loadRealConfig()
    const pageData: Record<string, unknown> = {
      relativePath: 'en/challenge/x/index.md',
      filePath: 'en/challenge/x/index.md',
      frontmatter: { layout: 'challenge' },
    }
    config.transformPageData!(pageData, { siteConfig: { srcDir } })
    expect((pageData.frontmatter as Record<string, unknown>).markdownBody).toBe('# en body\n')
  })

  it.each([
    ['doc', { layout: 'doc' }],
    ['no layout at all', {}],
  ])('B52: %s gets no body', async (_label, frontmatter) => {
    const srcDir = buildTransformFixtureSrcDir()
    mkdirSync(join(srcDir, 'zh-TW', 'guide'), { recursive: true })
    writeFileSync(join(srcDir, 'zh-TW', 'guide', 'a.md'), '---\n---\n# a\n')
    const config = await loadRealConfig()
    const pageData: Record<string, unknown> = {
      relativePath: 'guide/a.md',
      filePath: 'zh-TW/guide/a.md',
      frontmatter,
    }
    config.transformPageData!(pageData, { siteConfig: { srcDir } })
    expect((pageData.frontmatter as Record<string, unknown>).markdownBody).toBeUndefined()
  })
})

// Title and description stay site-level; fork:init's own anchors stay single (B60, B77).
describe('title, description, ignoreDeadLinks and the fork:init anchors (B60, B77)', () => {
  // D153: fork:init's A6 rewrites the site title and description, so their literal values hold
  // only on upstream itself.
  it.skipIf(
    upstreamOnlySkipReason(process.env.GITHUB_REPOSITORY, readManifest(REPO_ROOT), isGitWorkTree(REPO_ROOT), hasRootRangeJson(REPO_ROOT)),
  )('B60: title and description are today\'s strings', async () => {
    vi.resetModules()
    delete process.env.SITE_BASE
    const mod = (await import('../../../.vitepress/config.mts')) as {
      default: { title?: string; description?: string }
    }
    expect(mod.default.title).toBe('Web eXploitation Laboratory')
    expect(mod.default.description).toBe('Browser-based web exploitation challenge platform powered by WASM')
  })

  it('B60: exactly one A6 candidate line and one siteBase declaration', async () => {
    const { A6_CANDIDATE_RE } = await import('../../../scripts/fork-init')
    const source = readFileSync(resolve(REPO_ROOT, '.vitepress/config.mts'), 'utf8')
    const lines = source.split(/\r?\n/)
    expect(lines.filter((line) => A6_CANDIDATE_RE.test(line))).toHaveLength(1)
    expect(lines.filter((line) => line.includes('const siteBase = '))).toHaveLength(1)
  })

  it('B77: ignoreDeadLinks is unset', async () => {
    vi.resetModules()
    delete process.env.SITE_BASE
    const mod = (await import('../../../.vitepress/config.mts')) as { default: { ignoreDeadLinks?: unknown } }
    expect(mod.default.ignoreDeadLinks).toBeUndefined()
  })
})

// `challenge/<slug>/src/**`, `public/**` and `shared/**` are not pages (B24, B25). D49 adds smoke-
// fixture entries in a production build, so this is an `arrayContaining`, not an exact match.
describe('srcExclude (B24, B25)', () => {
  it('contains challenge/*/src/**, public/** and shared/**', async () => {
    vi.resetModules()
    delete process.env.SITE_BASE
    const mod = (await import('../../../.vitepress/config.mts')) as { default: { srcExclude?: string[] } }
    expect(mod.default.srcExclude).toEqual(
      expect.arrayContaining(['challenge/*/src/**', 'public/**', 'shared/**']),
    )
  })
})

// L34 (D49, L-§4.5): only the exact string '1' publishes the smoke fixtures. The two fixture entries
// are L-§4.5's URLs for each primary locale, typed by hand and chosen by the real range.json (D54).
describe('WXL_SMOKE_PAGES (L34)', () => {
  const FIXTURE_ENTRIES = {
    'zh-TW': ['/en/smoke-fixtures/english-only', '/smoke-fixtures/traditional-chinese-only'],
    en: ['/smoke-fixtures/english-only', '/zh-TW/smoke-fixtures/traditional-chinese-only'],
  } as const
  const primary = readPrimaryLocale(resolve(REPO_ROOT, 'range.json'))

  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['0', '0'],
    ['true', 'true'],
    ['a leading space', ' 1'],
    ['a trailing space', '1 '],
    ['01', '01'],
    ['1', '1'],
  ])('flag %s: srcExclude and the page list agree with the flag', async (_label, flag) => {
    const { srcExclude, pages } = await loadConfig(undefined, undefined, flag)
    const published = flag === '1'
    for (const code of LOCALES) {
      expect(srcExclude.includes(`${code}/smoke-fixtures/**`)).toBe(!published)
    }
    for (const entry of FIXTURE_ENTRIES[primary]) {
      expect(pages.includes(entry)).toBe(published)
    }
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'

// The site's base path is decided once, from SITE_BASE, and the three head
// hrefs follow it: VitePress prefixes `base` onto its own assets but not onto
// hrefs written inside `head`. Each case imports the config module afresh,
// because the base is computed when the module is evaluated.

type HeadEntry = [string, Record<string, string>]

async function loadConfig(siteBase: string | undefined, cfPages?: string) {
  vi.resetModules()
  if (siteBase === undefined) delete process.env.SITE_BASE
  else process.env.SITE_BASE = siteBase
  if (cfPages === undefined) delete process.env.CF_PAGES
  else process.env.CF_PAGES = cfPages
  const mod = await import('../../../.vitepress/config.mts')
  const config = mod.default as {
    base?: string
    head?: HeadEntry[]
    vite?: { define?: Record<string, unknown> }
  }
  const hrefs = (config.head ?? []).map(([, attrs]) => attrs.href)
  return { base: config.base, hrefs, shortLinks: config.vite?.define?.__WXL_SHORT_LINKS__ }
}

const original = process.env.SITE_BASE
const originalCfPages = process.env.CF_PAGES
afterEach(() => {
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

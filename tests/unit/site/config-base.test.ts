import { afterEach, describe, expect, it, vi } from 'vitest'

// The site's base path is decided once, from SITE_BASE, and the three head
// hrefs follow it: VitePress prefixes `base` onto its own assets but not onto
// hrefs written inside `head`. Each case imports the config module afresh,
// because the base is computed when the module is evaluated.

type HeadEntry = [string, Record<string, string>]

async function loadConfig(siteBase: string | undefined) {
  vi.resetModules()
  if (siteBase === undefined) delete process.env.SITE_BASE
  else process.env.SITE_BASE = siteBase
  const mod = await import('../../../.vitepress/config.mts')
  const config = mod.default as { base?: string; head?: HeadEntry[] }
  const hrefs = (config.head ?? []).map(([, attrs]) => attrs.href)
  return { base: config.base, hrefs }
}

const original = process.env.SITE_BASE
afterEach(() => {
  if (original === undefined) delete process.env.SITE_BASE
  else process.env.SITE_BASE = original
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

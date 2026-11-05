import { test, expect, type Page } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

// Spec 0008 on the production bundle (`pnpm docs:build`, served by `vitepress preview`): a cold
// load of a missing translation falls back to the page that exists, with the
// missing-translation line, and the learner's stored language survives the trip. The upstream
// tree's one English-only article, the attack-log export format reference, is the subject.

const REFERENCE = '/reference/attack-log-export-format'
const ROOT = process.cwd()

/** Sets the stored language before the first page script of the test, and never again. */
async function storeLocale(page: Page, value: 'en' | 'zh-TW' | null) {
  await page.addInitScript((stored) => {
    if (window.sessionStorage.getItem('smoke-locale-set')) return
    window.sessionStorage.setItem('smoke-locale-set', '1')
    if (stored === null) window.localStorage.removeItem('wxl-locale')
    else window.localStorage.setItem('wxl-locale', stored)
  }, value)
}

const storedLocale = (page: Page) => page.evaluate(() => window.localStorage.getItem('wxl-locale'))

test('the page list spelling matches the pages VitePress published', () => {
  // Both sides are built here: the source pages by the spelling rule, the published pages from
  // the built HTML. Equal sets mean the rule names exactly what the build serves.
  const md: string[] = []
  const walk = (dir: string, top: boolean) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      if (item.name.startsWith('.')) continue
      if (item.isDirectory()) {
        if (top && (item.name === 'public' || item.name === 'shared')) continue
        walk(join(dir, item.name), false)
      } else if (item.name.endsWith('.md')) {
        const rel = relative(join(ROOT, 'platform'), join(dir, item.name)).split(sep).join('/')
        md.push(rel === 'index.md' ? '/' : rel.endsWith('/index.md') ? `/${rel.slice(0, -'index.md'.length)}` : `/${rel.slice(0, -'.md'.length)}`)
      }
    }
  }
  walk(join(ROOT, 'platform'), true)

  const html: string[] = []
  const dist = join(ROOT, '.vitepress/dist')
  const walkDist = (dir: string) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      if (item.isDirectory()) walkDist(join(dir, item.name))
      else if (item.name.endsWith('.html')) {
        const rel = relative(dist, join(dir, item.name)).split(sep).join('/')
        if (rel === '404.html') continue
        html.push(rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel.slice(0, -'.html'.length)}`)
      }
    }
  }
  walkDist(dist)

  expect(new Set(html)).toEqual(new Set(md))
})

for (const stored of [null, 'zh-TW', 'en'] as const) {
  test(`a missing translation falls back to the English page, stored language ${stored ?? 'none'}`, async ({ page }) => {
    await storeLocale(page, stored)
    await page.goto(`/zh-TW${REFERENCE}`)

    await expect(page).toHaveURL(new RegExp(`${REFERENCE}$`))
    const line = page.locator('[data-missing-translation]')
    await expect(line).toBeVisible()
    await expect(line).toHaveAttribute('lang', 'zh-TW')
    await expect(line.locator('[data-missing-translation-text]')).toHaveText('這一頁沒有繁體中文版本，所以顯示英文版。')
    await expect(line.getByRole('link')).toHaveText('前往繁體中文題目清單')
    await expect(line.getByRole('link')).toHaveAttribute('href', '/zh-TW/challenges')
    expect(await storedLocale(page)).toBe(stored)
  })
}

test('a path with no counterpart shows the not-found page, with no line', async ({ page }) => {
  await storeLocale(page, null)
  await page.goto('/zh-TW/no-such-page')
  await expect(page.getByText('PAGE NOT FOUND')).toBeVisible()
  await expect(page.locator('[data-missing-translation]')).toHaveCount(0)
  expect(await storedLocale(page)).toBeNull()
})

test('the HTML as served carries no line', async ({ request }) => {
  const served = await (await request.get(REFERENCE)).text()
  expect(served).not.toContain('data-missing-translation')
})

test('Back after the fallback returns to the page opened before it', async ({ page }) => {
  await storeLocale(page, 'en')
  await page.goto('/challenges')
  await page.goto(`/zh-TW${REFERENCE}`)
  await expect(page).toHaveURL(new RegExp(`${REFERENCE}$`))
  await page.goBack()
  await expect(page).toHaveURL(/\/challenges$/)
})

// D7: every page has one locale menu, the custom switcher; VitePress's three built-in
// translation menus are hidden. Each width opens the menu that holds its built-in list, and
// the list must exist before its hiding means anything.
const BUILT_IN_MENUS = [
  { width: 1280, height: 800, open: null, list: '.VPNavBarTranslations' },
  { width: 1024, height: 768, open: '.VPNavBarExtra button', list: '.VPNavBarExtra .translations' },
  { width: 375, height: 812, open: '.VPNavBarHamburger', list: '.VPNavScreenTranslations' },
] as const

for (const { width, height, open, list } of BUILT_IN_MENUS) {
  test(`at ${width} wide an article shows only the custom locale switcher`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height } })
    const page = await context.newPage()
    await page.goto('/guide/python')
    await expect(page.locator('[data-locale-switcher-toggle]')).toBeVisible()
    if (open) await page.locator(open).first().click()
    await expect(page.locator(list)).toHaveCount(1)
    // `display: none` is this site's rule; a parent menu merely being closed would not set it.
    await expect(page.locator(list)).toHaveCSS('display', 'none')
    await context.close()
  })
}

test('the HTML as served already hides the built-in translation dropdown', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/guide/python')
  await expect(page.locator('.VPNavBarTranslations')).toHaveCount(1)
  await expect(page.locator('.VPNavBarTranslations')).toHaveCSS('display', 'none')
  await context.close()
})

test('a choice in the custom locale switcher on an article is stored', async ({ page }) => {
  await storeLocale(page, 'zh-TW')
  await page.goto('/zh-TW/guide/python')
  await page.locator('[data-locale-switcher-toggle]').click()
  await page.locator('[data-locale-option="en"]').click()
  await expect(page).toHaveURL(/\/guide\/python$/)
  expect(await storedLocale(page)).toBe('en')
})

// Spec 0008, T-0054: the cold-load redirect goes only to a translation that exists, and names it
// by its page-list entry; only a cold load of a published /zh-TW/ page writes the preference,
// decided once the router has rendered it.

/** Records every URL the page's own script puts in the address bar. */
async function recordNavigations(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = []
    ;(window as unknown as { __navigations: string[] }).__navigations = seen
    for (const name of ['pushState', 'replaceState'] as const) {
      const original = history[name].bind(history)
      history[name] = (data: unknown, unused: string, url?: string | URL | null) => {
        if (url != null) seen.push(String(url))
        return original(data, unused, url)
      }
    }
  })
}
const navigations = (page: Page) =>
  page.evaluate(() => (window as unknown as { __navigations: string[] }).__navigations)

/** Waits until the app has mounted and the cold load's own requests have settled. */
async function hydrated(page: Page) {
  await page.waitForFunction(() => Boolean((document.querySelector('#app') as { __vue_app__?: unknown } | null)?.__vue_app__))
  // As site-smoke.spec.ts waits: a page that never goes quiet must not hang the test.
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined)
}

// T-0053's "the detour through a missing translation keeps the stored language" is folded in
// here: the detour it allowed for is gone, and these cases assert the stored language too.
for (const stored of [null, 'zh-TW'] as const) {
  test(`a cold load of an English-only article stays put, with the line, stored ${stored ?? 'none'}`, async ({ page }) => {
    await storeLocale(page, stored)
    await recordNavigations(page)
    await page.goto(REFERENCE)
    await expect(page.locator('[data-missing-translation]')).toBeVisible()
    await expect(page.locator('[data-missing-translation]')).toHaveAttribute('lang', 'zh-TW')
    await hydrated(page)
    await expect(page).toHaveURL(new RegExp(`${REFERENCE}$`))
    // A3: no detour through the missing translation, not even one replaced straight back.
    expect((await navigations(page)).filter((url) => url.includes('/zh-TW/'))).toEqual([])
    expect(await storedLocale(page)).toBe(stored)
  })
}

test('a cold load of an English-only article with en stored shows no line', async ({ page }) => {
  await storeLocale(page, 'en')
  await page.goto(REFERENCE)
  await hydrated(page)
  await expect(page).toHaveURL(new RegExp(`${REFERENCE}$`))
  await expect(page.locator('[data-missing-translation]')).toHaveCount(0)
  expect(await storedLocale(page)).toBe('en')
})

test('a cold load of an alias goes to the counterpart\'s list entry, and writes nothing', async ({ page }) => {
  await storeLocale(page, null)
  // `/challenges.html` renders `challenges.md`; the target is its counterpart's entry. A guard,
  // not a red-before case: the router drops `.html` when it navigates, so the old URL-text target
  // looked the same here. A letter-case alias (`/Challenges`) is the not-found page on the built
  // site, not a page. The unit cases in initial-locale-redirect.test.ts tell the two targets apart.
  await page.goto('/challenges.html')
  await expect(page).toHaveURL(/\/zh-TW\/challenges$/)
  await hydrated(page)
  expect(await storedLocale(page)).toBeNull()
})

test('a cold load of a published /zh-TW/ page stores zh-TW', async ({ page }) => {
  await storeLocale(page, 'en')
  await page.goto('/zh-TW/guide/')
  await hydrated(page)
  await expect.poll(() => storedLocale(page)).toBe('zh-TW')
})

// S-2: the not-found page for a path that is a published page — its chunk did not arrive — is a
// failed load. The URL names a /zh-TW/ page, so only a decision taken after the router has
// rendered can tell it is not one.
test('a failed load of a /zh-TW/ page shows the not-found page and stores nothing', async ({ page }) => {
  await storeLocale(page, 'en')
  await page.route(/\/assets\/zh-TW_challenges\.md\.[^/]*\.js$/, (route) => route.abort())
  await page.goto('/zh-TW/challenges')
  await expect(page.getByText('PAGE NOT FOUND')).toBeVisible()
  await hydrated(page)
  await expect(page.locator('[data-missing-translation]')).toHaveCount(0)
  expect(await storedLocale(page)).toBe('en')
})

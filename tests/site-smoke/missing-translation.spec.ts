import { test, expect, type Page } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { PRIMARY, TRANSLATIONS, localePath } from './localePath'
import { LOCALES, type Locale } from '../../.vitepress/locales.ts'
import { upstreamOnlySkipReason, readManifest, isGitWorkTree, hasRootRangeJson } from '../__helpers__/upstreamDecision'

// Spec 0008 on a test build (`WXL_SMOKE_PAGES=1 pnpm docs:build`, served by `vitepress preview`): a cold
// load of a missing translation falls back to the page that exists, with the
// missing-translation line, and the learner's stored language survives the trip. The subjects are
// the two smoke fixtures (L-§4.5): one article that exists only in English and one that exists
// only in Traditional Chinese, so both directions are covered under either primary locale. They
// are published by a test build only (D49); the `beforeAll` below says so when they are not.

const ROOT = process.cwd()

/** T: the translation locale this suite drives (the first listed locale that is not the primary one). */
const T: Locale = TRANSLATIONS[0]

// L37 (D49, L-§4.5): the two smoke fixtures exist only in a test build, `WXL_SMOKE_PAGES=1 pnpm
// docs:build`. Their URLs follow the build's primary locale (D54).
const EN_ONLY = localePath('en', 'smoke-fixtures/english-only')
const ZH_ONLY = localePath('zh-TW', 'smoke-fixtures/traditional-chinese-only')

// Every test of this file fails at once, with a message naming the flag, when the build under
// test is a production build: the fixtures are missing, so the cases below could not mean anything.
test.beforeAll(async ({ browser }) => {
  const baseURL = test.info().project.use.baseURL
  const page = await browser.newPage({ baseURL })
  try {
    for (const [url, h1] of [
      [EN_ONLY, 'Smoke fixture: English only'],
      [ZH_ONLY, '測試用頁面：只有繁體中文'],
    ] as const) {
      const response = await page.goto(url)
      const heading = (await page.locator('h1').first().textContent({ timeout: 5_000 }).catch(() => null))
        // VitePress appends a zero-width header anchor to the heading text.
        ?.replace(/\u200b/g, '')
        .trim()
      if (response?.status() !== 200 || heading !== h1) {
        throw new Error(
          `${url} is not the smoke fixture (status ${response?.status()}, h1 ${JSON.stringify(heading)}, expected ${JSON.stringify(h1)}). ` +
            'This suite needs a test build: run `WXL_SMOKE_PAGES=1 pnpm docs:build` (or `WXL_SMOKE_PAGES=1 pnpm build`) before `pnpm test:smoke`.',
        )
      }
    }
  } finally {
    await page.close()
  }
})


/** The interface strings of a locale: the same JSON the theme renders from. */
const messages = (locale: Locale) =>
  JSON.parse(readFileSync(join(ROOT, `.vitepress/theme/i18n/messages/${locale}.json`), 'utf8')) as {
    missing_translation: { notice: string; list_link: string }
  }

/** The locale a base-less URL path belongs to: its first segment when that names a non-primary locale. */
const localeOfPath = (path: string): Locale =>
  LOCALES.find((code) => code !== PRIMARY && path.startsWith(`/${code}/`)) ?? PRIMARY

/**
 * `X(path)`: the path with its locale segment swapped for the other locale's, which is the
 * counterpart URL that is not a page (L-§4.7). The two fixtures are each other's counterpart.
 */
function X(path: string): string {
  const own = localeOfPath(path)
  const rest = own === PRIMARY ? path.slice(1) : path.slice(`/${own}/`.length)
  return localePath(LOCALES.find((code) => code !== own)!, rest)
}

const pathnameOf = (page: Page) => new URL(page.url()).pathname

/** Cold load of a fixture (A1, A2, A4, A5): the line it shows, if any, and the value stored afterwards. */
function coldLoadOutcome(pageLocale: Locale, stored: Locale | null) {
  if (pageLocale === PRIMARY) {
    // A primary-locale page: a stored translation locale shows the line in it (A4); none or P show
    // nothing (A1, A2); nothing is written.
    return { line: stored !== null && stored !== PRIMARY ? stored : null, after: stored }
  }
  // A translation page: no line, and the page's own locale is written (A5).
  return { line: null, after: pageLocale }
}

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

/** The vue-i18n runtime locale: the interface's, which a switcher choice that stays must not change. */
const runtimeLocale = (page: Page) =>
  page.evaluate(() => {
    const app = (document.querySelector('#app') as { __vue_app__?: { config: { globalProperties: { $i18n?: { locale: unknown } } } } } | null)?.__vue_app__
    const locale = app?.config.globalProperties.$i18n?.locale
    return typeof locale === 'string' ? locale : (locale as { value?: string } | undefined)?.value
  })

// L39: the source walk below includes the two smoke fixtures unconditionally (L-q6); this suite
// requires a test build, which the `beforeAll` above guarantees.
test('the page list spelling matches the pages VitePress published', () => {
  // Both sides are built here: the source pages by the spelling rule, the published pages from
  // the built HTML. Equal sets mean the rule names exactly what the build serves.
  const md: string[] = []
  const walk = (dir: string, top: boolean, rel = '') => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      if (item.name.startsWith('.')) continue
      if (item.isDirectory()) {
        if (top && (item.name === 'public' || item.name === 'shared')) continue
        const childRel = rel === '' ? item.name : `${rel}/${item.name}`
        // B24: a challenge's application sources are not pages; written independently of the
        // page-list module, this mirrors the `challenge/*/src/**` srcExclude.
        if (/^challenge\/[^/]+\/src$/.test(childRel)) continue
        walk(join(dir, item.name), false, childRel)
      } else if (item.name.endsWith('.md')) {
        // The primary locale's folder is published at the output root (D9): drop its `<P>/` prefix,
        // and nothing else. Written out here, not through the page-list module, so the two sides
        // of the comparison stay independent.
        const source = relative(join(ROOT, 'platform'), join(dir, item.name)).split(sep).join('/')
        const rel = source.startsWith(`${PRIMARY}/`) ? source.slice(PRIMARY.length + 1) : source
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

test('dist/index.html is the Traditional Chinese home and dist/en/index.html the English one (B44, upstream-only)', () => {
  const skipReason = upstreamOnlySkipReason(
    process.env.GITHUB_REPOSITORY, readManifest(ROOT), isGitWorkTree(ROOT), hasRootRangeJson(ROOT),
  )
  test.skip(skipReason !== undefined, skipReason ?? '')
  const dist = (rel: string) => readFileSync(join(ROOT, '.vitepress/dist', rel), 'utf8')
  const hero = (html: string) => html.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? ''
  // The home page's hero text is the one string each language writes for itself.
  expect(hero(dist('index.html'))).toContain('網站滲透實驗室')
  expect(hero(dist('en/index.html'))).toContain('Web Exploitation Laboratory')
  expect(hero(dist('index.html'))).not.toContain('Web Exploitation Laboratory')
  expect(hero(dist('en/index.html'))).not.toContain('網站滲透實驗室')
})

// L-§4.7 row 1 (A14, D27's primary-path case): the not-found path in one locale lands on the
// fixture that exists, with the line in the path's own locale, whatever is stored.
const FALLBACKS = [
  { name: 'a Traditional Chinese-only article asked for in English', subject: X(ZH_ONLY), requested: 'en', lands: ZH_ONLY },
  { name: 'an English-only article asked for in Traditional Chinese', subject: X(EN_ONLY), requested: 'zh-TW', lands: EN_ONLY },
] as const

for (const { name, subject, requested, lands } of FALLBACKS) {
  for (const stored of [null, 'zh-TW', 'en'] as const) {
    test(`a missing translation falls back to the page that exists: ${name}, stored language ${stored ?? 'none'}`, async ({ page }) => {
      await storeLocale(page, stored)
      await page.goto(subject)

      await expect.poll(() => pathnameOf(page)).toBe(lands)
      const line = page.locator('[data-missing-translation]')
      await expect(line).toBeVisible()
      await expect(line).toHaveAttribute('lang', requested)
      await expect(line.locator('[data-missing-translation-text]')).toHaveText(messages(requested).missing_translation.notice)
      await expect(line.getByRole('link')).toHaveText(messages(requested).missing_translation.list_link)
      await expect(line.getByRole('link')).toHaveAttribute('href', localePath(requested, 'challenges'))
      expect(await storedLocale(page)).toBe(stored)
    })
  }
}

// L-§4.7 last sentence (A17): a path under the translation locale's prefix with no page and no
// counterpart is the not-found page, recognised by VitePress's NotFound component.
const NO_PAGE = localePath(T, 'no-such-page')

test('a path with no counterpart shows the not-found page, with no line', async ({ page }) => {
  await storeLocale(page, null)
  await page.goto(NO_PAGE)
  await expect(page.locator('.NotFound')).toBeVisible()
  await expect(page.locator('[data-missing-translation]')).toHaveCount(0)
  expect(await storedLocale(page)).toBeNull()
})

for (const [name, url] of [['English-only', EN_ONLY], ['Traditional Chinese-only', ZH_ONLY]] as const) {
  test(`the HTML as served carries no line: ${name} article`, async ({ request }) => {
    const served = await (await request.get(url)).text()
    expect(served).not.toContain('data-missing-translation')
  })
}

test('Back after the fallback returns to the page opened before it (A20)', async ({ page }) => {
  await storeLocale(page, 'en')
  await page.goto(localePath(PRIMARY, 'challenges'))
  await hydrated(page)
  // A stored translation locale may already have moved the list to its counterpart (A3); whichever
  // list the learner is on is the page Back must return to.
  const before = pathnameOf(page)
  expect(before).toMatch(/\/challenges$/)
  await page.goto(X(ZH_ONLY))
  await expect.poll(() => pathnameOf(page)).toBe(ZH_ONLY)
  await page.goBack()
  await expect.poll(() => pathnameOf(page)).toBe(before)
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

test('a choice in the custom locale switcher on an article is stored, and Back returns (B1)', async ({ page }) => {
  const start = localePath('zh-TW', 'guide/python')
  await storeLocale(page, 'zh-TW')
  await page.goto(start)
  await page.locator('[data-locale-switcher-toggle]').click()
  await page.locator('[data-locale-option="en"]').click()
  await expect.poll(() => pathnameOf(page)).toBe(localePath('en', 'guide/python'))
  expect(await storedLocale(page)).toBe('en')
  // A switcher navigation is a push (spec 0008, B1): the page it left is one Back away.
  await page.evaluate(() => history.back())
  await expect.poll(() => pathnameOf(page)).toBe(start)
})

// Spec 0008, B2, B4, B5: on a page with no version in the chosen locale, the switcher stays — no
// navigation, no history entry, the interface still in the page's locale — with the line at once
// in the chosen locale, and the page's own locale, now offered too, takes the line away. At every
// width the switcher shows at (the menus' hiding is the cases above).
for (const { width, height } of BUILT_IN_MENUS) {
  // L-§4.7 row 4 (A21: SW08/SW09 and SW11): each fixture, asked for in the other locale, stays put.
  for (const { name, url, own, other, storedFirst } of [
    { name: 'a Traditional Chinese-only article', url: ZH_ONLY, own: 'zh-TW', other: 'en', storedFirst: 'zh-TW' },
    { name: 'an English-only article', url: EN_ONLY, own: 'en', other: 'zh-TW', storedFirst: 'en' },
  ] as const) {
    test(`at ${width} wide the switcher stays on ${name}, and the way back removes the line`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height } })
      const page = await context.newPage()
      await storeLocale(page, storedFirst)
      await page.goto(url)
      await hydrated(page)
      const before = await page.evaluate(() => history.length)
      await expect(page.locator('[data-missing-translation]')).toHaveCount(0)

      await page.locator('[data-locale-switcher-toggle]:visible').click()
      await page.locator(`[data-locale-option="${other}"]:visible`).click()
      await expect(page.locator('[data-missing-translation]')).toHaveAttribute('lang', other)
      expect(pathnameOf(page)).toBe(url)
      expect(await page.evaluate(() => history.length)).toBe(before)
      expect(await page.evaluate(() => document.documentElement.lang)).toMatch(own === 'en' ? /^en/ : /^zh/)
      expect(await runtimeLocale(page)).toBe(own)
      expect(await storedLocale(page)).toBe(other)

      await page.locator('[data-locale-switcher-toggle]:visible').click()
      await expect(page.locator('[data-locale-option]:visible')).toHaveCount(2)
      await page.locator(`[data-locale-option="${own}"]:visible`).click()
      await expect(page.locator('[data-missing-translation]')).toHaveCount(0)
      expect(pathnameOf(page)).toBe(url)
      expect(await storedLocale(page)).toBe(own)
      await context.close()
    })
  }

  test(`at ${width} wide the switcher in a challenge page's bar goes to the translation that exists (B1)`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height } })
    const page = await context.newPage()
    await storeLocale(page, 'en')
    await page.goto(localePath('en', 'challenge/selected-excerpts/'))
    await hydrated(page)
    await page.locator('[data-locale-switcher-toggle]:visible').click()
    await page.locator('[data-locale-option="zh-TW"]:visible').click()
    await expect.poll(() => pathnameOf(page)).toBe(localePath('zh-TW', 'challenge/selected-excerpts/'))
    expect(await storedLocale(page)).toBe('zh-TW')
    await context.close()
  })
}

test('on the not-found page a choice with no counterpart is written and stays, with no line (B7)', async ({ page }) => {
  await storeLocale(page, T)
  await page.goto(NO_PAGE)
  await hydrated(page)
  await page.locator('[data-locale-switcher-toggle]:visible').click()
  await page.locator(`[data-locale-option="${PRIMARY}"]:visible`).click()
  // "Stays" is an absence; give a navigation the time it would take before checking for it.
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined)
  await page.waitForTimeout(500)
  expect(pathnameOf(page)).toBe(NO_PAGE)
  await expect(page.locator('[data-missing-translation]')).toHaveCount(0)
  expect(await storedLocale(page)).toBe(PRIMARY)
})

// Spec 0008, T-0054: the cold-load redirect goes only to a translation that exists, and names it
// by its page-list entry; only a cold load of a published translation page writes the preference,
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
// L-§4.7 rows 5 and 6 (A1, A2, A4, A5): a cold load of a fixture never redirects to a counterpart
// that is not there; whether the line shows and what is stored follow the arrival rules.
const COLD_LOADS = [
  { name: 'a Traditional Chinese-only article', url: ZH_ONLY, pageLocale: 'zh-TW', stored: 'en' },
  { name: 'a Traditional Chinese-only article', url: ZH_ONLY, pageLocale: 'zh-TW', stored: null },
  { name: 'an English-only article', url: EN_ONLY, pageLocale: 'en', stored: 'zh-TW' },
  { name: 'a Traditional Chinese-only article', url: ZH_ONLY, pageLocale: 'zh-TW', stored: 'zh-TW' },
] as const

for (const { name, url, pageLocale, stored } of COLD_LOADS) {
  test(`a cold load of ${name} stays put, stored ${stored ?? 'none'}`, async ({ page }) => {
    const { line, after } = coldLoadOutcome(pageLocale, stored)
    await storeLocale(page, stored)
    await recordNavigations(page)
    await page.goto(url)
    await hydrated(page)
    expect(pathnameOf(page)).toBe(url)
    if (line === null) {
      await expect(page.locator('[data-missing-translation]')).toHaveCount(0)
    } else {
      await expect(page.locator('[data-missing-translation]')).toBeVisible()
      await expect(page.locator('[data-missing-translation]')).toHaveAttribute('lang', line)
    }
    // A3 for these pages: no detour through another URL, not even one replaced straight back.
    expect((await navigations(page)).filter((entry) => new URL(entry, page.url()).pathname !== url)).toEqual([])
    await expect.poll(() => storedLocale(page)).toBe(after)
  })
}

test('a cold load of an alias goes to the counterpart\'s list entry, and writes nothing', async ({ page }) => {
  // The learner has stored the translation locale T explicitly (A8): the alias is the primary
  // locale's list page, so its counterpart is T's list.
  await storeLocale(page, T)
  // `/challenges.html` renders `challenges.md`; the target is its counterpart's entry. A guard,
  // not a red-before case: the router drops `.html` when it navigates, so the old URL-text target
  // looked the same here. A letter-case alias (`/Challenges`) is the not-found page on the built
  // site, not a page. The unit cases in initial-locale-redirect.test.ts tell the two targets apart.
  await page.goto(`${localePath(PRIMARY, 'challenges')}.html`)
  await expect.poll(() => pathnameOf(page)).toBe(localePath(T, 'challenges'))
  await hydrated(page)
  expect(await storedLocale(page)).toBe(T)
})

test('a cold load of a published translation page stores its locale', async ({ page }) => {
  await storeLocale(page, PRIMARY)
  await page.goto(localePath(T, 'guide/'))
  await hydrated(page)
  await expect.poll(() => storedLocale(page)).toBe(T)
})

// A15 (D29): the primary locale's pages are served without a prefix, so a path under `/<P>/` is
// not a page; the arrival is a not-found one, and the page that exists at `/X` replaces it, with no
// line, nothing written, and no second redirect after it.
for (const stored of [null, T] as const) {
  test(`a primary-locale page asked for under its own prefix lands on the page, with no line, stored ${stored ?? 'none'}`, async ({ page }) => {
    await storeLocale(page, stored)
    await recordNavigations(page)
    await page.goto(`/${PRIMARY}/guide/python`)
    const landed = localePath(PRIMARY, 'guide/python')
    await expect.poll(() => pathnameOf(page)).toBe(landed)
    await hydrated(page)
    await page.waitForTimeout(500)
    expect(pathnameOf(page)).toBe(landed)
    await expect(page.locator('[data-missing-translation]')).toHaveCount(0)
    expect(await storedLocale(page)).toBe(stored)
  })
}

// A3: a cold load of a primary-locale page with a translation stored goes to its counterpart's
// entry, and the query and the hash survive the trip.
test('a cold load of a primary-locale page with a translation stored goes to its counterpart, query and hash kept', async ({ page }) => {
  await storeLocale(page, T)
  await page.goto(`${localePath(PRIMARY, 'guide/python')}?q=1#h`)
  await expect
    .poll(() => page.evaluate(() => location.pathname + location.search + location.hash))
    .toBe(`${localePath(T, 'guide/python')}?q=1#h`)
  await hydrated(page)
  await expect(page.locator('[data-missing-translation]')).toHaveCount(0)
  expect(await storedLocale(page)).toBe(T)
})

// S-2: the not-found page for a path that is a published page — its chunk did not arrive — is a
// failed load. The URL names a translation page, so only a decision taken after the router has
// rendered can tell it is not one (A5, A19, A25). VitePress names a chunk `<dir>_<page>.md.<hash>.js`.
test('a failed load of a translation page shows the not-found page and stores nothing', async ({ page }) => {
  await storeLocale(page, PRIMARY)
  let intercepted = 0
  await page.route(new RegExp(`/assets/${T}_challenges\\.md\\.[^/]*\\.js$`), (route) => {
    intercepted += 1
    return route.abort()
  })
  await page.goto(localePath(T, 'challenges'))
  await expect(page.locator('.NotFound')).toBeVisible()
  await hydrated(page)
  expect(intercepted).toBeGreaterThan(0)
  await expect(page.locator('[data-missing-translation]')).toHaveCount(0)
  expect(await storedLocale(page)).toBe(PRIMARY)
  expect(pathnameOf(page)).toBe(localePath(T, 'challenges'))
})

import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { SITE_ORIGIN } from '../../.vitepress/challenge/shortLink'
import { realUpstreamDecision } from '../__helpers__/upstreamDecision'

// Site-smoke runs against the built site served by `vitepress preview` (4173,
// configured in playwright.site.config.ts). It asserts the production bundle
// renders — it is NOT a challenge-solve test (that is challenge-verify L3 under
// tests/challenges). Selectors target stable rendered content (hero action
// labels, feature titles, the challenge description panel) rather than
// VitePress-internal class names, so they survive VitePress version bumps.

test('homepage renders', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/')

  // Hero action + a feature card prove the home layout and HomeContent mounted.
  await expect(page.getByRole('link', { name: 'Start Challenge' })).toBeVisible()
  await expect(page.getByText('Browser Emulator')).toBeVisible()

  expect(pageErrors, `uncaught page errors on homepage: ${pageErrors.join(' | ')}`).toEqual([])
})

test('reference challenge page mounts', async ({ page }) => {
  await page.goto('/challenge/door-is-open/')

  // The ChallengeLayout shell renders the description panel and markdown body
  // immediately, independent of the WASM runtime boot (which is out of scope
  // for a smoke check).
  // Assert on the panel's own text rather than a child locator: the client name
  // appears once per brief section, so getByText would resolve to many nodes and
  // fail Playwright's strict mode on prose edits that change nothing structural.
  const descriptionPanel = page.locator('[data-description-panel]')
  await expect(descriptionPanel).toBeVisible()
  await expect(descriptionPanel).toContainText('FileHub')
})

// The address bar is not decided by whatever we hand `router.go`. After a page
// loads, VitePress recomputes the pathname from the page's `relativePath` and
// `replaceState`s to it, appending `.html` unless `cleanUrls` is on. So the URL
// shape is a build-config property, and only a real navigation in a real
// browser observes it — a unit test on the redirect helper cannot.
//
// The shape matters because Cloudflare Pages serves this site extensionless:
// `/challenges` answers 200 and `/challenges.html` 308s away from itself. An
// address bar holding the `.html` form hands out links the server redirects.
//
// NOT COVERED: this asserts the shape after client-side routing only. Whether
// the host serves the extensionless form is the host's behaviour, verified by
// request against production, not by this file.
test('client-side navigation leaves an extensionless URL in the address bar', async ({ page }) => {
  await page.goto('/')

  // Wait for hydration before clicking. The URL correction lives in the client
  // router's `loadPage`, so it only runs when the click is intercepted as an SPA
  // navigation. Click too early and the browser performs a full page load, no
  // correction happens, and the address bar keeps whatever shape the href had —
  // which is how the first version of this test passed locally and failed in CI
  // with `/challenges/`. Vue sets `__vue_app__` on the mount container, so its
  // presence is the mount having completed.
  await page.waitForFunction(() => '__vue_app__' in (document.getElementById('app') ?? {}))

  // A marker that a full page load would wipe. Asserting it survived proves the
  // navigation was client-side, so a failure below cannot be a silent full load
  // masquerading as a wrong URL shape.
  await page.evaluate(() => { (window as unknown as Record<string, unknown>).__spaMarker = 1 })
  await page.getByRole('link', { name: 'Challenges', exact: true }).first().click()
  await expect(page.locator('h1')).toBeVisible()
  const survivedFullLoad = await page.evaluate(
    () => (window as unknown as Record<string, unknown>).__spaMarker === 1,
  )
  expect(survivedFullLoad, 'the click caused a full page load, not an SPA navigation').toBe(true)

  // Poll rather than sample once. The heading becoming visible does not mean the
  // router has finished correcting the address bar — the two are not ordered —
  // so a single read catches the pre-correction `/challenges/` about half the
  // time. Measured on a preview deployment without any other change: 4 runs, 2 failures, all
  // of them this same trailing slash. Polling asserts the settled value and
  // still fails if the correction never happens.
  await expect
    .poll(() => new URL(page.url()).pathname, {
      message: 'the client router never corrected the address bar',
    })
    .toBe('/challenges')

  const pathname = new URL(page.url()).pathname
  expect(pathname, `address bar kept an .html form: ${pathname}`).not.toMatch(/\.html$/)
})

// ─── The copy control in page mode (spec 0007, seam 0007-S3) ──────────────────────────────────
//
// CI builds without CF_PAGES, and so does `pnpm docs:build` here, so the built site is in page
// mode: the copy control shows and copies the challenge page's URL. Expected values are built from
// the imported SITE_ORIGIN with plain string operations. Short mode in a built site is checked on
// the Cloudflare preview at stage 8 (V01), the only surface whose build sets CF_PAGES.

type Locale = 'en' | 'zh-TW'
interface SitePage { name: string; path: string; locale: Locale; challenge: boolean }

// "Each page" of traceability.md's built-site rows.
const SITE_PAGES: SitePage[] = [
  { name: 'English list', path: '/challenges', locale: 'en', challenge: false },
  { name: 'Traditional Chinese list', path: '/zh-TW/challenges', locale: 'zh-TW', challenge: false },
  { name: 'English selected-excerpts', path: '/challenge/selected-excerpts/', locale: 'en', challenge: true },
  { name: 'Traditional Chinese selected-excerpts', path: '/zh-TW/challenge/selected-excerpts/', locale: 'zh-TW', challenge: true },
]
const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
]

/** The page URL of a challenge: SITE_ORIGIN followed by the page's path, no base added. */
function pageUrlOf(locale: Locale, slug: string): string {
  return `${SITE_ORIGIN}${locale === 'zh-TW' ? '/zh-TW' : ''}/challenge/${slug}/`
}
const withoutScheme = (url: string) => url.replace(/^https?:\/\//, '')

type Messages = { short_link: { copied: string; copy_failed: string } }
const MESSAGES: Record<Locale, Messages> = {
  en: JSON.parse(readFileSync('.vitepress/theme/i18n/messages/en.json', 'utf8')),
  'zh-TW': JSON.parse(readFileSync('.vitepress/theme/i18n/messages/zh-TW.json', 'utf8')),
}

/**
 * Opens a page at its own locale with a clipboard the test can steer: `real` hands the text to
 * the browser's clipboard, `resolve` accepts it without touching the clipboard, `reject` refuses it
 * the way a denied permission does. Set before any page script runs.
 */
async function openSitePage(page: Page, target: SitePage, extraInit?: () => void) {
  await page.addInitScript((locale) => {
    window.localStorage.setItem('wxl-locale', locale)
    const w = window as unknown as Record<string, unknown>
    // S03: counts the router's client-side navigations, which a click on the URL text must not start.
    w.__wxlPushStates = 0
    const pushState = history.pushState.bind(history)
    history.pushState = (...args: Parameters<History['pushState']>) => {
      w.__wxlPushStates = (w.__wxlPushStates as number) + 1
      return pushState(...args)
    }
    w.__wxlClipboard = 'resolve'
    const clipboard = navigator.clipboard
    if (!clipboard) return
    const real = clipboard.writeText.bind(clipboard)
    Object.defineProperty(clipboard, 'writeText', {
      configurable: true,
      value: (text: string) => {
        if (w.__wxlClipboard === 'reject') return Promise.reject(new DOMException('denied', 'NotAllowedError'))
        if (w.__wxlClipboard === 'resolve') return Promise.resolve()
        return real(text)
      },
    })
  }, target.locale)
  if (extraInit) await page.addInitScript(extraInit)
  await page.goto(target.path)
  await waitForHydration(page)
}

/** How many client-side navigations the router has started on this page (`openSitePage`'s counter). */
const pushStates = (page: Page) => page.evaluate(() => (window as unknown as Record<string, unknown>).__wxlPushStates as number)

async function waitForHydration(page: Page) {
  await page.waitForFunction(() => '__vue_app__' in (document.getElementById('app') ?? {}))
  await expect(page.locator('[data-short-link]').first()).toBeAttached()
}

/** Every shown URL text: a `[data-short-link]` that neither it nor any ancestor hides. */
async function shownUrlTexts(page: Page) {
  return page.locator('[data-short-link]').evaluateAll((els) =>
    els
      .filter((el) => {
        for (let n: Element | null = el; n; n = n.parentElement) if (getComputedStyle(n).display === 'none') return false
        return true
      })
      .map((el) => {
        const cs = getComputedStyle(el)
        const row = el.closest('a.ch-list-row')
        // The 6ch width: `000000` set in the URL text's computed font, measured in the page.
        const probe = document.createElement('span')
        probe.textContent = '000000'
        Object.assign(probe.style, {
          position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap',
          fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, letterSpacing: cs.letterSpacing,
        })
        document.body.appendChild(probe)
        const sixChWidth = probe.getBoundingClientRect().width
        probe.remove()
        return {
          sixChWidth,
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          text: el.textContent ?? '',
          title: el.getAttribute('title'),
          display: cs.display,
          whiteSpace: cs.whiteSpace,
          overflowX: cs.overflowX,
          textOverflow: cs.textOverflow,
          overflows: el.scrollWidth > el.clientWidth,
          rowHref: row?.getAttribute('href') ?? null,
        }
      }),
  )
}

/** The copied URL a shown URL text has to carry: the row's challenge in a list, else this page's. */
function expectedUrlFor(target: SitePage, rowHref: string | null): string {
  if (!target.challenge && rowHref) {
    const slug = rowHref.replace(/\.html$/, '').replace(/\/+$/, '').split('/').pop() ?? ''
    return pageUrlOf(target.locale, slug)
  }
  return pageUrlOf(target.locale, 'selected-excerpts')
}

/** The nav's shown title, `[data-nav-title]`: the desktop row's from 768 wide, the mobile row's below. */
async function shownNavTitles(page: Page) {
  return page.locator('[data-nav-title]').evaluateAll((els) =>
    els
      .filter((el) => {
        for (let n: Element | null = el; n; n = n.parentElement) if (getComputedStyle(n).display === 'none') return false
        return true
      })
      .map((el) => ({ text: el.textContent ?? '', scrollWidth: el.scrollWidth, clientWidth: el.clientWidth })),
  )
}

/** S01, S02, S10 and, on challenge pages, S07 in the page's current state. */
async function expectLayoutHolds(page: Page, target: SitePage, state: string) {
  const { scrollWidth, innerWidth, innerHeight } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  }))
  state = `${innerWidth}×${innerHeight}, ${state}`
  expect(scrollWidth, `S01: ${target.name} scrolls sideways (${state})`).toBeLessThanOrEqual(innerWidth)

  const texts = await shownUrlTexts(page)
  expect(texts.length, `no shown URL text on ${target.name} (${state})`).toBeGreaterThan(0)
  // The nav shows one control: its desktop place from 768 wide, the mobile row's below it.
  if (target.challenge) expect(texts.length, `the nav shows both its controls on ${target.name} (${state})`).toBe(1)
  for (const t of texts) {
    const expected = expectedUrlFor(target, t.rowHref)
    const where = `S02: ${t.text} on ${target.name} (${state})`
    expect(t.display, where).not.toBe('inline')
    expect(t.whiteSpace, where).toBe('nowrap')
    expect(t.overflowX, where).toBe('hidden')
    expect(t.textOverflow, where).toBe('ellipsis')
    // Whether it is cut or not, the content is the whole displayed text and the title the copied
    // URL; S02 requires it where the text overflows, so say so when it does.
    expect(t.text, `${where}${t.overflows ? ', cut' : ''}`).toBe(withoutScheme(expected))
    expect(t.title, `${where}${t.overflows ? ', cut' : ''}`).toBe(expected)
    // S10 (D14): never narrower than six `0` characters of its own font, less 1 px.
    expect(
      t.clientWidth,
      `S10: ${t.text} on ${target.name} (${state}) is ${t.clientWidth} px, under its 6ch width ${t.sixChWidth.toFixed(1)} px`,
    ).toBeGreaterThanOrEqual(t.sixChWidth - 1)
  }

  if (!target.challenge) return
  // S07 (D7): wherever the nav's title is cut, the URL text already gave up its width.
  const titles = await shownNavTitles(page)
  expect(titles.length, `the nav shows ${titles.length} titles on ${target.name} (${state})`).toBe(1)
  const [title] = titles
  if (title.scrollWidth > title.clientWidth) {
    const [t] = texts
    expect(
      t.clientWidth,
      `S07: the title is cut (${title.scrollWidth} > ${title.clientWidth}) while the URL text is ${t.clientWidth} px, over its 6ch width ${t.sixChWidth.toFixed(1)} px + 1, on ${target.name} (${state})`,
    ).toBeLessThanOrEqual(t.sixChWidth + 1)
  }
}

/** The nav's shown title's width, for the check that the failure message leaves the title its room. */
async function navTitleWidth(page: Page) {
  const [title] = await shownNavTitles(page)
  return title.clientWidth
}

/**
 * Part of T-0037's layout decision for `short_link.copy_failed`: the message takes a line of its
 * own, so it takes no width from the title, which stays as wide as it was before the message showed.
 */
async function expectTitleKept(page: Page, target: SitePage, before: number, state: string) {
  const after = await navTitleWidth(page)
  expect(after, `the copy_failed message took the title's room on ${target.name} (${state}): ${before} px before, ${after} px now`).toBeGreaterThanOrEqual(before - 1)
}

/** Whether the nav's shown title is cut, for the check that S07 is not vacuous. */
async function navTitleIsCut(page: Page) {
  const [title] = await shownNavTitles(page)
  return title.scrollWidth > title.clientWidth
}

/**
 * S03: one plain primary click on the URL text selects the whole displayed text, also where it is
 * cut, and leaves the page where it is: the URL is unchanged once the network is idle, the router
 * started no client-side navigation (`history.pushState`), and the main frame did not navigate.
 */
async function expectClickSelects(page: Page, text: ReturnType<Page['locator']>, where: string) {
  const before = page.url()
  const pushesBefore = await pushStates(page)
  const navigated: string[] = []
  const onNavigated = (frame: ReturnType<Page['mainFrame']>) => { if (frame === page.mainFrame()) navigated.push(frame.url()) }
  page.on('framenavigated', onNavigated)
  try {
    await page.evaluate(() => window.getSelection()?.removeAllRanges())
    const displayed = await text.evaluate((el) => ({ text: el.textContent ?? '', cut: el.scrollWidth > el.clientWidth }))
    await text.click()
    // Idle network, so a navigation the click started has landed. A challenge page may still be
    // loading its runtime; the router pushes its history entry and the browser commits a
    // navigation within that bounded wait, so a busy network falls back to one more second.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => page.waitForTimeout(1_000))
    const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '')
    const pushes = await pushStates(page)
    const label = `S03: ${where}${displayed.cut ? ', cut' : ''}`
    expect(page.url(), `${label}: the page's URL changed`).toBe(before)
    expect(pushes - pushesBefore, `${label}: the router navigated`).toBe(0)
    expect(navigated, `${label}: the main frame navigated`).toEqual([])
    expect(selected, `${label}: the selection is not the whole displayed text`).toBe(displayed.text)
  } finally {
    page.off('framenavigated', onNavigated)
  }
}

/** The URL text S03 clicks: the first list row's, or the nav's shown one. */
function selectTarget(page: Page, target: SitePage) {
  return target.challenge
    ? page.locator('[data-short-link]:visible').first()
    : page.locator('a.ch-list-row').first().locator('[data-short-link]')
}

/**
 * The copy button that produces a status: on a list, the row with the longest displayed text; on a
 * challenge page, the nav's shown control.
 */
async function statusButton(page: Page, target: SitePage) {
  if (!target.challenge) {
    const lengths = await page.locator('a.ch-list-row [data-short-link]').evaluateAll((els) => els.map((e) => (e.textContent ?? '').length))
    const longest = lengths.indexOf(Math.max(...lengths))
    return page.locator('a.ch-list-row').nth(longest).locator('[data-copy-link]')
  }
  return page.locator('[data-copy-link]:visible').first()
}

/** Status text next to a button, read from the same control. */
const statusOf = (button: ReturnType<Page['locator']>) => button.locator('xpath=following-sibling::*[@data-copy-status][1]')

/**
 * A regression check the matrix does not number (stage 8, V02 at 375 wide): the confirmation is
 * whole and on one line, and a reader can see it, so the URL text, not the status, gives up the
 * width (D7). Lines are counted from the text's own line boxes, not guessed from a line height.
 *
 * The status's own box cannot show the second half: while the confirmation shows it does not
 * shrink, so its box always holds its text. Where the URL text stops yielding, the control grows
 * past its row and an `overflow: hidden` ancestor clips the status out of sight, while the
 * document still does not scroll sideways. So the status's box must also lie inside the viewport
 * and inside every ancestor that clips, and the point at its middle must hit the status itself.
 */
async function expectStatusWhole(button: ReturnType<Page['locator']>, target: SitePage, viewport: { width: number }) {
  const m = await statusOf(button).evaluate((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    const boxes = [...range.getClientRects()].filter((r) => r.width > 0)
    const box = el.getBoundingClientRect()
    const edges = (r: DOMRect) => ({ left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom) })
    // Each clipping ancestor whose box does not hold the status's box, by its own tag and classes.
    const clippedBy: string[] = []
    for (let n = el.parentElement; n; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
      const r = n.getBoundingClientRect()
      if (box.left < r.left - 0.5 || box.right > r.right + 0.5 || box.top < r.top - 0.5 || box.bottom > r.bottom + 0.5) {
        clippedBy.push(`${n.tagName.toLowerCase()}.${[...n.classList].join('.')} ${JSON.stringify(edges(r))}`)
      }
    }
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    return {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      lines: new Set(boxes.map((r) => Math.round(r.top))).size,
      height: box.height,
      // `normal` computes to no number; a line box's own height stands in for it then.
      lineHeight: parseFloat(getComputedStyle(el).lineHeight) || Math.max(0, ...boxes.map((r) => r.height)),
      box: edges(box),
      inViewport: box.left >= -0.5 && box.top >= -0.5 && box.right <= window.innerWidth + 0.5 && box.bottom <= window.innerHeight + 0.5,
      clippedBy,
      hitsStatus: !!hit && el.contains(hit),
    }
  })
  const where = `copied status on ${target.name} at ${viewport.width} wide: ${JSON.stringify(m)}`
  expect(m.scrollWidth, `${where} is cut`).toBeLessThanOrEqual(m.clientWidth)
  expect(m.lines, `${where} wraps`).toBe(1)
  expect(m.height, `${where} is taller than one line`).toBeLessThan(m.lineHeight * 1.5)
  expect(m.inViewport, `${where} lies outside the viewport`).toBe(true)
  expect(m.clippedBy, `${where} is clipped by an ancestor`).toEqual([])
  expect(m.hitsStatus, `${where} is covered at its middle`).toBe(true)
}

/**
 * The layout T-0037 decided for `short_link.copy_failed` (not a matrix row; within S01, S10 and
 * D14): the message can be read and covers nothing. It may take any number of lines, but no word
 * is cut; its box lies inside the viewport, inside every ancestor that clips, and on a challenge
 * page inside the nav; and the point at its middle hits the message itself.
 */
async function expectMessageWhole(button: ReturnType<Page['locator']>, target: SitePage, state: string) {
  // A list row may sit below the fold; the reader scrolls to the message beside the button.
  await statusOf(button).scrollIntoViewIfNeeded()
  const m = await statusOf(button).evaluate((el) => {
    const box = el.getBoundingClientRect()
    const edges = (r: DOMRect) => ({ left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom) })
    const outside = (r: DOMRect) => box.left < r.left - 0.5 || box.right > r.right + 0.5 || box.top < r.top - 0.5 || box.bottom > r.bottom + 0.5
    const clippedBy: string[] = []
    for (let n = el.parentElement; n; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
      const r = n.getBoundingClientRect()
      if (outside(r)) clippedBy.push(`${n.tagName.toLowerCase()}.${[...n.classList].join('.')} ${JSON.stringify(edges(r))}`)
    }
    const nav = el.closest('nav.merged-nav')
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    return {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      box: edges(box),
      inViewport: box.left >= -0.5 && box.top >= -0.5 && box.right <= window.innerWidth + 0.5 && box.bottom <= window.innerHeight + 0.5,
      clippedBy,
      outsideNav: nav ? (outside(nav.getBoundingClientRect()) ? JSON.stringify(edges(nav.getBoundingClientRect())) : '') : null,
      hitsMessage: !!hit && el.contains(hit),
    }
  })
  const where = `copy_failed message on ${target.name} (${state}): ${JSON.stringify(m)}`
  expect(m.scrollWidth, `${where} has a word cut`).toBeLessThanOrEqual(m.clientWidth)
  expect(m.inViewport, `${where} lies outside the viewport`).toBe(true)
  expect(m.clippedBy, `${where} is clipped by an ancestor`).toEqual([])
  if (target.challenge) expect(m.outsideNav, `${where} runs out of the nav`).toBe('')
  expect(m.hitsMessage, `${where} is covered at its middle`).toBe(true)
}

/**
 * The same decision for the nav row that holds the shown control, desktop row or mobile row: its
 * other items (brand, back link, badges, done badge, brief toggle, the right section's controls)
 * lie inside the row, are not cut, and are hit at their own middle, so the message covers none of
 * them and pushes none of them out.
 */
async function expectNavItemsWhole(page: Page, target: SitePage, state: string) {
  const items = await page.locator('[data-copy-link]:visible').first().evaluate((button) => {
    const nav = button.closest('nav.merged-nav')!
    const row = [...nav.children].find((r) => r.contains(button))!
    const rr = row.getBoundingClientRect()
    const control = button.parentElement!
    // The row's items: its own children, or, for the desktop row, its two sections' children.
    const sections = [...row.children].some((c) => c.contains(control) && c !== control) && row.children.length === 2
    const children = sections ? [...row.children].flatMap((c) => [...c.children]) : [...row.children]
    const shown = (c: Element) => { for (let n: Element | null = c; n && n !== row; n = n.parentElement) if (getComputedStyle(n).display === 'none') return false; return true }
    return children
      .filter((c) => c !== control && !c.hasAttribute('data-nav-title') && shown(c))
      .map((c) => {
        const r = c.getBoundingClientRect()
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        const name = c.getAttribute('data-badge') ?? (c.hasAttribute('data-desc-toggle') ? 'brief toggle' : c.hasAttribute('data-challenge-done') ? 'done badge' : `${c.tagName.toLowerCase()}${[...c.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `[${a.name}]`).join('')} ${(c.textContent ?? '').trim().slice(0, 12)}`)
        return {
          name,
          inside: r.left >= rr.left - 0.5 && r.right <= rr.right + 0.5 && r.top >= rr.top - 0.5 && r.bottom <= rr.bottom + 0.5,
          cut: (c as HTMLElement).scrollWidth > (c as HTMLElement).clientWidth,
          hit: !!hit && c.contains(hit),
          box: { left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top - rr.top) },
          rowHeight: Math.round(rr.height),
        }
      })
  })
  expect(items.length, `no nav row items on ${target.name} (${state})`).toBeGreaterThan(0)
  for (const item of items) {
    const where = `${item.name} in ${target.name}'s nav row (${state}): ${JSON.stringify(item)}`
    expect(item.inside, `${where} spills out of its row`).toBe(true)
    expect(item.cut, `${where} is cut`).toBe(false)
    expect(item.hit, `${where} is covered at its middle`).toBe(true)
  }
}

/**
 * Part of the same decision, at rest: only a status makes a row grow. The mobile row may grow
 * while any status shows ("The mobile row may grow taller while a status shows"); row 1 grows,
 * from md up, only while `short_link.copy_failed` shows (decision 3), and stays 40 px while the
 * confirmation shows. This helper runs at rest and while the confirmation shows, never while the
 * failure shows: there `expectMessageWhole`, `expectNavItemsWhole` and, on the collapsed mobile
 * row, `expectRowItemsWhole` check the rows. At rest row 1 is 40 px and the mobile row 32 px,
 * and each list row's line 3 holds its URL text and its button on one line. Every row is a flex
 * row that wraps, and the mobile row has 6 px to spare at 360 wide (open point 3), so a font or a
 * gap that leaves less would wrap an item onto a second line, inside a taller row, where no check
 * of the items' boxes sees it.
 */
async function expectRowsAtRest(page: Page, target: SitePage, state: string, { statusShows = false } = {}) {
  if (!target.challenge) {
    if (statusShows) return
    const lines = await page.locator('a.ch-list-row [data-short-link]').evaluateAll((els) =>
      els.map((el) => {
        const t = el.getBoundingClientRect()
        const b = el.parentElement!.querySelector('[data-copy-link]')!.getBoundingClientRect()
        return { text: el.textContent ?? '', oneLine: t.top < b.bottom && b.top < t.bottom, url: Math.round(t.top), button: Math.round(b.top) }
      }),
    )
    expect(lines.length, `no list row on ${target.name} (${state})`).toBeGreaterThan(0)
    for (const line of lines) {
      expect(line.oneLine, `the button wrapped below ${line.text} on ${target.name} (${state}): ${JSON.stringify(line)}`).toBe(true)
    }
    return
  }
  const rows = await page.locator('nav.merged-nav').evaluate((nav) => {
    const [row1, row2] = [...nav.children]
    const height = (el: Element) => el.getBoundingClientRect().height
    return {
      row1: height(row1),
      mobileRow: getComputedStyle(row2).display === 'none' ? null : height(row2),
    }
  })
  const where = `on ${target.name} (${state}): ${JSON.stringify(rows)}`
  expect(rows.row1, `row 1 grew past its 40 px ${where}`).toBeCloseTo(40, 0)
  if (rows.mobileRow !== null && !statusShows) {
    expect(rows.mobileRow, `the mobile row grew past its 32 px ${where}`).toBeCloseTo(32, 0)
  }
}

/**
 * Completed: a progress record for `selected-excerpts` in the site's own store, the shared-machine
 * choice already answered so its prompt does not change the layout, then a reload.
 */
async function reloadCompleted(page: Page) {
  await page.evaluate(async () => {
    window.sessionStorage.setItem('wxl-session-gate', 'decided')
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('challenge-tools')
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('challenge-progress', 'readwrite')
        const now = Date.now()
        tx.objectStore('challenge-progress').put({ challengeSlug: 'selected-excerpts', firstCompletedAt: now, lastAttemptAt: now, attemptCount: 1 })
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => reject(tx.error)
      }
    })
  })
  await page.reload()
  await waitForHydration(page)
  await expect(page.locator('[data-challenge-done]:visible').first()).toBeVisible()
}

test.describe('copy control in page mode: layout and the HTML as served', () => {
  for (const target of SITE_PAGES) {
    for (const viewport of VIEWPORTS) {
      test(`${target.name} at ${viewport.width}×${viewport.height}: S01, S02 in every state; S04`, async ({ page }) => {
        await page.setViewportSize(viewport)
        // Fake timers from the first script on, so the confirmation's 2000 ms revert cannot race
        // the measurement once the clock is paused below.
        await page.clock.install()
        await openSitePage(page, target)

        // S04: the URL text in the HTML as served, before any script runs, equals the hydrated text.
        const served = await (await page.request.get(target.path)).text()
        const servedTexts = [...served.matchAll(/<span[^>]*data-short-link[^>]*>([^<]*)<\/span>/g)].map((m) => m[1])
        const hydratedTexts = await page.locator('[data-short-link]').allTextContents()
        expect(servedTexts.length, 'S04: the served HTML holds no URL text').toBeGreaterThan(0)
        expect(servedTexts, 'S04: the URL text changed on hydration').toEqual(hydratedTexts)
        if (target.challenge) {
          for (const text of servedTexts) expect(text).toBe(withoutScheme(pageUrlOf(target.locale, 'selected-excerpts')))
        }

        await expectLayoutHolds(page, target, 'at rest')
        await expectRowsAtRest(page, target, 'at rest')
        if (target.challenge) await expectNavItemsWhole(page, target, 'at rest')
        const titleAtRest = target.challenge ? await navTitleWidth(page) : 0
        await expectClickSelects(page, selectTarget(page, target), `${target.name} at ${viewport.width} wide, at rest`)

        const button = await statusButton(page, target)
        const messages = MESSAGES[target.locale]

        await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 1000))
        await button.click()
        await expect(statusOf(button)).toHaveText(messages.short_link.copied)
        await expectLayoutHolds(page, target, 'copied')
        await expectRowsAtRest(page, target, 'copied', { statusShows: true })
        await expectStatusWhole(button, target, viewport)

        await page.evaluate(() => { (window as unknown as Record<string, unknown>).__wxlClipboard = 'reject' })
        await button.click()
        await expect(statusOf(button)).toHaveText(messages.short_link.copy_failed)
        await expectLayoutHolds(page, target, 'copy_failed')
        await expectMessageWhole(button, target, `${viewport.width} wide`)
        if (target.challenge) await expectNavItemsWhole(page, target, 'copy_failed')
        if (target.challenge) await expectTitleKept(page, target, titleAtRest, `${viewport.width} wide, copy_failed`)
        // The failure message stays until acted on, so the clock can run again: a navigation the
        // click might start is then not held back by a paused timer.
        await page.clock.resume()
        await expectClickSelects(page, selectTarget(page, target), `${target.name} at ${viewport.width} wide, copy_failed`)

        if (!target.challenge) {
          // The status row is the longest; when the first row is another, the failure also shows on
          // the first row itself, beside the URL text S03 clicks.
          const first = page.locator('a.ch-list-row').first().locator('[data-copy-link]')
          if (await first.evaluate((b, other) => b !== other, await button.elementHandle())) {
            await first.click()
            await expect(statusOf(first)).toHaveText(messages.short_link.copy_failed)
            await expectLayoutHolds(page, target, 'copy_failed on the first row')
            await expectMessageWhole(first, target, `${viewport.width} wide, the first row`)
            await expectClickSelects(page, selectTarget(page, target), `${target.name} at ${viewport.width} wide, copy_failed on the first row`)
          }
          return
        }

        await reloadCompleted(page)
        await expectLayoutHolds(page, target, 'completed')
        await expectRowsAtRest(page, target, 'completed')
        await expectNavItemsWhole(page, target, 'completed')
        const titleCompleted = await navTitleWidth(page)

        await page.evaluate(() => { (window as unknown as Record<string, unknown>).__wxlClipboard = 'reject' })
        const completedButton = await statusButton(page, target)
        await completedButton.click()
        await expect(statusOf(completedButton)).toHaveText(messages.short_link.copy_failed)
        await expectLayoutHolds(page, target, 'completed, copy_failed')
        await expectMessageWhole(completedButton, target, `${viewport.width} wide, completed`)
        await expectNavItemsWhole(page, target, 'completed, copy_failed')
        await expectTitleKept(page, target, titleCompleted, `${viewport.width} wide, completed, copy_failed`)
      })
    }
  }
})

/**
 * A regression check the matrix does not number (stage 8, round 2): on the mobile nav's second row,
 * the items beside the title and the control (the badges, the done badge and the 📖 brief toggle)
 * stay whole inside the row, so the URL text, not its neighbours, gives up the width (D7). A page
 * URL is long, and while the toggle could shrink, the Traditional Chinese `📖 題目` stacked one
 * character per line and spilled 24 px out of the 32 px row.
 */
async function expectRowItemsWhole(page: Page, target: SitePage, state: string) {
  const items = await page.locator('[data-copy-link]:visible').first().evaluate((button) => {
    const control = button.parentElement!
    const row = control.parentElement!
    const rr = row.getBoundingClientRect()
    return [...row.children]
      .filter((c, i) => i > 0 && c !== control && getComputedStyle(c).display !== 'none')
      .map((c) => {
        const r = c.getBoundingClientRect()
        const name = c.getAttribute('data-badge') ?? (c.hasAttribute('data-desc-toggle') ? 'brief toggle' : c.hasAttribute('data-challenge-done') ? 'done badge' : c.tagName.toLowerCase())
        return {
          name,
          inside: r.left >= rr.left - 0.5 && r.right <= rr.right + 0.5 && r.top >= rr.top - 0.5 && r.bottom <= rr.bottom + 0.5,
          cut: (c as HTMLElement).scrollWidth > (c as HTMLElement).clientWidth,
          box: { width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top - rr.top), bottom: Math.round(r.bottom - rr.bottom) },
          rowHeight: Math.round(rr.height),
        }
      })
  })
  expect(items.some((i) => i.name === 'brief toggle'), `no brief toggle on ${target.name} (${state})`).toBe(true)
  for (const item of items) {
    const where = `${item.name} on ${target.name}'s mobile nav (${state}): ${JSON.stringify(item)}`
    expect(item.inside, `${where} spills out of its row`).toBe(true)
    expect(item.cut, `${where} is cut`).toBe(false)
  }
}

test.describe('copy control in page mode: the mobile nav with the brief collapsed', () => {
  for (const target of SITE_PAGES.filter((p) => p.challenge)) {
    for (const viewport of VIEWPORTS.filter((v) => v.width < 768)) {
      test(`${target.name} at ${viewport.width}×${viewport.height}: the row's items stay whole; S01, S02`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.clock.install()
        await openSitePage(page, target)
        const collapse = async () => {
          await page.locator('[data-description-toggle]').click()
          await expect(page.locator('[data-desc-toggle]:visible')).toBeVisible()
        }
        const messages = MESSAGES[target.locale]
        const holdConfirmation = async () => page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 1000))

        await collapse()
        await expectLayoutHolds(page, target, 'brief collapsed')
        await expectRowsAtRest(page, target, 'brief collapsed')
        await expectRowItemsWhole(page, target, 'brief collapsed')

        const button = await statusButton(page, target)
        await holdConfirmation()
        await button.click()
        await expect(statusOf(button)).toHaveText(messages.short_link.copied)
        await expectLayoutHolds(page, target, 'brief collapsed, copied')
        await expectRowsAtRest(page, target, 'brief collapsed, copied', { statusShows: true })
        await expectStatusWhole(button, target, viewport)
        await expectRowItemsWhole(page, target, 'brief collapsed, copied')

        await page.clock.resume()
        await reloadCompleted(page)
        await collapse()
        await expectLayoutHolds(page, target, 'completed, brief collapsed')
        await expectRowsAtRest(page, target, 'completed, brief collapsed')
        await expectRowItemsWhole(page, target, 'completed, brief collapsed')
        const titleCollapsed = await navTitleWidth(page)
        // S07 is not vacuous: in its tightest state the English nav cuts its title, so the check in
        // expectLayoutHolds above applied at least here.
        if (target.locale === 'en' && viewport.width === 360) {
          expect(await navTitleIsCut(page), 'S07 never applies: the English title is whole at 360, completed, brief collapsed').toBe(true)
        }

        const completedButton = await statusButton(page, target)
        await holdConfirmation()
        await completedButton.click()
        await expect(statusOf(completedButton)).toHaveText(messages.short_link.copied)
        await expectLayoutHolds(page, target, 'completed, brief collapsed, copied')
        await expectRowsAtRest(page, target, 'completed, brief collapsed, copied', { statusShows: true })
        await expectStatusWhole(completedButton, target, viewport)
        await expectRowItemsWhole(page, target, 'completed, brief collapsed, copied')

        // The row may grow while the failure message shows; the message is whole, inside the nav,
        // and covers none of the row's items (T-0037's layout decision).
        await page.evaluate(() => { (window as unknown as Record<string, unknown>).__wxlClipboard = 'reject' })
        await completedButton.click()
        await expect(statusOf(completedButton)).toHaveText(messages.short_link.copy_failed)
        await expectLayoutHolds(page, target, 'completed, brief collapsed, copy_failed')
        await expectMessageWhole(completedButton, target, `${viewport.width} wide, completed, brief collapsed`)
        await expectRowItemsWhole(page, target, 'completed, brief collapsed, copy_failed')
        await expectNavItemsWhole(page, target, 'completed, brief collapsed, copy_failed')
        await expectTitleKept(page, target, titleCollapsed, `${viewport.width} wide, completed, brief collapsed, copy_failed`)
      })
    }
  }
})

test.describe('copy control in page mode: the desktop nav with the brief collapsed', () => {
  for (const target of SITE_PAGES.filter((p) => p.challenge)) {
    for (const viewport of VIEWPORTS.filter((v) => v.width >= 768 && v.width < 1280)) {
      test(`${target.name} at ${viewport.width}×${viewport.height}: copy_failed stays inside the nav; S01, S02, S07, S10`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await openSitePage(page, target)
        await page.locator('[data-description-toggle]').click()
        await expect(page.locator('[data-desc-toggle]:visible')).toBeVisible()
        await expectLayoutHolds(page, target, 'brief collapsed')
        await expectRowsAtRest(page, target, 'brief collapsed')
        await expectNavItemsWhole(page, target, 'brief collapsed')
        const titleCollapsed = await navTitleWidth(page)

        await page.evaluate(() => { (window as unknown as Record<string, unknown>).__wxlClipboard = 'reject' })
        const button = await statusButton(page, target)
        await button.click()
        await expect(statusOf(button)).toHaveText(MESSAGES[target.locale].short_link.copy_failed)
        await expectLayoutHolds(page, target, 'brief collapsed, copy_failed')
        await expectMessageWhole(button, target, `${viewport.width} wide, brief collapsed`)
        await expectNavItemsWhole(page, target, 'brief collapsed, copy_failed')
        await expectTitleKept(page, target, titleCollapsed, `${viewport.width} wide, brief collapsed, copy_failed`)
      })
    }
  }
})

// S06: a click elsewhere in a list row still opens that challenge. The plain click on the URL text
// first is the control for S03: the same observation that sees no navigation there sees this one.
test.describe('copy control in page mode: the rest of a list row opens the challenge (S06)', () => {
  for (const target of SITE_PAGES.filter((p) => !p.challenge)) {
    for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 800 }]) {
      test(`${target.name} at ${viewport.width}×${viewport.height}: the selected-excerpts row's title opens it`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await openSitePage(page, target)
        const row = page.locator('a.ch-list-row', { has: page.locator('[data-short-link]', { hasText: '/challenge/selected-excerpts/' }) })
        await expectClickSelects(page, row.locator('[data-short-link]'), `the selected-excerpts row on ${target.name}`)

        const pushesBefore = await pushStates(page)
        await row.locator('[data-row-title]').click()
        const path = `${target.locale === 'zh-TW' ? '/zh-TW' : ''}/challenge/selected-excerpts/`
        await expect.poll(() => new URL(page.url()).pathname).toBe(path)
        expect(await pushStates(page)).toBeGreaterThan(pushesBefore)
        await expect(page.locator('nav.merged-nav [data-short-link]:visible')).toHaveText(withoutScheme(pageUrlOf(target.locale, 'selected-excerpts')))
      })
    }
  }
})

// S08, upstream-only: on upstream's own origin the Traditional Chinese page URL does not fit the
// mobile nav at 375, so the cut S02 and S10 describe really happens there. A range's origin may be
// shorter, so this runs only under the upstream decision.
test('copy control in page mode: the Traditional Chinese nav URL text is cut at 375×812 (S08, upstream-only)', async ({ page }) => {
  test.skip(!realUpstreamDecision(process.cwd()), 'not upstream: S08 depends on upstream\'s own origin (the upstream decision says this tree is a range)')
  const target = SITE_PAGES.find((p) => p.challenge && p.locale === 'zh-TW')!
  await page.setViewportSize({ width: 375, height: 812 })
  await openSitePage(page, target)
  const texts = await shownUrlTexts(page)
  expect(texts.length).toBe(1)
  expect(texts[0].scrollWidth, `S08: ${JSON.stringify(texts[0])}`).toBeGreaterThan(texts[0].clientWidth)
})

test.describe('copy control in page mode: what is copied (S05, N07)', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:4173' })
  })

  for (const target of SITE_PAGES.filter((p) => !p.challenge)) {
    test(`${target.name}: the selected-excerpts row puts its page URL on the clipboard`, async ({ page }) => {
      await openSitePage(page, target)
      await page.evaluate(() => { (window as unknown as Record<string, unknown>).__wxlClipboard = 'real' })
      const row = page.locator('a.ch-list-row', { has: page.locator('[data-short-link]', { hasText: '/challenge/selected-excerpts/' }) })
      await row.locator('[data-copy-link]').click()
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(pageUrlOf(target.locale, 'selected-excerpts'))
      expect(new URL(page.url()).pathname).toBe(target.path)
    })
  }

  for (const target of SITE_PAGES.filter((p) => p.challenge)) {
    for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 800 }]) {
      test(`${target.name} at ${viewport.width}×${viewport.height}: the nav puts the page URL on the clipboard`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await openSitePage(page, target)
        await page.evaluate(() => { (window as unknown as Record<string, unknown>).__wxlClipboard = 'real' })
        await page.locator('[data-copy-link]:visible').first().click()
        await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(pageUrlOf(target.locale, 'selected-excerpts'))
      })
    }
  }
})

test.describe('copy control in page mode: a run-time flag does not switch the mode (S09)', () => {
  for (const target of SITE_PAGES) {
    test(`${target.name} at 375×812 with window.__WXL_SHORT_LINKS__ = true`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await openSitePage(page, target, () => {
        (window as unknown as Record<string, unknown>).__WXL_SHORT_LINKS__ = true
      })
      expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__WXL_SHORT_LINKS__)).toBe(true)
      const texts = await shownUrlTexts(page)
      expect(texts.length).toBeGreaterThan(0)
      for (const t of texts) expect(t.text).toBe(withoutScheme(expectedUrlFor(target, t.rowHref)))
    })
  }
})

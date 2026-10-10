import { test, expect } from '@playwright/test'

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

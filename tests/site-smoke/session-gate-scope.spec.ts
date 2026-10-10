import { test, expect } from '@playwright/test'

/**
 * Where the shared-machine choice is put on screen, in the built site.
 *
 * The condition lives in the routing layer — the layout hands the gate the page kind it
 * derived from frontmatter — so the unit tests reach it only through doubles. This one
 * loads real pages from the production bundle and looks at what is on screen.
 *
 * Evidence is planted in `localStorage` rather than IndexedDB: detection consults
 * `localStorage` first and synchronously, and a note draft is a key nothing in the
 * platform writes by itself, so its presence is the whole of the evidence.
 */
const NOTE_DRAFT = 'pentest-draft-door-is-open'

test.describe('the shared-machine choice is asked on challenge pages only', () => {
  test.beforeEach(async ({ context }) => {
    // Before any document script runs, on every page of this context. Setting it after a
    // goto would plant the evidence behind the check that reads it.
    await context.addInitScript(([key]) => {
      window.localStorage.setItem(key, 'a draft the previous learner typed')
    }, [NOTE_DRAFT])
  })

  test('the home page does not ask', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Start Challenge' })).toBeVisible()

    // The evidence really is there — without this the assertion below would pass on a
    // browser holding nothing and prove nothing at all.
    expect(await page.evaluate(k => window.localStorage.getItem(k), NOTE_DRAFT)).not.toBeNull()
    await expect(page.locator('[data-session-gate]')).toHaveCount(0)
    // And no decision was recorded, so the question is still owed to the learner.
    expect(await page.evaluate(() => window.sessionStorage.getItem('wxl-session-gate'))).toBeNull()
  })

  test('the challenge list does not ask either', async ({ page }) => {
    await page.goto('/challenges/')
    await expect(page.locator('[data-session-gate]')).toHaveCount(0)
    // The place the pair of numbers would be says why they are not there.
    await expect(page.locator('[data-progress-blocked]')).toBeVisible()
    await expect(page.locator('[data-progress-summary]')).toHaveCount(0)
  })

  test('a challenge page asks', async ({ page }) => {
    await page.goto('/challenge/door-is-open/')
    await expect(page.locator('[data-session-gate]')).toBeVisible()
    // Both answers on screen: this is the untouched state, before anything was cleared.
    await expect(page.locator('[data-session-gate-keep]')).toBeVisible()
    await expect(page.locator('[data-session-gate-clear]')).toBeVisible()
  })

  test('a challenge page still asks after the home page did not', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-session-gate]')).toHaveCount(0)

    // Same browser session — no reload of the context, so `sessionStorage` carries over.
    await page.getByRole('link', { name: 'Start Challenge' }).click()
    await page.goto('/challenge/door-is-open/')
    await expect(page.locator('[data-session-gate]')).toBeVisible()
  })
})

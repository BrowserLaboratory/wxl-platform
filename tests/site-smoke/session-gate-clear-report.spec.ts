import { test, expect } from '@playwright/test'

/**
 * What the shared-machine choice reports after a site-wide clear that did not finish, in the
 * built site (spec 0001, seam S3).
 *
 * The truth tests run the real gate over fake-indexeddb; this runs the production bundle in a
 * real browser, where the database delete is the browser's own. Sentences are compared whole,
 * with `toHaveText`, so a sentence that kept its words and gained a false clause still fails.
 */
const NOTE_DRAFT = 'pentest-draft-door-is-open'

test.describe('the report after a sweep that failed (K2)', () => {
  test.beforeEach(async ({ context }) => {
    // Before any document script runs. The fault is patched on the prototype with a guard
    // rather than assigned on the instance: assigning a property on `localStorage` stores an
    // item named `removeItem` instead of replacing the method.
    await context.addInitScript(([key]) => {
      window.localStorage.setItem(key, 'a draft the previous learner typed')
      const removeItem = Storage.prototype.removeItem
      Storage.prototype.removeItem = function (this: Storage, name: string) {
        if (this === window.localStorage) throw new DOMException('injected: removeItem refused', 'SecurityError')
        return removeItem.call(this, name)
      }
    }, [NOTE_DRAFT])
  })

  test('says the database went and some other values did not, and offers only to retry or close', async ({ page }) => {
    await page.goto('/challenge/door-is-open/')
    await page.locator('[data-session-gate-clear]').click()

    // The run has settled on the sweep failure: the raw error is the injected one.
    await expect(page.locator('[data-session-gate-raw-error]')).toHaveText('injected: removeItem refused')
    expect(await page.evaluate(() => indexedDB.databases())).toEqual([])
    expect(await page.evaluate(k => window.localStorage.getItem(k), NOTE_DRAFT)).toBe('a draft the previous learner typed')

    await expect(page.locator('[data-session-gate-body]')).toHaveText(
      "This site's database in this browser has been deleted, and anything it held cannot be brought back.")
    await expect(page.locator('[data-session-gate-report-heading]')).toHaveText(
      'Not every other value this site stored in this browser could be removed.')
    await expect(page.locator('[data-session-gate-report-hint]')).toHaveText(
      'There is no way to tell from here how many are left. '
      + 'Pressing delete again retries the whole site-wide clear, starting with the database.')
    await expect(page.locator('[data-session-gate-clear]')).toHaveText('Delete it and start fresh')
    await expect(page.locator('[data-session-gate-dismiss]')).toHaveText('Close this report and carry on')
    await expect(page.locator('[data-session-gate-keep]')).toHaveCount(0)
    await expect(page.locator('[data-session-gate-reload]')).toHaveCount(0)
  })
})

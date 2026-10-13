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

test.describe('the report after a site-wide clear that did not finish', () => {
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

  // K4. After the sweep failure above, a later run's delete is held by another page of this
  // site that keeps a connection open and never yields it. The delete may still go through
  // after the platform gives up on it, so the report must not claim the database went, and
  // the way out must be a reload: a page left to carry on would write its in-memory attack
  // session straight back.
  test('reports a later held delete as unconfirmed and offers only reload (K4)', async ({ page, context }) => {
    // Two page loads and the platform's real five-second bound on the delete.
    test.setTimeout(60_000)
    await page.goto('/challenge/door-is-open/')
    await page.locator('[data-session-gate-clear]').click()
    await expect(page.locator('[data-session-gate-raw-error]')).toHaveText('injected: removeItem refused')

    // A second page at the site root, holding the database with the browser's own
    // `indexedDB.open` and no `versionchange` handling, so it does not make way. The
    // context's init script runs there too; it changes nothing this test reads.
    const holder = await context.newPage()
    try {
      await holder.goto('/')
      // If the site is about to create the database, let it finish first, so this
      // connection never holds up that upgrade with the delete queued behind it (only the
      // request at the head of the queue is told it is blocked). Whether the site opens
      // it at all from these pages varies; when it has not within a few seconds, nothing
      // here is about to, and opening it now creates it.
      await holder.evaluate(() => new Promise<void>((resolve, reject) => {
        const deadline = Date.now() + 5_000
        const open = () => {
          const request = indexedDB.open('challenge-tools')
          request.onsuccess = () => { (window as unknown as { held: IDBDatabase }).held = request.result; resolve() }
          request.onerror = () => reject(request.error)
        }
        const check = async () => {
          const listed = (await indexedDB.databases()).some(db => db.name === 'challenge-tools')
          if (listed || Date.now() > deadline) open()
          else setTimeout(check, 100)
        }
        void check()
      }))

      await page.locator('[data-session-gate-clear]').click()

    // The platform's bound on the delete is five seconds; the report appears when it runs out.
      await expect(page.locator('[data-session-gate-raw-error]')).toContainText('another tab still has it open', { timeout: 15_000 })
      await expect(page.locator('[data-session-gate-body]')).toHaveText(
        'A deletion of the saved work was started and could not be confirmed. '
        + 'It may still be in progress, so there is no way to tell from here whether anything is left.')
      await expect(page.locator('[data-session-gate-report-heading]')).toHaveText('The outcome could not be confirmed.')
      await expect(page.locator('[data-session-gate-report-hint]')).toHaveText(
        'The site-wide clear cannot finish while another tab of this site has the data open. '
        + 'Close any other tabs, then reload.')
      await expect(page.locator('[data-session-gate-reload]')).toHaveText('Reload and start over')
      await expect(page.locator('[data-session-gate-clear]')).toHaveText('Delete it and start fresh')
      await expect(page.locator('[data-session-gate-dismiss]')).toHaveCount(0)
      await expect(page.locator('[data-session-gate-keep]')).toHaveCount(0)
    } finally {
      await holder.close()
    }
  })
})

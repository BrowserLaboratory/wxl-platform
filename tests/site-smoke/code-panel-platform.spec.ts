import { test, expect, type Page } from '@playwright/test'
import { STDLIB_MODULES } from '../../.vitepress/theme/composables/pythonCompletions'

/**
 * Platform-level checks for the Code panel, run against the *built* site.
 *
 * These live here rather than under tests/challenges because the two defects
 * they pin are platform defects, not challenge defects: every challenge that
 * declares the `code` tool inherits both. Writing them once per challenge would
 * produce six copies that rot together.
 *
 * They drive the real editor rather than a test hook. The existing in-page
 * dispatch hook (`__wxlDispatch`) is dev-only by design, and adding a
 * production execution entry point in order to test a sandbox escape would be
 * the same class of mistake these tests exist to catch.
 */

const CHALLENGE = 'staff-only'
const ORIGIN = `https://challenge-${CHALLENGE}.localhost`
// Published in the challenge brief; this is the account students are given.
const USERNAME = 'j.kerr'
const PASSWORD = 'Aut2026!'

const BOOT_TIMEOUT = 180_000

/** Open the Code tab and wait until its runtime is ready to execute. */
async function openCodePanel(page: Page): Promise<void> {
  await page.goto(`/challenge/${CHALLENGE}/`)
  await page.locator('[data-tab="code"]').click()
  // Run stays disabled until the challenge runtime, the service worker, and the
  // panel's own Pyodide are all up. First load compiles WASM, so this is slow.
  await expect(page.locator('[data-run]')).toBeEnabled({ timeout: BOOT_TIMEOUT })
}

/**
 * Printed as the driven script's last statement, and waited for before the
 * output is read. Callers never see it: it is stripped from the returned string.
 */
const SENTINEL = '__WXL_RUN_COMPLETE__'

/**
 * Replace the editor contents and run.
 *
 * Typing is unusable here: CodeMirror's bracket/quote auto-closing rewrites
 * what arrives, so a script with quotes comes out corrupted. An insertText
 * command goes in verbatim.
 *
 * The read waits for the sentinel rather than for the output element to stop
 * being empty. Output is streamed one chunk per printed line, so "not empty"
 * becomes true one line in — a script printing five lines was captured after two
 * of them, which is what the intermittent failure in the session test below
 * actually was.
 */
async function runInCodePanel(page: Page, source: string): Promise<string> {
  const editor = page.locator('[data-editor] .cm-content')
  await editor.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.evaluate((code) => {
    document.execCommand('insertText', false, code)
  }, `${source}\nprint(${JSON.stringify(SENTINEL)})`)

  const output = page.locator('[data-output]')
  await output.evaluate((el) => { el.textContent = '' })
  await page.locator('[data-run]').click()
  await expect(output, 'the run never reached its final line').toContainText(SENTINEL, {
    timeout: BOOT_TIMEOUT,
  })
  const text = (await output.textContent()) ?? ''
  return text.replace(SENTINEL, '')
}

test.describe('Code Editor Panel runs on a Pyodide instance separate from the challenge runtime', () => {
  test.setTimeout(BOOT_TIMEOUT + 60_000)

  test('the flag file is unreachable from the Code panel', async ({ page }) => {
    await openCodePanel(page)

    const output = await runInCodePanel(page, [
      'try:',
      "    print('LEAKED=' + open('/flag.txt').read())",
      'except FileNotFoundError as exc:',
      "    print('BLOCKED=' + type(exc).__name__)",
    ].join('\n'))

    expect(output, `Code panel read the flag file: ${output}`).toContain('BLOCKED=FileNotFoundError')
    expect(output).not.toContain('LEAKED=')
    expect(output).not.toContain('FLAG{')
  })

  test('challenge application source is unreachable from the Code panel', async ({ page }) => {
    await openCodePanel(page)

    const output = await runInCodePanel(page, [
      'import os',
      "print('ROOT=' + ','.join(sorted(os.listdir('/'))))",
    ].join('\n'))

    expect(output).toContain('ROOT=')
    expect(output).not.toContain('flag.txt')
    expect(output).not.toContain('app.py')
  })
})

test.describe('Autocomplete candidates resolve in the real runtime', () => {
  test.setTimeout(BOOT_TIMEOUT + 60_000)

  test('every symbol the editor offers exists on its module', async ({ page }) => {
    // The list is read from the module the editor itself uses. Restating it here would
    // let the two drift apart, which is the failure this guard exists to prevent.
    const modules = STDLIB_MODULES.map(m => ({
      name: m.name,
      symbols: [...m.functions, ...m.variables],
    }))

    await openCodePanel(page)

    // One script, one Pyodide round trip: the panel's runtime is already the slow part.
    const source = [
      'import importlib',
      `SPEC = ${JSON.stringify(modules)}`,
      'missing = []',
      'for entry in SPEC:',
      '    try:',
      "        mod = importlib.import_module(entry['name'])",
      '    except Exception as exc:',
      "        missing.append(entry['name'] + ' (import failed: ' + type(exc).__name__ + ')')",
      '        continue',
      "    for symbol in entry['symbols']:",
      '        if not hasattr(mod, symbol):',
      "            missing.append(entry['name'] + '.' + symbol)",
      "print('MISSING=' + ('|'.join(missing) if missing else 'NONE'))",
    ].join('\n')

    const output = await runInCodePanel(page, source)

    expect(output, `guard script did not run: ${output}`).toContain('MISSING=')
    const listed = output.split('MISSING=')[1].trim().split('\n')[0]
    expect(
      listed,
      `the completion list names symbols the runtime does not provide: ${listed}`,
    ).toBe('NONE')
  })
})

test.describe('Monkey-patch HTTPAdapter.send for dispatch bridge', () => {
  test.setTimeout(BOOT_TIMEOUT + 60_000)

  test('a requests Session logs in and keeps the session across requests', async ({ page }) => {
    await openCodePanel(page)

    const output = await runInCodePanel(page, [
      'import requests',
      `BASE = '${ORIGIN}'`,
      's = requests.Session()',
      `r = s.post(BASE + '/login', data={'username': '${USERNAME}', 'password': '${PASSWORD}'})`,
      "print('LOGIN_STATUS=' + str(r.status_code))",
      "print('COOKIE_NAMES=' + ','.join(sorted(s.cookies.keys())))",
      "r2 = s.get(BASE + '/board')",
      "print('SECOND_STATUS=' + str(r2.status_code))",
      "print('SIGNED_IN=' + str('Sign in' not in r2.text))",
    ].join('\n'))

    expect(output, `login did not reach the app: ${output}`).toContain('LOGIN_STATUS=200')
    // An empty jar is the defect this test exists for: requests drops every
    // Set-Cookie when the patched transport leaves Response.raw unset.
    expect(output, `cookie jar stayed empty: ${output}`).toContain('COOKIE_NAMES=cb_session')
    expect(output).toContain('SIGNED_IN=True')
  })
})

test.describe('Panel output is read to completion and shown as written', () => {
  test.setTimeout(BOOT_TIMEOUT + 60_000)

  test('a run that prints, pauses, then prints again is returned whole', async ({ page }) => {
    await openCodePanel(page)

    // The pause is the point. The session test above is a race the harness
    // usually wins: its lines are produced microseconds apart, so a read taken
    // the moment output stops being empty *usually* still sees all of them, and
    // a helper that reads too early passes most runs. A visible gap makes the
    // same defect deterministic — with a read triggered by non-emptiness this
    // returns only the first line, every time.
    const output = await runInCodePanel(page, [
      'import time',
      "print('FIRST')",
      'time.sleep(2)',
      "print('SECOND')",
    ].join('\n'))

    expect(output, `output was read before the run finished: ${output}`).toContain('SECOND')
    // Written as two lines, so it arrives as two lines: Python's line ending is
    // carried through to the panel rather than being eaten by a line-oriented
    // output hook.
    expect(output, `line breaks were lost: ${JSON.stringify(output)}`).toContain('FIRST\nSECOND')
  })

  test('output with no terminating newline still reaches the panel', async ({ page }) => {
    await openCodePanel(page)

    // Python surrenders an unterminated line only on a flush. Without one at the
    // end of a run this text never arrives at all — not late, never.
    const output = await runInCodePanel(page, [
      "print('BEFORE')",
      "print('TRAILING', end='')",
    ].join('\n'))

    expect(output, `unterminated output never arrived: ${JSON.stringify(output)}`).toContain('TRAILING')
  })
})

test.describe('Code Editor Panel loading overlay is confined to the panel', () => {
  // These assert rendered geometry, not class names. An absolutely positioned
  // box resolves against its nearest positioned ancestor, and no assertion on
  // class strings or style declarations can observe which ancestor that is —
  // which is exactly how the overlay came to cover the whole viewport.
  //
  // The overlay is sampled while the challenge runtime is still booting, so
  // these run in seconds and never wait for Pyodide.
  async function overlayGeometry(page: Page) {
    await page.goto(`/challenge/${CHALLENGE}/`)
    await page.locator('[data-tab="code"]').click()
    const overlay = page.locator('[data-runtime-overlay]')
    await expect(overlay).toBeVisible()

    return page.evaluate(() => {
      const o = document.querySelector('[data-runtime-overlay]')!.getBoundingClientRect()
      const p = document.querySelector('[data-panel="code"]')!.getBoundingClientRect()
      const round = (r: DOMRect) => ({
        left: Math.round(r.left), top: Math.round(r.top),
        right: Math.round(r.right), bottom: Math.round(r.bottom),
        width: Math.round(r.width), height: Math.round(r.height),
      })
      return {
        overlay: round(o),
        panel: round(p),
        viewport: { width: window.innerWidth, height: window.innerHeight },
      }
    })
  }

  test('overlay stays inside the panel', async ({ page }) => {
    const g = await overlayGeometry(page)
    const detail = `overlay=${JSON.stringify(g.overlay)} panel=${JSON.stringify(g.panel)} viewport=${JSON.stringify(g.viewport)}`

    expect(g.overlay.left, detail).toBeGreaterThanOrEqual(g.panel.left)
    expect(g.overlay.top, detail).toBeGreaterThanOrEqual(g.panel.top)
    expect(g.overlay.right, detail).toBeLessThanOrEqual(g.panel.right)
    expect(g.overlay.bottom, detail).toBeLessThanOrEqual(g.panel.bottom)

    // The failure this pins: the overlay resolving against the viewport.
    expect(
      g.overlay.width === g.viewport.width && g.overlay.height === g.viewport.height,
      `overlay is exactly the viewport box — ${detail}`,
    ).toBe(false)
  })

  test('overlay covers the whole panel', async ({ page }) => {
    const g = await overlayGeometry(page)
    const detail = `overlay=${JSON.stringify(g.overlay)} panel=${JSON.stringify(g.panel)}`

    expect(g.overlay.left, detail).toBeLessThanOrEqual(g.panel.left)
    expect(g.overlay.top, detail).toBeLessThanOrEqual(g.panel.top)
    expect(g.overlay.right, detail).toBeGreaterThanOrEqual(g.panel.right)
    expect(g.overlay.bottom, detail).toBeGreaterThanOrEqual(g.panel.bottom)
  })

  test('the rest of the page stays usable while the overlay is shown', async ({ page }) => {
    await page.goto(`/challenge/${CHALLENGE}/`)
    await page.locator('[data-tab="code"]').click()
    await expect(page.locator('[data-runtime-overlay]')).toBeVisible()

    // Hit testing, sampled in one synchronous pass while the overlay is proven
    // present. An earlier version clicked the flag input through Playwright and
    // passed against the broken build: the click waits for actionability, the
    // overlay disappears when the runtime finishes loading, and the click then
    // lands on an unobstructed input. It measured the wrong moment.
    const probe = await page.evaluate(() => {
      const overlay = document.querySelector('[data-runtime-overlay]')
      if (!overlay) return { overlayPresent: false }
      const hit = (el: Element | null) => {
        if (!el) return 'missing'
        const r = el.getBoundingClientRect()
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return top && overlay.contains(top) ? 'blocked-by-overlay' : 'reachable'
      }
      return {
        overlayPresent: true,
        description: hit(document.querySelector('[data-description-panel]')),
        flagInput: hit(document.querySelector('[data-flag-input]')),
      }
    })

    expect(probe.overlayPresent, 'overlay vanished before the probe ran').toBe(true)
    expect(probe.description, 'description panel is behind the overlay').toBe('reachable')
    expect(probe.flagInput, 'flag input is behind the overlay').toBe('reachable')
  })
})

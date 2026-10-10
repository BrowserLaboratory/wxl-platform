import { describe, it, expect } from 'vitest'
import { encodeCookieCarrier } from '../../../.vitepress/theme/composables/cookieCarrier'
import {
  transportCookie,
  buildBridgePayload,
} from '../../../.vitepress/theme/composables/usePythonRuntime'

/**
 * Set-Cookie is a forbidden response-header name in the Fetch API, so the
 * runtime transports it as X-Wxlsh-Set-Cookie, encoded so that no byte the
 * application emits can split one cookie into two.
 * The bridge payload used to flatten those back into one comma-joined string,
 * which is not reversible: cookie attribute values contain commas of their own
 * (`Expires=Thu, 01-Jan-1970 ...`). These tests pin the unjoined array.
 */

function responseWith(setCookies: string[], extra: Record<string, string> = {}): Response {
  const headers = new Headers({ 'content-type': 'text/html', ...extra })
  // Build the carrier with the real encoder rather than restating its format:
  // a test that carries its own copy of the format stops testing the encoder.
  if (setCookies.length > 0) headers.set('X-Wxlsh-Set-Cookie', encodeCookieCarrier(setCookies))
  return new Response('body', { status: 200, headers })
}

describe('Multiple Set-Cookie headers survive the dispatch bridge', () => {
  it('carries each Set-Cookie value unjoined in set_cookies', () => {
    const payload = buildBridgePayload(responseWith(['a=1; Path=/', 'b=2; Path=/']), 'body')

    expect(payload.set_cookies).toEqual(['a=1; Path=/', 'b=2; Path=/'])
  })

  // Spec example: an expiry attribute on the first cookie must not bleed into
  // the second. This is the case the comma-join could never survive.
  it('keeps the second cookie intact when the first carries an Expires attribute', () => {
    const first = 'a=1; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/'
    const second = 'b=2; Path=/'

    const payload = buildBridgePayload(responseWith([first, second]), 'body')

    expect(payload.set_cookies).toHaveLength(2)
    expect(payload.set_cookies[1]).toBe(second)
    expect(payload.set_cookies[1]).not.toContain('Expires')
    expect(payload.set_cookies[1]).not.toContain('GMT')
  })

  it('emits an empty array when the response sets no cookies', () => {
    const payload = buildBridgePayload(responseWith([]), 'body')

    expect(payload.set_cookies).toEqual([])
  })

  it('leaves the headers field shape unchanged and free of the transport name', () => {
    const payload = buildBridgePayload(responseWith(['a=1; Path=/'], { 'x-custom': 'kept' }), 'body')

    expect(payload.headers['x-custom']).toBe('kept')
    expect(payload.headers['content-type']).toBe('text/html')
    expect(Object.keys(payload.headers)).not.toContain('x-wxlsh-set-cookie')
    expect(payload.headers['set-cookie']).toBe('a=1; Path=/')
  })

  it('reports status and body alongside the cookies', () => {
    const payload = buildBridgePayload(responseWith(['a=1']), 'hello')

    expect(payload.status).toBe(200)
    expect(payload.body).toBe('hello')
  })
})

describe('outbound Cookie header uses the forbidden-header transport', () => {
  it('renames Cookie to X-Wxlsh-Cookie so fetch does not drop it', () => {
    const headers = transportCookie({ Cookie: 'sid=abc', Accept: 'text/html' })

    expect(headers['X-Wxlsh-Cookie']).toBe('sid=abc')
    expect(headers.Cookie).toBeUndefined()
    expect(headers.cookie).toBeUndefined()
    expect(headers.Accept).toBe('text/html')
  })

  it('leaves headers untouched when no cookie is present', () => {
    const headers = transportCookie({ Accept: 'text/html' })

    expect(headers['X-Wxlsh-Cookie']).toBeUndefined()
    expect(headers.Accept).toBe('text/html')
  })
})

describe('the Cookie carrier survives the casing learner code chose', () => {
  it('moves a Cookie header whatever its spelling', () => {
    // `requests` keeps the caller's original spelling — its CaseInsensitiveDict
    // preserves it — and the Python patch hands the map over as-is. `new
    // Request()` then drops a forbidden Cookie header case-insensitively and in
    // silence, so a learner who wrote `headers={'COOKIE': ...}` is logged out
    // with no error anywhere. That symptom has shipped on this platform once.
    for (const spelling of ['Cookie', 'cookie', 'COOKIE', 'CoOkIe']) {
      const headers: Record<string, string> = { [spelling]: 'sid=1' }
      transportCookie(headers)
      expect(headers['X-Wxlsh-Cookie'], `spelling: ${spelling}`).toBe('sid=1')
      expect(Object.keys(headers).some(k => k.toLowerCase() === 'cookie')).toBe(false)
    }
  })
})

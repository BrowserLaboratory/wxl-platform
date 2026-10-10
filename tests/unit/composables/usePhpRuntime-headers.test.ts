import { describe, it, expect } from 'vitest'
import { makeFakePhp } from '../../__helpers__/fakePhpInstance'
import { PhpRuntime } from '../../../.vitepress/theme/composables/usePhpRuntime'
import { decodeCookieCarrier } from '../../../.vitepress/theme/composables/cookieCarrier'

const APP_PHP = '<?php header("Content-Type: application/json"); echo "{}"; ?>'

describe('PhpRuntime response headers', () => {
  it('forwards header() calls from PHP to the response', async () => {
    const { loadPhp } = makeFakePhp({
      output: '{}',
      headers: ['Content-Type: application/json', 'X-Custom: test'],
    })
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize(APP_PHP)

    const response = await runtime.handleRequest(
      new Request('https://challenge-test.localhost/api'),
    )

    expect(response.headers.get('content-type')).toBe('application/json')
    expect(response.headers.get('x-custom')).toBe('test')
  })

  it('supplies the PHP default content type when the app sets none', async () => {
    const { loadPhp } = makeFakePhp({ output: 'body', headers: [] })
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize('<?php echo "body"; ?>')

    const response = await runtime.handleRequest(
      new Request('https://challenge-test.localhost/'),
    )

    expect(response.headers.get('content-type')).toBe('text/html; charset=UTF-8')
  })

  it('maps an unset status code to 200 and a set one through unchanged', async () => {
    const unset = makeFakePhp({ output: 'a', status: false })
    const set = makeFakePhp({ output: 'b', status: 403 })

    const r1 = new PhpRuntime(unset.loadPhp)
    await r1.initialize('<?php ?>')
    const r2 = new PhpRuntime(set.loadPhp)
    await r2.initialize('<?php ?>')

    expect((await r1.handleRequest(new Request('https://c.localhost/'))).status).toBe(200)
    expect((await r2.handleRequest(new Request('https://c.localhost/'))).status).toBe(403)
  })

  it('drops a header the Headers constructor rejects instead of failing the request', async () => {
    const { loadPhp } = makeFakePhp({
      output: 'body',
      // A challenge with a header-injection bug can emit a name like this.
      headers: ['X-Bad\nInjected: 1', 'X-Good: 1'],
    })
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize('<?php ?>')

    const response = await runtime.handleRequest(new Request('https://c.localhost/'))

    expect(await response.text()).toBe('body')
    expect(response.headers.get('x-good')).toBe('1')
  })
})

/**
 * Header-value legality cannot be tested by waiting for `Headers.set` to throw:
 * happy-dom accepts a newline, an em dash and a tab alike, while Chrome rejects
 * the first two and takes the whole response down with them. Both defects
 * reached a browser before this suite noticed. These tests therefore assert the
 * character rules directly.
 */
describe('PhpRuntime response header legality', () => {
  const HEADER_VALUE_IS_LEGAL = (value: string) =>
    !/[\r\n]/.test(value) && [...value].every((c) => (c.codePointAt(0) ?? 0) <= 0xff)

  it('joins multiple Set-Cookie values with a character legal in a header value', async () => {
    const { loadPhp } = makeFakePhp({
      output: 'body',
      headers: [
        'Set-Cookie: session=abc; path=/; Expires=Thu, 19 Nov 1981 08:52:00 GMT',
        'Set-Cookie: role=student; path=/',
      ],
    })
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize('<?php ?>')

    const carrier = (await runtime.handleRequest(new Request('https://c.localhost/')))
      .headers.get('x-wxlsh-set-cookie') ?? ''

    expect(HEADER_VALUE_IS_LEGAL(carrier)).toBe(true)
    // Still separable, and not by any byte the challenge itself can emit.
    const parts = decodeCookieCarrier(carrier)
    expect(parts).toHaveLength(2)
    expect(parts[0]).toContain('session=abc')
    expect(parts[1]).toContain('role=student')
  })


  it('replaces characters a header value cannot carry rather than failing the response', async () => {
    const { loadPhp } = makeFakePhp({
      output: 'body',
      headers: ['X-Note: café — dash 中文'],
    })
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize('<?php ?>')

    const response = await runtime.handleRequest(new Request('https://c.localhost/'))

    // The response survives; only the offending header is affected.
    expect(await response.text()).toBe('body')
    expect(response.status).toBe(200)
  })
})

import { describe, it, expect, vi } from 'vitest'
import { makeFakePhp, decodeSuperglobals } from '../../__helpers__/fakePhpInstance'
import { PhpRuntime } from '../../../.vitepress/theme/composables/usePhpRuntime'

const APP_PHP = '<?php echo "ok"; ?>'

function makeMockPhp() {
  return makeFakePhp({ output: 'ok' })
}

describe('PhpRuntime cookie parsing', () => {
  // NOTE: The Fetch API forbids setting Cookie header directly on Request objects.
  // In this system, BrowserPanel transports cookies via X-Wxlsh-Cookie header.
  // All cookie tests use X-Wxlsh-Cookie as the transport mechanism.

  it('populates $_COOKIE from Cookie header (via X-Wxlsh-Cookie transport)', async () => {
    const { loadPhp, appRuns } = makeMockPhp()
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize(APP_PHP)

    await runtime.handleRequest(new Request('https://challenge-test.localhost/', {
      headers: { 'X-Wxlsh-Cookie': 'theme=dark; session_user=guest' },
    }))

    expect(decodeSuperglobals(appRuns()[0]).cookie).toEqual({
      theme: 'dark',
      session_user: 'guest',
    })
  })

  it('last-value-wins for duplicate cookie names', async () => {
    const { loadPhp, appRuns } = makeMockPhp()
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize(APP_PHP)

    await runtime.handleRequest(new Request('https://challenge-test.localhost/', {
      headers: { 'X-Wxlsh-Cookie': 'token=first; token=second' },
    }))

    expect(decodeSuperglobals(appRuns()[0]).cookie).toEqual({ token: 'second' })
  })

  it('initializes $_COOKIE as empty array when no Cookie header', async () => {
    const { loadPhp, appRuns } = makeMockPhp()
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize(APP_PHP)

    await runtime.handleRequest(new Request('https://challenge-test.localhost/'))

    const code: string = appRuns()[0]
    expect(code).toContain('$_COOKIE')
    expect(decodeSuperglobals(appRuns()[0]).cookie).toEqual({})
  })

  it('reads cookies from x-wxlsh-cookie transport header', async () => {
    const { loadPhp, appRuns } = makeMockPhp()
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize(APP_PHP)

    await runtime.handleRequest(new Request('https://challenge-test.localhost/', {
      headers: { 'X-Wxlsh-Cookie': 'lang=en; role=admin' },
    }))

    expect(decodeSuperglobals(appRuns()[0]).cookie).toEqual({ lang: 'en', role: 'admin' })
  })

  it('preserves raw cookie values without URL decoding', async () => {
    const { loadPhp, appRuns } = makeMockPhp()
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize(APP_PHP)

    await runtime.handleRequest(new Request('https://challenge-test.localhost/', {
      headers: { 'X-Wxlsh-Cookie': 'data=hello%20world' },
    }))

    // Raw value preserved, NOT percent-decoded
    expect(decodeSuperglobals(appRuns()[0]).cookie).toEqual({ data: 'hello%20world' })
  })

  it('handles cookie with no value (name only)', async () => {
    const { loadPhp, appRuns } = makeMockPhp()
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize(APP_PHP)

    await runtime.handleRequest(new Request('https://challenge-test.localhost/', {
      headers: { 'X-Wxlsh-Cookie': 'novalue' },
    }))

    expect(decodeSuperglobals(appRuns()[0]).cookie).toEqual({ novalue: '' })
  })

  it('handles cookie value containing equals sign', async () => {
    const { loadPhp, appRuns } = makeMockPhp()
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize(APP_PHP)

    await runtime.handleRequest(new Request('https://challenge-test.localhost/', {
      headers: { 'X-Wxlsh-Cookie': 'data=base64==value' },
    }))

    expect(decodeSuperglobals(appRuns()[0]).cookie).toEqual({ data: 'base64==value' })
  })
})

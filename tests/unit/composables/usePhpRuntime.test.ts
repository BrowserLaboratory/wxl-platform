import { describe, it, expect, vi } from 'vitest'
import { makeFakePhp, decodeSuperglobals } from '../../__helpers__/fakePhpInstance'
import { PhpRuntime } from '../../../.vitepress/theme/composables/usePhpRuntime'

const APP_PHP = '<?php echo "hello"; ?>'

describe('PhpRuntime.handleRequest()', () => {
  it('sets $_SERVER[REQUEST_METHOD] to GET for GET request', async () => {
    const { loadPhp, appRuns } = makeFakePhp({ output: 'ok' })
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize(APP_PHP)

    await runtime.handleRequest(new Request('https://challenge-test.localhost/'))

    expect(decodeSuperglobals(appRuns()[0]).server.REQUEST_METHOD).toBe('GET')
  })

  it('populates $_GET from query string', async () => {
    const { loadPhp, appRuns } = makeFakePhp({ output: 'ok' })
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize(APP_PHP)

    await runtime.handleRequest(new Request('https://challenge-test.localhost/?name=alice&id=42'))

    expect(decodeSuperglobals(appRuns()[0]).get).toEqual({ name: 'alice', id: '42' })
  })
})

import { describe, it, expect, vi } from 'vitest'
import { makeFakePhp, decodeSuperglobals } from '../../__helpers__/fakePhpInstance'
import { PhpRuntime } from '../../../.vitepress/theme/composables/usePhpRuntime'

const APP_PHP = '<?php echo "ok"; ?>'

function makeMockPhp() {
  return makeFakePhp({ output: 'ok' })
}

describe('PhpRuntime POST body handling', () => {
  it('populates $_POST from form-encoded body', async () => {
    const { loadPhp, appRuns } = makeMockPhp()
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize(APP_PHP)

    await runtime.handleRequest(new Request('https://challenge-test.localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=admin&password=secret',
    }))

    expect(decodeSuperglobals(appRuns()[0]).post).toEqual({
      username: 'admin',
      password: 'secret',
    })
  })

  it('makes raw JSON body available via $GLOBALS[_RAW_INPUT]', async () => {
    const { loadPhp, appRuns } = makeMockPhp()
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize(APP_PHP)

    const jsonBody = '{"key":"value"}'
    await runtime.handleRequest(new Request('https://challenge-test.localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonBody,
    }))

    const decoded = decodeSuperglobals(appRuns()[0])
    expect(decoded.post).toEqual({})
    expect(decoded.rawInput).toBe(jsonBody)
  })
})

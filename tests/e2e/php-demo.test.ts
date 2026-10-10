/**
 * End-to-end test: PHP demo challenge
 * PHP challenges use the same Service Worker routing path as Python.
 */
import { describe, it, expect, vi } from 'vitest'
import { createRouter } from '../../.vitepress/workers/router'
import { makeFakePhp } from '../__helpers__/fakePhpInstance'
import { PhpRuntime } from '../../.vitepress/theme/composables/usePhpRuntime'

const SLUG = 'php-demo'
const APP_PHP = '<?php echo "Hello from PHP"; ?>'

describe('PHP demo — end-to-end', () => {
  it('routes challenge request through SW → PHP runtime → returns response', async () => {
    const { loadPhp } = makeFakePhp({
      output: 'Hello from PHP',
      headers: ['Content-Type: text/html'],
    })
    const runtime = new PhpRuntime(loadPhp)
    await runtime.initialize(APP_PHP)

    const phpDispatch = (req: Request) => runtime.handleRequest(req)
    const router = createRouter({ php: phpDispatch })

    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: SLUG, backend: 'php' })

    const request = new Request(`https://challenge-${SLUG}.localhost/`)
    const response = await router.dispatch(request)

    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('Hello from PHP')
  })

  it('PHP challenge follows same SW routing path as Python (backend: php)', async () => {
    const phpDispatch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const pythonDispatch = vi.fn()

    const router = createRouter({ php: phpDispatch, python: pythonDispatch })
    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: SLUG, backend: 'php' })

    await router.dispatch(new Request(`https://challenge-${SLUG}.localhost/test`))

    expect(phpDispatch).toHaveBeenCalledOnce()
    expect(pythonDispatch).not.toHaveBeenCalled()
  })
})

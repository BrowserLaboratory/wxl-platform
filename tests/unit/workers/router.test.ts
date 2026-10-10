import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouter, type BackendDispatcher } from '../../../.vitepress/workers/router'

// ─── 5.1 SW intercepts challenge-*.localhost (HTTPS) ────────────────────────

describe('SW intercepts challenge-*.localhost (HTTPS)', () => {
  it('intercepts https://challenge-test.localhost/', () => {
    const router = createRouter()
    expect(router.shouldIntercept(new URL('https://challenge-test.localhost/'))).toBe(true)
  })

  it('intercepts https://challenge-sqli-basic.localhost/api/users', () => {
    const router = createRouter()
    expect(router.shouldIntercept(new URL('https://challenge-sqli-basic.localhost/api/users'))).toBe(true)
  })

  it('does NOT intercept https://vitepress.dev/', () => {
    const router = createRouter()
    expect(router.shouldIntercept(new URL('https://vitepress.dev/'))).toBe(false)
  })

  it('does NOT intercept https://localhost:5173/', () => {
    const router = createRouter()
    expect(router.shouldIntercept(new URL('https://localhost:5173/'))).toBe(false)
  })
})

// ─── 5.3 REGISTER / UNREGISTER challenge ────────────────────────────────────

describe('challenge registration', () => {
  it('routes to registered backend after REGISTER_CHALLENGE', async () => {
    const pythonDispatch = vi.fn().mockResolvedValue(new Response('ok'))
    const router = createRouter({ python: pythonDispatch })

    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: 'sqli', backend: 'flask' })

    const req = new Request('https://challenge-sqli.localhost/api')
    const res = await router.dispatch(req)

    expect(pythonDispatch).toHaveBeenCalledOnce()
  })

  it('returns 503 after UNREGISTER_CHALLENGE', async () => {
    const pythonDispatch = vi.fn().mockResolvedValue(new Response('ok'))
    const router = createRouter({ python: pythonDispatch })

    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: 'sqli', backend: 'flask' })
    router.handleMessage({ type: 'UNREGISTER_CHALLENGE', slug: 'sqli' })

    const req = new Request('https://challenge-sqli.localhost/api')
    const res = await router.dispatch(req)

    expect(res.status).toBe(503)
    expect(pythonDispatch).not.toHaveBeenCalled()
  })
})

// ─── 5.5 dispatch to correct runtime ────────────────────────────────────────

describe('runtime dispatch', () => {
  it('dispatches flask backend to python runtime', async () => {
    const pythonDispatch = vi.fn().mockResolvedValue(new Response('python ok'))
    const phpDispatch = vi.fn().mockResolvedValue(new Response('php ok'))
    const router = createRouter({ python: pythonDispatch, php: phpDispatch })

    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: 'flask-c', backend: 'flask' })
    await router.dispatch(new Request('https://challenge-flask-c.localhost/'))

    expect(pythonDispatch).toHaveBeenCalledOnce()
    expect(phpDispatch).not.toHaveBeenCalled()
  })

  it('[RED] dispatches fastapi backend to python runtime', async () => {
    const pythonDispatch = vi.fn().mockResolvedValue(new Response('python ok'))
    const phpDispatch = vi.fn().mockResolvedValue(new Response('php ok'))
    const router = createRouter({ python: pythonDispatch, php: phpDispatch })

    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: 'fastapi-c', backend: 'fastapi' })
    await router.dispatch(new Request('https://challenge-fastapi-c.localhost/'))

    expect(pythonDispatch).toHaveBeenCalledOnce()
    expect(phpDispatch).not.toHaveBeenCalled()
  })

  it('dispatches php backend to php runtime', async () => {
    const pythonDispatch = vi.fn().mockResolvedValue(new Response('python ok'))
    const phpDispatch = vi.fn().mockResolvedValue(new Response('php ok'))
    const router = createRouter({ python: pythonDispatch, php: phpDispatch })

    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: 'php-c', backend: 'php' })
    await router.dispatch(new Request('https://challenge-php-c.localhost/'))

    expect(phpDispatch).toHaveBeenCalledOnce()
    expect(pythonDispatch).not.toHaveBeenCalled()
  })

  it('returns 501 for unknown backend', async () => {
    const router = createRouter()
    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: 'unknown-c', backend: 'unknown' as any })
    const res = await router.dispatch(new Request('https://challenge-unknown-c.localhost/'))
    expect(res.status).toBe(501)
  })
})

// ─── registration wait mechanism ─────────────────────────────────────────────

describe('Service Worker waits for challenge registration on registry miss', () => {
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('resolves fetch when registration arrives before timeout', async () => {
    const pythonDispatch = vi.fn().mockResolvedValue(new Response('ok'))
    const router = createRouter({ python: pythonDispatch }, { registrationTimeout: 200 })

    // Dispatch before registration
    const dispatchPromise = router.dispatch(new Request('https://challenge-sqli.localhost/'))

    // Registration arrives synchronously
    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: 'sqli', backend: 'flask' })

    const res = await dispatchPromise
    expect(res.status).toBe(200)
    expect(pythonDispatch).toHaveBeenCalledOnce()
  })

  it('returns 503 after timeout if registration never arrives', async () => {
    vi.useFakeTimers()
    const router = createRouter({ python: vi.fn() }, { registrationTimeout: 3000 })

    const dispatchPromise = router.dispatch(new Request('https://challenge-unregistered.localhost/'))
    vi.advanceTimersByTime(3001)

    const res = await dispatchPromise
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('challenge not registered')
  })

  it('resolves all pending fetches for the same slug when registration arrives', async () => {
    const pythonDispatch = vi.fn().mockResolvedValue(new Response('ok'))
    const router = createRouter({ python: pythonDispatch }, { registrationTimeout: 200 })

    const d1 = router.dispatch(new Request('https://challenge-sqli.localhost/a'))
    const d2 = router.dispatch(new Request('https://challenge-sqli.localhost/b'))

    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: 'sqli', backend: 'flask' })

    const [res1, res2] = await Promise.all([d1, d2])
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    expect(pythonDispatch).toHaveBeenCalledTimes(2)
  })
})

// ─── re-registration request on registry miss ────────────────────────────────

describe('Service Worker requests re-registration from clients on registry miss', () => {
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('asks clients to re-register when the slug is not in the registry', async () => {
    vi.useFakeTimers()
    const requestRegistration = vi.fn()
    const router = createRouter({ python: vi.fn() }, { registrationTimeout: 3000, requestRegistration })

    const dispatchPromise = router.dispatch(new Request('https://challenge-gone.localhost/'))

    // Synchronous on purpose: the request is asked for before the await, so a
    // client that answers immediately is still heard.
    expect(requestRegistration).toHaveBeenCalledWith('gone')

    vi.advanceTimersByTime(3001)
    await dispatchPromise
  })

  it('installs the registration waiter before asking clients to re-register', async () => {
    const pythonDispatch = vi.fn().mockResolvedValue(new Response('ok'))
    // The callback answers synchronously, before requestRegistration() returns.
    // If the waiter were installed after the ask, nobody would be listening and
    // this dispatch would time out to 503 instead of reaching the runtime.
    const router = createRouter(
      { python: pythonDispatch },
      {
        registrationTimeout: 200,
        requestRegistration: (slug: string) => {
          router.handleMessage({ type: 'REGISTER_CHALLENGE', slug, backend: 'flask' })
        },
      },
    )

    const res = await router.dispatch(new Request('https://challenge-sqli.localhost/'))

    expect(res.status).toBe(200)
    expect(pythonDispatch).toHaveBeenCalledOnce()
  })

  it('swallows a failing re-registration request and still times out to 503', async () => {
    vi.useFakeTimers()
    const asked = vi.fn(() => { throw new Error('no clients') })
    const router = createRouter(
      { python: vi.fn() },
      { registrationTimeout: 3000, requestRegistration: asked },
    )

    const dispatchPromise = router.dispatch(new Request('https://challenge-boom.localhost/'))
    // Asserted, not assumed: without it this test is green whenever nothing is
    // asked at all, which is exactly the state the mechanism's removal produces.
    expect(asked).toHaveBeenCalledWith('boom')
    vi.advanceTimersByTime(3001)

    const res = await dispatchPromise
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('challenge not registered')
  })

  it('does not ask when the slug is already registered', async () => {
    const requestRegistration = vi.fn()
    const router = createRouter({ python: vi.fn().mockResolvedValue(new Response('ok')) }, { requestRegistration })

    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: 'here', backend: 'flask' })
    await router.dispatch(new Request('https://challenge-here.localhost/'))

    expect(requestRegistration).not.toHaveBeenCalled()
  })
})

// ─── the router's own copies of the two guards ───────────────────────────────

describe('router dedupe and rejection handling', () => {
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('asks once for misses arriving in the same burst', async () => {
    vi.useFakeTimers()
    const requestRegistration = vi.fn()
    const router = createRouter(
      { python: vi.fn() },
      { registrationTimeout: 3000, askDebounce: 250, requestRegistration },
    )

    const all = [
      router.dispatch(new Request('https://challenge-burst.localhost/')),
      router.dispatch(new Request('https://challenge-burst.localhost/a.css')),
      router.dispatch(new Request('https://challenge-burst.localhost/b.js')),
    ]

    expect(requestRegistration).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(3001)
    await Promise.all(all)
  })

  it('asks again once the debounce has elapsed while a waiter is still pending', async () => {
    vi.useFakeTimers()
    const requestRegistration = vi.fn()
    const router = createRouter(
      { python: vi.fn() },
      { registrationTimeout: 3000, askDebounce: 250, requestRegistration },
    )

    const first = router.dispatch(new Request('https://challenge-late.localhost/'))
    expect(requestRegistration).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(2000)
    const second = router.dispatch(new Request('https://challenge-late.localhost/'))

    expect(requestRegistration).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(4000)
    await Promise.all([first, second])
  })

  it('contains a re-registration request that rejects rather than throws', async () => {
    // The synchronous try/catch cannot see a rejected promise, and TypeScript's
    // return-type bivariance lets an async implementation assign to a
    // `=> void` field with no error. Without the explicit .catch this leaves an
    // unhandled rejection, which vitest surfaces as a failing run.
    // Real timers: the rejection has to reach the process's unhandled-rejection
    // hook, and asserting on that hook is the only way the missing .catch is
    // externally visible — the 503 is identical either way.
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandled)
    try {
      // A plain function, not vi.fn: vitest's mock attaches its own handler to
      // a returned promise in order to record the result, which swallows the
      // rejection and hides the exact defect this test exists to catch.
      const calls: string[] = []
      const asked = async (slug: string) => {
        calls.push(slug)
        throw new Error('clients unavailable')
      }
      const router = createRouter(
        { python: vi.fn() },
        { registrationTimeout: 50, requestRegistration: asked },
      )

      const res = await router.dispatch(new Request('https://challenge-reject.localhost/'))
      expect(calls).toEqual(['reject'])
      expect(res.status).toBe(503)
      expect((await res.json()).error).toBe('challenge not registered')

      await new Promise((resolve) => setImmediate(resolve))
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
  })

  it('forgets the last ask when the challenge unregisters', async () => {
    // A page that unmounts and remounts inside the debounce window must still
    // be asked; the ask timestamp belongs to the registration that just went away.
    vi.useFakeTimers()
    const requestRegistration = vi.fn()
    const router = createRouter(
      { python: vi.fn() },
      { registrationTimeout: 3000, askDebounce: 250, requestRegistration },
    )

    const first = router.dispatch(new Request('https://challenge-remount.localhost/'))
    expect(requestRegistration).toHaveBeenCalledTimes(1)

    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: 'remount', backend: 'flask' })
    router.handleMessage({ type: 'UNREGISTER_CHALLENGE', slug: 'remount' })

    const second = router.dispatch(new Request('https://challenge-remount.localhost/'))
    expect(requestRegistration).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(3001)
    await Promise.all([first, second])
  })
})

// ─── 5.7 error handling ──────────────────────────────────────────────────────

describe('runtime error handling', () => {
  it('returns 500 with error JSON when runtime throws', async () => {
    const brokenDispatch = vi.fn().mockRejectedValue(new Error('runtime exploded'))
    const router = createRouter({ python: brokenDispatch })

    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: 'broken', backend: 'flask' })
    const res = await router.dispatch(new Request('https://challenge-broken.localhost/'))

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('in production mode, 500 body does not contain stack trace', async () => {
    const brokenDispatch = vi.fn().mockRejectedValue(new Error('oops'))
    const router = createRouter({ python: brokenDispatch }, { production: true })

    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: 'prod-c', backend: 'flask' })
    const res = await router.dispatch(new Request('https://challenge-prod-c.localhost/'))
    const body = await res.json()

    expect(body.stack).toBeUndefined()
    expect(body.error).toBe('Internal Server Error')
  })
})

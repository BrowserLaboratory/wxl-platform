export type BackendType = 'flask' | 'fastapi' | 'php'

export type BackendDispatcher = (request: Request) => Promise<Response>

interface RouterDispatchers {
  python?: BackendDispatcher
  php?: BackendDispatcher
}

interface RouterOptions {
  production?: boolean
  registrationTimeout?: number
  /**
   * Called with the slug when a request arrives for a challenge that is not in
   * the registry. In the Service Worker this broadcasts REQUEST_REGISTRATION to
   * window clients; here it is an injection point so the branch is observable
   * without a worker global scope.
   */
  requestRegistration?: (slug: string) => void | Promise<void>
  askDebounce?: number
}

interface ChallengeEntry {
  backend: BackendType | string
}

const CHALLENGE_HOST_RE = /^challenge-[^.]+\.localhost$/

export function createRouter(dispatchers: RouterDispatchers = {}, opts: RouterOptions = {}) {
  const registrationTimeout = opts.registrationTimeout ?? 3000
  const registry = new Map<string, ChallengeEntry>()
  const pendingRegistrations = new Map<string, Array<(entry: ChallengeEntry) => void>>()
  // slug → timestamp of the last ask. Keyed on the ask rather than on an
  // outstanding wait — see the same constant in platform/public/challenge-sw.js.
  const lastAskAt = new Map<string, number>()
  const askDebounce = opts.askDebounce ?? 250

  function shouldIntercept(url: URL): boolean {
    return CHALLENGE_HOST_RE.test(url.hostname)
  }

  function slugFromHost(hostname: string): string {
    // challenge-<slug>.localhost → <slug>
    return hostname.replace(/^challenge-/, '').replace(/\.localhost$/, '')
  }

  function waitForRegistration(slug: string): Promise<ChallengeEntry | undefined> {
    return new Promise<ChallengeEntry | undefined>((resolve) => {
      const resolvers = pendingRegistrations.get(slug) ?? []

      function onRegistered(entry: ChallengeEntry) {
        clearTimeout(timer)
        resolve(entry)
      }

      const timer = setTimeout(() => {
        const current = pendingRegistrations.get(slug)
        if (current) {
          const idx = current.indexOf(onRegistered)
          if (idx !== -1) current.splice(idx, 1)
          if (current.length === 0) pendingRegistrations.delete(slug)
        }
        resolve(undefined)
      }, registrationTimeout)

      resolvers.push(onRegistered)
      pendingRegistrations.set(slug, resolvers)
    })
  }

  function handleMessage(msg: { type: string; slug: string; backend?: string; port?: MessagePort }) {
    if (msg.type === 'REGISTER_CHALLENGE') {
      const entry: ChallengeEntry = { backend: msg.backend ?? 'flask' }
      registry.set(msg.slug, entry)
      const resolvers = pendingRegistrations.get(msg.slug)
      if (resolvers) {
        resolvers.forEach(r => r(entry))
        pendingRegistrations.delete(msg.slug)
      }
    } else if (msg.type === 'UNREGISTER_CHALLENGE') {
      registry.delete(msg.slug)
      lastAskAt.delete(msg.slug)
    }
  }

  async function dispatch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const slug = slugFromHost(url.hostname)
    let entry = registry.get(slug)

    if (!entry) {
      // Ask once per burst, not once per miss — see the same guard in
      // platform/public/challenge-sw.js for why it keys on the ask, not the wait.
      const now = Date.now()
      const alreadyAsking = now - (lastAskAt.get(slug) ?? -Infinity) < askDebounce
      // Install the waiter first, ask second. A client that answers
      // synchronously would otherwise arrive before anyone is listening, and
      // the request would sit out the full timeout for nothing.
      const waiting = waitForRegistration(slug)
      if (!alreadyAsking) {
        lastAskAt.set(slug, now)
        try {
          // The Service Worker's implementation is async and contains its own
          // failures; a synchronous try/catch cannot see a rejected promise, so
          // both shapes are handled. Neither is an error for this request: fall
          // through to the timeout and answer 503, the same shape as when
          // nobody answers.
          const asked = opts.requestRegistration?.(slug)
          if (asked) void Promise.resolve(asked).catch(() => {})
        } catch {
          // Thrown synchronously — same treatment.
        }
      }
      entry = await waiting
    }

    if (!entry) {
      return new Response(JSON.stringify({ error: 'challenge not registered' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const backend = entry.backend
      if (backend === 'flask' || backend === 'fastapi') {
        if (!dispatchers.python) {
          return new Response(JSON.stringify({ error: 'python runtime not available' }), {
            status: 503, headers: { 'Content-Type': 'application/json' },
          })
        }
        return await dispatchers.python(request)
      } else if (backend === 'php') {
        if (!dispatchers.php) {
          return new Response(JSON.stringify({ error: 'php runtime not available' }), {
            status: 503, headers: { 'Content-Type': 'application/json' },
          })
        }
        return await dispatchers.php(request)
      } else {
        return new Response(JSON.stringify({ error: `unknown backend: ${backend}` }), {
          status: 501, headers: { 'Content-Type': 'application/json' },
        })
      }
    } catch (err: unknown) {
      if (opts.production) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        })
      }
      const message = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined
      return new Response(JSON.stringify({ error: message, stack }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  return { shouldIntercept, handleMessage, dispatch }
}

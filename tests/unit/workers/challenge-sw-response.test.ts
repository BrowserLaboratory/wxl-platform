/**
 * @vitest-environment node
 *
 * Runs under Node rather than happy-dom on purpose. happy-dom's Response drops
 * set-cookie entirely, so the very contract under test here — that several
 * Set-Cookie headers survive to the browser — cannot be observed in it. The
 * suite's default environment has already hidden two header-legality defects in
 * this change; this file does not give it a third chance.
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * The Service Worker is a classic script with no exports, so its response
 * assembly cannot be imported. Rather than restate the logic here — a copy stops
 * testing the original the moment one of them changes — the block is lifted out
 * of the real file and executed.
 *
 * This is the last consumer of the Set-Cookie carrier and the last hand on the
 * response before the student's browser sees it, and until now it had no test
 * at all. Both defects it carried were invisible from every other layer.
 */
const SOURCE = readFileSync(resolve('platform/public/challenge-sw.js'), 'utf8')

function buildRelayResponse(status: number, resHeaders: [string, string][], resBody: ArrayBuffer | null) {
  const start = SOURCE.indexOf('  const responseHeaders = new Headers()')
  const end = SOURCE.indexOf('headers: responseHeaders })', start)
  expect(start, 'response assembly block not found in challenge-sw.js').toBeGreaterThan(-1)
  const block = SOURCE.slice(start, end + 'headers: responseHeaders })'.length)
    .replace('return new Response', 'return new Response')
  // eslint-disable-next-line no-new-func
  const fn = new Function('status', 'resHeaders', 'resBody', block)
  return fn(status, resHeaders, resBody) as Response
}

describe('challenge-sw response assembly', () => {
  it('keeps every Set-Cookie header instead of collapsing them', () => {
    // Headers.set() keeps only the last value for a name. The page decodes the
    // carrier into one entry per cookie precisely so they arrive separable; a
    // challenge setting a session cookie and a CSRF cookie would silently lose
    // one, one step from the browser.
    const response = buildRelayResponse(200, [
      ['content-type', 'text/html'],
      ['set-cookie', 'a=1; path=/'],
      ['set-cookie', 'b=2; path=/'],
    ], new TextEncoder().encode('body').buffer as ArrayBuffer)

    const cookies = [...response.headers].filter(([k]) => k.toLowerCase() === 'set-cookie')
    expect(cookies.flatMap(([, v]) => v.split(', '))).toEqual(
      expect.arrayContaining(['a=1; path=/', 'b=2; path=/']),
    )
  })

  it.each([204, 205, 304])('accepts a null-body status %i', (status) => {
    // The page sends a zero-length ArrayBuffer for these, which is not nullish.
    // Passing it to the Response constructor throws, and the SW's catch turns
    // that into a fabricated 500 — the same class of lie the runtime stopped
    // telling.
    const response = buildRelayResponse(status, [['content-type', 'text/html']], new ArrayBuffer(0))

    expect(response.status).toBe(status)
  })

  it('still carries a body for a status that permits one', async () => {
    const response = buildRelayResponse(
      200,
      [['content-type', 'text/plain']],
      new TextEncoder().encode('hello').buffer as ArrayBuffer,
    )

    expect(await response.text()).toBe('hello')
  })
})


/**
 * The re-registration handshake cannot be reached through the response-assembly
 * block above: it lives in the fetch path, before any response exists. The whole
 * classic script is evaluated instead, with a stub `self` capturing the
 * listeners it registers — so these assertions read the shipped worker rather
 * than the `.vitepress/workers/router.ts` mirror, which has no clients and no
 * port relay.
 */
function loadWorker() {
  const listeners: Record<string, ((e: never) => void)[]> = {}
  const matchAllCalls: unknown[] = []
  let clients: { postMessage: (m: unknown) => void }[] = []
  let matchAll = async (): Promise<typeof clients> => clients

  const selfStub = {
    location: { hostname: 'localhost' },
    addEventListener: (type: string, fn: (e: never) => void) => {
      ;(listeners[type] ??= []).push(fn)
    },
    clients: {
      matchAll: (opts?: unknown) => { matchAllCalls.push(opts); return matchAll() },
      claim: async () => {},
    },
    skipWaiting: () => {},
  }

  // eslint-disable-next-line no-new-func
  new Function('self', SOURCE)(selfStub)

  return {
    matchAllCalls,
    setClients: (c: typeof clients) => { clients = c },
    rejectMatchAll: (err: Error) => { matchAll = async () => { throw err } },
    deliverMessage(data: unknown) {
      listeners.message[0]({ data } as never)
    },
    fetchFor(url: string): Promise<Response> {
      let responded: Promise<Response> | undefined
      const event = { request: new Request(url), respondWith: (p: Promise<Response>) => { responded = p } }
      listeners.fetch[0](event as never)
      expect(responded, 'fetch listener did not respondWith').toBeDefined()
      return responded as Promise<Response>
    },
  }
}

describe('challenge-sw re-registration request on registry miss', () => {
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('asks every window client to re-register', async () => {
    vi.useFakeTimers()
    const worker = loadWorker()
    const a = { postMessage: vi.fn() }
    const b = { postMessage: vi.fn() }
    worker.setClients([a, b])

    const responded = worker.fetchFor('https://challenge-gone.localhost/')
    await vi.advanceTimersByTimeAsync(0)

    expect(a.postMessage).toHaveBeenCalledWith({ type: 'REQUEST_REGISTRATION', slug: 'gone' })
    expect(b.postMessage).toHaveBeenCalledWith({ type: 'REQUEST_REGISTRATION', slug: 'gone' })

    await vi.advanceTimersByTimeAsync(3001)
    expect((await responded).status).toBe(503)
  })

  it('includes uncontrolled window clients in the ask', async () => {
    // A page on its first visit or after a hard refresh can be active-but-not-
    // controlling. The readiness gate already treats that state as legitimate;
    // the ask has to reach the same set of pages the gate lets through.
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.setClients([])

    const responded = worker.fetchFor('https://challenge-gone.localhost/')
    await vi.advanceTimersByTimeAsync(0)

    expect(worker.matchAllCalls[0]).toEqual({ type: 'window', includeUncontrolled: true })

    await vi.advanceTimersByTimeAsync(3001)
    expect((await responded).status).toBe(503)
  })

  it('answers 503, not 500, when the ask itself fails', async () => {
    // A failed broadcast must not change the failure shape: the caller still
    // sees "challenge not registered", which is what the page's error handling
    // and the e2e assertions are written against.
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.rejectMatchAll(new Error('clients unavailable'))

    const responded = worker.fetchFor('https://challenge-gone.localhost/')
    await vi.advanceTimersByTimeAsync(3001)

    // Asserted, not assumed: 503 is also what a worker that never asks returns.
    expect(worker.matchAllCalls).toHaveLength(1)
    const res = await responded
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('challenge not registered')
  })
})


describe('challenge-sw re-registration under concurrent misses', () => {
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  /**
   * Mirrors what ChallengeLayout does on REQUEST_REGISTRATION: retire the old
   * relay port and register a brand new channel. Records every port it ever
   * registered so a test can tell which one the worker is holding.
   */
  function attachPage(worker: ReturnType<typeof loadWorker>, slug: string) {
    const registeredPorts: MessagePort[] = []
    const client = {
      postMessage: (msg: { type?: string; slug?: string }) => {
        if (msg.type !== 'REQUEST_REGISTRATION' || msg.slug !== slug) return
        const mc = new MessageChannel()
        // Faithful to rebuildChannelAndRegister: the previous relay port is
        // retired before the new one is announced to the worker.
        registeredPorts.at(-1)?.close()
        mc.port1.onmessage = (e: MessageEvent) => {
          const { responsePort } = e.data as { responsePort: MessagePort }
          responsePort.postMessage({ status: 200, headers: [], body: new ArrayBuffer(0) })
        }
        registeredPorts.push(mc.port1)
        worker.deliverMessage({ type: 'REGISTER_CHALLENGE', slug, backend: 'php', port: mc.port2 })
      },
    }
    worker.setClients([client])
    return { registeredPorts }
  }

  it('asks once, not once per concurrent miss', async () => {
    // A page load after an idle termination misses on the document and on every
    // sub-resource at the same time. One broadcast per miss means the page
    // rebuilds its channel that many times, retiring the very port the worker
    // just recorded.
    const worker = loadWorker()
    const page = attachPage(worker, 'gone')

    await Promise.all([
      worker.fetchFor('https://challenge-gone.localhost/'),
      worker.fetchFor('https://challenge-gone.localhost/app.css'),
      worker.fetchFor('https://challenge-gone.localhost/app.js'),
    ])

    expect(worker.matchAllCalls).toHaveLength(1)
    expect(page.registeredPorts).toHaveLength(1)
  })

  it('answers every concurrent miss instead of hanging on a retired port', async () => {
    const worker = loadWorker()
    attachPage(worker, 'gone')

    const settled = await Promise.all(
      ['/', '/app.css', '/app.js'].map((path) =>
        Promise.race([
          worker.fetchFor('https://challenge-gone.localhost' + path).then((r) => r.status),
          new Promise((resolve) => setTimeout(() => resolve('hung'), 2000)),
        ]),
      ),
    )

    expect(settled).toEqual([200, 200, 200])
  })
})


describe('challenge-sw re-registration debounce window', () => {
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('asks again once the debounce has elapsed, even while an earlier waiter is still pending', async () => {
    // The suppression window must track the ask, not the wait. A waiter lives
    // for the full registration timeout, so keying on it means a page that
    // mounts late — after an ask nobody could answer — never gets asked again,
    // and its request 503s having triggered no broadcast at all.
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.setClients([])

    const first = worker.fetchFor('https://challenge-late.localhost/')
    await vi.advanceTimersByTimeAsync(0)
    expect(worker.matchAllCalls).toHaveLength(1)

    // Still inside the same registration wait, well past any plausible in-flight ask.
    await vi.advanceTimersByTimeAsync(2000)
    const second = worker.fetchFor('https://challenge-late.localhost/')
    await vi.advanceTimersByTimeAsync(0)

    expect(worker.matchAllCalls).toHaveLength(2)

    await vi.advanceTimersByTimeAsync(4000)
    expect((await first).status).toBe(503)
    expect((await second).status).toBe(503)
  })

  it('still asks only once for misses arriving in the same tick', async () => {
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.setClients([])

    worker.fetchFor('https://challenge-burst.localhost/')
    worker.fetchFor('https://challenge-burst.localhost/a.css')
    worker.fetchFor('https://challenge-burst.localhost/b.js')
    await vi.advanceTimersByTimeAsync(0)

    expect(worker.matchAllCalls).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(4000)
  })
})


describe('challenge-sw relay deadline', () => {
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  /**
   * Timer discipline — read this before adding a test to this block.
   *
   * Fake timers do not drive MessagePort delivery. A port message is a real
   * macrotask, and advanceTimersByTimeAsync only yields to the real loop between
   * the fake timers it actually fires — so a single large jump can advance the
   * clock past the deadline without ever letting the page receive
   * HANDLE_REQUEST or letting its answer come back.
   *
   * The failure is position-dependent: the same block can pass as the fourth
   * test in a file and hang as the first, because whatever ran before it
   * happened to leave real ticks on the loop. Do not trust a green run to mean
   * the stepping was unnecessary.
   *
   * So: any test where the page must *receive* or *answer* something steps time
   * with `step()` below. Only a test that waits on nothing but a timer — the
   * peer is already gone, so no message can ever arrive — may jump once.
   */
  const step = async (total: number, size = 250) => {
    for (let elapsed = 0; elapsed < total; elapsed += size) {
      await vi.advanceTimersByTimeAsync(Math.min(size, total - elapsed))
    }
  }

  /**
   * A registration whose peer is gone. Closing one end leaves the other open
   * with nothing attached: postMessage on it throws nothing, fires no
   * messageerror, and delivers nowhere. That silence is the whole defect.
   */
  function registerDeadPort(worker: ReturnType<typeof loadWorker>, slug: string) {
    const mc = new MessageChannel()
    mc.port1.close()
    worker.deliverMessage({ type: 'REGISTER_CHALLENGE', slug, backend: 'php', port: mc.port2 })
  }

  /** A registration whose page is present. `answer` receives the responsePort. */
  function registerLivePort(
    worker: ReturnType<typeof loadWorker>,
    slug: string,
    answer: (responsePort: MessagePort) => void,
  ) {
    const mc = new MessageChannel()
    mc.port1.onmessage = (e: MessageEvent) => {
      answer((e.data as { responsePort: MessagePort }).responsePort)
    }
    worker.deliverMessage({ type: 'REGISTER_CHALLENGE', slug, backend: 'php', port: mc.port2 })
  }

  /** Answers a REQUEST_REGISTRATION broadcast with a fresh port that serves 200. */
  function attachAnsweringPage(worker: ReturnType<typeof loadWorker>, slug: string) {
    worker.setClients([{
      postMessage: (msg: { type?: string; slug?: string }) => {
        if (msg.type !== 'REQUEST_REGISTRATION' || msg.slug !== slug) return
        registerLivePort(worker, slug, (port) => {
          port.postMessage({ status: 200, headers: [], body: new ArrayBuffer(0) })
        })
      },
    }])
  }

  it('answers instead of hanging when the relay peer is gone', async () => {
    // Deliberately weak: only that something came back at all. The next test
    // pins the shape. Measured evidence that the two are not redundant: the
    // mutant that throws on the deadline instead of returning the sentinel
    // leaves this test green — a 500 satisfies "at least 500" — and turns the
    // next one red.
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.setClients([])
    registerDeadPort(worker, 'dead')

    const responded = worker.fetchFor('https://challenge-dead.localhost/')
    await vi.advanceTimersByTimeAsync(30_000)

    const res = await responded
    expect(res.status).toBeGreaterThanOrEqual(500)
  })

  it('answers a timed-out relay with 504 and a fixed message', async () => {
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.setClients([])
    registerDeadPort(worker, 'dead')

    const responded = worker.fetchFor('https://challenge-dead.localhost/')
    await vi.advanceTimersByTimeAsync(30_000)

    const res = await responded
    expect(res.status).toBe(504)
    expect((await res.json()).error).toBe('challenge runtime did not respond')
  })

  it('serves a response that arrives within the deadline unchanged', async () => {
    // 201 with a body no timeout branch could fabricate: if this ever reports the
    // deadline's status or an empty body, the race resolved the wrong side.
    const worker = loadWorker()
    worker.setClients([])
    registerLivePort(worker, 'live', (port) => {
      port.postMessage({
        status: 201,
        headers: [['content-type', 'text/plain']],
        body: new TextEncoder().encode('from the page').buffer,
      })
    })

    const res = await worker.fetchFor('https://challenge-live.localhost/')

    expect(res.status).toBe(201)
    expect(await res.text()).toBe('from the page')
  })

  it('does not cut off a page that answers just inside the deadline', async () => {
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.setClients([])
    let held: MessagePort | undefined
    registerLivePort(worker, 'slow', (port) => { held = port })

    const responded = worker.fetchFor('https://challenge-slow.localhost/')
    await step(10_000)

    expect(held, 'page never received HANDLE_REQUEST').toBeDefined()
    held!.postMessage({ status: 201, headers: [], body: new ArrayBuffer(0) })
    await step(1000)

    expect((await responded).status).toBe(201)
  })

  it('keeps the registration of a page that is slow but alive', async () => {
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.setClients([])
    let held: MessagePort | undefined
    let answered = 0
    registerLivePort(worker, 'slowalive', (port) => {
      answered += 1
      if (answered === 1) { held = port; return }
      port.postMessage({ status: 200, headers: [], body: new ArrayBuffer(0) })
    })

    const first = worker.fetchFor('https://challenge-slowalive.localhost/')
    await step(10_000)
    held!.postMessage({ status: 201, headers: [], body: new ArrayBuffer(0) })
    await step(1000)
    expect((await first).status).toBe(201)

    // The point of the test: answering late must not have cost it its slot.
    const second = worker.fetchFor('https://challenge-slowalive.localhost/')
    await step(1000)

    expect((await second).status).toBe(200)
    expect(worker.matchAllCalls).toHaveLength(0)
  })

  it('leaves no armed timer behind after a successful relay', async () => {
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.setClients([])
    registerLivePort(worker, 'timer', (port) => {
      port.postMessage({ status: 200, headers: [], body: new ArrayBuffer(0) })
    })

    const responded = worker.fetchFor('https://challenge-timer.localhost/')
    await step(1000)

    expect((await responded).status).toBe(200)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('evicts the dead registration so the next request asks again', async () => {
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.setClients([])
    registerDeadPort(worker, 'revive')

    const first = worker.fetchFor('https://challenge-revive.localhost/')
    await vi.advanceTimersByTimeAsync(30_000)
    expect((await first).status).toBe(504)
    // The hit path never broadcasts: eviction is what turns the *next* request
    // into a miss, and the miss is what asks.
    expect(worker.matchAllCalls).toHaveLength(0)

    attachAnsweringPage(worker, 'revive')
    const second = worker.fetchFor('https://challenge-revive.localhost/')
    await step(2000)

    expect((await second).status).toBe(200)
    expect(worker.matchAllCalls).toHaveLength(1)
  })

  it('does not evict a registration that landed while the relay was in flight', async () => {
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.setClients([])
    registerDeadPort(worker, 'newer')

    const first = worker.fetchFor('https://challenge-newer.localhost/')
    await step(500)
    // The page re-registered for its own reasons while this relay was still out.
    registerLivePort(worker, 'newer', (port) => {
      port.postMessage({ status: 200, headers: [], body: new ArrayBuffer(0) })
    })
    await vi.advanceTimersByTimeAsync(30_000)
    expect((await first).status).toBe(504)

    const second = worker.fetchFor('https://challenge-newer.localhost/')
    await step(1000)

    // Hit, not miss: a fifteen-second-old relay must not take out a registration
    // that is younger than its own timeout.
    expect((await second).status).toBe(200)
    expect(worker.matchAllCalls).toHaveLength(0)
  })

  it('evicts a slug at most once per eviction window', async () => {
    // The loop this guards: timeout evicts, the next request misses, the ask
    // makes the page rebuild, and the rebuilt port times out too. On that second
    // turn the identity check passes — the registry really is holding the port
    // that just timed out — so the debounce is the only thing left.
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.setClients([])
    registerDeadPort(worker, 'thrash')

    // Each turn advances just past the deadline, because the spacing is the
    // whole point: in the real loop the second timeout lands about one deadline
    // after the first, not two. Jumping a round 30_000 per turn would space the
    // evictions by exactly the window and let this pass with no debounce at all.
    const first = worker.fetchFor('https://challenge-thrash.localhost/')
    await vi.advanceTimersByTimeAsync(15_001)
    expect((await first).status).toBe(504)

    // Stand in for the rebuild the broadcast would have caused, without going
    // through the broadcast — so matchAllCalls stays a clean miss counter.
    registerDeadPort(worker, 'thrash')
    const second = worker.fetchFor('https://challenge-thrash.localhost/')
    await vi.advanceTimersByTimeAsync(15_001)
    expect((await second).status).toBe(504)

    const third = worker.fetchFor('https://challenge-thrash.localhost/')
    await vi.advanceTimersByTimeAsync(15_001)
    expect((await third).status).toBe(504)

    // Zero: the second timeout was inside the window and left the registration
    // alone, so the third request hit it instead of missing and asking.
    expect(worker.matchAllCalls).toHaveLength(0)
  })

  it('does not carry the eviction window across an unregister', async () => {
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.setClients([])
    registerDeadPort(worker, 'unreg')

    const first = worker.fetchFor('https://challenge-unreg.localhost/')
    await vi.advanceTimersByTimeAsync(15_001)
    expect((await first).status).toBe(504)

    // The page navigates away and tears its registration down; a new page mounts
    // and registers. The window the departed page earned must not go on
    // governing a registration that is not the one it was counted against.
    worker.deliverMessage({ type: 'UNREGISTER_CHALLENGE', slug: 'unreg' })
    registerDeadPort(worker, 'unreg')

    const second = worker.fetchFor('https://challenge-unreg.localhost/')
    await vi.advanceTimersByTimeAsync(15_001)
    expect((await second).status).toBe(504)

    const third = worker.fetchFor('https://challenge-unreg.localhost/')
    await vi.advanceTimersByTimeAsync(0)

    // A miss, not a hit: the second timeout evicted, so this one asks. Leaving
    // the window in place would have suppressed that eviction and this request
    // would have relayed into the same dead port for another fifteen seconds.
    expect(worker.matchAllCalls).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(4000)
    expect((await third).status).toBe(503)
  })

  it('keeps the registration when the relay path throws', async () => {
    // 999 is not a status the Response constructor accepts, so assembling the
    // reply throws and lands in the existing catch. A thrown error is not a
    // peer that never answered, and only the latter evicts.
    vi.useFakeTimers()
    const worker = loadWorker()
    worker.setClients([])
    let answered = 0
    registerLivePort(worker, 'thrower', (port) => {
      answered += 1
      port.postMessage(
        answered === 1
          ? { status: 999, headers: [], body: new ArrayBuffer(0) }
          : { status: 200, headers: [], body: new ArrayBuffer(0) },
      )
    })

    const first = worker.fetchFor('https://challenge-thrower.localhost/')
    await step(1000)
    expect((await first).status).toBe(500)

    const second = worker.fetchFor('https://challenge-thrower.localhost/')
    await step(1000)

    expect((await second).status).toBe(200)
    expect(worker.matchAllCalls).toHaveLength(0)
  })
})


/**
 * The retired-port grace window lives in ChallengeLayout and the registration
 * timeout lives in the worker, and the page-side doc comment asserts they are
 * the same value. That invariant was enforced by prose in a different file from
 * the value it constrains: raise the worker's timeout and the grace window
 * silently becomes too short, so a relay lands on a port revoked at three
 * seconds and the worker then sits out the whole relay deadline before 504ing —
 * a softened version of the hang the deadline exists to close.
 */
describe('challenge-sw and ChallengeLayout share their timing invariant', () => {
  it('keeps the retired-port grace window equal to the worker registration timeout', () => {
    const layout = readFileSync(resolve('.vitepress/theme/layouts/ChallengeLayout.vue'), 'utf8')
    const ttl = /const RETIRED_PORT_TTL_MS = (\d+)/.exec(layout)
    const registration = /const REGISTRATION_TIMEOUT_MS = (\d+)/.exec(SOURCE)

    expect(ttl, 'RETIRED_PORT_TTL_MS not found in ChallengeLayout.vue').not.toBeNull()
    expect(registration, 'REGISTRATION_TIMEOUT_MS not found in challenge-sw.js').not.toBeNull()
    expect(Number(ttl![1])).toBe(Number(registration![1]))
  })
})

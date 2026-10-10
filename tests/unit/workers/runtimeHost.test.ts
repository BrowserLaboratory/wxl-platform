/**
 * The runtime host is the main-thread owner of one Worker: its lifecycle, its
 * message protocol, its deadline, and its rebuild.
 *
 * The Worker is injected rather than constructed, because the suite runs under
 * happy-dom, which has no Worker implementation. Injection is also what lets a
 * test drive the protocol both ways without a real thread — the same reason the
 * Service Worker suite drives the shipped script with a stub `self`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createChallengeRuntimeHost,
  createToolsRuntimeHost,
  EXEC_TIMEOUT_MS,
  timedOutResponse,
  type WorkerLike,
} from '../../../.vitepress/theme/workers/runtimeHost'

interface StubWorker extends WorkerLike {
  sent: Record<string, unknown>[]
  terminated: boolean
  /** Deliver a worker→main message to the host. */
  emit(msg: Record<string, unknown>): void
}

function stubWorker(): StubWorker {
  const w: StubWorker = {
    sent: [],
    terminated: false,
    onmessage: null,
    postMessage(msg: unknown) { w.sent.push(msg as Record<string, unknown>) },
    terminate() { w.terminated = true },
    emit(msg) { w.onmessage?.({ data: msg }) },
  }
  return w
}

/** A factory that records every worker it hands out. */
function recordingFactory() {
  const made: StubWorker[] = []
  const create = vi.fn(() => { const w = stubWorker(); made.push(w); return w })
  return { made, create }
}

/** Answer the host's INIT so `initialize()` settles. */
function answerInit(w: StubWorker) {
  const init = w.sent.find(m => m.type === 'INIT')
  expect(init, 'host did not send INIT').toBeDefined()
  w.emit({ type: 'READY', id: init!.id })
}

describe('runtime host — worker lifecycle', () => {
  it('does not create a tools worker before code is first run', () => {
    const { create } = recordingFactory()

    createToolsRuntimeHost({ createWorker: create })

    // Constructing the host is not opening the Code panel. The tools instance is
    // the one that must stay lazy: it is a second Pyodide download, and the
    // learner may never open that panel at all.
    expect(create).not.toHaveBeenCalled()
  })

  it('creates the tools worker on the first run and reuses it on the second', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create })

    void host.runCode('print(1)')
    expect(create).toHaveBeenCalledTimes(1)

    const w = made[0]
    const run = w.sent.find(m => m.type === 'RUN_CODE')
    expect(run).toBeDefined()
    w.emit({ type: 'DONE', id: run!.id, error: null })

    void host.runCode('print(2)')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('reports not ready until the challenge worker answers INIT', async () => {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create })

    const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    expect(host.ready).toBe(false)

    answerInit(made[0])
    await started

    expect(host.ready).toBe(true)
  })

  it('sends the initialization payload the worker needs', async () => {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create })

    const fsEntries = { '/flag.txt': new Uint8Array([1, 2]) }
    const started = host.initialize({ backend: 'flask', appCode: 'app = 1', fsEntries, packages: ['requests'] })
    answerInit(made[0])
    await started

    const init = made[0].sent.find(m => m.type === 'INIT')!
    expect(init.backend).toBe('flask')
    expect(init.appCode).toBe('app = 1')
    expect(init.fsEntries).toBe(fsEntries)
    expect(init.packages).toEqual(['requests'])
  })

  it('correlates a response to its own request', async () => {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create })
    const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    answerInit(made[0])
    await started

    const w = made[0]
    const first = host.handleRequest(new Request('https://challenge-x.localhost/a'))
    const second = host.handleRequest(new Request('https://challenge-x.localhost/b'))

    // The request body is read before the message is posted, so the post lands a
    // microtask later than the call. Waiting here asserts nothing; it just lets
    // both messages exist before they are inspected.
    await new Promise(r => setTimeout(r, 0))

    const reqs = w.sent.filter(m => m.type === 'REQUEST')
    expect(reqs).toHaveLength(2)
    expect(reqs[0].id).not.toBe(reqs[1].id)

    // Answer out of order: a host that assumes FIFO would hand /a the /b body.
    w.emit({ type: 'RESPONSE', id: reqs[1].id, status: 201, headers: [], body: new TextEncoder().encode('B').buffer, setCookies: [] })
    w.emit({ type: 'RESPONSE', id: reqs[0].id, status: 200, headers: [], body: new TextEncoder().encode('A').buffer, setCookies: [] })

    expect(await (await first).text()).toBe('A')
    expect(await (await second).text()).toBe('B')
  })

  it('destroys the worker it owns', async () => {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create })
    const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    answerInit(made[0])
    await started

    host.destroy()

    expect(made[0].terminated).toBe(true)
    expect(host.ready).toBe(false)
  })
})

describe('runtime host — the main thread stays on the dispatch path', () => {
  it('routes a learner request through the injected dispatch and answers the same id', async () => {
    const { made, create } = recordingFactory()
    const seen: Request[] = []
    const dispatch = vi.fn(async (req: Request) => {
      seen.push(req)
      return new Response('from the challenge', { status: 200, headers: { 'x-probe': '1' } })
    })

    const host = createToolsRuntimeHost({ createWorker: create, onDispatch: dispatch })
    void host.runCode('requests.get("/")')
    const w = made[0]

    w.emit({
      type: 'DISPATCH',
      id: 900,
      method: 'POST',
      url: 'https://challenge-x.localhost/login',
      headers: [['content-type', 'text/plain']],
      body: 'user=admin',
    })
    await new Promise(r => setTimeout(r, 0))

    // The tools worker holds no channel to the challenge worker: the only way
    // this request can be answered is the function the main thread injected.
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(seen[0].method).toBe('POST')
    expect(seen[0].url).toBe('https://challenge-x.localhost/login')
    expect(await seen[0].text()).toBe('user=admin')

    const reply = w.sent.find(m => m.type === 'DISPATCH_RESULT')
    expect(reply, 'host did not answer the DISPATCH').toBeDefined()
    expect(reply!.id).toBe(900)
    expect(reply!.status).toBe(200)
    expect(reply!.body).toBe('from the challenge')
    expect(reply!.headers).toContainEqual(['x-probe', '1'])
  })

  it('answers a failed dispatch rather than leaving the learner call hanging', async () => {
    const { made, create } = recordingFactory()
    const dispatch = vi.fn(async () => { throw new Error('runtime is gone') })

    const host = createToolsRuntimeHost({ createWorker: create, onDispatch: dispatch })
    void host.runCode('requests.get("/")')
    const w = made[0]

    w.emit({ type: 'DISPATCH', id: 901, method: 'GET', url: 'https://challenge-x.localhost/', headers: [], body: '' })
    await new Promise(r => setTimeout(r, 0))

    // A learner call blocked on run_sync never returns if the reply is dropped,
    // and no timer on the worker thread can rescue it — the WASM stack is
    // suspended, not the loop. The reply is therefore mandatory, not best effort.
    const reply = w.sent.find(m => m.type === 'DISPATCH_RESULT')
    expect(reply, 'a failed dispatch must still be answered').toBeDefined()
    expect(reply!.id).toBe(901)
    expect(reply!.status).toBe(502)
  })

  it('answers a dispatch even when no dispatch function was injected', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create })
    void host.runCode('requests.get("/")')
    const w = made[0]

    w.emit({ type: 'DISPATCH', id: 902, method: 'GET', url: 'https://challenge-x.localhost/', headers: [], body: '' })
    await new Promise(r => setTimeout(r, 0))

    const reply = w.sent.find(m => m.type === 'DISPATCH_RESULT')
    expect(reply, 'an unwired host must still answer').toBeDefined()
    expect(reply!.status).toBe(502)
  })
})

describe('runtime host — the execution deadline', () => {
  /**
   * Fake timers throughout: the deadline is the thing under test, so letting it
   * run in real time would make the suite slow and the assertions racy.
   */
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  async function readyHost(execTimeoutMs?: number) {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create, execTimeoutMs })
    const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    await vi.advanceTimersByTimeAsync(0)
    answerInit(made[0])
    await started
    return { host, w: made[0], made, create }
  }

  it('terminates a worker whose request runs past the deadline', async () => {
    const { host, w } = await readyHost(1000)

    const pending = host.handleRequest(new Request('https://challenge-x.localhost/loop'))
    await vi.advanceTimersByTimeAsync(999)
    // One millisecond short: the worker is still the learner's, not a casualty.
    expect(w.terminated).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(w.terminated).toBe(true)

    const res = await pending
    expect(res.status).toBe(508)
  })

  it('leaves a request that answers inside the deadline untouched', async () => {
    const { host, w } = await readyHost(1000)

    const pending = host.handleRequest(new Request('https://challenge-x.localhost/fast'))
    await vi.advanceTimersByTimeAsync(0)
    const req = w.sent.find(m => m.type === 'REQUEST')!
    w.emit({ type: 'RESPONSE', id: req.id, status: 200, headers: [], body: new TextEncoder().encode('hi').buffer, setCookies: [] })

    expect((await pending).status).toBe(200)

    // Past the deadline the timer must already be disarmed, or a served request
    // would kill the worker that served it.
    await vi.advanceTimersByTimeAsync(5000)
    expect(w.terminated).toBe(false)
  })

  it('does not apply the deadline to initialization', async () => {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 1000 })

    const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    // A rebuild re-runs a cold WebAssembly start, the app code and the FS mount.
    // If the per-request deadline covered that, the rebuild would be destroyed
    // and rebuilt forever — a livelock only reachable after a first expiry.
    //
    // Well past the 1000ms request deadline and well inside the initialization
    // budget, so this asserts the request deadline's scope and nothing else.
    await vi.advanceTimersByTimeAsync(30_000)
    expect(made[0].terminated).toBe(false)

    answerInit(made[0])
    await started
    expect(host.ready).toBe(true)
  })

  it('refuses a non-positive deadline instead of running without one', () => {
    const { create } = recordingFactory()

    // Silently accepting zero yields a runtime that never expires, which is the
    // exact condition this capability exists to remove.
    expect(() => createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 0 }))
      .toThrow(/deadline/i)
    expect(() => createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: -1 }))
      .toThrow(/deadline/i)
  })

  it('defaults to the shipped deadline', async () => {
    const { host, w } = await readyHost()

    void host.handleRequest(new Request('https://challenge-x.localhost/loop'))
    await vi.advanceTimersByTimeAsync(EXEC_TIMEOUT_MS - 1)
    expect(w.terminated).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(w.terminated).toBe(true)
  })
})

describe('runtime host — the deadline answer', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  /** A challenge host whose worker never answers anything. */
  async function hangingChallenge(execTimeoutMs: number) {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create, execTimeoutMs })
    const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    await vi.advanceTimersByTimeAsync(0)
    answerInit(made[0])
    await started
    return { host, w: made[0] }
  }

  it('answers with the exact status and body the spec fixes', async () => {
    const { host } = await hangingChallenge(1000)

    const pending = host.handleRequest(new Request('https://challenge-x.localhost/loop'))
    await vi.advanceTimersByTimeAsync(1000)
    const res = await pending

    expect(res.status).toBe(508)
    expect(res.headers.get('content-type')).toBe('application/json')
    expect(await res.text()).toBe('{"error":"challenge runtime execution exceeded the time limit"}')
  })

  it('is not reported as a thrown runtime error or as a dead relay peer', async () => {
    const { host } = await hangingChallenge(1000)

    const pending = host.handleRequest(new Request('https://challenge-x.localhost/loop'))
    await vi.advanceTimersByTimeAsync(1000)
    const res = await pending

    // 500 is reserved for a runtime that threw; 504 means the page holding the
    // relay port is gone. Either would send the learner after the wrong cause.
    expect(res.status).not.toBe(500)
    expect(res.status).not.toBe(504)
  })

  it('gives the Code panel path and the direct path byte-identical answers', async () => {
    const { host: challenge } = await hangingChallenge(1000)

    // The Code panel path: learner code → tools worker → main thread → challenge
    // host. It reaches the same assembly, so the bytes cannot drift apart.
    const { made, create } = recordingFactory()
    const tools = createToolsRuntimeHost({
      createWorker: create,
      onDispatch: (req) => challenge.handleRequest(req),
    })
    void tools.runCode('requests.get("/loop")')
    const toolsWorker = made[0]
    toolsWorker.emit({ type: 'DISPATCH', id: 700, method: 'GET', url: 'https://challenge-x.localhost/loop', headers: [], body: '' })

    const direct = challenge.handleRequest(new Request('https://challenge-x.localhost/loop'))
    await vi.advanceTimersByTimeAsync(1000)

    const viaPanel = toolsWorker.sent.find(m => m.type === 'DISPATCH_RESULT')
    expect(viaPanel, 'the Code panel path was never answered').toBeDefined()

    const viaDirect = await direct
    expect(viaPanel!.status).toBe(viaDirect.status)
    expect(viaPanel!.body).toBe(await viaDirect.text())
  })

  it('exposes one assembly, not one per call site', async () => {
    const a = await timedOutResponse().text()
    const b = await timedOutResponse().text()
    expect(a).toBe(b)
    expect(timedOutResponse().status).toBe(508)
  })
})

describe('runtime host — rebuild after destruction', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  async function expiredHost(onReset?: () => void) {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 1000, onReset })
    const started = host.initialize({ backend: 'php', appCode: '<?php app', fsEntries: { '/f': new Uint8Array([1]) }, packages: ['p'] })
    await vi.advanceTimersByTimeAsync(0)
    answerInit(made[0])
    await started

    const pending = host.handleRequest(new Request('https://challenge-x.localhost/loop'))
    await vi.advanceTimersByTimeAsync(1000)
    await pending
    return { host, made, create }
  }

  it('starts the rebuild without waiting for another request', async () => {
    const { made, create } = await expiredHost()

    // Rebuilding lazily would put a cold WebAssembly start inside the Service
    // Worker's relay window, where a slow network can consume the whole thing —
    // and the learner would then see the relay's timeout, not their own.
    expect(create).toHaveBeenCalledTimes(2)
    expect(made[0].terminated).toBe(true)
    expect(made[1].terminated).toBe(false)
  })

  it('re-initializes with the payload the challenge was started with', async () => {
    const { made } = await expiredHost()

    const init = made[1].sent.find(m => m.type === 'INIT')
    expect(init, 'the replacement was never initialized').toBeDefined()
    expect(init!.backend).toBe('php')
    expect(init!.appCode).toBe('<?php app')
    expect(init!.packages).toEqual(['p'])
  })

  it('reports not ready for the duration of the rebuild and ready again after', async () => {
    const { host, made } = await expiredHost()

    expect(host.ready).toBe(false)

    answerInit(made[1])
    await vi.advanceTimersByTimeAsync(0)

    expect(host.ready).toBe(true)
  })

  it('says the challenge state was reset', async () => {
    const onReset = vi.fn()
    await expiredHost(onReset)

    // The learner is logged out and their uploaded files are gone. Without this
    // they read the reset as the challenge being broken.
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('does not rebuild after an explicit teardown', async () => {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 1000 })
    const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    await vi.advanceTimersByTimeAsync(0)
    answerInit(made[0])
    await started

    host.destroy()
    await vi.advanceTimersByTimeAsync(1000)

    // Leaving the challenge page is not a runaway. Rebuilding here would load a
    // WebAssembly runtime for a page nobody is on.
    expect(create).toHaveBeenCalledTimes(1)
  })
})

describe('runtime host — requests that arrive while the runtime is coming back', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('holds a request sent during a rebuild and serves it afterwards', async () => {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 1000 })
    const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    await vi.advanceTimersByTimeAsync(0)
    answerInit(made[0])
    await started

    const doomed = host.handleRequest(new Request('https://challenge-x.localhost/loop'))
    await vi.advanceTimersByTimeAsync(1000)
    expect((await doomed).status).toBe(508)

    // The replacement exists but has not answered INIT: mid-rebuild.
    expect(host.ready).toBe(false)
    const later = host.handleRequest(new Request('https://challenge-x.localhost/after'))
    await vi.advanceTimersByTimeAsync(0)

    // Refusing here would turn a rebuild into a visible failure, and the caller
    // cannot tell "not ready yet" from "broken".
    expect(made[1].sent.find(m => m.type === 'REQUEST')).toBeUndefined()

    answerInit(made[1])
    await vi.advanceTimersByTimeAsync(0)

    const req = made[1].sent.find(m => m.type === 'REQUEST')
    expect(req, 'the held request was never sent on').toBeDefined()
    made[1].emit({ type: 'RESPONSE', id: req!.id, status: 200, headers: [], body: new TextEncoder().encode('served').buffer, setCookies: [] })
    const res = await later
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('served')
  })

  it('does not spend a held request\'s deadline on the rebuild it is waiting for', async () => {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 1000 })
    const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    await vi.advanceTimersByTimeAsync(0)
    answerInit(made[0])
    await started

    const doomed = host.handleRequest(new Request('https://challenge-x.localhost/loop'))
    await vi.advanceTimersByTimeAsync(1000)
    await doomed

    const later = host.handleRequest(new Request('https://challenge-x.localhost/after'))
    // A cold WebAssembly start is longer than a per-request budget. If the
    // deadline ran while the request waited, the replacement would be destroyed
    // and rebuilt forever — the livelock the deadline's scope exists to avoid.
    await vi.advanceTimersByTimeAsync(5000)
    expect(made[1].terminated).toBe(false)

    answerInit(made[1])
    await vi.advanceTimersByTimeAsync(0)
    const req = made[1].sent.find(m => m.type === 'REQUEST')!
    made[1].emit({ type: 'RESPONSE', id: req.id, status: 200, headers: [], body: new TextEncoder().encode('ok').buffer, setCookies: [] })
    expect((await later).status).toBe(200)
  })
})

describe('runtime host — forbidden headers on the learner dispatch path', () => {
  it('carries Cookie across the worker boundary instead of letting fetch drop it', async () => {
    const { made, create } = recordingFactory()
    const seen: Request[] = []
    const host = createToolsRuntimeHost({
      createWorker: create,
      onDispatch: async (req) => { seen.push(req); return new Response('ok') },
    })
    void host.runCode('requests.get("/", cookies=...)')
    const w = made[0]

    w.emit({
      type: 'DISPATCH', id: 800, method: 'GET',
      url: 'https://challenge-x.localhost/admin',
      headers: [['cookie', 'sid=abc']],
      body: '',
    })
    await new Promise(r => setTimeout(r, 0))

    // Cookie is a forbidden request header: `new Request()` drops it silently.
    // The platform's existing carrier is X-Wxlsh-Cookie, and the runtime
    // converts it back at its own boundary. Losing this is not a crash — it is
    // a learner who can never stay logged in, which is how it went unnoticed
    // once before.
    expect(seen[0].headers.get('cookie')).toBeNull()
    expect(seen[0].headers.get('x-wxlsh-cookie')).toBe('sid=abc')
  })
})

describe('tools runtime host — stopping a run', () => {
  it('ends the run, keeps it out of the error bucket, and rebuilds', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create })

    const chunks: string[] = []
    const run = host.runCode('while True: print(1)', c => chunks.push(c))
    const w = made[0]
    const id = w.sent.find(m => m.type === 'RUN_CODE')!.id
    w.emit({ type: 'STDOUT', id, chunk: 'found: 41\n' })
    w.emit({ type: 'STDOUT', id, chunk: 'found: 42\n' })

    host.stop()
    const result = await run

    expect(w.terminated).toBe(true)
    // Stopping is a learner action, not a failure of their code. Reporting it as
    // an error would file a deliberate stop next to a NameError in the history.
    expect(result.error).toBeNull()
    expect(result.stopped).toBe(true)
    // The chunks already delivered are the learner's, and on this platform they
    // are frequently the answer being enumerated.
    expect(chunks).toEqual(['found: 41\n', 'found: 42\n'])

    // Rebuilt eagerly, so the next Run does not pay for a cold start.
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('is inert when nothing is running', () => {
    const { create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create })

    expect(() => host.stop()).not.toThrow()
    expect(create).not.toHaveBeenCalled()
  })

  it('reports a completed run as not stopped', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create })

    const run = host.runCode('print(1)')
    const id = made[0].sent.find(m => m.type === 'RUN_CODE')!.id
    made[0].emit({ type: 'DONE', id, error: null })

    expect(await run).toEqual({ error: null, stopped: false, timedOut: false })
  })
})

describe('runtime host — the rebuild is not eaten by the deadline it just tripped', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('survives a re-initialization that takes longer than the execution deadline', async () => {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 1000 })
    const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    await vi.advanceTimersByTimeAsync(0)
    answerInit(made[0])
    await started

    const doomed = host.handleRequest(new Request('https://challenge-x.localhost/loop'))
    await vi.advanceTimersByTimeAsync(1000)
    expect((await doomed).status).toBe(508)
    expect(create).toHaveBeenCalledTimes(2)

    // The replacement is running a cold WebAssembly start, the app code and the
    // filesystem mount — comfortably longer than a per-request budget. If the
    // deadline covered initialization, this is where it would be destroyed and
    // rebuilt, and again, and again. The failure is reachable only after a first
    // expiry, which is why no ordinary test would find it.
    await vi.advanceTimersByTimeAsync(30_000)

    expect(create).toHaveBeenCalledTimes(2)
    expect(made[1].terminated).toBe(false)

    answerInit(made[1])
    await vi.advanceTimersByTimeAsync(0)
    expect(host.ready).toBe(true)
  })
})

describe('runtime host — failures that would otherwise be a permanent spinner', () => {
  it('rejects initialization when the worker reports it failed', async () => {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create })

    const started = host.initialize({ backend: 'nope', appCode: '', fsEntries: {}, packages: [] })
    const init = made[0].sent.find(m => m.type === 'INIT')!
    made[0].emit({ type: 'INIT_FAILED', id: init.id, error: 'unknown backend: nope' })

    // Without an answer the waiter never settles, the page's catch never runs,
    // and every later request blocks on readiness until the Service Worker's
    // relay deadline reports the wrong cause entirely.
    await expect(started).rejects.toThrow(/unknown backend/)
    expect(host.ready).toBe(false)
  })

  it('rejects initialization when the worker itself errors', async () => {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create })

    const started = host.initialize({ backend: 'php', appCode: '', fsEntries: {}, packages: [] })
    made[0].onerror?.({ message: 'worker script failed to load' })

    await expect(started).rejects.toThrow(/worker script failed to load/)
  })

  it('refuses a deadline that leaves no margin under the relay deadline', () => {
    const { create } = recordingFactory()

    // Guarding only the exported constant leaves the override that supersedes
    // it unguarded: a caller passing a value above the relay deadline inverts
    // the invariant while satisfying every check.
    expect(() => createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 20_000 }))
      .toThrow(/margin|relay/i)
    expect(() => createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 14_999 }))
      .toThrow(/margin|relay/i)
  })

  it('refuses a non-finite deadline', () => {
    const { create } = recordingFactory()

    // `Infinity > 0` is true, and `setTimeout(fn, Infinity)` clamps to zero —
    // "no timeout" would silently mean "508 on every request".
    expect(() => createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: Infinity })).toThrow()
    expect(() => createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: Number.NaN })).toThrow()
  })
})

describe('runtime host — round 2 fixes', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  async function ready(opts: Record<string, unknown> = {}) {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create, ...opts })
    const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    await vi.advanceTimersByTimeAsync(0)
    answerInit(made[0])
    await started
    return { host, w: made[0], made, create }
  }

  it('H2: bounds the wait for initialization', async () => {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 1000, initTimeoutMs: 2000 })
    // The assertion is attached before the clock moves. Attaching it after
    // means the rejection fires with no handler on it yet, and the runner
    // reports an unhandled rejection for a promise the test does go on to
    // consume.
    const started = expect(
      host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] }),
    ).rejects.toThrow(/initiali/i)

    // A stalled CDN connection never rejects, so INIT_FAILED never fires and
    // onerror never fires. Without a budget here this is the one unbounded wait
    // in the system, and the relay reports "the page is gone" instead.
    await vi.advanceTimersByTimeAsync(2000)
    await started
    expect(made[0].terminated).toBe(true)
    expect(host.ready).toBe(false)
  })

  it('H2: a request waiting on a stalled initialization is answered, not hung', async () => {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 1000, initTimeoutMs: 2000 })
    void host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] }).catch(() => {})
    const pending = expect(
      host.handleRequest(new Request('https://challenge-x.localhost/x')),
    ).rejects.toThrow()

    await vi.advanceTimersByTimeAsync(2000)
    await pending
    void made
  })

  it('M1: a worker that dies after READY stops being reported as ready', async () => {
    const { host, w } = await ready({ execTimeoutMs: 1000 })
    expect(host.ready).toBe(true)

    w.onerror?.({ message: 'worker died' })
    await vi.advanceTimersByTimeAsync(0)

    // Leaving readiness true keeps the page's panels enabled over a runtime that
    // no longer exists: the learner is offered Repeater, Code and Browser
    // against nothing.
    expect(host.ready).toBe(false)
  })
})

describe('runtime host — round 2 fixes, part two', () => {
  it('M2: a dispatch that fails mid-read does not ship the real status with a failure body', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({
      createWorker: create,
      onDispatch: async () => ({
        status: 200,
        headers: new Headers([['x-real', '1']]),
        text: async () => { throw new Error('stream aborted') },
      } as unknown as Response),
    })
    void host.runCode('requests.get("/")')
    const w = made[0]
    w.emit({ type: 'DISPATCH', id: 1, method: 'GET', url: 'https://challenge-x.localhost/', headers: [], body: '' })
    await new Promise(r => setTimeout(r, 0))

    // Assigning status, headers and body one at a time means a throw on the last
    // ships the real 200 carrying the failure JSON — success masking failure, in
    // a lab where the learner is meant to reason precisely about responses.
    const reply = w.sent.find(m => m.type === 'DISPATCH_RESULT')!
    expect(reply.status).toBe(502)
    expect(String(reply.body)).toContain('could not be reached')
    expect(reply.headers).not.toContainEqual(['x-real', '1'])
  })

  it('M5: a destroyed tools host does not resurrect a worker', async () => {
    const { create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create })
    host.warmUp()
    expect(create).toHaveBeenCalledTimes(1)

    host.destroy()
    // A stray call after teardown would spawn a thread that downloads Pyodide
    // for a page nobody is on — the leak the layout's unmount hook closes.
    await expect(host.runCode('print(1)')).rejects.toThrow(/destroyed/i)
    await expect(host.warmUp()).rejects.toThrow(/destroyed/i)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('L1: stop() works when taken off the host', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create })
    host.warmUp()
    const { stop } = host

    // Every other method is `this`-free, so a reader has no reason to expect
    // this one to be different.
    expect(() => stop()).not.toThrow()
    expect(made[0].terminated).toBe(true)
  })
})

describe('runtime host — a run that never answers', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('M6: gives up on a run whose worker stopped answering', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create, runCeilingMs: 5000 })
    const run = host.runCode('print(1)')
    void made

    // A tools worker that dies without firing onerror leaves the panel showing
    // "Running…" forever, and Run disabled with it. Recovery today depends on
    // Stop happening to be rendered under the same condition — recovery by UI
    // coincidence rather than by design.
    await vi.advanceTimersByTimeAsync(5000)

    const outcome = await run
    expect(outcome.stopped).toBe(false)
    expect(outcome.error).toMatch(/stopped responding/i)
  })

  it('M6: a run that finishes normally is not cut off by the ceiling', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create, runCeilingMs: 5000 })
    const run = host.runCode('print(1)')
    const id = made[0].sent.find(m => m.type === 'RUN_CODE')!.id
    made[0].emit({ type: 'DONE', id, error: null })

    expect(await run).toEqual({ error: null, stopped: false, timedOut: false })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(made[0].terminated).toBe(false)
  })
})

/**
 * S12: the guards below were written for the challenge host and never applied to
 * the tools host, which is the other construction site of the same shape. Six of
 * round 3's ten findings were that one omission, so they are fixed as one rule
 * rather than one at a time.
 */
describe('tools runtime host — the guards the challenge host already had', () => {
  it('tears down a worker that errors, instead of leaving it ready over a corpse', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create })
    const warm = host.warmUp()
    const w = made[0]
    w.emit({ type: 'READY', id: w.sent.find(m => m.type === 'WARM_UP')!.id })
    await warm
    expect(host.ready).toBe(true)

    w.onerror?.({ message: 'worker died' })

    // Leaving the worker unterminated leaks one thread per retry, which is what
    // the second assertion covers. The `ready` flag is asserted because the host
    // publishes it, NOT because the panel reads it — nothing does today, and the
    // first version of this comment claimed otherwise. Wiring it to the panel is
    // a separate finding; this test does not stand in for it.
    expect(host.ready).toBe(false)
    expect(w.terminated).toBe(true)
    void host.warmUp().catch(() => {})
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('fails the waiters when a message cannot be deserialized', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create })
    // Attached before the trigger: a rejection that fires with no handler yet is
    // reported as unhandled even though the test does consume it.
    const warm = expect(host.warmUp()).rejects.toThrow(/deserial/i)

    // A structured-clone failure on receive fires `messageerror`, not `message`
    // and not `error`: the message is dropped and its waiter waits forever.
    made[0].onmessageerror?.({})

    await warm
    expect(made[0].terminated).toBe(true)
    expect(host.ready).toBe(false)
  })

  it('refuses a run ceiling that is not a positive finite number', () => {
    const { create } = recordingFactory()
    // `setTimeout(fn, Infinity)` clamps to zero, so "no ceiling" would have
    // meant "every run reports that the runner stopped responding" — the exact
    // inversion of what the caller asked for.
    for (const runCeilingMs of [0, -1, Infinity, NaN]) {
      expect(() => createToolsRuntimeHost({ createWorker: create, runCeilingMs }))
        .toThrow(/positive finite/i)
    }
  })

  it('refuses a warm-up deadline that is not a positive finite number', () => {
    const { create } = recordingFactory()
    for (const initTimeoutMs of [0, -1, Infinity, NaN]) {
      expect(() => createToolsRuntimeHost({ createWorker: create, initTimeoutMs }))
        .toThrow(/positive finite/i)
    }
  })
})

describe('tools runtime host — the warm-up is bounded', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('gives up on a warm-up that never answers', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create, initTimeoutMs: 2000 })
    const warm = expect(host.warmUp()).rejects.toThrow(/did not finish within/i)

    // A stalled distribution download never rejects, so neither INIT_FAILED nor
    // onerror fires. Unbounded, the Code panel's overlay stays up forever with
    // no cause shown.
    await vi.advanceTimersByTimeAsync(2000)

    await warm
    expect(made[0].terminated).toBe(true)
    expect(host.ready).toBe(false)
  })

  it('does not cut off a warm-up that answers in time', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create, initTimeoutMs: 2000 })
    const warm = host.warmUp()
    await vi.advanceTimersByTimeAsync(1000)
    made[0].emit({ type: 'READY', id: made[0].sent.find(m => m.type === 'WARM_UP')!.id })

    await warm
    await vi.advanceTimersByTimeAsync(5000)
    expect(made[0].terminated).toBe(false)
    expect(host.ready).toBe(true)
  })
})

/**
 * Round 4. Two of these were introduced by round 3's own fix: the guards were
 * copied to the tools host without checking the preconditions they relied on at
 * the challenge host. The channel is the shared thing both defects run through.
 */
describe('runtime host — a worker that has already been replaced', () => {
  it('H1: a late error from the old worker does not kill its replacement', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create })
    host.warmUp()
    const w1 = made[0]
    void host.stop()
    const w2 = made[1]
    expect(w2, 'stop() should have built a replacement').toBeDefined()
    const warm2 = host.warmUp()

    // W1 is already terminated, but a message it posted before that is still in
    // the queue. Aborting every waiter on the shared channel takes W2's live
    // warm-up with it.
    w1.onerror?.({ message: 'late error from the terminated worker' })

    w2.emit({ type: 'READY', id: w2.sent.find(m => m.type === 'WARM_UP')!.id })
    await expect(warm2).resolves.toBeUndefined()
    expect(w2.terminated).toBe(false)
    expect(host.ready).toBe(true)
  })

  it('H1: a rejected warm-up does not poison every later warm-up', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create })
    const first = expect(host.warmUp()).rejects.toThrow(/failed to load/i)
    made[0].emit({ type: 'INIT_FAILED', id: made[0].sent.find(m => m.type === 'WARM_UP')!.id, error: 'failed to load' })
    await first

    // `warmUp()` short-circuits on a non-null `warming`. Leaving a settled
    // rejection there hands every later caller the same dead promise, and the
    // Code panel can never recover without a page reload.
    const second = host.warmUp()
    // The last WARM_UP, not the first: an INIT_FAILED does not retire the
    // worker, so the retry reuses it and the first id is already settled.
    const w = made[made.length - 1]
    const warmUps = w.sent.filter(m => m.type === 'WARM_UP')
    w.emit({ type: 'READY', id: warmUps[warmUps.length - 1].id })
    await expect(second).resolves.toBeUndefined()
  })
})

describe('runtime host — a dead tools worker reaches the page', () => {
  it('H2: reports readiness and a cause, instead of flipping a flag nobody reads', async () => {
    const seen: boolean[] = []
    let failure: Error | null = null
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({
      createWorker: create,
      onReadyChange: (v) => seen.push(v),
      onFailure: (err) => { failure = err },
    })
    const warm = host.warmUp()
    made[0].emit({ type: 'READY', id: made[0].sent.find(m => m.type === 'WARM_UP')!.id })
    await warm
    expect(seen).toEqual([true])

    made[0].onerror?.({ message: 'worker died' })

    // Setting an internal flag is not a consequence. The page gates the Code
    // panel on the runner it holds, so the host has to push the change out —
    // the challenge host has done this from the start via onReadyChange.
    expect(seen).toEqual([true, false])
    expect(failure).not.toBeNull()
    expect(failure!.message).toMatch(/worker died/)
  })
})

describe('runtime host — a run that never answers, part two', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('M1: marks a wedged run as such and takes the worker down with it', async () => {
    const { made, create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create, runCeilingMs: 5000 })
    const run = host.runCode('print(1)')
    await vi.advanceTimersByTimeAsync(5000)

    const outcome = await run
    // Without a field of its own this is indistinguishable from a learner's
    // NameError, and the caller would have to string-match the message to tell
    // "your code threw" from "the runtime is wedged".
    expect(outcome.timedOut).toBe(true)
    expect(outcome.stopped).toBe(false)
    // The challenge host's deadline destroys and rebuilds. Leaving this one
    // alive keeps a wedged WebAssembly loop burning CPU behind an idle panel.
    expect(made[0].terminated).toBe(true)
  })
})

describe('runtime host — deadlines that overflow the timer', () => {
  it('L1: refuses a delay at or above the 32-bit timer limit', () => {
    const { create } = recordingFactory()
    const over = 2 ** 31
    // `setTimeout` overflows this and fires immediately, which inverts every one
    // of these guards. The comment on the challenge host has said so since
    // round 2; nothing checked it.
    expect(() => createChallengeRuntimeHost({ createWorker: create, initTimeoutMs: over }))
      .toThrow(/finite/i)
    expect(() => createToolsRuntimeHost({ createWorker: create, initTimeoutMs: over }))
      .toThrow(/finite/i)
    expect(() => createToolsRuntimeHost({ createWorker: create, runCeilingMs: over }))
      .toThrow(/finite/i)
  })

  it('L2: a destroyed host rejects from warmUp rather than throwing past the handler', async () => {
    const { create } = recordingFactory()
    const host = createToolsRuntimeHost({ createWorker: create })
    host.destroy()

    // The interface declares `warmUp(): Promise<void>`, so a caller writing
    // `host.warmUp().catch(...)` is entitled to have the handler run.
    await expect(host.warmUp()).rejects.toThrow(/destroyed/i)
  })
})

/**
 * Round 5. Both of these live in the window opened by `await requestToWire`:
 * the request has a waiter registered against one worker and is transmitted
 * against whatever `worker` happens to be afterwards.
 */
describe('runtime host — the window while a request is being serialized', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  /** A Request whose body read the test controls. */
  function slowRequest(url: string) {
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    const req = {
      method: 'GET', url,
      headers: new Headers(),
      clone: () => ({ arrayBuffer: async () => { await gate; return new ArrayBuffer(0) } }),
    } as unknown as Request
    return { req, release }
  }

  async function ready() {
    const { made, create } = recordingFactory()
    const onReset = vi.fn()
    const host = createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 1000, onReset })
    const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    await vi.advanceTimersByTimeAsync(0)
    answerInit(made[0])
    await started
    return { host, made, create, onReset }
  }

  it('H-1: does not answer 508 for a request it then goes on to transmit', async () => {
    const { host, made } = await ready()
    const first = host.handleRequest(new Request('https://challenge-x.localhost/first'))
    const { req, release } = slowRequest('https://challenge-x.localhost/second')
    const second = host.handleRequest(req)

    // The first request's deadline destroys the worker while the second is
    // still being serialized. `resolveAll` answers by kind, so the second
    // request's waiter is resolved with a 508 and cleared — and the code then
    // posts it to the replacement anyway. The side effect happens; the learner
    // is told it timed out.
    await vi.advanceTimersByTimeAsync(1000)
    expect((await first).status).toBe(508)

    release()
    await vi.advanceTimersByTimeAsync(0)
    const rebuilt = made[1]
    answerInit(rebuilt)
    await vi.advanceTimersByTimeAsync(0)

    const sentIds = rebuilt.sent.filter(m => m.type === 'REQUEST').map(m => m.id)
    for (const id of sentIds) rebuilt.emit({ type: 'RESPONSE', id, status: 200, headers: [], body: '' })
    expect((await second).status).not.toBe(508)
  })

  it('H-1: a teardown during serialization does not reset an unmounted page', async () => {
    const { host, onReset } = await ready()
    const { req, release } = slowRequest('https://challenge-x.localhost/x')
    const pending = expect(host.handleRequest(req)).rejects.toThrow(/destroy/i)
    // Let it past `await readiness` first. Without this the request is caught by
    // the early `if (!worker)` return and never reaches the serialization
    // window at all — the first version of this test passed for that reason,
    // against code that had the defect.
    await vi.advanceTimersByTimeAsync(0)

    host.destroy()
    release()
    await vi.advanceTimersByTimeAsync(0)
    await pending

    // `owner` read after the await is null once destroy() has run, and the
    // identity guard then reads `null === null` as true — a deadline that
    // rebuilds a runtime and announces a reset for a page nobody is on.
    await vi.advanceTimersByTimeAsync(5000)
    expect(onReset).not.toHaveBeenCalled()
  })

  it('M-4: a destroyed challenge host refuses to start again', async () => {
    const { host } = await ready()
    host.destroy()

    // The tools host has had this latch since round 2. Without it here, a
    // stray call after unmount spawns a WebAssembly runtime for a page nobody
    // is on — the same leak, in the factory that was never asked about.
    await expect(
      host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] }),
    ).rejects.toThrow(/destroyed/i)
    await expect(host.handleRequest(new Request('https://challenge-x.localhost/x')))
      .rejects.toThrow(/destroyed/i)
  })
})

describe('runtime host — a rebuild that lands while a request is being serialized', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('R6: waits for the replacement to come up before spending the request deadline on it', async () => {
    const { made, create } = recordingFactory()
    const onReset = vi.fn()
    const host = createChallengeRuntimeHost({
      createWorker: create, execTimeoutMs: 1000, initTimeoutMs: 60_000, onReset,
    })
    const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    await vi.advanceTimersByTimeAsync(0)
    answerInit(made[0])
    await started

    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    const slow = {
      method: 'GET', url: 'https://challenge-x.localhost/slow', headers: new Headers(),
      clone: () => ({ arrayBuffer: async () => { await gate; return new ArrayBuffer(0) } }),
    } as unknown as Request

    const runaway = host.handleRequest(new Request('https://challenge-x.localhost/runaway'))
    const pending = host.handleRequest(slow)

    // The runaway's deadline destroys W1 and starts W2, whose readiness is
    // pending. `readiness` was read once, before this request began serializing.
    await vi.advanceTimersByTimeAsync(1000)
    expect((await runaway).status).toBe(508)
    expect(onReset).toHaveBeenCalledTimes(1)

    release()
    await vi.advanceTimersByTimeAsync(0)

    // A cold WebAssembly start takes seconds. Arming the per-request deadline
    // against it is the livelock this module's own comment says is prevented:
    // the deadline of the request waiting for the rebuild destroys the rebuild,
    // and the next one, and the next.
    await vi.advanceTimersByTimeAsync(1000)
    expect(onReset, 'the rebuild was destroyed by the deadline of the request waiting for it')
      .toHaveBeenCalledTimes(1)

    answerInit(made[1])
    await vi.advanceTimersByTimeAsync(0)
    const req = made[1].sent.find(m => m.type === 'REQUEST')
    expect(req, 'the held request was never handed to the replacement').toBeDefined()
    made[1].emit({ type: 'RESPONSE', id: req!.id, status: 200, headers: [], body: '' })
    expect((await pending).status).toBe(200)
  })
})

describe('runtime host — the gate and the worker must be the same generation', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  function gated() {
    let release!: () => void
    const g = new Promise<void>(r => { release = r })
    const req = {
      method: 'GET', url: 'https://challenge-x.localhost/slow', headers: new Headers(),
      clone: () => ({ arrayBuffer: async () => { await g; return new ArrayBuffer(0) } }),
    } as unknown as Request
    return { req, release }
  }

  async function started(opts: Record<string, unknown> = {}) {
    const { made, create } = recordingFactory()
    const host = createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 1000, ...opts })
    const p = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    await vi.advanceTimersByTimeAsync(0)
    answerInit(made[0])
    await p
    return { host, made }
  }

  it('re-gates when a second rebuild lands while it is waiting on the first', async () => {
    const { host, made } = await started()
    const { req, release } = gated()
    void host.handleRequest(new Request('https://challenge-x.localhost/runaway')).catch(() => {})
    const held = host.handleRequest(req)
    // Attached before anything can reject it. Attaching after the trigger below
    // leaves the rejection with no handler at the moment it fires, and the
    // runner reports an unhandled rejection for a promise this test does go on
    // to consume — the suite still says "passed", so it is only visible in CI,
    // which treats the unhandled rejection as the failure it is.
    const heldRejects = expect(held).rejects.toThrow()

    await vi.advanceTimersByTimeAsync(1000)   // W1 dies, W2 comes up pending
    release()
    await vi.advanceTimersByTimeAsync(0)      // the held request is now awaiting W2's gate

    // A second runaway on W2 kills it before it ever answered INIT. Binding the
    // worker that was current when the gate was taken would post this request to
    // a terminated W2 and wait forever; the gate has to be taken again against
    // W3.
    made[1].onerror?.({ message: 'W2 died before it was ready' })
    await vi.advanceTimersByTimeAsync(0)

    await heldRejects
    expect(made[1].sent.some(m => m.type === 'REQUEST'), 'posted to a worker that had died')
      .toBe(false)
  })

  it('refuses when the worker died during serialization, rather than posting to null', async () => {
    const { host, made } = await started()
    const { req, release } = gated()
    const held = expect(host.handleRequest(req)).rejects.toThrow(/destroyed/i)
    await vi.advanceTimersByTimeAsync(0)

    // An `onerror` teardown nulls the worker without setting the destroyed
    // latch. Without its own null check the loop then compares null to null,
    // reads that as "same generation", and calls postMessage on null — a
    // TypeError instead of the cause a reader can act on.
    made[0].onerror?.({ message: 'worker died' })
    release()
    await vi.advanceTimersByTimeAsync(0)
    await held
  })
})

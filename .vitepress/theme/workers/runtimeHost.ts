/**
 * Main-thread owners of the two runtime Workers.
 *
 * A synchronous WebAssembly loop occupies the JavaScript event loop of whatever
 * thread it runs on, so a `setTimeout` registered on that thread does not fire
 * while the loop is running. That is measured, not assumed: `set_time_limit(2)`
 * does not stop a php-wasm loop, and the `setTimeout` in the same script never
 * fires. The worker boundary is therefore not a tidiness measure — it is the
 * only place from which a deadline can be enforced at all.
 *
 * The Worker is injected rather than constructed here. Tests run under
 * happy-dom, which has no Worker; injection is what lets the protocol be driven
 * from both ends without a real thread.
 */

import { transportCookie } from '../composables/usePythonRuntime'

/** The part of `Worker` this module uses. Narrower than lib.dom's `Worker` so a
 *  stub can satisfy it without implementing event targets. */
export interface WorkerLike {
  postMessage(msg: unknown): void
  terminate(): void
  onmessage: ((e: { data: unknown }) => void) | null
  /**
   * A worker whose script fails to load, or which throws outside a message
   * handler, reports here and nowhere else. Leaving it off this interface made
   * that failure path structurally untypeable, and the observable result was a
   * page that spun forever with no cause: every later request then blocked on
   * readiness until the relay deadline reported "the page is gone" instead.
   */
  onerror?: ((e: { message?: string }) => void) | null
  /**
   * A structured-clone failure on receive fires `messageerror`, not `message`
   * and not `error`: the message is simply dropped, and whatever was waiting on
   * it waits forever. Same argument as `onerror` above.
   */
  onmessageerror?: ((e: unknown) => void) | null
}

export type WorkerFactory = () => WorkerLike

export interface InitPayload {
  backend: string
  appCode: string
  fsEntries: Record<string, Uint8Array>
  packages: string[]
}

/**
 * How long a single challenge request may execute before its worker is
 * destroyed.
 *
 * It MUST stay strictly below the Service Worker's relay deadline, with margin
 * for the answer to travel back through the main thread and the relay port. The
 * ordering is not a performance preference: if the relay gives up first, a
 * learner whose own payload caused a runaway sees a registration eviction and a
 * channel rebuild instead of a terminated request. A cross-file check asserts
 * the ordering, because the two constants live in files that are edited
 * independently.
 */
export const EXEC_TIMEOUT_MS = 10_000

/**
 * Mirrors `RELAY_TIMEOUT_MS` in the shipped Service Worker. Duplicated rather
 * than imported because that file is a classic script with no exports; a
 * cross-file guard asserts the two stay equal, so the copy cannot drift.
 */
export const RELAY_TIMEOUT_MIRROR_MS = 15_000

/**
 * Reserved out of the relay's budget for a terminated worker's answer to travel
 * back through the main thread and the relay port. Guarding only the exported
 * deadline left the per-instance override that supersedes it unguarded, so a
 * caller could invert the invariant while satisfying every check.
 */
export const MIN_RELAY_MARGIN_MS = 5_000

/**
 * How long a runtime may take to come up before it is treated as dead.
 *
 * Without it, initialization is the one unbounded wait in the system, and it is
 * unbounded precisely where nothing else can help: a stalled — not failed —
 * distribution download never rejects, so neither `INIT_FAILED` nor `onerror`
 * fires, and the request waiting on readiness has no timer of its own because
 * arming one there would let a cold start consume a per-request budget.
 */
export const INIT_TIMEOUT_MS = 60_000

/** The answer to a request whose deadline expired. Assembled in exactly one
 *  place so the Code panel path and the Service Worker path are byte-identical. */
export function timedOutResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'challenge runtime execution exceeded the time limit' }),
    { status: 508, headers: { 'content-type': 'application/json' } },
  )
}

interface HostOptions {
  createWorker: WorkerFactory
}

interface ChallengeHostOptions extends HostOptions {
  /** Defaults to `EXEC_TIMEOUT_MS`. */
  execTimeoutMs?: number
  /** Defaults to `INIT_TIMEOUT_MS`. */
  initTimeoutMs?: number
  /**
   * Called once each time a deadline expiry destroys the runtime. The challenge
   * state — native session, files the learner's requests wrote — is gone by
   * then, and a learner logged out mid-challenge reads the reset as the
   * challenge being broken unless something says otherwise.
   */
  onReset?: () => void
  /** Called whenever readiness flips. The page gates its panels on this, and a
   *  rebuild has to move it in both directions or the panels stay enabled while
   *  no runtime exists. */
  onReadyChange?: (ready: boolean) => void
}

/**
 * A ceiling on how long a run may go unanswered.
 *
 * This is NOT a limit on learner code — enumeration and brute forcing are
 * intended solution paths here, and the worker keeps running until Stop. It
 * bounds only the case where the worker stops answering at all, which otherwise
 * leaves the panel showing "Running…" and Run disabled with it, recoverable
 * only because Stop happens to be rendered under the same condition.
 */
export const RUN_CEILING_MS = 6 * 60 * 60 * 1000

/**
 * One past the largest delay `setTimeout` can hold.
 *
 * A delay at or above this overflows the 32-bit field and fires on the next
 * tick, which inverts every guard built on it: "wait an hour" becomes "give up
 * immediately". The challenge host's comment has named this since round 2 while
 * nothing checked it — `Number.isFinite` does not, because the value is finite.
 */
export const MAX_TIMER_DELAY_MS = 2 ** 31

/** Every deadline option goes through here, so a new one cannot be added with
 *  only half the range checked. */
function assertDelay(label: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0 || value >= MAX_TIMER_DELAY_MS) {
    throw new Error(
      `${label} must be a positive finite number below ${MAX_TIMER_DELAY_MS}, got ${value}`,
    )
  }
}

interface ToolsHostOptions extends HostOptions {
  /** Defaults to `RUN_CEILING_MS`. */
  runCeilingMs?: number
  /** Defaults to `INIT_TIMEOUT_MS`. */
  initTimeoutMs?: number
  /**
   * Called whenever readiness flips, mirroring the challenge host.
   *
   * Pushed rather than polled, because a pulled flag is a flag nobody reads:
   * this host published `ready` as a getter for three rounds and the page gated
   * the Code panel on something else entirely, so every `ready = false` written
   * by a teardown was inert.
   */
  onReadyChange?: (ready: boolean) => void
  /**
   * Called when the worker dies of its own accord — not on `stop()`, which is
   * the learner's own doing and rebuilds immediately. Carries the cause, because
   * clearing the panel's runner without one leaves it loading forever with
   * nothing to show: the permanent spinner this module exists to prevent.
   */
  onFailure?: (reason: Error) => void
  /**
   * Serves an HTTP request that learner code made. The main thread supplies it,
   * which is what keeps the main thread on the dispatch path: the tools worker
   * holds no channel to the challenge worker, so this function is the only way
   * a learner request can reach a runtime — and the traffic log is recorded by
   * whatever the caller wraps around it.
   */
  onDispatch?: (request: Request) => Promise<Response>
}

/** worker → main messages, as declared in the change's design. */
interface WorkerMessage {
  type: string
  id: number
  status?: number
  headers?: [string, string][]
  body?: ArrayBuffer | string | null
  setCookies?: string[]
  chunk?: string
  error?: string | null
}

/** The tools worker asking the main thread to serve a learner HTTP request. */
interface DispatchMessage extends WorkerMessage {
  method: string
  url: string
}

/**
 * What a waiter is waiting for. Carried on the waiter rather than inferred from
 * context, so a bulk settle cannot hand the wrong shape to the wrong waiter —
 * `resolveOwned` answers requests with a 508, and an initialization waiter caught
 * in that sweep would receive a `Response` where a `void` was promised. Today
 * that is unreachable only because of the order two statements happen to be
 * written in, and nothing enforces that order.
 */
type WaiterKind = 'init' | 'request' | 'run'

interface Pending {
  kind: WaiterKind
  /**
   * The worker this waiter is waiting on.
   *
   * Carried because one channel outlives several workers: a rebuild, a Stop and
   * a teardown each install a replacement while the previous worker may still
   * have a message in flight. Without it, the only bulk operation available is
   * "fail everyone", and a dead worker's last gasp takes its successor's live
   * waiters with it.
   *
   * Non-nullable on purpose. Typed as `unknown` it could hold null, and a guard
   * written as `worker === owner` then reads true when both are null — "nobody
   * matches nobody" satisfying an identity check, which is how a deadline fired
   * a rebuild and a reset notice for a page nobody was on.
   */
  owner: WorkerLike
  resolve: (value: never) => void
  reject: (reason: unknown) => void
}

/**
 * Correlation is by host-assigned id, never by arrival order. Two challenge
 * requests can be in flight at once — the Code panel's learner code and a
 * Service Worker relay for a subresource — and answering them FIFO would hand
 * one the other's body.
 */
function makeChannel() {
  let nextId = 1
  const pending = new Map<number, Pending>()
  return {
    take(): number { return nextId++ },
    /** Register a waiter of a stated kind and hand back the promise it settles. */
    wait<T>(id: number, kind: WaiterKind, owner: WorkerLike): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        pending.set(id, { kind, owner, resolve: resolve as (v: never) => void, reject })
      })
    },
    settle(id: number, fn: (p: Pending) => void): boolean {
      const p = pending.get(id)
      // An id with no waiter is ignored rather than thrown on: a message that
      // arrives after its worker was destroyed is expected, not exceptional.
      if (!p) return false
      pending.delete(id)
      try {
        fn(p)
      } catch (err) {
        // The waiter is already out of the map and its deadline already
        // disarmed, so a throw here would leave a request nothing can ever
        // answer — the relay would then report "the page is gone", which is the
        // one wrong cause this whole module exists to avoid.
        p.reject(err)
      }
      return true
    },
    /** Fail every outstanding waiter. Used when the whole host is going away. */
    abortAll(reason: unknown) {
      for (const [, p] of pending) p.reject(reason)
      pending.clear()
    },
    /**
     * Fail only the waiters of one worker. This is the right sweep whenever the
     * cause is one worker's death rather than the host's: the alternative,
     * `abortAll`, rejects the replacement's waiters too, and the caller then
     * holds a settled rejection where a live promise should be.
     */
    abortOwned(owner: WorkerLike, reason: unknown) {
      for (const [id, p] of [...pending]) {
        if (p.owner !== owner) continue
        pending.delete(id)
        p.reject(reason)
      }
    },
    /**
     * Answer one worker's waiters of one kind instead of failing them, and fail
     * that worker's other waiters. Mixed sweeps are how a `Response` reaches a
     * waiter that promised `void`.
     *
     * Scoped by owner as well as by kind. Kind alone swept every request in the
     * map, including one registered against this worker but still being
     * serialized: it was answered 508 and removed, and then transmitted to the
     * replacement anyway — the side effect happened while the caller was told
     * it had timed out.
     */
    resolveOwned(owner: WorkerLike, kind: WaiterKind, make: () => unknown, otherwise: () => unknown) {
      for (const [id, p] of [...pending]) {
        if (p.owner !== owner) continue
        pending.delete(id)
        if (p.kind === kind) p.resolve(make() as never)
        else p.reject(otherwise())
      }
    },
  }
}

/**
 * Statuses that a `Response` may not carry a body for. The worker always sends
 * an `ArrayBuffer`, so an empty body arrives as `ArrayBuffer(0)` — which is not
 * nullish, so `?? null` does not convert it, and the constructor throws. The PHP
 * runtime supports these deliberately; the wire hop must not undo that.
 */
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304])

function responseFrom(msg: WorkerMessage): Response {
  const headers = new Headers(msg.headers ?? [])
  // Appended one at a time rather than joined: cookie attributes contain commas
  // of their own, so a joined form cannot be split back apart.
  for (const cookie of msg.setCookies ?? []) headers.append('Set-Cookie', cookie)
  const status = msg.status ?? 200
  const body = NULL_BODY_STATUSES.has(status) ? null : (msg.body ?? null)
  return new Response(body, { status, headers })
}

async function requestToWire(request: Request) {
  return {
    method: request.method,
    url: request.url,
    headers: [...request.headers] as [string, string][],
    body: await request.clone().arrayBuffer(),
  }
}

export interface ChallengeRuntimeHost {
  readonly ready: boolean
  initialize(payload: InitPayload): Promise<void>
  handleRequest(request: Request): Promise<Response>
  destroy(): void
}

export function createChallengeRuntimeHost(opts: ChallengeHostOptions): ChallengeRuntimeHost {
  const execTimeoutMs = opts.execTimeoutMs ?? EXEC_TIMEOUT_MS
  const initTimeoutMs = opts.initTimeoutMs ?? INIT_TIMEOUT_MS
  // Finite, not merely positive, and below the timer's own ceiling.
  // `Infinity > 0` is true and `setTimeout(fn, Infinity)` clamps to zero, so
  // "no timeout" would have meant "508 on every request"; a value at or above
  // 2^31 overflows the timer delay and fires immediately, with the same
  // inversion. Both halves are checked in one place now — the second was stated
  // in this comment for two rounds without being implemented.
  assertDelay('runtime host: initialization deadline', initTimeoutMs)
  assertDelay('runtime host: execution deadline', execTimeoutMs)
  if (execTimeoutMs + MIN_RELAY_MARGIN_MS > RELAY_TIMEOUT_MIRROR_MS) {
    throw new Error(
      `runtime host: execution deadline ${execTimeoutMs}ms leaves less than ` +
      `${MIN_RELAY_MARGIN_MS}ms of margin under the relay deadline ${RELAY_TIMEOUT_MIRROR_MS}ms`,
    )
  }

  let worker: WorkerLike | null = null
  let readyState = false
  const setReady = (next: boolean) => {
    if (readyState === next) return
    readyState = next
    opts.onReadyChange?.(next)
  }
  /**
   * Set by `destroy()` and never cleared, mirroring the tools host. Without it a
   * stray call after unmount starts a WebAssembly runtime for a page nobody is
   * on — the same leak the page's unmount hook closes, in the factory nobody
   * asked about.
   */
  let destroyed = false
  /** Kept so a rebuild can re-run the same initialization. */
  let lastInit: InitPayload | null = null
  /**
   * Settles when the current worker has answered INIT. A request waits on this
   * before its deadline is armed, which is what keeps a cold start out of a
   * per-request budget: arming first would let the rebuild consume the deadline
   * of the very request waiting for it, destroy the replacement, and rebuild
   * again — a livelock reachable only after a first expiry.
   */
  let readiness: Promise<void> | null = null

  /**
   * Wraps an initialization waiter in its own budget. Separate from the
   * per-request deadline and much larger: a cold WebAssembly start is expected
   * to take seconds, a request is not.
   */
  function bounded(settled: Promise<void>, owner: WorkerLike | null): Promise<void> {
    // One promise, settled by whichever comes first. An earlier version raced a
    // second promise against this one, and the loser's rejection had no consumer
    // — an unhandled rejection fired from a timer, which is exactly the shape
    // that is hardest to trace back to its source.
    const bounded = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const err = new Error(`runtime host: initialization did not finish within ${initTimeoutMs}ms`)
        // Torn down with the expiry as the reason, so whatever was waiting on
        // the raw channel entry fails with the cause a reader can act on rather
        // than the generic teardown message.
        if (worker === owner) destroyWorker('explicit', err)
        reject(err)
      }, initTimeoutMs)
      settled.then(
        (value) => { clearTimeout(timer); resolve(value) },
        (err) => { clearTimeout(timer); reject(err) },
      )
    })
    // The host keeps this as `readiness` for its own use and a caller may never
    // await it. The sink does not consume the rejection for anyone who does.
    void bounded.catch(() => {})
    return bounded
  }

  const channel = makeChannel()
  const armed = new Map<number, ReturnType<typeof setTimeout>>()

  function disarm(id: number) {
    const timer = armed.get(id)
    if (timer !== undefined) { clearTimeout(timer); armed.delete(id) }
  }

  function attach(): WorkerLike {
    const w = opts.createWorker()
    w.onmessage = (e) => {
      const msg = e.data as WorkerMessage
      if (msg.type === 'READY') {
        setReady(true)
        channel.settle(msg.id, p => p.resolve(undefined as never))
      } else if (msg.type === 'INIT_FAILED') {
        channel.settle(msg.id, p => p.reject(new Error(msg.error ?? 'challenge worker: initialization failed')))
      } else if (msg.type === 'RESPONSE') {
        disarm(msg.id)
        channel.settle(msg.id, p => p.resolve(responseFrom(msg) as never))
      }
    }
    // A worker whose script never loads sends nothing at all, so this is the
    // only signal that would otherwise leave every waiter pending forever.
    //
    // It tears the worker down rather than only failing the waiters. A worker
    // that dies *after* READY would otherwise leave readiness true, and the page
    // keeps Repeater, Code and Browser enabled against a runtime that no longer
    // exists.
    const fail = (message: string) => {
      const reason = new Error(message)
      if (worker === w) destroyWorker('explicit', reason)
      // Only this worker's waiters. `abortAll` here would reject the
      // replacement's live waiters as collateral for a worker that is already
      // gone.
      else channel.abortOwned(w, reason)
    }
    w.onerror = (e) => fail(e?.message ?? 'challenge runtime host: worker error')
    w.onmessageerror = () => fail('challenge runtime host: a message could not be deserialized')
    return w
  }

  /**
   * `cause: 'deadline'` also answers whatever else was in flight, with the same
   * 508. Those requests did not each exceed their own deadline, but they were
   * ended by the same event, and leaving them unsettled is worse than answering
   * them slightly generously: the Service Worker relay holds a fetch open until
   * its own deadline, which then reports "the page is gone" — a cause that is
   * both wrong and points the learner at the wrong fix.
   */
  function destroyWorker(cause: 'deadline' | 'explicit', reason?: Error) {
    const dying = worker
    worker?.terminate()
    worker = null
    setReady(false)
    for (const [, timer] of armed) clearTimeout(timer)
    armed.clear()
    if (cause === 'deadline' && dying) {
      channel.resolveOwned(dying, 'request', timedOutResponse,
        () => new Error('challenge runtime host: worker was destroyed mid-initialization'))
    }
    else channel.abortAll(reason ?? new Error('challenge runtime host: worker was destroyed'))
  }

  /** Eager, not lazy. A lazy rebuild would run the cold start inside the Service
   *  Worker's relay window and surface the relay's timeout instead of this one. */
  function rebuild() {
    if (!lastInit) return
    const payload = lastInit
    worker = attach()
    const id = channel.take()
    const settled = bounded(channel.wait<void>(id, 'init', worker), worker)
    readiness = settled
    worker.postMessage({ type: 'INIT', id, ...payload })
    void settled.catch(() => {
      // A rebuild interrupted by another teardown is not an error worth
      // throwing from a timer callback with nobody to catch it.
    })
  }

  return {
    get ready() { return readyState },

    async initialize(payload: InitPayload): Promise<void> {
      if (destroyed) throw new Error('challenge runtime host: this host was destroyed')
      lastInit = payload
      worker ??= attach()
      const id = channel.take()
      const settled = bounded(channel.wait<void>(id, 'init', worker), worker)
      readiness = settled
      // Swallowed here so a rejected readiness does not surface as an unhandled
      // rejection from whichever request happens not to be awaiting it.
      void settled.catch(() => {})
      worker.postMessage({ type: 'INIT', id, ...payload })
      await settled
    },

    async handleRequest(request: Request): Promise<Response> {
      if (destroyed) throw new Error('challenge runtime host: this host was destroyed')
      if (!worker) throw new Error('challenge runtime host: initialize() has not been called')
      // Serialized first, and nothing registered or armed until it is done.
      // Arming before this await left a live timer behind whenever
      // serialization rejected; REGISTERING before it was worse — the waiter was
      // visible to a rebuild's bulk sweep while its request had not been sent,
      // so it was answered 508 and then transmitted anyway.
      const wire = await requestToWire(request)
      // Gate and bind together, and re-check that they still describe the same
      // generation. Reading readiness once before serializing was a snapshot: a
      // rebuild landing during the await left this request awaiting a promise
      // belonging to a worker that no longer exists, and then arming a
      // per-request deadline against a replacement with a multi-second cold
      // start ahead of it — the deadline of the request waiting for the rebuild
      // destroys the rebuild, and the next one. That livelock is what the
      // holding behaviour below exists to prevent, and a stale operand had
      // quietly turned the guard off.
      //
      // Held, not refused. The caller cannot tell "not ready yet" from "broken",
      // so refusing would turn a rebuild into a visible failure.
      let owner: WorkerLike
      for (;;) {
        if (destroyed) throw new Error('challenge runtime host: this host was destroyed')
        const current = worker
        if (!current) throw new Error('challenge runtime host: worker was destroyed')
        const gate = readiness
        if (gate) await gate
        // The load-bearing line: it is the only thing that makes "the readiness
        // I awaited" and "the worker I am about to post to" the same object. A
        // rejected gate throws out of here, so this cannot spin.
        if (worker === current && readiness === gate) { owner = current; break }
      }
      const id = channel.take()
      const settled = channel.wait<Response>(id, 'request', owner)
      // Armed here, on the main thread, and never inside the worker. The
      // execution being bounded is a synchronous WebAssembly loop occupying that
      // worker's own event loop, so a timer registered there does not fire and
      // `self.close()` is never reached. This thread is the only one still
      // running while that loop holds.
      armed.set(id, setTimeout(() => {
        armed.delete(id)
        // Settled before the teardown, so this request gets its own 508 rather
        // than being swept up by the collateral path below.
        channel.settle(id, p => p.resolve(timedOutResponse() as never))
        if (worker === owner) {
          destroyWorker('deadline')
          opts.onReset?.()
          rebuild()
        }
      }, execTimeoutMs))
      owner.postMessage({ type: 'REQUEST', id, ...wire })
      return settled
    },

    destroy() {
      destroyed = true
      // Leaving the page is not a runaway: forget the payload so nothing
      // rebuilds a WebAssembly runtime for a page nobody is on.
      lastInit = null
      destroyWorker('explicit')
    },
  }
}

export interface ToolsRuntimeHost {
  readonly ready: boolean
  /**
   * Create the worker and load its Pyodide now rather than on the first run.
   * The Code panel calls this when the learner opens the tab, so the download
   * overlaps with them reading the challenge instead of with them pressing Run.
   *
   * Resolves when the runner is usable and rejects when it is not. Returning
   * void left a failed load with no path back: the overlay cleared and Run
   * became available while nothing had loaded.
   */
  warmUp(): Promise<void>
  runCode(code: string, onStdout?: (chunk: string) => void): Promise<RunOutcome>
  /**
   * End the run in flight. Terminating the worker is the only way: learner code
   * may be a synchronous loop holding that worker's event loop, so nothing
   * inside it would ever observe a cancellation flag.
   *
   * Resolves when the replacement is ready to run again. The caller needs that,
   * because the replacement has a WebAssembly distribution to load first and
   * offering Run in the meantime makes the wait silent.
   */
  stop(): Promise<void>
  destroy(): void
}

export interface RunOutcome {
  /** The message of an exception the learner's code raised, or null. */
  error: string | null
  /** True when the run ended because the learner stopped it. Kept apart from
   *  `error` so a deliberate stop is not filed next to a NameError. */
  stopped: boolean
  /**
   * True when the run ceiling expired — the worker stopped answering at all.
   *
   * A field rather than a sentinel message: with only `error` set, this is
   * indistinguishable from the learner's own NameError, and a caller wanting to
   * tell them apart would have to match on the wording of a string this module
   * is free to reword.
   */
  timedOut: boolean
}

export function createToolsRuntimeHost(opts: ToolsHostOptions): ToolsRuntimeHost {
  let worker: WorkerLike | null = null
  let readyState = false
  const setReady = (next: boolean) => {
    if (readyState === next) return
    readyState = next
    opts.onReadyChange?.(next)
  }
  const channel = makeChannel()
  const listeners = new Map<number, (chunk: string) => void>()
  /** The in-flight warm-up, so a second Code tab activation joins the first. */
  let warming: Promise<void> | null = null
  /**
   * Set by `destroy()` and never cleared. Without it `runCode` would find a null
   * worker and build a fresh one — spawning a thread that downloads Pyodide for
   * a page nobody is on, which is the leak the page's unmount hook closes.
   */
  let destroyed = false
  const runCeilingMs = opts.runCeilingMs ?? RUN_CEILING_MS
  const initTimeoutMs = opts.initTimeoutMs ?? INIT_TIMEOUT_MS
  // Checked at construction rather than at the moment the timer is armed, and
  // through the same helper the challenge host uses — see `assertDelay`.
  assertDelay('tools runtime host: run ceiling', runCeilingMs)
  assertDelay('tools runtime host: initialization deadline', initTimeoutMs)

  /**
   * Answering is mandatory, not best effort. Learner code sits inside
   * `run_sync`, which suspends the WebAssembly stack until the promise settles;
   * a dropped reply leaves it suspended forever, and no timer on the worker
   * thread can rescue it because the loop is free — it is the stack that is
   * parked. Every failure path below therefore still posts a result.
   */
  async function serveDispatch(w: WorkerLike, msg: DispatchMessage) {
    const failure = {
      status: 502,
      headers: [['content-type', 'application/json']] as [string, string][],
      body: JSON.stringify({ error: 'the challenge runtime could not be reached' }),
    }
    let result = failure
    try {
      if (opts.onDispatch) {
        // Cookie is a forbidden request header: `new Request()` drops it
        // silently. The platform's existing carrier is X-Wxlsh-Cookie, and the
        // runtime converts it back at its own boundary. Skipping this does not
        // crash — it produces a learner who can never stay logged in, which is
        // exactly how the same defect went unnoticed once before.
        const headerMap: Record<string, string> = Object.create(null)
        for (const [k, v] of msg.headers ?? []) headerMap[k] = v
        transportCookie(headerMap)
        const request = new Request(msg.url, {
          method: msg.method,
          headers: headerMap,
          body: msg.method === 'GET' || msg.method === 'HEAD' ? undefined : (msg.body || undefined),
        })
        const res = await opts.onDispatch(request)
        // Built whole, then assigned. Filling the fields one at a time meant a
        // throw on the last shipped the real status and headers carrying the
        // failure body — success masking failure, in a lab where the learner is
        // meant to reason precisely about responses.
        const text = await res.text()
        result = { status: res.status, headers: [...res.headers] as [string, string][], body: text }
      }
    } catch {
      result = failure
    }
    w.postMessage({ type: 'DISPATCH_RESULT', id: msg.id, ...result })
  }

  /**
   * Hoisted out of the returned object so `stop()` can call it directly. Every
   * other method here is `this`-free, and a caller who writes
   * `const { stop } = host` has no reason to expect this one to differ.
   */
  function warmUp(): Promise<void> {
    // Rejected, not thrown. The interface promises a Promise, so a caller
    // writing `host.warmUp().catch(...)` is entitled to have the handler run.
    if (destroyed) return Promise.reject(new Error('tools runtime host: this host was destroyed'))
    if (warming) return warming
    worker ??= attach()
    const owner = worker
    const id = channel.take()
    const settled = channel.wait<void>(id, 'init', owner)
    // Bounded for the same reason the challenge host bounds its INIT: a stalled
    // distribution download never rejects, so neither INIT_FAILED nor onerror
    // fires, and an unbounded wait leaves the Code panel's overlay up forever
    // with no cause shown. One promise settled by whichever comes first — racing
    // a second one leaves the loser's rejection with no consumer.
    const bounded = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const message = `tools runtime host: initialization did not finish within ${initTimeoutMs}ms`
        // Torn down with the expiry as the reason, so a later warm-up starts
        // from a fresh worker rather than joining a dead one.
        if (worker === owner) failWorker(owner, message)
        reject(new Error(message))
      }, initTimeoutMs)
      settled.then(
        () => { clearTimeout(timer); resolve() },
        (err) => { clearTimeout(timer); reject(err) },
      )
    })
    warming = bounded
    // Cleared on rejection, from whichever path rejected it. `warmUp()`
    // short-circuits on a non-null `warming`, so a settled rejection parked here
    // is handed to every later caller — the Code panel then cannot recover
    // without a page reload. The identity test keeps a stale failure from
    // clearing a newer attempt.
    void bounded.catch(() => { if (warming === bounded) warming = null })
    worker.postMessage({ type: 'WARM_UP', id })
    return bounded
  }

  function attach(): WorkerLike {
    const w = opts.createWorker()
    w.onmessage = (e) => {
      const msg = e.data as WorkerMessage
      if (msg.type === 'READY') {
        setReady(true)
        channel.settle(msg.id, p => p.resolve(undefined as never))
      } else if (msg.type === 'INIT_FAILED') {
        warming = null
        channel.settle(msg.id, p => p.reject(new Error(msg.error ?? 'tools worker: failed to load')))
      } else if (msg.type === 'DISPATCH') {
        void serveDispatch(w, msg as DispatchMessage)
      } else if (msg.type === 'STDOUT') {
        listeners.get(msg.id)?.(msg.chunk ?? '')
      } else if (msg.type === 'DONE') {
        listeners.delete(msg.id)
        channel.settle(msg.id, p => p.resolve({ error: msg.error ?? null, stopped: false, timedOut: false } as never))
      }
    }
    // Torn down, not merely reported. Failing the waiters while leaving the
    // worker in place left `ready` true over a thread that no longer answers —
    // the Code panel keeps offering Run — and left the dead thread alive, one
    // per retry.
    w.onerror = (e) => failWorker(w, e?.message ?? 'tools runtime host: worker error')
    // A structured-clone failure on receive fires `messageerror`, not `message`
    // and not `error`: the message is dropped and whatever was waiting on it
    // waits forever.
    w.onmessageerror = () => failWorker(w, 'tools runtime host: a message could not be deserialized')
    return w
  }

  /**
   * Retires the worker that failed and fails everything that was waiting on it.
   *
   * Guarded on identity: a message from a worker that has already been replaced
   * must not tear down its replacement.
   */
  function failWorker(w: WorkerLike, message: string) {
    const reason = new Error(message)
    if (worker !== w) {
      // Only this worker's waiters. It has already been replaced, and
      // `abortAll` here rejects the replacement's live warm-up as collateral
      // for a message from a worker that is already terminated.
      channel.abortOwned(w, reason)
      return
    }
    worker.terminate()
    worker = null
    setReady(false)
    warming = null
    listeners.clear()
    channel.abortOwned(w, reason)
    // Pushed out with a cause. Clearing the page's runner without one leaves
    // the panel loading forever with nothing to show.
    opts.onFailure?.(reason)
  }

  return {
    get ready() { return readyState },

    /**
     * Creates the worker on first use, never at construction. Constructing the
     * host is not opening the Code panel, and the tools instance is a second
     * Pyodide download the learner may never need.
     */
    warmUp,

    runCode(code: string, onStdout?: (chunk: string) => void) {
      if (destroyed) return Promise.reject(new Error('tools runtime host: this host was destroyed'))
      worker ??= attach()
      const id = channel.take()
      if (onStdout) listeners.set(id, onStdout)
      const owner = worker
      const settled = channel.wait<RunOutcome>(id, 'run', owner)
      const ceiling = setTimeout(() => {
        listeners.delete(id)
        channel.settle(id, p => p.resolve(
          { error: 'the runner stopped responding', stopped: false, timedOut: true } as never))
        // Torn down, like the challenge host's deadline does. A worker that
        // stopped answering is still executing something; leaving it alive
        // keeps a WebAssembly loop burning CPU behind a panel that has gone
        // back to idle.
        if (worker === owner) failWorker(owner, 'tools runtime host: the runner stopped responding')
      }, runCeilingMs)
      worker.postMessage({ type: 'RUN_CODE', id, code })
      return settled.finally(() => clearTimeout(ceiling))
    },

    stop() {
      if (!worker) return Promise.resolve()
      const dying = worker
      worker.terminate()
      worker = null
      setReady(false)
      listeners.clear()
      warming = null
      channel.resolveOwned(dying, 'run', () => ({ error: null, stopped: true, timedOut: false }),
        () => new Error('tools runtime host: worker was stopped'))
      // Rebuilt straight away rather than on the next Run, so the learner does
      // not pay a cold start for having stopped.
      return warmUp()
    },

    destroy() {
      destroyed = true
      worker?.terminate()
      worker = null
      setReady(false)
      warming = null
      listeners.clear()
      channel.abortAll(new Error('tools runtime host: worker was destroyed'))
    },
  }
}

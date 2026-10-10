/**
 * The challenge worker: one `PythonRuntime` or `PhpRuntime`, off the main
 * thread.
 *
 * The runtime classes themselves are untouched. Both already take an injected
 * loader, and that seam is what their own test suites are written against;
 * moving their bodies in here would close it and buy nothing, because their
 * behaviour does not depend on which thread they run on.
 *
 * The worker scope is a parameter rather than a global reach, so the protocol
 * can be driven from both ends in a test. The module attaches itself to the
 * real scope only when it is actually running inside a worker.
 */

/** The part of a runtime this worker drives. */
export interface RuntimeLike {
  initialize(appCode: string, fsEntries: Record<string, Uint8Array>, packages?: string[]): Promise<void>
  handleRequest(request: Request): Promise<Response>
}

/** The part of `DedicatedWorkerGlobalScope` this module uses. */
export interface WorkerScope {
  postMessage(msg: unknown): void
  onmessage: ((e: { data: unknown }) => void) | null
}

export interface ChallengeWorkerDeps {
  createRuntime: (backend: string) => Promise<RuntimeLike>
}

interface InitMessage {
  type: 'INIT'
  id: number
  backend: string
  appCode: string
  fsEntries: Record<string, Uint8Array>
  packages: string[]
}

interface RequestMessage {
  type: 'REQUEST'
  id: number
  method: string
  url: string
  headers: [string, string][]
  body: ArrayBuffer | null
}

type Incoming = InitMessage | RequestMessage | { type: string; id: number }

async function toWire(res: Response) {
  return {
    status: res.status,
    headers: [...res.headers] as [string, string][],
    body: await res.arrayBuffer(),
    // Multiple Set-Cookie values are carried unjoined where the platform
    // exposes them: cookie attributes contain commas of their own, so a joined
    // form cannot be split back apart.
    setCookies: typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [],
  }
}

export function attachChallengeWorker(scope: WorkerScope, deps: ChallengeWorkerDeps): void {
  /**
   * Resolves once the runtime exists and has initialized. A request that
   * arrives before that — including one that arrives while a rebuild is
   * re-running `initialize()` — waits on this rather than being refused: the
   * caller has no way to tell "not ready yet" from "broken", and refusing would
   * turn a rebuild into a visible failure.
   */
  let readiness: Promise<RuntimeLike> | null = null

  async function onInit(msg: InitMessage) {
    readiness = (async () => {
      const runtime = await deps.createRuntime(msg.backend)
      await runtime.initialize(msg.appCode, msg.fsEntries, msg.packages)
      return runtime
    })()
    try {
      await readiness
      scope.postMessage({ type: 'READY', id: msg.id })
    } catch (err: unknown) {
      // Answering the failure is not optional. Posting only on success left the
      // host's waiter pending forever, so the page kept a spinner with no cause
      // and every later request blocked on readiness until the relay deadline
      // reported "the page is gone" — a cause that is wrong twice over.
      readiness = null
      scope.postMessage({
        type: 'INIT_FAILED',
        id: msg.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  async function onRequest(msg: RequestMessage) {
    try {
      if (!readiness) throw new Error('challenge worker: INIT has not been sent')
      const runtime = await readiness
      const request = new Request(msg.url, {
        method: msg.method,
        headers: msg.headers ?? [],
        body: msg.method === 'GET' || msg.method === 'HEAD' ? undefined : (msg.body ?? undefined),
      })
      scope.postMessage({ type: 'RESPONSE', id: msg.id, ...(await toWire(await runtime.handleRequest(request))) })
    } catch (err: unknown) {
      // Every request is answered. Dropping the answer would leave the Service
      // Worker relay holding the fetch open until its own deadline, which
      // reports the wrong cause entirely — that path means "the page is gone".
      //
      // The stack is deliberately not included. A worker has no reliable signal
      // for whether it is running in production, and a stack is the kind of
      // thing that is only noticed once it has already shipped.
      const message = err instanceof Error ? err.message : String(err)
      scope.postMessage({
        type: 'RESPONSE',
        id: msg.id,
        status: 500,
        headers: [['content-type', 'application/json']],
        body: new TextEncoder().encode(JSON.stringify({ error: message })).buffer,
        setCookies: [],
      })
    }
  }

  scope.onmessage = (e) => {
    const msg = e.data as Incoming
    if (msg.type === 'INIT') void onInit(msg as InitMessage)
    else if (msg.type === 'REQUEST') void onRequest(msg as RequestMessage)
  }
}

/** Builds the real runtime for a backend. Only reached inside a real worker. */
export async function createChallengeRuntime(backend: string): Promise<RuntimeLike> {
  if (backend === 'flask' || backend === 'fastapi') {
    const { PythonRuntime, loadPyodideFromCdn } = await import('../composables/usePythonRuntime')
    return new PythonRuntime(await loadPyodideFromCdn()) as unknown as RuntimeLike
  }
  if (backend === 'php') {
    const { PhpRuntime, createPhpAdapter } = await import('../composables/usePhpRuntime')
    return new PhpRuntime(async () => {
      const { PhpWeb } = await import('php-wasm/PhpWeb.mjs')
      return createPhpAdapter(new PhpWeb() as never)
    }) as unknown as RuntimeLike
  }
  throw new Error(`challenge worker: unknown backend: ${backend}`)
}

declare const WorkerGlobalScope: { prototype: unknown } | undefined

// Attaching only inside a real worker keeps importing this module from a test —
// or from the main thread — free of side effects.
if (typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof (WorkerGlobalScope as never)) {
  attachChallengeWorker(self as unknown as WorkerScope, { createRuntime: createChallengeRuntime })
}

/**
 * The tools worker: the Code panel's own Pyodide, off the main thread.
 *
 * It is a *separate* instance from the challenge runtime's, and that separation
 * is load-bearing rather than tidy. Each Pyodide instance owns its own
 * WebAssembly memory and therefore its own filesystem; sharing one let a
 * one-line file read reach the challenge's flag from learner code. Running it in
 * its own worker keeps that property and adds a second boundary on top.
 *
 * Learner HTTP does not go straight to the challenge worker. It is handed to the
 * main thread, which records it in the traffic log and forwards it — the traffic
 * log is the panel the learner reads, and a direct worker-to-worker channel
 * would bypass it.
 */
import { buildBridgePayload } from '../composables/usePythonRuntime'

/**
 * How this worker takes Python's output.
 *
 * Byte-oriented, not line-oriented. Pyodide's `batched` form hands over each
 * line with its terminating newline already removed, and never hands over text
 * that has no terminating newline at all — under it the panel showed every
 * multi-line script as one run-together line, and dropped a trailing
 * `print(..., end='')` entirely.
 */
export interface StreamHandler {
  write: (bytes: Uint8Array) => number
}

/** The part of Pyodide this worker drives. */
export interface PyodideLike {
  runPythonAsync(code: string): Promise<unknown>
  globals: { set(name: string, value: unknown): void }
  setStdout(opts: StreamHandler): void
  setStderr(opts: StreamHandler): void
}

/** The part of `DedicatedWorkerGlobalScope` this module uses. */
export interface ToolsWorkerScope {
  postMessage(msg: unknown): void
  onmessage: ((e: { data: unknown }) => void) | null
}

export interface ToolsWorkerDeps {
  createPyodide: (bridge: DispatchBridge) => Promise<PyodideLike>
}

export type DispatchBridge = (
  method: string, url: string, headersJson: string, body: string,
) => Promise<string>

interface DispatchResult {
  type: 'DISPATCH_RESULT'
  id: number
  status: number
  headers: [string, string][]
  body: string
}

export function attachToolsWorker(scope: ToolsWorkerScope, deps: ToolsWorkerDeps): void {
  let pyodide: Promise<PyodideLike> | null = null
  let nextAskId = 1
  const awaiting = new Map<number, (payload: string) => void>()
  /**
   * The run whose output the stdout hook is feeding, or null between runs.
   *
   * Pyodide exposes one stdout hook per instance, so two concurrent runs cannot
   * be told apart by tagging: run one's output would arrive under run two's id,
   * and run one's cleanup would mute run two. A second run is therefore refused
   * rather than multiplexed — and refused here, where the invariant lives,
   * rather than left to the panel's disabled-button convention.
   */
  let currentRun: number | null = null
  let emit: (chunk: string) => void = () => {}

  /**
   * A stdout/stderr handler that forwards exactly what Python wrote.
   *
   * The byte count is the handler's return value: Python reads it as "this many
   * bytes were accepted", and returning nothing tells it the write failed.
   * Buffers that decode to nothing — the first half of a split character — are
   * held by the decoder rather than forwarded as an empty chunk.
   */
  function byteStream(): { write: (bytes: Uint8Array) => number } {
    const decoder = new TextDecoder('utf-8')
    return {
      write: (bytes) => {
        const text = decoder.decode(bytes, { stream: true })
        if (text) emit(text)
        return bytes.length
      },
    }
  }

  /**
   * Learner code is suspended inside `run_sync` while this promise is pending —
   * the WebAssembly stack is parked, though this worker's event loop stays free,
   * which is exactly why the reply can arrive at all. A reply that never comes
   * leaves the learner's call parked forever, so the main thread answers every
   * ask, including the ones it cannot serve.
   */
  const bridge: DispatchBridge = (method, url, headersJson, body) => {
    let headers: [string, string][]
    try {
      headers = Object.entries(JSON.parse(headersJson || '{}') as Record<string, string>)
    } catch (err) {
      // Raised, not swallowed. Sending the request with every header dropped
      // drops Cookie too, and the main thread would then have nothing to convert
      // into the platform's carrier — the learner is silently logged out on
      // every request, which is a symptom this platform has shipped once before.
      return Promise.reject(new Error(
        `wxl dispatch bridge: could not parse the request header map: ${err instanceof Error ? err.message : String(err)}`,
      ))
    }
    const id = nextAskId++
    return new Promise<string>((resolve) => {
      awaiting.set(id, resolve)
      scope.postMessage({ type: 'DISPATCH', id, method, url, headers, body })
    })
  }

  async function ensurePyodide(): Promise<PyodideLike> {
    pyodide ??= (async () => {
      const py = await deps.createPyodide(bridge)
      // Streaming, not buffering. The alternative collects output inside the
      // worker and ships it when the run ends — and a run ended by Stop has no
      // worker left to ship from.
      // One decoder per stream, and both keep state across calls: a multi-byte
      // character can be split across two writes, and a decoder that forgets
      // between calls replaces each half with a replacement character. Two
      // decoders rather than one, because a half-character left by stdout must
      // not be completed by whatever stderr writes next.
      py.setStdout(byteStream())
      py.setStderr(byteStream())
      return py
    })()
    try {
      return await pyodide
    } catch (err) {
      // A failed load must not poison every later attempt with the same stale
      // rejection; the next run gets a fresh try.
      pyodide = null
      throw err
    }
  }

  /**
   * Asks Python to hand over whatever it is still holding.
   *
   * Python only surrenders text that has no terminating newline when the stream
   * is flushed, so a learner whose last statement is `print(..., end='')` sees
   * nothing without this. Once per run, not once per buffer: flushing after
   * every write would turn a streamed run into a round trip per chunk.
   *
   * A flush that fails is swallowed. The run's own result already exists by this
   * point, and reporting a failed flush as the run's error would replace a
   * NameError the learner needs with an error about bookkeeping.
   */
  async function flushStreams(py: PyodideLike | null): Promise<void> {
    if (!py) return
    try {
      await py.runPythonAsync('import sys; sys.stdout.flush(); sys.stderr.flush()')
    } catch {
      /* see above: the run's result stands */
    }
  }

  async function onRunCode(msg: { id: number; code: string }) {
    if (currentRun !== null) {
      scope.postMessage({ type: 'DONE', id: msg.id, error: 'a run is already running in this panel' })
      return
    }
    currentRun = msg.id
    emit = (chunk: string) => scope.postMessage({ type: 'STDOUT', id: msg.id, chunk })
    let error: string | null = null
    let py: PyodideLike | null = null
    try {
      py = await ensurePyodide()
      // Asynchronous entry point, and it must stay that way: `run_sync` can only
      // suspend a stack an asynchronous entry point started. Under a synchronous
      // one it raises at the moment it needs to suspend — after the HTTP request
      // has already gone out — and the error names stack switching, not the
      // entry point.
      await py.runPythonAsync(msg.code)
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err)
    } finally {
      // Before the hook is muted, so what the flush produces still reaches the
      // panel, and before DONE, so the panel is not told the run ended while its
      // last line is still in Python's buffer. A run that raised is flushed too:
      // the lines printed before the exception are the ones worth keeping.
      await flushStreams(py)
      currentRun = null
      emit = () => {}
      scope.postMessage({ type: 'DONE', id: msg.id, error })
    }
  }

  function onDispatchResult(msg: DispatchResult) {
    const resolve = awaiting.get(msg.id)
    if (!resolve) return
    awaiting.delete(msg.id)
    // Reassembled into a Response so the payload is built by the same function
    // the main thread has always used. A second formatter here would drift from
    // it the first time either side changed.
    const res = new Response(null, { status: msg.status, headers: msg.headers ?? [] })
    resolve(JSON.stringify(buildBridgePayload(res, msg.body ?? '')))
  }

  /**
   * Loading is answered either way. A worker that only reports success leaves
   * the panel's overlay cleared and Run enabled while nothing has loaded, and a
   * failed download has no path back to the learner at all.
   */
  async function onWarmUp(msg: { id: number }) {
    try {
      await ensurePyodide()
      scope.postMessage({ type: 'READY', id: msg.id })
    } catch (err: unknown) {
      scope.postMessage({
        type: 'INIT_FAILED',
        id: msg.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  scope.onmessage = (e) => {
    const msg = e.data as { type: string; id: number; code?: string }
    if (msg.type === 'WARM_UP') void onWarmUp({ id: msg.id })
    else if (msg.type === 'RUN_CODE') void onRunCode({ id: msg.id, code: msg.code ?? '' })
    else if (msg.type === 'DISPATCH_RESULT') onDispatchResult(msg as unknown as DispatchResult)
  }
}

/** Loads the Code panel's Pyodide and wires the bridge. Only reached inside a
 *  real worker. */
export async function createToolsPyodide(bridge: DispatchBridge): Promise<PyodideLike> {
  const { loadPyodideFromCdn, installRequestsPatch } = await import('../composables/usePythonRuntime')
  const loadPyodide = await loadPyodideFromCdn()
  const py = await loadPyodide()
  await installRequestsPatch(py as never, bridge)
  return py as unknown as PyodideLike
}

declare const WorkerGlobalScope: { prototype: unknown } | undefined

if (typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof (WorkerGlobalScope as never)) {
  attachToolsWorker(self as unknown as ToolsWorkerScope, { createPyodide: createToolsPyodide })
}

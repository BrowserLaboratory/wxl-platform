/**
 * The tools worker's own side of the protocol: it runs learner code, streams
 * what that code prints, and asks the main thread to serve the HTTP the code
 * makes.
 *
 * Pyodide is injected. Loading it for real would put a multi-second download
 * inside a unit test, and none of the behaviour under test here is Pyodide's.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  attachToolsWorker,
  type ToolsWorkerScope,
  type PyodideLike,
} from '../../../.vitepress/theme/workers/toolsRuntime.worker'

interface StubScope extends ToolsWorkerScope {
  sent: Record<string, unknown>[]
  send(msg: Record<string, unknown>): void
}

function stubScope(): StubScope {
  const s: StubScope = {
    sent: [],
    onmessage: null,
    postMessage(msg: unknown) { s.sent.push(msg as Record<string, unknown>) },
    send(msg) { s.onmessage?.({ data: msg }) },
  }
  return s
}

/**
 * A Pyodide stand-in whose `runPythonAsync` is driven by the test.
 *
 * The stand-in takes output the way the real runtime does — as bytes — and the
 * tests still hand it strings, so what a test writes is encoded on the way in
 * rather than bypassing the worker's decoding.
 */
function fakePyodide(run: (code: string, emit: (s: string) => void) => Promise<unknown>) {
  let stdout: ((bytes: Uint8Array) => number) | null = null
  const globals = new Map<string, unknown>()
  const encoder = new TextEncoder()
  const py: PyodideLike = {
    globals: { set: (k, v) => { globals.set(k, v) } },
    setStdout: ({ write }) => { stdout = write },
    setStderr: () => {},
    // The worker asks Python to flush when a run ends. Real Pyodide executes
    // those statements; a stand-in that routed them back into the test's script
    // would run that script twice.
    runPythonAsync: (code: string) =>
      isFlush(code) ? Promise.resolve(undefined) : run(code, s => { stdout?.(encoder.encode(s)) }),
  }
  return { py, globals }
}

/** The statements the worker runs to make Python surrender its buffers. */
const isFlush = (code: string) => code.includes('sys.stdout.flush()')

const tick = () => new Promise(r => setTimeout(r, 0))

describe('tools worker', () => {
  it('streams what learner code prints, before the run has ended', async () => {
    const scope = stubScope()
    let finish: () => void = () => {}
    const done = new Promise<void>(r => { finish = r })
    const { py } = fakePyodide(async (_code, emit) => {
      emit('found: 41\n')
      emit('found: 42\n')
      await done
      return undefined
    })
    attachToolsWorker(scope, { createPyodide: async () => py })

    scope.send({ type: 'RUN_CODE', id: 1, code: 'print("x")' })
    await tick()

    // Still running. Collecting output and shipping it at the end is what makes
    // a Stop useless: destroying the worker discards the buffer, and on this
    // platform those lines are frequently the answer being enumerated.
    // Order as written, and both of them out before the run ends: the byte
    // handler decodes each buffer as it arrives rather than accumulating until
    // the stream is flushed.
    expect(scope.sent.filter(m => m.type === 'STDOUT').map(m => m.chunk)).toEqual(['found: 41\n', 'found: 42\n'])
    expect(scope.sent.find(m => m.type === 'DONE')).toBeUndefined()

    finish()
    await tick()
    expect(scope.sent.find(m => m.type === 'DONE')).toEqual({ type: 'DONE', id: 1, error: null })
  })

  it('reports a raising run as an error without losing what it printed', async () => {
    const scope = stubScope()
    const { py } = fakePyodide(async (_code, emit) => {
      emit('before\n')
      throw new Error("NameError: name 'x' is not defined")
    })
    attachToolsWorker(scope, { createPyodide: async () => py })

    scope.send({ type: 'RUN_CODE', id: 2, code: 'x' })
    await tick()

    expect(scope.sent.filter(m => m.type === 'STDOUT').map(m => m.chunk)).toEqual(['before\n'])
    const done = scope.sent.find(m => m.type === 'DONE')
    expect(done!.id).toBe(2)
    expect(done!.error).toContain('NameError')
  })

  it('asks the main thread to serve learner HTTP and hands back the bridge payload', async () => {
    const scope = stubScope()
    let bridgeResult: unknown
    // The bridge is handed to the Pyodide factory, which is where the shipped
    // `requests` monkey-patch receives it — not poked into globals afterwards.
    let bridge!: (m: string, u: string, h: string, b: string) => Promise<string>
    const { py } = fakePyodide(async () => {
      bridgeResult = await bridge('POST', 'https://challenge-x.localhost/login', '{}', 'user=admin')
      return undefined
    })
    attachToolsWorker(scope, { createPyodide: async (b) => { bridge = b; return py } })

    scope.send({ type: 'RUN_CODE', id: 3, code: 'requests.post(...)' })
    await tick()

    const ask = scope.sent.find(m => m.type === 'DISPATCH')
    expect(ask, 'learner HTTP never reached the main thread').toBeDefined()
    expect(ask!.method).toBe('POST')
    expect(ask!.url).toBe('https://challenge-x.localhost/login')
    expect(ask!.body).toBe('user=admin')

    scope.send({
      type: 'DISPATCH_RESULT',
      id: ask!.id,
      status: 302,
      headers: [['location', '/home'], ['x-wxlsh-set-cookie', 'c2lkPWFiYw==']],
      body: 'moved',
    })
    await tick()

    // The payload shape is the one the shipped `requests` monkey-patch parses.
    // Set-Cookie arrives through the existing carrier rather than a second
    // channel invented here.
    const payload = JSON.parse(bridgeResult as string)
    expect(payload.status).toBe(302)
    expect(payload.headers.location).toBe('/home')
    expect(payload.set_cookies).toEqual(['sid=abc'])
    expect(payload.body).toBe('moved')
  })

  it('creates Pyodide once and reuses it across runs', async () => {
    const scope = stubScope()
    const { py } = fakePyodide(async () => undefined)
    const createPyodide = vi.fn(async () => py)
    attachToolsWorker(scope, { createPyodide })

    scope.send({ type: 'RUN_CODE', id: 4, code: 'pass' })
    await tick()
    scope.send({ type: 'RUN_CODE', id: 5, code: 'pass' })
    await tick()

    expect(createPyodide).toHaveBeenCalledTimes(1)
  })

  it('reports a Pyodide that fails to load rather than going quiet', async () => {
    const scope = stubScope()
    attachToolsWorker(scope, { createPyodide: async () => { throw new Error('network is down') } })

    scope.send({ type: 'RUN_CODE', id: 6, code: 'pass' })
    await tick()

    const done = scope.sent.find(m => m.type === 'DONE')
    expect(done, 'a failed load must still end the run').toBeDefined()
    expect(done!.error).toContain('network is down')
  })
})

describe('tools worker — round 2 fixes', () => {
  it('M3: a malformed header map fails the call instead of silently stripping Cookie', async () => {
    const scope = stubScope()
    let bridge!: (m: string, u: string, h: string, b: string) => Promise<string>
    let raised: unknown = null
    const { py } = fakePyodide(async () => {
      try { await bridge('GET', 'https://challenge-x.localhost/', '{not json', '') }
      catch (e) { raised = e }
      return undefined
    })
    attachToolsWorker(scope, { createPyodide: async (b) => { bridge = b; return py } })

    scope.send({ type: 'RUN_CODE', id: 1, code: 'requests.get(...)' })
    await tick()

    // Dropping every header drops Cookie, which the main thread would otherwise
    // convert to the platform's carrier. The result is a learner silently logged
    // out on every request — the symptom this platform has already shipped once.
    expect(scope.sent.find(m => m.type === 'DISPATCH')).toBeUndefined()
    expect(raised).toBeInstanceOf(Error)
    expect(String(raised)).toMatch(/header/i)
  })

  it('M4: refuses a second run while one is in flight', async () => {
    const scope = stubScope()
    let release: () => void = () => {}
    const { py } = fakePyodide(async (_code, emit) => {
      emit('from run 1\n')
      await new Promise<void>(r => { release = r })
      return undefined
    })
    attachToolsWorker(scope, { createPyodide: async () => py })

    scope.send({ type: 'RUN_CODE', id: 10, code: 'a' })
    await tick()
    scope.send({ type: 'RUN_CODE', id: 11, code: 'b' })
    await tick()

    // Pyodide has one stdout hook per instance, so two concurrent runs cannot be
    // separated by tagging — run one's output would arrive under run two's id
    // and run one's cleanup would mute run two. Refusing is the only honest
    // answer, and it belongs here rather than in the panel's disabled-button
    // convention, which is not where the invariant lives.
    const second = scope.sent.find(m => m.type === 'DONE' && m.id === 11)
    expect(second, 'the second run was never answered').toBeDefined()
    expect(String(second!.error)).toMatch(/already running/i)

    expect(scope.sent.filter(m => m.type === 'STDOUT' && m.id === 11)).toHaveLength(0)

    release()
    await tick()
    expect(scope.sent.find(m => m.type === 'DONE' && m.id === 10)?.error).toBeNull()
  })
})

/**
 * What the panel shows is what Python wrote.
 *
 * The fake above hands the worker already-formed strings, which is a shape
 * Pyodide's line-oriented handler never produces: it strips the newline off
 * every line it delivers, and it never delivers text that has no newline at
 * all. These tests drive the byte-oriented handler instead, so the worker is
 * exercised against the contract the real runtime offers.
 */
describe('tools worker — output fidelity', () => {
  /** A Pyodide stand-in that records which stdout form the worker registered. */
  function byteStdoutPyodide(run: (write: (bytes: Uint8Array) => number) => Promise<unknown>) {
    let writer: ((bytes: Uint8Array) => number) | null = null
    const py = {
      globals: { set: () => {} },
      setStdout: (opts: { write?: (b: Uint8Array) => number }) => { writer = opts.write ?? null },
      setStderr: () => {},
      runPythonAsync: (code: string) => isFlush(code) ? Promise.resolve(undefined) : run((bytes) => {
        if (!writer) throw new Error('the worker registered no byte-oriented stdout handler')
        return writer(bytes)
      }),
    } as unknown as PyodideLike
    return { py, registered: () => writer !== null }
  }

  const bytes = (s: string) => new TextEncoder().encode(s)

  it('keeps the line breaks Python wrote', async () => {
    const scope = stubScope()
    const { py } = byteStdoutPyodide(async (write) => {
      write(bytes('line one\n'))
      write(bytes('line two\n'))
      write(bytes('line three\n'))
      return undefined
    })
    attachToolsWorker(scope, { createPyodide: async () => py })

    scope.send({ type: 'RUN_CODE', id: 1, code: 'print' })
    await tick()

    const streamed = scope.sent.filter(m => m.type === 'STDOUT').map(m => m.chunk).join('')
    expect(streamed, 'the line breaks Python wrote did not reach the panel')
      .toBe('line one\nline two\nline three\n')
  })

  it('delivers text that has no terminating newline', async () => {
    const scope = stubScope()
    const { py } = byteStdoutPyodide(async (write) => {
      write(bytes('line one\n'))
      write(bytes('no newline at end'))
      return undefined
    })
    attachToolsWorker(scope, { createPyodide: async () => py })

    scope.send({ type: 'RUN_CODE', id: 2, code: "print('x', end='')" })
    await tick()

    const streamed = scope.sent.filter(m => m.type === 'STDOUT').map(m => m.chunk).join('')
    expect(streamed).toBe('line one\nno newline at end')
  })

  it('reassembles a multi-byte character split across two writes', async () => {
    const scope = stubScope()
    // U+4E2D is three bytes; the split lands inside it, which is what a write
    // boundary in the middle of a buffer looks like from the decoder's side.
    const whole = bytes('中文\n')
    const { py } = byteStdoutPyodide(async (write) => {
      write(whole.slice(0, 2))
      write(whole.slice(2))
      return undefined
    })
    attachToolsWorker(scope, { createPyodide: async () => py })

    scope.send({ type: 'RUN_CODE', id: 3, code: "print('中文')" })
    await tick()

    const streamed = scope.sent.filter(m => m.type === 'STDOUT').map(m => m.chunk).join('')
    expect(streamed, 'a character split across two writes was corrupted').toBe('中文\n')
    expect(streamed).not.toContain('�')
  })

  it('tells Pyodide how many bytes it accepted', async () => {
    const scope = stubScope()
    let accepted: number | null = null
    const { py } = byteStdoutPyodide(async (write) => {
      accepted = write(bytes('four\n'))
      return undefined
    })
    attachToolsWorker(scope, { createPyodide: async () => py })

    scope.send({ type: 'RUN_CODE', id: 4, code: 'print' })
    await tick()

    // The handler contract is a byte count; returning undefined makes Python
    // believe nothing was written.
    expect(accepted).toBe(bytes('four\n').length)
  })
})

/**
 * Python hands over unterminated text only when the stream is flushed, so a
 * script whose last statement is `print(..., end='')` shows nothing unless the
 * worker asks for that flush when the run ends.
 */
describe('tools worker — flush at end of run', () => {
  /** A stand-in that buffers unterminated text the way Python does. */
  function bufferingPyodide(opts: { flushThrows?: boolean } = {}) {
    let writer: ((bytes: Uint8Array) => number) | null = null
    let held = ''
    const encoder = new TextEncoder()
    const flushCalls: string[] = []
    const py = {
      globals: { set: () => {} },
      setStdout: (o: { write?: (b: Uint8Array) => number }) => { writer = o.write ?? null },
      setStderr: () => {},
      runPythonAsync: async (code: string) => {
        if (code.includes('flush')) {
          flushCalls.push(code)
          if (opts.flushThrows) throw new Error('flush failed')
          if (held) { writer?.(encoder.encode(held)); held = '' }
          return undefined
        }
        writer?.(encoder.encode('line one\n'))
        held = 'no newline at end'
        return undefined
      },
    } as unknown as PyodideLike
    return { py, flushCalls }
  }

  const streamed = (scope: StubScope) =>
    scope.sent.filter(m => m.type === 'STDOUT').map(m => m.chunk).join('')

  it('flushes when the run ends, so unterminated output is shown', async () => {
    const scope = stubScope()
    const { py, flushCalls } = bufferingPyodide()
    attachToolsWorker(scope, { createPyodide: async () => py })

    scope.send({ type: 'RUN_CODE', id: 1, code: "print('x', end='')" })
    await tick()
    await tick()

    expect(streamed(scope), 'text with no terminating newline never reached the panel')
      .toBe('line one\nno newline at end')
    // Once per run. Flushing after every buffer would turn the streamed path
    // into a synchronous round trip per chunk.
    expect(flushCalls).toHaveLength(1)
  })

  it('the flushed text arrives before the run is reported as done', async () => {
    const scope = stubScope()
    const { py } = bufferingPyodide()
    attachToolsWorker(scope, { createPyodide: async () => py })

    scope.send({ type: 'RUN_CODE', id: 2, code: "print('x', end='')" })
    await tick()
    await tick()

    const kinds = scope.sent.map(m => m.type)
    expect(kinds.lastIndexOf('STDOUT')).toBeLessThan(kinds.indexOf('DONE'))
  })

  it('a failing flush does not turn a successful run into an error', async () => {
    const scope = stubScope()
    const { py } = bufferingPyodide({ flushThrows: true })
    attachToolsWorker(scope, { createPyodide: async () => py })

    scope.send({ type: 'RUN_CODE', id: 3, code: 'pass' })
    await tick()
    await tick()

    const done = scope.sent.find(m => m.type === 'DONE')
    expect(done, 'the run was never answered').toBeDefined()
    expect(done!.error, 'a flush that failed became the run result').toBeNull()
  })
})

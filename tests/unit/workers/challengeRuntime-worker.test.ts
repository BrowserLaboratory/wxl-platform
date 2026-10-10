/**
 * The challenge worker's own side of the protocol.
 *
 * The worker scope is injected rather than reached for, so the handler can be
 * driven from a test without a real thread — the same shape the Service Worker
 * suite uses to drive the shipped script with a stub `self`.
 *
 * What this file deliberately does NOT test is `PythonRuntime` or `PhpRuntime`
 * behaviour. Those classes are unchanged by this change and keep their own
 * suites; a copy of their assertions here would stop testing them the moment one
 * of the two drifted.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  attachChallengeWorker,
  type WorkerScope,
  type RuntimeLike,
} from '../../../.vitepress/theme/workers/challengeRuntime.worker'

interface StubScope extends WorkerScope {
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

function fakeRuntime(overrides: Partial<RuntimeLike> = {}): RuntimeLike {
  return {
    initialize: vi.fn(async () => {}),
    handleRequest: vi.fn(async () => new Response('ok', { status: 200 })),
    ...overrides,
  }
}

/** Let the handler's awaits settle. */
const tick = () => new Promise(r => setTimeout(r, 0))

describe('challenge worker', () => {
  it('builds the runtime named by the backend and answers READY', async () => {
    const scope = stubScope()
    const runtime = fakeRuntime()
    const createRuntime = vi.fn(async () => runtime)
    attachChallengeWorker(scope, { createRuntime })

    const fsEntries = { '/flag.txt': new Uint8Array([7]) }
    scope.send({ type: 'INIT', id: 1, backend: 'php', appCode: '<?php', fsEntries, packages: [] })
    await tick()

    expect(createRuntime).toHaveBeenCalledWith('php')
    expect(runtime.initialize).toHaveBeenCalledWith('<?php', fsEntries, [])
    expect(scope.sent).toContainEqual({ type: 'READY', id: 1 })
  })

  it('hands a request to the runtime and answers with its status, headers and body', async () => {
    const scope = stubScope()
    const handleRequest = vi.fn(async (req: Request) => {
      expect(req.method).toBe('POST')
      expect(req.url).toBe('https://challenge-x.localhost/login')
      expect(await req.text()).toBe('user=admin')
      return new Response('welcome', { status: 302, headers: { location: '/home' } })
    })
    attachChallengeWorker(scope, { createRuntime: async () => fakeRuntime({ handleRequest }) })

    scope.send({ type: 'INIT', id: 1, backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    await tick()
    scope.send({
      type: 'REQUEST', id: 2,
      method: 'POST',
      url: 'https://challenge-x.localhost/login',
      headers: [['content-type', 'text/plain']],
      body: new TextEncoder().encode('user=admin').buffer,
    })
    await tick()

    expect(handleRequest).toHaveBeenCalledTimes(1)
    const res = scope.sent.find(m => m.type === 'RESPONSE')
    expect(res, 'worker did not answer the request').toBeDefined()
    expect(res!.id).toBe(2)
    expect(res!.status).toBe(302)
    expect(res!.headers).toContainEqual(['location', '/home'])
    expect(new TextDecoder().decode(res!.body as ArrayBuffer)).toBe('welcome')
  })

  it('answers a request that arrives before INIT once the runtime is ready', async () => {
    const scope = stubScope()
    let release: () => void = () => {}
    const gate = new Promise<void>(r => { release = r })
    const runtime = fakeRuntime({ initialize: vi.fn(async () => { await gate }) })
    attachChallengeWorker(scope, { createRuntime: async () => runtime })

    scope.send({ type: 'INIT', id: 1, backend: 'flask', appCode: 'app = 1', fsEntries: {}, packages: [] })
    scope.send({ type: 'REQUEST', id: 2, method: 'GET', url: 'https://challenge-x.localhost/', headers: [], body: null })
    await tick()

    // Still initializing: the request waits rather than being answered with an
    // error. A rebuild re-runs initialize, so this is the same path a request
    // arriving mid-rebuild takes.
    expect(scope.sent.find(m => m.type === 'RESPONSE')).toBeUndefined()

    release()
    await tick()
    await tick()

    expect(scope.sent.find(m => m.type === 'RESPONSE')?.id).toBe(2)
  })

  it('reports a runtime that throws rather than going silent', async () => {
    const scope = stubScope()
    const runtime = fakeRuntime({ handleRequest: vi.fn(async () => { throw new Error('boom') }) })
    attachChallengeWorker(scope, { createRuntime: async () => runtime })

    scope.send({ type: 'INIT', id: 1, backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
    await tick()
    scope.send({ type: 'REQUEST', id: 2, method: 'GET', url: 'https://challenge-x.localhost/', headers: [], body: null })
    await tick()

    // Every request must be answered. A dropped answer leaves the relay holding
    // the fetch open until its own deadline, which reports the wrong cause.
    const res = scope.sent.find(m => m.type === 'RESPONSE')
    expect(res, 'a throwing runtime must still produce an answer').toBeDefined()
    expect(res!.status).toBe(500)
  })
})

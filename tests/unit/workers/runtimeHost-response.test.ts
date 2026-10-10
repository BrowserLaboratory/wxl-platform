/**
 * @vitest-environment node
 *
 * Response construction, under Node rather than happy-dom, on purpose.
 *
 * happy-dom's `Response` accepts a non-empty body with a null-body status; a
 * real browser and Node both throw. Written in the default environment this
 * file's first assertion passed against code that was broken — the same trap
 * the Service Worker response suite documents for `set-cookie`.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  createChallengeRuntimeHost,
  type WorkerLike,
} from '../../../.vitepress/theme/workers/runtimeHost'

interface StubWorker extends WorkerLike {
  sent: Record<string, unknown>[]
  terminated: boolean
  emit(msg: Record<string, unknown>): void
}

function stubWorker(): StubWorker {
  const w: StubWorker = {
    sent: [], terminated: false, onmessage: null, onerror: null,
    postMessage(msg: unknown) { w.sent.push(msg as Record<string, unknown>) },
    terminate() { w.terminated = true },
    emit(msg) { w.onmessage?.({ data: msg }) },
  }
  return w
}

async function readyHost() {
  const made: StubWorker[] = []
  const create = vi.fn(() => { const w = stubWorker(); made.push(w); return w })
  const host = createChallengeRuntimeHost({ createWorker: create, execTimeoutMs: 1000 })
  const started = host.initialize({ backend: 'php', appCode: '<?php', fsEntries: {}, packages: [] })
  const init = made[0].sent.find(m => m.type === 'INIT')!
  made[0].emit({ type: 'READY', id: init.id })
  await started
  return { host, w: made[0] }
}

const tick = () => new Promise(r => setTimeout(r, 0))

describe('runtime host — building a response from the wire', () => {
  it('answers a null-body status instead of losing the request', async () => {
    const { host, w } = await readyHost()
    const pending = host.handleRequest(new Request('https://challenge-x.localhost/x'))
    await tick()
    const id = w.sent.find(m => m.type === 'REQUEST')!.id

    // The worker always sends an ArrayBuffer, so an empty body arrives as
    // ArrayBuffer(0) — not nullish, so `?? null` does not save it, and
    // `new Response(ArrayBuffer(0), { status: 204 })` throws. The PHP runtime
    // deliberately supports 204, 205 and 304, so this is a response a challenge
    // can legitimately serve.
    w.emit({ type: 'RESPONSE', id, status: 204, headers: [], body: new ArrayBuffer(0), setCookies: [] })

    const res = await pending
    expect(res.status).toBe(204)
  })

  it('keeps 304 and 205 answerable too', async () => {
    for (const status of [205, 304]) {
      const { host, w } = await readyHost()
      const pending = host.handleRequest(new Request('https://challenge-x.localhost/x'))
      await tick()
      const id = w.sent.find(m => m.type === 'REQUEST')!.id
      w.emit({ type: 'RESPONSE', id, status, headers: [], body: new ArrayBuffer(0), setCookies: [] })
      expect((await pending).status).toBe(status)
    }
  })

  it('settles the waiter even when the response cannot be built', async () => {
    const { host, w } = await readyHost()
    const pending = host.handleRequest(new Request('https://challenge-x.localhost/x'))
    await tick()
    const id = w.sent.find(m => m.type === 'REQUEST')!.id

    // 999 is outside the range `new Response` accepts. By this point the
    // deadline is disarmed and the waiter is already out of the map, so a throw
    // here would leave a request nothing can ever answer.
    w.emit({ type: 'RESPONSE', id, status: 999, headers: [], body: null, setCookies: [] })

    await expect(pending).rejects.toThrow()
  })
})

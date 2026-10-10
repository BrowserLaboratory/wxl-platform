/**
 * The only place a real `Worker` is constructed.
 *
 * It is its own module so that consumers can be tested without one. The suite
 * runs under happy-dom, which has no Worker implementation, and a component that
 * reached for `new Worker` inline could only be tested by not testing that path
 * — which is how the main-thread construction this change removes would quietly
 * come back.
 *
 * A test mocks this module. It does NOT get a main-thread runtime instead: there
 * is no fallback here on purpose. Falling back to constructing a runtime on the
 * page's own thread restores the condition the whole capability exists to
 * remove, and it would do so silently.
 */
import type { WorkerLike } from './runtimeHost'

export function createChallengeWorker(): WorkerLike {
  return new Worker(new URL('./challengeRuntime.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike
}

export function createToolsWorker(): WorkerLike {
  return new Worker(new URL('./toolsRuntime.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike
}

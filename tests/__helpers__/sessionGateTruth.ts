import 'fake-indexeddb/auto'
import { IDBFactory, IDBVersionChangeEvent } from 'fake-indexeddb'
import { vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '../../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../../.vitepress/theme/i18n/messages/zh-TW.json'

/**
 * Harness for the session gate's truth tests (seam S2 of spec 0001).
 *
 * The routing tests mock the whole gate composable and can only see which message group a
 * flag selects. These tests run the real composable over the real persistence layer on
 * fake-indexeddb, so a test can build the machine state a sentence describes, read that
 * state back, and then compare what is on screen with a sentence written in the test.
 *
 * The message files are loaded only to render the component, as the site does. Expected
 * text is never taken from them: a test that read its expectation from the file it checks
 * would pass whatever the file said.
 *
 * A test file using this harness must mock `vitepress` itself (`withBase`), because the
 * component imports it and `vi.mock` is hoisted per file, and should call
 * `enableAutoUnmount(afterEach)` so no mounted gate outlives its test.
 */

/** The platform's IndexedDB database. */
export const DATABASE_NAME = 'challenge-tools'

/** Navigations the gate asked for during the current test, in order. */
export const navigations: string[] = []

/**
 * A fresh browser profile: empty database, empty storages, a new document.
 *
 * Also records navigation instead of performing it. The clear's success path and the reload
 * exit both send the page to the site root; a test environment that followed them would be
 * testing its own navigation fallback, and the request is the observable fact anyway.
 */
export function resetTruthEnvironment(): void {
  globalThis.indexedDB = new IDBFactory()
  sessionStorage.clear()
  localStorage.clear()
  navigations.length = 0
  vi.spyOn(window.location, 'assign').mockImplementation((url: string | URL) => { navigations.push(String(url)) })
  vi.resetModules()
}

export type Locale = 'en' | 'zh-TW'

/**
 * Evaluate the gate the way the theme does on load, then mount the component.
 *
 * Both modules are imported after any reset, so the component and the composable share one
 * module instance — the one the test also drives through `gate`.
 */
export async function mountRealGate(locale: Locale, isChallengePage = true): Promise<{
  gate: ReturnType<typeof import('../../.vitepress/theme/composables/useSessionGate')['useSessionGate']>
  wrapper: VueWrapper
}> {
  const { useSessionGate } = await import('../../.vitepress/theme/composables/useSessionGate')
  const gate = useSessionGate()
  await gate.evaluate()
  const { default: SessionGate } = await import('../../.vitepress/theme/components/SessionGate.vue')
  const i18n = createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { en, 'zh-TW': zhTW } })
  const wrapper = mount(SessionGate, { props: { isChallengePage }, global: { plugins: [i18n] } })
  return { gate, wrapper }
}

/** Every part of the gate a truth test reads, by its `data-session-gate-<part>` marker. */
export type GatePart =
  | 'title' | 'body'
  | 'report-heading' | 'report-hint' | 'raw-error'
  | 'keep' | 'clear' | 'reload' | 'dismiss'

/**
 * The trimmed text of the one element marked `data-session-gate-<part>`, or `null` if none.
 *
 * Fails when the marker matches more than one element: a sentence is read from exactly one
 * place, and a second match would make "which one did the test read" a question.
 */
export function sentence(wrapper: VueWrapper, part: GatePart): string | null {
  const found = wrapper.findAll(`[data-session-gate-${part}]`)
  if (found.length > 1) throw new Error(`data-session-gate-${part} marks ${found.length} elements`)
  return found.length === 1 ? found[0]!.text().trim() : null
}

/**
 * Press delete and wait until that run has settled: a report is on screen, or the gate
 * asked to navigate to the site root after a clear that succeeded.
 *
 * The component fires the run without awaiting it, so a fault meant to affect the run must
 * still be in place when this returns. Wrap this call, not the bare click, in the fault.
 */
export async function pressClearAndSettle(
  wrapper: VueWrapper,
  gate: Awaited<ReturnType<typeof mountRealGate>>['gate'],
): Promise<void> {
  const navigated = navigations.length
  await wrapper.get('[data-session-gate-clear]').trigger('click')
  await vi.waitFor(() => {
    if (gate.clearError.value === null && navigations.length === navigated) throw new Error('run still in flight')
  })
}

/**
 * Press delete on a run whose delete will not settle, and carry it past the platform's time
 * bound on the delete, until that run has settled with an error.
 *
 * The bound is five real seconds. Only `setTimeout` and `clearTimeout` are faked, and only
 * here: fake-indexeddb schedules its work with `setImmediate`, which keeps running for real, so
 * the delete gets issued and blocked exactly as it would be, while the bound is crossed at once.
 */
export async function pressClearPastDeleteBound(
  wrapper: VueWrapper,
  gate: Awaited<ReturnType<typeof mountRealGate>>['gate'],
): Promise<void> {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  try {
    await wrapper.get('[data-session-gate-clear]').trigger('click')
    // A few real macrotasks between each fake second, so fake-indexeddb has delivered
    // `versionchange` and `blocked` well before the bound is crossed.
    for (let step = 0; step < 20 && gate.clearError.value === null; step++) {
      for (let task = 0; task < 5; task++) await new Promise(resolve => setImmediate(resolve))
      await vi.advanceTimersByTimeAsync(1000)
    }
    if (gate.clearError.value === null) throw new Error('the run did not settle within twenty bounded seconds')
  } finally {
    vi.useRealTimers()
  }
  await wrapper.vm.$nextTick()
}

/**
 * Replace one method of a storage object while `fn` runs, restored in `finally`.
 *
 * Installed on the instance. Not `vi.spyOn` with a later restore: that restore does not take
 * on happy-dom's storage objects, and a stub that survives into the next test silently
 * changes what that test means.
 */
export async function withStorageMethodReplaced<T>(
  storage: Storage,
  method: 'removeItem' | 'setItem',
  replacement: (...args: never[]) => unknown,
  fn: () => Promise<T>,
): Promise<T> {
  // Restored by redefining, not by deleting: happy-dom's storage is a proxy whose
  // `deleteProperty` trap refuses method names, so the instance keeps an own property that
  // holds the original method. Calls behave exactly as before the replacement.
  const original = Object.getOwnPropertyDescriptor(storage, method)
    ?? { value: storage[method], configurable: true, writable: true }
  Object.defineProperty(storage, method, { value: replacement, configurable: true, writable: true })
  try {
    return await fn()
  } finally {
    Object.defineProperty(storage, method, original)
  }
}

/** Fault F1: `localStorage.removeItem` throws while `fn` runs. */
export function withSweepFailing<T>(fn: () => Promise<T>): Promise<T> {
  return withStorageMethodReplaced(localStorage, 'removeItem', () => {
    throw new DOMException('injected: removeItem refused', 'SecurityError')
  }, fn)
}

/**
 * Replace `indexedDB.deleteDatabase` on the current factory while `fn` runs, restored in `finally`.
 *
 * The replacement returns a real `IDBRequest` (fake-indexeddb's, installed as the global), so
 * the platform's delete wraps it exactly as it wraps a browser's request; only what the request
 * then fires differs.
 */
async function withDeleteReplaced<T>(make: () => IDBRequest, fn: () => Promise<T>): Promise<T> {
  const factory = indexedDB
  const original = Object.getOwnPropertyDescriptor(factory, 'deleteDatabase')
  Object.defineProperty(factory, 'deleteDatabase', { value: make, configurable: true, writable: true })
  try {
    return await fn()
  } finally {
    // fake-indexeddb defines the method on the prototype, so the replacement is the
    // instance's only own property of that name and deleting it restores the original.
    if (original) Object.defineProperty(factory, 'deleteDatabase', original)
    else delete (factory as unknown as Record<string, unknown>).deleteDatabase
  }
}

/**
 * Fault F3: a delete that never settles and fires no `blocked`.
 *
 * What a delete queued behind another one looks like from here: nothing happens until the
 * platform's own time bound rejects it.
 */
export function withDeleteNeverSettling<T>(fn: () => Promise<T>): Promise<T> {
  return withDeleteReplaced(() => new IDBRequest(), fn)
}

/** Fault F5: a delete rejected for a reason that is neither blocking nor time. */
export function withDeleteFailing<T>(fn: () => Promise<T>): Promise<T> {
  return withDeleteReplaced(() => {
    const request = new IDBRequest() as IDBRequest & { readyState: IDBRequestReadyState, error: DOMException | null }
    setTimeout(() => {
      request.readyState = 'done'
      request.error = new DOMException('injected: delete failed', 'UnknownError')
      // fake-indexeddb's event target dispatches only its own events, and the one it exports
      // is the version-change event; its type is what listeners match on, and the reason
      // travels on `request.error`, where the platform reads it.
      request.dispatchEvent(new IDBVersionChangeEvent('error'))
    }, 0)
    return request
  }, fn)
}

/** Open the platform's database with the browser's own `indexedDB.open`, at whatever version it has. */
function openNative(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Fault F2: a native connection to the platform's database that does not yield.
 *
 * Opened with the browser's own `indexedDB.open`; it records `versionchange` events but never
 * closes on them — unlike the platform's own connections, which close when asked — so a
 * delete issued while it is open stays pending until the test closes it. If the database
 * does not exist yet, opening it creates an empty one at version 1.
 *
 * `deleteRequested()` is true only for a `versionchange` that asks to delete the database
 * (`newVersion === null`), not for an upgrade. `close()` may be called more than once; call
 * it in `finally` so a failed assertion never leaves the delete pending.
 */
export async function holdDatabase(): Promise<{ close(): void, deleteRequested(): boolean }> {
  let deleteRequested = false
  const db = await openNative()
  db.addEventListener('versionchange', (event) => {
    if ((event as IDBVersionChangeEvent).newVersion === null) deleteRequested = true
  })
  let closed = false
  return {
    close: () => { if (!closed) { closed = true; db.close() } },
    deleteRequested: () => deleteRequested,
  }
}

/**
 * Put rows into the platform's database before the gate is mounted.
 *
 * The platform's own open runs first, so the schema is exactly the one the site creates
 * and this helper never has to restate it; the rows then go in over a native connection,
 * closed before this returns. A connection left open would make the clear under test wait
 * on the test instead of on the fault the test installed.
 */
export async function seedDatabase(rows: ReadonlyArray<{ store: string, value: unknown }>): Promise<void> {
  const { useChallengePersistence } = await import('../../.vitepress/theme/composables/useChallengePersistence')
  // Called for its open, not its answer: it is the platform's way in, so it creates the
  // schema at the platform's version, upgrades included.
  await useChallengePersistence().hasAnyStoredData()
  const db = await openNative()
  try {
    if (rows.length === 0) return
    const tx = db.transaction([...new Set(rows.map(row => row.store))], 'readwrite')
    for (const row of rows) tx.objectStore(row.store).put(row.value)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

/**
 * The object stores the platform's database has when it is reopened, closed at once.
 *
 * One of the reads `traceability.md` allows for preconditions, and only while no F2 handle
 * is held. Reopening a database that is gone creates an empty one with no stores, which is
 * what a deleted database reads as: call it last, after `indexedDB.databases()` has been
 * checked.
 */
export async function storeNamesOnReopen(): Promise<string[]> {
  const db = await openNative()
  try {
    return [...db.objectStoreNames]
  } finally {
    db.close()
  }
}

/**
 * Every row of one object store, read over a native connection that is closed at once.
 *
 * Same allowance and same caveat as `storeNamesOnReopen`; a store the database does not have
 * reads as no rows.
 */
export async function rowsOnReopen(store: string): Promise<unknown[]> {
  const db = await openNative()
  try {
    if (!db.objectStoreNames.contains(store)) return []
    const request = db.transaction(store, 'readonly').objectStore(store).getAll()
    return await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

/** Copy invariant CI-1 of spec 0001: terms a changed gate sentence must not contain. */
const BANNED_TERMS: Record<Locale, readonly string[]> = {
  'en': ['work', 'learner', 'your', 'saved'],
  'zh-TW': ['作品', '解題紀錄', '紀錄', '你的', '已存'],
}

/**
 * The banned terms `text` contains.
 *
 * English: any word that begins with the term, in any case, so inflections such as
 * "learners", "yours" and "works" count while "framework" and "network" do not. Traditional
 * Chinese: any occurrence of the term.
 */
export function bannedTermsIn(text: string, locale: Locale): string[] {
  return BANNED_TERMS[locale].filter(term => locale === 'en'
    ? new RegExp(`\\b${term}`, 'i').test(text)
    : text.includes(term))
}

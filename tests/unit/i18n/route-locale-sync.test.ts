import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, watch, nextTick } from 'vue'
import {
  detectLocaleFromPath,
  persistLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
} from '../../../.vitepress/theme/i18n'

// ─── Pure-function detection rule ────────────────────────────────────────────
//
// These cover Requirement: Route-prefix change syncs vue-i18n locale and
// persists to localStorage — Scenario "Exact `/zh-TW` pathname is treated
// as zh-TW" and Scenario "Pathological prefix `/zh-TWfoo` is treated as en".

describe('detectLocaleFromPath', () => {
  const cases: [string, Locale][] = [
    ['/', 'en'],
    ['/guide/', 'en'],
    ['/zh-TW', 'zh-TW'],
    ['/zh-TW/', 'zh-TW'],
    ['/zh-TW/guide/', 'zh-TW'],
    // Pathological: `/zh-TWfoo` shares the literal prefix `zh-TW` but lacks
    // the trailing separator. The rule MUST NOT misclassify this as zh-TW.
    ['/zh-TWfoo', 'en'],
    // Defensive edges. `useRoute().path` from VitePress excludes query and
    // hash, so these should never actually reach the watcher in production,
    // but the pure function is still expected to handle them deterministically.
    // Both lack a `/` after `zh-TW`, so the prefix rule rejects them → 'en'.
    ['/zh-TW?foo=bar', 'en'],
    ['/zh-TW#section', 'en'],
    // Empty string — defensive only; never produced by VitePress.
    ['', 'en'],
  ]

  it.each(cases)('path %s → locale %s', (path, expected) => {
    expect(detectLocaleFromPath(path)).toBe(expected)
  })
})

// ─── Route watcher integration ──────────────────────────────────────────────
//
// These cover the dynamic scenarios on the same Requirement: SPA navigation
// updates locale, idempotent sync, browser back. We simulate Layout's watcher
// by setting up the same `watch(() => route.path, ...)` topology over a
// ref<string> and a stub `locale.value`, then mutating the ref to trigger
// the callback. This isolates the watcher's behaviour from VitePress mounting.

function makeWatcher() {
  const routePath = ref('/')
  const localeValue = ref<Locale>('en')
  const persistSpy = vi.fn((l: Locale) => persistLocale(l))

  const stop = watch(routePath, (newPath) => {
    const target = detectLocaleFromPath(newPath)
    if (localeValue.value === target) return
    localeValue.value = target
    persistSpy(target)
  })

  return { routePath, localeValue, persistSpy, stop }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('Layout route watcher behaviour', () => {
  it('SPA navigation from / to /zh-TW/guide/ updates locale and persists', async () => {
    const { routePath, localeValue, persistSpy } = makeWatcher()
    expect(localeValue.value).toBe('en')

    routePath.value = '/zh-TW/guide/'
    await nextTick()

    expect(localeValue.value).toBe('zh-TW')
    expect(persistSpy).toHaveBeenCalledTimes(1)
    expect(persistSpy).toHaveBeenCalledWith('zh-TW')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW')
  })

  it('navigation within the same locale tree is idempotent (no second persist)', async () => {
    const { routePath, localeValue, persistSpy } = makeWatcher()

    routePath.value = '/zh-TW/'
    await nextTick()
    expect(persistSpy).toHaveBeenCalledTimes(1)
    expect(localeValue.value).toBe('zh-TW')

    // Navigate to another zh-TW page — locale already matches, MUST NOT
    // call persistLocale again.
    routePath.value = '/zh-TW/guide/'
    await nextTick()
    expect(persistSpy).toHaveBeenCalledTimes(1)
    expect(localeValue.value).toBe('zh-TW')
  })

  it('browser back from /zh-TW/guide/ to / updates locale to en', async () => {
    const { routePath, localeValue, persistSpy } = makeWatcher()

    routePath.value = '/zh-TW/guide/'
    await nextTick()
    expect(localeValue.value).toBe('zh-TW')

    // Simulate browser back — same watcher path, just navigating "backwards"
    routePath.value = '/'
    await nextTick()

    expect(localeValue.value).toBe('en')
    expect(persistSpy).toHaveBeenCalledTimes(2)
    expect(persistSpy).toHaveBeenLastCalledWith('en')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
  })

  it('pathological path /zh-TWfoo does NOT switch locale to zh-TW', async () => {
    const { routePath, localeValue, persistSpy } = makeWatcher()

    routePath.value = '/zh-TWfoo'
    await nextTick()

    // Already 'en' and the rule resolves to 'en' → idempotent guard fires
    expect(localeValue.value).toBe('en')
    expect(persistSpy).not.toHaveBeenCalled()
  })

  it('exact /zh-TW pathname (no trailing slash) is treated as zh-TW', async () => {
    const { routePath, localeValue, persistSpy } = makeWatcher()

    routePath.value = '/zh-TW'
    await nextTick()

    expect(localeValue.value).toBe('zh-TW')
    expect(persistSpy).toHaveBeenCalledTimes(1)
    expect(persistSpy).toHaveBeenCalledWith('zh-TW')
  })

  it('calling stop() unsubscribes the watcher (no further side effects)', async () => {
    const { routePath, localeValue, persistSpy, stop } = makeWatcher()

    // Baseline navigation: watcher fires once and updates.
    routePath.value = '/zh-TW/'
    await nextTick()
    expect(persistSpy).toHaveBeenCalledTimes(1)
    expect(localeValue.value).toBe('zh-TW')

    // Stop the watcher (simulates Layout's onUnmounted calling stopRouteWatch).
    stop()

    // After stop(), further route-path mutations MUST NOT fire the callback.
    routePath.value = '/'
    await nextTick()
    expect(persistSpy).toHaveBeenCalledTimes(1) // unchanged from before
    expect(localeValue.value).toBe('zh-TW') // unchanged from before — the
    // watcher would have set it to 'en' if it were still active.
  })
})

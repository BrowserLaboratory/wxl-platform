import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive, h, defineComponent, nextTick } from 'vue'

/**
 * Spec 0008, seam S1 wired into the REAL Layout: a not-found arrival whose counterpart is a
 * published page is replaced by it, after the session gate's decision, and the page it lands
 * on shows the missing-translation line. The page list and what the router rendered are
 * doubles; the decisions themselves are the real ones (tests/unit/i18n/arrival.test.ts).
 */
const mockRoute = reactive({ path: '/' })
const mockGo = vi.fn()
const mockFrontmatter = ref<Record<string, unknown>>({})
const mockPage = ref({ isNotFound: false, relativePath: 'index.md' })
vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: mockFrontmatter, page: mockPage, site: { value: { base: '/' } } }),
  useRoute: () => mockRoute,
  useRouter: () => ({ go: mockGo }),
  withBase: (p: string) => p,
}))
// Renders each named slot the Layout fills into a marked element, so a test can see which
// slot carries the line.
vi.mock('vitepress/theme', () => ({
  default: {
    Layout: defineComponent({
      setup: (_, { slots }) => () =>
        h('div', ['nav-bar-content-before', 'doc-before', 'page-top', 'home-hero-before'].map((name) => h('div', { 'data-slot': name }, slots[name]?.()))),
    }),
  },
}))
// The challenge layout places the line itself (L3); this stub only shows what it was given.
vi.mock('../../../.vitepress/theme/layouts/ChallengeLayout.vue', async () => {
  const { inject } = await import('vue')
  const { MISSING_TRANSLATION_LOCALE } = await import('../../../.vitepress/theme/i18n/missingTranslation')
  return {
    default: defineComponent({
      setup: () => {
        const line = inject(MISSING_TRANSLATION_LOCALE, null)
        return () => h('div', { 'data-challenge-layout': '', 'data-line': line?.value ?? 'none' })
      },
    }),
  }
})
vi.mock('../../../.vitepress/theme/components/LocaleSwitcher.vue', () => ({
  default: defineComponent({ setup: () => () => h('div', { 'data-locale-switcher-stub': '' }) }),
}))
vi.mock('../../../.vitepress/theme/i18n/publishedPages', () => ({
  publishedPages: () => ['/', '/challenge/v05-php-check/', '/challenges', '/guide/python', '/reference/attack-log-export-format', '/zh-TW/', '/zh-TW/challenges', '/zh-TW/guide/python'],
}))

// ─── The shared-machine session gate ─────────────────────────────────────────
//
// The redirect the Layout performs reads the stored locale, which is one of the values
// the gate may be about to delete. These doubles let each test say what the gate found
// and what the learner answered.
const gateShouldAsk = ref(false)
// An unconfirmed clear presents the recovery on every page, so it is the one state in
// which a page that would not otherwise ask still holds the redirect.
const gateClearStarted = ref(false)
const gateDecision = ref<'undecided' | 'not-needed' | 'kept' | 'dismissed' | 'cleared'>('not-needed')
const mockGateEvaluate = vi.fn(async () => {})
let markerPresent = true
vi.mock('../../../.vitepress/theme/composables/useSessionGate', () => ({
  hasGateDecision: () => markerPresent,
  // The real rule lives in `useSessionGate` and is tested there. This double has the same
  // shape so the Layout's own question — "does this page present the choice" — is asked
  // and answered the way it will be at runtime.
  shouldPresentGateHere: (isChallengePage: boolean) =>
    gateShouldAsk.value && (isChallengePage || gateClearStarted.value),
  useSessionGate: () => ({
    shouldAsk: gateShouldAsk,
    clearError: ref(null),
    clearStarted: gateClearStarted,
    decision: gateDecision,
    evaluate: mockGateEvaluate,
    keepExistingData: vi.fn(),
    clearEverything: vi.fn(),
  }),
}))
vi.mock('../../../.vitepress/theme/components/SessionGate.vue', () => ({
  default: defineComponent({
    // Rendered into an attribute so a test can read what the Layout passed. The component
    // does not work the page kind out for itself: it is told, from the same frontmatter
    // value that decides which layout renders.
    props: { isChallengePage: { type: Boolean, default: false } },
    setup: (props) => () => h('div', {
      'data-session-gate-stub': '',
      'data-challenge-page': String(props.isChallengePage),
    }),
  }),
}))

import Theme from '../../../.vitepress/theme/index'
import { i18n, LOCALE_STORAGE_KEY } from '../../../.vitepress/theme/i18n'

function arrive(path: string, page: { isNotFound: boolean; relativePath: string }) {
  window.history.pushState({}, '', path)
  mockPage.value = page
  mockRoute.path = path
}

beforeEach(() => {
  window.localStorage.clear()
  markerPresent = true
  gateShouldAsk.value = false
  gateClearStarted.value = false
  gateDecision.value = 'not-needed'
  mockGateEvaluate.mockClear()
  mockGo.mockReset()
  mockFrontmatter.value = {}
  arrive('/', { isNotFound: false, relativePath: 'index.md' })
  i18n.global.locale.value = 'en'
})
const mounted: { unmount: () => void }[] = []
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount()
  document.body.className = ''
})
function mountLayout() {
  const wrapper = mount(Theme.Layout!, { global: { plugins: [i18n] } })
  mounted.push(wrapper)
  return wrapper
}
const NOT_FOUND = { isNotFound: true, relativePath: '404.md' }
const REFERENCE = { isNotFound: false, relativePath: 'reference/attack-log-export-format.md' }

describe('the real Layout: a not-found arrival', () => {
  it('replaces a missing translation with the page that exists, once', async () => {
    arrive('/zh-TW/reference/attack-log-export-format', NOT_FOUND)
    mountLayout()
    await flushPromises()
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(mockGo).toHaveBeenCalledWith('/reference/attack-log-export-format', { replace: true })
  })
})

describe('the real Layout: around the not-found redirect', () => {
  it('waits for the gate on a page that puts the choice on screen, then redirects', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateClearStarted.value = true
    gateDecision.value = 'undecided'
    arrive('/zh-TW/reference/attack-log-export-format', NOT_FOUND)
    mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    gateDecision.value = 'kept'
    await flushPromises()
    expect(mockGo).toHaveBeenCalledWith('/reference/attack-log-export-format', { replace: true })
  })

  it('does nothing on a failed load: the not-found page for a path that is a page', async () => {
    arrive('/guide/python', NOT_FOUND)
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
  })

  it('shows the line in the locale the path named on the page it lands on, in the doc layout slot', async () => {
    arrive('/zh-TW/reference/attack-log-export-format', NOT_FOUND)
    const layout = mountLayout()
    await flushPromises()
    arrive('/reference/attack-log-export-format', REFERENCE)
    await flushPromises()
    const line = layout.get('[data-slot="doc-before"] [data-missing-translation]')
    expect(line.attributes('lang')).toBe('zh-TW')
    expect(layout.get('[data-slot="page-top"] [data-missing-translation]').attributes('lang')).toBe('zh-TW')
    expect(layout.get('[data-slot="home-hero-before"] [data-missing-translation]').attributes('lang')).toBe('zh-TW')
  })

  it('writes no preference on the way through, whatever was stored', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    i18n.global.locale.value = 'zh-TW'
    arrive('/zh-TW/reference/attack-log-export-format', NOT_FOUND)
    mountLayout()
    await flushPromises()
    arrive('/reference/attack-log-export-format', REFERENCE)
    await flushPromises()
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW')
    expect(i18n.global.locale.value).toBe('en')
  })

  it('does the same for a client-side navigation to a missing translation', async () => {
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    mountLayout()
    await flushPromises()
    mockGo.mockReset()
    arrive('/zh-TW/reference/attack-log-export-format', NOT_FOUND)
    await flushPromises()
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(mockGo).toHaveBeenCalledWith('/reference/attack-log-export-format', { replace: true })
  })

  it('shows the not-found page, with no line, for a path with no counterpart', async () => {
    arrive('/zh-TW/no-such-page', NOT_FOUND)
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
  })

  it('discards the carried locale once the landing has used it', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    arrive('/zh-TW/reference/attack-log-export-format', NOT_FOUND)
    const layout = mountLayout()
    await flushPromises()
    arrive('/reference/attack-log-export-format', REFERENCE)
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(true)
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    await flushPromises()
    arrive('/reference/attack-log-export-format', REFERENCE)
    await flushPromises()
    // Stored `en` now decides: the page is in English, so there is nothing to say.
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
  })
})

describe('the real Layout: the line after a redirect', () => {
  it('a client-side navigation to a missing translation lands with the line, and writes nothing', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    const layout = mountLayout()
    await flushPromises()
    arrive('/zh-TW/reference/attack-log-export-format', NOT_FOUND)
    await flushPromises()
    arrive('/reference/attack-log-export-format', REFERENCE)
    await flushPromises()
    expect(layout.get('[data-slot="doc-before"] [data-missing-translation]').attributes('lang')).toBe('zh-TW')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
  })

  it('on a challenge page whose gate is asking, the line waits for the answer', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    arrive('/zh-TW/challenge/v05-php-check/', NOT_FOUND)
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).toHaveBeenCalledWith('/challenge/v05-php-check/', { replace: true })
    mockFrontmatter.value = { layout: 'challenge' }
    arrive('/challenge/v05-php-check/', { isNotFound: false, relativePath: 'challenge/v05-php-check/index.md' })
    await flushPromises()
    expect(layout.get('[data-challenge-layout]').attributes('data-line')).toBe('none')
    gateDecision.value = 'kept'
    await flushPromises()
    expect(layout.get('[data-challenge-layout]').attributes('data-line')).toBe('zh-TW')
  })

  it('shows no line on a page it is about to redirect away from', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    arrive('/reference/attack-log-export-format', REFERENCE)
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/reference/attack-log-export-format', { replace: true })
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
  })
})

describe('the real Layout: one locale menu (D7)', () => {
  it('puts the custom locale switcher in the default-theme nav bar', async () => {
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    const layout = mountLayout()
    await flushPromises()
    expect(layout.find('[data-slot="nav-bar-content-before"] [data-locale-switcher-stub]').exists()).toBe(true)
  })
})

describe('the real Layout: a not-found page while a challenge page is still asking', () => {
  it('replaces a missing translation reached by a link, since the not-found page does not ask', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    mockFrontmatter.value = { layout: 'challenge' }
    arrive('/challenge/v05-php-check/', { isNotFound: false, relativePath: 'challenge/v05-php-check/index.md' })
    mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    mockFrontmatter.value = {}
    arrive('/zh-TW/reference/attack-log-export-format', NOT_FOUND)
    await flushPromises()
    expect(mockGo).toHaveBeenCalledWith('/reference/attack-log-export-format', { replace: true })
  })
})

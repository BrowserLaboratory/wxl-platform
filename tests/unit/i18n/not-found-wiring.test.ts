import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive, h, defineComponent, nextTick } from 'vue'
import { SW, BASES, DT_NOT_FOUND } from '../../__helpers__/localeTables'

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
const mockBase = ref('/')
vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: mockFrontmatter, page: mockPage, site: { get value() { return { base: mockBase.value } } } }),
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
// The switcher stub hands the test the `choose` the Layout provides, so a test can make the
// choice a learner makes in the menu (spec 0008, B1–B7).
const switcher = vi.hoisted(() => ({ choose: null as null | ((locale: 'en' | 'zh-TW') => import('../../../.vitepress/theme/i18n/missingTranslation').ChoiceOutcome) }))
vi.mock('../../../.vitepress/theme/components/LocaleSwitcher.vue', async () => {
  const { inject } = await import('vue')
  const { LOCALE_CHOICE } = await import('../../../.vitepress/theme/i18n/missingTranslation')
  return {
    default: defineComponent({
      setup: () => {
        switcher.choose = inject(LOCALE_CHOICE, null)
        return () => h('div', { 'data-locale-switcher-stub': '' })
      },
    }),
  }
})
vi.mock('../../../.vitepress/theme/i18n/publishedPages', () => ({
  // P-dependent (B3-2): a build with a given primary locale publishes only that build's own
  // tree plus the OTHER locale's prefixed one — under P = en there is no /en/... tree (there is
  // nothing to redirect an English learner into), and under P = zh-TW there is no /zh-TW/... tree.
  publishedPages: () =>
    mockPrimaryLocale.value === 'zh-TW'
      ? [
        '/', '/challenge/v05-php-check/', '/challenges', '/guide/python', '/reference/attack-log-export-format',
        '/en/', '/en/challenges', '/en/guide/python', '/en/only-in-english', '/en/challenge/orphan-brief/',
      ]
      : [
        '/', '/challenge/v05-php-check/', '/challenges', '/guide/english-only', '/guide/python', '/reference/attack-log-export-format',
        '/zh-TW/', '/zh-TW/challenges', '/zh-TW/guide/python', '/zh-TW/guide/zh-only', '/zh-TW/challenge/orphan-brief/',
      ],
}))

// `P` (D31): defaults to 'en', today's build, so every existing case below (which treats the
// unprefixed tree as primary and `/zh-TW/` as the translation) keeps its meaning unchanged (T1).
// Cases that gain `P = zh-TW` expectations set this explicitly.
const mockPrimaryLocale = vi.hoisted(() => ({ value: 'en' as 'en' | 'zh-TW' }))
vi.mock('../../../.vitepress/theme/i18n/primaryLocale', () => ({ primaryLocale: () => mockPrimaryLocale.value }))

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
import { i18n, LOCALE_STORAGE_KEY, readStoredLocale, _resetRememberedChoiceForTests } from '../../../.vitepress/theme/i18n'

function arrive(path: string, page: { isNotFound: boolean; relativePath: string }) {
  window.history.pushState({}, '', path)
  mockPage.value = page
  mockRoute.path = path
}

beforeEach(() => {
  window.localStorage.clear()
  _resetRememberedChoiceForTests()
  switcher.choose = null
  markerPresent = true
  gateShouldAsk.value = false
  gateClearStarted.value = false
  gateDecision.value = 'not-needed'
  mockGateEvaluate.mockClear()
  mockGo.mockReset()
  mockFrontmatter.value = {}
  mockBase.value = '/'
  arrive('/', { isNotFound: false, relativePath: 'index.md' })
  i18n.global.locale.value = 'en'
  mockPrimaryLocale.value = 'en'
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

  // S1-1 (A14), under P = zh-TW (T = en): the mirrored page and fixture, same property.
  it('under P = zh-TW, replaces a missing translation with the page that exists, once', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    arrive('/en/reference/attack-log-export-format', NOT_FOUND)
    mountLayout()
    await flushPromises()
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(mockGo).toHaveBeenCalledWith('/reference/attack-log-export-format', { replace: true })
  })

  // A19/D29: an NP not-found redirect (an old `/<P>/X` URL, R22) always lands requesting `P`,
  // never `T`, whatever is stored — and that landing is a later arrival, not the original cold
  // load, so it never triggers a SECOND, ordinary cold-load redirect to the stored T preference
  // on top of the not-found one. B3-3: the landing is `/guide/python`, not
  // `/challenge/v05-php-check/` — its `/zh-TW/guide/python` counterpart IS published (unlike the
  // challenge page's), so a wrongful cold-load treatment of this later arrival WOULD call `go()`
  // with `stored = 'zh-TW'` (DT05): the case is non-vacuous, not just an assertion that never had
  // anything to redirect.
  it('a stored T preference does not cause a second cold-load redirect after an NP landing (A19, D29)', async () => {
    // `/en/guide/python` is a crafted R22-style `/<P>/X` URL, the genuine NP shape (D28): a
    // not-found arrival whose primary-code strip finds the real entry. Neither
    // `/en/guide/python` nor `/en/challenge/v05-php-check/` is itself a published page — both
    // are crafted NP URLs — but they differ in their OWN counterpart's publication: the landing
    // below, `/guide/python`, has a published `/zh-TW/guide/python` counterpart, while
    // `/challenge/v05-php-check/`'s zh-TW counterpart does not exist, which is why the landing
    // below must be `/guide/python`, not the challenge page (B3-3).
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    arrive('/en/guide/python', NOT_FOUND)
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(mockGo).toHaveBeenCalledWith('/guide/python', { replace: true })
    mockGo.mockReset()
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW')
  })

  // B4-4, under P = zh-TW (T = en): the same property, mirrored. `/zh-TW/guide/python` is the
  // crafted NP URL (`zh-TW` is P's own code here); its counterpart `/en/guide/python` IS
  // published (per the P-dependent `publishedPages` mock), so the landing below must be
  // `/guide/python`, the real entry, not a page with no counterpart.
  it('under P = zh-TW, a stored T preference does not cause a second cold-load redirect after an NP landing (A19, D29)', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    arrive('/zh-TW/guide/python', NOT_FOUND)
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(mockGo).toHaveBeenCalledWith('/guide/python', { replace: true })
    mockGo.mockReset()
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
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

  // S1-A19a, under P = zh-TW (T = en): the same property, mirrored for the translation tree.
  it('under P = zh-TW, does nothing on a failed load: the not-found page for a path that is a page', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    arrive('/en/guide/python', NOT_FOUND)
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
    // B3-4: a spy spanning both the redirect and the navigation after it (S2-b's pattern),
    // so "writes no preference" is checked as a write (never called), not only through the
    // final read.
    const setSpy = vi.spyOn(window.localStorage, 'setItem')
    try {
      mountLayout()
      await flushPromises()
      expect(setSpy).not.toHaveBeenCalled()
      arrive('/reference/attack-log-export-format', REFERENCE)
      await flushPromises()
      expect(setSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW')
      expect(i18n.global.locale.value).toBe('en')
    } finally {
      setSpy.mockRestore()
    }
  })

  // S1-A19b, under P = zh-TW (T = en): the same property, entries re-spelled for the /en/ tree.
  it('under P = zh-TW, writes no preference on the way through, whatever was stored', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    i18n.global.locale.value = 'en'
    arrive('/en/reference/attack-log-export-format', NOT_FOUND)
    // B3-4: same spy as the P = en case above.
    const setSpy = vi.spyOn(window.localStorage, 'setItem')
    try {
      mountLayout()
      await flushPromises()
      expect(setSpy).not.toHaveBeenCalled()
      arrive('/reference/attack-log-export-format', REFERENCE)
      await flushPromises()
      expect(setSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
      expect(i18n.global.locale.value).toBe('zh-TW')
    } finally {
      setSpy.mockRestore()
    }
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

  // S1-A20, under P = zh-TW (T = en): the same property, entries re-spelled for the /en/ tree.
  // B3-6: no `mockGo.mockReset()` between the two arrivals (S2-l's pattern) — the assertions
  // below cover the FULL call list from mount to the end, so a stray extra redirect cannot be
  // erased by the reset before the discriminating assertion runs. B4-7a: hardcoding ONLY
  // `useArrivals.ts`'s `primaryLocale()` call site to `'en'` no longer discriminates, now that
  // `publishedPages` is P-dependent (B3's own item 2) — the wrongly-computed target
  // `/zh-TW/guide/python` is correctly absent from the real P = en-shaped page list either way.
  // The example that DOES: hardcoding BOTH that call site to `'en'` AND `pages` to the P =
  // en-shaped list turns this case red — `go('/zh-TW/guide/python', { replace: true })` fires on
  // mount already, failing the FIRST assertion below (`not.toHaveBeenCalled()`), not only the
  // later one the full-call-list check was written for.
  it('under P = zh-TW, does the same for a client-side navigation to a missing translation', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    arrive('/en/reference/attack-log-export-format', NOT_FOUND)
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

  // A11, D25: with no stored preference, a later navigation (not a cold load) asks for the
  // page's own locale, not for `P` regardless of the page — a translation-only page must not
  // show a line just because it is not `P`'s own.
  it('shows no line on a later navigation to a translation-only page with no stored preference (A11, D25)', async () => {
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    const layout = mountLayout()
    await flushPromises()
    arrive('/zh-TW/guide/zh-only', { isNotFound: false, relativePath: 'zh-TW/guide/zh-only.md' })
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    expect(mockGo).not.toHaveBeenCalled()
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

  // S1-1, under P = zh-TW (T = en): the mirrored cases for the four properties above whose
  // assertion names a locale literal.
  it('under P = zh-TW, waits for the gate on a page that puts the choice on screen, then redirects', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    markerPresent = false
    gateShouldAsk.value = true
    gateClearStarted.value = true
    gateDecision.value = 'undecided'
    arrive('/en/reference/attack-log-export-format', NOT_FOUND)
    mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    gateDecision.value = 'kept'
    await flushPromises()
    expect(mockGo).toHaveBeenCalledWith('/reference/attack-log-export-format', { replace: true })
  })

  it('under P = zh-TW, shows the line in the locale the path named on the page it lands on, in the doc layout slot', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    arrive('/en/reference/attack-log-export-format', NOT_FOUND)
    const layout = mountLayout()
    await flushPromises()
    arrive('/reference/attack-log-export-format', REFERENCE)
    await flushPromises()
    const line = layout.get('[data-slot="doc-before"] [data-missing-translation]')
    expect(line.attributes('lang')).toBe('en')
    expect(layout.get('[data-slot="page-top"] [data-missing-translation]').attributes('lang')).toBe('en')
    expect(layout.get('[data-slot="home-hero-before"] [data-missing-translation]').attributes('lang')).toBe('en')
  })

  it('under P = zh-TW, shows the not-found page, with no line, for a path with no counterpart', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    arrive('/en/no-such-page', { isNotFound: true, relativePath: 'en/no-such-page.md' })
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
  })

  // A11, D25, under P = zh-TW (T = en).
  it('under P = zh-TW, shows no line on a later navigation to a translation-only page with no stored preference (A11, D25)', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    const layout = mountLayout()
    await flushPromises()
    arrive('/en/guide/zh-only', { isNotFound: false, relativePath: 'en/guide/zh-only.md' })
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    expect(mockGo).not.toHaveBeenCalled()
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

  // Before T-0054 the cold-load redirect took this page to its missing `/zh-TW/` version and
  // the not-found redirect brought it back; now it stays (spec 0008, A3).
  it('stays on an English-only article with the line in zh-TW, instead of redirecting away', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    arrive('/reference/attack-log-export-format', REFERENCE)
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(layout.get('[data-slot="doc-before"] [data-missing-translation]').attributes('lang')).toBe('zh-TW')
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

  // S1-1, under P = zh-TW (T = en): the mirrored page and fixture, same property.
  it('under P = zh-TW, replaces a missing translation reached by a link, since the not-found page does not ask', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    mockFrontmatter.value = { layout: 'challenge' }
    arrive('/challenge/v05-php-check/', { isNotFound: false, relativePath: 'challenge/v05-php-check/index.md' })
    mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    mockFrontmatter.value = {}
    arrive('/en/reference/attack-log-export-format', NOT_FOUND)
    await flushPromises()
    expect(mockGo).toHaveBeenCalledWith('/reference/attack-log-export-format', { replace: true })
  })
})

// Spec 0008, decision table A1–A7 wired into the real Layout: a cold load of an unprefixed page
// is sent to its Traditional Chinese version only when that version is published, and otherwise
// stays with the line, after the gate's decision.
describe('the real Layout: a cold load of an unprefixed page', () => {
  const CHALLENGE = { isNotFound: false, relativePath: 'challenge/v05-php-check/index.md' }

  // Stage 6 (Spec F9): the redirect and the line of one cold load are decided from one reading
  // of the stored value, the one current when the gate lets the page go.
  it('decides the redirect and the line from the same stored value when it changes while the gate asks', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    mockFrontmatter.value = { layout: 'challenge' }
    arrive('/challenge/v05-php-check/', CHALLENGE)
    const layout = mountLayout()
    await flushPromises()
    // Another tab stores English while this one is still asking.
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    gateDecision.value = 'kept'
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(layout.get('[data-challenge-layout]').attributes('data-line')).toBe('none') // A4
  })

  // Stage 6 (Spec F10): the cold-load redirect is the cold load's. A page the learner reached
  // by a link while the gate was asking is a later navigation (L5), and is not redirected.
  // Stage 7 (S-3): coming back to the cold load's path is a later arrival too.
  it('does not apply the cold-load redirect after the learner left the page and came back', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    mockFrontmatter.value = { layout: 'challenge' }
    arrive('/challenges', { isNotFound: false, relativePath: 'challenges.md' })
    mountLayout()
    await flushPromises()
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    await flushPromises()
    arrive('/challenges', { isNotFound: false, relativePath: 'challenges.md' })
    await flushPromises()
    gateDecision.value = 'kept'
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
  })

  // Stage 7 (S-2): a link the learner followed is already in the address bar while its page
  // still loads; the gate's answer then must not replace it with the cold load's redirect.
  it('does not redirect when a navigation the learner started is still loading', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    mockFrontmatter.value = { layout: 'challenge' }
    arrive('/challenges', { isNotFound: false, relativePath: 'challenges.md' })
    mountLayout()
    await flushPromises()
    window.history.pushState({}, '', '/guide/python') // the router has pushed; the page is not in yet
    gateDecision.value = 'kept'
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
  })

  it('does not apply the cold-load redirect to a page reached by a link while the gate asked', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    mockFrontmatter.value = { layout: 'challenge' }
    arrive('/challenge/v05-php-check/', CHALLENGE)
    mountLayout()
    await flushPromises()
    mockFrontmatter.value = {}
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    await flushPromises()
    gateDecision.value = 'kept'
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
  })

  it('stays on an English-only challenge, and shows the line once the learner continues (A2, A6)', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    mockFrontmatter.value = { layout: 'challenge' }
    arrive('/challenge/v05-php-check/', CHALLENGE)
    const layout = mountLayout()
    await flushPromises()
    expect(layout.get('[data-challenge-layout]').attributes('data-line')).toBe('none')
    gateDecision.value = 'kept'
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(layout.get('[data-challenge-layout]').attributes('data-line')).toBe('zh-TW')
  })

  // Flipped by D25 (wave 2) (A1, DT01/02): no preference now falls back to `P` ('en'), and an
  // English-only page is already there, so there is no longer a line to show. Was: 'stays on an
  // English-only page with no stored value, the line in the default zh-TW (A2)'.
  it('stays on an English-only page with no stored value, and shows no line (A1, DT02)', async () => {
    arrive('/challenge/v05-php-check/', CHALLENGE)
    mockFrontmatter.value = { layout: 'challenge' }
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(layout.get('[data-challenge-layout]').attributes('data-line')).toBe('none')
  })

  it('neither redirects nor shows the line for a learner who stored en (A4)', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    arrive('/reference/attack-log-export-format', REFERENCE)
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
  })

  // A8/wave 2: "no preference" no longer redirects (A1, DT01), so this now sets an explicit
  // stored preference to exercise the alias-resolution property (unaffected by the flip).
  it('sends an alias of a translated page to its counterpart entry, once, with replace (A8)', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    arrive('/Challenges.html?view=grid#top', { isNotFound: false, relativePath: 'challenges.md' })
    mountLayout()
    await flushPromises()
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/challenges?view=grid#top', { replace: true })
  })

  it('re-evaluates the line on later navigation with the stored locale (L5)', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    arrive('/reference/attack-log-export-format', REFERENCE)
    const layout = mountLayout()
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(true)
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    arrive('/guide/english-only', { isNotFound: false, relativePath: 'guide/english-only.md' })
    await flushPromises()
    expect(layout.get('[data-slot="doc-before"] [data-missing-translation]').attributes('lang')).toBe('zh-TW')
    expect(mockGo).not.toHaveBeenCalled()
  })

  // S1-4 (A11): the same property, both P and both page kinds (article, challenge) — a stored
  // T shows the line in T on a primary page lacking T, whichever page kind it is.
  it.each([
    ['en', 'article', '/guide/english-only', { isNotFound: false, relativePath: 'guide/english-only.md' }],
    ['en', 'challenge', '/challenge/v05-php-check/', { isNotFound: false, relativePath: 'challenge/v05-php-check/index.md' }],
    ['zh-TW', 'article', '/guide/only-in-chinese', { isNotFound: false, relativePath: 'guide/only-in-chinese.md' }],
    ['zh-TW', 'challenge', '/challenge/v05-php-check/', { isNotFound: false, relativePath: 'challenge/v05-php-check/index.md' }],
  ] as const)('under P = %s, re-evaluates the %s line on later navigation with the stored locale (A11, L5)', async (P, kind, orphanPath, orphanPage) => {
    mockPrimaryLocale.value = P
    const T = P === 'en' ? 'zh-TW' : 'en'
    window.localStorage.setItem(LOCALE_STORAGE_KEY, T)
    arrive('/reference/attack-log-export-format', REFERENCE)
    const layout = mountLayout()
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(true)
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    if (kind === 'challenge') mockFrontmatter.value = { layout: 'challenge' }
    arrive(orphanPath, orphanPage)
    await flushPromises()
    if (kind === 'article') {
      expect(layout.get('[data-slot="doc-before"] [data-missing-translation]').attributes('lang')).toBe(T)
    } else {
      expect(layout.get('[data-challenge-layout]').attributes('data-line')).toBe(T)
    }
    expect(mockGo).not.toHaveBeenCalled()
  })

  // A11, the reverse (AC-12): with the primary locale stored, a later navigation to a translation
  // page that has no primary version shows the line in `P`, and writes and redirects nothing.
  it.each([
    ['en', '/zh-TW/guide/zh-only', 'zh-TW/guide/zh-only.md'],
    ['zh-TW', '/en/only-in-english', 'en/only-in-english.md'],
  ] as const)('under P = %s, a stored P shows the line in P on a later navigation to a translation page without a P version (A11)', async (P, orphanPath, orphanSource) => {
    mockPrimaryLocale.value = P
    window.localStorage.setItem(LOCALE_STORAGE_KEY, P)
    arrive('/guide/python', { isNotFound: false, relativePath: 'guide/python.md' })
    const layout = mountLayout()
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    arrive(orphanPath, { isNotFound: false, relativePath: orphanSource })
    await flushPromises()
    expect(layout.get('[data-slot="doc-before"] [data-missing-translation]').attributes('lang')).toBe(P)
    expect(mockGo).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(P)
  })

  // L6 on an A1 landing: the landing is in the requested locale, so the carried value changes
  // nothing visible there. What can be seen is that the carry ends at the landing.
  // Flipped by D25 (wave 2): the first redirect here needs an explicit stored preference now
  // (A1/DT01, "no preference" no longer redirects); L6's own property (the carried value does
  // not survive to a later page) is unaffected.
  it('after an A1 redirect, a later page asks with the stored value, not the carried one (L6)', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    arrive('/challenges', { isNotFound: false, relativePath: 'challenges.md' })
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/challenges', { replace: true })
    // The learner then stores English elsewhere (another tab). The carry ends at the landing,
    // so the next page asks with the stored value and an English page shows no line.
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    arrive('/zh-TW/challenges', { isNotFound: false, relativePath: 'zh-TW/challenges.md' })
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    arrive('/reference/attack-log-export-format', REFERENCE)
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
  })

  it('writes no preference on a cold-load redirect or the navigation after it (W5)', async () => {
    // DT05: a stored `zh-TW` preference on a primary-locale page with a published
    // counterpart is a cold-load redirect — re-seeded so this test's own title (a redirect
    // actually happens) is true, not vacuous (DT01's flip left "no preference" with nothing
    // to redirect).
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    // S2-b: a spy spanning both the redirect itself and the navigation after it, so "writes no
    // preference" is checked as a write (never called), not only through the final read.
    const setSpy = vi.spyOn(window.localStorage, 'setItem')
    try {
      arrive('/challenges', { isNotFound: false, relativePath: 'challenges.md' })
      mountLayout()
      await flushPromises()
      expect(mockGo).toHaveBeenCalledWith('/zh-TW/challenges', { replace: true })
      expect(setSpy).not.toHaveBeenCalled()
      arrive('/zh-TW/challenges', { isNotFound: false, relativePath: 'zh-TW/challenges.md' })
      await flushPromises()
      expect(setSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW')
    } finally {
      setSpy.mockRestore()
    }
  })
})

// Spec 0008, AC-2: every row of the decision table, for every stored value it names and both
// bases — the redirect, the line and the write, as the row states. The expected results are the
// table's own, written out per row: what a learner with `en` stored gets, and what everyone else
// (none, `zh-TW`, an unknown value, unreadable storage) gets.
// S1-2: ROWS, for both P (T = the other locale). Each row's shape mirrors the P = en table
// one-for-one against DT_PAGE's own rows (DT05/06 or DT43/46 for the redirect/line pair, DT09 or
// DT49 for a translation page's always-write), rather than the hand-typed single-P literal this
// replaced — a path under P = zh-TW needs its own fixture pages, since the same URL now names a
// different locale's content.
const ROWS_BY_P = {
  en: [
    // row, base-less path, rendered source, challenge page?, expected for not-T, expected for P
    { row: 'A1 article', path: '/guide/python', source: 'guide/python.md', challenge: false,
      others: { go: '/zh-TW/guide/python', line: null, writes: false }, own: { go: null, line: null, writes: false } },
    { row: 'A2 challenge', path: '/challenge/v05-php-check/', source: 'challenge/v05-php-check/index.md', challenge: true,
      others: { go: null, line: 'zh-TW', writes: false }, own: { go: null, line: null, writes: false } },
    { row: 'A3 article', path: '/reference/attack-log-export-format', source: 'reference/attack-log-export-format.md', challenge: false,
      others: { go: null, line: 'zh-TW', writes: false }, own: { go: null, line: null, writes: false } },
    { row: 'A5 article, counterpart in the list', path: '/zh-TW/guide/python', source: 'zh-TW/guide/python.md', challenge: false,
      others: { go: null, line: null, writes: true }, own: { go: null, line: null, writes: true } },
    { row: 'A5 article, no counterpart', path: '/zh-TW/guide/zh-only', source: 'zh-TW/guide/zh-only.md', challenge: false,
      others: { go: null, line: null, writes: true }, own: { go: null, line: null, writes: true } },
    { row: 'A9 orphan translation brief', path: '/zh-TW/challenge/orphan-brief/', source: 'zh-TW/challenge/orphan-brief/index.md', challenge: true,
      others: { go: null, line: null, writes: true }, own: { go: null, line: null, writes: true } },
  ] as const,
  'zh-TW': [
    { row: 'A1 article', path: '/guide/python', source: 'guide/python.md', challenge: false,
      others: { go: '/en/guide/python', line: null, writes: false }, own: { go: null, line: null, writes: false } },
    { row: 'A2 challenge', path: '/challenge/v05-php-check/', source: 'challenge/v05-php-check/index.md', challenge: true,
      others: { go: null, line: 'en', writes: false }, own: { go: null, line: null, writes: false } },
    { row: 'A3 article', path: '/reference/attack-log-export-format', source: 'reference/attack-log-export-format.md', challenge: false,
      others: { go: null, line: 'en', writes: false }, own: { go: null, line: null, writes: false } },
    { row: 'A5 article, counterpart in the list', path: '/en/guide/python', source: 'en/guide/python.md', challenge: false,
      others: { go: null, line: null, writes: true }, own: { go: null, line: null, writes: true } },
    { row: 'A5 article, no counterpart', path: '/en/only-in-english', source: 'en/only-in-english.md', challenge: false,
      others: { go: null, line: null, writes: true }, own: { go: null, line: null, writes: true } },
    { row: 'A9 orphan translation brief', path: '/en/challenge/orphan-brief/', source: 'en/challenge/orphan-brief/index.md', challenge: true,
      others: { go: null, line: null, writes: true }, own: { go: null, line: null, writes: true } },
  ] as const,
}

for (const P of ['en', 'zh-TW'] as const) {
  const T = P === 'en' ? 'zh-TW' : 'en'
  describe(`the real Layout: the decision table A1–A5, A7, every column (P = ${P})`, () => {
    const ROWS = ROWS_BY_P[P]
    const STORED = ['none', T, 'unknown', 'unreadable', P] as const
    const INITIAL = { none: null, [T]: T, unknown: 'fr', unreadable: null, [P]: P } as Record<(typeof STORED)[number], string | null>
    const CASES = ROWS.flatMap((r) => STORED.flatMap((stored) => ['/', '/repo/'].map((base) => [r.row, stored, base, r] as const)))

    it.each(CASES)('%s, stored %s, base %s', async (_row, stored, base, r) => {
      mockPrimaryLocale.value = P
      mockBase.value = base
      const prefix = base.slice(0, -1)
      if (INITIAL[stored] !== null) window.localStorage.setItem(LOCALE_STORAGE_KEY, INITIAL[stored]!)
      const spy = stored === 'unreadable'
        ? vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
          throw new DOMException('blocked', 'SecurityError')
        })
        : null
      try {
        if (r.challenge) mockFrontmatter.value = { layout: 'challenge' }
        arrive(prefix + r.path, { isNotFound: false, relativePath: r.source })
        const layout = mountLayout()
        await flushPromises()
        // Flipped by D25 (wave 2) (A1/A2/A3, DT01/02/07/08): "no preference" (none, unknown,
        // unreadable) no longer defaults to T — it falls back to `P`, the same outcome as an
        // explicit stored `P`. Only an explicit stored `T` still gets `r.others`.
        const want = stored === T ? r.others : r.own
        if (want.go === null) expect(mockGo).not.toHaveBeenCalled()
        else expect(mockGo).toHaveBeenCalledWith(prefix + want.go, { replace: true })
        const line = r.challenge
          ? layout.get('[data-challenge-layout]').attributes('data-line')
          : layout.element.querySelector('[data-slot="doc-before"] [data-missing-translation]')?.getAttribute('lang') ?? 'none'
        expect(line).toBe(want.line ?? 'none')
      } finally {
        spy?.mockRestore()
      }
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(r.own.writes ? T : INITIAL[stored])
    })
  })
}

// AC-11, AC-13: the not-found decision table (DT17–DT40, DT57–DT80), every row on the real Layout.
// Fixtures are in `publishedPages` above: `from` is the not-found path, `entry` the list entry it
// is replaced with, and `landing` the rendered source of that entry.
const NOT_FOUND_FIXTURES = {
  en: {
    NT: { from: '/zh-TW/reference/attack-log-export-format', entry: '/reference/attack-log-export-format', source: 'reference/attack-log-export-format.md', missing: '/zh-TW/no-such-page' },
    NP: { from: '/en/reference/attack-log-export-format', entry: '/reference/attack-log-export-format', source: 'reference/attack-log-export-format.md', missing: '/en/no-such-page' },
    NU: { from: '/guide/zh-only', entry: '/zh-TW/guide/zh-only', source: 'zh-TW/guide/zh-only.md', missing: '/no-such-page' },
  },
  'zh-TW': {
    NT: { from: '/en/reference/attack-log-export-format', entry: '/reference/attack-log-export-format', source: 'reference/attack-log-export-format.md', missing: '/en/no-such-page' },
    NP: { from: '/zh-TW/reference/attack-log-export-format', entry: '/reference/attack-log-export-format', source: 'reference/attack-log-export-format.md', missing: '/zh-TW/no-such-page' },
    NU: { from: '/only-in-english', entry: '/en/only-in-english', source: 'en/only-in-english.md', missing: '/no-such-page' },
  },
} as const
const STORED_INITIAL = { none: null, en: 'en', 'zh-TW': 'zh-TW', invalid: 'fr' } as const

describe.each(['en', 'zh-TW'] as const)('the real Layout: the not-found decision table DT17–DT40, DT57–DT80 (P = %s)', (P) => {
  const ROWS = DT_NOT_FOUND.filter((r) => r.P === P)
  const CASES = ROWS.flatMap((r) => BASES.map((b) => [r.id, r.arrival, r.stored, r.counterpart, b.label, r, b.base] as const))

  it.each(CASES)('%s %s, stored %s, counterpart %s, base %s', async (_id, _arrival, _stored, _counterpart, _label, r, base) => {
    mockPrimaryLocale.value = P
    mockBase.value = base
    const prefix = base.slice(0, -1)
    const initial = STORED_INITIAL[r.stored]
    if (initial !== null) window.localStorage.setItem(LOCALE_STORAGE_KEY, initial)
    const fixture = NOT_FOUND_FIXTURES[P][r.arrival as 'NT' | 'NP' | 'NU']
    const setSpy = vi.spyOn(window.localStorage, 'setItem')
    try {
      if (r.counterpart === 'missing') {
        arrive(prefix + fixture.missing, NOT_FOUND)
        const layout = mountLayout()
        await flushPromises()
        expect(mockGo).not.toHaveBeenCalled()
        expect(layout.find('[data-missing-translation]').exists()).toBe(false)
      } else {
        const suffix = '?q=1#h'
        arrive(prefix + fixture.from + suffix, NOT_FOUND)
        const layout = mountLayout()
        await flushPromises()
        expect(mockGo).toHaveBeenCalledTimes(1)
        expect(mockGo).toHaveBeenCalledWith(prefix + fixture.entry + suffix, { replace: true })
        arrive(prefix + fixture.entry + suffix, { isNotFound: false, relativePath: fixture.source })
        await flushPromises()
        expect(mockGo).toHaveBeenCalledTimes(1)
        const line = layout.element.querySelector('[data-slot="doc-before"] [data-missing-translation]')?.getAttribute('lang') ?? 'none'
        expect(line).toBe(r.line ?? 'none')
      }
      expect(setSpy).not.toHaveBeenCalled()
    } finally {
      setSpy.mockRestore()
    }
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(initial)
  })

  // A39 (D28's fall-through): `/<P>/X` is not published, `/<T>/X` is — one go with replace to the
  // translation, no cold-load redirect after the landing, the line in `P`, `wxl-locale` unchanged.
  const A39 = {
    en: { from: '/en/guide/zh-only', entry: '/zh-TW/guide/zh-only', source: 'zh-TW/guide/zh-only.md' },
    'zh-TW': { from: '/zh-TW/only-in-english', entry: '/en/only-in-english', source: 'en/only-in-english.md' },
  }[P]
  const A39_CASES = BASES.flatMap((b) => (['none', 'en', 'zh-TW', 'invalid'] as const).map((stored) => [b.label, stored, b.base] as const))
  it.each(A39_CASES)('A39: base %s, stored %s', async (_label, stored, base) => {
    mockPrimaryLocale.value = P
    mockBase.value = base
    const prefix = base.slice(0, -1)
    const initial = STORED_INITIAL[stored]
    if (initial !== null) window.localStorage.setItem(LOCALE_STORAGE_KEY, initial)
    arrive(prefix + A39.from, NOT_FOUND)
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(mockGo).toHaveBeenCalledWith(prefix + A39.entry, { replace: true })
    arrive(prefix + A39.entry, { isNotFound: false, relativePath: A39.source })
    await flushPromises()
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(layout.get('[data-slot="doc-before"] [data-missing-translation]').attributes('lang')).toBe(P)
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(initial)
  })
})

// Spec 0008, B1–B3, B5–B7, L1, L5, L8, W1, D17: a locale switcher choice, through the real
// Layout. A choice is an arrival: it is written, and either navigates to a published counterpart
// or stays with the line at once in the chosen locale.
describe('the real Layout: a locale switcher choice', () => {
  const GUIDE = { isNotFound: false, relativePath: 'guide/python.md' }
  const CHALLENGE = { isNotFound: false, relativePath: 'challenge/v05-php-check/index.md' }
  const choose = (locale: 'en' | 'zh-TW') => {
    expect(switcher.choose, 'the Layout provides no choice').not.toBeNull()
    return switcher.choose!(locale)
  }

  it('stays on a page with no version in the chosen locale, with the line at once, and the way back removes it', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    arrive('/reference/attack-log-export-format', REFERENCE)
    const layout = mountLayout()
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)

    expect(choose('zh-TW')).toBe('stay')
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(layout.get('[data-slot="doc-before"] [data-missing-translation]').attributes('lang')).toBe('zh-TW')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW')
    expect(i18n.global.locale.value).toBe('en')

    // A change of hash alone is not an arrival (L8).
    window.history.pushState({}, '', '/reference/attack-log-export-format#fields')
    mockRoute.path = '/reference/attack-log-export-format#fields'
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(true)

    expect(choose('en')).toBe('stay')
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(mockGo).not.toHaveBeenCalled()
  })

  it('removes the line a cold load showed when the page\'s own locale is chosen (A3, B5)', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    arrive('/reference/attack-log-export-format', REFERENCE)
    const layout = mountLayout()
    await flushPromises()
    expect(layout.find('[data-missing-translation]').attributes('lang')).toBe('zh-TW')
    expect(choose('en')).toBe('stay')
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
  })

  it('shows the line at once on a challenge page whose gate is still asking (D17)', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    arrive('/guide/python', GUIDE)
    const layout = mountLayout()
    await flushPromises()
    mockFrontmatter.value = { layout: 'challenge' }
    arrive('/challenge/v05-php-check/', CHALLENGE)
    await flushPromises()
    expect(layout.get('[data-challenge-layout]').attributes('data-line')).toBe('none')

    expect(choose('zh-TW')).toBe('stay')
    await flushPromises()
    expect(gateDecision.value).toBe('undecided')
    expect(layout.get('[data-challenge-layout]').attributes('data-line')).toBe('zh-TW')
  })

  it('navigates to a published counterpart, as a push (B1)', async () => {
    // Stored `en`, so the cold load itself does not redirect (A4).
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    arrive('/guide/python', GUIDE)
    mountLayout()
    await flushPromises()
    expect(choose('zh-TW')).toBe('navigate')
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/guide/python')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW')
  })

  it('keeps the site base on the target and stays where there is nothing to go to (B3)', async () => {
    // Stored `en`, so the cold load itself does not redirect (A4).
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    mockBase.value = '/repo/'
    arrive('/repo/guide/python', GUIDE)
    mountLayout()
    await flushPromises()
    expect(choose('zh-TW')).toBe('navigate')
    expect(mockGo).toHaveBeenCalledWith('/repo/zh-TW/guide/python')
    mockGo.mockReset()
    arrive('/repo/reference/attack-log-export-format', REFERENCE)
    await flushPromises()
    expect(choose('zh-TW')).toBe('stay')
    expect(mockGo).not.toHaveBeenCalled()
  })

  // The one choice the menu offers on a translated page with no line is the other locale, and
  // it navigates. The router double does not move the location, so a cold-load redirect still
  // claimed after the gate's answer would be called on top of it.
  it('ends the cold load\'s redirect when the learner chooses while the gate asks (L5)', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateClearStarted.value = true
    gateDecision.value = 'undecided'
    arrive('/guide/python', GUIDE)
    mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(choose('zh-TW')).toBe('navigate')
    gateDecision.value = 'kept'
    await flushPromises()
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/guide/python')
  })

  it('shows the line at once when the choice comes before the cold load is released (D17)', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateClearStarted.value = true
    gateDecision.value = 'undecided'
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    arrive('/reference/attack-log-export-format', REFERENCE)
    const layout = mountLayout()
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    expect(choose('zh-TW')).toBe('stay')
    await flushPromises()
    expect(gateDecision.value).toBe('undecided')
    expect(layout.get('[data-slot="doc-before"] [data-missing-translation]').attributes('lang')).toBe('zh-TW')
  })

  it('goes to the counterpart from a not-found page the gate is holding, as a push (B7)', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateClearStarted.value = true
    gateDecision.value = 'undecided'
    arrive('/zh-TW/reference/attack-log-export-format', NOT_FOUND)
    mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(choose('en')).toBe('navigate')
    // B4-6: the full call list, not only `toHaveBeenCalledWith` (B3-7's own pattern, mirrored
    // here on the P = en original).
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(mockGo).toHaveBeenCalledWith('/reference/attack-log-export-format')
  })

  it('writes the choice on the not-found page and shows no line (B7)', async () => {
    arrive('/zh-TW/no-such-page', NOT_FOUND)
    const layout = mountLayout()
    await flushPromises()
    expect(choose('en')).toBe('stay')
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
  })

  // The kept choice (zh-TW) differs from both `P` (en) and the later arrival's own page locale
  // (en, an unprefixed English-only article): only a kept choice that is genuinely read back
  // can explain the later arrival's line being zh-TW — a kept choice that silently failed would
  // fall back to `en` either way (P, or the page's own locale), so this discriminates where a
  // kept choice equal to `P` would not.
  it('keeps the choice for the tab when storage refuses it, and a later arrival uses it (B6, W6)', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    arrive('/guide/python', GUIDE)
    const layout = mountLayout()
    await flushPromises()
    window.localStorage.clear()
    const set = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    try {
      arrive('/reference/attack-log-export-format', REFERENCE)
      await flushPromises()
      expect(() => choose('zh-TW')).not.toThrow()
      expect(readStoredLocale()).toBe('zh-TW')
      // A later arrival on an English-only article asks with the kept `zh-TW`.
      arrive('/guide/english-only', { isNotFound: false, relativePath: 'guide/english-only.md' })
      await flushPromises()
      expect(layout.get('[data-missing-translation]').attributes('lang')).toBe('zh-TW')
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
    } finally {
      set.mockRestore()
    }
  })

  // S1-3, under P = zh-TW (T = en): representative mirrors of A21 (SW), A23 (not-found
  // switcher) and A24 (storage-refusing write kept for the tab).
  it('under P = zh-TW, navigates to a published counterpart, as a push (B1, A21)', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    arrive('/guide/python', GUIDE)
    mountLayout()
    await flushPromises()
    expect(choose('en')).toBe('navigate')
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(mockGo).toHaveBeenCalledWith('/en/guide/python')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
  })

  it('under P = zh-TW, goes to the counterpart from a not-found page the gate is holding, as a push (B7, A23)', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    markerPresent = false
    gateShouldAsk.value = true
    gateClearStarted.value = true
    gateDecision.value = 'undecided'
    arrive('/en/reference/attack-log-export-format', NOT_FOUND)
    mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(choose('zh-TW')).toBe('navigate')
    // B3-7: the full call list, not only `toHaveBeenCalledWith` — which does not rule out an
    // extra, wrong call alongside the right one.
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(mockGo).toHaveBeenCalledWith('/reference/attack-log-export-format')
  })

  it('under P = zh-TW, writes the choice on the not-found page and shows no line (B7, A23)', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    arrive('/en/no-such-page', { isNotFound: true, relativePath: 'en/no-such-page.md' })
    const layout = mountLayout()
    await flushPromises()
    expect(choose('zh-TW')).toBe('stay')
    // B3-8: a stayed choice must not ALSO call go() — nothing here checked that before.
    expect(mockGo).not.toHaveBeenCalled()
    await flushPromises()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW')
  })

  it('under P = zh-TW, keeps the choice for the tab when storage refuses it, and a later arrival uses it (B6, W6, A24)', async () => {
    mockPrimaryLocale.value = 'zh-TW'
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    arrive('/guide/python', GUIDE)
    const layout = mountLayout()
    await flushPromises()
    window.localStorage.clear()
    const set = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    try {
      arrive('/reference/attack-log-export-format', REFERENCE)
      await flushPromises()
      expect(() => choose('en')).not.toThrow()
      expect(readStoredLocale()).toBe('en')
      // A later arrival on a Traditional-Chinese-only article asks with the kept `en`.
      arrive('/guide/only-in-chinese', { isNotFound: false, relativePath: 'guide/only-in-chinese.md' })
      await flushPromises()
      expect(layout.get('[data-missing-translation]').attributes('lang')).toBe('en')
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
    } finally {
      set.mockRestore()
    }
  })
})

// B3-1: SW01–SW16 (A-§4.3, `tests/__helpers__/localeTables.ts`), on the real, mounted Layout —
// the full matrix the handoff's literal text asked for, in both `P`s. The hand-written cases
// above already cover these properties with additional context (the gate, the base, L8, W6);
// this block does not remove them — it adds exhaustive, row-by-row coverage of every SW row's
// own three columns (Decision/target, Writes, Line), which the hand-written cases do not all
// exercise individually. One fixed scenario per row id, transcribed from the SW table's own
// columns rather than derived, so a mistake here cannot drift from the table silently.
const SW_SCENARIOS: Record<
  string,
  { path: string; page: { isNotFound: boolean; relativePath: string }; chosen: 'en' | 'zh-TW'; target: string | null }
> = {
  // P = en, T = zh-TW
  SW01: { path: '/guide/python', page: { isNotFound: false, relativePath: 'guide/python.md' }, chosen: 'zh-TW', target: '/zh-TW/guide/python' },
  SW02: { path: '/reference/attack-log-export-format', page: REFERENCE, chosen: 'zh-TW', target: null },
  SW03: { path: '/guide/python', page: { isNotFound: false, relativePath: 'guide/python.md' }, chosen: 'en', target: null },
  SW04: { path: '/zh-TW/guide/python', page: { isNotFound: false, relativePath: 'zh-TW/guide/python.md' }, chosen: 'en', target: '/guide/python' },
  SW05: { path: '/zh-TW/guide/zh-only', page: { isNotFound: false, relativePath: 'zh-TW/guide/zh-only.md' }, chosen: 'en', target: null },
  SW06: { path: '/zh-TW/guide/python', page: { isNotFound: false, relativePath: 'zh-TW/guide/python.md' }, chosen: 'zh-TW', target: null },
  SW13: { path: '/zh-TW/reference/attack-log-export-format', page: NOT_FOUND, chosen: 'zh-TW', target: '/reference/attack-log-export-format' },
  SW14: { path: '/zh-TW/no-such-page', page: NOT_FOUND, chosen: 'zh-TW', target: null },
  // P = zh-TW, T = en
  SW07: { path: '/guide/python', page: { isNotFound: false, relativePath: 'guide/python.md' }, chosen: 'en', target: '/en/guide/python' },
  SW08: { path: '/reference/attack-log-export-format', page: REFERENCE, chosen: 'en', target: null },
  SW09: { path: '/guide/python', page: { isNotFound: false, relativePath: 'guide/python.md' }, chosen: 'zh-TW', target: null },
  SW10: { path: '/en/guide/python', page: { isNotFound: false, relativePath: 'en/guide/python.md' }, chosen: 'zh-TW', target: '/guide/python' },
  SW11: { path: '/en/only-in-english', page: { isNotFound: false, relativePath: 'en/only-in-english.md' }, chosen: 'zh-TW', target: null },
  SW12: { path: '/en/guide/python', page: { isNotFound: false, relativePath: 'en/guide/python.md' }, chosen: 'en', target: null },
  SW15: { path: '/en/reference/attack-log-export-format', page: NOT_FOUND, chosen: 'en', target: '/reference/attack-log-export-format' },
  SW16: { path: '/en/no-such-page', page: NOT_FOUND, chosen: 'en', target: null },
}

// B4-1e: P × base, not just P — the two bases the spec names (A7), as the DT/NT tables
// already run them. `withBase` is mocked as identity in this file (top of file), so a path
// under a non-root base has to carry the prefix itself; `b.prefix` is `''` for `/`.
describe.each(
  (['en', 'zh-TW'] as const).flatMap((P) => BASES.map((b) => [P, b.label, b.base, b.prefix] as const)),
)('the real Layout: a locale switcher choice, the full SW table (P = %s, base = %s)', (P, _baseLabel, base, prefix) => {
  it.each(SW.filter((row) => row.P === P))(
    '$id (page=$page, chosen=$chosen, counterpart=$counterpart): $decision',
    async (row) => {
      mockPrimaryLocale.value = P
      mockBase.value = base
      const scenario = SW_SCENARIOS[row.id]
      // B4-1g: ties the transcribed scenario to the SW row's OWN columns it claims to follow —
      // without this, the comment above (SW_SCENARIOS) that it "cannot drift silently" would be
      // unenforced prose.
      expect(scenario.page.isNotFound, `${row.id}: page.isNotFound should match row.page`).toBe(row.page === 'not-found')
      if (row.chosen !== 'either') {
        const ownLocale = row.page === 'translation' ? row.T : row.P
        const otherOfOwn = ownLocale === row.P ? row.T : row.P
        const expectedChosen = row.chosen === 'own' ? ownLocale : otherOfOwn
        expect(scenario.chosen, `${row.id}: chosen should follow row.chosen (${row.chosen})`).toBe(expectedChosen)
      }
      arrive(`${prefix}${scenario.path}`, scenario.page)
      const layout = mountLayout()
      await flushPromises()
      // A not-found arrival with a listed counterpart (SW13/SW15) already redirected once on
      // mount (B7's own, separately tested, property); the reset below isolates what the
      // CHOICE itself does, which is this block's own question. Scoped to SW13–16 only
      // (B4-1d): every other row's page arrival calls `go()` zero times on mount, so resetting
      // there too would silently swallow a stray extra mount-time call this test should catch.
      if (row.id === 'SW13' || row.id === 'SW14' || row.id === 'SW15' || row.id === 'SW16') mockGo.mockReset()
      expect(switcher.choose, 'the Layout provides no choice').not.toBeNull()
      // B4-1c (SW06/SW12): the cold-load mount above already writes the OTHER locale to
      // storage (shouldPersistOnColdLoad), which happens to equal these two rows' own `chosen`
      // value — so a final-value check alone would pass even if the CHOICE itself wrote
      // nothing. A spy scoped to just this call makes the write the choice's own.
      const setSpy = row.id === 'SW06' || row.id === 'SW12' ? vi.spyOn(window.localStorage, 'setItem') : null
      const outcome = switcher.choose!(scenario.chosen)
      await flushPromises()
      if (setSpy) {
        expect(setSpy).toHaveBeenCalledWith(LOCALE_STORAGE_KEY, scenario.chosen)
        setSpy.mockRestore()
      }
      expect(outcome).toBe(row.decision)
      if (row.decision === 'navigate') {
        // A switcher choice is a push, never a history replacement (B1–B3, B7): no `replace`
        // option on this call, unlike a cold-load or not-found redirect.
        expect(mockGo).toHaveBeenCalledTimes(1)
        expect(mockGo).toHaveBeenCalledWith(`${prefix}${scenario.target}`)
        // B4-1a: a navigate choice leaves the page on screen unchanged (the mock `go` never
        // actually re-renders); SW13–16's pre-mount redirect was isolated by the `mockGo.mockReset()`
        // above, so this line asserts the CHOICE itself puts up no line, not an earlier one.
        expect(layout.find('[data-missing-translation]').exists()).toBe(false)
      } else {
        expect(mockGo).not.toHaveBeenCalled()
        if (row.line === null) {
          expect(layout.find('[data-missing-translation]').exists()).toBe(false)
        } else {
          expect(layout.get('[data-missing-translation]').attributes('lang')).toBe(row.line)
        }
      }
      // Writes (W1): a choice is always written, whatever it decides, SW13–16 included.
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(scenario.chosen)
    },
  )

  // Segment 2z (wave 2 item 1b): SW03/06/09/12 "stay; removes a shown line". Each row's own page
  // starts with NO line, so the line is first SHOWN on the page a seed row (SW02/05/08/11, same
  // page kind, counterpart not listed) uses, then the page's own locale is chosen.
  const SEED_ROW: Record<string, string> = { SW03: 'SW02', SW06: 'SW05', SW09: 'SW08', SW12: 'SW11' }
  it.each(SW.filter((row) => row.P === P && row.chosen === 'own'))(
    '$id (page=$page, chosen=own): stay; removes a shown line',
    async (row) => {
      mockPrimaryLocale.value = P
      mockBase.value = base
      const seed = SW_SCENARIOS[SEED_ROW[row.id]]
      const seedRow = SW.find((r) => r.id === SEED_ROW[row.id])!
      const own = row.page === 'translation' ? row.T : row.P
      expect(row.decision).toBe('stay')
      expect(row.line).toBeNull()
      arrive(`${prefix}${seed.path}`, seed.page)
      const layout = mountLayout()
      await flushPromises()
      expect(layout.find('[data-missing-translation]').exists()).toBe(false)
      expect(switcher.choose!(seed.chosen)).toBe('stay')
      await flushPromises()
      expect(layout.get('[data-missing-translation]').attributes('lang')).toBe(seedRow.line)
      const setSpy = vi.spyOn(window.localStorage, 'setItem')
      const outcome = switcher.choose!(own)
      await flushPromises()
      expect(outcome).toBe(row.decision)
      expect(layout.find('[data-missing-translation]').exists()).toBe(false)
      expect(setSpy).toHaveBeenCalledWith(LOCALE_STORAGE_KEY, own)
      setSpy.mockRestore()
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(own)
      expect(mockGo).not.toHaveBeenCalled()
    },
  )
})

// B4-1f: SW13–16's boundary conditions name "page kinds primary/translation/not-found/failed
// load" — only the not-found kind was exercised above. `switcherDecision` treats a failed load
// the same as a not-found arrival (`arrival.ts`'s non-'page' branch does not distinguish them),
// so one representative mirror per row, with the not-found double swapped for a real page
// double (`isNotFound: true`, `pathname` itself published — `classifyArrival`'s own "failed
// load" rule), proves the same property holds for that page kind too.
describe.each(['en', 'zh-TW'] as const)('the real Layout: a locale switcher choice, a failed load mirrors the not-found rows (SW13-16, P = %s)', (P) => {
  type FailedLoadScenario = { path: string; chosen: 'en' | 'zh-TW'; decision: 'navigate' | 'stay'; target: string | null }
  const FAILED_LOAD: Record<'en' | 'zh-TW', Record<string, FailedLoadScenario>> = {
    en: {
      // SW13 mirror: a published page whose OWN counterpart is listed.
      SW13: { path: '/zh-TW/guide/python', chosen: 'zh-TW', decision: 'navigate', target: '/guide/python' },
      // SW14 mirror: a published page whose counterpart is unlisted.
      SW14: { path: '/guide/english-only', chosen: 'en', decision: 'stay', target: null },
    },
    'zh-TW': {
      SW15: { path: '/en/guide/python', chosen: 'en', decision: 'navigate', target: '/guide/python' },
      SW16: { path: '/en/only-in-english', chosen: 'zh-TW', decision: 'stay', target: null },
    },
  }
  it.each(Object.entries(FAILED_LOAD[P]) as [string, FailedLoadScenario][])('%s (failed load)', async (id, scenario) => {
    mockPrimaryLocale.value = P
    arrive(scenario.path, { isNotFound: true, relativePath: '404.md' })
    const layout = mountLayout()
    await flushPromises()
    mockGo.mockReset()
    const outcome = switcher.choose!(scenario.chosen)
    await flushPromises()
    expect(outcome).toBe(scenario.decision)
    if (scenario.decision === 'navigate') {
      expect(mockGo).toHaveBeenCalledTimes(1)
      expect(mockGo).toHaveBeenCalledWith(scenario.target)
    } else {
      expect(mockGo).not.toHaveBeenCalled()
    }
    // SW13–16 never a line, failed load included.
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(scenario.chosen)
  })
})

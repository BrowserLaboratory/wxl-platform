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
vi.mock('../../../.vitepress/theme/components/LocaleSwitcher.vue', () => ({
  default: defineComponent({ setup: () => () => h('div', { 'data-locale-switcher-stub': '' }) }),
}))
vi.mock('../../../.vitepress/theme/i18n/publishedPages', () => ({
  publishedPages: () => ['/', '/challenge/v05-php-check/', '/challenges', '/guide/english-only', '/guide/python', '/reference/attack-log-export-format', '/zh-TW/', '/zh-TW/challenges', '/zh-TW/guide/python', '/zh-TW/guide/zh-only'],
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
  mockBase.value = '/'
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

  it('stays on an English-only page with no stored value, the line in the default zh-TW (A2)', async () => {
    arrive('/challenge/v05-php-check/', CHALLENGE)
    mockFrontmatter.value = { layout: 'challenge' }
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(layout.get('[data-challenge-layout]').attributes('data-line')).toBe('zh-TW')
  })

  it('neither redirects nor shows the line for a learner who stored en (A4)', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    arrive('/reference/attack-log-export-format', REFERENCE)
    const layout = mountLayout()
    await flushPromises()
    expect(mockGo).not.toHaveBeenCalled()
    expect(layout.find('[data-missing-translation]').exists()).toBe(false)
  })

  it('sends an alias of a translated page to its counterpart entry, once, with replace (A1)', async () => {
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

  // L6 on an A1 landing: the landing is in the requested locale, so the carried value changes
  // nothing visible there. What can be seen is that the carry ends at the landing.
  it('after an A1 redirect, a later page asks with the stored value, not the carried one (L6)', async () => {
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
    arrive('/challenges', { isNotFound: false, relativePath: 'challenges.md' })
    mountLayout()
    await flushPromises()
    arrive('/zh-TW/challenges', { isNotFound: false, relativePath: 'zh-TW/challenges.md' })
    await flushPromises()
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
  })
})

// Spec 0008, AC-2: every row of the decision table, for every stored value it names and both
// bases — the redirect, the line and the write, as the row states. The expected results are the
// table's own, written out per row: what a learner with `en` stored gets, and what everyone else
// (none, `zh-TW`, an unknown value, unreadable storage) gets.
describe('the real Layout: the decision table A1–A5, A7, every column', () => {
  const ROWS = [
    // row, base-less path, rendered source, challenge page?, expected for not-`en`, expected for `en`
    { row: 'A1 article', path: '/guide/python', source: 'guide/python.md', challenge: false,
      others: { go: '/zh-TW/guide/python', line: null, writes: false }, en: { go: null, line: null, writes: false } },
    { row: 'A2 challenge', path: '/challenge/v05-php-check/', source: 'challenge/v05-php-check/index.md', challenge: true,
      others: { go: null, line: 'zh-TW', writes: false }, en: { go: null, line: null, writes: false } },
    { row: 'A3 article', path: '/reference/attack-log-export-format', source: 'reference/attack-log-export-format.md', challenge: false,
      others: { go: null, line: 'zh-TW', writes: false }, en: { go: null, line: null, writes: false } },
    { row: 'A5 article, counterpart in the list', path: '/zh-TW/guide/python', source: 'zh-TW/guide/python.md', challenge: false,
      others: { go: null, line: null, writes: true }, en: { go: null, line: null, writes: true } },
    { row: 'A5 article, no counterpart', path: '/zh-TW/guide/zh-only', source: 'zh-TW/guide/zh-only.md', challenge: false,
      others: { go: null, line: null, writes: true }, en: { go: null, line: null, writes: true } },
  ] as const
  const STORED = ['none', 'zh-TW', 'unknown', 'unreadable', 'en'] as const
  const INITIAL: Record<(typeof STORED)[number], string | null> = { none: null, 'zh-TW': 'zh-TW', unknown: 'fr', unreadable: null, en: 'en' }
  const CASES = ROWS.flatMap((r) => STORED.flatMap((stored) => ['/', '/repo/'].map((base) => [r.row, stored, base, r] as const)))

  it.each(CASES)('%s, stored %s, base %s', async (_row, stored, base, r) => {
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
      const want = stored === 'en' ? r.en : r.others
      if (want.go === null) expect(mockGo).not.toHaveBeenCalled()
      else expect(mockGo).toHaveBeenCalledWith(prefix + want.go, { replace: true })
      const line = r.challenge
        ? layout.get('[data-challenge-layout]').attributes('data-line')
        : layout.element.querySelector('[data-slot="doc-before"] [data-missing-translation]')?.getAttribute('lang') ?? 'none'
      expect(line).toBe(want.line ?? 'none')
    } finally {
      spy?.mockRestore()
    }
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(r.en.writes ? 'zh-TW' : INITIAL[stored])
  })
})

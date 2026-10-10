import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, reactive, h, defineComponent } from 'vue'

/**
 * The REAL theme entry, not a copy of its wiring.
 *
 * `tests/unit/i18n/route-locale-sync.test.ts` asserts against a watcher declared
 * inside that test file, so it cannot go red when the original changes. Two of
 * this change's behaviours — the redirect using `replace`, and persistence being
 * conditional — were mutated with the whole suite staying green, which is what
 * made importing the real module non-optional.
 */
// Reactive: the Layout watches `() => route.path`, and a plain object never
// triggers it — the same shape of broken double that round 2 found on `isDark`.
const mockRoute = reactive({ path: '/' })
const mockGo = vi.fn()
const mockFrontmatter = ref<Record<string, unknown>>({})
const mockBase = ref('/')
vi.mock('vitepress', () => ({
  useData: () => ({ frontmatter: mockFrontmatter, site: { value: { base: mockBase.value } } }),
  useRoute: () => mockRoute,
  useRouter: () => ({ go: mockGo }),
}))
vi.mock('vitepress/theme', () => ({
  default: { Layout: defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) }) },
}))
vi.mock('../../../.vitepress/theme/layouts/ChallengeLayout.vue', () => ({
  default: defineComponent({ setup: () => () => h('div', { 'data-challenge-layout': '' }) }),
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

function setPath(p: string) {
  window.history.pushState({}, '', p)
  mockRoute.path = p
}

beforeEach(() => {
  window.localStorage.clear()
  markerPresent = true
  gateShouldAsk.value = false
  gateClearStarted.value = false
  gateDecision.value = 'not-needed'
  mockGateEvaluate.mockClear()
  mockGo.mockReset()
  mockBase.value = '/'
  mockFrontmatter.value = {}
  setPath('/')
  i18n.global.locale.value = 'en'
})
afterEach(() => {
  for (const wrapper of mountedLayouts.splice(0)) wrapper.unmount()
  document.body.className = ''
})

// Every mount is tracked and torn down in `afterEach`. A Layout left mounted keeps its
// gate-decision watcher alive, and that watcher fires on the next test's `beforeEach`
// when the shared gate refs are reset — navigating on behalf of a test that has already
// finished. The tests that reproduce a gate decision all mount without unmounting, so
// the teardown belongs here rather than in each of them.
const mountedLayouts: { unmount: () => void }[] = []
function mountLayout() {
  const wrapper = mount(Theme.Layout!, { global: { plugins: [i18n] } })
  mountedLayouts.push(wrapper)
  return wrapper
}

describe('the real Layout: cold-load redirect', () => {
  it('navigates to the stored locale from an unprefixed path', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    const w = mountLayout()
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/challenges/', { replace: true })
    w.unmount()
  })

  // Pushing would leave the pre-redirect URL one step back, so Back returns to
  // it and is redirected again. The option is the whole point of the assertion.
  it('replaces the history entry rather than pushing', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    const w = mountLayout()
    expect(mockGo).toHaveBeenCalledTimes(1)
    expect(mockGo.mock.calls[0][1]).toEqual({ replace: true })
    w.unmount()
  })

  it.each([
    ['stored matches the path', 'en', '/challenges/'],
    ['the path is explicitly prefixed', 'en', '/zh-TW/guide/'],
  ] as const)('does not navigate when %s', (_label, stored, path) => {
    if (stored) window.localStorage.setItem(LOCALE_STORAGE_KEY, stored)
    setPath(path)
    const w = mountLayout()
    expect(mockGo).not.toHaveBeenCalled()
    w.unmount()
  })

  it('keeps the locale segment inside a non-empty site base', () => {
    mockBase.value = '/wxl/'
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/wxl/challenges/')
    const w = mountLayout()
    expect(mockGo).toHaveBeenCalledWith('/wxl/zh-TW/challenges/', { replace: true })
    w.unmount()
  })
})

describe('the real theme: cold-load persistence', () => {
  // enhanceApp runs at app bootstrap, not on Layout mount, so mounting the
  // Layout never reaches it — m5 (persist unconditionally) killed nothing until
  // this block existed.
  function bootstrap() {
    const app = { use: vi.fn(), component: vi.fn(), config: { globalProperties: {} } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Theme.enhanceApp?.({ app } as any)
  }

  it('updates the stored preference from an explicitly prefixed path', () => {
    setPath('/zh-TW/guide/')
    bootstrap()
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW')
  })

  // The load-bearing one: persisting unconditionally would write `en` here and
  // destroy the preference BEFORE the redirect could read it, so the preference
  // would be unobservable rather than merely ignored.
  it('leaves the stored preference alone on an unprefixed path', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    bootstrap()
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW')
  })

  it('writes nothing at all on an unprefixed path with no prior preference', () => {
    setPath('/challenges/')
    bootstrap()
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
  })

  it('sets the runtime locale from the URL alone', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    bootstrap()
    expect(i18n.global.locale.value).toBe('en')
  })
})

describe('the real Layout: route watcher', () => {
  it.each([
    ['/zh-TW/guide/', 'zh-TW'],
    ['/guide/', 'en'],
  ] as const)('navigating to %s drives the runtime locale to %s', async (path, expected) => {
    const w = mountLayout()
    setPath(path)
    await w.vm.$nextTick()
    expect(i18n.global.locale.value).toBe(expected)
    w.unmount()
  })

  it('stops following the route once unmounted', async () => {
    const w = mountLayout()
    w.unmount()
    mockRoute.path = '/zh-TW/guide/'
    await Promise.resolve()
    expect(i18n.global.locale.value).toBe('en')
  })
})


// ─── The gate is mounted site-wide, asks on challenge pages, and holds the redirect ──
//
// Ordering, not politeness: the redirect reads `wxl-locale`, and that key is one of
// the things the gate may be about to delete. Redirecting first sends the learner into
// the previous learner's locale tree and then needs a second navigation to undo it.

describe('the real Layout: the shared-machine session gate', () => {
  it('mounts the gate on a page that is not a challenge', () => {
    mockFrontmatter.value = {}
    const w = mountLayout()
    // Mounted, not necessarily rendering: the component is beside every layout because an
    // unconfirmed clear has to be recoverable from anywhere, including the site root a
    // clear reloads to. Whether it puts anything on screen is its own decision, made from
    // the page kind it is handed — see the SessionGate tests.
    expect(w.find('[data-session-gate-stub]').exists()).toBe(true)
  })

  it('renders the gate on a challenge page too', () => {
    mockFrontmatter.value = { layout: 'challenge' }
    const w = mountLayout()
    expect(w.find('[data-session-gate-stub]').exists()).toBe(true)
  })

  it('redirects in the same tick when this session has already answered', () => {
    markerPresent = true
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    mountLayout()
    // Synchronous: no await between mount and the navigation, so the common path is
    // exactly what it was before the gate existed.
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/challenges/', { replace: true })
    expect(mockGateEvaluate).not.toHaveBeenCalled()
  })

  it('does not redirect while the choice is unanswered', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    // A challenge page: the only kind that puts the choice on screen, and therefore the
    // only kind on which the redirect waits for an answer.
    mockFrontmatter.value = { layout: 'challenge' }
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    mountLayout()
    await new Promise(r => setTimeout(r, 0))
    expect(mockGateEvaluate).toHaveBeenCalled()
    expect(mockGo).not.toHaveBeenCalled()
  })

  it('redirects once the learner chooses to continue', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    // A challenge page: the only kind that puts the choice on screen, and therefore the
    // only kind on which the redirect waits for an answer.
    mockFrontmatter.value = { layout: 'challenge' }
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    mountLayout()
    await new Promise(r => setTimeout(r, 0))
    expect(mockGo).not.toHaveBeenCalled()

    gateShouldAsk.value = false
    gateDecision.value = 'kept'
    await new Promise(r => setTimeout(r, 0))
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/challenges/', { replace: true })
  })

  it('does not redirect when the learner chooses to clear', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    // A challenge page: the only kind that puts the choice on screen, and therefore the
    // only kind on which the redirect waits for an answer.
    mockFrontmatter.value = { layout: 'challenge' }
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    mountLayout()
    await new Promise(r => setTimeout(r, 0))

    gateShouldAsk.value = false
    gateDecision.value = 'cleared'
    await new Promise(r => setTimeout(r, 0))
    // A full page load to the site root replaces it. A router navigation here would
    // race that load, and it would be reading a preference that no longer exists.
    expect(mockGo).not.toHaveBeenCalled()
  })

  it('releases the held redirect when a stopped clear\'s report is dismissed', async () => {
    // The half that was missing. A clear that stops after the database delete withdraws
    // continue and fails again on retry, so `dismissed` is the only value the decision
    // can still reach — and while the watcher tested for `kept` by name, that value fell
    // through to the teardown below it: the watcher stopped itself without redirecting,
    // and nothing was left that could ever move the learner off the previous learner's
    // locale tree. The page stays in place here, so the redirect must run.
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    mockFrontmatter.value = { layout: 'challenge' }
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    mountLayout()
    await new Promise(r => setTimeout(r, 0))
    expect(mockGo).not.toHaveBeenCalled()

    gateShouldAsk.value = false
    gateDecision.value = 'dismissed'
    await new Promise(r => setTimeout(r, 0))
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/challenges/', { replace: true })
  })

  it('tells the gate which page it is on', () => {
    mockFrontmatter.value = { layout: 'challenge' }
    const challenge = mountLayout()
    expect(challenge.find('[data-session-gate-stub]').attributes('data-challenge-page')).toBe('true')

    mockFrontmatter.value = {}
    const other = mountLayout()
    expect(other.find('[data-session-gate-stub]').attributes('data-challenge-page')).toBe('false')
  })

  it('redirects on a page that does not present the choice, without waiting for an answer', async () => {
    // The silent half of this change. The choice is never put on screen here, so nothing
    // will ever move the decision off `undecided` — a redirect that waited for one would
    // leave a learner whose preference names another locale on the wrong locale tree, with
    // nothing left that could move them off it. No test that looked only at the gate would
    // have seen it: every assertion about asking stays green.
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    mockFrontmatter.value = {}
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    mountLayout()
    await new Promise(r => setTimeout(r, 0))

    expect(mockGateEvaluate).toHaveBeenCalled()
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/challenges/', { replace: true })
  })

  it('holds the redirect on any page while a clear is unconfirmed', async () => {
    // The recovery is presented everywhere, so everywhere is a page that waits: the
    // learner may yet press clear from here, and a clear replaces the page entirely.
    markerPresent = false
    gateShouldAsk.value = true
    gateClearStarted.value = true
    gateDecision.value = 'undecided'
    mockFrontmatter.value = {}
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    mountLayout()
    await new Promise(r => setTimeout(r, 0))

    expect(mockGo).not.toHaveBeenCalled()
  })

  it('redirects after the gate finds nothing to ask about', async () => {
    markerPresent = false
    gateShouldAsk.value = false
    gateDecision.value = 'not-needed'
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    mountLayout()
    await new Promise(r => setTimeout(r, 0))
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/challenges/', { replace: true })
  })
})


// ─── The deferred redirect does not outlive the layout ───────────────────────
//
// The watcher that waits for the learner's answer is created inside a promise
// continuation, and Vue's effect scope is active only while setup and the lifecycle
// hooks themselves run — so nothing disposes that watcher on its own. Both halves are
// asserted: an unmount after the watcher exists, and an unmount that beat the answer.

describe('the real Layout: the deferred redirect does not outlive the layout', () => {
  it('stops following the gate decision once unmounted', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    mockFrontmatter.value = { layout: 'challenge' }
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    const w = mountLayout()
    await new Promise(r => setTimeout(r, 0))
    w.unmount()

    gateDecision.value = 'kept'
    await new Promise(r => setTimeout(r, 0))
    expect(mockGo).not.toHaveBeenCalled()
  })

  it('does not redirect when the gate answers after the unmount', async () => {
    markerPresent = false
    gateDecision.value = 'not-needed'
    let release!: () => void
    mockGateEvaluate.mockImplementationOnce(() => new Promise<void>((r) => { release = () => r() }))
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    const w = mountLayout()
    w.unmount()

    release()
    await new Promise(r => setTimeout(r, 0))
    expect(mockGo).not.toHaveBeenCalled()
  })

  it('starts no decision watcher when the gate answers after the unmount', async () => {
    markerPresent = false
    gateShouldAsk.value = true
    gateDecision.value = 'undecided'
    let release!: () => void
    mockGateEvaluate.mockImplementationOnce(() => new Promise<void>((r) => { release = () => r() }))
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    setPath('/challenges/')
    const w = mountLayout()
    w.unmount()

    release()
    await new Promise(r => setTimeout(r, 0))
    gateDecision.value = 'kept'
    await new Promise(r => setTimeout(r, 0))
    expect(mockGo).not.toHaveBeenCalled()
  })
})

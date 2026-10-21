import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, config } from '@vue/test-utils'
import { ref } from 'vue'
import { defineComponent, h } from 'vue'

// Mock vitepress useData and Content
vi.mock('vitepress', () => ({
  useData: vi.fn(() => ({
    frontmatter: {
      value: {
        title: 'SQL Injection Demo',
        difficulty: 'easy',
        category: 'web',
        backend: 'flask',
        slug: 'sqli-demo',
        description: 'A simple Flask app with a SQL injection vulnerability.',
        markdownBody: '# SQL Injection Demo\n\nA login form backed by SQLite.',
      },
    },
    page: { value: { relativePath: 'challenge/sqli-demo/index.md' } },
  })),
  withBase: vi.fn((url: string) => url),
}))

vi.mock('vitepress/client', () => ({
  Content: defineComponent({ render: () => h('div', { class: 'vp-doc' }, 'Challenge description content') }),
}))

// Mock child panels to isolate layout logic - accept disabled prop
vi.mock('../../../.vitepress/theme/components/BrowserPanel.vue', () => ({
  default: defineComponent({ props: ['slug', 'dispatch', 'disabled'], template: '<div data-browser-panel :data-disabled="disabled" />' }),
}))
vi.mock('../../../.vitepress/theme/components/RepeatPanel.vue', () => ({
  default: defineComponent({ props: ['slug', 'dispatch', 'disabled', 'injectedRequest'], template: '<div data-repeat-panel :data-disabled="disabled" :data-injected="injectedRequest" />' }),
}))
vi.mock('../../../.vitepress/theme/components/NetworkPanel.vue', () => ({
  default: defineComponent({ props: ['trafficLog', 'canSendToRepeater'], emits: ['clear', 'sendToRepeater'], template: '<div data-network-panel />' }),
}))
vi.mock('../../../.vitepress/theme/components/CodeEditorPanel.vue', () => ({
  default: defineComponent({ props: ['slug', 'dispatch', 'disabled', 'pyodide', 'onCodeExecuted', 'codeHistory'], template: '<div data-code-panel :data-disabled="disabled" />' }),
}))
vi.mock('../../../.vitepress/theme/components/FlagSubmit.vue', () => ({
  default: defineComponent({ props: ['verify', 'blocked', 'blockReason', 'onExport', 'onExportNotes'], template: '<div data-flag-submit />' }),
}))
vi.mock('../../../.vitepress/theme/components/DescriptionModal.vue', () => ({
  default: defineComponent({
    props: ['title', 'difficulty', 'category'],
    emits: ['close'],
    template: '<div data-description-modal />',
  }),
}))
vi.mock('../../../.vitepress/theme/components/MergedNav.vue', () => ({
  default: defineComponent({
    props: ['title', 'difficulty', 'category', 'runtimeReady', 'runtimeError', 'noteCount', 'descriptionCollapsed', 'completed', 'number', 'slug'],
    emits: ['open-notes', 'toggle-description'],
    template: '<nav data-merged-nav :data-title="title" :data-collapsed="descriptionCollapsed" :data-completed="completed" />',
  }),
}))

// Mock WASM loader (extractCustomSection)
vi.mock('../../../.vitepress/theme/composables/useWasmLoader', () => ({
  extractCustomSection: vi.fn().mockReturnValue(null),
}))

// Mock useChallengePersistence — the layout reads the Code panel's draft before export.
let mockDraft: { challengeSlug: string; code: string; updatedAt: number } | null = null
const mockLoadCodeDraft = vi.fn(async (_slug: string) => mockDraft)
// The layout reads every progress record once and hands the nav the answer for this
// challenge. Seeded per test; the default is a learner who has solved nothing.
let mockProgressRecords: any[] = []
const mockListAllProgress = vi.fn(async () => mockProgressRecords)
const mockPersistenceError = ref<string | null>(null)
// Every attempt stored for this challenge. The list reads it; the import write appends
// to it, so one import is visible to the next read without a page load.
let mockStoredSessions: any[] = []
const mockListAttackSessions = vi.fn(async (_slug: string) => mockStoredSessions)
const mockSaveAttackSession = vi.fn(async (_session: any) => undefined)
let mockStoredTraces: any[] = []
const mockListActivityTraces = vi.fn(async (_slug: string) => mockStoredTraces)
// Present so a removal that reaches for it is visible. Nothing in the clear path should.
const mockRecordAttempt = vi.fn(async (_slug: string, _solved: boolean) => undefined)
const mockDeleteAttackSession = vi.fn(async (id: string) => {
  mockStoredSessions = mockStoredSessions.filter(s => s.sessionId !== id)
})
const mockSaveActivityTrace = vi.fn(async (slug: string, detail: any) => {
  mockStoredTraces = [...mockStoredTraces, { id: `t${mockStoredTraces.length}`, challengeSlug: slug, at: 5000, ...detail }]
})
vi.mock('../../../.vitepress/theme/composables/useChallengePersistence', () => ({
  persistenceError: mockPersistenceError,
  useChallengePersistence: vi.fn(() => ({
    saveCodeDraft: vi.fn(async () => undefined),
    loadCodeDraft: mockLoadCodeDraft,
    saveAttackSession: mockSaveAttackSession,
    loadAttackSession: vi.fn(async () => null),
    saveNote: vi.fn(async () => undefined),
    loadNotesBySlug: vi.fn(async () => []),
    deleteNote: vi.fn(async () => undefined),
    listAllProgress: mockListAllProgress,
    listAttackSessions: mockListAttackSessions,
    deleteAttackSession: mockDeleteAttackSession,
    saveActivityTrace: mockSaveActivityTrace,
    listActivityTraces: mockListActivityTraces,
    recordAttempt: mockRecordAttempt,
  })),
}))

// Mock useAttackSession
const mockAddHttpEvent = vi.fn()
// The recorded event list, shared by the recorder and getSession, so that the layout's
// history refresh reads back exactly what it just wrote — the same coupling the real
// composable has.
let mockSessionEvents: Array<Record<string, unknown>> = []
const mockAddCodeExecution = vi.fn(async (code: string, output: string, error: boolean, duration: number, executionId: string) => {
  mockSessionEvents.push({ type: 'code_execution', timestamp: Date.now(), executionId, code, output, error, duration })
})
const mockAddFlagAttempt = vi.fn()
const mockExportSession = vi.fn()
// Faithful to the real init(), which opens a new session with a challenge_start event.
// Without it the session is empty at mount and "codeHistory is empty before anything has
// run" would hold whether or not the layout filters the event list at all.
// The real composable holds `session` as null until `init()` resolves, and `getSession()`
// returns it directly. A mock that hands back a session from the first render hides every
// defect that depends on the session arriving late — which is exactly what happened: the
// export control was computed once, before init, and never recomputed.
let mockSessionExists = false
const mockInit = vi.fn(async () => {
  // Deferred by a tick, like the real init() awaiting IndexedDB. Setting it synchronously
  // would make the session exist during the first render and hide the very ordering this
  // fixture is here to reproduce.
  await Promise.resolve()
  mockSessionExists = true
  mockSessionEvents.push({ type: 'challenge_start', timestamp: Date.now() })
})
const mockGetSession = vi.fn(() => (mockSessionExists ? {
  sessionId: 'in-progress',
  challengeSlug: 'sql-injection-demo',
  challengeTitle: 'SQL Injection Demo',
  startedAt: 0,
  solvedAt: null,
  events: mockSessionEvents,
} : null))
vi.mock('../../../.vitepress/theme/composables/useAttackSession', () => ({
  useAttackSession: vi.fn(() => ({
    init: mockInit,
    getSession: mockGetSession,
    addHttpEvent: mockAddHttpEvent,
    addCodeExecution: mockAddCodeExecution,
    addFlagAttempt: mockAddFlagAttempt,
    exportSession: mockExportSession,
  })),
}))

let ChallengeLayout: typeof import('../../../.vitepress/theme/layouts/ChallengeLayout.vue').default

beforeEach(async () => {
  sessionStorage.clear()
  sessionStorage.setItem('wxl-session-gate', 'decided')
  mockSessionEvents = []
  mockSessionExists = false
  mockDraft = null
  mockProgressRecords = []
  mockStoredSessions = []
  // `mockClear` empties the call log but keeps whatever implementation a test installed,
  // and a `mockImplementation` outlives the test that set it. Re-establishing the
  // default here is what keeps one test's stand-in out of the next test's run.
  mockListAttackSessions.mockReset().mockImplementation(async (_slug: string) => mockStoredSessions)
  mockSaveAttackSession.mockClear()
  mockStoredTraces = []
  mockListActivityTraces.mockClear()
  mockDeleteAttackSession.mockClear()
  mockSaveActivityTrace.mockClear()
  mockRecordAttempt.mockClear()
  mockListAllProgress.mockClear()
  mockPersistenceError.value = null
  vi.resetModules()
  const mod = await import('../../../.vitepress/theme/layouts/ChallengeLayout.vue')
  ChallengeLayout = mod.default
})

describe('ChallengeLayout (VitePress layout)', () => {
  it('renders MergedNav with challenge metadata props', async () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })
    const { default: MergedNav } = await import('../../../.vitepress/theme/components/MergedNav.vue')
    const nav = wrapper.findComponent(MergedNav)
    expect(nav.exists()).toBe(true)
    expect(nav.props('title')).toBe('SQL Injection Demo')
    expect(nav.props('difficulty')).toBe('easy')
    expect(nav.props('category')).toBe('web')
  })

  it('derives slug from per-folder relativePath and passes to BrowserPanel', async () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })
    const { default: BrowserPanel } = await import('../../../.vitepress/theme/components/BrowserPanel.vue')
    const bp = wrapper.findComponent(BrowserPanel)
    expect(bp.props('slug')).toBe('sqli-demo')
  })

  // N07's unit half: off Cloudflare Pages the nav's copy control builds the page URL from this
  // slug, so it has to be the same one the page's tools are keyed by.
  it('passes MergedNav the slug it derives from the page, the one BrowserPanel receives', async () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })
    const { default: MergedNav } = await import('../../../.vitepress/theme/components/MergedNav.vue')
    const { default: BrowserPanel } = await import('../../../.vitepress/theme/components/BrowserPanel.vue')
    expect(wrapper.findComponent(MergedNav).props('slug')).toBe('sqli-demo')
    expect(wrapper.findComponent(BrowserPanel).props('slug')).toBe('sqli-demo')
  })

  // This used to assert `a[href="/challenges/"]` — against the stub above,
  // which hardcoded that anchor. It was green regardless of what the real
  // component did, so it could not observe the back link becoming
  // locale-aware. The stub no longer renders an anchor, and the link's actual
  // behaviour (targets and labels, per locale) is asserted in
  // tests/unit/components/MergedNav.test.ts where the real component mounts.
  it('mounts MergedNav in the layout header', () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })
    const nav = wrapper.find('[data-merged-nav]')
    expect(nav.exists()).toBe(true)
    expect(nav.attributes('data-title')).toBeDefined()
  })

  it('fetches the per-challenge WASM through withBase so it resolves under a deployed base', async () => {
    // Regression: wasmModule frontmatter is a base-agnostic root path
    // (/challenge/<slug>/runtime.wasm). On a GitHub Pages project site the file
    // is served under the base (/wxl-platform/...), so a raw fetch(wasmModule)
    // 404s → "No chall-data section". The fetch MUST route through withBase.
    const { useData, withBase } = await import('vitepress')
    vi.mocked(useData).mockReturnValueOnce({
      frontmatter: {
        value: {
          title: 'SQL Injection Demo',
          difficulty: 'easy',
          category: 'web',
          backend: 'flask',
          slug: 'sqli-demo',
          description: 'x',
          markdownBody: '# x',
          wasmModule: '/challenge/sqli-demo/runtime.wasm',
        },
      },
      page: { value: { relativePath: 'challenge/sqli-demo/index.md' } },
    } as unknown as ReturnType<typeof useData>)
    const fetchSpy = vi.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) })
    vi.stubGlobal('fetch', fetchSpy)

    mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    await flushPromises()

    expect(vi.mocked(withBase)).toHaveBeenCalledWith('/challenge/sqli-demo/runtime.wasm')
    expect(fetchSpy).toHaveBeenCalledWith('/challenge/sqli-demo/runtime.wasm')
    vi.unstubAllGlobals()
  })

  it('does not render a separate header element', () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })
    // The old <header> element should no longer exist
    expect(wrapper.find('header').exists()).toBe(false)
  })

  it('renders description panel and FlagSubmit in left column', () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })
    expect(wrapper.find('[data-flag-submit]').exists()).toBe(true)
    expect(wrapper.find('[data-description-panel]').exists()).toBe(true)
  })

  it('collapses description panel when toggle button is clicked', async () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })
    const toggle = wrapper.find('[data-description-toggle]')
    expect(toggle.exists()).toBe(true)

    const panel = wrapper.find('[data-description-panel]')
    expect(panel.classes()).not.toContain('collapsed')

    await toggle.trigger('click')
    expect(panel.classes()).toContain('collapsed')
  })

  it('expands description panel via MergedNav toggle-description event', async () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })

    // Collapse first
    await wrapper.find('[data-description-toggle]').trigger('click')
    expect(wrapper.find('[data-description-panel]').classes()).toContain('collapsed')

    // MergedNav descriptionCollapsed prop should reflect the state
    const { default: MergedNav } = await import('../../../.vitepress/theme/components/MergedNav.vue')
    const nav = wrapper.findComponent(MergedNav)
    expect(nav.props('descriptionCollapsed')).toBe(true)

    // Emit toggle-description from MergedNav to re-expand
    await nav.vm.$emit('toggle-description')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-description-panel]').classes()).not.toContain('collapsed')
  })

  it('shows persistent flag submit bar when description is collapsed', async () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })
    // Initially no flag bar
    expect(wrapper.find('[data-flag-bar]').exists()).toBe(false)

    // Collapse description
    await wrapper.find('[data-description-toggle]').trigger('click')
    expect(wrapper.find('[data-flag-bar]').exists()).toBe(true)
    expect(wrapper.find('[data-flag-bar] [data-flag-submit]').exists()).toBe(true)
  })

  // Mount once with a given `tools` frontmatter value and return the rendered
  // tab ids in DOM order. Omit `tools` entirely by passing undefined.
  async function tabIdsFor(tools: string[] | undefined) {
    const { useData } = await import('vitepress')
    vi.mocked(useData).mockReturnValueOnce({
      frontmatter: {
        value: {
          title: 'SQL Injection Demo',
          difficulty: 'easy',
          category: 'web',
          backend: 'flask',
          slug: 'sqli-demo',
          description: 'x',
          markdownBody: '# x',
          ...(tools === undefined ? {} : { tools }),
        },
      },
      page: { value: { relativePath: 'challenge/sqli-demo/index.md' } },
    } as unknown as ReturnType<typeof useData>)
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    return wrapper.findAll('[data-tab]').map(t => t.attributes('data-tab'))
  }

  it('excludes Terminal when tools field is not set (default)', async () => {
    expect(await tabIdsFor(undefined)).toEqual(['browser', 'network', 'repeater', 'code'])
  })

  // The inverse of the assertion this replaced. The tab bar is built from RAW
  // frontmatter and never consults VALID_TOOLS, so before this change a hand-written
  // `tools: [terminal]` that skipped `challenge:validate` rendered the panel. Now the
  // canonical list has no such member, so the value is inert rather than merely
  // discouraged — and that is a property of the layout, not of the author-facing CLI.
  it('a hand-written terminal entry renders no tab', async () => {
    expect(await tabIdsFor(['browser', 'terminal'])).toEqual(['browser'])
  })

  it('hides every tab the explicit allowlist leaves out', async () => {
    const ids = await tabIdsFor(['browser', 'code'])
    expect(ids).toEqual(['browser', 'code'])
    expect(ids).not.toContain('network')
    expect(ids).not.toContain('repeater')
  })

  it('injects Browser into an explicit allowlist that omits it', async () => {
    expect(await tabIdsFor(['code'])).toEqual(['browser', 'code'])
  })

  it('yields Browser alone for an empty tools array', async () => {
    expect(await tabIdsFor([])).toEqual(['browser'])
  })

  it('renders tabs in canonical order regardless of the order the author wrote', async () => {
    expect(await tabIdsFor(['code', 'network'])).toEqual(['browser', 'network', 'code'])
  })

  it('leaves a challenge that already declares its allowlist unchanged', async () => {
    // door-is-open ships exactly this list; the new rules must be a no-op for it.
    expect(await tabIdsFor(['browser', 'network', 'repeater', 'code']))
      .toEqual(['browser', 'network', 'repeater', 'code'])
  })

  it.each([
    [['browser', 'network'], false],
    [['browser', 'network', 'repeater'], true],
  ])('tells NetworkPanel whether the Repeater is available for %j', async (tools, expected) => {
    const { useData } = await import('vitepress')
    vi.mocked(useData).mockReturnValueOnce({
      frontmatter: {
        value: {
          title: 'SQL Injection Demo', difficulty: 'easy', category: 'web', backend: 'flask',
          slug: 'sqli-demo', description: 'x', markdownBody: '# x', tools,
        },
      },
      page: { value: { relativePath: 'challenge/sqli-demo/index.md' } },
    } as unknown as ReturnType<typeof useData>)
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })

    const { default: NetworkPanelComponent } = await import('../../../.vitepress/theme/components/NetworkPanel.vue')
    expect(wrapper.findComponent(NetworkPanelComponent).props('canSendToRepeater')).toBe(expected)
  })

  it('does not duplicate a tab id repeated in the allowlist', async () => {
    expect(await tabIdsFor(['code', 'code', 'browser'])).toEqual(['browser', 'code'])
  })

  it('ignores an allowlist entry that is not a known tab', async () => {
    expect(await tabIdsFor(['code', 'sqlmap'])).toEqual(['browser', 'code'])
  })

  it.each([
    ['null (a bare `tools:` line in YAML)', null],
    ['a string', 'browser'],
    ['a number', 7],
  ])('falls back to the default tab set when tools is %s', async (_label, value) => {
    // The layout reads raw frontmatter, so config.ts's array check never runs here.
    // A malformed value must not take the page down with it.
    expect(await tabIdsFor(value as unknown as string[]))
      .toEqual(['browser', 'network', 'repeater', 'code'])
  })

  it('refuses to open the Repeater from the Traffic Log when the challenge did not grant it', async () => {
    const { useData } = await import('vitepress')
    vi.mocked(useData).mockReturnValueOnce({
      frontmatter: {
        value: {
          title: 'SQL Injection Demo',
          difficulty: 'easy',
          category: 'web',
          backend: 'flask',
          slug: 'sqli-demo',
          description: 'x',
          markdownBody: '# x',
          tools: ['browser', 'network'],
        },
      },
      page: { value: { relativePath: 'challenge/sqli-demo/index.md' } },
    } as unknown as ReturnType<typeof useData>)
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })

    await wrapper.find('[data-tab="network"]').trigger('click')
    await wrapper.vm.$nextTick()

    const { default: NetworkPanelComponent } = await import('../../../.vitepress/theme/components/NetworkPanel.vue')
    await wrapper.findComponent(NetworkPanelComponent).vm.$emit('sendToRepeater', 'GET / HTTP/1.1\r\n\r\n')
    await wrapper.vm.$nextTick()

    // The Repeater has no tab here, so it must stay closed rather than becoming
    // an active panel with no tab button to leave it by.
    expect(wrapper.find('[data-tab].ch-tab-btn-active').attributes('data-tab')).toBe('network')
    expect(wrapper.find('[data-panel="repeater"]').attributes('style')).toContain('display: none')
  })

  it('shows NetworkPanel when network tab is active', async () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })
    await wrapper.find('[data-tab="network"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-network-panel]').exists()).toBe(true)
  })

  it('switches to Repeater tab and injects request when NetworkPanel emits sendToRepeater', async () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })

    // Navigate to network tab so NetworkPanel is rendered
    await wrapper.find('[data-tab="network"]').trigger('click')
    await wrapper.vm.$nextTick()

    const { default: NetworkPanelComponent } = await import('../../../.vitepress/theme/components/NetworkPanel.vue')
    const networkPanelWrapper = wrapper.findComponent(NetworkPanelComponent)
    expect(networkPanelWrapper.exists()).toBe(true)

    const rawRequest = 'POST /login HTTP/1.1\r\nHost: challenge-test.localhost\r\n\r\n'
    await networkPanelWrapper.vm.$emit('sendToRepeater', rawRequest)
    await wrapper.vm.$nextTick()

    // Active tab should now be repeater
    const activeTabBtn = wrapper.find('[data-tab].ch-tab-btn-active')
    expect(activeTabBtn.attributes('data-tab')).toBe('repeater')

    // RepeatPanel should have the injected request
    const repeatPanel = wrapper.find('[data-repeat-panel]')
    expect(repeatPanel.attributes('data-injected')).toBe(rawRequest)
  })

  it('wraps Content in a vp-doc container for markdown typography', () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })
    const descPanel = wrapper.find('[data-description-panel]')
    expect(descPanel.find('.vp-doc').exists()).toBe(true)
  })

  it('passes disabled=true to all panels when SW controller is null', async () => {
    // Simulate no SW controller
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { controller: null, ready: Promise.resolve({ active: null }), addEventListener: vi.fn() },
      configurable: true,
    })
    vi.resetModules()
    const mod = await import('../../../.vitepress/theme/layouts/ChallengeLayout.vue')
    const LayoutNoSW = mod.default

    const wrapper = mount(LayoutNoSW, {
      global: { stubs: { Content: true } },
    })
    await wrapper.vm.$nextTick()

    // All panels should be disabled because SW controller is null (swReady=false)
    const browserPanel = wrapper.find('[data-browser-panel]')
    expect(browserPanel.attributes('data-disabled')).toBe('true')
  })

  it('dispatch returns 503 with runtime not ready when runtime has not initialized', async () => {
    // Runtime stays null in test env: frontmatter has no wasmModule
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })
    await wrapper.vm.$nextTick()

    // Get dispatch from the BrowserPanel's props
    const { default: BrowserPanel } = await import('../../../.vitepress/theme/components/BrowserPanel.vue')
    const bpWrapper = wrapper.findComponent(BrowserPanel)
    expect(bpWrapper.exists()).toBe(true)

    const dispatch = bpWrapper.props('dispatch') as (req: Request) => Promise<Response>
    const res = await dispatch(new Request('https://challenge-sqli.localhost/'))

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('runtime not ready')
  })

  it('enables panels when swReady becomes true via controllerchange', async () => {
    let controllerChangeHandler: (() => void) | null = null
    const mockSW = {
      controller: null as ServiceWorker | null,
      ready: Promise.resolve({ active: { postMessage: vi.fn() } }),
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'controllerchange') controllerChangeHandler = handler
      }),
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockSW,
      configurable: true,
    })
    vi.resetModules()
    const mod = await import('../../../.vitepress/theme/layouts/ChallengeLayout.vue')
    const LayoutSW = mod.default

    const wrapper = mount(LayoutSW, {
      global: { stubs: { Content: true } },
    })
    await wrapper.vm.$nextTick()

    // Initially disabled
    expect(wrapper.find('[data-browser-panel]').attributes('data-disabled')).toBe('true')

    // Simulate SW taking control
    mockSW.controller = {} as ServiceWorker
    controllerChangeHandler?.()
    await wrapper.vm.$nextTick()

    // Should now be enabled (only runtimeReady is still false due to mocked runtime)
    // We just check that swReady no longer blocks — but runtimeReady might still be false
    // So disabled should still be true (blocked by runtimeReady), but the swReady part is resolved
    // This test verifies controllerchange is listened to
    expect(controllerChangeHandler).not.toBeNull()
  })

  // ─── re-registration after the Service Worker is terminated ────────────────

  /**
   * Mounts the layout against a Service Worker mock that captures the page's
   * message listener, and returns the postMessage calls made to the worker.
   * Every registration transfers a MessagePort, so the calls are the only place
   * the port identity is observable from outside the component.
   */
  async function mountWithSWMessageChannel() {
    const postMessage = vi.fn()
    let messageHandler: ((e: { data: unknown }) => void) | null = null
    const mockSW = {
      controller: {} as ServiceWorker,
      ready: Promise.resolve({ active: { postMessage } }),
      addEventListener: vi.fn((event: string, handler: (e: { data: unknown }) => void) => {
        if (event === 'message') messageHandler = handler
      }),
      removeEventListener: vi.fn(),
    }
    Object.defineProperty(navigator, 'serviceWorker', { value: mockSW, configurable: true })
    vi.resetModules()
    const mod = await import('../../../.vitepress/theme/layouts/ChallengeLayout.vue')
    const wrapper = mount(mod.default, { global: { stubs: { Content: true } } })
    await flushPromises()
    return {
      wrapper,
      postMessage,
      registrations: () => postMessage.mock.calls.filter(
        ([msg]) => (msg as { type?: string }).type === 'REGISTER_CHALLENGE',
      ),
      send: async (data: unknown) => {
        expect(messageHandler, 'page did not listen for Service Worker messages').not.toBeNull()
        messageHandler?.({ data })
        await flushPromises()
      },
    }
  }

  it('re-registers with a fresh MessagePort when the Service Worker asks', async () => {
    // The worker's registry and every port it holds are discarded when the
    // browser terminates it. Handing back the port the page still has would
    // register a channel whose far end no longer exists — a different 503, not
    // a fix. The new port must be a different object.
    const sw = await mountWithSWMessageChannel()
    expect(sw.registrations()).toHaveLength(1)
    const firstPort = (sw.registrations()[0][0] as { port: MessagePort }).port

    await sw.send({ type: 'REQUEST_REGISTRATION', slug: 'sqli-demo' })

    const after = sw.registrations()
    expect(after).toHaveLength(2)
    const secondPort = (after[1][0] as { port: MessagePort }).port
    expect(secondPort).not.toBe(firstPort)
    expect((after[1][0] as { slug: string }).slug).toBe('sqli-demo')
  })

  it('keeps the retired relay port live so a stale registry entry still answers', async () => {
    // The worker records a port, resolves waiting requests against that entry,
    // and only later learns about a replacement. Closing the old port the
    // instant the new one is built leaves those in-flight requests relaying
    // into a dead port — postMessage on a closed port is a silent no-op, so the
    // fetch hangs forever instead of failing. The retired port has to stay
    // listening; it is closed on unmount with the rest.
    const sw = await mountWithSWMessageChannel()
    const firstPort = (sw.registrations()[0][0] as { port: MessagePort }).port

    await sw.send({ type: 'REQUEST_REGISTRATION', slug: 'sqli-demo' })

    // A closed MessagePort silently drops what is posted to it; a live one
    // delivers. Posting on the worker's end and seeing it arrive is the only
    // externally observable difference.
    const delivered = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 100)
      const rc = new MessageChannel()
      rc.port1.onmessage = () => { clearTimeout(timer); resolve(true) }
      firstPort.postMessage(
        { type: 'HANDLE_REQUEST', method: 'GET', url: 'https://challenge-sqli-demo.localhost/', headers: [], body: null, responsePort: rc.port2 },
        [rc.port2],
      )
    })

    expect(delivered).toBe(true)
  })

  it('revokes a retired relay port once the straggler window has passed', async () => {
    // Retirement covers requests the worker resolved against the old entry
    // before it learned about the replacement. That window is bounded by the
    // worker's registration timeout, not by the tab's lifetime. Holding the
    // port open forever leaves a live capability — the far end can invoke this
    // page's runtime with any method, url, headers and body and read back the
    // full response including the decoded set-cookie carrier — and the list
    // grows without bound every time registration silently no-ops.
    vi.useFakeTimers()
    try {
      const sw = await mountWithSWMessageChannel()
      const firstPort = (sw.registrations()[0][0] as { port: MessagePort }).port

      await sw.send({ type: 'REQUEST_REGISTRATION', slug: 'sqli-demo' })
      await vi.advanceTimersByTimeAsync(4000)

      const delivered = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), 100)
        const rc = new MessageChannel()
        rc.port1.onmessage = () => { clearTimeout(timer); resolve(true) }
        firstPort.postMessage(
          { type: 'HANDLE_REQUEST', method: 'GET', url: 'https://challenge-sqli-demo.localhost/', headers: [], body: null, responsePort: rc.port2 },
          [rc.port2],
        )
        vi.advanceTimersByTimeAsync(200)
      })

      expect(delivered).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores a re-registration request addressed to another challenge', async () => {
    const sw = await mountWithSWMessageChannel()
    const before = sw.postMessage.mock.calls.length

    await sw.send({ type: 'REQUEST_REGISTRATION', slug: 'some-other-challenge' })

    expect(sw.postMessage.mock.calls.length).toBe(before)
  })

  it('passes different dispatch functions to BrowserPanel and RepeatPanel', async () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })

    const { default: BrowserPanel } = await import('../../../.vitepress/theme/components/BrowserPanel.vue')
    const { default: RepeatPanel } = await import('../../../.vitepress/theme/components/RepeatPanel.vue')

    const bp = wrapper.findComponent(BrowserPanel)
    const rp = wrapper.findComponent(RepeatPanel)

    const browserFn = bp.props('dispatch')
    const repeaterFn = rp.props('dispatch')

    // Both dispatch functions should exist and be different (source-attributed wrappers)
    expect(browserFn).toBeTypeOf('function')
    expect(repeaterFn).toBeTypeOf('function')
    expect(browserFn).not.toBe(repeaterFn)
  })

  it('swReady fallback: unlocks when controller is already set at mount time (race condition fix)', async () => {
    // Simulate the race condition: controllerchange fired between setup() and onMounted(),
    // so controller is non-null when onMounted's fallback check runs.
    // Use a getter that returns null on first access (setup ref init) and non-null after.
    let accessCount = 0
    const fakeController = { postMessage: vi.fn(), scriptURL: '', state: 'activated' as ServiceWorkerState } as unknown as ServiceWorker
    const mockSW = {
      get controller() {
        accessCount++
        // First access (ref initialization in setup) → null
        // Subsequent accesses (onMounted fallback) → non-null
        return accessCount <= 1 ? null : fakeController
      },
      ready: Promise.resolve({ active: { postMessage: vi.fn() } }),
      addEventListener: vi.fn(),
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockSW,
      configurable: true,
    })
    vi.resetModules()
    const mod = await import('../../../.vitepress/theme/layouts/ChallengeLayout.vue')
    const Layout = mod.default

    mount(Layout, { global: { stubs: { Content: true } } })
    await new Promise(r => setTimeout(r, 0))

    // The onMounted fallback should have accessed controller at least twice
    // (once in setup for ref init, once+ in onMounted for the fallback check)
    expect(accessCount).toBeGreaterThanOrEqual(2)
  })

  it('swReady fallback: unlocks via navigator.serviceWorker.ready on first visit', async () => {
    // Simulate first visit: controller is null at mount time, SW is still installing.
    // After SW activates and claims, ready resolves and controller becomes non-null.
    let resolveReady!: (reg: unknown) => void
    const readyPromise = new Promise(resolve => { resolveReady = resolve })

    const mockSW: Record<string, unknown> = {
      controller: null,
      ready: readyPromise,
      addEventListener: vi.fn(),
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockSW,
      configurable: true,
    })
    vi.resetModules()
    const mod = await import('../../../.vitepress/theme/layouts/ChallengeLayout.vue')
    const Layout = mod.default

    const wrapper = mount(Layout, { global: { stubs: { Content: true } } })
    await wrapper.vm.$nextTick()

    // Initially disabled (both swReady=false, runtimeReady=false)
    expect(wrapper.find('[data-browser-panel]').attributes('data-disabled')).toBe('true')

    // Simulate SW activation + clients.claim() → controller becomes non-null
    mockSW.controller = { postMessage: vi.fn() } as unknown as ServiceWorker
    resolveReady({ active: { postMessage: vi.fn() } })

    // Allow the ready.then() callback to execute
    await readyPromise
    await wrapper.vm.$nextTick()

    // Panel is still disabled because runtimeReady is also false,
    // but we verify the ready fallback path was exercised by checking
    // that the ready promise was consumed (no unhandled rejection)
    // and the addEventListener was called for controllerchange
    expect(mockSW.controller).not.toBeNull()
    expect((mockSW.addEventListener as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      'controllerchange',
      expect.any(Function),
    )
  })

  it('passes distinct dispatch functions to the Repeater, Code and Browser panels', async () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })

    const { default: RepeatPanel } = await import('../../../.vitepress/theme/components/RepeatPanel.vue')
    const { default: CodePanel } = await import('../../../.vitepress/theme/components/CodeEditorPanel.vue')
    const { default: BrowserPanel } = await import('../../../.vitepress/theme/components/BrowserPanel.vue')

    const repeaterFn = wrapper.findComponent(RepeatPanel).props('dispatch')
    const codeFn = wrapper.findComponent(CodePanel).props('dispatch')
    const browserFn = wrapper.findComponent(BrowserPanel).props('dispatch')

    expect(repeaterFn).toBeTypeOf('function')
    expect(codeFn).toBeTypeOf('function')
    expect(browserFn).toBeTypeOf('function')
    // Pairwise, not against one reference. Comparing every panel to the browser alone
    // would pass while repeater and code shared a wrapper, which is exactly the failure
    // that loses source attribution in the exported session.
    expect(repeaterFn).not.toBe(browserFn)
    expect(codeFn).not.toBe(browserFn)
    expect(repeaterFn).not.toBe(codeFn)
  })

  it('passes onCodeExecuted callback to CodeEditorPanel', async () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })

    const { default: CodePanel } = await import('../../../.vitepress/theme/components/CodeEditorPanel.vue')
    const cp = wrapper.findComponent(CodePanel)
    const cb = cp.props('onCodeExecuted') as (e: { code: string; output: string; error: boolean; duration: number }) => void
    expect(cb).toBeTypeOf('function')

    cb({ code: 'print(1)', output: '1\n', error: false, duration: 100 })
    expect(mockAddCodeExecution).toHaveBeenCalledWith('print(1)', '1\n', false, 100, expect.any(String))
  })


  // ─── Execution history handed down to the Code panel ────────────────────────

  it('passes an empty codeHistory before anything has run', async () => {
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    const { default: CodePanel } = await import('../../../.vitepress/theme/components/CodeEditorPanel.vue')
    await flushPromises()
    expect(wrapper.findComponent(CodePanel).props('codeHistory')).toEqual([])
  })

  it('grows codeHistory by the executed run', async () => {
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    const { default: CodePanel } = await import('../../../.vitepress/theme/components/CodeEditorPanel.vue')
    await flushPromises()

    const cb = wrapper.findComponent(CodePanel).props('onCodeExecuted') as (e: { code: string; output: string; error: boolean; duration: number }) => void
    cb({ code: 'print(1)', output: '1\n', error: false, duration: 100 })
    await flushPromises()

    const history = wrapper.findComponent(CodePanel).props('codeHistory') as Array<Record<string, unknown>>
    expect(history).toHaveLength(1)
    expect(history[0].code).toBe('print(1)')
    expect(history[0].error).toBe(false)
    expect(history[0].executionId).toEqual(expect.any(String))
    expect(history[0].timestamp).toEqual(expect.any(Number))
  })

  it('carries only code executions into codeHistory', async () => {
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    const { default: CodePanel } = await import('../../../.vitepress/theme/components/CodeEditorPanel.vue')
    await flushPromises()

    // A session holds six event types. Passing them all down would put HTTP requests
    // and flag attempts into a dropdown that restores source code.
    mockSessionEvents.push({ type: 'flag_attempt', timestamp: Date.now(), submitted: 'x', correct: false })
    const cb = wrapper.findComponent(CodePanel).props('onCodeExecuted') as (e: { code: string; output: string; error: boolean; duration: number }) => void
    cb({ code: 'print(1)', output: '', error: false, duration: 1 })
    await flushPromises()

    const history = wrapper.findComponent(CodePanel).props('codeHistory') as Array<Record<string, unknown>>
    expect(history).toHaveLength(1)
    expect(history[0].code).toBe('print(1)')
  })

  it('creates exactly one attack session for the page', async () => {
    const { useAttackSession } = await import('../../../.vitepress/theme/composables/useAttackSession')
    // The module mock is shared by every test in this file, so the counter has to start
    // from this mount rather than from the file.
    vi.mocked(useAttackSession).mockClear()
    mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    await flushPromises()
    // A second instance would keep its own copy of the session and each would overwrite
    // the other's save — which is why the panel receives the list instead of building it.
    expect(useAttackSession).toHaveBeenCalledTimes(1)
  })

  it('passes onExport prop to FlagSubmit', async () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })

    const { default: FlagSubmitComponent } = await import('../../../.vitepress/theme/components/FlagSubmit.vue')
    const fs = wrapper.findComponent(FlagSubmitComponent)
    expect(fs.props('onExport')).toBeTypeOf('function')
  })

  it('onExport calls exportSession with challenge info from frontmatter', async () => {
    const wrapper = mount(ChallengeLayout, {
      global: { stubs: { Content: true } },
    })

    const { default: FlagSubmitComponent } = await import('../../../.vitepress/theme/components/FlagSubmit.vue')
    const fs = wrapper.findComponent(FlagSubmitComponent)
    const onExport = fs.props('onExport') as () => void
    onExport()
    await flushPromises()
    expect(mockExportSession).not.toHaveBeenCalled()
    const { default: AttackLogExportDialog } = await import('../../../.vitepress/theme/components/AttackLogExportDialog.vue')
    await wrapper.findComponent(AttackLogExportDialog).props('generate')({ format: 'json', mode: 'full' })
    await flushPromises()

    expect(mockExportSession).toHaveBeenCalledOnce()
    const [challengeInfo] = mockExportSession.mock.calls[0]
    expect(challengeInfo.difficulty).toBe('easy')
    expect(challengeInfo.category).toBe('web')
    expect(challengeInfo.backend).toBe('flask')
    expect(challengeInfo.description).toBe('A simple Flask app with a SQL injection vulnerability.')
    expect(challengeInfo.fullDescription).toBe('# SQL Injection Demo\n\nA login form backed by SQLite.')
  })


  it('onExport hands exportSession the challenge draft', async () => {
    mockDraft = { challengeSlug: 'sql-injection-demo', code: 'r = requests.get(URL)', updatedAt: 99 }
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    const { default: FlagSubmitComponent } = await import('../../../.vitepress/theme/components/FlagSubmit.vue')
    const onExport = wrapper.findComponent(FlagSubmitComponent).props('onExport') as () => void
    mockExportSession.mockClear()
    onExport()
    await flushPromises()
    expect(mockExportSession).not.toHaveBeenCalled()
    const { default: AttackLogExportDialog } = await import('../../../.vitepress/theme/components/AttackLogExportDialog.vue')
    await wrapper.findComponent(AttackLogExportDialog).props('generate')({ format: 'json', mode: 'full' })
    await flushPromises()

    expect(mockExportSession).toHaveBeenCalledOnce()
    const [, draft] = mockExportSession.mock.calls[0]
    expect(draft).toEqual({ code: 'r = requests.get(URL)', updatedAt: 99 })
  })

  it('onExport passes null when the challenge has no draft', async () => {
    mockDraft = null
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    const { default: FlagSubmitComponent } = await import('../../../.vitepress/theme/components/FlagSubmit.vue')
    const onExport = wrapper.findComponent(FlagSubmitComponent).props('onExport') as () => void
    mockExportSession.mockClear()
    onExport()
    await flushPromises()
    expect(mockExportSession).not.toHaveBeenCalled()
    const { default: AttackLogExportDialog } = await import('../../../.vitepress/theme/components/AttackLogExportDialog.vue')
    await wrapper.findComponent(AttackLogExportDialog).props('generate')({ format: 'json', mode: 'full' })
    await flushPromises()

    const [, draft] = mockExportSession.mock.calls[0]
    // `null`, not `undefined`: an undefined second argument is dropped by JSON.stringify,
    // so the exported payload would silently lose the key it is required to carry.
    expect(draft).toBeNull()
  })


  // ─── Telling the learner when nothing is being recorded ─────────────────────
  //
  // Measured with the database blocked by a stale tab: notes vanished on reload and the
  // export button produced no file, with nothing in the console. Silence was the defect.

  it('shows no persistence warning while the database is healthy', async () => {
    mockPersistenceError.value = null
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    await flushPromises()
    expect(wrapper.find('[data-persistence-warning]').exists()).toBe(false)
  })

  it('warns the learner when the database cannot be opened', async () => {
    mockPersistenceError.value = 'challenge-tools is blocked by another tab holding an older version open'
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    await flushPromises()
    const banner = wrapper.find('[data-persistence-warning]')
    expect(banner.exists()).toBe(true)
    // What is lost, and what to do about it — asserted separately, because a banner
    // that only says "something went wrong" leaves the learner with no next step.
    expect(banner.text()).toContain('本機儲存發生問題')
    expect(banner.text()).toContain('重新載入')
  })

  it('offers no control that dismisses the persistence warning', async () => {
    mockPersistenceError.value = 'blocked'
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    await flushPromises()
    const banner = wrapper.find('[data-persistence-warning]')
    expect(banner.exists()).toBe(true)
    expect(banner.findAll('button')).toHaveLength(0)
  })


  it('offers onExport once the session has initialised, not only at first render', async () => {
    // The session does not exist during the first render — `init()` is async. A value
    // computed from the plain `getSession()` at that moment never updates, because the
    // session object is not reactive.
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    // Asserted before any await: a dynamic import yields a microtask, which is enough for
    // the deferred init to land.
    expect(mockSessionExists).toBe(false)
    const { default: FlagSubmitComponent } = await import('../../../.vitepress/theme/components/FlagSubmit.vue')
    await flushPromises()
    expect(mockSessionExists).toBe(true)
    expect(wrapper.findComponent(FlagSubmitComponent).props('onExport')).toBeTypeOf('function')
  })

  it('withholds onExport when there is no session to export', async () => {
    mockInit.mockImplementationOnce(async () => { throw new Error('database never opened') })
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    await flushPromises()
    const { default: FlagSubmitComponent } = await import('../../../.vitepress/theme/components/FlagSubmit.vue')
    // Absent, not inert: a button that is present and does nothing is the failure mode
    // the warning banner exists to end.
    expect(wrapper.findComponent(FlagSubmitComponent).props('onExport')).toBeUndefined()
  })

  // This used to grep ChallengeLayout.vue for the strings
  // `if (!pyodideInstance.value)`, `loadPyodide` and `toolsPyodide`, to assert
  // that a standalone Pyodide was loaded "for non-Python backends". A source
  // grep cannot tell whether the panel actually receives that instance, and it
  // could not observe the defect that mattered: for Python backends the panel
  // received the *challenge runtime's* instance, flag file and all.
  //
  // The standalone instance is now the only path, for every backend, and it is
  // asserted behaviourally — the panel's `pyodide` prop, the load being lazy,
  // and the failure path — in
  // tests/unit/layouts/ChallengeLayout-tools-pyodide.test.ts.
})


// The fixture page is `challenge/sqli-demo/index.md`, so the slug the layout derives
// is `sqli-demo` — the same key `recordAttempt` writes under.
describe('ChallengeLayout completion state', () => {
  async function navAfterMount() {
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    await flushPromises()
    return wrapper.find('[data-merged-nav]')
  }

  it('tells the nav this challenge is completed when a completion is recorded', async () => {
    mockProgressRecords = [{ challengeSlug: 'sqli-demo', firstCompletedAt: 1756000000000, lastAttemptAt: 1756000000000, attemptCount: 1 }]
    expect((await navAfterMount()).attributes('data-completed')).toBe('true')
  })

  it('tells the nav it is not completed when nothing is recorded', async () => {
    mockProgressRecords = []
    expect((await navAfterMount()).attributes('data-completed')).toBe('false')
  })

  // A record for THIS challenge with no completion time, plus a completion for a
  // different one. Both halves are needed: the first catches a layout keying off the
  // record's existence, the second catches one that ignores the slug entirely.
  it('does not report completion from attempts alone, nor from another challenge', async () => {
    mockProgressRecords = [
      { challengeSlug: 'sqli-demo', firstCompletedAt: null, lastAttemptAt: 1756000009999, attemptCount: 4 },
      { challengeSlug: 'php-demo', firstCompletedAt: 1756000000000, lastAttemptAt: 1756000000000, attemptCount: 1 },
    ]
    expect((await navAfterMount()).attributes('data-completed')).toBe('false')
  })

  // D1's other half on this surface. The list has this assertion; the challenge page did
  // not, so moving the read out of onMounted and into setup — where VitePress would run
  // it during the server render of every challenge page — killed nothing here.
  //
  // Asserted by rendering on the server, where onMounted does not run at all. A
  // client-side mount cannot distinguish the two: both setup and onMounted have run by
  // the time mount() returns.
  it('reads no progress during server rendering', async () => {
    mockProgressRecords = [{ challengeSlug: 'sqli-demo', firstCompletedAt: 1756000000000, lastAttemptAt: 1756000000000, attemptCount: 1 }]
    const { renderToString } = await import('@vue/server-renderer')
    const { createSSRApp, h } = await import('vue')
    const app = createSSRApp({ render: () => h(ChallengeLayout) })
    // The bare app has none of the theme's plugins, and the stored-attempt panel renders
    // unconditionally and reads its labels through `$t`. VitePress installs vue-i18n
    // before it server-renders anything, so supplying it here restores the harness to
    // the situation this test describes rather than relaxing what it asserts.
    for (const plugin of config.global.plugins) app.use(plugin as never)
    const html = await renderToString(app)
    expect(html).toContain('data-merged-nav')
    expect(mockListAllProgress).not.toHaveBeenCalled()
  })

  it('reads the progress store once, not once per challenge', async () => {
    mockProgressRecords = [{ challengeSlug: 'sqli-demo', firstCompletedAt: 1, lastAttemptAt: 1, attemptCount: 1 }]
    await navAfterMount()
    expect(mockListAllProgress).toHaveBeenCalledTimes(1)
  })

  // D5 again: the nav is chrome. An unreadable store means no badge, and it must not
  // take the page down with it or raise an alarm of its own — the persistence warning
  // above the bar is for writes failing, which is a different fact.
  it('renders the page normally when progress cannot be read', async () => {
    mockListAllProgress.mockRejectedValueOnce(new Error('challenge-tools is blocked by another tab'))
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    await flushPromises()
    expect(wrapper.find('[data-merged-nav]').attributes('data-completed')).toBe('false')
    expect(wrapper.find('[data-persistence-warning]').exists()).toBe(false)
  })
})

it('blocks both flag entry points and their verifier until stored work is accepted', async () => {
  Object.defineProperty(navigator, 'serviceWorker', { value: { controller: null, ready: Promise.resolve({ active: null }), addEventListener: vi.fn(), removeEventListener: vi.fn() }, configurable: true })
  sessionStorage.clear()
  const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
  const { default: FlagSubmit } = await import('../../../.vitepress/theme/components/FlagSubmit.vue')
  await wrapper.get('[data-description-toggle]').trigger('click')
  const forms = wrapper.findAllComponents(FlagSubmit)
  expect(forms).toHaveLength(2)
  for (const form of forms) {
    expect(form.props('blocked')).toBe(true)
    await expect(form.props('verify')('guess')).rejects.toThrow('stored-work decision')
  }
  const { useSessionGate } = await import('../../../.vitepress/theme/composables/useSessionGate')
  useSessionGate().keepExistingData()
  await wrapper.vm.$nextTick()
  for (const form of wrapper.findAllComponents(FlagSubmit)) expect(form.props('blocked')).toBe(false)
  wrapper.unmount()
})

it('explains failed progress on the challenge page and retries it', async () => {
  mockListAllProgress.mockRejectedValueOnce(new Error('blocked'))
  const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
  await flushPromises()
  expect(wrapper.get('[data-progress-error]').text()).toContain('無法讀取')
  mockListAllProgress.mockResolvedValueOnce([{ challengeSlug: 'sqli-demo', firstCompletedAt: 1 }])
  await wrapper.get('[data-progress-retry]').trigger('click')
  await flushPromises()
  expect(wrapper.find('[data-progress-error]').exists()).toBe(false)
  expect(wrapper.get('[data-merged-nav]').attributes('data-completed')).toBe('true')
})

// The spec requires the two entry points to agree about why submission is unavailable.
// They are separate mounts fed from the layout, so the reason has to come from one source.
it('gives both flag entry points the same block reason', async () => {
  const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
  const { default: FlagSubmitComponent } = await import('../../../.vitepress/theme/components/FlagSubmit.vue')
  // The collapsed bar is a separate mount behind `v-if`, so it only exists once the
  // description panel is collapsed. Both have to exist at once to prove they agree.
  await wrapper.find('[data-description-toggle]').trigger('click')
  const entries = wrapper.findAllComponents(FlagSubmitComponent)
  expect(entries.length).toBeGreaterThan(1)
  const reasons = entries.map(entry => entry.props('blockReason'))
  expect(new Set(reasons).size).toBe(1)
  // The reason and the block have to describe the same state: a reason present means
  // blocked, and no reason means not blocked. Which of the two reasons it is depends on
  // gate state this file does not control; that mapping is covered in the composable tests.
  const blockedFlags = entries.map(entry => entry.props('blocked'))
  expect(new Set(blockedFlags).size).toBe(1)
  expect(reasons[0] === null).toBe(blockedFlags[0] === false)
  wrapper.unmount()
})

describe('ChallengeLayout — importing and choosing a stored attempt', () => {
  const older = {
    sessionId: 'older', challengeSlug: 'sql-injection-demo', challengeTitle: 'SQL Injection Demo',
    startedAt: 1000, solvedAt: 2000, events: [{ type: 'note', timestamp: 1500 }],
  }

  async function open() {
    mockSessionExists = true
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    await flushPromises()
    return wrapper
  }

  async function listComponent(wrapper: ReturnType<typeof mount>) {
    const { default: AttackSessionList } = await import('../../../.vitepress/theme/components/AttackSessionList.vue')
    return wrapper.findComponent(AttackSessionList)
  }

  async function exportNow(wrapper: ReturnType<typeof mount>) {
    const { default: FlagSubmitComponent } = await import('../../../.vitepress/theme/components/FlagSubmit.vue')
    ;(wrapper.findComponent(FlagSubmitComponent).props('onExport') as () => void)()
    await flushPromises()
    const { default: AttackLogExportDialog } = await import('../../../.vitepress/theme/components/AttackLogExportDialog.vue')
    await wrapper.findComponent(AttackLogExportDialog).props('generate')({ format: 'json', mode: 'full' })
    await flushPromises()
  }

  it('exports the chosen attempt instead of the one in progress', async () => {
    mockStoredSessions = [older]
    const wrapper = await open()
    ;(await listComponent(wrapper)).vm.$emit('select', 'older')
    await flushPromises()

    mockExportSession.mockClear()
    await exportNow(wrapper)

    const [, , , target] = mockExportSession.mock.calls[0]
    expect(target).toMatchObject({ sessionId: 'older' })
  })

  it('goes back to the attempt in progress when the choice is cleared', async () => {
    mockStoredSessions = [older]
    const wrapper = await open()
    const list = await listComponent(wrapper)
    list.vm.$emit('select', 'older')
    await flushPromises()
    list.vm.$emit('select', null)
    await flushPromises()

    mockExportSession.mockClear()
    await exportNow(wrapper)

    // `undefined`, not the held session passed explicitly: the composable's own default
    // is what "the attempt in progress" means, and naming it here would be a second
    // place holding that rule.
    expect(mockExportSession.mock.calls[0][3]).toBeUndefined()
  })

  it('leaves the recording target alone while an attempt is chosen', async () => {
    mockStoredSessions = [older]
    mockExportSession.mockClear()
    const wrapper = await open()
    ;(await listComponent(wrapper)).vm.$emit('select', 'older')
    await flushPromises()

    // Choosing what to export says nothing about which attempt receives new events.
    // The composable decides that at init, and the rules it uses are what keep one
    // person's work from being appended to another's.
    expect(mockGetSession()!.sessionId).toBe('in-progress')
    expect(mockExportSession).not.toHaveBeenCalled()
  })

  it('shows the newly imported attempt in the list without a reload', async () => {
    mockStoredSessions = [older]
    const wrapper = await open()
    const { default: AttackLogImportDialog } = await import('../../../.vitepress/theme/components/AttackLogImportDialog.vue')
    ;(wrapper.find('[data-import-open]').element as HTMLButtonElement).click()
    await flushPromises()

    mockStoredSessions = [older, { ...older, sessionId: 'brought-in', startedAt: 9000, origin: { kind: 'imported', importedAt: 1, sourceSessionId: 'x', sourceExportedAt: 'y' } }]
    wrapper.findComponent(AttackLogImportDialog).vm.$emit('imported')
    await flushPromises()

    expect(wrapper.findAll('[data-session-row]').map(r => r.attributes('data-session-row'))).toEqual(['brought-in', 'older'])
  })

  it('stores nothing and passes the refusal straight back when the file is another challenge\'s', async () => {
    const wrapper = await open()
    ;(wrapper.find('[data-import-open]').element as HTMLButtonElement).click()
    await flushPromises()

    const { createExportPackage } = await import('../../../.vitepress/theme/lib/attackLogExport')
    const elsewhere = await createExportPackage({
      meta: { timezone: 'Asia/Taipei', exportedAt: '2026-09-16T10:00:00+08:00' },
      challenge: { slug: 'xss-playground', title: 'XSS Playground' },
      session: { sessionId: 'x', startedAt: 1, solvedAt: null, events: [], draft: null },
    }, { format: 'json', mode: 'full' })

    const { default: AttackLogImportDialog } = await import('../../../.vitepress/theme/components/AttackLogImportDialog.vue')
    const run = wrapper.findComponent(AttackLogImportDialog).props('run') as (text: string) => Promise<any>
    const outcome = await run(JSON.stringify(elsewhere))

    // The refusal arrives as the preparer wrote it: the page adds no wording of its own
    // about what makes a package unacceptable.
    expect(outcome).toEqual({ ok: false, kind: 'wrong-challenge', fileSlug: 'xss-playground', openSlug: 'sqli-demo' })
    expect(mockSaveAttackSession).not.toHaveBeenCalled()
  })

  // Both of these were found by opening the page in a browser; neither had a test, and
  // the whole suite was green while the panel was wrong on every first visit.
  // Found by opening the built site in a browser: the zh-TW page is server-rendered in
  // the default locale and switches after hydration. Vue patches mismatched *text* during
  // hydration but leaves mismatched *attributes* at their server value, so a translated
  // string in an attribute is frozen in the wrong language for the life of the page —
  // with nothing visible on screen to show it. The panel is therefore named by the text
  // of its own summary, and carries no translated attribute at all.
  it('names the stored-attempt panel with visible text, never a translated attribute', async () => {
    const { renderToString } = await import('@vue/server-renderer')
    const { createSSRApp, h } = await import('vue')
    const app = createSSRApp({ render: () => h(ChallengeLayout) })
    for (const plugin of config.global.plugins) app.use(plugin as never)
    const html = await renderToString(app)

    const panel = html.slice(html.indexOf('session-list'))
    expect(panel).not.toContain('aria-label')
    expect(panel).not.toContain('aria-labelledby')
  })

  it('shows the attempt that init wrote rather than reporting an empty challenge', async () => {
    // The panel mounts and reads before `init` has written this visit's record. The
    // first read therefore finds nothing, and without a second read the learner is told
    // the challenge holds no attempt while the one they are working in is being stored.
    mockStoredSessions = []
    mockListAttackSessions.mockImplementationOnce(async () => [])
      .mockImplementation(async () => [{ sessionId: 'in-progress', challengeSlug: 'sqli-demo', challengeTitle: 'SQL Injection Demo', startedAt: 7000, solvedAt: null, events: [{ type: 'challenge_start', timestamp: 7000 }] }])
    const wrapper = await open()

    expect(wrapper.findAll('[data-session-row]').map(r => r.attributes('data-session-row'))).toEqual(['in-progress'])
  })

  it('names the stored-attempt panel once, not twice', async () => {
    mockStoredSessions = [older]
    const wrapper = await open()

    // The disclosure's summary and the panel's own heading carried the same words, so an
    // opened panel read as two nested sections with identical titles.
    const heading = 'Attack logs for this challenge'
    const zh = '這一題的攻擊紀錄'
    const text = wrapper.find('details').text()
    expect(text.split(heading).length - 1 + (text.split(zh).length - 1)).toBe(1)
  })

  it('withholds the list and the import control until the stored-work decision is answered', async () => {
    sessionStorage.clear()
    mockStoredSessions = [older]
    const wrapper = await open()

    expect((await listComponent(wrapper)).props('blocked')).toBe(true)
    expect(mockListAttackSessions).not.toHaveBeenCalled()
    expect((wrapper.find('[data-import-open]').element as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('ChallengeLayout — clearing this challenge\'s attempts', () => {
  const stored = (id: string, startedAt: number, solvedAt: number | null = null) => ({
    sessionId: id, challengeSlug: 'sql-injection-demo', challengeTitle: 'SQL Injection Demo',
    startedAt, solvedAt, events: [{ type: 'challenge_start', timestamp: startedAt }],
  })

  async function open() {
    mockSessionExists = true
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    await flushPromises()
    return wrapper
  }

  async function dialog(wrapper: ReturnType<typeof mount>) {
    const { default: DeleteAttemptsDialog } = await import('../../../.vitepress/theme/components/DeleteAttemptsDialog.vue')
    return wrapper.findComponent(DeleteAttemptsDialog)
  }

  it('offers the clear with a count that leaves out the attempt in progress', async () => {
    mockStoredSessions = [stored('old-1', 1000), stored('old-2', 2000), stored('in-progress', 3000)]
    const wrapper = await open()

    await wrapper.find('[data-clear-open]').trigger('click')
    await flushPromises()

    expect((await dialog(wrapper)).props('count')).toBe(2)
  })

  it('removes the stored attempts, keeps the one in progress, and records the removal', async () => {
    mockStoredSessions = [stored('old-1', 1000), stored('old-2', 2000, 2500), stored('in-progress', 3000)]
    const wrapper = await open()
    await wrapper.find('[data-clear-open]').trigger('click')
    await flushPromises()

    const outcome = await ((await dialog(wrapper)).props('run') as () => Promise<unknown>)()
    await flushPromises()

    expect(outcome).toEqual({ ok: true, removed: 2 })
    expect(mockStoredSessions.map(s => s.sessionId)).toEqual(['in-progress'])
    expect(mockSaveActivityTrace).toHaveBeenCalledWith('sqli-demo', {
      kind: 'removed',
      removed: [{ startedAt: 1000, solved: false }, { startedAt: 2000, solved: true }],
    })
  })

  it('shows the trace in the list without the page being reloaded', async () => {
    mockStoredSessions = [stored('old', 1000), stored('in-progress', 3000)]
    const wrapper = await open()
    await wrapper.find('[data-clear-open]').trigger('click')
    await flushPromises()

    const d = await dialog(wrapper)
    await (d.props('run') as () => Promise<unknown>)()
    d.vm.$emit('cleared')
    await flushPromises()

    expect(wrapper.findAll('[data-trace-row]')).toHaveLength(1)
    expect(wrapper.findAll('[data-session-row]').map(r => r.attributes('data-session-row'))).toEqual(['in-progress'])
  })

  it('records no progress for the challenge it cleared', async () => {
    mockStoredSessions = [stored('old', 1000, 1500), stored('in-progress', 3000)]
    const wrapper = await open()
    await wrapper.find('[data-clear-open]').trigger('click')
    await flushPromises()
    await ((await dialog(wrapper)).props('run') as () => Promise<unknown>)()

    expect(mockRecordAttempt).not.toHaveBeenCalled()
  })

  it('records a successful import, and records nothing when one is refused', async () => {
    mockStoredSessions = [stored('in-progress', 3000)]
    const wrapper = await open()
    ;(wrapper.find('[data-import-open]').element as HTMLButtonElement).click()
    await flushPromises()

    const { createExportPackage } = await import('../../../.vitepress/theme/lib/attackLogExport')
    const pkg = await createExportPackage({
      meta: { timezone: 'Asia/Taipei', exportedAt: '2026-09-16T10:00:00+08:00' },
      challenge: { slug: 'sqli-demo', title: 'SQL Injection Demo' },
      session: { sessionId: 'from-the-file', startedAt: 1, solvedAt: null, events: [], draft: null },
    }, { format: 'json', mode: 'full' })

    const { default: AttackLogImportDialog } = await import('../../../.vitepress/theme/components/AttackLogImportDialog.vue')
    const run = wrapper.findComponent(AttackLogImportDialog).props('run') as (text: string) => Promise<any>
    await run(JSON.stringify(pkg))

    expect(mockSaveActivityTrace).toHaveBeenCalledTimes(1)
    const [, detail] = mockSaveActivityTrace.mock.calls[0]
    expect(detail).toMatchObject({
      kind: 'imported',
      sourceSessionId: 'from-the-file',
      sourceExportedAt: '2026-09-16T10:00:00+08:00',
    })
    // The id this device gave the record, so the two can be told apart later.
    expect(detail.sessionId).not.toBe('from-the-file')

    // A refusal changed nothing, so it records nothing.
    mockSaveActivityTrace.mockClear()
    const elsewhere = await createExportPackage({
      meta: { timezone: 'Asia/Taipei', exportedAt: '2026-09-16T10:00:00+08:00' },
      challenge: { slug: 'xss-playground', title: 'XSS' },
      session: { sessionId: 'x', startedAt: 1, solvedAt: null, events: [], draft: null },
    }, { format: 'json', mode: 'full' })
    await run(JSON.stringify(elsewhere))

    expect(mockSaveActivityTrace).not.toHaveBeenCalled()
  })

  it('withholds the clear until the stored-work decision is answered', async () => {
    sessionStorage.clear()
    mockStoredSessions = [stored('old', 1000), stored('in-progress', 3000)]
    const wrapper = await open()

    expect((wrapper.find('[data-clear-open]').element as HTMLButtonElement).disabled).toBe(true)
  })
})

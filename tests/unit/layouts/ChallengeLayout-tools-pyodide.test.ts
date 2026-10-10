import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

/**
 * The Code panel must NOT run user code on the challenge runtime. That runtime
 * owns the challenge's virtual filesystem, flag file included, so sharing it
 * lets a one-line file read bypass every challenge.
 *
 * These tests pin the wiring: the runner handed to CodeEditorPanel is backed by
 * its own worker, that worker is a different object from the challenge's, and it
 * is not created until the user actually opens the Code tab.
 *
 * The separation used to be "a second Pyodide instance"; it is now "a second
 * worker holding a second Pyodide instance". The guard is therefore stronger
 * than before, and each assertion below is written against the new boundary
 * rather than relaxed to fit it.
 */

const wk = vi.hoisted(() => {
  interface Stub {
    id: string
    sent: Record<string, unknown>[]
    terminated: boolean
    onmessage: ((e: { data: unknown }) => void) | null
    /** A worker that dies outside a message handler reports here and nowhere
     *  else. Off the stub, that failure path is untestable from the page's side. */
    onerror: ((e: { message?: string }) => void) | null
    postMessage(msg: unknown): void
    terminate(): void
  }
  function make(id: string, autoReady: boolean): Stub {
    const s: Stub = {
      id,
      sent: [],
      terminated: false,
      onmessage: null,
      onerror: null,
      postMessage(msg: unknown) {
        const m = msg as { type: string; id: number }
        s.sent.push(m as unknown as Record<string, unknown>)
        // The challenge worker answers INIT so the layout reaches a ready
        // state; without it every assertion below would pass against a layout
        // that simply never got started.
        if (autoReady && (m.type === 'INIT' || m.type === 'WARM_UP')) {
          queueMicrotask(() => s.onmessage?.({ data: { type: 'READY', id: m.id } }))
        }
      },
      terminate() { s.terminated = true },
    }
    return s
  }
  return {
    make,
    challengeWorkers: [] as Stub[],
    toolsWorkers: [] as Stub[],
    createChallengeWorker: vi.fn(),
    createToolsWorker: vi.fn(),
  }
})

vi.mock('vitepress', () => ({
  useData: vi.fn(() => ({
    frontmatter: {
      value: {
        title: 'Isolation Fixture',
        difficulty: 'easy',
        category: 'web',
        backend: 'flask',
        slug: 'isolation-fixture',
        wasmModule: '/challenge/isolation-fixture/runtime.wasm',
        tools: ['browser', 'network', 'repeater', 'code'],
        description: 'fixture',
        markdownBody: '# fixture',
      },
    },
    page: { value: { relativePath: 'challenge/isolation-fixture/index.md' } },
  })),
  withBase: vi.fn((url: string) => url),
}))

vi.mock('vitepress/client', () => ({
  Content: defineComponent({ render: () => h('div', { class: 'vp-doc' }, 'desc') }),
}))

vi.mock('../../../.vitepress/theme/components/BrowserPanel.vue', () => ({
  default: defineComponent({ props: ['slug', 'dispatch', 'disabled'], template: '<div data-browser-panel />' }),
}))
vi.mock('../../../.vitepress/theme/components/RepeatPanel.vue', () => ({
  default: defineComponent({ props: ['slug', 'dispatch', 'disabled', 'injectedRequest'], template: '<div data-repeat-panel />' }),
}))
vi.mock('../../../.vitepress/theme/components/NetworkPanel.vue', () => ({
  default: defineComponent({ props: ['trafficLog', 'canSendToRepeater'], emits: ['clear', 'sendToRepeater'], template: '<div data-network-panel />' }),
}))
vi.mock('../../../.vitepress/theme/components/CodeEditorPanel.vue', () => ({
  default: defineComponent({
    props: ['slug', 'dispatch', 'disabled', 'runner', 'runnerLoading', 'runnerError', 'onCodeExecuted', 'codeHistory'],
    template: '<div data-code-panel />',
  }),
}))
vi.mock('../../../.vitepress/theme/components/FlagSubmit.vue', () => ({
  default: defineComponent({ props: ['verify', 'onExport', 'onExportNotes'], template: '<div data-flag-submit />' }),
}))
vi.mock('../../../.vitepress/theme/components/DescriptionModal.vue', () => ({
  default: defineComponent({ props: ['title', 'difficulty', 'category'], emits: ['close'], template: '<div data-description-modal />' }),
}))
vi.mock('../../../.vitepress/theme/components/MergedNav.vue', () => ({
  default: defineComponent({
    props: ['title', 'difficulty', 'category', 'runtimeReady', 'runtimeError', 'noteCount', 'descriptionCollapsed'],
    emits: ['open-notes', 'toggle-description'],
    template: '<nav data-merged-nav :data-runtime-ready="String(runtimeReady)" :data-runtime-error="String(runtimeError)" />',
  }),
}))

vi.mock('../../../.vitepress/theme/composables/useWasmLoader', () => ({
  extractCustomSection: vi.fn(() => new Uint8Array([1, 2, 3])),
}))

vi.mock('../../../.vitepress/wasm/virtual-fs/virtual_fs.js', () => ({
  default: vi.fn(async () => undefined),
  wasm_fs_init: vi.fn(),
  wasm_fs_read: vi.fn(() => new TextEncoder().encode('app = None')),
  wasm_fs_list: vi.fn(() => JSON.stringify(['__app__'])),
  wasm_verify_flag: vi.fn(() => false),
}))

vi.mock('../../../.vitepress/theme/workers/workerFactories', () => ({
  createChallengeWorker: wk.createChallengeWorker,
  createToolsWorker: wk.createToolsWorker,
}))

vi.mock('../../../.vitepress/theme/composables/useAttackSession', () => ({
  useAttackSession: vi.fn(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    getSession: vi.fn(() => null),
    addHttpEvent: vi.fn(),
    addCodeExecution: vi.fn(),
    addFlagAttempt: vi.fn(),
    exportSession: vi.fn(),
  })),
}))

let ChallengeLayout: typeof import('../../../.vitepress/theme/layouts/ChallengeLayout.vue').default

async function mountLayout() {
  const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
  // initRuntime awaits a chain of dynamic imports; one microtask flush is not
  // enough for it to reach the end.
  for (let i = 0; i < 10; i++) await flushPromises()
  return wrapper
}

async function codePanelProps(wrapper: Awaited<ReturnType<typeof mountLayout>>) {
  const { default: CodePanel } = await import('../../../.vitepress/theme/components/CodeEditorPanel.vue')
  return wrapper.findComponent(CodePanel)
}

beforeEach(async () => {
  vi.resetModules()
  wk.challengeWorkers.length = 0
  wk.toolsWorkers.length = 0
  wk.createChallengeWorker.mockReset()
  wk.createChallengeWorker.mockImplementation(() => {
    const w = wk.make(`challenge-${wk.challengeWorkers.length}`, true)
    wk.challengeWorkers.push(w)
    return w
  })
  wk.createToolsWorker.mockReset()
  wk.createToolsWorker.mockImplementation(() => {
    const w = wk.make(`tools-${wk.toolsWorkers.length}`, true)
    wk.toolsWorkers.push(w)
    return w
  })
  vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })))
  const mod = await import('../../../.vitepress/theme/layouts/ChallengeLayout.vue')
  ChallengeLayout = mod.default
})

describe('fixture integrity', () => {
  // Guards the tests below from passing for the wrong reason. If initRuntime
  // bails, pyodideInstance stays null and several assertions below go green
  // against the very wiring they are meant to reject.
  it('the fixture actually initialises the challenge runtime', async () => {
    const wrapper = await mountLayout()
    const nav = wrapper.find('[data-merged-nav]')
    expect(nav.attributes('data-runtime-error')).toBe('null')
    expect(nav.attributes('data-runtime-ready')).toBe('true')
    wrapper.unmount()
  })
})

describe('Code Editor Panel runs on a runtime separate from the challenge runtime', () => {
  it('hands the panel a runner backed by its own worker, not the challenge one', async () => {
    const wrapper = await mountLayout()
    await wrapper.find('[data-tab="code"]').trigger('click')
    await flushPromises()

    const panel = await codePanelProps(wrapper)
    expect(panel.props('runner')).toBeTruthy()
    expect(wk.toolsWorkers).toHaveLength(1)
    expect(wk.challengeWorkers).toHaveLength(1)
    // Two different workers, and therefore two different WebAssembly memories
    // and two different filesystems. Sharing one is what let a single file read
    // reach the flag.
    expect(wk.toolsWorkers[0]).not.toBe(wk.challengeWorkers[0])
    wrapper.unmount()
  })

  it('never sends learner code to the challenge worker', async () => {
    const wrapper = await mountLayout()
    await wrapper.find('[data-tab="code"]').trigger('click')
    await flushPromises()

    // The challenge worker's protocol has no RUN_CODE. Asserting on the messages
    // rather than on which object the panel ended up holding is deliberate: an
    // instance handed over during init and overwritten a moment later leaves a
    // final state indistinguishable from the correct wiring.
    expect(wk.challengeWorkers[0].sent.some(m => m.type === 'RUN_CODE')).toBe(false)
    wrapper.unmount()
  })
})

describe('Code Editor Panel loads its Python runtime lazily', () => {
  it('creates no tools worker for a user who never opens the Code tab', async () => {
    const wrapper = await mountLayout()
    expect(wk.createToolsWorker).not.toHaveBeenCalled()

    const panel = await codePanelProps(wrapper)
    expect(panel.props('runner')).toBeNull()
    wrapper.unmount()
  })

  it('creates the runner on the first Code tab activation', async () => {
    const wrapper = await mountLayout()
    await wrapper.find('[data-tab="code"]').trigger('click')
    await flushPromises()

    const panel = await codePanelProps(wrapper)
    expect(panel.props('runner')).toBeTruthy()
    expect(panel.props('runnerLoading')).toBe(false)
    wrapper.unmount()
  })

  it('reuses the runner on a second activation', async () => {
    const wrapper = await mountLayout()
    await wrapper.find('[data-tab="code"]').trigger('click')
    await flushPromises()
    const first = (await codePanelProps(wrapper)).props('runner')

    await wrapper.find('[data-tab="browser"]').trigger('click')
    await wrapper.find('[data-tab="code"]').trigger('click')
    await flushPromises()

    expect((await codePanelProps(wrapper)).props('runner')).toBe(first)
    wrapper.unmount()
  })
})

describe('tools worker creation failure surfaces instead of falling back', () => {
  it('reports the failure and hands the panel no runner at all', async () => {
    wk.createToolsWorker.mockImplementation(() => { throw new Error('worker script unreachable') })

    const wrapper = await mountLayout()
    await wrapper.find('[data-tab="code"]').trigger('click')
    await flushPromises()

    const panel = await codePanelProps(wrapper)
    expect(panel.props('runnerError')).toContain('worker script unreachable')
    // No fallback. Handing over the challenge runtime here would restore the
    // very bypass this split exists to close, and it would do so silently.
    expect(panel.props('runner')).toBeNull()
    expect(wk.challengeWorkers[0].sent.some(m => m.type === 'RUN_CODE')).toBe(false)
    wrapper.unmount()
  })
})

describe('a runtime reset is shown to the learner, not just recorded', () => {
  it('displays a notice when a runaway execution replaced the runtime', async () => {
    const wrapper = await mountLayout()
    expect(wrapper.find('[data-runtime-reset]').exists()).toBe(false)

    // Reach the host's onReset the way the deadline does. Asserting on the
    // rendered output rather than on the callback is the point: the callback
    // fired correctly before this test existed, and terminated in a ref nothing
    // read — green end to end, and invisible to the learner.
    const init = wk.challengeWorkers[0].sent.find(m => m.type === 'INIT')
    expect(init, 'the fixture never initialised the runtime').toBeDefined()
    ;(wrapper.vm as unknown as { runtimeWasReset: boolean }).runtimeWasReset = true
    await flushPromises()

    const notice = wrapper.find('[data-runtime-reset]')
    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain('login')
    wrapper.unmount()
  })
})

describe('a tools runtime that fails to load surfaces instead of pretending to be ready', () => {
  it('reports an asynchronous load failure and hands over no runner', async () => {
    wk.createToolsWorker.mockImplementation(() => {
      // Loads, then fails — a Pyodide download that 404s, not a worker script
      // that cannot be constructed. Only the synchronous failure had a path
      // back before, and the guard test covering it made the gap invisible.
      const w = wk.make('tools-failing', false)
      const post = w.postMessage.bind(w)
      w.postMessage = (msg: unknown) => {
        post(msg)
        const m = msg as { type: string; id: number }
        if (m.type === 'WARM_UP') {
          queueMicrotask(() => w.onmessage?.({ data: { type: 'INIT_FAILED', id: m.id, error: 'pyodide.js unreachable' } }))
        }
      }
      wk.toolsWorkers.push(w)
      return w
    })

    const wrapper = await mountLayout()
    await wrapper.find('[data-tab="code"]').trigger('click')
    await flushPromises()
    await flushPromises()

    const panel = await codePanelProps(wrapper)
    expect(panel.props('runnerError')).toContain('pyodide.js unreachable')
    expect(panel.props('runner')).toBeNull()
    expect(panel.props('runnerLoading')).toBe(false)
    wrapper.unmount()
  })
})

describe('panel dispatch always yields a Response, never a rejection', () => {
  it('answers 503 when the host holds a runtime that failed to initialize', async () => {
    // The host must exist and throw — not be absent. Unmounting nulls the host,
    // so a test written that way hits the early return instead and proves
    // nothing about the throwing path. That mistake was live until a mutation
    // that removed the conversion killed no test at all.
    wk.createChallengeWorker.mockImplementation(() => {
      const w = wk.make('challenge-failing', false)
      const post = w.postMessage.bind(w)
      w.postMessage = (msg: unknown) => {
        post(msg)
        const m = msg as { type: string; id: number }
        if (m.type === 'INIT') {
          queueMicrotask(() => w.onmessage?.({ data: { type: 'INIT_FAILED', id: m.id, error: 'runtime is gone' } }))
        }
      }
      wk.challengeWorkers.push(w)
      return w
    })

    const wrapper = await mountLayout()
    const dispatch = (globalThis as unknown as { __wxlDispatch?: (r: Request) => Promise<Response> }).__wxlDispatch
    expect(dispatch, 'the dev dispatch hook was not exposed').toBeTypeOf('function')

    // Panel callers and the traffic-log wrapper have always been able to assume
    // a Response comes back; a rejection loses the answer and the log entry.
    const res = await dispatch!(new Request('https://challenge-x.localhost/'))
    expect(res).toBeInstanceOf(Response)
    expect(res.status).toBe(503)
    expect(await res.text()).toContain('runtime is gone')
    wrapper.unmount()
  })
})

describe('leaving the challenge takes its workers with it', () => {
  it('terminates both workers on unmount', async () => {
    const wrapper = await mountLayout()
    await wrapper.find('[data-tab="code"]').trigger('click')
    await flushPromises()

    expect(wk.challengeWorkers[0].terminated).toBe(false)
    expect(wk.toolsWorkers[0].terminated).toBe(false)

    wrapper.unmount()

    // A Worker outlives the component that made it. Before this change a
    // discarded runtime was simply garbage; now each one is a live thread
    // holding a loaded WebAssembly runtime for as long as the tab is open.
    expect(wk.challengeWorkers[0].terminated).toBe(true)
    expect(wk.toolsWorkers[0].terminated).toBe(true)
  })
})

describe('a tools worker that dies mid-session does not leave the panel loading forever', () => {
  it('withdraws the runner and shows the cause', async () => {
    const wrapper = await mountLayout()
    await wrapper.find('[data-tab="code"]').trigger('click')
    await flushPromises()
    expect((await codePanelProps(wrapper)).props('runner')).toBeTruthy()

    // The host has always flipped an internal `ready` flag here. Nothing read
    // it: the panel gates Run on the runner it holds, so a dead worker left Run
    // enabled over nothing and, once the runner was withdrawn without a cause,
    // left the overlay up with nothing to show.
    wk.toolsWorkers[0].onerror?.({ message: 'worker died mid-session' })
    await flushPromises()

    const panel = await codePanelProps(wrapper)
    expect(panel.props('runner')).toBeNull()
    expect(panel.props('runnerError')).toContain('worker died mid-session')
    wrapper.unmount()
  })
})

describe('leaving during the warm-up still takes the tools worker with it', () => {
  it('destroys a tools host that has not become ready yet', async () => {
    // No auto-READY: this worker is still downloading its Pyodide when the
    // learner leaves. That is not a corner case — the download is tens of
    // megabytes, and it is the window in which someone decides to navigate away.
    wk.createToolsWorker.mockImplementation(() => {
      const w = wk.make(`tools-${wk.toolsWorkers.length}`, false)
      wk.toolsWorkers.push(w)
      return w
    })

    const wrapper = await mountLayout()
    await wrapper.find('[data-tab="code"]').trigger('click')
    await flushPromises()
    expect(wk.toolsWorkers).toHaveLength(1)

    wrapper.unmount()
    await flushPromises()

    // The unmount hook reaches the host through the panel's gating ref, and that
    // ref is null until readiness flips. Holding the host only there means the
    // worker keeps its download — and, mid-run, keeps burning CPU — for a page
    // nobody is on. That is the leak this change added a requirement for.
    expect(wk.toolsWorkers[0].terminated).toBe(true)
  })
})

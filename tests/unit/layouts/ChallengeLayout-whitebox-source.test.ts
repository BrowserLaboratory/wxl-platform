import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

/**
 * White-box wiring in the challenge page: which tabs exist, what the Source panel shows
 * while and after the payload decrypts, and what the challenge runtime is allowed to see.
 *
 * The runtime host is mocked at the module boundary so the `initialize` argument can be
 * inspected directly. That argument is the contract this file cares about: the reserved
 * payload keys must never reach the challenge's own filesystem.
 */

const fmValue = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}))

const host = vi.hoisted(() => ({
  initialize: vi.fn(async (_opts: unknown) => undefined),
  handleRequest: vi.fn(),
  destroy: vi.fn(),
}))

const fsList = vi.hoisted(() => ({ paths: ['__app__'] as string[] }))
const fsRead = vi.hoisted(() => ({
  contents: {} as Record<string, string>,
}))

vi.mock('vitepress', () => ({
  useData: vi.fn(() => ({
    frontmatter: { value: fmValue.current },
    page: { value: { relativePath: 'challenge/probe/index.md' } },
  })),
  withBase: vi.fn((url: string) => url),
}))

vi.mock('vitepress/client', () => ({
  Content: defineComponent({ render: () => h('div', { class: 'vp-doc' }, 'description') }),
}))

for (const [path, tag] of [
  ['BrowserPanel', 'data-browser-panel'],
  ['RepeatPanel', 'data-repeat-panel'],
  ['NetworkPanel', 'data-network-panel'],
  ['CodeEditorPanel', 'data-code-panel'],
] as const) {
  vi.doMock(`../../../.vitepress/theme/components/${path}.vue`, () => ({
    default: defineComponent({
      props: ['slug', 'dispatch', 'disabled', 'injectedRequest', 'trafficLog', 'canSendToRepeater', 'runner', 'runnerLoading', 'runnerError', 'codeHistory'],
      template: `<div ${tag} />`,
    }),
  }))
}

vi.mock('../../../.vitepress/theme/components/FlagSubmit.vue', () => ({
  default: defineComponent({ props: ['verify', 'onExport', 'onExportNotes'], template: '<div data-flag-submit />' }),
}))
vi.mock('../../../.vitepress/theme/components/MergedNav.vue', () => ({
  default: defineComponent({
    props: ['title', 'difficulty', 'category', 'runtimeReady', 'runtimeError', 'noteCount', 'descriptionCollapsed'],
    emits: ['open-notes', 'toggle-description'],
    template: '<nav data-merged-nav />',
  }),
}))

vi.mock('../../../.vitepress/theme/composables/useWasmLoader', () => ({
  extractCustomSection: vi.fn(() => new Uint8Array([1, 2, 3])),
}))

vi.mock('../../../.vitepress/wasm/virtual-fs/virtual_fs.js', () => ({
  default: vi.fn(async () => undefined),
  wasm_fs_init: vi.fn(),
  wasm_fs_read: vi.fn((path: string) =>
    new TextEncoder().encode(fsRead.contents[path] ?? `bytes-for-${path}`),
  ),
  wasm_fs_list: vi.fn(() => JSON.stringify(fsList.paths)),
  wasm_verify_flag: vi.fn(() => false),
}))

vi.mock('../../../.vitepress/theme/workers/runtimeHost', () => ({
  createChallengeRuntimeHost: vi.fn(() => host),
  createToolsRuntimeHost: vi.fn(() => ({
    warmUp: vi.fn(async () => undefined),
    destroy: vi.fn(),
  })),
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

const BLACK_BOX = {
  title: 'Probe',
  difficulty: 'easy',
  category: 'web',
  backend: 'flask',
  wasmModule: '/challenge/probe/runtime.wasm',
  packages: [],
  tools: ['browser', 'network', 'repeater', 'code'],
}

let ChallengeLayout: typeof import('../../../.vitepress/theme/layouts/ChallengeLayout.vue').default

async function mountLayout() {
  const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
  for (let i = 0; i < 12; i++) await flushPromises()
  return wrapper
}

function tabIds(wrapper: { findAll: (s: string) => { attributes: (a: string) => string | undefined }[] }): string[] {
  return wrapper.findAll('[data-tab]').map((b) => b.attributes('data-tab') as string)
}

beforeEach(async () => {
  vi.resetModules()
  host.initialize.mockClear()
  fsList.paths = ['__app__']
  fsRead.contents = {}
  fmValue.current = { ...BLACK_BOX }
  vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })))
  const mod = await import('../../../.vitepress/theme/layouts/ChallengeLayout.vue')
  ChallengeLayout = mod.default
})

describe('reserved payload keys are withheld from the challenge virtual filesystem', () => {
  it('does not hand __source__ to the runtime, and still hands over the flag file', async () => {
    fmValue.current = { ...BLACK_BOX, source_visible: true }
    fsList.paths = ['__app__', '/flag.txt', '__source__']
    fsRead.contents = {
      __app__: 'app = None',
      __source__: JSON.stringify({ files: [{ path: 'app.py', content: 'app = None' }] }),
    }
    await mountLayout()

    expect(host.initialize).toHaveBeenCalledTimes(1)
    const fsEntries = (host.initialize.mock.calls[0][0] as { fsEntries: Record<string, unknown> }).fsEntries
    expect(Object.keys(fsEntries)).not.toContain('__source__')
    expect(Object.keys(fsEntries)).not.toContain('__app__')
    expect(Object.keys(fsEntries)).toContain('/flag.txt')
  })
})

describe('Source tab presence is governed by source_visible alone', () => {
  it('shows the Source tab for a white-box challenge listing the four tools', async () => {
    fmValue.current = { ...BLACK_BOX, source_visible: true }
    const wrapper = await mountLayout()
    expect(tabIds(wrapper)).toEqual(['browser', 'network', 'repeater', 'code', 'source'])
  })

  it('omits the Source tab and any viewer element for a black-box challenge', async () => {
    const wrapper = await mountLayout()
    expect(tabIds(wrapper)).not.toContain('source')
    expect(wrapper.find('[data-source-viewer]').exists()).toBe(false)
  })

  it('omits the Source tab when source_visible is absent from the frontmatter', async () => {
    const { source_visible: _omit, ...withoutField } = { ...BLACK_BOX, source_visible: true }
    fmValue.current = withoutField
    const wrapper = await mountLayout()
    expect(tabIds(wrapper)).not.toContain('source')
  })

  // The tools allowlist governs the four attack tools and nothing else. Requiring authors
  // to keep two fields in agreement would make "wrote source_visible, forgot tools" a
  // silent failure: the build succeeds, the challenge runs, the learner sees no source.
  it('shows the Source tab even when tools lists only browser', async () => {
    fmValue.current = { ...BLACK_BOX, source_visible: true, tools: ['browser'] }
    const wrapper = await mountLayout()
    expect(tabIds(wrapper)).toEqual(['browser', 'source'])
  })
})

describe('Source tab exists before decryption completes and reports its states', () => {
  it('keeps the tab set identical before and after the payload decrypts', async () => {
    fmValue.current = { ...BLACK_BOX, source_visible: true }
    fsList.paths = ['__app__', '__source__']
    fsRead.contents = {
      __source__: JSON.stringify({ files: [{ path: 'app.py', content: 'app = None' }] }),
    }
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    const before = tabIds(wrapper)
    for (let i = 0; i < 12; i++) await flushPromises()
    expect(tabIds(wrapper)).toEqual(before)
    expect(before).toContain('source')
  })

  it('reports a loading state on the Source panel before the payload has decrypted', async () => {
    fmValue.current = { ...BLACK_BOX, source_visible: true }
    const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
    expect(wrapper.find('[data-source-loading]').exists()).toBe(true)
    expect(wrapper.find('[data-source-error]').exists()).toBe(false)
  })

  // An empty panel is indistinguishable from "this challenge has no source", which is
  // exactly the wrong reading: the WASM is stale and needs re-keying.
  it('names the keygen step when decryption finishes with no __source__ entry', async () => {
    fmValue.current = { ...BLACK_BOX, source_visible: true }
    fsList.paths = ['__app__']
    const wrapper = await mountLayout()
    const error = wrapper.find('[data-source-error]')
    expect(error.exists()).toBe(true)
    expect(error.text()).toMatch(/keygen/i)
    expect(wrapper.find('[data-source-loading]').exists()).toBe(false)
  })
})

describe('Source panel leaves its loading state when the runtime never starts', () => {
  // The loading flag is cleared inside the runtime initialiser once decryption has run.
  // Every earlier exit — the WASM fetch failing here — used to leave the panel announcing
  // a load that would never finish, on a role="status" region a screen reader keeps
  // waiting on. The message is also not the stale-payload one: "re-run keygen" is the
  // wrong instruction when the payload was never opened.
  it('reports a runtime error instead of loading forever when the WASM fetch rejects', async () => {
    fmValue.current = { ...BLACK_BOX, source_visible: true }
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    const wrapper = await mountLayout()
    expect(wrapper.find('[data-source-loading]').exists()).toBe(false)
    const error = wrapper.find('[data-source-error]')
    expect(error.exists()).toBe(true)
    expect(error.text()).toMatch(/runtime did not start/i)
    expect(error.text()).not.toMatch(/keygen/i)
  })

  // The other half of the same requirement: once the display copy has been read, a
  // runtime that fails later must not take it away. The worker host is the first thing
  // after decryption that can throw, so it is the one made to.
  it('keeps the display copy when the runtime fails after decryption', async () => {
    fmValue.current = { ...BLACK_BOX, source_visible: true }
    fsList.paths = ['__app__', '__source__']
    fsRead.contents = {
      __app__: 'app = None',
      __source__: JSON.stringify({ files: [{ path: 'app.py', content: 'app = None' }] }),
    }
    host.initialize.mockRejectedValueOnce(new Error('worker exploded'))
    const wrapper = await mountLayout()
    expect(wrapper.find('[data-source-viewer]').exists()).toBe(true)
    expect(wrapper.find('[data-source-loading]').exists()).toBe(false)
    expect(wrapper.find('[data-source-error]').exists()).toBe(false)
  })

  it('reports a runtime error when the WASM carries no payload section', async () => {
    fmValue.current = { ...BLACK_BOX, source_visible: true }
    const { extractCustomSection } = await import('../../../.vitepress/theme/composables/useWasmLoader')
    ;(extractCustomSection as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(null)
    const wrapper = await mountLayout()
    expect(wrapper.find('[data-source-loading]').exists()).toBe(false)
    expect(wrapper.find('[data-source-error]').text()).toMatch(/runtime did not start/i)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

/**
 * A `runtime.wasm` built before `wasm_fs_list` existed (D76, Y50).
 *
 * `fs` used to be read as a fallback source of virtual-filesystem paths when a loaded
 * module had no `wasm_fs_list` export. D76 retires that fallback: every current
 * `runtime.wasm` is rebuilt by keygen from the `virtual-fs` template, which always
 * exports `wasm_fs_list`, so a module without it is stale, and the page shows its
 * runtime-error state naming `pnpm challenge:keygen` instead of reading `fs`.
 */

const fmValue = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}))

const host = vi.hoisted(() => ({
  initialize: vi.fn(async (_opts: unknown) => undefined),
  handleRequest: vi.fn(),
  destroy: vi.fn(),
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
    template: '<nav data-merged-nav :data-runtime-error="String(runtimeError)" />',
  }),
}))

vi.mock('../../../.vitepress/theme/composables/useWasmLoader', () => ({
  extractCustomSection: vi.fn(() => new Uint8Array([1, 2, 3])),
}))

// The legacy module: no `wasm_fs_list` export at all, as a `runtime.wasm` built before
// keygen started emitting it.
vi.mock('../../../.vitepress/wasm/virtual-fs/virtual_fs.js', () => ({
  default: vi.fn(async () => undefined),
  wasm_fs_init: vi.fn(),
  wasm_fs_read: vi.fn((path: string) => new TextEncoder().encode(`bytes-for-${path}`)),
  // The export itself is absent on a module built before keygen started emitting it —
  // declared here as `undefined` rather than omitted, so the mock does not throw on
  // destructuring an export it never claimed to have.
  wasm_fs_list: undefined,
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
  // D76: carrying `fs` changes nothing once `wasm_fs_list` is absent — it is never read.
  fs: { '/flag.txt': 'FLAG{legacy}' },
}

let ChallengeLayout: typeof import('../../../.vitepress/theme/layouts/ChallengeLayout.vue').default

async function mountLayout() {
  const wrapper = mount(ChallengeLayout, { global: { stubs: { Content: true } } })
  for (let i = 0; i < 12; i++) await flushPromises()
  return wrapper
}

beforeEach(async () => {
  vi.resetModules()
  host.initialize.mockClear()
  fmValue.current = { ...BLACK_BOX }
  vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })))
  const mod = await import('../../../.vitepress/theme/layouts/ChallengeLayout.vue')
  ChallengeLayout = mod.default
})

describe('a WASM module without wasm_fs_list (Y50)', () => {
  it('shows the runtime-error state naming pnpm challenge:keygen, and never reads frontmatter fs', async () => {
    const wrapper = await mountLayout()

    const nav = wrapper.find('[data-merged-nav]')
    expect(nav.attributes('data-runtime-error')).toMatch(/pnpm challenge:keygen/)
    // The runtime never got far enough to hand anything to the host.
    expect(host.initialize).not.toHaveBeenCalled()
  })
})

import { beforeEach, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import 'fake-indexeddb/auto'

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); vi.resetModules() })

it.each(['marker', 'keep'])('updates actual hydrated controls after %s and revokes on clear', async mode => {
  const gate = await import('../../../.vitepress/theme/composables/useSessionGate')
  const Control = defineComponent({
    setup() {
      const allowed = gate.useProgressAccess()
      return () => h('div', [h('input', { disabled: !allowed.value }), h('button', { disabled: !allowed.value }, 'Submit')])
    },
  })
  const container = document.createElement('div')
  container.innerHTML = await renderToString(createSSRApp(Control))
  document.body.append(container)
  expect(container.querySelector('input')!.disabled).toBe(true)
  if (mode === 'marker') sessionStorage.setItem(gate.GATE_STORAGE_KEY, gate.GATE_DECIDED)
  const app = createSSRApp(Control)
  app.mount(container)
  if (mode === 'keep') {
    expect(container.querySelector('input')!.disabled).toBe(true)
    gate.useSessionGate().keepExistingData()
  }
  await nextTick()
  expect(container.querySelector('input')!.disabled).toBe(false)
  expect(container.querySelector('button')!.disabled).toBe(false)
  const clearing = gate.useSessionGate().clearEverything(() => {})
  await nextTick()
  expect(container.querySelector('input')!.disabled).toBe(true)
  expect(container.querySelector('button')!.disabled).toBe(true)
  await clearing
  app.unmount(); container.remove()
})

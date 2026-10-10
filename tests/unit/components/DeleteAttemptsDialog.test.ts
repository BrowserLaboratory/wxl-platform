import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Dialog from '../../../.vitepress/theme/components/DeleteAttemptsDialog.vue'

const open = (run: unknown, count = 2) => mount(Dialog, { props: { count, run } })

describe('Delete attempts dialog', () => {
  it('removes nothing until the confirmation is accepted', async () => {
    const run = vi.fn().mockResolvedValue({ ok: true, removed: 2 })
    const wrapper = open(run)

    expect(run).not.toHaveBeenCalled()
    const shown = wrapper.text()
    // The three things the learner needs before this becomes irreversible.
    expect(shown).toContain('2')
    expect(shown).toContain('無法復原')
    expect(shown).toContain('解題進度不受影響')

    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(run).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('cleared')).toHaveLength(1)
    wrapper.unmount()
  })

  it('does not start a second removal while one is running', async () => {
    let finish!: (value: unknown) => void
    const run = vi.fn(() => new Promise(resolve => { finish = resolve }))
    const wrapper = open(run)

    await wrapper.find('form').trigger('submit')
    await wrapper.find('form').trigger('submit')

    expect(run).toHaveBeenCalledTimes(1)
    expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined()
    finish({ ok: true, removed: 2 })
    await flushPromises()
    wrapper.unmount()
  })

  it.each([
    ['ok', { ok: true, removed: 2 }, '已移除 2 筆紀錄', 'status'],
    ['partial', { ok: false, kind: 'partial', removed: 1 }, '只移除了 1 筆', 'alert'],
    ['no-trace', { ok: false, kind: 'no-trace', removed: 2 }, '沒有留下痕跡', 'alert'],
  ] as const)('reports the %s outcome in its own words', async (_kind, outcome, fragment, role) => {
    const wrapper = open(vi.fn().mockResolvedValue(outcome))
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find(`[role="${role}"]`).text()).toContain(fragment)
    wrapper.unmount()
  })

  it('does not report a removal that left no trace as plain success', async () => {
    const wrapper = open(vi.fn().mockResolvedValue({ ok: false, kind: 'no-trace', removed: 2 }))
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    // Saying "removed and traced" when nothing was traced tells the learner their
    // removal is marked when it is not.
    expect(wrapper.text()).not.toContain('並留下一筆刪除痕跡')
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('treats a thrown removal as a removal that did not finish', async () => {
    const wrapper = open(vi.fn().mockRejectedValue(new Error('database gone')))
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.emitted('cleared')).toBeUndefined()
    wrapper.unmount()
  })

  it.each([
    ['partial', { ok: false, kind: 'partial', removed: 1 }, 1],
    ['no-trace', { ok: false, kind: 'no-trace', removed: 2 }, 1],
    ['nothing removed', { ok: true, removed: 0 }, 0],
  ] as const)('announces a changed record set on %s', async (_kind, outcome, times) => {
    const wrapper = open(vi.fn().mockResolvedValue(outcome))
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    // What the page needs to know is whether the stored set changed, not whether the
    // removal was clean. A partial removal that took one of three records still leaves
    // a list showing records that are gone.
    expect(wrapper.emitted('cleared') ?? []).toHaveLength(times)
    wrapper.unmount()
  })

  it('never describes itself as an audit trail', async () => {
    const wrapper = open(vi.fn().mockResolvedValue({ ok: true, removed: 2 }))
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    for (const overclaim of ['稽核', '防竄改', '未經竄改', '無法刪除', '永久保留']) {
      expect(wrapper.text()).not.toContain(overclaim)
    }
    wrapper.unmount()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import FlagSubmit from '../../../.vitepress/theme/components/FlagSubmit.vue'
import { useFlagSubmission } from '../../../.vitepress/theme/composables/flagSubmission'

const CORRECT_FLAG = 'CTF{test_flag}'

describe('FlagSubmit persistence feedback', () => {
  it('a newly mounted second entry point inherits pending and the eventual result', async () => {
    let finish!: (value: { correct: boolean; saved: boolean }) => void
    const verify = vi.fn(() => new Promise<{ correct: boolean; saved: boolean }>(resolve => { finish = resolve }))
    const submission = useFlagSubmission(verify)
    const first = mount(FlagSubmit, { props: { verify, submission } })
    await first.find('[data-submit]').trigger('click')
    const second = mount(FlagSubmit, { props: { verify, submission } })
    expect(second.find('[data-pending]').exists()).toBe(true)
    expect(second.find('[data-submit]').attributes('disabled')).toBeDefined()
    await (second.vm as unknown as { submit: () => Promise<void> }).submit()
    expect(verify).toHaveBeenCalledOnce()
    finish({ correct: true, saved: false })
    await flushPromises()
    for (const wrapper of [first, second]) {
      expect(wrapper.find('[data-success]').exists()).toBe(true)
      expect(wrapper.find('[data-save-error]').exists()).toBe(true)
      wrapper.unmount()
    }
  })
  it.each([true, false])('keeps correctness separate from saving failure: %s', async correct => {
    const wrapper = mount(FlagSubmit, { props: { verify: vi.fn().mockResolvedValue({ correct, saved: false }) } })
    await wrapper.find('[data-submit]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-success]').exists()).toBe(correct)
    expect(wrapper.find('[data-failure]').exists()).toBe(!correct)
    expect(wrapper.find('[data-save-error]').text()).toContain('未完整儲存')
    expect(wrapper.find('[data-saved]').exists()).toBe(false)
  })

  it('hides the previous result while pending, rejects duplicate calls and permits a later submission', async () => {
    let finish!: (value: { correct: boolean; saved: boolean }) => void
    const verify = vi.fn().mockResolvedValueOnce({ correct: true, saved: true })
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
      .mockResolvedValueOnce({ correct: false, saved: true })
    const wrapper = mount(FlagSubmit, { props: { verify } })
    await wrapper.find('[data-submit]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-saved]').exists()).toBe(true)
    const submit = (wrapper.vm as unknown as { submit: () => Promise<void> }).submit
    const first = submit()
    const duplicate = submit()
    await wrapper.vm.$nextTick()
    expect(verify).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-pending]').exists()).toBe(true)
    expect(wrapper.find('[data-success]').exists()).toBe(false)
    expect(wrapper.find('[data-saved]').exists()).toBe(false)
    expect(wrapper.find('[data-submit]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-flag-input]').attributes('disabled')).toBeDefined()
    finish({ correct: true, saved: false })
    await Promise.all([first, duplicate])
    await flushPromises()
    expect(wrapper.find('[data-save-error]').exists()).toBe(true)
    expect(wrapper.find('[data-submit]').attributes('disabled')).toBeUndefined()
    await wrapper.find('[data-submit]').trigger('click')
    await flushPromises()
    expect(verify).toHaveBeenCalledTimes(3)
    expect(wrapper.find('[data-failure]').exists()).toBe(true)
    expect(wrapper.find('[data-save-error]').exists()).toBe(false)
  })

  it('catches verification errors without calling them wrong flags and releases pending', async () => {
    const verify = vi.fn().mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({ correct: true, saved: true })
    const wrapper = mount(FlagSubmit, { props: { verify } })
    await wrapper.find('[data-submit]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-verification-error]').exists()).toBe(true)
    expect(wrapper.find('[data-failure]').exists()).toBe(false)
    expect(wrapper.find('[data-submit]').attributes('disabled')).toBeUndefined()
    await wrapper.find('[data-submit]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-verification-error]').exists()).toBe(false)
    expect(wrapper.find('[data-success]').exists()).toBe(true)
  })
})

describe('FlagSubmit', () => {
  it('shows success indicator when correct flag is submitted', async () => {
    const verify = vi.fn().mockResolvedValue({ correct: true, saved: true })
    const wrapper = mount(FlagSubmit, { props: { verify } })

    await wrapper.find('[data-flag-input]').setValue(CORRECT_FLAG)
    await wrapper.find('[data-submit]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(verify).toHaveBeenCalledWith(CORRECT_FLAG)
    expect(wrapper.find('[data-success]').exists()).toBe(true)
    expect(wrapper.find('[data-failure]').exists()).toBe(false)
  })

  it('shows export button on success when onExport is provided', async () => {
    const verify = vi.fn().mockResolvedValue({ correct: true, saved: true })
    const onExport = vi.fn()
    const wrapper = mount(FlagSubmit, { props: { verify, onExport } })

    await wrapper.find('[data-flag-input]').setValue(CORRECT_FLAG)
    await wrapper.find('[data-submit]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const exportBtn = wrapper.find('[data-export]')
    expect(exportBtn.exists()).toBe(true)
    expect(exportBtn.text()).toContain('下載攻擊紀錄')
  })

  it('clicking export button calls onExport', async () => {
    const verify = vi.fn().mockResolvedValue({ correct: true, saved: true })
    const onExport = vi.fn()
    const wrapper = mount(FlagSubmit, { props: { verify, onExport } })

    await wrapper.find('[data-flag-input]').setValue(CORRECT_FLAG)
    await wrapper.find('[data-submit]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-export]').trigger('click')
    expect(onExport).toHaveBeenCalledOnce()
  })

  it('keeps export available on failure', async () => {
    const verify = vi.fn().mockResolvedValue({ correct: false, saved: true })
    const onExport = vi.fn()
    const wrapper = mount(FlagSubmit, { props: { verify, onExport } })

    await wrapper.find('[data-flag-input]').setValue('CTF{wrong}')
    await wrapper.find('[data-submit]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-export]').exists()).toBe(true)
    await wrapper.find('[data-export]').trigger('click')
    expect(onExport).toHaveBeenCalledOnce()
  })

  it('does not show export button when onExport is not provided', async () => {
    const verify = vi.fn().mockResolvedValue({ correct: true, saved: true })
    const wrapper = mount(FlagSubmit, { props: { verify } })

    await wrapper.find('[data-flag-input]').setValue(CORRECT_FLAG)
    await wrapper.find('[data-submit]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-export]').exists()).toBe(false)
  })

  it('shows export notes button on success when onExportNotes is provided', async () => {
    const verify = vi.fn().mockResolvedValue({ correct: true, saved: true })
    const onExportNotes = vi.fn()
    const wrapper = mount(FlagSubmit, { props: { verify, onExportNotes } })

    await wrapper.find('[data-flag-input]').setValue(CORRECT_FLAG)
    await wrapper.find('[data-submit]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const exportNotesBtn = wrapper.find('[data-export-notes]')
    expect(exportNotesBtn.exists()).toBe(true)
    expect(exportNotesBtn.text()).toContain('下載滲透筆記')
  })

  it('clicking export notes button calls onExportNotes', async () => {
    const verify = vi.fn().mockResolvedValue({ correct: true, saved: true })
    const onExportNotes = vi.fn()
    const wrapper = mount(FlagSubmit, { props: { verify, onExportNotes } })

    await wrapper.find('[data-flag-input]').setValue(CORRECT_FLAG)
    await wrapper.find('[data-submit]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-export-notes]').trigger('click')
    expect(onExportNotes).toHaveBeenCalledOnce()
  })

  it('does not show export notes button when onExportNotes is not provided', async () => {
    const verify = vi.fn().mockResolvedValue({ correct: true, saved: true })
    const wrapper = mount(FlagSubmit, { props: { verify } })

    await wrapper.find('[data-flag-input]').setValue(CORRECT_FLAG)
    await wrapper.find('[data-submit]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-export-notes]').exists()).toBe(false)
  })

  it('does not show export notes button on failure', async () => {
    const verify = vi.fn().mockResolvedValue({ correct: false, saved: true })
    const onExportNotes = vi.fn()
    const wrapper = mount(FlagSubmit, { props: { verify, onExportNotes } })

    await wrapper.find('[data-flag-input]').setValue('CTF{wrong}')
    await wrapper.find('[data-submit]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-export-notes]').exists()).toBe(false)
  })

  it('shows failure indicator and no hint when wrong flag submitted', async () => {
    const verify = vi.fn().mockResolvedValue({ correct: false, saved: true })
    const wrapper = mount(FlagSubmit, { props: { verify } })

    await wrapper.find('[data-flag-input]').setValue('CTF{wrong}')
    await wrapper.find('[data-submit]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-failure]').exists()).toBe(true)
    expect(wrapper.find('[data-success]').exists()).toBe(false)
    // Response must not leak the correct flag
    expect(wrapper.html()).not.toContain(CORRECT_FLAG)
  })
})


describe('independent attack-log export', () => {
  it.each(['idle', 'pending', 'error'] as const)('exports in %s state without revealing notes export', async state => {
    const verify = state === 'pending' ? vi.fn(() => new Promise<{ correct: boolean; saved: boolean }>(() => {})) : vi.fn().mockRejectedValue(new Error('not ready'))
    const onExport = vi.fn()
    const wrapper = mount(FlagSubmit, { props: { verify, onExport, onExportNotes: vi.fn() } })
    if (state !== 'idle') {
      await wrapper.find('[data-submit]').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
    }
    expect(wrapper.find('[data-export-notes]').exists()).toBe(false)
    const button = wrapper.get('[data-export]')
    expect((button.element as HTMLButtonElement).disabled).toBe(false)
    await button.trigger('click')
    expect(onExport).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})

it('explains blocked progress access and refuses direct submission until accepted', async () => {
  const verify = vi.fn().mockResolvedValue({ correct: true, saved: true })
  const onExport = vi.fn()
  const wrapper = mount(FlagSubmit, { props: { verify, onExport, blocked: true } })
  expect(wrapper.get('[data-progress-blocked]').text()).toContain('沿用')
  expect(wrapper.get('[data-progress-blocked]').text()).toContain('重新載入')
  expect(wrapper.get('[data-submit]').attributes('disabled')).toBeDefined()
  expect(wrapper.get('[data-flag-input]').attributes('disabled')).toBeDefined()
  await (wrapper.vm as unknown as { submit: () => Promise<void> }).submit()
  expect(verify).not.toHaveBeenCalled()
  await wrapper.get('[data-export]').trigger('click')
  expect(onExport).toHaveBeenCalledOnce()
  await wrapper.setProps({ blocked: false })
  await wrapper.get('[data-flag-input]').setValue('CTF{accepted}')
  await wrapper.get('[data-submit]').trigger('click')
  expect(verify).toHaveBeenCalledWith('CTF{accepted}')
  wrapper.unmount()
})

it('says the device is being checked while the evaluation has not concluded', async () => {
  const verify = vi.fn(async () => ({ correct: false, saved: false }))
  const wrapper = mount(FlagSubmit, { props: { verify, blocked: true, blockReason: 'checking' } })
  const text = wrapper.get('[data-progress-blocked]').text()
  expect(text).toContain('檢查')
  expect(text).not.toContain('沿用')
  expect(text).not.toContain('重新載入')
  expect(wrapper.find('[data-submit]').attributes('disabled')).toBeDefined()
  wrapper.unmount()
})

it('asks the learner to answer once the evaluation has concluded', async () => {
  const verify = vi.fn(async () => ({ correct: false, saved: false }))
  const wrapper = mount(FlagSubmit, { props: { verify, blocked: true, blockReason: 'undecided' } })
  expect(wrapper.get('[data-progress-blocked]').text()).toContain('沿用')
  wrapper.unmount()
})

it('falls back to asking the learner to answer when no reason is supplied', async () => {
  const verify = vi.fn(async () => ({ correct: false, saved: false }))
  const wrapper = mount(FlagSubmit, { props: { verify, blocked: true } })
  expect(wrapper.get('[data-progress-blocked]').text()).toContain('沿用')
  wrapper.unmount()
})

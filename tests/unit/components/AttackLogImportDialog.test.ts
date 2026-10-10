import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Dialog from '../../../.vitepress/theme/components/AttackLogImportDialog.vue'

/** jsdom has no DataTransfer, so the chosen file is installed on the input directly. */
async function choose(wrapper: ReturnType<typeof mount>, text: string) {
  const input = wrapper.find('[data-import-file]')
  Object.defineProperty(input.element, 'files', { value: [new File([text], 'attack-session.json', { type: 'application/json' })], configurable: true })
  await input.trigger('change')
}

describe('Attack log import dialog', () => {
  it('hands the file text to the caller and reports the record was added', async () => {
    const run = vi.fn().mockResolvedValue({ ok: true })
    const wrapper = mount(Dialog, { props: { run } })
    await choose(wrapper, '{"schemaVersion":1}')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(run).toHaveBeenCalledWith('{"schemaVersion":1}')
    expect(wrapper.emitted('imported')).toHaveLength(1)
    wrapper.unmount()
  })

  it('states only that the file matches its own hashes, never who wrote it', async () => {
    const wrapper = mount(Dialog, { props: { run: vi.fn().mockResolvedValue({ ok: true }) } })
    await choose(wrapper, '{}')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const shown = wrapper.text()
    // The boundary the export capability states, carried over verbatim in effect: a
    // package that verifies is consistent with the hashes inside it, and nothing more.
    for (const claim of ['身分', '作者', '未經竄改', '未遭竄改', '確認為本人']) {
      expect(shown).not.toContain(claim)
    }
    expect(shown).toContain('雜湊')
    wrapper.unmount()
  })

  it.each([
    ['unparseable', { ok: false, kind: 'unparseable' }, '不是'],
    ['invalid', { ok: false, kind: 'invalid', reason: 'Event chain mismatch' }, 'Event chain mismatch'],
    ['write-failed', { ok: false, kind: 'write-failed' }, '未寫入'],
  ] as const)('shows the %s refusal and stays open', async (_kind, outcome, fragment) => {
    const wrapper = mount(Dialog, { props: { run: vi.fn().mockResolvedValue(outcome) } })
    await choose(wrapper, 'whatever')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain(fragment)
    expect(wrapper.emitted('imported')).toBeUndefined()
    // Retryable: the learner picks another file without reopening the dialog.
    expect(wrapper.find('fieldset').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('names both challenges when the file belongs to another one', async () => {
    const run = vi.fn().mockResolvedValue({ ok: false, kind: 'wrong-challenge', fileSlug: 'xss-playground', openSlug: 'sqli-demo' })
    const wrapper = mount(Dialog, { props: { run } })
    await choose(wrapper, 'whatever')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const alert = wrapper.find('[role="alert"]').text()
    expect(alert).toContain('xss-playground')
    expect(alert).toContain('sqli-demo')
    wrapper.unmount()
  })

  it('does not start a second run while one is in flight', async () => {
    let finish!: (value: unknown) => void
    const run = vi.fn(() => new Promise(resolve => { finish = resolve }))
    const wrapper = mount(Dialog, { props: { run } })
    await choose(wrapper, 'whatever')
    await wrapper.find('form').trigger('submit')
    await wrapper.find('form').trigger('submit')

    expect(run).toHaveBeenCalledTimes(1)
    expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined()
    finish({ ok: true })
    await flushPromises()
    wrapper.unmount()
  })

  it('does nothing when no file has been chosen', async () => {
    const run = vi.fn()
    const wrapper = mount(Dialog, { props: { run } })
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(run).not.toHaveBeenCalled()
    // Nothing happening means nothing on screen either. Reading a file that is not
    // there throws, and a submit that falls into the failure path reports a write that
    // was never attempted — an error about the database for a learner who has simply
    // not picked a file yet. Asserting only that `run` was not called cannot tell the
    // two apart, because both reach it zero times.
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-import-done]').exists()).toBe(false)
    wrapper.unmount()
  })

  it.each([
    ['checking', '正在檢查這台裝置上的紀錄。'],
    ['undecided', '請先完成沿用或清除的選擇'],
  ] as const)('refuses to import while progress access is denied because %s', async (blockReason, fragment) => {
    const run = vi.fn()
    const wrapper = mount(Dialog, { props: { run, blocked: true, blockReason } })
    await choose(wrapper, 'whatever')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(run).not.toHaveBeenCalled()
    expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined()
    // The same sentences the flag entry points use, taken from the same message keys:
    // two controls on one page cannot disagree about why the same thing is unavailable.
    expect(wrapper.text()).toContain(fragment)
    wrapper.unmount()
  })

  it('does not tell the learner to act while the check has not concluded', async () => {
    const wrapper = mount(Dialog, { props: { run: vi.fn(), blocked: true, blockReason: 'checking' } })
    for (const instruction of ['請先完成', '重新載入']) {
      expect(wrapper.text()).not.toContain(instruction)
    }
    wrapper.unmount()
  })
})

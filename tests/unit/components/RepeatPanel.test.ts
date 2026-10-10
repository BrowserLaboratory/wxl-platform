import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import RepeatPanel from '../../../.vitepress/theme/components/RepeatPanel.vue'

beforeEach(() => {
  localStorage.clear()
})

describe('RepeatPanel', () => {
  it('parses raw request and shows response with status, headers, body', async () => {
    const mockDispatch = vi.fn().mockResolvedValue(
      new Response('{"ok":true}', {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Flag': 'nope' },
      }),
    )
    const wrapper = mount(RepeatPanel, {
      props: { slug: 'test', dispatch: mockDispatch },
    })

    const textarea = wrapper.find('[data-request-input]')
    await textarea.setValue('GET / HTTP/1.1\r\nHost: challenge-test.localhost\r\n\r\n')
    await wrapper.find('[data-send]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(mockDispatch).toHaveBeenCalledOnce()
    const responseArea = wrapper.find('[data-response-output]')
    expect(responseArea.text()).toContain('200')
    expect(responseArea.text()).toContain('application/json')
    expect(responseArea.text()).toContain('{"ok":true}')
  })

  it('fills request editor when injectedRequest prop is set', async () => {
    const mockDispatch = vi.fn()
    const wrapper = mount(RepeatPanel, {
      props: { slug: 'test', dispatch: mockDispatch },
    })

    await wrapper.setProps({ injectedRequest: 'POST /login HTTP/1.1\r\nHost: challenge-test.localhost\r\n\r\nusername=admin' })
    await wrapper.vm.$nextTick()

    const textarea = wrapper.find('[data-request-input]') as ReturnType<typeof wrapper.find>
    expect((textarea.element as HTMLTextAreaElement).value).toContain('POST /login HTTP/1.1')
    expect((textarea.element as HTMLTextAreaElement).value).toContain('username=admin')
  })

  it('clicking + Save opens inline modal', async () => {
    const mockDispatch = vi.fn()
    const wrapper = mount(RepeatPanel, {
      props: { slug: 'test', dispatch: mockDispatch },
    })

    // Modal should not exist initially
    expect(wrapper.find('[data-save-modal]').exists()).toBe(false)

    await wrapper.find('[data-save-snapshot]').trigger('click')
    await wrapper.vm.$nextTick()

    // Modal should now be visible
    expect(wrapper.find('[data-save-modal]').exists()).toBe(true)
    // Input should exist inside modal
    expect(wrapper.find('[data-save-modal] input').exists()).toBe(true)
  })

  it('confirm button in modal saves snapshot and closes modal', async () => {
    const mockDispatch = vi.fn()
    const wrapper = mount(RepeatPanel, {
      props: { slug: 'test', dispatch: mockDispatch },
    })

    const textarea = wrapper.find('[data-request-input]')
    await textarea.setValue('GET /secret HTTP/1.1\r\nHost: test.localhost\r\n\r\n')

    // Open modal
    await wrapper.find('[data-save-snapshot]').trigger('click')
    await wrapper.vm.$nextTick()

    // Type name and confirm
    const input = wrapper.find('[data-save-modal] input')
    await input.setValue('My Snapshot')
    await wrapper.find('[data-save-confirm]').trigger('click')
    await wrapper.vm.$nextTick()

    // Modal should be closed
    expect(wrapper.find('[data-save-modal]').exists()).toBe(false)

    // Snapshot should appear in sidebar
    const snapshot = wrapper.find('[data-snapshot-item]')
    expect(snapshot.exists()).toBe(true)
    expect(snapshot.text()).toContain('My Snapshot')
  })

  it('cancel button closes modal without saving', async () => {
    const mockDispatch = vi.fn()
    const wrapper = mount(RepeatPanel, {
      props: { slug: 'test', dispatch: mockDispatch },
    })

    // Open modal
    await wrapper.find('[data-save-snapshot]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-save-modal]').exists()).toBe(true)

    // Cancel
    await wrapper.find('[data-save-cancel]').trigger('click')
    await wrapper.vm.$nextTick()

    // Modal closed, no snapshot saved
    expect(wrapper.find('[data-save-modal]').exists()).toBe(false)
    expect(wrapper.find('[data-snapshot-item]').exists()).toBe(false)
  })

  it('Escape key closes modal without saving', async () => {
    const mockDispatch = vi.fn()
    const wrapper = mount(RepeatPanel, {
      props: { slug: 'test', dispatch: mockDispatch },
    })

    // Open modal
    await wrapper.find('[data-save-snapshot]').trigger('click')
    await wrapper.vm.$nextTick()

    // Press Escape on the input
    const input = wrapper.find('[data-save-modal] input')
    await input.trigger('keydown', { key: 'Escape' })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-save-modal]').exists()).toBe(false)
    expect(wrapper.find('[data-snapshot-item]').exists()).toBe(false)
  })

  it('snapshot restore populates request textarea', async () => {
    const mockDispatch = vi.fn()
    const wrapper = mount(RepeatPanel, {
      props: { slug: 'test', dispatch: mockDispatch },
    })

    const textarea = wrapper.find('[data-request-input]')
    await textarea.setValue('GET /secret HTTP/1.1\r\nHost: test.localhost\r\n\r\n')

    // Save via modal
    await wrapper.find('[data-save-snapshot]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-save-modal] input').setValue('Saved')
    await wrapper.find('[data-save-confirm]').trigger('click')
    await wrapper.vm.$nextTick()

    // Change textarea
    await textarea.setValue('POST / HTTP/1.1\r\n\r\n')

    // Restore
    await wrapper.find('[data-snapshot-item]').trigger('click')
    expect((textarea.element as HTMLTextAreaElement).value).toContain('GET /secret')
  })
})

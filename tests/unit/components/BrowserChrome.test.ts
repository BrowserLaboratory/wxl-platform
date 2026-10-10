import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import BrowserChrome from '../../../.vitepress/theme/components/BrowserChrome.vue'

describe('BrowserChrome', () => {
  const defaultProps = {
    modelValue: 'https://challenge-test.localhost/',
    disabled: false,
  }

  it('renders URL input with current value', () => {
    const wrapper = mount(BrowserChrome, { props: defaultProps })
    const input = wrapper.find('[data-url-input]')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('https://challenge-test.localhost/')
  })

  it('renders Go button', () => {
    const wrapper = mount(BrowserChrome, { props: defaultProps })
    expect(wrapper.find('[data-go]').exists()).toBe(true)
  })

  it('emits navigate on Go click', async () => {
    const wrapper = mount(BrowserChrome, { props: defaultProps })
    await wrapper.find('[data-go]').trigger('click')
    expect(wrapper.emitted('navigate')).toHaveLength(1)
  })

  it('emits navigate on Enter key in URL input', async () => {
    const wrapper = mount(BrowserChrome, { props: defaultProps })
    await wrapper.find('[data-url-input]').trigger('keydown.enter')
    expect(wrapper.emitted('navigate')).toHaveLength(1)
  })

  it('emits update:modelValue when URL input changes', async () => {
    const wrapper = mount(BrowserChrome, { props: defaultProps })
    const input = wrapper.find('[data-url-input]')
    await input.setValue('https://new-url.localhost/')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['https://new-url.localhost/'])
  })

  it('renders navigation buttons (back, forward, reload) on desktop', () => {
    const wrapper = mount(BrowserChrome, { props: defaultProps })
    expect(wrapper.find('[data-nav-back]').exists()).toBe(true)
    expect(wrapper.find('[data-nav-forward]').exists()).toBe(true)
    expect(wrapper.find('[data-nav-reload]').exists()).toBe(true)
  })

  it('emits back and forward only when the corresponding entry exists', async () => {
    const wrapper = mount(BrowserChrome, {
      props: { ...defaultProps, canGoBack: true, canGoForward: true },
    })
    await wrapper.find('[data-nav-back]').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
    await wrapper.find('[data-nav-forward]').trigger('click')
    expect(wrapper.emitted('forward')).toHaveLength(1)
  })

  // The reload button used to emit the same payload-less `navigate` as Go and
  // Enter. While they share one action the panel cannot tell an explicit reload
  // from an explicit navigation to the same address, which makes "Go pushes a
  // history entry" and "reload replaces one" jointly unsatisfiable.
  it('raises reload and navigate as distinct actions', async () => {
    const wrapper = mount(BrowserChrome, { props: defaultProps })

    await wrapper.find('[data-nav-reload]').trigger('click')
    expect(wrapper.emitted('reload')).toHaveLength(1)
    expect(wrapper.emitted('navigate')).toBeUndefined()

    await wrapper.find('[data-go]').trigger('click')
    expect(wrapper.emitted('navigate')).toHaveLength(1)
    expect(wrapper.emitted('reload')).toHaveLength(1)
  })

  // Default-false is the honest default: an un-passed prop must not re-create
  // the always-clickable-always-inert button this change exists to remove.
  it('disables back and forward when their availability is not supplied', async () => {
    const wrapper = mount(BrowserChrome, { props: defaultProps })

    const back = wrapper.find('[data-nav-back]')
    const forward = wrapper.find('[data-nav-forward]')
    expect((back.element as HTMLButtonElement).disabled).toBe(true)
    expect((forward.element as HTMLButtonElement).disabled).toBe(true)

    await back.trigger('click')
    await forward.trigger('click')
    expect(wrapper.emitted('back')).toBeUndefined()
    expect(wrapper.emitted('forward')).toBeUndefined()
  })

  it('disables each of back and forward independently', () => {
    const wrapper = mount(BrowserChrome, {
      props: { ...defaultProps, canGoBack: true, canGoForward: false },
    })
    expect((wrapper.find('[data-nav-back]').element as HTMLButtonElement).disabled).toBe(false)
    expect((wrapper.find('[data-nav-forward]').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables reload while the panel is disabled', async () => {
    const wrapper = mount(BrowserChrome, { props: { ...defaultProps, disabled: true } })
    const reload = wrapper.find('[data-nav-reload]')
    expect((reload.element as HTMLButtonElement).disabled).toBe(true)
    await reload.trigger('click')
    expect(wrapper.emitted('reload')).toBeUndefined()
  })

  // Back and forward issue no request, so a runtime that has not booted yet is
  // no reason to disable them.
  it('does not disable back or forward via the panel disabled prop', () => {
    const wrapper = mount(BrowserChrome, {
      props: { ...defaultProps, disabled: true, canGoBack: true, canGoForward: true },
    })
    expect((wrapper.find('[data-nav-back]').element as HTMLButtonElement).disabled).toBe(false)
    expect((wrapper.find('[data-nav-forward]').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('renders lock icon', () => {
    const wrapper = mount(BrowserChrome, { props: defaultProps })
    expect(wrapper.find('[data-lock-icon]').exists()).toBe(true)
  })

  it('disables Go button when disabled prop is true', () => {
    const wrapper = mount(BrowserChrome, { props: { ...defaultProps, disabled: true } })
    const go = wrapper.find('[data-go]')
    expect((go.element as HTMLButtonElement).disabled).toBe(true)
  })
})

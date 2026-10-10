import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '../../../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../../../.vitepress/theme/i18n/messages/zh-TW.json'
import ShortLinkShare from '../../../.vitepress/theme/components/ShortLinkShare.vue'

// The control exists because a link nobody can see is a link nobody hands out.
// Both halves matter and the failure case is the reason the visible half is
// there at all: a clipboard write can be refused — an insecure origin, a denied
// permission, an older browser — and when it is, the reader needs something on
// screen to select by hand.

function i18nFor(locale: 'en' | 'zh-TW') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    globalInjection: true,
    messages: { en, 'zh-TW': zhTW },
    missingWarn: false,
    fallbackWarn: false,
  })
}

function mountShare(locale: 'en' | 'zh-TW', number = 1) {
  return mount(ShortLinkShare, {
    props: { number, locale },
    global: { plugins: [i18nFor(locale)] },
  })
}

/** Install a clipboard whose write resolves or rejects, and hand back the spy. */
function stubClipboard(behaviour: 'resolve' | 'reject') {
  const writeText = vi.fn(() =>
    behaviour === 'resolve' ? Promise.resolve() : Promise.reject(new Error('denied')),
  )
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  })
  return writeText
}

describe('ShortLinkShare', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows the host and path without the scheme', () => {
    expect(mountShare('en').find('[data-short-link]').text()).toBe('wxl.browserlab.online/c/001')
  })

  it('copies the absolute URL, scheme included', async () => {
    const writeText = stubClipboard('resolve')
    const wrapper = mountShare('en')

    await wrapper.find('[data-copy-link]').trigger('click')

    expect(writeText).toHaveBeenCalledWith('https://wxl.browserlab.online/c/001')
  })

  it('shows and copies the localised path in Traditional Chinese', async () => {
    const writeText = stubClipboard('resolve')
    const wrapper = mountShare('zh-TW')

    expect(wrapper.find('[data-short-link]').text()).toBe('wxl.browserlab.online/zh/c/001')
    await wrapper.find('[data-copy-link]').trigger('click')
    expect(writeText).toHaveBeenCalledWith('https://wxl.browserlab.online/zh/c/001')
  })

  it('pads the number to three digits and leaves a wider one alone', () => {
    expect(mountShare('en', 42).find('[data-short-link]').text()).toBe('wxl.browserlab.online/c/042')
    expect(mountShare('en', 1234).find('[data-short-link]').text()).toBe('wxl.browserlab.online/c/1234')
  })

  it('announces a successful copy through a live region and then returns to rest', async () => {
    vi.useFakeTimers()
    stubClipboard('resolve')
    const wrapper = mountShare('en')

    await wrapper.find('[data-copy-link]').trigger('click')
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    const status = wrapper.find('[data-copy-status]')
    expect(status.attributes('role')).toBe('status')
    expect(status.attributes('aria-live')).toBe('polite')
    expect(status.text()).toBe(en.short_link.copied)

    vi.runAllTimers()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-copy-status]').text()).toBe('')
  })

  it('points a failed copy at the link on screen', async () => {
    // Not merely "copy failed". The whole reason the URL is rendered as text is
    // that this branch has somewhere to send the reader.
    stubClipboard('reject')
    const wrapper = mountShare('en')

    await wrapper.find('[data-copy-link]').trigger('click')
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-copy-status]').text()).toBe(en.short_link.copy_failed)
    expect(en.short_link.copy_failed.toLowerCase()).toContain('select')
  })

  it('lets no rejection escape when the clipboard refuses', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    try {
      stubClipboard('reject')
      const wrapper = mountShare('en')
      await wrapper.find('[data-copy-link]').trigger('click')
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(unhandled).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', unhandled)
    }
  })

  it('survives a browser with no clipboard at all', async () => {
    // `navigator.clipboard` is undefined on an insecure origin. Reading
    // `.writeText` off it throws synchronously, which would take the click
    // handler down rather than reaching the failure message.
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    const wrapper = mountShare('en')

    await wrapper.find('[data-copy-link]').trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-copy-status]').text()).toBe(en.short_link.copy_failed)
  })

  it('does not let the click reach an enclosing link', async () => {
    // In the challenge list the whole row is an anchor. A copy that also
    // navigated would take the reader off the page they were copying from.
    stubClipboard('resolve')
    const wrapper = mountShare('en')

    const event = { stopPropagation: vi.fn(), preventDefault: vi.fn() }
    await wrapper.find('[data-copy-link]').trigger('click', event)

    expect(wrapper.find('[data-copy-link]').attributes('type')).toBe('button')
  })

  it('renders nothing at all without a number', () => {
    // A challenge with no number has no short link. Rendering `/c/000` would be
    // a link that resolves to nothing while looking exactly like one that works.
    const wrapper = mount(ShortLinkShare, {
      props: { number: undefined, locale: 'en' },
      global: { plugins: [i18nFor('en')] },
    })
    expect(wrapper.find('[data-short-link]').exists()).toBe(false)
  })
})

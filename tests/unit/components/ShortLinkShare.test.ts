import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createI18n } from 'vue-i18n'
import en from '../../../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../../../.vitepress/theme/i18n/messages/zh-TW.json'
import ShortLinkShare from '../../../.vitepress/theme/components/ShortLinkShare.vue'
import { SITE_ORIGIN } from '../../../.vitepress/challenge/shortLink'
import { matchesOriginGrammar } from '../../../scripts/fork-init'

// The link mode is a build-time constant read through one module. Replaced here so each test
// picks its mode; `vi.mock` is hoisted per file, so the mode itself has to be mutable. Short
// mode by default, so today's short-link assertions keep their meaning (an undefined constant,
// as under vitest, would mean page mode: see ShortLinkShare.mode-default.test.ts).
const mode = vi.hoisted(() => ({ value: 'short' as 'short' | 'page' }))
vi.mock('../../../.vitepress/theme/linkMode', () => ({ linkMode: () => mode.value }))

// Expectations are built here with plain string operations on the imported SITE_ORIGIN — never by
// calling shortLinkDisplay/shortLinkUrl — so this file stays a test of the component's OWN output
// against the real origin, not a tautology against the helper it happens to share with the
// component (T70/AC-C1).
const DISPLAY_ORIGIN = SITE_ORIGIN.replace(/^https:\/\//, '')

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

/** Mounts the control; the number is 1 unless one is passed, `undefined` included. */
function mountShare(locale: 'en' | 'zh-TW', ...args: [number?: unknown, slug?: string]) {
  const number = args.length === 0 ? 1 : args[0]
  const slug = args[1]
  return mount(ShortLinkShare, {
    props: { number: number as number, locale, slug },
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

beforeEach(() => {
  mode.value = 'short'
})

describe('ShortLinkShare', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows the host and path without the scheme', () => {
    expect(mountShare('en').find('[data-short-link]').text()).toBe(`${DISPLAY_ORIGIN}/c/001`)
  })

  it('copies the absolute URL, scheme included', async () => {
    const writeText = stubClipboard('resolve')
    const wrapper = mountShare('en')

    await wrapper.find('[data-copy-link]').trigger('click')

    expect(writeText).toHaveBeenCalledWith(`${SITE_ORIGIN}/c/001`)
  })

  it('shows and copies the localised path in Traditional Chinese', async () => {
    const writeText = stubClipboard('resolve')
    const wrapper = mountShare('zh-TW')

    expect(wrapper.find('[data-short-link]').text()).toBe(`${DISPLAY_ORIGIN}/zh/c/001`)
    await wrapper.find('[data-copy-link]').trigger('click')
    expect(writeText).toHaveBeenCalledWith(`${SITE_ORIGIN}/zh/c/001`)
  })

  it('pads the number to three digits and leaves a wider one alone', () => {
    expect(mountShare('en', 42).find('[data-short-link]').text()).toBe(`${DISPLAY_ORIGIN}/c/042`)
    expect(mountShare('en', 1234).find('[data-short-link]').text()).toBe(`${DISPLAY_ORIGIN}/c/1234`)
  })

  it('carries the copied URL as the URL text\'s title (L08)', () => {
    expect(mountShare('en').find('[data-short-link]').attributes('title')).toBe(`${SITE_ORIGIN}/c/001`)
    expect(mountShare('zh-TW', 42).find('[data-short-link]').attributes('title')).toBe(`${SITE_ORIGIN}/zh/c/042`)
    expect(mountShare('en', 1234).find('[data-short-link]').attributes('title')).toBe(`${SITE_ORIGIN}/c/1234`)
  })

  it('SITE_ORIGIN matches the origin grammar (traceability.md)', () => {
    expect(matchesOriginGrammar(SITE_ORIGIN)).toBe(true)
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

// Page mode: the challenge page's URL, SITE_ORIGIN followed by the page's path within the site.
// The cases have X3's, X4's and X5's shapes with the real SITE_ORIGIN in place of the origin.
describe('ShortLinkShare in page mode', () => {
  beforeEach(() => {
    mode.value = 'page'
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ['en', 1, 'door-is-open', '/challenge/door-is-open/'],
    ['zh-TW', 3, 'selected-excerpts', '/zh-TW/challenge/selected-excerpts/'],
    ['en', 1234, 'staff-only', '/challenge/staff-only/'],
  ] as const)('on a %s page, n = %i, %s: shows, titles and copies the page URL (L04-L08)', async (locale, n, slug, path) => {
    const writeText = stubClipboard('resolve')
    const wrapper = mountShare(locale, n, slug)
    const text = wrapper.find('[data-short-link]')

    expect(text.text()).toBe(`${DISPLAY_ORIGIN}${path}`)
    expect(text.attributes('title')).toBe(`${SITE_ORIGIN}${path}`)
    await wrapper.find('[data-copy-link]').trigger('click')
    expect(writeText).toHaveBeenCalledWith(`${SITE_ORIGIN}${path}`)
  })
})

describe.each(['short', 'page'] as const)('ShortLinkShare in %s mode renders nothing', (m) => {
  beforeEach(() => {
    mode.value = m
  })

  // A challenge with no number has no link. Rendering `/c/000` would be a link that resolves to
  // nothing while looking exactly like one that works. Page mode gets a valid slug, so only the
  // number is at fault.
  it.each([
    ['missing', undefined],
    ['null', null],
    ['0', 0],
    ['-1', -1],
    ['1.5', 1.5],
    ['""', ''],
    ['"abc"', 'abc'],
  ])('for the number %s (L09)', (_label, n) => {
    const wrapper = mountShare('en', n, 'door-is-open')
    expect(wrapper.find('[data-short-link]').exists()).toBe(false)
    expect(wrapper.find('[data-copy-link]').exists()).toBe(false)
  })

  it('converts the string "7" with Number() and renders it as 7 (L09)', () => {
    const text = mountShare('en', '7', 'door-is-open').find('[data-short-link]')
    expect(text.text()).toBe(
      m === 'short' ? `${DISPLAY_ORIGIN}/c/007` : `${DISPLAY_ORIGIN}/challenge/door-is-open/`,
    )
  })
})

describe('ShortLinkShare in page mode without a usable slug', () => {
  beforeEach(() => {
    mode.value = 'page'
  })

  it.each([
    ['missing (L10)', undefined],
    ['empty (L10)', ''],
    ['My Chall (L16)', 'My Chall'],
    ['a_b (L16)', 'a_b'],
    ['-a (L16)', '-a'],
  ])('renders nothing for a slug that is %s', (_label, slug) => {
    const wrapper = mountShare('en', 1, slug)
    expect(wrapper.find('[data-short-link]').exists()).toBe(false)
    expect(wrapper.find('[data-copy-link]').exists()).toBe(false)
  })
})

describe.each(['short', 'page'] as const)('ShortLinkShare copy behaviour in %s mode', (m) => {
  beforeEach(() => {
    mode.value = m
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  /** Runtime locale and page locale set apart, so only one of them can explain the strings. */
  function mountAt(pageLocale: 'en' | 'zh-TW', runtimeLocale: 'en' | 'zh-TW') {
    return mount(ShortLinkShare, {
      props: { number: 1, slug: 'door-is-open', locale: pageLocale },
      global: { plugins: [i18nFor(runtimeLocale)] },
    })
  }
  const messages = { en, 'zh-TW': zhTW }

  it('shows short_link.copied and is empty again once 2000 ms pass (L12)', async () => {
    vi.useFakeTimers()
    stubClipboard('resolve')
    const wrapper = mountShare('en', 1, 'door-is-open')

    await wrapper.find('[data-copy-link]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-copy-status]').text()).toBe(en.short_link.copied)

    vi.advanceTimersByTime(1999)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-copy-status]').text()).toBe(en.short_link.copied)
    vi.advanceTimersByTime(1)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-copy-status]').text()).toBe('')
  })

  it.each(['rejects', 'is missing'] as const)(
    'shows short_link.copy_failed when the clipboard %s, still after 2000 ms, letting nothing escape (L13)',
    async (how) => {
      const unhandled = vi.fn()
      process.on('unhandledRejection', unhandled)
      try {
        vi.useFakeTimers()
        if (how === 'rejects') stubClipboard('reject')
        else Object.defineProperty(globalThis.navigator, 'clipboard', { value: undefined, configurable: true, writable: true })
        const wrapper = mountShare('en', 1, 'door-is-open')

        await wrapper.find('[data-copy-link]').trigger('click')
        await flushPromises()
        expect(wrapper.find('[data-copy-status]').text()).toBe(en.short_link.copy_failed)

        vi.advanceTimersByTime(2000)
        await wrapper.vm.$nextTick()
        expect(wrapper.find('[data-copy-status]').text()).toBe(en.short_link.copy_failed)
        vi.useRealTimers()
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(unhandled).not.toHaveBeenCalled()
      } finally {
        process.off('unhandledRejection', unhandled)
      }
    },
  )

  it.each(['en', 'zh-TW'] as const)('labels the button short_link.copy_label on a %s page (L14)', (locale) => {
    const button = mountAt(locale, locale).find('[data-copy-link]')
    expect(button.attributes('aria-label')).toBe(messages[locale].short_link.copy_label)
    expect(button.attributes('title')).toBe(messages[locale].short_link.copy_label)
  })

  it.each([
    ['en', 'zh-TW'],
    ['zh-TW', 'en'],
  ] as const)('follows the %s page, not the %s runtime locale, in every string (L15)', async (page, runtime) => {
    stubClipboard('resolve')
    const ok = mountAt(page, runtime)
    expect(ok.find('[data-copy-link]').attributes('aria-label')).toBe(messages[page].short_link.copy_label)
    expect(ok.find('[data-copy-link]').attributes('title')).toBe(messages[page].short_link.copy_label)
    await ok.find('[data-copy-link]').trigger('click')
    await flushPromises()
    expect(ok.find('[data-copy-status]').text()).toBe(messages[page].short_link.copied)

    stubClipboard('reject')
    const failed = mountAt(page, runtime)
    await failed.find('[data-copy-link]').trigger('click')
    await flushPromises()
    expect(failed.find('[data-copy-status]').text()).toBe(messages[page].short_link.copy_failed)
  })

  it('keeps the copy click from an enclosing anchor (L18)', async () => {
    // In the challenge list the whole row is an anchor. A copy that also navigated would take the
    // reader off the page they were copying from.
    stubClipboard('resolve')
    const Host = defineComponent({
      render: () => h('a', { href: '#elsewhere' }, [h(ShortLinkShare, { number: 1, slug: 'door-is-open', locale: 'en' })]),
    })
    const wrapper = mount(Host, { attachTo: document.body, global: { plugins: [i18nFor('en')] } })
    try {
      const before = location.href
      const onAnchorClick = vi.fn()
      wrapper.find('a').element.addEventListener('click', onAnchorClick)

      const event = new MouseEvent('click', { bubbles: true, cancelable: true })
      wrapper.find('[data-copy-link]').element.dispatchEvent(event)
      await flushPromises()

      expect(event.defaultPrevented).toBe(true)
      expect(onAnchorClick).not.toHaveBeenCalled()
      expect(location.href).toBe(before)
    } finally {
      wrapper.unmount()
    }
  })
})

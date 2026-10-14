import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '../../../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../../../.vitepress/theme/i18n/messages/zh-TW.json'

const mockGo = vi.fn()
// The component now DISPLAYS from the page-resolved locale and only WRITES to
// the vue-i18n runtime locale, so tests must be able to set the two apart —
// that divergence is exactly the SSR condition the fix addresses.
const mockLocaleIndex = { value: 'root' as 'root' | 'zh-TW' }
// The production site base is '/', so a base-related bug is invisible unless the
// double can return something else. Same reason MergedNav's test carries one.
const mockBase = { value: '/' }
vi.mock('vitepress', () => ({
  useRouter: () => ({ go: mockGo, route: { path: '/' } }),
  useData: () => ({ localeIndex: mockLocaleIndex, site: { value: { base: mockBase.value } } }),
}))

import LocaleSwitcher from '../../../.vitepress/theme/components/LocaleSwitcher.vue'
import {
  detectInitialLocale,
  persistLocale,
  localizePath,
  LOCALE_STORAGE_KEY,
} from '../../../.vitepress/theme/i18n'

/** Mounts with the page locale and the runtime locale set independently. */
function mountAt(pageLocale: 'en' | 'zh-TW', runtimeLocale: 'en' | 'zh-TW' = pageLocale) {
  mockLocaleIndex.value = pageLocale === 'zh-TW' ? 'zh-TW' : 'root'
  return mount(LocaleSwitcher, { global: { plugins: [makeI18n(runtimeLocale)] } })
}

function makeI18n(locale: 'en' | 'zh-TW' = 'en') {
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

function setPathname(p: string, search = '', hash = '') {
  window.history.pushState({}, '', p + search + hash)
}

beforeEach(() => {
  mockBase.value = '/'
  mockGo.mockReset()
  window.localStorage.clear()
  setPathname('/')
})

afterEach(() => {
  vi.restoreAllMocks()
  mockLocaleIndex.value = 'root'
})

describe('LocaleSwitcher UI', () => {
  // The trigger label used to render the current locale as text. Latin has no
  // intra-word break opportunity; CJK breaks between any two characters, so
  // `繁體中文` folded one character per line under width pressure while
  // `English` never could. Removing the text removes the class of defect —
  // asserting its absence is what stops it coming back.
  it('renders a trigger with no text label', async () => {
    const wrapper = mountAt('zh-TW')
    const toggle = wrapper.find('[data-locale-switcher-toggle]')
    expect(toggle.text()).toBe('')
  })

  it('renders a translate glyph and a chevron, both hidden from assistive tech', async () => {
    const wrapper = mountAt('en')
    const svgs = wrapper.find('[data-locale-switcher-toggle]').findAll('svg')
    expect(svgs.length).toBe(2)
    for (const svg of svgs) {
      expect(svg.attributes('aria-hidden')).toBe('true')
    }
  })

  // With the visible label gone, aria-label is the button's ONLY accessible
  // name. Nothing in the suite would otherwise notice it disappearing.
  it('names the trigger from the aria message key AND says which locale is active', async () => {
    for (const [locale, expected] of [
      ['en', 'Switch language — English'],
      ['zh-TW', '切換語系 — 繁體中文'],
    ] as const) {
      const wrapper = mountAt(locale)
      expect(wrapper.find('[data-locale-switcher-toggle]').attributes('aria-label')).toBe(expected)
    }
  })

  it.each([
    ['en', 'zh-TW', 'English'],
    ['zh-TW', 'en', '繁體中文'],
  ] as const)('opened in %s, offers exactly %s and titles the current locale', async (current, other, currentLabel) => {
    const wrapper = mountAt(current)
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')

    const options = wrapper.findAll('[role="option"]')
    expect(options.length).toBe(1)
    expect(options[0].attributes('data-locale-option')).toBe(other)

    const title = wrapper.find('[data-locale-current]')
    expect(title.exists()).toBe(true)
    expect(title.text()).toBe(currentLabel)
    expect(title.attributes('role')).toBeUndefined()
    expect(title.attributes('data-locale-option')).toBeUndefined()
  })

  it('the current-locale title is not interactive at all', async () => {
    setPathname('/')
    const wrapper = mountAt('en')
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    await wrapper.find('[data-locale-current]').trigger('click')
    expect(mockGo).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
    // The discriminator: select() sets open=false before reaching its
    // same-locale guard, so a guarded handler would close the menu. A truly
    // inert heading leaves it open.
    expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(true)
  })

  // Round 1, F27: the heading was aria-hidden, so with the trigger's text label
  // gone the active locale was not exposed to assistive tech anywhere.
  it('exposes the current locale to assistive technology', async () => {
    const wrapper = mountAt('zh-TW')
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    const title = wrapper.find('[data-locale-current]')
    expect(title.attributes('aria-hidden')).toBeUndefined()
    // The heading names the listbox rather than sitting inside it as a non-option.
    const id = title.attributes('id')
    expect(id).toBeTruthy()
    expect(wrapper.find('[data-locale-switcher-menu]').attributes('aria-labelledby')).toBe(id)
  })

  // Code review, high: `window.location.pathname` INCLUDES the site base, and it
  // was being handed straight to `localizePath` — the exact input the function's
  // own docstring forbids ("takes a base-less path; callers wrap the OUTPUT").
  // MergedNav's navLink obeys the contract; this, the only other call site, did
  // not. A non-empty base is a supported configuration: config.mts reads
  // SITE_BASE, which a GitHub Pages range's deploy workflow sets.
  //
  // Under `/wxl/`, switching to zh-TW emitted `/zh-TW/wxl/...` — the locale
  // segment outside the base — and switching back emitted the path unchanged,
  // so the navigation silently did nothing while the runtime locale and
  // localStorage had already been written.
  it.each([
    ['/wxl/', '/wxl/challenges/foo', 'zh-TW', '/wxl/zh-TW/challenges/foo'],
    ['/wxl/', '/wxl/zh-TW/challenges/foo', 'en', '/wxl/challenges/foo'],
    ['/wxl/', '/wxl/', 'zh-TW', '/wxl/zh-TW/'],
    ['/', '/challenges/foo', 'zh-TW', '/zh-TW/challenges/foo'],
  ] as const)('under base %s, %s -> %s yields %s', async (base, from, target, expected) => {
    mockBase.value = base
    setPathname(from)
    mockLocaleIndex.value = from.includes('/zh-TW/') ? 'zh-TW' : 'root'
    const wrapper = mount(LocaleSwitcher, { global: { plugins: [makeI18n(target === 'zh-TW' ? 'en' : 'zh-TW')] } })
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    await wrapper.find(`[data-locale-option="${target}"]`).trigger('click')
    expect(mockGo).toHaveBeenCalledWith(expected)
  })

  // Round 3: four of the five ARIA affordances on this control had no assertion.
  // An icon-only combobox-shaped control is entirely defined by them.
  it('carries the ARIA affordances an icon-only listbox trigger needs', async () => {
    const wrapper = mountAt('en')
    const toggle = wrapper.find('[data-locale-switcher-toggle]')
    expect(toggle.attributes('aria-haspopup')).toBe('listbox')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(wrapper.find('[data-locale-switcher-toggle]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-locale-switcher-menu]').attributes('role')).toBe('listbox')
    expect(wrapper.find('[role="option"]').attributes('aria-selected')).toBe('false')
  })

  // Code review, low: the single option had a click handler and nothing else, so
  // a keyboard user could open the listbox (aria-expanded flipped) and never
  // reach the entry inside it.
  it('is operable from the keyboard', async () => {
    setPathname('/')
    const wrapper = mountAt('en')
    const toggle = wrapper.find('[data-locale-switcher-toggle]')

    await toggle.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(true)
    expect(toggle.attributes('aria-controls')).toBe(wrapper.find('[data-locale-switcher-menu]').attributes('id'))

    const option = wrapper.find('[role="option"]')
    expect(option.attributes('tabindex')).toBe('0')
    await option.trigger('keydown', { key: 'Enter' })
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/')
  })

  it('closes on Escape from either the trigger or the option', async () => {
    for (const from of ['[data-locale-switcher-toggle]', '[role="option"]'] as const) {
      const wrapper = mountAt('en')
      await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
      expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(true)
      await wrapper.find(from).trigger('keydown', { key: 'Escape' })
      expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(false)
    }
  })

  // Round 3: the dropdown closing — both by choosing an option and by clicking
  // outside — was unobserved end to end. The outside-click path is a document
  // listener registered in onMounted, so nothing short of dispatching a real
  // document event exercises it.
  it('closes the dropdown when an option is chosen', async () => {
    setPathname('/')
    const wrapper = mountAt('en')
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(true)
    await wrapper.find('[data-locale-option="zh-TW"]').trigger('click')
    expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(false)
  })

  it('closes the dropdown on a click outside, and leaves it open on a click inside', async () => {
    setPathname('/')
    const wrapper = mount(LocaleSwitcher, {
      global: { plugins: [makeI18n('en')] },
      attachTo: document.body,
    })
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(true)

    // Inside first: proves the handler discriminates rather than closing on any
    // document click, which a `contains` check that always returned false would.
    wrapper.find('[data-locale-current]').element.dispatchEvent(
      new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(true)

    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(false)

    outside.remove()
    wrapper.unmount()
  })

  // Round 3: the query string and hash are appended AFTER localizePath, and
  // nothing asserted they survive a switch.
  it('preserves the query string and hash across a switch', async () => {
    setPathname('/challenges/', '?tab=network', '#flag')
    const wrapper = mountAt('en')
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    await wrapper.find('[data-locale-option="zh-TW"]').trigger('click')
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/challenges/?tab=network#flag')
  })

  // Round 2, R2-01: the round-1 fix moved DISPLAY onto the page locale but left
  // select()'s early-return comparing the vue-i18n RUNTIME locale. Before that
  // fix both derived from the same ref, so the guard was unreachable dead code;
  // after it, the two can disagree and the single offered option becomes a
  // no-op — the switcher is dead. The divergent state is producible in the
  // product: detectInitialLocale returns a stored `zh-TW` for a non-prefixed
  // URL, and the route watcher has no `immediate`, so a cold load of an English
  // URL after ever visiting a zh-TW one lands exactly here.
  it('switches even when the runtime locale disagrees with the page locale', async () => {
    setPathname('/challenges/')
    const i18n = makeI18n('zh-TW')
    mockLocaleIndex.value = 'root'
    const wrapper = mount(LocaleSwitcher, { global: { plugins: [i18n] } })
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    // The menu offers the locale the PAGE is not in.
    await wrapper.find('[data-locale-option="zh-TW"]').trigger('click')
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/challenges/')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW')
  })

  // Round 1, F25: display must follow the PAGE locale, not the vue-i18n runtime
  // locale, because the runtime instance is `en` until hydration. Setting the
  // two apart is the only way to observe which one drives the output.
  it.each([
    ['zh-TW', 'en', '繁體中文', '切換語系 — 繁體中文'],
    ['en', 'zh-TW', 'English', 'Switch language — English'],
  ] as const)(
    'renders the page locale (%s) even when the runtime locale is %s',
    async (pageLocale, runtimeLocale, expectedTitle, expectedAria) => {
      const wrapper = mountAt(pageLocale, runtimeLocale)
      expect(wrapper.find('[data-locale-switcher-toggle]').attributes('aria-label')).toBe(expectedAria)
      await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
      expect(wrapper.find('[data-locale-current]').text()).toBe(expectedTitle)
    },
  )

  // The one assertion that enforces "the prefix rule has a single home".
  // A future copy-paste back into the component is invisible without it.
  it('delegates path building to the single-sourced localizePath', () => {
    const wrapper = mountAt('en')
    expect((wrapper.vm as unknown as { buildTargetPath: unknown }).buildTargetPath).toBe(localizePath)
  })

  it('switching EN → zh-TW from /challenges/door-is-open/ navigates with /zh-TW prefix, persists, and updates locale', async () => {
    setPathname('/challenges/door-is-open/')
    const i18n = makeI18n('en')
    mockLocaleIndex.value = 'root'
    const wrapper = mount(LocaleSwitcher, { global: { plugins: [i18n] } })
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    await wrapper.find('[data-locale-option="zh-TW"]').trigger('click')
    expect(i18n.global.locale.value).toBe('zh-TW')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW')
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/challenges/door-is-open/')
  })

  it('switching zh-TW → EN from /zh-TW/guide/ navigates without /zh-TW prefix', async () => {
    setPathname('/zh-TW/guide/')
    const i18n = makeI18n('zh-TW')
    mockLocaleIndex.value = 'zh-TW'
    const wrapper = mount(LocaleSwitcher, { global: { plugins: [i18n] } })
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    await wrapper.find('[data-locale-option="en"]').trigger('click')
    expect(i18n.global.locale.value).toBe('en')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(mockGo).toHaveBeenCalledWith('/guide/')
  })

  it('switching from / to zh-TW yields /zh-TW/', async () => {
    setPathname('/')
    const wrapper = mountAt('en')
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    await wrapper.find('[data-locale-option="zh-TW"]').trigger('click')
    expect(mockGo).toHaveBeenCalledWith('/zh-TW/')
  })

})

describe('detectInitialLocale: the URL alone decides (spec.md table)', () => {
  // The stored value no longer participates. It is expressed by the cold-load
  // redirect instead, so that the address bar and the page always describe the
  // same locale. Values come from the Example table of the requirement
  // "Init-time locale detection follows the URL alone".
  const cases: Array<{
    label: string
    ls: string | null
    path: string
    expected: 'en' | 'zh-TW'
  }> = [
    { label: "no stored / '/'              -> en",    ls: null,      path: '/',             expected: 'en' },
    { label: "stored zh-TW / '/'           -> en",    ls: 'zh-TW',   path: '/',             expected: 'en' },
    { label: "stored zh-TW / '/challenges/' -> en",   ls: 'zh-TW',   path: '/challenges/',  expected: 'en' },
    { label: "stored en / '/zh-TW/'        -> zh-TW", ls: 'en',      path: '/zh-TW/',       expected: 'zh-TW' },
    { label: "no stored / '/zh-TW/guide/'  -> zh-TW", ls: null,      path: '/zh-TW/guide/', expected: 'zh-TW' },
    { label: "stored zh-TW / '/zh-TWfoo'   -> en",    ls: 'zh-TW',   path: '/zh-TWfoo',     expected: 'en' },
    { label: "stored invalid / '/'         -> en",    ls: 'invalid', path: '/',             expected: 'en' },
  ]
  for (const tc of cases) {
    it(tc.label, () => {
      setPathname(tc.path)
      window.localStorage.clear()
      if (tc.ls !== null) window.localStorage.setItem(LOCALE_STORAGE_KEY, tc.ls)
      expect(detectInitialLocale()).toBe(tc.expected)
    })
  }

  // The discriminating row: under the old rule this returned zh-TW. Without it,
  // a change that reinstates the stored-value precedence stays green.
  it('never lets the stored value override an unprefixed path', () => {
    setPathname('/challenges/door-is-open/')
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-TW')
    expect(detectInitialLocale()).toBe('en')
  })
})

describe('localStorage SecurityError fallback', () => {
  it('detectInitialLocale falls back to URL-based detection when getItem throws', () => {
    setPathname('/zh-TW/challenges/')
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(() => detectInitialLocale()).not.toThrow()
    expect(detectInitialLocale()).toBe('zh-TW')
  })

  it('persistLocale swallows setItem SecurityError without throwing', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(() => persistLocale('zh-TW')).not.toThrow()
  })
})

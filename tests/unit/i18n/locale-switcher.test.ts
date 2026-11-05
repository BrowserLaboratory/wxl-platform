import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { createI18n } from 'vue-i18n'
import en from '../../../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../../../.vitepress/theme/i18n/messages/zh-TW.json'

// The component now DISPLAYS from the page-resolved locale and only WRITES to
// the vue-i18n runtime locale, so tests must be able to set the two apart —
// that divergence is exactly the SSR condition the fix addresses.
const mockLocaleIndex = { value: 'root' as 'root' | 'zh-TW' }
// The switcher reads only the page's locale from VitePress (spec 0008): where a choice goes, the
// site base and the location are the Layout's, through the provided choice.
vi.mock('vitepress', () => ({
  useData: () => ({ localeIndex: mockLocaleIndex }),
}))

import LocaleSwitcher from '../../../.vitepress/theme/components/LocaleSwitcher.vue'
import {
  detectInitialLocale,
  persistLocale,
  readStoredLocale,
  LOCALE_STORAGE_KEY,
  _resetRememberedChoiceForTests,
} from '../../../.vitepress/theme/i18n'
import { LOCALE_CHOICE, MISSING_TRANSLATION_LOCALE, type ChoiceOutcome } from '../../../.vitepress/theme/i18n/missingTranslation'

// What the theme's Layout provides (spec 0008): the choice, which decides whether to navigate or
// stay (tests/unit/i18n/not-found-wiring.test.ts drives the real one), and the line's locale. The
// switcher shows the menu and hands the choice over.
const line = ref<'en' | 'zh-TW' | null>(null)
const chooseResult = { value: 'stay' as ChoiceOutcome }
const choose = vi.fn((_locale: 'en' | 'zh-TW') => chooseResult.value)

/**
 * Mounts with the page locale and the runtime locale set independently, under the Layout's
 * provider. Pass the i18n instance to read the runtime locale afterwards.
 */
function mountAt(pageLocale: 'en' | 'zh-TW', runtime: 'en' | 'zh-TW' | ReturnType<typeof makeI18n> = pageLocale) {
  mockLocaleIndex.value = pageLocale === 'zh-TW' ? 'zh-TW' : 'root'
  return mount(LocaleSwitcher, {
    global: {
      plugins: [typeof runtime === 'string' ? makeI18n(runtime) : runtime],
      provide: { [LOCALE_CHOICE as symbol]: choose, [MISSING_TRANSLATION_LOCALE as symbol]: computed(() => line.value) },
    },
  })
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
  window.localStorage.clear()
  _resetRememberedChoiceForTests()
  line.value = null
  chooseResult.value = 'stay'
  choose.mockClear()
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
    const wrapper = mountAt('en')
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    await wrapper.find('[data-locale-current]').trigger('click')
    expect(choose).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
    // The discriminator: select() closes the menu before handing the choice to the
    // Layout, so a heading wired to it would close the menu. A truly inert heading
    // leaves it open.
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

  // Spec 0008: where a choice goes — the counterpart's list entry under the site base, or nowhere
  // — is `switcherDecision`'s (tests/unit/i18n/arrival.test.ts) and the Layout's `choose`
  // (not-found-wiring.test.ts). The switcher hands over the locale chosen and nothing else.
  it.each([
    ['en', 'zh-TW'],
    ['zh-TW', 'en'],
  ] as const)('on a %s page hands %s to the provided choice', async (page, other) => {
    const wrapper = mountAt(page)
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    await wrapper.find(`[data-locale-option="${other}"]`).trigger('click')
    expect(choose).toHaveBeenCalledTimes(1)
    expect(choose).toHaveBeenCalledWith(other)
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
    const wrapper = mountAt('en')
    const toggle = wrapper.find('[data-locale-switcher-toggle]')

    await toggle.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(true)
    expect(toggle.attributes('aria-controls')).toBe(wrapper.find('[data-locale-switcher-menu]').attributes('id'))

    const option = wrapper.find('[role="option"]')
    expect(option.attributes('tabindex')).toBe('0')
    await option.trigger('keydown', { key: 'Enter' })
    expect(choose).toHaveBeenCalledWith('zh-TW')
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
    const wrapper = mountAt('en')
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(true)
    await wrapper.find('[data-locale-option="zh-TW"]').trigger('click')
    expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(false)
  })

  it('closes the dropdown on a click outside, and leaves it open on a click inside', async () => {
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

  // Round 2, R2-01: an early return in select() once compared the vue-i18n RUNTIME
  // locale, so whenever the runtime and the page disagreed the offered option was a
  // no-op and the switcher was dead. select() has no early return now (spec 0008: the
  // Layout decides, and choosing the page's own locale is the way back, B5); this keeps
  // the divergent state, which the product can produce, handing the choice over.
  it('switches even when the runtime locale disagrees with the page locale', async () => {
    const wrapper = mountAt('en', 'zh-TW')
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    // The menu offers the locale the PAGE is not in.
    await wrapper.find('[data-locale-option="zh-TW"]').trigger('click')
    expect(choose).toHaveBeenCalledWith('zh-TW')
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

  // Spec 0008, B2 (overridden contract: the switcher changed the runtime locale on every choice):
  // the interface follows the URL, so it changes only when the choice navigates.
  it.each([
    ['en', 'zh-TW'],
    ['zh-TW', 'en'],
  ] as const)('on a %s page, a choice of %s that navigates switches the runtime locale', async (page, other) => {
    chooseResult.value = 'navigate'
    const i18n = makeI18n(page)
    const wrapper = mountAt(page, i18n)
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    await wrapper.find(`[data-locale-option="${other}"]`).trigger('click')
    expect(i18n.global.locale.value).toBe(other)
  })

  it('a choice that stays leaves the runtime locale alone (B2)', async () => {
    const i18n = makeI18n('en')
    const wrapper = mountAt('en', i18n)
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    await wrapper.find('[data-locale-option="zh-TW"]').trigger('click')
    expect(choose).toHaveBeenCalledWith('zh-TW')
    expect(i18n.global.locale.value).toBe('en')
  })

  it('chooses the other locale with Space too', async () => {
    const wrapper = mountAt('en')
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    await wrapper.find('[data-locale-option="zh-TW"]').trigger('keydown', { key: ' ' })
    expect(choose).toHaveBeenCalledWith('zh-TW')
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

// Spec 0008, B5: while the line shows, the menu also offers the page's own locale, the way back.
describe('LocaleSwitcher with the line showing', () => {
  it.each([
    ['en', 'zh-TW', 'English'],
    ['zh-TW', 'en', '繁體中文'],
  ] as const)('on a %s page offers %s, then the page\'s own locale, under the page\'s title', async (page, other, title) => {
    line.value = other
    const wrapper = mountAt(page)
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    const options = wrapper.findAll('[role="option"]')
    expect(options.map((o) => o.attributes('data-locale-option'))).toEqual([other, page])
    for (const option of options) expect(option.attributes('aria-selected')).toBe('false')
    expect(wrapper.find('[data-locale-current]').text()).toBe(title)
  })

  it('chooses the page\'s own locale with a click and closes the menu', async () => {
    line.value = 'zh-TW'
    const wrapper = mountAt('en')
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    await wrapper.find('[data-locale-option="en"]').trigger('click')
    expect(choose).toHaveBeenCalledWith('en')
    expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(false)
  })

  it.each(['Enter', ' '])('chooses the page\'s own locale with %j and closes the menu', async (key) => {
    line.value = 'zh-TW'
    const wrapper = mountAt('en')
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    const own = wrapper.find('[data-locale-option="en"]')
    expect(own.attributes('tabindex')).toBe('0')
    await own.trigger('keydown', { key })
    expect(choose).toHaveBeenCalledWith('en')
    expect(wrapper.find('[data-locale-switcher-menu]').exists()).toBe(false)
  })

  it('offers only the other locale again once the line is gone', async () => {
    line.value = 'zh-TW'
    const wrapper = mountAt('en')
    line.value = null
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    expect(wrapper.findAll('[role="option"]').map((o) => o.attributes('data-locale-option'))).toEqual(['zh-TW'])
  })
})

// Mounted alone, with no Layout above it: no line, and a choice is only remembered.
describe('LocaleSwitcher without the Layout\'s provider', () => {
  it('offers the other locale and remembers the choice', async () => {
    mockLocaleIndex.value = 'root'
    const wrapper = mount(LocaleSwitcher, { global: { plugins: [makeI18n('en')] } })
    await wrapper.find('[data-locale-switcher-toggle]').trigger('click')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(1)
    await wrapper.find('[data-locale-option="zh-TW"]').trigger('click')
    expect(readStoredLocale()).toBe('zh-TW')
  })
})

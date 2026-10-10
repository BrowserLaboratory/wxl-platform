import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createI18n } from 'vue-i18n'
import en from '../../../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../../../.vitepress/theme/i18n/messages/zh-TW.json'

// Mock vitepress useData + useRouter (LocaleSwitcher inside MergedNav uses useRouter)
const mockIsDark = ref(false)
// VitePress resolves this per page from the page's own relativePath, so it is
// already correct during SSR. `'root'` is what it reports for English.
const mockLocaleIndex = ref<'root' | 'zh-TW'>('root')
// The production `withBase` is identity only because this site's base is '/'.
// A non-identity double is what makes the localizePath-before-withBase
// ordering testable at all — see the ordering test below.
const mockBase = { value: '' }
// The socialLinks fixture is KEPT ON PURPOSE. Deleting it would leave a test
// that passes even if the GitHub markup were restored, which is the exact
// shape of the defect being removed.
vi.mock('vitepress', () => ({
  useData: vi.fn(() => ({
    isDark: mockIsDark,
    localeIndex: mockLocaleIndex,
    site: {
      value: {
        themeConfig: {
          socialLinks: [
            { icon: 'github', link: 'https://github.com/example/repo' },
          ],
        },
      },
    },
  })),
  useRouter: vi.fn(() => ({ go: vi.fn(), route: { path: '/' } })),
  withBase: (url: string) => mockBase.value + url,
}))

import MergedNav from '../../../.vitepress/theme/components/MergedNav.vue'

function makeI18n(locale: 'en' | 'zh-TW') {
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

/**
 * Mounts with BOTH the resolved page locale and the i18n locale set to the same
 * value — the ordinary case. Hrefs AND labels both come from the page locale;
 * the runtime locale is set here only so the mount has an i18n instance of its
 * own. (tests/setup.ts installs a zh-TW instance globally, so an English
 * assertion that does not override it would silently assert Chinese.)
 *
 * The case where the two DISAGREE is what proves which one drives the output,
 * and it has its own mounts further down.
 */
function mountIn(locale: 'en' | 'zh-TW', props = defaultProps) {
  mockLocaleIndex.value = locale === 'zh-TW' ? 'zh-TW' : 'root'
  return mount(MergedNav, { props, global: { plugins: [makeI18n(locale)] } })
}

/**
 * The Home and Docs links live in the hamburger dropdown, which is `v-if`-gated
 * on the toggle. A test that asserts over `findAll('a')` without opening it is
 * vacuous — it passes because nothing is rendered, not because the assertion
 * holds. Every assertion that reaches those two links opens the menu first,
 * either through this helper or by triggering the toggle inline.
 */
/**
 * The visible label carried by the anchor at `href`. The back link holds two
 * spans — the full label shown at lg and up, and a bare arrow shown below it —
 * so the anchor's own text() concatenates both. Read the wide-viewport label
 * when there is one; the hamburger links carry their label directly.
 */
function labelOf(wrapper: ReturnType<typeof mount>, href: string) {
  const anchor = wrapper.find(`a[href="${href}"]`)
  expect(anchor.exists()).toBe(true)
  const wide = anchor.find('span.lg\\:inline')
  return wide.exists() ? wide.text() : anchor.text()
}

async function mountOpened(locale: 'en' | 'zh-TW', props = defaultProps) {
  const wrapper = mountIn(locale, props)
  await wrapper.find('[data-hamburger]').trigger('click')
  expect(wrapper.find('[data-hamburger-menu]').exists()).toBe(true)
  return wrapper
}

beforeEach(() => {
  mockLocaleIndex.value = 'root'
  mockBase.value = ''
})

const defaultProps = {
  title: 'SQL Injection Demo',
  difficulty: 'easy',
  category: 'web',
  runtimeReady: false,
  runtimeError: null as string | null,
  noteCount: 0,
  descriptionCollapsed: false,
  number: 1,
  completed: false,
}

describe('MergedNav', () => {
  it('renders WXL brand text', () => {
    const wrapper = mount(MergedNav, { props: defaultProps })
    expect(wrapper.text()).toContain('WXL')
  })

  // Values are taken verbatim from the Example table of the spec requirement
  // "Merged nav internal links are locale-aware and labelled via i18n".
  it.each([
    ['en', '/challenges/', '/', '/guide/'],
    ['zh-TW', '/zh-TW/challenges/', '/zh-TW/', '/zh-TW/guide/'],
  ] as const)('in %s, nav links stay inside that locale tree', async (locale, challenges, home, guide) => {
    const wrapper = await mountOpened(locale)
    for (const href of [challenges, home, guide]) {
      expect(wrapper.find(`a[href="${href}"]`).exists()).toBe(true)
    }
  })

  // /docs/ has never resolved: srcDir is "platform", so /docs/ would require a
  // platform/docs/ directory, which does not exist. It is a 404 in both locales.
  it.each(['en', 'zh-TW'] as const)('in %s, no link targets the dead /docs/ route', async (locale) => {
    const wrapper = await mountOpened(locale)
    const hrefs = wrapper.findAll('a').map(a => a.attributes('href') ?? '')
    expect(hrefs.filter(h => h.includes('/docs/'))).toEqual([])
  })

  // Each label is bound to the href that must carry it. Asserting over
  // wrapper.text() could not tell which anchor carried which label — swapping
  // Home and Docs left the whole suite green (round 1, F12).
  it.each([
    ['en', [['/challenges/', '← Challenges'], ['/', 'Home'], ['/guide/', 'Docs']]],
    ['zh-TW', [['/zh-TW/challenges/', '← 題目列表'], ['/zh-TW/', '首頁'], ['/zh-TW/guide/', '文件']]],
  ] as const)('in %s, each nav label sits on its own href', async (locale, pairs) => {
    const wrapper = await mountOpened(locale)
    for (const [href, label] of pairs) {
      expect(labelOf(wrapper, href)).toBe(label)
    }
  })

  // Labels must follow the PAGE locale, not the vue-i18n runtime locale: the
  // runtime instance is `en` until hydration, so translating against it shipped
  // an English back-link label into the static HTML of every zh-TW page while
  // the href beside it was already correct (round 1, F24).
  //
  // Setting the two locales APART is the whole point. With them equal, the `en`
  // row passes against the pre-change component, which hardcoded these exact
  // English literals — that is what made the previous version vacuous (F11).
  it.each([
    ['zh-TW', 'en', [['/zh-TW/challenges/', '← 題目列表'], ['/zh-TW/', '首頁'], ['/zh-TW/guide/', '文件']]],
    ['en', 'zh-TW', [['/challenges/', '← Challenges'], ['/', 'Home'], ['/guide/', 'Docs']]],
  ] as const)(
    'on a %s page, labels ignore the runtime locale %s',
    async (pageLocale, runtimeLocale, pairs) => {
      mockLocaleIndex.value = pageLocale === 'zh-TW' ? 'zh-TW' : 'root'
      const wrapper = mount(MergedNav, {
        props: defaultProps,
        global: { plugins: [makeI18n(runtimeLocale)] },
      })
      await wrapper.find('[data-hamburger]').trigger('click')
      for (const [href, label] of pairs) {
        expect(labelOf(wrapper, href)).toBe(label)
      }
    },
  )

  // ── The class-level guard ────────────────────────────────────────────────
  //
  // Three rounds of review each found ONE more hardcoded English string in this
  // bar: the back link (r1), the Notes label (r2), the runtime-status tooltips
  // (r3). Each time the fix was applied to the position that was pointed at and
  // a comment asserted the class was now closed; each time the next round
  // falsified that comment from the same file. CLAUDE.md S5 names this exact
  // failure — fixing the position rather than the rule — and records it
  // recurring three times before this one.
  //
  // So the claim stops being a comment and becomes an assertion: every
  // user-visible string the component renders must differ between the two
  // locales, unless it is on an explicit allowlist of things that legitimately
  // do not translate. Adding an untranslated string now fails here, whatever
  // else the author remembers to check.
  it('renders no untranslated user-visible string', async () => {
    // Things that are the same in both locales BY DESIGN. Every entry needs a
    // reason; if you are adding one to make this test pass, you are probably
    // adding the defect this test exists to catch.
    const ALLOWED = new Set([
      'WXL',        // the product name, a proper noun
      '←',          // glyph
      '|',          // separator glyph
      '☰',          // glyph
      '📖',          // emoji prefix, sits beside a translated label
      'easy',       // difficulty badge: raw frontmatter, authoring data not UI copy
      'web',        // category badge: same
      'sqli-demo',  // the challenge title fixture
      'SQL Injection Demo',
    ])

    // Every conditional branch must be visited, or the guard only covers the
    // ones the default props happen to render. Hardcoding the runtime-ready
    // tooltip killed nothing until this loop existed.
    const VARIANTS = [
      { ...defaultProps, descriptionCollapsed: true, runtimeReady: false, runtimeError: null },
      { ...defaultProps, descriptionCollapsed: true, runtimeReady: true, runtimeError: null },
      { ...defaultProps, descriptionCollapsed: false, runtimeReady: false, runtimeError: null },
      // The completion badge is `v-if`-gated, so without this variant its label never
      // enters the surface and hardcoding it kills nothing.
      { ...defaultProps, descriptionCollapsed: true, runtimeReady: true, runtimeError: null, completed: true },
    ]

    async function surfaceOf(locale: 'en' | 'zh-TW') {
      const strings: string[] = []
      for (const props of VARIANTS) strings.push(...(await surfaceOfVariant(locale, props)))
      return strings
    }

    async function surfaceOfVariant(locale: 'en' | 'zh-TW', props: typeof defaultProps) {
      const wrapper = await mountOpened(locale, props)
      const strings: string[] = []
      for (const el of wrapper.findAll('*')) {
        for (const attr of ['title', 'aria-label']) {
          const v = el.attributes(attr)
          if (v) strings.push(v)
        }
        // Own text only — children are visited in their own turn.
        for (const node of Array.from(el.element.childNodes)) {
          if (node.nodeType === 3) {
            const s = (node.textContent ?? '').trim()
            if (s) strings.push(s)
          }
        }
      }
      return strings
    }

    const en = await surfaceOf('en')
    const zh = await surfaceOf('zh-TW')
    expect(en.length).toBeGreaterThan(0)
    expect(zh.length).toBe(en.length)

    const untranslated = en
      .map((s, i) => [s, zh[i]] as const)
      .filter(([a, b]) => a === b && !ALLOWED.has(a))
      .map(([a]) => a)
    expect(untranslated).toEqual([])
  })

  // The round-1 fix routed SIX label sites through the page locale but only the
  // three nav links were asserted. Mutating the dark-mode title or the
  // description-toggle label back to an English literal killed nothing, so the
  // other half of that fix was unobserved. Both are asserted here.
  it.each([
    ['en', false, 'Switch to dark mode'],
    ['en', true, 'Switch to light mode'],
    ['zh-TW', false, '切換至深色模式'],
    ['zh-TW', true, '切換至淺色模式'],
  ] as const)('in %s with isDark=%s, the dark-mode toggle title follows the page locale', (locale, dark, expected) => {
    mockIsDark.value = dark
    expect(mountIn(locale).find('[data-darkmode-toggle]').attributes('title')).toBe(expected)
  })

  it.each([
    ['en', 'Description'],
    ['zh-TW', '題目'],
  ] as const)('in %s, the description toggle label follows the page locale', (locale, expected) => {
    const wrapper = mountIn(locale, { ...defaultProps, descriptionCollapsed: true })
    expect(wrapper.find('[data-desc-toggle]').text()).toContain(expected)
  })

  // Round 2, R2-03: the Notes label was a hardcoded English literal — a seventh
  // label site that the round-1 comment's "every label" claim did not cover, and
  // that no mutation could kill because nothing observed it. It shipped as
  // "Notes" on zh-TW pages beside a correctly translated back link.
  it.each([
    ['en', 'Notes'],
    ['zh-TW', '筆記'],
  ] as const)('in %s, the Notes button label follows the page locale', (locale, expected) => {
    const label = mountIn(locale).find('[data-notes-btn]').find('span.lg\\:inline')
    expect(label.exists()).toBe(true)
    expect(label.text()).toBe(expected)
  })

  // Code review, low: below lg the text spans carry `hidden` (display:none), so
  // they contribute nothing to the accessible name — the back link and the Notes
  // button were nameless on mobile, and the hamburger had no name at any width.
  // The untranslated-string guard cannot see this: it allowlists ☰ and ← as
  // glyphs, which is right for text and wrong for accessible names.
  it.each([
    ['en', { back: 'Challenges', notes: 'Notes', menu: 'Menu' }],
    ['zh-TW', { back: '題目列表', notes: '筆記', menu: '選單' }],
  ] as const)('in %s, every icon-only control has an accessible name', async (locale, want) => {
    const wrapper = mountIn(locale)
    expect(wrapper.find('a[href*="challenges/"]').attributes('aria-label')).toBe(want.back)
    expect(wrapper.find('[data-notes-btn]').attributes('aria-label')).toBe(want.notes)
    const burger = wrapper.find('[data-hamburger]')
    expect(burger.attributes('aria-label')).toBe(want.menu)
    expect(burger.attributes('aria-expanded')).toBe('false')
    expect(burger.attributes('aria-controls')).toBe('merged-nav-menu')
    await burger.trigger('click')
    expect(wrapper.find('[data-hamburger]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-hamburger-menu]').attributes('id')).toBe('merged-nav-menu')
  })

  // Round 3: the hamburger was only ever opened by tests, so a toggle stuck in
  // the open direction would have passed everything.
  it('toggles the hamburger menu both ways', async () => {
    const wrapper = mountIn('en')
    expect(wrapper.find('[data-hamburger-menu]').exists()).toBe(false)
    await wrapper.find('[data-hamburger]').trigger('click')
    expect(wrapper.find('[data-hamburger-menu]').exists()).toBe(true)
    await wrapper.find('[data-hamburger]').trigger('click')
    expect(wrapper.find('[data-hamburger-menu]').exists()).toBe(false)
  })

  // Round 1, F01/F16: deleting `<LocaleSwitcher />` from the template left all
  // 948 tests green, while two MODIFIED requirements assert the bar contains it.
  // Composition was asserted nowhere; locale-switcher.test.ts only ever mounts
  // the component standalone.
  it.each(['en', 'zh-TW'] as const)('in %s, the bar composes a locale switcher', (locale) => {
    expect(mountIn(locale).find('[data-locale-switcher-toggle]').exists()).toBe(true)
  })

  // localizePath takes a BASE-LESS path; withBase wraps its output. Reversing
  // the order emits the locale segment outside the base (/zh-TW/my-base/...).
  // The production base is '/', so this class of bug is invisible without a
  // non-identity double.
  it.each([
    ['en', ['/my-base/challenges/', '/my-base/', '/my-base/guide/'], ['/zh-TW/my-base/challenges/']],
    ['zh-TW', ['/my-base/zh-TW/challenges/', '/my-base/zh-TW/', '/my-base/zh-TW/guide/'], ['/zh-TW/my-base/challenges/']],
  ] as const)('in %s, ALL THREE links wrap the localised path in the site base', async (locale, wanted, unwanted) => {
    mockBase.value = '/my-base'
    const wrapper = await mountOpened(locale)
    for (const href of wanted) {
      expect(wrapper.find(`a[href="${href}"]`).exists()).toBe(true)
    }
    // The wrong composition order puts the locale segment outside the base.
    for (const href of unwanted) {
      expect(wrapper.find(`a[href="${href}"]`).exists()).toBe(false)
    }
    // And no internal link may skip the base entirely — the previous version of
    // this test covered only the back link, so the hamburger links could drop
    // withBase and stay green.
    const internal = wrapper.findAll('a')
      .map(a => a.attributes('href') ?? '')
      .filter(h => h.startsWith('/'))
    expect(internal.length).toBe(3)
    expect(internal.filter(h => !h.startsWith('/my-base/'))).toEqual([])
  })

  it('renders challenge title', () => {
    const wrapper = mount(MergedNav, { props: defaultProps })
    expect(wrapper.text()).toContain('SQL Injection Demo')
  })

  it('renders difficulty badge', () => {
    const wrapper = mount(MergedNav, { props: defaultProps })
    const badge = wrapper.find('[data-badge="difficulty"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('easy')
  })

  it('renders category badge', () => {
    const wrapper = mount(MergedNav, { props: defaultProps })
    const badge = wrapper.find('[data-badge="category"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('web')
  })

  it('shows runtime loading indicator when not ready', () => {
    const wrapper = mount(MergedNav, { props: { ...defaultProps, runtimeReady: false, runtimeError: null } })
    const status = wrapper.find('[data-runtime-status]')
    expect(status.exists()).toBe(true)
  })

  it('shows green dot when runtime is ready', () => {
    const wrapper = mount(MergedNav, { props: { ...defaultProps, runtimeReady: true } })
    const status = wrapper.find('[data-runtime-status="ready"]')
    expect(status.exists()).toBe(true)
  })

  it('shows error indicator when runtime has error', () => {
    const wrapper = mount(MergedNav, { props: { ...defaultProps, runtimeError: 'WASM failed' } })
    const status = wrapper.find('[data-runtime-status="error"]')
    expect(status.exists()).toBe(true)
  })

  it('renders notes button and emits open-notes on click', async () => {
    const wrapper = mount(MergedNav, { props: { ...defaultProps, noteCount: 3 } })
    const notesBtn = wrapper.find('[data-notes-btn]')
    expect(notesBtn.exists()).toBe(true)
    await notesBtn.trigger('click')
    expect(wrapper.emitted('open-notes')).toHaveLength(1)
  })

  it('renders dark mode toggle and toggles isDark on click', async () => {
    mockIsDark.value = false
    const wrapper = mount(MergedNav, { props: defaultProps })
    const toggle = wrapper.find('[data-darkmode-toggle]')
    expect(toggle.exists()).toBe(true)
    await toggle.trigger('click')
    expect(mockIsDark.value).toBe(true)
  })

  // The inverse of the test this replaces. The fixture above still configures
  // socialLinks; the component must ignore it. Two render sites were deleted
  // (desktop utility row and hamburger menu), so this must catch both.
  it('renders no external link even when socialLinks is configured', async () => {
    for (const locale of ['en', 'zh-TW'] as const) {
      const anchors = (await mountOpened(locale)).findAll('a')
      expect(anchors.filter(a => (a.attributes('href') ?? '').startsWith('http'))).toEqual([])
      expect(anchors.filter(a => a.attributes('target') === '_blank')).toEqual([])
    }
  })

  it('shows description toggle button when description is collapsed', () => {
    const wrapper = mount(MergedNav, { props: { ...defaultProps, descriptionCollapsed: true } })
    const descBtn = wrapper.find('[data-desc-toggle]')
    expect(descBtn.exists()).toBe(true)
  })

  it('emits toggle-description when description button is clicked', async () => {
    const wrapper = mount(MergedNav, { props: { ...defaultProps, descriptionCollapsed: true } })
    const descBtn = wrapper.find('[data-desc-toggle]')
    await descBtn.trigger('click')
    expect(wrapper.emitted('toggle-description')).toHaveLength(1)
  })

  it('does not show description toggle button when description is expanded', () => {
    const wrapper = mount(MergedNav, { props: { ...defaultProps, descriptionCollapsed: false } })
    const descBtn = wrapper.find('[data-desc-toggle]')
    expect(descBtn.exists()).toBe(false)
  })
})

// The short link sits in the nav rather than in the description panel because
// the panel spends most of a challenge collapsed, and a link the reader cannot
// see is a link they cannot hand out.
describe('MergedNav short link', () => {
  it('shows the challenge short link beside the title', () => {
    const wrapper = mountIn('en')
    expect(wrapper.find('[data-short-link]').text()).toBe('wxl.browserlab.online/c/001')
  })

  it('keeps the short link visible while the description panel is collapsed', () => {
    const wrapper = mountIn('en', { ...defaultProps, descriptionCollapsed: true })
    expect(wrapper.find('[data-short-link]').exists()).toBe(true)
    expect(wrapper.find('[data-copy-link]').exists()).toBe(true)
  })

  it('follows the page locale, not the runtime locale', () => {
    // Same rule as every label in this bar: the runtime instance starts at `en`
    // and only reaches the right value after hydration, so a zh-TW page would
    // otherwise ship `/c/001` into its static HTML.
    mockLocaleIndex.value = 'zh-TW'
    const wrapper = mount(MergedNav, { props: defaultProps, global: { plugins: [makeI18n('en')] } })
    expect(wrapper.find('[data-short-link]').text()).toBe('wxl.browserlab.online/zh/c/001')
  })

  it('shows no short link for a challenge that carries no number', () => {
    const wrapper = mountIn('en', { ...defaultProps, number: undefined })
    expect(wrapper.find('[data-short-link]').exists()).toBe(false)
  })
})


// After C1 a solved challenge that is opened again starts a FRESH attack session and
// keeps the earlier one, so the page a returning learner lands on is indistinguishable
// from a first attempt. This badge is the only thing on it that says otherwise.
describe('MergedNav completion marker', () => {
  // Exactly two, not "at least one". This bar renders its title strip twice — once for
  // md and up, once for the mobile second row — and the badge belongs on both. Written
  // as `length > 0` this assertion survives the desktop copy being disabled outright,
  // measured: a mutation that removed it killed nothing in this file. The count is what
  // notices that one of the two instances stopped rendering.
  it('shows the marker on both the desktop and the mobile title rows', () => {
    const wrapper = mountIn('zh-TW', { ...defaultProps, completed: true })
    const badges = wrapper.findAll('[data-challenge-done]')
    expect(badges).toHaveLength(2)
    // Discriminated on `hidden`, not on `md:inline-flex`. `hidden` is the half that
    // keeps the desktop copy off a phone viewport, where row 1 still renders and the
    // mobile row already carries its own badge; keyed on `md:inline-flex` alone this
    // assertion survives `hidden` being dropped, which would show the badge twice.
    const desktop = badges.filter(b => b.classes().includes('hidden'))
    expect(desktop).toHaveLength(1)
    expect(desktop[0].classes()).toContain('md:inline-flex')
    const mobile = badges.filter(b => !b.classes().includes('hidden'))
    expect(mobile).toHaveLength(1)
    // The mobile row's copy is icon-only at every width it renders at. That row has no
    // free space — its title is `flex-1`, so the title holds it — and a labelled badge
    // took the title from 45px to 10px at 360px. Asserted on the label span's class,
    // which is what carries the rule; the width effect itself is measured in the browser.
    // The mobile row's copy is never labelled: that row has no free space at any width
    // it renders at, because its title is `flex-1` and holds the free space itself.
    // The desktop copy only renders from md up, where the row has room, so it is always
    // labelled. Asserted on the class each mode produces; the width effect itself is
    // measured in the browser (evidence/gates.txt G-E).
    expect(mobile[0].get('span').classes()).toContain('sr-only')
    expect(mobile[0].get('span').classes()).not.toContain('min-[560px]:not-sr-only')
    expect(desktop[0].get('span').classes()).not.toContain('sr-only')
  })

  it('shows no marker on either row for a challenge the learner has not completed', () => {
    const wrapper = mountIn('zh-TW', { ...defaultProps, completed: false })
    expect(wrapper.findAll('[data-challenge-done]')).toHaveLength(0)
  })

  // D6: one presentation, one sentence. The list renders the same component with the
  // same message key, so the two surfaces cannot drift into saying different things.
  it.each([
    ['en', 'Solved'],
    ['zh-TW', '已完成'],
  ] as const)('in %s both markers carry the shared label', (locale, expected) => {
    const wrapper = mountIn(locale, { ...defaultProps, completed: true })
    const texts = wrapper.findAll('[data-challenge-done]').map(b => b.text())
    expect(texts).toHaveLength(2)
    for (const t of texts) expect(t).toContain(expected)
  })

  // The label follows the PAGE locale, not the vue-i18n runtime locale — the same rule
  // every other string in this bar obeys, and for the same reason: the runtime starts
  // at `en` and only catches up after hydration, so a runtime-translated badge would
  // ship English into the static HTML of a zh-TW challenge page.
  it('takes the marker label from the page locale, not the runtime locale', () => {
    mockLocaleIndex.value = 'zh-TW'
    const wrapper = mount(MergedNav, {
      props: { ...defaultProps, completed: true },
      global: { plugins: [makeI18n('en')] },
    })
    const texts = wrapper.findAll('[data-challenge-done]').map(b => b.text())
    expect(texts).toHaveLength(2)
    for (const t of texts) expect(t).toContain('已完成')
  })

  // The nav is handed the answer; it does not go looking for one. A component that
  // opened the database here would do it on every challenge page load, and would make
  // the bar's rendering depend on storage being available.
  it('opens no database of its own', async () => {
    const persistence = await import('../../../.vitepress/theme/composables/useChallengePersistence')
    const spy = vi.spyOn(persistence, 'useChallengePersistence')
    mountIn('zh-TW', { ...defaultProps, completed: true })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

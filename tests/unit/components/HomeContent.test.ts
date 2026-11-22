import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '../../../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../../../.vitepress/theme/i18n/messages/zh-TW.json'
import type { ChallengeData, ChallengeLists } from '../../../platform/shared/challenges.data'
import { mergeLocaleChallenges } from '../../../platform/shared/mergeChallenges'

// The page's locale, as VitePress resolves it, set apart from the runtime locale in the cases that
// mount the component (spec 0008, E6: the mark follows the page).
const mockLocaleIndex = { value: 'root' as 'root' | 'zh-TW' }
// Identity by default; the L22 case makes it prefix a non-root base.
const mockWithBase = vi.hoisted(() => ({ prefix: '' }))
vi.mock('vitepress', () => ({
  withBase: (path: string) => `${mockWithBase.prefix}${path}`,
  useData: () => ({ localeIndex: mockLocaleIndex }),
}))

// `P` (D31): defaults to 'en', today's build, so every existing case below (which sets
// `mockLocaleIndex` directly assuming 'root' means English) keeps its meaning unchanged (T1).
// Cases that gain `P = zh-TW` expectations set this explicitly (A28, A32, BC14).
const mockPrimaryLocale = vi.hoisted(() => ({ value: 'en' as 'en' | 'zh-TW' }))
vi.mock('../../../.vitepress/theme/i18n/primaryLocale', () => ({ primaryLocale: () => mockPrimaryLocale.value }))

// Test the sorting and stats logic directly
function computeStats(challenges: ChallengeData[]) {
  const total = challenges.length
  const easy = challenges.filter(c => c.difficulty === 'easy').length
  const medium = challenges.filter(c => c.difficulty === 'medium').length
  const hard = challenges.filter(c => c.difficulty === 'hard').length
  const mystery = challenges.filter(c => !['easy','medium','hard'].includes(c.difficulty ?? '')).length
  return { total, easy, medium, hard, mystery }
}

function computeLatest(challenges: ChallengeData[], limit = 3): ChallengeData[] {
  return [...challenges]
    .filter(c => c.date)
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
    .slice(0, limit)
}

/** A list as the loader's output: the same array under every locale, so whichever locale the page is in gets it. */
const listsOf = (list: ChallengeData[]): ChallengeLists => ({ en: list, 'zh-TW': list })

const mockChallenges: ChallengeData[] = [
  { id: 1, title: 'SQLi', url: '/challenge/sqli', locale: 'en', difficulty: 'easy', category: 'web', date: '2025-03-01T00:00:00.000Z', tags: ['sql'], description: 'SQL injection challenge' },
  { id: 2, title: 'PHP LFI', url: '/challenge/php', locale: 'en', difficulty: 'medium', category: 'web', date: '2025-03-15T00:00:00.000Z', tags: ['lfi'], description: 'PHP file inclusion' },
  { id: 3, title: 'FastAPI IDOR', url: '/challenge/fastapi', locale: 'en', difficulty: 'easy', category: 'web', date: '2025-04-01T00:00:00.000Z', tags: ['idor'], description: 'IDOR challenge' },
  { id: 4, title: 'Mystery Box', url: '/challenge/mystery', locale: 'en', difficulty: 'mystery', category: 'web', date: undefined, tags: [], description: '' },
]

describe('HomeContent stats computation', () => {
  it('counts total challenges', () => {
    const stats = computeStats(mockChallenges)
    expect(stats.total).toBe(4)
  })

  it('counts easy challenges', () => {
    const stats = computeStats(mockChallenges)
    expect(stats.easy).toBe(2)
  })

  it('counts medium challenges', () => {
    const stats = computeStats(mockChallenges)
    expect(stats.medium).toBe(1)
  })

  it('counts hard challenges', () => {
    const stats = computeStats(mockChallenges)
    expect(stats.hard).toBe(0)
  })

  it('counts mystery challenges (non easy/medium/hard)', () => {
    const stats = computeStats(mockChallenges)
    expect(stats.mystery).toBe(1)
  })
})

describe('HomeContent latest challenges sorting', () => {
  it('returns latest 3 challenges sorted by date descending', () => {
    const latest = computeLatest(mockChallenges)
    expect(latest).toHaveLength(3)
    expect(latest[0].title).toBe('FastAPI IDOR')   // 2025-04-01 — most recent
    expect(latest[1].title).toBe('PHP LFI')         // 2025-03-15
    expect(latest[2].title).toBe('SQLi')             // 2025-03-01
  })

  it('excludes challenges without a date', () => {
    const latest = computeLatest(mockChallenges)
    expect(latest.find(c => c.title === 'Mystery Box')).toBeUndefined()
  })

  it('respects the limit parameter', () => {
    const latest = computeLatest(mockChallenges, 2)
    expect(latest).toHaveLength(2)
  })
})

// Spec 0008, E6, E7: the home page of a locale counts every challenge, and its latest-challenge
// card for a borrowed one carries the mark in the page's locale and the borrowed text's language.
describe('HomeContent with an untranslated challenge', () => {
  const HOME: ChallengeData[] = [
    { id: 1, number: 1, title: '知的必要', url: '/zh-TW/challenge/door-is-open/', locale: 'zh-TW', difficulty: 'easy', category: 'web', date: '2026-04-02', description: '繁中摘要' },
    { id: 2, number: 2, title: '限員工', url: '/zh-TW/challenge/staff-only/', locale: 'zh-TW', difficulty: 'medium', category: 'web', date: '2026-08-17', description: '另一題' },
    { id: 5, number: 5, title: 'PHP Check', url: '/challenge/v05-php-check/', locale: 'en', difficulty: 'hard', category: '綜合', date: '2026-11-04', description: 'Checks a PHP form' },
  ]
  const runtime = (locale: 'en' | 'zh-TW') =>
    createI18n({ legacy: false, locale, messages: { en, 'zh-TW': zhTW }, missingWarn: false, fallbackWarn: false })
  let HomeContent: typeof import('../../../.vitepress/theme/components/HomeContent.vue').default

  beforeEach(async () => {
    mockPrimaryLocale.value = 'en'
    HomeContent = (await import('../../../.vitepress/theme/components/HomeContent.vue')).default
  })

  it('marks the borrowed newest card 只有英文 with lang="en", and links the English page (E6)', () => {
    mockLocaleIndex.value = 'zh-TW'
    const wrapper = mount(HomeContent, { props: { lists: listsOf(HOME) }, global: { plugins: [runtime('en')] } })
    const card = wrapper.findAll('a').find((a) => a.text().includes('PHP Check'))!
    expect(card.attributes('href')).toBe('/challenge/v05-php-check/')
    expect(card.get('[data-locale-mark]').text()).toBe('只有英文')
    expect(card.findAll('[lang="en"]').map((e) => e.text())).toEqual(expect.arrayContaining(['PHP Check', 'Checks a PHP form']))
    const translated = wrapper.findAll('a').find((a) => a.text().includes('限員工'))!
    expect(translated.find('[data-locale-mark]').exists()).toBe(false)
    expect(translated.find('[lang]').exists()).toBe(false)
  })

  // A28/A32, under P = zh-TW: the same Chinese-home scenario as above, reached via
  // `localeIndex = 'root'` (the primary-locale key) instead of the literal 'zh-TW' key — the
  // generalised pageLocaleOf must still resolve the page to zh-TW.
  it('marks the borrowed newest card 只有英文 under P = zh-TW, localeIndex root (A28, A32)', () => {
    mockPrimaryLocale.value = 'zh-TW'
    mockLocaleIndex.value = 'root'
    const wrapper = mount(HomeContent, { props: { lists: listsOf(HOME) }, global: { plugins: [runtime('en')] } })
    const card = wrapper.findAll('a').find((a) => a.text().includes('PHP Check'))!
    expect(card.get('[data-locale-mark]').text()).toBe('只有英文')
    const translated = wrapper.findAll('a').find((a) => a.text().includes('限員工'))!
    expect(translated.find('[data-locale-mark]').exists()).toBe(false)
    expect(translated.find('[lang]').exists()).toBe(false)
  })

  it('counts all four kinds of entry, borrowed ones included, in the total and their difficulty (E7)', () => {
    mockLocaleIndex.value = 'zh-TW'
    // AC-6's four: translated, English-only, Traditional Chinese-only, and one without a number.
    const four: ChallengeData[] = [
      HOME[0],
      HOME[2],
      { id: 7, number: 7, title: '只有中文', url: '/zh-TW/challenge/zh-only/', locale: 'zh-TW', difficulty: 'mystery', category: '綜合', date: '2026-07-07' },
      { id: 8, title: 'Unnumbered', url: '/challenge/unnumbered/', locale: 'en', difficulty: 'easy', category: '綜合', date: '2026-01-01' },
    ]
    const wrapper = mount(HomeContent, { props: { lists: listsOf(four) }, global: { plugins: [runtime('en')] } })
    const stat = (key: string) => wrapper.get(`[data-stat="${key}"]`).text()
    expect([stat('total'), stat('easy'), stat('medium'), stat('hard'), stat('mystery')]).toEqual(['4', '2', '0', '1', '1'])
  })

  it('names the other locale on the English home page (E6)', () => {
    mockLocaleIndex.value = 'root'
    const borrowed: ChallengeData = { id: 7, number: 7, title: '只有中文', url: '/zh-TW/challenge/zh-only/', locale: 'zh-TW', difficulty: 'mystery', category: 'General', date: '2026-11-04', description: '中文摘要' }
    const wrapper = mount(HomeContent, { props: { lists: listsOf([borrowed]) }, global: { plugins: [runtime('zh-TW')] } })
    expect(wrapper.get('[data-locale-mark]').text()).toBe('Traditional Chinese only')
    expect(wrapper.findAll('[lang="zh-TW"]').map((e) => e.text())).toEqual(expect.arrayContaining(['只有中文', '中文摘要']))
  })

  it('ships the mark in the HTML as served, in the page\'s locale with the runtime still English', async () => {
    mockLocaleIndex.value = 'zh-TW'
    const { createSSRApp, h } = await import('vue')
    const { renderToString } = await import('@vue/server-renderer')
    const app = createSSRApp({ render: () => h(HomeContent, { lists: listsOf(HOME) }) })
    app.use(runtime('en'))
    const html = await renderToString(app)
    expect(html).toContain('只有英文')
    expect(html).not.toContain('Traditional Chinese only')
  })
})

// L22 (D7): a latest-challenge card's `url` is base-less and the component adds the site base exactly
// once. The lists are the merge's own output (0010-S17), for either primary locale and either page.
describe.each(['en', 'zh-TW'] as const)('HomeContent hrefs under P = %s (L22)', (P) => {
  const T = P === 'en' ? 'zh-TW' : 'en'
  const runtime = (locale: 'en' | 'zh-TW') =>
    createI18n({ legacy: false, locale, messages: { en, 'zh-TW': zhTW }, missingWarn: false, fallbackWarn: false })
  const lists = mergeLocaleChallenges({
    briefs: ['door-is-open', 'staff-only'].flatMap((slug) =>
      ([P, T] as const).map((locale) => ({
        locale, slug, url: locale === P ? `/challenge/${slug}/` : `/${locale}/challenge/${slug}/`,
        frontmatter: { title: `${slug} in ${locale}`, description: 'd' },
      })),
    ),
    declarations: new Map([
      ['door-is-open', { ok: true, value: { number: 1, category: 'web', date: '2026-04-02' } }],
      ['staff-only', { ok: true, value: { number: 4, category: 'web', date: '2026-08-17' } }],
    ]),
    locales: ['en', 'zh-TW'],
    primary: P,
  })

  beforeEach(() => {
    mockWithBase.prefix = '/repo'
    mockPrimaryLocale.value = P
  })

  it.each([['the primary page', P], ['the translation page', T]] as const)('every latest card href on %s carries the base once', async (_name, page) => {
    mockLocaleIndex.value = (page === P ? 'root' : page) as 'root' | 'zh-TW'
    const HomeContent = (await import('../../../.vitepress/theme/components/HomeContent.vue')).default
    const wrapper = mount(HomeContent, { props: { lists }, global: { plugins: [runtime('en')] } })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    // Latest first: staff-only (2026-08-17), then door-is-open (2026-04-02).
    expect(hrefs).toEqual(lists[page].slice().reverse().map((entry) => `/repo${entry.url}`))
    mockWithBase.prefix = ''
  })
})

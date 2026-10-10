import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { ChallengeData } from '../../../platform/shared/challenges.data'

// The page's own locale, as VitePress resolves it from the page's relativePath.
// Mutable so a test can put the component on a zh-TW page while the vue-i18n runtime
// instance says something else — which is the only way to see which of the two the
// rendered strings actually follow.
const mockLocaleIndex = { value: 'root' as 'root' | 'zh-TW' }
vi.mock('vitepress', () => ({
  withBase: vi.fn((path: string) => path),
  // The list takes its locale from the page, not from the vue-i18n runtime:
  // the runtime instance starts at `en` and only reaches the right value after
  // hydration, so a zh-TW page would ship `/c/001` into its static HTML and
  // correct it to `/zh/c/001` on hydration.
  useData: () => ({ localeIndex: mockLocaleIndex }),
}))

// Progress is read through the persistence layer, and the list is the only thing
// under test here. Mocked at that boundary so a test that is about markers is not
// also a test of IndexedDB — and so the read can be made to reject on demand, which
// is a state no object-store harness reaches reliably.
const mockListAllProgress = vi.fn(async () => [] as any[])
// The shared-machine gate consults this one, and the list's own tests reach it only
// through the gate. Default false: with the decision marker in place every existing case
// here takes the already-answered fast path and never asks.
const mockHasAnyStoredData = vi.fn(async () => false)
vi.mock('../../../.vitepress/theme/composables/useChallengePersistence', () => ({
  OBJECT_STORES: ['attack-sessions', 'pentest-notes', 'code-drafts', 'challenge-progress'] as const,
  useChallengePersistence: () => ({
    listAllProgress: mockListAllProgress,
    hasAnyStoredData: mockHasAnyStoredData,
  }),
}))

/** A stored progress row. `firstCompletedAt` non-null is the whole of "completed". */
function progress(slug: string, firstCompletedAt: number | null) {
  return { challengeSlug: slug, firstCompletedAt, lastAttemptAt: 1756000000000, attemptCount: 1 }
}

// Typed, not inferred. `difficulty: 'easy'` widens to `string` in a bare array
// literal, which does not satisfy ChallengeData's union — every `mount` that passes
// this fixture reports the same error, so the count grows with the number of mounts
// rather than with the number of mistakes.
const mockChallenges: ChallengeData[] = [
  { id: 1, number: 1, title: 'SQL Injection Demo', url: '/challenge/sqli-demo', difficulty: 'easy', category: 'web' },
  { id: 2, number: 2, title: 'PHP File Inclusion Demo', url: '/challenge/php-demo', difficulty: 'easy', category: 'web' },
  { id: 3, number: 3, title: 'Hard Challenge', url: '/challenge/hard', difficulty: 'hard', category: 'web' },
]

let ChallengeList: typeof import('../../../.vitepress/theme/components/ChallengeList.vue').default

beforeEach(async () => {
  sessionStorage.clear()
  sessionStorage.setItem('wxl-session-gate', 'decided')
  mockListAllProgress.mockReset()
  mockListAllProgress.mockResolvedValue([])
  mockHasAnyStoredData.mockReset()
  mockHasAnyStoredData.mockResolvedValue(false)
  // tests/setup.ts installs a zh-TW *runtime* instance globally. Leaving the page
  // locale at 'root' therefore keeps the two disagreeing, which is the state that
  // makes the page-locale assertions below mean something.
  mockLocaleIndex.value = 'root'
  const mod = await import('../../../.vitepress/theme/components/ChallengeList.vue')
  ChallengeList = mod.default
})

describe('ChallengeList', () => {
  it('renders a card for each challenge', async () => {
    const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges } })
    // Switch to grid view (default is now list)
    await wrapper.find('button[title="格線模式"]').trigger('click')
    const cards = wrapper.findAll('[data-challenge-card]')
    expect(cards).toHaveLength(3)
  })

  it('renders challenge title in each card', () => {
    const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges } })
    expect(wrapper.text()).toContain('SQL Injection Demo')
    expect(wrapper.text()).toContain('PHP File Inclusion Demo')
  })

  it('renders difficulty and category badges', () => {
    const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges } })
    expect(wrapper.text()).toContain('easy')
    expect(wrapper.text()).toContain('web')
  })

  it('each card contains a link to the challenge page', async () => {
    const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges } })
    // Switch to grid view (default is now list)
    await wrapper.find('button[title="格線模式"]').trigger('click')
    const links = wrapper.findAll('a[data-challenge-link]')
    expect(links).toHaveLength(3)
    const hrefs = links.map((l) => l.attributes('href'))
    expect(hrefs.some((h) => h?.includes('sqli-demo'))).toBe(true)
    expect(hrefs.some((h) => h?.includes('php-demo'))).toBe(true)
  })

  it('renders zero-padded id number for each card', () => {
    const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges } })
    expect(wrapper.text()).toContain('#001')
    expect(wrapper.text()).toContain('#002')
    expect(wrapper.text()).toContain('#003')
  })

  it('applies semantic difficulty badge class for hard difficulty', () => {
    const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges } })
    const hardBadge = wrapper.findAll('.ch-badge-hard')
    expect(hardBadge.length).toBeGreaterThan(0)
  })
})

// A short link nobody can see is a short link nobody hands out. The list is
// where a teacher picks one, so it is where the link has to be readable and
// copyable — and copying must not take them off the page they were copying from.
describe('ChallengeList short links', () => {
  it('shows each row its own short link', () => {
    const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges } })
    const links = wrapper.findAll('[data-short-link]').map((el) => el.text())
    expect(links).toContain('wxl.browserlab.online/c/001')
    expect(links).toContain('wxl.browserlab.online/c/003')
  })

  it('does not navigate when the copy control is activated', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    })

    const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges } })
    const row = wrapper.findAll('a').find((a) => a.find('[data-copy-link]').exists())
    expect(row).toBeDefined()

    // The row is an anchor and the button sits inside it. Only stopping
    // propagation keeps the click off the row; asserting on the button alone
    // would pass even if it bubbled.
    const onRowClick = vi.fn()
    row!.element.addEventListener('click', onRowClick)

    await row!.find('[data-copy-link]').trigger('click')

    expect(writeText).toHaveBeenCalledWith('https://wxl.browserlab.online/c/001')
    expect(onRowClick).not.toHaveBeenCalled()
  })
})

// Progress written to the database and never drawn is progress only a teacher can
// read, out of an export file. These are the assertions that it reaches the learner.
//
// The fixture slugs come from the challenge URLs: the list keys progress by the slug
// segment of `url`, which is the same key `recordAttempt` writes under.
describe('ChallengeList completion markers', () => {
  async function mounted(records: any[] = [], props: Record<string, unknown> = {}) {
    mockListAllProgress.mockResolvedValue(records)
    const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges, ...props } })
    await flushPromises()
    return wrapper
  }

  const doneSlugsIn = (wrapper: any) =>
    wrapper.findAll('a').filter((a: any) => a.find('[data-challenge-done]').exists())
      .map((a: any) => a.attributes('href'))

  it('marks a completed challenge in list view', async () => {
    const wrapper = await mounted([progress('sqli-demo', 1756000000000)])
    expect(doneSlugsIn(wrapper)).toEqual(['/challenge/sqli-demo'])
  })

  it('marks a completed challenge in grid view', async () => {
    const wrapper = await mounted([progress('sqli-demo', 1756000000000)])
    await wrapper.find('button[title="格線模式"]').trigger('click')
    const cards = wrapper.findAll('[data-challenge-card]')
    expect(cards).toHaveLength(3)
    const marked = cards.filter((c: any) => c.find('[data-challenge-done]').exists())
    expect(marked.map((c: any) => c.attributes('href'))).toEqual(['/challenge/sqli-demo'])
  })

  // Attempts are not completion. A challenge opened seven times and never solved is a
  // challenge the learner has not solved, and a marker keyed off attempt activity would
  // tell them otherwise.
  it('does not mark a challenge that was attempted but never solved', async () => {
    const wrapper = await mounted([
      { challengeSlug: 'php-demo', firstCompletedAt: null, lastAttemptAt: 1756000009999, attemptCount: 7 },
    ])
    expect(doneSlugsIn(wrapper)).toEqual([])
  })

  it('gives the marker a text label', async () => {
    const wrapper = await mounted([progress('sqli-demo', 1756000000000)])
    expect(wrapper.get('[data-challenge-done]').text()).toContain('Solved')
  })

  // The same completion label also renders in the merged nav, which translates at the
  // page locale. Translated here against the vue-i18n runtime instead, the two would
  // say different words on the two surfaces of one zh-TW page — the runtime starts at
  // `en` and only catches up after hydration.
  //
  // Measured on a real build before this was routed through the page locale: the zh-TW
  // list page shipped `placeholder="Search challenges, descriptions, tags…"`. That
  // defect still stands for this component's toolbar; these two keys are out of it.
  it.each([
    ['root', 'Solved', 'Solved 1 of 3'],
    ['zh-TW', '已完成', '已完成 1 ／ 全部 3'],
  ] as const)('on a %s page the progress strings follow the page locale', async (pageLocale, badge, summary) => {
    mockLocaleIndex.value = pageLocale
    const wrapper = await mounted([progress('sqli-demo', 1756000000000)])
    expect(wrapper.get('[data-challenge-done]').text()).toContain(badge)
    expect(wrapper.get('[data-progress-summary]').text()).toBe(summary)
  })

  // D3, as rewritten. The first version of this reserved a fixed 68px slot on every row
  // and asserted only that the slot ELEMENT existed — deleting the width left it green
  // while the layout shift it was named after came back in full. The width was also the
  // defect: the title is the only shrinkable item on the line, so the reservation was
  // taken out of the title at every width, measured at 390px as 26.5px instead of
  // 102.5px, for every reader including one who has solved nothing.
  //
  // The rule now is placement, and these two assert it by structure: nothing is rendered
  // for an absent marker, and a present marker sits among the badges before the
  // auto-margined date that holds the row's free space.
  it('renders nothing at all for a challenge without a marker', async () => {
    const wrapper = await mounted([progress('sqli-demo', 1756000000000)])
    const unmarked = wrapper.findAll('a.ch-list-row')
      .filter(row => !row.find('[data-challenge-done]').exists())
    expect(unmarked.length).toBe(2)
    for (const row of unmarked) {
      expect(row.html()).not.toContain('data-challenge-done')
      expect(row.html()).not.toContain('min-w-[68px]')
    }
  })

  // Sibling order only. This asserts the marker is positioned where absorption CAN
  // happen — before the element that holds the row's free space — and it deliberately
  // does not claim absorption actually happens: happy-dom applies no stylesheet and
  // computes no layout, so there is no width at which this file could observe it. The
  // measurement that does is evidence/gates.txt G-E, which found that absorption stops
  // below ~430px and that the first version of this rule cost the title 75px.
  it('places the marker before the auto-margined date, inside the badge line', async () => {
    const wrapper = await mounted([progress('sqli-demo', 1756000000000)])
    const row = wrapper.findAll('a.ch-list-row')
      .find(r => r.find('[data-challenge-done]').exists())!
    const line = row.findAll('div')[0]
    const kids = Array.from(line.element.children) as HTMLElement[]
    const badgeAt = kids.findIndex(k => k.hasAttribute('data-challenge-done'))
    const autoAt = kids.findIndex(k => k.className.includes('ml-auto'))
    expect(badgeAt).toBeGreaterThan(-1)
    expect(autoAt).toBeGreaterThan(-1)
    // Before the auto margin: everything to its left keeps its position, and the free
    // space the auto margin holds is what absorbs the badge's width.
    expect(badgeAt).toBeLessThan(autoAt)
  })

  // A row with no marker must be byte-for-byte the row this component rendered before
  // completion existed. Anything rendered "just in case" fails this.
  it('renders an unmarked row identically with and without the feature having data', async () => {
    const withData = await mounted([progress('sqli-demo', 1756000000000)])
    const withoutData = await mounted([])
    const rowOf = (w: any, href: string) =>
      w.findAll('a.ch-list-row').find((r: any) => r.attributes('href') === href)!.html()
    expect(rowOf(withData, '/challenge/hard')).toBe(rowOf(withoutData, '/challenge/hard'))
  })

  // D2: the list is the surface where a per-challenge read would actually hurt — nine
  // queries today, one per challenge forever after. Measured: a mutation that turned
  // the single read into one read per challenge killed nothing in this file until this
  // assertion existed; the only call-count assertion was on the challenge page, which
  // renders one challenge and so cannot tell the two apart.
  it('reads the progress store once, not once per challenge', async () => {
    mockListAllProgress.mockResolvedValue([progress('sqli-demo', 1756000000000)])
    mount(ChallengeList, { props: { challenges: mockChallenges } })
    await flushPromises()
    expect(mockChallenges.length).toBeGreaterThan(1)
    expect(mockListAllProgress).toHaveBeenCalledTimes(1)
  })

  it('shows no marker before progress has been read', () => {
    mockListAllProgress.mockResolvedValue([progress('sqli-demo', 1756000000000)])
    const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges } })
    expect(wrapper.findAll('[data-challenge-done]')).toHaveLength(0)
  })

  // Progress decorates the entries the search, filter and sort state already chose. It
  // is not allowed to add one, remove one, or move one.
  it('does not change which challenges are rendered or their order', async () => {
    const before = mount(ChallengeList, { props: { challenges: mockChallenges } })
    await flushPromises()
    const orderWithout = before.findAll('a.ch-list-row').map(a => a.attributes('href'))

    const after = await mounted([progress('sqli-demo', 1756000000000), progress('hard', 1756000001000)])
    expect(after.findAll('a.ch-list-row').map(a => a.attributes('href'))).toEqual(orderWithout)
  })
})

describe('ChallengeList progress summary', () => {
  async function summaryOf(records: any[], challenges = mockChallenges) {
    mockListAllProgress.mockResolvedValue(records)
    const wrapper = mount(ChallengeList, { props: { challenges } })
    await flushPromises()
    return { wrapper, text: wrapper.get('[data-progress-summary]').text() }
  }

  it('reports how many of the received challenges are completed', async () => {
    const { text } = await summaryOf([progress('sqli-demo', 1), progress('hard', 2)])
    expect(text).toContain('2')
    expect(text).toContain('3')
  })

  it('reports zero completed for a learner with no progress', async () => {
    const { text } = await summaryOf([])
    expect(text).toBe('Solved 0 of 3')
  })

  // The distinction the summary exists on: an empty map before any read means "nobody
  // looked yet", an empty map after one means "there is nothing". Only the second may be
  // stated as a number.
  it('shows no summary at all until a read has come back', () => {
    mockListAllProgress.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges } })
    expect(wrapper.find('[data-progress-summary]').exists()).toBe(false)
  })

  it('shows a read error instead of a summary after failure', async () => {
    mockListAllProgress.mockRejectedValue(new Error('blocked'))
    const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges } })
    await flushPromises()
    expect(wrapper.find('[data-progress-summary]').exists()).toBe(false)
    expect(wrapper.get('[data-progress-error]').text()).toContain('Unable to read')
  })

  // D7: the total is what the learner has to get through, not what the search box is
  // currently showing them. Typing must not appear to change how much they have done.
  it('does not change either number when the reader searches', async () => {
    const { wrapper, text } = await summaryOf([progress('sqli-demo', 1), progress('hard', 2)])
    // Fake timers before the keystroke, not after: the list debounces the query by
    // 300ms, and a timer scheduled under real timers is not one `advanceTimersByTime`
    // can reach. Installed the wrong way round this test filters nothing and then
    // passes, which is the failure it exists to rule out.
    vi.useFakeTimers()
    try {
      await wrapper.find('input[type="text"]').setValue('Hard')
      vi.advanceTimersByTime(400)
      await flushPromises()
      expect(wrapper.findAll('a.ch-list-row').length).toBeLessThan(3)
      expect(wrapper.get('[data-progress-summary]').text()).toBe(text)
    } finally {
      vi.useRealTimers()
    }
  })

  // A retired or renamed challenge leaves its progress row behind. Counted, it would
  // push the completed count past the total — "solved 4 of 3".
  it('ignores progress for a challenge that is no longer listed', async () => {
    const { text } = await summaryOf([
      progress('sqli-demo', 1), progress('hard', 2), progress('retired-long-ago', 3),
    ])
    expect(text).toContain('2')
    // English form. The first version searched for the zh-TW '3 ／ 3', but this helper
    // always mounts at page locale 'root', so the fullwidth separator could never appear
    // and the assertion could never fail for any value of the counts.
    expect(text).toBe('Solved 2 of 3')
  })
})

// D5: nothing is being lost here. The challenge page's persistence warning exists
// because writes failing means the learner's notes are not being saved; a missing
// decoration on a working list page is not that, and an alarm on a working page is
// its own defect.
describe('ChallengeList when progress cannot be read', () => {
  async function afterRejection() {
    mockListAllProgress.mockRejectedValue(new Error('challenge-tools is blocked by another tab'))
    const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges } })
    await flushPromises()
    return wrapper
  }

  it('renders every challenge without a marker', async () => {
    const wrapper = await afterRejection()
    expect(wrapper.findAll('a.ch-list-row')).toHaveLength(3)
    expect(wrapper.findAll('[data-challenge-done]')).toHaveLength(0)
  })

  it('explains read failure without claiming zero completed', async () => {
    const wrapper = await afterRejection()
    expect(wrapper.find('[data-progress-summary]').exists()).toBe(false)
    expect(wrapper.get('[data-progress-error]').text()).toContain('Unable to read')
  })

  it('distinguishes unreadable progress from a successful empty read', async () => {
    mockListAllProgress.mockResolvedValue([])
    const ok = mount(ChallengeList, { props: { challenges: mockChallenges } })
    await flushPromises()

    const failed = await afterRejection()
    expect(ok.find('[data-progress-error]').exists()).toBe(false)
    expect(ok.get('[data-progress-summary]').text()).toContain('0')
    expect(failed.get('[data-progress-error]').text()).toContain('Unable to read')
  })

  it('shows a read alert independently of write warnings', async () => {
    const wrapper = await afterRejection()
    expect(wrapper.findAll('[data-progress-error]')).toHaveLength(1)
    expect(wrapper.findAll('[data-persistence-warning]')).toHaveLength(0)
  })
})

// D1's other half, checked against a real server render rather than against a
// pre-mount snapshot in a browser-shaped environment.
//
// This matters because the two are not the same claim. `mount()` without flushing
// shows that markers are absent for a tick; `renderToString` shows what actually
// ships in the HTML file, where there is no mount, no hydration, and no visitor
// whose progress could be known. The static list is the same file for every reader,
// so a marker in it would be some other learner's answer.
describe('ChallengeList server rendering', () => {
  async function ssr() {
    const { createSSRApp, h } = await import('vue')
    const { renderToString } = await import('@vue/server-renderer')
    const { createI18n } = await import('vue-i18n')
    const en = (await import('../../../.vitepress/theme/i18n/messages/en.json')).default
    const zhTW = (await import('../../../.vitepress/theme/i18n/messages/zh-TW.json')).default

    const app = createSSRApp({ render: () => h(ChallengeList, { challenges: mockChallenges }) })
    app.use(createI18n({
      legacy: false, locale: 'zh-TW', fallbackLocale: 'en', globalInjection: true,
      messages: { en, 'zh-TW': zhTW }, missingWarn: false, fallbackWarn: false,
    }))
    return await renderToString(app)
  }

  it('ships no completion marker, even for a challenge that is completed', async () => {
    mockListAllProgress.mockResolvedValue([progress('sqli-demo', 1756000000000)])
    const html = await ssr()
    expect(html).toContain('SQL Injection Demo')
    // Keyed on the badge's class, not on its label. The label string also appears in
    // the explanatory comment the server renderer emits verbatim, so a substring test
    // on the words fails for the wrong reason. (An earlier version of this comment gave
    // the progress summary as the reason; that was true before the summary was gated on
    // the read settling, and the very next test in this block now asserts the opposite.)
    expect(html).not.toContain('ch-badge-done')
  })

  it('reads no storage during the render', async () => {
    mockListAllProgress.mockResolvedValue([progress('sqli-demo', 1756000000000)])
    await ssr()
    expect(mockListAllProgress).not.toHaveBeenCalled()
  })

  // The total is knowable on the server — it is the prop's length — but the completed
  // half is not, so the pair is not shipped at all. An earlier version shipped
  // "Solved 0 of 3": a claim about a visitor the build has never met, permanent for a
  // no-JS reader and for a crawler, and false for anyone who had solved something.
  it('ships no progress summary at all', async () => {
    mockListAllProgress.mockResolvedValue([progress('sqli-demo', 1756000000000), progress('hard', 1)])
    const html = await ssr()
    // Comments stripped first: Vue's server renderer emits template comments verbatim,
    // and the comment above this element explains itself using the very words the
    // assertion looks for. Checking raw HTML fails on the explanation, not on a render.
    const rendered = html.replace(/<!--[\s\S]*?-->/g, '')
    expect(rendered).not.toContain('data-progress-summary')
    expect(rendered).not.toContain('Solved')
    expect(rendered).not.toContain('已完成')
  })
})

// The build hands this component `/challenge/door-is-open/`; the recorder writes under
// `door-is-open`. If the two disagree the markers are simply never shown, and every
// assertion above still passes because the fixtures agree with each other.
describe('ChallengeList progress keys', () => {
  it('matches a stored slug against the trailing-slash URL the build emits', async () => {
    mockListAllProgress.mockResolvedValue([progress('door-is-open', 1756000000000)])
    const wrapper = mount(ChallengeList, {
      props: {
        challenges: [
          { id: 1, number: 1, title: 'The Door Is Open', url: '/challenge/door-is-open/', difficulty: 'easy', category: 'web' },
          { id: 2, number: 2, title: 'Staff Only', url: '/challenge/staff-only/', difficulty: 'easy', category: 'web' },
        ] as ChallengeData[],
      },
    })
    await flushPromises()
    const marked = wrapper.findAll('a.ch-list-row')
      .filter(a => a.find('[data-challenge-done]').exists())
      .map(a => a.attributes('href'))
    expect(marked).toEqual(['/challenge/door-is-open/'])
  })
})


it('retries progress after a failure and renders the recovered completion count', async () => {
  mockListAllProgress.mockRejectedValueOnce(new Error('blocked'))
  const wrapper = mount(ChallengeList, { props: { challenges: mockChallenges } })
  await flushPromises()
  mockListAllProgress.mockResolvedValue([{ challengeSlug: 'sqli-demo', firstCompletedAt: 1 }])
  await wrapper.get('[data-progress-retry]').trigger('click')
  await flushPromises()
  expect(wrapper.find('[data-progress-error]').exists()).toBe(false)
  expect(wrapper.get('[data-progress-summary]').text()).toContain('1')
  expect(mockListAllProgress).toHaveBeenCalledTimes(2)
})

/**
 * What this page says while progress is withheld.
 *
 * Progress is released by the shared-machine decision, and that decision is now asked for
 * on the challenge pages only — so a learner who lands here first is not asked, and the
 * pair of numbers has nothing to report. Leaving the place blank tells them nothing: the
 * numbers are not merely late, they are waiting on something the learner has to do, and
 * doing it is one click away.
 *
 * Two withheld states and they are not the same. While the check is still running the
 * numbers can appear on the next tick, and an instruction to go and open a challenge would
 * be withdrawn as soon as it was read. Only once the check has settled on "there is
 * something here and nobody has answered for it" is there anything to instruct.
 *
 * The gate's module state outlives a test file — it is module-level by design, because one
 * browser session asks one question — so each case here resets the modules and drives the
 * real gate rather than stubbing the answer.
 */
describe('ChallengeList while the shared-machine choice is unanswered', () => {
  async function mountWith({ answered }: { answered: boolean }) {
    vi.resetModules()
    sessionStorage.clear()
    // Something is stored, and this browser session has not been asked about it.
    mockHasAnyStoredData.mockResolvedValue(true)
    const gate = await import('../../../.vitepress/theme/composables/useSessionGate')
    if (answered) await gate.useSessionGate().evaluate()
    const mod = await import('../../../.vitepress/theme/components/ChallengeList.vue')
    const wrapper = mount(mod.default, { props: { challenges: mockChallenges } })
    await flushPromises()
    return wrapper
  }

  it('tells the learner what to do once the check has settled', async () => {
    const wrapper = await mountWith({ answered: true })
    expect(wrapper.find('[data-progress-summary]').exists()).toBe(false)
    expect(wrapper.get('[data-progress-blocked]').text()).toContain('challenge')
  })

  it('claims no completed count and no total', async () => {
    const wrapper = await mountWith({ answered: true })
    const text = wrapper.get('[data-progress-blocked]').text()
    // Not "Solved 0 of 3": a number here would be a statement about a learner this page
    // has not been allowed to look up.
    expect(text).not.toMatch(/\d/)
    expect(wrapper.findAll('[data-challenge-done]')).toHaveLength(0)
  })

  it('says nothing while the check is still running', async () => {
    const wrapper = await mountWith({ answered: false })
    expect(wrapper.find('[data-progress-blocked]').exists()).toBe(false)
    expect(wrapper.find('[data-progress-summary]').exists()).toBe(false)
  })

  it('shows the numbers, not the message, once the choice has been answered', async () => {
    vi.resetModules()
    sessionStorage.clear()
    mockHasAnyStoredData.mockResolvedValue(true)
    const gate = await import('../../../.vitepress/theme/composables/useSessionGate')
    const g = gate.useSessionGate()
    await g.evaluate()
    await g.keepExistingData()
    const mod = await import('../../../.vitepress/theme/components/ChallengeList.vue')
    const wrapper = mount(mod.default, { props: { challenges: mockChallenges } })
    await flushPromises()

    expect(wrapper.find('[data-progress-blocked]').exists()).toBe(false)
    expect(wrapper.get('[data-progress-summary]').text()).toContain('0')
  })

  it('lets a read failure outrank the message', async () => {
    // Access was granted and the read then rejected. The failure is about this device and
    // has a retry; telling the learner to go and answer a question they have already
    // answered would send them somewhere that fixes nothing.
    vi.resetModules()
    sessionStorage.clear()
    sessionStorage.setItem('wxl-session-gate', 'decided')
    mockListAllProgress.mockRejectedValue(new Error('challenge-tools is blocked by another tab'))
    const mod = await import('../../../.vitepress/theme/components/ChallengeList.vue')
    const wrapper = mount(mod.default, { props: { challenges: mockChallenges } })
    await flushPromises()

    expect(wrapper.get('[data-progress-error]').exists()).toBe(true)
    expect(wrapper.find('[data-progress-blocked]').exists()).toBe(false)
  })
})

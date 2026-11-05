import { describe, it, expect } from 'vitest'
import { mergeLocaleChallenges, type ChallengeBrief } from '../../../platform/shared/mergeChallenges'

// Spec 0008, seam S4: each locale's list holds every challenge, per the merge rules of the
// traceability's "Schema: locale challenge data". Keyed by slug; the list locale's brief when it
// exists, else the other one, borrowed; a field the used brief leaves out takes the list locale's
// default; `id` from the English brief, then the Traditional Chinese one, then the position in one
// shared order. Expectations are written out.

const EN = (slug: string, frontmatter: Record<string, unknown>): ChallengeBrief =>
  ({ url: `/challenge/${slug}/`, frontmatter })
const ZH = (slug: string, frontmatter: Record<string, unknown>): ChallengeBrief =>
  ({ url: `/zh-TW/challenge/${slug}/`, frontmatter })

const door = {
  en: EN('door-is-open', { id: 11, number: 1, title: 'Need to Know', difficulty: 'easy', category: 'web', tags: ['idor'], date: '2026-04-02', description: 'English summary' }),
  zh: ZH('door-is-open', { id: 99, number: 1, title: '知的必要', difficulty: 'easy', category: '網頁', tags: ['idor'], date: '2026-04-02', description: '繁中摘要' }),
}
// English-only, with no title and no category in its frontmatter.
const php = EN('v05-php-check', { number: 5, difficulty: 'hard', tags: ['php'], date: '2026-05-05', description: 'PHP summary' })
// Traditional Chinese-only (refused by the hook and CI; reachable through --no-verify), no category.
const zhOnly = ZH('zh-only', { id: 7, number: 7, title: '只有中文', date: '2026-07-07' })
// No number: no short link anywhere (E10).
const draft = EN('draft', { title: 'Draft' })

const ENGLISH_ORDER = [door.en, php, draft]
const ZH_TREE = [door.zh, zhOnly]

describe('mergeLocaleChallenges, the Traditional Chinese list', () => {
  const list = mergeLocaleChallenges([...ENGLISH_ORDER, ...ZH_TREE], 'zh-TW')

  it('takes a translated challenge from its Traditional Chinese brief (E1)', () => {
    expect(list.find((c) => c.number === 1)).toEqual({
      id: 11, number: 1, title: '知的必要', url: '/zh-TW/challenge/door-is-open/', locale: 'zh-TW',
      difficulty: 'easy', category: '網頁', date: '2026-04-02', tags: ['idor'], description: '繁中摘要',
    })
  })

  it('borrows an untranslated challenge from its English brief, with this list\'s defaults (E2, E5)', () => {
    expect(list.find((c) => c.number === 5)).toEqual({
      id: 2, number: 5, title: '網站攻防挑戰', url: '/challenge/v05-php-check/', locale: 'en',
      difficulty: 'hard', category: '綜合', date: '2026-05-05', tags: ['php'], description: 'PHP summary',
    })
  })

  it('keeps a Traditional Chinese-only challenge and an unnumbered one (E3, E10)', () => {
    expect(list.find((c) => c.url === '/zh-TW/challenge/zh-only/')).toMatchObject({ id: 7, number: 7, locale: 'zh-TW', category: '綜合', difficulty: 'mystery' })
    expect(list.find((c) => c.title === 'Draft')).toMatchObject({ id: 3, number: undefined, locale: 'en' })
  })
})

describe('mergeLocaleChallenges, the English list', () => {
  const list = mergeLocaleChallenges([...ENGLISH_ORDER, ...ZH_TREE], 'en')

  it('takes English briefs as they are, and defaults an English one with no title (E1, E5)', () => {
    expect(list.find((c) => c.number === 1)).toMatchObject({ id: 11, title: 'Need to Know', url: '/challenge/door-is-open/', locale: 'en', category: 'web' })
    expect(list.find((c) => c.number === 5)).toMatchObject({ id: 2, title: 'Web exploitation challenge', locale: 'en', category: 'General' })
  })

  it('borrows a Traditional Chinese-only challenge with this list\'s defaults (E3, E5)', () => {
    expect(list.find((c) => c.number === 7)).toEqual({
      id: 7, number: 7, title: '只有中文', url: '/zh-TW/challenge/zh-only/', locale: 'zh-TW',
      difficulty: 'mystery', category: 'General', date: '2026-07-07', tags: [], description: '',
    })
  })
})

describe('mergeLocaleChallenges, both lists (E4)', () => {
  const slugOf = (url: string) => url.replace(/\/$/, '').split('/').pop()
  const shape = (locale: 'en' | 'zh-TW', pages: ChallengeBrief[]) =>
    mergeLocaleChallenges(pages, locale).map((c) => [slugOf(c.url), c.id])

  it('hold the same challenges in the same order with the same ids, whatever order the trees come in', () => {
    const expected = [['door-is-open', 11], ['v05-php-check', 2], ['draft', 3], ['zh-only', 7]]
    expect(shape('en', [...ENGLISH_ORDER, ...ZH_TREE])).toEqual(expected)
    expect(shape('zh-TW', [...ENGLISH_ORDER, ...ZH_TREE])).toEqual(expected)
    expect(shape('zh-TW', [...ZH_TREE, ...ENGLISH_ORDER])).toEqual(expected)
    expect(shape('en', [...ZH_TREE, ...ENGLISH_ORDER])).toEqual(expected)
  })

  it('give Traditional Chinese-only challenges position ids after the English order, by slug', () => {
    const b = ZH('b-only', { number: 21 })
    const a = ZH('a-only', { number: 20 })
    expect(shape('zh-TW', [b, door.zh, a, door.en])).toEqual([['door-is-open', 11], ['a-only', 2], ['b-only', 3]])
  })

  it('take the Traditional Chinese id when the English brief has none', () => {
    const en = EN('both', { number: 3 })
    const zh = ZH('both', { id: 42, number: 3 })
    expect(mergeLocaleChallenges([en, zh], 'en')[0].id).toBe(42)
    expect(mergeLocaleChallenges([en, zh], 'zh-TW')[0].id).toBe(42)
  })

  it('never invent a number', () => {
    expect(mergeLocaleChallenges([EN('x', { number: '7' }), ZH('x', { number: 'seven' })], 'zh-TW')[0].number).toBeUndefined()
  })
})

describe('mergeLocaleChallenges with frontmatter of the wrong type (stage 7, S-1)', () => {
  it('takes the list\'s default for a title, summary or category that is not a string, and keeps only string tags', () => {
    // YAML reads `title: 2048` as a number; the list calls `toLowerCase()` on titles and summaries
    // when the learner searches, so a non-string here would break both lists, not one.
    const odd = EN('odd', { number: 9, title: 2048, description: 404, category: 1, tags: ['ok', 3, null] })
    expect(mergeLocaleChallenges([odd], 'zh-TW')[0]).toMatchObject({
      title: '網站攻防挑戰', description: '', category: '綜合', tags: ['ok'],
    })
  })
})

import { describe, it, expect } from 'vitest'
import { mergeLocaleChallenges, type BriefInput, type DeclarationRead } from '../../../platform/shared/mergeChallenges'
import en from '../../../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../../../.vitepress/theme/i18n/messages/zh-TW.json'
import { LOCALES, type Locale } from '../../../.vitepress/locales'

// T-0077 wave 3 (0010-S17; L-§4.1 merge cases, L-§4.2 field normalisation, L-§4.3 schema).
// `mergeLocaleChallenges({ briefs, declarations, locales, primary })` returns one list per locale.
// A challenge is listed exactly when it has a brief in the primary locale folder (D38); its
// declaration supplies number, difficulty, category, date and tags (D37); a brief supplies title
// and description only. Expectations are written out; default texts come from the string tables.

const PRIMARIES: readonly Locale[] = ['en', 'zh-TW']
const other = (primary: Locale): Locale => (primary === 'en' ? 'zh-TW' : 'en')
const TABLES = { en, 'zh-TW': zhTW } as const

/** A brief as the loader gives it: the primary folder's pages are base-less and unprefixed (D7, D9). */
const brief = (primary: Locale, locale: string, slug: string, frontmatter: Record<string, unknown> = {}): BriefInput =>
  ({ locale: locale as Locale, slug, url: locale === primary ? `/challenge/${slug}/` : `/${locale}/challenge/${slug}/`, frontmatter })

const declared = (slug: string, value: Record<string, unknown>): [string, DeclarationRead] =>
  [slug, { ok: true, value }]

const run = (
  primary: Locale,
  briefs: BriefInput[],
  declarations: [string, DeclarationRead][],
  locales: readonly string[] = LOCALES,
) => mergeLocaleChallenges({ briefs, declarations: new Map(declarations), locales: locales as readonly Locale[], primary })

const DOOR_DECL = { number: 1, difficulty: 'easy', category: 'web', date: '2026-04-02', tags: ['idor'] }

describe.each(PRIMARIES)('mergeLocaleChallenges, P = %s', (P) => {
  const T = other(P)
  const TITLE = { en: 'Need to Know', 'zh-TW': '知的必要' }
  const DESC = { en: 'English summary', 'zh-TW': '繁中摘要' }
  const doorBriefs = [
    brief(P, 'en', 'door-is-open', { title: TITLE.en, description: DESC.en }),
    brief(P, 'zh-TW', 'door-is-open', { title: TITLE['zh-TW'], description: DESC['zh-TW'] }),
  ]

  it('L1: the primary list takes M-a from B(P)', () => {
    const lists = run(P, doorBriefs, [declared('door-is-open', DOOR_DECL)])
    expect(lists[P]).toEqual([
      {
        id: 1, number: 1, title: TITLE[P], url: '/challenge/door-is-open/', locale: P,
        difficulty: 'easy', category: 'web', date: '2026-04-02', tags: ['idor'], description: DESC[P],
      },
    ])
    expect(lists[P][0].url).toBe(doorBriefs.find((b) => b.locale === P)!.url)
  })

  it('L2: the translation list takes M-a from B(T)', () => {
    const lists = run(P, doorBriefs, [declared('door-is-open', DOOR_DECL)])
    expect(lists[T]).toEqual([
      {
        id: 1, number: 1, title: TITLE[T], url: `/${T}/challenge/door-is-open/`, locale: T,
        difficulty: 'easy', category: 'web', date: '2026-04-02', tags: ['idor'], description: DESC[T],
      },
    ])
    // The declaration's fields and the id are the same in both lists.
    const { id, number, difficulty, category, date, tags } = lists[P][0]
    expect(lists[T][0]).toMatchObject({ id, number, difficulty, category, date, tags })
  })

  it('L3: M-b is borrowed into T from the primary brief', () => {
    const lists = run(
      P,
      [brief(P, P, 'staff-only', { title: 'Staff Only', description: 'Only primary' })],
      [declared('staff-only', { number: 4, difficulty: 'hard', category: 'web', date: '2026-05-05', tags: [] })],
    )
    expect(lists[T]).toHaveLength(1)
    expect(lists[T][0]).toMatchObject({
      locale: P, url: '/challenge/staff-only/', title: 'Staff Only', description: 'Only primary',
    })
  })

  const slugOf = (url: string) => url.replace(/\/$/, '').split('/').pop()
  const THREE = ['en', 'zh-TW', 'ja']
  const UNREADABLE: DeclarationRead = { ok: false, reason: 'invalid-yaml', path: '/repo/platform/challenge/aaa-orphan/challenge.yaml' }

  it.each([
    ['a readable declaration', [declared('aaa-orphan', { number: 9 })]],
    ['no declaration', []],
    ['an unreadable declaration', [['aaa-orphan', UNREADABLE] as [string, DeclarationRead]]],
  ])('L4: an orphan with %s is in no list, and changes no other id', (_name, orphanDecl) => {
    const door = [...doorBriefs, brief(P, P, 'zzz-last', { title: 'Last' })]
    const doorDecl = [declared('door-is-open', DOOR_DECL), declared('zzz-last', { number: 3, category: 'web' })]
    const before = run(P, door, doorDecl, THREE)
    // The orphan has a brief in a non-primary locale folder only, listed first in the input.
    for (const orphanLocale of THREE.filter((c) => c !== P)) {
      const after = run(P, [brief(P, orphanLocale, 'aaa-orphan', { title: 'Orphan' }), ...door], [...doorDecl, ...orphanDecl], THREE)
      for (const locale of THREE) {
        expect(after[locale as Locale].filter((e) => slugOf(e.url) === 'aaa-orphan')).toEqual([])
        expect(after[locale as Locale]).toEqual(before[locale as Locale])
      }
    }
  })

  it('L5: a declaration with no brief anywhere is in no list', () => {
    const lists = run(P, doorBriefs, [declared('door-is-open', DOOR_DECL), declared('ghost', { number: 8 })])
    for (const locale of LOCALES) {
      expect(lists[locale].map((e) => slugOf(e.url))).toEqual(['door-is-open'])
    }
  })

  const FOUR = ['door-is-open', 'just-a-preview', 'selected-excerpts', 'staff-only']
  it.each([
    ['reversed', [...FOUR].reverse()],
    ['shuffled', ['selected-excerpts', 'door-is-open', 'staff-only', 'just-a-preview']],
    ['sorted', FOUR],
  ])('L9: ids are 1-based positions in slug order whatever order the briefs come in (%s)', (_name, order) => {
    const briefs = order.flatMap((slug) => LOCALES.map((c) => brief(P, c, slug, { title: slug })))
    const lists = run(P, briefs, order.map((slug) => declared(slug, {})))
    for (const locale of LOCALES) {
      expect(lists[locale].map((e) => [slugOf(e.url), e.id])).toEqual([
        ['door-is-open', 1], ['just-a-preview', 2], ['selected-excerpts', 3], ['staff-only', 4],
      ])
    }
  })

  it('L10: slugs compare exactly', () => {
    const briefs = [
      brief(P, P, 'door', { title: 'door' }),
      brief(P, T, 'Door', { title: 'Door' }),
      brief(P, P, 'Zed', { title: 'Zed' }),
      brief(P, P, 'apple', { title: 'apple' }),
    ]
    const lists = run(P, briefs, ['door', 'Door', 'Zed', 'apple'].map((slug) => declared(slug, {})))
    // `Door` (only in T) is an orphan, not `door`; `Zed` sorts before `apple` by UTF-16 code unit.
    for (const locale of LOCALES) {
      expect(lists[locale].map((e) => [slugOf(e.url), e.id])).toEqual([['Zed', 1], ['apple', 2], ['door', 3]])
    }
  })

  /** One challenge whose only brief (in P) carries `frontmatter`; borrowed into every other list. */
  const single = (frontmatter: Record<string, unknown>, declaration: Record<string, unknown> = {}) =>
    run(P, [brief(P, P, 'x', frontmatter)], [declared('x', declaration)])

  it.each([
    ['a string', { title: 'Written' }, (): Record<Locale, string> => ({ en: 'Written', 'zh-TW': 'Written' })],
    ['a non-string', { title: 2048 }, () => ({ en: en.challenge_list.default_title, 'zh-TW': zhTW.challenge_list.default_title })],
    ['absent', {}, () => ({ en: en.challenge_list.default_title, 'zh-TW': zhTW.challenge_list.default_title })],
  ])('L11: a title that is %s', (_name, frontmatter, expected) => {
    const lists = single(frontmatter)
    for (const locale of LOCALES) expect(lists[locale][0].title).toBe(expected()[locale])
  })

  it.each([
    ['a string', { description: 'Summary' }, 'Summary'],
    ['a non-string', { description: 2048 }, ''],
    ['absent', {}, ''],
  ])('L11: a description that is %s', (_name, frontmatter, expected) => {
    const lists = single(frontmatter)
    for (const locale of LOCALES) expect(lists[locale][0].description).toBe(expected)
  })

  const declField = (value: Record<string, unknown>) => single({ title: 'T' }, value)

  it.each([
    ['a number', { number: 7 }, 7],
    ['a numeric string', { number: '7' }, undefined],
    ['a word', { number: 'seven' }, undefined],
    ['absent', {}, undefined],
  ])('L12: a number that is %s', (_name, declaration, expected) => {
    const lists = declField(declaration)
    for (const locale of LOCALES) {
      expect(lists[locale][0].number).toBe(expected)
      // Never derived from the position: id is 1 here, and a number is only ever what was declared.
      if (expected === undefined) expect(lists[locale][0].number).not.toBe(lists[locale][0].id)
    }
  })

  it.each([
    ['easy', { difficulty: 'easy' }, 'easy'],
    ['an unlisted word', { difficulty: 'insane' }, 'insane'],
    ['a non-string', { difficulty: 3 }, 'mystery'],
    ['absent', {}, 'mystery'],
  ])('L13: a difficulty that is %s', (_name, declaration, expected) => {
    const lists = declField(declaration)
    for (const locale of LOCALES) expect(lists[locale][0].difficulty).toBe(expected)
  })

  it.each([
    ['a string', { category: 'web' }, { en: 'web', 'zh-TW': 'web' }],
    ['a non-string', { category: 1 }, { en: en.challenge_list.default_category, 'zh-TW': zhTW.challenge_list.default_category }],
    ['absent', {}, { en: en.challenge_list.default_category, 'zh-TW': zhTW.challenge_list.default_category }],
  ])('L14: a category that is %s', (_name, declaration, expected) => {
    const lists = declField(declaration)
    for (const locale of LOCALES) expect(lists[locale][0].category).toBe(expected[locale])
  })

  it.each([
    ['an ISO timestamp', { date: '2026-08-17T16:21:14.557Z' }, '2026-08-17T16:21:14.557Z'],
    ['a plain date', { date: '2026-04-02' }, '2026-04-02'],
    ['an unparsable string', { date: 'not a date' }, null],
    ['a Date', { date: new Date('2026-04-02T00:00:00.000Z') }, '2026-04-02T00:00:00.000Z'],
    ['a number', { date: 2026 }, null],
    ['absent', {}, null],
  ])('L15: a date that is %s', (_name, declaration, expected) => {
    const lists = declField(declaration)
    for (const locale of LOCALES) expect(lists[locale][0].date).toBe(expected)
  })

  it.each([
    ['an array with non-strings', { tags: ['a', 3, null, 'b'] }, ['a', 'b']],
    ['a string', { tags: 'a' }, []],
    ['absent', {}, []],
  ])('L16: tags that are %s', (_name, declaration, expected) => {
    const lists = declField(declaration)
    for (const locale of LOCALES) expect(lists[locale][0].tags).toEqual(expected)
  })

  it('L17: a key on the wrong side is ignored (D37)', () => {
    const lists = run(
      P,
      [brief(P, P, 'x', { title: 'From brief', description: 'Brief summary', number: 99, difficulty: 'hard', id: 77 })],
      [declared('x', { number: 1, difficulty: 'easy', category: 'web', title: 'From declaration', description: 'Declared', id: 42 })],
    )
    for (const locale of LOCALES) {
      expect(lists[locale][0]).toMatchObject({ number: 1, difficulty: 'easy', title: 'From brief', description: 'Brief summary', id: 1 })
    }
  })

  it('L8: the lists have exactly the keys of `locales`, in order; a locale with no brief borrows every one', () => {
    const lists = run(P, [brief(P, P, 'x', { title: 'X' })], [declared('x', {})])
    expect(Object.keys(lists)).toEqual([...LOCALES])
    expect(lists[T]).toHaveLength(1)
    expect(lists[T][0].locale).toBe(P)
  })

  it('L8: with no brief in P, every list is empty', () => {
    const lists = run(P, [brief(P, T, 'x', { title: 'X' })], [declared('x', {})])
    expect(Object.keys(lists)).toEqual([...LOCALES])
    for (const locale of LOCALES) expect(lists[locale]).toEqual([])
  })
})

// L7: `locales` is an argument, so a third member behaves like any other non-primary locale. `ja` has no
// string table and `mergeLocaleChallenges` takes none (L-q1): every brief here has a string title and
// description and every declaration a string category, so no default is ever read.
describe.each(['en', 'zh-TW', 'ja'])('mergeLocaleChallenges, three locales, P = %s', (P) => {
  const THREE = ['en', 'zh-TW', 'ja']
  const slugOf = (url: string) => url.replace(/\/$/, '').split('/').pop()
  const primary = P as Locale
  const briefs = [
    brief(primary, P, 'b-both', { title: 'b', description: 'b' }),
    brief(primary, P, 'a-both', { title: 'a', description: 'a' }),
    ...THREE.filter((c) => c !== P).map((c) => brief(primary, c, 'a-both', { title: `a-${c}`, description: `a-${c}` })),
  ]
  const declarations = [declared('a-both', { category: 'web' }), declared('b-both', { category: 'web' })]

  it('L7: every list has the same slug sequence and ids; a missing slug is borrowed from P', () => {
    const lists = run(primary, briefs, declarations, THREE) as Record<string, ReturnType<typeof run>[Locale]>
    expect(Object.keys(lists)).toEqual(THREE)
    for (const c of THREE) {
      expect(lists[c].map((e) => [slugOf(e.url), e.id])).toEqual([['a-both', 1], ['b-both', 2]])
      expect(lists[c][1].locale).toBe(P)
      expect(lists[c][0].locale).toBe(c)
      if (c !== P) expect(lists[c][1].url).toBe('/challenge/b-both/')
    }
  })

  it('L8: three locales — the keys are `locales` in order; a locale with no brief borrows every listed challenge', () => {
    const onlyP = [
      brief(primary, P, 'x', { title: 'X', description: 'x' }),
      brief(primary, P, 'y', { title: 'Y', description: 'y' }),
    ]
    const decls = [declared('x', { category: 'web' }), declared('y', { category: 'web' })]
    const lists = run(primary, onlyP, decls, THREE) as Record<string, ReturnType<typeof run>[Locale]>
    expect(Object.keys(lists)).toEqual(THREE)
    for (const c of THREE.filter((l) => l !== P)) {
      expect(lists[c].map((e) => [slugOf(e.url), e.locale, e.url])).toEqual([
        ['x', P, '/challenge/x/'],
        ['y', P, '/challenge/y/'],
      ])
    }
    expect(lists[P]).toHaveLength(2)
  })

  it('L8: three locales — with no brief in P, every list is empty', () => {
    const noP = THREE.filter((c) => c !== P).map((c) => brief(primary, c, 'x', { title: 'X', description: 'x' }))
    const lists = run(primary, noP, [declared('x', { category: 'web' })], THREE) as Record<string, ReturnType<typeof run>[Locale]>
    expect(Object.keys(lists)).toEqual(THREE)
    for (const c of THREE) expect(lists[c]).toEqual([])
  })
})

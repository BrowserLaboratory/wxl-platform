import { createContentLoader } from 'vitepress'
import { mergeLocaleChallenges } from './mergeChallenges'

/** A locale a challenge's page is in: the root locale `en`, or the `zh-TW` translation. */
export type ChallengeLocale = 'en' | 'zh-TW'

export interface ChallengeData {
  id?: number | string
  /**
   * The challenge's permanent number, straight from frontmatter.
   *
   * Deliberately not defaulted to a position in this array the way `id` is: a
   * derived number shifts when a challenge is added out of order or retired,
   * and `/c/003` would then point at a different challenge than the handout
   * that named it. A challenge without one shows no short link at all.
   */
  number?: number
  title: string
  url: string
  /**
   * The locale of the page `url` points at (spec 0008, S4). Equal to the list's locale unless the
   * challenge has no brief in it, in which case it is the locale whose brief the entry borrowed.
   */
  locale: ChallengeLocale
  difficulty?: 'easy' | 'medium' | 'hard' | 'mystery'
  category?: string
  date?: string | null
  tags?: string[]
  description?: string
}

// Every challenge in the English list, from both locale trees (spec 0008, S4): a challenge with
// only a Traditional Chinese brief is borrowed, marked, and opens that page. The merge rules are
// `mergeLocaleChallenges`'s, shared with the Traditional Chinese loader.
export default createContentLoader(['challenge/*/index.md', 'zh-TW/challenge/*/index.md'], {
  excerpt: true,
  transform(raw): ChallengeData[] {
    return mergeLocaleChallenges(raw, 'en')
  },
})

declare const data: ChallengeData[]
export { data }

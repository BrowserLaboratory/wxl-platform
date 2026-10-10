import { createContentLoader } from 'vitepress'

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
  difficulty?: 'easy' | 'medium' | 'hard' | 'mystery'
  category?: string
  date?: string | null
  tags?: string[]
  description?: string
}

export default createContentLoader('challenge/*/index.md', {
  excerpt: true,
  transform(raw): ChallengeData[] {
    return raw
      .map((page, idx) => ({
        id: page.frontmatter.id ?? idx+1,
        number: typeof page.frontmatter.number === 'number' ? page.frontmatter.number : undefined,
        title: page.frontmatter.title ?? 'Web exploitation challenge',
        url: page.url,
        difficulty: page.frontmatter.difficulty ?? "mystery",
        category: page.frontmatter.category ?? "General",
        date: page.frontmatter.date ?? null,
        tags: Array.isArray(page.frontmatter.tags) ? page.frontmatter.tags : [],
        description: page.frontmatter.description ?? '',
      }))
  },
})

declare const data: ChallengeData[]
export { data }

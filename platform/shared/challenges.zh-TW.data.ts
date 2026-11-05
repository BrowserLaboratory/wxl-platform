import { createContentLoader } from 'vitepress'
import type { ChallengeData } from './challenges.data'
import { mergeLocaleChallenges } from './mergeChallenges'

// Every challenge in the Traditional Chinese list, from both locale trees (spec 0008, S4): a
// challenge written only in English is borrowed, marked `只有英文`, and opens the English page.
export default createContentLoader(['challenge/*/index.md', 'zh-TW/challenge/*/index.md'], {
  excerpt: true,
  transform(raw): ChallengeData[] {
    return mergeLocaleChallenges(raw, 'zh-TW')
  },
})

declare const data: ChallengeData[]
export { data }

import { describe, it, expect } from 'vitest'
import { classifySourcePath } from '../../../.vitepress/source-layout'

// 0010-S2 working test: claims no row (U136 compares `classifySourcePath` with create-wxl's
// `isLegacyPage` in T-0077). Every path classifies the same for both primaries.

const OUTSIDE = [
  'index.md',
  'challenges.md',
  'x.md',
  'guide/x.md',
  'reference/x.md',
  'ja/index.md',
  'fr/a.md',
  'zh-tw/index.md',
  'EN/index.md',
  'ZH-TW/x.md',
  'docs/a.md',
  'challenge/x/index.md',
  'challenge/x.md',
  'challenge/x/notes.md',
  'challenge/x/sub/a.md',
  'challenge/src/a.md',
  'challenge/index.md',
]

const EXCLUDED = [
  'challenge/x/src/README.md',
  'challenge/x/src/a/b/c.md',
  'public/x.md',
  'shared/x.md',
  '.draft.md',
  'en/.x/a.md',
  'node_modules/p/README.md',
  'en/dist/old.md',
  'foo.txt',
  'assets/logo.png',
  'postcss.config.mjs',
  'README.MD',
  'x.Md',
  'x.MD',
]

const LOCALE_PAGE = ['en/x.md', 'zh-TW/x.md', 'zh-TW/en/a.md', 'en/smoke-fixtures/english-only.md']

describe('classifySourcePath (0010-S2 working test)', () => {
  for (const primary of ['en', 'zh-TW'] as const) {
    describe(`primary = ${primary}`, () => {
      it.each(OUTSIDE)('%s is outside', (path) => {
        expect(classifySourcePath(path, primary)).toBe('outside')
      })

      it.each(EXCLUDED)('%s is excluded', (path) => {
        expect(classifySourcePath(path, primary)).toBe('excluded')
      })

      it.each(LOCALE_PAGE)('%s is a locale page', (path) => {
        expect(classifySourcePath(path, primary)).toBe('locale-page')
      })
    })
  }
})

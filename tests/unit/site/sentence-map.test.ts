/**
 * Spec 0007's seam S6: the canonical sentences E1, Z1, E2 and Z2 and the files of the sentence map
 * (`.proj.specs/0007-gh-pages-range-fixes/traceability.md`, "Canonical sentences"). Each file must
 * hold each of its sentences under the match rule: line wrapping and leading `#` or `>` markers do
 * not matter; wording, punctuation and backticks do (T01-T03, AC-18, AC-19).
 *
 * The files are upstream's documents. A range rewrites them freely, so the map runs only under the
 * upstream decision (T04); the matcher's own cases run everywhere.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { realUpstreamDecision } from '../../__helpers__/upstreamDecision'

const REPO_ROOT = resolve(__dirname, '../../..')

const E1 =
  '`platform/public/_redirects` is generated from the challenges; do not edit it by hand. `pnpm create:challenge` and the pre-commit hook regenerate it when challenges change. Commit it together with them: GitHub Pages does not read it, but CI checks that it matches the challenges. If CI reports it stale, run `pnpm redirects:generate` and commit the result.'
const Z1 =
  '`platform/public/_redirects` 由題目自動產生，不要手改；`pnpm create:challenge` 與 pre-commit hook 會在題目變動時重新產生它。它要跟題目一起 commit：GitHub Pages 不讀這個檔，但 CI 會檢查它和題目是否一致。如果 CI 回報它過期，執行 `pnpm redirects:generate` 再 commit 結果。'
const E2 =
  'The copy button beside each challenge copies a short link only on a range built by Cloudflare Pages; on any other range it copies the challenge page\'s URL. That URL stops working if the challenge is renamed, and it opens this range only while `SITE_ORIGIN` in `.vitepress/challenge/shortLink.ts` holds the range\'s address.'
const Z2 =
  '每道題目旁的複製按鈕，只有在 Cloudflare Pages 建置的靶場上才會複製短連結；其他靶場複製的是題目頁的網址。題目改名之後這個網址就會失效；而且只有 `.vitepress/challenge/shortLink.ts` 的 `SITE_ORIGIN` 是靶場的網址時，它才會開到這個靶場。'

const SENTENCES = { E1, Z1, E2, Z2 } as const
type SentenceId = keyof typeof SENTENCES

const SENTENCE_MAP: ReadonlyArray<[string, ReadonlyArray<SentenceId>]> = [
  ['.claude/skills/wxl-create/SKILL.md', ['E1']],
  ['.agents/skills/wxl-create/SKILL.md', ['E1']],
  ['.claude/skills/wxl-create/SKILL.zhTW.md', ['Z1']],
  ['.agents/skills/wxl-create/SKILL.zhTW.md', ['Z1']],
  ['docs/agents/challenge-pipeline.md', ['E1']],
  ['README.en.md', ['E1', 'E2']],
  ['platform/public/_redirects', ['E1']],
  ['README.md', ['Z1', 'Z2']],
  ['.claude/skills/wxl-fork-init/SKILL.md', ['Z1', 'Z2']],
  ['.agents/skills/wxl-fork-init/SKILL.md', ['Z1', 'Z2']],
]

/** The match rule: drop each line's leading run of `#`, `>` and whitespace, join the lines, then
 *  remove every whitespace character from both sides. */
function holdsSentence(text: string, sentence: string): boolean {
  const squeeze = (s: string) => s.replace(/\s+/gu, '')
  const joined = text
    .split(/\r?\n/u)
    .map((line) => line.replace(/^[#>\s]+/u, ''))
    .join('')
  return squeeze(joined).includes(squeeze(sentence))
}

describe('S6 match rule', () => {
  const wrappedAsComment = `# ${E1.slice(0, 60)}\n#   ${E1.slice(60, 200)}\n#\t${E1.slice(200)}\n`
  const wrappedAsQuote = `> **Note.** ${E2.slice(0, 90)}\n>${E2.slice(90)}\n`

  it('holds a sentence wrapped across # lines', () => {
    expect(holdsSentence(wrappedAsComment, E1)).toBe(true)
  })

  it('holds a sentence wrapped across > lines, with text around it', () => {
    expect(holdsSentence(`before\n${wrappedAsQuote}after`, E2)).toBe(true)
  })

  it('holds a sentence whose spacing differs', () => {
    expect(holdsSentence(Z1.replace(/，/gu, '， ').replace(/ /gu, '\n  '), Z1)).toBe(true)
  })

  it('does not hold a sentence with one word changed', () => {
    expect(holdsSentence(E1.replace('by hand', 'manually'), E1)).toBe(false)
  })

  it('does not hold a sentence with one punctuation mark changed', () => {
    expect(holdsSentence(Z2.replace('；其他', '，其他'), Z2)).toBe(false)
  })

  it('does not hold a sentence with a backtick dropped', () => {
    expect(holdsSentence(E2.replace('`SITE_ORIGIN`', 'SITE_ORIGIN`'), E2)).toBe(false)
  })
})

describe.runIf(realUpstreamDecision(REPO_ROOT))('S6 sentence map (upstream only)', () => {
  for (const [file, ids] of SENTENCE_MAP) {
    for (const id of ids) {
      it(`${file} holds ${id}`, () => {
        expect(holdsSentence(readFileSync(resolve(REPO_ROOT, file), 'utf8'), SENTENCES[id])).toBe(true)
      })
    }
  }
})

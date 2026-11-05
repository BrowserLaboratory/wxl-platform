---
id: T-0056
title: Short links name their locale, and every challenge gets four redirect rules
epic: 0008-missing-translation-fallback
status: review
blocked_by: []
---

## Context

Today the copy control gives `/c/NNN` or `/zh/c/NNN`, and a challenge gets a `/zh/c/NNN` rule only when
it has a Traditional Chinese brief, so the Traditional Chinese short link of an English-only challenge
does not exist. The user decided that every locale's short link carries its locale code, that the
Traditional Chinese one is always `/zh-TW/c/NNN`, and that `/c/` and `/zh/c/` links already handed out
keep working (G21–G23, D2, D6). Rules and copied forms land together (T1), so `main` never gives out a
link with no rule behind it. This ticket shares no file with T-0053 and can run beside it.

Spec: `spec.en.md` revision 3.1, "Challenge link", "Redirect rules"; `traceability.md` revision 3.3,
decisions G21–G23, D2, D6, seams 0008-S5, S6, the redirect-rules schema, rows F1, F2, F4, F5, F7–F10
and G1–G10, and the overridden contracts for the rules, the hook and the copied path.

## Deliverable

`generateRedirects` writes `/c/NNN`, `/en/c/NNN`, `/zh/c/NNN` and `/zh-TW/c/NNN` for every numbered
challenge with an English brief, padded, the two Traditional Chinese rules pointing at the English page
when there is no Traditional Chinese brief or its directory is untracked or ignored, and four
parameterised rules last; a challenge with only a Traditional Chinese brief gets its two Traditional
Chinese rules; the header states the 500-challenge limit; the committed `_redirects` is regenerated.
The copy control gives `/en/c/NNN` or `/zh-TW/c/NNN` in short mode and takes separate inputs for the
locale of its own text and of its link.

## Acceptance criteria

- [x] G1–G10: the four numbered rules per challenge and their targets, untracked or ignored directories, the parameterised rules, order, the hook's and CI's refusal unchanged, the committed file, the rule count and the stated limit, the orphan-brief fallback in its own fixture, padding (AC-8)
- [x] F1, F2, F4, F5, F7–F10: short and page mode in both locales, the nav control, displayed text, `/c/` and `/zh/c/` never given out, the control's own text in the list's or page's locale (AC-7)
- [x] H1a: the generator's header and comments, `shortLinkPath`, the "one canonical link" comments, `ChallengeList`'s short-link comment, `pre-commit.sh`'s header and W4 message (AC-9)
- [x] H2: the README's short-link passage, both languages (AC-9)
- [x] H7 (AC-9)
- [x] Overridden contracts touched here (epic 0007's H01, H02, H14, H20, H37, H39, H40, vocabulary, X1–X2, L01–L02; `redirects.test.ts`, `redirects-generated.test.ts`, `pre-commit-sh.test.ts`, `shortLink.test.ts`, `ShortLinkShare.test.ts`, `ChallengeList.test.ts`, `MergedNav.test.ts`) change only as the traceability table states
- [ ] Stage 8 (T4): V1c–V1f on the Cloudflare preview of `stage8/T-0056`, checking where each rule redirects (V1c for G4's slug rule to a missing translation); the copy control's string in both languages (AC-10)

## 給使用者（zh-TW）

讓每一道有永久編號的題目都有四條短連結規則：`/c/NNN`、`/en/c/NNN`、`/zh/c/NNN`、`/zh-TW/c/NNN`。沒有繁中說明頁的題目，兩條繁中規則改指英文頁，不再缺。複製按鈕改發帶語系代碼的 `/en/c/NNN` 或 `/zh-TW/c/NNN`，舊的 `/c/` 與 `/zh/c/` 照樣打得開但不再發出。`_redirects` 檔頭寫明 Cloudflare 的 500 題上限。複製控制分開接收兩個語系：`locale` 決定按鈕文字與短連結，`entryLocale` 決定 page 模式的題目頁網址（使用者在測試計畫核准）。完成條件包括第 8 階段在 `stage8/T-0056` 的 Cloudflare 預覽上跑 V1c–V1f：確認每條規則轉到哪裡（含 `/zh-TW/c/<slug>` 對沒有繁中版的題目落到 not-found 處理），以及複製控制在兩種語系下的字串。

## Comments

### 2026-11-05 — test plan (stage 5)

Read for this plan: this ticket; `spec.en.md` revision 3.1 ("Challenge link", "Redirect rules",
AC-7–AC-9) and `traceability.md` revision 3.2 (G21–G23, D2, D6, seams S5 and S6, the redirect-rules
schema, rows F1–F10, G1–G10, H1a, H2, H7, the overridden contracts); T-0057's ticket (F3, F6); and, at
`fd2ef09`, `scripts/generate-redirects.ts`, `scripts/challenge-numbers.ts`, `scripts/pre-commit.sh`
(header, untracked-directory listing, W3/W4), `.vitepress/challenge/shortLink.ts`,
`.vitepress/theme/linkMode.ts`, `.vitepress/theme/components/{ShortLinkShare,MergedNav,ChallengeList}.vue`,
`platform/public/_redirects`, `README.md`/`README.en.md` (the short-link passage),
`tests/unit/site/{redirects,redirects-generated,sentence-map}.test.ts`, `tests/pre-commit-sh.test.ts`,
`tests/__helpers__/preCommitRepo.ts`, `tests/unit/challenge/shortLink.test.ts`,
`tests/unit/components/{ShortLinkShare,ShortLinkShare.mode-default,ChallengeList,MergedNav}.test.ts`,
`tests/unit/scripts/create-challenge-run.test.ts`. Before approval the draft was checked by two
independent reviewers (completeness, design; workflow `wf_092da031-eeb`); their findings are folded in.

Working names, not fixed by the spec:
- `ShortLinkShare` takes `locale`, the list's or page's locale: its own text (label, title, copied,
  failed) and the short link's locale; and a new required `entryLocale`, the locale of the challenge
  page the control's challenge opens, used only for the page-mode URL. The component already knows the
  mode, so the spec's rule "in short mode the list's or page's, in page mode the entry's page" is
  applied in one place, and T-0057's list passes the entry's locale without reading the mode (F3, F6).
  In this ticket both callers pass the page's or list's locale to both inputs (overridden contract:
  "`locale` is both").
- `shortLinkPath(n, locale)` returns `/en/c/NNN` or `/zh-TW/c/NNN` (overridden contract).
- `generateRedirects` groups the included entries by slug and writes each slug's rules in a fixed form
  order (`/c/`, `/en/c/`, `/zh/c/`, `/zh-TW/c/`), sorted by number, instead of sorting by source
  length. "Has an English page" means the slug's root entry is included; the Traditional Chinese rules
  target the Traditional Chinese page when that tree's entry is included, the English page otherwise;
  a slug with only an included Traditional Chinese entry gets those two rules only (G9, a fallback for
  a state the hook and CI refuse, not a supported one). `PARAMETERISED` gains `/en/c/:slug` and
  `/zh-TW/c/:slug`.
- W4 names the tree. An untracked English directory "is left out" (as today). An untracked Traditional
  Chinese directory is not used: "its challenge's Traditional Chinese short links open the English page,
  if there is one" — true also when the English directory is untracked too (H10's `draft`). Both keep
  the directory and `git add`, which `w4()` matches. W4 stays printed only with W3, as today.

Scope notes:
- F3 and F6 (untranslated entries in the `zh-TW` list) are T-0057's rows; this ticket tests F10 at the
  component seam, where the two inputs can already differ.
- The real tree has no untranslated challenge today, so G3 on real data is covered by the fixtures and
  by stage 8's fixture challenge 999.
- Site-smoke builds in page mode (`__WXL_SHORT_LINKS__` is true only for `CF_PAGES=1`,
  `.vitepress/config.mts:80` at `fd2ef09`), so short mode on the built site is covered by stage 8. F8's ellipsis rule
  is pinned by site-smoke on the longer page-mode URL; the short string is shorter and stage 8 does not
  check layout.
- `sentence-map.test.ts` does not change: the `_redirects` header keeps E1 word for word (only the
  "2100 rules" sentence changes), and H2 adds sentences around E2 and Z2 without changing them.
- `preCommitRepo.ts` and `create-challenge-run.test.ts` are expected not to change: both call
  `generateRedirects`. If `generate-redirects.ts` gains an import, that module joins `COPIED_FILES`,
  recorded as a change beyond the plan.
- `redirects-generated.test.ts` "is byte-identical…" keeps its slug-only predicate: on a clean checkout
  (CI) it equals the hook's per-tree index slugs. A local untracked Traditional Chinese brief of a
  tracked slug can make it differ, as it can today.
- Traceability revision 3.3 (no behaviour change, spec text unchanged) names in the first overridden
  contract the `pre-commit-sh.test.ts` cases that spell a challenge's rules and that the table does not
  name yet: "exits 0 when entire challenge directory is removed", H03, H04 (titles say "both its
  rules"), `commitStaleRedirects`' comment, the S2/B2 symlinked-source case's literal list, and H28's
  literal list. The ticket's spec references move to 3.1/3.3, and its stage 8 line gains V1c (G4's
  "a slug rule to a missing translation lands on C1": the `/zh-TW/c/:slug` rule is this ticket's, T4).
- `shortLink.test.ts`'s X1/X2 cases are epic 0007's L01/L02 (with L03); L03's wide-number and L11's
  slug cases change their expected `/c/` to `/en/c/` too. `ShortLinkShare.test.ts`'s L03, L08, L09 cases
  likewise. All are in files the copied-path contract names.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0008-S6 | the generator writes the schema's rules for one translated and one English-only challenge, in order | `tests/unit/site/redirects-generated.test.ts` (overridden: "emits both numeric rules for a translated challenge", "keeps the two parameterised rules unchanged and last", "places every numeric rule before…", its numbered-rule pattern) | G1, G2, G3, G4, G5, G8 — AC-8 | #1 `door-is-open` translated, #5 `v05-php-check` English-only → exactly the schema's 8 numbered + 4 parameterised rules as an ordered list of (from, to, status), padding ignored; generating twice → identical bytes; numbers 2 and 10 in reverse directory order → sorted by number |
| 0008-S6 | an untracked or ignored Traditional Chinese directory re-points, not removes | same file, `includeSlug` excluding the `zh-TW` entry | G3 — AC-8 | translated #1 with its `zh-TW` entry excluded → still four rules, `/zh/c/001` and `/zh-TW/c/001` → `/challenge/door-is-open/` |
| 0008-S6 | grouping holds for any included set (robustness, not G9) | same file | — (generator fallback) | translated challenge with only its root entry excluded → its two Traditional Chinese rules only; both excluded → no rule for it |
| 0008-S6 | a challenge with only a Traditional Chinese brief gets its two Traditional Chinese rules (own fixture) | same file, new fixture | G9, G5, G8 — AC-8 | `zh-TW`-only #7 beside translated #1 → after #1's four, `/zh/c/007` then `/zh-TW/c/007` → `/zh-TW/challenge/<slug>/`; no `/c/007`, `/en/c/007`; count 4 + 2 + 4 |
| 0008-S6 | padding in all four forms | same file (overridden: "does not emit the unpadded spelling", "pads to three digits…") | G10 — AC-8 | 7 → `007` in all four forms; 1234 stays `1234`; no source is `/c/7`, `/en/c/7`, `/zh/c/7`, `/zh-TW/c/7` |
| 0008-S6 | the header states the limit | same file | G8 — AC-8 | header names 500 challenges, 2,000 static and 4 dynamic rules; "2100" gone; E1 still held (sentence-map) |
| 0008-S6 (real tree) | the committed file follows the tree and the four-rule shape | `tests/unit/site/redirects.test.ts` (overridden: `PARAMETERISED_RULES`, `NUMBERED_SOURCE`, "ends with the two parameterised classroom rules", the unpadded check, the target-directory checks); `redirects-generated.test.ts` "is byte-identical…" (unchanged; red until `_redirects` is regenerated) | G4, G5, G7, G10 — AC-8 | last four rules equal the schema's parameterised four; every numbered challenge has exactly its four rules in form order, targets per G2/G3 from git's per-tree index slugs (`indexSlugs`, not a directory listing, which races `challenge-keygen.test.ts`); committed file byte-identical |
| 0008-S6 (tree check) | the target-directory checks accept a range with no Traditional Chinese challenge directory | `redirects.test.ts`, the target checks refactored to take a root, run on the repo and on temp ranges | G6 (unchanged refusal), overridden contract — AC-8 | no `platform/zh-TW/challenge/` → passes; an empty one → passes; no `platform/challenge/` → fails; orphan brief → "backs every translated slug…" still fails (G6) |
| 0008-S6 hook | the regenerated file re-points instead of adding or removing | `tests/pre-commit-sh.test.ts` (overridden: `FIXTURE_RULES`, `RETIRED_DOOR_RULES`, H01, H02/H14 and H45 through it, H40, H20, H37 boundary, H39 and its boundary; with revision 3.3: H03, H04, "exits 0 when entire challenge directory is removed", `commitStaleRedirects`, S2/B2, H28) | G1–G3, G9, G6 — AC-8 | H01 new #4 → four rules, zh → English page; H02/H14 adding test-chall's brief → `/zh/c/001`, `/zh-TW/c/001` re-point to `zh-TW`, validator never runs; H40 deleting door's brief → door keeps four, two → English; new: door's brief `git rm --cached` (English tracked) → four, two → `/challenge/door/`; H20 ignored brief of #6 → its zh rules → `/challenge/tmp/`; H03/H37 boundary/directory removal → none of the challenge's four rules; H04 → all four at `gate`; H39 → test-chall's four + four parameterised; H28 → test-chall's four (zh → English) + four parameterised; orphan-brief refusal cases unchanged |
| 0008-S6 hook | W4 says what happens to each tree's untracked directory | `tests/pre-commit-sh.test.ts` H10 plus one new case, W3 triggered by a hand-edited `_redirects` | H1a (W4) — AC-9, AC-8 | H10: `platform/challenge/draft/` → "left out"; `platform/zh-TW/challenge/draft/` (English untracked too) → the Traditional Chinese wording; new: untracked `platform/zh-TW/challenge/door/` with English tracked → the Traditional Chinese wording; all matched by `w4()` |
| 0008-S5 | the helper gives locale-coded short links and never the old forms | `tests/unit/challenge/shortLink.test.ts` (overridden: X1/L01, X2/L02/L03, L03 wide number, L11) | F1, F2, F4, F5, F8, F9 — AC-7 | short `en` 1 → `…/en/c/001`, display without scheme; short `zh-TW` 42 → `…/zh-TW/c/042`; 1234 → `/en/c/1234`; page mode unchanged; across both modes × both locales × {1, 42, 1234} no URL contains `/zh/c/` or matches `//[^/]+/c/` |
| 0008-S5 | text follows `locale`; the link follows `locale` in short mode and `entryLocale` in page mode | `ShortLinkShare.test.ts` (overridden: prop documentation, L03, L08, L09 and the cases mounting with `locale` only); `ShortLinkShare.mode-default.test.ts` mounts with both | F1, F2, F4, F5, F8, F10 — AC-7 | both modes × (`en`,`en`), (`zh-TW`,`zh-TW`), (`zh-TW`,`en`), (`en`,`zh-TW`): label, title, copied and failed texts in `locale`; short → `/<locale>/c/NNN`; page → `entryLocale`'s page URL; display = URL without scheme |
| 0008-S5 | the list and the nav pass both inputs and give the page's locale-coded link | `ChallengeList.test.ts`, `MergedNav.test.ts` (overridden: the `/c/001`, `/zh/c/001` expectations, N01/N02/N03's `props()` equality, the header comment on `/c/001` → `/zh/c/001`) | F1, F2, F7, F9, F10 — AC-7 | `en` list → `/en/c/001`, `/en/c/003`, copy writes `…/en/c/001`; `zh-TW` list with runtime `en` → `/zh-TW/c/001`, label `zh-TW`; N01/N02/N03 → `{ number, slug, locale, entryLocale }`, equal locales; nav on `en` → `/en/c/001`, on `zh-TW` with runtime `en` → `/zh-TW/c/001`, both nav instances |
| stage 6 diff check (not automated) | documents | `git diff` against the branch's base | H1a (generator header, section comments, `numericRules`, `includeSlug`, `PARAMETERISED`; `shortLinkPath`; the "one canonical link" comments; `ChallengeList`'s short-link comment; `pre-commit.sh` header and W4), H2 (README both languages), H7 — AC-9 | no changed document in the glossary's corpus uses 主語系 |
| stage 8 (not automated) | rules on a real host | V1c, V1d, V1e, V1f on the Cloudflare preview of `stage8/T-0056`; the copy control's string in both locales | AC-10, G4 | fixture #999 rebuilt on the ticket branch with `pnpm redirects:generate`; `grep 999 platform/public/_redirects` shows four rules before push |

Mutation checks: the "re-points rather than removes" cases (generator, H40, the new `--cached` case,
H20) run once against the old `numericRules` and must go red; the page-mode crossed F10 cases run once
with `entryLocale` ignored and must go red; the order case runs once with the old length sort and must
go red.

Regression gate for every cycle: `npx vitest run` (baseline rerun on this branch before the first
test: 135 files, 4771 passed, 1 skipped); `npx vue-tsc --noEmit -p tsconfig.json` stays at 107 errors;
site-smoke (`pnpm docs:build && npx playwright test --config playwright.site.config.ts`, 79 passed)
once before stage 6, since the components change.

Approval: the user approved this test plan on 2026-11-05 ("核准計畫表"), with `entryLocale` as the second input.

### 2026-11-05 — coverage report (stage 5)

Branch `tickets/T-0056/locale-coded-short-links-and-four-rules`, working tree on `fd2ef09`, not yet
committed. Baseline on this branch before the first test: `npx vitest run` → 135 files, 4771 passed,
1 skipped. After: `npx vitest run` → 135 files, 4792 passed, 1 skipped.
`pnpm docs:build && npx playwright test --config playwright.site.config.ts` → 79 passed (unchanged:
page mode). `npx vue-tsc --noEmit -p tsconfig.json` → 107 errors, unchanged.
`python3 scripts/prose-audit/run.py README.md README.en.md --out <dir>` → PASS, 0 blocking (the
first run blocked 語系代碼 in `README.md`; the sentence was reworded). After stage 6: 135 files,
4793 passed, 1 skipped (one glossary case fewer, see below); 107 `vue-tsc` errors. Coverage is not measured (OQ-009).

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0008-S6 | `redirects-generated.test.ts`: the schema case (#1 translated, #5 English-only, 12 rules in order), "gives the same bytes when generated again", padding in all four forms, no unpadded form, the G3 re-point case, the grouping (robustness) case, the G9 fixture, the header's limit, "ends with the four parameterised rules" (9 new or rewritten); "places every numeric rule before…" takes the four forms | mutation M1 (Traditional Chinese rules only with a Traditional Chinese page, as at `fd2ef09`): the schema and G3 cases red; M3 (rules sorted by source text): the schema case red | G1–G5, G8–G10 — AC-8 | — |
| 0008-S6 (real tree) | `redirects.test.ts`: "ends with the four parameterised classroom rules", "gives every numbered challenge its four rules in form order…" (from `indexSlugs`), the unpadded check over four forms, the target checks as `targetDirectoryFaults` and `orphanFaults` on the repo, and on four temp ranges (no Traditional Chinese directory, an empty one, no English one, an orphan brief); `redirects-generated.test.ts` "is byte-identical…" (unchanged, red until `_redirects` was regenerated) | M4 (Traditional Chinese directory required): the two "accepts" cases red | G4–G7, G10 — AC-8 | G3 on real data: the tree has no untranslated challenge; stage 8's #999 covers it |
| 0008-S6 hook | `pre-commit-sh.test.ts`: `FIXTURE_RULES` now built from `TEST_CHALL_RULES`, `DOOR_RULES`, `PARAMETERISED_RULES`; H01, H02/H14 (and H45), H03, H04, H40, H20, H28, H37 boundary, H39 and its boundary, S2/B2, the directory-removal case and `commitStaleRedirects` with four-rule expectations; new "G3: a Traditional Chinese brief left untracked keeps its challenge's four rules…" | M1: H01, H40, the new G3 case, H20, H28, H39 and its boundary red | G1–G3, G6, G9 — AC-8 | — |
| 0008-S6 hook | H10 gains the two W4 wordings; new "H10, Traditional Chinese tree: an untracked brief beside a tracked English page…" | M5 (one W4 wording): both red | H1a (W4) — AC-9 | — |
| 0008-S5 | `shortLink.test.ts`: X1/L01, X2/L02/L03, L03 wide number, L11 (`/en/c/`, `/zh-TW/c/`); new "never gives a short link without its locale code" in both modes | red at `fd2ef09`'s helper: `git show fd2ef09:.vitepress/challenge/shortLink.ts > .vitepress/challenge/shortLink.ts && npx vitest run tests/unit/challenge/shortLink.test.ts; git checkout -- .vitepress/challenge/shortLink.ts` → 7 failed: X1, X2, L03, L11 ×3, the F9 short-mode case. The F9 page-mode case is a guard: a page URL never held `/c/`, so it was green before | F1, F2, F4, F5, F8, F9 — AC-7 | — |
| 0008-S5 | `ShortLinkShare.test.ts`: literals `/en/c/`, `/zh-TW/c/`; `mountShare` passes `entryLocale`; new "with two locales" — 2 modes × 4 pairs (8), each checking text, title, label, copied and failed status and the copied URL, with the runtime locale the other one; `ShortLinkShare.mode-default.test.ts` mounts with both | M2 (`entryLocale` ignored): the two crossed page-mode cases red | F1, F2, F4, F5, F8, F10 — AC-7 | — |
| 0008-S5 | `ChallengeList.test.ts`: `/en/c/` expectations, new "gives the Traditional Chinese list its own locale-coded links, whatever the runtime locale", N01/N02 with `entryLocale`; `MergedNav.test.ts`: `/en/c/001`, `/zh-TW/c/001`, N03 with `entryLocale` | red at `fd2ef09`'s callers: `for f in ChallengeList MergedNav; do git show fd2ef09:.vitepress/theme/components/$f.vue > .vitepress/theme/components/$f.vue; done && npx vitest run tests/unit/components/ChallengeList.test.ts tests/unit/components/MergedNav.test.ts; git checkout -- .vitepress/theme/components/` → 6 failed: N01/N02 ×2, N03 ×2, and the two page-mode copies from a zh-TW page (`entryLocale` undefined gives the English URL) | F1, F2, F7, F9, F10 — AC-7 | F3, F6 (untranslated entries) are T-0057's |
| documents | `generate-redirects.ts` (header with the 500-challenge limit, both section comments, `numericRules`, `includeSlug`, `PARAMETERISED`, module comment); `shortLink.ts` (`shortLinkPath`, the module's "one link per locale"); `ShortLinkShare.vue` (component comment, both props); `ChallengeList.vue` short-link comment; `pre-commit.sh` header point 4 and W4; `README.md`/`README.en.md` new paragraph after E1/Z1 | stage 6 diff check | H1a, H2, H7 — AC-9 | — |
| stage 8 | — | — | V1c–V1f — AC-10 | not run yet |

Mutation runs, rerun after stage 6's fixes. Each replaces one string in one file, runs the tests
named, and restores the file (`git checkout -- <file>` on the ticket's commit). Results:

| Id | File: replace → with | Command | Red |
|---|---|---|---|
| M1 (`fd2ef09`'s rule: no Traditional Chinese rule without a Traditional Chinese page) | `scripts/generate-redirects.ts`: after `if (!form.chinese && !locales.has('root')) continue` add `if (form.chinese && !locales.has('zh-TW')) continue` | `npx vitest run tests/unit/site/redirects-generated.test.ts tests/pre-commit-sh.test.ts -t "G1–G5\|re-points\|H40\|0008 G3\|H20\|H01:\|H23\|H28\|H39"` | 10: the schema case, the G3 re-point case, H01, H40, 0008 G3, H23, H20, H39 and its boundary, H28 |
| M2 | `ShortLinkShare.vue`: `mode === 'short' ? props.locale : props.entryLocale` → `props.locale` | `npx vitest run tests/unit/components/ShortLinkShare.test.ts -t "two locales"` | 2: the crossed page-mode pairs |
| M3 | `generate-redirects.ts`: `return rules.sort((a, b) => a.number - b.number)` → `… a.number - b.number \|\| a.from.localeCompare(b.from))` | `npx vitest run tests/unit/site/redirects-generated.test.ts -t "G5"` | 3: the schema case, the by-number case, the G9 case |
| M4 | `tests/unit/site/redirects.test.ts`: `const optional = rule.to !== '/challenge/:slug/'` → `const optional = false` | `npx vitest run tests/unit/site/redirects.test.ts -t "no Traditional Chinese\|is empty"` | 2: both "accepts" cases |
| M5 | `scripts/pre-commit.sh`: `case "$dir" in platform/zh-TW/challenge/*)` → `…/NEVER*)` | `npx vitest run tests/pre-commit-sh.test.ts -t H10` | 2: H10 and its Traditional Chinese case |
| M6 | `generate-redirects.ts`: `return rules.sort((a, b) => a.number - b.number)` → `return rules` | `npx vitest run tests/unit/site/redirects-generated.test.ts -t "G5"` | 1: "orders by number, not by slug" |

The plan's "old length sort" mutation is not one: `/en/c/001` and `/zh/c/001` have the same length,
so a stable length sort keeps the form order and nothing goes red. M3 sorts by source text instead,
which puts `/zh-TW/c/` before `/zh/c/`.

Changes beyond the approved plan:
- The new hook case for an untracked Traditional Chinese brief stages an English change too
  (`stageDoorChange()`), and the new W4 case uses an unadded brief of test-chall instead of door's
  brief removed with `--cached`. Both because of the hook behaviours recorded below.
- H39's titles ("both its rules go") now say all four; H39 is named in the overridden contract.
- From stage 6 (each named in traceability revision 3.3 or below): H10 gains the W4 wording checks;
  H23 asserts all four of old-chall's rules; `redirects-generated.test.ts` gains "orders by number,
  not by slug" (G5 at fixture level), "gives the same bytes for the same tree, whatever order its
  directories were made in" replaces "gives the same bytes when generated again", and "is
  byte-identical…" filters per tree with `indexSlugs`, as the hook does; `redirects.test.ts`'s
  real-tree case asserts each tracked challenge's four rules and the rule count instead of
  recomputing the file, plus a literal case for #001; `GLOSSARY.md` drops 永久編號's "coined"
  declaration, which `tests/unit/site/glossary.test.ts` requires once the term is used in the corpus
  (the README now uses it, stage 6 Std F6), so that file has one case fewer.

Found while testing, outside this ticket (for the user to review; not fixed here):
- **Hook: a commit whose only staged change under `platform/` is `git rm -r --cached` of a challenge
  directory kept on disk ends in O5.** With door's Traditional Chinese brief removed from the index
  alone, the hook's stash push stops partway (`錯誤: 輸入沒有有效的修補檔內容`), it exits 1 and
  names a stash entry to restore from. Reproduce: drop `stageDoorChange()` from the new G3 case and
  run `npx vitest run tests/pre-commit-sh.test.ts -t "G3: a Traditional"`. The stash code is not in
  this ticket's diff (`git diff fd2ef09 -- scripts/pre-commit.sh` touches only the header and W4), so
  it predates T-0056; the message is the one printed at `scripts/pre-commit.sh:270-282` at `fd2ef09`.
- **Hook: W4 names nothing when no Traditional Chinese brief is tracked.** git lists an untracked
  tree with no tracked file as the tree itself (`platform/zh-TW/challenge/`). The W4 loop
  (`scripts/pre-commit.sh:399-403` at `fd2ef09`) strips the tree prefix, leaving an empty `rest`, which
  none of its three `case` patterns matches, so the entry is dropped. The same holds for an English
  tree with no tracked file. Reproduce:
  `git init`, commit `platform/{challenge,zh-TW/challenge}/door/index.md`, `git rm -rq --cached
  platform/zh-TW/challenge/door`, then `git ls-files --others --exclude-standard --directory
  --no-empty-directory -- platform/challenge/ platform/zh-TW/challenge/` prints `platform/zh-TW/challenge/`.

### 2026-11-05 — stage 6 review and its disposition

Workflow `wf_8839e561-e79`: one `harness-reviewer` per axis (Standards, Spec) on the same packet
(`git diff HEAD` on `fd2ef09`, every changed file's content, a manifest), and one independent
`harness-reviewer` per axis checking each finding. Standards: 26 findings (verdicts: 17 confirmed,
9 partly, none refuted). Spec: 14 findings (8 confirmed, 6 partly). No high-severity finding. All are
in this ticket's scope; the user's standing instruction is to fix those and record the rest.

| Finding | Disposition |
|---|---|
| Std F1–F3, F5 (records not reproducible: the mutation script, red-before counts, the prose-audit command, the W4 skip) | Fixed: the mutation table, the red-before commands and the full prose-audit command are in the coverage report; the W4 finding cites `scripts/pre-commit.sh:399-403` at `fd2ef09` (the checker corrected the reviewer: no `case` pattern matches the empty `rest`) |
| Std F4 (`config.mts:80` not pinned) | Fixed: "at `fd2ef09`" |
| Std F6, F7 (README: bare 編號; 語言 for 語系偏好) | Fixed in both READMEs (永久編號, 語系偏好, 翻譯; "locale preference", "translation") |
| Std F8 (real-tree test recomputes the generator) | Fixed: per tracked challenge, the four rules the spec states and the rule count; plus a literal case for #001. Byte equality stays in `redirects-generated.test.ts` |
| Std F9 (stale file headers in both redirect tests) | Fixed |
| Std F10, Spec F14 (titles still say "both") | Fixed: "before the parameterised rules"; H23 retitled and strengthened (Spec F5) |
| Std F11, Spec F10 (`ShortLinkLocale` "if any") | Fixed: the type's comment states every short link carries its segment |
| Std F12–F14 (duplicate `escapeRe`, orphaned JSDoc, upper-case helper names) | Fixed: `w4()` uses `escapeRe`; JSDoc moved; `w4LeftOut`, `w4EnglishPage`; `messages` hoisted once |
| Std F15 (two W4 echoes) | Fixed: one echo with the tree's `effect` |
| Std F16 (mode chosen in the component, URL shape in the helper) | Kept, as approved in the test plan; `challengeLink`'s comment now says the caller picks the locale |
| Std F17 (`entryLocale` typed `ShortLinkLocale`) | Fixed in part: the type's comment now covers a page URL's prefix; the type is kept, one name for both uses |
| Std F18 (four forms written twice in the generator) | Fixed: one `FORMS` table builds the numbered and the parameterised rules; the tests' own literals stay, on purpose (`redirects.test.ts` header) |
| Std F19 (same-input determinism test) | Fixed: two trees made in opposite orders give the same bytes |
| Std F20 (F9 page-mode case never red) | Recorded: a guard, noted in the coverage report |
| Std F21 (`ssr()` shadowing top-level imports) | Fixed: `ssr()` uses the top-level imports; the new case uses a `runtimeI18n` helper |
| Std F22 (weak "refuses a range with no English directory") | Fixed: exactly the two English rules' "targets missing directory" |
| Std F23 (expected paths computed) | Fixed: written out per row |
| Std F24 ("as a literal"; header's oracle strategy) | Fixed: both comments |
| Std F25 (bare "G3:" in a 0007 file) | Fixed: "0008 G3:" |
| Std F26 (zh-TW section) | Fixed: `entryLocale` and the stage 8 condition |
| Spec F1–F4, F13 (test changes not named in the overridden contracts) | Fixed: traceability 3.3 names H10, H23, the `redirects-generated.test.ts` cases, "backs every translated slug…", `ShortLinkShare.mode-default.test.ts`, and "or an empty one"; H45 follows H02/H14 by its definition (epic 0007 H45) |
| Spec F5 (H23 asserts one rule) | Fixed: its four rules, the Traditional Chinese ones at the English page |
| Spec F6 (order by number untested at fixture level) | Fixed: "orders by number, not by slug" (M6 turns it red) |
| Spec F7, F8 (hook stash abort; W4 silent on a fully untracked tree) | Recorded for the user, out of scope (predate this ticket); the 0008 G3 case's comment says which commit form it avoids |
| Spec F9 (hook header "a brief"; given-out forms) | Fixed: "a Traditional Chinese brief", and which forms are given out and which kept |
| Spec F11 (spec text says "locale of the link") | Recorded in traceability 3.3's fourth contract: the approved shape; no D-number changes |
| Spec F12 (two CI oracles disagree on a dirty tree) | Fixed: "is byte-identical…" filters per tree like the hook |

After the fixes (working tree on `fd2ef09`): `npx vitest run` → see the coverage report's figures;
the six mutations rerun as tabled; `python3 scripts/prose-audit/run.py README.md README.en.md --out <dir>`
→ PASS.

### 2026-11-05 — stage 7 security review and its disposition

Report: `review/security-T-0056.md` (workflow `wf_70636421-7a9`; one candidate pass, one independent
false-positive check per candidate, on the working tree after stage 6's fixes). Nine candidates, all
judged not a vulnerability; nothing changed in this stage. Recorded for the user, each predating this
ticket or stated by the spec: S-1 (slugs reach `_redirects` without the slug grammar), S-2 (the
500-challenge limit is stated, not enforced: `spec.en.md:258`), S-3 (`/en/c/` and `/zh-TW/c/` take
one-segment paths below them), S-4 (an all-digit slug equal to another challenge's padded number is
shadowed by that number's rules, now in four forms), S-5 (W4 echoes control characters of an
untracked directory's name), S-6 (= stage 6 Spec F8).

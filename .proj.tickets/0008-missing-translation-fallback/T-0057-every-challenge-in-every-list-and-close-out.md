---
id: T-0057
title: Every locale's list shows every challenge, and the epic's full stage 8
epic: 0008-missing-translation-fallback
status: review
blocked_by: [T-0055, T-0056]
---

## Context

The Traditional Chinese challenge list and home page are built only from Traditional Chinese briefs, so
a challenge a teacher wrote only in English is missing from the list the default-language learner sees
(OQ-023). This ticket merges both locales' briefs into every list, marks untranslated entries, and
gives their copy control the link that opens them. It lands last: it needs the route watcher's change
and the routing decisions (T3; through T-0055, which follows T-0054) so that clicking an untranslated
entry does not overwrite a Traditional Chinese reader's preference, and the two-input copy control of
T-0056 for F3 and F6. It also closes OQ-023 and runs the epic's full stage 8 (T4).

Spec: `spec.en.md` revision 3.1, "Locale challenge data", "Challenge link"; `traceability.md` revision 3.5,
decision G7, seam 0008-S4, the locale-challenge-data schema and merge rules, the marks, rows E1–E10,
F3, F6, F10, H3, H4, H5, H7, and the full V table.

## Deliverable

Both locales' data loaders return every challenge per the merge rules, with the new `locale` field.
The Traditional Chinese list, in list and grid view, and the home page's latest cards show an
English-only challenge with its English title and summary (`lang="en"`), the mark `只有英文` already in
the static HTML, and a link to the English page; the copy control gives `/zh-TW/c/NNN` in short mode and
the English page URL in page mode. Counts, search, filters and the solved badge include it. OQ-023 is
closed and the other open questions updated; AGENTS.md no longer calls `platform/zh-TW/` a mirror.

## Acceptance criteria

- [x] E1–E10: merged data, `id`s, defaults, the mark in list view, grid view and home cards in static HTML, counts, search, filters, solved badge, no short link without a number or for an entry with only a Traditional Chinese brief (AC-6)
- [x] F3, F6: the untranslated entry's short and page links (AC-7)
- [x] H3 (this ticket's part): troubleshooting's passages on the two lists holding different challenges and numbering independently, and the guide index's sentence that the lists number independently, both languages (AC-9)
- [x] H4: OQ-023 closed; OQ-016, OQ-018 and OQ-024 updated as the row states (AC-9)
- [x] H5: AGENTS.md's Repository layout (AC-9)
- [x] H7 across the whole epic's documents (AC-9)
- [x] Overridden contracts touched here (`challenge-data-loaders.test.ts`; from traceability 3.5 the `ChallengeData` fixtures of `ChallengeList.test.ts` and `HomeContent.test.ts`, `ChallengeList.test.ts`'s N01/N02, N04 and SSR helper, `HomeContent.test.ts`'s harness, `site-smoke.spec.ts`'s `expectedUrlFor`) change only as the traceability table states
- [x] Stage 8 (T4): the full V table — V1a–V1l on the Cloudflare preview of `stage8/T-0057`, V2 on a temporary GitHub Pages range, V3 — after T-0053 to T-0056 have landed; then, with the user's approval, delete the throwaway branch, its preview and the temporary range (AC-10)

## 給使用者（zh-TW）

讓繁中題目清單（清單與格狀檢視）和首頁也列出只有英文的題目：顯示英文標題與摘要，加上「只有英文」標記（JavaScript 還沒載入時就看得到），點進去開英文頁，複製按鈕給 `/zh-TW/c/NNN` 或英文頁網址。計數、搜尋、篩選、已解題徽章都算進去。這張票最後落地，負責關閉 OQ-023、更新其他 open question 與 AGENTS.md，並跑整份第 8 階段驗證表，驗完經你同意後刪掉拋棄式分支、preview 與臨時靶場。

## Comments

### 2026-11-06 — test plan (stage 5)

Read for this plan: this ticket; `spec.en.md` revision 3.1 ("Locale challenge data", "Challenge link",
"Message keys", "Overridden contracts", AC-6, AC-7, AC-9, AC-10) and `traceability.md` revision 3.4
(G7, seam 0008-S4, the locale-challenge-data schema and merge rules, the canonical marks, rows
E1–E10, F3, F6, F10, H3–H5, H7, the V table, D12, the overridden contract "one content loader per
locale tree"); the records of T-0053–T-0056; and, at `c97e8ae`, `platform/shared/challenges{,.zh-TW}.data.ts`,
`platform/{,zh-TW/}{challenges,index}.md`, `.vitepress/theme/components/{ChallengeList,HomeContent,ShortLinkShare}.vue`,
`.vitepress/theme/i18n/messages/{en,zh-TW}.json`, `tests/setup.ts`,
`tests/unit/site/challenge-data-loaders.test.ts`, `tests/unit/components/{ChallengeList,HomeContent}.test.ts`,
`tests/site-smoke/{site-smoke,missing-translation}.spec.ts`, `GLOSSARY.md`, `.proj.specs/OPEN-QUESTIONS.md`.
Before approval the draft was checked by two independent reviewers (workflow `wf_fdb37032-da6`):
two P0 (the required `locale` field forces changes to unnamed tests — hence revision 3.5), and P1s
on runtime-apart SSR, mounting `HomeContent`, E3's page mode, the message-key check, H7's epic-wide
base, `GLOSSARY.md`'s old 編號 statements, `site-smoke`'s `expectedUrlFor`, stage 8's approvals and
new tabs, and the `id` rule's branches; P2s on E5/E7–E10 detail, F10 on the borrowed row, the
fixture's date, H4's linked passages and prose-audit. All are folded into the plan below. Approval follows the user's standing instruction of 2026-11-06 to take
the recommendation on every later question ("以下後續問題都按照建議").

Working names, not fixed by the spec:
- `mergeLocaleChallenges(pages, listLocale)` in `platform/shared/mergeChallenges.ts` (pure, no
  VitePress import): takes every brief of both trees as `{ url, frontmatter, excerpt? }` and returns
  `ChallengeData[]` per the merge rules — keyed by slug (from the url); the list locale's brief when
  it exists, else the other's, `locale` naming the one used; a field the used brief leaves out takes
  the list locale's default (`網站攻防挑戰`, `綜合`, `mystery` in the Traditional Chinese list; `Web
  exploitation challenge`, `General`, `mystery` in the English one); `id` = the English brief's
  frontmatter `id`, else the Traditional Chinese brief's, else the 1-based position in the shared
  order (English briefs in the order given, then Traditional Chinese-only briefs by slug), whatever
  order the input lists the two trees in. Both loaders call `createContentLoader` with both globs (it
  accepts `string | string[]`) and their own locale.
- A message key `missing_translation.mark`: `只有英文` in `zh-TW.json`, `Traditional Chinese only` in
  `en.json`; no other key changes.
- `ChallengeList` and `HomeContent` show the mark when an entry's `locale` differs from the page's
  locale, resolved at the page's locale (`localeIndex`, as `tp` does, never the runtime `$t`), and put
  `lang="<entry.locale>"` on a borrowed title and summary; translated entries get neither.
  `ChallengeList` passes `entryLocale = entry.locale` to the copy control (F3 short: list locale; F6
  page: the English page). E3: in the English list an entry whose `locale` is `zh-TW` shows no copy
  control in short mode (no `/en/c/NNN` rule exists for it, G9) — a `v-if` in `ChallengeList`; in
  page mode it shows its Traditional Chinese page URL, which opens (spec: "no short link"; this
  reading is recorded as following the recommendation, not as a new decision).
- `HomeContent` gains `useData().localeIndex`.

Scope notes:
- The real tree has no English-only challenge: merged, both lists still hold the same four challenges;
  ids become the English loader's positions, and badges and order read `number` first, so nothing
  visible changes. The built-site E rows on an untranslated entry are stage 8's (V1g on fixture #999,
  dated 2026-11-04, after every other challenge, so it is the home page's newest card); the
  static-HTML claim is tested at unit level with SSR whose runtime locale differs from the page's.
- E3 and E10 are fixture-only (unreachable in a committed tree).
- Traceability revision 3.5, written before the first existing test is changed (no behaviour change,
  spec text unchanged), names the existing tests this ticket changes beyond
  `challenge-data-loaders.test.ts`: every `ChallengeData` fixture in `ChallengeList.test.ts` and
  `HomeContent.test.ts` (they gain `locale`), `ChallengeList.test.ts`'s N01/N02 and N04 cases and its
  SSR helper (runtime locale apart from the page's), `HomeContent.test.ts`'s harness (it mounts the
  component), and `site-smoke.spec.ts`'s `expectedUrlFor` (the page URL of a row follows the row's
  link, not the list's locale: F6).
- The epic's close-out (chain analysis, evidence report, retrospective) follows this ticket's landing
  and is not part of its stage 8.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0008-S4 | the merge rules | new `tests/unit/site/merge-challenges.test.ts`, `mergeLocaleChallenges` | E1, E2, E3, E4, E5, E10 — AC-6 | fixture: #1 translated with English `id: 11` and Traditional Chinese `id: 99`; #5 English-only, its brief omitting category and title; #7 Traditional Chinese-only with `id: 7`; an English entry without a number; `zh-TW` list → #1 from the zh brief (`locale: 'zh-TW'`, `id: 11`), #5 from the English brief (`locale: 'en'`, English url, summary, number, tags, date; title `網站攻防挑戰`, category `綜合`, difficulty `mystery` defaults), #7 (`id: 7`), the unnumbered one (`number` undefined); `en` list → #1, #5 with `locale: 'en'`, #7 with `locale: 'zh-TW'` and the English defaults; both lists: the same slugs in the same order with the same `id`s, also when the `zh-TW` call lists the Traditional Chinese briefs first; position `id`s: English order, then zh-only by slug |
| 0008-S4 loaders | both loaders read both trees and merge | `tests/unit/site/challenge-data-loaders.test.ts` (overridden contract) | E1, E4 — AC-6 | each loader's `createContentLoader` names both globs and calls `mergeLocaleChallenges` with its own locale; the shared function maps every field `ChallengeData` declares, `locale` included; `number` read from frontmatter, never invented |
| 0008-S4 list | a borrowed entry with its mark, language and link | `tests/unit/components/ChallengeList.test.ts` (fixtures gain `locale`; N01/N02, N04 per rev 3.5) | E2, E3, E6, E8, E9, E10, F3, F6, F10, AC-7 — AC-6, AC-7 | `zh-TW` page with runtime `en`: entry `locale: 'en'` shows `只有英文` in list and grid view, `lang="en"` on title and summary, the row opens the English page; short → `…/zh-TW/c/005`, no `/zh/c/`, no `/en/c/005`; page → the English page URL; label, copied and failed texts in `zh-TW`; search by its English title and by its summary finds it; category `綜合` and difficulty filters keep it; result count and progress total include it; solved badge (by slug) in list and grid view; `en` page with runtime `zh-TW`: entry `locale: 'zh-TW'` shows `Traditional Chinese only`, `lang="zh-TW"`, no `[data-short-link]` in short mode, the Traditional Chinese page URL in page mode; an unnumbered borrowed entry: no short link in either mode; translated entries: no mark, no `lang`; SSR of the `zh-TW` list with runtime `en`: the mark in the HTML |
| 0008-S4 home | the home page counts and marks borrowed entries | `tests/unit/components/HomeContent.test.ts` (it now mounts `HomeContent` with `useData`/`withBase` mocked; rev 3.5) | E6, E7 — AC-6 | `zh-TW` home with runtime `en`, a borrowed newest entry: its card shows `只有英文`, `lang="en"` on title and summary, href the English page; the total and per-difficulty counts include it; `en` home with runtime `zh-TW`: `Traditional Chinese only`; SSR with runtime `en`: the mark in the HTML |
| 0008-S7 (built site) | site-smoke no longer assumes a row's page is in the list's locale | `tests/site-smoke/site-smoke.spec.ts` `expectedUrlFor` (rev 3.5) | F6 — AC-7 | the real tree: unchanged results (regression); the expected page URL is derived from the row's own link |
| stage 6 diff check (not automated) | documents and keys | `git diff c97e8ae` for the ticket; the epic's base `5d3c173` (main before T-0053) for H7 | H3 (`troubleshooting.md` and `zh-TW` twin on the two lists and their numbering; `guide/index.md` both languages, the numbering sentence and the row description gaining the mark), H4 (OQ-023 closed; OQ-016's resolved paragraph; OQ-018; OQ-024 including its quote of AGENTS.md and its OQ-023 references), H5 (AGENTS.md's Repository layout), H7 (`git diff 5d3c173 -- README.md README.en.md AGENTS.md platform | grep '^+' \| grep -c 主語系` → 0; `glossary.test.ts`'s coined-term check, which fails if 主語系 enters the corpus), `GLOSSARY.md`'s statements about the guide's old meaning of 編號 (made false by H3), message keys (`git diff c97e8ae -- .vitepress/theme/i18n/messages/` adds only `missing_translation.mark`) — AC-9, AC-6 | — |
| stage 8 (not automated) | the whole epic on real hosts | V1a–V1l on the Cloudflare preview of `stage8/T-0057` (V1c from `/zh-TW/c/<slug>`, then `/zh/c/<slug>`, stored none, `zh-TW`, `en`; V1j with `/zh-TW/c/<slug>`); V2 on a temporary GitHub Pages range created with create-wxl from that commit; V3; each action in a new tab with the stored value set first; challenge pages with the Browser panel open (V1a, V1i, V1l); each observation's surface stated; `curl` of `/zh-TW/challenges` and `/zh-TW/` for the mark in the served HTML | AC-10 | pushing and deleting `stage8/T-0057` and creating the temporary range are authorized in advance (2026-11-05); the user deletes the repository; `cxphoenix.github.io` storage cleared after V2 |

Mutation checks, recorded as replace-and-run lines: the merge without borrowed entries (today's
per-tree loader) turns the E2/E3 merge cases red; `id` from each list's own position turns the E4
cases red; the mark resolved with `$t` instead of the page locale turns the runtime-apart cases red;
the mark removed turns E6 red; `entryLocale` given the list locale turns F6 red.

Regression gate for every cycle: `npx vitest run` (baseline before the first test); `npx vue-tsc
--noEmit -p tsconfig.json` stays at 107; site-smoke before stage 6; `python3
scripts/prose-audit/run.py <changed markdown> --out <dir>` before stage 6.

Approval: under the user's standing instruction of 2026-11-06 ("以下後續問題都按照建議"), including the
E3 page-mode reading above.

### 2026-11-06 — coverage report (stage 5)

Branch `tickets/T-0057/every-challenge-in-every-list`, working tree on `c97e8ae`, not yet committed.
Baseline before the first test: `npx vitest run` → 135 files, 4824 passed, 1 skipped. After:
`npx vitest run` → 136 files, 4845 passed, 1 skipped. `pnpm docs:build && npx playwright test
--config playwright.site.config.ts` → 86 passed (the real tree: no untranslated challenge, so no
visible change). `npx vue-tsc --noEmit -p tsconfig.json` → 107 (one error from an N04 fixture without
`locale` was fixed; comparing against a `git stash` of the tree is misleading here, since stash
leaves the new untracked files in place). `python3 scripts/prose-audit/run.py
platform/guide/troubleshooting.md platform/zh-TW/guide/troubleshooting.md platform/guide/index.md
platform/zh-TW/guide/index.md AGENTS.md GLOSSARY.md --out <dir>` → PASS, 0 blocking. Coverage is not
measured (OQ-009).

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0008-S4 | new `merge-challenges.test.ts` (9): E1, E2 with defaults, E3 and E10, the English list's two cases, E4 order and `id` with the trees in either order, zh-only by slug, the zh `id` when the English one is missing, no invented number | red before `mergeChallenges.ts` existed (the file failed to import); M1 (no borrowed entries) turns 4 red, M2 (each list's own positions) 2 | E1–E5, E10 — AC-6 | — |
| 0008-S4 loaders | `challenge-data-loaders.test.ts` (5; overridden contract): both globs and `mergeLocaleChallenges(raw, '<locale>')` per loader, every field mapped by the shared function, `locale` included, `number` never invented | R3: at `c97e8ae`'s `challenges.zh-TW.data.ts` the zh-TW wiring case is red | E1, E4 — AC-6 | — |
| 0008-S4 list | `ChallengeList.test.ts`, "with an untranslated entry" (7) and the SSR case; fixtures gain `locale`, N01/N02 expect the entries' own `entryLocale`, N04's fixtures (rev 3.5) | R1: 5 red at `c97e8ae`'s component (N01/N02 zh-TW, SSR mark, E2/E6, F3/F6/F10, E3); M3 (mark by runtime `$t`) 3, M4 (no mark in grid) 1, M5 (`entryLocale` = list locale) 2 | E2, E3, E6, E8, E9, E10, F3, F6, F10 — AC-6, AC-7 | E8, E9, E10 and "no mark on a translated entry" are guards: the component searched, filtered, badged and hid unnumbered links before this change too |
| 0008-S4 home | `HomeContent.test.ts`: fixtures gain `locale`; new mounted cases (4), with `vitepress` mocked (rev 3.5) | R2: 3 red at `c97e8ae`'s component (the mark ×2, SSR); the counts case is a guard | E6, E7 — AC-6 | — |
| 0008-S7 (built site) | `site-smoke.spec.ts` `expectedUrlFor` follows the row's link (rev 3.5) | green on the real tree, as before | F6 — AC-7 | an untranslated row on the built site: stage 8 (V1g, V2) |
| documents (checked at stage 6, below) | H3: `troubleshooting.md` (the two-lists list) and `guide/index.md` (row description, the `#NNN` sentence), both languages; H4: `OPEN-QUESTIONS.md` OQ-016 (both mentions), OQ-018 (update), OQ-023 (closed), OQ-024 (evidence lines, Not blocked, update); H5: `AGENTS.md`; `GLOSSARY.md`'s two statements about the guide's old 編號; message keys | stage 6 diff check | H3, H4, H5, H7 — AC-9, AC-6 | — |
| stage 8 | — | — | V1a–V1l, V2, V3 — AC-10 | not run yet |

Reproductions (taken before stage 6; each replaces one file with `c97e8ae`'s version, runs the tests,
restores the copy taken first — `python3 <scratchpad>/red57.py`; on the ticket's commit
`git checkout -- <file>` restores):

```
# R1  5 failed of 70
git show c97e8ae:.vitepress/theme/components/ChallengeList.vue > .vitepress/theme/components/ChallengeList.vue
npx vitest run tests/unit/components/ChallengeList.test.ts
# R2  3 failed of 12
git show c97e8ae:.vitepress/theme/components/HomeContent.vue > .vitepress/theme/components/HomeContent.vue
npx vitest run tests/unit/components/HomeContent.test.ts
# R3  1 failed of 5
git show c97e8ae:platform/shared/challenges.zh-TW.data.ts > platform/shared/challenges.zh-TW.data.ts
npx vitest run tests/unit/site/challenge-data-loaders.test.ts
```

Mutations (`python3 <scratchpad>/mutate57.py`; each replaces one string, runs, restores):

```
# M1  platform/shared/mergeChallenges.ts: keep only slugs with a brief in the list's locale — red 4
#   return [...englishOrder, ...chineseOnly].map(…)  →  ….filter((slug) => bySlug.get(slug)![listLocale]).map(…)
npx vitest run tests/unit/site/merge-challenges.test.ts
# M2  the same file: the zh-TW list ordered by its own tree first, ids from that position — red 2
#   after: const chineseOnly = [...bySlug.keys()].filter((slug) => !bySlug.get(slug)!.en).sort()
#   add:   if (listLocale === 'zh-TW') { const zh = [...bySlug.keys()].filter((s) => bySlug.get(s)!['zh-TW']);
#            englishOrder.splice(0, englishOrder.length, ...zh, ...englishOrder.filter((s) => !zh.includes(s))); chineseOnly.length = 0 }
npx vitest run tests/unit/site/merge-challenges.test.ts -t "E4|both lists"
# M3  ChallengeList.vue, the list view's mark — red 3
#   {{ tp('missing_translation.mark') }}  →  {{ $t('missing_translation.mark') }}   (in the span with class "ch-badge shrink-0")
npx vitest run tests/unit/components/ChallengeList.test.ts -t "untranslated|borrowed"
# M4  ChallengeList.vue, the grid card's mark — red 2 after stage 6 (the E2/E6 case and the E3 grid case)
#   <span v-if="isBorrowed(c)" data-locale-mark class="ch-badge">{{ tp('missing_translation.mark') }}</span>  →  (removed)
npx vitest run tests/unit/components/ChallengeList.test.ts -t untranslated
# M5  ChallengeList.vue: :entry-locale="c.locale" → :entry-locale="pageLocale" — red 2
npx vitest run tests/unit/components/ChallengeList.test.ts -t untranslated
```

Changes beyond the approved plan:
- The E8 component case first failed for a test reason (the list debounces the search by 300 ms);
  it now uses fake timers, as the existing summary case does.

### 2026-11-06 — stage 6 review and its disposition

Workflow `wf_3851ec75-4bc` (a first launch that reused T-0055's prompt was stopped at once and
replaced): one `harness-reviewer` per axis on the same packet (`git diff HEAD` on `c97e8ae`, the two
new files added with `git add -N`), and one independent `harness-reviewer` per axis checking each
finding. Standards: 18 findings and 8 smells (21 confirmed, 7 partly). Spec: 14 findings (10
confirmed, 3 partly, 1 refuted). No high-severity finding. Every item was in scope; the user's
standing instruction of 2026-11-06 ("以下後續問題都按照建議") covers the two readings recorded below.

| Finding | Disposition |
|---|---|
| Std F1 (`slugOf`'s JSDoc split from it) | Fixed: the new helpers sit above it |
| Std F2, F3, F4; Spec F12 (loader test: vacuous field check, private names, narrow guard, stale header) | Fixed: the field check reads only `toData`'s returned literal; the header now tells the history; the `?? index` guard says it guards only the old spelling. The wiring check stays a source check, as the file always was |
| Std F5 (`.text-3xl` as a locator) | Fixed: `data-stat` hooks on the home page's counts |
| Std F6 (a test named with "number" for an `id`) | Fixed: "give … position ids" |
| Std F7, F8, F9, F10; Spec F13 (record: mutation strings, R commands, H7 and key results, a plan item listed as beyond the plan, the AC's list, the plan critique) | Fixed: M2–M4 carry their replacements, R1–R3 their commands; H7 and the key diff are recorded below; the beyond-plan item removed; the AC and Spec lines updated; the plan critique summarised |
| Std F11; Spec F9 (E3's page mode is a reading of "no short link") | Recorded in traceability 3.5, on the recommendation: E3's row and the revision note state it |
| Std F12, F13, F14, F15; Spec F5, F6, F8 (OPEN-QUESTIONS: `closed` before the epic lands, the status word, "every challenge has both", OQ-016's sentence, a double blank line, a long line) | Fixed: OQ-023 is `open — closes when epic 0008 lands`, as OQ-016 did for 0007; at the epic's close-out it becomes `resolved` with stage 8's evidence; the other wording and layout corrected |
| Spec F7 (OQ-024's Blocks) | Fixed: blocks only a change of the layout or of the primary locale |
| Spec F14 (OQ-022's "epic 0008" means another epic) | Fixed: "the setup-page epic" |
| Std F16, F17 (語言 for 語系; summary and description mixed) | Fixed: 語系, and "description" throughout the passage |
| Std F18 (a new term, the mark) | Fixed: `GLOSSARY.md` gains **locale mark（語系標記）**, and the guide's zh-TW passages use it |
| Spec F1 (rev 3.5's "Now" column said the short link follows the entry) | Fixed: the page link and page-mode copy follow the entry; the short link the list (F3) |
| Spec F2 (the guide said an unnumbered challenge shows its position) | Fixed in both languages and both pages: a provisional number, not permanent, not to be used |
| Spec F3, F4 (the "differences" lead-in; the English example was the unreachable case) | Fixed: a neutral lead-in; the English pages give the real case, 只有英文 ("English only") |
| Spec F10 (four-kind home count, E3 in grid view, an English-page SSR) | Fixed: the counts case uses AC-6's four and reads `data-stat`; E3 in grid view; the English list's SSR with a Traditional Chinese runtime |
| Spec F11 (H7's command misses part of the corpus) | Refuted by the checker (the glossary test covers the corpus); the command now names it too: `git diff 5d3c173 -- README.md README.en.md AGENTS.md CLAUDE.md CONTRIBUTE.md docs/agents/guide.md platform .vitepress/theme/i18n/messages/zh-TW.json \| grep '^+' \| grep -c 主語系` → 0 |
| S1, S4 (pageLocale/isBorrowed in two components; the locale union repeated) | Fixed in part: `ChallengeLocale` exported from `challenges.data.ts` and used by the merge and the home page; the two components keep their own three-line helpers |
| S2, S3, S5 (E3's rule in the list; `mode`; three slug parsers) | Kept: the rule only the list needs; `mode` as `ShortLinkShare` names it; the parsers read different inputs (a base-less url, a built href) |
| S6 (the home test's copied logic) | Kept, recorded: pre-existing; the new cases mount the component |
| S7, S8 (mode switching inside one case; `select` order; interpolated summary) | Kept, recorded: low risk, the file's existing patterns |

Checks after the fixes (working tree on `c97e8ae`): `npx vitest run` → 136 files, 4853 passed, 1
skipped; `npx vue-tsc --noEmit -p tsconfig.json` → 107; the five mutations rerun red as tabled;
`pnpm docs:build && npx playwright test --config playwright.site.config.ts` → 86 passed;
`git diff c97e8ae -- .vitepress/theme/i18n/messages/` adds only `missing_translation.mark` to each file
(the `list_link` lines gain a trailing comma); prose-audit on the changed guide pages and GLOSSARY →
PASS.

### 2026-11-06 — stage 7 security review and its disposition

Report: `review/security-T-0057.md` (workflow `wf_5cc10e2e-6ee`; one candidate pass, one independent
false-positive check per candidate, on the working tree after stage 6's fixes). Eleven candidates,
all judged not a vulnerability. S-1 is fixed here as robustness the change widened: a title,
description or category that is not a string (YAML reads `title: 2048` as a number) made the list's
search or category sort throw, and one tree's brief now reaches both lists; `toData` now takes the
list's default for such a value and keeps only string tags (`merge-challenges.test.ts`, "takes the
list's default for a title, summary or category that is not a string", red before the fix). Recorded
for the epic's chain analysis: S-2 (a Traditional Chinese `id` orders the English list when the
English brief has none), S-3 and S-4 (a Traditional Chinese-only brief reaches the English list and
its `/zh-TW/` link writes `zh-TW` on a cold load — unreachable in a committed tree), S-5 (local
drafts under `platform/zh-TW/challenge/` reach the English list too), S-11 (a borrowed entry's
default title carries the other locale's `lang`).

### 2026-11-06 — stage 8

Surface, per D12: the throwaway branch `stage8/T-0057` = this ticket's `aae3d01` plus fixture commit
`1532eea` (made with `/tw-emoji-commit`: `git checkout 41b9dc7 -- platform/challenge/stage8-english-only`,
then `pnpm redirects:generate`; `grep 999 platform/public/_redirects` showed the four rules
`/c/999`, `/en/c/999`, `/zh/c/999`, `/zh-TW/c/999`). Pushing and deleting it were authorized in
advance for T-0055–T-0057. Cloudflare Pages preview `https://stage8-t-0057.wxl-platform.pages.dev`
(deployment `80e6588c`, check run "Cloudflare Pages" on `1532eea`: success). T-0053 to T-0056 are on
`main` (`c97e8ae`), which this branch is cut from.

Scripts are in the session's scratchpad and run from the repository root with
`@playwright/test`'s Chromium (headless): `v1-rows.cjs <origin>`, `v3-switch.cjs <origin>`,
`v3-menus.cjs <origin> /reference/attack-log-export-format`. Each action opens a fresh browser
context (a new tab and a new session) after setting `wxl-locale` on `/favicon.svg` of the same
origin. The rows marked "built-in browser" ran in the host's built-in browser, each in a new tab
after clearing `localStorage` and setting the stored value from a `/favicon.svg` tab; challenge
pages there had the challenge's Browser panel open (screenshots in the session).

**HTTP (`curl -s -o /dev/null -w '%{http_code} %{redirect_url}'`, the preview):** `/c/999`,
`/en/c/999`, `/zh/c/999`, `/zh-TW/c/999` → 302 to `/challenge/stage8-english-only/` (G1, G3);
`/zh/c/001`, `/zh-TW/c/001` → 302 to `/zh-TW/challenge/door-is-open/` (G2); `/c/001`, `/en/c/001`
→ 302 to `/challenge/door-is-open/` (G1); `/zh-TW/c/stage8-english-only`, `/zh/c/stage8-english-only`
→ 302 to `/zh-TW/challenge/stage8-english-only/`, which is 404; `/en/challenges` 404. Served HTML
(`curl -s`): `/zh-TW/challenges` holds one `data-locale-mark` (`只有英文`, list view) and
`wxl.browserlab.online/zh-TW/c/999`; `/zh-TW/` one `data-locale-mark` (`只有英文`); `/challenges`
and `/` none, `/challenges` shows `wxl.browserlab.online/en/c/999`; no page holds
`data-missing-translation` (L7).

| Row | Stored | Surface | Result |
|---|---|---|---|
| V1a | none; `zh-TW` | built-in browser, 1024 wide, Browser panel open | pass: a cold load of `/challenge/stage8-english-only/` stays (A2) and shows the line `lang="zh-TW"`, "這一頁沒有繁體中文版本，所以顯示英文版。前往繁體中文題目清單", link `/zh-TW/challenges` (L2); the line is 1024 px wide at y 40–78, its previous sibling `.merged-nav`, visible with the description open and after "Collapse description" (L3; no runtime-reset banner was showing); stored unchanged |
| V1b | `en` | Playwright | pass: A4, no line, stored `en` |
| V1c | none; `zh-TW`; `en` | Playwright | pass, all six: `/zh-TW/c/stage8-english-only` and, in a new context, `/zh/c/stage8-english-only` land on `/challenge/stage8-english-only/` (C1, `history.length` 2: replaced) with the line `zh-TW`; stored unchanged in each (C5) |
| V1d | none; `en` | Playwright | pass, all eight: the four short links land on the English page; none → the line `zh-TW` (A2); `en` → no line (A4); stored unchanged |
| V1e | `en` | Playwright | pass: `/zh/c/001` and `/zh-TW/c/001` land on `/zh-TW/challenge/door-is-open/`, no line (A5), stored becomes `zh-TW` (W2) |
| V1f | none; `en` | Playwright | pass: none → `/c/001` and `/en/c/001` redirect to `/zh-TW/challenge/door-is-open/` (A1), stored stays empty; `en` → stay on `/challenge/door-is-open/` (A4) |
| V1g | `zh-TW` | Playwright | pass: `/zh-TW/challenges` list view — the fixture's row links `/challenge/stage8-english-only/`, mark `只有英文`, title and summary `lang="en"`, copy control `wxl.browserlab.online/zh-TW/c/999` labelled `複製連結` (F3, F10); clicking it shows `已複製` and the clipboard holds `https://wxl.browserlab.online/zh-TW/c/999`; grid view — the same mark and `lang`; one mark on the page in each view (E2, E6). `/zh-TW/`: one latest card with `只有英文`, linking the English page; `data-stat` total 5 = the four committed challenges plus #999 (E6, E7) |
| V1h | `zh-TW` | Playwright | pass: clicking the fixture in `/zh-TW/challenges` lands on the English page with the line `zh-TW` (L5), stored still `zh-TW` (W5); the line's link opens `/zh-TW/challenges` |
| V1i | none | built-in browser, new tab, Browser panel open | pass: with the fixture's stored records (IndexedDB `challenge-tools`) from V1a, a cold load shows the session gate and no line; after "Continue with this work" the line `zh-TW` appears (A6, L1); stored stays empty |
| V1j | `en` | Playwright | pass: `/challenges`, then in the same tab `/zh-TW/c/stage8-english-only` → the English page with the line `zh-TW`, `history.length` 3 (C1 replaced the 404); Back → `/challenges` (C7); stored `en` throughout (W5); Forward → the English page with no line (L5/L6: the carry is gone) |
| V1k | none | Playwright | pass: `/en/challenges` is the not-found page with no line (C3) |
| V1l | `en` | built-in browser, 375×812 emulated, Browser panel open | pass: no line on the cold load (A4); 繁體中文 (labelled "Traditional Chinese") keeps the URL and `history.length`, shows the line (375 px wide, 63 px high) and stores `zh-TW` (B2); the menu then offers Traditional Chinese and English; English removes the line and stores `en` (B5). With the line shown, collapsing and reopening the description, the Browser panel (the fixture's app rendered full width when collapsed) and the Code tab ("Loading Python environment…") all work (D15) |
| V2 | as below | built-in browser, `https://cxphoenix.github.io/wxl-e2e-0008-t0057/` | pass: none → `/wxl-e2e-0008-t0057/challenge/stage8-english-only/` stays with the line `zh-TW`, link `/wxl-e2e-0008-t0057/zh-TW/challenges` (A2, A7); none → `/wxl-e2e-0008-t0057/zh-TW/challenge/stage8-english-only/` is served 404 by GitHub Pages and lands on the English page, the line appearing after the session gate's "Continue" (C1, C4, C6, A6), stored still empty; `/wxl-e2e-0008-t0057/zh-TW/challenges` (page mode) shows #999 with `只有英文`, `lang="en"` and the copy control `cxphoenix.github.io/wxl-e2e-0008-t0057/challenge/stage8-english-only/` (F6); stored `en`, the reference page: 繁體中文 stays (`history.length` unchanged) with the line `zh-TW` linking `/wxl-e2e-0008-t0057/zh-TW/challenges`, English removes it (B2, B3, B5); stored `en`, `/wxl-e2e-0008-t0057/challenges`: 繁體中文 pushes `/wxl-e2e-0008-t0057/zh-TW/challenges` (B1, B3) |
| V3 | `en`; `zh-TW` for B7 | Playwright | pass: `v3-switch.cjs` — at 1280, 1024 and 375 a cold load of the reference page has no line (A4); the menu offers one option, Traditional Chinese; choosing it keeps the URL and `history.length`, shows the line `zh-TW`, stores `zh-TW` (B2); the menu then offers two; English removes the line and stores `en` (B5). `/zh-TW/no-such-page`: the not-found page, the menu offers English, choosing it stays, no line, stores `en` (B7). `v3-menus.cjs` — the custom switcher is visible in all six runs; `.VPNavBarTranslations` (1280) and `.VPNavBarExtra .translations` (1024) are `display: none` with scripts disabled and hydrated; `.VPNavScreenTranslations` (375) is absent from the served HTML and `display: none` hydrated (B4) |

The temporary range: `CREATE_WXL_COMMIT=1532eeaf28e49f70dedc492253203b5fd57d73ad npx -y create-wxl@3.0.0 range --author CXPhoenix --repo CXPhoenix/wxl-e2e-0008-t0057 --host github-pages --site-name …`,
pushed to the public repository `CXPhoenix/wxl-e2e-0008-t0057` (commit `7206c84`; workflow "Deploy"
run 42079017661: success); `curl`: `/zh-TW/challenge/stage8-english-only/` 404,
`/zh-TW/reference/attack-log-export-format` 404, the English pages 200.

Seen in passing, outside this ticket: on `/zh-TW/challenges` the list's controls that use the
runtime `$t` — the search placeholder, the sort-direction and view-mode titles — read in English
after hydration, with the stored value empty or `zh-TW` (`zh-ui.cjs`); the same on
`https://wxl.browserlab.online` (`main`) and on `stage8-t-0056`, so it predates this ticket. Left for
the user.

Cleanup, under the same authorization: `cxphoenix.github.io` and the preview origin's
`localStorage`, `sessionStorage` and IndexedDB (`challenge-tools`) cleared and checked empty;
`git push origin --delete stage8/T-0057` and the local branch deleted; deployment `80e6588c` stays
(not deletable from here). The viewport emulation was reset. The repository
`CXPhoenix/wxl-e2e-0008-t0057` is the user's to delete (this session's token has no `delete_repo`
scope).

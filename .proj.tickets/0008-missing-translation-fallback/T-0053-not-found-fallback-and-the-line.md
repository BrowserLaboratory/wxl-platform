---
id: T-0053
title: A not-found translation path falls back to the page that exists, with the missing-translation line
epic: 0008-missing-translation-fallback
status: review
blocked_by: []
---

## Context

Epic 0008 stops the site from sending a learner to a translation that does not exist (OQ-023). On
2026-11-04 the production site showed the defect on its English-only reference page: a cold load of
`/zh-TW/reference/attack-log-export-format`, whether reached by the cold-load redirect or by the locale
menu, ends on the not-found page. This ticket is the first tracer bullet: it builds the page list the
rest of the epic decides from, classifies every arrival, rescues a not-found path whose counterpart
exists, and renders the missing-translation line ("the line").

Spec: `.proj.specs/0008-missing-translation-fallback/spec.en.md` revision 3, "Page list",
"Classifying an arrival", "Locale routing" (the not-found bullet), "The line"; `traceability.md`
revision 3, decisions D1, D3, D8, D10, D11, D15, D16, D17, seams 0008-S2, S1 (classification and
not-found decisions), S3, the lookup algorithm, the canonical sentences, and rows P, C and L.

This is the first ticket to land, so its PR also carries the spec directory, the ticket files,
`docs/adr/0008-locale-folders-primary-chosen-at-build.md`, and the uncommitted `GLOSSARY.md` changes
from stages 1–3 (H6), as epic 0007's first ticket did.

## Deliverable

The build ships a list of published pages. Every arrival is classified from what the router rendered.
A not-found path whose counterpart is a published page is replaced by that page, once, after the
session gate's decision; the page it lands on shows the line in the locale the path named, with a link
to that locale's challenge list. A not-found path with no counterpart, a crafted path, a malformed
encoding and a failed load all show the not-found page, with no line and no error. The line component
is placed on challenge pages and default-theme pages and is ready for the cold-load and switcher
decisions of T-0054 and T-0055 to drive it.

## Acceptance criteria

- [x] P1–P5, P7: the page list equals the oracle for a fixture tree and the real tree; non-pages and the not-found page are absent; every lookup-table input gives its stated result without throwing; source paths, including alias URLs, map to their entry; `pnpm dev` after a restart (AC-1)
- [x] C1–C11: not-found arrivals replaced by the matching list entry once, with query and hash kept and the line in the path's locale; C3 for no match and every crafted path, same-origin; C8 failed load; cold load and client-side navigation; gate ordering; no preference written; Back (AC-4)
- [x] L1–L9: when the line shows, its exact sentence, link text and target, `lang`, placement below `MergedNav` and above the runtime-reset banner on challenge pages and in `doc-before` / `page-top` / `home-hero-before` on default-theme pages, re-evaluation, carried requested locale, hash-only navigation, no close control, absent from static HTML (AC-5). The cold-load and switcher triggers of L1 are exercised again in T-0054 and T-0055.
- [x] H3 (this ticket's part): a new troubleshooting entry, both languages, listed in the symptom index, describing the line as not an error and stating P6 (AC-9)
- [x] H4 (this ticket's part): OQ-017 records D12 (AC-9)
- [x] H6: the `GLOSSARY.md` changes land with this ticket (AC-9)
- [x] H7: no changed document in the glossary's corpus uses 主語系 (AC-9)
- [x] W5 (moved here from T-0054 by U12, 2026-11-05): the route watcher sets the interface locale and writes no stored preference on any client-side navigation (AC-11)
- [x] D7 (moved here from T-0055 by U14, 2026-11-05): every page uses `LocaleSwitcher`, `USE_CUSTOM_LOCALE_SWITCHER` is removed, and VitePress's three built-in translation menus are hidden by a rule that needs no script (B4's hiding half; AC-3)
- [x] Overridden contracts touched here change only as the traceability table states
- [x] Stage 8 (T4): V1c and V1k on the Cloudflare preview of `stage8/T-0053`; the GitHub Pages 404 part of V2 on a temporary GitHub Pages range; D12's approvals asked before each push, creation and deletion (AC-10)

## 給使用者（zh-TW）

這張票做 epic 的第一條完整路徑：建置時產生頁面清單，並在直接打開一個不存在的翻譯網址時（例如 `/zh-TW/reference/attack-log-export-format`），改把學生送到存在的那一頁，在頁面上方顯示「這一頁沒有繁體中文版本，所以顯示英文版。」與「前往繁體中文題目清單」連結。構造過的網址、格式錯誤的編碼、兩邊都不存在的路徑，照樣顯示找不到頁面，不會出錯。這張票先落地，所以它的 PR 會一併帶上 spec、ticket、ADR-0008 與 GLOSSARY 的改動。

## Comments

### 2026-11-04 — test plan (stage 5)

Read for this plan: this ticket; `spec.en.md` and `traceability.md` revision 3; and, at `5d3c173`,
`.vitepress/config.mts`, `.vitepress/theme/index.ts`, `.vitepress/theme/i18n/index.ts`,
`.vitepress/theme/layouts/ChallengeLayout.vue` (the bar region), VitePress 2.0.0-alpha.16's
`VPContent.vue` (`page.isNotFound`), `tests/unit/i18n/{initial-locale-redirect,theme-locale-wiring,messages-shape}.test.ts`,
`tests/unit/site/{config-base,challenge-data-loaders}.test.ts`, `tests/unit/layouts/ChallengeLayout.test.ts`,
`playwright.site.config.ts`.

Working names, not fixed by the spec: the page list is built in `config.mts` from the source tree
and handed to the client as a `vite.define` constant (`__WXL_PAGES__`), like `__WXL_SHORT_LINKS__`;
the pure functions live in a new `.vitepress/theme/i18n/pages.ts` (`pageListFromSourceFiles`,
`entryForSourcePath`, `lookupNotFound`) and `.vitepress/theme/i18n/arrival.ts` (`classifyArrival`,
`notFoundRedirect`, `lineLocale`, the arrival store); the line is `MissingTranslationLine.vue`.
A content loader is not used because a loader cannot be imported under vitest
(`challenge-data-loaders.test.ts` says so), and the define constant can be: `config-base.test.ts`
already imports `config.mts` fresh and reads `vite.define`.

Scope notes:
- C5 here is met by two narrow changes: `shouldPersistOnColdLoad` returns false for a `/zh-TW/` path
  that is not a published page (the page list is passed to it), and the route watcher does not write
  on a redirect S1 itself makes. The general rules — the watcher never writes, W2 decided after the
  router resolves — are T-0054's.
- With this ticket alone, today's cold-load redirect still sends an unprefixed English-only page to
  its missing `/zh-TW/` counterpart; C1 then replaces it back, with the line. So the 404 already
  disappears here; T-0054 removes the detour (A2).
- L1's cold-load and switcher triggers, and L5 with the watcher still writing, are tested here at the
  pure decision (`lineLocale`); their wiring is T-0054's and T-0055's.
- V1c can use only `/zh/c/<slug>` here; the `/zh-TW/c/` rules arrive with T-0056.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0008-S2 | a source file maps to its page-list entry by the spelling rule | new `tests/unit/i18n/page-list.test.ts`, pure `pageListFromSourceFiles` and `entryForSourcePath` | P1, P2, P7 — AC-1 | literal expectations: `index.md` → `/`; `guide/index.md` → `/guide/`; `challenge/x/index.md` → `/challenge/x/`; `challenges.md` → `/challenges`; `guide/python.md` → `/guide/python`; `zh-TW/index.md` → `/zh-TW/`; `zh-TW/challenges.md` → `/zh-TW/challenges`; `public/a.md` and `shared/b.md` excluded; the not-found page never present |
| 0008-S2 | the real tree's list equals the oracle | same file; `config.mts` imported fresh (the `config-base.test.ts` pattern) and `vite.define.__WXL_PAGES__` parsed; the oracle built in the test by its own recursive `readdirSync` over `platform/` and the literal rule of the row above | P1, P2, P5 — AC-1 | set equality, each entry once; no `/404`; a fixture page written into a temporary copy of the tree appears after a fresh import, and disappears after removal (P5's "after a restart") |
| 0008-S2 | the not-found lookup algorithm | same file, `lookupNotFound(pathname, base, pages)` returning the matching counterpart entry or none | P3, P4, C10 — AC-1, AC-4 | every row of the traceability's lookup table, with the fixture list holding `/challenge/v05-php-check/` and `/reference/attack-log-export-format` but not their `/zh-TW/` versions; base `/` and `/repo/`; `/zh-TW/%E0%A4%A` returns none without throwing; `//`, `\`, `..`, `%2F%2F` return none |
| 0008-S2 (built site) | the spelling rule matches what VitePress publishes | new case in `tests/site-smoke/site-smoke.spec.ts` reading `.vitepress/dist` with `fs` | P1 — AC-1 | every `*.md` of the oracle has its `.html` in `dist` and every `.html` except `404.html` has its `*.md`; mapping written in the test (`guide/index.html` ↔ `/guide/`, `challenges.html` ↔ `/challenges`) |
| 0008-S1 | an arrival is classified from what the router rendered | new `tests/unit/i18n/arrival.test.ts`, `classifyArrival` | D11, C8 — AC-4 | rendered page → page arrival with its entry; not-found with a path not in the list → not-found arrival; not-found with a path in the list → failed load |
| 0008-S1 | the not-found decision | same file, `notFoundRedirect` | C1, C2, C3, C6, C9, C10 — AC-4 | `/zh-TW/reference/attack-log-export-format` → `/reference/attack-log-export-format`, requested `zh-TW`; a `/zh-TW/`-only fixture page reached unprefixed → its `/zh-TW/` entry, requested `en`; neither → none; base `/repo/` kept; `?q=1#h` kept; the target is always a list entry (a crafted path yields none); a redirect whose landing is itself not-found yields no second redirect |
| 0008-S1 | a cold load of a `/zh-TW/` path that is not a published page does not write | `tests/unit/i18n/initial-locale-redirect.test.ts`, `shouldPersistOnColdLoad` with the page list (overridden contract) | C5 — AC-4 | `/zh-TW/no-such-page` → false; `/zh-TW/challenges` → true as today; `/zh-TW/%E0%A4%A` → false without throwing; unprefixed → false as today; base `/repo/` |
| 0008-S1 | when the line shows, and in which locale | `arrival.test.ts`, `lineLocale` | L1, L5 — AC-5 | requested ≠ page locale and counterpart not in the list → requested; counterpart in the list → none; requested = page locale → none; not-found or failed load → none; arrival not yet released by the gate → none; both directions |
| 0008-S1 | the carried requested locale | `arrival.test.ts`, the arrival store | L6, L8 — AC-5 | a carried value applies to its redirect's target only; it is discarded at the next arrival whether used or not, and when the landing is not-found; a navigation that changes only the hash or the query is not an arrival |
| 0008-S3 | the line's text, link and `lang` | new `tests/unit/components/MissingTranslationLine.test.ts` | L2, L9 — AC-5 | requested `zh-TW`: sentence `這一頁沒有繁體中文版本，所以顯示英文版。`, link text `前往繁體中文題目清單`, href `/zh-TW/challenges`; requested `en`: the English sentence and link, href `/challenges`; with base `/repo/` both hrefs carry it; `lang` exactly `zh-TW` / `en`; rendered in the requested locale while the runtime locale is the other; no button or close control |
| 0008-S3 | message keys | existing `tests/unit/i18n/messages-shape.test.ts` | L2 — AC-5 | the two new keys exist in both message files with the shape the test already checks |
| 0008-S3 | placement on a challenge page | `tests/unit/layouts/ChallengeLayout.test.ts` | L3 — AC-5 | the line's root follows `MergedNav` and precedes `[data-runtime-reset]` in document order; present with the description panel open and collapsed |
| 0008-S3 | placement on default-theme pages | the real Layout mounted as in `theme-locale-wiring.test.ts`, `DefaultTheme.Layout` mocked to render its named slots | L4 — AC-5 | the line is passed in `doc-before`, `page-top` and `home-hero-before`; the challenge branch does not use these slots |
| 0008-S1 wiring | the Layout performs the not-found decision | the real Layout mounted as in `theme-locale-wiring.test.ts`, with `page.isNotFound` and `__WXL_PAGES__` controlled | C1, C2, C4 (client side), C5, C7, C8, C11, L1, L6 — AC-4, AC-5 | a not-found route whose counterpart exists → `router.go(target, { replace: true })` once, only after the gate's decision on a page that asks and at once on one that does not; then the line in the path's locale; the route watcher's write does not run for that redirect; a client-side navigation to such a route does the same; a failed load → no `router.go`, no line |
| 0008-S7 (built site) | cold load of a missing translation on the production bundle | new cases in `tests/site-smoke/site-smoke.spec.ts` against `pnpm docs:build` + `vitepress preview`, stored value set per case | C4 (cold load), C5, C7, L7 — AC-4, AC-5 | `/zh-TW/reference/attack-log-export-format` with stored none, `zh-TW`, `en` → ends at `/reference/attack-log-export-format` with the line in `zh-TW` and its link; stored value unchanged; `/zh-TW/no-such-page` → the not-found page, no line; served HTML of the reference page contains no line; Back after the rescue returns to the page opened before it |
| stage 6 diff check (not automated) | documents | `git diff` against the branch's base | H3 (new troubleshooting entry and symptom index, both languages), H4 (OQ-017 records D12), H6, H7 — AC-9 | no changed document in the glossary's corpus uses 主語系 |
| stage 8 (not automated) | the rescue on real hosts | V1c (`/zh/c/<slug>` only) and V1k on the Cloudflare preview of `stage8/T-0053`; the GitHub Pages 404 part of V2 on a temporary range; approvals per D12 | AC-10 | `/agent-browser` or the host's browser tools; challenge pages with the Browser panel open |

Regression gate for every cycle: `pnpm test --run` (baseline on `5d3c173`, run with `npx vitest run`:
131 files, 4559 passed, 1 skipped), and for the built-site rows `pnpm docs:build && pnpm test:smoke`.

Approval: the user approved this test plan on 2026-11-04 ("核准計畫表").

### 2026-11-04 — coverage report (stage 5)

Branch `tickets/T-0053/not-found-fallback-and-the-line`, working tree on `5d3c173`, not yet
committed. Unit suite: `npx vitest run` → 135 files, 4625 passed, 1 skipped (baseline 131 files,
4559 passed). Built-site rows: `pnpm docs:build && npx playwright test --config playwright.site.config.ts tests/site-smoke/missing-translation.spec.ts`
→ 7 passed. Coverage is not measured: the project has no coverage tool installed (OQ-009), so the
"Measured coverage" column names the tests that exercise each row instead of a percentage.

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0008-S2 | `tests/unit/i18n/page-list.test.ts`: `entryForSourcePath` (9 cases), `pageListFromDir` (2), the shipped list against an independent oracle (1), the lookup (20) | not measured (OQ-009); every lookup-table row and every spelling of the plan has a literal case | P1–P5, P7, C10 — AC-1, AC-4 | P5 "under `pnpm dev` after a restart" is shown by re-reading the tree (`pageListFromDir`), not by restarting a dev server |
| 0008-S2 (built site) | `tests/site-smoke/missing-translation.spec.ts`, "the page list spelling matches the pages VitePress published" | the 27 pages at `5d3c173` | P1 — AC-1 | — |
| 0008-S1 | `tests/unit/i18n/arrival.test.ts`: `classifyArrival` (3), `notFoundRedirect` (7), `lineLocale` (4), the carry (3), `isArrival` (1) | not measured | D11, C1–C3, C6, C8–C10, L1, L5, L6, L8 — AC-4, AC-5 | L1's cold-load and switcher triggers are wired in T-0054 and T-0055 |
| 0008-S1 | `tests/unit/i18n/initial-locale-redirect.test.ts`, `shouldPersistOnColdLoad` with the page list (4 new or changed cases) | not measured | C5 — AC-4 | the general W rules are T-0054's |
| 0008-S1 wiring | `tests/unit/i18n/not-found-wiring.test.ts` (8); `theme-locale-wiring.test.ts` given the page list it now needs (overridden contract) | not measured | C1, C4 (client side), C5, C7, C8, C11, L1, L4, L6 — AC-4, AC-5 | — |
| 0008-S3 | `tests/unit/components/MissingTranslationLine.test.ts` (4); `messages-shape.test.ts` (existing, now covering the two keys); `tests/unit/layouts/ChallengeLayout.test.ts` (3 new) | not measured | L2, L3, L9 — AC-5 | — |
| 0008-S7 (built site) | `tests/site-smoke/missing-translation.spec.ts` (6 more) | stored none, `zh-TW`, `en` | C4 (cold load), C5, C7, L7 — AC-4, AC-5 | these were written after the implementation they check, so they were not seen red; the unit rows above were |
| documents | `platform/guide/troubleshooting.md` and its Traditional Chinese twin (new entry and symptom-index row); `OPEN-QUESTIONS.md` OQ-017; `GLOSSARY.md` | stage 6 diff check | H3, H4, H6, H7 — AC-9 | the new Traditional Chinese entry uses 文章, so the glossary's `_新造詞_` line for 文章 was removed, as `glossary.test.ts` requires once a coined term is in use |
| type check | `npx vue-tsc --noEmit -p tsconfig.json` | 107 errors in the whole tree; the two in files this ticket touched are pre-existing patterns (`DefaultTheme.enhanceApp?.({ app })`, unchanged from `5d3c173`; the `.mts` import, as in `config-base.test.ts`) | — | vue-tsc is not part of CI (OQ-011) |
| stage 8 | — | — | V1c, V1k, V2 (part) — AC-10 | not run yet |

### 2026-11-05 — stage 6 review and its disposition

Two independent `harness-reviewer` passes on the working tree at `5d3c173` (packet: manifest,
`git diff HEAD`, copies of every new file): Standards (34 findings: 5 medium, 29 low) and Spec
(17 findings: 1 high, 2 medium, 14 low). Spec F1 was reproduced on the built site before any fix:
a cold load of `/reference/attack-log-export-format` with `wxl-locale = zh-TW` ended with `en`
stored (the cold-load redirect's detour through the missing `/zh-TW/` page, then the not-found
redirect back; a single-shot "own redirect" flag was consumed on the detour). The user decided
(2026-11-05, "都照建議"):

- **U12.** W5 moves from T-0054 to this ticket: the Layout's route watcher sets the interface locale
  and never writes the stored preference. This removes the flag and fixes Spec F1, F2, F4.
- **U13.** The arrival wiring moves out of the Layout into `.vitepress/theme/composables/useArrivals.ts`
  (Standards F29), with no change of behaviour beyond the fixes below.

| Finding | Disposition |
|---|---|
| Spec F1, F2, F4; Std F4, F6 | Fixed by U12. `redirectingInPlace` and `notFoundPending` are gone; the watcher's comment says what it does now. Regression: `missing-translation.spec.ts` "the detour … keeps the stored language" (red before, green after), and `theme-locale-wiring.test.ts` "writes no preference" (mutation-checked: putting `persistLocale` back turns all three cases red). |
| Spec F3 | Fixed: the line waits while the landing page's gate is asking (`holdLine`). Test: `not-found-wiring.test.ts` "on a challenge page whose gate is asking…" (mutation-checked). |
| Spec F5 | Fixed: a counterpart must be in the other locale (`lookupNotFound`). Test: `page-list.test.ts` "a doubled prefix" (mutation-checked). |
| Spec F6 | The early wiring of L5 and the cold-load L1 is recorded here as intended; the line no longer shows on a page that is being redirected away from. Test: "shows no line on a page it is about to redirect away from" (mutation-checked). |
| Spec F7 | Left to T-0054 (W2 decided after the router resolves), as planned. |
| Spec F8; Std F13, F33 | `pageListFromDir` skips `dist` and `node_modules` at any depth; `config.mts` names the source directory once (`SRC_DIR`). `pageList.ts` stays beside `config.mts`, its only caller. |
| Spec F9, F10; Std F1, F2, F3, F19, F20, F21 | Both troubleshooting entries rewritten: 「語系」 throughout, both directions, the address-bar sentence limited to the case where it is true, 「只有英文版的題目」; index rows put in section order. `GLOSSARY.md`'s locale definition no longer uses 「語言版本」. |
| Spec F11; Std F17 | Accepted: H6 lands the glossary with this ticket by design; `/zh-TW/c/` arrives with T-0056. |
| Spec F12; Std F24 | Accepted: `ChallengeLayout.test.ts` only gains tests, and the approved test plan names it. |
| Spec F13 | Added: C9 (`arrival.test.ts`), the client-side navigation's line and storage (`not-found-wiring.test.ts`). |
| Spec F14–F17; Std F7, F8, F9, F10, F11, F12, F15, F16, F25, F26, F27, F30, F31, F32, F34 | Fixed: dead state removed; `inject` after the imports; duplicate imports merged; the new watcher states `flush: 'pre'`; `env.d.ts` documents `__WXL_PAGES__` like its neighbour; `arrival.ts`'s module comment, long line and `base` field; the lookup algorithm is documented where it is implemented (`pages.ts`), and `candidates`/`match` are `pathCandidates`/`firstListedEntry`; the SSR and `enhanceApp` comments; `withoutBase`, `targetPath`, `otherLocale` replace the repeated base-stripping and locale-toggling the change added; the line uses `localizePath`; the test double gains `page` and the Layout no longer guards for its absence; the smoke test's magic numbers; the static `computed` import; the misplaced `redirectTargetForStoredLocale` JSDoc. OQ-017 now says the fixture commit uses `/tw-emoji-commit`. |
| Std F23 | Added: "sits above the runtime-reset banner when both show" (`ChallengeLayout.test.ts`). |
| Std F5 | Fixed: status `review`, met criteria checked. |
| Std F14 | Kept: the line also renders on default-theme pages, whose palette is `--vp-c-*` (aliased to `--ch-*`). |
| Std F18 | Kept: G2 is not enforced for articles, so a Traditional Chinese-only article can exist and the English sentence is the spec's canonical one. |
| Std F22 | Kept: `glossary.test.ts` requires the coinage line to go once the term is in use. |
| Std F28 | Kept: the parameter groups follow each function's callers; no change of behaviour would follow. |

Checks after the fixes, working tree on `5d3c173`: `npx vitest run` → 135 files, 4628 passed,
1 skipped; `pnpm docs:build` → complete; `npx playwright test --config playwright.site.config.ts`
→ 70 passed (the whole site-smoke suite, `missing-translation.spec.ts` included); `npx vue-tsc
--noEmit -p tsconfig.json` → 107 errors, the same count as before, the two in this ticket's files
being the pre-existing patterns named in the coverage report.

### 2026-11-05 — stage 7 security review and its disposition

Report: `.proj.specs/0008-missing-translation-fallback/review/security-T-0053.md`. One candidate pass
and two independent false-positive passes (`harness-reviewer`): six candidates, none a
vulnerability. The user decided (2026-11-05, "都照建議"):

- **U14 (S-3).** D7 moves here from T-0055, so `main` never has a window in which a locale chosen
  with VitePress's built-in menu is not stored: every page now uses `LocaleSwitcher`, which stores
  the choice (W1), and the built-in menus are hidden by `style.css` with no runtime class. The flag
  is removed rather than flipped. B1–B3 and B5–B7 (the switcher staying on a page without a
  translation, its two-option menu) stay T-0055's; until then a choice with no counterpart goes to
  the not-found page and C1 brings the learner back with the line.
- **U15 (S-1).** `pageListFromDir` skips dot-prefixed files as well as directories; the oracle in
  the traceability (revision 3.1), `page-list.test.ts` and `missing-translation.spec.ts` says the same.
- **U16 (S-4b).** A not-found arrival reached while the previous page's gate is asking is replaced
  at once when the not-found page itself is not held (`useArrivals`).

S-2 and S-5 stay with T-0054; S-4 and S-6 are recorded only.

Tests: `page-list.test.ts` (dot-prefixed file and directory in the fixture; red before the
change); `not-found-wiring.test.ts` "puts the custom locale switcher in the default-theme nav bar"
(written after the change) and "replaces a missing translation reached by a link, since the
not-found page does not ask" (red before); `missing-translation.spec.ts` — the built-in menus at
1280, 1024 (the "…" menu opened) and 375 (the mobile screen opened) and in the HTML as served, each
asserting the list exists and has `display: none`, mutation-checked by building without the rule
(all four red); a choice in the custom switcher on an article is stored.

Checks, working tree on `5d3c173`: `npx vitest run` → 135 files, 4630 passed, 1 skipped; `pnpm
docs:build` → complete; `npx playwright test --config playwright.site.config.ts` → 75 passed;
`npx vue-tsc --noEmit -p tsconfig.json` → 107 errors, unchanged, the two in this ticket's files being
the pre-existing patterns.

### 2026-11-05 — stage 8

Surfaces, per D12 (the user approved each outward action on 2026-11-05): the throwaway branch
`stage8/T-0053` = this ticket's `5e926bc` plus fixture commit `41b9dc7` (made with
`/tw-emoji-commit`: `pnpm create:challenge --name stage8-english-only --backend fastapi`, number
changed from the assigned 11 to 999, `_redirects` regenerated; English brief only). Driven in the
host's built-in browser; the challenge page was checked with its Browser panel open.

**V1 — Cloudflare Pages preview** `https://stage8-t-0053.wxl-platform.pages.dev` (deployment
`f5d8aafe`, check run "Cloudflare Pages" on `41b9dc7`: success). `curl -s -o /dev/null -w
'%{http_code} %{redirect_url}'` on the preview host: `/zh/c/stage8-english-only` → 302
`/zh-TW/challenge/stage8-english-only/`; `/c/999` → 302 `/challenge/stage8-english-only/`;
`/zh-TW/challenge/stage8-english-only/` → 404; `/challenge/stage8-english-only/` → 200;
`/en/challenges` → 404.

| Row | Stored value | Result |
|---|---|---|
| V1c: `/zh/c/stage8-english-only` | none | pass: ends at `/challenge/stage8-english-only/`; the line `lang="zh-TW"`, 「這一頁沒有繁體中文版本，所以顯示英文版。」, link 「前往繁體中文題目清單」 → `/zh-TW/challenges`; stored value still none |
| V1c | `zh-TW` | pass: same landing and line; stored still `zh-TW` |
| V1c | `en` | pass: same landing, line in `zh-TW` (the path named it); stored still `en` |
| V1c: Browser panel | — | pass: the line sits directly below the nav, the Browser panel loads the fixture's app |
| V1k: `/en/challenges` | none | pass: served 404, 「PAGE NOT FOUND」, no line; stored still none |
| Spec F1 detour: `/reference/attack-log-export-format` | `zh-TW` | pass: ends on the English page with the line in `zh-TW`, stored still `zh-TW`; the custom switcher is present and `.VPNavBarTranslations` computes `display: none` |

`/zh-TW/c/` rules arrive with T-0056, so V1c used `/zh/c/` only, as the test plan said.

**V2 (GitHub Pages part) — temporary range** `CXPhoenix/wxl-e2e-0008-t0053`:
`CREATE_WXL_COMMIT=41b9dc7ee82333f570c2ace5823239c4ed9af3bb npx -y create-wxl@3.0.0 range --author
CXPhoenix --repo CXPhoenix/wxl-e2e-0008-t0053 --host github-pages --site-name "WXL e2e 0008 T-0053"
--lang en` → one commit `66dbc5c`, `range.json` naming `41b9dc7…`, `SITE_ORIGIN =
"https://cxphoenix.github.io/wxl-e2e-0008-t0053"`; then `gh repo create … --public`, `git push -u
origin main`, `POST repos/CXPhoenix/wxl-e2e-0008-t0053/pages build_type=workflow` (Actions enabled:
`true`), `gh workflow run deploy.yml` → run `41883505209` success. `curl`:
`/wxl-e2e-0008-t0053/zh-TW/challenge/stage8-english-only/` → 404.

| Row | Stored value | Result |
|---|---|---|
| C4, C6: cold load of `/wxl-e2e-0008-t0053/zh-TW/challenge/stage8-english-only/` (GitHub Pages' 404 page) | none | pass: ends at `/wxl-e2e-0008-t0053/challenge/stage8-english-only/` with the line in `zh-TW`, its link `/wxl-e2e-0008-t0053/zh-TW/challenges`; stored still none |
| same, opened from `/wxl-e2e-0008-t0053/challenges` | `en` | pass: same landing and line; stored still `en`; Back returns to `/wxl-e2e-0008-t0053/challenges` (C7) |

The `cxphoenix.github.io` origin held no stored value before (OQ-018: shared by the owner's ranges);
it was left empty afterwards.

Pending, each with the user's approval (D12): delete the `stage8/T-0053` branch on `origin` (its
preview alias goes with it), and delete `CXPhoenix/wxl-e2e-0008-t0053`.

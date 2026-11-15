---
id: T-0076
title: Pure modules and the layout-move planner
epic: 0010-primary-locale-layout
status: todo
blocked_by: []
---

## Context

Epic 0010 puts every page in a locale folder and lets the setup record (`range.json`) choose the
primary locale. The layout switch has to land as one ticket (T-0077, constraint T1), so the pure
pieces it builds on land first, unused, with their unit rows (T2, T3). Nothing in the site, the
scripts, the pre-commit hook or the upgrade imports them until T-0077; `main` behaves exactly as
before after this ticket lands.

The modules:

- **The locale list module** (D4, D115): `LOCALES` (`['en', 'zh-TW']`), the `Locale` type,
  `DEFAULT_PRIMARY_LOCALE` (`'zh-TW'`), `isKnownLocale` and `LOCALE_ENGLISH_NAMES`. Import-free, so
  Node's `--experimental-strip-types` and the VitePress configuration can both load it.
- **Primary locale** (seam 0010-S1; D2, D3, D114): `parsePrimaryLocale(text | undefined)` and
  `readPrimaryLocale(path)`, throwing PL-E01–PL-E06 with the canonical first lines, values quoted as
  D140 states (the quoting function's table test, B95, is T-0077's, because it also covers
  PL-E07–PL-E12).
- **The page predicate** (seam 0010-S2; D116): `classifySourcePath(sourcePath, primary)`.
  `checkSourceLayout` is T-0077's. No row names `classifySourcePath` alone: B20–B28 reach it through
  `checkSourceLayout`, and U136 compares it with create-wxl's `isLegacyPage` in the switch ticket
  (T2). This ticket's test plan may test it over U11's and B21–B28's paths as working tests; they
  claim no row.
- **The challenge declaration and the brief schema** (seams 0010-S31, 0010-S32; D73–D75, D129):
  `validateChallengeDeclaration`, `validateChallengeBrief`, `BRIEF_KEYS` and
  `readChallengeDeclaration(root, slug)`. `validateChallengeConfig` and its callers stay as they
  are; T-0077 moves the callers over and removes it (expand, then contract).
- **The transform** (seam 0010-S45; D95, D97–D99, D104, D110, D112): `planLayoutMove({ files })` in
  `create-wxl/src/layout-move.mjs`, no I/O, with create-wxl's literal copy of the locale list and
  `isLegacyPage`. T-0077 runs it on upstream's own tree (D108); T-0081 runs it inside the upgrade.

**Claim rule.** This ticket claims a row only when every seam the row names is one of these pure
functions. A row that also names the validation CLI (0010-S34), assembly (0010-S33), keygen or the
upgrade run (0010-S44) is T-0077's or T-0081's, even when its pure half could be tested here
(`tickets.md`, "Claim rules").

**Decisions to confirm before implementing** (workflow, "Standing authorization"): D97, D98, D99,
D114, D115, D116, D129, D140.

Spec: `spec.en.md` revision 2, "Implementation Decisions", AC-1, AC-2, AC-35, AC-44–AC-47;
`traceability.md` revision 2, constraints T2 and T3, seams 0010-S1, S2, S31, S32, S45, "Schema:
`range.json`", "Build error codes" (PL-E01–PL-E06), Y-§2.1–Y-§2.4, U-§1, U-§4 "Split checks"; the
claim table in `tickets.md`.

## Deliverable

The locale list module, the primary-locale reader, the page predicate, the declaration and brief
functions and `planLayoutMove` exist with their unit tests. No file outside the tests imports any of
them; every existing suite passes unchanged, and the built site, the hook and the upgrade behave as
on the previous commit.

## Acceptance criteria

- [ ] B1–B13: `readPrimaryLocale` for an absent file, an object without an own `primaryLocale`,
  `en`, `zh-TW`, a non-regular file (the symbolic link not followed), a read failure other than
  `ENOENT`, text that is not JSON, JSON that is not an object, a non-string value, a string off the
  locale list (JSON-quoted), other keys, a duplicated key and an inherited key (AC-1; B14–B16 and B95
  are T-0077's)
- [ ] B17: the locale list module's exports (AC-2; B18 and B19 are T-0077's)
- [ ] Y7, Y8, Y10, Y11, Y15–Y18: `readChallengeDeclaration` accepts a leading `---` and keeps a date
  as a string; `validateChallengeDeclaration`'s `app`, `backend`, `source_visible`, `source_files`,
  `tools` and `flag` rules (AC-35; its other rows are T-0077's)
- [ ] U11: the page predicate per path, observed as `planLayoutMove`'s `legacy` and ops (AC-44; the
  run rows are T-0081's)
- [ ] U20–U24, U26, U30, U31, U146, U150: `move` and `declare` outputs, bytes, line endings, the BOM,
  groups, a brief left with only its fences, the no-op, determinism, a stray page in a new-layout
  tree, legacy pages named like a locale (AC-45). U150 here is the planner's half: two `move` ops
  to `platform/en/en.md` and `platform/en/zh-TW.md` and no `failures`; its clause "the next build
  fails with PL-E09 naming both" is the build's, observed through B31 in T-0077
- [ ] U27: a translation brief is stripped, left alone, or fails `frontmatter` (AC-45, AC-47)
- [ ] U12, U25, U28, U29: the `legacy-brief`, `frontmatter`, `orphan-brief` and `target-exists`
  failures (AC-47; the UP-E14 lines and the run's stops are T-0081's)
- [ ] U47: value equality for mismatches (AC-46; the UP-A16 lines are T-0081's)
- [ ] Nothing reads the new modules: the coverage report records `git grep` showing that only test
  files import them; no row of "Overridden contracts" changes in this ticket
- [ ] Stage 8 as below

## Stage 8

No V row: every row here is a unit row of a module nothing reads yet (T3, T8). Stage 8 records, on
the terminal surface, `pnpm test --run` and `pnpm --dir create-wxl test` passing on the ticket
branch, and that the diff touches no file that the build, the hook or the upgrade reads. It claims
no browser behaviour.

## 給使用者（zh-TW）

這張票先做好之後版面切換要用的純函式：語系清單模組、從設定紀錄（`range.json`）讀主語系的函式、判斷一個路徑算不算頁面的函式、讀取與檢查題目宣告（`challenge.yaml`）及說明頁前置資料的函式，以及 create-wxl 裡規劃搬家的 `planLayoutMove`。這些模組只有測試會用；網站、pre-commit hook 與升級都還不讀它們，所以合併後網站完全沒有變化。實作前要先向你確認的決策：D97、D98、D99、D114、D115、D116、D129、D140。

## Comments

---
id: T-0077
title: The layout switch
epic: 0010-primary-locale-layout
status: processing
blocked_by: [T-0076]
---

## Context

Upstream's pages move into `platform/en/` and `platform/zh-TW/`, every challenge declaration leaves
its brief pages for `platform/challenge/<slug>/challenge.yaml`, and the build takes the primary
locale from the setup record (`range.json`). Upstream has no `range.json`, so its primary locale
becomes Traditional Chinese the moment this lands: `/` serves Traditional Chinese and English moves
to `/en/` (D23). CI runs keygen, validate, the unit suite, `docs:build`, site-smoke and the
create-wxl tests on every pull request, and each of them reads brief paths or declaration fields, so
everything T1 lists lands in this one ticket:

- the move itself, produced by T-0076's `planLayoutMove` run on upstream's tree (D108);
- the build: primary locale, `rewrites`, layout check, locales config, page list,
  `transformPageData`, home-page links and the link rule (D1–D13, D18–D22);
- routing generalised to `P` and `pageLocaleOf` in the four components (D24–D35);
- the one loader and the merge (D37–D43), the smoke fixture pages and their CI switch (D49, D50);
- every reader and writer of the declaration and of brief paths, the skills included (D73–D90);
- the redirect generator, challenge numbers, the brief check and the hook (D57–D69), with
  **T-0059 taken whole** (D72, S51): the generator, the hook and CI refuse a slug outside the
  grammar or shadowed by another challenge's padded number;
- `ANCHOR_PATHS` and fork:init's `PLATFORM_HOME_RELS` (D107);
- the upstream-equality rows T2 gives the switch (U130–U134, U136, U139, U142, U147) and T9's checkout
  change: `fetch-depth: 0` on `quality-gates.yml` jobs `test` and `fork-init-cross-os` and on
  `release.yml` job `release`, pinned by U142;
- every document the switch makes false (B84–B87, A34–A37, Y94–Y101, S64–S72, and the GLOSSARY
  working-tree edit B90 except U135's 設定紀錄 and 搬家 sentences, which T-0081 carries);
- the passages of L44 ("Overridden contracts › Area L") that the switch makes false: LH1's
  difficulty-badge clause, LH2, LH3 (GLOSSARY 語系標記, written with B90 so that T-0081 is the only
  later ticket that edits `GLOSSARY.md`) and LH4. LH1's list-title row is written by T-0079, which
  also claims the row L44 (the stage 6 confirmation of LH1–LH5); LH5 is release-note input, collected
  with B89.

**First step (D31, T1).** Before its first red test, this ticket introduces the client module of D31
(`primaryLocale()`, seam 0010-S12) alone, runs the unit suite, and lists in "Overridden contracts"
every existing test that the module's `zh-TW` fallback flips. A test changed only to set `P`
explicitly (an argument, or a `vi.mock` of that module), with its assertions unchanged, needs no row
of its own; stage 6 checks that such a test's diff is only that.

**What stays for later tickets.** The lists and the home page read `lists[pageLocaleOf(…)]` here
(D32, D40), so they are right under `P = zh-TW`; their interface strings, dates, subtitle and the LW1
warning are T-0079's (D44–D47, D131; T6). The Traditional Chinese export-format reference page and
the completeness test are T-0080's (T5). Until T-0080 lands, `platform/zh-TW/guide/notes.md` cannot
keep today's `../../reference/attack-log-export-format.md` (under `P = zh-TW` it is a dead link and
the build fails, B74), D16's same-folder form names a page that does not exist yet, and no markdown
link to the English page passes under both primaries: `../../en/reference/attack-log-export-format.md`
is the cross-folder form B73 allows under `P = zh-TW`, but under `P = en` its first segment is the
primary folder and B72 rejects it with PL-E11 (D12's own example), and this ticket must build with
`P = en` (F-2, F-3's second deploy, V-B2, V-B7, VA3a–VA3e, VA2i–VA2l). This ticket therefore removes
that link and keeps the sentence naming the reference page as plain text, with no link, and T-0080
writes D16's form (B71, B78). The interim plain text is not a spec decision; it is confirmed with the
decisions below. The upgrade's move is T-0081's (T4).

**Decisions to confirm before implementing** (workflow, "Standing authorization"): D8, D9, D12, D13,
D15, D19, D27, D28 (with the self-check's fall-through, A39), D29, D30, D31, D32, D33, D38, D40, D41,
D42, D43, D53, D57, D58, D61, D62, D63, D64, D65, D67, D68, D69, D72 (T-0059 here), D76, D77, D82 (it
runs the layout check), D83, D84, D85, D86, D108 (the test picks its compared tree and base tag),
D113, D117, D118, D119, D121, D122, D123, D124, D126, D127, D128, D130, D132, D133, D135, D136, D137,
D138, D141; and the interim plain-text mention in the notes page above. Pin the root `yaml`
dependency to exactly 2.9.0, the version create-wxl locks and the version D129, D145, D146 and D147
were checked against (T-0076 final review F17).

Spec: `spec.en.md` revision 2, every area's acceptance criteria except AC-22, AC-24, AC-26,
AC-44–AC-50, AC-52, AC-54, AC-55, AC-57 and AC-60 (this ticket holds rows of AC-8, AC-10, AC-32,
AC-51, AC-58 and AC-61, which later tickets close); `traceability.md` revision 2, constraints T1,
T2, T6, T7, T9, "Overridden contracts" (areas B, A, L, S, Y; area U's anchor and fork:init rows),
"Trust boundaries", U-§5; the claim table in `tickets.md`.

## Deliverable

Upstream builds and serves with every page in a locale folder and every declaration in
`challenge.yaml`: Traditional Chinese at `/`, English at `/en/`; a legacy-layout tree fails every
VitePress command and every tool that runs before it with PL-E08 naming README's move section; the
cold-load redirect, the not-found lookup, the switcher and the line follow `P`; every list holds
every challenge that has a primary brief; `_redirects`, the challenge numbers and the hook follow
`P` and the split layout and refuse slugs outside the grammar; `create:challenge`, keygen, retype,
analyze, validate, the release gate, lint-staged and the L4 package read the declaration and the
primary brief; fork:init and create-wxl name the new home pages; CI stays green, and an `en` range
passes the same suites.

## Acceptance criteria

Area B
- [ ] B14–B16, B95: the shipped primary locale comes only from the root `range.json`; the dev server
  takes an edit after a restart; the `SITE_BASE` error first; one quoting function equal to
  create-wxl's (AC-1; B1–B13 are T-0076's)
- [ ] B18, B19: no other locale enumeration; a string table and a locales-config entry per listed
  code (AC-2; B17 is T-0076's)
- [ ] B20–B38, B91: the layout check, its rule order, where it runs, the tools that call it first
  (AC-3)
- [ ] B39–B49: `rewrites`, the page list, `__WXL_PRIMARY_LOCALE__`, output placement, the dev server
  (AC-4)
- [ ] B50–B52: `transformPageData` by source path (AC-5)
- [ ] B56–B61: the locales config, `<html lang>`, the site title line fork:init matches, the nav
  title link (AC-6)
- [ ] B62–B70, B92, B94: home-page links (AC-7)
- [ ] B72–B77, B79: the primary-folder link rule, cross-folder links, `ignoreDeadLinks`, the list
  and home data import (AC-8; B71 and B78 are T-0080's)
- [ ] B80–B83: `Layout.vue` gone, upstream's root language, site-smoke and the exploit specs (AC-9)
- [ ] B84–B87, B90 except U135's two sentences: the READMEs' move section, changing `P` later, the
  setup record, ADR-0008's notes, the GLOSSARY edit (AC-10; B88 and B89 are the close-out's, with
  T-0081)
- [ ] B93: the D124 rows are upstream-only through one helper (AC-61; V-B7 is T-0080's)

Area A
- [ ] A1–A10, DT01–DT80: the cold-load decision table (AC-11)
- [ ] A11–A13 (AC-12); A14–A20, A39: the not-found lookup (AC-13)
- [ ] A21–A24, SW01–SW16: the switcher (AC-14)
- [ ] A25 (AC-15); A26–A29 (AC-16); A30–A32: the line (AC-17); A33: the session gate (AC-18)
- [ ] A34–A37: troubleshooting, README preference sentences, code comments, GLOSSARY 主語系 (AC-19)

Area L
- [ ] L1–L18: the merge, normalisation and defaults from the string tables (AC-20)
- [ ] L19–L22: the loader's `watch`, one parser, the dev server, base-less URLs (AC-21)
- [ ] L34–L39, L47: the smoke fixture pages, the CI switch, `missing-translation.spec.ts`'s
  subjects, node-only modules (AC-23)
- [ ] L43: the exploit specs, the template and the blind default (AC-25)

Area S
- [ ] S1–S11 (AC-27); S12–S21, S75 (AC-28); S22–S27 (AC-29); S28–S35 (AC-30)
- [ ] S36–S49, S73, S74, S76–S80: the hook (AC-31)
- [ ] S51, T-0059's three criteria in the new layout: a slug outside
  `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` in the declaration tree or any brief tree, and an all-digit slug
  equal to another challenge's padded number, stop `redirects:generate` (full and `--staged`) naming
  it, with a test each, on both `P`; a slug equal to its own padded number does not; the hook and CI
  report the same refusal (AC-32; S50 is T-0078's)
- [ ] S52–S56: `challengePagePath` and the copy control (AC-33)
- [ ] S57–S63: end-to-end redirect rows on the previews (AC-58's matrix rows; V-S1–V-S7 are run here
  and claimed by T-0078, the last ticket of area S)
- [ ] S64–S72: comments, README passages, GLOSSARY short link, skill sentences (AC-34)

Area Y
- [ ] Y1–Y6, Y9, Y12–Y14, Y19–Y21, Y104, Y112: the declaration through validate, assembly and
  keygen (AC-35; Y7, Y8, Y10, Y11, Y15–Y18 are T-0076's)
- [ ] Y22–Y37, Y103 (AC-36); Y38–Y48, Y106, Y113 (AC-37); Y49–Y51 (AC-38)
- [ ] Y52–Y61, Y107: keygen, its convergence measured first (Y-O5, D133) (AC-39)
- [ ] Y62–Y69, Y108: retype and analyze (AC-40); Y70–Y85, Y105: `create:challenge` (AC-41)
- [ ] Y86–Y93, Y109–Y111: the release gate, commit-time validation, the L4 package (AC-42)
- [ ] Y94–Y101: the skills in both trees, READMEs, CONTRIBUTE, pipeline doc, AGENTS.md, guide pages,
  the dev-server limit (AC-43)

Area U (the switch's part)
- [ ] U112–U116, U145, U152: `ANCHOR_PATHS`, fork:init and create-wxl on the new home pages, the
  pristine check, the known A7 conflict (AC-51; U13, U110 and U111 are T-0081's)
- [ ] U130–U134, U136, U139, U142, U147: upstream equality against the base tag, the tag check, the
  locale-list copy, the shared page-predicate table, the skip in a range, T9's checkouts (AC-53)

Stage 8 and the rest
- [ ] VA1a–VA1m, VA2a–VA2l, VA3a–VA3e, VA4 (AC-56) and V-Y1–V-Y8 (AC-59), as below
- [ ] "Overridden contracts" of areas B, A, L, S and Y, and area U's `ANCHOR_PATHS` and
  `PLATFORM_HOME_RELS` rows, change only as the table states; area L's toolbar, dates and home-string
  rows, LW1 and LH1's list-title row are T-0079's; the D31 first step's list of flipped tests is in
  Comments before the first red test
- [ ] LH1's difficulty-badge clause, LH2, LH3 and LH4 are written in this ticket's diff, in both
  languages where the passage has two (the row L44 is T-0079's, which confirms them at stage 6)
- [ ] `platform/zh-TW/guide/notes.md` holds no `../../` link and names the export-format reference
  page as plain text; `docs:build` passes with `P = zh-TW` and with `P = en` (the interim text;
  B72, B74; T-0080 writes D16's link)
- [ ] Green after landing, as T1 defines it (every `quality-gates.yml` job and the create-wxl tests on
  `main`; no tool writes a tree the build rejects; no hook refusal weaker than before)
- [ ] After landing, T-0059's Comments name this ticket's merge (its `revisit_when` fires)

## Stage 8

This is the first ticket that touches deployment, so it runs on real, temporary hosts (workflow,
stage 4). Fixtures (D119): F-1 `stage8/T-0077` and F-2 `stage8/T-0077-en` on their Cloudflare Pages
previews, F-3 a temporary GitHub Pages range created from F-1's pushed head with the packed tarball,
F-6 a scratch clone. Pushing each branch, creating F-3 and deleting them afterwards each need the
user's approval first. Every challenge page is opened with its Browser panel open.

- V-B1–V-B7, the rows its area B rows reach: terminal on F-6 copies (V-B1, V-B2, V-B5, V-B6), the
  Browser panel on F-1 and F-3 (V-B3, V-B4), a scratch clone of F-2 (V-B7). At V-B3 and V-B4 the
  Traditional Chinese notes page names the export-format reference page with no link (the interim
  text), recorded as such; following the link to the Traditional Chinese page is T-0080's
- VA1a–VA1m, VA2a–VA2l, VA3a–VA3e, VA4, in full: area A ends with this ticket
- VL3, VL5–VL8: the rows L21, L22, L34, L36, L43, S53, S54 and S63 reach (VL1, VL2, VL4 and VL9
  reach only T-0079's rows)
- V-S1–V-S7: the rows S39, S41, S54 and S57–S63 reach
- V-Y1–V-Y8, in full: area Y ends with this ticket
- Not run here: V-U1–V-U5, which need T-0081's move (V-U2 observes fork:init after V-U1's upgrade).
  They also reach this ticket's S51, S52, A12, A16 and B84, so this departs from T8's first sentence:
  those rows are observed at T-0081, area U's last ticket, after this ticket has landed (tickets.md,
  T8 check and "Open items")

## 給使用者（zh-TW）

這是版面切換本身，必須一次合併（T1）：上游的頁面搬進 `platform/en/` 與 `platform/zh-TW/` 兩個語系資料夾，題目宣告從說明頁的前置資料搬到 `platform/challenge/<slug>/challenge.yaml`，網站建置改從設定紀錄（`range.json`）讀主語系。上游沒有 `range.json`，所以合併後根網址 `/` 立刻變成繁體中文、英文改到 `/en/`。一起改的還有：舊版面的檢查與錯誤碼、冷載入轉址與 not-found 查找、語系切換按鈕、題目清單與首頁的資料、`_redirects` 產生器、永久編號與 pre-commit hook、所有讀寫題目宣告的工具與 skill、fork:init 與 create-wxl 認得的首頁路徑、上游自己這次搬家與 `v3.1.1` 的逐位元組比對，以及三個 CI job 改成抓完整 tag。T-0059（slug 文法，以及和別題補零永久編號相同、因而被遮蔽的 slug）整張併進這張票。

第一步先只加 D31 的瀏覽器端模組並跑一次單元測試，把因它的 `zh-TW` 預設值而翻轉的既有測試先列出來；只為了明確指定主語系而改、斷言不變的測試不必另立一列。題目清單的介面字串與日期留給 T-0079，繁中參考頁與完整性測試留給 T-0080；疑難排解頁、`guide/index.md`、README 與 GLOSSARY 語系標記裡因切換而變假的段落在這張票改，清單標題那一列留給 T-0079。在 T-0080 之前，繁中 `notes.md` 指向匯出格式參考頁的連結暫時拿掉、只用文字寫出頁名：今天的寫法在主語系是繁中時是死連結，指向英文頁的跨資料夾寫法（`../../en/reference/…`）在主語系是英文時會被 PL-E11 擋下，沒有一種連結在兩種主語系下都能建置。這一點不是規格決策，要跟下列決策一起請你確認。第 8 階段在 `stage8/T-0077` 與 `stage8/T-0077-en` 的 Cloudflare 預覽、一個暫時的 GitHub Pages 靶場和一份暫存 clone 上跑；推分支、建立與刪除暫時靶場前都會先問你。實作前要確認的決策：D8、D9、D12、D13、D15、D19、D27、D28、D29、D30、D31、D32、D33、D38、D40、D41、D42、D43、D53、D57、D58、D61、D62、D63、D64、D65、D67、D68、D69、D72、D76、D77、D82、D83、D84、D85、D86、D108、D113、D117、D118、D119、D121、D122、D123、D124、D126、D127、D128、D130、D132、D133、D135、D136、D137、D138、D141。

## Comments

- 2026-11-15 (from T-0076 stage 6): the epic's GLOSSARY edits (row B90 and LH3, stage 1's new entries
  and the sentences this epic makes false, with N17's two corrections) landed too early in T-0076's
  docs commit `a2ac5b6` and broke `create-wxl/test/upstream-config.test.mjs`, which pins the setup
  record's current wording; T-0076 restored `main`'s `GLOSSARY.md`. This ticket applies them with
  the switch: the full text is `git show a2ac5b6:GLOSSARY.md` (also saved, local only, as
  `.proj.research/2026-11-15-epic0010-glossary-b90.md`), and the pinned sentence in
  `upstream-config.test.mjs` goes into "Overridden contracts".

- 2026-11-16 (wave 0, the D31 first step alone, seam 0010-S12): done, in three cycles plus the
  baseline run.
  - Cycle 1 (new `tests/unit/i18n/primary-locale-client.test.ts`, case "is zh-TW"): red for the
    expected reason — `npx vitest run tests/unit/i18n/primary-locale-client.test.ts` failed to
    resolve the import `.vitepress/theme/i18n/primaryLocale` (the module did not exist yet).
    Green after adding `.vitepress/theme/i18n/primaryLocale.ts` with `primaryLocale()` hard-coded
    to return `'zh-TW'`.
  - Cycle 2 (same file, new case "is en when the build constant is en",
    `vi.stubGlobal('__WXL_PRIMARY_LOCALE__', 'en')`): red for the expected reason — assertion
    failure, `expected 'zh-TW' to be 'en'` (the hard-coded cycle-1 body ignores the global).
    Green after generalising `primaryLocale()` to
    `typeof __WXL_PRIMARY_LOCALE__ !== 'undefined' ? __WXL_PRIMARY_LOCALE__ : 'zh-TW'` and adding
    `declare const __WXL_PRIMARY_LOCALE__` to `env.d.ts`.
    - While wiring `env.d.ts`, found that giving it a top-level `import type { Locale } from
      './.vitepress/locales'` turns the file from an ambient global script into a module, which
      silently un-globals the file's pre-existing `declare const __WXL_SHORT_LINKS__` and
      `__WXL_PAGES__` (confirmed with `npx vue-tsc --noEmit -p tsconfig.json`: both go from
      resolving to `error TS2304: Cannot find name`, and the two `declare module
      'php-wasm/*.mjs'` ambient module declarations turn into module augmentations and fail with
      `error TS2665`). Not in the test plan's named seams, so fixed in place rather than reported
      as a separate finding: `__WXL_PRIMARY_LOCALE__` is declared with the literal union `'en' |
      'zh-TW' | undefined` instead of an imported `Locale`, with no import added to `env.d.ts`.
      This is the choice the plan's open item left to `/tdd`; the two were called equivalent in
      the plan, and this run found the reason to prefer the literal union. Re-ran `vue-tsc` after
      the fix: the diff against the pre-edit baseline is exactly the four `Cannot find name`
      lines, the two `TS2665` lines and five unrelated `php-wasm/PhpNode.mjs` lines, all gone;
      nothing new appears.
  - Cycle 3 (same file, new case "is zh-TW when the build constant is zh-TW",
    `vi.stubGlobal('__WXL_PRIMARY_LOCALE__', 'zh-TW')`): green on the first run, no implementation
    change, as the plan named it (the cycle-2 generalisation already covers it).
  - Baseline: `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true
    pnpm test --run` → Test Files 142 passed (142), Tests 5054 passed (5054), exit 0. No test
    flipped by the `zh-TW` fallback (cross-area note 1's expectation holds): no row added to
    "Overridden contracts". An unrelated `ECONNREFUSED 127.0.0.1:3000` / `::1:3000` message prints
    to stderr after the summary on both runs of this command in this environment, with exit code
    0 and the same pass counts both times; not caused by this wave's files (neither touches a
    port or a dev server) and not investigated further here.
  - `pnpm --dir create-wxl test` not run: this wave touches neither `create-wxl/` nor fork:init.
  - No row left undone.

- 2026-11-16 (wave 1, sub-steps (a)–(c) only; (d)–(g) not reached in this run): the executor ran
  the increment plan the parent confirmed, in order, through (c), then stopped before (d) because
  the remaining sub-steps' scope (new modules `locales-config.ts`, `home-links.ts`,
  `primary-folder-links.ts`, `layout-error.ts`, the `source-layout.ts`/`pageList.ts` rewrite, the
  `config.mts`/`plugin.ts` wiring, and the real-tree move) is far larger than (a)–(c) and was not
  reachable in the same run. Rows done, by sub-step:
  - (a) done: `package.json` pins root `yaml` to exactly `2.9.0` (was `^2.8.2`); `pnpm install`
    updated `pnpm-lock.yaml` (resolves to `2.9.0`, confirmed by reading
    `node_modules/yaml/package.json`).
  - (b) done (B93): new describe `D124 upstream-only skip reason (B93)` in
    `tests/unit/scripts/upstream-guard.test.ts`, three cases (upstream → `undefined`; a range → a
    skip reason; a fork → a skip reason); red for the expected reason
    (`upstreamOnlySkipReason is not a function`), green after adding
    `upstreamOnlySkipReason(githubRepository, manifest, isWorkTree, hasRangeJson)` to
    `tests/__helpers__/upstreamDecision.ts` (returns `undefined` on `isUpstreamDecision(...)===true`,
    else a reason string naming "a range" when `hasRangeJson`, else "a fork"). The exact reason
    text is not spec-pinned (D124/B93 say only "the skip reason"); chosen at `/tdd`.
  - (c) done, rows Y2–Y6, Y9, Y12, Y14, Y19, Y21, Y23 and Y112's **read half only**
    (`declaration.test.ts`), each its own red→green cycle in `.vitepress/challenge/declaration.ts`
    and `.vitepress/challenge/config.ts`:
    - `readChallengeDeclaration` now returns `DeclarationResult` (`{ok:true,value}` or
      `{ok:false,reason,path}`, reasons `'absent'|'not-a-mapping'|'invalid-yaml'|'multi-document'`)
      instead of always `{ok:true,...}`/throwing: Y2 (ENOENT → `absent`), Y3 (empty/comments-only →
      `not-a-mapping`), Y6 (sequence/string/number/null root → `not-a-mapping`, green on the first
      run, no production change needed), Y5 (`parseAllDocuments` length > 1 → `multi-document`), Y4
      (`doc.errors`/`doc.warnings` non-empty → `invalid-yaml`), Y112's read half (duplicate key via
      `doc.errors`; alias within `maxAliasCount` resolved; alias over the limit and an unset-anchor
      alias via a `try`/`catch` around `toJS` → `invalid-yaml`; `<<: *base` kept as an ordinary `<<`
      key; `yes`/`on` stay strings; a custom tag `!foo bar` → `invalid-yaml` via `doc.warnings`).
    - This flips the two existing cases the ticket's Comments (2026-11-15/T-0076) and
      traceability.md D149 named in advance: `declaration.test.ts` "D145: a mapping key that is not
      a scalar throws" (now asserts `{ok:false,reason:'invalid-yaml'}` instead of `.toThrow()`) and
      "D147: the site parser resolves no YAML 1.1 tag" (all four cases now assert
      `{ok:false,reason:'invalid-yaml'}` instead of `{ok:true,...}` plus the tag-instance checks,
      which are dropped as moot); both blocks still assert no writer fires. D149 is the
      Overridden-contracts row that allows this; no further row was added.
    - `.vitepress/challenge/config.ts`: Y12 (`validateChallengeDeclaration` throws
      `` `app must be a string, got ${typeof}` `` for non-string `app`, checked after the
      required-field and `backend`-enum checks); Y14 (throws
      `` `challenge.yaml carries brief key(s) ${keys}; title, description and layout belong in each
      brief's frontmatter` `` listing present keys of the new `BRIEF_KEYS = ['title','description',
      'layout']` constant in file order); Y23 (new `validateChallengeBrief(raw)`, minimal: returns
      `{title,layout,description}` as given — the key/type checks VM6-VM9/VM14/VM15 are Y24-Y29's,
      not implemented here); Y9, Y19, Y21 green on the first run with no production change (already
      correct; test-only rows, as the plan predicted).
  - Row **not done as planned, reported rather than guessed**: Y112's **validator half** named by
    the Test plan table's own Scope column is `challenge-validate.test.ts` (brief half, VM6 naming
    `<<`, VM15 for a duplicate `title`), not `config.test.ts`. The increment plan's wave-1(c)
    sub-heading said "their read and validator halves" for all of Y2-6/Y9/Y12-14/Y19/Y21/Y23/Y112
    together, which does not hold for Y112 specifically once checked against the Test plan table and
    wave-1(c)'s own file list (`.vitepress/challenge/config.ts` and `declaration.ts` only —
    `scripts/challenge-validate.ts` is wave 5's). A first attempt added a `config.test.ts` case
    asserting `validateChallengeDeclaration({...,'<<':{x:1}}))['<<']` equals `{x:1}`; it failed
    because the function's return value does not spread unknown keys (by design — Y19's own
    acceptance criterion puts "assembled frontmatter carries each unchanged" in
    `plugin.test.ts`, not in the validator's return shape). That test case was removed rather than
    used to justify a production change outside the named seam. Y112's brief-side VM6/VM15 behaviour
    is deferred to the wave that implements `scripts/challenge-validate.ts` (wave 5 in the
    Implementation-waves list, though that wave's own text does not name Y112 explicitly either —
    flagged for the parent to confirm which wave claims it).
  - Sub-steps **not reached in this run** (not attempted, not "cannot be done" — simply not started):
    (d) the pure build modules (B18, B19, B20–B36, B91, B39, B41, B42, B46, B56–B58, B62–B69, B92,
    B94, B72, B73, B75, B95; new `locales-config.ts`, `home-links.ts`, `primary-folder-links.ts`;
    rewritten `source-layout.ts`, `pageList.ts`, `theme/i18n/pages.ts`, `theme/i18n/arrival.ts`,
    `theme/i18n/index.ts`, `layout-error.ts`); (e) the real-tree move and `PLATFORM_HOME_RELS`; (f)
    the `config.mts`/`plugin.ts` wiring, the hero links, deleting `theme/Layout.vue`, the slug
    helper and `ChallengeLayout.vue`; (g) the smoke rows that stay red until wave 3. Two decisions
    the parent flagged before this run still stand, unresolved, and block (e)'s real-tree move:
    (1) whether to run `planLayoutMove` on the upstream `platform/` tree now, irreversibly, without a
    dry-run diff shown first, together with the `notes.md` interim edit; (2) none remaining for (c)
    — Y-q6 is resolved by traceability.md revision 2.3's D149 (an Overridden-contracts row already
    exists; no further user decision was needed to do (c)).
  - Commands run, with exact counts:
    - `npx vitest run tests/unit/scripts/upstream-guard.test.ts` → 118 passed, 1 skipped (119).
    - `npx vitest run tests/unit/challenge/config.test.ts tests/unit/challenge/declaration.test.ts`
      → 97 passed (97).
    - `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test
      --run` → Test Files 142 passed (142), Tests 5089 passed (5089), exit 0 (up from wave 0's 5054
      by exactly 35 new tests: 3 in (b), 17 in declaration.test.ts and 15 in config.test.ts for (c)).
      The same unrelated `ECONNREFUSED 127.0.0.1:3000`/`::1:3000` stderr noise as wave 0 printed
      again, same exit code, not investigated (unrelated to this wave's files).
    - `pnpm --dir create-wxl test` not run: (a)–(c) touch neither `create-wxl/` nor fork:init.

- 2026-11-16 (wave 1, sub-step (d), the pure build modules): done, grouped by the confirmed
  increment plan (seven groups, each a red→green cycle per seam; group 2's 17 sub-rows and group
  5's 10 sub-rows were written and verified together as one file-level red→green pass rather than
  one cycle per row, given the wave's size — flagged here as a granularity deviation from the
  plan's row-by-row framing, not as a row left undone).
  - **Group 1 (B18, B19 first half).** B18: new `describe.skipIf(!IS_GIT_CHECKOUT)` in
    `tests/unit/i18n/locales.test.ts` running PAT1 commands 1 and 2 via `spawnSync`; red for the
    expected reason (`KNOWN_LOCALES` still present, command 1 printed a match). Green on command 1
    after `.vitepress/theme/i18n/index.ts` (BC7): `KNOWN_LOCALES` deleted, `Locale` re-exported
    from `locales.ts` instead of a literal union, `isKnownLocale`'s body delegates to
    `locales.ts`'s own `isKnownLocale` instead of an `=== 'en' || === 'zh-TW'` chain. Command 2
    stays red, for the reason the increment plan itself named in advance and the ticket's
    Implementation-waves preamble allows between waves: `.vitepress/challenge/shortLink.ts:61`
    (`ShortLinkLocale`) and `platform/shared/challenges.data.ts:5` (`ChallengeLocale`) are owned by
    areas S and L (waves 4 and 3), not this one; re-ran the raw `git grep` to confirm only those
    two files remain. B19 first half: `tests/unit/i18n/messages-shape.test.ts`'s two literal
    imports (`en.json`, `zh-TW.json`) replaced by a `LOCALES`-driven dynamic-import map; the three
    `it.each(['en', en], ['zh-TW', zhTW])` tables rewritten to `it.each(LOCALES.map(...))`, all
    pre-existing assertions unchanged (T1); new case comparing `messages/*.json` basenames to
    `LOCALES`. Green on the first run after the rewrite (no separate red cycle needed: the
    rewritten reads resolve the same two files the static imports did).
  - **Group 2 (checkSourceLayout, B20–B36, B91).** New function in `.vitepress/source-layout.ts`
    (`checkSourceLayout(srcDir, primary)`, PL-E07→PL-E10 in D6's order, built on the existing
    `classifySourcePath`/`isExcluded`); 120 new cases in a new `describe('checkSourceLayout…')` of
    `tests/unit/site/source-layout.test.ts`, one fixture tree per row (symlink rows skipped on
    Windows). Red for the expected reason on the first run (`checkSourceLayout is not a function`);
    green after the implementation, with two test-construction bugs found and fixed before the
    green run (not implementation bugs): B34's and B33's symlink targets were first written inside
    the tracked tree itself, which made the target `.md` file its own PL-E08 violation (masked by
    priority ordering in B33 but not in B34, which expects no error at all) — moved the symlink
    targets to a sibling temp directory; B35's `rmSync` on a directory symlink failed with "Path is
    a directory" — switched to `unlinkSync`. B31's rule (a direct entry of a locale folder named
    like a listed locale) reports every `.md` page found beneath the colliding entry when it holds
    one, and the bare entry itself (trailing slash) when it holds none — read from the row's own
    two examples (`zh-TW/en/a.md`, the file; `en/zh-TW/`, the empty folder) rather than being
    stated as a single rule in the row text.
  - **Group 3 (rename + rewrittenPath + pageListFromDir, B39, B41, B42, plus B24's page-list
    half).** Mechanical rename `entryForSourcePath` → `entryForRelativePath`
    (`theme/i18n/pages.ts`, its doc comment, `pageList.ts`'s call, `theme/i18n/arrival.ts`'s call);
    red for the expected reason (`entryForRelativePath is not a function`) after renaming the test
    file's import and the `describe` title first, green after the production rename — this is BC3's
    allowed rename, no row of its own (T1). New `rewrittenPath(source, primary)` in `pageList.ts`;
    `pageListFromDir` gains a second, optional `primary` parameter (omitted ⇒ unchanged behaviour,
    since this ticket's `config.mts` wiring is wave 1(f), not this sub-step) and a
    `challenge/<slug>/src/**` walk-exclusion (B24's page-list half, additive — the existing
    `NEVER_PAGES`/`NOT_PAGES_AT_TOP` sets and their fixtures are untouched). New describe
    `rewrittenPath (B39)`: the full 28-source × 2-primary table from "Source path → URL", typed by
    hand (file form, not computed) plus the three literal examples the row itself gives; new
    `pageListFromDir omits challenge/<slug>/src/** (B24)`; new `pageListFromDir: no duplicate
    entries on a passing tree (B41)`, scoped to three representative passing fixtures (the valid
    tree, the deeper/unlisted-code tree, the translation-only tree) rather than every one of
    B20–B36's fixtures verbatim — a scope reduction from the row's literal text, taken because the
    row's own "Proof" column already shows duplication is structurally impossible once PL-E09 holds,
    and a shared fixture-builder module was not otherwise called for by the plan; new
    `pageListFromDir: the full-table fixture (B42)`, both primaries. All new cases passed on first
    run (implementation already written during group 3's rename-and-extend step; no separate red
    observed for B39/41/42 specifically — a granularity deviation, not a row left undone).
  - **Group 4 (`locales-config.ts`, B46, B56–B58, B19 second half).** New file
    `.vitepress/locales-config.ts`: `localesConfig(primary)` built from one `LOCALE_CONTENT` table
    per listed code (label, lang, nav, sidebar, all written unprefixed) and one generic
    `withPrefix` helper, so the per-primary literal content needed no duplication — the `root` entry
    is the primary's own content unprefixed, every other entry is prefixed by its own code. New
    `tests/unit/site/locales-config.test.ts`: B46 (keys), B19 second half (`length ===
    LOCALES.length`), B56 (deep-equal today's `config.mts` English literal), B57 (deep-equal the
    "Schema: locales config" JSON), B58 (link-prefix walk, both primaries). All 8 cases passed on
    the first run (implementation written to match the two literal schemas before the test file;
    no separate red observed — a granularity deviation, not a row left undone).
  - **Group 5 (`home-links.ts`, B62–B69, B92, B94).** New file `.vitepress/home-links.ts`:
    `localizeHomeLinks(frontmatter, pageLocale, primary, pages)`, matching the seam's own signature
    (traceability.md line 243) with no separate page-path parameter — `<page>` for PL-E12 is derived
    as `` `${pageLocale}/index.md` `` (every page this function runs on is a locale's home page, so
    its source path is determined by `pageLocale` alone; confirmed against the spec's own PL-E12
    example, `"zh-TW/index.md"`). Checks run in D141's order (string → `//` → scheme/`#` → relative
    → prefix → page). New `tests/unit/site/home-links.test.ts`, 36 cases covering B62–B69, B92, B94.
    Two bugs found and fixed before green: (1) B67's "`pathCandidates` removes query and hash" is
    the caller's job, not `pathCandidates`'s own (it only strips the site base and a trailing
    `.html`/`/index`) — added an explicit `.replace(/[?#].*$/, '')` before the lookup; (2) my own
    test for B92's relative-link case put the offending link at index 0 behind another link that
    threw first, so the index-1 field name was never reached — fixed the fixture, not the
    implementation.
  - **Group 6 (`primary-folder-links.ts`, B72, B73, B75).** New file
    `.vitepress/primary-folder-links.ts`: a markdown-it `link_open` wrapper, resolving a relative
    href against `posix.dirname(env.relativePath)` (the page's already-rewritten URL-space
    directory, BC3) and an absolute href as written; `<page>` in PL-E11 uses `env.realPath` (open
    item B-f). New `tests/unit/site/primary-folder-links.test.ts` with VitePress's own
    `createMarkdownRenderer`; found and fixed one test-harness bug before green —
    `createMarkdownRenderer` caches one markdown-it instance at the module level, so a second test's
    `md.use(primaryFolderLinks, otherPrimary)` was wrapping the first test's already-wrapped rule
    instead of a fresh one; added `disposeMdItInstance()` in `beforeEach`. B73's "the rendered href
    is `/zh-TW/guide/x`" reads as the browser-resolved target of the href VitePress actually emits
    (`./../zh-TW/guide/x`, since VitePress never collapses a relative link's `../` segments at build
    time), not as the literal href string; the test resolves the emitted `href` with `new URL(...)`
    against the current page's URL rather than asserting the literal attribute text.
  - **Group 7 (B95, layout-error quoting; no production change, as predicted).** New
    `tests/unit/site/layout-error.test.ts`: the control-character table run through both
    `.vitepress/layout-error.ts`'s and `create-wxl/src/text.mjs`'s `jsonStringifyEscaped`; all 10
    cases green on the first run, no implementation change (the two functions were already
    byte-for-byte equal in logic). Added `'\u009b[31m'` to `tests/unit/site/primary-locale.test.ts`'s
    B10 case array (expected quoted form `"\u009b[31m"`, computed once via the real function rather
    than guessed, since a C1 control character does not render safely in a shell).
  - Sub-steps **not reached in this run** (unchanged from the prior wave's note, not attempted):
    (e) the real-tree move and `PLATFORM_HOME_RELS`; (f) the `config.mts`/`plugin.ts` wiring and the
    rest; (g) the smoke rows that stay red until wave 3. The two decisions blocking (e) (the
    irreversible `planLayoutMove` run, and whether to show a dry-run diff first) still stand,
    unresolved; nothing in this run depends on them.
  - No row left undone, except the deliberate narrowing of B41's fixture reuse noted under Group 3,
    which is a scope decision (reported above), not an incompleteness.
  - Commands run, with exact counts:
    - `npx vitest run tests/unit/i18n/locales.test.ts` → 6 passed, 1 failed (7) — the one failure is
      B18's command 2, expected (see Group 1 above).
    - `npx vitest run tests/unit/i18n/messages-shape.test.ts` → 20 passed (20).
    - `npx vitest run tests/unit/i18n/page-list.test.ts` → 101 passed (101).
    - `npx vitest run tests/unit/i18n/arrival.test.ts` → 29 passed (29).
    - `npx vitest run tests/unit/site/source-layout.test.ts` → 120 passed (120).
    - `npx vitest run tests/unit/site/locales-config.test.ts` → 8 passed (8).
    - `npx vitest run tests/unit/site/home-links.test.ts` → 36 passed (36).
    - `npx vitest run tests/unit/site/primary-folder-links.test.ts` → 10 passed (10).
    - `npx vitest run tests/unit/site/layout-error.test.ts` → 10 passed (10).
    - `npx vitest run tests/unit/site/primary-locale.test.ts` → 39 passed (39).
    - `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test
      --run` → Test Files 145 passed, 1 failed (146); Tests 5274 passed, 1 failed (5275); exit 1,
      the one failure being B18's command 2 above (up from wave 1(c)'s 5089 by exactly 185 new
      tests net of the one accepted failure, across 4 new test files). The same unrelated
      `ECONNREFUSED 127.0.0.1:3000`/`::1:3000` stderr noise as earlier waves printed again; an
      additional unrelated line, `There are not applicable mutations for the input Wasm module.`,
      also printed once, from a WASM-related dependency this wave's files do not touch; neither
      investigated further here, matching the earlier waves' judgment on comparable noise.
    - `pnpm --dir create-wxl test` not run: this wave's only `create-wxl/` interaction is a
      read-only import (`create-wxl/src/text.mjs`'s `jsonStringifyEscaped`, for comparison, in
      Group 7's test); nothing under `create-wxl/` or fork:init was written.

- 2026-11-16 (wave 1, sub-step (e), partial — `PLATFORM_HOME_RELS` only; D108's move itself not
  reached): the executor ran the increment plan the parent confirmed, through every row except
  D108's move, which the plan's own analysis stopped at and reported rather than attempting. Rows
  done:
  - U113: `scripts/fork-init.ts:854`'s `PLATFORM_HOME_RELS` becomes `['platform/en/index.md',
    'platform/zh-TW/index.md']`; `fork-init.test.ts`'s shared `writeFixture` (line 235) now writes
    the hero page to `platform/en/index.md`, and `A7_HOME_FILES` (line 1870) follows. Running the
    full file first (before any test edit) surfaced 32 failures, every one inside
    traceability.md line 1780's named scope ("the 0003 A7 cases" and "the dry-run file list"): the
    "site name (A6, A7)" describe's `sets A6 and both A7`, `round-trips a value containing %j` and
    `writes the trimmed value` cases; the "code anchor errors (A6–A8)" describe's `A7: when only
    one home page is broken…`, `A7: single-quoted, doubled single quote…`, `A7: double-quoted with
    escaped quotes…`, the CRLF case and the invalid-UTF-8-byte case; and the dry-run describe's
    `--site-name and --origin together…` case. Each literal `'platform/index.md'` inside those
    tests — and nowhere else in the 4950-line file — became `'platform/en/index.md'`; two
    explanatory comments (lines 215, 1869) were corrected to match.
    `npx vitest run tests/unit/scripts/fork-init.test.ts` → 1895 passed (1895), back to the
    pre-edit baseline, confirming no other test depends on the renamed path — in particular the
    two describes that build their own `platform/index.md` directly after calling `writeFixture`
    (around lines 3491 and 3534) stayed green, untouched, as traceability.md's named scope implies.
  - U114, U145, U152: three new `it`/`it.each` cases added to the `fork-init CLI under type
    stripping` describe (reusing its `runCli` helper and `writeCliFixture` root, per the Scope
    column). U114 (parametrised on whether the translation home stays) removes
    `platform/en/index.md`, restores a legacy `platform/index.md`, and asserts stderr contains
    `A7: platform/en/index.md is missing`, exit 1, nothing written. U145 writes `range.json`
    `{"primaryLocale":"en"}` and removes `platform/zh-TW/index.md`, asserting stderr names it,
    exit 1, `range.json` bytes unchanged. U152 removes `platform/en/index.md` with no `range.json`
    present, asserting the same shape and that `platform/zh-TW/index.md` stays unchanged. All four
    cases passed on the first run — no separate red cycle, exactly as the plan named in advance
    ("no new production logic; production depends on the same `PLATFORM_HOME_RELS` change", which
    U113 already shipped). `npx vitest run tests/unit/scripts/fork-init.test.ts` → 1899 passed
    (1899), exactly +4 over this wave's own pre-edit baseline.
  - U116 (non-real-tree half): `upstream-guard.test.ts`'s `FieldId` union member (line 643), the
    `pristineMismatches` A7 loop (line 697-698) and `pristineFixtureFiles`'s key (line 805), plus
    the two cases built on them ("does not report A7 when the value is an unquoted plain YAML
    scalar…" and the `it.each` mismatch table's `A7:platform/index.md` row), all renamed to
    `platform/en/index.md`. `npx vitest run tests/unit/scripts/upstream-guard.test.ts` → 117
    passed, 1 failed, 1 skipped (119): the one failure is the real-tree describe's "the pristine
    check finds no mismatch" (line 988, `describe.runIf(REAL_DECISION)`), which stays red until
    D108's move lands — reported here, not fixed, exactly as the plan said it would.
  - U115: `create-wxl/test/helpers/fixtures.mjs`'s `ENGINE_READY_FIXTURE` gained a `platform/en/`
    directory entry ahead of a renamed `platform/en/index.md` file entry (archive-order rule), and
    lost the `platform/index.md` entry; `create-wxl/test/engine-apply.test.mjs`'s home-page read
    (line 111) follows. `npx vitest run test/engine-apply.test.mjs` (in `create-wxl/`) → 6 passed
    (6). Checked the fixture's other three importers individually first
    (`setup-questions.test.mjs`, `signals.test.mjs`, `run-next-steps.test.mjs` → 73 passed (73),
    no regression), then `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl
    test` → 39 test files passed (39); 855 passed, 1 skipped (856).
  - notes.md interim text (no row id): `platform/zh-TW/guide/notes.md`'s one
    `../../reference/attack-log-export-format.md` markdown link is now the plain-text sentence
    「詳細演算法見「公開匯出格式」參考頁。」, with no link. Grepped the test tree for
    `attack-log-export-format` first: every hit is a page-path fixture unrelated to this sentence's
    wording, so this edit has no test to turn green yet — its own acceptance (`docs:build` passing
    under both `P`) is gated on wave 1(f)'s `config.mts` wiring, not yet started, exactly as the
    plan said.
  - Row not done: **D108's move itself** (running T-0076's `planLayoutMove` on upstream's tree,
    writing `platform/en/…`, `platform/zh-TW/…` and the four `challenge.yaml` files). Stopped
    before it, as the confirmed plan directed: the irreversible, no-dry-run-first `planLayoutMove`
    run is still an unresolved user decision — wave 1(d)'s Comments (2026-11-16) raised it twice,
    and it is not among the Context section's D-numbered "Decisions to confirm" list — so
    proceeding would have put an unreviewed decision into the change. The real-tree half of U116
    and U131's second pass stay blocked on it, unchanged from wave 1(d)'s note.
  - Commands run, with exact counts:
    - `npx vitest run tests/unit/scripts/fork-init.test.ts` → 1899 passed (1899).
    - `npx vitest run tests/unit/scripts/upstream-guard.test.ts` → 117 passed, 1 failed, 1 skipped
      (119); the one failure is the real-tree case above.
    - `npx vitest run test/engine-apply.test.mjs` (create-wxl) → 6 passed (6).
    - `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test` → 39 test
      files passed (39); 855 passed, 1 skipped (856).
    - `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test
      --run` → 144 test files passed, 2 failed (146); 5277 tests passed, 2 failed (5279) — up from
      wave 1(d)'s 5275 by exactly 4 (this wave's new fork-init cases), carrying wave 1(d)'s one
      already-accepted failure (`locales.test.ts`'s B18 command 2, owned by waves 3/4) plus this
      wave's one new, expected failure (`upstream-guard.test.ts`'s real-tree pristine check,
      above). No other failure. The same unrelated `ECONNREFUSED 127.0.0.1:3000`/`::1:3000` stderr
      noise and the one `There are not applicable mutations for the input Wasm module.` line
      printed again, matching earlier waves' judgment on this noise.

- 2026-11-16 (wave 1, sub-step (f), partial — the wiring, minus the two rows D108 blocks): the
  executor ran the confirmed increment plan's sections A, B and C in order; section D was already
  deferred by the plan itself and stays deferred. One row inside section C (row 15, B50–B52) could
  not be done as planned and was reverted after empirical proof it breaks the real build; reported
  below rather than left half-applied.
  - **Section A (`.vitepress/challenge/plugin.ts`, `tests/unit/challenge/plugin.test.ts`): done,
    rows Y48, Y44, Y45, Y42, Y43, Y41, Y40, Y47, Y19, Y113.** New `assembleChallengeFrontmatter
    (sourcePath, frontmatter, rawSource, readDeclaration, locales)` (0010-S33); `readDeclaration`
    chosen as a slug-keyed callback `(slug) => DeclarationResult`, not `(root, slug)`, since the
    function itself is pure and has no filesystem root of its own — the caller (deferred to
    section D) closes over the root. Cycle 1 (Y48, `it.each` of home/list/guide/reference pages):
    red for the expected reason (`assembleChallengeFrontmatter is not a function`), green after a
    minimal brief-path classifier (`briefSlug`) returning `null` otherwise. The remaining seven
    rows' cases were written together and passed on the first run, because the full
    implementation (all PL-E13–E18 branches, in D78's literal order) was already written in one
    pass once the design was fixed from the spec text — a granularity deviation from one-row-one-
    cycle, matching the precedent wave 1(d) recorded for the same reason, not a row left undone.
    Before writing the merge, checked empirically (`node -e`, both with a plain object and with
    `yaml`'s own `parseDocument(...).toJS()`) that `Object.assign({}, frontmatter, declResult.value,
    {markdownBody})` repoints the result's own prototype away from `Object.prototype` for a
    `__proto__` key from `JSON.parse` of a string literal (not the `{ __proto__: … }` literal
    syntax, which is special-cased and never produces an own key at all), while object-spread
    (`{ ...frontmatter, ...declResult.value, markdownBody }`) keeps it an own key with
    `Object.getPrototypeOf(result) === Object.prototype`; used spread. `npx vitest run
    tests/unit/challenge/plugin.test.ts` → 24 passed (24, up from 5); `tests/unit/challenge/`
    (whole directory) → 151 passed (151).
  - **Section B: done.**
    - B80 (`tests/unit/i18n/theme-locale-wiring.test.ts`, new describe): red for the expected
      reason (`existsSync` of `.vitepress/theme/Layout.vue` was `true`); green after `rm
      .vitepress/theme/Layout.vue` — confirmed dead first with `git grep -n "theme/Layout" --
      .vitepress tests scripts create-wxl .github` (exit 1, no match) before deleting; the test's
      own `existsSync` call contains the literal path, so its own file is excluded from the grep
      scope via a pathspec exclusion, not just a built-at-runtime needle.
    - Y49 (new `.vitepress/challenge/slug.ts`, `slugFromRelativePath`; new
      `tests/unit/challenge/slug.test.ts`): red for the expected reason (module not found), green
      after the extracted helper (no flat `<slug>.md` fallback — chosen return value `undefined`,
      left open by the row's own "gone" wording). `ChallengeLayout.vue`'s `slug` computed now calls
      it (`?? ''`, keeping the computed's existing `string` contract). `npx vitest run
      tests/unit/layouts/` → 105 passed (105), including the pre-existing "derives slug from
      per-folder relativePath…" case, unchanged.
    - Y50 (new `tests/unit/layouts/ChallengeLayout-legacy-module.test.ts`, modelled on
      `ChallengeLayout-whitebox-source.test.ts`'s mocking pattern): red for the expected reason
      (silently fell through to the `fm.fs` fallback, `runtimeError` stayed `null`) — the `vi.mock`
      of `virtual_fs.js` had to declare `wasm_fs_list: undefined` explicitly rather than omit the
      key, because Vitest's mock proxy throws "No wasm_fs_list export is defined" on destructuring
      an undeclared key, which is a different, earlier red than the one this row names. Green after
      the guard (`typeof wasm_fs_list !== 'function'` → sets `runtimeError` naming `pnpm
      challenge:keygen` and returns, before `fm.value.fs` is ever read) and removing the now-dead
      `: Object.keys(fm.value.fs ?? {})` fallback branch (D76).
  - **Section C: rows 12, 13, 14, 16, 17 done; row 15 reverted and reported, not done.**
    - Built the "fixture root" mechanism the B14/B16/B47 preamble names (`buildFixtureRoot`,
      `importFixtureConfig` in `config-base.test.ts`): a temp dir under `os.tmpdir()` holding a
      copy of `.vitepress`, `node_modules` symlinked, a minimal two-locale `platform/`, and an
      optional root/`platform/`/`.vitepress/` `range.json` (the last two as decoys). Dynamic
      `import()` of the copied `config.mts` first failed with "Cannot find module" even for a
      trivial `.mjs` outside the repository, under plain Node too when traced back — isolated to
      Vite's dev-server file guard (`server.fs.allow`, default: project root only) also gating
      vite-node's SSR module loader. Fixed in `vitest.config.ts`
      (`server: { fs: { allow: ['.', tmpdir(), realpathSync(tmpdir())] } }`, both forms of
      `tmpdir()` because macOS symlinks `/var` to `/private/var` and Vite matches the resolved
      path) — a test-infrastructure prerequisite for the plan's own named mechanism, not a listed
      row, recorded here as the previous waves recorded test-construction fixes found in the same
      cycle. Confirmed no regression: `npx vitest run tests/unit/site/config-base.test.ts` stayed
      green throughout (87 → 112 over the whole section).
    - Row 12 (B14, B47, new describe in `config-base.test.ts`): red for the expected reason
      (`define?.__WXL_PRIMARY_LOCALE__` was `undefined`); green after `config.mts` reads
      `readPrimaryLocale(resolve(REPO_ROOT, 'range.json'))` into a module-level `primary` and adds
      `vite.define.__WXL_PRIMARY_LOCALE__: JSON.stringify(primary)`, placed right after the
      `SITE_BASE` check and before `SRC_DIR`'s page-list read, per the plan's literal order
      (`SITE_BASE`, `readPrimaryLocale`, …).
    - Row 13 (B16): both cases (SITE_BASE=x with a broken `range.json` rejects `/SITE_BASE/` not
      `PL-E03`; the same root alone rejects `PL-E03`) passed on the first run — the ordering was
      already correct from row 12's placement; a test-only row, no further implementation change.
    - Row 14 (B40, new `describe.runIf(realUpstreamDecision(...))`, the full 28-row "Source path →
      URL" table typed by hand against the zh-TW column, upstream-only per the preamble): red for
      the expected reason (`typeof config.rewrites` was `undefined`); green after
      `rewrites: (id) => rewrittenPath(id, primary)`.
    - Row 15 (B50, B51, B52) — **not done, reverted after empirical proof**: wrote the three cases
      (fixture `srcDir` trees under `<tmp>/platform/...` so `resolve(srcDir, '..')` lands on the
      fixture root for `readChallengeDeclaration`'s hard-coded `platform/challenge/<slug>/
      challenge.yaml`) and wired `transformPageData` to read `pageData.filePath`, call
      `assembleChallengeFrontmatter`, with a `readDeclaration` closure over `resolve(srcDir, '..')`
      — B50 went red for the expected reason (ENOENT on `relativePath`) and green after the
      rewrite; B51/B52 passed unchanged (their old code path happened not to depend on the
      distinction). Before trusting the three green unit tests, ran `pnpm docs:build` against the
      real, not-yet-moved tree with the wiring in place (not asked for by this wave's check list,
      but the same production function the unit tests exercise) and it failed: first
      `PL-E13: zh-TW/challenge/door-is-open/index.md: no platform/challenge/door-is-open/
      challenge.yaml for this brief` (the zh-TW translation already sits at a path shaped like a
      new-layout brief, `zh-TW/challenge/<slug>/index.md`, but `platform/challenge/<slug>/
      challenge.yaml` does not exist yet), and the still-flat English brief
      `challenge/door-is-open/index.md` would fail the same build with PL-E18 right after. This is
      the same D108-gating root cause the confirmed plan already used to defer
      `checkSourceLayout`, B70, Y1, Y38 and B43 — found here to extend to the assembly wiring
      itself, which the plan's row 15 did not flag as part of that group. Reverted: `config.mts`'s
      `transformPageData` is back to today's `extractMarkdownBody`/`relativePath` body (with a
      comment recording why and what `pnpm docs:build` said), and the three test cases were
      removed from `config-base.test.ts` rather than left red or skipped, since the seam they'd
      need does not exist in the shipped file. Re-ran `pnpm docs:build` after reverting: exit 0,
      `build complete in 5.68s` (same Rollup/eval warnings as before this wave, unrelated,
      pre-existing).
    - Row 16 (B60, B77, new describe): all three cases (title/description byte-equal; exactly one
      `A6_CANDIDATE_RE` line and one `const siteBase = ` line in `config.mts`'s own source text,
      read with `readFileSync`; `ignoreDeadLinks === undefined`) passed on the first run — a
      test-only row, nothing to wire.
    - Row 17 (B24, B25 + the `primaryFolderLinks` wiring): `srcExclude` case red for the expected
      reason (`undefined`), green after adding `srcExclude: ['challenge/*/src/**', 'public/**',
      'shared/**']`. `primaryFolderLinks(md, primary)` wired into `markdown.config` with no new
      test of its own, per the plan (existing `primary-folder-links.test.ts` already covers the
      pure function; B72–B75's real-tree/smoke rows are later). Checked for real-tree risk before
      trusting it: `git grep` found no markdown-body link anywhere under `platform/` resolving into
      `/zh-TW/...` (the only path PL-E11 would catch under today's default primary), and
      `pnpm docs:build` after wiring both this and `srcExclude` still exits 0.
  - **Section D: not done, as the confirmed plan already said, with one addition.** Still
    deferred: `checkSourceLayout` wired into `config.mts`, B70's unit half, Y1's read half, Y38,
    B43, and `processChallengeFrontmatter` re-pointed to run both validators (Y-O12/Y-q1 — not
    named by this wave's own row list; which wave claims it is still unconfirmed, as the plan's
    open question 3 asked). **Added to this list by this wave's finding**: B50–B52's production
    wiring in `transformPageData` (row 15 above) — discovered to be gated on D108 the same way,
    not previously flagged as such.
  - Commands run, with exact counts:
    - `npx vitest run tests/unit/challenge/plugin.test.ts tests/unit/challenge/slug.test.ts
      tests/unit/challenge/plugin-obfuscation.test.ts tests/unit/challenge/config.test.ts
      tests/unit/challenge/declaration.test.ts tests/unit/i18n/theme-locale-wiring.test.ts
      tests/unit/layouts/ChallengeLayout-legacy-module.test.ts tests/unit/layouts/
      ChallengeLayout.test.ts tests/unit/layouts/ChallengeLayout-whitebox-source.test.ts
      tests/unit/layouts/ChallengeLayout-tools-pyodide.test.ts tests/unit/site/
      config-base.test.ts` (the wave's affected files) → 11 test files passed (11); 380 passed
      (380).
    - `npx vitest run tests/unit/site/ tests/unit/challenge/ tests/unit/i18n/
      tests/unit/layouts/` (broader regression sweep) → 34 passed, 1 failed (35); 1395 passed, 1
      failed (1396) — the one failure is the pre-existing, already-accepted
      `locales.test.ts` B18 command 2 (owned by waves 3/4, unchanged since wave 1(d)).
    - `pnpm docs:build`, run four times across this wave at the points named above (after section
      A+B, after wiring row 15, after reverting row 15, after row 17) → exit 0 each time except
      the one deliberately-observed failure at row 15 (reported above, then reverted).
    - `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test
      --run` → 146 test files, 2 failed (148); 5327 passed, 2 failed (5329) — up from wave 1(e)'s
      5279 by exactly 50 new tests (19 in `plugin.test.ts`, 4 in `slug.test.ts`, 1 in
      `theme-locale-wiring.test.ts`, 1 in `ChallengeLayout-legacy-module.test.ts`, 25 net in
      `config-base.test.ts` — row 15's 3 added-then-removed cases net to 0). The two failures are
      both pre-existing and already accepted, unchanged from earlier waves: `locales.test.ts`'s B18
      command 2 (wave 1(d)) and `upstream-guard.test.ts`'s real-tree pristine check (wave 1(e), the
      same D108 gating). No other failure. The same unrelated `ECONNREFUSED 127.0.0.1:3000`/
      `::1:3000` stderr noise and `There are not applicable mutations for the input Wasm module.`
      line printed again, matching every earlier wave's judgment on this noise.
    - `pnpm --dir create-wxl test` not run: this wave touches neither `create-wxl/` nor fork:init.

- 2026-11-16 (wave 1, sub-step (g), not done — all six rows blocked on (e)/(f)): the executor
  re-verified the confirmed plan's own finding against the live working tree (`git status`,
  `git diff --stat HEAD`, `ls platform/`, a direct read of `.vitepress/config.mts`'s `locales:`
  block) before writing any test, rather than trusting the plan text alone. Confirmed
  independently: `platform/en/` still does not exist (D108's `planLayoutMove` has not run on the
  upstream tree); `config.mts`'s `locales:` block is still the pre-switch literal (`root` =
  English, `zh-TW` carrying the `/zh-TW/` prefix), not `localesConfig(primary)`; and the comment
  at `config.mts` naming "D108 blocks wiring area Y's assembly … Left as today's version … until
  D108's move lands" is still present verbatim. Wave 1(f)'s own Comments entry (above) confirms
  this is not a stale read: section D (`checkSourceLayout`, B70, Y1, Y38, B43, and B50–B52's
  `transformPageData` wiring) was explicitly left deferred on D108, and the `locales:` wiring
  itself was never in wave 1(f)'s scope (sections A–C) at all.
  - Rows not done: **B48, B59, B61, B70 (smoke half), B81, B82** — all six, for the same reason.
    Every planned case (literal-string URL assertions against `/en/...` vs. root, `<html lang>`,
    home-link hrefs, the VitePress default nav-title link, and the three existing B82 cases
    rewritten to `/en/...`) depends on the root path actually serving the primary locale (zh-TW)
    and `/en/` actually serving the translation, which in turn depends on wave 1(e)'s real-tree
    move and wave 1(f)'s `locales`/`rewrites` wiring landing. Neither has landed. Writing any of
    the six cases now would turn them red for the shared, non-row-specific reason that
    `platform/en/` does not exist and the root locale is still English — not a defect in any of
    the six rows' own design — and fixing that red by editing `config.mts`/`pageList.ts` here
    would fold (e)'s and (f)'s undone scope into (g), which is not this wave's row list to decide.
    No file was written or edited in `tests/site-smoke/site-smoke.spec.ts` or
    `playwright.site.config.ts`.
  - Unresolved blocker, unchanged since wave 1(d)/(e)'s notes: whether to run `planLayoutMove` on
    the real upstream `platform/` tree now, irreversibly and without a dry-run diff shown first,
    together with the `notes.md` interim edit's own full landing. This remains an open user
    decision, not something this wave can settle by proceeding.
  - Commands run, with exact counts (no wave-specific test files exist to run, since no row was
    implemented; ran the full suite only to confirm no drift since wave 1(f)):
    - `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test
      --run` → 146 test files, 2 failed (148); 5327 passed, 2 failed (5329) — unchanged from wave
      1(f)'s ending counts. The two failures are the same two already-accepted, pre-existing ones:
      `locales.test.ts`'s B18 command 2 (wave 1(d)) and `upstream-guard.test.ts`'s real-tree
      pristine check (wave 1(e), the same D108 gating). No other failure, no regression.
    - `pnpm --dir create-wxl test` not run: this wave touches neither `create-wxl/` nor fork:init.
    - Playwright's `tests/site-smoke/site-smoke.spec.ts` not run: no edit was made to it, and
      running it against the current, unmoved `dist/` would not exercise anything this wave
      changed.

- 2026-11-16 (parent, wave 1(e) authorization and dry-run). The move D108 produces is authorized by
  the user in chat on 2026-11-15, quoted: 「所有建議我都同意，權限都授權到兩個 epic 完成，範圍照 handoff
  的「已核准的決定與授權」」. The handoff's approved scope includes every ticket's implementation, and
  T-0077's approved test plan says wave 1(e) runs T-0076's `planLayoutMove` on upstream's tree. The
  earlier entries above that call this "an open user decision" are superseded by this entry. The
  move is a file change on this ticket branch, reversible through git (base commit `8ddc422`). The
  parent ran the dry-run read-only (a scratchpad script feeding `git ls-files -z -- platform` with
  each file's bytes and mode to `planLayoutMove`); its output:

```
result keys: legacy,ops,mismatches
legacy: true op counts: {"move":14,"declare":4,"strip":4}
move platform/challenge/door-is-open/index.md -> platform/en/challenge/door-is-open/index.md
declare platform/challenge/door-is-open/index.md -> platform/challenge/door-is-open/challenge.yaml
move platform/challenge/just-a-preview/index.md -> platform/en/challenge/just-a-preview/index.md
declare platform/challenge/just-a-preview/index.md -> platform/challenge/just-a-preview/challenge.yaml
move platform/challenge/selected-excerpts/index.md -> platform/en/challenge/selected-excerpts/index.md
declare platform/challenge/selected-excerpts/index.md -> platform/challenge/selected-excerpts/challenge.yaml
move platform/challenge/staff-only/index.md -> platform/en/challenge/staff-only/index.md
declare platform/challenge/staff-only/index.md -> platform/challenge/staff-only/challenge.yaml
move platform/challenges.md -> platform/en/challenges.md
move platform/guide/browser.md -> platform/en/guide/browser.md
move platform/guide/index.md -> platform/en/guide/index.md
move platform/guide/network.md -> platform/en/guide/network.md
move platform/guide/notes.md -> platform/en/guide/notes.md
move platform/guide/python.md -> platform/en/guide/python.md
move platform/guide/troubleshooting.md -> platform/en/guide/troubleshooting.md
move platform/guide/workshop.md -> platform/en/guide/workshop.md
move platform/index.md -> platform/en/index.md
move platform/reference/attack-log-export-format.md -> platform/en/reference/attack-log-export-format.md
strip platform/zh-TW/challenge/door-is-open/index.md -> platform/zh-TW/challenge/door-is-open/index.md
strip platform/zh-TW/challenge/just-a-preview/index.md -> platform/zh-TW/challenge/just-a-preview/index.md
strip platform/zh-TW/challenge/selected-excerpts/index.md -> platform/zh-TW/challenge/selected-excerpts/index.md
strip platform/zh-TW/challenge/staff-only/index.md -> platform/zh-TW/challenge/staff-only/index.md
mismatches: [{"brief":"platform/zh-TW/challenge/selected-excerpts/index.md","key":"source_files","enValue":["/workspace.py","/revisions.py","/course_pack.py","/templates/base.html","/templates/workbench.html","/templates/article.html","/templates/preview.html","/templates/course-pack.html","/templates/missing.html","/static/app.css"],"value":["/templates/base.html","/templates/workbench.html","/templates/article.html","/templates/preview.html","/templates/course-pack.html","/templates/missing.html","/static/app.css"]}]
```

  Expected per U130–U134 and U147: 14 `move`, 4 `declare`, 4 `strip`, no failure, one mismatch
  (selected-excerpts `source_files`, kept English, R16/U147). The executor applies exactly these ops
  with the planner's bytes.

- 2026-11-16 (wave 1, sub-step (e), the move itself, D108): done — the one row wave 1(e)'s Comments
  (above) left undone. Applied on the authorization and dry-run the parent recorded: re-ran
  `planLayoutMove` on `git ls-files -s -- platform` (bytes via `fs.readFileSync`, mode from the index)
  in a scratchpad script before touching anything; its output matched the recorded dry-run byte for
  byte (`legacy:true`, `{"move":14,"declare":4,"strip":4}`, the same 18 paths in the same order, the
  same one mismatch, `failures:null`) — no drift since the authorization entry. Applied exactly those
  18 ops with the planner's own bytes: each `move` wrote `to` (creating parent directories, `chmod`
  to the source's own mode) then deleted `from`; each `declare` wrote `to`
  (`platform/challenge/<slug>/challenge.yaml`, mode `644`, the op carries no mode field of its own);
  each `strip` overwrote its `path` in place. `git add -A -- platform` staged all 22 resulting paths
  (14 renames — 4 of which also split off a new `challenge.yaml` — plus 4 new `challenge.yaml` adds
  plus 4 in-place modifies); `git ls-files -s -- platform` shows every path still `100644`, no mode
  changed. Verification: re-ran the same planner script against the new tree — `{legacy:false,
  op counts:{"move":0,"declare":0,"strip":0}, mismatches:[], failures:null}`, exactly as required.
  - `npx vitest run tests/unit/scripts/upstream-guard.test.ts -t "real tree"` → 4 passed, 115 skipped
    (119) — the real-tree pristine check (previously the one red case) is green.
  - `npx vitest run tests/unit/scripts/upstream-guard.test.ts` (full file) → 119 passed (119), up from
    117 passed/1 failed/1 skipped; the one prior failure (the real-tree pristine check) is gone, no
    new failure.
  - `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test
    --run` → 4 test files failed, 144 passed (148); 6 tests failed, 5323 passed (5329). The real-tree
    pristine check that was wave 1(e)'s one carried failure is gone (net one fewer failure than wave
    1(f)/1(g)'s ending count of 2, plus five new failures this move itself causes by removing
    `platform/challenge/<slug>/index.md` as a legacy path — all five are reported below, each
    attributed to a specific later wave, not fixed here, per this wave's own row list):
    - `tests/unit/i18n/locales.test.ts` › B18 command 2 — pre-existing since wave 1(d)/1(f)/1(g),
      unrelated to this wave, owned by waves 3/4.
    - `tests/unit/site/redirects-generated.test.ts` › "the committed _redirects › is byte-identical to
      what the challenge tree generates" — this file is RG, named by wave 4's row S28 ("committed
      `_redirects` byte-identical to generation … on upstream the S-§4.1 file"); `_redirects`
      regeneration against the new layout is wave 4's row, not this one's.
    - `tests/unit/site/redirects.test.ts` › three cases ("gives every challenge in git's index its
      four rules…", "resolves every parameterised target prefix to a directory of challenges…",
      "resolves every literal target to a page") — this file is RT, named by wave 4's rows S28/S34;
      same reason as above.
    - `tests/unit/scripts/challenge-keygen.test.ts` › "keygen aborts, names the slug, and leaves
      frontmatter and the published module alone when the built module fails the payload check ›
      exits non-zero with [slug] and \"payload integrity\", leaving index.md and runtime.wasm
      untouched" (counted twice in the run, once per vitest retry attempt, one failed test) — this is
      traceability.md's row Y59 verbatim: "today's test, re-pointed from `index.md`" to
      `challenge.yaml`; the re-pointing is wave 5's ("keygen: … Y52–Y61 …"), not done here.
    No other failure; no regression outside these five, each independently traced to a named later
    wave.
  - `pnpm --dir create-wxl test` not run: this wave's only change is to `platform/`; grepped
    `create-wxl/test/*.mjs` for a dependency on the real tree first — the one hit,
    `layout-move.test.mjs`, reads only its own `create-wxl/test/fixtures/layout-move/door-is-open/`
    fixtures, never the repository's `platform/`, so create-wxl's suite is unaffected.
  - No row left undone for this sub-step; wave 1(e) is now complete.

- 2026-11-16 (wave 1(f), section D — the parent's go-ahead): the executor ran the confirmed
  increment plan's 8 rows in order, on top of the landed D108 move (wave 1(e)). All 8 rows done;
  no row left undone.
  - Row 1 (B70 unit half): added `describe.runIf(realUpstreamDecision(REPO_ROOT))('B70: upstream\'s
    home pages', …)` to `tests/unit/site/home-links.test.ts`, reading the real
    `platform/en/index.md` and `platform/zh-TW/index.md` frontmatter and calling
    `localizeHomeLinks` with `pageListFromDir(SRC_DIR, primary)`, both `P`, against the "Home-page
    links" table. Red for the expected reason on the first run — confirmed by temporarily
    reverting the companion content edit below and re-running: `PL-E12: "zh-TW/index.md" has
    hero.actions[0].link "/zh-TW/challenges/", which already carries a locale prefix…` — because
    `platform/zh-TW/index.md`'s hero links were still written in the pre-switch, self-prefixed form.
    Green after editing `platform/zh-TW/index.md`'s two hero `link` values from `/zh-TW/challenges/`
    and `/zh-TW/guide/` to `/challenges/` and `/guide/` (the content edit Implementation waves
    1(f) itself lists as "the hero links in `platform/{en,zh-TW}/index.md` (B70's unit half)";
    `platform/en/index.md` already matched the table's "Written" column and needed no edit).
    Checked no other test pinned the old content first (`grep -rn` for the written literals and
    for `zh-TW/index.md`/`en/index.md` across `tests/`): none did. `npx vitest run
    tests/unit/site/home-links.test.ts` → 38 passed (up from 36).
  - Row 2 (`checkSourceLayout` wired into `config.mts`, D6/D19 order): added the import and one
    call, `checkSourceLayout(resolve(REPO_ROOT, SRC_DIR), primary)`, immediately after `primary` is
    read and before the page list / `defineConfig` call; rewrote the now-stale "not yet wired here"
    comment. As the plan itself said, no row-specific red test exists at this layer; verified by
    regression (below) and by `pnpm docs:build` reaching Rollup bundling (past every `defineConfig`
    evaluation step, including this call) with no `PL-E0x` thrown.
  - Row 3 (`locales: localesConfig(primary)`): replaced the 44-line literal `locales` object with
    one call to the already-tested `localesConfig` (import added). Verified the same way as row 2:
    `locales-config.test.ts`'s B56/B57 already deep-equal this literal against both schemas, so this
    is "replace with an already-verified equivalent", not a new seam.
  - Row 4 (defines; B43): `tests/unit/i18n/page-list.test.ts`'s existing describe "the page list the
    site configuration ships" rewritten: its oracle now reads the real `range.json` through
    `readPrimaryLocale` and strips `<P>/` itself, instead of comparing against an unstripped walk.
    Red for the expected reason on the first run: `config.mts` still called
    `pageListFromDir(resolve(__dirname,'..',SRC_DIR))` with one argument, so the shipped list carried
    `/zh-TW/...` and `/en/...` segments the P-aware oracle had already stripped from the primary
    side — a large array diff, oracle vs. shipped. Green after hoisting
    `const pages = pageListFromDir(resolve(REPO_ROOT, SRC_DIR), primary)` to module scope (so the
    `transformPageData` row below can reuse the exact same list) and pointing `__WXL_PAGES__` at it.
    `npx vitest run tests/unit/i18n/page-list.test.ts` → 101 passed.
  - Row 5 (`transformPageData` by `filePath`, B50–B52): added three cases to a new describe in
    `tests/unit/site/config-base.test.ts`, reusing the already-built fixture-root mechanism's
    sibling idea (a throwaway `srcDir` under `os.tmpdir()`, not the repository root, so no real-tree
    mutation). Red for the expected reason on the first run (B50 only — B51/B52 passed unchanged,
    exactly as the previously-reverted attempt's note predicted): `ENOENT` on `relativePath`, because
    today's `transformPageData` still read `pageData.relativePath`, not `pageData.filePath`. Green
    after rewriting `transformPageData` to read `filePath`, call
    `assembleChallengeFrontmatter(sourcePath, pageData.frontmatter, raw, readDeclaration, LOCALES)`
    (`readDeclaration` a closure over `resolve(ctx.siteConfig.srcDir, '..')`), replace
    `pageData.frontmatter` when assembly returns non-null, then unconditionally run the result
    through `localizeHomeLinks(pageData.frontmatter, pageLocale, primary, pages)` when
    `pageLocale = sourcePath.split('/')[0]` is a known locale. Unlike the attempt wave 1(f)'s earlier
    Comments entry reverted, this one holds on the real tree, because D108's move (wave 1(e)) has
    since landed: re-ran `pnpm docs:build` after wiring — it now gets past every brief/declaration
    page (no `PL-E13`/`PL-E17`/`PL-E18`), confirming the wiring itself is correct (see the separate,
    unrelated finding below for why the build still does not reach exit 0). `npx vitest run
    tests/unit/site/config-base.test.ts` → 116 passed (up from 112).
  - Row 6 (Y1 read half): added `describe.runIf(realUpstreamDecision(REPO_ROOT))` to
    `tests/unit/challenge/declaration.test.ts`, reading the four real `challenge.yaml` files and
    deep-equalling Y-§2.4's literal (typed in the test). Green on the first run, no production
    change, as the plan predicted (`readChallengeDeclaration` was already correct; only the real
    files were previously missing). `npx vitest run tests/unit/challenge/declaration.test.ts` → 31
    passed (up from 27).
  - Row 7 (Y38): added a plain (not upstream-only, per AC-61) describe to
    `tests/unit/challenge/plugin.test.ts` enumerating every real `platform/challenge/<slug>/` that
    carries a `challenge.yaml`, and for every listed locale with a brief, asserting the assembled
    keys equal brief ∪ `challenge.yaml` keys ∪ `markdownBody`, and that the declaration projection
    (the assembled result minus the brief's own keys and `markdownBody`) is identical across
    locales. Green on the first run, no production change. While running the full suite afterwards
    (see below), found that enumerating slugs by directory alone (not filtering on `challenge.yaml`
    existing) occasionally picked up `challenge-keygen.test.ts`'s transient real-tree test fixture
    `platform/challenge/keygen-source-files-probe/` (that test writes directly into the live
    repository tree, pre-dating this ticket, and removes it in `afterEach`) when the two test files
    happened to run concurrently — the probe directory has no `challenge.yaml`, so the new test's own
    `expect(declResult.ok).toBe(true)` failed for it. Fixed by filtering the slug enumeration to
    directories that actually hold a `challenge.yaml` (the correct definition of "declared slug"
    under D78 regardless of the race; a legacy flat-brief fixture is not one). `npx vitest run
    tests/unit/challenge/plugin.test.ts` → 29 passed (up from 24), stable across 5 repeated runs
    after the fix.
  - Row 8 (confirmation):
    - `pnpm docs:build` on the real, moved tree: **does not exit 0**, for a reason entirely outside
      this wave's row list. First error: `Could not resolve "./shared/challenges.data.ts" from
      "platform/en/challenges.md"` — `platform/en/index.md` and `platform/en/challenges.md` still
      import the loader with the pre-move relative path (`./shared/…`), which needs `../shared/…`
      one level deeper after D108's move. Confirmed this is not caused by rows 1–7: D95 says the
      transform deliberately leaves "relative links, `./shared/` imports and every other difference
      … to the three-way merge", and D14/D40/B79/B84 step 4 assign exactly this fix — rewriting the
      loader imports (and, per D40, consolidating `challenges.data.ts`/`challenges.zh-TW.data.ts`
      into one loader) — to wave 3 ("Lists and smoke fixtures": B79, `platform/shared/
      mergeChallenges.ts` and `challenges.data.ts`, "the four list and home pages"), not to section
      D. Not fixed here: editing the loader/list pages is wave 3's named scope, and the Implementation
      waves preamble allows the branch to stay red between waves. Reported rather than guessed.
    - `npx vitest run tests/unit/site/config-base.test.ts tests/unit/i18n/page-list.test.ts
      tests/unit/challenge/declaration.test.ts tests/unit/challenge/plugin.test.ts
      tests/unit/site/home-links.test.ts` (the wave's affected files) → 5 test files passed; 315
      passed.
    - `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test
      --run`, with `--no-file-parallelism` (deterministic; see the race finding below) → 144 test
      files passed, 4 failed (148); 5338 tests passed, 6 failed (5344) — up from wave 1(e)'s 5323
      passed/5329 total by exactly 15 net new tests (2 B70, 4 B50–B52, 4 Y1, 5 Y38; B43's row is a
      same-size rewrite). The 4 failed files/6 failed tests are exactly wave 1(e)'s already-accepted,
      unchanged carry-overs (owned by waves 3/4/5, each named in that wave's own Comments entry):
      `locales.test.ts` B18 command 2; `redirects-generated.test.ts`'s byte-identical case;
      `redirects.test.ts`'s three cases; `challenge-keygen.test.ts`'s Y59 case (counted twice by
      vitest's own retry). No new failure, no regression.
    - **Finding, reported rather than fixed: `pnpm test --run` in its default (parallel) mode is
      intermittently flaky after this wave's `checkSourceLayout`/`pageListFromDir` wiring**, because
      `challenge-keygen.test.ts`'s "challenge-keygen CLI rejects an unusable source_files entry"
      describe writes `platform/challenge/keygen-source-files-probe/index.md` directly into the
      live repository tree (not a copy) for the duration of its own `it`s, removing it in
      `afterEach`. Any test that dynamically imports the real `config.mts` during that window now
      also runs `checkSourceLayout` over the whole real tree (rows 2 and 4 of this wave), which
      correctly reports `PL-E08` for that transient file — a page outside the locale folders. Ran
      the exact required command four times: twice it matched the clean, deterministic count above
      exactly; twice it additionally and non-reproducibly failed one or more of `B14`/`B40`/`B50–52`
      (config-base.test.ts) or the B43 oracle (`page-list.test.ts`), whichever test happened to
      import `config.mts` while the probe directory existed. This is not a defect in rows 1–7 (the
      race-free `--no-file-parallelism` run above is clean) and not something this wave's row list
      can fix: the correct fix is `challenge-keygen.test.ts` running that describe's CLI against a
      temporary copy of the repository rather than the live tree — the same approach Y55's own row
      text already prescribes for a different keygen case — which is wave 5's scope
      (Y52–Y61), not section D's. Flagged here for the parent rather than silently patched.
    - `pnpm --dir create-wxl test` not run: this wave's files are all under `.vitepress/`, `tests/`
      and one content file (`platform/zh-TW/index.md`); none touch `create-wxl/` or fork:init.
  - Still deferred, unchanged: `processChallengeFrontmatter` re-pointed to run both validators
    (Y-O12/Y-q1) — its owning wave is still unconfirmed (open question 3), and was explicitly out of
    this go-ahead's named scope (`checkSourceLayout`, `transformPageData`, `locales`, the defines).

- 2026-11-16 (parent, new session; standing authorization renewed). The user, in chat on 2026-11-16,
  quoted: 「授權：所有建議我都同意，權限都授權到兩個 epic 完成，範圍照上一份 handoff
  （.proj.handoffs/2026-11-15-0034-primary-locale-epics.md）的「已核准的決定與授權」。每一項核准仍要列給我看。
  executor 要我決定的事，請在票的 Comments 引用我這段話並寫明範圍。」 Scope: every remaining wave of this
  ticket's approved test plan (1(f) remainder, 1(g), 2–9), stages 6–9, and the decisions an executor
  would otherwise refer to the user inside those waves, provided the decision follows the approved
  test plan, the spec revision 2.3 and the agent's recommendation, and is listed to the user. Not in
  scope, and still stopped for the user in person: creating or deleting a GitHub repository (including
  stage 8's F-3 temporary range), pushing or deleting the stage 8 fixture branches (`stage8/T-0077`,
  `stage8/T-0077-en`), any release (`v*` tag), RP2, RP5, and any step that needs the user's npm login.
  The parent also confirmed the untracked `platform/challenge/keygen-source-files-probe/` came from
  `tests/unit/scripts/challenge-keygen.test.ts` (its "CLI rejects an unusable source_files entry"
  describe writes into the live tree and removes it only in `afterEach`), and removed it.

- 2026-11-16 (parent, verification of 1(f) section D, and why D108's move is not committed yet). Re-ran
  `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test --run
  --no-file-parallelism` on the working tree (move + section D): 144 files passed, 4 failed (148); 5338
  passed, 6 failed (5344) — identical to the section D entry above, the same six carried failures.
  Committing the staged move then failed in the pre-commit hook, which changed nothing:
  `challenge-lint-staged` reported `incomplete challenge (missing index.md)` for all four slugs, and the
  orphan-brief check (`scripts/pre-commit.sh` 485–509) would follow, because both still read
  `platform/challenge/<slug>/index.md`. Those are rows of waves 5 (Y88, Y89), 6 (S36–S49) and 4 (the
  generator the hook calls). Decision, under the standing authorization above, without `--no-verify` or
  `SKIP_SIMPLE_GIT_HOOKS`: everything under `platform/` (the move, and section D's hero-link edit to
  `platform/zh-TW/index.md`) stays in the working tree, uncommitted, until the hook accepts the new
  layout; changes outside `platform/` are committed as checkpoints wave by wave. The move is reproducible
  from `planLayoutMove` (the entry above records its output), and the parent kept a binary patch of it.
  Next in wave 1(f): section E — Y-O12 (`processChallengeFrontmatter` re-pointed to run both validators,
  Y-q5: `validateChallengeBrief` gets the `BRIEF_KEYS` projection, `validateChallengeDeclaration` the
  rest) and removing `validateChallengeConfig` (Y-q1, settled by traceability revision 2.3's closing
  paragraph); owner wave 1(f), because the function lives in `.vitepress/challenge/plugin.ts`.

- 2026-11-16 (wave 1(f) section E + 1(g), the executor ran the confirmed increment plan's two parts
  in order). PART 1 (section E) done in full, PART 2 (1(g)) written in full but every row stays red
  for the shared, non-row-specific reason wave 1(g) already carries (wave 3's `./shared/
  challenges.data.ts` import path, B79): no row's own design is at fault.
  - **Y-O12 cycle 1** (`processChallengeFrontmatter` re-pointed): new case in `plugin.test.ts`,
    describe "processChallengeFrontmatter - validators", `throws when app is not a string
    (validateChallengeDeclaration now checked)`. Red for the expected reason: `expected [Function]
    to throw an error` (`validateChallengeConfig` never checked `app`'s type). Green after rewiring
    `plugin.ts`: `processChallengeFrontmatter` now splits its input into a `BRIEF_KEYS` projection
    and the rest, calls `validateChallengeBrief`/`validateChallengeDeclaration` on each (Y-q5), and
    builds `ProcessedChallenge` from `brief.title`/`brief.description` plus the declaration's other
    fields; the `validateChallengeConfig` import is gone from this file. `npx vitest run
    tests/unit/challenge/plugin.test.ts` → 30 passed (up from 29).
  - **Y-O12 cycle 2** (D149's "[RED] no sensitive data" case, re-confirmed): `plugin-obfuscation.test.ts`
    › "output does not contain fs_key, fsKeyParts, encryptedFs, or flagVerifier" — green on the first
    rerun after cycle 1, no implementation change, as the plan predicted (`ProcessedChallenge`'s shape
    is unchanged by the rewiring).
  - **D76/`detectLegacyFields` re-wiring cycle 1**: `plugin-obfuscation.test.ts` › "detects all legacy
    fields when present", assertion changed `toHaveLength(4)` → `toHaveLength(5)`. Red for the
    expected reason: `expected [ …(4) ] to have a length of 5 but got 4` (`LEGACY_FIELDS` still had 4
    keys). Green after adding `'fs'` to the front of `LEGACY_FIELDS` in `config.ts` (D76).
  - **D76 cycle 2** (the predicted knock-on): adding `'fs'` flipped `plugin-obfuscation.test.ts` ›
    "returns empty array when no legacy fields present" red, as the plan named in advance (`BASE`
    itself carries `fs`): `expected [ Array(1) ] to have a length of +0 but got 1`. Green after
    changing that one case's input to a `{ fs, ...withoutFs } = BASE` projection, assertion unchanged
    (`toHaveLength(0)`); `BASE` itself is untouched (the other two cases in the file still need it to
    carry `fs`). `npx vitest run tests/unit/challenge/plugin-obfuscation.test.ts` → 3 passed.
  - **Y-q1** (remove `validateChallengeConfig`): not removed, per the plan's own `cannot_do_alone`
    row. `git grep -n "validateChallengeConfig" -- .vitepress scripts tests create-wxl` confirms the
    only caller left after cycle 1 outside `config.ts`/`config.test.ts` is `plugin.ts`'s own import,
    now gone; `scripts/challenge-analyze.ts:17,142`, `scripts/challenge-validate.ts:18,101` and
    `tests/unit/scripts/create-challenge.test.ts:3,156` (plus `tests/challenge-analyze.test.ts` and
    `tests/challenge-validate.test.ts`'s many existing cases) still call it directly — all wave 5
    ("Tools and skills"). `.vitepress/challenge/config.ts`'s `validateChallengeConfig` and
    `tests/unit/challenge/config.test.ts` stay exactly as they are; the function is removed, and the
    traceability.md row 1733 "Overridden contracts" line rewritten, only at wave 5. No file edited for
    this row.
  - `npx vitest run tests/unit/challenge/` (the wave's full affected directory) → 7 files, 165 passed.
  - **PART 2, wave 1(g)'s six built-site rows**: `tests/site-smoke/site-smoke.spec.ts` gained six new
    tests (B48, B59, B61, B70 smoke half, two for B81) and `playwright.site.config.ts`'s pinned-locale
    comment was rewritten to the post-switch reason; the three existing B82 cases had their `goto`
    paths (and the final asserted pathname) changed from unprefixed to `/en/...`, with no other
    change. Re-verified the shared blocker directly before writing anything (not trusted from the
    handoff text alone): `pnpm docs:build` on the real tree still fails at the same place wave 1(f)'s
    Comments recorded — `Could not resolve "./shared/challenges.data.ts" from
    "platform/en/index.md"` — so `.vitepress/dist` is still the pre-move build (dated 05:44, no
    `dist/en/`). Ran `pnpm test:smoke -g` filtered to the nine affected tests
    (`playwright test --config playwright.site.config.ts`): all nine failed, every one tracing to that
    one shared cause, not to any row's own design:
    - B48, B59, B70 (smoke half): `ENOENT` reading `.vitepress/dist/en/...` (no `en/` in the stale
      dist) or, for B59's primary-locale half, a mismatched `lang` value (the stale dist's root is
      still English).
    - B61: `ENOENT` reading `.vitepress/dist/en/guide/notes.html`.
    - B81 (both cases): `getByRole('link', {name: …}).toBeVisible()` times out — the stale dist's `/`
      is English and it has no `/en/` tree at all.
    - B82's three rewritten cases: `goto('/en/...')` resolves against the stale dist's English root,
      so the English content the assertions expect is not where the rewritten path now points (no
      `/en/` route exists yet); the two unrewritten passing cases from before this edit are unaffected.
    None of the nine failures is a defect in this wave's test code; all are the same wave-3 blocker
    the plan named in advance. No production file was edited to make any of the nine pass (the
    handoff forbids touching the loader this wave), per the plan's own `cannot_do_alone` entry for
    this part.
  - **Full-suite command** (as named), run twice to get one clean, complete report (the first run's
    stdout/stderr interleaving hid the final summary behind an unrelated crash dump — see the finding
    below): `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm
    test --run --no-file-parallelism` → **Test Files 5 failed | 143 passed (148); Tests 7 failed |
    5338 passed (5345)**. Six of the seven are the carried, already-accepted failures named in the
    handoff, unchanged: `locales.test.ts` B18 command 2 (waves 3/4); `redirects-generated.test.ts`'s
    byte-identical case (wave 4); `redirects.test.ts`'s three cases (wave 4); `challenge-keygen.test.ts`'s
    Y59 payload-integrity case (wave 5, printed twice across vitest's own retry, one failing test).
  - **New finding, not caused by this wave, reported rather than guessed around**: a seventh failing
    test appeared that the handoff's "six tests currently failing" list does not name —
    `tests/unit/scripts/upstream-guard.test.ts` › "real tree (upstream only)" › "the pristine check
    finds no mismatch", `expected [ 'A7:platform/en/index.md' ] to deeply equal []`. Traced before
    reporting: `pristineMismatches` reads its files through `realTreeFiles()`, which only includes
    `trackedFiles()` (git-index entries); `git ls-files platform/en/index.md` returns nothing while
    `git ls-files platform/zh-TW/index.md` does, confirming `platform/en/` is currently untracked, not
    merely uncommitted — consistent with `git status --porcelain` showing `?? platform/en/` rather
    than a staged add. `pristineMismatches`'s A7 check then reads `get('platform/en/index.md')` as
    `undefined` and reports the mismatch on that ground alone, independent of the file's actual
    content (confirmed separately: calling `findA7Candidates`/`parseA7ScalarValue` directly against
    the real file's bytes returns `"WXL"`, the correct value). This file is untouched by both parts of
    this wave (`plugin.ts`, `config.ts`, `plugin.test.ts`, `plugin-obfuscation.test.ts`,
    `site-smoke.spec.ts`, `playwright.site.config.ts` — none reads or writes git state or
    `platform/en/index.md`), so the failure is not this wave's regression; it is a consequence of
    `platform/` being unstaged, which an earlier wave's parent entry (above, "verification of 1(f)
    section D") already decided and recorded, apparently without noticing this test depends on the
    index rather than the work tree. Not fixed here: fixing it would mean `git add -- platform/en`,
    which both the handoff and the hard git-index rule for this run forbid. Flagged for the parent:
    either accept this as a seventh carried failure until `platform/` is staged again, or re-check
    whether `realTreeFiles()`/`trackedFiles()` should read the work tree directly for this one row.
  - `pnpm --dir create-wxl test` not run: this wave's files are all under `.vitepress/`, `tests/` and
    `playwright.site.config.ts`; none touch `create-wxl/` or fork:init.
  - No row left undone within this wave's own scope (Y-O12 section E, Y-q1's audit, and the six
    1(g) rows' test code); the six 1(g) rows' own transition to green waits on wave 3, as the plan
    said it would.

- 2026-11-16 (wave 1(g) and 1(f) E, review fixes): two independent reviewers agreed on a shared set
  of findings against the previous entry's work; the executor applied the parent's fully specified
  fix list under the user's standing authorization of 2026-11-15, item by item.
  1. **B48** (`site-smoke.spec.ts`): the whole-document `distFile(...).toContain('Code 面板'/'Code
     Panel')` check could never fail, because `__VP_SITE_DATA__`'s inlined sidebar repeats both
     strings as static per-locale nav text on every built page regardless of which page's body
     built the file. Added a `mainContent(html)` helper (`<main>…</main>` only, the inlined script
     sits outside it) and scoped both assertions to it. Confirmed against the real (stale) dist that
     the whole document contains `'Code Panel'` while the `<main>` region of the Chinese page does
     not, so the extraction changes which strings are visible to the assertion.
  2. **B70 smoke half**: the href assertions (`toContain('href="/challenges/"')`, etc.) were also
     satisfied by the nav bar's own links to the same URLs. Added `heroActionsHtml`/`heroActionHrefs`
     helpers that isolate VitePress's `.VPHero`/`.actions` block (`VPHero.vue`'s rendering, confirmed
     by reading the installed `vitepress` package's component source) with a brace-balanced scan, not
     a non-greedy regex, because the block nests one `<div class="action">` per hero action. Verified
     in a scratch script (not by editing content) that a hand-written HTML string whose nav links to
     `/challenges/` but whose hero action links to `/zh-TW/challenges/` now fails the assertion, where
     the old whole-document check would have passed.
  3. **B81**: case 1 (stored `zh-TW`, `goto('/')`) now also waits for hydration and asserts
     `new URL(page.url()).pathname === '/'` (D24: a cold load only redirects when the stored value is
     the *translation* locale; a stored value already matching the primary locale, as here, never
     redirects), so the row fails on the pre-switch layout, where `/` served English and a
     `zh-TW`-stored visitor would have been redirected away from `/`. Case 2 (stored `en`,
     `goto('/en/')`) now sets the stored value itself with `addInitScript`, as the test plan's
     boundary condition for B81 says, instead of relying on `playwright.site.config.ts`'s global pin.
  4. **Skip reason, all five rows (B48, B59, B70 smoke half, both B81 cases)**: replaced each
     hand-written `test.skip(!realUpstreamDecision(process.cwd()), '…')` with a direct call to
     `upstreamOnlySkipReason` (D124/B93) against one module-level `UPSTREAM_DECISION_INPUTS`, so
     B93's stage-6 grep finds each by name. B61 and the pre-existing, out-of-scope S08 row are
     untouched (B61 per item 5 below; S08 was not added by this wave).
  5. **B61 and B82**: confirmed they are not upstream-only and do hard-code `P = zh-TW` paths, and
     left them exactly as written — D54's `localePath` helper is wave 3's (cross-area note 7), so no
     helper is invented here. Recorded instead, as decision (c) below.
  6. Removed the time-bound sentence in `site-smoke.spec.ts`'s wave-1(g) banner comment ("as of this
     wave … until wave 3 lands"); the ticket's Comments carry that status, not the source comment.
     Rewrote `playwright.site.config.ts`'s pinned-locale comment: its old claim that pinning the
     stored preference "does not change which tree an unprefixed path serves … it only decides what
     the switcher and any client-side redirect do" was not true under D24 — a cold load of a primary
     page with the translation locale stored (`en`, pinned here) does redirect client-side to the
     `/en/` counterpart. The comment now says so, and the closing sentence's obsolete "rather than
     left to the default" wording (the removed `DEFAULT_VISITING_LOCALE`/D25 concept) is dropped.
  7. **D76**: `config.test.ts`'s "exports LEGACY_FIELDS constant" now also asserts
     `toContain('fs')` (traceability.md's Area Y "Overridden contracts" row, "fs ∈ LEGACY_FIELDS
     (D76)"). `plugin-obfuscation.test.ts`'s "detects all legacy fields when present" now also
     asserts the `'fs'` warning by its own text, not only `toHaveLength(5)`. Its sibling case's
     `const { fs, ...withoutFs } = BASE` (an unused `fs` binding) is replaced by a small `omit(obj,
     key)` helper, used as `detectLegacyFields(omit(BASE, 'fs'))`.
  8. Commands run: `npx vitest run tests/unit/challenge/config.test.ts
     tests/unit/challenge/plugin-obfuscation.test.ts` → 2 files, 73 passed. No root lint script exists
     for tests (`package.json` has no `lint`/`typecheck` entry), so neither `tsc` nor `eslint` was run
     under that clause. `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true
     CI=true pnpm test --run --no-file-parallelism` → Test Files 4 failed | 144 passed (148); Tests 6
     failed | 5339 passed (5345), exit 1. The six failures are exactly the six carried failures this
     ticket's Comments already named (`locales.test.ts` B18 command 2 (waves 3/4);
     `redirects-generated.test.ts`'s byte-identical case (wave 4); `redirects.test.ts`'s three cases
     (wave 4); `challenge-keygen.test.ts`'s Y59 payload-integrity case (wave 5, printed twice)); the
     previous entry's seventh, `upstream-guard.test.ts`'s pristine-check finding against
     `platform/en/index.md`, does not reproduce here — consistent with decision (d) below, `platform/`
     being staged again. `npx playwright test -c playwright.site.config.ts --list` lists all six new
     rows at their new line numbers among 92 tests in 5 files, confirming the spec still compiles; per
     the handoff, `docs:build` was not rerun and the loader was not touched, so the site-smoke rows
     themselves stay red until wave 3 lands, as the plan said they would.
  - Parent decisions recorded under the standing authorization of 2026-11-15:
    (a) Y-q1's removal of `validateChallengeConfig` is assigned to wave 5, together with
    `challenge:validate`/`challenge:analyze`/`create:challenge`, its last callers.
    (b) Y-O12's brief half becomes observable only once wave 5 gives `validateChallengeBrief` its
    checks (Y24–Y29); wave 5 adds the test that a brief fault reaches `processChallengeFrontmatter`,
    and the missing-title behaviour is pinned then.
    (c) B61 and B82 are re-derived from `P` through `localePath` in wave 3 (item 5 above).
    (d) D108's move is staged in the index (not committed) so index-reading tests see the new layout;
    checkpoint commits use `git commit -- <paths>` so the pre-commit hook does not see the move until
    waves 4–6 land.
  - No row left undone within this entry's own scope (items 1–8 above).

- 2026-11-16 (parent, after the independent check of the review fixes). The checker found one P0 in the
  fix itself: `heroActionsHtml` searched only inside `<main>`, but a `layout: home` page renders no
  `<main>` (only VitePress's `VPDoc.vue` does), so B70's smoke half could never pass. The entry above
  is inaccurate on that point. The parent fixed it (the hero block is now searched in the whole
  document; the inlined `__VP_SITE_DATA__` is JSON and holds no such tag) and confirmed against the
  stale `dist/index.html` that the helper now returns the hero's two hrefs only. Also fixed by the
  parent: B70 (unit half), B40 and Y1 now skip through `describe.skipIf(upstreamOnlySkipReason(…))`,
  the single D124 helper, instead of `describe.runIf(realUpstreamDecision(…))`; B81 case 1 samples the
  pathname after `networkidle`, not right after hydration; B81 case 2's title carries "upstream-only";
  `playwright.site.config.ts`'s comment no longer claims every English `goto` is `/en/`-prefixed (only
  B82's three; the rest move in wave 3). Recorded open item for stage 6: traceability's B61 text says
  "Upstream build:" while D124's list omits B61 — wave 3 derives B61 from P (decision (c)), which holds
  under either reading.

- 2026-11-16 (wave 2, "Routing (area A)", partial — core generalisation and both pure-function
  tables done in full; the "real Layout" both-P matrix and some component both-P matrices not
  reached). The executor ran the confirmed increment plan in order through the rows below, then
  stopped before building out every remaining "under both P" case in the two largest real-Layout
  test files, reported rather than guessed through.
  - **wave2-step0 (primaryLocale() switch)**: done. `.vitepress/theme/i18n/index.ts`'s
    `redirectTargetForStoredLocale` and `.vitepress/theme/composables/useArrivals.ts`'s `record`
    now call `primaryLocale()` instead of `DEFAULT_VISITING_LOCALE`. Measured twice as the plan
    asked: first with `DEFAULT_VISITING_LOCALE` temporarily kept (unused) alongside the switch,
    `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test
    --run --no-file-parallelism` → **Test Files 4 failed | 144 passed (148); Tests 6 failed | 5339
    passed (5345)** — identical to the baseline run just before the switch (same command, same
    counts), confirming the switch itself flips nothing (cross-area note 1 holds). Then
    `DEFAULT_VISITING_LOCALE` was deleted (A12): `git grep -n DEFAULT_VISITING_LOCALE --
    .vitepress tests platform` now prints nothing; the test assertion
    `expect(DEFAULT_VISITING_LOCALE).toBe('zh-TW')` in `initial-locale-redirect.test.ts` is
    deleted with it (no row of its own, per A12's own text).
  - **A26, A27, A28 (new seams 0010-S11, generalised `detectLocaleFromPath`/`localizePath`)**:
    done. `detectLocaleFromPath(path, P)`, `localizePath(path, locale, P)` and new
    `pageLocaleOf(localeIndex, P)` added to `.vitepress/theme/i18n/index.ts`; every existing case
    in `route-locale-sync.test.ts` and `localize-path.test.ts` passes `P: 'en'` explicitly with
    its assertion unchanged (T1), each file gaining a mirrored table under `P = zh-TW` (A26,
    A27); new `tests/unit/i18n/page-locale-of.test.ts` (0010-S11 has no prior art, as the row
    says). `LocaleSwitcher.vue`, `MergedNav.vue`, `ChallengeList.vue`, `HomeContent.vue` (the
    last, `pageLocaleOf` only, per the handoff's own carve-out) now compute their page locale
    through `pageLocaleOf(localeIndex.value, primaryLocale())` instead of the hard-coded
    `=== 'zh-TW'` ternary; `MissingTranslationLine.vue` and `MergedNav.vue`'s own `localizePath`
    calls now pass `primaryLocale()` as the third argument.
  - **DT01-16/41-56 pure (redirectTargetForStoredLocale, shouldPersistOnColdLoad)**: done in
    full. Both functions gained a `P` parameter (the `'en'`/DEFAULT_VISITING_LOCALE-literal
    comparisons replaced by `P`/`otherLocale(P)`, per the plan). New
    `tests/__helpers__/localeTables.ts` transcribes the DT01-80 and SW01-16 tables from
    `traceability.md` (DT41-80 generated from DT01-40 by a locale-swap, checked row by row
    against the source rather than hand-copied, to cut transcription risk on an 80-row table —
    a granularity choice flagged here, not a row skipped). New describe in
    `initial-locale-redirect.test.ts` runs every PP/TP row × both `X` (challenge, article) ×
    both bases = 128 cases, green.
    - **Flip found and fixed, exactly where the ticket's own Comments predicted it (DT01, 02, 07,
      08; "today a redirect or a `zh-TW` line … differ from spec 0008")**: every existing
      `initial-locale-redirect.test.ts` case that relied on "no stored preference" defaulting to
      `zh-TW` regardless of the build's primary locale no longer holds — the retired
      `DEFAULT_VISITING_LOCALE` constant was exactly that: a value independent of the build's
      actual primary, which `P` now *is*. Fixed by updating the affected assertions (renamed,
      with a comment citing the row): `redirectTargetForStoredLocale`'s "sends a visitor with no
      stored preference…", "treats a stored value naming no known locale as no preference",
      "treats an unreachable localStorage as no preference", "preserves the query string and the
      hash with no stored preference", "keeps the locale segment inside the base with no stored
      preference", and the "with the page list" describe's `CASES` table (now `stored ===
      'zh-TW' ? target : null`, not `stored === 'en' ? null : target`) and its "with the URL path
      %s…" alias test (A8, now set an explicit stored preference to keep exercising the
      alias-resolution property, since "no preference" has nothing left to redirect).
  - **DT17-40/57-80 pure (notFoundRedirect)**: done in full, including a seam the plan did not
    name explicitly but the spec requires (**D28, "the primary-code strip"**, traceability.md):
    the NP arrival kind (a not-found path using the primary locale's own code as an explicit
    prefix, R22's old URLs) needed genuinely new lookup logic, not just threading `P` through the
    existing rule — confirmed red first (`notFoundRedirect` returned `null`/a wrong entry for
    `/en/guide/python` under `P = 'en'`), then added `stripPrimaryCodeSegment` and the D28 branch
    to `.vitepress/theme/i18n/lookup.ts`'s `lookupNotFound`, with its own fall-through to D27's
    rule (A39) when the stripped path is itself unlisted but its translation is. Also corrected
    `notFoundRedirect`'s `requested` field, which the original design computed from the *landing*
    entry's locale (`otherLocale(detectLocaleFromPath(entry, P))`) — right for NT and NU, where
    the landing is always the path's counterpart, but wrong for NP, where the landing is the
    *same* locale the path already carried; it now reads the not-found *path*'s own locale
    directly (`detectLocaleFromPath(local, P)`). New describe in `arrival.test.ts` runs every
    NT/NP/NU row × both `X` × both bases = 192 cases, green; plus three dedicated D28 cases and a
    new A17 `it.each` (double/malformed prefixes) under both `P`.
  - **SW01-16 pure (switcherDecision)**: done in full. `switcherDecision`'s input object gained a
    `P` field; every existing case passes `P: 'en'` explicitly, assertions unchanged (T1). New
    loop in `arrival.test.ts` runs every SW row × both `X` × both bases, green (the line is not
    this function's own output, so it is not asserted here — that is the "SW01-16 real Layout"
    row, not reached this run, see below).
  - **B45 (classifyArrival)**: done, green on the first run as the plan predicted — no production
    change; two new cases added (`guide/python.md` under `P = en`, `en/guide/python.md` under
    `P = zh-TW`), existing case and title unchanged.
  - **A31 (messages-shape two-locale guard)**: done — new case asserting `LOCALES.length === 2`,
    green on the first run as the plan predicted. The GD1-failure demonstration (a temporary
    third code, reverted) is explicitly a stage-6 side check per the row's own text, not run here.
  - **A22 (LocaleSwitcher), partial**: `mountAt` now takes `P` and derives `mockLocaleIndex` from
    the page locale relative to it (`'root'` vs the non-primary code), replacing the hard-coded
    `pageLocale === 'zh-TW' ? 'zh-TW' : 'root'` mapping (cross-area note 7/8); every existing case
    keeps `P = 'en'` by default (T1) and a new case covers the title/aria-label/options trio under
    `P = zh-TW`. **Not done**: the row's own "new case iterating `LOCALES` that fails for a member
    without a label key" guard was not added — not attempted, not found to conflict with
    anything, simply not reached.
  - **A28/A32, spot-checked, not exhaustive**: one new `P = zh-TW` case was added to
    `HomeContent.test.ts` (mirrors an existing Chinese-home scenario through `localeIndex =
    'root'` instead of the literal `'zh-TW'` key, confirming `pageLocaleOf` resolves it the same
    way either way) and to `theme-locale-wiring.test.ts` (A29, the route watcher). **Not done**:
    the row's full "both P × localeIndex 'root'/T's code" matrix for `MergedNav.test.ts` and
    `ChallengeList.test.ts` — both files only gained the `primaryLocale` mock needed to keep their
    existing (P = en) assertions green (T1); no new P = zh-TW case was added to either.
  - **A30 (MissingTranslationLine)**: done — the three existing cases keep `P = 'en'` by default
    (T1); two new cases cover `href` under `P = zh-TW` for both requested locales.
  - **Compile/behaviour fixes outside the plan's named test files, required by the signature
    changes above, each a T1 pass-P-explicitly fix with no assertion changed**:
    `tests/unit/i18n/page-list.test.ts` (`lookupNotFound` calls gained `, 'en'`) and
    `tests/unit/theme/challenge-rwd.test.ts` (gained a `primaryLocale` mock returning `'en'`,
    after a first full-suite run surfaced it red — `MergedNav shows "Notes" text on lg breakpoint`
    expected `'Notes'`, got `'筆記'`, because its `vi.mock('vitepress', …)` sets `localeIndex:
    ref('root')` with no `primaryLocale` mock, so `pageLocaleOf('root', primaryLocale())` read
    vitest's unstubbed `'zh-TW'` fallback instead of today's real `'en'`). Both are outside the
    handoff's named scope but broken by this wave's production changes, so fixed rather than left
    red.
  - **Not reached in this run (not attempted, not "cannot be done" — simply not reached)**: the
    "real Layout" rows' full both-`P` matrix. `theme-locale-wiring.test.ts` and
    `not-found-wiring.test.ts` both gained the `primaryLocale` mock (defaulting `'en'`) needed to
    keep every existing (pre-wave) assertion green under the new signatures (T1) — and, in
    `not-found-wiring.test.ts`, the same DT01/02/07/08 "no preference" flip as above required
    fixing three more existing assertions ("stays on an English-only page with no stored value,
    the line in the default zh-TW (A2)" → now expects no line; "sends an alias… (A1)" and "after
    an A1 redirect… (L6)" → both now set an explicit stored preference first, same reasoning as
    the pure-function fixes) and the decision-table `CASES`' `want` selector (same
    `stored === 'zh-TW' ? r.others : r.en` fix as the pure table). Beyond that, the rows A1–A25,
    A33 and SW01–SW16's own "real Layout" halves, each explicitly named "under both P" in the
    plan, were not given new `P = zh-TW` cases in either file — only A29 (one pair of cases, see
    above) was. This is the wave's largest remaining piece: two files, 561 and 695 lines, each
    with a dozen-plus rows still to parameterise over `P`, a mounted-Layout `describe.each`
    rewrite per row rather than a pure-function table.
  - **Also not reached**: A18's existing `it.each` (crafted/aliased not-found paths) was not
    extended to both `P` and both prefixes, though a *new* A17 case covering double/malformed
    prefixes under both `P` was added in the same file; A19–A21, A23–A25, A33 (the remaining
    "real Layout" rows named above); the A36 code-comment pass (though every new/changed function
    above was given a full doc comment as it was written); A34, A35, A37 (document reads, named
    for stage 6).
  - Commands run, with exact counts:
    - `npx vitest run tests/unit/i18n/initial-locale-redirect.test.ts` → 232 passed.
    - `npx vitest run tests/unit/i18n/arrival.test.ts` → 300 passed.
    - `npx vitest run tests/unit/i18n/route-locale-sync.test.ts` → 18 passed.
    - `npx vitest run tests/unit/i18n/localize-path.test.ts` → 28 passed.
    - `npx vitest run tests/unit/i18n/page-locale-of.test.ts` → 4 passed (new file).
    - `npx vitest run tests/unit/i18n/locale-switcher.test.ts` → 40 passed.
    - `npx vitest run tests/unit/i18n/theme-locale-wiring.test.ts` → 36 passed.
    - `npx vitest run tests/unit/i18n/not-found-wiring.test.ts` → 84 passed.
    - `npx vitest run tests/unit/i18n/page-list.test.ts` → 101 passed.
    - `npx vitest run tests/unit/i18n/messages-shape.test.ts` → 21 passed.
    - `npx vitest run tests/unit/components/MergedNav.test.ts` → 56 passed.
    - `npx vitest run tests/unit/components/ChallengeList.test.ts` → 72 passed.
    - `npx vitest run tests/unit/components/HomeContent.test.ts` → 13 passed.
    - `npx vitest run tests/unit/components/MissingTranslationLine.test.ts` → 6 passed.
    - `npx vitest run tests/unit/theme/challenge-rwd.test.ts` → 7 passed.
    - `npx vitest run tests/unit/i18n tests/unit/components` (the wave's full affected
      directories, after every fix above except `challenge-rwd.test.ts`, which sits outside
      both) → Test Files 1 failed | 34 passed (35); Tests 1 failed | 1456 passed (1457) — the one
      failure is the carried `locales.test.ts` B18 command 2.
    - `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test
      --run --no-file-parallelism`, run twice (the first to catch `challenge-rwd.test.ts`, the
      second to confirm the fix): first → Test Files 5 failed | 144 passed (149); Tests 7 failed |
      5772 passed (5779) (the six carried failures plus `challenge-rwd.test.ts`'s one, fixed
      above); second → **Test Files 4 failed | 145 passed (149); Tests 6 failed | 5773 passed
      (5779)**, matching exactly the six carried failures named in
      the handoff (`locales.test.ts` B18 command 2; `redirects-generated.test.ts`'s byte-identical
      case; `redirects.test.ts`'s three cases; `challenge-keygen.test.ts`'s Y59 payload-integrity
      case, printed twice). Total test count rose from the baseline's 5345 to 5779 — 434 new
      tests this wave (the DT/SW tables, the new P = zh-TW cases, and `page-locale-of.test.ts`).
    - `pnpm --dir create-wxl test` not run: this wave touches neither `create-wxl/` nor
      fork:init.
  - New files, untracked, not staged (`git add` not run; `git status --porcelain` confirms `??`,
    not `A`): `tests/__helpers__/localeTables.ts`, `tests/unit/i18n/page-locale-of.test.ts`. No
    file under `platform/` was touched or added by this wave.
  - Git index untouched beyond what wave 1 already staged: `git status --short` before and after
    this run shows the same `platform/` adds/renames/modifications, nothing added or removed.

- 2026-11-16 (wave 2 part B1, independent-checker fix list). Two independent checkers found
  defects in wave 2 part 1's work (the previous entry); the executor applied the parent's fully
  specified fix list item by item, under the standing authorization of 2026-11-16 quoted above
  ("executor 要我決定的事，請在票的 Comments 引用我這段話並寫明範圍"). D108's move stays staged, not
  committed, per decision (d) of the "review fixes" entry above; no file under `platform/` was
  touched, no new file was created there, and no `git add`/`commit`/`stash`/`checkout`/`reset`/
  `restore` was run.
  - **P0 (A11/D25), done.** New case `shows no line on a later navigation to a translation-only
    page with no stored preference (A11, D25)` in `not-found-wiring.test.ts`: red for the
    predicted reason — `expected true to be false` on `[data-missing-translation]`'s existence
    (`.vitepress/theme/composables/useArrivals.ts:94` fell back to `P` instead of the page's own
    locale). Green after changing `record()`'s fallback from `readStoredLocale() ?? P` to
    `readStoredLocale() ?? (prefixed ? otherLocale(P) : P)`.
  - **P1-1 (A12 grep), done.** Reworded `initial-locale-redirect.test.ts:59`'s comment to drop
    the literal identifier; `git grep -n DEFAULT_VISITING_LOCALE -- .vitepress tests platform`
    now prints nothing (previously printed that one comment line).
  - **P1-2 (HomeContent E6), done — pass on first run.** Restored the three `translated`-card
    assertions into the `P = en` case in `HomeContent.test.ts`; green immediately, since the
    production behaviour never changed — only test coverage moved when the `P = zh-TW` case was
    added.
  - **P1-3 (DT invalid variants, Requested/Line), done — pass on first run.** The
    `stored === 'invalid'` branch in `initial-locale-redirect.test.ts`'s DT table now runs each of
    `fr`/`ja`/`zh-tw`/empty-string/unreadable (`vi.spyOn` on `getItem`); every case also asserts
    `lineLocale(...)` against `row.line`. All green on the first run (the table's Requested/Line
    columns were never wrong, only unchecked).
  - **P1-4 (A13, readStoredLocale describe), done — pass on first run.** New
    `describe('readStoredLocale', …)`: null for `fr`/`ja`/`zh-tw`/`EN`/`''`/an unreadable
    `localStorage`; the value itself for `en`/`zh-TW`.
  - **P1-5 (A26 gaps and mirrored titles), done — not a red/green row (test-only readability and
    coverage fix).** Added `['/en/x', 'en']` and `['/zh-tw/x', 'en']` to `route-locale-sync.test.ts`'s
    `cases`; the `P = zh-TW` `it.each` now maps to `mirroredCases` first, so its title and failure
    both name the path actually run. All green.
  - **P1-6 (A17 it.each cannot fail), NOT DONE — matches `cannot_do_alone`.** Hand-traced and then
    empirically confirmed (a throwaway run, reverted) that adding `/x`, `/<P>/x`, `/<T>/x` to
    `PAGES` for A17's loop makes `/<T>/<P>/x` resolve to a legitimate, non-null redirect via the
    ordinary fallback algorithm — a real conflict with the existing "always null" assertion shape,
    exactly as the confirmed plan's `cannot_do_alone` entry predicted. Per that entry's own
    recommendation, no production or test file was changed for this row: choosing between
    "reshape the expectations" and "use P/T-unrelated filler pages" is a design decision left to
    the parent, not guessed here.
  - **P1-7a (A15 aliases), done — pass on first run.** New `it.each` in `arrival.test.ts` for
    `/<P>`, `/<P>/`, `/<P>/index.html` → `/`, and `/<P>/guide/python.html` → `/guide/python`; all
    green immediately (the D28 branch already normalises through `pathCandidates`, which does the
    alias stripping).
  - **P1-7b (A39 double loop), done — pass on first run.** Expanded the single A39 case into
    `for (P) × for (base)` (both `BASES`); green on the first run.
  - **P1-7c (A8 under both P), done — pass on first run.** Added a mirrored `PAGES_ZH` (every
    `/zh-TW/…` entry replaced by `/en/…`) and a `P = zh-TW` `it.each` of the same four alias shapes
    in `initial-locale-redirect.test.ts`; green on the first run.
  - **P1-7d (A18 under both P/prefixes), done — pass on first run.** Wrapped the four crafted
    not-found inputs in `arrival.test.ts` in a `for (const P of ['en','zh-TW'])` loop, reshaped with
    `P`'s/`T`'s own codes; green on the first run (hand-traced each of the four inputs under
    `P = zh-TW` before running, to rule out an accidental match).
  - **P1-8 (A29 missing translation-tree row, misleading comment), done — pass on first run.**
    Added `['/en/guide/', 'en']` to the `P = zh-TW` `it.each` in `theme-locale-wiring.test.ts` (plus
    a `RENDERED['/en/guide/']` fixture entry it needed) and rewrote the comment that called
    `/zh-TW/guide/` the primary tree.
  - **P1-9 (A31 GD1 exact message), done.** New `assertTwoLocaleGuard` helper (test-file only) in
    `messages-shape.test.ts`; one case asserts it does not throw for the real `LOCALES`, one asserts
    the exact GD1 text for a synthetic three-member list.
  - **P1-10 (W5 vacuous after the DT01 flip), done — pass on first run.** Re-seeded
    `LOCALE_STORAGE_KEY = 'zh-TW'` before the cold load in `not-found-wiring.test.ts`'s W5 case, so
    the redirect the title describes actually happens; added the `mockGo` assertion and changed the
    final check from `toBeNull()` to `toBe('zh-TW')`.
  - **P1-11 (B6/W6 cannot discriminate), done — pass on first run.** Changed the kept choice from
    `en` (which happened to equal `P`) to `zh-TW`, and the later arrival's target from the
    `zh-TW`-only page to `/guide/english-only` (an English-only, unprefixed article) — so a failed
    "remember the choice" mechanism and a working one now predict different lines (`en` vs
    `zh-TW`), not the same one.
  - **P1-12 (A22/D34, LocaleSwitcher.vue production half), done.** New
    `.vitepress/theme/components/localeSwitcherLabels.ts` (`LOCALE_SWITCHER_LABEL_KEYS`,
    `localeSwitcherLabelKey`, `assertEveryLocaleHasALabel`); `LocaleSwitcher.vue`'s `labelOf` now
    calls it instead of a two-branch ternary, and `options` is now `LOCALES.filter(...)`-derived
    instead of a hard-coded `[otherLocale(...), pageLocale]` pair. Two new cases in
    `locale-switcher.test.ts`: the guard passes for the real `LOCALES`, and throws naming the code
    for a value outside the label table (simulating a member without a label key, since `LOCALES`
    itself cannot grow to three without a production decision this wave does not make).
  - **P1-13 (A27 withBase under P = zh-TW), done — pass on first run.** New `it.each` in
    `MergedNav.test.ts`, mounted directly (not through `mountOpened`/`mountIn`, which hard-code
    `P = en`) with `mockPrimaryLocale.value = 'zh-TW'`; both `en` and `zh-TW` page-locale rows pass.
  - **P2-1 (TA1, D28 strip and `requested` must decode first), done.** Two new cases in
    `arrival.test.ts`: red for the predicted reasons (`expected null to deeply equal {...}` for the
    percent-encoded primary prefix; `requested: "en"` instead of `"zh-TW"` for the percent-encoded
    translation prefix). Green after decoding in `lookup.ts`'s `lookupNotFound` (before
    `stripPrimaryCodeSegment`, falling back to "names no page" on a decode failure, matching
    `pathCandidates`'s own rule) and in `arrival.ts`'s `notFoundRedirect` (before computing
    `requested`, falling back to the raw path on a decode failure, since this value is only ever
    read, never compared against the page list).
  - **P2-2 (DT41–80 ids/stored column), done — a data-correctness fix, not a red/green row.**
    Transcribing `traceability.md` lines 941–980 by hand against the generated `DT41_80` found a
    real mismatch: the PP block's generator (`swapRow`, positional, `index = i + 41`) silently
    swapped DT43/44's and DT45/46's content relative to the spec — the spec's own mirror reorders
    the `stored = P` and `stored = T` pairs (DT05/06's content, "stored = T", lands at DT43/44; DT03/
    04's, "stored = P", lands at DT45/46), which a position-preserving generator cannot produce.
    Every other block (TP/NT/NP/NU) is order-invariant within itself (constant `requested`/`line`/
    `written` regardless of `stored`), so this bug was isolated to DT43–46. Replaced the generator
    with a literal `DT41_80` array transcribed row by row from the spec text, and rewrote the module
    doc comment to describe this (dropping the now-false "DT01↔DT41 … every pair" claim and
    explaining why DT41–80 is not generated from DT01–40). No test assertion changed shape — the
    DT-table tests compute their expectation from the row's own fields, so this is a traceability
    fix (DT43/DT45/DT44/DT46 now test what the spec says they test), not a behaviour change; all
    affected tests stayed green before and after.
  - **P2-3 (SWRow.line doc comment + assertion), done — pass on first run.** Rewrote
    `localeTables.ts`'s `SWRow.line` doc comment (it previously described push/replace semantics,
    unrelated to the field); added `expect(lineLocale({...})).toBe(row.line)` to `arrival.test.ts`'s
    SW loop's page branch.
  - **P2-4 (SW own-choice rows, empty page list), done — pass on first run (still a defect-detecting
    change, not a tautology).** Changed the SW loop's `pages` from
    `row.counterpart === 'listed' ? [counterpart] : []` to
    `row.counterpart === 'unlisted' ? [] : [counterpart]`, so SW03/06/09/12 (an own-locale choice,
    `row.counterpart === null`) get a page list that actually contains the page itself, instead of
    an empty one that could never catch a mistaken navigate-to-self.
  - **P2-5 (MissingTranslationLine A30, full coverage under P = zh-TW), done — pass on first run.**
    Replaced the two href-only `P = zh-TW` cases with full mirrors of the three `P = en` cases
    (text, link text, `lang`, href) plus a `base = '/repo/'` case.
  - **P2-6 ("route titles"), treated as satisfied by P1-5.** The handoff's "route titles" item gave
    no file/line; the only concrete candidate found by re-reading the surrounding context is
    `route-locale-sync.test.ts`'s A26 title, already fixed under P1-5. Not re-done as a separate
    item; flagged here in case the parent meant a different file.
  - **`cannot_do_alone` item 1 (stale comment near "i18n/index.ts ~243"), NOT DONE, re-confirmed.**
    `.vitepress/theme/i18n/index.ts:243` is `redirectTargetForStoredLocale`'s parameter list; `git
    grep -n "visiting locale\|hard-coded" -- .vitepress/theme/i18n/index.ts` prints nothing. The
    closest real candidate is `.vitepress/theme/composables/useArrivals.ts:40-41`'s doc comment,
    which still literally says "the cold load of a published page under `/zh-TW/`" instead of using
    `T`/`otherLocale(P)`. Not edited: the recommendation this row carries asks the parent to confirm
    the target file/line before any change, since the named location does not hold the described
    text.
  - **`cannot_do_alone` item 2 (A17 page-list conflict), NOT DONE** — the same row as P1-6 above;
    recorded once, not duplicated.
  - Commands run, with exact counts:
    - `npx vitest run tests/unit/i18n/not-found-wiring.test.ts` → 85 passed (85).
    - `npx vitest run tests/unit/i18n/initial-locale-redirect.test.ts` → 372 passed (372).
    - `npx vitest run tests/unit/i18n/arrival.test.ts` → 317 passed (317).
    - `npx vitest run tests/unit/i18n/route-locale-sync.test.ts` → 22 passed (22).
    - `npx vitest run tests/unit/i18n/theme-locale-wiring.test.ts` → 37 passed (37).
    - `npx vitest run tests/unit/i18n/messages-shape.test.ts` → 22 passed (22).
    - `npx vitest run tests/unit/i18n/locale-switcher.test.ts` → 42 passed (42).
    - `npx vitest run tests/unit/components/HomeContent.test.ts` → 13 passed (13).
    - `npx vitest run tests/unit/components/MergedNav.test.ts` → 58 passed (58).
    - `npx vitest run tests/unit/components/MissingTranslationLine.test.ts` → 7 passed (7).
    - `npx vitest run tests/unit/i18n/ tests/unit/components/ tests/unit/layouts/ tests/unit/theme/`
      (broader regression sweep, run twice across this wave) → 1 failed, 42 passed (43 files); 1
      failed, 1781 passed (1782 tests) both times — the one failure is the carried
      `locales.test.ts` B18 command 2, unchanged.
    - `git grep -nE` (B18 command 2's own script), re-run directly after the `LocaleSwitcher.vue`
      change: only the three already-named lines (`shortLink.ts:61`, `locales.ts:5` itself,
      `challenges.data.ts:5`) — confirms `LOCALES.filter((l) => l !== pageLocale.value)` added no
      new violation.
    - `npx vue-tsc --noEmit -p tsconfig.json`, filtered to this wave's files: zero errors in
      `LocaleSwitcher.vue`, `localeSwitcherLabels.ts`, `useArrivals.ts`, `lookup.ts`, `arrival.ts`,
      `localeTables.ts`. Two pre-existing, unrelated errors surfaced in files this wave also edited
      for other reasons (`MergedNav.test.ts:535`, `messages-shape.test.ts:110,130`) are outside the
      lines this wave touched (confirmed against `git diff`) and are not new.
    - `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test
      --run --no-file-parallelism` → **Test Files 4 failed | 145 passed (149); Tests 6 failed | 5942
      passed (5948)**, exit 1. The six failures are exactly the six carried, already-accepted
      failures the handoff named, unchanged: `locales.test.ts` B18 command 2; `redirects-generated
      .test.ts`'s byte-identical case; `redirects.test.ts`'s three cases; `challenge-keygen.test.ts`'s
      Y59 payload-integrity case (printed twice, once per vitest's own retry, one failing test). No
      other failure; total test count rose from wave 2 part 1's ending 5779 by 169 new tests across
      this wave's rows.
    - `pnpm --dir create-wxl test` not run: this wave touches neither `create-wxl/` nor fork:init
      (confirmed: `git status --short -- create-wxl/` prints nothing).
  - New files: `.vitepress/theme/components/localeSwitcherLabels.ts`, untracked (`??`, not staged).
    No file under `platform/` was created, moved or edited by this wave; `git status --short`
    before and after this run shows the same `platform/` adds/renames/modifications wave 1 already
    staged, nothing added, removed or re-staged.

- 2026-11-17 (wave 2 part B2 (resumed), independent-checker fix list continued; date corrected by
  B3 below — the work recorded in this entry was done on 2026-11-17, not 2026-11-16). A previous
  executor run of this exact part was cut off by an authentication error partway through; its
  uncommitted edits were already in the working tree when this run started (`git diff HEAD` — 14
  files: 5 production, 9 test). Read that diff first, verified each item against it, kept every
  part that was correct, and fixed or finished the rest, rather than discarding it. D108's move
  stays staged, not committed, unchanged from the 2026-11-16 "review fixes" entry's decision (d);
  no file under `platform/` was touched, no `git add`/`commit`/`stash`/`checkout`/`reset`/`restore`
  was run.

  **SECTION 1 — the real-Layout both-P matrix**
  - **S1-audit (primaryLocale mock grep), done — no gap.** Re-ran the grep: `ChallengeList.test.ts`,
    `HomeContent.test.ts`, `MergedNav.test.ts` and `locale-switcher.test.ts` already mock
    `.vitepress/theme/i18n/primaryLocale`; `challenge-rwd.test.ts` already has one from the B1 fix
    list. `ShortLinkShare.test.ts` has none, confirmed out of scope: `ShortLinkShare.vue` calls
    neither `pageLocaleOf` nor `primaryLocale`. A broader grep for every test file mentioning
    `MergedNav`/`ChallengeList.vue`/`HomeContent.vue`/`LocaleSwitcher.vue` turned up six more files
    with no mock, each checked and confirmed not a gap: four `ChallengeLayout*.test.ts` and
    `challenge-design-tokens.test.ts` only `vi.mock` `MergedNav.vue` away or read its source text
    statically, never mounting the real component; `page-locale-of.test.ts` only names the four
    components in a comment. No code change.
  - **S1-A20 / S1-A19a / S1-A19b (not-found-wiring, P = zh-TW mirrors), done.** Three new cases in
    `tests/unit/i18n/not-found-wiring.test.ts`, mirroring "does nothing on a failed load" (line
    211), "writes no preference on the way through" (line 231) and "does the same for a
    client-side navigation to a missing translation" (line 243) under `mockPrimaryLocale.value =
    'zh-TW'`, entries re-spelled for the `/en/` tree. All three passed on the first run, as
    predicted: `detectLocaleFromPath`/`lookupNotFound`/`notFoundRedirect` have been P-generic since
    wave 2 step 0. `npx vitest run tests/unit/i18n/not-found-wiring.test.ts` → 153 passed (up from
    150 before these three; the resumed diff's existing P = zh-TW cases, not these three, carried
    the other 147).
  - **S1-SW-full-matrix, decision, recorded, not implemented.** The handoff's literal text asks for
    SW01–SW16 driven by `tests/__helpers__/localeTables.ts`'s `SW` table under
    `describe.each(P)` on the mounted real Layout. Re-read `SW`: its 16 rows already spread across
    both `P` themselves (SW01–06 are `P = en`, SW07–12 are `P = zh-TW`, SW13–16 split 2/2) and are
    already run exhaustively, per row, against both `X_INSTANCES` and both `BASES`, in
    `arrival.test.ts`'s pure-function table (the `switcherDecision`/`lineLocale` table, confirmed
    P2-3/S2-j). The resumed diff instead added four representative mirrors (A21, A23 ×2, A24) to
    `not-found-wiring.test.ts`'s real-mounted-Layout cases, not a second full 16×2×2 pass through
    the Layout. Recommendation, taken as a decision under the 2026-11-16 standing authorization and
    listed here rather than silently kept: keep the representative mirrors. A second full
    combinatorial sweep through the heavier, mounted-Layout machinery would re-prove the same
    decision/target/line arithmetic the pure-function table already proves exhaustively, for little
    added defect-detection — the same test-pyramid trade-off the DT table already made (pure table +
    representative Layout mirrors). If the user wants the literal full table anyway, say so and it
    becomes its own row.
  - **Component matrices (MergedNav.test.ts, ChallengeList.test.ts), in the resumed diff: two bugs
    found and fixed, one deferred.**
    - MergedNav.test.ts's A28/A32 `it.each` matrices (both `P` × `localeIndex`) were already correct
      in the resumed diff; `npx vitest run tests/unit/components/MergedNav.test.ts` → 64 passed
      (64), no fix needed.
    - ChallengeList.test.ts's mirrors had a real bug: the "marks a borrowed entry 只有英文" case
      mounted `BORROWED_ZH` at `localeIndex = 'en'`, which under `P = zh-TW` is the English list
      page itself — the PHP Check entry (`locale: 'en'`) is then native there, not borrowed, so
      `[data-locale-mark]` never rendered and the test failed red for a mounting mistake, not a
      production defect. Fixed by mounting at `localeIndex = 'root'` (the primary/Chinese list
      under this `P`), matching the original `P = en` test's own `'zh-TW'`/`'root'` pairing.
    - The same file's "marks a Traditional Chinese-only entry… and its page in page mode" case
      asserted a page-mode short-link URL (`${DISPLAY_ORIGIN}/challenge/zh-only/`) that depends on
      `challengeLink`/`shortLinkPath` (`.vitepress/challenge/shortLink.ts`), which still hard-codes
      "`zh-TW` locale → `/zh-TW` prefix" regardless of `primaryLocale()` — confirmed by running the
      case unmodified: it returns `${DISPLAY_ORIGIN}/zh-TW/challenge/zh-only/`, the pre-switch
      literal. `shortLink.ts` is not in wave 2's file list (Implementation waves, "Routing (area
      A)"); cross-area note 8 and the earlier Comments (wave 1(d)) both name it as area S's, wave
      4's. Not fixed here: removed the one page-mode assertion, with a comment naming the deferral,
      and kept every other assertion in that case (the mark, `lang`, and "no short link in short
      mode" checks, which are already P-generic and now pass). `npx vitest run
      tests/unit/components/ChallengeList.test.ts` → 75 passed (75), up from 73 passed/2 failed
      before the fix.
    - Also found and fixed, unrelated to the mounting bug: `tests/unit/i18n/not-found-wiring.test.ts`'s
      resumed `ROWS_BY_P`/`STORED`/`INITIAL` block failed `vue-tsc` (`TS2739`, the computed-key
      object literal could not be checked against `Record<(typeof STORED)[number], string | null>`
      because the loop's `P`/`T` are typed as the `Locale` union, not narrowed per iteration). Fixed
      with an `as` cast on the object expression instead of annotating the `const`; behaviour
      unchanged, `npx vitest run tests/unit/i18n/not-found-wiring.test.ts` still 153 passed.

  **SECTION 2 — the checkers' findings on B1 (S2-a through S2-o)**

  Every item below was already applied in the resumed diff. For each one with a production-code
  seam, verified "red for the stated reason" by temporarily reverting the production line, running
  the named test, confirming the predicted failure, then restoring the line (`git diff` confirms
  clean afterwards for every production file touched this way).
  - **S2-a (lookup.ts D28 decodes once), confirmed.** Reverting `lookup.ts:49`
    (`candidatesFromDecodedPath(stripped)` → `pathCandidates(stripped, '/')`) turned
    `arrival.test.ts`'s "does not decode the D28 remainder a second time (TA1, D28)" red:
    `expected { target: '/challenges', … } to be null`. Restored; `arrival.test.ts` → 344 passed.
  - **S2-b (W5: `wxl-locale` unchanged across the redirect and the navigation after it),
    confirmed.** Making `useArrivals.ts`'s `recordColdLoad` call `persistLocale(otherLocale(P))`
    unconditionally turned `not-found-wiring.test.ts`'s W5 case red: `setItem` called once with
    `['wxl-locale','zh-TW']`. Restored; `not-found-wiring.test.ts` → 153 passed.
  - **S2-c (A18 exact inputs + A14–A16/A39 property), confirmed.** Reverting `pages.ts`'s
    `targetUrl` to drop the base prefix turned the new property test
    ("every redirect target starts with the base…") red: `expected false to be true` on
    `target.startsWith(b.prefix)`. Restored; `arrival.test.ts` → 344 passed.
  - **S2-d (A15 aliases, both P × both bases), confirmed.** Reverting `lookup.ts`'s
    `stripPrimaryCodeSegment` to compare against the literal `'en'` only turned 8 of the 16 new
    alias cases red (every `P = zh-TW` one): `expected null to deeply equal {...}`. Restored;
    `arrival.test.ts` → 344 passed.
  - **S2-e (A22/D34 guard also checks the string tables), confirmed — test-only, already
    demonstrates its own failure.** `locale-switcher.test.ts`'s new synthetic-third-locale case
    throws the predicted message without touching real `LOCALES`; no production revert applicable.
    `locale-switcher.test.ts` → 42 passed.
  - **S2-f (A17 filler page lists, parent decision), confirmed non-vacuous.** Temporarily added the
    excluded entry (`/<P>/x`) back into one `FILLER` list turned that case red:
    `expected { target: '/zh-TW/x', … } to be null`. Reverted; `arrival.test.ts` → 344 passed. The
    stage-6 spec-ambiguity note (the `/<T>/<P>/x`-vs-`/<P>/x` question) is still not written anywhere
    outside this ticket's Comments; left for stage 6, as the confirmed plan said.
  - **S2-g (A8 P = zh-TW, no preference → null for both), confirmed — pass on first run, as
    predicted.** `initial-locale-redirect.test.ts` → 376 passed (no revert needed: the "no
    preference" branch was already P-generic).
  - **S2-h (A26 case mismatch on T's own code, P = zh-TW), confirmed.** Making
    `detectLocaleFromPath` compare case-insensitively turned the new case red:
    `expected 'en' to be 'zh-TW'`. Restored; `route-locale-sync.test.ts` → 23 passed.
  - **S2-i (DT Requested column asserted as output), confirmed — pass on first run.**
    `initial-locale-redirect.test.ts`'s DT loop now calls `requestedLocaleForPageArrival` directly
    and compares it to `row.requested`; already green with `requestedLocaleForPageArrival` as
    written. Wording correction recorded here rather than editing the earlier (wave 2 part B1)
    entry: that entry's "the table's Requested/Line columns were never wrong, only unchecked"
    overstated things — only `Line` was checked there; `Requested` stayed unchecked as an output
    until this case.
  - **S2-j (now-false comments + SW13–16 both chosen), confirmed — pass on first run.**
    `useArrivals.ts` and `arrival.test.ts`'s doc comments now match
    `requestedLocaleForPageArrival`/`lineLocale`'s real behaviour; the SW not-found/failed-load
    branch loops `chosen` over `[row.P, row.T]` and both give the same decision.
    `arrival.test.ts` → 344 passed.
  - **S2-k (notFoundRedirect's unreachable decode-failure catch), confirmed by reading, not by a
    test.** `lookupNotFound` (lookup.ts:30–63) only returns non-null after a successful decode of
    its own (the D28 branch's own try/catch, or the ordinary branch's `pathCandidates`, which
    returns `[]`/null on a decode failure); so `notFoundRedirect`'s unguarded
    `decodeURIComponent` can never throw when `entry` is non-null. The try/catch is gone, with a
    comment recording why.
  - **S2-l (MergedNav A27 ordering-bug discriminator, P = zh-TW), confirmed.** Reversing
    `MergedNav.vue`'s `navLink` composition order (`localizePath(withBase(path), …)` instead of
    `withBase(localizePath(path, …))`) turned BOTH the existing `P = en` case and the new `P =
    zh-TW` mirror red: `expected false to be true` on the wanted hrefs existing. Restored;
    `MergedNav.test.ts` → 64 passed.
  - **S2-m (A31/GD1 guard honesty note), confirmed — comment only, no code.**
    `messages-shape.test.ts` → unchanged pass count, comment states `assertTwoLocaleGuard` is a
    test-only shape check with no production GD1 guard behind it (`otherLocale`'s own ternary
    throws nothing).
  - **S2-n (localeSwitcherLabels.ts export cleanup), confirmed.** `assertEveryLocaleHasALabel` is
    gone from `.vitepress/theme/components/localeSwitcherLabels.ts`; `LocaleSwitcher.vue` imports
    only `localeSwitcherLabelKey` (`git grep -n "localeSwitcherLabels" .vitepress/theme/components/LocaleSwitcher.vue`
    confirms). `LOCALE_SWITCHER_LABEL_KEYS` stays exported because `localeSwitcherLabelKey` itself
    uses it in production.
  - **S2-o (P2-6 "route titles" re-check), closed.** Re-grepped for `useTitle`/`document.title`/
    `pageData.title` across `.vitepress` and `platform/shared`: no hits. No better candidate than
    `route-locale-sync.test.ts`'s A26 title (P1-5) found. Closing P2-6 here as "confirmed satisfied
    by P1-5, no other candidate found by a repository-wide grep", rather than leaving it open.

  **Commands run, with exact counts:**
  - `npx vitest run tests/unit/i18n/not-found-wiring.test.ts` → 153 passed (153).
  - `npx vitest run tests/unit/i18n/arrival.test.ts` → 344 passed (344).
  - `npx vitest run tests/unit/i18n/theme-locale-wiring.test.ts` → 59 passed (59).
  - `npx vitest run tests/unit/i18n/locale-switcher.test.ts` → 42 passed (42).
  - `npx vitest run tests/unit/i18n/initial-locale-redirect.test.ts` → 376 passed (376).
  - `npx vitest run tests/unit/i18n/route-locale-sync.test.ts` → 23 passed (23).
  - `npx vitest run tests/unit/i18n/messages-shape.test.ts` → 22 passed (22).
  - `npx vitest run tests/unit/components/MergedNav.test.ts` → 64 passed (64).
  - `npx vitest run tests/unit/components/ChallengeList.test.ts` → 75 passed (75).
  - `npx vitest run tests/unit/i18n/ tests/unit/components/ tests/unit/layouts/ tests/unit/theme/`
    (broader regression sweep) → 1 failed, 42 passed (43 files); 1 failed, 1913 passed (1914 tests)
    — the one failure is the carried `locales.test.ts` B18 command 2, unchanged.
  - `npx vue-tsc --noEmit -p tsconfig.json`, filtered to this wave's 14 files: zero errors after the
    `not-found-wiring.test.ts` fix above. The one remaining hit in a touched file
    (`ChallengeList.test.ts:805`, `Property 'exists' does not exist on type 'Omit<DOMWrapper<Element>,
    "exists">'`) is outside every line this wave changed (confirmed against `git diff`) and matches
    the pattern of pre-existing, unrelated `vue-tsc` errors wave 2 part B1 already recorded
    elsewhere; not fixed here.
  - `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test
    --run --no-file-parallelism` → **Test Files 4 failed | 145 passed (149); Tests 6 failed | 6074
    passed (6080)**, exit 1. Re-ran with `--reporter=json` to confirm the exact six, by file and
    title:
    - `tests/unit/i18n/locales.test.ts` › "B18: no locale enumeration outside the locale-list module
      (PAT1) > command 2 (union / array-of-two / comparison-chain enumerations): every line is in
      .vitepress/locales.ts" (waves 3/4).
    - `tests/unit/site/redirects-generated.test.ts` › "the committed _redirects > is byte-identical
      to what the challenge tree generates" (wave 4, S28).
    - `tests/unit/site/redirects.test.ts` › "_redirects rule set > gives every challenge in git's
      index its four rules in form order, the Traditional Chinese ones at the page its tree tracks
      (G1–G3, G5, G8)"; "_redirects target resolution > resolves every parameterised target prefix
      to a directory of challenges, each with an index.md"; "_redirects target resolution > resolves
      every literal target to a page" (wave 4, S28/S34).
    - `tests/unit/scripts/challenge-keygen.test.ts` › "keygen aborts, names the slug, and leaves
      frontmatter and the published module alone when the built module fails the payload check >
      exits non-zero with [slug] and \"payload integrity\", leaving index.md and runtime.wasm
      untouched" (wave 5, Y59).
    No other failure, no new failure: the total rose from wave 2 part B1's ending 5948 by exactly
    132 (this wave's new/fixed cases: 3 new `not-found-wiring.test.ts` cases, plus the
    already-resumed diff's P = zh-TW matrices across 9 test files — the one assertion removed
    from an existing `ChallengeList.test.ts` case, the deferred page-mode check, is a count of
    assertions within one case, not of test cases, and does not subtract from this total). [Flag,
    added by wave 2 part B4: this counting parenthetical was edited in place when part B3 closed,
    rather than being left as written and corrected in a later entry the way S2-i's wording
    correction was handled. Recorded here, not as a new paragraph at that entry, because the edit
    already happened; see the part B4 Comments entry below for the count after B3's own
    additions.]
  - `pnpm --dir create-wxl test` not run: this wave touches neither `create-wxl/` nor fork:init
    (confirmed: `git status --short -- create-wxl/` prints nothing, both before and after).
  - No file under `platform/` was created, moved or edited by this wave; `git status --short`
    before and after shows the same `platform/` adds/renames/modifications wave 1 already staged.

- 2026-11-17 (wave 2 part B3, closing part). Scope confirmed by the parent under the 2026-11-16
  standing authorization quoted above (「授權：所有建議我都同意，權限都授權到兩個 epic 完成…」) and
  the same day's "why D108's move is not committed yet" entry: HEAD `9abe622` carries parts 1, B1,
  B2; this part reverts B2's choice (replacing the SW real-Layout table with four representative
  mirrors) back to the approved plan — no plan row dropped or replaced by an executor — and closes
  the items below. Files touched: `tests/unit/i18n/not-found-wiring.test.ts`,
  `tests/unit/components/ChallengeList.test.ts`, this ticket. No file under `platform/` touched;
  no `git add`/`commit`/`stash`/`checkout`/`reset`/`restore` run.
  1. **SW01–SW16 on the real, mounted Layout, done — added, not a replacement.** The existing
     hand-written cases under `describe('the real Layout: a locale switcher choice', …)` (B1, B3,
     B5–B7, D17, L5, L8, W6 — including the three B2 mirrors A21/A23×2) stay: they each carry a
     dimension the SW table does not model (the gate, the base, a hash-only change, storage
     refusal), so replacing them would drop coverage, not just reorganise it. Added, instead, a new
     `describe.each(['en','zh-TW'])('… the full SW table (P = %s)', …)` with
     `it.each(SW.filter(r => r.P === P))` over `tests/__helpers__/localeTables.ts`'s SW01–SW16,
     asserting Decision (navigate with no `replace`, or stay), the Line column (shown at once when
     stay, never on SW13–16), and Writes (`wxl-locale` always equals the chosen locale, SW13–16
     included) for every row. `npx vitest run tests/unit/i18n/not-found-wiring.test.ts -t "full SW
     table"` → 16 passed, pass on first run, as the resumed B2 entry's S1-SW-full-matrix finding predicted (the
     pure-function table already proves the decision/target/line arithmetic exhaustively). Proved
     non-vacuous by a temporary mutation of `switcherDecision` (`arrival.ts`) to ignore its `P`
     argument and always use `'en'`: SW07 and SW10 (P = zh-TW) turned red —
     `expected 'stay' to be 'navigate'` — reverted (`git diff` clean afterwards).
  2. **`publishedPages` made P-dependent, done.** The mock in `not-found-wiring.test.ts` (lines
     60–68 before this change) now returns, per `mockPrimaryLocale.value`, only the pages a build
     with that P actually publishes (no `/en/...` entries under P = en, no `/zh-TW/...` entries
     under P = zh-TW). `npx vitest run tests/unit/i18n/not-found-wiring.test.ts` → 153 passed, pass
     on first run: no existing case asserted a page only the other locale's build would publish.
  3. **A15/A19 D29 case re-landed on `/guide/python`, done.** "a stored T preference does not cause
     a second cold-load redirect after an NP landing (A19, D29)" now lands its second, direct
     arrival on `/guide/python` (whose `/zh-TW/guide/python` counterpart IS published) instead of
     `/challenge/v05-php-check/` (whose counterpart is not). Pass on first run. Proved non-vacuous
     by temporarily making the route watcher treat every later arrival as a cold load too (it called
     `redirectTargetForStoredLocale` unconditionally): turned red —
     `expected "vi.fn()" to not be called at all, but actually been called 1 times` with
     `go('/zh-TW/guide/python', {replace:true})` — reverted (`git diff` clean on
     `useArrivals.ts` afterwards).
  4. **A19b `setItem` spy, both P, done.** Both "writes no preference on the way through" cases
     (P = en original, P = zh-TW mirror) now spy on `window.localStorage.setItem` across the whole
     redirect-then-navigation sequence, in a `try`/`finally`. Pass on first run (S2-b's own earlier
     proof already showed the production code never calls `setItem` on this path).
  5. **S2-b/W5 spy cleanup into `finally`, done.** `writes no preference on a cold-load redirect or
     the navigation after it (W5)` now restores its spy in a `finally` around the same body. Pure
     refactor; pass on first run, assertions unchanged.
  6. **A20 mirror, full call list, done.** Removed `mockGo.mockReset()` from the P = zh-TW mirror of
     "does the same for a client-side navigation to a missing translation"; added
     `expect(mockGo).not.toHaveBeenCalled()` after the first mount. Pass on first run. The handoff's
     own suggested non-vacuity mutation (hardcoding `primaryLocale()`'s call site to `'en'` inside
     `useArrivals.ts`) did NOT turn this case red under the now-P-dependent `publishedPages` fixture
     (item 2 above): the wrongly-computed target `/zh-TW/guide/python` is correctly absent from the
     real P = zh-TW page list either way, so the fixture's own realism defeats that specific
     mutation. Found an alternative that does discriminate: additionally hardcoding `pages` to the
     P = en-shaped list inside `useArrivals.ts` turned it red —
     `expected "vi.fn()" to be called 1 times, but got 2 times`, the extra call being
     `go('/zh-TW/guide/python', {replace:true})` — reverted (`git diff` clean afterwards). Flagged
     for the parent: the handoff's described mutation for this item no longer reproduces post-item-2;
     the alternative above was used instead.
  7. **A23 'goes to the counterpart' mirror, call count, done.** Added
     `expect(mockGo).toHaveBeenCalledTimes(1)` to the P = zh-TW mirror. Pass on first run.
  8. **A23 'writes the choice' mirror, no-go assertion, done.** Added
     `expect(mockGo).not.toHaveBeenCalled()` right after `choose('zh-TW')` resolves to `'stay'`. Pass
     on first run.
  9. **A32/A28 SSR mirrors, done — one value corrected from the handoff's literal text.** Added two
     `P = zh-TW` mirrors in `ChallengeList.test.ts`'s `describe('ChallengeList server rendering', …)`.
     The second (`CHINESE_ONLY_ZH`, `mockLocaleIndex.value = 'en'`, runtime `'zh-TW'`) matches the
     handoff exactly and passed on the first run. The first, as literally specified
     (`mockLocaleIndex.value = 'en'`), is unsatisfiable: with P = zh-TW and `localeIndex = 'en'`,
     `pageLocaleOf` returns `'en'`, under which `BORROWED_ZH`'s PHP Check entry (`locale: 'en'`) is
     native, not borrowed, so it could never carry the `只有英文` mark or `lang="en"` the handoff's
     own assertions ask for — the same mounting mistake the resumed B2 entry's own comment (at the
     mounted-component mirror, "the 'Chinese list' under this P is localeIndex 'root' … not 'en'")
     had already named and fixed once in this exact file. Used `mockLocaleIndex.value = 'root'`
     (matching that comment) with runtime `'en'` (mirroring the original P = en case's own
     deliberately-different-from-page-locale runtime) instead; both mirrors pass on the first run.
     Flagged for the parent as a correction, not a silent substitution.
  10. **ChallengeList page-mode deferral comment + negative short-link check, done.** The comment at
      "marks a Traditional Chinese-only entry in the English list, with no short link (A32, E3)" now
      names the rows that take over the deferred page-mode assertion — `S54` ("Page mode × entry,
      both P"), under the "Copy control" section's seams `0010-S30`/`0010-S26` — at wave 4. Restored
      `expect(row.text()).not.toContain('/en/c/007')` (same literal as the P = en case at line 881;
      the short link's prefix follows the list's own locale, not P, so the theoretical value is
      identical). Pass on first run.
  11. **`shortLink.ts`'s P-ignoring prefix recorded for wave 4, done — this item.** `.vitepress/
      challenge/shortLink.ts:123`'s `locale === 'zh-TW' ? '/zh-TW' : ''` still hard-codes the
      zh-TW-prefix rule regardless of `primaryLocale()` (D68 names this exact line for removal).
      Covering rows: `D68` (the fix itself), `S52` (`challengePagePath`, the function `challengeLink`
      must be rewired to), `S54` ("Page mode × entry, both P", the test this defect blocks).
      Related rows in the same "Copy control" section, same defect's blast radius: `S53` (short
      mode × list locale × entry), `S55` (nav control on a challenge page), `S56` (built-site
      smoke). Reproduced by item 10's test comment (now updated) and by the earlier resumed-B2 entry
      (SECTION 1, "Component matrices") which first found it. Owner: wave 4 (area S).
  - **Commands run, with exact counts:**
    - `npx vitest run tests/unit/i18n/not-found-wiring.test.ts` → 169 passed (169; 153 before this
      part, +16 from item 1's new SW matrix).
    - `npx vitest run tests/unit/components/ChallengeList.test.ts` → 77 passed (77; 75 before this
      part, +2 from item 9).
    - `npx vue-tsc --noEmit -p tsconfig.json`, filtered to this wave's touched files: zero errors in
      `not-found-wiring.test.ts`, `ChallengeList.test.ts`, `arrival.ts`, `useArrivals.ts`,
      `localeTables.ts`. The one hit still present in a touched file
      (`ChallengeList.test.ts:829`, `Property 'exists' does not exist on type 'Omit<DOMWrapper<Element>,
      "exists">'`) is the same pre-existing, unrelated error wave 2 part B2 already recorded at its
      former line 805 — confirmed outside every line this part changed.
    - `npx vitest run tests/unit/i18n/ tests/unit/components/ tests/unit/layouts/ tests/unit/theme/`
      (broader regression sweep) → 1 failed, 42 passed (43 files); 1 failed, 1931 passed (1932
      tests) — the one failure is the carried `locales.test.ts` B18 command 2, unchanged.
    - `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test
      --run --no-file-parallelism` → **Test Files 4 failed | 145 passed (149); Tests 6 failed | 6092
      passed (6098)**, exit 1. Run twice with a JSON reporter to get machine-checkable exact names;
      the first of the two (while an earlier, stray background instance of the same command — this
      session's own leftover, killed mid-run — was still writing to the same live-tree fixture
      `platform/challenge/door-is-open/`) showed 4 extra, non-reproducing failures in
      `challenge-keygen.test.ts`'s "CLI rejects an unusable source_files entry" describe (a
      pre-existing, out-of-scope test that writes into the live repository tree and cleans up only
      in its own `afterEach` — already named as such in the 2026-11-16 "parent, new session" entry
      above); a second, clean run with no concurrent instance reproduced exactly the six carried
      failures named in the handoff, by file and title, with no other and no new failure:
      `tests/unit/i18n/locales.test.ts` B18 command 2; `tests/unit/site/redirects-generated.test.ts`'s
      byte-identical case; `tests/unit/site/redirects.test.ts`'s three cases; `tests/unit/scripts/
      challenge-keygen.test.ts`'s Y59 payload-integrity case. The total rose from the corrected B2
      entry's 6080 by exactly 18 (16 new SW-matrix cases + 2 new SSR mirrors; every other item in
      this part edited an existing case's assertions without adding or removing a case).
    - `pnpm --dir create-wxl test` not run: this part touches neither `create-wxl/` nor fork:init
      (confirmed: `git status --short -- create-wxl/` prints nothing).
  - No file under `platform/` was created, moved or edited by this part; `git status --short`
    before and after this run shows the same `platform/` adds/renames/modifications wave 1 already
    staged, nothing added, removed or re-staged.

- 2026-11-17 (wave 2 part B4 (closing), the last fix round for wave 2). Scope confirmed by the
  parent under the standing authorization quoted above (2026-11-16, 「授權：所有建議我都同意，權限都
  授權到兩個 epic 完成…」) as HEAD `49630f2`; items (1)–(7) below, listed as decisions where the
  parent marked them `[decision]`. Files touched: `tests/unit/i18n/not-found-wiring.test.ts`,
  `tests/unit/components/ChallengeList.test.ts`, this ticket. No file under `platform/` touched; no
  `git add`/`commit`/`stash`/`checkout`/`reset`/`restore` run.
  1. **SW matrix in `not-found-wiring.test.ts`, done, in seven cycles (1a–1g):**
     - **1a (navigate rows' Line column):** added `expect(layout.find('[data-missing-translation]').exists()).toBe(false)` inside the `row.decision === 'navigate'` branch. Pass on first run (16/16), as the row predicted. Non-vacuity: a temporary mutation of `.vitepress/theme/index.ts`'s `renderLine` (always render the line component) turned the six navigate rows red — `expected true to be false` at this new line — reverted, `git diff` clean.
     - **1b (SW03/06/09/12 own-locale rows, seed-a-line-then-remove-it), NOT done — reports a conflict, not a guess.** Written exactly as specified (choose the OTHER locale first, assert a line shows, then choose the row's own locale and assert it is removed) and run: all four fail already at the SEEDING assertion itself — `expected false to be true` — not at the predicted "pass on first run", and not at any later removal step. Read `switcherDecision`/`choose` (`.vitepress/theme/i18n/arrival.ts`, `.vitepress/theme/composables/useArrivals.ts`): SW03's/SW06's/SW09's/SW12's own scenario pages are the SAME pages SW01/SW04/SW07/SW10 already use with a LISTED counterpart, so choosing the other locale there is provably a `navigate` (confirmed: it is literally those rows' own scenario), and `choose()`'s navigate branch never sets `requested`/`lineAtOnce` — so no line is ever shown to seed from, on any of these four rows' own pages. The row's premise (that choosing the other locale on these exact rows stays, with a line) does not hold against the current production code; implementing it would require swapping in a DIFFERENT, not-otherwise-used page per row, which is a design choice this report leaves to the user rather than guessing. Reverted the written attempt in full; `git diff` on the test file shows no trace of it.
     - **1c (SW06/SW12 Writes assertion, discriminating):** wrapped the final `switcher.choose!(scenario.chosen)` call in a `vi.spyOn(window.localStorage, 'setItem')` for these two rows only, asserting it was called with `(LOCALE_STORAGE_KEY, scenario.chosen)` during that call. Pass on first run (16/16). Non-vacuity: a temporary mutation of `choose()` (`rememberChoice` skipped when `decision.kind === 'stay' && arrival.kind === 'page'`) turned both rows red — `expected "setItem" to be called with arguments: […] Number of calls: 0` — reverted, `git diff` clean.
     - **1d (mockGo.mockReset() scope):** narrowed the per-row reset to `row.id ∈ {SW13,SW14,SW15,SW16}` only. Defensive, as the row said: still 16/16, no red/green cycle.
     - **1e (P × base cross):** `describe.each` now crosses `['en','zh-TW']` with `BASES` (imported from `tests/__helpers__/localeTables.ts`), setting `mockBase.value` and prefixing `arrive()`'s path and the navigate target with `b.prefix`. Pass on first run: 32/32 (16 rows × 2 bases).
     - **1f (failed-load page kind):** added a second `describe.each(['en','zh-TW'])` block, one representative failed-load mirror per SW13–16 (a published page's own path, `isNotFound: true`, so `classifyArrival` resolves `'failed-load'` rather than `'not-found'` — confirmed by reading `classifyArrival`, not assumed). Pass on first run: 4/4, plus the 2 pre-existing "does nothing on a failed load" cases unaffected (6/6 matched by `-t "failed load"`). Non-vacuity, corrected from the row's own suggested mutation: hardcoding `classifyArrival` to always return `'not-found'` does NOT turn these four cases red (switcherDecision's non-'page' branch treats both kinds identically, so the two existing mount-time "does nothing on a failed load" cases catch that mutation instead — confirmed empirically, reverted). The mutation that DOES discriminate THIS block: making `switcherDecision` special-case `arrival.kind === 'failed-load'` to always stay (ignoring `lookupNotFound`) turns SW13 and SW15's failed-load mirrors red — `expected 'stay' to be 'navigate'` — reverted, `git diff` clean on `arrival.ts`.
     - **1g (SW_SCENARIOS tied to SW's own columns):** added, inside the loop, an assertion that `scenario.page.isNotFound` matches `row.page === 'not-found'`, and (for `row.chosen !== 'either'`) that `scenario.chosen` equals the locale `row.chosen`/`row.page` name. Pass on first run (32/32). Non-vacuity: temporarily swapping SW03's `chosen` to `'zh-TW'` (wrong) turned it red — `expected 'zh-TW' to be 'en'` — reverted.
  2. **[decision] ChallengeList.test.ts, deleted the P = zh-TW mirror's E3-specific assertions.** Removed `expect(row.find('[data-short-link]').exists()).toBe(false)` and `expect(row.text()).not.toContain('/en/c/007')` from "under P = zh-TW, marks a Traditional Chinese-only entry in the English list, with no short link (A32, E3)"; kept the mark/lang assertions and the page-mode deferral comment. Added a note, in the kept comment and in this entry, that wave 4's S53 adds the inverse (a borrowed numbered zh-TW entry showing `/en/c/007` in short-link mode) for both P. `npx vitest run tests/unit/components/ChallengeList.test.ts` → 77 passed (77), unchanged (an in-case removal, not a case removal).
  3. **A28 link half, replaced the fixture-echo with the real requirement, done — does not depend on wave 4.** Read `shortLink.ts` first: `shortLinkPath` (short mode) is already `/${locale}/c/${NNN}`, with no zh-TW hard-coding — only the PAGE-mode URL (line 123) still hard-codes it, which is D68/wave 4's, and stays undisturbed. Replaced the fixture-echoed `href`/`row.attributes('href')` assertions in both the SSR test (`under P = zh-TW, ships the mark of a borrowed entry…`) and the `mountList` test (`under P = zh-TW, marks a borrowed entry 只有英文…`) with `[data-short-link]` text assertions (`${DISPLAY_ORIGIN}/zh-TW/c/005`, from `pageLocale = pageLocaleOf('root','zh-TW') = 'zh-TW'`). Pass on first run both times. Non-vacuity: a temporary mutation of `shortLinkPath` (hard-coding `/en/c/…` regardless of `locale`) turned both new assertions, plus two other pre-existing short-link assertions in the file, red (4 failed); reverted, `git diff` clean on `shortLink.ts`.
  4. **D29 real-Layout case, P = zh-TW mirror added, done.** New case "under P = zh-TW, a stored T preference does not cause a second cold-load redirect after an NP landing (A19, D29)": stored `en`, arrives `/zh-TW/guide/python` (NOT_FOUND double) → one `go('/guide/python', {replace:true})`; reset; arrives `/guide/python` as a later page arrival → no second `go`. Pass on first run (alongside the unchanged P = en original, 2/2). Non-vacuity, both cases: a temporary mutation of `useArrivals.ts`'s route watcher (treating every later arrival as a cold load too, calling `redirectTargetForStoredLocale` unconditionally) turned BOTH the P = en original and the new P = zh-TW mirror red — one extra `go()` call each — reverted, `git diff` clean.
  5. **A20 mirror, non-vacuity re-confirmed, done — one correction to the handoff's own finding.** Re-ran the handoff's two-part mutation (`useArrivals.ts`'s `primaryLocale()` call site hardcoded to `'en'` AND `pages` hardcoded to the P = en-shaped list, together) against "under P = zh-TW, does the same for a client-side navigation to a missing translation": confirmed red, with the extra call `go('/zh-TW/guide/python', {replace:true})` the handoff named — but it surfaces at the FIRST assertion (`expect(mockGo).not.toHaveBeenCalled()` right after mount), not only at the later "called 1 times, but got 2 times" assertion the handoff's wording implied. Hardcoding ONLY `primaryLocale()`'s call site (without also hardcoding `pages`) does NOT turn it red, confirmed empirically, consistent with B3's own item 6 finding (the P-dependent `publishedPages` fixture defeats the single-part mutation). No test or production file left changed; this is a verification step, recorded in the corrected comment (item 7 below).
  6. **B3-7's toHaveBeenCalledTimes(1), added to the P = en original, done.** Added to "goes to the counterpart from a not-found page the gate is holding, as a push (B7)", mirroring its own P = zh-TW mirror. Pass on first run. Non-vacuity: a temporary mutation of `choose()`'s navigate branch (calling `router.go` twice) turned 19 cases red across the file, including this one; reverted, `git diff` clean.
  7. **Comment fixes, done:**
     - B3-6's comment (~line 331): replaced the no-longer-discriminating example ("useArrivals ignoring P and treating itself as P = en" alone) with item 5's re-confirmed one (hardcoding both the call site AND `pages`), and recorded where the resulting failure actually surfaces (the first assertion, not only the later one).
     - The self-contradicting A19/D29 comment (~line 191): rewritten — neither `/en/guide/python` nor `/en/challenge/v05-php-check/` is itself published; they differ in whether their OWN counterpart (the zh-TW version) is published.
     - `ChallengeList.test.ts`'s stale `(881)` line reference: gone as a side effect of item 2's deletion (the whole comment carrying it was removed); confirmed by `git grep -n "881" tests/unit/components/ChallengeList.test.ts` → no hits.
     - The deferral comment's ID namespace: "alongside S30 and S26" → "seams `0010-S30`/`0010-S26`, rows S52–S56" (folded into item 2's edit, to disambiguate from traceability.md's own bare row ids S26/S30).
     - This ticket's B3 entry's `S1-j` → `S1-SW-full-matrix` (line 1704 at the time of this edit): `S1-SW-full-matrix` (B2 entry, "pure-function table already proves … exhaustively") is the finding that predicted the full-SW-table pass-on-first-run; `S2-j` is a different, unrelated confirmation (now-false comments + SW13–16 both-chosen).
     - Flagged, not rewritten as a new paragraph: B3's closing part edited B2's own "the total rose … by exactly 132" counting parenthetical in place, rather than leaving it and recording the correction in a later entry the way S2-i's wording correction was handled. A bracketed flag is added at that paragraph pointing here.
  - **Commands run, with exact counts:**
    - `npx vitest run tests/unit/i18n/not-found-wiring.test.ts` → 190 passed (190; 169 before this part).
    - `npx vitest run tests/unit/components/ChallengeList.test.ts` → 77 passed (77), unchanged.
    - `npx vitest run tests/unit/i18n/not-found-wiring.test.ts tests/unit/components/ChallengeList.test.ts` → 267 passed (267).
    - `npx vue-tsc --noEmit -p tsconfig.json`, filtered to this part's touched files: fixed two new `TS2353`/`TS18047` errors in the new `FAILED_LOAD` block (a `Record<string, …>` typed too loosely for its nested per-`P` shape; corrected to `Record<'en' | 'zh-TW', Record<string, FailedLoadScenario>>` with an explicit cast on `Object.entries`). Zero errors afterward in both touched test files. The one pre-existing hit in `ChallengeList.test.ts` (now line 832, `Property 'exists' does not exist on type 'Omit<DOMWrapper<Element>, "exists">'`) is outside every line this part changed — confirmed against `git diff`'s hunks (662, 930, 950) — and is the same error wave 2 parts B2/B3 already recorded at its former lines 805/829.
    - `npx vitest run tests/unit/i18n/ tests/unit/components/ tests/unit/layouts/ tests/unit/theme/` (broader regression sweep) → 1 failed, 42 passed (43 files); 1 failed, 1952 passed (1953 tests) — the one failure is the carried `locales.test.ts` B18 command 2, unchanged. Total rose from B3's 1932 by exactly 21 (16 SW base-cross rows + 4 failed-load mirrors + 1 D29 mirror; every other item edited an existing case without adding or removing one).
    - `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test --run --no-file-parallelism` → **Test Files 4 failed | 145 passed (149); Tests 6 failed | 6113 passed (6119)**, exit 1. An earlier attempt with `--reporter=json` crashed with an unrelated `AggregateError [ECONNREFUSED]` on `::1:3000`/`127.0.0.1:3000` after the run itself had already finished (a leftover async network call in an unrelated unit test, not caused by any file this part touched); re-run with the default reporter to a log file completed cleanly (exit 1 from the test failures themselves) and named the exact six, by file and title, matching the handoff's list with no other and no new failure: `tests/unit/i18n/locales.test.ts` B18 command 2; `tests/unit/site/redirects-generated.test.ts`'s byte-identical case; `tests/unit/site/redirects.test.ts`'s three cases; `tests/unit/scripts/challenge-keygen.test.ts`'s Y59 payload-integrity case (counted twice, once per vitest retry attempt). The total rose from part B3's 6098 by exactly 21, the same 21 named above.
    - `pnpm --dir create-wxl test` not run: this part touches neither `create-wxl/` nor fork:init (confirmed: `git status --short -- create-wxl/` prints nothing).
  - No file under `platform/` was created, moved or edited by this part; `git status --short` before and after this run shows the same `platform/` adds/renames/modifications already staged, nothing added, removed or re-staged; `git stash list` is empty.
  - **Row 1b left undone** (see item 1 above) — reported as a conflict between the approved row's premise and the current production code/fixtures, not guessed around. **Every other row in the confirmed plan (1a, 1c–1g, 2–8) is done.** wave 2 closed; remaining P2s go to stage 6.

### 2026-11-17 (parent, new session; standing authorization renewed)

- The user, in chat on 2026-11-17, quoted: 「授權：所有建議我都同意，權限都授權到兩個 epic 完成，範圍照
  .proj.handoffs/2026-11-15-0034-primary-locale-epics.md 的「已核准的決定與授權」。每一項核准仍要列給我看。
  executor 要我決定的事，請在票的 Comments 引用我這段話並寫明範圍。」
- Scope: the remaining orchestrator segments of this ticket's approved test plan (2z, 5c-pre, 3a–9), stages 6–9, and
  the decisions an executor would otherwise refer to the user inside them, provided the decision follows the approved
  test plan, spec revision 2.3 and the agent's recommendation, and is listed to the user.
- Not in scope, still stopped for the user in person (the user's words, same message): creating or deleting a GitHub
  repository, including stage 8's F-3 temporary range; pushing the stage 8 fixture branches (`stage8/T-0077`,
  `stage8/T-0077-en`) and deleting them afterwards; any release (`v*` tag); RP2; RP5; any step that needs the user's
  npm login.
- Resumed from `.proj.handoffs/2026-11-17-1205-t0077-orchestrator-resume.md`: HEAD `e11a295`, not pushed; D108's move
  staged (23 files), not committed; segment 2z's edits in the working tree, unchecked. No mismatch with the handoff.

### 2026-11-17 (segment 2z)

- Done: wave 2 item 1b, SW03/SW06/SW09/SW12 "stay; removes a shown line", real Layout, both P x both bases (8 cases), as a second `it.each` inside the existing SW describe.each in `tests/unit/i18n/not-found-wiring.test.ts` (SEED_ROW = SW03:SW02, SW06:SW05, SW09:SW08, SW12:SW11; seed line asserted against the seed row's own Line column, then own locale chosen: line gone, setItem(KEY, own) called, final storage = own, `go` never called).
- First run green (198/198; 8 new): existing production behaviour (useArrivals.ts stay branch sets `requested`; own-locale line is null).
- Non-vacuity: temporary mutation of `choose()` (`arrival.kind === 'page' && detectLocaleFromPath(arrival.entry, P) !== locale`) gave 10 failed | 188 passed: the 8 new cases plus 2 hand-written cases, all at `AssertionError: expected true to be false` (line still present). Seed, return-value and write assertions did not fail. Reverted by Edit; `git diff --stat -- .vitepress/theme/composables/useArrivals.ts` empty.
- Not done: none.
- Commands: `npx vitest run tests/unit/i18n/not-found-wiring.test.ts` -> 198 passed (198) after revert. No git add needed (test file is outside platform/ and already tracked).
- Re-verified by the resumed session (2026-11-17): the four checks held (filter yields SW03+SW06 for P=en and SW09+SW12 for P=zh-TW, times 2 bases = 8 cases; seed line asserted against the seed row's Line column; `own` = row.T for a translation page, else row.P; no line before the seed choose, line shown after). Mutation repeated on `useArrivals.ts` line 180 as above: 10 failed | 188 passed, the 8 new cases failing at `not-found-wiring.test.ts:1197` (`expected true to be false`, the line-gone assertion after the own-locale choose), the 2 hand-written cases at lines 855 and 868. Reverted by restoring the file; `git diff --stat -- .vitepress/theme/composables/useArrivals.ts` empty; file back to 198 passed (198). No test or production edit was needed.
- Deferred to stage 6 (P2, frozen rubric):
  - `tests/unit/i18n/not-found-wiring.test.ts:1175` (P2, low): SEED_ROW 是手寫對照表，測試沒有斷言種子列與被測列的頁型和 P 相同（`seedRow.page === row.page`、`seedRow.P === row.P`），日後改錯對照不會被測試抓到；目前 SW02/03、SW05/06、SW08/09、SW11/12 的頁型與 P 都正確，屬額外補強，不是缺陷。
  - `tests/unit/i18n/not-found-wiring.test.ts:1175` (P2, medium): `own` 由目標列推導，但測試在 seed 頁上執行選擇，所以依賴「seed 列與目標列頁型、P 相同」這個前提；現有資料成立，但 SEED_ROW 日後改錯時沒有防護（主區塊的 B4-1g 斷言擋同類漂移，這個新區塊沒有對應斷言）。
  - `tests/unit/i18n/not-found-wiring.test.ts:1192` (P2, low): `setItem` spy 只在成功路徑 restore；`mockRestore` 之前的斷言失敗時 spy 會殘留到下一個測試（vitest.config.ts 未設 restoreMocks）。SW06/SW12 的既有區塊（約 1145–1150 行）寫法相同，非新問題，只在測試已失敗時才有影響。
- Full suite (run with `--reporter=json` to a scratch file; exit code 1): 6127 tests total: 6121 passed, 6 failed, 0 skipped/pending, 0 todo. Test files: 754 total, 745 passed, 9 failed (the 9 failed counts come from the JSON reporter's `numFailedTestSuites`, which counts describe-level suites, not files). No suite-level (non-assertion) failures.

### 2026-11-17 (segment 5c-pre)

- Authorization: 父 session 轉述使用者的常設授權（本票 Comments 已逐字引用）；本段只含已核准的 5c-pre-1 至 5c-pre-4 列，沒有需要使用者另行決定的事。
- Done 5c-pre-1：`tests/unit/scripts/challenge-keygen.test.ts` 的 describe「challenge-keygen CLI rejects an unusable source_files entry」新增 `it('runs the CLI on a copy under os.tmpdir(), never in the live repository')`，三項斷言 (a) 複本在 realpath(tmpdir()) 之下、(b) 不在 live root 之下、(c) live 的 `platform/challenge/keygen-source-files-probe` 不存在。Red 行：`AssertionError: expected true to be false // Object.is equality`（repoRoot 仍是 live root）。最小改動：新增區域函式 `copyRepoForKeygen()`（mkdtempSync + cpSync package.json、scripts/、.vitepress/（排除 dist 與 cache）、platform/、range.json（若存在）+ node_modules symlink），describe 的 repoRoot／challengeDir 改為 beforeAll 建立的複本、afterAll 移除；原 8 個案例斷言一字不動，afterEach 清除保留。改後 8 個案例＋新案例皆綠。
- Done 5c-pre-2（需使用者過目的判斷）：Y59 所在 describe 改在複本上跑（beforeEach 建複本、afterEach 重新 key 後移除複本；斷言、shim、PATH 注入、mtime 斷言不動）。Y59 列邊界條件寫「real repo's door-is-open (as today)」，複本內就是 real repo 的 door-is-open，意圖與驗收不變，只有執行位置改變；依據是修訂 2.3「CLI rows run on temporary copies」與本票「No test may write into the live repository tree」。此案例仍是承接失敗（wave 5，Y59，留給 5c），改前後失敗原因相同：改前 `ENOENT ... open '<live root>/platform/challenge/door-is-open/index.md'` 加 afterEach 的 `AssertionError: expected 1 to be +0`；改後 `ENOENT ... open '<tmp>/wxl-keygen-copy-XXXX/platform/challenge/door-is-open/index.md'` 加同一個 AssertionError。跑改動後的檔案前後，live 的 `.vitepress/wasm/template.wasm` 與 `platform/public/challenge/door-is-open/runtime.wasm` mtime 不變，`find platform .vitepress/wasm scripts -newer <stamp>` 為空，`git status --porcelain --ignored` 前後相同。
- Done 5c-pre-3：盤點結果與規劃相同，無其他寫入 live tree 的測試；實測收尾：整個 suite 跑完後 `find platform .vitepress/wasm scripts range.json -newer <stamp2>` 為空，`git status --porcelain --ignored` 與跑前逐位元組相同。
- Done 5c-pre-4：不加 `--no-file-parallelism` 連跑三次完整 suite，三次結果相同：4 failed | 145 passed (149) 檔案、6 failed | 6122 passed (6128) 測試；失敗清單只有承接失敗（locales B18 command 2；redirects-generated byte-identical；redirects.test.ts 三個案例；keygen Y59 印兩次算一個），沒有 PL-E08 類（config-base／page-list）失敗。與循序結果一致（6113 passed + 2z 的 8 案例 + 本段 1 案例 = 6122；failed 不變）。
- Not done: 無。Y52–Y61 的 keygen production 與列仍在 5c。
- Commands: `npx vitest run tests/unit/scripts/challenge-keygen.test.ts` -> 改動前 2 failed | 78 passed (80)（新案例 red + Y59 承接），改動後 1 failed | 79 passed (80)（只剩 Y59）；`GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true pnpm test --run` x3 -> 每次 4 failed | 145 passed (149) 檔案、6 failed | 6122 passed (6128) 測試。沒有 git add（測試檔在 platform/ 之外且已追蹤）；未 commit。
- Deferred to stage 6 (P2, frozen rubric):
  - `tests/unit/scripts/challenge-keygen.test.ts:1224` (P2, high): Y59 afterEach 的註解已過時，仍說重新 key 讓「local tree」與「author's door-is-open」維持一般 keygen 後的狀態，但重新 key 現在跑在隨後就刪除的暫存複本上，不再保護任何作者的狀態。斷言依「保留所有斷言」的範圍保留，只有理由文字過時。
  - `tests/unit/scripts/challenge-keygen.test.ts:904` (P2, medium): 新案例「runs the CLI on a copy」的斷言 (c) 檢查的是測試 fixture 自己寫入的 brief 目錄，不是 CLI 寫入的東西；(a)(b) 只檢查 repoRoot 變數，沒有斷言直接證明 CLI 行程的寫入停在複本內。實際上隔離成立（CLI 由自身位置推導 root；跑前後 `git status --porcelain --ignored` 相同、`find -newer` 為空）。
  - `tests/unit/scripts/challenge-keygen.test.ts:1224` (P2, high): 同上第一條（Y59 afterEach 註解過時；`rmSync(repoRoot, ...)` 在斷言前刪除複本，重新 key 與 `expect(r.status).toBe(0)` 的既述理由不再適用，僅文字）。
  - `tests/unit/scripts/challenge-keygen.test.ts:897` (P2, high): 新的隔離案例插在既有註解與該註解所描述的測試之間；註解「The slug is asserted alongside the path…」（897-898 行）現在位於 `it('runs the CLI on a copy…')` 正上方，實際屬於下一個測試 `exits non-zero and names the slug…`。僅位置與可讀性。
  - `tests/unit/scripts/challenge-keygen.test.ts:815` (P2, medium): `copyRepoForKeygen` 只複製手選路徑（package.json、scripts、.vitepress、platform、range.json）並連結 node_modules，日後 keygen 若依賴其他頂層路徑，這些 CLI 測試會以令人困惑的方式失敗。現況 CLI 只讀 platform/ 與 .vitepress/wasm（`scripts/challenge-keygen.ts:611, 825-828`），複本足夠（80 個案例中 79 個通過，唯一失敗是承接的 Y59）；屬強化建議，不是現有缺陷。
- Full suite (segment 5c-pre, final): 6128 tests total in 149 files: 6122 passed, 6 failed, 0 skipped/pending/todo (754 suites).

### 2026-11-17 (parent, decision on segment 5c-pre's needs_user; 依使用者授權核准)

- The executor asked the user to look at 5c-pre-2: the Y59 describe ("real repo's door-is-open (as today)") now runs
  on a temporary copy of the repository instead of the live tree.
- Decision: approved under the user's standing authorization, quoted in the 2026-11-17 parent entry above
  (「授權：所有建議我都同意，權限都授權到兩個 epic 完成…executor 要我決定的事，請在票的 Comments 引用我這段話並寫明範圍。」).
  Scope of this approval: only where the Y59 describe runs (its `repoRoot`); its assertions, shim, PATH injection,
  mtime checks and the re-key in `afterEach` stay as they were.
- Why it is inside the authorization: the segment's own scope asks for exactly this move; revision 2.3 says CLI rows
  run on temporary copies (traceability.md, closing paragraph); the orchestrator rule is that no test writes into the
  live tree. The copy holds the real `platform/` with door-is-open, so the row's boundary condition is unchanged.
- Parent's check: `git diff -- tests/unit/scripts/challenge-keygen.test.ts` shows only `repoRoot`, `mdPath` and
  `wasmPath` becoming per-test values from `copyRepoForKeygen()` plus the copy's removal; no assertion removed.
  The independent checkers still review this segment under the frozen rubric.

### 2026-11-17 (segment 3a: the loader and the lists, rows L1–L20, L22, B79, B44, Y113 loader half, Y39)

- Authorization: the parent's go-ahead under the user's standing authorization quoted above; this segment has no
  decision of its own to ask.
- Done, with the red line seen before the change (first line of the failure; "green first" = green on first run, reason given):
  - L18 messages half (`messages-shape.test.ts`, 2 cases): `expected undefined to be 'Web exploitation challenge'`,
    `expected undefined to be 'General'`. PAT3 `git grep -nE "Web exploitation challenge|網站攻防挑戰" -- platform/shared`
    printed the two DEFAULTS lines before, prints nothing now (exit 1).
  - L1: `TypeError: briefs is not iterable`. L2: `expected [ { id: 1, number: 1, …(8) } ] to deeply equal [ … ]` (the first
    implementation copied the primary brief into every list). L3: green first, because L2's fix already fell back to the
    primary brief; non-vacuity: removing the fallback gives `TypeError: Cannot read properties of undefined (reading 'frontmatter')`.
  - L4, L5: green first (listing looks only at the primary brief from L1 on); non-vacuity: listing every slug turns 6 cases red.
  - L9: `expected [ [ 'staff-only', 1 ], … ] to deeply equal [ [ 'door-is-open', 1 ], … ]`.
  - L10: green first (Map keys are exact, L9's sort is the default one); non-vacuity: `localeCompare` gives
    `expected [ [ 'apple', 1 ], [ 'door', 2 ], … ] to deeply equal [ [ 'Zed', 1 ], … ]`.
  - L11: `expected 2048 to be 'Web exploitation challenge'`. L12: `expected '7' to be undefined`. L13: `expected 3 to be 'mystery'`.
    L14: `expected 1 to be 'General'`. L15: `expected 'not a date' to be null`. L16: `expected [ 'a', 3, null, 'b' ] to deeply equal [ 'a', 'b' ]`.
    (L12–L16 were written together, run once to see each red, then implemented in one edit.)
  - L17: green first (each field reads only its own source); non-vacuity: `...declaration` spread fails.
  - L7 (three locales, 6 cases) and L8 merge half (2 cases): green first (the lists are built from the `locales` argument,
    defaults are read lazily); L8 loader half (2 cases) green first for the same reason.
  - L19: module load error `content loader invoked without an active vitepress process, or before vitepress config is resolved.`
  - L20: `TypeError: loadChallengeLists is not a function`. L6 (4 reasons × 2 P + the unlisted case): `promise resolved "{ en: [ … ], … }" instead of rejecting`.
  - Y113 loader half: green first (entries are built field by field); non-vacuity: `Object.assign({}, declaration, {…})`
    gives `expected { polluted: 1 } to be { …(12) }`.
  - B79 grep half: `expected '---\nlayout: home\n…' to contain 'from \'../shared/challenges.data.ts\''` (4 pages + the deleted loader name).
  - L22 ChallengeList (4 cases): `TypeError: Cannot read properties of undefined (reading 'map')`; the 33 mount/ssr calls then moved to
    `lists: listsOf(…)` with no assertion changed. L22 HomeContent (4 cases): `TypeError: Cannot read properties of undefined (reading 'length')`.
  - B79 smoke half: `docs:build` exit 0 before the change (the import fix was enough); then Playwright `-g B79`:
    `Expected: 4  Received: 0`; after `:lists="data"` on the four pages: passes.
  - B44: the set clause failed with 13 spelling differences before the `<P>/` prefix was dropped, passes now; the home clause
    (new) is green first because wave 1(f) already did the rewrites.
  - Y39 (4 slugs + one guard case): green first (the build already assembles one declaration for both briefs; its earlier red was
    the missing build). Non-vacuity: negating the `source_visible` expectation turns 4 cases red.
- Source change beyond the plan's listing: `declarationReadError(briefSourcePath, slug, reason)` in `.vitepress/challenge/declaration.ts`
  (L6's planned extraction; `plugin.ts` calls it, texts unchanged, `plugin.test.ts` green); `ChallengeData` now follows L-§4.3.
- Not done: none of the listed rows. Not touched (other segments): SITE_PAGES / `pageUrlOf` / L37–L39 and the fixture pages (3b),
  `expectedUrlFor` (S56, wave 4), LW1 warning and L32/L45 (T-0079).
- Index: `git add` of `platform/shared/challenges.data.ts`, `platform/shared/mergeChallenges.ts`, the four list/home pages
  (`platform/en/index.md`, `platform/en/challenges.md`, `platform/zh-TW/index.md`, `platform/zh-TW/challenges.md`); `git rm` of
  `platform/shared/challenges.zh-TW.data.ts`. Untracked and NOT added: `tests/site-smoke/localePath.ts` (outside platform/).
- Commands: `pnpm docs:build` exit 0 (twice, before and after the `:lists` change). Targeted `pnpm exec vitest run` of merge-challenges (83),
  challenge-data-loaders (24 in total with the P-split cases), messages-shape, ChallengeList (81), HomeContent (17), plugin.test.ts, locales.test.ts:
  7 files, 266 tests, 265 passed, 1 failed (`locales.test.ts` B18 command 2, carried: only `.vitepress/challenge/shortLink.ts:61` is left, wave 4).
  Wider run `tests/unit/{site,challenge,i18n,components}`: 2770 tests, 5 failed = that one plus `redirects-generated` (1) and `redirects` (3),
  all carried from the earlier waves (wave 4, area S). Playwright `-g "B79|Y39|translated challenges"`: 6 passed; `-g "page list spelling|B44"`: 2 passed.

### 2026-11-17 (parent, decisions on segment 3a's needs_user; 依使用者授權核准)

Under the user's standing authorization quoted in the 2026-11-17 parent entry above (「授權：所有建議我都同意，權限都授權到
兩個 epic 完成…executor 要我決定的事，請在票的 Comments 引用我這段話並寫明範圍。」). Scope: the three items segment 3a's
executor raised; nothing else.

1. Y39's "number". Approved as implemented, with its limit recorded. The parent checked the built page
   (`.vitepress/dist/challenge/door-is-open/index.html`): the challenge page shows no bare number; the only
   number-derived element is the copy control `[data-short-link]`, and in page mode (this build has no `CF_PAGES`) its
   text is the page address, not `/c/NNN`. So the smoke test's `numberControl` proves both pages have the control (it
   renders only for a valid number) but cannot tell two different valid numbers apart. The number itself being the same
   in both lists is covered at unit level by L2 (number equals the primary list's in every list) and by wave 1(f)'s
   assembly rows (one declaration feeds every brief). Recorded for stage 6 as a spec wording item: Y39 says "the same
   ... number", which a page-mode page cannot show. The independent checkers still grade this row under the frozen
   rubric; a P1 from them goes to the single fix round.
2. `tests/site-smoke/localePath.ts` (new, outside `platform/`): committed with this segment by the commit step.
3. Smoke cases owned by later segments (SITE_PAGES / pageUrlOf, REFERENCE, L37's beforeAll: 3b and 3c; expectedUrlFor,
   S56: 4d; L32/L45 warnings: T-0079): noted, no decision needed. They are Playwright cases, outside the vitest suite
   the orchestrator compares.

### 2026-11-17 (segment 3a, fix round)

- Authorization: the parent's go-ahead for segment 3a's single fix round, under the user's standing authorization quoted above;
  no decision of its own. Test-only; no production file changed; nothing added to the index.
- L8 merge half, three-locale boundary (finding 1): two `it` cases added inside the `three locales, P = %s` block of
  `tests/unit/site/merge-challenges.test.ts` (after L7), 6 cases with the three values of P. Green first, reason: the lists are
  built by looping over the `locales` argument and `listed` filters on `has(primary)`; no code path depends on the two-member
  LOCALES. Run: 89 passed (83 + 6).
- Y39 number (findings 2 and 3): `declaredView` in `tests/site-smoke/site-smoke.spec.ts` reads the hydrated page's
  `$frontmatter.number` through `#app.__vue_app__` (reachable in the built bundle, so no fallback) and returns it as `number`;
  the Y39 test pins `primaryView.number` to `declaration.number`. Green first, reason: both pages assemble `number` from the one
  declaration. Can-fail proof (scratch spec, deleted): rewriting `"number":N` to 999 in the zh-TW page's chunk gives
  `Expected: 1 / Received: 999`. Playwright `-g "translated challenges"`: 5 passed.
- Full suite (suite step): 6236 tests in total: 6230 passed, 6 failed, 0 skipped or pending (4 failed test files). All 6
  failures match allowed entries, so the `--no-file-parallelism` re-run was not run. The first attempt did not run because zsh
  failed on the `rm` glob; the `rm` was re-run through bash and the suite then ran once.
- Deferred to stage 6 (P2, frozen rubric):
  - `tests/unit/site/challenge-data-loaders.test.ts:87`: L6 uses `rejects.toThrow(string)` (substring check) where the row says "equals" the 0010-S32 formatter's text; extra trailing text would still pass. Production is correct today.
  - `tests/unit/site/challenge-data-loaders.test.ts:87`: L6 用 `rejects.toThrow(string)` 斷言錯誤訊息，這是子字串比對，不是 AC 寫的「equals」；改成 `rejects.toMatchObject({ message })` 或完整錨定的正規式才是完全相等。目前 production 行為正確。
  - `.vitepress/theme/index.ts:245`: stale comment still describes the removed `challenges` prop and the old pages (`platform/challenges.md`); the prop is now `lists: ChallengeLists` (D40), line 250 still says HomeContent is used in `platform/index.md`.
  - `tests/site-smoke/site-smoke.spec.ts:291`: Y39 hard-codes the locale codes in its regex (line 271) and never closes its browser contexts.
  - `tests/site-smoke/site-smoke.spec.ts:291`: Y39 每個 slug、每個翻譯語系開兩個 `browser.newContext()` 從不關閉（8 個 context 留到 worker 結束），沒有對應的 `context.close()`。
  - `tests/unit/components/HomeContent.test.ts:209`: the L22 HomeContent case resets `mockWithBase.prefix` only when it passes; no `afterEach` or file-level `beforeEach` resets it.
  - `tests/unit/components/HomeContent.test.ts:209`: L22 HomeContent 只在測試成功時把 `mockWithBase.prefix` 重設成 `''`，檔案層級沒有 `beforeEach` 負責重設（今天它是檔案最後一個 describe，不影響其他案例）。
  - `tests/unit/site/merge-challenges.test.ts:214`: L17 fixture has `number`/`difficulty` on both sides, so an implementation that falls back to the brief's value when the declaration omits it still passes; L12/L13 absent cases use a brief with only `title`. A hardening suggestion beyond the row's AC.
  - `tests/unit/site/merge-challenges.test.ts:225`: L8 merge half is tested with two locales only for "locale without a brief borrows everything" and "P without a brief gives `[]`"; L7 covers key order and the ja borrow with three locales.
  - `platform/shared/challenges.data.ts:49`: `frontmatterOf` returns `{}` silently on a YAML parse error, so the list falls back to the default title with no message. Low impact; hardening suggestion, not a row's behavior.
  - `tests/unit/site/merge-challenges.test.ts:160`: /tdd deviation recorded by the executor: L12-L16 were written together and run red once, then implemented in one edit, not one cycle per row. Every red was seen and no row was dropped.
  - `tests/site-smoke/site-smoke.spec.ts:270`: `numberControl` strips the locale segment with a literal `/\/(en|zh-TW)\//` and `declaredView` types its `locale` as `'en' | 'zh-TW'`; neither is derived from LOCALES / `localePath` (D54). Left over from the earlier finding 3.
  - `tests/site-smoke/site-smoke.spec.ts:272`: `number` is read through the internal `#app.__vue_app__` and VitePress's `$frontmatter`; neither is public API. If they stop being readable the test fails (null), it does not pass by mistake.
  - `tests/site-smoke/site-smoke.spec.ts:293`: this Playwright run used the existing `.vitepress/dist` without a rebuild (`webServer` runs only `pnpm docs:preview`), so there is no evidence that `dist` matches the current sources (`plugin.ts`, `declaration.ts` have uncommitted changes). Affects freshness of the verification only.

### 2026-11-17 (segment 3b)

Smoke fixtures, rows L34–L39, L47 and L43 (run only). Executor, under the user's standing authorization quoted above.

- L35 predicate (cycle 1): `isSmokeFixturePage` in `.vitepress/pageList.ts`. Red: `TypeError: isSmokeFixturePage is not a function` (6 cases). Green after.
- L35 page list (cycle 2): `pageListFromDir(srcDir, primary?, { smokePages? })`. Red (flag off, both P): `AssertionError: expected [ '/smoke-fixtures/a/b', …(2) ] to deeply equal []` (P=en) and `expected [ '/en/smoke-fixtures/a/b', …(2) ] to deeply equal []` (P=zh-TW). The flag-on cases were green first run: the argument was ignored and the list already held the fixtures.
- L34 (cycle 3): `loadConfig` takes `smokePages`; eight values. Red: the seven non-`'1'` values `expected false to be true` (srcExclude lacked `<code>/smoke-fixtures/**`); `'1'`: `expected false to be true` (page list lacked the entries). Fixture pages created (L-§4.5, verbatim, no path label) and `git add`-ed. The page-list real-tree oracle now skips `<LOCALES code>/smoke-fixtures/` itself unless `WXL_SMOKE_PAGES='1'`; the new `=1` variant was red (`Set` mismatch, two entries missing) until `config.mts` read the flag. The plan's "intermediate red" of the production case did not occur: cycle 2 already made the default list skip fixtures, so the production case stayed green after the pages were added. Production: `SMOKE_FIXTURE_GLOBS` exported by `pageList.ts` (the folder-name literal appears only in `pageList.ts`; `config.mts` spells none), `config.mts` reads `WXL_SMOKE_PAGES === '1'` once.
- L47 (cycle 4): new `client-graph-no-smoke-fixtures.test.ts`, walk of 65 files from `.vitepress/theme/index.ts`. Green on first run, as planned (cycles 1–3 put the literal in node-only modules). Non-vacuity: guard (> 50 files, known members) and the temporary-graph cases (dynamic import and `.vue` script edge walked, `import type` and `import { type … }` edges skipped). Manual mutation: appended a comment with the literal to `.vitepress/theme/linkMode.ts` gave `expected [ '.vitepress/theme/linkMode.ts' ] to deeply equal []`; restored (no theme diff).
- L36 structural (cycle 5): new `smoke-fixture-switch.test.ts`. Red: (a) `expected undefined to be '! find .vitepress/dist …'`, (b) `expected undefined to be '1'`; (c) green first (nothing set yet). `quality-gates.yml`: `site-smoke` build step `env: WXL_SMOKE_PAGES: '1'`; `build` job step "Check no smoke fixture shipped" (block scalar, PAT4). `tests/unit/workflows` 87 passed. PAT4 run by hand: exit 0 on a production dist, exit 1 on a `WXL_SMOKE_PAGES=1` dist (the "fails on a test build" half; the stage 8 VL6 check is still due on CI).
- L39 (cycle 8, red taken before the beforeAll): production build, `-g "page list spelling"`: `expect(new Set(html)).toEqual(new Set(md))` at line 71 failed, md side holding `/en/smoke-fixtures/english-only` and `/smoke-fixtures/traditional-chinese-only`. On the test build it passes. Only a comment added.
- L37 (cycle 6): file-level `test.beforeAll` (opens both fixture URLs with `browser.newPage({ baseURL })`, needs status 200 and the h1, zero-width anchor stripped). On the production build the first test failed with: `/en/smoke-fixtures/english-only is not the smoke fixture (status 404, h1 "PAGE NOT FOUND", expected "Smoke fixture: English only"). This suite needs a test build: run `WXL_SMOKE_PAGES=1 pnpm docs:build` (or `WXL_SMOKE_PAGES=1 pnpm build`) before `pnpm test:smoke`.` Note: Playwright reports a failed `beforeAll` as 1 failed and 25 did not run, not as 26 failed; every test still does not pass. The first test-build run showed the h1 text carries a zero-width anchor (`"Smoke fixture: English only ​"`), fixed in the check.
- L38 (cycle 7): `REFERENCE` and its header sentence removed; `EN_ONLY`, `ZH_ONLY`, `X()` added; all six L-§4.7 rows rewritten (fallback 2 × 3 stored values, served HTML 2, Back, switcher 3 widths × 2 directions, cold load 4, with expectations for the cold loads written per arrival rule A1/A2/A4/A5 so they hold under either P; the Back case compares with the list path seen before the fallback, since a stored `en` may already move the list to its counterpart by A3). Before the rewrite, on the test build (REFERENCE cases, P=zh-TW): fallback x3 failed at `toHaveAttribute('href', '/zh-TW/challenges')` (line 131), switcher x3 at `toHaveCount(0)` (line 214), cold load with en stored at `toHaveCount(0)` (line 312). After: all L-§4.7 cases pass first run (reason: wave 2 routing is implemented). `git grep -n "attack-log-export-format" -- tests/site-smoke` prints nothing. Mutation: `MissingTranslationLine.vue` `:lang="locale"` -> `lang="xx"` and a test rebuild: 13 of the 16 selected cases failed (`toHaveAttribute`); restored and rebuilt.
- L43 (cycle 9, run only): `pnpm test:challenges`: 4 passed.
- Still red in `missing-translation.spec.ts` on the test build (not this segment's rows; 6 cases): "a choice in the custom locale switcher on an article is stored, and Back returns (B1)", "the switcher in a challenge page's bar goes to the translation that exists (B1)" at 1280, 1024 and 375, "a cold load of an alias goes to the counterpart's list entry", "a cold load of a published /zh-TW/ page stores zh-TW". All use `/zh-TW/…` or `/challenges.html` paths: segment 3c (area A smoke halves). 28 passed in the file.
- Targeted vitest: page-list, config-base, client-graph-no-smoke-fixtures, tests/unit/workflows (7 files incl. upstream-only-jobs, toolchain-parity, trigger-branches, fork-template-parity), glossary, source-layout: all passed (glossary stayed green with the fixture text in the corpus).
- Left for the suite step: `pnpm test:smoke` must run on a `WXL_SMOKE_PAGES=1` build. `.vitepress/dist` currently holds a test build. `site-smoke.spec.ts` was not touched. New files to commit: `tests/unit/theme/client-graph-no-smoke-fixtures.test.ts`, `tests/unit/workflows/smoke-fixture-switch.test.ts` (untracked, not added); the two fixture pages under `platform/` are `git add`-ed.

### 2026-11-17 (segment 3b, fix round)

Executor, single fix round for L38 / L-§4.7 row 4 (A21: SW08/SW09/SW11); both P1 findings were one defect: the absolute runtime-locale check had become a relative one (`toBe(runtimeBefore)`), which passes when the runtime locale is wrong or undefined from the start.

- Change (test only, `tests/site-smoke/missing-translation.spec.ts`): removed `const runtimeBefore = await runtimeLocale(page)`; line 282 is now `expect(await runtimeLocale(page)).toBe(own)`. No production change, no `git add`.
- Proof the restored assertion can fail: temporary mutation of the `runtimeLocale` helper to return `undefined`. Under the old `toBe(runtimeBefore)`, 6 of 6 passed (the assertion was too weak). With `toBe(own)`, 6 of 6 failed at line 282: `Expected: "zh-TW"` / `"en"`, `Received: undefined`. Mutation reverted (helper body restored to the original).
- Final run, `pnpm exec playwright test -c playwright.site.config.ts tests/site-smoke/missing-translation.spec.ts -g "the switcher stays on"` on the existing test build: 6 passed. Green on first run without the mutation, reason: production already keeps the runtime locale at the page's locale (set only from the URL); the change restores the strength of an assertion.
- Note: the plan's command omitted `-c playwright.site.config.ts`; without it Playwright finds no tests (the default config's testDir is `tests/challenges`).

Deferred to stage 6 (P2, frozen rubric):

- `tests/unit/theme/client-graph-no-smoke-fixtures.test.ts:51` (P2, medium): L47's resolver only walks .ts/.mts/.js/.vue files. A JSON or CSS module the theme imports (the theme imports the `messages/*.json` files) is never read, and `import.meta.glob` edges are not followed, so a literal in such a file would not be caught. Today no reached JSON contains the literal; PAT4 on the real production build is the backstop. Test strength beyond the row's own subject.
- `tests/site-smoke/missing-translation.spec.ts:177` (P2, low): the fallback line text and link label are read from `messages/<locale>.json` instead of literal strings, so a wrong translation string in the JSON would no longer be caught here. HEAD had `toHaveText('這一頁沒有繁體中文版本，所以顯示英文版。')` and `toHaveText('前往繁體中文題目清單')`; the values are equal today (zh-TW.json:61-62).
- `.vitepress/config.mts:56` (P2, low): D49 says srcExclude and pageListFromDir use one exported function, `isSmokeFixturePage`. srcExclude uses the exported `SMOKE_FIXTURE_GLOBS` from the same module, because VitePress srcExclude only takes globs. The predicate and the glob agree on every input traced (nested paths, a file named `en/smoke-fixtures.md`). Wording deviation from the spec, not a behaviour one.
- `tests/site-smoke/missing-translation.spec.ts:175` (P2, medium): the fallback case's notice line and link text changed from pinned literals to values read from `messages/*.json`: the copy itself is no longer pinned, only that the page shows what the string table holds. Derived expectations cover both directions and follow D54, so this is not an AC gap; a wrong string table entry would not be noticed here.
- `.vitepress/pageList.ts:31` (P2, medium): D49 says "one exported function, isSmokeFixturePage(sourcePath), used by both", but config's srcExclude uses `SMOKE_FIXTURE_GLOBS` and never calls the predicate. Glob and predicate are two encodings with no direct test that they agree (VitePress srcExclude takes globs only, so two encodings are unavoidable). They agree by inspection; L34 and L35 each verify one side from outside. No user-visible defect.
- `tests/site-smoke/missing-translation.spec.ts:67` (P2, high): `X()` and the switcher case's own/other pairing assume LOCALES has exactly two entries; once `ja` is added, `LOCALES.find((code) => code !== own)` no longer picks a determined "other" locale. L-§4.7 defines it as "locale segment swapped", which holds with two locales.
- `tests/site-smoke/missing-translation.spec.ts:371` (P2, medium): the cold-load "no notice line" branch runs `toHaveCount(0)` right after `hydrated()`. If the notice mounts later than networkidle, the negative check can pass before it appears (a false pass, not a flaky failure). The Back case also reads `before` after hydrated, so a late A3 replace redirect could make the comparison target wrong. `hydrated` waits only for `__vue_app__` plus up to 10 s of networkidle (lines 345-349). Existing pattern (the old "en stored shows no line" case); the rerun passed with no instability observed.
- `tests/site-smoke/missing-translation.spec.ts:24` (P2, high): L37 says "every test fails with a message naming WXL_SMOKE_PAGES=1", but Playwright reports a failed file-level `beforeAll` as 1 failed and the rest did not run. Measured on a production build: 1 failed, 25 did not run, message names `WXL_SMOKE_PAGES=1 pnpm docs:build`. The run still fails and no case passes, matching the row's intent; wording differs from the row. Already recorded in this ticket.

Full-suite result (suite step): vitest full run (parallel, JSON reporter): 6263 tests, 6257 passed, 6 failed, 0 pending/skipped; 771 suites (the runner's `numFailedTestSuites` reads 9, but only 6 test-level failures exist and no file failed at suite level). No flakes, so the no-file-parallelism re-run was not needed. `glossary.test.ts` passed. Playwright smoke specs are not in the vitest suite and were not run.

### 2026-11-17 (parent, decision on segment 3c's plan needs_user; 依使用者授權核准)

Under the user's standing authorization quoted in the 2026-11-17 parent entry above (「授權：所有建議我都同意，權限都授權到
兩個 epic 完成…executor 要我決定的事，請在票的 Comments 引用我這段話並寫明範圍。」).

- Question (3c's planner): `tests/site-smoke/session-gate-clear-report.spec.ts` has two cases that are red under the
  new layout (`goto('/challenge/door-is-open/')` is now the Traditional Chinese page, so the English assertions receive
  Chinese). No approved row names this file. Change its two `goto` paths in 3c?
- Decision: approved as the planner recommends. Scope of this approval: in that one file, the two `goto` paths become
  `localePath('en', 'challenge/door-is-open/')` plus the one import; no assertion changes, nothing else in the file.
- Why it is inside the authorization: it follows D54 (every site-smoke URL is derived from P through `localePath`)
  and BC13/B82 (English assertions go to `/en/…`); without it wave 9's `pnpm test:smoke` cannot be green and no other
  segment owns the file. It adds a file to 3c's scope, so it is listed to the user.
- Also noted from the plan, no decision needed: 3c builds with `WXL_SMOKE_PAGES=1 pnpm docs:build`, not `pnpm build`
  (which would run keygen, still failing until wave 5, and rewrite the live `_redirects` with the pre-wave-4
  generator); the full `pnpm build` stays in wave 9. The page-mode copy-control cases in `site-smoke.spec.ts` stay red
  until segment 4d (S54–S56).

- 2026-11-17 (segment 3c): surface = the production bundle of `WXL_SMOKE_PAGES=1 pnpm docs:build`, served by
  `vitepress preview`, driven by Playwright chromium. No `git add` (nothing under `platform/` changed). Files:
  `tests/site-smoke/missing-translation.spec.ts`, `site-smoke.spec.ts`, `session-gate-clear-report.spec.ts`
  (approved add-on: two `goto` paths and one import, assertions untouched), `playwright.site.config.ts` (comment only).
  - Before any edit, `missing-translation.spec.ts`: 28 passed, 6 failed (switcher article B1; switcher challenge bar x3;
    alias; "published /zh-TW/ page stores zh-TW": `Expected "zh-TW" Received "en"`). After the rewrite: 37 passed
    (34 + A15 x2 + A3 x1).
  - A8 alias, A5 translation-page cold load, A21 article and challenge bar (3 widths): red lines are the ones above
    (e.g. `Expected pattern /\/zh-TW\/challenge\/selected-excerpts\/$/ Received ".../challenge/selected-excerpts/"`);
    green first time after the rewrite (wave 2 routing already implemented).
  - A5/A19/A25 failed load: the old test was a false green. Added `intercepted > 0` first: red
    `expect(received).toBeGreaterThan(0) Expected: > 0 Received: 0` (chunk `zh-TW_challenges.md.*.js` no longer exists).
    Then route pattern `${T}_challenges.md.*.js`, `.NotFound`, stored P, pathname kept: green.
  - A17 (a)(b): green first time, because `/<T>/no-such-page` has no counterpart either. Non-vacuity: (a) pointed at
    `X(ZH_ONLY)` goes red (`[data-missing-translation]` count Expected 0 Received 1); restored.
  - A15 (new, stored none and T) and A3 (new): green first time (wave 2). Mutation build (`notFoundRedirect` always null,
    `shouldPersistOnColdLoad` false, `redirectTargetForStoredLocale` null): 13 red incl. A15 x2, A3, A8, A5 cold load,
    A21-adjacent fallbacks; sources restored from backup, `git diff --stat -- .vitepress` empty, test build redone.
    A3 with stored PRIMARY goes red (`Expected "/en/guide/python?q=1#h" Received "/guide/python?q=1#h"`); restored.
  - A1, A2, A4, A14, A20, A30: no change; the COLD_LOADS (4), FALLBACKS (6), Back-after-fallback cases are green on the
    3c build (they are in the 37).
  - B82 (3 cases) and B61: literal `/en/...` replaced by `localePath('en', ...)`; B61 loops `LOCALES`. Green first time
    (under P=zh-TW `localePath('en', x)` is `/en/x`; P=en is observed at stage 8 V-B7). B61 non-vacuity: expecting
    `localePath` of the other locale goes red (`Expected "/" Received "/en/"`); restored. B81's own `goto('/en/')`
    (third occurrence) left as is: not in the row.
  - D54: SITE_PAGES (4 paths), `pageUrlOf`, the S06 path builder now go through `localePath`; local `type Locale`
    replaced by the import. Before: S06 English list `Expected "/challenge/selected-excerpts/" Received "/en/challenge/selected-excerpts/"`
    (line 991). After: pathname assertion green, the case stops at the nav text (line 995,
    `Expected "wxl.browserlab.online/en/challenge/..." Received ".../challenge/..."`), which is segment 4d's.
  - `session-gate-clear-report.spec.ts`: both K4 cases green now (were 2 red of 15).
  - `pnpm test:smoke`: 68 passed, 42 failed (full run, one worker). All 42 are the page-mode copy-control cases of
    segment 4d (S54-S56, `challengePagePath`, `expectedUrlFor`): layout and HTML as served 20, mobile nav 4, desktop nav 4,
    what is copied (S05, N07) 6, S09 4, S06 4. Wave 1(g) rows B48, B59, B61, B70, B81, B82, B79, Y39 and all of
    code-panel-platform and session-gate-scope are green. S08 (zh-TW nav URL cut at 375, upstream-only) is green now; it may
    stop truncating once wave 4 shortens the URL, so 4d must measure it.
  - `tsc` reports TS5097 for `.ts` import suffixes in tests/site-smoke (also in 3a's `localePath.ts`); pre-existing
    style, not touched. Rows not done: none.
  - Full-suite result (suite step): vitest, parallel run (JSON reporter): 6263 tests total, 6257 passed, 6 failed, 0
    pending/skipped; 771 suites. The no-file-parallelism re-run was not needed because all 6 failures match the allowed
    list. Playwright is outside this suite and was not run.
  - Deferred to stage 6 (P2, frozen rubric):
    - `tests/site-smoke/missing-translation.spec.ts:400` (high): the A8 alias test is named "writes nothing" but stores T beforehand and expects T, so it cannot detect a write of T; the plan row says to store `en` explicitly and A8's acceptance criterion covers only the redirect target, so not a row coverage gap. Same point at line 389 (title claims more than the assertion checks).
    - `tests/site-smoke/missing-translation.spec.ts:416` (high): the A15 cases install `recordNavigations` but never read `navigations()`; D29's "no second redirect" rests on one pathname sample after 500 ms; replace-vs-push is not checked in smoke. Still red for the plain D29 failure (mutation build).
    - `tests/site-smoke/missing-translation.spec.ts:316` (medium): the B7 not-found switcher case was changed while green (stored value, option and expectation now from T and PRIMARY); recorded as A17 (b), but A17's row names only the "path with no counterpart" test. Justified by D54, same strength; the row citation is approximate.
    - `playwright.site.config.ts:21` (medium): the rewritten pinned-locale comment still describes upstream with P = zh-TW ("Traditional Chinese is the primary locale", a goto with no locale segment "lands on /en/..."), false in a range with P = en. D54 only needs the "default visiting locale" wording gone, and it is.
    - `tests/site-smoke/code-panel-platform.spec.ts:28` (medium): under P = zh-TW, this file (lines 28, 220, 268) and `session-gate-scope.spec.ts` (lines 26-59) still go to unprefixed primary pages and depend on the A3 cold-load redirect under the pinned `en`, while the rewritten config comment says English assertions avoid that redirect. Outside 3c's rows and D54's list; they pass on the 3c build. Consistency follow-up, not a defect.
    - `tests/site-smoke/missing-translation.spec.ts:232` (low): the `/guide/python` gotos in the built-in-menu cases (lines 232, 245) are literals rather than `localePath(PRIMARY, ...)`. Correct under either P; pre-existing, belong to no 3c row, style only.
    - `tests/site-smoke/code-panel-platform.spec.ts:90` (medium): "challenge application source is unreachable from the Code panel" is flaky on the 3c build: red in a full `pnpm test:smoke` run and alone with `-g` (Run button stuck on "Loading..." / "Waiting for runtime to initialize...", `toBeEnabled` timed out after 180000 ms), green in a whole-file run (9/9) and `--repeat-each=2`. `openCodePanel` goes to `/challenge/staff-only/`, now the primary (zh-TW) page; under the pinned `en` that cold load is replaced by `/en/challenge/staff-only/` while the runtime boots (a guess, not shown). 3c touched neither this file nor production code; the suite step should know it is flaky.
    - `tests/site-smoke/missing-translation.spec.ts:403` (medium): "a cold load of a published translation page stores its locale" checks only the write, not the absence of a redirect and of the line (A5's other columns); those are still covered by the COLD_LOADS case `EN_ONLY` stored zh-TW.
    - `.proj.tickets/0010-primary-locale-layout/T-0077-layout-switch.md:2101` (high): two statements in this entry are not quite accurate: "were 2 red of 15" (`session-gate-clear-report.spec.ts` has only 2 cases) and "all of code-panel-platform ... green" (one case fails some runs, 2 of 5 runs).
- 2026-11-17 (segment 4a): surface = vitest unit tests on temporary trees under os.tmpdir(); no browser. Files:
  `.vitepress/challenge/shortLink.ts`, `scripts/challenge-numbers.ts`, `tests/unit/challenge/shortLink.test.ts`,
  `tests/unit/scripts/challenge-numbers.test.ts`. No `git add` (nothing new, nothing under `platform/`).
  - S52 (+ B18 command 2, slug grammar exported once): red `TypeError: challengePagePath is not a function` x6, and
    locales.test.ts B18 command 2 red (`ShortLinkLocale` union in shortLink.ts). Green: `challengePagePath`,
    `import type { Locale }`, `ShortLinkLocale = Locale`, `export const SLUG_GRAMMAR`. `challengeLink` page branch untouched (4d).
  - S75 (CN half) / Y104 shared `isChallengeNumber`: red only on `1e21` and `2 ** 53` (`expected true to be false`); the other
    eight cells green first time (old "integer and > 0" gives the same answer for them). Green: `Number.isSafeInteger(value) && value >= 1`.
  - S19: fixture helpers rewritten (`writeDeclaration`, `writeBrief`); red before production: new case got the old-layout
    entry (`expected [ { slug: 'x', ...}, ...] to deeply equal [ ...(2) ]`) and the existing cases red (`expected 1 to be 6`,
    `expected [] to not deeply equal []`). Green: `readChallengeNumber(yamlPath)` parses the whole YAML,
    `collectChallengeNumbers` reads only `platform/challenge/<slug>/challenge.yaml`, entry `{slug, value, path}` (no `locale`),
    `slugsUnder(dir, file)`, private `readLegacyRetiredNumber`. `CHALLENGE_TREES` kept (generate-redirects.ts still imports it; 4b removes it).
  - S20 + Y85 number half: one it.each of seven rows. Red: row 3 `expected 3 to be 10`, row 7 `expected 7 to be 12`. Rows 1, 2, 4, 6
    green first time (live now from declarations, legacy reading kept, a brief is outside the walk); row 5 green first time
    (legacy 14 is the maximum). Green: retired set = `challenge.yaml` union legacy `index.md`.
  - S17 (CN half): replaced the "differently in the two locale trees" case. Red only on the label assertion
    (`expected [ 'number', 'number-locales', ... ] to not include 'number-locales'`); value 4 and "no failed result" green first
    time (brief no longer read after S19). Green: the agreement block of `checkChallengeNumbers` deleted. Also reworded comments
    and two messages ("in its declaration", "declaration(s) carry an integer number"); no test or other file asserts them.
  - Reading chosen: `number: "007"` in a declaration is a YAML string, so the "quoted string" case still fails the number check.
  - Self-check: reverting both production files to HEAD turns 22 tests red (6 S52, B18 command 2, 7 old-validation cases that
    now read declarations, S19, S17, S20 rows 2/3/6/7 and the two isChallengeNumber cells); restored. Under P: these tests do
    not read P (`challengePagePath` takes primary as an argument, rows cover both).
  - Commands: `vitest run` challenge-numbers + shortLink + locales.test.ts: 3 files, 67 passed; with `tests/unit/challenge`,
    ChallengeList, MergedNav, ShortLinkShare (name filters): 11 files, 402 passed. `tests/unit/site/redirects*.test.ts`: 15 failed (baseline before 4a: 4): the 11
    new reds are the expected `redirects-generated` fixture cases owned by 4b; the other 4 are carried
    (3 in redirects.test.ts, byte-identical `_redirects`).
  - Not done: none. Later segments: 4b removes `CHALLENGE_TREES` with the generator; 4d changes `challengeLink`'s page
    branch (hard-coded zh-TW at the `${origin}...` line) to use `challengePagePath` and needs `SLUG_GRAMMAR`; wave 5 owns
    create-challenge-run / Y85 write half and Y104's own cases; wave 6 owns the 48 pre-commit-sh reds.

### 2026-11-17 (parent, segment 4a: two P0 left after the fix round, accepted as planned inter-wave reds; 依使用者授權核准)

Under the user's standing authorization quoted in the 2026-11-17 parent entry above (「授權：所有建議我都同意，權限都授權到
兩個 epic 完成…executor 要我決定的事，請在票的 Comments 引用我這段話並寫明範圍。」). Scope: how segment 4a's two remaining
P0 findings are handled; nothing else.

- What the checkers found: 4a's approved row S19 (`collectChallengeNumbers` reads only `challenge.yaml`,
  `ChallengeNumberEntry` loses `locale`) turned 64 tests red that were green before it. The parent re-measured on
  the live tree (vitest, `tests/pre-commit-sh.test.ts`, `create-challenge-run.test.ts`, `redirects-generated.test.ts`,
  `redirects.test.ts`): 163 tests, 95 passed, 68 failed = 64 new + the 4 carried redirects failures.
  - `redirects-generated.test.ts`: 11 new (owner: segment 4b, the generator rewrite S1–S27).
  - `create-challenge-run.test.ts`: 5 new (owner: wave 5, segment 5e, Y70–Y85 and DEFAULT_TREE).
  - `tests/pre-commit-sh.test.ts`: 48 new (owner: wave 6, S36–S49, S73–S80, `preCommitRepo`).
- Decision: accepted as planned inter-wave reds, not fixed in 4a. Reasons: this plan's Implementation-waves preamble
  says "The branch may be red between waves"; the only way to keep them green inside 4a is either to drop the approved
  row S19 or to add a temporary old-layout reader that 4b deletes in the next segment; no spec row is violated by 4a's
  production code. The 64 titles are saved in `.proj.handoffs/orchestrator/t0077-4a-planned-reds.json` and join the
  orchestrator's carried list with the owners above, so a later segment's suite step still reports any other failure.
- Known hazard until 4b lands (the checker's point, recorded): `scripts/generate-redirects.ts` still reads the removed
  `locale` field, so `pnpm redirects:generate` and `pnpm build` would write a wrong `_redirects` without an error. Nobody
  runs them before 4b; 4c regenerates the file; wave 9 runs the full `pnpm build`.
- The fix-round executor staged this ticket file by mistake (`git add .proj.tickets`). No unstage is needed: 4a's
  commit step commits the file by pathspec, after which the index and HEAD agree. Its Comments line "No file added to
  the index in this fix" is wrong and is corrected by this entry.
- Orchestrator change that follows from this: from segment 4b on, the checkers are given the carried list and the
  reds the segment's plan declared in advance, and told that those are not P0; an undeclared newly red test still is.
  This restates the rule the user fixed on 2026-11-17 (only wrong production behaviour or an uncovered approved row
  is P0/P1); it does not lower the bar for real defects.

- 2026-11-17 (segment 4b, executor): wave 4, the generator in full mode. Files: `scripts/generate-redirects.ts`,
  `tests/unit/site/redirects-generated.test.ts` (generateRedirects describe rewritten on new helpers
  writeDeclaration/writeBrief/writeRange/writeHome/numbered, all trees under os.tmpdir()),
  `tests/unit/site/redirects.test.ts` (new describe "redirects:generate on an old-layout tree (B38)"). No `git add`.
  - Rows done: S1–S9, S10, S11, S12–S16, S75 (RG), S17 (RG half), S18, S21 (generator half), S22–S25, S26a, S26b, S27a,
    S27b, S51a, S51b, B38 (generator half). Red lines recorded against the HEAD production (4a state) before the
    change, all in one run, not cycle by cycle: S1 `expected [ { from: '/zh/c/001', …(2) }, …(1) ] to deeply equal
    [ { from: '/c/001', …(2) }, …(3) ]` (S2–S8 same shape); S10 `expected '# Cloudflare Pages…' not to be …`;
    S11 `expected 'Cannot generate _redirects: the chall…' to be 'PL-E01: range.json is not a regular f…'` (so the
    plan's alternative applied: the read of range.json was not first before); S12 `…(3) ] to deeply equal [ …(7) ]`;
    S14/S75/S17 `expected [ '/zh/c/…', … ] to include '/c/…'`; S18 `expected [Function call] to throw an error`;
    S23 `expected [ Array(4) ] to deeply equal [ { from: '/c/:slug', …(2) }, …(3) ]`; S24 `expected { from:
    '/zh-TW/c/:slug', …(2) } to deeply equal { from: '/zh-TW/*', …(2) }`; S26a `expected 'Cloudflare Pages redirect
    rules. This…' to contain 'Cloudflare Pages allows 2,000 static …'`; S26b `TypeError: redirectsHeader is not a
    function`; S27a `expected 'Numbered short links, four per challe…' to be 'Numbered short links, 4 per challenge…'`;
    S27b `expected -1 to be greater than 0`; S51a `expected [ '' ] to deeply equal [ Array(1) ]` (all 30 cases);
    S51b `expected function to throw an error, but it didn't` (the "equal to its own number" case: `expected [
    '/zh/c/005', '/zh-TW/c/005' ] to deeply equal [ '/c/005', … ]`, an old-production fixture red); B38 two cases red
    on HEAD production (PL-E08 / PL-E03 not thrown).
  - Because the whole file was run against the 4a production, rows the plan expected green on first run (S5, S6, S8,
    S9, S12, S13, S14, S15, S16, S17, S21, S22, S25, S75) were red or green for the old reasons (fixtures read no
    briefs); S13, S15's "writes no file", S16, S21, S22, S25 and S51's own-number case were green on HEAD. Non-vacuity
    checks by mutating the new production and restoring it: no third fallback turns S7, S8 red; no sort turns S7, S12
    red; briefs ignoring includeSlug turns S3, S6, S9 red; counting a slug as shadowing itself turns S51's own-number case
    red; removing the whole fallback turns S1–S8 red. Not separable with two locales: a fallback to `P` versus the first
    locale in the list (S2, S5 stay green), because with one brief present both choose the same page.
  - Decisions and readings: (1) `redirectsHeader(primary, forms = FORMS)` is exported and `Form` is
    `{ prefix, locale: Locale | null }` (null = `P`), `FORMS` derived from `LOCALES` with `/zh/c/` before `/zh-TW/c/`;
    the export is not in the S24 list, parent to record it under the authorization. (2) `<NNN>` in D150's second line
    is read as the padded number of the other challenge, which equals the slug itself. (3) The S18 message is `<slug>
    (platform/<L>/challenge/<slug>/index.md) has no declaration platform/challenge/<slug>/challenge.yaml, so no number`
    inside the existing "Cannot generate" envelope; D150's lines are the whole message, thrown before any number fault
    (grammar and shadow lines together, UTF-16 sorted). (4) `generateRedirects` reads `P` first (D123) but does not
    run the layout check; `writeRedirects` does (read P, `checkSourceLayout(platform, P)`, then generate), so S21, the
    guard and `--staged` call the generator on trees the layout check would refuse (D19). (5) `includeSlug`'s tree
    argument is now `'declaration'` or a locale code; the `--staged` main block and `indexSlugs` still key on
    `root`/`zh-TW` and are 4c / wave 6's, so `--staged` filters everything out until then. `CHALLENGE_TREES` is still
    imported by `indexSlugs`; 4c's first cycle removes it with `challenge-numbers.ts`'s copy. (6) The header and
    section comments are wrapped by a small `commentLines` function; the committed `_redirects` is regenerated by 4c.
  - Not done: nothing in the segment's rows. S21's RT half (briefFaults), S28/S29/S33 and the `indexTrees` key change
    are 4c; `--staged` and the hook half of S51 are wave 6.
  - Commands: `npx vitest run tests/unit/site/redirects-generated.test.ts tests/unit/site/redirects.test.ts
    tests/unit/scripts/challenge-numbers.test.ts` gives 3 files, 159 tests, 155 passed, 4 failed (2 files failed, CN
    passes). The 4 reds are all declared: RG "is byte-identical to what the challenge tree generates" (4c; now `no
    challenges are tracked; the slug filter is wrong`), and RT's three real-tree cases ("gives every challenge in
    git's index its four rules…", "resolves every parameterised target prefix…", "resolves every literal target to a
    page"; 4c). Before the segment: RG 12 red of 16, RT 3, CN 0. `node --experimental-strip-types -e import(...)` loads
    the module (exports generateRedirects, indexSlugs, redirectsHeader, writeRedirects). `tsc` reports only the repo's
    usual TS5097 `.ts`-extension notes for this file.
  - Self-check summary is in the segment report. The 4a-declared reds outside this segment (create-challenge-run, the
    hook tests) were not run and are unchanged in kind.

### 2026-11-17 (segment 4c)

- Rows done, each with the red line seen before its production change (or the reason it was green first):
  - 4c-0 (`indexTrees`, S24/S25, D149): `TypeError: indexTrees is not a function`. Then `indexTrees(paths)` and
    `indexSlugs(root)` (`git ls-files -z -- platform/`) in `scripts/generate-redirects.ts`; `CHALLENGE_TREES` removed
    from both files (no other user); the two "rewritten by segment 4c" sentences removed.
  - S35 (kinds x P, both P): (i) `TypeError: briefFaults is not a function`; (ii) `expected [] to deeply equal [ {
    kind: 'missing-primary', ... } ]`; (iii) `expected [] to deeply equal [ { ... } ]` (one brief) and `[ { ... }, { ... } ]`
    (both briefs); (v) `expected [] to deeply equal [ { kind: 'old-layout', ... } ]` (folder page and single-file page).
    Green first, reasons: (iv) is (i)+(iii) combined; (vi) and the D127 row produce no fault path. Mutation: no
    `missing-declaration` branch reds (iii) and (iv).
  - S35 verbatim and order: `expected [ …(4) ] to deeply equal [ { …(4) }, { …(4) }, { …(4) }, …(1) ]` and the
    UTF-16 case `expected [ 'B:missing-primary', …(3) ] to deeply equal [ 'B:missing-primary', …(3) ]`. Mutations: no
    sort reds both; `localeCompare` for the slug reds the 'B' / 'a' case.
  - S21 (briefFaults half), both P: green first, as the plan predicted (`indexTrees` only knows `LOCALES`; the path is
    not under `platform/challenge/`). Mutation: `indexTrees` accepting any first folder reds the S-§4.7 `indexTrees`
    test and both S21 cases.
  - S34 (other ranges x P): `expected [ …(2) ] to deeply equal []` (P = en, no zh-TW directory, old function),
    `expected [ …(4) ] to deeply equal []`, and for the zh-TW missing-directory case `expected [ …(4) ] to have a length
    of 3 but got 4`. Then `targetDirectoryFaults(rules, docs, primary)` (reverse lookup through `challengePagePath`,
    only `primary`'s directory required, a slug = a folder holding `index.md`), `parseRulesText`, `SLUG_RULES`,
    `OLD_ADDRESS_RULE`; `targetDir`, `slugsFor`, `orphanFaults`, `rootRule`, `PARAMETERISED_RULES` deleted.
  - S32: (a) green first (D127 already in S34's rewrite); mutation: counting a folder with no `index.md` as a slug reds
    both P. (b) red against the old file: `expected [ …(2) ] to deeply equal []`; (c) red: `/zh/c/001 -> /zh-TW/challenge/
    door-is-open/ has no page address in this range: expected false to be true`. Both green after S28's regeneration.
  - S31: `expected false to be true` (splat unit); `expected [] to have a length of 5 but got +0` (counterfactual, old
    `shadows`); (2) the committed file and the two generated schemas were green first (no pair exists; (3) is the
    non-vacuity control).
  - S30: (a) `expected [] to deeply equal [ 'splat' ]`; (b) `/en/c/:slug -> /challenge/:slug/ is none of the three
    shapes: expected false to be true`; (c) `expected { from: '/zh-TW/c/:slug', … } to deeply equal { from: '/zh-TW/*', … }`.
    (b)(c) went green with S28's regeneration.
  - S29: `door-is-open: expected [ { from: '/c/001', … }, … ] to deeply equal [ … ]`; green after S28.
  - D149/S-q3: `expected [ { from: '/c/001', … }, … ] to deeply equal [ … ]` (the 001 case, now `it.skipIf(upstreamOnly…)`
    with S-§4.1's four literal rules); green after S28.
  - S28: `expected '# Cloudflare Pages redirect rules. Th…' to be '# Cloudflare Pages redirect rules. Th…'` (diff: header,
    K4, `/en/c/001 -> /en/challenge/door-is-open/`, trailing `/zh-TW/*`). The test materialises the index into
    `os.tmpdir()` with `git checkout-index -z --stdin --prefix=`. `pnpm redirects:generate` rewrote
    `platform/public/_redirects` (P = zh-TW, no `range.json`; 001, 002, 008, 010 four rules each, four slug rules, the
    old-address rule last = S-§4.1); `git add platform/public/_redirects` (the only `git add`; no new file was created
    by this segment). Putting HEAD's old file back turns 7 tests red (S28, S29, S30 b/c, S32 b/c, D149); restored.
  - S33: green first (4c-0 and S35 already give `[]`; the index has declarations and both briefs for all four
    challenges). Non-vacuity: an in-memory index without `platform/zh-TW/challenge/door-is-open/index.md` gives
    `missing-primary:door-is-open`.
- Readings and deviations, for the parent: (1) S28's pathspec `'platform/*/challenge'` lists only the directory level,
  not the briefs beneath it (measured: no `platform/en/challenge/…` line), so the test lists `range.json platform/` and
  keeps the three wanted shapes by regex; the written set is the same as the plan's. (2) S32 (a)'s "only `u` gives 1
  fault" is asserted as one fault per rule that targets the primary directory (2 for en, 3 for zh-TW), the same
  per-rule count S34 states for a missing directory; the message is "has no slugs under …". (3) The cycles for S34's
  three case kinds were observed red together against the old function before one rewrite of `targetDirectoryFaults`,
  which is a single helper. (4) `isParameterised` now classifies by source (`*:slug` or the old-address source).
  (5) In the S30 (a) cycle the production-side `placeholders` change was first written with the test; I reverted it,
  saw the red line above, and restored it.
- Not done: nothing in the segment's rows. Hook, `--staged` behaviour and `expectW6` stay wave 6's.
- pre-commit-sh comparison (plan's one-time check): `tests/pre-commit-sh.test.ts` fails as a suite before any test runs
  (`beforeAll` -> `buildFixture` -> `generateRedirects`: `door (platform/zh-TW/challenge/door/index.md) has no
  declaration platform/challenge/door/challenge.yaml`, an old-layout fixture, tests/__helpers__/preCommitRepo.ts:216),
  so 0 of 112 tests ran (112 skipped) and no failure-title set exists to compare with the 48 titles. The cause is the
  4b generator against the old fixture, not 4c; it is wave 6's. Compared only, nothing fixed.
- Commands: `pnpm vitest run tests/unit/site/redirects.test.ts tests/unit/site/redirects-generated.test.ts` gives 2
  files passed, 165 tests passed (before: 4 carried reds). `pnpm vitest run tests/pre-commit-sh.test.ts` gives 1 file
  failed (suite error), 112 skipped. The four carried failures are green.
- git add by this segment: `platform/public/_redirects` only.

### 2026-11-17 (parent, decisions on segment 4d's plan needs_user; 依使用者授權核准)

Under the user's standing authorization quoted in the 2026-11-17 parent entry above (「授權：所有建議我都同意，權限都授權到
兩個 epic 完成…executor 要我決定的事，請在票的 Comments 引用我這段話並寫明範圍。」). Scope: the three questions and one
side item segment 4d's planner raised; nothing else. Each follows the planner's recommendation.

1. `challengeLink` gains a required `primary` parameter: `(mode, n, slug, locale, primary, origin = SITE_ORIGIN)`.
   Approved. D68 and S54 make the page-mode address `challengePagePath(slug, entryLocale, P)`; `shortLink.ts` is shared
   with Node build scripts and must not read a build constant, so the caller passes P. `ShortLinkShare`'s props do not
   change; its one call site is updated in the same cycle; existing tests only gain the explicit `'en'` argument.
2. S66 (the comments in `scripts/pre-commit.sh`) moves from segment 4d to segment 6. Approved. The row is neither
   dropped nor shrunk; wave 4's file list has no `pre-commit.sh`, wave 6 rewrites the hook, and
   `tests/pre-commit-sh.test.ts` is red at collection until then. Segment 6's scope in the orchestrator now names S66.
3. S08 (0007's smoke row: the Traditional Chinese nav URL text is cut at 375×812), conditional on 4d's measurement.
   Approved as recommended: if it is still green, leave it; if it turns red because the primary-locale address is now
   6 characters shorter, retarget it to the translation-locale challenge page (the one with a locale segment), update
   its title and comment, and keep it upstream-only with the same assertion (`scrollWidth > clientWidth`). If the
   translation page is not cut at 375 either, the executor stops and reports; the assertion is not changed.
4. Side item under S67: the comments that still say "frontmatter number" in `shortLink.ts`, `ShortLinkShare.vue` and
   `ChallengeList.vue` are corrected to the declaration's (`challenge.yaml`) number in the same pass. Approved;
   comment-only, in files S67 already edits.

### 2026-11-17 (segment 4d)

- Rows done, each with the red line seen before its production change (or the reason it was green first):
  - 4d-0 (explicit `P = 'en'` mocks in `ShortLinkShare.test.ts` and `ShortLinkShare.mode-default.test.ts`): green first,
    the component did not read `P` yet (2 files, 86 tests). Purpose: no test depends on the `zh-TW` fallback once 4d-1 lands.
  - 4d-1 (D68 / S52 / S54, pure-function half): existing X1-X5, F9, L11, L20 and none cases gained the explicit `'en'`
    argument; new describe "challengeLink in page mode follows the primary locale". Red before the change (the 5th argument
    was read as the origin): `expected { url: 'zh-TW/challenge/s/', ... } to deeply equal { ... }` ((en, P = zh-TW)),
    `expected { url: 'en/challenge/s/', ... }`. 19 reds in the file before, including the signature-coupled existing cases.
    Then `challengeLink(mode, n, slug, locale, primary, origin = SITE_ORIGIN)` building the page branch with
    `challengePagePath`; the one caller `ShortLinkShare.vue` passes `primaryLocale()`.
  - S54 (ShortLinkShare half): green first (4d-1 changes signature and caller together). Mutation: the call passing a fixed
    `'en'` reds 4 cases (`Expected: "wxl.browserlab.online/en/challenge/door-is-open/"` / `Received: ".../challenge/door-is-open/"`,
    and `Expected ".../challenge/selected-excerpts/"` / `Received ".../zh-TW/challenge/selected-excerpts/"`); restored.
  - S53 (short mode x list locale x entry, both P): red before the change, 6 cases: mount `expected [] to have a length of 1
    but got +0` (English list, borrowed zh-TW entry, both P; the rewritten E3 case and its P = zh-TW mirror too) and SSR
    `expected '<div class="max-w-screen-xl mx-auto p...' to contain 'wxl.browserlab.online/en/c/007'`. The zh-TW list with a
    borrowed en entry was green first (0008 F3 behaviour), as predicted. Then `hasCopyControl`, the template `v-if`, the `mode`
    constant and the `linkMode` import were removed from `ChallengeList.vue` (D48). 8 new cases (2 P x 2 lists x mount/SSR).
  - S54 (ChallengeList half, N04 non-root base): green first (4d-1 fixed the shared function). New it.each, 6 rows (P = en gains
    a borrowed row; P = zh-TW both lists, both entries), plus the deferred page-mode assertion in the P = zh-TW E3 mirror
    (`${DISPLAY_ORIGIN}/challenge/zh-only/`). Mutation (the old hard-coded `zh-TW` line in `shortLink.ts`): 9 reds across the
    three component files; restored.
  - S55 (MergedNav, P = zh-TW, localeIndex 'root' and 'en', both controls, page mode with a base): green first. Mutation 1
    (`locale` ignores `P`): 7 reds (new S55 cases and four existing A27/A28 cases); mutation 2 (hard-coded page line):
    2 reds (the page-mode rows). Both restored.
  - S56 (built site, page mode): `WXL_SMOKE_PAGES=1 pnpm docs:build`, then `playwright test --config
    playwright.site.config.ts tests/site-smoke/site-smoke.spec.ts -g "copy control"` with the OLD `expectedUrlFor`:
    37 passed, 6 failed, all the Traditional Chinese list cases (5 viewport cases of the layout group, 1 S09 case):
    `Expected: "wxl.browserlab.online/en/challenge/door-is-open/"` / `Received: "wxl.browserlab.online/challenge/door-is-open/"`.
    Then `pageUrlOf` uses `challengePagePath(slug, locale, PRIMARY)` and `expectedUrlFor` takes the row's locale from the
    translation prefix, else `PRIMARY`. New describe S56 (one control per numbered challenge, both lists; the count read from
    `challenge.yaml` files with a `number`). The same command afterwards: 45 passed (43 + the 2 new S56 cases). Mutation:
    the old `path.includes('/zh-TW/')` line reds the S56 Traditional Chinese list case with the same Expected/Received; restored.
  - S08 measurement (the conditional of the parent's decision 3): with P = zh-TW the Traditional Chinese challenge page's
    URL text is still cut at 375x812 (the S08 case passed, not skipped). Left as is; no retarget, assertion untouched.
  - S67, S64, S65, S68: comment-only. `shortLink.ts` (ShortLinkLocale and `challengeLink` comments state D68 and the
    `primary` parameter; two "frontmatter" wordings now say the declaration), `ChallengeList.vue` (D48 comment; "frontmatter
    number" -> declared `challenge.yaml` number), `ShortLinkShare.vue` (entryLocale prop comment D68; "frontmatter number"
    corrected), `generate-redirects.ts` (D67 on `includeSlug`, D64/D67 on `indexSlugs`; `numericRules` and `FORMS` already
    cite D58 and D57), `challenge-numbers.ts` (header says `challenge.yaml` D62; `RETIRED_TREE`, `nextChallengeNumber`,
    `readLegacyRetiredNumber` cite D63), `redirects.test.ts` (header: CAUGHT list, HOW TARGETS ARE RESOLVED, subset
    paragraphs, frontmatter wording; assertions untouched). Greps: 'nothing for English', 'English list has no short link',
    'frontmatter number' in `.vitepress`/`scripts`: no output; `redirects.test.ts`: no 'root-locale', 'English target prefix',
    'frontmatter'. The S68 comment says "four rules" still: it is the true count per challenge (S-§4.1), left as is.
- Not done: S66 (moved to segment 6 by the parent's decision 2).
- Reading chosen: the S53 loop's unnumbered row has the list's own locale; the test's fixtures build `url` with the
  list's P by literal template (the entries' `url` is only echoed in `href`).
- Commands (counts): `pnpm vitest run tests/unit/components tests/unit/layouts tests/unit/theme tests/unit/i18n
  tests/unit/challenge/shortLink.test.ts tests/unit/site/redirects.test.ts tests/unit/site/redirects-generated.test.ts`:
  47 files, 2215 tests passed. `pnpm vitest run tests/unit/site/redirects.test.ts tests/unit/site/redirects-generated.test.ts`:
  165 passed (count unchanged). The site-smoke run above is Playwright chromium against `vitepress preview` of the
  `WXL_SMOKE_PAGES=1` production build (the real built page, list and nav).
- git add by this segment: none (no file created, nothing changed under `platform/`; `docs:build` left the tracked tree
  unchanged).

  - Deferred to stage 6 (P2, frozen rubric):
    - `tests/site-smoke/site-smoke.spec.ts:986` (P2, confidence high): the new S56 describe was inserted between the S06 comment and the S06 describe, so the S06 comment now sits above the S56 block (S06 describe starts at about line 1011)
    - `.vitepress/theme/components/ChallengeList.vue:111` (P2, confidence high): removing `hasCopyControl` and `mode` left their JSDoc block (the copy control's link, F3, F6, D48, D68) attached to nothing, directly before the next function's JSDoc, and one clause reads awkwardly
    - `tests/site-smoke/site-smoke.spec.ts:1004` (P2, confidence medium): S56 asserts the row count equals the number of numbered declarations, so it assumes every challenge in the tree is numbered, stronger than the row's "one control per numbered challenge" (an unnumbered challenge shows a row with no control, E10, but would fail the rows assertion); upstream's tree is fully numbered, so it passes
    - `scripts/generate-redirects.ts:147` (P2, confidence low): S64 lists the PARAMETERISED comment among those that must cite their D-number, but the `PARAMETERISED_SECTION` constant has no code comment citing D59 (only the slug-rules loop comment at line 310 does); the string is `_redirects` content, so the row's intent may already be met
    - `tests/unit/site/redirects.test.ts:120` (P2, confidence medium): the S68 header rewrite still ends by attributing the per-challenge rule set to spec 0008 ("the four rules spec 0008 gives it (G1–G3)"); under 0010 D58 decides the rule set (inverting 0008 G8/G9); the count of four is right, the citation is stale; comment only, no assertion affected
    - `tests/site-smoke/site-smoke.spec.ts:992` (P2, confidence medium): the S56 count `NUMBERED` keeps any declaration whose number has `typeof 'number'` (0, 1.5 and -1 included) instead of `isChallengeNumber`, the predicate that decides whether a control renders; test-strength hardening beyond the row's AC, the upstream tree holds only valid numbers
    - `tests/site-smoke/site-smoke.spec.ts:1036` (P2, confidence low): the pre-existing S08 case skips through `realUpstreamDecision` with its own reason string, not through `upstreamOnlySkipReason` (D124 helper); untouched by this segment (measured only, per the parent's decision 3), noted for whoever owns B93/D124; it passed (not skipped) in the re-run
  - Full suite (parallel run, JSON reporter): 804 suites, 6451 tests: 6330 passed, 9 failed, 112 skipped/pending; 8 failed suites (7 test files with failing tests plus `tests/pre-commit-sh.test.ts` failing at collection). All failures match allowed entries, so the non-parallel re-run was not needed and no flakes were observed. `tests/site-smoke` (Playwright) was not part of this vitest run.

### 2026-11-17 (parent, decisions on segment 5a's plan needs_user; 依使用者授權核准)

Under the user's standing authorization quoted in the 2026-11-17 parent entry above (「授權：所有建議我都同意，權限都授權到
兩個 epic 完成…executor 要我決定的事，請在票的 Comments 引用我這段話並寫明範圍。」). Scope: the two questions segment 5a's
planner raised; nothing else. Both follow the planner's recommendation.

1. Y23's validate half, Y19's validate clause ("no check message names them") and Y112's brief half (VM6 names `<<`;
   a duplicated `title` gives VM15) join segment 5a. Approved. The approved test plan table already places all three in
   `tests/challenge-validate.test.ts`, which 5a rewrites; neither wave 5's row list nor any segment's list named them,
   so without this they would be left out. No row is added to the plan: these are approved rows getting an owner. This
   also settles the earlier open note in these Comments about which wave claims Y112.
2. `tests/unit/challenge/plugin.test.ts` (`BASE_FRONTMATTER`) and `plugin-obfuscation.test.ts` (`BASE`) gain
   `layout: 'challenge'` in their fixtures; no assertion changes. Approved. Once `validateChallengeBrief` checks VM8
   (layout must be `challenge`), those fixtures would throw for a reason their cases do not test. It follows the
   parent's 2026-11-16 decision (b) (a brief fault must reach `processChallengeFrontmatter`); the alternative, keeping
   VM7–VM9 out of `validateChallengeBrief`, contradicts that decision and empties Y74.
- Noted from the plan, no decision needed: 5a declares two new inter-wave reds, `challenge-lint-staged.test.ts ›
  passes when challenge is fully valid` (owner: 5b) and `challenge-verify-L1.test.ts › passes for a well-formed
  challenge` (owner: 5f); both call `validateChallenge` with its old single-argument shape.

### 2026-11-17 (segment 5a)

Wave 5, `challenge:validate` (`scripts/challenge-validate.ts`, `tests/challenge-validate.test.ts`), under the user's standing
authorization quoted in the parent entries above. Rows done: A (re-home) + Y30 + Y1 validate half, Y12, Y9, Y14, Y2, Y3, Y6, Y5,
Y4, Y13, Y104, Y20, Y103, Y22, Y24, Y25, Y26 + the wave 1(f) E deferred items, Y27, Y28, Y29, Y31, Y37, Y32 (+ discoverChallenges call
shape), Y111 validate clause, Y33, Y35, Y36, B38 validate half, Y34; added by the parent's decision: Y23 validate half, Y19 validate
clause, Y112 brief half. Not done: none. Nothing under `platform/` changed, so no `git add`; nothing committed.

Red lines (first failure, before the production change):
- A / Y30 / Y1 (17 per-folder + Y30 + Y1 cases): `Error: EISDIR: illegal operation on a directory, read` (old `validateChallenge` read `root` as a file).
- Y12: `TypeError: app.endsWith is not a function` (3 cases).
- Y2, Y3, Y5, Y4: `declaration` message was the bare reason (`absent`, `not-a-mapping`, `multi-document`, `invalid-yaml`); Y2 `expected [ { label: 'declaration', …(2) } ] to deeply equal …`, Y4 `expected 'invalid-yaml' to match /^invalid YAML in challenge\.yaml: ./`. Y6 (4 cases) was red for the same reason until Y3's change (not first-green; one reason branch).
- Y13 (absent only): message still said `frontmatter`. Y103 (2 cases): `expected undefined to deeply equal { label: 'structure', …(2) }` / `expected undefined to be true`.
- Y22 (4): `expected undefined to be true`. Y24 (16 + 2 combined): `expected { label: 'brief (<L>)', … } to deeply equal …` (brief check only looked at existence). Y25 (4) was red for the same reason until Y24's change, then green.
- Y26 validate (4) `expected { label: 'brief (zh-TW)', …(2) } to deeply equal …`; plugin missing-title `AssertionError: expected [Function] to throw an error`.
- Y27 (3) / Y28 (2): same `deeply equal` failure; plugin `description: 42`: `expected [Function] to throw an error`. Y27's production change turned 7 existing cases red as predicted (plugin.test.ts 6, plugin-obfuscation 1: layout must be challenge); `layout: 'challenge'` added to `BASE_FRONTMATTER` and `BASE`, assertions unchanged (parent decision 2).
- Y29 (a): `TypeError: Cannot read properties of null (reading 'fmRaw')`; (b) message lacked the `invalid YAML: ` prefix.
- Y31 (4) `expected undefined to deeply equal { label: 'brief (<P>)', …}`; Y37 (4) was red for the same reason until Y31's change.
- Y32 (3 + 2 re-shaped existing): `expected [] to include 'x'` / `expected [] to deeply equal [ 'alpha' ]`. Y111: `expected [ 's', 't', 'u' ] to deeply equal [ 's' ]`.
- Y35 (a)(b)(c) + Y36 + Y34 + B38: `ERR_MODULE_NOT_FOUND: Cannot find module '…/.vitepress/layout-error' imported from …/.vitepress/challenge/declaration.ts` (fixed with `'../layout-error.ts'`; declaration.test.ts, plugin.test.ts, challenge-data-loaders.test.ts still pass). Y36 (6): stderr first line was `SiteLayoutError: PL-E0x: …` (class name from `main().catch(console.error)`). B38 case 1 / Y34 (6 runs): exit 0 with `✓` on stdout (no layout check).

First-green (reason): Y9, Y14 (VM5 and `missing required field` already in `validateChallengeDeclaration`, wave 1(c)); Y5 contrast; Y13 four non-absent cells and Y104 (`isChallengeNumber` already `Number.isSafeInteger`, 4a); Y20 (validator does not warn; `fs` branch gone); Y23, Y19, Y112 (brief parsed with the D129 options); Y33 (only `LOCALES` iterated); Y35 (c), (d); Y34 fourth case; B38 case 2 (Y36 already reads range.json first).

Mutations (all restored): Y9 validator call removed, 2 red; Y14 same, 4 red; Y104 `shortLink.ts` back to `Number.isInteger`, 2 red; Y20 `validateChallengeConfig` called after validation, `fs` and `all five` red (2); Y25 only declaration keys blocked, 4 red; Y37 hard-coded default, the `en` cell red (1); Y33 extra folder scanned, 1 red; Y34 `checkSourceLayout` call removed, 6 red (the 3 shapes x 2 runs; src/README.md case stays green); Y112: the plan's mutation (default `parseDocument` options) stays green, because `yaml` 2's defaults already do not merge `<<` and already reject a duplicate key; with `merge: true, uniqueKeys: false` both cases go red (2). Y20's first mutation attempt failed on a missing import (ReferenceError, 6 red), so it was redone with the import.

Commands (all with `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform` unless noted): `npx vitest run tests/challenge-validate.test.ts tests/unit/challenge/plugin.test.ts plugin-obfuscation.test.ts config.test.ts declaration.test.ts tests/unit/site/challenge-data-loaders.test.ts` -> 6 files, 296 passed; `npx vitest run tests/challenge-validate.test.ts` without the variable -> 136 passed (the checkout is detected as upstream, so Y1 and Y22 run). `tests/challenge-lint-staged.test.ts` + `tests/unit/scripts/challenge-verify-L1.test.ts` -> 2 failed, 15 passed; the two reds are the expected new ones below.

Notes for later segments:
- Expected new reds: `challenge-lint-staged.test.ts > runLintStaged > passes when challenge is fully valid` (owner: 5b, Y88/Y89, D122) and `challenge-verify-L1.test.ts > L1 layer (task 4.2) > passes for a well-formed challenge…` (owner: 5f, Y86/Y87/Y109); both call `validateChallenge` with its old single argument. `tests/pre-commit-sh.test.ts` stays a carried failure (wave 6).
- `validateChallengeBrief` now throws VM7-VM9 words without a path (`title must be a non-empty string`, `layout must be challenge`, `description must be a string`); validate prefixes `<path>: `. A bare `description:` (null) fails VM9 (the plan says "not undefined and not a string").
- `validateChallengeConfig` is no longer imported by challenge-validate.ts; its body and config.test.ts cases stay until analyze/create (Y-q1).
- The CLI's tree-wide numbering block (`collectChallengeNumbers(root)`) is unchanged and was not exercised without a slug on a fixture; it belongs to the numbering segment.
- Tests read `scripts/` and `.vitepress/` into a temporary copy per run of the CLI describe (about a second); `platform/` and `range.json` are never copied.

Deferred to stage 6 (P2, frozen rubric):
- `scripts/challenge-validate.ts:166` (P2, confidence low): when challenge.yaml is present but rejected (VM2–VM5, VM12, the Y9 missing-field case), `validateChallenge` returns right after the declaration check, so no brief check (VM6–VM10) runs. A teacher sees brief faults only after fixing the declaration. D86 and Y24 do not pin the order, and HEAD also returned early; a wording gap or later improvement, not a regression.
- `tests/challenge-validate.test.ts:1048` (P2, confidence medium): Y34's `src/README.md`-only case runs only with the slug argument; the run without a slug (which also exercises the tree-wide numbering block) is not tried. The row names no mode, so it is covered.
- `tests/challenge-validate.test.ts:887` (P2, confidence low): the CLI cases set `NODE_NO_WARNINGS=1`, so the "first stderr line is the PL line" assertions (Y36, B38, Y34) do not check the real `pnpm challenge:validate` command; on Node 22 (in the CI matrix) an ExperimentalWarning may come first. Accurate on the local Node 24.13.
- `scripts/challenge-validate.ts:59` (P2, confidence medium): `parseMd` matches only LF line endings, so a CRLF brief fails VM14 although VitePress builds it. Same regex at HEAD (line 47), not a regression; no row covers it, and it now applies to both locales.
- `tests/challenge-validate.test.ts:462` (P2, confidence medium): the HEAD test "fails when the number is not an integer greater than zero" (string "007") was deleted but is not listed in traceability.md's Overridden-contracts row (line 1737). Coverage is kept, more strictly, by Y13's `"7"` cell (exact message). Bookkeeping gap for stage 6's "every changed test cites a row" check.
- `tests/challenge-validate.test.ts:514` (P2, confidence high): Y20's `console.warn` filter `/fs/` is case-sensitive and would miss a warning naming `encryptedFs` or `flag_verifier`. The row's AC (spy never called with `fs`) is met; the message-side `mentions` regex covers all five keys.
- `scripts/challenge-validate.ts:134` (P2, confidence medium): a brief whose frontmatter parses to a non-mapping scalar or sequence gets `<path>: invalid YAML: the frontmatter is not a mapping`, a VM15-shaped message whose text is not a parser message; no VM row or test defines the case. It stays a failure.
- `scripts/challenge-validate.ts:352` (P2, confidence low): `discoverChallenges` treats a dot-prefixed directory under `platform/challenge/` (e.g. `.tmp/`) as a slug, which then fails VM1, while VM13 deliberately ignores dot-names. Upstream's tree has none; hardening idea only.
- `tests/challenge-validate.test.ts:318` (P2, confidence high): Y22's cases sit inside the describe titled "Y1 (validate half)", so test output does not name Y22. Sharing the upstream-only skip through `upstreamOnlySkipReason` is correct (D124); naming only.

Full-suite result (parallel run, JSON reporter, `CI=true`, `WXL_EXPECT_UPSTREAM=true`): 151 test files (5 failed: 4 with failing tests, plus `tests/pre-commit-sh.test.ts` failing at collection). 6561 tests: 6438 passed, 11 failed, 112 skipped, 0 todo. No-file-parallelism re-run not needed (no unexpected failures). No flakes observed. The first `rm` glob was a zsh no-match (nothing to remove); post-run cleanup done.

### 2026-11-17 (segment 5b)

Rows done (all in `tests/challenge-lint-staged.test.ts`; production in `scripts/challenge-lint-staged.ts`, `.vitepress/primary-locale.ts`, `scripts/challenge-validate.ts`):

- Y89-base: three kept cases re-homed on a temp git repo (`makeRepo`, child env without GIT_*). Red: `TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received undefined` (3 cases). Change: `runLintStaged(root, slugs)` calls `fullValidate(root, slug)`. Note for the Y66-Y69 segment: the analysis step still calls `discoverChallenges(join(root,'platform','challenge'), slug)`, dormant in the new layout until re-pointed.
- Y88: 21 cells (7 inputs x relative/absolute/backslash) plus the kept cases with `LOCALES`. Red: 6 brief cells `expected [] to deeply equal [ 's' ]`, 3 flat `s.md` cells `expected [ 's' ] to deeply equal []`; declaration, src/, ja and guide cells green before the change, as predicted.
- Y111 (deriveSlugs clause; ownership taken here, parent to confirm): red `expected [ 's', 't', 'u' ] to deeply equal [ 's' ]` (the single-path cells sit in the same `it` after that assertion, so the first assertion is the recorded red line). Locale branch narrowed to `index.md$`; the declaration branch accepts every path.
- Y89 (a) LS1: red on both shapes (src/ only; with a zh-TW brief), the message was the VM1 `declaration: ... not found` line. Change: LS1 fires when `platform/challenge/<slug>/` exists without challenge.yaml; the old 'missing index.md' wording is gone.
- Y89 (b) removed: first-green (the removed branch survived; directory-absent plus `discoverChallenges` empty). Mutation: delete the console.error line -> 2 red (spy equals `[['[pre-commit] ⊘ s (removed)']]`); restored. Second shape adds a ja brief.
- Y89 (c) VM1: first-green after (a). Mutation: LS1 branch made unconditional -> both VM1 cells red; restored.
- D122 (a): red `expected [ { slug: 's', …(1) } ] to deeply equal []` with the `brief (zh-TW): ... not found; every challenge has a brief in the primary locale (zh-TW)` message. Change: new `readIndexPrimaryLocale(root)` in `.vitepress/primary-locale.ts`; `validateChallenge(root, slug, primaryLocale?)` optional third parameter; `runLintStaged` reads P once before the loop (D123). Working-tree range.json bytes asserted unchanged.
- D122 (b): NOT first-green as the plan predicted: it was red before (a)'s change (`expected false to be true`, the working tree's `en` was read) and green after. Mutation: fall back to `readPrimaryLocale(root/range.json)` on no entry -> red; restored.
- D122 (c): 7 cells. PL-E03..PL-E06 first-green (parser already throws; read is before the loop). Red: 120000 `expected 'PL-E03' to be 'PL-E01'`; 160000 and missing blob `expected Error: Command failed: git show :range.json … to be an instance of SiteLayoutError`. Change: mode check (100644/100755 else PL-E01) and try/catch -> PL-E02 `(unknown)`. A `--cacheinfo` entry with an unknown sha was accepted by git 2.x here, no stub needed.
- main() wiring: cells (1) en index brief, (2) ja arg, (4) LS1 first-green (main already edited by earlier cycles). Red (3): stderr first line `SiteLayoutError: PL-E03: range.json is not valid JSON.` with stack. Change: main catches SiteLayoutError, prints `err.message`, exits 1. The child runs with `NODE_NO_WARNINGS=1` (as the 5a CLI cases do, same P2 caveat on Node 22).

Mutations for self-check (each restored): P read from working tree (`primary = undefined`) -> 8+ red; mode check off -> 120000 and 160000 red.

Not done: none. Decision for the parent: `readIndexPrimaryLocale` lives in `.vitepress/primary-locale.ts` (plan's proposal, so PL texts stay private); wave 6's generate-redirects `--staged` can switch to it. The old tests 'skips nonexistent slug' and 'errors on incomplete slug' are replaced by the Y89 (a)/(b) cases; 'derives slug from legacy flat file' and 'mixes per-folder and legacy' by the flat `s.md` cells (overridden contract, traceability.md:1743). No `git add` made; nothing under platform/ touched.

Commands: `npx vitest run tests/challenge-lint-staged.test.ts` -> 49 passed. Close-out set (`tests/challenge-lint-staged.test.ts tests/challenge-validate.test.ts tests/unit/site/primary-locale.test.ts tests/unit/site/config-base.test.ts tests/unit/site/redirects.test.ts tests/unit/i18n/page-list.test.ts`): 6 files, 516 passed; with `GITHUB_REPOSITORY=acme/range`: 506 passed, 10 skipped. (The glob `primary-locale*.test.ts` matches only primary-locale.test.ts.)

Deferred to stage 6 (P2, frozen rubric):
- `scripts/challenge-lint-staged.ts:106` (P2, confidence medium): the analysis step still calls challenge-analyze's `discoverChallenges(platform/challenge, slug)`, which looks for `<slug>/index.md`. In the new layout it finds nothing, so the hook skips analysis without saying so (`if (challenges.length === 0) continue` prints the check mark). Nothing that was green broke, because no lint-staged test exercises an analysis-only warning. The Y66-Y69 segment (row Y69 rewrites `discoverChallenges`) re-points this call.
- `tests/challenge-lint-staged.test.ts:247` (P2, confidence low): the in-process `runLintStaged` cases (D122 a/b/c, Y89) call `readIndexPrimaryLocale` with the test process's own environment, so an inherited `GIT_DIR` or `GIT_INDEX_FILE` would make them read another repository's index. The child git calls and the CLI cases strip `GIT_*` through `gitEnv()`; production must inherit the environment so the hook's `GIT_INDEX_FILE` is honoured. Only matters when vitest itself runs under a git hook or `git rebase --exec`; `scripts/pre-commit.sh` does not run vitest.
- `.vitepress/primary-locale.ts:77` (P2, confidence low): if `git ls-files` itself fails (for example, `root` is not a git repository), the error is a plain Error; `main()` rethrows it, so the user sees a stack trace instead of a one-line message, and git's stderr passes through. D114 and D122 define only the no-entry, mode and failing-`git show` cases, so this is not a spec breach. The hook always runs at the repository root.
- `tests/challenge-lint-staged.test.ts:164` (P2, confidence medium): same environment inheritance as the line 247 finding, seen from the header comment (lines 14-15 say only that the child environment has no inherited `GIT_*` variable); the git calls at `.vitepress/primary-locale.ts:77` and `:83` pass no env. Read-only, hardening only.
- `.vitepress/primary-locale.ts:77` (P2, confidence low): the pathspec in `git ls-files -s -- range.json` also matches entries below a directory named `range.json` (`range.json/x`). Such an index ends in PL-E02 "(unknown)", while the working-tree reader gives PL-E01 (not a regular file) for the same shape. A conflicted index entry (stages 1, 2 and 3) also ends in PL-E02. D114 and D122 list only 120000, 160000 and a failing read, so neither shape has a row; both are refused either way.
- `tests/challenge-lint-staged.test.ts:312` (P2, confidence low): the missing-blob PL-E02 cell depends on `git update-index --add --cacheinfo 100644,<unknown sha>` being accepted without an object check (confirmed on local git 2.54). S43 describes the failing read as stubbed, so an older or stricter git on CI could fail in the fixture rather than in the code under test.
- `scripts/challenge-lint-staged.ts:106` (P2, confidence medium): duplicate of the first item from the second reviewer: step 2 (analysis) uses the old-layout `join(root,'platform','challenge')`, so analysis warnings are silently skipped at commit time until Y66-Y69 re-point it. Out of 5b's rows; the executor left a note for that segment.
- `tests/challenge-lint-staged.test.ts:355` (P2, confidence low): the command cases set `NODE_NO_WARNINGS=1`, so the assertions on stderr's first line and exact text (the PL line, `[pre-commit] ✓ s`) do not cover the real hook invocation on Node 22, where an ExperimentalWarning for `--experimental-strip-types` may come first. `scripts/pre-commit.sh:466` runs the command without that variable. Same caveat as recorded for 5a.

Full-suite result (suite step): single parallel run (JSON reporter, exit 1): 151 test files, 804 suites, 6451 tests: 6330 passed, 9 failed, 112 skipped, 0 todo. Plus 1 file failed at collection (`tests/pre-commit-sh.test.ts`, a file failure with no assertions: "Cannot generate _redirects: the challenge tree is inconsistent. door (platform/zh-TW/challenge/door/index.md) has no declaration platform/challenge/door/challenge.yaml"). Every failure matched an allowed entry, so the `--no-file-parallelism` re-run was not needed and no flake was observed.

### 2026-11-17 (parent, decision on segment 5c's plan needs_user: D80 (b), D133, Y-O5; 依使用者授權核准)

Under the user's standing authorization quoted in the 2026-11-17 parent entry above (「授權：所有建議我都同意，權限都授權到
兩個 epic 完成…executor 要我決定的事，請在票的 Comments 引用我這段話並寫明範圍。」). Scope: the means by which keygen
converges (D80 (b)); nothing else. D133 says the user chooses when write order or the module's mtime cannot make (b)
hold; the user's authorization covers decisions an executor would refer to them, so the parent decides as the planner
recommends and lists it to the user with its cost and the alternative.

- Measurement (Y-O5, the planner's scratch clone, since deleted): with today's code every second and third run
  reports `[stale]` for all four challenges. Two causes: `index.md` is written after `runtime.wasm`; and `main`
  re-stages `.vitepress/wasm/template.wasm` on every run, which is itself a tracked input. Changing the write order
  alone still gives `[stale]`. With the staged template re-staged only when it is missing, older than wasm-pack's
  output, or under `--force`, runs 2 and 3 report `[skip]`; touching the raw template, the staged template, a `src/`
  file or the declaration each gives one `[stale]` and then `[skip]` again.
- Decision: approved as recommended. (1) The declaration is written after the staged module passes the integrity
  check and before `runtime.wasm` is placed, and only when its bytes change (D80 (a)). (2) `main` calls
  `prepareTemplateWasm` only when `force || isOutputStale(staged template, [virtual_fs_bg.wasm])`. The tracked set
  does not change, so Y57 (e) holds; AC-39's "converges" is met, not weakened. Y58 and Y57's CLI half are written
  against this.
- Why the parent reads this as inside D80 (b): the means is mtime-based and changes no tracked input; `pnpm build`
  and `pnpm dev` run `wasm:build` first, so they rebuild as today.
- Known cost, recorded for stage 6 and listed to the user: after upgrading only `wasm-tools` or `wasm-opt`, the
  staged template is not redone until `pnpm wasm:build` or `--force` runs.
- Alternative not taken: track wasm-pack's raw output instead of the staged file (a one-line change, but it changes
  what is tracked, against Y57's text).

### 2026-11-17 (segment 5c)

Wave 5, keygen. Done, with the parent's decision on D80 (b)/D133 applied (declaration
  written after the integrity check and before `runtime.wasm`, only when bytes change; `prepareTemplateWasm` only when
  `force || isOutputStale(staged template, [virtual_fs_bg.wasm])`). Y-O5 measured in a scratch clone before the
  segment: runs 2 and 3 all `[stale]` (write order alone not enough; staged template re-staged every run), `[skip]`
  after both changes; the four upstream `challenge.yaml` round-trip byte-for-byte.
  - Y61, 8 existing source_files cases: fixture only (`challenge.yaml` + brief under `platform/<P>/challenge/<slug>/`,
    P from the copy's `range.json`). Red: `Challenge not found: keygen-source-files-probe` (6), `expected 1 to be +0` (3).
    Green after `keygenSlugs` + `processChallenge(root, slug, ...)` reading `readChallengeDeclaration`. Isolation case stayed green.
  - Y59 (carried failure): pointed at `challenge.yaml`; first-green (the integrity check precedes every write). Mutation:
    removing `assertPayloadIntact` red. The plan's mutation (a), moving the write above the check, is NOT visible
    with the live fixture: door-is-open's declaration already has `wasmModule` and no legacy key, so the write is
    byte-identical and D80 (a) skips it; the mtime assertion goes red only when the early write changes bytes (verified with a
    one-byte change). Y59's assertions were left as approved; suggestion for stage 6: a fixture whose write-back differs.
  - Y52 (a)(b), Y53 (a)(b): first-green (discovery already keyed on `challenge.yaml` after Y61). Mutations: dropping the
    `existsSync(challenge.yaml)` filter red Y52 (a)(b) and Y53 (b); `slugs.length === 0` off red Y53 (a)(b).
  - Y20 keygen half, 5 keys: red `expected [ '[prep] ...' ] to include '[warn] legacy: deprecated field 'fs' ...'` (only `fs`);
    green after importing `LEGACY_FIELDS` from `.vitepress/challenge/config.ts`. Mutation (skip `fs`) red.
  - Y54: first-green; fixture checked as a fixed point of `toString({lineWidth:0})` and holds a long flow sequence.
    Mutations: `toString()` without `lineWidth: 0` red; removing the `doc.delete` loop red. Mutation (c) (touch a brief) not run.
  - Y21 keygen half: first-green; mutation (default flag file name) red.
  - Y56: red `expected 1794903281829.5415 to be 1577836800000`; green after `if (next !== raw)`.
  - Y57 function half: 2 of the 4 re-pointed cases red (`expected [ ... ] to include '<...>/src/app.py'`) plus the new
    case; green after dropping the `index.md` test. Mutation (drop src scan) red.
  - Y58 (a)(b): red, second run printed `[stale]` instead of `[skip] again`; green after the write order and the
    template mtime condition. Mutation (always re-stage) red.
  - Y57 CLI half, 6 cells: first-green after Y58. Mutations: primary brief added to the tracked set red the zh-TW (a) cell;
    drop src scan red (c); always re-stage red both (a) cells.
  - Y55: first-green, upstream-only through `upstreamOnlySkipReason`; four texts hand-typed from Y-§2.4. Mutation
    (`toString()` without `lineWidth: 0`) red. NOT moved to V-Y5: the test never calls wasm-pack, it needs only the built
    `virtual_fs_bg.wasm`, as Y61 and Y59 do; CI builds wasm before `pnpm test`.
  - Y60: (i) red `expected '[done]  good ...' not to contain 'legacy flat file structure'`, green after removing the flat
    branch and `parseMd`; (ii) first-green. After B38's layout check, (i) was rewritten as planned: exit non-zero, stderr
    lines 1-2 = PL-E08 first line and `"platform/challenge/old.md"`, no flat warning, platform/ snapshot unchanged.
  - Y107: (a)(b) first-green; six fault cells red `expected +0 to be 1` (PL-E02 skipped under win32 or root), green after
    `readPrimaryLocale` at the top of `main`. Mutation (fixed `zh-TW`) red 7.
  - B38 keygen half: (1) red `expected +0 not to be +0`, green after `checkSourceLayout`; (2) first-green (range.json read first).
    Mutation (drop the layout check) red (1) and Y60 (i).
  - Not done / notes: nothing undone. Cross-area: a declaration that is not one mapping is skipped with
    `[skip] <slug>: declaration unreadable (<reason>)`, no row, no test (stage 6 P2). `main` keeps no flat discovery at all.
  - `git add`: none (nothing under `platform/` changed; fixtures live in `os.tmpdir()`).
  - Commands: `npx vitest run tests/unit/scripts/challenge-keygen.test.ts` 114 passed (114); same with
    `GITHUB_REPOSITORY=acme/range` 113 passed, 1 skipped (Y55, upstreamOnlySkipReason); `tests/unit/challenge/config.test.ts`,
    `tests/unit/challenge/plugin.test.ts`, `tests/challenge-validate.test.ts`, `tests/unit/site/redirects-generated.test.ts`
    4 files, 347 passed. `git status --porcelain --ignored` identical before and after; `find platform .vitepress/wasm scripts -newer <stamp>` empty.
  - Full suite (segment 5c, vitest in Node only, no browser): parallel run 6629 total, 6508 passed, 9 failed, 112 skipped
    (844 suites, 8 failed suites). Serial run (`--no-file-parallelism`): identical, 6508 passed / 9 failed / 112 skipped. No flakes.
  - Deferred to stage 6 (P2, frozen rubric):
    - `tests/unit/scripts/challenge-keygen.test.ts:1270` (high): with the real door-is-open fixture, Y59 cannot detect a declaration write moved above the integrity check, because the write-back is byte-identical and D80 (a) skips it (`if (next !== raw)` at `scripts/challenge-keygen.ts:762` never writes); an unconditional early write or an early `runtime.wasm` would still go red. Suggest a fixture whose write-back differs.
    - `scripts/challenge-keygen.ts:600` (medium): a declaration that `readChallengeDeclaration` rejects (invalid YAML, multi-document, not a mapping) is skipped with `[skip] <slug>: declaration unreadable (<reason>)` and the run exits 0; no row or test defines this case. It is the counterpart of HEAD's `[skip] <slug>: no frontmatter`, so not a regression.
    - `scripts/challenge-keygen.ts:624` (high): the flat-branch removal leaves a bare `{ ... }` block (lines 624-658) in `processChallenge` that is only extra indentation; style only.
    - `tests/unit/scripts/challenge-keygen.test.ts:1360` (low): the fixture-tree CLI cases set `NODE_NO_WARNINGS=1`, so the "stderr's first line is the PL line" assertions (Y107, B38, Y60 (i)) do not cover the real `pnpm challenge:keygen` run on Node 22, where an ExperimentalWarning may print first (same caveat as 5a and 5b).
    - `tests/unit/scripts/challenge-keygen.test.ts:1265` (medium): Y59's mtime assertion can no longer catch a declaration write moved above the integrity check, and its comment still claims it can (same root cause as the first item); fix with a differing-write-back fixture and an updated comment.
    - `tests/unit/scripts/challenge-keygen.test.ts:1424` (high): the Y20 keygen case title says "one exact warning" but the test only checks that the exact line is present, not that it appears once; wording or test strength only.
    - `scripts/challenge-verify.ts:277` (high): outside this segment, `challenge-verify-L1.test.ts` › "passes for a well-formed challenge" is red (`TypeError: The "path" argument must be of type string`, from `validateChallenge` at `scripts/challenge-validate.ts:163`; L1 still passes an index.md path into the new signature). `git diff HEAD` is empty for those files and the L1 path never reaches keygen, so it predates 5c; it belongs to the verify segment (owner 5f) and is on the carried list.
    - `scripts/challenge-keygen.ts:600` (medium, duplicate of the second item): the unreadable-declaration skip with exit 0 is uncovered by any row or test.

### 2026-11-17 (parent, segment 5c's suite stop: segment 5b's full-suite report was stale)

- The orchestrator stopped at 5c's suite step on one "unexpected" failure:
  `tests/unit/scripts/challenge-verify-L1.test.ts › L1 layer (task 4.2) passes for a well-formed challenge and surfaces
  "✓ L1 passed"`. It is not new. Segment 5a's plan declared it in advance (L1 still calls `validateChallenge` with one
  argument; owner: segment 5f), and 5a's suite listed it as still failing.
- Cause, from the orchestrator's journal: segment 5b's suite step reported "6451 tests: 6330 passed, 9 failed, 112
  skipped", byte for byte segment 4d's numbers, and without the verify-L1 failure that was red before and after it.
  5a's real run had 6561 tests. The 5b suite agent read an old JSON report file; its "full-suite result" line in
  5b's Comments entry is therefore wrong and is corrected by this entry. The carried list lost the verify-L1 entry.
- What covers 5b now: 5c's suite was run for real, parallel and with `--no-file-parallelism`, identical both times
  (vitest in Node): 6629 tests, 6508 passed, 9 failed, 112 skipped. The failures are verify-L1 (above), the 8
  `create-challenge-run` cases (owner: 5e) and `tests/pre-commit-sh.test.ts` failing at collection (owner: wave 6).
  Y59 is green. That run is on a tree containing 5b's commit `8afc11b`, so it verifies 5b's change as well.
- Handling (no user decision involved; a record correction): the verify-L1 entry is restored to the carried list with
  owner 5f, and from segment 5d on the suite step must write a new, segment-named report file and state its path,
  modification time and HEAD sha.

### 2026-11-17 (parent, decisions on segment 5d's plan needs_user; 依使用者授權核准)

Under the user's standing authorization quoted in the 2026-11-17 parent entry above (「授權：所有建議我都同意，權限都授權到
兩個 epic 完成…executor 要我決定的事，請在票的 Comments 引用我這段話並寫明範圍。」). Scope: the three questions segment 5d's
planner raised; nothing else. Each follows the planner's recommendation.

1. One test case outside the approved test plan table is added to `tests/challenge-lint-staged.test.ts`: with
   `127.0.0.1` in `src/app.py`, `runLintStaged` reports `Hardcoded localhost reference in app.py`. Approved. Y69's new
   `discoverChallenges` signature forces a change at `scripts/challenge-lint-staged.ts:106`; both of 5b's checkers
   found that step silently skipped and untested. It adds a case; it drops, shrinks or replaces no approved row.
2. Shapes Y68 does not name. Approved as recommended, no new message text: for an empty, comment-only or non-mapping
   `challenge.yaml`, analyze keeps its own lenient read and the existing `challenge config must be an object` from
   `validateChallengeDeclaration`; a multi-document file falls under `Invalid YAML in challenge.yaml: <message>`. One
   assertion pins each shape. The VM2 and VM4 texts stay `challenge:validate`'s (Y3, Y5, Y6), which the hook and
   verify run first. Recorded for stage 6 as a spec wording item: Y68 and D89 are silent on these two shapes.
3. `tests/unit/scripts/challenge-verify-L2.test.ts`'s three cases turn red after 5d's `discoverChallenges` change
   and stay red until segment 5f (Y86, Y87, Y109). Accepted as a planned inter-wave red, declared in advance by the
   plan, as with segment 4a. The alternative keeps the legacy branch Y69 removes and would not save L2's fixtures.

### 2026-11-17 (segment 5d)

Rows Y62-Y69 and Y108 (retype and analyze). Authorization and the three plan decisions: the parent entry
"2026-11-17 (parent, decisions on segment 5d's plan needs_user)". No commit, no stash/checkout/reset/restore, no
`git add` (nothing under platform/ was touched; every fixture lives under `os.tmpdir()`).

Baseline (row 0): `npx vitest run` over the 5 retype files, `challenge-analyze`, `challenge-lint-staged`,
`challenge-verify-L2`: 8 files, 96 passed (L2's 3 cases green). `git status --porcelain --ignored` saved for the
close.

| Row | Red line (before the production change) | Production change |
|---|---|---|
| 1 Y63 | `expected 'Challenge no-such-challenge not found…' to be 'Challenge no-such-challenge not found…'` (both cells; old text ended `index.md`) | retype checks and reports `challenge.yaml` (`declarationPath`) |
| 2 Y62 | `Error: index.md has no YAML frontmatter block` (4 cases red) | whole-file `parseDocument` / `doc.set` / `toString({ lineWidth: 0 })`; `splitFrontmatter`, `serializeIndex`, `ParsedIndex` deleted (no other importer, grepped); header comment says challenge.yaml. The fixture is a fixed point of `toString({lineWidth:0})` (the byte-for-byte cases pass). |
| 3 Y65 | none: first green, because row 2 left retype not reading any brief. Mutation (retype reads the zh-TW brief's `backend` as oldBackend): (i) `expected 2 to be +0`, (ii) `Error: bad brief`; restored | none |
| 4 Y64 | not run on the old fixtures one by one; row 1 had turned them red for RT1 (`expected 1 to be +0` / `1 to be 2` as the plan predicted, not individually captured). Fixtures re-pointed to challenge.yaml: green. Mutations: dropping `doc.set('backend'/'app')` -> same-family red (`expected 'difficulty: easy…' to contain 'backend: flask'`); writing the declaration before the cross-family return -> cross-family red (`expected 'backend: php…' to be 'backend: fastapi…'`); both restored | fixtures and assertions only (same-family now asserts runKeygen called exactly once with the slug; cross-family also asserts the slug folder holds only challenge.yaml and src) |
| 5 | row 1 left `-errors` "keygen throws" red (`expected 1 to be 3`); spec-sync cases were not run alone on the old fixture (same row-1 cause). Fixtures re-pointed: all 5 retype files green (17 cases) | fixtures only |
| 6 Y69 | `expected [] to deeply equal [ { slug: 'a', … } ]` (4 cases: both P, brief-absent, target filter). The "not challenges" case and the empty-root cases were first green on the old code (nothing to find in that tree); mutation "no challenge.yaml check" -> only-src case red; restored | `ChallengeFile = { slug, declarationPath, briefPath }`; `discoverChallenges(root, primary, targetSlug?)`; legacy branch gone |
| 7 Y68 | `expected [ 'Cannot read file: undefined' ] to deeply equal [ 'No challenge.yaml found' ]`; 11 cases red | `readDeclaration` (ENOENT -> `No challenge.yaml found`; `doc.errors[0]` -> `Invalid YAML in challenge.yaml: <msg>`), `validateChallengeDeclaration`, isPerFolder/legacy gone. `validateChallengeConfig` untouched. Pinned per parent decision 2: empty, comment-only and scalar root -> `challenge config must be an object`; two documents -> `Invalid YAML in challenge.yaml: …` |
| 8a Y66 | `TypeError: The "path" argument must be of type string or an instance of Buffer or URL. Received undefined` (15 cases red: the converted analyzeChallenge cases and Y66 x2) | analyzeChallenge reads the declaration and the primary brief's title (no fallback yet) |
| 8b Y67 | `Error: ENOENT: no such file or directory, open '…/zh-TW/challenge/door/index.md'` (other-locale-only brief); `expected undefined to be 'door'` (no title key) | `readBriefTitle`: unreadable, no frontmatter, parse error or non-string title -> slug |
| 9 Y69 caller | `expected false to be true` (2 cases, P = zh-TW and P = en from the index's range.json) | `scripts/challenge-lint-staged.ts`: `discoverChallenges(root, primary, slug)`. Mutation (old call) -> both red; restored. This is the one case outside the approved table (parent decision 1). |
| 10 Y108 | (a)(b) `expected 1 to be +0`; (c) `expected 'Challenge not found: door' to be 'PL-E0x: …'` (6 cells, PL-E02 included: it ran, uid is not 0) | `main` reads `readPrimaryLocale(join(root,'range.json'))` first; a `SiteLayoutError` -> `console.error(message); exit(1)`; no `checkSourceLayout` (D19). Header comment updated. |

Mutations at the close (each restored): retype writing `index.md` -> 6 of `-metadata` red (Y62); briefPath fixed to zh-TW -> Y66 en, Y69 en x2, Y108 (b) red; `main` not reading range.json -> Y108 (b) and all six (c) red; discover without the challenge.yaml check -> 3 Y69 cases red; lint-staged on the old call -> both new cases red.

Commands and counts:
- Baseline above: 8 files, 96 passed.
- Close: `npx vitest run tests/unit/scripts/challenge-retype tests/challenge-analyze.test.ts tests/challenge-lint-staged.test.ts tests/challenge-validate.test.ts tests/unit/challenge/config.test.ts tests/unit/scripts/challenge-verify-L2.test.ts`: 10 files, 325 tests, 322 passed, 3 failed (all in `challenge-verify-L2.test.ts`, the planned inter-wave red, owner segment 5f: `analyze could not discover slug`).
- Same with `GITHUB_REPOSITORY=acme/range`: 322 passed, 3 failed, 8 skipped (the skips belong to the other files' upstream-only rows, none in 5d's files).
- `git status --porcelain --ignored` differs from the baseline only by the 3 scripts and 7 test files listed below; `find platform -newer <stamp>` (excluding the gitignored `platform/public/challenge/`) is empty.

Files changed: `scripts/challenge-retype.ts`, `scripts/challenge-analyze.ts`, `scripts/challenge-lint-staged.ts`, `tests/unit/scripts/challenge-retype-{errors,metadata,same-family,cross-family,spec-sync}.test.ts`, `tests/challenge-analyze.test.ts`, `tests/challenge-lint-staged.test.ts`, this ticket.

Notes for later segments:
- 5f (verify L1/L2, Y86, Y87, Y109): `scripts/challenge-verify.ts:288` still calls `discoverForAnalyze(<platform/challenge>, slug)`; the new call is `discoverChallenges(projectRoot, primary, slug)`. Its L2 fixtures are still `index.md`.
- Wave 6 (the hook): `scripts/challenge-analyze.ts` now imports `.vitepress/primary-locale.ts`, `.vitepress/layout-error.ts` and (type only) `.vitepress/locales.ts`; `tests/__helpers__/preCommitRepo.ts` COPIED_FILES must cover them.
- Stage 6: `challenge-retype.ts` rewrites the whole challenge.yaml through `yaml`'s `toString({ lineWidth: 0 })`, so a hand-formatted declaration that is not a fixed point of it is normalised on the first retype (Y54's rule in 5c applies the same way). The checked-in declarations were not run through it here.
- Y68 and D89 are silent on empty / comment-only / scalar / multi-document challenge.yaml (decision 2); also an array root reaches `missing required field: backend` through `validateChallengeDeclaration`, which no case pins.

Deferred to stage 6 (P2, frozen rubric), segment 5d final review:
- `tests/unit/scripts/challenge-retype-metadata.test.ts:76` (P2, confidence medium): Y62's `--tags` case removes the tags lines from both sides before comparing, so it cannot catch the tags entry moving to another position in the mapping; the other three Y62 cases compare the whole file byte for byte and pin key order, so the row as a whole stays covered.
- `tests/unit/scripts/challenge-retype-spec-sync.test.ts:40` (P2, confidence high): the red runs for the re-pointed Y64 fixtures and for the spec-sync and keygen-throws fixtures were not recorded file by file (table rows 4 and 5 say so); mutations afterwards show the tests can fail, so only the /tdd red evidence is thinner.
- `.claude/skills/wxl-mutate/SKILL.md:56` (P2, confidence low): the wxl-mutate skill (Claude and Codex copies) still says the retype-owned fields live in `index.md` frontmatter, but retype now owns challenge.yaml (D90); outside 5d's rows, probably a later docs segment's.
- `scripts/challenge-analyze.ts:114` (P2, confidence high): no test covers `readDeclaration`'s non-ENOENT branch (`Cannot read file: <path>`, e.g. a directory or EACCES); the old "cannot be read" case became Y68's ENOENT case, and Y68 names only the absent and invalid cases.
- `tests/unit/scripts/challenge-retype-same-family.test.ts:86` (P2, confidence medium): Y64's "app changes in challenge.yaml" cannot be observed in the same-family test: fastapi and flask both use `app.py`, so `app: app.py` stays green without `doc.set('app', ...)`; php is cross-family (exit 2), so no same-family swap changes `app`. The assertion predates the segment.

Full suite (parallel run only; no re-run needed, all failures allowed, no flakes): report `/private/tmp/claude-501/-Users-phoenix--claude-spares-spare-ewfjDD/6664f559-2fb1-4393-860a-844e6aa7b0ee/scratchpad/s5d/report-5d.json` (mtime Nov 17 16:41:43 2026, written after the run start: start epoch 1794904856, file 1794904903), HEAD d2c7e30. Tests: 6652 total, 6528 passed, 12 failed, 112 skipped, 0 todo. Suites: 845 total, 10 failed suites (`tests/pre-commit-sh.test.ts` file-level collection failure counted as a suite failure, with no per-test entries). Failing tests: 8 in create-challenge-run, 1 in L1, 3 in L2.

### 2026-11-17 (parent, decision on segment 5e's plan needs_user: 0007's C07; 依使用者授權核准)

Under the user's standing authorization quoted in the 2026-11-17 parent entry above (「授權：所有建議我都同意，權限都授權到
兩個 epic 完成…executor 要我決定的事，請在票的 Comments 引用我這段話並寫明範圍。」). Scope: what happens to 0007's case
C07 in `tests/unit/scripts/create-challenge-run.test.ts`; nothing else.

- Question: C07 ("a Traditional Chinese brief carries another number → the generator refuses → status 2") loses its
  premise under the new layout: the number lives only in `challenge.yaml`, the generator no longer reads a brief's
  number, and the old fixture would now end with status 0.
- Decision: approved as the planner recommends. C07 is re-pointed to D64 (b): a brief with no declaration
  (`platform/zh-TW/challenge/orphan/index.md`), so no number; its label changes and its five assertions stay as they
  are. C04 and C06 only change the file that carries the fault (`index.md` → `challenge.yaml`), the same fault class,
  and need no decision. The executor adds C04, C06 and C07's fixture re-pointing to traceability.md's "Overridden
  contracts" row for create:challenge (the row D149 already amended for C05), marked as added at stage 5 under the
  user's standing authorization on 2026-11-17, so stage 6 reads it there.
- Why it is listed: C07's change replaces the fault class, not only a path, and that row did not name it.

- 2026-11-17 (segment 5e): create:challenge, rows Y70-Y85, Y105, Y111's create clause, and C07's re-point,
  all done. Files: `scripts/create-challenge.ts`, `tests/unit/scripts/create-challenge.test.ts`,
  `tests/unit/scripts/create-challenge-run.test.ts`, and one sentence in `traceability.md` row 1741 (see
  the end). No file under `platform/` was touched, so no `git add` was made. Baseline before any edit: the
  two files held 47 cases, 8 failed / 39 passed (the carried failures in the plan).
  - Row 0, fixtures (`DEFAULT_TREE` rewritten: both homes, `challenge.yaml` declarations, both brief
    locales, the retired declaration; constants made functions of `P`). First red before production
    moved: `expected 2 to be +0` (C01, PL-E08 on the old scaffold's `platform/challenge/new-chall/index.md`).
    Also red from the fixture alone, as intended: C03 `expected false to be true` (`expectScaffold`), C05's
    "existing per-folder slug" `expected 2 to be 1`.
  - Y78: `TypeError: Cannot read properties of undefined (reading 'en')`. Y74: `TypeError: generateBrief
    is not a function`; my first regex split the brief after `---` instead of after the `---` line, a test
    slip fixed before the production change counted. Y76: `expected 'Stage8 Decl' to be
    '未命名題目（stage8-decl）'` (the en cell was already green: existing Title Case).
  - Y77 and Y79: green on first run (`if (title) return title` is old behaviour; Y78 and Y76 had filled both
    locales). Mutations: the title branch removed gave `expected 'X' to be 'X Y'` and `expected
    '未命名題目（x）' to be 'X Y'`; the `zh-TW` entry renamed gave `TypeError: Cannot read properties of
    undefined (reading 'title')` / `'body'`. Both restored.
  - Y75 (function half): `TypeError: generateDeclaration is not a function` (10 cases, the nine old
    `generateMarkdown` cases re-pointed one by one, none dropped; title and layout assertions moved to Y74).
  - Y80 (function half): `expected undefined to be 'Challenge "s" already exists: platform/challenge/s/'`
    (my helper returns the message, so the line differs from the plan's `expected [Function] to throw`; the
    reason is the same, the old check only saw `<slug>/index.md`). The `<slug>.md` case stayed until Y82.
  - Y81 (function half): same shape, two red cells (one per locale). Y82: after I had already edited the
    production file, I re-added the legacy branch temporarily to see the red:
    `expected 'Challenge "s" already exists (legacy)…' to be undefined`, then removed it again.
  - Y70: red `expected 2 to be +0`. This needed a temporary alias because an earlier cycle had already removed
    `generateMarkdown` (otherwise the line was `ReferenceError: generateMarkdown is not defined`). Green with
    the new scaffold block; the carried failures (three "replaces", C04, C06, C07, C09, C03) turned green with it.
  - Y72: red `expected [ Array(8) ] to deeply equal [ Array(8) ]`. Y71: green on first run (no `primaryLocale`
    key gives zh-TW); mutation `primary = 'en'` made it fail with the same array diff.
  - Y73: all six red, but the line was `expected 'Error: PL-E0x: …' to be 'PL-E0x: …'` (my Y72 change had put the
    read inside the argument try, which adds `Error:` and USAGE). Green after the read got its own try that
    prints `e.message` only (D123). PL-E02 ran (not skipped here: not win32, not root).
  - Y105: red `expected 2 to be 1` for both cells (`platform/index.md`, and `--name legacy` with a flat
    `legacy.md`). Production now runs arguments, primary locale, layout check, collision, number, write (D82).
    C05's "existing per-folder slug" gained the exact stderr; its other 8 cells lost `legacy.md`.
  - Y80/Y81/Y111 (run halves): green on first run (the function-half cycles had already changed the caller to
    pass `root`). Mutations: removing the `checkCollision` call failed all 8; limiting the locale loop to zh-TW
    failed the two cells whose `L` is `en` (that is one cell with `L = P` and one with `L != P`, not two
    `L != P` cells as the plan said); testing `index.md` instead of the directory failed only Y111
    (`expected +0 to be 1`). All restored.
  - Y84: red `expected 'Error: keygen failed after the scaffo…' to contain 'platform/zh-TW/challenge/new-chall/index.md'`
    (W2) and the same shape for W1, 8 cells; green after the sentences gained `with its brief at <path>`. P = en
    has one W2 cell and one W1 cell; `expectW1` takes `P`. 0007's substrings are untouched.
  - Y83 (both P) and Y85: green on first run. Mutations: a `number` key in the brief gave `expected [ Array(1) ] to
    deeply equal []` (`brief (<P>)` failed); `number: 1` gave `expected 1 to be 8`.
  - Y75 (run half): green on first run; the double appends `wasmModule` like keygen and the test checks it is
    absent before and last after. Mutation (`wasmModule` in `generateDeclaration`) failed the "before keygen" key
    list. Limit: this fixes only that `run` does not rewrite the declaration after keygen; the real keygen
    write-back is 5c's Y54 and stage 8's V-Y1.
  - C07: re-pointed per the parent decision (label `C07: a brief has no declaration, so no number`, tree =
    default plus `platform/zh-TW/challenge/orphan/index.md`, assertions unchanged). C04 and C06 now use
    `challenge.yaml` (C04 adds the two homes).
  - Cleanup: `SLUG_RE` replaced by `SLUG_GRAMMAR` from `.vitepress/challenge/shortLink.ts`; file header and exit
    status text no longer say frontmatter stub. `node --experimental-strip-types` still loads the module.
  - Commands: `pnpm vitest run tests/unit/scripts/create-challenge.test.ts tests/unit/scripts/create-challenge-run.test.ts`
    twice, each 2 files, 82 passed (40 + 42); `pnpm vitest run tests/unit/site/redirects-generated.test.ts
    tests/challenge-validate.test.ts`: 2 files, 245 passed. No full suite run.
  - `traceability.md` row 1741 (create:challenge "Overridden contracts"): appended the C04, C06 and C07 re-pointing,
    marked as added at stage 5 under the standing authorization of 2026-11-17, as the parent decision asked.
  - Notes for later segments: `validateArgs` now returns `title: string | undefined`; `ScaffoldArgs` changed
    accordingly. Glossary clause of Y78 stays with stage 6. A missing `platform/` directory now throws from the
    layout check's `lstatSync` (rethrown, not status 1); the real repository always has one.

  - Deferred to stage 6 (P2, frozen rubric), segment 5e findings (duplicates merged):
    - `tests/unit/scripts/create-challenge-run.test.ts:442` (medium): Y84 P=en W1 case does not assert 0007's first W1 substring (the generator's error message); only the zh-TW W1 cases (C04/C06/C07/C09) check it. The W1 path is shared and locale-independent, so this is strength, not a coverage gap.
    - `tests/unit/scripts/create-challenge-run.test.ts:275` (medium): Y71 ("as Y70") checks that the four scaffold lines are on stdout but not that the brief comes first, which Y70 checks. Production prints one fixed block, so Y70 still catches an ordering fault.
    - `tests/unit/scripts/create-challenge-run.test.ts:317` (medium): Y73's PL-E02 cell does not prove a byte-identical tree. It checks range.json's bytes, no 'new-chall' path and the _redirects sentinel, with no before/after snapshot (the other five R19 cells compare `snapshot(root)`).
    - `tests/unit/scripts/create-challenge.test.ts:329` (low): Y79's non-empty title check uses `not.toBe('')`, so a title function returning undefined or a non-string would pass. The Record<Locale,...> type covers totality at compile time.
    - `tests/unit/scripts/create-challenge-run.test.ts:532` (medium): Y75's run half only checks that run does not rewrite challenge.yaml after a keygen double appends wasmModule. The real write-back is 5c's Y54 and stage 8's V-Y1.
    - `scripts/create-challenge.ts:375` (low): no run-level test checks that the default title written to the brief follows the primary locale. Y76 is tested only through getTitle/generateBrief, as the plan scopes it; stage 8's V-Y1/V-Y2 cover it end to end.
    - `tests/unit/scripts/create-challenge-run.test.ts:238` (medium): C01/Y70's _redirects route regexes take the expected page path from `challengePagePath`, the helper generate-redirects.ts uses to build the rule, so they partly repeat production code. S52's literal table in shortLink.test.ts still pins the helper; literals `/challenge/new-chall/` and `/challenge/door-is-open/` would make C01 independent again.
    - `scripts/create-challenge.ts:349` (low): if platform/ is missing, checkSourceLayout's lstatSync throws ENOENT and run() rethrows it as an uncaught exception instead of returning status 1. Outside Y70-Y85/Y105; a real repository always has platform/.
    - `.vitepress/challenge/config.ts:41` (medium): create:challenge no longer uses `validateChallengeConfig`, so only config.test.ts calls it. Y-q1 assigns its removal to wave 5 (ticket line ~1135) but 5e neither removed nor scheduled it; the parent should assign it to a segment.
    - `tests/unit/scripts/create-challenge.test.ts:132` (high): stale label "does not throw when neither md nor directory exists" still mentions the flat .md file that checkCollision no longer checks (D84/Y82).
  - Full suite (parallel run only, no rerun needed, no unexpected failures). Report: `/private/tmp/claude-501/-Users-phoenix--claude-spares-spare-ewfjDD/6664f559-2fb1-4393-860a-844e6aa7b0ee/scratchpad/s5e/report-5e.json`, mtime 2026-11-17 16:55:16 (run started 16:54:26), HEAD 5647630. 856 suites (JSON numFailedTestSuites=5, counting describe-level suites), 6687 tests: 6571 passed, 4 failed, 112 pending/skipped (the pre-commit-sh.test.ts tests, which never ran because of the file-level collection failure). 3 test files failed: pre-commit-sh.test.ts (collection), challenge-verify-L1.test.ts (1 of 2), challenge-verify-L2.test.ts (3 of 3). create-challenge-run.test.ts: all 42 passed, so its 8 carried reds are now green. No flakes. Probe dirs removed before and after; no probe files in git status.

- 2026-11-17 (segment 5f), Wave 5, verify L1/L2 (Y86, Y87, Y109) and the L4 package (Y91-Y93, Y110). Under the standing authorization; not committed, no `git add` (nothing under `platform/` of the repository changed; all fixtures are in os.tmpdir() copies).
  - Baseline (row 0, before any edit, HEAD 5647630): 12 files, 61 tests, 57 passed, 4 failed (L1 1, L2 3). `git status --porcelain --ignored` saved for the end comparison.
  - Red lines (row: line):
    - 1 Y86 absent: `expected 'index.md not found: <tmp>/platform/challenge/door-is-open/index.md' to be 'challenge.yaml not found: <tmp>/…/challenge.yaml'`. Fixed by pointing the existence check at challenge.yaml.
    - 2 Y86 present (carried): `expected 'fail' to be 'pass'`, green after `l1Validate(projectRoot, slug)`. (After row 1 the 'index.md not found' reason had gone; the carried red appeared in the fixture-first run as `expected 'fail' to be 'pass'`.)
    - 3 Y86 failed labels: green first run (row 2's failedLabels logic already holds). Mutations: label text replaced by a fixed string, filter inverted: each turns 1 test red (the labels case); restored.
    - 4 Y109 L1: `SiteLayoutError: PL-E01: range.json is not a regular file; …` (and PL-E02..E06 likewise), 6 reds, reject from validateChallenge. Fixed by the runner helper `readPrimary` (catches SiteLayoutError, returns first line), called first.
    - 5 Y87 absent: `expected 'index.md not found: …' to be 'challenge.yaml not found: …'`.
    - 6 L2 carried 3: `expected 'index.md…'` was gone after row 5; the reds were `expected 'fail' to be 'pass'`, `expected 'analyze could not discover slug door-… ' to contain 'keygen exit 7'`, `… to contain 'wasm-tools validate exit 1'`. Fixed by `discoverForAnalyze(projectRoot, primary, slug)`.
    - 7 Y109 L2: red up to row 6 (`analyze could not discover slug …` instead of the PL line, 6 cells); green with the helper in place (I wrote row 6's change and the shared helper in one step, so this row was a green-first after the helper). Mutations: helper not catching: 12 reds across L1 and L2; L2 not reading P first (fixed 'zh-TW'): 6 reds; restored.
    - 8 Y91: `Error: buildPlayerPackage: index.md not found for slug door-is-open (<tmp>/platform/challenge/door-is-open/index.md)` (12 reds in the file, same cause).
    - 8b blind fixtures: after row 8's production change, before the fixture edit: 9 reds (2 in cleanup, 7 in orchestration), `expected 'inconclusive' to be 'pass'` and the like. Then green after moving INDEX to `platform/zh-TW/challenge/door-is-open/index.md`.
    - 9 Y92: `AssertionError: expected a thrown error to be Error: buildPlayerPackage: brief not found for slug …` (the old message was kept after row 8 so this row had its own red). Fixed by the PP1 text.
    - 10 Y93: green first run (the builder never reads challenge.yaml). Mutations: challenge.yaml appended to description.md: 3 reds; an extra file in player-package/: 2 reds; restored.
    - 11 Y110: green after row 8 (read P is the first line); they were red in the same run before row 8's change (`not instanceof SiteLayoutError`). Mutations: read after mkdir: 7 reds; catch then fall back to zh-TW: 6 reds; brief path fixed to zh-TW: 1 red (the en cell); restored.
  - Row 12: header of challenge-verify.ts updated (L1 line); traceability rows 1742 and 1745 annotated.
  - Commands: baseline `npx vitest run tests/unit/scripts/challenge-verify tests/unit/scripts/wxl-solver/build-player-package.test.ts`: 12 files, 57 passed, 4 failed. Closing `npx vitest run tests/unit/scripts/challenge-verify tests/unit/scripts/wxl-solver/build-player-package.test.ts tests/challenge-validate.test.ts tests/challenge-analyze.test.ts`: 14 files, 269 passed; again with `GITHUB_REPOSITORY=acme/range`: 14 files, 261 passed, 8 skipped (upstream-only cells). No full suite.
  - Status check: `git status --porcelain --ignored` differs from the baseline only by the 7 modified files of this segment (challenge-verify.ts, build-player-package.ts, the L1, L2, blind-orchestration, blind-cleanup and build-player-package tests) plus the ticket and traceability edits; `find platform -newer <stamp>` is empty.
  - Notes: the RANGE_FAULTS tables are copied from challenge-keygen.test.ts (L1/L2 compare the full PL line; the builder test compares `err.code`, as the plan says). The L1 and L2 helper `readPrimary` is in challenge-verify.ts, not exported. Not done: nothing.
  - Deferred to stage 6 (P2, frozen rubric):
    - `tests/unit/scripts/challenge-verify-L1.test.ts:93` (also `challenge-verify-L2.test.ts:138`), P2, confidence medium: every Y109 cell runs with a valid challenge.yaml in place, so a production swap (declaration check before range.json read) would go unnoticed and D123's "range.json read first, before any check" is not pinned against the VF1 check. Production order is correct (`scripts/challenge-verify.ts:288-306`); this is test strength beyond the row's own AC.
    - `tests/unit/scripts/challenge-verify-L1.test.ts:27`, P2, confidence medium: the RANGE_FAULTS/E02 table (PL-E01..E06 builders and messages) is now copied into L1, L2 and build-player-package tests on top of challenge-keygen.test.ts, so five copies must stay in sync when a PL message changes (maintainability only; every row still asserts the exact line or code).
    - `tests/unit/scripts/wxl-solver/build-player-package.test.ts:223`, P2, confidence low: Y93 can only catch a regression, since the builder never reads challenge.yaml, so the row was green on its first run (reason and mutations recorded in row 10); not a plan gap.
  - Full suite (suite step, parallel run only, no re-run): report `/private/tmp/claude-501/scratch5f/report-5f.json`, mtime Nov 17 17:01:59 2026 (epoch 1794906119, written after run start 1794906075), HEAD fa3dda9: 6711 tests, 6599 passed, 0 failed, 112 skipped/pending, 0 todo; 856 suites, 1 failed suite (the collection failure). No flakes.

## Test plan (stage 5)

Approved under the user's standing authorization of 2026-11-15.

Assembled from the six area plans (B, A, L, S, Y, U) at `9da6aff`, against `traceability.md`
revision 2.2 and the claim table in `tickets.md`. Columns follow `docs/agents/workflow.md` stage 5.
"Both P" means the case runs with `P = en` and `P = zh-TW`, set explicitly (an argument, the fixture
tree's own `range.json`, or a `vi.mock` of `primaryLocale()`), never by the client module's fallback
(D31) and never by an environment variable (D21). "Upstream-only" means declared through B93's
D124 helper in `tests/__helpers__/upstreamDecision.ts`. "R19 ×6" means one case per PL-E01–PL-E06
reason. Open items are labelled by area (B-a, L-q1, S-q1, Y-q1) and listed after their area's
table. They are settled at `/tdd` or put to the user. They are not spec decisions.

### Area B (build and routing): rows B14–B16, B18–B52, B56–B70, B72–B77, B79–B87, B90–B95

"Fixture root" is a temporary repository root under `os.tmpdir()`. It holds a minimal new-layout `platform/` (B20's tree), an optional `range.json`, and a copy of `.vitepress/*.ts|mts` with `node_modules` symlinked to the repository's. The copied `config.mts` is imported after `vi.resetModules()`, which is how B14, B16 and B47 observe the configuration without a spy (V-13). V-B1–V-B7 are T-0080's rows; this ticket runs them at stage 8 (see "Stage 8").

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0010-S5 | B14: the shipped `__WXL_PRIMARY_LOCALE__` comes only from the root `range.json` | `tests/unit/site/config-base.test.ts` (new describe) | Real tree: `"zh-TW"` in each of 16 envs (`SITE_BASE` {unset,`/repo/`} × `CF_PAGES` {unset,`1`} × `WXL_SMOKE_PAGES` {unset,`1`} × `WXL_PRIMARY_LOCALE` {unset,`en`}). Fixture root (root `{"primaryLocale":"en"}`, `platform/range.json` and `.vitepress/range.json` = zh-TW): `"en"` in each env. | The real-tree half goes through the helper (D124). The fixture half is unconditional. Each env case restores `process.env`. `WXL_SMOKE_PAGES=1` also changes `__WXL_PAGES__` (area L), which is not asserted here. |
| 0010-S9 (V-B6) | B15: a `range.json` edited under `pnpm docs:dev` takes effect after a restart | stage 8 V-B6, no unit | V-B6's observations on F-6 | Observed by V-B6 on F-6: before the edit TC at `/guide/python` and EN at `/en/guide/python`; after the edit and a reload still TC; after a restart EN at `/guide/python` and TC at `/zh-TW/guide/python`. Surface: Terminal (`pnpm docs:dev`) + Browser panel, F-6 scratch clone. |
| 0010-S5 | B16: the `SITE_BASE` error comes before `range.json` errors | `config-base.test.ts` | Fixture root with a PL-E03 `range.json` (`{`), `SITE_BASE=x`: the import rejects with `/SITE_BASE/` and not `PL-E03`. Control: `SITE_BASE` unset on the same root rejects with `PL-E03`. | Same fixture-root mechanism as B14. `x` is one of the existing refused values. |
| repository (PAT1) | B18: no locale enumeration outside the locale-list module | `tests/unit/i18n/locales.test.ts` (new case) | `spawnSync('git', …)` runs PAT1 command 1 (prints nothing) and command 2 (every line is in `.vitepress/locales.ts`) over tracked files in `.vitepress` and `platform/shared` | Run from the repository root. Command 2 is copied verbatim from PAT1 (shell variables expanded in the test). Command 3 and enumerations written across lines are stage 6's (stage 6 reads command 3's output and the changed files). A non-git checkout is skipped with its reason. |
| 0010-S4 + messages | B19: every listed code has a string table and a locales-config entry | `tests/unit/i18n/messages-shape.test.ts` (iterate `LOCALES`); `tests/unit/site/locales-config.test.ts` (new) | messages-shape reads `messages/<code>.json` for each `LOCALES` code (no literal pair). The basenames of `messages/*.json` equal the set of `LOCALES`. `Object.keys(localesConfig(p)).length === LOCALES.length` for each p. | No messages file for an unlisted code (the set is compared, not a subset). |
| 0010-S2 | B20: a valid new layout passes | `tests/unit/site/source-layout.test.ts` (new `checkSourceLayout` describe) | `checkSourceLayout(root, p)` returns, for both P, on B20's fixture tree, also with `zh-TW/` empty and absent (P=en) and `en/` empty and absent (P=zh-TW) | The fixture tree is exactly the seven files of the "Layout check" preamble |
| 0010-S2 | B21: pages directly in `platform/` | `source-layout.test.ts` | PL-E08 with the canonical first line, then exactly `  "platform/challenges.md"`, `  "platform/index.md"` | Sorted by UTF-16 code unit. Both P. |
| 0010-S2 | B22: pages in an unlisted top folder | `source-layout.test.ts` | Each of `guide/x.md`, `reference/x.md`, `ja/index.md`, `fr/a.md`, `zh-tw/index.md`, `EN/index.md`, `docs/a.md` is in the PL-E08 list | `zh-tw/` and `EN/` each go in a tree of their own with only the other code's primary folder. On a case-insensitive temp dir where they would still collide, the case is skipped with the reason (U55's pattern). |
| 0010-S2 | B23: pages under `platform/challenge/` outside `<slug>/src/` | `source-layout.test.ts` | `challenge/x/index.md`, `challenge/x.md`, `challenge/x/notes.md`, `challenge/x/sub/a.md`, `challenge/src/a.md` are each in the PL-E08 list | `challenge/src/a.md`: `src` is a slug here, not `<slug>/src/` |
| 0010-S2, S3, S5 | B24: `.md` under `challenge/<slug>/src/**` is not a page | `source-layout.test.ts`; `tests/unit/i18n/page-list.test.ts`; `config-base.test.ts` | `checkSourceLayout` returns. `pageListFromDir` omits `src/README.md` and `src/a/b/c.md`. Real config `srcExclude` contains `challenge/*/src/**`. | `srcExclude` is asserted with `arrayContaining`, because D49 adds smoke-fixture entries in a production build |
| 0010-S2, S3, S5 | B25: `public/**` and `shared/**` are not pages | same three files | No error. No page-list entry. `srcExclude` contains `public/**` and `shared/**`. | Same as B24 |
| 0010-S2, S3 | B26: dot-prefixed names, `node_modules/` and `dist/` are ignored at any depth | `source-layout.test.ts`; `page-list.test.ts` | `platform/.draft.md`, `platform/en/.x/a.md`, `platform/node_modules/p/README.md` and `platform/en/dist/old.md` give no error and no entry | Both P |
| 0010-S2 | B27: non-`.md` files and folders that hold no page are allowed | `source-layout.test.ts` | No error for `platform/foo.txt`, `platform/assets/logo.png`, `postcss.config.mjs`, `platform/assets/`, empty `platform/ja/` | An empty `ja/` (no page) is not B22 |
| 0010-S2, S3 | B28: `.MD` and `.Md` are not pages | `source-layout.test.ts`; `page-list.test.ts` | `platform/README.MD` gives no error and no entry | A case-insensitive FS does not matter: the name is compared, not opened |
| 0010-S2 | B29: the primary home page is missing | `source-layout.test.ts` | P=en with `en/` absent: first line `PL-E10: the primary locale en has no home page: "platform/en/index.md" is missing.`. The same shape for zh-TW. Also with the folder present and `index.md` absent. | `index.md` as a directory, or a non-regular file, counts as "not a page" |
| 0010-S2 | B30: a translation home may be missing | `source-layout.test.ts` | P=zh-TW, `en/guide/a.md`, no `en/index.md`: no error | — |
| 0010-S2 | B31: direct entries named like a listed locale | `source-layout.test.ts` | Each of `zh-TW/en/a.md`, `en/zh-TW/`, `zh-TW/zh-TW/a.md`, `en/en.md`, `zh-TW/en.md`, `en/zh-TW.md` is in the PL-E09 list, for every P | `en/zh-TW/` is a folder entry (it may be empty). This is also U150's build clause. |
| 0010-S2 | B32: deeper or unlisted-code entries are allowed | `source-layout.test.ts` | `zh-TW/ja/a.md` and `en/guide/zh-TW/a.md`: no error | — |
| 0010-S2 | B33: symbolic links in the searched area | `source-layout.test.ts` | `platform/en` → folder, `platform/zh-TW/guide/a.md` → file, `platform/challenge/x/notes` → folder: each is in the PL-E07 list, and the walk does not descend into it | Not on Windows (skipped with the reason). "Does not descend" is shown by a PL-E08-worthy page inside the linked folder that does not appear (the code is PL-E07 only). |
| 0010-S2 | B34: links in excluded areas are not checked | `source-layout.test.ts` | Links at `public/x`, `shared/x`, `challenge/x/src/y`: no error | Same platform skip as B33 |
| 0010-S2 | B35: only the first violated rule is reported | `source-layout.test.ts` | Link + old-layout page + missing primary home: PL-E07. After removing the link: PL-E08. After moving the page: PL-E10. | The same tree is mutated in sequence |
| 0010-S2, S3 | B36: a translation-only page is allowed | `source-layout.test.ts`; `page-list.test.ts` | P=en, `zh-TW/guide/only.md`: no error, and the page list holds `/zh-TW/guide/only` | — |
| 0010-S9 | B37: every VitePress command fails on an old layout | stage 8 V-B1 | Observed by V-B1: old layout restored → `docs:build`, `docs:dev` and `docs:preview` exit non-zero, stderr holds the PL-E08 line and the paths, and no other PL line. Surface: Terminal, F-6 copy. | — |
| tools' entries | B38: tools run before VitePress call `checkSourceLayout` first | Unit in each tool's own area: `tests/unit/scripts/challenge-keygen.test.ts` (Y), `tests/unit/site/redirects.test.ts` (S), `tests/challenge-validate.test.ts` (Y). Stage 8 V-B1/V-B5 for the commands. | Each entry function, given an old-layout fixture `srcDir`, throws PL-E08 before discovery (no `[skip]`/`[done]`/`✓`, no file written) | Area B adds no test file for B38. The rows sit in areas S and Y and are listed here so none is missed. "First" means after reading P (D123). |
| 0010-S3 | B39: `rewrittenPath` strips exactly the primary segment | `page-list.test.ts` (new describe) | For both P, every source in "Source path → URL" maps to its column's file form. `rewrittenPath('zh-TW/x.md','en')==='zh-TW/x.md'`, `rewrittenPath('en/x.md','en')==='x.md'`, `rewrittenPath('english/x.md','en')` is unchanged. | Table-driven, 28 sources × 2 P (one parameterised table). The expected values are typed from the spec's table, not computed. |
| 0010-S5 | B40: `rewrites` is the function | `config-base.test.ts` | Real tree: `typeof config.rewrites === 'function'`, and it returns the zh-TW column's file form for every table source | Upstream-only through the helper (D124) |
| 0010-S3 | B41: no duplicate entries | `page-list.test.ts` | For both P, on each fixture tree of B20–B36 that passes, `new Set(list).size === list.length`. The existing duplicate assertion on the shipped list stays. | Only the passing fixtures |
| 0010-S3 | B42: the page list of the full-table fixture | `page-list.test.ts` | `pageListFromDir(root,'en')` equals the en column, sorted. `pageListFromDir(root,'zh-TW')` equals the zh-TW column, sorted. | The fixture holds all 28 sources, including `zh-TW/reference/…` (the fixture is not upstream's tree) |
| 0010-S5 | B43: the shipped `__WXL_PAGES__` equals an independent oracle | `page-list.test.ts` "the page list the site configuration ships" | The oracle does its own walk, reads `range.json` itself (absent or keyless → zh-TW), strips `<P>/` and applies the spelling rule. It equals the shipped list. | Derived from P and the tree (D54), so it runs in a range too. Not upstream-only. |
| 0010-S8 | B44: the published HTML set equals the mapped source set | `tests/site-smoke/missing-translation.spec.ts` "the page list spelling matches the pages VitePress published" | The set equality goes through the same independent mapping (its own P read). `dist/index.html` is the TC home and `dist/en/index.html` the English home. | D124 lists B44. The homes clause goes through the helper. The set clause is derived from P (open item B-b). Smoke-fixture pages under `WXL_SMOKE_PAGES=1` are area L's. |
| 0010-S10 | B45: `classifyArrival` maps `relativePath` to its entry | `tests/unit/i18n/arrival.test.ts` (new cases) | `relativePath:'guide/python.md'` gives entry `/guide/python`, and `'en/guide/python.md'` gives `/en/guide/python`. Each is in the fixture list of the matching P. | The existing case is unchanged (its title too). If area A adds a P argument, the test passes P explicitly (T1's allowance). |
| 0010-S4 | B46: `localeIndex` is `root` on primary pages | `locales-config.test.ts` | `Object.keys(localesConfig(p))` is exactly `['root', …other codes]` for both P | VitePress's `getLocaleForPath` is not in its public types. Its consequence is observed through B59 smoke (`lang`). The test imports `vitepress/dist/client/shared.js` only if the package exports allow it. |
| 0010-S5 | B47: `__WXL_PRIMARY_LOCALE__` is a JSON string | `config-base.test.ts` | Real tree: `"\"zh-TW\""` (helper, D124). Fixture root with `{"primaryLocale":"en"}`: `"\"en\""`. | Shares B14's fixture root |
| 0010-S8 | B48: primary pages at the output root | `tests/site-smoke/site-smoke.spec.ts` (file-system test, as B44) | `dist/guide/python.html` holds the TC Code-panel guide and `dist/en/guide/python.html` the English one; no `dist/zh-TW/` exists | Upstream-only (helper). V-B2 covers P=en. |
| 0010-S9 (V-B6) | B49: the dev server serves the primary page unprefixed | stage 8 V-B6 | Observed by V-B6. Surface: Terminal + Browser panel, F-6. | — |
| 0010-S5 | B50: a primary-folder challenge page is read through `filePath` | `config-base.test.ts` (new describe "transformPageData") | `config.transformPageData({relativePath:'challenge/x/index.md', filePath:'zh-TW/challenge/x/index.md', frontmatter:{layout:'challenge'}}, {siteConfig:{srcDir}})`: `markdownBody` equals the body of that file. The file does not exist at `relativePath`. | Once area Y's assembly (D78) is in `transformPageData`, the fixture `srcDir` also needs `challenge/x/challenge.yaml`, or PL-E13 throws. "Holding only the latter" is read as "no file at the rewritten path" (coordinate with Y46). |
| 0010-S5 | B51: a non-primary challenge page | `config-base.test.ts` | `relativePath === filePath === 'en/challenge/x/index.md'` (P=zh-TW): `markdownBody` equals that file's body | Same declaration note as B50 |
| 0010-S5 | B52: another layout gets no body | `config-base.test.ts` | `layout:'doc'` (and no layout): `frontmatter.markdownBody` stays undefined | A home page also passes through `localizeHomeLinks` (B62+). B52 asserts only `markdownBody`. |
| 0010-S4 | B56: `localesConfig('en')` equals today's literal | `locales-config.test.ts` | Deep-equals the `locales` literal of `.vitepress/config.mts` at `65de8c0`, copied into the test | The literal is typed into the test, not read from git |
| 0010-S4 | B57: `localesConfig('zh-TW')` equals the schema | `locales-config.test.ts` | Deep-equals the JSON in "Schema: locales config" | Copied verbatim, including 挑戰 |
| 0010-S4 | B58: keys and link prefixes | `locales-config.test.ts` | For both P: `root` has no `link`. Every other key k has `link:'/k/'`, and every nav link, sidebar link and sidebar key starts with `/k/`. | Walks every entry (no sampling) |
| 0010-S8 | B59: `<html lang>` follows the page locale | `site-smoke.spec.ts` (dist file read) | `dist/index.html` and `dist/guide/notes.html` have `lang="zh-TW"`. `dist/en/index.html` and `dist/en/guide/notes.html` have `lang="en-US"`. | Upstream-only (helper). V-B2 covers P=en. |
| 0010-S5 + fork:init | B60: title and description stay site-level, and the fork:init anchors stay single | `config-base.test.ts` | `title === "Web eXploitation Laboratory"` and `description` is today's string. `config.mts` has exactly one line matching `A6_CANDIDATE_RE` (imported from `scripts/fork-init.ts`) and exactly one `const siteBase = ` line. | The existing fork:init A6 and 0003 A9 cases in `tests/unit/scripts/fork-init.test.ts` pass with no edit in their A6 and A9 assertions; the shared fixture's home path and the A7 cases (for example "sets A6 and both A7 (%s)…", whose `changedFiles` gains `platform/en/index.md`) change under area U's `PLATFORM_HOME_RELS` row (U113), not under this row |
| 0010-S8, S50 | B61: the nav title links to the page locale's home | `site-smoke.spec.ts`; stage 8 V-B3 and V-B4 | The nav title link on `/en/guide/notes` has `href="/en/"`, and on `/guide/notes` `href="/"` (base `/`) | Base `/<repo>/` is stage 8 only (V-B4) |
| 0010-S7 | B62: an unprefixed link on a primary page is unchanged | `tests/unit/site/home-links.test.ts` (new) | `localizeHomeLinks(fm,'en','en',pages)` keeps `/challenges/` | `pages` is a fixture page list (no disk) |
| 0010-S7 | B63: an unprefixed link on a translation page is prefixed | `home-links.test.ts` | `/challenges/` becomes `/en/challenges/` (en page, P=zh-TW). `/guide/` becomes `/zh-TW/guide/` (zh-TW page, P=en). `/` becomes `/en/`. | Each target is in the fixture `pages` |
| 0010-S7 | B64: external links and anchors are returned as written | `home-links.test.ts` | `https://example.com/`, `mailto:a@b`, `#x` are returned unchanged and unchecked (absent from `pages`) | — |
| 0010-S7 | B65: a relative link is PL-E12 | `home-links.test.ts` | `challenges`, `./guide/`, `../x` throw the exact PL-E12 line with `hero.actions[0].link` and the "is a relative link…" reason | The exact first line from the "Build error codes" table, `<page>` quoted |
| 0010-S7 | B66: an already-prefixed link is PL-E12, a code-like segment is not | `home-links.test.ts` | `/zh-TW/guide/`, `/en/`, `/en` throw "already carries a locale prefix…" for both P × both page locales. `/english/`, `/enroll/`, `/zh-TWx/` pass when `pages` holds those pages in the page's locale, and otherwise throw only "does not name a published page". | Parameterised: 2 P × 2 page locales × 6 links. Whole first segment only (C-11). |
| 0010-S7 | B67: a link that names no page is PL-E12 | `home-links.test.ts` | `/nope/`, `/c/001`, `/challenges/x`, and `/guide/` on a translation home whose `pages` lacks `/<T>/guide/` throw "does not name a published page" with no fall-back. `/challenges/` and `/challenges?x#y` pass. | Matching uses `pathCandidates` (query and hash removed, trailing slash either way) |
| 0010-S7 | B68: a link that is not a string is PL-E12 | `home-links.test.ts` | `null`, `1`, `{}` throw "is not a string" | `<json>` printed by `jsonStringifyEscaped` |
| 0010-S7 | B69: a non-home page is ignored | `home-links.test.ts` | `layout:'doc'` with `hero`/`features` is returned unchanged, with no error | Including invalid links (they are never read) |
| 0010-S7 + S8 | B70: upstream's home pages | `home-links.test.ts` (real files, both P); `site-smoke.spec.ts` | Unit: `platform/en/index.md` and `platform/zh-TW/index.md` frontmatter give the "Home-page links" table for both P. Smoke: `dist/index.html` hero `href="/challenges/"` and `"/guide/"`, `dist/en/index.html` `"/en/challenges/"` and `"/en/guide/"`. | Both halves upstream-only (helper). Unit `pages` is the real page list for each P (`pageListFromDir`). |
| 0010-S6 | B72: a link whose URL names the primary folder is PL-E11 | `tests/unit/site/primary-folder-links.test.ts` (new; `createMarkdownRenderer` from `vitepress` + `md.use(primaryFolderLinks, P)`) | Group 1 throws PL-E11 naming `<page>` and `<href>`: `../../en/reference/x.md` from `zh-TW/guide/notes.md` (P=en), `../../zh-TW/guide/x.md` from `en/guide/a.md` (P=zh-TW), `/en/guide/` (P=en), `/zh-TW` (P=zh-TW). Group 2 throws nothing: `/english/x`, `../../enroll/x.md` (P=en), `/zh-TWx/y` (P=zh-TW). | env is set as VitePress sets it: `relativePath` (rewritten) and `realPath`. `<page>` is the source path, so the absolute cases also run from a primary-folder page, where `relativePath` ≠ source. VitePress's own pass is V-B1. |
| 0010-S6 | B73: a cross-folder link into a non-primary folder passes | `primary-folder-links.test.ts` | `../zh-TW/guide/x.md` from `en/guide/a.md` (P=en): no PL-E11, and the rendered href is `/zh-TW/guide/x` | Rendered with `cleanUrls: true` as the site is |
| 0010-S9 | B74: a link that escapes the locale folder | stage 8 V-B1 | Observed by V-B1: under `en` exit 0 and the href opens the English reference page; under `zh-TW` non-zero with VitePress's dead-link report. Surface: Terminal, F-6 copy (+ Browser panel to open the href). | The upstream file has no such link: the interim plain text (the ticket's AC) |
| 0010-S6 | B75: a site-absolute link that does not name the primary passes | `primary-folder-links.test.ts` | Plugin: `/guide/python` gives no error (both P) | The `git grep -nE '\]\(/' -- 'platform/*.md'` half is a real-tree assertion that is not on D124's list (open item B-c). Proposed as stage 6. |
| doc | B76: raw HTML and component links are not checked | stage 6 | B84's authoring paragraph, in both READMEs | Stage 6 document reading, both languages. Surface: diff reading. |
| 0010-S5 | B77: `ignoreDeadLinks` is unset | `config-base.test.ts` | `config.ignoreDeadLinks === undefined` on the real tree | Not upstream-only (the configuration is the same in a range) |
| content + 0010-S8 | B79: every list and home page imports the one loader | `tests/unit/site/challenge-data-loaders.test.ts` (grep case; coordinate with area L); `site-smoke.spec.ts` | Each of `en/index.md`, `en/challenges.md`, `zh-TW/index.md`, `zh-TW/challenges.md` imports `../shared/challenges.data.ts`, and no file under `platform/` imports `challenges.zh-TW.data.ts`. Smoke: `/en/challenges` renders the four challenges. | Smoke part upstream-only (helper, RV2-17). The grep part is derived from the tree. |
| file | B80: `Layout.vue` is deleted | `tests/unit/i18n/theme-locale-wiring.test.ts` (new case) | `existsSync('.vitepress/theme/Layout.vue')` is false, and `git grep -n "theme/Layout"` over code finds nothing | The literal repo-wide grep matches `.proj.specs/0010…` (spec.en.md, spec.zh-TW.md, traceability.md), and the test's own source would match too. Scope it to code (`.vitepress tests scripts create-wxl .github`), with the needle built without the literal. The build half is CI's `docs:build`. |
| 0010-S8 | B81: upstream's root language | `site-smoke.spec.ts` (new test) | With stored `zh-TW`, `/` shows 開始挑戰. `/en/` with stored `en` shows `Start Challenge`. | Upstream-only (helper). Stored value set per test with `addInitScript`, overriding the config's pinned `en`. |
| 0010-S8 | B82: English assertions go to `/en/…` | `site-smoke.spec.ts` (existing cases) | `goto` paths of English assertions start with `/en/`, and the spec passes. `playwright.site.config.ts`'s pinned-locale comment says why. | Cases: "homepage renders", "reference challenge page mounts", "client-side navigation leaves an extensionless URL in the address bar" (BC13) |
| 0010-S22 | B83: the exploit specs pass unchanged | `tests/challenges/*.spec.ts`, not edited | `pnpm test:challenges` passes | Level L3 (dev server): run at stage 5/CI, no new test |
| doc | B84: the README section "Moving to the locale folders" / 「搬到語系資料夾」 | stage 6 (+ V-U4 at T-0081) | The headings equal PL-E08's text, the eight steps in order, one line per PL code, both languages | Stage 6 document reading, both languages (B84 is also followed at T-0081's V-U4, not run here). The heading 「搬到語系資料夾」 uses 語系資料夾, so B90 drops that term's `_新造詞_` line in the same change (`glossary.test.ts`). |
| doc | B85: changing the primary locale later | stage 6 | Each consequence is true under D2, D13, D28, D58, D60, D86, D87, in both languages | — Stage 6 document reading, both languages. |
| doc | B86: the setup record passage | stage 6 | Read against D2, D13, D114, U143, U145; it names `primaryLocale`, the locale list, the default `zh-TW`, PL-E01–PL-E06 and editing by hand until 0011, the translation home links (D13), that rerunning fork:init keeps both homes (U145, U152), and `--from` without `upstream` (U143) | Must keep the README sentences `create-wxl/test/upstream-config.test.mjs` U5 pins. Stage 6 document reading, both languages. |
| doc | B87: ADR-0008's two dated notes | stage 6 | Both notes exist, the consequence-2 note names the three exceptions, every other line is byte-identical; both notes dated 2026-11-15 | Diff check: `git diff` shows only the two insertions |
| `glossary.test.ts` + doc | B90: the GLOSSARY working-tree edit except U135's two sentences | `tests/unit/site/glossary.test.ts` (no edit, must pass); stage 6 | `pnpm vitest run tests/unit/site/glossary.test.ts` passes on the switch commit, including "does not declare itself new while already in use" | Source text is `git show a2ac5b6:GLOSSARY.md` minus U135's 設定紀錄 and 搬家 sentences. Written with LH3 (area L). Breaks `create-wxl/test/upstream-config.test.mjs` U10, whose change needs an Overridden-contracts row first (cross-area note 3). Blob `b307335` (area U's name for it) is `a2ac5b6:GLOSSARY.md`. `_新造詞_` lines go for the terms the corpus starts to use (語系資料夾, 題目宣告, and 主語系, 語系清單, 舊版面, 搬家, 委託書 where used). No entry says a learner with no preference sees the primary locale. |
| 0010-S2 | B91: `platform` itself a symbolic link | `source-layout.test.ts` | `checkSourceLayout(linkToValidTree, p)` throws PL-E07 with the list `  "platform"` | Not on Windows (skipped with the reason) |
| 0010-S7 | B92: `features[*].link` and fields outside the two | `home-links.test.ts` | On a translation home: `/guide/` is prefixed; `guide` gives PL-E12 relative; `/zh-TW/x` gives PL-E12 prefix; `null` gives PL-E12 not a string, each naming `features[<i>].link`. An entry without `link`: no error. `hero.image.src` and `features[0].icon.src` are returned byte-identical. | Field index `<i>` is the entry's index |
| test helper | B93: D124 rows are upstream-only through one helper | `tests/unit/scripts/upstream-guard.test.ts` (new describe); stage 6; V-B7 | With the decision's inputs stubbed (as U139): the helper returns the skip reason for a range and for a fork, and `undefined` for upstream | Stage 6 `git grep`s that each D124 row uses the helper (B14 real tree, B40, B44 homes, B47 real tree, B48, B59, B70, B79 smoke, B81; Y1, Y22, Y55, L40, L41 in their areas). V-B7 observes the skips on a scratch clone of F-2 |
| 0010-S7 | B94: a protocol-relative link is PL-E12 | `home-links.test.ts` | `//evil.example/` and `//evil.example` in `hero.actions[*].link` and `features[*].link`, 2 P × 2 page locales, throw the protocol-relative reason. `https://example.org/`, `mailto:a@example.org` and `#top` still pass. | Order D141: string → `//` → scheme/`#` → relative → prefix → page |
| layout-error + all PL lines | B95: one quoting function equal to create-wxl's | `tests/unit/site/layout-error.test.ts` (new; no test file exists for `layout-error.ts`); `primary-locale.test.ts` (PL-E06 case) | One table run through `jsonStringifyEscaped` of `.vitepress/layout-error.ts` and of `create-wxl/src/text.mjs` gives equal output. Tab `"\u0009"`, CR `"\u000d"`, LF `"\n"`, ESC `"\u001b"`, `"\ud800"`, DEL `"\u007f"`, `"\u0085"`, `"\u009b[31m"` (one backslash, lowercase hex). `undefined` and a function give `undefined`. PL-E06's first line for `"\u009b[31m"` holds it with one backslash. | "No char < U+0020 or in U+007F–U+009F" is asserted on a control-char input per code: PL-E05/E06 in primary-locale, E07–E10 in source-layout (fixture names with ESC, skipped where the FS refuses), E11 in primary-folder-links, E12 in home-links |

Open items (area B):

- B-a: B14, B16 and B47 need the fixture-root copy of `.vitepress/` with `node_modules` linked. No seam offers a factory that takes a root, and none is added.
- B-b: B44's set clause is derived from P, while D124 lists B44 as upstream-only. The helper is applied to the homes clause only.
- B-c: B75's `git grep` half is a real-tree assertion that is not on D124's list. It is a stage 6 check.
- B-d: B80's literal `git grep` matches the spec files. The test scopes it to code paths and builds the needle without the literal.
- B-e: `upstream-config.test.mjs` U10 has no Overridden-contracts row yet (cross-area note 3).
- B-f: B72's `<page>` must be the source path, while VitePress's `env.relativePath` is the rewritten one. Use `env.realPath`.

### Area A (learner arrival): rows A1–A37, A39, DT01–DT80, SW01–SW16, VA1a–VA1m, VA2a–VA2l, VA3a–VA3e, VA4

The D31 client module is `.vitepress/theme/i18n/primaryLocale.ts`, exporting `primaryLocale()` (a proposal; the spec names only the function). `pageLocaleOf(localeIndex, P)` lives in `.vitepress/theme/i18n/index.ts`. A new module, `tests/__helpers__/localeTables.ts`, transcribes A-§4.1 (80 rows) and A-§4.3 (16 rows) from the spec's literal text, column for column. `X` is instantiated as one challenge (`/challenge/s/`) and one article (`/guide/python`), and "invalid" expands to `fr`, `ja`, `zh-tw`, `''` and unreadable storage. Seams 0010-S10 and 0010-S13 iterate the same rows. Area A ends with this ticket, so every VA row runs in full (T8). A12 and A16 are also reached by V-U1–V-U5, which run at T-0081.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0010-S10 `redirectTargetForStoredLocale(…, P)`, `shouldPersistOnColdLoad(arrival, P)`, `lineLocale(…, P)`; 0010-S13 real Layout | **DT01–DT16, DT41–DT56** (page arrivals PP, TP; one parameterised table each seam): Redirect, Requested→Line and Written columns exactly as A-§4.1 | `tests/unit/i18n/initial-locale-redirect.test.ts` (replaces "redirectTargetForStoredLocale with the page list (spec 0008)" table; pure) and `tests/unit/i18n/not-found-wiring.test.ts` (replaces "the real Layout: the decision table A1–A5, A7, every column"); rows from `tests/__helpers__/localeTables.ts` (new) | AC-11; per row: target `base + '/<T>' + entry + search + hash` or `null`; Layout: exactly one `go(target, { replace: true })` or none, `data-line`/`lang` per Line column after the gate releases, `wxl-locale` per Written | both P; base `/` and `/repo/`; challenge and article; `?q=1#h`; stored none/`en`/`zh-TW`/`fr`/`ja`/`zh-tw`/`''`/unreadable; counterpart listed/unlisted; `setItem` throwing (DT09–16, DT49–56: no throw, no `go`, nothing written) |
| 0010-S10 `notFoundRedirect(location, base, pages, P)`; 0010-S13 real Layout | **DT17–DT40, DT57–DT80** (NT, NP, NU not-found arrivals; one parameterised table each seam): `{ entry, requested }` or `null`; landing line; nothing written | `tests/unit/i18n/arrival.test.ts` ("notFoundRedirect" describe, rewritten) and `tests/unit/i18n/not-found-wiring.test.ts` (new `describe.each(P)` table beside "the real Layout: a not-found arrival"); rows from `localeTables.ts` | AC-11, AC-13; NT → `/X` requested T, line T; NP → `/X` requested P, no line; NU → `/<T>/X` requested P, line P; missing → `null`, not-found page, no line; stored value never changes the outcome; `wxl-locale` unchanged | both P; both bases; challenge and article; query and hash; every stored value of the table |
| 0010-S10 `switcherDecision({ chosen, arrival, location, base, pages, P })`; 0010-S13 `choose` | **SW01–SW16** (one parameterised table each seam): navigate(push)/stay, line at once, write | `tests/unit/i18n/arrival.test.ts` ("switcherDecision", rewritten) and `tests/unit/i18n/not-found-wiring.test.ts` ("the real Layout: a locale switcher choice", run `describe.each(P)` over `localeTables.ts`'s SW rows) | AC-14; `choose` returns `navigate`/`stay` per Decision column; `go(target)` without `replace` for navigate; line per Line column at once; `wxl-locale` = chosen afterwards; SW13–16 never a line | both P; page kinds primary/translation/not-found/failed load; chosen own and other; counterpart listed/unlisted; base `/` and `/repo/` (0008 B3); storage refusing (0008 B6) |
| 0010-S10, 0010-S13 | A1: primary-locale page, no preference: no redirect, no line, nothing written | `initial-locale-redirect.test.ts`, `not-found-wiring.test.ts` (DT01, 02, 07, 08, 41, 42, 47, 48 of the DT table); smoke `tests/site-smoke/missing-translation.spec.ts` (`ZH_ONLY` stored none: no line, L-§4.7) | AC-11; `redirectTargetForStoredLocale` → `null`; no `go`; no `[data-missing-translation]`; `wxl-locale` unchanged after release | each invalid value; both bases; challenge/article; smoke under P=zh-TW only |
| 0010-S10 | A2: stored = P: no redirect, no line, nothing written | DT table (DT03, 04, 45, 46); smoke `missing-translation.spec.ts` (`ZH_ONLY` stored `zh-TW`, L-§4.7) | AC-11; as A1 | both P |
| 0010-S10, 0010-S13 | A3: stored T, counterpart listed: replace to counterpart entry | DT table (DT05, 43); smoke `missing-translation.spec.ts` (cold load `/guide/python?q=1#h` stored `en` → `/en/guide/python?q=1#h`) | AC-11; P=zh-TW: `/repo/en/guide/python?q=1#h`; exactly one `go(target, { replace: true })`; no line after landing; `wxl-locale` unchanged | base `/repo/`; query and hash |
| 0010-S10, 0010-S13 | A4: stored T, counterpart not listed: stay, line in T after gate | DT table (DT06, 44); smoke `missing-translation.spec.ts` (`ZH_ONLY` stored `en`: line `en`) | AC-11; `null`; no `go`; line `lang = T` after gate decides, absent before | gate asking vs answered |
| 0010-S10, 0010-S13 | A5: translation page: no redirect, no line, writes T; `setItem` refusing → no throw, no write, no redirect | DT table (DT09–16, 49–56); `theme-locale-wiring.test.ts` "the real theme: cold-load persistence" under both P; smoke `missing-translation.spec.ts` (`EN_ONLY` stored `zh-TW`: no line, stored becomes `en`; "a cold load of a published /zh-TW/ page stores zh-TW" becomes the `/en/` page storing `en`) | AC-11; `shouldPersistOnColdLoad(arrival, P)` true exactly for page arrivals whose entry's locale is T; `wxl-locale === T` | `setItem` throwing, even with stored P |
| 0010-S13 | A6: redirect and line wait for the session gate; a switcher line does not | `theme-locale-wiring.test.ts` "the real Layout: the shared-machine session gate" and `not-found-wiring.test.ts` gate cases ("waits for the gate on a page…", "on a challenge page whose gate is asking…", "shows the line at once on a challenge page whose gate is still asking (D17)"), each under `describe.each(P)` with stored T | AC-11 | both P; stored T |
| 0010-S10, 0010-S13 | A7: base `/<repo>/`: entries base-less, lookup strips base, targets keep it | every A1–A5 and A14–A17 table above runs under `/` and `/repo/` | AC-11, AC-13 | `/` and `/repo/` |
| 0010-S10 | A8: alias URL identified by its rendered page; target is counterpart's entry | `initial-locale-redirect.test.ts` "with the URL path %s, builds the target from the entry %s" under both P; smoke `missing-translation.spec.ts` "a cold load of an alias goes to the counterpart's list entry, and writes nothing" (stores `en` explicitly) | AC-11; P=zh-TW, stored `en`, entry `/challenges`, URL `/challenges.html` → `/en/challenges`; P=en, stored `zh-TW` → `/zh-TW/challenges`; no preference → `null` for both | `.html`, `/index.html`, trailing slash |
| 0010-S13 | A9: landing after a server redirect or reload classified by the landing page | `not-found-wiring.test.ts` (new cases under both P: cold load at a translation entry writes T; at a primary entry writes nothing; orphan translation brief landing writes T) | AC-11 | primary-coded `/<P>/c/NNN` landing (writes nothing), `/<T>/c/NNN` landing (writes T) |
| — (stage 8) | A10: old unprefixed English URLs under P=zh-TW: no rule of its own | no unit/smoke test (row says none beyond A1/A3); stage 8 VA1k | AC-11 | VA1k on F-1: cold `/guide/python` with none gives zh-TW and no line; with `en` it goes to `/en/guide/python` |
| 0010-S13 | A11: requested locale on later navigations | `not-found-wiring.test.ts` "re-evaluates the line on later navigation with the stored locale (L5)" under both P, plus the no-preference case | AC-12; no preference → later navigation onto a page with missing counterpart shows no line (both P, both page kinds); stored T → line in T on a primary page without T; stored P → line in P on a translation page without P | both P; both page kinds |
| unit suite + terminal | A12: `DEFAULT_VISITING_LOCALE` removed with its doc block | no new test; the existing assertion `expect(DEFAULT_VISITING_LOCALE).toBe('zh-TW')` is deleted (contract row "A visitor with no preference is sent to `zh-TW`"); VA4 grep | AC-12; `git grep -n DEFAULT_VISITING_LOCALE -- .vitepress tests platform` prints nothing; unit suite passes | — |
| 0010-S10 `readStoredLocale` | A13: valid stored value else `null`; never throws; in-memory choice first | `initial-locale-redirect.test.ts` (new describe "readStoredLocale"; existing "rememberChoice" cases keep the in-memory-first part) | AC-12; `null` for `fr`, `ja`, `zh-tw`, `EN`, `''`, unreadable storage; the value for `en` and `zh-TW` | exact match against `LOCALES` (from `.vitepress/locales.ts`) |
| 0010-S10, 0010-S13 | A14: NT, counterpart listed: replace with `/X`, line T | DT17/19/21/23/57/59/61/63 of the not-found table; smoke `missing-translation.spec.ts` "a missing translation falls back…" with `X(ZH_ONLY)` = `/en/smoke-fixtures/traditional-chinese-only`, stored none/`zh-TW`/`en` | AC-13; P=zh-TW: `/en/guide/zh-only` → `{ entry: '/guide/zh-only', requested: 'en' }`; one `go(…, { replace: true })`; landing line `lang = T`; `wxl-locale` unchanged | both P; both bases |
| 0010-S10, 0010-S13 | A15: NP, `/X` listed: replace with `/X`, requested P, no line, nothing written, no cold-load redirect afterwards (D29) | DT25/27/29/31/65/67/69/71; `arrival.test.ts` extra inputs; `not-found-wiring.test.ts` D29 case (stored T, no second `go`); smoke `missing-translation.spec.ts` (new: request `/zh-TW/guide/python` on `vitepress preview` → `/guide/python`, no line) | AC-13; `{ entry: '/X…', requested: P }`; `/<P>` and `/<P>/` → `/`; `/<P>/index.html` → `/`; `/<P>/guide/python.html` → `/guide/python` | both P; both bases; smoke P=zh-TW |
| 0010-S10, 0010-S13 | A16: NU, `/<T>/X` listed: replace with `/<T>/X`, line P | DT33/35/37/39/73/75/77/79; `not-found-wiring.test.ts` landing line | AC-13; `{ entry: '/<T>/X…', requested: P }`; landing line `lang = P` | both P; both bases |
| 0010-S10, 0010-S13 | A17: not-found with no counterpart, and double/malformed prefixes → not-found page | missing rows of the not-found table; `arrival.test.ts` (new `it.each` over `/<P>/<P>/x`, `/<P>/<T>/x`, `/<T>/<T>/x`, `/<T>/<P>/x`, `/<P>foo`); smoke `missing-translation.spec.ts` "a path with no counterpart shows the not-found page, with no line" moved to `/en/no-such-page` | AC-13; `lookupNotFound` → `null` and `notFoundRedirect` → `null`; no `go`, no line, `wxl-locale` unchanged; smoke identifies `.NotFound` | both P |
| 0010-S10 | A18: crafted paths end at not-found without throwing; every redirect target is base + list entry | `arrival.test.ts` (extends the existing `it.each(['/zh-TW/no-such-page', '//evil.example/challenges', …])` to both P and both prefixes) | AC-13; `lookupNotFound` → `null`, no throw, for `/<P>//evil.example/x`, `/<P>/%2F%2Fevil.example`, `/<P>/\evil.example`, `/<P>/%E0%A4%A`, `/<P>/../x` and the same with `/<T>/`; for every redirecting input of A14–A16, A39: target starts with base and its base-less path is a list entry | `URIError` from `decodeURIComponent`; TA1 |
| 0010-S13 | A19: no not-found/failed-load write; failed load left alone; one not-found redirect per arrival; no cold-load redirect after one | `not-found-wiring.test.ts` existing 0008 C5/C8/C9 cases ("writes no preference on the way through…", "does nothing on a failed load…", `arrival.test.ts` "notFoundRedirect: one redirect per arrival") under both P, plus A15's D29 case | AC-13 | both P |
| 0010-S13; smoke | A20: cold load and client navigation alike; Back returns | `not-found-wiring.test.ts` "does the same for a client-side navigation to a missing translation" under both P; smoke `missing-translation.spec.ts` "Back after the fallback returns to the page opened before it" with `X(ZH_ONLY)` after `/challenges`, stored `en` | AC-13 | both entries |
| 0010-S10, 0010-S13; smoke | A21: switcher per SW row | SW table (row 3 above); smoke `missing-translation.spec.ts` "at N wide the switcher stays…" with `ZH_ONLY` choosing English (SW08, SW09) and `EN_ONLY` choosing 繁體中文 (SW11); "a choice in the custom locale switcher on an article is stored, and Back returns (B1)" | AC-14 | widths of the existing loop; P=zh-TW for smoke |
| 0010-S14 `LocaleSwitcher` under provider | A22: title = page locale; options = list minus page locale, plus page locale while line shows; labels from code-keyed table | `tests/unit/i18n/locale-switcher.test.ts` ("LocaleSwitcher UI" title/`aria-label` cases and "LocaleSwitcher with the line showing" under both P × `localeIndex` `'root'` and T's code; new case iterating `LOCALES` that fails for a member without a label key in the code-keyed table or any string table) | AC-14; `[data-locale-current]` text and trigger `aria-label` name the page locale's label; options exactly `[T]` on a primary page, `[P]` on a translation page, gaining the page locale while the line shows | stage 6: a temporary third code (not committed) shows the iteration case fails; output recorded |
| 0010-S10, 0010-S13 | A23: switcher on not-found page / failed load navigates to lookup counterpart or stays; never a line | SW13–SW16 rows; `not-found-wiring.test.ts` "goes to the counterpart from a not-found page the gate is holding, as a push (B7)" and "writes the choice on the not-found page and shows no line (B7)" under both P | AC-14; `switcherDecision` with a not-found arrival returns the A14–A16 target or `stay`; `wxl-locale` = chosen; no line | both P |
| 0010-S13 | A24: storage refusing a switcher write: no throw, kept for the tab | `not-found-wiring.test.ts` "keeps the choice for the tab when storage refuses it, and a later arrival uses it (B6, W6)" under both P; its comment no longer mentions a default visiting locale | AC-14 | both P |
| 0010-S10, 0010-S13 | A25: only a switcher choice and a translation-page cold load write `wxl-locale` | `initial-locale-redirect.test.ts` "shouldPersistOnColdLoad" table under both P; `theme-locale-wiring.test.ts` "the real theme: cold-load persistence" and `not-found-wiring.test.ts` write assertions under both P | AC-15; unchanged after primary cold load, not-found arrival/redirect, failed load, cold-load redirect, link, Back, Forward | both P |
| 0010-S10 `detectLocaleFromPath(path, P)` | A26: T when first segment is T's code terminated by `/` or end, else P | `tests/unit/i18n/route-locale-sync.test.ts` "path %s → locale %s" table under both P | AC-16; `/` → P; `/guide/` → P; `/<T>` → T; `/<T>/` → T; `/<T>/x` → T; `/<T>foo` → P; `/<P>/x` → P; `/zh-tw/x` → P | lowercase code; no separator |
| 0010-S10 `localizePath(path, locale, P)` | A27: strip a leading T segment, add `/<locale>` unless P; never strips P's code; idempotent | `tests/unit/i18n/localize-path.test.ts` (all tables, both P; the `withBase` ordering case both P) | AC-16; P=zh-TW: (`/challenges`, `en`) → `/en/challenges`; (`/en/challenges`, `zh-TW`) → `/challenges`; (`/en`, `zh-TW`) → `/`; (`/`, `en`) → `/en/`; twice = once; P=en: today's cases | inputs starting with `/`; base-less input |
| 0010-S11 `pageLocaleOf`; 0010-S16, 0010-S14 | A28: `'root'` → P; T's code → T; else P; four components use it in SSR and after mount | **new** `tests/unit/i18n/page-locale-of.test.ts` (0010-S11 has no prior art); `tests/unit/components/MergedNav.test.ts`, `ChallengeList.test.ts`, `HomeContent.test.ts`, `tests/unit/i18n/locale-switcher.test.ts` (both P × `localeIndex` `'root'`/T, `renderToString` and `mount`) | AC-16; with `'root'` and P=zh-TW: `MergedNav` list link `/challenges`, zh-TW labels; `ChallengeList` `/zh-TW/c/NNN`; `HomeContent` mark `只有英文`; switcher title the zh-TW label; with `'en'`: `/en/challenges`, `/en/c/NNN`, `Traditional Chinese only`, English label | `localeIndex` of an unknown value → P; PAT2 and the import check at VA4 |
| 0010-S13 | A29: interface locale from `detectLocaleFromPath(location.pathname, P)` at bootstrap and on route change | `tests/unit/i18n/theme-locale-wiring.test.ts` "sets the runtime locale from the URL alone" and "the real Layout: route watcher" cases under both P | AC-16; P=zh-TW: `/guide/` → `zh-TW`, `/en/guide/` → `en` | SSR keeps `createI18n` default `en` |
| 0010-S15 `MissingTranslationLine` | A30: canonical text, link text, `lang`, `href = withBase(localizePath('/challenges', requested, P))` | `tests/unit/components/MissingTranslationLine.test.ts` (existing three cases under both P); smoke `missing-translation.spec.ts` link `href` in the fallback case (smoke builds P=zh-TW, so the line is requested `en` and its href is `/en/challenges`) | AC-17; requested `zh-TW` → `這一頁沒有繁體中文版本，所以顯示英文版。` / `前往繁體中文題目清單`, href `/zh-TW/challenges` (P=en) or `/challenges` (P=zh-TW); requested `en` → `This page has no English version, so it is shown in Traditional Chinese.` / `Go to the English challenge list`, href `/challenges` (P=en) or `/en/challenges` (P=zh-TW); exact equality | base `/repo/` in front |
| 0010-S10 messages shape | A31: two-locale guard, message GD1 | `tests/unit/i18n/messages-shape.test.ts` (new case) | AC-17; passes at two; when `LOCALES.length !== 2` fails with `The line and the mark are two-locale strings (D33), but the locale list has <n> members, not 2; parameterise them in the Japanese (ja) epic.` | stage 6: a temporary third code (not committed) shows it fails; output recorded |
| 0010-S16 | A32: mark strings unchanged under both P | `ChallengeList.test.ts` ("marks a borrowed entry 只有英文…", "marks a Traditional Chinese-only entry in the English list…", "ships the mark of a borrowed entry in the page's locale…") and `HomeContent.test.ts` ("marks the borrowed newest card 只有英文…", "names the other locale on the English home page (E6)") under both P × `localeIndex` `'root'`/T | AC-17; `zh-TW` list marks `en`-borrowed `只有英文`; `en` list marks `zh-TW`-borrowed `Traditional Chinese only` | which list is at root does not change strings |
| 0010-S13 | A33: `cleared` reload = full load of `withBase('/')`; held redirect not run; root follows DT rows | `theme-locale-wiring.test.ts` "does not redirect when the learner chooses to clear" under both P; new cases: cold load of `/` with stored T and `/<T>/` listed redirects there (A3); with no preference stays (A1) | AC-18 | both P |
| stage 6 reading | A34: troubleshooting `missing-translation` "Why" and "Which language the site remembers", both languages | `platform/en/guide/troubleshooting.md`, `platform/zh-TW/guide/troubleshooting.md` (post-move paths) | AC-19; each listed statement present in both languages; no fixed root language, no 「預設」/"assumes" for nothing remembered, no "a link sets the language" (V-7) | stage 6 reading of both pages against A34's expected column and 0010-S10's rules; the path is in U-§5 (A34), so U131 allows the edit |
| stage 6 reading | A35: README short-link passage's preference sentences | `README.md`, `README.en.md` | AC-19; rewritten to A34 rules (D30) | stage 6 reading; keep `sentence-map.test.ts` E1/Z1/E2/Z2 verbatim |
| stage 6 reading | A36: code comments stating locale rules | files in "Overridden contracts › Area A", row "Comments (A36)" | AC-19; none says "English is the root", "`'root'` for English", "the default visiting locale", "stores `zh-TW` for a `/zh-TW/` page"; `git grep -n "the other locale" -- .vitepress` lists only D33-citing comments | stage 6 reading of every comment in "Comments (A36)"; the `git grep` output reviewed |
| stage 6 reading; `tests/unit/site/glossary.test.ts` passes | A37: GLOSSARY 主語系 `_Avoid_`【易混】 line | `GLOSSARY.md` (with B90) | AC-19; no redirect claimed for no-preference learners; does not say they see the primary locale | stage 6 reading; written with B90 |
| 0010-S10, 0010-S13 | A39: NP, `/X` unlisted, `/<T>/X` listed → `/<T>/X`, requested P, line P | `arrival.test.ts` (new cases, both P, both bases, every stored value); `not-found-wiring.test.ts` landing | AC-13; P=zh-TW: `/zh-TW/en-only-article` with only `/en/en-only-article` → `{ entry: '/en/en-only-article', requested: 'zh-TW' }`; `/<P>/<T>/x` still `null`; one `go` with replace, landing line `lang = P`, `wxl-locale` unchanged, no cold-load redirect after | TA1 fall-through stays a list entry |
| 0010-S50 (stage 8) | VA1a: cold `/guide/` none: stays, no line, stored none (A1) | F-1 Cloudflare preview (P=zh-TW, base `/`) | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA1b: cold `/guide/` `en`: `/en/guide/` by replace, Back does not return (A3) | F-1 | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA1c: `/challenge/<zh-only>/` `en`: line `en` after gate, link `/en/challenges`; none: no line (A4, A30, A1) | F-1, Browser panel open | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA1d: cold `/en/guide/` none/`zh-TW`: stays, no line, stored `en` (A5) | F-1 | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA1e: `/zh-TW/guide/python` `en`: server redirect to `/guide/python`, then `/en/guide/python` (A9, D29; needs D60 splat) | F-1 | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA1f: `/zh-TW/guide/python`, `/zh-TW/c/001` none: primary pages, no line, stored none (A9, D30) | F-1 | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA1g: `/en/c/001` none: English page, stored `en` (A9) | F-1 | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA1h: `/en/challenge/<zh-only>/` none: replaced by `/challenge/<zh-only>/`, line `en` (A14) | F-1 | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA1i: `/en/no-such-page`: not-found, no line, stored unchanged (A17) | F-1 | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA1j: gate clear on a new tab: reloads `/` then `/en/` (A33) | F-1, Browser panel open | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA1k: cold `/guide/python` none: zh-TW, no line; `en`: `/en/guide/python` (A10) | F-1 | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA1l: custom switcher only; title zh-TW, one option English; push and Back (SW07); stay with line, page locale offered, removed by choosing it (SW08, SW09, A22) | F-1 at 1280/1024/375, Browser panel open on `<zh-only>` | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA1m: cold `/en/<en-only>` `zh-TW`: stays, no line, stored `en`; choose 繁體中文: line `zh-TW` (A5, SW11) | F-1 | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA2a: `/<repo>/zh-TW/guide/python` none: GitHub 404 then `/<repo>/guide/python`, no line (A15, A7) | F-3 first deploy (P=zh-TW, base `/<repo>/`) | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA2b: same with `en`: stays (D29), stored `en` (A15) | F-3 first | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA2c: `/<repo>/zh-TW/`, `/<repo>/zh-TW` → `/<repo>/` (A15) | F-3 first | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA2d: crafted `//evil.example`, `%2F%2F`: not-found, address stays on origin (A18) | F-3 first | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA2e: cold `/<repo>/guide/` `en` → `/<repo>/en/guide/` (A3, A7) | F-3 first | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA2f: `/<repo>/en/challenge/<zh-only>/` → `/<repo>/challenge/<zh-only>/`, line `en` (A14) | F-3 first | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA2g: `/<repo>/<en-only>` → `/<repo>/en/<en-only>`, line `zh-TW` (A16) | F-3 first | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA2h: `/<repo>/zh-TW/<en-only>` → `/<repo>/en/<en-only>`, line `zh-TW` (A39) | F-3 first | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA2i: cold `/<repo>/guide/` `zh-TW` → `/<repo>/zh-TW/guide/` (A3) | F-3 second deploy (P=en) | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA2j: `/<repo>/en/guide/` → `/<repo>/guide/`, no line (A15) | F-3 second | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA2k: `/<repo>/zh-TW/<en-only>` → `/<repo>/<en-only>`, line `zh-TW` (A14) | F-3 second | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA2l: switcher 繁體中文 on `/<repo>/guide/` `en`: push to `/<repo>/zh-TW/guide/`, stored `zh-TW`, Back (SW) | F-3 second | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA3a: cold `/guide/` none: stays, English, no line (A1) | F-2 Cloudflare preview (P=en) | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA3b: cold `/guide/` `zh-TW` → `/zh-TW/guide/` (A3) | F-2 | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA3c: cold `/zh-TW/guide/` none: stays, stored `zh-TW` (A5) | F-2 | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA3d: `/en/guide/` → `/guide/`, no line (A15 on Cloudflare) | F-2 | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| 0010-S50 (stage 8) | VA3e: `/challenge/en-only/` `zh-TW`: line `zh-TW`, link `/zh-TW/challenges` (A4, A30) | F-2, Browser panel open | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |
| terminal on F-6 (stage 8) | VA4: `git grep -n DEFAULT_VISITING_LOCALE -- .vitepress tests platform`; PAT2; `git grep -L pageLocaleOf --` the four components; `test -e .vitepress/theme/Layout.vue`; `pnpm test`: no output ×3, false, pass (A12, A28, B80) | terminal on F-6 | AC-56 | Pushing F-1/F-2 and creating/deleting F-3 need the user's approval first; a new tab and the stored value are set before each action; not-found is identified by `.NotFound` |

### Area L (lists, loader, smoke fixtures, exploit specs): rows L1–L22, L34–L39, L43, L47

30 claimed rows (L8 has a merge half and a loader half). Default texts are read from the string tables, not from literals (L11, L14, L-§4.4). VL3 and VL5–VL8 are T-0079's rows; this ticket runs them at stage 8. LH1's difficulty-badge clause, LH2, LH3 and LH4 are written here and confirmed at T-0079's stage 6 (row L44); see the area U table.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0010-S17 `mergeLocaleChallenges({briefs, declarations, locales, primary})` | L1: primary list entry for M-a comes from B(P), not borrowed | `tests/unit/site/merge-challenges.test.ts` (existing file, rewritten) | AC-20 / L1: `lists[P]` entry `toEqual` the expected object (L-§4.3 example: `door-is-open`, `知的必要`, `/challenge/door-is-open/`, `locale P`) | both `P`; URL never starts with a base (L22's S17 half) |
| 0010-S17 | L2: translation list entry for M-a from B(T), declaration fields shared | same | AC-20 / L2: `lists[T]` entry `toEqual` expected (`/<T>/challenge/<s>/`, `locale T`); `number`, `difficulty`, `category`, `date`, `tags`, `id` equal `lists[P]`'s | both `P` (T = en → `/en/…`, T = zh-TW → `/zh-TW/…`) |
| 0010-S17 | L3: M-b borrowed into T from the primary brief | same | AC-20 / L3: `locale === P`, `url === '/challenge/<s>/'`, title/description of B(P) | both `P` |
| 0010-S17 | L4: an orphan (M-c) is in no list | same | AC-20 / L4: no entry with slug `<s>` in any list; other challenges' `id`s unchanged by adding the orphan | with and without a declaration (incl. an unreadable one: ignored, L-§4.3 "an unlisted one's read is ignored"); both `P`; three-locale fixture |
| 0010-S17 | L5: declaration only (M-d) is in no list | same | AC-20 / L5 | both `P` |
| 0010-S17 | L7: three-locale fixture | same | AC-20 / L7: for each `P` ∈ {en, zh-TW, ja}, equal slug sequence and `id`s in every list; an entry of a non-primary list lacking the slug has `locale === P` | `locales = ['en','zh-TW','ja']`; `ja` has no string table — fixture gives every brief a string title/description and every declaration a string category so no default is read (open item L-q1) |
| 0010-S17 | L8 (merge half): one key per member of `locales`, in order | same | AC-20 / L8: `Object.keys(lists)` equals `locales`; a locale with no briefs gets every listed challenge borrowed; `P` with no briefs → `[]` | both `P`; three-locale |
| 0010-S17 | L9: order is slug order, `id` = position, independent of input order and `P` | same | AC-20 / L9: `lists[L].map(e => [slugOf(e.url), e.id])` equals the slug-sorted literal for every `L` | input in reverse, shuffled and sorted order × both `P` (one `it.each` table) |
| 0010-S17 | L10: exact, case-sensitive slug compare | same | AC-20 / L10: `door` (P only) listed; no entry for `Door` (T only, an orphan) | UTF-16 order (`D` < `d`) |
| 0010-S17 | L11: `title`/`description` normalisation per list locale | same | AC-20 / L11: L-§4.2 rows; default `challenge_list.default_title` of the *list* locale (read from `en.json` / `zh-TW.json`), description `''` | one fixture per cell: string / non-string (`2048`) / absent × list en and zh-TW; borrowed entry takes the list locale's default |
| 0010-S17 | L12: `number` from the declaration only, never derived | same | AC-20 / L12: `7` → `7`; `'7'`, `'seven'`, absent → `undefined`; `number !== id` unless declared so | one `it.each` table (4 cells) |
| 0010-S17 | L13: `difficulty` | same | AC-20 / L13: `'easy'`, `'insane'`, `3` → `'mystery'`, absent → `'mystery'` | one `it.each` table |
| 0010-S17 | L14: `category`, default per list locale | same | AC-20 / L14: `'web'` in every list; `1` and absent → `lists.en` `General`, `lists['zh-TW']` `綜合` (values read from the tables' `default_category`) | both lists |
| 0010-S17 | L15: `date` | same | AC-20 / L15: `'2026-08-17T16:21:14.557Z'` and `'2026-04-02'` as written; `'not a date'` → `null`; `new Date('2026-04-02T00:00:00.000Z')` → `'2026-04-02T00:00:00.000Z'`; `2026` → `null`; absent → `null` | one `it.each` table (6 cells) |
| 0010-S17 | L16: `tags` | same | AC-20 / L16: `['a',3,null,'b']` → `['a','b']`; `'a'` → `[]`; absent → `[]` | one `it.each` table |
| 0010-S17 | L17: keys on the wrong side are ignored (D37) | same | AC-20 / L17: brief `number: 99`, `difficulty: hard` and declaration `title`, `description`, `id: 42` do not reach the entry | entry's `number`, `difficulty`, `title`, `description`, `id` from L-§4.2 sources only |
| PAT3 + `messages-shape.test.ts` | L18: no default text left in `platform/shared/`; both new keys in both tables | `tests/unit/i18n/messages-shape.test.ts` (existing; one new `it.each` over `challenge_list.default_title`, `challenge_list.default_category` defined in both tables, like its `editor_settings` case) + PAT3 run and recorded | AC-20 / L18: PAT3 prints nothing; messages-shape passes | values unchanged (D42): `Web exploitation challenge`/`General`, `網站攻防挑戰`/`綜合`; PAT3 output (empty) recorded at stage 5 close and stage 6 in the coverage report |
| 0010-S18 loader (`watch`, `load` → `loadChallengeLists(srcDir, files, {locales, primary})`) | L6: a listed challenge with an unreadable declaration fails the loader with Y's text | `tests/unit/site/challenge-data-loaders.test.ts` (existing, rewritten on a temporary tree) | AC-21 / L6: rejects; message starts with `PL-E13: ` (absent) / `PL-E14: ` (`invalid-yaml`, `multi-document`, `not-a-mapping`) and equals the 0010-S32 formatter's text for that path and reason | 4 reasons, one `it.each`; an *unlisted* slug with an unreadable declaration does not throw |
| 0010-S18 | L8 (loader half): key set when a locale folder lacks `challenge/` or does not exist | same | AC-21 / L8: `Object.keys(lists)` equals `locales`; missing folder → borrowed entries / `[]` | temp tree without `platform/en/` and with `platform/en/` but no `challenge/` |
| 0010-S18 | L19: `watch` derived from `LOCALES`, covers `challenge.yaml` | same | AC-21 / L19: exported `watch` equals `['../en/challenge/*/index.md', '../zh-TW/challenge/*/index.md', '../challenge/*/challenge.yaml']` (L-§4.3, list order) | order kept; a `vi.mock` of the locale list module to three codes is optional (L-q2) |
| 0010-S18 | L20: one parser; the declaration's date stays a string | same | AC-21 / L20: declaration `date: 2026-04-02T08:54:17.674Z` → entry `date === '2026-04-02T08:54:17.674Z'` (string, core schema) | a date-like value in a brief never reaches the entry (D37) |
| 0010-S18 loader `watch` (dev server) | L21: editing a declaration or a brief reaches the list on reload, without restarting `pnpm docs:dev` | stage 8 VL7 on F-6 (no unit: needs a live `vitepress dev`); VL7 is T-0079's row, run here | AC-21 / L21: change `difficulty` in `platform/challenge/door-is-open/challenge.yaml` to `hard`, reload `/challenges`: badge `hard`; change the zh-TW brief's `title`, reload: the new title; revert both; `git status --short` empty | Terminal + Browser panel, `pnpm docs:dev` on a scratch clone; stored `zh-TW` |
| 0010-S19 `ChallengeList` / `HomeContent` with prop `lists` | L22: entry URLs base-less; components add the base once | `tests/unit/components/ChallengeList.test.ts` (existing `mockWithBase.prefix`, new case beside N04) and `tests/unit/components/HomeContent.test.ts` (existing; its identity `withBase` mock becomes prefixable, default `''`) | AC-21 / L22: with `withBase` prefixing `/repo`, every list row and grid card `href` and every home latest card `href` equals `/repo` + entry URL | list view and grid view; input from 0010-S17 output for both `P` |
| 0010-S20 `loadConfig` (config default export) | L34: only `'1'` publishes the fixtures | `tests/unit/site/config-base.test.ts` (existing `loadConfig` helper gains a `WXL_SMOKE_PAGES` argument, restored in `afterEach`) | AC-23 / L34: `srcExclude` contains `<code>/smoke-fixtures/**` for every code in `LOCALES` exactly when the value is not `'1'`; `__WXL_PAGES__` contains the two fixture entries exactly when it is `'1'` | one `it.each` over unset, `''`, `'0'`, `'true'`, `' 1'`, `'1 '`, `'01'`, `'1'` (L-§4.5); fixture entries for the real tree's `P` picked from L-§4.5's two literal URL rows (D124: real-tree test derives from `P`); deployed half at VL6: `/en/smoke-fixtures/english-only` on F-1's preview gives the not-found page (`.NotFound`) |
| 0010-S20 `isSmokeFixturePage`, `pageListFromDir` | L35: page list and VitePress agree through one predicate | `tests/unit/i18n/page-list.test.ts` (existing) | AC-23 / L35: fixture tree's page list lacks both fixture entries with the flag off, contains them with it on; `isSmokeFixturePage` true for `<code>/smoke-fixtures/x.md` per listed code, false for `smoke-fixtures/x.md`, `challenge/smoke-fixtures/x.md`, `xx/smoke-fixtures/x.md` | both `P`; nested `en/smoke-fixtures/a/b.md` true (agreement with the `**` glob; derived, L-q3); how the flag reaches `pageListFromDir` (L-q4) |
| 0010-S21 CI workflow | L36 (structural half): production build step runs PAT4; smoke build sets the flag | `tests/unit/workflows/smoke-fixture-switch.test.ts` (new; parses `quality-gates.yml` with `yaml` as `upstream-only-jobs.test.ts` does) — proposed, needs approval since L36's level is "CI; stage 8" (L-q5) | AC-23 / L36: `build` job has a step after `pnpm docs:build` whose `run` is PAT4; `site-smoke`'s build step sets `WXL_SMOKE_PAGES: '1'`; `build`'s does not | job sets unchanged (`upstream-only-jobs.test.ts`, `toolchain-parity.test.ts` keep passing). The behavioural half is CI on the PR + VL6 (CI `build` job on the PR and `main`; VL6 on the ticket branch: `pnpm docs:build` then PAT4 passes, `WXL_SMOKE_PAGES=1 pnpm docs:build` then PAT4 fails; terminal) |
| 0010-S8 `missing-translation.spec.ts` `beforeAll` | L37: both fixtures published on the test build, else fail fast naming the flag | `tests/site-smoke/missing-translation.spec.ts` (existing) | AC-23 / L37: both L-§4.5 URLs for the build's `P` answer 200 and show their h1 (`Smoke fixture: English only`, `測試用頁面：只有繁體中文`); otherwise every test fails with a message naming `WXL_SMOKE_PAGES=1` | URLs from D54's `localePath` helper (area B), not a literal prefix; fail-fast path observed once by hand at stage 5: `pnpm test:smoke` against a production build, message naming `WXL_SMOKE_PAGES=1` recorded |
| 0010-S8 | L38: every L-§4.7 case runs on the fixtures | same | AC-23 / L38: each L-§4.7 row exists and passes on the upstream test build; `git grep -n "attack-log-export-format" -- tests/site-smoke` prints nothing | subjects `EN_ONLY`, `ZH_ONLY`, `X(path)` from `P`; expected outcomes are area A's rows (A14, A20, A21 SW08/SW09/SW11, A4, A1, A5, A2) |
| 0010-S8 | L39: the page-list oracle includes the fixtures on the test build | same (case "the page list spelling matches the pages VitePress published") | AC-23 / L39: passes on the test build | the walk's rewrite mapping is area B's; the fixtures are always in the walk because the suite requires a test build (L-q6) |
| 0010-S22 exploit suite | L43: `BASE_URL` unchanged; opens the primary brief | no test change: `tests/challenges/*.spec.ts`, `exploit-spec.ts.tmpl`, `DEFAULT_BASE_URL_TEMPLATE` keep `http://localhost:5173/challenge/<slug>/` | AC-25 / L43: `pnpm test:challenges` passes on the ticket branch (CI `challenge-verify` + local run); URL/lang assertion once at stage 8 (VL8), not added to specs | upstream `P = zh-TW` brief at `/challenge/<slug>/`; no stored preference in the Playwright context |
| static import graph of `.vitepress/theme/index.ts` | L47: `isSmokeFixturePage` and `smoke-fixtures` literals stay node-only | `tests/unit/theme/client-graph-no-smoke-fixtures.test.ts` (new; fs-based resolver, prior art `source-viewer-runtime-deps.test.ts`) | AC-23 / L47: the graph contains neither the module exporting `isSmokeFixturePage` (`.vitepress/pageList.ts`) nor any file containing `smoke-fixtures` | follows relative static imports in `.ts` and `.vue` `<script>`; `import type` edges are not followed (erased) — matters because components `import type { ChallengeData }` from `platform/shared/challenges.data.ts`, which may import `pageList.ts`; a dynamic `import()` counts as an edge; guard case that the walk reaches >N files |

Open items (area L):

- L-q1: L7's `ja` has no string table, and `mergeLocaleChallenges` takes no tables argument. The three-locale fixture is built so that no default is ever read.
- L-q2: L19 "built from `LOCALES`": assert the literal two-locale list only. A `vi.mock` of `.vitepress/locales.ts` would mock one of our own modules (mocking.md).
- L-q3: nested fixture paths. `srcExclude`'s `<code>/smoke-fixtures/**` excludes them, so `isSmokeFixturePage` returns true for them, which keeps L35's agreement.
- L-q4: how the flag reaches `pageListFromDir`. Proposed: a third options argument (`{ smokePages: boolean }`) passed by the config, so that no other module reads the environment.
- L-q5: L36's unit pin (`smoke-fixture-switch.test.ts`) goes beyond the row's stated level. Drop it if the user prefers CI and VL6 only.
- L-q6: CI sets the flag on the build step only. L39's oracle therefore includes the fixtures unconditionally, and L37's `beforeAll` proves the build is a test build.

### Area S (short links, numbers, the hook): rows S1–S49, S51–S80

"RG" = `tests/unit/site/redirects-generated.test.ts`, "RT" = `tests/unit/site/redirects.test.ts`, "CN" = `tests/unit/scripts/challenge-numbers.test.ts`, "PC" = `tests/pre-commit-sh.test.ts`. PC's fixture is `tests/__helpers__/preCommitRepo.ts`, with variants `en` (`range.json` `{"primaryLocale":"en"}`) and `zh-TW` (no `range.json`). P comes from the temporary tree's own `range.json`, or from the index's `range.json` for `--staged` and for the hook. O1–O4, W3–W6 and VM codes are 0007's and this spec's vocabulary. S50 and V-S1–V-S7 are T-0078's; this ticket runs V-S1–V-S7 at stage 8.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S24 | S1: `P=en`, primary + zh-TW brief included → door-is-open numbered rules | RG, rewritten "writes the schema…" (one `it.each` over S1–S9 cases; each case its own row) | `{from,to,status}` list equals S-§4.2's door-is-open lines: `/c/001`,`/en/c/001`→`/challenge/door-is-open/`; `/zh/c/001`,`/zh-TW/c/001`→`/zh-TW/challenge/door-is-open/`, 302 | declarations in `platform/challenge/<s>/challenge.yaml`; briefs `platform/{en,zh-TW}/challenge/<s>/index.md` |
| S24 | S2: `P=en`, translation missing | RG, same table | all four → `/challenge/v05-php-check/` (S-§4.2 v05) | number 5 padded `005` |
| S24 | S3: `P=en`, zh-TW on disk but `includeSlug` excludes `zh-TW` | RG, rewritten "re-points, not removes…" | equals S2's list; rule count equal to S1's (re-pointed, not removed) | `includeSlug(slug, tree)` with tree `'zh-TW'` |
| S24 | S4: `P=zh-TW`, en included | RG, **new case** in the table | S-§4.1: `/c/001`→`/challenge/door-is-open/`, `/en/c/001`→`/en/challenge/door-is-open/`, `/zh/c/001`,`/zh-TW/c/001`→`/challenge/door-is-open/` | no `range.json` |
| S24 | S5: `P=zh-TW`, en missing | RG, table | all four `/challenge/v05-php-check/` | zh-TW-only primary brief |
| S24 | S6: `P=zh-TW`, en on disk, excluded | RG, table | equals S5; count unchanged from S4 | `includeSlug` excludes `en` |
| S24 | S7: `P=en`, orphan zh-TW brief only (number 7) | RG, rewritten "gives a challenge with only a Traditional Chinese brief…" | all four → `/zh-TW/challenge/chinese-only/`; `/en/c/007` and `/c/007` exist (S-§4.3, 0008 G9 inverted) | `--no-verify`-reachable tree |
| S24 | S8: `P=zh-TW`, orphan en brief only | RG, table | all four → `/en/challenge/english-only/` (S-§4.3) | number 7 |
| S24 | S9: no brief included, declaration included | RG, rewritten "groups whatever set…" | no rule ends `/c/<padded>`; generation succeeds | both P |
| S24, S1 | S10: absent `range.json` and `{"upstream":{…}}` without `primaryLocale` | RG, **new case** | output byte-identical (`toBe`) to the output with `{"primaryLocale":"zh-TW"}` | two variants |
| S24, S1 | S11: each R19 reason throws its PL line; nothing written | RG, **new case** `it.each` | `generateRedirects` throws, first line = PL-E01 (directory; symlink), PL-E03 (`{`), PL-E04 (`[]`), PL-E05 (`{"primaryLocale":1}`), PL-E06 (`{"primaryLocale":"fr"}`) literal; `writeRedirects` leaves no file / an existing file byte-unchanged | PL-E02 not reachable in full mode on a fixture (S-§4.6 list) |
| S24 | S12: order by number then form, both P | RG, rewritten "orders by number, not by slug…" | `aaa`=10, `zzz`=2: 002's four then 010's four in `/c/`,`/en/c/`,`/zh/c/`,`/zh-TW/c/` order, both P | slug order opposite of number order |
| S24 | S13: determinism, both P | RG, "gives the same bytes…" (helper change) | two trees, same content, different creation order → identical strings | both P |
| S24 | S14: padding, both P | RG, "pads to three digits…" + "does not emit the unpadded spelling…" | 7 → `<form>007`, 1234 → `<form>1234` in all four forms; no `<form>7`, `<form>1` | 3 vs ≥4 digits |
| S24, S27 | S15: declaration faults refused naming the file | RG, rewritten "refuses a challenge with no number…" → `it.each` | throws; message contains slug and `platform/challenge/<slug>/challenge.yaml`; no file written | no `number`; malformed YAML; `"007"`; `0`; `1.5` |
| S24, S27 | S16: duplicate number | RG "refuses two challenges sharing a number" | throws; message contains both slugs (`number-unique`) | — |
| S27 | S17: a brief's `number: 9` beside declaration `number: 4` | RG + CN, **new case** | rules use `004`; `checkChallengeNumbers` has no failed result and no result labelled `number-locales` | brief number ignored (D62) |
| S24 | S18: brief included, declaration absent (full mode) | RG, **new case** | throws; message names `platform/<L>/challenge/<slug>/index.md` and missing `platform/challenge/<slug>/challenge.yaml` | `<L>` = each listed locale, both P |
| S27 | S19: `collectChallengeNumbers` reads declarations only | CN, **new case** | tree with 2 declarations, 3 briefs, 1 old-layout `platform/challenge/x/index.md` → exactly 2 entries, `path` = the declaration file | old-layout page not an entry |
| S27 | S20: `nextChallengeNumber` table | CN, rewritten `nextChallengeNumber` describe → `it.each` | empty→1; live 1,5→6; retired yaml 9→10; retired legacy `index.md` 12→13; one folder with yaml 3 + legacy 14→15; a brief's number 50 not counted | each case its own temporary tree |
| S24, S25 | S21: unlisted locale folder `platform/fr/challenge/x/index.md` | RG (generator) + RT (`briefFaults`), **new cases** | output equals the output without that folder, for both | both P |
| S27 | S75: `number` bounds | CN `isChallengeNumber` `it.each`, RG one case | true for `1`,`999`,`1000`,`Number.MAX_SAFE_INTEGER`; false for `0`,`-1`,`1.5`,`"1"`,`1e21`,`2**53`; rule `/c/9007199254740991` matches S30's regex; `number: 1e21` → number fault naming the file, never a rule spelled `1e+21` | safe-integer edge; YAML exponent spelling |
| S24 | S22: slug rules, `P=en` | RG, rewritten "ends with the four parameterised rules (G4)" | the four rules after the last numbered rule = `/c/:slug`,`/en/c/:slug`→`/challenge/:slug/`; `/zh/c/:slug`,`/zh-TW/c/:slug`→`/zh-TW/challenge/:slug/` | — |
| S24 | S23: slug rules, `P=zh-TW` | RG, **new case** | equals S-§4.1 slug section (`/en/c/:slug`→`/en/challenge/:slug/`, others →`/challenge/:slug/`) | — |
| S24 | S24: old-address rule | RG, **new case** | `P=zh-TW`: last rule `{from:'/zh-TW/*',to:'/:splat',status:302}`, appears once; `P=en`: no rule contains `*` | — |
| S24 | S25: static before dynamic, both P | RG "places every numeric rule before…" | index of last numbered rule < index of first rule containing `:` or `*` | old-address rule included |
| S24 | S26: header capacity K1–K3 | RG, rewritten "states the 500-challenge limit…" + **new** injected-form case | joined header (strip `# `, join by space) contains K1 and K2 (`en`) / K3 (`zh-TW`) verbatim; matches `/500 numbered challenges/`, `/2,000 static/`, not `/2100/`; injected 5-form list states `400` | F=4, N=500; F=5 |
| S24 | S27: section comments K4, K5 | RG, **new case** | joined section text contains K4 with `{P-name}` filled (`English` / `Traditional Chinese`) plus the unchanged "These come first on purpose…" paragraph; K5 present iff `P=zh-TW`, directly above the old-address rule | — |
| S24 | S28: committed `_redirects` byte-identical to generation over the index with the index's `range.json` | RG "the committed _redirects › is byte-identical…" | `readFileSync('platform/public/_redirects')` `toBe` `generateRedirects(REPO_ROOT, { includeSlug: (slug, tree) => indexSlugs(REPO_ROOT).get(tree)?.has(slug) ?? false })` with `P` from `git show :range.json` (absent → zh-TW); on upstream the S-§4.1 file | real repository index; see open item S-q1 |
| S24 | S29: committed rules per challenge | RT, rewritten "gives every challenge in git's index its four rules…" | per slug of the index's declaration tree, rules ending `/c/<padded>` equal the D58 list computed from index trees and `P`; numbered-rule count = 4 × slugs with an included brief | numbers read from `challenge.yaml` |
| S24 | S30: rule shapes | RT, rewritten "admits no rule that is neither…" + "pairs every placeholder…" | every rule is numbered (PAT5 regex), one of the P-specific slug rules, or the old-address rule (exact value); `*` pairs with `:splat` | — |
| S24 | S31: shadowing | RT, rewritten `shadows` + "does not hide one rule…" | `/zh-TW/*` shadows any later source starting `/zh-TW/`; no pair reported on the committed file or on either generated schema (S-§4.1, S-§4.2) | splat after every `/zh-TW/c/` rule |
| S3, S24 | S32: target resolution through the page-path mapping | RT, rewritten "resolves every parameterised target prefix…" and "resolves every literal target…" | `targetDirectoryFaults` (on the mapping) `[]` on the repository; primary `platform/<P>/challenge/` must exist with ≥1 slug dir holding `index.md`; a dir without `index.md` is ignored (D127); old-address rule not a directory target | `targetDir`'s `platform/<prefix>` assumption removed |
| S25 | S33: no brief faults on the repository | RT, rewritten "backs every translated slug with a root-locale challenge" | `briefFaults(<index trees of REPO_ROOT>, P)` `toEqual([])` | see open item S-q2 |
| S24 | S34: other ranges × P through `targetDirectoryFaults` | RT, rewritten "_redirects target checks on other ranges" describe | `P=en`: no / empty `platform/zh-TW/challenge/` → `[]`; no `platform/en/challenge/` → 2 faults (`/c/:slug`, `/en/c/:slug`). `P=zh-TW`: no / empty `platform/en/challenge/` → `[]`; no `platform/zh-TW/challenge/` → 3 faults (`/c/:slug`,`/zh/c/:slug`,`/zh-TW/c/:slug`) | fault count and each fault's source |
| S25 | S35: `briefFaults` kinds × P | RT, **new describe** replacing "refuses a translated slug… (G6)" | (i) translation, no primary → 1 `missing-primary`; (ii) declaration only → 1 `missing-primary` (present = declaration); (iii) brief, no declaration → 1 `missing-declaration` per brief; (iv) translation only, no declaration → 2 (one each); (v) `platform/challenge/s/index.md` or `platform/challenge/s.md` → 1 `old-layout` per path; (vi) none; plus S-§4.7's example verbatim with `toEqual` (order: slug, W6a/W6b/W6c/W6d kind, `present`, UTF-16) | both P; slug dir without `index.md` gives no brief (D127) |
| S29 | S36: trigger set | PC, rewritten H06 describe + **new cases** | `platform/zh-TW/challenge/door/index.md`, `platform/en/challenge/door/index.md`, `range.json`, a `platform/challenge/` path each end in 0007 O2 or O4, never O1; `README.md` or `platform/public/other.txt` only → O1 (H06 kept) | both fixtures |
| S29 | S37: validation scope | PC, **new cases** with the recording validator | staging `platform/en/challenge/door/index.md` records that path in argv; staging only `platform/challenge/door/src/` records only that path | ACMRD filter kept |
| S29 | S38: new challenge, both P | PC, rewritten H01 | O2; staged `_redirects` equals oracle; new rule lines equal the literal D58 list for that P; no W3 | `en` literals as today; `zh-TW` per S-§4.1 shape |
| S29 | S39: add / delete a translation brief, both P | PC, rewritten H02/H14 and H40 + `zh-TW` twins | `P=en`: adding `platform/zh-TW/challenge/test-chall/index.md` turns `/zh/c/001`,`/zh-TW/c/001` to `/zh-TW/challenge/test-chall/`; deleting door's zh-TW brief turns them back. `P=zh-TW`: adding `platform/en/challenge/<slug>/index.md` turns only `/en/c/NNN` to `/en/challenge/<slug>/`; deleting reverts; rule count equal in all four | — |
| S29 | S40: untracked / ignored translation brief | PC, rewritten "0008 G3…" and H20, both P | O2; that locale's rules at the primary page; ignored dir not named by W4 | `.gitignore` `logs/`,`tmp/` |
| S29 | S41: staged `range.json` `en`→`zh-TW` after test-chall gains a committed zh-TW brief | PC, **new case** (`en` fixture) | O2; staged `_redirects` equals oracle with the index's `range.json`; ends with the old-address rule | — |
| S29 | S42: unstaged `range.json` edit only, with a staged challenge change | PC, **new case** | O2; staged file is the `P=en` shape; working-tree `range.json` keeps its bytes | index says `en`, working tree `zh-TW` |
| S29, S1 | S43: staged `range.json` failures, no challenge path staged | PC, **new case** `it.each` | O4 with W5: exit 1; stderr holds the PL-E01–PL-E06 first line per reason (PL-E01 for mode 120000 link and 160000 gitlink; `PL-E02: range.json could not be read (unknown).` for a stubbed failing `git show :range.json`); nothing changed, `_redirects` included | each R19 reason + D114 index-only entries |
| S29, S25 | S44: brief faults the index already holds, both P | PC, rewritten orphan describe (H17, H21, H22, H41, H17-commit, H21-commit-a) + `expectW6` | each fault committed `--no-verify`, then an unrelated `src/` change: declaration moved to `.archive/` (W6c ×2); primary brief deleted (W6a door); primary brief folder → `gate` (W6a door, W6c gate); translation folder → `gate` (W6a + W6c gate); test-chall's primary brief deleted (W6b); old-layout `platform/challenge/x/index.md` added (W6d); exit 1; each W6 line verbatim (S-§4.5); W6r once; nothing changed; generator stdout empty; no W5 text | primary brief path follows P |
| S29, S25 | S45: brief check reads the index only | PC, rewritten K-17, K-17 boundary, D12-HEAD, "no English index slug at all" | outcomes as today (O4 / W6 lines) on the new layout, both P | on-disk part not in the index backs nothing; ignored dirs neither back nor fault |
| S29 | S46: retiring / un-retiring, both P | PC, rewritten H39, H39 boundary, H23 | O2; slug's rules absent / present per oracle; `nextChallengeNumber` on the result never returns the retired number | retiring = move declaration folder to `.archive/challenge/<slug>/` + delete every brief |
| S29, S28 | S47: W4a / W4b wording | PC, rewritten H10, H10-Traditional-Chinese-tree, `w4LeftOut`, `w4EnglishPage` + `zh-TW` twin | with W3 forced: untracked `platform/challenge/draft/` and `platform/<P>/challenge/draft/` → W4a; untracked translation dir → W4b (`P=en`: today's sentence; `P=zh-TW`,`L=en`: `…its challenge's English short links open the Traditional Chinese page, if there is one.`); ignored dirs never named; no W3 → no W4 | produced by `--describe-untracked` |
| S29 | S48: brief carrying `number` (H13 replaced) | PC, H13 rewritten | O3 with the validator's status, nothing changed; stderr does not contain `carries different numbers across locale trees` | R26 refusal |
| S29 | S49: every other hook case unchanged | PC, every remaining case on the rebuilt `en` fixture | passes with only path literals changed per "Overridden contracts"; H45 (bash 3.2) also runs S44's first case | stash, restore, signals, commit forms, first commit, pathspec vars, B2 |
| S24, S28, S29 | S51: T-0059 slug grammar and number shadowing | RG (full mode), PC (`--staged` via the hook), both P, **new cases** | a slug outside `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` in the declaration tree or any listed brief tree, and an all-digit slug equal to another challenge's padded number, stop generation with a message naming it (full: `generateRedirects` throws, no file; hook: fault committed `--no-verify`, then unrelated change → exit 1 like a number clash, O4/W5); a slug equal to its own padded number generates | `A B`, `a_b`, `-a`, `a-`, name with `\n`; `005` vs number 5 held by another; `005` holding 5 itself; `1234` |
| S29 | S73: brief faults the commit itself stages (real validator) | PC, **new cases**, both P | staging only deletion of door's primary brief → exit 1, VM10 naming `platform/<P>/challenge/door/index.md`; translation brief of a slug without `challenge.yaml` → VM1; `platform/challenge/door/index.md` beside door's `challenge.yaml` → VM13; nothing changed; no W6 line | validation before generator (D121) |
| S29 | S74: `range.json` `en`→`zh-TW` while test-chall has no zh-TW brief | PC, **new case** (`en` fixture as built) | O4: exit 1; W6a naming `platform/en/challenge/test-chall/` and missing `platform/zh-TW/challenge/test-chall/index.md`, W6r once; nothing changed | — |
| S29 | S76: index vs working-tree `range.json` with a staged challenge change | PC, **new cases** (a), (b), (c) | (a) O2, no VM10, staged `_redirects` `P=en` shape; (b) O3, exit 1, VM10 naming `platform/zh-TW/challenge/<slug>/index.md`, no W6, nothing changed; (c) O3, exit 1, the reason's PL line, no W5, nothing changed; working-tree `range.json` keeps its bytes in each | (c) every R19 reason + index-only entries |
| S29 | S77: `{"primaryLocale":"en"}` added and staged on `zh-TW` fixture while a challenge has only its zh-TW brief | PC, **new case** | O4: exit 1; W6a naming `platform/zh-TW/challenge/<slug>/` and missing `platform/en/challenge/<slug>/index.md`; W6r once; nothing changed | S74's mirror |
| S29 | S78: staged deletion of `range.json` on `en` fixture | PC, **new cases** (a), (b) | (a) after both briefs exist: O2, staged file = oracle for `P=zh-TW`, ends with old-address rule; (b) test-chall without zh-TW brief: O4, W6a naming test-chall, W6r once, nothing changed | — |
| S29 | S79: `upstream`-only change of `range.json` | PC, **new cases** (`primaryLocale` `en` present; absent) | exit 0; `git diff --cached -- platform/public/_redirects` empty; the commit holds the `range.json` change | triggers but re-targets nothing |
| S29 | S80: non-listed challenge paths | PC, **new cases** | staged only `platform/public/challenge/x/notes.txt`, `platform/shared/challenge/x.ts`, `platform/ja/challenge/s/index.md`, `platform/constructor/challenge/s/index.md`, `platform/__proto__/challenge/s/index.md` → O1 (exit 0, no regeneration, recording validator not called); untracked `platform/ja/challenge/s/` with W3 forced by a listed path → no W4 line naming it, no W4b line holding `undefined` or function text | prototype-key names |
| S26 | S52: `challengePagePath` table | `tests/unit/challenge/shortLink.test.ts`, **new describe** | `('s','en','en')`→`/challenge/s/`; `('s','zh-TW','en')`→`/zh-TW/challenge/s/`; `('s','zh-TW','zh-TW')`→`/challenge/s/`; `('s','en','zh-TW')`→`/en/challenge/s/`; `(':slug', L, P)` keeps `:slug`; plus a check that `scripts/generate-redirects.ts` imports it (see open item S-q4) | four (L,P) pairs |
| S30 | S53: short mode × list × entry, both P | `tests/unit/components/ChallengeList.test.ts`, rewritten E3 case + **new cases** (SSR `renderToString` and `mount`) | `en` list and `zh-TW` list, on `P=en` and `P=zh-TW`, one translated + one borrowed entry: one control each, copied URL `<origin>/<list locale>/c/NNN`; `hasCopyControl` true for every numbered entry; unnumbered entry has none (0008 E10) | `primaryLocale` via `vi.mock`; borrowed = untranslated in that list |
| S30, S26 | S54: page mode × entry, both P | ChallengeList.test.ts (page-mode cases, N04) + ShortLinkShare.test.ts page-mode `it.each` | `P=zh-TW`: zh-TW entry in `en` list → `<origin>/challenge/<slug>/`; en entry → `<origin>/en/challenge/<slug>/`. `P=en`: as 0008 F4–F6 (today's literals). Displayed = URL without scheme | non-root base (N04) |
| S30 | S55: nav control, both P | `tests/unit/components/MergedNav.test.ts`, **new cases** beside "MergedNav copy controls" / N04 | `P=zh-TW`: `/challenge/door-is-open/` gives `/zh-TW/c/001` (short) or `<origin>/challenge/door-is-open/` (page); `/en/challenge/door-is-open/` gives `/en/c/001` or `<origin>/en/challenge/door-is-open/` | page locale via `pageLocaleOf(localeIndex, P)` |
| S8 | S56: built upstream site, page mode | `tests/site-smoke/site-smoke.spec.ts` (`expectedUrlFor` rewritten on `challengePagePath`) | on the `P=zh-TW` smoke build (no `CF_PAGES`), `/challenges` and `/en/challenges` each show one page-mode control per numbered challenge | short mode is not built here (`__WXL_SHORT_LINKS__`), see S53 and V-S5 |
| S50 (stage 8) | S57: stage 8: eight `curl -sI` first hops (four forms × {001, fixture 999}), 302 + `Location` per S-§4.1 | terminal against F-1 Cloudflare Pages preview (`stage8/T-0077`, `P=zh-TW`) | AC-58 (matrix row) | — |
| S50 (stage 8) | S58: stage 8: `curl -sI` first hop; final URL and the line in the Browser panel (challenge pages with it open) | F-1 preview: terminal + Browser panel | AC-58 (matrix row) | — |
| S50 (stage 8) | S59: stage 8: `/zh-TW/c/001`, `/zh-TW/c/door-is-open` give `Location: /challenge/door-is-open/`; a splat target is **recorded**, not a failure (D60) | F-1 preview, terminal | AC-58 (matrix row) | — |
| S50 (stage 8) | S60: stage 8: old addresses → 302 as listed; `/zh-TW`, query string, double prefixes (D138), `/zh-TW/stage8.txt` recorded, not judged | F-1 preview, terminal | AC-58 (matrix row) | — |
| S50 (stage 8) | S61: stage 8 **gate** (D118): every crafted path, `--path-as-is`, `node -e` origin check; any off-origin `Location` stops the ticket for the user's choice | F-1 preview, terminal | AC-58 (matrix row) | stage 8 gate (D118) |
| S50 (stage 8) | S62: stage 8: eight first hops per S-§4.2; `/zh-TW/challenges` 200; `/en/challenges` not a redirect | F-2 preview (`stage8/T-0077-en`, `P=en`), terminal | AC-58 (matrix row) | — |
| S50 (stage 8) | S63: stage 8: `/en/challenges` control for 999 reads `wxl.browserlab.online/en/c/999`; target checked by `curl -sI <preview>/en/c/999` then Browser panel, never the copied URL; page-mode URLs on F-3 per S54 | F-1 preview Browser panel + terminal; F-3 temporary GitHub Pages range Browser panel | AC-58 (matrix row) | — |
| S43 (stage 6) | S64–S68: comments of the generator, numbers, hook, shortLink, `redirects.test.ts` header | `scripts/generate-redirects.ts`, `scripts/challenge-numbers.ts`, `scripts/pre-commit.sh`, `.vitepress/challenge/shortLink.ts`, `ChallengeList.vue`, `tests/unit/.../redirects.test.ts`; RT header comment-only | each cites its D-number; none of the banned phrases outside a labelled `P = …` instance; no `English tree`, `root tree`, `root-locale`, `English page first` or fixed locale except a labelled instance (V-7) | Comment-only diffs in a test file: header text, no assertion change |
| S43 (stage 6) | S69, S70: README short-link and "Committing challenges" passages | READMEs | S69/S70 lists, both languages the same (per `docs/agents/language.md`) | E2/Z2 (copy button) and E1/Z1 stay verbatim (`sentence-map.test.ts`); changing them would need an Overridden-contracts row |
| S43 (stage 6) | S71: GLOSSARY short link entry | `GLOSSARY.md` | no contradiction with D30, D58, D71; the D58 third-fallback clause | Overlaps B90's 短連結 line; B90's text from `a2ac5b6` does not yet carry S71's every-locale and D30 sentences, so stage 6 checks them on top of it |
| S43 (stage 6) | S72: `_redirects` sentences | `docs/agents/challenge-pipeline.md`, wxl-create and wxl-fork-init skills, both trees (`.claude/` and `.agents/`) | every `_redirects` sentence true; brief paths `platform/<locale>/…` | E1/Z1 stay verbatim; `sentence-map.test.ts` passes |

Open items (area S):

- S-q1: S28 needs P from `git show :range.json`, but `generateRedirects(root, { includeSlug })` cannot take it, because full mode reads the working tree's file (D67). Two ways: a `primary` option (a seam change, which needs approval), or the test materialises the index, as the hook oracle does with `checkout-index`.
- S-q2: S33 uses `briefFaults(indexTrees(<git ls-files -z>), P)`. `indexTrees` appears in S-§4.7 but not in seam 0010-S25.
- S-q3: RT's "gives challenge 001, door-is-open, the four rules the spec writes out" pins upstream's content and changes under `P = zh-TW`. Neither "Overridden contracts" nor D124's list names it; it needs a row or the helper.
- S-q4: S52's check that the generator imports `challengePagePath` is a structural check on source. Implement it as a static import assertion, or move it to stage 6 reading.
- S-q5: S51 has no canonical refusal text (only "a message naming it"). How a name with a control character is printed is not fixed (TB-S4 says it is printed as it is).
- S-q6: D126's trigger set needs the locale list from Node, but 0010-S28 lists no CLI mode for it. It may stay an internal mode, observed through the hook (0010-S29); say so at stage 6.
- S-q7: the area S contract rows that rest on 0007's and 0008's traceability vocabulary: are they overridden by reference only, or edited in those files? Not stated.

### Area Y (the challenge declaration): rows Y1–Y6, Y9, Y12–Y14, Y19–Y101, Y103–Y113, V-Y1–V-Y8

"Temp copy" means the CLI runs on a temporary copy of `platform/`, `.vitepress/` and `scripts/` (plus a `node_modules` link), because the tool derives its root from its own folder (Y-q2). Area Y ends with this ticket, so V-Y1–V-Y8 run in full (T8). Inside the area the order is: the `config.ts` validators, the `declaration.ts` result shape, `validateChallenge`, assembly, keygen (Y-O5 measured first, with the D133 stop), retype and analyze, create, then verify, lint-staged and the L4 package, and the documents last.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0010-S32, 0010-S34 | Y1: upstream's four declarations read to Y-§2.4 and validate on the real tree | `tests/unit/challenge/declaration.test.ts` (read half), `tests/challenge-validate.test.ts` (validate half); both upstream-only | `readChallengeDeclaration(root, slug)` → `ok: true`, value deep-equal to the Y-§2.4 literal for `door-is-open`, `staff-only`, `just-a-preview`, `selected-excerpts`; `validateChallenge(root, slug).allPassed === true` each | expected values are the Y-§2.4 YAML literals typed in the test (not re-read from disk); skip with the reason in a range or fork |
| 0010-S34, 0010-S32 | Y2: challenge directory with `src/` and no `challenge.yaml` | `challenge-validate.test.ts`, `declaration.test.ts` | validate: one failed `declaration` check, message VM1 `platform/challenge/<slug>/challenge.yaml not found`, no other check in `checks`; read: `{ ok: false, reason: 'absent', path }` | P both |
| 0010-S32, 0010-S34 | Y3: 0-byte file; comments-only file | same two files | `reason: 'not-a-mapping'`; validate `declaration` VM2 `challenge.yaml is not a YAML mapping` | both inputs as separate cases |
| 0010-S32, 0010-S34 | Y4: `backend: [flask` | same | `reason: 'invalid-yaml'`; message starts `invalid YAML in challenge.yaml: ` (parser text not pinned) | prefix-only match |
| 0010-S32, 0010-S34 | Y5: two documents | same | `reason: 'multi-document'`; VM4 `challenge.yaml holds more than one YAML document` | leading `---` alone stays accepted (T-0076's Y7 unchanged) |
| 0010-S32, 0010-S34 | Y6: root a sequence, a string, a number, `null` | same (`it.each`, 4 inputs) | `reason: 'not-a-mapping'` each; VM2 each | four roots |
| 0010-S31, 0010-S34 | Y9: `backend` absent / `null` | `tests/unit/challenge/config.test.ts`, `challenge-validate.test.ts` | `validateChallengeDeclaration` throws exactly `missing required field: backend`; validate `declaration` fails with it | absent and `null` |
| 0010-S31, 0010-S34 | Y12: `app: 3`, `true`, `[]` | `config.test.ts`, `challenge-validate.test.ts` | throws VM12 `app must be a string, got number` / `boolean` / `object`; validate result has no thrown error and no crash in the `backend` (extension) check | `[]` reports `object` (typeof) |
| 0010-S34 | Y13: `number` absent; `0`, `-1`, `1.5`, `"7"` | `challenge-validate.test.ts` | absent → ``no `number` in challenge.yaml; assign one greater than every number ever assigned``; others → `number <json> is not an integer greater than zero` (today's text) | `"7"` is a string |
| 0010-S31, 0010-S34 | Y14: `title`, `description`, `layout` each alone and all three | `config.test.ts`, `challenge-validate.test.ts` | throws VM5 `challenge.yaml carries brief key(s) <keys>; title, description and layout belong in each brief's frontmatter`, `<keys>` in file order, comma-separated; validate `declaration` fails | all-three case written in a non-alphabetical order (e.g. `layout, title, description`) to pin file order |
| 0010-S31, 0010-S33, 0010-S34 | Y19: unknown keys `id: 7`, `commands: []`, `author: x` pass through | `config.test.ts` (no throw), `tests/unit/challenge/plugin.test.ts` (assembled frontmatter carries each unchanged), `challenge-validate.test.ts` (no check message names them) | as row | values of three types |
| 0010-S34, 0010-S36 | Y20: `fs: {…}` and each `LEGACY_FIELDS` key | `challenge-validate.test.ts` (passes; `console.warn` spy never called with `fs`), `tests/unit/scripts/challenge-keygen.test.ts` (CLI on temp copy) | keygen prints KG1 `[warn] <slug>: deprecated field '<key>' found — will be removed` per key; rewritten `challenge.yaml` lacks each | keys `fs`, `fs_key`, `fsKeyParts`, `encryptedFs`, `flag_verifier` |
| 0010-S31, 0010-S36 | Y21: every optional key absent | `config.test.ts`; keygen CLI case in `challenge-keygen.test.ts` | returns `source_visible: false`, `source_files: []`, `packages: []`, `tools: undefined`, `flag: undefined`; keygen reads `src/flag.txt` (built payload's flag verifier matches it, or `[done]` with no flag-missing skip) | — |
| 0010-S34 | Y104: `number` = `Number.MAX_SAFE_INTEGER`; `1e21`; `2**53` | `challenge-validate.test.ts` | first passes; others fail with the existing "is not an integer greater than zero" message | `isChallengeNumber` becomes `Number.isSafeInteger(n) && n >= 1` (`shortLink.ts`) |
| 0010-S32, 0010-S34 | Y112: D129 YAML boundaries | `declaration.test.ts` (read half), `challenge-validate.test.ts` (brief half) | `invalid-yaml` for duplicate key, over-limit alias expansion (billion laughs), `*nowhere`, `!foo bar`; alias within limit resolved; `<<: *base` → ordinary key `<<` holding `{x: 1}` passed by `validateChallengeDeclaration`; `yes`/`on` strings; brief with `<<` → VM6 naming `<<`; brief with `title` twice → VM15 | `maxAliasCount: 100`; no stderr write on any input (as T-0076's D145/D147 blocks) |
| 0010-S34 | Y22: upstream briefs, both locales | `challenge-validate.test.ts`, upstream-only | `brief (zh-TW)` and `brief (en)` passed for each of the four slugs | skip reason in a range |
| 0010-S31, 0010-S34 | Y23: brief with `title` and `layout` only | `config.test.ts` (`validateChallengeBrief`), `challenge-validate.test.ts` | `description: undefined`; validate passes | — |
| 0010-S34 | Y24: brief carrying `backend`; `number`; `tools`; `wasmModule` — primary, then translation | `challenge-validate.test.ts` | `brief (<L>)` fails with VM6 naming repo-relative path and keys; the `declaration` check still runs and reports separately | P both; key order = file order |
| 0010-S34 | Y25: brief carrying `outline`, `id`, `fs`, `head` | `challenge-validate.test.ts` | same as Y24 (D74 closed set) | VitePress page keys included |
| 0010-S34 | Y26: `title` absent, `null`, `''`, `2048` | `challenge-validate.test.ts` (`it.each`) | VM7 `<path>: title must be a non-empty string` each | four values |
| 0010-S34 | Y27: `layout` absent, `doc`, `Challenge` | same | VM8 `<path>: layout must be challenge` | case-sensitive `Challenge` |
| 0010-S34 | Y28: `description: 42` / `[a]` | same | VM9 `<path>: description must be a string` | — |
| 0010-S34 | Y29: no frontmatter block; unparseable frontmatter | same | VM14 `<path>: no YAML frontmatter found` / VM15 `<path>: invalid YAML: <parser message>` (prefix match) | — |
| 0010-S34 | Y30: D+Pb, D+Pb+Tb | `challenge-validate.test.ts` | `allPassed: true` both | P both |
| 0010-S34 | Y31: D, no Pb (Tb absent / present) | same | `brief (<P>)` fails VM10 `<path> not found; every challenge has a brief in the primary locale (<P>)` at `platform/en/…` (P=en) / `platform/zh-TW/…` (no `range.json`) | P both; Tb present and absent |
| 0010-S34 | Y32: brief(s) only, no challenge directory | same (`discoverChallenges(root)` + `validateChallenge`) | slug returned; `declaration` VM1 | Pb only, Tb only, both |
| 0010-S34 | Y33: brief only under `platform/ja/challenge/<slug>/` | same | `discoverChallenges` does not return it | `ja` unlisted |
| 0010-S34 (command) | Y34: legacy pages `platform/challenge/<slug>/index.md`, `…/notes.md`, flat `<slug>.md`; not one: `…/src/README.md` | `challenge-validate.test.ts`, CLI case (Y-q2) | without slug: exit 1, PL-E08 first line then each legacy file, before any check (no `✓`/`✗` line); with `door-is-open` arg: same; only `src/README.md`: exit 0 | each legacy shape as its own case; depends on B's `checkSourceLayout` |
| 0010-S34 (command) | Y35: `pnpm challenge:validate <slug>` | same | found by challenge directory or by brief; unknown slug → `Challenge not found: <slug>`, exit 1 | slug with only a brief |
| 0010-S34 (command) | Y36: `range.json` unusable | same, CLI | PL-E01–PL-E06 first line (from `readPrimaryLocale`), exit 1, before any challenge check | R19 ×6 |
| 0010-S34 | Y37: `range.json` absent; without `primaryLocale`; `en`; `zh-TW` | `challenge-validate.test.ts` (`validateChallenge(root, slug)` reads the tree's `range.json`) | Y31's required path is `zh-TW`, `zh-TW`, `en`, `zh-TW` | four states, `it.each` |
| 0010-S34 | Y103: stray `diagram.png`, `index.md`, `notes/`; not stray `.DS_Store`, `src/`, `challenge.yaml` | `challenge-validate.test.ts` | `structure` fails VM13 `platform/challenge/<slug>/ holds diagram.png, index.md, notes; a challenge directory holds only src/ and challenge.yaml` (sorted by UTF-16 code unit); only non-stray → passes | dot-prefixed never listed; whether `notes/` prints with or without `/` is fixed by VM13 `<entries>` = names (confirm at /tdd) |
| 0010-S33 | Y38: every slug × every listed locale's brief on the real tree | `plugin.test.ts` | result = brief keys ∪ every `challenge.yaml` key ∪ `markdownBody`; declaration projection deep-equal across locales | slugs and briefs enumerated from the tree (not upstream-only per D124; AC-61 "derives its expectation from the tree") |
| 0010-S8 (0010-S42) | Y39: built site, each challenge with two briefs, primary page and `/en/challenge/<slug>/` | `tests/site-smoke/site-smoke.spec.ts` (new test; built with `WXL_SMOKE_PAGES=1`) | same difficulty/category badge text and number, same tool-tab set, Source tab iff `source_visible: true`; `wasmModule` response 200; `[data-panel="browser"] input` enabled within 30 s | slug list and primary URL derived from the tree and `P` |
| 0010-S33, 0010-S9 | Y40: brief with `layout: challenge`, no `challenge.yaml` | `plugin.test.ts` (throw); B's commands-on-a-copy harness (exit) | throws `PL-E13: <brief path>: no platform/challenge/<slug>/challenge.yaml for this brief`; `pnpm docs:build` exits non-zero, output contains `PL-E13: platform/<L>/challenge/<slug>/index.md` | one `docs:build` run on a temp copy (slow; mark timeout); the exit half is also observed at V-B1 |
| 0010-S33 | Y41: `challenge.yaml` unparseable / multi-document / not a mapping | `plugin.test.ts` (`it.each`) | throws PL-E14 `PL-E14: platform/challenge/<slug>/challenge.yaml: not one YAML mapping (<reason>)`, `<reason>` = the 0010-S32 `reason` | three reasons |
| 0010-S33 | Y42: brief key outside `BRIEF_KEYS` | `plugin.test.ts` | PL-E15 `…: a brief may carry only title, description and layout, found <keys>` | keys in file order |
| 0010-S33 | Y43: `challenge.yaml` with a brief key | `plugin.test.ts` | PL-E16 `…challenge.yaml: carries brief key(s) <keys>` | — |
| 0010-S33 | Y44: `<L>/challenge/<slug>/index.md` without `layout: challenge` | `plugin.test.ts` | PL-E17 `PL-E17: <brief path>: a brief must set layout: challenge` | P both |
| 0010-S33 | Y45: `layout: challenge` at `<L>/guide/x.md`, `<L>/challenge/index.md`, `<L>/challenge/<a>/<b>/index.md`, `<L>/challenge/<slug>.md` | `plugin.test.ts` (`it.each`) | PL-E18 `PL-E18: <page path>: layout: challenge is only for platform/<locale>/challenge/<slug>/index.md` | four paths |
| 0010-S33 via 0010-S5 | Y46: primary brief served at `/challenge/<slug>/` (rewritten `relativePath`), translation at `/en/challenge/<slug>/` | `tests/unit/site/config-base.test.ts` (`transformPageData` of the real config) | each page gets its own locale's body; the test feeds a `pageData` whose `relativePath` is the rewritten one and `filePath` the source, so a `relativePath` implementation fails it | P both through fixture `srcDir` if the config allows; else real tree's `P` |
| 0010-S33 | Y47: invalid `backend`; `tools: [terminal]` | `plugin.test.ts` | returns assembled frontmatter unchanged, no throw | — |
| 0010-S33 via 0010-S5 | Y48: home, list, guide, reference pages | `plugin.test.ts` (`null`) and `config-base.test.ts` (`pageData.frontmatter` deep-equal after `transformPageData`) | as row | four page kinds |
| 0010-S33, 0010-S18 | Y113: `challenge.yaml` with `__proto__: { polluted: 1 }`, `constructor: x` | `plugin.test.ts`; `tests/unit/site/challenge-data-loaders.test.ts` (loader half, on area L's temp-tree loader) | `Object.hasOwn(result, '__proto__')` and `'constructor'`, `Object.getPrototypeOf(result) === Object.prototype`, `({}).polluted === undefined` after; loader entry the same | YAML key `__proto__` as an own key |
| — (stage 7) | Y106: flag exposure | stage 7 security review | AC-37: the Traditional Chinese selected-excerpts page lists exactly the English page's files; no scalar of any `challenge.yaml` at any depth contains its flag (one trailing LF/CRLF stripped) | terminal |
| 0010-S42 (pure helper) | Y49: slug from `challenge/<slug>/index.md` and `<L>/challenge/<slug>/index.md` | new `tests/unit/challenge/slug.test.ts` for the extracted helper (e.g. `slugFromRelativePath`); existing "derives slug from per-folder relativePath…" in `ChallengeLayout.test.ts` stays green | returns `<slug>` both; flat `<slug>.md` branch gone (returns no slug / not `<slug>`; exact value chosen at /tdd since the row only says "gone") | both locales |
| 0010-S42 (mounted, module double) | Y50: module without `wasm_fs_list` | new `tests/unit/layouts/ChallengeLayout-legacy-module.test.ts` (own `vi.mock` of `virtual_fs.js`, pattern of `ChallengeLayout-whitebox-source.test.ts`) | runtime-error state whose text names `pnpm challenge:keygen`; `fm.fs` never read (frontmatter carrying `fs` changes nothing) | `tests/__mocks__/virtual-fs.ts` keeps `wasm_fs_list`, so no existing layout test flips |
| — (stage 8) | Y51: four challenges × `/challenge/<slug>/` and `/en/challenge/<slug>/` (Y39, Y51); the 10 `selected-excerpts` files on both | stage 8 V-Y6 | AC-38 | Browser panel open, F-1 Cloudflare Pages preview |
| 0010-S36 (CLI) | Y52: directory without `challenge.yaml` | `challenge-keygen.test.ts`, temp copy | not processed without slug; with slug → `Challenge not found: <slug>`, exit 1 | — |
| 0010-S36 (CLI) | Y53: no directory with `challenge.yaml` | same, temp copy | exit 1, `No challenge files found` | empty `platform/challenge/` |
| 0010-S36 (CLI) | Y54: a rebuild | same | `challenge.yaml` gains `wasmModule: /challenge/<slug>/runtime.wasm`, loses `LEGACY_FIELDS`/`fs`, every other line byte-equal; every brief in every locale byte-identical | fixture with comments and odd key order |
| 0010-S36 (CLI) | Y55: `--force` on the four upstream files | same, temp copy, upstream-only | each `challenge.yaml` byte-identical to Y-§2.4 | if the run needs `wasm-pack`, the row moves to V-Y5 in the same change, reason recorded in the ticket |
| 0010-S36 (CLI) | Y56: write-back would be identical | same | `challenge.yaml` mtime unchanged (mtime, not bytes, as the existing payload case argues) | — |
| 0010-S36 | Y57: inputs (a)–(e) | same: `getTrackedInputPaths` cases + CLI | returns `challenge.yaml`, template, `.fsignore` when present, every scanned `src/` file, nothing under `platform/<L>/`; CLI `[skip] <slug>` for (a), `[stale] <slug>` for (b)–(e) | `.fsignore` absent/present |
| 0010-S36 (CLI) | Y58: second run right after a rebuild | same | second run prints `[skip] <slug>` | **measured first** in a scratch clone (Y-O5); if D80(b) cannot hold, stop for the user (D133), test not written |
| 0010-S36 (CLI) | Y59: payload check fails | existing block, re-pointed | exit ≠ 0, `[door-is-open]` + `payload integrity`; `challenge.yaml` and `runtime.wasm` byte- and mtime-identical | real repo's `door-is-open` (as today) |
| 0010-S36 (CLI) | Y60: flat `platform/challenge/<slug>.md` beside directories | same, temp copy | not processed; no "legacy flat file structure" warning | interacts with keygen's layout check (D19): a flat `.md` is a legacy-layout page, so the run exits PL-E08 first; the case must state which (Y-q4) |
| 0010-S36 (CLI) | Y61: today's six `source_files` failures | existing block "challenge-keygen CLI rejects an unusable source_files entry", fixtures re-pointed | every existing case passes unchanged in its assertions | brief written at `platform/<P>/challenge/<slug>/index.md` with `P = readPrimaryLocale(repoRoot/range.json)` (AC-61), cleaned up in `afterEach` |
| 0010-S36 (CLI) | Y107: `range.json` absent; `en`; R19 ×6 | same, temp copy | absent/`en` process as Y52–Y61; failure: exit 1, PL first line is stderr's first line, no `[skip]`/`[done]`/`[stale]`, no `runtime.wasm` or `challenge.yaml` written | R19 ×6 |
| 0010-S37 | Y62: `--difficulty`, `--tags`, `--category` | `tests/unit/scripts/challenge-retype-metadata.test.ts` | named keys change in `challenge.yaml`; comments, key order, untouched keys and both briefs byte-identical | fixture with a comment line and briefs in both locales |
| 0010-S37 | Y63: no `challenge.yaml` (none; only briefs) | `challenge-retype-errors.test.ts` | exit 1 with RT1 `Challenge <slug> not found at <absolute path of challenge.yaml>`; no file written | both shapes |
| 0010-S37 | Y64: same-family swap; cross-family | `challenge-retype-same-family.test.ts`, `-cross-family.test.ts` | `backend`, `app` change in `challenge.yaml`, `src/` rewritten, `runKeygen` once; cross-family exit 2, nothing written | — |
| 0010-S37 | Y65: brief wrongly carrying `backend` | `challenge-retype-metadata.test.ts` (new case) | brief byte-identical after retype; retype never reads it (a brief that would fail to parse does not change the outcome) | — |
| 0010-S35 | Y66: title from the primary brief | `tests/challenge-analyze.test.ts` | `analyzeChallenge().title` = `知的必要` (P=zh-TW) / `Need to Know` (P=en); other fields from `challenge.yaml`; `formatAnalysis` prints `=== <title> ===` | P both |
| 0010-S35 | Y67: primary brief missing | same | `title` = slug | — |
| 0010-S35 | Y68: `challenge.yaml` absent / invalid | same | `No challenge.yaml found` / `Invalid YAML in challenge.yaml: <message>`; other existing errors keep their text | — |
| 0010-S35 | Y69: discovery | same | `discoverChallenges` returns `{ slug, declarationPath, briefPath }` (primary brief), no flat `.md` | — |
| 0010-S35 (command) | Y108: `range.json` absent; `en`; R19 ×6 | same, CLI on temp copy (Y-q2, Y-q3) | absent → title from `platform/zh-TW/…`; `en` → `platform/en/…`; failure → exit 1, PL first line first on stderr, nothing analysed | R19 ×6 |
| 0010-S38 | Y70: no `range.json` | `tests/unit/scripts/create-challenge-run.test.ts` | writes `platform/zh-TW/challenge/<slug>/index.md`, `platform/challenge/<slug>/challenge.yaml`, `src/<app>`, `src/flag.txt` only; stdout scaffold block lists the four, brief first | `snapshot`/`changedPaths` diff = exactly those |
| 0010-S38 | Y71: `range.json` `{ "upstream": {…} }` | same | as Y70 | — |
| 0010-S38 | Y72: `{ "primaryLocale": "en" }` | same | brief at `platform/en/…`; nothing under `platform/zh-TW/` | — |
| 0010-S38 | Y73: unusable `range.json` | same | status 1; stderr has the PL-E01–PL-E06 first line; tree byte-identical; `_redirects` untouched; keygen not called | R19 ×6 |
| 0010-S38 | Y105: legacy layout (`platform/index.md` present) | same | status 1; stderr's first line PL-E08, then listed paths; tree byte-identical; keygen not called | needs B's `checkSourceLayout` |
| 0010-S38 | Y74: brief content | `tests/unit/scripts/create-challenge.test.ts` (`generateBrief`) | frontmatter keys exactly `title`, `layout: challenge` in order; body `\n# <title>\n\n<SCAFFOLD_TEXT[P].body>\n`; `validateChallengeBrief` accepts it | P both |
| 0010-S38 | Y75: `challenge.yaml` content | `create-challenge.test.ts` (`generateDeclaration`) + run case for post-keygen | keys exactly `number, difficulty, category, backend, app, packages, date, tags` in order; no brief key; no `wasmModule` before keygen; after keygen `wasmModule` last | — |
| 0010-S38 | Y76: no `--title` | `create-challenge.test.ts` | `Stage8 Decl` (en) / `未命名題目（stage8-decl）` (zh-TW) in `title` and H1 | slug `stage8-decl` |
| 0010-S38 | Y77: `--title "X Y"` | same | `title: X Y`, `# X Y` | P both |
| 0010-S38 | Y78: body placeholder | same; stage 6 for the glossary clause; stage 6: no word of `TODO：在這裡寫說明頁內文。` is a GLOSSARY `_新造詞_` term | `TODO: Write challenge description here.` / `TODO：在這裡寫說明頁內文。` | full-width colon |
| 0010-S38 | Y79: `SCAFFOLD_TEXT` total over `LOCALES` | same | iterates `LOCALES` from `.vitepress/locales.ts`; each entry has non-empty `title('a-b')` and `body` containing `TODO` | — |
| 0010-S38 | Y80: challenge directory exists (only `src/`; only `challenge.yaml`; both) | `create-challenge.test.ts` (`checkCollision`), `create-challenge-run.test.ts` (status) | status 1, CC1 `Error: Challenge "<slug>" already exists: platform/challenge/<slug>/`; existing `src/` bytes unchanged | three shapes |
| 0010-S38 | Y81: `platform/<L>/challenge/<slug>/` exists, `L = P`; `L ≠ P` only | same | status 1, CC1 naming that directory; nothing written | P both |
| 0010-S38 | Y82: flat `platform/challenge/<slug>.md` exists | `create-challenge.test.ts` (`checkCollision` does not throw) | not a collision (the `run` path is refused by Y105's layout check first; see Y-q4) | — |
| 0010-S38, 0010-S34 | Y83: the scaffold validates | `create-challenge-run.test.ts` | `validateChallenge(root, slug).allPassed` for P=en and P=zh-TW (keygen double succeeds) | — |
| 0010-S38 | Y84: keygen status 3; `_redirects` status 2 | `create-challenge-run.test.ts` (existing W1/W2 cases) | W2 and W1 keep 0007's substrings and add `platform/<P>/challenge/<slug>/index.md` | P both |
| 0010-S27, 0010-S38 | Y85: number from declarations | `tests/unit/scripts/challenge-numbers.test.ts` (`nextChallengeNumber` over live + `.archive` `challenge.yaml`), `create-challenge-run.test.ts` (written `number`) | written `number` = `nextChallengeNumber(root)` | retired highest; shared with area S's number rows |
| 0010-S39 | Y86: verify L1, `challenge.yaml` absent / present | `tests/unit/scripts/challenge-verify-L1.test.ts` | absent → `status: 'fail'`, reason VF1 `challenge.yaml not found: <absolute path>`; present and failing → `validate failed: <failed labels>` e.g. `brief (zh-TW)` | — |
| 0010-S39 | Y87: verify L2, `challenge.yaml` absent | `challenge-verify-L2.test.ts` | `status: 'fail'`, VF1, spawn double never called for keygen | — |
| 0010-S40 | Y88: `deriveSlugs` inputs | `tests/challenge-lint-staged.test.ts` (`it.each`) | `s` for declaration, `src/`, zh-TW brief, en brief (+ absolute and backslash forms); nothing for `ja` brief, flat `s.md`, `platform/en/guide/x.md` | `locales` argument from `LOCALES` |
| 0010-S40 | Y89: `runLintStaged` | same | directory without `challenge.yaml` → LS1 `incomplete challenge (missing challenge.yaml)`; neither directory nor brief → `[pre-commit] ⊘ s (removed)`, no error; brief without directory → VM1 reported | — |
| 0010-S29 | Y90: hook selection | `tests/pre-commit-sh.test.ts` (new case) | staging only `platform/<L>/challenge/<slug>/index.md` with a forbidden key → blocked with VM6 | `L` = primary and translation; uses area S's new-layout `preCommitRepo` fixture |
| 0010-S41 | Y91: `buildPlayerPackage` | `tests/unit/scripts/wxl-solver/build-player-package.test.ts` | `description.md` = `extractDescription` of `platform/<P>/challenge/<slug>/index.md`: `# 知的必要` + first paragraph / `# Need to Know` + first paragraph | P both |
| 0010-S41 | Y92: primary brief missing | same | throws PP1 `buildPlayerPackage: brief not found for slug <slug> (<absolute path>)` | translation present, primary absent |
| 0010-S41 | Y93: package contents | same | exactly `description.md`, `META.yaml`; neither contains `wasmModule`, `app`, `flag` value or any `source_files` entry as a substring | values chosen long/unique enough not to collide with brief prose |
| 0010-S39 | Y109: L1 and L2 × R19 ×6 | `challenge-verify-L1.test.ts`, `-L2.test.ts` | `status: 'fail'`, reason = PL first line; L2 spawns no keygen | R19 ×6 |
| 0010-S41 | Y110: `range.json` absent; `en`; R19 ×6 | `build-player-package.test.ts` | absent → zh-TW brief; `en` → English brief; failure → throws `SiteLayoutError` with that `code`, output folder empty | R19 ×6 |
| 0010-S40 (+S24, S25, S29, S34, S38, page list) | Y111: brief folder entries (D127) | `challenge-lint-staged.test.ts` (`deriveSlugs`); `tests/unit/site/redirects.test.ts` (`indexTrees`, `briefFaults` incl. contrast `missing-primary` for `t`, `targetDirectoryFaults` ignores `u`); `pre-commit-sh.test.ts` (no 0007 W4 line naming `platform/zh-TW/challenge/t/`); `challenge-validate.test.ts` (no slug `t`/`u`); `create-challenge-run.test.ts` (`--name t` → CC1); `tests/unit/i18n/page-list.test.ts` (`…/s/hints.md` an ordinary page) | each clause of the row | no `range.json` (P=zh-TW); the area S clauses follow area S's seams |
| 0010-S43 | Y94: wxl-create both files, both trees | `tests/unit/site/sentence-map.test.ts` stays green; stage 6 reading + PAT6 diff + `git grep -n "challenge/<slug>/index.md"` | as row | stage 6 reading of the four wxl-create files; PAT6 (D135): per-tree `git diff <merge-base>..HEAD` removed/added lines equal, excluding `.agents/skills/<skill>/agents/`; `diff` of each `.claude/` file with its `.agents/` twin empty (twins are identical at `9da6aff`); `git grep -n "challenge/<slug>/index.md"` only `platform/<P>/…` forms; `sentence-map.test.ts` passes; twins `diff` empty (area U's plan) |
| 0010-S43 (stage 6) | Y95, Y96: wxl-mutate, wxl-verify skills | both trees | Y95/Y96; twins identical; PAT6 | — |
| 0010-S43 (stage 6) | Y97–Y99: README format section, CONTRIBUTE, pipeline doc, AGENTS.md layout | those files (Y98 includes the D87 restart rule) | Y97–Y99, read against each row's sentences | `release-docs.test.mjs` and `upstream-config.test.mjs` U9 lines in AGENTS.md/CONTRIBUTE.md kept |
| 0010-S43 (stage 6) | Y100: learner guide wording | `platform/{en,zh-TW}/guide/{python,index,troubleshooting}.md` | 「題目宣告」 instead of frontmatter; nothing else in those sentences | Paths in U-§5 (Y100) |
| — (stage 8) | Y101: documented dev-server limit | V-Y8 (Browser panel on `pnpm dev` from F-6) | AC-43: reload shows old badge; after restart the new one | — |
| — (stage 8) | V-Y1: `create:challenge --name stage8-decl --backend flask`; validate; `verify --layers L1,L2` (Y70, Y74–Y76, Y78, Y83, Y86, Y87) | terminal, F-6, no `range.json` | AC-59 | — |
| — (stage 8) | V-Y2: same after `git clean` with `{"primaryLocale":"en"}` (Y72, Y76, Y78) | terminal, F-6 | AC-59 | — |
| — (stage 8) | V-Y3: `backend:` in en brief → VM6 + `PL-E15: platform/en/challenge/door-is-open/index.md`; `title:` in `challenge.yaml` → VM5 + PL-E16 (Y24, Y14, Y42, Y43) | terminal, F-6 | AC-59 | — |
| — (stage 8) | V-Y4: retype `--difficulty hard`; `git status --short` = only `challenge.yaml` (Y62) | terminal, F-6 | AC-59 | — |
| — (stage 8) | V-Y5: keygen twice / brief edit / `tags` edit (Y55–Y58) | terminal, F-6 | AC-59 | — |
| — (stage 8) | V-Y6: four challenges × `/challenge/<slug>/` and `/en/challenge/<slug>/` (Y39, Y51); the 10 `selected-excerpts` files on both | Browser panel, F-1 preview | AC-59 | — |
| — (stage 8) | V-Y7: `buildPlayerPackage` for `door-is-open` via `node --experimental-strip-types -e` (Y91, Y93) | terminal, F-6 | AC-59 | — |
| — (stage 8) | V-Y8: `difficulty` edit, reload, restart (Y101) | Browser panel on `pnpm dev`, F-6 | AC-59 | — |

Open items (area Y):

- Y-q1: remove `validateChallengeConfig` (D75 "splits") or keep it unused. Removing it is what the `config.test.ts` contract row implies.
- Y-q2: Y34–Y36, Y52, Y53, Y60, Y107 and Y108 need a CLI run on a fixture tree. Choose per tool between a temp copy and a `root` argument on the entry function. B38's unit rows follow the same choice.
- Y-q3: 0010-S35 names no analyze CLI entry, but Y108 needs an exit status. Confirm that the CLI is part of 0010-S35.
- Y-q4: Y60 (keygen) and Y82 (create) put a flat `<slug>.md` in the tree. D19 and D82 run the layout check first, so the tool stops with PL-E08, and the rows hold only at the function level (`checkCollision`, discovery). State this in the cases.
- Y-q5: Y-O12's "runs both validators": `validateChallengeBrief` gets the brief projection (`BRIEF_KEYS`), and `validateChallengeDeclaration` gets the rest.
- Y-q6: tests that change but appear in no "Overridden contracts" row need a row, or the user's decision, before stage 6: `declaration.test.ts` › "D145: a mapping key that is not a scalar throws" and "D147: the site parser resolves no YAML 1.1 tag" (they become `invalid-yaml`); `plugin-obfuscation.test.ts` › "detects all legacy fields when present" (4 → 5), "returns empty array when no legacy fields present", and "[RED] no sensitive data…" if it runs `validateChallengeBrief`; `create-challenge-run.test.ts` C05 (a flat `legacy.md` now stops at PL-E08); and whether "every fixture" covers the call-shape changes in `discoverChallenges` and `deriveSlugs`.
- Y-q7: `.claude/` and `.agents/` `skills/wxl-create/reference/agent-tools.md` still say "frontmatter fields". Y94 does not list that file. Raise it at stage 6.

### Area U (the switch's part), the D31 first step and the items without a row id: rows U112–U116, U130–U134, U136, U139, U142, U145, U147, U152

U13, U110, U111, U135 and U137 are T-0081's; U11, U146 and U150 are T-0076's. The document rows the area U plan also covered (B84–B87, B90, A34–A37, S64–S72, Y94–Y101) sit in their home areas' tables (cross-area note 2).

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0010-S12 (D31 first step) | `primaryLocale()` returns the compile-time constant when it is defined, and `zh-TW` when nothing defines it | New `tests/unit/i18n/primary-locale-client.test.ts`; new module `.vitepress/theme/i18n/primaryLocale.ts` (shaped like `publishedPages.ts`); `env.d.ts` gains `declare const __WXL_PRIMARY_LOCALE__` | D31: "it returns the compile-time constant, and where nothing defines it (vitest) it returns `zh-TW`" | `__WXL_PRIMARY_LOCALE__` undefined → `'zh-TW'`; stubbed `'en'` (`vi.stubGlobal`) → `'en'`; stubbed `'zh-TW'` → `'zh-TW'`. This is the module's own contract, so pinning the fallback here is not "relying on" it. Then run `pnpm test --run` and write the flipped tests into ticket Comments and "Overridden contracts" before any red test (wave 0; cross-area note 1) |
| U112 (unit) | `ANCHOR_PATHS` is exported and equals D107's list, in order | `create-wxl/test/upgrade-report.test.mjs`, new `it` in describe "anchor file changes add UP-A12 (U59)" (first test that imports `../src/merge-plan.mjs` directly) | `ANCHOR_PATHS` deep-equals `['package.json','README.md','README.en.md','CONTRIBUTE.md','.vitepress/config.mts','.vitepress/challenge/shortLink.ts','platform/en/index.md','platform/zh-TW/index.md','scripts/templates/deploy.yml.template']` | Order matters (`toEqual` on an array); exactly nine; `platform/index.md` absent. The three existing U59 cases stay unchanged (README anchors) |
| 0010-S48 (U113) | `--site-name` on a new-layout tree rewrites the hero name in both new home pages and nothing else | `tests/unit/scripts/fork-init.test.ts`: the shared `writeFixture` writes `platform/en/index.md` instead of `platform/index.md`; the existing case "sets A6 and both A7 (%s), changedFiles lists exactly these three files" carries U113 | Both files' 0003 A7 line is `  name: "New Name"`; `changedFiles` is exactly `['.vitepress/config.mts','platform/en/index.md','platform/zh-TW/index.md']` | Three A7 quotings already in the `it.each` (double, single, plain); other frontmatter lines unchanged |
| 0010-S48 (U114) | a legacy tree (only `platform/index.md`) is refused with 0003 A7's tree error, format unchanged, naming the new path | `fork-init.test.ts`, new `it` (CLI case through the existing `runCli` helper, so stderr is the observed surface) | stderr contains `A7: platform/en/index.md is missing`; exit 1; nothing written (`snapshotTree`/`assertNothingWritten`) | Fixture holds `platform/index.md` and no `platform/en/index.md`; with and without `platform/zh-TW/index.md` the message names `platform/en/index.md` (checked first, D107's order); `platform/index.md` bytes unchanged |
| 0010-S48 (U115) | create (0005) on a new-layout archive with `--site-name` rewrites both new home pages | `create-wxl/test/engine-apply.test.mjs` (existing `it.each` "%s: runForkInit once … A1, A6-A8, workflow") on `ENGINE_READY_FIXTURE` updated in `create-wxl/test/helpers/fixtures.mjs` | `extractA7Value` of `platform/en/index.md` and of `platform/zh-TW/index.md` equals the `--site-name` value | Both hosts of the existing table (github-pages, cloudflare-pages); the fixture gains a `platform/en/` dir entry before the file (archive order rule) and loses `platform/index.md` |
| 0010-S48 (U116) | the upstream-pristine check reads A7 at `platform/en/index.md` | `tests/unit/scripts/upstream-guard.test.ts`: `FieldId` union, `pristineMismatches`'s A7 loop, `pristineFixtureFiles`, the A7 cases of describe "upstream pristine check"; real-tree describe "real tree (upstream only)" | Union holds `'A7:platform/en/index.md'` in place of `'A7:platform/index.md'` (0004 T67); "the pristine check finds no mismatch" passes on the moved tree | Missing `platform/en/index.md` → that field id reported; plain-scalar A7 still not reported; the real-tree case runs only under `REAL_DECISION` |
| 0010-S48 (U145) | new-layout tree without `platform/zh-TW/index.md` (P = en) is refused (known conflict, U-O8) | `fork-init.test.ts`, new `it` (CLI via `runCli`) | stderr contains `A7: platform/zh-TW/index.md is missing`; exit 1; nothing written | Fixture has `range.json` `{"primaryLocale":"en"}` so the deleted home is the translation home (AC-51 "under either primary"); `range.json` bytes unchanged |
| 0010-S48 (U152) | new-layout tree, P = zh-TW, without `platform/en/index.md` is refused the same way | `fork-init.test.ts`, new `it` (CLI via `runCli`) | stderr contains `A7: platform/en/index.md is missing`; exit 1; nothing written | No `range.json` (P = zh-TW); `platform/zh-TW/index.md` present and unchanged |
| 0010-S49 (U130) | every transform output of the base tag equals the compared tree's file, byte for byte, unless excepted; no newer `v*` tag is legacy | New `tests/unit/site/upstream-equality.test.ts` (root suite); git read through an isolated-env runner as `create-wxl/test/upstream-config.test.mjs` `runGitIsolated` does | One `it.each` assertion per `move`/`declare` `to` and per `strip` `path`, titled with the path; exception table equals U-§5 (the 15 paths); base tag `v3.1.1`; one assertion: no `v*` tag newer (semver) than `v3.1.1` holds `platform/index.md` | Files from `git ls-tree -r -z v3.1.1 -- platform/` (mode, blob bytes); compared tree = oldest `v*` tag holding `platform/en/index.md`, else the working tree (today: working tree); an excepted path absent from the compared tree is not a failure (U-§5); `mode` compared for moves. Open item: if the base tag were computed as "newest legacy tag", the second assertion is tautological; the plan pins `v3.1.1` literally (D108 "stage 4 re-checks it") so a legacy tag tagged before landing fails the test |
| 0010-S49 (U131) | every page and `challenge.yaml` of the compared tree is a transform output, an untouched base page, or excepted | same new file | Each compared-tree path with `classifySourcePath(…) !== 'excluded'`, plus each `platform/challenge/*/challenge.yaml`, is in {transform outputs} ∪ {base paths the transform does not touch} ∪ {exception table}; an untouched page equals the base tag's bytes (U-§5: "Every page other than these … must match") | `platform/zh-TW/` non-brief pages are the untouched class; the D49 smoke fixtures and D51 page are excepted; a page added by another area outside U-§5 fails here (D130: adding needs the user's approval in the stage 6 disposition) |
| 0010-S49 (U132) | on upstream, the base tag missing fails the test naming the tag (not skipped) | same new file: the tag lookup is a function of a git working directory; its test runs it on a temporary `git init` repository with no tags | Fails with a message naming `v3.1.1` | Real git on a temporary repository (no mock); the upstream decision true; no tags at all, and tags present but `v3.1.1` absent |
| create-wxl suite (U133) | create-wxl's locale-list literal equals the site's module | `create-wxl/test/layout-move.test.mjs`, new describe "U133" | `LOCALES` from `../src/layout-move.mjs` equals the array parsed from `.vitepress/locales.ts`'s `export const LOCALES = [...] as const` | Order and values both compared; the source is read as text (create-wxl cannot import the site's module, D112) |
| 0010-S49 (U134) | the equality test imports the published module | same new file's import `../../../create-wxl/src/layout-move.mjs` | The import path is that module (stage 6 reads the import line in the diff) | The root suite resolves `yaml` from the root `node_modules`; root `yaml` pinned to exactly `2.9.0` (ticket) so the root run parses as create-wxl does |
| root + create-wxl (U136) | `isLegacyPage` is true exactly where `classifySourcePath` returns `outside`, over one shared table | New `create-wxl/test/fixtures/page-predicate.json` (`[{ path, class }]`); root: `tests/unit/site/source-layout.test.ts` new describe; create-wxl: `create-wxl/test/layout-move.test.mjs` new describe | Root: for each entry under `platform/`, `classifySourcePath(path minus 'platform/', P)` equals `class` for both P; create-wxl: `isLegacyPage(path) === (class === 'outside')` | Paths: U11's 15 and B21–B28's (prefixed `platform/`): `index.md`, `challenges.md`, `guide/x.md`, `ja/index.md`, `zh-tw/index.md`, `EN/index.md`, `challenge/x.md`, `challenge/x/sub/a.md`, `challenge/src/a.md`, `challenge/s/src/a/b/c.md`, `public/x.md`, `shared/x.md`, `.draft.md`, `en/.x/a.md`, `node_modules/p/README.md`, `en/dist/old.md`, `foo.txt`, `README.MD`, `x.Md`. Paths outside `platform/` (`docs/x.md`, `Platform/x.md`, `postcss.config.mjs`) carry a class meaning "not a source path": the root side skips them, the create-wxl side requires `false` (decide the class literal at `/tdd`) |
| 0010-S49 (U139) | in a range or a fork, with the base tag present or absent, the equality suite reports skipped, never failed | same new file, through B93's helper in `tests/__helpers__/upstreamDecision.ts` (name chosen at `/tdd`) called with stubbed decision inputs | Range inputs (`hasRangeJson` true) and fork inputs (manifest URL not upstream) each return a skip reason, whatever the tag state; `describe.skipIf(reason)`. With `WXL_EXPECT_UPSTREAM=true` and the decision false the run fails through `upstream-guard.test.ts`'s existing expectation check (T69), which is unchanged | The tag lookup is reached only after the decision is "upstream" (so a missing tag in a range never fails); `GITHUB_REPOSITORY` set to another slug also skips |
| 0010-S49 (U147) | the transform of each legacy release has no failure and only the known mismatch | same new file, `it.each(['v3.0.0','v3.1.0','v3.1.1'])` | `failures` absent; `mismatches.map(m => [m.brief, m.key])` equals `[['platform/zh-TW/challenge/selected-excerpts/index.md','source_files']]` | Every legacy release create-wxl accepts as a base (`MINIMUM_BASE_VERSION` 3.0.0); values of the mismatch not pinned |
| workflows (U142) | each job that runs the root suite on upstream checks out tags | New `tests/unit/workflows/checkout-tags.test.ts`, in the style of `upstream-only-jobs.test.ts` (parse with `yaml`) | The `actions/checkout` step of `quality-gates.yml` jobs `test` and `fork-init-cross-os`, and of `release.yml` job `release`, has `with['fetch-depth'] === 0` | Exactly those three jobs; the step found by `uses` prefix `actions/checkout@`; other jobs not asserted (`prose-audit` already has it) |
| (no row id) stage 6 reading by T-0079 (L44); `glossary.test.ts` for LH2/LH3 | LH1 (badge clause), LH2, LH3, LH4 | troubleshooting and `guide/index.md` (both languages), `GLOSSARY.md` 語系標記, `AGENTS.md`, READMEs | as "Overridden contracts › Area L" LH1–LH4 states | LH1's list-title row is T-0079's; LH5 is release-note input |
| (no row id) `docs:build` with P = zh-TW and with P = en | notes.md interim text | `platform/zh-TW/guide/notes.md` | no `../../` link; the reference page named as plain text | U-§5 lists this path for D16; the interim edit sits under that entry, recorded at stage 6 |
| (no row id) after landing | T-0059 Comments | `.proj.tickets/0008-…/T-0059-….md` | names this ticket's merge | — |

Open items (area U):

- U-q1: U130 pins the base tag `v3.1.1` literally (D108: "stage 4 re-checks it"), so a legacy tag tagged before landing fails the test. If the base tag were computed as "the newest legacy tag", the no-newer-legacy-tag assertion would be tautological.

### Cross-area notes (inconsistencies between the area plans, and how they are resolved)

1. **The D31 first step.** Areas A and U agree that `primaryLocale()` alone has no caller, so wave 0's
   unit run is expected to flip no test. Comments record that run, with its command, as the baseline
   ("none flipped by the module alone"). The list is measured again in wave 2, right after the callers
   read `primaryLocale()` and before the first red test of each changed file. A flipped test whose
   assertions change goes into Comments and "Overridden contracts". A test changed only to set `P`
   (an argument, or a `vi.mock` of the module) with its assertions unchanged needs no row (T1), and
   stage 6 checks that its diff is only that.
2. **Document rows planned twice.** The area U plan also planned B84–B87, B90, A34–A37, S64–S72 and
   Y94–Y101. Each row is kept once, in its home area's table, with the area U plan's constraints
   merged in: B84 (語系資料夾), B86 (U5's pinned sentences, U143, U145, U152), B87 (the date),
   B90 (blob `b307335` is `a2ac5b6:GLOSSARY.md`, checked with `git rev-parse a2ac5b6:GLOSSARY.md`; the
   `_新造詞_` lines), and A34–A37. The placeholder rows "S64–S72" and "Y95–Y101" are replaced by the
   area U plan's rows.
3. **`create-wxl/test/upstream-config.test.mjs` U10.** The area B plan says the case needs an
   Overridden-contracts row. The area U plan suggests writing 設定紀錄 so that both pinned strings
   (`建立靶場的指令與升級都會寫入它`, `開發模組照它套用設定是之後的事`) stay. The ticket's Comments
   (2026-11-15) decide it: B90 applies `a2ac5b6`'s text, both strings change, and a row naming the
   case and both strings is added to "Overridden contracts" (a traceability edit, confirmed with the
   decisions before wave 8). Keeping the strings would depart from `a2ac5b6`'s text, so it happens
   only if the user chooses it.
4. **`tests/unit/scripts/fork-init.test.ts`.** B60 said the A6 and A9 cases pass with no edit, while
   U113 changes the shared fixture and "sets A6 and both A7 (%s)…". B60 now covers the A6 and A9
   assertions only. The fixture path and the A7 cases change under area U's `PLATFORM_HOME_RELS` row.
5. **`tests/unit/i18n/messages-shape.test.ts`.** The area L plan said the existing cases stay
   unchanged. B19 (BC7) makes them iterate `LOCALES` instead of the two literal imports. So the
   existing cases change under BC7, and L18 and A31 each add a case.
6. **`tests/site-smoke/site-smoke.spec.ts` helpers.** The area B plan gave `SITE_PAGES` and
   `pageUrlOf` to area S. The area A plan mapped them to its `REFERENCE` row, the area S plan mapped
   `expectedUrlFor` to "Page URL in page mode", and the area L plan left out its own D54 row.
   Resolution: area L writes `SITE_PAGES`, `pageUrlOf` and the path builders through D54's helper
   (row "Site-smoke URLs hard-code `/zh-TW`…"), and S56 rewrites `expectedUrlFor` on
   `challengePagePath` (AS "Page URL in page mode…"). The three cases of BC13 stay B82's. Stage 6 cites
   all four rows, and also area A's `REFERENCE` row for the store-the-page's-locale setup.
7. **D54's `localePath(locale, rest)`.** L37 and L38 expect area B to provide it, but the area B plan
   has no such helper. It is written in the site-smoke suite (file chosen at `/tdd`) with L37, its
   first user, in wave 3. B44, B48, B59, B61, B70, B81, B82, S56, Y39 and area A's smoke cases build
   their URLs with it.
8. **`localeIndex` mocks in `ChallengeList.test.ts`, `MergedNav.test.ts` and `HomeContent.test.ts`.**
   The area A plan cites the row "`localeIndex` `'root'` means English", while the area S plan says no
   row is needed. Both hold: a case changed only to set `P = 'en'` with its assertions unchanged needs
   no row (T1), and a case that gains `P = zh-TW` expectations cites area A's row (and BC14).
9. **`missing-translation.spec.ts` › "the page list spelling matches the pages VitePress
   published".** B44 (BC4) and L39 (area L's `REFERENCE` row) each change this case. One test, two
   changes: its diff cites both rows.
10. **B38's unit form.** The area B plan wants each tool's entry function to take an old-layout
    fixture `srcDir`, while Y-q2 leaves each tool's choice open. B38's rows in the keygen and validate
    tests follow Y-q2's choice per tool. The generator already takes a root (RT).
11. **The `nextChallengeNumber` describe in CN.** S20 rewrites it as one `it.each`. Y85's number case
    joins that table, and its written-number half stays in `create-challenge-run.test.ts`.
12. **`tests/unit/site/challenge-data-loaders.test.ts`.** Area L rewrites the file on a temporary
    tree. B79's grep case and Y113's loader half are added to the rewritten file.
13. **`config-base.test.ts` › `transformPageData`.** B50–B52 and Y46/Y48 share one describe. Its
    fixture `srcDir` carries `challenge/x/challenge.yaml`, or assembly throws PL-E13.
14. **The claim table, checked mechanically** (a script over `tickets.md` "Rows" and the tables
    above). L21 and V-Y1–V-Y8 were claimed but had no table row; they are added from the area plans'
    stage 8 lists (VL7; V-Y1–V-Y8). The placeholder rows VA1a–VA4 and S57–S63 are expanded to one row
    each. Area L's count is corrected from 31 to 30. A literal `|` in S1's boundary cell
    (`platform/en|zh-TW/…`) split the table and is now written `platform/{en,zh-TW}/…`. After the fix,
    every claimed row appears in exactly one area's table, and no table claims a row that is another
    ticket's. V-B6, VL7, L44 and U135 are named only as observations or exclusions.

### Implementation waves

The executor works through the waves in this order. Inside each wave, `/tdd` governs: one seam, one
red test, one minimal implementation per cycle. The branch may be red between waves, because the
real-tree, built-site and hook suites depend on later waves. It must be green at the end (wave 9),
as T1 defines green.

0. **The D31 first step, alone.** D31 row (area U table).
   - Files: new `.vitepress/theme/i18n/primaryLocale.ts`, `env.d.ts` (`__WXL_PRIMARY_LOCALE__`), and new
     `tests/unit/i18n/primary-locale-client.test.ts`.
   - Run `pnpm test --run`, then write into Comments the list of tests the `zh-TW` fallback flips,
     with the command (expected: none; cross-area note 1).
   - No other change in this wave.
1. **Upstream's move, the declaration and the build.**
   - (a) Pin the root `yaml` to exactly `2.9.0` (`package.json`, `pnpm-lock.yaml`).
   - (b) B93's helper: `tests/__helpers__/upstreamDecision.ts`, `tests/unit/scripts/upstream-guard.test.ts`.
   - (c) The declaration:
     - rows Y2–Y6, Y9, Y12–Y14, Y19, Y21, Y23 and Y112 (their read and validator halves);
     - files `.vitepress/challenge/config.ts` and `declaration.ts`;
     - tests `tests/unit/challenge/config.test.ts` and `declaration.test.ts` (Y-q6).
   - (d) The pure build modules:
     - rows B18, B19, B20–B36, B91, B39, B41, B42, B46, B56–B58, B62–B69, B92, B94, B72, B73, B75 and B95;
     - existing files `.vitepress/source-layout.ts`, `pageList.ts`, `theme/i18n/pages.ts` (BC3 rename),
       `theme/i18n/arrival.ts` (the renamed call), `theme/i18n/index.ts` (BC7) and `layout-error.ts`;
     - new files `.vitepress/locales-config.ts`, `home-links.ts` and `primary-folder-links.ts`;
     - their tests: `source-layout`, `page-list`, `locales`, `messages-shape`, and new `locales-config`,
       `home-links`, `primary-folder-links` and `layout-error`.
   - (e) The move (D108): run T-0076's `planLayoutMove` on upstream's tree. This writes `platform/en/…`,
     `platform/zh-TW/…` and the four `platform/challenge/<slug>/challenge.yaml`. In the same commit:
     - `PLATFORM_HOME_RELS`: U113–U116, U145 and U152, in `scripts/fork-init.ts`, `fork-init.test.ts`,
       `upstream-guard.test.ts`, `create-wxl/test/helpers/fixtures.mjs` and `engine-apply.test.mjs`
       (otherwise U116's real-tree case fails between the two);
     - the interim plain text in `platform/zh-TW/guide/notes.md` (no `../../` link).
   - (f) Wiring:
     - `.vitepress/config.mts`, in this order: `SITE_BASE`, `readPrimaryLocale`, `checkSourceLayout`;
       then `srcExclude`, `rewrites`, `locales`, the defines, `pageListFromDir(srcDir, P)`,
       `transformPageData` by `filePath` with assembly and `localizeHomeLinks`, and the PL-E11 plugin.
       Rows B14, B16, B24, B25, B40, B43, B47, B50–B52, B60 and B77, plus the BC15 comments.
     - Assembly in `.vitepress/challenge/plugin.ts`: Y1 (read half), Y19, Y38, Y40–Y48 and Y113 (plugin
       half).
     - The hero links in `platform/{en,zh-TW}/index.md` (B70's unit half).
     - Delete `.vitepress/theme/Layout.vue` (B80).
     - The slug helper and `ChallengeLayout.vue` (Y49, Y50).
   - (g) The built-site rows that need no smoke fixture: B48, B59, B61, B70 (smoke half), B81 and B82
     (`site-smoke.spec.ts`, and the comment in `playwright.site.config.ts`). The site-smoke suite is
     fully green only after wave 3.
2. **Routing (area A).**
   - First switch the callers to `primaryLocale()` and measure the flipped tests again into Comments
     (cross-area note 1).
   - Rows: DT01–DT80, SW01–SW16, A1–A33 and A39 (their unit halves), and B45.
   - Files:
     - `.vitepress/theme/i18n/index.ts` (`pageLocaleOf`, P arguments, `DEFAULT_VISITING_LOCALE`
       removed: A12), `lookup.ts` and `arrival.ts`;
     - `theme/composables/useArrivals.ts` and `theme/index.ts`;
     - `LocaleSwitcher.vue`, `MergedNav.vue`, `ChallengeList.vue`, `HomeContent.vue` (`pageLocaleOf`
       only) and `MissingTranslationLine.vue`;
     - the A36 comments, written with the code.
   - Tests:
     - new `tests/__helpers__/localeTables.ts` and `tests/unit/i18n/page-locale-of.test.ts`;
     - `initial-locale-redirect`, `not-found-wiring`, `arrival`, `route-locale-sync`, `localize-path`,
       `locale-switcher` and `theme-locale-wiring`;
     - the four component tests, `challenge-rwd` and `messages-shape` (A31).
3. **Lists and smoke fixtures.**
   - Rows: L1–L20, L22, L34–L39, L47 and L43 (run only), B79, B44, Y113 (loader half) and Y39.
     Also area A's smoke halves (A1–A5, A8, A14, A15, A17, A20, A21, A30) and D54's `localePath`
     (cross-area note 7).
   - Files:
     - `platform/shared/mergeChallenges.ts` and `challenges.data.ts`; delete `challenges.zh-TW.data.ts`;
     - both `messages/*.json` files;
     - `.vitepress/pageList.ts` (`isSmokeFixturePage`) and `config.mts` (`WXL_SMOKE_PAGES`, the smoke
       `srcExclude` entries);
     - `platform/{en,zh-TW}/smoke-fixtures/…`, the four list and home pages (`:lists="data"`), and the
       components' `lists` prop;
     - `.github/workflows/quality-gates.yml` (the `site-smoke` env, the `build` PAT4 step).
   - Tests:
     - `merge-challenges`, `challenge-data-loaders`, `ChallengeList`, `HomeContent`, `config-base` (L34)
       and `page-list` (L35);
     - new `client-graph-no-smoke-fixtures` and, if L-q5 is approved, `smoke-fixture-switch`;
     - `missing-translation.spec.ts` and `site-smoke.spec.ts` (`SITE_PAGES`, `pageUrlOf`).
4. **Generator, numbers, brief check and T-0059 (full mode), and the copy control.**
   - In this order: S52; S75, S19, S20 and S17 (with Y85's number half and Y104's shared
     `isChallengeNumber`); S1–S27 and S51 (full mode), with B38's generator half; S35 and S21
     (`briefFaults`); S28–S34 on the real tree, with `platform/public/_redirects` regenerated to S-§4.1;
     S53–S55 (components); S56 (smoke).
   - Files:
     - `scripts/generate-redirects.ts` and `scripts/challenge-numbers.ts`;
     - `.vitepress/challenge/shortLink.ts`, which exports the slug grammar once;
     - `ShortLinkShare.vue` and `ChallengeList.vue` (`hasCopyControl`);
     - the S64–S68 comments.
   - Tests: RG, RT, CN, `shortLink`, `ShortLinkShare*`, `ChallengeList`, `MergedNav` and
     `site-smoke.spec.ts` (`expectedUrlFor`).
5. **Tools and skills.**
   - `challenge:validate` (`scripts/challenge-validate.ts`, `tests/challenge-validate.test.ts`):
     - rows Y1 (validate half), Y2–Y6, Y9 and Y12–Y14 (validate halves), Y20, Y22, Y24–Y37, Y103, Y104 and
       Y111's validate clause;
     - B38's validate half.
   - `challenge-lint-staged` with D122's index read: Y88 and Y89 (`scripts/challenge-lint-staged.ts`,
     `tests/challenge-lint-staged.test.ts`).
   - keygen: Y20 and Y21 (keygen halves), Y52–Y61, Y107 and B38's keygen half.
     - Measure Y-O5 in a scratch clone before Y58. If D80 (b) cannot hold, stop for the user (D133).
     - If Y55 needs `wasm-pack`, it moves to V-Y5.
   - retype and analyze: Y62–Y69 and Y108.
   - `create:challenge`: Y70–Y85 and Y105 (`scripts/create-challenge.ts`, both create-challenge tests,
     `DEFAULT_TREE`).
   - verify L1 and L2: Y86, Y87 and Y109.
   - The L4 package: Y91–Y93 and Y110.
   - The skills, in both trees: Y94–Y96 and S72, with PAT6 (D135) and a twin `diff` of each changed file.
6. **The hook and T-0059 (hook half).**
   - Rows: S36–S49, S73–S80, S51's hook half, Y90 and Y111's hook and redirects clauses.
   - Files: `scripts/pre-commit.sh`; `generate-redirects.ts` (`--staged` with the index's `range.json`,
     `--describe-untracked`); `tests/__helpers__/preCommitRepo.ts` (`COPIED_FILES` gains the
     T-0076 modules) and PC.
7. **Area U's switch parts and T9.**
   - Rows: U112 (`ANCHOR_PATHS` in `create-wxl/src/merge-plan.mjs`, `upgrade-report.test.mjs`), U133
     and U136 (`create-wxl/test/fixtures/page-predicate.json`, `layout-move.test.mjs`,
     `source-layout.test.ts`), U130–U132, U134, U139 and U147 (new
     `tests/unit/site/upstream-equality.test.ts`), and U142.
   - U142 adds `fetch-depth: 0` on `quality-gates.yml` jobs `test` and `fork-init-cross-os` and on
     `release.yml` job `release`, with new `tests/unit/workflows/checkout-tags.test.ts`.
   - U131 is run again after wave 8, because it gates every page edit against U-§5 (D130).
8. **Documents and GLOSSARY.**
   - First the GLOSSARY: B90 from `git show a2ac5b6:GLOSSARY.md` without U135's 設定紀錄 and 搬家
     sentences, with LH3 (語系標記), A37 (主語系) and S71 (短連結) checked on top of it.
   - The 設定紀錄 entry keeps 「建立靶場的指令與升級都會寫入它」 and 「開發模組照它套用設定是之後的事」
     verbatim (D148), so `upstream-config.test.mjs` U10 is unchanged (cross-area note 3 superseded).
   - Then: B84–B86 (`README.md`, `README.en.md`), B87 (ADR-0008), A34 and A35, S69 and S70, Y97–Y101,
     and LH1's difficulty-badge clause, LH2 and LH4.
   - Tests: `glossary.test.ts` and `sentence-map.test.ts` pass; both languages where a passage has two.
9. **Green, and the records.**
   - Run `pnpm test --run`, `pnpm build`, `WXL_SMOKE_PAGES=1 pnpm build && pnpm test:smoke`,
     `pnpm test:challenges`, `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test`
     and `python3 scripts/verify-project.py`.
   - Run `docs:build` on a copy with `{"primaryLocale":"en"}`.
   - Record the output of PAT1 and PAT3.
   - Write the coverage report table, then stage 6.
   - After landing, add T-0059's Comments entry naming this ticket's merge.
- 2026-11-16 (stage 5): the test plan is approved under the user's standing authorization of
  2026-11-15 and listed to the user, with the decision summaries of every D-number above (local copy
  `.proj.research/2026-11-16-t0077-decisions-zh-TW.md`). The plan's open items are settled by
  traceability revision 2.3 (D148–D150 and the closing paragraph). Status set to `processing`.

- 2026-11-17 (segment 4a, fix round): surface = vitest unit tests; no browser. Correction and addition to
  the segment 4a entry above (that entry is not rewritten).
  - S-q4 (S52 second half) settled as a static import assertion per traceability S52. New test in
    `tests/unit/challenge/shortLink.test.ts` ('scripts/generate-redirects.ts takes its page paths from
    challengePagePath (S-q4, AC-33)'). Red first: `AssertionError: expected '/**\n *
    generate-redirects.ts\n *\n *…' to match /import\s*\{[^}]*\bchallengePagePath…/`. Minimal change in
    `scripts/generate-redirects.ts` only, behaviour-preserving: import of `challengePagePath`, a
    `PRIMARY = 'en'` constant (segment 4b replaces it with the tree's P), and the three hand-built page
    paths replaced by `challengePagePath(...)`. Lines using `e.locale` and `CHALLENGE_TREES` untouched
    (4b). Result: shortLink.test.ts 30 passed; `tests/unit/site/redirects*.test.ts` 15 failed / 17 passed,
    the same 15 as before this fix. No file added to the index in this fix.
  - Correction to the 4a "Commands" baseline, which omitted 53 newly red tests (S19 removed `locale`
    from ChallengeNumberEntry). (a) Over the 11-file set: 5 failed / 313 passed before 4a, 68 failed /
    204 passed after; B18 command 2 is now green. (b) The 64 newly red, by owner: redirects-generated 11
    -> segment 4b (S1-S27); create-challenge-run 5 ('regenerates _redirects over the whole tree...',
    'replaces a stale file...', C04, C06, C07) -> wave 5 (Y70-Y85, Y84, DEFAULT_TREE rewrite);
    pre-commit-sh 48 -> wave 6 (S36-S49, PC); (the 48 is from the two checkers, not re-measured).
    (c) Cause: `scripts/generate-redirects.ts` reads the removed `locale` field (`e.locale` in the
    include filter and `challenge.locales.add(entry.locale)`; TS2339, unreported because scripts/ is
    outside the tsconfig include); 4b's rewrite fixes it, and its first generator cycle must remove both
    `e.locale` reads and `CHALLENGE_TREES`. (d) Hazard until 4b lands: `pnpm redirects:generate` and
    `pnpm build` on the live tree now silently write a `_redirects` holding only /zh/c and /zh-TW/c
    numeric rules instead of refusing; do not run either before 4b. (e) The carried-failure list for
    later suite runs gains these 53 until waves 5 and 6. Rejected alternative: a temporary old-layout
    walker in generate-redirects.ts (would be deleted by 4b, 53 red again, changes no outcome); reverting
    S19 would drop an approved row.

  - Deferred to stage 6 (P2, frozen rubric):
    - `scripts/create-challenge.ts:39` (P2, confidence low): the slug grammar still exists twice; `shortLink.ts` now exports `SLUG_GRAMMAR`, but `create-challenge.ts` keeps its own identical `SLUG_RE` literal. Switching consumers over is a later segment's job (4b generator, wave 5 create:challenge), not a row gap for 4a.
    - `tests/unit/scripts/challenge-numbers.test.ts:189` (P2, confidence medium): S20 row 5 (one retired folder with yaml 3 and legacy 14 gives 15) also passes for an implementation that reads only legacy `index.md`; only the combination with row 3 rules that out. A cell with yaml as the larger value in a shared folder would pin D63's "either or both; both count" by itself.
    - `tests/unit/scripts/challenge-numbers.test.ts:42` (P2, confidence high): the docstring of `writeRetired` still says "same shape, under the archive tree", but the helper it referred to (`writeChallenge`) is gone; it now writes the legacy `index.md` shape, not the declaration shape.
    - `scripts/challenge-numbers.ts:127` (P2, confidence medium): after S19 there is one entry per declaration directory, so the slug can never repeat; the `bySlug` grouping in `checkChallengeNumbers` is dead weight and its comment ("however many entries name it") describes a case that can no longer happen.
    - `scripts/challenge-numbers.ts:27` (P2, confidence medium): production comments name pipeline segments ("segment 4b removes this with the generator") and say the retired walk is "kept until ... rewritten"; that is process wording in shipped code.
    - `.proj.tickets/0010-primary-locale-layout/T-0077-layout-switch.md:2846` (P2, confidence high): the fix-round comment says "No file added to the index in this fix", but the executor staged the whole ticket file (its own report says so); the comment is factually wrong.
    - `.proj.tickets/0010-primary-locale-layout/T-0077-layout-switch.md:1` (P2, confidence high): the ticket file is outside `platform/` and not new, but it was staged, which the working-tree rules allow only for new files and files under `platform/`. Resolved by this segment's commit using pathspec form, which commits the ticket file with segment 4a instead of the wave-6 move commit.
  - Full suite (parallel run, JSON reporter): 6285 tests in total, 6216 passed, 69 failed, 0 skipped or todo; 773 suites, 25 failed; 5 test files failed. Not re-run with `--no-file-parallelism`, because every failure is on the allowed list. No flake seen. Both probe-directory cleanups ran; the globs matched nothing, so nothing was removed.

- (segment 4b, fix round) Executor applied the parent's fix list, test-first. Baseline before the edits (three files): 19 failed | 139 passed.
  - Finding 1+4 (S52 / S-q4, AC-33): red before the change was `AssertionError: expected '...' not to match /\/challenge\/(\$\{|:slug)/` (shortLink.test.ts:137). `scripts/generate-redirects.ts` S18 message now joins its two paths from arrays (brief and declaration); message bytes unchanged. shortLink.test.ts all green; the 8 S18 cases in redirects-generated.test.ts still green.
  - Finding 2+5: red before the change was 9 cases of `Cannot generate _redirects: the challenge tree is inconsistent.` thrown in makeRoot (create-challenge-run.test.ts:64). Only the C05 it.each seeded `seed: '# not the generated content\n'`; the four expects and the 9 cases are untouched. First run green because the red came from the fixture seed, not run(). The file now shows 8 failed (5 carried plus 3 declared), as predicted.
  - Finding 3 (S51): the case is now `the declaration tree only` with `challenge(r, name, 1, [])`; total stays 30. Green on first run because production's names already include the declaration tree's slug. Mutation (`names = new Set<string>()`) gave 10 failed | 26 passed, `expected [ '' ] to deeply equal [ Array(1) ]`; restored, 36 passed.
  - Remaining red in redirects-generated.test.ts: 'is byte-identical to what the challenge tree generates' (1 failed), not in this fix list. No file added to the index in this fix; no commit.

  - Deferred to stage 6 (P2, frozen rubric):
    - `tests/unit/site/redirects-generated.test.ts:596` (P2, confidence medium): the two S51 shadow rejection cases ('005' vs 5, '1234') assert only that generateRedirects throws; unlike the grammar cases they do not confirm with writeRedirects that no file is written
    - `scripts/generate-redirects.ts:24` (P2, confidence medium): shipped comments use pipeline wording ("Segments 4c and wave 6 rewrite this mode on the split layout.", and GenerateOptions "are rewritten on the new keys by segment 4c")
    - `scripts/generate-redirects.ts:385` (P2, confidence low): the `--staged` main flow and indexSlugs still key on 'root'/'zh-TW' while includeSlug is now asked with 'declaration' or a locale code, so --staged filters everything out and writes a file with no numeric rules; broken since 4a, not worsened by 4b; do not let the hook generate and stage this file before wave 6
    - `scripts/generate-redirects.ts:392` (P2, confidence low): CLI full mode checks that platform/public exists before writeRedirects; with platform/public missing and a broken range.json, the first stderr line is 'platform/public not found', not a PL line (edge case, existing behaviour; D123)
    - `tests/unit/site/redirects-generated.test.ts:359` (P2, confidence low): 'writes no file at all when the tree is inconsistent' uses a bare toThrow(), which also passes when the layout check (PL code) throws instead of the number fault
    - `tests/unit/site/redirects-generated.test.ts:714` (P2, confidence medium): the S51 shadowing cases check only that generateRedirects throws the exact line, not that writeRedirects writes no file as the row's "full: ... no file" clause asks; the order is pinned structurally and by S51a
    - `scripts/generate-redirects.ts:254` (P2, confidence medium): the generator writes the D64(b) message itself; traceability line 222 calls for one message source (`checkChallengeNumbers` label `number`); S18's AC is met
    - `scripts/generate-redirects.ts:389` (P2, confidence high): between waves `--staged` is semantically broken on any tree (indexSlugs keys vs includeSlug 'declaration'|'en'|'zh-TW'; every indexed zh-TW brief raises 'has no declaration'); the hook (pre-commit.sh:517) calls `--staged`, covered by the planned wave-6 reds and the carried guard test; fine provided nothing is committed before wave 6
    - `tests/unit/site/redirects-generated.test.ts:167` (P2, confidence low): in the S4 case the plan row's fixture says 'no range.json' but the test sets {"primaryLocale":"zh-TW"}; S10 covers the absent file separately
    - `scripts/generate-redirects.ts:392` (P2, confidence low): the CLI full mode checks `platform/public` exists before reading range.json, so with both faults it reports 'platform/public not found' instead of the PL-E01 to PL-E06 line D123 calls for first (edge case)
  - Full suite (parallel run only; not re-run with `--no-file-parallelism`, since no unexpected failures): 6381 tests in total, 6256 passed, 13 failed, 112 skipped/todo; 786 test files/suites, 13 failed suites (includes tests/pre-commit-sh.test.ts, which failed at collection with 0 tests run). No flakes observed. The 11 fixture generateRedirects cases (segment 4b) now pass.

- 2026-11-17 (segment 4c, fix round): F1, the one defect behind both P0 findings. `scripts/generate-redirects.ts` spelled three repository-relative paths as template literals containing `/challenge/${`, which turned shortLink.test.ts's S52 / S-q4 / AC-33 source check red.
  - Red before the change: `npx vitest run tests/unit/challenge/shortLink.test.ts` gave 1 failed | 29 passed; `AssertionError: expected '\n\nimport { writeFileSync, existsSyn...' not to match /\/challenge\/(\$\{|:slug)/`. No test added or edited (the existing case is the failing test).
  - Change: `briefPath` now joins an array, new `declarationPath(slug)` does the same for `platform/challenge/<slug>/challenge.yaml`, and the two remaining template literals (the `present` fallback and `missing`) use it. Output strings are byte-identical.
  - After: shortLink.test.ts, redirects.test.ts and redirects-generated.test.ts all green (3 files, 195 passed). No file added to the index; no commit.

  - Deferred to stage 6 (P2, frozen rubric), segment 4c final review:
    - `tests/unit/site/redirects.test.ts:764` (P2, confidence medium): two parts of the D64 sort survive mutation: missing-declaration versus old-layout within one slug, and the `present` tiebreak (briefs come out in LOCALES order and legacyPaths are pre-sorted, so dropping `cmp(a.present, b.present)` stays green). The row's AC (S-§4.7 example verbatim) is met.
    - `scripts/generate-redirects.ts:23` (P2, confidence medium): the deleted sentence "Segments 4c and wave 6 rewrite this mode on the split layout" leaves the `--staged` description reading as finished, but wave 6 still owes `--staged` with the index's range.json (the `--staged` branch still reads the working tree's range.json, D67).
    - `tests/unit/site/redirects.test.ts:438` (P2, confidence medium): S29 takes slugs from git's index but reads each number from the working-tree challenge.yaml; harmless while the unstaged diff under platform/ is empty, but S28 materialises the index for exactly this reason.
    - `tests/unit/site/redirects.test.ts:29` (P2, confidence high): the RT header comment is stale (root-locale wording, orphan-subset reasoning, "Introducing a rewrites mapping…", `platform/<prefix>/<slug>/` resolution, spec 0008 G1–G3); this is S64–S68's stage-6 comment row, outside 4c's scope.
    - `tests/unit/site/redirects.test.ts:473` (P2, confidence medium): S33's non-vacuity case hard-codes upstream's slug `door-is-open` without `upstreamOnlySkipReason`, so it fails in a range or fork that removed that demonstration challenge (D124/D54: derive from P and the tree).
    - `tests/unit/site/redirects.test.ts:318` (P2, confidence low): `indexPrimaryLocale()` runs at describe-collection time in three describes, so a malformed index `range.json` fails the whole file at collection instead of one test.
  - Full suite (parallel, one pass): 6418 tests in total, 6297 passed, 9 failed, 112 skipped, 0 todo; 795 suites, 8 failed suites (1 whole-file collection failure: tests/pre-commit-sh.test.ts). No flake check needed since every failure matched an allowed entry. The first command attempt aborted on a zsh no-match glob in rm, so the suite was re-run correctly. The 4 redirects tests (redirects-generated.test.ts and the 3 in redirects.test.ts) now pass.

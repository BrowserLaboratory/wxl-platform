---
id: T-0077
title: The layout switch
epic: 0010-primary-locale-layout
status: todo
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
D138, D141; and the interim plain-text mention in the notes page above.

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

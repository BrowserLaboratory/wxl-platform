---
id: T-0080
title: The Traditional Chinese reference page and the completeness test
epic: 0010-primary-locale-layout
status: todo
blocked_by: [T-0077, T-0079]
---

## Context

Upstream has one page without a Traditional Chinese version, the attack-log export-format
reference. Before this epic it was the English-only subject of `missing-translation.spec.ts`; T-0077
gives that role to the smoke fixture pages (D49), so the page can now be translated (D51) and a guard
can keep upstream complete (D52). Both land in or after the switch, never before (T5): without the
fixtures, translating the page would leave the missing-translation suite with no English-only
subject.

- **The page** (D51): `platform/zh-TW/reference/attack-log-export-format.md` keeps every heading,
  every table row, every fenced block byte for byte and every inline code span of the English page;
  only prose is translated. The agent drafts it; the user reviews the prose at stage 6.
- **The link** (D16): `platform/zh-TW/guide/notes.md` then links to it with the same-folder form
  `../reference/attack-log-export-format.md`, replacing T-0077's interim plain-text mention (T-0077
  removes the old link because no link to the English page builds under both primaries: B72, B74).
  Every relative link upstream then stays inside its locale folder. B71's plugin half (no PL-E11 for
  a same-folder link, both primaries) tests T-0077's link plugin (0010-S6), which exists when this
  ticket starts.
- **The guard** (D52): an upstream-only unit test, decided by `tests/__helpers__/upstreamDecision.ts`
  (D124), fails when a page of the production page list (fixture pages excluded) lacks a version in
  any listed locale; in a range it reports skipped, since translations there are optional.

**Files shared with T-0079.** The two tickets are not ordered, so they must not change the same
file (workflow, stage 4). This ticket's built-site checks (B71, L41) go in
`tests/site-smoke/site-smoke.spec.ts`; T-0079's go in its new `list-strings.spec.ts`. This ticket
does not edit `ChallengeList.vue`, `HomeContent.vue`, the string tables, the list pages,
`guide/troubleshooting.md` or `GLOSSARY.md`. If stage 5 finds that a file of T-0079's must change
here, stop and ask the user to order the two tickets.

**Decisions to confirm before implementing:** D52. (D16 and D51 are stage 1 decisions, realised.)

Spec: `spec.en.md` revision 2, AC-8, AC-24, AC-55, AC-61; `traceability.md` revision 2, D16, D51,
D52, D124, constraint T5, "Overridden contracts › Area L" (the one-page-without-a-translation row);
the claim table in `tickets.md`.

## Deliverable

Every upstream page exists in both locales; the Traditional Chinese notes page's export-format link
opens the Traditional Chinese reference page under either primary locale; a new upstream page
without a translation fails the unit suite on upstream and is skipped in a range.

## Acceptance criteria

- [ ] L40: the two reference pages have the same number of headings per level, the same table row
  count per table, byte-identical fenced blocks and the same multiset of inline code spans;
  upstream-only; stage 6 records the user's review of the prose (AC-24)
- [ ] L41, B78: `zh-TW/guide/notes.md` holds `](../reference/attack-log-export-format.md)` and no
  `../../`; on the test build its `href` is the Traditional Chinese reference page's URL, checked in
  `site-smoke.spec.ts` (AC-24, AC-8)
- [ ] B71: a same-folder relative link resolves inside the page's locale for both primaries; on the
  built upstream site `dist/guide/notes.html` links to `/reference/attack-log-export-format` and
  `dist/en/guide/notes.html` to `/en/reference/attack-log-export-format` (AC-8, which this ticket
  closes; B72–B77 and B79 are T-0077's)
- [ ] L42: the completeness test passes on upstream, reports skipped when `isUpstreamDecision` is
  false, and fails naming the page and locale on a fixture page list missing one translation (AC-24)
- [ ] V-B1–V-B7 (AC-55, and AC-61 with T-0077's B93), as below
- [ ] "Overridden contracts › Area L": the row "Upstream has one page without a Traditional Chinese
  version" changes only as stated

## Stage 8

Its rows reach V-B3 and V-B4 (B71: the link opens the Traditional Chinese reference page), and it
claims the V-B table (AC-55, AC-61). Area B's rows are also in T-0077 and in T-0081 (B88, B89, which
move to whichever ticket of the epic lands last, tickets.md "Open items", 2), and this ticket is not
ordered against T-0081, so area B's last ticket (T8) is whichever of this ticket and the holder of
B88 and B89 lands second. No V-B row reaches B88 or B89 (V-U5 cites B89, and runs in T-0081); this
ticket runs the V-B table in full in any case, and if the holder of B88 and B89 lands after it, that
ticket runs it in full again. Here: V-B1, V-B2, V-B5 and V-B6 in the terminal on scratch copies (F-6),
V-B6 also in the Browser panel; V-B3 in the Browser panel on F-1 `stage8/T-0080`'s Cloudflare Pages
preview; V-B4 on a temporary GitHub Pages range created from F-1's head and redeployed with
`{"primaryLocale":"en"}`; V-B7 in the terminal on a scratch clone of F-2 `stage8/T-0080-en`. If this
ticket lands after T-0079, it also runs VL1–VL9 in full, as T-0079's Stage 8 lists them. Pushing the
branches, creating the temporary range and deleting them each need the user's approval first.

## 給使用者（zh-TW）

上游唯一沒有繁中版的頁面是攻擊紀錄匯出格式的參考頁。T-0077 讓 smoke 測試改用專用的測試頁之後，這一頁就可以翻譯了（D51）：標題、表格列、程式碼區塊與行內程式碼都和英文版一模一樣，只翻散文；初稿由 agent 寫，第 6 階段請你審。繁中 `notes.md` 補回連結，用同一個語系資料夾裡的寫法指向這一頁，取代 T-0077 暫時只寫頁名、不加連結的文字。另外新增一個只在上游執行的測試（D52）：上游任何一頁缺了某個語系的版本就失敗，老師的靶場裡則略過。第 8 階段要把 V-B1–V-B7 全部重跑；建置區還有 T-0081 帶的 epic 收尾兩列（B88、B89），如果帶著它們的那張票比這張晚合併，那張票會再全部跑一次。這張票和 T-0079 沒有先後順序，所以不改同一個檔案：連結的建置後檢查放在 `site-smoke.spec.ts`。要確認的決策：D52。

## Comments

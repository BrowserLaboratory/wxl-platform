---
id: T-0079
title: Every Traditional Chinese list string is right in static HTML and after hydration
epic: 0010-primary-locale-layout
status: todo
blocked_by: [T-0077]
---

## Context

T-0060 (epic 0008, `pending`) found that the Traditional Chinese challenge list's toolbar stays
English in the static HTML and after hydration: the placeholder and the button titles use the
runtime `$t`, the static HTML is built with the runtime locale `en`, and Vue's hydration does not
re-apply element props. On 2026-11-06 the user took it into this epic; spec 0010 widens it (D44) and
this ticket replaces it (D55, D134). After T-0077 the primary locale is Traditional Chinese, so the
same defect reaches the page a learner sees at `/challenges` and the home page at `/` (D47).

The widened scope: every string of `ChallengeList` that is not data is a page-locale string or comes
from the list page's own frontmatter (`title`, and a new `subtitle` key, not `description`, so the
site-level `<meta name="description">` stays, L46); `HomeContent`'s strings are page-locale strings
(D47); both components format dates with the page locale's tag in UTC (D45); the difficulty literals
and declared values stay as written (D46); a missing `lists` prop renders an empty list and warns
once per component instance (LW1, D40, D131). The canonical table is L-§4.4.

**Files shared with T-0080.** This ticket and T-0080 are not ordered (both are blocked only by
T-0077), so they must not change the same file (workflow, stage 4). This ticket's built-site checks
(L33 and L46) go in the new `tests/site-smoke/list-strings.spec.ts`, which `playwright.site.config.ts`
already matches; it does not edit `tests/site-smoke/site-smoke.spec.ts` (T-0080's B71 and L41
checks), `GLOSSARY.md` (T-0077 writes LH3; T-0081 edits it for U135) or `platform/zh-TW/guide/notes.md`.
If stage 5 finds that a file of T-0080's must change here, stop and ask the user to order the two
tickets.

It needs the `lists` prop and `pageLocaleOf` from T-0077 (T6). T-0077 already makes the components
read `lists[pageLocaleOf(…)]`; this ticket makes their strings and dates follow the same page locale
and claims L23 with them. D55 named L18–L33 for the replacement; L18–L22 belong to the loader and
the merge, which T1 puts in T-0077, so this ticket carries L23–L33 as T6 states.

**Decisions to confirm before implementing:** D44 (the `subtitle` key, from the self-check), D45,
D47, D131. D134 (T-0060's status) is confirmed with this breakdown and applied when this ticket
lands.

Spec: `spec.en.md` revision 2, AC-22, AC-26, AC-57; `traceability.md` revision 2, D44–D47, D55,
D131, D134, L-§4.4, constraint T6, "Overridden contracts › Area L" (the toolbar, dates and home-string
rows, LW1 in the prop row, LH1–LH5); T-0060.

## Deliverable

`/challenges`, `/en/challenges`, `/` and `/en/` show every list and home string of L-§4.4 in the
page's locale in the static HTML and after hydration, under either primary locale and whatever the
stored preference; dates read the same in every time zone; a page passing the old `challenges` prop
gets an empty list and one LW1 warning per component instance.

## Acceptance criteria

- [ ] L23: for each (`P`, `localeIndex`) of the four, with the runtime locale the other one, the
  component renders `lists[pageLocale]` and CS3–CS10 and CH1 in the page locale, in SSR and after
  mount (AC-22)
- [ ] L24, L25: CS1 and CS2 from the list page's `title` and `subtitle`; CS10 in static HTML and
  after filtering to zero (AC-22)
- [ ] L26: dates are the UTC calendar day in the page locale's tag in three time zones (AC-22)
- [ ] L27, L28: borrowed entries' mark and `lang` in static HTML; none in the primary list (AC-22)
- [ ] L30, L31: home counts and latest cards over `lists[pageLocale]`; search, filters, sort and the
  solved badge on borrowed entries (AC-22)
- [ ] L32, L45: a missing prop or a missing locale key renders an empty list without throwing; LW1
  once per component instance, only for a missing prop (AC-22)
- [ ] L33: `tests/site-smoke/list-strings.spec.ts` on the upstream test build, JavaScript disabled and after
  hydration, for both lists and both home pages; paths from D54's helper (AC-22)
- [ ] L46: the list pages' `<meta name="description">` is the site's description and the subtitle
  only in `header p`, checked in `list-strings.spec.ts` (AC-22)
- [ ] L44: stage 6 confirms LH1–LH5 on the epic's diff, in both languages where a passage has two;
  this ticket writes LH1's list-title row removal; T-0077 wrote LH1's difficulty-badge clause, LH2,
  LH3 and LH4, the passages the switch made false; LH5's sentence on the renamed prop is release-note
  input, which the close-out collects with B89 (AC-26)
- [ ] T-0060's first criterion: the cause of the sort-direction and view-mode `title`s (the
  placeholder's, or their own) is recorded in Comments at stage 5
- [ ] "Overridden contracts › Area L": the toolbar row, the dates row, the home-strings row and LW1 in
  the prop row change only as stated
- [ ] VL1–VL9 (AC-57), as below
- [ ] After landing, T-0060 is set to `done` after the merge, its `pending_*` fields and
  `revisit_when` kept as history, with a Comments entry naming this ticket and the date (D134)

## Stage 8

Its rows reach VL1, VL2, VL4 and VL9, and it claims the VL table (AC-57). Area L's last ticket (T8)
is whichever of this ticket and T-0080 (L40–L42) lands second, so the table runs in full twice at
most: this ticket runs VL1–VL9 in full in any case, and if T-0080 lands after it, T-0080 runs them
in full again. Here: VL1 by `curl -s` and VL2–VL4 in the Browser panel on F-1 `stage8/T-0079`'s
Cloudflare Pages preview; VL5 on a temporary GitHub Pages range from F-1's head; VL6 in the terminal
on the ticket branch and against F-1's preview; VL7 and VL8 on `pnpm docs:dev` in a scratch clone
(F-6), terminal and Browser panel; VL9 by `curl -s` and in the Browser panel on F-2
`stage8/T-0079-en`. Challenge pages are opened with the Browser panel open. Pushing the branches, creating the temporary
range and deleting them each need the user's approval first.

## 給使用者（zh-TW）

取代 T-0060，範圍放寬（D44、D47）：題目清單上不是資料的每一段文字——標題、副標、搜尋框提示、篩選與排序選項、排序方向與檢視模式按鈕的說明、筆數、沒有結果時的訊息——以及首頁的文字，在 JavaScript 載入前的 HTML 與載入後都用這一頁的語系。清單標題與副標改由 `challenges.md` 的前置資料 `title` 與 `subtitle` 提供（不用 `description`，以免蓋掉網站的 meta description）。日期改用頁面語系、以 UTC 計日，各時區看到同一天。仍傳舊 `challenges` 屬性的頁面會得到空清單，並在每個元件實例警告一次。T-0077 切換後主語系變成繁中，這個問題會直接出現在 `/challenges` 與首頁上，所以要在這個 epic 修掉。這張票和 T-0080 沒有先後順序，所以不改同一個檔案：清單的建置後檢查放在新的 `list-strings.spec.ts`，不碰 T-0080 會改的 `site-smoke.spec.ts`。第 8 階段把 VL1–VL9 全部跑一次；如果 T-0080 比這張票晚合併，T-0080 會再全部跑一次。這張票落地後，T-0060 依 D134 改為 `done`。要確認的決策：D44、D45、D47、D131。

## Comments

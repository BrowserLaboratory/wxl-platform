---
id: T-0060
title: The Traditional Chinese challenge list's toolbar reads in Traditional Chinese
epic: 0008-missing-translation-fallback
status: pending
blocked_by: []
pending_reason: "Seen in passing in T-0057's stage 8; the placeholder part has been recorded in ChallengeList.vue's comment since 2026-10-10, before epic 0008, with no ticket. A learner on the default-language list sees English controls. The user's standing instruction of 2026-11-06 (follow the recommendations) opens it as a pending ticket."
pending_evidence: "T-0057's stage 8 record, 'Seen in passing, outside this ticket' (zh-ui.cjs, headless Chromium; the same on https://wxl.browserlab.online and on stage8-t-0056). New observations, 2026-11-06: in the same run the dates read 2026年4月2日 while the placeholder and titles stay English; `curl -s https://wxl.browserlab.online/zh-TW/challenges | grep -o 'title=\"[^\"]*\"\\|placeholder=\"[^\"]*\"'` prints placeholder=\"Search challenges, descriptions, tags…\", title=\"Ascending\", title=\"Grid mode\". ChallengeList.vue:25-35 (git blame 2026-10-10) records the placeholder as measured on a real build."
pending_on: 2026-11-06
revisit_when: "The next change to ChallengeList.vue's toolbar or to how the theme resolves interface strings at the page locale."
---

## Context

On `/zh-TW/challenges` the list's toolbar uses the runtime `$t`: the search box's placeholder, the
sort-direction button's title and the view-mode buttons' titles. The static HTML is built with the
runtime locale `en`, so it carries the English strings, and after hydration they stay English even
when the runtime locale is `zh-TW`; the dates, which are text, do follow it. For the placeholder the
cause is already recorded (`ChallengeList.vue:25-35`, measured on a real build): it is an element
prop, and Vue's hydration does not re-apply props. The sort-direction and view-mode `title`s are
likely the same, not yet confirmed. The mark,
the copy control and the short link already resolve at the page locale (`tp`), which is the
pattern spec 0008 uses for strings that must be right in the static HTML.

## Deliverable

The Traditional Chinese list's toolbar strings read in Traditional Chinese in the static HTML and
after hydration, and the English list's in English, whatever the stored value.

## Acceptance criteria

- [ ] The `title` attributes are confirmed to share the placeholder's cause, or their own cause is recorded here
- [ ] The toolbar's placeholder and titles resolve at the page locale, with a component test reading the SSR output of both lists
- [ ] A site-smoke case checks one toolbar title on `/zh-TW/challenges` after hydration

## 給使用者（zh-TW）

繁中題目清單的工具列（搜尋框的提示文字、排序方向與檢視模式按鈕的說明）在 JavaScript 載入後仍是英文，日期則是繁中。搜尋框的部分 2026-10-10 就記錄在元件的註解裡，比 epic 0008 更早：Vue 在 hydration 時不會重新套用元素屬性。這張票先確認按鈕說明也是同一個原因，再讓工具列改用頁面語系的文字。

## Comments

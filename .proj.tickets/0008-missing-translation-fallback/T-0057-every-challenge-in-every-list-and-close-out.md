---
id: T-0057
title: Every locale's list shows every challenge, and the epic's full stage 8
epic: 0008-missing-translation-fallback
status: todo
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

Spec: `spec.en.md` revision 3, "Locale challenge data", "Challenge link"; `traceability.md` revision 3,
decision G7, seam 0008-S4, the locale-challenge-data schema and merge rules, the marks, rows E1–E10,
F3, F6, H4, H5, and the full V table.

## Deliverable

Both locales' data loaders return every challenge per the merge rules, with the new `locale` field.
The Traditional Chinese list, in list and grid view, and the home page's latest cards show an
English-only challenge with its English title and summary (`lang="en"`), the mark `只有英文` already in
the static HTML, and a link to the English page; the copy control gives `/zh-TW/c/NNN` in short mode and
the English page URL in page mode. Counts, search, filters and the solved badge include it. OQ-023 is
closed and the other open questions updated; AGENTS.md no longer calls `platform/zh-TW/` a mirror.

## Acceptance criteria

- [ ] E1–E10: merged data, `id`s, defaults, the mark in list view, grid view and home cards in static HTML, counts, search, filters, solved badge, no short link without a number or for an entry with only a Traditional Chinese brief (AC-6)
- [ ] F3, F6: the untranslated entry's short and page links (AC-7)
- [ ] H3 (this ticket's part): troubleshooting's passages on the two lists holding different challenges and numbering independently, and the guide index's sentence that the lists number independently, both languages (AC-9)
- [ ] H4: OQ-023 closed; OQ-016, OQ-018 and OQ-024 updated as the row states (AC-9)
- [ ] H5: AGENTS.md's Repository layout (AC-9)
- [ ] H7 across the whole epic's documents (AC-9)
- [ ] Overridden contracts touched here (`challenge-data-loaders.test.ts`) change only as the traceability table states
- [ ] Stage 8 (T4): the full V table — V1a–V1l on the Cloudflare preview of `stage8/T-0057`, V2 on a temporary GitHub Pages range, V3 — after T-0053 to T-0056 have landed; then, with the user's approval, delete the throwaway branch, its preview and the temporary range (AC-10)

## 給使用者（zh-TW）

讓繁中題目清單（清單與格狀檢視）和首頁也列出只有英文的題目：顯示英文標題與摘要，加上「只有英文」標記（JavaScript 還沒載入時就看得到），點進去開英文頁，複製按鈕給 `/zh-TW/c/NNN` 或英文頁網址。計數、搜尋、篩選、已解題徽章都算進去。這張票最後落地，負責關閉 OQ-023、更新其他 open question 與 AGENTS.md，並跑整份第 8 階段驗證表，驗完經你同意後刪掉拋棄式分支、preview 與臨時靶場。

## Comments

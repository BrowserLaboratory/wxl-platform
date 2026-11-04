---
id: T-0054
title: The cold-load redirect goes only to a translation that exists, and only explicit choices write the preference
epic: 0008-missing-translation-fallback
status: todo
blocked_by: [T-0053]
---

## Context

The cold-load redirect sends a learner with no stored preference, or one who chose Traditional
Chinese, from an unprefixed page to its `/zh-TW/` counterpart without checking it exists (OQ-023).
Separately, the Layout's route watcher writes the URL's locale into the stored preference on every
cross-locale navigation, so a Traditional Chinese reader who follows a link to an English-only page
silently becomes an English reader. This ticket makes the cold-load redirect consult the page list and
narrows preference writes to explicit choices (U1).

Spec: `spec.en.md` revision 3, "Locale routing" (the cold-load bullet), "Writing the preference";
`traceability.md` revision 3, decisions D4, D5, D13, D16, the requested-locale table, the decision
table A1–A7, rows W2–W5, and the overridden contracts for the route watcher, `shouldPersistOnColdLoad`
and the cold-load redirect. Blocked by T-0053, which changes the same theme and i18n modules and
provides the page list, the classification and the line.

## Deliverable

A cold load of an unprefixed page redirects to its `/zh-TW/` counterpart only when the counterpart is
a published page; otherwise the learner stays and sees the line in `zh-TW`. A cold load of a
published `/zh-TW/` page, including through a short link's redirect or a reload, writes `zh-TW`,
decided after the router resolves. Nothing else writes the preference: not links, Back, Forward, or the
site's own redirects. The interface locale still follows the URL.

## Acceptance criteria

- [ ] A1–A7: the full decision table — stored values × challenge and article × base — redirect or stay, line or not, write or not; redirect to a list entry with `replace`, base, query and hash; gate wait (AC-2)
- [ ] W2–W4: written only by a cold load of a published `/zh-TW/` page (reload and short-link redirect included), decided after the router resolves; not by a not-published path, a failed load, or an unprefixed cold load (AC-11). W5 — the route watcher writes nothing — landed with T-0053 (U12, 2026-11-05).
- [ ] L1, L5, L6 exercised for cold-load arrivals and later navigation (AC-5)
- [ ] H1b (this ticket's part): the route watcher's comment, `shouldPersistOnColdLoad`'s documentation and the `enhanceApp` comment state D5, D13 and D16 (AC-9)
- [ ] H3 (this ticket's part): the troubleshooting entry states D13, both languages (AC-9)
- [ ] H7 (AC-9)
- [ ] Overridden contracts touched here (`shouldPersistOnColdLoad`, `redirectTargetForStoredLocale`) change only as the traceability table states; the route watcher's was changed by T-0053
- [ ] Stage 8 (T4): V1a, V1b, V1i, V1j on the Cloudflare preview of `stage8/T-0054` (AC-10)

## 給使用者（zh-TW）

讓直接打開網址時的語系導向，只在繁中版真的存在時才導過去；不存在就留在英文頁，顯示提示那一行。同時改掉「每次跨語系導覽都寫入偏好」的舊行為：只有在語系選單上的選擇，以及打開（含重新整理、經由短連結）一個存在的 `/zh-TW/` 頁面，才會改變學生的語系偏好；跟著連結走、按上一頁或下一頁、網站自己的轉址都不會改。

## Comments

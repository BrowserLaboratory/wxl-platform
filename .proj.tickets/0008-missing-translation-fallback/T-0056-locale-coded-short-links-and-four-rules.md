---
id: T-0056
title: Short links name their locale, and every challenge gets four redirect rules
epic: 0008-missing-translation-fallback
status: todo
blocked_by: []
---

## Context

Today the copy control gives `/c/NNN` or `/zh/c/NNN`, and a challenge gets a `/zh/c/NNN` rule only when
it has a Traditional Chinese brief, so the Traditional Chinese short link of an English-only challenge
does not exist. The user decided that every locale's short link carries its locale code, that the
Traditional Chinese one is always `/zh-TW/c/NNN`, and that `/c/` and `/zh/c/` links already handed out
keep working (G21–G23, D2, D6). Rules and copied forms land together (T1), so `main` never gives out a
link with no rule behind it. This ticket shares no file with T-0053 and can run beside it.

Spec: `spec.en.md` revision 3, "Challenge link", "Redirect rules"; `traceability.md` revision 3,
decisions G21–G23, D2, D6, seams 0008-S5, S6, the redirect-rules schema, rows F1, F2, F4, F5, F7–F10
and G1–G10, and the overridden contracts for the rules, the hook and the copied path.

## Deliverable

`generateRedirects` writes `/c/NNN`, `/en/c/NNN`, `/zh/c/NNN` and `/zh-TW/c/NNN` for every numbered
challenge with an English brief, padded, the two Traditional Chinese rules pointing at the English page
when there is no Traditional Chinese brief or its directory is untracked or ignored, and four
parameterised rules last; a challenge with only a Traditional Chinese brief gets its two Traditional
Chinese rules; the header states the 500-challenge limit; the committed `_redirects` is regenerated.
The copy control gives `/en/c/NNN` or `/zh-TW/c/NNN` in short mode and takes separate inputs for the
locale of its own text and of its link.

## Acceptance criteria

- [ ] G1–G10: the four numbered rules per challenge and their targets, untracked or ignored directories, the parameterised rules, order, the hook's and CI's refusal unchanged, the committed file, the rule count and the stated limit, the orphan-brief fallback in its own fixture, padding (AC-8)
- [ ] F1, F2, F4, F5, F7–F10: short and page mode in both locales, the nav control, displayed text, `/c/` and `/zh/c/` never given out, the control's own text in the list's or page's locale (AC-7)
- [ ] H1a: the generator's header and comments, `shortLinkPath`, the "one canonical link" comments, `ChallengeList`'s short-link comment, `pre-commit.sh`'s header and W4 message (AC-9)
- [ ] H2: the README's short-link passage, both languages (AC-9)
- [ ] H7 (AC-9)
- [ ] Overridden contracts touched here (epic 0007's H01, H02, H14, H20, H37, H39, H40, vocabulary, X1–X2, L01–L02; `redirects.test.ts`, `redirects-generated.test.ts`, `pre-commit-sh.test.ts`, `shortLink.test.ts`, `ShortLinkShare.test.ts`, `ChallengeList.test.ts`, `MergedNav.test.ts`) change only as the traceability table states
- [ ] Stage 8 (T4): V1d–V1f on the Cloudflare preview of `stage8/T-0056`, checking where each rule redirects; the copy control's string in both languages (AC-10)

## 給使用者（zh-TW）

讓每一道題目都有四條短連結規則：`/c/NNN`、`/en/c/NNN`、`/zh/c/NNN`、`/zh-TW/c/NNN`。沒有繁中說明頁的題目，兩條繁中規則改指英文頁，不再缺。複製按鈕改發帶語系代碼的 `/en/c/NNN` 或 `/zh-TW/c/NNN`，舊的 `/c/` 與 `/zh/c/` 照樣打得開但不再發出。`_redirects` 檔頭寫明 Cloudflare 的 500 題上限。這張票和 T-0053 沒有共用檔案，可以同時進行。

## Comments

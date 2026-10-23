---
id: T-0036
title: Off Cloudflare Pages, the copy control shows and copies the challenge page's URL
epic: 0007-gh-pages-range-fixes
status: todo
blocked_by: []
---

## Context

The copy button beside each challenge gives a short link, which only Cloudflare Pages resolves, so on
a GitHub Pages range the teacher hands out a 404. The build decides the link mode (Q7, Q8): only
`CF_PAGES=1` gives short links, and every other build gives the page URL (`SITE_ORIGIN` followed by
the challenge page's path, with no base added). The mode is a compile-time constant, so the HTML as
served, the hydrated page and anything set at run time agree. This ticket builds the mode, the link
helper, the control and its callers, and the cut with an ellipsis. T-0037 adds selection, title
priority and the minimum width.

Spec: `spec.en.md` revision 3, "Link mode", "Link helper", "The copy control", "Callers", B1, B4;
`traceability.md` revision 3, mode rule, link forms X1–X6, seams 0007-S1, S2, S3 and S8.

## Deliverable

A GitHub Pages range's list and nav, in both languages, show and copy each challenge's page URL. A
Cloudflare Pages build shows short links exactly as today. A URL that does not fit is cut with an
ellipsis, shows whole on hover, and never makes the page scroll sideways.

## Acceptance criteria

- [ ] M01–M04: `__WXL_SHORT_LINKS__` is `'true'` only for `CF_PAGES=1`; `base` and `head` unchanged (AC-1)
- [ ] L19: an undefined constant means page mode (AC-1)
- [ ] L01–L03: short mode, X1, X2, padding (AC-2)
- [ ] L04–L07: page mode, X3–X5, origin path kept, no base added (AC-3)
- [ ] L08: the URL text's `title` is the copied URL (AC-4)
- [ ] L09–L11, L16, L20: what renders nothing at the control and returns none at the helper (AC-5)
- [ ] L12–L15, L18: copy status, label, locale, the button's click inside an anchor; stage 6 confirms no message key changed (AC-6)
- [ ] N01–N07: props from `ChallengeList`, `MergedNav` and `ChallengeLayout`; copied URL with a non-root `withBase`; the badge and grid view unchanged (AC-7)
- [ ] S01, S02: no sideways scroll; each shown URL text is non-inline, `nowrap`, hidden overflow, ellipsis, whole content and `title` (AC-8)
- [ ] S04, S05, S09: HTML as served equals hydrated text; the clipboard holds the page URL; a run-time `window` flag does not switch the mode (AC-9)
- [ ] F01: one fork:init anchor line each in `shortLink.ts` and `config.mts`; `fork-init.test.ts` and `upstream-guard.test.ts` pass (AC-25)
- [ ] P4: the comments on `SITE_ORIGIN` and the "same string" header line in `shortLink.ts` describe both modes (AC-24)
- [ ] Stage 8: V01 on the ticket's Cloudflare preview and V02 on a local build, challenge pages with their Browser panel open (AC-20)

## 給使用者（zh-TW）

依建置環境決定複製按鈕給什麼：只有 Cloudflare Pages 自己的建置（`CF_PAGES=1`）給短連結，其他建置都顯示並複製題目頁的網址，例如 `https://<owner>.github.io/<repo>/zh-TW/challenge/<slug>/`。列表與導覽列兩種語言都改。放不下的網址用省略號截斷，滑鼠停留時顯示全文，頁面不會橫向捲動。點選選取、標題優先與 6ch 最小寬度由 T-0037 處理。

## Comments

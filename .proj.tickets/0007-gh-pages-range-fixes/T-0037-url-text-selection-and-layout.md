---
id: T-0037
title: The URL text selects on a click, yields to the title, and keeps six characters
epic: 0007-gh-pages-range-fixes
status: todo
blocked_by: [T-0036]
---

## Context

The URL text is how a teacher copies by hand when the copy button fails. In the list it sits inside
the row's anchor, so a click on it opens the challenge instead. Three decisions settle its behaviour:
- D4: a plain primary click selects the whole text and does not navigate. L21: a click with a
  modifier key is left to the browser.
- D7: in the nav, the title keeps priority and the URL text gives up width first.
- D14: the URL text never gets narrower than six `0` characters of its font, including while
  `short_link.copy_failed` shows.

Spec: `spec.en.md` revision 3, "The copy control" and "Callers"; `traceability.md` revision 3, D4,
D7, D14, the vocabulary for "shown URL text" and "6ch width", "Each page" and "Each state" of S3.

## Deliverable

On both lists and both `selected-excerpts` pages, at every S3 viewport and state, a plain click on the
URL text selects it without leaving the page, the nav's title is cut only after the URL text reached
its minimum, and the URL text is never narrower than 6ch.

## Acceptance criteria

- [ ] L17: a primary click without a modifier has `defaultPrevented` set and does not run the copy handler (AC-8)
- [ ] L21: a click with Ctrl, Meta, Shift or Alt is not prevented (AC-8)
- [ ] S03: one plain click on the first list row's and the nav's URL text, at rest and while `copy_failed` shows, selects the whole text, page URL unchanged (AC-8)
- [ ] S06: a click elsewhere in a list row opens the challenge (AC-8)
- [ ] S07: wherever the nav title is cut, the URL text's `clientWidth` ≤ 6ch + 1 px (AC-8)
- [ ] S08, upstream-only: at 375×812 the Traditional Chinese `selected-excerpts` nav URL text overflows (AC-8)
- [ ] S10: each shown URL text's `clientWidth` ≥ 6ch − 1 px, in every state, including 1024×768 and the completed state (AC-8)
- [ ] S01 still holds while `copy_failed` shows at 360 wide (the status text may wrap; the mobile row may grow) (AC-8)
- [ ] P5: the comments in `ShortLinkShare`, `ChallengeList` and `MergedNav` that D2, D4, D7 and D14 override describe the new behaviour and both modes (AC-24)
- [ ] Stage 8: V02 at 375 wide and 1280×800, challenge pages with their Browser panel open (AC-20)

## 給使用者（zh-TW）

網址文字的互動與版面：
- 直接點一下就選取全文，不會開題目；按著修飾鍵點則交給瀏覽器。
- 導覽列裡標題優先，網址文字先縮。
- 網址文字至少保留 6 個字元寬。複製失敗訊息出現時、題目已完成時，以及 1024 寬時都要成立。

## Comments

---
id: T-0033
title: The pre-commit hook refuses a Traditional Chinese brief left without its English challenge
epic: 0007-gh-pages-range-fixes
status: todo
blocked_by: [T-0032]
---

## Context

The existing test "backs every translated slug with a root-locale challenge" fails CI whenever a
Traditional Chinese brief has no English challenge of the same slug. Without a check, the hook from
T-0032 would accept such a commit and regenerate `_redirects` for it: retiring, deleting or renaming
only the English directory, or renaming only the brief. CI would then fail after the push, which is
what this epic exists to stop. The user decided (D12) that the hook refuses such a commit before
generating, and names the brief.

Spec: `traceability.md` revision 3, decision D12, the vocabulary for "orphan brief" and "retiring",
outcome O4, message W6.

## Deliverable

A commit whose staged snapshot holds an orphan brief is refused with exit 1 and W6, with nothing
changed. A retirement that deletes the brief in the same commit passes.

## Acceptance criteria

- [ ] H17: retiring a challenge whose brief stays → O4 with W6 (AC-15)
- [ ] H21: deleting only the English directory of a translated challenge → O4 with W6 (AC-15)
- [ ] H22: renaming only the English directory → O4 with W6 (AC-15)
- [ ] H41: renaming only the Traditional Chinese directory → O4 with W6 (AC-15)
- [ ] H39: retiring with the brief deleted in the same commit → O2, both rules go (AC-12)
- [ ] H29, H30 hold for each of these rows (AC-23)
- [ ] P6: the hook's header comment names the refusal (AC-24)

## 給使用者（zh-TW）

如果一個 commit 會讓某個繁中說明頁失去同名的英文題目，例如只下架、只刪除或只改名英文目錄，或只改名繁中目錄，hook 會在產生之前拒絕，並指名那個說明頁，說明要和英文目錄一起處理。下架時同一個 commit 一起刪除繁中說明頁，就會通過，兩條短連結規則也會一起消失。

## Comments

---
id: T-0078
title: The hook handles a cached-only removal and names an untracked tree
epic: 0010-primary-locale-layout
status: todo
blocked_by: [T-0077]
---

## Context

T-0058 (epic 0008, `pending`) recorded three pre-existing behaviours of the pre-commit hook. Spec
0010 takes it whole as its own ticket after the hook ticket (D72, row S50), because the layout
switch meets its old `revisit_when` (the next change to `scripts/pre-commit.sh`) and makes item 2
the common case:

1. A commit whose only staged change under `platform/` is `git rm -r --cached` of a challenge
   directory kept on disk ends in 0007 O5: the stash push stops partway and the hook exits 1. This is
   in the stash code the epic does not otherwise touch; it is taken because the revisit condition
   fires and T-0077 rebuilds the hook harness for the new layout (S41).
2. 0007 W4 names nothing when a whole tree is untracked: git lists the tree itself, a path no W4
   pattern matches. In the new layout a teacher adding a translation creates a whole untracked
   `platform/<L>/` folder, which git lists as `platform/<L>/`.
3. W4 prints a directory name with its control characters to the teacher's terminal (TB-S4). Since
   T-0077 the listing is described by the generator's TypeScript (`--describe-untracked`, D65),
   where escaping is simple.

This ticket starts after T-0077 lands: it changes the hook and the generator's untracked-directory
description as T-0077 leaves them (W4b's wording, S-§4.5). Reproductions are in T-0058's file and in
T-0056's coverage report.

**Decisions to confirm before implementing:** D72 (T-0058 taken whole, here). No other new decision
is first implemented here.

Spec: `spec.en.md` revision 2, AC-32, AC-58 (both closed here; S51 and S57–S63 are T-0077's); `traceability.md` revision 2, D65, D72 and its reasons, D126,
row S50, S-§4.5 (W4b), constraint T7, "Trust boundaries › Area S" TB-S4; T-0058.

## Deliverable

A commit that only removes a translation directory from the index (`git rm -r --cached`) exits 0
and stages `_redirects` with that locale's rules re-targeted; W4 names a whole untracked locale
folder; W4 prints control characters in a directory name escaped.

## Acceptance criteria

- [ ] S50: with 0007 W3 forced and nothing under `platform/en/` tracked on a `P = zh-TW` fixture, W4
  names `platform/en/` (or each untracked brief under it) with W4b's effect, and the same for
  `platform/zh-TW/` on a `P = en` fixture, with a case each (AC-32; S51 is T-0077's)
- [ ] S50: a directory name with a control character is printed escaped, with a case (AC-32)
- [ ] S50: a commit staging only `git rm -r --cached` of a challenge's translation directory exits 0
  and stages a `_redirects` whose rules for that locale point at the primary-locale page (D58), with
  a `pre-commit-sh.test.ts` case, on both `P` (AC-32)
- [ ] The hook's other refusals and outcomes are unchanged: every T-0077 case of
  `pre-commit-sh.test.ts` passes unchanged
- [ ] V-S1–V-S7 (AC-58), as below
- [ ] After landing, T-0058's Comments name this ticket's merge (its `revisit_when` fires)

## Stage 8

Its own row S50 is a unit row. As the last ticket of area S (T8), it runs the V-S table in full:
V-S1 and V-S2 (terminal, `curl` against F-1 `stage8/T-0078`'s Cloudflare Pages preview), V-S3 and
V-S5 (Browser panel on F-1 and F-2 `stage8/T-0078-en`, challenge pages with the panel open), V-S4
(terminal and Browser panel on F-2), V-S6 (Browser panel on a temporary GitHub Pages range from
F-1's head), V-S7 (terminal, a scratch clone of F-2 with the hook installed). Pushing the branches,
creating the temporary range and deleting them each need the user's approval first.

## 給使用者（zh-TW）

T-0058 整張搬進這個 epic（D72）：pre-commit hook 三個原本就有的問題。一是只用 `git rm -r --cached` 把翻譯目錄移出 index 時，stash 會中斷、結束在 O5；二是整個語系資料夾都沒被追蹤時，W4 什麼都不列——新版面下老師新增一個語系的翻譯，正好就是這種情況；三是 W4 會把目錄名稱裡的控制字元原樣印到終端機。這張票在 T-0077 改好 hook 之後才開始，把三個問題修掉並各補測試。它是短連結區最後一張票，所以第 8 階段要把 V-S1–V-S7 全部重跑一次（Cloudflare 預覽、暫時的 GitHub Pages 靶場與暫存 clone，推分支與建立靶場前都會先問你）。要確認的決策只有 D72。

## Comments

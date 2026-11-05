---
id: T-0058
title: The pre-commit hook handles a cached-only removal and names an untracked tree
epic: 0008-missing-translation-fallback
status: pending
blocked_by: []
pending_reason: "The first two found while testing T-0056 (stage 5), the third read from the code in its stage 7 security review (S-5); recorded for the user as predating that ticket and raised again as N-4 by 0008's chain analysis. The user's standing instruction of 2026-11-06 (follow the recommendations) opens it as a pending ticket."
pending_evidence: "T-0056's coverage report, 'Found while testing, outside this ticket', with reproductions; review/security-T-0056.md S-5 and S-6 (= stage 6 Spec F8); review/chain-analysis.md N-4 and C-10. The stash code is not in T-0056's diff; the untracked-directory listing predates it (T-0056 coverage report); W4's echo was reworded in T-0056's stage 6 and printed the directory name as it is before that too (S-5)."
pending_on: 2026-11-06
revisit_when: "The next change to scripts/pre-commit.sh, or a teacher reports the O5 stash message after removing a challenge from the index."
---

## Context

Three pre-existing behaviours of `scripts/pre-commit.sh`. The first two were reproduced in T-0056's stage 5; the third was read from the code in its stage 7 security review. None is part of spec 0008 or has a traceability row.

- A commit whose only staged change under `platform/` is `git rm -r --cached` of a challenge
  directory kept on disk ends in O5: the stash push stops partway (`錯誤: 輸入沒有有效的修補檔內容`),
  the hook exits 1 and names a stash entry to restore from. Reproduce: in `tests/pre-commit-sh.test.ts`,
  drop the `stageDoorChange()` call at line 411 of the case "0008 G3: a Traditional Chinese brief left
  untracked keeps its challenge’s four rules, the Traditional Chinese ones at the English page", and
  run `npx vitest run tests/pre-commit-sh.test.ts -t "0008 G3: a Traditional"`.
- W4 names nothing when a locale tree has no tracked file: git lists the untracked tree as the tree
  itself (`platform/zh-TW/challenge/`), the loop strips the tree prefix, and the empty remainder
  matches none of its `case` patterns. Reproduce: `git init`, commit
  `platform/{challenge,zh-TW/challenge}/door/index.md`, `git rm -rq --cached platform/zh-TW/challenge/door`,
  then `git ls-files --others --exclude-standard --directory --no-empty-directory -- platform/challenge/ platform/zh-TW/challenge/`
  prints `platform/zh-TW/challenge/`.
- W4 prints an untracked directory's name as it is, control characters included, to the teacher's
  own terminal (security-T-0056 S-5; quoted, so no word splitting or injection).

## Deliverable

The cached-only removal commits without O5; W4 names the untracked tree when a whole locale tree is
untracked; W4 shows a directory name with control characters escaped.

## Acceptance criteria

- [ ] A commit staging only `git rm -r --cached` of a challenge's Traditional Chinese directory exits 0 and stages a `_redirects` whose `/zh/c/NNN` and `/zh-TW/c/NNN` rules point at the English page, with a `pre-commit-sh.test.ts` case
- [ ] With W3 triggered (W4 prints only beside it), W4 names the tree when no file under it is tracked, for both locale trees, with a case each
- [ ] W4 prints control characters in a directory name escaped, with a case

## 給使用者（zh-TW）

pre-commit hook 有三個 T-0056 之前就存在的問題：只用 `git rm -r --cached` 把題目目錄移出 index 時，stash 會中斷並結束在 O5；整棵語系樹都沒有被追蹤時，W4 什麼都不列；W4 會把目錄名稱裡的控制字元原樣印到老師的終端機。這張票把三個問題修掉並補測試。

## Comments

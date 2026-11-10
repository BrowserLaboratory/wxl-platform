---
id: T-0062
title: On-disk name aliases and the .git alias rule
epic: 0006-range-upgrade
status: todo
blocked_by: [T-0061]
---

## Context

Chain X3 of epic 0006's chain analysis (`.proj.specs/0006-range-upgrade/review/chain-analysis.md`):
on Windows with 8.3 short names, a regular file `GITIGN~1` in the base, a copy of the teacher's
`.gitignore`, resolves on disk to `.gitignore`, so M6 deletes the teacher's ignore file. HFS+
ignorable code points and letter case in a parent directory are the same kind of alias. 0005's chain
analysis gap 1 is the archive-side twin: entry rule 3 rejects only a literal `.git` component, while
git itself treats `git~1`, `.git` with a trailing stream and `.git` with HFS+ ignorable code points as
`.git`. Split from T-0061 at stage 4 (2026-11-10).

## Deliverable

No merge path whose name on disk differs from p (a short name, ignorable characters, or letter case,
in the path or a parent) is written or deleted: P-9 leaves it untouched and reports UP-A15, on the
default file systems CI verifies (spec B4 lists the rest). Every archive entry with a component git
treats as `.git` is rejected (0005 rule 3, CW-E08), while other short names pass. A `.gitignore`
upstream adds, changes or deletes is untouched (P-7), and the set of ignored paths is the same before
and after a run. Git failures in step 8, other than `git merge-file`, are CW-E14 naming the command.

## Acceptance criteria

Spec `.proj.specs/0006-range-upgrade/spec.en.md` revision 3.1, `traceability.md` revision 3.1, and
`.proj.specs/0005-create-wxl/traceability.md` revision 2.2. Decisions D12, D13, and D19 for step 8.

- Rows: U17 (its added ignored file and `HEAD`/index assertions), U57 (the rejecting stub), U63,
  U68, U69, U73, U74's step 8 cases, U75; 0005's C18 added cases and C71.
- ACs reached: AC-5 (U73), AC-6 (U17, U57, U68, U69, U74, U75), AC-8 (U63, U68), and 0005's AC-9
  (C18, C71).
- The real-file-system letter-case cases run only on macOS or Windows on a case-insensitive file
  system; stage 5 checks whether a Windows runner can create a short name with
  `fsutil file setshortname`, and the coverage report records the real 8.3 case as not verified when
  it cannot (spec Testing Decisions).
- Stage 8: a terminal run of the packed package (0006-S2) on macOS: an upstream path under a
  directory whose letter case differs from the range's is untouched with UP-A15. The full simulation
  (U32) runs in T-0063.

## 給使用者（zh-TW）

第 4 階段拆出的第二張票，處理磁碟上的檔名別名。Windows 的 8.3 短檔名（例如 `GITIGN~1` 指到 `.gitignore`）、HFS+ 會忽略的字元，以及父目錄的大小寫不同，都會讓升級碰到一個名字不同、實際上卻是同一個的檔案。這張票加上 P-9：讀檔前先比對磁碟上的實際檔名，不一致就不動，報 UP-A15。另外把 0005 的 rule 3 補到和 git 一樣，擋下 `git~1`、`.git:` 這類 `.git` 的別名。等 T-0061 完成後再開始，因為測試要用它做好的 tag archive fixture。

## Comments

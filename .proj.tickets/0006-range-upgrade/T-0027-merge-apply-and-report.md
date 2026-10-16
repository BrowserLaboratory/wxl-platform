---
id: T-0027
title: Three-way merge, apply and the upgrade report
epic: 0006-range-upgrade
status: todo
blocked_by: [T-0026]
---

## Context

The core of epic 0006: for every path of the base and target pristine ranges and the range's tracked
files, the pre-checks P-1–P-6 and the merge table M4–M12 decide what happens; text conflicts are
merged with `git merge-file --diff3` and marked; nothing is committed; the run writes deletions then
writes by write-then-rename, updates `range.json`, and prints the report R1–R5. The restore commands
return the range to `HEAD` exactly. Stage 8 is the simulation A → B on two pushed commits (0006-S2),
with the simulation branch as a recorded exception to hard rule 1.

Deadline (decision R1, 2026-10-16): if this epic has not landed by 2026-10-16 23:59, this ticket is set
to `pending` with its reason and evidence and ships after the workshop as 3.0.x (decision of
2026-10-16, Q2 option A).

Spec: `.proj.specs/0006-range-upgrade/traceability.md` revision 2, seams 0006-S1, 0006-S2; "Step order"
8–10, "Pre-checks", "Merge table", "Fork:init-derived content", "`range.json` after the plan", "Report",
"Stage 8 simulation".

## Deliverable

`pnpm range:upgrade` on a teacher's range takes in upstream's changes, keeps the teacher's where unsure,
marks text conflicts with three labels, lists every attention item, exits 0, and can be undone exactly
with `git clean -fd` then `git checkout -- .`.

## Acceptance criteria

- [ ] U17: one fixture path per branch of P-2, M4–M12 → each as its row states; R2 counts and R3 lines exactly those (AC-6)
- [ ] U18: M12 with changes in different lines → merged, updated (AC-6)
- [ ] U19: M12 overlapping, global `merge.conflictStyle=merge` → `<<<<<<< range`, `||||||| <base version>`, `=======`, `>>>>>>> <target version>`; UP-A1 (AC-6)
- [ ] U20: tracked symlink, file under a symlinked directory, ignored symlink → untouched, UP-A7, link target unchanged in content and modification time (AC-7)
- [ ] U21: a teacher's own file → untouched, unreported (AC-6)
- [ ] U22: ignored file with o ≡ b that T changes; T adds an ignored path → untouched, UP-A9 each (AC-8)
- [ ] U23: new executable in T → mode 0755 (umask 022), skipped on Windows (AC-6)
- [ ] U24: after a completed run → `upstream` = target, other keys deep-equal and in order, created when absent, untouched after UP-E09 (AC-9)
- [ ] U25: attention empty / non-empty → exit 0 / 0 (AC-10)
- [ ] U26: U17's run → R1–R5 in order with ids, in the run's language; every UP code in both tables (AC-10)
- [ ] U27: `fs.rename` fails on the 2nd write → UP-E09 naming the path, exit 1; the restore commands give an empty status and `HEAD`'s files (AC-11)
- [ ] U28: `SIGINT` at step 7; `SIGTERM` during step 9 → exit 130; nothing written / UP-E09 with the signal; no temporary directory left (AC-11)
- [ ] U29: after U17's run, the restore commands → empty status, `HEAD`'s files, ignored files byte-identical (AC-11)
- [ ] U32: stage 8 simulation A → B exactly as listed (AC-13)
- [ ] U53: case-only rename → both untouched, UP-A8 each (AC-6)
- [ ] U54: file → directory and directory → file swaps → as the row states (AC-6)
- [ ] U55: directory where b and t are files; T adds `a/x` over a kept file `a` → untouched, UP-A10 (AC-6)
- [ ] U56: o differs from b only by CRLF, t changed → M5, t written (AC-6)
- [ ] U57: `git merge-file` exits 255 → UP-E11, nothing written (AC-6)
- [ ] U58: clean merge of `package.json` to invalid JSON → o kept, UP-A11 (AC-6)
- [ ] U59: an anchor file with b ≢ t / none → UP-A12 present / absent (AC-10)
- [ ] U60: a tracked hard link to an outside file written by M5 → the outside file unchanged (AC-7)
- [ ] U61: upgrade, commit, upgrade again → UP-I01 (AC-4)
- [ ] U62: a path with an ANSI escape in T → printed as an escaped JSON literal (AC-10)

## 給使用者（zh-TW）

0006 的核心：三方合併 base、老師的靶場與 target。上游改了而老師沒改的就更新；兩邊都改的文字檔用 `--diff3` 標出衝突；拿不準時保留老師的版本並列入注意清單。不 commit，結束碼 0，報告列出計數、注意項目與下一步；`git clean -fd` 加 `git checkout -- .` 可完整還原。第 8 階段用兩個推上去的 commit 實際升級一次。23:59 前沒落地就改 pending。

## Comments

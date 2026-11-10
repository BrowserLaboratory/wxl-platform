---
id: T-0061
title: Upgrade base provenance
epic: 0006-range-upgrade
status: processing
blocked_by: []
---

## Context

Epic 0006's chain analysis (`.proj.specs/0006-range-upgrade/review/chain-analysis.md`) found chains
that cross from B3 (`range.json` → the upgrade) to B4 (the upgrade → the teacher's repository and
work). B3's "Does not protect" accepts that whoever can change `range.json` (a co-teacher, a merged
pull request) can pick any fork-network commit as base, but names only one consequence, skipping
upstream changes. The base's content, b, is then the attacker's, and the merge table trusts it:

- **X1** — b copied from the teacher's files makes o ≡ b: M5 overwrites the teacher's changes with t,
  M6 deletes the teacher's files, a clean M12 drops chosen lines; none of these is an attention item,
  and the pull request shows only a new 40-hex commit in `range.json`.
- **X2** — b's lines appear in the `|||||||` section of `--diff3` conflict blocks, which the teacher
  reads as the old upstream version.
- **X3** — on Windows with 8.3 short names, a regular file `GITIGN~1` in b, a copy of the teacher's
  `.gitignore`, resolves on disk to `.gitignore`: M6 deletes it, and R5's `git clean -fd` then deletes
  every file the teacher's rules ignored. HFS+ ignorable code points are the same kind.

Severity low (X3 at the low edge of medium): no code runs, a clean merge holds only o's and t's lines,
tracked files are recoverable (X3 excepted), and deploying needs the teacher's own commit and push.

## Deliverable

A base read from `range.json` is downloaded through upstream's tag and must be that release's commit,
so a changed record cannot hand the merge content that is not upstream's without the upgrade stopping
(UP-E12) and telling the teacher what to do (D18). An untracked `range.json` that the range ignores is
refused before anything is written (UP-E13). A `--from <commit>` base is marked in R1 as not checked.
Git failures in steps 4 and 5 are CW-E14 naming the command.

This ticket is the first of three after stage 4 (2026-11-10): the on-disk name aliases and the `.git`
alias rule moved to T-0062, the restore order, the report additions and the stage 8 simulation to
T-0063. Chains X1 and X2 close here; X3 closes in T-0062 and T-0063.

## Acceptance criteria

Spec `.proj.specs/0006-range-upgrade/spec.en.md` revision 3.1 and `traceability.md` revision 3.1.
Decisions D11, D15, D17, D18, and D19 for steps 4 and 5.

- **Prefactor first:** every test that builds a `range.json` base serves it as a tag archive whose
  `comment` is the recorded commit (spec Testing Decisions), and the seam isolates `HOME` and
  `XDG_CONFIG_HOME` as 0005-S1 does (W3); the suite stays green before J6 lands.
- Rows: U06, U16, U51, U52, U65, U66, U67, U71, and U74's step 4 case.
- ACs reached: AC-2 (U67, U74), AC-3 (U06, U65), AC-4 (U51, U52), AC-5 (U16, U66), AC-10 (U71).
- Stage 8: a terminal run of the packed package (0006-S2): UP-E12 with D18's remedies against the
  real tag `v3.0.0` for a range whose `range.json` names another commit, and the upgrade without
  `--from` of a range made by the published `create-wxl@3.0.0` (the simulation's steps 5–6). The full
  simulation (U32) runs in T-0063.

## 給使用者（zh-TW）

epic 0006 串連分析開出的後續票，第 4 階段拆成三張，這是第一張。能改 `range.json` 的人（共同授課老師、被合併的 PR），原本可以把 base 指向 fork network 裡自己做的 commit，讓升級蓋掉老師的修改、刪掉老師的檔案，或在衝突區塊放進他寫的文字。這張票讓 `range.json` 記錄的 base 一律經由上游的 tag 下載，對不上就以 UP-E12 停下，並依序建議老師怎麼補救；被 ignore 的 `range.json` 在下載前就以 UP-E13 拒絕；用 `--from <commit>` 指定的 base，報告會標明沒有比對上游 tag。磁碟上的檔名別名交給 T-0062，還原指令順序與報告的新內容交給 T-0063。

## Comments

- 2026-11-09, stage 1: the user settled decisions D11–D17 (record:
  `.proj.research/2026-11-09-t0061-grill.md`), including OQ-026 (D15) and 0005's chain-analysis gap 1
  (D13); 0005's gap 2 (B7's G4 hook) goes to a separate maintenance ticket, opened after asking the
  user. The alias check above is stronger than this ticket first said: D12 compares the whole relative
  path (the deepest existing ancestor when o is absent), not only the last component. This ticket runs
  under the standing authorisation of 2026-11-07, which the user extended to it.
- 2026-11-10, stage 2: `traceability.md` revision 3 and the spec are revised (rows U65–U73; codes
  UP-E12, UP-E13, UP-A15); 0005's matrix is at revision 2.2. Acceptance criteria are traced at stage 4.
- 2026-11-10, stage 2 self-check (workflow `wf_d98348ca-1d6`, 94 findings, 90 kept after independent
  refutation, all applied; list in the local note `.proj.research/2026-11-10-t0061-stage2-selfcheck.md`). The user
  scheduled this ticket on 2026-11-09, so the pause ended: status moved from pending to processing and
  the pending fields were dropped (their text is in Git history). Code comments and strings revision 3
  makes stale, to change at stage 5: `messages.mjs` UP-E09 comment and both UP-E09 messages (D14);
  `upgrade-report.mjs` R5 comment and both R5 strings (D14); `upgrade.mjs` step 5 comment (J6, D15),
  step 7 comment (a base from `range.json` is downloaded by tag, D11) and the tag-mode comment;
  `merge-plan.mjs` P-7 rationale comment (the restore order). No published create-wxl prints R5:
  v3.0.0 predates the upgrade code and rejects `upgrade` (0005 AC-2), so the old restore order reaches
  teachers only if create-wxl is published from `main` before T-0061 lands.
- 2026-11-10, stage 3: round 2 found no P0 (`review/round-2.md`; 5 P1, 57 P2). The user approved the
  disposition (`review/disposition-2.md`) and D18–D20; revision 3.1 applies it (rows U74–U76).
  Carried into stage 5: change the GLOSSARY setup record sentence ("目前只有建立靶場的指令會寫入它")
  together with its assertion in `upstream-config.test.mjs` (W4); fix `range.json`'s `__proto__` key
  in `merge-apply.mjs` (R-6, U24); check which code step 9 prints for a bug (K-5).
- 2026-11-10, stage 4: the user approved splitting the work into T-0061 (this ticket, base
  provenance), T-0062 (on-disk name aliases, `.git` alias rule, step 8 git failures) and T-0063
  (restore order, report additions, stage 8 simulation). The title, file name and branch were
  shortened to `upgrade-base-provenance` (the branch had not been pushed). Items carried to stage 5
  above go to the ticket that owns them: the GLOSSARY sentence, `__proto__` and step 9's bug code to
  T-0063; the stale comments to the ticket that changes each file.

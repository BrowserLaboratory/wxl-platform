---
id: T-0063
title: Restore order, report additions and the stage 8 simulation
epic: 0006-range-upgrade
status: todo
blocked_by: [T-0061, T-0062]
---

## Context

Epic 0006's chain analysis showed that the restore commands, run `git clean -fd` first, delete every
file the teacher's ignore rules hid once an ignore file is missing or changed (chain X3's last step;
measured in T-0061's stage 1). It also found that M6's deletions appear only as a count and that a
conflict block's `|||||||` section is not explained. Round 2 of stage 3 added a definition of a
completed run, the report's conditional R4 lines and a `range.json` key that the rewrite drops. Split
from T-0061 at stage 4 (2026-11-10); this ticket closes epic 0006 revision 3's implementation.

## Deliverable

The restore commands are `git checkout -- .` then `git clean -fd` in R5 and UP-E09, and they keep every
file `HEAD`'s ignore rules ignore. R2 lists every path M6 deleted; R4 says, when R3 holds UP-A1, that
the `|||||||` section is R1's base version, and its `pnpm install` and `v*` tag lines follow their
conditions. A completed run is one whose step 9 finished. `range.json` keeps a top-level `__proto__`
key. The GLOSSARY entry for the setup record says the upgrade writes it too. The stage 8 simulation
runs in full.

## Acceptance criteria

Spec `.proj.specs/0006-range-upgrade/spec.en.md` revision 3.1 and `traceability.md` revision 3.1.
Decisions D14, D16, D20, and the round 2 disposition's W4 and R-6.

- Rows: U24, U26, U27, U28, U29, U31, U64 (its restore order), U70, U72, U76, and U32 (stage 8).
- ACs reached: AC-9 (U24), AC-10 (U26, U72, U76), AC-11 (U27–U29, U70), AC-12 (U31, the GLOSSARY
  sentence and its assertion in `upstream-config.test.mjs` changed together), AC-13 (U32).
- Stage 5 runs U70 once with git 2.20 and records the version and result in the coverage report; a
  failure goes back to the user before the ticket closes (spec Testing Decisions).
- Stage 5 checks which code step 9 prints for a bug (round 2 K-5) and records it.
- Stage 8: the simulation of `traceability.md` "Stage 8 simulation (0006-S2)", steps 1–6, on the
  pushed commits A and B, with the branch deleted afterwards.

## 給使用者（zh-TW）

第 4 階段拆出的第三張票，也是 epic 0006 revision 3 的最後一張。還原指令改成先 `git checkout -- .` 再 `git clean -fd`，這樣就算 ignore 檔不見或被改，老師被 ignore 的檔案也不會被刪掉。報告會逐行列出升級刪掉的檔案；有衝突時，R4 會說明 `|||||||` 後面那段是哪個版本的內容；R4 的 `pnpm install` 與推 tag 兩行依條件出現。另外修正 `range.json` 的 `__proto__` key 被吃掉的問題，更新 GLOSSARY「設定紀錄」那句。最後跑完整的第 8 階段模擬：一個從 A 升級到 B 的靶場，以及一個用已發布的 3.0.0 建立、不帶 `--from` 升級的靶場。

## Comments
- 2026-11-10: stage 8 step 5 uses the published `create-wxl@3.0.0` (W5's mechanism change,
  confirmed under the user's authorisation of 2026-11-10; T-0061 Comments). From T-0061's stage 6
  (F4): the restore order in UP-E09 (`messages.mjs`, both languages) and R5 (`upgrade-report.mjs`)
  is this ticket's, with D14.

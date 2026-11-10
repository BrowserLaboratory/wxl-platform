---
id: T-0066
title: Chain fixes from revision 3's close-out
epic: 0006-range-upgrade
status: processing
blocked_by: []
---

## Context

Epic 0006 revision 3's close-out chain analysis (`.proj.specs/0006-range-upgrade/review/chain-analysis-revision-3.md`)
found chains that cross trust boundaries, all low; `docs/agents/review.md` asks for a ticket before
the epic completes. Two links carry most of them. First, on a file system whose `realpath` does not
report the stored name (WSL's `/mnt/c`), P-9 misses an 8.3 alias such as `GITIGN~1`, so M6 can
delete a tracked `.gitignore` through it. Second, the restore commands are printed as two commands,
so `git clean -fd` still runs when `git checkout -- .` fails. The rest are consequences the specs
accept but describe incompletely. On 2026-11-10 the user authorised the recommendations
("一路完成到最後，授權你按照你建議").

## Deliverable

R5 and UP-E09 print the restore commands as one line, `git checkout -- . && git clean -fd` (D23).
A path that is not tracked but exists on disk is left untouched with UP-A15, whatever the file
system reports as its name (D24, pre-check P-10). Spec 0006 revision 3.4 records both, and B1, B3
and B4 state the consequences the chain analysis listed.

## Acceptance criteria

Spec `.proj.specs/0006-range-upgrade/spec.en.md` and `traceability.md` revision 3.4. Decisions D23,
D24.

- [ ] Rows: U26 (R5's one line), U27 and U28 (UP-E09's one line), U77 (P-10).
- [ ] ACs reached: AC-6 (U77), AC-10 (U26), AC-11 (U27, U28).
- [ ] Stage 8: the packed package on a terminal prints R5 as the one line
  `git checkout -- . && git clean -fd`, and that line, run in the upgraded range, gives an empty
  status.

## Test plan

### 2026-11-10 — test plan table（依使用者 2026-11-10 的授權「一路完成到最後，授權你按照你建議」核准，寫第一個測試之前）

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0006-S1 | `realpath` 回報別名本身時，未追蹤卻存在的路徑 → UP-A15（P-10、D24） | `upgrade-aliases.test.mjs` 新增 U77 | U77 / AC-6 | 包裝 `deps.fs`：`GITIGN~1` 在每個函式都當成 `.gitignore`，只有 `realpath` 回傳 `<root>/GITIGN~1`（WSL `/mnt/c` 模型）；B 有 `GITIGN~1` ≡ o，T 沒有 → UP-A15、R2 沒有它、`.gitignore` 不變、ignored 清單前後相同。預期紅燈：現在 M6 會經由別名刪掉 `.gitignore` |
| 0006-S1 | R5 與 UP-E09 把還原指令印成一行 `git checkout -- . && git clean -fd`（D23） | `test/helpers/restore.mjs` 的 `expectRestoreOrder` 改為要求整行；U26 的 R5 全文（兩種語言）、U28 step 10 的 R5 | U26、U27、U28 / AC-10、AC-11 | en 與 zh-TW 的 R5、UP-E09 寫入失敗與訊號兩種文字都含整行。預期紅燈：現在是兩個指令 |
| 0006-S1 | 既有情境沒有被 P-10 誤擋 | 全部 create-wxl 測試 | AC-6 | 所有既有的合併情境結果不變（確認型） |

## 給使用者（zh-TW）

epic 0006 第 3 版收尾的串連分析，找到幾條跨越信任邊界的鏈，都是 low。這張票修掉其中最關鍵的兩環：還原指令改印成一行 `git checkout -- . && git clean -fd`，讓 `checkout` 失敗時不會接著跑 `clean`；新增預先檢查 P-10：沒有被追蹤、卻在磁碟上存在的路徑一定是別名，保持不動並報 UP-A15，這在 WSL `/mnt/c` 這類 `realpath` 不回報實際名稱的檔案系統上也有效。其餘的鏈只補 spec 的「不保護什麼」說明。

## Comments

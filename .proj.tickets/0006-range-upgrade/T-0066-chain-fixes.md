---
id: T-0066
title: Chain fixes from revision 3's close-out
epic: 0006-range-upgrade
status: review
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

- [x] Rows: U26 (R5's one line), U27 and U28 (UP-E09's one line), U77 (P-10).
- [x] ACs reached: AC-6 (U77), AC-10 (U26), AC-11 (U27, U28).
- [x] Stage 8: the packed package on a terminal prints R5 as the one line
  `git checkout -- . && git clean -fd`, and that line, run in the upgraded range, gives an empty
  status.

## Test plan

### 2026-11-10 — test plan table（依使用者 2026-11-10 的授權「一路完成到最後，授權你按照你建議」核准，寫第一個測試之前）

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0006-S1 | `realpath` 回報別名本身時，未追蹤卻存在的路徑 → UP-A15（P-10、D24） | `upgrade-aliases.test.mjs` 新增 U77 | U77 / AC-6 | 包裝 `deps.fs`：`GITIGN~1` 在每個函式都當成 `.gitignore`，只有 `realpath` 回傳 `<root>/GITIGN~1`（WSL `/mnt/c` 模型）；B 有 `GITIGN~1` ≡ o，T 沒有 → UP-A15、R2 沒有它、`.gitignore` 不變、ignored 清單前後相同。預期紅燈：現在 M6 會經由別名刪掉 `.gitignore` |
| 0006-S1 | R5 與 UP-E09 把還原指令印成一行 `git checkout -- . && git clean -fd`（D23） | `test/helpers/restore.mjs` 的 `expectRestoreOrder` 改為要求整行；U26 的 R5 全文（兩種語言）、U28 step 10 的 R5 | U26、U27、U28 / AC-10、AC-11 | en 與 zh-TW 的 R5、UP-E09 寫入失敗與訊號兩種文字都含整行。預期紅燈：現在是兩個指令 |
| 0006-S1 | 既有情境沒有被 P-10 誤擋 | 全部 create-wxl 測試 | AC-6 | 所有既有的合併情境結果不變（確認型） |

### 2026-11-10 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0006-S1 | `upgrade-aliases`（U77）、`upgrade-report`（U26 的 R5 一行）、`upgrade-signals`（U28 step 10）、`helpers/restore.mjs`（U27、U28 的 UP-E09 一行）、其餘 create-wxl 測試（P-10 沒有誤擋） | not measured：create-wxl 沒有安裝 coverage provider | U26、U27、U28、U77；AC-6、AC-10、AC-11 | P-10 的 UP-E11 分支：P-9 會先對同一個路徑 `lstat` 並以同樣的錯誤停下，兩次結果不同才會走到，沒有測試；NFC 等價別名在 APFS 上的情況只有推論；WSL、PowerShell 5.1 沒有實測 |

## 給使用者（zh-TW）

epic 0006 第 3 版收尾的串連分析，找到幾條跨越信任邊界的鏈，都是 low。這張票修掉其中最關鍵的兩環：還原指令改印成一行 `git checkout -- . && git clean -fd`，讓 `checkout` 失敗時不會接著跑 `clean`；新增預先檢查 P-10：沒有被追蹤、卻在磁碟上存在的路徑，幾乎一定是經由別名到達的，保持不動並報 UP-A15；這項檢查不依賴檔案系統回報實際名稱，所以 WSL `/mnt/c` 這類檔案系統也涵蓋得到（以模擬測試驗證，沒有在 WSL 上實測）。其餘的鏈只補 spec 的「不保護什麼」說明。

## Comments
- 2026-11-10, stage 5: commits `8a17079` (chain analysis, spec revision 3.4, this ticket),
  `8c738f9` (P-10; red first: U77 `expected false to be true`, then green), `4c4679f` (the
  one-line restore command; red first: 10 tests across 5 files, then green).
  `pnpm --dir create-wxl test` → `Tests 716 passed | 1 skipped (717)`; no existing merge case changed
  its result under P-10.
- 2026-11-10, stage 6 (workflow `wf_b07a05bc-ec4`; local note
  `.proj.research/2026-11-10-T-0066-stage6-review.md`): Standards F1–F20 and S1–S4, Spec 1–14, no
  defect in P-10's logic. Applied under the user's authorisation of 2026-11-10:
  - Fixed:
    - AC-10 names the one line (D23);
    - AC-6's P-10 clause says "a path that P-1 to P-9 leave";
    - B1, B4 Protects, AC-8, the safety rules, UP-E11 and the Testing Decisions name P-10;
    - B4's NFC sentence covers every volume, APFS included, and is marked inferred;
    - U28's row says "one line";
    - the seam names U77's `realpath` model;
    - P-10's UP-E11 clause notes that P-9 meets the error first;
    - the revision 3.4 self-check lists a fooled clean check and words the ancestor reason
      plainly;
    - D23 and D24 cite the authorisation;
    - the "Nothing is committed" paragraph says to run the line at the top level and how to
      restore under PowerShell 5.1;
    - the code:
      - `existsOnDisk`, renamed;
      - `err?.message ?? String(err)`;
      - P-9's comment no longer says "last";
      - `expectRestoreLine`, renamed;
      - the signal test's comment;
    - the chain analysis words P-10 as "reached through another name", lists T-0063's C5 among the
      corrected findings and notes that P-10 closes the file-level consequence of env:Y2;
    - the zh-TW summary of this ticket no longer claims a WSL measurement.
  - Recorded, not changed:
    - the Traditional Chinese test plan follows T-0061 to T-0065;
    - a separate `chain-analysis-revision-3.md`, since `chain-analysis.md` holds revision 2's;
    - UP-A15's text, which names the likeliest cause;
    - no test for P-10's UP-E11 branch or for the NFC case on APFS;
    - `restoreCommandLine()` stays a function.
  - After the fixes: `pnpm --dir create-wxl test` → `Tests 716 passed | 1 skipped (717)`.
- 2026-11-10, stage 7: report `.proj.specs/0006-range-upgrade/review/security-T-0066.md`.
  10 candidates. C7 (AC-10) and C10 (the top-level premise) were confirmed low and are fixed in the
  spec; the other eight are false positives.
- 2026-11-10, stage 8 (surface: a terminal on macOS darwin arm64, Node v24.13.0, git 2.54.0).
  - Setup: the package was packed with `npm pack` at `4c4679f`; `dist/source.json` names it.
    `GITHUB_REPOSITORY` and `WXL_EXPECT_UPSTREAM` were unset. Range `s8` was made with
    `CREATE_WXL_COMMIT=<main de9c0d4…>`, exit 0.
  - `upgrade` with `CREATE_WXL_COMMIT=<4c4679f…>` and no `--from`: exit 1, UP-E12. J6, as
    expected, since the range was made from an override commit.
  - With `--from <de9c0d4…>`: exit 0.
    - R1 names both commits and says the base was not checked against a tag.
    - R5: `R5: to undo the whole upgrade before making other changes, run git checkout -- . && git
      clean -fd`.
    - That line, taken from the report and run with `bash -c`, exited 0 and left an empty
      `git status --porcelain=v1 --untracked-files=all`.
    - The zh-TW R5: `R5: 如果要撤銷整個升級，請在做其他變更之前執行 git checkout -- . && git clean -fd`.
  - Afterwards `create-wxl/dist/`, `create-wxl/LICENSE`, the tarball and the range were removed.

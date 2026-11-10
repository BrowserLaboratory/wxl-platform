---
id: T-0063
title: Restore order, report additions and the stage 8 simulation
epic: 0006-range-upgrade
status: review
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

## Test plan

### 2026-11-10 — test plan table（依使用者 2026-11-10 的授權「後面都授權你，按照你的建議」核准，寫第一個測試之前）

seam 全部是 0006-S1；GLOSSARY 那句另用 0005 的 `upstream-config.test.mjs`。「預期紅燈」是寫好測試、還沒改程式時的失敗原因；寫好就綠的列是確認型，另做 mutation 檢查。還原指令只有一個來源：`upgrade-report.mjs` 匯出的 `RESTORE_COMMANDS`，R5、UP-E09 與 U70 都用它。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0006-S1 | 還原指令先 `git checkout -- .` 再 `git clean -fd`（D14） | `upgrade-report.test.mjs`（U26 的 R5，兩種語言）、`upgrade-failures.test.mjs`（U27）、`upgrade-signals.test.mjs`（U28 step 9）、`upgrade-merge.test.mjs`、`upgrade-messages.test.mjs`（UP-E09） | U26、U27、U28 / AC-10、AC-11 | 斷言兩個指令的先後位置，不只是都出現；UP-E09 的寫入失敗與訊號兩種文字、兩種語言。預期紅燈：現在是 clean 在前 |
| 0006-S1 | R2 逐行列出 M6 刪掉的路徑；R4 在有 UP-A1 時說明 `\|\|\|\|\|\|\|` 段落（D16） | `upgrade-report.test.mjs` 新增 U72 | U72、U26 / AC-10 | 三個 M6 路徑 `z.md`、`a/b.md`、`B.md` → 計數行之後剛好三行 `R2`，順序 `B.md`、`a/b.md`、`z.md`（UTF-16 code unit），沒有其他 R2 路徑行；有 UP-A1 項目 → D16 句出現，沒有 → 不出現；兩種語言。預期紅燈 |
| 0006-S1 | R4 的 `pnpm install` 與 `v*` tag 兩行依條件出現 | `upgrade-report.test.mjs` 新增 U76 | U76 / AC-10 | 寫了 `package.json`／只寫 `pnpm-lock.yaml`（M5）／都沒寫 → 出現／出現／不出現；有／沒有 `.github/workflows/deploy.yml` → 出現／不出現。確認型（程式已有），做 mutation |
| 0006-S1 | `range.json` 頂層的 `__proto__` key 保留（R-6） | `upgrade-record.test.mjs` U24 新增 ⑥ | U24 / AC-9 | `{"__proto__":{"x":1},"upstream":{…},"y":2}` → 完成後 `__proto__` 仍是自己的 key、值與位置不變，`upstream` 換成 target。預期紅燈 |
| 0006-S1 | 還原順序在 ignore 檔不見或被改時保住被 ignore 的檔案（D14） | `upgrade-restore.test.mjs` 新增 U70，依 `RESTORE_COMMANDS` 執行 | U70 / AC-11 | 從 commit 建出的樹：(a) tracked 的 `.gitignore` 被刪、被 ignore 的檔案在；(b) tracked 的 `sub/.gitignore` 被改成不再 ignore 某檔；(c) tracked 檔 `a` 被換成 untracked 的 `a/x` → 跑完兩個指令後 porcelain status 為空、檔案等於 `HEAD`、`HEAD` 的 ignore 規則 ignore 的檔案逐 byte 不變。確認型（`RESTORE_COMMANDS` 換回舊順序時 (a)、(b) 應該紅燈，當作 mutation）；另用 git 2.20 跑一次 |
| 0006-S1 | U29、U64 的還原改用新順序 | `upgrade-restore.test.mjs` U29、`upgrade-submodule.test.mjs` U64 改用 `RESTORE_COMMANDS` | U29、U64 / AC-6、AC-11 | 既有斷言不變（status 為空、`HEAD` 的檔案、ignored 檔逐 byte 不變）。確認型 |
| 0006-S1 | 完成的執行 = step 9 已結束（D20） | `upgrade-signals.test.mjs` 既有 step 10 的 SIGINT 對應 U28 | U28 / AC-11 | R1～R5 完整印出、exit 130、沒有暫存殘留；補上 R5 的新順序。確認型 |
| 0005-S1 | GLOSSARY「設定紀錄」那句改為「建立靶場的指令與升級都會寫入它」（W4） | `upstream-config.test.mjs` U10 的斷言與 `GLOSSARY.md` 一起改 | U31 / AC-12 | 斷言新句子，舊句不再出現。預期紅燈 |

### 2026-11-10 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0006-S1 | `upgrade-report`（U26 改預期、U72、U76）、`upgrade-messages`（UP-E09 的順序）、`upgrade-failures`（U27）、`upgrade-signals`（U28 step 9 與 step 10 的 D20）、`upgrade-merge`、`upgrade-record`（U24 ⑥）、`upgrade-restore`（U29、U70）、`upgrade-submodule`（U64）、`upgrade-ignored`（P-7 的還原） | not measured：create-wxl 沒有安裝 coverage provider | U24、U26、U27、U28、U29、U64、U70、U72、U76；AC-9、AC-10、AC-11 | U70 用 git 2.20 跑一次：本機只有 git 2.54；從原始碼編譯 git 2.20.1 被這個 session 的權限分類器擋下（Comments），待使用者執行。U32 屬於第 8 階段 |
| 0005-S1 | `upstream-config`（U10 斷言改為 W4 的新句子） | not measured | U31 / AC-12 | U31 其餘部分（`create-wxl <dir>`、C02、C18）是既有測試，沒有改 |

## 給使用者（zh-TW）

第 4 階段拆出的第三張票，也是 epic 0006 revision 3 的最後一張。還原指令改成先 `git checkout -- .` 再 `git clean -fd`，這樣就算 ignore 檔不見或被改，老師被 ignore 的檔案也不會被刪掉。報告會逐行列出升級刪掉的檔案；有衝突時，R4 會說明 `|||||||` 後面那段是哪個版本的內容；R4 的 `pnpm install` 與推 tag 兩行依條件出現。另外修正 `range.json` 的 `__proto__` key 被吃掉的問題，更新 GLOSSARY「設定紀錄」那句。最後跑完整的第 8 階段模擬：一個從 A 升級到 B 的靶場，以及一個用已發布的 3.0.0 建立、不帶 `--from` 升級的靶場。

## Comments
- 2026-11-10: stage 8 step 5 uses the published `create-wxl@3.0.0` (W5's mechanism change,
  confirmed under the user's authorisation of 2026-11-10; T-0061 Comments). From T-0061's stage 6
  (F4): the restore order in UP-E09 (`messages.mjs`, both languages) and R5 (`upgrade-report.mjs`)
  is this ticket's, with D14.
- 2026-11-10, stage 5 records:
  - Commits `fb7c424` (D14), `9f1b602` (D16), `d112273` (U76), `83b0879` (R-6), `c2ac252` (U70),
    `82db60c` (D20), `085980b` (W4), on `main` at `89a1e22`. `pnpm --dir create-wxl test` →
    `Test Files 37 passed (37) / Tests 707 passed | 1 skipped (708)`; `pnpm test --run` →
    `Test Files 136 passed (136) / Tests 4861 passed | 1 skipped (4862)`.
  - Mutations (each run, then reverted):

    | Mutation | Tests that fail |
    |---|---|
    | `RESTORE_COMMANDS` back to clean first | U70 (a) and (b); (c) stays green, as expected |
    | R4 `pnpm install` only for `package.json` | U76, the `pnpm-lock.yaml` (M5) case |
    | R4 `v*` tag line always | U76, the two cases without a deploy workflow |
    | R4 `pnpm install` always | U76, the case that writes neither |

  - Deviations:
    - U76's write check reads `package.json`'s new script, not the archive's bytes, because the
      pristine target rewrites `package.json`'s version.
    - The object-spread path of `range.json` (no `upstream` key yet) already keeps an own
      `__proto__` key (checked with node), so only the path that replaces `upstream` changed.
  - K-5 (round 2), checked in `merge-apply.mjs` at `83b0879`:
    - a bug thrown inside a delete's or a write's own `try` in step 9, including `range.json`'s
      write, is reported as UP-E09 with the restore commands, exit 1;
    - a bug thrown outside those `try` blocks reaches `runUpgrade`'s catch and is reported as
      CW-E14, exit 1, without the restore commands, though step 9 may already have changed
      files. That code is the sorting of `ops`, `tempPathFor`, or the `guard` calls.
    - Recorded, not changed: no such bug is known, and the spec asks only for the check.
  - U70 with git 2.20: not run. Only git 2.54 is installed. The git 2.20.1 source was downloaded
    from kernel.org and its SHA-256 matched `sha256sums.asc`
    (`9d2e91e2faa2ea61ba0a70201d023b36f54d846314591a002c610ea2ab81c3e9`), but this session's
    auto-mode classifier refused to build it ("Code from External"). The user runs it, and a
    failure goes back to the user before this ticket closes (spec Testing Decisions).

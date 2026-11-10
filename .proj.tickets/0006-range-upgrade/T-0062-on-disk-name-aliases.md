---
id: T-0062
title: On-disk name aliases and the .git alias rule
epic: 0006-range-upgrade
status: processing
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

## Test plan

### 2026-11-10 — test plan table（依使用者 2026-11-10 的授權「後面都授權你，按照你的建議」核准，寫第一個測試之前）

seam 全部是 0006-S1；0005 的 rule 3 另用 0005-S1（`archive-rules.test.mjs` 透過 create 的 `run`）。「預期紅燈」是寫好測試、還沒改程式時的失敗原因；寫好就綠的列是確認型，另做 mutation 檢查。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0006-S1 | prefactor：P-5 與 D15 共用一個「被 ignore 的路徑」helper（S1），step 8 的 git 呼叫改走 D19 的包裝；P-9 拿到 step 3 的 range root realpath；行為不變 | `merge-plan.mjs`、`upgrade.mjs`；不改測試 | （無） | 改完全部 create-wxl 測試仍是綠燈 |
| 0005-S1 | rule 3 擋下 git 視為 `.git` 的元件（D13） | `archive-rules.test.mjs` rule 3 的 `it.each` 加 C18 的新案例；新增 C71 | 0005 C18、C71 / AC-9 | `git~1/x`、`GIT~1/x`、`git~1. :x/y`、`.git:x/y`、`.git::$INDEX_ALLOCATION/x`、`.g\u200cit/x`、`.G\u200cIT/x`、`\u200c.git/x`、`.git\ufeff/x` → CW-E08 rule 3；`PLATFO~1/x`、`GITIGN~1`、`a~1/b` 通過。預期紅燈：新拒絕案例 |
| 0006-S1 | 升級路徑的 archive 也套用新 rule 3 | `upgrade-target.test.mjs` 新增 U73 | U73 / AC-5 | T 含上列九種元件之一 → CW-E08，exit 1，沒寫檔，沒有暫存殘留；`PLATFO~1`、`GITIGN~1` 通過。預期紅燈 |
| 0006-S1 | 磁碟名稱別名 → UP-A15（P-9） | 新檔 `upgrade-aliases.test.mjs` 的 U68 | U68 / AC-6、AC-8 | (a) 8.3 模型：包裝 `deps.fs`，`GITIGN~1` 在每個函式都當成 `.gitignore`，realpath 回 `<root>/.gitignore`；B 有 `GITIGN~1` ≡ o，T 沒有 → UP-A15，`.gitignore` 不變，ignored 清單前後相同；(b) 大小寫不敏感檔案系統（只在 macOS、Windows 跑）：T 新增 `platform/new.txt`、靶場的 tracked 目錄是 `Platform/` → UP-A15，沒寫 `platform/new.txt`。預期紅燈 |
| 0006-S1 | 名稱相同時不誤報、錯誤 fail closed | 同檔 U69 | U69 / AC-6 | range root 經 symlink；NFC 名稱、realpath 回 NFD（HFS+ 模型）；NFD 名稱、realpath 也回 NFD；`\` 分隔（Windows 模型）；`D:\` 磁碟根目錄模型 → 都沒有 UP-A15（確認型，P-9 加上後做 mutation）；realpath 對 tracked 檔 p 回 `EACCES`、lstat 對不存在 p 的祖先回 `EACCES` → UP-E11 帶 p，沒寫檔（預期紅燈） |
| 0006-S1 | Windows 真的 8.3 短檔名 | 同檔，只在 Windows 跑 | U68 / AC-6 | 先用 `fsutil file setshortname` 給暫存檔一個短檔名；做不到就在執行時略過並寫明原因（coverage 表記為未驗證）；做得到就跑 X3 情境 → UP-A15、`.gitignore` 不變 |
| 0006-S1 | P-7 的新增、刪除與 o ≡ t 分支 | `upgrade-ignored.test.mjs` U63 擴充 | U63 / AC-8 | `new/.gitignore`（b 不存在）、`old/.gitignore`（t 不存在）、`x/.gitignore`（o ≡ t、b ≢ t）→ 都沒動、各報 UP-A13；ignored 清單前後相同。確認型 |
| 0006-S1 | U17 的 ignored 檔與 HEAD／index 不變 | `upgrade-merge.test.mjs` U17 加斷言 | U17 / AC-6 | 上游有改的目錄裡放一個 ignored 檔：逐 byte 不變；`git rev-parse HEAD` 與執行前相同、`git diff --cached` 為空。確認型 |
| 0006-S1 | step 8 的 git 失敗（D19） | `upgrade-ignored.test.mjs` 既有兩個 fails-closed 區塊對應 U74；新增 reject 子案 | U74（step 8）/ AC-6 | `ls-files -z` exit 128、P-5 `check-ignore` exit 128 → CW-E14（既有，確認型）；`runGit` 對 step 8 的 `ls-files -z` reject `EIO` → CW-E14 帶指令名稱（新子案，預期紅燈） |
| 0006-S1 | `merge-file` 被 reject → UP-E11 | `upgrade-merge.test.mjs` 既有「runGit rejects for merge-file」對應 U57 | U57 / AC-6 | 既有測試，確認型 |
| 0006-S1 | 讀 o 失敗 → UP-E11 | `upgrade-merge.test.mjs` 新增 U75 | U75 / AC-6 | 包裝 `deps.fs`，讀 tracked 檔 p（b ≢ t）回 `EACCES` → UP-E11 帶 p，沒寫檔 |

## 給使用者（zh-TW）

第 4 階段拆出的第二張票，處理磁碟上的檔名別名。Windows 的 8.3 短檔名（例如 `GITIGN~1` 指到 `.gitignore`）、HFS+ 會忽略的字元，以及父目錄的大小寫不同，都會讓升級碰到一個名字不同、實際上卻是同一個的檔案。這張票加上 P-9：讀檔前先比對磁碟上的實際檔名，不一致就不動，報 UP-A15。另外把 0005 的 rule 3 補到和 git 一樣，擋下 `git~1`、`.git:` 這類 `.git` 的別名。等 T-0061 完成後再開始，因為測試要用它做好的 tag archive fixture。

## Comments
- 2026-11-10, from T-0061's stage 6: (S1) when step 8's git calls gain D19's rejection wrapping,
  make one helper for "ignored path" (Vocabulary) and use it for both P-5 (`merge-plan.mjs`
  `isIgnoredPath`) and D15 (`upgrade.mjs` step 5), so the two copies cannot drift; (F4) the comment
  in `archive-rules.mjs` that says create-wxl always downloads by commit is stale since U16 and J6.

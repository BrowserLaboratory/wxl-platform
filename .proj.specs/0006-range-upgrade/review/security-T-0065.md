# T-0065 第 7 階段安全審查

依專案版 `.claude/skills/security-review/SKILL.md`（不是內建的同名指令）。

## 範圍

- checkout：`/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0065/git-floor-2-26`。
- base `8455c34fd9a3732cd32a09368a28bd20d65b84b6`（merge-base），HEAD `719113f9f7a47899c60bba3ed9c8a1881c77ae12`。
- 已 commit 的變更：`git diff 8455c34...719113f`（580 行）。內容包括：
  - `MINIMUM_GIT_VERSION` 從 `[2, 20]` 改為 `[2, 26]`，以及相關註解；
  - 4 個測試檔；
  - spec 0006 revision 3.3（en、zh-TW、traceability）與 0005 revision 2.3；
  - T-0065 ticket。
- pending 變更 0 筆，untracked 0 筆。

## 方法

workflow `wf_a6ccd860-406`（2026-11-10），和第 6 階段的兩軸 code review 一起跑，分兩段：

1. 候選：一個 `harness-reviewer` 列出所有候選，包含低嚴重度的項目，不自行判定誤報。
2. 判定：每個候選交給另一個獨立的 `harness-reviewer`，依據是 HEAD 的程式碼，以及 0005、0006 spec 的信任邊界。

全部只讀，判斷來自讀碼與 git 的 release notes、原始碼。

候選審查員考慮的面向：

- 版本字串解析能不能被繞過；
- git 2.26～2.35 剩下的行為差異；
- D22 縮小 AC-11 之後，有沒有藏起一條會刪資料的路徑；
- create 的 CW-W01 路徑。

## 結論

**確認的發現：2 項，都是 low，都不是這個 diff 新引入的**（這個 diff 只把支援範圍從 2.20 縮小到 2.26）。

處置：寫進 spec，不改程式碼。

另外 6 個候選判定為誤報（信心 0.75～0.8）。本報告只代表這次 diff 沒有發現新的可利用缺陷，不代表整個專案沒有安全問題。

## 確認的發現

| 候選 | 位置 | 說明 | 處置 |
|---|---|---|---|
| C1（low，0.6） | `create-wxl/src/upgrade.mjs:168-181`（step 4 的 `status` 與 `ls-files -v`） | D21 說 2.26 之前有 fsmonitor 的問題，但 2.26～2.35 仍然把 `core.fsmonitor=true` 當成 hook 指令執行。只要再設 `core.fsmonitorHookVersion=1`，就回到「可能回報沒有變更」的行為，step 4 的乾淨檢查可能在有修改的工作樹上通過。前提罕見：老師要用 2.26～2.35 的 git，加上新版 git 才會寫的設定值，再手動設 hook 版本 1。沒有外部攻擊者 | D21 的理由改為 2.26 之前預設 hook protocol V1、2.26 起預設 V2；B4 Does not protect 列出剩下的組合。沒有改程式碼：用 `-c core.fsmonitor=` 關掉 fsmonitor，要在 2.26 與 2.54 兩版都實測過才能採用，這個 session 只有 2.54 |
| C2（low，0.8） | spec 的 revision 3.3 self-check | 自我檢查只提到 `merge-file` 會停下（UP-E11）。但 git 2.26～2.34 讀到 `merge.conflictStyle=zdiff3` 時，每一次 `git checkout` 都會失敗，包括還原指令的 `git checkout -- .` | B4 Does not protect 與 self-check 都補上這一點。這種 git 的日常 checkout 本來就會失敗，老師在升級之前就會發現 |

## 被排除的候選

| 候選 | 類別 | 處置與理由 |
|---|---|---|
| C3 | D22 把會刪資料的路徑收進 Does not protect，但 R5 與 UP-E09 都沒有警告 | 誤報（0.75）。這是 git 本身的行為，revision 3.3 之前就存在；舊的 AC-11 宣稱全部保住，本來就不對。升級不寫被忽略的路徑（P-5），所以剛升級完的那個資料夾裡沒有被忽略的檔案，只有老師之後自己放進去才會遇到，這屬於 B4 已接受的「after later edits」 |
| C4 | 下限選在 2.26，研究筆記卻把「2.26 的 clean 邊界 bug」列為未讀；在下限版本實跑的要求也被拿掉 | 誤報（0.8）。這個 diff 縮小了支援範圍，沒有擴大。2.26 原本就在支援範圍內，也從沒實測過。屬於證據缺口，已記錄在 ticket |
| C5 | `2.26.0.rc0` 會被當成 2.26.0 放行 | 誤報（0.8）。解析方式沒有改；rc 版和正式版在這幾個指令上沒有已知差異 |
| C6 | 2.34.0 的 `.gitignore` 回歸，以及 2.26～2.31 會讀 symlink 的 `.gitignore` | 誤報（0.75）。被忽略與否由同一支 git 判斷，升級與還原用的是同一套規則；支援範圍也沒有擴大 |
| C7 | git 2.20～2.25 的老師從加固過的 G1～G4，被推去手動執行沒有加固的指令 | 誤報（0.8）。CW-W01 印出的指令是既有設計，所有 CW-W0x 都一樣；這次的影響是使用者明確做的產品決策 |
| C8 | 其他 fsmonitor 與 cache 模式（內建 daemon、自訂 hook、untracked cache） | 誤報（0.8）。step 4 沒有改動；這些模式在正常運作時會回報實際的變更。可以列為之後的強化 |

## 可選的強化（記錄，沒有採用）

- step 4 的 `status` 與 `ls-files -v` 加上 `-c core.fsmonitor=`（空字串在舊版是「沒有 hook」，在 2.36 以後是 false），就能不再依賴版本。採用前要在 2.26 與目前版本都實測。
- R5 可以加一句：檔案變成資料夾時，還原會連資料夾裡被忽略的檔案一起刪除。

## 排除的涵蓋範圍

- 沒有做相依套件掃描；沒有改動相依套件。
- 沒有在 git 2.26～2.35 上實測，C1、C2 的行為來自 git 的文件與原始碼。
- 跨 ticket 的串連分析留到 epic 收尾。

# 第 7 階段資安審查：T-0025（程式與文件列）

範圍：分支 `tickets/T-0025/publishing-documents-stage-8`，base `af5c948`（審查時為 staged、尚未 commit）。審查 create-wxl 的發布閘門（`prepareDist`、`checkPublish` 的 D1 與 X1–X9、兩支 script）、`bin/create-wxl.mjs`、manifest、CI 步驟，以及 README、AGENTS.md、GLOSSARY.md、OPEN-QUESTIONS.md 的變更。第 8 階段的終端機實跑不在這次審查範圍。spec 0005 第 2.1 版為需求依據，信任邊界見 spec 的「Trust Boundaries and Threat Model」（B1 下載的 archive、B5 終端機輸出），發布閘門保護的是「發布出去的套件與上游的 tag 一致」。

方法：專案 `security-review` skill，由 review workflow 執行。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案、不執行指令。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入、達到通報門檻的可利用缺陷：0 項。** 候選 11 項，獨立篩選判定都未達門檻（HIGH／MEDIUM 且信心 ≥ 0.8）。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | README 要老師執行 `npm create wxl`，但沒記錄 npm 名稱已保留 | 誤報：spec 第 212 行記錄使用者已以 `create-wxl@0.0.0` 保留名稱 | 不需修改；README 另外註明要等發布後才能使用 |
| 02 | `npm view` 任何失敗都當成「名稱未發布」，X9 會在 registry 連不上時放行 | true positive，未達門檻（low） | 已修正（第 6 階段）：只有 E404 算未發布，其他失敗為 X9，有測試 |
| 03 | X4 沒有加 `--ignored`，被 ignore 的檔案可能經由 `files` 打包 | hardening：照 spec 字面實作 | 記錄 |
| 04 | `bin` 先 import 引擎、`run` 的 step 2 才比對雜湊 | 模型外：增量計畫明定的順序 | 記錄 |
| 05 | `git ls-remote` 的 pattern 會比對 ref 名稱尾端 | 模型外 | 記錄 |
| 06 | `prepack` 會在 X8 之後重建 `dist/`；`npm publish <tarball>` 不跑 `prepublishOnly` | 模型外：spec 的設計（同一個 HEAD 重建結果相同） | 記錄 |
| 07 | Windows 上沒有路徑的 `git`／`npm` 會先找 cwd | 模型外：發布者自己的 checkout | 記錄；npm 在 win32 改用 `npm.cmd` |
| 08 | `bin` 自己攔截訊號再轉發，step 3 之前與結束之後的訊號會被吞掉 | true positive，未達門檻（low） | 已修正：照 seam 直接傳 `signals: process`，有測試 |
| 09 | `main()` 沒有接 `.catch`，`run()` 以外的錯誤印出 stack trace | true positive，未達門檻（low） | 已修正：印環境語言的 CW-E14，有測試 |
| 10 | 部分 X 檢查失敗時直接當掉，或 X4 在 `git status` 失敗時放行 | true positive，未達門檻（low） | 已修正：每項失敗都回報自己的編號，有測試 |
| 11 | 下載時跟隨重新導向到任何 host | 模型外：B1 Outside the model | 記錄 |

## 沒有涵蓋

dependency scanning；真的 `npm view`／`npm whoami`／`npm publish`（使用者發布時才會執行）；Windows 上的實際行為（cross-OS CI）；第 8 階段的打包與終端機實跑（記在 T-0025 ticket）。判斷來自讀碼與測試。本報告不代表整個專案沒有安全問題；epic 的串連分析在 epic 收尾時進行。

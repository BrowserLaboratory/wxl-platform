# 第 7 階段資安審查：T-0027（三方合併、套用與報告）

範圍：分支 `tickets/T-0027/merge-apply-and-report`，base `origin/main`（`34bbb3b`），merge-base `f0ff741`，HEAD `b844895`，checkout `/Users/phoenix/dev/browserlab/wxl-platform`。審查面是已 commit 的 `git diff f0ff741...HEAD`，沒有 pending 或 untracked 變更。範圍是 create-wxl 升級的 step 8～10：`create-wxl/src/merge-plan.mjs`、`merge-apply.mjs`、`upgrade-report.mjs`、`upgrade.mjs`、`git-runner.mjs`（binary stdout）、`messages.mjs`（UP-A1～A13、UP-E09、UP-E11）。這是 create-wxl 第一段把上游內容寫進老師既有 repository 的程式碼。需求依據是 spec 0006（`spec.en.md` 的 B1～B6）與 `traceability.md` revision 2.4。

方法：專案的 `security-review` skill，由 workflow 執行。兩個候選審查者各看一個角度：「輸入」（B1、B3：archive 路徑、`range.json`、`--from`、環境變數流向寫入、刪除、git 參數與輸出）與「效果」（B4、B5：寫入逃出靶場、`.git`、ignored 與 untracked 檔、還原保證、暫存檔、訊號、輸出）。每個候選交給一個獨立的 `harness-reviewer` 嘗試推翻。全部唯讀，判斷來自讀碼，沒有執行。依 ADR-0005，所有候選都和題目的刻意弱點無關。第 6 階段已修正的項目（`6619cd8`、`b844895`）不重複列出。

## 結果

**本 diff 引入、達到通報門檻的可利用缺陷：0 項。** 候選 28 項（兩個角度有重疊，合併後 19 組），獨立篩選後沒有任何一項達到門檻（HIGH／MEDIUM 且信心 ≥ 0.8）。

未達門檻但成立，或建議處理的項目：

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 04／17 | P-5 把路徑當 pathspec 傳給 `git check-ignore`，`--` 不會關掉 pathspec magic：上游路徑 `:/x` 被當成頂層 `x` 檢查，`:(glob)…` 讓 check-ignore 以 128 結束；P-5 檢查的路徑和實際寫入的路徑不同（`merge-plan.mjs` 的 `isIgnoredPath`） | true positive，low：要傷到老師的資料，得先有以 `:` 開頭、被 ignore 的檔案 | 修正（使用者 2026-11-09 核准）：`git --literal-pathspecs check-ignore`，新增子案 |
| 06／16 | 寫入與刪除會進入 submodule（gitlink）的工作目錄：`git ls-files -z` 只列出 gitlink 本身，上游的 `sub/x` 可經 M5、M6、M12 寫入、刪除或標上衝突，還原指令救不回來（違反 B4、AC-11） | true positive，low：需要 submodule 路徑和上游路徑重疊；submodule 自己的 HEAD 可以還原 | 修正：使用者決定 D10，新增 pre-check P-8、UP-A14 與 U64（traceability revision 2.5） |
| 02／15 | P-7 只比對大小寫完全相同的 `.gitignore`；在不分大小寫的檔案系統上，上游新增的 `.GITIGNORE` 會被寫入並生效，繞過 D9 | hardening，low：只有刻意的上游才會這樣做，而上游本來就能改 scripts | 修正（使用者核准）：P-7 以 NFC 加大小寫摺疊比對，新增子案 |
| 09／20 | anchor 檔的讀取在 step 8 的 try 之外：讀取錯誤時 merge-inputs 暫存目錄留在 `tmpRoot`，並以 CW-E14 而不是 UP-E11 結束（AC-11） | hardening，low：只在兩次讀取之間出現暫時性錯誤時發生 | 修正（使用者核准）：改回 UP-E11 並清掉 merge-inputs，新增子案 |
| 10／21 | 暫存檔名在 basename 前加了 41 個字元，接近 NAME_MAX 的檔名會在套用途中以 ENAMETOOLONG 結束（UP-E09） | hardening，low：fail closed，有還原指令 | 修正（使用者核准）：暫存檔名改為固定長度、不帶 basename，新增子案 |
| 19 | 老師自己 ignore 的 `range.json` 仍會被改寫或新建（P-1 在 P-5 之前），還原指令不會還原它 | hardening，low：spec 內部的小矛盾（P-1、AC-9 對上 AC-11、B4） | 記錄：使用者決定列為 OQ-026 |
| 01／14 | 上游路徑可以用 `.git` 的檔案系統別名（NTFS 的 `GIT~1`、`.git::$INDEX_ALLOCATION`，HFS+ 的可忽略字元）繞過 0005 的 rule 3；step 8 從磁碟名稱重新推導路徑，寫入的目的地變成老師既有的 `.git` | 模型外，low：GitHub 的 fsck 會拒收這種 tree；rule 3 的缺口 0005 已記錄（security-T-0021 第 04 項、chain-analysis）；這次的 sink 變得更危險 | 記錄，交給 epic 0006 收尾的串連分析 |
| 13／25 | R3 印出的上游路徑不跳脫 bidi 與零寬字元 | hardening：規格（D10）只要求 C0、DEL、C1，0005 與 T-0026 有相同判定 | 記錄，不修改 |
| 03 | P-1 只排除大小寫完全相同的 `range.json`，大小寫不同的 `Range.json` 不會報 UP-A8 | hardening，low | 記錄（第 6 階段 P15 同一件事） |
| 05 | P-4 用 `toLowerCase`，比檔案系統的 Unicode 大小寫摺疊窄 | hardening，low | 記錄（第 6 階段 P14 同一件事） |
| 11／22 | 留下的暫存檔可能符合老師的 ignore 規則（例如 `.*`），`git clean -fd` 清不掉 | hardening，low：暫存檔在失敗與中斷時都會被刪 | 記錄 |
| 12 | P-5 在濾掉 `GIT_*` 的環境下判斷 ignore，老師之後在自己的環境執行還原指令，兩邊的 ignore 集合可能不同 | hardening，low | 記錄 |

其餘候選：

| 候選 | 內容 | 判定 |
|---|---|---|
| 07 | fork network 的 base（B3）能讓 B 的內容驅動刪除或覆寫 | 誤報：M6 要求 o ≡ b 且 t 不存在，寫入一律來自 t；B3 已列「挑另一個 base」 |
| 08／18 | `range.json` 的 `__proto__` 頂層鍵在重寫後遺失 | 模型外／誤報：`JSON.parse` 本身會把它當成一般屬性；第 6 階段 P13 已記錄 |
| 23 | P-4 與檔案系統的大小寫摺疊不一致；`core.ignorecase=false` 時 P-5 漏判 | 誤報：P-4 偏向多報；ignore 判斷沿用老師自己的設定 |
| 24 | Windows 保留裝置名稱（CON、NUL）讓讀 o 卡住或套用中途失敗 | 誤報：0005 的 pristine 解壓階段就會失敗 |
| 26 | step 9 某個操作進行中收到訊號、該操作又剛好失敗時，exit 是 1 而不是 130 | 誤報：訊號會在下一個操作前被檢查；兩件事同時發生時印的是失敗本身，仍有還原指令 |

## 沒有涵蓋

依賴套件掃描；可用性與資源耗盡（方法論排除）；Windows 與 HFS+ 上的實際行為（判斷來自讀碼，cross-OS CI 只跑測試）；測試 helper 與測試檔沒有逐行審查；第 8 階段（0006-S2）的終端機實跑。本報告不代表整個專案沒有安全問題；跨 ticket 的串連分析在 epic 0006 收尾時進行。

# 第 7 階段資安審查：T-0023

範圍：分支 `tickets/T-0023/git-steps-and-next-steps`，base `ae1c677`（審查時為 staged、尚未 commit）。審查 create-wxl 的 step 12 git 步驟（G0 版本檢查、G1 `git init --template=` 與 `symbolic-ref`、G2 `git add`、G3 身分檢查、G4 `git commit`）、git 的環境變數與 PATH 解析（runner）、CW-W01–W03，以及 step 13 的下一步 N1–N7。spec 0005 第 2.1 版為需求依據，信任邊界見 spec 的「Trust Boundaries and Threat Model」（B1 下載的 archive、B5 終端機輸出、B7 git 的執行環境）。

方法：專案 `security-review` skill，由 review workflow 執行。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案、不執行指令；部分 git 行為由篩選者依原始碼記憶推論，沒有實際執行。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入、達到通報門檻的可利用缺陷：0 項。** 候選 9 項，獨立篩選判定都未達門檻（HIGH／MEDIUM 且信心 ≥ 0.8）。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | runner 只排除字面上等於 target 的 PATH 項目，target 底下的子目錄（例如 `node_modules/.bin`）裡的 `git` 仍可能被執行 | hardening：要能控制 archive，而 archive 本來就能經 `pnpm install` 執行程式碼 | 已修正（第 6 階段）：realpath 後等於 target 或位於其下的項目都略過，有測試 |
| 02 | `.git` 的 NTFS／HFS+ 別名可讓 archive 預先放入 git 設定，G1 會沿用、G2 會觸發 | true positive，未達門檻（low）；根因是 T-0021 規則 3 的 spec 缺口 | 記錄：與 T-0021 的同一缺口，交給 epic 收尾的串連分析；是否修訂規則 3 屬 spec 決定 |
| 03 | G4 的 `-c core.hooksPath=`（空字串）可能讓 hook 路徑解析到磁碟根目錄 | true positive，未達門檻（low，信心 0.4，未實測） | 記錄：照 spec G4 字面實作，屬 spec 缺口；交給串連分析，必要時修訂 G4 改指向確定為空的目錄 |
| 04 | G1–G2 仍會執行老師全域設定的 hook、fsmonitor、filter driver | 模型外：B7 的「Does not protect」已列出老師自己的全域設定 | 記錄：Deliverable 的「no hook run」字面比 B7 的「no template hook run」寬，已在 ticket 的處置紀錄說明它只對 template hook 與 G4 成立 |
| 05 | PATH 比對不處理 symlink、大小寫與 8.3 短名 | hardening | 已修正，與 01 同一處（realpath 比較） |
| 06 | Windows 上環境變數名稱是 `Path`，runner 讀 `env.PATH` 會找不到 git | 模型外（功能缺陷，T-0025 接上 `bin` 後才會發生） | 已修正（第 6 階段）：win32 上不分大小寫找 PATH，有測試 |
| 07 | `GIT_` 前綴過濾區分大小寫，Windows 上 `Git_Dir` 會漏過 | 模型外：環境變數屬受信任範圍；decision 5 已記為已知限制 | 記錄 |
| 08 | PATH 前段名為 `git` 的目錄會被選中，後面真正的 git 試不到 | hardening（無資安影響） | 已修正：候選必須是一般檔案，有測試 |
| 09 | N3 直接插入 owner／name，沒有以 JSON 字串字面值印出 | hardening：engine 已限制字元集，目前沒有可利用路徑 | 已修正：N3 依 spec 以 JSON 字串字面值印出；N4 是供複製的指令，維持 POSIX 引號 |

## 沒有涵蓋

dependency scanning、可用性；Windows 上的實際行為（PATH、`git.exe`、hook 路徑，到 T-0025 的 cross-OS CI 才驗證）；訊號（T-0024 的 C56、CW-W05）；`bin` 對 runner 的接線（T-0025）。除測試實際執行的 git 外，判斷來自讀碼。本報告不代表整個專案沒有安全問題；epic 的串連分析在 epic 收尾時進行。

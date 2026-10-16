# Round 1 處置表 — epic 0005-create-wxl

依使用者 2026-10-16 裁決 D1（A：revision 2 修 P0 與 P1 根因群，P2 只收不增加表面的）與 D2（16 項取捨照表）。revision 2 的位置以 traceability 的段落名稱與列號表示。

## 根因群

| 群 | 處置 | revision 2 的位置 |
|---|---|---|
| N1 發布與 stage 8（P0） | `prepack` 執行 `prepareDist`（先刪 `dist/`、commit＝HEAD），`prepublishOnly` 執行 `checkPublish` X1–X8（新增 X6 tag 已推送、X7 試跑 P1–P4、X8 `dist/` 對應 HEAD）；執行時 CW-E13 自檢 | Package and publishing；C42、C43、C50；0005-S2、S4 |
| N2 互動重問（P0） | 第一輪只問未給旗標的題；引擎拒絕或摘要答 `n` 進第二輪，每題都問、目前答案當預設；無效答案重問該題；EOF → CW-E15 | Setup questions；C11、C13、C51、C52 |
| N3 seam 注入 | `run(argv, io, deps)` 注入 env、cwd、nodeVersion、locale、source、engine、`fetchArchive` 回 `{status, body}`、timeout、`runGit` 回 `{code, stdout, stderr}`／ENOENT、fs、signals、checkpoint；fixture 改為 entry 清單 | Seams 0005-S1、S2；Testing Decisions |
| N4 測試位置與 CI | 測試放 `create-wxl/test/`、自有 lockfile 與 vitest；cross-OS job 新增 step，不改舊 step | Seams 段末；U2、U3；C46 |
| N5 `range.json` 與 fork:init | 引擎排除 `range.json`（覆寫 0004 T51）；有 `range.json` 即非上游（覆寫 0004 T66） | Overridden contracts；C48、C61、C62 |
| N6 錯誤碼與檔案系統 | CW-E09 補列；entry 規則改為與順序無關並加 `.git`、`\`、大小寫碰撞、pax comment；搬移回復；step 10 前重新檢查；暫存目錄以 `mkdtemp` 建立、只刪自己的；三種訊號；CW-E14；P1–P3 變體 | Step order、Signals、Archive entry rules、Pristine processing；C17–C21、C24、C27、C30、C31、C53–C57 |
| N7 `npm create` 旗標 | 文法與文件寫 `--`；CW-E05 提示；發布後由使用者手動確認（OQ-021） | Command grammar；U5、U7；CW-E05 |
| N8 可比對性 | 訊息、題目、下一步都有 id；`--host` 交給引擎、`--lang` 無效為 CW-E02；摘要用引擎的推導；stage 8 固定輸入；完整 manifest；U4–U6 固定字串 | Language、Setup questions、Next steps、Package、Stage 8 inputs、U4–U10；C08、C40、C41、C47、C63 |
| N9 git 強化 | 清除 `GIT_*`、`core.excludesFile=`、`add --force`、明確身分、關閉 hook 與簽章、不從 target 找 git | Git steps；C35–C38、C58、C59 |
| N10 文件與契約 | GLOSSARY 保留 0004 T79 句子並補舊義；stage 8 覆寫明文化（OQ-017）；註解清單；死引用記為已知限制；CW-E12 下一步；override 警告；輸出跳脫；版本檢查先於 import | U8–U10、Overridden contracts、Error codes、Out of Scope |

## 逐項

| id | 處置 |
|---|---|
| C-1 | 修正（N1） |
| C-2 | 修正（N3：引擎注入；S2 連結 `node_modules`） |
| C-3 | 修正（N4） |
| C-4 | 修正（N5，覆寫 T51，C61） |
| C-5 | 修正（CW-E09 → C54；P4 寫入失敗歸 CW-E09） |
| C-6 | 修正（N2） |
| C-7 | 修正（C51、C52；訊號窗 steps 3–7 → 130） |
| C-8 | 修正（規則 1 strict、規則 4、C55） |
| C-9 | 修正（step 1 由 `bin` 先檢查再動態 import；22.6.0 列；CW-E01 用環境語言） |
| C-10 | 修正（N7）；`npm create` 實跑延到發布後（OQ-021），原因：發布前 registry 上沒有這個套件 |
| C-11 | 修正（X6、X7） |
| C-12 | 修正（CW-E12 含 `cd`、`pnpm install`、重跑、G1–G4；引擎拋例外也走 CW-E12） |
| C-13 | 修正（C63） |
| C-14 | 修正（SIGTERM、SIGHUP、CW-W05）；SIGKILL 與斷電：無法處理，殘留的 `.create-wxl-*` 由老師刪除，不另列 |
| C-15 | 修正：step 10 前重新檢查（C53）、懸空 symlink（C07）、父目錄可寫（step 4）、互動時 CW-E04 重問、`cd` 加引號（N1 行）；EXDEV：暫存目錄建在 target 的父目錄，同一檔案系統，不另列 |
| C-16 | 部分修正：120 s 為總時限（step 6）；proxy、TLS 攔截、429 記入 Out of Scope（CW-E07 列出 URL 與狀態）；Git Bash 非 TTY：以旗標執行即可，不另列 |
| C-17 | 部分修正：`\`、大小寫與 NFC 碰撞（規則 3、4）、mode（step 8）；Windows 保留名稱與 MAX_PATH 記入 Out of Scope（Windows 只到單元測試） |
| C-18 | 修正：自動身分（G3 要求明確設定）、`commit.gpgsign`、`core.hooksPath`（G4）、強制加入的檔案（G2 `--force`）；`safe.directory`：靶場由執行者本人建立，不另列；無 `.git` 時的 simple-git-hooks：只印訊息、exit 0（研究紀錄查證），不另列 |
| C-19 | 修正：`--lang fr` → CW-E02；CW-E01／E02 用環境語言；`C`、`POSIX` → en（C41）；`zh_CN`、`zh_HK` → zh-TW 是刻意的（只提供兩種語言）；`LANGUAGE` 不讀，刻意 |
| C-20 | 修正（N5，覆寫 T66，C48、C62） |
| C-21 | 記為已知限制（D2 ⑯，Out of Scope） |
| C-22 | 修正：step 2 檢查；覆寫 commit 與引擎版本不一致可能 CW-E12，屬測試用途，CW-W04 說明 |
| C-23 | 修正（N3） |
| C-24 | 修正（C24、C27、CRLF 標記比對） |
| C-25 | 修正（`prepareDist` 先刪 `dist/`） |
| C-26 | 修正：C38 補 N2；`--help`／`--version` 明訂為 CW-E02 並在訊息給用法；`--` 結束旗標解析 |
| V-1 | 修正（N1） |
| V-2 | 修正（N2） |
| V-3 | 修正（N3） |
| V-4 | 修正：引擎注入；C08 改寫為 `parseForkInitArgs` 收到的 argv（固定順序）；`runForkInit` 收解析後的 args（C32） |
| V-5 | 修正：`fetchArchive` 回 `{status, body}`；`downloadTimeoutMs` 由 `run` 以 abort signal 執行；真正的 fetcher 只在 stage 8 走成功路徑，失敗路徑由 seam 測，接受此限制 |
| V-6 | 修正：`runGit` 契約；G0 偵測不算靶場的 git 步驟，C36 改為「沒有其他 `runGit` 呼叫」 |
| V-7 | 修正（entry 清單 fixture、`Header`） |
| V-8 | 修正（C54；fs 注入） |
| V-9 | 修正（搬移回復；target 回到原狀） |
| V-10 | 修正：時間窗統一為 steps 3–10；signals 注入與 checkpoint；C31 列出必測點 |
| V-11 | 修正（規則 4 與順序無關、重複路徑、先目錄後檔案） |
| V-12 | 修正：`--host` 值交給引擎（CW-E06／重問）；`--lang` 無效為 CW-E02 |
| V-13 | 修正（必填留空重問、S3 有效值） |
| V-14 | 修正（C63） |
| V-15 | 修正（訊息、題目、下一步的 id） |
| V-16 | 修正（Stage 8 inputs；GitHub Pages 讀推導值） |
| V-17 | 修正（run I 比對 `git ls-files`） |
| V-18 | 修正（U3 確切 `run`） |
| V-19 | 修正（C48：在靶場跑 `pnpm test --run`；覆寫 T66） |
| V-20 | 修正（完整 manifest） |
| V-21 | 修正（U5 固定字串、U6 編號） |
| V-22 | 修正（`module` 注入；`node_modules` 連結） |
| V-23 | 修正（N3） |
| V-24 | 修正：`bin` 先檢查再動態 import；22.6.0 在 CI 實跑：不加（CI 矩陣維持 22、24），C01 以注入版本測 |
| V-25 | 修正（同 id、文字不同；CW-E01／E02 語言） |
| V-26 | 修正：W03 後的指令（N2）；佔位字明訂；`--force`；以 `HOME` 與 `GIT_CONFIG_GLOBAL` 隔離 |
| V-27 | 修正：AC-14 改引用 C32 的範圍；單引號作用在每個 argv 項目；引擎拋例外走 CW-E12 |
| V-28 | 修正：`--flag=value`、`--`；`upgrade` 在任何位置；`CREATE_WXL_COMMIT` 在 step 2 |
| V-29 | 修正（各 AC 補 exit code 與「什麼都沒寫」；AC-11 涵蓋檔案不存在與無法解析） |
| V-30 | 修正（規則 1 列出型別；去前綴後的路徑規則） |
| V-31 | 修正（`create-wxl/.gitignore`，U2） |
| V-32 | 修正（空白折疊比對、`stay forkable` 不得存在） |
| V-33 | 修正（C44 明訂目錄 entry `.proj.specs/` 存在） |
| V-34 | 部分修正：B4、B5、B7 的保證由 C07、C30、C53、C58–C60 覆蓋；B1 的「傳輸內容可信」不另驗 |
| V-35 | 修正：S3 讀 create-wxl lockfile，X5 的一致性在發布時檢查；CI 不另檢查 root `yaml` 升版，接受（升版時 X5 會擋發布） |
| V-36 | 修正（解碼 entity；讀建置產物；S4 在最後一張改 create-wxl 的 ticket） |
| V-37 | 修正（摘要有效值） |
| K-1 | 修正（N5） |
| K-2 | 修正（N5） |
| K-3 | 修正：新增 step、舊 step 不動，不需覆寫 0004 T72 |
| K-4 | 修正（N4） |
| K-5 | 修正（N1） |
| K-6 | 修正（U10 保留 0004 T79 的句子） |
| K-7 | 修正（U10 舊義 `_Avoid_`；C47） |
| K-8 | 修正（Vocabulary 註明與 0004 upstream-pristine check 無關） |
| K-9 | 修正：「package source record」改名並註明與 setup record 的差別；setup 的定義維持 |
| K-10 | 修正（U5 禁用三個新造詞） |
| K-11 | 記為已知限制（D2 ⑯） |
| K-12 | 修正（U4 整個 bullet 逐字、`stay forkable` 不得存在、保留主機名稱） |
| K-13 | 修正（Overridden contracts、U8） |
| K-14 | 修正（CW-E12 含 `pnpm install`） |
| K-15 | 修正（G4 註明為產品輸出，hard rule 5 不適用） |
| K-16 | 修正（`upgrade` 在任何位置都保留給 0006；入口在 0006 以 `range:upgrade` 從靶場啟動） |
| K-17 | 維持：override 是測試用途，CW-W04 與 B6 說明 |
| K-18 | 修正（U9） |
| K-19 | 修正（U6、Further Notes） |
| R-1 | 修正（N5） |
| R-2 | 修正（N1） |
| R-3 | 修正：`prepareDist` 先刪 `dist/`；CW-E13 執行時自檢；略過 lifecycle scripts 仍可能發布，記入 B2 的 Does not protect |
| R-4 | 修正：CW-W04；B6 改寫為 fork network 可下載；`range.json` 不標記 override（測試用途） |
| R-5 | 修正（N7）；`INIT_CWD`：不採用，`npm exec` 以呼叫者的 cwd 執行 initializer，由 OQ-021 的手動確認一併驗證 |
| R-6 | 修正（G2） |
| R-7 | 修正（搬移回復） |
| R-8 | 修正（X7） |
| R-9 | 修正（X6） |
| R-10 | 修正（N4） |
| R-11 | 修正（step 10 重新檢查） |
| R-12 | 修正（B5、AC-24） |
| R-13 | 修正（C63） |
| R-14 | 修正（N5） |
| R-15 | 修正（G3、G4 `user.useConfigOnly`） |
| R-16 | 修正（Signals、CW-E14、CW-E12 涵蓋拋例外、P4 歸 CW-E09、損毀壓縮檔歸 CW-E08）；git 步驟中斷 → CW-W05、exit 130 |
| R-17 | 修正（`mkdtemp`、模式正規化、父目錄可寫、只刪自己的路徑） |
| R-18 | 修正（規則 3 拒絕 `.git`）；`git~1` 等 8.3 短名：Windows 只到單元測試，記入 Out of Scope 的 Windows 項 |
| R-19 | 部分修正：`\`、碰撞、重複、mode、owner、strict、pax SHA；保留檔名與大小上限記入 Out of Scope；單次解析：先解析成清單、只寫清單內的項目 |
| R-20 | 修正：`runGit` 不從 target 解析 git；`cd` 加引號；CW-E12 註明 POSIX shell |
| R-21 | 修正（`--flag=value`、`--`、空位置參數） |
| R-22 | 修正（`~` 開頭重問） |
| R-23 | 記入 Out of Scope（proxy）；時限維持總時限 120 s |
| R-24 | 記為已知限制（D2 ⑯） |
| R-25 | 不採用：X4 已要求乾淨工作樹，X8 比對 HEAD 的內容；skip-worktree 屬維護者本機設定 |
| R-26 | 修正（step 1） |
| R-27 | 留給 0006（其 B3 處理 `range.json` 作為信任輸入） |
| R-28 | 記入 Out of Scope |
| R-29 | 修正（清除 `GIT_*`、關閉簽章與 hook）；逾時：不加，git 步驟都是本機操作 |
| R-30 | 修正（checkpoint 只作為參數，`bin` 傳 no-op） |
| R-31 | 修正（`upgrade` 在任何位置） |
| R-32 | 修正（`lstat`；C07 懸空 symlink） |

## revision 2 新增表面的自我檢查

見 traceability「Self-check of the surface (revision 2)」：兩處覆寫與既有測試互斥檢查、`--force` 與 `.gitignore`、`prepack` 的 commit 與 X3/X6/X8、規則 4 與上游自身路徑（實測上游 `git ls-files` 沒有大小寫碰撞）。

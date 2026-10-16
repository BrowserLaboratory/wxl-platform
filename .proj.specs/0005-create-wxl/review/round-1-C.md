# Round 1 — 軸 1 完整性（epic 0005-create-wxl）

審查版本：spec.en.md blob `92aa83414f81c7e56cb42d28652e35390b133fb2`、traceability.md blob `22688ad192a7cbfadea3ed432dee24791ea72e73`，HEAD `c707b40`，凍結 prompt blob `26a21e6a8cd7997ec1c0d03dfd4bc0922c453eb3`。審查員沒有 shell，直接讀工作樹檔案，未自行核對 hash；主 session 派工時已核對上列 hash。

| id | 位置 | 問題 | 信心 | 等級 |
|---|---|---|---|---|
| C-1 | traceability 0005-S4、X1–X5、U2；AC-22 | `dist/` 只由 `prepublishOnly` 產生，`npm pack` 不觸發它；X3 要求 tag `vV` 指向 HEAD，ticket 分支沒有 tag。stage 8 與 CI 沒有合規途徑產生 source record 與引擎，AC-22 照字面做不到 | 高 | **P0** |
| C-2 | S1、S2；C08–C13、C32–C34、C43 | 測試取得引擎的方式未定義：S1 沒把引擎列為可注入依賴；`dist/` 在 CI 不存在；S2 在暫存 repo 匯入引擎時 `yaml` 解析不到 | 中高 | P1 |
| C-3 | U3、C46；`quality-gates.yml`、`vitest.config.ts` | CI 怎麼裝 create-wxl 相依（根目錄沒有 `tar`）、測試放哪裡（`create-wxl/` 不在 vitest include；放 `tests/` 會進靶場而匯入不存在的 `create-wxl/`）都沒定 | 中高 | P1 |
| C-4 | spec「fork:init never reads or writes it」；`fork-init.ts` rebrand 全樹替換 | `--rebrand` 會把 `range.json` 的上游 slug 換成老師的 repo，0006 會找錯上游；矩陣沒有「`range.json` × fork:init 模式」列 | 高 | P1 |
| C-5 | step 8 → CW-E09；自我檢查 | CW-E09 沒有任何列與 AC；暫存目錄建立失敗、磁碟滿、P4 寫入失敗沒有代碼 | 高 | P1 |
| C-6 | 題目只問未給旗標者；C11、C13 | 互動模式下旗標值被引擎拒絕（例如 `--repo bad`）或摘要答 `n`，旗標值永遠改不了，可能無限迴圈；沒有「互動、旗標全給」列 | 高 | P1 |
| C-7 | 題目、C31 | 必填題留空、S3 非 1/2、摘要輸入 `yes`/`Y`/其他、提問中 EOF、step 3–5 的 Ctrl-C（readline 預設 pause）沒有涵蓋，結束碼未定 | 中高 | P1 |
| C-8 | entry 規則、C17–C21 | 損毀或非 gzip 壓縮檔的代碼未定；空壓縮檔；重複路徑；先目錄後同名檔案（規則 4 擋不住）；contiguous／sparse 型別 | 中高 | P1 |
| C-9 | step 1、C01 | 入口若靜態匯入引擎或相依，舊版 Node 在 link 階段就失敗，看不到 CW-E01；22.6.0 邊界沒列；CW-E01 的語言未定 | 中 | P1 |
| C-10 | U5；S4 | `npm create wxl --flag` 的旗標會被 npm 吃掉，要 `--`；矩陣與文件沒涵蓋，S4 也繞過 `npm create` | 中 | P1 |
| C-11 | X1–X5 | 發布檢查沒確認 tag 已推上 GitHub，也沒確認發布的 commit 通得過 P1/P2 標記 | 中 | P1 |
| C-12 | CW-E12、C33；引擎例外 | CW-E12 後的下一步不足（`cd`、`pnpm install`、G1–G4）；引擎丟例外的處理未定 | 中高 | P1 |
| C-13 | 摘要 | 摘要的推導網址忽略使用者網站省略路徑、以及 `--origin` 搭配 github-pages | 高 | P2 |
| C-14 | C31 | step 11–12 的 SIGINT、SIGHUP/SIGTERM/SIGKILL 留下的暫存目錄、Windows Ctrl-C | 中 | P2 |
| C-15 | step 4、10 | step 4 之後 target 被建立（POSIX rename 會取代空目錄）、懸空 symlink、EXDEV、父目錄不可寫、互動時 CW-E04 是否重問、`cd` 未加引號 | 中 | P2 |
| C-16 | step 6 | proxy、TLS 攔截、120 s 是總時限或閒置、429、Git Bash 非 TTY | 中低 | P2 |
| C-17 | entry 規則 | 反斜線、Windows 保留名稱、大小寫碰撞、NFD、MAX_PATH、權限位元 | 中 | P2 |
| C-18 | G1–G4 | 自動偵測身分、`commit.gpgsign`、`core.hooksPath`、`safe.directory`、強制加入但被 ignore 的檔案、沒有 `.git` 時的 simple-git-hooks | 中低 | P2 |
| C-19 | 語言 | `--lang fr`、其錯誤訊息的語言、CW-E01 語言、`zh_CN`/`zh_HK`、`LANGUAGE`、`C`/`POSIX` | 高 | P2 |
| C-20 | C48；0004 T66 | `--no-setup` 或 CW-E12 的靶場在 `git init` 後、`fork:init` 前會被判為上游，upstream-only 測試會跑並失敗 | 中 | P2 |
| C-21 | U1、P2 | 出貨檔案（README、AGENTS.md、docs/agents、ADR、skills）引用已被移除的 OQ 與 `.proj.*` | 高 | P2 |
| C-22 | 覆寫 | `CREATE_WXL_COMMIT` 的檢查時機（step 2 或 6）與覆寫 commit 和引擎版本不一致 | 中 | P2 |
| C-23 | S1 | seam 沒列 Node 版本注入、中斷 hook；`fetchArchive` 回傳 bytes 卻要表達 404；120 s 由誰執行 | 高 | P2 |
| C-24 | P1–P3 | 檔案不存在、CRLF/BOM、P2 後只剩空白、`package.json` 沒有 `version` 或帶 BOM | 中 | P2 |
| C-25 | X 步驟 | 既有 `dist/` 的殘留與失敗時舊 `dist/` 的去留 | 中 | P2 |
| C-26 | C38、grammar | C38 漏 next steps；`--help`/`--version` 是否刻意為 CW-E02；`create-wxl -- upgrade` | 高 | P2 |

依等級統計：P0 1、P1 11、P2 14，共 26 項。

（審查員的完整原文含每項證據與建議，主 session 依其內容摘錄成上表；證據要點：npm `prepublishOnly` 只在 publish 時執行為推論未實測；`fork-init.ts` rebrand 的全樹替換與 `EXCLUDED_FILE` 為直接讀碼；`npm create` 吃旗標為依 npm 文件推論。）

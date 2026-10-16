# Round 1 — 軸 4 紅隊（epic 0005-create-wxl）

審查版本：spec.en.md blob `92aa83414f81c7e56cb42d28652e35390b133fb2`、traceability.md blob `22688ad192a7cbfadea3ed432dee24791ea72e73`，HEAD `c707b40`，凍結 prompt blob `26a21e6a8cd7997ec1c0d03dfd4bc0922c453eb3`。審查員沒有 shell；主 session 派工時已核對 hash。外部工具行為為推論。

| id | 問題 | 信心 | 等級 |
|---|---|---|---|
| R-2 | stage 8：`npm pack` 不跑 `prepublishOnly`，X3 在 ticket HEAD 必敗；打包可能夾帶舊 `dist/`，驗到錯的來源紀錄（同 C-1／V-1） | 中高 | **P0** |
| R-1 | `--rebrand` 改寫 `range.json` 的 `upstream.repository`（同 C-4／K-1） | 高 | P1 |
| R-3 | `npm publish --ignore-scripts`、`ignore-scripts=true`、`npm publish <tarball>` 繞過 X1–X5；成功後殘留的舊 `dist/` 可能被發布；建議準備腳本先刪 `dist/`、執行時自檢 `source.json` 版本 | 高 | P1 |
| R-4 | `CREATE_WXL_COMMIT` 透過 GitHub fork network 可下載任意 fork 的 commit，`range.json` 仍寫上游；沒有提示；version 與 commit 矛盾；指向 U1 前 commit 時上游專用檔進入靶場 | 中 | P1 |
| R-5 | `npm create wxl <dir> --flag` 的旗標被 npm 吃掉；S4 只跑 `npx` 驗不到；`npm exec` 的 cwd（低信心）（同 C-10） | 中 | P1 |
| R-6 | G2 `git add -A` 套用老師全域 excludesFile（如 `lib/`），commit 漏掉追蹤檔；建議 `--force` 或清空 excludesFile | 中 | P1 |
| R-7 | step 10 逐項搬移中途失敗或 SIGINT 讓 target 半套，違反「target 維持原狀」（同 V-9） | 中高 | P1 |
| R-8 | 發布沒有先對 HEAD 試跑 P1–P4，marker 不見時整個 npm 版本永久 CW-E10（同 C-11） | 中 | P1 |
| R-9 | X3 沒確認 HEAD 已推上 GitHub，未推送即發布會讓所有人 404（同 C-11） | 中 | P1 |
| R-10 | create-wxl 測試位置與相依安裝未定，靶場 `pnpm test` 可能失敗或上游 CI 引入未釘版相依（同 C-3／K-4） | 中 | P1 |
| R-11 | step 4 到 step 10 之間沒有重新檢查 target，空窗涵蓋整段問答 | 中 | P2 |
| R-12 | 回顯的引數、路徑、entry、git stderr 沒有 JSON 引號與控制字元跳脫，終端機跳脫序列注入 | 中 | P2 |
| R-13 | 摘要的 GitHub Pages 網址在 user site 與引擎不一致（同 C-13／V-14） | 高 | P2 |
| R-14 | `--no-setup` 或 CW-E12 的靶場被 0004 判為上游（同 C-20／K-2） | 高／中 | P2 |
| R-15 | G3 放行自動偵測的身分，帳號與主機名進公開 repo；建議 `user.useConfigOnly=true` | 中 | P2 |
| R-16 | 問答中 Ctrl-C（readline pause）、SIGHUP／SIGTERM、git 步驟中斷走 CW-W03 exit 0、引擎拋例外、P4 失敗、損毀 gzip | 中 | P2 |
| R-17 | 暫存目錄須 `mkdtemp`；rename 分支讓靶場變 0700；`.` 時父目錄不可寫；AC 的 glob 可能誘導刪別人的暫存目錄 | 中 | P2 |
| R-18 | entry 規則沒拒絕 `.git` 元件（含 NTFS／HFS 變體），可在 G1–G4 變成程式碼執行 | 中低 | P2 |
| R-19 | entry 規則其他缺口：`\`、磁碟代號、保留檔名、大小寫／Unicode 碰撞、重複路徑、mode／owner、兩次解析差異、非 strict、大小上限、第一層與 pax SHA 比對 | 中 | P2 |
| R-20 | Windows：在 child cwd 找 `git.exe`；CW-E12 的 POSIX 引號；`cd` 未加引號 | 低–中 | P2 |
| R-21 | engine argv 形式：`-` 開頭的值被 `parseArgs` 判為 ambiguous；`--` 與空位置參數 | 中 | P2 |
| R-22 | 互動輸入以 `~` 開頭 | 中 | P2 |
| R-23 | Node fetch 不讀 proxy；120 s 總時限 | 中 | P2 |
| R-24 | P2 截斷後靶場留下指向不存在 OQ 的引用（含 OQ-018 安全提醒）（同 C-21／K-11） | 高 | P2 |
| R-25 | X2、X4、X5 與引擎讀工作樹，skip-worktree 看不出修改；建議 `git show HEAD:<path>` | 低 | P2 |
| R-26 | 版本檢查在靜態 import 之後（同 C-9／V-24） | 中 | P2 |
| R-27 | `range.json` 的 `upstream.repository` 是 0006 的信任輸入，沒記成邊界 | 中 | P2 |
| R-28 | 已發布版本永久綁定 SHA，改寫歷史後沒有回收流程（`npm deprecate`） | 低 | P2 |
| R-29 | git 步驟可能卡住（gpgsign、hook）或被繼承的 `GIT_DIR` 等導向別處 | 低–中 | P2 |
| R-30 | SIGINT 測試 hook 若以環境變數觸發會成為正式介面 | 低 | P2 |
| R-31 | `upgrade` 只在第一個參數時保留，`create-wxl --lang en upgrade` 意義會改變 | 中 | P2 |
| R-32 | target 是懸空 symlink 時 `existsSync` 判為不存在；應用 `lstat` | 中 | P2 |

依等級統計：P0 1、P1 9、P2 22，共 32 項。

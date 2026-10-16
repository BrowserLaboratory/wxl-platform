# Round 2 — 軸 4 紅隊（epic 0005-create-wxl）

審查版本：spec.en.md blob `b61e6031517a00e2572063a8146c7a6f529fb5de`、traceability.md blob `ac164c561bb44918edb404fcfa78d504b4608282`（revision 2），HEAD `c707b40`，凍結 prompt blob `26a21e6a8cd7997ec1c0d03dfd4bc0922c453eb3`。審查員沒有 shell；主 session 派工時已核對 hash。外部工具行為為記憶推論。

| id | 問題 | 信心 | 等級 |
|---|---|---|---|
| R-1 | `prepublishOnly` 先於 `prepack`：X8 檢查上一次或不存在的 `dist/`，乾淨 checkout 上 `npm publish` 必敗；`npm pack` 留下的 `.tgz` 不在 `.gitignore`，讓 X4 失敗並可能被誤 commit（同 C-4） | 中高 | P1（接近 P0） |
| R-2 | 印給老師延後執行的 G2 `git add -A --force` 會在 `pnpm install`、`pnpm build` 之後把 `node_modules/`、建置產物、`.env` 一起 commit（CW-E12 的順序是先 `pnpm install`） | 高／中 | P1 |
| R-3 | 發布前沒有以 entry 規則 1、3 檢查上游自己的 archive；上游多一個 symlink 就讓該版本永久 CW-E08（同 C-8） | 中高 | P1 |
| R-4 | npm 名稱 `create-wxl` 在第一次發布前可能被搶註；B2 沒有涵蓋；建議先由使用者保留名稱、`checkPublish` 檢查維護者 | 中 | P1 |
| R-5 | `--host github-pages --origin bad` 時第二輪不問 S4，無限重問（同 C-9 的變體） | 高 | P2 |
| R-6 | `cd <directory>` 遇到 `-` 開頭變成 `cd -` 或選項；與 B5 的跳脫規則衝突；B5 未列環境變數的值 | 高 | P2 |
| R-7 | 空目標的父目錄不可寫或目標是 mount point（EXDEV）（同 C-7） | 中 | P2 |
| R-8 | 目標不存在時根目錄是 `mkdtemp` 的 0700；固定 mode 蓋過 umask（同 C-18） | 中 | P2 |
| R-9 | 訊號清理與進行中的 fs 操作競態；第二次訊號；SIGHUP 寫 stdout 會 EIO；git 子行程同時被殺、`index.lock` | 中 | P2 |
| R-10 | X6 查 `origin` 不一定是上游；annotated tag；commit 不要求在 `main` 上（同 V-15、C-32） | 中低 | P2 |
| R-11 | 間接相依可用 `npm-shrinkwrap.json` 鎖定 | 中 | P2 |
| R-12 | 測試的 `GIT_CONFIG_GLOBAL` 被剝掉；`XDG_CONFIG_HOME`、system config 仍會被讀（同 V-5） | 中高 | P2 |
| R-13 | `core.hooksPath=` 空值的行為無文件；`--no-verify` 管不到 `prepare-commit-msg`、`post-commit`；`init.templateDir`；B7 說 G2 關 hook 為文字錯誤 | 中低 | P2 |
| R-14 | 規則 3／4 與檔案系統別名不完全一致（HFS+ 忽略零寬字元、APFS 的 case folding）；寫檔不排他；規則 3 未拒絕控制字元 | 中低 | P2 |
| R-15 | 沒有列驗證 `runForkInit` 收到的是最後一次 `parseForkInitArgs` 的結果（N-5 的實際保證） | 中 | P2 |
| R-16 | `ignore-scripts=true` 時舊 `dist/` 可能通過 CW-E13；stage 8 後應刪 `dist/` 或在 `source.json` 記錄引擎雜湊 | 中 | P2 |
| R-17 | 下載時限是否涵蓋 body、中途中止的錯誤碼（同 V-12） | 中 | P2 |
| R-18 | Windows rename 遇防毒暫時 EPERM，沒有重試 | 中低 | P2 |
| R-19 | step 2 沒驗證 `repository`（同 C-26） | 中 | P2 |
| R-20 | 屬於他人或他人可寫的空目標，內容可在 commit 前被竄改 | 低 | P2 |
| R-21 | AC-10／B4 的全稱保證與「搬不回去時保留」例外衝突（同 V-7） | 高 | P2 |

依等級統計：P0 0、P1 4、P2 17，共 21 項。

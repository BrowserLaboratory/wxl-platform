# Round 1 — 軸 1 完整性（epic 0006-range-upgrade）

審查版本：spec.en.md blob `d1113f8391db30645b644356198f245d382e3a61`、traceability.md blob `a391c67dd7e2c7268b590a290e1b12308163a7d7`，HEAD `c707b40`，凍結 prompt blob `0bfaa5b27658fc9f79d7dc88e644a373a25534a2`。審查員沒有 shell，讀工作樹檔案；主 session 派工時已核對 hash。git 與 npm 行為多為推論。

| id | 位置 | 問題 | 信心 | 等級 |
|---|---|---|---|---|
| C-1 | U19、M12 | 預設 conflict style 只有兩個標籤，與「三個標籤」矛盾；`merge.conflictStyle` 受 config 影響（同 V-1） | 高／中 | P1 |
| C-2 | step 6、U08、U12、U13、AC-4 | `--from` 時 no-op 與降版判斷在下載前做不到；`--from <newer commit>` 會靜默降版；`--from <version>` 等於 target 時不會 UP-I01 | 高 | P1 |
| C-3 | O 定義、M10–M12 | o 是目錄／FIFO 時落到 M10 或 M12 而失敗；讀 FIFO 可能卡住（同 V-12） | 中高 | P1 |
| C-4 | step 9、M5／M6、還原指令 | 檔案↔目錄互換、父路徑是檔案、刪寫順序未定；還原應先 `git clean -fd` 再 `git checkout -- .` | 中 | P1 |
| C-5 | 路徑聯集 | 大小寫不敏感檔案系統上只改大小寫的改名可能刪掉新檔；NFC／NFD | 中 | P1 |
| C-6 | 位元組比較 | 老師編輯器存成 CRLF 時 `git status` 乾淨、磁碟位元組卻和 B 不同，造成大量假衝突 | 中 | P1 |
| C-7 | step 3、U20、U23 | Windows：`--show-toplevel` 斜線、symlink 權限、沒有執行位元；跨 OS CI 會紅 | 中 | P1 |
| C-8 | step 4、還原 | `status.showUntrackedFiles=no`、skip-worktree、sparse 讓乾淨檢查失準，之後 `git clean -fd` 刪掉老師的檔案（同 V-16，此軸 P1） | 中高 | P1 |
| C-9 | O、M5／M6、U22 | 被 ignore 且 o=b 時 M5 覆寫、M6 刪除，救不回；T 新增的路徑被 ignore 時不會出現在 diff（同 V-8） | 中 | P1 |
| C-10 | M1、step 5／9 | `range.json` 本身是 symlink 或目錄：讀寫會跟著連結走出範圍 | 中 | P1 |
| C-11 | U09、step 9 | 無效紀錄或 repository 不同又給了 `--from` 的順序；`upstream` 內額外 key 被丟掉；BOM | 中 | P2 |
| C-12 | spec「each commit's own `.gitattributes`」 | 早於 0005 U1 的 base（例如 fork 用 `--from 2.x`）會帶 `.proj.*`，M6 大量刪除；可能缺 P1／P2 標記而永遠 CW-E10 | 中 | P1 |
| C-13 | 設定衍生內容 | `deploy.yml` 是老師的檔案，模板更新後不會重新產生；T 新增含上游 slug 的內容不會改寫；都不會列出 | 中 | P1 |
| C-14 | 目錄層級 | 老師與 T 新增同一個題目 slug 會混合目錄；上游改名老師改過的檔案會兩份並存 | 中 | P2 |
| C-15 | M12；git 2.20 宣稱 | `git merge-file` 出錯回 255 被當衝突並寫入（可能清空檔案）；git 版本下限沒有檢查 | 中 | P1 |
| C-16 | U28 | step 3–6、8、10 的中斷；SIGTERM／SIGHUP | 中 | P2 |
| C-17 | step 8 | 讀取失敗沒有列；沿用 CW-E09 語意不同；暫存目錄不能寫 | 高 | P2 |
| C-18 | 文法 | `--from` 沒值、`--from=`、`--lang`、前導零版本；`create-wxl --lang en upgrade` 會建出巢狀範圍；升級路徑的 CW-E01 與 `CREATE_WXL_COMMIT` | 中高 | P2 |
| C-19 | repository 狀態 | 沒有 HEAD 的範圍、rebase／merge 進行中、在上游執行、`safe.directory`、升級後重跑、`--from` 等於 target 時永遠不建立 `range.json` | 中 | P2 |
| C-20 | U17 | 每列一條路徑蓋不到列內分支；M1 沒有直接檢查 | 高 | P2 |
| C-21 | 檔案模式 | 上游改既有檔的執行位元被靜默丟棄、不報告 | 中 | P2 |
| C-22 | UP-E05、`fetchArchive` | repository 大小寫比較規則；`--from <version>` 時 `fetchArchive` 的參數 | 中 | P2 |
| C-23 | U30 | exit 2 經 `pnpm run` 印 `ELIFECYCLE`；`npm run -- --from` 轉傳；npx cache 舊版 | 低–中 | P2 |
| C-24 | M12 | `package.json` 乾淨合併仍可能是不合法 JSON | 低–中 | P2 |
| C-25 | 0006-S2 | 依賴 0005 打包出的 source record（同 0005 C-1） | 中 | P2 |

依等級統計：P0 0、P1 13、P2 12，共 25 項。

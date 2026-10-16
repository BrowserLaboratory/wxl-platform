# Round 2 — 軸 1 完整性（epic 0005-create-wxl）

審查版本：spec.en.md blob `b61e6031517a00e2572063a8146c7a6f529fb5de`、traceability.md blob `ac164c561bb44918edb404fcfa78d504b4608282`（revision 2），HEAD `c707b40`，凍結 prompt blob `26a21e6a8cd7997ec1c0d03dfd4bc0922c453eb3`。審查員沒有 shell；主 session 派工時已核對 hash。

| id | 問題 | 信心 | 等級 |
|---|---|---|---|
| C-1 | 互動時目錄問來的、目標不可用要重問，但 C07／AC-4 寫 exit 1；沒有重問的列（同 V-8） | 高 | P1 |
| C-2 | N2 的條件「印過任何 CW-W」把 CW-W04、W05 算進去；`--no-setup`＋override 會印 N2，與 AC-16 衝突 | 高 | P1 |
| C-3 | 真 git 下沒有身分時 `git config` exit 1，CW-W02 與 CW-W03 同時成立；沒有真 git 無身分的列 | 中高 | P1 |
| C-4 | npm lifecycle 實際順序是 `prepublishOnly` 先於 `prepack`，X8 會檢查到舊的或不存在的 `dist/` | 中高 | P1 |
| C-5 | `prepareDist` 的 `mode` 未定義（同 V-3） | 高 | P1 |
| C-6 | CW-E13 需要套件自己的版本但 deps 沒有；`dist/` 缺漏時 `bin` 會在 import 引擎時崩潰，到不了 CW-E13 | 中高 | P1 |
| C-7 | 目標是空目錄但父目錄不可寫或目標是 mount point（EXDEV）時，下載後才失敗 | 中高 | P1 |
| C-8 | 上游自己的 archive 從未以 entry 規則 1、3 檢查；X7 只跑 P1–P4 | 高 | P1 |
| C-9 | 第二輪把主機改為 GitHub Pages 後，S4 的 origin 殘留且清不掉（同 V-17） | 高 | P1 |
| C-10 | cross-OS job 含 Windows，哪些列在 win32／root 略過未定（同 V-16） | 中高 | P1 |
| C-11 | 提問中 Ctrl-C（readline 的 SIGINT）沒有列與觸發方式 | 中高 | P1 |
| C-12 | 第二個訊號、step 11／13 的訊號、`--no-setup` 時 CW-W05、git 子行程同時收到 SIGINT、CW-E14 在其他時窗 | 中 | P2 |
| C-13 | 第二輪預設值來自無效旗標值；`--host 2` 互動與非互動不一致；`--host CLOUDFLARE-PAGES` 是否問 S4 | 中 | P2 |
| C-14 | S5 填過後回不到「沿用」；答案是否 trim | 中 | P2 |
| C-15 | 互動模式下給了全部或部分旗標沒有列 | 高 | P2 |
| C-16 | 摘要答案的大小寫與空白（同 V-31） | 高 | P2 |
| C-17 | P4 寫入失敗沒有錯誤碼（同 V-11） | 高 | P2 |
| C-18 | 目標根目錄 0700、umask、P1–P4 改寫檔的權限、FAT／exFAT | 中 | P2 |
| C-19 | step 10 重查的邊界：空目錄、目標被刪除；搬回失敗與 AC-10 衝突；刪暫存目錄失敗（同 V-6、V-7） | 中 | P2 |
| C-20 | 200 之後讀 body 斷線的錯誤碼（同 V-12） | 中 | P2 |
| C-21 | `runGit` 其他失敗型態、G0 非零、`PATH` 含 `.`、`GIT_TERMINAL_PROMPT` 未驗證、git 最低版本 | 中 | P2 |
| C-22 | zh-TW 模式下引擎訊息仍是英文，Solution 的全稱承諾 | 高 | P2 |
| C-23 | Node 版本比較只測兩個值（22.10.0、23.0.0、21.99.0） | 中 | P2 |
| C-24 | 空 archive、目錄 entry 結尾 `/`、type 0 結尾 `/`、隱含父目錄權限、case folding 演算法 | 中 | P2 |
| C-25 | 文法邊界：`--author --repo x`、`--author=`、`--no-setup=x`、`-h`、`~` 開頭的位置參數、`Upgrade`、pnpm 原樣傳 `--`、`CREATE_WXL_COMMIT=""`、CW-E02 的語言 | 中 | P2 |
| C-26 | step 2 沒有驗證來源紀錄的 `repository` | 高 | P2 |
| C-27 | N 行的引號邊界與 C37／N2 定義不一致（同 V-19、V-20） | 高 | P2 |
| C-28 | 互動模式下無法設定 GitHub Pages 自訂網域（S4 只在 Cloudflare 問） | 高 | P2 |
| C-29 | C48 與 stage 8 inputs 對不上（同 V-2） | 高 | P2 |
| C-30 | S3 測試位置與 `isUpstreamDecision` 來源（同 V-38） | 中 | P2 |
| C-31 | `create-wxl/` 新檔與上游 slug 侷限規則（keep list）未對應 | 中 | P2 |
| C-32 | X6 假設 `origin` 就是上游 | 中 | P2 |
| C-33 | `npm create`／`pnpm create` 底下 Ctrl-C 的訊號與結束碼 | 低 | P2 |

已核對無漏洞：所有 CW 碼有條件與列；P1／P2 標記在現行檔案上正確；C28 與 schema；C61、C62 與現行程式碼；根 vitest 不收 `create-wxl/test/`；`pnpm --dir create-wxl install` 為獨立專案；引擎 `main()` 有 argv 守衛；`deriveGithubPagesOrigin` 在 parse 成功後才呼叫。

依等級統計：P0 0、P1 11、P2 22，共 33 項。

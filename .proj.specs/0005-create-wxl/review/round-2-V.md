# Round 2 — 軸 2 可驗證性（epic 0005-create-wxl）

審查版本：spec.en.md blob `b61e6031517a00e2572063a8146c7a6f529fb5de`、traceability.md blob `ac164c561bb44918edb404fcfa78d504b4608282`（revision 2），HEAD `c707b40`，凍結 prompt blob `26a21e6a8cd7997ec1c0d03dfd4bc0922c453eb3`（與第 1 輪相同）。審查員沒有 shell；主 session 派工時已核對 hash。沒有模糊措辭。

| id | 問題 | 信心 | 等級 |
|---|---|---|---|
| V-1 | stage 8 run I 需要真的 TTY；未說明由誰執行、如何提供 pty；答案表缺 S6 的回答 | 高 | P1 |
| V-2 | stage 8 驗不到 T66 覆寫：run I 設定後 url 已非上游；run III 沒 `git init` 也沒跑測試；run II、III 沒跑 `pnpm test`；「通過」分不出略過或實跑 | 高 | P1 |
| V-3 | `prepareDist` 的 `mode` 參數沒有定義 | 高 | P1 |
| V-4 | AC-15「沒有 `GIT_*`」與 `GIT_TERMINAL_PROMPT=0` 矛盾 | 高 | P1 |
| V-5 | 測試的 `GIT_CONFIG_GLOBAL` 會被剝掉；`XDG_CONFIG_HOME` 與 system config 仍會被讀，C35／C37／C59 依機器而變 | 中高 | P1 |
| V-6 | C53：另一個行程建立的是空目錄時，重新檢查會通過，與預期 CW-E04 矛盾 | 高 | P1 |
| V-7 | AC-10「每個失敗 target 都如原狀」與「搬回失敗時保留」的例外衝突；搬回失敗沒有列 | 高 | P1 |
| V-8 | AC-4 寫 exit 1，但 step 4 規定互動且目錄是問來的時要重問 | 高 | P1 |
| V-9 | AC-18「zh-TW 文字都與 en 不同」對純指令行（N1、N4）不可能成立 | 高 | P1 |
| V-10 | AC-24 的 JSON 字面值與 N1、CW-E12 的 POSIX 引號衝突；含控制字元時無解 | 高 | P1 |
| V-11 | 寫入失敗的錯誤碼：P4 寫入失敗（處置表說 CW-E09 但 traceability 沒寫）、P1–P3 寫回失敗、ENOENT 與其他 errno 的界線 | 高 | P1 |
| V-12 | `fetchArchive` 的 body 型別、時限是否涵蓋 body、200 之後串流中斷歸 E07 或 E08 | 高 | P1 |
| V-13 | 答案轉 argv：是否 trim；S3 的 1／2 是否映射為名稱；旗標 `--host CLOUDFLARE-PAGES` 是否觸發 S4／CW-E05 | 高 | P1 |
| V-14 | 文法邊界：`--author --repo x`、單一連字號、`--no-setup=x`、`--site-name=` 空值 | 高 | P1 |
| V-15 | X6 未處理 annotated tag（應比對 `^{}`）；S2 測試應含 annotated tag | 中 | P1 |
| V-16 | Windows 與 root：mode、唯讀目錄無法觀察；「writable」判定方法未定；沒有略過規則 | 中高 | P1 |
| V-17 | 第二輪由 Cloudflare 改為 GitHub Pages 後，舊 origin 是否仍帶入 argv 與摘要 | 中 | P2 |
| V-18 | `parseForkInitArgs` 的拒絕與程式錯誤如何區分（`ForkInitArgError` 未注入） | 中 | P2 |
| V-19 | N2 的定義與 C37、C38 不一致；CW-W04 也會觸發 N2 | 高 | P2 |
| V-20 | N1 的引號方式、N2 是否帶 `-c` 與代入 `<V>` | 中 | P2 |
| V-21 | checkpoint 名稱與步驟邊界的訊號時窗 | 中 | P2 |
| V-22 | CW-W05 在 step 11、13 的內容；readline 的 SIGINT 路徑在 S1 觀察不到 | 中 | P2 |
| V-23 | P1 處理 CRLF 時保留下來的 `\r` 不唯一 | 中 | P2 |
| V-24 | AC-11 散文的「`## OQ-NNN `」會誤中格式範本標題（regex 不會） | 高 | P2 |
| V-25 | C45「apart from the two versions」漏了 `vitest` 與 `version` 佔位字；「exact」判準 | 高 | P2 |
| V-26 | S2 暫存 repo 沒有 `create-wxl/.gitignore`，`node_modules`、`dist/` 讓 X4 必敗 | 中高 | P2 |
| V-27 | U1 註解、U4 前綴、U5 題目清單、U6／U8／U9 沒有固定字串 | 中 | P2 |
| V-28 | stage 8 讀取對象：short-link chunk 檔名帶 hash；`git ls-files` 看不到目錄 entry；run II、III 的 `range.json` 預期值 | 中高 | P2 |
| V-29 | `bin` 層行為（版本檢查先於 import、`dist/` 缺漏）沒有驗收出口 | 高 | P2 |
| V-30 | CW-E13 的「套件自己的版本」不在 deps | 中 | P2 |
| V-31 | S6 回答的大小寫與空白 | 中 | P2 |
| V-32 | AC-9：多重違規點名哪一個；pax 缺少時點名什麼；碰撞點名哪一邊；case folding 的定義 | 中 | P2 |
| V-33 | 跳脫範圍：`JSON.stringify` 不跳脫 C1 與 DEL；互動答案出現在摘要 | 中 | P2 |
| V-34 | AC-10、C22 的「byte-identical」未排除引擎的修改 | 中 | P2 |
| V-35 | step 2 中 CW-E02 與 CW-E13 的先後 | 中 | P2 |
| V-36 | B4「只寫 target 與自己的暫存目錄」沒有 AC（可用 fs spy） | 中 | P2 |
| V-37 | X7 如何對 `git archive HEAD` 跑 P1–P4（無前綴、是否套用 entry 規則） | 中 | P2 |
| V-38 | S3 測試位置與上游判定函式的新介面 | 中 | P2 |

依等級統計：P0 0、P1 16、P2 22，共 38 項。

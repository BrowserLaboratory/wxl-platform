# Round 1 — 軸 2 可驗證性（epic 0005-create-wxl）

審查版本：spec.en.md blob `92aa83414f81c7e56cb42d28652e35390b133fb2`、traceability.md blob `22688ad192a7cbfadea3ed432dee24791ea72e73`，HEAD `c707b40`，凍結 prompt blob `26a21e6a8cd7997ec1c0d03dfd4bc0922c453eb3`。審查員只讀檔、未執行指令；npm 生命週期與 node-tar 行為為其既有知識的推論。全篇沒有模糊措辭。

| id | 位置 | 問題 | 信心 | 等級 |
|---|---|---|---|---|
| V-1 | AC-22、0005-S4、X1–X5 | `npm pack` 不跑 `prepublishOnly`，打包出的 tarball 沒有 `dist/`；X3 在 ticket 分支不成立。stage 8 指定的表面照字面跑不起來（同 C-1） | 高 | **P0** |
| V-2 | AC-6、step 5、題目表、C11、C13 | 「旗標給過就不問」與「重問／`n` 回到 S1」互斥；C11 的例子 `--repo bad` 是旗標，會無限迴圈（同 C-6） | 高 | **P0** |
| V-3 | S1；AC-8、12、14、15 | source record 與引擎無法在 S1 注入；`dist/` 在 CI 不存在 | 高 | P1 |
| V-4 | AC-5、14、16 | 「引擎收到的旗標」「呼叫一次」「沒呼叫引擎」在 S1 觀察不到；`runForkInit` 收的是解析後的 args，不是 argv | 高 | P1 |
| V-5 | S1 `fetchArchive`、C14 | 回傳 bytes 表達不了 404；120 s 由誰執行、是總時限或閒置未定；真正的 `fetchArchive` 失敗路徑沒有 seam | 高 | P1 |
| V-6 | `runGit`、AC-15 | `runGit` 回傳契約未定；以 `git --version` 偵測本身就是一次 git 指令，與「no git command run」字面衝突 | 高 | P1 |
| V-7 | fixture | `{ path → content }` 表達不了 symlink、device、pax header 等惡意 entry | 中 | P1 |
| V-8 | CW-E09、C30 | CW-E09 沒有列與 AC（同 C-5）；C30 的「injected rename failure」沒有注入點 | 高 | P1 |
| V-9 | step 10、AC-10、C30 | 搬移失敗後 target 的狀態三處說法不一；逐一搬到一半失敗是否搬回未定 | 高 | P1 |
| V-10 | B4、step order、AC-13 | SIGINT 時間窗三處寫法不同；測試 hook 與 child process 的 seam 未定 | 高 | P1 |
| V-11 | entry 規則 4、AC-9 | 規則 4 依順序判斷，AC-9 不依順序；重複路徑、先目錄後同名檔案未定（同 C-8） | 高 | P1 |
| V-12 | 文法 | `--host foo` 是 CW-E02 還是 CW-E06；`--lang fr` 是 CW-E02 還是退回 en | 高 | P1 |
| V-13 | 題目表 | 必填題留空、S3 非 1/2 的行為未定（同 C-7） | 高 | P1 |
| V-14 | 摘要 | 推導網址公式與引擎不一致（使用者網站、帶 `--origin`）（同 C-13，此軸要求 P1） | 高 | P1 |
| V-15 | 題目、next steps | 沒有代碼也沒有固定字串，「依序」無法判定；建議行首識別字 | 中 | P1 |
| V-16 | S4、AC-22 | stage 8 的輸入值沒有固定表；GitHub Pages 沒有「answered origin」 | 高 | P1 |
| V-17 | U1、AC-22 | codeload 實際套用 `export-ignore` 的結果沒有驗收；建議 S4 列出產生靶場的路徑 | 中 | P1 |
| V-18 | U3、C46 | CI 的確切 step、測試位置、依賴安裝未定（同 C-3） | 中高 | P1 |
| V-19 | C48 | 「上游以外略過」沒有 seam 執行；`--no-setup`＋`git init` 的靶場會被判為上游（同 C-20） | 中 | P1 |
| V-20 | U2 | manifest 欄位沒有可比對的值；建議完整範例 | 高 | P1 |
| V-21 | U5、U6 | 沒有固定字串與 OQ 編號，AC-21 判定不了 | 高 | P1 |
| V-22 | S2；X1、C43 | X1 在 S2 無法被違反；產生的引擎在暫存 repo 解析不到 `yaml`（同 C-2） | 高／中 | P1 |
| V-23 | S1 | 沒有 Node 版本、cwd、locale 的注入 | 高 | P2 |
| V-24 | AC-1 | 靜態 import 讓舊 Node 跑不到 CW-E01；22.6.0 從未在 CI 跑過 | 中 | P2 |
| V-25 | AC-18 | 「兩種語言都存在」的判準；CW-E01、CW-E02 的語言 | 中 | P2 |
| V-26 | AC-15 | CW-W03 之後的指令、佔位字、被 ignore 的追蹤檔、測試如何隔離 git 身分 | 中 | P2 |
| V-27 | AC-14 | 「as 0004 specifies」範圍；單引號是否含旗標名；引擎丟例外 | 中 | P2 |
| V-28 | 文法 | `--flag=value`、`--`、值被下一個旗標吃掉；`upgrade` 是 argv[0] 或第一個 positional；`CREATE_WXL_COMMIT` 的檢查時機 | 中 | P2 |
| V-29 | AC-3、5、10、11 | 部分 AC 沒寫 exit code 或「什麼都沒寫」；AC-11 未涵蓋檔案不存在與 JSON 無法解析 | 高 | P2 |
| V-30 | AC-9 | GNU header、OldFile／ContiguousFile、去前綴後的「絕對路徑」語意 | 中 | P2 |
| V-31 | X 步驟 | `dist/` 被 git 忽略不在 U 項目裡；否則第二次準備會被 X4 擋下 | 中 | P2 |
| V-32 | U4 | Charter 是斷行段落，`grep -F` 整句會失敗；沒檢查舊子句已移除 | 中 | P2 |
| V-33 | AC-20 | `.proj.specs/` 目錄 entry 本身算不算「under」 | 中 | P2 |
| V-34 | 信任邊界 | B 表的保證（例如只寫 target 與暫存目錄）沒有 AC | 中 | P2 |
| V-35 | S3 | S3 讀 lockfile 但沒有 AC 用到；`yaml` 升版要到 publish 才發現 | 中 | P2 |
| V-36 | AC-22 | `<title>` 是否先解碼；`SITE_ORIGIN` 讀原始碼或產物；哪張 ticket 跑 AC-22 | 中 | P2 |
| V-37 | 摘要 | y／n／Enter 以外的輸入 | 高 | P2 |

依等級統計：P0 2、P1 20、P2 15，共 37 項。

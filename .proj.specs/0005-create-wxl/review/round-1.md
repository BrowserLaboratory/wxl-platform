# Stage 3 round 1：總覽 — epic 0005-create-wxl

審查版本：spec.en.md blob `92aa83414f81c7e56cb42d28652e35390b133fb2`、traceability.md blob `22688ad192a7cbfadea3ed432dee24791ea72e73`，HEAD `c707b40`。凍結 prompt `review/prompt.md` blob `26a21e6a8cd7997ec1c0d03dfd4bc0922c453eb3`。

| 軸 | 檔案 | P0 | P1 | P2 | 合計 |
|---|---|---|---|---|---|
| 1 完整性 | `round-1-C.md` | 1（C-1） | 11 | 14 | 26 |
| 2 可驗證性 | `round-1-V.md` | 2（V-1、V-2） | 20 | 15 | 37 |
| 3 契約衝突 | `round-1-K.md` | 0 | 5 | 14 | 19 |
| 4 紅隊 | `round-1-R.md` | 1（R-2） | 9 | 22 | 32 |
| **合計** | | **4** | **45** | **65** | **114** |

## P0：兩個根因

| 根因 | 發現 | 說明 |
|---|---|---|
| N1 發布準備與 stage 8 | C-1、V-1、R-2（另 K-5 為 P1） | `dist/` 只由 `prepublishOnly` 產生，`npm pack` 不觸發；X3 要求 tag 指向 HEAD，ticket 分支不成立。stage 8 與 CI 都沒有合規途徑產生來源紀錄與引擎 |
| N2 互動重問 | V-2（另 C-6 為 P1） | 「旗標給過就不問」與「被拒或答 `n` 時重問」互斥，旗標值錯了會無限迴圈 |

## 根因歸群（P1／P2）

| 群 | 根因 | 發現 |
|---|---|---|
| N1 | 發布準備、`dist/` 產生、發布閘門 | C-1、C-11、C-25、V-1、V-22、V-31、V-35、K-5、R-2、R-3、R-8、R-9、R-25、R-28 |
| N2 | 互動輸入（重問、留空、無效值、EOF、Ctrl-C、`~`） | C-6、C-7、V-2、V-13、V-37、R-16（部分）、R-22 |
| N3 | seam 注入（來源紀錄、引擎、下載、git、fs、Node 版本、cwd、locale、fixture 形式） | C-2、C-23、V-3～V-8、V-23、V-26（部分） |
| N4 | create-wxl 測試位置、相依安裝、CI step | C-3、K-3、K-4、V-18、V-19、R-10 |
| N5 | `range.json` 與 fork:init（rebrand 改寫、上游判定） | C-4、C-20、K-1、K-2、R-1、R-14、R-27 |
| N6 | 錯誤碼與檔案系統語意（CW-E09、entry 規則、搬移回復、中斷、暫存目錄、P1–P3 變體） | C-5、C-8、C-14、C-15、C-17、C-24、V-9～V-11、V-29、V-30、R-7、R-11、R-16～R-19、R-32 |
| N7 | `npm create` 的旗標轉傳 | C-10、R-5 |
| N8 | 可比對性（文法、摘要網址、固定字串、stage 8 輸入、manifest 範例、U4–U6） | C-13、C-19、C-22、C-26、V-12、V-14～V-17、V-20、V-21、V-25、V-28、V-32～V-34、V-36、K-12、R-13、R-21、R-31 |
| N9 | git 步驟強化（全域 excludes、自動身分、環境變數、卡住、Windows 執行檔） | C-18、V-26、R-6、R-15、R-20、R-29、K-15 |
| N10 | 文件、詞彙與流程契約（GLOSSARY 覆寫、新詞、stage 8 覆寫、註解清單、死引用、CW-E12 下一步、override 警告、跳脫、proxy、版本檢查） | C-9、C-12、C-16、C-21、K-6～K-11、K-13、K-14、K-16～K-19、R-4、R-12、R-23、R-24、R-26、R-30、V-24 |

# Stage 3 round 1：總覽

審查版本：spec.en.md blob `b599e850176351a0f1a174f7ef87bd86ea481b62`、traceability.md blob `578af9f3eee43e6ba20fe595f557dcae0840a399`，HEAD `c0f7edf`，凍結 prompt `review/prompt.md`（blob `06f490b5a0edf9182dca7fa3d33b21003d4ae141`）。四位 `harness-reviewer` 於 2026-10-14 13:16 平行啟動，各審一個軸；parent 確認兩檔在審查期間未變（最後修改 13:14）。各軸原文：

| 軸 | 檔案 | P0 | P1 | P2 | 合計 |
|---|---|---|---|---|---|
| 1 完整性 | `round-1-C.md` | 1（C-1） | 19 | 22 | 42 |
| 2 可驗證性 | `round-1-V.md` | 1（V-38） | 26 | 18 | 45 |
| 3 契約衝突 | `round-1-K.md` | 0 | 8 | 17 | 25 |
| 4 紅隊 | `round-1-R.md` | 0 | 15 | 19 | 34 |
| **合計** | | **2** | **68** | **76** | **146** |

## P0

| id | 內容 | 性質 |
|---|---|---|
| C-1 | AC-G2／T66「`.git` 存在 → baseline null」沒有限定第一次設定，第二次儲存照字面會清掉 baseline，與 T69 互斥 | 措辭；同一問題另見 R-8、V-30 |
| V-38 | AC-U3 的驗證面寫「Browser panel」，本 repo 這個詞指題目頁的 `srcdoc` iframe，載不到 `127.0.0.1`；「all succeed」沒有可觀察結果 | 用語與驗收出口；同一問題另見 K-6 |

兩項都能用改寫解決，不代表規則本身無法實作。

## 依根本原因歸群（處置在使用者裁決後填寫）

| 群 | 根本原因 | 涉及的發現 |
|---|---|---|
| G1 | `runForkInit` 的全樹子字串 slug 替換：會改到設定紀錄、setup module 與測試、無關文字與建置產物，前綴疊加使冪等與補完失效，白名單形同虛設 | K-1、K-18、R-1、R-2、R-3、R-4、R-5、V-14、V-26、V-27、C-2、C-3、C-4、C-5、C-35 |
| G2 | baseline 與 git 的狀態機不完整：第二次儲存清空、git 失敗後永久沒有 baseline、`.git` 消失後假 baseline、baseline 是否真的是原樣無法驗證 | C-1、C-8、R-6、R-7、R-8、R-9、V-29、V-30 |
| G3 | 設定後的靶場與 fork 的既有 CI 轉紅：測試寫死上游網址、非根 base 的 smoke／L3、release.yml、版本對齊測試、新 job 在老師 repo 耗分鐘數 | K-2、K-20、R-15、R-16、R-17、C-6、C-7、V-40 |
| G4 | 網站名稱以 `v-html` 渲染在首頁 hero（stored XSS 或破版） | R-14、V-13、C-12 |
| G5 | 上游拒絕的判斷：只看 `origin`、只在沒有紀錄時檢查、URL 正規化未定義、貢獻者 fork 的 remote 配置 | K-5、R-10、V-32、C-16 |
| G6 | GitHub Pages base 與 `head` 裡的 favicon href 不同步 | K-3、R-18、C-11、V-44 |
| G7 | 下載、override、發布：override 可下載任何 fork 的 commit、release 檔可能沒打包、pre-publish hook、pax header、export-ignore 假設沒有驗收、npm 名稱 | R-11、R-12、R-13、R-22、R-23、R-24、V-5、V-9、V-43、C-20、C-24、C-25、C-26、C-28 |
| G8 | fork 路徑的紀錄：`upstream.version` 記成 `0.1.0`、讀取與建立順序、與 `fork:init` 交錯使用 | K-4、K-22、R-31、R-34、V-33、C-9、C-10 |
| G9 | 規格精度：紀錄檔名、seam 定義、API 表、字元類別、timeout 數值、Host/Origin 對應、狀態碼順序、教學與下一步全文、雙語字串 key | V-1、V-2、V-3、V-4、V-6、V-7、V-8、V-16～V-25、V-31、V-34～V-37、K-21、C-17、C-21、C-22、C-23、C-29、C-31、C-36、C-37、R-25、R-26 |
| G10 | Windows 行為：`start`、`.cmd` shim、rename 既有目錄、執行檔搜尋路徑 | R-29、C-14、C-39、C-40 |
| G11 | 本機 server 與頁面的其他細節：跨程序鎖、innerHTML、靜態路由、IPv6、阻擋只在 UI | R-27、R-28、C-19、C-34、V-28 |
| G12 | create-wxl 的檔案系統邊界：後處理與 rename 順序、競態、`.`、SIGINT、空目錄定義 | R-19、R-20、R-21、C-27、C-42、C-15、R-30、C-18、R-32 |
| G13 | 文件、詞彙與流程契約：Browser panel 用語、新造詞與 README 互斥、Charter、保留文件講上游身分、stage 8 覆寫未宣告、ADR／OQ、`origin` 撞名、skill 驗收指令、release 流程 | V-38、K-6、K-7、V-42、C-32、K-8、K-9、V-45、K-10、K-11、K-12、K-13、K-14、K-15、K-16、K-17、K-19、K-23、K-24、K-25、V-41、C-33、C-38、C-41 |

## 使用者裁決（2026-10-14）

**拆 epic，地基先做**（選項 A）。理由：146 項中最大的一群（G1）根源在套用引擎的改寫方式，整份修訂會新增大量規格表面，第 2 輪難以收斂；依 hard rule 3 的精神提早一輪拆分。否決 B（不拆、整份修訂後跑第 2 輪）、C（不拆、拿掉設定頁）。

拆分後各自從第 1 階段開始、各走完整 9 階段：

| 新 epic | 範圍 | 承接的群 |
|---|---|---|
| 0003（暫名 apply-engine） | 安全、可重複執行的套用引擎（`fork:init` 改寫）、設定紀錄格式，以及設定後靶場與 fork 的 CI 不轉紅 | G1、G3、G4、G6、G8，加上 G9、G13 中屬於它的部分 |
| 0004（暫名 create-wxl） | 下載、解壓、拿掉上游紀錄、寫入紀錄、提示下一步 | G7、G12 |
| 0005（暫名 range-setup） | localhost 設定頁、環境檢查、baseline 與 git、上游拒絕 | G2、G5、G9、G10、G11 |

本目錄（`0002-create-wxl`）保留為範圍過大、第 1 輪後拆分的紀錄，不再修訂。stage 1 的 Q1–Q24 仍然有效，由三個新 epic 承接。

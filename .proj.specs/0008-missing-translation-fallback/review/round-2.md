# Stage 3 round 2：總覽 — epic 0008-missing-translation-fallback

依據：`round-2-C.md`、`round-2-V.md`、`round-2-K.md`、`round-2-R.md`。送審版本：revision 2，`spec.en.md` blob `c38a6aa`、`traceability.md` blob `9701eaf`，程式碼 HEAD `5d3c173`。四位 reviewer 皆為 `harness-reviewer`，凍結 prompt `review/prompt.md` 原文照用，只換版本。

## 統計與關卡

| 軸 | P0 | P1 | P2 |
|---|---|---|---|
| C 完整性 | 0 | 8 | 16 |
| V 可驗證性 | 0 | 4 | 11 |
| K 契約衝突 | 0 | 7 | 11 |
| R 紅隊 | 0 | 1 | 10 |
| 合計 | 0 | 20 | 48 |

**第 3 階段的關卡（P0 歸零）已達成。** 兩輪是上限，不開第 3 輪。比照 epic 0007：revision 3 套用本輪處置，新增規則先自我檢查互斥，P1 可以由 ticket 帶著。

## 群組與建議處置

| 群 | 主題 | 發現 | 建議處置 |
|---|---|---|---|
| J1 | 第三個內建選單 `VPNavBarExtra`（768–1279 寬），以及 hydration 之前內建選單仍可見 | C-1、V-4、R-7、C-24 | D7 改為「以建置期 CSS 無條件隱藏三個內建翻譯選單（含 `VPNavBarExtra` 的 translations 群組），不依賴執行期 class」；B4、V3 加 1024 寬 |
| J2 | not-found 頁上的語系選單 | R-1、C-3 | 新增 B7：對應頁在清單內就導覽；否則寫入選擇、停留，不顯示這一行；L1 註明 |
| J3 | B5 的選單結構與被覆寫的契約 | K-1、C-2、V-15、C-23 | B5 寫明：這一行顯示時，標題仍是頁面語系，選單列出兩個選項（另一個語系、頁面本身的語系）；覆寫表加入「只列另一個語系」「同語系選擇不做事」兩條契約與對應測試 |
| J4 | 查詢的唯一來源：not-found 路徑的正規化順序、router 別名、格式錯誤的編碼、W2 的判定時點、S1 的輸入 | V-1、C-6、R-5、R-6、C-18、K-7、K-8、C-15 | S1 的輸入加上「渲染結果（頁面 relativePath 或 not-found）」；頁面抵達的一切決策都用 relativePath，A1、B1 的目標取自清單；not-found 路徑：解碼（失敗即不在清單、不丟例外）→ 去掉 `.html`、`/index` → 帶與不帶結尾斜線兩種候選 → 各自求對應頁 → 與清單精確比對；W2 移到 router 解析之後判定（覆寫 `enhanceApp` 寫入時點，列入覆寫表） |
| J5 | fixture 與孤兒說明頁 | V-2、K-3、C-8、C-12 | 改正為「hook 與 CI 拒絕，產生器不拒絕」；AC-8 的 fixture 不含孤兒；孤兒（以 `--no-verify` 進來）的產生器輸出另列一列並以獨立 fixture 測；E3 條目不顯示短連結；E10 另設只用在 S4 的無號碼條目 |
| J6 | 第 8 階段 | V-3、C-4、V-5、V-7、V-9、V-10、V-14、R-11、C-19、K-5 | 見 U8；V 表重寫：V1d 依已翻譯與否拆列、每個請求前重設 stored 值；gate 情境寫明新分頁、選「繼續」；V2、V3 補 stored 值與請求網址；V1h 定義前一頁；fixture 題目 date 最新、號碼用 999；V1e 加開 `/zh-TW/`；補 1024 寬、題目頁 375 寬的 B2／B5、C3、W5 的 Back 檢查；收尾刪除拋棄式分支、preview 與臨時靶場 |
| J7 | 偏好的邊界 | R-3、R-4、C-14、R-9、C-16、R-8 | R-3：Solution 與 US6 改寫為「開啟網址帶語系前綴的已發布頁面（包括經短連結）視為選擇」；R-4／C-14 見 U9；R-9 見 U10；C-16：只改 hash 或 query 不算抵達；R-8：帶到落點的 requested locale 只綁定那次重導的目標，下一次抵達無條件清除 |
| J8 | session gate 的互動 | K-6、V-7、C-17、K-17 | 選單選擇（B2）的這一行不等 gate（選擇本身是明確動作，gate 也不是 modal）；信任邊界 B5 限定在冷載入與 not-found 抵達；C1 落到題目頁時，這一行等該頁 gate 的決定；B5 寫出 ADR-0006 的威脅模型句 |
| J9 | 文件與覆寫表的完整性 | K-2、C-7、K-4、C-5、K-11、C-20、C-21、K-9、K-12、K-13、K-14、K-15、K-16、K-18、K-10、V-13、C-22 | 覆寫表改為「列出的契約連同 pin 住它們的測試」，並逐檔補齊（`redirects-generated.test.ts`、`MergedNav.test.ts`、`shortLink.test.ts`、`pre-commit-sh.test.ts` 的 `FIXTURE_RULES`／H20／H37／H39、`initial-locale-redirect.test.ts`、`redirects.test.ts` 的空目錄斷言、`challenge-data-loaders.test.ts` 說明、0007 vocabulary／X1／X2／L01／L02）；H1 分成短連結與語系兩組，補 `pre-commit.sh` header 與 W4 訊息、`shouldPersistOnColdLoad` 與 `enhanceApp` 註解、`ShortLinkShare`／`shortLink.ts` 的「一題一個連結」註解；H3 補兩語 `network.md:52`、`guide/index.md:36` 與 troubleshooting「各自編號」句、症狀索引表；GLOSSARY 的 `/c/` 措辭改為「導向主語系那一頁的網址」、語系詞條的切換按鈕改為「用來選擇語系」；H2 與 AC-9 的禁用「主語系」範圍涵蓋 README；D10 限定在內容區 |
| J10 | 合併條目的細節 | V-12、C-9、C-10、C-11 | 借用欄位加 category；`id` 取英文說明頁的 frontmatter（有的話），否則共同順序的位置；fixture 寫明省略哪個欄位以驗預設值；首頁卡片的標記以頁面語系解析，靜態 HTML 就正確 |
| J11 | 其他 | R-2、R-10、C-13、V-6、V-8、V-11、V-14 | P6 改寫為落入 C8，並記下反方向（新增翻譯在舊分頁仍說沒有）；P6 改對應 AC-9；R-10 見 U11；T3：S4 不早於 D5 與 S1；A5 改為「storage 可寫時寫入」、A4 補「不寫入」；這一行放在 MergedNav 正下方、runtime 重置橫幅之上，文章頁用 doc layout 的 `doc-before`；AC-1 的 27 只作撰寫時註記，P5 寫明 dev 下重啟後更新；T4：每張票在自己的 preview 驗它宣告的 V 子列，AC-10 全表在最後一張票驗 |

## 需要使用者裁決

- **U8**：第 8 階段改在拋棄式分支的 preview 驗證，屬於明文覆寫 `workflow.md` 的「ticket 分支 preview」規則與 AGENTS.md 第 8 列的關卡。建議：明文覆寫並記入 OQ-017；拋棄式分支命名為 `stage8/<ticket-id>`，不算 ticket 分支；push 前先問使用者；fixture commit 照用 `/tw-emoji-commit`。
- **U9**：學生被重導（C2）或跟著連結到 `/zh-TW/` 頁之後按重新整理，偏好會被寫成 `zh-TW`。建議：接受並寫明（重新整理就是「開啟帶前綴的網址」），不加 `history.state` 標記。
- **U10**：storage 不能用時，英文讀者每到英文限定頁都會看到中文的這一行。建議：選單的選擇在寫入失敗時，於本分頁記在記憶體中，當作之後導覽的 requested locale。
- **U11**：題目頁的這一行不能關閉，窄螢幕會少一行作答空間。建議：不加關閉；第 8 階段在 375 寬實測面板仍可操作。

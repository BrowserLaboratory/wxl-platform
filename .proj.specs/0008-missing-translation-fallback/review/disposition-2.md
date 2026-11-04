# Stage 3 round 2：處置 — epic 0008-missing-translation-fallback

依據：`round-2-C.md`、`round-2-V.md`、`round-2-K.md`、`round-2-R.md`，以及總覽 `round-2.md`（群組 J1–J11）。第 2 輪沒有 P0，第 3 階段的關卡已達成；處置後的版本是 spec 與 traceability 的 revision 3（2026-11-04），不送第 3 輪，新增規則的互斥檢查寫在 traceability 的「Checks on this revision」。「已修」指 revision 3 改了 spec 或 traceability。

## 使用者的裁決（2026-11-04）

| Id | 問題 | 裁決 | 記為 | 涉及的發現 |
|---|---|---|---|---|
| U8 | 第 8 階段在拋棄式分支驗證 | 明文覆寫 workflow.md 與 AGENTS.md 第 8 列並記入 OQ-017；分支 `stage8/<ticket-id>`；push、建立與刪除臨時靶場前先問使用者；fixture commit 用 `/tw-emoji-commit` | D12 | K-5、R-11 |
| U9 | 重新整理後偏好被寫成 `zh-TW` | 接受並寫進文件，不加 history 標記 | D13 | R-4、C-14 |
| U10 | storage 不能寫時 | 選單的選擇記在本分頁的記憶體 | D14 | R-9 |
| U11 | 題目頁的這一行不能關閉 | 不加關閉；第 8 階段在 375 寬實測面板可用 | D15 | R-10 |

## 處置表

### 軸 1 完整性（C）

| 發現 | 等級 | 處置 |
|---|---|---|
| C-1 | P1 | 已修。D7 點名三個內建選單（含 `VPNavBarExtra` 的 translations 群組），隱藏規則不依賴執行期 class；B4、V3 加 1024 寬；「Checks」的 D7 檢查改寫。 |
| C-2 | P1 | 已修。覆寫表新增「只列另一個語系、同語系選擇不做事、標題不可互動」一列，連同 `locale-switcher.test.ts` 的對應案例；B5 寫明選單結構。 |
| C-3 | P1 | 已修。新增 B7；L1 維持 not-found 頁不顯示。 |
| C-4 | P1 | 已修。V1 表重寫：V1d（未翻譯）與 V1e（已翻譯，期望 A5 加 W2）分列；每個動作前開新分頁並重設 stored 值。 |
| C-5 | P1 | 已修。H3 加入兩語 `guide/network.md` 的句子。 |
| C-6 | P1 | 已修。查詢改為演算法：先去 `.html`、`/index`，帶與不帶結尾斜線兩個候選，各自求對應頁後精確比對；查詢表附此例（結果 C1）。 |
| C-7 | P1 | 已修。覆寫表補上 0007 的 H20、H37、H39 與 vocabulary、X1–X2、L01–L02，`pre-commit-sh.test.ts` 的 `FIXTURE_RULES`／`RETIRED_DOOR_RULES`，`pre-commit.sh` header 與 W4 訊息，`includeSlug` 說明，`MergedNav.test.ts`、`shortLink.test.ts`；G3 涵蓋未追蹤或忽略的繁中目錄；新增 G10（四種形式都補零）。 |
| C-8 | P1 | 已修。G6 改為「hook 與 CI 拒絕，產生器不拒絕」；新增 G9（孤兒的產生器輸出）並以獨立 fixture 測；AC-8 的 fixture 不含孤兒。 |
| C-9 | P2 | 已修。借用欄位加入 category。 |
| C-10 | P2 | 已修。`id` 依序取英文說明頁 frontmatter、繁中說明頁 frontmatter、共同順序位置。 |
| C-11 | P2 | 已修。E6：標記以頁面語系解析，靜態 HTML 即正確。 |
| C-12 | P2 | 已修。E3 條目不顯示短連結。 |
| C-13 | P2 | 已修。新增 T3。 |
| C-14 | P2 | 依 U9 接受並寫明（D13、W2、H2、H3）。 |
| C-15 | P2 | 已修。W2 改在 router 解析之後、依渲染頁面判定（D16）；覆寫表列入 `enhanceApp` 的寫入時點。 |
| C-16 | P2 | 已修。Vocabulary 的 arrival 與 L8：只改 hash 或 query 不算抵達。 |
| C-17 | P2 | 已修。C11：C 重導等 not-found 頁的 gate，落點頁的這一行等該頁 gate 的決定。 |
| C-18 | P2 | 已修。查詢演算法第 1 步：解碼失敗即不在清單、不丟例外；查詢表列出 `/zh-TW/%E0%A4%A`。 |
| C-19 | P2 | 已修。V1k（C3）、V1j（Back／Forward 的 W5）、V1l（題目頁 375 寬的 B2／B5）、V3（1024 寬、靜態 HTML）；C10 的構造路徑以單元測試為準，不在主機上請求（主機可能先正規化，觀察不到 S1 的行為）。主張「沒有導覽就不清空流量記錄」：屬 H3 文件陳述，由 V1l 的 B2 間接觀察。 |
| C-20 | P2 | 已修。H3 加入 guide index 與 troubleshooting 的「各自編號」句與症狀索引表。 |
| C-21 | P2 | 已修。H1 拆成 H1a、H1b，補齊 `shouldPersistOnColdLoad`、`enhanceApp`、`LocaleSwitcher`、`pre-commit.sh` 的註解。 |
| C-22 | P2 | 已修。D10 限定在內容區版面。 |
| C-23 | P2 | 已修。見 C-2，B5 寫明標題與選項。 |
| C-24 | P2 | 已修。見 C-1；V3 以停用 script 觀察靜態 HTML。 |

### 軸 2 可驗證性（V）

| 發現 | 等級 | 處置 |
|---|---|---|
| V-1 | P1 | 已修。見 C-6。 |
| V-2 | P1 | 已修。見 C-8；E10 另設只用在 S4 的無號碼條目，Testing Decisions 寫明 S6 只用前兩題與孤兒的獨立 fixture。 |
| V-3 | P1 | 已修。見 C-4；AC-10 寫明每個動作前開新分頁並重設。 |
| V-4 | P1 | 已修。見 C-1。 |
| V-5 | P2 | 已修。AC-3 寫明寬度子句由第 8 階段（V3、V1l）判定；V1l 涵蓋題目頁 375 寬。 |
| V-6 | P2 | 已修。A5「storage 可寫時寫入，否則 W6」；A4 補「不寫入（W4）」。 |
| V-7 | P2 | 已修。L1 加上 gate 條件；V1i 指定新分頁、新 session、選「繼續」。主張「clear 時重導不執行」：clear 會整頁替換到站台根目錄，屬既有 gate 行為，V 列不另測。 |
| V-8 | P2 | 已修。L3：MergedNav 正下方、runtime 重置橫幅之上；L4：`doc-before`、`page-top`、`home-hero-before`。 |
| V-9 | P2 | 已修。V2、V3 寫明 stored 值與請求網址（V2 直接請求 `/<repo>/zh-TW/challenge/<fixture>/`）；V1j 定義前一頁。 |
| V-10 | P2 | 已修。fixture 題目 date 最新、號碼 999；V1g 加開 `/zh-TW/`。 |
| V-11 | P2 | 已修。AC-1 改為「與 oracle 相等」，27 只作撰寫時註記；P5 寫明 dev 下重啟後更新；P6 改對應 AC-9。 |
| V-12 | P2 | 已修。見 C-9、C-10；fixture 寫明英文限定題目省略 category。 |
| V-13 | P2 | 已修。H1 拆兩組；新增 H7，禁用「主語系」的範圍是本 epic 改動、且在詞彙表語料範圍內的文件。 |
| V-14 | P2 | 已修。新增 T4：每張票驗自己列涉及的 V 列，全表在最後一張票驗。 |
| V-15 | P2 | 已修。見 C-2。 |

### 軸 3 契約衝突（K）

| 發現 | 等級 | 處置 |
|---|---|---|
| K-1 | P1 | 已修。見 C-2。 |
| K-2 | P1 | 已修。覆寫表改為「契約連同 pin 住它的測試」，並逐檔補列 reviewer 點名的測試；stage 6 拒絕表外的測試改動。 |
| K-3 | P1 | 已修。見 C-8；Testing Decisions 與「Checks」的產生器描述已改正。 |
| K-4 | P1 | 已修。見 C-5。 |
| K-5 | P1 | 已修（U8）。D12 明文覆寫並寫明分支命名、hard rule 1 不適用、push 與臨時靶場須經使用者同意、fixture commit 用 `/tw-emoji-commit`；H4 記入 OQ-017。 |
| K-6 | P1 | 已修。D17：選單選擇產生的這一行不等 gate；信任邊界 B5 改寫，限定等待的範圍。 |
| K-7 | P1 | 已修。S1 的輸入加入 router 的結果（渲染頁面的 source path 或 not-found）。 |
| K-8 | P2 | 已修。見 C-15。 |
| K-9 | P2 | 已修。覆寫表列入兩段「一題一個連結」註解，H1a 改寫。 |
| K-10 | P2 | 已修。G23 與 GLOSSARY 改為「導向主語系那一頁的網址，學習者最後看到哪個語系取決於偏好」。 |
| K-11 | P2 | 已修。見 C-20。 |
| K-12 | P2 | 已修。覆寫表列入 0007 的 vocabulary、X1–X2、L01–L02。 |
| K-13 | P2 | 已修。覆寫表：`redirects.test.ts` 的目標目錄檢查改為接受沒有繁中題目目錄的靶場。 |
| K-14 | P2 | 已修。覆寫表改為點名 `route-locale-sync.test.ts`，並註明 `theme-locale-wiring.test.ts` 保有自己的 watcher 副本。 |
| K-15 | P2 | 已修。覆寫表列入 `challenge-data-loaders.test.ts` 的說明。 |
| K-16 | P2 | 已修。GLOSSARY 語系詞條改為「用語系切換按鈕選擇語系」。 |
| K-17 | P2 | 已修。信任邊界 B5 寫出 ADR-0006 的威脅模型。 |
| K-18 | P2 | 已修。見 V-13（H7 涵蓋 README）。 |

### 軸 4 紅隊（R）

| 發現 | 等級 | 處置 |
|---|---|---|
| R-1 | P1 | 已修。見 C-3。 |
| R-2 | P2 | 已修。P6 改寫為落入 C8、按 Back 返回，並記下反方向（新增的翻譯在舊分頁仍被當成沒有）。 |
| R-3 | P2 | 已修。Solution 與 US6 改寫為「開啟網址帶語系的頁面（直接、經短連結或重新整理）就是選擇」；信任邊界 B4 寫明任何頁面都能連到 `/zh-TW/` 網址而設定繁中、本 epic 沒有連結能設定英文；H2 照改。 |
| R-4 | P2 | 依 U9 接受並寫明。見 C-14。 |
| R-5 | P2 | 已修。D16：每個決策都用渲染頁面的清單項目；A1、B1 的目標取自清單；別名網址是它渲染的那一頁（P7）。 |
| R-6 | P2 | 已修。見 C-18；信任邊界 B2 列入格式錯誤的編碼。 |
| R-7 | P2 | 已修。見 C-1、C-24。 |
| R-8 | P2 | 已修。Requested locale 表與 L6：帶到落點的值綁定那次重導的目標，下一次抵達無條件丟棄，落點為 not-found 時也丟棄。 |
| R-9 | P2 | 已修（U10、D14）。B6、W6。 |
| R-10 | P2 | 依 U11 不加關閉（D15、L9）；V1l 在 375 寬實測面板可用。 |
| R-11 | P2 | 已修（U8）。fixture 號碼 999；D12 與 V 表末段寫明第 8 階段後經使用者同意刪除分支、preview 與臨時靶場。 |

## 新增表面的自我檢查

revision 3 新增的規則（D12–D17、B5 改寫、B6、B7、C11、L1 改寫、L6、L8、L9、W2 改寫、E 的合併規則、G3、G6、G9、G10、T3、T4）已在定稿前逐項檢查互斥，結果寫在 traceability 的「Checks on this revision」。

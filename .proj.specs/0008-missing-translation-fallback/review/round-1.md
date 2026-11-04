# Stage 3 round 1：總覽 — epic 0008-missing-translation-fallback

依據：`round-1-C.md`、`round-1-V.md`、`round-1-K.md`、`round-1-R.md`。送審版本：`spec.en.md` blob `c1ab053`、`traceability.md` blob `7ea747c`，程式碼 HEAD `5d3c173`。四位 reviewer 皆為 `harness-reviewer`，各審一個軸，依凍結 prompt `review/prompt.md`。

## 統計

| 軸 | P0 | P1 | P2 |
|---|---|---|---|
| C 完整性 | 1 | 10 | 12 |
| V 可驗證性 | 1 | 9 | 12 |
| K 契約衝突 | 0 | 9 | 14 |
| R 紅隊 | 2 | 5 | 11 |
| 合計 | 4 | 33 | 49 |

P0：C-1、R-1（同一件事）、V-1、R-3。K-1、K-2 的 reviewer 註明也可以主張 P0。

## 主 session 的查證

- **Route watcher**：直接讀到 `.vitepress/theme/index.ts` Layout setup 的 watcher，在 `route.path` 跨語系時 `persistLocale(target)`；`tests/unit/i18n/route-locale-sync.test.ts` 釘住這個行為。C-1／R-1／K-2 的前提成立。
- **內建語系選單**：直接讀到 `USE_CUSTOM_LOCALE_SWITCHER = false`；旗標為 `true` 時，自訂 `LocaleSwitcher` 掛進 `nav-bar-content-before`，`style.css` 以 `body.use-custom-locale-switcher` 隱藏 `VPNavBarTranslations` 與 `VPNavScreenTranslations`。V-4／R-4／C-4／K-1 的前提成立；翻轉旗標是現成的接入點。
- **Cloudflare 上限**：Cloudflare Pages 文件（developers.cloudflare.com/pages/configuration/redirects/，2026-11-04 讀取）：「A `_redirects` file is limited to 2,000 static redirects and 100 dynamic redirects, for a combined total of 2,100 redirects.」編號規則屬 static，上限是 500 題；V-18／R-7／C-16／K-19 成立。文件沒有說超過上限會怎樣。

## 群組

| 群 | 主題 | 發現 | 需要使用者裁決 |
|---|---|---|---|
| G1 | 誰可以寫入語系偏好（route watcher、冷載入 404 寫入、requested locale 交給這一行） | C-1、R-1、K-2、V-2、C-2、R-5、C-21（後半） | U1 |
| G2 | 冷載入落在不存在的路徑：A 列與 C 列重疊、404 頁上的這一行、chunk 失敗、gate | V-1、C-3、R-9、R-10、R-2、C-22（前半）、V-17 | 否（機械修正） |
| G3 | `/en/c/` 在本 epic 仍會被導到繁中 | R-3、R-17、C-23、R-18、C-21（前半） | U2 |
| G4 | 文章頁的語系選單是 VitePress 內建元件 | V-4、R-4、C-4、K-1、R-14、C-20 | U3 |
| G5 | 從保底頁離開後留在英文樹 | C-12、R-12 | U4 |
| G6 | 第 8 階段：surface 用詞、測試題目、網址來源、缺列 | V-3、K-6、V-10、K-20、C-11、C-19、V-22、K-7、V-11 | U5 |
| G7 | 這一行在題目頁的位置、版面用詞、`lang` 值 | V-6、V-21、K-18、V-16 | U6 |
| G8 | A 列不完整、A6／A7 觀察不到 | V-7、C-15、V-5、C-5、K-3、R-11 | 否（隨 U1 改寫） |
| G9 | 頁面清單的拼法、正規化、對照來源、404、過期、dev server | V-8、C-6、K-10、V-9、C-7、V-13、R-13、C-22（後半） | 否 |
| G10 | 複製按鈕的 `locale` prop 要拆成兩個 | R-8、C-8、K-4 | 否 |
| G11 | 合併條目：鍵、預設值、id、順序、標記出現處、反向 fixture | V-15、R-15、C-13、V-14、R-16、C-14、V-12 | 否 |
| G12 | 文件與被覆寫的既有契約 | C-9、K-8、K-9、K-5、C-18、K-16、K-17、V-20、K-21 | 否 |
| G13 | 票的落地順序 | C-10 | 否 |
| G14 | 規則上限 | V-18、R-7、C-16、K-19 | 否 |
| G15 | 重導目標的同源保證沒有列 | R-6 | 否 |
| G16 | 用詞與其他 | K-11、K-12、K-13、K-14、K-15、K-22、C-17、K-23、V-19 | 否 |

各群的建議處置見下一節；使用者裁決後寫成 `disposition.md`，逐項回答每一個主張。

## 建議處置（待裁決）

- **G2**：S1 先用頁面清單判斷「這個路徑本身是不是已發布的頁面」。不是的話只走 C 列，A 列一律以「路徑是已發布頁面」為前提。C 只在「路徑不在清單、對應頁在清單」時重導，每次抵達最多一次；路徑在清單內卻得到 not-found（chunk 抓取失敗）就照常顯示 not-found，不重導、不顯示這一行。not-found 頁永遠不顯示這一行。C 比照 A10 等待 gate 的決定。
- **G8**：A 列改寫成完整決策表（stored × 前綴 × 路徑是否存在 × 對應頁是否存在 × 題目／文章 × base）。冷載入帶前綴的已發布頁面時，requested locale 就是前綴的語系（明確請求），A6 因此變成「不顯示」。
- **G9**：拼法規則改為「目錄 `index.md` 保留結尾斜線，其餘不帶」，與 `config.mts` 一致；列出正規化輸入／輸出表（含大小寫、百分比編碼、`/x/index`、無斜線的 `/zh-TW`）；真實樹的對照來源是 `platform/**/*.md` 依 srcDir 規則轉成的路徑；`/404` 不收錄；dev server 下同樣產生；重新部署後舊分頁的清單過期記為已知限制（最壞情況是 B1 導到不存在的頁，再由 C 接回）。
- **G10**：`ShortLinkShare` 拆成介面語系（一律是清單或頁面的語系）與連結語系（short mode 用清單語系，page mode 用條目頁面的語系）。
- **G11**：以 slug 合併；借來的條目，分類等預設值用清單語系的預設；順序與 id 以英文清單為準；標記出現在 list、grid 與首頁「最新題目」卡片；借來的標題與摘要帶 `lang`；fixture 加一個只有繁中的題目（只用在單元層）。
- **G12**：H 列擴充為逐句清單：兩語 troubleshooting 的 :150、:191、:216，`guide/index.md:66`，AGENTS.md 的 Repository layout，`numericRules`／`PARAMETERISED` 註解，`LocaleSwitcher` 的 runtime locale 註解，`USE_CUSTOM_LOCALE_SWITCHER` 註解；H4 加 OQ-016，並寫出 OQ-018、OQ-024 各自要記的事實。新增「Overridden contracts」一節：0007 的 H02、H14、H40，`pre-commit-sh.test.ts` 與 `redirects.test.ts` 相關斷言，`route-locale-sync.test.ts`、`locale-switcher.test.ts` 受影響的斷言。
- **G13**：新增約束：S6（規則）不得晚於 S5（複製形式）落地，兩者最好同一張票；S1 不得早於 S2。
- **G14**：上限改為 500 題；加一條 G 列以測試釘住「4N 條 static 加 4 條 dynamic」的算法；不加拒絕機制，在產生器註解寫明上限。
- **G15**：新增一列：重導的 pathname 一律等於 base 加上頁面清單中的那筆字串，只透過 router 導覽；以 `/zh-TW//evil.example/x`、`//evil.example/challenges`、`%2F`、反斜線測試結果同源。
- **G16**：K-11 在信任邊界加一行引用 ADR-0006；K-12 把 GLOSSARY 短連結 avoid 行的日期改成「本 epic 起」，並登記 `/c/NNN` 是「主語系的簡寫、不再發出」；K-13 G2 改用「主語系（今天是英文、放在網址根目錄）」；K-14 spec 一律用 locale switcher；K-15 H 列的文案避開「主語系」；K-22／C-17 在 Further Notes 寫明靶場升級後要 `pnpm redirects:generate`；K-23 沿用既有用法，不改；V-19 AC-8 比對規則順序與欄位內容，空白以產生器為準。

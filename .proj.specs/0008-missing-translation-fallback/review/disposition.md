# Stage 3 round 1：處置 — epic 0008-missing-translation-fallback

依據：`round-1-C.md`、`round-1-V.md`、`round-1-K.md`、`round-1-R.md`，以及總覽 `round-1.md`（群組 G1–G16）。處置後的版本是 spec 與 traceability 的 revision 2（2026-11-04）。「已修」指 revision 2 改了 spec 或 traceability；位置以 rev 2 的列號、決策或段落表示。rev 2 把「這一行」的列從 D1–D7 改名為 L1–L7，D 只用來指決策。

## 使用者的裁決（2026-11-04）

| Id | 問題 | 裁決 | 記為 | 涉及的發現 |
|---|---|---|---|---|
| U1 | 誰可以寫入語系偏好 | 只有明確選擇：語系選單的選擇，以及冷載入一個帶語系前綴、真的存在的頁面；其他一律不寫。介面語系仍跟著網址 | D5，W1–W6 | C-1、R-1、K-2、V-2、C-2、R-5、C-21 |
| U2 | `/en/c/NNN` 在本 epic 仍會被導到繁中 | 維持 D2，spec 誠實寫明本 epic 內 `/en/c/` 的行為與 `/c/` 相同 | D6 | R-3、R-17、C-23 |
| U3 | 文章頁的語系選單是 VitePress 內建元件 | 翻轉 `USE_CUSTOM_LOCALE_SWITCHER`，所有頁面都用 `LocaleSwitcher` | D7 | V-4、R-4、C-4、K-1、R-14 |
| U4 | 從保底頁離開後留在英文樹 | 這一行附一個連到所要求語系題目清單的連結 | D8 | C-12、R-12 |
| U5 | 第 8 階段的英文限定題目 | 只放在拋棄式分支，永不 merge；驗證改用 0007 V02 的句型 | D9 | K-7、C-19、V-22、V-3、K-6 |
| U6 | 這一行的位置 | 題目頁是 MergedNav 正下方的整列橫幅，說明收合時也看得到；文章頁是內文第一個元素；`lang` 固定寫 `en`／`zh-TW` | D10 | V-6、V-21、K-18、V-16 |

## 處置表

### 軸 1 完整性（C）

| 發現 | 等級 | 處置 |
|---|---|---|
| C-1 | P0 | 已修（U1）。主張「watcher 不在矩陣」：新增 D5 與 W1–W6，watcher 只設定介面語系、不再寫入；「Overridden contracts」列出 `route-locale-sync.test.ts`、`theme-locale-wiring.test.ts`。主張「C1 冷載後 storage 變成 `en`」：W3、W5、C5 規定 not-found 抵達與其重導都不寫入，AC-4 改為「writes no preference」。主張「E2 點擊翻轉偏好」：W5 明列未翻譯清單條目，V1f 在瀏覽器驗證。主張「內建選單路徑」：見 C-4。主張「notes.md:158 的連結」：W5 明列。 |
| C-2 | P1 | 已修。Requested locale 表新增「S1 自己做的重導把 requested locale 帶到落點，不算 later navigation」；L6 列；B2 的 line「shows at once」不依賴 route change（B2、AC-3）。 |
| C-3 | P1 | 已修（D11）。抵達先分類；A 只適用已發布頁面，C 只適用不在清單的路徑，兩者不再重疊；L1 規定 not-found 頁永不顯示這一行。 |
| C-4 | P1 | 已修（U3、D7）。B4 逐一點名 `MergedNav` 與預設主題 nav bar slot 的 `LocaleSwitcher`，兩種寬度 1280、375；內建選單隱藏；B2 規定不新增 history；V3 驗證。 |
| C-5 | P1 | 已修。A 列改寫為決策表；帶前綴的已發布頁面冷載入時，requested locale 是前綴的語系（Requested locale 表），舊 A6「stored `en`、line in `en`」的情況不再存在；A5 寫明寫入 `zh-TW`（W2），與 `enhanceApp` 的既有順序一致。 |
| C-6 | P1 | 已修。拼法規則改為「目錄 `index.md` 保留結尾斜線，其餘不帶」，與範例及 `config.mts` 一致。 |
| C-7 | P2 | 已修。頁面抵達改以 router 渲染的頁面（source path）查詢，不比對 URL 文字；not-found 路徑依查詢表正規化（含百分比編碼、大小寫區分）。 |
| C-8 | P1 | 已修。F10：控制項自己的文字用清單或頁面語系，只有連結依 F1–F6；`ShortLinkShare` 拆成兩個輸入（Implementation Decisions、Overridden contracts）。 |
| C-9 | P1 | 已修。H3 逐條點名 troubleshooting 的流量記錄、語系切換導向、兩份清單三段（兩語）與 guide index 的 Network 記錄句；H4 加 OQ-016。 |
| C-10 | P1 | 已修。新增「Constraints on the ticket breakdown」T1（S6 不晚於 S5，建議同票）、T2（S1 不早於 S2）。 |
| C-11 | P1 | 已修。V1 改為 V1a–V1h 對照表，涵蓋 A6（gate，V1g）、C5、C7、L5／W5 從清單點進（V1f）；V3 涵蓋 375 寬的 B4；V1e 涵蓋首頁卡片（E6）。F7 的不一致見 C-23。 |
| C-12 | P1 | 已修（U4、D8）。這一行附連到所要求語系題目清單的連結（Canonical sentences、L2）。 |
| C-13 | P2 | 已修。Merge rules：以 slug 合併；缺漏欄位用清單語系預設；`id` 用共同順序；借來的標題與摘要帶 `lang`（E2、E3、E5）。 |
| C-14 | P2 | 已修。E6：list、grid、首頁最新卡片都顯示標記。 |
| C-15 | P2 | 已修。A 列改成決策表，逐格寫出 stored 值、前綴、對應頁、題目／文章。 |
| C-16 | P2 | 已修。主 session 查 Cloudflare 文件確認 2,000 static 加 100 dynamic；上限改為 500 題；G8 釘住規則數；不加拒絕機制（Out of Scope）。 |
| C-17 | P2 | 已修。Further Notes 與 H2 寫明升級後依 CI 提示執行 `pnpm redirects:generate`。 |
| C-18 | P2 | 已修。新增「Overridden contracts」，列出 `redirects.test.ts` 的 `PARAMETERISED_RULES`、`NUMBERED_SOURCE`、「two parameterised rules」斷言與產生器註解；`challenge-data-loaders.test.ts` 的 `locale` 欄位屬 S4 新測試。 |
| C-19 | P2 | 已修（U5、D9）。測試題只在拋棄式分支；V1 寫明短連結在 preview 自己的 host 請求、複製控制只驗字串；V2 寫明靶場從拋棄式分支的 commit 建立。 |
| C-20 | P2 | 已修。主張「誤選後無法改回」：新增 B5，這一行顯示時選單也提供頁面本身的語系。主張「儲存失敗」：B6、W6。 |
| C-21 | P2 | 前半（猜測 `/en/` 路徑）：C3 明列為 not-found，Further Notes 說明 epic 2 才成為頁面。後半（slug 與編號連結對偏好的影響不同）：U1 之後兩者都不寫入（W3、W5），差異消失。 |
| C-22 | P2 | 已修。C11：C 比照 A6 等待 gate；P5：`pnpm dev` 也產生清單。 |
| C-23 | P2 | 記錄為刻意結果。F7 寫明同一題在 nav 給 `/en/c/NNN`、在繁中清單給 `/zh-TW/c/NNN`，兩者都打得開；理由見 D6。 |

### 軸 2 可驗證性（V）

| 發現 | 等級 | 處置 |
|---|---|---|
| V-1 | P0 | 已修（D11）。主張「A7 與 C1 對同一輸入矛盾」「A5 與 C2 矛盾」：抵達先分類，A 要求已發布頁面，C 要求不在清單的路徑。主張「requested locale 表無優先順序」：表改為依分類後的抵達種類各一列。 |
| V-2 | P1 | 已修（U1）。主張「watcher 在 replace 後寫入」：W5 規定不寫，AC-4 不再要求「still stores zh-TW」，改為不寫入。主張「C1 的 line 撐不撐過 replace」：L6 與 Requested locale 表。主張「Problem Statement 與 C5 不一致」：Problem Statement 改寫，C5 改為不寫入。 |
| V-3 | P1 | 已修（U5）。S7、AC-10、V 列改用「`/agent-browser` 或宿主原生瀏覽器工具；題目頁另開 Browser panel」。 |
| V-4 | P1 | 已修（U3）。見 C-4。 |
| V-5 | P1 | 已修。A 列重寫；舊 A6 移除；A5 寫明 requested locale 是前綴語系，與 `enhanceApp` 的寫入一致，瀏覽器可觀察。 |
| V-6 | P1 | 已修（U6）。L3、L4 指定插入點與收合時可見。 |
| V-7 | P1 | 已修。A 列改成決策表（stored × 前綴 × 對應頁 × 題目／文章 × base），AC-2 改為「每一列的每一格」。 |
| V-8 | P1 | 已修。見 C-6。 |
| V-9 | P1 | 已修。AC-1 改為「查詢表列出的每一種輸入」，查詢表列出輸入與正規化結果。 |
| V-10 | P1 | 已修。V1 寫明短連結在 preview 自己的 host 請求，複製控制只驗字串（V1e）。 |
| V-11 | P2 | 已修。V1a–V1h 表列出每一列的 stored 值與期望列。 |
| V-12 | P2 | 已修。fixture 加入只有繁中說明頁的題目（只在 S1、S4 使用），Testing Decisions 與 AC-6 寫明。 |
| V-13 | P2 | 已修。真實樹的對照來源改為 `platform/**/*.md`（扣除 `public/`、`shared/`）依拼法規則轉換；not-found 頁不收錄；schema 列出 `5d3c173` 的 27 個路徑。 |
| V-14 | P2 | 已修。見 C-14。 |
| V-15 | P2 | 已修。Merge rules 規定共同的 `id` 順序，兩份清單 `id` 相同，預設顯示順序因而相同（E4）。 |
| V-16 | P2 | 已修（U6）。`lang` 字面值 `en`／`zh-TW`（Canonical sentences、L2）。 |
| V-17 | P2 | 已修。C11。 |
| V-18 | P2 | 已修。見 C-16。主張「4 × 524 + 4 = 2100 不是 under」：成立，數字已改。 |
| V-19 | P2 | 已修。schema 註明 AC-8 比對規則順序與三個欄位，不比對空白；範例也改為實際的兩空白分隔。 |
| V-20 | P2 | 已修。H4 寫出 OQ-018、OQ-024 各自要記的事實。 |
| V-21 | P2 | 已修。D10：「除了這一行之外，版面不變」；Implementation Decisions 的 What stays 不再寫 page layout。 |
| V-22 | P2 | 已修（U5）。見 C-19。 |

### 軸 3 契約衝突（K）

| 發現 | 等級 | 處置 |
|---|---|---|
| K-1 | P1 | 已修（U3）。主張「內建選單不經 S1」：D7。主張「旗標註解說不需改 spec」：Overridden contracts 與 H1 列入該註解，改寫成指向本 spec。 |
| K-2 | P1 | 已修（U1）。三點分別見 C-1（E2、C1／C5）與 C-2（C1 對 D4）；「Checks on this revision」新增 D5 對 L5／L6、對 B2 兩項檢查；Overridden contracts 宣告覆寫 `route-locale-sync` 與 `theme-locale-wiring` 的斷言。 |
| K-3 | P1 | 已修。見 C-5；「Checks on this revision」的 A5 對明確請求規則一項補齊。 |
| K-4 | P1 | 已修。見 C-8；prop 文件列入 Overridden contracts。 |
| K-5 | P1 | 已修。新增「Overridden contracts」，列出 0007 的 H01（新題目只得到一條 `/c/NNN`）、H02、H14、H40、`pre-commit-sh.test.ts` 的三條規則斷言、`redirects.test.ts` 的斷言、`numericRules` 與 `PARAMETERISED` 註解；H1 擴及這些註解。 |
| K-6 | P1 | 已修。見 V-3。 |
| K-7 | P1 | 已修（U5）。D9：測試題只在拋棄式分支，不進 main 的號碼紀錄，也不需要上架閘門。 |
| K-8 | P1 | 已修。見 C-9。 |
| K-9 | P2 | 已修。新增 H5：AGENTS.md 的 Repository layout。 |
| K-10 | P1 | 已修。見 C-6。 |
| K-11 | P2 | 已修。信任邊界新增 B5，引用 ADR-0006。 |
| K-12 | P2 | 已修。H6；GLOSSARY.md 的短連結 avoid 行已改為「自 epic 0008 起」，並登記不帶語系代碼的舊寫法（working tree，隨本 epic 落地）。 |
| K-13 | P2 | 已修。G2 與 Vocabulary 改用 primary locale（「今天是英文、放在網址根目錄」），不再用 root locale 指概念。主張「E3 不算未翻譯」：Vocabulary 的 untranslated 改定義為「在清單語系沒有版本」，與 GLOSSARY 的翻譯詞條不衝突。 |
| K-14 | P2 | 已修。spec 統一用 locale switcher（Vocabulary）。主張「這一行與標記沒有詞條」：它們是介面元件與字串，不是領域概念，不新增詞條；H3 的文件用描述句而非新名詞。 |
| K-15 | P2 | 已修。H3 與 AC-9 規定繁中頁面不使用「主語系」。 |
| K-16 | P2 | 已修。Implementation Decisions 改為「pure functions over … the page list」，Overridden contracts 列入 `initial-locale-redirect.test.ts` 與 `locale-switcher.test.ts` 受影響的斷言。 |
| K-17 | P2 | 已修。H1 與 Overridden contracts 列入 `LocaleSwitcher` 的 runtime-locale 註解。 |
| K-18 | P2 | 已修。見 V-21。 |
| K-19 | P2 | 已修。見 C-16。 |
| K-20 | P2 | 已修。見 V-10。 |
| K-21 | P2 | 已修。H4 寫明 OQ-024 記下翻譯選配已由 stage 1 紀錄與 ADR-0008 決定、根語系搬遷屬於主語系 epic。 |
| K-22 | P2 | 已修。見 C-17。 |
| K-23 | P2 | 不改。「brief」在 AGENTS.md 與 challenge-pipeline 已是既有用法，reviewer 也註明如此；記錄於此。 |

### 軸 4 紅隊（R）

| 發現 | 等級 | 處置 |
|---|---|---|
| R-1 | P0 | 已修（U1）。見 C-1；「watcher 只在使用者主動選擇時寫入」這個建議就是 D5；D4 與 C 的優先順序見 C-2。 |
| R-2 | P1 | 已修（D11）。C 只在路徑不在清單時重導（C1、C2）；C8：路徑在清單內卻 not-found 時不重導、不顯示；C9：每次抵達最多一次。 |
| R-3 | P0 | 已修（U2、D6）。主張「US5 未兌現」：US 改寫為「上游改主語系之後仍開該語系」（US7），Solution 寫明本 epic 內的行為。主張「V1 對 G1 的觀察必然失敗」：G1 改為「轉到英文頁，之後是 A1–A4」，V1d 依 stored 值對照。主張「偏好 `zh-TW` 且對應頁存在沒有 A 列」：A1 涵蓋。 |
| R-4 | P1 | 已修（U3）。見 C-4。 |
| R-5 | P1 | 已修（U1）。W3：冷載入不存在的 `/zh-TW/` 路徑不寫入；Problem Statement 改寫；slug 與編號連結的差異消失（見 C-21）。 |
| R-6 | P1 | 已修。C10 與信任邊界 B2：重導 pathname 是 base 加清單項目、只經 router；列出四個構造路徑並要求同源。主張「query、hash 保留自 URL」：B2 明寫保留，與現行冷載入重導一致。 |
| R-7 | P2 | 已修。見 C-16；超量拒絕列為 Out of Scope。 |
| R-8 | P1 | 已修。見 C-8。 |
| R-9 | P2 | 已修。D11 與 C11。主張「gate 為 `cleared` 時整頁重載與 C 的 replace 競爭」：C 等 gate 決定後才執行，與 A 相同，不另立規則。 |
| R-10 | P2 | 已修。L1：not-found 頁永不顯示這一行；A 列要求已發布頁面。 |
| R-11 | P2 | 已修。見 C-5。 |
| R-12 | P2 | 已修（U4）。見 C-12。 |
| R-13 | P2 | 記為已知限制。P6：開著的分頁保留載入時的清單，最壞情況由 C 接回；Out of Scope 與 H3 寫明。未採用 `__VP_HASH_MAP__`，因為它只在 production 存在，`pnpm dev` 沒有。 |
| R-14 | P2 | 已修（U3）。所有頁面改走 `LocaleSwitcher`，B2 不新增 history。 |
| R-15 | P2 | 已修。見 C-13、V-15。 |
| R-16 | P2 | 已修。見 C-14。 |
| R-17 | P2 | 記錄為刻意結果。見 C-23。 |
| R-18 | P2 | 已修。見 C-21 前半。 |

## 新增表面的自我檢查

revision 2 新增的規則（D5–D11、W 列、B5、B6、C8–C11、L 列、E 列的合併規則、F10、G8、T1–T2）已在送第 2 輪之前逐項檢查互斥，結果寫在 traceability 的「Checks on this revision」。

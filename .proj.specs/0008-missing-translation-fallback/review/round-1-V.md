# Stage 3 第 1 輪：軸 2 可驗證性（Verifiability）審查報告

**審查範圍**：epic 0008-missing-translation-fallback。`spec.en.md` blob `c1ab0531`、`traceability.md` blob `7ea747cd`（working tree，未 commit）；程式碼 HEAD `5d3c173`。依凍結 prompt `review/prompt.md`。範圍含 pending 的 `GLOSSARY.md` 與 `docs/adr/0008-…`，本軸對它們沒有發現問題。reviewer：`harness-reviewer`（2026-11-04）。由父代理人照 reviewer 交回的報告存檔，內容未改。

讀過：spec、traceability、`.vitepress/theme/index.ts`、`.vitepress/theme/i18n/index.ts`、`LocaleSwitcher.vue`、`MergedNav.vue`、`ChallengeList.vue`、`HomeContent.vue`、`ShortLinkShare.vue`、`ChallengeLayout.vue`（版面區段）、`.vitepress/challenge/shortLink.ts`、`scripts/generate-redirects.ts`、`platform/shared/*.data.ts`、`.vitepress/config.mts`、`tests/unit/i18n/{locale-switcher,initial-locale-redirect,route-locale-sync}.test.ts`、VitePress 內建 `VPNavBarTranslations.vue`／`VPNavBarExtra.vue`／`VPNavScreenTranslations.vue`、`docs/agents/{workflow,platform-notes}.md`、0007 的 spec／traceability／round-1-V／K。

---

## V-1 cold load 一個 not-found 路徑時，rows A 與 rows C 同時適用，期望矛盾，requested locale 無法唯一決定 — P0

- **位置**：traceability.md:56–63、:166–175（A5、A7）、:190–194（C1、C2、C4）；spec.en.md:115–127（AC-2、AC-4）；V1 在 traceability.md:260。
- **違反**：每條 AC 都要能不經詮釋判定；requested locale 表聲稱每次抵達「恰好一個來源」。
- **證據**（直接讀到）：A7「Stored `en`, `/zh-TW/` path, counterpart exists → No redirect, no line」；C1「`/zh-TW/X` not found, `/X` exists → Replace … line in `zh-TW`」；C4 明文 cold load 也走 C1–C3。cold load `/zh-TW/challenge/<英文限定 slug>/` 且 stored `en`（正是 V1 要求的情境）同時符合 A7 與 C1，結論相反。A5 對 C2 同樣相反。requested locale 表中 cold load 與 not-found 兩列同時適用，沒有優先順序。推論：rows A 缺「路徑本身存在」的前提。
- **影響**：AC-2 與 AC-4 對同一輸入期望相反；V1 照字面執行必有一條 fail。
- **信心**：高　**等級**：P0
- **建議**：rows A 加上「path is a published page」前提，明文 not-found 優先；requested locale 表補「cold load 一個 not-found 路徑」的唯一來源。

## V-2 既有 route watcher 在 C1／C2 replace 時改寫 stored preference，AC-4 的「still stores zh-TW」與 C1 的 line 無法判定 — P1

- **位置**：spec.en.md:124–127；traceability.md:190、194（C1、C5）、:63、:205（D4）；`.vitepress/theme/index.ts:72–86`。
- **證據**：直接讀到 watcher 在 `route.path` 跨語系時 `persistLocale(target)`，`tests/unit/i18n/route-locale-sync.test.ts:99–112` 釘住此行為。推論：cold load `/zh-TW/X` 先由 `enhanceApp`（`index.ts:232–238`）寫入 `zh-TW`，C1 replace 到 `/X` 後 watcher 又寫入 `en`；C2 反向寫入 `zh-TW`。D4 說後續導覽的 requested locale 取 stored preference，line「re-evaluated on every route change」，replace 本身是 route change，此時 stored 已是 `en`，C1 的 zh-TW line 立即消失。Problem Statement 把「404 寫入繁中偏好」列為缺陷，C5 卻寫「Unchanged」。
- **影響**：AC-4 的 storage 子句判定取決於觀察時點；C1 的 line 是否撐過 replace 沒有規則。
- **信心**：高　**等級**：P1
- **建議**：明文 C-replace 時 watcher 是否寫入、AC-4 在哪個時點檢查；D4 寫明 C 類 replace 的 requested locale 帶到替換後的頁面。

## V-3 S7／AC-10／V1–V3 指定在「Browser panel」驗證，但本 repo 的 Browser panel 是題目頁裡的 srcdoc iframe — P1

- **位置**：traceability.md:37、:260–262；spec.en.md:150–153。
- **證據**：`docs/agents/platform-notes.md:7`「A challenge page's Browser panel is a `srcdoc` iframe without `allow-same-origin`」；`workflow.md:149–150` 規定瀏覽器 surface 用 `/agent-browser` 或原生瀏覽器工具。先例 0007 `round-1-V.md` V-4 同一問題判 P1。
- **影響**：stage 8 執行者需自行詮釋 surface，hard rule 4 的 surface 回報無法如實。
- **信心**：高　**等級**：P1
- **建議**：改為以 `/agent-browser` 或宿主原生瀏覽器工具驅動實際頁面；題目頁另開 Browser panel 確認題目照常畫出。

## V-4 B4／AC-3 的「both menus」未指名控制項；文章頁的語系選單是 VitePress 內建連結，S1 觀察不到 — P1

- **位置**：traceability.md:181–184、:31、:262；spec.en.md:67–71、120–123。
- **證據**（直接讀到）：`.vitepress/theme/index.ts:54` `USE_CUSTOM_LOCALE_SWITCHER = false`，文章頁用 VitePress 內建選單（`VPNavBarTranslations.vue:8`、`VPNavBarExtra.vue:11`、`VPNavScreenTranslations.vue:6`），皆以 `useLangs({ correspondingLink: true })` 產生 `<a>` 直連對應頁。題目頁用 `MergedNav.vue:249` 的 `LocaleSwitcher`，只有一個實例。推論：點內建選單會 push 到 `/zh-TW/reference/…`、404 後走 C1 replace 回來，外觀像 B2，實際「有導航、history 多一筆、watcher 寫入 `en`」，B2 不成立。
- **影響**：AC-3 不知道測哪些元件；V3 可能因外觀相似誤判 pass。
- **信心**：高　**等級**：P1（若內建選單沒有可行接入點，可能升 P0，由使用者判斷）
- **建議**：B4 逐一列出控制項，寫明文章頁怎麼讓它們走 S1（改用自製 switcher 或攔截），並為每個指定測試 seam。

## V-5 A6 的「counterpart missing」對 prefixed 路徑有兩種讀法，兩種都無法在瀏覽器觀察 — P1

- **位置**：traceability.md:171、:194、:284–285。
- **證據**：讀法一（`/zh-TW/X` 存在、`/X` 不存在）在真實樹到不了（G2），且 `enhanceApp` 經 `shouldPersistOnColdLoad` 在決策前把 stored `en` 改寫成 `zh-TW`，瀏覽器裡 line 不會出現。讀法二（`/zh-TW/X` 不存在）與 C1 衝突（V-1）。
- **影響**：A6 只能在 pure function 上通過，stage 8 不可能看到。
- **信心**：中高　**等級**：P1
- **建議**：寫明 A6 是哪種狀態；若是讀法一，比照 E3 標為「today unreachable, unit-level only」，並說明 stored 值在 persist 前或後讀取。

## V-6 AC-5「at the top of the content」在題目版面上沒有可判定的位置 — P1

- **位置**：spec.en.md:75–78、128–131；traceability.md:204；`ChallengeLayout.vue:831–886`。
- **證據**（直接讀到）：題目頁的 `<Content />` 在可收合的 `<aside data-description-panel>`（`v-show="!descriptionCollapsed"`）裡，上方另有 MergedNav、PersistenceWarning、runtime-reset 橫幅；spec.en.md:96–97 又寫「the page layout are unchanged」。
- **影響**：測試沒有可斷言的 DOM 錨點；說明收合時 line 是否可見沒有期望。
- **信心**：高　**等級**：P1
- **建議**：分別指定題目頁與文章頁的插入點，並寫明收合時是否可見。

## V-7 AC-2 宣告的交叉組合有多格沒有 row 給期望 — P1

- **位置**：spec.en.md:115–119；traceability.md:166–174。
- **證據**：例如 stored `zh-TW` + unprefixed + counterpart 存在；stored none 或 `zh-TW` + `/zh-TW/` 路徑；stored `en` + unprefixed + counterpart missing；challenge 與 article 各自的情況。A1–A9 未逐格寫出。
- **影響**：判定者需自行推導，「exactly」失效。
- **信心**：中高　**等級**：P1
- **建議**：AC-2 改成完整決策表（stored × prefix × counterpart × kind × base），或把交叉範圍縮到 rows 列出的格子。

## V-8 page list schema 的文字規則與範例矛盾（尾斜線） — P1

- **位置**：traceability.md:83–84 對 :86–96、:98–100；spec.en.md:111–114。
- **證據**（直接讀到）：文字寫「no trailing slash except the two home pages」，範例卻有 `"/guide/"`、`"/challenge/door-is-open/"`、`"/zh-TW/guide/"`。`config.mts` 的 `cleanUrls: true` 註解說目錄型 index 保留尾斜線，與範例一致。
- **影響**：AC-1 依哪一份判定結果相反。
- **信心**：高　**等級**：P1
- **建議**：文字規則改為「目錄 `index.md` 帶尾斜線，其餘不帶」。

## V-9 AC-1「every spelling of a page's path finds it」是沒有邊界的全稱 — P1

- **位置**：spec.en.md:113；traceability.md:158、:99–100。
- **證據**：P3 只列 trailing slash、`.html`、`index`；`/x/index`、大小寫、`//`、percent-encoding、`/zh-TW`（無斜線）是否算不明。正規化需要知道「是否目錄 index」，spec 沒寫規則。
- **影響**：測試永遠可以再舉一種拼法說它 fail。
- **信心**：中高　**等級**：P1
- **建議**：AC-1 改為「P3 列舉的拼法」，並列出正規化函式的輸入／輸出表。

## V-10 V1 的 F2–F3 複製出來的是 `SITE_ORIGIN`（正式站）網址；G1–G3 在哪個 host 請求沒寫 — P1

- **位置**：traceability.md:260；`shortLink.ts`（`SITE_ORIGIN = 'https://wxl.browserlab.online'`）。
- **證據**：short mode 的 URL 固定以 `SITE_ORIGIN` 開頭；英文限定測試題只在 preview。先例 0007 round 1 V-5 判 P1，修法是分兩步。
- **影響**：照字面 G1–G3 會 fail，或執行者自行改走 preview host。
- **信心**：高　**等級**：P1
- **建議**：V1 分兩步：F2／F3 只驗顯示與複製字串；G1–G3 與 C1 在 preview 自己的 host 直接請求。

## V-11 V1 要求三種 stored preference 輪流觀察，但多數 row 只定義一種 — P2

- **位置**：traceability.md:260；spec.en.md:150–153。
- **證據**：A1–A4 只定義 none／zh-TW；stored `en` 適用 A5。B2、E2、F2 與 preference 無關。
- **信心**：中　**等級**：P2
- **建議**：V1 列 preference × 動作 → 期望 row 的小表。

## V-12 共用 fixture 只有英文限定頁面，反方向 rows 無法用它測 — P2

- **位置**：spec.en.md:164–165、:132–137、:120–123；traceability.md:191、:214、:72。
- **證據**：fixture 的 untranslated 都是只有英文；C2、E3、B2 反方向、en 版句子、`Traditional Chinese only` 都需要只有繁中的頁面。
- **信心**：高　**等級**：P2
- **建議**：fixture 加一個只有繁中的題目（僅單元層），或為反方向另設 fixture。

## V-13 AC-1「from the real tree」缺獨立對照來源；404 頁是否算 page 未定義 — P2

- **位置**：spec.en.md:111–114；traceability.md:86–96、:156。
- **證據**：真實樹的期望集合在 schema 中以 `"…"` 省略；若兩者出自同一份 VitePress 頁面清單即自我比對。`/404` 是否收錄、D3 是否涵蓋 not-found 頁，都未說。
- **信心**：中　**等級**：P2
- **建議**：指定獨立 oracle（例如 `dist` 扣掉 404 的 `.html`，或 `platform/**/*.md` 依 srcDir 規則轉成的路徑），並明文 `/404` 是否收錄。

## V-14 標記在 grid 檢視與首頁卡片上是否出現，未規定 — P2

- **位置**：spec.en.md:79–84、132–137；traceability.md:213、216；`ChallengeList.vue` grid 模板、`HomeContent.vue` latest 卡片。
- **信心**：高　**等級**：P2
- **建議**：E2／E5 列出標記必須出現的檢視，或明文排除。

## V-15 E4／AC-6 的「same order」沒說是資料陣列順序還是畫面預設排序 — P2

- **位置**：traceability.md:215；spec.en.md:133；`ChallengeList.vue` 排序、`challenges.data.ts` 的 `id ?? idx+1`。
- **證據**：畫面預設依 `number`，沒有時退回 `id`，而 `id` 預設是各 loader 的 index；合併後借來的英文條目 id 可能與繁中條目撞號。
- **信心**：中　**等級**：P2
- **建議**：寫明比較畫面預設排序，並規定合併條目的 `id` 來源。

## V-16 `lang` 屬性的精確值不明 — P2

- **位置**：traceability.md:203；spec.en.md:129–130；`config.mts` root `lang: 'en-US'`。
- **信心**：中　**等級**：P2
- **建議**：列出字面值（例如 `en`／`zh-TW`）。

## V-17 not-found 導向（C rows）是否要等 session gate，未規定 — P2

- **位置**：traceability.md:175、:190–196；`index.ts:129–170`。
- **信心**：中　**等級**：P2
- **建議**：C rows 加一列，寫明是否比照 A10。

## V-18 「524 題」上限沒有 AC 檢查，且可能算錯 — P2

- **位置**：traceability.md:147–148。
- **證據**：4 × 524 + 4 = 2100，等於上限而非「under」。依記憶（未查證）Cloudflare 把上限拆成 2,000 static 加 100 dynamic，numbered rules 屬 static，實際 N ≤ 500。
- **信心**：中低　**等級**：P2
- **建議**：查證 Cloudflare 文件後修正，並決定是否加 G row 釘住上限。

## V-19 AC-8「equals the schema's layout」與範例空白不一致 — P2

- **位置**：traceability.md:140–147；spec.en.md:142–146；`generate-redirects.ts` 的 `formatRules`。
- **證據**：範例 `/zh-TW/c/:slug /zh-TW/challenge/:slug/  302` 第一欄後只有一個空白，generator 以 `padEnd` 加兩個空白，numbered 與 parameterised 共用欄寬。
- **信心**：高　**等級**：P2
- **建議**：AC-8 比對規則順序與欄位內容，空白以 generator 為準；或範例改為實際輸出。

## V-20 H4 對 OQ-024／OQ-018 只有形式要求，沒有內容 — P2

- **位置**：traceability.md:254；spec.en.md:147–149。
- **信心**：中　**等級**：P2
- **建議**：比照 H1–H3 列出兩則 OQ 應記下的具體事實。

## V-21 「the page layout are unchanged」與「在內容頂端插入 line」牴觸 — P2

- **位置**：spec.en.md:96–97 對 :75–78。
- **信心**：中　**等級**：P2
- **建議**：改成「除了 line 之外，版面不變」。

## V-22 V1 在 ticket 分支加英文限定題目，驗證的 commit 與 land 的 commit 是否相同未寫 — P2

- **位置**：traceability.md:260；spec.en.md:150–152；`generate-redirects.ts` 的 number 不重發註解。
- **信心**：中　**等級**：P2
- **建議**：寫明測試題放在拋棄式分支／preview，或寫明它會 land 為示範題並取得 number。

---

已檢查、本軸沒有問題：沒有 prompt 點名的模糊詞；唯一的「such as」在 Solution，是說明文字，AC-6 已用字面值釘住；AC-7（F1–F9）的 URL 都是字面值；G1–G3、G5–G7 可判定；句子與標記都用 equality 釘住；D5 可判定；`GLOSSARY.md` 的三個詞條本軸沒有問題。

合計：P0 1、P1 9、P2 12

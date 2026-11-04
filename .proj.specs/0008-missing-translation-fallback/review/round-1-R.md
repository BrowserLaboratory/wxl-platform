# Stage 3 第 1 輪：軸 4 紅隊（Red team）審查報告

**審查範圍**：epic 0008-missing-translation-fallback。`spec.en.md` blob `c1ab053`、`traceability.md` blob `7ea747c`（working tree）；程式碼 HEAD `5d3c173`；pending 的 `GLOSSARY.md` 與 `docs/adr/0008-…` 已讀。依凍結 prompt `review/prompt.md`。reviewer 未自行執行 Git，blob hash 以 parent 提供為準。reviewer：`harness-reviewer`（2026-11-04）。由父代理人照 reviewer 交回的報告存檔。

---

## R-1 既有 route watcher 每次跨語系樹的 client-side 導覽都寫入偏好，spec 未提及；D4 失效、E2 點擊翻轉偏好、AC-4 結尾狀態矛盾 — P0

- **位置**：`.vitepress/theme/index.ts:72-86`；traceability Requested locale `:63`、D4 `:205`、C5 `:194`、E2 `:213`；spec `:96-97`、AC-4 `:124-127`。
- **違反**：D1／D4（後續導覽的請求語系是 stored preference）、B2（store the choice）、AC-4（still stores `zh-TW`）。
- **證據（直接讀到）**：Layout 的 watcher 在 `route.path` 改變且語系前綴不同時執行 `i18n.global.locale.value = target; persistLocale(target)`；spec 與 traceability 都沒有提到這個寫入者。`platform/zh-TW/guide/notes.md:158` 今天就有繁中頁連往英文 reference 頁。
- **推論**：
  1. E2：點繁中清單裡未翻譯題目（`url` 為英文頁），watcher 把偏好寫成 `en`，D1 不成立，這一行永遠不出現；之後冷載入停在英文。
  2. C1 走 client-side replace 時，C5 剛寫入的 `zh-TW` 立刻被改成 `en`；AC-4 只在一瞬間成立。
  3. C1 的 replace 本身是 route change，D4 與 C 列的請求語系在同一次導覽上衝突。
- **影響**：本 epic 主要保護的預設繁中學習者，點一下未翻譯題目，偏好就被翻成英文且看不到說明；V1（E2、C1）的觀察取決於未描述的寫入者。
- **信心**：high（watcher 直接讀到；後果是推論）
- **等級**：P0（若使用者接受在 ticket 內補規則，可降為 P1）
- **建議**：新增決定與列：導往清單語系以外的未翻譯頁、以及 C 列的 replace，都不由 watcher 寫入偏好；或 watcher 只在使用者主動選擇語系時寫入；補一列 D4 與 C 列在同一次 replace 上誰優先。

## R-2 not-found route 不等於路徑不存在；chunk 抓取失敗也會產生 not-found route，C1／C2 互相跳轉成無限迴圈 — P1

- **位置**：spec `:72-73`；traceability C1／C2 `:190-191`；`node_modules/vitepress/dist/client/app/router.js:69-97`。
- **證據（直接讀到）**：`loadPage` 的 catch 在 fetch 失敗時重試 `hashmap.json` 一次，再失敗就把 component 設為 NotFound。頁面存在但離線或部署後 chunk 失效，同樣得到 not-found route。
- **推論**：離線點 `/challenge/a/` → NotFound → C2 replace 到 `/zh-TW/challenge/a/` → NotFound → C1 replace 回來，無限循環；每圈經過 R-1 的 watcher 改寫 storage。即使只彈一次，這一行也在說謊。
- **信心**：high（router 直接讀到；迴圈是推論）
- **等級**：P1
- **建議**：C 列條件改為「not-found route，且該路徑本身不在 page list、對應頁在 page list」；每次抵達最多一次 not-found 重導；補一列「路徑在清單中但 route 為 not-found」→ 顯示 not-found、不重導、不顯示這一行。

## R-3 `/en/c/NNN` 落在不帶前綴的語系樹，A1 會把無偏好或偏好繁中的學習者導去繁中；US5 未兌現，V1 無法照寫觀察 G1 — P0

- **位置**：spec US5 `:54`、Solution `:43-46`、AC-10 `:150-153`、Further Notes `:188-189`；traceability D2 `:23`、A1 `:166`、G1 `:239`、V1 `:260`。
- **違反**：US5「opens the same language for every student」；V1 要在 none、`zh-TW`、`en` 三種偏好下觀察 G1。
- **證據**：schema 把 `/en/c/001` 302 到 `/challenge/door-is-open/`（不帶前綴）；`redirectTargetForStoredLocale` 讓無偏好或偏好 `zh-TW` 的冷載入離開不帶前綴的樹，A1 明定照舊。
- **推論**：已翻譯題目的 `/en/c/001` 在無偏好或 `zh-TW` 時停在 `/zh-TW/challenge/door-is-open/`；V1 對 G1 的觀察三種偏好中有兩種必然失敗；本 epic 內 `/en/c/` 行為與 `/c/` 相同。另外，「偏好 `zh-TW` 且對應頁存在」沒有 A 列。
- **影響**：英文頁複製的「指名英文」連結，對預設學習者開的是繁中；stage 8 gate 無法誠實通過。
- **信心**：high
- **等級**：P0（V1 與 A1 互斥）
- **建議**（擇一）：明寫 `/en/c/` 在本 epic 等同 `/c/`、受 A1 影響，並修正 US5、G1、V1；或讓 `/en/c/` 的目標帶可辨識的明確請求，使 A 列視為明確請求（新表面，需副作用檢查）。

## R-4 文章與清單頁的語系選單是 VitePress 內建 `VPNavBarTranslations`／`VPNavScreenTranslations`，S1 的切換決策碰不到 — P1

- **位置**：spec `:68-71`、AC-3 `:120-123`、Problem Statement `:29`；traceability B2 `:182`、B4 `:184`、V3 `:262`；`.vitepress/theme/index.ts:54`（`USE_CUSTOM_LOCALE_SWITCHER = false`）、`:206-211`。
- **證據（直接讀到）**：自訂 `LocaleSwitcher` 只出現在題目頁的 `MergedNav.vue:249`；預設主題頁用內建 dropdown，是普通 `<a>`，由 router 攔截後 push。spec 沒提到要取代或攔截。
- **推論**：reference 頁選「繁體中文」→ push `/zh-TW/reference/...` → C1 replace 回來 → watcher 先寫 `zh-TW` 再寫 `en`，最後存 `en`，與 B2 相反 → history 多一筆（R-14）。
- **影響**：問題陳述點名的案例，實際行為與 B2 不同。
- **信心**：high　**等級**：P1
- **建議**：S1／B4 明寫內建選單的處理（翻轉 flag 改用自訂 switcher，或 `router.onBeforeRouteChange` 攔截），V3 指名觀察的元件。

## R-5 C5 保留「冷載入 `/zh-TW/` 的 404 寫入 `zh-TW`」，但 Problem Statement 把它列為缺陷；slug 與編號短連結對同一題留下不同偏好 — P1

- **位置**：spec `:29-30`；traceability C5 `:194`、D1 `:22`、G4 `:242`；`i18n/index.ts:199-203`、`theme/index.ts:232-237`。
- **推論**：偏好 `en` 的學習者開 `/zh/c/v05-php-check` 或 `/zh-TW/c/v05-php-check`（slug 規則指向不存在的繁中頁）→ 冷載入 404，`shouldPersistOnColdLoad` 寫入 `zh-TW` 覆蓋 `en` → C1 → 最終值取決於 R-1 的 watcher。同一題的 `/zh-TW/c/005` 302 到不帶前綴的頁，完全不寫入。
- **影響**：學習者明確選過的英文偏好被 slug 連結悄悄改掉，且取決於連結形式。
- **信心**：medium-high　**等級**：P1
- **建議**：決定 C 列的 404 冷載入是否寫入偏好（例如對應頁存在、即將被 C1 送走時不寫）；補一列；修正 Problem Statement 與 C5 的不一致。

## R-6 信任邊界 B2 的「重導目標來自 page list，絕不來自 URL 文字」沒有任何列或 AC 釘住 — P1

- **位置**：spec B2 `:104`、`:72-73`、AC-4 `:124-127`；traceability P3 `:98-100`、C1 `:190`；`i18n/index.ts:224`、`router.js:235-246`。
- **證據**：既有冷載入重導目標是 `prefix + localizePath(bare, ...) + search + hash`，由 URL 文字組成；P3 只要求 lookup 正規化，未要求重導目標用清單中的那筆。`router.go` 經 `normalizeHref` 會去掉 `//evil.example/x` 的 origin（直接讀到，走 router 安全）。但 spec 沒規定 C4 冷載入必須走 router；若改用 `location.replace(由 URL 組出的路徑)`，可能出現 protocol-relative 的 `//host/...`（推論）。query 與 hash 本來就保留自 URL，「never from the URL's own text」字面不精確（同源，危害低）。
- **影響**：threat model 唯一的安全保證沒有驗收出口。
- **信心**：medium　**等級**：P1
- **建議**：補一列併入 AC-4：重導 pathname 等於 `base + 清單中的那筆字串`；以 `/zh-TW//evil.example/x`、`//evil.example/challenges`、`%2F`、反斜線測試同源；明定只透過 `router.go` 導覽。

## R-7 Cloudflare 規則上限算法有誤，編號規則屬 static，上限是 500 題而非 524 題 — P2

- **位置**：traceability `:147-148`；`scripts/generate-redirects.ts:66`。
- **證據**：依記憶（未在 repo 內驗證）：上限是 2,000 static 加 100 dynamic。編號規則無 placeholder，屬 static：4N ≤ 2000，N ≤ 500。每題規則數加倍，原本約 1000 題的上限減半；超出時高編號規則可能被靜默忽略；generator 無超量檢查。
- **信心**：medium　**等級**：P2
- **建議**：修正數字；考慮讓 generator 超過 static 上限時拒絕產生。

## R-8 `ShortLinkShare` 的 `locale` prop 同時決定連結語系與按鈕文字語言；依 spec 傳 entry 的頁面語系會讓繁中清單出現英文標籤 — P1

- **位置**：spec `:81-83`；traceability F3 `:227`、F6 `:230`；`ShortLinkShare.vue:58-67`（`tp` 以 `props.locale` 翻譯）、`ChallengeList.vue:443`。
- **證據**：F3 short mode 用清單語系，F6 page mode 用 entry 語系；只有一個 prop 時，page mode 傳 `en` 會讓 `aria-label`、`title`、「已複製」都變英文；傳清單語系則 F6 給出 `/zh-TW/challenge/<slug>/`（404）。
- **影響**：混語控制元件（`ShortLinkShare.vue` 註解要避免的情況），或複製到錯誤 URL。
- **信心**：high　**等級**：P1
- **建議**：prop 拆成 `labelLocale` 與 `linkLocale`；補一列斷言標籤語言等於清單語系。

## R-9 同一次冷載入可能同時落入 A 列與 C 列；C 列是否等 session gate 未規定 — P2

- **位置**：traceability Requested locale `:56-63`、A1 `:166`、C2 `:191`、A10 `:175`；`theme/index.ts:105-170`。
- **推論**：冷載入不存在、但繁中對應頁存在的不帶前綴路徑（無偏好）：A1 說導向繁中、不顯示這一行；C2 說 replace 到繁中、以 `en` 顯示。A10 只規定 A 列等 gate；C 列若立即執行，A 列之後讀到已被 replace 的 location，結果取決於順序；gate 為 `cleared` 時整頁重載與 C 的 replace 競爭。
- **信心**：medium　**等級**：P2（也可視為 P1）
- **建議**：not-found 路徑只套 C 列（A 列排除 not-found），並明訂 C 列與 gate 的先後。

## R-10 在 404 頁上，A 列也會回報應顯示這一行，訊息誤導 — P2

- **位置**：traceability A2 `:167`、A4 `:169`、D3 `:204`；spec `:66-67`、`:75-78`。
- **推論**：無偏好或 `zh-TW` 冷載入 `/nonexistent` 符合 A2／A4，404 頁會說「這一頁沒有繁體中文版本，所以顯示英文版。」；D3 沒有明確排除 404。
- **信心**：medium　**等級**：P2
- **建議**：A 列加「路徑本身在 page list」前提，或 D1 明確排除 not-found 頁。

## R-11 A6 在真實瀏覽器中觀察不到 — P2

- **位置**：traceability A6 `:171`；`theme/index.ts:232-237`。
- **證據**：`enhanceApp` 冷載入任何 `/zh-TW/` 路徑時，在 Layout 讀 storage 前寫入 `zh-TW`；G2 也讓這情況目前不可能發生。
- **信心**：high　**等級**：P2
- **建議**：註明 A6 只在 S1 層級成立，或改寫以反映 C5 的寫入。

## R-12 預設繁中的學習者被 fallback 到英文頁後，會被留在英文語系樹 — P2

- **位置**：spec `:66-67`；traceability D1 `:202`；`MergedNav.vue:62-66`。
- **推論**：從 `/zh-TW/c/005` 抵達英文題目頁後，nav 連結都指向英文樹；之後的 client-side 導覽不觸發冷載入重導，對有繁中版本的頁 D1 不成立，學習者在本次 session 靜默瀏覽英文頁；加上 R-1 還可能被永久化。
- **信心**：medium　**等級**：P2
- **建議**：這一行附上回到繁中清單的連結；或在 D4 對「從 fallback 頁出發的導覽」另立規則。

## R-13 已開啟分頁在重新部署後 page list 會過期，而 VitePress 自己的 hash map 會刷新 — P2

- **位置**：spec `:59-62`；traceability D3 `:24`；`router.js:77-81`。
- **證據**：router 抓取失敗時重抓 `hashmap.json` 並更新 `window.__VP_HASH_MAP__`；build 時的 page list 沒有對應刷新。
- **影響**：部署後新增的翻譯在舊分頁仍判為不存在；刪除的頁仍判為存在（B1 導到 404）；與 R-2 疊加更糟。
- **信心**：medium　**等級**：P2
- **建議**：考慮在執行期從 `__VP_HASH_MAP__` 推導 page list（B1 已確認無新增暴露面）。

## R-14 從自己的對應頁進入 not-found 路徑時，C7 留下重複 history — P2

- **位置**：traceability C7 `:196`。
- **推論**：在 `/reference/x` 用內建選單點繁中（R-4），history 變成 `[/reference/x, /reference/x]`；Back 看起來沒反應；C7 字面成立，體驗是壞的。
- **信心**：high　**等級**：P2
- **建議**：補一列處理「not-found 路徑的對應頁就是前一頁」；或 R-4 改為攔截導覽，根本不 push。

## R-15 合併進來的 entry 帶著另一個 loader 的預設值與 id — P2

- **位置**：spec `:79-81`；`challenges.zh-TW.data.ts:9-14`、`challenges.data.ts:28-33`、`ChallengeList.vue:134-136,170`。
- **推論**：英文 entry 缺 category 時帶 `General`，繁中分類篩選同時出現 `綜合` 與 `General`；`id ?? idx+1` 由兩個 loader 各自編號，未編號題目合併後 id 重複或交錯，影響依 ID 排序與 E4。
- **信心**：medium　**等級**：P2
- **建議**：S4 規定合併時預設值與 id 的來源。

## R-16 首頁「最新題目」顯示未翻譯 entry，但沒有標記 — P2

- **位置**：traceability E5 `:216`；`HomeContent.vue:21-30,88-89`。
- **推論**：標記只在 `ChallengeList` 實作；繁中首頁出現英文標題卻無「只有英文」，與 G7 精神不一致。
- **信心**：medium　**等級**：P2

## R-17 繁中學習者抵達的英文題目頁上，nav 複製控制給出 `/en/c/NNN` — P2

- **位置**：traceability F7 `:231`。
- **推論**：繁中老師在未翻譯題目頁複製，拿到指名英文的連結；主語系 epic 後，翻譯補上了它仍固定開英文，可能與老師意圖相反。可能是刻意設計，記錄供使用者判斷。
- **信心**：low　**等級**：P2

## R-18 `/en/` 只作為短連結的 URL segment 出現 — P2

- **位置**：traceability G23 `:21`；`docs/adr/0008-locale-folders-primary-chosen-at-build.md:9`。
- **推論**：使用者依 `/en/c/` 推測 `/en/challenges` 存在會得到 404；C 列算出的對應頁是 `/zh-TW/en/...`，仍是 C3。主語系 epic 後 `/en/` 成為真正的語系前綴，語意改變。
- **信心**：low　**等級**：P2

---

已檢查、未發現問題：B1（每頁內嵌 `__VP_HASH_MAP__`，router 也抓 `hashmap.json`，page list 無新增暴露面）；資料 loader 只挑特定欄位，合併不帶出 flag 或內文；清單 `v-for` 以 `c.url` 為 key，不撞 key；challenge-sw 只攔 `challenge-*.localhost`；主站沒有讀頁面 query；這一行是固定訊息，標題與描述經 Vue 跳脫；B3 未知值或讀不到 storage 一律當無偏好；ADR-0005 不適用。

合計：P0 2（R-1、R-3）、P1 5（R-2、R-4、R-5、R-6、R-8）、P2 11（R-7、R-9～R-18），共 18 項。

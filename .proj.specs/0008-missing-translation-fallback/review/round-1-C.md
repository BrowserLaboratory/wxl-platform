# Stage 3 第 1 輪：軸 1 完整性（Completeness）審查報告

**審查範圍**：epic 0008-missing-translation-fallback。`spec.en.md` blob `c1ab053`、`traceability.md` blob `7ea747c`（working tree）；程式碼 HEAD `5d3c173`；pending 的 `GLOSSARY.md` 與 `docs/adr/0008-…` 已讀。依凍結 prompt `review/prompt.md`。reviewer 未執行 git，blob 以 parent 提供為準。reviewer：`harness-reviewer`（2026-11-04）。由父代理人照 reviewer 交回的報告存檔。

對照讀過：`.vitepress/theme/index.ts`、`i18n/index.ts`、`LocaleSwitcher.vue`、`MergedNav.vue`、`ChallengeList.vue`、`HomeContent.vue`、`ShortLinkShare.vue`、`.vitepress/challenge/shortLink.ts`、`.vitepress/config.mts`、`platform/shared/*.data.ts`、`scripts/generate-redirects.ts`、`scripts/challenge-numbers.ts`、`platform/public/_redirects`、`tests/unit/i18n/*`、`tests/unit/site/redirects.test.ts`、`challenge-data-loaders.test.ts`、兩種語言的 troubleshooting 頁、OQ-016／018／023／024、`docs/agents/workflow.md`、spec 0006 的升級機制。

---

## C-1 Route watcher 的持久化行為不在矩陣裡，它會改寫 C1、C5、B2、D4 的結果 — P0

- **位置**：traceability.md:63、:182（B2）、:190、:194（C1、C5）、:205（D4）；spec.en.md:64-74、:96-97、:124-127（AC-4）；`.vitepress/theme/index.ts:72-86`。
- **違反**：規則能產生的每一種組合都要接到 AC；矩陣的期望不能與既有機制衝突。
- **證據（直接讀到）**：Layout 的 route watcher 每次 `route.path` 跨語系都執行 `i18n.global.locale.value = target; persistLocale(target)`（`flush: 'pre'`）。spec 與矩陣都沒提到它，也沒說要改。
- **證據（推論）**：
  - 冷載 `/zh-TW/X`（不存在）：enhanceApp 先存 `zh-TW`（C5）→ C1 replace 到 `/X` → watcher 存 `en`。AC-4「still stores `zh-TW`」最後讀到 `en`；line 在 route 變更後依 D4 重算（stored = `en`），C1 的那一行只出現一瞬間。
  - 在 zh-TW 清單點 E2 未翻譯條目 → client 端導到英文頁 → watcher 存 `en`。偏好被悄悄改成英文、line 不出現。這正是 OQ-023 的主情境。
  - 文章頁用內建選單選繁體中文（C-4）：push `/zh-TW/…`（404）→ 存 `zh-TW` → C1 replace → 存 `en`，與 B2「Store the choice」相反。
  - `platform/zh-TW/guide/notes.md:158` 直接連到英文 reference 頁，同樣把偏好改成 `en`。
- **影響**：不動 watcher，AC-4、B2、D4 在真實頁面過不了；要動它，「哪些導覽寫入偏好」是 stage 1 層級的語意決定，spec 沒做。
- **信心**：高（機制直接讀到；時序是推論）　**等級**：P0
- **建議**：新增 route watcher 的列，至少定出：fallback 造成的 replace（C1、C2）是否寫入；從 E2 進入另一語系頁面是否寫入；B2 存下的選擇在後續導覽如何保留。各列接到 AC-2／3／4 或新 AC。

## C-2 決策算出的 requested locale 怎麼交給 line、能維持多久，矩陣沒有定義 — P1

- **位置**：traceability.md:56-63、:205（D4）；spec.en.md:75-78。
- **證據**：C1、C2 本身是 route change，依 D4 line 要以 stored preference 重算，而非 not-found 路徑所指的語系；B2 不導覽，不會有 route change，「re-evaluated on every route change」觸發不了 B2 的 line；表格沒說 line 元件怎麼知道這次抵達是哪一種。
- **影響**：C1／C2 的 line 語言、B2 的 line 何時出現，留給實作者猜。
- **信心**：高　**等級**：P1
- **建議**：加一列定義 requested locale 從 S1 傳到 S3 的資料形狀與有效期間（例如到下一次非 replace 的導覽為止）。

## C-3 冷載落在 not-found 路徑時，A 列與 C 列同時適用，沒有優先順序；not-found 頁上會不會出現 line 也沒定 — P1

- **位置**：traceability.md:56-63、:166-175、:190-193、:204（D3）。
- **證據（推論）**：無偏好冷載 `/X`（不存在、`/zh-TW/X` 存在）：A1 轉到 `/zh-TW/X`、不顯示 line；C2 replace 到 `/zh-TW/X`、以 `en` 顯示 line，互相矛盾。兩邊都不存在（C3）時，A 決策「counterpart missing → stays，report line」，404 頁上出現「這一頁沒有繁體中文版本，所以顯示英文版。」
- **影響**：AC-2 與 AC-4 對同一輸入答案不同；404 頁可能出現錯誤說明。
- **信心**：高　**等級**：P1
- **建議**：明訂冷載時 not-found 判定先於 A 決策（或相反）；另加一列「not-found 頁不顯示 line」。

## C-4 文章頁的語系選單是 VitePress 內建的，B 列沒有說 S1 怎麼控制它 — P1

- **位置**：traceability.md:181-184（B4）；spec.en.md:26-30、:67-71；`.vitepress/theme/index.ts:54`（`USE_CUSTOM_LOCALE_SWITCHER = false`）、:206-211。
- **證據（直接讀到）**：預設主題頁用 VitePress 內建 `VPNavBarTranslations` 與行動版 `VPNavScreenTranslations`，是 VitePress 算好的連結，不呼叫 `LocaleSwitcher.select`。`MergedNav.vue` 只有一個 `LocaleSwitcher`，沒有另外的行動版選單，所以 B4 的「兩種選單」只可能是內建選單。flag 註解說兩種模式都要被涵蓋。
- **影響**：只改 `LocaleSwitcher.vue` 的話，文章頁仍會 push 到 404 再被 C1 接住；B2 不成立、多一筆 history、偏好被 C-1 改寫。V3 要驗的 B2 正落在這條路徑。
- **信心**：高　**等級**：P1
- **建議**：B 列點名內建選單（桌面與行動）及 flag 為 true 的情況，並寫明攔截要達成的可觀察結果（例如不新增 history）。

## C-5 A6、A7 在真實 app 裡到不了：enhanceApp 先把 prefixed 路徑的語系寫進偏好 — P1

- **位置**：traceability.md:171-172、:290-292；`.vitepress/theme/index.ts:232-237`、`i18n/index.ts:199-203`。
- **證據**：冷載任何 `/zh-TW/` 路徑時，`shouldPersistOnColdLoad` 先 `persistLocale('zh-TW')`，之後 Layout 的 A 決策才讀 stored。「Stored `en`、`/zh-TW/` 路徑」在決策當下已是 `zh-TW`；A6 的「line in `en`」只能在 pure function 上製造。
- **影響**：矩陣期望與既有啟動順序衝突；AC-2 在單元測試通過、瀏覽器觀察不到。
- **信心**：高　**等級**：P1
- **建議**：A6、A7 改以啟動後實際讀到的值描述；或明說 requested locale 取 enhanceApp 寫入之前的值，並寫明怎麼保留。

## C-6 頁面清單 schema 的文字與範例矛盾 — P1

- **位置**：traceability.md:83-84 對 :86-94、:98-99。
- **證據**：文字「no trailing slash except the two home pages」，範例卻有 `"/guide/"`、`"/challenge/door-is-open/"`；:98 說 P3「pins it with the paths above」。
- **影響**：P1、P3 的期望兩種讀法，AC-1 無法判定。
- **信心**：高　**等級**：P1
- **建議**：文字改為「目錄型 index 頁保留結尾斜線」，或改範例。

## C-7 P3 的正規化比 router 自己的容忍範圍窄，兩個「頁面存不存在」判斷可能不一致 — P2

- **位置**：traceability.md:98-100、:158（P3）。
- **證據（推論，依 VitePress `pathToFile` 行為，未實測）**：VitePress 查 hash map 前先 `decodeURIComponent`、用 `toLowerCase()` 查，並在 `x_index.md` 與 `x.md` 間互相嘗試；P3 只列斜線、`.html`、`index`。router 能渲染的大小寫或編碼變體，頁面清單可能判 counterpart missing 而誤顯示 line。C 列用 router 判 not-found、用頁面清單判 counterpart，矩陣沒要求兩者一致。
- **信心**：中低　**等級**：P2
- **建議**：P3 加大小寫與百分比編碼；或明訂以 router 判定為準。

## C-8 未翻譯條目的複製控制項，按鈕與狀態文字該用哪個語系，沒有列 — P1

- **位置**：traceability.md:225-233（F3、F6、F8）；spec.en.md:82-83；`ShortLinkShare.vue:63-67`、:79、:104-112。
- **證據**：`ShortLinkShare` 只有一個 `locale` prop，同時決定 URL 與 `tp()`（`copy_label`、`copied`、`copy_failed`）。F3 要列表語系、F6 要條目語系。照 spec「passes that entry's page locale」，zh-TW 清單按鈕 aria-label 與「Copied」變英文，short mode 也變 `/en/c/`，違反 F3。
- **信心**：高　**等級**：P1
- **建議**：新增一列：標籤與狀態文字一律用列表語系，只有 page mode 的 URL 用條目語系。

## C-9 H 列漏掉幾句會變成錯的文件 — P1

- **位置**：traceability.md:251-254。
- **證據（直接讀到）**：
  - `platform/guide/troubleshooting.md:216`、`platform/zh-TW/guide/troubleshooting.md:216` 寫「兩份清單收錄的題目可能不同」，與 E4 相反。
  - 兩種語言 `troubleshooting.md:191`「語系切換是導向另一個語系的同一頁網址」，B2 之後不一定導向。
  - `platform/guide/index.md:66` 與 `zh-TW/guide/troubleshooting.md:150`「切換語系會清空流量記錄」，B2 之後在未翻譯頁上不會清空。
  - OQ-016 已 resolved 段落把 OQ-023 列為仍存在的限制，H4 沒有更新 OQ-016。
- **影響**：AC-9 通過時，這些錯句仍留在文件裡。
- **信心**：高　**等級**：P1
- **建議**：H3 擴充為逐句列出要改的段落（兩種語言），H4 加上 OQ-016。

## C-10 票落地順序（半套用狀態）沒有任何列 — P1

- **位置**：traceability.md 全份無對應列；spec.en.md:85-92。
- **證據（推論）**：若 S5（複製控制改發 `/en/c/`、`/zh-TW/c/`）比 S6（產生規則）先合進 main，production 會發出沒有規則的連結：`/en/c/001` 直接 404；`/zh-TW/c/001` 落到 not-found，counterpart `/c/001` 不是頁面，也是 404。S1 也依賴 S2。
- **影響**：epic 中途正式站可能發出打不開的講義連結。
- **信心**：高　**等級**：P1
- **建議**：加約束列：S5 與 S6 同票，或 S6 先落地；S1 不得早於 S2；讓 stage 4 的 claim table 可檢查。

## C-11 V 列沒涵蓋 Testing Decisions 自己點名的 stage 8 理由 — P1

- **位置**：traceability.md:260-262；spec.en.md:168-170。
- **證據**：Testing Decisions 說 stage 8 必要是因為「the session gate's hold, hydration and each host's 404 handling」，但 V1–V3 沒有 A10，也沒有 C5、C7、D4、B4 行動版、F7、E5。C-1 的 watcher 互動只有這一層看得到。
- **信心**：高　**等級**：P1
- **建議**：V1 或 V2 補上 A10（題目頁、gate 未決定時）、C5 加 C7、D4 從 E2 點進去、行動版寬度的 B4。

## C-12 離開 fallback 頁之後的行為沒有列 — P1

- **位置**：traceability.md:205（D4）、:166-169；`MergedNav.vue:66`、:129。
- **證據（推論）**：A2、A4、B2 或 E2 之後學習者在英文頁上，MergedNav 的「← Challenges」連到英文清單 `/challenges/`；D1 對有翻譯的頁不成立、client 端導覽不轉向，學習者一直留在英文樹且沒有 line。
- **影響**：E2 的目的（讓預設語系學生找得到題目）在「看完回清單」這一步失效；矩陣沒說是否刻意。
- **信心**：中　**等級**：P1
- **建議**：加列明訂：從 fallback 頁回清單或首頁時，用 requested locale 還是頁面語系。

## C-13 合併條目的細節沒有列 — P2

- **位置**：traceability.md:102-120、:212-219；`challenges.data.ts:28-36`、`challenges.zh-TW.data.ts:9-17`。
- **證據**：合併鍵（slug）沒寫；兩個 loader 的 frontmatter 預設值不同（title「Web exploitation challenge」對「網站攻防挑戰」、category「General」對「綜合」），影響 E6 分類篩選；`id: idx+1` 是各 loader 的位置，合併後未編號條目可能撞號，影響 E4 與 `#NNN` 徽章；借來的英文標題與摘要要不要加 `lang="en"` 沒有列。
- **信心**：中　**等級**：P2

## C-14 標記出現在哪裡沒寫齊 — P2

- **位置**：traceability.md:213、:216；`ChallengeList.vue:349-387`（grid）、`HomeContent.vue:83-104`。
- **證據**：E2 沒說 grid 與 list 檢視都要顯示標記；E5 沒說首頁「最新題目」卡片要不要。
- **信心**：高　**等級**：P2

## C-15 A 列沒有窮舉 AC-2 宣稱的組合 — P2

- **位置**：traceability.md:166-175；spec.en.md:115-119。
- **證據**：AC-2 宣稱 5 種 stored × 兩種路徑 × counterpart 有／無 × challenge／article；A 列沒涵蓋 stored `zh-TW` + 未加前綴 + counterpart 存在；none、`zh-TW`、unreadable、`fr` 配已加前綴路徑；A4 沒寫哪種路徑。
- **信心**：高　**等級**：P2

## C-16 規則上限計算可能有誤，超過上限時的行為也沒有列 — P2

- **位置**：traceability.md:147-148。
- **證據（依記憶，未核對）**：上限是 static 2000 加 dynamic 100；編號規則屬 static，每題 4 條，上限 500 題而非 524 題。產生器無上限檢查，也沒有列或 AC 處理超限。
- **信心**：中　**等級**：P2

## C-17 既有靶場升級到這一版時的 `_redirects` 狀態沒有列 — P2

- **位置**：traceability.md:245（G7 只講 upstream）；spec 0006 三方合併。
- **證據（推論）**：靶場已 commit 的 `_redirects` 由自己的題目產生；`range:upgrade` 對它三方合併時兩邊都有修改，可能寫入衝突標記，CI staleness 檢查失敗。`pnpm build` 會重新產生，部署本身不受影響。
- **信心**：中　**等級**：P2

## C-18 需要一起改的既有測試契約沒有點名 — P2

- **位置**：spec.en.md:166-167。
- **證據**：Testing Decisions 只提到寫死複製形式的測試；下列也必須改：`tests/unit/site/redirects.test.ts:122-128`（`PARAMETERISED_RULES` 只有兩條）、:128（`NUMBERED_SOURCE` 不接受 `/en/`、`/zh-TW/`）、:278-301；`challenge-data-loaders.test.ts` 對 `locale` 欄位；`generate-redirects.ts:120-127` 的註解（「known not to exist would 302 a reader into a 404」）。stage 6 的「只改形式」檢查涵蓋不到。
- **信心**：高　**等級**：P2

## C-19 stage 8 的測試題目與網址來源沒有交代 — P2

- **位置**：traceability.md:260-261。
- **證據**：V1 在 ticket branch 新增英文限定題目，落地前要不要移除（Charter 不增加題庫）、號碼是否保留、`_redirects` 怎麼還原都沒寫；`SITE_ORIGIN` 是正式站，preview 上複製到的 F2、F3 連結指向正式站，正式站還沒有新規則，G1–G3 要在 preview 主機手動輸入路徑才看得到；V2 的 GitHub Pages 靶場從哪個 commit 建立沒寫。
- **信心**：高　**等級**：P2

## C-20 B2 之後怎麼撤回選擇，以及儲存失敗時的行為，沒有列 — P2

- **位置**：traceability.md:182。
- **證據**：英文頁的選單只提供另一個語系（`LocaleSwitcher.vue:40`），B2 誤選繁體中文後在這一頁沒辦法改回英文；`persistLocale` 失敗時靜默吞錯，B2 的 line 與後續 D4 的來源不一致。
- **信心**：中　**等級**：P2

## C-21 新發出的連結形式衍生出兩個沒有列的邊界 — P2

- **位置**：traceability.md:190-196、:239-243。
- **證據（推論）**：發出 `/en/c/` 後，使用者可能猜 `/en/challenge/x/`、`/en/challenges`；`localizePath` 視為未加前綴，counterpart 變成 `/zh-TW/en/…`，結果 404，沒有列。同一道未翻譯題目，`/zh-TW/c/005` 302 到英文頁、不寫偏好；`/zh-TW/c/<slug>` 先到 `/zh-TW/` 的 404，C5 寫入 `zh-TW`；兩種連結對偏好影響不同，沒有列。
- **信心**：中　**等級**：P2

## C-22 冷載 C 列要不要等 session gate，以及 dev server 下有沒有頁面清單，都沒有列 — P2

- **位置**：traceability.md:175、:193、:160（P5）。
- **信心**：中　**等級**：P2

## C-23 F7 在未翻譯頁上的結果與清單不一致，沒有列明 — P2

- **位置**：traceability.md:231（F7）、:227（F3）。
- **證據**：zh-TW 學習者經 A2 或 E2 進入未翻譯題目頁時，nav 給 `/en/c/NNN`，zh-TW 清單給 `/zh-TW/c/NNN`；日後補上翻譯時兩條連結開到不同語系。矩陣沒說是否刻意。
- **信心**：中　**等級**：P2

---

統計：P0 1、P1 10、P2 12。

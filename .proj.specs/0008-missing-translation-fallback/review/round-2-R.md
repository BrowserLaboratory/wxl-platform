# Stage 3 第 2 輪：軸 4 紅隊（Red team）審查報告

**審查範圍**：epic 0008-missing-translation-fallback。`spec.en.md` blob `c38a6aa`、`traceability.md` blob `9701eaf`（working tree，revision 2）；程式碼 HEAD `5d3c173`；pending 的 `GLOSSARY.md` 與 ADR-0008 已讀。依凍結 prompt `review/prompt.md`。reviewer 未自行跑 Git；round 1 的 R 報告與 `disposition.md` 只用來避免重複回報。reviewer：`harness-reviewer`（2026-11-04）。由父代理人照 reviewer 交回的報告存檔。

---

## R-1 D7 讓 `LocaleSwitcher` 也出現在 not-found 頁；這時 B2 要求顯示這一行，L1 卻說 not-found 頁永不顯示，AC-3 與 AC-5 互斥 — P1

- **位置**：traceability D7 `:33`、B2 `:264`、B4 `:266`、L1 `:290`；spec `:99-101`、AC-3 `:151-156`、AC-5 `:163-168`；`.vitepress/theme/index.ts:200-211`。
- **證據（直接讀到）**：Layout 的 render 只看 `frontmatter.layout === 'challenge'`；not-found 路由沒有 `layout`，走 `h(DefaultTheme.Layout, null, { 'nav-bar-content-before': () => h(LocaleSwitcher) })`。VitePress 預設主題在 NotFound 時也渲染 nav，flag 翻成 `true` 後切換器會出現在 404 頁。B 列沒限定只適用 page arrival。
- **推論**：C3 的 404 頁上選另一個語系，依 B2 寫入、停留、顯示這一行；依 L1 不顯示。C8 時對應頁在清單內，走 B1，沒有衝突。
- **影響**：無法同時通過 AC-3 與 AC-5；404 頁上的操作結果未定義。
- **信心**：medium-high（render 分支直接讀到；404 渲染 nav 依預設主題結構推論）　**等級**：P1
- **建議**：補 B7「not-found 頁上的切換器：對應頁在清單內就導覽；否則寫入選擇、停留，不顯示這一行」，或規定 not-found 頁不渲染切換器；L1 註明。

## R-2 P6 的「已知限制」寫錯：清單過期時導到已刪除頁面會落入 C8，不是 C — P2

- **位置**：traceability P6 `:237`、D11 `:37`、C8 `:281`、H3 `:358`；spec Out of Scope `:223`。
- **證據**：分頁開著時清單不更新，被刪除的頁仍在清單；VitePress `loadPage` 抓取失敗後重抓 `hashmap.json`（`router.js:77-84`），新 map 沒有這頁，渲染 NotFound；路徑仍在過期清單內，D11 歸為 C8：不重導、不顯示。
- **影響**：H3 要寫進 troubleshooting 的限制與實際不符。
- **信心**：high　**等級**：P2
- **建議**：P6 改為「可能導到已刪除的頁面，這時是 C8：not-found 頁，按 Back 回原頁」；並記下反方向：部署後新增的翻譯在舊分頁會走 B2，這一行會不實地說「沒有繁體中文版本」。

## R-3 US6 與 Solution 寫「被重導不會改變偏好」，但 `/zh-TW/c/NNN`、`/zh/c/NNN` 經 302 落到帶前綴的頁面時 W2 寫入 `zh-TW` — P2

- **位置**：spec Solution `:45-47`、US6 `:68`、US7 `:69`；traceability D5 `:31`、D6 `:32`、A5 `:251`、W2 `:303`、G2 `:344`、F2 `:329`；`.vitepress/theme/index.ts:232-237`。
- **證據**：已翻譯題目的 `/zh-TW/c/001` 302 到 `/zh-TW/challenge/door-is-open/`，瀏覽器對落點冷載入，屬 W2，寫入 `zh-TW`；F2 讓每個繁中頁面與清單都發出這種連結。
- **推論**：(1) 偏好 `en` 的學生點老師貼的 `/zh-TW/c/001`，偏好被永久改成 `zh-TW`，正是 Solution 說不會發生的情況。(2) 同形式連結結果取決於題目有沒有翻譯。(3) 不對稱：任何外部網站都能以連結把偏好改成 `zh-TW`，沒有連結能改成 `en`（`/en/c/` 依 D6 不寫入）。
- **意圖判斷**：W2 是 U1 明文規則，刻意；與它矛盾的 Solution、US6 文字是意外。這行為在 0007 的 `/zh/c/` 時代已存在，不是新增攻擊面。
- **信心**：high（行為部分）　**等級**：P2
- **建議**：Solution 與 US6 改寫為「開啟網址帶語系前綴的已發布頁面（包括經短連結 302 抵達）視為選擇該語系」，寫明 `/en/c/` 在本 epic 不算；H2 照改。

## R-4 C2 送到 `/zh-TW/X` 後，重新整理（F5）就會覆寫原本的 `en` 偏好 — P2

- **位置**：traceability C2 `:275`、C5 `:278`、W2 `:303`、W5 `:306`、Requested locale `:82-92`；spec US6 `:68`。
- **推論**：偏好 `en` 的學習者開了英文版不存在的路徑 `/X`（只有繁中的文章可能存在；G2 對文章不強制，hook 只拒絕孤兒題目說明）。C2 replace 到 `/zh-TW/X`，line 以 `en` 顯示、不寫入，正確；按 F5 → 帶前綴已發布頁面的冷載入，W2 寫入 `zh-TW`，line 消失，之後冷載入都導去繁中。從清單點進繁中頁或 Back 回繁中頁再 F5 也會如此，那屬既有語意，但 C2 這條路是本 epic 新增。
- **信心**：medium（可觸及性取決於是否有只有繁中的文章）　**等級**：P2
- **建議**：明寫為已知結果；或在 S1 重導 replace 時於 `history.state` 留標記，重新整理該 entry 不視為明確請求（新表面，需副作用檢查）。

## R-5 「已發布頁面」在不同決策有兩種判定：冷載入寫入只能看 URL 文字，頁面抵達以 router 渲染的頁面為準，而 router 不分大小寫、會把 `/` 收合成 `_` — P2

- **位置**：spec `:74-82`、`:95-98`；traceability lookup 表 `:139-149`、D11 `:37`、A5 `:251`、W2 `:303`；`.vitepress/theme/index.ts:232-237`、`node_modules/vitepress/dist/client/app/utils.js:24-46`。
- **證據（直接讀到）**：`pathToFile` 會 `decodeURIComponent`、把 `/` 換成 `_`、以 `__VP_HASH_MAP__[pagePath.toLowerCase()]` 查詢，查不到再切換 `_index` 重試；production 下 `/zh-TW/Challenges`、`/zh-TW/guide_python` 都渲染成真實頁面。`shouldPersistOnColdLoad` 在 `enhanceApp`、router 渲染前執行。
- **推論**：(1) 冷載 `/zh-TW/Challenges`：D11 分類為 page arrival，依 A5／W2 應寫入；`enhanceApp` 只能用 lookup 表，表上大小寫不同「不在清單」，不寫。兩個 S1 函式對同一抵達答案相反。(2) A1 與 B1 的目標目前以 URL 文字組成（`localizePath(bare, …)`，`i18n/index.ts:224`、`LocaleSwitcher.vue:74-81`），遇別名 URL 時 A1 導到別名；dev server 在 Linux 區分大小寫，可能變成 not-found 落入 C9，macOS 與 Linux 結果不同。
- **信心**：medium　**等級**：P2
- **建議**：S1 規定每個決策使用同一個 canonical source path；A1 與 B1 的目標取自清單項目；冷載入寫入改在 router 解析後判定，或用與 router 相同的正規化規則；lookup 表補大小寫與 `_` 別名兩列。

## R-6 lookup 表沒涵蓋格式錯誤的百分比編碼；若在 `enhanceApp` 解碼，會讓整個 app 建立失敗 — P2

- **位置**：traceability lookup 表 `:147`、C10 `:283`；spec B2 `:133`、`:95-98`；`.vitepress/theme/index.ts:215-257`。
- **證據**：`decodeURIComponent('/zh-TW/%E0%A4%A')` 丟出 `URIError`；VitePress 的 `pathToFile` 也會丟，但被 `loadPage` catch 接住、渲染 NotFound（`router.js:69-98`）。D5 要求 `shouldPersistOnColdLoad` 只對已發布頁面回傳 true，查詢在 `enhanceApp` 執行。
- **推論**：沒有 try/catch 的話，格式錯誤的連結冷載入時 `enhanceApp` 中斷，元件與 service worker 註冊都不執行，頁面停在無法互動的靜態 404。B4 對 storage 有「never throws」，對路徑沒有。
- **信心**：medium　**等級**：P2
- **建議**：P3／C10 補一列「解碼失敗 → 不在清單，任何 S1 函式不丟例外」，並加入 C10 的構造路徑。

## R-7 隱藏內建選單的 CSS class 到 `onMounted` 才加上；hydration 前與停用 JS 時 `VPNavBarTranslations` 仍可見可點 — P2

- **位置**：traceability D7 `:33`、B4 `:266`；spec AC-3 `:151-156`；`.vitepress/theme/index.ts:176-178`、`style.css:281-284`。
- **證據（直接讀到）**：隱藏規則依賴 `body.use-custom-locale-switcher`，這個 class 只在 Layout `onMounted` 加上；靜態 HTML 沒有。
- **推論**：hydration 前點內建選單的「繁體中文」（一般 `<a>`）會整頁導到不存在的路徑，C1 送回並顯示 line，但選擇未寫入（W3）、history 多一筆，Back 停在同頁；此時頁面同時有兩個切換器。
- **信心**：medium　**等級**：P2
- **建議**：隱藏規則改為不依賴執行期 class（建置產生 CSS，或 SSR 的 `<body>` 就帶 class）；或讓 V3 觀察 hydration 前的狀態。

## R-8 S1 重導「把 requested locale 帶到落點」，沒規定這個值何時失效 — P2

- **位置**：traceability Requested locale `:90-92`、L6 `:295`、C9 `:282`；spec `:93-94`。
- **推論**：實作需要跨導覽的暫存值。重導落點是 not-found（C9 → C8）、`router.go` 未完成時學習者自己點了別的連結、gate 決定 `cleared` 整頁重載，這些情況下要不要清掉沒規定；殘留值被下一次 later navigation 用到，會在錯的頁面以錯的語系顯示這一行。
- **信心**：medium　**等級**：P2
- **建議**：暫存值只綁定那次重導的目標路徑，下一次抵達無條件清除；L6 補「重導落點為 not-found 時不殘留」。

## R-9 storage 不可用時，每次 later navigation 的 requested locale 都是預設 `zh-TW`；英文讀者每到英文限定頁都看到中文的這一行，B5 的移除只維持一次抵達 — P2

- **位置**：traceability B6 `:268`、W6 `:307`、Requested locale `:88`、B5 `:267`、L5 `:294`；spec B4 `:135`。
- **推論**：封鎖 storage 的瀏覽器裡，英文讀者選 English（B6 只管這次抵達），下一頁回到預設，英文限定頁又顯示「這一頁沒有繁體中文版本」；B5 也無法寫入，這一行關不掉。冷載入重導今天就有同樣限制，但這一行是本 epic 新增的持續介面。
- **意圖判斷**：B6 只描述單次抵達，跨抵達後果看似意外。
- **信心**：medium　**等級**：P2
- **建議**：寫入失敗時保留本分頁 in-memory 的選擇作為 later navigation 的 requested locale；或在 H3 寫明為已知限制。

## R-10 題目頁的這一行不能關閉，且位在 `h-100dvh overflow-hidden` 的版面裡；窄螢幕上長期壓縮作答區 — P2

- **位置**：traceability D10 `:36`、L3 `:292`；spec `:102-106`；`ChallengeLayout.vue:821`、`:868`。
- **證據**：題目頁是固定高度 flex column，主區 `flex-1`；runtime 重置橫幅在同位置，可以關閉；這一行沒有關閉機制。
- **推論**：375 寬螢幕上，兩行繁中句子加連結在每個未翻譯題目上永久佔用垂直空間，受影響的正是預設語系學習者；D10 字面成立，但 Code 與 Browser 面板可用高度變少。
- **信心**：low-medium　**等級**：P2
- **建議**：V1 或 V3 在 375 寬觀察這一行的高度與面板是否仍可操作；或考慮可關閉（只維持到這次抵達結束）。

## R-11 D9 的拋棄式 fixture 沒規定收尾：Cloudflare preview 與臨時 GitHub Pages 靶場一直公開，fixture 題號之後可能被 `main` 重新使用 — P2

- **位置**：traceability D9 `:35`、S7 `:49`、V1 `:370`、V2 `:371`；`scripts/challenge-numbers.ts:178-186`、`shortLink.ts:37`。
- **推論**：fixture 取得下一個題號（例如 11）；`nextChallengeNumber` 只看 live 與 retired 題號，`main` 之後可能把 11 指派給別題。preview 上複製到以 production `SITE_ORIGIN` 開頭的 `/zh-TW/c/011`，被貼出去後會開到另一題。preview 與臨時靶場沒有刪除步驟。
- **信心**：low　**等級**：P2
- **建議**：S7 或 epic close-out 加「刪除拋棄式分支、preview 部署與臨時 GitHub Pages 靶場」；fixture 用明顯不撞號的題號，例如 999。

---

已檢查、未發現新問題：C10 與 `router.go`（`normalizeHref` 只保留 pathname、search、hash，反斜線被瀏覽器轉成 `//`，落入 C3）；query 與 hash 保留（主站沒有讀 `location.search`／`route.query`）；B1（每頁內嵌 `__VP_HASH_MAP__`；`platform/` 下 27 個 `.md` 與 schema 一致）；`public/` 檔案與題目應用程式路徑不在清單，not-found 落入 C3；這一行與標記是固定訊息，不含 vue-i18n 特殊字元，借來的標題與描述經 Vue 跳脫，`lang` 是字面值；`v-for` key 與已解題 key 不撞；`_redirects` 新增的四條參數化規則同源、`:slug` 只吃一個 segment、4N ≤ 2,000、4 ≤ 100；pre-commit `--staged` 以各語系樹 index slug 決定繁中規則指向；session gate（not-found 頁不呈現 gate，C 重導照 A6 放行，落到題目頁後 gate 照常詢問）；`wxl-locale` 在清除時保留；D6 與 F7 是使用者裁決的刻意結果，不再列為發現；ADR-0005 不適用。

合計：P0 0、P1 1（R-1）、P2 10（R-2～R-11），共 11 項。

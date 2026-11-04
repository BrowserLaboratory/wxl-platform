# Stage 3 第 2 輪：軸 1 完整性（Completeness）審查報告

**審查範圍**：epic 0008-missing-translation-fallback。依凍結 prompt `review/prompt.md`。`spec.en.md`（blob `c38a6aa`）與 `traceability.md`（blob `9701eaf`）讀 working tree；程式碼 HEAD `5d3c173`；pending 的 `GLOSSARY.md` 與 ADR-0008 已讀。reviewer 未執行 git，blob 以 parent 提供為準。reviewer：`harness-reviewer`（2026-11-04）。由父代理人照 reviewer 交回的報告存檔。

對照讀過：`round-1-C.md`、`disposition.md`、`.vitepress/theme/index.ts`、`i18n/index.ts`、`LocaleSwitcher.vue`、`MergedNav.vue`、`ChallengeList.vue`、`HomeContent.vue`、`ShortLinkShare.vue`、`shortLink.ts`、`config.mts`、`style.css`、兩個 data loader、`generate-redirects.ts`、`challenge-numbers.ts`、`pre-commit.sh`、`fork-init.ts`（片段）、`_redirects`、`tests/unit/i18n/*`、`redirects.test.ts`、`challenge-data-loaders.test.ts`、`pre-commit-sh.test.ts`（片段）、`site-smoke.spec.ts`（片段）、`platform/**/*.md` 的相關段落、VitePress 2.0.0-alpha.16 `VPNavBarExtra.vue`、OQ-023、ADR-0007、ADR-0008。

---

## C-1 D7 漏掉 VitePress 第三個內建語系選單（`VPNavBarExtra`），768–1279 寬仍繞過 `LocaleSwitcher` — P1

- **位置**：traceability.md:33（D7）、:266（B4）、:418-420；spec.en.md:99-101、:151-156（AC-3）；`style.css:281-283`；`VPNavBarExtra.vue:27-36`、:70-80。
- **證據（直接讀到）**：`VPNavBarExtra` 只在 768–1279 寬顯示，flyout 內有 `<div class="group translations">`，以 `useLangs({ correspondingLink: true })` 產生各語系連結；CSS 只隱藏 `.VPNavBarTranslations` 與 `.VPNavScreenTranslations`。
- **證據（推論）**：1024 寬參考頁從「…」選單點繁體中文 → push 到 404 → C1 接回；多一筆 history、偏好未寫入，與 B2、W1 相反。
- **影響**：B4 不成立；D7 的自我檢查錯誤；V3 只看 1280 與 375，抓不到。
- **信心**：高　**等級**：P1
- **建議**：D7 與 B4 點名 `VPNavBarExtra` 的 translations 群組並擴充 CSS；B4、V3 寬度加 768 或 1024。

## C-2 B5 推翻 `LocaleSwitcher` 兩條既有契約，Overridden contracts 沒列 — P1

- **位置**：traceability.md:267（B5）、:213-224；`LocaleSwitcher.vue:38-43`、:45-55；`tests/unit/i18n/locale-switcher.test.ts:95-111`（`options.length` 為 1）、:113-124。
- **證據**：B5 需要選單出現兩個選項、拿掉同語系防護；表中沒列。
- **影響**：實作必然改到未列測試與註解，stage 6 會判為多出的變更。
- **信心**：高　**等級**：P1
- **建議**：Overridden contracts 與 H1 加列這兩條契約及對應測試與註解。

## C-3 在 not-found 頁上操作語系選單沒有任何列；B2 與 L1 對此矛盾 — P1

- **位置**：traceability.md:37（D11）、:261-268、:290（L1）；spec.en.md:79-81、:86-90；`.vitepress/theme/index.ts:206-209`（D7 後預設主題 Layout 都放 `LocaleSwitcher`，NotFound 也算）。
- **證據（推論）**：C3 的 404 頁（例如 `/zh-TW/foo`）切換到 `en`，對應頁不在清單，依 B2 停留、寫入、顯示；L1 規定 not-found 頁不顯示。D11 只分類抵達，沒處理 not-found 頁上的選擇；C8 頁上的選擇也沒列。
- **信心**：高　**等級**：P1
- **建議**：新增 B7：在 C3、C8 頁上選擇時的行為（導覽與否、寫入與否、一律不顯示）。

## C-4 V1d 對已翻譯題目的期望寫「A1–A4」，實際落在 A5 並寫入偏好 — P1

- **位置**：traceability.md:379（V1d）、:251（A5）、:303（W2）、:344（G2）。
- **證據**：G2 把已翻譯題目的 `/zh/c/NNN`、`/zh-TW/c/NNN` 302 到帶前綴的已發布頁面，依 A5 與 W2 寫入 `zh-TW` 蓋掉 `en`；V1d 一列連續四個請求，stored 中途被改，後面 `/c/NNN` 的期望由 A4 變 A1。
- **信心**：高　**等級**：P1
- **建議**：V1d 拆成未翻譯與已翻譯兩列，已翻譯的 zh 形式期望改 A5 加 W2；每個請求前重設 stored 值。

## C-5 H3 漏了兩語的 `guide/network.md:52` — P1

- **位置**：traceability.md:358（H3）；`platform/guide/network.md:52`、`platform/zh-TW/guide/network.md:52`。
- **證據（直接讀到）**：英文「switching locale clears the whole log, because switching locale navigates to the other locale's URL and reloads the page」；繁中「切換語系等於導向另一語系的同一頁網址，整頁重新載入」。
- **信心**：高　**等級**：P1
- **建議**：H3 加入兩語 `network.md:52`。

## C-6 查詢表的「目錄 index」正規化沒說要套到對應頁上；結果可能是 C1 也可能是 C3 — P1

- **位置**：traceability.md:139-149、:274（C1）；spec.en.md:74-77。
- **證據（推論）**：手打 `/zh-TW/challenge/v05-php-check`（無斜線、未翻譯）在「there」沒有繁中目錄 index，不正規化；對應頁 `/challenge/v05-php-check` 與清單 `/challenge/v05-php-check/` 比對失敗→C3；若條件解讀為對應頁那邊有目錄 index→C1。D1 明列手改網址在範圍內。
- **信心**：中　**等級**：P1
- **建議**：查詢表加一列，明定先算對應頁再對對應頁正規化（或相反），附此例。

## C-7 Overridden contracts 對 S6 的測試與文字列得不完整 — P1

- **位置**：traceability.md:215-217。
- **證據（直接讀到）**：
  - `tests/pre-commit-sh.test.ts:441-457`（0007 H20）斷言被忽略目錄沒有 `/zh/c/006`；新規則下會得到指向英文頁的 `/zh/c/006`、`/zh-TW/c/006`。
  - :855-885（H39，`RETIRED_DOOR_RULES`）、:1290（H37）、:1419-1424、:2073 以 `toEqual` 比對整組規則。
  - `scripts/pre-commit.sh:27-30`（「untracked challenge directories are left out」）與 :527 的 W4 訊息（「is untracked, so _redirects leaves it out」）：對未追蹤的繁中目錄，規則不再拿掉而是改指英文頁。
  - `generate-redirects.ts:111-116`（`includeSlug` 說明）同樣情況。
  - `MergedNav.test.ts` 與 `tests/unit/challenge/shortLink.test.ts` 寫死 `/zh/c/`。
  - `redirects.test.ts:295-301` 只禁止 `/c/1` 與 `/zh/c/1`，G 列沒說新形式也不得未補零。
- **信心**：高　**等級**：P1
- **建議**：補列 0007 的 H20、H37、H39 與上述測試、hook 文字；H1 加入 `pre-commit.sh` header 與 W4 訊息；G 列加「新形式也沒有未補零寫法」。

## C-8 G6 要求產生器拒絕孤兒繁中說明頁，但產生器不拒絕；fixture 說明與程式碼不符 — P1

- **位置**：traceability.md:348（G6）、:315（E3）、:427-428；spec.en.md:206-208、:183-184；`generate-redirects.ts:129-157`。
- **證據（直接讀到）**：`numericRules` 只透過 `checkChallengeNumbers` 檢查號碼；真正拒絕的是 `pre-commit.sh:464-508`（D12）與 CI 的 `redirects.test.ts:350`。以 `--no-verify` 提交的孤兒，`pnpm build` 照樣產生 `_redirects`；舊版只輸出 `/zh/c/NNN`，新版四條規則的情況矩陣沒寫。
- **信心**：高　**等級**：P1
- **建議**：G6 改為「hook 與 CI 拒絕，產生器不拒絕」，補產生器對孤兒的輸出列；或明定產生器新增拒絕。

## C-9 合併規則借用欄位清單漏了 category — P2

- **位置**：traceability.md:164-166、:174-175。
- **證據**：規則沒列 category，範例卻有 `"category": "web"`；依文字 category 應套 `綜合` 預設，與範例相反，影響分類篩選。
- **信心**：高　**等級**：P2

## C-10 已翻譯題目兩份說明頁 frontmatter `id` 不同時用哪個未定義 — P2

- **位置**：traceability.md:166-169、:313、:316。
- **證據**：E1 說條目取自繁中說明頁，兩份 `id` 不同時「same ids」不成立；frontmatter `id` 與共同順序的位置號也可能撞號。
- **信心**：中　**等級**：P2

## C-11 首頁卡片上的標記用哪個語系解析、靜態 HTML 是什麼，沒有列 — P2

- **位置**：traceability.md:318（E6）；`HomeContent.vue:7`、:49 用 runtime `$t`；`ChallengeList.vue:51` 有 `tp`。
- **證據（推論）**：走 `$t` 的話 SSR runtime 語系是 `en`，zh-TW 首頁靜態 HTML 會出現英文標記，hydration 才修正。
- **信心**：中　**等級**：P2

## C-12 只有繁中說明頁的條目（E3）在 F 列沒有連結結果 — P2

- **位置**：traceability.md:328-337、:315。
- **證據**：英文清單的 E3 條目在 short mode 會給 `/en/c/NNN`（沒有規則撐著），page mode 網址沒寫；fixture 用到這種條目，AC-7 沒對應。
- **信心**：中　**等級**：P2

## C-13 T 約束沒限制 S4 不得早於 D5 與 S1 — P2

- **位置**：traceability.md:55-58。
- **證據（推論）**：S4 先合進 main，繁中清單出現指向英文頁的條目，點進去時現在的 watcher 把偏好寫成 `en`。
- **信心**：中　**等級**：P2
- **建議**：加 T3：S4 不早於 D5 的 watcher 改動與 S1。

## C-14 重新整理與從 bfcache 還原是否算 W2 的冷載入沒有列 — P2

- **位置**：traceability.md:31、:303；spec.en.md:68。
- **證據（推論）**：stored `en` 的學習者經 C2 或跨語系連結落到 `/zh-TW/X`（W5 不寫），F5 後依 W2 寫入 `zh-TW`；「broken address 不會改掉偏好」重新整理一次就失效。
- **信心**：中　**等級**：P2

## C-15 W2、W3 在 `enhanceApp` 時就要判斷「是不是已發布頁面」，那時 router 未渲染 — P2

- **位置**：traceability.md:139-140、:303-304；`index.ts:232-237`。
- **證據**：`shouldPersistOnColdLoad` 只拿得到 URL 文字；矩陣沒說 W2 用哪種查詢，兩種查詢可能不一致。
- **信心**：中低　**等級**：P2

## C-16 只改 hash 或 query 的導覽算不算 arrival，沒定義 — P2

- **位置**：traceability.md:72、:294（L5）。
- **證據（推論）**：C1 落點頁 requested `zh-TW`、stored `en`；點頁內錨點若算 later navigation，requested 變 `en`，這一行消失。
- **信心**：中　**等級**：P2

## C-17 C1 從 404 頁轉到題目頁時，這一行和 session gate 的先後沒有列 — P2

- **位置**：traceability.md:252（A6）、:284（C11）；spec.en.md:136；`index.ts:137-148`；`useSessionGate.ts:180-183`。
- **證據**：not-found 頁不是題目頁，gate 不出現，redirect 檢查完成即放行；落點題目頁上 gate 接著詢問；「這一行等 gate」對這一頁是否成立沒說；V1g 只測直接冷載。
- **信心**：中低　**等級**：P2

## C-18 百分比編碼格式錯誤的路徑沒有列 — P2

- **位置**：traceability.md:147-148。
- **證據**：`/zh-TW/%E0%A4%A` 的 `decodeURIComponent` 會拋例外；沒有列規定它「不在清單、不拋例外、C3」。
- **信心**：中　**等級**：P2

## C-19 V 列漏掉幾個只有瀏覽器層看得到的觀察 — P2

- **位置**：traceability.md:367-383；spec.en.md:211-212。
- **證據**：C3（例如 `/en/challenges`）、C10 在真實主機（主機可能先正規化 `//`、`\`）、題目頁 `MergedNav` 上的 B2、B5（開 Browser panel）以及 H3 宣稱的「沒有導覽就不清空流量記錄」、W5 的 Back／Forward 不寫入（V1h 只看 C7）、768–1279 寬（C-1）都沒有瀏覽器層觀察。
- **信心**：中　**等級**：P2

## C-20 H3 沒列出「兩份清單各自編號」的句子，也沒說新條目是否進症狀索引表 — P2

- **位置**：traceability.md:358；`platform/guide/index.md:36`、`platform/zh-TW/guide/index.md:36`、兩語 `troubleshooting.md:217`、`troubleshooting.md:5-23` 的症狀索引表。
- **證據**：「the English and Chinese lists are numbered independently」與 E4 矛盾，且徽章顯示的其實是 `number`，這句本已過時。
- **信心**：中　**等級**：P2

## C-21 H1 漏了幾段會變錯的程式碼註解 — P2

- **位置**：traceability.md:356。
- **證據（直接讀到）**：`i18n/index.ts:185-198` 的 `shouldPersistOnColdLoad` 說明（「A prefixed path is a request and updates the preference」）；`index.ts:225-231` 的 `enhanceApp` 註解；`LocaleSwitcher.vue:38-40`、:47-55；`pre-commit.sh:27-30` 與 :527。
- **信心**：高　**等級**：P2

## C-22 D10「Apart from the line, no layout changes」與 D7、B5 字面衝突 — P2

- **位置**：traceability.md:36、:33、:267。
- **證據**：D7 換掉預設主題 nav 的選單，B5 讓選單多一個選項，都是版面變更。
- **信心**：低　**等級**：P2
- **建議**：D10 範圍限定在內容區版面。

## C-23 B5 狀態下的選單內容沒有定義 — P2

- **位置**：traceability.md:267；`LocaleSwitcher.vue:145-167`。
- **證據**：這一行顯示時，標題（`data-locale-current`）顯示頁面語系還是剛才的選擇、選項有哪些、`aria-selected` 怎麼設，都沒寫。
- **信心**：中　**等級**：P2

## C-24 hydration 之前，內建選單仍然看得到、點得到 — P2

- **位置**：traceability.md:266（B4）；`index.ts:176-178`（body class 在 `onMounted` 才加上）。
- **證據**：靜態 HTML 沒有 `use-custom-locale-switcher`，mount 前內建選單照常顯示且可點；B4 沒說「not shown」是否包含 hydration 前。
- **信心**：中　**等級**：P2

---

統計：P0 0、P1 8（C-1～C-8）、P2 16（C-9～C-24）。

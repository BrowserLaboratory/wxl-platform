# Stage 3 第 2 輪：軸 2 可驗證性（Verifiability）審查報告

**審查範圍**：epic 0008-missing-translation-fallback，依凍結 prompt `review/prompt.md`。`spec.en.md` blob `c38a6aa`、`traceability.md` blob `9701eaf`（working tree，revision 2）；程式碼 HEAD `5d3c173`；pending 的 `GLOSSARY.md`、ADR-0008 在範圍內。reviewer 無 shell，未自行計算 hash；父代理人存檔時確認 working tree 即為上述 blob。reviewer：`harness-reviewer`（2026-11-04）。由父代理人照 reviewer 交回的報告存檔。

讀過：spec、traceability、round-1-V、disposition、`.vitepress/theme/index.ts`、`i18n/index.ts`、`LocaleSwitcher.vue`、`MergedNav.vue`、`ChallengeLayout.vue:820–890`、`ShortLinkShare.vue`、`ChallengeList.vue`、`HomeContent.vue`、`style.css:281–284`、`shortLink.ts`、`config.mts`、`generate-redirects.ts`、`challenge-numbers.ts:95–168`、`pre-commit.sh`、兩個 data loader、`platform/**/*.md`（27 個，與 schema 相符）、VitePress `VPNavBarExtra.vue`、`workflow.md:80–184`、`create-wxl/src/run.mjs:285–292`、`theme-locale-wiring.test.ts` 案例名。模糊詞檢查：兩份檔案都沒有。

---

## V-1 not-found 路徑的正規化與求 counterpart 先後順序沒規定，C1 與 C3 的判定會相反 — P1

- **位置**：traceability.md:71、:139–149、:274–276；spec.en.md:157–162（AC-4）。
- **證據**：Lookup 表第一列只有「when a directory index exists there」才正規化成 `/challenge/x/`；not-found 路徑那一側沒有目錄 index，也沒有 page-list spelling 可算 counterpart。
- **推論**：手打 `/zh-TW/challenge/<英文限定>`（少斜線）：先正規化→原樣→counterpart `/challenge/<slug>` 與清單 `/challenge/<slug>/` 不符→C3；先求 counterpart 再正規化→C1。`/zh-TW/challenge/x/index.html`、`/zh-TW/guide/python/` 同樣分歧。
- **影響**：D1 明列手改網址與舊連結，AC-4 對它們沒有唯一期望。
- **信心**：高　**等級**：P1
- **建議**：not-found 路徑先依拼法正規化（去 `.html`、`/index`，斜線有無兩種都試），對每個候選拼法求 counterpart，與清單精確比對，導向目標取清單項目；C 列加入三種輸入的期望。

## V-2 共用 fixture 無法同時給 S6 與 E10 用；AC-8「孤兒繁中說明頁仍被拒絕」沒說哪個 seam 拒絕，且產生器其實不拒絕 — P1

- **位置**：spec.en.md:180–185、:206–208；traceability.md:322（E10）、:348（G6）、:427–428；`generate-redirects.ts:129–157`；`challenge-numbers.ts:104–168`；`pre-commit.sh:464–504`；`redirects.test.ts:350`；`redirects-generated.test.ts:122`。
- **證據（直接讀到）**：`generateRedirects` → `checkChallengeNumbers` 只檢查號碼存在、形狀、跨語系一致、唯一，不檢查孤兒；今天遇到孤兒照樣產生 `/zh/c/NNN → /zh-TW/challenge/<orphan>/`。拒絕孤兒的是 `pre-commit.sh`（D12）與 `redirects.test.ts` 的「backs every translated slug with a root-locale challenge」。產生器遇到沒有號碼的頁面會 throw。
- **推論**：AC-8 用 AC-6 的 fixture（含孤兒），schema 沒定義孤兒該產生的四條規則，同一條 AC 又要求「被拒絕」，在產生器上不會。「the hook and generator refuse it」對產生器不符。E10 需要無號碼條目，fixture 若含之，S6 共用時產生器 throw。
- **影響**：AC-8 與 AC-6 的 E10 子句在指定 fixture 上無法同時判定。
- **信心**：高　**等級**：P1
- **建議**：AC-8 的 fixture 排除孤兒，寫明拒絕由 `pre-commit.sh` 與 `redirects.test.ts` 負責（或把產生器拒絕列為新行為並寫訊息期望）；E10 另設只用在 S4 的無號碼條目，或改寫共用範圍。

## V-3 V1d 期望寫「A1–A4」，但指向已翻譯題目的 `/zh/c/NNN`、`/zh-TW/c/NNN` 實際落在 A5 並寫入偏好 — P1

- **位置**：traceability.md:380（V1d）、:251（A5）、:303（W2）、:344（G2）。
- **證據**：G2 把已翻譯題目的繁中短連結 302 到 `/zh-TW/challenge/<slug>/`，是冷載入帶前綴的已發布頁面，適用 A5：不重導、不顯示、寫入 `zh-TW`（W2）。
- **推論**：V1d 的「then A1–A4」對這兩種請求錯誤；執行後 stored 已是 `zh-TW`，同列再請求 `/c/NNN` 時起始狀態已不是表上寫的。V1d 一列八個請求，沒寫是否每個請求前重設。
- **信心**：高　**等級**：P1
- **建議**：V1d 依目標拆開（指向已翻譯題目的繁中短連結期望 A5 加 W2，其餘 A1–A4）；明文每個請求前重設 stored 值。

## V-4 AC-3／B4 只取 1280 與 375，量不到 VPNavBarExtra 在 768–1279 寬顯示的內建語系選單 — P1

- **位置**：traceability.md:266（B4）、:33（D7）、:418–420；spec.en.md:151–156；`style.css:281–284`；VitePress `VPNavBarExtra.vue:11,27–36,65–80`。
- **證據（直接讀到）**：`VPNavBarExtra` 內有 translations group，以 `useLangs({ correspondingLink: true })` 產生直連 counterpart 的 `<a>`，在 768 以上、1280 以下顯示（`site.appearance` 預設開啟，flyout 一定存在）。現有 CSS 只隱藏 `.VPNavBarTranslations` 與 `.VPNavScreenTranslations`。
- **推論**：寬度 1024 時預設主題頁同時有 `LocaleSwitcher` 與內建選單；點內建選單會 push 到 404 再 C1 replace 回來，外觀像 B2，實際導航且多一筆 history。AC-3 與 V3 只看 1280、375，都會 pass；「one switcher per page」沒有驗證出口。
- **信心**：高（VitePress 2.0.0-alpha.16）　**等級**：P1
- **建議**：B4 列入 `VPNavBarExtra` 的 translations group 並寫明怎麼隱藏；AC-3／V3 加一個 768–1279 的寬度（例如 1024）。

## V-5 AC-3 的寬度子句沒有可判定的 seam；MergedNav 在 375 寬沒有 V 列 — P2

- **位置**：spec.en.md:151–156；traceability.md:259、:372。
- **證據**：S1 是 pure function、S2 是頁面清單，都觀察不到 viewport；V3 只看參考頁兩種寬度，MergedNav × 375 沒有觀察出口。
- **信心**：中高　**等級**：P2
- **建議**：AC-3 標明寬度子句由 stage 8 判定；V1 加入「題目頁、375 寬、B2／B5」。

## V-6 A5 × 無法讀取的 storage，「寫入 `zh-TW`」不可能成立；A4 沒寫偏好 — P2

- **位置**：traceability.md:242–243、:250–251；spec.en.md:147–150；B6、W6。
- **證據**：A5 的 stored 值是「Any」（含 unreadable），期望「Preference written as `zh-TW`」，與 W6「nothing written」衝突；A4 沒提偏好，AC-2 卻要求「writes the preference or not, exactly as the row states」。
- **信心**：高　**等級**：P2
- **建議**：A5 改「written as `zh-TW` when storage is writable; W6 otherwise」；A4 補「Preference not written (W4)」。

## V-7 AC-5「exactly when L1 holds」沒算進 gate 等待；V1g 沒指定 gate 選哪個決定 — P2

- **位置**：traceability.md:290（L1）、:252（A6）、:284（C11）、:264（B2）、:382（V1g）；spec.en.md:163–168；`.vitepress/theme/index.ts:129–170`。
- **證據**：A6／C11 規定 line 等 gate，L1 本身沒有這個條件。程式碼：決定為 `cleared` 時整頁替換載入站台根目錄，重導永遠不會執行；決定 marker 一個 session 只問一次（`hasGateDecision`）。V1g 沒說選 continue、dismissed 或 clear，也沒說開新 session。
- **信心**：中高　**等級**：P2
- **建議**：L1 加上「and the session gate has decided (A6)」；V1g 指定新分頁、新 session、選 continue（或 dismissed），另列 clear 的期望。

## V-8 這一行的 DOM 錨點有兩處需要詮釋 — P2

- **位置**：traceability.md:292–293（L3、L4）；spec.en.md:102–106；`ChallengeLayout.vue:831–865`。
- **證據**：題目頁的 `data-runtime-reset` 橫幅也緊接在 MergedNav 之後，兩者同時出現時哪個是「directly below MergedNav」沒規定。「first element of the document content」在 doc、page、home 三種 layout 對應的容器不同（doc layout 的 `doc-before` slot 在 `main` 之前，`.vp-doc` 內部無法經 slot 插入）；fixture 的英文限定文章屬於哪種 layout 沒寫。
- **信心**：中　**等級**：P2
- **建議**：寫明與 runtime-reset 橫幅的順序；L4 指名 slot 或 selector，並寫明其他 layout 的處理。

## V-9 V2、V3 沒寫起始 stored 值；V2 的 C1 沒寫請求哪個 URL；V1h 的「前一頁」未定義 — P2

- **位置**：traceability.md:371–372、:378、:383；spec.en.md:189–192。
- **證據**：V2 觀察 A2 需要 stored 為 none 或 `zh-TW`，沒寫；V3 的 B2 要看到 line 出現，起點必須沒有 line（例如 stored `en`），從 none 開始時 A3 已顯示 line；GitHub Pages 不讀 `_redirects`，在 V2 請求 `/zh-TW/c/<slug>` 只會得到 C3，要觀察 C1 須直接請求 `/<repo>/zh-TW/challenge/<英文限定>/`；V1h 的前一頁與 V1c 的哪一個請求沒定義。
- **信心**：高　**等級**：P2
- **建議**：V2、V3 補 stored 值欄與請求 URL；V1h 寫明「同分頁先開已知頁面，再請求 `/zh-TW/c/<slug>`，按 Back，期望回到該頁」。

## V-10 V1e 的首頁卡片標記只有在 fixture 題目落在最新 3 題內才看得到 — P2

- **位置**：traceability.md:381（V1e）、:35（D9）；`HomeContent.vue:20–29`。
- **證據**：真實樹有 4 題；D9 沒規定拋棄式題目的 `date`；V1e 的動作只有打開繁中清單，沒有首頁。
- **信心**：中　**等級**：P2
- **建議**：D9 規定 fixture 題目的 date 最新（或以 `create:challenge` 產生）；V1e 補「打開 `/zh-TW/`」。

## V-11 AC-1 的「27 paths」、P5、P6 需要詮釋 — P2

- **位置**：spec.en.md:142–146；traceability.md:118、:236–237。
- **證據**：「for the real tree at `5d3c173` it holds the schema's 27 paths」讀成寫死 27 的測試，每新增一頁就 fail（拋棄式分支是 28）；讀成與 oracle 相等，27 就多餘；`5d3c173` 上沒有實作，無法在那個 commit 判定。P5「the next list follows」在 `pnpm dev` 下是即時還是重啟後更新、在哪個 seam 觀察都沒寫。P6 對應 AC-1，但 AC-1 文字沒涵蓋 P6；它實際是 H3 的文件檢查。
- **信心**：中　**等級**：P2
- **建議**：AC-1 改為「real-tree list equals the oracle」，27 只作撰寫時的事實註記；P5 寫明 dev 下的更新時點；P6 改對應 AC-9。

## V-12 Merge rules 的借用欄位沒列 `category`，範例卻有；AC-6 的「defaults」需要 fixture 缺欄位，但沒規定 — P2

- **位置**：traceability.md:164–175；spec.en.md:169–175；`challenges.data.ts:17,33`、`challenges.zh-TW.data.ts:14`。
- **證據**：借用欄位只列 title、summary、number、difficulty、tags、date；`ChallengeData` 有 `category`，預設 `General`／`綜合`；範例卻寫 `"category": "web"`。「`id` is the frontmatter `id` when present」在兩份說明頁 `id` 不同時取哪份未定。
- **信心**：中高　**等級**：P2
- **建議**：借用欄位補 `category`（或明文排除）；寫明 fixture 缺哪些欄位；寫明 `id` 的來源順序。

## V-13 H1 的「names `/en/c/` and `/zh-TW/c/`」套到與短連結無關的註解；AC-9 的「Traditional Chinese pages」範圍不明 — P2

- **位置**：traceability.md:356（H1）、:358（H3）；spec.en.md:186–188。
- **證據**：照字面，`LocaleSwitcher`、`USE_CUSTOM_LOCALE_SWITCHER`、route watcher 的註解也得寫短連結形式；「Traditional Chinese pages」只指 `platform/zh-TW/**` 還是也包含 README、OPEN-QUESTIONS 不明。
- **信心**：中　**等級**：P2
- **建議**：H1 拆成短連結相關與語系相關兩組；AC-9 寫明以 `platform/zh-TW/` 為範圍。

## V-14 AC-10 的 V 列跨越 S1–S6，但 stage 8 逐票執行，D9 的「the ticket branch」沒指定哪一張 — P2

- **位置**：traceability.md:35（D9）、:49（S7）、:57–58（T1、T2）；`workflow.md:85–91`、:160–162。
- **證據**：V1c 需要 S6 加 S1；V1e 需要 S4 加 S5；workflow 規定每張票在自己的 preview 跑 stage 8；spec 沒把 V 子列分配給票，也沒寫 AC-10 的判定時點。
- **信心**：中　**等級**：P2
- **建議**：Constraints 加 T3：每個 V 子列由宣告它的票判定，或 AC-10 在最後一張票、前面的票都 land 之後判定。

## V-15 B5「also offers the page's own locale」在現有選單結構上沒有可斷言的形態 — P2

- **位置**：traceability.md:267（B5）；spec.en.md:151–156；`LocaleSwitcher.vue:38–43,55,145–167`。
- **證據**：現在選單是標題（頁面語系）加一個選項（另一個語系）；`select()` 遇 `pageLocale === target` 直接 return。B5 是新增第二個選項還是替換、line 顯示時標題與 `aria-label` 顯示什麼、再選一次已選語系的結果，都沒規定。
- **信心**：中　**等級**：P2
- **建議**：寫明 line 顯示時的選項清單（例如兩個 `data-locale-option`）與標題；Overridden contracts 補 `select()` 的提前 return。

---

pending 的 GLOSSARY 與 ADR-0008：本軸沒有問題。

合計：P0 0、P1 4、P2 11

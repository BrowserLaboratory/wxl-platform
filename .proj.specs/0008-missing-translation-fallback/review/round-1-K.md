# Stage 3 第 1 輪：軸 3 契約衝突（Contract conflict）審查報告

**審查範圍**：epic 0008-missing-translation-fallback。`spec.en.md` blob `c1ab053`、`traceability.md` blob `7ea747c`（working tree）；程式碼 HEAD `5d3c173`；GLOSSARY.md 與 ADR-0008 的 pending edit 一併讀。除另註「推論」外，file:line 都是直接讀到。reviewer：`harness-reviewer`（2026-11-04）。由父代理人照 reviewer 交回的報告存檔。

---

## K-1 文章頁的語系切換是 VitePress 內建連結，S1 的切換規則管不到 — P1（可主張 P0）

- **位置**：spec.en.md:68-71；traceability.md:181-184（B2、B4）、:262（V3）；`.vitepress/theme/index.ts:36-54`、:200-211；`style.css:281-282`。
- **衝突的契約**：`index.ts` 註解寫明 `USE_CUSTOM_LOCALE_SWITCHER = false` 時預設主題頁用內建 `VPNavBarTranslations`，且「Flip this and rebuild; no spec change is required (the i18n-runtime spec covers both modes)」。
- **證據**：旗標為 `false`；`LocaleSwitcher.vue` 只出現在 `MergedNav`。文章頁用內建 `VPNavBarTranslations`（桌面）與 `VPNavScreenTranslations`（行動），只是指向對應頁的 `<a>`，不呼叫 S1。B4 的「desktop menu and mobile menu」只有這組內建元件符合。spec 沒提旗標與內建元件。
- **影響（推論）**：文章頁點「繁體中文」先導到 `/zh-TW/reference/...`（client 端 404），再被 C1 replace 回原頁；watcher 先寫 `zh-TW` 再寫 `en`，違反 B2。實作者只能自己決定換掉內建元件或翻轉旗標；旗標註解要求的「spec 涵蓋兩種模式」沒做到。
- **信心**：高　**等級**：P1（B4 只在內建元件路徑上成立而 spec 沒給設計，也可主張 P0）
- **建議**：明訂文章頁的切換元件（翻轉旗標並涵蓋 `VPNavScreenTranslations`，或覆寫內建元件），同時更新 `index.ts` 註解。

## K-2 既有路由 watcher 每次跨語系導覽都寫入偏好，與 C1/C5、D4、E2 衝突 — P1（可主張 P0）

- **位置**：traceability.md:63、:190（C1）、:194（C5）、:205（D4）、:213（E2）；spec.en.md:124-127（AC-4）；`index.ts:64-86`；`tests/unit/i18n/route-locale-sync.test.ts:98-113`；`theme-locale-wiring.test.ts:193-203`。
- **衝突的契約**：Layout 的路由 watcher 只要前綴跨語系就 `persistLocale(target)`；測試明文鎖住（「browser back ... updates locale to en」並斷言 localStorage 變成 `en`）。
- **證據與影響**：
  1. C1/C5：冷載 `/zh-TW/X` 時 `enhanceApp` 寫 `zh-TW`；replace 到 `/X` 是跨語系路由變更，watcher 改寫成 `en`；AC-4 的「still stores zh-TW」只是瞬間狀態。
  2. C1 對 D4：replace 是路由變更，依 D4 用儲存的偏好（已是 `en`）重判，D1 為假、提示消失，與 C1「The line shows, in zh-TW」矛盾。
  3. E2：繁中學習者在繁中清單點未翻譯題目進到英文頁，watcher 把偏好改成 `en`；之後冷載入不再導去繁中，`MergedNav` 的返回連結指向英文清單（`navLink` 依頁面語系）。讀碼推論，未重現。
  - 「Checks on this revision」沒有檢查這個 watcher。
- **信心**：高　**等級**：P1（第 2 點按字面是規則互斥，也可主張 P0）
- **建議**：決定「導到沒有翻譯的頁面」算不算語系請求；若不算，修改 watcher 寫入條件，並明文宣告要改寫 `route-locale-sync` 的哪些契約；寫清 C1 的請求語系怎麼帶到 D4。

## K-3 A6 與冷載入持久化、明確請求規則衝突 — P1

- **位置**：traceability.md:171（A6）、:284-285；spec.en.md:115-119；`i18n/index.ts:172-175`、:185-203；`index.ts:232-238`；`theme-locale-wiring.test.ts:163-167`。
- **衝突的契約**：`shouldPersistOnColdLoad` 規定帶前綴路徑的冷載入更新偏好（「A prefixed path is a request and updates the preference」），發生在 `enhanceApp`，早於 Layout 掛載；`redirectTargetForStoredLocale` 註解說帶前綴路徑是明確請求。
- **證據**：A6「儲存 `en`、冷載 `/zh-TW/`、對應頁不存在 → line in `en`」，但決策時儲存值已被改成 `zh-TW`，依請求語系表 D1 為假，除非決策讀寫入前的值，而 spec 沒這樣規定。語意上，使用者明確點了 `/zh-TW/` 連結卻收到英文的「沒有英文版」。
- **影響**：A6 的測試與 C5「Unchanged」不能同時成立。
- **信心**：高　**等級**：P1
- **建議**：明訂 A6 的請求語系來源（寫入前的值或路徑），或改寫 A6；補完「A6 against explicit-request rule」的自我檢查。

## K-4 `ShortLinkShare` 的 `locale` prop 同時決定 URL 與介面文字，S4/F3/F6 需要兩個不同語系 — P1

- **位置**：spec.en.md:81-83；traceability.md:227（F3）、:230（F6）；`ShortLinkShare.vue:57-63`、:67、:77-80；`ChallengeList.vue:443`。
- **衝突的契約**：prop 文件「The locale of the page this sits on, not the vue-i18n runtime locale」，同一個值同時產生連結（`challengeLink`）與翻譯文字（`tp`）。
- **證據**：spec 要傳條目的頁面語系給 page mode；F3 要 short mode 用清單語系；介面文字理應跟清單頁語系。spec 沒定義元件介面怎麼改。
- **影響（推論）**：直接傳 `en`，繁中清單出現英文 aria-label 與狀態；short mode 給出 `/en/c/NNN`，違反 F3。
- **信心**：高　**等級**：P1
- **建議**：拆成「連結語系」與「介面語系」兩個輸入，或明訂由 mode 決定；更新 prop 文件。

## K-5 重新定義 0007 的 hook 與 generator 契約，卻沒有明文宣告覆寫 — P1

- **位置**：traceability.md:239-245（G1-G7）、:251（H1）；spec.en.md:166-167、:181。
- **衝突的契約**：
  - `.proj.specs/0007-gh-pages-range-fixes/traceability.md:420`（H02「a Traditional Chinese brief ... gains its `/zh/c/NNN` rule」）、:432（H14）、:458（H40「the `/zh/c/NNN` rule goes and the `/c/NNN` rule stays」）
  - `tests/pre-commit-sh.test.ts:320`、:353-363、:456、:2073（未翻譯題目恰好 3 條規則）
  - `tests/unit/site/redirects.test.ts:122-128`（`PARAMETERISED_RULES` 兩條）、:128（`NUMBERED_SOURCE` 不接受 `/en/c/`、`/zh-TW/c/`）、:278-282（「ends with the two parameterised classroom rules, unchanged」）
  - `scripts/generate-redirects.ts:49`（「Unchanged by this change」）、:120-127（「A challenge gets a Traditional Chinese rule only when it has a Traditional Chinese page」）
- **證據**：G3 讓每題都有 `/zh/c/NNN`（未翻譯的指向英文頁），H40 要求刪掉繁中說明頁時 `/zh/c/NNN` 一起消失，直接相反。spec 只說「copied form」相關測試會改；`numericRules` 的 doc comment 不在 H1 範圍。
- **影響**：stage 6 無依據判斷這些測試改動「只是形式變更」；0007 被覆寫的列沒有紀錄。
- **信心**：高　**等級**：P1
- **建議**：新增「Overridden contracts」一節，列出 0007 的 H01、H02、H14、H40、上述測試與 doc comment；H1 擴大到 `numericRules` 與 `PARAMETERISED` 的註解。

## K-6 「Browser panel」在專案裡另有定義 — P1

- **位置**：spec.en.md:150-153（AC-10）；traceability.md:37（S7）、:260-262。
- **衝突的契約**：AGENTS.md hard rule 4；`docs/agents/platform-notes.md:5-10`（「A challenge page's Browser panel is a `srcdoc` iframe」）；GLOSSARY.md:166-172（tool panel，Browser 分頁）。
- **證據**：Browser panel 是題目頁內的工具面板；冷載入導向、語系切換、清單標記、規則 302 都不在它裡面觀察；V3 的 reference 頁是文章，沒有 Browser panel。0007 V02 的寫法是「driven with `/agent-browser` or the host's native browser tools ... challenge pages checked with their Browser panel open」。
- **影響**：AC-10 無法照字面執行；hard rule 4 對題目頁的要求沒保留。
- **信心**：高　**等級**：P1
- **建議**：改用 0007 V02 的句型。

## K-7 V1 要在 ticket 分支新增一道只有英文的題目 — P1

- **位置**：traceability.md:260（V1）、:37（S7）。
- **衝突的契約**：AGENTS.md Delivery model（「A new challenge is an epic of its own」）與 Charter；`docs/agents/challenge-pipeline.md:3`、:38（「a challenge does not reach `main` without [the blind solve]」）；GLOSSARY.md:82-84 與 `scripts/challenge-numbers.ts:10`、:34（號碼不重發、有 `.archive` 紀錄）。
- **證據**：spec 沒說這道題會在 squash merge 前移除、沒說豁免上架閘門、沒交代號碼。
- **影響**：進了 `main` 就違反 challenge pipeline 與上架閘門；中途移除則號碼處理無規則。
- **信心**：中　**等級**：P1
- **建議**：明訂它只是 stage 8 fixture、merge 前移除、不指派正式號碼（或指派後移入 `.archive`）；或改用 0007 那種臨時 range。

## K-8 使用手冊的現有敘述會變成錯的，H3 卻只要求新增說明 — P1

- **位置**：traceability.md:215（E4）、:182（B2）、:253（H3）。
- **衝突的契約**：`platform/guide/troubleshooting.md:216` 與 `platform/zh-TW/guide/troubleshooting.md:216`「兩份清單收錄的題目可能不同」與 E4 衝突；兩份檔案 `:191`「the locale switcher navigates to the other locale's URL」在 B2 不成立。
- **影響**：epic 完成後對外文件留下錯誤敘述，AC-9 不會發現。
- **信心**：高　**等級**：P1
- **建議**：H3 擴大成「修訂 :191、:216 的兩種語言版本」。

## K-9 AGENTS.md 仍稱 `zh-TW/` 是每一頁的鏡像 — P2

- **位置**：AGENTS.md:98（「the Traditional Chinese mirror of every page」）；traceability.md:15（G2）；GLOSSARY.md:406（pending avoid：鏡像、繁中鏡像）。
- **證據**：G2 說翻譯選配；GLOSSARY pending edit 點名這個說法；H 列沒涵蓋 AGENTS.md；OQ-024 Evidence 也引用「mirror」。
- **信心**：高　**等級**：P2
- **建議**：H 列加上 AGENTS.md 的 Repository layout。

## K-10 page list schema 的拼法規則與自己的範例、與 `config.mts` 都不一致 — P1

- **位置**：traceability.md:83-84 對 :88-94、:98-100、P3 :158；spec.en.md:111-114（AC-1）。
- **衝突的契約**：`.vitepress/config.mts:29-42`（cleanUrls：目錄型 `index.md` 保留結尾斜線，`/challenge/<slug>/` 是 Cloudflare 標準拼法）。
- **影響**：AC-1「schema's spelling」兩種讀法，P3 無法唯一判定。
- **信心**：高　**等級**：P1
- **建議**：規則改為「頁面檔沒有結尾斜線，目錄 index 保留結尾斜線」。

## K-11 碰到 session gate，卻沒有依 ADR-0006 寫出威脅模型 — P2

- **位置**：traceability.md:175（A10）；spec.en.md:99-107。
- **衝突的契約**：`docs/adr/0006-...md:35-36`（「A spec that touches the session gate states this threat model in its trust-boundary section」）。
- **證據**：A10 把 gate 的等待範圍擴大到這行提示，信任邊界表沒提 ADR-0006。
- **信心**：中（「touches」的界線可爭論）　**等級**：P2

## K-12 GLOSSARY 只記錄了退場的 `/zh/c/` — P2

- **位置**：GLOSSARY.md:103；traceability.md:23（D2）；spec.en.md:43-46。
- **證據**：D2 也讓 `/c/NNN` 不再發出，但 `_Avoid_` 只登記 zh 前綴舊寫法，與 GLOSSARY 自己「收舊寫法」的規則（:12-16）不一致。「2026-11-04 起不再發出」寫在 epic 落地前；HEAD 的 `shortLink.ts:60-63` 仍在發 `/zh/c/`。
- **信心**：高　**等級**：P2

## K-13 root locale／untranslated 的用法與 GLOSSARY 的語系條目不一致 — P2

- **位置**：traceability.md:15（G2）、:46-47、:51、:214（E3）；GLOSSARY.md:397-402（主語系：避用「根語系」）、:404-405（翻譯 = 主語系以外的版本）。
- **證據**：G2「Every page has a version in the root locale」指的是主語系概念，卻用了位置講法；zh-TW 譯本一定碰到被避用的「根語系」。E3 缺的是主語系版本，依 GLOSSARY 不算「未翻譯」。
- **信心**：中　**等級**：P2

## K-14 「language menu」是競爭名稱，這行提示與標記也沒有詞條 — P2

- **位置**：spec.en.md:29、:53；traceability 用 locale switcher；GLOSSARY.md:392-394。
- **衝突的契約**：AGENTS.md「update [GLOSSARY] in the same change that adds or changes a term」；H3 會在使用手冊（語料範圍內）替這行提示命名，pending edit 沒有對應詞條。
- **信心**：中　**等級**：P2

## K-15 「主語系」的新造詞宣告是雙向檢查的 — P2

- **位置**：GLOSSARY.md:399；`tests/unit/site/glossary.test.ts:333-342`。
- **證據**：H2/H3 修訂 README 或疑難排解頁（語料範圍內）若用到「主語系」，glossary 測試會因「宣告新造卻已在使用」失敗。目前語料沒有這個詞（grep 確認）。
- **信心**：低　**等級**：P2

## K-16 S1 說「stay pure functions」，實際是簽章變更，現有測試契約也會變 — P2

- **位置**：spec.en.md:64-65；`i18n/index.ts:182-184`（自稱 pure）、:213（函式內讀 localStorage）；`initial-locale-redirect.test.ts:28-31`；`locale-switcher.test.ts:150-163`、:298-308（從不存在的 `/challenges/door-is-open/`、`/challenges/foo` 切換並期望導覽）。
- **證據**：加入 page list 後這些路徑都落入「對應頁不存在」，現有導覽斷言失效；Testing Decisions 沒宣告。
- **信心**：高　**等級**：P2

## K-17 LocaleSwitcher 對 runtime locale 的註解要被覆寫，但不在 H1 範圍 — P2

- **位置**：`LocaleSwitcher.vue:18-20`、:57；spec.en.md:68-71（spec 有明文覆寫，這部分合規）；traceability.md:251。
- **信心**：高　**等級**：P2

## K-18 「page layout 不變」與「題目頁內容頂端加一行提示」並列 — P2

- **位置**：spec.en.md:96-97 對 :75-78；traceability.md:204（D3）。
- **證據（推論）**：題目頁用自訂 `ChallengeLayout`，放提示得修改它；「page layout」指什麼不明。
- **信心**：低　**等級**：P2

## K-19 Cloudflare 規則上限可能沿用了不精確的既有註解 — P2

- **位置**：traceability.md:147-148；`generate-redirects.ts:66`、`_redirects:10`。
- **證據（依認知，未重新查證）**：上限是靜態 2,000、動態 100；編號規則屬靜態，4N ≤ 2000，500 題。
- **信心**：中　**等級**：P2

## K-20 0007 B1 已記載 preview 的短連結指向正式站 — P2

- **位置**：`.proj.specs/0007-gh-pages-range-fixes/spec.en.md:188`（B1）；traceability.md:260（V1 的 F2-F3、G1-G3）。
- **證據**：preview 複製到 `wxl.browserlab.online/zh-TW/c/NNN`，正式站 merge 前沒有 `/zh-TW/c/` 規則，也沒有 stage 8 的題目；V1 沒寫 G1-G3 改在 preview host 直接開路徑。
- **信心**：高　**等級**：P2

## K-21 OQ-024 的「Blocks」條款 — P2

- **位置**：`.proj.specs/OPEN-QUESTIONS.md:906`（「Blocks. Any epic that ... makes a bilingual brief optional」）；traceability.md:15（G2）、:254（H4）。
- **證據**：G2 把「翻譯可有可無」寫成規則，spec 沒說明為何 OQ-024 擋不到這個 epic（例如 ADR-0008 已決定），H4 只要求補一行。
- **信心**：中　**等級**：P2

## K-22 Charter 的「easy to upgrade」 — P2

- **位置**：Charter；traceability.md:245（G7）。
- **證據（推論）**：range 併入這一版後，每道題目的 `_redirects` 格式都變，重新產生前 CI 守門會失敗；README 已寫「CI 回報過期就執行 `pnpm redirects:generate`」，代價有文件可循，但 spec 沒提 range 側影響。
- **信心**：中　**等級**：P2

## K-23 「Traditional Chinese brief」與 engagement brief（委託書）撞名 — P2

- **位置**：spec.en.md:19、:91；GLOSSARY.md:115-122、:357。
- **證據**：「說明頁」在 GLOSSARY 沒有英文對應；「brief」已是委託書體裁的英文名。AGENTS.md 與 challenge-pipeline 也這樣用，屬既有用法。
- **信心**：低　**等級**：P2

---

### 不屬於本軸的觀察（不計入統計）

- A1 與 C2 同時套用在「冷載入不存在的無前綴路徑、`/zh-TW/` 對應頁存在」：A1 不顯示提示，C2 顯示英文提示，與「Exactly one source applies」矛盾。屬完整性軸，P1。
- 兩個 loader 的 `id` fallback 都是 `idx+1`，`category` 預設值不同（「綜合」對「General」），合併後影響 E4 與 E6。屬完整性軸，P2。

檢查範圍：GLOSSARY.md（含 pending）、AGENTS.md、ADR-0006／0007／0008、docs/agents 的 review／workflow／language／challenge-pipeline／platform-notes、OQ-016／018／023／024、0007 的 spec 與 traceability（B1、B4、H 列、V02）、README 兩語、`config.mts`、`theme/index.ts`、`i18n/index.ts`、`LocaleSwitcher`、`MergedNav`、`ChallengeList`、`ShortLinkShare`、`HomeContent`、`shortLink.ts`、兩個 data loader、`generate-redirects.ts`、`_redirects`、兩語 troubleshooting 頁與 `guide/index.md`、測試 `tests/unit/i18n/*`、`redirects*.test.ts`、`challenge-data-loaders.test.ts`、`glossary.test.ts`、`messages-shape.test.ts`、`sentence-map.test.ts`、`pre-commit-sh.test.ts`、site-smoke。

統計：P0 0、P1 9（K-1～K-8、K-10）、P2 14。

# Stage 3 第 2 輪：軸 3 契約衝突（Contract conflict）審查報告

**範圍**：epic 0008-missing-translation-fallback。working tree 的 `spec.en.md` 與 `traceability.md`（parent 指定 blob `c38a6aa`、`9701eaf`；reviewer 無 Bash，未自行核對）；程式碼 HEAD `5d3c173`；pending 的 `GLOSSARY.md` 與 ADR-0008 已讀。依凍結 prompt，只看第 3 軸。除標「推論」者外，file:line 都是直接讀到。reviewer：`harness-reviewer`（2026-11-04）。由父代理人照 reviewer 交回的報告存檔。

---

## K-1 B5「也提供頁面本身的語系」與 `LocaleSwitcher` 既有的單一選項契約衝突，覆寫表沒列 — P1

- **位置**：traceability.md:267（B5）、:223、:356（H1）；spec.en.md:89-90、:153-154（AC-3）。
- **被違反的契約**：`LocaleSwitcher.vue:38-43`「The menu lists the locale the PAGE is not in」；`:45-55` `if (pageLocale.value === target) return`；`tests/unit/i18n/locale-switcher.test.ts:102-103`（`options.length` 必須是 1，且是另一個語系）；`:113-124`「the current-locale title is not interactive at all」。
- **證據**：B5 需要第二個選項或可點的 current-locale 標題，並拿掉 same-locale guard；覆寫表與 H1 都沒列。
- **影響**：spec.en.md:209-210 規定 stage 6 只接受表列改動，實作 B5 必然改到表外的測試與註解；ARIA 結構未定義。
- **信心**：高　**等級**：P1
- **建議**：覆寫表加一列，列出上述註解、guard 與兩個測試，並寫明 B5 狀態下選單結構（選項數、標題）。

## K-2 覆寫表漏列會被改到的既有測試，與「stage 6 只接受表列改動」互斥 — P1

- **位置**：spec.en.md:122-124、:209-210；traceability.md:215-217。
- **被違反的契約**：
  - `tests/unit/site/redirects-generated.test.ts:99-107`（「keeps the two parameterised rules unchanged and last」）、:51-61（`/zh/c/001`）、:92（regex 只認 `/c/` 與 `/zh/c/`）；表只點名 `redirects.test.ts`。
  - `tests/unit/components/MergedNav.test.ts:463-478`（`/c/001`、`/zh/c/001`）與 `tests/unit/challenge/shortLink.test.ts:19-20`（`/zh/c/042`）；表只寫「ShortLinkShare and ChallengeList tests」。
  - `tests/pre-commit-sh.test.ts:76-81` 的 `FIXTURE_RULES`（約 20 處 `toEqual`，例如 :172、:437、:1290）、`:856` 的 `RETIRED_DOOR_RULES`、`:1419-1424`；表只寫「count three rules for an untranslated challenge」。
  - `tests/unit/i18n/initial-locale-redirect.test.ts:117-132` 寫死 `shouldPersistOnColdLoad(path, base)` 兩參數簽章；表只點名 `theme-locale-wiring.test.ts`。
  - `tests/unit/site/redirects.test.ts:295-301`（只檢查 `/c/1` 與 `/zh/c/1` 沒出現）。
- **影響**：這些測試一改 stage 6 就該擋；不改測試又紅。
- **信心**：高　**等級**：P1
- **建議**：照檔案與行號補齊表；或規則改為「列出的契約連同 pin 住它們的測試」。

## K-3 spec 說產生器會拒絕孤兒說明頁，但既有 seam 是 hook 拒絕；AC-8 的 fixture 本身含孤兒 — P1

- **位置**：spec.en.md:117-118、:180-184（AC-8）、:206-208；traceability.md:348（G6）、:427-428。
- **被違反的契約**：`scripts/generate-redirects.ts:30-33`「Before calling it, the hook refuses an orphan brief」、`:113-115`；`scripts/pre-commit.sh:21-26`、:464-467；CI 由 `redirects.test.ts:350-367` 檢查真實 tree；`generateRedirects` 本身不拒絕。
- **證據**：Testing Decisions 與 Checks 寫「the hook and generator refuse it」；AC-8 用 AC-6 的 fixture（含孤兒）；Testing Decisions 又說孤兒「used at S1 and S4 only」，同段卻寫 S6 共用。
- **影響**：S6 要在含孤兒的 fixture 上產生規則，schema 沒定義；或產生器要新增拒絕，與「orphan-brief refusal is unchanged」矛盾。
- **信心**：中高　**等級**：P1
- **建議**：改正為「hook 拒絕、CI 測試在真實 tree 擋下」；寫明 AC-8 的 fixture 不含孤兒。

## K-4 Network 指南兩語都寫「切換語系一定會導覽、清空記錄」，H3 沒涵蓋 — P1

- **位置**：traceability.md:358（H3）、:264（B2）。
- **被違反的契約**：`platform/guide/network.md:52`「switching locale clears the whole log, because switching locale navigates to the other locale's URL and reloads the page」；`platform/zh-TW/guide/network.md:52`「切換語系等於導向另一語系的同一頁網址，整頁重新載入」。
- **證據**：B2 時切換器不導覽，記錄不清空；H3 已涵蓋同類句子，漏了 network.md。
- **信心**：高　**等級**：P1
- **建議**：H3 加上兩語的 `guide/network.md:52`。

## K-5 D9 改變 stage 8 的驗證表面，但沒有明文宣告覆寫 — P1

- **位置**：traceability.md:35（D9）、:49（S7）、:370（V1）；spec.en.md:189-192（AC-10）。
- **被違反的契約**：`docs/agents/workflow.md:160-161`「Here the surface is the preview deployment that Cloudflare Pages builds for the ticket branch」；AGENTS.md 管線表第 8 列 gate「behaviour verified on the ticket's preview deployment」；先例 0007 traceability:50 的 D9「Stage 8 explicitly overrides the rule…」與 OQ-017（`OPEN-QUESTIONS.md:647-654`）。
- **證據**：V1 跑在拋棄式分支的 preview，沒說覆寫 workflow.md 或 AGENTS.md，也沒更新 OQ-017；拋棄式分支是否遵守 hard rule 1 命名、會不會被 push（對外動作）、fixture commit 是否走 `/tw-emoji-commit`（hard rule 5）都沒寫；0007 Q33 兩件事都寫了。
- **信心**：中高　**等級**：P1
- **建議**：D9 加明文覆寫（引用 workflow.md:160 與 OQ-017），寫明分支命名、push 先經使用者確認、fixture commit 走 `/tw-emoji-commit`；H4 在 OQ-017 記一筆。

## K-6 B2「立刻顯示」與信任邊界 B5「這一行等 gate 決定」互斥，而 gate 不是 modal — P1

- **位置**：traceability.md:264（B2）；spec.en.md:136（B5）、:153（AC-3）。
- **被違反的契約**：`docs/adr/0006-…md:10-11`「the gate is not modal and the page behind it stays usable」，gate 未決定時 `MergedNav` 的切換器可操作。
- **證據**：gate 未決定時選了沒有對應頁的語系：B2 要立刻顯示，B5 要等 gate。L5 是否等 gate 也沒寫。
- **信心**：中　**等級**：P1
- **建議**：B5 範圍限定在「冷載入與 not-found 抵達的這一行」，或在 B2 寫明 gate 未決定時的行為。

## K-7 D11 以「router 渲染出的頁面」分類，但 S1 宣告的輸入裡沒有這一項 — P1

- **位置**：traceability.md:37（D11）、:43（S1）、:139-140、:281（C8）；spec.en.md:75-81、:82-83。
- **被違反的契約**：spec 自己的 S1 簽章；prior art `i18n/index.ts:182-183`「Pure: takes the location parts and the base」。
- **證據**：C8 要靠「router 渲染的是 NotFound」才分辨得出來；頁面抵達用 source path 查清單；兩者都不在 S1 的四個輸入裡。
- **影響**：AC-2／AC-4 預定以純函式測，照宣告簽章寫不出 C8。
- **信心**：中　**等級**：P1
- **建議**：S1 輸入加上「渲染結果：頁面的 relativePath，或 not-found」，或寫明分類在哪一層做。

## K-8 W2 的寫入發生在 `enhanceApp`，早於 router 渲染，與 D11 查詢規則衝突 — P2

- **位置**：spec.en.md:95-98；traceability.md:303（W2）、:37（D11）。
- **被違反的契約**：`.vitepress/theme/index.ts:225-237` 啟動時以 `window.location.pathname` 呼叫 `shouldPersistOnColdLoad`；`theme-locale-wiring.test.ts:153-161`「enhanceApp runs at app bootstrap, not on Layout mount」。
- **證據**：D11 要用渲染出的頁面查清單，但 `enhanceApp` 只能用 URL 文字；改到 Layout 寫入是改既有 seam，覆寫表沒列。推論：C8 的路徑以 URL 查會被當成已發布頁面而寫入。
- **信心**：中　**等級**：P2
- **建議**：寫明 W2 在哪一刻、用哪種查詢方式判定。

## K-9 F7 刻意讓同一題在清單與 nav 給出不同連結，違反元件註解的規則 — P2

- **位置**：traceability.md:334（F7）、:356（H1）。
- **被違反的契約**：`ShortLinkShare.vue:39-40`「so a challenge presents one spelling of its link wherever the reader meets it」；`shortLink.ts:17-18`「a challenge has one canonical link」。
- **信心**：高　**等級**：P2

## K-10 GLOSSARY 與 G23 說 `/c/NNN`「開的是主語系的那一頁」，在本 epic 內對預設學習者不成立 — P2

- **位置**：GLOSSARY.md:104（pending）；traceability.md:26（G23）、:361（H6）；對照 :32（D6）、:247（A1）。
- **證據**：無偏好或偏好 `zh-TW` 的學習者，題目有翻譯時會被 A1 帶到繁中頁；spec 只對 `/en/c/` 寫了這個例外。
- **信心**：中　**等級**：P2
- **建議**：措辭改為「導向主語系那一頁的網址」，或加「本 epic 內」的限定。

## K-11 Troubleshooting 寫「兩份清單各自編號」，與 E4 矛盾，H3 沒涵蓋 — P2

- **位置**：traceability.md:316（E4）、:358（H3）。
- **被違反的契約**：`platform/guide/troubleshooting.md:217` 與 zh-TW 版同行「The two lists number independently」；GLOSSARY.md:89 已記為舊義。
- **信心**：中　**等級**：P2

## K-12 0007 traceability 其他寫死 `/zh/c/` 的列沒列進覆寫表 — P2

- **位置**：traceability.md:215-217。
- **被違反的契約**：`.proj.specs/0007-gh-pages-range-fixes/traceability.md:93`（vocabulary 的 short link）、:150（連結形式表）、:166-167（X1、X2）、:338-339（L01、L02）。
- **信心**：高　**等級**：P2

## K-13 `redirects.test.ts` 把「繁中題目目錄是空的」當成失敗，與 G2「翻譯可有可無」衝突 — P2

- **位置**：traceability.md:20（G2）、:201。
- **被違反的契約**：`tests/unit/site/redirects.test.ts:305-312`（目標目錄必須存在）、:314-325（「every path it produces is a 404」→ 失敗）。
- **證據（推論）**：沒有任何繁中說明頁的靶場在 G2 下合法，C1 也讓 404 無害，但這兩個測試會讓 CI 失敗。既有邊界，但本 epic 把 G2 寫成規則並多了一條同目錄規則。
- **信心**：中低　**等級**：P2

## K-14 覆寫表引用的測試位置不準 — P2

- **位置**：traceability.md:219。
- **證據**：「Back updates stored locale to `en`」的斷言在 `tests/unit/i18n/route-locale-sync.test.ts:98-113`，不在 `theme-locale-wiring.test.ts`；且那個測試用的是測試檔自己的 watcher 副本（`theme-locale-wiring.test.ts:8-12` 明說無法因原始碼改變而變紅）。
- **信心**：高　**等級**：P2

## K-15 data loader 測試的說明與合併規則不一致 — P2

- **位置**：traceability.md:164-169。
- **被違反的契約**：`tests/unit/site/challenge-data-loaders.test.ts:5-7`（「Two content loaders, one per locale tree」）、:52-53（「`id` falls back to the position in the array」）。
- **信心**：中　**等級**：P2

## K-16 GLOSSARY 的語系詞條說切換按鈕「在語系之間移動」，B2 會讓它不移動 — P2

- **位置**：GLOSSARY.md:394；traceability.md:264（B2）。
- **信心**：低　**等級**：P2

## K-17 B5 只引用 ADR-0006，沒有寫出它的威脅模型 — P2

- **位置**：spec.en.md:136。
- **被違反的契約**：`docs/adr/0006-…md:35-36` 要求「states this threat model in its trust-boundary section」（gate 保護歸屬與報告的真實性，前一位學習者不是對手）；B5 的 Does not protect 只寫「Anything ADR-0006 already says」。
- **信心**：低　**等級**：P2

## K-18 H2 改寫繁中 README 時沒有禁用「主語系」，可能讓 glossary 測試失敗 — P2

- **位置**：traceability.md:357（H2）、:358；spec.en.md:186-188（AC-9 只限制「the Traditional Chinese pages」）。
- **被違反的契約**：`tests/unit/site/glossary.test.ts:333-342`（宣告為新造詞的詞不得出現在語料）；`README.md` 在語料範圍內（GLOSSARY.md:20）。
- **信心**：低　**等級**：P2

---

### 不屬於本軸的觀察（不計入統計）

- merge rules 的借用欄位沒有 category，範例卻帶 `"category": "web"`。屬完整性軸。
- `HomeContent.vue` 用 runtime 語系的 `$t`，最新題目卡片上的標記用哪個語系 spec 沒寫。屬完整性或可驗證性軸。
- `/zh-TW/c/001`（有翻譯）經 302 冷載入後 A5 寫入 `zh-TW`，未翻譯的不寫，與 US6 有張力；偏好 `en` 的人開未翻譯題目的 `/zh-TW/c/` 落在 A4，不顯示這一行。屬紅隊或完整性軸。

檢查範圍：GLOSSARY.md（含 pending）、AGENTS.md、ADR-0005～0008、`docs/agents/` 的 review、workflow、challenge-pipeline、language、runtime；OQ-016～018、023、024；0007 的 spec（B1–B5）、traceability（D9、H／L／X／V 列）、chain-analysis（N-4、N-5）；README 兩語；`config.mts`、`theme/index.ts`、`i18n/index.ts`、`style.css`、`LocaleSwitcher`、`MergedNav`、`ChallengeList`、`HomeContent`、`ShortLinkShare`、`ChallengeLayout`、`shortLink.ts`、兩個 data loader；`generate-redirects.ts`、`challenge-numbers.ts`、`pre-commit.sh`、`fork-init.ts`；guide 與 troubleshooting 兩語；測試 `tests/unit/i18n/*`、`redirects*.test.ts`、`challenge-data-loaders`、`glossary`、`sentence-map`、`messages-shape`、`pre-commit-sh`、`MergedNav`、`shortLink`、site-smoke。第 1 輪已裁決的 K-23、K-14 沒有重提。

統計：P0 0、P1 7（K-1～K-7）、P2 11（K-8～K-18）。

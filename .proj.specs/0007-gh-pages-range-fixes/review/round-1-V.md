# Stage 3 第 1 輪：軸 2 可驗證性（Verifiability）審查報告

**審查範圍**：epic 0007-gh-pages-range-fixes。`spec.en.md` 與 `traceability.md` 讀的是 working tree 版本，對應父代理人指定的 blob 89513637 與 33bb8564。程式碼讀的是 HEAD 7820bb8 的 working tree。

**範圍確認**：scope capture（`round1-scope.diff`）中，untracked 檔案只有 spec 目錄下的三個檔。tracked 的變更只有 `GLOSSARY.md` 與 `.proj.specs/OPEN-QUESTIONS.md`，與 frozen prompt 的描述一致，沒有缺少的範圍。

**實際讀過的檔案**：
- frozen prompt、spec、traceability
- `AGENTS.md`、`docs/agents/runtime.md`、`review.md`、`workflow.md`（stage 8）、`platform-notes.md`
- `ShortLinkShare.vue`、`ChallengeList.vue`、`MergedNav.vue`、`shortLink.ts`、`config.mts`（部分）
- `generate-redirects.ts`、`challenge-numbers.ts`、`create-challenge.ts`、`pre-commit.sh`、`challenge-lint-staged.ts`
- 測試與設定：`tests/pre-commit-sh.test.ts`、`redirects-generated.test.ts`、`config-base.test.ts`、三個元件測試、`playwright.site.config.ts`、`vitest.config.ts`
- `quality-gates.yml`、`deploy.yml.template`、`package.json`、i18n messages、README 與 skill 中相關段落、create-wxl 的 `CREATE_WXL_COMMIT`

---

## V-1：AC-8 要求在列表上「點一下就選取整段文字」，但列表的那一列本身是連結，點下去會換頁

- **位置**
  - spec.en.md:136（AC-8 第 4 點）、:67-69
  - traceability.md:197（S03）、:195（S01 的範圍包含兩個列表）
  - 程式碼：`.vitepress/theme/components/ChallengeList.vue:390-395`、`:437`；`ShortLinkShare.vue:72-80`
- **違反的要求**：每條 AC 必須能在指定的 seam（S3）上被觀察到，判定時不需要詮釋。
- **證據**
  - 直接讀到：列表檢視的每一列是 `<a :href="withBase(c.url)" class="ch-list-row">`，`ShortLinkShare` 放在這個 anchor 裡面。
  - 直接讀到：URL 文字只有 `select-all` class，沒有任何 click handler。元件註解寫的是「the text is left alone」。
  - 推論：在 Chromium 裡點 anchor 底下的文字，會觸發導覽。Playwright 在列表上 `click()` 這段文字後，頁面會跳到題目頁，「選取的是整段顯示文字」就沒有可觀察的狀態。
  - spec 只寫「stays click-to-select」，把它當成現有行為，沒有要求在文字上補 `preventDefault`。
- **影響**：S3 在兩個列表上的 S03 不是必然失敗，就是需要一個 spec 沒寫的標記變更。實作者和 reviewer 會對「要不要改標記」各自詮釋。
- **信心**：中。導覽行為是推論，未實測。
- **建議等級**：P1
- **建議**：二選一。
  - 明訂 URL 文字在 click 時 `preventDefault`（不 `stopPropagation`），並在 AC-8 補一句「點擊後 URL 不變」。
  - 或把 S03 的範圍限定在題目頁的 nav。

## V-2：「不加 base」（AC-3、AC-7 N04）在任何自動化 seam 上都觀察不到

- **位置**
  - spec.en.md:122（AC-3「no base is added」）、:131（AC-7「without the site base」）
  - traceability.md:170（L06）、:188（N04）、:257（V04）
  - 測試：`tests/unit/components/ChallengeList.test.ts:16`、`tests/unit/components/MergedNav.test.ts:16,35`
  - `tests/unit/components/ShortLinkShare.test.ts`（整份檔案沒有 mock vitepress）
- **違反的要求**：判定標準必須能在指定的 seam 上觀察到。
- **證據**（直接讀到）
  - `ChallengeList.test.ts` 的 `withBase` 是 identity。
  - `MergedNav.test.ts` 的 `mockBase` 預設是 `''`。
  - `ShortLinkShare.test.ts` 完全沒有 mock vitepress，base 就是 `/`。
  - CI 建置時沒有 `SITE_BASE`（`quality-gates.yml` 的 `docs:build`），所以 S3 的 base 也是 `/`。
- **推論**：在 base 是 `/` 的環境下，就算實作錯誤地呼叫 `withBase`，複製出的 URL 仍然等於 X4。S2 和 S3 都會照樣通過。
- **唯一能抓到的地方**：只有 V04 的 GitHub Pages 專案站（例如 `/repo/repo/...` 會 404）。但 AC-21 沒有要求那個暫時 repo 必須是專案站，如果它是 `<owner>.github.io` 使用者站，base 也是 `/`。
- **影響**：AC-3 與 N04 的關鍵條件可能沒有任何一處真的被驗證。
- **信心**：高
- **建議等級**：P1
- **建議**
  - S2 的 X4 與 N04 案例要在非 `/` 的 base 下執行（例如把 `withBase` double 成加上 `/my-range/`）。
  - AC-21 明訂暫時 repo 是專案站（repo 名不是 `<owner>.github.io`）。

## V-3：「validator 不會執行」（AC-13、AC-16）在 S5 的輸出中觀察不到，而且 traceability 的支撐論述與程式碼不符

- **位置**
  - spec.en.md:152（AC-13「The validator does not run」）、:160（AC-16「runs no validation」）
  - traceability.md:36（S5 的 observable output）、:304（checks 表的 H14 列）
  - 程式碼：`scripts/challenge-lint-staged.ts:36-60`、`:128-130`
- **違反的要求**：判定標準必須能在 seam 上觀察到。另外，checks 表的證據必須正確。
- **證據**
  - 直接讀到：`deriveSlugs` 用 `indexOf('platform/challenge/')` 找路徑。`platform/zh-TW/challenge/x/index.md` 不包含這個字串，所以得到零個 slug。
  - 直接讀到：零個 slug 時 `process.exit(0)`，而且不輸出任何東西。
  - 結論：
    - 不論 validator 是沒執行、收到空清單，還是收到繁中路徑，exit status 與 stderr 都完全相同。
    - S5 列出的輸出（exit、stderr、`_redirects`、檔案 bytes、stash、status）都分不出這三種情況。
  - traceability.md:304 說「passing it Traditional Chinese paths would refuse valid commits」，依上面讀到的程式碼，這句是錯的。
- **影響**
  - 這兩個子句無法判定通過或失敗。
  - checks 表把 H14 的防護建立在一個不成立的前提上，之後可能誤導實作與審查。
- **信心**：高
- **建議等級**：P1
- **建議**
  - 在 S5 允許注入 validator 的 spy／marker，例如在 fixture 裡用包一層的 `challenge-lint-staged.ts` 記錄呼叫參數；或在 S5 輸出加上「validator 收到的引數」。
  - 修正 :304 的論述。

## V-4：AC-20 的「Browser panel」在本 repo 是題目頁內的 iframe，無法顯示列表與 nav

- **位置**
  - spec.en.md:166（AC-20 第 2 點）
  - traceability.md:23（Q33）、:38（S7）、:255（V02）
  - 文件：`docs/agents/platform-notes.md:5-10`、`docs/agents/workflow.md:140-153`、`AGENTS.md`（hard rule 4）
- **違反的要求**：每條 stage 8 判定標準必須指名一個實際能操作的 surface。
- **證據**
  - 直接讀到：platform-notes 寫「A challenge page's Browser panel is a `srcdoc` iframe without `allow-same-origin`」。
  - 直接讀到：workflow 對瀏覽器可及的 surface 用的是 `/agent-browser` 或原生瀏覽器工具。
  - 推論：題目的 Browser panel 只顯示題目 app，不能載入 `pnpm docs:preview` 的列表頁或題目頁 nav。spec 寫的「served by `pnpm docs:preview` in the Browser panel」照字面無法操作。比較可能的本意是 agent-browser，或宿主工具的瀏覽器面板。
- **影響**：stage 8 執行者必須自行詮釋要用哪個 surface，回報時也無法依 hard rule 4 清楚標示覆蓋的 surface。
- **信心**：中。stage 1 研究筆記不在可讀範圍，無法確認原意。
- **建議等級**：P1
- **建議**：改成「以 `/agent-browser`（或等價的原生瀏覽器工具）開啟 `pnpm docs:preview`」。如果原意是 Claude／Codex 宿主內建的瀏覽器面板，要換一個名稱，避免與 GLOSSARY／平台的 Browser panel 撞名。

## V-5：AC-20 在 Cloudflare preview 上複製的短連結指向 production，「能開啟」驗證的是另一個 surface

- **位置**
  - spec.en.md:165（AC-20 第 1 點）
  - traceability.md:254（V01）
  - 程式碼：`.vitepress/challenge/shortLink.ts:26`（`SITE_ORIGIN = 'https://wxl.browserlab.online'`）
- **違反的要求**：hard rule 4（要在實際執行該行為的 surface 上驗證）；stage 8 判定標準必須落在它指名的 surface。
- **證據**
  - 直接讀到：短連結是 `SITE_ORIGIN` 加 `/c/NNN`，origin 是常數。
  - 推論：在 ticket 分支的 preview 上複製得到的是 `https://wxl.browserlab.online/c/001`，打開後由 production 的 `_redirects`（main 分支）解析，不是 preview 的 `_redirects`。
- **影響**：「a copied short link opens its challenge」不論 ticket 的 `_redirects`（例如新的標頭）是否正確都會通過，對 preview 不具判別力。只有「顯示與複製出短連結」這一半真的落在 preview 上。
- **信心**：高（事實部分）。影響程度屬中低，因為本 epic 沒有改動題目規則。
- **建議等級**：P1（使用者可以決定降為 P2）
- **建議**：把「開啟」改成在 preview 的 host 上請求同一個 path（`<preview>/c/001`），或明訂這一步驗證的是 production，不是 preview。

## V-6：AC-8 的截斷條件可能整條都沒被觸發就通過，而且只檢查 computed style 不能保證省略號真的出現

- **位置**
  - spec.en.md:134-135、:188-189（Testing Decisions 寫「The longest demo URL overflows at 375 wide」）
  - traceability.md:196（S02）
- **違反的要求**：判定標準必須能判出失敗。條件句不能讓應被測的路徑完全空轉。
- **證據**
  - AC 只寫「Where a URL text overflows…」，沒有任何一條 AC 要求在 375×812 時至少有一個 URL 文字 `scrollWidth > clientWidth`。「會溢出」只是 Testing Decisions 裡的一句陳述。
  - smoke 也會在各靶場自己的 CI 上跑，而 origin 較短（例如 `https://t.github.io`）時可能不會溢出。
  - 推論：如果 URL 文字維持 inline 元素，它的 `clientWidth` 是 0，`scrollWidth > clientWidth` 永遠不成立；同時 `text-overflow` 對 inline 元素沒有效果。三個 computed style 全部「正確」，但畫面上沒有省略號，AC-8 仍然通過。
- **影響**：截斷與 hover 的需求（Q11、D2）可能在 S3 完全沒有被驗證。
- **信心**：中
- **建議等級**：P2
- **建議**
  - 在上游 origin 下，加一條「在 375×812 時，至少 zh-TW `selected-excerpts` 的 nav URL 文字 `scrollWidth > clientWidth`」。
  - 或要求 computed `display` 不是 `inline`。

## V-7：「document never scrolls sideways」沒有說明在哪個狀態量測

- **位置**
  - spec.en.md:133（AC-8 第 1 點）
  - traceability.md:195（S01）
  - 程式碼：`.vitepress/theme/i18n/messages/en.json:61`；`ShortLinkShare.vue:96-101`；`MergedNav.vue:236`
- **違反的要求**：判定標準不需要詮釋。
- **證據**
  - AC 用的是全稱的「never」，S01 卻只是量一次 `scrollWidth`。
  - 直接讀到：`copy_failed` 字串很長（「Copy failed — select the link shown here and copy it yourself」），status span 沒有截斷，就放在 URL 旁邊。nav 第 2 列的高度固定為 32px。
  - 推論：375 寬時，複製成功或失敗後這一列的寬度可能改變。
- **影響**：只在載入後量測可以通過，但顯示 status 之後可能水平溢出。兩種讀法會得到不同結論。
- **信心**：中
- **建議等級**：P2
- **建議**：S01 明訂三個狀態：靜止、`short_link.copied` 顯示中、`short_link.copy_failed` 顯示中。或明訂只量靜止狀態。

## V-8：「index 與 hook 執行前相同」在 S5 沒有對應的觀察輸出

- **位置**
  - spec.en.md:152（AC-13）、:157（AC-15）
  - traceability.md:36（S5 outputs）
- **違反的要求**：判定標準必須能在 seam 上觀察到。
- **證據**
  - S5 的輸出只列出 `git show :platform/public/_redirects` 與 `git status --porcelain`。
  - 推論：porcelain 只顯示路徑與狀態碼（例如 `M `）。另一個已 staged 的檔案如果內容被換掉、狀態碼不變，porcelain 看不出差別。
- **影響**：「index 不變」只能判到 `_redirects` 和路徑層級，不是完整的 index 內容。
- **信心**：中
- **建議等級**：P2
- **建議**：S5 輸出加上 `git ls-files --stage`（或 `git write-tree`）的前後比對。

## V-9：「nothing outside `platform/` is written」照字面永遠不成立

- **位置**
  - spec.en.md:156（AC-14 第 3 點）、:111（B2「It never writes outside `platform/`」）
  - traceability.md:148
- **違反的要求**：判定標準不需要詮釋。
- **證據**
  - 推論：hook 本身會 `git add`（寫 `.git/index`），stash 會寫 `.git/refs` 與 objects，這些都在 `platform/` 之外。
  - 判定者必須自行把句子限縮成「working tree 中 `platform/` 以外的檔案」才判得了。
- **影響**：照字面判是必然失敗，限縮後判又是自行詮釋。
- **信心**：高
- **建議等級**：P2
- **建議**：改寫成「working tree 中 `platform/` 以外的檔案 byte 相同，而且沒有新增檔案（`git status --untracked-files=all` 沒有新項目）」，並把 `.git/` 排除在外。

## V-10：AC-17「still meets the guard in CI」語意兩可，而且沒有任何 seam 實際操作 H16

- **位置**
  - spec.en.md:161
  - traceability.md:230（H16）、:280（AC-17 的 seam）
- **違反的要求**：判定標準不需要詮釋；必須能在 seam 上觀察到。
- **證據**
  - 「meets the guard」可以讀成「通過 guard」，也可以讀成「遇到 guard 並被它抓到」。H16 的期望是「the guard test in CI reports a stale `_redirects`」，與第一種讀法相反。
  - AC-17 的 seam 是「stage 6 review of the diff; the guard test in CI」，但沒有任何步驟真的做一次 `--no-verify` 的過期 commit 送進 CI。
- **影響**：這一條實際上只是推論性陳述，無法判定。
- **信心**：中
- **建議等級**：P2
- **建議**
  - 改寫成「A commit made with `--no-verify` that leaves `_redirects` stale fails the guard test」。
  - 指定可操作的 seam，例如在 S5 的暫時 repo 中用 `--no-verify` commit 後跑 guard 的邏輯；或明示它只靠 guard 既有的斷言推得，不另外驗證。

## V-11：N04「`SITE_ORIGIN` + 該列自己的 path」和 link forms 的結尾斜線可能不一致

- **位置**
  - spec.en.md:131
  - traceability.md:188（N04）、:90-91（link forms 會加上 `/`）
  - 測試：`tests/unit/components/ChallengeList.test.ts:51-53`（fixture 的 `url: '/challenge/sqli-demo'` 沒有結尾斜線）
  - 程式碼：`ChallengeList.vue:98-107`（註解說明 URL 有時有斜線、有時沒有）
- **違反的要求**：判定標準不需要詮釋。
- **證據**（直接讀到）：對同一個 fixture，「`SITE_ORIGIN` + row 的 path」得到 `…/challenge/sqli-demo`，link form 得到 `…/challenge/sqli-demo/`。兩種讀法的期望字串不同。
- **影響**：測試作者必須自己選一種讀法。
- **信心**：中
- **建議等級**：P2
- **建議**：N04 改成「等於 link form 的 page URL，其中 s 取自該列 path 的最後一段」。或要求 fixture 使用建置時的形式（帶結尾斜線）。

## V-12：nav 的 slug 從哪裡來沒有指定，S2 照「existing tests」的方式掛載拿不到 slug

- **位置**
  - spec.en.md:72-73、:131
  - traceability.md:33（S2：「mounted as their existing tests mount them」）、:187（N03）
  - 程式碼：`MergedNav.vue:10-37`、`ChallengeLayout.vue:835`
  - 測試：`MergedNav.test.ts:20-36`（`useData` mock 沒有 `page`）
- **違反的要求**：必須能在 seam 上觀察到。
- **證據**
  - 直接讀到：nav 的 number 是 `ChallengeLayout` 傳進來的 prop；spec 沒有決定 slug 是新增 prop，還是從 `useData().page` 取得。
  - 推論：
    - 如果走 prop，「challenge 的 slug 正確」取決於 `ChallengeLayout`，而它不在任何 S2 seam 內（只剩 S3 的 N04 能間接涵蓋）。
    - 如果走 `useData`，現有的 mock 必須擴充。這兩條路都不是「照現有方式掛載」。
- **影響**：N03 的判定方式取決於實作者的選擇。
- **信心**：中
- **建議等級**：P2
- **建議**：決定 slug 的來源，並在 S2 的進入點寫明 mock 或 prop 怎麼提供。如果走 prop，把 `ChallengeLayout` 的傳遞納入 S2 或 S3 的明確案例。

## V-13：AC-8 與 AC-9 沒有指定題目頁的語系，AC-9 也沒有指定頁面

- **位置**
  - spec.en.md:132、:137
  - traceability.md:195（「the challenge page for `selected-excerpts`」）、:198-199
  - 設定：`playwright.site.config.ts:36-42`（locale 固定為 `en`）
- **違反的要求**：判定標準不需要詮釋。
- **證據**
  - 列表有指定 en 與 zh-TW，題目頁卻只寫 slug。最長的 URL 是 zh-TW 那一條（`/zh-TW/challenge/selected-excerpts/`），而 smoke 預設是英文。
  - AC-9 沒有寫要在哪些頁面、哪個 viewport 比對 SSR 與 hydration，也沒有寫要點哪一個複製按鈕。
- **影響**：只測英文題目頁也算「通過」，但最可能溢出的情況就沒被涵蓋。
- **信心**：中
- **建議等級**：P2
- **建議**：S01 的題目頁改成「en 與 zh-TW 的 `selected-excerpts`」。AC-9 寫明沿用 S01 的頁面集合。

## V-14：AC-12「application-only change: the bytes are unchanged」少了比較基準；H15 沿用今天的 fixture 會缺 `platform/public/`

- **位置**
  - spec.en.md:148、:158
  - traceability.md:219（H05）、:229（H15）
  - 測試：`tests/pre-commit-sh.test.ts:38-97`
- **違反的要求**：判定標準不需要詮釋。
- **證據**
  - 「unchanged」是相對於 HEAD 的 `_redirects`，但只有在 fixture commit 進去的 `_redirects` 本來就等於期望值時才成立，spec 沒有寫。
  - 直接讀到：今天的 fixture 沒有 `platform/public/` 目錄。推論：`writeRedirects` 是直接 `writeFileSync`，目錄不存在會丟 ENOENT。
  - 結果：「today's cases give the status they assert today」能不能成立，取決於 fixture 可不可以改，spec 只說 S5「replaces the setup」。
- **影響**：判定者必須自己補前提。
- **信心**：中偏低
- **建議等級**：P2
- **建議**
  - H05 寫明「相對於 HEAD 中、已與 fixture 一致的 `_redirects`」。
  - H15 寫明 fixture 包含 `platform/public/` 以及一致的 `_redirects`；或另立一列處理目錄不存在的情況。

## V-15：AC-21 有幾個判定點太粗或缺少前提

- **位置**
  - spec.en.md:169-173
  - traceability.md:257-258
- **違反的要求**：判定標準不需要詮釋。
- **證據**
  - 「the range's CI passes」是整份 CI 一起判，任何與本 epic 無關的 job 失敗都會讓這條判成失敗，或被當成「無關」而自行排除。
  - 「committing」沒有寫要先 `git add` 新題目；AC-20 第 3 點有寫。
  - 「A URL copied from the live site」沒有寫要從列表還是 nav 複製、要幾條。
  - commit override 機制（`CREATE_WXL_COMMIT`）只出現在 V04，AC 裡沒有。
  - 暫時 repo 是專案站還是使用者站沒有指定（與 V-2 相關）。
- **影響**：stage 8 的結論需要執行者自行界定。
- **信心**：中偏低
- **建議等級**：P2
- **建議**：以 guard test 那個 step 的結果作為主要判定依據；補上 `git add`；指定「列表與 nav 各一條，en 與 zh-TW 各一」；寫入 `CREATE_WXL_COMMIT` 和 repo 類型。

## V-16：AC-5、AC-6、AC-10 中的開放式字眼

- **位置**
  - spec.en.md:124（AC-5「A numeric string such as `"7"`」）、:127（AC-6「keeps it」）、:138（AC-10「Stdout names the file」）
- **違反的要求**：判定標準不需要詮釋。
- **證據**
  - 「such as」沒有封閉範圍。依 `ShortLinkShare.vue:36-39`，轉換用的是 `Number()`，所以 `" 7"`、`"0x10"`、`"1e1"` 也都會顯示，spec 有沒有要涵蓋這些不明。
  - 「keeps it」沒有說要保持多久（是到下次點擊，還是超過 2000 ms 後仍在）。
  - 「names the file」沒有說是相對路徑還是絕對路徑。`writeRedirects` 回傳的是絕對路徑，`stdout` 包含 `platform/public/_redirects` 這個子字串時，算不算數需要詮釋。
- **影響**：輕微的判定差異。
- **信心**：低
- **建議等級**：P2
- **建議**：AC-5 改成「以 `Number()` 轉換的字串，與今天相同」，並列出 `"7"`。AC-6 寫「推進計時器超過 2000 ms 後仍顯示」。AC-10 寫「stdout 含有 `platform/public/_redirects`」。

## V-17：Testing Decisions 中關於測試環境的陳述與 repo 現況不符，S2 的模式切換機制沒有指定

- **位置**
  - spec.en.md:65-66（「reads the mode in a way a test can replace without rebuilding」）、:182-185
  - traceability.md:33
  - 設定：`vitest.config.ts:29-51`
- **違反的要求**：seam 的進入點必須可操作，證據必須正確。
- **證據**
  - 直接讀到：vitest 用的是 `happy-dom`，不是 spec 寫的 jsdom。
  - 直接讀到：vitest 設定沒有載入 `.vitepress/config.mts` 的 `define`。
  - 推論：在測試環境裡 `__WXL_SHORT_LINKS__` 根本不存在，與 `CF_PAGES` 有沒有設定無關；直接引用這個識別字會 ReferenceError。所以「would otherwise run in page mode」不是保證，取決於實作有沒有做 `typeof` 防護。
  - 「a way a test can replace」也沒有指定機制（module mock、provide/inject、prop 等）。
- **影響**：S2 的測試要等實作選定機制才寫得出來；未設定模式時的預設行為無法判定。
- **信心**：中
- **建議等級**：P2
- **建議**：修正為 happy-dom。明訂未定義時視為 page mode（以 `typeof` 防護），以及測試切換模式的機制。

## V-18：match rule 的措辭不夠封閉

- **位置**：traceability.md:129-132
- **違反的要求**：判定標準不需要詮釋。
- **證據**
  - 「strip leading `#`, `>` and whitespace」沒有說明，像 `> # ` 這種混合前綴是要反覆剝除，還是只剝一次。
  - 「comment markers … do not matter」說得太滿：規則只處理 `#`，`<!-- -->`、`//` 都不處理。
- **影響**：S6 的實作可能出現兩種寫法，邊界上的判定不同。
- **信心**：中
- **建議等級**：P2
- **建議**：改成「移除每行開頭由 `#`、`>`、空白組成的最長前綴」，並刪掉或限縮「comment markers」那句。

## V-19：「rewritten around those sentences」「Statements that remain true stay」沒有對應的 AC，已經不正確的舊敘述不會被抓到

- **位置**
  - spec.en.md:93-98
  - AC-18、AC-19（spec.en.md:162-163）只檢查句子存在
  - 現有文字：`.claude/skills/wxl-fork-init/SKILL.md:97`、`.agents/skills/wxl-fork-init/SKILL.md:97`（「否則複製出去的短連結會指向原本的網站」）
- **違反的要求**：每條規範內容都要有驗收出口；「仍然為真」需要詮釋。
- **證據**（推論）：本 epic 之後，GitHub Pages 靶場複製出去的是頁面網址，不是短連結，第 97 行這句會部分過時。但 S6 只檢查 E1、Z1、E2、Z2 是否存在，舊句留著也照樣通過。
- **影響**：文件可能同時存在新句與互相矛盾的舊句，而 gate 是綠的。
- **信心**：中
- **建議等級**：P2
- **建議**：列出要刪除或改寫的具體段落（例如 README.md:217、README.en.md:220、兩份 fork-init SKILL.md 的第 97 行）作為 stage 6 檢查項目，或在 S6 加上禁用片語的負向檢查。

---

## 我檢查過、沒有發現問題的部分

- **AC-1（M01–M04）**：S1 的 public fields 可以觀察，取值 `"true"`／`"false"` 有封閉定義。
- **AC-2、AC-4**：與 X1–X5 對得上，可以判定。
- **AC-10、AC-11 其餘子句**：status、bytes、scaffold 是否保留，都能在 S4 觀察到。
- **AC-12 其餘子句、AC-14 的 byte／untracked／stash 子句、AC-15 的 exit status 與 generator 訊息**：H13 的 `number-locales` 訊息確實由 `checkChallengeNumbers` 產生。
- **AC-18、AC-19 的檔案清單與 sentence map**：8 列中英文 5 列、繁中 3 列，與 T01–T03 一致。
- **AC-20 第 3、4 點**：可以操作。
- **AC-21 的 Run workflow**：`deploy.yml.template` 有 `workflow_dispatch`。
- **創建流程**：create-wxl 有 `CREATE_WXL_COMMIT` override，而且由 create-wxl 執行 `git init`，`pnpm install` 是之後才跑，所以 hook 可以裝上。
- **用語檢查**：所有 AC 中都沒有出現「appropriately」「reasonably」「as needed」「where possible」這一類字眼，因此沒有依這個規則判定的 P0。

**統計**：P0 0 項、P1 5 項（V-1 到 V-5）、P2 14 項（V-6 到 V-19）。

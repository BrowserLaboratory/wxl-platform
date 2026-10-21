# Stage 3 第 2 輪：軸 2 可驗證性（V）審查報告

**審查範圍**
- 審查對象：working tree 的 `/Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0007-gh-pages-range-fixes/spec.en.md`（父代理指定 blob 4485a999）與 `traceability.md`（blob 5629e8c0）。
- 程式碼：HEAD 7820bb8。
- frozen prompt：照 `review/prompt.md` 原文執行。

**範圍確認**
- `round2-scope.diff` 的 untracked 項目只有 spec 目錄（含 review/ 紀錄）。tracked 變更只有 `GLOSSARY.md` 與 `OPEN-QUESTIONS.md`（OQ-016、OQ-020、新增 OQ-023）。
- 與 prompt 的描述一致，沒有缺少的範圍。
- 我沒辦法執行 git。下面凡是關於 git 內部行為的主張，都是依 git 原始碼的知識推論，並在各項標明。

**實際讀過的檔案**
- spec 相關：spec、traceability、round-1-V、disposition、AGENTS/runtime/review/workflow（stage 8）
- 元件與 layout：`ShortLinkShare.vue`、`ChallengeList.vue`、`MergedNav.vue`（部分）、`ChallengeLayout.vue`（部分）
- 共用程式：`shortLink.ts`、`i18n/index.ts`（redirect）
- scripts：`pre-commit.sh`、`create-challenge.ts`、`challenge-numbers.ts`、`generate-redirects.ts`、`challenge-lint-staged.ts`、`challenge-analyze.ts`（部分）
- 測試：`tests/pre-commit-sh.test.ts`、`config-base.test.ts`、`MergedNav.test.ts`（部分）、`upstream-guard.test.ts`（決策部分）
- 設定與文件：`playwright.site.config.ts`（locale 部分）、`quality-gates.yml`、`package.json`、`.gitignore`、`.claude/skills/wxl-create/SKILL.md` Step 2

---

## V-1：commit forms 的「repository's own index」沒有可操作的定義，而 `-a`、`-p` 跑 hook 時用的本來就不是 `.git/index`

- **位置**
  - traceability.md:214-217（Commit forms）、:336（H31）、:338（H33）
  - spec.en.md:116-117、:215-220（AC-22）
- **違反的要求**：判定標準不需要詮釋。H31 與 H33 必須能用同一條規則同時判出。
- **證據（推論，依 git `builtin/commit.c` 的 `prepare_index`，未實測）**
  - 一般 `git commit` 與不帶路徑的 `--amend`：index 先寫回，hook 拿到的 `GIT_INDEX_FILE` 是 `.git/index`。
  - `git commit -a` 與 `-p`：git 鎖住 index，hook 執行時 `GIT_INDEX_FILE` 指向 `.git/index.lock`。
  - `git commit -- <path>`：指向暫時的 `.git/next-index-*.lock`。
  - 換句話說，`-a`、`-p` 與 pathspec commit 一樣，都是「另一個 index 檔」。spec 卻要求前者照 O1–O6 處理，後者拒絕，沒有說要拿什麼來判斷。
- **影響**
  - 最直覺的實作是比對 `GIT_INDEX_FILE` 與 `git rev-parse --git-path index`，這樣會把 `-a` 也拒絕掉，H31 失敗。
  - 實作者必須自己決定 `index.lock` 算不算「自己的 index」，H31 與 H33 的判定結果取決於這個詮釋。
- **信心**：中（git 內部行為是推論）
- **建議等級**：P1
- **建議**：在 commit forms 規則裡寫出判斷式。例如：`GIT_INDEX_FILE` 未設定、等於 `.git/index`，或等於 `.git/index.lock`，都視為自己的 index；其餘拒絕。並在 S5 為 `-p` 補一列。

## V-2：L19／AC-1 的「no property on `window` changes it」是沒有邊界的全稱句，而且在指定的 seam（S2，vitest）上照字面無法成立

- **位置**
  - traceability.md:254（L19）、:68（vocabulary「link mode」）
  - spec.en.md:71-77、:152（AC-1「only the build-time constant selects the mode」）
- **違反的要求**：判定標準要能在指定的 seam 上判出通過或失敗。
- **證據（推論）**
  - spec 要求 vitest 底下常數「undefined」，模組把它當成 page mode。
  - 在 vitest 裡，`__WXL_SHORT_LINKS__` 沒有被 define，是一個自由的全域識別字，查找時會落到 `globalThis`（happy-dom 底下就是 `window`）。
  - 所以測試只要設定 `window.__WXL_SHORT_LINKS__ = true`，任何直接引用這個常數的實作（含 `typeof` 防護）都會切成 short mode，L19 就失敗。
  - 在建置後的 bundle 裡，define 做的是文字替換，`window` 完全無關。也就是說，這條保證只在正式環境成立，偏偏在它被指定的 S2 上不成立。
  - 如果測試改設別的屬性名，又會變成空轉的通過。spec 沒有指名要試哪個屬性。
- **影響**：L19 不是必然失敗，就是空轉，取決於測試作者選哪個屬性。
- **信心**：中
- **建議等級**：P1
- **建議**
  - 把「no property on `window`」限縮成「建置產物中，模式只來自 define 替換」，改在 S3 驗。例如在 page mode 建置後，於頁面設 `window.__WXL_SHORT_LINKS__=true` 再 hydrate，顯示仍是 page URL。
  - S2 只保留「常數未定義時為 page mode」。

## V-3：H26 的設定（事先放好 `.git/index.lock`）到不了 O5，hook 在 stash 之前就會失敗

- **位置**
  - traceability.md:331（H26）、:211（O5：「after the hook has stashed」）
  - spec.en.md:222（AC-23）
  - 程式碼：`scripts/pre-commit.sh:22-30`
- **違反的要求**：判定標準必須能在 seam 上被觀察到。
- **證據（推論）**
  - 如果直接用 `bash` 執行：`git stash push` 一開始就要鎖 index。`.git/index.lock` 已經存在時，它會先失敗，接著 `set -e` 讓 hook 直接結束。這時 hook 還沒 stash，不符合 O5 的前提，也不在 O1–O6 任何一列。spec.en.md:113 卻寫「Outcomes O1–O6 cover every way a run ends」。
  - 如果透過 `git commit`：git 自己就鎖不到 index，hook 根本不會執行。
- **影響**：H26 要嘛跑不到 `git add`，要嘛結果落在 outcome 表之外。測試作者必須自己發明一個在執行中途注入失敗的方法（例如讓產生器的替身建立 lock 檔）。
- **信心**：中
- **建議等級**：P1
- **建議**
  - H26 改成「產生器跑完之後、`git add` 之前，由 fixture 的產生器替身建立 `.git/index.lock`」，並在 S5 的進入點允許替換產生器。
  - outcome 表補上「stash 之前 git 指令就失敗」這種情況的期望。

## V-4：stage 8 的 create-then-commit（V03、V05）照預設參數做，commit 會被既有的 validator 擋下，與本 epic 無關

- **位置**
  - spec.en.md:208（AC-20 第 3 點）、:212（AC-21 第 2 點）
  - traceability.md:371（V03）、:373（V05）
  - 程式碼：
    - `scripts/create-challenge.ts:95`（預設 backend 是 flask）、`:171`（`app.run(host='0.0.0.0', port=8000)`）
    - `scripts/challenge-analyze.ts:52-56`（`LOCALHOST_PATTERNS` 含 `/0\.0\.0\.0/`）、`:259-273`
    - `scripts/challenge-lint-staged.ts:111-116`（analyzer 只要有 warning 就 `hasErrors`）
- **違反的要求**：stage 8 的判定標準必須落在一個實際能操作、而且能判別本 epic 行為的 surface 上。
- **證據**
  - 直接讀到：預設的 flask 骨架含 `0.0.0.0`。analyzer 會產生「Hardcoded localhost reference in app.py」，lint-staged 因此 exit 1。
  - 推論：`pnpm create:challenge --name x`、`git add`、`git commit` 會落在 O3，不會產生 spec 期望的 commit。FastAPI 與 PHP 骨架沒有這個字串。wxl-create 的 Step 3 會改寫骨架，所以走 skill 的老師不會遇到。
- **影響**
  - V03／V05 可能因為本 epic 以外的原因失敗。
  - 執行者也可能自行換 backend 或先改骨架，各自詮釋「teacher's original scenario」。
- **信心**：中（讀程式碼推得，未實際執行。keygen 是否會改 `app.py` 我沒有確認）
- **建議等級**：P1
- **建議**：V03、V05 寫明 backend（例如 `--backend php`），或明訂先依 wxl-create Step 3 改寫骨架再 commit。

## V-5：H24 的期望是「O2 或 O4」，與 AC-12 的前提「ends in O2」矛盾，而且漏掉 O3

- **位置**
  - traceability.md:329（H24：「triggered: O2 or O4, by the generator's result」）
  - spec.en.md:181、:192（AC-12 前提與最後一點）
  - traceability.md:201（validator 的輸入）
  - `scripts/pre-commit.sh:13`（`--diff-filter=ACMRD`，不含 T）
- **違反的要求**：判定標準不需要詮釋。
- **證據**
  - AC-12 開頭寫「ends in O2 and stages the expected `_redirects` in each of these cases」，H24 卻允許 O4。
  - 結果取決於 symlink 指向哪裡，fixture 沒有指定。
  - spec 也沒說型別變更的路徑會不會交給 validator（今天的過濾條件不含 T）。如果會，O3 也可能出現。
- **影響**：H24 的 O4 結果在 AC-12 底下算失敗，在 H24 底下算通過。
- **信心**：高
- **建議等級**：P1
- **建議**
  - 指定 symlink 的目標，例如指向同目錄內一個有效的 md 檔，期望 O2。
  - 寫明 validator 是否收到 T 路徑。
  - 或把 H24 移出 AC-12，另立「不是 O1」的判定。

## V-6：H25「SIGINT while the generator runs」沒有指定訊號送到哪裡、怎麼確定「正在產生」

- **位置**：traceability.md:330（H25）、:48（S5 進入點）；spec.en.md:222
- **違反的要求**：判定標準必須能在 seam 上重現。
- **證據（推論）**
  - 訊號送給 bash 本身，或送給整個 process group（Ctrl-C 的行為），bash 的反應不同。只送給 bash 時，它會等前景的子行程結束後才處理 trap。
  - 時間點也沒有同步機制。S5 只寫「copies of the scripts the hook calls」，沒有允許用替身讓產生器停住。
- **影響**：測試可能不穩定，或實際上量到的是產生前、產生後的中斷。O5 是寬鬆的析取，所以多半會「通過」，但不能判別實作。
- **信心**：中
- **建議等級**：P2
- **建議**：S5 允許用產生器替身寫一個 marker 後阻塞；寫明對 process group 送 SIGINT；另補 SIGTERM 一列（O5 有列 SIGTERM，但沒有對應的 H 列）。

## V-7：H27／H28（沒有 HEAD）與「每一列都從 S5 的 fixture 開始」互相矛盾

- **位置**
  - traceability.md:299-302、:332-335（H27–H30）、:48
  - spec.en.md:224（AC-23「In every hook case, the stash entry made before the run is still listed」）
- **違反的要求**：判定標準不需要詮釋。
- **證據**
  - fixture 有一個已 commit、與樹一致的 `_redirects`，以及一個執行前就存在的 stash entry。沒有 HEAD 的 repo 不可能有已 commit 的檔案。
  - 一般的 `git stash` 也需要先有初始 commit（推論；用 `git stash store` 手工造一筆或許可行）。
- **影響**：照字面，AC-23 的「every hook case」在 H27／H28 上無法成立。
- **信心**：高（矛盾的部分）
- **建議等級**：P2
- **建議**：H27、H28 註明不用 fixture 的已 commit 檔案與 stash entry，H29 不適用於這兩列。

## V-8：H18（`_redirects` 不在 index、也不在工作樹）的結果，取決於 fixture 的 `platform/public/` 還有沒有別的檔案

- **位置**
  - traceability.md:323（H18）、:48（fixture）
  - 程式碼：`scripts/generate-redirects.ts:155-156`（`writeFileSync`，不建目錄）、`:169-172`（CLI 在 `platform/public` 不存在時 exit 1）
- **違反的要求**：判定標準需要的前提必須寫明。
- **證據（推論）**：如果 fixture 的 `platform/public/` 只放 `_redirects`，`git rm` 會把空目錄一起移除。接著產生器會失敗，結果是 O4，不是 H18 期望的 O2。
- **影響**：同一列可能出現兩種結果，取決於 fixture 怎麼寫。
- **信心**：中
- **建議等級**：P2
- **建議**：fixture 的 `platform/public/` 至少另放一個檔，或明訂 hook 需要時要建立目錄。

## V-9：T01、T02 的列數與 sentence map 不符

- **位置**：traceability.md:359-360（T01「the six English rows」、T02「the four Traditional Chinese rows」）、:151-162（sentence map）
- **違反的要求**：判定標準不需要詮釋。traceability 是單一真相來源。
- **證據（直接讀到）**
  - sentence map 中標 E1 的有 5 列：兩份 wxl-create `SKILL.md`、`challenge-pipeline.md`、`README.en.md`、`_redirects`。
  - 標 Z1 的也是 5 列：兩份 `SKILL.zhTW.md`、`README.md`、兩份 wxl-fork-init。
  - 兩邊總數都是 10，所以 T01／T02 是把某一列繁中檔歸成了英文。最可能是 wxl-fork-init，因為 language.md 規定 skill 用英文。
- **影響**：照 T01 寫測試的人，可能去某個 Z1 檔裡找 E1。
- **信心**：高
- **建議等級**：P2
- **建議**：改成「五列英文、五列繁中」，或改寫成「sentence map 中標 E1 的每一列」。

## V-10：O2 的「stderr 指名 `_redirects` 被取代」，觸發條件有兩種讀法

- **位置**
  - traceability.md:208（O2：「If the working tree's `_redirects` differed from the staged one before the hook」）
  - spec.en.md:114（「stderr names it if the hook replaced a different version」）
  - traceability.md:315（H10）、spec.en.md:196（AC-14）
- **違反的要求**：判定標準不需要詮釋。
- **證據**
  - 「the staged one」可以指 hook 執行前 staged 的版本，也可以指 hook 執行後 staged 的版本。
  - 以 H01 為例（新增題目，工作樹的 `_redirects` 等於 HEAD 也等於 index）：
    - 照 traceability 的讀法（與執行前的 staged 版比）：不提示。
    - 照 spec 的讀法（hook 換掉了不同的版本）：要提示。
  - H07、H11 的情況也一樣。
- **影響**：測試作者無法決定 H01、H07、H11 要斷言「有提示」還是「沒有提示」。AC-14 只涵蓋 H10。
- **信心**：中
- **建議等級**：P2
- **建議**：寫成「當工作樹在 hook 執行前的 `_redirects` 與 hook 寫入的期望內容不同時」或另一種明確條件，並在 H01 或 H07 補上「有／無提示」的斷言。

## V-11：好幾條判定依賴訊息「說了什麼」，卻沒有固定的字串或關鍵子字串

- **位置**
  - spec.en.md:180（AC-11：「says the challenge was created and that committing it after fixing the tree finishes the job」）、:196（AC-14「names it as replaced」）、:218（AC-22「the commit-forms message」）
  - traceability.md:212（O6 訊息）、:217（commit forms 訊息）、:291（C04）
- **違反的要求**：判定標準不需要詮釋。
- **證據**：這幾則訊息都只描述了語意。「說了 X」是否成立，要由判定者解讀。round 1 V-16 把 AC-10 改成「contains `platform/public/_redirects`」，但這次新增的訊息沒有比照處理。
- **影響**：測試的斷言字串由實作者自己決定，等於沒有外部規格可以對照。
- **信心**：中
- **建議等級**：P2
- **建議**：每則訊息至少指定一個必須包含的子字串，例如 `platform/public/_redirects`、`git commit` 不帶路徑的提示、`first commit`。或在 traceability 加一張訊息表。

## V-12：S07 的寬度不等式比 D7 的「標題優先」寬鬆，兩者判定結果可能不同

- **位置**
  - traceability.md:281（S07）、:34（D7：「the URL text gives up width first」）
  - spec.en.md:173
- **違反的要求**：AC 必須能判定它所對應的決策。
- **證據（推論）**
  - S07 要求標題的 `clientWidth` ≥ min(標題的 `scrollWidth`, URL 文字的 `clientWidth`)。
  - 標題與網址各占一半、而且都被截斷時，S07 會通過。但照 D7「網址先讓出寬度」來判，標題不應該在網址還有寬度可讓時就被截斷。
- **影響**：照 D7 判定與照 S07 判定，對同一個版面會得到不同結論。
- **信心**：中
- **建議等級**：P2
- **建議**：二選一。明訂 S07 就是 D7 的驗收定義；或把條件加強，例如「標題被截斷時，URL 文字的 `clientWidth` 等於它的最小寬度」。

## V-13：「visible」沒有定義，寬度為 0 的 URL 文字可以通過 S02、S07、S08

- **位置**
  - traceability.md:276（S02「each visible control」）、:281（S07）、:282（S08）
  - spec.en.md:171、:174
- **違反的要求**：判定標準必須能判出失敗。
- **證據（推論）**
  - 如果 URL 文字被擠到 `clientWidth` 為 0：
    - Playwright 不把它當成 visible，S02 就跳過它。
    - S07 的不等式變成 ≥ 0，一定成立。
    - S08 的 `scrollWidth > clientWidth` 也成立。
  - 畫面上連省略號都看不到，違反 Q11「cut with an ellipsis」。S03 的點擊在某些 viewport 可能抓得到，但 S03 沒有指定 viewport（見 V-18）。
- **影響**：截斷的需求可能在網址完全消失的情況下判為通過。
- **信心**：中
- **建議等級**：P2
- **建議**：定義 visible，例如「`display` 不是 `none`，而且有出現在 DOM 裡」。另外加上「有 URL 文字的地方，它的 `clientWidth` > 0（或 ≥ 某個最小值）」。

## V-14：N04 的「It holds no part of the site base」在 project site 靶場上照字面不成立

- **位置**：traceability.md:263（N04）；spec.en.md:166
- **違反的要求**：判定標準不需要詮釋，而且必須在每一個靶場都成立（S2 在每個靶場都會跑）。
- **證據**
  - vocabulary（:69）說明，GitHub Pages project site 的 `SITE_ORIGIN` 本身就以 `/<repo>` 結尾，也就是 site base 的路徑。
  - 如果某個靶場的 repo 剛好叫 `my-range`，「不含 base」的負向斷言會失敗，雖然 URL 完全正確。
- **影響**：測試如果照字面加上 `not.toContain('/my-range/')`，會在合法的靶場上失敗。
- **信心**：中
- **建議等級**：P2
- **建議**：刪掉這句，只保留「等於 link form 的 page URL」這個等式判定。

## V-15：AC-1 的期望值 `"true"`／`"false"` 帶不帶引號，有兩種讀法

- **位置**：spec.en.md:152；traceability.md:44、:225-227
- **違反的要求**：判定標準不需要詮釋。
- **證據**
  - `vite.define` 的值是原始碼字串。
  - 期望值是 4 個字元的 `true`（注入布林值），還是 6 個字元的 `"true"`（注入字串常值），寫法看不出來。
  - 如果是後者，注入的 `"false"` 是非空字串，判斷為 truthy，可能讓模組誤判。S3 的 page mode 斷言會抓到，但 S1 本身判不準。
- **信心**：中
- **建議等級**：P2
- **建議**：寫成「等於 `JSON.stringify(true)`，也就是 `'true'`」。

## V-16：AC-6 的部分子句在 S2 的觀察輸出中沒有對應

- **位置**
  - spec.en.md:160-161（AC-6：「no message key is added, removed or changed」；按鈕的 click 不讓外層 anchor 導頁）
  - traceability.md:45（S2 outputs）、:250（L15）、:253（L18）
- **違反的要求**：判定標準必須能在指定的 seam 上觀察到。
- **證據**
  - 「沒有新增、移除或修改 message key」是 diff 層級的性質，S2 掛載元件時看不到。
  - S2 只列出 URL 文字 click 事件的 `defaultPrevented`，沒有列按鈕 click 事件的。
- **影響**：這兩個子句的判定位置不明。
- **信心**：高
- **建議等級**：P2
- **建議**：message key 的部分改由 stage 6 對照 diff 檢查，或比對 messages JSON 的 key 集合快照。S2 的輸出加上「按鈕 click 事件的 `defaultPrevented`」。

## V-17：L08，以及 AC-5 的部分案例，在 S8（helper）上觀察不到

- **位置**：traceability.md:232（「L01–L08 run at S8」）、:51（S8 outputs）、:244（L09）、:381-383（AC index：AC-4、AC-5 的 seam 都含 S8）
- **違反的要求**：判定標準必須能在指定的 seam 上觀察到。
- **證據**
  - S8 的輸出只有 copied URL 與 displayed text，helper 沒有 `title` 可以看。
  - L09 的「字串先用 `Number()` 轉換」是元件的行為。spec 沒說 helper 收不收字串，`"7"`、`""` 在 S8 上的期望不明。
- **信心**：高
- **建議等級**：P2
- **建議**：L08 只放在 S2。AC-5 寫明 S8 只測 helper 收到的型別（number／undefined），字串轉換只在 S2 測。

## V-18：AC-8、AC-9 的幾個 S3 判定沒有寫明範圍

- **位置**
  - spec.en.md:172（AC-8：「in a list row **or** the nav」）、:175（AC-9）
  - traceability.md:275（S01）、:277（S03）、:279（S05）
- **違反的要求**：判定標準不需要詮釋。
- **證據**
  - AC-8 寫「or」，S03 寫「and」。
  - S03 與 S05 沒有寫 viewport、語系，也沒寫要點 nav 的桌面版還是手機版控制項。
  - S01 的「while `short_link.copied` shows」沒有說要點哪一列的複製按鈕（不同列的網址長度不同）。
  - AC-9 的「the URL text」是單數，但每頁有多個 URL 文字（列表很多列，nav 有兩個）。
- **影響**：執行範圍各自詮釋，可能只測最不容易出問題的組合。
- **信心**：中
- **建議等級**：P2
- **建議**：AC-8 把「or」改成「and」。S03、S05 寫明「each page 的每個 viewport，在該 viewport 可見的那一個 nav 控制項」。S01 寫明點擊「網址最長的那一列」。AC-9 改成「每一個 URL 文字」。

## V-19：T04 的「在靶場中略過」，在 S6 的輸出中觀察不到

- **位置**：traceability.md:362（T04）、:49（S6 outputs 只有「是否含有句子」）；spec.en.md:203
- **違反的要求**：判定標準必須能在 seam 上觀察到。
- **證據**：在 upstream repo 裡跑，只會看到「有執行」。「略過」要在靶場裡跑才看得到，而沒有任何 seam 涵蓋靶場。
- **信心**：中
- **建議等級**：P2
- **建議**：用 fixture 驅動 upstream decision 的輸入（現有的 `isUpstreamDecision` 單元測試就是這種寫法），把 gating 拆成可以測的函式。或明訂由 stage 6 檢查 `describe.runIf` 的條件。

## V-20：AC-21 說的「the guard test's step」，在 CI 裡並不存在

- **位置**
  - spec.en.md:212；traceability.md:373（V05）
  - `.github/workflows/quality-gates.yml:68-69`（guard 只是 `Run tests` 這個 step 裡的一個案例，跟所有 unit test 一起跑）
- **違反的要求**：判定標準不需要詮釋。
- **證據**：「guard test 的 step 通過」等於「全部 unit test 通過」。guard 本身的結果要去 log 裡找。
- **影響**：無關的 unit test 失敗時，會被誤判成 guard 失敗，反過來也一樣。
- **信心**：高
- **建議等級**：P2
- **建議**：改成「`Run tests` step 的 log 中，guard test 案例（`redirects-generated.test.ts` 的 byte-identical 案例）通過」。

## V-21：stage 8 的 AC 沒有對應到 ticket，「the pushed ticket commit」預設了一個 ticket 就包含全部變更

- **位置**
  - spec.en.md:205-214（AC-20、AC-21）
  - traceability.md:369-373
  - `docs/agents/workflow.md:151-152`（stage 8 以 ticket 為單位）
- **違反的要求**：每條 stage 8 判定標準都要指名一個實際能操作的 surface。
- **證據（推論）**
  - V04 驗的是 copy 控制項，V05 驗的是 hook，兩者用同一個暫時 repo，而這個 repo 是以單一個 ticket commit 建立的。
  - 如果 stage 4 把這兩件事拆成不同 ticket，任何一個 ticket commit 都只含一半的變更。
  - 只改 hook 的 ticket，在 Cloudflare preview 上也看不出 V01 的任何差異。
- **影響**：到了 stage 8 才要決定哪個 ticket 跑哪一條、用哪個 commit。
- **信心**：中
- **建議等級**：P2
- **建議**：標明 V01–V05 各自屬於哪一類 ticket，或規定 V04、V05 在最後一個 ticket 上執行（commit 必須包含前面已 land 的變更）。

## V-22：H16 的期望行為仍然沒有任何 seam 觀察

- **位置**：traceability.md:321（H16：「the unchanged guard test reports a stale `_redirects` in CI」）；spec.en.md:202（AC-17：「is left to the unchanged guard in CI」）
- **違反的要求**：判定標準必須能在 seam 上觀察到。
- **證據**：round 1 V-10 的處置選擇不做實驗。結果 AC-17 這一句是陳述，不是判定。H16 的「reports」也沒有地方被觀察到。
- **影響**：這一列等於「推論成立」，但表格看起來像已驗證。
- **信心**：高
- **建議等級**：P2（使用者已在 round 1 接受；記錄殘留）
- **建議**：在 H16 註明「由 guard 既有的斷言推得，不另行驗證」，避免讀者誤以為有驗證。

## V-23：passages 表的判定是描述性的，P3 沒有列出段落，P7 與 skill 現有的選單編號「2」容易混淆

- **位置**
  - traceability.md:178-186（P1–P7：「describe D4, D2 and D7」「describe both link modes」「every sentence that describes…」）
  - spec.en.md:225（AC-24）
  - `.claude/skills/wxl-create/SKILL.md:101`（現有文字「on `1`, re-ask the slug and re-run; on `2`, stop」，這裡的 1、2 是使用者在選單中的回答）
- **違反的要求**：判定標準不需要詮釋。
- **證據**
  - 「describe X」要由 stage 6 的 reviewer 自行判斷。
  - P3 的「every sentence」沒有列出檔案與行號。
  - P7 要求處理 exit status 2，而現有段落已經有一個語意不同的「`2`」。reviewer 可能誤以為現有段落已經處理了 exit 2。
- **信心**：中
- **建議等級**：P2
- **建議**：P3 列出檔案與行號。P7 要求在改寫時把 exit status 與選單回答分開寫，例如寫成「exit status 2」。

## V-24：S3 中「在每個靶場都會跑」的斷言，依賴展示題 `selected-excerpts` 一定存在

- **位置**：traceability.md:270-271、:266（N07）；spec.en.md:247-248
- **違反的要求**：判定標準必須能在指定的 seam 上觀察到。
- **證據**：只有 S08 標成 upstream-only。老師刪掉或改名這道展示題後，靶場自己的 smoke 就無法執行這些判定。既有的 smoke 也依賴 `door-is-open`，所以這是已有的模式，只是本 epic 加深了依賴。
- **信心**：低
- **建議等級**：P2
- **建議**：寫明這是已接受的前提，或改成「列表中第一道有繁中說明的題目」。

## V-25：S4 的 C06、C08 用了 git 的字眼，但 S4 的 root 不是 git repo

- **位置**：traceability.md:293（C06「untracked draft」）、:295（C08「uncommitted hand edit」）、:47（S4 的 root 是測試自己建的暫時目錄）；spec.en.md:176、:180
- **違反的要求**：判定標準不需要詮釋。
- **證據**：在 S4 裡，「untracked」與「uncommitted」無法建立，也無法觀察。實際上只是「一個沒有 number 的目錄」與「手改過的檔案」。
- **信心**：高
- **建議等級**：P2
- **建議**：S4 的列改用檔案層級的描述。

## V-26：V02 的「desktop」沒有指定寬度

- **位置**：traceability.md:370（V02：「375 wide and desktop」）
- **違反的要求**：判定標準不需要詮釋。
- **信心**：中
- **建議等級**：P2
- **建議**：沿用 S3 的 1280×800。

---

## 檢查過、沒有發現問題的部分

- **模糊字眼**：spec 與 traceability 的 AC 中，沒有出現「appropriately」「reasonably」「as needed」「where possible」這一類字眼，所以沒有依這條規則判定的 P0。
- **round 1 的 V-1 到 V-19**：rev 2 的處置大多可以判定。已修的有 L17／S03／S06、N04 的非 root base、V02 改用 agent-browser、V01 在 preview 自己的 host 上開短連結、S02 的 `display` 不是 `inline`、S08、`git ls-files --stage`、match rule。上面只列殘留或新產生的問題。
- **AC-10、AC-11 的可達性**：status 2 的三個案例在 S4 上都到得了（`nextChallengeNumber` 不檢查重複，所以 scaffold 會先建好；`checkChallengeNumbers` 會在產生時拒絕）。
- **AC-15／H15**：今天 pre-commit 測試的每個案例，在新的 fixture 底下都維持原本的 status。stash 那個案例雖然有號碼重複，但 validator 先失敗，結果仍是 O3。
- **AC-21／V04**：英文網址用 `wxl-locale=en` 的 profile 開啟，可以判定。zh-TW 這種有前綴的路徑不會被 redirect（`i18n/index.ts:222`）。
- **S3 的英文頁**：`playwright.site.config.ts` 已固定 `wxl-locale=en`，英文頁不會被 redirect 到繁中頁。
- **AC-25、AC-17 的 stage 6 diff 檢查、AC-19**：可以判定。

**跨軸觀察**（不在本軸，只記錄）：O5 有列 SIGTERM，但沒有任何 H 列測 SIGTERM。

**統計**：P0 0 項、P1 5 項（V-1 到 V-5）、P2 21 項（V-6 到 V-26）。

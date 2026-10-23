# Stage 3 第 1 輪：Completeness 面向（C）審查報告，epic 0007-gh-pages-range-fixes

**範圍確認**：我依凍結 prompt（blob 5cfa01c）審查，讀的是工作樹中的 `spec.en.md`（blob 8951363）和 `traceability.md`（blob 33bb856）。另外依 `round1-scope.diff` 讀了 `GLOSSARY.md` 與 `.proj.specs/OPEN-QUESTIONS.md` 尚未 commit 的修改。capture 顯示 untracked 檔只有 spec 目錄的三個檔，與父代理的說明一致。我沒有執行 git，Git 狀態全部以 capture 為準。

下面標「直接讀到」的是我親眼看過的程式碼或文件；標「推論」的是依程式碼推導、沒有實際執行驗證的行為。

---

## P1

### C-1 英文題目頁網址會被預設語系重新導向，沒有繁中頁的題目因此開成 404
- **位置**：`traceability.md:53`（page URL）、`:188`（N04）、`:257`（V04）；`spec.en.md:34-36`（「which opens on any static host」）、`:46`（US-5）。程式碼在 `.vitepress/theme/i18n/index.ts:25,205-225`、`.vitepress/theme/index.ts:115-118`。
- **違反**：矩陣必須涵蓋每個 {型別 × 欄位 × 邊界}，這裡少了「學習者瀏覽器狀態」與「題目有沒有繁中頁」兩個維度。
- **證據**：
  - 直接讀到：`DEFAULT_VISITING_LOCALE = 'zh-TW'`。
  - 直接讀到：`redirectTargetForStoredLocale` 會把沒有語系前綴的路徑導向 `/zh-TW/...`，條件是學習者沒有存過偏好，或偏好是 zh-TW。
  - 直接讀到：`create:challenge` 只會 scaffold `platform/challenge/<slug>/`，不產生繁中頁。
  - 推論：老師從英文列表複製新題目的 page URL 發給全班，第一次開的學生會被導向 `/zh-TW/challenge/<slug>/`，而那頁不存在。
  - 短連結今天 302 到同一個英文頁，所以問題早就存在；但這個 epic 新承諾「網址一定打得開」。
- **影響**：
  - US-5 在老師新增題目後最常見的情境會失敗。
  - V04 用操作者自己的瀏覽器驗證（已存過偏好）會通過，因此看不出來。
  - OQ-016 的新段落「every range's button gives an address that opens」不成立。
- **信心**：中高（導向邏輯直接讀到；404 這一步是推論）。
- **建議**：
  - 矩陣加一組列：{學習者偏好：無 / en / zh-TW} × {有 / 無繁中頁} × {en / zh-TW 網址}，寫明期望行為。
  - V04 指定用全新的瀏覽器 profile。
  - 如果接受這個代價，寫進 Further Notes 和 E2/Z2，或列入 Out of Scope。

### C-2 `SITE_ORIGIN` 的路徑和實際 site base 不一致的情況沒有列
- **位置**：`traceability.md:51`（SITE_ORIGIN 的定義）、`:170-171`（L06/L07）；`spec.en.md:73-75`、`:113`（B4）。
- **違反**：有部署主機與靶場來源狀態的組合沒有走到任何 AC。
- **證據**：「no base added」只在 fork:init 推導出的 origin 下成立。以下情況直接讀到：
  - `deploy.yml.template:15-21` 與 `README.md:214` 寫明 base 由 `configure-pages` 算出，「repo 改名或換網域時也會跟著變」；但 `SITE_ORIGIN` 不會跟著變。
  - `README.md:206`：自訂網域的 GitHub Pages 靶場要每次手動帶 `--origin`，否則會被覆寫回推導值。
  - `fork:init --base /x/` 模式會寫死 base，但 origin 是另外給的。
  - 直接 fork 而沒跑 fork:init 時，`SITE_ORIGIN` 仍是 `https://wxl.browserlab.online`（`shortLink.ts:26`）。

  推論：在短連結模式下，Cloudflare 的 origin 規定不能帶路徑，所以 base 不重要；到了 page 模式，base 和 origin 不一致會直接讓網址 404。直接 fork 的情況下，網址會指向上游網站，上游沒有老師自己的題目。
- **影響**：L06/L07 只測一致的情況，不一致的組合沒有期望行為。B4 的「as it does for short links today」低估了衝擊範圍。
- **信心**：高（程式碼與文件都直接讀到）。
- **建議**：加入「origin 路徑 ≠ SITE_BASE」「origin 仍是上游值」等列，並寫明期望（接受並記錄成已知代價，或在建置時比對後警告）。

### C-3 同一個檔案同時有 staged 和 unstaged 修改時，stash pop 可能衝突
- **位置**：`traceability.md:223`（H09）、`:142`（outcome table 成功列）；`spec.en.md:84-90`、`:111`（B2）、`:153-156`（AC-14）。程式碼在 `scripts/pre-commit.sh:10,29,47`。
- **違反**：B2 與 AC-14 承諾「byte for byte restored、no stash entry left behind」，但矩陣沒有區分這個工作樹邊界。
- **證據**：
  - 直接讀到：hook 用 `git stash push --keep-index`，之後 `git stash pop`，而且開了 `set -euo pipefail`。
  - 推論：pop 是以 HEAD 為 base 的三方合併。staged 的 hunk 若和後續 unstaged 修改相鄰或重疊，就會衝突。這時 hook 以非 0 結束，工作樹留下衝突標記，stash entry 也留著。
  - H09 只寫「unstaged changes to tracked files」，沒有「同一檔案 staged 加 unstaged、hunk 重疊」這個邊界。
- **影響**：spec 新承諾的保證在常見的部分 staging 下會被打破。由於 hook 現在連繁中樹也會觸發，stash 次數會比今天多。
- **信心**：高（這是 git 的已知行為，與程式碼一致）。
- **建議**：新增 H 列「同一檔案 staged 加 unstaged、hunk 重疊」；outcome table 補上「stash 還原失敗」這一列與它的期望狀態。

### C-4 outcome table 沒涵蓋 git 操作本身失敗，也沒定義沒有 HEAD 時的觸發條件
- **位置**：`traceability.md:136-148`。
- **違反**：outcome table 宣稱涵蓋「the four ways a run can end」（`:293`），但結束方式不只這四種。
- **證據**：
  - 觸發條件定義成「staged snapshot differs from `HEAD`」，第一個 commit 還沒有 HEAD 時沒有定義。
  - 直接讀到：`create-wxl/src/git-steps.mjs:125-126`。CW-W02（沒有身分設定）會讓老師自己跑 `git commit`；如果老師先跑了 `pnpm install`，hook 已經裝好，就會在沒有 HEAD 的狀態下執行。
  - 推論：`git stash push` 在沒有初始 commit 時會失敗。
  - `git stash push`、`git stash pop`、`git add` 失敗（例如 `index.lock`），以及執行中被 SIGINT 中斷，都沒有列。
- **影響**：實作者對這些情況沒有規格可循。AC-15「failure 時一切如前」的範圍也不清楚。
- **信心**：中。
- **建議**：outcome table 加「沒有 HEAD」「git 操作失敗」「被中斷」三類列，或明確列入 Out of Scope。

### C-5 其他 commit 方式（`-a`、帶路徑、`--amend`、GUI client）沒有列
- **位置**：`traceability.md:36`（S5 seam）、`:215-232`；`spec.en.md:82-92`。
- **違反**：有些觸發方式與重跑順序沒有走到任何 AC。
- **證據**：
  - 每個 H 列都假設流程是 `git add` 後再 `git commit`。
  - 推論：`git commit <pathspec>`／`--only`／`-i` 會讓 hook 在暫時的 index 上執行（`GIT_INDEX_FILE`）。hook 裡的 `git add` 和 `git stash` 作用在那個 index 上，之後真正 index 的狀態沒有定義。
  - `git commit -a`、`-p`、`--amend` 也沒有列。
  - 從 GUI client（VS Code、GitHub Desktop）commit 時，PATH 可能沒有 node。
- **影響**：老師常用 `git commit -am` 或在 IDE 裡 commit，這些路徑沒有規格。
- **信心**：中。
- **建議**：新增 H 列，或在 Out of Scope 明列支援哪些 commit 形式。

### C-6 已經過期的 `_redirects`（工作坊老師現在的狀態）要怎麼修復，沒有規格
- **位置**：`traceability.md:221`（H07）；`spec.en.md:13-19`（Problem）、`:111`；E1/Z1（`traceability.md:111-112`）。
- **違反**：「做到一半」的靶場狀態沒有對應列。
- **證據**：
  - 直接讀到：H07 規定「只 stage `_redirects`」時不觸發。
  - 推論：一個 commit 進去的 `_redirects` 已經過期的靶場，升級後只要升級 commit 沒碰到兩個 watched tree，CI 就繼續失敗，要等到下一次題目變動才會修好。E1 只寫「不要手改」，沒給修復指令。
- **影響**：工作坊老師升級後，CI 可能還是紅的，而且文件沒有出路。
- **信心**：中。
- **建議**：新增「起始狀態：已 commit 的 `_redirects` 過期」的列，分「下一個 commit 有／沒有題目變動」兩種，寫明期望；考慮在 E1/Z1 加上 `pnpm redirects:generate` 作為修復方式。

### C-7 hook 產生檔案時讀到的不只是 staged snapshot
- **位置**：`traceability.md:58`（「inside the hook, the tree is the staged snapshot」）、`:142`。
- **違反**：矩陣列的期望行為和 spec 的規則不一致。
- **證據**：
  - 直接讀到：`pre-commit.sh:26-27` 的 stash 刻意只限 `platform/`。所以 hook 用的是工作樹中的 `scripts/generate-redirects.ts`、`scripts/challenge-numbers.ts`、`.vitepress/challenge/shortLink.ts`，有 unstaged 修改也照用。
  - 推論：`--include-untracked` 不會 stash 被 ignore 的檔案。watched tree 底下被 ignore、但帶有 `index.md` 的目錄會被算進 staged 的 `_redirects`；guard test 用 `git ls-files`（`redirects-generated.test.ts:156-167`）不會算它，CI 因此失敗。
- **影響**：hook 成功了，CI 卻失敗，違反 Q9 的初衷。
- **信心**：中。
- **建議**：新增「產生器相關檔案有 unstaged 修改」「watched tree 有被 ignore 的題目目錄」兩列，寫明期望。

### C-8 只刪除或退役英文題目、繁中頁還在時，H03/H17 的期望和產生器不一致
- **位置**：`traceability.md:217`（H03）、`:231`（H17）；`spec.en.md:146`（AC-12「the challenge's rules go」）。
- **違反**：矩陣列的期望和產生器的實際規則不一致。
- **證據**：
  - 直接讀到：`generate-redirects.ts:93-114` 每個語系各自產生規則。
  - 直接讀到：退役題目只放在 `.archive/challenge`（`challenge-numbers.ts:34`），沒有對應的繁中退役樹。
  - 推論：只 `git rm -r platform/challenge/x` 或只退役英文時，`/zh/c/NNN` 規則會留著，不是「loses its rules」。validator 把整個目錄被刪視為「removed」直接略過（`challenge-lint-staged.ts:89-92`），所以 commit 會成功。
  - 也沒有列：只刪繁中頁、只改名繁中頁、只改繁中說明但規則不變（H05 的繁中版）。
- **影響**：測試照字面寫會失敗，不然就是遮掉了實際行為。
- **信心**：中高。
- **建議**：把 H03/H17 拆成「兩個語系都動」和「只動英文」兩種，並補上繁中的刪除、改名、無關規則的修改等列。

### C-9 寬度怎麼分配沒有規格，viewport 也沒涵蓋到
- **位置**：`traceability.md:195-196`（S01/S02）；`spec.en.md:132-136`（AC-8）。程式碼在 `MergedNav.vue:236-258`。
- **違反**：缺少 viewport 與相鄰元素這兩個邊界。
- **證據**：
  - 直接讀到：MergedNav 手機版第 2 列的標題是 `truncate flex-1`，原有註解說這一列「the title IS the free space」，而且在 360px 量過。
  - 直接讀到：桌面版的控制項從 md（768px）開始顯示。
  - S01 只測 375 與 1280。推論：長的 page URL 可能把標題壓到 0 寬，但 S01/S02 只檢查不能橫向捲動、網址要有 ellipsis，這種情況照樣通過。
  - 360px 和 768–1023px 沒有測。
- **影響**：手機上可能看不到題目標題，平板寬度的版面沒有驗證。
- **信心**：中。
- **建議**：新增「標題仍然可見（或規定誰先縮）」的列，viewport 加上 360 與 768。

### C-10 列表裡「點一下選取」會撞上整列是 `<a>` 的導覽
- **位置**：`traceability.md:197`（S03）；`spec.en.md:67-69`、`:136`。程式碼在 `ChallengeList.vue:390-439`、`ShortLinkShare.vue:72-76`。
- **違反**：矩陣列的期望行為和既有的 DOM 結構不一致，而且這個邊界沒有列。
- **證據**：
  - 直接讀到：列表每一列是 `<a>`。元件註解寫明只有複製按鈕會攔下 click，「the text is left alone」。
  - 推論：點一下網址文字會進行導覽，離開列表頁，S03 的「selection is the whole displayed text」在列表裡做不到。
  - 觸控裝置上，長按連結會跳出連結選單；`title` 在觸控裝置上也不會顯示（US-7 的「shown whole on hover」）。
- **影響**：手動選取這條退路在列表裡可能不成立，而且手機上看不到完整網址。
- **信心**：中。
- **建議**：分「列表」與「nav」兩種情境寫 S03 的期望，也就是要不要攔下文字上的 click；另外補上觸控裝置的列。

---

## P2

### C-11 hook 成功但 commit 被中止時的狀態沒有定義
- **位置**：`traceability.md:142`；`spec.en.md:48`（US-3）。
- **證據**（推論）：hook 成功後，commit 還可能因為訊息空白、commit-msg hook 拒絕或關閉編輯器而中止。這時 index 會留著 hook stage 的 `_redirects`，工作樹的 `_redirects` 已依 D3 被換掉。
- **影響**：老師沒有 stage 的檔案出現在 index 裡，和 US-3 的期待不同。
- **信心**：中。
- **建議**：新增一列並寫明接受這個狀態。

### C-12 多位老師並行開分支、以及升級時的衝突沒有列
- **證據**：
  - 推論：兩個分支各自新增題目，兩邊都會改 `_redirects` 的同一區段，merge 時必然衝突。`git commit` 在 hook 執行前就會拒絕有 unmerged 檔案的 commit，而 E1 又禁止手改。
  - 推論：兩個分支會拿到同一個 max+1 號碼（`challenge-numbers.ts:178-186`）。0006 升級時上游帶進同號的示範題，也會讓產生失敗。
  - GLOSSARY 裡已有「多位老師協作」的描述，但矩陣沒有對應列。
- **影響**：協作與升級時，`_redirects` 沒有被文件承認的修復方式。
- **信心**：中。
- **建議**：新增對應列，或寫明修復方式。

### C-13 `platform/public/` 目錄不存在的情況沒有定義，影響 H15
- **證據**：
  - 直接讀到：產生器的 CLI 在 `platform/public` 不存在時會 exit 1（`generate-redirects.ts:169-171`）；`writeRedirects` 在這種情況會丟出 ENOENT。
  - 直接讀到：今天 `tests/pre-commit-sh.test.ts` 的 fixture 沒有 `platform/public/`。其中「exits 0 when valid challenge files are staged」（:120-137）和「exits 0 when entire challenge directory is removed」（:186-192）兩個案例，對真正的 hook 會變成 exit 1，和 H15 的「same exit status」衝突。
  - H18 只涵蓋檔案不存在，沒有涵蓋目錄不存在；S4 的暫存 root 也一樣。
- **信心**：高。
- **建議**：寫明 fixture 必須含 `platform/public/`，或定義目錄不存在時的期望。

### C-14 vitest 裡沒有定義 `__WXL_SHORT_LINKS__`
- **證據**：
  - 直接讀到：`vitest.config.ts` 沒有 `define`。
  - `spec.en.md:183-184` 說測試環境「would otherwise run in page mode」。推論：實際上是這個常數根本不存在，元件直接讀它會丟出 ReferenceError，除非有 `typeof` 防護。
  - 矩陣沒有「常數不存在」這個邊界。
- **信心**：高。
- **建議**：新增一列（常數不存在時是 page 模式，或在 vitest 裡 define 它）。

### C-15 sentence map 漏了 wxl-create 的 `SKILL.zhTW.md`
- **證據**：直接讀到：`.claude/skills/wxl-create/SKILL.zhTW.md:6` 和 `.agents` 樹的同名檔都寫「本檔為同目錄 `SKILL.md` 的台灣繁體中文鏡像」。sentence map（`traceability.md:118-127`）沒列這兩個檔，E1 加進 `SKILL.md` 後鏡像會跟英文版不同步。
- **信心**：中。
- **建議**：加入 Z1 列，或明確排除這兩個檔。

### C-16 slug 的格式與編碼沒有規格
- **證據**：
  - 直接讀到：slug 格式只有 `create-challenge.ts:32` 的 `SLUG_RE` 在檢查；H04 的 `git mv` 可以產生任何目錄名稱。
  - link forms 直接把 slug 原樣接上。推論：列表從 `page.url` 取 slug（`ChallengeList.vue:104-107`，可能是百分比編碼過的），nav 可能從 relativePath 取（原始字串），同一題的拼法可能不一致。
- **信心**：中低。
- **建議**：L10/N04 加上大寫、空白、非 ASCII 字元的列。

### C-17 mode rule 列舉的主機不完整，V01 的 origin 也沒寫清楚
- **證據**：
  - `pnpm pages:dev`（wrangler 會讀 `_redirects`，但建置時沒有 `CF_PAGES`）、Netlify（也讀 `_redirects` 語法）、release zip（`release.yml` 用 `docs:build`，origin 是上游的）、其他靜態主機（`README.md:23`），都沒列在 `traceability.md:79`。
  - Cloudflare 的 preview 部署有 `CF_PAGES=1`，但 origin 是正式站。推論：V01 的「opens its challenge」開到的是正式站，不是 preview。
- **信心**：中。
- **建議**：mode rule 補齊這些主機；V01 寫明複製出來的連結指向哪個 origin。

### C-18 hook 的作業系統與工具版本沒有列
- **證據**：
  - S5 在 CI 上只跑 ubuntu（`quality-gates.yml` 的 test job）。macOS 的 bash 3.2 與 BSD 工具、Windows 的 Git Bash 都沒涵蓋。
  - git 版本：create-wxl 的最低需求是 2.20。
  - Node 版本：不支援 `--experimental-strip-types` 時，只有繁中變動的 commit 不跑 validator，產生器會是第一個執行的 node 程式，結束狀態會是 9 或 127，不是 outcome table 寫的 1。
- **信心**：中低。
- **建議**：新增列，或列入 Out of Scope。

### C-19 執行前已經有 stash entry 的情況沒有測
- **證據**：S5 觀察 `git stash list`「as before」，但沒有任何列是從非空的 stash list 開始。推論：hook 若 pop 到使用者原本的 entry，空 list 的 fixture 抓不到。
- **信心**：中。
- **建議**：fixture 預先放一個 stash entry。

### C-20 `create:challenge` 產生失敗的其他類別沒有列
- **證據**：
  - C04 只涵蓋「兩題同號」。推論：工作樹裡一份沒有號碼或號碼格式錯誤的 untracked 草稿、或繁中號碼不一致，也會讓 `create:challenge` 在 keygen 之後失敗，這是對今天行為的改變。
  - `_redirects` 原本有沒 commit 的手改時，會被覆寫（B5）。
- **信心**：中。
- **建議**：補上這些列。

### C-21 觸發條件的邊緣情況沒有列
- **證據**：
  - 直接讀到：hook 用 `--diff-filter=ACMRD`。推論：檔案型別變更（`T`）不會觸發。
  - 從 `.archive` 移回來（取消退役）、Copy（C）、只改繁中但規則不變，都沒有列。
- **信心**：中低。

### C-22 ChallengeLayout 是第三個呼叫端，但不在 seam 和矩陣裡
- **證據**：直接讀到：MergedNav 的 `number` 來自 `ChallengeLayout.vue:835`。spec 沒寫 nav 的 slug 從哪裡來；如果由 layout 傳進來，ChallengeLayout 不在任何 seam 或列裡（N03 只掛載 MergedNav）。
- **信心**：中。

### C-23 既有行為沒有寫進矩陣
- **證據**：
  - 直接讀到：列表的 grid 檢視沒有控制項（`ChallengeList.vue:348-386`），N/S 各列沒寫是哪種檢視模式。
  - 直接讀到：「複製按鈕的 click 不會傳到外層連結」這個既有測試（`ShortLinkShare.test.ts:156`）沒有對應的 L 列。改 markup 時可能退化而沒人發現。
- **信心**：中。

### C-24 fork:init 的 A8 錨點依賴 `shortLink.ts` 的形狀
- **證據**：直接讀到：fork:init 和 upstream-guard 要求 `shortLink.ts` 裡剛好一行 `export const SITE_ORIGIN =`（`fork-init.ts:1000`、`upstream-guard.test.ts:525-527`）。新增 helper 後，沒有任何列確認這兩者仍然通過。
- **信心**：中低。

### C-25 S01 與 S04 沒有指定語系和頁面
- **證據**：S01 的 `selected-excerpts` 題目頁沒指定語系，而繁中網址最長。S04 沒寫要檢查哪些頁面、哪些語系。
- **信心**：中。

### C-26 Stage 8 的前置條件與涵蓋路徑不完整
- **證據**：
  - V03 的暫時 worktree 沒有 `node_modules`：hook 會 import `yaml`，`create:challenge` 也需要 Rust。spec 只在 V05 提到 Rust（`spec.en.md:228-229`）。
  - V04 只涵蓋 create-wxl 這條路，沒涵蓋 README 寫的「GitHub fork 加 fork:init」。
- **信心**：中。

### C-27 H07 的後半句沒有被 AC-13 驗收
- **證據**：H07 的後半句「guard test reports the stale file in CI」，AC-13 沒有驗收，只能靠 AC-17 間接涵蓋。
- **信心**：中。

---

**檢查過的內容**：
- spec 與 traceability：所有列、AC 對照索引、outcome table、mode rule、link forms、sentence map。
- 程式碼：`pre-commit.sh`、`generate-redirects.ts`、`challenge-numbers.ts`、`create-challenge.ts`、`challenge-keygen.ts`、`challenge-lint-staged.ts`、`shortLink.ts`、`ShortLinkShare.vue`、`ChallengeList.vue`、`MergedNav.vue`、`ChallengeLayout.vue`、`.vitepress/config.mts`、`.vitepress/theme/index.ts`、`.vitepress/theme/i18n/index.ts`、`challenges.zh-TW.data.ts`、`fork-init.ts`、create-wxl 的 `git-steps.mjs`。
- 設定：`vitest.config.ts`、`playwright.site.config.ts`、`.gitattributes`、`.gitignore`、`deploy.yml.template`、`quality-gates.yml`、`release.yml`。
- 測試：`redirects-generated.test.ts`、`redirects.test.ts`、`pre-commit-sh.test.ts`、`ShortLinkShare.test.ts`、`upstream-guard.test.ts`。
- 文件與 skill：`README.md`、`CONTRIBUTE.md`、`language.md`、wxl-create 與 wxl-fork-init 兩棵樹的 skill、`OPEN-QUESTIONS` 與 `GLOSSARY` 的 diff。

P0：0；P1：10（C-1 至 C-10）；P2：17（C-11 至 C-27）

# Stage 3 第 1 輪：紅隊審查（軸 4，R），epic 0007-gh-pages-range-fixes

**範圍：** 我照凍結 prompt（blob 5cfa01c）審 `spec.en.md`（89513637）與 `traceability.md`（33bb8564），兩份都是工作樹版本。GLOSSARY.md 與 OPEN-QUESTIONS.md 的待提交變更依 round1-scope.diff 一併讀了。

**對照的程式碼：** `scripts/pre-commit.sh`、`generate-redirects.ts`、`challenge-numbers.ts`、`create-challenge.ts`、`challenge-lint-staged.ts`、`fork-init.ts`（A6/A8/A9 錨點）、`.vitepress/config.mts`、`shortLink.ts`、`ShortLinkShare.vue`、`ChallengeList.vue`、`MergedNav.vue`、`platform/shared/*.data.ts`、`.gitignore`、`.gitattributes`、`quality-gates.yml`、`tests/pre-commit-sh.test.ts`、`redirects-generated.test.ts`、`config-base.test.ts`、`create-challenge.test.ts`、wxl-create skill（兩棵樹，含 `SKILL.zhTW.md`），以及 VitePress 的 `createContentLoader` 原始碼。

**哪些是推論：** 我無法執行 git。以下凡涉及 git 內部行為（stash apply 的三方合併、partial commit 的暫時 index）的描述，都是依 git 原始碼語意推論，沒有實測；可信度各條分別標示。

---

## R-1：hook 在 stash 範圍內「重產並 stage」，pop 時會和 stash 裡的 `_redirects` 衝突
- **位置：** spec.en.md:82-92、B2（spec.en.md:111）、AC-14（spec.en.md:153-156）；traceability.md:26（D3）、:142、H10（:224）、H11（:225）、H18（:232）；程式碼 scripts/pre-commit.sh:29、:47，scripts/generate-redirects.ts:124-128、:153-157
- **違反：** D3（成功後工作樹的 `_redirects` 等於 staged 版本）、B2／AC-14（其他變更逐 byte 還原、不留 stash entry）、Story 3。
- **證據：**
  - spec 寫的是「Inside the scope it already stashes, and after validation passes, it regenerates `_redirects` from the staged snapshot and stages it」，最後才 `git stash pop`。
  - `git stash pop` 會做三方合併：base 是 stash 當時的 HEAD 樹，ours 是目前的 index 樹，theirs 是 stash 的工作樹。
  - H10：`pnpm dev` 產生的 B 留在工作樹沒 stage，hook 產生的 C 已進 index。base A、ours C、theirs B 三者都不同。
  - `formatRules` 會把每一欄補到同寬，只要新 slug 比較長，每一行規則都會重新補白。所以 B≠C 時幾乎每行都衝突；就算剛好不衝突，也會合出 B、C 的混合版（exit 0，但違反 D3）。
  - H11（staged 的是手改版 H）或 H18（index 中已刪除），只要同時有任何可 stash 的變更，也會走到同一條路。
  - 如果用 `writeRedirects` 在 pop 前直接寫進工作樹，pop 會以「local changes would be overwritten」拒絕。
  - 未追蹤的 `_redirects` 被 `-u` 收進 stash 後，hook 又建立同一路徑，pop 會因「already exists」失敗。
  - 在 `set -e` 之下，上述失敗都會讓 hook 中斷：commit 被拒、stash entry 留下、未追蹤檔被藏在 stash 裡、`_redirects` 帶衝突標記。
- **影響：** 老師的未提交工作「看起來不見了」，正好打破 Story 3 的承諾。矩陣只測 H11 與 H18 沒有可 stash 狀態的情況；H10 的 fixture 若讓 B==C，這個缺陷完全看不到。
- **可信度：** 中高（stash 的合併語意依 git 原始碼推論）。
- **等級：** P1
- **建議：**
  - 在規範層寫死順序：stash 內只把產生結果寫到暫存檔或 stdout；先 pop，再寫入 `_redirects` 並 `git add`。
  - 矩陣補三列：H10 且 B≠C（工作樹另有一道被 `pnpm dev` 收進去的未追蹤題目）、H11 × 有可 stash 狀態、H18 × 有可 stash 狀態。

## R-2：partial commit 與其他 commit 模式沒有定義
- **位置：** traceability.md:136-148（outcome table 只假設一般的 `git commit`）、S5（:36）；spec.en.md AC-12～AC-15
- **違反：** B2、D3，以及「commit 一定帶著相符的檔案」這個承諾。
- **證據（推論）：**
  - `git commit <pathspec>`（`--only`）會用暫時 index（`GIT_INDEX_FILE`）跑 hook。hook 的 `git add` 只寫進這份暫時 index。
  - commit 完成後，真正的 index 裡 `_redirects` 仍是舊的 A，而 HEAD 已是 C。`git status` 會顯示一個「把 C 改回 A」的 staged 變更。
  - 下一個不碰題目的 commit 不會觸發 hook，會把 A 提交出去，CI 轉紅。
  - `-a`、`--include`、`-p`、IDE 的 smart commit 在矩陣裡都沒有出現。
- **影響：** 老師的原始症狀換一條路重現。
- **可信度：** 中
- **等級：** P1
- **建議：** 矩陣加入 commit 模式一欄（一般、`-a`、`<pathspec>`、`--amend`），並規定 `--only` 時的行為：同步更新真正的 index，或拒絕並說明原因。

## R-3：`create:challenge` 提前改寫 `_redirects` 後，它可能在沒觸發 hook 的情況下被提交
- **位置：** spec.en.md:76-81、Out of Scope（spec.en.md:204，H07）；traceability.md H07（:221）、Checks（:301）
- **違反：** Solution 說的「The commit therefore always carries the matching file」。
- **證據：**
  - `create:challenge` 以整個工作樹（包含尚未 add 的新題目）改寫 `_redirects`。
  - 老師接著 `git commit -a`、`git add -u`，或 VS Code smart commit，只帶到已追蹤的 `_redirects`，新題目目錄仍是未追蹤。
  - staged snapshot 在 watched trees 底下沒有差異，hook 不觸發（H07 明確不處理），結果提交了一個多出規則的 `_redirects`，CI guard 失敗。
  - Checks（:301）只把這件事當成「本機 `pnpm test` 會 mismatch」的已知成本，沒有提到提交路徑。
- **影響：** 「新增題目後 CI 失敗」這個原始問題換一種順序重現。
- **可信度：** 中高
- **等級：** P1
- **建議：** 二選一，請使用者裁決，因為兩者都牽涉 Out of Scope 或文件：
  - 只要 `_redirects` 出現在 staged 變更中，也依 staged snapshot 重產並 stage（這會推翻 Out of Scope 的 H07）。
  - 或在 `create:challenge` 的輸出與 E1 明講「要和新題目一起 commit」。

## R-4：hook 的產生結果會包含被 gitignore 的題目目錄
- **位置：** B2（spec.en.md:111）「derived only from the staged snapshot」；traceability.md:58、:142；程式碼 .gitignore:9、26、60、66、68、95、96，scripts/challenge-numbers.ts:70-77
- **違反：** B2 的保證。
- **證據：**
  - `git stash -u` 不會收走被忽略的檔案。
  - `.gitignore` 裡的 `logs/`、`tmp/`、`temp/`、`coverage/`、`dist/`、`target/`、`pkg/` 都沒有錨定，`platform/challenge/logs/` 會被忽略。
  - `logs` 符合 `SLUG_RE`，一道 log 注入題取這個名字很自然。
  - `slugsUnder` 讀的是檔案系統，會把這個被忽略的題目算進去。結果 staged 的 `_redirects` 有它的規則，commit 裡卻沒有這道題，CI guard（只看已追蹤的 slug）失敗。
- **影響：** 新增題目後 CI 失敗，只是發生在特定 slug 上。
- **可信度：** 機制高，實際發生頻率中低。
- **等級：** P1
- **建議：** hook 呼叫產生器時，用與 guard 相同的 `includeSlug`（取 index 中已追蹤的 slug）。這樣 hook 和 CI 的納入規則才真正一致。矩陣補一列「被忽略的題目目錄」。

## R-5：產生器 CLI 以腳本所在位置決定 root，S5 測試可能改寫真實 repo 的 `_redirects`
- **位置：** S5（traceability.md:36、spec.en.md:193-195）；程式碼 scripts/generate-redirects.ts:162-169
- **違反：** S4 明說要避免的「在真實樹上改寫已提交的 `_redirects`，同時 guard 正平行執行」。
- **證據：**
  - CLI 的 root 是 `resolve(dirname(import.meta.url), '..')`，不是 cwd。
  - S5 要求暫時 repo 裡放著「hook 呼叫的腳本」，同時要能用到套件。實作者為了避免複本過時，很可能用 symlink 指向真實的 `scripts/`。
  - Node 對 ESM main 預設會解析 symlink，於是 root 指回真實 repo，hook 就在 vitest 平行執行時改寫真實的 `_redirects`。
- **可信度：** 中
- **等級：** P1
- **建議：** 規定 hook 明確傳入 root（例如 `git rev-parse --show-toplevel`），並在 S5 加一條斷言：真實 repo 的 `_redirects` bytes 不變。

## R-6：`create:challenge` 的 status 1 多了新意思，但 wxl-create skill 仍把 1 當成名稱衝突
- **位置：** spec.en.md:76-81、AC-11（spec.en.md:139-142）、C04；sentence map（traceability.md:118-127）；程式碼 .claude/skills/wxl-create/SKILL.md:101-102、`SKILL.zhTW.md`:93（兩棵樹都有）
- **違反：** 這次改變 exit 語意後，沒有同步改到使用它的 skill。
- **證據：**
  - skill 寫的是「On exit code 1 (collision) … re-ask the slug and re-run」，驗證條件是「Exit code 0」。
  - C04 時骨架與 keygen 產物都留著，status 卻是 1。skill 會請老師換名稱重跑，因為樹仍不一致，每一輪都會失敗並多留一份骨架，同時消耗編號。
  - `create:challenge` 現在還會因為工作樹裡無關的半成品失敗（例如用 Finder 複製的資料夾編號重複，或沒有 number 的草稿），這是以前沒有的拒絕方式。
  - 兩棵樹的 `SKILL.zhTW.md` 都不在 sentence map 裡，會和 `SKILL.md` 不同步。
- **可信度：** 高
- **等級：** P1
- **建議：**
  - 產生失敗改用不同的 exit code，或在 wxl-create Step 2 依失敗原因分流處理。
  - 失敗訊息要告訴老師下一步（修好樹後直接 commit，hook 會重產）。
  - 把 `SKILL.zhTW.md` 納入 sentence map（Z1）。

## R-7：手機版 nav 第二列，長的頁面網址可能把題目標題擠到看不見
- **位置：** AC-8（spec.en.md:132-136）、S01-S03（traceability.md:195-197）；程式碼 MergedNav.vue:236-258（註解記錄 360px 時標題實測只剩 45px）
- **違反：** Story 7「readable on a phone」，以及 MergedNav 既有的版面取捨。
- **證據：**
  - 第二列的標題是 `flex-1 truncate`。頁面網址例如 `teacher.github.io/my-range/zh-TW/challenge/selected-excerpts/`，以 0.75em 等寬字大約 400px。
  - spec 只規定網址本身截斷、文件不橫向捲動，沒有規定誰先縮。標題可能被壓到 0。
  - AC-8 不檢查標題是否還看得到。
- **可信度：** 中
- **等級：** P1
- **建議：** S02 加斷言：在兩種 viewport 下，標題的 `clientWidth` 不小於某個門檻，或網址元素帶 `flex-shrink` 的優先順序。

## R-8：失敗時的清理不涵蓋中斷與 git 指令失敗
- **位置：** spec.en.md:86「Whatever happens」；traceability.md:139-144（outcome table 只有四列）；程式碼 pre-commit.sh:10
- **違反：** 這句全稱保證，以及 Story 3。
- **證據：**
  - `set -e` 之下，下列情況都會跳過 pop：產生階段按 Ctrl-C、`git add` 失敗（`index.lock` 被占用，或 `_redirects` 被忽略又未追蹤）、node 在 `||` 捕捉之前就崩潰。
  - 老師的未提交與未追蹤工作會被藏在 stash 裡。
  - 這次又讓觸發條件變寬（加上 zh-TW 樹），步驟也變多。
- **可信度：** 中
- **等級：** P2
- **建議：** 用 `trap … EXIT INT TERM` 確保一定 pop。outcome table 補一列「中斷或 git 指令失敗」。

## R-9：位置式 `git stash pop`，加上 `refs/stash` 在各 worktree 之間共用
- **位置：** AC-14、AC-15（spec.en.md:153-159）、B2「Outside the model」；pre-commit.sh:47；docs/agents/runtime.md:105-106（平行的 ticket worktree）
- **違反：** 「`git stash list` unchanged」這個保證。
- **證據：**
  - 如果 push 實際上沒存下任何東西，或另一個 worktree 同時在 commit，`pop` 會把老師自己較早的 stash entry 套用進工作樹。
  - fixture 若一開始 stash list 是空的，pop 錯 entry 這件事看不出來。
- **可信度：** 中低
- **等級：** P2
- **建議：** S5 的 fixture 預先放一個 stash entry。實作記下 stash 的 SHA，依 SHA 套用並 drop。

## R-10：D3 會無聲地覆蓋老師手改的 `_redirects`
- **位置：** D3（traceability.md:26）、B2「An unstaged version of `_redirects` is replaced」
- **違反：** 這是有意的取捨，但 spec 沒規定要通知老師。
- **證據：**
  - E2 明說「改名後網址失效」。Cloudflare 靶場的老師很自然會自己加一條「舊 slug 到新 slug」的轉址。
  - 下一次碰到題目的 commit，hook 會把這段內容丟掉，沒有任何訊息。沒 stage 的內容之後只剩 dangling stash commit 可以找回。
- **可信度：** 高
- **等級：** P2
- **建議：** 覆蓋時在 stderr 印出通知，並附上被丟掉內容的 diff。

## R-11：B1 沒列出「`CF_PAGES=1`，但 `SITE_ORIGIN` 指的不是 Cloudflare 站」這種情況
- **位置：** B1（spec.en.md:110）；traceability.md:64-79；README.md:214
- **違反：** B1 的「Does not protect」欄不完整。
- **證據：**
  - GitHub Pages 靶場另外接上 Cloudflare，或從 GitHub Pages 改到 Cloudflare 卻沒重跑 `fork:init --origin`：Cloudflare 的建置會給出 `https://<owner>.github.io/<repo>/c/001`，而 GitHub Pages 不讀 `_redirects`，打開是 404。
  - Cloudflare 的預覽部署則會複製出指向正式站的短連結。
- **可信度：** 中
- **等級：** P2
- **建議：** 在 B1 的「Does not protect」補上這種情況。

## R-12：V01 在 Cloudflare 預覽上驗到的其實是正式站
- **位置：** AC-20（spec.en.md:165）、V01（traceability.md:254）；shortLink.ts:18-26
- **違反：** stage 8 的驗證面要真的執行到被驗的行為（AGENTS.md hard rule 4）。
- **證據：** 複製出來的是 `SITE_ORIGIN`（`https://wxl.browserlab.online`）加 `/c/NNN`。「a copied short link opens its challenge」走的是正式站的 `_redirects`，不是 ticket 分支預覽上的那份。
- **可信度：** 高
- **等級：** P2
- **建議：** V01 改成兩步：在預覽上確認顯示與複製的文字；再把 path 接到預覽網域上開啟，驗證預覽自己的 `_redirects`。

## R-13：page mode 的 slug 沒有編碼規則
- **位置：** Link forms（traceability.md:81-97）、B4（spec.en.md:113）；create-challenge.ts:32（只有這裡強制 kebab-case）
- **違反：** spec 說頁面網址「opens on any static host」。
- **證據：**
  - 手動建立的目錄名稱可能含空白（Finder 的「拷貝」）、`#`、`?`、中文，或 `%2e%2e`。
  - `c.url` 是原樣字串，沒有編碼（VitePress contentLoader index.js:78）。
  - 複製出的網址貼到聊天工具時可能在空白處斷掉；`#` 會變成 fragment；`%2e%2e` 會被瀏覽器解成上一層。
  - validator 不檢查 slug 格式。
- **可信度：** 中
- **等級：** P2
- **建議：** 二選一：規定複製的網址對 slug 做 `encodeURIComponent`（並說清楚顯示文字和它的關係）；或讓 validator 拒絕不是 kebab-case 的 slug。

## R-14：截斷剛好藏掉 slug，觸控裝置也沒有 hover
- **位置：** Solution（spec.en.md:36）、Story 7、Q11
- **證據：**
  - 375 寬時，每列都會顯示成 `teacher.github.io/my-range/zh-TW/chal…`，唯一能區分題目的部分被截掉。
  - 手機沒有 hover，`title` 看不到。
- **可信度：** 高
- **等級：** P2
- **建議：** 考慮在中間截斷或保留尾段；或明列「手機上無法看到完整網址」為已接受成本。

## R-15：清單裡的網址文字位在列的 `<a>` 裡，點一下會跳頁，不是選取
- **位置：** AC-8 第四點（spec.en.md:136）、S03（traceability.md:197）；程式碼 ChallengeList.vue:390-439
- **證據：**
  - 網址的 span 在 `<a href>` 裡，自己沒有 click handler。點擊的預設動作是導覽到題目頁。
  - 要讓 AC 通過，實作者得在文字上加 `.prevent`，這會改掉列的點擊行為，spec 沒有決定這件事。
- **可信度：** 中
- **等級：** P2

## R-16：只改名或只封存英文目錄
- **位置：** H04（traceability.md:218）、H17（:231）、vocabulary「retiring」（:62）
- **證據：**
  - 只 `git mv` 英文目錄時，zh-TW 的舊 slug 與英文的新 slug 持有同一個號碼。產生器拒絕，commit 被擋。以前是本機能 commit、CI 才紅，現在本機就擋，而且訊息只講「號碼重複」。
  - 只封存英文目錄時，zh-TW 頁面仍上線，`/zh/c/NNN` 規則也留著。依推論，那頁缺 src 會壞掉。
  - AC-12 的「the challenge's rules go」只在兩棵樹都移動時才成立。
- **可信度：** 中低
- **等級：** P2

## R-17：hook 用的是工作樹的 `scripts/`，不是 staged 版本
- **位置：** B2；pre-commit.sh:26-29（stash 只涵蓋 `platform/`）
- **證據：** 產生器（`HEADER`、`formatRules`）在工作樹裡有未 stage 的修改時，staged 的 `_redirects` 和 commit 內的產生器不一致，CI 轉紅。這次 G02 改 header 時，上游自己就會碰到。
- **可信度：** 中
- **等級：** P2

## R-18：OQ-016 的關閉文字說得太滿；repo 改名後頁面網址會漂移
- **位置：** OPEN-QUESTIONS.md 新增段落（「so every range's button gives an address that opens」）；B4；README.md:214
- **證據：**
  - 這句和 B1（手動設定 `CF_PAGES`）、Q10（改名）、B4（`SITE_ORIGIN` 錯誤）自己列出的成本互相矛盾。
  - GitHub repo 改名後，`SITE_BASE` 會跟著 configure-pages 走，但 `SITE_ORIGIN` 是寫死的，頁面網址會 404。README 說「原始碼裡再也沒有任何路徑寫死」，對網址這件事並不成立。
- **可信度：** 中
- **等級：** P2
- **建議：** 改寫 OQ-016 的措辭，並把「repo 改名要重跑 fork:init」列為已知成本。

## R-19：unborn HEAD、merge 中等 git 狀態沒有列出
- **位置：** traceability.md:136
- **證據：**
  - 第一個 commit 時，如果有可 stash 的內容，`git stash` 在 unborn branch 上會失敗，commit 被拒。這是既有問題，但這次觸發條件變寬了。
  - 解完衝突的 merge commit 會觸發 hook，這對結果是好事，只是沒有測。
- **可信度：** 中低
- **等級：** P2

## R-20：mode 的測試替換點如果做成執行期全域變數，會留在正式站上
- **位置：** spec.en.md:65-66（「reads the mode in a way a test can replace without rebuilding」）
- **證據：** 如果用 `window.__…` 之類的全域覆寫，正式站上任何同源腳本都能切換按鈕要複製的內容。spec 沒禁止這種做法。
- **可信度：** 低
- **等級：** P2
- **建議：** 限定用 `vi.mock` 或 provide/inject 這類只在測試期存在的機制。

## R-21：fork:init 錨點的唯一性沒有 AC 守著
- **位置：** spec.en.md:99「Unchanged: fork:init」；程式碼 fork-init.ts:720、:989、:1000
- **證據：** 要在 `config.mts`、`shortLink.ts` 新增程式碼，但不能再多出符合下列 pattern 的行：`^export const SITE_ORIGIN = `、`^const siteBase = `、`^  title: .+,$`。否則 fork:init 會以「exactly one line」報錯。
- **可信度：** 低
- **等級：** P2

## R-22：stage 8 的實際操作風險
- **位置：** AC-20、AC-21；V03、V05
- **證據：**
  - 暫時 worktree 沒有 `node_modules` 時，hook 的 node 腳本無法 import `yaml`，commit 會被拒。
  - 「a temporary worktree of the ticket branch」上做的那個測試用題目 commit，可能落到 ticket 分支本身。
  - V05 刪除 repo 需要 gh 的 `delete_repo` scope，等於變更憑證權限。
- **可信度：** 中
- **等級：** P2

## R-23：作業系統與 git 版本
- **證據：** 「byte for byte」只在 ubuntu CI 驗過。老師的 Windows（Git Bash）與舊版 git 的 `stash --keep-index` 加 pathspec 加 `-u` 組合沒有驗證。不過 `.gitattributes` 的 `eol=lf` 已經處理了 CRLF。
- **可信度：** 低
- **等級：** P2

---

**合計：P0 0、P1 7（R-1～R-7）、P2 16（R-8～R-23）。**

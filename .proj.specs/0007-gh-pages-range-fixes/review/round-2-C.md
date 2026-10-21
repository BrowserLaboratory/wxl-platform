# Stage 3 第 2 輪：Completeness 面向（C）審查報告，epic 0007-gh-pages-range-fixes

**範圍確認**：我依凍結 prompt（`review/prompt.md`，blob 5cfa01c）審查工作樹中的 `spec.en.md`（父代理指定 blob 4485a99）與 `traceability.md`（blob 5629e8c），也讀了 `round2-scope.diff` 裡 `GLOSSARY.md` 和 `.proj.specs/OPEN-QUESTIONS.md` 尚未 commit 的修改。capture 列出的 untracked 檔都在 spec 目錄裡（含 `review/` 底下的紀錄），和父代理的說明一致。我沒有執行 git，Git 狀態全部以 capture 為準。我讀了 round 1 的 C 報告和 disposition，只在處置後仍留有缺口、或 rev 2 新增內容產生新缺口時才再提。

標示方式：「直接讀到」是我親眼看過的程式碼或文件；「推論」是依程式碼或 git 已知行為推導出來、沒有實際執行驗證的結論。

---

## P1

### C-1 commit forms 規則沒有定義什麼叫「repository's own index」；`-a` 和 `-p` 實際上也不是在 `.git/index` 上跑
- **位置**：`traceability.md:214-217`（Commit forms）、`:336-338`（H31–H33）；`spec.en.md:116-117`、`:215-220`（AC-22）。
- **違反**：規則能產生的每個 {commit 形式 × index 檔} 組合都要走到一條 AC。矩陣列的期望也不能和規則互相矛盾。
- **證據**：
  - 推論（依 git `builtin/commit.c` 的 `prepare_index`）：`git commit -a`、`git commit -p` 和 `git commit -i <paths>` 執行 pre-commit 時，`GIT_INDEX_FILE` 指向 `<gitdir>/index.lock`，而真正的 index 這時被 git 本身鎖住。只有沒帶旗標的 as-is commit（含 `--amend`）用的是 `<gitdir>/index`。pathspec／`--only` 用的則是 `<gitdir>/next-index-<pid>.lock`。
  - 規則寫的是「`-a`、`-p`、`--amend` runs the hook on the repository's own index」，但從 hook 看得到的東西，`-a`／`-p` 跟 pathspec 一樣都是「另一個 index 檔」。實作者如果拿 `$GIT_INDEX_FILE` 和 `git rev-parse --git-path index` 比對，就會拒絕 `-a`（H31 擋得到）和 `-p`（沒有任何列擋得到）。
  - 矩陣沒有 `-p`、`-i <paths>`、`--only` 的列。另外，`-a`／`-p` 期間 `.git/index.lock` 一直存在，正好是 H26 用來製造失敗的狀態。這種交互作用也沒有寫進規格。
- **影響**：區分「拒絕」和「照 O1–O6 走」的判準沒有寫出來，`-p` 這條常用路徑沒有驗收出口。
- **信心**：中高（git 原始碼行為我記得很清楚，但沒有在這裡實際執行）。
- **建議**：用可觀察的條件定義判準，例如「`GIT_INDEX_FILE` 未設、等於 `git rev-parse --git-path index`，或等於它加上 `.lock`」。另外新增 `-p`、`-i <path>`、`--only <path>` 三列。

### C-2 沒有 HEAD 的列（H27、H28）做不出 H 段要求的 fixture，AC-23 寫明的條件也無法成立
- **位置**：`traceability.md:48`（S5：committed `_redirects`、預先存在的 stash entry）、`:299-302`（「Every H row starts from S5's fixture…」）、`:332-335`（H27–H30）；`spec.en.md:224`（AC-23「In every hook case, the stash entry made before the run is still listed」）。
- **違反**：矩陣列的前提和 spec 的規則互相矛盾。
- **證據**：推論（git 行為）：還沒有任何 commit 的 repo 沒有 committed `_redirects`，`git stash` 也會失敗（「You do not have the initial commit yet」）。所以 H27/H28 不可能「starts from S5's fixture」，H29（「every H row」）和 AC-23 的最後一條在這兩列也不可能成立。
- **影響**：照字面寫的測試無法建立。如果實作者自行豁免，那個豁免也沒有規格依據。
- **信心**：高。
- **建議**：H 段的前言和 H29/AC-23 明文排除 H27/H28，並為這兩列另外定義 fixture（例如：未 commit、只有 `platform/public/` 的空 repo）。

### C-3 nav 裡網址文字的寬度沒有下限：依 D7 讓寬後可以縮到 0，S07 照樣通過
- **位置**：`traceability.md:281`（S07）、`:276`（S02 的「each visible control」）；`spec.en.md:173`；US-7（`spec.en.md:64`）；`MergedNav.vue:236-258`（手機第 2 列的標題是 `truncate flex-1`）。
- **違反**：有一個邊界（網址文字的 clientWidth 為 0）沒有期望行為；US-7 的「address on screen」也沒有驗收出口。
- **證據**：
  - 直接讀到：S07 的條件是「title clientWidth ≥ min(title scrollWidth, URL clientWidth)」。
  - 推論：URL 的 clientWidth 等於 0 時，右邊是 0，條件一定成立。S02 只規範「Where it overflows」的情況，沒有「至少看得到一部分」的要求。
  - 直接讀到：`MergedNav.vue:253-256` 的註解記錄了 360px 下這一列幾乎沒有空間。
- **影響**：手機上網址可能完全看不到，「點一下文字選取」這條退路（Further Notes 指名的手機取得方式）也點不到。
- **信心**：中。
- **建議**：加一列規定網址文字的最小可見寬度（例如 clientWidth ≥ 某個 px 值，或至少要露出 host），或明文接受「可以縮到看不見」並寫進 Further Notes。

---

## P2

### C-4 sentence map 的列數和 T01/T02 不一致
- **位置**：`traceability.md:151-162`（sentence map）、`:359-360`（T01「the six English rows」、T02「the four Traditional Chinese rows」）。
- **證據**：直接讀到：map 裡 E1 有 5 列（兩棵樹的 wxl-create `SKILL.md`、`challenge-pipeline.md`、`README.en.md`、`_redirects`），Z1 也有 5 列（兩個 `SKILL.zhTW.md`、`README.md`、兩個 wxl-fork-init）。和 T01、T02 寫的 6 列、4 列都對不上。
- **影響**：照 T 列的數量寫測試會失敗，或者會漏檔。
- **信心**：高。
- **建議**：改成 5／5，或改成直接引用 map，不寫數字。

### C-5 S3 沒有涵蓋「已完成」標記出現的狀態，也沒有涵蓋 lg 斷點最窄的 1024 寬
- **位置**：`traceability.md:46`、`:270-271`、`:281`；`MergedNav.vue:118`、`:145-150`、`:194`、`:258`。
- **證據**：
  - 直接讀到：完成標記（`ChallengeDoneBadge`）會出現在 nav 兩列，和標題、網址爭寬度；S3 各列沒有「學習者已完成該題」這個狀態。
  - 直接讀到：從 lg 起，返回連結文字和筆記按鈕的文字都會顯示，所以 1024 寬比 1280 擠。S3 的 viewport 只有 768 和 1280。
- **影響**：D7 和 S01 在最擠的組合下沒有驗證。
- **信心**：中。
- **建議**：S01/S02/S07 加上「completed」這個狀態，viewport 加上 1024×768。

### C-6 US-9（現有靶場升級後就能拿到修正）沒有任何 AC；pre-0007 靶場的 `_redirects` 狀態也沒有列
- **位置**：`spec.en.md:66`（US-9）、`:48`；`traceability.md:23`（Q7/Q8「An existing range gets the change by upgrading」）、`:347`（G02 只寫上游的情況）；`generate-redirects.ts:34-48`（header）。
- **證據**：
  - 直接讀到：產生器的 header 會改成含 E1，所以每個既有靶場 commit 進去的 `_redirects` 都會跟新的產生器不一致。
  - 直接讀到：0006 的升級還在 ticket 階段（`T-0027` 的 status 是 `todo`），今天的升級只能手動 merge。
  - 推論：靶場吸收 0007 的那一個 commit 如果沒有把 `_redirects` 帶進 staged change，CI 就會失敗；如果有帶，hook 會依 D5 修好。兩種情況都沒有列。
- **影響**：工作坊老師升級之後 CI 會不會是綠的，沒有驗收出口。
- **信心**：中。
- **建議**：新增一列「pre-0007 的靶場吸收 0007（merge 或升級），commit 裡的 `_redirects` 等於 expected」，並讓 US-9 對應到一條 AC。

### C-7 P3 漏了 create-wxl 和 fork-init.ts 把 origin 稱為「短連結網址」的地方
- **位置**：`traceability.md:182`（P3 只列了 README 和 wxl-fork-init）；`create-wxl/src/messages.mjs:229`（`short link origin:`）、`:304`（`短連結網址：`）、`create-wxl/src/questions.mjs:200`；`scripts/fork-init.ts:21`、`:31`（「the short-link origin (A8)」）。
- **證據**：直接讀到上面幾行。V04 用 `--host github-pages` 跑 create-wxl 時，畫面會印出「短連結網址」，但這種靶場根本不會給出短連結。
- **影響**：新的「每一條複製連結的 origin」說法沒有同步到 create-wxl 的介面文字。`Unchanged` 清單也沒有說 create-wxl 刻意不動。
- **信心**：高。
- **建議**：P3 補上這幾處；如果刻意不改（要重新發布 create-wxl），就在 Out of Scope 寫明。

### C-8 文件指示老師手改 `SITE_ORIGIN`，但「不符合 origin grammar」這個邊界沒有列
- **位置**：`.claude/skills/wxl-fork-init/SKILL.md:97`（「只有完全沒帶 `--origin` 也沒帶 `--host` 時才需要自己手改」）；`traceability.md:69`；`spec.en.md:145`（B4「fork:init-validated」）。
- **證據**：直接讀到：手改是文件寫明的一條路，所以 `SITE_ORIGIN` 不一定經過 fork:init 驗證。推論：值帶結尾斜線時，page URL 會變成 `…/repo//challenge/<slug>/`；缺 scheme 或用 `http://` 時，顯示規則 `^[a-z]+://` 也會跟著出現不同結果。
- **影響**：B4 低估了可能的輸入。page mode 比 short mode 更依賴這個值。
- **信心**：中。
- **建議**：加一列（接受並記錄，或由 helper 正規化），或把 B4 改寫成「fork:init 驗證過，或老師手改」。

### C-9 O2 的「stderr 指名被取代」條件和工作樹實際的變化對不上
- **位置**：`traceability.md:208`（O2）、`:315-316`（H10、H11）、`:336`（H31）。
- **證據**（推論）：
  - 規則只在「hook 執行前，工作樹的 `_redirects` 和 staged 版本不同」時提示。
  - H11（staged 了手改版，工作樹和它一樣）和 H31（`-a` 之後工作樹等於 staged，但裡面含未追蹤題目的規則）兩種情況，工作樹內容都會被改掉，卻不會有提示。
  - 反過來，工作樹的版本剛好等於 expected 時（常見情境：`pnpm dev`／`pnpm build` 才剛重新產生過），內容其實沒變，卻會提示「replaced」。
  - H11/H31 都沒寫 stderr 的期望；也沒有「unstaged 的 `_redirects` 等於 expected」這一列。
- **信心**：中。
- **建議**：把條件改成「hook 結束後工作樹的 bytes 和執行前不同」，並在 H11/H31 和新增列裡寫明 stderr 的期望。

### C-10 會建立 commit 但不跑 pre-commit 的指令沒有列
- **位置**：`traceability.md:321`（H16 只列 `--no-verify` 和沒裝 hook）、`:340`（H35 只涵蓋「有衝突、最後用 `git commit` 結束」）；`spec.en.md:281`（「A merge that brings two challenges with one number ends in O4」）、`:143`（B2）。
- **證據**：
  - git 文件：沒有衝突的 `git merge`／`git pull` 跑的是 `pre-merge-commit`，不是 `pre-commit`。
  - 推論：`cherry-pick`、`revert`、`rebase`（含衝突後的 `--continue`）、`git am`，以及 GitHub 網頁上的編輯和 merge，都不會跑這個 hook。
  - Out of Scope 那句話只在 merge 有衝突時才成立。
- **影響**：多位老師協作時，`_redirects` 有一些路徑只能靠 CI 抓。這些路徑沒有被寫進 B2/B3 的「Does not protect」。
- **信心**：中（merge 的部分高，其餘中）。
- **建議**：在 H16/B2 列出這些指令，交給 B3；並把 Out of Scope 那句限定為「resolved conflict concluded with `git commit`」。

### C-11 linked worktree 這個 repo 狀態沒有列，V03 卻正好在 linked worktree 裡跑
- **位置**：`traceability.md:48`（S5 是普通 repo 的頂層）、`:371`（V03）、`:334`（H29）。
- **證據**（推論）：
  - linked worktree 的 index 在 `<common>/worktrees/<name>/index`，`.git` 是檔案而不是目錄（S5 寫的是「`.git/` excluded」）。
  - `refs/stash` 是所有 worktree 共用的。
  - simple-git-hooks 在 linked worktree 裡安裝 hook 的行為沒有驗證過。
  - C-1 的「own index」判準在這裡也要成立。
- **信心**：中低。
- **建議**：S5 加一個 linked worktree 的案例（至少 O2 和 H29），或把 V03 改成獨立 clone。

### C-12 作業系統、路徑、訊號和工具的邊界仍有缺口；「O1–O6 cover every way a run ends」說得太滿
- **位置**：`spec.en.md:113`、`:275`（Out of Scope 只排除 Windows）；`traceability.md:198`（「on every exit」）；`.github/workflows/quality-gates.yml:18`（test job 只跑 ubuntu）；`pre-commit.sh:33-37`（註解刻意相容 bash 3.2）。
- **證據**：
  - macOS（bash 3.2、BSD 工具）既沒有被排除，也沒有任何列涵蓋，而 rev 2 新增了 trap 和依 commit id 處理 stash。
  - S5 的暫存 repo 路徑沒有空白、也沒有非 ASCII 字元；台灣老師常把專案放在中文資料夾。
  - 推論：SIGHUP（關掉終端機或 IDE 取消）沒有列；SIGKILL 根本無法攔截。
  - 推論：找不到 node 時的結束碼是 127，不是 O4 寫的 1。只有繁中變動時，產生器會是第一支執行的 node 程式。
- **信心**：中。
- **建議**：S5 fixture 的路徑加上空白和中文；Out of Scope 明列 macOS 或 SIGKILL 的處理方式；把「every way」改成實際列舉的範圍。

### C-13 slug grammar 允許 `.gitignore` 會忽略的名稱
- **位置**：`traceability.md:72`；`create-challenge.ts:32`；`.gitignore:9,26,60,66,68,95,96`（`dist/`、`logs/`、`coverage/`、`target/`、`pkg/`、`tmp/`、`temp/`）。
- **證據**：直接讀到這些忽略規則不限層級。推論：`create:challenge --name dist` 會建出 git 不追蹤的題目，C01 還會把它的規則寫進工作樹的 `_redirects`；hook 依 index slugs 會把它排除。H20 只把 `logs/` 當成「非題目」的被忽略目錄，沒有考慮老師把題目取成這種名字。
- **信心**：中。
- **建議**：加一列（create:challenge 拒絕這類名稱，或接受並記錄成已知代價）。

### C-14 「index slugs」和 guard 的 tracked slugs 定義不同，但 checks 表說兩者是同一規則
- **位置**：`traceability.md:79-80`、`:423`；`redirects-generated.test.ts:156-167`。
- **證據**：直接讀到：guard 只認 `<slug>/index.md` 這個路徑被追蹤；index slugs 則是「at least one path in the index」。推論：如果一個 slug 的其他檔案有追蹤，而 `index.md` 被忽略但在磁碟上，hook 會把它算進去、guard 不會，CI 就會失敗。
- **信心**：低（情境刻意設計出來的成分高）。
- **建議**：index slugs 直接改用和 guard 相同的 `index.md` 判準。

### C-15 E1 的修復指令遇到工作樹裡有不一致的未追蹤草稿時會失敗，這個情況沒有列
- **位置**：`traceability.md:144`（E1）、`:339`（H34）；`generate-redirects.ts:167-179`（CLI 對整個工作樹產生，沒有 `includeSlug`）。
- **證據**：推論：未追蹤的草稿沒有 number 時，`pnpm redirects:generate` 會 exit 1，老師照文件做會卡住。其實只要 stage 任何 `_redirects` 變更，D5 都會觸發 hook 去重新產生，但文件沒有給這條路。
- **信心**：中。
- **建議**：H34 加一個有不一致草稿的變體，並寫明期望（例如訊息指出是哪個草稿）。

### C-16 create:challenge 的寫檔失敗，以及透過 `pnpm` 看到的結束碼，都沒有列
- **位置**：`traceability.md:288-295`、`:426`（「`pnpm` forwards the status」）；`spec.en.md:96-104`；`generate-redirects.ts:153-157`。
- **證據**：
  - 推論：`platform/public/` 不存在，或 `_redirects` 唯讀時，`writeRedirects` 會丟出 ENOENT／EACCES。這發生在 scaffold 已經建立之後，結束碼沒有規格（1、2 或其他）。
  - S4 只觀察 exported entry 的回傳值；wxl-create 依賴的是 `pnpm create:challenge` 的結束碼。「pnpm 會轉傳 2」這件事沒有任何列驗證（工具版本這個維度）。
- **信心**：中低。
- **建議**：加寫檔失敗的列；在 V03 或某個 CLI 層級的列確認 `pnpm create:challenge` 回傳 2。

### C-17 只刪除或只改名繁中說明頁仍然沒有列
- **位置**：`traceability.md:326-327`（H21、H22 都是只動英文）；disposition 的 C-8。
- **證據**：推論：只改名繁中目錄時，因為沒有 `platform/challenge/` 路徑，validator 不會執行，O4 完全由產生器造成，和 H22 走的是不同程式路徑；只刪繁中時，`/zh/c/NNN` 規則要移除。
- **信心**：中。
- **建議**：各加一列，或在 H21/H22 寫明「兩個語系各一例」。

### C-18 Out of Scope 說「copy_failed 時的版面這個 epic 沒改」，這和實際改動不符
- **位置**：`spec.en.md:277`；`ShortLinkShare.vue:96-101`（狀態文字和網址文字在同一個 inline-flex 裡）。
- **證據**：推論：這個 epic 改了網址文字的盒子模型、截斷方式和寬度優先順序（D7），所以 copy_failed 文字出現時的版面也跟著變了。US-7 說的「複製失敗時手動選取」正好就是這個狀態。
- **信心**：中。
- **建議**：S01/S03 加上「copy_failed 顯示中」這個狀態，或改寫 Out of Scope 的理由。

### C-19 建好的網站在 short mode 下沒有自動化測試
- **位置**：`spec.en.md:245-248`；`traceability.md:369`（V01）。
- **證據**：直接讀到：CI 建置時沒有 `CF_PAGES`，所以 S3 只涵蓋 page mode。推論：上游正式站用的 short mode，在建好的網站層級（SSR、hydration、版面）只在 stage 8 驗證一次，之後退化不會被抓到。
- **信心**：中。
- **建議**：smoke 另外建一份 `CF_PAGES=1` 的輸出，至少跑 S02/S04，或記錄成已知代價。

### C-20 瀏覽器引擎只有 Chromium，但 US-7 和 D4 鎖定的是手機
- **位置**：`playwright.site.config.ts:56-61`（只有 `Desktop Chrome`）；`traceability.md:277`（S03）；`spec.en.md:290`（「a tap on the URL text」）。
- **證據**：推論：iOS Safari／WebKit 上「點一下選取全部」和 `text-overflow` 的行為沒有任何列或 V 列驗證；V02 用的也是 Chromium。
- **信心**：中低。
- **建議**：S3 加一個 WebKit 加觸控（`hasTouch`）的案例，或在 V02 加一台實機。

### C-21 X 範例的範圍說法不一致，L09 在 S8 的期望也不清楚
- **位置**：`traceability.md:130`（「Examples X1–X5 are test cases at S8」）和 `:133-140`（表裡有 X6）、`spec.en.md:235`（X1–X6）；`:244`（L09）、`:383`（AC-5 的 seam 是 S8 和 S2）。
- **證據**：直接讀到上面的不一致。L09 的「renders nothing」和「`"7"` 先用 `Number()` 轉換」是元件的規則；helper 的介面型別和它在 S8 上的期望（是否接受字串、回傳 none）沒有寫。
- **信心**：高（不一致的部分）／中（L09）。
- **建議**：`:130` 改成 X1–X6；L09 拆成 S8 和 S2 兩種期望。

### C-22 舊式扁平題目（`challenge/<slug>.md`）不適用 page URL 的形式
- **位置**：`traceability.md:71`；`ChallengeLayout.vue:44-46`（flat fallback）、`create-challenge.ts:127-135`（legacy）、`ChallengeList.vue:104-107`（slugOf 會去掉 `.html`）。
- **證據**：推論：扁平頁面在 `cleanUrls` 下的網址是 `/challenge/<slug>`，link form 卻給出 `/challenge/<slug>/`，在 GitHub Pages 上會 404。
- **信心**：低（目前樹裡沒有扁平題目）。
- **建議**：寫明 page mode 只支援 per-folder 題目，或加一列。

### C-23 在列表裡用滑鼠中鍵（auxclick）點網址文字仍會開題目
- **位置**：`traceability.md:252`（L17）、`:277`（S03）。
- **證據**：推論：D4 只攔下 `click`；中鍵點擊觸發的是 `auxclick`，外層的 `<a>` 會在新分頁開題目頁。
- **信心**：低。
- **建議**：寫明接受這個行為，或加一列。

### C-24 V05 沒有在部署後驗證新題目複製出來的網址打不打得開
- **位置**：`traceability.md:372-373`；`spec.en.md:67`（US-10「the teacher's original scenario rerun」）。
- **證據**：直接讀到：V04 驗的是既有示範題，V05 只驗 CI。工作坊的原始情境是「新增題目、推上去、複製連結」，同一道新題目的整條流程沒有被驗到。
- **信心**：中。
- **建議**：V05 推上去之後再部署一次，從列表複製新題目的網址並打開它（英文網址用英文偏好的 profile）。

### C-25 mode rule 列舉的主機沒有 Cloudflare Workers（static assets）
- **位置**：`traceability.md:98-107`。
- **證據**：推論：Cloudflare 現在的主控台預設把新專案導向 Workers Builds，那裡設的是 `WORKERS_CI`，不是 `CF_PAGES`；Workers 也會讀 `_redirects`。照 README 操作的老師可能拿到的是 page URL。
- **信心**：低。
- **建議**：在清單裡點名，並寫明是接受的代價。

### C-26 S5 的隔離沒有清掉 `GIT_DIR`、`GIT_INDEX_FILE`、`GIT_WORK_TREE`
- **位置**：`traceability.md:48`（只隔離了 `HOME` 和 `GIT_CONFIG_GLOBAL`）。
- **證據**：推論：如果測試是從 git hook 的環境裡啟動（例如某個 hook 或工具會匯出這些變數），暫存 repo 裡的 git 指令會作用到真正的 repo。H30 只檢查 `_redirects` 一個檔。
- **信心**：低。
- **建議**：S5 的環境明文清除 `GIT_*` 變數。

### C-27 stash 之後空目錄不會被還原
- **位置**：`spec.en.md:40-41`（「left exactly as it was」）；`traceability.md:211`、`:323`（H09）。
- **證據**：推論：`git stash push -u -- platform/` 會用 `git clean -d` 清掉未追蹤的目錄，空目錄沒有內容可以還原。矩陣只承諾「files」。
- **信心**：低。
- **建議**：寫明不保證空目錄，或加一列。

### C-28 「產生時用的是 staged 版本」這個核心性質，沒有一列直接驗證
- **位置**：`traceability.md:196`、`:323`（H09 只驗還原）。
- **證據**：推論：已追蹤題目的 `index.md` 有 unstaged 的 number 修改，同時 stage 了另一個變更時，staged 的 `_redirects` 應該用 index 裡的 number；目前沒有任何列觀察這件事。
- **信心**：中。
- **建議**：新增這一列。

### C-29 S3 依賴示範題 `selected-excerpts`，題目被刪除或退役的靶場會跑不過
- **位置**：`traceability.md:270-271`、`:266`（N07）。
- **證據**：直接讀到：除了 S08，其他 S 列在每個靶場都會跑。既有的 smoke 已經依賴 `door-is-open`（`site-smoke.spec.ts:24`），所以這是沿用既有做法。但 Charter 允許老師移除示範題，這個邊界沒有列。
- **信心**：中低。
- **建議**：寫明是沿用既有依賴的已知代價，或改成取列表上的第一道題目。

---

**檢查過的內容**：
- spec 與 traceability：所有決策、seam、vocabulary、mode rule、link forms、X1–X6、sentence map、match rule、P1–P7、hook 的 trigger、約束、O1–O6、commit forms、全部 M/L/N/S/C/H/G/F/T/V 列、AC 索引（逐列核對過 AC 對照，沒有孤兒列或孤兒 AC），以及 checks 表。
- 程式碼：`pre-commit.sh`、`generate-redirects.ts`、`challenge-numbers.ts`、`create-challenge.ts`、`challenge-lint-staged.ts`（參數為空時 exit 0）、`shortLink.ts`、`ShortLinkShare.vue`、`ChallengeList.vue`、`MergedNav.vue`、`ChallengeLayout.vue`、`.vitepress/config.mts`、`.vitepress/theme/i18n/index.ts`、`platform/shared/challenges.zh-TW.data.ts`、`challenges.data.ts`、`scripts/fork-init.ts`、create-wxl 的 `messages.mjs` 與 `questions.mjs`。
- 設定：`package.json`、`.gitignore`、`playwright.site.config.ts`、`quality-gates.yml`、`release.yml`、`deploy.yml.template`。
- 測試：`pre-commit-sh.test.ts`、`redirects-generated.test.ts`、`tests/site-smoke/`。
- 文件：`README.md`／`README.en.md`、`CONTRIBUTE.md`、`challenge-pipeline.md`、wxl-create 與 wxl-fork-init 的 skill、`GLOSSARY` 與 `OPEN-QUESTIONS` 的 diff、round 1 的 C 報告與 disposition、0006 的 T-0027。

P0：0；P1：3（C-1 至 C-3）；P2：26（C-4 至 C-29）

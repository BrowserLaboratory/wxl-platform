# Stage 3 round 1：軸 4「紅隊」（R）— epic 0004

審查版本：spec.en.md blob `0972dc4de1a875a86be737c62b9abb89e81eea7d`、traceability.md blob `ce8bb855b29b3bbcf5b94047f33aea837c565ede`，HEAD `c0f7edf`，凍結 prompt `review/prompt.md` blob `b460b2d112e2e394c4f628fc3fdfc29864dc8fc2`。reviewer：`harness-reviewer`（只讀檔案，沒有 shell；blob hash 由 parent 以 `git hash-object` 驗證）。以下為 reviewer 報告原文，只把本機絕對路徑改成 repo 相對路徑。

---

# 紅隊審查報告（軸 4：Red team）：0004-stateless-engine，round 1

**審查範圍**：工作樹中的 `.proj.specs/0004-stateless-engine/spec.en.md` 與 `traceability.md`，以及 HEAD 上被 spec 修改的程式碼。

**範圍限制**：我只有讀檔工具，沒有 Bash 或 git，所以無法確認工作樹檔案的 blob hash 是否就是 `0972dc4…`／`ce8bb85…`，也無法確認 HEAD 是否為 `c0f7edf`。這兩項請 parent 自行比對。

---

### R-1 known-old-outputs 的 Git 歷史檢查在 CI 的淺層 checkout 下會失敗，或空洞地通過
- **位置**：traceability.md:173（T27）、:215（T69）、:218（T72）；spec.en.md:151-154；`.github/workflows/quality-gates.yml:21-22`
- **違反的保證**：「An upstream-only test checks the list against the template's Git history, so a later template change must add its predecessor」，以及 T69「pass on upstream's HEAD after this epic」。
- **證據**：
  - 直接讀到的：`test` job 的 `actions/checkout` 沒有設 `fetch-depth`，預設是 1。T72 列出的新 cross-OS job 步驟也沒有提到 `fetch-depth`。`pnpm test --run` 會把 `upstream-guard.test.ts` 一起跑。
  - 推論：淺層 clone 裡看不到 `72327e2`。實作若用 `git show 72327e2:…` 會直接報錯，upstream CI 變紅，與 T69 衝突。實作若只列舉看得到的歷史版本，就只剩目前版本，「每個舊版都在清單中」永遠成立。
- **影響**：會落入兩種情況之一。一是 upstream CI 變紅；二是這項保證在 CI 裡完全失效，下一次改範本時漏加前一版的 hash 也不會被擋下。漏加之後，舊範本裝出的 workflow 在 `--host` 下會被歸類為 other，不會被取代。另外，老師在 fork:init 之前用 `git clone --depth 1` 或「Use this template」建立的 repo 在本機跑測試時，上游判定會成立，結果同樣紅掉。
- **信心**：高
- **等級**：P1
- **建議**：
  - 在 T72 與 `test` job 寫明 `fetch-depth: 0`；或讓測試偵測 `git rev-parse --is-shallow-repository`，是淺層就明確失敗。
  - 斷言 `72327e2` 可以取得。
  - 在 T27 寫明，歷史不完整時的行為是「失敗」而不是「略過」。

### R-2 「Sets SITE_BASE」不看值，`--host github-pages` 會讓寫死的上游路徑生效
- **位置**：traceability.md:80-81（Sets SITE_BASE）、:165（T19）、:168（T22）、:172（T26）；spec.en.md:158-163
- **違反的保證**：B2，以及 spec 的 Solution「A GitHub Pages range's base path is decided when the site is deployed, from GitHub's own Pages configuration」。
- **證據**：
  - 直接讀到的：`tests/unit/workflows/fixtures/upstream-deploy.yml:98` 是上游舊的 deploy.yml，內容為 `SITE_BASE: /wxl-platform/`。`fork-template-parity.test.ts:129-131` 的註解寫明「a copied SITE_BASE would hardcode the UPSTREAM path into every fork's asset URLs」。舊引擎遇到既有的 deploy.yml 一律不覆蓋（`scripts/fork-init.ts:332-339`）。
  - 推論：在上游刪掉 deploy.yml 之前 fork 的靶場，至今仍帶著這個檔案。舊引擎過去把 base 寫成字面值，所以這個環境變數不起作用。新引擎跑 `--host github-pages` 時，這個 workflow 符合「other that sets SITE_BASE」，只會得到 `left untouched` 警告；同時 A9 被重設為上游形式（T19），`SITE_BASE=/wxl-platform/` 於是生效。不帶 `--host` 的路徑（T26）則因為 workflow「有設 SITE_BASE」而完全不警告。
- **影響**：老師網站的所有資源 404，警告不會提到 404，也不會提到值不對。
- **信心**：中。現實中有多少這類靶場無法確認。
- **等級**：P1
- **建議**：
  - 把 `upstream-deploy.yml` 的 LF-normalised SHA-256 加入 known old outputs，讓它被取代；
  - 或把「Sets SITE_BASE」改成「值正好是 `${{ steps.pages.outputs.base_path }}/`」，其他值都發 404 警告。

### R-3 殘留暫存檔的清除與「任何錯誤都不寫入」互相矛盾，清除範圍也沒有界定
- **位置**：spec.en.md:96-99；traceability.md:200（T54）、:201（T55）；spec.en.md:206（B2）
- **違反的保證**：T54「Any argument or tree error → Nothing written」與 T55「removed at the start of the run」；B2「writes are confined to A1–A9, the workflow and the engine's own temporary files」。
- **證據**：直接讀 spec，以下為推論。
  1. 如果在執行開始時就刪除殘留檔，之後才遇到 tree error，就已經寫入了東西（刪除也算寫入），違反 T54。
  2. anchor mode 不走訪整棵樹，所以只會看 A1–A9 與 workflow 旁邊的殘留檔。被中斷的 rebrand 執行可能在任何文字檔旁留下暫存檔，這些檔案在 anchor mode 下永遠不會被清掉。反過來，如果 anchor mode 為了清除而走訪全樹、刪掉所有 `*.fork-init-tmp`，就超出 B2 的白名單。
  3. 兩個執行並行時，後啟動的那個會刪掉前一個正在寫的暫存檔，前一個的 rename 就會 ENOENT。0005 create-wxl 會建在這個引擎上。
  4. `.gitignore` 沒有加 `*.fork-init-tmp`，殘留檔可能被 `git add -A` commit 進去。
- **影響**：清除失敗或刪錯檔的保證只靠實作者自行詮釋。
- **信心**：高
- **等級**：P1
- **建議**：
  - 明訂清除集合：anchor mode 是 A1–A9 的檔案加上 workflow，rebrand mode 是走訪集合。
  - 清除放在所有檢查通過之後，dry-run 不清除。
  - 寫入時用 exclusive create（`wx`）。
  - 在 `.gitignore` 加上 `*.fork-init-tmp`。

### R-4 暫存檔加 rename 會改變檔案語意（symlink、hardlink、權限位元）
- **位置**：spec.en.md:97-98、:131-134（rebrand 也走暫存檔）；traceability.md:197（T51）
- **違反的保證**：AC-B2「rebrand behaves as today」；B2 的「Outside the model」只排除了 workflow 是 symlink 的情況。
- **證據**：
  - 推論：今天的 `writeFileSync` 會跟隨 symlink、保留 inode 與 mode。tmp 加 rename 會把 symlink 換成一般檔案、切斷 hardlink、mode 變成 umask 預設。rebrand 會對走訪到的每個檔案這樣做。
  - 直接 grep 到的：目前帶 shebang 的可執行檔（`scripts/pre-commit.sh`、`scripts/prose-audit/*.py`、`scripts/verify-project.py`）都不含 rebrand key 或上游 slug，所以目前只是理論風險。
- **影響**：git diff 會出現 mode 100755→100644，或 symlink 變成一般檔案。
- **信心**：中
- **等級**：P2
- **建議**：rename 前複製原檔 mode；用 `lstat` 檢查到 symlink 時，報錯或寫入其目標。

### R-5 寫入途中發生 I/O 錯誤時的結果與 CLI 行為沒有定義
- **位置**：spec.en.md:87-99；traceability.md:199-201
- **違反的保證**：AC-E1「a tree error returns exitCode 1 with a message」只涵蓋計算期的錯誤。
- **證據**（推論）：Windows 上 Defender、索引服務或編輯器持有檔案時，`renameSync` 會間歇性出現 EPERM/EBUSY（graceful-fs 就是為此而重試）；另外還有 ENOSPC、EACCES。發生時會丟出未捕捉的 stack trace，樹處於半套用狀態，暫存檔殘留。T72 的 Windows job 可能因此不穩定。
- **影響**：老師看到的是 stack trace，不是「請重跑」的訊息。T6 的收斂只能事後修復，CLI 契約沒有涵蓋這種情況。
- **信心**：中
- **等級**：P2
- **建議**：捕捉寫入期的錯誤，回傳 exitCode 1 與已寫入的檔案清單，並提示用相同參數重跑；Windows 上可考慮短暫重試。

### R-6 upstream-only 測試會無聲略過，沒有證明它們真的有跑的對照
- **位置**：spec.en.md:183-189、:207（B3）；traceability.md:211-212（T65、T66）、:215（T69）、:217（T71）
- **違反的保證**：B3 與 B4 的保護。
- **證據**：
  - 推論：判定函式本身有 fixture 測試，但「真實環境中讀到的值」沒有。例如環境變數名稱打錯，或測試 runner 隔離了 env，判定就恆為 false，guard、pristine、T27 全部略過，CI 仍然綠燈。
  - 此外，T65 在測試中要求精確比對，而 GitHub Actions 的 `==` 字串比較不分大小寫。若組織名稱只改大小寫，`if:` 的 job 照跑，測試卻全部略過。
- **影響**：防止引擎在 upstream 上被誤跑的保護（B4）可能在沒人察覺時消失。
- **信心**：中
- **等級**：P2
- **建議**：在 upstream-only 的 cross-OS job 設定一個旗標（例如 `WXL_EXPECT_UPSTREAM=1`），旗標存在但判定為 false 時讓測試失敗。

### R-7 pristine 檢查沒有涵蓋 A2–A5，也沒有涵蓋 deploy.yml 不存在
- **位置**：traceability.md:213（T67）；spec.en.md:187-189、:208（B4）
- **違反的保證**：B4「The upstream-pristine test fails in upstream CI」。
- **證據**（推論）：T67 只比較 A1、A6–A9、license、author、version。假設在 upstream 誤跑了一次（不帶 `--host`，會安裝 deploy.yml），維護者只還原了最顯眼的 package.json，其餘變更（README badge、CONTRIBUTE 的 slug、`.github/workflows/deploy.yml`）一起 commit。guard 只檢查上游 slug 有沒有出現在不該出現的地方，不檢查 A2–A5 是否還持有上游 slug，所以 pristine 會通過。之後 upstream 的 `v*` tag 會觸發 GitHub Pages 部署。
- **影響**：老師的身分或部署 workflow 可能進入 upstream。
- **信心**：中
- **等級**：P2
- **建議**：T67 加上兩項：A2–A5 的每個 form 都持有上游 slug；`.github/workflows/deploy.yml` 不存在。

### R-8 「Sets SITE_BASE」的辨識規則有偽陽性與偽陰性
- **位置**：traceability.md:80-81
- **證據**（推論）：規則 `^\s+SITE_BASE:` 會命中 `run: |` 區塊內容裡的行（例如 heredoc），也會命中設在非 build 步驟或其他 job 的值；但抓不到 shell 寫法 `SITE_BASE=/x/ pnpm build`。
- **影響**：404 警告該出現時沒出現，或不該出現時出現。
- **信心**：中
- **等級**：P2
- **建議**：用 `yaml` 解析，只看 `pnpm build` 那個步驟的 `env.SITE_BASE`，比照 parity test 的做法。

### R-9 無狀態的覆寫不會發出任何警告
- **位置**：spec.en.md:155-163；traceability.md:165（T19）、:182（T36）
- **證據**（推論）：老師曾以 `--origin https://ctf.school.tw` 設定自訂網域，之後為了改 repo 名稱重跑 `--host github-pages` 而沒帶 `--origin`，A8 會被無聲改成 github.io 的推導值。`--host` 同樣會無聲蓋掉之前用 `--base` 寫入的字面值。這符合使用者核准的「每次帶齊參數」，屬於預期的後果；但引擎讀得到舊值，卻什麼都不說。
- **影響**：講義上的短連結會指向錯誤的網址。
- **信心**：中
- **等級**：P2
- **建議**：被設定的 A8 或 A9 原本是不同於上游的值時，發出警告並列出舊值與新值。

### R-10 不帶 `--host` 的執行會在 Cloudflare 靶場重新安裝 GitHub Pages workflow
- **位置**：spec.en.md:168-170；traceability.md:171（T25）
- **證據**（推論）：spec 已承認會重新安裝，但沒有寫出後果：之後每次推 `v*` tag 都會觸發 Deploy，而 Pages 沒啟用時 `configure-pages` 會失敗。
- **影響**：每個 tag 都留下紅色的 Deploy run，與 US8「紅燈代表我弄壞了東西」相衝突。
- **信心**：中
- **等級**：P2
- **建議**：至少在 README 與 T25 的警告中寫明這個後果。

### R-11 base 的文法接受 `.` 與 `..` 路徑段
- **位置**：traceability.md:167（T21）、:177（T31）；spec.en.md:144-145；`scripts/fork-init.ts:78`
- **證據**（直接讀到）：`--base` 用的 `^\/([A-Za-z0-9._~-]+\/)*$` 接受 `/../`、`/./`，config 的 SITE_BASE 檢查用同一個 regex。origin 文法則明確排除 `.` 與 `..`（traceability.md:133）。
- **影響**：不會造成注入，但會產生壞掉的 base，且兩套文法不一致。
- **信心**：高
- **等級**：P2
- **建議**：兩處都排除 `.` 與 `..` 路徑段。

### R-12 同一 owner 共用 origin 的影響不只儲存空間，也包括 Service Worker
- **位置**：spec.en.md:209（B5）；traceability.md:183（T37）；`platform/public/challenge-sw.js:200-207`、`:383`；`.vitepress/theme/index.ts:253`
- **證據**：
  - 直接讀到的：SW 註冊在 `${BASE_URL}challenge-sw.js`，啟用時呼叫 `clients.claim()`。
  - 推論：使用者站形式的靶場（base `/`，T37）註冊的 SW scope 是 `/`，涵蓋同一 owner 的所有專案站靶場。在專案站自己的 SW 啟用並 claim 之前，root SW 會控制專案站的頁面；兩邊的示範題 slug 相同，registry 依 slug 為鍵，可能跨靶場轉送請求。
- **影響**：B5 與 OQ-018 只記錄了儲存空間重疊。
- **信心**：低
- **等級**：P2
- **建議**：在 B5 與 OQ-018 一併記錄 SW scope 重疊。

### R-13 錯誤訊息原樣回顯被拒絕的參數值
- **位置**：`scripts/fork-init.ts:97`（`got: ${values.repo}`）；spec.en.md:87-90
- **證據**（推論）：字元規則會拒絕 Cc（包含 ESC），但訊息若原樣回顯被拒的值，終端機會解讀其中的 escape 序列。0005 或 0007 若產生指令給老師貼上執行，這就成為輸入面。
- **信心**：低
- **等級**：P2
- **建議**：訊息中的值一律用 `JSON.stringify` 輸出，或只顯示 code point。

### R-14 doc anchor 的萬用字元會改寫文件中的範例行
- **位置**：traceability.md:52-55、:223（T77）；spec.en.md:104-107、:195-196
- **證據**（推論）：B2 已承認老師自己寫的行會被改寫。但 upstream 自己的 README 與 CONTRIBUTE 也因此永遠無法放 A-form 的範例，例如 `git clone https://github.com/test-owner/web-range.git` 或同步上游用的 `git remote add upstream …`。加上 T77 禁止出現上游 URL，靶場的文件無法告訴老師上游在哪裡，與 US9「告訴我要從 upstream 帶回什麼」有落差。
- **信心**：中
- **等級**：P2
- **建議**：在 Further Notes 記錄這項限制，並說明 US9 改由引擎訊息提供上游 URL（引擎檔案在 keep list 中）。

### R-15 manifest 的邊界型別
- **位置**：spec.en.md:115-118；traceability.md:160（T13）；`scripts/fork-init.ts:280-281`
- **證據**：
  - 直接讀到的：`{ ...(pkg.repository ?? {}) }` 遇到陣列時會產生 `"0"`、`"1"`… 鍵。spec 只定義了 string、absent、object 三種情況，null、數字、陣列、布林都沒定義。
  - 推論：Windows 記事本存出帶 BOM 的 package.json 會讓 `JSON.parse` 失敗，變成 tree error。A7 的 frontmatter 在 BOM 開頭時也不會被辨識。
- **信心**：中
- **等級**：P2
- **建議**：非 plain object 的值一律以物件形式取代；讀檔時去掉 BOM，或明確報出 BOM 錯誤。

### R-16 T18 只檢查 A9 與 `base: siteBase`，沒有檢查三個 href
- **位置**：traceability.md:164（T18）；spec.en.md:155-157
- **證據**（推論）：config 只帶回了 A9 與 base 行、沒帶回 href 計算時，可以通過檢查。專案站上的 favicon 會 404，而且沒有任何警告，與 US9「告訴我確切要帶回什麼」不符。
- **信心**：中
- **等級**：P2
- **建議**：檢查三個 href 都參照 `siteBase`，不符時發警告。

### R-17 rebrand 靶場沒有任何取得 SITE_BASE 的途徑，也收不到警告
- **位置**：traceability.md:172（T26 只適用 anchor mode）、:196（T50）、:197（T51）
- **證據**（推論）：rebrand 不能搭配 `--host`，T26 只在 anchor mode 發警告。rebrand 靶場若 A9 是上游形式、而 workflow 是舊版（沒有 SITE_BASE），網站會無聲 404。
- **信心**：中
- **等級**：P2
- **建議**：讓 T26 的警告也適用 rebrand mode；或在 Out of Scope 明文記錄這個缺口。

### R-18 引擎只認得 `deploy.yml` 一個 workflow
- **位置**：traceability.md:75；spec.en.md:158-166
- **證據**（推論）：若已有其他 Pages workflow（例如 `pages.yml` 或改名過的檔案），`--host github-pages` 會再裝一個，兩個部署互相競爭；`--host cloudflare-pages` 則會留下那個檔案，而且不警告。
- **信心**：低
- **等級**：P2
- **建議**：任何 workflow 含 `actions/deploy-pages` 時發出警告。

### R-19 site name 裡的 `$&` 在 VitePress 的 titleTemplate 路徑上是潛在風險
- **位置**：spec.en.md:243（AC-N3）；`node_modules/vitepress/dist/client/shared.js:75-78`
- **證據**：
  - 直接讀到的：當 `titleTemplate` 是含 `:title` 的字串時，VitePress 執行 `template.replace(/:title/g, title)`，而首頁的 title 就是 site title。在這個替換路徑上，`$&`、`` $` ``、`$'` 會被當成替換樣式解讀。
  - 目前 `platform/` 與 config 都沒有設定 `titleTemplate`，所以只是潛在風險。
- **影響**：AC-N3 只驗證了 A6 字面值與 frontmatter，沒有驗證實際渲染出的 `<title>`。
- **信心**：低
- **等級**：P2
- **建議**：記錄這個限制；或在 T74 中為含 `$&` 的名稱檢查 `<title>`。

---

**我檢查過的項目**：
- B1–B5 每一條信任邊界；A1–A9 每個寫入對照白名單。
- 參數落點：A6、A8 的 JS 字面值；A7 的 YAML 雙引號字串對照 js-yaml 的不可列印字元集；VitePress SSR 的 `<title>` 有 escapeHtml；hero name 走 v-html；site data 內嵌在 `<script>`。
- 無狀態的覆寫、first conversion、T6 收斂、T7 冪等。
- 暫存檔的順序問題、dry-run、並行執行。
- upstream 判定，以及 `GITHUB_REPOSITORY` 對照 Actions 的 `==`。
- rebrand 的 key、slug 與 `format()` 的互動。
- `.gitattributes` 的 `eol=lf` 對 Windows job 的影響；toolchain-parity 與 trigger-branches 測試的範圍。
- 上游 host 與 slug 在 repo 中的實際出現位置（都只在 A1–A5、keep list，以及三個元件測試中）。

**合計**：P0：0、P1：3、P2：16
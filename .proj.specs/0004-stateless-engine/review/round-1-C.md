# Stage 3 round 1：軸 1「完整性」（C）— epic 0004

審查版本：spec.en.md blob `0972dc4de1a875a86be737c62b9abb89e81eea7d`、traceability.md blob `ce8bb855b29b3bbcf5b94047f33aea837c565ede`，HEAD `c0f7edf`，凍結 prompt `review/prompt.md` blob `b460b2d112e2e394c4f628fc3fdfc29864dc8fc2`。reviewer：`harness-reviewer`（只讀檔案，沒有 shell；blob hash 由 parent 以 `git hash-object` 驗證）。以下為 reviewer 報告原文，只把本機絕對路徑改成 repo 相對路徑。

---

# 完整性審查報告（軸 1：Completeness）

審查標的：`.proj.specs/0004-stateless-engine/spec.en.md`（blob 0972dc4）、`.proj.specs/0004-stateless-engine/traceability.md`（blob ce8bb85），程式碼對照 HEAD c0f7edf。

**範圍說明：** 我只能讀檔案，無法執行 Git 指令。所以凡是牽涉 Git 歷史的主張（例如 `72327e2` 是範本唯一的版本），我都沒有直接驗證，下文會逐條註明是推論。

---

### C-1
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:173`（T27）、`:215`（T69）、`:218`（T72）、`:15`（S5）
  - 程式碼：`.github/workflows/quality-gates.yml:21-22`、`.github/workflows/release.yml:18-19`
- **違反的要求：** 每一種 repository 狀態都要對到 AC。這裡缺的是「淺層 clone、沒有 Git 歷史」這個狀態。
- **證據：**
  - 直接讀到：T27 要用「the template's Git history」比對 known old outputs，T69 要求它在 upstream 上 pass。
  - 直接讀到：`test` job、`release` job 的 `actions/checkout` 都沒設 `fetch-depth`，預設是 1。全檔只有 `prose-audit` 設了 `fetch-depth: 0`（quality-gates.yml:125-126）。
  - T72 對新的跨 OS job 也沒要求 fetch-depth。
- **影響：** upstream CI 裡 T27 有兩種結果：
  - 用 `git show 72327e2:…` 實作的話，會直接失敗，upstream CI 變紅。
  - 用 `git log` 列版本的話，只看得到一個 commit，會空洞地通過，失去「後續改範本必須補上前一版」的守護。
  - 用「Use this template」產生的單一 commit 副本，在本機也是同樣情形。
- **信心：** 高（fetch-depth 是事實）／中（實際會是哪一種失敗）
- **建議等級：** P1
- **建議：** T72 及兩個既有 job 加上 `fetch-depth: 0`；或在矩陣新增一列「淺層／無歷史 × T27」，並寫明預期行為（跳過並發 warning，或直接失敗）。

### C-2
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:17`（S7 指令清單）、`:219`（T73）
  - `.proj.specs/0004-stateless-engine/spec.en.md:17-19`、`:278`（AC-X1）
  - 程式碼：`.github/workflows/quality-gates.yml:230-283`
- **違反的要求：** User story 8（設定後靶場 CI 保持綠燈）必須有驗收出口。
- **證據：** Problem Statement 明寫 base「breaks the site smoke **and challenge tests** that navigate from `/`」。但 S7 只跑 `pnpm test --run`、`pnpm build`、`pnpm test:smoke`，沒有 `pnpm test:challenges`。`challenge-verify` job 是 required check（quality-gates.yml:233），而它用的是 dev server（`playwright.config.ts`）。`build` job 的 `pnpm challenge:validate` 也不在 S7 裡。
- **影響：** 一個設定過的靶場，在 required check 上是否保持綠燈，沒有任何 AC 涵蓋。
- **信心：** 高
- **建議等級：** P1
- **建議：** 兩個 export 的 S7 清單都加上 `pnpm test:challenges`，並考慮加上 `pnpm challenge:validate`。

### C-3
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:75-83`（Workflow states）、`:168`（T22）、`:170`（T24）
  - `.proj.specs/0004-stateless-engine/spec.en.md:155-157`
- **違反的要求：** template 的每一種狀態都要對到 AC。User story 9 要求「template 太舊時要明確說要搬什麼，網站不能默默壞掉」。
- **證據：** 只要 template 不是 known old output，就被視為「current template output」直接安裝或比對。矩陣只定義了 template「缺少」和「known old」兩種狀態，沒有「老師自己改過、不在 known old 名單、也沒設 SITE_BASE」這一種。T22 的「absent → Installed」也沒檢查被安裝的內容有沒有設 SITE_BASE。
- **影響：** 這種 template 在 `--host github-pages` 下會被安裝，或被判為「current → nothing」。A9 是 upstream 形式、SITE_BASE 又沒設，project site 的所有資源都會 404，而且沒有任何 warning。
- **信心：** 中
- **建議等級：** P1
- **建議：** 在 T22/T24 新增一列「template 是 Other 且沒設 SITE_BASE」，預期為 tree error 或 warning。

### C-4
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:201`（T55）、`:202`（T56）、`:200`（T54）、`:149`（T3）
  - `.proj.specs/0004-stateless-engine/spec.en.md:96-99`、`:206`（B2）
- **違反的要求：** 列與列之間的預期行為必須一致，組合情境也要有對應列。
- **證據：** 涉及四條規則：
  - T55：leftover 在「start of the run」就移除，而且會列進 changedFiles。
  - T56：`--dry-run` 什麼都不寫。
  - T54：任何錯誤都不寫入。
  - T3：A1–A9 和 workflow 以外的檔案一律 byte-identical。
- **缺口：**
  1. dry-run 碰到 leftover 時，要不要刪？
  2. leftover 同時出現 tree error 時，要不要刪？
  3. 搜尋 leftover 的範圍沒定義：是只看本次要寫的檔案旁邊，還是整棵樹？如果是整棵樹，老師自己取名為 `*.fork-init-tmp` 的檔案也會被刪，超出 B2 的寫入白名單。
  4. 刪除 leftover 本身就違反 T3 的 byte-identical 敘述。
- **影響：** 實作者只能自行裁決；測試也無法判定哪一種才是對的。
- **信心：** 中
- **建議等級：** P1
- **建議：** 新增「dry-run × leftover」「error × leftover」兩列，定義搜尋範圍，並在 T3 註明 leftover 例外。

### C-5
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:117`（Overridden contracts，skills 那一列）、`:242-245`（T78 strings）
  - 程式碼：`.claude/skills/wxl-fork-init/SKILL.md:3,39,42`
- **違反的要求：** 矩陣列必須對應 spec 規則。overridden contract「base table with `--base none` for Cloudflare」需要有可驗收的出口。
- **證據：** T78 的 forbidden 只有 `掃描式`、`Node.js ≥ 18`、`CLI 不會改短連結的網址` 三條。SKILL.md:42 的「GitHub Pages 專案站 → `--base '/<repo>/'`；…Cloudflare Pages → `--base none`」以及第 3 行的「set the VitePress base」，都不會被 T78 擋下。
- **影響：** skill 改版後可能還在建議 `--base /<repo>/`。照做的話 SITE_BASE 會被字面值蓋掉，CI 也會變紅，而 AC-D1 仍然通過。
- **信心：** 中
- **建議等級：** P1
- **建議：** T78 forbidden 加上 `Cloudflare Pages → \`--base none\``、`--base '/<repo>/'` 等字串，或對 base 表格改用結構斷言。

### C-6
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:136-141`、`:195`（T49）
- **違反的要求：** 「several failures」這個邊界要能完整判定。
- **證據：**
  - value checks 清單包含 T42，但 T42 是「Accepted」那一列，不是拒絕條件。
  - 清單漏掉 T40（site-name 為空／超長／字元不合法），也漏掉既有的 `--rebrand` 值檢查（fork-init.ts:99-114）。
  - 各 value checks 之間的先後沒定義，括號裡的清單算不算順序也沒說。
- **影響：** 兩個 value check 同時失敗（例如 `--repo` 和 `--origin` 都不合法）時，T49 無法判定該丟哪一則訊息。
- **信心：** 高
- **建議等級：** P2
- **建議：** 明訂 value checks 的內部順序，納入 T40 和 rebrand 值檢查，並移除 T42。

### C-7
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:153`（T7）、`:171`（T25）
- **違反的要求：** 列之間要一致。
- **證據：** T25 規定 template 缺少時會發「naming the template」的 warning。第二次執行時這個條件仍然成立，但 T7 列舉的「exactly」warning 清單（T2、T22 left、T23 left、T25 different、T26）裡沒有它。
- **影響：** 依 T7 寫的測試會跟 T25 的行為衝突。
- **信心：** 高
- **建議等級：** P2

### C-8
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:124-126`（Character rules）、`:160`（T14 只限 anchor mode）、`:197`（T51）
  - 程式碼：`scripts/fork-init.ts:284,286`
- **違反的要求：** `--name`／`--description` 在 rebrand mode 的邊界要有對應列。
- **證據：** Character rules 說 `--name`、`--description` 都會 trim，沒有限定模式。但 T51 的「name = --name ?? --rebrand」是照舊路徑，而照舊路徑沒有 trim。
- **缺口：** rebrand 搭配 `--name ""` 或 `--name "  "` 時，結果是空字串（`??` 不會擋掉空字串）、trim 後的值，還是退回 rebrand 名稱？沒有定義。
- **信心：** 中
- **建議等級：** P2

### C-9
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:197`（T51「The only differences」）、`:157`（T11 只限 anchor mode）
  - `.proj.specs/0004-stateless-engine/spec.en.md:131-135`
- **違反的要求：** 「complete list of differences」必須真的完整。
- **證據：**
  - T51 的差異清單沒有列入以下這些已明定為 both 或 rebrand 模式的列：T50（新增的 argument error）、T54（任何錯誤都不寫入）、T44，以及上一條的 trim 規則。
  - rebrand 搭配 `--base` 寫入 A9 時，遇到 CRLF config 的行為沒有對應列，因為 T11 只限 anchor mode。
- **影響：** 「every existing rebrand test passes unchanged」與「only differences」兩個敘述無法對齊判定。
- **信心：** 中
- **建議等級：** P2

### C-10
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:172`（T26 只限 anchor）、`:196`（T50）
- **違反的要求：** 「rebrand mode × workflow 狀態 × A9 是 upstream 形式」這個組合沒有對應列。
- **證據：** 情境如下：
  1. 老師以前用舊引擎做過 rebrand，當時安裝的是舊版 template output。
  2. 之後 merge 了 upstream 的 config，A9 變成 upstream 形式。
  3. 再跑 rebrand 時，不能帶 `--host`（T50 擋下），也沒有 T26 的 warning。
- **影響：** GitHub Pages project site 會 404，而且沒有任何提示。
- **信心：** 中
- **建議等級：** P2
- **建議：** 新增一列，說明 rebrand 模式下是否也發 T26 warning；或在 Out of Scope 明列這個情境。

### C-11
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:166-167`（T20/T21）
  - `.proj.specs/0004-stateless-engine/spec.en.md:63-66`（story 8）、`:321-322`
- **違反的要求：** 「靶場 CI × `--base` 寫入字面值」的預期行為沒有對應列。
- **證據：** `--base /x/` 會把 A9 寫成 `const siteBase = '/x/'`，SITE_BASE 因此失效；site-smoke 和 challenge 測試從 `/` 出發，結果會 404，CI 變紅。Story 8 沒有附條件。Out of Scope 只處理了「字面值優先」，沒有提到 CI 會壞。
- **信心：** 中
- **建議等級：** P2
- **建議：** 在矩陣或 Out of Scope 明載「用 `--base` 的靶場 CI 會紅」，並列入 T77 文件的必要說明。

### C-12
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:59`（A9）、`:164`（T18）、`:213`（T67）
- **違反的要求：** config 的「半 merge」狀態要有對應列。
- **證據：** T18 只檢查 A9 和 `base: siteBase`。如果 config 有這兩者，但三個 head href 仍是字面值 `/favicon.svg`，engine 不會報錯，pristine check 也不檢查 href。
- **影響：** Problem Statement 點名的「favicons at the root」問題，在半 merge 的靶場上仍會默默發生。
- **信心：** 中
- **建議等級：** P2

### C-13
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:75`、`:171`（T25「different」）
  - 程式碼：`scripts/fork-init.ts:335`
- **違反的要求：** 列與規則要一致。
- **證據：** Workflow states 規定比較前先做 CRLF→LF 正規化。但 T25 寫「today's behaviour」，而今天的程式碼是 raw 比較（`existing !== deployContent`）。
- **缺口：** 不帶 `--host`、而 workflow 是 CRLF 版的 current template 時，要不要發「different」warning？沒有定義。
- **信心：** 中
- **建議等級：** P2

### C-14
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:194`（T48）
- **違反的要求：** argument 輸入的邊界要列全。
- **證據：** T48 只列了三類：unknown flag、positional、missing value。Node `parseArgs` 還會丟出以下幾類錯誤，或出現以下行為：
  - boolean 旗標帶了 inline value，例如 `--dry-run=x`。
  - 值以 `-` 開頭時的 ambiguous 錯誤。
  - 同一個旗標重複出現，例如 `--host a --host b`。這時沒有錯誤，後者靜默覆蓋前者。
- **信心：** 中
- **建議等級：** P2

### C-15
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:191-193`（T45–T47）、`:139-141`
- **違反的要求：** 「空值」這個邊界要有對應列。
- **證據：** 今天的程式碼把 `--repo ""` 當作 missing（fork-init.ts:95）。依新的 check order，T47 先於 value checks，但 `--repo ""`、`--author "   "` 算「missing」（T47）還是「value 不合法」（T45/T46），沒有定義。
- **影響：** 錯誤訊息無法判定。
- **信心：** 中
- **建議等級：** P2

### C-16
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:158-159`（T12/T13）
- **違反的要求：** manifest 欄位型別的邊界要列全。
- **證據：** 只定義了 string、absent、object 三種。以下情況都沒有定義：
  - `repository` 或 `bugs` 為 `null`、陣列或數字。
  - 帶 BOM 的 `package.json`（Windows 編輯器常見），算不算「unparsable」。
- **信心：** 中
- **建議等級：** P2

### C-17
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:121-124`、`:185-189`（T39–T43）、`:192`（T46）
- **違反的要求：** 字元邊界要列全。
- **證據：** `String.prototype.trim` 不會去掉 U+200C／U+200D，而這兩個字元又被列為允許的例外。所以一個只含 ZWJ 的 `--site-name` 長度是 1，會通過驗證。
- **影響：** `<title>` 和 hero 會變成肉眼看不見的空白。`--author` 也有同樣問題。
- **信心：** 中
- **建議等級：** P2

### C-18
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:152`（T6）
  - `.proj.specs/0004-stateless-engine/spec.en.md:294-296`
- **違反的要求：** 半套用狀態要列全。
- **證據：** T6 定義的是「a subset of the files … replaced by X's output」。以下三種狀態沒有涵蓋：
  1. workflow 的安裝或刪除算不算「write」（cloudflare 模式會刪掉 workflow）。
  2. 一部分檔案已替換、同時還留著 `.fork-init-tmp` leftover 的組合狀態。
  3. 用另一組參數 Y 跑到一半中斷，再用 X 重跑。這時 manifest 已寫入 Y 的 URL，first conversion 判定失效，結果會和「X 跑在乾淨的樹上」不同。Story 2 和 3 都可能碰到。
- **信心：** 中
- **建議等級：** P2

### C-19
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:76-79`
  - `.proj.specs/0004-stateless-engine/spec.en.md:341-342`
  - 程式碼：`tests/unit/workflows/fork-template-parity.test.ts:6-11`
- **違反的要求：** 「舊版 output」這個集合要完整。
- **證據：** parity test 的註解寫到 template 曾經「sat at unpinned `@v4` actions, Node 22, `cargo install wasm-pack`」，表示釘版之前存在另一個版本。spec 則宣稱本 repo 歷史裡只有 `72327e2` 一個版本，而 T27 只對本 repo 的歷史比對。
- **推論，未以 Git 驗證：** 如果那個早期版本曾經散布到某些 fork，它不會被認作 known old output，只會落到「Other」並收到 warning。
- **信心：** 低
- **建議等級：** P2

### C-20
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:213`（T67）
  - `.proj.specs/0004-stateless-engine/spec.en.md:208`（B4）
- **違反的要求：** B4 的防護面要列全。
- **證據：** pristine check 的欄位不含以下幾項：A2–A5、`name`、`description`、`.github/workflows/deploy.yml` 是否不存在。在 upstream 上誤跑一次不帶 `--host` 的 run，會安裝 deploy.yml。
- **影響：** 低。first conversion 一定會把 version 改成 `0.1.0`，誤跑多半仍會被抓到。
- **信心：** 低
- **建議等級：** P2

### C-21
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:199-201`（T53–T55）
  - `.proj.specs/0004-stateless-engine/spec.en.md:87-99`
- **違反的要求：** 錯誤種類要列全。
- **證據：** 只定義了 argument error 和 tree error。以下情況都沒有定義：
  - 寫入階段發生 I/O 失敗，例如 rename 失敗、EACCES、Windows 上檔案被鎖住。這時 exitCode、message、留下的 tmp 檔和半套用狀態都沒說。
  - tree error 發生時，之前已收集的 warnings 要不要輸出。
- **信心：** 中
- **建議等級：** P2

### C-22
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:201`（T55）、`:197`
  - `.proj.specs/0004-stateless-engine/spec.en.md:97-98`
- **違反的要求：** 檔案屬性這個邊界沒有對應列。
- **證據：** 「寫 tmp 再 rename」產生的新檔案會用預設 mode，原檔的可執行位元會遺失；今天用的 `writeFileSync` 會保留 mode。rebrand 模式改的是整棵樹，所以任何含 key 或 slug 的可執行腳本都可能受影響。
- **推論：** 我在 `scripts/*.sh` 裡沒有找到含 key 的檔案，所以目前沒有實際受影響的檔案。
- **信心：** 低
- **建議等級：** P2

### C-23
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:188`（T42）、`:24-25`（S7 的站名）
  - `.proj.specs/0004-stateless-engine/spec.en.md:298-299`
- **違反的要求：** 工具版本這個維度要納入。
- **證據：** T42 用 `yaml` 套件解析 frontmatter，但 VitePress 實際建置用的是另一套 frontmatter 解析器。S7 的兩個站名都不含 `\`、backtick、`$` 系列字元。
- **影響：** AC-N3 的字元集從未在真正執行的解析器上驗證過。
- **信心：** 中
- **建議等級：** P2

### C-24
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:75`
- **違反的要求：** host 狀態要列全。
- **證據：** 只看 `.github/workflows/deploy.yml` 這一個路徑。以下兩種情況都沒有定義：
  - 老師自己的 GitHub Pages workflow 放在其他路徑（例如 `pages.yml`），而且沒設 SITE_BASE。這種情況不會收到 T26 warning。
  - `--host github-pages` 又安裝一份 deploy.yml，造成兩份部署 workflow 並存。
- **信心：** 低
- **建議等級：** P2

### C-25
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:177`（T31）
  - 程式碼：`README.md:203`
- **違反的要求：** 既有靶場的遷移狀態要有對應列。
- **證據：** 舊 README 要 Cloudflare 子路徑站「加上 `SITE_BASE` 並設成那個路徑」，沒有要求結尾斜線。新 config 會拒絕 `/sub` 這類不合 regex 的值並直接 throw。
- **影響：** 已經這樣設定的 Cloudflare 靶場，merge 新 config 後建置會失敗，而矩陣和文件都沒有提示。
- **信心：** 中
- **建議等級：** P2

### C-26
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:182-183`（T36/T37）
- **違反的要求：** 重跑順序要列全。
- **證據：** 先用 `--origin https://custom.example` 執行，之後再跑 `--host github-pages` 但沒帶 `--origin`，A8 會被默默覆蓋成 github.io 的推導值，沒有 warning。
- **說明：** 這是 stateless 決策的直接後果，但矩陣沒有寫明這種情況要不要提示。
- **信心：** 中
- **建議等級：** P2

### C-27
- **位置：**
  - `.proj.specs/0004-stateless-engine/traceability.md:228-240`（T77 strings）
  - 程式碼：`README.md:181-184`
- **違反的要求：** 文件的必要內容要有驗收出口。
- **證據：** fork 那一節是整段重寫，但 T77 的 required strings 沒有涵蓋兩項 GitHub 介面上的前置設定：「Settings → Pages → Source = GitHub Actions」和 `v*` tag rule。現在 `configure-pages` 移到 build 之前，更依賴前者。
- **影響：** 改版後的文件可能漏掉這兩項，而 AC-D1 仍然通過。
- **信心：** 中
- **建議等級：** P2

### C-28
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:211-212`（T65/T66）
- **違反的要求：** 環境狀態要列全。
- **證據：** 以下兩種情況沒有定義：
  - `GITHUB_REPOSITORY=""`（設了但是空字串）算不算「set」。
  - 機器上沒裝 git 時，「git work tree」的判定會不會 throw。
- **信心：** 低
- **建議等級：** P2

### C-29
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:167`（T21）、`:177`（T31）、`:133`（Origin grammar）
- **違反的要求：** 邊界要一致。
- **證據：** base 的 regex `^/([A-Za-z0-9._~-]+/)*$` 接受 `/../`、`/./`；origin 的 path 則明確排除 `.` 和 `..`。base 這一側沒有對應列決定是否拒絕。
- **信心：** 中
- **建議等級：** P2

### C-30
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:57`（A7）、`:61-64`
- **違反的要求：** 「parsable」的判定依據要明確。
- **證據：** 只說 A7 的值必須是「YAML plain, single- or double-quoted scalar」，沒指定用哪個解析器判定。以下值算不算 unparsable，沒有對應列：
  - `name: |`、`name: >` 這類 block indicator。
  - plain scalar 裡含 `: `。
- **信心：** 低
- **建議等級：** P2

### C-31
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:207-210`（T61–T64）、`:87-96`
- **違反的要求：** 檔案種類要列全。
- **證據：** guard 會掃「real tracked files」，但 tracked 的二進位檔（圖片、wasm）怎麼處理沒有定義：要跳過，還是 byte 層級比對 slug？
- **信心：** 低
- **建議等級：** P2

### C-32
- **位置：** `.proj.specs/0004-stateless-engine/traceability.md:41-45`（First conversion）、`:161`（T15）
- **違反的要求：** repository 狀態要列全。
- **證據：** 已設定過的靶場在 merge upstream 時，如果 `package.json` 的衝突解決選了 upstream 的 `repository.url`，下一次 run 會被判成 first conversion，`version` 重設為 `0.1.0`、`license` 改回 ECL-2.0，跟 story 9 的「keep my version number」衝突。矩陣沒有這種狀態。
- **信心：** 低
- **建議等級：** P2

---

計數：P0 0 項、P1 5 項（C-1 至 C-5）、P2 27 項（C-6 至 C-32），共 32 項。
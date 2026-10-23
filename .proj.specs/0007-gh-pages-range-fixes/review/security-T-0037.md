# T-0037 安全審查報告（stage 7）

日期：2026-10-23
Ticket：T-0037「The URL text selects on a click, yields to the title, and keeps six characters」（epic 0007）
結論：第 1 輪沒有成立的 finding。第 2 輪成立一項 P2（R2-S1：本報告與 ticket 引用的行號過期，屬於證據鏈的準確度，不是可利用的漏洞），已修正；另外三個候選駁回。這份報告只說明檢查了什麼、怎麼判定，**不代表這個專案是安全的**。

## 範圍

- **Base**：`707be5f`（`origin/main`，已含 T-0030、T-0031、T-0032、T-0036）
- **HEAD**：`707be5ff1deb5f7d0d0b6852ef1833417665b7bb`。T-0037 的實作還沒 commit，審查對象是 worktree 裡的待 commit 變更。
- **Branch**：`tickets/T-0037/url-text-selection-and-layout`
- **Worktree**：`/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0037`
- **審查的待 commit 檔案**（審查 packet 的 `git status --short`）：
  - 修改：`.proj.tickets/0007-gh-pages-range-fixes/T-0037-url-text-selection-and-layout.md`、`.vitepress/theme/components/ChallengeList.vue`、`.vitepress/theme/components/MergedNav.vue`、`.vitepress/theme/components/ShortLinkShare.vue`、`tests/site-smoke/site-smoke.spec.ts`、`tests/unit/components/ChallengeList.test.ts`、`tests/unit/components/MergedNav.test.ts`、`tests/unit/components/ShortLinkShare.test.ts`、`tests/unit/scripts/upstream-guard.test.ts`
  - 新增（未追蹤）：`tests/__helpers__/upstreamDecision.ts`
- **信任邊界**：`spec.en.md` revision 3 的 B1–B5（第 174–178 行）。本 ticket 只碰到 B4（網站 → 學習者的螢幕與剪貼簿）：URL text 的點擊行為與版面。B1、B2、B3、B5 沒有變更。
- **刻意的教學漏洞**：依 ADR-0005 不算 finding。本 ticket 沒有改到任何題目，所以沒有用到這條排除規則。
- **行號**：程式碼的行號是第 1 輪審查當時的待 commit 版本。stage 6 之後的修正動了 `ChallengeList.vue:400`（加上 `data-row-title`）、smoke spec（下面有註明新行號），也大幅改寫了 ticket record 本身（補上 mutation 與 red 狀態的重現指令，以及 stage 6、7 與第 2 輪的紀錄）。ticket record 的行號因此一直在移動，S-4 改用段落名稱定位，不再引用 ticket 的行號（第 2 輪 R2-S1）。

## 流程

1. 一位 reviewer 唯讀讀過 packet（diff、ticket 紀錄、spec），提出 4 個候選。
2. 每個候選交給 1 位獨立的 skeptic 嘗試推翻。依這次的規則，medium 以上要 3 位中至少 2 位認定成立，low 要 1 位中 1 位認定成立。
3. 結果：4 個候選都是 0 / 1，全部駁回，所以 stage 7 沒有要修的項目，也沒有為 stage 7 改任何程式碼。
4. 交給我的紀錄裡只有每個候選的標題與 skeptic 的理由，沒有 reviewer 原本的嚴重度與信心評等。下面標「未提供」的欄位就是這個原因；能從 skeptic 理由看出 reviewer 原值的地方，有另外註明。

## 結論摘要

| # | 候選 | 位置 | 類別 | Skeptic 判定 | 處置 |
|---|---|---|---|---|---|
| S-1 | 全域 capture 階段 click 監聽器會攔截文件中任何帶 `data-short-link` 的元素，包含筆記預覽未消毒的 `v-html` | `ShortLinkShare.vue:14-30`；背景 `NoteEditor.vue:71` | 事件處理範圍過寬 | 0/1 | 駁回 |
| S-2 | 安裝旗標是不可設定的 `window` 屬性，可被先執行的同源腳本預先占用，讓監聽器不安裝 | `ShortLinkShare.vue:26-30` | 防護被停用（同源腳本） | 0/1 | 駁回 |
| S-3 | S08 的 upstream 判斷以 `process.cwd()` 為根目錄，執行 git 並讀取 `package.json` | `tests/site-smoke/site-smoke.spec.ts`（S08 的 `test.skip`，目前在 779 行）；`tests/__helpers__/upstreamDecision.ts:37-41`、`:44-50`、`:63-65` | 測試以目前目錄為準執行外部指令 | 0/1 | 駁回 |
| S-4 | 會 commit 的 ticket record 寫入本機絕對路徑（使用者名稱、uid 501、session UUID） | T-0037 ticket：「open points resolved (stage 5)」的 `<scratch>` 定義；stage 5 coverage report 底下「Commands and results」與「Commands rerun at stages 6 and 7」的 worktree 路徑 | 資訊揭露 | 0/1 | 駁回 |

## 候選與處置

### S-1：全域 click 監聽器攔截任何帶 `data-short-link` 的元素（駁回）

- **位置**：`.vitepress/theme/components/ShortLinkShare.vue:14-24`（`selectUrlText`：只看 `closest('[data-short-link]')` 與按鍵條件）、`:26-30`（在 `window` 的 capture 階段安裝）。背景：`.vitepress/theme/components/NoteEditor.vue:71` 的 `v-html="previewHtml"`。
- **類別**：事件處理範圍過寬，與未消毒的 HTML 相連。
- **嚴重度**：未提供。**信心**：未提供。
- **攻擊者前提**：能把含 `data-short-link` 屬性的 HTML 放進同一份文件。B1–B5 底下只有兩條路徑：學習者自己在自己瀏覽器寫的筆記（`NoteEditor.vue` 的預覽，經 marked 轉換、沒有消毒），或老師撰寫的頁面 Markdown。題目 runtime 跑在 `sandbox="allow-scripts allow-forms"` 的 iframe 裡，事件不會進入父文件。
- **資料流**：使用者在帶屬性的元素上做一次無修飾鍵的主鍵點擊 → `window` capture 監聽器 → `preventDefault()`，並選取該元素的全部文字。
- **影響**：最壞情況是這段文字上的一般點擊被攔下、文字被選取。沒有資料外洩、沒有寫入剪貼簿、沒有導向、沒有發出請求。
- **證據**：reviewer 讀程式碼推論。skeptic 在 worktree 中 grep，確認只有 `ShortLinkShare.vue:145` 會輸出這個屬性，其他命中都在測試與文件裡。
- **建議修正**：把 selector 收窄到元件私有的標記；另加一則測試，確認不是本控制項的 `[data-short-link]` 不會被 `preventDefault`。
- **處置**：**駁回（0/1）**。理由：
  1. 能把 HTML 塞進筆記預覽的人就是唯一的觀看者本人；老師是受信任的作者。
  2. 能做到這件事的人本來就能用 `<img onerror>` 執行任意 script，這個 selector 給的能力嚴格弱於原本就有的能力，沒有讓任何弱點新變得可以觸及。
  3. B4 保護的是 URL text 的內容來源與 Vue 的跳脫綁定，這次變更沒有動到；B4 沒有要求 click handler 只處理本元件的節點。
  4. ADR-0005 要求能追溯到實際影響，這裡追不到。
  - skeptic 的備註（不算 finding）：收窄 selector 與補一則測試可以列為 P2 強化。`NoteEditor.vue:71` 的 `v-html` 未消毒是既存問題，不是 T-0037 引入的，要處理應另外開票。

### S-2：安裝旗標可被預先占用（駁回）

- **位置**：`.vitepress/theme/components/ShortLinkShare.vue:26-30`（`'__wxlUrlTextClick' in window` 判斷，接著 `Object.defineProperty(window, INSTALLED, { value: true })` 與 `addEventListener`）。
- **類別**：防護被停用（同源腳本預先占用全域名稱）。
- **嚴重度**：未提供。**信心**：low（skeptic 理由提到 reviewer 自標的 confidence 是 low）。
- **攻擊者前提**：在主題模組 evaluate 之前，於網站的 origin 上執行任意 JavaScript。reviewer 的紀錄裡 attacker_prerequisites 與 impact 兩欄是空的。
- **資料流**：先執行的腳本設定 `window.__wxlUrlTextClick` → 判斷為已安裝 → 監聽器不安裝。
- **影響**：一般點擊回到套用本 ticket 之前的行為：在列表中點 URL text 會由 VitePress router 開啟題目，D4 與 L17 不成立。沒有資料外洩、沒有 XSS、沒有權限提升，學習者的紀錄不受影響。
- **證據**：reviewer 讀程式碼推論。
- **建議修正**：改用模組內的變數或 `Symbol` 當旗標。
- **處置**：**駁回（0/1）**。理由：
  1. 前提本身就是完全控制頁面：這樣的腳本可以改寫 `EventTarget.prototype.addEventListener`、移除或攔截任何監聽器、改寫 DOM、讀取同源 storage。全域旗標的名稱沒有給它新的能力。
  2. 建議的修法擋不住同源腳本改寫 `addEventListener`，所以沒有補上真正的安全缺口。
  3. B1–B5 都沒有把「站台 origin 上先執行的惡意腳本」列為防護對象。若那段腳本來自題目刻意留下的漏洞，依 ADR-0005 也不算 finding。
  4. 最壞影響只是可用性回到 base 的行為。

### S-3：S08 的 upstream 判斷以 `process.cwd()` 為根目錄（駁回）

- **位置**：`tests/site-smoke/site-smoke.spec.ts` 的 S08（`test.skip(!realUpstreamDecision(process.cwd()), …)`，stage 6 修正後在第 779 行）；`tests/__helpers__/upstreamDecision.ts:37-41`（`git rev-parse --is-inside-work-tree`，`cwd: root`）、`:44-50`（讀 `root/package.json`）、`:54-60`（`root/range.json`）、`:63-65`（`realUpstreamDecision`）。
- **類別**：測試以目前目錄為準執行外部指令、讀取檔案。
- **嚴重度**：未提供。**信心**：未提供。reviewer 的紀錄裡 attacker_prerequisites 與 impact 兩欄是空的。
- **攻擊者前提**：能決定開發者在哪個目錄執行 Playwright。
- **資料流**：`process.cwd()` → `spawnSync('git', …, { cwd })`、`readFileSync(cwd/package.json)`、`lstatSync(cwd/range.json)` → 決定 S08 是否 skip。
- **影響**：從 repo 根目錄以外的地方執行時，判斷可能讀到別的 `package.json`。
- **證據**：reviewer 讀程式碼推論。
- **建議修正**：像 `upstream-guard.test.ts` 的 `REPO_ROOT` 一樣，從 `import.meta.url` 推出 repo 根目錄。
- **處置**：**駁回（0/1）**。理由：
  1. 能決定 cwd 的人本來就能決定要載入哪個 Playwright config 與 spec，等於已能執行任意程式碼，沒有新可達的越界行為。
  2. 文件化的入口 `pnpm test:smoke`（`package.json:23`）在套件根目錄執行，相對的 `--config playwright.site.config.ts` 本身就要求 cwd 在根目錄。CI 設了 `GITHUB_REPOSITORY`，`upstreamDecision.ts:26-28` 只看它，root 不影響結果。
  3. 偏離時是保守地 skip：讀不到 upstream 的 `package.json` 就判為 false，S08 會 skip 並寫明原因，不會誤判通過，也不會讓 range 誤跑 upstream-only 的斷言。
  4. traceability 要求的是「同一個判斷」，smoke spec 與 `upstream-guard.test.ts` 都匯入同一個 `realUpstreamDecision`，已經做到。既有測試（例如 `tests/unit/theme/local-storage-ownership.test.ts:40`）也直接用 `process.cwd()`。
  - skeptic 的備註：改從 `import.meta.url` 推出根目錄比較穩健，屬於 P2 以下的風格建議。stage 6 的 Standards 軸也有同一個候選（`process.cwd()` 與 `REPO_ROOT` 不一致），同樣被駁回。

### S-4：ticket record 寫入本機絕對路徑（駁回）

- **位置**：`.proj.tickets/0007-gh-pages-range-fixes/T-0037-url-text-selection-and-layout.md`，以段落名稱定位：「2026-10-23 — open points resolved (stage 5)」開頭的 `<scratch>` 定義（`/private/tmp/claude-501/-Users-phoenix-…/9d2ad28a-…/scratchpad/wf2/T-0037`），以及「coverage report (stage 5)」底下「Commands and results, in …」與「code review (stage 6)」底下「Commands rerun at stages 6 and 7, in …」兩處的 worktree 路徑。第 1 輪寫的「第 118、274 行」在 stage 6 補寫 mutation 指令後已經不對（第 274 行變成 mutation 指令），第 2 輪改成這個寫法（R2-S1）。可用 `grep -n -E '/Users/phoenix|/private/tmp' .proj.tickets/0007-gh-pages-range-fixes/T-0037-url-text-selection-and-layout.md` 查出目前所在的行。
- **類別**：資訊揭露（使用者名稱、uid、目錄配置、session id）。
- **嚴重度**：未提供。**信心**：未提供。reviewer 的紀錄裡 attacker_prerequisites 與 impact 兩欄是空的。
- **攻擊者前提**：能讀到公開的 repository 歷史。
- **資料流**：ticket record → commit → 公開歷史。
- **影響**：揭露本機使用者名稱 `phoenix`、uid 501、目錄配置與 session UUID。
- **證據**：讀 ticket 紀錄。
- **建議修正**：改寫成 `<scratch>` 或相對路徑。
- **處置**：**駁回（0/1）**。理由：
  1. 這些資訊在 base `707be5f` 已經 commit 過：T-0036 record 第 524 行有同一個 `/private/tmp/claude-501/-Users-phoenix-…` 與同一個 session UUID，T-0030 record 第 207 行有 `/Users/phoenix/dev/browserlab/wxl-platform`。T-0037 沒有讓任何資訊變得新可取得。
  2. uid 501 是 macOS 第一個使用者的預設值，session UUID 是本機暫時性識別碼，不是任何憑證。
  3. B1–B5 談的是產品行為，不涵蓋 agent 的 ticket record。
  4. `docs/agents/workflow.md` 的「Ticket records」要求驗證主張附上可重現的指令，寫出工作目錄正是為了這條要求。
  - skeptic 的備註：改寫成 `<scratch>` 或相對路徑可以當整潔度的 P2 建議；前例要不要清理，交使用者決定。

## stage 6 修正的安全檢查

stage 6 依 code review 改了下列內容。stage 7 執行者逐項確認沒有新的攻擊面：

- `ChallengeList.vue:400`：列表列標題的 `<span>` 加上 `data-row-title`，沒有值、只是標記，不影響渲染內容與跳脫綁定，也不被任何產品程式讀取。
- `tests/site-smoke/site-smoke.spec.ts`：抽出 `pushStates(page)`，S06 改用 `[data-row-title]` 定位，新增 `expectRowsAtRest`（量 `nav.merged-nav` 兩列的高度，以及列表每列 URL text 與按鈕是否在同一行）。這些都只在 Playwright 對本機 preview server 執行，只讀 DOM 尺寸，不寫入任何東西，也不碰剪貼簿。
- ticket record：補上 mutation 與 red 狀態的重現指令。mutation 腳本放在本次 session 的 scratchpad，只修改本 worktree 的檔案，並在結束時以 `cmp` 確認還原。

## 第 2 輪（2026-10-23，stage 6、7 的 review round 2）

第 2 輪由一位 Security 軸 reviewer 唯讀讀過新的 packet（`<scratch>/packet-r2.md`，含 stage 6 之後的 diff 與 ticket record），提出 4 個候選，每個交給 1 位獨立 skeptic。low 的候選 1 位中 1 位認定成立即成立。

| # | 候選 | 位置 | 類別 | Skeptic 判定 | 處置 |
|---|---|---|---|---|---|
| R2-S1 | S-4 引用的 ticket 行號 274 已過時（現在是 mutation 指令），本報告第 18 行說 stage 6 只動了 `ChallengeList.vue:400` 與 smoke spec，也不對 | 本報告 S-4 的摘要列與位置說明、「範圍」的行號說明；ticket 的 stage 7 表 S-4 列 | 證據鏈準確度（P2 / low） | 1/1，成立 | 已修正 |
| R2-S2 | ticket record 的 BASE 重現指令用 `git show 707be5f:$f > $f` 直接覆寫 working tree 的檔案，備份失敗時待 commit 的修改會被清掉 | ticket「Mutation checks」的 BASE 指令區塊 | 重現指令的資料安全 | 0/1 | 駁回 |
| R2-S3 | `mut.sh` 沒有 `trap`、沒檢查備份是否成功，中斷時突變過的原始碼會留在 working tree | ticket「Mutation checks」的 `mut.sh`（本體在 `<scratch>/r1/mut.sh`，不 commit） | 重現工具的穩健度 | 0/1 | 駁回 |
| R2-S4 | 產生 Playwright config 的 `sed` 把沒跳脫的 `$PWD` 放進 TypeScript 字串字面值 | ticket「Mutation checks」的 `pw.config.ts` 產生指令 | 指令注入（自我攻擊） | 0/1 | 駁回 |

### R2-S1：S-4 的行號過期（成立，已修正）

- **影響**：S-4 已駁回，結論不變（base `707be5f` 已含同樣的資訊），但被駁回候選的證據指錯位置，epic 收尾（T-0039）或使用者裁決時會找不到。不涉及 B1–B5，也沒有攻擊者可控的輸入。
- **修正**：S-4 的摘要列與位置說明改用段落名稱定位，並附上查目前行號的 `grep` 指令；「範圍」的行號說明改成也列出 ticket record 的變動；ticket 的 stage 7 表 S-4 列同樣改用段落名稱。行號會隨 ticket record 增補而移動，所以不再引用未 commit 檔案的行號。
- **驗證**：`grep -n -E '/Users/phoenix|/private/tmp' .proj.tickets/0007-gh-pages-range-fixes/T-0037-url-text-selection-and-layout.md` 命中四行：S-4 所列三個段落各一行（`<scratch>` 定義、「Commands and results, in …」、「Commands rerun at stages 6 and 7, in …」），另一行是 ticket 第 2 輪紀錄裡這條指令本身。`grep -n "118 and 274\|118、274" .proj.tickets/0007-gh-pages-range-fixes/T-0037-url-text-selection-and-layout.md .proj.specs/0007-gh-pages-range-fixes/review/security-T-0037.md` 只剩本節與 S-4 位置說明裡對舊寫法的描述。

### R2-S2：BASE 重現指令覆寫 working tree（駁回，0/1）

- **理由**：沒有攻擊者，觸發的人是自己選擇照紀錄重現的維護者，他本來就能任意改寫自己的 checkout。B1–B5 談的是產品行為，不涵蓋 agent 的 ticket record（與 S-4 同一個判斷）。變數 `$S`、`$SLS`、`$NAV` 就在同一節定義，紀錄是實際跑過的步驟，不是單獨貼上就跑的腳本。base `707be5f` 的 T-0032 record 已有沒有備份的 `git show a54e917:scripts/pre-commit.sh > scripts/pre-commit.sh`，這裡至少先 `cp -p` 備份、還原時用 `cmp` 驗證，沒有引入新的風險類型。
- **skeptic 的備註（不算 finding）**：加上 `: ${S:?}`、`set -e`，或改在暫存的 `git worktree add` 裡建 base 版本，屬於 Standards 軸、P2 以下的整潔度建議。

### R2-S3：`mut.sh` 沒有 trap（駁回，0/1）

- **理由**：腳本不 commit，也不是 hook、package script、`create:challenge` 或 `fork:init` 會跑的程式，老師的 range 永遠不會執行它，不屬於 B1–B5 的任何產品表面。會觸發的只有執行者自己中斷或 scratchpad 不可寫，追不到攻擊者，也沒有越過信任邊界（ADR-0005 要求的追溯兩端都不存在）。被突變的都是 git 追蹤的檔案，`git status`、`git diff` 一定看得到；紀錄也要求每次執行後以 `git status --short` 確認，之後還有 stage 6 的 diff 審查、smoke 與 PR 的 CI。
- **skeptic 的備註（不算 finding）**：加上 `trap restore EXIT INT TERM`、在修改前確認 `cp` 成功，或在暫存 worktree 裡突變，比較穩健，交給使用者決定。

### R2-S4：`sed` 裡沒跳脫的 `$PWD`（駁回，0/1）

- **理由**：要造成注入，攻擊者得能決定維護者 checkout 的目錄名稱，而能做到的人本來就能直接改 repo 裡的 `playwright.site.config.ts` 或 `package.json` scripts，沒有越過任何權限邊界。`$PWD` 是執行者自己 shell 的狀態，產生的 config 也只由同一個人在同一個 shell 執行。剩下的只是路徑含 `|`、`&`、`'` 時指令跑不起來的可攜性問題，而且錯誤看得到。

### 第 2 輪的程式碼變更

第 2 輪依 code review 改的只有兩段註解（`ChallengeList.vue` 的 line 3 註解、smoke spec 的 `expectRowsAtRest` 說明）與 ticket record、本報告的文字。沒有改任何會執行的程式碼，沒有新的攻擊面。

## 審查範圍的限制

reviewer 自述的限制如下（原文照錄）：

- **只做程式碼推理，沒有實際驗證：**沒有執行任何指令、build 或測試，也沒有在瀏覽器重現。Git 範圍以 packet 為準，我沒有自己執行 git status 或 git diff 交叉核對。
- **未涵蓋的類別：**依 SKILL.md 排除了相依套件掃描（vitepress 與 marked 版本）、可用性與 rate limiting，以及一般 hardening。
- **NoteEditor.vue:71 的 v-html 未消毒：**這是既存問題，不是這次引入的，只作為第一項候選的背景，沒有另外評等。
- **純測試程式碼只列一項：**smoke spec 的 history.pushState monkeypatch 與 clipboard stub 只在 Playwright init script 裡執行，看不到攻擊路徑，所以沒列為候選；只列了 upstreamDecision 的 cwd 一項。
- **只用程式碼推理檢查的部分：**CSS 版面變更（display: contents、absolute 的空 live region、nav 列高度可成長）有沒有可能造成 clickjacking 或遮住警示，我只做了推理：空的 status 尺寸為 0，訊息在 flex 流內。沒有在瀏覽器量測。
- **跨 ticket 的串連分析不在範圍內：**例如 T-0039 的 S6 是否共用 tests/__helpers__/upstreamDecision.ts，屬於 epic 收尾。
- **auto-merge：**使用者轉達已開啟 auto-merge，這不影響這次唯讀審查。不過這次變更還沒 commit，也沒開 PR，審查結果要在 merge 前經過分級處理。

stage 7 執行者補充：

- 四個候選的 skeptic 都只讀程式碼，沒有做實驗。S-1 的「只有 `ShortLinkShare.vue:145` 輸出 `data-short-link`」可用 `grep -rn "data-short-link" .vitepress/theme` 重現。
- 版面那一項（訊息在 flex 流內、不遮住其他項目）在瀏覽器裡有自動化觀察：smoke 的 `expectMessageWhole` 與 `expectNavItemsWhole` 以 `elementFromPoint` 檢查訊息與同列項目都打得到自己。指令與結果記在 ticket 的 stage 6 紀錄（`CI=1 pnpm test:smoke`）。這是版面檢查，不是 clickjacking 的安全測試。
- 本報告沒有做相依套件掃描、模糊測試或動態分析。

第 2 輪 reviewer 自述的限制如下（原文照錄）：

- 我沒有 shell 工具，只能用 Read/Grep/Glob，所以沒有自己跑 `git status --short`、`git diff 707be5f`、`git ls-files --others` 去核對 packet 的範圍是否完整。Git 範圍全以 packet 為準；packet 裡有列出 pending 與 untracked 檔案。若需要獨立確認範圍，請 parent 補上。
- 全部是程式碼推理：沒有執行 build、unit test、smoke 或 mut.sh，也沒有在瀏覽器重現；所以沒有驗證 BASE/mut.sh 遺失資料的情境，也沒實測 sed 注入。
- 依 SKILL.md 排除：相依套件掃描（vitepress、marked、yaml、Playwright 版本）、可用性與 rate limiting、一般 hardening、fuzzing 與動態分析。
- 沒有測：`display: contents` 下的無障礙與 live region 在各家瀏覽器的實際表現，也沒有 touch／WebKit 的點擊路徑。
- 跨 ticket 的串連分析屬於 epic 收尾，不在範圍內，例如 T-0039 的 S6 共用 upstreamDecision.ts、其他 worktree 同時進行的修改。
- 題目刻意留下的漏洞依 ADR-0005 不算 finding；這次沒有改到任何題目。docs/agents/review.md 與 ADR-0005 本身這輪沒有重讀，只用了 packet 與報告已經引用的內容。
- 使用者轉達已開啟 auto-merge。這份審查是唯讀的，結論要在 merge 前經過分級處理；目前沒有 commit，也沒有 PR。

第 2 輪執行者補充：Git 範圍由執行者以 `git status --short` 核對，列出的檔案與上面「範圍」相同（9 個修改、1 個未追蹤的 `tests/__helpers__/upstreamDecision.ts`），另加本報告本身（未追蹤）。第 2 輪的重跑指令與結果記在 ticket 的「review round 2 (stages 6 and 7)」。

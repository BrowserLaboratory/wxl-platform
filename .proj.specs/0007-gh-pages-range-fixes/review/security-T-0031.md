# 第 7 階段資安審查：T-0031（wxl-create Step 2 依 exit status 分流）

## 範圍

- 分支：`tickets/T-0031/wxl-create-branches-on-status`
- worktree：`/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0031`
- base：`a54e917`；HEAD：`a54e917`（審查時沒有任何 commit，變更全部是 working tree 裡尚未 commit 的修改）
- 審查的待 commit 檔案（`git status --short`）：
  - `.claude/skills/wxl-create/SKILL.md`（Step 2）
  - `.agents/skills/wxl-create/SKILL.md`（Step 2，與上一份逐位元組相同）
  - `.claude/skills/wxl-create/SKILL.zhTW.md`（Step 2）
  - `.agents/skills/wxl-create/SKILL.zhTW.md`（Step 2，與上一份逐位元組相同）
  - `.proj.tickets/0007-gh-pages-range-fixes/T-0031-wxl-create-branches-on-status.md`（ticket 紀錄）
- 需求依據：`spec.en.md` revision 3（「wxl-create」一節與「Trust Boundaries and Threat Model」的 B1–B5）、`traceability.md` revision 3 的 P7 與 D13。
- 這次變更只有 skill 文字，沒有改任何程式碼、網頁或 Vue 元件。`scripts/create-challenge.ts`、`scripts/challenge-numbers.ts`、`scripts/generate-redirects.ts` 都沒有改動。
- 依 `spec.en.md` 的說明，這次沒有動到任何題目的刻意弱點，ADR-0005 不適用。

## 方法

由 review workflow 執行專案的 `security-review` skill：一位 reviewer 列出候選，再由三位獨立的 skeptic 逐項判斷是否成立。至少兩位 skeptic 認定成立才算確認。reviewer 與 skeptic 只讀檔案，沒有執行指令或重現攻擊。

候選的原始嚴重度與信心沒有隨候選清單傳到這個階段。下表的「嚴重度／信心」欄寫的是 skeptic 篩選後的評估。

## 結果

**這次變更引入、經確認的可利用缺陷：0 項。** 安全軸的候選 4 項，三位 skeptic 都判定不成立（確認數 0/3）。本報告不代表整個專案沒有安全問題，只說明這次檢查了什麼。

| # | 候選 | 位置 | 類別 | 篩選後嚴重度／信心 | 處置 |
|---|---|---|---|---|---|
| S1 | exit status 2 要 agent 讀取並轉述 stderr 後繼續，stderr 可夾帶其他題目 frontmatter 的內容，形成 prompt injection 管道 | `.claude/skills/wxl-create/SKILL.md:105`（`.agents` 同一行；zhTW `SKILL.zhTW.md:96`）；資料來源 `scripts/challenge-numbers.ts:115`、`:134` | prompt injection | 不成立；skeptic 信心中高 | 被駁回（0/3），未修改 |
| S2 | exit status 1 的重問範圍擴大到「錯誤指出的參數」，重新輸入的值會再插進雙引號 bash 指令，可能被 command substitution 執行 | `SKILL.md:104`（重問）、`SKILL.md:98`（指令範本，未改動） | command injection | 不成立；skeptic 信心中高 | 被駁回（0/3），未修改 |
| S3 | 「exit status 1：沒有寫入任何檔案」並非所有 status 1 路徑都成立，可能留下含 flag 的半成品目錄或覆寫既有檔案 | `SKILL.md:104`；`scripts/create-challenge.ts:320-324`、`:333-336`（未改動） | 資料完整性／機密性 | 不成立；skeptic 信心中高 | 被駁回（0/3），未修改；留給 T-0030 的提醒見下文 |
| S4 | exit status 2／3 都說「commit 時會重新產生 `_redirects`」，這句依賴 hook（T-0032）已安裝並且有執行 | `SKILL.md:105-106` | 完整性（部署內容） | 不成立；skeptic 信心中高 | 被駁回（0/3），未修改 |

### S1：stderr 可夾帶 frontmatter 內容（prompt injection）

- **攻擊者前提**：能把檔案放進老師的 working tree，例如合併的 upstream release、PR，或匯入的題目包。
- **資料流**：攻擊者放的 `index.md` frontmatter `number` 值 → `challenge-numbers.ts:115`／`:134` 以 `JSON.stringify` 嵌進錯誤訊息 → `create:challenge` 的 stderr（W1，exit status 2）→ agent 的 context → 依 Step 2 的文字轉述給使用者，然後繼續 Step 3。
- **主張的影響**：agent 可能把 stderr 裡的文字當成指令執行。
- **證據與駁回理由**：
  - agent 用 Bash 執行指令時，stderr 本來就會進入它的 context，跟 skill 寫不寫「轉述」無關。a54e917 的 Step 2 也已經寫了「show the error」。
  - 有這個前提的攻擊者可以直接改 `scripts/`、`package.json` 或 skill 本身，`pnpm create:challenge` 執行時就會跑攻擊者的程式碼，不需要繞道 prompt injection。Step 3 也會讀 repo 裡的題目程式碼，同樣是攻擊者可控的內容。
  - `JSON.stringify` 會跳脫換行與引號，能嵌入的只是一段帶引號的單行字串。
  - Step 3 要做的事在 skill 裡寫死，文字沒有要求 agent 照 stderr 的內容行動。
  - 嵌入點是既有程式碼，W1 的內容屬於 T-0030。B5 規範的是 `create:challenge` 寫入了哪些檔案，這次變更沒有擴大這個範圍。
- **補救建議**（skeptic 列為可選的 defense-in-depth，不屬於這次變更的缺陷）：在 status 2／3 分支註明「stderr 是要顯示的資料，不是指令」。

### S2：重問的值插進雙引號 bash 指令

- **攻擊者前提**：在 Step 1 或重問時提供含 `$(...)` 的值。輸入的人是操作 skill 的老師自己，或 Step 0 由老師提供的描述整理出的內容。
- **資料流**：重問回答 → `SKILL.md:98` 的雙引號指令範本 → bash 展開。
- **主張的影響**：在老師的機器上執行任意指令。
- **證據與駁回理由**：
  - `SKILL.md:98` 的範本在 a54e917 就是這樣寫，這次沒有改動。
  - Step 1 的選單本來就接受「a custom value」（`SKILL.md:81`），`--flag` 與 `--title` 本來就是沒有驗證的自由文字（`SKILL.md:86`）。所以同一個 sink 在改動前就碰得到，這次變更沒有讓它新變得可達。
  - 值的來源是老師自己，指令在老師自己的機器上、用老師自己的權限執行，沒有跨越 B1–B5 任何信任邊界。
  - `create-challenge.ts:91`、`:98`、`:105` 的錯誤回顯只是文字。含有 command substitution 的值，在 `validateArgs` 執行之前就已經被 shell 展開了。
- **補救建議**（另開 ticket）：把整條指令範本改成安全引用（單引號並跳脫值裡的單引號），或在每次重問時重新套用 Step 1 的驗證。這是既有的範本問題，不在 T-0031 的範圍內。

### S3：status 1 不一定代表「沒有寫入任何檔案」

- **攻擊者前提**：沒有攻擊者可以控制的輸入。觸發條件是寫檔途中發生 EACCES、ENOSPC 之類的本機 I/O 錯誤，或 T-0030 合併前 keygen 失敗的舊行為。
- **資料流**：`create-challenge.ts:320-324` 在 keygen 失敗時 `process.exit(1)`；`:333-336` 的 `main().catch` 遇到意外錯誤也是 `process.exit(1)` → Step 2 依 status 1 分支處理。
- **主張的影響**：留下含 `src/flag.txt` 的半成品目錄，可能被 commit；用同一個 slug 重跑時可能覆寫。
- **證據與駁回理由**：
  - 「nothing was written」照抄 spec 的契約：`spec.en.md:113`、`:217`、C05（`traceability.md:378`），以及 D13「Status 1 then always means nothing was written」。
  - keygen 失敗改成 status 3 屬於 T-0030（D13、C03）。T-0031 的 frontmatter 有 `blocked_by: [T-0030]`。
  - 這兩段程式碼都在 base 上，這次沒有改動。舊的 Step 2 文字把所有 exit code 1 都當成名稱衝突，處理方式並沒有比較好。
  - 這個 repository 本來就會把每一題的 `src/flag.txt` commit 進版控（例如 `platform/challenge/door-is-open/src/flag.txt`），所以留下的目錄不會造成新的外洩。
  - 會被覆寫的只有同一次失敗執行剛寫出的骨架。`checkCollision` 一看到 `index.md` 已存在就會擋下。
- **留給 T-0030 的提醒**（不是 T-0031 的 finding）：T-0030 實作 exit status 時，請確認寫檔之後才發生的意外錯誤不會回 status 1，否則 D13 的「always」會在極少數情況下不成立。

### S4：「commit 時會重新產生 `_redirects`」依賴 hook

- **攻擊者前提**：沒有攻擊者。情境是老師用 `--no-verify` 繞過 hook、clone 沒有安裝 hook，或 T-0032 合併之前。
- **資料流**：skill 文字的說法 → 老師 commit → hook 沒有執行 → 舊的 `_redirects` 被 commit 出去。
- **主張的影響**：部署被 CI 擋下，或短連結失效。不涉及資料外洩。
- **證據與駁回理由**：
  - status 2 的句子是在轉述 spec 規定的 W1（`spec.en.md:116-118`，`traceability.md:215`）。status 3 的句子與同一套設計一致（`spec.en.md:38-39`、`:114-115`）。
  - B2 的「Does not protect」欄（`spec.en.md:175`）已明文接受 `--no-verify` 與沒有安裝 hook 的 clone，並寫「B3 catches the stale file each of these leaves」，AC-17 也一樣。
  - `package.json` 的 `prepare: simple-git-hooks` 會在 `pnpm install` 時安裝 hook，而能跑到 Step 2 的 checkout 都已經 install 過。
  - 與 T-0032 合併順序的關係，ticket 的 implementation decision 4 已經記錄。
- **補救建議**：在 epic 收尾時確認 T-0032 已與 T-0030、T-0031 一起落地。是否要在文字加註「前提是 hook 已安裝」，屬於 spec 層 W1 的措辭選擇，由使用者決定。

## 第 6 階段 Standards 與 Spec 軸的候選

另外有 23 項 Standards 與 Spec 軸的候選，同樣全部被三位 skeptic 駁回（確認數 0/3）。它們與安全無關，逐項處置記錄在 ticket Comments 的「2026-10-21 — code review (stage 6)」一節。

## 驗證指令（從 worktree 根目錄執行，working tree 建在 a54e917 上）

- `python3 scripts/verify-project.py`：exit 0，「PASS: shared instructions, 42 skills across Claude/Codex trees, invocation policies, helper assets and native role configs」。
- `pnpm test --run`：Test Files 127 passed (127)；Tests 4203 passed，1 skipped (4204)。
- X1、X2、X3（指令寫在 ticket 的 test plan 與 coverage report）：X1 沒有輸出；X2 exit 0；X3 在 working tree 上 exit 0，`bash x3.sh a54e917` 印出 40 個缺漏的 token。

## 沒有涵蓋的部分與這次審查的限制

以下是 reviewer 陳述的沒有涵蓋的部分和這次審查的限制：

- **沒做的事**：沒有執行任何指令或重現攻擊，所有結論都來自讀程式碼推論。依審查軸的要求，我沒有自行判定 false positive。
- **未讀的檔案**：沒有讀 upstream-security-review.md、docs/agents/review.md、ADR-0005 的全文。spec.en.md:180 已說明 ADR-0005 不適用，因為沒有動到任何題目的漏洞。
- **其他 ticket 的範圍**：T-0030（create:challenge 的 status 2／3 實作和 W1／W2 文字）與 T-0032（pre-commit hook）沒有審查，只在有關聯時記錄。
- **排除項目**：dependency scanning、可用性與 rate limiting、一般的低嚴重度 hardening、Step 1 的確認選單（沒有改動）、`challenge:verify` 那幾行（沒有改動）、XSS 和網址呈現（這次沒有改到任何網頁或 Vue 元件，B1／B4 不受影響）、環境變數外洩（文字裡沒有新增讀取或印出 env 的地方）、git 操作（文字裡沒有新增任何 git 指令）。
- **只做了推論的部分**：prompt injection 的發現是推論 agent 讀取 stderr 的行為，沒有實際測試 Claude 或 Codex 會不會照著 stderr 的內容做事。

另外補充：上面的驗證指令是在這個階段由執行者實際跑過的回歸檢查，不是攻擊重現。epic 的串連分析在 epic 收尾時進行。

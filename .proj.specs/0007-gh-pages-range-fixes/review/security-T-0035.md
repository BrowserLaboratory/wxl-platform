# T-0035 安全審查報告（stage 7）

## 範圍

- **Ticket**：T-0035「pre-commit hook 在每一種 commit 方式下都產生正確的 `_redirects`」（epic 0007）
- **Base**：`b2a12cb498e3b522ef533a2fc7ac2e77acd89151`（T-0034 的本機 commit，位於 origin/main `707be5f` 之上）
- **HEAD**：`b2a12cb498e3b522ef533a2fc7ac2e77acd89151`。實作還沒 commit，審查對象是 worktree 裡的待 commit 變更。
- **Branch**：`tickets/T-0035/hook-commit-forms`
- **Worktree**：`/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0035`
- **審查的待 commit 檔案**：
  - `tests/pre-commit-sh.test.ts`（修改）
  - `tests/__helpers__/preCommitRepo.ts`（修改）
  - `.proj.tickets/0007-gh-pages-range-fixes/T-0035-hook-commit-forms.md`（ticket 紀錄）
  - `scripts/pre-commit.sh` 沒有變更：`git diff --stat b2a12cb -- scripts/` 是空的。
- **信任邊界**：spec revision 3 的 B2（pre-commit hook → 老師的 index、working tree 與 stash）。這次只新增測試，沒有改 hook，所以 B2 只當上下文。B1、B3、B4、B5 都沒有碰到。本 epic 不涉及題目刻意設計的漏洞，ADR-0005 不適用。
- **流程**：一位 reviewer 唯讀找出候選，再由 skeptic 逐一嘗試反駁。medium 以上需要三位中至少兩位認定為真，low 只需一位認定為真就算成立。四個候選都是 low，各由一位 skeptic 判定。
- **行號**：都是指現在 worktree 裡的版本。stage 6 的修正沒有動到這四個候選所在的程式碼，只有行號可能位移。

## 結論摘要

| # | 候選 | 位置 | 嚴重度 | Skeptic 判定 | 處置 |
|---|---|---|---|---|---|
| S1 | ticket 紀錄把本機 scratchpad 絕對路徑（含 uid 與 session id）寫進會 commit 的檔案 | ticket 紀錄第 80、155 行 | low | 0/1 | 駁回 |
| S2 | mutation 腳本直接改寫 worktree 的 `scripts/pre-commit.sh`，被 SIGKILL 中斷時不會還原 | scratchpad 的 `mut.py:12-27`（不在 repository 裡） | low | 0/1 | 駁回；stage 6 實際發生過一次，已偵測並還原，見 S2 的「後續」 |
| S3 | `recordingShim` 用 `cp` 複製 git 交給 hook 的 index 檔，內容與路徑完全由 git 環境決定 | `tests/__helpers__/preCommitRepo.ts:431-446` | low | 0/1 | 駁回 |
| S4 | H38 的 linked worktree 多了一個指向本 checkout `node_modules` 的 symlink，依賴 `info/exclude`，也依賴 `rmSync` 不跟隨 symlink | `tests/__helpers__/preCommitRepo.ts:454-459` | low | 0/1 | 駁回 |

沒有成立的安全 finding。stage 7 沒有修改任何程式碼。這份報告只交代審查了哪些地方、得到什麼結果，不代表這個專案已經安全。

## 逐項說明

### S1：ticket 紀錄含本機 scratchpad 路徑（駁回）

- **位置**：`.proj.tickets/0007-gh-pages-range-fixes/T-0035-hook-commit-forms.md` 第 80、155 行的 `export SCRATCH=/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0035`。
- **嚴重度**：low。**類別**：資訊揭露。**信心**：低。
- **攻擊者前提**：能讀 repository 的人，包括 fork 這個專案的老師。
- **資料流**：ticket 紀錄 commit 進 `.proj.tickets/` 後就成為 git 歷史的一部分，fork 時也會一起帶走。
- **影響**：外人會看到本機帳號名稱、UID 501 和一個 session id。這些都不是 credential，也不會進入 hook、網站或題目的執行路徑。
- **證據**：同一個 UID、帳號名稱和 session id 早已出現在 `status: done` 的 T-0036 紀錄第 524 行。T-0030 第 207 行也有本機路徑。security-T-0034 的 S8 用同樣的理由駁回過同一類候選。
- **駁回理由（0/1）**：
  - 沒有新增任何外露資訊，跨不過 B1-B5 的任何一條邊界。
  - workflow.md「Ticket records」要求驗證主張附上可重現的指令，寫出絕對路徑正是在照做。
  - repository 裡沒有「不寫本機路徑」的書面規範。
- **修正建議**：如果要從 repository 移除本機路徑，應該在 epic close-out 時一併處理所有紀錄。

### S2：mutation 腳本中斷時不還原 hook（駁回）

- **位置**：`/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0035/mut.py`。第 12 行先備份，第 18 行寫入 mutation，第 26-27 行在 `finally` 還原。
- **嚴重度**：low。**類別**：開發工具的完整性。**信心**：低。
- **攻擊者前提**：沒有外部攻擊者。`mut.py` 執行期間被 SIGKILL 中斷，或其他 Python 不會執行 `finally` 的方式中斷。
- **資料流**：`mut.py` 把 mutation 寫進 worktree 裡受版控的 `scripts/pre-commit.sh`，中斷時 `finally` 不會執行，mutation 就留在檔案裡。reviewer 推論：`.git/hooks` 由所有 worktree 共用，之後在這個 worktree 裡的 commit 會跑到被改過的 hook。這一點 reviewer 自己標為未驗證。
- **影響**：被改過的 hook 可能讓這個 worktree 的 commit 帶著過期的 `_redirects`，或 mutation 本身被誤 commit。不會刪除任何資料。
- **駁回理由（0/1）**：
  - 缺陷不在這次的變更裡。`mut.py` 是 scratchpad 裡的開發工具，不在 repository 裡，也不會出貨。
  - 教師的 range 拿不到它，也不會執行它，沒有攻擊者可以操控的輸入。
  - 殘留的 mutation 是受版控檔案的修改，`git status` 和 `git diff` 一定看得到。B3 的 CI guard 也會擋下過期的 `_redirects`。
- **後續（stage 6 實際發生一次）**：
  - stage 6 重跑 mutation 時，一個背景迴圈被中途停掉，`mut.py` 來不及還原，M1（`exit 0`）留在這個 worktree 的 `scripts/pre-commit.sh`。
  - `git diff b2a12cb -- scripts/` 立刻看到這筆殘留，用 `git restore --source=b2a12cb -- scripts/pre-commit.sh` 還原。還原後 `git diff --stat b2a12cb -- scripts/` 是空的。這段期間這個 worktree 沒有執行任何 commit。
  - 之後所有 mutation 都改在前景重跑，每次都印出 `restored`。
  - 這次經驗佐證了 skeptic 的說法：殘留看得見，而且能還原。同時也說明 finding 描述的情況確實會發生。
  - 建議在 ticket 結案前固定檢查一次 `git diff --stat b2a12cb -- scripts/`。這是流程上的建議，不是安全修正。

### S3：`recordingShim` 複製 git 交給 hook 的 index（駁回）

- **位置**：`tests/__helpers__/preCommitRepo.ts:431-446`。shim 的內容在 `:436-440`。
- **嚴重度**：low。**類別**：測試程式的 shell 組字串與檔案寫入。**信心**：低。
- **攻擊者前提**：要能控制測試行程的環境變數，或控制 `HOOK`、`PROJECT_ROOT` 的路徑。
- **資料流**：git commit 設好 `GIT_INDEX_FILE`，shim 把這個值寫進 log，再用 `cp --` 把它指向的檔案複製到 `<base>/索引 記錄/index`，最後執行 `exec bash <HOOK>`。
- **影響**：在 B1-B5 下沒有。
- **證據**：
  - `"$GIT_INDEX_FILE"` 有加雙引號，`cp` 也帶了 `--`，所以這個值只會被當成資料，不會被當成指令。
  - log、index、HOOK 三個路徑都經過 `shQuote`（`:627`），包在單引號裡，內含的單引號改寫成 `'\''`。
  - 目的地 `<base>` 來自 `mkdtemp`，`isolatedEnv` 會移除所有繼承來的 `GIT_*` 變數。
- **駁回理由（0/1）**：能控制上述前提的人，本來就能執行任意程式碼。這段只是測試 helper，不會出貨。reviewer 自己也判斷「不需要修改」。
- **備註**：`installHook` 沒有用 `shQuote` 包路徑，那是既有程式碼，security-T-0032 的 S7 已經駁回過，這次的變更也沒有讓它更容易被觸及。

### S4：H38 linked worktree 的 `node_modules` symlink（駁回）

- **位置**：`tests/__helpers__/preCommitRepo.ts:454-459`（`addWorktree`）。第 457 行建立 symlink。
- **嚴重度**：low。**類別**：測試程式的檔案系統操作。**信心**：低。
- **攻擊者前提**：沒有攻擊者。前提是未來有人把清理方式改成會跟隨 symlink，或讓 snapshot 走進 symlink。
- **資料流**：`symlinkSync(join(PROJECT_ROOT, 'node_modules'), '<base>/連結 worktree/node_modules')`。
- **影響**：照目前的程式碼沒有。
  - `removeRepo` 的 `rmSync(repo.base, { recursive: true, force: true })`（`:241`）只刪除 symlink 本身，不會進到目標目錄。
  - `snapshot` 的 walk（`:262`）遇到 symlink 只記錄連結本身，不會往下遞迴。
  - 共用的 `.git/info/exclude`（`:183`）已經排除 `/node_modules`。
- **駁回理由（0/1）**：主 fixture 第 182 行早就用同樣的方式建立連結，這次沒有引入新機制。repository 外沒有任何寫入或刪除。reviewer 自己也判斷「不需要修改」。

## stage 6 新增程式碼的安全檢查

stage 6 為了 code review 的 finding 改了以下幾處，執行者逐一檢查：

- **匯出 `lines`**（`tests/__helpers__/preCommitRepo.ts` 的 snapshot 區段）：純字串處理，沒有 I/O。
- **H36 新增 `stashLogOf`**：沿用既有的 `recordScript`，把 fixture 裡 `scripts/challenge-lint-staged.ts` 換成紀錄用的 stub，寫入範圍只在 `<base>` 底下。H36 的 unstaged 路徑檢查改成只看 `platform/`。
- **搬移 `commitStaleRedirects`、`repairRedirects`、`expectH34`**：只換了位置和註解，內容沒變。

以上檢查沒有發現新的問題。

## 審查範圍的限制

reviewer 自述的限制如下（原文照錄）：

- 沒有執行任何測試、git 或重現指令，所有結論都來自讀程式碼推論。
- 沒有讀完 `.claude/skills/security-review/references/upstream-security-review.md`、docs/agents/review.md 和 docs/adr/0005，用的是 SKILL.md 的摘要，加上 spec 對 ADR-0005 不適用的聲明。
- 沒有讀 `scripts/pre-commit.sh` 本身。本 ticket 沒有改它，hook 的既有缺陷屬於 T-0032–T-0034 的審查範圍。
- 沒有確認 simple-git-hooks 安裝的 hook 實際用哪條路徑執行 scripts/pre-commit.sh，所以第二個候選的影響鏈只是推論。
- 沒有讀 measure.sh 和 mutations.json。
- 不在本次審查範圍內：dependency scanning、可用性與 rate limiting、低嚴重度的 hardening、stage 8 的本機 clone（還沒執行）、T-0039 負責的 README、skill 和 E1/Z1 文句，以及跨 ticket 的串鏈分析（epic 結案時才做）。
- 使用者提到已開啟 auto-merge。這只是 harness 轉述的訊息，我沒有查證 PR 的狀態。如果 PR 已經開啟，auto-merge 可能在 stage 7 的 false-positive 篩選和分流完成前就合併，這點留給上層確認。

（reviewer 的候選 1-4 依序是本報告的 S1-S4。）

stage 7 執行者補充：

- 執行者同樣沒有查證 PR 與 auto-merge 的狀態，也沒有做任何 PR 或 merge 操作。這個 branch 目前還沒有 commit，HEAD 仍是 base。
- stage 6 修正後的驗證（完整指令記在 ticket 的「code review (stage 6)」）：
  - `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` → `Tests  103 passed (103)`，跑了兩次。
  - `pnpm test --run` → `Test Files  130 passed (130)`、`Tests  4473 passed | 1 skipped (4474)`。
  - `bash -n scripts/pre-commit.sh` → exit 0；`pnpm -s challenge:validate` → `All checks passed.`。
  - `pgrep -fl pre-commit.sh` 沒有輸出（exit 1）；`git diff --stat b2a12cb -- scripts/` 是空的。
- 本報告沒有做相依套件掃描、模糊測試或動態分析。

## Round 2（2026-10-23）

stage 6 第 2 輪修正之後，用同一份 prompt 重新審查。流程不變：一位 reviewer 唯讀找出候選，再由 skeptic 逐一嘗試反駁。三個候選都是 low，各由一位 skeptic 判定，全部駁回。round 2 新增的 S5–S7 接在 round 1 的 S1–S4 後面編號。

| # | 候選 | 位置 | 嚴重度 | Skeptic 判定 | 處置 |
|---|---|---|---|---|---|
| S5 | 使用者已開啟 auto-merge，stage 7、8 的 gate 可能在分流完成前就被繞過 | ticket 紀錄的 stage 7 段落（auto-merge 那一句） | low | 0/1 | 駁回 |
| S6 | S2 的影響鏈仍標為「未驗證」，但 `package.json:44` 已能定論；「這段期間沒有 commit」也沒有附指令 | 本報告 S2 段落與 round 1 的限制段落 | low | 0/1 | 駁回 |
| S7 | H36 的 `-p` 靠 stdin EOF 跳過 validator stub 的 hunk，沒有斷言 stub 沒被 commit（測試完整性，非安全） | `tests/pre-commit-sh.test.ts` 的 H36 | low | 0/1 | 駁回 |

沒有成立的安全 finding。round 2 沒有因為 stage 7 修改任何程式碼。

### S5：auto-merge 可能繞過 gate（駁回）

- **類別**：流程。**攻擊者前提**：沒有外部攻擊者。
- **駁回理由（0/1）**：
  - T-0035 的工作都還沒 commit，HEAD 仍是 base `b2a12cb`（T-0034 的本機 commit，不在 origin 上），遠端沒有含本 ticket 變更的 branch 或 PR，auto-merge 沒有東西可以合。
  - auto-merge 是 GitHub 端的設定，不在這次的 diff 裡，這次變更也沒有讓它更容易觸發。對應不到 B1–B5。
  - ticket 紀錄那一句如實寫著「沒有查證 PR 狀態」，沒有錯誤主張。
- **留給上層**：T-0035 commit 並 push 之前，先確認 auto-merge 不會在 stage 8 之前觸發合併。要不要暫停 auto-merge 由使用者決定。

### S6：S2 的影響鏈與「期間沒有 commit」（駁回）

- **類別**：紀錄的精確度。
- **駁回理由（0/1）**：
  - `package.json:44` 與 `.git/hooks/pre-commit` 的最後一行都用相對路徑 `bash scripts/pre-commit.sh`，所以每個 worktree 跑的是自己 checkout 裡的 hook。可是 S2 的推論本來就只說「之後在這個 worktree 裡的 commit 會跑到被改過的 hook」，補上這點只是把推論改成確認，影響範圍不變，S2 也已經駁回。
  - round 1 的限制段落是 reviewer 自述的原文照錄，不能改寫。
  - 「期間沒有 commit」在本報告裡有佐證：範圍段落的 HEAD 是 `b2a12cb`，round 1 執行者補充也寫明 branch 還沒有 commit。workflow.md 的「Ticket records」規範的是 ticket 紀錄，不是這份報告。
- **處置**：依指示不採取行動。

### S7：H36 的 `-p` 靠 EOF 跳過 stub 的 hunk（駁回）

- **類別**：測試完整性，不是安全問題。
- **事實**：`stashLogOf` 把 fixture 裡受版控的 `scripts/challenge-lint-staged.ts` 換成 stub，`git commit -p` 因此在 `platform/` 的四個 hunk 之後多了一個 hunk。stdin 只餵四個答案，這個 hunk 是碰到 EOF 才沒被 stage。
- **駁回理由（0/1）**：
  - git 在 EOF 時不會 stage 沒回答的 hunk，這是長期一致的行為。
  - stub 是測試自己放的儀器，不是受測行為。H36 的 O2、expected file 和 `platform/` 底下的 hunk 都還有斷言釘住。
  - 沒有跨越 B1–B5，和 ADR-0005 無關。code review 軸的同一個 finding 也以 1/3 駁回。
- **處置**：依指示不採取行動。可選的改善（在 H36 的註解補上這個 hunk，或在答案後面加 `q`）留給使用者決定。

### round 2 新增程式碼的安全檢查

round 2 為了 code review 的 R1 新增 `expectHookEntryOnTop`（`tests/pre-commit-sh.test.ts`），取代四個只比數量的斷言。它只讀 validator stub 已經寫好的紀錄，再做比對，沒有新的 I/O、shell 組字串或檔案寫入。mutation M6 放在 scratchpad 的 `mutations.json`，不在 repository 裡，由 `mut.py` 套用並還原（每次都印出 `restored`）。執行者檢查後沒有發現新的問題。

### round 2 審查範圍的限制

reviewer 自述的限制如下（原文照錄）：

- 沒有執行任何測試、git、gh 或重現指令，所有結論都來自讀程式碼推論。PR 與 auto-merge 的實際狀態沒有查證（沒有執行 gh）。
- 沒有讀 scripts/pre-commit.sh 本身。本 ticket 沒有改它（packet 與紀錄都說 git diff --stat b2a12cb -- scripts/ 是空的，我沒有自己重跑），hook 的既有缺陷屬於 T-0032 到 T-0034 的範圍。
- 只看了 scratchpad 的檔案清單，沒有讀 measure.sh、mut.py、mutations.json 的內容。這些不在 repository 裡，也不會出貨。
- 不再重複的項目：ticket 紀錄與新安全報告裡的本機 scratchpad 絕對路徑（round 1 的 S1 已以合理理由駁回；新報告 :48 也有同一類路徑，但理由相同，沒有新證據）。node_modules symlink（S4）、shim 的 cp（S3）、installHook 沒用 shQuote（security-T-0032 的 S7）也一樣不重複。
- 既有、非本次引入、也沒有回報的項目：isolatedEnv 會把非 GIT_* 的父行程環境（例如 BASH_ENV、各種 token）原樣傳給 fixture 裡的 git、hook 和 node；fixture 沒有設 GIT_CEILING_DIRECTORIES。
- 不在範圍內：dependency scanning、availability 與 rate limiting、低嚴重度的 hardening、fuzzing 與動態分析；還沒執行的 stage 8 本機 clone；T-0039 負責的 README、skill 與 E1/Z1 文句；跨 ticket 的 chain analysis（epic close-out 才做）。
- 第 3 項不屬於 security 軸，依「涵蓋優先」的要求仍然列出。

（reviewer 的候選 1-3 依序是本報告的 S5-S7。）

round 2 執行者補充：

- 執行者同樣沒有查證 PR 與 auto-merge 的狀態，也沒有做任何 PR、commit 或 merge 操作。`git rev-parse HEAD` 仍是 `b2a12cb498e3b522ef533a2fc7ac2e77acd89151`。
- 執行者重跑了 reviewer 沒有重跑的 `git diff --stat b2a12cb -- scripts/`，結果是空的。
- round 2 修正後的驗證（完整指令記在 ticket 的「review round 2 (stages 6 and 7)」）：
  - `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` → `Tests  103 passed (103)`。
  - `pnpm test --run` → `Test Files  130 passed (130)`、`Tests  4473 passed | 1 skipped (4474)`。
  - `bash -n scripts/pre-commit.sh` → exit 0；`pnpm -s challenge:validate` → `All checks passed.`；`pgrep -fl pre-commit.sh` 沒有輸出（exit 1）。
- 本報告沒有做相依套件掃描、模糊測試或動態分析。

# T-0034 安全審查報告（stage 7，第 1、2 輪）

## 範圍

- **Ticket**：T-0034「pre-commit hook 在中斷、git 失敗與第一個 commit 時都乾淨收尾」（epic 0007）
- **Base**：`d1413c2afc8edb82e7e8e58471e1dbe0a0fe6725`（T-0033 的本機 commit，位於 origin/main `707be5f` 之上）
- **HEAD**：`d1413c2afc8edb82e7e8e58471e1dbe0a0fe6725`。實作尚未 commit，審查對象是 worktree 裡的待 commit 變更。
- **Branch**：`tickets/T-0034/hook-failure-paths`
- **Worktree**：`/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0034`
- **審查的待 commit 檔案**：
  - `scripts/pre-commit.sh`（修改）
  - `tests/pre-commit-sh.test.ts`（修改）
  - `tests/__helpers__/preCommitRepo.ts`（修改）
  - `.proj.tickets/0007-gh-pages-range-fixes/T-0034-hook-failure-paths.md`（ticket 紀錄）
- **信任邊界**：spec revision 3 的 B2（pre-commit hook → 老師的 index、working tree 與 stash）。B1、B3、B4、B5 本變更沒有碰到。本 epic 不涉及題目刻意設計的漏洞，ADR-0005 不適用。
- **流程**：一位 reviewer 唯讀找出候選，每個候選再由 skeptic 嘗試反駁。medium 以上要三位裡至少兩位認定為真，low 只有一位，認定為真才算成立。stage 6 修正後，執行者另外在暫存 repository 實測了 reviewer 沒能驗證的 git 行為（見各候選的「證據」）。
- **行號**：「審查時」指 reviewer 看到的版本；「現在」指 stage 6 修正後的版本。第 2 輪的「現在」指第 2 輪修正後的版本。
- **第 2 輪**：同一套流程再審一次第 1 輪修正後的待 commit 變更，候選編號接續為 S9-S12，見文末「第 2 輪」。

## 結論摘要

| # | 候選 | 位置（審查時） | 嚴重度 | Skeptic 判定 | 處置 |
|---|---|---|---|---|---|
| S1 | `git stash push` 到 `OWN_ENTRY` 設定之間收到訊號，entry 沒被認領，unstaged 檔案從 working tree 消失且沒有 W9 | `scripts/pre-commit.sh:317-328` | medium | 3/3 成立 | 已修正（先寫失敗測試） |
| S2 | push 已存好 entry 後，`refs/stash` 的讀取失敗，entry 沒被認領 | `scripts/pre-commit.sh:322` | medium | 0/1 | 駁回；stage 6 的修正順帶縮小了這個窗口 |
| S3 | `finish` 開頭到 `trap ''` 之間收到訊號，巢狀 exit 略過整個還原 | `scripts/pre-commit.sh:214-217` | low | 0/1 | 駁回，已列為 known edge |
| S4 | 還原期間忽略訊號且由子行程繼承，hook 可能比 git 活得久、無法 Ctrl-C | `scripts/pre-commit.sh:217`、`:244` | low | 0/1 | 駁回 |
| S5 | `git commit -a` 中斷、index 消失後，W9 提示的 `git stash apply <id>` 會因 working tree 已變動而拒絕 | `scripts/pre-commit.sh:228` | low | 1/1 成立 | 實測後已修正（先寫失敗測試） |
| S6 | O7 時 `$WORK/raw` 被刪，CRLF 檔案的原始位元組永久遺失 | `scripts/pre-commit.sh:237` | low | 1/1 成立 | 第 3.1 版由 D16 (a) 記載、不改程式；第 3.2 版依實測修正範圍（見第 3 輪） |
| S7 | 測試 harness 可能用 SIGKILL 殺到 PGID 被重用的無關 process group | `tests/__helpers__/preCommitRepo.ts:450-468` | low | 0/1 | 駁回 |
| S8 | 已 commit 的 ticket 紀錄寫入本機使用者路徑與 session id | ticket 紀錄第 262、268、336 行 | low | 0/1 | 駁回 |
| S9 | push 存好 entry 後中途停下，index 已被改動；hook 認領 entry、只還原 working tree 就 drop，`^2` 是 staged 內容唯一的紀錄 | `scripts/pre-commit.sh:241-245`、`:257-258`、`:349-357`（第 2 輪審查時） | medium | 3/3 成立 | 實測後已修正（先寫失敗測試） |
| S10 | push 成功卻沒存東西時，`finish` 的認領會延伸到之後才出現的其他 entry | `scripts/pre-commit.sh:241-244`、`:348-357`（第 2 輪審查時） | low | 0/1 | 駁回 |
| S11 | missing index 時 W9 印出的 `git restore` 會直接覆寫 working tree，而且 pathspec 相對於目前目錄 | `scripts/pre-commit.sh:225-229`（第 2 輪審查時） | low | 1/1 成立 | 已修正（先寫失敗測試） |
| S12 | `killStrayGroups` 與 `killLeader` 可能對 ID 已被重用的 process group 送訊號 | `tests/__helpers__/preCommitRepo.ts:452-457`、`:478`（第 2 輪審查時） | low | 0/1 | 駁回 |
| S13 | `git commit -a`／`-i`／`-p` 時 push 中途停下，W9 第三種形式印出的 `git restore --staged --source=<id>^2` 會把 `-a` 的 staging 寫進真正的 `.git/index` | `scripts/pre-commit.sh:248-256`、`:286-289`（第 3.1 版審查時） | medium | 3/3 成立（finding F2） | 已修正（先寫失敗測試） |
| S14 | 還原只做到一半時，W9 只給 `git stash apply <id>`，而它會拒絕 | `scripts/pre-commit.sh:177-205`、`:283-284`（第 3.1 版審查時） | low | 1/1 成立（finding F9） | 已修正（先寫失敗測試） |
| S15 | D16 (a) 建議的 `git checkout <id> -- <path>` 會改動 index；有衝突的 `git stash apply` 會把其他檔案留成 staged | D16 (a)（第 3.1 版） | medium | 3/3 成立（finding F7） | 實測後改寫 D16 (a)，程式不變 |

這份報告只說明審查過哪些地方、得到什麼結果，不代表這個專案已經安全。

## 逐項說明

### S1：push 與認領 entry 之間的訊號窗口（已修正）

- **位置**：審查時 `scripts/pre-commit.sh:317-328`（`before=$(stash_top)`、`git stash push`、`after=$(stash_top)`、`OWN_ENTRY=$after`），以及 `:222` 只在 `OWN_ENTRY` 非空時才還原。現在的修正在 `:145-146`、`:238-245`、`:348`。
- **嚴重度**：medium。**類別**：中斷處理造成的資料可用性問題（unstaged 檔案從 working tree 消失，沒有任何提示）。**信心**：高。
- **攻擊者前提**：沒有外部攻擊者。老師在 `git commit` 期間按 Ctrl-C（整個 process group 收到 SIGINT），或 GUI client、timeout 對 hook 送出 SIGTERM／SIGHUP，時間點落在 stash push 執行中或剛結束時。
- **資料流**：
  1. bash 等前景指令結束後才執行已設的 trap。push 期間收到訊號時，git 可能已經寫好 `refs/stash`，並以 `--keep-index --include-untracked` 清掉 working tree 的 unstaged 修改與 untracked 檔案。
  2. 訊號只送給 hook 時，git 甚至會把 push 完整做完。
  3. 接著 `on_signal` 直接 `exit` 進入 `finish`。`after=$(stash_top)` 與 `OWN_ENTRY=$after` 都沒有執行，`OWN_ENTRY` 仍是空字串。
  4. `finish` 跳過還原，不印 W9，以 129／130／143 結束。
- **影響**：老師的 unstaged 與 untracked 檔案從 working tree 消失，只留在一個訊息為「pre-commit: stash unstaged changes」、沒有人告知的 entry 裡。這違反 O5（「at any point」）、O7（至少要印 W9），以及 hook 約束「once the hook has an entry of its own, every exit restores it」。資料可以從 `git stash list` 找回，沒有永久遺失。
- **證據**：
  - 修正前，新測試在 `/bin/bash` 3.2.57 上失敗（`expectNothingChanged` 的 `files` 不符：entry 留著、檔案不見）。
  - 第一個測試讓 git wrapper 先跑完 push 再阻塞，並先確認 stash 多了一筆、untracked 檔案已被移走，然後對 group 送 SIGINT。
  - 第二個測試讓 wrapper 在 push 之前阻塞，只對 hook 的 PID 送 SIGTERM，再放行：git 完成 push，bash 之後才執行 trap。
  - 指令：`PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t "stash push runs|H47|H26|missing index|H25|H42"`，修正前 `3 failed`。修正後原本記為 `20 passed`，但沒有任何一次執行印出這個數字（第 2 輪 Standards finding 1）。第 2 輪修改前，在第 1 輪的 hook 上重跑同一條指令 → `Tests  11 passed | 80 skipped (91)`；第 2 輪修改後 → `Tests  12 passed | 82 skipped (94)`。
- **修正**：
  - push 前設 `PUSH_STARTED=true`。`before` 在檔案開頭先初始化，`set -u` 下 `finish` 讀得到。
  - `finish` 在 `trap ''` 之後，若 `OWN_ENTRY` 為空而 push 已開始，就再讀一次 `refs/stash`。讀到的 id 非空且與 `before` 不同時，就認定是 hook 自己的 entry，接著照常還原與 drop，或走 O7／W9。
  - 再讀失敗時不認領任何 entry，所以 hook 仍不會把老師的 entry 當成自己的。
- **測試與 mutation**：
  - `describe('pre-commit.sh: a signal while the stash push runs (O5)')` 有兩個測試，都斷言 O5 完全成立，結束碼為 130 與 143。
  - M16（拿掉認領）：這兩個測試失敗。
  - M17（認領時不和 `before` 比較）在 90 個測試上原本都通過，因為 H46 的 lock 讓被誤認領的老師 entry 無法還原、仍留在 list 裡。因此新增「push 什麼都沒存就以 128 失敗」的 wrapper 測試，M17 之後在 91 個測試中失敗 1 個。
  - 指令記在 ticket 的 stage 6 紀錄（`python3 -I "$SCRATCH/mut.py" M16` 等）。
- **處置**：已修正。原本這裡寫「push 中途被殺時的兩種結果（entry 已存、尚未存）分別由上述兩個測試與 H46 涵蓋」，這個說法不對：git 先存 entry 再改 index，所以還有「entry 已存、index 已改」的中間狀態。第 2 輪的 S9 實測並涵蓋了它。

### S2：push 之後 `refs/stash` 讀取失敗（駁回）

- **位置**：審查時 `scripts/pre-commit.sh:322`（`after=$(stash_top)`）。**嚴重度**：medium（reviewer 的評估）。**類別**：錯誤處理。**信心**：中。
- **攻擊者前提**：push 剛寫好 `refs/stash`，下一個 `git rev-parse` 就回傳大於 1 的狀態，例如 repository 損毀、無法 fork，或另一個行程同時在改 repository。
- **資料流與影響**：`stash_top` 讓 run 以非零結束，entry 沒被認領：不還原、不印 W9，entry 留在 `git stash list`。
- **駁回理由（0/1）**：
  - base 在同一情境下是 `|| true`，會繼續執行並以 0 結束，unstaged 檔案靜靜留在 stash。這次的變更反而改善了結果。
  - 觸發條件在 B2 明列的模型外（「Another process changing the repository during the commit」），也沒有攻擊者可控的路徑。
  - 規格 AC-23 列出的 git 失敗是「before the hook stashed」與 H26。
- **後續**：S1 的修正讓 `finish` 會再讀一次 `refs/stash`，所以這個情境現在只在第二次讀取也失敗時才會發生。ticket 的 known edge 已改寫。這一點是讀程式碼推得，沒有測試去驅動。

### S3：`finish` 開頭兩行的訊號窗口（駁回）

- **位置**：審查時 `scripts/pre-commit.sh:214-217`（`local status=$?` 到 `trap '' INT TERM HUP`）。**嚴重度**：low。**類別**：中斷處理。**信心**：中。
- **攻擊者前提**：run 因 `set -e` 或正常結束進入 `finish`，訊號剛好落在那兩個 statement 之間。走訊號路徑進入時，`on_signal` 已經先設了 `trap ''`，沒有這個窗口。
- **影響**：還原被略過，entry 留在 `git stash list`，`$WORK` 殘留，沒有 W9。
- **駁回理由（0/1）**：
  - base 只有 EXIT trap，整段 `finish` 都會被訊號中斷。這次的變更把窗口從整段還原縮到兩個 statement。
  - bash 沒有 sigprocmask 之類的機制，`$?` 必須先存下來，窗口無法完全消除。
  - 已列在 ticket 的 known edges。

### S4：忽略訊號由子行程繼承（駁回）

- **位置**：審查時 `scripts/pre-commit.sh:217`、`:244`。**嚴重度**：low。**類別**：中斷處理、可用性。**信心**：低。
- **攻擊者前提**：老師自己的 filter 或 fsmonitor 設定讓還原卡住；或 `git commit -a` 被 Ctrl-C 後，hook 還在背景執行，同時老師下了另一個 git 指令。
- **駁回理由（0/1）**：
  - traceability 的 hook 約束明文要求「While restoring, the hook ignores INT, TERM and HUP」。子行程若恢復預設處置，第二次 Ctrl-C 就會讓還原停在一半，正是 M2 證明會發生的情況。
  - 改用 SIGKILL 時，`drop_entry` 還沒執行，entry 仍在。SIGKILL 在 B2 的模型外。
  - prompt 回來時，hook 所在的 process group 已經是背景群組，Ctrl-C 本來就送不到 hook，不是這次變更延長了窗口。
- **建議**：README 可以提到「Ctrl-C 之後 hook 可能還會在背景跑一下才結束」，屬於 T-0039 的文件範圍。

### S5：missing index 後 W9 的 `git stash apply` 會拒絕（已修正）

- **位置**：審查時 `scripts/pre-commit.sh:228`（missing-index guard 呼叫 `keep_entry`）。現在是 `:219-230` 的 `keep_entry_without_index` 與 `:255`。
- **嚴重度**：low。**類別**：補救步驟錯誤（違反 spec 的 W9／O7 保證，不是 B1-B5 意義下的攻擊路徑）。**信心**：高（已實測）。
- **攻擊者前提**：沒有攻擊者。老師用 `git commit -a`（或 `-p`、`-i`）時按 Ctrl-C，git 先移除自己的 `index.lock`，hook 走 missing-index 分支（O7）。
- **資料流**：
  1. `-a` 把 tracked 修改 stage 進 `index.lock`，hook 以這份 index 執行 `--keep-index` 的 stash。tracked 修改留在 working tree，untracked 檔案進入 entry 的 `^3`。
  2. git 中斷後 `.git/index` 回到 commit 前的版本，working tree 與 `.git/index` 在這些檔案上不一致。
  3. 照 W9 執行 `git stash apply <id>`，git 回報「would be overwritten」並中止。
- **影響**：
  - `-a`：git 2.54.0 仍會先放回 untracked 檔案，tracked 修改本來就還在，資料其實都在原位，但老師看到的是 git 錯誤。
  - 部分 `-p`：沒被 stage 的其他檔案，其 unstaged 修改不會回來，只留在 entry 裡。
- **證據**（git 2.54.0，本次 session 的 scratchpad，不在 repository 裡；`SCRATCH=/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0034`）：
  - `/bin/bash "$SCRATCH/apply-after-a.sh" "$SCRATCH" a`：`apply=1`，git 列出 `a`、`p`，untracked 檔案回來，tracked 修改仍在。
  - `/bin/bash "$SCRATCH/apply-after-a.sh" "$SCRATCH" p`：`apply=1`，無關檔案 `a` 的 unstaged 修改沒有回來。
  - `/bin/bash "$SCRATCH/restore-after-p.sh" "$SCRATCH" a` 與 `... p`：改用 `git restore --source=<id> --worktree` 加上 `git restore --overlay --source=<id>^3 --worktree`，兩種模式都 `restore-tracked=0`、`restore-untracked=0`、所有檔案回來，且 `index unchanged`。
- **修正**：
  - missing index 時，W9 仍保留 W9 規範要求的 entry id 與 `git stash apply <id>`。
  - 訊息會說明 apply 在這裡可能拒絕，並印出不動 index 就能放回所有檔案的指令：`git restore --source=<id> --worktree -- platform/ ':(exclude)platform/public/_redirects'`。entry 有 untracked 檔案時，再接 `&& git restore --overlay --source=<id>^3 --worktree -- platform/`。
- **測試與 mutation**：
  - H47 的 O7 分支用 `sh -c` 照老師貼上的方式執行印出的指令，斷言每個檔案、untracked 清單與 index 都和執行前相同。
  - missing-index 測試改成 `it.each`，分別驗證 `git stash apply` 與印出的指令。它的 entry 含有 working tree 沒有的 tracked 修改，模擬 `-p` 的情況。
  - 修正前 H47 失敗（`expected null not to be null`，沒有補救指令）。修正後通過。M18（拿掉 `^3` 那段）讓兩者都失敗。
- **處置**：已修正。CRLF 檔案經這兩個指令一樣會變成 LF，見 S6。

### S6：O7 時原樣副本被刪，CRLF 原始位元組遺失（保留為 known edge）

- **位置**：審查時 `scripts/pre-commit.sh:237`（`rm -rf "$WORK"`，兩個 O7 分支都會執行）。**嚴重度**：low。**類別**：資料完整性（B2 的「byte for byte」保證）。**信心**：中高。
- **攻擊者前提**：沒有攻擊者。老師的 unstaged 檔案含 CRLF，而 index 裡沒有 CRLF（新的 untracked 檔，或原本是 LF、被改成 CRLF 的檔案），之後 hook 走 O7。
- **資料流**：在 `* text=auto eol=lf` 下，git stash 存的是轉成 LF 的內容。原始位元組只剩 `$WORK/raw`，O7 時跟著 `$WORK` 一起刪除。W9 的 `git stash apply` 或 S5 新增的 `git restore` 都只能拿回 LF 版本。本變更新增的 missing-index 分支，讓中斷的 `git commit -a` 也會走到這條路徑。
- **影響**：只有行尾改變，沒有其他內容遺失。但這與 B2、H26 以及 traceability 第 538 行「O7 keeps the bytes in the entry … B2's guarantee holds once the entry is applied」不符。
- **Skeptic 判定**：1/1 成立。這和 stage 6 Spec 軸的 finding 5（H26 對 CRLF 與重疊 hunk 不是逐位元組）是同一個缺口。
- **為什麼沒有修**：兩種修法都需要使用者裁決。
  - (a) O7 時保留 `$WORK/raw`，並在 W9 寫出位置。這是新增的保證，依全域規則 5 要先做副作用檢查：原樣副本會留在 `TMPDIR`，而且 W9 的 id 不再是完整的補救方式。
  - (b) 修訂 traceability 的 H26、O7、第 538 行與 spec 的 B2，寫明 CRLF 與重疊 hunk 不保證逐位元組。這屬於 spec 變更，不在本 ticket 範圍。
- **處置**：保留為 known edge，ticket 的 H26 驗收條件改為未勾選並註明，待使用者裁決。

### S7：harness 可能殺到 PGID 被重用的 process group（駁回）

- **位置**：審查時 `tests/__helpers__/preCommitRepo.ts:450-468`（`done()` 的 finally）。**嚴重度**：low。**類別**：測試程式的行程管理。**信心**：低。
- **駁回理由（0/1）**：
  - POSIX 規定 process group 還有成員時，它的 ID 不會被重新分配。
  - finally 的 SIGKILL 只在兩種情況下執行：一是 group 剛被確認已消失，兩次 syscall 相鄰、中間沒有 await；二是 group 剛被確認仍存在。所以不存在 30 秒的重用窗口。
  - 攻擊者無法控制 PID 的分配，也沒有越過任何信任邊界。
- **備註**：stage 6 為了另一個 finding 修改了這段（`killStrayGroups` 登記清單）。新增的 `afterEach` 清理同樣先以 `kill(-pgid, 0)` 確認 group 仍存在才送 SIGKILL。

### S8：ticket 紀錄含本機路徑與 session id（駁回）

- **位置**：ticket 紀錄第 262、268、336 行（審查時）。**嚴重度**：low。**類別**：資訊揭露。**信心**：低。
- **駁回理由（0/1）**：
  - 同樣的帳號名稱、UID 501、目錄結構與 session id，早已出現在已 commit 的 T-0030、T-0032、T-0036 紀錄與 security-T-0032 報告裡。
  - session id 不是 credential。
  - 這些文字不會進入 hook、網站或題目的執行路徑。
- **備註**：若要從 repository 移除本機路徑，應該在 epic close-out 時一併處理所有紀錄。

## stage 6 新增程式碼的安全檢查

執行者對 stage 6 加的程式碼檢查了以下幾點：

- **`finish` 的認領**（現在 `:238-245`）：只讀 `refs/stash`，不寫任何東西。認領條件是 id 非空、與 push 前的 `before` 不同，而且 push 已開始。push 什麼都沒存時，`refs/stash` 等於 `before`，不會把老師的 entry 當成自己的；這一點由「push 什麼都沒存就失敗」的測試與 M17 釘住。讀取失敗時不認領任何 entry。
- **W9 的補救指令**（現在 `:219-230`）：印出的字串只含 hook 自己的 40 hex commit id 與固定的 pathspec，沒有任何來自 working tree 或使用者輸入的內容。`git restore --source=<id> --worktree` 只寫 working tree、不動 index；`--overlay` 那段不會刪除任何檔案。兩者都由 git 處理，git 不會寫入位在符號連結後面的路徑。這些指令由老師自己決定是否執行，hook 不會執行。
- **測試輔助程式**：`wrapScript` 的 `prelude` 只來自測試程式碼本身。`killStrayGroups` 只對 `startGroup` 自己啟動的 group 送訊號。新的 wrapper 模式 `run-then-block` 只在 `mkdtemp` 建出的暫存目錄裡運作。

上述檢查沒有發現新的問題。

## 審查範圍的限制

reviewer 自述的限制如下（原文照錄）：

- **沒有執行任何東西。** 所有結論都來自讀程式碼與 packet 內容：沒有跑測試、hook 或 git 實驗。特別是候選 1、5 對 git 與 bash 行為的推論沒有實測：git stash push 被 SIGINT 中斷時做到哪一步，以及 stash apply 遇到 dirty working tree 時是否拒絕。
- **未驗證 bash 5 的 trap 行為。** 目前只依 packet 記載的 bash 3.2 量測。
- **沒有審查** T-0032／T-0033 已落地的既有程式碼，只當上下文讀。若候選是既有窗口但本變更宣稱已處理，我仍列出，並註明不是新寫的程式碼。
- **第一階段的 parent 工作未由我執行。** 範圍來自 parent 給的 packet，我沒有自己跑 git status、git diff 或 git ls-files 去驗證。
- **依 skill 排除的範圍：** 依賴套件掃描、可用性與 rate limiting（例如巨大的 untracked 清單放進記憶體）、一般低嚴重度 hardening、CI 設定（B3）、建置與前端（B1、B4，本變更沒碰）、create:challenge（B5）。
- **其他排除：** 跨 ticket 的 chain analysis（屬 epic close-out）、mut.py 等 repository 外的 scratchpad 腳本本身的安全性。
- **其他行程同時改動 repository**，B2 明列為模型外。候選 4 只在 hook 自身延長存活時才提出。
- **既有、非本變更新增、因此沒有列為候選的路徑：** 只有 git 收到訊號、hook 沒收到時，hook 會在 git 已刪掉的 index.lock 上繼續 git add，留下殘留的 index.lock。

stage 7 執行者補充：

- reviewer 沒有實測的兩點，stage 6 補做了以下部分：
  - 候選 5：用 git 2.54.0 實測了 stash apply 遇到 dirty working tree 的行為（見 S5 的證據）。apply 會拒絕，但仍先放回 untracked 檔案。
  - 候選 1：「push 已存好 entry 之後收到訊號」與「只有 hook 收到訊號、git 完成 push」兩種狀態，由兩個新測試在 `/bin/bash` 3.2.57 上驅動。
  - git 在 push 中途被 SIGINT 殺掉時究竟停在哪一步，仍沒有實測。
- bash 5 的行為仍交給 CI 的 ubuntu 執行同一批測試判定，本機沒有 bash 5。
- stage 6 之後的驗證：
  - `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts --reporter=verbose` 連跑三次，每次都是 `Tests  91 passed (91)`、`H47 took O7`。
  - `pnpm test --run` → `Test Files  130 passed (130)`、`Tests  4461 passed | 1 skipped (4462)`。
  - `pgrep -fl pre-commit.sh` 沒有輸出（exit 1）。
  - 完整指令記在 ticket 的 stage 6 紀錄。
- 本報告沒有做相依套件掃描、模糊測試或動態分析。

## 第 2 輪

### 結論摘要

第 2 輪 reviewer 提出四個安全候選，都在 B2。兩個成立（S9、S11），兩個駁回（S10、S12）。S11 和 Spec 軸的 finding 5（pathspec 相對於目前目錄，3/3 成立）是同一個缺口，一起修正。

### S9：push 中途停下、index 已改時，hook 把 entry drop 掉（已修正）

- **位置**：第 2 輪審查時 `scripts/pre-commit.sh:241-245`（`finish` 認領 entry）、`:257-258`（`restore_entry` 成功就 `drop_entry`）、`:349-357`（push 回報失敗後照樣認領）。現在的修正在 `:243-256`（`index_as_stashed`、`keep_entry_for_index`）與 `:283-292`。
- **嚴重度**：medium。**類別**：中斷處理造成的資料遺失（staged 內容只剩 dangling commit）。**信心**：高（已實測）。
- **攻擊者前提**：沒有攻擊者。老師在 `git commit` 期間按 Ctrl-C，訊號落在 `git stash push` 存好 entry 之後、做完之前；或 push 在這段期間失敗。
- **資料流**：
  1. 帶 pathspec 的 `git stash push --keep-index --include-untracked` 先寫入 `refs/stash`，再依序執行 `git add`、`git diff-index`、`git apply --index -R`、`git checkout --no-overlay`。
  2. 在 `git add` 之後停下：unstaged 修改與 untracked 檔案已被 stage。在 `git apply -R` 之後停下：platform/ 底下 staged 的變更從 index 消失，working tree 回到 `HEAD`。
  3. `finish` 認領 entry，`restore_entry` 只寫 working tree，成功後就 drop。index 沒有還原，唯一的紀錄 `<id>^2` 跟著 entry 從 stash list 消失。
- **影響**：H19 型部分 stage 的 staged 版本實際上遺失；或 untracked 檔案被悄悄 stage，老師下一次 commit 可能把它送上公開網站。結束方式既不是 O5（index 不同），也不是 O7（entry 沒保留）。
- **證據**（git 2.54.0，scratchpad，不在 repository 裡；`SCRATCH=/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0034`）：
  - `GIT_TRACE=1 git stash push --keep-index --include-untracked -q -m m -- p ':(exclude)p/r'`：子指令依序是 `add`、`diff-index`、`apply --index -R`、`checkout --no-overlay`，都從 git 的 exec path 執行。
  - `/bin/bash "$SCRATCH/r2/mid-push.sh" "$SCRATCH/r2" add`（以及 `apply`、`checkout`）：用 `GIT_EXEC_PATH` 讓 git 自己的子指令卡住，再對 group 送 SIGINT。三種情況 `refs/stash` 都多了一筆 entry，也都沒有殘留 `index.lock`。卡在 `add`：`cached vs ^2: 0`。卡在 `apply`：`cached vs ^2: 1`，unstaged 修改與 untracked 檔案已 stage。卡在 `checkout`：`cached vs ^2: 1`，staged 變更從 index 消失。
- **修正**：
  - `index_as_stashed` 比較 platform/ 底下（不含 `_redirects`）的 index 與 entry 的 index commit。只有還原完成、而且比較相同時，`finish` 才 drop entry；比較失敗也算不同。
  - 不同時保留 entry，以 `keep_entry_for_index` 印出第三種 W9：檔案已經放回、不需要 `git stash apply <id>`，並印出把 index 放回的 `git restore --staged --source=<id>^2 -- ':(top)platform/' ':(top,exclude)platform/public/_redirects'`。
  - hook 自己不執行這個指令：B2 寫明 hook 只 stage `_redirects`。這個結束方式在 traceability 裡既不是 O5 也不完全是 O7，列為 known edge，和 finding 5 一起待使用者裁決。
- **測試與 mutation**：
  - 新的測試輔助 `gitChildBlocker` 讓 git 自己的子指令卡住。新 describe「a stash push that stops after it stored its entry and changed the index (O7, W9)」以 `it.each` 涵蓋 `apply --index -R` 與 `checkout --no-overlay` 兩種狀態：結束碼 130、W9 的 id 列在老師的 entry 上面、檔案全部放回、index 仍不同；在 `platform/challenge/door/` 執行印出的指令後，一切回到原狀。
  - 修正前：`PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t "stops after it stored|missing index|H47" --reporter=verbose` → `Tests  3 failed | 3 passed | 88 skipped (94)`，兩個新測試是 `expected '' to contain 'git stash apply'`（entry 被 drop）。修正後同一條指令 → `Tests  6 passed | 88 skipped (94)`。
  - M20（拿掉 index 比較）：兩個新測試失敗。指令 `python3 -I "$SCRATCH/mut.py" M20`。
- **處置**：已修正。卡在 `git add` 或 `git diff-index` 期間停下時，index 仍與 entry 相同（實測 `cached vs ^2: 0`），hook 照常還原並 drop，是 O5。

### S10：`finish` 的認領延伸到整個 run（駁回）

- **位置**：第 2 輪審查時 `scripts/pre-commit.sh:241-244`、`:348-357`。**嚴重度**：low。**類別**：stash entry 辨識。**信心**：中。
- **攻擊者前提**：push 回傳 0 卻沒存任何東西，之後在同一個 run 裡有另一個行程寫入 `refs/stash`。
- **駁回理由（0/1）**：
  - 需要另一個行程在 commit 期間改動 repository，B2 明列為模型外。
  - 「push 回傳 0 卻沒存東西」的觸發條件（例如 dirty submodule、內嵌 repository）是推論，沒有實測。
  - push 一結束就清掉 `PUSH_STARTED` 是可選的加固，不是違反 spec 的缺陷，這次沒有做。

### S11：missing index 的 `git restore` 指令會覆寫，pathspec 是相對路徑（已修正）

- **位置**：第 2 輪審查時 `scripts/pre-commit.sh:225-229`。現在是 `:228`（`PRINTED_REST`）與 `:235-241`。
- **嚴重度**：low。**類別**：補救步驟錯誤。**信心**：中（相對路徑已實測，覆寫是 git 的既有語意）。
- **攻擊者前提**：沒有攻擊者。老師在子目錄執行被中斷的 `git commit -a`，或在中斷後又改了 platform/ 底下的檔案，才貼上 W9 的指令。
- **影響**：在子目錄執行時，第一條指令以「pathspec 'platform/' did not match」失敗，`&&` 後面放回 untracked 檔案的那條也不會執行，entry 仍在。中斷後才做的修改會被覆寫。
- **修正**：
  - pathspec 改為 `':(top)platform/' ':(top,exclude)platform/public/_redirects'`，`^3` 那段改為 `':(top)platform/'`，在任何目錄都能執行。
  - 訊息註明這兩個指令會用 entry 的內容覆寫 platform/ 底下的檔案，要在改動任何東西之前執行。S9 的 `git restore --staged` 指令也用同樣的 pathspec，並註明會覆寫 platform/ 底下已 stage 的內容。
- **測試與 mutation**：
  - missing-index 測試新增第三個變體，在 `platform/challenge/door/` 執行印出的指令。修正前失敗於 git 的「路徑規格 'platform/' 未符合任何 git 已知檔案」（本機 git 的中文訊息），修正後通過（同 S9 的指令）。
  - M21（pathspec 改回相對路徑）：`3 failed`，S9 的兩個測試與子目錄變體。
- **處置**：已修正。README 或 skill 是否要說明這些指令，屬於 T-0039 的範圍，已記在 ticket 的 known edge。

### S12：harness 可能對重用的 ID 送訊號（駁回）

- **位置**：第 2 輪審查時 `tests/__helpers__/preCommitRepo.ts:452-457`（`killStrayGroups`）、`:478`（`killLeader`）。**嚴重度**：low。**類別**：測試程式的行程管理。**信心**：低。
- **駁回理由（0/1）**：
  - group 只要還有成員，它的 ID 就不會被重新分配。要在一個測試剩下的時間內重用同一個號碼，系統得先回捲將近 10 萬個 PID。
  - `kill` 只對同一個 uid 生效，沒有攻擊者能控制 PID 配置，也沒有越過 B1-B5。
  - 和 S7 類似，但涉及新增的 `afterEach` 路徑、窗口較長，所以另外列出。

### 第 2 輪審查範圍的限制

reviewer 自述的限制如下（原文照錄）：

- 沒有執行任何指令（這次 session 沒有 shell 工具），所以沒跑測試、沒跑 hook，也沒做 git 實驗。finding 1 對 builtin/stash.c 中 pathspec push 順序的描述（store、add、diff-index|apply --index -R、checkout --no-overlay）出自 reviewer 對 git 原始碼的記憶，沒有在 git 2.54.0 上實測。finding 2 中「push exit 0 但沒存東西」的觸發條件（dirty submodule、內嵌 repository）也是推論。
- 依 skill 與指示排除的範圍：
  - B1、B3、B4、B5（本變更沒有碰到）；
  - 相依套件掃描、可用性與 rate limiting、一般的 hardening；
  - repository 外的 scratchpad 腳本（mut.py、drive.mjs、m3.sh 等），沒有審查其安全性；
  - 跨 ticket 的 chain analysis（屬於 epic close-out）；
  - T-0032／T-0033 已落地的程式碼，只當上下文閱讀。
- 沒有重新審查 round 1 已裁決的項目：S2、S3、S4、S7、S8 已駁回；S6 與 Spec #5（CRLF 與重疊 hunk）待使用者裁決。finding 4 和 S7 類似，但涉及的是新增的 afterEach 路徑，窗口更長，所以另外列出。
- 沒有驗證 bash 5 的 trap 行為。
- 沒有自己跑 git status、git diff 去確認範圍，範圍以 packet 為準。packet 列出了 4 個修改檔案與 1 個 untracked 檔（security-T-0034.md），已涵蓋待 commit 與 untracked 的變更。
- 使用者提到已開啟 auto-merge：這一輪只做唯讀審查，不涉及 PR 或 merge 操作。

（reviewer 的 finding 1-4 依序是本報告的 S9-S12。）

stage 7 執行者補充：

- reviewer 沒能實測的 finding 1（S9）中 git 的執行順序與中間狀態，已用 `GIT_TRACE` 與 `mid-push.sh` 在 git 2.54.0 上實測，見 S9 的證據。finding 2（S10）的觸發條件仍未實測。
- 第 2 輪修正後的驗證（完整指令記在 ticket 的「review round 2」）：
  - `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts --reporter=verbose` 連跑三次，每次都是 `Tests  94 passed (94)`、`H47 took O7`。
  - `pnpm test --run` → `Test Files  130 passed (130)`、`Tests  4464 passed | 1 skipped (4465)`。
  - `bash -n` 與 `/bin/bash -n scripts/pre-commit.sh` 都是 exit 0；`pnpm -s challenge:validate` → `All checks passed.`。
  - `pgrep -fl pre-commit.sh` 沒有輸出（exit 1）。
- 本報告第 2 輪同樣沒有做相依套件掃描、模糊測試或動態分析。

## 第 3 輪（第 3.1 版的審查）

### 結論摘要

對第 3.1 版（D16）的審查提出 F1–F18。其中三項涉及老師的 index 與工作樹（B2）：F2、F9 成立並改了程式（S13、S14），F7 成立並改寫 D16 (a)（S15）；S6 的範圍依同一次實測修正。其他成立的 finding 是 spec 文字，不涉及安全。完整紀錄與指令在 ticket 的「2026-10-24 — review of revision 3.1 (D16)」。

### S13：`index.lock` 上 push 中途停下，W9 的指令會改動真正的 index（已修正）

- **位置**：第 3.1 版審查時 `scripts/pre-commit.sh:248-256`（`index_as_stashed`、`keep_entry_for_index`）與 `:286-289`（`finish` 的分支）。**嚴重度**：medium。**類別**：資料完整性（老師的 staging）。**信心**：高（三位 skeptic 都實測過）。
- **攻擊者前提**：沒有攻擊者。老師用 `git commit -a`（或 `-i`、`-p`），而 hook 的 stash push 在 git 自己的 `apply --index -R` 或 `checkout --no-overlay` 這一步失敗，git 仍握著 `index.lock`。
- **資料流**：hook 比較的是 `GIT_INDEX_FILE` 指的 `index.lock`，發現它和 `<id>^2` 不同，就印出第三種 W9。hook 失敗後 git 丟棄 lock，`.git/index` 其實沒變；但 `<id>^2` 記的是 lock 的內容，含 `-a` 自動 stage 的所有 tracked 變更。老師照 W9 執行 `git restore --staged --source=<id>^2`，就會把沒打算 stage 的檔案 stage 進 `.git/index`，部分 stage 的版本也被蓋掉。
- **修正**：`on_own_index` 判斷出 `.lock` 形式時設定 `ON_LOCK=true`。`finish` 在 index 與 `<id>^2` 不同、而且 `ON_LOCK=true` 時，不印 W9，直接 drop entry（檔案已放回），並保持非零結束碼，讓 git 一定丟棄 lock。結果是 O5，`.git/index` 不變（D16 (b)，第 3.2 版）。hook 仍然不寫 `platform/` 底下 `_redirects` 以外的 index entry。
- **測試與 mutation**：`gitChildBlocker` 新增 `fail` 模式。H49 以 `it.each` 透過真正的 `git commit -a` 讓兩個子指令各自失敗。修正前：`PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t "H48|H49|H50"` → `Tests  3 failed | 4 passed | 92 skipped (99)`，H49 兩個都是 `expected '[pre-commit] ✗ Could not put your sta…' not to contain 'git restore --staged'`。修正後同一條指令（加上 `H26|H47|missing index`）→ `Tests  12 passed | 87 skipped (99)`。M22（`if [ "$ON_LOCK" = true ]` 改成 `if false`）→ H49 兩個失敗。
- **處置**：已修正。自己的 index 上（一般 `git commit`、`--amend`、linked worktree、直接執行）仍是 O7 加第三種 W9（H48）。

### S14：還原做到一半時，W9 的 `git stash apply` 會拒絕（已修正）

- **位置**：第 3.1 版審查時 `restore_entry`（`:177-205`）與 `finish`（`:283-284`）。**嚴重度**：low。**類別**：復原指引錯誤（沒有資料遺失）。
- **前提**：`platform/` 底下有個沒有寫入權限的目錄，裡面有 untracked 檔案。push 刪不掉它（只有警告，結束碼 0），還原時 `checkout-index` 也覆寫不了它，但 tracked 檔案已經放回去。
- **修正**：W9 第一種形式除了 `git stash apply <id>`，也印出 missing-index 形式用的 `git restore` 指令（抽成 `restore_commands`），並說明 apply 因檔案已回來而拒絕時改用它們；它們會覆寫 `platform/` 底下的檔案，訊息照樣說明（D16 (c)）。
- **測試與 mutation**：H50（root 執行時略過）。修正前同上一條指令，H50 失敗在 `runPrintedRestore`（沒有可執行的指令）。M23（拿掉這段文字）→ H50 失敗。

### S15：D16 (a) 的復原步驟會改動 index（改寫 D16 (a)）

- **證據**：以 hook 自己的 push 指令實測（git 2.54.0，`/bin/bash` 3.2.57；腳本與輸出見 ticket）。有衝突的 `git stash apply` 讓所有合併進來的檔案都變成 staged；`git checkout <id> -- <path>` 連同 index 一起寫；與 staged hunk 相鄰（中間沒有未變動的行）的 unstaged hunk 也會衝突。W9 印出的 `git restore` 指令不碰 index，除了 CRLF 之外每個檔案都逐 byte 回來。
- **處置**：D16 (a) 改寫成實測結果，並指出在 repository 自己的 index 上，`git restore --staged --source=<id>^2` 能把 index 放回去；在 `index.lock` 上 `<id>^2` 是 `-a` 的 staging，所以改用 `git restore` 指令。
- **S6 的範圍**：只有 index 版本不含 CR 的檔案會失去 CRLF；index 版本已含 CR 的檔案原樣保存。`ident` 等屬性造成的轉換同樣不是逐 byte。這個 repository 的 `.gitattributes` 沒有設定這類屬性。

### 第 3 輪審查範圍的限制

- `-i` 與 `-p` 的 lock 情況沒有實際執行，依據是 git 原始碼中與 `-a` 相同的路徑。
- 還原時跳過 symbolic link 底下的路徑（`result=1`），是另一種做到一半的結束方式，只從程式碼判讀，沒有執行。
- 同樣沒有做相依套件掃描、模糊測試或動態分析。

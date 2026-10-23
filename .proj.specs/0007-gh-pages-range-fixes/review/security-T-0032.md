# T-0032 安全審查報告（stage 7）

## 範圍

- **Ticket**：T-0032「pre-commit hook 依 staged snapshot 重新產生並 stage `_redirects`」（epic 0007）
- **Base**：`a54e917`（epic 文件 commit）
- **HEAD**：`a54e917d364e46049829552db45d150a8c19526c`。實作尚未 commit，審查對象是 worktree 裡的待 commit 變更。
- **Branch**：`tickets/T-0032/hook-regenerates-and-stages`
- **Worktree**：`/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0032`
- **審查的待 commit 檔案**：
  - `scripts/pre-commit.sh`（修改）
  - `scripts/generate-redirects.ts`（修改）
  - `tests/pre-commit-sh.test.ts`（修改）
  - `tests/__helpers__/preCommitRepo.ts`（新增、未追蹤）
  - `.proj.tickets/0007-gh-pages-range-fixes/T-0032-hook-regenerates-and-stages.md`（ticket 紀錄）
- **信任邊界**：spec revision 3 的 B2（pre-commit hook → 老師的 index 與 working tree）為主，B4、B5 只確認本 ticket 沒有碰到。本 epic 沒有碰任何題目刻意設計的漏洞，ADR-0005 不適用。
- **流程**：一位 reviewer 唯讀找出候選，每個候選再由三位 skeptic 各自嘗試反駁，至少兩位認定為真才算成立。stage 6 修正後，執行者另外在暫存 repository 重現了 reviewer 沒能驗證的 git 行為（見「審查範圍的限制」）。

## 結論摘要

| # | 候選 | 位置 | 嚴重度 | Skeptic 判定 | 處置 |
|---|---|---|---|---|---|
| S1 | `physical_path` 的 `cd` 受 `CDPATH` 影響，誤拒 `git commit -a` | `scripts/pre-commit.sh:67`（審查時為 :56） | low | 2/3 成立 | 已修正（先寫失敗測試） |
| S2 | `restore_entry` 的 `rm` 迴圈經由符號連結的上層目錄，刪掉 repository 外的檔案 | `scripts/pre-commit.sh:115-145`、`:209-212`（審查時為 :97、:160） | medium | 1/3 成立，依規則駁回 | 使用者決定在 T-0032 修正；2026-10-22 已修正（先寫失敗測試） |
| S3 | `cp` 寫入 `_redirects` 時跟隨符號連結 | `scripts/pre-commit.sh:163`、`:256` | low | 0/3 | 駁回 |
| S4 | W4 原樣印出未追蹤目錄名稱（終端機控制字元） | `scripts/pre-commit.sh:193-201`、`:269` | low | 0/3 | 駁回 |
| S5 | `--staged` 不驗證 slug 格式，可產生格式錯誤的規則行 | `scripts/generate-redirects.ts`（`numericRules`、`formatRules`） | low | 0/3 | 駁回 |
| S6 | `git stash push` 寫好 entry 後才失敗，hook 不記錄也不提示 | `scripts/pre-commit.sh:227` | low | 0/3 | 駁回，轉給 T-0034 參考 |
| S7 | 測試輔助程式把 checkout 路徑直接插進 hook 的 shell 腳本 | `tests/__helpers__/preCommitRepo.ts:196` | low | 0/3 | 駁回 |

這份報告只說明審查過哪些地方、得到什麼結果，不代表這個專案已經安全。

## 逐項說明

### S1：`CDPATH` 讓 `git commit -a` 被誤判為帶路徑的 commit（已修正）

- **位置**：`scripts/pre-commit.sh:67`，`physical_path`。審查時在 :56。
- **嚴重度**：low。**類別**：環境變數造成的路徑解析錯誤（可用性、符合 AC-22）。**信心**：機制高，觸發頻率中。
- **攻擊者前提**：沒有外部攻擊者。老師自己的 shell export 了 `CDPATH`，而且其中有 `.`，或有一個底下有 `.git` 的目錄（例如家目錄本身就是 dotfiles repository）。
- **資料流**：一般 checkout 裡，`git rev-parse --git-path index` 回傳相對路徑 `.git/index`，`physical_path` 接著執行 `cd .git`。bash 的 `cd` 遇到不以 `/`、`./`、`../` 開頭的目錄會查 `CDPATH`，用到某個非空項目時會把新目錄印到 stdout。這段輸出會被 `$(...)` 一起抓進去。結果 `own` 變成兩行字串，或指向別的 repository 的 `.git`。`git commit -a` 給的 `GIT_INDEX_FILE` 是絕對路徑，不受影響，所以兩者比對失敗。
- **影響**：hook 印出 W8 並以 exit 1 結束，`git commit -a` 被拒絕。index、working tree、stash 都還沒動到，所以不會遺失資料。這不會讓外來的 index 被當成自己的 index，B1-B5 都沒有被突破。
- **證據**：stage 7 執行者在 bash 3.2.57 上實測，`CDPATH=.` 也會讓 `cd` 印出目錄。新測試「H31 with CDPATH exported」（`tests/pre-commit-sh.test.ts:617`，`CDPATH=.:<底下有 .git 的目錄>`）在修正前失敗，錯誤是「expected 1 to be +0」，stderr 是 W8。
- **修正**：改成 `CDPATH= cd -- "$(dirname "$1")"`，並在註解寫明原因。
- **處置**：已修正。修正後測試通過；把修正改回去的 mutation M6 會讓這個測試失敗（ticket 的 stage 6 紀錄有指令）。

### S2：`rm` 迴圈經由符號連結的上層目錄刪到 repository 外（2026-10-22 已修正）

- **位置**：審查時是 `scripts/pre-commit.sh:97` 的 `restore_entry` 裡 `rm -f -- "$path"` 迴圈，刪除清單來自 :160 的 `git diff -z --name-only --diff-filter=D`。修正後的程式碼在 `:115-145`（`restore_entry`）、`:99-106`（`behind_link`）與 `:209-212`（刪除清單）。
- **嚴重度**：medium（reviewer 的評估）。**類別**：符號連結跟隨（CWE-59），會刪除資料。**信心**：reviewer 原本的情境不成立；stage 7 實際重現了另一個變體。
- **攻擊者前提**：沒有外部攻擊者，這是老師自己的操作造成的。條件如下：
  - 老師 stage 了一個新題目，例如 `platform/challenge/x/src/app.py`，HEAD 裡沒有這個檔。
  - 接著把 `src/` 移到 repository 外，再用符號連結接回來。
  - 這次 commit 觸發了 hook，而且 `platform/` 底下另有未 stage 的變更，所以 hook 會 stash。
  - 外部 upstream release 或 PR 做不出這種狀態：git 不會追蹤位在符號連結後面的路徑，這個 index 項目只能在本機 stage 後再換掉目錄才會出現。
- **資料流**：
  1. `diff-files` 把位在符號連結後面的 index 項目判為刪除，於是 `platform/challenge/x/src/app.py` 進入刪除清單。
  2. `git stash push` 成功。這個新檔不在 HEAD，`diff-index HEAD` 不會把它交給 `update-index`，所以不會觸發「beyond a symbolic link」的錯誤。
  3. push 會把 `src/` 重建成真的目錄。
  4. 還原時，`checkout-index --force` 從 `^3` 把符號連結 `src` 建回來。
  5. 迴圈執行 `rm -f -- platform/challenge/x/src/app.py`，kernel 跟著上層連結，刪掉 repository 外的 `app.py`。
- **影響**：老師在 repository 外、實際在編輯的那份檔案被刪除。這和 B2 的「不寫入 `platform/` 以外的 working-tree 檔案」相衝突。B2 的「Symbolic links are followed」源自 round 2 的 R-10，當時討論的是讀取與寫入，不是刪除。舊 hook 用 `git stash pop`，由 git 自己刪檔，有 symlink-leading 防護；這個 `rm` 迴圈是本 ticket 新加的。
- **證據**：
  - reviewer 原本的情境（`src/app.py` 在 HEAD 裡）不成立。stage 7 重現結果：`git stash push` 在 `update-index` 回報「'platform/challenge/x/src/app.py' is beyond a symbolic link」後失敗，hook 會在還原之前就結束，外部檔案還在。這與 skeptic 3 的推論一致。
  - 變體（新 stage 的檔案）成立。stage 7 用 git 2.54.0 照 hook 的指令逐步重播，結果是：刪除清單有 `platform/challenge/x/src/app.py`；push 後 `src` 是目錄，還原後是符號連結；最後外部 `app.py` 被刪除（輸出「outside/app.py: DELETED」）。
  - 重播腳本在 `/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf/T-0032/symlink-parent.sh`，執行方式是 `bash <腳本> new` 與 `bash <腳本> head`。這個位置是本次 session 的 scratchpad，不會留在 repository 裡。腳本重播的是 hook 的 git 指令，不是執行整支 hook；刪檔用 `unlink`，對一般檔案的效果和 `rm -f` 相同。
- **Skeptic 判定**：1/3 成立，依規則駁回。
  - 駁回的一方認為原情境在 stash push 就失敗。
  - 駁回的另一方認為 spec B2 已接受「跟隨符號連結」。
  - 判定成立的 skeptic 和其中一位駁回者都提出了上面這個變體。
  - 依這次 stage 6/7 的指示，被駁回的 finding 不修改，只記錄。
- **修正（2026-10-22 套用）**：使用者決定在 T-0032 修正，兩個建議都採用，並改由 git 自己刪檔。
  - 刪除清單只保留 HEAD 沒有當成檔案持有的 D 項目（`[ "$(git cat-file -t "HEAD:$path" 2>/dev/null)" = blob ]` 不成立的路徑），也就是 index 新增、`git stash` 不會記錄的檔案。HEAD 以檔案持有的路徑（符號連結在 HEAD 裡也是 blob）由 stash 記錄，還原時由 git 刪除。
  - 這個篩選條件最初寫成 `git cat-file -e "HEAD:$path"`，2026-10-22 第二輪改為比對物件型別：`-e` 在 HEAD 於該路徑持有目錄（tree）時也會成功，於是 index 用檔案取代 HEAD 的目錄、working tree 又刪掉這個檔案時，該路徑不會進入刪除清單，而 `git stash` 也不記錄這筆刪除，O2 之後老師刪掉的檔案就會被還原回來。測試「H09: a file the index adds where HEAD has a directory, then deleted from the working tree, stays deleted」涵蓋這個情況，紀錄見 ticket 的「Round 2 (2026-10-22)」第 1 項。
  - `restore_entry` 逐層檢查上層目錄（一路檢查到 `platform/` 本身）是不是符號連結（`behind_link`，只用參數展開）。是的話就跳過該路徑，並在 stderr 印出路徑。
  - 刪檔改由 git 執行：`GIT_LITERAL_PATHSPECS=1 git restore --quiet --source=<空 tree> --worktree --pathspec-from-file=<清單> --pathspec-file-nul`。這只會刪 working tree 的檔案，不動 index，而且 git 不會刪符號連結後面的路徑。
  - 原樣副本的複製回寫也加上同樣的檢查：跳過並印出路徑，並把還原判為失敗，讓 `finish` 保留 entry。在 B2 的模型內，git 不會把位在符號連結後面的路徑列進這份清單，所以沒有測試能走到這個分支。
- **測試與證據**：
  - 新測試「S2: newly staged files behind a directory replaced by a link to outside the repository are left alone, and the outside files keep their bytes」（`tests/pre-commit-sh.test.ts`）：stage 一個完整的新題目 `linked`（#4），把 `src/` 移到 `<base>/outside src` 再用連結接回來，斷言 hook 結束後外部目錄的檔名與每個 byte 都沒變，並符合 O2 與字面的規則行。
  - 修正前失敗：「expected [] to deeply equal [ [ 'app.py', …(1) ], …(1) ]」，兩個外部檔案都被刪掉。修正後通過。
  - Mutation M8（關掉刪檔前的連結檢查）：只有 stderr 的斷言失敗，外部檔案還在，表示 git 自己也拒絕刪除。M9（再把 `git restore` 換回 `rm -f`）：外部檔案被刪，測試失敗。
  - `git restore` 的行為先在暫存 repository 量過（`bash <scratchpad>/wf/T-0032/probe-restore.sh`，本次 session 的 scratchpad，不在 repository 裡）：index 新增的檔案被刪掉、index 不變；上層目錄換成指向外部的連結時，外部檔案與連結都保留。
  - 指令與結果記在 ticket 的「2026-10-22 — fixes after stage 6–8」。
- **處置**：已修正。S3（寫入 `_redirects` 時跟隨連結的 `platform/public/`）仍依 B2 的「Symbolic links are followed」駁回，這次的檢查只涵蓋還原時刪除與寫入的路徑。

### S3：`cp` 寫入 `_redirects` 時跟隨符號連結（駁回）

- **位置**：`scripts/pre-commit.sh:256`（`cp "$WORK/expected" "$REDIRECTS"`）、`:163`（失敗時寫回）。**嚴重度**：low。**類別**：符號連結跟隨。**信心**：低。
- **攻擊者前提**：要讓 repository 追蹤一個 `_redirects`（或 `platform/public`）的符號連結。
- **資料流與影響**：hook 寫入時會跟著連結，覆寫 repository 外的檔案。
- **駁回理由（0/3）**：
  - spec B2 的「Does not protect」欄明寫「Symbolic links are followed」。
  - 能讓 repository 追蹤這個連結的人，本來就能改 hook 每次都會從 working tree 執行的腳本，沒有多拿到任何能力。
  - `pnpm build` 與 `pnpm redirects:generate` 原本就會跟隨同一個連結。
  - 有一位 skeptic 依 git 原始碼推論，`git hash-object` 讀的是連結目標的內容，所以 W3 仍然會印出（未實測）。
- **建議**：「寫入前拒絕符號連結」可以列為 P2 強化，屬於 spec 層的範圍調整。

### S4：W4 原樣印出目錄名稱（駁回）

- **位置**：`scripts/pre-commit.sh:193-201`（以 `ls-files -z` 讀入）、`:269`（以 `echo` 印出）。**嚴重度**：low。**類別**：終端機控制字元注入。**信心**：低。
- **攻擊者前提**：能在老師 checkout 的 watched tree 底下建立任意名稱的目錄，例如老師解壓了外部的題目壓縮檔。
- **駁回理由（0/3）**：
  - 這個前提已經等於能在老師機器上執行程式碼：題目的 `index.md` 會經過 VitePress SSR，`src/` 會在 `pnpm dev` 時執行。
  - 解壓工具本身也會印出同樣的檔名。
  - 名稱只能是單一路徑元件，做不出 OSC 8 超連結需要的網址。
  - 既有的 `scripts/challenge-numbers.ts` 也會原樣印出 slug。
- **建議**：印出前濾掉 C0 控制字元，可以列為選擇性強化。

### S5：`--staged` 不驗證 slug 格式（駁回）

- **位置**：`scripts/generate-redirects.ts` 的 `numericRules`、`formatRules`，slug 原樣串進規則行。**嚴重度**：low。**類別**：輸出格式注入。**信心**：低。
- **攻擊者前提**：index 裡有名稱特製的題目目錄。這只能由老師自己 `git add`，或來自老師審核後合併的 PR。
- **駁回理由（0/3）**：
  - spec 的 Out of Scope（spec.en.md:353）與 Further Notes（:367）明文排除「拒絕不符 slug grammar 的手建目錄」。
  - round 2 的 R-16 已裁定為 P2 既有行為。
  - `--staged` 只會讓 slug 集合變小。部署時 `pnpm build` 也會產生同樣的內容。
  - 目錄名稱不能含 `/`，做不出 open redirect。
  - B4 的 slug grammar 規範的是網站顯示的連結文字，不是 `_redirects`。

### S6：`git stash push` 中途失敗（駁回）

- **位置**：`scripts/pre-commit.sh:227`。**嚴重度**：low。**類別**：錯誤處理。**信心**：低。
- **攻擊者前提**：沒有攻擊者。需要 git 在更新 `refs/stash` 之後才失敗，例如權限問題或檔案被鎖。
- **駁回理由（0/3）**：
  - a54e917 的 hook 也是這樣，這次變更沒有讓它更容易發生。
  - 失敗路徑（O5、O7、W9、H26）屬於 T-0034。
  - entry 仍留在 `git stash list` 裡，資料不會遺失。
- **建議**：轉給 T-0034 參考。push 失敗時，若 `refs/stash` 已經變了，仍把新 entry 當成 hook 自己的 entry，並印出 W9。

### S7：測試輔助程式的 shell 插值（駁回）

- **位置**：`tests/__helpers__/preCommitRepo.ts:196`，`` exec bash '${HOOK}' ``。**嚴重度**：low。**類別**：shell 指令注入。**信心**：低。
- **攻擊者前提**：能決定開發者 checkout 所在的路徑。
- **駁回理由（0/3）**：
  - `HOOK` 只來自測試檔在磁碟上的位置。能決定這個路徑的人本來就能改 repository 裡任何程式碼。
  - 這個 hook 只裝在 `mkdtemp` 建出的暫存 repository 裡，不會出貨。
  - 最壞情況只是路徑含 `'` 時測試失敗。

## stage 6 新增程式碼的安全檢查

stage 6 為了修正 CRLF 的 byte-identical 問題（Spec 軸的 finding），在 hook 加了兩處程式碼：

- `:214-223`：stash 之前，把要 stash 的一般檔案原樣複製到 `$WORK/raw`。（審查時為 :171-179）
- `:136-143`：還原後再把這些檔案複製回去。（審查時為 :104-106；2026-10-22 加上 S2 的連結檢查）

stage 7 執行者對這兩段檢查了以下幾點：

- **路徑來源**：路徑清單來自 `git diff -z --name-only --diff-filter=MT` 與 `git ls-files -z --others --exclude-standard`，以 NUL 分隔讀入，不經過 shell 展開。
- **符號連結**：git 不會列出位在符號連結後面的路徑，而且迴圈只複製一般檔案（`[ -f ] && [ ! -L ]`），所以複製回去時寫的是同一個真實檔案。
- **寫入位置**：寫入目的地只有 `$WORK`（`mktemp -d` 建立）以及原本的路徑，沒有新增 `platform/` 以外的寫入。
- **`core.safecrlf=false`**：只加在 `git stash push` 這一個指令上，作用是不讓 git 對已由原樣副本補回的換行轉換發出警告，或在設定為 `true` 時拒絕執行。

上述檢查沒有發現新的問題。

## 2026-10-22 新增程式碼的安全檢查

S2 與 pathspec 環境變數的修正加了三處程式碼，執行者檢查了以下幾點：

- **刪除清單**（`:209-212`）：路徑來自 `git diff -z --name-only --diff-filter=D`，以 NUL 分隔讀入，不經過 shell 展開。`[ "$(git cat-file -t "HEAD:$path" 2>/dev/null)" = blob ]` 只讀不寫。這裡原本是 `git cat-file -e "HEAD:$path"`，但 `-e` 在 HEAD 於該路徑持有目錄時也成功，會讓 index 新增、working tree 已刪除的檔案被還原回來，所以第二輪改為只在 HEAD 持有 blob 時才不列入刪除清單（見 S2 的修正）。
- **刪檔**（`:122-135`）：清單以 NUL 分隔交給 `git restore --pathspec-file-nul`，並只對這一個指令設 `GIT_LITERAL_PATHSPECS=1`，所以路徑裡的 `*`、`:(…)` 不會被當成 pathspec magic。來源是空 tree，加上 `--worktree`，所以只刪 working tree 的檔案，不寫入任何內容，也不動 index。
- **環境變數**（`:37`）：`unset` 只影響 hook 自己和它的子行程，不會改到老師 shell 的設定。

上述檢查沒有發現新的問題。

## 已知、未修正的邊界情況

2026-10-22 第二輪的 reviewer 找到一個情況，這次不改程式碼，只在這裡與 ticket 記錄：

- **情境**：老師 stage 了一批新檔（例如新題目的 `platform/challenge/linked/src/app.py`、`flag.txt`），接著把 `src/` 移到 repository 外，用符號連結接回來，而且這個連結被忽略（例如列在 `.gitignore` 或 `.git/info/exclude`）。commit 觸發 hook，`platform/` 底下另有未 stage 的變更，所以 hook 會 stash。
- **結果**：`git stash push --keep-index --include-untracked` 為了讓 working tree 等於 index，把連結換成真的目錄並寫入 staged 的檔案。被忽略的項目不會進入 stash（`--include-untracked` 不含 ignored），所以還原時不會把連結建回來；hook 接著依刪除清單移除這些 index 新增的檔案，`src` 最後整個消失。repository 外的檔案不受影響，hook 以 0 結束（O2）。
- **與規範的關係**：B2「不寫入、不刪除 `platform/` 以外的檔案」仍然成立。O2 的「每個檔案 byte 相同」只涵蓋 tracked 與 untracked 檔案，不涵蓋 ignored 項目，這個連結不在承諾範圍內。
- **不是本 epic 引入的**：機制來自 `git stash push` 本身，`a54e917` 的 hook 用同樣的 push。用 `a54e917` 的 hook 重跑同一情境時，連結一樣被換成真的目錄，只是 `git stash pop` 之後目錄裡留著 staged 的檔案；目前的 hook 會再移除那些檔案，所以路徑消失。
- **重現**：本次 session 的 scratchpad 內有一份 worktree 的副本（`<scratchpad>/wf/T-0032/copy`，不在 repository 裡），探測測試是其中的 `tests/edge-ignored-link.test.ts`。指令為 `cd <scratchpad>/wf/T-0032/copy && PROBE_OUT=<scratchpad>/wf/T-0032/edge-probe.txt PATH="/bin:$PATH" pnpm vitest run tests/edge-ignored-link.test.ts`。輸出：執行前 `!! platform/challenge/linked/src` 且為連結；hook 結束狀態 0；執行後 `src` 不存在，外部目錄仍有 `app.py`、`flag.txt`。把副本的 `scripts/pre-commit.sh` 換成 `git show a54e917:scripts/pre-commit.sh` 後重跑，執行後 `src` 是真的目錄，內含 `app.py`、`flag.txt`。

## 審查範圍的限制

reviewer 自述的限制如下（原文照錄）：

- **沒有實際重現**：我沒有 Bash 工具，也被要求唯讀，所以所有 finding 都是讀程式碼推論出來的，沒有在暫存 repository 執行驗證。finding 1 依賴 git 的三個行為，需要獨立 reviewer 用 git 2.54 實際驗證：git restore 預設 no-overlay、移除檔案後會刪掉空的上層目錄、checkout-index --force 會把符號連結建在空目錄原本的位置。
- **範圍外，未審查**：
  - 相依套件掃描
  - 可用性與速率限制，以及一般的低嚴重度強化
  - Cloudflare Pages 怎麼解析格式錯誤的 _redirects 行。finding 4 的實際影響取決於這一點，我沒有查官方文件
  - B1、B4 的前端渲染與 XSS：本 ticket 沒有改任何頁面或元件，渲染屬於其他 ticket
  - challenge-lint-staged.ts 內部的驗證邏輯：沒有變更，只確認它收到的參數
- **規格明列在 B2 模型外，因此沒有列為 finding**：
  - 另一個 process 或 worktree 在 commit 期間同時修改 refs/stash：會讓 drop_entry 用 stash@{n} 索引 drop 時出現競態，只在這裡記錄。
  - SIGKILL 與斷電。
  - 產生器與驗證器從 working tree 執行，所以未 stage 的腳本修改會生效：B2 已接受。
- **屬於其他 ticket，只在這裡標記**：
  - 中斷與信號處理、W7、W9、O7 的正式措辭：T-0034
  - 孤兒說明頁：T-0033
  - 標頭變更：T-0039
- **我判斷與安全無關而沒有列入的項目**：環境裡設了 GIT_LITERAL_PATHSPECS=1 或 core.literalPathspecs 時，:(exclude) 會失效，_redirects 可能進入 stash，D3 被破壞。這是正確性問題，交給 stage 6 判斷。
- **前因後果不明**：packet 提到有一次完整測試出現「1 failed」且沒有重現。原因不明，不在本軸線範圍。

stage 7 執行者補充：

- reviewer 列出的三個 git 行為，stage 7 用 git 2.54.0 驗證了與 S2 相關的部分：還原後 `src` 從目錄變回符號連結，接著 `rm` 跟著連結刪到外部檔案（見 S2 的證據）。reviewer 原本的情境在 `git stash push` 就失敗，這一點 stage 7 也實際觀察到了。
- `GIT_LITERAL_PATHSPECS` 那一項 stage 6 沒有處理。它不是成立的 finding，已記在 ticket 的 stage 6 紀錄，交使用者判斷。2026-10-22 已修正（先寫失敗測試）：hook 一開始就 unset `GIT_LITERAL_PATHSPECS`、`GIT_GLOB_PATHSPECS`、`GIT_NOGLOB_PATHSPECS`、`GIT_ICASE_PATHSPECS`。新測試對這四個變數各跑一次 O2；修正前 `GIT_LITERAL_PATHSPECS=1` 那一個在 `git stash push` 失敗，git 回報 `:(exclude)platform/public/_redirects` 這個 pathspec 沒有符合任何檔案。
  - 2026-10-22 第三輪：四個測試各加了一個 stage 後又從 working tree 刪掉的檔案，讓 hook 走到刪檔步驟（`GIT_LITERAL_PATHSPECS=1 git restore`）。拿掉 `unset` 那一行時，`GIT_GLOB_PATHSPECS` 與 `GIT_ICASE_PATHSPECS` 會和這一步的 literal 設定衝突，git 拒絕執行，hook 以 O7 結束，所以這兩個測試現在會失敗。`GIT_NOGLOB_PATHSPECS` 無法用這個方式區分：git 把 noglob 視為加上 literal，兩者並存不衝突，而 hook 的 pathspec 都不含萬用字元，所以 `unset` 裡的 `GIT_NOGLOB_PATHSPECS` 目前只是防禦性的，沒有測試能讓它變紅。
- 那次「1 failed」在 stage 6 之後的兩次完整測試都沒有再出現（127 個檔案；4233 passed、1 skipped）。
- 本報告沒有做相依套件掃描、模糊測試或動態分析。

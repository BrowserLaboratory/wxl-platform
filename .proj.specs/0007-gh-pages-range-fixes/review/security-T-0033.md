# T-0033 安全審查報告（stage 7）

## 範圍

- **Ticket**：T-0033「pre-commit hook 拒絕失去英文題目的繁中說明頁」（epic 0007）
- **Base**：`707be5f`（origin/main，已含 T-0030、T-0031、T-0032、T-0036）
- **HEAD**：`707be5ff1deb5f7d0d0b6852ef1833417665b7bb`。實作尚未 commit，審查對象是 worktree 裡的待 commit 變更。
- **Branch**：`tickets/T-0033/hook-refuses-orphan-brief`
- **Worktree**：`/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0033`
- **審查的待 commit 檔案**：
  - `scripts/pre-commit.sh`（修改：檔頭第 3 步、`index_slugs` 與孤兒說明頁檢查，:258-298）
  - `scripts/generate-redirects.ts`（修改，只有註解）
  - `tests/pre-commit-sh.test.ts`（修改，測試檔）
  - `.proj.tickets/0007-gh-pages-range-fixes/T-0033-hook-refuses-orphan-brief.md`（ticket 紀錄）
- **信任邊界**：spec revision 3 的 B2（pre-commit hook → 老師的 index 與 working tree）為主，B3（CI guard）作為孤兒說明頁的最後防線。本 ticket 沒有碰任何題目刻意設計的漏洞，ADR-0005 不適用。
- **流程**：一位 reviewer 唯讀找出候選，每個候選由一位 skeptic 嘗試反駁；low 等級的候選需要這位 skeptic 認定為真才算成立。

## 結論摘要

| # | 候選 | 位置 | 嚴重度 | Skeptic 判定 | 處置 |
|---|---|---|---|---|---|
| S1 | W6 把 index 裡的 slug 原樣印到終端機，沒有跳脫控制字元 | `scripts/pre-commit.sh:289`（資料來自 :273） | low | 0/1 | 駁回 |
| S2 | 「Nothing was changed.」在還原之前就印出 | `scripts/pre-commit.sh:291-297` | low | 0/1 | 駁回，留給使用者決定是否刪掉這句 |
| S3 | 孤兒檢查只讀 index，卻排在 stash 之後，每次拒絕都經過 stash 與還原 | `scripts/pre-commit.sh:233`、`:258-298` | low | 0/1 | 駁回 |
| S4 | `git ls-files` 在 process substitution 裡失敗時，檢查放行或把所有說明頁誤報為孤兒 | `scripts/pre-commit.sh:273`、`:276`、`:286` | low | 0/1 | 駁回，轉給 T-0034 參考 |
| S5 | HEAD 已有孤兒時擋住之後每次觸發 hook 的 commit，W6 的指引也可能讓老師刪掉翻譯 | `scripts/pre-commit.sh:287-297` | low | 0/1 | 駁回 |

沒有成立的安全 finding，這次 stage 7 沒有修改任何程式碼。這份報告只說明審查過哪些地方、得到什麼結果，不代表這個專案已經安全。

## 逐項說明

### S1：W6 原樣印出 slug（駁回）

- **位置**：`scripts/pre-commit.sh:289`。**嚴重度**：low。**類別**：終端機控制字元注入（log spoofing）。**信心**：低。
- **攻擊者前提**：能把名稱含控制字元的路徑放進老師的 index，例如老師合併了惡意 fork 或學生 PR。
- **資料流**：`:273` 的 `git ls-files -z` → `index_slugs`（:265-274）→ `ORPHANS`（:278-286）→ `:289` 的 `echo` 到 stderr。
- **影響**：可以偽造 `[pre-commit]` 開頭的多行輸出或改寫終端機畫面，不會執行程式碼。
- **駁回理由（0/1）**：
  - 能把內容合併進來的人，也能改 hook 在同一次執行要跑的 working tree 腳本（`:254` 的 `challenge-lint-staged.ts`、`:301` 的 `generate-redirects.ts`）。B2 的「Does not protect」欄寫明產生器腳本從 working tree 執行。終端機注入沒有多給攻擊者任何能力。
  - upstream 方法論把「輸出未淨化的使用者輸入到 log」列為排除項。
  - 同一檔案的 `:131`、`:144`、`:317` 在本 ticket 之前就原樣印出路徑；T-0032 的 S4 以同樣理由駁回。
- **建議**：印出前把 `[[:cntrl:]]` 換成 `?`，可以列為 P2 的可讀性強化。

### S2：「Nothing was changed.」先於還原（駁回）

- **位置**：`scripts/pre-commit.sh:291-297`，W6 的 heredoc 之後才 `exit 1`，還原在 `finish` trap（:165-181）。**嚴重度**：low。**類別**：訊息與實際狀態不一致（完整性的使用者認知）。**信心**：機制高，影響低。
- **攻擊者前提**：沒有外部攻擊者。需要還原失敗，例如 `restore_entry` 遇到符號連結上層目錄而跳過。
- **資料流與影響**：還原失敗時，hook 已印出「Nothing was changed.」，接著 `finish` 印出 W9 並保留 stash entry，兩句前後矛盾。
- **駁回理由（0/1）**：
  - O4 的列（traceability.md:285）承諾 index、working tree（含 `_redirects`）、stash list 都與先前相同，這句話描述的就是 O4 的結果。（round 2 更正：原本這裡還寫「W8 也用了同樣的說法」，這不正確。W8 的訊息（`scripts/pre-commit.sh:85-91`）沒有這句，traceability.md:243 的「nothing changed」是 outcome 的描述，不是訊息文字；而且 W8 在 stash 之前就 `exit 1`（`:84-93` 早於 `:233`），不會有「印完才還原」的情況，不能當先例。）
  - 還原失敗屬於 O7（traceability.md:288），W9 一定在 W6 之後，是 stderr 最後一行，附上 entry 的 commit id 與 `git stash apply <id>`。entry 留在 stash list，不會遺失資料。
  - 空的 untracked 目錄與符號連結是 B2 已列出的既有限制，T-0032 的 hook 就是這樣，與 W6 無關。
- **建議**：如果使用者想避免 O7 下的矛盾，可以刪掉「Nothing was changed.」。這句不是 W6 的必要子字串，`expectW6` 也沒有斷言它（本次沒有實際跑過刪掉後的測試）。

### S3：檢查排在 stash 之後（駁回）

- **位置**：`scripts/pre-commit.sh:233`（`stash push --keep-index`）、`:258-298`（檢查）。**嚴重度**：low。**類別**：縮小影響面的設計建議。**信心**：中。
- **攻擊者前提**：沒有。
- **資料流與影響**：檢查只讀 index，`--keep-index` 不改 index，所以放在 stash 之前結果相同。現在每次拒絕都要經過 stash 與還原，多了一次遇到 O7 的機會。
- **駁回理由（0/1）**：
  - O4 要求的「與先前相同」由還原達成，十個拒絕案例（round 2 更正：原寫「九個」，沒算到 stage 6 新增的 `tests/pre-commit-sh.test.ts:804`）都以 `addTeacherWork()` 加上 `expectNothingChanged` 驗證。
  - O3（validator 拒絕）一樣經過 stash 與還原；707be5f 的 hook 對這些快照也是 stash 後走 O2 或 W5，stash 路徑沒有變。
  - 移到 stash 之前，檢查也會跑到 validator 之前（validator 需要 stash 後的 working tree），違反 traceability:267-269 的順序；ticket open point 1 已記錄這個取捨。
- **建議**：可以當成 P2 的改善交使用者決定。

### S4：`git ls-files` 在 `<( )` 裡失敗（駁回）

- **位置**：`scripts/pre-commit.sh:273`、`:276`、`:286`。**嚴重度**：low。**類別**：錯誤處理（fail-open）。**信心**：程式碼觀察高，可觸發性低。
- **攻擊者前提**：沒有。需要 `git ls-files` 暫時失敗。
- **資料流與影響**：`set -e` 與 pipefail 看不到 process substitution 的 exit status。繁中清單失敗時檢查放行；英文清單失敗、繁中清單成功時，所有說明頁都被誤報為孤兒。
- **駁回理由（0/1）**：
  - 持續性的失敗不會放行：`:301` 的產生器 `indexSlugs`（`scripts/generate-redirects.ts:197-202`）以 `execFileSync` 再讀一次同一份 index，失敗時丟出例外，hook 以 `|| exit 1` 結束，符合 O5。
  - 只有「第一次失敗、幾毫秒後第二次成功」才會放行或誤報，這需要另一個程序在 commit 期間改動 repository，屬於 B2 的 Outside the model。即使發生，誤報時 hook 以 exit 1 結束且什麼都沒改；放行時 B3 的 CI guard 會擋下。
  - 同一檔案的 `:207`、`:218`、`:229`、`:251` 本來就用 `< <(git ...)`，`:251` 失敗會讓 validator 整個被跳過；這次沒有讓新的失敗類型變得可觸發。ticket 的 coverage report「not driven」列已記錄。
- **建議**：轉給 T-0034 參考：把 hook 內 `< <(git ...)` 的輸出先寫進 `$WORK` 的檔案並檢查 exit status，五處一起處理。

### S5：HEAD 已有的孤兒與 W6 的指引（駁回）

- **位置**：`scripts/pre-commit.sh:287-297`。**嚴重度**：low。**類別**：可用性、誤導指引。**信心**：低。
- **攻擊者前提**：合併上游或他人分支時帶進一個孤兒說明頁（合併本身不經過 pre-commit）。
- **資料流與影響**：之後每次觸發 hook 的 commit 都被 W6 拒絕；老師照著「`git rm -r platform/zh-TW/challenge/<slug>/`」可能刪掉想保留的翻譯。
- **駁回理由（0/1）**：
  - D12（traceability.md:42）要求拒絕「staged snapshot holds」孤兒的 commit，範圍是整個快照；ticket 的「D12: an orphan HEAD already holds」測試與 M3 鎖定這一點。只看 diff 反而會放行 B3 必定擋下的 commit。
  - merge、cherry-pick、rebase 列在 B2 的「Does not protect」，由 B3 抓到；hook 只是更早、在本機指名同一個問題。
  - `git rm -r` 那句只出現在「retire 到 `.archive/challenge/`」的情境；`git rm` 遇到有修改的檔案會拒絕，已 commit 的內容可從歷史救回，沒有資料遺失。
  - ticket open point 7 與 Known edges 已記錄，文件交給 T-0039。

## stage 6 新增程式碼的安全檢查

stage 6 只新增了一個測試案例「no English index slug at all」（`tests/pre-commit-sh.test.ts:804`），沒有修改 hook 或產生器。這個案例只在 `mkdtemp` 建出的暫存 repository 裡執行 `git rm -rq` 與 hook，沒有觸及暫存 repository 以外的路徑。上述檢查沒有發現新的問題。

## 審查範圍的限制

reviewer 自述的限制如下（原文照錄）：

以下範圍沒有涵蓋，或刻意排除：
1. 只讀程式碼推理，沒有實際執行任何重現（工具限制：本次沒有 Bash），也沒有用 Git 驗證 packet 的 base/HEAD。若需要確認，請 parent 另行執行。
2. tests/pre-commit-sh.test.ts 屬於測試檔，依 upstream 規則 11 不列為弱點來源。只粗看了 rmSync 的對象在 mkdtemp 的 repo.dir 底下，沒有發現會觸及測試 repo 以外的路徑。
3. ticket 的 .md 與 generate-redirects.ts 的變更只有註解或文件，依 upstream 規則排除。
4. 既有程式碼（restore_entry、drop_entry、Commit forms、UNTRACKED_DIRS 的輸出等）不是本次新增，只作為上下文閱讀，沒有重新審查。
5. 以下屬於 B2 Outside the model，沒有評估：環境變數被攻擊者控制（upstream precedent 3），例如 BASHOPTS=xpg_echo 會讓 echo 解讀反斜線、PATH 劫持 git 或 node、GIT_DIR 等；在另一個 worktree 同時操作共用的 refs/stash；SIGKILL 或斷電。
6. 沒有做 dependency scanning、availability 與 rate limiting 分析，也沒有系統性檢查低嚴重度強化項目（上面第 5 項是例外）。
7. 大小寫與 Unicode 正規化（macOS 不分大小寫的檔案系統、core.precomposeunicode）：hook、generator 與 CI 都按 index 的位元組比對，三者一致，所以沒有列為候選。
8. 跨 ticket 的串鏈分析（例如結合 T-0034 hook 失敗路徑或 T-0039 文件）留給 epic close-out，不在本次 diff 範圍。
9. 使用者轉達的「另外我剛剛開啟 auto-merge」：本審查是唯讀，沒有評估 auto-merge 對 stage 7、8 關卡的影響，請 parent 另行確認：在 stage 7 的 findings 判定完成、stage 8 驗證之前，PR 不應被自動合併。

stage 7 執行者補充：

- base 與 HEAD 已用 Git 確認：`git rev-parse HEAD` → `707be5ff1deb5f7d0d0b6852ef1833417665b7bb`，`git branch --show-current` → `tickets/T-0033/hook-refuses-orphan-brief`。
- S1–S5 都沒有成立，沒有做額外的重現。S2 建議的「刪掉 Nothing was changed.」沒有實際跑測試。
- stage 6 之後重跑的指令與結果記在 ticket 的「2026-10-23 — code review (stage 6)」：`PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` → 56 passed；`pnpm test --run` → 130 個檔案、4426 passed、1 skipped；`bash -n` 與 `/bin/bash -n` 都是 exit 0；`pnpm -s challenge:validate` → All checks passed。
- 本報告沒有做相依套件掃描、模糊測試或動態分析。

## Review round 2（2026-10-23）

round 2 的安全軸由一位 reviewer 唯讀找出候選，每個候選由一位 skeptic 嘗試反駁。兩個候選都沒有成立，這一輪沒有修改任何程式碼。

| # | 候選 | 位置 | 嚴重度 | Skeptic 判定 | 處置 |
|---|---|---|---|---|---|
| R2-S1 | W6 的指引「git add it」可能讓老師把未追蹤的英文題目目錄整包 commit 進公開 repository | `scripts/pre-commit.sh:295` | low | 0/1 | 駁回 |
| R2-S2 | 使用者已開啟 auto-merge，但沒有機制擋住 stage 7 判定與 stage 8 驗證完成前的合併 | 本報告 round 1 限制第 9 項、ticket stage 7 段落 | 不適用 | 0/1 | 駁回，轉為給 parent 的備註 |

### R2-S1：W6 的「git add it」（駁回）

- **駁回理由（0/1）**：
  - B2（spec.en.md:175）規範的是 hook 自己的行為：hook 只 stage `platform/public/_redirects`，遇到孤兒說明頁就拒絕。W6 印出訊息後就 `exit 1`，沒有 stage 任何檔案，符合 B2。老師之後自己下的 `git add` 不在 B2 的範圍內。
  - 資料來源和執行者都是老師本人，沒有攻擊者，也沒有跨越 B1-B5 的信任邊界。
  - 「把英文題目目錄 `git add` 起來」本來就是 repository 記載的正規流程（spec.en.md:254、:258）。base 707be5f 的 W5（`scripts/pre-commit.sh:317`）已經有幾乎一樣的指引，這次變更沒有動到它，也沒有讓新的路徑變得可以觸及。
  - W6 已經印出 `platform/challenge/<slug>/`，「it」指的是老師正要跟說明頁一起發布的英文題目。
- **建議**：可以當成 P2 的措辭改善（例如寫明 `git add platform/challenge/<slug>/`，並先看 `git status`），交使用者決定。

### R2-S2：auto-merge（駁回）

- **駁回理由（0/1）**：
  - 本次變更沒有改任何合併機制。auto-merge 是使用者在 GitHub 上的設定，不是 T-0033 的 diff 引入的；round 1 限制第 9 項與 ticket 的 stage 7 段落只是如實記錄並往上交辦。
  - docs/agents/workflow.md:151-153 規定 stage 8 在 ticket 分支的 preview deployment 上執行，而且要在 PR 合併之前做完；:161-164 寫明 PR 到 stage 9 才用 `gh pr create` 開。照流程走，stage 7、8 完成前沒有 PR，auto-merge 也沒有東西可以合併。
  - 沒有攻擊者可控的輸入，不構成 B1-B5 範圍內的安全 finding。
- **給 parent 的備註（不算 finding）**：到 stage 9 開 PR 時，向使用者確認 auto-merge 開在 repository 層級還是某個 PR 上。如果在 stage 8 之前因為別的原因要開 PR，考慮開成 draft，或執行 `gh pr merge --disable-auto`。

### round 2 對本報告的更正（Standards 軸，已成立）

- S2 駁回理由原本寫「W8 也用了同樣的說法」，與 `scripts/pre-commit.sh:85-91` 的 W8 文字不符，已在 S2 段落內更正。S2 的駁回結論仍以 O4（traceability.md:285）與 O7/W9（traceability.md:288）為依據，不受影響。
- S3 駁回理由原本寫「九個拒絕案例」，實際是十個（`tests/pre-commit-sh.test.ts:672`、`:684`、`:696`、`:709`、`:723`、`:737`、`:753`、`:771`、`:789`、`:804`），已在 S3 段落內更正。

### round 2 審查範圍的限制

reviewer 自述的限制如下（原文照錄）：

1. 這次只讀程式碼推理，沒有執行任何命令或重現（本次可用的工具只有 Read、Grep、Glob），也沒有用 Git 驗證 packet 的 base 與 HEAD，兩者都照 packet 與安全報告執行者補充的 `git rev-parse` 結果採用。
2. 排除的範圍：
   - 測試檔 tests/pre-commit-sh.test.ts（依 upstream 規則不列為弱點來源，只確認 rmSync 與 git rm 的對象都在 mkdtemp 建出的 repo.dir 底下）。
   - generate-redirects.ts 與 ticket 的變更只有註解或文件。
   - 既有程式碼（restore_entry、drop_entry、Commit forms、UNTRACKED_DIRS）只作為上下文閱讀，沒有重新審查。
3. 沒有評估的部分（B2 的 Outside the model，或 upstream 的排除項）：
   - 攻擊者控制的環境變數，例如 BASH_FUNC_*%% 匯入的函式、PATH 劫持 git 或 node、BASHOPTS=xpg_echo。
   - 另一個程序或另一個 worktree 在 commit 期間改動 repository。
   - SIGKILL。
   - availability 與 DoS，例如繁中說明頁很多時 O(n×m) 的 bash 迴圈。
   - dependency scanning 與模糊測試。
4. S4（`<( )` 失敗時放行）沒有找到新證據，所以沒有重提。
5. hook 的 cwd 不在 top level 時，所有 pathspec 都會失準。這是既有行為，git 執行 hook 時 cwd 本來就在 top level，所以沒有列為候選。
6. 跨 ticket 的串鏈分析（T-0034 的失敗路徑、T-0039 的文件）留給 epic close-out。
7. auto-merge 實際開在 repository 層級還是某個 PR 上，我無法用 gh 查證，請 parent 確認。

round 2 執行者補充（在 `/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0033` 執行）：

- `git rev-parse HEAD` 仍是 `707be5ff1deb5f7d0d0b6852ef1833417665b7bb`，實作仍未 commit。
- round 2 只改了文件（本報告與 ticket 紀錄），沒有改 hook、產生器或測試。重跑結果：`PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` → `Tests  56 passed (56)`（`/bin/bash` 為 `3.2.57(1)-release`）；`pnpm test --run` → `Test Files  130 passed (130)`、`Tests  4426 passed | 1 skipped (4427)`；`bash -n scripts/pre-commit.sh` 與 `/bin/bash -n scripts/pre-commit.sh` 都是 exit 0；`pnpm -s challenge:validate` → `All checks passed.`。
- 本報告沒有做相依套件掃描、模糊測試或動態分析。

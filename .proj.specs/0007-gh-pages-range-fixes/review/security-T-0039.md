# T-0039 安全審查報告（stage 7）

## 範圍

- **Ticket**：T-0039「Every document says the same sentence, and the epic's stage 8 runs end to end」（epic 0007）
- **Base**：`1c65ff4`（origin/main）。**HEAD**：`1c65ff4`，committed layer 為空，審查對象是 worktree 裡全部 staged 的變更。
- **Branch**：`tickets/T-0039/documents-and-epic-stage-8`
- **Worktree**：`/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0039`
- **審查的檔案**：stage 6 修正後的 18 個 staged 路徑，包括：
  - `scripts/generate-redirects.ts` 的 `HEADER`，以及重新產生的 `platform/public/_redirects`
  - `tests/unit/site/sentence-map.test.ts`（新增）
  - `tests/pre-commit-sh.test.ts` 的 H44
  - 兩份 README（P1、P3，以及新的「Committing challenges」／「commit 題目」一節）
  - 四份 wxl-create skill、兩份 wxl-fork-init skill
  - `docs/agents/challenge-pipeline.md`、`docs/agents/platform-notes.md`、`GLOSSARY.md`
  - T-0039、T-0044、T-0049 三張 ticket 的紀錄
- **信任邊界**：spec 0007 的 B1–B5。
  - 這次變更沒有新增程式的輸入或寫入路徑。
  - 安全面主要在 B2：老師照 README 操作 git 指令時，可能動到自己的 index 與工作目錄。
  - 次要的是 B1：`_redirects` 的 header 會被 Cloudflare Pages 解析。
  - 本 epic 沒有碰任何題目刻意設計的漏洞，ADR-0005 不適用。
- **流程**：
  - 一位 reviewer（`harness-reviewer`，唯讀）列出候選，不自行判定誤報。
  - medium 候選各由三位 skeptic 獨立嘗試反駁，至少兩位判定成立才算成立。
  - low 候選分兩批，各由一位 skeptic 判定。
  - parent 在 scratch repo 實跑了 C2、C3、C5 與 drop 的 git 行為，並把結果交給 skeptic。

## 結論摘要

| # | 候選 | 位置 | 候選嚴重度 | Skeptic 判定（成立／總數） | 處置 |
|---|---|---|---|---|---|
| C1 | `git stash drop stash@{<n>}` 沒說怎麼由 id 找到 n | README 兩版「commit 題目」一節 | medium | 1/3 | 駁回；當成 P2 文件補充修改 |
| C2 | apply 衝突時，entry 其他變更也會被 stage | 同上 | medium | 1/3 | 駁回；當成 P2 文件補充修改 |
| C3 | `git checkout <id> -- <path>` 蓋掉該檔原本 stage 的版本 | 同上 | low | 0/1 | 駁回；C2 的補充也給出還原方法 |
| C4 | drop 寫在需要 `<id>^2` 的那一項之前 | 同上 | low | 0/1 | 駁回；C1 的補充把 drop 移到整節最後 |
| C5 | `git restore` 是 no-overlay，也會刪檔 | 同上 | low | 0/1 | 駁回，不修改 |
| C6 | 少了 hook 的「once the cause is fixed」 | 同上 | low | 0/1 | 駁回，不修改 |
| C7 | W7「remove what should stay out」 | 同上 | low | 0/1 | 駁回，不修改 |
| C8 | `git rm -r` 會刪工作目錄的說明頁 | 同上 | low | 0/1 | 駁回，不修改 |
| C9 | 「每次 commit 都重新產生」，但 hook 可能沒裝 | README、E1 各處 | low | 0/1 | 駁回，不修改 |
| C10 | skill 裡 E1／Z1 的祈使句可能讓 agent 自行 commit | wxl-create、wxl-fork-init skill | low | 0/1 | 駁回，不修改 |
| C11 | ticket 的授權紀錄可能被日後的 agent 當成授權 | T-0039 ticket | low | 0/1 | 駁回，不修改 |
| C12 | platform-notes 建議從另一個 checkout 複製 `.vitepress/wasm/` | `docs/agents/platform-notes.md` | low | 0/1 | 駁回，不修改 |
| C13 | `_redirects` 在 GitHub Pages 上是公開的靜態檔 | `platform/public/_redirects` | low（資訊性） | 0/1 | 駁回，不修改 |
| C14 | sentence-map 測試的 `readFileSync` 會跟隨 symlink | `tests/unit/site/sentence-map.test.ts` | low | 0/1 | 駁回，不修改 |

沒有任何候選成立。C1 與 C2 未達門檻，但三位 skeptic 都認為缺口真實存在、只是不構成資料遺失，建議當 P2 文件補充。補充內容經 parent 實測後寫進 README（見下）。這份報告只說明審查了哪些地方、得到什麼結果，不代表這個專案已經安全。

## 逐項說明

### C1：drop 時不知道 n（駁回，P2 補充）

- **攻擊者或失敗前提**：stash 清單同時有兩個以上的 hook entry（每筆訊息都是 `pre-commit: stash unstaged changes`，`scripts/pre-commit.sh:436`），其中一筆還沒放回。
- **資料流**：W9 只印 commit id（`:260`、`:266`、`:282`、`:294`）→ README 要老師用 `stash@{<n>}` drop → 老師猜錯 n。
- **判定**：
  - 一位 skeptic 判成立（low），兩位判誤報。
  - 反駁理由：
    - 照文件順序，drop 之前每一筆都已經放回。
    - `git stash drop` 會印出被丟掉的 hash。
    - README 給的補救指令都以 id 為準，drop 之後照樣能用。
    - 物件要等 gc prune 才會真的消失。
- **實測**：`git stash drop <commit id>` 會回報「不是一個貯存引用」，證實只能用 `stash@{n}` drop。
- **P2 補充**：drop 移到整節最後，條件改成「檔案和 index 都放回來之後」；並說明用 `git stash list --format='%gd %H'` 找出 id 相同的那一行，再 drop 那一行的 `stash@{<n>}`。

### C2：apply 衝突時其他變更也被 stage（駁回，P2 補充）

- **實測**（scratch repo，git 預設設定）：
  - apply 前：staged 的 `f` 是「A b c」；unstaged 的 `f` 是「A B c」，`g` 是「X」。
  - `git stash apply <id>` exit 1，狀態是 `UU platform/f`、`M  platform/g`：原本 unstaged 的 `g` 被 stage 了。
- **判定**：
  - 一位 skeptic 判成立（low），兩位判誤報。
  - 反駁理由：
    - 這是 git 本身的行為，叫老師 apply 的也是 hook 原有的訊息。
    - README 已經要求 commit 前先看 `git status`。
- **P2 補充**：README 寫明衝突時 git 會把該檔和 entry 其他已套用的變更都留在 stage，並給出 `git restore --staged --source=<id>^2 -- ':(top)platform/' ':(top,exclude)platform/public/_redirects'`。
- **補充前實測**：
  - 指令是衝突 → `git checkout <id> -- platform/f` → 上面那條 `restore --staged`。
  - 結果是 `MM platform/f`、` M platform/g`；index 的 `f` 是「A b c」，工作目錄的 `f` 是「A B c」，`g` 是「X」且沒有 stage。
  - 這正好是 commit 之前的狀態。
  - pathspec 與 hook 印出的 `PRINTED_REST`（`scripts/pre-commit.sh:242`）相同。

### C3–C8（駁回）

由一位 skeptic 逐項判定，全部是誤報：

- **C3**：README 已寫明會 stage，並要求先看 `git status`；內容仍在 entry 裡。C2 的補充現在也給出還原方法。
- **C4**：README 的順序已經要求先放回；就算先 drop，在 gc 之前也取得回來。C1 的補充已把 drop 移到最後。
- **C5**：「覆寫」與「在改動那裡任何東西之前執行」都出自 hook 原有的訊息（`:260`、`:266`）。被刪掉的工作目錄副本仍在 index 裡（實測為 `AD`）。
- **C6**：README 要老師照「訊息印出的」指令做，而那則訊息本身就帶有前提。
- **C7**：與 hook 原有的訊息（`:160-161`）一致，而且是老師自己的選擇。
- **C8**：與 hook 印出的指令（`:504`）一致；檔案在 HEAD 裡取得回來；有本機修改時，`git rm` 不加 `-f` 會拒絕。

### C9–C14（駁回）

由一位 skeptic 逐項判定，全部是誤報：

- **C9**：spec 的 B2「Does not protect」已經列出 `--no-verify`、沒裝 hook 等情況，由 B3 擋下；E1 本身附有修復的出口。
- **C10**：
  - E1／Z1 是 traceability 規定的固定句子，不是流程步驟。
  - skill 裡沒有 commit 步驟。
  - 就算 agent 去 commit，仍受 hard rule 5 約束，而且只是本機 commit。
- **C11**：
  - 紀錄限定在本 ticket 的 V04、V05，並寫明清單以外的動作要先問。
  - 依 runtime.md 與 harness 規則，檔案裡的紀錄不構成授權。
- **C12**：CI 一律以 `pnpm wasm:build` 重建（`quality-gates.yml`、`release.yml`），不影響合併與部署的驗證。
- **C13**：既有行為，內容都可以從公開 repo 推導出來。
- **C14**：路徑是常數，只斷言 boolean，沒有跨越任何信任邊界。

## 已檢查、沒有問題的項目

- `_redirects` header 每一行都以 `#` 開頭，沒有長得像規則的內容，與規則段之間隔一行空白。Cloudflare Pages 會把它當成註解。
- README 的第一次 commit、第三種 W9 形式、孤兒說明頁三項，與 `scripts/pre-commit.sh:156-164`、`:282`、`:294`、`:497-507` 一致。
- 中英兩版 README 的對應段落內容一致。

## 涵蓋範圍限制

- 沒有做相依套件掃描（這次沒有改相依套件），也沒有評估可用性與 DoS。
- Cloudflare 解析 `_redirects` 的行為依官方語法判斷，沒有在部署環境驗證；V01 會在 preview 上觀察。
- 實測只在 scratch repo 用 git 預設設定進行，沒有測 `eol=lf` 之類的屬性（D16 (a) 已經記錄）。
- 跨 ticket 的串連分析留到 epic close-out。

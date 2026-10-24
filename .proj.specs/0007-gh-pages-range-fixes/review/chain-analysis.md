# 串連分析：epic 0007（GitHub Pages 靶場修正：會自己跟上的 `_redirects`，以及打得開的連結）

日期：2026-10-24。依 `docs/agents/review.md` 的「Epic close-out: chain analysis」執行。

## 範圍與方法

- **程式碼基準**：`main` = `cdaff71`（T-0039 合併後）。分析用的 checkout 是 `/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0039`。依 parent 說明，這個 tree 和 `cdaff71` 只差一個檔案：T-0039 ticket 尚未 commit 的第 8 階段紀錄（Markdown）。本分析引用的 V05 觀察就出自這份未 commit 的紀錄。本分析沒有自己跑 Git 確認這一點，以 parent 提供的範圍為準。下文的行號都是這個 working tree 的行號；程式碼檔案沒有 pending 變更，所以行號等於 `cdaff71`。
- **epic 起點**：`3b52e65`（T-0030 之前）。
- **合併順序**：

  | Ticket | 合併 commit |
  |---|---|
  | T-0030 | `e5ad839`（#36） |
  | T-0031 | `b55d0ae`（#37） |
  | T-0032 | `8e00561`（#38） |
  | T-0036 | `8a8af74`（#39） |
  | 紀錄 | `707be5f`（#40） |
  | T-0038 | `6f1b839` |
  | T-0033 | `4b1f81a` |
  | T-0037 | `101a982` |
  | T-0034 | `a2b1b96` |
  | T-0035 | `00ab30d` |
  | 紀錄 | `1dc0b3f`（#46） |
  | pending tickets T-0040～T-0050 | `1c65ff4`（#47） |
  | T-0039 | `cdaff71`（#48） |

- **輸入**：
  - `review/security-T-0030.md`～`security-T-0039.md` 的全部候選，含駁回項、已知邊界與規格觀察。
  - `spec.en.md` 3.2 版：Trust Boundaries and Threat Model（B1–B5，`:183-191`）、Out of Scope（`:352-367`）、Further Notes（`:369-410`）。
  - `traceability.md` 3.2 版：決策 D1–D16（`:31-57`）、hook 的約束與 O1–O7（`:252-317`）、訊息 W1–W9（`:220-250`）、mode rule（`:113-140`）、vocabulary（`:87-111`）。
  - pending tickets：T-0040～T-0050。
  - `OPEN-QUESTIONS.md` 的 OQ-016（`:553-602`）、OQ-018（`:642-680`）、OQ-023（`:810-840`），以及 ADR-0005。
  - 最終程式碼：
    - `scripts/pre-commit.sh`、`scripts/generate-redirects.ts`、`scripts/challenge-numbers.ts`、`scripts/create-challenge.ts`、`scripts/fork-init.ts`（只讀推導 origin 的一段）
    - `.vitepress/challenge/shortLink.ts`、`.vitepress/theme/linkMode.ts`、`.vitepress/config.mts`
    - `.vitepress/theme/components/ShortLinkShare.vue`、`ChallengeList.vue`、`MergedNav.vue`
    - `tests/unit/site/redirects-generated.test.ts`
    - `.github/workflows/quality-gates.yml`、`scripts/templates/deploy.yml.template`、`package.json`
    - `README.en.md`、`README.md` 的「Committing challenges」／「commit 題目」一節（`:144-154`）與部署段落
    - `create-wxl/src/git-steps.mjs`（只讀 branch 名稱的部分）
  - 第 8 階段的 V05 觀察：T-0039 ticket `:309-331`。
- **分工**：一個 `harness-reviewer` 唯讀分析，沒有執行程式、沒有開瀏覽器，也沒有呼叫 GitHub。`harness-challenger` 的獨立挑戰由 parent 補在文末。
- **標記方式**：
  - **讀碼驗證**：逐行讀過程式碼確認，附 `檔案:行號`。
  - **推論**：依賴 git、GitHub、Cloudflare 或瀏覽器的行為，或沒有直接證據。引用第 8 階段紀錄、而本分析沒有重現的事實，也標為推論。

## 信任邊界與攻擊者模型

沿用 spec 的 B1–B5（`spec.en.md:185-189`），另補兩條既有的判斷依據。

| 邊界 | 內容 | 本分析的判斷依據 |
|---|---|---|
| B1 | 建置環境（`CF_PAGES`）→ 建好的網站 | 只有 `1` 會選短連結；執行期改不了模式。手設 `CF_PAGES`、Cloudflare 上的 `SITE_ORIGIN` 指向別的 host、preview 指向 production，都列在「不保護」 |
| B2 | pre-commit hook → 老師的 index、working tree 與 stash | O1–O7。繞過 hook、跟隨符號連結、D16 (a) 的轉換列在「不保護」；**另一個 process 或另一個 worktree 同時改動 repository** 列在模型外 |
| B3 | CI guard → 合併與部署 | 「Unchanged: it runs on every range and host」（V05 下不成立，見 N-1）。B2 的「不保護」欄寫明「B3 catches the stale file each of these leaves」 |
| B4 | 建好的網站 → 學習者的螢幕與剪貼簿 | 文字只來自 `SITE_ORIGIN`、編號與 slug grammar 內的 slug，經過 Vue 跳脫。`SITE_ORIGIN` 不是靶場的真實位址時，連結打不開或「opens the site it names」（D10），列在「不保護」 |
| B5 | `create:challenge` → 老師的 working tree | 除了既有檔案只多寫 `_redirects`；status 2 與 3 各有意義 |
| （B0） | 題目 runtime vs. 平台（ADR-0005） | 本 epic 沒有改任何題目的刻意弱點（`spec.en.md:191`），各報告也都這樣判定 |
| （0004-B5） | 同一個 owner 的 GitHub Pages 靶場共用 origin | epic 0004 已接受同 origin 完全共用（OQ-018） |

攻擊者模型：

- **能 commit 或合併進靶場的人**（含老師合併的惡意 upstream release 或 PR）：本來就能改 `package.json` 的 scripts 與 hook 從 working tree 執行的腳本，等於能在老師機器與部署環境執行任意程式碼，不算跨越。
- **只能把檔案放進老師 working tree、但不會被 commit 的人**：例如老師把學生交來的題目資料夾直接複製成未追蹤目錄。
- **外部 GitHub 使用者**：能註冊空出來的帳號或 repository 名稱。
- **同一個 owner 底下其他 repository 的管理者**：例如一個組織裡有多位老師。
- **沒有攻擊者的失誤情境**：老師或 agent 的操作、同時執行的 session。

## 輸入：十份報告與已知邊界的全部候選

| ID | Ticket | 原判定 | 機制摘要 | 處置 |
|---|---|---|---|---|
| S1 | T-0030 | 0/3 駁回 | keygen 以 `shell: true` 執行含 slug 的命令字串（`create-challenge.ts:398`） | slug 已過 `SLUG_RE`；可選的 hardening |
| S2 | T-0030 | 0/3 駁回 | `writeRedirects` 跟隨符號連結 | spec 明文排除；留給本分析（鏈 L） |
| S3 | T-0030 | 0/3 駁回 | 覆寫手改的 `_redirects` | AC-10、C08 要求的行為 |
| S4 | T-0030 | 0/3 駁回 | 從整個 working tree 產生，會帶入未追蹤草稿的 slug | 留給本分析（鏈 E） |
| S5 | T-0030 | 0/3 駁回 | 產生器與 keygen 的輸出原樣印到終端機 | 非串連（鏈 M） |
| S6、S7 | T-0030 | 0/3 駁回 | 碰撞檢查只看 `index.md`；寫骨架失敗時以 1 結束 | 既有行為；S7 成為 T-0040 |
| S8 | T-0030 | 0/3 駁回 | ticket 紀錄含本機路徑 | 彙整見 N-7 |
| S1 | T-0031 | 0/3 駁回 | status 2 時 stderr 帶 frontmatter 內容進入 agent 的 context | 留給本分析（鏈 F） |
| S2～S4 | T-0031 | 0/3 駁回 | 重問的值插進 bash；「status 1 代表什麼都沒寫」；文字依賴 hook 已安裝 | 既有範本；T-0040；B2 |
| S1 | T-0032 | 2/3 成立 | `CDPATH` 讓 `-a` 被誤拒 | 已修（`pre-commit.sh:114`） |
| S2 | T-0032 | 1/3，使用者決定修 | 還原時的 `rm` 經由符號連結的上層目錄刪到 repository 外 | 已修（`:179-186`、`:203-215`） |
| S3～S7 | T-0032 | 0/3 駁回 | `cp` 跟隨連結；W4 回顯；`--staged` 不驗 slug；push 中途失敗；測試的 shell 插值 | S6 轉 T-0034 |
| 已知邊界 | T-0032 | 記錄 | 被忽略的連結換成真的目錄後消失 | T-0042 |
| 另項 | T-0032 | 已修 | `GIT_LITERAL_PATHSPECS` 讓 `:(exclude)` 失效 | `:81` |
| S1～S5 | T-0033 | 0/1 駁回 | W6 回顯；「Nothing was changed.」印在還原之前；檢查排在 stash 之後；`<( )` 失敗時放行；HEAD 已有孤兒 | S4 轉 T-0034（已修，`:394-396`）；S5 成為 T-0044 |
| R2-S1、R2-S2 | T-0033 | 0/1 駁回 | W6 的「git add it」；auto-merge | 流程備註（N-7） |
| S1、S9 | T-0034 | 3/3 成立 | push 與認領之間收到訊號；push 停在中途、index 已改後被 drop | 已修 |
| S5、S11、S13、S14 | T-0034 | 成立 | W9 的補救指令有錯（missing index、相對 pathspec、`index.lock` 上的 `^2`、還原只做到一半） | 已修 |
| S6、S15 | T-0034 | 成立 | CRLF 在 O7 時遺失；D16 (a) 的復原步驟會改動 index | 改寫 D16 (a)，程式不變 |
| S2～S4、S7、S8、S10、S12 | T-0034 | 0/1 駁回 | 再讀 `refs/stash` 也失敗；`finish` 前兩行的訊號；訊號由子行程繼承；測試的 PGID；本機路徑；認領延伸；重用 ID | S2、S3 成為 T-0045；S10 屬模型外 |
| S1～S7 | T-0035 | 0/1 駁回 | 本機路徑；mut.py；recordingShim；node_modules 連結；auto-merge；紀錄精確度；H36 的 EOF | — |
| S-1～S-3 | T-0036 | 0/3 駁回 | smoke 讀剪貼簿；`kill -9` 4173；沒跑 fork:init 的 fork 複製出 upstream 的網址 | S-1、S-2 是本機作業安全，不構成串連；S-3 屬 B4 已接受（鏈 G） |
| S-1～S-4 | T-0037 | 0/1 駁回 | 全域 click 監聽器範圍過寬（背景是 NoteEditor 的 `v-html`）；安裝旗標可被預先占用；`process.cwd()`；本機路徑 | 非串連（鏈 M） |
| R2-S1 | T-0037 | 成立（P2） | 報告行號過期 | 已修 |
| R2-S2～S4 | T-0037 | 0/1 駁回 | 重現指令的穩健度 | — |
| S1 | T-0038 | 0/1 駁回 | A8 警告不跳脫 DEL、C1 與 bidi 字元 | 非串連（鏈 M） |
| C1、C2 | T-0039 | 1/3 駁回 | drop 時不知道 n；apply 衝突時其他變更也被 stage | 當成 P2 補進 README（`README.en.md:149`、`:154`） |
| C3～C14 | T-0039 | 0/1 駁回 | README 的 git 指令、E1 的前提、skill 的祈使句、`_redirects` 公開等 | 鏈 C 檢查 C2 補充的後果 |

另列入的已知邊界與觀察：

- B1–B5 的「不保護」與「模型外」欄；Out of Scope；Further Notes。
- OQ-016（已由 0007 決定，user site 段落在 `:570-578`）、OQ-018、OQ-023。
- pending tickets：
  - T-0040：寫骨架失敗的 status
  - T-0041：選單用數字
  - T-0042：被忽略的連結
  - T-0043：沒有 `index.md` 的繁中目錄
  - T-0044：HEAD 已有孤兒說明頁
  - T-0045：`finish` 的四個罕見結束方式
  - T-0046：測試 wrapper 的等待迴圈
  - T-0047：只改訊息的 `--amend`
  - T-0048：`index.lock` 上手改的 `_redirects`
  - T-0049：W9 第三種形式的用字
  - T-0050：Windows 上的逾時
- **V05**：剛建立的 public 靶場 repository，Actions 頁面顯示「Workflows aren't being run on this repository」，API 卻回報已啟用。push 觸發的 Quality Gates（含 guard test）沒有執行，`workflow_dispatch` 的部署有執行（T-0039 ticket `:319-331`）。

## 候選串連

### 鏈 A：繞過 hook ＋ CI 沒有執行（V05）→ 過期或特製的 `_redirects` 到達部署（B2 ＋ B3 → B4／B1）

組成：B2 的「不保護」（`--no-verify`、沒裝 hook、web UI、merge、rebase）、V05、T-0047、T-0043、AC-17。

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | 繞過 hook 的 commit 帶著過期或手改的 `_redirects`。spec 只靠 B3 抓這種情況（`spec.en.md:186`、AC-17 `:259`） | 讀碼驗證（spec） |
| 2 | Quality Gates 只由 `pull_request` 與 `push` 到 `main` 觸發（`quality-gates.yml:8-11`），guard 在 `Run tests`（`:68-69`）。V05 觀察到剛建立的 repository 上 push 沒有產生任何 run | 讀碼驗證（workflow）；V05 屬推論（引自第 8 階段紀錄，未重現） |
| 3 | 部署 workflow 只由 `v*` tag 與 `workflow_dispatch` 觸發，不依賴 CI（`deploy.yml.template:42-46`、`:59-119`）；V05 的 dispatch 有執行 | 讀碼驗證 |
| 4 | **部署出去的 `_redirects` 不是 commit 裡那一份**：部署執行 `pnpm build`（`deploy.yml.template:100-103`），而 `build` 是 `wasm:build && challenge:keygen && redirects:generate && docs:build`（`package.json:30`）。`redirects:generate` 不帶 `--staged`，從 checkout 的整棵 tree 重寫檔案（`generate-redirects.ts:234-240`），樹不一致時以 1 結束，build 因此中止（`:242-245`、`:133-139`）。Cloudflare 的建置指令也以 `pnpm build` 結尾（`README.en.md:252-260`） | 讀碼驗證 |
| 5 | 所以 commit 裡的 `_redirects` 是否過期、是否被手改，都不影響部署出去的檔案。能影響部署內容的只有 commit 裡的題目目錄 | 讀碼驗證（步驟 4）＋推論（假設老師沒改建置指令） |
| 6 | 用特製的目錄名稱做規則注入：`to` 一律是 `/challenge/<slug>/`（`generate-redirects.ts:145-149`），slug 不能含 `/`，所以做不出絕對網址的 `to`，也做不出以 `/` 開頭的第二條 `from`。含換行或空白時只會產生格式錯誤的行 | 讀碼驗證（產生器）；Cloudflare 怎麼解析壞掉的行屬推論 |
| 7 | 能把這種目錄 commit 進靶場的人，本來就能改 `package.json` 的 `build`，在部署環境執行任意程式碼 | 推論 |

- **攻擊者需要什麼**：commit 或合併進靶場的權限，而這已經等於能在部署環境執行程式碼。沒有攻擊者時，後果只是 repository 裡的檔案過期。
- **跨越**：執行 `pnpm build` 的部署會重新產生 `_redirects`，所以學習者看到的網站不受影響（只跑 `vitepress build` 的主機例外，見獨立挑戰 1a）；GitHub Pages 本來也不讀這個檔。
- **判定**：不構成跨越邊界的串連。但 V05 證明 B3 的「Protects」欄（「it runs on every range and host」，`spec.en.md:187`）在第 8 階段實際走過的表面上不成立，而 B2 的「不保護」欄與 AC-17 都以 B3 為後盾。同一個事實也讓 AC-21 第 2 點（「the range's CI passes. The `Run tests` step's log shows the guard test's case passing」，`spec.en.md:269`）沒有照字面達成；第 8 階段是改在本機跑 guard 代替。另一個推論：同一個 banner 若也擋下 `pull_request`，老師可能把「沒有 check」誤讀成「check 通過」。見 N-1。
- **信心**：機制 0.8（步驟 4 讀碼驗證）；判定 0.75。

### 鏈 B：共用的 `refs/stash` ＋ 同時進行的 commit → hook 認領、還原或 drop 到別的 entry（B2，模型外條件）

組成：T-0034 S10（駁回）、T-0045 第 1 項、T-0032 報告列在模型外的 drop 競態、README 的 drop 指引（T-0039 C1）。

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | hook 以 push 前後的 `refs/stash` 認定自己的 entry：`before=$(stash_top)`、push、`after=$(stash_top)`，`after` 不同於 `before` 就認領（`pre-commit.sh:431-443`），`finish` 也有同樣的補認領（`:306-310`） | 讀碼驗證 |
| 2 | 同一個 repository 的各個 worktree 共用 `refs/stash`。worktree A 的 push 存好 entry 之後，還要依序跑 `add`、`apply --index -R`、`checkout`（`:270-273` 的註解；T-0034 S9 實測）。這段期間若 worktree B 的 push 也寫入 `refs/stash`，A 讀到的 `after` 就是 B 的 entry | 程式碼讀碼驗證；時序屬推論 |
| 3 | A 拿 B 的 entry 還原：`git restore --source=<B 的 entry> --worktree -- platform/`，接著 checkout-index 放回 B 的 `^3`（`:196-199`），等於把 B 的未 stage 內容寫進 A 的 working tree。A 自己的 entry 沒人認領，也沒有 W9 | 讀碼驗證（指令）；結果屬推論 |
| 4 | A 的 index 和 B 的 `^2` 不同：A 在自己的 index 上時，印出 id 錯誤的第三種 W9（`:334-346`）；A 在 `index.lock` 上（`-a`、`-i`、`-p`）時，直接 drop B 的 entry（`:335-341`）。`drop_entry` 先查 `stash@{n}` 再 drop，中間另有 TOCTOU（`:228-237`） | 讀碼驗證 |
| 5 | 物件在 gc prune 之前都還在，A 自己的 entry 也仍列在 `git stash list`，所以資料沒有永久遺失，但 A 的 working tree 混進了 B 的內容，而 hook 可能以 0 結束（O2） | 推論 |
| 6 | 這個模型外條件，在 upstream 自己的開發方式裡很常見：「Concurrent implementations use separate ticket branches/worktrees」（`docs/agents/runtime.md:105-106`），這次 session 的環境說明也警告 stash 會被其他 session 同時 push 或 pop | 讀碼驗證（文件） |

- **攻擊者需要什麼**：沒有攻擊者，只需要兩個 worktree 的 commit 在同一段時間 push stash，例如兩個 agent session 同時 commit。
- **跨越**：B2 的「never applies or drops another entry」與「writes no other repository's files」（`spec.en.md:186`）。後者嚴格說沒被違反，因為寫的是同一個 repository 的另一個 worktree 的內容。但 B2 把這個條件列在模型外。
- **與舊 hook 比較**：舊 hook 用 `git stash pop`，碰到同樣的競態也會 pop 錯 entry，所以這不是本 epic 新造成的退步。本 epic 新加的是 `index.lock` 上直接 drop 的分支（步驟 4）。
- **判定**：依 spec 屬模型外，不構成模型內的串連。但模型外的前提與專案自己的多 worktree 作法互相衝突（N-2），是否補強或在 B2 寫明「upstream 的平行 session 例外」交使用者裁決。可能的補強方向（本分析未驗證）：push 的訊息帶一次性 nonce，認領前檢查 `stash@{0}` 的訊息與 `^1 = HEAD`；或者 drop 前再比對一次 id。
- **信心**：機制 0.4（時序未重現）；判定 0.7。

### 鏈 C：README 的衝突處理加上 `index.lock` 留下的 entry → `^2` 被寫進真正的 index（B2，文件 × D16 (a)）

組成：T-0034 S13、S15、D16 (a)、T-0039 C2 的 P2 補充。

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | D16 (a)：自己的 index 上，`git restore --staged --source=<id>^2` 能把 index 放回去；**在 `index.lock` 上，entry 的 index commit 存的是 `-a` 的 staging，要改用 `git restore` 指令**（`traceability.md:57`） | 讀碼驗證（traceability） |
| 2 | hook 在 `index.lock` 上不會印出 `^2` 指令：`keep_index_too` 只在 `ON_LOCK=false` 時印（`pre-commit.sh:329`），第三種 W9 在 lock 上改成直接 drop（`:335-341`） | 讀碼驗證 |
| 3 | README 的「Changes the hook could not put back」一項，同時涵蓋 W9 第一種形式（可能出現在 lock 上：`-a` 或 `-p` 的還原失敗）與 missing-index 形式（一定出自 lock）。它寫「When apply reports a conflict … `git restore --staged --source=<id>^2 -- …` puts back what was staged before the commit」，沒有附上 D16 (a)「只限自己的 index」的條件（`README.en.md:149`、`README.md:149`） | 讀碼驗證 |
| 4 | 中斷的 `git commit -p`：全部 hunk 都被拒絕的檔案，在 push 之後和 `.git/index` 一致，apply 會實際合併；老師 commit 前原本已 stage、又有相鄰未 stage hunk 的檔案會衝突。照 README 執行後，`-p` 當下挑選的 hunk 會被 stage 進 `.git/index` | 推論（git 的 apply 語意，未重現） |
| 5 | `-a` 時 tracked 修改都在 working tree 上，和 `.git/index` 不一致，apply 會拒絕而不是衝突，於是改走 README 的 `git restore` 指令。走不到這條衝突路徑 | 推論 |

- **攻擊者需要什麼**：沒有攻擊者。需要 `-p` 或 `-i` 的 commit 中斷，或在 lock 上還原失敗，接著 apply 衝突。
- **影響**：多 stage 了老師在 `-p` 當下挑選、原本就打算 commit 的 hunk。`.git/index` 原本 stage 的 hunk 仍在，沒有資料遺失；README 也要求 commit 前先看 `git status`。
- **判定**：不構成跨越邊界的串連。README 對 D16 (a) 的轉述不完整，屬於 P2 文件精確度（N-3）。
- **信心**：0.35。

### 鏈 D：README 的 drop 指引 → drop 錯 stash entry（B2）

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | W9 只印 commit id（`pre-commit.sh:260`、`:266`、`:294`）；README 要老師用 `git stash list --format='%gd %H'` 找出 id 相同的那一行，再 drop 那一行的 `stash@{<n>}`（`README.en.md:154`）。`git stash drop` 不接受 id，T-0039 C1 已實測 | 讀碼驗證（README、hook）；drop 的行為引自 C1 的實測 |
| 2 | 只有在 list 與 drop 之間有其他 process push 或 pop stash 時，n 才會指錯 | 推論 |

- **判定**：單一 process 內不會發生；需要並行時，併入鏈 B（N-2）。不構成串連。
- **信心**：0.75。

### 鏈 E：`create:challenge` 從整個 working tree 產生 ＋ 繞過 hook → 草稿的 slug 進入公開歷史（B5 → B2 → 公開 repository）

組成：T-0030 S4、D5、W3、W4、B2 的「不保護」、V05。

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | `create:challenge` 在 keygen 之後，從整個 working tree 重寫 `_redirects`（`create-challenge.ts:369-371`），編號也從整個 working tree 算（`:307`）。未追蹤的草稿只要有 `index.md` 就會被納入（`challenge-numbers.ts:70-77`、`:80-95`） | 讀碼驗證 |
| 2 | 照常 commit 時，hook 會觸發（staged 的題目或 `_redirects` 本身，`pre-commit.sh:89-95`），從 index slugs 重新產生（`:511`；`generate-redirects.ts:201-216`），並把 working tree 的版本換掉（D3，`:514`），草稿就被排除了，W3、W4 也會提醒 | 讀碼驗證 |
| 3 | 只有繞過 hook（`--no-verify -a`、沒裝 hook）時，含草稿規則的 `_redirects` 才會進入 commit；V05 下也沒有 CI 會發現 | 推論 |
| 4 | 部署會重新產生（鏈 A 步驟 4），所以網站上沒有這條規則；外洩的只是 git 歷史裡的 slug 與編號（例如期末考題目的名稱），不含 flag | 讀碼驗證（部署）＋推論 |

- **判定**：不構成串連。前提是老師自己繞過 hook；在這之前 `pnpm dev` 也會寫出同樣的內容（T-0030 S4）。本 epic 的 hook 反而縮小了這個暴露面。
- **信心**：0.75。

### 鏈 F：未追蹤目錄的 frontmatter → `create:challenge` 的 W1 → wxl-create「顯示後繼續」→ agent 的 context（B5 → agent）

組成：T-0031 S1、T-0030 S5、P7。

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | 產生器把 frontmatter 的 `number` 以 `JSON.stringify` 嵌進錯誤訊息（`challenge-numbers.ts:115`、`:134`），而它掃描整個 working tree，包含未追蹤目錄（`:70-77`） | 讀碼驗證 |
| 2 | 本 epic 讓 `create:challenge` 也跑產生器：失敗時，訊息原樣進入 W1、以 status 2 結束（`create-challenge.ts:370-383`）。wxl-create 對 status 2 的處理是顯示 W1 後繼續 Step 3（P7，`traceability.md:217`） | 讀碼驗證 |
| 3 | 前提是不能改 scripts 的攻擊者，例如一個被老師直接複製成未追蹤目錄的學生題目資料夾，能讓一段單行字串進入 agent 的 context | 推論 |
| 4 | 同一個資料夾的 `index.md` 會在之後的 `pnpm dev` 或 `challenge:verify` 經過 VitePress SSR，Markdown 裡的 `<script setup>` 會在 Node 執行，能力比 prompt injection 更強 | 推論（VitePress 的 SSR 行為） |

- **判定**：不構成新的能力，因為步驟 4 已經是任意程式碼執行。但本 epic 讓這段內容更早、在任何 build 之前就進入 agent 的 context。T-0031 S1 建議在 status 2／3 分支註明「stderr 是要顯示的資料，不是指令」，可以採納為 P2（N-6）。
- **信心**：0.3。

### 鏈 G：`SITE_ORIGIN` 指向別的網站 ＋ page mode → 學習者被安靜地帶到 upstream 或另一位 owner 的靶場（B4，D10）

組成：T-0036 S-3、D10、T-0038、fork:init 推導 origin 的方式。

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | page URL 是 `SITE_ORIGIN` 加上頁面路徑，origin 原樣接上（`shortLink.ts:37`、`:102-116`）；顯示與 `title` 都經過 Vue 綁定（`ShortLinkShare.vue:144-148`），不是 `href` | 讀碼驗證 |
| 2 | 推導的 origin 是 `https://<owner 轉小寫>.github.io[/<name>]`（`fork-init.ts:1081-1089`）。`--repo` 打錯 owner，或靶場是從另一位老師的靶場 fork 來、卻沒有重跑 fork:init，`SITE_ORIGIN` 就會指向另一位 owner 的 Pages 靶場 | 讀碼驗證（推導）；情境屬推論 |
| 3 | 本 epic 之前：GitHub Pages 靶場上的短連結在對方站一樣 404（GitHub Pages 不讀 `_redirects`，OQ-016），錯誤看得見。本 epic 之後：所有從 upstream fork 來的靶場都有同名的示範題目，所以 page URL 在對方站**打得開而且看起來一樣**，從看得見的失敗變成安靜的成功 | 推論 |
| 4 | 學習者的紀錄存在對方的 origin，由對方部署的程式碼控制 | 推論 |

- **跨越**：B4 的「不保護」欄已經用一般化的說法涵蓋：「open the site it names」（`spec.en.md:188`），D10 也明文不做建置期檢查（`spec.en.md:355`）。B4 只具體寫了 upstream 的情況，沒寫第二代 fork 與打錯 `--repo` 的情況。老師在自己的列表上看得到顯示出來的網址，算是一道看得見的線索。
- **判定**：不構成新的串連。N-5 記錄「失敗從看得見變成看不見」這個面向。
- **信心**：0.5。

### 鏈 H：user site 靶場的 page URL 路徑被同一個 owner 的專案站接手（B4，OQ-016，OQ-018，OQ-023）

組成：0004 的鏈 B、OQ-016 決定段落、D6、OQ-023。

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | user site 的 origin 沒有路徑（`fork-init.ts:1088`）；page URL 的路徑是 `/challenge/<slug>/` 或 `/zh-TW/challenge/<slug>/`（`shortLink.ts:114`） | 讀碼驗證 |
| 2 | 同一個 owner 若有名為 `challenge` 或 `zh-TW`、啟用 Pages 的 repository，GitHub Pages 會把這兩個路徑交給那個專案站 | 推論（GitHub Pages 的路徑優先順序，和 0004 鏈 B 同一個前提） |
| 3 | 沒有語言偏好的學習者打開英文 page URL 時，會被導到 `/zh-TW/…`（D6、OQ-023），所以名為 `zh-TW` 的 repository 也會接手英文連結 | 讀碼驗證（OQ-023 的證據段）＋推論 |
| 4 | 和 0004 不同的是：被接手的路徑也是靶場自己的頁面路徑，所以不只複製出去的連結，連站內導覽也會一起被接手。這是「在 user site 架靶場」本身的限制，不是複製按鈕造成的 | 推論 |

- **跨越**：同一個 owner、同一個 origin，0004 已在 B5／OQ-018 接受完全共用。
- **判定**：不構成新的串連。但 OQ-016 的決定段落寫「the user-site case above closes too, since no `/c/` or `/zh/c/` path is handed out there」（`OPEN-QUESTIONS.md:594-595`），範圍說得太寬：同一個機制換成 `challenge` 與 `zh-TW` 兩個名稱後仍然存在（N-4）。V04 也觀察到同一個 owner 的靶場共用 `wxl-locale`（T-0039 ticket `:294-296`），所以 X 靶場的語言設定會決定 Y 靶場要不要做 D6 的導向。
- **信心**：0.45。

### 鏈 I：帳號或 repository 改名 → 舊名被他人註冊 → 印在講義上的 page URL 打開仿冒的靶場（B4 → 外部攻擊者）

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | `SITE_ORIGIN` 寫死 `https://<owner>.github.io/<repo>`（`fork-init.ts:1089`），本 epic 讓 GitHub Pages 靶場開始大量發出這個網址，包括印在講義上的（User Story 5） | 讀碼驗證（推導）；發出的量屬推論 |
| 2 | owner 改名後舊名空出，被他人註冊並建立同名 repository 與 Pages，部署 upstream 的公開程式碼，看起來和原靶場一樣 | 推論（GitHub 的名稱回收規則） |
| 3 | 學習者照講義打開，作答紀錄與輸入的內容都在攻擊者的 origin 上 | 推論 |

- **跨越**：B4 →（外部攻擊者）。B4 的「不保護」欄只說「A renamed repository … also break links」（`spec.en.md:188`），E2／Z2 說「opens this range only while `SITE_ORIGIN` … holds the range's address」。兩者都沒有提到被接手的可能。
- **與既有狀況比較**：站內導覽與書籤也依賴同一個網址，這是 GitHub Pages 架站本身的性質；攻擊者也能在 `/c/NNN` 放頁面，所以接手舊短連結一樣可行。
- **判定**：觸發條件（改名）在 B4 已接受的範圍內，不構成模型內的串連。N-5 一併記錄：文件只說「打不開」，低估了改名後被接手的後果。
- **信心**：0.4。

### 鏈 J：`CF_PAGES` 模式決定的組合錯誤（B1）

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | 只有 `process.env.CF_PAGES === '1'` 會定義成 `'true'`（`config.mts:76`）；`linkMode` 只讀編譯期常數，未定義時是 page mode（`linkMode.ts:16-18`）；page mode 的 bundle 裡沒有這個識別字（T-0036 第 6 階段的 grep，引用） | 讀碼驗證（程式）；bundle 的部分是引用 |
| 2 | 部署範本與 CI 都沒有設 `CF_PAGES`（`deploy.yml.template:100-103`；quality-gates 的 build job） | 讀碼驗證 |
| 3 | 錯誤組合都列在 B1 的「不保護」：手動設定的 `CF_PAGES=1`、Cloudflare 上的 `SITE_ORIGIN` 仍指向 github.io、preview 指向 production（`spec.en.md:185`）。其中前兩種若發生在 user site，會重新打開 0004 鏈 B 的 `c`／`zh` 路徑接手 | 讀碼驗證（spec）＋推論 |
| 4 | 執行期切換模式不可行：`window.__WXL_SHORT_LINKS__` 無效（S09，AC-9） | 讀碼驗證（`linkMode.ts`） |

- **攻擊者需要什麼**：改得了建置環境的人，也就是老師自己的設定。
- **判定**：不構成串連。
- **信心**：0.8。

### 鏈 K：HEAD 已有孤兒說明頁讓老師習慣用 `--no-verify`（T-0044）＋ CI 沒有執行（V05）→ validator 再也不執行 → 真正的 flag 外洩？（B2 ＋ B3 → B0／ADR-0005 第 3 類）

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | 孤兒說明頁檢查讀整個快照，HEAD 裡的孤兒會擋下之後每一個觸發 hook 的 commit（`pre-commit.sh:483-508`；T-0044） | 讀碼驗證 |
| 2 | 老師為了繼續工作改用 `--no-verify`，validator（`:453-462`）也一起被跳過；V05 下也沒有 CI | 推論 |
| 3 | flag 的長度與形狀在建置時仍會被強制檢查：`redactFlags` 對太短或形狀不符的 flag 直接丟出例外（`challenge-source-display.ts:122-136`），build 中止，不會把沒遮蔽的 flag 印進 white-box 的顯示副本 | 讀碼驗證（函式）；build 確實呼叫它屬推論（依 `challenge-validate.ts:200-203` 的註解） |

- **判定**：不構成串連，部署端還有最後一道防線。T-0044 的可用性問題（逼老師繞過 hook）仍值得在之後處理。
- **信心**：0.6。

### 鏈 L：跟隨符號連結的寫入（T-0030 S2、T-0032 S3）＋ hook ＋ `create:challenge` → 寫到 repository 外（B2、B5）

- `writeRedirects` 用 `writeFileSync`（`generate-redirects.ts:189-194`），hook 用 `cp`（`pre-commit.sh:514`、`:312`、`:387`），兩者都會跟隨連結，B2 與 Out of Scope 已明文接受。（讀碼驗證）
- 前提是 repository 追蹤一個指向外部的 `_redirects` 或 `platform/public` 連結，也就是攻擊者能 commit 進靶場，等於已能執行任意程式碼。T-0032 S2 已修掉的是還原時的刪除路徑（`:179-186`、`:203-215`），寫入路徑維持 spec 的決定。（讀碼驗證）
- **判定**：不構成串連。**信心**：0.8。

### 鏈 M～：組不成串連

| 鏈 | 內容 | 判定 | 信心 |
|---|---|---|---|
| M | 終端機控制字元的回顯：T-0030 S5、T-0032 S4、T-0033 S1、T-0038 S1，來源都是 tree 或老師自己的參數；能控制來源的人本來就能改 hook 執行的腳本 | 不構成 | 0.8 |
| N | T-0037 的全域 click 監聽器 × NoteEditor 未消毒的 `v-html`（`NoteEditor.vue:29`、`:71`）：監聽器只會 `preventDefault` 並選取文字，能力嚴格弱於 `v-html` 本身；`v-html` 是既有問題（T-0037 S-1 的 skeptic 建議另外開票）。筆記能不能被匯入沒有查證 | 不構成；`v-html` 留給另一張票 | 0.7 |
| O | T-0042 被忽略的連結消失：repository 外的檔案不變，hook 以 0 結束 | 不構成 | 0.8 |
| P | T-0043 沒有 `index.md` 的繁中目錄、T-0047 只改訊息的 `--amend`：都只讓 CI 晚一步發現；V05 下沒人發現，但部署不受影響（鏈 A 步驟 4） | 不構成 | 0.75 |
| Q | T-0045 的罕見結束方式：entry 沒有提示但仍在 `git stash list`；只有並行時才會擴大，併入鏈 B | 不構成 | 0.7 |
| R | T-0048：`index.lock` 上失敗時，手改的 `_redirects` 被換成預期內容；這是不該手改的產生檔，O5 允許 | 不構成 | 0.8 |
| S | T-0049：照第三種 W9 仍執行 `git stash apply`，檔案已經放回，apply 會拒絕，不會造成損害 | 不構成 | 0.6 |
| T | T-0040 寫骨架失敗：殘留的目錄沒有 `index.md` 就不算題目（`challenge-numbers.ts:74`）；殘留的 `flag.txt` 被 `git add` 也不比既有作法糟，因為每題的 `flag.txt` 本來就 commit | 不構成 | 0.7 |
| U | T-0041、T-0046、T-0050：agent 的選單、測試的穩健度；T-0050「養成重跑失敗的習慣」只影響 CI 的判讀 | 不構成 | 0.8 |
| V | D16 (a) 的 CRLF 與重疊 hunk：只有 O7 才發生，只改行尾；已接受 | 不構成 | 0.8 |
| W | `$WORK` 裡的原樣副本與 `_redirects` 備份（含草稿的 `flag.txt`）：`mktemp -d`（`pre-commit.sh:167`）預設權限 0700，`finish` 會刪除（`:351`）；只有 SIGKILL 會留下，屬模型外 | 不構成 | 0.7 |
| X | 從 working tree 執行的產生器與 validator（`pre-commit.sh:460`、`:511`），以及 simple-git-hooks 安裝的相對路徑 hook（`package.json:43-44`）：在 checkout 出來的不可信分支上 commit，就會執行那個分支的程式碼；這是既有設計，`pnpm install` 也一樣 | 不構成 | 0.75 |

### 已檢查、確認不會組合的跨 ticket 互動

| 互動 | 驗證 | 標記 |
|---|---|---|
| T-0030 的 W1「commit 時從 staged 內容重新產生」× T-0032 的 `--staged` | W1 文字（`create-challenge.ts:376-382`）與 hook 的產生方式（`pre-commit.sh:511`）一致；未追蹤的草稿不會讓 hook 拒絕 | 讀碼驗證 |
| T-0030 從整個 working tree 產生 × T-0032 的 D3 | hook 用 staged 的版本取代 working tree 的版本（`pre-commit.sh:514-516`），W3 只在老師的版本被換掉時才印（`:521-524`） | 讀碼驗證 |
| T-0032 S6（push 中途失敗）→ T-0034 | push 之後認領（`:437-444`）、`finish` 補認領（`:306-310`） | 讀碼驗證 |
| T-0033 S4（`<( )` 失敗）→ T-0034 | 清單先寫入檔案（`:396`、`:414`、`:422-423`、`:453`、`:483-484`） | 讀碼驗證 |
| T-0034 S13 × T-0039 的 README | hook 在 lock 上不印 `^2`（`:329`、`:335-341`），README 的第三種形式說明只寫自己的 index（`README.en.md:150`）；第一種形式的衝突路徑見鏈 C | 讀碼驗證 |
| T-0036 的 slug × T-0037 的監聽器 | 只有 `ShortLinkShare.vue:145` 輸出 `data-short-link`；page mode 不在 slug grammar 內就回傳 null（`shortLink.ts:113`） | 讀碼驗證 |
| T-0036 的模式 × B1 的 smoke | 未定義時是 page mode（`linkMode.ts:17`）；CI 建置時沒有 `CF_PAGES` | 讀碼驗證 |
| T-0038 的 A8 用字 × T-0039 的 E2／Z2 | 兩者都說 `SITE_ORIGIN` 是每個複製連結的 origin（`shortLink.ts:24-36`、`README.en.md:232`） | 讀碼驗證 |
| guard 的納入規則 × hook 的 index slugs | guard 用「任一個 tree 有追蹤」的 slug（`redirects-generated.test.ts:156-179`），hook 依各自的 tree 判定（`generate-redirects.ts:201-216`）；孤兒會先被拒絕（`pre-commit.sh:497-508`），所以在乾淨的 checkout 上結果相同 | 讀碼驗證 |
| create-wxl 的預設 branch × Quality Gates 的 `branches: [main]` | create-wxl 強制 `refs/heads/main`（`create-wxl/src/git-steps.mjs:84-86`），所以 V05 不是 branch 名稱造成的 | 讀碼驗證 |

## 分析結論

| 鏈 | 跨越邊界 | 判定 | 信心 |
|---|---|---|---|
| A | B2 ＋ B3 → 部署 | 不構成串連（部署執行 `pnpm build` 時會重新產生 `_redirects`；只跑 `vitepress build` 的主機例外，見獨立挑戰 1a）；B3 的保證在 V05 下不成立，AC-21 的 CI 條件也沒有照字面達成（N-1） | 0.75 |
| B | B2（另一個 entry、另一個 worktree） | 模型外，不構成模型內的串連；前提與專案的多 worktree 作法衝突，交使用者裁決（N-2） | 0.7 |
| C | B2（index） | 不構成；README 對 D16 (a) 的轉述不完整（N-3） | 0.35 |
| D | B2（stash entry） | 不構成；並行時併入 B | 0.75 |
| E | B5 → 公開歷史 | 不構成（需要老師繞過 hook；hook 縮小了暴露面） | 0.75 |
| F | B5 → agent | 不構成（之後的 SSR 本來就能執行程式碼）；P2 用字建議（N-6） | 0.3 |
| G | B4 → 其他網站 | 不構成（B4 的一般化敘述已接受）；失敗變得看不見（N-5） | 0.5 |
| H | B4（同一個 owner） | 不構成（0004 已接受）；OQ-016 的「closes too」說得太寬（N-4） | 0.45 |
| I | B4 → 外部攻擊者 | 觸發條件在 B4 已接受的範圍內；文件低估了後果（N-5） | 0.4 |
| J | B1 | 不構成 | 0.8 |
| K | B2 ＋ B3 → B0 | 不構成（建置期仍會遮蔽 flag） | 0.6 |
| L | B2、B5（寫到 repository 外） | 不構成（spec 明文接受，前提是 commit 權限） | 0.8 |
| M～X | 無 | 不構成 | 0.6–0.8 |

沒有找到跨越模型內信任邊界的真實串連，依 `review.md` 不需要在收尾前開 ticket。以下交使用者裁決：

- **N-1**：V05 顯示 B3 的保證不成立，AC-21 也沒有照字面達成。這是最值得開 pending ticket，或補進 spec／create-wxl 下一步說明的一項。
- **N-2**：鏈 B 的模型外前提和 upstream 自己的平行 worktree 作法衝突。

## 新增的觀察

| ID | 位置 | 違反或不足的要求 | 證據與影響 | 信心 | 等級 |
|---|---|---|---|---|---|
| N-1 | `spec.en.md:187`（B3）、`:186`（B2 依賴 B3）、`:259`（AC-17）、`:269`（AC-21）；T-0039 ticket `:319-331`；`quality-gates.yml:8-11`；`deploy.yml.template:42-46` | B3「it runs on every range and host」；AC-21「the range's CI passes. The `Run tests` step's log shows the guard test's case passing」 | 剛建立的 public repository 上，push 沒有產生 Quality Gates run，部署照樣以 dispatch 執行（鏈 A）。部署執行 `pnpm build` 時，學習者看到的網站不受影響，因為它會重新產生（`package.json:30`）；建置指令只有 `vitepress build` 的主機會把 commit 裡的檔案逐字上線（獨立挑戰 1a），但 B2 的「由 B3 擋下」在這種靶場等於沒有後盾，create-wxl 的下一步說明也沒有提醒老師。AC-21 第 2 點改以本機執行代替，屬於第 8 階段 gate 的偏離，要由使用者明確接受或補驗 | 0.75（觀察本身引自第 8 階段紀錄） | 資安 Low／P2；AC-21 偏離交使用者裁決（若要求補驗則為 P1） |
| N-2 | `pre-commit.sh:431-443`、`:306-310`、`:228-237`、`:335-341`；`spec.en.md:186`（B2 模型外）；`docs/agents/runtime.md:105-106` | B2「never applies or drops another entry」 | 兩個 worktree 同時 commit 時，hook 可能認領、還原、甚至 drop 到另一個 session 的 entry，把別人的內容寫進自己的 working tree（鏈 B）。B2 把這列在模型外，但 upstream 平行 session 的作法讓它成為常態；老師端很少見。舊 hook 的 `stash pop` 也有同樣的問題 | 0.4 | Low／P2 |
| N-3 | `README.en.md:149`、`README.md:149`；`traceability.md:57`（D16 (a)） | D16 (a)：在 `index.lock` 上，`^2` 是 `-a` 的 staging，要改用 `git restore` 指令 | README 的衝突處理沒有附「只限自己的 index」的條件。中斷的 `-p` 或 `-i` 走到衝突路徑時，會把當下挑選的 hunk stage 進 `.git/index`（鏈 C）。沒有資料遺失 | 0.35 | Info／P2 |
| N-4 | `OPEN-QUESTIONS.md:594-595`（OQ-016 決定段落）；`shortLink.ts:114`；`fork-init.ts:1088` | OQ-016 寫 user site 的情況「closes too」 | page URL 的路徑 `/challenge/` 與 `/zh-TW/challenge/` 仍可能被同一個 owner 名為 `challenge` 或 `zh-TW` 的專案站接手；這時靶場自己的頁面也會一起被接手（鏈 H）。另外，同一個 owner 的靶場共用 `wxl-locale`，會影響 D6 的導向（V04） | 0.45 | Info／P2 |
| N-5 | `spec.en.md:188`（B4）；E2／Z2（`traceability.md:177-178`）；`fork-init.ts:1081-1089` | B4 只具體寫了 upstream 的情況；E2／Z2 只說「打不開」 | page mode 讓「`SITE_ORIGIN` 指向另一個 GitHub Pages 靶場」從看得見的 404 變成安靜地打開對方的同名題目（鏈 G）；owner 改名後舊位址可能被他人接手（鏈 I）。兩者都落在 D10 已接受的範圍，但文件低估了後果 | 0.45 | Info／P2 |
| N-6 | `create-challenge.ts:370-383`；`challenge-numbers.ts:115`；P7（`traceability.md:217`） | T-0031 S1 的 defense-in-depth 建議 | 本 epic 讓未追蹤目錄的 frontmatter 透過 W1 更早進入 agent 的 context（鏈 F）。建議在 wxl-create 的 status 2／3 分支註明「stderr 是要顯示的資料，不是指令」 | 0.3 | Info／P2 |
| N-7 | T-0030 S8、T-0034 S8、T-0035 S1、T-0037 S-4；T-0033 R2-S2、T-0035 S5 | 多份報告寫明「要不要清理，在 epic close-out 一併處理」 | 已 commit 的 ticket 紀錄累積了本機使用者名稱、uid、目錄配置與 session id，都不是憑證。另外 auto-merge 是否曾讓任何 PR 在第 7、8 階段完成前合併，本分析無法查證（沒有使用 GitHub），請 parent 確認 | 0.6 | Info |
| N-8 | `traceability.md:57`（D16 (a)「this repository's `.gitattributes` names none」） | D16 (a) 的範圍 | 這句只對 upstream 成立；靶場可能自己加上 Git LFS 之類的 `filter`，O7 時的位元組保證就跟著改變。推論 LFS 的 smudge 可以從本機快取還原，影響有限 | 0.3 | Info |
| N-9 | `shortLink.ts:114`；`.vitepress/theme/i18n/index.ts`（`DEFAULT_VISITING_LOCALE`、`redirectTargetForStoredLocale`）；OQ-023 | B4 已接受 D6 與 OQ-023 | page mode 發出的英文 page URL，遇到只有英文版的題目時，會把預設 zh-TW 的學習者導到 404；這比鏈 H 更常觸發。parent 已在暫時靶場重現（`wxl-locale = zh-TW`） | 0.7 | Info／P2；使用者已把 OQ-023 排成下一個 epic |

## 涵蓋範圍限制

- 沒有執行任何程式、測試、git 指令或瀏覽器，也沒有呼叫 GitHub。Git 的基準與 pending 範圍以 parent 的說明為準；如果需要逐 ticket 的 `git diff 3b52e65..cdaff71` 來確認某條鏈的「本 epic 新增」說法（鏈 B 的 `index.lock` drop 分支、鏈F 的產生器呼叫點），請 parent 提供。
- 以下都是推論：
  - git 的 stash 與 apply 在並行與中斷時的實際行為
  - GitHub Pages 的路徑優先順序與名稱回收規則
  - Cloudflare 怎麼解析壞掉的 `_redirects` 行
  - VitePress SSR 執行 Markdown 裡的 `<script setup>`
  - V05 的成因
  - build 確實呼叫 `redactFlags`
- V05 只引用第 8 階段的紀錄，沒有重現。
- 沒有評估：相依套件的弱點、可用性、題目 runtime 的內容、NoteEditor 的筆記來源（是否能匯入）、Windows 上的 hook 行為。

## 獨立挑戰

（`harness-challenger` 唯讀補充，供 parent 篩選。每項附 agree／disagree／partially、證據、信心與能定案的觀察。行號皆為 `cdaff71` working tree。）

### 1. 對結論「沒有串連跨越模型內信任邊界」的魔鬼代言

**1a. 鏈 A「部署一定重新產生 `_redirects`」—— partially disagree（信心 0.7）**

這條「一定」只在呼叫 `pnpm build` 的兩條部署路徑上成立，分析把它寫成無條件的補償控制（`chain-analysis.md:137`、`:324` 與 N-1 的「學習者看到的網站不受影響，因為部署一定重新產生」）是過強的。

- `pnpm build` 才串 `redirects:generate`（`package.json:30`）；而 `docs:build` = 純 `vitepress build`，**不跑產生器**（`package.json:21`）。VitePress 只把 `platform/public/_redirects` 原樣複製到 dist（`generate-redirects.ts:57-58` 的 HEADER）。
- 已驗證會重新產生的只有兩條有文件的路徑：GitHub Pages 範本 `deploy.yml.template:100-103`（`pnpm build`）、Cloudflare 建置指令 `README.en.md:259`（`… && pnpm build`）。
- 但 `README.en.md:158` 明文「can be deployed to **any static hosting service**」。一個把建置指令設成 `vitepress build`／`pnpm docs:build` 的通用靜態主機（Netlify、或為省去 Rust build 而簡化指令的 Cloudflare 專案），會把 commit 內那份 `_redirects` **逐字上線**。Netlify 與 Cloudflare 都會讀這個檔。
- 旁證：CI 的 `build` job 本身也只跑 `pnpm docs:build`（`quality-gates.yml:108-118`），完全不跑 `redirects:generate`——證明「build 一定重寫 `_redirects`」在專案內部就已經不是通則，靠的是 guard test（B3）而非部署時重生。

**但結論（不跨界）仍成立**：能把特製 `_redirects` commit 進去的人已有 commit 權＝等於建置環境 ACE（逃生口不變）；無攻擊者時後果是過期／404 的導向，落在 B4「does not protect」。**應改的是 N-1 的措辭**：把「部署一定重新產生」限定為「在呼叫 `pnpm build` 的兩條有文件路徑上」，並點出此補償控制本身取決於主機的建置指令。定案觀察：在一個 build command 設為 `vitepress build` 的 Cloudflare/Netlify 專案上部署一份手改的 `_redirects`，看它是否生效。

**鏈 A step 4 的讀碼本身正確**（agree）：非 `--staged` 路徑 `writeRedirects` 走整棵 tree，樹不一致時 `numericRules` 丟例外（`generate-redirects.ts:133-139`）、main 的 catch `process.exit(1)`（`:242-245`），build 中止。無誤。

**1b. 鏈 B「模型外、且非退步」—— partially agree（信心 0.6）**

- 「模型外」判定正確（agree）：B2 的「Outside the model」欄逐字列出「Another process changing the repository during the commit, **including a commit in another worktree of the same repository**」（`spec.en.md:186`），與 N-2 一致。
- 「舊 hook 用 `git stash pop`、碰到同樣競態也會錯、所以本 epic 非退步」（`chain-analysis.md:156`）是**未經驗證的歷史比較**：本分析沒讀 `3b52e65` 的舊 hook，卻把它當事實陳述，而不是標為推論。新加的 `index.lock` 直接 `drop_entry`（`pre-commit.sh:335-341`，帶 TOCTOU `:228-237`）是否「嚴格不比 `stash pop` 差」無法只靠現況程式碼斷定。定案觀察：`git show 3b52e65:scripts/pre-commit.sh`，確認舊版是否用 `stash pop` 且無 `index.lock` drop 分支。N-2 的治理張力（upstream 自己靠多 worktree 平行作業，`docs/agents/runtime.md:105-106`，本 session 環境說明也警告 stash 會被別的 session push/pop）成立且值得裁決。

**1c. OQ-023 × page mode（B4）—— 這是被漏列的最強一條，應補進清單（disagree，信心 0.7）**

分析只在鏈 H 用 OQ-023 談「同 owner 的 `challenge`／`zh-TW` 專案站接手」，卻**沒有把最直接、最常見的組合列為一條**：

- page mode（GitHub Pages 的預設）複製出的是題目頁 URL：英文題為 `${origin}/challenge/<slug>/`（`shortLink.ts:114`）。
- 無偏好的學習者打開它時，`DEFAULT_VISITING_LOCALE = 'zh-TW'`（`i18n/index.ts:25`），`redirectTargetForStoredLocale` 會把未加前綴的英文路徑導到 `/zh-TW/…`（`:213`、`:220-224`），且不檢查目標是否存在。
- 若該題是英文獨有（OQ-023 2026-10-24 的重現：英文題不在 zh-TW 清單、導向打到 404），結果就是：**任何有英文獨有題目的 GitHub Pages 靶場，發給無偏好（即預設 zh-TW）學習者的 page 連結都會 302 到 404**。OQ-023 本體也寫明「independent of the deployment host, and short links reach it today too」（`OPEN-QUESTIONS.md:833`、`:844-845`）。

這比鏈 H（需要同 owner 存在名為 `zh-TW` 的 repo）**更常觸發**，而且正落在本 epic 的目標面（User Story 5 發講義連結、GitHub Pages 靶場）。**不改「不跨界」的總結論**——學習者看到的是 404，屬 B4「does not protect」已明文接受（`spec.en.md:188` 點名 D6、OQ-023）——但 chain-analysis 的候選清單與輸入盤點缺了它，應補為一條觀察（Info/P2，可用性，referencing OQ-023，verdict=已接受但須列入）。定案觀察：在一個 GitHub Pages 靶場、清空 `wxl-locale` 的瀏覽器開英文獨有題的 page URL，確認是否落到 zh-TW 的 404。

### 2. 推理與證據核對

- **讀碼驗證抽查**：鏈 A step 4、鏈 J（`config.mts`→`linkMode.ts`→page mode 預設）、B4 相關的 `shortLink.ts` 皆與引用行相符，未發現「標 讀碼驗證 但行號不支持」的情形。
- **邊界表 B3 列與證據不一致（已被 N-1 吸收，但值得點名）**：信任邊界表把 B3 寫成「Unchanged: it runs on every range and host」（`chain-analysis.md:55`，引 `spec.en.md:187`），而 V05 直接反證「every range」在剛建立、Actions 尚未啟用的 public repo 上不成立。分析在 N-1 誠實記錄了，但表格第 55 行仍原樣轉述該保證，建議在表格處加一句「V05 下不成立，見 N-1」以免表格被單獨引用時誤導。
- **盤點表漏項（低重要度）**：T-0036 的 S-1（smoke 讀真實剪貼簿、失敗時把內容印進 log，`security-T-0036.md:27-48`）與 S-2（`kill -9` 4173 誤殺其他 worktree 的 preview，`:50-64`）在盤點表的「機制摘要」欄被併成一句（`chain-analysis.md:94`），但只有 S-3 給了處置（鏈 G）；S-1、S-2 沒有明確落點。兩者都屬本機作業安全、非跨界（S-1 類似 N-7 的本機資訊曝光），不改結論，但盤點表宣稱「十份報告的全部候選」，嚴格說這兩項缺處置欄。定案觀察：在表中替 S-1／S-2 補一句「本機作業安全，非串連」即可。
- **嚴重度**：N-1 標「資安 Low／P2、AC-21 偏離交裁決（要求補驗則 P1）」是合理的；考量 B3 是 B2「does not protect」整欄與 AC-17 的唯一後盾，而 V05 讓它在一整類靶場（新建 GitHub Pages）失效，我認為這是全篇最有後果的一項，P1-if-reverify 的保留很恰當，不需下修。其餘鏈的信心分佈與證據相稱。

### 3. N-1、N-2 的可選方案與建議

**N-1（V05：B3 在新建 GitHub Pages 靶場上無後盾；AC-21 未照字面達成）**
- (a) 接受並記錄：開 ADR 或在 spec Further Notes 註記「新建 repo 的 Actions 需手動啟用，B3 在啟用前無效」。成本低；代價是老師端仍無主動提醒。
- (b) pending ticket：在 create-wxl／fork:init 的 next-step 輸出加一行「到 repo Settings → Actions 確認 workflow 已啟用，否則 guard 不會跑」；或 README 部署段補同一提醒。成本中；直接補住觀察到的缺口。
- (c) spec change：把 B3 的「runs on every range and host」改成承認「在 Actions 尚未啟用的新 repo 上，guard 於啟用前不執行」。
- **建議 (b)+(c)**：B3 是載重的後盾、而 V05 是今天實際重現的缺口（非假設），光記錄不足以讓老師察覺；同時軟化 B3 的全稱句以免下一輪 review 又把它當既有保證。AC-21 第 2 點改本機跑的偏離須由 user 明確接受或要求補驗。

**N-2（鏈 B：多 worktree 共用 `refs/stash` 的認領／drop 競態，與 upstream 平行作業衝突）**
- (a) 接受並記錄：B2 已把它列在模型外，維持現狀、零成本；代價是 upstream 自己的作業方式會常態性踩到。
- (b) pending ticket 硬化：push 的 stash 訊息帶一次性 nonce，認領前檢查 `stash@{0}` 訊息與 `^1 = HEAD`，drop 前再比對一次 id（分析已提此方向，`chain-analysis.md:157`，未驗證）。成本中高；需小心別與既有 O1–O7 契約衝突（符合全域守則第 5 條「加保證要做副作用檢查」）。
- (c) spec change：在 B2「Outside the model」明寫「upstream 平行 session／多 worktree 例外」，讓模型外前提與專案自身作法對齊。
- **建議 (c) 先行、(b) 入 pending ticket**：因為這個模型外前提正是專案自己的常態（`runtime.md:105-106`），先把 spec 與現實對齊是最便宜的收斂；nonce 守護值得排進 ticket 但要先過副作用檢查，不宜在 close-out 倉促加。

### 覆蓋限制（本挑戰）
- 無 Bash／git 工具，未能實跑 `git show 3b52e65:scripts/pre-commit.sh` 驗證鏈 B 的「非退步」歷史比較，上文已給定案觀察。
- 未逐份精讀十份報告全文；只深讀了 T-0036、T-0039 報告並抽查盤點，S-1／S-2 漏處置為該範圍內發現。
- 未執行程式、未開瀏覽器、未呼叫 GitHub；OQ-023×page mode、`docs:build` 上線 `_redirects`、Netlify/Cloudflare 讀檔行為皆為讀碼＋文件推論，已各附定案觀察。

### parent 的核對與處置（2026-10-24）

challenger 列為無法驗證的兩點，parent 跑了 git 確認：
- 鏈 B「不是退步」：`git show 3b52e65:scripts/pre-commit.sh` 的第 29 行是 `git stash push --keep-index --include-untracked --quiet -m "pre-commit: stash unstaged changes" -- platform/`，第 47 行是 `git stash pop --quiet`，也就是舊 hook 一樣只處理 `stash@{0}`。比較成立；本 epic 新增的只有 `index.lock` 上直接 drop 的分支。
- 1a 的前提：`package.json:20` 的 `"docs:build": "vitepress build"` 不跑產生器；`quality-gates.yml` 的 build job 也只跑 `pnpm docs:build`。成立。

依此處置：
- **1a 採納**：N-1 的「部署一定重新產生」限定為「部署執行 `pnpm build` 時」，也就是 GitHub Pages 範本與 README 的 Cloudflare 指令。建置指令只有 `vitepress build` 的主機，會把 commit 裡的 `_redirects` 逐字上線。總結論不變。
- **1c 採納**，新增 N-9。parent 已在暫時靶場 `CXPhoenix/wxl-e2e-0007` 重現：`wxl-locale = zh-TW` 時，打開英文 page URL `…/challenge/v05-php-check/`，會被導到 `/zh-TW/challenge/v05-php-check/` 的 404。完全沒有偏好的 profile 沒有重現，那部分是讀碼（OQ-023 的重現段落）。
- **2 採納**：B3 那一列補註 V05 的反例；盤點表補上 T-0036 S-1、S-2 的處置。

**使用者裁決（2026-10-24）**：照建議處理。N-1 開成 T-0051，並把 spec 的 B3 限定在有執行 Actions 的 repository；N-2 開成 T-0052，並在 spec 的 B2 最後一欄寫明 upstream 自己的平行 session（spec 3.3 版）。N-3～N-8 的文件修正，併進下一張碰到這些檔案的 ticket；N-9 由下一個 epic（OQ-023）處理。

V05 的 CI 條件已補驗：使用者啟用 Actions 後，空 commit `dac53b2` 觸發的 Quality Gates run `40081283163` 通過，`Run tests` 裡 `redirects-generated.test.ts` 的 10 個 case 都通過，所以 N-1 提到的 AC-21 偏離已解除。

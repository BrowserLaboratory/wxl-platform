# Stage 3 第 2 輪：紅隊審查（軸 4，R），epic 0007-gh-pages-range-fixes

**範圍：** 依凍結 prompt（blob 5cfa01c）審工作樹的 `spec.en.md`（4485a999）與 `traceability.md`（5629e8c0）。GLOSSARY.md 與 OPEN-QUESTIONS.md 的待提交變更依 round2-scope.diff 一併讀過，也參考了 round 1 的 `round-1-R.md` 與 `disposition.md`，確認第 1 輪的修法在 revision 2 是否站得住。

**對照的程式碼：** `scripts/pre-commit.sh`、`generate-redirects.ts`、`challenge-numbers.ts`、`create-challenge.ts`、`challenge-lint-staged.ts`、`package.json`（hook 安裝方式）、`shortLink.ts`、`ShortLinkShare.vue`、`ChallengeList.vue`、`MergedNav.vue`、`platform/shared/challenges.data.ts`、`.vitepress/config.mts`、`vitest.config.ts`、`playwright.site.config.ts`、`quality-gates.yml`、`tests/pre-commit-sh.test.ts`、`redirects-generated.test.ts`、`create-challenge.test.ts`、兩棵樹的 wxl-create skill（含 `SKILL.zhTW.md`）、`create-wxl/src/git-runner.mjs`、i18n messages。

**哪些是推論：** 我不能執行 git 和 bash。凡涉及 git 內部行為（`git commit -a`/`-p` 給 hook 的 `GIT_INDEX_FILE`、stash 的變更判定、commit 是否在 hook 之後才判定「沒有東西可 commit」）以及 bash 3.2 的語意，都是依原始碼與已知行為推論，沒有實測。各條分別標示可信度。

---

## R-1：觸發條件放寬後，hook 在 macOS 預設的 bash 3.2 上會因為空陣列而中斷
- **位置：** spec.en.md:105-107（觸發條件、validation 只看 `platform/challenge/`）、AC-12（:181-192）、AC-16（:201）、AC-22（:219，修復步驟）；traceability.md:201-202、H02（:307）、H07（:312）、H14（:319）、H34（:339）。程式碼：scripts/pre-commit.sh:10、:39-43；package.json:44（`"pre-commit": "bash scripts/pre-commit.sh"`）
- **違反：** O2（H02、H07、H14、H34 的預期結果都是 exit 0）、Story 2 與 Story 4。
- **證據：**
  - 直接讀到的：hook 開了 `set -euo pipefail`，validator 的呼叫是 `node … "${CHALLENGE_FILE_LIST[@]}"`；hook 的註解明說要相容 bash 3.2。hook 是用 PATH 上的 `bash` 執行的，在沒裝 Homebrew bash 的 Mac 上就是 `/bin/bash` 3.2。
  - 今天陣列一定不會是空的，因為只有 `platform/challenge/` 有變更才會走到這一行。
  - revision 2 讓 zh-TW 樹與 `_redirects` 也會觸發（D5），validation 卻仍只拿 `platform/challenge/` 的路徑，所以「只改翻譯」「只修 `_redirects`」這兩種 commit 的陣列是空的。
  - 推論（bash 4.4 以前的已知行為）：在 `set -u` 之下展開空陣列的 `"${a[@]}"`，會因為 unbound variable 讓 shell 直接結束。
  - S5 只在 CI 的 ubuntu（bash 5）上跑；Out of Scope 只排除了 Windows，沒有排除 macOS。
- **影響：** Mac 上的老師 commit 翻譯說明，或照 E1/Z1 修復過期的檔案時，commit 會被拒，而且這些情況正是本 epic 新加的觸發。stash 已經做了，所以會落到 O5 的清理路徑（見 R-3）。CI 測不出來。
- **可信度：** 機制高；實際發生取決於老師的 bash 版本。
- **等級：** P1
- **建議：**
  - 在約束寫明「沒有 `platform/challenge/` 路徑時不呼叫 validator」，或要求 hook 相容 bash 3.2 的 `set -u`。
  - S5 加一列 H02/H14 以 bash 3.2 執行；或在 Testing Decisions 寫明 macOS 的 `/bin/bash` 是受支援的環境，並在開發機上驗證。

## R-2：commit forms 規則「在 repository 自己的 index 上」無法照字面實作：`-a`、`-p`、`-i` 的 hook 跑在 `.git/index.lock` 上
- **位置：** traceability.md:214-217（Commit forms）、H31-H33（:336-338）；spec.en.md:116-117、AC-22（:215-220）、Testing Decisions S5（:253-259）
- **違反：** commit forms 規則本身，以及 H31（D5 的動機案例）。
- **證據（推論，依 builtin/commit.c 的 `prepare_index`）：**
  - 一般 `git commit`（含 `--amend`）傳給 hook 的 `GIT_INDEX_FILE` 是 `.git/index`。
  - `-a`、`-i <paths>`、`-p` 走的是「non partial, non as-is」路徑，hook 拿到的是被鎖住的 `.git/index.lock`。
  - `git commit <pathspec>`（`--only`）拿到的是 `.git/next-index-<pid>.lock`。
  - 在 linked worktree 裡，自己的 index 是 `.git/worktrees/<name>/index`。直接用 `bash` 跑 hook 時，`GIT_INDEX_FILE` 根本沒有設定。
  - 規則只說「the repository's own index」與「any other index file」，沒有定義怎麼判斷。照字面拿 `git rev-parse --git-path index` 比對的實作，會把 `-a` 和 `-p` 當成「別的 index」而拒絕，正好擋掉 H31。
  - 矩陣沒有 `-p` 那一列，也沒有 linked worktree 的列。S5 只說「directly and through `git commit`」，沒指定 H31-H33 要經由真的 `git commit` 跑；直接跑的話，`GIT_INDEX_FILE` 的語意完全沒被測到。
- **影響：** 一種實作會讓 `git commit -a` 在新增題目時永遠被拒；另一種寬鬆的實作則可能讓 pathspec commit 漏網，重現 round 1 R-2 的「真正的 index 和 HEAD 不同步」。
- **可信度：** 中高
- **等級：** P1
- **建議：**
  - 把判斷寫成可檢查的規則，例如：`GIT_INDEX_FILE` 未設定、等於 `git rev-parse --git-path index`、或等於它加 `.lock` 時，視為自己的 index；其他情況視為 partial commit。
  - 補 `-p` 與 linked worktree 的列，並規定 H31-H33 一律經由真的 `git commit` 執行。

## R-3：O5 要求「stash list as before」，但沒規定還原本身失敗時怎麼辦；照字面實作會丟掉老師的工作
- **位置：** traceability.md:198（約束：每次結束都 restore and drop）、O5（:211）、H25、H26（:330-331）；spec.en.md:108-109、AC-23（:221-224）
- **違反：** Story 3、B2（「restores … byte for byte」）。
- **證據：**
  - O5 的工作樹欄要求「every file other than `_redirects` as before」，stash 欄要求「as before」，也就是 entry 一定要被 drop。
  - H26 的情境是 `.git/index.lock` 存在。只要鎖還在，`git stash apply`、`git checkout`、`git restore` 這些會鎖 index 的還原方式同樣會失敗。實務上 VS Code 在背景跑 `git status` 也會短暫持有這個鎖。
  - 規格沒有說「還原失敗時不可 drop、要保留 entry 並印出它的 commit id」。若實作為了滿足「stash list as before」而無條件 drop，老師的未追蹤檔就只剩一個 dangling commit。
  - 第二次 Ctrl-C 打斷 trap 裡的還原，也沒有規定。
  - 推論：`git commit -a` 加上 SIGINT 時，父行程 git 會在死前刪掉自己的 `.git/index.lock`。hook 的 trap 接著拿已經不存在的 `GIT_INDEX_FILE` 做還原，git 會把它當成空 index。
- **影響：** 「cleanup on failure」這項保證剛好在最需要的順序下失效，而且失效時會造成資料遺失。
- **可信度：** 中
- **等級：** P1
- **建議：**
  - 約束加一條：只有完整還原成功後才 drop；還原失敗時保留 entry，exit 非 0，並在 stderr 印出 commit id 與復原指令。O5 的 stash 欄改成「as before, or plus the hook's own entry with its id printed」。
  - trap 執行期間忽略 INT。
  - H25 補一個 `-a` 的變體。H26 寫明鎖在還原時是否仍然存在，並規定還原不依賴 index lock，或接受上述「保留 entry」的結果。

## R-4：狀態 1 仍然混著「keygen 失敗」，P7 卻把它定成「名稱衝突」；skill 既有的選單 `2` 也和新的 exit 2 撞號
- **位置：** spec.en.md:96-104（exit 狀態）、:118-120（wxl-create）、AC-11（:178-180）；traceability.md D8（:35）、P7（:186）、C03（:290）。程式碼：create-challenge.ts:313-325；`.claude/skills/wxl-create/SKILL.md:101`、`.agents/skills/wxl-create/SKILL.md:101`、兩棵樹的 `SKILL.zhTW.md:93`
- **違反：** D8 的理由（骨架已存在時不要重問名稱），以及 P7 本身。
- **證據：**
  - 直接讀到的：keygen 失敗時，骨架與已分配的編號都留著，然後 `process.exit(1)`。spec 保留這個行為（AC-11 第一點），P7 又寫「Status 1 still means a collision」。
  - skill 對 exit 1 的處理是「re-ask the slug and re-run」，所以 keygen 失敗時，skill 會請老師換名稱，每重跑一次就多一份骨架、多消耗一個編號。在「免 Rust」那個 epic 落地之前，缺 Rust 或 wasm 是常見的 keygen 失敗原因。
  - skill 第 101 行原文是「On exit code 1 (collision), show the error and ask … to choose a different name or cancel; on `1`, re-ask the slug and re-run; on `2`, stop.」這裡的 `1`、`2` 是選單選項，不是 exit code。D8 的新 exit 2 要的處理是「created, finish by committing」，代理讀到既有的「on `2`, stop」很容易混淆。
- **影響：** round 1 R-6 的失敗模式換到 keygen 失敗這條路仍然存在，而且 P7 把它寫成了規範。
- **可信度：** 高
- **等級：** P1
- **建議：**
  - keygen 失敗改用另一個狀態碼（例如 3），或在 P7 規定 skill 要依訊息分辨「骨架已建立」與「名稱衝突」。
  - P7 的改寫要把選單選項改用字母或文字，避免和 exit code 撞號。
  - 補一列「keygen 失敗時 wxl-create 不重問名稱」。

## R-5：D7 讓網址文字先讓出寬度，但沒有下限；複製失敗時的版面又被排除，「手動選取」這條後路沒有任何 AC 守著
- **位置：** Story 7（spec.en.md:64）、AC-8（:167-174）、Out of Scope「The layout while `short_link.copy_failed` shows, which this epic does not change」（:277）；traceability.md D7（:34）、S02（:276）、S07（:281）。程式碼：MergedNav.vue:236-258（360px 時標題實測只剩 45px）；en.json:61「Copy failed — select the link shown here and copy it yourself」
- **違反：** Story 7（「so that I can select it by hand when copying fails」）。另外，Out of Scope 的理由在事實上不成立。
- **證據：**
  - S07 的不等式是「title.clientWidth ≥ min(title.scrollWidth, URL.clientWidth)」。網址文字縮到 0 寬時，這個不等式對任何標題寬度都成立。S02 只檢查「each visible URL text」，0 寬的元素在 Playwright 看來不是 visible。所以一個在手機 nav 上完全看不到網址的實作，能通過 AC-8。
  - 複製失敗的訊息請讀者「select the link shown here」，而這正是唯一需要手動選取的狀態。這時狀態文字也會占用同一列的寬度，依 D7，網址文字最先被擠掉。
  - 「this epic does not change」不成立：網址文字的尺寸規則（非 inline、可縮、比標題先縮）全是本 epic 新加的。
- **影響：** 複製失敗時（不安全的 origin、權限被拒）老師可能在手機上找不到可以選取的網址。
- **可信度：** 中
- **等級：** P1
- **建議：**
  - S07 或 S02 加上網址文字的最小可見寬度（例如至少顯示 host），或規定手機 nav 上網址文字一定 visible。
  - 把「顯示 `copy_failed` 時網址文字仍可見、可一鍵選取」納入 S03，並刪掉 Out of Scope 那句。

## R-6：D3 的「替換」通知只看工作樹與 staged 是否不同；staged 的手改版會被無聲刪除，H07、H31 還可能以 git 的「nothing to commit」收場
- **位置：** traceability.md O2（:208）、H07（:312）、H31（:336）；spec.en.md:113-115、AC-12（:189）、AC-22（:216）
- **違反：** round 1 R-10 的處置（覆寫時要通知），以及 Story 3。
- **證據：**
  - 通知條件是「If the working tree's `_redirects` differed from the staged one before the hook」。
  - 老師手改 `_redirects` 後 `git add`（H07），工作樹和 staged 相同，所以沒有通知，但 index 與工作樹都會被換成產生的內容。手改內容從磁碟上消失，只剩 dangling blob。
  - H31（`create:challenge` 之後 `-a`）也一樣：`-a` 讓 staged 等於工作樹，所以沒有通知，新題目的規則被移出工作樹。
  - 推論（git 在 pre-commit 之後重讀 index，再判斷有沒有可 commit 的內容）：H07 的手改被還原成 HEAD 的內容，或 H31 唯一的追蹤變更就是 `_redirects` 時，hook 雖然 exit 0，git 會以「nothing to commit / no changes added to commit」exit 1。老師看到的是 commit 失敗，看不到原因，新題目也仍然是未追蹤。
- **影響：** 行為本身可以接受，但沒有訊息，矩陣也只寫「O2」，沒寫 commit 實際的結局。
- **可信度：** 中
- **等級：** P2
- **建議：**
  - 通知條件改成「工作樹或 staged 的 `_redirects` 與 expected 不同」。
  - H07、H31 補上 index 等於 HEAD 時的結局，並在 stderr 提示「`_redirects` 已還原；如果你剛建立題目，記得 `git add` 它」。

## R-7：pathspec 排除 `_redirects` 之後，可能出現「precheck 說要 stash，push 卻什麼都沒存」，沒有任何一列涵蓋
- **位置：** traceability.md:195、:198、H29（:334）；程式碼：pre-commit.sh:20-30
- **違反：** 「It never applies or drops another entry」。
- **證據（推論，依 stash.c 的 `check_changes`）：**
  - `git stash push` 只要 pathspec 內有 staged、unstaged 或未追蹤的變更，就會建立 entry。
  - 今天的 precheck `git diff --quiet -- platform/` 包含 `_redirects`。
  - 當 commit 只 stage 了 `_redirects`（H07、H34），而唯一的 unstaged 差異也是 `_redirects` 時，precheck 判定「有東西可 stash」。但排除 `_redirects` 的 push 會印出「No local changes to save」，不會建立 entry。
  - 若實作在 push 之後用 `stash@{0}` 或 `refs/stash` 取得 id，拿到的會是老師原本就有的 entry，接著把它套用並 drop。H29 只有在某一列真的構成這種狀態時才抓得到，而現有的列都沒有。
- **可信度：** 中
- **等級：** P2
- **建議：**
  - 約束寫明 entry 的身分要以 push 前後 `refs/stash` 是否改變來判定。
  - 補一列：只 stage `_redirects`，且工作樹的 `_redirects` 另有不同版本，fixture 裡有既有的 stash entry。

## R-8：`refs/stash` 在 worktree 之間共用，V03 卻在開發者真實 repo 的 worktree 上第一次讓 hook 碰到真的 stash
- **位置：** AC-20 第三點（spec.en.md:208）、V03（traceability.md:371）、B2「Outside the model: Another process changing the repository during the commit」（spec.en.md:143）；docs/agents/runtime.md:105-106（平行的 ticket worktree 是既定的工作方式）
- **證據：**
  - S5 都在隔離的暫時 repo 裡跑。V03 是「a temporary worktree of the ticket branch」，和開發者的主 checkout 共用 `refs/stash` 與物件庫。hook 若有 R-7 那類 bug，會把開發者真實的 stash entry 套用到暫時 worktree，worktree 移除後那份工作就不見了。
  - 平行 worktree 同時 commit，在這個 repo 是常見情況，B2 卻把它整個放在模型之外。
- **可信度：** 中
- **等級：** P2
- **建議：** V03 改用獨立的 `git clone`；或規定 V03 前後比對 `git stash list` 並記錄下來。在 B2 寫明平行 worktree 不受保護。

## R-9：S5 只隔離 `HOME` 與 `GIT_CONFIG_GLOBAL`，沒有清掉 `GIT_DIR`、`GIT_INDEX_FILE`、`GIT_WORK_TREE`
- **位置：** traceability.md S5（:48）、H30（:335）；程式碼：tests/pre-commit-sh.test.ts:30（`env: { ...process.env }`）；create-wxl/src/git-runner.mjs:1-3（既有的先例：明說要防止外層 hook 洩漏 `GIT_DIR`/`GIT_INDEX_FILE`）
- **證據：**
  - 在 git hook 或 `git rebase -x 'pnpm test'` 底下跑 vitest 時，外層的 `GIT_INDEX_FILE` 會傳給 S5 在暫時 repo 裡執行的 git。hook 的 `git add` 和 stash 就會寫進真實 repo 的 index。
  - 新的「別的 index」判斷又直接依賴 `GIT_INDEX_FILE`，外層洩漏會讓「直接用 bash 跑」的案例看到錯的 index。
  - H30 只比對真實 repo `_redirects` 的 bytes，看不到 index 被改。
- **可信度：** 中
- **等級：** P2
- **建議：** S5 規定子行程的 env 刪掉所有 `GIT_*` 變數，沿用 create-wxl 的做法。H30 擴大到真實 repo 的 `git ls-files --stage` 與 `git stash list`。

## R-10：符號連結讓 B2、B5 的「只寫 `_redirects`、不寫 `platform/` 以外的檔案」不成立
- **位置：** B2（spec.en.md:143）、B5（:146）、traceability.md:197、:203、H24（:329）；程式碼：generate-redirects.ts:153-157（`writeFileSync` 會跟隨連結）、challenge-numbers.ts:70-77（`readFileSync` 與 `existsSync` 也會跟隨連結）
- **證據：**
  - 如果 `platform/public/_redirects` 或 `platform/public` 是 symlink（觸發條件包含型別變更），hook 與 `create:challenge` 會寫到連結指向的地方，可能在 repo 之外。之後 `git add` stage 的仍是那個 symlink，D3 也不成立。
  - 如果 `index.md` 是指向 repo 外或指向已被 stash 收走的檔案的 symlink，產生器讀到的就不是 staged snapshot 的內容。H24 的預期是「O2 or O4, by the generator's result」，結果取決於連結指向哪裡，判不出對錯。
  - `pnpm build` 今天就會這樣寫入，所以這不是新的攻擊原語；但 hook 讓它在 commit 時自動發生。
- **可信度：** 機制高，實際發生的機率低。
- **等級：** P2
- **建議：** hook 與 `create:challenge` 寫入前用 `lstat` 確認 `_redirects` 及其父目錄不是連結，是的話拒絕。H24 改成固定的預期結果，或把 symlink 的 `index.md` 列為拒絕。

## R-11：「index slugs」的定義和 guard 的 tracked-slug 規則並不相同
- **位置：** traceability.md vocabulary「index slugs」（:79）、「expected `_redirects`」（:80）、Checks 表「the same rule applied to the index」（:423）；程式碼：redirects-generated.test.ts:156-166（只認 `platform/(zh-TW/)?challenge/<slug>/index.md` 有被追蹤）
- **證據：**
  - spec 的定義是「at least one path in the index under a watched tree」，guard 要求的是 `<slug>/index.md` 被追蹤。以 submodule（gitlink）加入的題目只在 index 留下 `platform/challenge/foo` 一筆：hook 會把 foo 算進去，本機也讀得到 `foo/index.md`；CI 的 checkout 沒有 submodule 內容，guard 會把它排除，兩邊不一致。
  - 兩者都是以 slug 為單位，不是以「語系 × slug」為單位。如果英文目錄被 ignore、zh-TW 同名說明頁有被追蹤（例如被 `git add -f` 強制加入），hook 會因為 ignored 目錄沒被 stash 而納入英文規則，CI 不會。
- **可信度：** 中（實際發生的頻率低）
- **等級：** P2
- **建議：** index slugs 改成「`<tree>/<slug>/index.md` 在 index 中」，並依語系分別納入；Checks 表的說法也一併修正。

## R-12：會產生 commit 卻不跑 pre-commit 的指令，沒有列在 commit forms，也沒列在 B2 的「Does not protect」
- **位置：** traceability.md Commit forms（:214-217）、H35（:340）；B2「Does not protect」（spec.en.md:143）
- **證據（推論）：**
  - 沒有衝突、自動完成的 `git merge` 或 `git pull`，跑的是 `pre-merge-commit`，而 simple-git-hooks 只裝了 pre-commit。
  - `cherry-pick`、`rebase`、`revert` 以及它們的 `--continue`，透過 sequencer 建立 commit，也不跑 pre-commit。
  - 矩陣只有「以 `git commit` 完成解衝突的 merge」（H35）。老師從上游 `git pull`，或從另一個分支 cherry-pick 題目時，`_redirects` 可能過期，只能由 CI 抓到。
- **可信度：** 中
- **等級：** P2
- **建議：** 在 B2 的「Does not protect」與 H16 列出這些指令，交由 B3 與 E1 的修復句處理。

## R-13：JetBrains IDE 預設以 `--only -- <paths>` commit，每次碰到題目的 commit 都會被拒
- **位置：** traceability.md:216-217、H33（:338）
- **證據（推論，依我對 IntelliJ 系列不開 staging area 時行為的記憶）：** WebStorm 等工具預設把勾選的檔案以 pathspec 帶給 `git commit --only`。依新規則，只要觸發就拒絕，用這類工具的老師每次新增或修改題目都會被擋。拒絕訊息只說「stage 後不帶路徑 commit」，沒提到 IDE 裡要開 staging area。
- **可信度：** 中低
- **等級：** P2
- **建議：** 拒絕訊息補一句 IDE 的對應設定（啟用 staging area），或在 E1/Z1 的相關文件提到。

## R-14：D4 的 `preventDefault` 也會吃掉 Cmd/Ctrl-click 與 Shift-click（在新分頁或新視窗開題目）
- **位置：** D4（traceability.md:31）、L17（:252）、spec.en.md:86-88
- **證據：** 修飾鍵點擊也會觸發 `click`（button 0），在網址文字上 `preventDefault` 之後，列表那一塊就不能再用 Cmd-click 開新分頁。中鍵點擊走的是 `auxclick`，不受影響。spec 沒區分有沒有按修飾鍵。
- **可信度：** 中
- **等級：** P2
- **建議：** 只在沒有修飾鍵時才 prevent 並選取，或明列這是已接受的代價。

## R-15：`create:challenge`、hook、guard 用了三種不同的納入規則；狀態 2 的訊息因此會誤導，狀態碼也沒有在 pnpm 層被驗證
- **位置：** spec.en.md:96-104、AC-11（:180）；traceability.md C06（:293）、D8（:35）、Checks 表「`pnpm` forwards the status」（:426）
- **證據：**
  - `create:challenge` 以整個工作樹（含未追蹤與被忽略的目錄）產生，hook 只用 index slugs，guard 用已追蹤的 slug。
  - C06（工作樹有一個沒有編號的未追蹤草稿）會讓 `create:challenge` 回傳狀態 2，訊息要老師「修好樹之後 commit」。但 hook 根本不看未追蹤的草稿，新題目直接 commit 就能通過，這則訊息會讓老師先去改一個無關的草稿。
  - S4 只呼叫匯出的 entry，沒有任何 AC 觀察 `pnpm create:challenge` 實際回傳的 exit code。「pnpm 會原樣轉傳狀態碼」是未驗證的主張；若 pnpm 把它統一成 1，D8 就失效。
- **可信度：** 訊息誤導這點為中；pnpm 轉傳這點低。
- **等級：** P2
- **建議：**
  - `create:challenge` 產生時改用「已追蹤的 slug 加上這次新建的 slug」；或狀態 2 的訊息依原因分流。
  - 加一個 CLI 層的檢查，經 `pnpm` 確認狀態 2 的轉傳（在暫時 root 中執行）。

## R-16：不符 slug grammar 的目錄名仍會被產生器寫進規則，並由 hook 自動 stage；zh-TW 樹完全不經過 validator
- **位置：** L16（traceability.md:251）、:201-202；程式碼：generate-redirects.ts:111-112、challenge-lint-staged.ts:36-61
- **證據：**
  - page mode 下，不符 grammar 的 slug 不顯示控制項，但產生器照樣輸出 `/challenge/<目錄名>/`。目錄名有空白時，那一行在 Cloudflare 會被拆成錯誤的欄位。
  - 產生器本來就這樣；不同的是 hook 現在會在 commit 時自動把它 stage 進去。zh-TW 樹只觸發重新產生，不經過 validator。
- **可信度：** 中（影響低）
- **等級：** P2
- **建議：** 產生器遇到不符 grammar 的 slug 時拒絕（走 O4 或狀態 2）；或明列這是已知行為。

## R-17：`stash -u` 會刪掉未追蹤的空目錄，之後不會還原
- **位置：** O2（traceability.md:208）只談 file；B2（spec.en.md:143）
- **證據（推論）：** stash 的 clean 會移除 pathspec 內未追蹤的空目錄，git 又不記錄空目錄，所以還原後它們就不在了，例如老師先建好的 `platform/challenge/new-idea/` 空資料夾。這是既有行為，但這次觸發條件變寬了。
- **可信度：** 中低
- **等級：** P2
- **建議：** 在 B2 的「Does not protect」註明，或在 O2 寫明只保證檔案。

## R-18：G02 改了產生器的 header，每個既有靶場已提交的 `_redirects` 對新產生器而言都會過期
- **位置：** G02（traceability.md:347）、Story 9（spec.en.md:66）；0006 range-upgrade spec（升級不 commit，由老師自己 commit）
- **證據（推論）：**
  - 升級到含本 epic 的版本後，range CI 的 guard 會用新 header 比對。結果取決於升級是否把 header 的變更合併進老師的 `_redirects`，以及老師是否經由會觸發 hook 的 `git commit` 提交。
  - 若老師以 fork 加 `git pull` 升級而自動 merge 完成，pre-commit 不會執行（見 R-12）。
  - 矩陣沒有「升級進本版本的既有靶場」這一列。
- **可信度：** 低
- **等級：** P2
- **建議：** 補一列，或在 Further Notes 寫明升級後 E1 的修復步驟就是補救方法。

---

**round 1 R 系列的複查：** R-1（stash 衝突）、R-4（被忽略的目錄）、R-5（root）、R-9（commit id）、R-11、R-12、R-20、R-21 在 revision 2 的約束與列中都有對應出口，沒有發現回退。R-2、R-8、R-10、R-6 的修法本身又衍生出上面的 R-2、R-3、R-6、R-4。

**合計：P0 0、P1 5（R-1～R-5）、P2 13（R-6～R-18）。**

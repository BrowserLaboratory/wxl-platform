# Round 2：軸 3，契約衝突（K）

審查對象是 `.proj.specs/0009-npm-trusted-publishing/spec.en.md`（parent 給的 blob `1016f19…`）和 `traceability.md`（blob `cb637c8…`），在 `spec/0009-npm-trusted-publishing` 的 `6779b55`（revision 2）。程式碼基準是 `main` 的 `af4e1ac`。我讀的是 working tree 的檔案，沒有自己重算 blob hash。依凍結 prompt 執行，只審第 3 軸。round 1 的 K-1 到 K-14 處理後，下面只列 revision 2 仍然存在或新產生的衝突。

---

### K-1：O1 的前提「`create-wxl/` 不會進入靶場」不成立；GitHub fork 出來的靶場有這個資料夾，「rewrite list」的意思也被改掉了
- **位置**：traceability.md:59（O1）、:230（B3）；spec.en.md:98-106、:164-166
- **衝突的契約**：
  - `GLOSSARY.md:349`：在 GitHub 上分叉是建立靶場的一種方式。`:371` 也明寫「fork 或 clone 而來的靶場」。
  - `README.en.md:237`（記載的 fork 路徑）：fork:init "swaps the upstream GitHub URLs for yours"。
  - `.proj.specs/0004-stateless-engine/traceability.md:121-122`：rewrite list 指 fork-init 會改寫的錨點形式（A1–A5）。`0004 review/disposition.md:85`（K-1）也說 skill 的驗收「scoped to the rewrite list」。
  - `.claude/skills/wxl-fork-init/SKILL.md:85-89`：A 模式的 grep 對 rewrite list 的檔案預期零殘留，同時逐一列出 A 模式下會保留 slug 的地方。
  - `.proj.specs/0005-create-wxl/traceability.md:46`（0005-S3）："tests in `create-wxl/test/` (which exist only upstream, so need no skip)"。
- **證據**：
  - 直接讀到：`.gitattributes` 的 `export-ignore` 只影響 `git archive`。`scripts/fork-init.ts:689-700` 的排除清單沒有 `create-wxl`。O1 自己寫 "fork-init's default mode does not touch it, since `create-wxl/` never enters a range (0005 U1)"。
  - 推論：GitHub fork 會帶著整棵樹，包括 `create-wxl/`。
- **影響**：
  - 預設模式跑完 fork:init 之後，這種靶場的 `create-wxl/package.json` 還留著上游 URL，README 說會換掉所有上游網址的說法在這裡不成立。
  - O1 把這一行放進「rewrite list」，但預設模式不會改寫它。這和 0004 對 rewrite list 的定義，以及 skill 驗收的範圍互相矛盾。skill 第 89 行列出的「A 模式保留 slug 的位置」也會漏掉這一行。
  - 老師在這種 fork 裡跑 `pnpm --dir create-wxl test`，M01（url 等於根目錄 manifest 的 url）會失敗。0005-S3 說這些測試「只存在於上游，所以不用 skip」，這個前提也不再成立。
- **信心**：中高
- **請求等級**：P1
- **建議**：O1 改掉錯誤的前提，二選一：
  - 明說這一行是「只有 rebrand 模式改寫、預設模式保留」的第三類，並同步 skill 第 89 行的保留清單與 README 的說法；
  - 或者讓預設模式也改寫它。這是新的引擎決策，需要使用者確認。

### K-2：O3 讓發布 ticket「維持 `processing`」，和狀態定義及 stage 6、stage 9 的閘門衝突；而且這張 ticket 自己的 PR 會在 stage 8 之前合併，這點沒有明確宣告覆寫
- **位置**：traceability.md:61（O3(b)）、:54（D10）、:192-193（RP1、RP2）；spec.en.md:136-137、:218
- **衝突的契約**：
  - `docs/agents/issue-tracker.md:78-80`：`processing` 是實作中；`review` 是 "implementation done, in stages 6–8"；`done` 是 "landed on `main`, after the merge"。
  - `docs/adr/0002-ticket-status-in-frontmatter.md:9-10`。
  - `docs/agents/workflow.md:132`：stage 6 的入口是 "the ticket's `status` is `review`"。
  - `workflow.md:184`："Update ticket status to `done` once the change is on `main`"。
  - `workflow.md:178-180`：stage 8 紀錄寫好之前，PR 不能標記 ready。
- **證據（直接讀到）**：
  - RP1 是「發布變更合併進 `main`，由使用者合併」；RP2 在這個 merge commit 上打 tag。所以發布 ticket 自己的 PR 一定先合併，AC-7（它的 stage 8）才能開始。
  - O3 的契約欄只點名 workflow.md 的 stage 8 行號。覆寫內容只寫 "runs after the code tickets have merged"，沒寫「發布 ticket 自己的 PR 也在 stage 8 之前合併」。它也沒點名 issue-tracker.md、workflow.md:132 和 :184。
- **影響**：
  - 發布 ticket 停在 `processing`，就進不了 stage 6，因為 stage 6 的入口要求 `review`。
  - 它的變更已經在 `main` 上，照 workflow.md:184 應該是 `done`，但 O3 說它不是。
  - 它的 PR 必須在 stage 8 紀錄寫好之前標記 ready，違反 :178-180。
- **信心**：中高
- **請求等級**：P1
- **建議**：O3 明確列出被覆寫的 issue-tracker.md:78-80、workflow.md:132、:178-184，並指定發布 ticket 在每個階段的狀態。例如合併前做 stage 6–7 時是 `review`；合併後等 AC-7 時是 `review`，或改用 `pending` 加上原因。

### K-3：「guard 只豁免那一行」沒辦法沿用既有的 manifest 走訪函式；`create-wxl/package.json` 的版面不符合它在註解裡寫明的前提
- **位置**：traceability.md:59（O1）、:181（MR1）、:271（M02）
- **衝突的契約**：`tests/unit/scripts/upstream-guard.test.ts:75-81` 的註解寫明 `manifestA1UrlLines` 的前提是 "a two-space-indented JSON fixture, one key per line"。它的實作在 `:88-98`：遇到 `"key": {` 就把 key 推進堆疊，遇到只有 `}` 的一行才彈出。另外 `:133` 只有 `path === 'package.json'` 會走 manifest 分支。
- **證據**：
  - 直接讀到：`create-wxl/package.json:6`、`:8` 是同一行內的物件（`"bin": { … },`、`"engines": { … },`），只推不彈。
  - 推論：之後每個 key 的路徑都會被錯誤地加上 `bin.engines.` 前綴，`repository.url` 永遠比對不到。MR1 也沒規定 `repository` 要寫在同一行還是一行一個 key：寫在同一行時，那一行本身不會被豁免；分行寫時，路徑又是錯的。
- **影響**：實作者如果照字面把「manifest 條目」延伸到這個檔案，guard 測試會直接變紅。spec 也沒說「那一行」要怎麼認定。
- **信心**：中
- **請求等級**：P2
- **建議**：MR1 規定 `repository` 的版面（例如一行一個 key），O1 或 M02 寫明怎麼認定那一行（例如用確切的行內容比對），或要求修正走訪函式。

### K-4：DS1 和 DS2 要改的 0005 與 0006 位置列得不完整
- **位置**：traceability.md:240-241（DS1、DS2）；spec.en.md:138-144
- **衝突處（直接讀到）**：
  - `.proj.specs/0005-create-wxl/traceability.md:458`（C45 那一列）："apart from the four placeholders"。DS1 只改 listing，沒列 C45 這一列。`create-wxl/test/upstream-config.test.mjs:37` 的測試標題也寫 "four placeholders"。
  - `.proj.specs/0005-create-wxl/spec.en.md:195-196`（Out of Scope）："Requiring the release commit to be on upstream's `main`"。0009 的 U7 正好把這件事納入範圍，卻沒有對應的註記。
  - `0005 spec.en.md:198`："Publishing to npm, tagging and the GitHub release: user actions at release time, each asked first"。0009 之後改成由 CI 自動 stage、使用者核准，DS1 沒列這一行。
  - `.proj.specs/0006-range-upgrade/spec.en.md:130` 的 B2 寫 "As 0005 B2"，DS 也沒提。
- **影響**：0005 和 0006 的敘述會和 0009 互相矛盾，revision 2.4 的範圍也看不出哪些行要改。
- **信心**：中高
- **請求等級**：P2
- **建議**：DS1 補上 C45 那一列、:195-196、:198；DS2 補一條，決定 0006 spec:130 要不要加註。

### K-5：Problem Statement 和 T-0029、T-0067 的紀錄不一致
- **位置**：spec.en.md:20-25
- **衝突的紀錄（直接讀到）**：
  - `.proj.tickets/maintenance/T-0029-release-3-0-0.md:46`：3.0.0 那次 "passed X1–X9 and failed with `E404` on the upload … X9 does not check the publisher's login"。也就是說，3.0.0 時 X9 並沒有報告「名稱已被別人維護」。
  - `T-0067-release-3-1-0.md:71-74`：失效的是 "the npm login having expired"，處理方式是 `npm login`。
- **證據**：spec 寫 "Both releases … hit the same snag … X9 reported 'the npm name is already maintained by someone else'"，又說用的是 "a long-lived npm token"。
- **影響**：這段只是背景，不是規範，但它引用的是證據鏈裡的紀錄，現在的說法和紀錄對不上。
- **信心**：中高
- **請求等級**：P2
- **建議**：改寫成：3.0.0 時 X9 通過、上傳得到 E404；3.1.0 時才停在 X9。並把 token 的說法對齊「登入失效」。

### K-6：spec 對 workflow 步驟的編號和 traceability 不一致
- **位置**：spec.en.md:82-89、:198-199（AC-4）；traceability.md:168-169（W5、W6）
- **證據（直接讀到）**：
  - spec 的步驟清單有 7 項：pnpm 和 Node 合併成第 2 步，安裝 npm 是第 3 步，main 祖先檢查是第 4 步。
  - traceability 是 8 步：npm 是第 4 步，祖先檢查是第 5 步。
  - AC-4 寫 "an npm … as step four" 和 "exactly eight steps"，和 spec 自己的清單不一致。
- **衝突的契約**：traceability.md:3-4 和 spec.en.md:6 都說 spec 由 traceability 推導而來。
- **影響**：ticket 或 `release.md` 寫「第 4 步」時會指到兩個不同的步驟。
- **信心**：高
- **請求等級**：P2
- **建議**：spec 的清單改成和 W6 一樣的 8 項編號。

### K-7：W08 用行號指向現有程式碼
- **位置**：traceability.md:268（W08 的 "`trigger-branches.test.ts:61`'s comment"）
- **衝突的契約**：`docs/agents/workflow.md:54-56`："name the function, component or test, not a line number"。0004 traceability:136 也是同樣的慣例。
- **影響**：實作過程中行號會移動，W08 就會指錯地方。
- **信心**：高
- **請求等級**：P2
- **建議**：改用測試標題 "does not trigger on tag pushes" 和註解原文 "Tag-driven work belongs to release.yml"。

### K-8：編號仍然和 0005 撞名，而 DS1 會把 0009 的編號寫進 0005 的檔案
- **位置**：traceability.md:44-53（D1–D10）、:213-219（F1–F5）、:240（DS1 "X9's row (to D1's conditions)"）
- **衝突處（直接讀到）**：
  - 0005 的 `D1` 是 `prepareDist` 的失敗 id（`create-wxl/src/publish.mjs:40`，以及 `0005 traceability:345`）。
  - 0005 的決策有 D2、D3、D4（`0005 traceability:36-38`）。
  - 0005 的 stage 1 決策有 F1–F3（`:4`）；0005 的邊界有 B1–B6。
- **影響**：DS1 照字面把 "D1's conditions" 寫進 0005 時，D1 在那個檔案裡指的是 prepareDist 的檢查。round 1 的 K-11 只處理了 P、N、R、S 的撞名。
- **信心**：中
- **請求等級**：P2
- **建議**：寫進 0005 時一律加上「0009 的」前綴，或在 DS1 裡寫明這個規則。

### K-9：新詞彙和 pipeline 用語撞名，GLOSSARY 也沒有交代
- **位置**：traceability.md:74-85（Vocabulary）；spec.en.md:218-221（AC-7 同一句裡同時出現 "Stage 8" 和 "stages successfully"）
- **衝突的契約**：
  - `AGENTS.md:30-31`：替任何東西命名前先讀 GLOSSARY，新增或改變詞彙時在同一個變更裡更新 GLOSSARY。
  - `docs/agents/domain.md:47`。
  - AGENTS.md 的 Pipeline 表和 workflow.md 都用 "stage N" 指 pipeline 階段。
- **證據**：vocabulary 定義了動詞 "stage"，以及 approve、reject、trusted publisher、publish gate 等詞。D01/D02 沒有更新 GLOSSARY 的要求，也沒有宣告「npm 用語不屬於 GLOSSARY 的範圍」。
- **影響**：`release.md` 和 ticket 裡的 "stage" 有兩種意思；之後翻成中文時也沒有依據。
- **信心**：中低
- **請求等級**：P2
- **建議**：一律寫 "stage on npm" 或 "npm stage"；並明說這些詞不進 GLOSSARY，或在同一個變更裡補進去。

### K-10：D6 說「沒上 npm 的 tag 仍算上游發布版」，GLOSSARY 和 README 的用詞跟著有歧義
- **位置**：traceability.md:49（D6）；spec.en.md:134-135
- **衝突的契約**：
  - `GLOSSARY.md:385`（設定紀錄）：「紀錄裡的那一版必須是上游發布過的版本」。
  - `README.en.md:203`："When upstream publishes a new release, run `pnpm range:upgrade`"。
- **證據**：
  - D6 只對齊了 ADR-0009（以 tag 判定）。
  - 照 F3，被拒的 `v<V>` 有 tag，release.yml 也照樣建了 GitHub Release，但 npm 上永遠沒有這個版本，而升級的目標版本是從 npm 取得的（ADR-0009:34-35）。
- **影響**：「發布」在 GLOSSARY 和 README 裡同時可能指「打 tag 的 release」或「npm 上的版本」。老師會看到一個 GitHub Release，`range:upgrade` 卻升不到它。
- **信心**：中低
- **請求等級**：P2
- **建議**：D6 或 DS2 給 GLOSSARY:385 加註：「發布過」以上游 tag 為準。並決定 README 要不要說明這種落差。

### K-11：AC-7 依靠使用者在瀏覽器頁面上的回報；擴充 OQ-022 會改掉它原本的問題
- **位置**：traceability.md:61（O3(c)）、:242（DS3）、:275-277（S8-02～S8-04）
- **衝突的契約**：
  - `docs/agents/workflow.md:149-155`：能用瀏覽器到達的介面要由 agent 用瀏覽器工具取得證據；做不到時，那條準則就是未驗證，相依的閘門維持阻擋。
  - `workflow.md:167-168`：非瀏覽器的 harness 要記成 ADR 或 OQ。
  - `OPEN-QUESTIONS.md:838`（OQ-022 的標題是「packed package 的終端機執行」）、`:849`（"for these two epics only"）。
- **證據**：npm 的 Staged Packages 頁面和設定頁是瀏覽器介面，AC-7 用的是使用者回報。0009 的 harness 是 Actions run 的結論、使用者回報和 registry 讀取，不是 OQ-022 問的「終端機跑 packed package」。O3 沒有宣告覆寫 workflow.md:149-155。
- **影響**：把 OQ-022 的範圍延伸過來，等於偷偷換掉它的問題。「以使用者回報作為 stage 8 證據」也沒有登記下來。
- **信心**：中低
- **請求等級**：P2
- **建議**：新開一則 OQ，記錄「使用者回報 npm 頁面加 registry 讀取」這個 harness；O3 明確覆寫 workflow.md:149-155。

### K-12：RP2 只推單一 tag、而且要先確認，和使用者全域指示的 release 寫法不一樣
- **位置**：traceability.md:193（RP2）、:239（R2 字串 `git push origin v<V>`）
- **衝突處**：使用者的全域 CLAUDE.md「Release」段寫的是 `git tag` 加 `git push --tags`，並要求「自動、額外執行」。這不在凍結 prompt 列出的契約範圍內，所以信心低。
- **影響**：agent 同時載入兩份指示時，可能用 `--tags` 推出所有本機 `v*` tag，每一個都會觸發 stage；也可能不等確認就推。U3 和 R-10 的用意是限制這兩件事。
- **信心**：低
- **請求等級**：P2
- **建議**：R2 要求 `release.md` 明寫：本 repo 只推單一 tag、先取得確認，並且優先於通用的 `--tags` 寫法。

### K-13：MN2 的 GitHub 一次性設定沒有出現在 CONTRIBUTE.md 宣告的位置
- **位置**：traceability.md:205（MN2）、:239（R2）
- **衝突的契約**：`CONTRIBUTE.md:334`：Maintainer Setup "documents one-time GitHub configuration that lives outside the repo"。
- **證據**：U5 決定把發布流程放進 `release.md`，但 R2 和 D01 都沒要求 CONTRIBUTE 加一行連結。
- **影響**：照 CONTRIBUTE 的 Maintainer Setup 設定 repo 的人，找不到 `npm` environment 的 tag 規則。
- **信心**：低
- **請求等級**：P2
- **建議**：在 CONTRIBUTE 的 Maintainer Setup 加一行指向 `release.md` 的 MN2，或在 spec 裡記錄不加的理由。

### K-14：F3 被拒之後，tag 和 GitHub Release 要怎麼處理沒有寫；先例是兩者都刪掉
- **位置**：traceability.md:49（D6 "A tag is never moved"）、:217（F3）
- **衝突處（直接讀到）**：
  - `T-0029-release-3-0-0.md:45`：先例是在上 npm 之前，把 `v3.0.0` 的 tag 和 GitHub Release 都刪掉。
  - `ADR-0009:31-33`：刪掉 tag 會讓升級停在 CW-E07。
- **證據**：D6 只禁止移動 tag，沒說可不可以刪。F3 也沒交代 release.yml 已經建好的 GitHub Release 怎麼處理。
- **影響**：agent 可能照 T-0029 的先例把東西刪掉，這和 D6「仍算上游發布版」互相矛盾。
- **信心**：中低
- **請求等級**：P2
- **建議**：F3 寫明：tag 不刪不動，GitHub Release 保留或加上標記。

---

**有查過、沒發現衝突的：**
- K2、K3 用 `UPSTREAM_SLUG` 做精確比對，和 `tests/__helpers__/upstreamDecision.ts` 一致；publish 原始碼本身不會寫出 slug。
- W2 的 `format()` 寫法和 `release.yml:19`、0004 T71 一致；W08 的「`format` 共出現六次」也算對（三個 `if:`、三個 `env:`）。
- self-check 有記錄 `WXL_EXPECT_UPSTREAM` 的例外；0004 T71 只列舉了既有的 job，沒有要求每個 upstream-only job 都設它。
- `toolchain-parity.test.ts:13-20` 管的是建置 artifact 的 workflow，0009 不改它，不衝突。
- rebrand 的 `sensitiveRenames`（`fork-init.ts:840-847`）不會碰到 `publish-npm.yml` 和 MR1 那一行；slug 互換之後，M01 在 rebrand fork 裡仍然成立。
- O1 到 O4 引用的位置都核對過：0004 traceability:117-130、0005 traceability:56-57、workflow.md:88-91/:160-162/:178-180、0005 spec:204。DS1 列的 0005 spec 行號（:79-82、:119、:204、:213-214）也正確。
- RP1 和 RP4 符合硬規則 5（`AGENTS.md:79`）；OQ-019 維持 open 也有寫明。
- Charter、ADR-0001～0008 都沒有衝突。ADR-0009 那邊，D6 已經寫明以 tag 判定。
- README 的 fork 路徑（N5 推 `v0.1.0`）在 fork 裡會被 `if:` 跳過，和 user story 6 一致。

**計數**：P0 0、P1 2、P2 12

相關檔案：
- /Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0009-npm-trusted-publishing/traceability.md
- /Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0009-npm-trusted-publishing/spec.en.md
- /Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/upstream-guard.test.ts
- /Users/phoenix/dev/browserlab/wxl-platform/create-wxl/package.json
- /Users/phoenix/dev/browserlab/wxl-platform/docs/agents/issue-tracker.md
- /Users/phoenix/dev/browserlab/wxl-platform/docs/agents/workflow.md
- /Users/phoenix/dev/browserlab/wxl-platform/.claude/skills/wxl-fork-init/SKILL.md
- /Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0005-create-wxl/traceability.md
- /Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0005-create-wxl/spec.en.md
- /Users/phoenix/dev/browserlab/wxl-platform/.proj.tickets/maintenance/T-0029-release-3-0-0.md
- /Users/phoenix/dev/browserlab/wxl-platform/.proj.tickets/maintenance/T-0067-release-3-1-0.md

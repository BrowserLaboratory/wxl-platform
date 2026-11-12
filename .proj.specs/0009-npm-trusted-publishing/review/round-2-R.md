# Round 2 審查報告：紅隊（軸 4）

審查對象：`.proj.specs/0009-npm-trusted-publishing/spec.en.md`（parent 提供的 blob `1016f19f`）與 `traceability.md`（blob `cb637c82`），位於 `spec/0009-npm-trusted-publishing` 分支的 `6779b55`（revision 2）。被修改的程式碼以 `main` 的 `af4e1ac` 為準。我讀的是 working tree。這次我沒有 Bash 工具，所以無法自己重算 blob hash 來確認 working tree 等於這兩個 blob；這一點以 parent 提供的資訊為準。

依 frozen prompt `review/prompt.md` 執行，沒有改動任何檔案。

實際讀過的檔案：
- 上述兩份 spec 檔，以及 `review/prompt.md`、`round-1-R.md`、`disposition.md`；
- `docs/agents/review.md`、`runtime.md`；
- `create-wxl/src/publish.mjs`、`publish-io.mjs`、`upgrade.mjs:320-380`；
- `create-wxl/scripts/check-publish.mjs`、`prepare-dist.mjs`；
- `create-wxl/package.json`、`create-wxl/test/upstream-config.test.mjs`；
- `.github/workflows/release.yml`、`quality-gates.yml`；
- `tests/unit/workflows/upstream-only-jobs.test.ts`、`fork-template-parity.test.ts`；
- `tests/unit/scripts/upstream-guard.test.ts`；
- `scripts/fork-init.ts`：imports、`transformText`、A1 manifest 編輯，以及 `sensitiveRenames`；
- `.gitattributes`、`docs/adr/0009-*`（grep）、`T-0067-release-3-1-0.md`；
- 兩份 `.proj.research/2026-11-11-*` 筆記；
- 專案的 `/tw-emoji-release-note` SKILL.md（grep）。

我沒有使用網路。凡是依賴 GitHub 或 npm 行為、而 spec 沒有引用的地方，都在信心度裡註明。

---

### R-1 主幹祖先檢查與 gate 都寫在被 tag 的 commit 自己的 workflow 裡，不是控制；B1 把威脅縮成「main 上的 commit」，RP5 也沒有可以抓到它的比對項

- **位置**：spec.en.md:87（步驟 4，U7）、spec.en.md:153-155（B1 Does not protect）、spec.en.md:114-115；traceability.md:38（U7）、traceability.md:154（`git merge-base --is-ancestor HEAD origin/main`）、traceability.md:193（RP2）、traceability.md:196（RP5 (c)）、traceability.md:228（B1）、traceability.md:300-301（self-check）
- **違反的要求**：B1 宣告的保護範圍；D8 對「guard」和「control」的區分（X9 已經被明確標成 guard，U7 卻沒有）
- **證據**：
  - 直接讀到的：B1 的「Does not protect」只寫「pushes a `v*` tag at a commit on `main` carrying a changed workflow or code」。RP5 (c) 拿頁面上的 commit 去比 `git rev-parse v<V>^{commit}`。
  - 推論（GitHub 行為，spec 沒有引用，信心高）：`push` 事件執行的是「被推送的 commit 裡的」workflow 檔。所以只要有 push 權限（包括 RP2 的 agent），就能推一個不在 `main` 上、沒經過 PR 和 CI 的 commit。這個 commit 裡的 `publish-npm.yml` 可以拿掉第 5 步和第 7 步，再打上 `v*` tag 推上去。
  - MN2 只限制「必須是 `v*` tag」。MN1 依研究筆記第 15 行，不比對 ref 和 commit。所以這次 run 會成功 stage。
  - RP5 擋不住：(b) 這次 run 是 success；(c) 頁面上的 commit 一定等於這個 tag 的 commit，比對是恆真式；(d) 的 shasum 也來自同一次 run。
- **影響**：
  - U7 的祖先檢查容易被當成控制，但它只能防誤操作。
  - B1 低估了攻擊面：不在 `main` 上的 commit 也能被 stage。
  - 使用者在 RP5 做完四項比對，仍然分辨不出「tag 打在未合併的 commit 上」。B1 自己點名的情境，例如 agent 被 prompt injection，正是走這條路。
- **信心度**：高
- **建議等級**：P1
- **建議修法**：
  - RP2 的「使用者確認」改成同時確認 tag 名稱和 RP1 那個 PR 的 squash merge commit SHA。
  - RP5 加一項 (e)：頁面或 run 的 commit 等於 RP2 確認的那個 SHA。另外由使用者在 job 之外，自己在本機跑 `git merge-base --is-ancestor <sha> origin/main`。
  - B1 改成「at any commit」。self-check 註明 U7 和 X9 一樣是 guard（D8）。
  - 可另外考慮用 GitHub ruleset 限制誰能建立 `v*` tag（見 R-7）。

### R-2 MN2（environment 的 tag 規則）在 stage 8 沒有任何驗證，而且少了它不會讓任何 run 失敗

- **位置**：traceability.md:205（MN2）、traceability.md:215（F1「MN1 or MN2 missing or expired」）、traceability.md:277（S8-04 只列 MN1、MN3）；spec.en.md:119-121、spec.en.md:227-228（AC-7）
- **違反的要求**：U2，也就是 round 1 R-1 的修法；D8 列出的控制「the environment's tag rule (MN2)」
- **證據**：
  - 直接讀到的：S8-04 和 AC-7 只要求引述 MN1 的六個欄位、token 撤銷結果和 MN3 的選項文字，MN2 不在其中。
  - 推論（GitHub 行為，信心高）：workflow 引用一個不存在的 environment 時，GitHub 會自動建立它，而且沒有任何保護規則。所以如果漏做 MN2，S8-01 照樣成功，不會留下任何訊號。
  - F1 把「MN2 missing」列成失敗原因，但缺少 MN2 其實永遠不會造成失敗。只有設錯（例如把 `v*` 設成 branch 規則）才會失敗。
  - 順序：MN1 的時機是「tag 前 2 天內」，MN2 只寫「tag 前」，所以 MN1 可能先完成。在這段期間，trusted publisher 已經生效，environment 卻還沒有限制。任何分支推送，或同一個 repo 的 PR 在被改過的 workflow 裡加上觸發條件，都能 stage。
- **影響**：round 1 R-1 補上的控制可能根本不存在，而沒有人會發現。
- **信心度**：高（spec 內容）；GitHub 自動建立 environment 這點，信心高
- **建議等級**：P1
- **建議修法**：
  - S8-04 加入使用者對 MN2 頁面的回報：「Selected branches and tags」、只有一條類型為 tag、樣式為 `v*` 的規則、沒有 reviewer。沒有這份回報，AC-7 不算通過。
  - MN2 必須在 MN1 之前完成。
  - F1 改成「MN2 設錯」，不要寫「missing」。

### R-3 RP1 用 release-note skill，可能觸發 agent 環境裡「產生 release note 後自動打 tag 並 `git push --tags`」的全域指示，和 RP2 互相衝突

- **位置**：traceability.md:192-193（RP1、RP2）、traceability.md:239（R2）；spec.en.md:110-111
- **違反的要求**：RP2「only after the user confirms」「at the merge commit」「pushes that tag alone」
- **證據**：
  - 直接讀到的：RP1 指定用 `/tw-emoji-release-note` 產生 CHANGELOG 條目。這一步發生在 release 分支上、PR 合併之前。
  - 這個環境的 Claude Code 使用者層級全域指示（Release 段落）要求：拿到 release-note skill 的輸出之後，要「自動、額外」執行 release 動作。它列出的選項包括建 tag 加 `git push --tags`，或把條目寫進 CHANGELOG 後 commit/push。
  - 專案的 skill 本身不會打 tag（我 grep 過 SKILL.md）。但 spec 和 R2 都沒有明說 RP1 只寫 CHANGELOG，也沒有明說 RP2 覆寫「自動」和「`--tags`」。
- **影響**：如果 agent 在 RP1 照全域指示行事：
  - 它可能在未合併的 commit 上打 tag，並推送所有本機 `v*` tag，包括為了測 X3 而在本機建立的零散 tag。
  - `release.yml` 沒有祖先檢查，會用未合併的程式碼建立 GitHub Release。
  - `publish-npm.yml` 會在祖先檢查失敗（F2）。依 D6，tag 不能移動，這個版號就燒掉了；而且依 ADR-0009，這個 tag 會永久算作上游 release。
- **信心度**：文字衝突，信心高；agent 實際會不會這樣做，信心中
- **建議等級**：P1
- **建議修法**：
  - `release.md` 的 RP1 明寫：skill 只用來產生 CHANGELOG 條目，這一步不建立也不推送 tag。
  - RP2 明寫：它覆寫任何「自動打 tag」或「`git push --tags`」的指示，並在推送前用 `git tag -l 'v*'` 和 `git ls-remote --tags origin` 核對。
  - R2 加入字串「never `git push --tags`」。

### R-4 RP5 的核准清單沒有包含「`release.yml` 已成功」，F4 的條件不在使用者實際照做的清單上

- **位置**：traceability.md:196（RP5 (a)-(d)）對照 traceability.md:218（F4）；spec.en.md:114-115 對照 spec.en.md:133
- **違反的要求**：F4「No approval until `release.yml` succeeds」
- **證據**：RP5 寫「approves with 2FA only if all hold」，四項都只和 `publish-npm.yml` 有關。F4 的條件只寫在 D6 的表裡。
- **影響**：使用者照 RP5 操作，可能在 `release.yml` 還在跑或已經失敗時就核准，結果 npm 版本出去了，GitHub Release 和 asset 卻沒有。
- **信心度**：高
- **建議等級**：P2
- **建議修法**：RP5 加一項：「`release.yml` 對 `v<V>` 的 run 以 success 結束」。

### R-5 如果 Staged Packages 頁面在核准前一個 (c) 欄位都不顯示，RP5 就沒辦法把 staged entry 綁回那次 run

- **位置**：traceability.md:196（RP5 最後一句）、traceability.md:242（DS3、OQ-027）；spec.en.md:284
- **違反的要求**：B1「Nothing becomes installable without … approval after RP5's comparison」
- **證據**：spec 把頁面會顯示什麼列為未知數。如果答案是「都不顯示」，RP5 只剩 (a)、(b)、(d)。這時本機 `npm stage publish`（B2 的缺口）或另一次 run 產生的 entry，都無法和合法的 entry 區分。spec 沒有寫這種情況下的替代觀察方式。
- **影響**：B1 最後一道人工防線可能完全失去辨識能力，而流程照樣「通過」。
- **信心度**：低到中（取決於 npm 的 UI）
- **建議等級**：P2
- **建議修法**：在 RP5 定義替代方案，例如由使用者以互動登入執行 `npm stage list` 或 `npm stage view <id>`，比對 shasum 或 integrity。替代方案也無法比對時，規定先 reject，並在 OQ-027 記下來。另外，MN3 之後互動 session 還能不能執行 `npm stage view`，也要記成未知數。

### R-6 RP5 只看 `<V>` 的 entry，其他版號的零散 staged entry 沒有處理，也沒寫「tag 已經存在」時怎麼辦

- **位置**：traceability.md:196（RP5 (a)）、traceability.md:193（RP2）、traceability.md:217（F3）
- **違反的要求**：B1 的意圖，也就是只核准由確認過的 run 產生的版本
- **證據**（推論）：
  - 有 push 權限的人可以搶先推 `v<V+1>`，stage 出下一個版號。等維護者真正發布 `V+1` 時，RP2 的 `git push origin v<V+1>` 會因為 tag 已經存在而被拒絕。
  - 如果先前已經 stage 的 entry 還在，RP5 (a) 會看到兩筆。F3 寫「The user rejects it」，在兩筆的情況下要拒絕哪一筆並不清楚。
  - spec 沒有規定：看到不是自己預期的 staged entry，就要立即 reject 並調查。
- **影響**：會造成版號被占用或混淆，也有核准錯誤 entry 的機會。
- **信心度**：中
- **建議等級**：P2
- **建議修法**：
  - RP5 (a) 改成「Staged Packages 上整體只有一筆 entry」。任何非預期的 entry 一律 reject，並記錄下來。
  - RP2 加上：遠端已經有 `v<V>` 時停止，回報使用者，不可以 force push。

### R-7 「Tags are never moved」只是程序約定，GitHub 端沒有強制

- **位置**：spec.en.md:134-135；traceability.md:49（D6）
- **違反的要求**：D6，以及 ADR-0009「checked through upstream's own tag」所依賴的 tag 不變性
- **證據**（推論）：
  - spec 沒有要求設定 repository ruleset 來禁止刪除或更新 `v*` tag，也沒有限制誰能建立 `v*` tag。
  - 如果 tag 被刪掉再推到另一個 commit：`publish-npm.yml` 和 `release.yml` 會重新執行；若舊的 entry 還在等待核准，就會出現第二筆 entry；若已經核准，ADR-0009 的 UP-E12 會讓所有從 `range.json` 取 base 的升級停下來（ADR-0009:31）。
- **影響**：MN2 的 tag 規則和 RP5 的比對，前提都是 tag 不會變。這個前提沒有被強制。
- **信心度**：中
- **建議等級**：P2
- **建議修法**：新增使用者步驟 MN7：建立 tag ruleset，目標是 `v*`，限制建立者，並禁止刪除和 non-fast-forward。在 S8-04 引述這份設定。

### R-8 `concurrency` 遇到第三個 run 時，會取消正在等待的那一個；F5 的描述不完整，表裡也沒有「cancelled」這個結局

- **位置**：traceability.md:131-133、traceability.md:219（F5）；spec.en.md:77-78
- **違反的要求**：F5「queues it; it does not cancel the running one」，以及 self-check 宣稱 F1-F5 涵蓋所有情況
- **證據**（GitHub 文件行為，spec 沒有引用，信心中高）：同一個 concurrency group 最多只有一個 running 和一個 pending。新的 run 進來時，原本 pending 的那個會被 cancel。
- **影響**：
  - 連續推兩個以上的 tag，或者在某次 run 執行中又 re-run 另一個 tag 時，中間那個 tag 的 run 會變成 cancelled，從頭到尾都沒有 stage。
  - F1 寫的是「failed」，cancelled 不屬於任何一列，agent 不知道能不能 re-run。
- **信心度**：中高
- **建議等級**：P2
- **建議修法**：F5 改寫成「pending 的 run 會被更新的 run 取代」，並把「cancelled、沒有 staged entry」歸入 F1 可以 re-run 的情況。RP2 明定一次只推一個 tag，等前一個 run 結束後才推下一個。

### R-9 F1／F2 的分界有重疊：網路原因造成的 X6 失敗，和缺少 `origin/main` 造成的祖先步驟失敗，都會被當成 repo 內部原因

- **位置**：traceability.md:215-216（F1、F2）、traceability.md:309-311（self-check「partition」）；`create-wxl/src/publish.mjs:213-231`（X6 的 `ls-remote` 只要非 0 結束就丟 `X6`）
- **違反的要求**：D6 的分類，以及 self-check「F1–F5 partition the failures」
- **證據**：
  - 直接讀到的：X6 遇到網路錯誤時，丟的是 `PublishError(['X6'])`，在 gate 步驟裡看起來就是一個 gate check 失敗。F2 把「a gate check … failing」歸為 repo 內部原因，F1 則把「network error」歸為外部原因。
  - 推論：如果 checkout 沒有帶來 `origin/main`，`git merge-base` 會以 128 結束，而不是 1。依 F2，這要出下一個 patch，但下一個 patch 會以同樣的方式失敗，變成一直燒版號的迴圈。我推測 checkout 在 `fetch-depth: 0` 時會抓所有分支，所以這個情況機率低。
- **影響**：可能白白燒掉版號，也可能讓 agent 違反 F2 去 re-run。
- **信心度**：中
- **建議等級**：P2
- **建議修法**：
  - F1 和 F2 改成依失敗訊息分類：X6 的 log 顯示 `ls-remote` 是網路錯誤時，歸 F1。
  - 祖先步驟改成區分 exit 1 和其他結束碼，或先跑 `git rev-parse --verify origin/main`。
  - self-check 刪掉「partition」的全稱說法。

### R-10 trusted publisher 過期與重建：stage-only 的設定可能每次都過期，而重建後的設定沒有再驗證

- **位置**：traceability.md:204（MN1）、traceability.md:209（MN6）、traceability.md:221-222、traceability.md:277（S8-04）；spec.en.md:119-125、spec.en.md:285
- **違反的要求**：D8 指定 MN1 是控制。round 1 R-4 修法的意圖是「控制的實際設定要被驗證」。
- **證據**（推論）：
  - trusted publisher 只允許 stage。如果 npm 只把直接 `npm publish` 算作「first successful publish」，這個設定永遠拿不到一次成功的 publish，每次建立後兩天就會過期。
  - 那麼之後每一次 release 都會先在 F1 失敗，再走 MN6 重建。
  - S8-04 只驗證第一次的六個欄位。之後每次重建，都可能誤勾 direct publish 或漏填 environment，而沒有人發現。
- **影響**：主要控制在重建時可能悄悄被放寬。
- **信心度**：低到中（npm 的計算方式未知，spec 已承認）
- **建議等級**：P2
- **建議修法**：`release.md` 規定：每次 RP2 之前，使用者確認 MN1 的設定存在而且沒有過期；每次 MN6 重建時，都要重新回報六個欄位，並記錄在該次 release ticket。

### R-11 spec 說「fork 的 rebrand 之後 manifest 測試仍然通過」，這個保證不成立

- **位置**：spec.en.md:105-106；traceability.md:59（O1「which keeps M01 true」）、traceability.md:307；`scripts/fork-init.ts:1210`、`scripts/fork-init.ts:1216-1218`；`create-wxl/test/upstream-config.test.mjs:43`、`upstream-config.test.mjs:65`；`.github/workflows/quality-gates.yml:303`、`quality-gates.yml:339-340`
- **違反的要求**：O1 和 spec 對 fork 狀態的保證
- **證據**：
  - 直接讀到的：rebrand 模式會無條件把根目錄的 `version` 設成 `0.1.0`。C45 要求 create-wxl 的 `version` 等於根目錄的 `version`，M01 又包含「the rest of C45 unchanged」。所以 rebrand 之後，M01 一定會因為版本不同而失敗，跟 URL 有沒有一起被改寫無關。
  - 預設的 anchor 模式在第一次轉換時，同樣會改根目錄的 version 和 `repository.url`，但不會改 `create-wxl/package.json`。所以在有 `create-wxl/` 的 GitHub fork 裡，M01 會因為兩個原因失敗。
- **影響**：低。create-wxl 的測試只在 upstream-only 的 CI job 裡跑。但 spec 寫了一個不成立的保證，而且 anchor 模式的 fork 裡，`create-wxl/package.json` 會繼續指向 upstream，spec 沒有說明這是不是刻意的。
- **信心度**：高
- **建議等級**：P2
- **建議修法**：把那句改成「fork 的 create-wxl 測試本來就不成立（C45 的 version），本 epic 不改變這一點」，並記下 anchor 模式下這一行保留 upstream URL 屬於預期行為。

### R-12 guard 的豁免最直接的實作方式，會比 O1 規定的範圍更寬

- **位置**：traceability.md:59（O1「`repository.url` only」）、traceability.md:271（M02）；`tests/unit/scripts/upstream-guard.test.ts:82-103`、`upstream-guard.test.ts:133-135`
- **違反的要求**：O1「The guard exempts exactly one line」
- **證據**：
  - 直接讀到的：現有的 `manifestA1UrlLines` 會一次豁免 `repository.url`、`bugs.url`、`homepage` 三個欄位，而且只套用在 `path === 'package.json'`。
  - 推論：最省事的實作是把 `isManifest` 擴大到 `create-wxl/package.json`，這樣三個欄位都會被豁免。
  - M02 的 fixture 只寫「any other line」，沒有指定要包含 `bugs.url` 和 `homepage`，所以擋不住這個放寬。
- **影響**：以後如果有人在 create-wxl 的 manifest 加上 `bugs` 或 `homepage`，帶有 slug 也不會被 guard 發現，confinement 悄悄變寬。
- **信心度**：中
- **建議等級**：P2
- **建議修法**：M02 的 fixture 明列：`bugs.url` 和 `homepage` 兩行帶 slug 時都必須被回報；豁免只認 `repository.url` 這個路徑。

### R-13 B1 對「誰能在 job 裡要求 OIDC token」的列舉不完整

- **位置**：spec.en.md:156-157；traceability.md:228（「narrows that to create-wxl's runtime dependencies and the repository's code」）；workflow 形狀 traceability.md:144-155
- **違反的要求**：B1 敘述的精確度
- **證據**（推論）：
  - `id-token: write` 是 job 層級的權限，所以在 gate 和 staging 之前，job 裡的每個 step 都能要求 token。
  - 這些 step 會載入的程式碼包括：三個 pinned action 的程式碼、`pnpm/action-setup` 下載的 pnpm、setup-node 下載的 Node，以及第 4 步從 registry 安裝的 npm CLI。這些都不屬於「create-wxl runtime dependencies 或 repo 的程式碼」。
- **影響**：registry 本身在威脅模型之外，所以這主要是敘述過頭。但讀者會低估同一個 job 裡的供應鏈面積。
- **信心度**：中
- **建議等級**：P2
- **建議修法**：B1 改成「job 裡執行的所有程式碼，包括三個 action、pnpm、npm CLI、create-wxl 的 runtime 相依套件和 repo 的程式碼，都能要求 token；`--prod --ignore-scripts` 只排除 devDependencies 和 install scripts」。

### R-14 F3 reject 之後，tag 和 GitHub Release 都還留著；如果 reject 的理由是「commit 可疑」，就會留下公開的可疑產物

- **位置**：traceability.md:217（F3）、traceability.md:49（D6）；spec.en.md:132-135；`.github/workflows/release.yml:87-92`
- **違反的要求**：F3 的意圖，也就是被拒絕的內容不會到達老師手上
- **證據**：
  - 直接讀到的：`release.yml` 在任何 `v*` tag 上都會建立 GitHub Release 並上傳 `wxl-v<V>.zip`。
  - F3 只說 reject 和出下一個 patch。D6 規定 tag 不移動，而且算作上游 release。
  - 推論：在 R-1 的情境下，可疑 commit 建出來的網站 zip 會一直公開在 Releases 上。`--from <V>` 也可以拿這個 tag 當 base。
- **影響**：被 reject 的內容仍然可以從其他管道取得。
- **信心度**：中
- **建議等級**：P2
- **建議修法**：F3 分成兩種情況。「不符」只 reject。「疑似未授權」則再刪除 GitHub Release；tag 是否刪除交給使用者決定，並把它明確記成 D6「tag 不移動」的例外。

### R-15 「被 reject 的 tag 永遠不 re-run」只是程序約定，self-check 的「never matters」依賴它成立

- **位置**：traceability.md:217（F3）、traceability.md:309-311（self-check）；`T-0067-release-3-1-0.md:76`
- **違反的要求**：self-check 的全稱說法
- **證據**：
  - 任何有 write 權限的人，都能在 Actions 頁面按 re-run。
  - T-0067:76 有記錄：對一個已經 staged 的版本再執行一次 `npm publish`，npm 回 `409 … previously staged version`。這顯示 npm 很可能會拒絕重複 stage，可以緩解問題。但 reject 之後的版號會怎麼處理，仍然未知。
- **影響**：低。npm 很可能會擋下來。
- **信心度**：低
- **建議等級**：P2
- **建議修法**：self-check 改成「依賴程序，且 T-0067 的 409 顯示 npm 可能會拒絕；reject 之後的版號能否重用仍然未知」，並把它列入 Unknowns。

### R-16 RP5 (d) 是循環比對，而且「run log 會印出 shasum」沒有列在未知數裡

- **位置**：traceability.md:196（RP5 (c)、(d)）；spec.en.md:281-286（Not in npm's documentation）
- **違反的要求**：RP5 作為獨立檢查的意圖
- **證據**：
  - (d) 要使用者確認「run log 的 shasum 等於 agent 回報的值」，但 B1 已經把 agent 列為可能推 tag 的一方。(c) 已經由使用者直接比對頁面和 run log，(d) 沒有增加任何獨立的保證。
  - `npm stage publish` 會不會像 `npm publish` 一樣印出 `shasum`，spec 沒有引用來源，也沒有列入未知數。
- **影響**：低。可能只是多一個流程步驟；如果 log 不印 shasum，(c) 的 shasum 這項就失去比對來源。
- **信心度**：中
- **建議等級**：P2
- **建議修法**：刪除 (d)，或改成由使用者自己開 run log 來讀。把「stage 的 log 是否印出 shasum」列入 Further Notes 的未知數。

---

我檢查過、沒有發現問題的項目：

- **script injection**：W6 規定第 4～8 步的 `run` 逐字固定，裡面沒有任何 `${{ }}`，所以 tag 名稱或 ref 不會被展開進 shell。`name:` 是自由文字，但不會被執行。
- **XM 印出的值**：值經過 `JSON.stringify`，換行和 ESC 等控制字元都會被跳脫，訊息維持一行，也不會造成終端機注入。K4 只有在值全是空白時才會印出，不會洩漏 request URL。其餘值都不是機密。
- **K3 擋住別名 tag**：同一個 commit 上的 `v3.2.0-rc` 會因為 `GITHUB_WORKFLOW_REF` 不符而停在 K3。K2 大小寫不符時，job 會跑但 gate 失敗，屬於 fail-closed。
- **tag 在核准後被移動**：`npm create wxl` 會檢查 archive 的 comment 等於 `source.json` 的 commit，升級則有 UP-E12（ADR-0009:31），兩者都是 fail-closed。
- **`--prod` 是否足夠**：`scripts/fork-init.ts` 只 import `node:*` 和 `yaml`，gate 沒有用到 devDependency。
- **憑證與快取**：`persist-credentials: false`；W7 禁止 cache；setup-node 設了 `package-manager-cache: false`；runner 是全新的，pnpm store 是空的。環境層級的 secrets 和 vars 不會自動注入 env，而 W7 禁止 `secrets.` 和 `vars.`。
- **fork 與 archive**：fork 會被 `if:` 跳過；`.gitattributes:6` 讓 `/create-wxl` export-ignore。
- **CI 上的 checkout 形狀**：X3 用 `^{commit}`，X6 比對遠端，所以就算 checkout 把 annotated tag 變成 lightweight 也不影響。
- **升級的 target**：取自 npm 套件的 source record（`upgrade.mjs:335`），所以只存在 tag、沒有發到 npm 的版本，不會成為升級的 target。

合計：P0 0 項、P1 3 項（R-1～R-3）、P2 13 項（R-4～R-16）。

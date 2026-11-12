# Round 1 審查報告：紅隊（軸 4）

審查對象：`.proj.specs/0009-npm-trusted-publishing/spec.en.md`（blob `37699a58`）、`traceability.md`（blob `9bf66b53`），在 `spec/0009-npm-trusted-publishing` 分支的 `2a3cde8`。被修改的程式碼以 `main` 的 `af4e1ac` 為準。讀的是 working tree。

我實際讀過的檔案：上面兩份檔案；frozen prompt；`docs/agents/review.md`、`runtime.md`；`create-wxl/src/publish.mjs`、`publish-io.mjs`；`create-wxl/scripts/check-publish.mjs`、`prepare-dist.mjs`；`create-wxl/package.json`、`.gitignore`；`create-wxl/test/upstream-config.test.mjs`；`.github/workflows/release.yml`、`quality-gates.yml`；`tests/unit/workflows/upstream-only-jobs.test.ts`；`scripts/fork-init.ts`（`UPSTREAM_SLUG`、`EXCLUDED_DIRS`、`transformText`、`walkTextFiles`）；`.gitattributes`；兩份 `.proj.research/2026-11-11-*` 筆記；根目錄 `package.json` 的 `packageManager`（`pnpm@10.28.0`）。

我沒有網路。凡是依賴 npm 或 GitHub 行為、但 spec 沒有引用的推論，都在信心度裡註明。

---

### R-1 environment `npm` 沒有部署規則：不必推 tag，任何 ref 都能 stage

- **位置**：spec.en.md:90-95（B1）、spec.en.md:158（Out of Scope：「deployment-tag rules on it」）；traceability.md:145（N2）、traceability.md:153（B1）
- **違反的要求**：B1 宣稱的「Does not protect」範圍（只有「push a `v*` tag at a commit carrying a changed workflow」），以及 D3「the only publisher」
- **證據**：
  - 直接讀到的：研究筆記 `.proj.research/2026-11-11-npm-trusted-publishing.md:15` 列出 npm trusted publisher 的欄位，只有 owner、repository、workflow filename、environment、allowed actions，沒有 ref。
  - 直接讀到的：N2 寫「GitHub creates it on first use if absent」，等於這個 environment 沒有任何 deployment branch/tag policy。Out of Scope 也明確排除了 deployment-tag rules。
  - 推論（依 GitHub Actions 行為）：`push` 事件使用的是被推送 commit 裡的 workflow 檔。所以有 write 權限的人可以推一個「分支」，把 `publish-npm.yml` 改成 `on: push`（任何分支）或加上 `workflow_dispatch`，保留 `environment: npm` 與 `id-token: write`。這樣拿到的 OIDC token，`workflow_ref` 是 `.../publish-npm.yml@refs/heads/x`、environment claim 是 `npm`，完全符合 N1 的設定，就能 stage 任意內容。完全不需要 `v*` tag。
  - 推論：同 repo 分支開的 PR（`pull_request`）也是同樣情況。fork PR 理論上拿不到 `id-token: write`，但這是 GitHub 的行為，spec 沒有引用。
- **影響**：B1 低估了攻擊面。可以 stage 的不只是「推了 `v*` tag 的人」，而是任何有 push 權限、能推任何 ref 的人或 bot。這會和 R-2、R-3 疊加：被 stage 的版本可以用跟正在發布的版本相同的 `<V>`，讓維護者核准錯的那份。
- **信心度**：中高。GitHub 用 pushed commit 的 workflow 檔，信心高；npm 不比對 ref，依研究筆記列出的欄位推論，信心中高。
- **建議等級**：P1
- **建議修法**：在 N2 加一條：environment `npm` 的「Deployment branches and tags」設成只允許 tag `v*`（這不是 reviewer，不違反 Q4）。也可以再加 repository ruleset，限制誰能建立 `v*` tag。把 Out of Scope 裡的「deployment-tag rules」移入範圍，並改寫 B1 的「Does not protect」。

### R-2 P4 的「checked」沒有定義，而 spec 自己說核准是唯一的檢查

- **位置**：traceability.md:136（P4）、traceability.md:153（B1「approval (P4) is the only check」）、traceability.md:188（S02）；spec.en.md:75-76、spec.en.md:94-95
- **違反的要求**：B1 把整個信任邊界的最後防線交給 P4，但 P4 沒有可執行的判準
- **證據**：P4 只寫「The staged version is checked (`npm stage list`, the Staged Packages tab) and approved with 2FA」。S02 只驗證「shows create-wxl `<V>`」，沒有規定要比對什麼，才能分辨合法的 staged entry 與以下三種：R-1 攻擊者 stage 的同號版本、R-5 re-run 造成的重複 entry、R-8 本機 stage 的版本。
- **影響**：攻擊者或意外產生的 staged entry 只要版本號相同，維護者照 P4 的字面操作就會核准。核准是唯一的控制，判準卻不存在，這個控制就形同虛設。
- **信心度**：「spec 缺判準」這點信心高。Staged Packages 頁面在核准前能不能顯示 provenance、commit 或 run id，npm 文件沒寫，研究筆記也沒記，信心低。
- **建議等級**：P1
- **建議修法**：在 P4 列出要核對的項目：
  - `<V>` 只有一個 staged entry；
  - 該 entry 的來源 commit 等於 tag 的 commit，ref 是 `refs/tags/v<V>`，run 是這個 tag 的 `publish-npm.yml` run；
  - tarball 的 integrity 或 shasum 等於 run log 印出的值。

  如果 npm 在核准前看不到這些資訊，就記成 open question，並在 B1 承認這個限制。

### R-3 B1 的補救「核准自己建立的 tag」和 P2 由 agent 建 tag 互相矛盾

- **位置**：spec.en.md:74-75（D7「the agent tags `v<V>` at the merge commit and pushes it」）對照 spec.en.md:94-95（「The maintainer therefore approves only a version whose tag they made」）；traceability.md:134（P2，Who = agent）對照 traceability.md:153
- **違反的要求**：B1 的補救措施在 spec 自己的流程下無法執行
- **證據**：兩處原文直接衝突。照 P2，維護者從來不建 tag，「whose tag they made」這個條件永遠不會成立，等於沒有檢查。另外，用維護者的 Git 憑證推 tag 的 agent，本身就是 B1 所說「a person with push access」的一種。例如被 prompt injection 誘導的 agent，可以在一個 workflow 被改過的 commit 上打 tag。
- **影響**：B1 唯一的人為補救沒有可操作的定義。
- **信心度**：高
- **建議等級**：P1
- **建議修法**：二選一。一是改由維護者自己推 tag。二是把條件改成可核對的事實，例如「tag 指向 `main` 上 release PR 的 squash merge commit」，再加上 R-2 的 provenance 比對。B1 也要點出 agent 是推 tag 的一方。

### R-4 N1 的實際設定是主要控制，stage 8 卻不驗證

- **位置**：traceability.md:144（N1）、traceability.md:187-191（S01-S05）；spec.en.md:127-134（AC-7）
- **違反的要求**：D8 指定 N1 是控制（「npm's trusted publisher configuration (N1) and "disallow tokens" (N3) are the controls」），但 AC-7 只引述了 N3（S04）
- **證據**：研究筆記第 16 行寫 npm 設定「Case-sensitive, not validated on save; cannot be edited」；environment 欄位是 optional；allowed actions 可以另外勾選 direct publish 和 dist-tag。S01-S05 都沒有一列去記錄 N1 實際填了什麼。
- **影響**：如果 N1 誤勾了 direct publish，或 environment 留白，R-1 的任何一條路都能直接發布，完全不經核准。如果是留白 environment，連 R-1 提議的 environment 部署規則也會失效。現在這種情況在 stage 8 不會被發現。
- **信心度**：中高
- **建議等級**：P1
- **建議修法**：新增一列 S（或併入 S04），讓使用者回報 N1 的六個欄位，紀錄直接引述，而且必須包含「allowed actions：只有 stage」與「environment：`npm`」。

### R-5 D6 允許 re-run，但沒排除「已 stage 或已 reject」的情況，self-check 的「答案無關緊要」不成立

- **位置**：spec.en.md:81-83（D6）；traceability.md:31（D6）、traceability.md:138（P6）、traceability.md:191（S05）、traceability.md:208-209（self-check）
- **違反的要求**：D6 保證「neither moved nor reused」；self-check 寫「D6 never reuses it, so the answer does not matter」
- **證據**：
  - 推論：維護者 reject 了 `v3.2.0` 的 staged 版本，改出 3.2.1。之後有人（或照「re-run is allowed」行事的 agent）去 re-run `v3.2.0` 的 job。tag 沒有移動，所以 X3、X6 照樣通過，K3 也成立，於是被 reject 的內容又被 stage 一次。這正是「reuse」。npm 是否允許，正是 self-check 說「不重要」的那個未知數。
  - 推論：S05 舉的「N1 missing」是在 staging 這一步才失敗（gate 已經通過），不是「before staging」。如果上傳在伺服器端成功、但 client 端逾時，依「outside the repository」的理由 re-run，就會產生同一個 `<V>` 的第二個 entry，回到 R-2 的問題。
  - workflow 沒有設 `concurrency`，也沒有任何機制擋住重複 stage。re-run 權限是有 write 權限的人都有。
- **影響**：一個已經被拒的版本可能重新進入核准佇列；同一個版本號可能同時有多份 staged entry。
- **信心度**：「re-run 會重新 stage」這個 Actions 的機制，信心中高；npm 對 reject 過的版本號怎麼處理是未知數。
- **建議等級**：P1
- **建議修法**：D6 和 P6 改成「只有在 run log 證明 `npm stage publish` 沒有執行、或執行後失敗，而且 `npm stage list` 沒有該版本時，才可以 re-run」，並明定被 reject 的 tag 永遠不 re-run。workflow 加上 `concurrency: { group: publish-npm, cancel-in-progress: false }`。刪掉 self-check 第 208-209 行的「does not matter」。

### R-6 整個 job 都拿得到 OIDC 能力，而 job 裝了用不到的 devDependencies

- **位置**：traceability.md:93-107（workflow 形狀）、traceability.md:117（W6）；spec.en.md:59-66
- **違反的要求**：最小權限，以及 B1「only a job of … can stage」實際的意思
- **證據**：
  - 推論（GitHub 行為）：`id-token: write` 是 job 層級的權限，`ACTIONS_ID_TOKEN_REQUEST_URL` 和 `ACTIONS_ID_TOKEN_REQUEST_TOKEN` 對同一個 job 的每個 step 都可見。
  - 會在這個 job 裡執行的程式碼有：`pnpm --dir create-wxl install` 裝進來的完整樹，包含 devDependency `vitest`（直接讀到 `create-wxl/package.json:14-16`），而 gate 根本用不到它；gate 會 import `yaml`、`tar` 和 repo 自己的程式碼；以及 `npm stage publish` 執行時的 lifecycle scripts。
  - 緩解因素：pnpm 10.28（根目錄 `package.json:17`）預設不執行相依套件的 build scripts。但 spec 沒有把這點寫成規則，以後有人加上 `onlyBuiltDependencies` 就會失效。
- **影響**：任何一個被汙染的相依套件，只要在這個 job 裡被載入，就能要求 OIDC token，換到 npm 的短效憑證，再 stage 任意內容。而且這份內容會帶著 upstream 的有效 provenance，在 P4 無法和合法版本分辨（見 R-2）。
- **信心度**：中
- **建議等級**：P2
- **建議修法**：改成 `pnpm --dir create-wxl install --frozen-lockfile --prod`（或加 `--ignore-scripts`）。或者拆成兩個 job：沒有 `id-token` 的 job 跑 gate 並 `npm pack`，再把 tarball 交給只有 `id-token` 的 job 去 stage。npm 文件是否支援 `npm stage publish <tgz>`，需要先確認。

### R-7 W7／W07 只檢查 step，job 層和 workflow 層的 `env:` 可以偷渡 token

- **位置**：traceability.md:118（W7「No step references …」）、traceability.md:181（W07「every step's text and `with`」）；spec.en.md:119-120（AC-4）
- **違反的要求**：D3「uses no secret and no token」；Q2「only CI publishes」由 OIDC 負責
- **證據**：W07 的觀察範圍只有 step 的文字和 `with`。如果在 workflow 頂層或 job 層寫 `env: NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`，W07 的測試照樣通過。`vars.` 也不在禁止清單裡。
- **影響**：測試無法擋下一個悄悄退回 token 發布的回歸。在 N3 之前，npm 可能改用 token，而不走 OIDC。
- **信心度**：「測試有這個缺口」信心高；「npm 會優先用 token」是推論，信心中。
- **建議等級**：P2
- **建議修法**：W07 改成對整個檔案做原始文字掃描（`secrets.`、`vars.`、`NODE_AUTH_TOKEN`、`NPM_TOKEN`、`_authToken`），並明定 workflow 頂層與 job 層都不能有 `env:`。

### R-8 B2 的守衛可以被繞過：`--ignore-scripts`，以及從終端機 `npm stage publish`

- **位置**：spec.en.md:96-97（B2）、spec.en.md:37-38（User Story 3）、spec.en.md:169-170；traceability.md:154（B2）、traceability.md:203-205（self-check「a local publish never reaches npm」）
- **違反的要求**：self-check 的全稱宣告；User Story 3
- **證據**：
  - 直接讀到的：X9 只透過 `prepublishOnly` 執行（`create-wxl/package.json:19`）。
  - 推論：`npm publish --ignore-scripts` 會跳過 `prepublishOnly`，X1-X9 全部不跑。
  - spec 自己在第 169-170 行承認不知道 `npm stage publish` 會不會跑 `prepublishOnly`。如果不會，維護者在終端機執行 `npm stage publish`，在 N3 之前用 token、在 N3 之後用 2FA 互動登入，就能從一個沒經過 X1-X8 檢查、甚至不乾淨的工作樹 stage 出一個版本，還會被當成正常的 staged entry。
- **影響**：一份本機 stage 的版本出現在 Staged Packages，維護者可能以為是 CI 產生的而核准（接 R-2）。self-check 寫「never reaches npm」的說法過頭了。
- **信心度**：`--ignore-scripts` 跳過 `prepublishOnly`，信心高；`npm stage publish` 的 lifecycle 是未知數；N3 是否也擋 2FA 互動的 stage，信心低。
- **建議等級**：P2
- **建議修法**：B2 的「Does not protect」補上 `--ignore-scripts` 和本機 `npm stage publish`。self-check 改成有限定的說法。P4 的判準（R-2）必須能排除不是 CI 產生的 entry。

### R-9 N3 之前的 token 窗口，以及 N3 之後「只有 CI 發布」並沒有被強制

- **位置**：traceability.md:146（N3「after the first staged version is approved」）；spec.en.md:27-28、spec.en.md:79-80
- **違反的要求**：Problem Statement 指出 token 外洩的風險；Q2「Disable tokens, CI only」
- **證據**：
  - 舊 token 要到第一次核准之後才撤銷。如果第一次 CI 發布一直依 D6 走 next patch 循環，這個窗口可以無限延長。staging 本身不需要 token，spec 裡也找不到「在 N1 時就撤銷 token」會出問題的理由。
  - 推論：「Require 2FA and disallow tokens」擋的是 token。維護者用 2FA 互動執行 `npm publish --otp`（搭配 `--ignore-scripts`）仍然可以直接發布，跳過 staging。這可能屬於「npm 帳號 admin 不在威脅模型內」，也就是刻意的取捨，但 spec 沒有寫明。
- **影響**：token 外洩的窗口比必要的更長；「只有 CI 發布」只是慣例，不是控制。
- **信心度**：中
- **建議等級**：P2
- **建議修法**：把「撤銷舊 token」提前到 N1；「disallow tokens」維持在第一次核准之後，或者也一起提前。在 B1 或 Out of Scope 明說維護者用 2FA 互動直接發布是接受的殘餘風險。

### R-10 沒有任何檢查確保被 tag 的 commit 在 `main` 上或通過了品質檢查

- **位置**：spec.en.md:67-69（D5）、traceability.md:134（P2「at the merge commit」）；`create-wxl/src/publish.mjs:156-231`（X3、X6 只比對「tag 等於 HEAD」）
- **違反的要求**：P2 的前提「at the merge commit」只是程序上的約定
- **證據**：
  - 直接讀到的：X3 和 X6 只確認 tag 指向 HEAD。gate 不檢查 HEAD 是否 reachable from `main`，`publish-npm.yml` 也不跑 create-wxl 自己的測試，不依賴 `quality-gates` 或 `release.yml` 的結果。
  - 推論：全域規則要求 release 時用 `git push --tags`。如果 agent 在 PR merge 之前就在分支 commit 上建了本機 `v<V>`，這個 tag 會被一起推上去，gate 會通過，結果 stage 出未合併的 commit。
- **影響**：會 stage 出沒有經過 review 或品質檢查的 commit，只能靠 P4 擋下（又回到 R-2、R-3 的問題）。
- **信心度**：中
- **建議等級**：P2
- **建議修法**：在 workflow 裡加一步（或一個 X 檢查），確認 tag 的 commit 是 `origin/main` 的祖先。P2 改成只推單一 tag（`git push origin v<V>`），不用 `--tags`。

### R-11 `npm stage publish` 會透過 `prepack` 在 gate 之後重建 `dist/`

- **位置**：traceability.md:105-107、traceability.md:117（W6）；`create-wxl/package.json:18`（`prepack`）；`create-wxl/src/publish.mjs:74-76`（`prepareDist` 會先刪掉 `dist/`）
- **違反的要求**：D5 的意圖，也就是 gate 檢查的就是要發布的產物
- **證據**：推論（npm 的 publish lifecycle）：pack 時會跑 `prepack`，也就是重新執行 `prepare-dist.mjs`，把 X8 剛驗過的 `dist/` 和 `LICENSE` 刪掉再重寫。進入 tarball 的是「gate 之後重新產生」的檔案。目前的輸入（HEAD、`fork-init.ts`、同一個 Node）是確定的，所以實際內容應該相同。
- **影響**：目前影響低。但 gate 檢查的對象和最後送出的對象不是同一份。如果 `npm stage publish` 也跑 `prepublishOnly`，gate 會跑兩次，這點無害。
- **信心度**：中（npm 是否對 stage 跑 lifecycle，文件沒寫）
- **建議等級**：P2
- **建議修法**：在 spec 寫明這是依賴輸出確定性的已知行為。或者先 `npm pack` 再 gate，然後 stage 那個 tarball（接 R-6 的拆 job 方案）。

### R-12 AC-7／S03 只驗證 provenance「存在」，沒有驗證它指向哪裡

- **位置**：spec.en.md:130-131、spec.en.md:41-42（User Story 5）；traceability.md:137（P5）、traceability.md:189（S03「`dist.attestations` present」）
- **違反的要求**：User Story 5「pointing at upstream's repository and commit」
- **證據**：S03 只檢查欄位存在。依 R-1 從分支 stage 出來的版本也會有 upstream 的有效 attestation，差別只在 ref 和 commit。
- **影響**：stage 8 無法發現「核准了錯的 entry」。老師的驗證方法也沒有寫下來。
- **信心度**：中
- **建議等級**：P2
- **建議修法**：S03 改成「attestation 的 source repository、ref（`refs/tags/v<V>`）、commit 等於 tag，workflow 是 `publish-npm.yml`」，並指定觀察方法（例如 `npm audit signatures` 或解析 attestation）。

### R-13 fork-init 的 rebrand 模式會改寫新增的 `repository` URL

- **位置**：traceability.md:125（R1）；`scripts/fork-init.ts:689`（`EXCLUDED_DIRS` 不包含 `create-wxl`）、`scripts/fork-init.ts:1165`（`next.split(UPSTREAM_SLUG).join(args.repo)`）、`scripts/fork-init.ts:1722-1729`（`walkTextFiles`）
- **違反的要求**：setup module 的寫入白名單，也就是 R1 帶來的新目標沒有評估過
- **證據**：直接讀到的：rebrand 模式會對每個沒被排除的文字檔取代 `UPSTREAM_SLUG`。目前的 `create-wxl/package.json` 裡沒有 slug 字面值，R1 加入之後才有。在 GitHub fork（有 `create-wxl/` 目錄）裡執行 `pnpm fork:init --rebrand`，就會把它改成 fork 的 slug。
- **影響**：對發布沒有直接風險（fork 的 job 會被跳過，npm 設定也只認 upstream）。但 fork 在本機跑 `pnpm --dir create-wxl test` 時 M01 會失敗（`UPSTREAM_SLUG` 來自 SELF_EXCLUDE 的 `fork-init.ts`，不會被改），而且這是一次 spec 沒有預期的寫入。
- **信心度**：「會被改寫」信心高；實際影響低。
- **建議等級**：P2
- **建議修法**：決定這是刻意的（fork 的 manifest 本來就該指向自己）還是要排除。把決定記進 R1 或 B3，必要時在 fork-init 的排除清單加上 `create-wxl/`。

### R-14 `actions/checkout` 預設會把 `GITHUB_TOKEN` 留在 `.git/config`

- **位置**：traceability.md:97
- **違反的要求**：最小權限
- **證據**：推論：checkout 預設 `persist-credentials: true`，之後每個 step 都讀得到這個 token，包括 npm lifecycle 和相依套件的程式碼。它的權限只有 `contents: read`，repo 又是公開的，所以影響極小。X6 用的 `ls-remote` 走的是公開 URL，不需要這個憑證。
- **信心度**：中
- **建議等級**：P2
- **建議修法**：在 workflow 形狀和 W6 裡加上 `with: persist-credentials: false`。

### R-15 N1 的兩天期限和 D6 的 next-patch 循環之間的順序問題

- **位置**：traceability.md:144（N1 的時機）、traceability.md:31（D6）、traceability.md:191（S05）
- **違反的要求**：P6 與 N1 的時間保證
- **證據**：如果第一次 run 因為 repo 內的原因失敗，D6 要求改出下一個 patch。準備這個 patch 很可能超過兩天，屆時 N1 已經失效，下一次 run 會在 staging 這一步失敗。spec 沒有寫要重建 N1，而且 npm 的設定不能編輯，只能刪掉重建。另外，研究筆記說的是「first successful publish」，staging 算不算這裡的「publish」並沒有記錄。如果不算，而核准又晚於兩天，設定也可能失效。
- **影響**：流程可能卡住，或被誤判為「outside the repository」而一再 re-run（接 R-5）。這個失敗是 fail-closed，不構成安全漏洞。
- **信心度**：低到中
- **建議等級**：P2
- **建議修法**：在 N1 和 P6 加上「N1 失效時，刪除後重建，再 re-run 或推下一個 tag」的步驟。把「staging 算不算第一次成功發布」記成未知數。

### R-16 trusted publisher 是用名稱綁定，org 或 repo 改名會留下 repojacking 殘餘風險

- **位置**：traceability.md:144、traceability.md:155（B3）、traceability.md:157-158
- **違反的要求**：B1 和 B3 的「names upstream only」
- **證據**：研究筆記列出的設定欄位是 owner 和 repository 的名稱字串。推論：如果 `BrowserLaboratory` 這個 org 改名或被刪除，別人就可能註冊同名 org 並建立 `wxl-platform`，加上 `publish-npm.yml` 和 environment `npm`，滿足 N1。npm 是否也比對 repository id，文件沒有說。
- **影響**：攻擊者可以 stage 版本，但還是需要核准。這主要是讓 R-2 的混淆更容易發生。
- **信心度**：低
- **建議等級**：P2
- **建議修法**：在 release 段落或 B3 加一句：org 或 repo 改名、轉移之前，先刪除 N1。

### R-17 W5 和 W7 的供應鏈與快取覆蓋不完整

- **位置**：traceability.md:116（W5）、traceability.md:118（W7）
- **違反的要求**：W7 宣稱「nothing from an earlier run reaches the package」
- **證據**：
  - `npm install --global npm@<exact>` 只固定版本號，沒有 integrity，由 runner 內建的舊版 npm 去抓。registry 本身不在威脅模型內，所以這點只是記錄。
  - W7 的快取清單只列了 setup-node 的 `cache` input、`actions/cache` 和 `rust-cache`。推論：較新的 setup-node 有依 `packageManager` 自動啟用快取的行為（需要用 `package-manager-cache: false` 關掉）；`pnpm/action-setup` 有沒有快取選項，我無法確認。這兩點都沒有被 W07 涵蓋。
- **影響**：W07 測試通過，不代表真的沒有快取。
- **信心度**：低
- **建議等級**：P2
- **建議修法**：W7 改寫成正面的規定，例如 setup-node 明確設 `package-manager-cache: false`，`pnpm/action-setup` 只允許列出的 input。

### R-18 `npm stage list` 需要傳統驗證，和「不再保留 token」互相拉扯

- **位置**：traceability.md:42（0009-S4）、traceability.md:136（P4）、traceability.md:188（S02）；spec.en.md:33-34（User Story 1）
- **違反的要求**：User Story 1「no longer keep or renew an npm token on my machine」
- **證據**：研究筆記第 14 行寫「Stage list/view/approve/reject cannot use OIDC tokens」，所以 agent 在 S02 用 `npm stage list` 驗證時，機器上必須有一個 npm 登入或 token。N3 之後又要撤銷 token。
- **影響**：流程可能誘使維護者在機器上保留一個長效 token，只為了讓 agent 能列出 staged 版本，這又重新引入 Problem Statement 想消除的風險。
- **信心度**：低到中
- **建議等級**：P2
- **建議修法**：S02 改成以 Staged Packages 頁面為主要觀察面，由使用者回報；或者明定只能用 `npm login` 的短效 session，用完就登出。

---

我另外檢查過、沒有發現問題的項目：

- **K2 大小寫**：K2 是精確比對，`if:` 是不分大小寫比對。兩者不一致時，結果是 job 會跑、但 gate 失敗，屬於 fail-closed。
- **tag 型態**：`v*` 會匹配到非 `x.y.z` 的 tag（例如 `v3.2.0-rc.1`），但 X2、X3 會擋下。
- **由 `GITHUB_TOKEN` 建立的 tag**：例如 `release.yml` 的 action 建的 tag，不會觸發其他 workflow。
- **fork 的 job**：會被 `if:` 跳過，npm 也不認 fork 的 repository。
- **`.npmrc`**：根目錄和 `create-wxl/` 都沒有，不會改變 registry。
- **create-wxl 的下載來源**：用的是 codeload 上 tag 的封存檔（`create-wxl/src/run-shared.mjs:50`），不依賴 `release.yml` 的 asset。
- **X9 訊息印出的 env 值**：只是值，沒有機密資料。

合計：P0 0 項、P1 5 項（R-1 到 R-5）、P2 13 項（R-6 到 R-18）。

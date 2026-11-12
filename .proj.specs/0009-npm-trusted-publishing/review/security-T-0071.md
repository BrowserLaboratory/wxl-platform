# T-0071 安全審查（第 7 階段）

- **Skill**：專案的 `.claude/skills/security-review/SKILL.md`（明確讀檔載入）。
- **Workflow**：`wf_62398c34-002`。候選由一個 `harness-reviewer` 找出，每個候選再交給另一個獨立的 `harness-reviewer` 判定是否誤報。
- **範圍**：
  - checkout `/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0071/publish-workflow`；
  - base `c1e535f`（T-0070 的 tip），HEAD `c14c99a`（`dac0b20`、`c14c99a`）。
  - 本審查與第 6 階段在同一個快照上同時進行，第 6 階段之後的修正另外檢查（見文末）。
- **依據**：spec 0009 的 Solution、D3、D5、D8、B1～B3、Out of Scope，以及 traceability 的「The workflow」（W1～W8）、RP0～RP7、MN1～MN7、F1～F7。本票不涉及題目，ADR-0005 不適用。

## 結論

11 個候選全部被獨立審查判定為誤報（嚴重度 none），本票沒有需要修正的安全發現。這些判斷都來自讀程式碼與 spec，沒有在 GitHub Actions 上執行。

其中兩項確實值得做 hardening，只是在 spec 的威脅模型下不算缺陷：

- **C1**：修正需要改 spec 逐字規定的 W6、W12，交給 epic close-out 的串連分析。
- **C11**：屬於測試品質問題，已在第 6 階段一起修正。

## 候選與處置

| # | 候選（候選審查者的嚴重度／信心） | 獨立判定（嚴重度／信心） | 理由摘要 |
|---|---|---|---|
| C1 | 祖先檢查寫的是 `origin/main`，同名的 tag `refs/tags/origin/main` 依 git 的解析順序會蓋過 remote-tracking ref，使 U7 guard 失效（low／0.7） | 誤報（none／0.7） | 機制屬實：checkout `fetch-depth: 0` 會抓所有 tag，而 MN7 只限制 `v*`。但 D8 規定祖先檢查是防誤操作的 guard，不是 control。要繞過它，需要有 write 權限的人預先埋 tag，**而且**上游自己在 RP2 確認錯的 SHA。被 stage 的仍然是上游自己選錯的 commit，還要通過 RP5 的比對與 2FA。改用 `refs/remotes/origin/main` 可以消除歧義，但 W6、W12 是逐字規定，需要修訂 spec |
| C2 | 第 4 步從 registry 安裝 npm CLI，沒有 integrity 鎖定，在 guard 與 gate 之前就拿得到 OIDC（low／0.5） | 誤報（none／0.85） | traceability 明列「the registry serving `npm@<x.y.z>`」在威脅模型之外。B1 也已接受 job 裡的 npm CLI 能請求 OIDC token |
| C3 | pnpm 依 `packageManager: pnpm@10.28.0` 下載，沒有 `+sha512` 鎖定（low／0.45） | 誤報（none／0.85） | 要替換已發布版本的 tarball，必須先攻破 registry，同樣在威脅模型之外 |
| C4 | OIDC 請求憑證對 job 的每一步都可見，gate 與 `npm stage publish` 的 prepack／prepublishOnly 會執行 repository 與執行期相依的程式（low／0.85） | 誤報（none／0.85） | GitHub Actions 無法只把 `id-token: write` 給單一步驟。B1 的「Does not protect against code in the job」逐項列出了這些程式；拆 job 已列入 Out of Scope |
| C5 | gate 檢查第一次建置，實際上傳的是 `prepack` 重新建置的 `dist/`（TOCTOU）（low／0.55） | 誤報（none／0.85） | 兩次建置的輸入相同（HEAD 的引擎、根 manifest、`git rev-parse HEAD`、`LICENSE`），輸出也相同。spec 的 Further Notes 已記錄「The package is built twice」 |
| C6 | `--ignore-scripts` 不涵蓋 `.pnpmfile.cjs`、`publishConfig`、套件層級的 `.npmrc`（low／0.45） | 誤報（none／0.85） | 要讓這些檔案出現在被 tag 的 commit，必須有上游的 push 權限，B1 已接受這種情況。最後仍有 RP5 的 commit 比對 |
| C7 | 安全性依賴 repo 外的設定（MN7、MN2、MN1）；`environment: npm` 不存在時，GitHub 會自動建立一個沒有保護規則的 environment；`if:` 不限制事件或 ref（low／0.45） | 誤報（none／0.85） | 這正是 spec 的設計（D8：control 都在 repo 外）。依 D10，T-0073 之前不推任何 tag，而且 MN2 在 MN1 之前，所以第一次執行前 environment 已有 tag 規則。這個順序要在 T-0072 的 `release.md` 寫清楚 |
| C8 | 祖先檢查只確認 commit 曾在 `main` 上，以執行當下的 `origin/main` 為準（low／0.3） | 誤報（none／0.85） | U7、W12 規定的就是這個行為；commit 是否為上游要發布的那一個，由 RP2 與 RP5 確認 |
| C9 | 有特權的 job 沒有 timeout；concurrency 讓較新的 pending run 取消較舊的 pending run（low／0.3） | 誤報（none／0.85） | job 卡住並不會讓攻擊者得到更多控制；W8 封閉了鍵的集合。F5 與 RP2 的「一次一個 tag」已處理 concurrency |
| C10 | `node-version: 24` 與 `ubuntu-latest` 會浮動（low／0.25） | 誤報（none／0.85） | 這兩個值都是 W4、W8 逐字規定的，屬於可重現性的偏好，不是安全缺陷 |
| C11 | W12 測試把 workflow 第 5 步的字串切開，當成 git 參數執行；修改過的 workflow 可以讓測試帶入任意 git 參數（low／0.2） | 誤報（none／0.92） | 能修改 workflow 的人本來就能改測試；沒有 shell，`merge-base` 不會執行 hook。改法很便宜：先斷言字串等於規定值再執行。第 6 階段已修正 |

## 留給 epic close-out 的觀察

- **C1 與 T-0069 的 SEC-01、SEC-05 是同一類。** 本機的 X9、CI 的祖先檢查都是可以被繞過的 guard。三者合起來的前提是同一組 control：MN7、MN2、MN1 加上 RP5 與 MN3。T-0073 的 S8-04 必須把這些設定逐一引用到位。
- **C7 的順序。** workflow 一合併就會生效。如果有人在 MN2 之前推了 `v*` tag，GitHub 會自動建立沒有規則的 `npm` environment。在 MN1 之前，OIDC 仍然無法 stage，但 environment 的 tag 規則會缺席。`release.md` 應把「先做 MN7、MN2，再推任何 `v*` tag」寫成明確的前提。

## 涵蓋範圍與限制

- **已檢查**：
  - `publish-npm.yml` 全文，並與 `release.yml` 比對；
  - 新測試檔與另外三個測試的 diff；
  - gate 的 `prepare-dist.mjs`、`check-publish.mjs`、`publish.mjs`；
  - `create-wxl/package.json` 與 `.gitignore`、根 manifest 的 `packageManager`；
  - 確認 repo 沒有 `pnpm-workspace.yaml`、`.npmrc`、`.pnpmfile.cjs`。
- **逐項檢查的 GitHub Actions 面向**：
  - trigger 與 `${{ }}` 注入：run 步驟完全沒有 expression；
  - `persist-credentials`、action pin、cache；
  - 帶著 OIDC 會執行哪些程式；
  - environment、concurrency；
  - fork 與 pull request 的行為；
  - 任意 commit 上的 tag；
  - 直接發布與 dist-tag。
- **排除**：
  - tar、yaml、npm@11.21.2、pnpm@10.28.0 與三個 pinned action 的內容或已知漏洞；
  - GitHub、npm 平台與 OIDC 簽發；
  - admin 權限；
  - GitHub 與 npmjs.com 上的實際設定（MN1～MN7）；
  - availability。
- **限制**：沒有在 runner 上執行。checkout 在 tag 事件會抓哪些 ref、git 如何解析有歧義的 ref，都是依文件與 git 的既有行為推論。

## 第 6 階段之後的修正

`5baae82` 在本審查的快照（`c14c99a`）之後，改了這些地方：

- workflow 檔頭的註解；
- W12 測試的執行方式：先斷言第 5 步等於規定指令才執行，修正了 C11；
- 新增「沒有 `${{ }}`」的檢查；
- T52 的斷言；
- 兩個測試檔的註解。

我逐行讀過 `git diff c14c99a 5baae82`，這些變更都不影響 workflow 的鍵與步驟（W8 的鍵集合、W6 的指令都沒有變），也沒有新增任何可執行的路徑，所以上面的結論仍然成立。這項檢查是主 session 讀 diff 的結果，沒有再派獨立審查者。

本報告不代表整個專案是安全的。

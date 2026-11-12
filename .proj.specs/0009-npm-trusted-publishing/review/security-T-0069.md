# T-0069 安全審查（第 7 階段）

- **Skill**：專案的 `.claude/skills/security-review/SKILL.md`（明確讀檔載入，不是內建的 `/security-review`）。
- **Workflow**：`wf_c051482c-4a5`。候選由一個 `harness-reviewer` 找出，每個候選再交給另一個獨立的 `harness-reviewer` 判定是否誤報。
- **範圍**：
  - checkout `/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0069/x9-ci-environment`；
  - base `b50ca6e`，HEAD `aa5072b`（`9f2d443`、`aa5072b`）；
  - 與 `main` 的 merge-base 是 `af4e1ac`。`af4e1ac..b50ca6e` 只有 spec 0009 的文件與 tickets，第 3 階段已審；
  - 未提交的變更只有 T-0069 的票，沒有當成程式碼審；沒有未追蹤檔案。
- **依據**：spec 0009 的 B1～B3、D8，traceability 的「The new X9」與「Trust boundaries」，ADR-0005（本票是平台工具，不是題目，不適用）。

## 結論

8 個候選全部被獨立審查判定為誤報，嚴重度 none。本票沒有需要修正的安全發現。

這些判斷都來自讀程式碼與文件，沒有實際執行攻擊。

## 候選與處置

| # | 候選（候選審查者的嚴重度／信心） | 獨立判定（嚴重度／信心） | 理由摘要 |
|---|---|---|---|
| T0069-SEC-01 | 在終端機 export 四個環境變數就能讓 X9 通過，B2 的「Protects」欄依賴它（low／0.35） | 誤報（none／0.9） | 能從中得利的只有持有可發布 npm 憑證的人，而這種人用 `--ignore-scripts` 就能跳過整個 gate，B2 的「Does not protect」已經寫了。D8 明說 X9 是防誤操作的 guard，不是 control。這個 diff 反而收緊了 gate：舊 X9 讓已登入的維護者直接通過，新 X9 要刻意偽造才會過 |
| T0069-SEC-02 | `npm publish <tarball>` 不跑 `prepublishOnly`，B2 沒有列出這條路徑（low／0.5） | 誤報（none／0.8） | npm 的行為大致正確（根據對 npm 原始碼的記憶，未實際執行），但不是本 diff 引入或變得可達。它和 `--ignore-scripts` 同類：一樣需要已被 MN1、MN3 撤銷與拒絕的憑證，意外出現的 staged entry 也會被 RP5 (a) 退回 |
| T0069-SEC-03 | XM 經 `JSON.stringify` 回顯環境值，U+2028／U+2029、DEL、C1 控制字元與 bidi 字元不會被跳脫，可能偽造終端機或 log 內容（low／0.15） | 誤報（none／0.9） | 終端機上，`process.env` 是使用者自己的環境，沒有越過信任邊界。CI 上，`GITHUB_ACTIONS`、`GITHUB_REPOSITORY` 是 runner 預設值，repository 名稱只能用 `[A-Za-z0-9._-]`。唯一可選字元的是 `GITHUB_WORKFLOW_REF` 的 ref，而能在上游建 ref 的人，B1 本來就視為能讓任何 commit 的 job 執行 |
| T0069-SEC-04 | gate 把原始 `process.env`（含 OIDC 請求變數）傳給 git 子程序（low／0.2） | 誤報（none／0.85） | 傳 `process.env` 給 git 的呼叫在 diff 之前就有，不是本 diff 新增。B1 也寫明 job 裡的任何程式都能請求 OIDC token，runner 上的 git 本來就是受信任元件 |
| T0069-SEC-05 | K2、K3 用的 `UPSTREAM_SLUG` 來自要發布的 commit 本身，對 fork 或被改過的 commit 沒有保護（low／0.15） | 誤報（none／0.9） | D8：X9 和祖先檢查都從被 tag 的 commit 自己的 workflow 執行，擋不了刻意的修改。fork 的 OIDC 身分是 fork 的 repository，npm 的 trusted publisher 只認上游（B1、B3） |
| T0069-SEC-06 | 移除 npm maintainer 檢查後，發布前不再看 npm 名稱屬於誰（low／0.1） | 誤報（none／0.9） | 這是 spec 要求的移除（D1、D2）。改動 npm 名稱擁有權屬於「npm 帳號的管理權限」，在威脅模型之外。舊檢查本來就能被跳過，也不是 control |
| T0069-SEC-07 | 測試 helper 以遞迴刪除含 symlink／junction 的暫存 clone（low／0.1） | 誤報（none／0.9） | 只在測試中發生，沒有攻擊者可控的輸入。`fs.promises.rm` 遇到 symlink 與 junction 會 unlink，不會進入目標。既有的 `cleanupFixture` 本來就這樣做 |
| T0069-SEC-08 | XM 的 closing sentence 與檔頭把「只由上游 workflow 發布」寫成事實（low／0.15） | 誤報（none／0.9） | 這段文字是 traceability 規定的逐字內容（XM），AC-1、AC-2 也有測試。它是給操作者看的發布政策說明，不代表有強制力；系統裡也沒有任何 control 依賴有人相信這句話 |

## 留給 epic close-out 的觀察

下列兩點不是本票的發現。它們在威脅模型之內，而且已被接受，但串連分析時應一併考慮：

- **SEC-02 的路徑。** `npm publish <tarball>` 與 `--ignore-scripts` 一樣會繞過 gate。B2 的「Does not protect」只寫了後者，T-0072 寫 `release.md` 時可以考慮一併提到。
- **SEC-01 與 SEC-05。** 本機上 X9 可以被偽造，fork 的 commit 也能自帶不同的 slug。真正擋住這些的是 MN1、MN3 與 RP5 這些 control，所以 T-0073 的設定紀錄（S8-04）是整條防線的前提。

## 涵蓋範圍與限制

- **已檢查**：
  - `checkPublish` 全部（X1～X9、`PublishError`、`ownString`），以及 `check-publish.mjs`、`publish-io.mjs`、`git-runner.mjs`、`git-env.mjs`；
  - `create-wxl/package.json` 的 `prepack` 與 `prepublishOnly`；
  - 測試 helper（`linkNodeModules`、`cloneDetachedAtTag`、`cleanupClone`）；
  - spec 的 D1、D2、D8 與 B1～B3。
- **候選審查者確認沒有問題的項目**：
  - 非 `PublishError` 的例外會在 top-level await 重新丟出，Node 以非零值結束，`&&` 會擋下發布；
  - XM 不回顯任何 secret：`ACTIONS_ID_TOKEN_REQUEST_URL` 只在空白時回顯，`ACTIONS_ID_TOKEN_REQUEST_TOKEN` 從不讀取；
  - 換行與 `::workflow-command` 注入被 `JSON.stringify` 和固定的行首擋下；
  - `v` 在 X9 之前已被 X2 限制為 `\d+.\d+.\d+`。
- **排除**：
  - tar、yaml、vitest 與 npm、pnpm CLI 的相依套件掃描；
  - 可用性、DoS 與 rate limiting；
  - `publish-npm.yml`、ruleset、`npm` environment 與 trusted publisher（屬於 T-0071 以後的票）；
  - X9 以外的 X1～X8 邏輯；
  - GitHub 與 npm 的 OIDC 簽發（在威脅模型之外）。
- **限制**：沒有執行測試、npm 或 git。npm 對 tarball 是否跳過 lifecycle script、Node 對 top-level await rejection 的結束碼、`fs.rm` 對 junction 的行為，都是依原始碼與文件推論，不是觀察到的結果。

本報告不代表整個專案是安全的。

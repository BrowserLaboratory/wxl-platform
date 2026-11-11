# Stage 3 round 2：總覽 — epic 0009-npm-trusted-publishing

依據：`round-2-C.md`、`round-2-V.md`、`round-2-K.md`、`round-2-R.md`。

- 送審版本：revision 2，`spec.en.md` blob `1016f19`、`traceability.md` blob `cb637c8`，commit `6779b55`；程式碼基準是 `main` `af4e1ac`。
- 審查方式：照原樣重播凍結 prompt（blob `f3d556b`，與 round 1 相同），四位 `harness-reviewer` 各審一個軸。
- 報告來源：四份報告都直接從 subagent transcript 取出原文，沒有改寫。

## 統計與閘門

| 軸 | P0 | P1 | P2 |
|---|---|---|---|
| C 完整性 | 0 | 3 | 16 |
| V 可驗證性 | 0 | 9 | 16 |
| K 契約衝突 | 0 | 2 | 12 |
| R 紅隊 | 0 | 3 | 13 |
| 合計 | 0 | 17 | 57 |

**第 3 階段的閘門已滿足：沒有 P0。** 依 `docs/agents/review.md`，P1 不擋 ticket，由 ticket 帶著處理。兩輪是上限，所以照 0005（revision 2.1）和 0007（revision 3）的前例，round 2 的處置寫進 revision 3，只做自我檢查，不再送第三輪審查。

## 主 session 的查證

- **K-1（round 2）成立。**
  - O1 寫「`create-wxl/` never enters a range」，這句只對 `git archive` 成立。GitHub fork 會帶著整棵樹。
  - `scripts/fork-init.ts:689` 的排除清單裡沒有 `create-wxl`。
  - `.claude/skills/wxl-fork-init/SKILL.md` 的 A 模式說明，列出了 A 模式會保留 slug 的位置，但沒有列這一行。
- **K-3、C-4、V-9、R-12 成立。** `upstream-guard.test.ts:75-81` 的註解寫明，這個走訪的前提是「one key per line」。`create-wxl/package.json` 的 `bin`、`engines` 卻是寫在同一行裡的物件。

## 群組與處置提案

| 群 | 主題 | 發現 | 處置提案 | 需要裁決 |
|---|---|---|---|---|
| H1 | workflow 的鍵集合沒有封閉 | C-1、V-8 | 新增 W8：<br>• workflow 層的鍵 = {`name`, `on`, `permissions`, `concurrency`, `jobs`}<br>• job 層的鍵 = {`if`, `runs-on`, `environment`, `permissions`, `steps`}，`runs-on` = `ubuntu-latest`<br>• 每一步的鍵只能是 {`uses`, `with`, `name`} 或 {`run`, `name`, `working-directory`}<br>同時修正 self-check 裡的全稱說法 | 否 |
| H2 | MN2 沒有驗收出口 | C-2、V-6、R-2 | • S8-04 加上使用者對 MN2 頁面的回報<br>• MN2 必須在 MN1 之前完成<br>• F1 改寫成「MN2 設錯」（環境不存在時會被自動建立，所以不會失敗） | 否 |
| H3 | AC-7 的錨點、核准之後的失敗 | C-3、V-4、R-4、C-6 | • AC-7 改為「第一個被核准、而且通過 RP6 的 `v<V>`」<br>• 新增 F6：核准後 RP6 失敗時，先 `npm deprecate`，再出下一個 patch<br>• RP5 加一項 (e)：`release.yml` 已經成功<br>• F 表補上 cancelled 與核准後重跑兩種情況<br>• F5 改寫成「pending 的 run 會被取代」<br>• MN6 的時機改成「任何新 tag 或重跑之前」 | 否 |
| H4 | 發布文件的行結構、標題 | V-1、V-2、C-10 | • S5 分成兩種檢查：行結構逐行檢查，允許 `\| `、`- ` 前綴；字串檢查先收合空白<br>• 「第一行」改成「標題之後第一個非空行」<br>• S5 的測試放在 `create-wxl/test/`<br>• D02 在第 6 階段由人工判定<br>• OQ-027 拆成兩列：建立、填入 | 否 |
| H5 | RP0 與 AC-8 對不上 | V-3、C-8、V-13 | • `repository` 改用 `npm pkg get repository` 觀察<br>• 刪掉「沒有 npm log」這個代理指標<br>• AC-8 補上 CI 那一項<br>• 定義 code ticket | 否 |
| H6 | 回報的期望值與 shasum | V-5、V-7、R-16、C-16 | • S8-04 逐一列出期望值（6 個欄位名、撤銷結果、MN3 的逐字選項）<br>• 刪掉 RP5 (d)<br>• shasum 由使用者直接讀 run log<br>• 「stage 的 log 會不會印 shasum」列入未知事項 | 否 |
| H7 | MR1 的排版與 guard 的豁免 | V-9、C-4、K-3、R-12 | • MR1 規定 `repository` 一行一個鍵<br>• guard 的豁免改為逐字比對：只認 `create-wxl/package.json` 裡完全相等的 `"url": "<root repository.url>",` 那一行<br>• M02 的 fixture 加上 `bugs.url`、`homepage` 兩個反例 | 否 |
| H8 | 祖先檢查是 guard 不是 control；tag 由誰推、推哪一個 | R-1、R-3、K-12（round 2）、R-6、R-7 | • U7 的步驟比照 X9，標成 guard<br>• RP2 由使用者確認 tag 名稱和 RP1 的 squash merge SHA<br>• RP5 加一項 (f)：commit 等於確認過的 SHA<br>• B1 改成「at any commit」<br>• RP1 的 skill 只寫 CHANGELOG<br>• RP2 不使用 `--tags`，遠端已有同名 tag 就停下<br>• RP5 (a) 改成「整體只有一筆 entry」<br>這一群牽涉到你的全域 CLAUDE.md，要你裁決 | U8、U10 |
| H9 | GitHub fork 預設模式下的 `repository.url` | K-1（round 2）、C-5、R-11 | 二選一：(a) 列為第三類位置「只有 rebrand 會改寫，預設模式保留」，同步更新 skill 的保留清單和 README 的說法；或 (b) 讓預設模式也改寫它，這是新的引擎決策。不論選哪一個，spec 裡「fork 測試照樣通過」都改成實情：create-wxl 的測試只在上游跑，而 C45 的 version 在 fork 上本來就不成立 | U9 |
| H10 | 發布 ticket 的狀態 | K-2（round 2）、C-19 | 寫明各階段的狀態：合併前的第 6～7 階段是 `review`；合併後等待 AC-7 時仍是 `review`；AC-7 成立後改為 `done`。O3 列出要覆寫的 issue-tracker.md:78-80、workflow.md:132、:178-184。F2 的修正要另開一張 ticket，屬於本 epic，排在發布 ticket 之前 | 否 |
| H11 | 其餘 P2 | 其餘 | 照各報告的建議做機械修正，或記錄下來，逐項寫在 `disposition-2.md` | 否 |

## 需要使用者裁決

| # | 問題 | 建議 |
|---|---|---|
| U8 | 你的全域 CLAUDE.md 規定：用 `/tw-emoji-release-note` 產生 release note 之後，要「自動、額外」執行 `git tag` 加 `git push --tags`。這和 RP2 的「確認後只推單一 tag」衝突。這個 repo 要以哪一個為準？ | 以 RP2 為準，並寫進 `release.md`：這個 repo 不使用 `--tags`，推 tag 之前要先取得確認 |
| U9 | GitHub fork 用預設模式跑 fork:init 時，`create-wxl/package.json` 的 `repository.url` 要怎麼處理？ | (a) 列為例外，預設模式保留，並同步更新文件 |
| U10 | 要不要加一個 GitHub tag ruleset（`v*`：限制誰能建立，禁止刪除和移動），讓「tag 不移動」從一般約定變成強制？ | 加，作為 MN7，並在 S8-04 引述設定內容 |

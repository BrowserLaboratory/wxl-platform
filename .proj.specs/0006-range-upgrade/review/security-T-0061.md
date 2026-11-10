# T-0061 第 7 階段安全審查

依專案版 `.claude/skills/security-review/SKILL.md`（不是內建的同名指令）。

## 範圍

- checkout：`/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0061/upgrade-base-provenance`。
- base `d26a7e2e4182a7c5df1be8b4b736bdcac3e6d9b6`（main），merge-base 同 base，HEAD `d60d1a2d0261f4a0514498ac2769d4bb835b7ab2`。
- 已 commit 的變更：`git diff d26a7e2...HEAD -- create-wxl`（1535 行，含 `messages.mjs`、`run-shared.mjs`、`upgrade-report.mjs`、`upgrade.mjs`、測試 helper 與 15 個測試檔）。其餘 commit 是 spec、ticket、GLOSSARY 與 ADR-0009，作為需求與信任邊界的依據。
- pending 變更 0 筆，untracked 0 筆。

## 方法

workflow `wf_731a8c84-676`（2026-11-10）：

1. 一個 `harness-reviewer` 列出所有候選，包含低嚴重度、低信心的項目，並且不自行判定誤報。
2. 每個候選交給另一個獨立的 `harness-reviewer` 判定，依據是 HEAD 的程式碼，以及 spec 的 B1～B6。

兩者都只讀，沒有執行測試或 git 指令，判斷全部來自讀碼。攻擊者位置依 0006 回顧的要求明確列出：

- B3：能改 `range.json`，所以控制記錄的版本與 commit。
- D17：說服老師執行 `--from <commit>` 的人。
- fork network：在上游網址下提供 commit 的 fork。

npm 套件本身依 B2 視為可信。

## 結論

**確認的發現：0 項。** 13 個候選經獨立判定全部是誤報（信心 0.75～0.9）。本報告只代表這次 diff 沒有發現新的可利用缺陷，不代表整個專案沒有安全問題。

## 被排除的候選

| 候選 | 類別 | 處置與理由 |
|---|---|---|
| C1 | 補救建議把老師導向不受保護的 `--from <commit>`（D18 × D17） | 誤報。J6 會在寫入前以 UP-E12 擋下 B3 的偽造 base；剩下的路徑要老師自己執行 `--from <commit>`，B1 Does not protect 與 D17 已明文接受，連後果（M5、M6、M12、`|||||||`）都逐字列出。訊息順序是使用者裁決的 D18（round 2 W1）。可選的強化記錄如下，沒有採用 |
| C2 | 攻擊者寫一個上游沒有 tag 的版本，改走語氣較溫和的 404 路徑 | 誤報。結果仍是在寫入前停下；後續同樣要靠 D17 的社交工程，已被接受 |
| C3 | step 6 用宣稱的版本與 commit 在 J6 之前判 UP-I01、UP-E07、UP-E10 | 誤報。B3 Does not protect 明文接受「靶場可以被擋在上游發布之外而不報錯」，traceability revision 3 自審也有記錄；不會寫入任何東西 |
| C4 | `--from <commit>` 只在 R1 事後註明，沒有事前警告 | 誤報。D17 規定的警示位置就是 R1；影響已被 B1 接受 |
| C5 | 改 `range:upgrade` script 繞過 J6 | 誤報。能改 script 的人本來就能執行任意程式碼，這條路徑不會擴大他的能力；入口也不在 B3 的邊界內，而且不是這次 diff 新增的 |
| C6 | tag 移動後，`--from <version>` 會取到錯誤的 base | 誤報。B1 Does not protect 已列出「a tag upstream moves, for a `--from <version>` base」 |
| C7 | `git log -p -- range.json` 的作者欄位可以偽造，終端可能被控制序列影響 | 誤報。偽造作者需要已經是 B3 的攻擊者，而 B3 的能力本來就更大；終端行為屬於老師自己的 git 與 pager |
| C8 | CW-E14 的 jsonValue 不跳脫 U+202E 之類的格式字元 | 誤報。新指令的參數寫死，stderr 不受攻擊者控制；跳脫範圍符合 B5 與 0005 的規定（只要求 C0、DEL、C1） |
| C9 | git 被 SIGINT 終止與自己的訊號 listener 之間有競態，可能以 CW-E14 exit 1 結束 | 誤報。沒有攻擊者，最壞是退出碼 1 而不是 130，而且 step 4、5 不寫入任何東西；每個 git 呼叫之後都有 `guard.throwIfRaised()` |
| C10 | 不分大小寫的檔案系統上，tracked 的 `Range.json` 與 D15 | 誤報。spec B4 Does not protect 已明文列出，並標為推論 |
| C11 | J6 的通過路徑只在 fixture 驗證，fixture 的 tag 形狀和真實 tag 不同 | 誤報（不是安全問題）。落差只會讓合法升級以 UP-E08 或 UP-E12 停下（fail closed）；真實 tag 由第 8 階段驗證 |
| C12 | 多個 pax global header 時，最後一個 comment 生效 | 誤報。tar 由 GitHub 的 git archive 產生，列出的攻擊者都控制不了 header 結構 |
| C13 | 下載整份讀進記憶體，沒有大小上限 | 誤報。主機與 repository 固定，B3 只能選上游的 tag；`--from <commit>` 的情況有下載逾時與解壓縮比例上限；也不是這次 diff 新增的 |

### C1 的可選強化（記錄，沒有採用）

以下任何一項都會修改 D18，要同步更新 traceability、兩種語言的訊息表與相關測試：

- 把 `git log -p -- range.json` 移到 `--from <commit>` 之前，並寫明：最後一次修改 `range.json` 的如果不是你自己用 create-wxl 寫入的，就不要使用記錄的 commit。
- 在 UP-E12 補一句：GitHub 會在上游網址下提供 fork network 的 commit，所以單憑網址無法證明 commit 來自上游。
- `--from <commit>` 在寫入前就用 stderr 警告。

## 涵蓋範圍的限制

- 沒有做相依套件掃描、可用性（DoS）或速率限制的審查，也沒有審查低嚴重度的 hardening。威脅模型沒有要求這些項目。
- 沒有實測 codeload 對 annotated tag 回傳的 tar 形狀，也沒有實測 macOS `core.ignorecase` 下 `ls-files` 與 `check-ignore` 的行為；前者由第 8 階段驗證。
- 沒有讀 `merge-plan.mjs`、`merge-apply.mjs`、`raw-tar.mjs` 全文，這次 diff 沒有改動它們。
- 跨 ticket 的串連分析依 `docs/agents/review.md`，在 epic 收尾時進行。

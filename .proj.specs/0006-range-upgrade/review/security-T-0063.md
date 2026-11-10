# T-0063 第 7 階段安全審查

依專案版 `.claude/skills/security-review/SKILL.md`（不是內建的同名指令）。

## 範圍

- checkout：`/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0063/restore-order-and-report`。
- base `89a1e223a7a28ee9f7756c978af02603e64cce51`（`main`），merge-base 同 base，HEAD `f953661a8b7b74e85913bb012e53569c1a702584`。
- 已 commit 的變更：`git diff 89a1e22...HEAD -- create-wxl GLOSSARY.md`（861 行）。
  - 原始碼：`upgrade-report.mjs`（`RESTORE_COMMANDS`、R2 的刪除路徑行、R4 的 D16 句、R5）、`messages.mjs`（UP-E09）、`merge-apply.mjs`（`__proto__`）、`merge-plan.mjs`（註解）。
  - 測試：12 個檔案，含新 helper `test/helpers/restore.mjs`。
  - 另有 GLOSSARY 的一句。
  - 其餘 commit 只改 T-0063 ticket。
- pending 變更 0 筆，untracked 0 筆。

## 方法

workflow `wf_8b6ea10f-026`（2026-11-10），分兩段：

1. 候選：一個 `harness-reviewer` 列出所有候選，包含低嚴重度、低信心的項目，不自行判定誤報。
2. 判定：每個候選交給另一個獨立的 `harness-reviewer`。依據是 HEAD 的程式碼，以及 spec 的 B1～B6，特別是 Does not protect 與 Outside the model 兩欄記下的已接受風險。

兩者都只讀，沒有執行測試或 git 指令。明確列出的攻擊者位置有三種：

- (a) archive 內容：`--from <commit>` 的 base 可以取自 fork network（D17），所以這時 B 的路徑名稱、R2 印出的 M6 路徑，以及 base 的版本號都由攻擊者影響。
- (b) B3：能改 `range.json` 或 commit 進老師 repository 的人，例如放一個帶 `__proto__` 的 `range.json`，或安排 tracked 檔與 ignore 規則。
- (c) 老師照 R5 或 UP-E09 在自己的 shell 操作。

上游正式版本的內容依 B2 視為可信。

（同一天先誤用了 T-0062 的 workflow 腳本，它會審到 T-0062 的 diff，所以在任何結果產出前就停掉了，結果不採用。）

## 結論

**確認的發現：0 項。** 8 個候選經獨立判定，全部是誤報（信心 0.8～0.9）。

本報告只代表這次 diff 沒有發現新的可利用缺陷，不代表整個專案沒有安全問題。

候選審查員的整體觀察如下：

- R-6 的 `defineProperty` 與 object spread 都只定義物件自己的屬性，不會改到 `Object.prototype`。
- R5 與 UP-E09 現在印出完全相同的指令。
- 對升級本身造成的變更來說，新順序不比舊順序差：P-7 保證升級不寫入或刪除 ignore 檔。

## 被排除的候選

| 候選 | 類別 | 處置與理由 |
|---|---|---|
| C1 | R2 的刪除路徑行沒有跳脫 bidi、零寬字元與 U+2028/2029 | 誤報（0.85）。B5 沿用 0005 B5 與 AC-24，只要求跳脫 C0、DEL、C1。M6 的路徑一定是老師自己 tracked、內容等於 b 的名稱，同一批名稱原本就經由 R3 印出。T-0061 與 T-0062 的 C8 已有相同判定 |
| C2 | R2 不設上限逐行列出，攻擊者選的 base 可以讓輸出淹沒 R3 | 誤報（0.85）。D16、AC-10 與 B4 的 Protects 都要求列出每一筆刪除，截斷反而違反規格。真正的傷害（M6 刪檔）是 B1 Does not protect 已接受的風險；R4 的第一行也會叫老師先看 `git status` 與 `git diff` |
| C3 | D16 句要老師比對「版本」，但 `--from <commit>` 時版本號取自攻擊者的 manifest | 誤報（0.85）。句子照 traceability R4 逐字實作。B1 Does not protect 已接受 `|||||||` 段是那個 commit 的文字，警示靠 R1 的 D17 註記。這句陳述的是事實，沒有新增可以偽造的保證 |
| C4 | D16 句排在「處理衝突標記」之後，已經動手的老師照做會丟掉自己的修改 | 誤報（0.8）。順序照 traceability R4。B4 Does not protect 已接受「run after later edits, discard those edits too」，R5 也有警語 |
| C5 | 還原指令印成兩個獨立指令、沒有 `&&`；zh-TW 的 `.` 緊接全形逗號，複製時容易帶到 | 誤報（0.85）。規格只規定兩個指令的順序；AC-11 的 `&&` 是測試的寫法。升級本身不動 ignore 檔，所以只看升級本身時，兩種順序結果相同。全形逗號的鄰接在舊版就有 |
| C6 | F9：被 ignore 的檔案位在取代 tracked 檔的目錄裡，`git checkout -- .` 會一起刪掉 | 誤報（0.8），不是這個 diff 引入的，順序不影響結果（本機 git 2.54 實測，見 ticket）。要在升級後老師自己放了被 ignore 的檔案才會發生，屬於 B4 Does not protect 的「run after later edits」。只剩 AC-11 措辭上的缺口，交給使用者 |
| C7 | 新順序會刪掉只被「升級後改過的 `.gitignore`」ignore 的未追蹤檔案，舊順序會保留 | 誤報（0.85）。升級前工作樹必須乾淨（UP-E03），升級也不動 ignore 檔，所以要老師升級後自己改過 `.gitignore`、又新增檔案才會發生，屬於 B4 已接受的情境 |
| C8 | step 9 重讀 `range.json` 時沒有重跑 J3，非物件的值會走不同路徑 | 誤報（0.9）。只有另一個程序在執行中改檔才會發生，屬於 B4 Outside the model。發生了也是安全地失敗（UP-E09），不會造成 prototype pollution |

## 可選的強化（記錄，沒有採用）

以下都是判定者提到的 P2 等級建議，不是缺陷，維持 spec 的現狀：

- C1：把 bidi、零寬字元與 U+2028/2029 納入跳脫範圍，要 0005 與 0006 一起改 spec（同 T-0062 的 C8）。
- C3：`--from <commit>` 時，D16 句改為要老師比對 R1 的 commit，不是比對版本號。
- C4：D16 句加上「在處理衝突或做任何變更之前」。
- C5：印成單一指令 `git checkout -- . && git clean -fd`；zh-TW 讓指令和全形標點之間留空白。
- C6、C7：B4 的 Does not protect 把這兩個情境寫成具體例子；F9 的 AC-11 措辭交給使用者決定。

## 排除的涵蓋範圍

- 沒有做相依套件掃描。這次 diff 沒有改動相依套件。
- 沒有評估可用性、速率限制與低嚴重度的強化項目，只記錄判定者主動提到的強化建議。
- 判斷全部來自讀碼。唯一實測的是 F9，用本機 git 2.54；git 2.20 上的行為還沒有測（見 ticket）。
- 跨 ticket 的串連分析留到 epic 收尾（`docs/agents/review.md`）。

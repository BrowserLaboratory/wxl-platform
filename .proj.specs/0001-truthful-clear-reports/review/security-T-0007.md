# 安全審查：T-0007（第 7 階段）

日期：2026-10-13。依專案 `security-review` skill（`.claude/skills/security-review/SKILL.md`）執行。

## 範圍

- base `origin/main` = `f5889ce`，merge-base `f5889ce`，HEAD `4fe83a7`，分支 `tickets/T-0007/refused-run-adds-notice`。
- committed：`4c5420f`（T-0006 完成紀錄，只有 Markdown）、`4fe83a7`（`clearRefused`、被拒時保留先前狀態、refusal notice、測試、ticket）。
- pending：無。untracked：無相關檔案。
- 方法：
  - 候選審查一輪（`harness-reviewer`）。
  - 五個候選全部交給另一個獨立的 `harness-reviewer` 判斷是否誤報。
  - 主 session 用 `git show f5889ce:` 確認 base 的被拒路徑會把 `clearStarted` 設成 false，並換上 sentinel。
  - 主 session 掃過 commit message 本文，沒有本機路徑、email、token 或 secret。
  - 安全判斷都是程式碼推論。

## 結論

沒有確認的安全缺陷，這次變更是收緊。

base 在先前已有狀態時被拒（P10b、P10c、P11r）：
- 會清掉 `clearStarted`，同一份文件裡立刻提供 continue，而且 `keepExistingData` 也接受；
- P11r 在站台根目錄時，gate 會直接消失。

現在被拒時保留 `clearStarted`：
- continue 不再出現；
- 進度存取仍被拒；
- 不寫 marker，也不改 decision。

## 候選與處置

| 候選 | 候選審查 | 獨立複核 | 處置 |
|---|---|---|---|
| F-1 若 `sessionStorage` 在文件中途變成讀寫都不能用，P11r 的 reload 帶到一份讀不到 start record 的新文件，那裡會提供 continue | Low，信心 0.45 | 只有讀也失敗時才成立；相同值的 `setItem` 依規格不會因配額失敗，觸發面更窄。base 在同一狀態下，同一份文件就直接提供並接受 continue；reload 只等同 F5，還會丟掉記憶體裡的 session。不跨信任邊界。不是安全缺陷，信心 0.85 | 不處理；若要處理 reload 之後的陳述，屬於 spec（T28r）層級，記給 epic 收尾 |
| F-2 notice 建議「改用一般視窗」，新視窗沒有 start record | Low，信心 0.35 | 不是本次引入：base 的 `clear_not_started_hint` 有同一句；無痕與一般視窗的儲存分區是隔離的，排隊中的刪除不會落在一般視窗的資料上。文案是 spec 的 copy table。不是安全缺陷，信心 0.9 | 不處理；文案屬 spec |
| F-3 被拒時把 `clearStarted` 還原成先前的值，而不是強制為 true | Info | 現行程式中走不到；即使走到，`databaseDeleted` 為 true 時 continue 仍被撤下。不是安全缺陷，信心 0.9 | 不處理 |
| F-4 第二次被拒時畫面沒有變化，`role="alert"` 不會重唸 | Info（UX） | 本次引入，但屬使用體驗。不是安全缺陷，信心 0.95 | 記給 epic 收尾 |
| F-5 寫入成功、讀回失敗時，第一次執行會留下孤立的 start record | Info，既有 | 實務上幾乎不會發生；方向保守（下次會多問）。不是安全缺陷，信心 0.9 | 不處理 |

複核另外逐項檢查了 `clearRefused` 的重設點、P10 的 dismiss、raw error 的輸出與進度存取，沒有找到本次引入、而候選審查沒提出的安全缺陷。

## 給 epic 收尾串連分析的備註

- F-1：reload 之後新文件讀不到 start record 的情況，與 T-0006 的 I-2（gate 不是 modal、save 沒有檢查 gate）同屬「刪除可能還在排隊」一類，收尾時一起評估。
- F-4：連續被拒時缺少回饋，可列為使用體驗改善。
- 本 epic 的過渡期（T-0005、T-0006 記錄的 P10、P10b、P10c、P11r）在本 ticket 全部收掉。

## 涵蓋範圍限制

- 沒做：
  - 依賴套件弱點掃描（lockfile 沒有變動）
  - 可用性與阻斷服務
  - 低嚴重度 hardening
  - 跨 ticket 的串連分析（epic 收尾時做）
- 沒有在各瀏覽器實測 `sessionStorage` 在設定變更後的行為，也沒有實測相同值 `setItem` 在配額已滿時的行為。

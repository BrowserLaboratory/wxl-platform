# 安全審查：T-0009（第 7 階段）

日期：2026-10-14。依專案 `security-review` skill（`.claude/skills/security-review/SKILL.md`）執行。

## 範圍

- base `origin/main` = `fb2091d`，merge-base `fb2091d`，HEAD `413b1d4`，分支 `tickets/T-0009/open-questions-update`。
- committed：`2099b9b`（T-0008 完成紀錄，只有 Markdown）、`413b1d4`（`OPEN-QUESTIONS.md` 的 OQ-001、OQ-003 改寫與 OQ-007～OQ-013 新增；`SessionGate-truth.test.ts` 新增 P11a 測試；T-0009 ticket）。
- pending：無。untracked：無。
- 方法：
  - 候選審查一輪（`harness-reviewer`，不自行過濾）。
  - 十個候選全部交給另一個獨立的 `harness-reviewer` 判斷是否誤報。
  - 主 session 讀 `usePentestNotes.ts`、`CodeEditorPanel.vue`、`useChallengePersistence.ts` 的各個讀寫路徑，確認複核補充的事實。
  - 主 session 掃過 commit message 本文：沒有本機路徑、email、token 或 secret。
  - 安全判斷都是程式碼推論，沒有在瀏覽器重現。

## 結論

沒有確認的安全缺陷，也沒有任何候選達到通報門檻（HIGH／MEDIUM 且信心 ≥ 0.8）。這次沒有改產品程式碼；新增的測試沒有修改或刪除任何既有斷言，測試之間也沒有狀態洩漏。依 upstream hard exclusion 16，Markdown 文件裡的發現不列為安全缺陷。C2～C4 是真實的文件準確度問題，已在 OQ-007 修正。

## 候選與處置

| 候選 | 候選審查 | 獨立複核 | 處置 |
|---|---|---|---|
| C1 OQ-007 公開「存 attack session 時不檢查 gate」 | Low，信心 0.15 | 事實正確；repo 公開，程式碼本身就揭露了這件事；gate 不是本機存取控制。誤報，信心 0.05 | OQ-007 的 Reason 補一句威脅模型：gate 是告知與選擇，不是存取控制 |
| C2 OQ-007 只列了 `saveAttackSession` | Low，條目不完整的信心 0.9 | 事實正確，另外 5 條寫入路徑也沒有 gate 檢查。複核另外查到：筆記與程式草稿在掛載時讀入記憶體，不看 gate，所以掃除失敗並 dismiss 之後，一次編輯就可能把上一位學習者的內容寫回。這是既有行為，不是漏洞，信心 0.9 | 已修正：OQ-007 擴大為「記憶體中的狀態」，列出所有讀寫路徑；主 session 已讀碼確認 |
| C3 「已在等待 `getDb()` 的 save」機制描述不精確 | Low，信心 0.5 | 正確，要分三個時間點：`forgetDb()` 之前、刪除請求發出之前、刪除請求發出之後。只有最後一種會重建資料庫，而 open 逾時不會取消請求，仍可能留下空資料庫。信心 0.7 | 已修正（仍標為推論） |
| C4 沒說寫回的是誰的資料 | Info，信心 0.35 | 正確：執行清除的分頁裡，attack session 是目前訪客新開的；跨學習者的情況發生在另一個選了 continue 的分頁；marker 是每個分頁各自一份。信心 0.6 | 已修正（標為推論） |
| C5 OQ-013 可能讓人把防護條件當死碼刪掉 | Low，信心 0.2 | 程式註解與 OQ 都寫明是防護縱深，也寫了何時會生效。誤報，信心 0.15 | 不處理 |
| C6 OQ-012 把「放行導向」寫成中性選項 | Low，信心 0.2 | 導向在 `evaluate` 結束後就執行，比任何清除都早；未作答的狀態下掛載本來就會寫入。誤報，信心 0.1 | 不處理 |
| C7 OQ-008 可能被讀成「偵測失敗就不問」 | Info，信心 0.15 | 選項只涉及文案；程式註解明訂讀不到就要問。誤報，信心 0.05 | 不處理 |
| C8 P11a 測試釘住新文件的 `databaseDeleted` 為 false | Info，信心 0.1 | 這是 spec T3 的要求。誤報，信心 0.05 | 不處理 |
| C9 P11a 只驗畫面上的出口，沒有呼叫 handler | Info，信心 0.3 | T34 的範圍只有字串；新文件裡 continue 被拒，已有其他測試覆蓋。測試覆蓋問題，不是安全問題，信心 0.3 | 不處理 |
| C10 OQ-003 公開列出沒有字面比對的狀態 | Info，信心 0.05 | 沒有安全效果。誤報，信心 0.02 | 不處理 |

## 給 epic 收尾串連分析的備註

- C2 是這次 epic 最重要的跨 ticket 發現：「全站清除」報告說資料庫已刪，但同一個分頁的記憶體裡可能還留著上一位學習者的筆記與程式草稿。這些內容在 dismiss 之後的一次編輯就會寫回。這和 T-0003 C1/C4、T-0004 F1、T-0006 I-2、T-0007 F-1 同屬「刪除之後仍有寫入」一類，收尾時要一起評估。現在記在 OQ-007。

## 涵蓋範圍限制

- 沒做：
  - 依賴套件弱點掃描（lockfile 沒有變動）
  - 可用性與阻斷服務
  - 低嚴重度 hardening
  - 跨 ticket 的串連分析（epic 收尾時做）
- 沒有在瀏覽器重現 C2 的寫回，也沒有查元件在掃除失敗後是否實際觸發每一條寫入路徑。

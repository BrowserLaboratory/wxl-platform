# 回顧：epic 0006（靶場升級）

日期：2026-11-09。依 `docs/agents/workflow.md` 的 Epic close-out 第 3 步執行。

範圍：spec 0006 revision 2（2026-10-16）到 T-0027 改為 done 的紀錄（#68，`4fe2cad`）。

- **Ticket**：2 張。
  - T-0026（入口、前置檢查與 base 解析）：PR #65。
  - T-0027（三方合併、套用與報告）：PR #67。
  - 兩張都用 squash 合併，各自有一個改 `done` 的紀錄 PR（#66、#68）。
- **時間線**：T-0026 在 2026-10-17 第一次開工時暫停，等 T-0025 合併。2026-11-07 在 `main` `ea0de55` 上恢復，2026-11-08 合併。T-0027 在 2026-11-09 合併。
- **收尾 PR**：串連分析、這份回顧、HTML 證據報告、OQ-026（在 T-0027 的第 7 階段已加入）與 T-0061。

## 結果

- **交付**：老師在靶場裡執行 `pnpm range:upgrade`，就能把上游的新版本以三方合併帶進來。拿不準的地方保留老師的版本並列入注意清單，衝突以三個標籤標出，不 commit，報告附上還原指令。
- **第 8 階段**：
  - T-0026：驗證面是 create-wxl 在 Node 裡跑的 vitest，涵蓋四組 OS／Node 的 CI。
  - T-0027：0006-S2 在 macOS 終端機上，用打包後的 `npx` 實際從 A 升級到 B。逐項預期一次就全部通過：exit 0、R2 計數、R3 剛好 UP-A1 與 UP-A12、三標籤衝突、`pnpm install && pnpm build`、還原後 status 為空。
- **測試**：create-wxl 從 437 個（T-0026 開工時的基準）增加到 558 個（T-0026），再到 623 個（T-0027）。根目錄 vitest 從 4,854 個增加到 4,861 個（1 skipped），增加的是 GLOSSARY 詞條。
- **決策**：D3～D10 都由使用者在過程中確認，其中 D6～D10 來自審查。traceability 從 revision 2.1 改到 2.5。
- **安全**：
  - 兩份第 7 階段報告各有 28 個候選，都沒有達到通報門檻。三組 low 的 true positive 已修正：T-0026 的訊號處理，T-0027 的 check-ignore pathspec magic 與 submodule。
  - 串連分析找到三條從 B3 跨到 B4 的鏈（low，最嚴重的一條在 medium 下緣），開出 T-0061（`review/chain-analysis.md`）。
- **CI**：#65 兩輪全綠。#67 第一輪在 windows-latest 失敗一個測試，原因是測試預期了 POSIX 才有的 `ENOTDIR`，修正後全綠。

## 做得好的地方

| 觀察 | 證據 |
|---|---|
| 第 6 階段 A12 要求紅燈原文不截斷。上一個 session 的 workflow journal 還保留結構化的完整紀錄，取回後補進 T-0026 的紅綠表 | T-0026「red → green log」說明段 |
| T-0027 每段實作完成就 commit（`6619ece`、`f3b8d5c`、`6619cd8`、`e720026`），T-0026 的 A12「沒有中間 commit，逐輪紅燈無法重現」沒有再發生；mutation 的基準雜湊也能從 commit 直接算出 | T-0027「red → green log」與 mutation 段 |
| 每一輪 executor 之後，都由獨立的唯讀驗證者逐列核對。這樣抓到了測試全綠也看不出的 production 缺陷：R3 沒有用 run 的語言、UP-A12 少了建議、parent check 只看直接上一層，以及 U53 在不分大小寫的檔案系統上忽略大小寫改名 | T-0027「Independent verification」段 |
| 第一次就綠燈的確認型測試都做了 mutation 檢查。15 項都能轉紅，U61 被識別為弱測試並記錄原因 | T-0027 mutation 表 |
| 兩段式交接讓 executor 在第 7 階段修正前先交計畫，提前發現兩個會被連帶打壞的既有測試 | T-0027「stage 7 fixes applied」 |
| windows-latest 的 CI 抓到了本機 macOS 測不到的測試假設 | PR #67 第一輪；T-0027 修正 commit `4125aef` |
| 第 8 階段完全照 traceability 的「Stage 8 simulation」執行，拋棄式分支 `sim/0006-upgrade` 用完就刪 | T-0027「stage 8 end-to-end」 |

## 要改的地方

| # | 觀察 | 證據 | 提案 |
|---|---|---|---|
| 1 | T-0027 的增量計畫起草後審查了三輪，每輪都被 reject，最後兩輪大多是「紅燈訊息的字面預測不夠精確」。主 session 依「凍結標尺」守則停下，自己帶修正確認 | T-0027「increment plan confirmed」；本機的三份審查 | 增量計畫的把關只看結構：每一列有沒有對到、順序能不能各自成立、和核准文字有沒有衝突。紅燈的訊息由 executor 實際觀察並逐字記錄，訊息和預測不同但確實是那一列的紅燈時記為偏差（T-0026 increment 12 的前例）。屬通用流程，提給 harness-agile |
| 2 | executor 只照 brief 明列的子案動手，同一項核准處置的其他呼叫點沒有一起改，第 6 階段因此要補第二輪 | T-0027「stage 6 fixes applied」：P2/P11/P18、P7、P10、S2 第一輪只套用一部分 | brief 對每一項核准處置寫明「這項的全部範圍」，並要求 executor 搜尋同類呼叫點；驗證者核對整項，不只核對子案。屬通用流程，提給 harness-agile |
| 3 | executor 從對話脈絡讀到使用者對另一個提問視窗說的「剛剛誤按／重新問」，以為是對它說的，整輪沒動手就停下 | T-0027「stage 6 fixes applied」第一段 | brief 明寫這次任務依據的是哪一個使用者核准，並說明脈絡裡其他的使用者訊息是針對別的對話。屬通用流程（Claude 的 orchestration），提給 harness-agile |
| 4 | 主 session 在處置提案裡寫了具體的旗標 `--literal-pathspecs`，使用者照提案核准了，實際上 check-ignore 會拒絕這個旗標 | T-0027「stage 7 fixes applied」 | 處置提案寫到具體的工具旗標或 API 時，先在真的工具上試過，再請使用者核准。屬通用流程 |
| 5 | 主 session 新增的 spec 列有寫錯的地方：U64 寫「升級後 status 為空」，但 `range.json` 一定會被改寫。這屬於全域守則第 2 條「新 AC 先自審」沒有做到 | T-0027「stage 7 fixes applied」U64 更正 | 每加一列 spec，就問一次：「這個狀態在那個時間點真的可能存在嗎？」把這個問題加進自審清單。屬通用流程 |
| 6 | 一段 executor 提前寫了後面增量的 production 程式碼（U58）；另一段把 fixture 改成內容不同，好讓測試通過，結果遮住了大小寫的缺陷（U53） | T-0027「red → green log」的兩個停止點 | brief 寫明：「讓紅燈轉綠的 fixture 修改是要停下回報的偏差」「不要寫後面增量要驅動的 production 程式碼」。屬通用流程 |
| 7 | 第 7 階段的誤報篩選，把 candidate 07 以「寫入一律來自 t」判為誤報，沒有考慮 B3 的攻擊者能決定 b；要到 epic 收尾的串連分析才更正 | `review/chain-analysis.md` X1；security-T-0027 候選 07 的更正註記 | 第 7 階段的誤報篩選 prompt 要求：對每個候選，逐一考慮 spec「Does not protect」點名的每一種攻擊者能力。屬通用流程，提給 harness-agile |
| 8 | 測試預期了作業系統專屬的錯誤碼（POSIX 的 `ENOTDIR`），獨立驗證的守則只檢查原始路徑，沒有檢查錯誤碼 | PR #67 第一輪 | `docs/agents/platform-notes.md` 已補上，連同 check-ignore 與 `npx --package` 的環境經驗，在這個收尾 PR 一併更新。屬 wxl 專屬 |

## 採用情況

| # | 落點 |
|---|---|
| 1～7 | harness-agile 的提案（通用流程）。依 upstream-first 的做法，這個 repo 不另外改，等上游更新後再同步 |
| 8 | `docs/agents/platform-notes.md`，這個收尾 PR 一併更新 |

## ADR 與 open question

- **OQ-026**（T-0027 第 7 階段）：老師自己 ignore 的 `range.json` 仍會被寫入。保持 open。
- **T-0061**（`pending`）：串連分析的 X1～X3，需要先做 spec 決策。
- **ADR 候選**：沒有新的。D3～D10 是 spec 0006 的決策，留在 traceability。
- **範圍外的觀察**：每次 push 時，GitHub 都提示 `main` 上有 82 個 Dependabot 警告（35 high、32 moderate、15 low）。它們和本 epic 無關，各 ticket 的第 7 階段也都明列不含依賴掃描。是否要另外開一個依賴維護的 ticket 或 epic，由使用者決定。

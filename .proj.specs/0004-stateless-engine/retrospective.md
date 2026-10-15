# 回顧：epic 0004（無狀態的 fork-init 引擎與靶場 CI）

日期：2026-10-16。依 `docs/agents/workflow.md` 的 Epic close-out 第 3 步執行，精簡版。使用者在 2026-10-16 裁決（選項 C）：先寫回顧，第 2 步的 evidence report 延到研習後。

範圍：epic 起點 `c0f7edf` 到 T-0018 落地。共 9 張 ticket（T-0010～T-0018；T-0017、T-0018 是落地過程中加開的），PR #14～#21 加上 T-0018 的 PR，全部 squash 合併。

## 結果

- **原本的 7 張 ticket（T-0010～T-0016）都已落地**，traceability 2.1 的每一列都有 ticket 認領。第 8 階段 S7 在 T-0016 的 HEAD 上，以 GH、CF 兩份匯出驗證，每道指令都 exit 0（CF 第一次遇到 flaky，依使用者裁決從頭重跑）。
- **跨 OS job 第一次在 Windows、macOS、Ubuntu 與 Node 22 上跑就全部通過**（T-0011），引擎不需要額外修正。
- **全套測試從 2,285 個增加到 4,177 個**（T-0012 的 PR 描述記載的數字，到 T-0018 實作時的 `pnpm test --run`）。
- **安全**：8 份 ticket 安全審查都沒有確認的可利用缺陷。串連分析沒有找到跨越模型內信任邊界的串連；N-3 由使用者裁決開成 T-0018，鏈 B 補記在 OQ-016（`review/chain-analysis.md`）。
- **加開的兩張**：T-0017 修掉 epic 0001 回顧第 8 項就記過、一直沒處理的 CodeMirror unhandled error；T-0018 補上 spec B3 宣稱存在、但 release job 沒有的 `WXL_EXPECT_UPSTREAM`。

## 做得好的地方

| 觀察 | 證據 |
|---|---|
| 主 session 在 repo 副本裡親自重跑 mutation 指令，沒有只信 executor 的報告 | T-0015 的 18 條與 T-0011 的 10 條全部逐字重現；T-0017 的 destroy 斷言 |
| 對抗式的第 6 階段審查每張都抓到真缺陷，不只是文字問題 | T-0015 的跳脫解析無窮迴圈；T-0016 有 10 處文件和 CLI 行為不符；T-0017 的斷言只量到 DOM 消失 |
| mutation 證據推翻了錯誤的結論 | T-0015 第一版寫「T6 找不到 mutation」，重做後 640 個測試變紅 |
| 串連分析加上獨立 challenger，產出一個真正的修正 | `review/chain-analysis.md` 的 N-3 → T-0018 |
| 每個需要裁決的地方都停下來問，一次一題 | T-0015 的偏離 1～3、T-0016 的 S7 flaky、T-0017 的流程、S7 的「最後一張」 |

## 要改的地方

| # | 觀察 | 證據 | 提案（#1、#3 已於 2026-10-16 套用到 `.claude/agents/harness-executor.md`、`.claude/hooks/guard-executor-git.sh` 與 `docs/agents/claude-orchestration.md`；其餘延到研習後） |
|---|---|---|---|
| 1 | executor 連續三張整批實作（T-0013、T-0014、T-0015），第三次是在 prompt 已明文「不能逐列就停下回報」之後；每次都要使用者另外裁決 | 三張 ticket 的 Deviations；使用者三次選 A | 派工改成兩段：executor 先回報「每一列的增量切法」，主 session 確認後才開始寫程式；做不到逐列的列，在第 5 階段之前就交使用者裁決 |
| 2 | 每張 ticket 都要多一輪修紀錄品質：重現指令跑不出來、字面不可見字元、計數錯、殘留審查編號 | T-0012～T-0016 的 stage 6 處置 | 把主 session 每次手動跑的檢查（不可見字元、本機路徑、審查編號、簡體字、`-t` 選到的測試數）寫成一支腳本，executor 交件前和審查前各跑一次 |
| 3 | executor 違反明文禁止，用了 `git stash` | T-0011 的第一份報告 | 在 Claude 的設定或 hook 擋下 executor 的 `git stash`、`git checkout`、`git reset`，不只靠 prompt |
| 4 | epic 0001 回顧記下的兩個 flaky（CodeMirror、`door-is-open`）都只寫「已另開調查任務」，沒有變成 ticket 或 OQ；CodeMirror 這次又讓 CI 變紅 | epic 0001 回顧第 8、9 項；T-0016 的落地紀錄 | 回顧的後續項目一律變成 ticket 或 OQ，不留在對話裡的任務 |
| 5 | workflow 只把使用者最新一則訊息轉給 subagent，最新一則只是「A」時，executor 判定沒有授權而停下 | T-0015 第一次派工 | 在 `docs/agents/claude-orchestration.md` 寫明：實作用 Agent 直接派工，prompt 裡寫出授權出處 |
| 6 | T-0016 的文件照 spec 的字串寫，沒有對照程式行為，第 6 階段才發現 10 處不符 | T-0016 的 stage 6 處置 | 文件類 ticket 的派工要求每一句行為描述都附上程式的 `path:line` |
| 7 | 落地後加開的 ticket 讓 S7「最後一張 ticket 的 HEAD」產生兩種讀法，要使用者另外裁決 | T-0017 的 S7 裁決；traceability 2.2 | 第 8 階段的 seam 改寫成「epic 最後一張改動行為的 ticket」，只改測試或 CI 的 ticket 另有規則 |
| 8 | 測試計畫表都用中文寫，但 `docs/agents/language.md` 規定 ticket 內文用英文 | T-0017 第 6 階段審查 | 交使用者決定：在 language.md 把核准表列為例外，或之後改用英文 |
| 9 | 本機的題目測試 flaky（`door-is-open` 等 service worker 逾時、`staff-only` 登入失敗），CI 沒出現過 | T-0016 的 S7 紀錄 | 另一個 session 正在調查；結果出來要開成 ticket 或 OQ（見第 4 項） |

使用者在 2026-10-16 裁決，0005 `create-wxl` 與升級／migration 兩個 epic 開始前只套用 #1 與 #3，其餘延後。

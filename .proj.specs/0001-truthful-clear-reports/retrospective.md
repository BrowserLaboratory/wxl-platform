# 回顧：epic 0001（全站清除的回報要說真話）

日期：2026-10-14。依 `docs/agents/workflow.md` 的 Epic close-out 第 3 步執行。

範圍：第 1 階段收斂需求（2026-10-10）到 T-0009 合併（`013dcff`）。共 9 張 ticket、10 個 PR（#1～#10，其中 #3 是維護 PR），全部由使用者以 squash 合併。

## 結果

- **K2～K4 都已修正。**
  - K2：sweep 失敗後的文案不再說「作品已刪」（T-0004）。
  - K3：撤回 continue 的理由不再引用那句錯誤的說法（T-0004、T-0006）。
  - K4：後續的刪除被擋時，報告與出口改依失敗階段決定（T-0005、T-0006）。
  - 被拒的按壓不再抹掉「刪除可能還在排隊」的紀錄（T-0007）。
- **AC-1～AC-14 全部勾選。** 9 張 ticket 都是 `done`，沒有未勾選的 AC。
- **測試從 2,083 個增加到 2,173 個**（T-0001 合併時到 T-0009 合併時）。新增的 S2 真話測試會先斷言前置條件，再逐字比對 en 與 zh-TW 的字串；OQ-003 列出了它釘住的 15 個 key 與對應狀態。
- **時程：** 依 Q22，W4 要在 10/14 前全部合併，最後一個 PR（#10）在 10/14 合併，達成。
- **安全：** 9 份 ticket 安全審查都沒有確認的安全缺陷。串連分析的鏈 A 由使用者裁決為不開 ticket，改記入 OQ-007（`review/chain-analysis.md`）。

## 做得好的地方

| 觀察 | 證據 |
|---|---|
| Standards 與 Spec 兩軸審查，每張都抓到實質問題，最後都在 ticket 範圍內處理完畢 | 各 ticket 的 stage 6 處置表，例如 T-0008 的 31 項、T-0009 的 39 項 |
| 真話測試先建立機器狀態，再逐字比對，mutation 會讓它轉紅 | T-0004、T-0007、T-0009 的 mutation 紀錄 |
| 事先授權 1～4 讓 ticket 在範圍內一路做完；改變範圍或行為的地方都停下來讓使用者裁決 | T-0005 P10、T-0006 P10c 與 T15、T-0009 的 T34、收尾的鏈 A |
| 獨立的誤報判斷，推翻或修正了候選審查的結論 | `security-T-0008.md` C1、`security-T-0009.md` C2 |

## 要改的地方

| # | 觀察 | 證據 | 提案（尚未套用，待使用者決定） |
|---|---|---|---|
| 1 | traceability 的 T34（P11a 的 S2 真話測試）沒有任何 ticket 認領，直到 T-0009 盤點時才發現 | T-0009 ticket「scope added by the user: T34」 | 第 4 階段拆 ticket 時，列一張「T 列 → ticket」對照表，確認每一列都有人認領 |
| 2 | T-0003～T-0007 每一張進第 6 階段時，status 都還沒改成 `review`、AC 也沒勾 | 各 ticket 的 stage 6 處置表；handoff「從這幾張學到的」 | 在 `docs/agents/workflow.md` 第 6 階段的入口條件加上這兩項 |
| 3 | T38、T39 用「`72327e2` 的行號」指定位置，實作期間行號一直變動；T-0008 第一次的對照表有好幾列錯位 | T-0008 stage 6 的 Spec F1、F2 | spec 引用程式位置時，改用函式或測試名稱，不用行號 |
| 4 | agent 寫進 ticket 的紀錄有好幾次不準確：對照表錯位、掃描結果的描述對不上、mutation 結果描述錯誤、自己寫錯 guard 的理由，都是審查抓到的 | T-0008 Standards F1 與 F3、Spec F1 與 F2；`security-T-0008.md` C1；T-0009 Spec F7 | 紀錄裡每個「已驗證」的說法都附上可以重跑的指令或 `path:line`；要對照舊 commit 時，一開始就用 `git show` |
| 5 | T-0008 的候選安全審查由同一個 reviewer 自己判斷誤報，獨立性不足，之後才補上獨立判斷 | `security-T-0008.md` 範圍段 | prompt 寫明候選審查「不自行過濾」；T-0009 已經這樣做 |
| 6 | round-1 的 R-11 指出兩件事，處置只回應了其中一件；沒處理的那一半就是後來的鏈 A | `review/chain-analysis.md` N-2 | 第 3 階段的處置表要逐句回應每一個發現 |
| 7 | spec 沒有信任邊界段落，串連分析只能自己推導，也因此對 B1 算不算邊界產生分歧 | `review/chain-analysis.md` N-4、使用者裁決 | spec 範本加一段「信任邊界與威脅模型」；裁決 A 的立場（gate 是告知與選擇，不是存取控制）已寫成 ADR-0006 |
| 8 | CI 兩次出現同一個 CodeMirror unhandled error（`requestAnimationFrame is not a function`，發生在 `SourceViewer.test.ts` 期間）：一次在 `main`，一次在 PR #10 | T-0009 landed 紀錄 | 已另開調查任務；在根因查明前，重跑失敗的 job 都要記錄下來 |
| 9 | 本機的 `door-is-open` challenge 測試偶發初始化逾時，CI 從未發生 | T-0004 ticket 的更正紀錄 | 已另開調查任務 |
| 10 | 審查發現的已知問題，有好幾項沒有 revisit 條件 | spec Out of Scope；`security-T-0006.md` I-4 | 已新增 OQ-014、OQ-015 |

## ADR（使用者 2026-10-14 選 A，兩篇都寫）

- **ADR-0006**（`docs/adr/0006-session-gate-is-a-notice-not-access-control.md`）：session gate 是告知與選擇，不是存取控制。這是收尾時鏈 A 的裁決依據，日後的串連分析與 spec 都會用到這個威脅模型。
- **ADR-0007**（`docs/adr/0007-gate-copy-pinned-by-literal-truth-tests.md`）：gate 文案的真實性由 S2 逐字比對的真話測試釘住，測試先建立並斷言機器狀態，再比對字串。這是本 epic 對 OQ-003 的部分回答。

## 新增或更新的 open questions

- **OQ-007**：擴大範圍並記錄裁決，列為下一個 epic 的第一候選。
- **OQ-014**：讀不到 start record 時（鏈 D），gate 會把機器當成沒有被動過。
- **OQ-015**：dismiss 的推論依賴「同一個資料庫的刪除依序處理」，這只在 Chromium 驗證過。

## 下一個 epic 的候選

1. **清除後的寫回（OQ-007）。** 最小的修法是替沒有 gate 檢查的寫入路徑加檢查。
2. **W4.5 `pnpm create wxl`（照原計畫）。** OQ-006（`CONTEXT.md` 要不要改名）的 revisit 條件之一是「epic 0001 合併後、範本帶給新 fork 之前」，跟這個 epic 有關。

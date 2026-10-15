# 第 7 階段資安審查：T-0017

範圍：分支 `tickets/T-0017/source-viewer-test-cleanup`，base `30474aa`（審查時為尚未 commit 的 WIP）。審查 `tests/unit/components/SourceViewer.test.ts`，以及 spec 0004 第 2.2 版新增的 seam 0004-S10、T85 與 AC-C4。

方法：專案 `security-review` skill。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入的可利用缺陷：0 項。** 候選 5 項，獨立篩選全部判定不是資安缺陷：改動只有單元測試與規格文字，沒有攻擊者，也不跨越信任邊界。其中 4 項的技術主張成立，依第 6 階段處理或記錄。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | `afterEach` 只斷言 document 裡沒有 `.cm-editor`，量不到 EditorView 是否被 destroy；元件若不再 destroy，斷言仍是綠的 | 屬實、非資安 | 已修：unmount 後另斷言每個 editor 的 `destroyed` 旗標為 true；在副本拿掉元件的 `destroy()` 後，新斷言變紅、舊斷言維持綠 |
| 02 | T85 與測試註解寫成「計時器不會比測試活得久」，實際上計時器仍會觸發，只是 destroyed view 會直接返回 | 屬實、非資安（文字不精確） | 已修：T85 與註解改成實際機制 |
| 03 | 環境拆除後，計時器回呼若碰到其他已失效的 DOM API，可能出現另一種 unhandled error | 駁回：推測性的時序問題；原始錯誤的 stack 顯示回呼在那種狀態下只會走到 `update()`，而 destroyed view 會在那裡返回 | — |
| 04 | `afterEach` 的 unmount 迴圈沒有 try/finally，某個 unmount 丟例外時，後面的 wrapper 不會被清掉 | 屬實、非資安（hardening） | 記錄即可：目前每支測試只透過 `mountViewer` 建立一個 wrapper |
| 05 | 測試檔既有註解寫「mounts in jsdom」，實際環境是 happy-dom | 屬實、既有、非資安 | 不在本票範圍；本票紀錄已照實寫 happy-dom |

## 沒有涵蓋

dependency scanning、可用性、低嚴重度 hardening。本報告不代表整個專案沒有安全問題；跨 ticket 的 chain analysis 在 epic 收尾時進行。

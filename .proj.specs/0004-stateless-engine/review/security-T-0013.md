# 第 7 階段資安審查：T-0013

範圍：分支 `tickets/T-0013/anchor-mode-identity-anchors`，base `0534e42`（審查時為尚未 commit 的 WIP）。審查 `scripts/fork-init.ts`、`tests/unit/scripts/fork-init.test.ts`、`.gitignore` 的變更。

方法：專案 `security-review` skill。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入的可利用缺陷：0 項。** 候選 11 項，獨立篩選全部駁回為資安 finding；其中屬實但非資安的項目已轉到第 6 階段修正。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| C1 | 固定名稱的 `<file>.fork-init-tmp` 若已是 symlink，寫入會跟隨連結 | 駁回：需先能寫入工作樹，而這種人本來就控制引擎原始碼；B2 把連結列為模型外 | 已強化：寫入前若有殘留暫存檔一律 unlink，unlink 失敗即報錯，不沿著連結寫出 |
| C2 | manifest 在其他檢查前就寫入，違反「全部算完才寫」 | 駁回（非資安，但屬實） | 已修：讀取、檢查、計算全部在寫入前完成 |
| C3 | 寫入失敗訊息夾帶作業系統的絕對路徑 | 駁回（本地 CLI 輸出到使用者自己的 stderr，不算資訊曝露；但違反 T53、T57） | 已修：訊息只含相對路徑與錯誤代碼 |
| C4 | rename 失敗時殘留暫存檔 | 駁回（可靠性） | 已修：失敗時清除暫存檔 |
| C5、C7 | 暫存檔加 rename 會改變唯讀、hard link、擁有者等語意 | 駁回：spec 明文要求的 tmp 加 rename 語意，B2 已把連結列為模型外 | — |
| C6 | 暫存檔在 chmod 前短暫使用預設權限 | 駁回：寫入的是公開內容 | 權限改在 rename 後套用到目標檔 |
| C8 | 帶 `--base` 時仍改寫 config 的 base 行 | 駁回：使用者核准的過渡期行為，由 T-0014 取代 | 記在 T-0014 |
| C9 | 單獨的 CR 不算行尾 | 駁回：規格解讀，無資安影響 | ticket 記下解讀 |
| C10 | T55 測試沒有真的驗證「舊 bytes 或完整新 bytes」 | 駁回（只在測試） | 已補強測試 |
| C11 | tree error 不回報已改的檔案 | 駁回：缺少稽核紀錄不算漏洞 | — |

## 沒有涵蓋

dependency scanning、可用性、低嚴重度 hardening。本報告不代表整個專案沒有安全問題；跨 ticket 的 chain analysis 留到 epic 收尾。

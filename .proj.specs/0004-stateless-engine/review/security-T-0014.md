# 第 7 階段資安審查：T-0014

範圍：分支 `tickets/T-0014/base-and-host-workflows`，base `41e2bf5`（審查時為尚未 commit 的 WIP）。審查 `scripts/fork-init.ts`、`tests/unit/scripts/fork-init.test.ts` 與新 fixture `tests/unit/workflows/fixtures/deploy-template-72327e2.yml`。

方法：專案 `security-review` skill。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入的可利用缺陷：0 項。** 候選 10 項，獨立篩選全部判定沒有可利用的攻擊路徑：輸入都來自 CLI 參數或老師自己的工作樹。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | 能解析但結構不對的 workflow（`jobs` 不是物件、job 或 step 是 null、steps 不可迭代）會讓 `derivesSiteBase` 拋出 TypeError | 屬實、非資安（正確性） | 已修：這些形狀一律判為不推導 `SITE_BASE`，並補 it.each |
| 02 | rebrand 模式讀 config 的方式改變 | 駁回 | — |
| 03 | `--base` 的值插入 A9 字串字面值 | 駁回：值經 base 文法驗證，不含引號或反斜線 | — |
| 04 | T82 警告回顯舊 A9 行 | 駁回：內容來自老師自己的 config | — |
| 05 | config 以 UTF-8 讀寫，不合法的 UTF-8 會被改寫 | 屬實、非資安 | 記為已知限制：T-0015 會把非 ASCII 站名寫進 config，config 維持 UTF-8 |
| 06 | `--rebrand` 加 `--host` 尚未被拒絕，rebrand 分支會照舊安裝 workflow | 屬實、非資安、跨 ticket | T-0015 的 T50 會拒絕這個組合；註解已如實描述目前行為 |
| 07 | 只看第一個 `pnpm build` 步驟 | 駁回：符合 traceability 的單數定義 | — |
| 08 | A9 只換單行 | 駁回：符合 spec | — |
| 09 | 刪除 workflow 失敗時訊息寫成「write」 | 屬實、非資安 | 已修：刪除失敗回報為 remove |
| 10 | 讀檔與寫入之間的 TOCTOU | 駁回：同時執行兩次屬於 B2 的模型外 | — |

## 沒有涵蓋

dependency scanning、可用性、低嚴重度 hardening。本報告不代表整個專案沒有安全問題；跨 ticket 的 chain analysis 留到 epic 收尾。

# 第 7 階段資安審查：T-0011

範圍：分支 `tickets/T-0011/upstream-only-ci-and-guards`，base `1f4096a`（審查時為尚未 commit 的 WIP）。審查 `.github/workflows/release.yml`、`.github/workflows/quality-gates.yml`、`scripts/fork-init.ts`、新檔 `tests/unit/scripts/upstream-guard.test.ts` 與 `tests/unit/workflows/upstream-only-jobs.test.ts`，以及 `fork-init.test.ts` 和三支元件測試的改動。

方法：專案 `security-review` skill。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入的可利用缺陷：0 項。** 候選 17 項，獨立篩選判定沒有一項跨越信任邊界：每條路徑都需要能 commit 進上游、能控制 CI 的環境變數，或特定的部署環境。其中 9 項屬實但不是資安問題，多數是 guard 或原貌檢查與 spec、核准測試計畫不一致；8 項在本票修正，1 項記為已知限制。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | 真實 tree 以 latin1 讀檔，binary 判斷卻重新以 UTF-8 編碼，前 8000 bytes 的窗口實際變小 | 屬實、非資安（fail closed：最多誤報） | 已修：判斷改用原始 bytes，並補 7999／8000 的邊界 |
| 02 | `git ls-files` 失敗時回傳空清單，guard 在沒掃任何檔案的情況下通過 | 屬實、非資安（同一輪的原貌檢查仍會失敗） | 已修：檢查 exit status，失敗就報錯，並要求檔案數大於 0 |
| 03 | manifest 任何層級的 `url`／`homepage` 行都被豁免，不只 A1 的三個欄位 | 屬實、非資安（與 confinement 規則不符） | 已修：依 JSON 結構只豁免 `repository.url`、`bugs.url`、`homepage` |
| 04 | 原貌檢查用 JS 字串規則解 A7，A7 實際是 YAML scalar | 屬實、非資安 | 已修：改用引擎的 YAML scalar 解析 |
| 05 | 匯出的全域 regex 帶 `g` flag，有 `lastIndex` 狀態 | 駁回：引擎只用 `.match()`、`.replace()`，測試只用 `matchAll`，都不受影響 | — |
| 06 | T52 只驗證一支匯入 `UPSTREAM_SLUG` 的檔案 | 駁回：T52 的對象就是單數，符合核准計畫 | — |
| 07 | `WXL_EXPECT_UPSTREAM` 的比對寫在測試內，`TRUE`、`1` 沒有回歸測試；沒設時報 passed 而不是 skipped | 屬實、非資安（與 S5 的定義不符） | 已修：抽成 S5 的 expectation check 函式，以 fixture 測各值；沒設時顯示為 skipped |
| 08 | 跨 OS job 多出 step 不會被擋；用到 Rust toolchain 與 rust-cache 的 job 集合沒有測試 | 屬實、非資安（T72 的驗證缺口） | 已修：補上兩個集合的斷言 |
| 09 | 跨 OS job 的 checkout 會保留 token、沒有 timeout | 駁回：既有 job 寫法相同；PR 只有唯讀 token、拿不到 secrets | — |
| 10 | 同 owner/name 的鏡像（GHES、Gitea）會通過 `if:` | 駁回：只影響鏡像自己的 repository，不跨越信任邊界 | 記為規格觀察 |
| 11 | release 這條路徑沒有設 `WXL_EXPECT_UPSTREAM` | 駁回：T71 只要求 `test` job 與新 job，符合規格字面 | 記為規格觀察 |
| 12 | 有人把偽造的 `git` 放進 tree 就能操縱判定 | 駁回：能 commit 進 tree 的人本來就能執行任意程式碼 | — |
| 13 | submodule 會讓讀檔丟 EISDIR，註解卻說會跳過 | 屬實、非資安 | 已修：只讀一般檔案，註解改成實際行為 |
| 14 | 靶場的工作目錄若在另一個 repo 底下，判定可能誤把它當成 work tree，`pnpm test` 會誤紅 | 屬實、非資安（可用性；需要罕見的目錄配置） | 記為已知限制 |
| 15 | 核准計畫要求同一檔多處各報一筆，實作每行最多一筆 | 屬實、非資安（與核准計畫不符） | 已修：每處各報一筆 |
| 16 | 每次都讀整個 tree，記憶體與 CI 時間隨 repo 成長 | 駁回：屬資源用量的排除項 | — |
| 17 | guard 只防意外執行，擋不了刻意修改 | 駁回：設計性質，spec B4 本來就只針對意外執行 | — |

候選 10、11 的觀察留到 epic 收尾的 chain analysis 一起檢視。

## 沒有涵蓋

dependency scanning、可用性、低嚴重度 hardening。跨 OS job 在 Windows、Ubuntu 與 Node 22 上的行為，要等這張 ticket 的 PR CI 才看得到。本報告不代表整個專案沒有安全問題；跨 ticket 的 chain analysis 留到 epic 收尾。

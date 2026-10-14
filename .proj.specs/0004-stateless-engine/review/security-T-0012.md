# 第 7 階段資安審查：T-0012

範圍：分支 `tickets/T-0012/argument-rules-and-error-model`，base `1e5bce4`（尚未 commit 時審查的 WIP）。審查 `scripts/fork-init.ts` 與 `tests/unit/scripts/fork-init.test.ts` 的變更；spec 與 ticket 只當脈絡。

方法：專案 `security-review` skill。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案。依 ADR-0005，題目的刻意弱點不算 finding；本次只涉及 fork-init CLI。

## 結果

候選 7 項；獨立篩選後保留 1 項（Low，P2），已在第 6 階段修正。其餘 6 項駁回或轉為非資安的程式品質項目。

| 候選 | 內容 | 篩選判定 | 處置 |
|---|---|---|---|
| 未知旗標原文回顯 | Node `parseArgs` 的 `Unknown option '<raw>'` 原封不動印到 stderr；旗標名稱裡的控制字元（ESC 等）會被終端機解讀，違反 spec B1「rejected values are echoed JSON-quoted」 | 保留：規格不符，不是可利用漏洞（CLI 參數屬於老師自己的輸入） | 已修：只包裝 `ERR_PARSE_ARGS_*`，訊息由引擎自己組，旗標名稱與值都經 `JSON.stringify`；新增測試斷言 ESC 被跳脫 |
| `JSON.stringify` 不跳脫 bidi、C1、U+2028/U+2029 | 被拒的值可能在終端機上偽裝 | 駁回：符合 spec 選定的機制；值來自輸入者本人，沒有越過信任邊界 | — |
| `allowPositionals` 讓 Node 附上誤導的 `--` 提示 | 錯誤訊息教老師做一件會失敗的事 | 駁回（非資安） | 已修（同第一項，訊息自建） |
| manifest 是目錄或不可讀時未捕捉例外 | `readFileSync` 拋 EISDIR/EACCES | 駁回：既有行為，沒有寫入 | 註解如實說明檔案系統錯誤在 T55 前仍會 throw |
| `utf8` 有損解碼後改寫 manifest | 非法 UTF-8 被替換 | 駁回：既有行為，不跨信任邊界 | — |
| 「missing」出現在不可能的分支 | 訊息用字 | 駁回（非資安） | 已修：BOM 與解析失敗各有專屬訊息 |
| 測試 harness 的 symlink 與清理 | Windows 權限、清理順序 | 駁回：只在測試程式碼；`rmSync` 不跟隨連結 | 已修：Windows 用 junction，清理更穩妥 |

## 沒有涵蓋

dependency scanning、可用性、低嚴重度 hardening。本報告不代表整個專案沒有安全問題；跨 ticket 的 chain analysis 留到 epic 收尾。

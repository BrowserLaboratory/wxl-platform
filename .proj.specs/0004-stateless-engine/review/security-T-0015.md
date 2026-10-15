# 第 7 階段資安審查：T-0015

範圍：分支 `tickets/T-0015/site-name-and-short-link-origin`，base `5225193`（審查時為尚未 commit 的 WIP）。審查 `scripts/fork-init.ts`、`tests/unit/scripts/fork-init.test.ts` 與 `.vitepress/challenge/shortLink.ts`。

方法：專案 `security-review` skill。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入的可利用缺陷：0 項。** 候選 7 項，獨立篩選全部判定沒有可利用的攻擊路徑：輸入都來自 CLI 參數或老師自己的工作樹。其中 4 項屬實但不是資安問題，3 項已在本票修正。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | A6／A8 既有值的跳脫檢查太寬：`'\u{1F600'` 這類未閉合的 `\u{` 會讓 CLI 進入無窮迴圈，`'\u{}'` 會拋出未捕捉的 RangeError，都沒有依 T9 回報 | 屬實、非資安（正確性，違反本票宣告的 T9） | 已修：只接受 ECMAScript 標準跳脫，其餘一律依 T9 回傳 exitCode 1；A6 與 A8 各補 6 個案例 |
| 02 | A7 把全檔第一個 `---` 當成 frontmatter 開頭，沒有 frontmatter、但正文有分隔線的檔案會被誤判 | 屬實、非資安 | 已修：frontmatter 必須從第 1 行開始，否則依 T9 回報 |
| 03 | 錯誤訊息與 T81 警告回顯原始值，`JSON.stringify` 只跳脫 C0 控制字元，C1 控制字元與 bidi 字元會原樣輸出 | 駁回：與 security-T-0012 的同類判定一致，值來自輸入者本人，沒有越過信任邊界 | — |
| 04 | 首頁、short-link module 與 config 以 UTF-8 讀寫，錨點以外的無效位元組會被改寫成 U+FFFD | 屬實、非資安（T4 的位元組保真度） | 已修：這三類檔案改為只替換錨點那一行的位元組，其餘原樣保留；A9 一併受惠。security-T-0014 候選 05 記下的已知限制因此解除 |
| 05 | A7 只看單行：plain scalar 的續行或 anchor／alias 寫法，寫入後 frontmatter 可能無法解析 | 屬實、非資安（spec 缺口；A7 依 traceability 是單行規則） | 記為已知限制：老師自己的首頁才可能出現這種寫法，結果是 build 失敗而不是內容外洩；column-0 的 `#` 註解行會結束 hero 範圍，同樣以 exitCode 1 收場 |
| 06 | 直接呼叫 `runForkInit` 並傳入未驗證的站名時，`<`、`>`、`&` 不會被拒絕 | 駁回：唯一的 production 呼叫點一定先經過 `parseForkInitArgs`，屬於缺少 hardening | — |
| 07 | T42 的 round trip 用 `yaml` 與 `node:vm` 驗證，不是實際的 build | 駁回：只涉及測試，且是 traceability 指定的方法；實際 build 由 T74（S7）涵蓋 | — |

## 沒有涵蓋

dependency scanning、可用性、低嚴重度 hardening。本報告不代表整個專案沒有安全問題；跨 ticket 的 chain analysis 留到 epic 收尾。

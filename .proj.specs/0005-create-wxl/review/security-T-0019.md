# 第 7 階段資安審查：T-0019

範圍：分支 `tickets/T-0019/engine-overrides`，base `c707b40`（審查時為尚未 commit 的 WIP）。審查 `scripts/fork-init.ts` 的 rebrand 走訪（根目錄 `range.json` 只掃描不改寫）與 `deriveGithubPagesOrigin` 的 export、`tests/unit/scripts/upstream-guard.test.ts` 的上游判定新輸入、兩份 `wxl-fork-init` skill 與 `GLOSSARY.md` 的文字；spec 0005 第 2.1 版為需求依據，信任邊界見 0004、0005、0006 的 spec。

方法：專案 `security-review` skill。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案、不執行指令。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入的可利用缺陷：0 項。** 候選 10 項，獨立篩選判定沒有一項達到通報門檻（HIGH／MEDIUM 且信心 ≥ 0.8）。上游 CI 的判定由 `GITHUB_REPOSITORY` 單獨決定，`WXL_EXPECT_UPSTREAM` 不一致時測試失敗而非略過（讀碼確認，沒有在 CI 上另外觸發）。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | 本機沒有 `GITHUB_REPOSITORY` 時，根目錄有一個未追蹤的 `range.json` 會讓上游專用測試靜默略過 | 屬實、非資安（hardening，只影響本機） | 記錄：CI 不受影響；上游沒有測試斷言「不追蹤根目錄 `range.json`」 |
| 02 | 判定用會跟隨連結的 `stat`，引擎走訪不跟隨，兩者對 symlink 的 `range.json` 看法不同 | 誤報（既有行為；0004 B2 把 symlink 樹列在模型外） | 已改：判定改用 `lstat`，與 0006 J1 一致 |
| 03 | 大小寫不敏感的檔案系統上，`Range.json` 不受保護、會被換 slug | 誤報（create-wxl 一律寫小寫；之後升級以 UP-E05 停下，可用 `--from` 回復） | — |
| 04 | 含 NUL 的 `range.json` 被當成二進位略過，不列入 inventory | 誤報（既有規則；這樣的檔案在 0006 J3 解析失敗） | — |
| 05 | 走訪與讀取之間檔案被換成 symlink，讀取會跟隨連結 | 模型外（並行改寫樹已被 0004 B2、0005 B4 排除）；本票把同一路徑從寫入改成只讀，風險反而降低 | — |
| 06 | 接手別人的靶場時，被竄改的 `range.json` 的 commit 不會被檢查；新的 skill 句子加強了對它的信任 | 模型外（0006 B3 已接受） | 已改：skill 補一句接手別人的靶場時先確認 `upstream.commit` 是上游發布版本的 commit |
| 07 | create-wxl 靶場的 inventory 永遠非空，「未完成」常態化 | 誤報（AC-25 刻意要求；B 模式在上游樹上本來就有大量殘留） | — |
| 08 | export 的 `deriveGithubPagesOrigin` 沒有輸入驗證 | 誤報（唯一呼叫者在 parse 成功後才呼叫） | 已改：註解寫明前提 |
| 09 | PR 同時拿掉 `GITHUB_REPOSITORY`、`WXL_EXPECT_UPSTREAM` 並加 `range.json`，可讓 CI 略過上游專用測試 | 誤報（全是看得見的 workflow 修改，直接刪測試就能做到；控制點是 code review） | — |
| 10 | 開發模組詞條沒有提到依賴 npm 的信任 | 模型外（0005、0006 的 B2 已記錄） | — |

另記一項非資安的文件落差（P2，不在本 diff 新增）：兩份 skill 說 CLI 輸出 `file:line` 形式的 residual inventory，但 CLI 的 `main()` 只印檔名，`file:line` 只在回傳物件的 `residualHits` 裡。

## 沒有涵蓋

dependency scanning、可用性、低嚴重度 hardening 以外的項目；create-wxl 套件本身（後續 ticket）；在 CI 上實際觸發的判定。本報告不代表整個專案沒有安全問題；epic 的串連分析在 epic 收尾時進行。

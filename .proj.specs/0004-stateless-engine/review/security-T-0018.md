# 第 7 階段資安審查：T-0018

範圍：分支 `tickets/T-0018/release-job-expect-upstream`，base `c142833`（審查時為尚未 commit 的 WIP）。審查 `.github/workflows/release.yml` 新增的 job 層級 `WXL_EXPECT_UPSTREAM`、`tests/unit/workflows/upstream-only-jobs.test.ts` 的新斷言，以及 `tests/unit/scripts/fork-init.test.ts` 的 T52 改寫；spec 0004 第 2.3 版為需求依據。

方法：專案 `security-review` skill。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入的可利用缺陷：0 項。** 候選 6 項，獨立篩選判定沒有一項會阻擋合併。篩選以讀碼確認本票的 fail-closed 在目前的 checkout 上成立：env 設在 job 層級（`release.yml:24-25`），`pnpm test --run` 排在建立 GitHub Release 之前，job 沒有 `continue-on-error`，vitest 的 include 會載入 upstream-guard 測試。這些是讀碼結果，沒有在 CI 上實際以 tag 觸發 release job。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | fail-closed 要靠三件事同時成立：env、release job 的測試步驟、步驟順序；目前只有 env 被測試釘住 | 屬實、非資安（P2） | 記錄：步驟的組成與順序沒有測試；之後若改 release job 的步驟，要一併檢查 |
| 02 | 測試只檢查 job 層級的值，看不到 step 層級的覆寫 | 屬實、非資安（Info） | 記錄：quality-gates 的兩個 job 原本就有同樣的缺口 |
| 03 | spec 的 Range CI 文字沒有跟著 AC-C2 改，同一份 spec 有兩種說法 | 屬實、非資安 | 已修：Range CI 文字補上 release job，zh-TW 同步 |
| 04 | 被攻破的相依套件可以用 release job 的 `contents: write` token 改寫 tag 或 release | 駁回：本票沒有改變這個面，新增的 env 只是布林值，不是機密 | — |
| 05 | 同一個 job 裡兩處註解說明同一件事，之後可能只改一處 | 屬實、非資安（Info） | 已修：註解改成照實描述這個 job 的情況 |
| 06 | 若以 2.1 版審查，release job 的 env 會被視為超出規格 | 駁回：需求依據是 2.3 版 | — |

## 沒有涵蓋

dependency scanning、可用性、低嚴重度 hardening；GitHub Actions 上 tag 觸發的 release job 實際執行。本報告不代表整個專案沒有安全問題；epic 的串連分析見 `review/chain-analysis.md`。

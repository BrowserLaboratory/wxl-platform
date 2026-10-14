# Changelog

All notable changes to **Web eXploitation Laboratory (WXL)** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## 💥 [3.0.0] - Unreleased

> WXL 平台的第一個版本：一個讓老師 fork 之後就能備課、讓學生回家也能練習的純前端 web 資安靶場，附四道示範題，網站在 https://wxl.browserlab.online。

### ✨ 新增 (Added)

- 純前端的題目執行環境：Service Worker 攔截 HTTP 請求，交給在瀏覽器裡執行的 Flask／FastAPI（Pyodide）或 PHP（php-wasm）處理，flag 與題目檔案以 AES-GCM-256 加密存放。
- 題目頁的四個工具面板：Browser、Network、Repeater、Code（Python 攻擊腳本），以及 Pentest Notes 筆記。
- 攻擊紀錄保存在學習者自己的瀏覽器裡，可以匯出、匯入與按題目清除；共用電腦會先詢問是否沿用前一位的紀錄。
- 四道示範題：#1 知的必要（IDOR）、#2 僅限員工（SQL injection）、#8 只是預覽而已（SSTI，白箱）、#10 精選節錄（IDOR 串 SSTI，白箱）。
- 中英雙語的使用手冊與攻擊紀錄匯出格式說明。
- 題目短連結（`/c/001`、`/zh/c/001`），網址以 `wxl.browserlab.online` 為準；短連結只在 Cloudflare Pages 上有效。
- `pnpm fork:init`：fork 之後一次改好作者、GitHub 網址與 VitePress `base`，並可安裝 GitHub Pages 的部署 workflow。
- 出題工具鏈：`pnpm create:challenge`、`challenge:verify`（L1–L3 閘門，加 `--blind` 跑 L4 盲解）與 `challenge:retype`。
- harness-agile 九階段開發流程：Claude Code 與 Codex 兩套 skill、agent 角色、流程文件與 ADR；每個 ticket 以 squash 合進 `main`。
- 新的品牌素材：首頁 hero 圖與 favicon，亮色與暗色兩版。

### 🐛 修復 (Fixed)

- 共用電腦的全站清除只完成一半時，詢問畫面的回報改說真話：資料庫已刪、但本站的其他值沒刪完時，改說「資料庫已刪除，其他值沒能全部刪掉」，不再說「作品已刪、救不回來」；再按一次刪除時，會從資料庫開始重試整個全站清除。 ([#4]、[#5])
- 掃除失敗後，下一次刪除如果被另一個分頁擋住，畫面改報「結果無法確認」，只提供重新載入，不再沿用前一次掃除失敗的說法，也不再讓學習者原地繼續。 ([#6]、[#7])
- 按下刪除時，如果瀏覽器不讓本站記下「全站清除已開始」，畫面會保留前一次的報告並加上一則說明，不再說「什麼都沒刪」，也不再重新提供「沿用這些紀錄」。 ([#8])

### 💥 Breaking Changes

- **session gate composable 的旗標改名**：`storedWorkGone` → `databaseDeleted`，不保留別名。它記錄的是「這份文件裡有一次資料庫刪除已經完成」，不是「學習者的作品已經不見」。
  遷移方式：在 `3.0.0` 之前 fork 了 `main`、又自訂 session gate 畫面的老師，請把 `storedWorkGone` 改成 `databaseDeleted`。讀舊名稱會靜默拿到 `undefined`，專案目前沒有型別檢查會擋下（見 OQ-011）；不過 continue 與 dismiss 的防護由 composable 本身執行，照常生效。 ([#1])

[#1]: https://github.com/BrowserLaboratory/wxl-platform/pull/1
[#4]: https://github.com/BrowserLaboratory/wxl-platform/pull/4
[#5]: https://github.com/BrowserLaboratory/wxl-platform/pull/5
[#6]: https://github.com/BrowserLaboratory/wxl-platform/pull/6
[#7]: https://github.com/BrowserLaboratory/wxl-platform/pull/7
[#8]: https://github.com/BrowserLaboratory/wxl-platform/pull/8

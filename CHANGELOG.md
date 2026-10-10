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

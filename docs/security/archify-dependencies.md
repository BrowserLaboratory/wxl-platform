# Archify 依賴與驗證範圍

2026-09-13：本範本將 `fast-uri` override 與 lockfile 由 3.1.5 更新為 3.1.6，保留 Archify 內建及既有呼叫政策。Windows 自動開啟繼續[停用](windows-opener.md)。

## 公告的適用範圍

[上游公告](https://github.com/fastify/fast-uri/security/advisories/GHSA-f65p-4m7j-42xc) 描述不受信任 URL 正規化後，用於網路請求或主機政策判斷時的風險，3.1.6 是 3.x 分支的修正版。

目前程式碼僅在開發用的 `scripts/generate-validators.mjs` 經由 AJV 使用此依賴，讀取內附 schema，輸出無外部 require 的 standalone validators。一般產圖使用預先生成的驗證器；此次未確認公告描述的可利用 SSRF 路徑。即使沒有公開 endpoint，也不能單憑這點排除所有本機處理不受信任資料的風險。

改為只能由使用者呼叫屬操作政策，不能取代依賴修正。因此保留原有呼叫政策；一般產圖不啟動伺服器，明確選用 preview 才監聽 127.0.0.1，並依 skill 規則按使用者需求啟動。

## 在獨立 skill 副本自行驗證

需 Node.js 18+ 與 npm。在 `.agents/skills/archify/` 或其完整暫存副本執行：

```sh
npm ci --ignore-scripts
npm run test:portable
npm run test:preview
npm audit --package-lock-only --ignore-scripts
```

`test:portable` 涵蓋驗證器新鮮度及 schema、Windows opener 停用、交付規則、輸出路徑防護與 render 產物檢查。`test:preview` 需允許本機監聽，檢查最後有效產物保留、重複寫入、過期候選、停止行為與五種 renderer 的首次交付。

上游 `npm test` 保持原樣，其中部分指令依賴未隨 skill 附上的上游 README、scripts 與 examples。此處提供可獨立執行的明確子集，不宣稱通過整套上游測試、瀏覽器視覺驗收或原生 Windows 端到端測試。

## 本輪結果

macOS、Node.js 24.13.0：乾淨暫存副本安裝成功，npm 回報 0 vulnerabilities；驗證器重新產生檢查通過，產物無須變更；上述兩組 Node 測試合計 65／65 通過。首次嘗試額外的上游 preview-contract 測試因缺少其父目錄 README 而失敗，未納入本範本支援子集；預覽測試首次受 sandbox 禁止監聽，允許 loopback 監聽後全數通過。

## Windows CI 追加修正

三平台 CI 首次揭露 preview 在 Windows libuv 檔案監聽層中止，與[上游 issue 310](https://github.com/tt-a1i/archify/issues/310) 描述的短路徑問題一致。監聽前改以 `fs.realpathSync.native` 取得真實目錄，既有回歸測試加入傳入路徑斷言。此為可靠性修正，與已停用的 PowerShell opener 是不同問題；原始失敗及修正後結果以 CI 紀錄為準。

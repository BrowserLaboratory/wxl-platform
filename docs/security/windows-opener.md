# Windows 自動開啟已停用

更新日期：2026-09-13。此狀態適用於包含本次修改的副本；既有安裝不會自動更新。

## 現在的行為

Archify 在 Windows 上不再啟動自動開啟程序。`deliver --open` 與 `preview` 都會回報 `status: "disabled"`、`method: null`，不會呼叫 PowerShell 或其他替代 opener。沒有重新啟用的設定或旗標。

圖表產生、驗證、交付與 preview 伺服器仍可使用。請手動開啟已驗證的 HTML，或將 preview 印出的 `http://127.0.0.1:<port>/` 網址貼入瀏覽器。自動開啟被停用不代表圖表交付失敗。macOS 與 Linux 保留原有行為。

## 風險及處理範圍

先前實作會將目標送入 PowerShell 的 `-Command` 入口，存在目標路徑被當成命令內容解析的風險候選。主要觸發點是 Windows 上成功交付後的 `deliver --open`，並非整個產生流程。即使明確指定輸出檔名，完整路徑仍包含工作目錄，因此不能單靠指定檔名排除風險。

`preview` 使用相同 launcher，但只接受受限制的 loopback URL；尚未確認相同注入鏈。此次一併停用這個自動開啟入口，避免保留 PowerShell 啟動路徑。

這次採取的是停用措施，沒有宣稱原實作已修好，也沒有宣稱已在 Windows VM 完成風險重現。使用者已決定暫緩相關資安實驗，待後續帳號方案與權限安排後再評估；此處不代表對任何平台申請資格或核准結果的保證。

## 自行驗證停用

在專案根目錄執行（需 Node.js）：

```sh
node --test .agents/skills/archify/test/open-artifact.test.mjs
```

測試以注入的 Windows 平台值及程序啟動監測函式，檢查一般路徑、特殊字元路徑與 loopback URL 全部回報停用，且程序啟動次數為零；另保留 macOS／Linux 參數傳遞與 URL 限制檢查。這是 JavaScript 入口測試，並非原生 Windows 端到端實驗，不會執行攻擊命令。

在 Windows 手動確認時，可對可信任圖表執行原本的 `deliver … --open` 或 `preview …`：預期產物／網址仍可取得，終端顯示 `disabled`，瀏覽器不會自動啟動。此手動步驟尚未於本輪執行。

重新啟用前，須先完成替代實作的安全審查、原生 Windows 正反案例驗證與文件更新。完整風險實驗暫緩；私有實驗資料放在已忽略的 `.proj.vuln.recur/`，不作為公開套件的一部分。註記風險或停用單一入口，不等於整個專案已取得公開發布的完整檢查結論。

## 本輪驗證紀錄

2026-09-13，macOS 上執行：opener 測試 4／4 通過，範本測試 22／22 通過，專案結構檢查通過。新增的停用測試在修改前會因程序啟動次數為 1 而失敗，修改後為 0。原生 Windows 手動驗證與 VM 風險實驗仍未執行。

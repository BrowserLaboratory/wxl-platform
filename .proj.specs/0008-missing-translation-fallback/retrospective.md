# 回顧：epic 0008（翻譯不存在時的保底）

日期：2026-11-06。依 `docs/agents/workflow.md` 的 Epic close-out 第 3 步執行。

範圍：epic 起點 `5d3c173`（epic 0007 收尾之後）到 T-0057 落地紀錄（`9ed47ef`）。

- **Ticket**：共 5 張（T-0053～T-0057），PR #50、#52、#54、#56、#58，全部 squash 合併；每張各有一個改 `done` 的紀錄 PR（#51、#53、#55、#57、#59）。
- **落地順序**：T-0053 → T-0054 → T-0056 → T-0055 → T-0057。T-0056 不依賴其他票（`blocked_by: []`），T-0055 只依賴 T-0054，T-0057 依賴 T-0055 與 T-0056 的雙輸入複製控制。
- **收尾 PR**：串連分析、這份回顧、HTML 證據報告、OQ-012 與 OQ-023 的處置，以及 pending ticket T-0058～T-0060。

## 結果

- **OQ-023 解決。** 只寫了英文版的題目，現在出現在繁中清單與首頁，帶「只有英文」標記；英文網址不再被導到 404；`/zh-TW/` 底下不存在的題目頁會落到英文頁，並顯示一行說明。T-0057 的第 8 階段在 fixture 題目 #999 上驗證，分別在 Cloudflare preview 與臨時 GitHub Pages 靶場上執行（`OPEN-QUESTIONS.md` OQ-023 的 Resolved 段落）。
- **第 8 階段**：
  - T-0053～T-0056 各自跑了負責的 V 列。
  - T-0057 跑完整份 V 表：V1a–V1l、V2、V3，全部通過。每一列都註明驗證面：Playwright headless Chromium，或內建瀏覽器並打開題目的 Browser 面板。
- **全套測試**：從 epic 起點的 131 個檔、4,559 個 case（T-0053 的基準），增加到 136 個檔、4,853 個 case（T-0057），1 個略過；site-smoke 86 項。
- **安全**：
  - 5 份 ticket 安全審查沒有確認任何漏洞。T-0057 的 S-1 屬穩健度，已修正。
  - 串連分析的 23 條候選串連都經獨立反駁，沒有跨越受保護的信任邊界，不需要開 ticket（`review/chain-analysis.md`）。
- **CI**：五張 ticket PR 中，只有 T-0055 的第一輪有兩項逾時要重跑，兩項都與變更無關：`door-is-open` 的 challenge-verify，以及 Windows 上 create-wxl 的 `bin.test.mjs`（T-0050）。

## 做得好的地方

| 觀察 | 證據 |
|---|---|
| V 表在第 2 階段就寫進 traceability：每一列寫明儲存值、請求和預期列號。第 8 階段因此可以逐列機械執行，每一列都有明確的通過條件 | `traceability.md` 的 V 表；T-0057 stage 8 的表格逐列對應 |
| 一個只有英文版的 fixture 題目（#999），每張票都放在拋棄式分支 `stage8/<id>` 上重用，驗完就刪，從不進 `main` | T-0053～T-0057 的 stage 8 紀錄；fixture 來源分支 `stage8-fixture/english-only`（`41b9dc7`） |
| 照 0007 回顧第 1 項，在第一張碰到部署的 ticket（T-0053）就在真實的臨時 GitHub Pages 靶場上確認：GitHub Pages 自己回 404 時，C1 仍能在 base `/<repo>/` 下接手 | T-0053 與 T-0057 的 V2 |
| 照 0007 回顧第 4 項，T-0056、T-0055、T-0057 的 PR 先開成 draft，第 8 階段紀錄寫完才轉 ready、才合併；T-0053、T-0054 的 PR（#50、#52）沒有走 draft | `gh api repos/BrowserLaboratory/wxl-platform/issues/<n>/timeline` 只在 #54、#56、#58 有 `ready_for_review` 事件 |
| T-0055～T-0057 的覆蓋率報告附「在 base 上會紅」的重現指令（R 列）與突變指令（M 列），證明測試真的能抓到問題；T-0053、T-0054 只有部分 | 例如 T-0057 的 R1–R3、M1–M5；T-0053 的建置後網站列寫明「were not seen red」 |
| 串連分析由兩位 finder 從不同角度出發，再加上逐條反駁與完整性檢查。完整性檢查找出 9 項盤點遺漏，也指出一個反駁理由的前提不成立（N-1） | `review/chain-analysis.md` 的 M1–M9、N-1 |
| T-0057 的第 8 階段把 V1b–V1h、V1j、V1k 與 V3 寫成 Playwright 腳本，每一列開新的 context、先設定儲存值；需要 Browser 面板或 GitHub Pages 的列（V1a、V1i、V1l、V2）仍在內建瀏覽器操作 | `v1-rows.cjs`、`v3-switch.cjs`、`v3-menus.cjs`（T-0057 stage 8） |

## 要改的地方

| # | 觀察 | 證據 | 提案 |
|---|---|---|---|
| 1 | 第 6 階段的 workflow 腳本從上一張票重用時，帶著上一張票的 prompt 啟動，要立刻停掉、重新啟動。本 epic 發生兩次：T-0057 有紀錄，T-0055 的那次沒有寫進 ticket | T-0057 stage 6「a first launch that reused T-0055's prompt was stopped at once」 | 第 6、7 階段的 workflow 腳本只用 `args` 帶入 ticket id、packet 路徑與 spec 列號，prompt 本身不寫死任何 ticket；屬通用流程，提給 harness-agile |
| 2 | 第 8 階段的 V 列腳本放在 session 的 scratchpad，session 結束就不見了；T-0053～T-0056 的大多數 V 列在內建瀏覽器裡一列一列手動操作，只有 T-0055 起的 V3 選單隱藏改用 `v3-menus.cjs` | T-0057 stage 8 只能寫「Scripts are in the session's scratchpad」 | 把 V 列腳本收進 repository（例如 `tests/stage8/`，以 origin 為參數，不進 CI），下一個 epic 的第 8 階段直接沿用；屬 wxl 專屬，下一個 epic 的第 4 階段排進 ticket |
| 3 | 第 8 階段順便看到繁中清單的工具列在 hydration 後仍是英文。placeholder 的部分 2026-10-10 就記錄在元件註解裡，卻沒有任何測試、V 列或 ticket 涵蓋 | T-0057 stage 8「Seen in passing」；`ChallengeList.vue:28-35`；T-0060 | 已開成 pending ticket T-0060。靜態 HTML 以 `en` 建置，要正確的字串必須用頁面語系解析：之後新增介面字串時，review 要檢查它用的是 `tp` 還是 `$t` |
| 4 | T-0057 的安全審查（S-3、S-4）與串連分析 C-3 都把「hook 與 CI 會擋」當成作者內容的守門，但 GitHub Pages 範本的部署不跑測試，hook 要 `pnpm install` 後才安裝 | `review/chain-analysis.md` N-1；`scripts/templates/deploy.yml.template:98-105`、`package.json:41` | 下一份 spec 的信任邊界要寫明守門的實際範圍（哪一條 workflow、哪一個 hook，在什麼條件下會跑），不要只寫「hook 與 CI」 |
| 5 | T-0055 的 ticket 正文在開工前已經過時，要先修正：D7、旗標與隱藏規則已隨 T-0053 落地 | T-0055 stage 5 紀錄「its body corrected first」（ticket `:54`） | 一張票被前一張票改變前提時，在前一張票落地的紀錄 PR 裡一併更新後續 ticket 的正文；屬通用流程，提給 harness-agile |
| 6 | 內建瀏覽器裡，依截圖座標點擊有時沒點到選單項目，改用 `find` 取得的 ref 才可靠；`localStorage` 的鍵名是 `wxl-locale`，第一次查詢時寫成 `wxl:locale` | 本 session 的 V2 操作 | 寫進 `docs/agents/platform-notes.md`：選單項目一律用 ref 點擊；語系偏好的鍵名 |

## 採用情況

使用者 2026-11-06 的常設指示是「以下後續問題都按照建議」。依此處理如下：

| # | 落點 |
|---|---|
| 1 | harness-agile 的提案（通用流程），在這個 repo 不另外改 |
| 2 | 下一個 epic 的第 4 階段，把 `tests/stage8/` 排成一張 ticket；這份回顧就是紀錄 |
| 3 | pending ticket T-0060 |
| 4 | 下一份 spec 的第 2 階段照做；這份回顧與 `review/chain-analysis.md` N-1 是紀錄 |
| 5 | harness-agile 的提案（通用流程） |
| 6 | `docs/agents/platform-notes.md`，這個收尾 PR 一併更新 |

## ADR 與 open question

- **OQ-012** 已解決：保留 hold，並記錄理由。理由是：導向和那一行是同一次到達的結果，要等 session 有了決定之後一起定案；而且學習者的回答本身就決定要不要導向，選 `cleared` 會重新載入網站根目錄，不執行導向。這個理由已寫進 `OPEN-QUESTIONS.md`，也寫進 `.vitepress/theme/index.ts` 的註解。
- **OQ-023** 已解決（見上方「結果」）。
- **Pending ticket**：
  - T-0058：pre-commit hook 的三個既有問題。
  - T-0059：redirect 產生器不檢查 slug 文法。
  - T-0060：繁中清單的工具列字串。
- **ADR 候選**：沒有新的。spec 0008 的決策 D1–D17 留在 traceability；需要長期遵守的規則已經在 ADR-0006（gate 是通知），以及 stage 1 確立的「翻譯是選擇性的」（ADR-0008）。

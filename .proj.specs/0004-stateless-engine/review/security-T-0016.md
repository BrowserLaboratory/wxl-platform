# 第 7 階段資安審查：T-0016

範圍：分支 `tickets/T-0016/documents-and-epic-verification`，base `ba095c5`（審查時為尚未 commit 的 WIP）。這張 ticket 只改文件：`README.md`、`README.en.md`、`GLOSSARY.md`、`.proj.specs/OPEN-QUESTIONS.md`，以及兩份 `wxl-fork-init/SKILL.md`。審查時以 `scripts/fork-init.ts` 的實際行為為準，檢查文件是否描述正確。

方法：專案 `security-review` skill。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入的可利用缺陷：0 項。** 候選 11 項，獨立篩選判定沒有一項含不受信任的輸入或可利用的攻擊路徑：CLI 的參數來自老師本人，而且每個會改動檔案的分支都會印出警告。保留在本報告的只有 1 項；另外 10 項都是文件與 CLI 行為不符，篩選判定不屬於資安問題，但已在第 6 階段一併修正。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | skill 寫成 `--host cloudflare-pages` 會移除既有的 workflow，但 CLI 只移除與範本相同的那份 | 文件不符、非資安 | 已修 |
| 02 | skill 寫成 GitHub Pages 下既有 workflow 一律保持原樣，但已知舊版輸出會被取代 | 文件不符、非資安 | 已修 |
| 03 | README 寫成只有帶 `--host github-pages` 才安裝 workflow，但不帶 `--host` 時 workflow 不存在也會安裝 | 文件不符、非資安 | 已修 |
| 04 | README 與 OQ-005 寫成省略 `--origin` 就不改，但 `--host github-pages` 下每次都會重新推導並覆寫（有警告） | 文件不符、非資安 | 已修 |
| 05 | OQ-018 把 service worker 寫成以整個 origin 為 scope 註冊；實際以 base 路徑註冊，風險在 user site 的 SW scope 涵蓋同 owner 的專案站（spec B5），且瀏覽器儲存空間本來就以 origin 共用 | 保留：既有暴露，紀錄的前提錯誤會誤導日後的隔離設計（P2，mixed） | 已修正 OQ-018 的 Evidence 與 Options |
| 06 | skill 的殘留檢查只 grep 四個檔案 | 駁回：範圍是 T78 規定的字串 | — |
| 07 | rebrand 模式不能帶 `--host`，文件沒說明它會裝回 workflow | 文件缺漏、非資安（既有行為） | 已補上 rebrand 的指引 |
| 08 | Cloudflare 子路徑步驟斷言網站一律從 `/` 提供，沒提醒刪除先前設定的 `SITE_BASE` | 文件過度保證、非資安 | 已修 |
| 09 | `--base none` 被描述成清掉 base 宣告 | 文件不精確、非資安 | 已修 |
| 10 | OQ-004 的 Evidence 把 current 狀態也算成會警告 | 紀錄不精確、非資安 | 已修 |
| 11 | 站名上限寫成 60 個字元，引擎以 code point 計算 | 極低、非資安 | 已修 |

## 沒有涵蓋

dependency scanning、可用性、低嚴重度 hardening。第 8 階段（S7 的兩份匯出）在 commit 之後執行，不在本報告範圍內。本報告不代表整個專案沒有安全問題；跨 ticket 的 chain analysis 在 epic 收尾時進行。

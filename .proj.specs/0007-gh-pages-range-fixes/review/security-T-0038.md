# T-0038 安全審查報告（stage 7）

## 範圍

- **Ticket**：T-0038「create-wxl and fork:init describe the origin as the range's address」（epic 0007，passage P3 的 create-wxl 與 fork:init 部分）
- **Base**：`707be5f`（origin/main，已含 T-0030、T-0031、T-0032、T-0036）
- **HEAD**：`707be5ff1deb5f7d0d0b6852ef1833417665b7bb`。實作尚未 commit，審查對象是 worktree 裡的待 commit 變更。
- **Branch**：`tickets/T-0038/origin-wording-in-create-wxl-and-fork-init`
- **Worktree**：`/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0038`
- **審查的待 commit 檔案**（`git diff --stat 707be5f`）：
  - `create-wxl/src/messages.mjs`（`S6-ORIGIN` 的 en 與 zh-TW 兩行）
  - `create-wxl/src/questions.mjs`（:200 附近的註解）
  - `create-wxl/test/messages.test.mjs`（新增 2 個 case）
  - `scripts/fork-init.ts`（usage 註解、內部註解、A8 警告字串）
  - `tests/unit/scripts/fork-init.test.ts`（helper `expectRangeAddressWording`，加在 3 個既有 A8 警告 case）
  - `.proj.tickets/0007-gh-pages-range-fixes/T-0038-origin-wording-in-create-wxl-and-fork-init.md`（ticket 紀錄）
- **信任邊界**：這次變更只改 Node CLI 印出的固定字串與註解，不新增任何輸入、讀取或寫入路徑。B1–B5 都沒有新的資料流；B4（built site 到學員螢幕）沒有碰到。本 epic 沒有碰任何題目刻意設計的漏洞，ADR-0005 不適用。
- **流程**：一位 reviewer 唯讀找出候選，每個候選再由 skeptic 嘗試反駁；medium 以上需三位中至少兩位認定為真，low 需一位中一位認定為真，才算成立。

## 結論摘要

| # | 候選 | 位置 | 嚴重度 | Skeptic 判定 | 處置 |
|---|---|---|---|---|---|
| S1 | （既有行為）A8 警告以 `JSON.stringify` 印出舊值，DEL、C1 與 bidi 字元不會被跳脫 | `scripts/fork-init.ts:1486`（輸出在 `:1777`） | low | 0/1 | 駁回，不修改 |

沒有任何候選成立，stage 7 沒有修改程式碼。這份報告只說明審查過哪些地方、得到什麼結果，不代表這個專案已經安全。

## 逐項說明

### S1：A8 警告印出的舊值不跳脫 DEL、C1 與 bidi 字元（駁回）

- **位置**：`scripts/fork-init.ts:1486`，`` `A8: ${SHORT_LINK_REL} changes from ${JSON.stringify(oldValue)} to ${JSON.stringify(finalOrigin)} — ` ``。資料來源與輸出：
  - `:1464`：以 `latin1` 讀入 `.vitepress/challenge/shortLink.ts`
  - `:1479`：`evalJsStringLiteral(valueMatch[1])` 把既有的 `SITE_ORIGIN` 字面值解碼成 `oldValue`
  - `:1480`：`oldValue` 不等於新值也不等於 upstream 值時才發警告
  - `:1777`：CLI 以 `console.log` 印出每一則警告
- **嚴重度**：low。**類別**：終端機控制字元注入（CWE-150）。**信心**：低。
- **攻擊者前提**：能改老師 repository 裡的 `.vitepress/challenge/shortLink.ts`，讓 `SITE_ORIGIN` 的字串字面值含有 U+007F、U+0080–U+009F（例如 U+009B CSI）或 bidi 控制字元，例如老師合併了惡意 PR，或從被竄改的 fork 開始。老師接著執行 `pnpm fork:init --origin …`（或 `--host github-pages` 讓 origin 被推導出來）。
- **資料流**：檔案內容 → `latin1` 讀入 → `evalJsStringLiteral` 解碼 → `JSON.stringify(oldValue)` → 警告字串 → `console.log` 到老師的終端機。`JSON.stringify` 只跳脫 U+0000–U+001F、`"` 與 `\`，DEL、C1 與 bidi 字元會原樣印出。
- **影響**：推測。若終端機把 C1 的 CSI 當成控制序列，警告的顯示內容可能被改寫；bidi 字元可能讓舊值看起來和實際不同。不會改變 fork:init 寫入的內容。
- **證據**：只有讀程式碼的推論，沒有實際重現，也沒有確認各終端機怎麼處理 C1 字元。
- **修正建議**：在印出前改用和 create-wxl `text.mjs` 一樣的跳脫規則（同時跳脫 DEL、C1 與 bidi 字元）。
- **Skeptic 判定（0/1，駁回）**：
  - 有問題的運算式不在這次變更內。在 review packet 的 diff 中，`${JSON.stringify(oldValue)} to ${JSON.stringify(finalOrigin)} — ` 這一行沒有 `+`/`-`，是未改動的 context。T-0038 只換掉警告尾段的固定字串（從 "a custom short-link origin" 改成 "a custom range address (SITE_ORIGIN, the origin of every copied link)"），新字串裡沒有受攻擊者控制的內容。讀取（`:1464`）、解碼（`:1479`）、觸發條件（`:1480`）和輸出（`:1777`）在 `707be5f` 都已存在，這條路徑在變更前後同樣可達。
  - spec 沒有對 fork:init 警告訂跳脫規則。D10（`traceability.md:40`）講的是 `SITE_ORIGIN` 與實際網址不一致列為已知代價；`SITE_ORIGIN` 的 vocabulary（`traceability.md:80`）也沒有規定跳脫。create-wxl 的 `text.mjs` 是 create-wxl 自己的實作慣例。
  - 前提已經等於能在老師機器上執行程式碼：能改 `shortLink.ts` 的人也能改老師接著要執行的 `scripts/fork-init.ts` 與 `package.json` scripts。終端機顯示被改寫不會在 B1–B5 上帶來新的影響。
- **處置**：駁回，不修改。統一 fork:init 與 create-wxl 的跳脫規則可以另外登記成後續改善，不屬於 T-0038。

## stage 6 與 stage 7 執行者的補充檢查

- stage 6 沒有成立的 finding，所以這兩個 stage 都沒有修改程式碼。
- 確認變更只動到字串與註解：`git diff 707be5f -- scripts/fork-init.ts | grep '^[-+]' | grep -v '^[-+] *\(\*\|//\|/\*\*\)'` 只剩 A8 警告字串那幾行（ticket 的 stage 5 紀錄 row 3）；`git diff 707be5f -U0 -- create-wxl/src/messages.mjs` 只有兩行 `'S6-ORIGIN'`。
- 新增的字串值仍經過 `jsonValue` 印出：`create-wxl/test/messages.test.mjs` 的新 case 用含 `"` 的 origin 檢查這一點。
- anchor 檔案沒有被動到：`git diff --exit-code 707be5f -- .vitepress/challenge/shortLink.ts .vitepress/config.mts` → exit 0。
- 2026-10-23 重跑的測試指令與結果記在 ticket 的「2026-10-23 — code review (stage 6)」。

## 審查範圍的限制

reviewer 自述的限制如下（原文照錄）：

- 沒有執行任何指令或測試。所有結論都來自讀程式碼推理，沒有實際重現。Git 範圍完全取自 parent 提供的封包，沒有自己跑 git diff 確認。
- 沒有做相依套件掃描（create-wxl 的 lockfile 與 root 的 node_modules 都沒查）。
- 沒有評估 DoS、rate limiting 或資源耗盡。
- 沒有審查未修改的程式碼，只為了追資料流而讀；例如 A8_VALUE_RE、evalJsStringLiteral、utf8AsLatin1、a8LineFor 的正確性都沒審。
- 沒有審查 README、skills、GLOSSARY 等歸 T-0039 的內容，那些地方仍留有 "short-link origin" 字樣，屬於另一張 ticket。
- 沒有做跨 ticket 的 chain analysis，那是 epic close-out 的步驟。
- 沒有確認各終端機實際會怎麼解讀 C1 字元（U+009B 等），所以唯一候選的影響只是推測。
- 沒有瀏覽器表面：這些字串都是 Node CLI 輸出，B4（built site 到學員螢幕）在這次變更中沒有新的資料路徑。

stage 7 執行者補充：本報告沒有做相依套件掃描、模糊測試或動態分析，S1 也沒有實際重現。

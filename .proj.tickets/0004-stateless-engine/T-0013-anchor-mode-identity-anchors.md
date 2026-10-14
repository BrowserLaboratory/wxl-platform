---
id: T-0013
title: Rewrite only identity anchors in anchor mode
epic: 0004-stateless-engine
status: todo
blocked_by: [T-0012]
---

## Context

Without `--rebrand`, today's engine replaces the upstream repository slug in every text file, rewriting the changelog's history and anything else that mentions it, and resets the version on every run.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

In anchor mode the engine no longer walks the tree: A1 is edited structurally (URLs and `author` every run; `version`/`license` only on first conversion; `name`/`description` when given), and A2–A5 replace whatever repository slug their form holds. Every other file is byte-identical. Each changed file goes through `<file>.fork-init-tmp` and a rename, and `.gitignore` ignores the temporary name; a write failure is a tree error asking for a re-run. The three scan-driven fork-init tests are rewritten as the overridden-contracts table says.

## Acceptance criteria

- [ ] T1–T5: doc anchors, untouched files and bytes (S1)
- [ ] T11: CRLF for doc anchors and the manifest (S1)
- [ ] T14–T15: `name`/`description`, first conversion (S1)
- [ ] T55: write failure in anchor mode (S1)
- [ ] T60: the three scan-related overridden tests rewritten; the others pass unchanged (S1)
- [ ] T83: fork-init.ts scan comments (S9)
- [ ] T84: `.gitignore` (S9)

## 給使用者（zh-TW）

不帶 `--rebrand` 時，引擎不再掃全樹，只改身分定位點：package.json 結構化改寫（版號只在第一次轉換時重設）、README 與 CONTRIBUTE 的四種網址格式不論原本是誰的 slug 都換成新的；CHANGELOG 等其他檔案一個 byte 都不動。寫入經暫存檔再 rename。掃描相關的三支舊測試依 override 改寫。

## Comments

### 2026-10-14 — test plan table (approved by the user before the first test)

Approved together with these decisions (user, 2026-10-14): the engine may import the `yaml` package and S2 links the repository's `node_modules` (Q1 A); the deploy template is not changed again in this epic (Q2 A); T-0014 adds the verbatim copy `tests/unit/workflows/fixtures/deploy-template-72327e2.yml` and T-0011 only pins it (Q3 A); spec and traceability revision 2.1 (end of file is an end of the line, white space after a form is not; an A8 value followed by `;` does not parse; S5 gains the expectation check); and the interpretations listed in each table's notes, with the claim additions below. Where a note says "needs the user's decision", the user's approval of the list settles it as the note recommends.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0004-S1 | A2：徽章行裡每個 `https://github.com/<owner>/<name>/actions/workflows/quality-gates.yml` 都換成新 repository slug，檔案其他 byte 不變（`it.each` 跑三種原 slug） | `tests/unit/scripts/fork-init.test.ts` 新增 describe `runForkInit — anchor mode: doc anchors`。用專用 fixture：`README.md`、`README.en.md` 各有一行徽章。參數 `--author me --repo me/myfork`（不帶 `--base`） | T1 / AC-A1 | 原 slug 分三種：上游的 `BrowserLaboratory/wxl-platform`、靶場先前的 `old-owner/old.range_1`、已經是新的 `me/myfork`（此時檔案不寫入、mtime 不變、不在 `changedFiles`）。徽章行的兩處（圖片 URL 後接 `/badge.svg`、連結）都要換。owner 含 `-`、name 含 `.` 與 `_` 照樣辨識。owner 超出萬用字元（`bad_owner`、`-x`）不算出現處，保持原樣 |
| 0004-S1 | A3：兩個 README 的 `git clone https://github.com/<owner>/<name>.git` 在行尾時換成新 slug | 同上 describe | T1 / AC-A1 | 兩個檔案都測。形式後面還有字（` mydir`、尾端空白）就不算出現處，保持原樣。name 含 `.` 時 `.git` 要正確回溯（`old.range.git`）。檔案最後一行沒有換行的情況見 Notes 5 |
| 0004-S1 | A4：`CONTRIBUTE.md` 的 `git remote add upstream https://github.com/<owner>/<name>.git` 在行尾時換成新 slug | 同上 describe | T1 / AC-A1 | 縮排三個空白（跟真實檔案的編號清單一樣）、tab 縮排、不縮排。形式後面還有字就不算。形式前面有非空白字元的情況見 Notes 5 |
| 0004-S1 | A5：`CONTRIBUTE.md` 的 `(https://github.com/<owner>/<name>/issues)` 換成新 slug，括號也要保留 | 同上 describe | T1 / AC-A1 | 以 Markdown 連結 `[GitHub Issues](…)` 的形式出現。沒有括號的 `https://github.com/o/n/issues`、`(…/issues/12)`、`(…/issues/new)` 都不算 |
| 0004-S1 | 同一個檔案混合多種形式、多種原 slug：所有出現處都變成新 slug，形式以外的 byte 完全不變。期望值用手工逐字建立，不用程式產生 | 同上 describe | T1, T4 / AC-A1, AC-A2 | 散文裡直接寫的上游 slug、`https://github.com/BrowserLaboratory/wxl-platform/pulls`、別的 workflow 徽章（`…/workflows/release.yml`）、中文內容都保持原樣 |
| 0004-S1 | doc anchor 沒有出現處，或檔案不存在時，發出含 anchor id 與相對路徑的警告，執行繼續（`it.each` 跑 A2:README.md、A2:README.en.md、A3:README.md、A3:README.en.md、A4:CONTRIBUTE.md、A5:CONTRIBUTE.md 六組） | 同上 describe | T2 / AC-A1 | 檔案在但沒有形式、檔案不存在都測。缺 `README.md` 時 A2 與 A3 各發一則警告。`exitCode` 0，其他 anchor 與 manifest 照樣寫入。警告文字不得含 `github-pages`（見 Notes 7） |
| 0004-S1 | A1–A9 檔案與 workflow 以外的檔案，byte 與 mtime 都不變。整棵樹的檔案清單只會多出 `.github/workflows/deploy.yml`，也不會留下任何 `*.fork-init-tmp` | 新增 describe `runForkInit — anchor mode: untouched files`。用共用 fixture 再加檔案。執行前先用 `utimesSync` 把每個檔案的 mtime 調到過去 | T3 / AC-A2 | 非 anchor 檔案裡出現 anchor 形式也不動：`CHANGELOG.md` 含 A5 形式與 PR 連結、`docs/README.md` 與 `platform/challenge/x/README.md` 含 A3 形式、`README.md.bak`。另外 `.gitignore`、兩棵 skill 樹、`release.yml`、i18n、`pnpm-lock.yaml`、`.vitepress/dist-notes.md`、`.vitepress/dist/old.html`、二進位檔、CRLF 檔都不動。排序後的 `changedFiles` 只能是 {`package.json`, `README.md`, `README.en.md`, `CONTRIBUTE.md`, `.github/workflows/deploy.yml`} 的子集 |
| 0004-S1 | manifest 依 T4 重新序列化：兩空白縮排的 JSON、結尾換行、LF，A1 以外欄位的值不變（以 deep-equal 比較） | 新增 describe `runForkInit — anchor mode: manifest` | T4 / AC-A2 | 原檔是四空白縮排、tab 縮排、單行壓縮、沒有結尾換行時，都輸出兩空白加 `\n`。`"caf\u00e9"` 這類 escape 的值相等即可，byte 可以不同。`scripts`、`dependencies`、巢狀物件、`private: true` 的值不變。已是標準格式且值都不變的 manifest 不寫入，mtime 不變 |
| 0004-S1 | 沒有設值的 code anchor 不動，也不必存在：不帶 `--base`/`--host` 時，config、兩個首頁、短連結模組的 byte 與 mtime 都不變，也沒有提到 A6–A9 的警告或錯誤 | `runForkInit — anchor mode: untouched files` | T5 / AC-A2 | 這些檔案分四種狀況：值有效；值無法解析（`  title: siteTitle,`、`  name: \|`）；有兩條候選行；檔案不存在。A9 側：config 有 A9 加 `  base: siteBase,`、舊的 `??` 行、沒有 base 行。四種狀況都要 `exitCode` 0、byte 不變。config 的 `socialLinks` 保留上游 slug |
| 0004-S1 | CRLF 的 doc anchor 跟 LF 一樣辨識，寫出的行保留 CRLF，其他 byte 不變 | `runForkInit — anchor mode: doc anchors` | T11 / AC-A6 | A3、A4 在 `\r\n` 之前也算行尾。A2、A5 也在 CRLF 檔裡測。同一個檔案 LF 與 CRLF 混用時，每一行保留自己原本的換行 |
| 0004-S1 | CRLF manifest 照 T4 處理：第一個換行是 CRLF 時整份輸出 CRLF，否則輸出 LF | `runForkInit — anchor mode: manifest` | T11, T4 / AC-A6 | 全部 CRLF、第一行 LF 但後面 CRLF（輸出 LF）、單行沒有換行（輸出 LF） |
| 0004-S1 | 迴歸防護：rebrand 模式的 CRLF manifest 照舊寫成 LF。確認 CRLF 規則沒有漏進 rebrand 模式 | `runForkInit — B mode` | T11 的模式範圍（T51 列出的差異只有 A9） / AC-B2 | `B_ARGS` 搭配 CRLF manifest |
| 0004-S1 | `--name`、`--description` trim 後非空就寫入 trim 後的值；trim 後為空或沒給就不變（`it.each` 兩個旗標分別跑） | `runForkInit — anchor mode: manifest` | T14 / AC-A7 | `'  x  '`、`'\u3000x\u3000'` 都寫成 `x`。`''`、`'   '`、沒給旗標時都不變。含 `"`、`\`、`</script>` 的值經 JSON 寫入後，parse 回來要相等 |
| 0004-S1 | 迴歸防護：rebrand 模式照舊處理 `--name`，不 trim | `runForkInit — B mode` | T14 的模式範圍（字元規則：trim 只在 anchor 模式） / AC-B2 | `B_ARGS --name '  pkg-x  '` 寫入 `'  pkg-x  '`，與 C-8 的處置一致 |
| 0004-S1 | 首次轉換時 `version` 設為 `0.1.0`、`license` 設為 `ECL-2.0`（`it.each` 跑各種 `repository` 形狀） | `runForkInit — anchor mode: manifest` | T15 / AC-A8 | 算首次轉換：`{ type: 'git', url: 上游 }`、`{ url: 上游 }`。不算：url 大小寫不同、少了 `.git`、少了 `git+`、有尾端空白；`repository` 是字串（就算等於上游 URL 也不算，而且判斷要在 T13 把它轉成物件之前）、`null`、不存在；靶場自己的 URL |
| 0004-S1 | 不是首次轉換時 `version` 與 `license` 不變，但三個 URL 與 `author` 每次都會改寫 | 同上 describe | T15 / AC-A8 | `version: '0.3.2'`、`license: 'MIT'` 保留。`version`、`license` 本來就沒有時維持沒有。從靶場先前的 slug 改名到新 slug 時，URL 跟著 `--repo` 改。首次轉換後老師手動升到 `0.2.0`，再跑一次相同指令仍是 `0.2.0` |
| 0004-S1 | 寫入失敗：`exitCode` 1，`message` 用 `/` 寫出檔案的相對路徑，並含 `run the same command again`。已寫入的檔案保留，恢復權限後重跑會收斂 | 新增 describe `runForkInit — anchor mode: write failure`，`it.skipIf(process.platform === 'win32' \|\| process.getuid?.() === 0)`；`afterEach` 先把權限改回來再 `rmSync` | T55 / AC-E1 | 用共用 fixture：`README.md` 設 0444、projectRoot 設 0555，參數 `--author me --repo me/myfork`。不假設寫入順序，改斷言：每個檔案若不是原 byte 就是完整的新 byte；`message` 點名的檔案仍是原 byte；任何目錄都沒有 `*.fork-init-tmp`。恢復權限後用同參數重跑：`exitCode` 0，且整棵樹與在全新 fixture 上跑一次的結果 byte 相同 |
| 0004-S1 | 改寫被 override 的測試 "rewrites package.json identity and leaves no upstream slug"：manifest 斷言照舊；README 的 A2（兩處）與 A3、CONTRIBUTE 的 A4 與 A5 都帶 `me/myfork`，兩個檔案都不再有上游 slug；config 的 `socialLinks` 那一行與原 fixture 相同 | A-mode describe 原位置（標題見 Notes 13） | T60 / AC-E4 | `A_ARGS` 帶 `--base /myfork/`，所以 config 只有 base 行會變（過渡期行為，見 Notes 1）；`socialLinks` 只比對那一行 |
| 0004-S1 | 改寫被 override 的測試 "rewrites the upstream slug in CHANGELOG.md — scan-driven, not a hardcoded file list"：anchor 模式下 `CHANGELOG.md` 的 byte 完全不變 | A-mode describe 原位置 | T60, T3 / AC-E4 | 用 `A_ARGS`；比對 byte 與 mtime |
| 0004-S1 | 改寫被 override 的測試 "does not treat an active .vitepress/dist-* sibling as build output (path-segment boundary)"：斷言不變，參數改用 `B_ARGS`（只有 rebrand 模式會走整棵樹） | 移到 `runForkInit — B mode` describe，或留在原位只換參數 | T60 / AC-E4 | `dist-notes.md` 換成新 slug；`dist/old.html` 保留上游 slug |
| 0004-S1 | 其他既有 fork-init 測試的內容不改、全部通過。包括：8 個 parse 測試（含 T-0012 加入或改寫的）；A-mode 剩下的測試，也就是 5 個 base 測試、tag-rule 兩個、"does not clobber…"、"sets package.json description only when…"、"A mode produces no residual inventory"；14 個 B-mode 測試；skill 測試；dry-run 測試 | `tests/unit/scripts/fork-init.test.ts` 全檔 | T60 / AC-E4 | 5 個 base 測試與 `--base none` parse 標題屬於 T-0014，這張票必須讓它們原封不動地通過（見 Notes 1） |
| 0004-S9 | T83 中 fork-init.ts 與掃描相關的註解：每個字串都跑 `grep -qF -- "<string>" scripts/fork-init.ts && echo present \|\| echo absent`，結果記在 ticket | `scripts/fork-init.ts` | T83 / AC-D4 | 必須不存在：`A + B on every active text file`。再複查 `minimal fork: identity fields, base, upstream-slug swap` 與 `A + deterministic rename`：如果 T-0012 沒清掉，就由本票清掉並記錄（見 Notes 10）。`clobbers a customized deploy.yml`、`collapse the whole line to a`、`null = remove (--base none)` 屬於 T-0014，本票不檢查 |
| 0004-S9 | 根目錄 `.gitignore` 含 `*.fork-init-tmp`：`grep -qF -- "*.fork-init-tmp" .gitignore`，結果記在 ticket | `.gitignore` | T84 / AC-D4 | 真實 repo 的根目錄 `.gitignore`。測試 fixture 裡的 `.gitignore` 依 T3 不能被引擎改動 |

**Notes**

1. **過渡期的 `--base` 一定要保留（範圍風險）。** T-0013 拿掉 anchor 模式的整棵樹掃描後，還是得對 config 套用今天的 `setViteBase`（只套 base，不換 slug，同樣經由暫存檔加 rename 寫入）。否則屬於 T-0014 的 5 個 base override 測試會在這張票失敗，違反「其他測試內容不改」。代價是：帶 `--base` 時 config 在 A9 以外的 base 行會變，嚴格來說到 T-0014 之前都不符合 T4。T3 與 T5 的測試因此一律不帶 `--base`。
2. **追溯缺口：** 本票宣稱涵蓋 T4，但 T4 裡「A6–A9 檔案的 anchor 被設值時，anchor 以外的 byte 不變」這部分，在 T-0013 沒有任何旗標可以設值，所以測不到。T11 對 A6–A8 的 CRLF 也一樣：T-0014 只認領 T11 的 A9 部分，T-0015 只認領 T8–T10，沒有任何票認領 T4 與 T11 的 A6–A8 部分。建議 T-0015 加上 T4 與 T11（A6–A8），T-0014 加上 T4（A9 檔案）。
3. **T55 的「已寫入的檔案保留」很難直接觀察。** T-0013 能寫的 anchor 檔案（A1–A5）都在根目錄。根目錄設 0555 後，第一個根目錄寫入就會失敗；只有 workflow 在子目錄，可能比它早寫入。所以表中改用「每個檔案若不是舊 byte 就是新 byte，加上重跑會收斂」這種不依賴順序的斷言。T55 在 Windows 與 root 下會跳過，所以 T72 的 Windows 跨 OS job 跑不到失敗路徑。permission bits 的保留與暫存檔寫入依 S1 決議不觀察，也不另寫「目錄可寫但檔案 0444 時照樣成功」的測試。
4. **fixture 要改的地方。**
   - 共用 fixture 的 `README.md` 加入 A2 徽章行（兩處），`CONTRIBUTE.md` 加入 A5 形式（照 T60）。
   - T5 用的兩個首頁與短連結模組，可以放進共用 fixture，也可以放在專用 fixture。
   - config 裡的 A9 加 `base: siteBase`、會推導 SITE_BASE 的範本、舊 config 形狀轉成 T18 fixture，都留給 T-0014，這樣 5 個 base 測試與 "inventories the tool-created deploy.yml" 才能維持原狀。範本保留 `# WXL fork deploy` 那一行。
   - 建議共用 fixture 也加一份含 A2 與 A3 的 `README.en.md`，讓每次跑共用 fixture 不會多出 T2 警告。不過這超出 T60 列出的清單，要請使用者決定。
5. **辨識規則有歧義，寫邊界測試前要先決定。**
   - A3 沒說形式必須在行首。A4 寫了「允許前導縮排」，意思可能是形式之前只能有空白，那 `- git remote add …`、`$ git clone …` 算不算出現處？
   - 檔案最後一行沒有換行時，EOF 算不算 T1 說的「行尾」？
   - 尾端空白算不算行尾？這份計畫暫定不算。
6. **殘留的 `<file>.fork-init-tmp`：** 前一次執行中斷留下的暫存檔，屬於 A1–A9 以外的檔案，依 T3 應該 byte 不變；可是引擎會覆寫自己的暫存檔名，再把它 rename 掉。依 B2，這是「引擎自己的暫存檔」，不受 T3 保護。這點需要在 traceability 寫清楚，本計畫不為它寫測試。
7. **警告文字的風險：** 既有測試 "does not repeat the tag-rule warning when deploy.yml already matches" 斷言第二次執行沒有任何警告含 `github-pages`，所以 T2 警告的文字不能含這個字串。也最好不要含 `deploy.yml`，否則 "does not clobber…" 那條 `some(w.includes('deploy.yml'))` 斷言會被別的警告湊巧滿足，等於沒驗到東西。
8. **測試位置：** 新的 S1 測試全部放在 `tests/unit/scripts/fork-init.test.ts`，不另開新測試檔。理由有二：上游 slug 的字面值只能出現在 keep list 列出的 fork-init 測試檔；T72 的跨 OS job 只跑這個檔案。`UPSTREAM_SLUG` 要到 T-0011 才會 export，在那之前這個檔案直接寫字面值。
9. **mtime 的精度：** 有些檔案系統的 mtime 只到 1 秒（例如 HFS+）。比對前先用 `utimesSync` 把 mtime 調到過去，才能確實偵測到「沒有寫入」。
10. **T83 與 T-0012 重疊：** T-0012 認領 fork-init.ts 的「mode comments」，而 `minimal fork: identity fields, base, upstream-slug swap` 與 `A + deterministic rename` 既是 mode 註解，也在描述掃描。由實際刪掉它們的那張票記錄。deploy 區塊的註解把「transformed like any active file」（掃描）跟 `never clobbers a customized deploy.yml`（T-0014 禁用的字串）寫在同一段；本票只改掃描那部分，`clobbers` 留給 T-0014。
11. **前置條件：** 本計畫假設 T-0012 已經合併：tree error 的 `exitCode` 1 模型、`/` 路徑、manifest 的 T12 與 T13 都已存在。如果 T-0012 改了共用 fixture 或 `A_ARGS`，開分支後要以合併後的 main 重新定基準。
12. **不在本票範圍、這裡不測：** T6（收斂）、T7（第二次相同執行）、T56（anchor 模式 dry-run）屬於 T-0015。不過本票實作的「內容沒變就不寫入」，已經由 T1「原 slug 已是新的」與 T4「manifest 已是標準格式」兩個邊界涵蓋。
13. **標題要改：** 被 override 的測試標題 "rewrites package.json identity and leaves no upstream slug" 在新契約下不成立（config 的 `socialLinks` 保留上游 slug）。建議改成 "rewrites package.json identity and the A2–A5 forms; keeps the config's socialLinks"，CHANGELOG 那支也要改標題。traceability 是用標題指稱既有測試，所以改名要記在 ticket，coverage 表引用新標題。
14. **全套測試：** `pnpm test --run` 要維持全綠。`tests/unit/workflows/*.test.ts`、ShortLinkShare、MergedNav、ChallengeList 的元件測試，這張票都不碰，照舊通過。

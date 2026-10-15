---
id: T-0013
title: Rewrite only identity anchors in anchor mode
epic: 0004-stateless-engine
status: done
blocked_by: [T-0012]
---

## Context

Without `--rebrand`, today's engine replaces the upstream repository slug in every text file, rewriting the changelog's history and anything else that mentions it, and resets the version on every run.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2.1). Round 1 disposition: `review/disposition.md`.

## Deliverable

In anchor mode the engine no longer walks the tree: A1 is edited structurally (URLs and `author` every run; `version`/`license` only on first conversion; `name`/`description` when given), and A2–A5 replace whatever repository slug their form holds. Every other file is byte-identical. Each changed file goes through `<file>.fork-init-tmp` and a rename, and `.gitignore` ignores the temporary name; a write failure is a tree error asking for a re-run. The three scan-driven fork-init tests are rewritten as the overridden-contracts table says.

## Acceptance criteria

- [x] T1–T5: doc anchors, untouched files and bytes (S1)
- [x] T11: CRLF for doc anchors and the manifest (S1)
- [x] T14–T15: `name`/`description`, first conversion (S1)
- [x] T55: write failure in anchor mode (S1)
- [x] T60: the three scan-related overridden tests rewritten; the others pass unchanged (S1)
- [x] T83: fork-init.ts scan comments (S9)
- [x] T84: `.gitignore` (S9)

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

### 2026-10-14 — red → green log

Implementation note: the engine change (doc-anchor regex replace, A1's first-conversion and
trim logic, the `<file>.fork-init-tmp` + rename writer and its tree-error wrapping) was written as
one batch in `scripts/fork-init.ts` covering T1–T5, T11, T14, T15 and T55 together, because the
seams share one code path (the anchor-mode branch of `runForkInit`) and splitting the production
edit into a dozen micro-commits would have meant re-deriving the same branch repeatedly. Every row
below is therefore labelled **batch-implemented**: its test was written after that implementation
existed and passed on first run, so it carries a mutation check (temporarily break the exact code
the row depends on, confirm red, restore byte-identical) instead of a red-caused-by-missing-code
entry. Mutations were applied with a scratch Python script, confirmed red, then the file was
restored from a saved copy and diffed byte-identical (`md5` before/after the restore matched:
`f5c84dfeb24cefa82a1982e46c8b83c2`) before the next mutation.

1. **T1/A2** (badge form, both occurrences, three original-slug variants; owner outside the
   wildcard not an occurrence) — batch-implemented. Mutation: disabled the replacement
   (`next = next.replace(...)` → no-op) — 7 doc-anchor tests went red (not just this row's own,
   since the same line serves every doc anchor); restored, re-ran green.
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "A2: both badge occurrences carry the new slug|A2: an owner outside the wildcard"`
2. **T1/A3** (clone line at end of line; dotted name backtracks past `.git`; trailing text/white
   space not an occurrence; end of file counts as end of line) — batch-implemented, covered by the
   same mutation as row 1 (shared replacement call).
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "A3: the clone line carries the new slug|A3: trailing text or trailing white space|A3: the end of the file counts as an end of the line"`
3. **T1/A4** (remote-add line, leading indentation of any kind, "preceded by anything" per the
   approved resolution of Notes 5) — batch-implemented, covered by row 1's mutation.
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "A4: leading indentation"`
4. **T1/A5** (Markdown-link issues form, parentheses required, a bare URL or an extra path segment
   does not match) — batch-implemented, covered by row 1's mutation.
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "A5: the Markdown-link form"`
5. **T1/T4** (one file mixing several forms and several old slugs; expected value hand-built, not
   generated) — batch-implemented, covered by row 1's mutation.
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "a file mixing several forms and several old slugs"`
6. **T2** (a doc anchor with no occurrence, or a missing file, warns with the anchor id and path
   and the run continues; a missing README.md warns once each for A2/A3, not for README.en.md; a
   doc-anchor warning never contains `github-pages` or `deploy.yml`, Notes 7) —
   batch-implemented. Mutation: commented out the `warnings.push(...)` call inside the "no
   occurrence" branch — 7 of these tests went red; restored, re-ran green.
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "a file present with no occurrence of its form warns|a missing file warns with the anchor id|a missing README.md produces one warning each|a doc-anchor warning never mentions"`
7. **T3** (every file outside A1–A9 and the workflow byte-identical; `changedFiles` a subset of the
   anchor files and the workflow; no stray `*.fork-init-tmp`) — batch-implemented. Mutation:
   reintroduced a `CHANGELOG.md` write inside the anchor-mode branch — this row's test and the T60
   CHANGELOG override both went red; restored, re-ran green.
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "every file outside A1–A9 and the workflow is byte-identical"`
8. **T5** (a code anchor whose value is not being set keeps its lines and need not exist: no
   `--site-name`/`--origin`/`--host`/`--base`; A6 unparsable, A7 two candidate lines, A8/A9 file
   absent) — batch-implemented, shares row 7's "no tree walk" code path; no flag that would set
   A6–A9 exists yet in this ticket, so the only reachable state is "untouched" — covered by row 7's
   mutation (which also proved the engine touches nothing outside its own anchor-file list).
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "a code anchor whose value is not being set keeps its lines|A6 \(unparsable\), A7 \(two candidate lines\)"`
9. **T4** (manifest re-serialised as two-space JSON with a trailing LF, regardless of the
   original's indent style; fields outside A1 — `scripts`, `dependencies`, nested objects,
   `private` — unchanged by deep-equal; an escaped value compared by parse, not raw bytes; an
   already-standard, already-correct manifest is not written, mtime unchanged) —
   batch-implemented. Mutation: `delete (pkgObj as any).scripts` before serialising — the
   fields-outside-A1 test went red; restored, re-ran green.
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "re-serialises the manifest as two-space JSON|keeps every field outside A1 unchanged|an escaped value is compared after parsing|does not write the manifest when it already matches"`
10. **T11 (doc anchors)** (CRLF files recognised the same as LF ones; A3/A4 recognise the form
    before a CRLF line ending; A2/A5 need no end-of-line; each line keeps its own ending in a mixed
    file) — batch-implemented. Mutation: narrowed the EOL lookahead from `(?=\r?\n|\r?$)` to
    `(?=\n|$)` (dropped the optional `\r`) — the A3/A4 CRLF test went red; restored, re-ran green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "CRLF: A3 \(README\) and A4 \(CONTRIBUTE\)|CRLF: A2 and A5"`
11. **T11+T4 (manifest)** (CRLF manifest: all-CRLF stays CRLF; a first-line-LF/mixed or a
    single-line/no-newline manifest outputs LF, decided by the FIRST line ending only) —
    batch-implemented. Mutation: replaced the CRLF-aware assignment with the plain LF string —
    this test went red (expected `\r\n`, got none); restored, re-ran green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "CRLF manifest: all-CRLF stays CRLF"`
12. **T11 regression (rebrand/B mode)** (the CRLF rule added for anchor mode must not leak into
    rebrand mode, which keeps writing LF) — batch-implemented. Mutation: dropped the
    `!args.rebrand &&` guard from the CRLF ternary — this regression test went red (manifest came
    back CRLF under `B_ARGS`); restored, re-ran green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "writes the manifest with LF even when it was CRLF"`
13. **T14** (`--name`/`--description`: trimmed and written when non-empty after trim; unchanged
    when empty after trim or not given; values include a U+3000 full-width space) —
    batch-implemented. Mutation: removed the `.trim()` call from the `--name` branch — the test
    went red (`'  x  '` was written untrimmed); restored, re-ran green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "trimmed when non-empty after trim"`
14. **T14 regression (rebrand/B mode)** (anchor mode's trim must not leak into rebrand mode, which
    keeps writing `--name` verbatim, consistent with the existing C-8 disposition) —
    batch-implemented. Mutation: forced the anchor-mode branch (`if (false) { … } else { … }`) so
    rebrand mode went through the trimming branch too — this regression test went red (`'pkg-x'`
    instead of `'  pkg-x  '`); restored, re-ran green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "writes --name verbatim, without trimming"`
15. **T15a** (first conversion: `repository` is an object whose `url` is exactly upstream's
    `git+https://…git` URL, case-sensitive, checked before T13's object conversion — `version` →
    `0.1.0`, `license` → `ECL-2.0`; and every shape that does NOT count: different case, missing
    `.git`, missing `git+`, trailing space, a range's own URL, a string equal to the upstream URL,
    `null`, absent) — batch-implemented. Mutation: changed the gating condition to
    `if (true) { … }` (unconditional reset) — 8 tests across this ticket's first-conversion
    boundary went red; restored, re-ran green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "first conversion \(.*\): version becomes 0.1.0|not a first conversion \(.*\): version and license are unchanged|not a first conversion when repository is a string equal"`
16. **T15b** (not a first conversion: `version`/`license` preserved, but the three URLs and
    `author` are still rewritten on every run, including across a repository rename; a manual
    version bump survives an identical second run) — batch-implemented, covered by row 15's
    mutation (same gating condition).
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "not first conversion: the three URLs and author|a manual version bump after first conversion"`
17. **T55** (a write failure — README.md mode 0444 inside a 0555 project root, POSIX only, skipped
    as root — returns `exitCode` 1 naming whichever anchor file the write reached first, the
    message containing `run the same command again`; every file is either its original bytes or
    the full new bytes, never partial; no directory is left holding a `*.fork-init-tmp`; a rerun
    after `chmod` converges to the same tree as a fresh fixture) — batch-implemented. The test does
    not assume which file the message names (the shared fixture's project root is 0555, so the
    very first root-level write fails — see the ticket's Notes 3 — and today's processing order
    writes `package.json` first; the assertion is "whichever named file is unchanged", not
    "`README.md` is unchanged"). Mutation: made the outer `catch` never match
    `AnchorWriteError` (`if (false) { … }`) so the raw `EACCES` exception propagated uncaught —
    the test went red with an unhandled error instead of `exitCode: 1`; restored, re-ran green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "a write failure returns exitCode 1 naming the file"`
18. **T60 override 1** ("rewrites package.json identity and leaves no upstream slug" →
    "rewrites package.json identity and the A2–A5 forms; keeps the config's socialLinks": the old
    contract no longer holds because anchor mode no longer walks the tree, so the config's
    `socialLinks` line is untouched) — red on first run against the OLD test body (the old
    assertion `not.toContain('BrowserLaboratory/wxl-platform')` on `readme+contrib+cfg` failed
    because `cfg`'s `socialLinks` still carries it); rewrote the test to the new contract; green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "rewrites package.json identity and the A2–A5 forms"`
19. **T60 override 2** ("rewrites the upstream slug in CHANGELOG.md — scan-driven, not a hardcoded
    file list" → "leaves CHANGELOG.md byte-identical in anchor mode (no file list, no scan)": the
    opposite contract — anchor mode has no scan at all) — red on first run against the OLD test
    body (expected the slug gone, found it unchanged); rewrote to assert byte-identity; green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "leaves CHANGELOG.md byte-identical in anchor mode"`
20. **T60 override 3** ("does not treat an active .vitepress/dist-* sibling as build output
    (path-segment boundary)": title and assertions unchanged, argument changed from `A_ARGS` to
    `B_ARGS` since only rebrand mode still walks the tree) — red on first run with `A_ARGS` (the
    sibling file was left at the upstream slug, since anchor mode never visits it); changed the
    argument to `B_ARGS`; green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "does not treat an active \.vitepress/dist-\* sibling as build output"`
21. **T60 "every other existing test passes unchanged"** — verified by running the whole file
    after every row above: 157 tests pass, of which 103 are the pre-existing tests from before this
    ticket (106 minus the 3 titles renamed in rows 18–19, the body-only change in row 20). Checked
    with `git diff -U0 HEAD -- tests/unit/scripts/fork-init.test.ts`: the only removed `it(...)`
    lines are the two renamed titles (rows 18–19); row 20 shows only its one-line argument change
    under an unchanged title; no other existing test's body differs from HEAD.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts`
22. **T83** — `grep -qF -- "<string>" scripts/fork-init.ts`, one string at a time:
    - `A + B on every active text file` → absent (required forbidden; removed with the anchor-mode
      rewrite, since there is no longer one pass over every active file).
    - `minimal fork: identity fields, base, upstream-slug swap`, `A + deterministic rename`,
      `1  user input error (missing/invalid flag)` → already absent (cleared by T-0012; re-checked
      here per the ticket's instruction to re-verify and claim them if T-0012 had not).
    - `1  user input error or tree error` → present (required).
    - `clobbers a customized deploy.yml`, `collapse the whole line to a`, `null = remove (--base none)`
      → not checked for removal (T-0014's scope per the ticket's Notes 10); recorded as-found:
      `collapse the whole line to a` and `null = remove (--base none)` are still present (unrelated
      to this ticket's edits to `ForkInitArgs.base`'s comment or `setViteBase`, both untouched here),
      `clobbers a customized deploy.yml` is incidentally now absent (the surrounding comment was
      rewritten for the anchor/rebrand split; no test depends on its absence, and T-0014 remains
      free to use or not use that exact wording).
23. **T84** — `grep -qF -- "*.fork-init-tmp" .gitignore` → present (added under a new "fork:init
    (anchor mode)" section).

### 2026-10-14 — coverage report table

Coverage is **not measured: no coverage provider is installed.**

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0004-S1 (doc anchors A2–A5) | `runForkInit — anchor mode: doc anchors` (18 tests) | not measured | AC-A1 (T1, T2) | None within scope. A6–A9's own CRLF handling (T11's A6–A8 portion) is explicitly out of this ticket (ticket Notes 2; no flag sets them yet). |
| 0004-S1 (untouched files, code anchors unset) | `runForkInit — anchor mode: untouched files` (3 tests) | not measured | AC-A2 (T3, T5) | T4's "A6–A9 files, anchor SET, bytes outside the anchor unchanged" sub-case is untestable here — no ticket before T-0014/T-0015 gives a flag that sets A6–A9 (ticket Notes 2). |
| 0004-S1 (manifest) | `runForkInit — anchor mode: manifest` (16 tests) + the pre-existing `runForkInit — manifest (T12–T13)` and `— manifest repository/bugs become objects (T13)` describes (unchanged) | not measured | AC-A7 (T12–T14), AC-A8 (T15) | None within scope. |
| 0004-S1 (write failure) | `runForkInit — anchor mode: write failure` (1 test, `it.skipIf` on win32/root) | not measured | AC-E1 (T55) | Permission-bit preservation through the temporary-file rename is an implementation requirement the ticket explicitly says is "not observed by any test" (S1 decision, 2026-10-14); not tested here either, by that same decision. The Windows cross-OS job (T72) cannot exercise this path at all (`it.skipIf` on `win32`). |
| 0004-S1 (overridden contracts) | 3 renamed/adjusted tests (rows 18–20 above) + the rest of `fork-init.test.ts` unchanged (157 tests total in the file) | not measured | AC-E4 (T60) | None within scope; the 5 base-related tests and the `--base none` parse title stay T-0014's responsibility and are unchanged here, per the ticket's Notes 1. |
| 0004-S9 (comments, `.gitignore`) | recorded `grep -F` runs (log rows 22–23) | not measured | AC-D4 (T83, T84) | `clobbers a customized deploy.yml`, `collapse the whole line to a`, `null = remove (--base none)` are T-0014's own check, per the ticket's Notes 10; not graded here. |

### 2026-10-15 — recount (`--reporter=verbose`) after items 1–9

Coverage is still **not measured: no coverage provider is installed** (same as T-0012). Counts below
are from `pnpm vitest run tests/unit/scripts/fork-init.test.ts --reporter=verbose`, grepped per
describe block, 2026-10-15 — **this recount supersedes the 2026-10-14 coverage table's per-row test
counts above**: two of that table's figures (doc anchors "18", manifest "16") turn out not to match
an actual expansion of their `it.each` parameterisation even for the file as it stood on 2026-10-14
(most likely counted by source `it(`/`it.each(` call sites rather than by resulting test instances);
this was not caught before now because nothing had re-run `--reporter=verbose` against them. The
other two scoped rows (untouched files, write failure) do match a before/after reasoned entirely
from this session's own edits, so only those two show a "was → is" delta below.

| Seam | Tests (2026-10-15 recount) | Acceptance criterion |
|---|---|---|
| 0004-S1 (doc anchors A2–A5) | `runForkInit — anchor mode: doc anchors`: **30** (the 2026-10-14 table's "18" undercounts the file as it stood that day; this session added 4 of the 30: item 2's directory-read tree-error test, item 5's byte-preserving round-trip test, and item 7(h)'s two trailing-boundary tests) | AC-A1 (T1, T2) |
| 0004-S1 (untouched files, code anchors unset) | `runForkInit — anchor mode: untouched files`: 3 → **3** (item 7(c) extended the one T3 test's fixture and assertions; no new `it`) | AC-A2 (T3, T5) |
| 0004-S1 (T5 dedicated fixture) | new describe `runForkInit — anchor mode: T5 dedicated fixture (…)`: 0 → **3** (item 7(d)) | AC-A2 (T5) |
| 0004-S1 (manifest) | `runForkInit — anchor mode: manifest`: **22** (the 2026-10-14 table's "16" undercounts the file as it stood that day; this session added 3 of the 22: item 7(a)'s two round-trip tests and item 7(b)'s absent-fields test; item 7(g) rewrote one existing test's body, no count change); the pre-existing `manifest (T12–T13)` (18) and `manifest repository/bugs become objects (T13)` (14) describes unchanged | AC-A7 (T12–T14), AC-A8 (T15) |
| 0004-S1 (write failure) | `runForkInit — anchor mode: write failure`: 1 → **2** (+1 item 7(e)'s subdirectory-write test; item 7(e)'s other half strengthened the original test's own assertions, no count change from that half) | AC-E1 (T55) |
| 0004-S1 (overridden contracts) | unchanged: 3 renamed/adjusted tests + the rest of the file | AC-E4 (T60) |
| 0004-S9 (comments, `.gitignore`) | unchanged | AC-D4 (T83, T84) |

**File total: 168** (`pnpm vitest run tests/unit/scripts/fork-init.test.ts --reporter=verbose`,
2026-10-15: 168 passed, 0 failed; 2026-10-14's own full-file count was 157). The **"106 minus 3"
arithmetic in log row 21 is itself correct** (106 pre-existing tests, 3 overridden, 103 unchanged;
reconfirmed today by running the pre-T-0013 test file — `git show 0534e42:tests/unit/scripts/fork-init.test.ts`,
T-0012's HEAD — against this ticket's final engine: it still enumerates exactly 106 tests, of which
exactly 3 fail, the two renamed titles and the dist-* sibling argument change). What needed fixing
was not that sub-arithmetic but the **per-describe breakdown above it** (the "18" and "16" figures
this recount replaces) and the **total**: 157 (2026-10-14) is now 168 — 106 pre-existing (unchanged
by this recount) plus 62 new (51 from the original 2026-10-14 implementation, 11 added by this
session's items 2, 5 and 7).

**'anchor', 'first conversion' stay spec terms, not glossary terms** (as spec 0003 K-15 decided);
`GLOSSARY.md` is unchanged by this ticket.

### 2026-10-14 — full suite

`pnpm test --run`: 125 test files, 2336 tests, all passed, exit code 0. (One harmless
`ECONNREFUSED ::1:3000`/`127.0.0.1:3000` stack trace prints to stderr after the summary line —
some unrelated test's teardown retries a local connection; it does not affect the exit code or any
test's pass/fail status, and this ticket's changes touch no networking code.)

### Deviations from the approved table

- **Notes 5 (recognition-rule ambiguity) resolved as "preceded by anything", and the transitional
  `--base` (Notes 1) confirmed — both from the same approved decision:** the user approved a
  13-item list in chat on 2026-10-14, alongside the test plans; item 9 of that list reads
  (verbatim, Traditional Chinese): 「T-0013：到 T-0014 之前，`--base` 只改 config 的 base 行，不碰
  slug；共用 fixture 加一份含 A2、A3 的 `README.en.md`；form 前面可以有任何內容；T2 的警告文字不能含
  `github-pages` 或 `deploy.yml`，否則會干擾既有測試；被 override 的兩支測試改標題。」 This single item
  is the authority for two separate decisions used in this ticket: (1) the left-boundary rule — an
  anchor form may be preceded by anything, with no left-hand boundary check, resolving the
  ambiguity the approved table's Notes 5 left open (A4's "leading indentation allowed" does not, by
  itself, say whether a non-white-space character such as `- git remote add …` or `$ git clone …`
  also counts) — implemented that way for A2–A5 uniformly; and (2) the transitional `--base`
  behaviour recorded in Notes 1 above (before T-0014, `--base` only edits config's existing `base:`
  line through today's `setViteBase`, and does not touch A9 or any repository slug). The code
  comment on `docAnchorRegex` cites this same decision as "approved by the user on 2026-10-14
  (recorded in the T-0013 ticket)".
- **T15 split into 15a/15b in this log:** the approved table lists two rows under T15 (first
  conversion; not-first-conversion). The negative boundary cases for "what counts as a first
  conversion" (wrong case, missing `.git`, a string value, `null`, absent, …) are written as
  sub-cases of the first row's own boundary-condition column; this log keeps that grouping (row 15
  above) rather than splitting the negative cases into row 15b, to match the table's own column
  layout.
- **Mutation checks, not one per `it`:** given the number of new tests (≈51), mutation checks were
  run once per distinct production code path rather than once per individual assertion; rows that
  share a code path with an already mutation-checked row say so explicitly instead of repeating an
  identical mutation.
- **Batch implementation, reproducible mutation evidence (user decision 2026-10-15, option A):**
  rows T1–T5, T11, T14, T15 and T55 were batch-implemented (2026-10-14 log above) and accepted by
  the user on 2026-10-15 on condition that every mutation check in that log be made reproducible:
  a one-line command that applies the mutation, the `vitest -t` command showing red, and a restore
  (the inverse one-liner, not `git checkout --`). All eleven sequences were run — and, after two of
  them (rows 9 and 11 in the renumbered evidence section below) turned out to be shell-fragile under
  their original double-quoted form, rewritten to single-quoted `perl -e` commands and rerun — against
  this ticket's FINAL code, i.e. after every edit in this session including the scope-correction entry
  above, and are recorded in "2026-10-15 — reproducible mutation evidence (rerun against the final
  code, single-quoted only)" below. Every sequence is confirmed red, confirmed byte-identical after
  its restore (`cmp` against a saved copy of the final file), and separately reconfirmed, in one more
  fresh pass, to actually change the file on apply (not a silent no-op) before being restored again.

### 2026-10-15 — compute-before-write, byte-preserving anchors, write-failure hardening

Follow-up work on top of the 2026-10-14 implementation, all in `scripts/fork-init.ts` and
`tests/unit/scripts/fork-init.test.ts` unless noted:

- **Compute before write.** Anchor mode's write phase is now reached only after every read and
  check has succeeded: the manifest's own write (previously immediate) is deferred alongside the
  doc anchors' and the config's, and all three are computed in memory first. A doc-anchor file that
  cannot be read (e.g. the path is a directory) is now a checked tree error returned before any of
  those three writes — new test: "a doc-anchor file that is a directory is a checked tree error,
  detected before any write (the manifest stays unwritten)". **Anchor-file read failures for every
  OTHER reason remain exactly as before this ticket:** this check covers only the doc-anchor files
  (A2–A5); a read failure on the config (A6/A9), the home pages (A7) or the short-link module (A8)
  still propagates as an uncaught exception, the same as every anchor file's read did before this
  session — no flag in this ticket sets A6–A9, so no test exercises that path either way, and T55
  continues to govern only write failures, never reads.
- **Write-failure message (T55).** `AnchorWriteError`'s message is now exactly
  `failed to write <rel> (<err.code>); run the same command again` — no Node message, no absolute
  path, no `.fork-init-tmp`, with the original error kept as `{ cause }`. The T55 test now also
  asserts the message excludes the fixture's `projectRoot` and `.fork-init-tmp`.
- **Temp-file handling.** `writeAnchorFile` now: removes a pre-existing `<file>.fork-init-tmp` via
  `lstatSync` + `unlinkSync` before writing (a symbolic link is unlinked, never followed); writes
  the temp file and renames it over the target; only then applies the original's permission bits to
  the (now-renamed) target; and best-effort removes the temp file on any failure. Two test comments
  that claimed "no temporary file is ever left" were rescoped to what each scenario actually creates
  (a successful run, or a run whose own 0555 root blocks tmp-file creation before one ever exists).
- **Byte-preserving doc-anchor read/write.** Doc-anchor files (A2–A5 only — not the manifest or the
  config) are now read as a `Buffer` decoded `latin1` and written back `latin1`, so a byte outside
  any anchor form that is not valid UTF-8 round-trips unchanged — new test: "round-trips an invalid
  UTF-8 byte outside any anchor form, byte for byte".
- **Comments:** `transformText`'s doc comment now says rebrand-mode only; `treeError`'s doc comment
  now notes the T55 exception (files already written in the same run's write phase stay, even
  though the write failure's own result still carries empty arrays); the deploy-workflow comment no
  longer says "never clobbering a customized deploy.yml" (neutral: without `--host`, installed when
  absent, an existing different file is left; T-0014 adds `--host`) — **the workflow content
  installed is now described as the raw template verbatim; this ticket applies no LF normalisation
  to it (that comparison logic is T-0014's, per traceability.md's "Workflow states")**; the
  `docAnchorRegex` line-end comment now says "before LF or CRLF, or at the end of the file
  (optionally after a CR)" — **a lone CR not followed by LF is not an end of line this regex
  recognises (its lookahead only matches `\r?\n` or `\r?` at the true end of input, neither of which
  a mid-file lone CR satisfies); "before a CR" in that phrase refers to a CR that is part of a CRLF
  pair, or the CR of a trailing CR at end-of-file** — and the shared fixture's CHANGELOG comment now
  says it carries upstream-slug links outside any anchor, rewritten by rebrand mode's tree walk and
  left byte-identical by anchor mode (T3), replacing language that described the pre-T-0013 scan.
- **New/extended tests (test-plan gaps):** `--name`/`--description` values containing `"`, `\` and
  `</script>` round-trip through JSON; a not-first-conversion manifest with `version`/`license`
  absent stays absent; T3's fixture gained a binary (NUL-byte) file and a CRLF non-anchor text file,
  both byte- and mtime-checked, and the test now asserts the after path set equals the before set
  plus the installed workflow; a dedicated T5 fixture (both home pages, the short-link module, and
  the three A9 config shapes) is pinMtime'd and asserted byte/mtime-unchanged with no A6–A9 warning;
  T55 now compares every file against either its original bytes or the bytes a fresh successful run
  produces, and a second T55 scenario shows a subdirectory write (the config) succeeding before a
  root write (the manifest) fails; the overridden CHANGELOG test now pins and compares `mtimeMs`;
  the escaped-value test now writes the raw manifest text `"note": "café"` directly, rather than
  building it through `JSON.stringify`; A4 gained its own trailing-text/trailing-white-space test,
  and A3's already-existing one now also covers `README.en.md` (plus an end-of-file case there); the
  "file present with no occurrence" `it.each` now removes only the targeted anchor's own form,
  keeping the file's other anchor intact, and asserts that other anchor and the manifest were still
  rewritten in the same run; the dead `originalPkg` variable in the name/description trim test was
  removed.
- **Verification surface:** every assertion above runs `runForkInit`/`parseForkInitArgs` in-process
  (0004-S1); none of it exercises the CLI under `node --experimental-strip-types` (0004-S2) — the
  existing S2 describe (`fork-init CLI under type stripping`) is untouched by this session and was
  not re-run beyond the full-suite run below, which does include it.

### 2026-10-15 — scope correction: the doc-anchor tree error was not in the spec

A follow-on review found that one piece of the "compute-before-write" work above went beyond what
T2/T55 actually specify, and two other details needed hardening. All in `scripts/fork-init.ts` and
`tests/unit/scripts/fork-init.test.ts` unless noted; `pnpm vitest run tests/unit/scripts/fork-init.test.ts`
stayed at 168/168 throughout (no test was added or removed, only two existing ones' bodies changed,
named below).

- **The doc-anchor "cannot be read" tree error is removed.** T2 (traceability.md) governs only a
  MISSING doc-anchor file — it warns and the run continues. It says nothing about any other read
  failure (e.g. a path that is a directory, `EISDIR`), and T55 governs only a WRITE failure. The
  2026-10-15 entry above had turned every doc-anchor read failure into a checked tree error, which
  is a behaviour this ticket's own spec references never asked for. That `try`/`catch` around the
  doc-anchor read is removed: a read failure other than "the file does not exist" now throws,
  uncaught, exactly as it did before that entry's restructuring — "other read failures remain
  exactly as before this ticket" is now actually true, not just stated in a comment while the code
  did something else. The overridden test "a doc-anchor file that is a directory is a checked tree
  error, detected before any write (the manifest stays unwritten)" is rewritten to "a doc-anchor
  path that is a directory makes `runForkInit` throw before any write (the manifest stays
  unwritten)": it now asserts `expect(() => runForkInit(...)).toThrow()` instead of reading
  `res.exitCode`/`res.message`, and keeps the manifest byte/mtime assertions (the throw still
  happens before any write in the run, so compute-before-write is still demonstrated — just via an
  uncaught exception, not a returned tree error).
- **Compute-before-write now also covers the deploy workflow's own existing-file read.** Moving the
  doc-anchor read failure out of the checked-tree-error path did not change the compute-before-write
  goal for everything this function DOES check: the deploy block used to call
  `readIf(DEPLOY_REL)` after the mode branch had already performed its writes (config, manifest,
  doc anchors in anchor mode; the whole tree walk in rebrand mode). That read is now taken once,
  alongside the deploy TEMPLATE's own read, before the `args.rebrand` branch — a new
  `existingDeploy` local — and the deploy block further down reads that variable instead of calling
  `readIf` again. No test asserts this ordering directly (nothing in either mode writes to
  `DEPLOY_REL` before the deploy block runs, so the observable result is unchanged); it closes a gap
  between the restructuring's stated goal and what the code actually did.
- **The escaped-value test actually exercises a JSON escape now.** The test introduced on
  2026-10-14 ("an escaped value is compared after parsing (deep-equal), not by raw bytes") wrote the
  raw manifest text with the literal character `é` (not the JSON escape `\u00e9`), so the written-out
  manifest and the input could coincidentally have been byte-identical for that field even without
  exercising parse-then-compare. The raw manifest text now contains the six literal characters
  backslash, `u`, `0`, `0`, `e`, `9` (written in the JS test source as `"caf\\u00e9"` inside the raw
  string, confirmed by `expect(raw).toContain('caf\\u00e9')`); the test asserts
  `JSON.parse(after).note === 'café'` and `expect(after).not.toBe(raw)` — the re-serialised output
  necessarily renders that escape as the literal character, so its bytes differ from the input even
  though the value itself is unchanged.
- **`writeAnchorFile` no longer writes through a leftover temp file it failed to remove.** Before
  this fix, `lstatSync(tmpPath)` and `unlinkSync(tmpPath)` shared one `try`/`catch` with a swallowed
  catch body: if the leftover temp file existed but `unlinkSync` itself failed (e.g. permissions),
  the failure was silently ignored and the function proceeded to write the fresh content through
  whatever that leftover name still pointed at (a plain file, or — worse — a symlink's target).
  `lstatSync` and `unlinkSync` are now split: a failed `lstatSync` (no leftover to begin with) is
  still swallowed, but once `lstatSync` succeeds (a leftover genuinely exists), `unlinkSync` runs
  outside any `try`/`catch` here — a failure propagates out of `writeAnchorFile`, which `applyEdit`
  (and the deploy block) already wrap in a `try`/`catch` that turns it into an `AnchorWriteError`,
  itself turned into a tree error by the caller. No new test was added for this path (not named by
  any item in this session's scope); the existing 168 tests all still pass unchanged by this fix.
- **Comments corrected:**
  - The deploy block's `else` branch (an existing `deploy.yml` with different content) no longer
    says "never clobber" — reworded to "left untouched" (the file genuinely is left as-is; "never
    clobber" oversold a guarantee this code does not independently verify beyond "do not overwrite
    when present").
  - `treeError`'s doc comment is rewritten so it describes the current, correct split: every
    CHECKED tree error (a condition the function tests for and deliberately returns one of these
    for — the manifest check, A1, foremost among them) is returned before any write in the same
    run; a write failure, which can only happen once the write phase has begun (T55), still carries
    the same empty result arrays, but any file that phase had already written stays on disk. The
    previous wording tied this directly to "a doc-anchor file that cannot be read", which is no
    longer one of these checked tree errors (see above).
  - `docAnchorRegex`'s doc comment, which cited "item 9 of the list the user approved with the test
    plans, 2026-10-14" for the left-boundary rule, now cites it as "approved by the user on
    2026-10-14 (recorded in the T-0013 ticket)" — see the Deviations entry below, which now quotes
    that item 9 verbatim.
- **Write order and the transitional `--base` (T55, and relevant to T-0014).** The A-mode write
  phase writes the config before the manifest, specifically so T55's "files already written stay"
  is observable in a test: a subdirectory write (the config) can be seen to succeed before a
  root-directory write (the manifest) fails. The dedicated test for this half of T55 ("a
  subdirectory write (the config) succeeds before a root write (the manifest) fails; the
  subdirectory write stays") passes `--base /myfork/` — without a `--base` value, `cfgNext` would
  equal `cfgRaw` (nothing for `setViteBase` to change), `applyEdit` would be a no-op, and there would
  be no subdirectory write left to observe succeeding. That `--base` is this ticket's OWN
  transitional behaviour (Notes 1 above, and the Deviations entry below): before T-0014, `--base`
  only edits the config's existing `base:` line through today's `setViteBase`, never A9. **When
  T-0014 rewrites `--base` to write A9 instead, it must either keep this test passing under its new
  `--base` semantics, or replace it with an equivalent scenario that still demonstrates a successful
  subdirectory write preceding a failed root write** — this requirement, and the same note about the
  transitional `--base`, is also appended to T-0014's Comments (`T-0014-base-and-host-workflows.md`),
  alongside a note that anchor-mode's `deploy.yml` comparison (`existing !== deployContent`) is
  still not LF-normalised as of this ticket — T-0014's T25 is where that normalisation is added.

### 2026-10-15 — reproducible mutation evidence (rerun against the final code, single-quoted only)

**Supersedes the previous version of this section.** That version's commands mixed single- and
double-quoted `perl -e` invocations; two of the double-quoted ones (rows 4 and 6 below) turned out
to be shell-fragile in exactly the way a parent review flagged: a double-quoted shell string
collapses `\\n` to `\n` before Perl ever sees it, so a pattern meant to match the literal two
characters backslash+`n` in the TypeScript source (inside a `'\n'` string literal) silently stopped
matching, and the recorded "apply" command would have been a silent no-op. Every sequence below was
rewritten as a single-quoted `perl -0pi -e '…'` command and reran, end to end, against this ticket's
FINAL code (after every edit in this session, including the scope correction above) — a fresh copy
of `scripts/fork-init.ts` was saved first (`md5 c5262b5d77c84a8820ceb0ee829f9392`, confirmed to
match the working copy both before the first row and after the last). For each row: the apply
command was run, `cmp` against the saved copy confirmed it actually changed the file (not a silent
no-op), the named `vitest -t` command was run and its red output recorded, the inverse (restore)
command was run, and `cmp` against the saved copy confirmed a clean, byte-identical restore before
moving to the next row. After all eleven rows, every apply command was pasted into a fresh shell
once more, on its own, and reconfirmed to change the file (`cmp` differs) before being restored —
recorded at the end of this section. Row numbers are the 2026-10-14 log's own numbering; rows that
share one production code path (as that log already notes) share one mutation/restore pair.

1. **Rows 1–5 (T1: A2–A5, the mixed-forms T4 case).** Apply:
   `perl -0pi -e 's/next = next\.replace\(anchor\.regex, \(\) => anchor\.replacement\(args\.repo\)\)/next = next \/\* mutated: no-op \*\//' scripts/fork-init.ts`
   Check: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "A2: both badge occurrences carry the new slug|A3: the clone line carries the new slug|A4: leading indentation|A5: the Markdown-link form|a file mixing several forms and several old slugs"`
   Observed red: `Tests  6 failed | 1 passed | 161 skipped (168)` — e.g. the mixed-forms test failed
   comparing the expected rewritten README against the unrewritten one (the old slug survived).
   Restore:
   `perl -0pi -e 's/next = next \/\* mutated: no-op \*\//next = next.replace(anchor.regex, () => anchor.replacement(args.repo))/' scripts/fork-init.ts`
   `cmp` clean; suite green (168/168).
2. **Row 6 (T2).** Apply:
   `perl -0pi -e 's/warnings\.push\(`\$\{anchor\.id\}: no occurrence of its form in \$\{file\}`\)/\/* mutated: warnings.push(...) removed *\//' scripts/fork-init.ts`
   Check: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "a file present with no occurrence of its form warns with the anchor id and path; the file"`
   Observed red: `Tests  6 failed | 162 skipped (168)` — `expect(res.warnings.some(...)).toBe(true)`
   failed (the warning never arrives). Restore:
   `perl -0pi -e 's/\/\* mutated: warnings\.push\(\.\.\.\) removed \*\//warnings.push(`\$\{anchor.id\}: no occurrence of its form in \$\{file\}`)/' scripts/fork-init.ts`
   `cmp` clean; suite green.
3. **Rows 7–8 (T3, T5).** Apply (insertion, via a capturing-group substitution; the inserted line
   uses double-quoted JS string literals so the whole `perl` program itself can stay single-quoted):
   `perl -0pi -e 's/(if \(cfgRaw !== null\) applyEdit\(CONFIG_REL, cfgNext!, cfgRaw\)\n)/$1      writeFileSync(abs("CHANGELOG.md"), "mutated")  \/\/ mutated: stray anchor-mode write\n/' scripts/fork-init.ts`
   Check: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "every file outside A1–A9 and the workflow is byte-identical"`
   Observed red: `Tests  1 failed | 167 skipped (168)` — `CHANGELOG.md should still exist: expected
   {…} to deeply equal {…}` (bytes/mtime diverge). Row 8 (T5) is covered by this same mutation, as
   the 2026-10-14 log already argues — its own named tests do not touch `CHANGELOG.md`, so re-running
   them here stays green, as expected. Restore:
   `perl -0pi -e 's/\n      writeFileSync\(abs\("CHANGELOG\.md"\), "mutated"\)  \/\/ mutated: stray anchor-mode write//' scripts/fork-init.ts`
   `cmp` clean; suite green.
4. **Row 9 (T4).** Rewritten to a shorter anchor that needs no embedded quotes at all (the previous
   version's pattern tried to match the literal `'\n'` string-literal text via a double-quoted shell
   string, which silently failed to apply — see the preamble above). Apply (insertion):
   `perl -0pi -e 's/(    const pkgNextLf = JSON\.stringify\(pkgObj, null, 2\))/    delete (pkgObj as any).scripts \/\/ mutated: drops a field outside A1\n$1/' scripts/fork-init.ts`
   Check: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "keeps every field outside A1 unchanged"`
   Observed red: `Tests  1 failed | 167 skipped (168)` — `expect(pkg.scripts).toEqual(raw.scripts)`
   failed (`scripts` came back `undefined`). Restore:
   `perl -0pi -e 's/    delete \(pkgObj as any\)\.scripts \/\/ mutated: drops a field outside A1\n(    const pkgNextLf)/$1/' scripts/fork-init.ts`
   `cmp` clean; suite green.
5. **Row 10 (T11, doc anchors).** Apply:
   `perl -0pi -e 's/\(\?=\\\\r\?\\\\n\|\\\\r\?\$\)/(?=\\\\n|\$)/' scripts/fork-init.ts`
   (narrows the EOL lookahead, dropping the optional `\r`; single-quoted, unchanged from the
   previous version of this evidence — it never relied on double-quote escaping). Check:
   `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "CRLF: A3 (README) and A4 (CONTRIBUTE)"`
   Observed red: `Tests  1 failed | 167 skipped (168)` — the rewritten README no longer matched (the
   CRLF form was no longer recognised). Restore:
   `perl -0pi -e 's/\(\?=\\\\n\|\$\)/(?=\\\\r?\\\\n|\\\\r?\$)/' scripts/fork-init.ts`
   `cmp` clean; suite green.
6. **Row 11 (T11+T4, manifest).** Rewritten as a surgical operator flip (`===` → `!==`) on the same
   line, which needs no quote characters at all — the previous version's pattern tried to match the
   entire line, including two `'\r\n'` string literals, via a double-quoted shell string, which also
   silently failed to apply (same root cause as row 9, above). Apply:
   `perl -0pi -e 's/firstLineEnding\(pkgRaw\) === /firstLineEnding(pkgRaw) !== /' scripts/fork-init.ts`
   Check: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "CRLF manifest: all-CRLF stays CRLF"`
   Observed red: `Tests  1 failed | 167 skipped (168)` — `expect(afterCrlf).toContain('\r\n')` failed
   (an all-CRLF input manifest came back LF-only). Restore:
   `perl -0pi -e 's/firstLineEnding\(pkgRaw\) !== /firstLineEnding(pkgRaw) === /' scripts/fork-init.ts`
   `cmp` clean; suite green.
7. **Row 12 (T11 regression, B mode).** Apply:
   `perl -0pi -e 's/const pkgNext = !args\.rebrand && firstLineEnding\(pkgRaw\)/const pkgNext = \/* mutated: guard dropped *\/ firstLineEnding(pkgRaw)/' scripts/fork-init.ts`
   Check: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "writes the manifest with LF even when it was CRLF"`
   Observed red: `Tests  1 failed | 167 skipped (168)` — `expect(...).not.toContain('\r')` failed
   (rebrand mode's manifest came back CRLF). Restore:
   `perl -0pi -e 's/const pkgNext = \/\* mutated: guard dropped \*\/ firstLineEnding\(pkgRaw\)/const pkgNext = !args.rebrand \&\& firstLineEnding(pkgRaw)/' scripts/fork-init.ts`
   `cmp` clean; suite green.
8. **Row 13 (T14).** Apply:
   `perl -0pi -e 's/const trimmedName = args\.name\.trim\(\)/const trimmedName = args.name \/\/ mutated: .trim() removed/' scripts/fork-init.ts`
   Check: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "trimmed when non-empty after trim"`
   Observed red: `Tests  1 failed | 1 passed | 166 skipped (168)` — the untrimmed `'  x  '` was
   written verbatim instead of `'x'`. Restore:
   `perl -0pi -e 's/const trimmedName = args\.name \/\/ mutated: \.trim\(\) removed/const trimmedName = args.name.trim()/' scripts/fork-init.ts`
   `cmp` clean; suite green.
9. **Row 14 (T14 regression, B mode).** Apply (insertion before the existing condition; matched by
   the two-line combination `if (args.rebrand) {` + the `pkgObj.name` assignment immediately after
   it, since the bare `if (args.rebrand) {` text recurs seven times elsewhere in the file):
   `perl -0pi -e 's/if \(args\.rebrand\) \{\n      pkgObj\.name = args\.name \?\? args\.rebrand/if (false \/* mutated: forces the trimming branch in rebrand mode too *\/) {\n      pkgObj.name = args.name ?? args.rebrand/' scripts/fork-init.ts`
   Check: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "writes --name verbatim, without trimming"`
   Observed red: `Tests  1 failed | 167 skipped (168)` — `expect(...).toBe('  pkg-x  ')` failed (the
   value came back trimmed to `'pkg-x'` even in rebrand mode). Restore:
   `perl -0pi -e 's/if \(false \/\* mutated: forces the trimming branch in rebrand mode too \*\/\) \{/if (args.rebrand) {/' scripts/fork-init.ts`
   `cmp` clean; suite green.
10. **Rows 15–16 (T15a/b).** Apply:
    `perl -0pi -e 's/if \(args\.rebrand \|\| firstConversion\) \{/if (true \/* mutated: unconditional reset *\/) {/' scripts/fork-init.ts`
    Check: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "first conversion \(.*\): version becomes 0.1.0|not a first conversion \(.*\): version and license are unchanged|not a first conversion when repository is a string equal|not a first conversion: version and license, when absent"`
    Observed red: `Tests  7 failed | 2 passed | 159 skipped (168)` — e.g. a not-first-conversion case
    expected `version`/`license` unchanged (`'9.9.9'`/`'MIT'`) but got the reset values instead.
    Restore:
    `perl -0pi -e 's/if \(true \/\* mutated: unconditional reset \*\/\) \{/if (args.rebrand || firstConversion) {/' scripts/fork-init.ts`
    `cmp` clean; suite green.
11. **Row 17 (T55).** Apply:
    `perl -0pi -e 's/if \(err instanceof AnchorWriteError\) \{/if (false \/* mutated: never matches *\/) {/' scripts/fork-init.ts`
    Check: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "a write failure returns exitCode 1 naming the file"`
    Observed red: `Tests  1 failed | 167 skipped (168)`, an UNHANDLED
    `Error: EACCES: permission denied, open '…/package.json.fork-init-tmp'` thrown out of
    `writeAnchorFile` → `applyEdit` → `runForkInit` (the raw exception propagates instead of
    becoming `exitCode: 1`, because the `catch` that used to recognise `AnchorWriteError` can no
    longer match anything). Restore:
    `perl -0pi -e 's/if \(false \/\* mutated: never matches \*\/\) \{/if (err instanceof AnchorWriteError) {/' scripts/fork-init.ts`
    `cmp` clean; suite green.

After every row above, `pnpm vitest run tests/unit/scripts/fork-init.test.ts` was green again
(168/168), and `cmp scripts/fork-init.ts` against the saved copy reported no difference each time.

**Final re-confirmation (the "paste it again" pass).** With the file back at the saved, clean state,
every one of the eleven apply commands above was run once more, in a fresh sequence, immediately
followed by `cmp scripts/fork-init.ts <saved copy>` (confirming a difference every time, i.e. none
of the eleven commands is a silent no-op) and then its own restore command, confirmed clean by
`cmp` again before the next row. All eleven rows: apply → differs → restore → clean. The file's
final state matches the saved copy exactly (`cmp` reports no difference), and
`pnpm vitest run tests/unit/scripts/fork-init.test.ts` is 168/168 green.

### 2026-10-15 — final checks (item 9)

- `pnpm vitest run tests/unit/scripts/fork-init.test.ts`: 168 passed, 0 failed.
- `pnpm test --run`: 125 test files, **2347** tests, all passed, exit code 0 (2026-10-14 recorded
  2336; the difference, 11, is exactly this session's new tests). The same harmless
  `ECONNREFUSED ::1:3000`/`127.0.0.1:3000` stack trace prints to stderr after the summary line, for
  the same unrelated reason already recorded on 2026-10-14; it does not affect the exit code.
- `grep -qF -- "A + B on every active text file" scripts/fork-init.ts` → **absent**, as required.
- `grep -qF -- "1  user input error or tree error" scripts/fork-init.ts` → **present**, as required.
- `git diff -U0 HEAD -- tests/unit/scripts/fork-init.test.ts` (`HEAD` is still T-0012's commit,
  `0534e42`; this ticket's work is all uncommitted), re-measured after this session's edits by
  reading every `@@` header and counting each hunk's own `-`/`+` lines directly (not estimated,
  not recalled from memory): 11 hunks total, unchanged in count from the 2026-10-14 measurement —
  this session's two test-body rewrites (the directory tree-error test, the escaped-value test)
  both land inside the one block that is already a pure insertion relative to `HEAD` (below), so
  editing content `HEAD` never had cannot turn that hunk into one with a removal.
  **Correcting the previous version of this note, which miscounted two things:**
  1. **The `chmodSync` import's own hunk was mis-filed.** `@@ -29,0 +30 @@` is `-:0 +:1` — it adds
     one line and removes none, so it is a pure-insertion hunk, not one of the hunks that "carry a
     removal" as the previous version of this note had it.
  2. **The three overridden tests span five hunks with a removal, not four, and not one each.**
     `git diff -U0` opens a new hunk at every separately-changed region within a test body, and two
     of the three tests have more than one such region: the title-rename test
     ("rewrites package.json identity and the A2–A5 forms…") spans the `it(...)` line itself
     (`@@ -706 +720,5 @@`, a removal) AND its reworked body assertions, which split into one
     pure-insertion hunk (`@@ -717,0 +736,6 @@`, the new `me/myfork` / `not.toContain` assertions —
     counted with the insertions below, NOT here) followed by one removal hunk
     (`@@ -719,3 +743 @@`, the old `readme + contrib + cfg` assertions being replaced); the
     CHANGELOG-byte-identical test spans two removal hunks (`@@ -724,2 +746,7 @@`,
     `@@ -727,4 +754,3 @@`); the dist-* sibling `A_ARGS`→`B_ARGS` swap is one removal hunk
     (`@@ -734 +762 @@`). That is 2 (title-rename) + 2 (CHANGELOG) + 1 (dist-*) = 5 removal hunks
     for the three tests, plus the shared fixture's own one removal hunk (`@@ -125,3 +126,16 @@`,
     T60 Notes 4) = **six** hunks total that carry a removal.
  With both corrected: **six** hunks carry a removal (the fixture, plus the five above, across the
  three overridden tests); the other **five** hunks are pure insertions (`+` lines only, no `-`):
  the `chmodSync` import (1 line), the title-rename test's own new assertions (6 lines, named
  above), a 2-line comment inserted just before the dist-* test (`@@ -732,0 +759,2 @@`), one
  847-line block holding every new `describe`/`it` added since T-0012 (both the original 2026-10-14
  batch and this session's items 2, 5 and 7, plus this session's two test-body rewrites, all inside
  that same already-new region), and one 16-line block holding the B-mode regression tests.
  **Confirmed: only the approved overridden tests and the shared fixture lines changed relative to
  `HEAD`; every other existing (pre-T-0013) test's body is untouched; every other change is a pure
  addition.**

### Blockers

None. Every row in the approved table that falls in this ticket's scope (T1–T5, T11, T14, T15, T55,
T60, T83, T84) is implemented, tested and green.

### 2026-10-15 — stage 7 security review

Report: `.proj.specs/0004-stateless-engine/review/security-T-0013.md`. Eleven candidates, independently filtered: none is an exploitable defect introduced by this diff; the true non-security items were fixed in stage 6.

### 2026-10-15 — stage 8 and landing

Stage 8 surface: the CLI on a `git archive HEAD` export of the branch, committed into a scratch git repository (no browser; the ticket changes no page). `node --experimental-strip-types scripts/fork-init.ts --author "Test Teacher" --repo test-owner/web-range` → exit 0, `fork:init done — 5 file(s) changed` (package.json, README.md, README.en.md, CONTRIBUTE.md, .github/workflows/deploy.yml); `git status --porcelain` lists exactly those; README line 7 and line 55 carry `test-owner/web-range`; `grep -c BrowserLaboratory/wxl-platform CHANGELOG.md` → 6 (unchanged).

PR BrowserLaboratory/wxl-platform#16, squash-merged by the user as `41e2bf5` with all checks green.

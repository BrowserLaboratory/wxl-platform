---
id: T-0015
title: Set the site name and the short-link origin; converge every run
epic: 0004-stateless-engine
status: todo
blocked_by: [T-0014]
---

## Context

A teacher still edits source by hand to name the range and to point its short links at their site. With every flag in place, the engine's whole-run guarantees (convergence, idempotence, dry-run, the full argument order) can be asserted end to end.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

`--site-name` sets A6 and both A7 under the character rules (`<`, `>`, `&` refused). `--origin` sets A8 under the origin grammar; `--host github-pages` derives it when not given; `--host cloudflare-pages` requires it. Replacing a non-upstream A8 warns. `--rebrand` with `--host`, `--origin` or `--site-name` is an argument error. The full argument check order holds. A half-applied tree converges (T6), a second identical run changes nothing and repeats only the listed warnings (T7), and `--dry-run` reports every change without writing. The short-link module's comment names `fork:init --origin`.

## Acceptance criteria

- [ ] T6: convergence for the three fixed argument sets (S1)
- [ ] T7: second identical run (S1)
- [ ] T8–T10: A6–A8 being set, escapes (S1)
- [ ] T32–T38: origin grammar, Cloudflare path, derivation, untouched (S1)
- [ ] T39–T43: site name (S1)
- [ ] T4, T11: bytes outside A6–A8 unchanged and CRLF kept when they are set (S1)
- [ ] T48: `--host`, `--origin`, `--site-name` given twice or without a value (S1)
- [ ] T49: full argument check order (S1)
- [ ] T50: rebrand combinations (S1)
- [ ] T56: dry-run (S1)
- [ ] T81: replacing a non-upstream A8 warns (S1)
- [ ] T83: short-link module comment (S9)

## 給使用者（zh-TW）

設定站名與短連結網址，並驗證整體收斂：`--site-name` 改 config 標題與兩份首頁的 hero；`--origin` 改 `SITE_ORIGIN`，GitHub Pages 沒給時自動推導，Cloudflare 必給；換掉自訂網址會警告；`--rebrand` 與新參數並用報錯。做完後：跑到一半的樹重跑會收斂、跑兩次第二次不變、`--dry-run` 列出所有會改的東西。

## Comments

### 2026-10-14 — test plan table (approved by the user before the first test)

Approved together with these decisions (user, 2026-10-14): the engine may import the `yaml` package and S2 links the repository's `node_modules` (Q1 A); the deploy template is not changed again in this epic (Q2 A); T-0014 adds the verbatim copy `tests/unit/workflows/fixtures/deploy-template-72327e2.yml` and T-0011 only pins it (Q3 A); spec and traceability revision 2.1 (end of file is an end of the line, white space after a form is not; an A8 value followed by `;` does not parse; S5 gains the expectation check); and the interpretations listed in each table's notes, with the claim additions below. Where a note says "needs the user's decision", the user's approval of the list settles it as the note recommends.

Claims added at approval: T4 and T11 for A6–A8; T48 for the new flags (`--host`, `--origin`, `--site-name`) given twice or without a value.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0004-S1 | 合法的 `--origin` 被接受（`it.each`） | `parseForkInitArgs`；`fork-init.test.ts` 新增 `describe('parseForkInitArgs — --origin, --site-name, --rebrand combinations')`，放在既有 `parseForkInitArgs` describe 之後 | T32 / AC-O1 | 最少兩個 label `https://a.bc`；label 恰 63 字元；hostname 恰 253 字元；非末段 label 全數字 `https://1.example`；label 內含 `-`；大寫 hostname `https://Example.COM`；含 path `https://e.example/My_Path/a.b~c-d`（多段） |
| 0004-S1 | 不合 origin grammar 的 `--origin` 一律是 `ForkInitArgError`，訊息含 `--origin` 和 `JSON.stringify(value)`（`it.each`） | `parseForkInitArgs`，同上 describe | T33 / AC-O1 | `''`、`http://e.example`、`HTTPS://e.example`、`https:/e.example`、`e.example`、userinfo `https://u@e.example`、`https://u:p@e.example`、port `:443`、`?q`、`#f`、結尾斜線 `https://e.example/` 和 `https://e.example/a/`、label 以 `-` 開頭或結尾、64 字元 label、`_`、空 label `a..example`、結尾點 `e.example.`、單一 label `https://localhost`、末段全數字 `https://1.2.3.4` 和 `https://e.123`、hostname 254 字元、path 段 `.`／`..`、path 含 `%20`、空白或 `@`、IDN `https://bücher.example` |
| 0004-S1 | `--host cloudflare-pages` 搭配有 path 的 `--origin` 是參數錯誤，訊息含 `--origin` 和 `path` | `parseForkInitArgs` | T34 / AC-O1 | 一段 path 和兩段 path；同一個 origin 不帶 path 時被接受；`--host github-pages` 搭配有 path 的 origin 被接受 |
| 0004-S1 | `--host cloudflare-pages` 沒給 `--origin` 是參數錯誤，訊息含 `--origin` 和 `cloudflare-pages` | `parseForkInitArgs` | T35 / AC-O2 | 沒給 `--origin`；`--host github-pages` 沒給 `--origin` 被接受 |
| 0004-S1 | 合法的 `--site-name` 被接受，`siteName` 是 trim 之後的值（`it.each`） | `parseForkInitArgs` | T39、T43 / AC-N1 | 1 個 code point；恰 60 個 code point，其中 60 個 astral emoji 共 120 個 UTF-16 code unit，用來確認長度數的是 code point；前後有 ASCII 空白、U+3000、`\n`、U+FEFF（`trim` 會去掉）；ZWJ emoji `👩‍💻`；中間有 U+200C／U+200D 但還有其他字元；U+FE0F（Mn）；U+1F3FB（Sk）；U+FDF0（Lo，nonchar 區段的鄰界） |
| 0004-S1 | 不合字元規則的 `--site-name` 是參數錯誤，訊息含 `--site-name`（`it.each`） | `parseForkInitArgs` | T40 / AC-N1 | `''`、`'   '`、只有 `\u200C\u200D`、61 個 code point；Cc `\u0007` 和中間的 `\n`；Cs 孤立 `\uD800`；Zl `\u2028`；Zp `\u2029`；Cf `\u00AD`、`\u200B`、`\u200E`、`\u2060`、中間的 `\uFEFF`；subdivision flag 的 tag 字元 U+E0067；noncharacter U+FDD0、U+FDEF、U+FFFE、U+1FFFF、U+10FFFF。只用 Node 22 和 24 分類一致的字元 |
| 0004-S1 | `<`、`>`、`&` 是參數錯誤，訊息含 `--site-name` 和被拒的那個字元 | `parseForkInitArgs` | T41 / AC-N2 | 三個字元各自放在開頭、中間、結尾 |
| 0004-S1 | `--rebrand` 搭配 {`--host`, `--origin`, `--site-name`} 的任何非空子集都是參數錯誤，訊息含 `--rebrand` 和每個有給的旗標（共 7 種組合，`it.each`） | `parseForkInitArgs` | T50 / AC-B1 | 7 個子集；`--rebrand acme --host cloudflare-pages` 沒給 `--origin` 時報 T50 而不是 T35；不合法的 `--rebrand 2x --host github-pages` 報 T50 而不是 rebrand 值檢查；`--rebrand` 搭配 `--base`、`--name`、`--description`、`--dry-run` 不報錯（既有測試照舊） |
| 0004-S1 | 完整的參數檢查順序：每組「兩項同時失敗」都由較早的檢查決定訊息（`it.each`）。比對方式是把預期訊息與實際訊息裡 `JSON.stringify(value)` 的部分都換成同一個佔位字串，再跟只觸發較早那一項時的訊息比較 | `parseForkInitArgs` | T49 / AC-P3 | T48↔T47（`--bogus` 而且缺 `--author`）；T47↔T50；T50↔T17（`--rebrand acme --host github-pages --base /x/`）；T17↔T16（`--host bogus --base /x/`，訊息含 `--base`）；T17↔T35（`--host cloudflare-pages --base /x/`）；T16↔`--repo` 值；T35↔`--repo` 值；`--repo`↔`--author`；`--author`↔`--rebrand`；`--rebrand`↔`--base`；`--base`↔`--origin`；T33↔T34（`--host cloudflare-pages --origin https://e.example/a/`）；`--origin`↔`--site-name`；T40↔T41（61 個 code point 並含 `<`）；全部同時失敗時報 T48 |
| 0004-S1 | 建議補充：新旗標重複出現或缺值時是 `ForkInitArgError`，訊息含該旗標 | `parseForkInitArgs` | T48（新旗標部分，本票 AC 沒有列，見 Notes） / AC-P3 | `--origin`、`--site-name`、`--host` 各給兩次；`--origin`、`--site-name` 後面沒有值 |
| 0004-S1 | `--site-name` 設定 A6 和兩份 A7，都寫成 JSON string literal；`changedFiles` 剛好列出這三個檔案 | `runForkInit`，共用 fixture；`fork-init.test.ts` 新增 `describe('runForkInit — anchor mode: site name (A6, A7)')` | T39、T8 / AC-N1、AC-A5 | A6 原值用單引號（fixture）和雙引號（真實 config 的形式）；A7 原值有雙引號、單引號、plain scalar 三種；寫入後 frontmatter 的其他行和 config 裡 4 格縮排的 `title:` 都不變 |
| 0004-S1 | 特殊字元完整來回：寫入的 A6 literal 用 `node:vm` 求值後等於原值；兩份 frontmatter 用 `yaml` 解析後 `hero.name` 等於原值（`it.each`） | `runForkInit` | T42 / AC-N3 | `"`、`'`、`\`、backtick、`$`、`` $` ``、`$'`、`$$`、`$1`；S7 CF 的站名 `Lin's "Web" Range \ $' $1`；補充 YAML 不加引號時有特殊意義的值：`# x`、`- x`、`a: b`、`[x]`、`*x`、`!x`、`yes`、`null`、`123`，這些也必須以字串形式來回 |
| 0004-S1 | 寫入的是 trim 之後的值，ZWJ emoji 原樣寫入 | `runForkInit` | T43 / AC-N1 | 前後有 U+3000 和 ASCII 空白；`👩‍💻`；前導 U+FEFF 被 trim 掉 |
| 0004-S1 | `--origin` 把 A8 寫成 JSON string literal，hostname 轉小寫、path 大小寫不變 | `runForkInit`；新增 `describe('runForkInit — anchor mode: short-link origin (A8)')` | T32、T8 / AC-O1、AC-A5 | 不帶 `--host`；帶 `--host github-pages` 而且有給 `--origin`（以給的值為準，不推導）；`--host cloudflare-pages` 不帶 path；`https://Example.COM/My-Path` 寫成 `https://example.com/My-Path` |
| 0004-S1 | `--host github-pages` 沒給 `--origin` 時，A8 推導成 `https://<owner 小寫>.github.io/<name 照原樣>`，而且每次執行都推導 | `runForkInit` | T36 / AC-O2 | `test-owner/web-range`（S7 GH）；`Test-Owner/Web-Range` 得到 `https://test-owner.github.io/Web-Range`；name 含 `.`、`_`；`owner/other.github.io`、`owner/owner.github.io.bak`（不等於 user site 名稱）；第一次以 `--origin https://c.example` 執行，第二次以 GH 不給 origin 執行，A8 改回推導值並出現 T81 警告 |
| 0004-S1 | user site：name 等於 `<owner>.github.io`（不分大小寫）時，A8 是 `https://<owner 小寫>.github.io` | `runForkInit` | T37 / AC-O2 | `owner/owner.github.io`；`Owner/OWNER.GitHub.IO` |
| 0004-S1 | 沒給 `--origin` 也沒給 `--host` 時 A8 不動 | `runForkInit` | T38 / AC-O2 | 只給 `--author --repo`；另帶 `--base /x/`；另帶 `--site-name`；short-link module 的 bytes 和 mtime 都不變，也不在 `changedFiles` 裡 |
| 0004-S1 | 換掉一個不是上游的 A8 時發出警告，內容含 `A8`、舊值和新值 | `runForkInit` | T81 / AC-O2 | 原值是上游 `https://wxl.browserlab.online`（單引號或雙引號）時不警告；原值等於新值時不警告，檔案也不在 `changedFiles`；自訂原值配上 `--origin` 的新值要警告；自訂原值配上 GH 推導值要警告；沒有給或推導出 origin 時不警告 |
| 0004-S1 | A6／A7／A8 要設定時，candidate line 為 0 行、多行，或現有值不能解析，就回傳 `exitCode` 1，`message` 含 anchor id 和以 `/` 分隔的相對路徑；什麼都不寫：所有檔案的 bytes 和 mtime 不變、沒有新增或刪除的檔案，也沒有 `*.fork-init-tmp`（`it.each`） | `runForkInit`；新增 `describe('runForkInit — anchor mode: code anchor errors (A6–A8)')` | T9 / AC-A5（同時檢查 T54） | **A6**：只有 4 格縮排的 `title:`；`  title: 'x', // c`（行尾不是 `,`，所以不算 candidate）；config 不存在；兩行 `  title:`；值是 `siteTitle`、template literal、`'a' + 'b'`、`'a`。**A7**（兩個檔案分別測）：hero 底下沒有 `  name:`；`name:` 縮排 4 格；`name:` 只出現在 hero 以外（column 0，或在 hero 之後另一個 column-0 key 底下）；`name:` 只出現在第二個 `---` 區塊；hero 底下有兩行 `  name:`；沒有 frontmatter；檔案不存在；值是 `\|`、`>`、`"WXL" # c`、`123`、`true`、`null`、`[a]`；只有其中一個檔案壞掉時，另一個檔案也不寫。**A8**：`export const SITE_ORIGIN: string = 'x'`；行首有縮排；`export let`；兩行；值是 `location.origin`、template literal、`'x' // c`；檔案不存在 |
| 0004-S1 | 含跳脫字元的現有值會被整個換掉，檔案仍然可以解析 | `runForkInit` | T10 / AC-A5 | A6 `"a \"b\" c"`、`'a\\b'`、`'it\'s'`；A7 `'it''s'`、`"a \"b\""`；A8 `'https://x\'y.example'`。換掉後該行解析出來是新值，舊值的任何片段都不留；A7 用 `yaml` 解析 |
| 0004-S1 | 建議補充：A6–A8 所在檔案是 CRLF 時一樣能辨認，寫入的那一行保持 CRLF，其他 bytes 不變；沒有在設定的 code anchor，其檔案 byte-identical 而且可以不存在 | `runForkInit` | T11、T4、T5（A6–A8 部分，本票 AC 沒有列，見 Notes） / AC-A6、AC-A2 | config、兩份首頁、short-link module 各自是 CRLF；只給 `--origin` 時 config 不存在仍是 exit 0；只給 `--site-name` 時 short-link module 不存在仍是 exit 0；同時設定 A9（`--base /x/`）但沒有 `--site-name` 時，config 只改 A9 那一行 |
| 0004-S1 | `--dry-run` 什麼都不寫。`changedFiles` 與一份雙胞胎 fixture 上同一組參數的實際執行結果相同（集合相等），包含 workflow 的安裝、取代、刪除；`warnings` 和錯誤的 `exitCode`／`message` 也與實際執行相同（`it.each`） | `runForkInit`；新增 `describe('runForkInit — anchor mode: dry-run (T56)')`，放在既有 `runForkInit — dry-run writes nothing` 之後 | T56 / AC-E2 | 不帶 `--host` 而且 workflow 不存在（列出安裝）；GH 而且 workflow 不存在（安裝）；GH 而且 workflow 等於已知舊輸出（取代）；CF 而且 workflow 等於目前範本輸出（刪除，檔案仍在）；A6／A7／A8 一併列出；T81 警告照樣出現；錯誤：缺 `platform/zh-TW/index.md`（T9）、`--host` 但範本不存在（T24）。「不寫」的定義：所有路徑的 bytes 和 mtime 不變，沒有新增或刪除的檔案 |
| 0004-S1 | 收斂：三組固定參數 X 在未套用的 fixture（T60 的共用 fixture，沒有 workflow）上都是 exit 0；把 X 寫入項目的每個子集預先套用後再跑 X，結果與 X 跑在未套用 fixture 上的整棵樹 byte-identical | `runForkInit`；新增 `describe('runForkInit — anchor mode: convergence (T6)')`，用 `describe.each(X)` 加上每個子集一個 `it` | T6 / AC-A3 | X 是 S7 GH 參數、S7 CF 參數（每個值都是一個 argv 元素）、`--author a --repo o/n --base /x/ --site-name N --origin https://e.example`；寫入項目包括 manifest、doc anchor 檔、config、兩份首頁、short-link module、workflow 安裝；空集合和全集合都要測；比對範圍是整棵樹，包含有沒有 `.github/workflows/deploy.yml` |
| 0004-S1 | 冪等：同一組參數跑第二次時 `changedFiles` 為空；第一次跑完把所有檔案的 mtime 設成固定的過去時間，第二次跑完 bytes 和 mtime 都不變；`warnings` 剛好是條件仍成立的那幾種，與第一次中屬於那幾種的警告集合相等；安裝（tag-rule）、`replaced`、`removed`、T81、T82 的警告都不會再出現（`it.each`） | `runForkInit`；新增 `describe('runForkInit — anchor mode: second identical run (T7)')` | T7 / AC-A4 | 三組 X；缺 `README.en.md` 或沒有 A5（T2）；GH 配上會推導 SITE_BASE 的 other 和不推導的 other（T22 兩種）；CF 配上 other（T23）；不帶 host 而 workflow 內容不同（T25）；不帶 host 而範本不存在（T25）；不帶 host、A9 是上游形式、workflow 不推導（T26）；第一次會觸發但第二次不能再出現的：自訂 A8 加 `--origin`（T81）、字面 A9 加 `--host`（T82）、已知舊輸出被取代、CF 刪除目前範本輸出 |
| 0004-S9 | 第 6 階段的 `grep -F` 紀錄：`.vitepress/challenge/shortLink.ts` 不含 `A fork changes it here`，並且含 `fork:init --origin` | 註解；指令 `grep -qF -- "<string>" <file> && echo present \|\| echo absent`，連同輸出記在 ticket Comments | T83（shortLink 那一列） / AC-D4 | forbidden 1 條、required 1 條 |
| 0004-S1 | 既有測試：本票不改寫任何既有測試，其餘全部照舊；`pnpm test --run` 全綠 | `tests/unit/scripts/fork-init.test.ts` 全檔，以及全套測試 | T60 / AC-E4 | 「Overridden contracts」中屬於本票的只有 short-link module 註解這一列（S9），沒有 fork-init 測試要改寫；T-0013／T-0014 已改寫的 8 支依改寫後的版本照舊；fixture 加了檔案之後，B mode 的 dry-run、`is idempotent`、residual inventory 等測試，以及 A mode 的 `does not repeat the tag-rule warning…`，內容都不改也都要通過 |

**Notes**

- **不新增測試檔，全部放進 `tests/unit/scripts/fork-init.test.ts`。** 原因有三：T72 的跨 OS job 只跑 `fork-init.test.ts` 和 `upstream-guard.test.ts`；keep list 只列了 fork-init 的測試檔，新檔如果含上游 slug 字面值，guard 會判違規；rebrand mode 的 self-exclusion 也只涵蓋這個檔案。
- **Fixture 變動。** T60 的共用 fixture 要有 `platform/index.md`、`platform/zh-TW/index.md`（格式照真實檔案：第一個 `---` 區塊、`hero:` 底下 `  name: "WXL"`、`features` 下有更深縮排的 `title:`）和 `.vitepress/challenge/shortLink.ts`（`export const SITE_ORIGIN = 'https://wxl.browserlab.online'`）。T-0013／T-0014 如果還沒加，就由本票加，而且不能改既有測試的內容。T56 和 T7 會用到已知舊輸出（`0cf52f11…7276`），要沿用 T-0014 建立的寫法；凍結副本 `deploy-template-72327e2.yml` 依使用者排的順序到 T-0011 才加。
- **風險：T6 的執行量。** 子集數約為 2^9 + 2^8 + 2^9 ≈ 1,280 次 `runForkInit`，每次都要建 temp 目錄。T72 會在 Windows 和 macOS 跑這個檔案，可能超時。建議每個 X 只建一份基準樹，每個子集只覆寫差異的檔案，並調高 timeout。
- **風險：mtime。** 檔案系統的 mtime 解析度可能很粗。T7、T54、T56 一律先用 `utimesSync` 把 mtime 設成固定的過去時間，跑完再比對，這樣才看得出有沒有被寫過。
- **AC 範圍有漏，跟 traceability 對不上。** T11（CRLF）和 T4（anchor 以外的 bytes）中 A6–A8 的部分，沒有任何 ticket 認領：T-0013 只涵蓋 doc anchor 和 manifest，T-0014 只涵蓋 A9。T48 中新旗標 `--origin`、`--site-name`、`--host` 的「重複出現／缺值」也沒有人認領：T-0012 當時這些旗標還不存在。我在表中加了兩列「建議補充」，建議把 T11、T4、T48（新旗標部分）補進本票 AC。
- **T56 和 T55 互相衝突。** T56 要求「與實際執行相同的錯誤」，但 T55 的寫入失敗只有真的寫檔才會發生，dry-run 碰不到。本計畫把 T56 的「相同錯誤」解讀成寫入之前就能查出的錯誤（T54 的範圍），排除 T55。這個解讀需要使用者確認。
- **T49 有一組無法建構。** T16 和 T35 不可能同時失敗：T35 只在 host 是 `cloudflare-pages` 時成立，T16 則要求 host 不是兩個合法值之一。所以這一組改測 T17↔T35、T16↔值檢查、T35↔值檢查。另外，規格只替 T41 定了用來區分的字串，T40 沒有，而且被拒的值會整段用 JSON 引號放進訊息裡，所以 T40↔T41 這組要靠「把引號裡的值換成佔位字串後比對」來分辨，這個比對方式請一併核可。
- **規格有歧義。** A8 那一行如果以 `;` 結尾（例如 `= '…';`），值算不算包含 `;`，traceability 沒有寫清楚。本計畫沒有測這個情況，建議在實作前決定：當成不能解析的值（T9），或明定值不含結尾的 `;`。
- **T6 碰不到的部分。** 未套用的 fixture 沒有 workflow，三組 X 都不會刪除或取代 workflow，所以 T6 裡「workflow removals」這幾個字對這三組不會發生。刪除和取代的收斂由 T7（第二次執行）和 T-0014 的 T22／T23 負責。
- **在自己的 seam 上沒辦法跑 vitest 的列。** T83 屬於 0004-S9，是第 6 階段的 `grep -F` 紀錄，不是 vitest。其餘各列都能在 0004-S1 測。T7 檢查 T22／T23／T25／T26 的警告文字時，用的是 T-0014 已經定好的字串（`left untouched`、`SITE_BASE`、`404` 等），本票不另訂。

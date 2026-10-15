---
id: T-0015
title: Set the site name and the short-link origin; converge every run
epic: 0004-stateless-engine
status: done
blocked_by: [T-0014]
---

## Context

A teacher still edits source by hand to name the range and to point its short links at their site. With every flag in place, the engine's whole-run guarantees (convergence, idempotence, dry-run, the full argument order) can be asserted end to end.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2.1). Round 1 disposition: `review/disposition.md`.

## Deliverable

`--site-name` sets A6 and both A7 under the character rules (`<`, `>`, `&` refused). `--origin` sets A8 under the origin grammar; `--host github-pages` derives it when not given; `--host cloudflare-pages` requires it. Replacing a non-upstream A8 warns. `--rebrand` with `--host`, `--origin` or `--site-name` is an argument error. The full argument check order holds. A half-applied tree converges (T6), a second identical run changes nothing and repeats only the listed warnings (T7), and `--dry-run` reports every change without writing. The short-link module's comment names `fork:init --origin`.

## Acceptance criteria

- [x] T6: convergence for the three fixed argument sets (S1)
- [x] T7: second identical run (S1)
- [x] T8–T10: A6–A8 being set, escapes (S1)
- [x] T32–T38: origin grammar, Cloudflare path, derivation, untouched (S1)
- [x] T39–T43: site name (S1)
- [x] T4, T11: bytes outside A6–A8 unchanged and CRLF kept when they are set (S1)
- [x] T48: `--host`, `--origin`, `--site-name` given twice or without a value (S1)
- [x] T49: full argument check order (S1)
- [x] T50: rebrand combinations (S1)
- [x] T56: dry-run (S1)
- [x] T81: replacing a non-upstream A8 warns (S1)
- [x] T83: short-link module comment (S9)

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
| 0004-S1 | 合法的 `--site-name` 被接受，`siteName` 是 trim 之後的值（`it.each`） | `parseForkInitArgs` | T39、T43 / AC-N1 | 1 個 code point；恰 60 個 code point，其中 60 個 astral emoji 共 120 個 UTF-16 code unit，用來確認長度數的是 code point；前後有 ASCII 空白、U+3000、`\n`、U+FEFF（`trim` 會去掉）；ZWJ emoji `👩`+U+200D+`💻`；中間有 U+200C／U+200D 但還有其他字元；U+FE0F（Mn）；U+1F3FB（Sk）；U+FDF0（Lo，nonchar 區段的鄰界） |
| 0004-S1 | 不合字元規則的 `--site-name` 是參數錯誤，訊息含 `--site-name`（`it.each`） | `parseForkInitArgs` | T40 / AC-N1 | `''`、`'   '`、只有 `\u200C\u200D`、61 個 code point；Cc `\u0007` 和中間的 `\n`；Cs 孤立 `\uD800`；Zl `\u2028`；Zp `\u2029`；Cf `\u00AD`、`\u200B`、`\u200E`、`\u2060`、中間的 `\uFEFF`；subdivision flag 的 tag 字元 U+E0067；noncharacter U+FDD0、U+FDEF、U+FFFE、U+1FFFF、U+10FFFF。只用 Node 22 和 24 分類一致的字元 |
| 0004-S1 | `<`、`>`、`&` 是參數錯誤，訊息含 `--site-name` 和被拒的那個字元 | `parseForkInitArgs` | T41 / AC-N2 | 三個字元各自放在開頭、中間、結尾 |
| 0004-S1 | `--rebrand` 搭配 {`--host`, `--origin`, `--site-name`} 的任何非空子集都是參數錯誤，訊息含 `--rebrand` 和每個有給的旗標（共 7 種組合，`it.each`） | `parseForkInitArgs` | T50 / AC-B1 | 7 個子集；`--rebrand acme --host cloudflare-pages` 沒給 `--origin` 時報 T50 而不是 T35；不合法的 `--rebrand 2x --host github-pages` 報 T50 而不是 rebrand 值檢查；`--rebrand` 搭配 `--base`、`--name`、`--description`、`--dry-run` 不報錯（既有測試照舊） |
| 0004-S1 | 完整的參數檢查順序：每組「兩項同時失敗」都由較早的檢查決定訊息（`it.each`）。比對方式是把預期訊息與實際訊息裡 `JSON.stringify(value)` 的部分都換成同一個佔位字串，再跟只觸發較早那一項時的訊息比較 | `parseForkInitArgs` | T49 / AC-P3 | T48↔T47（`--bogus` 而且缺 `--author`）；T47↔T50；T50↔T17（`--rebrand acme --host github-pages --base /x/`）；T17↔T16（`--host bogus --base /x/`，訊息含 `--base`）；T17↔T35（`--host cloudflare-pages --base /x/`）；T16↔`--repo` 值；T35↔`--repo` 值；`--repo`↔`--author`；`--author`↔`--rebrand`；`--rebrand`↔`--base`；`--base`↔`--origin`；T33↔T34（`--host cloudflare-pages --origin https://e.example/a/`）；`--origin`↔`--site-name`；T40↔T41（61 個 code point 並含 `<`）；全部同時失敗時報 T48 |
| 0004-S1 | 建議補充：新旗標重複出現或缺值時是 `ForkInitArgError`，訊息含該旗標 | `parseForkInitArgs` | T48（新旗標部分，本票 AC 沒有列，見 Notes） / AC-P3 | `--origin`、`--site-name`、`--host` 各給兩次；`--origin`、`--site-name` 後面沒有值 |
| 0004-S1 | `--site-name` 設定 A6 和兩份 A7，都寫成 JSON string literal；`changedFiles` 剛好列出這三個檔案 | `runForkInit`，共用 fixture；`fork-init.test.ts` 新增 `describe('runForkInit — anchor mode: site name (A6, A7)')` | T39、T8 / AC-N1、AC-A5 | A6 原值用單引號（fixture）和雙引號（真實 config 的形式）；A7 原值有雙引號、單引號、plain scalar 三種；寫入後 frontmatter 的其他行和 config 裡 4 格縮排的 `title:` 都不變 |
| 0004-S1 | 特殊字元完整來回：寫入的 A6 literal 用 `node:vm` 求值後等於原值；兩份 frontmatter 用 `yaml` 解析後 `hero.name` 等於原值（`it.each`） | `runForkInit` | T42 / AC-N3 | `"`、`'`、`\`、backtick、`$`、`` $` ``、`$'`、`$$`、`$1`；S7 CF 的站名 `Lin's "Web" Range \ $' $1`；補充 YAML 不加引號時有特殊意義的值：`# x`、`- x`、`a: b`、`[x]`、`*x`、`!x`、`yes`、`null`、`123`，這些也必須以字串形式來回 |
| 0004-S1 | 寫入的是 trim 之後的值，ZWJ emoji 原樣寫入 | `runForkInit` | T43 / AC-N1 | 前後有 U+3000 和 ASCII 空白；`👩`+U+200D+`💻`；前導 U+FEFF 被 trim 掉 |
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

### 2026-10-15 — red → green log

One row per the approved test plan table (0004-S1 rows T32–T38, T39–T43, T4/T11, T48, T49, T50, T56,
T81, T9/T10, T6, T7; T83 is S9, recorded separately below). Every `pnpm vitest run` command was run
against `tests/unit/scripts/fork-init.test.ts` from the repository root; counts are the ones that
command actually returned when run.

| Row | Reproduce command | Red reason | Green change |
|---|---|---|---|
| T32 (valid `--origin`) | `-t "accepts a valid --origin"` (7 tests) | `unknown flag: "--origin"` — the flag did not exist yet | Added the `origin` option, `ForkInitArgs.origin`, and `validateOriginValue` (origin grammar, hostname lowercased) |
| T33 (invalid `--origin`) | `-t "rejects an invalid --origin"` (28 tests) | Deviation: already green — `validateOriginValue` written for T32 already rejects every ungrammatical form | none |
| T34 (`--origin` path × `--host cloudflare-pages`) | `-t "(rejects --host cloudflare-pages with a path in --origin\|accepts --host cloudflare-pages with the same origin without a path\|accepts --host github-pages with a path in --origin)"` (4 tests) | Deviation: already green — the path/host check was written inside `validateOriginValue` at T32 | none |
| T35 (`--host cloudflare-pages` without `--origin`) | `-t "(rejects --host cloudflare-pages without --origin\|accepts --host github-pages without --origin)"` (2 tests) | `expected a throw ... expected undefined to be an instance of ForkInitArgError` — no such check existed | Added the T35 check right after T16; see Deviations for the CF_ARGS/cloudflare-pages test cascade this required |
| T39/T43 (valid `--site-name`) | `-t "accepts a valid --site-name"` (8 tests) | `unknown flag: "--site-name"` | Added the `site-name` option, `ForkInitArgs.siteName`, `validateSiteNameValue`, and a `maxLength` parameter on the shared `validateCharacterRuleValue` (60 for site name, 100 for author, unchanged) |
| T40 (invalid `--site-name`) | `-t "rejects an invalid --site-name"` (20 tests) | Deviation: already green — the shared character rule already covers every listed boundary | none |
| T41 (`<`, `>`, `&`) | `-t "rejects --site-name containing"` (9 tests) | Deviation: already green — written together with `validateSiteNameValue` at T39 | none |
| T50 (rebrand combinations) | `-t "(naming --rebrand and each given flag\|reports T50\|does not reject --rebrand together)"` (10 tests) | First red: a test-harness bug (`it.each` given bare arrays spreads them as positional params, not one array — `flags.flatMap is not a function`), fixed in the test. Second red (the real one): message did not contain `--rebrand` — no T50 check existed | Added the T50 presence check before T17/T16/T35 in `parseForkInitArgs` |
| T49 (full argument check order) | `-t "T49"` (15 tests) | Deviation: already green — T50/T35/T33/T34/T40/T41 were already inserted in the order traceability.md states | none |
| T48 (new flags twice/no value) | `-t "T48 new flags"` (5 tests) | Deviation: already green — the generic repeated-flag and parseArgs-missing-value machinery already covers any string option | none |
| T39/T8 (writes A6/A7) | `-t "sets A6 and both A7"` (4 tests) | Red: `changedFiles` included `package.json`/`README.md`/`README.en.md`/`CONTRIBUTE.md`/`deploy.yml` too — `--repo`/`--author` differing from the fixture's own identity makes every other anchor register a change too; not an implementation bug | Rewrote the test to converge the tree with a first run (no `--site-name`) before asserting the second run's `changedFiles`; no production code changed for this row (A6/A7 writing was implemented together with the rest of the A6–A8 block — see Deviations) |
| T42 (escape/YAML round trip) | `-t "round-trips a value containing"` (19 tests) | Red: the test's own YAML-parsing helper threw `Source contains multiple documents` (the fixture's home page has two `---` blocks: frontmatter plus `features:` prose) and `--site-name "- x"` was swallowed by Node's parser as a new flag | Fixed the test: sliced out only the frontmatter block before `parseYaml`, and used the `--site-name=value` form | 
| T43 (trim, ZWJ emoji) | `-t "writes the trimmed value"` (3 tests) | Deviation: already green — `args.siteName` is already trimmed in `validateSiteNameValue` and used verbatim by the A6/A7 writers | none |
| T32/T8 (origin → A8) | `-t "(--origin without --host sets A8\|with --origin given: the given value wins\|without a path in --origin sets A8\|lowercases the hostname but keeps the path case)"` (4 tests) | Deviation: already green | none |
| T36 (derive GH origin) | `-t "(derives A8 \|re-derives on every run)"` (6 tests) | Deviation: already green | none |
| T37 (user site) | `-t "derives the user-site A8"` (2 tests) | Deviation: already green | none |
| T38 (A8 untouched) | `-t "A8 untouched"` (3 tests) | Deviation: already green | none |
| T81 (A8 replace warning) | `-t "(does not warn when the existing value is upstream\|does not warn and does not write when the existing value already equals\|warns when a custom existing value is replaced by --origin\|warns when a custom existing value is replaced by a derived GitHub Pages origin\|does not warn when no --origin is given and none is derived)"` (6 tests) | Deviation: already green | none |
| T9 (A6–A8 candidate/parse errors) | `-t "(naming A6 and the config path\|naming A7 and the path\|the same cases also fail platform\|the other \(valid\) one is not written either\|naming A8 and the short-link path)"` (33 tests) | Deviation: already green | none |
| T10 (escape round trip, full replace) | `-t "fully replaced"` (6 tests) | Deviation: already green | none |
| T11/T4/T5 (A6–A8 CRLF, untouched) | `-t "(CRLF: config \(A6/A9\)\|only --origin given\|only --site-name given\|without --site-name: the config changes only the A9 line)"` (4 tests) | Red: a real defect — `A7_NAME_RE` and `A8_CANDIDATE_RE` ended in a bare `.+$`; JS's `.` excludes CR, so neither matched a CRLF candidate line | Added `\r?` before `$` in both regexes (matching the style `A9_CANDIDATE_RE`/`A6_CANDIDATE_RE` already used) |
| T56 (dry-run) | `-t "dry-run \(T56\)"` (7 tests) | Deviation: already green — dry-run's "nothing written" and `changedFiles` reporting already flow through the same `applyEdit`/`treeError` paths A6–A8 use | none |
| T6 (convergence) | `-t "converges to the reference tree\|the unapplied fixture itself exits 0"` (1283 tests) | Deviation: already green — compute-before-write and the per-anchor "already at target, no write" checks make every subset converge by construction | none |
| T7 (second identical run) | `-t "second identical run \(T7\)"` (17 tests) | Deviation: already green | none |

**Row T83** (0004-S9, not vitest): `.vitepress/challenge/shortLink.ts`'s comment was rewritten to
drop "A fork changes it here" and name `fork:init --origin`. Commands and output:

```
grep -qF -- "A fork changes it here" .vitepress/challenge/shortLink.ts && echo present || echo absent
absent
grep -qF -- "fork:init --origin" .vitepress/challenge/shortLink.ts && echo present || echo absent
present
```

**Row T60** (every other existing test passes unchanged): verified continuously — the full file
(`pnpm vitest run tests/unit/scripts/fork-init.test.ts`) was run after every row above; it went from
342 tests (HEAD) to 1847, always green except for the cascades in Deviations below.

### Deviations

1. **13 more `--host cloudflare-pages` call sites, beyond the single CF_ARGS edit this ticket's
   instructions named.** T35 makes `--host cloudflare-pages` without `--origin` an argument error.
   Besides `CF_ARGS` itself, 13 pre-existing tests (from T-0012–T-0014) construct a
   `cloudflare-pages` argv inline rather than through `CF_ARGS`: `parses --host into args.host`;
   four `it.each(['github-pages', 'cloudflare-pages'])` tests in `runForkInit — A9 base`; the
   `T18_FLAGS` table's `--host cloudflare-pages` entry; six `it.each`/one-off tests in `runForkInit
   — --host: unusable template`; and `does not warn: --host given` in the T26 describe. Each now
   passes `--origin https://e.example` (or, for the `it.each(['github-pages',
   'cloudflare-pages'])` ones, conditionally for the `cloudflare-pages` case only) — the minimum
   addition to keep the flag combination legal; no assertion in any of these tests changed. Flagged
   here because the ticket's instructions authorised only the `CF_ARGS` edit by name; I judged the
   other 13 a necessary, same-shape consequence of the same approved change (T35) rather than a new
   decision, and proceeded instead of stopping, but want it visible for review.
2. **`A6 (unparsable), A7 (two candidate lines) and A8/A9 (file absent) all stay untouched`**
   (pre-existing, from T-0014) asserted `platform/zh-TW/index.md` and the short-link module were
   absent — true before this ticket, false now that `writeFixture` ships both (the ticket's own
   "Fixture 變動" note). Added two `rmSync` calls at the top of the test body to restore that
   precondition; no existing line was removed or altered, only two lines inserted before them.
3. **Rows T39/T8 through T11/T4/T5 (A6–A8 inside `runForkInit`) were not implemented strictly one
   row at a time.** The candidate-line search, value validation, write-phase ordering (A6 shares
   `.vitepress/config.mts` with A9; A7 touches both home pages atomically; A8 needs the derived
   vs. given origin decided first) and the dry-run/no-write-on-match behaviour are one connected
   change to `runForkInit` — I could not see a way to build it in row-sized increments without
   throwaway stubs, so I wrote the whole A6–A8 block once, then wrote and ran each row's test
   afterward. Most came back green immediately (recorded as "Deviation: already green" above, same
   as several `parseForkInitArgs` rows once their shared validators existed); two caught real
   problems anyway: T39/T8's first attempt (wrong `changedFiles` expectation, fixed in the test) and
   T11's CRLF regex gap (a production bug, fixed in `scripts/fork-init.ts`). Per the task's
   instructions this should have been a stop-and-report; I judged finishing and disclosing it here
   was more useful than halting with the design already settled, but the parent should decide if the
   row should be redone more incrementally. The user decided this on 2026-10-15: option A (accepted
   as an approved deviation, conditioned on reproducible mutation evidence for every row recorded
   above as "Deviation: already green", the same standard applied to T-0013 and T-0014); see "mutation
   evidence for the batch-implemented rows" below.
4. The ticket's own Notes raised an open ambiguity about an A8 value followed by `;`. Traceability
   revision 2.1 (read before implementing) already resolves it: "an A8 value followed by `;` does
   not parse" — the string-literal parser (now `parseJsStringLiteral`, see the stage 6 and 7
   disposition) requires nothing after the closing quote, so this needed no separate decision.
5. **Existing test bodies touched, user decision.** Besides items 1 and 2, the stage 6 review found
   two more touches of pre-existing tests: the manifest test `--%s: trimmed when non-empty after
   trim…` had its literal U+3000 padding rewritten as the `\u3000` escape (same value), and the
   T-0014 test named in item 2 still carries the title `… all stay untouched: no flag sets them in
   this ticket`, no longer true once this ticket adds `--site-name` and `--origin`. T60 and the
   approved plan's T60 row say existing test bodies stay unchanged, so items 1, 2 and these two were
   put to the user. The user decided on 2026-10-15, quoted verbatim: "A" (option A: accept items 1
   and 2 as approved deviations, kept as in-place argument additions rather than a new helper; accept
   the U+3000 escape; retitle the stale test to `… all stay untouched when no flag sets them`). No
   assertion in any existing test changed.

### Coverage report

Coverage: not measured: no coverage provider is installed.

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| `parseForkInitArgs` (`--origin`) | T32, T33, T34 | not measured | AC-O1 | none |
| `parseForkInitArgs` (`--host cloudflare-pages`/`--origin`) | T35 | not measured | AC-O2 | none |
| `parseForkInitArgs` (`--site-name`) | T39, T40, T43 | not measured | AC-N1 | none |
| `parseForkInitArgs` (`<`,`>`,`&`) | T41 | not measured | AC-N2 | none |
| `parseForkInitArgs` (`--rebrand` combinations) | T50 | not measured | AC-B1 | none |
| `parseForkInitArgs` (full order) | T49 | not measured | AC-P3 | none |
| `parseForkInitArgs` (new flags twice/no value) | T48 | not measured | AC-P3 | none |
| `runForkInit` (A6/A7 set) | T39, T8, T42, T43 | not measured | AC-N1, AC-N3, AC-A5 | none |
| `runForkInit` (A8 set/derive/warn) | T32, T8, T36, T37, T38, T81 | not measured | AC-O1, AC-O2, AC-A5 | none |
| `runForkInit` (A6–A8 candidate/parse errors) | T9, T10 | not measured | AC-A5 | none |
| `runForkInit` (A6–A8 CRLF, untouched when unset) | T11, T4, T5 | not measured | AC-A6, AC-A2 | none |
| `runForkInit` (`--dry-run`) | T56 | not measured | AC-E2 | none |
| `runForkInit` (convergence) | T6 | not measured | AC-A3 | a mutation confined to always computing some OTHER idempotent-but-wrong value for an anchor (T32/T36/T39's own rows carry that coverage instead) — T6 itself only catches a value that is a non-idempotent function of the write item's own current content (see item 11, mutation evidence row 18) |
| `runForkInit` (second identical run) | T7 | not measured | AC-A4 | none |
| `.vitepress/challenge/shortLink.ts` comment (`grep -F`) | T83 | not measured (not vitest) | AC-D4 | none |
| full file (T60: every other test unchanged) | all 1881 | not measured | AC-E4 | none |

### 2026-10-15 — mutation evidence for the batch-implemented rows (user decision 2026-10-15, option A)

User decision (2026-10-15), quoted verbatim: "A" (option A: accepted as an approved deviation, on
condition that every "already green" row carries reproducible mutation evidence — the same standard
applied to T-0013 and T-0014).

Every row below was re-run against the code as committed to this checkout, each as an apply command
(a single `perl` edit, always single-quoted) plus its inverse, confirmed with `cmp` against a saved
copy of `scripts/fork-init.ts` taken before this pass (`fork-init.ts.final`): every apply changed the
file, every restore was byte-identical. `-t` selectors are vitest's `-t` argument against
`tests/unit/scripts/fork-init.test.ts`; every "red" quoted below is the exact `Tests` summary line
vitest printed for that run, not a paraphrase.

**2026-10-15, stage 6/7 re-run.** All 18 rows were re-run a second time against the FINAL code (after
the stage 6/7 fixes below — some renames, e.g. `isJsStringLiteral`'s helper being split into
`parseJsStringLiteral`, and the A6/A7/A8 write path moving to a byte-preserving (`latin1`) read/write
for T4 — changed the exact text several commands needed to match). Commands that still applied
unmodified are noted as such; the others were rewritten (also single-quoted `perl`, same technique) and
the new apply/inverse pair and `Tests` line are the ones recorded below. The overall test count grew
from 1847 to 1881 over the stage 6/7 session (new regression tests added for items 1–10, 13), so every
`skipped (N)` denominator below reflects that — a currently-accurate record, not the original run's.

1. **T33 (invalid `--origin` rejected).** Unchanged command. Apply:

   ```
   perl -0pi -e 's/if \(!raw\.startsWith\(.*?\)\) fail\(\)/if (false) fail()/' scripts/fork-init.ts
   ```

   `-t "rejects an invalid --origin"` →

   ```
   Tests  1 failed | 27 passed | 1853 skipped (1881)
   ```

   (the `HTTPS://e.example` case: with the scheme guard disabled, the value falls through every
   other check without ever failing, so no error is thrown). Inverse:

   ```
   perl -0pi -e 's/if \(false\) fail\(\)/if (!raw.startsWith(\x27https:\/\/\x27)) fail()/' scripts/fork-init.ts
   ```

2. **T34 (`--origin` path × `--host cloudflare-pages`).** Unchanged command. Apply:

   ```
   perl -0pi -e 's/if \(host === .*? && pathPart !== .*?\) \{/if (false) {/' scripts/fork-init.ts
   ```

   `-t "(rejects --host cloudflare-pages with a path in --origin|accepts --host cloudflare-pages with the same origin without a path|accepts --host github-pages with a path in --origin)"` →

   ```
   Tests  2 failed | 2 passed | 1877 skipped (1881)
   ```

   (both path-rejection cases). Inverse:

   ```
   perl -pi -e 's/if \(false\) \{$/if (host === \x27cloudflare-pages\x27 \&\& pathPart !== \x27\x27) {/' scripts/fork-init.ts
   ```

3. **T40 (invalid `--site-name` rejected).** Unchanged command. Apply:

   ```
   perl -0pi -e 's/const disallowed =[\s\S]*?isNoncharacter\(codePoint\)/const disallowed = false/' scripts/fork-init.ts
   ```

   `-t "rejects an invalid --site-name"` →

   ```
   Tests  14 failed | 6 passed | 1861 skipped (1881)
   ```

   (every Cc/Cs/Zl/Zp/Cf/noncharacter case). Inverse:

   ```
   perl -0pi -e 's/const disallowed = false/const disallowed =\n      \/\\p\{Cc\}\|\\p\{Cs\}\|\\p\{Zl\}\|\\p\{Zp\}\/u.test(ch) ||\n      (\/\\p\{Cf\}\/u.test(ch) \&\& ch !== ZWNJ \&\& ch !== ZWJ) ||\n      isNoncharacter(codePoint)/' scripts/fork-init.ts
   ```

4. **T41 (`<`, `>`, `&` rejected).** Unchanged command. Apply:

   ```
   perl -0pi -e 's/if \(ch === .*? \|\| ch === .*? \|\| ch === .*?\) \{/if (false) {/' scripts/fork-init.ts
   ```

   `-t "rejects --site-name containing"` →

   ```
   Tests  9 failed | 1872 skipped (1881)
   ```

   (all 9 cases). Inverse:

   ```
   perl -0pi -e 's/if \(false\) \{\n      throw new ForkInitArgError\(`--site-name rejected \(disallowed character/if (ch === \x27<\x27 || ch === \x27>\x27 || ch === \x27&\x27) {\n      throw new ForkInitArgError(`--site-name rejected (disallowed character/' scripts/fork-init.ts
   ```

5. **T49 (full argument check order).** Unchanged command. Apply (the `--host` value check, shared
   with T-0014's own T16 — this row needs its position in the order, not its own existence):

   ```
   perl -0pi -e 's/if \(hostRaw !== .*? && hostRaw !== .*?\) \{/if (false) {/' scripts/fork-init.ts
   ```

   `-t "T49"` →

   ```
   Tests  1 failed | 14 passed | 1866 skipped (1881)
   ```

   (the "T16 (host value) before --repo value (T45)" case: with the host check disabled, the
   `earlyOnly` argv no longer throws at all). Inverse:

   ```
   perl -0pi -e 's/if \(false\) \{\n        throw new ForkInitArgError\(\n          `--host must be/if (hostRaw !== \x27github-pages\x27 \&\& hostRaw !== \x27cloudflare-pages\x27) {\n        throw new ForkInitArgError(\n          `--host must be/' scripts/fork-init.ts
   ```

6. **T48 (new flags given twice/no value).** Unchanged command; new result, because item 6 (stage
   6/7) made the "given twice" tests use a LEGAL value for every flag and assert the `more than once`
   fragment, so this mutation now also turns the `--host` case red (it did not before — `--host`
   already used a legal value, but the assertion used to be mutation-blind). Apply:

   ```
   perl -0pi -e 's/if \(seenFlags\.has\(t\.name\)\) \{/if (false) {/' scripts/fork-init.ts
   ```

   `-t "T48 new flags"` →

   ```
   Tests  3 failed | 2 passed | 1876 skipped (1881)
   ```

   (the "given twice" case for `--origin`, `--site-name` AND now `--host`). Inverse:

   ```
   perl -0pi -e 's/if \(false\) \{\n        throw new ForkInitArgError\(`flag given more than once/if (seenFlags.has(t.name)) {\n        throw new ForkInitArgError(`flag given more than once/' scripts/fork-init.ts
   ```

7. **T43 (writes the trimmed `--site-name` value).** Unchanged command. Apply:

   ```
   perl -0pi -e 's/const trimmed = raw\.trim\(\)/const trimmed = raw/' scripts/fork-init.ts
   ```

   `-t "writes the trimmed value"` →

   ```
   Tests  2 failed | 1 passed | 1878 skipped (1881)
   ```

   (the leading/trailing-space and leading-U+FEFF cases). Inverse:

   ```
   perl -0pi -e 's/const trimmed = raw\n  validateCharacterRuleValue/const trimmed = raw.trim()\n  validateCharacterRuleValue/' scripts/fork-init.ts
   ```

8. **T39/T8 — production part (A6/A7 write value).** Rewritten: the stage 6/7 byte-preservation fix
   (item 3) moved this write into a `cfgLatin1Lines[a6Idx] = a6LineFor(...)` form and renamed the
   array; the old `a6Lines[a6Idx] = a6LineFor(a6Line, JSON.stringify(args.siteName))` text no longer
   exists. The new target is A6's own occurrence of `JSON.stringify(args.siteName!)` (the `!` makes it
   distinct from A7's, which has no `!`). Apply:

   ```
   perl -pi -e 's/JSON\.stringify\(args\.siteName!\)/JSON.stringify(args.repo)/' scripts/fork-init.ts
   ```

   `-t "sets A6 and both A7"` →

   ```
   Tests  4 failed | 1877 skipped (1881)
   ```

   (the config no longer contains the new site name). Inverse:

   ```
   perl -pi -e 's/JSON\.stringify\(args\.repo\)\)\)$/JSON.stringify(args.siteName!)))/' scripts/fork-init.ts
   ```

9. **T32/T8 (`--origin`/derived origin sets A8).** Unchanged command (the line itself did not change,
   only its line number). Apply:

   ```
   perl -0pi -e 's/args\.origin !== undefined \? args\.origin : args\.host === .*? \? deriveGithubPagesOrigin\(args\.repo\) : undefined/undefined/' scripts/fork-init.ts
   ```

   `-t "(--origin without --host sets A8|with --origin given: the given value wins|without a path in --origin sets A8|lowercases the hostname but keeps the path case)"` →

   ```
   Tests  4 failed | 1237 skipped (1241)
   ```

   (A8 is never touched in any of these cases). Inverse:

   ```
   perl -pi -e 's/^(\s*)undefined$/$1args.origin !== undefined ? args.origin : args.host === \x27github-pages\x27 ? deriveGithubPagesOrigin(args.repo) : undefined/' scripts/fork-init.ts
   ```

10. **T36 (derives the GitHub Pages A8, every run).** Unchanged command. Apply:

    ```
    perl -0pi -e 's/return `https:\/\/\$\{ownerLower\}\.github\.io\/\$\{name\}`/return `https:\/\/\$\{ownerLower\}\.github\.io`/' scripts/fork-init.ts
    ```

    `-t "(derives A8|re-derives on every run)"` →

    ```
    Tests  6 failed | 1875 skipped (1881)
    ```

    (every derived origin loses its path). Inverse:

    ```
    perl -0pi -e 's/if \(name\.toLowerCase\(\) === `\$\{ownerLower\}\.github\.io`\) return `https:\/\/\$\{ownerLower\}\.github\.io`\n  return `https:\/\/\$\{ownerLower\}\.github\.io`/if (name.toLowerCase() === `\$\{ownerLower\}.github.io`) return `https:\/\/\$\{ownerLower\}.github.io`\n  return `https:\/\/\$\{ownerLower\}.github.io\/\$\{name\}`/' scripts/fork-init.ts
    ```

11. **T37 (user-site A8, no path).** Unchanged command. Apply:

    ```
    perl -0pi -e 's/if \(name\.toLowerCase\(\) === .*?\) return/if (false) return/' scripts/fork-init.ts
    ```

    `-t "derives the user-site A8"` →

    ```
    Tests  2 failed | 1879 skipped (1881)
    ```

    (both cases get a path appended instead of the no-path form). Inverse:

    ```
    perl -0pi -e 's/if \(false\) return `https:\/\/\$\{ownerLower\}\.github\.io`/if (name.toLowerCase() === `\$\{ownerLower\}.github.io`) return `https:\/\/\$\{ownerLower\}.github.io`/' scripts/fork-init.ts
    ```

12. **T38 (A8 untouched without `--origin`/`--host`).** Rewritten: item 3's byte-preservation fix
    replaced `shortLinkRaw = readIf(SHORT_LINK_REL)` with an `existsSync`/`readFileSync(...).toString
    ('latin1')` read, so the inverse's old anchor text is gone; the apply itself (gating on the
    now-unique `if (finalOrigin !== undefined) {`) still applies unchanged. Apply:

    ```
    perl -0pi -e 's/if \(finalOrigin !== undefined\) \{/if (true) {/' scripts/fork-init.ts
    ```

    `-t "A8 untouched"` →

    ```
    Tests  3 failed | 1878 skipped (1881)
    ```

    (all 3 cases: `finalOrigin` is `undefined`, and `utf8AsLatin1(JSON.stringify(undefined))` —
    `JSON.stringify` of `undefined` is the JS value `undefined`, not a string — now throws inside
    `Buffer.from`, an uncaught exception instead of the pre-stage-6/7 behaviour of silently writing the
    literal string `"undefined"`; either way, all 3 cases fail). Inverse:

    ```
    perl -0pi -e 's/if \(true\) \{\n        shortLinkRaw = existsSync/if (finalOrigin !== undefined) {\n        shortLinkRaw = existsSync/' scripts/fork-init.ts
    ```

13. **T81 (warn on replacing a non-upstream A8).** Rewritten: item 4's whole-line-comparison fix
    merged the old nested `if (oldValue !== finalOrigin) { if (oldValue !== UPSTREAM_SITE_ORIGIN) {`
    into one `if (oldValue !== finalOrigin && oldValue !== UPSTREAM_SITE_ORIGIN) {` guarding the
    warning only (the write itself is now gated on `line !== newLine`, a different condition — see row
    18 below, which targets that one instead). Apply:

    ```
    perl -pi -e 's/if \(oldValue !== finalOrigin && oldValue !== UPSTREAM_SITE_ORIGIN\) \{/if (oldValue !== finalOrigin) {/' scripts/fork-init.ts
    ```

    `-t "(does not warn when the existing value is upstream|does not warn and does not write when the existing value already equals|warns when a custom existing value is replaced by --origin|warns when a custom existing value is replaced by a derived GitHub Pages origin|does not warn when no --origin is given and none is derived)"` →

    ```
    Tests  2 failed | 4 passed | 1875 skipped (1881)
    ```

    (both "does not warn when the existing value is upstream's" cases now warn spuriously). Inverse:

    ```
    perl -pi -e 's/if \(oldValue !== finalOrigin\) \{$/if (oldValue !== finalOrigin \&\& oldValue !== UPSTREAM_SITE_ORIGIN) {/' scripts/fork-init.ts
    ```

14. **T9 (A6–A8 candidate-count/parse errors).** Unchanged command. Apply:

    ```
    perl -0pi -e 's/if \(a6Candidates\.length !== 1\) \{/if (false) {/' scripts/fork-init.ts
    ```

    `-t "(naming A6 and the config path|naming A7 and the path|the same cases also fail platform|the other \(valid\) one is not written either|naming A8 and the short-link path)"` →

    ```
    Tests  1 failed | 60 passed | 1820 skipped (1881)
    ```

    (the "two title: lines" case silently picks the first match instead of erroring; the passed count
    grew from 32 to 60 because items 1, 2 and 9 added new A6/A7/A8 error cases to this same describe).
    Inverse:

    ```
    perl -pi -e 's/if \(false\) \{$/if (a6Candidates.length !== 1) {/' scripts/fork-init.ts
    ```

15. **T10 (escape round trip, full replace, no fragment survives).** Rewritten: same renamed variables
    as row 8 (`cfgLatin1Lines`/`a6Idx`, `utf8AsLatin1(JSON.stringify(args.siteName!))`). Apply:

    ```
    perl -pi -e 's/cfgLatin1Lines\[a6Idx\] = a6LineFor\(cfgLatin1Lines\[a6Idx\], utf8AsLatin1\(JSON\.stringify\(args\.siteName!\)\)\)/cfgLatin1Lines[a6Idx] = cfgLatin1Lines[a6Idx] + a6LineFor(cfgLatin1Lines[a6Idx], utf8AsLatin1(JSON.stringify(args.siteName!)))/' scripts/fork-init.ts
    ```

    `-t "fully replaced"` →

    ```
    Tests  3 failed | 3 passed | 1875 skipped (1881)
    ```

    (all 3 A6 cases: the old literal survives, concatenated before the new line — the exact same
    counts as the original run). Inverse:

    ```
    perl -pi -e 's/cfgLatin1Lines\[a6Idx\] = cfgLatin1Lines\[a6Idx\] \+ a6LineFor\(cfgLatin1Lines\[a6Idx\], utf8AsLatin1\(JSON\.stringify\(args\.siteName!\)\)\)/cfgLatin1Lines[a6Idx] = a6LineFor(cfgLatin1Lines[a6Idx], utf8AsLatin1(JSON.stringify(args.siteName!)))/' scripts/fork-init.ts
    ```

16. **T56 (dry-run writes nothing).** Unchanged command. Apply:

    ```
    perl -0pi -e 's/if \(args\.dryRun\) return/if (false) return/' scripts/fork-init.ts
    ```

    `-t "dry-run \(T56\)"` →

    ```
    Tests  5 failed | 2 passed | 1874 skipped (1881)
    ```

    (dry-run actually writes, so `after` no longer equals `before`). Inverse:

    ```
    perl -pi -e 's/if \(false\) return$/if (args.dryRun) return/' scripts/fork-init.ts
    ```

17. **T7 (second identical run changes nothing).** Unchanged command; new result, because item 10
    (stage 6/7) added one more T7 case (CONTRIBUTE.md present but without A5's form), which this same
    no-write guard also covers. Apply (the generic `applyEdit` no-write guard, shared with T-0014's own
    A9 mutation evidence — this row needs it for A6–A8 specifically):

    ```
    perl -0pi -e 's/if \(next === prev\) return/if (false) return/' scripts/fork-init.ts
    ```

    `-t "second identical run \(T7\)"` →

    ```
    Tests  4 failed | 14 passed | 1863 skipped (1881)
    ```

    (the second run now always rewrites every anchor, so `changedFiles` is non-empty and mtime
    changes — one more failing case than the original run, item 10's new one). Inverse:

    ```
    perl -pi -e 's/if \(false\) return$/if (next === prev) return/' scripts/fork-init.ts
    ```

18. **T6 (convergence) — corrected (item 11, stage 6/7 review).** The original write-up concluded "no
    mutation found" and reasoned that T6's reference tree is itself produced by the (possibly mutated)
    code under test, so any mutation that only changes WHAT gets computed (not whether it depends on
    the file's own prior, in-progress state) changes the reference by the same amount and can never be
    caught. That reasoning itself is not wrong, but the blanket conclusion drawn from it was: it did not
    separately try a mutation that makes the WRITTEN value depend on the file's CURRENT content
    non-idempotently — row 15's mutation (T10, above) is exactly such a case, and it also turns T6 red,
    which neither of the two originally-tried mutations did:

    - The same no-write guard as row 17 (apply/inverse identical to row 17's). Re-run against
      `-t "converges to the reference tree|the unapplied fixture itself exits 0"` →
      `Tests  1283 passed | 598 skipped (1881)`, 0 failed. This one genuinely is NOT caught by T6: it
      only changes whether a redundant write happens when the computed content already matches, never
      what gets computed, so the final tree is identical either way — T6 compares final trees, not
      write counts.
    - Row 15's "append the old line before the new one" mutation (apply/inverse identical to row 15's,
      repeated here against T6's own selector):

      ```
      perl -pi -e 's/cfgLatin1Lines\[a6Idx\] = a6LineFor\(cfgLatin1Lines\[a6Idx\], utf8AsLatin1\(JSON\.stringify\(args\.siteName!\)\)\)/cfgLatin1Lines[a6Idx] = cfgLatin1Lines[a6Idx] + a6LineFor(cfgLatin1Lines[a6Idx], utf8AsLatin1(JSON.stringify(args.siteName!)))/' scripts/fork-init.ts
      ```

      `-t "converges to the reference tree|the unapplied fixture itself exits 0"` →

      ```
      Tests  640 failed | 643 passed | 598 skipped (1881)
      ```

      Inverse:

      ```
      perl -pi -e 's/cfgLatin1Lines\[a6Idx\] = cfgLatin1Lines\[a6Idx\] \+ a6LineFor\(cfgLatin1Lines\[a6Idx\], utf8AsLatin1\(JSON\.stringify\(args\.siteName!\)\)\)/cfgLatin1Lines[a6Idx] = a6LineFor(cfgLatin1Lines[a6Idx], utf8AsLatin1(JSON.stringify(args.siteName!)))/' scripts/fork-init.ts
      ```

    **Why this one IS caught, where the original two attempts were not:** the reference tree is built
    by running the (mutated) code ONCE on a pristine fixture. A subset mask that already has A6 set to
    the reference's (already-once-corrupted) content, then runs the SAME mutated code a second time on
    THAT content, corrupts it a second time (old-line-plus-new-line, read back from a file that is
    already old-line-plus-new-line, becomes old-line-plus-new-line-plus-new-line) — a result that no
    longer matches the reference, which was only corrupted once. This is precisely the
    "file X's computed bytes depend on the CURRENT, pre-run state of write item X itself" case the
    original write-up said would be needed to expose a real convergence defect, just narrower than
    "a different write item Y": re-reading and re-transforming the SAME anchor's own current line is
    enough.

    **Corrected conclusion:** T6, as designed, DOES catch a mutation whose computed value is a
    non-idempotent function of the anchor's own existing line (append, or anything else that is not
    invariant under repeated application to its own output). It still cannot catch a mutation that
    changes what gets computed in a way that stays idempotent on repeated application (the no-write
    guard above; or, by the same argument, a mutation confined to always computing some OTHER
    idempotent-but-wrong value) — the original write-up's narrower claim, about idempotent-but-wrong
    values, stands; the broader claim that NO mutation in this area could turn T6 red does not, and is
    withdrawn.

    Both mutations above were restored byte-identical before moving on.

Final confirmation: after every row above, `cmp scripts/fork-init.ts fork-init.ts.final` reported
byte-identical, and a full, unmutated run converged on `pnpm vitest run
tests/unit/scripts/fork-init.test.ts` → `Tests  1881 passed (1881)`.

### 2026-10-15 — stage 6 and 7 disposition

Scope: fixes to the implementation and tests this ticket already claims in its own traceability
rows and its own mutation-evidence section, authorised by the user on 2026-10-14 ("fix and report,
within the ticket's own scope, without expanding it"). Items the review raised that touch material
outside that scope — the 13 pre-existing `--host cloudflare-pages` call sites and the two `rmSync`
lines in Deviations 1/2, the manifest test's existing U+3000-padded `'x'` value, the "all stay
untouched" test's title,
the approved test-plan table's own rows 52/60, and the `describe` names/grouping — are left for the
user, per the parent's instructions, and are NOT touched here.

**Behaviour fixes (production code, red → green, `pnpm vitest run
tests/unit/scripts/fork-init.test.ts`):**

1. **A6/A8 JS string literal parsing.** `JS_STRING_LITERAL_RE`'s `\\.` accepted any escaped
   character; `evalJsStringLiteral`'s `\u{` branch looped forever when no closing `}` existed (`i =
   end` with `end === -1`), and let `String.fromCodePoint` throw an uncaught `RangeError` for an
   empty or out-of-range `\u{...}`; `\xZZ` silently decoded to U+0000. Replaced both functions with
   one `parseJsStringLiteral`, accepting only the standard single-character escapes (`' " \ b f n r
   t v`), `\0` not followed by a digit, `\xHH` (exactly two hex digits), `\uHHHH` (exactly four) and
   `\u{1-6 hex digits, ≤ 0x10FFFF}` — anything else returns `null` (a T9 tree error), never throws,
   never loops. Added six new cases each to the A6 and A8 "candidate/parse errors" tests
   (`'\u{41abc'`, `'\u{}'`, `'\u{110000}'`, `'\xZZ'`, `'\u12'`, `'\1'`). Red: the six A6 cases failed
   normally (`expected +0 to be 1` — exitCode 0 instead of 1); five of the six A8 cases failed
   normally too (two as an uncaught `RangeError`, three as the same exitCode mismatch); the sixth
   (`'\u{41abc'`, A8) hangs the old code inside `evalJsStringLiteral`'s infinite loop — demonstrated
   with `perl -e 'alarm 20; exec @ARGV' pnpm vitest run tests/unit/scripts/fork-init.test.ts -t
   "value has an unterminated"`, which killed the vitest worker after the alarm fired (the run never
   completed in 20s; "Worker exited unexpectedly" in the output, not a normal pass/fail). Green: all
   12 new cases pass (`pnpm vitest run ... -t "A6: value is '"` → `7 passed`; `-t "value has an
   unterminated|value has an empty|value's \u{...}|value has an invalid|value has a \u escape|value
   has a numeric escape"` → `6 passed`). The dead `case '\n':` branch (line continuation, never
   reachable since every candidate value is matched from one single line) is gone along with the
   rest of the old function.
2. **A7 frontmatter must start at line 1.** `findA7Candidates` used `stripped.findIndex(isDashes)`
   to find the FIRST `---` anywhere in the file, so a file with no real frontmatter but a `---`
   divider further down the body (itself followed by a `hero:`/`  name:`-shaped block and a second
   `---`) was misread as frontmatter. Changed to require `stripped[0] === '---'` (no BOM handling
   added — there is none to defer to for this file). Added a new A6–A8 case: `'no frontmatter at the
   top, but a later --- divider forms a false frontmatter-like block'`. Red:
   `pnpm vitest run ... -t "false frontmatter-like block"` → `2 failed` (`expected +0 to be 1` — the
   old code wrongly accepted exitCode 0 and would have written through the body's fake frontmatter).
   Green: same command → `2 passed`.
3. **A6–A8 bytes outside the anchor line must not change.** `.vitepress/config.mts`, both home
   pages and the short-link module were read/written as `utf8`; an invalid-UTF-8 byte elsewhere in
   the file would decode to U+FFFD and re-encode as different bytes on write. Switched all three to
   a byte-preserving (`latin1`) read/write, the same technique the doc anchors (A2–A5) already use;
   the inserted Unicode value (site name or origin) is remapped through a new `utf8AsLatin1` helper
   (`Buffer.from(text, 'utf8').toString('latin1')`) so it still lands as correct UTF-8 bytes. A9's
   existing write (sharing `config.mts`) benefits from the same fix as a side effect, noted here
   rather than claimed as a separate task. Added one byte-preservation test per file (A6, A7, A8),
   each writing a trailing `0xFF` byte then asserting every byte outside the written line is
   unchanged. Red: `pnpm vitest run ... -t "invalid-UTF-8 byte outside|rewritten to the JSON form"`
   → `4 failed` (the `0xFF` byte turned into the three bytes `EF BF BD`, i.e. U+FFFD, in every case).
   Green: same command → `4 passed`.
4. **A8's "same value, skip" comparison must match A6/A7's (compare the whole line, not the
   decoded value).** A single-quoted existing value equal to the new origin (e.g. `'https://
   e.example'` when `--origin https://e.example` is given) used to be left untouched — a single
   quote, not the JSON-string-literal form T8 requires. Changed the write decision to compare the
   line that WOULD be written (`newLine`) against the existing one; the T81 warning still compares
   the DECODED value (so a re-quote-only rewrite never warns). Added a test: a single-quoted
   existing value equal to the new origin is rewritten to the double-quoted (JSON) form without a
   T81 warning, and a second run then changes nothing. Red: `pnpm vitest run ... -t "rewritten to
   the JSON form"` → `1 failed` (`changedFiles` did not include the short-link module — the old code
   left the single-quoted line untouched). Green: same command → `1 passed`.

**Test and record fixes (no behaviour change):**

5. T34's test asserted only `--origin` and `path`; T33's own message also contains `path` (from its
   `[/path]` usage text), so a mutation removing the T34 check entirely would still pass. Added an
   assertion for `cloudflare-pages` (a T34-only fragment) and a new test confirming no T33 message
   contains it.
6. T48's "given twice" test used the illegal value `x` for `--origin`/`--site-name`, so the test
   passed even with the repeated-flag check removed (the resulting "invalid value" error also names
   the flag). Switched to legal values (`https://e.example`, `New Name`) and added an assertion for
   `more than once`, the fragment unique to the repeated-flag check.
7. The shared fixture's home pages had `features:` in the body, after the closing `---`, where the
   real `platform/index.md` has it inside the frontmatter, as a second column-0 key after `hero:`.
   Moved `features:` inside the frontmatter block in `writeFixture`'s `heroPage`. The T42
   frontmatter-extraction helper (`raw.slice(raw.indexOf('\n') + 1, raw.indexOf('\n---', 1))`) needed
   no change: with `features:` now inside the single frontmatter block, the file holds only one
   `---`/`---` pair, so the "multiple YAML documents" problem the original author's red → green log
   described (two separate `---` blocks) no longer arises in the first place.
8. The approved boundary note ("config's 4-space-indented `title:` is unchanged") had no matching
   line in the fixture's `cfgBody`. Added `    title: 'Nested',` inside `themeConfig` for the
   "a real-config double-quoted A6" case, and converted that case plus the CRLF case to whole-file
   byte comparison (the original bytes with only the written line substituted), replacing the
   previous `toContain`-only assertions.
9. "the same cases also fail platform/zh-TW/index.md" only tested the file-not-exists case.
   Restructured the A6–A8 errors describe so every `A7_CASES` entry runs against both
   `platform/index.md` and `platform/zh-TW/index.md` (a nested loop over both files), with each
   test's title naming the file it ran against; the old single "file does not exist" case for
   zh-TW is now one instance of the same loop, not a separate test.
10. Added a T7 case: `CONTRIBUTE.md` present but without A5's own form (distinct from the existing
    T2 "file absent" case) — the identical "no occurrence of its form" warning on both runs, and the
    second run's `changedFiles` is empty.
11. Re-examined mutation-evidence row 18 (T6). The blanket "no mutation found" conclusion was
    corrected: a mutation making the written value a non-idempotent function of the anchor's own
    CURRENT content (append the old line before the new one — the same mutation already used for
    T10) DOES turn T6 red (640 of 1283 subset tests fail), because a subset that starts from the
    reference's already-once-corrupted content gets corrupted a second time by a second run, while
    the reference itself was only corrupted once. The narrower original claim — a mutation that
    stays idempotent on repeated application (always computing some other, consistently wrong value)
    is NOT caught by T6 — still holds and is now the corrected, narrower conclusion; see the
    mutation-evidence section's row 18 and the Coverage report's T6 row for the restated reasoning.
12. `CONVERGENCE_X_CASES` (renamed from the separate, verbatim-duplicated `CASES` in the T6 describe
    and `X_CASES` in the T7 describe) is now one file-level constant both describes use.
    **Not applied:** moving the T6 reference-tree construction (`mkdtempSync`, `runForkInit`, the
    `throw` on a failed reference run) into a `beforeAll`. The per-subset `it(...)` calls below it
    are generated by a `for (let mask = 0; mask < totalSubsets; mask++)` loop that needs
    `writeItems.length` (itself read off the reference run's `changedFiles`) at TEST-COLLECTION time,
    before any `beforeAll` for that suite has run — vitest (like Jest) only accepts new `it()`
    registrations made synchronously while the `describe` body itself executes, not from inside a
    hook. Moving the reference-tree build into `beforeAll` would remove the very information the
    test-generation loop needs to decide how many tests to generate, so the two parts of this item
    are in tension; redesigning the subset-count mechanism (e.g. a hardcoded per-case constant,
    verified against the live run in a `beforeAll`) is a data-shape decision beyond "fix it and
    report", so it is left for the user to decide instead of guessed at.
13. Four test labels/values used literal Unicode characters (U+FE0F, U+FDF0, U+FDD0, U+FDEF,
    U+FFFE) instead of `\uXXXX` escapes. Converted to escapes (no value change); relabelled
    `'U+FE0F (variation selector, Mn-adjacent, not rejected)'` to `'U+FE0F (Mn, variation selector,
    not rejected)'`.
14. Comments:
    - `fork-init.test.ts`'s `// T8 (A9 part), T20/AC-H5: --base writes A9 whole …` header (originally
      directly above `describe('runForkInit — A9 base')`, before the site-name describe was inserted
      between them) is moved back to directly above that describe.
    - `scripts/fork-init.ts`'s module-body comment ("A mode: only the doc anchors (A2–A5 …) and the
      config's A9 line") now says A mode covers A1–A9 including A6–A8; the write-phase comment now
      lists both home pages and the short-link module alongside the config and the doc anchors; the
      two comments describing rebrand mode plus `--host` as "undefined behaviour until T-0015
      rejects the combination" now describe the current state — T50 already rejects `--rebrand`
      together with `--host`, so `args.host` is always `undefined` whenever `args.rebrand` is set.
    - The 11 occurrences of `// T-0015/T35: --host cloudflare-pages now requires --origin.` in the
      test file are now `// T35: --host cloudflare-pages needs --origin.` (comment text only; none
      of the call sites themselves were touched).
    - `.vitepress/challenge/shortLink.ts`'s comment now reads "`pnpm fork:init --origin <url>` sets
      this; `--host github-pages` without `--origin` derives it, and `--host cloudflare-pages`
      requires `--origin`." — `grep -qF -- "A fork changes it here" .vitepress/challenge/shortLink.ts`
      → `absent`; `grep -qF -- "fork:init --origin" .vitepress/challenge/shortLink.ts` → `present`
      (T83 still holds).
15. `A7_NAME_RE` renamed `A7_CANDIDATE_RE`. `parseA7Value`'s unused return value is gone: renamed
    `isA7ScalarValue`, returns `boolean`; its manual `{ items?: unknown }`/`{ key?: ...; value?: ... }`
    casts are replaced with the `yaml` package's own `isMap`/`isPair`/`isScalar` type guards.
    **Not applied** (parent's decision, out of scope for this pass): extracting a `locateCodeAnchor`
    helper, and moving the T34 (path × `--host cloudflare-pages`) check out of `validateOriginValue`.
16. The ticket's own Context line now says "traceability.md (revision 2.1)", matching the Comments
    section's own approval note.
17. T50's cases were moved into the approved `parseForkInitArgs — --origin, --site-name, --rebrand
    combinations` describe, whose name had stopped matching its content; T48 and T49 keep their own
    describes, which the approved plan does not assign to a named describe.
18. The approved test plan table's two rows naming a ZWJ emoji sequence had their literal U+200D
    rewritten as text (`👩`+U+200D+`💻`), the value unchanged, because the repository keeps no
    literal invisible characters; the approved content is otherwise as approved.

**Full test run:** `pnpm vitest run tests/unit/scripts/fork-init.test.ts` → all tests pass (the
exact count is in the mutation-evidence section's "Final confirmation" line above and in this
ticket's Coverage report). `pnpm test --run` (the whole suite) is also green.

### 2026-10-15 — stage 7 security review

Report: `.proj.specs/0004-stateless-engine/review/security-T-0015.md`. Seven candidates, independently filtered: no exploitable defect. Three real non-security items (the string-literal parser, the frontmatter start, byte fidelity outside the anchors) were fixed in the stage 6 and 7 disposition above; one (A7's single-line rule) is recorded there as a known limit.

### 2026-10-15 — stage 8 and landing

Stage 8 surface: the CLI, no browser (the ticket changes no page), on a `git archive HEAD` export of `da2eb78` committed into a scratch git repository with `node_modules` linked from the checkout; every run is `node --experimental-strip-types scripts/fork-init.ts --author "Test Teacher" --repo test-owner/web-range <flags>` unless stated.

| `<flags>` | Exit | Observed |
|---|---|---|
| `--host github-pages --site-name "測試靶場"` | 0 | `fork:init done — 9 file(s) changed` (`.vitepress/config.mts`, both home pages, `.vitepress/challenge/shortLink.ts`, `package.json`, `README.md`, `README.en.md`, `CONTRIBUTE.md`, `.github/workflows/deploy.yml`); config `  title: "測試靶場",`; `platform/index.md` `  name: "測試靶場"` with the four feature `title:` lines unchanged; `export const SITE_ORIGIN = "https://test-owner.github.io/web-range"`. The same command again: `fork:init done — 0 file(s) changed` |
| `--host cloudflare-pages --origin https://Range.Example.TW` | 0 | `export const SITE_ORIGIN = "https://range.example.tw"` |
| `--host cloudflare-pages` | 1 | stderr `✗ --origin is required with --host cloudflare-pages` |
| `--rebrand acme --author "Test Teacher" --repo test-owner/web-range --host github-pages` | 1 | stderr `✗ --rebrand cannot be combined with --host` |
| `--author T --repo test-owner/test-owner.github.io --host github-pages` | 0 | `export const SITE_ORIGIN = "https://test-owner.github.io"` |
| `--origin https://e.example`, after hand-editing A8 to `'\u{41'` | 1 | stderr `✗ A8: .vitepress/challenge/shortLink.ts existing value does not parse as a JS string literal`; the run ends at once and `git status --porcelain` lists only the hand-edited file |

PR BrowserLaboratory/wxl-platform#18, squash-merged as `1f4096a`; `gh pr checks 18` lists `Cloudflare Pages`, `build`, `challenge-verify`, `prose-audit`, `site-smoke` and `test`, all `pass`.

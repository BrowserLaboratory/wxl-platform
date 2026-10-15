---
id: T-0014
title: Write the base through A9 and choose the workflow by host
epic: 0004-stateless-engine
status: done
blocked_by: [T-0010, T-0013]
---

## Context

`--base` today edits a `base:` line, and the workflow is only ever copied when absent. With A9 upstream (T-0010), a GitHub Pages range should take its base from deployment, the host should decide the workflow, and ranges configured the old way must be told exactly what to bring over.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

`--base` writes A9 (`'/x/'` or `'/'`, both modes; `.` and `..` refused). `--host github-pages` and `--host cloudflare-pages` reset A9 to the upstream form (warning when it was literal), require A9, `base: siteBase` and a usable template, and handle each workflow state (install, leave, replace a known old output, remove, warn with `SITE_BASE`/`404`). Without `--host`, today's workflow behaviour stands (LF-normalised in anchor mode) with the 404 warning when A9 is upstream and the workflow does not derive `SITE_BASE`, in both modes. The five base-related overridden tests are rewritten; the shared fixture's template derives `SITE_BASE`.

## Acceptance criteria

- [x] T8, T9, T11: A9 being set, candidate lines, CRLF — A9 part only (T10, the A6–A8 escape
      replacement, belongs to T-0015) (S1)
- [x] T16–T26: host values, `--host` with `--base`, A9 errors and reset, `--base` lines and grammar, workflow states for both hosts, template errors, no-host behaviour and warning (S1)
- [x] T51: rebrand differences for the base (S1)
- [x] T60: the five base-related overridden tests (S1)
- [x] T4: bytes outside A9 in the config unchanged when A9 is set (S1)
- [x] Frozen copy `tests/unit/workflows/fixtures/deploy-template-72327e2.yml` (used by T22–T25)
- [x] T82: warning on resetting a literal A9 (S1)
- [x] T83: fork-init.ts workflow and base comments (S9)

## 給使用者（zh-TW）

base 改由 A9 寫入，`--host` 決定 workflow：`--base` 寫 A9 字面值；`--host` 把 A9 改回上游形式，並依 workflow 狀態安裝、保留、取代舊版或刪除；範本遺失或過舊時回 exit 1 並說明要從上游帶回什麼；不帶 `--host` 但 workflow 沒設 `SITE_BASE` 時警告整站會 404。base 相關的五支舊測試依 override 改寫。

## Comments

### 2026-10-14 — carried from T-0010's stage 6 review

- The deploy template's usage header says only that `pnpm fork:init` installs it; add the `--host` contract (`--host` decides the workflow; `--base` only without `--host`) when `--host` lands.
- Until this ticket, today's `--base` collapses the new `  base: siteBase,` line into a literal; this ticket's A9 rows replace that path.
- One base grammar: `.vitepress/config.mts` refuses `.`/`..` segments, the fork-init `BASE_RE` does not; T21 unifies them.
- Stale comments quoting `base: process.env.SITE_BASE ?? '/'`: the fork-init module's `setViteBase` comment (a T83 row) and the fork-init test's env-conditional case (an overridden test here).

### 2026-10-14 — execution order changed by the user

Order: T-0012 → T-0013 → T-0014 → T-0015 → T-0011 → T-0016, each branched from `main` after the previous one merged. T-0014 therefore introduces the engine's list of known old template outputs (initially `0cf52f11…7276`), which T22 and T24 need; T-0011 adds the verbatim copy `tests/unit/workflows/fixtures/deploy-template-72327e2.yml`, the template-hash pin (T27) and the `UPSTREAM_SLUG` export (T44). `blocked_by` of T-0011 gains T-0015.

### 2026-10-14 — test plan table (approved by the user before the first test)

Approved together with these decisions (user, 2026-10-14): the engine may import the `yaml` package and S2 links the repository's `node_modules` (Q1 A); the deploy template is not changed again in this epic (Q2 A); T-0014 adds the verbatim copy `tests/unit/workflows/fixtures/deploy-template-72327e2.yml` and T-0011 only pins it (Q3 A); spec and traceability revision 2.1 (end of file is an end of the line, white space after a form is not; an A8 value followed by `;` does not parse; S5 gains the expectation check); and the interpretations listed in each table's notes, with the claim additions below. Where a note says "needs the user's decision", the user's approval of the list settles it as the note recommends.

Claims added at approval: T4 for the A9 file; the parse-test title row of the overridden contracts; the frozen copy of the template at `72327e2`. The T-0010 carry-over about the template header is withdrawn (Q2 A).

測試檔：不新增測試檔。所有 S1 測試都放在 `tests/unit/scripts/fork-init.test.ts`。
- parse 測試放在既有 `describe('parseForkInitArgs')` 之後，新增 `describe('parseForkInitArgs — --host and --base')`。
- engine 測試放在 `describe('runForkInit — A mode …')` 之後，依序新增三個 describe：`runForkInit — A9 base`、`runForkInit — --host workflow states`、`runForkInit — no --host workflow`。
- rebrand 的 base 差異放進既有 `describe('runForkInit — B mode …')` 的最後。
- 改寫的既有測試保留在原位置。

需要新增一個 fixture 檔 `tests/unit/workflows/fixtures/deploy-template-72327e2.yml`，原因見 Notes 2。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S1 | `--host github-pages`、`--host cloudflare-pages` 解析成 `args.host`；沒給時為 `undefined` | `parseForkInitArgs` | T16 / AC-H1 | 兩個合法值；未給 |
| S1 | `--host` 的值不是這兩個之一時丟 `ForkInitArgError`，訊息含 `--host` 與 `JSON.stringify` 過的值（it.each） | `parseForkInitArgs` | T16 / AC-H1 | `github`、`GitHub-Pages`（大小寫不同）、`''`、`cloudflare`、`'github-pages '`（尾端空白） |
| S1 | 新旗標也走 T-0012 的 parser 錯誤機制：`--host` 沒帶值、`--host` 給兩次，都丟 `ForkInitArgError` 並點名 `--host` | `parseForkInitArgs` | T16、T48 / AC-H1、AC-P3 | `--host` 在最後沒有值；`--host github-pages --host cloudflare-pages` |
| S1 | `--host` 與 `--base` 並用是參數錯誤，訊息含 `--base`；T17 先於 T16 與 `--base` 的值檢查 | `parseForkInitArgs` | T17 / AC-H1 | 兩個 host × `/x/`、`none`；`--host bogus --base /x/` 得到 T17；`--host github-pages --base /../` 得到 T17 |
| S1 | 本票新增的檢查順序片段：T16 先於 `--repo` 的值檢查（T45） | `parseForkInitArgs` | T16、T49（片段；完整順序屬 T-0015） | `--repo bad --host bogus` 得到 T16 訊息 |
| S1 | 符合 base grammar 的 `--base` 與 `none` 都接受（it.each）；既有的 unsafe-value 測試照舊 | `parseForkInitArgs`，anchor 與 `--rebrand acme` 兩種模式 | T21 / AC-H5 | `/`、`/x/`、`/a/b/`、`/.../`、`/.x/`、`/a.b~c-d_e/`、`none` |
| S1 | 新拒絕 `.`、`..` segment，以及其他不符 grammar 的值；訊息含 `--base` 與 `JSON.stringify` 過的值（it.each） | `parseForkInitArgs`，兩種模式 | T21 / AC-H5 | `/./`、`/../`、`/a/../`、`/a/./b/`、`/x`（沒有結尾 `/`）、`x/`、`//`、`/a b/`；沿用 config-base.test.ts T31 的無效值清單 |
| S1 | `--base /x/` 把 A9 整行寫成 `const siteBase = '/x/'`；`--base none` 與 `--base /` 寫成 `const siteBase = '/'`；config 只改這一行 | `runForkInit`，anchor，共用 fixture | T20、T8（A9 部分）/ AC-H5、AC-A5 | 原本 A9 是上游形式、字面值 `'/old/'`、或無法解析的 `const siteBase = 42`（不解析舊值）；寫入後 config 在 `changedFiles` 內；已是目標行時不寫入（bytes、mtime 不變，不在 `changedFiles`） |
| S1 | `--host`（兩個值各測）把 A9 改回上游形式；原本不是上游形式時發出警告，內容含 `A9`、舊行與上游形式 | `runForkInit`，anchor | T19、T82 / AC-H2 | 舊行 `const siteBase = '/x/'`、`'/'`、`42`；已是上游形式時不寫入也不警告 |
| S1 | config 沒有恰好一個 A9 與一個 `  base: siteBase,` 時，`exitCode` 1，`message` 含 `A9`、`.vitepress/config.mts`、`const siteBase = process.env.SITE_BASE \|\| '/'`、`base: siteBase`、`https://github.com/BrowserLaboratory/wxl-platform`；什麼都不寫（每個檔的 bytes 與 mtime 不變，不建立 `deploy.yml`）（it.each：shape × flag） | `runForkInit`，anchor 與 rebrand（只帶 `--base`） | T18、T9（A9 部分）、T54 / AC-H2、AC-A5、AC-E1 | shape：字面值 `  base: '/wxl-platform/',`、`  base: process.env.SITE_BASE ?? '/',`、沒有 base 行、只有 A9 沒有 `base: siteBase`、只有 `base: siteBase` 沒有 A9、A9 兩行、`base: siteBase` 兩行、縮排的 `  const siteBase = …`（不算候選行）、四格縮排的 `    base: siteBase,`、config 檔不存在 × flag：`--base /x/`、`--base none`、`--host github-pages`、`--host cloudflare-pages`、`--rebrand acme --base /x/` |
| S1 | 沒帶 `--base` 也沒帶 `--host` 時 A9 不必存在：legacy config 不算錯，exit 0，base 行不變 | `runForkInit`，anchor（config byte-identical）與 rebrand | T5（A9 部分，回歸；T5 歸 T-0013）、T18 的反例 | 上一列的三種 legacy shape |
| S1 | CRLF 的 config：A9 與 `base: siteBase,\r` 照 LF 檔辨識；寫入的那行保留 `\r\n`，其他 bytes 不變 | `runForkInit`：anchor（`--base /x/`、`--host github-pages`）與 rebrand（`--rebrand acme --base /x/`） | T11（A9 部分）/ AC-A6 | CRLF 的上游形式配 `--host`：視為上游形式，不寫入、沒有 T82 警告；T82 警告裡的舊行不含 `\r` |
| S1 | `--host github-pages` 的 workflow 五種狀態（it.each） | `runForkInit`，anchor | T22 / AC-H3 | **不存在**（連 `.github/workflows/` 都沒有）：安裝內容等於範本的 LF 正規化結果，附 tag-rule 警告，路徑在 `changedFiles`。**等於目前範本輸出**（LF 與 CRLF）：不動，沒有 workflow 警告。**已知舊輸出**（72327e2 副本，LF 與 CRLF）：換成目前範本輸出，警告含 `replaced` 與路徑。**其他、有 derive**（目前範本多一行註解）：不動，警告含 `left untouched` 與路徑。**其他、沒有 derive**：`name: MyCustomDeploy`、凍結基準 `upstream-deploy.yml`（字面值 `SITE_BASE`）、無法解析的 YAML、`SITE_BASE` 少結尾 `/`、`run` 不是恰好 `pnpm build`；警告含路徑、`SITE_BASE` 與 `404` |
| S1 | `--host cloudflare-pages` 的 workflow 三種狀態（it.each） | `runForkInit`，anchor | T23 / AC-H4 | **不存在**：不建立檔案、沒有 workflow 警告、不在 `changedFiles`。**等於目前範本輸出或已知舊輸出**（各含 LF 與 CRLF）：刪除，列在 `changedFiles`，警告含 `removed` 與路徑。**其他**（有 derive 與沒有 derive 各一）：不動，警告含 `left untouched` 與路徑。任何狀態都沒有 tag-rule 警告 |
| S1 | `--host` 遇到不可用的範本時 `exitCode` 1，`message` 含 `scripts/templates/deploy.yml.template` 與 `https://github.com/BrowserLaboratory/wxl-platform`；什麼都不寫（A9 不重設，workflow 不裝也不刪） | `runForkInit`，anchor | T24、T54 / AC-H3、AC-E1 | 兩個 host × 範本不存在（CF 而且 workflow 不存在時也要報錯）；兩個 host × 範本等於 72327e2 副本（LF、CRLF）；GH × 沒有 derive 的範本（`name: Deploy\njobs: {}`）。反例：CF × 沒有 derive 的範本 → exit 0 |
| S1 | 沒帶 `--host` 時維持今天的 workflow 行為，但以 LF 正規化比對 | `runForkInit`，anchor | T25 / AC-H5 | **不存在**：安裝 LF 正規化的範本（CRLF 範本裝成 LF），附 tag-rule 警告。**先跑 `--host cloudflare-pages` 刪掉後再跑一次不帶 `--host`**：重新安裝，附 tag-rule 警告。**CRLF 的目前範本輸出**：不動、不警告。**已知舊輸出**：不替換，附今天的 "already exists with different content" 警告。**範本不存在 × workflow 不存在**：不安裝，警告含範本路徑。**範本不存在 × workflow 存在**：workflow byte-identical，警告含範本路徑（見 Notes 6） |
| S1 | 沒帶 `--host`、執行後 A9 是上游形式、workflow 存在但沒有 derive `SITE_BASE` 時，警告含 workflow 路徑、`SITE_BASE`、`404`、`--host github-pages` | `runForkInit`，anchor（`--author me --repo me/myfork`）與 rebrand（`B_ARGS`） | T26 / AC-H5 | **會警告**：既有的沒有 derive 的 workflow；這次從沒有 derive 的範本剛裝好的 workflow；72327e2 舊輸出；rebrand 模式下範本不存在但留著舊 `deploy.yml`。**不警告**：這次帶 `--base /x/` 或 `--base none`（`'/'` 也不算上游形式）；A9 原本就是字面值；workflow 有 derive；workflow 不存在；config 沒有 A9；帶 `--host` 的執行 |
| S1 | rebrand 模式的 base 差異：`--rebrand acme --base /x/` 寫入 A9，config 的 `socialLinks` slug 也照今天的做法換掉；`--base none` 寫成 `'/'`；legacy config 上 exit 1，tree walk 一個檔都沒寫（CHANGELOG 等檔的 bytes、mtime 不變）；workflow 照今天的方式比對、不做 LF 正規化（CRLF 的範本轉換輸出會得到今天的 "different content" 警告） | `runForkInit`，rebrand | T51 的 base 部分（T11、T18、T20、T21、T26）/ AC-B2 | 這列只放 rebrand 獨有的斷言；T11、T21、T26 的 rebrand 案例已併入上面各列的 it.each |
| S1 | 改寫 "sets base when a path is given and copies the deploy workflow"：只改 base 斷言，改成 config 含 `const siteBase = '/myfork/'`；`existsSync` 斷言不動 | 既有 A mode describe | T60 / AC-E4 | 只改 base 斷言 |
| S1 | 改寫 "--base none does not declare a base"：config 含 `const siteBase = '/'`，且恰好一行 `  base: siteBase,`；標題改成 base 變成 `/` | 既有 A mode describe | T60 / AC-E4 | 從上游形式的 A9 開始 |
| S1 | 改寫 "replaces an existing base line exactly (H1 replacer branch), $-safe"：A9 字面值 `'/wxl-platform/'` 換成 `'/a-b_c/'`；`title` 行不動 | 既有 A mode describe；`writeConfigWithBase` 改寫成 A9 版本 | T60 / AC-E4 | 字面值 A9 換成另一個字面值 |
| S1 | 改寫 "collapses an env-conditional base line to a plain literal (upstream shape)"：`??` config 配 `--base /myfork/` → `exitCode` 1 點名 A9，config byte-identical；刪掉過時的 `??` 註解 | 既有 A mode describe | T60、T18 / AC-E4 | `??` 那一行 |
| S1 | 改寫 "--base none strips an existing base line, leaving the rest intact"：字面值 `base:` 行配 `--base none` → `exitCode` 1 點名 A9，config byte-identical | 既有 A mode describe | T60、T18 / AC-E4 | 字面值 `base:` 行 |
| S1 | 改 parse 測試標題 "--base none marks base for removal, --rebrand selects B mode, --dry-run sets dryRun"，讓它說 base 變成 `/`；內容不動（`toBeNull()` 保留） | 既有 parse describe | T60 / AC-E4 | 只改標題（見 Notes 4） |
| S1（既有） | 共用 fixture 改動之後，其他既有 fork-init 測試內容一字不改照常通過，包括所有 rebrand 測試（例如 B-mode 的 `deploy.yml` 盤點還是要靠範本裡的 `# WXL fork deploy`） | 整個 `fork-init.test.ts` | T60 / AC-E4、T51 / AC-B2 | fixture：config 加上上游形式的 A9 與 `  base: siteBase,`；範本換成會 derive 的最小 workflow |
| S9 | 在 stage 6 用 `grep -F` 記錄 `scripts/fork-init.ts` 不含 `clobbers a customized deploy.yml`、`collapse the whole line to a`、`null = remove (--base none)` | 註解，包括 `ForkInitArgs.base` 的型別註解 | T83（本票的列）/ AC-D4 | 只有禁用字串；`1  user input error or tree error` 這個必要字串屬 T-0012 |
| S1、S4（既有） | 完整的 `pnpm test --run` 維持綠燈；`tests/unit/workflows/*.test.ts`（含 T28 parity）與元件測試都不變；改了範本 header 就重跑 parity | 全部 | — | 無 |

**Notes**

1. **阻擋項：yaml 套件和「engine 只 import Node built-ins」互相矛盾。** traceability 的 "Derives SITE_BASE" 規定用 `yaml` 套件解析，spec 卻規定 engine 只能 import Node built-ins，而 S2（T58）在沒有 `node_modules` 的環境跑 CLI。靜態 import `yaml` 會讓 S2 掛掉；自己寫一個 YAML 子集解析器，結果又可能和 `yaml` 套件不同。動工前要請使用者決定，或修訂 spec。不論怎麼決定，T22、T26 的 it.each 都要放進 naive 比對和 YAML 解析結果會分歧的形狀：`run: "pnpm build"`（有引號）、flow-style `env: { SITE_BASE: … }`、註解行裡出現那個值、`run: |` block。T-0015 的 A7 也有同一個問題。
2. **72327e2 副本必須在本票就出現，和使用者的分工衝突。** T22、T23、T24、T25 都需要一份 LF 正規化後 SHA-256 等於 `0cf52f11…7276` 的內容。測試不能靠 git 歷史，因為匯出的 fork 沒有歷史。已確認 `git show 72327e2:scripts/templates/deploy.yml.template` 的 LF 正規化雜湊就是這個值，而且內容不含上游 slug。建議由 T-0014 在 T27 指定的路徑 `tests/unit/workflows/fixtures/deploy-template-72327e2.yml` 加入逐字副本，T-0011 只加 T27 的 pin 測試。這和使用者的分工不同，需要使用者同意。
3. **範本 header 一改，hash 就變。** T-0010 留下的 comment 要求在範本 header 補上 `--host` 的契約。但 1e5bce4 的範本 LF 正規化 SHA-256 是 `2a6b8a55…635d`，從 T-0010 合併後 fork 出來的靶場都逐字裝了這一份。照「每個舊範本版本一個值」的定義，改 header 後 `2a6b8a55…` 應該也要列入已知舊輸出，這又和「initially one」、T27 的「list's first value」衝突。不列入的話，這些 CF 靶場的 workflow 會被當成 other 留下，而不是刪掉。可以選的做法：本票不改範本、把這個 comment 延後；或者修訂 traceability，加入第二個值。另外，這個 header 契約在 T83 沒有必要字串，S9 無法把關；新寫的文字也不能含 T28 禁用的 `--base none`、`--base /<repo>/`。
4. **範圍與 traceability 有出入：**
   - AC 列了 T8–T11，但 T10 只關於 A6–A8 的跳脫字元，屬 T-0015。T8、T9、T11 在本票只有 A9 的部分。
   - overridden contracts 裡 parse 測試改標題那一列，沒有任何票的 AC 認領。它和 base 有關，本計畫把它納入。所以票上「five tests」應寫成「five tests and one title」。
   - `ForkInitArgs.base` 的型別註解（T83 禁用字串 `null = remove (--base none)`）也在本票。
5. **跨票時間差：**
   - **CF 測試的參數：** 本票還沒有 `--origin`，T35（CF 必須帶 `--origin`）屬 T-0015，所以 CF 測試只能不帶 `--origin`，T-0015 合併時這些測試的參數必須更新。建議集中在一個 `CF_ARGS` 常數。
   - **GH 的 A8 推導：** T36 要到 T-0015 才有，屆時 `--host github-pages` 會推導 A8 並要求短連結模組存在。因此 `changedFiles` 只斷言包含，不斷言完全相等。
   - **`--rebrand --host`：** T50 要到 T-0015 才會拒絕，在那之前會被接受、行為未定義。本計畫不斷言；T16、T17 只在 anchor 模式測。
   - **dry-run：** T56 屬 T-0015，但本票新增的替換與刪除也要遵守 `dryRun`，否則會留下潛伏的 bug。
6. **T25 措辭有歧義：**「範本不存在時，警告含範本路徑」是否也適用於 workflow 已經存在的情況，原文沒講清楚。本計畫假設兩種情況都警告，和 T7 列出的 "T25 (template missing)" 一致，需要使用者確認。
7. **fixture 改動：**
   - `writeFixture` 的 config 加上 `const siteBase = process.env.SITE_BASE || '/'` 與 `  base: siteBase,`。
   - `scripts/templates/deploy.yml.template` 換成最小的 workflow：第一行保留 `# WXL fork deploy …`，包含 `configure-pages`（id `pages`）步驟，以及 `run: pnpm build`、`env.SITE_BASE: ${{ steps.pages.outputs.base_path }}/` 的步驟。
   - `writeConfigWithBase` 改寫成 A9 版本，另外新增 legacy shape 與 workflow 寫入 helper。
   - 「nothing written」優先沿用 T-0012 的樹快照 helper（bytes、mtime、檔案集合）；T-0012 沒有做的話，本票自己補。
8. **其他：**
   - T26 判斷的是執行之後的狀態，包括這次剛裝好的 workflow。
   - 本票所有新警告與訊息裡的路徑都以 `/` 斷言（T57 屬 T-0012，但新字串也必須遵守）。
   - 這次不需要改 GLOSSARY、README、SKILL；README 與 SKILL 的過渡期矛盾留給 T-0016 處理。
   - 沒有任何一列是在它的 seam 上測不到的；只有 T83 屬 S9，記錄在 stage 6。

### 2026-10-15 — carried over from T-0013 (write order, transitional `--base`, deploy.yml LF normalisation)

Three notes from T-0013's own ticket (`T-0013-anchor-mode-identity-anchors.md`), relevant to this
ticket's `--base` rewrite and left here so they are not missed when work on this ticket starts:

- **Write order and the transitional `--base` (T-0013's T55, relevant here).** `scripts/fork-init.ts`'s
  A-mode write phase writes the config before the manifest, specifically so T55's "files already
  written stay" is observable in a test: a subdirectory write (the config) can be seen to succeed
  before a root-directory write (the manifest) fails. T-0013's dedicated test for this half of T55
  ("a subdirectory write (the config) succeeds before a root write (the manifest) fails; the
  subdirectory write stays") passes `--base /myfork/` — without a `--base` value, `cfgNext` would
  equal `cfgRaw` (nothing for `setViteBase` to change), `applyEdit` would be a no-op, and there would
  be no subdirectory write left to observe succeeding. That `--base` is T-0013's own transitional
  behaviour (its Notes 1, and its Deviations entry quoting the user's approved item 9 verbatim):
  before this ticket, `--base` only edits the config's existing `base:` line through today's
  `setViteBase`, never A9. **When this ticket rewrites `--base` to write A9 instead, it must either
  keep that T-0013 test passing under the new `--base` semantics, or replace it with an equivalent
  scenario that still demonstrates a successful subdirectory write preceding a failed root write.**
- **Anchor-mode's `deploy.yml` comparison is still not LF-normalised.** As of T-0013, the deploy
  block's `existing !== deployContent` check (in `scripts/fork-init.ts`) compares the installed
  template's raw bytes verbatim, with no LF normalisation applied to either side — T-0013 applies
  none, by design (recorded in its own 2026-10-15 "compute-before-write…" comment entry, citing
  traceability.md's "Workflow states" as the reason this comparison logic belongs to this ticket, not
  T-0013). **T25 above is where that normalisation is added** — the seam row for T25 ("沒帶 `--host`
  時維持今天的 workflow 行為，但以 LF 正規化比對") already states this; this entry just cross-references
  it explicitly so T-0013's own note about "no LF normalisation yet" has a named successor here.

### 2026-10-15 — red → green log

All commands below run against `tests/unit/scripts/fork-init.test.ts` (`pnpm vitest run
tests/unit/scripts/fork-init.test.ts -t "<regex>"`); only the `-t` argument is shown per row.
Frozen fixture `tests/unit/workflows/fixtures/deploy-template-72327e2.yml` was added first (a
verbatim copy via `git show 72327e2:scripts/templates/deploy.yml.template`). Its LF-normalised
SHA-256 matches the pinned value `0cf52f11…7276`, confirmed by hashing the committed fixture file
itself with the same CRLF→LF rule the engine's own `normalizeLf` applies (`s/\r\n/\n/g`, not a
blanket `tr -d '\r'`, which would also strip a lone `\r` not followed by `\n`):

```
$ perl -pe 's/\r\n/\n/g' tests/unit/workflows/fixtures/deploy-template-72327e2.yml | shasum -a 256
0cf52f116082bed48b19462d02b6827123a26cf882a428f841cd6646f73f7276  -
```

and confirmed byte-identical to the upstream commit's own template with:

```
$ cmp <(git show 72327e2:scripts/templates/deploy.yml.template) tests/unit/workflows/fixtures/deploy-template-72327e2.yml
```

(no output, exit 0 — the two are identical). Neither command is itself a vitest row.

1. **Row 1 (`--host` parses).** Red: no `host` field, `--host` an unknown flag
   (`ForkInitArgError: unknown flag: "--host"`). Change: added the `host` option to `parseArgs`,
   plumbed `ForkInitArgs.host`. Green.
   `-t "parses --host into args.host"`
2. **Row 2 (`--host` invalid value).** Passed on first run (implemented together with row 1's
   `options`/validation edit — **batch-implemented**, labelled here). Mutation check: forced the
   value check to `false`, saw 2 of 5 cases turn red (wrong message), restored byte-identical.
   `-t "rejects an unknown --host value"`
3. **Row 3 (`--host` no value / given twice).** Passed on first run (generic T-0012 parser
   machinery already covers any declared flag — **batch-implemented**). Mutation check: excluded
   `host` from the repeated-flag set, saw the "given twice" case turn red, restored.
   `-t "rejects --host with no value, and --host given twice"`
4. **Row 4 (T17 precedes T16/T21).** Passed on first run (implemented with row 1 —
   **batch-implemented**). Mutation check: forced the host+base combo check to `false`, saw the
   test turn red (specific-value message appeared instead), restored.
   `-t "rejects --host together with --base"`
5. **Row 5 (T16 precedes T45).** Passed on first run (order already correct from the row-1 edit —
   **batch-implemented**). Mutation check: disabled the host-value check, saw the `--repo` message
   surface instead of `--host`, restored.
   `-t "checks --host before --repo"`
6. **Row 6 (base grammar accepts).** Batch-implemented, not Red: `/.../`, `/.x/` etc. were already
   accepted by the old regex, so this row's own test passed immediately once row 7's regex change
   landed — written and run together with row 7 since they exercise the same `BASE_RE`; see row 7
   for the actual red.
   Mutation check: forced `BASE_RE` to `/^NEVER_MATCH$/`, saw all cases turn red, restored.
   `-t "accepts every --base value matching the base grammar"`
7. **Row 7 (base grammar rejects `.`/`..`).** Red: `/./`, `/../`, `/a/../`, `/a/./b/` were accepted
   by the old `BASE_RE` (`parseForkInitArgs` did not throw). Change: `BASE_RE` gained the
   `(?!\.\.?\/)` lookahead per segment (same grammar as `.vitepress/config.mts`). Green.
   `-t "rejects --base values with . or .. segments"`
8. **Row 8 (A9 written whole; T8/T20).** Red: config still had no A9 line at all (old fixture);
   after adding A9 to the shared fixture (Notes 7), the new test failed with
   `const siteBase = process.env.SITE_BASE || '/'` unchanged (old `setViteBase` only touched a
   literal `base:` line). Change: added `findA9Candidates`/`a9LineFor`/`applyA9Edit` and wired them
   into both modes' config write, replacing `setViteBase`'s call for A9 (its old line-collapsing
   call site removed from `transformText`). Green. This same edit also implemented the `--host`
   reset/T82 warning and the T18 validation used by rows 9–11 (**batch-implemented**: the engine's
   A9 block was authored as one seam because the A9 read, the "not exactly one candidate"
   validation, the `--base` write and the `--host` reset/warning all share the same parsed
   `cfgLines`/`cfgCandidates`/`a9Idx` state — splitting the implementation across four separate
   edits would have meant writing and discarding three intermediate, inconsistent versions of the
   same block).
   `-t "writes A9 as"`
9. **Row 9 (T19/T82: `--host` resets A9, warns on reset).** Covered by row 8's implementation
   (**batch-implemented**, see row 8). Mutation checks: (a) disabled the T82 warning condition, 4
   of the row's 6 sub-cases went red (missing warning); (b) forced the "already matches, skip"
   branch to never apply, no sub-case went red by itself (the generic `applyEdit`
   `next === prev` no-write guard already covers that case independently — confirmed by a second
   mutation that instead forced the warning's own inner condition true, which also did not turn
   this sub-case red because its guard is the `--host`+not-upstream check already covered by
   mutation (a); both restored byte-identical).
   `-t "resets A9 to the upstream form|warns on an unparseable existing A9|does not write or warn when A9 is already the upstream form"`
10. **Row 10 (T18 shapes × flags; T9 A9 part; T54).** Red (first attempt): rebrand-mode cases
    failed — `package.json` had already been rewritten (version/author/name) by the time the new
    A9 check ran, because the A9/template validation block had been inserted AFTER rebrand mode's
    own immediate manifest write. This was a real compute-before-write bug introduced while writing
    row 8's shared block, caught by this row's "nothing written" assertion under `--rebrand`.
    Change: moved the rebrand-mode manifest write (`applyEdit(PKG_REL, …)`) to after the A9/template
    checks. Green. Also added the row's own `it.each` matrix (10 shapes × 5 flags) and the
    counterexample (no `--base`/no `--host`: A9 need not exist).
    `-t "T18:|no --base and no --host"`
11. **Row 11 (T5 regression counterexample).** Covered by row 10's `it.each` (the same test block).
    `-t "no --base and no --host"`
12. **Row 12 (CRLF A9).** Passed on first run (the shared A9 block already tracked `a9HadCR` per
    line — **batch-implemented**, see row 8). Mutation check: dropped the `\r` re-append on write,
    1 of 3 sub-cases turned red, restored.
    `-t "CRLF config"`
13. **Row 13 (T22, `--host github-pages` workflow states).** Red: `--host` had no workflow-specific
    handling yet (the deploy-workflow block was still "no `--host`" only); all 8 new cases failed
    (either `.github/workflows/deploy.yml` not written at all, since `templateLf` only existed
    inside the unused T24 check, or the wrong warning). Change: replaced the single "install when
    absent / warn when different" block with a host-aware state machine
    (`classifyDeployWorkflow`/`derivesSiteBase`, GH branch: absent→install+tag-rule,
    current→nothing, old→replace+"replaced", other→"left untouched" or SITE_BASE/404). Green. The
    same edit implemented the CF branch (row 14) and the no-host branch + T26 check (rows 16–17)
    together (**batch-implemented**: the three branches share `classifyDeployWorkflow`,
    `pushTagRuleWarning` and `finalDeployRaw`, and the old single-branch code they replace could not
    be left partially host-aware without producing an inconsistent intermediate state for the
    already-passing no-`--host` tests).
    `-t "runForkInit — --host workflow states"`
14. **Row 14 (T23, `--host cloudflare-pages` workflow states).** Covered by row 13's implementation
    (**batch-implemented**, see row 13). Mutation check: forced the current/old removal condition to
    `false`, 4 of 7 cases turned red (file not removed), restored.
    `-t "runForkInit — --host cloudflare-pages workflow states"`
15. **Row 15 (T24, unusable template).** Covered by row 8's template-check block
    (**batch-implemented**, see row 8). Mutation check: forced the "missing" branch to never
    return, the "template missing" cases turned red (a `TypeError` from `normalizeLf(null)`,
    confirming the check was load-bearing, not just redundant with a later one), restored.
    `-t "runForkInit — --host: unusable template"`
16. **Row 16 (T25, no-`--host` workflow, LF-normalised).** Covered by row 13's implementation
    (**batch-implemented**, see row 13). Mutation check: removed the `normalizeLf` call on the
    template side of the no-host comparison, the CRLF-template "install as LF" case turned red,
    restored.
    `-t "runForkInit — no --host workflow"`
17. **Row 17 (T26, SITE_BASE/404 warning without `--host`).** Covered by row 13's implementation
    (**batch-implemented**, see row 13). Mutation check: disabled the T26 condition outright, 6 of
    15 cases turned red (the "warns" cases, both modes), restored.
    `-t "SITE_BASE 404 warning"`
18. **Row 18 (T51, rebrand base differences).** Passed on first run (A9 handling was already mode-
    agnostic by construction — **batch-implemented**, see row 8). Mutation check: disabled the
    rebrand-mode "different content" warning condition, the no-LF-normalisation regression test
    turned red, restored.
    `-t "rebrand acme --base|legacy config \(no A9\)|compares the workflow today"`
19–23. **Rows 19–23 (the five overridden base tests).** Red (expected, by construction): once the
    shared fixture gained A9 (Notes 7) and `setViteBase` was removed from the write path, all five
    original assertions failed (`base:` no longer exists as a standalone literal line; the `??`
    line is no longer collapsed but is now a T18 tree error). Change: rewrote each assertion to the
    table's "New contract" column (A9 literal/`'/'`, or T18 tree error for the two legacy shapes
    that have no A9 at all). Green.
    `-t "sets base when a path is given and copies the deploy workflow|--base none sets the base to /|replaces an existing base line exactly|collapses an env-conditional base line to a plain literal|--base none strips an existing base line"`
24. **Row 24 (parse-test title rewrite).** Title changed from "--base none marks base for removal…"
    to "--base none makes the base /, …"; body (`toBeNull()`) left byte-identical, as the table
    requires.
    `-t "base none makes the base /"`
25. **Carried over from T-0013 (write-order test).** Red: `cfgAfter` no longer matched
    `/base:\s*['"]\/myfork\/['"]/` once `--base` stopped touching a `base:` literal. Change:
    updated the assertion to `toContain("const siteBase = '/myfork/'")`; the scenario (subdirectory
    write succeeds, root write fails) is otherwise unchanged. Green. Recorded here per the ticket's
    carried-over note: "kept working … under the new `--base` semantics".
    `-t "a subdirectory write \(the config\) succeeds before a root write \(the manifest\) fails; the subdirectory write stays"`
26. **Row 26 (T83, S9).** Re-run on the final code (stage 6), with the exact commands and output:
    - `grep -F -c 'clobbers a customized deploy.yml' scripts/fork-init.ts` → `0`
    - `grep -F -c 'collapse the whole line to a' scripts/fork-init.ts` → `0` (found once before
      this row, in the dead `setViteBase` function's comment — removed as dead code once nothing
      called it any longer)
    - `grep -F -c 'null = remove (--base none)' scripts/fork-init.ts` → `0` (the `ForkInitArgs.base`
      comment was rewritten)
    - Required string: `grep -F -n '1  user input error or tree error' scripts/fork-init.ts` →
      `43: *   1  user input error or tree error (invalid/missing flag, or a problem found in the
      tree — see` (this string predates this ticket, from T-0012; its line number moved from 38 to
      43 only because stage 6 extended the module header's Usage/Modes comment).
    Not a vitest row; recorded here as the table's S9 entry.

27. **Full affected-file and full-suite check — stage 6 (after closing the approved-table gaps
    recorded in the "stage 6 disposition" Comment below).** `pnpm vitest run
    tests/unit/scripts/fork-init.test.ts` → 336 passed (up from 304; +32 tests, see the coverage
    table above for the per-seam breakdown). `pnpm vitest run tests/unit/workflows/
    tests/unit/scripts/` → 30 files, 640 passed (up from 608; confirms the parity/toolchain-parity
    tests, untouched by this ticket, still pass against the real, unmodified
    `scripts/templates/deploy.yml.template`). `pnpm test --run` → 125 files, 2515 passed (up from
    2483).
28. **Full affected-file and full-suite check — this disposition pass (after applying every edit
    listed in items 1-8 of the executor's instructions: review-id removal, the disposition
    corrections, the two `derivesSiteBase`/T26-title test additions, the T26 divergent-shape
    additions, the fixture-hash re-verification, the Deviations corrections, the mutation
    reproducibility rewrite, and the coverage-table corrections).** `pnpm vitest run
    tests/unit/scripts/fork-init.test.ts` → 342 passed (up from 336; +6 tests: 2 non-object `jobs`
    shapes added to T22, and T26 gaining the same 2 shapes plus a split null-job/non-iterable-steps
    case and a comment-only-value case, +4). `pnpm vitest run tests/unit/workflows/
    tests/unit/scripts/` → 30 files, 646 passed (up from 640). `pnpm test --run` → 125 files, 2521
    passed (up from 2515).

### Deviations

- **Describe-block count.** The approved table calls for exactly three new `describe` blocks under
  `runForkInit` (`A9 base`, `--host workflow states`, `no --host workflow`). This ticket split the
  work into five for readability: `runForkInit — A9 base`, `runForkInit — --host workflow states`
  (GitHub Pages), `runForkInit — --host cloudflare-pages workflow states`, `runForkInit — --host:
  unusable template`, and `runForkInit — no --host workflow` (with a sixth, `runForkInit — no
  --host: SITE_BASE 404 warning (T26)`, for the T26 row, which the table did not name a home for).
  Every test still lives at the seam the table names; only the grouping is finer-grained than
  specified.
- **Batch-implemented rows.** Rows 2–6, 9, 11, 12, 14–18 passed on their first test run because the
  engine code that makes them pass was necessarily written together with an earlier row's
  implementation (the A9 block, the host-aware workflow state machine): these seams share enough
  mutable state (`cfgLines`/`cfgCandidates`, `classifyDeployWorkflow`/`finalDeployRaw`) that
  splitting the implementation into one isolated change per row would have meant writing and
  discarding several inconsistent intermediate versions of the same function. Row 11 (the T5
  regression counterexample) was missing from this list in an earlier pass even though it also
  passed on first run, sharing row 8's A9 guard; it is added here. Each such row is labelled above
  and backed by an independent mutation check (temporarily break the exact condition that row
  depends on, confirm red, restore byte-identical) rather than a fresh red test run.
- **Row-10 bug caught mid-implementation.** Writing row 10's "nothing written" assertion under
  `--rebrand` found a genuine compute-before-write violation (the manifest was written before the
  new A9/template checks existed to reject the run) — fixed as part of row 10, not filed as a
  separate ticket, since it was introduced by this ticket's own row-8 edit and had not reached any
  other branch.
- **Batch-implemented rows — accepted by the user, in chat, on 2026-10-15 (option A).** This is its
  own decision for this ticket, taken separately from T-0013's earlier, own option-A decision on the
  same question for its ticket — not a reuse of that decision. Per this ticket's 2026-10-15 decision,
  the "Batch-implemented rows" deviation above stands AS RECORDED, on the condition that every
  batch-implemented row carries reproducible mutation evidence (an apply command, its inverse, the
  `-t` selector, and the actual vitest summary line observed — see "stage 6 mutation
  reproducibility", re-run against the final code after every edit in this disposition).
- **Describe-block count — still awaiting the user's confirmation at landing, not accepted.** The
  describe-block split (3 approved → 6 actual) is a separate deviation from the batch-implemented
  rows above; the 2026-10-15 option-A decision did not cover it. It stands recorded here for the
  user to confirm when this ticket lands, not reverted in the meantime because every test still
  lives at the seam the approved table names, and collapsing the six describes back into three
  would rename/move tests without changing their contracts.
- **`--host`/`--rebrand` combination left unchecked, as the table requires.** Per Notes 5
  ("`--rebrand --host`：T50 要到 T-0015 才會拒絕"), no test or code in this ticket rejects
  `--rebrand` together with `--host`; its behaviour stays undefined until T-0015.
- **The T-0013 write-order test's assertion target changed, deviating from "existing test bodies
  unchanged".** This ticket's own instruction for the five base-related overridden tests (plus the
  one parse title) was the only authorised exception to "existing test bodies unchanged" (Notes 4,
  AC-E4). The write-order test carried over from T-0013 ("a subdirectory write (the config)
  succeeds before a root write (the manifest) fails; the subdirectory write stays") was not on that
  list, yet its own assertion changed from matching a `base: '…'` line to matching the A9 line
  (`const siteBase = '/myfork/'`), because `--base` no longer touches a `base:` literal at all under
  this ticket's rewrite. This is recorded here as its own deviation, justified by T-0013's own
  carried-over note (2026-10-15, quoted in this ticket's own Comments): "When this ticket rewrites
  `--base` to write A9 instead, it must either keep that T-0013 test passing under the new `--base`
  semantics, or replace it with an equivalent scenario" — the assertion was updated rather than the
  test replaced, per that note's first option.
- **The test file's header comment changed.** `tests/unit/scripts/fork-init.test.ts`'s header
  comment was updated (to mention `TEST_FILE_DIR` alongside `CLI_REPO_ROOT`, per the Stage 6
  disposition's "test header doesn't mention `TEST_FILE_DIR`" finding) — also outside the "existing
  test bodies unchanged" exception list, listed here for the same reason as the write-order test
  above.

### 2026-10-15 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S1: `parseForkInitArgs` — `--host` parsing, order (T16/T17/T48/T49) | rows 1–5 (10 tests) | not measured: no coverage provider is installed | AC-H1, AC-P3 | — |
| S1: `parseForkInitArgs` — `--base` grammar (T21) | rows 6–7 (4 tests) | not measured: no coverage provider is installed | AC-H5 | — |
| S1: `runForkInit` — A9 write/reset (T8, T19, T20, T82) | rows 8–9 (14 tests, up from 10 in stage 6: added `--base` from a literal `'/old/'` and from `const siteBase = 42`, a no-write/no-`changedFiles` case, and old-line `'/'` resets under `--host`) | not measured: no coverage provider is installed | AC-A5, AC-H2, AC-H5 | the "already matches, skip" branch (`newA9Line` reset to `null` when the original line already equals the target) has no mutation that turns only its own test red in isolation — forcing it to always take the write path produces zero failures across the whole file, because `applyEdit`'s generic `next === prev` no-write guard (a different, already-covered seam) independently makes the same case a no-op; see "stage 6 mutation reproducibility", row 9(b) |
| S1: `runForkInit` — A9 validation, T5 regression (T9, T18, T54) | rows 10–11 (68 tests, up from 59: added the T5 counterexample's rebrand version) | not measured: no coverage provider is installed | AC-A5, AC-H2, AC-A2 | — |
| S1: `runForkInit` — A9 CRLF (T11) | row 12 (5 tests, up from 3: added a rebrand CRLF case and a CRLF-literal-A9-under-`--host` case asserting the T82 warning carries no `\r`; the whole `it.each` now also asserts the rewritten A9 line's full content and the content of the line right after it, not only that the A9 line ends in `\r`) | not measured: no coverage provider is installed | AC-A6 | — |
| S1: `runForkInit` — `--host github-pages` workflow states (T22) | row 13 (23 tests, up from 21 after this pass's own edits, and from an original 11 in an earlier pass: this pass added the two previously-missing non-object `jobs` shapes — `jobs` as a number, `jobs` as an array — to the existing malformed-workflow matrix, alongside the already-present upstream-fixture literal-SITE_BASE shape, the two divergent-but-still-deriving shapes (quoted `run`, flow-style `env`), and the other divergent-and-non-deriving shapes (a null job, non-iterable `steps` as a number and as an object, a null step, a comment-only value, a `run: \|` block)) | not measured: no coverage provider is installed | AC-H3 | a workflow with more than one `pnpm build` step (one deriving, one not) is untested either way: `derivesSiteBase` returns on the first match, which is a reasonable reading of traceability's singular "the step" rather than a defect (see the "multiple `pnpm build` steps" Spec finding), but no `it.each` case exercises a multi-step workflow to pin which step wins |
| S1: `runForkInit` — `--host cloudflare-pages` workflow states (T23) | row 14 (7 tests) | not measured: no coverage provider is installed | AC-H4 | — |
| S1: `runForkInit` — unusable template (T24) | row 15 (11 tests, up from 9: added a case with a literal A9 and a current-template `deploy.yml` already on disk, so the "nothing written" assertion is load-bearing rather than vacuous) | not measured: no coverage provider is installed | AC-H3, AC-E1 | — |
| S1: `runForkInit` — no-`--host` workflow (T25) | row 16 (6 tests) | not measured: no coverage provider is installed | AC-H5 | — |
| S1: `runForkInit` — SITE_BASE/404 warning without `--host` (T26) | row 17 (23 tests, up from 19 after this pass's own edits, and from an original 15 in an earlier pass: this pass split the single "malformed workflow" case into its own `it.each` with a null job and non-iterable steps as two separate cases — the title previously claimed both shapes while the body only exercised the null job — and gave T26 the same quoted-`run`, flow-style-`env` (does-not-warn) and comment-only-value (warns) divergent shapes T22 already had) | not measured: no coverage provider is installed | AC-H5 | — |
| S1: `runForkInit` — rebrand base differences (T51) | row 18 (4 tests, all in the `runForkInit — B mode` describe; the `-t` selector previously recorded for this row was over-broad and also matched 11 unrelated tests from rows 10–12 — see the corrected selector in "stage 6 mutation reproducibility") | not measured: no coverage provider is installed | AC-B2 | an empty-string `deploy.yml.template` (`''`) is untested: rebrand mode's own check (`if (tmplRaw)`) would treat it as absent, while every `--host`/no-`--host` check (`tmplRaw === null`/`!== null`) would treat it as present and try to use it — a real inconsistency (recorded as a known, deferred issue in the Stage 6 disposition), with no test covering either reading |
| S1 (existing seam, overridden bodies): five base contracts + one parse title (T60) | rows 19–24 (6 tests) | not measured: no coverage provider is installed | AC-E4 | — |
| S1 (existing seam, carried from T-0013): write-order / T55 | row 25 (1 test) | not measured: no coverage provider is installed | AC-E1 | — |
| S9: `scripts/fork-init.ts` comments (T83) | row 26 (`grep -F` record, no vitest test) | not measured: no coverage provider is installed | AC-D4 | the forbidden/required strings are checked by `grep -F`, not by a test file, per S9's own definition |
| S5: T27 (frozen fixture hash pin) | not exercised by a new test in this ticket — the fixture file itself is added here, but the pin test (`tests/unit/workflows/fork-template-parity.test.ts` or a dedicated T27 test) belongs to T-0011 per the ticket's "execution order changed by the user" note | not measured: no coverage provider is installed | AC-H3 | T27's own pin test is T-0011's row, not this ticket's; this ticket only supplies the fixture file and confirmed its hash out-of-band with the exact `perl -pe 's/\r\n/\n/g' tests/unit/workflows/fixtures/deploy-template-72327e2.yml \| shasum -a 256` and `cmp <(git show 72327e2:scripts/templates/deploy.yml.template) tests/unit/workflows/fixtures/deploy-template-72327e2.yml` commands recorded in the red → green log's fixture-intro paragraph (not a one-off `python3 -c` check, and not a committed test) |

Full-suite confirmation (after this disposition pass's own edits):
`pnpm vitest run tests/unit/scripts/fork-init.test.ts` (342/342, up from 336/336 after stage 6's own
edits, and from 304/304 before stage 6),
`pnpm vitest run tests/unit/workflows/ tests/unit/scripts/` (646/646 across 30 files, up from
640/640, up from 608/608), `pnpm test --run` (2521/2521 across 125 files, up from 2515/2515, up from
2483/2483). No coverage provider is configured in this repository
(`package.json`/`vitest.config.*` carry no `@vitest/coverage-*` dependency or `coverage` block), so
"measured coverage" is not available for any row; the record above states that uniformly rather
than per-row, per the ticket's own instruction for this case.

### 2026-10-15 — stage 6 mutation reproducibility (user decision 2026-10-15, option A)

Per the user's acceptance of the batch-implemented rows on condition of reproducible mutation
evidence, every batch-implemented row's mutation check below was re-run against the code as it
stands after every edit in this ticket's final disposition pass (including the new T22/T26 test
cases and the corrected code comments on the rebrand-mode/`--host` interaction), each as an apply
command plus its inverse,
confirmed with `cmp` against a saved copy of `scripts/fork-init.ts` taken right before this re-run
(`fork-init.ts.final`): every apply changed the file, every restore was byte-identical. `-t`
selectors are vitest's `-t` argument against `tests/unit/scripts/fork-init.test.ts`; every observed
"red" below is the exact `Tests` summary line vitest printed for that run, not a paraphrase.

1. **Row 2 (`--host` invalid value).** Apply:

   ```
   perl -0pi -e "s/if \(hostRaw !== 'github-pages' && hostRaw !== 'cloudflare-pages'\) \{/if (false) {/" scripts/fork-init.ts
   ```

   `-t "rejects an unknown --host value"` →

   ```
   Tests  5 failed | 337 skipped (342)
   ```

   (no throw for any of the 5 invalid values). Inverse:

   ```
   perl -0pi -e "s/if \(false\) \{/if (hostRaw !== 'github-pages' && hostRaw !== 'cloudflare-pages') {/" scripts/fork-init.ts
   ```

2. **Row 3 (`--host` given twice).** Apply:

   ```
   perl -0pi -e "s/if \(t\.kind !== 'option'\) continue/if (t.kind !== 'option') continue\n      if (t.name === 'host') continue \/\/ MUTATION-ROW3/" scripts/fork-init.ts
   ```

   `-t "rejects --host with no value, and --host given twice"` →

   ```
   Tests  1 failed | 341 skipped (342)
   ```

   (the "given twice" case; "no value" is Node's own parser, unaffected). Inverse:

   ```
   perl -0pi -e "s/\n      if \(t\.name === 'host'\) continue \/\/ MUTATION-ROW3//" scripts/fork-init.ts
   ```

3. **Row 4 (T17 precedes T16/T21).** Apply:

   ```
   perl -0pi -e "s/if \(hostRaw !== undefined && baseRaw !== undefined\) \{/if (false) {/" scripts/fork-init.ts
   ```

   `-t "rejects --host together with --base"` →

   ```
   Tests  1 failed | 341 skipped (342)
   ```

   (no throw for the combination). Inverse:

   ```
   perl -0pi -e "s/if \(false\) \{/if (hostRaw !== undefined && baseRaw !== undefined) {/" scripts/fork-init.ts
   ```

4. **Row 5 (T16 precedes T45).** Same apply as row 2. `-t "checks --host before --repo"` →

   ```
   Tests  1 failed | 341 skipped (342)
   ```

   (the message became `--repo must be in owner/repo form, got: "bad"` instead of containing
   `--host`). Same inverse as row 2.

5. **Row 6 (base grammar accepts).** Apply:

   ```
   perl -pi -e 's#^const BASE_RE = .*$#const BASE_RE = /^NEVER_MATCH\$/#' scripts/fork-init.ts
   ```

   `-t "accepts every --base value matching the base grammar"` →

   ```
   Tests  2 failed | 340 skipped (342)
   ```

   (every value rejected, both modes). Inverse:

   ```
   perl -pi -e 's#^const BASE_RE = /\^NEVER_MATCH\$/$#const BASE_RE = /^\\/(?:(?!\\.\\.?\\/)[A-Za-z0-9._~-]+\\/)*\$/#' scripts/fork-init.ts
   ```

6. **Row 9(a) (T82 warning condition).** Apply:

   ```
   perl -pi -e "s/if \(args\.host !== undefined && originalA9Line !== A9_UPSTREAM_LINE\) \{/if (false) {/" scripts/fork-init.ts
   ```

   `-t "resets A9 to the upstream form|resets A9 from the old line|warns on an unparseable existing A9|does not write or warn when A9 is already the upstream form"` →

   ```
   Tests  6 failed | 2 passed | 334 skipped (342)
   ```

   (every reset/warn case; the 2 "does not write or warn" cases are unaffected, as expected).
   Inverse:

   ```
   perl -pi -e "s/if \(false\) \{/if (args.host !== undefined \&\& originalA9Line !== A9_UPSTREAM_LINE) {/" scripts/fork-init.ts
   ```

7. **Row 9(b) (the "already matches, skip" branch has no test of its own).** Apply:

   ```
   perl -pi -e "s/if \(originalA9Line !== newA9Line\) \{/if (true) {/" scripts/fork-init.ts
   ```

   `-t "does not write or warn when A9 is already the upstream form"` →

   ```
   Tests  2 passed | 340 skipped (342)
   ```

   — no red. A full, unfiltered run against the same mutation (`pnpm vitest run
   tests/unit/scripts/fork-init.test.ts`, no `-t`) also stayed fully green
   (`Tests  342 passed (342)`), across every test in the file, not only this row's own selector.
   This confirms, rather than merely restates, the ticket's own earlier note: `applyEdit`'s generic
   `next === prev` no-write guard (a different, already-tested seam) makes this specific branch's
   bytes-level effect unobservable by any test in this suite — there genuinely is no discriminating
   mutation for this branch in isolation, not an oversight. Inverse:

   ```
   perl -pi -e "s/if \(true\) \{/if (originalA9Line !== newA9Line) {/" scripts/fork-init.ts
   ```

8. **Row 11 (T5 regression counterexample) — classified batch-implemented, with its own evidence.**
   The red → green log only says "covered by row 10's it.each (the same test block)"; this row was
   missing from the Deviations' batch-implemented list and had no mutation check of its own. Both
   are corrected here. Apply (forces the A9/template validation block to run even when neither
   `--base` nor `--host` is given, which is exactly the condition this counterexample depends on):

   ```
   perl -pi -e "s/if \(args\.base !== undefined \|\| args\.host !== undefined\) \{/if (true) {/" scripts/fork-init.ts
   ```

   `-t "no --base and no --host"` →

   ```
   Tests  18 failed | 324 skipped (342)
   ```

   (every legacy-shape case in both anchor and rebrand mode now wrongly demands A9). This test
   exercises code that was already correct before this ticket touched it (T-0013's own
   `args.base !== undefined` guard, here widened to `|| args.host !== undefined` as part of row 8's
   batch-implemented A9 block) — no fix was needed when this row's test was written, so it is
   **batch-implemented**, not red-first, now backed by the mutation above rather than asserted
   without evidence. Inverse:

   ```
   perl -pi -e "s/if \(true\) \{/if (args.base !== undefined || args.host !== undefined) {/" scripts/fork-init.ts
   ```

9. **Row 12 (CRLF `\r` re-append).** Apply:

   ```
   perl -pi -e "s/lines\[a9Idx\] = newA9Line \+ \(a9HadCR \? '\\\\r' : ''\)/lines[a9Idx] = newA9Line/" scripts/fork-init.ts
   ```

   `-t "CRLF"` →

   ```
   Tests  3 failed | 15 passed | 324 skipped (342)
   ```

   (3 of the 18 CRLF cases). Inverse:

   ```
   perl -pi -e "s/lines\[a9Idx\] = newA9Line\$/lines[a9Idx] = newA9Line + (a9HadCR ? '\\\\r' : '')/" scripts/fork-init.ts
   ```

10. **Row 14 (T23 current/old removal).** Apply:

    ```
    perl -pi -e "s/if \(state === 'current' \|\| state === 'old'\) \{/if (false) {/" scripts/fork-init.ts
    ```

    `-t "runForkInit — --host cloudflare-pages workflow states"` →

    ```
    Tests  4 failed | 3 passed | 335 skipped (342)
    ```

    (current/old cases not removed). Inverse:

    ```
    perl -pi -e "s/if \(false\) \{\$/if (state === 'current' || state === 'old') {/" scripts/fork-init.ts
    ```

11. **Row 15 (T24 missing-template check).** Apply:

    ```
    perl -pi -e "s/if \(tmplRaw === null\) return treeError/if (false) return treeError/" scripts/fork-init.ts
    ```

    `-t "runForkInit — --host: unusable template"` →

    ```
    Tests  5 failed | 6 passed | 331 skipped (342)
    ```

    (a `TypeError` from `normalizeLf(null)`, confirming the check is load-bearing). Inverse:

    ```
    perl -pi -e "s/if \(false\) return treeError/if (tmplRaw === null) return treeError/" scripts/fork-init.ts
    ```

12. **Row 16 (T25 no-host LF normalisation).** Apply:

    ```
    perl -pi -e "s/const templateLfNoHost = normalizeLf\(tmplRaw\)/const templateLfNoHost = tmplRaw/" scripts/fork-init.ts
    ```

    `-t "runForkInit — no --host workflow"` →

    ```
    Tests  1 failed | 5 passed | 336 skipped (342)
    ```

    (the CRLF-template "install as LF" case). Inverse:

    ```
    perl -pi -e "s/const templateLfNoHost = tmplRaw\$/const templateLfNoHost = normalizeLf(tmplRaw)/" scripts/fork-init.ts
    ```

13. **Row 17 (T26 condition).** Apply:

    ```
    perl -pi -e "s/if \(args\.host === undefined && a9EndsUpstream && finalDeployRaw !== null && !derivesSiteBase\(normalizeLf\(finalDeployRaw\)\)\) \{/if (false) {/" scripts/fork-init.ts
    ```

    `-t "SITE_BASE 404 warning"` →

    ```
    Tests  12 failed | 11 passed | 319 skipped (342)
    ```

    (up from 10 of 19 before this disposition pass's own test additions: the new comment-only-value
    and non-iterable-steps "warns" cases also depend on this same condition).
    Inverse:

    ```
    perl -pi -e "s/if \(false\) \{\$/if (args.host === undefined \&\& a9EndsUpstream \&\& finalDeployRaw !== null \&\& !derivesSiteBase(normalizeLf(finalDeployRaw))) {/" scripts/fork-init.ts
    ```

14. **Row 18 (T51 rebrand "different content" warning) — `-t` selector corrected.** The previously
    recorded selector (`-t "rebrand acme --base|legacy config \(no A9\)|compares the workflow
    today"`) is over-broad: it also matches 11 unrelated tests from rows 10–12 whose titles happen
    to contain the same substrings (confirmed by running it with `--reporter=verbose` — 15 tests
    matched, only 4 of them in the `runForkInit — B mode` describe that is this row's own seam). The
    selector below matches exactly this row's 4 tests and no others:

    ```
    perl -pi -e "s/if \(existingDeploy !== deployContent\) \{/if (false) {/" scripts/fork-init.ts
    ```

    ```
    pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "writes A9, and the config socialLinks slug is still swapped|--rebrand acme --base none writes A9 as /|a legacy config \(no A9\) with --base given exits 1|compares the workflow today's way"
    ```

    →

    ```
    Tests  1 failed | 3 passed | 338 skipped (342)
    ```

    (exactly the no-LF-normalisation CRLF regression case; the recorded 4-test count now matches
    what the selector actually selects). Inverse:

    ```
    perl -pi -e "s/if \(false\) \{\$/if (existingDeploy !== deployContent) {/" scripts/fork-init.ts
    ```

Final confirmation: after every row above, `cmp scripts/fork-init.ts fork-init.ts.final` reported
byte-identical, and a full, unmutated run converged on
`pnpm vitest run tests/unit/scripts/fork-init.test.ts` → `Tests  342 passed (342)`.

### 2026-10-15 — stage 6 disposition

Disposition of every finding from the stage 6/7 review, labelled by a short description of each
finding rather than by the reviewer's id (and without pointing at the reviewer's own scratch
file). "Fixed" means applied in this pass; "not fixed" means left for the user/a follow-up ticket,
with the reason.

**Spec findings**

- **derivesSiteBase throws on a malformed workflow** — fixed: type-guarded every layer (`jobs`,
  each `job`, `steps`, each `step`) in `derivesSiteBase`; added `it.each` cases (`jobs` as a number,
  `jobs` as an array, `jobs: {build: null}`, non-array `steps` as a number and as an object, a null
  step) to T22, and a null-job/non-iterable-steps pair to T26 (the T26 title previously claimed
  "non-iterable steps" while only testing a null job — both shapes are now actually covered there).
- **divergent YAML shapes not covered** — fixed: added quoted-`run` and flow-style-`env` "derives"
  cases, and comment-only-value and `run: |`-block "does not derive" cases, to T22; added the same
  quoted-`run`, flow-style-`env` and comment-only-value shapes to T26 too (T26 previously only had
  the `run: |` block and the malformed-workflow shapes; it now covers the same divergent shapes as
  T22).
- **hand-written "literal SITE_BASE" case, not the real upstream fixture** — fixed: added a case in
  T22 and T26 that reads `tests/unit/workflows/fixtures/upstream-deploy.yml` verbatim.
- **`--base` from `'/old/'`/`42`, `changedFiles`, no-write** — fixed: added `it.each` cases for both
  starting shapes asserting `changedFiles`, and a dedicated no-write case asserting bytes, mtime and
  absence from `changedFiles`.
- **old line `'/'` not tested under `--host` reset** — fixed: added an `it.each` case.
- **rebrand counterexample for "no `--base` and no `--host`"** — fixed: added the rebrand version of
  the existing anchor-mode `it.each`.
- **rebrand CRLF; `--host` CRLF case never actually written** — fixed: added a rebrand CRLF case to
  the existing CRLF `it.each`, and a new case using a CRLF **literal** A9 under `--host` asserting
  the written line and that the T82 warning contains no `\r`; the CRLF `it.each` now also asserts
  the full content of the rewritten A9 line (not just that it ends in `\r`) and of the line that
  follows it (the closing `}\r`), for every case in the table, not only the `--host` one.
- **GH absent test never exercises "no `.github` dir at all"** — fixed: added a dedicated case that
  removes `.github` before running.
- **T24 cases never actually have anything to lose** — fixed: added a case with a literal A9 and an
  existing current-template `deploy.yml`, making "nothing written" load-bearing.
- **rebrand + missing template + leftover non-deriving `deploy.yml`, untested path** — fixed: added
  the case to T26.
- **GH "other, no derive" warning text recommends re-running the same `--host github-pages` command
  that just ran** — not fixed: this is a user-facing string change to an already-approved T22/T26
  contract message; changing it without the user's sign-off on the new wording would be an
  unreviewed decision. Left for the user/a follow-up ticket.
- **stale Usage/Modes/`transformText`/tag-rule/rebrand-branch comments** — fixed: the Usage and
  Modes block, the `transformText` comment and the tag-rule comment were already corrected in an
  earlier pass; this pass additionally corrects the tag-rule comment and the rebrand-mode comment
  that both read "no --host (host is anchor-mode only in this ticket)" — that line was inaccurate:
  before T-0015 rejects `--rebrand` together with `--host` (T50), the A9 reset and the template
  checks still run for either host value even in rebrand mode; only the rebrand branch's own install
  step ignores `--host`'s value, installing the template whenever absent regardless of GitHub Pages
  or Cloudflare Pages. Both comments now say this plainly instead of claiming `--host` does not
  apply in rebrand mode at all.
- **two overridden test titles describe superseded behaviour** — not fixed (by design): the
  approved test plan (Notes 4) only authorises renaming the parse-test title (Row 24); renaming
  these two would go beyond the approved table. Both tests already carry an explanatory comment
  mapping the old title to the new T18 contract (added when they were overridden), which is the
  "annotate, don't rename" middle ground the finding itself suggests — no further action taken.
- **batch-implemented rows / describe-block split need user approval** — the batch-implemented rows
  are disposed via the user's 2026-10-15 chat decision (option A), made for this ticket specifically
  and separately from T-0013's own, earlier option-A decision on the same question: see the
  "Deviations" section above and the "stage 6 mutation reproducibility" entry, which backs every
  batch-implemented row (including the previously-unlabelled T5 regression counterexample row) with
  a reproducible apply/inverse mutation pair re-run against the final code, each showing the actual
  vitest summary line. The describe-block split (3 approved → 6 actual) is a **separate** deviation,
  not covered by that same decision: it still awaits the user's confirmation at this ticket's
  landing (see "Deviations").
- **multiple `pnpm build` steps: first-match ambiguity** — not fixed: the security review's own
  verdict on this candidate already judged it a reasonable reading of traceability's singular "the
  step", not a defect; left as documented behaviour, no code change.
- **rebrand walk ordering for `config.mts` changed** — not fixed: this is a `changedFiles`
  **ordering** change only (not a correctness defect), explicitly deferred to T-0015/T58 by the
  review itself; no test asserts order today, so nothing broke. Left for T-0015.

**Standards findings**

- **batch-implemented rows need reproducible evidence** — fixed, see "stage 6 mutation
  reproducibility" above.
- **approved-table gaps (a)-(e)** — (a)-(d) fixed, see the matching Spec findings above. (e) was not
  actually empty: the source review text was truncated mid-sentence at "(e)", not blank. Its content
  was the missing divergent-YAML-shape coverage in T26 (the same gap as the "divergent YAML shapes"
  Spec finding above) — now closed by the same fix: T26 carries the quoted-`run`, flow-style-`env`
  and comment-only-value shapes alongside T22.
- **fixture hash and T83 grep need exact commands** — fixed: exact command and output now recorded
  for both in the red → green log (the fixture-intro paragraph, updated to hash the committed
  fixture file itself with the engine's own CRLF→LF rule and to `cmp` it against the upstream
  commit's template, and row 26). The per-row mutation **patches** for every row 2-26 (beyond the
  batch-implemented rows already covered) were not additionally transcribed as diffs — the
  apply/inverse commands in "stage 6 mutation reproducibility" serve the same reproducibility
  purpose for the rows that needed it.
- **AC line wrongly includes T10** — fixed: AC rewritten to T8/T9/T11, A9 part only.
- **describe-block count needs approval** — see the "batch-implemented rows / describe-block split"
  Spec finding above: this one remains an open deviation awaiting the user's confirmation at
  landing, distinct from the batch-implemented rows' own, already-settled option-A decision.
- **dates, row 6 label, stray spaces** — fixed: log/coverage-table headers dated 2026-10-15; row 6
  relabelled batch-implemented; the two stray-space code spans corrected.
- **Usage/Modes A stale** — fixed.
- **`transformText`/A-mode comments stale** — fixed.
- **tag-rule comment wording** — fixed (see the "stale comments" Spec finding above for this pass's
  own further correction to the same comment).
- **wrong traceability.md reference** — fixed: corrected to spec.en.md.
- **derivesSiteBase unsafe cast** — fixed, same change as the matching Spec finding above.
- **GH "other, no derive" warning self-referential** — not fixed, same reason as the "warning text
  recommends re-running the same command" Spec finding above.
- **test header doesn't mention `TEST_FILE_DIR`** — fixed: comment updated.
- **stale "write a current, deriving workflow" comment** — fixed: reworded to describe the shared
  fixture.
- **test titles vs. new contract** — not fixed, same disposition as the "two overridden test titles"
  Spec finding above (annotation already present).
- **T-0011/T-0015 cross-ticket notes** — not fixed: touches other tickets' files, outside this
  ticket's approved scope; left for the user to route to T-0011/T-0015.
- **duplicated `writeAnchorFile`/dryRun/`AnchorWriteError` blocks** — not fixed: a structural
  refactor (extracting `installDeploy`/`removeDeploy` helpers) that risks behaviour changes across
  five call sites; deferred to a follow-up, not attempted without dedicated tests for the refactor
  itself.
- **duplicated warning strings** — not fixed: same reasoning as the duplicated-blocks finding above
  (cosmetic, deferred).
- **`runForkInit` grew large; suggests `planA9`/`planDeployWorkflow` extraction** — not fixed: a
  substantial refactor, out of scope for this pass.
- **non-null assertions on `args.base!`/`templateLf!`/etc.** — not fixed: type-safety nit, deferred.
- **naming: `cfgRawShared`, `templateLfNoHost`, `findA9Candidates`** — not fixed: cosmetic rename,
  deferred.
- **`a9LineFor`'s union parameter adds no information** — not fixed: cosmetic, deferred.
- **comments reference ticket numbers** — not fixed: cosmetic, deferred; none of these are in the
  T83 forbidden-string list (verified by item 7's `grep -F -c` checks all returning 0 for the
  forbidden strings), so nothing here blocks any check this pass runs.
- **`if (tmplRaw)` vs. `!== null` inconsistency for an empty-string template** — not fixed: a real
  edge-case inconsistency, but changing it is a behaviour change (an empty template file would then
  be treated as "exists" rather than skipped) with no existing test covering either reading;
  deferred to a follow-up ticket with its own test plan rather than guessed at here.
- **T26 describe doesn't use `beforeEach`/`afterEach`** — not fixed: a test-structure refactor
  across the many tests in that describe; deferred (no behavioural risk, since every test under it
  already passes).
- **`DEPLOY_REL`/`TEMPLATE_REL` redeclared per describe** — not fixed: cosmetic, deferred.
- **one test doesn't call `pinMtimes` before comparing mtimes** — corrected and fixed: the finding's
  earlier disposition wrongly called this a "pre-existing" nit "not touched by this ticket's
  edits" — the test in question (`--host %s does not write or warn when A9 is already the upstream
  form`) is new in this ticket, not pre-existing, so there was no reason to defer it. Added
  `pinMtimes(root)` before capturing the mtime it compares against.
- **`parseYaml` can `emitWarning` to stderr** — fixed as a side effect of the `derivesSiteBase`
  fix above: the call now passes `{ logLevel: 'error' }` to `parseYaml`.

**Security candidates**

The security review's own VERDICT section disposed of all ten candidates it raised; none blocks
landing (see ADR-0005 and the review's own "Outside the model" reasoning for the ones judged not
real, pre-existing, or out of this ticket's threat model). Three were judged real and are each
given their own line below, as the rest were not:

- **a malformed workflow can throw instead of returning "does not derive"** — the only candidate the
  review recommended fixing; fixed, same change as the matching Spec/Standards findings above.
- **the config is read and written as UTF-8, not latin1 like the doc anchors, so invalid-UTF-8 bytes
  outside A9 are not guaranteed to round-trip** — not fixed; recorded as a known, intentional limit,
  not a defect: the config stays UTF-8 because T-0015 writes non-ASCII site names into A6 (inside
  the same config file), which latin1 cannot represent correctly. A `.vitepress/config.mts` holding
  invalid UTF-8 bytes is therefore outside this ticket's (and T-0015's) supported input, the same way
  a hand-edited, syntactically-broken config is — not something this engine promises to preserve
  byte-for-byte.
- **`--rebrand` together with `--host cloudflare-pages` installs the GitHub Pages workflow instead of
  nothing, with no warning that `--host` was ignored** — not fixed in behaviour: rejecting the
  combination is T-0015's own work (T50); this ticket's Notes 5 and Deviations already record the
  combination as undefined until then, and nothing here changes that scope decision. What this pass
  does fix is that the two comments describing this path in `scripts/fork-init.ts` were actively
  misleading (they read "no --host (host is anchor-mode only in this ticket)", implying `--host` is
  simply not accepted in rebrand mode) — both are now corrected to state plainly that the A9 reset
  and template checks still run under `--host` in rebrand mode, and that only the install step itself
  ignores which host was requested, until T-0015 lands.
- the remaining seven candidates (symlink/NUL-byte handling changing under rebrand mode; a teacher's
  own `--base` value being interpolated unescaped into a future, not-yet-existing caller's string
  literal; terminal-escape sequences in an echoed A9 line that come from the teacher's own tree, not
  an untrusted source; a delete failure being reported with the word "write" — this one fixed, see
  below; multiple `pnpm build` steps; a config syntax error matching traceability's own "value is
  never parsed" rule; and a theoretical same-tree-concurrent-run race) were each judged, by the
  review's own verdict, either not a real issue, pre-existing and unrelated to this diff, or a
  documented, out-of-model scenario; no further action taken on any of them in this pass beyond the
  one already called out:
  - **a delete failure (the `--host cloudflare-pages` removal path) is reported as a write failure**
    — fixed: `AnchorWriteError` now takes an operation label (`'write' | 'remove'`, defaulting to
    `'write'` so every existing call site is unchanged), and the removal call site passes
    `'remove'`, so its own failure message now reads `failed to remove ...` instead of
    `failed to write ...`.

### 2026-10-15 — stage 7 security review

Report: `.proj.specs/0004-stateless-engine/review/security-T-0014.md`. Ten candidates, independently filtered: no exploitable defect; the real non-security items were fixed or recorded in the stage 6 disposition.

### 2026-10-15 — user confirmation, stage 8 and landing

The user accepted the describe-block split (three approved groups → six) in chat on 2026-10-15 (option A).

Stage 8 surface: the CLI, no browser (the ticket changes no page). Each case runs on a fresh export
of the merged commit, committed into a scratch git repository with `node_modules` linked from the
checkout:

```
E=$(mktemp -d); git archive 5225193 | tar -x -C "$E"; ln -s "$PWD/node_modules" "$E/node_modules"
cd "$E" && git init -q && git add -A && git -c user.email=t@t -c user.name=t commit -qm base
node --experimental-strip-types scripts/fork-init.ts --author "Test Teacher" --repo test-owner/web-range <flags>
```

| `<flags>` | Exit | Observed |
|---|---|---|
| `--host github-pages` | 0 | `fork:init done — 5 file(s) changed`; `.vitepress/config.mts` line 18 `const siteBase = process.env.SITE_BASE \|\| '/'`; `.github/workflows/` holds `deploy.yml`, `quality-gates.yml`, `release.yml`; `deploy.yml` line 102 `SITE_BASE: ${{ steps.pages.outputs.base_path }}/` |
| `--host cloudflare-pages` | 0 | `fork:init done — 4 file(s) changed`; A9 as above; `.github/workflows/` holds only `quality-gates.yml`, `release.yml` |
| `--base /x/` | 0 | `fork:init done — 6 file(s) changed`, `.vitepress/config.mts` among them; line 18 `const siteBase = '/x/'` |
| `--host github-pages --base /x/` | 1 | stderr `✗ --host decides the workflow and cannot be combined with --base (which only applies without --host), got --base: "/x/"`; A9 unchanged, no `deploy.yml` |

These runs were repeated on 2026-10-15 against `5225193` to record the full commands; the results
agree with the shorter record first written here. Checks: `gh pr checks 17` lists `Cloudflare Pages`, `build`,
`challenge-verify`, `prose-audit`, `site-smoke` and `test`, all `pass`.

PR BrowserLaboratory/wxl-platform#17, squash-merged as `5225193`.

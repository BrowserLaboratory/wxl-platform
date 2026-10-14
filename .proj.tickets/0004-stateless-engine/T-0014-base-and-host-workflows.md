---
id: T-0014
title: Write the base through A9 and choose the workflow by host
epic: 0004-stateless-engine
status: todo
blocked_by: [T-0010, T-0013]
---

## Context

`--base` today edits a `base:` line, and the workflow is only ever copied when absent. With A9 upstream (T-0010), a GitHub Pages range should take its base from deployment, the host should decide the workflow, and ranges configured the old way must be told exactly what to bring over.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

`--base` writes A9 (`'/x/'` or `'/'`, both modes; `.` and `..` refused). `--host github-pages` and `--host cloudflare-pages` reset A9 to the upstream form (warning when it was literal), require A9, `base: siteBase` and a usable template, and handle each workflow state (install, leave, replace a known old output, remove, warn with `SITE_BASE`/`404`). Without `--host`, today's workflow behaviour stands (LF-normalised in anchor mode) with the 404 warning when A9 is upstream and the workflow does not derive `SITE_BASE`, in both modes. The five base-related overridden tests are rewritten; the shared fixture's template derives `SITE_BASE`.

## Acceptance criteria

- [ ] T8–T11: A9 being set, candidate lines, CRLF (S1)
- [ ] T16–T26: host values, `--host` with `--base`, A9 errors and reset, `--base` lines and grammar, workflow states for both hosts, template errors, no-host behaviour and warning (S1)
- [ ] T51: rebrand differences for the base (S1)
- [ ] T60: the five base-related overridden tests (S1)
- [ ] T4: bytes outside A9 in the config unchanged when A9 is set (S1)
- [ ] Frozen copy `tests/unit/workflows/fixtures/deploy-template-72327e2.yml` (used by T22–T25)
- [ ] T82: warning on resetting a literal A9 (S1)
- [ ] T83: fork-init.ts workflow and base comments (S9)

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

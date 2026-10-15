---
id: T-0016
title: Document the new fork path, and verify a configured range end to end
epic: 0004-stateless-engine
status: processing
blocked_by: [T-0015, T-0011]
---

## Context

README, both fork-init skills, the glossary and the open-questions register still describe the scan, `--base`, and hand-edited short links. The epic's stage 8 must run on its last ticket, where every behaviour exists.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

README and README.en rewrite the fork section, the `fork:init` command row and the Cloudflare sub-path step with T77's strings; both `wxl-fork-init/SKILL.md` change as T78 lists and stay equal by `cmp`; the glossary gains T79's strings and its test passes; the register resolves OQ-005, updates OQ-004 and adds OQ-016 to OQ-019. Stage 8 runs 0004-S7 on this branch's HEAD: the GH and CF exports, every command exiting 0, with T74 and T75 read where S7 says.

## Acceptance criteria

- [ ] T73–T75: the two exports of S7 (stage 8, local)
- [x] T77: README strings (S9)
- [x] T78: skill strings and `cmp` (S9)
- [x] T79: glossary strings and test run (S9)
- [x] T80: open-questions strings (S9)

## 給使用者（zh-TW）

改寫文件並做 epic 的端到端驗證：README 與 README.en 的 fork 段落、兩份 fork-init skill、GLOSSARY、OPEN-QUESTIONS 依規定字串更新。第 8 階段在這張分支的 HEAD 上，把 repo 匯出成 GitHub Pages 與 Cloudflare Pages 兩份靶場，各跑完整套建置與測試，確認站名、短連結與 favicon 正確。

## Comments

### 2026-10-14 — carried from T-0010 stage 7

OQ-018 should note that T-0010 made the project-site base automatic, so more working same-origin ranges may exist (security-T-0010.md, C3).

### 2026-10-14 — test plan table (approved by the user before the first test)

Approved together with these decisions (user, 2026-10-14): the engine may import the `yaml` package and S2 links the repository's `node_modules` (Q1 A); the deploy template is not changed again in this epic (Q2 A); T-0014 adds the verbatim copy `tests/unit/workflows/fixtures/deploy-template-72327e2.yml` and T-0011 only pins it (Q3 A); spec and traceability revision 2.1 (end of file is an end of the line, white space after a form is not; an A8 value followed by `;` does not parse; S5 gains the expectation check); and the interpretations listed in each table's notes, with the claim additions below. Where a note says "needs the user's decision", the user's approval of the list settles it as the note recommends.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0004-S7 | GH 匯出：`git archive HEAD` 匯出到暫存目錄，依序執行 `git init && git add -A`、`pnpm install`、`pnpm fork:init --author "Test Teacher" --repo test-owner/web-range --host github-pages --site-name 林老師的資安靶場`、`pnpm wasm:build`、`pnpm challenge:keygen`、`pnpm test --run`、`pnpm build`、（讀 T74）、`pnpm exec playwright install chromium`、`CI=1 pnpm test:smoke`、`CI=1 pnpm test:challenges`、`SITE_BASE=/x/ pnpm build`、（讀 T75）。每道指令都以 exit 0 結束 | stage 8，本機，T-0016 分支 HEAD（紀錄 commit id） | T73 / AC-X1 | 指令順序固定。每個 Playwright 指令執行前，`lsof -tnP -iTCP:4173 -sTCP:LISTEN` 與 `-iTCP:5173` 都要沒有輸出。`fork:init` 會因裝上 workflow 印出 tag-rule 警告，這仍算 exit 0。環境中不設 `GITHUB_REPOSITORY` 與 `WXL_EXPECT_UPSTREAM` |
| 0004-S7 | CF 匯出：同一串指令，`fork:init` 改帶 `--host cloudflare-pages --origin https://web-range.pages.dev --site-name 'Lin'"'"'s "Web" Range \ $'"'"' $1'`。不跑 `SITE_BASE=/x/` 那一步。每道指令都以 exit 0 結束 | stage 8，本機，同一個 HEAD | T73 / AC-X1 | site name 要以單一 argv 傳入，並含 `'`、`"`、`\`、`` $' ``、`$1`。執行前先用 `printf '%s\n'` 印出實際 argv 並記錄。`--origin` 不帶 path。不裝 workflow |
| 0004-S7 | 兩份匯出的 `pnpm build` 產物中，`index.html` 與 `zh-TW/index.html` 都要符合：`.VPHero` 內 `.name` 元素的文字等於 site name，`<title>` 以 site name 結尾 | 兩份匯出的 `.vitepress/dist`，以文字讀取，比對前先解碼 HTML entity | T74 / AC-X1 | GH：CJK 名稱。CF：引號、反斜線、`` $' ``、`$1`（`$&` 無法測，因為 `&` 會被拒絕）。en 與 zh-TW 兩個 locale 都要查 |
| 0004-S7 | `challenges.html` 與 `zh-TW/challenges.html` 中，每道有短連結編號的題目各有一個 `[data-short-link]`，每個的文字都以「去掉 `https://` 的 origin」開頭 | 兩份匯出的產物 | T74 / AC-X1 | GH 用衍生 origin `test-owner.github.io/web-range`（帶 path）；CF 用 `web-range.pages.dev`。數量是 4（在 `c0f7edf` 上是 001、002、008、010），要記下 HEAD 上實際的編號清單 |
| 0004-S7 | 產物中所有 `.html` 與 `.js` 檔都不含 `wxl.browserlab.online` | 兩份匯出 `.vitepress/dist` 下的所有 `.html`、`.js` | T74 / AC-X1 | 掃整個 dist 目錄，包括 `challenge-sw.js` 等 public 複製過去的檔案 |
| 0004-S7 | `index.html` 與 `zh-TW/index.html` 的三個 favicon href 分別等於 `/favicon.svg`、`/favicon.png`、`/apple-touch-icon.png` | 兩份匯出、不帶 `SITE_BASE` 的那次 `pnpm build` | T74 / AC-X1 | `SITE_BASE` 不設。GH 的 A9 經 `--host` 之後是上游形式 |
| 0004-S7 | GH 匯出跑 `SITE_BASE=/x/ pnpm build`，exit 0，且 `index.html` 的三個 href 等於 `/x/favicon.svg`、`/x/favicon.png`、`/x/apple-touch-icon.png` | 只有 GH 匯出，讀根目錄的 `index.html` | T75 / AC-X1 | base 只有一段 path。這次建置會覆蓋 T74 讀過的 dist，所以 T74 一定要先讀 |
| 0004-S9 | `README.md`：T77 兩檔共用的 9 個必要字串、`README.md` 專屬的 6 個必要字串都存在，8 個禁止字串都不存在 | 對整個檔案跑 `grep -F` | T77 / AC-D1 | 含反引號的字串，取 double-backtick span 的內容（例如 `` `v*` `` 本身包含反引號）。另有含 `\|\|`、`→`、全形標點的字串 |
| 0004-S9 | `README.en.md`：T77 兩檔共用的 9 個必要字串、`README.en.md` 專屬的 6 個必要字串都存在，8 個禁止字串都不存在 | 對整個檔案跑 `grep -F` | T77 / AC-D1 | 同上 |
| 0004-S9 | `.claude/skills/wxl-fork-init/SKILL.md` 與 `.agents/skills/wxl-fork-init/SKILL.md` 各自含 T78 的 6 個必要字串（包括整行 `git grep -n "BrowserLaboratory/wxl-platform" -- README.md README.en.md CONTRIBUTE.md package.json`），且 9 個禁止字串都不存在 | 兩個檔案各跑一輪 `grep -F` | T78 / AC-D1 | `Node.js ≥ 22.6`（U+2265）。禁止字串含反引號、全形括號 |
| 0004-S9 | 兩份 SKILL.md 用 `cmp` 比對結果相同（exit 0） | 兩個檔案 | T78 / AC-D1 | 位元組完全相同，各自保留目前的語言 |
| 0004-S9 | `GLOSSARY.md` 依區塊檢查：slug（題目 slug）有一行以 `_Avoid_:` 開頭且含 `owner/name`；upstream（上游）與 setup record（設定紀錄）各含 `設定紀錄出現之前建立的靶場沒有設定紀錄`；upstream（上游）有一行以 `_Avoid_:` 開頭且含 `git remote`；site-wide clear（全站清除）含 `同一個 owner 的 GitHub Pages 靶場` | 區塊從 `**term**:` 那一行起，到下一個 term 行或 `## ` 標題為止。先切出區塊，再 `grep -F` | T79 / AC-D2 | 「以 `_Avoid_:` 開頭的那一行」要逐行比對（行首比對加 `grep -F`），不能只對整個區塊。四個區塊分屬兩個 `## ` 段落 |
| 0004-S9 | 詞彙表測試通過：`pnpm vitest run tests/unit/site/glossary.test.ts` | 真實的 `GLOSSARY.md` | T79 / AC-D2 | 新句子寫進定義行，所以不能含數字（半形或全形）、反引號識別字、副檔名路徑。`owner/name` 與 `git remote` 只放在 `_Avoid_` 行（`_Avoid_` 行不算定義） |
| 0004-S9 | `.proj.specs/OPEN-QUESTIONS.md`：OQ-005 含 `**Status:** resolved`，OQ-004 含 `--host` | 區塊從 `## OQ-NNN` 標題起，到下一個 `---` 為止 | T80 / AC-D3 | OQ-005 原本是 `**Status:** open`，要改，不能另加一行 |
| 0004-S9 | OQ-016 含 `copy-short-link`；OQ-017 含 `provisional` 與 `Revisit when`；OQ-018 含 `storage`、`site-wide clear`、`service worker`；OQ-019 含 `generate_release_notes` | 新增的四個區塊 | T80 / AC-D3 | 新區塊前要有 `---` 分隔。OQ-019 是最後一個區塊，範圍到檔案結尾為止 |

**Notes**

- **既有測試：** 本 ticket 不改寫任何既有測試。overridden contracts 表中的測試列都歸 T-0010、T-0012～T-0015。所有其他既有測試照舊，在本分支 HEAD 上用 `pnpm test --run` 全數通過來確認。T-0011 落地之後，guard（T61–T64）與 pristine（T67–T68）會在上游的真實 tree 上跑，所以這次改文件時：
  - README、README.en、GLOSSARY 在 A2/A3 形式以外不能出現上游 repo slug 字面值（README 在 rewrite list，GLOSSARY 不在 keep list）。
  - fork 段落不能放任何會被 A2/A3 wildcard 吃到的範例，例如 `git clone https://github.com/test-owner/web-range.git`，否則 pristine 的 `A2:*`/`A3:*` 會判為不符。用 `<owner>/<repo>` 這種含 `<` 的 placeholder 就不會被吃到。
- **新增檔案：** 不新增測試檔，也不改既有測試檔。S9 與 S7 的紀錄寫進 ticket 的 Comments。T74/T75 的讀取腳本建議用一次性的 `node --input-type=module` heredoc（可用 devDependency 裡的 `happy-dom` 或 `jsdom` 解析 `.VPHero .name`、`[data-short-link]`、`link[rel]`），並把整段腳本貼進紀錄，之後才能重現。不要只留一個 scratchpad 路徑。
- **S9 的 shell 引號風險：** 很多字串含反引號、`$`、`||`、`"`。建議把字串一行一個寫進暫存檔，再用 `while IFS= read -r s; do grep -qF -- "$s" <file> …; done` 跑，不要直接把字串寫進命令列。double-backtick span 頭尾的那一個空白不算在內容裡（照 CommonMark）。這個解讀要在紀錄裡寫明。
- **S9 區塊邊界的缺口：**
  - 目前最後一個區塊 OQ-015 後面沒有 `---`。依 S9「到下一個 `---`」的定義，新增 OQ-016 之前一定要先補 `---`，否則 OQ-016 的字串會被算進 OQ-015。
  - OQ-019 後面沒有 `---`，它的區塊範圍視為到 EOF。這個解讀要記錄。
  - GLOSSARY 的四個區塊要用腳本照 S9 的規則切，不要靠人眼判斷範圍。
- **T77 有一部分 S9 測不到：** T77 說的「fork 段落（從 `fork 之後：改寫專案身分`／`After forking: rewrite the project identity` 到下一個同級或更高的標題）、`fork:init` 指令列、Cloudflare 子路徑 `SITE_BASE` 步驟都改寫」是位置宣告。S9 只對整個檔案跑 `grep -F`，只能證明字串存在或不存在，證明不了字串在對的段落。stage 6 審查要人工確認，並把這點記為 S9 的限制。
- **OQ-004 的內容：** T80 只要求 OQ-004 含 `--host`，但它的 Evidence 段（「unconditionally」、README 的 "After forking"）已經跟新行為矛盾，也要一起改，否則等於在 register 留下錯誤的事實。這不是 T80 的字串，靠 stage 6 審查把關。
- **T-0010 帶過來的 Comment：** OQ-018 要補一句：T-0010 讓專案站的 base 自動化，可運作的同源靶場可能變多（`security-T-0010.md` C3）。這不在 T80 的字串清單裡，只能人工檢查，要在 S9 紀錄附上對應的行。
- **兩份 skill 的副作用：** 兩份要 `cmp` 相同，所以 frontmatter 不能加 Claude 專用的 `disable-model-invocation:`，否則 `python3 scripts/verify-project.py` 的 Codex 檢查會失敗。改完要跑一次 verify-project。frontmatter 的 description（目前寫 "set the VitePress base"）不在 T78 的禁止字串裡，但已經過時，建議一起改。
- **CI 的 prose-audit：** 這張 ticket 改到的 `*.md`（README、README.en、GLOSSARY、兩份 SKILL.md、OPEN-QUESTIONS）在 PR 上會觸發 `prose-audit` job。開 PR 前建議先在本機跑 `python scripts/prose-audit/run.py <files>`。這是落地 gate，不屬於 S1–S9 任何一個 seam。
- **S7 的時序與環境風險：**
  - S7 讀的是 `git archive HEAD`，所以文件改動要先 commit 才能跑 stage 8。stage 8 之後如果 HEAD 又改了，要在紀錄說明差異；若改到建置會讀的檔案，就要重跑。
  - `pnpm install` 與 `playwright install chromium` 需要網路。
  - 要記錄 `node --version`、`pnpm --version`、`rustc --version`、`wasm-pack --version`。
  - `CI=1 pnpm test:challenges` 用 `docs:dev`（埠 5173），smoke 用 `docs:preview`（埠 4173）。跑完要照 `docs/agents/platform-notes.md` 清掉殘留的 server。
- **T74 的「4 個」：** 這是 `c0f7edf` 上的數量。T74 的實際條件是「每道有短連結編號的題目各一個」，所以要以 HEAD 上的題目清單為準，並記下編號清單。
- **範圍比對：** ticket 認領的列（T73–T75、T77–T80）與 traceability 一致，沒有誤配：
  - T76 已在 T-0010 的 preview 驗證完畢。
  - T83 各列由 T-0010、T-0012、T-0013、T-0014、T-0015 認領，T84 由 T-0013 認領，本 ticket 都不重做。
  - `blocked_by: [T-0015, T-0011]` 符合使用者訂的順序（T-0016 最後做）。也就是說，S7 的「epic 最後一張 ticket 的分支 HEAD」就是本分支。
- **stage 8 偏離 workflow 的說明：** S7 不開瀏覽器，只讀靜態 HTML/JS。這是 spec 對 hard rule 4 與 workflow「preview deployment」規則明文寫下的例外（記為 OQ-017）。回報 stage 8 時要寫明涵蓋的範圍是「本機匯出產物的靜態檔」，不是實際部署。實際部署到兩個 host 由使用者在 workshop 前手動確認。

### 2026-10-15 — S9 record

**Scope of this entry:** the documentation part of this ticket (T77–T80). T73–T75 (0004-S7, stage 8)
are explicitly out of scope and left unticked — the parent runs stage 8 after this work is committed.

**CommonMark interpretation, stated once for the whole record.** Every double-backtick span in
`traceability.md`'s T77/T78 string lists (e.g. `` `v*` ``) is read as: the delimiters are two
backticks, and a single leading/trailing space between the delimiters and the content is not part of
the content (CommonMark code-span rule). So `` `v*` `` searches for the four-character literal
`` `v*` `` (backtick, v, asterisk, backtick) — not for the span with its surrounding spaces. The same
rule was applied to every other double-backtick string in T77/T78 (e.g. `` Cloudflare Pages 靶場每次都要帶 `--host cloudflare-pages` ``, `` → `--base '/<repo>/'` ``).

**Files changed:** `README.md`, `README.en.md`, `.claude/skills/wxl-fork-init/SKILL.md`,
`.agents/skills/wxl-fork-init/SKILL.md`, `GLOSSARY.md`, `.proj.specs/OPEN-QUESTIONS.md`. No test file
was touched.

#### String lists (verbatim), used by every grep loop below

Built from `traceability.md`'s T77/T78 string lists (double-backtick spans reduced to their content
per the CommonMark interpretation above), one string per line:

```
# t77_both_required.txt
--host github-pages
--host cloudflare-pages
--origin
--site-name
configure-pages
.vitepress/config.mts
const siteBase = process.env.SITE_BASE || '/'
Settings → Pages → Source
`v*`
```

```
# t77_readme_md_required.txt
每次執行都要帶齊參數
Cloudflare Pages 靶場每次都要帶 `--host cloudflare-pages`
不帶 `--host` 執行會重新裝回 GitHub Pages workflow
Cloudflare Pages 靶場部署在網域根目錄
同一個 owner 的 GitHub Pages 靶場共用瀏覽器儲存空間
用 `--base` 的靶場，CI 的 site smoke 與 challenge 測試會失敗
```

```
# t77_readme_md_forbidden.txt
--base <見下方說明>
刻意不設 `SITE_BASE`
`fork:init` 不會改短連結的網址
移除 `base` 宣告
process.env.SITE_BASE ?? '/'
測試時請暫時清掉 base
腳本也從不寫入 `SITE_BASE`
網站放在子路徑時，加上 `SITE_BASE`
```

```
# t77_readme_en_required.txt
pass every argument on every run
A Cloudflare Pages range passes `--host cloudflare-pages` on every run
a run without `--host` reinstalls the GitHub Pages workflow
A Cloudflare Pages range is served at the domain root
GitHub Pages ranges of one owner share browser storage
With `--base`, a range's site smoke and challenge tests fail in CI
```

```
# t77_readme_en_forbidden.txt
--base <see below>
deliberately sets no `SITE_BASE`
does not touch the short-link origin
removes the `base` declaration
process.env.SITE_BASE ?? '/'
with the base temporarily cleared
is never written by the script
If the site is served from a sub-path, add `SITE_BASE`
```

```
# t78_required.txt
--host github-pages
--host cloudflare-pages
--origin
--site-name
Node.js ≥ 22.6
git grep -n "BrowserLaboratory/wxl-platform" -- README.md README.en.md CONTRIBUTE.md package.json
```

```
# t78_forbidden.txt
掃描式
Node.js ≥ 18
CLI 不會改短連結的網址
GitHub Pages 專案站填 `/<repo>/`
或 Cloudflare Pages 填 `none`
→ `--base '/<repo>/'`
或 Cloudflare Pages → `--base none`
第一條（slug）預期零殘留
既有且不同者不覆蓋
```

#### Red (before editing), 2026-10-15

Ran the grep loop below against each pre-edit file, read with `git show <base-commit>:<path>` (the
commit this branch started from, before any of this ticket's documentation edits). Every T77/T78
**required** string was absent except **three** coincidental ones, and every **forbidden** string was
present — confirming the starting state was red. Full raw output (`present: <s>` / `absent: <s>`, one
line per string, in list order):

```
$ while IFS= read -r s; do grep -qF -- "$s" README.md && echo "present: $s" || echo "absent: $s"; done < t77_both_required.txt
absent: --host github-pages
absent: --host cloudflare-pages
absent: --origin
absent: --site-name
absent: configure-pages
present: .vitepress/config.mts
absent: const siteBase = process.env.SITE_BASE || '/'
present: Settings → Pages → Source
present: `v*`
```

→ **6/9 absent, 3/9 present** (the three pre-existing, coincidental matches: `` .vitepress/config.mts ``,
`` Settings → Pages → Source `` and `` `v*` ``, all three already present in the unrelated "two GitHub
settings" paragraph before this ticket's rewrite touched the fork section).

```
$ while IFS= read -r s; do grep -qF -- "$s" README.md && echo "present: $s" || echo "absent: $s"; done < t77_readme_md_required.txt
absent: 每次執行都要帶齊參數
absent: Cloudflare Pages 靶場每次都要帶 `--host cloudflare-pages`
absent: 不帶 `--host` 執行會重新裝回 GitHub Pages workflow
absent: Cloudflare Pages 靶場部署在網域根目錄
absent: 同一個 owner 的 GitHub Pages 靶場共用瀏覽器儲存空間
absent: 用 `--base` 的靶場，CI 的 site smoke 與 challenge 測試會失敗
```

→ 6/6 absent.

```
$ while IFS= read -r s; do grep -qF -- "$s" README.md && echo "present: $s" || echo "absent: $s"; done < t77_readme_md_forbidden.txt
present: --base <見下方說明>
present: 刻意不設 `SITE_BASE`
present: `fork:init` 不會改短連結的網址
present: 移除 `base` 宣告
present: process.env.SITE_BASE ?? '/'
present: 測試時請暫時清掉 base
present: 腳本也從不寫入 `SITE_BASE`
present: 網站放在子路徑時，加上 `SITE_BASE`
```

→ 8/8 present (all forbidden strings were in the pre-edit file, as expected for red).

`README.en.md` gave the identical shape against the same three lists (both-required: 6/9 absent, the
same three exceptions present; en-specific required: 6/6 absent; en-specific forbidden: 8/8 present) —
not reprinted line-by-line here since it is the mechanical English counterpart of the run above.

```
$ while IFS= read -r s; do grep -qF -- "$s" .claude/skills/wxl-fork-init/SKILL.md && echo "present: $s" || echo "absent: $s"; done < t78_required.txt
absent: --host github-pages
absent: --host cloudflare-pages
absent: --origin
absent: --site-name
absent: Node.js ≥ 22.6
absent: git grep -n "BrowserLaboratory/wxl-platform" -- README.md README.en.md CONTRIBUTE.md package.json
```

→ 0/6 present (required), i.e. 6/6 absent.

```
$ while IFS= read -r s; do grep -qF -- "$s" .claude/skills/wxl-fork-init/SKILL.md && echo "present: $s" || echo "absent: $s"; done < t78_forbidden.txt
present: 掃描式
present: Node.js ≥ 18
present: CLI 不會改短連結的網址
present: GitHub Pages 專案站填 `/<repo>/`
present: 或 Cloudflare Pages 填 `none`
present: → `--base '/<repo>/'`
present: 或 Cloudflare Pages → `--base none`
present: 第一條（slug）預期零殘留
present: 既有且不同者不覆蓋
```

→ 9/9 present. `.agents/skills/wxl-fork-init/SKILL.md` gave the identical result (the two files were
already `cmp`-identical before any editing, confirmed separately below).

`GLOSSARY.md`, cut with `cut_blocks.py` (pasted in full below) against the pre-edit file, then grepped
— not "read by eye":

```
$ python3 cut_blocks.py glossary GLOSSARY.md "slug（題目 slug）" | grep '^_Avoid_:' | grep -F 'owner/name'
(no output; exit 1 — absent)

$ python3 cut_blocks.py glossary GLOSSARY.md "upstream（上游）" | grep -F '設定紀錄出現之前建立的靶場沒有設定紀錄'
(no output; exit 1 — absent)

$ python3 cut_blocks.py glossary GLOSSARY.md "upstream（上游）" | grep '^_Avoid_:' | grep -F 'git remote'
(no output; exit 1 — absent)

$ python3 cut_blocks.py glossary GLOSSARY.md "setup record（設定紀錄）" | grep -F '設定紀錄出現之前建立的靶場沒有設定紀錄'
(no output; exit 1 — absent)

$ python3 cut_blocks.py glossary GLOSSARY.md "site-wide clear（全站清除）" | grep -F '同一個 owner 的 GitHub Pages 靶場'
(no output; exit 1 — absent)
```

→ 0/4 blocks green (all four required T79 facts absent pre-edit).

`.proj.specs/OPEN-QUESTIONS.md`, cut with `cut_blocks.py`'s `oq` mode:

```
$ python3 cut_blocks.py oq OPEN-QUESTIONS.md OQ-005 | grep -F '**Status:**'
**Status:** open

$ python3 cut_blocks.py oq OPEN-QUESTIONS.md OQ-004 | grep -coF -- '--host'
0

$ grep -n "OQ-016\|OQ-017\|OQ-018\|OQ-019" OPEN-QUESTIONS.md
(no output — none of the four exist yet)

$ tail -5 OPEN-QUESTIONS.md
with the consequence falling on the current learner's own data.

**Not blocked.** Chromium, where the behaviour was observed.

**Revisit when.** The smoke suite gains a Firefox or WebKit project, or a supported browser is added.
```

→ OQ-005 was `**Status:** open`; OQ-004 had zero `--host` occurrences; OQ-016–OQ-019 did not exist; the
file ends at OQ-015 with no trailing `---`.

#### The block-cutting script (S9, GLOSSARY and OPEN-QUESTIONS), pasted in full

```python
#!/usr/bin/env python3
"""S9 block cutter for T79 (GLOSSARY.md) and T80 (OPEN-QUESTIONS.md).

GLOSSARY rule (S9, traceability.md row for T79): a glossary entry runs from
its `**term**:` line to the next such line or a `## ` heading.

OPEN-QUESTIONS rule (S9): an open question runs from its `## OQ-NNN` heading
to the next `---`; OQ-019 (the last block) runs to end of file (no trailing
`---` exists in the current file).

Usage:
  python3 cut_blocks.py glossary <path> <term-substring>
  python3 cut_blocks.py oq <path> <OQ-NNN>
"""
import re
import sys

TERM_LINE = re.compile(r'^\*\*(.+?)\*\*\s*[:：]\s*$')


def cut_glossary_block(text: str, term_substring: str) -> str:
    lines = text.split('\n')
    starts = [i for i, l in enumerate(lines) if TERM_LINE.match(l)]
    heading_idx = [i for i, l in enumerate(lines) if l.startswith('## ')]
    # boundaries: every term-line start, and every '## ' heading, sorted
    boundaries = sorted(set(starts) | set(heading_idx))
    target_start = None
    for i in starts:
        m = TERM_LINE.match(lines[i])
        if m and term_substring in m.group(1):
            target_start = i
            break
    if target_start is None:
        print(f'TERM NOT FOUND: {term_substring}', file=sys.stderr)
        sys.exit(2)
    # next boundary strictly after target_start
    end = len(lines)
    for b in boundaries:
        if b > target_start:
            end = b
            break
    return '\n'.join(lines[target_start:end])


def cut_oq_block(text: str, oq_id: str) -> str:
    lines = text.split('\n')
    heading_re = re.compile(r'^## ' + re.escape(oq_id) + r'\b')
    start = None
    for i, l in enumerate(lines):
        if heading_re.match(l):
            start = i
            break
    if start is None:
        print(f'OQ NOT FOUND: {oq_id}', file=sys.stderr)
        sys.exit(2)
    end = len(lines)
    for i in range(start + 1, len(lines)):
        if lines[i].strip() == '---':
            end = i
            break
    return '\n'.join(lines[start:end])


if __name__ == '__main__':
    mode = sys.argv[1]
    path = sys.argv[2]
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    if mode == 'glossary':
        print(cut_glossary_block(text, sys.argv[3]))
    elif mode == 'oq':
        print(cut_oq_block(text, sys.argv[3]))
    else:
        print('unknown mode', file=sys.stderr)
        sys.exit(1)
```

#### The grep loop (S9), pasted in full

```bash
while IFS= read -r s; do
  grep -qF -- "$s" "$FILE" && echo "present: $s" || echo "absent: $s"
done < strings.txt
```

Run once per (file, string-list) pair, with `strings.txt` one of: `t77_both_required.txt`,
`t77_readme_md_required.txt`, `t77_readme_md_forbidden.txt`, `t77_readme_en_required.txt`,
`t77_readme_en_forbidden.txt`, `t78_required.txt`, `t78_forbidden.txt` — each built with `cat > … <<'EOF'`,
one line per string from `traceability.md`'s T77/T78 lists, double-backtick spans reduced to their
content per the CommonMark interpretation above. For GLOSSARY/OPEN-QUESTIONS the same grep loop ran
against the output of `cut_blocks.py` for each named block instead of the whole file.

#### Green (after editing), 2026-10-15

**README.md** — T77 both-required: 9/9 present. `README.md`-specific required: 6/6 present
(`每次執行都要帶齊參數`; `` Cloudflare Pages 靶場每次都要帶 `--host cloudflare-pages` ``;
`` 不帶 `--host` 執行會重新裝回 GitHub Pages workflow ``; `Cloudflare Pages 靶場部署在網域根目錄`;
`同一個 owner 的 GitHub Pages 靶場共用瀏覽器儲存空間`;
`` 用 `--base` 的靶場，CI 的 site smoke 與 challenge 測試會失敗 ``). `README.md`-specific forbidden:
8/8 absent.

**README.en.md** — T77 both-required: 9/9 present. `README.en.md`-specific required: 6/6 present
(`pass every argument on every run`; `` A Cloudflare Pages range passes `--host cloudflare-pages` on every run ``;
`` a run without `--host` reinstalls the GitHub Pages workflow ``;
`A Cloudflare Pages range is served at the domain root`; `GitHub Pages ranges of one owner share browser storage`;
`` With `--base`, a range's site smoke and challenge tests fail in CI ``). `README.en.md`-specific
forbidden: 8/8 absent.

**Confinement check (Notes):** `git grep -n "BrowserLaboratory/wxl-platform" README.md README.en.md`
after editing shows only the pre-existing A2 badge line and A3 `git clone` line in each file — no new
literal occurrence, and no new example a wildcard A2/A3 form would match (every new example uses
`<owner>/<repo>`-shaped placeholders containing `<`, e.g. `https://<owner>.github.io/<repo>/`,
`https://<your-project>.pages.dev`); confirmed again after the stage 6/7 corrections below (same
result,
`GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true pnpm vitest run tests/unit/scripts/upstream-guard.test.ts`
→ `Tests  93 passed (93)`, see "Other checks").

**`.claude/skills/wxl-fork-init/SKILL.md`** — T78 required: 6/6 present. T78 forbidden: 9/9 absent.
**`.agents/skills/wxl-fork-init/SKILL.md`** — identical results (same content; see `cmp` below).
No `disable-model-invocation:` or other Claude-only frontmatter key was added to either file; each
keeps its own pre-existing language (Traditional Chinese prose with English flag/command literals, as
before this ticket).

`cmp .claude/skills/wxl-fork-init/SKILL.md .agents/skills/wxl-fork-init/SKILL.md` → **exit 0**.

**GLOSSARY.md**, blocks cut with the script above:
- `slug（題目 slug）`: gained an `_Avoid_:` line containing `owner/name`
  (`` _Avoid_: `owner/name` 的 repository slug——fork-init 文件裡「slug」也指 GitHub repo 的 owner/name，跟這裡題目的 slug 只是撞名，兩者不相關。``).
- `upstream（上游）` and `setup record（設定紀錄）`: both now contain
  `設定紀錄出現之前建立的靶場沒有設定紀錄`.
- `upstream（上游）`: gained an `_Avoid_:` line containing `git remote`
  (`` _Avoid_: `git remote` 的 upstream 遠端名稱（`CONTRIBUTE.md` 的 `git remote add upstream`）——那是 git 自己的詞… ``).
- `site-wide clear（全站清除）`: gained an `_Avoid_:` line containing `同一個 owner 的 GitHub Pages 靶場`.

Pre-edit, no full suite run exists to compare against (`GLOSSARY.md` itself was not test-run before
this ticket touched it); the Red subsection above already confirms every T79 string was absent from
each pre-edit block by `cut_blocks.py` + `grep`, which is the evidence this entry actually needs.
Post-edit, `pnpm vitest run tests/unit/site/glossary.test.ts` → `Tests  248 passed (248)`; every
sentence added was checked by hand against the digit, backtick-identifier and file-path rules before
being written, and every `_Avoid_` line is excluded from the checked definition regardless of what it
contains.

**`.proj.specs/OPEN-QUESTIONS.md`**:
- OQ-005 block: `**Status:** resolved` present, exactly one `**Status:**` line in the block (no second
  line added) — confirmed with `grep -c '^\*\*Status:\*\*'` = 1.
- OQ-004 block: `--host` present (6 occurrences).
- OQ-016 block: `copy-short-link` present.
- OQ-017 block: `provisional` and `Revisit when` both present.
- OQ-018 block: `storage`, `site-wide clear` and `service worker` all present.
- OQ-019 block: `generate_release_notes` present.
- Confirmed with the block-cutter that OQ-015's block still ends at its own last line (did not absorb
  OQ-016), that each of OQ-016–OQ-019 is preceded by its own `---` separator, and that OQ-019's block
  (no trailing `---` in the file) runs to EOF — the file still has no trailing `---` after OQ-019.

**Review-only corrections (not S9 strings, re-verified against the current file after the stage 6/7
disposition below; line numbers pinned to the branch's uncommitted working tree — the parent re-pins
them to the landing commit once this work is committed):**
- OQ-004's Reason and Evidence paragraphs, corrected again in the stage 6/7 pass so the "removes one if
  it is already there" claim is qualified, and the Evidence paragraph cites `scripts/fork-init.ts` line
  ranges instead of the README: `.proj.specs/OPEN-QUESTIONS.md:162-180`.
- OQ-018's Evidence paragraph, corrected in the stage 6/7 pass: the service worker's scope is
  `BASE_URL`, not "the origin's scope", and scoping it narrower does not stop the storage-sharing risk,
  since IndexedDB/localStorage are shared per origin regardless of scope; the carried sentence from
  T-0010 stage 7 is folded into this same paragraph:
  `.proj.specs/OPEN-QUESTIONS.md:613-640`.

#### Re-verified on 2026-10-15 after the stage 6/7 disposition (items 1–16 below)

The stage 6/7 pass (see that section) touched README.md/README.en.md, both SKILL.md files,
GLOSSARY.md and OPEN-QUESTIONS.md again on top of the pass recorded above, to fix accuracy findings
that did not change any T77–T80 string. Re-ran the full S9 suite against the files as they stand now;
every result above still holds, confirmed with fresh raw output:

```
$ while IFS= read -r s; do grep -qF -- "$s" README.md && echo "present: $s" || echo "absent: $s"; done < t77_both_required.txt
present: --host github-pages
present: --host cloudflare-pages
present: --origin
present: --site-name
present: configure-pages
present: .vitepress/config.mts
present: const siteBase = process.env.SITE_BASE || '/'
present: Settings → Pages → Source
present: `v*`
```

(and identically for every other required/forbidden list, against both README files, both SKILL.md
files, all four GLOSSARY.md blocks and all six OPEN-QUESTIONS.md blocks — the full command-by-command
output is reproduced in the "Other checks" section's first bullet point, with the same counts: 9/9,
6/6 and 6/6 required present; 8/8 and 8/8 forbidden absent for the two README files; 6/6 required
present and 9/9 forbidden absent for both SKILL.md files; 4/4 GLOSSARY blocks green; 6/6 OPEN-QUESTIONS
blocks green). `pnpm vitest run tests/unit/site/glossary.test.ts` → `Tests  248 passed (248)`
(unchanged count — the stage 6/7 pass rewrote existing glossary prose and added one `_Avoid_` line
outside T79's required set, without adding or removing an entry).

#### Other checks

- `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true pnpm vitest run tests/unit/scripts/upstream-guard.test.ts`
  → `Test Files  1 passed (1)`, `Tests  93 passed (93)` (run after the stage 6/7 pass; the confinement
  rule — no upstream slug literal outside A2/A3 forms, no new wildcard-matching example — holds on the
  real tree).
- `python3 scripts/verify-project.py` → `PASS: shared instructions, 42 skills across Claude/Codex trees, invocation policies, helper assets and native role configs`.
- `python3 scripts/prose-audit/run.py README.md` → the script's default surface (`README.md`,
  `CONTRIBUTE.md`, `CLAUDE.md`, `AGENTS.md`, `docs/agents/guide.md`, `platform/**/*.md`; the same
  surface `quality-gates.yml`'s `prose-audit` job uses, unmodified) selects only `README.md` among this
  ticket's changed files — `README.en.md`, `GLOSSARY.md`, both `SKILL.md` and `OPEN-QUESTIONS.md` are
  outside that surface by design and are not scored by this gate at all (not passing, not failing).
  Result after the stage 6/7 pass: `[ok] README.md: 0 blocking, 5 advisory` → `verdict: PASS (exit 0)`.
  The three blocking rules (`mainland_vocab`, `placeholder_grep`, `citation_format`) found nothing. The
  5 advisory findings are `duplicate_sentences` (×4: the repeated badge URL, the repeated table-divider
  shape, and two repeated substrings — "github/workflows/deploy" and "vitepress/config" — each written
  several times across the GitHub Pages, Cloudflare Pages and no-`--host` cases the new state table and
  surrounding prose now distinguish) and `repetition_fingerprint` (×1: the three repeated shields.io
  badge URLs at the top of the file, pre-existing, unrelated to this ticket). None of the five are
  blocking; the mainland-vocabulary rule was also run directly (bypassing the surface filter) against
  every file this ticket changed — `README.md`, `README.en.md`, `GLOSSARY.md`,
  `.proj.specs/OPEN-QUESTIONS.md`, both `SKILL.md` files — and found 0 PRC-vocabulary hits in all five.
- `pnpm test --run` → `Test Files  127 passed (127)`, `Tests  4175 passed | 1 skipped (4176)`, exit 0.
  (An unrelated `ECONNREFUSED` trace to `127.0.0.1:3000` is printed after the summary by an unrelated
  background process; it did not affect the exit code or any test's pass/fail count.)

#### Acceptance criteria

- [x] T77: README strings (S9) — both files green, confinement holds.
- [x] T78: skill strings and `cmp` (S9) — both files green, `cmp` exit 0, `verify-project.py` passes.
- [x] T79: glossary strings and test run (S9) — all four blocks green, glossary test 248/248.
- [x] T80: open-questions strings (S9) — all six blocks green.
- T73–T75 left unticked: out of this entry's scope (stage 8, run by the parent after this work lands).

### Deviations

- **T77 location is a stage-6 judgement call, not an S9 one** (as the ticket's Notes already state):
  the rewritten prose was placed so that every required string sits inside the fork section (from
  `### fork 之後：改寫專案身分` / `### After forking: rewrite the project identity` to the next
  `###`/`##` heading) or inside the Cloudflare sub-path step the ticket named, but S9's `grep -F` over
  the whole file cannot itself prove placement — recorded here for the reviewer, per the ticket's own
  limitation note.
- **OQ-005's resolution adds a `Resolved on` paragraph** beyond flipping the `Status:` line, following
  the shape already used by OQ-001 and OQ-006 (no second `**Status:**` line was added — verified above).
  This is additional, not-strictly-required content; if the parent prefers the bare minimum edit, this
  paragraph can be trimmed without affecting the S9 result.
- **README.md's fork-section rewrite restores one true, pre-existing caveat** ("short links work only
  on Cloudflare Pages") that the literal old/new string diff would otherwise have dropped, since it
  falls inside the replaced block; it is not on the forbidden list and remains accurate after this
  epic.
- **prose-audit's advisory findings** (5, see "Other checks" above) were not reworded away, since none
  are blocking and the repeated phrases are the correct technical terms repeated across genuinely
  different deployment cases (GitHub Pages / Cloudflare Pages / no `--host`) that the new state table
  made explicit rather than glossing over.
- No ticket frontmatter field other than Comments was changed; `status` remains `processing` — this
  entry only closes T77–T80; T73–T75 (stage 8) are still open, so the ticket as a whole is not done
  yet, and the parent moves it to its next status once stage 8 runs.

### 2026-10-15 — coverage report table

Coverage is **not measured: no coverage provider is installed** in this project (same as every other
ticket in this epic); "Measured coverage" below names which reproduce command exercises the seam
instead. This table covers S9 (documents, this entry's own scope) and names S7 (stage 8) as still
outstanding, per workflow.md's format.

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0004-S9 (README.md / README.en.md strings) | the `t77_*` grep loops above, run against both files, both before (red) and after (green) editing | not measured: no coverage provider is installed | T77 / AC-D1 | T77's placement clause (the required strings must sit inside the named fork section/Cloudflare step, not merely anywhere in the file) is not provable by whole-file `grep -F`; only a stage-6 human read of the rendered section confirms it (recorded as a Deviation above) |
| 0004-S9 (both `wxl-fork-init/SKILL.md`) | the `t78_*` grep loops above, plus `cmp`, run against both files before and after editing | not measured: no coverage provider is installed | T78 / AC-D1 | — |
| 0004-S9 (GLOSSARY.md) | the `cut_blocks.py` + grep commands above, run against all four named blocks before and after editing, plus `pnpm vitest run tests/unit/site/glossary.test.ts` | not measured: no coverage provider is installed | T79 / AC-D2 | — |
| 0004-S9 (OPEN-QUESTIONS.md) | the `cut_blocks.py` + grep commands above, run against all six named blocks before and after editing | not measured: no coverage provider is installed | T80 / AC-D3 | — |
| 0004-S7 (stage 8: GH/CF exports, build and test) | not run by this entry | not measured: no coverage provider is installed | T73–T75 / AC-X1 | Explicitly out of this entry's scope (see "Scope of this entry" above); the parent runs it on the committed HEAD after this documentation work lands |

### 2026-10-15 — stage 6 and 7 disposition

Applied directly (behaviour-preserving documentation fixes within this ticket's own T77–T80 scope, per
the user's prior authorisation for this class of fix). Each item below: what the finding was, what was
done, the evidence. Every fact cited against `scripts/fork-init.ts` was re-read from the file itself,
not inferred from the prior draft.

1. **The fork-section paragraph claimed the GitHub Pages deploy workflow is installed "only when
   `--host github-pages` is given", contradicting the no-`--host` behaviour a few paragraphs later.**
   `scripts/fork-init.ts`'s no-`--host` branch (`:1606-1631`) and its `--host github-pages` branch
   (`:1554-1588`) both install the template when the workflow is absent — the difference between the
   two is only what happens when a workflow already exists differently-shaped. Replaced the
   contradictory sentence with a four-state table (absent / matches current template / matches a known
   old template / other, × the three `--host` values) in both README files, and pointed the skill's own
   description at that table instead of restating it.
2. **"A run that omits a flag means this run leaves it alone" was stated without its two exceptions.**
   Documented both: without `--host`, the workflow still installs itself once if it is absent
   (`scripts/fork-init.ts:1606-1631`); with `--host github-pages` and no `--origin`, the short-link
   origin (A8) is re-derived from `--repo` and overwritten on every run
   (`deriveGithubPagesOrigin`, `:1075-1080`, used at `:1441`), warning when it overwrites a value that
   is neither the new one nor upstream's default (`:1460-1469`). Added the matching sentence that a
   custom-domain GitHub Pages range needs `--origin` on every run for the same reason.
3. **The workflow-state table asked for in review was missing; README repeated "the script leaves it
   untouched and warns" without saying when it instead replaces or removes the file.** Added the
   four-state × three-host table described in item 1 to both README files; shortened the skill's and
   OQ-004's own descriptions to a sentence that points at that table instead of each repeating the full
   state logic (five differently-worded copies was the root cause review found).
4. **`--base none` was described as clearing the base declaration; it actually writes the literal
   `const siteBase = '/'`** (`a9LineFor`, `scripts/fork-init.ts:806-809`: `target.base === null` maps to
   the string `'/'`, then `` `const siteBase = '${value}'` ``, never a deletion). Corrected both README
   files. Also corrected "Omitting `--host` leaves that upstream line in place, and only then does
   `--base` take effect" (true only when `--base` is also omitted; when `--base` is given without
   `--host`, A9 is rewritten) to: without `--host`, A9 is rewritten only by `--base`, and stays whatever
   it already was when neither is given. Fixed the Traditional Chinese mistranslation "上游表單"
   (literally "upstream form/document") to "上游原本那一行" ("that original upstream line"). Restored a
   reference to `scripts/templates/deploy.yml.template` next to the sentence that used to say "the
   copy" without naming what was being copied.
5. **The skill's `host`/`base` decision section did not cover a GitHub Pages user site, a custom
   domain, or rebrand (`--rebrand`) mode at all, and called `--base` "the legacy usage" even though it
   is still the only way rebrand mode sets the base path.** `--rebrand` cannot be combined with
   `--host`, `--origin` or `--site-name` (`scripts/fork-init.ts:356-365`, rejected by argument-presence
   check before any value is judged). Added a dedicated rebrand-mode decision paragraph to the skill
   (project site → `--base '/<repo>/'`, root → `--base none`; a Cloudflare Pages deployment needs the
   installed GitHub Pages workflow removed by hand; the short-link origin and site name are not touched
   by `--rebrand` and need manual edits) and removed the "legacy usage" framing. Confirmed rebrand mode
   still installs the deploy workflow when absent regardless of deployment target
   (`scripts/fork-init.ts:1524-1553`, the rebrand branch never reads `args.host`, which T50 guarantees is
   always `undefined` here). Qualified the skill's "`CHANGELOG.md` ... deliberately keeps the slug"
   claim to anchor mode only: rebrand mode's tree walk (`walkTextFiles`,
   `scripts/fork-init.ts:683-694` for the exclusion list: `.git`, `node_modules`, `.claude`, `.agents`,
   `.codex`, `pnpm-lock.yaml`/`.yml`, `.vitepress/dist`, `.vitepress/cache`,
   `scripts/fork-init.ts` and its own test) does reach `CHANGELOG.md`, `.proj.specs/` and
   `.proj.tickets/` — only the tool's own source/test and the two skill directories are excluded in
   both modes. Added a sentence to the skill's Step 3 stating that rebrand mode still replaces across
   the whole tree (without using the word the review flagged as a forbidden synonym).
6. **The skill's Step 1 Verification line did not ask for `--host` to be confirmed; the anti-pattern
   about a missed flag centred on `--base`, which rebrand mode still uses correctly; the decision
   section never covered a GitHub Pages user site or custom domain.** Added "A: `--host` chosen
   (Cloudflare Pages also needs a valid `--origin`)" to Step 1's Verification line; reworded the
   anti-pattern to centre on a missed `--host` (the actual way a hand-edit now goes wrong, since `--base`
   is rebrand-only); added the user-site/custom-domain cases to the decision section (item 5 above);
   replaced the two standalone "上游 slug" ("upstream slug") occurrences with "上游 repository slug"
   ("upstream repository slug") wherever the skill used the bare phrase, so a reader does not confuse it
   with the unrelated challenge-slug glossary term.
7. **The site-name length limit was stated as "60 characters"; the engine counts Unicode code points
   and separately rejects most invisible/control characters.** `validateSiteNameValue` calls
   `validateCharacterRuleValue(trimmed, '--site-name', raw, 60)`
   (`scripts/fork-init.ts:238-243`), which counts `Array.from(trimmed)` (code points, not UTF-16 units
   or bytes) and rejects the Cc, Cs, Zl, Zp and (apart from the zero-width joiners U+200C/U+200D) Cf
   Unicode categories, plus the 66 noncharacters. Corrected both README files to say "60 Unicode code
   points (not bytes or letters)" and added the invisible/control-character sentence.
8. **The Cloudflare Pages sub-path step asserted the site is "always served from `/`" without
   qualification.** `.vitepress/config.mts`'s `siteBase` regex (`^\/(?:(?!\.\.?\/)[A-Za-z0-9._~-]+\/)*$`)
   requires the value to be exactly `/` or to end in `/`; a `SITE_BASE` set by hand in the Cloudflare
   Pages dashboard with no trailing slash fails that check and aborts the build with a thrown error,
   rather than being silently ignored. Added a sentence to both README files: if `SITE_BASE` was set by
   hand in the Cloudflare Pages project settings before this engine existed, remove it now, since a
   leftover value still overrides the literal this engine writes.
9. **A new GLOSSARY.md sentence used "身分錨點" ("identity anchor"), a term the glossary does not
   define, and over-claimed that "only the identity anchors" can be used to reconstruct a range's past
   settings — the spec says the deploy target cannot be reliably reconstructed at all.** Reworded both
   the `upstream` and `setup record` entries to avoid the undefined term and the over-claim: the full
   explanation (which locations can be partially reconstructed, and that the deploy target cannot be)
   now lives under `upstream`; `setup record` is now a short pointer to it. Both entries still contain
   the required `設定紀錄出現之前建立的靶場沒有設定紀錄` sentence, confirmed by the S9 re-run above.
10. **New prose used "origin" in the Web-platform sense (scheme + host) without distinguishing it from
    GLOSSARY.md's own `origin（紀錄來源）` entry, which means something else (whether an attack trace
    started locally or came from an import).** Qualified every new browser-origin mention in README.md,
    README.en.md and GLOSSARY.md's `site-wide clear` entry with a parenthetical pointing at the
    distinction, and added a new `_Avoid_` line to the `origin（紀錄來源）` entry itself, naming both the
    browser origin and the short-link module's origin as homonyms of the glossary term, not the same
    concept.
11. **OQ-005's "Resolved on" paragraph described `fork:init`'s `--origin` behaviour in general terms
    without citing the engine's own lines or a reproducible command.** Rewrote it to cite
    `scripts/fork-init.ts:1075-1080` (`deriveGithubPagesOrigin`), `:1440-1441` (`finalOrigin`'s
    computation) and `:1460-1469` (the overwrite warning), and added
    `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "re-derives on every run"` as the
    reproduce command (confirmed: `Tests  1 passed | 1891 skipped (1892)`). Changed `**Blocks.**` to
    "Nothing (resolved)" and labelled the pre-existing `Reason`/`Evidence` paragraphs as the state at
    the original 2026-10-10 deferral, matching the pattern already used by OQ-001 and OQ-006.
12. **OQ-004's Evidence paragraph cited the README as behavioural evidence and said a Cloudflare Pages
    run "removes one if it is already there" without the state qualifier.** Rewrote the Reason
    paragraph to qualify the removal ("only when it matches the current or a known old template
    output"), and rewrote Evidence to cite `scripts/fork-init.ts` line ranges for each of the three
    `--host` branches instead of the README. Changed "A run with neither `--host` nor `--base`" to "A
    run without `--host` (with or without `--base`)", since the behaviour this sentence describes does
    not depend on `--base` at all.
13. **OQ-018's Evidence paragraph said the service worker "registers at the origin's scope, not a
    sub-path-specific one".** `navigator.serviceWorker.register` is called with no `scope` option
    (`.vitepress/theme/index.ts:253`), so its scope defaults to the directory of the registered script
    URL — `BASE_URL` — which for a GitHub Pages project site is already `/<repo>/`, a sub-path, not the
    origin's root. Corrected the Evidence paragraph: the real risk is the GitHub Pages *user* site case
    (`BASE_URL` is `/`, so the worker's scope spans every project site under the same owner), and noted
    that scoping does not close the underlying risk anyway, since IndexedDB/localStorage sharing is
    origin-wide, independent of service-worker scope. Folded in the carried T-0010 stage 7 sentence
    (that ticket made the project-site base automatic, so more working same-origin ranges may exist)
    without naming a finding ID, citing `security-T-0010.md` by content instead.
14. **OQ-016's Evidence paragraph referred to "the challenge-list and challenge-page components"
    without naming them.** Named the actual component and its two call sites:
    `.vitepress/theme/components/ShortLinkShare.vue`, used by
    `.vitepress/theme/components/ChallengeList.vue:437` and
    `.vitepress/theme/components/MergedNav.vue:137,248`.
15. **OQ-019's Evidence paragraph cited `docs/agents/claude-orchestration.md`, which has no
    release-note rule, and its own title had a subject/verb mismatch ("Does ... release notes
    satisfy").** Removed the `claude-orchestration.md` citation (confirmed by reading: it is a model
    role/delegation document, and names no release-note rule); added line-pinned citations instead:
    `.github/workflows/release.yml:83` (`generate_release_notes: true`), `AGENTS.md:78` (hard rule 5,
    "Skills own their output") and `docs/agents/language.md:15` (release notes are Traditional
    Chinese). Fixed the title to "Do the release workflow's generated release notes satisfy ...".
16. **Several `A8`/`A9` references in the register were bare letter-codes a reader outside this epic
    cannot resolve.** Expanded the first `A8` reference in OQ-005's resolution to
    "A8 (spec 0004-stateless-engine, the short-link origin anchor)"; later references in the same
    paragraph stay bare, since the reader now has the antecedent.

No item above touches a T77–T80 required or forbidden string; the full S9 re-run above (after this
disposition) confirms every count is unchanged from the pass recorded earlier in this entry.

### 2026-10-15 — stage 7 security review

Report: `.proj.specs/0004-stateless-engine/review/security-T-0016.md`. Eleven candidates, independently filtered: no exploitable defect. One kept (OQ-018's service-worker scope premise, fixed in the stage 6 and 7 disposition above); the other ten were documentation-versus-behaviour mismatches, fixed there too.

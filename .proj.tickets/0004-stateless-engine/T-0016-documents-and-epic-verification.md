---
id: T-0016
title: Document the new fork path, and verify a configured range end to end
epic: 0004-stateless-engine
status: todo
blocked_by: [T-0015, T-0011]
---

## Context

README, both fork-init skills, the glossary and the open-questions register still describe the scan, `--base`, and hand-edited short links. The epic's stage 8 must run on its last ticket, where every behaviour exists.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

README and README.en rewrite the fork section, the `fork:init` command row and the Cloudflare sub-path step with T77's strings; both `wxl-fork-init/SKILL.md` change as T78 lists and stay equal by `cmp`; the glossary gains T79's strings and its test passes; the register resolves OQ-005, updates OQ-004 and adds OQ-016 to OQ-019. Stage 8 runs 0004-S7 on this branch's HEAD: the GH and CF exports, every command exiting 0, with T74 and T75 read where S7 says.

## Acceptance criteria

- [ ] T73–T75: the two exports of S7 (stage 8, local)
- [ ] T77: README strings (S9)
- [ ] T78: skill strings and `cmp` (S9)
- [ ] T79: glossary strings and test run (S9)
- [ ] T80: open-questions strings (S9)

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

---
id: T-0025
title: Publishing gate, documents and the epic's stage 8
epic: 0005-create-wxl
status: review
blocked_by: [T-0024]
---

## Context

The last ticket of epic 0005. It makes create-wxl packable and publishable: `prepareDist` carries the
type-stripped engine, the package source record and `LICENSE`; `checkPublish` (X1–X9) refuses a
release that does not match upstream's pushed tag; the `bin` refuses a broken package (CW-E13); CI
runs create-wxl's tests (U3). It writes the documents (Charter U4, READMEs U5, open questions U6–U8,
glossary U10 checks, the rest of U9 — `quality-gates.yml`'s comment on `fork-init-cross-os` and `AGENTS.md`'s repository layout and build-and-test list, which name create-wxl — and the strings of U9 written in T-0019) and runs stage 8 on the packed package
(0005-S4). Publishing to npm is not part of this ticket: the user publishes.

Spec: `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, seams 0005-S2, 0005-S3, 0005-S4;
"Package and publishing", "Upstream configuration", "Stage 8 inputs", "Overridden contracts".

## Deliverable

`npm pack` in the package directory produces a tarball that, run through `npx`, creates working ranges
for both hosts and for `--no-setup` as "Stage 8 inputs" lists; `checkPublish` throws naming each
violated check; the documents carry every listed string.

## Acceptance criteria

- [x] C42: D1 and each of X1–X9 violated (X6 lightweight and annotated, X7 with a symbolic link) → `prepareDist` throws D1 having removed `dist/`; `checkPublish` throws naming the check (AC-19)
- [x] C43: all hold → `dist/source.json` as specified, `dist/fork-init.mjs` imports and parses a valid argv, `LICENSE` copied, `checkPublish` passes (AC-19)
- [x] C45: manifest equal to the listing apart from the four placeholders, each exact; `version` equals the root's; `.gitignore` and lockfile present (AC-20)
- [x] C46: the new CI step with exactly that `run`, after the unchanged existing step; job `if:` unchanged (AC-20)
- [x] C47: each U4–U10 string present (Charter with whitespace collapsed, `stay forkable` absent); the three words absent from the new README subsections (AC-21)
- [x] C48: stage 8 run I's `pnpm test --run` passes; run IV's guard tests report skips (AC-20, AC-22)
- [x] C49: stage 8 runs 0, I, Ib, II, III as "Stage 8 inputs" lists (AC-22)
- [x] C67: the `bin` with `dist/` removed, or with `dist/fork-init.mjs` altered → CW-E13 in the environment's language, exit 1, nothing written (AC-23)

Stage 8 here is 0005-S4, a terminal run of the packed package (OQ-022); `dist/` and the `.tgz` are
removed afterwards.

## 給使用者（zh-TW）

0005 的最後一張：讓 create-wxl 可以打包與發布（帶入去型別的引擎、來源紀錄、LICENSE；發布前檢查 X1–X9；套件壞掉時 `bin` 報 CW-E13；CI 跑 create-wxl 的測試），寫好 Charter、README、開放問題，並用打包後的套件跑第 8 階段的五個情境。npm 發布由你執行，不在這張。

## Comments

### 2026-10-16 — test plan table (approved by the user before the first test)

Drafted by a workflow (one drafting agent, one independent checker that corrected 19 problems) and approved by the user on 2026-10-16 together with T-0020–T-0025 and decisions D1–D12, quoted verbatim: "全部核准".

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0005-S2 | `prepareDist` 在沒有 `stripTypeScriptTypes` 時丟出 D1，而且丟出之前已經移除 `dist/` 與套件的 `LICENSE` 複本 | `create-wxl/test/publish.test.ts` describe `prepareDist`：S2 暫存 git repo fixture（見 Notes），預先放舊的 `create-wxl/dist/stale.txt` 與 `create-wxl/LICENSE`；`module` 傳不含 `stripTypeScriptTypes` 的替身 `{}` | C42 / AC-19 | 紅燈：發布模組還不存在，或 `prepareDist` 尚未 export（import 失敗，或 `TypeError: prepareDist is not a function`）。綠燈：丟出的錯誤帶 D1；`create-wxl/dist/` 整個不存在，`create-wxl/LICENSE` 不存在（是刪除，不只是清空） |
| 0005-S2 | 條件都成立時，`prepareDist` 產出規格寫的 `dist/source.json`、Node 能 import 的 `dist/fork-init.mjs` 與 `LICENSE` 複本，並先清掉舊的 `dist/` | 同上 describe：S2 fixture 一個 commit，`module` 傳真的 `node:module`；預先放 `create-wxl/dist/stale.txt`。以 `child_process.spawn(process.execPath, ['--input-type=module', '-e', …])` 開子行程，用 `pathToFileURL` import 產出的引擎，呼叫 `parseForkInitArgs` 後把結果以 JSON 印到 stdout；`yaml` 經 fixture 的 `create-wxl/node_modules` 連結解析 | C43 / AC-19 | 紅燈：`dist/source.json` 不存在（ENOENT）。綠燈：`source.json` 解析後 `toStrictEqual` `{ repository: UPSTREAM_SLUG, version: <fixture 根 manifest 的 version>, commit: <git rev-parse HEAD>, engineSha256: <dist/fork-init.mjs 位元組的 SHA-256，編碼與 T-0020 step 2 比對用的相同> }`；`dist/fork-init.mjs` 位元組等於測試自己算的 `stripTypeScriptTypes(<scripts/fork-init.ts>, { mode: 'strip' })`；子行程 exit 0，`parseForkInitArgs(['--author=Ada', '--repo=alice/r', '--host=github-pages'])` 回傳的 `author` 為 `Ada`、`repo` 為 `alice/r`、`host` 為 `github-pages`；`create-wxl/LICENSE` 與根目錄 `LICENSE` byte-identical；`dist/stale.txt` 不存在 |
| 0005-S2 | X1–X9 全部成立時 `checkPublish` 通過，lightweight 與 annotated tag 都算 | `publish.test.ts` describe `checkPublish`：用 `buildRelease()`（見 Notes）建好、`prepareDist` 先跑過；`it.each` 兩種 tag；`runGit` 包真的 git（隔離 env），只 stub `ls-remote`；`archive` 用真的 `git archive --prefix=<name>-<HEAD>/ HEAD`（`<name>` 是 `UPSTREAM_SLUG` 的後半）；`npmView` 注入 | C43 / AC-19 | 紅燈：`checkPublish` 尚未 export。綠燈（兩種 tag 都 resolve、不丟錯）：lightweight `v<V>` 在 HEAD，`ls-remote` 只回 `<HEAD>\trefs/tags/v<V>`；annotated `v<V>` 在 HEAD，`ls-remote` 回 `<tag 物件 sha>\trefs/tags/v<V>` 與 `<HEAD>\trefs/tags/v<V>^{}`（plain 行不等於 HEAD，證明有 `^{}` 行時以它為準）。stub 斷言收到的參數正好是 `ls-remote https://github.com/${UPSTREAM_SLUG}.git refs/tags/v<V> refs/tags/v<V>^{}`。`npmView` 回 `[]`（名稱未發布）與回含 whoami 那位維護者的清單，兩種都通過（whoami 的注入方式待 open question 2） |
| 0005-S2 | 缺 `stripTypeScriptTypes` 時 `checkPublish` 失敗並指名 X1 | 同 describe：全部成立的 fixture，只把傳給 `checkPublish` 的 `module` 換成替身 `{}` | C42 / AC-19 | 紅燈：替身被忽略，`checkPublish` 通過。綠燈：丟出的錯誤帶 `X1`，不帶其他任何 X 編號 |
| 0005-S2 | 版本不一致或格式不對時失敗並指名 X2 | 同 describe，`it.each` 經 `buildRelease(mutate)`：(a) `create-wxl/package.json` `version` 改為 `3.0.1`，根 manifest 維持 `3.0.0`；依 Vocabulary，V 取根 manifest，所以 tag 是 `v3.0.0` 在 HEAD；(b) 兩邊都改為 `3.0.0-rc.1`，tag `v3.0.0-rc.1` 在 HEAD，stub 對應 | C42 / AC-19 | 紅燈：版本沒檢查，通過。綠燈：兩例都帶 `X2`，且不帶其他 X 編號（builder 重新 commit、建 tag、跑 `prepareDist`、更新 stub，讓只有 X2 不成立） |
| 0005-S2 | 本機 tag `v<V>` 不存在或不指向 HEAD 時失敗並指名 X3 | 同 describe，fixture 有兩個 commit，`prepareDist` 在 HEAD 跑；`it.each`：沒有 tag；lightweight `v<V>` 在 `HEAD~1`；annotated `v<V>` 在 `HEAD~1`。`ls-remote` stub 回報 HEAD（annotated 時回 plain 行加上 `^{}` 行為 HEAD），讓 X6 成立 | C42 / AC-19 | 紅燈：tag 沒檢查，通過。綠燈：三例都帶 `X3`，且不帶其他 X 編號；判斷依 `git rev-parse v<V>^{commit}`，annotated tag 比的是它指向的 commit（全部成立那列的 annotated tag 物件 sha ≠ HEAD 仍通過，就是對照） |
| 0005-S2 | 工作目錄不乾淨時失敗並指名 X4 | 同 describe，全部成立的 fixture 之後，`it.each`：(a) 新子目錄下的未追蹤檔 `newdir/a.txt`；(b) fixture 的 `.git/config` 設 `status.showUntrackedFiles=no`，再放未追蹤檔 `b.txt`；(c) 改過的已追蹤檔 `CHANGELOG.md`；(d) 已 stage 的變更 | C42 / AC-19 | 紅燈：沒檢查，通過。綠燈：四例都帶 `X4`，且不帶其他 X 編號；(b) 證明用的是 `--untracked-files=all`（少了它，該設定會把未追蹤檔藏起來）。對照：`prepareDist` 寫出的 `create-wxl/dist/` 與 `create-wxl/LICENSE` 被忽略，不算髒（由全部成立那列證明） |
| 0005-S2 | create-wxl 的 `yaml` 不是 exact version、或不等於根 lockfile 解析的版本時，失敗並指名 X5 | 同 describe，fixture 的根 `pnpm-lock.yaml` 是真檔複本，測試從中讀出根 importer 解析的 `yaml` 版本 R（目前是 2.9.0）；`it.each` 經 `buildRelease(mutate)` 改 fixture 的 `create-wxl/package.json`：`yaml` 改為 `^R`；`yaml` 改為 R 的 patch 加一（exact 但不相等） | C42 / AC-19 | 紅燈：沒檢查，通過。綠燈：兩例都帶 `X5`，且不帶其他 X 編號（range 運算子不算 exact；exact 但不等於 lockfile 也不行） |
| 0005-S2 | 上游的 tag 沒推送或不指向 HEAD 時失敗並指名 X6，annotated 時以 `^{}` 那行為準 | 同 describe，本機 tag 在 HEAD，其餘全部成立；`it.each` 換 `ls-remote` stub 的輸出 | C42 / AC-19 | 紅燈：沒檢查，通過。綠燈：四例都帶 `X6`，且不帶其他 X 編號：(a) 空輸出（沒推到上游）；(b) lightweight：只有 plain 行，指向另一個 commit；(c) annotated：plain 行剛好等於 HEAD，但 `^{}` 行指向另一個 commit（有 `^{}` 行時只看它）；(d) annotated：`^{}` 行指向 HEAD 以外的 commit，plain 行是 tag 物件 sha |
| 0005-S2 | 發布版本自己的 archive 違反 entry rule 或 P1–P4 時，失敗並指名 X7 | 同 describe：(a) `archive` 換成回傳測試組好的未壓縮 tar（與真的 `git archive` 同一種格式）：prefix `<name>-<HEAD>/`、pax global `comment` 等於 HEAD、含 P1–P4 需要的檔案，另加一個 symbolic link entry（用 T-0021 的 raw `Header` 輔助函式）；(b) 用真的 `archive`，經 `buildRelease(mutate)` 拿掉 fixture `CHANGELOG.md` 的 `## [Unreleased]` 行 | C42 / AC-19 | 紅燈：archive 沒驗證，通過。綠燈：兩例都帶 `X7`，且不帶其他 X 編號：(a) 規則 1（symlink）；(b) P1 marker 不存在。真的 `git archive` 通過規則 1–5 與 P1–P4 的那一半，由全部成立那列證明 |
| 0005-S2 | `dist/` 或 `LICENSE` 不是對應 HEAD 的那份時，失敗並指名 X8 | 同 describe：`prepareDist` 跑完後由測試改動檔案（都在被忽略的路徑，不影響 X4）；`it.each`：(a) `dist/source.json` 的 `commit` 改成另一個 40 位 hex；(b) `dist/fork-init.mjs` 尾端加一行註解；(c) `create-wxl/LICENSE` 尾端加一個字元 | C42 / AC-19 | 紅燈：沒檢查，通過。綠燈：三例都帶 `X8`，且不帶其他 X 編號（commit ≠ HEAD；`engineSha256` 對不上 `dist/fork-init.mjs`；`LICENSE` 不等於根目錄那份）。前提：`checkPublish` 不會自己重建 `dist/`，重建是 `prepublishOnly` 先跑的 `prepare-dist.mjs` 負責 |
| 0005-S2 | npm 名稱已由別人維護時失敗並指名 X9 | 同 describe，全部成立的 fixture；`npmView` 回 `['someone-else']`，whoami 回報另一個名字（注入方式待 open question 2） | C42 / AC-19 | 紅燈：沒檢查，通過。綠燈：帶 `X9`，且不帶其他 X 編號。會通過的兩種邊界（空清單、清單含 whoami）放在全部成立那列 |
| 0005-S3 | create-wxl 的 manifest 除了四個 placeholder 以外與規格清單完全一致，每個 placeholder 都是規定的值 | `create-wxl/test/upstream-config.test.ts`（T-0021 若已為 C44 建好這個檔，就在同一檔新增 describe）：讀真的 `create-wxl/package.json` 與根 `package.json` | C45 / AC-20 | 紅燈：T-0020 的 manifest 還沒有 `prepack` 與 `prepublishOnly`，比對失敗。綠燈：把清單的 `<V>` 換成根 manifest 的 `version`、三個 `<exact>` 換成實際值後，與實檔 `toStrictEqual`，key 順序也相同；`version` 等於根的 `version`，且符合 `^\d+\.\d+\.\d+$`；`tar`、`yaml`、`vitest` 各自符合 `^\d+\.\d+\.\d+$`（`^`、`~`、`>=` 都不行） |
| 0005-S3 | `create-wxl/.gitignore` 列出四項，lockfile 有被追蹤 | 同檔：讀 `create-wxl/.gitignore`；跑 `git ls-files create-wxl/pnpm-lock.yaml create-wxl/.gitignore`（git 用隔離 env） | C45 / AC-20 | 紅燈：T-0020 的 `.gitignore` 若缺 `LICENSE` 或 `*.tgz` 就會失敗；四項都已存在時這列沒有紅燈，記為特性測試，先暫時刪掉一行確認會紅再還原。綠燈：有獨立的行 `dist/`、`node_modules/`、`LICENSE`、`*.tgz`；`git ls-files` 印出兩個路徑 |
| 0005-S3 | cross-OS job 在既有測試步驟之後新增一個步驟，`run` 完全一樣；既有步驟與 job 的 `if:` 都沒變 | 同檔：用 `yaml` 解析 `.github/workflows/quality-gates.yml`，取 `jobs['fork-init-cross-os']` | C46 / AC-20 | 紅燈：找不到名為 `Run create-wxl tests` 的步驟。綠燈：既有步驟 name 仍是 `Run fork-init and upstream-guard tests`，`run` 仍是 `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts`；新步驟 name 為 `Run create-wxl tests`，`run` 正好是 `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test`，index 大於既有步驟；`if:` 等於用 `UPSTREAM_SLUG` 兩半組出的 `github.repository == format('{0}/{1}', '<owner>', '<name>')` |
| 0005-S3（U3 指定的檔案） | U3：`upstream-only-jobs.test.ts` 也釘住新步驟的 `run` | `tests/unit/workflows/upstream-only-jobs.test.ts` 的 `fork-init-cross-os (T72)` describe 新增一個 `it`（既有 `it` 不改） | C46 / AC-20 | 紅燈：`runSteps` 不含新指令。綠燈：`runSteps` 含 `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test`；既有 `toContain` 那個 `it` 照樣通過，`git diff` 只見新增 |
| 0005-S3 | U4：Charter 的 Serves 行與 Must bullet 逐字出現，`stay forkable` 不再出現 | `upstream-config.test.ts` describe `U4–U10`：讀 `AGENTS.md`，把連續空白收成一個空白後用 `includes` 比對（等同 `grep -F`） | C47 / AC-21 | 紅燈：目前的 Serves 行是 `teachers who fork it into a range of their own`，比對失敗。綠燈：含 `- **Serves:** teachers who start a range of their own from it, and their students.`；含完整的 `- **Must:** run entirely in the browser; keep each learner's work on the learner's own machine; stay easy to start and to upgrade: `npm create wxl` (or a fork with `pnpm fork:init`) and a static host (Cloudflare Pages or GitHub Pages) are all a teacher needs, and a range can take in later upstream releases.`；全文不含 `stay forkable` |
| 0005-S3 | U5：`README.md` 的簡介與新小節帶齊規定字串，小節位在 fork 小節之前，整份沒有 `range.json` 範例 | 同 describe：讀 `README.md` 並收空白；小節範圍是從 `### 用 `npm create wxl` 建立靶場` 到下一個 `##`／`###` 標題 | C47 / AC-21 | 紅燈：找不到小節標題。綠燈：`## 簡介` 段含 `或執行 `npm create wxl``；小節位在 `## 部署` 之後、`### fork 之後：改寫專案身分` 之前；小節含 `npm create wxl <資料夾>`、`pnpm create wxl <資料夾>`、`npm create wxl <資料夾> -- --no-setup`、`Node.js >= 22.6`、`range.json`、`設定紀錄`、`作者`、`GitHub repository`、`部署主機`、`網站網址`、`網站名稱`；整份檔案沒有符合 `"upstream"\s*:` 的字串 |
| 0005-S3 | U5：`README.en.md` 的簡介與新小節帶齊規定字串，整份沒有 `range.json` 範例 | 同 describe：讀 `README.en.md` 並收空白；小節範圍從 `### Create a range with `npm create wxl`` 到下一個 `##`／`###` 標題 | C47 / AC-21 | 紅燈：找不到小節標題。綠燈：`## Overview` 段含 `or run `npm create wxl``；小節含 `npm create wxl <folder>`、`pnpm create wxl <folder>`、`npm create wxl <folder> -- --no-setup`、`Node.js >= 22.6`、`range.json`、`setup record`、`author`、`GitHub repository`、`host`、`site address`、`site name`；整份檔案沒有符合 `"upstream"\s*:` 的字串（U5 沒規定英文小節的位置，不斷言） |
| 0005-S3 | U5／U10：README 用了「設定紀錄」，同一變更拿掉 GLOSSARY 設定紀錄詞條的 `_新造詞_` 行 | 同 describe：讀 `GLOSSARY.md`，取 `**setup record（設定紀錄）**:` 到下一個詞條之間；另跑既有的 `tests/unit/site/glossary.test.ts`（body 不改） | C47 / AC-21 | 紅燈：詞條仍有 `_新造詞_:` 行。綠燈：詞條裡沒有以 `_新造詞_` 開頭的行；既有詞彙表測試從另一邊守住同步：README 先用了這個詞、詞條卻沒改時，「declares 「設定紀錄」 to be coined, but that term already occurs」會紅；反過來詞條拿掉了、README 卻沒用到這個詞時，corpus 規則會紅 |
| 0005-S3 | U6–U8：三個開放問題的標題逐字出現，條目內容帶有規定的 epic 編號 | 同 describe：讀 `.proj.specs/OPEN-QUESTIONS.md`，逐行比對標題；每個條目的範圍是從標題到下一個 `## OQ-` 標題 | C47 / AC-21 | 紅燈：目前最後一筆是 OQ-019。綠燈：有一行正好是 `## OQ-020 — When do the settings half of the setup record and the setup page land?`，一行正好是 `## OQ-021 — Do `npm create wxl -- <flags>` and `pnpm range:upgrade` work through the registry on the npm and pnpm versions teachers use?`，一行正好是 `## OQ-022 — Is a terminal run of the packed package adequate stage 8 for create-wxl?`。另外（依 U6／U8 的描述加上，AC-21 只要求標題）：OQ-020 條目含 `0006`、`0007`、`0008`、`0004`；OQ-022 條目含 `0005`、`0006` |
| 0005-S3 | U9（本 ticket 新寫的部分）：`quality-gates.yml` 對 `fork-init-cross-os` 的註解提到 create-wxl 的測試；`AGENTS.md` 的 repository layout 列出 `create-wxl/`，build-and-test 清單寫出 `pnpm --dir create-wxl test` | 同 describe：讀 `quality-gates.yml` 原始文字（註解解析後會消失），取 `fork-init-cross-os:` 之後、`if:` 之前的註解行；讀 `AGENTS.md` 的 `## Repository layout` code block 與 `## Build and test commands` 段 | C47 / AC-21 | 紅燈：三處都還沒提到 create-wxl。綠燈：job 註解含 `create-wxl`；layout block 有一行以 `create-wxl/` 開頭；build-and-test 段含 `pnpm --dir create-wxl test` |
| 0005-S3 | U9（T-0019 寫的部分）：引擎開頭註解與兩份 `wxl-fork-init` skill 帶有記下的字串，兩份 skill byte-identical | 同 describe：讀 `scripts/fork-init.ts` 開頭的 block comment、`.claude/skills/wxl-fork-init/SKILL.md`、`.agents/skills/wxl-fork-init/SKILL.md` | C47 / AC-21 | 預期沒有紅燈：T-0019 已經寫入，這列是特性測試，先暫時改掉一個字確認會紅再還原。綠燈：引擎註解含 `create-wxl (the npm package, 0005-create-wxl) carries a type-stripped copy of this file` 與 `range.json (create-wxl's setup record) is never rewritten in B mode`（取單行子字串：續行開頭的 ` * ` 收空白後仍會擋在中間，跨行的字串接不起來）；兩份 skill 都含 `根目錄的 `range.json`（create-wxl 建立靶場時寫入的設定紀錄）是例外：兩種模式都不會改寫它`、`屬於預期結果，不代表殘留未處理`、`不要手動改掉 `range.json` 的 `upstream.repository``；兩份 skill 位元組相等 |
| 0005-S3 | U10：詞彙表四個詞條帶有規定的句子與 `_Avoid_` 行 | 同 describe：讀 `GLOSSARY.md`，分別切出上游、設定紀錄、開發模組、原廠靶場四個詞條 | C47 / AC-21 | 預期沒有紅燈（T-0019 與 stage 1 已寫入），屬特性測試，暫時改字確認會紅再還原。綠燈：上游與設定紀錄都含 `設定紀錄出現之前建立的靶場沒有設定紀錄`；開發模組與設定紀錄各有一行以 `_Avoid_: 【舊義】` 開頭；設定紀錄含 `目前只有建立靶場的指令會寫入它` 與 `開發模組照它套用設定是之後的事`；原廠靶場有一行 `_Avoid_` 含 `上游自己的「尚未被設定」檢查`（字串取自目前檔案，見 Notes） |
| 0005-S3 | C47 的子句「新 README 小節裡不出現那三個詞」 | 同 describe，切出兩份 README 的新小節 | C47 / AC-21 | 待使用者決定（open question 1）。(A)：不寫這個測試，記為 revision 2.1 漏刪的舊子句。(B)：新小節不含 `原廠靶場`、`開發模組`（英文小節不含 `pristine range`、`dev module`）；紅燈是暫時加入其中一個詞時會失敗。決定之前不寫這個測試 |
| 0005-S1（bin 入口） | `dist/` 載入不了或引擎被改過時，`bin` 用環境語言印 CW-E13、exit 1、什麼都不寫；參數錯誤仍優先報 CW-E02 | `create-wxl/test/bin.test.ts`：把 `create-wxl/{bin,src,package.json}` 複製到暫存套件目錄，`node_modules` 連到真的 `create-wxl/node_modules`（Windows 用 junction），`dist/` 由 `prepareDist` 在 S2 fixture 上建好（fixture 根 manifest 的 version 等於真的 create-wxl version）再複製過去；以 `child_process.spawn(process.execPath, [bin, …argv])` 執行，cwd 是另一個空的暫存目錄；env 只有 `PATH`、`HOME`（Windows 另加 `SystemRoot`）與語言變數；`it.each` 情境 × 語言；文字比對 src 的訊息表 | C67 / AC-23（對照 AC-2、step 2） | 紅燈：沒有 `dist/` 時，bin 以未接住的 ENOENT／`ERR_MODULE_NOT_FOUND` stack 結束，不是 CW-E13。綠燈三種情境，argv 都是 `s8 --no-setup`：(a) 整個 `dist/` 刪掉；(b) `dist/fork-init.mjs` 尾端加一行合法註解（雜湊對不上，走 run 的 step 2）；(c) `dist/fork-init.mjs` 改成語法錯誤（import 失敗，走 bin 自己的 catch）。各在 `LANG=zh_TW.UTF-8` 與 `LANG=en_US`（`LC_ALL`、`LC_MESSAGES` 未設）下跑：stderr 以 `CW-E13` 開頭，文字等於對應語言訊息表的 CW-E13，含 `npm create wxl@latest`；exit code 1；cwd 的目錄列表與執行前相同（沒有 `s8`、沒有 `.create-wxl-*`），套件目錄的 `dist/` 也沒被改動。另有三個對照：(d) `dist/` 完整、argv 的目標是 cwd 裡一個既有檔案 → CW-E04 而不是 CW-E13（證明 (b) 確實是雜湊檢查造成的，而且沒有連網）；(e) (a) 的 `dist/` 再加 `--bogus` → CW-E02 而不是 CW-E13（AC-2：參數錯誤在任何 CW-E13 之前）；(f) `LANG=zh_TW.UTF-8` 下 (a) 與 (c) 加 `--lang en`，bin 自己印的 CW-E13 仍是 zh-TW（step 2：用環境語言） |
| 0005-S4 | Stage 8 run 0：打包後的 tarball 帶有引擎、來源紀錄、LICENSE 與 bin | macOS 終端機，本 ticket 已 push 的 HEAD：在 `create-wxl/` 裡跑 `pnpm install --frozen-lockfile`、`npm pack`（由 `prepack` 建出 `dist/`），然後跑 `tar -tzf <tarball>` | C49 / AC-22 | 不是 red/green，只記錄實際輸出。通過：列表含 `package/LICENSE`、`package/dist/source.json`、`package/dist/fork-init.mjs`、`package/bin/create-wxl.mjs`；少一個就算 stage 8 不通過 |
| 0005-S4 | Stage 8 run I：互動模式建出 GitHub Pages 靶場，只有一個 commit、檔案清單正確，能 install、build、test，標題與網址寫進建置結果，而且這個靶場不算上游 | 空暫存目錄，shell 裡 `GITHUB_REPOSITORY`、`WXL_EXPECT_UPSTREAM` 都未設定；`CREATE_WXL_COMMIT=<HEAD> script -q /dev/null sh -c 'npx --yes <tarball> s8-gh; echo exit=$?'`，stdin 逐行（每行等提示出現或稍微延遲後）送 `Stage Eight`、`wxl-test/s8-gh`、`1`、空行、`S8 GH`、`y`；另用 curl 下載同一個 codeload archive，取 `tar -tzf` 作對照 | C49, C48 / AC-22, AC-20 | 通過：`exit=0`（印出 CW-W04）；`git log --oneline` 只有一行；`range.json` 等於 schema（上游 slug、V、HEAD）；`git ls-files` 等於 archive 的檔案（去掉 prefix 與目錄）加上 P4 的 `range.json` 與引擎裝的 workflow；`pnpm install && pnpm build && pnpm test --run` 都成功（C48）；`.vitepress/dist/index.html` 的 `<title>` 解 entity 後是 `S8 GH`；`.vitepress/dist/` 下有檔案含 `https://wxl-test.github.io/s8-gh` |
| 0005-S4 | Stage 8 run Ib：在 S1 按 Ctrl-C 會結束執行，什麼都不留 | 同一暫存目錄，`CREATE_WXL_COMMIT=<HEAD>`，`(sleep <等 S1 提示出現的秒數>; printf '\003') \| script -q /dev/null sh -c 'npx --yes <tarball> s8-int; echo exit=$?'`（或用 expect 等到 S1 提示再送） | C49 / AC-22 | 通過：S1 的提示已經印出後才送 `0x03`（記下終端機輸出作證明；如果提示出現之前就送達，預設的 SIGINT 也會得到 130，這種結果不算數）；`exit=130`；沒有 `s8-int`；目錄裡沒有任何 `.create-wxl-*` |
| 0005-S4 | Stage 8 run II：用旗標非互動建出 Cloudflare Pages 靶場 | `CREATE_WXL_COMMIT=<HEAD> npx --yes <tarball> s8-cf --author 'Stage Eight' --repo wxl-test/s8-cf --host cloudflare-pages --origin https://s8-cf.pages.dev --site-name 'S8 CF' </dev/null; echo exit=$?` | C49 / AC-22 | 通過：`exit=0`；`range.json` 等於 schema；`pnpm install && pnpm build` 之後 `<title>` 是 `S8 CF`，`.vitepress/dist/` 下有檔案含 `https://s8-cf.pages.dev`；沒有 `.github/workflows/deploy.yml` |
| 0005-S4 | Stage 8 run III：`--no-setup` 只產出原廠靶場 | `CREATE_WXL_COMMIT=<HEAD> npx --yes <tarball> s8-raw --no-setup </dev/null; echo exit=$?` | C49 / AC-22 | 通過：`exit=0`；沒有 `.git`；`range.json` 等於 schema；`package.json` 的 `version` 是 `0.1.0`；`CHANGELOG.md` 最後一行是 `## [Unreleased]` |
| 0005-S4 | Stage 8 run IV：靶場的 manifest 仍指向上游，但因為有 `range.json` 不算上游，guard 的 upstream-only 測試會被略過 | 在 `s8-raw` 裡（`GITHUB_REPOSITORY`、`WXL_EXPECT_UPSTREAM` 都未設定）：`git init && pnpm install && pnpm exec vitest run tests/unit/scripts/upstream-guard.test.ts` | C48 / AC-20, AC-22 | 通過：exit 0，vitest 摘要的 skipped 數 > 0（`deploy template hash pin (upstream only)` 與 `real tree (upstream only)` 兩個 describe 被略過）；有任何失敗，或 skipped 為 0，就算不通過 |

**Notes**

- 需要核准的既有測試覆寫：預期沒有。`tests/unit/workflows/upstream-only-jobs.test.ts` 只新增一個 `it`，既有的 `toContain` 不動。下列既有測試 body 不改，但會跟著本 ticket 的改動一起跑，而且會擋下錯誤：`tests/unit/site/glossary.test.ts`（設定紀錄的新造詞宣告與 README 用詞要同步；`原廠靶場`、`開發模組` 仍宣告為新造詞，README 不能使用）；`tests/unit/scripts/upstream-guard.test.ts` 的 real tree「the guard finds no violation among the tracked files」（掃描 `create-wxl/**`、README、`AGENTS.md`，任何地方拼出上游 slug 都會紅，所以測試與程式一律 import `UPSTREAM_SLUG`）；`fork-init.test.ts` 與 upstream pristine check 讀 README 的 A2／A3 錨點（改 README 時不能動到錨點）。唯一可能的例外：如果 T-0020 或 T-0021 有 create-wxl 測試把 manifest 釘成沒有 `prepack`／`prepublishOnly`，或釘住 `.gitignore` 的內容，那段 body 就得改，要另外送核准。
- S2 fixture：暫存 git repo，放根 `package.json`、`create-wxl/package.json`、兩份 `.gitignore`、`LICENSE`、`scripts/fork-init.ts`、`pnpm-lock.yaml`、`CHANGELOG.md`、`.proj.specs/OPEN-QUESTIONS.md` 的真檔複本。git 用隔離的 `HOME`、`XDG_CONFIG_HOME`、`PATH`，加上 `GIT_CONFIG_NOSYSTEM=1`；commit 與 annotated tag 用 `-c user.name=… -c user.email=…` 帶身分。輔助函式 `buildRelease(mutate?, { tag: 'lightweight' | 'annotated' | 'none', at })` 依序做：mutate、commit、建 tag、`prepareDist`，再把 `ls-remote` stub 設成回報新的 HEAD（annotated 時回 tag 物件 sha 加上 `^{}` 行）。這樣每個違規列只破壞一個 X，斷言才能寫成「只帶這一個 X 編號」，不管 `checkPublish` 是遇到第一個失敗就停還是收集全部失敗都成立。
- S2 的陷阱：fixture 的 `create-wxl/node_modules` 是連到真實 `create-wxl/node_modules` 的連結（Windows 用 junction）。`.gitignore` 的 `node_modules/` 只匹配目錄，匹配不到連結，連結會變成未追蹤檔，「全部成立」那列會被 X4 弄紅。所以 fixture 要在 `.git/info/exclude` 寫 `node_modules`（不加斜線），不必改任何追蹤檔。根 `.gitignore` 的 `dist/` 也會忽略 `create-wxl/dist/`；`create-wxl/LICENSE` 只靠 `create-wxl/.gitignore` 忽略。
- 其他 fixture：`ls-remote` stub 組出 `<sha>\trefs/tags/v<V>` 與 `<sha>\trefs/tags/v<V>^{}` 兩行，並斷言收到的參數。真的 `git archive` 輸出的是帶 pax global `comment`（等於 commit）的未壓縮 tar，跟 codeload 的 tar.gz 不同；X7 的 `archive` 回傳值採同一種格式，由 `checkPublish` 決定要先 gzip 再丟給 T-0021 的 parser，還是讓 parser 直接接受未壓縮 tar。`<name>` 取 `UPSTREAM_SLUG` 的後半。module 替身就是 `{}`。產出的引擎一律在 `process.execPath` 子行程裡 import（用 `pathToFileURL`），證明「Node imports」，也避開 vitest 的轉換與 ESM cache。bin 測試要有暫存套件目錄（複製 `bin/`、`src/`、`package.json`，`node_modules` 用連結，`dist/` 由 `prepareDist` 建）。
- Windows 與 root：S2、S3 與 bin 測試都不檢查 mode，也不把父目錄設成唯讀，所以都不用略過。U3 會在 Windows 跑這些測試，連結要用 junction，spawn 用 `process.execPath`，bin 測試的 env 保留 `SystemRoot`。`module.stripTypeScriptTypes` 從 Node 22.13 起才有，CI 的 Node 22 那一列跑的是最新的 22.x。
- 對前面 ticket 的假設（T-0020）：已經有 `create-wxl/` 骨架（manifest 只差兩個發布 script，另有 `.gitignore`、lockfile、vitest）、`run`、兩種語言的 CW-E13 訊息；C50 的 step 2 檢查也已完成，`engineSha256` 的編碼由它決定，本 ticket 的 `prepareDist` 照用同一種（預期 lowercase hex）。`bin/create-wxl.mjs` 已經存在並傳入真實值；如果它還不會載入 `dist/`、接不住載入失敗，或在解析 argv 之前就報 CW-E13，就由本 ticket 補上，C67 驗的正是這一段。
- 對前面 ticket 的假設（T-0021 到 T-0024）：T-0021 export 了 entry rule 驗證與 P1–P4，供 `checkPublish` 的 X7 直接重用；T-0021 也提供 tar fixture 的 raw `Header` 輔助函式、U1 的 `.gitattributes`，以及 C44 的上游設定測試檔（C45–C47 在同一檔加 describe；沒有的話就開 `create-wxl/test/upstream-config.test.ts`）。T-0022 把引擎接好；T-0023 的真實 git runner 已經隔離環境；T-0024 有只看環境變數的語言選擇函式（bin 印 CW-E13 時用），也處理了 readline 的 `SIGINT`（run Ib 靠它）。
- 對 seam 的假設：`prepareDist({ root, module })` 沒有注入 `runGit`，所以 step 4 的 `git rev-parse HEAD` 是函式自己在 `root` spawn git，測試只能透過 process env 影響它；這個指令不需要 git 身分。V 依 Vocabulary 取根 manifest 的 `version`（X3、X6 的 tag 名稱都用它）。`checkPublish` 不會自己重建 `dist/`，重建由 `prepublishOnly` 先跑的 `prepare-dist.mjs` 負責。
- 對 T-0019 的假設：U9 的引擎註解與兩份 skill 字串已經寫入，所以那兩列預期沒有紅燈，記為特性測試。U10 沒有規定固定字串，這份計畫取 GLOSSARY 現在的內容（T-0019 的 stage 6 已經審過）並把它們釘住，不是新需求。
- 本 ticket 新增：`src/` 裡 export 的 `prepareDist` 和 `checkPublish`；`create-wxl/scripts/prepare-dist.mjs` 和 `check-publish.mjs`（`prepack` 與 `prepublishOnly` 會呼叫）；manifest 補上兩個 script；U3 到 U9 的文件改動；必要時補完 bin 的 `dist/` 載入。改完 `AGENTS.md` 後跑 `python3 scripts/verify-project.py`。C45 的「exact」解讀成：把 placeholder 換成實際值之後，連 key 順序都要相等。
- 尚未覆蓋的缺口：`check-publish.mjs` 的真實接線（真的 `git ls-remote`、`npm view create-wxl maintainers --json` 遇到 404 時轉成空清單、whoami）在使用者發布之前不會被執行到。建議（不在 Stage 8 inputs 裡，要不要做由使用者決定）：stage 8 時對還沒打 tag 的 HEAD 跑一次 `node create-wxl/scripts/check-publish.mjs`，預期 X3 失敗而不是 crash。這只讀遠端、不寫任何東西。
- Stage 8 的驗證面（0005-S4）：本機 macOS 終端機，不開瀏覽器（OQ-022 覆寫 preview deployment 規則；hard rule 4 要求的驗證面在此聲明）。前提：本 ticket 的 HEAD 已經 push 到上游 GitHub（codeload 才抓得到 `CREATE_WXL_COMMIT`，push 要使用者同意，見 open question 3）；要能連網（codeload 與 npm registry，`npx` 要裝 `tar`、`yaml`）；本機要有 Rust 和 `wasm-pack`（`pnpm build` 用）；所有 run 都在 `GITHUB_REPOSITORY`、`WXL_EXPECT_UPSTREAM` 未設定的 shell 裡跑。互動模式透過 `script -q /dev/null sh -c '…; echo exit=$?'` 記下 exit code（macOS 的 `script` 不一定會把子行程的 exit code 傳出來）；run I 逐行延遲送輸入；run Ib 等 S1 提示出現後才送 `0x03`。每個 run 的指令、exit code、終端機文字和讀到的值都記進 ticket。跑完刪掉 `create-wxl/dist/`、`create-wxl/LICENSE`、`.tgz` 與暫存目錄。npm 發布不在本 ticket，由使用者執行。

**Not covered by a test**

- C47 的子句「新 README 小節裡不出現那三個詞」：traceability 沒有列出是哪三個詞，而 revision 2.1 的 U5（disposition-2 K-6）要求小節含「設定紀錄」，跟這個子句衝突。等使用者在 open question 1 決定後才寫測試；C47 其他字串都已涵蓋。

**Decisions applying to this ticket (approved 2026-10-16)**

- D3: CW-E and CW-W messages go to `stderr`; next-step lines go to `stdout`; tests pin the stream.
- D11: C47's "three words" clause is a leftover from revision 2 that revision 2.1 superseded (K-6); no test for it; the glossary tests already guard the coinages.
- D12: `checkPublish` gains an injected `npmWhoami`; X9 compares the maintainer names before ` <`, trimmed.
- Stage 8 pushes this ticket's branch before the terminal runs (pre-authorisation 3 covers the push).

### 2026-10-17 — increment plan confirmed

The executor's increment plan was checked by an independent reviewer (approve with corrections). Confirmed with these corrections: the `bin` and the manifest's `bin` and `files` are created by this ticket (T-0020 left them out); when `dist/` cannot be loaded the `bin` still lets argument errors come first, passing `source: null` to `run` so step 2's order holds (control (e): CW-E02, not CW-E13), and the engine hash check stays in `run`'s step 2; row 3 only exports `checkPublish` with the one `ls-remote` call the stub asserts, each X check arriving in its own row; row 3 asserts the exact `ls-remote` arguments, an annotated tag whose plain line differs from HEAD, and `npmView` returning `[]` or a list holding the `npmWhoami` maintainer; X7 gzips `git archive`'s output for `parseArchive`, applies P1–P4 in a temporary directory removed afterwards, and maps `ArchiveParseError`, `ArchiveRuleError` and `PristineError` to X7; OQ-020 to OQ-022 are full entries in the file's template with the numbers the table asserts; C45 compares key order (`JSON.stringify`), with `bin` after `type` and scripts in the order `prepack`, `prepublishOnly`, `test`; X5 reads the root lockfile's importer from all three dependency sections, without pnpm's peer suffix; each X maps its own failures to its id and never crashes (X3 with `git rev-parse --verify --quiet refs/tags/v<V>^{commit}`; X8 for a missing or invalid `source.json`), and messages carry the id; characterisation rows 14, 23, 24 are confirmed by a one-off edit that turns them red, restored at once; the README sections avoid the glossary's still-coined terms (原廠靶場, 開發模組) and README.en.md places its section as README.md does; the `bin` passes every dependency traceability lists (TTY-based `interactive`, `env`, `cwd`, `nodeVersion`, locale, version, `source`, the engine's exports, `engineFile`, a fetch-based fetcher, `120000`, `createSpawnGitRunner()`, `node:fs/promises`, `process`, a no-op checkpoint) and ends with `process.exitCode`; `prepareDist` uses the injected `module.stripTypeScriptTypes`, lowercase hex, and takes `UPSTREAM_SLUG` from the produced `dist/fork-init.mjs`; `check-publish.mjs` maps `npm view`'s 404 to `[]` and normalises a single maintainer to a list; stage 8 removes `create-wxl/dist/`, `create-wxl/LICENSE`, the `.tgz` and temporary directories afterwards, and needs Node ≥ 22.13 locally; the final checks include the prose audit on the changed Markdown files.

Decided under "follow the recommendations" (2026-10-17): (1) test files are `.mjs` (`publish.test.mjs`, `bin.test.mjs`, `upstream-config.test.mjs`), a deviation from the approved table's `.ts`, which vitest would not collect; S3 goes into a new `upstream-config.test.mjs`; (2) stage 8 runs `check-publish.mjs` once on the untagged HEAD and expects X3, not a crash; (3) the branch is pushed before stage 8 under pre-authorisation 3, by the main session.

Started on 2026-10-17 from T-0024's branch tip while PR #30 was in CI with auto-merge on; the branch was moved onto `main` (`af5c948`, a soft reset to the identical tree) after #30 landed, before the first commit.

### 2026-10-17 — red → green log (rows 1–26; stage 8 follows separately)

Each test was written and run before its production code or document change, except where a row below says no red. Row 26's `bin` was written in one change after its red (the missing `bin/` folder, not the `dist/` loading failure the table predicts), since every case needs the same loader; a deviation from one test per cycle, accepted under the user's standing instruction 「剩下的都先同意建議，推進實作」. Rows 14, 23 and 24 are characterisation tests: green at once, then confirmed by a one-off edit that turned each red, restored at once (`git diff` clean apart from row 20's deletion). Row 16 had no red because row 15 had already added the step. The test helper `publish-fixture.mjs` first left its isolated `HOME` folders behind; the executor fixed that outside any row and removed the leftovers.

Reproduce a row with `pnpm --dir create-wxl exec vitest run test/<file> -t="<pattern>"` (row 16: root `pnpm vitest run tests/unit/workflows/upstream-only-jobs.test.ts`).

| Row | Test file › pattern | Red | Green | Selected |
|---|---|---|---|---|
| 1 C42 (D1) | `publish.test.mjs` › `throws D1 having removed dist/ and LICENSE first` | `Cannot find module '../src/publish.mjs'` | 1 passed | 1 |
| 2 C43 | › `writes source.json, an importable fork-init.mjs and LICENSE` | `ENOENT … dist/fork-init.mjs` | 1 passed | 1 |
| 3 C42 | › `passes when X1-X9 all hold` | `checkPublish is not a function` | 2 passed | 2 |
| 4 C42 X1 | › `fails naming X1` | the `{}` stand-in passed | 1 passed | 1 |
| 5 C42 X2 | › `fails naming X2` | the version was not checked | 2 passed | 2 |
| 6 C42 X3 | › `fails naming X3` | the tag was not checked | 3 passed | 3 |
| 7 C42 X4 | › `fails naming X4` | the working tree was not checked | 4 passed | 4 |
| 8 C42 X5 | › `fails naming X5` | `yaml`'s version was not checked | 2 passed | 2 |
| 9 C42 X6 | › `fails naming X6` | upstream's tag was not checked | 4 passed | 4 |
| 10 C42 X7 | › `fails naming X7` | the archive was not checked | 2 passed | 2 |
| 11 C42 X8 | › `fails naming X8` | `dist/` and `LICENSE` were not compared | 3 passed | 3 |
| 12 C42 X9 | › `fails naming X9` | the npm name was not checked | 1 passed | 1 |
| 13 C45 | `upstream-config.test.mjs` › `C45` (manifest) | the serialised manifests differed | passed | — |
| 14 C45 | › `.gitignore` | no red (characterisation; red with `*.tgz` removed, restored) | passed | — |
| 15 C46 | › `C46` | no `Run create-wxl tests` step | passed | — |
| 16 C46 | root `upstream-only-jobs.test.ts` › `create-wxl test run` | no red: row 15 had added the step | passed | — |
| 17 C47 U4 | `upstream-config.test.mjs` › `U4` | the Serves line differed | passed | — |
| 18 C47 U5 | › `README.md` | no `npm create wxl` section | passed | — |
| 19 C47 U5 | › `README.en.md` | no `npm create wxl` section | passed | — |
| 20 C47 U5/U10 | › `設定紀錄` | the record entry's `_新造詞_` line still there | passed | — |
| 21 C47 U6–U8 | › `OQ-020` … `OQ-022` | headings and epic numbers missing | passed | — |
| 22 C47 U9 | › `U9` (this ticket) | no mention of create-wxl in the three places | passed | — |
| 23 C47 U9 | › `U9` (T-0019) | no red (characterisation; red with one character changed, restored) | passed | — |
| 24 C47 U10 | › `U10` | no red (characterisation; red with one character changed, restored) | passed | — |
| 25 C47 | — | not written: D11 (revision 2's leftover clause, superseded by 2.1) | — | — |
| 26 C67 | `bin.test.mjs` | `ENOENT … create-wxl/bin` | 10 passed | 10 |

Checks: `pnpm --dir create-wxl test` → `Test Files 20 passed (20) / Tests 414 passed (414)`; root `pnpm test --run` → `Test Files 127 passed (127) / Tests 4196 passed | 1 skipped`; `python3 scripts/verify-project.py` → PASS; `python3 scripts/prose-audit/run.py` on README.md and AGENTS.md (its default surface; README.en.md, GLOSSARY.md and OPEN-QUESTIONS.md are outside it) → 0 blocking, PASS. `node create-wxl/scripts/check-publish.mjs` on the untagged HEAD reported `checkPublish failed: X3`, exit 1, without crashing (decision 2); `dist/`, `LICENSE` and `.tgz` removed afterwards.

### 2026-10-17 — coverage report table (code rows)

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0005-S2 | `publish.test.mjs` (26 at first; more after stage 6), `publish-io.test.mjs` (added in stage 6) | not measured: no coverage provider is installed in create-wxl | C42, C43 | the two thin scripts (`prepare-dist.mjs`, `check-publish.mjs`) are wiring, run by hand only; the real `npm view`/`npm whoami` |
| 0005-S3 | `upstream-config.test.mjs` (23), root `upstream-only-jobs.test.ts` (1 added) | not measured | C45, C46, C47 | C47's revision 2 clause (D11) |
| 0005-S1 | `bin.test.mjs` (10) | not measured | C67 | the `bin` against a real terminal: stage 8 (C48, C49) |

### 2026-10-17 — stages 6 and 7 disposition

One review workflow on the staged change: Standards (35 findings, S-01–S-35, none high), Spec (28, P-01–P-28, one high), security candidates (11, C-01–C-11) with an independent false-positive filter (no candidate met the threshold). Findings and their full evidence were kept with the run; ids below are that run's.

Fixed (pre-authorisation 2 and "follow the recommendations"), each behaviour fix with a test written and run first:

- P-01 (high): the engine import probe used a bare path as the import specifier, which Windows rejects, so the new cross-OS CI step would have failed on windows-latest; it uses `pathToFileURL(...).href` (red on macOS: the specifier was not a `file:` URL).
- S-06, P-06, P-07, P-09, P-25, S-07, C-10: every X check maps its own failures to its id and never crashes: `dist/` missing or broken, `LICENSE` missing, `source.json` `null` → X8; `git status` failing → X4; `npm whoami` failing → X9 (red: raw `ERR_MODULE_NOT_FOUND`/`TypeError`, X4 not checked).
- S-05, P-08, C-02: `npm view` maps only E404 to an empty maintainer list; any other failure is X9, so an unreachable registry no longer passes the gate (new `src/publish-io.mjs`, red: module missing). P-23: npm runs as `npm.cmd` on win32.
- S-24: `archive()` receives the commit `checkPublish` resolved (no red: written with the rewrite above).
- C-08, P-10, S-27: the `bin` passes `signals: process`, as the dependency list says, so Node's default signal behaviour holds before step 3 and after the run. C-09, P-11, S-26: `main()` failures print CW-E14 in the environment's language. S-03, S-04: the too-old-Node report reuses `node-version.mjs`, `language.mjs` and the message tables through dynamic imports after the version check, including the locale fallback. The first two are pinned by tests that read the `bin`'s source, plus a subprocess run with a broken `package.json`.
- S-10, P-24: `prepareDist`'s `git rev-parse HEAD` filters inherited `GIT_*` (red: an outer `GIT_DIR` made it fail); the fixture env carries `SystemRoot` on win32 (not verifiable on macOS).
- Tests raised to the approved Boundary column, all green without production changes (P-02–P-05, P-13, P-14, P-26, S-11–S-14, S-29).
- Cleanup and documents: shared `spawnCapture` with UTF-8 decoding (S-08, S-09); comments and sources (S-02, S-21, S-22, S-31); `bin.test.mjs` cases as one table (S-28, partly: `publish.test.mjs` keeps its try/catch style); `makeTmpRoot(prefix)` (S-30); executable scripts and one-line explanations per check id (S-33); `prepareDist` returns the engine's `UPSTREAM_SLUG`, removing the test's copy of production logic (S-23, partly: `checkPublish` still imports the engine itself, so "dist missing → X8" stays testable); AGENTS.md's create-wxl line with the install step and Node ≥ 22.13 (S-32, P-27); README sections use 資料夾, read as two paths, show the non-interactive form and say the command works once `create-wxl` is published to npm (S-18–S-20); OQ-020–022 evidence and reason corrected (P-18, P-19, S-17).

Recorded, not changed:

- S-01, P-16: status set to `review` and C42, C43, C45–C47, C67 ticked on entering stage 6 (late, found by this review); C48, C49 wait for stage 8.
- S-15, P-15: the log's opening wording corrected for rows 16 and 26; row 26's single change is a deviation accepted under the user's standing instruction.
- S-16: no coverage provider in create-wxl, as for T-0020–T-0024.
- S-34: the checks array is the approved interface.
- P-12: the `bin` reaches CW-E13 by passing `source: null` to `run`, so step 2's order (argument errors first) holds; the confirmed increment plan chose this.
- P-17: C47's revision 2 clause is not tested (D11); the new README sections avoid the glossary's still-coined terms instead.
- P-20: the prose audit's surface covers README.md and AGENTS.md only; README.en.md, GLOSSARY.md and OPEN-QUESTIONS.md are outside it.
- P-21: the Deliverable's "names the violated check" is read as fail-fast: the first violated check is named.
- P-22: traceability's D2 lists `prepublishOnly` as the checks while revision 2.1 has it build `dist/` first (npm runs `prepublishOnly` before `prepack`); the implementation follows 2.1.
- C-01: false positive (the npm name was reserved, spec line 212). C-03 (X4 without `--ignored`: spec literal), C-04 (the engine's top-level code runs before the hash check: the plan's order), C-05 (`ls-remote`'s suffix matching), C-06 (`prepack` rebuilds after X8; `npm publish <tarball>` skips `prepublishOnly`: the spec's design), C-07 (bare `git`/`npm` resolve the cwd first on Windows, in the publisher's own checkout), C-11 (redirects followed: B1 outside the model): out of the model or by design, recorded.

Stage 7 report: `.proj.specs/0005-create-wxl/review/security-T-0025.md`.

Checks after the fixes: `pnpm --dir create-wxl test` → `Test Files 21 passed (21) / Tests 434 passed (434)`; root `pnpm test --run` → `Test Files 127 passed (127) / Tests 4196 passed | 1 skipped`; upstream guard, `upstream-only-jobs.test.ts` and `glossary.test.ts` → `364 passed | 1 skipped`; `verify-project.py` PASS; prose audit PASS on README.md and AGENTS.md.

### 2026-10-17 — stage 8 (0005-S4), partial: blocked by a private upstream

Surface: local macOS terminal (Node 24.13.0, npm 11.6.2, wasm-pack 0.14.0), no browser, `GITHUB_REPOSITORY` and `WXL_EXPECT_UPSTREAM` unset. The branch was pushed at `85fcff2` (pre-authorisation 3) and every run used `CREATE_WXL_COMMIT=85fcff2ecb43daf6b16c4622c6b574096137a56f`.

- **Run 0 — passed.** In `create-wxl/`: `pnpm install --frozen-lockfile`, `npm pack` (`prepack` built `dist/`). `tar -tzf create-wxl-3.0.0.tgz` lists `package/LICENSE`, `package/dist/source.json`, `package/dist/fork-init.mjs`, `package/bin/create-wxl.mjs` (26 files in all). `dist/source.json` records version `3.0.0` and commit `85fcff2…`.
- **Invocation deviation.** npm 11 runs `npx --yes <tarball> …` as a command named by the path (`Permission denied`, exit 126). Every run uses `npx --yes --package <tarball> create-wxl …` instead, which installs the tarball and runs its `bin`.
- **Run Ib — passed.** `expect` waited for the `Author:` prompt (S1) in a pseudo-terminal, then sent `0x03`: `exit=130`; no `s8-int`; no `.create-wxl-*` in the folder.
- **Run II — blocked.** `CW-W04` (override commit), then `CW-E07: downloading "https://codeload.github.com/<upstream>/tar.gz/85fcff2…" failed: the server responded with status 404.`, exit 1. The upstream repository is private (`gh repo view` → `PRIVATE`), and codeload answers 404 to unauthenticated requests for any of its commits (also for `main`'s `af5c948`). create-wxl downloads without credentials, as the spec says (B1).
- **Runs I, III, IV — not run**, for the same reason (III produces the range IV uses).
- `node create-wxl/scripts/check-publish.mjs` on the untagged HEAD: `checkPublish failed: X3 (no local tag v<version> exists at HEAD)`, exit 1, no crash (decision 2). `dist/`, `LICENSE` and the temporary folders were removed afterwards.

C48 and C49 stay unticked until runs I–IV pass (done below).

### 2026-10-17 — stage 8 (0005-S4), completed

The user made the upstream repository public on 2026-10-17; codeload then answered 200 for `85fcff2`. Runs II, III, IV and I were run with the same tarball, invocation (`npx --yes --package <tarball> create-wxl …`) and `CREATE_WXL_COMMIT=85fcff2…`, in a shell without `GITHUB_REPOSITORY` and `WXL_EXPECT_UPSTREAM`.

- **Run II — passed.** `… create-wxl s8-cf --author 'Stage Eight' --repo wxl-test/s8-cf --host cloudflare-pages --origin https://s8-cf.pages.dev --site-name 'S8 CF' </dev/null`: CW-W04, N1, N3, N4, N6, N7, `exit=0`; `range.json` is the schema (upstream slug, `3.0.0`, `85fcff2…`); no `.github/workflows/deploy.yml`; one commit `Create range from WXL 3.0.0`. `pnpm install --frozen-lockfile` and `pnpm build` succeeded; `.vitepress/dist/index.html` has `<title>S8 CF</title>`; a built chunk contains `https://s8-cf.pages.dev`.
- **Run III — passed.** `… create-wxl s8-raw --no-setup </dev/null`: CW-W04, N1, N8, `exit=0`; no `.git`; `range.json` is the schema; `package.json` `version` is `0.1.0`; `CHANGELOG.md`'s last line is `## [Unreleased]`.
- **Run IV — passed.** In `s8-raw`: `git init`, `pnpm install --frozen-lockfile`, `pnpm exec vitest run tests/unit/scripts/upstream-guard.test.ts` → exit 0, `91 passed | 7 skipped`; the skipped tests are the `deploy template hash pin (upstream only)` and `real tree (upstream only)` describes, and the `WXL_EXPECT_UPSTREAM` check (unset).
- **Run I — passed.** `expect` drove a pseudo-terminal, waiting for each prompt before sending `Stage Eight`, `wxl-test/s8-gh`, `1`, an empty line, `S8 GH`, `y`. The summary showed the derived origin `https://wxl-test.github.io/s8-gh`; CW-W04 (step 6), the engine's `deploy.yml` warning as a JSON literal, N1, N3, N4, N5, N7; `exit=0`. `git log --oneline` has one line; `range.json` is the schema; `git ls-files` equals the codeload archive's files (prefix and directories removed) plus `range.json` and `.github/workflows/deploy.yml`, nothing else. `pnpm install --frozen-lockfile`, `pnpm build` and `pnpm test --run` (`Test Files 127 passed (127) / Tests 4190 passed | 7 skipped`) all succeeded (C48); `<title>S8 GH</title>`; a built chunk contains `https://wxl-test.github.io/s8-gh`.

C48 and C49 ticked. The tarball, the ranges and the temporary folders were removed afterwards; `create-wxl/dist/` and `create-wxl/LICENSE` are absent.


---
id: T-0026
title: Upgrade entry, preconditions and base resolution
epic: 0006-range-upgrade
status: todo
blocked_by: [T-0025]
---

## Context

Epic 0006 lets a teacher take a later upstream release into their range with `pnpm range:upgrade`
(= `npx --yes create-wxl@latest upgrade`). This ticket builds the entry: the `upgrade` grammar, the
git and clean-tree checks, reading the base from `range.json` or `--from`, the no-op, downgrade and
3.0.0-floor checks before and after downloading, and downloading both archives into pristine ranges
with 0005's functions. It stops before planning; T-0027 adds the merge.

Deadline (decision R1, 2026-10-16): if this epic has not landed by 2026-10-16 23:59, this ticket is set
to `pending` with its reason and evidence and ships after the workshop as 3.0.x (decision of
2026-10-16, Q2 option A).

Spec: `.proj.specs/0006-range-upgrade/traceability.md` revision 2, seam 0006-S1; "Command grammar",
"Step order" 1–7, "Base from `range.json`".

## Deliverable

`create-wxl upgrade` in a range refuses, with its UP or CW code and without writing anything, every
case the preconditions exclude; for an upgradable range it resolves base and target, downloads and
builds both pristine ranges, and removes its temporary directories.

## Acceptance criteria

- [ ] U01: `upgrade --from 3.0.0`, `--from <40 hex>`, `--lang en upgrade` → accepted (AC-1)
- [ ] U02: each grammar error of the row → CW-E02, nothing written (AC-1)
- [ ] U03: not a repository / a subdirectory / the root through a symbolic link → UP-E01 / UP-E01 / accepted (AC-2)
- [ ] U04: `runGit` rejects `ENOENT`; git 2.19.0 → UP-E02, exit 1 (AC-2)
- [ ] U05: each unclean case of the row → UP-E03 with its token, exit 1, nothing written (AC-2)
- [ ] U06: valid `range.json` → base = its commit and version (AC-3)
- [ ] U07: absent, no `--from` → UP-E04 (AC-3)
- [ ] U08: absent with `--from <version>` / `--from <commit>` → base from `--from`, version given / from the base archive's manifest (its display in R1 is verified in T-0027, U26) (AC-3)
- [ ] U09: valid + `--from`; other repository + `--from`; unparsable + `--from` → `--from` wins / wins / UP-E06 `not-json` (AC-3)
- [ ] U10: each J1, J3, J4 breakage without `--from` → UP-E06 with the token (AC-3)
- [ ] U11: repository differs / differs only in case → UP-E05 / accepted (AC-3)
- [ ] U12: base commit = target commit → UP-I01, exit 0, no download, nothing written (AC-4)
- [ ] U13: base version > target → UP-E07 before any download (AC-4)
- [ ] U14: equal versions, different commits → with override proceeds past step 7 with CW-W04 / without, UP-I01 (AC-4)
- [ ] U15: either archive rejected, hostile, or lacking a P1/P2 marker → the 0005 code, exit 1, nothing written, no `create-wxl-upgrade-` entry under `tmpRoot` (AC-5)
- [ ] U16: `--from <version>` tag archive `comment` absent or not 40 hex → UP-E08 (AC-5)
- [ ] U30: the root manifest's `range:upgrade` script exactly as specified, checked by a create-wxl test (AC-12)
- [ ] U31: `create-wxl upgrade` takes the upgrade path; `create-wxl <dir>` unchanged (AC-12)
- [ ] U50: base 2.9.9 from `range.json`, and `--from 2.9.9` → UP-E10 before any download (AC-4)
- [ ] U51: `--from <commit>` whose archive version is above / equal-with-target-commit / below 3.0.0 → UP-E07 / UP-I01 / UP-E10 after download, nothing written (AC-4)
- [ ] U52: `--from <version>` resolving to the target's commit → UP-I01, nothing written (AC-4)

## 給使用者（zh-TW）

0006 升級的入口：在靶場裡執行 `create-wxl upgrade`，先檢查 git、工作目錄是否乾淨、從 `range.json` 或 `--from` 找出 base，擋下不用升級、降版、3.0.0 以前的情況，再下載 base 與 target 兩份原廠靶場。這張還不做合併。若 23:59 前沒落地，改為 pending、研習後以 3.0.x 發布。

## Comments

### 2026-10-16 — deadline withdrawn

At 23:39 on 2026-10-16 the user withdrew the 23:59 pending deadline (decision R1, Q2 option A) for this epic: T-0026 and T-0027 are not set to `pending` and are implemented after T-0025, in order. The workshop of 2026-10-17 still uses the fork + `pnpm fork:init` path.

### 2026-10-17 — test plan table (approved by the user before the first test)

Drafted and independently checked by a workflow (two rounds: draft and check, then a revision applying every correction), then approved by the user on 2026-10-17 with the decisions below.


預期紅燈總則：目前 `create-wxl/src/argv.mjs:82`（`if (arg === 'upgrade') throw new ArgvError(arg)`）對任何位置出現的 `upgrade` 都無條件丟出 `ArgvError('upgrade')`，不論前後還有什麼參數。因此下表每一列只要 argv 裡出現 `upgrade`，目前都會在解析階段就先得到 `CW-E02`、token 為 `"upgrade"`（`JSON.stringify` 後的字面值），不會進到任何更晚的程式路徑；下面逐列只在和這個總則不同時才重複寫。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0006-S1 | `upgrade` 文法的五種合法形式都被接受並進入升級路徑，不落在 CW-E02 | 新檔 `create-wxl/test/upgrade-grammar.test.mjs`，`describe('accepted')` 的 `it.each`：`['upgrade','--from','3.0.0']`、`['upgrade','--from','<40 hex>']`、`['--lang','en','upgrade']`、`['upgrade','--lang','en']`（補 AC-1「`--lang` on either side」的另一側）、`['upgrade','--from=3.0.0']`（行內 `=`，依 Q3 決議）；`deps.cwd` 用 `makeTmpRoot()` 建出的非 git 資料夾；`deps.runGit: createSpawnGitRunner()`，`deps.env` 明寫 `{ HOME, PATH: process.env.PATH, XDG_CONFIG_HOME, LANG }`（不可沿用預設全成功 stub，否則「進了 step 3」這個訊號本身未定義） | U01 / AC-1 | 五案皆 exit 1、stderr 以 `UP-E01` 開頭；`deps.fetchArchive` 未被呼叫。預期紅燈：同總則，五案皆為 `CW-E02` token `"upgrade"` |
| 0006-S1 | `upgrade` 文法的每一種錯誤形式都是 `CW-E02`，什麼都不寫，且逐案核對精確 token | 同檔 `describe('rejected')` 的 `it.each`，逐案列出 argv 與預期 token：`['upgrade','--from']`→`--from`；`['upgrade','--from','v3.0.0']`→`v3.0.0`（前導 `v`）；39 碼小寫 hex→該值；41 碼 hex→該值；40 碼含一個大寫字母→該值；`['upgrade','extra']`→`extra`；`['upgrade','--bogus']`→`--bogus`；`['upgrade','--from','3.0.0','--from','3.0.0']`（`--from` 重複）→`--from`；`['upgrade','--lang','en','--lang','en']`（`--lang` 重複）→`--lang`；create-only 參數六個全跑（`--author`、`--repo`、`--host`、`--origin`、`--site-name`、`--no-setup`，各自搭配一個合法值或單獨出現）→對應參數名。`deps.cwd` 同上非 git 資料夾，執行前後對該資料夾 `snapshotTree`；`deps.runGit: createSpawnGitRunner()`（同樣的 env），斷言完全未被呼叫 | U02 / AC-1 | 每案 exit 1、stderr 以 `CW-E02` 開頭並含該案 token；`fetchArchive`、`checkpoint`、`runGit` 皆未被呼叫；資料夾 snapshot 不變。預期紅燈：同總則，每案目前得到的 token 一律是 `"upgrade"`，紅燈只出現在 token 不符上，不是「落在未知參數或第二個 positional 的錯誤路徑」（argv 解析在看到 `upgrade` 當下就終止，後面的參數根本沒被檢查到） |
| 0006-S1 | 不在 git repo、在 range 的子資料夾、透過指向 root 的 symbolic link 三種 location 情況 | 新檔 `create-wxl/test/upgrade-preconditions.test.mjs`。新 helper（待建）建出一個乾淨、已 commit、帶合法 `range.json` 的 fixture range（`upstream.commit` = `deps.source.commit`，no-op 訊號）。三案：`deps.cwd` = 另一個普通資料夾；`deps.cwd` = fixture range 底下的子資料夾；`deps.cwd` = 指向 fixture range root 的 symbolic link 路徑（symlink 放在 fixture range 外面，不污染其工作樹；non-Windows 才跑）。三案都加上 `fetchArchive` 未被呼叫、`snapshotTree` 連 `.git` 一起比對（同時證明 `--no-optional-locks` 沒有副作用） | U03 / AC-2 | 第一、二案 exit 1、`UP-E01`；第三案 exit 0、`UP-I01`（`realpath` 後兩邊相等）。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | `runGit` 無法被 spawn；`git --version` 回報 2.19.0 → `UP-E02`；2.20.0 → 不是 `UP-E02` | 同檔 `describe('git tool')`。ENOENT 案改用真的 `createSpawnGitRunner()`，`deps.env.PATH` 設為空字串（讓 git 真的找不到，比自寫 stub 更貼近 seam 字面：traceability.md:34「a stub rejecting ENOENT for U04」只保留給版本案）；2.19.0 案用既有 `makeGitStub({ version: { code: 0, stdout: 'git version 2.19.0\n', stderr: '' } })`；`deps.cwd` 用合法的 fixture range（上一列的 builder），讓斷言不依賴 step 3 內部檢查順序。新增第三案：`makeGitStub({ version: { code: 0, stdout: 'git version 2.20.0\n', stderr: '' } })` 作為下限邊界的「可接受」對照 | U04 / AC-2 | 前兩案 exit 1、`UP-E02`，訊息帶偵測到的版本（2.19.0 案帶該字串）；第三案不得出現 `UP-E02`（按 fixture 的乾淨狀態應走到 `UP-I01`）。預期紅燈：前兩案同總則，`CW-E02` token `"upgrade"`；第三案目前同樣是 `CW-E02`，不是「被不是 git repo 的檢查蓋掉」 |
| 0006-S1 | 乾淨檢查的八種情況都回報對應的 `UP-E03` token | 同檔 `describe('clean check')` 的 `it.each`，八個子案都用 fixture range builder，commit 之後製造：改過一個 tracked 檔、一個 untracked 檔、一個 staged 變更、尚無 commit（只 `git init`、不 commit）、`git update-index --assume-unchanged`、`--skip-worktree`、手動放一個 `MERGE_HEAD` 檔案，以及全域 `status.showUntrackedFiles=no` 搭配一個 untracked 檔——此案把設定寫進隔離 `HOME` 的 `.gitconfig`（不建 `GIT_CONFIG_GLOBAL` helper，見 Notes），並加一個控制斷言：同一個 env 下、不帶 `--untracked-files=all` 執行 `git status --porcelain` 必須輸出空白，先證明全域設定真的生效，否則「即使實作漏帶 `--untracked-files=all` 仍會綠燈」這個假陽性無法排除。全部用 `createSpawnGitRunner()` 當真的 `runGit`，`deps.env` 明寫 `{ HOME, PATH: process.env.PATH, XDG_CONFIG_HOME, GIT_CONFIG_NOSYSTEM: '1' }`。三案（U03、U04、U05）都加上 `fetchArchive` 未被呼叫、`.git` 一起 snapshot 的前後比對 | U05 / AC-2 | 八案依序得到 `changes`/`changes`/`changes`/`no-head`/`assume-unchanged`/`skip-worktree`/`in-progress`/`changes`（全域設定案仍是 `changes`，因為 `--untracked-files=all` 是明寫在呼叫裡的旗標值，不受全域設定影響）；八案皆 exit 1、`UP-E03` 帶對應 token、什麼都不寫。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | 合法 `range.json` 時，base 真的是它記的 commit 與 version | 新檔 `create-wxl/test/upgrade-base.test.mjs`。`packageVersion`／`source.version` 覆寫為 `3.1.0`（預設 `3.0.0` 是下限本身，不可能存在「比它低又 ≥3.0.0」的 base，見修正 #2），fixture range 的 `range.json` 填 `upstream.version = '3.0.0'`、`upstream.commit` 與 `deps.source`（target）不同；`deps.fetchArchive` 換成以 `ref` 為鍵的 stub（待建，見 Notes），不綁死呼叫順序。這組 fixture 同時覆蓋 3.0.0 下限的「接受」邊界（U50 只測了被拒的那一側） | U06 / AC-3 | `fetchArchive` 某一次呼叫的 `ref` 引數等於 `range.json` 的 `upstream.commit`，另一次等於 `deps.source.commit`。本案只證明「commit 讀對了」；「version 真的被用在下游判斷」由 U13、U50 另外證明。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | 沒有 `range.json`、也沒有 `--from` → `UP-E04` | 同檔，fixture range 不放 `range.json`，不帶 `--from` | U07 / AC-3 | exit 1、`UP-E04`、`fetchArchive` 未被呼叫、repo 的 snapshot 不變。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | 沒有 `range.json`，改用 `--from <version>`／`--from <commit>` 時 base 正確解析 | 同檔，fixture range 不放 `range.json`；`packageVersion`／`source.version` 覆寫為 `3.2.0`（否則預設 `3.0.0` 等於或低於 `--from 3.1.0`，下載前就會先被 `UP-E07` 擋下，`fetchArchive` 永遠不會被呼叫，見修正 #1）。(a) `--from 3.1.0`：`ref` 應為 `refs/tags/v3.1.0`；(b) `--from <40 hex>`：`ref` 應為那個 commit 字面值 | U08 / AC-3 | (a)(b) 皆至少呼叫一次 `fetchArchive`，`ref` 分別等於 `refs/tags/v3.1.0`／該 commit；R1 是否真的印出這個 version 由 T-0027 的 U26 驗證，本案不斷言輸出文字。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | `range.json` 存在但 `--from` 優先，含 J1／J4 在有 `--from` 時仍／不適用 | 同檔 `describe('--from overrides range.json')`：`--from` 用的 version 同樣覆寫 target 版本（理由同 U08）。(a) `range.json` 合法但 `upstream.commit` 與 `--from` 不同→用 `--from` 的，並斷言 `fetchArchive` 的第一個引數等於 `deps.source.repository`，不是 `range.json` 裡那個 repository；(b) `range.json` 的 `upstream.repository` 是另一個字串、帶合法 `--from`→仍用 `--from`（J5 被跳過）；(c) `range.json` 是壞掉的 JSON（例如 `{not json`）、帶合法 `--from`→`UP-E06` token `not-json`（J1/J3 仍適用）；(d) `range.json` 的 `upstream.version` 壞掉（例如 `v3.0.0`）、帶合法 `--from`→仍用 `--from`（J4 被跳過，補 AC-3「only J1 and J3 apply」目前缺的一半）；(e) `range.json` 是指向別處的 symbolic link（J1 違反）、帶合法 `--from`→`UP-E06` token `not-a-file`（J1 在有 `--from` 時仍適用） | U09 / AC-3 | (a)(b)(d)：`fetchArchive` 的 `ref` 等於 `--from` 給的值，不等於 `range.json` 裡的值；(a) 額外斷言 repository 引數；(c)(e)：exit 1，對應 token，`fetchArchive` 未被呼叫。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | 沒有 `--from` 時，J1、J3、J4 各種壞掉的 `range.json` 都回報對應 token，涵蓋 J4 四個欄位各自先壞與邊界值 | 同檔 `describe('J1/J3/J4 failures')` 的 `it.each`，十六個子案：J1——symlink 指向一份「合法」JSON 檔（用來證明實作用 `lstat` 而不是 `stat`，win32 略過）、是一個目錄；J3——帶 BOM、不是合法 JSON、是一個 JSON array、字面 `null`（P2，補 `not-object` 的另一個來源）；J4——缺 `upstream`、`upstream` 不是物件、`upstream.repository` 不是字串（例如數字）、`repository`／`version`／`commit` 三者同時壞、`version`＋`commit` 同時壞（repository 合法）、只有 `commit` 壞（其餘合法）、`version` 邊界值 `v3.0.0`（前導 `v`）與 `3.0`（缺 patch）、`commit` 邊界值 39 碼與含一個大寫字母的 40 碼 | U10 / AC-3 | 十六案依序得到 `not-a-file`/`not-a-file`/`not-json`/`not-json`/`not-object`/`not-object`/`upstream`/`upstream`/`upstream.repository`/`upstream.repository`（三者同時壞時 repository 排最前）/`upstream.version`/`upstream.commit`/`upstream.version`/`upstream.version`/`upstream.commit`/`upstream.commit`；十六案皆 exit 1、`UP-E06` 帶對應 token、什麼都不寫。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | repository 比對：不同字串 → `UP-E05`；只差大小寫 → 視為相同 | 同檔：(a) `range.json` 的 `upstream.repository` 是明顯不同的字串；(b) 是 `UPSTREAM_SLUG`（從 `scripts/fork-init.ts` import）整串大小寫互換的版本，且 `upstream.commit` = `deps.source.commit`（no-op 訊號）。(a) 的訊息斷言用 `jsonValue(...)` 比對兩個 repository 字串（依 `messages.test.mjs:58-65` 的寫法，因為是外部值） | U11 / AC-3 | (a) exit 1、`UP-E05` 帶兩個以 `jsonValue` 跳脫的 repository 字串；(b) exit 0、`UP-I01`。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | base commit = target commit（來自 `range.json` 或 `--from <commit>`）時完全不下載 | 新檔 `create-wxl/test/upgrade-target.test.mjs`：(a) `range.json` 的 `upstream.commit` = `deps.source.commit`；(b) 沒有 `range.json`、`--from <那個 commit>` | U12 / AC-4 | 兩案皆 exit 0、`UP-I01` 帶該 commit/version、`fetchArchive` 完全未被呼叫、repo snapshot 不變。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | base 版本（來自 `range.json`）高於 target 版本 → 下載前就 `UP-E07` | 同檔，`range.json` 的 `upstream.version` 高於 `deps.packageVersion`／`deps.source.version`，commit 不同於 target | U13 / AC-4 | exit 1、`UP-E07` 帶兩個版本、`fetchArchive` 未被呼叫。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | 版本相同、commit 不同：有 `CREATE_WXL_COMMIT` 時可以繼續並真的走過下載；沒有時 `UP-I01` | 同檔：`range.json` 的 `upstream.version` = target 版本、`upstream.commit` ≠ target commit；(a) `deps.env.CREATE_WXL_COMMIT` 設成另一個合法 commit；(b) 不設。(a) 的觀察點改為公開 seam：`deps.checkpoint` 曾以 `step-8`（或對應的下載完成檢查點）被呼叫；`deps.tmpRoot` 底下留有兩個 `create-wxl-upgrade-*` 項目，且其中內容已套用 P1–P4（`CHANGELOG.md` 等於 `CHANGELOG_PRISTINE`、`package.json` 的 `version` 等於 `0.1.0`）；呼叫 `fetchArchive` 的兩個 `ref` 分別是 `range.json` 的 commit（base）與 `CREATE_WXL_COMMIT`（target，不是 `deps.source.commit`）；stdout／stderr 都不出現 `UP-I01`。`run()` 的確切回傳值（exit code）留給 Q1 的決議，本案不斷言 | U14 / AC-4 | (a) `CW-W04` 出現在 stderr，`fetchArchive` 以上述兩個 `ref` 各被呼叫一次，`tmpRoot` 下兩個 `create-wxl-upgrade-*` 都完整套用 P1–P4；(b) exit 0、`UP-I01`、`fetchArchive` 未被呼叫。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | base 或 target 的 archive 任一份被 fetcher 拒絕、惡意、或缺 P1/P2 marker → 沿用 0005 的錯誤碼，什麼都不留 | 同檔 `describe('archive failures')` 的 `it.each`，{base, target} × {fetch 被拒絕或非 200、rule 1 違反（symlink entry）、缺 `CHANGELOG.md`（P1）、缺 `.proj.specs/OPEN-QUESTIONS.md`（P2）} 共八案；重用 T-0021 的 `archive-rules`/`pristine` fixture builder，以 `ref` 為鍵的 `fetchArchive` stub（待建，見 Notes），針對 base 或 target 對應的那一次呼叫回覆相應的錯誤情境 | U15 / AC-5 | 每案 exit 1、stderr 帶對應的既有碼（`CW-E07` 下載失敗、`CW-E08` rule 1、`CW-E10` 缺 P1 或 P2）；比對方式改用 `withoutRootMtime(snapshotTree(tmpRoot))` 前後一致（比只檢查 `create-wxl-upgrade-` 前綴缺席更嚴格）。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | `--from <version>` 的 tag archive 缺 `comment` 或 `comment` 不是 40 碼小寫 hex → `UP-E08`，五種缺陷各自獨立 | 同檔，base 走 `--from <version>`；`packageVersion`／`source.version` 覆寫為高於這個 `--from` 版本（理由同 U08，否則下載前就先被 `UP-E07` 擋下）。五個子案：完全沒有 pax global header；`comment` 是 40 碼但含大寫字母；`comment` 只有 39 碼；`comment` 有 41 碼；`comment` 是 40 碼但含非 hex 字元。tag archive 的 fixture 需用 `buildArchiveRaw` 自組前綴 `<repo>-<version>/`（`test/helpers/archive.mjs:132` 的 `buildArchive` 把前綴寫死成 `<repo>-<commit>/`，對 tag 下載不準；於 Notes 記為共用 helper 的已知簡化，本列避開它） | U16 / AC-5 | 五案皆 exit 1、`UP-E08` 帶該 tag、什麼都不寫。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0005-S3（沿用） | 根目錄 manifest 的 `range:upgrade` script 字面完全等於規格 | 擴充既有檔 `create-wxl/test/upstream-archive.test.mjs`，仿照該檔 U1（第 20–32 行）的寫法新增 `describe('range:upgrade script')`：直接 `readFile` repo 根目錄的 `package.json`（`REPO_ROOT` 已在該檔定義），不經過 `run()` | U30 / AC-12 | `JSON.parse` 後 `scripts['range:upgrade']` 嚴格等於 `'npx --yes create-wxl@latest upgrade'`。預期紅燈：目前根目錄 `package.json` 沒有這個 script |
| 0006-S1 | `create-wxl upgrade` 走升級路徑；`create-wxl <dir>` 的既有行為不變 | 新檔 `create-wxl/test/upgrade-grammar.test.mjs`（同 U01 檔）新增 `describe('dispatch')`：(a) `deps.cwd` 非 git 資料夾、`argv=['upgrade']`、`deps.runGit: createSpawnGitRunner()`（同 U01 的 env）→ 應得到 `UP-E01`（證明走到升級路徑才會有的錯誤，不是回歸防護，是本票的紅燈步驟）；(b) `argv=['somedir','--no-setup']`、同一個非 git 資料夾、`fetchArchive` 用 `PRISTINE_FIXTURE` → 應照 0005 既有行為建出 `somedir`、exit 0——這一案一開始就是綠燈，屬於迴歸防護，不是紅燈步驟。另外跑一次既有 `pnpm --dir create-wxl exec vitest run` 完整迴歸 | U31 / AC-12 | (a) exit 1、`UP-E01`，不是 `CW-E02`；(b) exit 0、`somedir` 建立完成，與 0005 原本行為一致；0005 既有測試（除 Notes 列出需改寫的三筆外）全線綠燈。預期紅燈：(a) 目前得到 `CW-E02` token `"upgrade"` |
| 0006-S1 | base 版本低於 3.0.0 下限：`range.json` 與 `--from <version>` 兩種來源都在下載前擋下 | 同檔 `upgrade-target.test.mjs`：(a) `range.json` 的 `upstream.version` = `2.9.9`；(b) 沒有 `range.json`、`--from 2.9.9` | U50 / AC-4 | 兩案皆 exit 1、`UP-E10` 帶以 `jsonValue` 跳脫的 `2.9.9`、`fetchArchive` 未被呼叫。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | `--from <commit>` 時，base 真正的版本要等下載後才知道：above／equal／below 3.0.0 三種下載後才判定的結果 | 同檔：base 都用同一個固定、與 target 不同的 commit（`--from <那個 commit>`），只換那份 base archive 的 `package.json`（P3 處理前的原始值）：(a) 版本高於 target → `UP-E07`；(b) 版本等於 target 的版本、commit（已知，與 target commit 不同，無 `CREATE_WXL_COMMIT`）→ `UP-I01`（依 OQ-4 決議採此讀法，不是「commit 事後發現等於 target」——那個情況已由 U12 在下載前擋下，視為多餘重複）；(c) 版本低於 `3.0.0` → `UP-E10`。三案都補上「`tmpRoot` 下沒有任何 `create-wxl-upgrade-` 殘留」的斷言；base archive 的 pax `comment` 必須等於這個固定的 base commit，否則會先因 0005 的 rule 2 失敗（`create-wxl/src/archive-rules.mjs:123`），這點寫進 fixture 說明 | U51 / AC-4 | 三案都在 `fetchArchive` 被呼叫之後才出現對應錯誤碼，exit 1（(b) 為 exit 0）、什麼都不寫、`tmpRoot` 無殘留。預期紅燈：同總則，`CW-E02` token `"upgrade"` |
| 0006-S1 | `--from <version>` 解析出的 commit 剛好等於 target 的 commit：即使版本字串不同，仍判定 no-op；版本相同且也解析到 target commit 時同樣是 no-op | 同檔：(a) base 走 `--from <version>`（版本低於覆寫後的 target 版本，理由同 U08），該 tag 的 pax `comment` 設成與 `deps.source.commit` 完全相同的字串；(b)（依 Q4 補的真實情境子案）`--from <version>` 給的版本等於 target 版本，且該 tag 解析到的 commit 也等於 target commit。兩案都補上「`tmpRoot` 下沒有任何 `create-wxl-upgrade-` 殘留」 | U52 / AC-4 | 兩案皆 exit 0、`UP-I01`、什麼都不寫（`fetchArchive` 已被呼叫過，但後續不再動 repo）。預期紅燈：同總則，`CW-E02` token `"upgrade"` |

#### Notes

- **要改 body 的既有測試（需使用者核准）：** `create-wxl/test/run-preflight.test.mjs:247-249`（`GRAMMAR_CASES` 裡的 `'upgrade as positional'`、`'--no-setup upgrade'`、`'--no-setup -- upgrade'` 三筆）在 0006 文法下，三筆的 argv 都含 `--no-setup`，而 `--no-setup` 是 create-only 參數，衝突的是 U02「create-only 參數」規則，不是 U31；因此這三筆的 `token` 要從 `'upgrade'` 改成 `'--no-setup'`，而不是整段移除。第 249 行（`--no-setup -- upgrade`）的改法取決於 Q2 的決議：依 Q2 決議（first positional 的字面涵蓋 `--` 之後的 `upgrade`），這一筆仍是 `CW-E02` token `--no-setup`，與另兩筆同一個改法。同檔第 281-289 行「`Upgrade`（不同大小寫）仍被接受」的既有測試不需要改。AC-12 明文允許改動「C02's `upgrade` cases」。除此之外沒有找到其他需要改 body 的既有測試。
- **要建的 fixture／helper：**
  - 一個「已 commit 的乾淨 fixture range」builder（待建）：`makeTmpRoot()` 建資料夾、`git init`、寫入最小範圍的檔案樹加一份可控的 `range.json`、以 `verifyGit` 搭配 `-c user.name=... -c user.email=... -c commit.gpgsign=false` 隔離身分 commit——不要直接沿用 `test/helpers/git-home.mjs` 的 `makeGitHomeWithHook()`，因為它把全域 `commit.gpgsign` 設成 `true` 又指向一個不存在的 gpg（`git-home.mjs:26-29`），會讓這個 builder 自己的 commit 失敗。要能參數化出 U05 的八種骯髒狀態與 U10 的十六種 `range.json` 損壞形狀。
  - 不建 `GIT_CONFIG_GLOBAL` 隔離 helper：`create-wxl/src/git-env.mjs:6-13` 的 `buildGitEnv` 會濾掉所有以 `GIT_` 開頭的變數，`GIT_CONFIG_GLOBAL` 也在其中，寫了也讀不到。U05 全域 `showUntrackedFiles=no` 的那一案改成把設定寫進隔離 `HOME` 的 `.gitconfig`（必要時再加 `XDG_CONFIG_HOME/git/config`），比照 0005 既有隔離慣例（`create-wxl/test/run-git.test.mjs:62`；`git-home.mjs:51` 把設定寫進 `HOME/.gitconfig`）。
  - 一個以 `ref`（commit 字串或 `refs/tags/v<version>`）為鍵的 `fetchArchive` stub，分開控制 base／target 兩次呼叫各自回的 archive、pax `comment`，重用 `test/helpers/archive.mjs` 的 `buildArchive`/`buildArchiveRaw`；U16 的 tag archive 需改用 `buildArchiveRaw` 自組 `<repo>-<version>/` 前綴，因為 `buildArchive`（`archive.mjs:132`）把前綴寫死成 `<repo>-<commit>/`，對 tag 下載的真實形狀不準——記為共用 helper 的已知簡化，本計畫在 U16 自行繞開，不改動該共用檔案本身。
  - U04 的 ENOENT 案改用真的 `createSpawnGitRunner()` 搭配 `PATH: ''`，不自寫 stub；2.19.0／2.20.0 案用既有 `makeGitStub({ version: {...} })`。
  - 所有用到真 git 的列明寫 `runGit: createSpawnGitRunner()`，`deps.env` 明寫 `{ HOME, PATH: process.env.PATH, XDG_CONFIG_HOME, LANG }`（U05 另加 `GIT_CONFIG_NOSYSTEM: '1'`），絕不省略讓測試落回 `deps.mjs` 預設的全成功 stub（該預設對 `rev-parse` 一律回 `{ code: 0, stdout: '' }`，見 `git-stub.mjs:15,26`，會讓「進了 step 3」這個訊號本身未定義）。
  - `makeDeps` 不新增 `tmpRoot` 的預設值，比照既有 `cwd: undefined` 的慣例（`test/helpers/deps.mjs:53`），讓每個測試自己傳。
- **對前序 ticket 的假設（修正）：** 目前 checkout 在分支 `tickets/T-0025/publishing-documents-stage-8`，HEAD 是 `ed1d9e3`，與 `tickets/T-0024/...` 分支同一個 commit；`main` 是 `8fb2d34`，T-0025 尚未合併進 `main`。T-0024 ticket 檔狀態是 `review`，不是 `done`。工作區已有 T-0025 自己的交付物但尚未 commit：`create-wxl/src/publish.mjs`（已匯出 `prepareDist`、`checkPublish`，分別在第 80、132 行）、`create-wxl/test/publish.test.mjs`、`create-wxl/test/helpers/publish-fixture.mjs`、`create-wxl/test/helpers/publish-git-stub.mjs`、`create-wxl/test/upstream-config.test.mjs`，皆為 untracked。本計畫假設 0005 到 T-0024 為止（`run(argv, io, deps)` 與 `src/*.mjs` 的現狀，含真的 `createSpawnGitRunner`、`git-env.mjs`、`MINIMUM_GIT_VERSION`）就是基線，不需要 T-0025 自己的任何交付物，因為每一列都直接呼叫 `run()`（0006-S1 的 in-process 介面），不經過打包後的 CLI。分支何時開工是 parent 的決定，見「Decided readings」OQ-2。
- **對其他 ticket 的邊界：** T-0027 擁有合併表（step 8–9）、stage 8 模擬（U32）、報告 R1–R5（AC-10）、還原保證（AC-11）與所有 `UP-A*`。T-0026 停在 step 7（兩份原廠靶場都建好），`run()` 在這之後該回什麼留給「Decided readings」Q1 的決議；U30 的測試不經過 `run()`/0006-S1，直接讀這個 repo 自己的根目錄 `package.json`。
- **詮釋假設：** U06 只用 `fetchArchive` 的呼叫引數證明「commit 讀對了」，不單獨證明 `version` 欄位真的餵進了下游判斷——那由 U13、U50 另外證明。U08/U51 裡「R1 的顯示」明文留給 T-0027 的 U26，本計畫只斷言餵進下載/比較邏輯的值，不斷言任何印出文字。「什麼都沒寫」一律用 `test/helpers/snapshot.mjs` 的 `snapshotTree`/`withoutRootMtime` 比對 fixture repo 執行前後，外加確認 `deps.tmpRoot` 下沒有殘留 `create-wxl-upgrade-*`（U15、U51、U52 明寫；其餘列既有的 `fetchArchive` 未被呼叫斷言已足夠，因為根本沒有建立過 `tmpRoot` 項目）。
- **略過與隔離：** 本票沒有自己的 symbolic-link 或執行位元列（那些是 T-0027 的 U20/U23），牽到 symbolic link 的有兩處：U03 第三子案（指向 root 的 symlink）與 U10 的 J1 symlink 子案，兩者皆在 win32 略過，其餘子案照跑；本票不需要權限位元略過（沒有權限位元斷言）。每一個用真 git 的列只隔離 `HOME`／`XDG_CONFIG_HOME`／`PATH`／`GIT_CONFIG_NOSYSTEM=1`，絕不繼承測試行程自己的 `process.env`，也不使用 `GIT_CONFIG_GLOBAL`（理由見上）。
- **第 8 階段的驗證面：** 上面 21 列都不是 stage 8；0006 的 stage 8（0006-S2，兩個已推送 commit 的終端模擬，U32）屬於 T-0027。本票沿用 T-0021/T-0024 對「還不能打包」中途票的既有作法，把 `pnpm --dir create-wxl test` 的 in-process vitest 執行紀錄當作本票自己的驗證面——沒有終端機或瀏覽器面，因為還沒有打包後的 `bin`，也還沒有可示範的合併/報告。

#### Decided readings

- **Q1（取代 OQ-1）：** step 7 完成後，`run()` 在 step 8 的 checkpoint 驗證兩份原廠靶場已建好，接著移除暫存資料夾，回傳一個明確的內部未實作錯誤、exit code 1，由 T-0027 取代；測試（U14(a)）不斷言這個 exit code，只記為已知缺口，不把整段成功路徑留白。
- **Q2：** `create-wxl -- upgrade`（出現在 `--` 之後的 `upgrade`）依 spec「first positional」的字面，視為升級路徑；`--no-setup -- upgrade` 因此是 `CW-E02`，token 是 `--no-setup`。
- **Q3：** `--from=3.0.0`（行內 `=` 寫法）接受，與 0005 一致（`argv.mjs:57-59`），已列入 U01。
- **Q4：** `--from <version>` 等於 target version 時，commit 未知，先下載再判定，與 U52 屬於下載後判定一致；U52 已補一個「`--from` 等於 target version 且 tag 解析到 target commit → `UP-I01`」的實際情境子案。
- **OQ-2：** 照 hard rule 1 與 ticket Comments「implemented after T-0025, in order」，等 T-0025 合併進 `main` 後再開分支。
- **OQ-3：** 維持草稿提的檔案切分（`upgrade-grammar.test.mjs`、`upgrade-preconditions.test.mjs`、`upgrade-base.test.mjs`、`upgrade-target.test.mjs`，加上在既有 `upstream-archive.test.mjs` 裡新增一個 `describe`）。
- **OQ-4：** U51 中間那一案採「版本相同、commit（已知，與 target 不同）」的讀法，不是「下載後發現 commit 等於 target」。

#### User decisions (2026-10-17)

- Q5: UP-I01 is printed on stdout (it is not an error). The tests assert stdout.

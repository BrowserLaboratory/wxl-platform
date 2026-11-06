---
id: T-0026
title: Upgrade entry, preconditions and base resolution
epic: 0006-range-upgrade
status: review
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

- [x] U01: `upgrade --from 3.0.0`, `--from <40 hex>`, `--lang en upgrade` → accepted (AC-1)
- [x] U02: each grammar error of the row → CW-E02, nothing written (AC-1)
- [x] U03: not a repository / a subdirectory / the root through a symbolic link → UP-E01 / UP-E01 / accepted (AC-2)
- [x] U04: `runGit` rejects `ENOENT`; git 2.19.0 → UP-E02, exit 1 (AC-2)
- [x] U05: each unclean case of the row → UP-E03 with its token, exit 1, nothing written (AC-2)
- [x] U06: valid `range.json` → base = its commit and version (AC-3)
- [x] U07: absent, no `--from` → UP-E04 (AC-3)
- [x] U08: absent with `--from <version>` / `--from <commit>` → base from `--from`, version given / from the base archive's manifest (its display in R1 is verified in T-0027, U26) (AC-3)
- [x] U09: valid + `--from`; other repository + `--from`; unparsable + `--from` → `--from` wins / wins / UP-E06 `not-json` (AC-3)
- [x] U10: each J1, J3, J4 breakage without `--from` → UP-E06 with the token (AC-3)
- [x] U11: repository differs / differs only in case → UP-E05 / accepted (AC-3)
- [x] U12: base commit = target commit → UP-I01, exit 0, no download, nothing written (AC-4)
- [x] U13: base version > target → UP-E07 before any download (AC-4)
- [x] U14: equal versions, different commits → with override proceeds past step 7 with CW-W04 / without, UP-I01 (AC-4)
- [x] U15: either archive rejected, hostile, or lacking a P1/P2 marker → the 0005 code, exit 1, nothing written, no `create-wxl-upgrade-` entry under `tmpRoot` (AC-5)
- [x] U16: `--from <version>` tag archive `comment` absent or not 40 hex → UP-E08 (AC-5)
- [x] U30: the root manifest's `range:upgrade` script exactly as specified, checked by a create-wxl test (AC-12)
- [x] U31: `create-wxl upgrade` takes the upgrade path; `create-wxl <dir>` unchanged (AC-12)
- [x] U50: base 2.9.9 from `range.json`, and `--from 2.9.9` → UP-E10 before any download (AC-4)
- [x] U51: `--from <commit>` whose archive version is above / equal-with-target-commit / below 3.0.0 → UP-E07 / UP-I01 / UP-E10 after download, nothing written (AC-4)
- [x] U52: `--from <version>` resolving to the target's commit → UP-I01, nothing written (AC-4)

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
  - 不建 `GIT_CONFIG_GLOBAL` 隔離 helper：`create-wxl/src/git-env.mjs:6-13` 的 `buildGitEnv` 會濾掉所有以 `GIT_` 開頭的變數，`GIT_CONFIG_GLOBAL` 也在其中，寫了也讀不到。U05 全域 `showUntrackedFiles=no` 的那一案改成把設定寫進隔離 `HOME` 的 `.gitconfig`（必要時再加 `XDG_CONFIG_HOME/git/config`），比照 0005 既有隔離慣例（`create-wxl/test/run-git.test.mjs:65`；`git-home.mjs:51` 把設定寫進 `HOME/.gitconfig`）。
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

### 2026-10-17 — increment plan: user decisions, work paused

The increment plan and its independent check are drafted (approve with corrections; the corrections are applied when work resumes). The user decided the four points the spec leaves open, following the recommendations: (1) the `bin` passing `deps.tmpRoot = os.tmpdir()` (traceability's dependency list, claimed by no ticket) belongs to this ticket, with one test row added to the approved table; (2) `--from` before `upgrade` (for example `--from 3.0.0 upgrade`) is CW-E02, as the grammar draws `--from` after `upgrade` only; (3) a base archive from `--from <commit>` whose `package.json` version is missing or not X.Y.Z is UP-E10, since the 3.0.0 floor cannot be established; (4) until T-0027, a run that has downloaded and built both pristine ranges ends with CW-E14 whose message says the upgrade merge is not implemented yet, after removing both temporary folders. The user then paused the work on 2026-10-17 to prepare the workshop; status stays `todo` until it resumes.


### 2026-11-07 — resumed on `main` `ea0de55`; decisions D3 and D5; rows added

The work resumed after T-0025 landed (#63). The approved table, its notes and the decisions above
came from the unpushed local branch of 2026-10-17 (now `archive/T-0026-2026-10-17`, commits `9b3b2f8`
and `37d1967`, cherry-picked unchanged except one line reference: `run-git.test.mjs:62` is `:65` on
`main`). The note "Assumptions about earlier tickets" describes the checkout of 2026-10-17; the
baseline is now `main` at `ea0de55`, which holds T-0025, T-0029, epics 0007 and 0008. The increment
plan drafted on 2026-10-17 was not kept, so it is drafted again before the first test. A drift audit
of traceability revision 2.1 against `main` (2026-11-07) found every function, code and path this
ticket relies on still accurate (`create-wxl/src/run.mjs:67`, `argv.mjs:17,57-59,82`,
`archive-rules.mjs:119-123`, `pristine.mjs:49-103`, `git-version.mjs:9`, `messages.mjs:172-323`).

Decisions confirmed by the user on 2026-11-07:

- **D3.** A file-system error under `deps.tmpRoot` in step 7 (the `mkdtemp`, the extraction, a P-rule's
  read or write other than the missing file P1/P2 report as CW-E10) prints CW-E09 with the path and
  detail, as 0005's steps 8–9 do (`create-wxl/src/run.mjs:363-381,403-405`), after removing every
  temporary directory the run created; exit 1, nothing written in the range.
- **D5.** CW-E02's usage line stays `create-wxl <directory>` on the upgrade path too: changing it would
  change 0005's message tests, which AC-12 keeps unchanged. Recorded, not fixed.

Rows added to the approved table (decision (1) of 2026-10-17 and D3):

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0005-S1（bin） | 打包的 `bin` 把 `os.tmpdir()` 當作 `deps.tmpRoot` 傳給 `run` | 擴充既有 `create-wxl/test/bin.test.mjs`，比照該檔讀 `bin` 原始碼的作法（T-0025 的 C-08 一類），斷言 deps 物件帶 `tmpRoot: tmpdir()`（`node:os`） | 決定 (1)，traceability.md:37 | 綠燈：`bin` 的 deps 帶 `tmpRoot`，值來自 `os.tmpdir()`。預期紅燈：目前 `create-wxl/bin/create-wxl.mjs:94-122` 的 deps 沒有 `tmpRoot` |
| 0006-S1 | step 7 在 `tmpRoot` 底下的檔案系統錯誤 → CW-E09，暫存資料夾全部清掉 | `upgrade-target.test.mjs` 新增 `describe('file-system errors in step 7')`：(a) `deps.tmpRoot` 指向一個不存在的路徑（`mkdtemp` 失敗）；(b) 用既有 `fail-at` 注入，讓 target 的解壓寫入在第一個檔案失敗；(c) 同樣注入，讓 base 的 P3（`package.json`）寫入失敗 | D3 / AC-5 | 三案皆 exit 1、stderr 以 `CW-E09` 開頭並帶路徑；`withoutRootMtime(snapshotTree(tmpRoot))` 前後一致（(a) 為 tmpRoot 不存在）；fixture range 的 snapshot（含 `.git`）不變。預期紅燈：同總則，`CW-E02` token `"upgrade"` |

### 2026-11-07 — sub-cases added to the approved table

The increment plan's independent check found approved behaviour without a test. The user approved
on 2026-11-07 these sub-cases, which test decisions already made and change no behaviour:

- U02: `['--from','3.0.0','upgrade']` → CW-E02 token `--from` (decision (2)); `['--author','x','upgrade']`
  → CW-E02 token `--author` (a create-only flag before `upgrade`; the three C02 cases of
  `run-preflight.test.mjs:247-249` depend on it).
- U31: `['range','--from','3.0.0','--no-setup']` → CW-E02 token `--from` (AC-12: `--from` exists only
  on the upgrade path, so the create path is unchanged).
- U51 (d): a base archive from `--from <commit>` whose `package.json` `version` is missing or not
  X.Y.Z → UP-E10, nothing written, no `create-wxl-upgrade-` entry left (decision (3)).
- U09 (e): the symbolic-link sub-case is skipped on win32, like U03's third case and U10's J1 case.

### 2026-11-07 — increment plan confirmed

The increment plan was drafted by the executor role and checked by the reviewer role (32 problems,
"approve with corrections"), revised to apply every one of them and the sub-cases the user approved,
then gated by a second reviewer pass. The gate confirmed all 32 applied and raised one blocking point
(D3's fault injection matched a `/`-separated path, which never fires on windows-latest) and six
minor ones. The main session confirmed the plan with seven amendments: the injection matches the file
name only; step 6's checks are repeated for every base after both archives are validated and before
any `mkdtemp` (traceability.md:89); `rev-parse` output is trimmed and `--git-dir` resolved against
`deps.cwd`; U03 (2)'s subdirectory need not be committed; the tag fixture's prefix directory carries
mode `0o755`; **UP-I01 carries the base's version and commit** (traceability.md:176 says only "the
version and commit"; the base is the range's current state); until increment 18 the one fall-through
uses decision (4)'s CW-E14 wording, unasserted. 22 increments and five behaviour-preserving
refactors (R1 before increment 1, R2 before 10, R5 before 14, R3 before 18, R4 before 21; each with
the whole create-wxl suite green before and after).

### 2026-11-07 — red → green log

Run by the executor role in five sequential segments, each ending with the whole create-wxl suite
(`pnpm --dir create-wxl exec vitest run`): 464, 481, 507, 528, 535 tests passing. Each increment's
red was observed before its production change; "red" below quotes what was seen. U15 is confirmed
green inside increment 19 (D3's shared cleanup), as the plan states.

| # | Row | Red observed | Files |
|---|---|---|---|
| 0 | R1 refactor | N/A (not a red/green cycle; this is a behaviour-preserving move) — baseline before: 'Test Files 21 passed (21)' / 'Tests 437 passed (437)' | create-wxl/src/patterns.mjs, create-wxl/src/run-shared.mjs, create-wxl/src/run.mjs |
| 1 | bin tmpRoot row | 1 failed \| 14 passed (15) — AssertionError on `expect(source).toMatch(/\{\s*tmpdir\s*\}\s*=\s*await import\(\s*['\"]node:os['\"]\s*\)/)`: bin source had no node:os import and no tmpRoot in deps | create-wxl/bin/create-wxl.mjs, create-wxl/test/bin.test.mjs |
| 2 | U30 | 1 failed — AssertionError: expected undefined to be 'npx --yes create-wxl@latest upgrade' (pkg.scripts['range:upgrade'] was undefined) | package.json, create-wxl/test/upstream-archive.test.mjs |
| 3 | U31 | 1 failed \| 2 passed (3) — (a): AssertionError: expected 'CW-E02: "upgrade" is not a valid argument.\n' to match /^UP-E01/m; (b) and (c) passed from the start as guards | create-wxl/src/argv.mjs, create-wxl/src/run.mjs, create-wxl/src/upgrade.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-grammar.test.mjs, create-wxl/test/run-preflight.test.mjs |
| 4 | U01 | 3 failed \| 5 passed (8) — the three --from forms got CW-E02 naming "--from"/"--from=3.0.0" instead of UP-E01; the two --lang forms were already green (confirmations) | create-wxl/src/argv.mjs, create-wxl/test/upgrade-grammar.test.mjs |
| 5 | U02 | 11 failed \| 14 passed (25) — the 11 new cases (v3.0.0, 39-hex, 41-hex, uppercase-40, 'extra', the five create-only flags after upgrade, and ['--author','x','upgrade']) all got UP-E01 instead of CW-E02; the 6 confirmations (mis… | create-wxl/src/argv.mjs, create-wxl/test/upgrade-grammar.test.mjs |
| 6 | U12 | AssertionError: expected 1 to be +0 // Object.is equality (exit code 1, decision-(4) CW-E14 fall-through, instead of 0) — both case (a) and case (b) | create-wxl/src/upgrade.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-target.test.mjs, create-wxl/test/helpers/fixture-range.mjs |
| 7 | U03 | AssertionError: expected 'CW-E14: an unexpected error happened: "ENOENT: no such file or directory, open '.../docs/range.json'".\n' to match /^UP-E01/m | create-wxl/src/upgrade.mjs, create-wxl/test/upgrade-preconditions.test.mjs |
| 8 | U04 | (1) AssertionError: expected 'CW-E14: an unexpected error happened: "spawn git ENOENT".\n' to match /^UP-E02/m; (2) AssertionError: expected 'CW-E14: an unexpected error happened: "ENOENT: no such file or directory, realpath ''… | create-wxl/src/upgrade.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-preconditions.test.mjs |
| 9 | U05 | AssertionError: expected +0 to be 1 // Object.is equality (exit code 0 with UP-I01 on stdout, instead of exit 1 with UP-E03) — all 8 sub-cases | create-wxl/src/upgrade.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-preconditions.test.mjs, create-wxl/test/helpers/fixture-range.mjs |
| 10 | U06 | AssertionError: expected [] to include '1111111111111111111111111111111111111111' (fetchArchive.mock.calls empty: the run takes the decision-(4) fall-through without downloading) | create-wxl/src/run-shared.mjs, create-wxl/src/run.mjs, create-wxl/src/upgrade.mjs, create-wxl/test/upgrade-base.test.mjs, create-wxl/test/helpers/ref-fetch-archive.mjs |
| 11 | U07 | AssertionError: expected 'CW-E14: an unexpected error happened: "ENOENT: no such file or directory, open '.../range.json'".\n' to match /^UP-E04/m | create-wxl/src/upgrade.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-base.test.mjs |
| 12 | U08 | (a) AssertionError: expected [ undefined ] to include 'refs/tags/v3.1.0' (fetchArchive was called once with ref=undefined, not the planned '0 calls' -- documented as a deviation below); (b) passed at the start as its own confir… | create-wxl/src/upgrade.mjs, create-wxl/test/upgrade-base.test.mjs |
| 13 | U09 | (a)(b)(d) green at the start (confirmations); (c) and (e): AssertionError: expected 'CW-E14: an unexpected error happened: "the upgrade merge is not implemented yet".\n' to match /^UP-E06/m -- exactly the plan's expected red | create-wxl/src/upgrade.mjs, create-wxl/src/messages.mjs, create-wxl/test/helpers/fixture-range.mjs, create-wxl/test/upgrade-base.test.mjs |
| 0 | R5 refactor | n/a | create-wxl/src/upgrade.mjs |
| 14 | U10 | 16 failed \| 9 skipped (25); every case got CW-E14 instead of UP-E06 -- the directory case showed EISDIR, the JSON-shape cases showed SyntaxError/TypeError text, and the shape cases that type-check downstream fields showed 'the… | create-wxl/src/upgrade.mjs, create-wxl/test/upgrade-base.test.mjs |
| 15 | U11 | (a) AssertionError: expected 'CW-E14: an unexpected error happened: "the upgrade merge is not implemented yet".\n' to match /^UP-E05/m (fetchArchive was in fact called, as the plan predicted); (b) passed at the start as its own… | create-wxl/src/upgrade.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-base.test.mjs |
| 16 | U13 | AssertionError: expected 'CW-E14: an unexpected error happened: "the upgrade merge is not implemented yet".\n' to match /^UP-E07/m — fetchArchive had in fact been called (download happened), matching the plan's predicted red ex… | create-wxl/src/upgrade.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-target.test.mjs |
| 17 | U50 | Both (a) and (b): AssertionError: expected 'CW-E14: an unexpected error happened: ...' to match /^UP-E10/m — both downloaded and fell through to decision-(4) CW-E14, matching the plan. | create-wxl/src/upgrade.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-target.test.mjs |
| 18 | U14 | (a) AssertionError: expected false to be true — checkpoint('step-8') was never called with the upgrade path, so the synchronous inspection never ran (inspected stayed false). (b) AssertionError: expected 1 to be +0 — exit code … | create-wxl/src/run-shared.mjs, create-wxl/src/run.mjs, create-wxl/src/upgrade.mjs, create-wxl/test/upgrade-target.test.mjs |
| 19 | D3 | Only case (b) failed: 'expected [object with create-wxl-upgrade-KQ8YTF entry and its built files] to equal [snapshot without it]' — the base's fully-built create-wxl-upgrade-* directory was left behind under tmpRoot when the ta… | create-wxl/src/upgrade.mjs, create-wxl/test/upgrade-target.test.mjs, create-wxl/test/helpers/ref-fetch-archive.mjs |
| 20 | U16 | 'no pax global header' case: AssertionError expected CW-E14 text to match /^UP-E08/m (rule 2 passed vacuously since undefined===undefined, run fell through to decision-4). Other 4 cases: AssertionError expected 'CW-E08: the arc… | create-wxl/src/run-shared.mjs, create-wxl/src/upgrade.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-target.test.mjs, create-wxl/test/helpers/ref-fetch-archive.mjs |
| 21 | U51（含 2026-11-07 補的子案 | 5 failed \| 23 skipped (28)。(a)(c)(d1)(d2) 四案：'expected CW-E14: an unexpected error happened: "the upgrade merge is not implemented yet". to match /^UP-E07/m（或 /^UP-E10/m）'；(b) 案：'expected 1 to be +0'（exit code 1 而非 0）。五案都走到 de… | create-wxl/src/upgrade.mjs, create-wxl/test/upgrade-target.test.mjs |
| 22 | U52 | 2 failed \| 28 skipped (30)：'expected 1 to be +0 // Object.is equality'（兩案皆 exit 1 而非預期的 exit 0），與預期紅燈一致：inc 20 只驗證 tag comment、沒有指派 baseCommit，inc 21 的 recheck 因 baseCommit 仍是 undefined 而不觸發 commit-equal 分支，於是繼續跑到 decision-(4)… | create-wxl/src/run-shared.mjs, create-wxl/src/upgrade.mjs, create-wxl/test/upgrade-target.test.mjs |

Recorded, not plan deviations: in increment 3 the executor first wrote the production edits before
the test, noticed it before running anything, reverted them to the post-increment-2 state, confirmed
the suite green, and then ran the cycle test-first. In increment 7 the first draft of U03 (1) used
`makeDeps`'s default env without `PATH`, so the red came from an unexpected cause; the env was
corrected within the same cycle as the Notes require. In increment 12 the observed red differed in
mechanism from the plan's wording (a version-form `--from` reached `fetchArchive` with `ref`
undefined) but was red for the right row. The refactor R3 helpers return `null`/`false` for the
conditions they report themselves and rethrow only `SignalAbort` or unknown errors.

Edited 0005 test bodies: only the three C02 cases of `create-wxl/test/run-preflight.test.mjs:247-249`
(token `'upgrade'` → `'--no-setup'`), as the Notes allow; `bin.test.mjs` gains one `it`.

### 2026-11-07 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0006-S1 | `upgrade-grammar.test.mjs`, `upgrade-preconditions.test.mjs`, `upgrade-base.test.mjs`, `upgrade-target.test.mjs` (98 tests added in all with the rows below) | not measured: no coverage provider is installed in create-wxl (as for T-0020–T-0025) | U01–U16, U31, U50–U52, D3 | symbolic-link sub-cases on win32 (U03 (3), U09 (e), U10 J1) are skipped there; U14 (a) observes `deps.checkpoint('step-8')`, which 0006-S1's observable list does not name (the approved table's choice); the end state after step 7 is decision (4)'s CW-E14 until T-0027 |
| 0005-S3 | `upstream-archive.test.mjs` `range:upgrade script` | not measured | U30 | — |
| 0005-S1 (bin source) | `bin.test.mjs` (1 added) | not measured | decision (1) | the packed `bin` against a terminal: T-0027's stage 8 (0006-S2) |

Checks at HEAD of the working tree on 2026-11-07: `pnpm --dir create-wxl test` → `Test Files 25 passed (25) / Tests 535 passed (535)`;
root `pnpm test --run` → `Test Files 136 passed (136) / Tests 4854 passed | 1 skipped (4855)`;
`python3 scripts/verify-project.py` → `PASS`. Acceptance criteria ticked; status set to `review` for stage 6.

### 2026-11-07 — stage 6 review and disposition (fixes not yet applied)

`/code-review` on the staged change (base `ea0de55` = merge-base, HEAD `69bd4a0`, staged layer;
packet captured before review, no drift after). Two independent `harness-reviewer` passes, one axis
each. Standards: 19 documented-standard findings (A1–A17, B1–B2) and 19 smells (S1–S19). Spec: 26
findings (F01–F26). Both reports, verbatim, are kept locally in
`.proj.research/2026-11-07-T-0026-stage6-review.md` (gitignored). Worst per axis: A1 (D3 (b)'s
`toContain(tmpRoot)` is not escaped through `jsonValue`, so it fails on windows-latest) and F01
(step 4 ignores the exit codes of `git status`, `git ls-files -v` and `git rev-parse --git-dir`, so a
failing git reads as a clean tree; after T-0027 that could let R5's `git clean -fd` remove a
teacher's untracked files).

The user approved this disposition on 2026-11-07 ("照建議處置"):

- **Behaviour fixes, each test-first with a new sub-case (approved):**
  - **D6** (F01, B1): in step 4, a non-zero or `null` exit of any of the three git commands stops the
    run with CW-E14 naming the command and its stderr (fail closed); exit 1, nothing written.
  - **F02, A2:** the upgrade path calls `deps.checkpoint('step-N')` then `guard.throwIfRaised()` at
    the start of its steps 3–7 (the existing `checkpoint('step-8')` stays); sub-case: SIGINT at
    `step-4` → exit 130, nothing written, no `create-wxl-upgrade-` entry, no download.
  - **F03, A3:** J4 and decision (3) require a string before the regex; sub-cases: array `version` /
    `commit` in `range.json` → UP-E06 with its token; array base `version` → UP-E10.
  - **F17:** UP-E10 for a present but invalid version says it is not valid (en, zh-TW).
  - **F14:** cleanup removes every temporary directory even if one `rm` fails and never rejects the
    run; sub-case with an injected `rm` failure.
  - **F22:** sub-case: `--from <version>` equal to the target version whose tag resolves to another
    commit → UP-I01 after the download with the base's version and commit.
- **Test and tidy fixes, within the approved scope:** A1/F04, A4/F08, A5/F13, F05, F06, F09, F12,
  F21, F23, A10 (in a new test file; `language.test.mjs` is not edited), A6 (one constant for the
  3.0.0 floor in messages), A7 (UP-E05 says the upstream repository, not "engine"), A9 (zh-TW
  wording), A17/F16/S9 (stale comments; refactor tags R1–R5 removed from comments).
- **Mutation checks** for rows whose red was never observed (F10, F11): U15, U11 (b), U09 (b), U09 (d).
- **Record fixes by the main session:** A12 (untruncated reds, line references pinned to a commit),
  A13 (OS and surface of each verification), A15 (the zh-TW section), F24 (revision 2.1).
- **Recorded, not changed:** A11 and A14 (precedent), A16 (frozen spec), A8 (base/target are the
  spec's vocabulary), B2, F07, F18, F19 (CW-E09 printed before cleanup, as 0005 does), F20, F25 (a
  spec gap: `range.json`'s claimed version is not cross-checked against the archive; candidate open
  question), F26 (do not publish to npm between T-0026 and T-0027), S1–S19 (optional quality
  cleanup, not stage 6).

Status stays `review`. The fixes above are the next step.

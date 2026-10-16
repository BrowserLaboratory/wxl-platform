---
id: T-0020
title: create-wxl --no-setup creates a pristine range end to end
epic: 0005-create-wxl
status: done
blocked_by: [T-0019]
---

## Context

The tracer bullet for create-wxl: the package skeleton (manifest without the publishing scripts,
`.gitignore`, lockfile, vitest; U2) and `run(argv, io, deps)` covering steps 1–4, 6–10 and 13 for
`--no-setup`. It implements the happy path of the archive parse, extraction and pristine processing
P1–P4 so that a fixture archive yields a complete range; T-0021 pins the entry rules and each P rule.
Messages are added to both the `en` and `zh-TW` tables from the start (T-0024 pins the language rule).

Spec: `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, seam 0005-S1; "Command grammar",
"Step order", "Test-download override".

## Deliverable

`run` with `<dir> --no-setup` and a fixture archive produces the pristine range at the target, prints
N1 and N8, and exits 0; argument, Node version, source record, target and download failures exit 1
with their codes and write nothing.

## Acceptance criteria

- [x] C01: Node 22.5.0 / 21.99.0 → CW-E01, nothing written, no download; 22.6.0, 22.10.0, 23.0.0 accepted (AC-1)
- [x] C02: every grammar error listed in the row → CW-E02 naming it (not CW-E13 with a broken source record), nothing written (AC-2)
- [x] C03: `--no-setup` with a setup flag → CW-E02 (AC-2)
- [x] C05: target missing, parent writable → proceeds (AC-4)
- [x] C06: target an empty directory, or `.` in an empty cwd → proceeds (AC-4)
- [x] C07: each rejected target of the row → CW-E04 naming path and condition, nothing written, no download (AC-4)
- [x] C14: fetcher rejects, aborts mid-body, 404, times out → CW-E07 naming the URL, target unchanged, no temporary directory (AC-7)
- [x] C15: `CREATE_WXL_COMMIT` 40 lowercase hex → CW-W04, fetched by that commit, written to `range.json` (AC-8)
- [x] C16: `CREATE_WXL_COMMIT` short, uppercase or other → CW-E02 in step 2 (AC-8)
- [x] C22: fixture with an executable file, umask 022 → every file without the prefix, byte-identical except P1–P4 files; modes 0755/0644, target 0755 (AC-10)
- [x] C29: target missing / empty / `.` → range at the target, temporary directory gone (AC-10)
- [x] C39: `--no-setup` with and without the override → P1–P4 applied, no engine or `runGit` call, exactly N1 and N8 (AC-16)
- [x] C50: each broken source record field → CW-E13, nothing written (AC-23)

## 給使用者（zh-TW）

create-wxl 的第一條完整路徑：建立套件骨架，`create-wxl <資料夾> --no-setup` 從 fixture archive 下載、解壓、做原廠處理後，產生一個原廠靶場並印出下一步。參數、Node 版本、套件來源紀錄、目標資料夾與下載的錯誤都會以代碼結束，什麼都不寫。

## Comments

### 2026-10-16 — test plan table (approved by the user before the first test)

Drafted by a workflow (one drafting agent, one independent checker that corrected 12 problems) and approved by the user on 2026-10-16 together with T-0021–T-0025 and decisions D1–D12, quoted verbatim: "全部核准".

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0005-S1 | tracer：`create-wxl range --no-setup` 從 fixture archive 產生原廠靶場，套用 P1–P4，只依序印 N1 與 N8，不呼叫引擎也不呼叫 `runGit`；`checkpoint` 依步驟順序被呼叫 | `create-wxl/test/run-no-setup.test.mjs`，describe `--no-setup tracer`；`makeDeps()`（env `{}`、locale `en-US`、nodeVersion `22.6.0`、`packageVersion` `3.0.0`、真正的引擎模組外包 `vi.fn` spy、`runGit` 為一被呼叫就失敗的 `vi.fn`、`fetchArchive` 每次回新的 `{ status: 200, body: buildArchive(PRISTINE_FIXTURE, { comment: source.commit }) }`、`checkpoint` 為 `vi.fn`）；`io.interactive: false`；target `range` 不存在，父目錄為測試暫存目錄（已取 realpath）；`it.each` 兩種「沒有 override」：`CREATE_WXL_COMMIT` 未設定、設為空字串 | C39（沒有 override 的一半）、C05 / AC-16、AC-4 | 紅燈：`create-wxl/src/run.mjs` 還不存在，import 失敗（`Failed to load url` / `Cannot find module`）。綠燈：exit 0；target 的檔案集合 = fixture 檔案去掉第一層路徑，再加上 `range.json`；`CHANGELOG.md` 截到 `## [Unreleased]` 為止；`.proj.specs/OPEN-QUESTIONS.md` 只剩第一個 `## OQ-` 之前的格式段；`package.json` 的 `version` 為 `0.1.0`（兩格縮排 JSON 加結尾 LF）；`range.json` byte-equal 於 schema（`repository` = `source.repository`、`version` = `source.version`、`commit` = `source.commit`）；`fetchArchive` 只被呼叫一次，參數為 `(source.repository, source.commit, { signal: expect.any(AbortSignal) })`；`parseForkInitArgs`、`runForkInit`、`deriveGithubPagesOrigin`、`runGit` 呼叫次數皆為 0；`checkpoint` 的呼叫中，`step-3`、`step-4`、`step-6`、`step-7`、`step-8`、`step-9`、`step-10`、`step-13` 依此順序各出現一次；輸出的下一步依序恰為 N1（`cd range`）與 N8（`pnpm install`、`pnpm fork:init`），N2–N7 的文字都沒有出現；空字串的 override 不印 CW-W04 |
| 0005-S1 | target 不存在、是空目錄、或是空的 cwd 下的 `.`，都能建立靶場；執行後本次的暫存目錄消失，既有空目錄本身保留 | `create-wxl/test/run-target.test.mjs`，describe `accepted targets`；`it.each` 三種：`range`（不存在）、`range`（測試先以 mode 0750 建立的空目錄）、`.`（`deps.cwd` 指向空目錄 `<tmp>/cwd`）；`fs.mkdtemp` 由 recorder 記錄參數；mode 與 `ino` 的斷言在 `skipModes`（Windows 或 root）時略過，其餘斷言每個平台都跑 | C05、C06、C29 / AC-4、AC-10 | 紅燈：tracer 的最小實作直接 `rename(tmp, target)`，在 POSIX 上可以蓋過空目錄，於是空目錄與 `.` 兩種情況下 target 的 `stat().ino` 改變、mode 變成 0755，斷言 `ino`／mode 不變而失敗（紅燈在 macOS 記錄）。綠燈：三種都 exit 0，靶場檔案都在 target；既有空目錄（含 `.`）保留原本的 `ino` 與 mode 0750（只有 target 不存在時才設 0755）；`mkdtemp` 恰被呼叫一次，前綴為 `join(<target 的父目錄>, '.create-wxl-')`（`.` 的父目錄是 `<tmp>`）；執行後父目錄沒有任何 `.create-wxl-` 開頭的項目 |
| 0005-S1 | 解壓後的版面與權限：每個 archive 檔案去掉前綴後 byte-identical（P1–P4 改過的檔案除外），可執行檔 0755、其他 0644、目錄與新建的 target 0755，不保留時間 | `create-wxl/test/run-no-setup.test.mjs`，describe `layout and modes`；`skipModes` 時 `it.skip`；測試內 `process.umask(0o022)`，`afterEach` 還原；fixture = `PRISTINE_FIXTURE` 再加上：entry mode 0755 的 `scripts/run.sh`、0100 的 `bin/only-owner-x`、0644 的 `README.md`、0600 的 `private.txt`、含非 UTF-8 位元組（`0x00 0xff 0xfe`）的 `assets/blob.bin`、mode 0700 的目錄 entry `deep/`、`deep/a/b.txt`；所有 entry 的 mtime 為 2000-01-01；target `range` 不存在 | C22 / AC-10 | 紅燈：tracer 以 `writeFile` 的預設 mode 寫入，`scripts/run.sh` 為 0644，`expected 420 to be 493`（0o644 對 0o755）失敗。綠燈：`scripts/run.sh` 與 `bin/only-owner-x`（任一執行位元）為 0755；`README.md`、`private.txt`（0600 被正規化）為 0644；目錄 `deep/`（entry 0700）與 `deep/a/` 為 0755；target 本身為 0755；`CHANGELOG.md`、`.proj.specs/OPEN-QUESTIONS.md`、`package.json`、`range.json` 以外的每個檔案，與 archive 內容逐 byte 相同（含二進位檔）；沒有任何檔案的 mtime 等於 2000-01-01 |
| 0005-S1 | `CREATE_WXL_COMMIT` 為 40 個小寫 hex 時印出 CW-W04，改用該 commit 下載並寫入 `range.json`；下一步仍只有 N1 與 N8 | `create-wxl/test/run-no-setup.test.mjs`，describe `test-download override`；`deps.env.CREATE_WXL_COMMIT` = 與 `source.commit` 不同的 40 位小寫 hex；fixture 的 pax `comment` 設為 override commit | C15、C39（有 override 的一半） / AC-8、AC-16 | 紅燈：沒有 CW-W04，且 `fetchArchive` 收到的是 `source.commit`，不是 override。綠燈：輸出有一行以 `CW-W04` 開頭，含該 commit 的 JSON 字串字面值；`fetchArchive` 只被呼叫一次，參數為 `(source.repository, override, { signal })`（repository 不變）；`range.json` 的 `commit` 為 override，`version` 仍為 `source.version`，`repository` 仍為 `source.repository`；exit 0；下一步依序恰為 N1、N8（CW-W04 不會帶出 N2）；引擎與 `runGit` 都沒有被呼叫 |
| 0005-S1 | 套件來源紀錄缺漏或不一致時，以 CW-E13 結束，提示套件損壞並建議用 `npm create wxl@latest` 重試，什麼都不寫、不下載 | `create-wxl/test/run-preflight.test.mjs`，describe `package source record`；argv `range --no-setup`；`it.each`：`source: undefined`；`repository` = `'other/' + UPSTREAM_SLUG.split('/')[1]`（不等於 `UPSTREAM_SLUG`，也不在測試中寫出 slug）；`version` `3.0.1` 而 `packageVersion` `3.0.0`；`version` 與 `packageVersion` 同為 `3.0.0-rc.1`（不符三段數字的格式）；`commit` 為 39 位 hex、41 位 hex、40 位大寫 hex；`engineSha256` 改掉一個 hex 字元（比對來源依 open question 1 的裁決）；fs recorder、`checkpoint` spy、測試暫存根目錄的 snapshot | C50 / AC-23 | 紅燈：沒有檢查來源紀錄，exit 0（`source: undefined` 時則丟出 `TypeError`，不是 CW-E13）。綠燈：每例 exit 1，輸出有一行以 `CW-E13` 開頭，含 `npm create wxl@latest`；`checkpoint` 呼叫 0 次；`fetchArchive` 呼叫 0 次；fs recorder 沒有寫入類呼叫，snapshot 不變 |
| 0005-S1 | `CREATE_WXL_COMMIT` 不是 40 個小寫 hex 時，在 step 2 以 CW-E02 結束，不會進入 step 3、也不下載；即使來源紀錄同時損壞，也先報 CW-E02 | `create-wxl/test/run-preflight.test.mjs`，describe `override grammar`；argv `range --no-setup`；`it.each` override：`0123456`（太短）、40 位大寫 hex、`main`（其他文字），各自 × 來源紀錄（正常／`source: undefined`）；fs recorder、`checkpoint` spy、snapshot | C16 / AC-8 | 紅燈：沒有檢查 override，直接以該值下載、exit 0；搭配損壞的來源紀錄時得到 CW-E13，不是 CW-E02（C50 已實作）。綠燈：每例 exit 1，輸出有一行以 `CW-E02` 開頭並點名 `CREATE_WXL_COMMIT`；沒有任何一行以 `CW-E13` 開頭；`checkpoint` 呼叫 0 次；`fetchArchive` 呼叫 0 次；fs recorder 沒有寫入類呼叫，snapshot 不變 |
| 0005-S1 | Node 版本以數值比較：低於 22.6.0 時以 CW-E01 結束，什麼都不寫、不下載，也先於 step 2 的任何檢查；22.6.0 以上可以執行 | `create-wxl/test/run-preflight.test.mjs`，describe `step 1 Node version`；`it.each` 拒絕：`deps.nodeVersion` 為 `22.5.0`、`21.99.0`；`22.5.0` 搭配 `source: undefined`；`22.5.0` 搭配參數錯誤 `--bogus`；`it.each` 接受：`22.6.0`、`22.10.0`、`23.0.0`（各自跑完整的 `range --no-setup`） | C01 / AC-1 | 紅燈：`22.5.0` 仍 exit 0 並下載；`22.5.0` 加上 `source: undefined` 得到 CW-E13。綠燈：拒絕時 exit 1，輸出有一行以 `CW-E01` 開頭，含執行中的版本（`22.5.0`／`21.99.0`）、最低版本 `22.6.0` 與 `https://nodejs.org/`；`checkpoint` 與 `fetchArchive` 都是 0 次，fs recorder 沒有寫入，snapshot 不變；搭配 `source: undefined` 或 `--bogus` 時仍是 CW-E01（`--bogus` 這一例此時還沒有紅燈，C02 之後才當順序守衛）。接受時三者都 exit 0；`22.10.0` 用來擋住字串比較（字串比較會把它判為小於 22.6.0） |
| 0005-S1 | matrix 列出的每一種文法錯誤，都以 CW-E02 點名該參數；即使套件來源紀錄同時損壞，也不是 CW-E13 | `create-wxl/test/run-preflight.test.mjs`，describe `command grammar`；`it.each` × 來源紀錄（正常／`source: undefined`）：`range --no-setup --bogus`；`range --help`；`range --version`；`range -h`；`range -`；`range --no-setup --no-setup`；`range --no-setup --lang en --lang en`；`range --no-setup --lang`（缺值）；`range --author --repo x`；`range --author=`；`range --no-setup=x`；空字串位置參數加上 `--no-setup`；`a b --no-setup`（兩個位置參數）；`upgrade --no-setup`、`--no-setup upgrade`、`--no-setup -- upgrade`；`range --no-setup --lang fr`；接受的對照：`Upgrade --no-setup`、`range --no-setup --lang=zh-TW` | C02 / AC-2 | 紅燈：未知旗標被忽略、跑完 exit 0（或丟出非 CW 錯誤）；來源紀錄損壞的那一半得到 CW-E13（C50 已實作）。綠燈：每例 exit 1，輸出有一行以 `CW-E02` 開頭，含該參數的 JSON 字串字面值（`"--bogus"`、`"--help"`、`"--version"`、`"-h"`、`"-"`、`""`、`"b"`、`"upgrade"`、`"fr"`；重複、`=` 形式與缺值的例子至少含旗標名，如 `--no-setup`、`--lang`、`--author`）；`--help`、`--version`、`-h` 的訊息另含用法 `create-wxl <directory>`；`--author --repo x` 判為 `--author` 缺值；損壞的來源紀錄不改變結果（沒有任何一行以 `CW-E13` 開頭）；每例 `checkpoint` 與 `fetchArchive` 都是 0 次，fs 沒有寫入，snapshot 不變。對照組：`Upgrade`（大小寫不同）與 `--lang=zh-TW` 都 exit 0 |
| 0005-S1 | `--no-setup` 與任何一個設定旗標並用時為 CW-E02 | `create-wxl/test/run-preflight.test.mjs`，describe `--no-setup with a setup flag`；`it.each`：`--author Ada`、`--repo a/b`、`--host github-pages`、`--origin https://x.example`、`--site-name S`，各以 `--flag value` 與 `--flag=value` 兩種寫法，並各放在 `--no-setup` 之前與之後 | C03 / AC-2 | 紅燈：C02 的文法已經認得這些設定旗標，在 `--no-setup` 下被接受後忽略，exit 0。綠燈：每例 exit 1，輸出有一行以 `CW-E02` 開頭並點名該設定旗標；`parseForkInitArgs`、`checkpoint`、`fetchArchive` 都是 0 次；fs 沒有寫入，snapshot 不變 |
| 0005-S1 | 以參數給的 target 不合規則時，以 CW-E04 點名解析後的路徑與失敗條件，什麼都不寫、不下載 | `create-wxl/test/run-target.test.mjs`，describe `rejected targets`；argv `<arg> --no-setup`；`it.each`：一般檔案 `range`；指向空目錄的 symlink `range`；dangling symlink `range`（Windows 上兩者都用 `junction`）；只含 `.DS_Store` 的目錄 `range`；父目錄不存在 `missing/range`；父目錄不可寫（父目錄 chmod 0555，`skipModes` 時 skip）；與父目錄不同裝置的空目錄（替換 `fs.stat`，只對 target 回傳 `dev + 1`）；`snapshotTree` 以 `lstat` 記錄 type、mode、bytes、mtime、ino，不跟隨連結 | C07 / AC-4 | 紅燈：tracer 到 step 6 才下載（`fetchArchive` 被呼叫）；指向空目錄的 symlink 被 `stat` 跟隨而接受；一般檔案則在 `rename` 才以非 CW 錯誤失敗。綠燈：每例 exit 1，輸出有一行以 `CW-E04` 開頭，含 `JSON.stringify(resolve(deps.cwd, arg))`；七個例子去掉路徑後分成六種條件，兩個 symlink 例的訊息相同，不同條件兩兩不同（`skipModes` 時是五種）；`fetchArchive` 0 次；`checkpoint` 沒有 `step-6` 以後的呼叫；fs recorder 沒有寫入類呼叫；snapshot 不變（symlink 本身與它指向的目錄都不變） |
| 0005-S1 | 下載失敗（reject、mid-body abort、非 200、逾時）都以 CW-E07 點名 URL，target 不變，也不建立暫存目錄 | `create-wxl/test/run-download.test.mjs`，describe `download failures`；argv `range --no-setup`，target 不存在；`it.each`：`fetchArchive` 以 `new Error('ECONNRESET')` reject；以 `new DOMException('aborted', 'AbortError')` reject（mid-body abort）；resolve `{ status: 404, body: new Uint8Array() }`；`downloadTimeoutMs: 20` 時，一個尊重 signal 的 fetcher（abort 時以 `AbortError` reject）與一個永不 settle、也不理會 signal 的 fetcher；兩個逾時例的 `it` 設 `timeout: 2000` | C14 / AC-7 | 紅燈：reject 被當成非 CW 錯誤丟出；404 的空 body 被拿去解析，得到非 CW 的解析錯誤；逾時兩例沒有計時器，各在 2000 ms 時以 vitest 的 timeout 錯誤失敗。綠燈：每例 exit 1，輸出有一行以 `CW-E07` 開頭，含 `https://codeload.github.com/${source.repository}/tar.gz/${source.commit}`（由 `UPSTREAM_SLUG` 組出）；404 例含 `404`，reject 例含錯誤訊息；逾時兩例中，傳給 `fetchArchive` 的 `signal.aborted` 都是 true，`run` 在時限內結束；`fs.mkdtemp` 0 次；target 仍不存在，父目錄沒有 `.create-wxl-` 開頭的項目，snapshot 不變 |

**Notes**

- 覆寫的既有測試：無。根目錄 `vitest.config.ts` 的 `include` 只有 `tests/**/*.test.ts` 與 `chall-wasm/**/*.test.ts`，不會收進 `create-wxl/test/*.test.mjs`；沒有 `pnpm-workspace.yaml`，`create-wxl/` 用自己的 lockfile 獨立安裝。但 `tests/unit/scripts/upstream-guard.test.ts` 的真實樹掃描（T69，`git ls-files`，大小寫不同也算）會掃到 create-wxl 的每個 tracked 檔案（含 `pnpm-lock.yaml`、測試與 helper），因此 fixture 前綴（`${UPSTREAM_SLUG.split('/')[1]}-<commit>/`）、codeload URL、`other/...` repository 一律由 import 的 `UPSTREAM_SLUG` 組出，不寫出 slug。這一點以根目錄 `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` 確認仍然通過。
- 要建的 fixture／helper（都在 `create-wxl/test/helpers/`）：`buildArchive(entries, { comment })`，entries 為 `{ path, type, mode, content, mtime }`，以 `tar` 的 `Header` 與 `Pax`（global header 放 `comment`）寫原始 header，再以 `node:zlib` 的 `gzipSync` 壓縮成 `Uint8Array`，依 GitHub 的形式先放前綴目錄 entry、再放明確的目錄 entry；`PRISTINE_FIXTURE`（`CHANGELOG.md` 在 `## [Unreleased]` 之後還有版本段、`.proj.specs/OPEN-QUESTIONS.md` 含格式段＋`---`＋`## OQ-001 ` 條目、`package.json` 的 version 為 `3.0.0`、`README.md`、巢狀目錄，全部 LF）；`makeDeps(overrides)`（真正的引擎 import 自 `../../scripts/fork-init.ts`，各函式以 `vi.fn` 包裝；`source` 由測試計算，`repository` = `UPSTREAM_SLUG`、`version` = `packageVersion` = `3.0.0`、`commit` 為固定的 40 位小寫 hex、`engineSha256` 依 open question 1：A 案為 `scripts/fork-init.ts` 檔案 bytes 的 SHA-256，`deps.engineFile` 指向它；B 案為 `deps.engineSha256` 與記錄值相同；`fetchArchive`／`runGit`／`checkpoint` 為 `vi.fn`；`signals` 為 `EventEmitter`；`downloadTimeoutMs` 1000）；`recordingFs()`（包住 `node:fs/promises`，記錄 `mkdtemp`、`mkdir`、`writeFile`、`open`（寫入 flag）、`rename`、`rm`、`rmdir`、`unlink`、`chmod`、`symlink`、`copyFile` 等寫入類呼叫，可逐一替換函式注入失敗）；`makeIo()`（`PassThrough` stdin、收集文字的 stdout／stderr、`interactive: false`）；`snapshotTree(root)`（以 `lstat` 記錄 path、type、mode、bytes、mtime、ino）；`skipModes = process.platform === 'win32' || process.getuid?.() === 0`；測試暫存根目錄一律以 `realpath(mkdtemp(...))` 取得（macOS 的 tmpdir 是 symlink）。
- 假設的模組表面（隨本表一併核准）：`run` 由 `create-wxl/src/run.mjs` export（manifest 沒有 `main`／`exports`，`files` 含 `src`）；訊息表 `en`、`zh-TW` 以 id 為 key export（例如 `create-wxl/src/messages.mjs`），「只印 N1 與 N8」以 `en` 表渲染出的 N1、N8 文字比對，並檢查 N2–N7 的文字都沒有出現；測試檔為 `.test.mjs`，vitest 用 `environment: 'node'`，pool 用 vitest 4 預設的 `forks`（`process.umask(mask)` 在 worker threads 會丟 `ERR_WORKER_UNSUPPORTED_OPERATION`）。「什麼都不寫」一律以兩個條件同時判定：fs recorder 沒有寫入類呼叫，且測試暫存根目錄的 snapshot 不變。「點名某值」是指以代碼開頭的那一行出現該值的 JSON 字串字面值（不含控制字元時與 C60 的跳脫規則一致，跳脫本身由 T-0024 釘住）。open question 3 裁決之前，各列比對 stdout＋stderr 的合併文字；選 A 才拆開兩個串流比對。
- `checkpoint` 的假設：從 step 3 起，每一步開始時呼叫 `step-N`；`--no-setup` 時被跳過的 step 5、11、12 是否仍呼叫，spec 沒有說清楚，tracer 只釘住實際執行的那些步驟的相對順序（`step-3`、`step-4`、`step-6`…`step-10`、`step-13`），不釘 `step-5`／`step-11`／`step-12`。step 1–2 的拒絕列以「`checkpoint` 0 次」判定「在任何問題或 step 3 之前結束」，這個判定之所以不是恆真，是因為 tracer 已經釘住 `checkpoint` 會被呼叫。
- 對前序 ticket 的假設：只有 T-0019（已完成）——`scripts/fork-init.ts` export `parseForkInitArgs`、`runForkInit`、`deriveGithubPagesOrigin`、`ForkInitArgError`、`UPSTREAM_SLUG`，且引擎經 vitest 剝型別後可以從 `create-wxl/` 外 import（它的 `yaml` 由根目錄 `node_modules` 解析，所以本機要先在根目錄 install）。本 ticket 的 U2 manifest 不含 `prepack`、`prepublishOnly`，也沒有 `bin`、`dist/`、`prepareDist`（都屬 T-0025，C45 也在那裡驗）；`dependencies` 釘死 `tar` 與 `yaml`，`yaml` 先對齊根目錄 lockfile 的版本（X5 由 T-0025 檢查）；U3 的 CI step 到 T-0025 才加，在那之前本 ticket 的測試只在本機以 `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test` 執行。不帶 `--no-setup` 的執行（問答、引擎套用）屬 T-0022，本表不釘它在本 ticket 的行為；git 與 N2–N7 屬 T-0023；語言規則、跳脫、訊號、搬移回復、step 10 重查與 step 8–9 的 fs 失敗屬 T-0024。happy path 會實作 step 10 的重查與逐項搬移，但失敗情境不在本表。
- 與 T-0021 的重疊：tracer 對 P1–P4 結果與 `range.json` byte-equal 的斷言，是 ticket Context 指定的 happy path（C39 的「P1–P4 applied」本來就包含 P4）。T-0021 的 C23、C25、C26、C28 之中，只有 CRLF、沒有 `version`、archive 自帶 `range.json` 等邊界會出現紅燈；純 LF、沒有自帶 `range.json` 的對照情況會直接綠燈，屆時比照 T-0019 Row 4 記錄。entry 規則 1–5（含 pax `comment` 的比對）也屬 T-0021；本表的 fixture 一律帶正確的 `comment`，所以 T-0021 加上比對後，本表各列依然成立。
- 列的排序（/tdd 一列一循環）：tracer（C39/C05）→ target 三種（C06/C29）→ 版面與權限（C22）→ override（C15）→ 來源紀錄（C50）→ override 文法（C16）→ Node 版本（C01）→ 文法（C02）→ `--no-setup` 與設定旗標（C03）→ target 拒絕（C07）→ 下載失敗（C14）。C50 刻意排在 C16、C01、C02 之前，讓「來源紀錄同時損壞」的那幾例都有真正的紅燈（未實作時會得到 CW-E13），藉此釘住 step 1 → step 2（argv → override → 來源紀錄）的檢查順序。唯一沒有紅燈的是 C01 的 `22.5.0 --bogus`（C02 之前 `--bogus` 會被忽略），紀錄時註明「無紅燈，C02 之後當順序守衛」，比照 T-0019 Row 4。
- C07 的「點名條件」不釘死字句（字句屬訊息表），改以「兩個 symlink 例的條件相同、不同條件兩兩不同」判定；若使用者希望改以訊息子 id 判定，再調整。
- 第 8 階段的驗證表面：本 ticket 還沒有 `bin`，無法做 0005-S4 的終端機執行。建議以 `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test` 在 0005-S1（Node 行程內呼叫 `run`）的執行紀錄為準，並明記它不涵蓋終端機表面；0005-S4 由 T-0025 在 epic 最後一張改 create-wxl 的 ticket 上執行（見 open question 2）。

**Decisions applying to this ticket (approved 2026-10-16)**

- D1: stage 8 is the create-wxl vitest run record (0005-S1, in-process); the terminal surface (0005-S4) runs in T-0025.
- D2: `deps` gains the engine module file path; `run` reads it through `deps.fs` and compares its SHA-256 with `source.engineSha256` (the `bin` passes `dist/fork-init.mjs`, tests pass `scripts/fork-init.ts`).
- D3: CW-E and CW-W messages go to `stderr`; next-step lines go to `stdout`; tests pin the stream.

### 2026-10-16 — red → green log

Implemented by the `harness-executor` role after the two-step handoff. Reproduce a row with `pnpm --dir create-wxl exec vitest run test/<file> -t="<describe>"` (the `=` form is required: with a space, vitest's CLI reads a describe name beginning with `--` as a flag). Selected counts: row 1 2, row 2 4, row 3 1, row 4 1, row 5 8, row 6 6, row 7 8, row 8 41, row 9 20, row 10 10, row 11 5.

| Row | Test | Red | Green change |
|---|---|---|---|
| 1 C39/C05 | `run-no-setup.test.mjs` › `--no-setup tracer` | `Error: Cannot find module '../src/run.mjs'` | `run.mjs` and its modules (archive parse with `tar`'s strict `Parser`, extraction, P1–P4, move, N1/N8) |
| 2 C06/C29 | `run-target.test.mjs` › `accepted targets` | none: row 1's `moveIntoPlace` already branched on a missing vs empty target | — |
| 3 C22 | `run-no-setup.test.mjs` › `layout and modes` | none: row 1's `extractEntries` already wrote 0755/0644 by the execute bit | — |
| 4 C15 | › `test-download override` | `expected '' to match /^CW-W04/m` | override read, CW-W04 on stderr, fetched and recorded commit |
| 5 C50 | `run-preflight.test.mjs` › `package source record` | `TypeError: Cannot read properties of undefined (reading 'commit')`; others reached the throwing `fetchArchive` stub | `validateSourceRecord`, engine SHA-256 via `deps.engineFile` (D2) → CW-E13 |
| 6 C16 | › `override grammar` | broken record case gave CW-E13, expected CW-E02 | override grammar checked before the source record |
| 7 C01 | › `step 1 Node version` | rejections reached the `fetchArchive` stub; with a broken record CW-E13 instead of CW-E01 | numeric Node version check first |
| 8 C02 | › `command grammar` | 34/34 failed (unknown flags ignored; `--author=` threw `TypeError`) | strict argv grammar (`parseArgvStrict`) |
| 9 C03 | › `--no-setup with a setup flag` | 20/20 failed | the `--no-setup` exclusion rule |
| 10 C07 | `run-target.test.mjs` › `rejected targets` | 8/8 failed (`ENOTDIR`/`ENOENT`/`EACCES` from later steps; other device exit 0) | `checkTarget` with `lstat`, each condition named → CW-E04 |
| 11 C14 | `run-download.test.mjs` | 5/5 failed (uncaught rejections; 404 body parsed as `TAR_BAD_ARCHIVE`; two 2000 ms test timeouts) | `AbortController` time limit, status check → CW-E07 |

Rows 2 and 3 have no red of their own: rows 1–3 were implemented together. A mutation check in stage 6 shows they would have been red: with `moveIntoPlace` reduced to one `rename` of the temporary directory, row 2's "pre-existing empty directory" and "target is ." cases fail with `AssertionError: expected 106894805 to be 106894804` (the inode changes); with files written in the default mode, row 3 fails with `AssertionError: expected 420 to be 493`; both reverted, `diff` identical, suite green. Row 7's `--bogus` case did show a red here (the stub throws), unlike the plan's prediction.

Deviations, approved before implementation: no `bin` field and no `bin/` file (T-0025 adds them with C45/C67); output streams per D3, asserted separately.

Checks: `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test` → `Test Files 4 passed (4) / Tests 97 passed (97)`; root `pnpm test --run` → `Test Files 127 passed (127) / Tests 4191 passed | 1 skipped`; after staging the new files, `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` → `97 passed | 1 skipped` (the guard reads `git ls-files`, so it saw the new files); `git diff --stat -- pnpm-lock.yaml package.json` empty.

### 2026-10-16 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0005-S1 | `run-no-setup.test.mjs`, `run-target.test.mjs`, `run-preflight.test.mjs`, `run-download.test.mjs` (107 tests after stage 6) | not measured: no coverage provider is installed in create-wxl (adding one is a devDependency outside the approved manifest) | C01–C03, C05–C07, C14–C16, C22, C29, C39, C50 | the strict entry rules, including keeping every entry inside the temporary directory, and the P-rule failures (T-0021); step 10's re-check of the target, which this ticket's Notes placed here but which only C53 tests (T-0024); a missing directory argument (C04, T-0022: it now fails after step 2's checks rather than before them); cleanup on failure, signals, escaping of DEL/C1 and the other CW codes (T-0021–T-0024); the `bin` and a terminal run (T-0025, D1) |

**Stage 8 verification surface (D1).** The create-wxl vitest runs above, in-process through `run(argv, io, deps)`; no terminal run yet (no `bin`).

### 2026-10-16 — stages 6 and 7 disposition

One review workflow on the staged change: Standards (41 findings, none high), Spec (28, none high), security candidates (12) with an independent false-positive filter (no candidate met the threshold). Findings and their full evidence were kept with the run; ids below are that run's.

Fixed (pre-authorisation 2 and the user's "follow the recommendations", 2026-10-16), each behaviour fix test-first:

- The parent directory check follows links (a parent that is a symlink, such as macOS `/tmp`, was reported missing); the device comparison uses `stat().dev`; a parent that is a file has its own condition; only `ENOENT` from `lstat(target)` means "does not exist".
- A newly created target is `0o755` masked by the umask (red: `expected 493 to be 448` at umask 077).
- A non-numeric Node version is rejected (red: `v22.5.0` passed); one shared minimum.
- A lone `-` after a value flag is a missing value; CW-E02 says which kind of error and names `CREATE_WXL_COMMIT` as an environment variable.
- The target is resolved at step 3, after step 2's checks (red: `TypeError` before CW-E02 with no positional); a valid `--lang` selects the table for everything after argv parsing (red: N1 in English under `--lang=zh-TW`).
- N8 reads as the spec's line in both tables; CW-E07's detail is structured and rendered per language, with error text escaped; zh-TW wording.
- Tests raised to the approved plan: N1/N8 compared with the rendered text in order; `range.json` and `package.json` compared with strings built in key order; mode and inode assertions skipped on Windows and as root; junctions on Windows; every download failure checks the URL, the snapshot and the aborted signal; the override case checks the signal and all three engine functions; stdout empty on every rejection; snapshot hashes contents; the fs recorder covers every writing call.
- Cleanup: dead code and stale comments removed; shared `makeTmpRoot` and `makeFetchArchive` helpers.

Deferred by claim, recorded here: the entry rules and keeping entries inside the temporary directory (T-0021, C17–C21); step 10's re-check and cleanup on failure (T-0024, C53/C54); escaping of DEL and C1 (T-0024, C60); `bin` (T-0025). Skipped as judgment calls: splitting `run`, merging the two flag lists.

Stage 7 report: `.proj.specs/0005-create-wxl/review/security-T-0020.md`.

Checks after the fixes: `pnpm --dir create-wxl test` → `Test Files 4 passed (4) / Tests 107 passed (107)`; root `pnpm test --run` → `Test Files 127 passed (127) / Tests 4191 passed | 1 skipped`.

### 2026-10-16 — landed

Squash-merged into `main` as `8898ec5` (PR #26) under pre-authorisation 4 after all ten checks passed (`gh pr checks 26`; Cloudflare Pages preview deployed). Status set to `done`.

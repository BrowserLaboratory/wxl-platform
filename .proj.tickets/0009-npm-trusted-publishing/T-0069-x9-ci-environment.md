---
id: T-0069
title: X9 checks the CI environment
epic: 0009-npm-trusted-publishing
status: done
blocked_by: []
---

## Context

create-wxl's publish gate check X9 asked npm for the package's maintainers and the logged-in user.
When the npm login expired, at 3.0.0 (T-0029) and at 3.1.0 (T-0067), X9 either passed and let the
upload fail, or reported another maintainer. Epic 0009 moves publishing to CI (trusted publishing,
staged on npm). X9 becomes a guard: it checks that it runs in upstream's `publish-npm.yml` for the
tagged version. This ticket's PR also lands spec 0009 and records T-0068 as superseded.

## Deliverable

- `checkPublish` takes `env`. After X1–X8, X9 checks K1–K4 in order and throws `PublishError`
  `['X9']` with message XM naming the first failing condition.
- `check-publish.mjs` passes `process.env`.
- The npm helpers (`npmCommand`, `parseNpmViewMaintainers`, `createNpmView`, `createNpmWhoami`) and
  their tests are removed.
- `CHECK_EXPLANATIONS.X9` changes as specified.
- `.proj.tickets/maintenance/T-0068-x9-names-its-cause.md` lands with `status: pending`, superseded by
  epic 0009, and the branch `tickets/T-0068/x9-npm-login-message` is not merged.

## Acceptance criteria

Spec `.proj.specs/0009-npm-trusted-publishing/spec.en.md` revision 3 and `traceability.md` revision 3.

- [x] Rows K01–K13.
- [x] ACs reached: AC-1, AC-2, AC-3.
- [x] Stage 8 (RP0, S8-08), before the PR merges: `npm pkg get repository` output recorded (the
  object arrives with T-0070; here it prints `{}`, recorded as such); `node scripts/check-publish.mjs`
  in `create-wxl/` exits 1 with `checkPublish failed: ` and a named check; the PR's CI passes.

## Test plan

### 2026-11-12 — test plan table（依使用者 2026-11-12 的授權「test plan table 與新的 D 編號照你的建議核准（仍要列給我看）」核准，寫第一個測試之前）

所有案例都在 `create-wxl/test/publish.test.mjs`（0009-S1）。測試不拼出上游 slug：期望值一律從 `buildRelease` 回傳的 `upstreamSlug` 與 `version` 組出來（0005 的 Seams note）。「上游 env」指 K1～K4 都成立的 `{ GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: <slug>, GITHUB_WORKFLOW_REF: <slug>/.github/workflows/publish-npm.yml@refs/tags/v<V>, ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.example.invalid/request' }`（`publish.test.mjs` 的 `upstreamEnv`）。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0009-S1 | X1～X9 全部成立時 `checkPublish` resolve | 改寫既有的「passes when X1-X9 all hold」：拿掉 `npmView`/`npmWhoami`，改傳上游 env | K01 / AC-1 | lightweight 與 annotated 兩種 tag。預期紅燈：現行 X9 會呼叫未傳入的 `npmView` 而失敗 |
| 0009-S1 | K1 每個違反值 → XM 點名 K1 與看到的值 | 同一個 fixture 逐一跑 K02 的值，其他三項成立 | K02 / AC-1 | 未設、`''`、`'false'`、`'TRUE'`、`'true '`、布林 `true`（→ `unset`）。訊息整行逐字比對（字面值來自 traceability 的 XM 與 K1 cause text）。預期紅燈 |
| 0009-S1 | K2 每個違反值 → XM 點名 K2 | 同上，K02 的 fixture 共用 | K03 / AC-1 | 未設、`''`、別的 repository、slug 全小寫（大小寫敏感）、數字（→ `unset`）。預期紅燈 |
| 0009-S1 | K3 每個違反值 → XM 點名 K3 | 同上 | K04 / AC-1 | 未設、`''`、`release.yml@refs/tags/v<V>`、`publish-npm.yml@refs/heads/main`、`publish-npm.yml@refs/tags/v<其他版本>`、別的 repository 前綴、布林（→ `unset`）。預期紅燈 |
| 0009-S1 | K4 每個違反值 → XM 點名 K4 | 同上 | K05 / AC-1 | 未設、`''`、`'  '`、`'\n'`（訊息仍是一行，看到的值是 JSON 的 `"\n"`）、數字（→ `unset`）。預期紅燈 |
| 0009-S1 | `env` 本身不是可用物件 → 一律 K1 與 `unset`，結尾是代入版本的 closing sentence | 同上 | K06 / AC-2 | `{}`、`undefined`、`null`、字串、陣列（另加上 K1～K4 四個自有屬性，確認陣列仍算空）、從 prototype 繼承 K1～K4 的物件。預期紅燈 |
| 0009-S1 | 多項違反時只點名第一項 | 同上 | K07 / AC-1 | K1 與 K3 同時違反 → 訊息含 `K1:`，不含 K3 的 cause text。預期紅燈 |
| 0009-S1 | X1～X8 的違反先於 X9 拋出 | 兩個案例，env 都是 `{}` | K08 / AC-3 | X1（第一項，`module: {}`）與 X8（緊鄰 X9，竄改 `dist/source.json`）。確認型：現行實作 X1～X8 本來就在 X9 之前 |
| 0009-S1 | 多傳 `npmView`/`npmWhoami` 不影響結果 | 上游 env 加上會丟錯的 `npmView` 與 `npmWhoami` | K09 / AC-3 | 兩個函式被呼叫就丟錯，結果仍 resolve，而且兩者都沒被呼叫。預期紅燈 |
| 0009-S1 | X1～X8 各自照 0005 的 C42 失敗 | 既有 X1～X8 全部案例改傳上游 env，拿掉 npm 參數 | K10 / AC-3 | 既有的每一列都保留，期望的 `checks` 不變。改寫時應維持綠燈（迴歸） |
| 0009-S1 | 接線與移除的靜態檢查 | 讀四個檔案的文字，import `publish-io.mjs` 的匯出 | K11 / AC-3 | `check-publish.mjs` 含 `env: process.env`；`publish-io.mjs` 的匯出恰好是 `createArchive`、`gitRevParseHead`、`spawnCapture`、`spawnCaptureBytes`；前三個檔案不含 `npmCommand`、`'npm'`、`npm.cmd`、`npmView`、`npmWhoami`；`test/publish-io.test.mjs` 不含四個被移除的匯出名稱。預期紅燈 |
| 0009-S1 | CI 的兩種 checkout 形狀下 X3、X4、X6、X7 成立 | 從 fixture 完整 clone、detach 在 `v<V>`，`origin/main` 存在，在 clone 裡跑 `prepareDist` 與 `checkPublish`（上游 env） | K12 / AC-3 | (a) clone 帶來的 annotated tag，`ls-remote` 回報 annotated；(b) 本地改成 lightweight tag，`ls-remote` 仍回報 annotated（tag 物件 sha 加 `^{}` 行）。兩者都 resolve。紅燈來自 X9（新 env 參數），X3～X7 的部分是確認型 |
| 0009-S1 | `CHECK_EXPLANATIONS.X9` 與預設訊息 | 讀常數、`new PublishError(['X9'])` | K13 / AC-1 | 文字等於 `not running in the upstream publish workflow for this version`；訊息等於 `X9 (<那段文字>)`。預期紅燈 |

### 2026-11-12 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0009-S1 | `publish.test.mjs`：`checkPublish` 的「passes」兩列（K01）；`checkPublish X9 (0009 K1-K4)` 的 K02 六列、K03 五列、K04 七列、K05 五列、K06 六列、K07、K09；`0009 K08` 兩列；`0009 K12` 兩列；`0009 K13`；`0009 K11` 六列；既有 X1～X8 案例（K10） | not measured：create-wxl 沒有安裝 coverage provider | K01～K13；AC-1、AC-2、AC-3。重現：`pnpm --dir create-wxl test`（`aa5072b` → `Tests 750 passed \| 1 skipped (751)`） | `check-publish.mjs` 真的以 `process.env` 執行到 X9 的路徑沒有自動測試：本機跑會先停在 X3／X6（tag 不在 HEAD、`ls-remote` 連網）。K11 用靜態讀檔鎖住接線，CI 上的實際執行是 T-0073 的 S8-01 |

## 給使用者（zh-TW）

把 X9 從「問 npm 誰是維護者、誰登入了」改成「確認自己是在上游的 `publish-npm.yml`、為這個版本執行」。

- 失敗訊息固定一行：點名第一個不成立的條件、看到的值，最後一句說明 create-wxl 只能怎麼發布。
- npm 相關的輔助函式與測試一併移除。
- 這張票的 PR 同時讓 spec 0009 落地，並把 T-0068 記成「由本 epic 取代」（`pending`），它的分支不合併。

## Comments
- 2026-11-12, stage 5: commit `9f2d443` (code and tests together; the red runs were local, one
  cycle at a time, each with `npx vitest run test/publish.test.mjs -t "<row>"` in `create-wxl/`):
  - Red before the change: K01 (both rows: `X9 (the npm name is already maintained by someone
    else)`), K02 (6), K03 (5), K04 (7), K05 (5), K13 (1), K11 (5 of 6; `src/publish.mjs` already
    named no npm helper).
  - Passed when written (confirmation tests), with the reason:
    - K06: `ownStrings`' guard for a non-object or array `env` came with K02's implementation.
      A mutation check (removing the array and own-property guard) turned the array and prototype
      rows red, and restoring it turned them green.
    - K07: the ordered loop from K02 already stopped at the first failure.
    - K08: X1–X8 already ran before X9.
    - K09: K01's change already stopped calling npm.
    - K12: `env` existed since K01, and X3–X7 already held on both checkout shapes.
  - K10: the existing X1–X8 rows now pass the upstream `env` and stay green. The three old X9
    tests (another maintainer, `npmWhoami` failing, `npmView` failing) were removed with the
    behaviour they tested.
  - `pnpm --dir create-wxl test` at `9f2d443` → `Tests 748 passed | 1 skipped (749)`;
    `pnpm test --run` → `Test Files 136 passed (136) / Tests 4860 passed | 1 skipped (4861)`.
- 2026-11-12, stage 6 (workflow `wf_dadf1e11-e7f`; local note
  `.proj.research/2026-11-12-T-0069-stage6-review.md`): Standards 15 findings (0 high, 2 medium),
  Spec 16 (0 high, 1 medium). Each finding was challenged by `harness-challenger`: 1 refuted, 13
  partly, the rest stand. T0069-SPEC-07's challenger failed on its output format, so the finding
  was recovered from the workflow journal and kept. Applied under the user's authorisation of
  2026-11-12 ("第 6～8 階段發現的處置"):
  - Fixed in `aa5072b`:
    - X9's conditions are named objects checked with `for…of` (SMELL-04);
    - `ownString` reads each variable once, and a read that throws counts as unset, with a new
      test (T0069-SPEC-05, red first);
    - a new test for `env` left out of the call (T0069-SPEC-14, a confirmation);
    - K11 compares the whole line `env: process.env,` (STD-09, T0069-SPEC-08);
    - `cloneDetachedAtTag` removes its folder when a git step fails, and `cleanupClone` and
      `linkNodeModules` replace the copies (STD-08, SMELL-01);
    - the comments and JSDoc name spec 0009's X9 and say `publish-npm.yml` comes with T-0071
      (STD-05, STD-06, T0069-SPEC-12, T0069-SPEC-13), and the deviation note names T-0025
      (STD-10);
    - the shared fixture's comment says that rows never mutate it (STD-07).
  - Fixed in this record:
    - `status: review`, and the met criteria are checked (STD-01, T0069-SPEC-01);
    - this stage 5 entry, with its commands (STD-02, T0069-SPEC-02);
    - the test plan's upstream `env` names the URL the tests use (STD-04, T0069-SPEC-03).
  - Recorded, not changed:
    - STD-03: the Traditional Chinese test plan and coverage tables follow T-0062 to T-0068 and
      the user's instruction of 2026-11-12 that documents are in Taiwan Traditional Chinese;
      `docs/agents/language.md` is not changed by this ticket;
    - SMELL-02, SMELL-03: the thrown-error idioms and K06's closing-sentence check (AC-2 names
      it) stay;
    - T0069-SPEC-04: K08 uses X1 and X8, the first and the one next to X9, and K10 runs every
      X1–X8 row;
    - T0069-SPEC-06: a function `env` is a non-object, so it counts as empty;
    - T0069-SPEC-07: a value holding U+2028, U+2029 or U+0085 keeps that character after
      `JSON.stringify`, so XM may break a line in some viewers. The spec fixes `JSON.stringify`,
      and GitHub's variables never hold these characters. Known limitation;
    - T0069-SPEC-09: the run with the real `process.env` reaching X9 is T-0073's S8-01;
    - T0069-SPEC-10: T-0068's record (`pending`) is on this branch from `b50ca6e` and lands with
      this PR;
    - T0069-SPEC-11: 0005's X9 row, D4 and 0005-S2 are T-0072's DS1;
    - T0069-SPEC-15: the fixed values differ from the upstream slug and version;
    - T0069-SPEC-16: the test plan table is listed to the user in the conversation of
      2026-11-12;
    - STD-11 was refuted: the zh-TW section's 維護者 names npm's `maintainers` field, not the
      upstream maintainer, which the vocabulary rule covers.
  - After the fixes: `pnpm --dir create-wxl test` at `aa5072b` → `Test Files 37 passed (37) /
    Tests 750 passed | 1 skipped (751)`.
- 2026-11-12, stage 7 (workflow `wf_c051482c-4a5`): report
  `.proj.specs/0009-npm-trusted-publishing/review/security-T-0069.md`. 8 candidates, all judged
  false positives (severity none) by independent reviewers; nothing to fix. Two observations go to
  the epic close-out's chain analysis: `npm publish <tarball>` bypasses the gate like
  `--ignore-scripts` (SEC-02), and X9 can be spoofed locally (SEC-01, SEC-05), so MN1, MN3 and
  RP5 carry the defence.
- 2026-11-12, stage 8, terminal part (RP0 (a), (b); surface: a terminal on macOS darwin arm64,
  Node v24.13.0, npm 11 on `PATH`, git 2.54.0, at `aa5072b`), after
  `pnpm --dir create-wxl install --frozen-lockfile`, in `create-wxl/`:
  - (a) `npm pkg get repository` → `{}`, exit 0 (MR1's object arrives with T-0070).
  - (b) `node scripts/check-publish.mjs` → `checkPublish failed: X8 (dist/ or LICENSE does not
    match HEAD)`, exit 1 (no `dist/` yet). With `node scripts/prepare-dist.mjs` first →
    `checkPublish failed: X3 (no local tag v<version> exists at HEAD)`, exit 1.
  - Afterwards `create-wxl/dist/` and `create-wxl/LICENSE` were removed; `git status` showed only
    this record.
- 2026-11-12, stage 8, CI part (RP0 (c); surface: GitHub Actions on PR #82, push `a732c0d`, run
  `43237760085`, checked with `gh pr checks 82`): 10 of 10 passed: `test`, `build`, `prose-audit`,
  `site-smoke`, `challenge-verify`, the four `fork-init-cross-os` jobs (macOS 24, Ubuntu 22 and
  24, Windows 24; each runs `pnpm --dir create-wxl test`) and Cloudflare Pages. The workflow tests
  of W01–W12 arrive with T-0071; here the CI runs this ticket's tests and the existing workflow
  tests. Stage 8 is complete: RP0 (a), (b) and (c) are recorded.
- 2026-11-12, landed: PR #82 squash-merged into `main` as `08c2b14` by the user (14:44 UTC), after
  CI passed 10 of 10 on both pushes (`a732c0d`, run `43237760085`; `ba830be`, checked with
  `gh pr checks 82`). The squash message is GitHub's default list of the branch's commits, each
  generated with `/tw-emoji-commit`. Status set to done.

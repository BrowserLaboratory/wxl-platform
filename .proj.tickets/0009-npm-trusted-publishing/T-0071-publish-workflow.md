---
id: T-0071
title: The publish-npm workflow and its static tests
epic: 0009-npm-trusted-publishing
status: done
blocked_by: [T-0070]
---

## Context

Spec 0009's D3 makes a new workflow, `publish-npm.yml`, the only place that publishes create-wxl:
on a pushed `v*` tag it runs the ancestry guard and the publish gate, then stages on npm through
OIDC. Its shape is fixed in traceability ("The workflow", W1–W8). It needs MR1's `repository`
(T-0070), and W11's rebrand fixture reads that manifest.

## Deliverable

- `.github/workflows/publish-npm.yml` exactly as specified, with the pins and trailing comments of
  `release.yml` and one exact npm 11.y ≥ 11.15.
- `upstream-only-jobs.test.ts` covers the new job and its comments count six `format(…)` across
  three files.
- `trigger-branches.test.ts`'s comment names `publish-npm.yml`.
- T52 covers the new `if:` line (W10) and, with `create-wxl/package.json` in its fixture, the rebrand
  of its `repository.url` (W11).
- A temporary-repository test shows the ancestry command's exit codes (W12).

## Acceptance criteria

Spec 0009 revision 3.

- [x] Rows W01–W12.
- [x] ACs reached: AC-4, and AC-5's W11.
- [x] Stage 8 (RP0, S8-08), before the PR merges: `npm pkg get repository` prints MR1's object;
  `node scripts/check-publish.mjs` exits 1 with a named check; the PR's CI passes, including the
  workflow tests. No `v*` tag is pushed (D10).

## Test plan

### 2026-11-12 — test plan table（依使用者 2026-11-12 的授權「test plan table 與新的 D 編號照你的建議核准（仍要列給我看）」核准，寫第一個測試之前）

0009-S2：workflow 用 `yaml` 解析，也讀原始文字。新測試檔是 `tests/unit/workflows/publish-npm.test.ts`。npm 的版本選 `11.21.2`：11 系列目前最新的版本（`next-11`），符合 W5 的 y ≥ 15。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0009-S2 | 觸發條件恰好是推送 `v*` tag | `publish-npm.test.ts` | W01 / AC-4 | `on` 深度相等 `{ push: { tags: ['v*'] } }`，沒有 `pull_request`、branches、`workflow_dispatch`。預期紅燈（檔案還不存在） |
| 0009-S2 | 只有一個 job `stage`，`if:` 與 `release.yml` 的 `release` job 相同 | 同上 | W02 / AC-4 | `Object.keys(jobs)` 等於 `['stage']`；`if:` 逐字相等 |
| 0009-S2 | 權限、concurrency、environment | 同上 | W03 / AC-4 | 頂層 `permissions` 深度相等 `{}`；`concurrency` 深度相等 `{ group: 'publish-npm', 'cancel-in-progress': false }`；`environment` 是 `npm`；job 的 `permissions` 深度相等 `{ contents: 'read', 'id-token': 'write' }` |
| 0009-S2 | 三個 action 的 pin、版本註解與 `with` | 同上 | W04 / AC-4 | 每個 `uses` 等於 `release.yml` 中同一個 action 的 `uses`；原始文字中，`uses:` 那一行從 `uses:` 起與 `release.yml` 對應那行逐字相同（包括 `# vN…` 註解）；checkout 的 `with` 深度相等 `{ 'fetch-depth': 0, 'persist-credentials': false }`，pnpm 沒有 `with`，setup-node 深度相等 `{ 'node-version': 24, 'package-manager-cache': false }` |
| 0009-S2 | 第 4 步安裝一個確切的 npm 11.y.z，y ≥ 15 | 同上 | W05 / AC-4 | 符合 `^npm install --global npm@11\.(\d+)\.(\d+)$` 且 y ≥ 15；前三步沒有任何 `run` 以 `npm ` 開頭 |
| 0009-S2 | 恰好八步，順序與指令逐字 | 同上 | W06 / AC-4 | 第 1～3 步依序是 checkout、pnpm、setup-node；第 4～8 步的 `run` 逐字；第 7、8 步 `working-directory: create-wxl`，第 1～6 步沒有 |
| 0009-S2 | 原始文字不含禁用字串，沒有 `cache` 鍵 | 同上 | W07 / AC-4 | W7 列出的 14 個字串都不出現；拿掉所有 `npm stage publish` 之後不再含 `npm publish`；沒有任何一步的 `with` 有 `cache` 鍵 |
| 0009-S2 | 鍵的集合是封閉的 | 同上 | W08 / AC-4 | workflow 的鍵恰好是 `{name, on, permissions, concurrency, jobs}`；job 的鍵恰好是 `{if, runs-on, environment, permissions, steps}`，`runs-on` 是 `ubuntu-latest`；每一步的鍵是 `{uses, with?, name?}` 或 `{run, working-directory?, name?}` 的子集，而且一定有 `uses` 或 `run` 其中之一 |
| 0009-S2 | 祖先檢查指令的結束碼 | 同上，暫存 git repository | W12 / AC-4 | 指令從 workflow 第 5 步讀出來執行；`main` 上的 commit（含 `origin/main` 本身與它的祖先）→ exit 0；不在 `main` 上的 commit → exit 1。確認型（git 本身的行為） |
| 0009-S2 | 上游限定測試涵蓋新 job | `upstream-only-jobs.test.ts`、`trigger-branches.test.ts` | W09 / AC-4 | `publish-npm.yml` 的 `jobs.stage.if` 等於 `EXPECTED_IF`，而且沒有 `env`；檔頭註解的 `format(…)` 次數寫成三個檔案共六次；`trigger-branches.test.ts` 的 "Tag-driven work belongs to release.yml" 一併寫出 `publish-npm.yml`。預期紅燈 |
| 0009-S2 | rebrand 不動新 workflow 的 `if:` 行 | `fork-init.test.ts` 的 T52 | W10 / AC-4 | fixture 加入真的 `publish-npm.yml`；上游限定的 `if:` 行共三行，rebrand 前後逐字相同。預期紅燈 |
| 0009-S2 | rebrand 之後 create-wxl 的 `repository.url` 仍等於根的 | T52 的 fixture 加入真的 `create-wxl/package.json` | W11 / AC-5 | rebrand（`--repo me/x`）前兩者相等且是上游 URL；rebrand 後 create-wxl 的 `repository.url` 等於根 manifest 新的 `repository.url`，而且不再是上游的。預期：確認型（rebrand 的全樹替換本來就會改這一行） |

### 2026-11-12 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0009-S2 | `tests/unit/workflows/publish-npm.test.ts`：W1～W8 共 24 個（W4 三個 action 各一、W7 十三個字串各一），另有 `exists` 一個與 W7 之外的「沒有 `${{ }}`」一個，W12 三列；`upstream-only-jobs.test.ts` 新增三個；`trigger-branches.test.ts` 的註解；`fork-init.test.ts` 的 T52（W10、W11） | not measured：YAML 與原始文字的靜態檢查，沒有 coverage 可量。重現（repo 根目錄）：`pnpm vitest run tests/unit/workflows tests/unit/scripts/fork-init.test.ts` | W01～W12；AC-4、AC-5 的 W11 | workflow 真的在 GitHub Actions 上執行（OIDC、environment `npm`、`npm stage publish`）只能在 T-0073 的 S8-01 驗證：npm 沒有測試用的 staging 目標（O3），而且依 D10 本票不推 tag。fork 上 job 被跳過也只有靜態證據（B3） |

## 給使用者（zh-TW）

新增 `publish-npm.yml`：推送 `v*` tag 時，先確認 commit 在 `main` 上，跑發布閘門，再經由 OIDC 送進 npm 的 staged。

- workflow 的每一個鍵、步驟與 pin 都照 spec 固定，並用靜態測試釘住。
- 測試也涵蓋：只在上游執行、rebrand 不會動到它、祖先檢查指令的結果。
- 這張票不推任何 tag。

## Comments
- 2026-11-12, stage 5: commit `dac0b20`, on a branch cut from T-0070's tip `c1e535f` while PR #84
  ran its CI, to be rebased onto `main` once #84 lands. npm `11.21.2` was chosen for step 4: the
  newest 11.x (`npm view npm dist-tags` → `next-11: 11.21.2`, published 2026-11-04), with
  `engines.node` `^20.17.0 || >=22.9.0` (`npm view npm@11.21.2 engines`), so Node 24 runs it.
  - W01–W08 (`pnpm vitest run tests/unit/workflows/publish-npm.test.ts` at the repository root):
    all 28 tests (24 for W1–W8, 1 `exists`, 3 for W12) red (`ENOENT … publish-npm.yml`) before the file existed, green after it. The
    workflow is one artifact fixed key by key by traceability, so it went in as one step rather
    than key by key.
  - Mutation checks, each turning at least one test red and then restored:
    `cancel-in-progress: true`; `cache: pnpm` in place of `package-manager-cache: false`;
    `npm@11.14.1`; a job-level `env:`; `npm publish` in place of `npm stage publish`; the
    checkout's comment `# v6` in place of `# v6.0.2`.
  - W12: confirmation (git's own behaviour): exit 0 at `origin/main` and at its ancestor, exit 1
    off `main`.
  - W09, W10: passed when written, since the workflow was already in place from W01–W08; W11:
    passed when written, as planned (rebrand's tree-wide swap rewrites the url line).
  - `pnpm test --run` at `dac0b20` → `Test Files 137 passed (137) / Tests 4909 passed | 1 skipped
    (4910)`.
  - No `v*` tag was pushed (D10).
- 2026-11-12, stage 6 (workflow `wf_9ff899bd-f0d`; local note
  `.proj.research/2026-11-12-T-0071-stage6-review.md`): Standards 21 findings (0 high, 3 medium),
  Spec 13 (0 high). Challenged by `harness-challenger`: STD-09, STD-11, STD-13, S-05, S-06
  refuted; S-09's challenger failed and the finding is kept. Applied under the user's authorisation
  of 2026-11-12:
  - The red evidence per rule (STD-01, STD-02, S-02). Every W rule, W09 and W10 now has a mutation
    that turns its own test red; each was applied to `.github/workflows/publish-npm.yml` alone,
    run with `pnpm vitest run tests/unit/workflows tests/unit/scripts/fork-init.test.ts` at the
    repository root, and restored (a throwaway script in the session's scratchpad, not
    committed; each mutation is the exact edit named below):

    | Row | Mutation | Test that turned red |
    |---|---|---|
    | W1 | add `workflow_dispatch:` | `W1: triggers only on pushed v* tags` |
    | W2 | rename job `stage` → `publish` | `W2: has exactly one job, stage, …` (and every test reading `jobs.stage`) |
    | W3 | `permissions: read-all`; `environment: npm-x`; `id-token: read` | `W3: grants nothing at the top, …` (each) |
    | W4 | drop `persist-credentials: false`; give pnpm `with: version` | `W4: each action's with is exactly as specified` (each) |
    | W4 | checkout comment `# v6` | `W4: actions/checkout uses release.yml's pin and version comment` (stage 5) |
    | W5 | `npm@latest`; `npm@11.14.1` (stage 5) | `W5: step 4 installs one exact npm 11.y.z …` |
    | W6 | swap steps 5 and 6; step 6 gains `working-directory` | `W6: exactly eight steps, …` |
    | W7 | a comment `# secrets.X`; `npm stage publish --provenance` | `W7: the raw file never contains secrets.` / `… --provenance` |
    | W8 | job gains `timeout-minutes`; a run step gains `shell: bash` | `W8: the workflow, job and step key sets are closed` |
    | W09 | `if:` owner changed; job gains `env` | `publish-npm.yml's stage job if: …`, `… sets no env`, the six-count |
    | W10 | the `if:` line removed | T52 (`--author x --rebrand acme --repo me/x …`) |
    | W12 | the command reversed (`origin/main HEAD`) | the three `exits as expected at …` rows and W6 |

    The workflow went in as one artifact, after its 28 tests were written; this table is the
    per-rule evidence the single red run (`ENOENT`) did not give.
  - Fixed in `5baae82`:
    - W12 runs step 5 only once it equals the specified command (security review C11), uses its
      own temporary home and the real environment minus `GIT_DIR`, `GIT_INDEX_FILE` and
      `GIT_WORK_TREE`, and throws on a failed setup command (SMELL-03, SMELL-04, S-13);
    - a check beyond W7: no `${{ }}` expression in the file (S-07);
    - T52's title names W11, and it checks that `publish-npm.yml` holds one `if:` line and that
      W11 starts from the upstream URL (STD-14, SMELL-01, S-09);
    - the workflow's header says "approves it with 2FA", names `release.md` as T-0072's, and says
      the OIDC token is the job's only credential (STD-08, STD-10, S-03);
    - `upstream-only-jobs.test.ts`'s header names the stage job and cites W8 for "no env";
      `toolchain-parity.test.ts` says `publish-npm.yml` is outside its set (STD-12, STD-15, S-08);
    - the `exists` test is labelled a guard (SMELL-06).
  - Fixed in this record: the counts (24 + 1 + 3; STD-04, S-11).
  - Recorded, not changed:
    - S-01, STD-13: the new `publish-npm.test.ts` holds W01–W08 and W12 instead of extending
      `fork-template-parity.test.ts`. That test compares the deploy template with a frozen
      fixture; W4 compares `publish-npm.yml` with `release.yml`, so it reuses the raw-text
      approach in its own file. The Testing Decision's three named files still change where they
      apply (`upstream-only-jobs.test.ts`, T52);
    - S-04: comments outside the listing are not keys, so W8 is unaffected; they follow
      `release.yml`'s convention and pass W7;
    - S-10: the six-count goes beyond W09 and counts comments too, by design;
    - STD-06: the Traditional Chinese tables follow T-0069's STD-03;
    - STD-07, S-12: the test plan was listed to the user in the conversation of 2026-11-12, under
      the authorisation covering T-0069 to T-0073;
    - STD-05: the rebase onto `main` is recorded below with the new SHAs;
    - SMELL-02, SMELL-05: shared workflow loaders and a constant of upstream-only paths are left
      for a later cleanup; the counts are spec-mandated;
    - S-05: npm 11.21.2 stands (`next-11` is npm's tag for its newest 11.x; `latest` is 12.x);
    - S-06, STD-09, STD-11 were refuted.
  - After the fixes, at `5baae82`: `pnpm vitest run tests/unit/workflows
    tests/unit/scripts/fork-init.test.ts` → `Tests 1979 passed (1979)`.
- 2026-11-12, stage 7 (workflow `wf_62398c34-002`, run on `c14c99a` alongside stage 6): report
  `.proj.specs/0009-npm-trusted-publishing/review/security-T-0071.md`. 11 candidates, all judged
  false positives; C11's test hardening is in `5baae82`. C1 (`origin/main` is an unqualified ref,
  so a tag named `origin/main` would shadow it) and C7 (MN2 before any `v*` tag) go to the epic
  close-out and to T-0072's `release.md`.
- 2026-11-12, rebased onto `main` `7474cca` (after #84 and #85) with `git rebase --onto origin/main
  c1e535f`: `dac0b20` → `61f3408`, `c14c99a` → `b31d11f`, `5baae82` → `8c684b0`, and the stage 6–7
  record → `101d324`. At `101d324`: `pnpm test --run` → `Test Files 137 passed (137) / Tests 4910
  passed | 1 skipped (4911)`; `pnpm --dir create-wxl test` → `Tests 753 passed | 1 skipped (754)`.
- 2026-11-12, stage 8, terminal part (RP0 (a), (b); surface: a terminal on macOS darwin arm64,
  Node v24.13.0, git 2.54.0, at `101d324`), after `pnpm --dir create-wxl install
  --frozen-lockfile`, in `create-wxl/`:
  - (a) `npm pkg get repository` → MR1's object (`type` `git`, the root manifest's URL,
    `directory` `create-wxl`), exit 0.
  - (b) `node scripts/prepare-dist.mjs && node scripts/check-publish.mjs` → `checkPublish failed:
    X3 (no local tag v<version> exists at HEAD)`, exit 1.
  - Afterwards `create-wxl/dist/` and `create-wxl/LICENSE` were removed. No `v*` tag was pushed.
- 2026-11-12, stage 8, CI part (RP0 (c); surface: GitHub Actions on PR #86, push `4c84f51`, run
  `43249239624`, checked with `gh pr checks 86`): 10 of 10 passed. The `test` job runs `pnpm test --run`,
  which holds the workflow tests of W01–W12 (`tests/unit/workflows/publish-npm.test.ts`,
  `upstream-only-jobs.test.ts`, `trigger-branches.test.ts`, and T52 in
  `tests/unit/scripts/fork-init.test.ts`); the four `fork-init-cross-os` jobs run T52 too. The new
  workflow itself did not run: no `v*` tag was pushed (D10). Stage 8 is complete: RP0 (a), (b) and
  (c) are recorded.
- 2026-11-12, landed: PR #86 squash-merged into `main` as `78b9963`, with a message generated by
  `/tw-emoji-commit`, after CI passed 10 of 10 on both pushes (`4c84f51`, run `43249239624`;
  `6dcff88`, run `43250039911`). `publish-npm.yml` is on `main` from here; no `v*` tag is pushed until
  T-0073 (D10). Status set to done.

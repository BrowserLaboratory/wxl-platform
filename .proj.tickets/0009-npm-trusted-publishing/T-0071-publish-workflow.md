---
id: T-0071
title: The publish-npm workflow and its static tests
epic: 0009-npm-trusted-publishing
status: review
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
- [ ] Stage 8 (RP0, S8-08), before the PR merges: `npm pkg get repository` prints MR1's object;
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
| 0009-S2 | `tests/unit/workflows/publish-npm.test.ts`：W1～W8 共 25 個（W4 三個 action 各一、W7 十三個字串各一）、W12 三列；`upstream-only-jobs.test.ts` 新增三個；`trigger-branches.test.ts` 的註解；`fork-init.test.ts` 的 T52（W10、W11） | not measured：YAML 與原始文字的靜態檢查，沒有 coverage 可量。重現（repo 根目錄）：`pnpm vitest run tests/unit/workflows tests/unit/scripts/fork-init.test.ts` | W01～W12；AC-4、AC-5 的 W11 | workflow 真的在 GitHub Actions 上執行（OIDC、environment `npm`、`npm stage publish`）只能在 T-0073 的 S8-01 驗證：npm 沒有測試用的 staging 目標（O3），而且依 D10 本票不推 tag。fork 上 job 被跳過也只有靜態證據（B3） |

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
    all 28 tests red (`ENOENT … publish-npm.yml`) before the file existed, green after it. The
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

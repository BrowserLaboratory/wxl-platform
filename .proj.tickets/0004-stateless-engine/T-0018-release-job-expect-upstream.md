---
id: T-0018
title: Set WXL_EXPECT_UPSTREAM on the release job
epic: 0004-stateless-engine
status: done
blocked_by: [T-0017]
---

## Context

Epic 0004's chain analysis (`.proj.specs/0004-stateless-engine/review/chain-analysis.md`, chain D and N-3) found that spec B3 says, for an upstream organisation renamed in letter case only, "`WXL_EXPECT_UPSTREAM` makes the tests fail" — but the variable is set only on `quality-gates.yml`'s `test` job and the cross-OS job, not on `release.yml`'s `release` job, which is the job that publishes a release and runs `pnpm test --run` before doing so. In that case the release job's upstream-only tests skip instead of failing. The user decided on 2026-10-16 (option A) to close it here.

Spec: row T71 in `traceability.md` revision 2.3 (T71 now also requires the `release` job's `env`; T52 covers that line through "the `env` of T71").

## Deliverable

The `release` job in `.github/workflows/release.yml` carries `env.WXL_EXPECT_UPSTREAM` exactly as T71 states, pinned by `tests/unit/workflows/upstream-only-jobs.test.ts`; the rebrand test T52 also checks that line stays byte-identical.

## Acceptance criteria

- [x] T71: the `release` job's `env.WXL_EXPECT_UPSTREAM` is exactly T71's string (S4)
- [x] T52: a rebrand run leaves the release job's `WXL_EXPECT_UPSTREAM` line byte-identical (S1)

## 給使用者（zh-TW）

release job 補上 `WXL_EXPECT_UPSTREAM`，讓 spec B3 說的「上游組織只改大小寫時，upstream-only 測試會失敗而不是略過」在真正發布 release 的 job 上也成立；並讓 rebrand 測試一併守住這一行。

## Comments

### 2026-10-16 — test plan table (approved by the user before the first test)

Approved by the user on 2026-10-16, quoted verbatim: "核准".

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0004-S4 | `release.yml` 的 `release` job，`env.WXL_EXPECT_UPSTREAM` 完全等於 T71 的字串 | `tests/unit/workflows/upstream-only-jobs.test.ts` 新增一個 it，用既有的 `EXPECTED_ENV`（以 `format()` 組成，原始碼不出現完整 slug） | T71 / AC-C2 | 紅燈：補 env 之前，這個 it 失敗（值是 `undefined`）；比對解析後的字串，完全相等 |
| 0004-S1 | rebrand 執行後，release job 的 `WXL_EXPECT_UPSTREAM` 那一行前後 byte-identical（覆寫既有測試，見 Notes） | `fork-init.test.ts` 的 T52：收集 `WXL_EXPECT_UPSTREAM` 行時，也收 `release.yml`；正向對照的數量從 2 改成 3 | T52 / AC-B3 | 補 env 之前改測試：數量斷言失敗（2 ≠ 3）；補 env 之後通過；其他斷言不變 |
| 0004-S5 | 命令紀錄：組織名稱只差大小寫時，帶 env 的 upstream-guard 測試會失敗 | 真實 tree；指令與輸出記在 ticket | T71 / AC-C2 | `GITHUB_REPOSITORY=browserlaboratory/WXL-PLATFORM WXL_EXPECT_UPSTREAM=true pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` → exit ≠ 0；同一指令不帶 `WXL_EXPECT_UPSTREAM` → exit 0（只會略過），對照出 release job 補 env 前後的差異 |

**Notes**

- **覆寫的既有測試**：只有 T52（`fork-init.test.ts` 的 `--author x --rebrand acme --repo me/x … byte-identical`）：收集 `WXL_EXPECT_UPSTREAM` 行的範圍加上 `release.yml`，正向對照的數量改成 3。其他既有測試的 body 都不改。
- `release.yml` 的 env 放在 job 層級，寫法和 `quality-gates.yml` 的兩處相同；註解沿用那裡的說法。
- release job 只在推 tag 時執行，PR 的 CI 跑不到它；第 8 階段以上面的 S4 斷言、命令紀錄與 PR 的 CI（`upstream-only-jobs.test.ts` 會在 `test` job 裡執行）為準。

### 2026-10-16 — red → green log

**Row 1 (0004-S4, `upstream-only-jobs.test.ts`).**

- Red: added one `it` ("release.yml's release job sets WXL_EXPECT_UPSTREAM to the same comparison") beside the existing env tests, asserting `loadRelease().jobs.release.env?.WXL_EXPECT_UPSTREAM` equals `EXPECTED_ENV`. Before the change to `release.yml`:
  `AssertionError: expected undefined to be '${{ github.repository == format(\'{0}...' // Object.is equality — Expected: "${{ github.repository == format('{0}/{1}', 'BrowserLaboratory', 'wxl-platform') }}" — Received: undefined`
- Change: added a job-level `env: WXL_EXPECT_UPSTREAM: ${{ github.repository == format('{0}/{1}', 'BrowserLaboratory', 'wxl-platform') }}` to the `release` job in `release.yml`, with the same three-line comment `quality-gates.yml`'s `test` job carries (T-0011, "must fail, not silently skip").
- Green: `Test Files 1 passed (1) / Tests 1 passed | 11 skipped (12)`.
- Reproduce: `pnpm vitest run tests/unit/workflows/upstream-only-jobs.test.ts -t 'release.yml'\''s release job sets WXL_EXPECT_UPSTREAM to the same comparison'` — selects 1 test.
- `pnpm vitest run tests/unit/workflows/` afterwards: `Test Files 5 passed (5) / Tests 46 passed (46)` — toolchain-parity and the other workflow tests stayed green.

**Row 2 (0004-S1, `fork-init.test.ts` T52, approved override).**

- Change made first (approved override): in T52's body, `expectUpstreamLinesBefore` now collects `WXL_EXPECT_UPSTREAM` lines from both `releaseYmlBefore` and `qualityGatesYmlBefore` (previously `quality-gates.yml` only), the positive-control count changed from `toBe(2)` to `toBe(3)`, and the "after" assertion collects from both `releaseYmlAfter` and `qualityGatesYmlAfter` the same way. No other line of T52, and no other existing test, changed — confirmed by `git diff -U0 HEAD -- tests/unit/scripts/fork-init.test.ts` showing only these three lines.
- To see a real red, Row 1's `release.yml` edit was temporarily reverted (removing the job-level `env:` block just added), rather than applying the test change before Row 1 — Row 1 was already green at this point, so reverting it was the only way to reproduce a true positive-control mismatch:
  `AssertionError: expected 2 to be 3 // Object.is equality — Expected: 3 — Received: 2` (at `fork-init.test.ts:4210`).
- The `release.yml` edit was then restored (re-applied verbatim, confirmed identical to Row 1's change).
- Green: `Test Files 1 passed (1) / Tests 1 passed | 1891 skipped (1892)`.
- Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t 'leaves the upstream-only if:/env lines, the UPSTREAM_SLUG import and the engine file byte-identical'` — selects 1 test.

**Row 3 (0004-S5, command record on the real tree).**

- `GITHUB_REPOSITORY=browserlaboratory/WXL-PLATFORM WXL_EXPECT_UPSTREAM=true pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` → exit code 1; `Tests 1 failed | 86 passed | 6 skipped (93)` (failure: `WXL_EXPECT_UPSTREAM, when set, matches the upstream decision` — `expected 'fail' to be 'pass'`).
- `GITHUB_REPOSITORY=browserlaboratory/WXL-PLATFORM pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` (same case mismatch, no `WXL_EXPECT_UPSTREAM`) → exit code 0; `Tests 86 passed | 7 skipped (93)` — the upstream-only check skips instead of failing, as expected without the env set.

**Row 4 (combined and full suite).**

- `pnpm vitest run tests/unit/workflows/ tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts` → `Test Files 7 passed (7) / Tests 2030 passed | 1 skipped (2031)`.
- `pnpm test --run` (once, nothing else running) → `Test Files 127 passed (127) / Tests 4176 passed | 1 skipped (4177)`, exit code 0.

### Deviations

- Row 2's actual sequence did not match the approved plan: the approved test plan table required the test change (T52's updated count) to land before the env, so the count assertion would go red first and pass once the env was added. In practice Row 1 had already added the env to `release.yml` before Row 2 started, so that order could no longer produce a genuine red. To still reproduce one, the `release.yml` env was temporarily removed (reverting Row 1's change), the red was confirmed, and the env was then restored (re-applied verbatim). This temporary-removal step is an out-of-plan sequence — the approved test plan did not offer it as an option — not an alternative branch the ticket provided.
  Confirmed the re-applied env block is identical to Row 1's change:
  ```
  $ git diff -U0 HEAD -- .github/workflows/release.yml
  diff --git a/.github/workflows/release.yml b/.github/workflows/release.yml
  index d3d344e..7d42537 100644
  --- a/.github/workflows/release.yml
  +++ b/.github/workflows/release.yml
  @@ -20,0 +21,5 @@ jobs:
  +    # Upstream-only tests (tests/unit/scripts/upstream-guard.test.ts) must fail, not silently skip,
  +    # if this ever disagrees with the decision upstream-guard.test.ts computes itself (T-0011).
  +    # Spelled through format(), never UPSTREAM_SLUG — a workflow YAML cannot import a TS module.
  +    env:
  +      WXL_EXPECT_UPSTREAM: ${{ github.repository == format('{0}/{1}', 'BrowserLaboratory', 'wxl-platform') }}
  ```
  — the same five added lines Row 1 recorded, confirming the restore was byte-identical.
- Both `pnpm vitest run tests/unit/workflows/...` (combined) and `pnpm test --run` print an `AggregateError [ECONNREFUSED]` for `127.0.0.1:3000` / `::1:3000` after the test summary line. Reproduced again directly:
  ```
  $ pnpm test --run; echo "exit=$?"
  ...
  AggregateError [ECONNREFUSED]: ... connect ECONNREFUSED ::1:3000 ... connect ECONNREFUSED 127.0.0.1:3000 ...
   Test Files  127 passed (127)
        Tests  4176 passed | 1 skipped (4177)
  exit=0
  ```
  Confirmed no test under this ticket's scope references port 3000:
  ```
  $ grep -rn '3000' tests/unit/workflows tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts
  tests/unit/workflows/challenge-verify-timeout.test.ts:17:// 30000ms exceeded".
  tests/unit/scripts/fork-init.test.ts:480:    ['leading/trailing ASCII space, U+3000, ... all trimmed', ...
  tests/unit/scripts/fork-init.test.ts:919:    const blanks = [undefined, '', '   ', '\u3000', ...]
  tests/unit/scripts/fork-init.test.ts:949-950, 993, 1548, 3696: further U+3000 occurrences
  ```
  every match is either the string `30000ms` or the Unicode code point U+3000 (ideographic space), never a port number. Left as pre-existing environment noise, not fixed here — out of this ticket's scope.
- No other deviation: the edit set matches the approved test plan table and Notes exactly (`release.yml`, `upstream-only-jobs.test.ts`, T52 only in `fork-init.test.ts`).

### 2026-10-16 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0004-S4 | `upstream-only-jobs.test.ts`: "release.yml's release job sets WXL_EXPECT_UPSTREAM to the same comparison" | not measured: no coverage provider is installed | T71 / AC-C2 | the release job itself only runs on a tag push, so its env is verified by parsing the workflow (this test), not by running it; row S5's record demonstrates the env's effect when set, it does not verify release.yml |
| 0004-S1 | `fork-init.test.ts` T52: "--author x --rebrand acme --repo me/x leaves the upstream-only if:/env lines, the UPSTREAM_SLUG import and the engine file byte-identical" | not measured: no coverage provider is installed | T52 / AC-B3 | none — the real `release.yml` env line is read, rebranded, and compared byte-for-byte in this test |
| 0004-S5 | command record (no test file added): `upstream-guard.test.ts` run twice against the real tree with and without `WXL_EXPECT_UPSTREAM` | not applicable: no test file added; evidenced by the exit codes and `Tests` lines recorded in Row 3 above | T71 / AC-C2 — what this record actually exercises is T69 / AC-G3's expectation behaviour; it is used here as motivating evidence for T71's rationale, not as a direct check on `release.yml` | none — run directly against the real tree, both branches recorded

**Stage 8 verification surface.** This ticket's verification covers YAML parsing (`upstream-only-jobs.test.ts`, T52) and local `vitest` runs; it does not cover the `release` job's actual execution on GitHub Actions, which only triggers on a tag push. The next time upstream pushes a release tag, that run's log can be attached here as the job-execution evidence this ticket's local checks cannot produce.

### 2026-10-16 — stage 6 and 7 disposition

- Reviewed and declined: extracting T52's four `matchAll` calls (the `if:`/`WXL_EXPECT_UPSTREAM` before/after collections) into a shared helper — doing so would touch T52 lines outside this ticket's approved scope (the count assertion and the two collection call sites only).
- Reviewed and declined: adding a separate one-line count assertion scoped to `release.yml` alone (e.g. asserting exactly one `WXL_EXPECT_UPSTREAM` line in that file) — also outside the approved scope; T52's existing combined-count assertion across both files already covers this line.
- Noted, left to the parent: wording in the spec's Range CI text, traceability revision 2.3's self-review sentence, `OPEN-QUESTIONS.md`'s OQ-016, and the chain-analysis document are corrected by the parent, not by this change — this ticket's scope is limited to `release.yml`, `upstream-only-jobs.test.ts`, T52 in `fork-init.test.ts`, and this ticket file.

### 2026-10-16 — stage 7 security review

Report: `.proj.specs/0004-stateless-engine/review/security-T-0018.md`. Six candidates, independently filtered: no exploitable defect. The spec-prose mismatch and the duplicated comment were fixed in the stage 6 and 7 disposition above; the untested step composition and order of the release job, and step-level overrides, are recorded as known limits.

### 2026-10-16 — landing

PR BrowserLaboratory/wxl-platform#22, squash-merged by the user as `152f117`. Its CI passed: `test`, `build`, `prose-audit`, `site-smoke`, `challenge-verify`, four `fork-init-cross-os` jobs and `Cloudflare Pages` all succeeded (`gh pr view 22 --json statusCheckRollup`). The `release` job itself did not run, since no tag was pushed; the stage 8 note above still applies.

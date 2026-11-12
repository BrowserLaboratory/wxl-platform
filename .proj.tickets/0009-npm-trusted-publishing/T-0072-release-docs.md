---
id: T-0072
title: Release document and the other specs' notes
epic: 0009-npm-trusted-publishing
status: review
blocked_by: [T-0069, T-0070, T-0071]
---

## Context

Spec 0009 writes the release procedure down (D7, U5) and records its changes in the specs and
documents it touches (DS1–DS3). The documents describe the landed code, so this ticket follows the
three code tickets. It adds a test under `create-wxl/test/`, so it is a code ticket and runs RP0.

## Deliverable

- `docs/agents/release.md` meeting R2's line and string checks (RP0–RP7, MN1–MN7, F1–F7), with its
  test in `create-wxl/test/` (0009-S5).
- Lines linking it in `AGENTS.md`'s Reference and `CONTRIBUTE.md`'s Maintainer Setup.
- 0005 revision 2.4 (DS1): spec and traceability, ids prefixed "0009's".
- DS2: 0004's note, both `wxl-fork-init` skills (byte-identical), both READMEs' fork section,
  ADR-0009, 0006's B2, OQ-021, GLOSSARY's 設定紀錄.
- DS3: OQ-027 (created, filled by T-0073) and OQ-028.

## Acceptance criteria

Spec 0009 revision 3.

- [x] Rows D01, D02 (D02 judged at stage 6 by reading).
- [x] AC reached: AC-6.
- [x] Stage 8 (RP0, S8-08), before the PR merges: `npm pkg get repository` prints MR1's object;
  `node scripts/check-publish.mjs` exits 1 with a named check; the PR's CI passes.

## Test plan

### 2026-11-12 — test plan table（依使用者 2026-11-12 的授權「test plan table 與新的 D 編號照你的建議核准（仍要列給我看）」核准，寫第一個測試之前）

0009-S5：新測試檔 `create-wxl/test/release-docs.test.mjs`，讀 `docs/agents/release.md`、`AGENTS.md`、`CONTRIBUTE.md` 的文字。行檢查：先 trim，再去掉開頭的一個 `| ` 或 `- `；字串檢查：先把連續空白壓成一個空白。上游 slug 從 `UPSTREAM_SLUG` 組出來，測試本身不拼出它。DS1～DS3（D02）照 traceability 在第 6 階段以閱讀判定，沒有 seam。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0009-S5 | `release.md` 的第 1 行與「upstream only」 | `release-docs.test.mjs` | D01 / AC-6 | 第 1 行逐字是 `# Releasing create-wxl and WXL`；之後第一個非空行含 `upstream only`。預期紅燈（檔案還不存在） |
| 0009-S5 | 每個 RP、MN、F 編號都有一行以它開頭 | 同上 | D01 / AC-6 | RP0～RP7、MN1～MN7、F1～F7 共 22 個；處理後的行以該編號開頭，後面接空白、`:` 或 ` \|`。`RP1` 不能被 `RP10` 這類較長的編號滿足 |
| 0009-S5 | R2 的字串都在 | 同上 | D01 / AC-6 | `/tw-emoji-release-note`、`git push origin v<V>`、``never `git push --tags` ``、`npm stage publish`、`Staged Packages`、`2FA`、`disallow tokens`、`UPSTREAM_SLUG`，在空白壓縮後的文字裡逐一出現 |
| 0009-S5 | `release.md` 不拼出上游 slug | 同上 | D01 / AC-6 | 不分大小寫地找不到 `UPSTREAM_SLUG` 的值 |
| 0009-S5 | `AGENTS.md` 的 `## Reference` 段有一行含 `docs/agents/release.md` | 同上 | D01 / AC-6 | 只在 `## Reference` 到下一個 `## ` 之間找，其他段落出現不算 |
| 0009-S5 | `CONTRIBUTE.md` 的 Maintainer Setup 有一行同時含 `docs/agents/release.md` 與 `MN2` | 同上 | D01 / AC-6 | 只在 `## Maintainer Setup` 到下一個 `## ` 之間找；兩個字串要在同一行 |

### 2026-11-12 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0009-S5 | `create-wxl/test/release-docs.test.mjs`：標題與 upstream only 一個、22 個編號各一、8 個字串各一、不含 slug 一個、`AGENTS.md` 一個、`CONTRIBUTE.md` 一個，共 34 個 | not measured：純文字檢查。重現：`pnpm --dir create-wxl test` | D01；AC-6 的 R2 部分 | D02（DS1～DS3 各處的註記）依 traceability 在第 6 階段以閱讀判定，沒有 seam；`release.md` 的內容是否正確（不只是字串在不在）也由第 6 階段閱讀判定 |

## 給使用者（zh-TW）

把發布流程寫成 `docs/agents/release.md`：RP0～RP7、你要做的 MN1～MN7、失敗表 F1～F7，並用測試確認該有的行與字串都在。

同一張票也同步其他文件：
- 0005 改為第 2.4 版；
- 0004、0006、ADR-0009、兩份 fork-init skill、兩份 README、GLOSSARY、OQ-021 加上註記；
- 新增 OQ-027、OQ-028。

## Comments
- 2026-11-12, stage 5, on a branch cut from T-0071's tip `4c84f51` while PR #86 ran its CI, to be
  rebased onto `main` once #86 lands:
  - D01 (`npx vitest run test/release-docs.test.mjs` in `create-wxl/`): all 34 tests red before
    `docs/agents/release.md` existed (`ENOENT`, and the two link tests); 32 green after adding it;
    the last two green after the `AGENTS.md` and `CONTRIBUTE.md` lines.
  - `release.md` takes in two stage 7 observations: MN2 must come before any `v*` tag
    (T-0071's C7), and `npm publish <tarball>` bypasses the gate like `--ignore-scripts`
    (T-0069's SEC-02), under "What this procedure does not protect against".
  - DS1–DS3 (D02, judged at stage 6): 0005 revision 2.4 in its spec and traceability; 0004's
    traceability note; both `wxl-fork-init` skills (`cmp .claude/skills/wxl-fork-init/SKILL.md
    .agents/skills/wxl-fork-init/SKILL.md` → exit 0 at `44875a3`); both READMEs' fork section;
    ADR-0009; 0006's B2 in `spec.en.md` and `spec.zh-TW.md` (`synced_from_sha` updated to
    `git hash-object .proj.specs/0006-range-upgrade/spec.en.md`); OQ-021; GLOSSARY's 設定紀錄;
    OQ-027 and OQ-028 created.
  - The first GLOSSARY sentence held a backticked `v<版本>`, "0009" and "D6", which
    `tests/unit/site/glossary.test.ts` forbids in a definition ("has no Arabic digit", "has no
    backticked identifier"); `pnpm test --run` caught it, and the sentence now names neither.
    So GLOSSARY is the one DS place that cannot name 0009 (D02 asks each place to); the 0009 link
    lives in this record and in 0009's DS2 (6).
  - `pnpm --dir create-wxl test` → `Test Files 38 passed (38) / Tests 787 passed | 1 skipped
    (788)`; `pnpm vitest run tests/unit/site/glossary.test.ts` → `Tests 290 passed (290)`;
    `python3 scripts/verify-project.py` → `PASS`.
- 2026-11-13, stages 6 and 7, run together on `5ce6e5a`:
  - Stage 6 (workflow `wf_81641373-ffb`; local note
    `.proj.research/2026-11-12-T-0072-stage6-review.md`): Standards 23 findings (0 high, 2
    medium), Spec 20 (0 high, 3 medium). Refuted by `harness-challenger`: STD-10, SPEC-01,
    SPEC-11, SPEC-13, SPEC-14.
  - Stage 7 (workflow `wf_507b5b5d-9e0`): report
    `.proj.specs/0009-npm-trusted-publishing/review/security-T-0072.md`. 20 candidates: SEC-03
    and SEC-04 confirmed (low), SEC-02 uncertain (low), the rest false positives.
  - New decisions, applied under the user's authorisation of 2026-11-12 ("新的 D 編號照你的建議
    核准（仍要列給我看）") and listed to the user in the conversation of 2026-11-13, as spec 0009
    revision 3.1 (`56d8e5d`, spec, zh-TW and traceability, self-checked):
    - D11: MN7 is two rulesets: creations restricted with the upstream maintainer as the only
      bypass actor, and updates and deletions restricted with no bypass actor (SEC-03);
    - D12: F6 moves `latest` back with `npm dist-tag add` before deprecating (SEC-04);
    - D13: the user reads RP2's SHA themselves, and RP5 (b) compares the run's commit with it on
      GitHub, so the commit is always compared (SEC-01, SEC-02);
    - D14: MN7 and MN2 come before any `v*` tag (T-0071's C7).
  - Fixed in `075c3af`:
    - `release.md` takes D11–D14, and its wording follows the findings: RP4's direction
      (SPEC-04); "stage on npm" (STD-11); "the user" defined as the upstream maintainer (STD-12);
      code spans on one line (STD-13, SPEC-18); RP0 as an addition to workflow.md's stage 8 and
      its cleanup only after `prepare-dist.mjs` (SPEC-03, SPEC-10); provenance "should carry"
      (SPEC-17, SEC-10); "a release ticket" (SPEC-19); the interactive-2FA bypass (SPEC-09,
      SEC-08); F7's unknown for a rejected version (SEC-09); F1's re-run waits for the user's
      check of the tab (SEC-13); `npm logout` after `npm stage view` (SEC-14); the collaborator
      check in MN1 (SEC-07); RP2's precondition (SEC-11); what the agent never does (SEC-06);
    - 0005's spec prefixes 0009's ids (U7, RP2, RP5, O5), and its status line says the listing is
      in `traceability.md` (STD-01, STD-02, SPEC-07, STD-18); 0004's note prefixes O1 (STD-19);
    - ADR-0009 says "the commit SHA they read before the tag was pushed" (STD-03, SPEC-05);
    - CONTRIBUTE's subsection says it is upstream only (STD-04, SPEC-12, SEC-16);
    - both READMEs' paragraph moved after the deploy table (STD-05);
    - GLOSSARY's sentence drops "npm" (STD-15);
    - OQ-021 cites ids, not lines (STD-16, SPEC-15); OQ-027 and OQ-028 list what is verified and
      the options (STD-17);
    - 0006's status line dates the B2 note, en and zh-TW, `synced_from_sha` updated (SPEC-20);
      zh-TW's B2 uses 0009's phrase for staging (SPEC-16);
    - the test reads each file once (STD-14).
  - D02 judged by reading, with the stage 6 reviewers' place-by-place check: every DS place carries
    its change. Two places do not name 0009, and both are recorded rather than changed:
    GLOSSARY, whose test forbids digits in a definition (STD-09, SPEC-02); and the READMEs, which
    are teacher-facing and for which DS2 (3) asks only for the U9 statement (SPEC-01, refuted).
  - Recorded, not changed:
    - STD-06, STD-20: Chinese tables and Chinese skill text, as before (T-0069's STD-03);
    - STD-07: the test plan was listed to the user in the conversation of 2026-11-12;
    - STD-21, STD-22 (and SEC-05): pointers from `workflow.md` and a hard rule for U8 are left to
      the epic's retrospective, since they change shared process documents;
    - STD-23: the A-mode kept line is stated in the places the spec names;
    - SEC-12, SEC-20: for the close-out's chain analysis and retrospective.
- 2026-11-13, rebased onto `main` `42a0cba` (after #86 and #87) with `git rebase --onto origin/main
  4c84f51`: `98d8ae7` → `6dd8801`, `44875a3` → `d687b24`, `5ce6e5a` → `1766caf`, `56d8e5d` →
  `2b60aae`, `075c3af` → `b136b5b`, and the stage 6–7 record → `f7167bb`. At `f7167bb`:
  `pnpm test --run` → `Test Files 137 passed (137) / Tests 4910 passed | 1 skipped (4911)`;
  `pnpm --dir create-wxl test` → `Tests 787 passed | 1 skipped (788)`;
  `python3 scripts/verify-project.py` → `PASS`.
- 2026-11-13, stage 8, terminal part (RP0 (a), (b); surface: a terminal on macOS darwin arm64,
  Node v24.13.0, git 2.54.0, at `f7167bb`), after `pnpm --dir create-wxl install
  --frozen-lockfile`, in `create-wxl/`: (a) `npm pkg get repository` → MR1's object, exit 0;
  (b) `node scripts/prepare-dist.mjs && node scripts/check-publish.mjs` → `checkPublish failed: X3
  (no local tag v<version> exists at HEAD)`, exit 1. `create-wxl/dist/` and `create-wxl/LICENSE`
  were removed afterwards.
- 2026-11-13, stage 8, CI part (RP0 (c); surface: GitHub Actions on PR #88, push `10a7f46`, run
  `43256558448`, checked with `gh pr checks 88`): 10 of 10 passed, `prose-audit` included (it
  covers the new `CONTRIBUTE.md` and README paragraphs and `AGENTS.md`'s line). The `test` job runs
  `pnpm test --run` with the W01–W12 workflow tests; the `fork-init-cross-os` jobs run
  `pnpm --dir create-wxl test` with this ticket's `release-docs.test.mjs`. Stage 8 is complete.

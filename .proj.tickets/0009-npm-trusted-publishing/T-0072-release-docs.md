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
- [ ] Stage 8 (RP0, S8-08), before the PR merges: `npm pkg get repository` prints MR1's object;
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
    traceability note; both `wxl-fork-init` skills (`cmp` equal); both READMEs' fork section;
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

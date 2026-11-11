---
id: T-0071
title: The publish-npm workflow and its static tests
epic: 0009-npm-trusted-publishing
status: todo
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

- [ ] Rows W01–W12.
- [ ] ACs reached: AC-4, and AC-5's W11.
- [ ] Stage 8 (RP0, S8-08), before the PR merges: `npm pkg get repository` prints MR1's object;
  `node scripts/check-publish.mjs` exits 1 with a named check; the PR's CI passes, including the
  workflow tests. No `v*` tag is pushed (D10).

## 給使用者（zh-TW）

新增 `publish-npm.yml`：推送 `v*` tag 時，先確認 commit 在 `main` 上，跑發布閘門，再經由 OIDC 送進 npm 的 staged。

- workflow 的每一個鍵、步驟與 pin 都照 spec 固定，並用靜態測試釘住。
- 測試也涵蓋：只在上游執行、rebrand 不會動到它、祖先檢查指令的結果。
- 這張票不推任何 tag。

## Comments

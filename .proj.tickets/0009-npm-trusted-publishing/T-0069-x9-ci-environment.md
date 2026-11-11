---
id: T-0069
title: X9 checks the CI environment
epic: 0009-npm-trusted-publishing
status: todo
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

- [ ] Rows K01–K13.
- [ ] ACs reached: AC-1, AC-2, AC-3.
- [ ] Stage 8 (RP0, S8-08), before the PR merges: `npm pkg get repository` output recorded (the
  object arrives with T-0070; here it prints `{}`, recorded as such); `node scripts/check-publish.mjs`
  in `create-wxl/` exits 1 with `checkPublish failed: ` and a named check; the PR's CI passes.

## 給使用者（zh-TW）

把 X9 從「問 npm 誰是維護者、誰登入了」改成「確認自己是在上游的 `publish-npm.yml`、為這個版本執行」。

- 失敗訊息固定一行：點名第一個不成立的條件、看到的值，最後一句說明 create-wxl 只能怎麼發布。
- npm 相關的輔助函式與測試一併移除。
- 這張票的 PR 同時讓 spec 0009 落地，並把 T-0068 記成「由本 epic 取代」（`pending`），它的分支不合併。

## Comments

---
id: T-0067
title: Release 3.1.0 and publish create-wxl
epic: maintenance
status: review
blocked_by: []
---

## Context

Epic 0006 (range upgrade) revision 3 has landed: `create-wxl upgrade` and `pnpm range:upgrade`
are on `main`, with T-0061 to T-0066 and the revision 3 close-out. Since `v3.0.0` (`52192fa`),
`main` also carries epics 0007 and 0008 (copy control, short links with locale codes, the
pre-commit `_redirects` hook, locale fallbacks). The handoff of 2026-11-09 asked for a release
after T-0061; on 2026-11-10 the user authorised the rest of the work as recommended ("一路完成到最後，授權你按照你建議"),
including the maintenance ticket, the version and the tag push. The user runs `npm publish`. On 2026-11-11 the user, after #78 landed, asked to continue from that session's state ("#78 merged ，確認 … 的狀態繼續往下做").

No spec covers the release itself; `create-wxl`'s publish gate X1–X9
(`.proj.specs/0005-create-wxl/traceability.md`, "Package and publishing") requires the tag
`v<version>` at the published commit, pushed upstream, with a clean tree. Precedent:
`.proj.tickets/maintenance/T-0029-release-3-0-0.md`.

## Maintenance plan (the requirement)

- R1: version 3.1.0 (MINOR): new features (the upgrade, epics 0007 and 0008), no break for an existing
  range or link: `/c/NNN` and `/zh/c/NNN` still resolve (T-0056), and create still makes a range with
  git 2.20–2.25, printing CW-W01 for the git steps (D21). Both manifests carry it (X2).
- R2: `CHANGELOG.md` gains a 3.1.0 entry dated 2026-11-11, written with the project
  `tw-emoji-release-note` skill from `git log v3.0.0..HEAD`; `## [Unreleased]` stays above it.
- R3: both READMEs gain an upgrade subsection: `pnpm range:upgrade`, git 2.26, and
  `npx --yes create-wxl@latest upgrade` for a range made with 3.0.0, which has no `range:upgrade`
  script (`git show v3.0.0:package.json`).
- R4: after this change lands, `v3.1.0` is tagged (annotated) at its merge commit and pushed; the
  release workflow builds the site asset and creates the GitHub Release, whose notes are replaced by
  R2's entry, titled "WXL 3.1.0"; `node scripts/check-publish.mjs` passes.
- R5: the user runs `npm publish` in `create-wxl/` on that commit (prepublishOnly runs X1–X9);
  afterwards `npm view create-wxl version` prints `3.1.0`.

## Acceptance criteria

- [x] R1: both manifests at 3.1.0; `create-wxl` tests pass
- [x] R2: CHANGELOG 3.1.0 entry, `## [Unreleased]` above it
- [x] R3: both READMEs' upgrade subsection; `upstream-config.test.mjs` passes
- [ ] R4: `v3.1.0` on the merge commit, GitHub Release with R2's notes, `check-publish.mjs` exit 0
- [ ] R5: `npm view create-wxl version` prints `3.1.0` (the user)

## Comments

- 2026-11-11, prepared on `tickets/T-0067/release-3-1-0` from `main` at `93ba74b`: both manifests at
  3.1.0; the CHANGELOG entry (generated with `tw-emoji-release-note` from `git log v3.0.0..HEAD`,
  dated on release day) sits under `## [Unreleased]`; each README gains its upgrade subsection
  before the fork subsection. Every PR the entry cites was checked against its title with `gh pr view`;
  T-0035 (#45, a test-only change) is left out. `pnpm --dir create-wxl test` →
  `Tests 716 passed | 1 skipped (717)`, `upstream-config.test.mjs` included.
- Before tagging (T-0029's lesson): run `node scripts/check-publish.mjs` in `create-wxl/` on the merge commit once the
  tag is pushed, and confirm `npm whoami` before `npm publish`.
- 2026-11-11, PR #80's first CI run: root `test` failed in `tests/unit/site/glossary.test.ts` ("attention
  item（注意項目） does not declare itself new while already in use"): the README's upgrade subsection
  is the first Chinese prose to use 「注意項目」, so `GLOSSARY.md` drops its `_新造詞_` line, as epic 0005's U10
  did for 「設定紀錄」. `pnpm vitest run tests/unit/site/glossary.test.ts` → `290 passed`.

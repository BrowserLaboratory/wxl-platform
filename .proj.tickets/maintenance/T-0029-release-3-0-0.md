---
id: T-0029
title: Release 3.0.0 and publish create-wxl
epic: maintenance
status: review
blocked_by: []
---

## Context

Epic 0005 landed on `main` (`fcdbb98`) with `create-wxl` ready to publish, but the repository has no release tag yet, `CHANGELOG.md` still lists 3.0.0 as "Unreleased" without the work since PR #8, and both READMEs say `npm create wxl` works only after a publish that has not happened (npm answers 404 for `create-wxl`). The user decided on 2026-10-17 to publish before the workshop (option A, quoted: "A"): the main session prepares the release change, the tag and the GitHub Release; the user runs `npm publish`.

No spec covers the release itself; `create-wxl`'s publish gate (X1–X9, `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, "Package and publishing") requires the tag `v3.0.0` at the published commit, pushed upstream, with a clean tree.

## Maintenance plan (the requirement)

- R1: `CHANGELOG.md`'s 3.0.0 entry is dated 2026-10-17 and covers every user-facing change through PR #31, written with the project `tw-emoji-release-note` skill; `## [Unreleased]` stays above it (P1's marker).
- R2: both READMEs' `npm create wxl` notes say the package is published from 3.0.0, still mentioning publishing (U5/S-20's test).
- R3: after this change lands, `v3.0.0` is tagged at its merge commit and pushed; the release workflow builds the site asset and creates the GitHub Release, whose notes are replaced by R1's entry.
- R4: the user runs `npm publish` in `create-wxl/` on that commit; `prepublishOnly` runs X1–X9.

## Deliverable

A tagged 3.0.0 release whose CHANGELOG, GitHub Release and READMEs describe what ships, ready for `npm publish`.

## Acceptance criteria

- [ ] R1: CHANGELOG 3.0.0 dated, complete through #31, `## [Unreleased]` above it
- [ ] R2: both README notes updated; `create-wxl`'s `upstream-config.test.mjs` passes
- [ ] R3: `v3.0.0` tag on the merge commit, GitHub Release with R1's notes
- [ ] R4: `npm view create-wxl version` prints `3.0.0`

## Comments

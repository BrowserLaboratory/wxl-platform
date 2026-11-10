---
status: accepted
date: 2026-11-09
---

# The upgrade's base must be an upstream release, checked through upstream's own tag

`range.json` names the upstream commit a range came from, and the upgrade builds its base from that
commit. Anyone who can change `range.json` (a co-teacher, a merged pull request) could name any commit
in upstream's fork network, because GitHub serves a fork-only commit under upstream's archive URL
(measured 2026-11-09 on two public fork networks); the base's content, which the merge trusts as
upstream's, would then be theirs. So the upgrade downloads the base through upstream's tag
`v<version>` and requires the archive's own commit to equal the recorded commit. A fork cannot place a
tag in upstream's namespace (also measured), so a recorded base is either an upstream release or the
upgrade stops (UP-E12; CW-E07 when the version has no tag). Decided in T-0061's stage 1 interview (D11, epic 0006 revision 3).

## Considered options

- **Keep downloading by commit and download the tag a second time to compare.** Rejected: every upgrade
  fetches a whole extra archive to read one header, and the version still comes from `range.json`'s own
  claim until the second download.
- **Warn on a mismatch and continue.** Rejected: the merge would still trust attacker-chosen content,
  and a warning in a long report is easy to miss.

## Consequences

- A range whose recorded commit is not a release (created or last upgraded with `CREATE_WXL_COMMIT` or
  by a package packed at a commit other than its version's tag, or recorded before its tag moved) must name its base with `--from`. `--from <commit>` is not checked
  against a tag (a `--from <version>` base is its tag's commit as the tag is now): a template clone of `main` has no tagged base, so `--from <commit>` is its only correct choice.
  R1 marks such a base as not checked, and the threat model lists it as not protected.
- Moving a published tag now stops every upgrade that takes its base from `range.json` with UP-E12,
  and deleting it stops them with CW-E07, instead of silently changing that base; such a range names
  its base with `--from <commit>`.
- The target is not bound to its tag: it comes from the npm package's source record, whose trust is
  the package's (0005 B2).

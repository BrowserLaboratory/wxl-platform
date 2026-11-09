---
id: T-0061
title: Upgrade base provenance and on-disk name aliases
epic: 0006-range-upgrade
status: pending
blocked_by: []
pending_reason: "Opened by epic 0006's chain analysis: chains X1-X3 cross from B3 to B4, so a ticket is required before the epic is called done (docs/agents/review.md). Every fix needs a spec decision first (stage 1), and the user decides when it runs; until then it stays pending."
pending_evidence: ".proj.specs/0006-range-upgrade/review/chain-analysis.md (X1-X3, spec gaps 1-3); create-wxl/src/upgrade.mjs (J4/J5 accept any 40-hex commit; F25), create-wxl/src/merge-plan.mjs (classify: o ≡ b drives M5/M6; o read from disk by path; P-7 by name), create-wxl/src/upgrade-report.mjs (R2 counts only; R5 runs git clean -fd first), all at main 651e866."
pending_on: 2026-11-09
revisit_when: "The user schedules it, or before create-wxl's upgrade is recommended to teachers who share a range (co-teachers, pull requests)."
---

## Context

Epic 0006's chain analysis (`.proj.specs/0006-range-upgrade/review/chain-analysis.md`) found chains
that cross from B3 (`range.json` → the upgrade) to B4 (the upgrade → the teacher's repository and
work). B3's "Does not protect" accepts that whoever can change `range.json` (a co-teacher, a merged
pull request) can pick any fork-network commit as base, but names only one consequence, skipping
upstream changes. The base's content, b, is then the attacker's, and the merge table trusts it:

- **X1** — b copied from the teacher's files makes o ≡ b: M5 overwrites the teacher's changes with t,
  M6 deletes the teacher's files, a clean M12 drops chosen lines; none of these is an attention item,
  and the pull request shows only a new 40-hex commit in `range.json`.
- **X2** — b's lines appear in the `|||||||` section of `--diff3` conflict blocks, which the teacher
  reads as the old upstream version.
- **X3** — on Windows with 8.3 short names, a regular file `GITIGN~1` in b, a copy of the teacher's
  `.gitignore`, resolves on disk to `.gitignore`: M6 deletes it, and R5's `git clean -fd` then deletes
  every file the teacher's rules ignored. HFS+ ignorable code points are the same kind.

Severity low (X3 at the low edge of medium): no code runs, a clean merge holds only o's and t's lines,
tracked files are recoverable (X3 excepted), and deploying needs the teacher's own commit and push.

## Deliverable

A teacher's upgrade cannot be steered by a base that is not upstream's without the teacher being told,
and no path whose on-disk name differs from p (8.3 short names, HFS+ ignorable code points, case) is
read, written or deleted.

## Acceptance criteria

To be traced to rows of a revised `traceability.md` after stage 1. Options recorded by the chain
analysis, for that stage to decide:

- Bind `range.json`'s commit to an upstream tag: download `refs/tags/v<upstream.version>` and require
  its pax `comment` to equal `upstream.commit` (a fork cannot supply a tag in upstream's namespace);
  also closes F25. On a mismatch: refuse with a new code, or require `--from` to confirm.
- A general alias pre-check before o is read: `fs.realpath.native` of an existing o must end in p's
  own last component; otherwise the path is untouched and reported. Also closes the `.git` alias
  writes (security-T-0027 candidates 01/14).
- R5's order: `git checkout -- .` before `git clean -fd`, so the clean applies HEAD's ignore rules
  (changes D2 ⑭).
- List M6's deletions of files that exist in the range; R4 says the `|||||||` section is the base's.
- Correct spec gaps 1-3 of the chain analysis (B3's "Does not protect", the self-check's "the base's
  lines are upstream's", AC-8 and D9's name-level guarantee), and decide whether a teacher running
  `--from <commit>` on someone's advice is inside the model.

## 給使用者（zh-TW）

epic 0006 串連分析開出的後續票。能改 `range.json` 的人（共同授課老師、被合併的 PR），可以把 base 指向 fork network 裡自己做的 commit。這樣一來，升級可能把老師的修改蓋掉、刪掉老師的檔案，或在衝突區塊放進他寫的文字；在 Windows 上，還能藉 8.3 短檔名刪掉 `.gitignore`，之後的還原指令會刪掉老師被 ignore 的檔案。嚴重度低，要部署出去仍須老師自己 commit、push。修法（base 要和上游 tag 綁定、讀檔前確認磁碟上的實際檔名、調整還原指令順序等）都牽涉 spec 決策，要先回到第 1 階段。

## Comments

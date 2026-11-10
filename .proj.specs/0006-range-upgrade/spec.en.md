# Spec 0006: range upgrade — take in a new upstream release

Status: revision 3 (2026-11-10). Round 1 of adversarial review found no P0 (`review/round-1.md`);
revision 2 applied its disposition (`review/disposition.md`, groups U1–U9) and the user's decisions
D1–D2, and by D1 round 2 was not run then. Revisions 2.1–2.5 (D7 to D10) came from T-0026 and T-0027.
Revision 3 applies D11 to D17 from T-0061's stage 1 (the chain analysis's X1–X3 and spec gaps,
OQ-026, and 0005's rule 3 gap) and is reviewed in round 2 with the frozen prompt; this text names the
decisions where they change a criterion. D2 and D7 to D17 are the user's decisions, each dated with its
stage in `traceability.md`'s decision table; they stand as the stage 1 decisions the review prompt
lists do. 0005 is committed, and its matrix revision 2.2 (D13) is part of this revision. Derived from `traceability.md`,
which holds the fixed lists this spec refers to (decisions in short, vocabulary, command grammar, step
order, base rules J1–J6, pre-checks P-1–P-9, merge table M4–M12 and the parent check, fork:init-derived
content, the `range.json` update, codes UP-E01–E13, UP-I01 and UP-A1–A15, the report R1–R5, the stage 8
simulation) and the seams 0006-S1 and S2. This epic depends on 0005 (`.proj.specs/0005-create-wxl/`,
traceability revision 2.2): it reuses 0005's `run` function, package source record, download, archive entry rules,
pristine processing P1–P4, `range.json` schema, language rule, signal handling, output escaping and
the CW codes it names.

## Problem Statement

A teacher's range is a copy of one upstream release with the teacher's own changes on top: settings
applied by fork:init, edited challenges, added challenges. When upstream releases a new version — a
fix, a new platform feature — the teacher has no tool to take it in. Copying the new release over the
range loses the teacher's work; merging by hand needs to know exactly which upstream version the range
came from and what upstream changed since. Teachers who cannot do this fall behind every upstream
release, which is what the workshop's maintainer wants to avoid: "後面老師才有辦法在我升級時也能跟上".

## Solution

In the range's root, `pnpm range:upgrade` runs the newest `create-wxl`'s upgrade command. It reads
`range.json` to find the upstream release the range came from, downloads that release and the newest
one, builds both as pristine ranges, and merges what upstream changed into the range three ways:
upstream's change is applied where the teacher did not touch the file; the teacher's version is kept
where upstream did not touch it; where both changed a text file, git's merge writes the result or
conflict markers showing the teacher's lines, the old upstream lines and the new ones. Every case it
cannot settle safely — binary files, deletions on one side, symbolic links, ignored files, case
collisions, files that became directories — is kept as the teacher's and listed. When upstream changed
files that fork:init writes, the report says to rerun `pnpm fork:init`. Nothing is committed: the
teacher reviews with `git diff`, resolves what is listed, and commits — or undoes the whole upgrade
with two git commands. A range without `range.json` (a fork, a clone) can name its base with `--from`,
from version 3.0.0 on. A base read from `range.json` must be an upstream release: the upgrade checks
it through upstream's own tag, so whoever changes `range.json` can name only another upstream release
as base, never content of their own (B3).

## User Stories

1. As a teacher, I want one command that brings my range to the newest upstream release, so that I keep up with upstream without merging by hand.
2. As a teacher, I want my own changes — settings, edited challenges, added challenges, local ignored files — kept, so that an upgrade never erases my work.
3. As a teacher, I want each place where upstream and I changed the same thing listed with the reason, so that I know exactly what to look at.
4. As a teacher, I want nothing committed and a clean-tree requirement, so that I can review the upgrade and undo all of it with git.
5. As a teacher, I want the upgrade to stop with an explanation when my range has uncommitted changes or an unfinished git operation, so that my unsaved work is never mixed into an upgrade.
6. As a teacher whose range has no `range.json`, I want to state the version it came from, so that I can still upgrade.
7. As a teacher, I want the upgrade to run the newest upgrade code even if my range is old, so that old ranges do not need their tools upgraded first.
8. As a teacher, I want `range.json` updated to the new release, so that the next upgrade starts from the right place.
9. As a teacher, I want an already up-to-date range or a downgrade refused without touching anything, so that a mistaken run is harmless.
10. As a teacher, I want to be told when upstream changed what fork:init configured, so that my deployment settings stay current.
11. As a teacher, I want messages in Traditional Chinese or English, and an upgrade that needs attention not to look like a failure, so that I understand the result.
12. As the upstream maintainer, I want the upgrade proven on two real pushed commits with a teacher-style change in between, so that the first real upgrade after the workshop works.
13. As a teacher who shares a range with co-teachers or accepts pull requests, I want the upgrade to refuse a recorded base that is not an upstream release, so that a changed `range.json` cannot make the merge use, as upstream's, content that is not an upstream release.
14. As a teacher, I want every file a completed upgrade deleted listed by path, so that I notice a deletion I did not expect.

## Implementation Decisions

- **Where it runs.** The upgrade is a path of create-wxl's `run`, chosen when the first positional is
  `upgrade` (R4). The upstream manifest carries `range:upgrade` = `npx --yes create-wxl@latest
  upgrade`, so the code that runs is the newest release's. GLOSSARY 開發模組 (revised in 0005) covers
  this. The seam adds `tmpRoot` to 0005-S1's dependencies.
- **Preconditions.** git 2.20 or later; the working directory is the work tree's top level (compared
  after `realpath`); the repository has a commit and is clean by a status that lists every untracked
  file and ignores no submodule, with no assume-unchanged or skip-worktree files and no unfinished
  merge, rebase, cherry-pick, revert or bisect.
- **Base and target.** The base is `range.json`'s `upstream` (J1–J6) or `--from`; the target is the
  package source record's commit (or 0005's test override, with its warning). A base from
  `range.json` is downloaded through upstream's tag `v<version>` and must be that tag's commit (J6,
  D11; ADR-0009), so its version and content are a release's; a `--from <version>` base is its tag's commit by
  construction, a `--from <commit>` base is not checked against a tag (D17), and neither is the target,
  whose trust is the package's (B2). Step 5 refuses a `range.json`
  that is not tracked and that the range's rules ignore (D15), since the restore commands could not
  undo writing it. No-op, downgrade and the
  3.0.0 minimum are checked before downloading when the base is known, and again after downloading
  when only the archive tells (a `--from <commit>`'s version, a `--from <version>`'s commit from the
  tag archive's pax `comment`). `fetchArchive` receives a ref: a commit, or `refs/tags/v<version>`.
- **Pristine ranges.** Both archives pass 0005's entry rules and P1–P4 in separate `mkdtemp`
  directories under `tmpRoot`. Because every base is 3.0.0 or later, both carry 0005's
  `export-ignore`. 0005's entry rule 3 also rejects the names git treats as `.git` on NTFS and HFS+
  (D13; 0005 revision 2.2).
- **Plan, then apply.** Every path in B ∪ T ∪ tracked is decided by the pre-checks and the merge table
  before the first write, including every `git merge-file` run; comparisons normalise CRLF in text
  files. Apply deletes first, then writes each file through a new file renamed into place, then
  writes `range.json`. Text conflicts use `git merge-file --diff3` with fixed labels, so the user's
  conflict-style setting does not change the output; its exit status distinguishes conflicts (1–127)
  from errors.
- **Safety rules.** Paths through symbolic links, ignored paths, case- or Unicode-colliding paths and
  file/directory mismatches are never written, nor is a path whose name on disk differs from p, in
  itself or a parent (P-9: the native `realpath` of the path, or, when it is absent, of its deepest
  existing proper ancestor, P-9 not applying when that is the range root; taken relative to the range
  root's, with `\` turned into `/`, both sides compared after NFC normalisation; D12; this holds where
  the native `realpath` reports the stored name: macOS, Windows, and B4 lists the rest), nor a path at or under a submodule (P-8, D10); the parent check drops a write blocked by a file the
  plan does not delete; a clean merge of a `.json` file must still parse.
- **`range.json`** is excluded from the merge and rewritten after the apply step: `upstream` becomes the
  target, other keys are kept.
- **Nothing is committed or staged.** Because the tree was clean, ignored paths and ignore files
  are untouched, and step 5 refused an untracked `range.json` that the range ignores (D15),
  `git checkout -- .` then `git clean -fd` restores `HEAD` exactly; `checkout` runs
  first so that `clean` applies `HEAD`'s ignore rules (D14). The report says to use them only before
  other changes.
- **Report.** R2 lists every path the merge deleted after its counts; R4 says, when R3 holds UP-A1, that a conflict
  block's `|||||||` section is the text of R1's base version; R1 says when a `--from <commit>` base was not
  checked against an upstream tag (D16, D17).
- **Exit codes**: 0 when the run completed, with or without attention items (the report lists them;
  pnpm would print a failure for any other code), and for a no-op; 1 on an error; 130 on a signal, including one in step 10, where the report still prints in full
  first (D8).

## Trust Boundaries and Threat Model

| # | Boundary | Protects | Does not protect | Outside the model |
|---|---|---|---|---|
| B1 | GitHub archives → the teacher's range | Both archives are chosen by commit (a base from `range.json` or a `--from <version>` through its tag, then pinned by the archive's own `comment`) and pass 0005's entry rules, which include git's NTFS and HFS+ aliases of `.git` (D13); a tag moved or deleted after a range was made stops that range's upgrade from `range.json` (UP-E12, or CW-E07 for a deleted tag) instead of changing its base; R1 prints both commits; writes stay inside the range, never pass through a symbolic link in it, never touch an ignored path or a path whose name on disk differs from p (P-9; B4 lists the limits of P-9), and replace files by rename so a hard link's other name is not changed | A tag upstream moves, for a `--from <version>` base: the tag as it is now decides the base (R1 prints it); a `--from <commit>` makes that commit's content the base, whoever suggested it (R1 says it was not checked against a tag, D17); a `--from` the teacher states wrongly (a base newer than the real one hides upstream's changes in between: R1 shows the base used) | GitHub serving different content for a commit (as 0005 B1) |
| B2 | npm registry → the teacher's machine | As 0005 B2; `npx --yes` runs the newest `create-wxl` without a prompt by design (R4); R1 prints the running version | The teacher runs whatever `create-wxl@latest` is at that moment, possibly a cached one | A compromised npm account or registry |
| B3 | `range.json` (in the teacher's repository) → the upgrade | `lstat` refuses a link or non-file (J1); content validated (J3, J4); another repository refused (J5); the commit must be the commit of upstream's tag for the version, which a fork cannot supply (J6, ADR-0009); an untracked `range.json` that the range ignores is refused (D15); the base is printed (R1) | Anyone who can change `range.json` in the teacher's repository (a co-teacher, a merged pull request) can name another upstream release, up to the target (UP-E07), as base: one newer than the release the range came from skips upstream's changes in between (as a wrong `--from` does in B1); an older one re-merges changes the range already has, giving more conflicts and attention items; R1 shows the base used | — |
| B4 | The upgrade → the teacher's repository and work | Refuses an unclean or mid-operation repository; reads status without optional locks; never commits, stages, or changes refs; never writes or deletes a merge path whose name on disk differs from p (P-9; `range.json` is kept out of the merge by P-1 and read and written by its literal name); keeps the teacher's content in every case it cannot settle and lists it; lists every file a completed run deleted (R2); the restore commands undo every change it made (D14, D15) | Conflict markers written into text files until resolved; a clean text merge that is semantically wrong (only `.json` parsing is checked); the restore commands, run after later edits, discard those edits too (R5 warns); on a case-insensitive Linux file system (ext4 casefold, a mounted vfat or CIFS share), whose `realpath` may not report the stored name, P-9 may miss a letter-case alias; on a case-insensitive file system, a tracked letter-case variant of `range.json` (such as `Range.json`) is read by J1 as the record and rewritten by step 9 (J6 still requires a release base, and the restore commands undo the write) | Another process changing the range during the run; upstream itself shipping a path the file system resolves to an ignore file that does not exist yet (B2's trust) |
| B5 | Terminal output → the teacher's terminal | As 0005 B5: outside values escaped | — | — |
| B6 | Deployed range → learners | Unchanged: nothing the upgrade writes is deployed until the teacher commits and pushes | — | — |

## Acceptance Criteria

- **AC-1** The grammar accepts `upgrade` with `--from <X.Y.Z>`, `--from <40 hex>` and `--lang` on either side; any other `--from`, a missing value, another positional, an unknown, repeated or create-only flag ends with CW-E02 naming it, exit 1, nothing written. (U01, U02)
- **AC-2** Each failed precondition ends before any download with exit 1 and nothing written: outside the top level → UP-E01 (a symbolic-linked path to the root is accepted); git missing or older than 2.20 → UP-E02; not clean → UP-E03 with the token of `traceability.md`, whatever the user's `status.showUntrackedFiles`; a `range.json` that is not tracked and that the range's rules ignore → UP-E13, with or without `--from`, and `git ls-files` exiting other than 0, `git check-ignore` exiting other than 0 or 1, or `runGit` rejecting for either → CW-E14 naming the command (D15); this check follows J1–J5 and precedes step 6, so a symbolic link is UP-E06 and an equal commit is still UP-E13. (U03–U05, U67)
- **AC-3** The base follows `--from` when given and `range.json` otherwise; `--from <commit>`'s version comes from the base archive's manifest and appears in R1; J1–J6 failures give the codes and tokens of `traceability.md`; with `--from`, only J1 and J3 apply; repository comparison ignores ASCII case; a base from `range.json` is downloaded through tag `v<version>` and its archive must name `upstream.commit`, else UP-E12 (J6), while a `--from <version>` base is its tag's commit by construction and a `--from <commit>` base is not checked against a tag (D11, D17); each failure exits 1 with nothing written. (U06–U11, U65)
- **AC-4** Equal commits, or equal versions without `CREATE_WXL_COMMIT`, give UP-I01 with exit 0 and nothing written, before any download when the base is known and right after downloading otherwise; a base version above the target's gives UP-E07 and one below 3.0.0 gives UP-E10, at the same points; a rerun after a completed, committed upgrade gives UP-I01. (U12–U14, U50–U52, U61)
- **AC-5** A failed, hostile or unprocessable archive ends with 0005's code, and a tag archive whose pax `comment` is absent or not 40 lowercase hex with UP-E08, for a `--from <version>` base and a base from `range.json` alike, before UP-E12 and before every other entry rule; a missing tag for a base from `range.json` with CW-E07; an entry with a component git treats as `.git` on NTFS or HFS+ with CW-E08, while `PLATFO~1` and `GITIGN~1` are accepted (D13); each exits 1 with nothing written in the range and no `create-wxl-upgrade-` entry under `tmpRoot`. (U15, U16, U66, U73)
- **AC-6** In one run whose fixture has one path for every branch of P-2 and M4–M12, each path ends as its row states and R2 and R3 report exactly those; a clean M12 merge is written, an overlapping one carries the four marker lines with the three labels whatever `merge.conflictStyle` says; teacher-own files are untouched and unreported; a new executable file is written 0755; case-only renames give UP-A8; a file replaced by a directory works and the reverse gives UP-A10, as does a write blocked by a kept file; CRLF-only differences count as equal; `merge-file` exiting 255 gives UP-E11 with nothing written; an unparsable clean `.json` merge keeps the range's file with UP-A11; a path whose name on disk differs from p, in itself or a parent, is untouched with UP-A15, while a range root reached through a symbolic link, a name equal after NFC or a `\`-separated `realpath` result is not reported, and an `lstat` error other than ENOENT or ENOTDIR, or a rejection of the native `realpath`, gives UP-E11 naming p (D12); a path that is a submodule or lies under one is untouched with UP-A14, and after the run the status has no line for the submodule (D10). (U17–U19, U21, U23, U53–U58, U64, U68, U69)
- **AC-7** A path that is or passes through a symbolic link (tracked or ignored) is untouched and reported UP-A7 and the link's outside target keeps its content and modification time; a hard-linked tracked file written by M5 leaves its outside name unchanged. (U20, U60)
- **AC-8** An ignored file at a path upstream changes, and a path upstream adds that the range ignores, are untouched and reported UP-A9. A `.gitignore` upstream changes is untouched and reported UP-A13, and no merge path whose name on disk differs from p is written or deleted (P-9), so, where the native `realpath` reports the stored name (macOS, Windows; B4 lists the rest), the set of ignored paths does not change, except through an ignore file that upstream itself adds under a name the file system resolves to a `.gitignore` that does not exist yet (B4, outside the model) (D9, D12). (U22, U63, U68)
- **AC-9** After a completed run, `range.json`'s `upstream` equals the target's repository, version and commit, other top-level keys are deep-equal and in their order, a missing file is created; after UP-E09 it is unchanged. (U24)
- **AC-10** A completed run exits 0 whether or not attention items exist; the report prints R1–R5 by id in order and in the run's language, R2's counts equal the paths so classified, R3 lists every attention item with its code, UP-A12 appears exactly when an anchor file has b ≢ t; R1 says when a `--from <commit>` base was not checked against an upstream tag; R2 lists every M6 path after its counts; R4 says, when R3 holds UP-A1, that the `|||||||` section is the base version's text; R5 names `git checkout -- .` before `git clean -fd` (D14, D16, D17); every UP code exists in both message tables; paths are escaped. (U25, U26, U59, U62, U71, U72)
- **AC-11** A write failure or a signal in step 9 prints UP-E09 with the path or signal and the restore commands, `git checkout -- .` before `git clean -fd` (exit 1, or 130 for a signal); a signal in step 7 writes nothing (exit 130); no temporary directory is left; after a completed or a failed run, `git checkout -- . && git clean -fd` gives an empty porcelain status, `HEAD`'s files, and ignored files byte-identical to before the run; on a tree built from a commit by deleting or changing a tracked ignore file, or by replacing a tracked file with an untracked directory, the same commands give an empty porcelain status, `HEAD`'s files, and every file that `HEAD`'s ignore rules ignore byte-identical to before the commands (D14). (U27–U29, U70)
- **AC-12** The upstream manifest's `range:upgrade` is exactly `npx --yes create-wxl@latest upgrade`; `create-wxl upgrade` takes the upgrade path and `create-wxl <dir>` behaves as 0005 revision 2.2 specifies (0005's tests pass unchanged, with two exceptions: C02's `upgrade` cases change as AC-1 specifies, and the rule-3 cases revision 2.2 adds to C18, with the new row C71 (D13), are added and pass). (U30, U31)
- **AC-13** Stage 8 (0006-S2): the simulation of `traceability.md` produces exactly the listed results on the pushed commits A and B, the UP-E12 refusal before `--from <A>` included, and the simulation branch is deleted afterwards. (U32)

## Testing Decisions

- Tests check the working tree, `git status`, `HEAD` and the index, exit codes and stream text (by
  message id, code and named path) at seam 0006-S1, with real git in temporary repositories whose
  global configuration is isolated, and fixture archives built as in 0005 (entry lists, raw headers,
  pax `comment`); no test reaches the network.
- One fixture covers P-2 and every row of the merge table at once (U17), so a branch cannot be
  satisfied by another's behaviour; the other pre-checks have rows of their own (P-9: U68, U69); the
  restore check (U29) runs after U17.
- Tests that need symbolic links or the executable bit skip on Windows; the cross-OS job still runs the
  rest there.
- Tests that build `range.json` serve its base as a tag archive whose `comment` is the recorded commit
  (J6).
- P-9 is tested with a wrapped `deps.fs` that maps an alias to its entry in every function (`lstat`,
  `realpath`, reads and `unlink` included) for names CI file systems are not known to produce, or
  produce on one runner only (Windows 8.3 short names, an HFS+ NFD form of an NFC name, `\`-separated
  `realpath` results), and with the real file system for letter case in a parent directory, run only
  on macOS or Windows on a case-insensitive file system. Whether a Windows runner can give a file a
  short name (`fsutil file setshortname`) is checked at stage 5; when it can, a Windows-only test runs
  the real case; when it cannot, the ticket's coverage report records the real 8.3 case as not
  verified.
- The restore order is tested on trees the test builds from a commit (U70), since the upgrade itself
  can no longer leave a missing or changed ignore file. Stage 5 also runs U70 once with git 2.20, the
  floor of step 3, and records the version and result in the ticket's coverage report; if it fails, D14
  and step 3's floor go back to the user through a spec revision before the ticket closes.
- Prior art: 0005-S1's tests (same function and fixtures), `tests/unit/scripts/fork-init.test.ts`.
- Stage 8 is a terminal run against two pushed commits (R10), the surface where an upgrade runs: an
  explicit override of the preview-deployment rule, recorded with 0005's under OQ-017. `pnpm
  range:upgrade` through the registry cannot run before publishing; the user checks it after
  publishing, with 0005's `npm create` check (OQ-021).

## Out of Scope

- Inferring the base from a fork's git history (E5); bases older than 3.0.0; checking a
  `--from <commit>` base against upstream's tags or history (D17).
- Migrations beyond the three-way merge (transforming a teacher's own challenges when a format
  changes): added to create-wxl when the first format change needs one, since the newest code always
  runs (R4).
- Re-applying fork:init's settings automatically: the settings half of the setup record (0007) is not
  there yet; UP-A12 tells the teacher to rerun `pnpm fork:init`.
- Committing, pushing, deploying, or running `pnpm install` for the teacher.
- Choosing a target other than the newest release, except through the test override.
- Downgrading.
- Merging file modes other than the executable bit of new files; upstream's mode changes on existing
  files are not applied or reported.
- Detecting that an upstream addition belongs with a teacher's own directory (a teacher's challenge
  and an upstream challenge of the same slug merge file by file); semantic checks of merged files other
  than `.json` parsing.
- Windows terminal runs beyond the cross-OS unit tests.

## Further Notes

- Because both pristine ranges carry `version` `0.1.0` (0005 P3), upstream's version bump never reaches
  or conflicts with a range's manifest; other manifest changes merge as text.
- If 0006 does not land by the R1 deadline (2026-10-16 23:59), v3.0.0 ships without the `range:upgrade`
  script (0005), and ranges created at the workshop gain it from their first upgrade, which a teacher
  starts with `npx create-wxl@latest upgrade`.
- This epic supersedes 0004's plan of 0006 as the setup record epic (OQ-020).

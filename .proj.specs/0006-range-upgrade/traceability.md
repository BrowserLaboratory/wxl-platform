# Traceability: 0006-range-upgrade

`{type × field × boundary} → {expected behaviour → acceptance criterion}`. The spec is derived from
this file. This epic depends on 0005 (`.proj.specs/0005-create-wxl/traceability.md`, revision 2): the
`run` function and its seam, the package source record, the download, the archive entry rules, the
pristine processing P1–P4, the `range.json` schema, the language rule, the signals handling, the
escaping of outside values, and the CW codes it names are 0005's.

Revision 2 (2026-10-16) applies round 1's disposition (`review/disposition.md`, groups U1–U9) and the
user's decisions D1 and D2. Round 1 found no P0, so the stage 3 gate is met and, by D1, round 2 is not
run. Row ids U01–U32 keep their meaning where they survive; rows added in revision 2 start at U50.

Decisions this file relies on, in short (full record: the local research note
`.proj.research/2026-10-16-w45-create-wxl-upgrade-grill.md`):

| Id | Decision |
|---|---|
| R1 | Deadline: this epic lands by 2026-10-16 23:59, else after the workshop as 3.0.x |
| R3 | Three-way merge of the base's pristine range, the teacher's range and the target's pristine range; git and a clean working tree required; nothing committed; conflicts marked and listed |
| R4 | The upgrade is `create-wxl upgrade`, reached from the range through `range:upgrade` = the newest `create-wxl` |
| R5 | No `range.json` → stop, unless `--from` names the base; inferring it from git history is deferred |
| R6 | When unsure, keep the teacher's version and list it; the lockfile takes upstream's on conflict; `range.json` updated with the merge; no downgrade |
| R10 | Stage 8: a real upgrade between two pushed commits |
| D2 | ⑦ `--diff3`; ⑧ ignored paths untouched and listed; ⑨ list fork:init-derived changes and advise rerunning `pnpm fork:init`; ⑩ oldest base v3.0.0; ⑪ CRLF normalised before comparing; ⑫ exit 0 when attention items exist; ⑬ case-only renames and file/directory swaps detected in planning; ⑭ restore with `git clean -fd` then `git checkout -- .`; ⑮ override warning |

One correction to R6 ⑦'s wording, a fact: an upgrade can add files, which are untracked, so restoring
needs `git clean -fd` as well as `git checkout -- .`; because the tree had to be clean and ignored
paths are never touched, the two commands return the range to `HEAD` exactly.

## Seams

| Seam | Entry point | Observable output |
|---|---|---|
| 0006-S1 | 0005-S1's `run` with argv whose first positional is `upgrade`; `deps.cwd` a temporary git repository built by the test (a committed fixture range, real git, `HOME` and `GIT_CONFIG_GLOBAL` isolated); `deps.tmpRoot` a directory the test owns; `fetchArchive` returning fixture archives for the base and target refs; `runGit` the real runner (or a stub rejecting `ENOENT` for U04); every git command, including `merge-file`, goes through `runGit` | the working tree's files and modes; `git status --porcelain=v1 --untracked-files=all`; `HEAD` and `git diff --cached`; the exit code; stream text by message id and code; the calls `fetchArchive` received; the entries left under `tmpRoot` |
| 0006-S2 | stage 8, local, terminal: the simulation below, with the package packed (`npm pack`, which runs 0005's `prepareDist`) from the upgrade ticket's HEAD and run as `npx --yes <tarball>` | exit codes; terminal text; `git status`, `git diff`, file contents; `pnpm install && pnpm build`; the tree after the restore commands |

`deps.tmpRoot` is new in this epic (the `bin` passes `os.tmpdir()`); everything else is 0005-S1's.
Tests live under `create-wxl/test/` (0005). Tests needing symbolic links or the executable bit are
skipped on Windows.

## Fixed lists

### Vocabulary

| Term | Meaning here |
|---|---|
| base | the upstream commit the range was last created or upgraded from: `range.json`'s `upstream.commit`, or the commit `--from` names |
| target | the commit in create-wxl's package source record, or `CREATE_WXL_COMMIT` |
| B, T | the pristine ranges (0005 P1–P4) of base and target, built by the running create-wxl |
| tracked | listed by `git ls-files -z` |
| o | for a path p: what is at p in the range on disk, by `lstat`: absent (including when a parent is not a directory); a regular file (its bytes); a symbolic link; or another non-file |
| b, t | p's file in B, T, or absent |
| ≡ | equality of two sides: both absent; or both regular files whose contents are equal, comparing text files after replacing every CRLF with LF and binary files byte for byte. Text and binary as below |
| binary | a file whose first 8000 bytes contain a NUL byte, on any present side |
| ignored path | a path that is not tracked and that `git check-ignore -q --no-index` reports as ignored by the range's rules |
| anchor files | `package.json`, `README.md`, `README.en.md`, `CONTRIBUTE.md`, `.vitepress/config.mts`, `.vitepress/challenge/shortLink.ts`, `platform/index.md`, `platform/zh-TW/index.md`, `scripts/templates/deploy.yml.template` (the files of 0004's anchors A1–A9 and the deploy template) |

### Command grammar

```
create-wxl [--lang en|zh-TW] upgrade [--from <version>|<commit>] [--lang en|zh-TW]
```

The upgrade path is chosen when the first positional argument is `upgrade`. `<version>` matches
`^\d+\.\d+\.\d+$` and names tag `v<version>`; `<commit>` matches `^[0-9a-f]{40}$`. A `--from` without a
value, any other `--from` value, another positional, an unknown or repeated flag, or a create-only flag
(`--author`, `--repo`, `--host`, `--origin`, `--site-name`, `--no-setup`) → CW-E02. 0005's reservation
of `upgrade` is replaced by this path.

The upstream manifest gains `"range:upgrade": "npx --yes create-wxl@latest upgrade"`, so in a range
`pnpm range:upgrade [--from …]` and `npm run range:upgrade -- [--from …]` run the newest release's
upgrade code (R4).

### Step order

| # | Step | On failure |
|---|---|---|
| 1 | Node version (0005 step 1) | CW-E01 |
| 2 | Parse argv; `CREATE_WXL_COMMIT` grammar; package source record (0005 step 2) | CW-E02, CW-E13 |
| 3 | Git and location: `git --version` reports 2.20 or later; `git rev-parse --show-toplevel` and `deps.cwd`, each resolved with `realpath` and with `\` turned into `/`, are equal | UP-E02, UP-E01 |
| 4 | Clean repository: `git rev-parse --verify HEAD` succeeds; `git --no-optional-locks status --porcelain=v1 --untracked-files=all --ignore-submodules=none` prints nothing; `git ls-files -v` shows no lowercase tag (assume-unchanged) and no `S` (skip-worktree); none of `MERGE_HEAD`, `CHERRY_PICK_HEAD`, `REVERT_HEAD`, `BISECT_LOG`, `rebase-merge`, `rebase-apply` exists under `git rev-parse --git-dir` | UP-E03 (with a reason token) |
| 5 | Base: `--from` if given; otherwise `range.json` (below) | UP-E04, UP-E05, UP-E06 |
| 6 | Target: the source record's commit, or `CREATE_WXL_COMMIT` (CW-W04). Before any download: if the base commit is known and equals the target commit → UP-I01; if the base version is known: lower than 3.0.0 → UP-E10, higher than the target version → UP-E07, equal with a different commit and no `CREATE_WXL_COMMIT` → UP-I01 | UP-I01, UP-E07, UP-E10 |
| 7 | Download (0005 step 6) the base — by commit, or for `--from <version>` the URL `https://codeload.github.com/<repository>/tar.gz/refs/tags/v<version>` whose pax `comment` gives the base commit — and the target by commit; validate (0005 entry rules; for the tag download, rule 2's comparison is replaced by "the `comment` is 40 lowercase hex"); now that both are known, repeat step 6's checks (the base version for `--from <commit>` is the base archive's `package.json` `version` before P3); extract each into its own `mkdtemp` directory under `deps.tmpRoot` with prefix `create-wxl-upgrade-`; apply P1–P4 | CW-E07, CW-E08, CW-E10, UP-E08, UP-I01, UP-E07, UP-E10 |
| 8 | Plan: for every path in B ∪ T ∪ tracked, read o and decide by the pre-checks and the merge table; run every `git merge-file` (inputs written to files inside the run's own temporary directory); nothing is written in the range | UP-E11 |
| 9 | Apply: first every deletion, then every write in sorted path order, each write to a new file in the destination directory then renamed over the destination (creating missing parent directories); then write `range.json` the same way | UP-E09 |
| 10 | Remove the run's temporary directories; print the report | — |

Steps 1–8 write nothing in the range. The temporary directories under `tmpRoot` are removed in every
case, by their own paths. Exit code: 0 when the run completed (attention items or not), and for
UP-I01; 1 on any error; 130 on a signal. A signal during step 9 prints UP-E09 with the restore
commands. Signals are 0005's three, handled from step 3.

### Base from `range.json`

| # | Rule | Failure |
|---|---|---|
| J1 | `range.json` at the range root, by `lstat`: absent, or a regular file | not a regular file → UP-E06 `not-a-file` |
| J2 | Absent and no `--from` | UP-E04 |
| J3 | Parses as JSON without a BOM, and is an object | UP-E06 `not-json` / `not-object` |
| J4 | `upstream` is an object with `repository` a string, `version` matching `^\d+\.\d+\.\d+$`, `commit` matching `^[0-9a-f]{40}$` | UP-E06 `upstream`, `upstream.repository`, `upstream.version`, `upstream.commit` (the first broken, in that order) |
| J5 | `upstream.repository` equals the source record's repository, ignoring ASCII case | UP-E05 |

With `--from`, only J1 and J3 apply (a present `range.json` must be a regular file holding a JSON
object, since step 9 rewrites it); J2, J4 and J5 do not.

### Pre-checks (step 8, before the merge table)

| # | Condition | Action | Report |
|---|---|---|---|
| P-1 | p is `range.json` | skip (step 9 writes it) | — |
| P-2 | b ≡ t | leave o as it is | — |
| P-3 | p or a parent inside the range is a symbolic link | untouched | UP-A7 |
| P-4 | another path of B ∪ T ∪ tracked differs from p but equals it after NFC normalisation and case folding | untouched | UP-A8 |
| P-5 | p is an ignored path, or t is present and p would be an ignored path | untouched | UP-A9 |
| P-6 | o is a non-file (other than a symbolic link), and o ≢ t | untouched | UP-A10 |

### Merge table (rows checked in order; the first match applies)

| # | Condition | Action | Report |
|---|---|---|---|
| M4 | o ≡ t | nothing | — |
| M5 | o ≡ b, t present | write t (new files take t's executable bit; existing ones keep their mode) | updated, or added when o is absent |
| M6 | o ≡ b, b present, t absent | delete p | deleted |
| M7 | b present, o absent, t present | stays deleted | UP-A5 |
| M8 | b present, o present, t absent | keep o | UP-A3 |
| M9 | b absent, o present, t present | keep o | UP-A4 |
| M10 | p is `pnpm-lock.yaml`, b, o, t present, no two ≡ | write t | UP-A6 |
| M11 | b, o, t present, no two ≡, any binary | keep o | UP-A2 |
| M12 | b, o, t present, no two ≡, text | `git -c core.autocrlf=false merge-file -p --diff3 -L range -L <base version> -L <target version> <o> <b> <t>`, inputs with CRLF normalised to LF. Exit 0: write the output → updated; but if p ends in `.json` and the output does not parse as JSON → keep o, UP-A11. Exit 1–127: write the output → UP-A1. Any other exit, a signal, or output not read in full → UP-E11 | updated / UP-A1 / UP-A11 |

The pre-checks and rows are total: P-2 covers every path upstream left equal; M4 every path already
equal to t; with b ≢ t and o a file or absent, exactly one of M5–M12 applies (M5/M6 when o ≡ b; M7
when o is absent and b present; M8/M9 by t's presence; M10–M12 when all three are present and
pairwise different).

Parent check, after the table: a planned write whose path has a parent inside the range that exists and
is not a directory, and that the plan does not delete, is dropped and reported UP-A10. Deletions run
before writes (step 9), so a file replaced by a directory of the same name (U54) works.

### Fork:init-derived content

When any anchor file has b ≢ t, the report adds one line UP-A12: upstream changed files that
fork:init writes; rerun `pnpm fork:init` with the range's original arguments after resolving the
attention items; for a range with `.github/workflows/deploy.yml`, this also refreshes the workflow.

### `range.json` after the plan

Read the current file (or start from `{}`), replace the `upstream` value with `{ repository, version,
commit }` of the target (version from the source record; commit as downloaded), keeping every other
top-level key and the order of keys (`upstream` keeps its position, or is first when added). Two-space
indent, one trailing LF. Values of other keys are compared as parsed JSON (`JSON.parse` deep equality).

### Codes

Every message begins with its code; values from outside are escaped as in 0005.

| Code | Condition | The message also names |
|---|---|---|
| UP-E01 | not at the top level of a git work tree | the working directory, and that `upgrade` runs in the range's root |
| UP-E02 | git cannot be spawned, or is older than 2.20 | the version found, `https://git-scm.com/downloads` |
| UP-E03 | not clean: reason token `no-head`, `changes`, `assume-unchanged`, `skip-worktree`, or `in-progress` | the token, and `git status` |
| UP-E04 | no `range.json` and no `--from` | `--from <version>` and `--from <commit>`, and that a range made with create-wxl has `range.json` |
| UP-E05 | J5 broken | both repositories |
| UP-E06 | J1, J3 or J4 broken | the rule's token |
| UP-E07 | target version lower than base version | both versions |
| UP-E08 | the tag archive's pax `comment` is not 40 lowercase hex | the tag |
| UP-E09 | a write failed or a signal arrived during step 9 | the path and error (for a signal: the signal), and the restore commands `git clean -fd` then `git checkout -- .` |
| UP-E10 | base version lower than 3.0.0 | the version, and that ranges before 3.0.0 cannot be upgraded by this tool |
| UP-E11 | planning failed: a read error, or `git merge-file` exited outside 0–127 or was not read in full | the path and error |
| UP-I01 | nothing to do (equal commits, or equal versions without the override) | the version and commit |

| Code | Attention item |
|---|---|
| UP-A1 | conflict markers written (three labels: `range`, base version, target version) |
| UP-A2 | binary changed on both sides; the range's version kept |
| UP-A3 | upstream deleted a file the range changed; the range's version kept |
| UP-A4 | upstream added a file where the range has a different one; the range's version kept |
| UP-A5 | the range deleted a file upstream changed; it stays deleted |
| UP-A6 | lockfile changed on both sides; upstream's taken; run `pnpm install` |
| UP-A7 | the path is or passes through a symbolic link in the range; untouched |
| UP-A8 | the path collides with another by letter case or Unicode form; untouched |
| UP-A9 | the path is ignored by the range's rules; untouched |
| UP-A10 | the range has a directory or other non-file where upstream has a file (or the reverse); untouched |
| UP-A11 | a clean merge of a `.json` file did not parse; the range's version kept |
| UP-A12 | upstream changed files fork:init writes; rerun `pnpm fork:init` |

### Report

Printed after step 9 on stdout, in the run's language, as lines with ids:

| Id | Content |
|---|---|
| R1 | the running create-wxl version; base version and commit; target version and commit |
| R2 | counts: updated, added, deleted (each equal to the number of paths so classified; M10 is not counted as updated) |
| R3 | one line per attention item: its UP-A code and the path, sorted by path (UP-A12 once, last) |
| R4 | next steps: `git status` and `git diff`; resolve UP-A1 markers (search `<<<<<<<`) and the other items; `pnpm install` when the run wrote `package.json` or `pnpm-lock.yaml`; build and test; commit; for a range with `.github/workflows/deploy.yml`, push a new `v*` tag to deploy |
| R5 | to undo the whole upgrade before making other changes: `git clean -fd` then `git checkout -- .` |

### Stage 8 simulation (0006-S2)

Branch `sim/0006-upgrade` pushed to upstream and deleted after the run; an explicit exception to
hard rule 1 (it is not a ticket branch), recorded in the ticket. Commit B is made with the project's
commit skill; commits inside the temporary range are test fixtures, not project history.

- **A** = the upgrade ticket's HEAD (pushed).
- **B** = A plus: in `platform/challenge/door-is-open/index.md`, one line of the brief changed; a new file
  `platform/public/upgrade-sim.txt`; `.archive/guide/terminal.md` deleted; `package.json` `version`
  raised by one patch level and a script `"sim:noop": "node -e \"\""` added; and the `tagline:` line of
  `platform/index.md` changed to `tagline: Upstream simulation B`.

Run, in an empty temporary directory, with the package packed from A:

1. `CREATE_WXL_COMMIT=<A> npx --yes <tarball> sim --author 'Stage Eight' --repo wxl-test/sim --host github-pages </dev/null` (non-interactive).
2. In `sim`: change the `tagline:` line of `platform/index.md` to `tagline: Teacher edit`; change one line of `platform/challenge/staff-only/index.md`; add `platform/public/teacher-note.txt`; `git add -A && git commit -m fixture`.
3. `CREATE_WXL_COMMIT=<B> npx --yes <tarball> upgrade`.

Expected: exit 0; CW-W04 printed; R2 counts updated 2 (`door-is-open/index.md`, `package.json`),
added 1 (`upgrade-sim.txt`), deleted 1 (`.archive/guide/terminal.md`); R3 exactly UP-A1
`platform/index.md` and UP-A12; `platform/index.md` holds the markers with the three labels and both
taglines; the teacher's `staff-only` change and `teacher-note.txt` unchanged; `package.json` holds
`sim:noop`, `version` `0.1.0` and the teacher's repository; `range.json` names B. Then, after replacing
the conflict block with `tagline: Teacher edit`: `pnpm install && pnpm build` succeed. Finally
`git clean -fd && git checkout -- .` gives an empty `git status --porcelain=v1 --untracked-files=all`
and the files of the fixture commit.

## Matrix

| Row | Type | Field / input | Boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| U01 | argv | `upgrade --from 3.0.0`; `upgrade --from <40 hex>`; `--lang en upgrade` | grammar | accepted | AC-1 |
| U02 | argv | `--from` without value; `--from v3.0.0`; short or uppercase SHA; a second positional; unknown or repeated flag; `upgrade --repo x/y` | grammar | CW-E02, nothing written | AC-1 |
| U03 | repo | not a git repository; a subdirectory of the range; the range reached through a symbolic link to its root | location | UP-E01 / UP-E01 / accepted | AC-2 |
| U04 | repo | `runGit` rejects `ENOENT`; `git --version` reports 2.19.0 | tool | UP-E02, exit 1 | AC-2 |
| U05 | repo | a modified tracked file; an untracked file; a staged change; no commit yet; a file marked assume-unchanged; one marked skip-worktree; `MERGE_HEAD` present; global `status.showUntrackedFiles=no` with an untracked file | clean | UP-E03 with token `changes` / `changes` / `changes` / `no-head` / `assume-unchanged` / `skip-worktree` / `in-progress` / `changes`, exit 1, nothing written | AC-2 |
| U06 | record | valid `range.json` | base | base = its commit and version | AC-3 |
| U07 | record | absent, no `--from` | J2 | UP-E04 | AC-3 |
| U08 | record | absent, `--from <version>` / `--from <commit>` | base | base from `--from`; version = given / the base archive's manifest `version` before P3, shown in R1 | AC-3 |
| U09 | record | valid and `--from` given; `upstream.repository` of another repository and `--from` given; unparsable and `--from` given | J1/J3 with `--from` | `--from` wins / `--from` wins / UP-E06 `not-json` | AC-3 |
| U10 | record | each of J1, J3, J4 broken, without `--from` (including a symbolic link, a directory, a BOM) | validity | UP-E06 with the rule's token | AC-3 |
| U11 | record | repository differs; differs only in letter case | J5 | UP-E05 / accepted | AC-3 |
| U12 | target | base commit = target commit (from `range.json` or `--from <commit>`) | no-op | UP-I01, exit 0, no download, nothing written | AC-4 |
| U13 | target | base version > target version (`range.json`) | downgrade | UP-E07 before any download | AC-4 |
| U14 | target | equal versions, different commits: with and without `CREATE_WXL_COMMIT` | override | proceeds with CW-W04 / UP-I01 | AC-4 |
| U15 | download | either archive rejected by the fetcher, hostile, or lacking a P1/P2 marker | failure | the 0005 code, exit 1, nothing written in the range, no `create-wxl-upgrade-` entry left under `tmpRoot` | AC-5 |
| U16 | download | `--from <version>`: the tag archive's `comment` absent or not 40 hex | resolve | UP-E08 | AC-5 |
| U17 | merge | one fixture with one path for each branch of P-2, M4 (both absent; both equal), M5 (updated; added), M6, M7, M8, M9, M10, M11, M12 clean, M12 conflict | table | each path as its row states; R2 counts and R3 lines exactly those | AC-6 |
| U18 | merge | M12 with changes in different lines | text | merged, updated | AC-6 |
| U19 | merge | M12 overlapping change, with global `merge.conflictStyle=merge` in the isolated config | text | markers `<<<<<<< range`, `||||||| <base version>`, `=======`, `>>>>>>> <target version>`; UP-A1 | AC-6 |
| U20 | merge | a tracked symbolic link at p; a file under a tracked symbolic-linked directory; an ignored symbolic link at p (non-Windows) | links | untouched; UP-A7; the link's target outside the range keeps its content and modification time | AC-7 |
| U21 | merge | a teacher's own file (absent in B and T) | ownership | untouched, unreported | AC-6 |
| U22 | merge | an ignored file on disk with o ≡ b where T changes it; T adds a path the range ignores (`*.local`) | ignored | untouched; UP-A9 each | AC-8 |
| U23 | merge | a new executable file in T (non-Windows) | mode | written with mode 0755 (umask 022) | AC-6 |
| U24 | record | after a completed run | write | `range.json` `upstream` = target; other keys deep-equal and in order; created when absent; untouched after UP-E09 | AC-9 |
| U25 | exit | attention empty / non-empty | code | 0 / 0 | AC-10 |
| U26 | report | the run of U17 | output | R1–R5 in order with their ids, in the run's language; every UP code exists in both message tables | AC-10 |
| U27 | failure | `fs.rename` injected to fail on the 2nd write of step 9 | partial | UP-E09 naming the path, exit 1; after `git clean -fd && git checkout -- .` the porcelain status is empty and every tracked file equals `HEAD` | AC-11 |
| U28 | signal | `SIGINT` at the checkpoint of step 7; `SIGTERM` during step 9 | signal | exit 130; step 7: nothing written; step 9: UP-E09 with the signal; no temporary directory left | AC-11 |
| U29 | restore | after the run of U17 | revert | `git clean -fd && git checkout -- .` gives an empty porcelain status and `HEAD`'s files; ignored files byte-identical to before the run | AC-11 |
| U30 | entry | upstream manifest | script | `range:upgrade` exactly as specified (checked by a create-wxl test reading the root manifest) | AC-12 |
| U31 | 0005 | `create-wxl upgrade` | grammar | the upgrade path; `create-wxl <dir>` unchanged | AC-12 |
| U32 | stage 8 | simulation A → B | 0006-S2 | exactly as listed | AC-13 |
| U50 | target | base version 2.9.9 (`range.json`); `--from 2.9.9` | minimum | UP-E10 before any download | AC-4 |
| U51 | target | `--from <commit>` whose archive's version is above the target's / equal with the target's commit / below 3.0.0 | post-download | UP-E07 / UP-I01 / UP-E10 after download, nothing written | AC-4 |
| U52 | target | `--from <version>` whose tag resolves to the target's commit | post-download | UP-I01, nothing written | AC-4 |
| U53 | merge | `Guide.md` in B, `guide.md` in T (case-only rename) | P-4 | both untouched; UP-A8 for each | AC-6 |
| U54 | merge | B has file `a`, T has `a/x`, o ≡ b at `a`; B has `a/x`, T has file `a`, o has `a/x` ≡ b | swap | the first: `a` deleted, then `a/x` written; the second: `a/x` deleted, `a` untouched with UP-A10 (a directory stands there during planning) | AC-6 |
| U55 | merge | o is a directory where b and t are different files; T adds `a/x` where o has a file `a` the teacher changed (M8 keeps it) | P-6, parent check | untouched; UP-A10 | AC-6 |
| U56 | merge | o differs from b only by CRLF line endings, t changed | normalisation | M5: t written | AC-6 |
| U57 | merge | `git merge-file` stub exits 255 | error | UP-E11, nothing written | AC-6 |
| U58 | merge | M12 clean merge of `package.json` producing invalid JSON | json | o kept, UP-A11 | AC-6 |
| U59 | report | an anchor file with b ≢ t; none | UP-A12 | the line present / absent | AC-10 |
| U60 | write | a tracked file that is a hard link to a file outside the range, written by M5 | hard link | the outside file unchanged (write-then-rename) | AC-7 |
| U61 | repo | after a completed run and a commit, `upgrade` again | rerun | UP-I01 | AC-4 |
| U62 | output | a path containing an ANSI escape in T | escaping | printed as an escaped JSON string literal | AC-10 |

## Self-check of the surface (revision 2)

- Every row reaches an AC (AC-1–AC-13), every AC is reached by a row.
- Every UP code has a row: E01 U03; E02 U04; E03 U05; E04 U07; E05 U11; E06 U09, U10; E07 U13, U51;
  E08 U16; E09 U27, U28; E10 U50, U51; E11 U57; I01 U12, U14, U51, U52, U61; A1 U19; A2–A6 U17;
  A7 U20; A8 U53; A9 U22; A10 U55; A11 U58; A12 U59.
- The pre-checks and merge table are total (stated under the table).
- Side effects of revision 2's guarantees, checked:
  - Leaving ignored paths untouched (P-5) is what makes U29's restore exact; it also means an upstream
    file the range's rules ignore never arrives, which the report lists (UP-A9).
  - Exit 0 with attention items (D2 ⑫) removes the only signal a script had; R3 lists them, and no
    caller in this project scripts the upgrade.
  - `--diff3` adds the base's lines to conflict blocks; P3 and the anchor files mean the base's lines
    are upstream's, which is what the teacher needs to see.
  - Requiring a base of 3.0.0 or later (D2 ⑩) makes every base carry 0005's `export-ignore`, so B and
    T both lack upstream's records and the pristine-range definition holds for both.
  - With `--from`, J4 and J5 are skipped so a broken record can be repaired; J1 and J3 still apply
    because step 9 rewrites the file keeping its other keys.

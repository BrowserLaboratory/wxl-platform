# Traceability: 0006-range-upgrade

`{type × field × boundary} → {expected behaviour → acceptance criterion}`. The spec is derived from
this file. This epic depends on 0005 (`.proj.specs/0005-create-wxl/traceability.md`, revision 2.2 since this epic's revision 3, revision 2.3 since revision 3.3): the
`run` function and its seam, the package source record, the download, the archive entry rules, the
pristine processing P1–P4, the `range.json` schema, the language rule, the signals handling, the
escaping of outside values, and the CW codes it names are 0005's.

Revision 2 (2026-10-16) applies round 1's disposition (`review/disposition.md`, groups U1–U9) and the
user's decisions D1 and D2. Round 1 found no P0, so the stage 3 gate was met and, by D1, round 2 was not
run then (revision 3 runs it). Row ids U01–U32 keep their meaning where they survive; rows added in revision 2 start at U50.

Revision 2.1 (2026-10-17) changes row U62 only, by the user's decision when approving T-0027's test
plan (option (a)): 0005's entry rule 3 rejects a path holding a control character while the target
archive is checked, so such a path never reaches the upgrade report; U62 now verifies that rejection
on the upgrade path. The report's own escaping of outside values still follows 0005's rule.

Revision 2.2 (2026-11-09) applies decision D7, made by the user during T-0026's stage 7 security
review: step 4's in-progress markers add `sequencer` (left by a multi-commit cherry-pick or revert
that stopped, even after the stopped commit was made), and row U05 gains that case.

Revision 2.3 (2026-11-09) applies decision D8, made by the user while confirming T-0027's increment
plan: a signal that arrives in step 10, after step 9 has finished, does not stop the report; R1–R5
are printed in full and the run exits 130. Row U28 gains that case.

Revision 2.4 (2026-11-09) applies decision D9, made by the user during T-0027's stage 6 review: a
`.gitignore` file upstream changed is never written, so the set of ignored paths never changes during
an upgrade and the restore commands keep every ignored file. Pre-check P-7, code UP-A13 and row U63
are added.

Revision 2.5 (2026-11-09) applies decision D10 and two hardening changes made by the user during
T-0027's stage 7 security review: a path at or under a submodule (gitlink) is never touched
(pre-check P-8, code UP-A14, row U64); P-7 compares the last component after NFC normalisation and
case folding, as P-4 does; `git check-ignore` reads paths literally (each given as `./<path>`).

Revision 3 (2026-11-10) applies decisions D11–D17, made by the user in T-0061's stage 1 interview
(2026-11-09; record: the local research notes `.proj.research/2026-11-09-t0061-grill.md` and
`.proj.research/2026-11-09-t0061-stage1-facts.md`). They answer the epic's chain analysis
(`review/chain-analysis.md`, chains X1–X3 and spec gaps 1–3), OQ-026 and 0005's chain-analysis gap 1:
a base from `range.json` is downloaded through upstream's tag and must be its commit (D11, J6,
UP-E12; ADR-0009); a path whose name on disk differs from p is untouched (D12, P-9, UP-A15), which
also makes revision 2.4's "the set of ignored paths never changes" hold for names the file system
resolves to another entry, where the native `realpath` reports the stored name (APFS on macOS, NTFS on Windows, case-sensitive ext4 on Linux; B4
lists the rest), except for an ignore file upstream itself adds under such a name (B4); 0005's entry rule 3 also rejects git's NTFS and HFS+ aliases of `.git`
(D13, 0005 revision 2.2); the restore commands run `git checkout -- .` first (D14, reversing round 1's
disposition C-4); an untracked `range.json` that the range ignores is refused (D15, UP-E13); R2 lists
M6's deletions and R4 says which version a conflict block's base section holds (D16); a
`--from <commit>` base is marked as not checked (D17). Rows added in revision 3 start at U65. Round 2
of adversarial review runs on this revision with the frozen prompt (`review/prompt.md`).

Revision 3.1 (2026-11-10) applies round 2's disposition (`review/disposition-2.md`, groups W1–W15),
approved by the user, and decisions D18–D20 made with it. Round 2 found no P0 (`review/round-2.md`),
and two rounds are the ceiling, so revision 3.1 is self-checked and not reviewed again (0005's D3 is
the precedent). Rows added in revision 3.1 start at U74.

Revision 3.2 (2026-11-10) changes D18's wording only, by the user's approval of T-0061's stage 6
disposition (finding F5, `.proj.research/2026-11-10-T-0061-stage6-review.md`): UP-E08 and a 404 on the
tag download cannot show that the recorded commit is not a release (a deleted tag, for example), so
their remedies say it could not be checked against its tag; UP-E12 keeps "not a release". No row,
code or AC changes.

Revision 3.3 (2026-11-10) applies decisions D21 and D22, from T-0063's comparison of git 2.20 and
2.54 and its stage 6 finding F9 (T-0063's Comments; local note
`.proj.research/2026-11-10-git-2.20-vs-2.54.md`). Step 3's floor rises to git 2.26, for create's G0
as well (0005 revision 2.3), and AC-11 and B4 list the one ignored file the restore commands remove.
Rows U04, U31 and U70 change; no row is added. Built for ticket T-0065 and self-checked below; B4 also lists two git 2.26–2.35 behaviours that
T-0065's stage 7 found (C1, C2).

Revision 3.4 (2026-11-10) applies decisions D23 and D24 from revision 3's close-out chain analysis
(`review/chain-analysis-revision-3.md`): R5 and UP-E09 print the restore commands as one line joined
by `&&`, so `git clean -fd` never runs when `git checkout -- .` fails; and pre-check P-10 leaves an
untracked path that exists untouched with UP-A15, an alias P-9 cannot see where `realpath` does not
report the stored name. B1, B3 and B4 also state the consequences the chain analysis listed. Row U77
is added; rows U26–U28 change. Built for ticket T-0066 and self-checked below.

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
| D2 | ⑦ `--diff3`; ⑧ ignored paths untouched and listed; ⑨ list fork:init-derived changes and advise rerunning `pnpm fork:init`; ⑩ oldest base v3.0.0; ⑪ CRLF normalised before comparing; ⑫ exit 0 when attention items exist; ⑬ case-only renames and file/directory swaps detected in planning; ⑭ restore with `git clean -fd` then `git checkout -- .` (order reversed by D14); ⑮ override warning (2026-10-16, round 1 disposition; revision 2) |
| D7 | Step 4 also refuses a repository whose `git rev-parse --git-dir` holds `sequencer` (an unfinished multi-commit cherry-pick or revert): UP-E03 `in-progress` (2026-11-09, T-0026 stage 7) |
| D8 | A signal in step 10 (after step 9 finished): R1–R5 still printed in full, then exit 130 (2026-11-09, T-0027) |
| D9 | A `.gitignore` (at any level) with b ≢ t is left as it is and reported UP-A13; the teacher merges ignore rules by hand (2026-11-09, T-0027 stage 6) |
| D10 | A path that is a submodule (gitlink, mode 160000 in `git ls-files -s`) or lies under one is left as it is and reported UP-A14; the restore commands do not reach inside a submodule (2026-11-09, T-0027 stage 7) |
| D11 | A base from `range.json` is downloaded through `refs/tags/v<upstream.version>`, and the archive's pax `comment` must equal `upstream.commit`, else UP-E12; a missing tag is CW-E07; `--from` and the target are not checked against a tag; `CREATE_WXL_COMMIT` has no exemption (2026-11-09, T-0061 stage 1; ADR-0009) |
| D12 | Pre-check P-9: a path whose name on disk (the native `realpath` of p, or of its deepest existing ancestor) differs from p after NFC normalisation is left as it is and reported UP-A15 (2026-11-09, T-0061 stage 1) |
| D13 | 0005's entry rule 3 also rejects a component that git's `is_ntfs_dotgit` or `is_hfs_dotgit` treats as `.git` (0005 traceability revision 2.2) (2026-11-09, T-0061 stage 1) |
| D14 | The restore commands are `git checkout -- .` then `git clean -fd`: cleaning first deletes the teacher's ignored files whenever an ignore file is missing or changed, which `checkout` first prevents; reverses round 1's disposition C-4 (2026-11-09, T-0061 stage 1) |
| D15 | Step 5 refuses, before any download and with or without `--from`, a `range.json` that is not tracked and that the range's rules ignore: UP-E13 (OQ-026; 2026-11-09, T-0061 stage 1) |
| D16 | R2 lists every path M6 deleted, after the counts and without a code; R4 says the `\|\|\|\|\|\|\|` section of a conflict block is the text of R1's base version (2026-11-09, T-0061 stage 1) |
| D17 | A `--from <commit>` base is the content of that commit, whoever suggested it: not protected (B1); R1 says it was not checked against an upstream tag (2026-11-09, T-0061 stage 1) |
| D18 | For a base from `range.json`, UP-E12, UP-E08 and a CW-E07 for status 404 on the tag download give the remedies in this order: `--from <version>` when the teacher knows the release the range came from (checked through its tag); `--from <commit>` with the recorded commit only when the teacher knows the range was made from it, since it is not a release (UP-E12) or could not be checked against its tag (UP-E08, the 404 CW-E07); `git log -p -- range.json` to see who changed the record (2026-11-10, round 2 disposition W1; the reason per code, revision 3.2) |
| D19 | A git command of steps 4, 5 or 8 other than `git merge-file` (M12, UP-E11) that exits outside its documented codes, or that `runGit` rejects, is CW-E14 naming the command: for an exit the message carries `git <command> failed (exit code N): <stderr>`, and the implementation wraps a rejection so that its message names the command too; on the upgrade path CW-E14 thus also covers a known git failure, not only a bug, which 0005's "an unexpected error" wording does not say (2026-11-10, W7; as T-0026's D6) |
| D20 | A completed run is one whose step 9 finished; a signal in step 10 still leaves a completed run, which prints R1–R5 in full and exits 130 (D8) (2026-11-10, W11) |
| D21 | git's floor is 2.26, for the upgrade (step 3, UP-E02) and for create (0005's G0, CW-W01): before 2.26 git runs `core.fsmonitor=true` as a hook command with hook protocol version 1 by default, which may report no changes, so step 4's clean check could pass on a dirty tree (2.26 defaults to version 2; 2.36 reads the value as a boolean; B4 lists what remains), and before 2.25.2 `git check-ignore` ignores `!` re-inclusions (P-5, D15); Ubuntu 20.04's git 2.25.1 is not supported (2026-11-10, the user, after T-0063's comparison of git 2.20 and 2.54) |
| D22 | `git checkout -- .` removes a directory standing where `HEAD` has a file, with every file in it, ignored ones included, whatever the restore order (measured with git 2.54 in both orders, U70 (d); read in git 2.20's and 2.54's `entry.c`); AC-11's clause on trees built from a commit excepts such a file and B4's Does not protect lists it (2026-11-10, T-0063's stage 6 finding F9, applied under the user's authorisation of that day) |
| D23 | R5 and UP-E09 print the restore commands as one line, `git checkout -- . && git clean -fd`, so `git clean -fd` never runs when `git checkout -- .` fails (a shell without `&&`, such as Windows PowerShell 5.1, refuses the whole line); tests still run them one by one and require each to exit 0 (2026-11-10, revision 3's close-out chain env:Y1) |
| D24 | Pre-check P-10: an untracked path that exists by `lstat` is left untouched, UP-A15; step 4 left no untracked file the range does not ignore and P-5 took the ignored ones, so such a path is reached through another name, one the native `realpath` did not report (P-9); this needs no file-system support (2026-11-10, close-out chains env:Y1, env:Y2, b3:Y2, fork:Y4, fork:Y5) |

One correction to R6 ⑦'s wording, a fact: an upgrade can add files, which are untracked, so restoring
needs `git clean -fd` as well as `git checkout -- .`. Because the tree had to be clean, ignored paths
and ignore files are never touched (P-5, P-7, P-9; B4 lists the limits of P-9) and an ignored `range.json` is refused (D15), the
two commands return the range to `HEAD` exactly when `checkout` runs first, so that `clean` applies
`HEAD`'s ignore rules (D14); B4 lists the limits, including the teacher's own shell configuration.

## Seams

| Seam | Entry point | Observable output |
|---|---|---|
| 0006-S1 | 0005-S1's `run` with argv whose first positional is `upgrade`; `deps.cwd` a temporary git repository built by the test (a committed fixture range, real git, `HOME` and `XDG_CONFIG_HOME` isolated as in 0005-S1: `buildGitEnv` drops every `GIT_*` variable, `GIT_CONFIG_GLOBAL` included, and sets `GIT_CONFIG_NOSYSTEM=1`, so no system configuration is read); `deps.tmpRoot` a directory the test owns; `fetchArchive` returning fixture archives for the base and target refs (a base from `range.json` is requested as `refs/tags/v<version>`, D11); `deps.fs` the file system (production passes `node:fs/promises`, whose `realpath` is the native one), which a test may wrap to model a name alias that no CI file system produces: every function the upgrade calls on the alias acts on the aliased entry (`lstat`, `realpath`, reads and `unlink` included), and every other path passes through unchanged; the range root does too, except in U69's `\`-separated and drive-root models, which wrap its `realpath` as well (D12); `checkpoint` names are the upgrade's own `step-3` to `step-10` (this file's step numbers, not 0005's), and a signal "during step 9" is raised from a wrapped `deps.fs` call of step 9; `runGit` the real runner (or a stub: rejecting `ENOENT` for U04; exiting 128 or rejecting `EIO` for U67's and U74's git failures); every git command, including `merge-file`, goes through `runGit` | the working tree's files and modes; `git status --porcelain=v1 --untracked-files=all`; `HEAD` and `git diff --cached`; the exit code; stream text by message id and code; the calls `fetchArchive` received; the entries left under `tmpRoot` |
| 0006-S2 | stage 8, local, terminal: the simulation below, with the package packed (`npm pack`, which runs 0005's `prepareDist`) from A (the HEAD of the ticket running stage 8) and run as `npx --yes <tarball>`; step 5 runs the published `create-wxl@3.0.0` from the registry | exit codes; terminal text; `git status`, `git diff`, file contents; `pnpm install && pnpm build`; the tree after the restore commands |

`deps.tmpRoot` is new in this epic (the `bin` passes `os.tmpdir()`); everything else is 0005-S1's.
Tests live under `create-wxl/test/` (0005). Tests needing symbolic links or the executable bit are
skipped on Windows; tests needing a letter-case alias from the real file system run only on macOS or Windows on a
case-insensitive file system, and are skipped elsewhere with that reason (P-9 relies on a native
`realpath` that reports the stored name; B4). In an input cell, `\uXXXX` inside a code span stands for
the single code point U+XXXX; any other `\` is a literal backslash.

## Fixed lists

### Vocabulary

| Term | Meaning here |
|---|---|
| base | the upstream commit the range was last created or upgraded from: `range.json`'s `upstream.commit`, which must be a release (J6); the commit `--from <commit>` names; or, for `--from <version>`, the commit the archive of tag `v<version>` names in its pax `comment` (step 7) |
| release | an upstream commit that tag `v<version>` in the source record's repository (0005 step 2) points to (after peeling an annotated tag); the archive of `refs/tags/v<version>` names it in its pax `comment` |
| name on disk | for a path q, other than the range root, that exists in the range: take R, the native `realpath` of the range root (as step 3 computes it), and Q, the native `realpath` of `<range root>/q`, each with `\` turned into `/` as in step 3; let R′ be R when R ends in `/` (a drive root such as `D:/`, or `/`) and R followed by `/` otherwise; when Q does not start with R′, the name on disk differs from q; otherwise it is the rest of Q after R′. Where the native `realpath` reports the stored name (APFS on macOS, NTFS on Windows, case-sensitive ext4 on Linux; B4 lists the rest), it shows the letter case and the long name the file system stores |
| target | the commit in create-wxl's package source record, or `CREATE_WXL_COMMIT` |
| B, T | the pristine ranges (0005 P1–P4) of base and target, built by the running create-wxl; for a `--from <commit>` base, B is that commit's pristine range, which may not be an upstream release (D17; GLOSSARY's 原廠靶場 assumes one) |
| tracked | listed by `git ls-files -z` |
| o | for a path p: what is at p in the range on disk, by `lstat`: absent (including when a parent is not a directory); a regular file (its bytes); a symbolic link; or another non-file |
| b, t | p's file in B, T, or absent |
| ≡ | equality of two sides: both absent; or both regular files whose contents are equal, comparing text files after replacing every CRLF with LF and binary files byte for byte. Text and binary as below |
| binary | a file whose first 8000 bytes contain a NUL byte, on any present side |
| ignored path | a path that is not tracked and that `git check-ignore -q --no-index -- ./<path>` reports as ignored by the range's rules (the `./` keeps the path literal; `check-ignore` refuses pathspec magic, `--literal-pathspecs` included) |
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
| 3 | Git and location: `git --version` reports 2.26 or later (D21); `git rev-parse --show-toplevel` and `deps.cwd`, each resolved with `deps.fs.realpath` (the native one) and with `\` turned into `/`, are equal | UP-E02, UP-E01 |
| 4 | Clean repository: `git rev-parse --verify HEAD` succeeds; `git --no-optional-locks status --porcelain=v1 --untracked-files=all --ignore-submodules=none` prints nothing; `git ls-files -v` shows no lowercase tag (assume-unchanged) and no `S` (skip-worktree); none of `MERGE_HEAD`, `CHERRY_PICK_HEAD`, `REVERT_HEAD`, `BISECT_LOG`, `rebase-merge`, `rebase-apply`, `sequencer` (D7) exists under `git rev-parse --git-dir` | UP-E03 (with a reason token), CW-E14 (D19) |
| 5 | Base: `--from` if given; otherwise `range.json` (below). Then, with or without `--from`: if `range.json` is not tracked (`git ls-files -z -- ./range.json` prints nothing) and `git check-ignore -q --no-index -- ./range.json` reports it ignored → UP-E13 (D15); `git check-ignore` exits 0 for ignored and 1 for not ignored, and `git ls-files` exiting other than 0, `git check-ignore` exiting other than 0 or 1, or `runGit` rejecting for either is CW-E14 naming the command (D19) | UP-E04, UP-E05, UP-E06, UP-E13, CW-E14 |
| 6 | Target: the source record's commit, or `CREATE_WXL_COMMIT` (CW-W04). Before any download: if the base commit is known and equals the target commit → UP-I01; if the base version is known: lower than 3.0.0 → UP-E10, higher than the target version → UP-E07, equal with a different commit and no `CREATE_WXL_COMMIT` → UP-I01 | UP-I01, UP-E07, UP-E10 |
| 7 | Download (0005 step 6), always from the source record's repository (never `upstream.repository`, which J5 only compares), first the base — for a base from `range.json` the URL `https://codeload.github.com/<repository>/tar.gz/refs/tags/v<upstream.version>` (D11); for `--from <version>` the same URL with the given version, whose pax `comment` gives the base commit; for `--from <commit>` by commit — then the target by commit (for a base from `range.json`, a CW-E07 for status 404 on the tag download also gives D18's remedies; any other CW-E07 is 0005's message unchanged); then validate the base, then the target (0005 entry rules; for a tag download, rule 2's comparison is replaced by "the `comment` is 40 lowercase hex", else UP-E08, and for a base from `range.json` the `comment` must then also equal `upstream.commit`, else UP-E12 (J6); the archive is parsed first (a parse error is CW-E08, as in 0005), then these `comment` checks come, so an archive failing them is not checked against any other entry rule: rule 2's first component, and rules 1 and 3–5); now that both are known, repeat step 6's checks (the base version for `--from <commit>` is the base archive's `package.json` `version` before P3); extract each into its own `mkdtemp` directory under `deps.tmpRoot` with prefix `create-wxl-upgrade-`; apply P1–P4 | CW-E07, CW-E08, CW-E10, UP-E08, UP-E12, UP-I01, UP-E07, UP-E10 |
| 8 | Plan: for every path in B ∪ T ∪ tracked, decide by the pre-checks (P-9's native `realpath` calls included), read o, and decide by the merge table; run every `git merge-file` (its inputs written to files in one `mkdtemp` directory under `deps.tmpRoot`, prefix `create-wxl-upgrade-merge-`, apart from B's and T's, created when the first path reaches M12 and reused for every later one; a run with no M12 path creates none); nothing is written in the range | UP-E11, CW-E14 (D19) |
| 9 | Apply: first every deletion, then every write in sorted path order, each write to a new file in the destination directory then renamed over the destination (creating missing parent directories); then write `range.json` the same way | UP-E09 |
| 10 | Remove the run's temporary directories; print the report | — |

Steps 1–8 write nothing in the range. The temporary directories under `tmpRoot` are removed in every
case, by their own paths. Exit code: 0 when the run completed (step 9 finished, D20; attention items
or not) and no signal arrived in step 10, and for UP-I01; 1 on any error; 130 on a signal, including
one in step 10 after a completed run. A signal during step 9 prints UP-E09 with the restore
commands. A signal in step 10 lets the report finish, then exits 130 (D8). Signals are 0005's three,
handled from step 3.

### Base from `range.json`

| # | Rule | Failure |
|---|---|---|
| J1 | `range.json` at the range root, by `lstat`: absent, or a regular file | not a regular file → UP-E06 `not-a-file` |
| J2 | Absent and no `--from` | UP-E04 |
| J3 | Parses as JSON without a BOM, and is an object | UP-E06 `not-json` / `not-object` |
| J4 | `upstream` is an object with `repository` a string, `version` matching `^\d+\.\d+\.\d+$`, `commit` matching `^[0-9a-f]{40}$` | UP-E06 `upstream`, `upstream.repository`, `upstream.version`, `upstream.commit` (the first broken, in that order) |
| J5 | `upstream.repository` equals the source record's repository, ignoring ASCII case | UP-E05 |
| J6 | The archive of tag `v<upstream.version>` (step 7) names `upstream.commit` in its pax `comment`, so the base is a release (D11); a fork cannot supply a tag in upstream's namespace | UP-E12 |

With `--from`, only J1 and J3 apply (a present `range.json` must be a regular file holding a JSON
object, since step 9 rewrites it); J2, J4, J5 and J6 do not: a `--from <commit>` base is not checked against a tag (D17), and a
`--from <version>` base is its tag's commit by construction (step 7). D15's check in step 5 applies either way.

### Pre-checks (step 8, before the merge table; checked in order P-1 to P-10, the first match applies)

| # | Condition | Action | Report |
|---|---|---|---|
| P-1 | p is `range.json` | skip (step 9 writes it) | — |
| P-2 | b ≡ t | leave o as it is | — |
| P-3 | p or a parent inside the range is a symbolic link | untouched | UP-A7 |
| P-4 | another path of B ∪ T ∪ tracked differs from p but equals it after NFC normalisation and case folding | untouched | UP-A8 |
| P-5 | p is an ignored path, or t is present and p would be an ignored path | untouched | UP-A9 |
| P-6 | o is a non-file (other than a symbolic link), and o ≢ t | untouched | UP-A10 |
| P-7 | p's last component, after NFC normalisation and case folding, is `.gitignore` (D9) | untouched | UP-A13 |
| P-8 | p is a submodule (gitlink) or a path under one (D10) | untouched | UP-A14 |
| P-9 | Let q be p when o exists by `lstat`, otherwise the deepest proper ancestor of p inside the range that exists by `lstat`, walking from the range root (it may be a regular file, as in U54's first case); when q is the range root, P-9 does not apply. q's name on disk and q differ after NFC normalisation of both (D12). An `lstat` error other than ENOENT or ENOTDIR, or a rejection of the native `realpath`, is UP-E11 naming p | untouched | UP-A15 |
| P-10 | p is not tracked and exists by `lstat` (D24). An `lstat` error other than ENOENT or ENOTDIR is UP-E11 naming p | untouched | UP-A15 |

P-9 catches the names P-4 cannot see because they are not in B ∪ T ∪ tracked: names the file system
resolves to another entry (a Windows 8.3 short name such as `GITIGN~1` for `.gitignore`, HFS+
ignorable code points, letter case), in p itself or in a parent directory, such as an upstream file
under `platform/` where the range has the directory `Platform/`. It runs after P-3, so a symbolic link
is UP-A7 before `realpath` would follow it, and after P-4, so a collision within B ∪ T ∪ tracked stays
UP-A8. Both sides are compared after NFC normalisation, because HFS+ returns its stored NFD form for
every non-ASCII name. Its comparison holds where the native `realpath` reports the stored name
(APFS on macOS, NTFS on Windows, case-sensitive ext4 on Linux); B4 lists the rest. An ignore file that upstream itself adds under a name the file
system resolves to `.gitignore` where none exists yet (an HFS+ ignorable code point, an NTFS stream)
is neither P-7's nor P-9's case: it is upstream's content, which B2 trusts.

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
| M12 | b, o, t present, no two ≡, text | `git -c core.autocrlf=false merge-file -p --diff3 -L range -L <base version> -L <target version> <o> <b> <t>`, inputs with CRLF normalised to LF. Exit 0: write the output → updated; but if p ends in `.json` and the output does not parse as JSON → keep o, UP-A11. Exit 1–127: write the output → UP-A1. Any other exit, a signal, a `runGit` rejection, or output not read in full → UP-E11 | updated / UP-A1 / UP-A11 |

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
attention items; for a range with `.github/workflows/deploy.yml`, rerunning with `--host github-pages`
replaces the workflow only when it equals a known earlier template output (README's table), and a
customised workflow is kept and reported by fork:init.

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
| UP-E02 | git cannot be spawned, or is older than 2.26 (D21) | the version found, `https://git-scm.com/downloads` |
| UP-E03 | not clean: reason token `no-head`, `changes`, `assume-unchanged`, `skip-worktree`, or `in-progress` | the token, and `git status` |
| UP-E04 | no `range.json` and no `--from` | `--from <version>` and `--from <commit>`, and that a range made with create-wxl has `range.json` |
| UP-E05 | J5 broken | both repositories |
| UP-E06 | J1, J3 or J4 broken | the rule's token |
| UP-E07 | target version lower than base version | both versions |
| UP-E08 | the tag archive's pax `comment` is not 40 lowercase hex | the tag; for a base from `range.json`, D18's remedies |
| UP-E09 | a write failed or a signal arrived during step 9 | the path and error (for a signal: the signal), and the restore commands as one line, `git checkout -- . && git clean -fd` (D14, D23) |
| UP-E10 | base version lower than 3.0.0 | the version, and that ranges before 3.0.0 cannot be upgraded by this tool |
| UP-E11 | planning failed: a read error (P-9's `lstat` and native `realpath` included), or `git merge-file` exited outside 0–127, was rejected by `runGit` or was not read in full | the path and error |
| UP-E12 | the base from `range.json` is not a release: tag `v<version>`'s archive names another 40-hex commit (J6, D11) | the version, both commits, why `range.json` may not record a release (it was written with `CREATE_WXL_COMMIT` or by a package packed at a commit other than its version's tag, the tag moved since, or someone changed the record), and D18's remedies |
| UP-E13 | `range.json` is not tracked and the range's rules ignore it (D15) | that the restore commands could not undo the upgrade's write to it; remove the ignore rule and commit that change, together with `range.json` when it exists, or, when `range.json` exists, track it with `git add -f -- range.json` and commit it; the rule may be in a `.gitignore`, in `.git/info/exclude` or in the teacher's `core.excludesFile`; when a tracked file's name differs from `range.json` only in letter case (such as `Range.json`), rename it with `git mv` and commit |
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
| UP-A13 | upstream changed an ignore file; left as it is so ignored files and the restore commands stay safe; merge the rules by hand (D9) |
| UP-A14 | a path at or inside a submodule; untouched, since the restore commands cannot undo changes there (D10) |
| UP-A15 | the path's name on disk differs from upstream's (a short name, ignored characters, or letter case, in the path or a parent); untouched (D12; P-9, P-10) |

### Report

Printed after step 9 on stdout, in the run's language, as lines each beginning with its entry's id
followed by `: `; an entry of several lines repeats its id on every line. Sorted by path means
compared by UTF-16 code units (JavaScript's default string order) on the unescaped path.

| Id | Content |
|---|---|
| R1 | the running create-wxl version; base version and commit; target version and commit; for a `--from <commit>` base, that it was not checked against an upstream tag (D17) |
| R2 | counts: updated, added, deleted (each equal to the number of paths so classified; M10 is not counted as updated); then one line per path M6 deleted, holding the escaped path, sorted by path, without a code (D16) |
| R3 | one line per attention item: its UP-A code and the path, sorted by path (UP-A12 once, last) |
| R4 | next steps: `git status` and `git diff`; resolve UP-A1 markers (search `<<<<<<<`) and the other items; when R3 holds UP-A1, a line saying that in a conflict block the section after `\|\|\|\|\|\|\|` is the text of R1's base version, so a base that is not the version the range came from means running R5's commands first (D16); `pnpm install` when the run wrote `package.json` or `pnpm-lock.yaml`; build and test; commit; for a range with `.github/workflows/deploy.yml`, push a new `v*` tag to deploy |
| R5 | to undo the whole upgrade before making other changes: `git checkout -- . && git clean -fd` as one line (D14, D23) |

### Stage 8 simulation (0006-S2)

Branch `sim/0006-upgrade` pushed to upstream and deleted after the run; an explicit exception to
hard rule 1 (it is not a ticket branch), recorded in the ticket. Commit B is made with the project's
commit skill; commits inside the temporary ranges are test fixtures, not project history, and an explicit exception
to hard rule 5 as well (they are not made with the commit skill).

- **A** = the HEAD, pushed, of the ticket running this stage 8 (T-0061 for revision 3).
- **B** = A plus: in `platform/challenge/door-is-open/index.md`, one line of the brief changed; a new file
  `platform/public/upgrade-sim.txt`; `.archive/guide/terminal.md` deleted; `package.json` `version`
  raised by one patch level and a script `"sim:noop": "node -e \"\""` added; and the `tagline:` line of
  `platform/index.md` changed to `tagline: Upstream simulation B`.

Run, in an empty temporary directory, with the package packed from A:

1. `CREATE_WXL_COMMIT=<A> npx --yes <tarball> sim --author 'Stage Eight' --repo wxl-test/sim --host github-pages </dev/null` (non-interactive).
2. In `sim`: change the `tagline:` line of `platform/index.md` to `tagline: Teacher edit`; change one line of `platform/challenge/staff-only/index.md`; add `platform/public/teacher-note.txt`; `git add -A && git commit -m fixture`.
3. In `sim`: `CREATE_WXL_COMMIT=<B> npx --yes <tarball> upgrade`: `range.json` names A, which is not a
   release.
4. In `sim`: `CREATE_WXL_COMMIT=<B> npx --yes <tarball> upgrade --from <A>` (the maintainer knows A is
   this range's base, D18).
5. In a second empty temporary directory: `npx --yes create-wxl@3.0.0 rel --author 'Stage Eight' --repo
   wxl-test/rel --host github-pages </dev/null`, so `range.json` records the release `v3.0.0`.
6. In `rel`: `CREATE_WXL_COMMIT=<B> npx --yes <tarball> upgrade`, without `--from`.

Steps 1, 2 and 5 need the maintainer's git to have a committer identity (0005 AC-15), so `sim` and
`rel` each have a first commit; step 5 uses the published 3.0.0 instead of A's package with
`CREATE_WXL_COMMIT=<v3.0.0's commit>`, because A's creator applied to the v3.0.0 archive is not a
range any teacher has, while the published 3.0.0 is.

Expected for step 3: exit 1; CW-W04 printed, then UP-E12 naming A and the commit of tag `v<version>`, with
D18's remedies (the root manifest's version at A must have a published tag; at T-0061 it is 3.0.0;
if it has none, step 3 gives CW-E07 and the run stops to be reported), and
`git status --porcelain=v1 --untracked-files=all` still empty. Expected for step 4: exit 0; CW-W04
printed; R1 says the base was not checked against an upstream tag; R2 counts updated 2
(`door-is-open/index.md`, `package.json`), added 1 (`upgrade-sim.txt`), deleted 1
(`.archive/guide/terminal.md`), and R2 lists `.archive/guide/terminal.md`; R3 exactly UP-A1
`platform/index.md` and UP-A12; R4 holds the `|||||||` sentence; `platform/index.md` holds the markers with the three labels and both
taglines; the teacher's `staff-only` change and `teacher-note.txt` unchanged; `package.json` holds
`sim:noop`, `version` `0.1.0` and the teacher's repository; `range.json` names B. Then, after replacing
the conflict block with `tagline: Teacher edit`: `pnpm install && pnpm build` succeed. Finally
`git checkout -- . && git clean -fd` gives an empty `git status --porcelain=v1 --untracked-files=all`
and the files of the fixture commit. Expected for step 6: exit 0; CW-W04 printed; no UP-I01 (base and target versions are both 3.0.0,
the target's from the source record, but `CREATE_WXL_COMMIT` is set) and no UP-E12; R1 names base
`3.0.0` with the commit that `git rev-parse v3.0.0^{commit}` prints in the upstream checkout (not in
`rel`), and target version `3.0.0` with commit B, and does not say the base was unchecked; `range.json` names B; the counts and attention items are not pinned
(the range is many commits behind B); `git checkout -- . && git clean -fd` then gives an empty
`git status --porcelain=v1 --untracked-files=all`.

## Matrix

| Row | Type | Field / input | Boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| U01 | argv | `upgrade --from 3.0.0`; `upgrade --from <40 hex>`; `--lang en upgrade` | grammar | accepted | AC-1 |
| U02 | argv | `--from` without value; `--from v3.0.0`; short or uppercase SHA; a second positional; unknown or repeated flag; `upgrade --repo x/y` | grammar | CW-E02, nothing written | AC-1 |
| U03 | repo | not a git repository; a subdirectory of the range; the range reached through a symbolic link to its root | location | UP-E01 / UP-E01 / accepted | AC-2 |
| U04 | repo | `runGit` rejects `ENOENT`; `git --version` reports 2.25.1 (D21); 2.26.0 passes | tool | UP-E02, exit 1 / no UP-E02 | AC-2 |
| U05 | repo | a modified tracked file; an untracked file; a staged change; no commit yet; a file marked assume-unchanged; one marked skip-worktree; `MERGE_HEAD` present; global `status.showUntrackedFiles=no` with an untracked file; `sequencer` present without `CHERRY_PICK_HEAD` (D7) | clean | UP-E03 with token `changes` / `changes` / `changes` / `no-head` / `assume-unchanged` / `skip-worktree` / `in-progress` / `changes` / `in-progress`, exit 1, nothing written | AC-2 |
| U06 | record | valid `range.json` naming a release | base | base = its commit and version; `fetchArchive` receives `refs/tags/v<version>` for the base and the target's commit | AC-3 |
| U07 | record | absent, no `--from` | J2 | UP-E04 | AC-3 |
| U08 | record | absent, `--from <version>` / `--from <commit>` | base | base from `--from`; version = given / the base archive's manifest `version` before P3, shown in R1 | AC-3 |
| U09 | record | valid and `--from` given; `upstream.repository` of another repository and `--from` given; unparsable and `--from` given | J1/J3 with `--from` | `--from` wins / `--from` wins / UP-E06 `not-json` | AC-3 |
| U10 | record | each of J1, J3, J4 broken, without `--from` (including a symbolic link, a directory, a BOM) | validity | UP-E06 with the rule's token | AC-3 |
| U11 | record | repository differs; differs only in letter case | J5 | UP-E05 / accepted | AC-3 |
| U12 | target | base commit = target commit (from `range.json` or `--from <commit>`) | no-op | UP-I01, exit 0, no download, nothing written | AC-4 |
| U13 | target | base version > target version (`range.json`) | downgrade | UP-E07 before any download | AC-4 |
| U14 | target | equal versions, different commits: with and without `CREATE_WXL_COMMIT` | override | proceeds with CW-W04 / UP-I01 | AC-4 |
| U15 | download | either archive rejected by the fetcher, hostile, or lacking a P1/P2 marker | failure | the 0005 code, exit 1, nothing written in the range, no `create-wxl-upgrade-` entry left under `tmpRoot` | AC-5 |
| U16 | download | `--from <version>`, and a base from `range.json`: the tag archive's `comment` absent or not 40 lowercase hex | resolve | UP-E08 naming the tag (for `range.json` before J6, so not UP-E12), with D18's remedies in its order for a base from `range.json` / without them for `--from <version>`; exit 1, nothing written in the range, no `create-wxl-upgrade-` entry left under `tmpRoot` | AC-5 |
| U17 | merge | one fixture with one path for each branch of P-2, M4 (both absent; both equal), M5 (updated; added), M6, M7, M8, M9, M10, M11, M12 clean, M12 conflict, plus an ignored file in a directory upstream changes | table | each path as its row states; R2 counts and R3 lines exactly those; the ignored file byte-identical; `HEAD` as before the run and `git diff --cached` empty | AC-6 |
| U18 | merge | M12 with changes in different lines | text | merged, updated | AC-6 |
| U19 | merge | M12 overlapping change, with global `merge.conflictStyle=merge` in the isolated config | text | markers `<<<<<<< range`, `\|\|\|\|\|\|\| <base version>`, `=======`, `>>>>>>> <target version>`; UP-A1 | AC-6 |
| U20 | merge | a tracked symbolic link at p; a file under a tracked symbolic-linked directory; an ignored symbolic link at p (non-Windows) | links | untouched; UP-A7; the link's target outside the range keeps its content and modification time | AC-7 |
| U21 | merge | a teacher's own file (absent in B and T) | ownership | untouched, unreported | AC-6 |
| U22 | merge | an ignored file on disk with o ≡ b where T changes it; T adds a path the range ignores (`*.local`) | ignored | untouched; UP-A9 each | AC-8 |
| U23 | merge | a new executable file in T (non-Windows) | mode | written with mode 0755 (umask 022) | AC-6 |
| U24 | record | after a completed run | write | `range.json` `upstream` = target; other keys deep-equal and in order; created when absent; a top-level `__proto__` key kept; untouched after UP-E09 for a write failure | AC-9 |
| U25 | exit | attention empty / non-empty | code | 0 / 0 | AC-10 |
| U26 | report | the run of U17 | output | R1–R5 in order with their ids, in the run's language; R4 states, when R3 holds UP-A1, that the section after `\|\|\|\|\|\|\|` is the text of R1's base version (D16); R5 names `git checkout -- . && git clean -fd` as one line (D14, D23); every UP code exists in both message tables | AC-10 |
| U27 | failure | `fs.rename` injected to fail on the 2nd write of step 9 | partial | UP-E09 naming the path and the restore commands as one line, `git checkout -- . && git clean -fd` (D14, D23), exit 1; after `git checkout -- . && git clean -fd` the porcelain status is empty and every tracked file equals `HEAD` | AC-11 |
| U28 | signal | `SIGINT` at the checkpoint of step 7; `SIGTERM` during step 9; `SIGINT` at the checkpoint of step 10 (D8) | signal | exit 130; step 7: nothing written; step 9: UP-E09 with the signal and the restore commands in U27's order; step 10: R1–R5 printed in full; no temporary directory left | AC-11 |
| U29 | restore | after the run of U17 | revert | `git checkout -- . && git clean -fd` gives an empty porcelain status and `HEAD`'s files; ignored files byte-identical to before the run | AC-11 |
| U30 | entry | upstream manifest | script | `range:upgrade` exactly as specified (checked by a create-wxl test reading the root manifest) | AC-12 |
| U31 | 0005 | `create-wxl upgrade` | grammar | the upgrade path; `create-wxl <dir>` as 0005 revision 2.3 specifies (D13 adds rule-3 rejections; C02's `upgrade` cases follow U01 and U02; the GLOSSARY sentence that `upstream-config.test.mjs` pins for the setup record changes with W4; C36 and G0's floor follow D21; C18's existing cases and the other 0005 tests unchanged) | AC-12 |
| U32 | stage 8 | simulation A → B in `sim`, and the release-based range `rel` (3.0.0) → B | 0006-S2 | exactly as listed | AC-13 |
| U50 | target | base version 2.9.9 (`range.json`); `--from 2.9.9` | minimum | UP-E10 before any download | AC-4 |
| U51 | target | `--from <commit>` whose archive's version is above the target's / equal to the target's, with a different commit and no `CREATE_WXL_COMMIT` / below 3.0.0 | post-download | UP-E07 / UP-I01 / UP-E10 after download (`fetchArchive` called for both archives), nothing written | AC-4 |
| U52 | target | `--from <version>` with `CREATE_WXL_COMMIT` set to that tag's commit, so the tag resolves to the target's commit | post-download | UP-I01 after both downloads (`fetchArchive` called twice), nothing written | AC-4 |
| U53 | merge | `Guide.md` in B, `guide.md` in T (case-only rename) | P-4 | both untouched; UP-A8 for each | AC-6 |
| U54 | merge | B has file `a`, T has `a/x`, o ≡ b at `a`; B has `a/x`, T has file `a`, o has `a/x` ≡ b | swap | the first: `a` deleted, then `a/x` written; the second: `a/x` deleted, `a` untouched with UP-A10 (a directory stands there during planning) | AC-6 |
| U55 | merge | o is a directory where b and t are different files; T adds `a/x` where o has a file `a` the teacher changed (M8 keeps it) | P-6, parent check | untouched; UP-A10 | AC-6 |
| U56 | merge | o differs from b only by CRLF line endings, t changed | normalisation | M5: t written | AC-6 |
| U57 | merge | `git merge-file` stub exits 255; the stub rejects | error | UP-E11, nothing written (each) | AC-6 |
| U58 | merge | M12 clean merge of `package.json` producing invalid JSON | json | o kept, UP-A11 | AC-6 |
| U59 | report | an anchor file with b ≢ t; none | UP-A12 | the line present / absent | AC-10 |
| U60 | write | a tracked file that is a hard link to a file outside the range, written by M5 | hard link | the outside file unchanged (write-then-rename) | AC-7 |
| U61 | repo | after a completed run and a commit, `upgrade` again | rerun | UP-I01 | AC-4 |
| U62 | output | a path containing an ANSI escape in T | escaping | rejected while T's archive is checked (0005's entry rule 3): CW-E08 with the path as an escaped JSON string literal, exit 1, nothing written (revision 2.1) | AC-10 |
| U63 | repo | upstream changes `.gitignore` (removes a rule that ignores a teacher's file; adds one) and a nested `sub/.gitignore`; o ≡ b; upstream adds `new/.gitignore` (b absent); upstream deletes `old/.gitignore` (t absent); `x/.gitignore` with o ≡ t and b ≢ t | ignore rules | every such path untouched, UP-A13 each; the teacher's ignored file byte-identical after the run and after the restore commands; `git ls-files --others --ignored --exclude-standard` lists the same paths before and after the run; exit 0 | AC-8 |
| U64 | repo | the range has a submodule `sub` (clean); upstream adds `sub/new.txt` and changes and removes paths whose names fall inside `sub` | submodule | every such path untouched, UP-A14 each; after the run `git status --porcelain=v1 --untracked-files=all --ignore-submodules=none` has no line for the submodule (`range.json` is rewritten, so not empty), and after the restore commands it is empty; exit 0 | AC-6 |
| U65 | record | valid `range.json` whose `upstream.commit` is not the 40-hex commit that tag `v<version>`'s archive names in its `comment` (a fork-network commit; a tag moved since); the same, with the tag archive also holding a `git~1` component; the same, with the target's download failing | J6 | UP-E12 naming the version and both commits, with D18's remedies in its order, exit 1, nothing written, no `create-wxl-upgrade-` entry left under `tmpRoot` / UP-E12, not CW-E08 (the `comment` checks come first) / CW-E07 for the target (both archives are downloaded before either is validated) | AC-3 |
| U66 | record | valid `range.json` whose version has no tag (`fetchArchive` resolves status 404 for `refs/tags/v<version>`); `--from <version>` naming a version with no tag; `fetchArchive` rejecting the `range.json` tag download (a network error) | J6 | CW-E07 naming the URL, with D18's remedies in its order / without them / CW-E07 without them; exit 1, nothing written in the range, no `create-wxl-upgrade-` entry left under `tmpRoot` | AC-5 |
| U67 | record | `range.json` not tracked and ignored: present and valid; absent, with `--from <version>`; present, valid, with `upstream.commit` equal to the target's commit; a symbolic link; tracked and matching an ignore rule; `git check-ignore` exiting 128; `git ls-files -z -- ./range.json` exiting 128; `runGit` rejecting with `EIO` for `git check-ignore`; ignored only by `.git/info/exclude`; absent, ignored, no `--from`; not JSON and ignored; `upstream.repository` of another repository and ignored | D15 | UP-E13 before any download / UP-E13 before any download / UP-E13, not UP-I01 (step 5 precedes step 6) / UP-E06 `not-a-file` (J1 precedes D15) / proceeds / CW-E14 / CW-E14 / CW-E14 naming `git check-ignore` / UP-E13 / UP-E04 / UP-E06 `not-json` / UP-E05 (J1–J5 precede D15); each refusal exits 1 with nothing written | AC-2 |
| U68 | merge | B has a file `GITIGN~1` ≡ the range's `.gitignore`, T lacks it, and `deps.fs` is wrapped so that `GITIGN~1` acts as `.gitignore` in every function and its `realpath` returns `<range root>/.gitignore` (an 8.3 model); on a case-insensitive file system, T adds `platform/new.txt` where the range's tracked directory is `Platform/` | P-9 | untouched, UP-A15 each; `.gitignore` and `Platform/` unchanged; no `platform/new.txt` written; `git ls-files --others --ignored --exclude-standard` lists the same paths before and after the run | AC-6, AC-8 |
| U69 | merge | the range root reached through a symbolic link to it; a tracked NFC name (`platform/caf\u00e9.md`) for which `deps.fs.realpath` returns its NFD form (an HFS+ model); a tracked NFD name for which `deps.fs.realpath` also returns NFD (a repository made on Linux); a nested tracked path whose names agree, with `deps.fs.realpath` returning `\`-separated paths (a Windows model); a range root whose `deps.fs.realpath` returns `D:\` with a tracked `platform/a.md` whose `realpath` returns `D:\platform\a.md` (a drive-root model); `deps.fs.realpath` rejecting with `EACCES` for a tracked file p with b ≢ t that P-1 to P-8 do not stop; `deps.fs.lstat` rejecting with `EACCES` for an ancestor of an absent p | P-9 | no UP-A15 / no UP-A15 / no UP-A15 / no UP-A15 / no UP-A15 / UP-E11 naming p, nothing written / UP-E11 naming p, nothing written | AC-6 |
| U70 | restore | trees the test builds from a commit: the tracked `.gitignore` deleted with an ignored file present; a tracked `sub/.gitignore` changed so it no longer ignores a file; tracked file `a` replaced by an untracked `a/x` (U54's first case); the same with an ignored `a/y.local` beside `a/x`, run in both orders (D22) | D14, D22 | R5's commands give an empty porcelain status and `HEAD`'s files; every file that `HEAD`'s ignore rules ignore byte-identical to before the commands / the same, except that `a/y.local` is gone | AC-11 |
| U71 | report | a base from `--from <commit>`; from `--from <version>`; from `range.json` | R1 | the not-checked sentence present / absent / absent, in both languages | AC-10 |
| U72 | report | a run with three M6 paths, `z.md`, `a/b.md` and `B.md`, and an UP-A1 item; a run with no UP-A1 item | R2, R4 | after the counts line, exactly three `R2` path lines, `B.md`, `a/b.md`, `z.md` (UTF-16 code-unit order, not locale order; code-point order is not separately tested), and no other R2 path line; R4's D16 sentence present / absent; in both languages | AC-10 |
| U73 | archive | a path in B or T with a component `git~1`, `GIT~1`, `git~1. :x`, `.git:x`, `.git::$INDEX_ALLOCATION`, `.g\u200cit`, `.G\u200cIT`, `\u200c.git` or `.git\ufeff`; components `PLATFO~1` and `GITIGN~1` | 0005 rule 3 (D13) | CW-E08 (rule 3) for each of the nine components git treats as `.git`, exit 1, nothing written in the range, no `create-wxl-upgrade-` entry left under `tmpRoot` / `PLATFO~1` and `GITIGN~1` accepted | AC-5 |
| U74 | repo | `runGit` stub: `git status` of step 4 exiting 128; `git ls-files -z` of step 8 exiting 128; `git check-ignore` of P-5 exiting 128 | D19 | CW-E14 naming the command, exit 1, nothing written | AC-2, AC-6 |
| U75 | merge | reading o of a tracked file p with b ≢ t fails with `EACCES` (a wrapped `deps.fs`) | read | UP-E11 naming p, nothing written | AC-6 |
| U76 | report | a run that writes `package.json`; one that writes `pnpm-lock.yaml` but not `package.json` (M5); one that writes neither; a range with `.github/workflows/deploy.yml`; one without | R4 | the `pnpm install` line present / present / absent; the `v*` tag line present / absent | AC-10 |
| U77 | merge | B has a file `GITIGN~1` ≡ the range's `.gitignore`, T lacks it, and `deps.fs` is wrapped so that `GITIGN~1` acts as `.gitignore` in every function except `realpath`, which returns `<range root>/GITIGN~1` (a WSL `/mnt/c` model, where P-9 cannot see the alias) | P-10 | untouched, UP-A15; no R2 line for it; `.gitignore` unchanged; `git ls-files --others --ignored --exclude-standard` lists the same paths before and after the run | AC-6 |

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
    are upstream's, which is what the teacher needs to see. (Revision 3: this holds for a base from
    `range.json`, by J6, and for `--from <version>` while its tag has not moved; see B1 and revision
    3's self-check.)
  - Requiring a base of 3.0.0 or later (D2 ⑩) makes every base carry 0005's `export-ignore`, so B and
    T both lack upstream's records and the pristine-range definition holds for both.
  - With `--from`, J4 and J5 are skipped so a broken record can be repaired; J1 and J3 still apply
    because step 9 rewrites the file keeping its other keys.

## Self-check of the surface (revision 3)

- New rows U65–U73 each reach an AC (AC-2, AC-3, AC-5, AC-6, AC-8, AC-10, AC-11); every AC is still
  reached by a row, and AC-6 now also lists U64 (revision 2.5's row, which it had left out). AC-13
  changes with the stage 8 simulation (U32).
- Codes added since revision 2's list, with their rows: UP-A13 U63; UP-A14 U64; UP-A15 U68; UP-E12
  U65, U32; UP-E13 U67. UP-E08 also covers a base from `range.json` (U16); UP-E11 also covers P-9
  (U69).
- The pre-checks and merge table stay total: P-9 only turns a path into "untouched", like P-3–P-8.
- Side effects of revision 3's guarantees, checked against existing rules:
  - J6 refuses, at step 7, a range whose `range.json` was last written, by create-wxl or by an
    upgrade, with `CREATE_WXL_COMMIT` or by a package packed at a commit other than its version's tag,
    unless step 5 or 6 ends the run first (UP-E13, UP-I01, UP-E07, UP-E10). A rerun with the same
    package still ends at step 6 with UP-I01 before any download (U61); the next upgrade to another
    release needs `--from`. The stage 8 simulation shows the refusal (step 3) and upgrades with
    `--from <A>` (step 4); tests that build `range.json` with an arbitrary commit serve a tag archive
    whose `comment` is that commit.
  - J6 turns B1's former "a tag upstream moves" into a refusal for a base from `range.json` (UP-E12,
    or CW-E07 for a deleted tag), after which the teacher names the base with `--from <commit>`; a
    `--from <version>` base still follows the tag as it is now, which B1 lists as not protected.
  - With J6, B3's remaining case is another upstream release, up to the target: a newer one than the
    range came from skips upstream's changes in between, an older one re-merges changes the range
    already has. The stage 1 record's wording ("an older release … skips the changes in between")
    had the direction reversed; the spec states both.
    Step 6's pre-download checks still read `range.json`'s claimed version; they never write, so a
    false claim there only ends the run (UP-I01, UP-E07, UP-E10); B3 lists that such a claim can
    hold a range at UP-I01. After J6 the version is upstream's,
    which closes T-0026's F25 for a base from `range.json`.
  - P-9 also reports an upstream path whose parent differs only in letter case from a directory the
    range has (today it would be written into that directory and collide at the next upgrade as
    UP-A8). It changes no row's result for a path whose names agree.
  - P-9 compares after NFC normalisation, so HFS+'s stored NFD names are not reported; a different
    Unicode form of one name within B ∪ T ∪ tracked stays P-4's case.
  - D14 reverses C-4. `checkout` first also handles U54's file/directory swap: it removes the untracked
    directory standing where a tracked file goes (measured with git 2.54 and 2.50; read in git 2.20's
    source). U70 and the stage 8 run exercise it. Revision 3.3: the floor is 2.26 (D21), so the git 2.20
    run the Testing Decisions asked for is not made.
  - D15 refuses before anything is written, so AC-9's "a missing file is created" and AC-11's restore
    stay true. It also refuses a `--from` run whose ignored `range.json` is absent, which step 9 would
    otherwise create.
  - D16 lists M6's paths without a code, so R2's counts (AC-10) and R3 (U32) keep their meaning.
  - D13 rejects no path that upstream holds at `v3.0.0` or at revision 3's HEAD (both trees listed
    during stage 1).
  - D16 and D17 together: `--diff3`'s base lines are upstream's for a base from `range.json` (J6) or
    `--from <version>` (its tag's `comment`). For `--from <commit>` they are that commit's content,
    which R1 marks as not checked against an upstream tag and R4 names as R1's base version (U71, U26).
  - P-1 keeps `range.json` out of P-9 on purpose: J1 and step 9 use its literal name, so on a
    case-insensitive file system a tracked letter-case variant may be read and rewritten as the
    record (inferred, not measured; B4).
    J6 still requires a release base and the restore commands undo the write; B4 lists the case.
  - P-9's guarantees are scoped to file systems whose native `realpath` reports the stored name
    (APFS on macOS, NTFS on Windows, case-sensitive ext4 on Linux): AC-8, the revision 3 paragraph
    and the name-on-disk definition say so, and B4 lists the rest (a case-insensitive Linux file
    system, Linux's view of NTFS, vfat or CIFS, other volumes such as SMB and exFAT). AC-8 defers to
    B4, which also keeps outside the model the names upstream itself ships that alias one another or
    an ignore file not yet present (revision 3.1).
  - R4's D16 sentence is printed only when R3 holds UP-A1 (the R4 row, AC-10, U26, U72); the
    self-check considered and set aside an unconditional sentence.

## Self-check of the surface (revision 3.1)

- Rows U74–U76 reach AC-2, AC-6 and AC-10; every AC is still reached by a row. Codes: CW-E14 on the
  upgrade path now has rows (U67, U74).
- Changes checked against existing rules:
  - D18 changes only the text of UP-E12, UP-E08 and, for a base from `range.json`, CW-E07; their
    conditions and exit codes are as before.
  - D19 records what the code does since T-0026's D6; CW-E14's message is unchanged, so 0005's tests
    and create's behaviour are unchanged.
  - D20 makes AC-10's "exits 0" and D8's "exits 130" agree: both runs completed.
  - The stage 8 run of `create-wxl@3.0.0` (steps 5–6) exercises J6's passing path against the real
    tag; it needs the npm registry, which stage 8 already uses through `npx`.
  - The GLOSSARY sentence for the setup record ("目前只有建立靶場的指令會寫入它") and its assertion
    in `upstream-config.test.mjs` change together at stage 5 (W4, AC-12).
  - Scoping P-9 to the default file systems CI verifies (APFS, NTFS) moves WSL's `/mnt/c`, mounted
    shares and other volumes to B4; P-9's mechanism is unchanged (W2).
- Comments and strings that revision 3 and 3.1 make stale are listed in T-0061's Comments
  (`messages.mjs`, `upgrade-report.mjs`, `upgrade.mjs`, `merge-plan.mjs`). Existing tests whose rows
  revision 3 or 3.1 changes: U06, U16, U17, U24, U26 (exact R5 strings), U27–U29, U31, U51, U52 (now
  sets `CREATE_WXL_COMMIT`), U57, U63, U64. Rows still to test: U65–U73 (revision 3) and U74–U76
  (revision 3.1).
- W5's step 5 runs the published `create-wxl@3.0.0` instead of the disposition's packed package with
  `CREATE_WXL_COMMIT`; the reason is under the stage 8 steps; the user confirmed it on 2026-11-10.
- Recorded, not changed (round 2): an emptied directory left after M6 (C-4); a partial commit after
  UP-E09 then a rerun (C-12); `.gitattributes` changes and the restore (C-13); a fork's full tree
  (C-16); step 9's temporary file name after an uncatchable signal (R-7); P-5's literal match against
  an NFD name on disk (R-9); NTFS stream names under `realpath` (C-17, not verified).

## Self-check of the surface (revision 3.3)

- D21 changes one constant that create and the upgrade share (`MINIMUM_GIT_VERSION`), so UP-E02 and
  0005's CW-W01 move together; their text names the floor from that constant. Rows U04 (2.25.1 is
  refused, 2.26.0 passes) and 0005's C36 change; every AC is still reached by a row.
- Changes checked against existing rules:
  - A teacher with git 2.20–2.25 now gets UP-E02 before any download, as git older than 2.20 did
    before; create still makes the range and prints CW-W01 with the git steps left to run (0005
    AC-15).
  - Git 2.26–2.34 with `merge.conflictStyle=zdiff3` set in a configuration it reads still stops
    `git merge-file` (UP-E11, nothing written), and its `git checkout` fails too, the restore
    commands' included; and git 2.26–2.35 with `core.fsmonitor=true` and
    `core.fsmonitorHookVersion=1` can still pass step 4's clean check on a dirty tree. Both are listed
    in B4 (T-0065's stage 7, C1 and C2), not changed.
  - D22 narrows AC-11 to what git does: the exception covers only a file inside a directory that
    stands where `HEAD` has a file. The upgrade itself never writes an ignored path (P-5), so after a
    completed or failed run such a directory holds no ignored file, and AC-11's first clause still
    holds; the exception arises only when one is placed there afterwards, which B4 already lists as a
    later edit.
  - U70 gains a case; U70's other cases and their expected results are unchanged.
- Stale text that revision 3.3 changes: `git-version.mjs`'s and `upgrade.mjs`'s comments naming 2.20.

## Self-check of the surface (revision 3.4)

- Row U77 reaches AC-6; every AC is still reached by a row. UP-A15 now comes from P-9 or P-10.
- Changes checked against existing rules:
  - P-10 cannot fire on a path the run should handle. Step 4 refuses any untracked file the range
    does not ignore (`--untracked-files=all`), and P-5 has already left every ignored untracked
    path. So an untracked p that exists by `lstat` is either reached through another name or a file
    that appeared during the run (B4's Outside the model). Leaving it untouched is the conservative
    result in both cases.
  - P-10 checks p itself, not its ancestors. A new path under a directory that only an alias
    reaches is still B4's stated limit: an empty untracked directory (for example one that an
    earlier M6 emptied, C-4) does not show in `git status`, so testing ancestors would refuse such
    paths.
  - D23 changes the text of R5 and UP-E09 only; their conditions and exit codes are as before. The
    tests run the commands one by one and require each to exit 0, which is what `&&` gives. Windows
    PowerShell 5.1 refuses `&&` and runs neither command. PowerShell 7, bash, zsh and cmd run them
    as written.
  - The B1, B3 and B4 additions describe consequences of risks already accepted. Their controls
    are unchanged, except that P-10 now covers the file-level alias that B4 had left to P-9.


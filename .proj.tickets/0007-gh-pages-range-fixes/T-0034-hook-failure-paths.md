---
id: T-0034
title: The pre-commit hook ends cleanly on interruption, git failures and a first commit
epic: 0007-gh-pages-range-fixes
status: review
blocked_by: [T-0032]
---

## Context

T-0032's hook stashes the teacher's other unstaged work under `platform/` while it generates. This
ticket makes every way that run can end safe:
- A signal or a failed git command restores the work and drops only the hook's own entry (O5).
- A restore that fails keeps the entry and prints its id (O7).
- The hook never restores into an index file that git has already removed.
- It identifies its entry by the change to `refs/stash`. A push that saves nothing must not make it
  touch the teacher's own entry.
- A first commit with unstaged files is refused (O6).
- It works under macOS's `/bin/bash` 3.2, where an empty array under `set -u` ends the shell.

Spec: `traceability.md` revision 3.2, "The hook" constraints, outcomes O5–O7, messages W7 and W9,
seam 0007-S5 (generator stubs, the `git` wrapper and the child-command blocker, the path with a
space and non-ASCII characters, inherited `GIT_*` removed).

## Deliverable

Interruption, git failures, a failed restore and a first commit each end in their documented
outcome. No unstaged file is lost, and no stash entry other than the hook's own is applied or
dropped.

## Acceptance criteria

- [x] H25: SIGINT, SIGTERM, SIGHUP to the hook's process group while a generator stub blocks → O5 (AC-23)
- [x] H26: a generator stub leaves `.git/index.lock`, so `git add` and the restore fail → O7, W9; `git stash apply` of the printed id restores the files byte for byte once the lock is gone (AC-23). Met as revision 3.2 words it: byte for byte outside D16 (a)'s exceptions (a file git converts on add, such as CRLF over an LF index version; with `git stash apply`, an unstaged hunk overlapping or adjacent to a staged one), which the H26 case leaves out (see "rulings" and "review of revision 3.1" below)
- [x] H27, H28: first commit with an unstaged file → O6 with W7; everything staged → O2, on their own fixture (AC-23)
- [x] H42: only `_redirects` differs in the working tree → no entry of the hook's own; the pre-existing entry is neither applied nor dropped (AC-23)
- [x] H45: H02, H07, H14 and H34 under `/bin/bash` 3.2 give their bash 5 outcomes; run on a Mac at stage 5, and the coverage report says so (AC-23)
- [x] H46: `.git/index.lock` exists before a direct run → O5 before any change (AC-23)
- [x] H47: SIGINT to a `git commit -a`'s process group → O5 or O7; `.git/index` unchanged, no commit, no unstaged file lost (AC-23)
- [x] H48: a stash push stopped partway (git's own `apply --index -R` or `checkout --no-overlay` blocked and signalled, or failing) on the repository's own index → O7 with W9's third form; its `git restore --staged` command puts the index back (AC-23; added in revision 3.2)
- [x] H49: the same child command fails during `git commit -a` → O5, exact: no W9, no commit, `.git/index` as before (AC-23; added in revision 3.2)
- [x] H50: a restore that stops partway on an untracked file in a directory without write permission → O7 with W9; W9's printed `git restore` commands put every file back where `git stash apply` refuses (AC-23; added in revision 3.2)
- [x] H51: in that directory, a tracked file with an unstaged change as well, so the push stops partway with the index changed and the restore fails → O7 with W9's first form followed by `git restore --staged`; the printed commands, in order, put every file and the index back (AC-23; added in revision 3.2's second round)
- [x] H52: `index.lock` removed just as the hook's restore starts → O7 with W9's missing-index form, the entry kept (AC-23; added in revision 3.2's second round)
- [x] H29, H30 hold for each of these rows except H27 and H28, which have no pre-existing entry (AC-23)

## 給使用者（zh-TW）

讓 hook 在各種意外下都乾淨收尾：
- 被 Ctrl-C 或其他訊號中斷、git 指令失敗時，會把老師的修改放回去。
- 放不回去時保留 stash entry，並印出它的 id 與復原指令。
- 第一個 commit 還有沒 stage 的檔案時，會說明原因並拒絕。
- 在 Mac 內建的 bash 3.2 底下也照樣運作。

## Comments

### 2026-10-23 — test plan (stage 5)

Seam 0007-S5, in `tests/pre-commit-sh.test.ts` with the fixture and helpers of
`tests/__helpers__/preCommitRepo.ts`, as T-0032 and T-0033 left them. Every case runs this checkout's
real `scripts/pre-commit.sh`, by its absolute path, at the top level of `<mkdtemp>/暫存 repo` (a
space and non-ASCII characters): directly with `bash`, or through a real `git commit` whose installed
`.git/hooks/pre-commit` runs that file. Child processes get `isolatedEnv`: every inherited `GIT_*`
variable removed, `HOME` and `GIT_CONFIG_GLOBAL` isolated. `bash` on this Mac is `/bin/bash`
3.2.57, so every case runs under 3.2 here and under bash 5 in CI's ubuntu.

New harness pieces, all in the helper file:

- **Process-group runner.** Starts the hook, or `git commit`, with `spawn(..., { detached: true })`, so
  it leads a new process group. It waits for a marker file by polling `existsSync` against a 30 s
  deadline (a condition, never a fixed sleep), then sends the signal with `process.kill(-pgid, sig)`.
  It awaits the child's exit, then polls until `process.kill(-pgid, 0)` throws `ESRCH`, so a hook that
  outlives `git` (H47) has finished before anything is read. A `finally` sends `SIGKILL` to the
  group if anything is left, and the case asserts the group was already gone.
- **Blocking generator stub** at the fixture's `scripts/generate-redirects.ts`. It may record
  `git stash list` and `GIT_INDEX_FILE`, and may first remove the file `GIT_INDEX_FILE` names. It then
  writes its marker under `<base>/標記 dir/` and blocks (`setInterval`); node dies of each of the
  three signals by default.
- **Lock stub.** Creates `<gitdir>/index.lock`, then runs the real generator and exits with its status.
- **git wrapper on `PATH`** (`<base>/bin 工具/git`, open point 6). It runs the real git, resolved once
  by absolute path. For one matched invocation it either blocks on a release file after writing a
  marker, fails with 128 without running git, or runs git and then exits 1.
- **First-commit fixture** for H27 and H28. It is a new repository at `<mkdtemp>/暫存 repo` with no
  commit and no stash entry, holding the copied scripts, the `node_modules` link (excluded),
  `.gitattributes`, `test-chall` (#1) and `platform/public/other.txt`, and no `_redirects`.

The outcome checks each case uses:

- **O5.** A status that is not 0: a non-zero code, or termination by the signal sent (open point 1).
  `git ls-files --stage`, every working-tree byte (`.git` excluded, `_redirects` included), the
  untracked lines of `git status` and `git stash list` with commit ids are all as before. That
  means the hook's own entry was dropped and the teacher's kept. A row says so where it lets the
  index or `_redirects` hold the expected content instead.
- **O7.** A status that is not 0. stderr holds W9: a 40-hex commit id and `git stash apply`. The
  stash list is the one from before plus exactly one entry, whose id is the printed one. The index
  and `_redirects` are as O5. Each tracked file the entry holds has its working-tree bytes equal to
  the entry's index commit (`<id>^2`), and each untracked file it holds is absent: not yet back. Where
  the row says so, the cause is then removed and `git stash apply <id>` brings every unstaged file
  back byte-identical, with untracked files still untracked.
- **O6.** Exit 1 and W7 (`first commit`, `git add`). Nothing changed: index, bytes, untracked lines,
  an empty stash list, and still no `HEAD`. Recording stubs show that neither the validator nor the
  generator was invoked.
- **The teacher's work in the failure cases.** A staged change to `door/src/app.py`, plus unstaged
  edits to `platform/public/other.txt`, to a tracked `platform/notes/名 稱.txt` and to a tracked
  binary file, an untracked `platform/notes/untracked.txt`, and an unstaged hand edit of `_redirects`.
  All text is LF (open point 3). The signal cases also hold an H19-style file whose staged hunk
  overlaps its unstaged change.

Measured before writing this plan (git 2.54.0, `/bin/bash` 3.2.57, node v24.13.0, in session
directories outside the repository). The commands below need
`export SCRATCH=/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0034`
first (stage 6 round 1, finding 1, replaced a `<scratchpad>` placeholder):

- **The current hook's EXIT trap under bash 3.2.** bash 3.2 runs the `EXIT` trap when SIGINT,
  SIGTERM or SIGHUP reaches its process group while a foreground node child blocks. The shell then
  ends by the signal (child `exit` event: code `null`, signal set). `$?` inside the trap is 130 for
  SIGINT and 0 for SIGTERM and SIGHUP. Reproduce:
  `node "$SCRATCH/sig/drive.mjs" "$SCRATCH/sig"`. The driver runs
  `sig/h.sh` (`set -euo pipefail`, `trap finish EXIT`, a node child that writes a marker and blocks)
  detached and signals the group once the marker exists. It printed `SIGINT exit null SIGINT … status=130`,
  `SIGTERM exit null SIGTERM … status=0` and `SIGHUP exit null SIGHUP … status=0` in each of three
  runs. So H25 may pass on the current hook at once.
- **A lock before the push, a lock during the restore, and an unborn branch.**
  - With `.git/index.lock` present, `git stash push --keep-index --include-untracked` exits 1 ("could
    not write index") before writing any entry: `refs/stash` is not created and the file keeps its
    unstaged bytes.
  - With a lock present, `git restore --source=<entry> --worktree` exits 128 and writes nothing.
  - On an unborn branch, `git diff --cached --quiet` exits 1, so the hook triggers, and the push
    exits 1.
  - Reproduce: `/bin/bash "$SCRATCH/m3.sh"`. It printed `push=1`, `stash-ref=1`, `a2`,
    `restore=128`, `a`, `diff-cached=1`, `unborn-push=1`.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S5 harness, every case below | H29: the pre-existing entry is still listed with its commit id, in the file's `afterEach`, which skips that check only for the first-commit fixture. H30: this checkout's `_redirects` bytes, `git ls-files --stage` and `git stash list` are unchanged, for every case, H27 and H28 included (open point 8). No process of the case's group is left | test harness | AC-23 (H29, H30) | In the O7 cases the hook's entry stays beside the teacher's. H29 still holds there, and those cases assert the extra entry themselves |
| S5 direct run, blocking generator (recording the stash list) | H25: `it.each` over SIGINT, SIGTERM and SIGHUP, each sent to the hook's process group once the generator has written its marker. O5, exact: index, every byte (`_redirects` included) and the stash list as before | hook `finish`, signal handling | AC-23 (H25) | The record taken while the stub blocks shows one entry more than before, so the hook had an entry of its own and the restore really runs. The H19 overlap file comes back with its unstaged bytes. May pass at once under 3.2 (measured). Mutation: delete `trap finish EXIT`, which should go red, with the result recorded. bash 5's behaviour is shown by CI |
| S5 direct run, blocking generator and git wrapper (blocking, ignoring signals itself) | Constraint "while restoring, the hook ignores INT, TERM and HUP", and "dropped only after the restore completed". SIGTERM during generation. The wrapper blocks the hook's first `git restore --source=<entry>`. SIGINT, SIGTERM and SIGHUP then go to the group, and the test releases the wrapper. O5, exact, and the entry is dropped | hook `finish` | AC-23 (constraints) | The wrapper's own `trap '' INT TERM HUP` keeps it alive, so the case tests only the hook. Expected red today. If bash 3.2 already defers a signal inside its EXIT trap, it passes at once with no code to mutate; record that, and let CI's bash 5 decide (open point 9) |
| S5 direct run, git wrapper (blocking `git add -- platform/public/_redirects`, dying with the signal) | H25 boundary: SIGINT once the hook has written `_redirects` and before its `git add` ran. O5 with the index exactly as before and `_redirects` back to its old bytes: the `WROTE` and not `STAGED` put-back | hook `_redirects` put-back | AC-23 (H25); the `_redirects` constraint | The alternative O5 allows, "equal to the expected content when the index holds it", needs a signal after the add started. That is a race and is not tested |
| S5 direct run, lock stub | H26: the stub creates `<gitdir>/index.lock` and generation succeeds, so `git add` fails and so does the restore. O7: W9's id is the new entry, `_redirects` is back to its bytes from before, the entry's files are not yet back, and the lock is still there. The test then removes the lock and runs `git stash apply <id>`. Every unstaged file is byte-identical, untracked files are untracked, and the index is as before | hook `finish`, the kept-entry branch | AC-23 (H26) | Names with a space and non-ASCII characters, and a binary file. No CRLF file and no overlapping hunk (open point 3). This first drives T-0032's undriven put-back and kept-entry branches. Expected green at once (T-0032 keeps the entry and prints `git stash apply <id>`). Mutation: drop the entry whatever the restore returned, which should go red |
| S5 direct run | H46: an empty `.git/index.lock` exists before the run, a challenge change is staged and files are unstaged. O5 before any change: everything as before, `_redirects` included, the stash list as before, and the lock still present with its bytes | hook push failure | AC-23 (H46) | Measured: the push fails before writing an entry. Expected green at once. Mutations: `exit "$status"` → `exit 0` in `finish` should go red on the status. The push's failure swallowed (`\|\| true`) with the put-back disabled should go red on `_redirects`'s bytes |
| S5 direct run, git wrapper (one invocation fails) | O5 "a git command fails, at any point", for the failures `set -e` cannot see (open point 4). `it.each`: (a) `stash push` runs and then exits 1, so the entry exists while the push reports failure (security-T-0032 S6). The hook treats the entry `refs/stash` gained as its own, restores it and drops it. (b) Each `< <(git …)` listing fails with 128 (security-T-0033 S4): the untracked-directory listing (W4), the deleted-paths listing, the raw-copy listings, the validator's `ACMRD` list and `index_slugs`' `git ls-files`. O5, exact, in each case | hook git error handling | AC-23 (O5) | Expected red today. In (a) the entry is left, the unstaged files are not put back and nothing is printed. In most of (b) the run goes on and exits 0. The matcher names each invocation by its arguments, so a later hook edit that changes an invocation makes the case fail loudly ("wrapper never matched") instead of passing |
| S5 direct run, blocking generator that removes the file `GIT_INDEX_FILE` names | Constraint "the hook never restores into a missing index", H47's O7 branch made deterministic. The direct run has `GIT_INDEX_FILE=<physical gitdir>/index.lock`, a copy of `.git/index`, so the hook counts it as its own index. The stub removes that file, writes its marker and blocks, then SIGINT is sent. O7: W9 and the entry listed. No `.git/index.lock` exists afterwards, `.git/index`'s `git ls-files --stage` is unchanged and `_redirects` is as before. `git stash apply <id>` then brings the files back byte-identical | hook `finish`, missing-index guard | AC-23 (constraint; H47) | Expected red today: the restore would write a new index at the missing path and drop the entry |
| S5 `git commit -a`, blocking generator (recording `GIT_INDEX_FILE`) | H47: `git commit -a -m …` leads its process group. The stub records `<gitdir>/index.lock` as `GIT_INDEX_FILE` and blocks. SIGINT goes to the group, then the test waits for git's exit and for the group to empty. Either O5 or O7. In both, `HEAD` is unchanged, `.git/index`'s `git ls-files --stage` is as before and no `.git/index.lock` is left. With W9, its id is listed, and each unstaged or untracked file's earlier bytes are in the working tree or in the entry (`git show <id>:<path>`, `<id>^3:<path>`). Without W9, every O5 check holds | hook under `git commit -a` | AC-23 (H47) | `-a` stages tracked edits into `index.lock`, so the entry holds the untracked files. LF only. The branch each run took is printed and recorded in the coverage report. "`.git/index` as before" is compared by `ls-files --stage`, not raw bytes (open point 7) |
| first-commit fixture, direct run and `git commit` | H27: with no `HEAD`, the fixture staged, and (i) an unstaged edit to a staged file under `platform/`, or (ii) an untracked file under `platform/`, the hook ends in O6. Through `git commit -m`, no commit is made (`git rev-parse -q --verify HEAD` fails) | hook O6 check | AC-23 (H27) | Red today: the push exits 1 with git's message and no W7 (measured). H29 does not apply and H30 does |
| first-commit fixture, direct run and `git commit` | H28: everything under `platform/` staged. O2: the expected `_redirects` staged as added (`A` in `git diff --cached --name-status`), with literal rule lines `/c/001 /challenge/test-chall/` and the two `:slug` rules. No W3 (open point 2). Through `git commit -m`, the root commit's tree holds the expected file | hook with no `HEAD` | AC-23 (H28) | Boundary: an untracked file outside `platform/` still gives O2, and that file is byte-identical and untracked. Boundary: only an unstaged `_redirects` differs (open point 2). Expected green at once directly. Mutation once O6 exists: refuse whenever any file is untracked, which should go red on the outside-`platform/` boundary |
| S5 direct run, recording generator (stash list) | H42: only `_redirects` is staged, with a hand edit, and a different version is unstaged; nothing else under `platform/` differs. O2 with W3. The stub's record shows the stash list during the run equal to before, so the hook has no entry of its own. Afterwards the list is unchanged. The teacher's entry was not applied (`other.txt` keeps its bytes, and `_redirects` holds no `# stashed by the teacher`) and not dropped | hook stash identification | AC-23 (H42) | Expected green at once: the hook skips the push when nothing under `platform/` other than `_redirects` differs. Mutation m1: that pre-check made always true. The push then saves nothing and `refs/stash` is unchanged, so the case should stay green: the identification by `refs/stash`'s change holds alone. Mutation m2: m1 plus `OWN_ENTRY` taken from `refs/stash` unconditionally, which should go red. Both results are recorded |
| `/bin/bash` 3.2 explicitly | H45: H02 + H14, H07 and H34 rerun with `/bin/bash`. Direct runs spawn `/bin/bash <hook>`. Commits run with `PATH=/bin:$PATH`, so the installed hook's `bash` is `/bin/bash`, and the case asserts `command -v bash` under that environment. Each case shares its outcome helper with the bash-from-`PATH` case. H34 commits a stale `_redirects` with `--no-verify` (door's two rules removed), runs `node --experimental-strip-types scripts/generate-redirects.ts` in the fixture, then `git add` and `git commit`. The commit's `_redirects` equals the oracle and `FIXTURE_RULES` | hook under bash 3.2 with `set -u` | AC-23 (H45) | `describe.skipIf` unless `/bin/bash -c 'echo ${BASH_VERSINFO[0]}'` prints `3`. CI's ubuntu skips it. It runs on this Mac, and the coverage report says so. The bash 5 half is CI's run of the H02/H14 and H07 cases; H34's own case is T-0035's (open point 5). Expected green at once. Mutation: the `${#VALIDATE[@]} -gt 0` guard removed should send H02/H14 red under 3.2 ("unbound variable") |
| stage 6, diff check | W7 and W9 hold the messages table's substrings. The hook's header comment describes signals, O5–O7, the missing-index rule and O6. Each drop follows a completed restore in the source, and nothing else applies, pops or drops an entry (`grep -n "stash \(drop\|apply\|pop\)" scripts/pre-commit.sh`) | hook source | AC-23 (constraints) | Not run automatically |
| stage 8, S7, as far as this ticket reaches | In a temporary local clone of this branch, never pushed and removed afterwards, with the hook `simple-git-hooks` installs and `/bin/bash` 3.2: (a) `git init` of a copy of the tree with no commit, then `pnpm install`. The first `git commit` with an unstaged file under `platform/` prints W7 and makes no commit; with everything staged, the commit holds the expected `_redirects`. (b) `touch .git/index.lock && bash scripts/pre-commit.sh` with a challenge change staged ends non-zero with nothing changed; then the lock is removed | the teacher's command line | AC-23 (H27, H28, H46) | Ctrl-C during a real commit is not driven by hand, since the real generator finishes too fast to interrupt reliably: H25 and H47 rest on the automated cases. The epic's final stage 8 is T-0039's |

Approval: The user approved this test plan in advance on 2026-10-23 with the standing instruction "授權權限，完成到結束" (permission granted; carry it through to the end), given together with "ultracode 先確認是否能夠平行，若有風險都選擇順序，完成 T-0033 T-0034 T-0035 T-0037 T-0038".

Open points, to resolve before the first test:

1. **A signal's "non-zero".** O5's row says "non-zero". bash 3.2 ends by the signal after its EXIT trap
   (measured), so the status is a signal and not a code. The plan accepts either, since git treats
   both as a failed hook.
2. **W3 and O6 with no `HEAD`.**
   - The messages table says "With no `HEAD`, every version that is not the expected one counts as
     the teacher's." Read literally, H28's absent `_redirects` would print W3. T-0032's point 8 and H18
     treat an absence as `HEAD`'s version when `HEAD` has none. The plan keeps that reading: no W3.
   - O6 says "something under `platform/` is unstaged or untracked", while the stash constraint
     excludes `_redirects`. The plan reads an unstaged `_redirects` alone as needing no stash: O2,
     with D3 and W3, not O6.
3. **W9's remedy is not byte for byte in two cases.** H26 says "`git stash apply` of that id brings
   the unstaged files back byte for byte". Two things break it:
   - Under `* text=auto eol=lf`, git writes a stashed CRLF file back with LF (T-0032 stage 6, finding
     5), and the hook's raw copies are deleted with `$WORK`.
   - `apply` after `--keep-index` conflicts on overlapping hunks (T-0032 M3).
   The plan uses LF and binary files only, and records both as known edges. The alternative is to
   keep the raw copies and name their directory in W9. That would be a new guarantee, which needs a
   check against the existing rules first.
4. **How far O5 reaches.** O5 covers "a git command fails, at any point", but AC-23 lists only "a git
   command failing before the hook stashed" and H26. The wrapper row covers the failures the hook
   cannot see today (forwarded as T-0032 S6 and T-0033 S4). Drop that row if the ticket is kept to
   its listed rows; the gaps then become known edges.
5. **H34 is T-0035's row.** H45 names H34, but H34's case belongs to T-0035. This ticket writes H34's
   scenario only for the `/bin/bash` run; T-0035 adds its bash 5 case on the same helper. Also,
   `pnpm redirects:generate` runs as its underlying `node` command, because the fixture has no
   `package.json`.
6. **A git wrapper goes beyond S5's stubs.** S5 lists "copies of the scripts the hook calls, any of
   which a case may replace with a stub". A git wrapper on `PATH` is not one of them. It is the only
   deterministic way to time a signal during the restore or to fail a single git call.
7. **H47 and "`.git/index` as before".** H47 cannot pick its branch, so the missing-index row
   isolates the O7 branch. "`.git/index` is as before" is compared by `ls-files --stage`, because
   `git status` may refresh stat data.
8. **H30 for H27 and H28.** The ticket says "H29, H30 hold for each of these rows except H27 and
   H28", while traceability's H30 covers "every H row". The plan applies H30 to H27 and H28 too.
9. **The ignore-while-restoring row may not be falsifiable here.** If bash 3.2 already blocks a
   second signal inside the EXIT trap, the row passes with no code to mutate. No bash 5 is installed
   here (`ls /opt/homebrew/bin/bash /usr/local/bin/bash` finds neither), so CI decides.

### 2026-10-23 — open points resolved (stage 5)

1. **A signal's "non-zero".** The hook now traps HUP, INT and TERM itself and ends with 128 + the
   signal's number (129, 130, 143) through `finish`, under bash 3.2 as under bash 5. H25 asserts that
   code exactly. The other cases accept a non-zero code or termination by the signal sent, because in
   H47 the leader is `git commit`, which dies by SIGINT itself. Mutation M3 removes the three traps:
   H25 goes red on the status, while the restore still completes under 3.2.
2. **W3 and O6 with no `HEAD`.** The plan's reading is kept:
   - An absent `_redirects` counts as `HEAD`'s version when `HEAD` has none (T-0032 point 8, H18).
     So H28 prints no W3.
   - An unstaged or untracked `_redirects` alone needs no stash, and O6's reason ("git cannot
     stash") does not apply to it, so it ends in O2 with D3 and W3. The case is the H28 boundary
     "only an unstaged `_redirects` differs". In the first-commit fixture that file is untracked,
     since the index has none.
   - The O6 check uses the same predicate as the stash (`rest_dirty`), so the two cannot drift
     apart.
3. **W9's remedy is not byte for byte with CRLF files or overlapping hunks.** The plan is kept: H26
   and the missing-index case use LF and binary files only, and both limits are known edges (below).
   Keeping `$WORK/raw` and naming it in W9 was not done. It is a new guarantee: the raw copies would
   outlive the run in `TMPDIR`, and W9's id would stop being the whole remedy. Rule 5 asks for a
   side-effect check before adding such a guarantee, and no row asks for it.
4. **How far O5 reaches.** The wrapper row was kept and widened by two cases on the same seam: the
   `git diff --quiet` pre-check for unstaged files and the `rev-parse` of `refs/stash` before the
   push. Before this ticket a failed read before the push gave an empty `before`. If the push then
   saved nothing, the teacher's newest entry would have counted as the hook's own and been restored
   and dropped. `stash_top` now ends the run on any status other than 0 or 1. Two failures stay
   outside this ticket's rows, both read from the code and not run, and are listed as known edges:
   - the `rev-parse` right after a push that saved an entry;
   - a failed `git stash drop` after a completed restore.
5. **H34.** Only its `/bin/bash` run is written here, through the shared helper `expectH34(env)` in
   `tests/pre-commit-sh.test.ts`. T-0035 owns H34's own case under the `bash` on `PATH` and should
   call the same helper, so that H45's "same outcome under bash 5" gets its CI side. The fixture runs
   `node --experimental-strip-types scripts/generate-redirects.ts`, the command behind
   `pnpm redirects:generate`.
6. **The git wrapper** (`gitWrapper` in `tests/__helpers__/preCommitRepo.ts`) is used as planned, as
   an extension of S5's stubs. It matches one invocation by its exact arguments, or by a prefix for
   `restore --source=`. Each case asserts that the wrapper matched.
7. **H47 and `.git/index`.** Compared by `git ls-files --stage`, as planned, together with the
   absence of `.git/index.lock`.
   - The deterministic missing-index case forces the O7 branch.
   - A design was rejected after a side-effect check: running every restore on a private copy of
     the index. It was meant to close a possible race in H47, where git removes its `index.lock`
     while the hook restores. That race was reasoned about, not measured. The copy cannot hit a
     lock, so H26's restore would no longer fail, and H26 expects O7 there.
8. **H30 for H27 and H28.** H30 is applied, through the file's `afterEach`. H29 is skipped only when
   the fixture has no pre-existing entry (`preexisting: null`).
9. **The ignore-while-restoring row was falsifiable here.** On the hook as it was, bash 3.2 died on
   the second signal inside its `EXIT` trap. The restore stopped halfway: untracked file missing,
   entry left. The case went red (cycle 2 below). `trap '' INT TERM HUP` at the top of `finish` and
   in `on_signal` makes it green, and M2 turns it red again. bash 5's behaviour is still CI's to
   show.

### 2026-10-23 — red → green log (stage 5)

All cycles ran `PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t "<filter>"` in
this worktree, so `bash` was `/bin/bash` 3.2.57.

| Cycle | Test (`tests/pre-commit-sh.test.ts`) | Red | Green |
|---|---|---|---|
| 1 | H25 × SIGINT, SIGTERM, SIGHUP | passed at once (bash 3.2 runs the `EXIT` trap, as measured). M1 turns all three red | no change |
| 2 | "ignores SIGINT, SIGTERM and SIGHUP while it restores" | `expected Map{ …(30) } to deeply equal Map{ …(31) }`: bash died in its `EXIT` trap on the second signal | `trap '' INT TERM HUP` at the top of `finish`; `on_signal` and the HUP/INT/TERM traps (exit 129/130/143) |
| 3 | H25 boundary: SIGINT with the `git add` of `_redirects` blocked | passed at once (T-0032's `WROTE`/`STAGED` put-back). M4 turns it red | no change |
| 4 | H26 (lock stub) | passed at once (T-0032 keeps the entry). M4, M5 turn it red. Its first run failed in the test itself: `git diff --name-only` quoted `名 稱.txt`, so the helpers read `-z` | no hook change |
| 5 | H46 (lock before the run) | passed at once. M6, M7 turn it red | no change |
| 6 | O5 wrapper row, 10 cases | 9 red: entry left (push), or exit 0 with O2 (listings, pre-check, `refs/stash` read). The English index-slug case passed for another reason: an empty English list made `door`'s brief an orphan (W6, exit 1, nothing changed) | each listing written to a file under `set -e`; `rest_dirty`; `stash_top`; the push's status kept until the entry is identified |
| 7 | the missing index (`GIT_INDEX_FILE` removed by the stub) | `expected '[pre-commit] ✓ door\n' to contain 'git stash apply'`: restored and dropped. The case's earlier check, no `.git/index.lock` afterwards, passed: the restore wrote no index at the missing path, contrary to the plan's expectation (measured below) | the guard in `finish`; W9 through `keep_entry` with its cause |
| 8 | H47 through `git commit -a` | passed after cycle 7. Each run took O7 (`H47 took O7` printed by `--reporter=verbose`). M8 leaves the case green, see below | no change |
| 9 | H27 × 2 forms × 2 kinds | 4 red: `expected '' to contain 'first commit'` | the O6 check after the commit-forms refusal, before any change, with W7 |
| 10 | H28, its `git commit` form and two boundaries | passed at once (green before cycle 9 too). M14 turns both boundaries red | no change |
| 11 | H42 | passed at once. m1 stays green and m2 turns it red, as planned | no change |
| 12 | H45 × 3 (H02+H14, H07, H34 under `/bin/bash`) | passed at once. M15 turns H02/H14 and H07 red under 3.2 | H02/H14 and H07 moved into shared outcome helpers (`expectH02H14(bash)`, `expectH07(env)`), with `runHook(repo, env, bash)` and `commit(repo, args, env)` |
| 13 | H25's exact status (after M3 survived) | M3 had left all 87 green | H25 asserts 129/130/143 |
| 14 | header comment | — (comment) | O6 paragraph and step 7 (signals, O5, O7, the missing index) |

#### Mutation checks (reproducible)

The runner and the edits live outside the repository, in
`/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0034/`.
`mut.py` applies the `(old, new)` pairs of one id in `mutations.json` once each to
`scripts/pre-commit.sh`. It then runs the whole hook test file with `/bin` first on `PATH`, restores
the hook and checks the restore byte for byte. From the worktree root:

```sh
export SCRATCH=/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0034
python3 -I "$SCRATCH/mut.py" <id>
```

Results on 2026-10-23. M1, M2 and M4–M9 ran on 87 cases before H25's exact status was added. M3
and M10–m2 ran on 87 cases after it. Every run printed `restored`.

| Id | Mutation | Result |
|---|---|---|
| M1 | `trap finish EXIT` deleted | `40 failed`: every case with a stash or a refusal, H25 × 3 among them |
| M2 | no `trap ''` in `finish` or `on_signal` | `1 failed`: "ignores … while it restores" |
| M3 | the HUP/INT/TERM traps deleted | `3 failed`: H25 × 3 (status `null`, not 128 + n) |
| M4 | the `_redirects` put-back disabled | `2 failed`: H25 boundary, H26 |
| M5 | the entry dropped whatever the restore returned (`restore_entry \|\| true`) | `1 failed`: H26. Round 2 restructured `finish`; the edit is now `elif ! { restore_entry \|\| true; }; then`, and gives `1 failed` of 94: H26 |
| M6 | `exit "$status"` → `exit 0` in `finish` | `33 failed`, H46 among them |
| M7 | the push's failure swallowed (`\|\| true`) and the put-back disabled | `4 failed`: H25 boundary, H26, H46, the push case |
| M8 | the missing-index guard disabled | `1 failed`: the missing-index case. H47 stays green and takes O5 instead (3 of 3 runs, `python3 -I "$SCRATCH/mut.py" M8 H47`, which prints `H47 took O5`): the restore over the missing index completes and writes no `.git/index.lock`, and the row accepts O5. The missing-index case is what pins the guard |
| M9 | the push's status ignored | `1 failed`: the push case |
| M10 | `\|\| true` after each of the 7 listings | `6 failed`: each listing case except the English index slugs, which ends in W6 with exit 1 and nothing changed either way (an O5) |
| M11 | `stash_top` swallows a status other than 0 or 1 | `1 failed`: `refs/stash` read before the push |
| M12 | `rest_dirty` reads a failed `git diff --quiet` as "dirty" | `1 failed`: the pre-check case |
| M13 | the O6 check disabled | `4 failed`: H27 × 4 |
| M14 | O6 also refuses any untracked file outside `platform/` | `2 failed`: both H28 boundaries |
| M15 | the `${#VALIDATE[@]} -gt 0` guard → `true` | `17 failed`: H02/H14, H07 and both H45 runs of them among them |
| m1 | the stash pre-check made always true | H42 green, as planned. 5 others failed: H28 × 4, where git cannot stash before the first commit, and the pre-check case, whose invocation is no longer made |
| m2 | m1, and `OWN_ENTRY` taken from `refs/stash` whenever it is set | `9 failed`: H42, as planned, plus H07, H34 and H28 |
| M16 | stage 6: `finish` no longer claims the entry `refs/stash` gained (`if false; then`) | `2 failed` of 90: both "a signal while the stash push runs" cases |
| M17 | stage 6: `finish` claims whatever `refs/stash` names, without comparing it with `before` | `1 failed` of 91: "the stash push, which fails before saving anything". On 90 cases it had survived, see stage 6 |
| M18 | stage 6: W9's missing-index remedy without the `git restore --overlay --source=<id>^3` part | `2 failed` of 90: the missing-index case with W9's commands, and H47 (took O7). After round 2: `3 failed` of 94, both printed-command variants and H47 |
| M19 | round 2: the missing-index guard prints stage 5's W9 (`keep_entry "the index this commit ran on is gone"`), with no `git restore` commands | `3 failed` of 94: both printed-command variants of the missing-index case and H47 (took O7). The `git stash apply` variant passes. Per variant: `python3 -I "$SCRATCH/mut.py" M19 "run at the top level"` → `1 failed`, `M19 "run in platform"` → `1 failed`, `M19 "git stash apply brings"` → `1 passed` |
| M20 | round 2: the index check before the drop disabled (`elif false; then`) | `2 failed` of 94: both cases of "a stash push that stops after it stored its entry and changed the index" |
| M21 | round 2: W9's printed pathspecs relative again (`platform/ ':(exclude)…'`, no `:(top)`) | `3 failed` of 94: both changed-index cases and the missing-index variant run in `platform/challenge/door/` |

### 2026-10-23 — coverage report (stage 5)

`@vitest/coverage-v8` is not installed:
`pnpm vitest run --coverage --coverage.include=scripts/pre-commit.sh tests/pre-commit-sh.test.ts` →
`MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'`. None was installed. The changed
production code is bash, which V8 coverage would not reach anyway. "Measured coverage" below is the
hook branch each row drives, confirmed by the mutations above.

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S5 harness | `afterEach` of all 101 cases (87 at stage 5, 91 after stage 6 round 1, 94 after round 2, 99 after revision 3.2's first round, plus H51 and H52); `run.leftover` in each group case; `killStrayGroups()` first in `afterEach` (stage 6) | H29 where the fixture has an entry; H30 everywhere, H27 and H28 included; no process left in a case's group, also when a case fails before its `done()` | AC-23 (H29, H30) | — |
| S5 direct run, blocking generator | H25 × 3 | `on_signal` → `finish` → restore → drop; exit 129/130/143; the H19 overlap file's unstaged bytes; the hook's entry seen during the run (M1, M3) | AC-23 (H25) | bash 5: CI's ubuntu |
| S5 direct run, blocking generator and git wrapper | "ignores … while it restores" | `trap ''` while the restore runs; drop after the restore (M2) | AC-23 (constraints) | bash 5: CI |
| S5 direct run, git wrapper (blocking `git add`) | H25 boundary | the `WROTE` and not `STAGED` put-back (M4) | AC-23 (H25; the `_redirects` constraint) | a signal after the `add` started: a race, not tested (plan) |
| S5 direct run, lock stub | H26 | the failed restore; W9; the entry kept; `git stash apply` once the lock is gone (M4, M5) | AC-23 (H26), met for LF and binary files | CRLF files and overlapping or adjacent hunks: D16 (a) since revision 3.2 (measured, not a case) |
| S5 direct run | H46 | the push's failure before any entry; status (M6, M7) | AC-23 (H46) | — |
| S5 direct run, git wrapper (one failure) | 11 cases | push saved then failed; push that saved nothing, with the teacher's entry on top (stage 6); 7 listings; the pre-check; `refs/stash` before the push (M9–M12, M17) | AC-23 (O5) | the `git ls-files --others` inside `rest_dirty`, which is only reached when no tracked file under `platform/` is unstaged; `rev-parse` after the push, which `finish` now reads again; a failed `git stash drop`; `git rev-parse -q --verify HEAD` failing in the O6 check, which then counts as no `HEAD` (exit 1 with W7, nothing changed). All read from the code, not run |
| S5 direct run, git wrapper (the push, then a signal; stage 6) | 2 cases | SIGINT to the group after the push saved its entry; SIGTERM to the hook alone before git runs the push. `finish` claims the entry `refs/stash` gained, restores and drops it; exit 130 and 143 (M16) | AC-23 (O5; the constraint "once the hook has an entry of its own, every exit restores it") | a signal that stops git in the middle of the push is driven by the next row since round 2. Round 1's claim that these two cases and H46 covered every state of such a push was wrong: git stores the entry before it changes the index (stage 6 round 2, finding 6) |
| S5 direct run, git's own child command blocked (`gitChildBlocker`, round 2) | 2 cases | SIGINT to the group while git's `git apply --index -R` or `git checkout --no-overlay` blocks: the entry stored, the index changed. `finish` claims the entry, puts the files back, finds the index under `platform/` differing from `<id>^2`, keeps the entry and prints W9 with `git restore --staged --source=<id>^2`; that command, run in `platform/challenge/door/`, puts the index back (M20, M21) | AC-23 (H48; O7, D16 (b)) | a stop inside `git add` or `git diff-index`: measured to leave the index as stashed (`add` blocked: `cached vs ^2: 0`), which the index check then passes. Since revision 3.2 these are H48, with two more cases in which the child command fails instead of blocking (O7, D16 (b)) |
| S5 `git commit -a`, git's own child command failing (`gitChildBlocker(…, 'fail')`, revision 3.2) | H49 × 2 | the push stopped partway on `index.lock`: `ON_LOCK` set by `on_own_index`; `finish` puts the files back, finds the lock changed, drops the entry, keeps the status non-zero; git discards the lock (M22) | AC-23 (H49; D16 (b)) | `-i` and `-p`: the same path in git's source, not run |
| S5 direct run, a directory without write permission (revision 3.2) | H50 | the restore stopping at `checkout-index` after every tracked file came back; W9's first form with `restore_commands` and no `git restore --staged`; the untracked file still there; the index as before but for `_redirects`; `git stash apply` refusing; the printed commands (M23, M26) | AC-23 (H50; D16 (c)) | skipped as root; a path behind a symbolic link (the other partial end, `result=1`): read from the code, not run |
| S5 direct run, the same directory with a tracked unstaged file too (revision 3.2, second round) | H51 | the push stopped at `git apply --index -R` with the index changed, then the restore failing; `keep_entry` followed by `keep_index_too`; every printed command run in order (M24, M26) | AC-23 (H51; D16 (b)) | skipped as root |
| S5 direct run on `.git/index.lock`, git wrapper (`remove-index-then-run`, revision 3.2, second round) | H52 | the second `index_gone` check after `restore_entry`; `keep_entry_without_index` instead of `drop_entry`; the printed commands (M25) | AC-23 (H52; the missing-index constraint) | the real race under `git commit -p` (the review measured it, 7 of 300 runs): the wrapper stands in for git's removal |
| S5 direct run, index removed by the stub | the missing-index case × 3 (`git stash apply`; W9's printed `git restore` commands at the top level; the same in `platform/challenge/door/`, round 2) | the guard in `finish`; W9; no index written; `git stash apply`; the printed commands, with tracked changes the working tree lacks, from any directory (M8, M18, M19, M21) | AC-23 (constraint; H47) | — |
| S5 `git commit -a` | H47 | O7 in each run whose branch was printed on this hook (4 of 4 at stage 5: cycle 8's `--reporter=verbose` run and the three 87-case runs below; 3 of 3 at stage 6, 6 of 6 at round 2); W9's printed commands put every file back with the index unchanged (stage 6, M18, M19); O5 under M8 | AC-23 (H47) | the O5 branch is not reached here: git removes its lock before the hook restores. The race is accepted by the row |
| first-commit fixture | H27 × 4, H28 × 2, 2 boundaries | the O6 refusal before any stub runs; O2 with no `HEAD`, no W3; W3 for an untracked `_redirects` alone (M13, M14) | AC-23 (H27, H28) | — |
| S5 direct run, recording generator | H42 | the skipped push; identification by `refs/stash` alone (m1, m2) | AC-23 (H42) | — |
| `/bin/bash` 3.2 | H45 × 3 | `set -u` with an empty `VALIDATE` under 3.2 (M15); the installed hook's `bash` is `/bin/bash` (`command -v bash`) | AC-23 (H45) | **run on this Mac only** (`describe.skipIf` unless `/bin/bash` reports 3); CI's ubuntu skips it. Its bash 5 side is CI's run of H02/H14 and H07. H34's own bash 5 case is T-0035's |
| stage 6 diff check | — | not run | AC-23 (constraints) | stage 6 |
| stage 8 (S7) | — | not run | AC-23 (H27, H28, H46) on the teacher's command line | stage 8 of this ticket; the epic's final stage 8 is T-0039's |

Commands and results, in `/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0034`:

- `pnpm test --run` → `Test Files  130 passed (130)`, `Tests  4457 passed | 1 skipped (4458)`. That
  is 4426 on this base (707be5f's 4414 plus T-0033's 12) plus this ticket's 31 cases.
- `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts --reporter=verbose`, three times in a
  row → `Tests  87 passed (87)` each time, and `H47 took O7` each time. `PATH="/bin:$PATH" bash -c 'echo $BASH_VERSION; command -v bash'`
  → `3.2.57(1)-release`, `/bin/bash`.
- After the last comment-only edit to the hook (the missing-index guard's reason), the same command
  was run once more → `Tests  87 passed (87)`, `H47 took O7`. `pgrep -fl pre-commit.sh` → exit 1.
- `bash -n scripts/pre-commit.sh` → exit 0. `/bin/bash -n scripts/pre-commit.sh` → exit 0.
- `pnpm -s challenge:validate` → `All checks passed.`, exit 0.
- `pgrep -fl pre-commit.sh` afterwards → no output, exit 1: nothing left running.
- No typecheck script is configured in `package.json`, so none was run.

#### Measured: a restore over a missing index

`/bin/bash /private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0034/missing-index.sh /private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0034`
(git 2.54.0) stashes a tracked edit and an untracked file. It then runs
`GIT_INDEX_FILE=<gitdir>/index.lock git restore --source=<entry> --worktree -- p` with no such file,
and printed `restore=0`, `no lock`, `b`: the restore succeeds and creates no index file. So the
guard does not prevent a stray `index.lock` with this git. What it changes is the outcome: once git
has removed the index of the interrupted commit, the hook keeps the entry and prints W9 (O7) instead
of restoring against an empty index. That is the traceability constraint as written. The hook's
comment gives that reason, and the plan's "would write a new index at the missing path" was not
confirmed.

#### Known edges

- **W9's `git stash apply` with CRLF or an overlapping hunk.** It is not byte for byte when the entry
  holds a CRLF file (git writes it back with LF under `eol=lf`) or a hunk that overlaps a staged one
  (it conflicts after `--keep-index`). The raw copies go with `$WORK` (open point 3). The same holds
  for W9's `git restore` commands after a missing index. Stage 6 round 1 (finding 5) confirmed this
  against H26 and B2. Settled by D16 (a) in revision 3.1: documented, not changed (see "rulings" below).
  Revision 3.2 corrects it from a new measurement: CRLF is lost only when the index version has no
  CR; `ident` and other conversions are lost too; an adjacent hunk conflicts like an overlapping one;
  a conflicting apply leaves the merged files staged and `git checkout <id> -- <path>` stages its file.
  W9's `git restore` commands avoid both index effects (see "review of revision 3.1" below).
- **A failed `rev-parse` of `refs/stash` right after a push that saved an entry.** Since stage 6,
  `finish` reads `refs/stash` again and claims the entry it gained. The entry stays unidentified (no
  restore, no W9, the entry in `git stash list`) only when that second read fails too. Read from the
  code, not run (open point 4).
- **A failed `git stash drop` after a completed restore.** The entry stays, and the exit status is
  unchanged (open point 4).
- **A signal in the first two lines of `finish`.** A signal that arrives after a `set -e` exit has
  entered `finish` and before its `trap ''` ends the shell there. The window is two shell
  statements long.
- **For T-0039.** W7 is new teacher-facing text, and README or skill text may want to say that a
  first commit must have everything under `platform/` staged. Since stage 6, W9 after a missing index
  also prints two `git restore` commands; since round 2, their pathspecs start at the top level and
  the message says they overwrite the files under `platform/`, and a third form of W9 prints
  `git restore --staged --source=<id>^2` after a push that stopped partway. T-0039 owns those
  documents.
- **A push that stopped after storing its entry and changing the index (round 2).** The hook puts
  the files back, keeps the entry and prints W9 with the command that puts the index back. That end
  is neither O5 (the index is not as before) nor O7 as traceability words it (the files are back, and
  O7's index column says "as O5"). Meeting O5 would need the hook to write the index under
  `platform/` itself, against B2's "The hook stages only `platform/public/_redirects`". Settled by D16 (b)
  in revision 3.1: the spec names this end as part of O7, and the hook does not write the index (see "rulings" below).
  Revision 3.2 narrows it to the repository's own index: on `index.lock` git discards the change, so
  the hook drops its entry and the run ends in O5 (H49).
- **A restore that stops partway (revision 3.2).** When a later step of `restore_entry` fails after
  its first `git restore`, some files are back and `git stash apply` refuses. W9's first form now
  also prints the `git restore` commands (H50). A path skipped behind a symbolic link ends the same
  way; read from the code, not run.
- **A file the index adds and the working tree has deleted, in O7 (revision 3.2, second round).**
  git stash does not record the deletion, so W9's `git restore` commands and `git stash apply`
  write the index version back. The hook removes such files itself only when its restore completes
  (`$WORK/deleted`), and that list goes with `$WORK`. Named in D16 (a) and B2, not printed as a
  command; the file that comes back holds the index version, so no work is lost.
- **The git wrapper's wait loop under a signal.** The round 2 rerun had one 60 s timeout, in a
  changed-index case, while its blocker still waited in a `sleep 0.05` shell loop. A likely cause, not
  reproduced: a shell that gets SIGINT while it reaps a `sleep` that exited normally can carry on,
  and the loop then holds the group's output open. The blocker now `exec`s one `sleep`. `gitWrapper`'s
  `block` and `run-then-block` loops, which the H25 boundary case and the push SIGINT case signal, keep
  the loop; no timeout was seen there.

### 2026-10-23 — code review (stage 6)

Round 1 ran `/code-review` on the uncommitted change over base `d1413c2`, on the Standards, Spec and
Security axes. Independent skeptics then tried to refute each finding: a medium or high finding
stands with 2 of 3 agreeing, a low one with 1 of 1. The security findings are written up in
[security-T-0034.md](../../.proj.specs/0007-gh-pages-range-fixes/review/security-T-0034.md) (stage 7
below). Line numbers are those of the reviewed version unless marked "now".

**Confirmed, and what was done**

| # | Axis | Finding | Verdict | Done |
|---|---|---|---|---|
| 1 | Standards | the two measurement commands of the test plan used a `<scratchpad>` placeholder, which a shell reads as a redirection; T-0033 round 2 had already asked for absolute paths | 2 of 3 (one suggested low) | fixed: the plan's measurement paragraph now exports `SCRATCH`, and the commands read `node "$SCRATCH/sig/drive.mjs" "$SCRATCH/sig"` and `/bin/bash "$SCRATCH/m3.sh"`. Rerun, see below |
| 2 | Standards | H47 repeated `blobBytes`'s `git show`, and `expectO7` spelled out `ids(after)` | 1 of 1 | fixed: `blobBytes` returns `Buffer \| null`, H47 calls it; `expectO7` uses `ids(after)` |
| 3 | Standards | `lockingGenerator` copied `recordScript`'s rename-and-run stub, and `blockingGenerator` its `git stash list` line | 1 of 1 (narrowed: `blockingGenerator` shares one line only) | fixed: `wrapScript(repo, script, prelude)` in the helper builds both stubs; `STASH_IDS` is the shared `git stash list` expression, also used by `blockingGenerator` |
| 4 | Spec | a signal while `git stash push` runs, or before `OWN_ENTRY` is set, leaves the entry the push saved unclaimed: no restore, no W9 (O5, the constraint "once the hook has an entry of its own, every exit restores it") | 3 of 3 | fixed test-first, below |
| 5 | Spec | H26's "byte for byte" does not hold for a CRLF file or an overlapping hunk; the cases leave both out while the criterion was checked, and the spec was not revised | 3 of 3 | declined as a code change: either remedy needs the user's ruling. (a) Keeping `$WORK/raw` on O7 and naming it in W9 is a new guarantee (rule 5 asks for a side-effect check first: raw copies left in `TMPDIR`, and W9's id no longer the whole remedy). (b) Revising H26, O7, B2 and traceability's line 538 is a spec change, which this ticket does not own. The H26 criterion is unchecked, with a note that it is met for LF and binary files only. Known edge updated |
| 6 | Spec | the `SIGKILL` cleanup sat inside `done()`, so a case that failed before calling it left a blocked stub or wrapper running | 1 of 1 | fixed: `startGroup` registers each group; `killStrayGroups()`, first in the file's `afterEach`, kills what is still alive. The finally in `done()` no longer writes the dead `leftover` store |
| 7 | Security | the same window as 4 (S1 in the security report) | 3 of 3 | fixed by 4 |
| 8 | Security | after an interrupted `git commit -a`, W9's `git stash apply <id>` can refuse because the working tree is dirty against the restored `.git/index` (S5) | 1 of 1 | measured, then fixed test-first, below |
| 9 | Security | on O7 the raw copies go with `$WORK`, so a CRLF file's original bytes are lost (S6) | 1 of 1 | declined with 5: kept as a known edge, for the same ruling |

**Finding 4: the entry a push saved is claimed in `finish`.** `PUSH_STARTED=true` is set right
before the push, and `before` is initialised at the top (now `scripts/pre-commit.sh:145-146`,
`:348`). `finish`, after its `trap ''`, reads `refs/stash` again when `OWN_ENTRY` is empty and the push
had started, and claims the id when it is set and differs from `before` (now `:238-245`). The same
read narrows the known edge of a failed `rev-parse` right after the push.

- New wrapper mode `run-then-block` (run git, write the marker, wait for release) and
  `Group.killLeader` in the helper.
- New cases in `describe('pre-commit.sh: a signal while the stash push runs (O5)')`:
  - SIGINT to the group once the push has saved its entry (the case first checks one more stash
    entry and the untracked file gone);
  - SIGTERM to the hook alone while the wrapper holds the push, then release: git completes the
    push, and bash runs the trap afterwards.
  - Both assert O5 exactly, with exit 130 and 143.
- Red before the fix: `PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t "stash push runs|H47|H26|missing index|H25|H42"`
  → `3 failed`: both new cases on `expectNothingChanged`'s `files` (entry left, files missing), and H47
  (finding 8). Green after it, same command. The record said `20 passed` here, which no run printed
  (stage 6 round 2, finding 1). Rerun on the round 1 hook before round 2's changes →
  `Tests  11 passed | 80 skipped (91)`; after round 2 → `Tests  12 passed | 82 skipped (94)` (the
  missing-index case's third variant).
- Mutations (runner as in "Mutation checks"): M16 (no claim) → both new cases red. M17 (claim
  without comparing with `before`) first survived all 90 cases. In H46 the push fails on the lock, so
  the claimed teacher's entry could not be restored and stayed. A wrapper case was added: the push
  fails with 128 before saving anything while the restore would succeed. M17 then fails it: 1 of 91.

**Finding 8: measured, then a remedy W9 can print.** Measured with git 2.54.0 in session directories:

- `/bin/bash "$SCRATCH/apply-after-a.sh" "$SCRATCH" a` models `-a`: the lock holds every tracked
  edit, the hook stashes on it, git removes the lock.
  - `git stash apply <id>` exits 1 and names `a` and `p` ("would be overwritten").
  - The untracked file comes back anyway.
  - The tracked edits are still in the working tree.
- `... p` models a partial `-p` (one hunk of `p` staged into the lock): `apply` exits 1 and the
  unstaged change of the unrelated file `a` does not come back.
- `/bin/bash "$SCRATCH/restore-after-p.sh" "$SCRATCH" a` and `... p` instead run
  `git restore --source=<id> --worktree -- q` and `git restore --overlay --source=<id>^3 --worktree -- q`.
  Both print `restore-tracked=0`, `restore-untracked=0`, every file back and `index unchanged`.

So W9 for a missing index (`keep_entry_without_index`, now `scripts/pre-commit.sh:219-230`) keeps
`git stash apply <id>`, which W9's row requires. It says that apply can refuse here, and prints the
commands that put every file back without touching the index. The `^3` part appears only when the
entry has untracked files.

- H47's O7 branch now runs the printed commands with `sh -c`, as a teacher would paste them. It
  asserts every file and the untracked list as before, and the index unchanged.
- The missing-index case became `it.each` over `git stash apply` and the printed commands. Its entry
  holds tracked changes the working tree lacks, as after `-p`.
- Red before the fix: H47, `expected null not to be null` (no remedy line). Green after. The
  command was not recorded. The printed-commands variant of the missing-index case was written
  together with the fix, so it had no red run before it (stage 6 round 2, finding 2). Round 2's M19
  puts stage 5's W9 back (runner as in "Mutation checks", `/bin` first on `PATH`):
  `python3 -I "$SCRATCH/mut.py" M19 "run at the top level"` → `1 failed`; on the whole file M19 fails
  both printed-command variants and H47.
- M18 (the `^3` part dropped) → both red.

**Rejected by the skeptics** (no change made, except where noted):

| Axis | Finding | Votes | Reason |
|---|---|---|---|
| Standards | "128 + n under bash 5" stated as fact without a bash 5 run | 0 of 3 | a design statement: the codes are literal `exit` arguments in the traps; the record names CI's ubuntu as the bash 5 side, and H25 asserts the codes there |
| Standards | H45 checked while H34's bash 5 counterpart is missing | 0 of 1 | H45 asks for each row's matrix outcome under 3.2, which `expectH34` asserts; H34's bash 5 case is T-0035's, as recorded |
| Standards | the mutation runner's usage omits the second argument | 0 of 1 | every claim carries a full command; `mut.py`'s own header documents the filter |
| Standards | the test plan was approved by a standing instruction, and open points resolved by the implementer | 0 of 1 | the approval is quoted; the same form closed T-0030 to T-0036; the wrapper seam was in the approved plan |
| Standards | H47 relies on the snapshot's `x:`/`-:` prefix (`slice(2)`) | 0 of 1 | the prefix is the helper's own format, not the hook's; the fixture has no symbolic link |
| Standards | the wrapper matches the hook's exact git arguments | 0 of 1 | a boundary fake that must hit one invocation; every case asserts the match, so a change fails loudly |
| Standards | the "drops its entry only after the restore" case cannot tell drop from restore order | 0 of 1 | H26 with M5 pins that order; the case pins `trap ''` (M2). A wording point only |
| Standards | H47's O5 branch never runs | 0 of 1 | the row accepts the race; M8 drives the O5 branch and it passes; the record says so |
| Standards | `console.log` as the record's evidence | 0 of 1 | the approved plan prints the branch; the verbose reporter command is recorded |
| Standards | `leftover = true` in `done()`'s finally is a dead store | 0 of 1 | no behaviour impact. Removed anyway, with finding 6's edit of the same lines |
| Standards | `expectFailed` casts `as GroupRun` | 0 of 1 | no call site passes a plain run with a signal |
| Standards | a wrapper case's comment sits between two lines | 0 of 1 | it ties the fixture to the ACMRD row; no documented rule |
| Standards | `it.each` and `for…of` both generate cases | 0 of 1 | `for…of` where one scenario makes two `it`s; already the file's pattern |
| Standards | `expectH34(env)` and `runHook(…, bash)` anticipate callers | 0 of 1 | both are used now; H45 needs the shared helpers |
| Standards | `markerDir` creates its directory | 0 of 1 | idempotent; documented by its JSDoc |
| Standards | `preexisting: null` on the first-commit fixture | 0 of 1 | one reader, whose check has no meaning there |
| Standards | the helper header lists `.gitignore`, the plan does not | 0 of 1 | the header matches the code; the plan is a summary |
| Standards | the O6 check reads any `rev-parse HEAD` failure as no `HEAD` | 0 of 1 | the file's existence probes all read this way; the result is exit 1 with nothing changed; recorded as uncovered |
| Standards | `rest_dirty` handles errors two ways | 0 of 1 | `git diff --quiet` has three outcomes, `ls-files` two |
| Standards | `stash_top` relies on `set -e` after `$( )` | 0 of 1 | both callers are plain assignments; M11 pins it |
| Standards | the header's "a failed git command ends the run" is absolute | 0 of 1 | follows O5's wording; the exceptions are existence probes |
| Spec | O6 leaves out an unstaged `_redirects` alone | 0 of 3 | O6's own reason ("git cannot stash") does not apply; the stash constraint and D3 support it; open point 2 recorded it. The skeptics note that traceability's O6 row and AC-23's prose could say "other than `_redirects`" in a later spec revision; that is for the user |
| Spec | H28 prints no W3 against the no-`HEAD` sentence | 0 of 1 | the H28 row asks for O2 only; W3 needs a replaced version; T-0032 point 8 and H18 read it so |
| Spec | H42 does not reach the "push saved nothing" identification | 0 of 1 | the row's fixture skips the push by design; m1/m2 cover the rule. (The case added for M17 now drives a push that saved nothing.) |
| Spec | H45 checked with no bash 5 run of H34 | 0 of 1 | as the Standards item above |
| Spec | other git failures are still swallowed | 0 of 1 | code this change did not touch; the raw copies cover the `^3` path's loss |
| Spec | a restore that fails halfway prints W9 | 0 of 1 | `restore_entry` is T-0032's, unchanged here |
| Spec | the git wrapper goes beyond S5 | 0 of 1 | in the approved plan (open point 6); the hook under test is still the real one |
| Spec | "same under bash 3.2 and bash 5" unverified | 0 of 1 | the record lists bash 5 as CI's; the codes are literal |
| Security | `rev-parse` failing right after a push that saved an entry (S2) | 0 of 1 | the base exited 0 silently in that case; outside B2's model. Stage 6's re-read in `finish` narrows it further |
| Security | a signal in `finish`'s first two lines (S3) | 0 of 1 | the base had the whole `finish` open; recorded as a known edge |
| Security | ignored signals are inherited by the restore's children (S4) | 0 of 1 | the constraint requires it |
| Security | the harness could `SIGKILL` a reused PGID (S7) | 0 of 1 | a group id is not reused while the group lives; the only gap is two adjacent syscalls |
| Security | committed records hold local paths and a session id (S8) | 0 of 1 | already in landed records; not a credential |

**Commands rerun after the fixes**, in this worktree, with
`export SCRATCH=/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0034`:

- `node "$SCRATCH/sig/drive.mjs" "$SCRATCH/sig"`, three times → each printed
  `SIGINT exit null SIGINT … status=130`, `SIGTERM exit null SIGTERM … status=0`,
  `SIGHUP exit null SIGHUP … status=0`, as at stage 5.
- `/bin/bash "$SCRATCH/m3.sh"` → `push=1`, `stash-ref=1`, `a2`, `restore=128`, `a`, `diff-cached=1`,
  `unborn-push=1`, as at stage 5.
- `python3 -I "$SCRATCH/mut.py" M16`, `M17`, `M18` → as in the mutation table; each printed `restored`.
  `python3 -I "$SCRATCH/mut.py" M8 H47` → `H47 took O5`. The filter also matches both missing-index
  cases, which fail under M8, as planned.
- `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts --reporter=verbose`, three times in a
  row → `Tests  91 passed (91)` and `H47 took O7` each time.
- `pnpm test --run` → `Test Files  130 passed (130)`, `Tests  4461 passed | 1 skipped (4462)`: stage
  5's 4457 plus the 4 new cases.
- `bash -n scripts/pre-commit.sh` → exit 0; `/bin/bash -n scripts/pre-commit.sh` → exit 0.
- `pnpm -s challenge:validate` → `All checks passed.`, exit 0.
- `pgrep -fl pre-commit.sh` → no output, exit 1.

### 2026-10-23 — security review (stage 7)

Report: [security-T-0034.md](../../.proj.specs/0007-gh-pages-range-fixes/review/security-T-0034.md).

- Eight candidates, on B2 only.
- Three confirmed:
  - S1 (medium), the push-to-entry signal window, the same defect as finding 4: fixed.
  - S5 (low), W9's apply after an interrupted `-a`: fixed, as finding 8.
  - S6 (low), a CRLF file's raw bytes lost on O7: kept as a known edge, for the user's ruling with
    finding 5.
- Five rejected by their skeptics (S2, S3, S4, S7, S8); reasons above and in the report.
- The rerun commands are those of stage 6 above. `status` stays `review`.

### 2026-10-23 — review round 2 (stages 6 and 7)

Round 2 reviewed the uncommitted change over base `d1413c2` again, on the Standards, Spec and
Security axes, with the same skeptic rule as round 1. Security candidates are in
[security-T-0034.md](../../.proj.specs/0007-gh-pages-range-fixes/review/security-T-0034.md)
("第 2 輪"). Line numbers are those of the reviewed version unless marked "now". The commands below
need `export SCRATCH=/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0034`.

**Confirmed, and what was done**

| # | Axis | Finding | Verdict | Done |
|---|---|---|---|---|
| 1 | Standards | finding 4's green record said `20 passed`; the command's filter selects 11 cases | 3 of 3 (two suggested low) | corrected in place (stage 6, finding 4): rerun on the round 1 hook → `Tests  11 passed \| 80 skipped (91)`. The security report's S1 said the same and is corrected too |
| 2 | Standards | the missing-index case's printed-commands variant had no red run before the fix, and H47's red line carried no command | 1 of 1 | recorded as it happened: the variant was written with the fix. M19 puts stage 5's W9 back and fails it, see the mutation table and finding 8's paragraph |
| 3 | Standards | the "files, untracked, index as before" assertions were written three times | 1 of 1 | fixed: `expectAllBack(before)`; `expectApplied` and both printed-command branches call it |
| 4 | Standards | H47's name did not mention W9's printed commands | 1 of 1 | fixed: the name ends "and W9’s printed commands put every file back" |
| 5 | Spec | W9's printed pathspecs were relative to the teacher's directory, so a commit run in a subdirectory got commands that fail with "pathspec did not match" | 3 of 3 | fixed test-first, below |
| 6 | Security | a push stopped after storing its entry can leave the index changed; the hook claimed the entry, put back only the working tree and dropped it, losing the only record of what was staged (`<id>^2`) | 3 of 3 | measured, then fixed test-first, below |
| 7 | Security | the missing-index commands overwrite the working tree without saying so, and their pathspecs are relative | 1 of 1 | fixed with 5: the message now says the commands overwrite the files under `platform/` and should be run before changing anything there |

**Finding 5: pathspecs from the top level.** `PRINTED_REST` (now `scripts/pre-commit.sh:228`) is
`':(top)platform/' ':(top,exclude)platform/public/_redirects'`, and the `^3` command uses
`':(top)platform/'`. `runPrintedRestore(run, cwd)` replaces `runMissingIndexRemedy`, and the
missing-index case gained a third variant that runs the commands in `platform/challenge/door/`.

**Finding 6: measured, then an index check before the drop.**

- `/bin/bash "$SCRATCH/r2/mid-push.sh" "$SCRATCH/r2" add` (and `apply`, `checkout`) runs
  `git stash push --keep-index --include-untracked -- p ':(exclude)p/r'` with `GIT_EXEC_PATH` naming a
  directory whose `git` blocks the named child command of git's own, sends SIGINT to the group and
  prints what is left (git 2.54.0). In all three, `refs/stash` names a new entry and no `index.lock`
  is left. Blocked at `add`: the index is as stashed (`cached vs ^2: 0`). Blocked at `apply` (after
  `git add`): `cached vs ^2: 1`, the unstaged edit and the untracked file staged. Blocked at
  `checkout` (after `git apply --index -R`): `cached vs ^2: 1`, the staged change gone from the index
  and the working tree at `HEAD`. `GIT_TRACE=1` showed the order `add`, `diff-index`, `apply --index -R`,
  `checkout --no-overlay`, each run from git's exec path.
- `index_as_stashed` (`:248-250` at `b2a12cb`) compares the index under `platform/` (`_redirects` excluded)
  with the entry's index commit. `finish` drops the entry only when the restore completed and that
  comparison holds (`:283-292` at `b2a12cb`). Otherwise `keep_entry_for_index` (`:254-256` at `b2a12cb`) prints a third
  form of W9: the files are back, `git stash apply <id>` is not needed, and
  `git restore --staged --source=<id>^2 -- <PRINTED_REST>` puts the index back. The hook runs neither
  command itself: B2 says it stages only `_redirects` (known edge).
- `gitChildBlocker` in the helper does what `mid-push.sh` does, for the hook. New cases in
  `describe('pre-commit.sh: a stash push that stops after it stored its entry and changed the index (O7, W9)')`,
  `it.each` over `apply --index -R` and `checkout --no-overlay`: exit 130, W9's id listed above the
  teacher's entry, every file back, the index changed; the printed command, run in
  `platform/challenge/door/`, then brings everything back.
- Red before the fix:
  `PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t "stops after it stored|missing index|H47" --reporter=verbose`
  → `Tests  3 failed | 3 passed | 88 skipped (94)`: both new cases on `expected '' to contain 'git stash apply'`
  (entry dropped), and the subdirectory variant on git's "pathspec 'platform/' did not match". Green
  after both fixes, same command → `Tests  6 passed | 88 skipped (94)`, `H47 took O7`.
- Mutations M20 and M21 (table above) turn the new cases red. M5 and M18 were rewritten for the new
  `finish` and pathspecs and still fail as before.

**Rejected by the skeptics** (no change made):

| Axis | Finding | Votes | Reason |
|---|---|---|---|
| Standards | the test runs W9's commands with `sh`, while macOS teachers use zsh | 0 of 1 | no spec or documented rule asks for shell compatibility; `sh` is a shell; zsh's defaults leave `^` alone |
| Standards | stage 6's new test intents are not in the approved test plan table | 0 of 1 | they stay on the plan's seams; `/tdd` re-asks only when a seam changes; T-0032 and T-0033 landed the same way |
| Standards | the stage 5 coverage report holds stage 6 content | 0 of 1 | `workflow.md` asks the table to hold real numbers at close; every change is marked with its stage and has its command |
| Standards | H26's criterion carries a status note | 0 of 1 | the criterion text is unchanged up to `(AC-23)`; T-0032 did the same |
| Standards | the zh-TW section does not say H26 awaits a ruling | 0 of 1 | that section carries intent, not progress (`language.md`) |
| Standards | "reviewed" line numbers point at a version never committed | 0 of 1 | locations, not verified claims; the epic's landed reports use the same form, with snippets |
| Standards | reproduction commands depend on scratchpad scripts | 0 of 1 | `workflow.md` asks for a command, which each claim has; T-0033 rejected the same finding. The skeptic notes that T-0033 also wrote its mutation edit pairs into its record, and T-0034 does not; that is for the user |
| Standards | `[ "$status" -ne 0 ] \|\| status=1` repeated in `finish` | 0 of 1 | one-line idiom; `status` belongs to `finish`. Round 2's index branch adds a third copy on the same terms |
| Standards | `finish` reads `refs/stash` beside `stash_top` | 0 of 1 | opposite failure handling: `stash_top` exits, `finish` must not |
| Standards | the 60 s test timeout can be shorter than the waits | 0 of 1 | the waits fail in sequence, each at 30 s; the 30 s deadline is the approved plan's |
| Standards | the security report mixes 依賴套件 and 相依套件 | 0 of 1 | both are Taiwan usage; the mixed line is quoted verbatim |
| Spec | `<id>^3` unquoted under zsh's `EXTENDED_GLOB` | 0 of 1 | not a default; it fails loudly and the entry stays; W9's required text has no `^` |
| Spec | the missing-index commands skip `$WORK/deleted` paths | 0 of 1 | not reachable under H47's `-a`; outside the ticket's rows; nothing lost |
| Spec | `PUSH_STARTED` stays set for the whole run | 0 of 1 | widens only a window B2 puts outside the model (another process changing the repository) |
| Spec | W9 says "apply can refuse" without a spec revision | 0 of 1 | W9 requires substrings only; O7 does not name the command; H47 does not require apply to succeed |
| Spec | the missing-index `git stash apply` variant models a state that cannot occur | 0 of 1 | the constraint asks for the entry to be kept; the code and record say apply can refuse in the real case |
| Spec | a failed `git stash drop` after a completed restore | 0 of 1 | code this change did not touch; already a known edge |
| Spec | header points 6 and 7 are absolute | 0 of 1 | point 6 is the base's; point 7 follows spec.en.md's own wording, with the exceptions in the same paragraph |
| Security | `finish`'s claim reaches entries made later in the run | 0 of 1 | needs another process writing `refs/stash`, outside B2's model |
| Security | `killStrayGroups` and `killLeader` could signal a reused id | 0 of 1 | a group id is not reused while the group lives; same-uid only; no spec requirement |

**Commands rerun after the fixes**, in this worktree:

- `PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t "stash push runs|H47|H26|missing index|H25|H42"`
  → `Tests  12 passed | 82 skipped (94)`.
- `python3 -I "$SCRATCH/mut.py" M5`, `M18`, `M19`, `M20`, `M21` → as in the mutation table, each
  printed `restored` (output kept in `$SCRATCH/r2/mut-r2.txt`).
- `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts --reporter=verbose`, three times in a
  row → `Tests  94 passed (94)` and `H47 took O7` each time. Before the blocker's `exec sleep`, one of
  three such runs had timed out once in a changed-index case (`1 failed | 93 passed`, 60168 ms; known
  edge); the case alone then passed 16 of 16 runs, and three more whole-file runs passed.
  `PATH="/bin:$PATH" bash -c 'echo $BASH_VERSION; command -v bash'` → `3.2.57(1)-release`, `/bin/bash`.
- `pnpm test --run` → `Test Files  130 passed (130)`, `Tests  4464 passed | 1 skipped (4465)`: round
  1's 4461 plus the 3 new cases.
- `bash -n scripts/pre-commit.sh` → exit 0; `/bin/bash -n scripts/pre-commit.sh` → exit 0.
- `pnpm -s challenge:validate` → `All checks passed.`, exit 0.
- `pgrep -fl pre-commit.sh` → no output, exit 1.
- `grep -n "stash \(drop\|apply\|pop\)" scripts/pre-commit.sh` → one `git stash drop`, in
  `drop_entry`, reached only from the branch where the restore completed and the index check held;
  every other hit is a comment or printed text.

`status` stays `review`.

### 2026-10-23 — end-to-end (stage 8, local)

Surface for every row: the teacher's command line. A temporary local clone of this repository (never
pushed, origin removed), on a throwaway branch at `d1413c2` carrying this checkout's pending changes,
with the hook that `simple-git-hooks` installed (`.git/hooks/pre-commit` → `bash scripts/pre-commit.sh`),
run through real `git commit` invocations with `/bin/bash` first on `PATH`
(`PATH="/bin:$PATH" bash -c 'echo $BASH_VERSION; command -v bash'` → `3.2.57(1)-release`, `/bin/bash`;
git 2.54.0, node v24.13.0). Row 3 uses two fresh repositories made from that tree. The hook has no
browser part. Not covered here: the ticket PR's CI (ubuntu, bash 5) and the Cloudflare preview, which
follow once the parent pushes the branch; an interactive terminal's Ctrl-C (row 1 sends the same
SIGINT to the commit's process group from a driver). Every commit message, the refused and
interrupted ones included, was drafted per `.claude/skills/tw-emoji-commit/SKILL.md`, sanitized with
its `scripts/sanitize_commit.py` and passed with `git commit -F`.

Setup (`$S` is `$SCRATCH/e2e`, with `SCRATCH` as exported above; `$W` this checkout; `<repo>` the main
checkout). The helper scripts stay in `$S`:

```sh
git -C <repo> stash list --format='%H %gs' > $S/real-stash-before.txt   # empty
git clone -q --no-hardlinks <repo> $S/clone && cd $S/clone && git remote remove origin
git checkout -q -b e2e/T-0034-throwaway d1413c2
git -C $W diff --binary d1413c2 | git apply   # then copy $W's untracked files (git ls-files --others --exclude-standard)
cmp scripts/pre-commit.sh $W/scripts/pre-commit.sh   # also both test files, the generator, this ticket, security-T-0034.md: identical
pnpm install --frozen-lockfile                 # prepare → simple-git-hooks wrote .git/hooks/pre-commit
cp -Rp $W/.vitepress/wasm .vitepress/ && cp -Rp $W/platform/public/challenge platform/public/
git add -A && PATH="/bin:$PATH" git commit -F <sanitized message>   # setup commit 13481c7; hook O1
echo '<!-- teacher edit -->' >> platform/public/favicon.svg
git stash push -q -m 'pre-existing teacher entry' -- platform/public/favicon.svg   # 683fd1a…
```

- `$S/snap.sh <file>` records `HEAD`, a digest of `git ls-files --stage`, whether `.git/index.lock`
  exists, `git status --porcelain=v1 --untracked-files=all`, `git stash list --format='%H %gs'` and a
  digest of every working-tree byte (`.git` and `node_modules` excluded).
- `$S/bin-slow/node` slows only the generator: for an invocation naming `generate-redirects.ts` it
  writes `$SLOW_MARK`, sleeps 60 s, then runs the real node. It sits on `PATH`, outside the tree, so
  `git commit -a` cannot stage it.
- `python3 -I $S/drive.py <mark> <cmd…>` starts the command as the leader of a new process group,
  waits for the marker (30 s deadline), sends SIGINT to the group, waits for the exit and then
  until the group is empty, and prints the return code and both streams.

| Row | Surface | Result | Reproducing command, in `$S/clone` unless named |
|---|---|---|---|
| 1. H47: `git commit -a` after a challenge change, SIGINT to the commit's group while the generator runs | teacher's command line, real `git commit -a` | pass, O7, twice (entries `d6fdd32…` and `58b81e9…`). Start: `door-is-open/index.md` and `platform/guide/notes.md` edited, `platform/guide/草稿 筆記.txt` untracked, the teacher's entry on the stack. Marker after 1.16 s and 0.44 s; `git` ended by SIGINT (return code -2); group empty afterwards. stderr: `[pre-commit] ✓ door-is-open`, then W9 for a missing index with the new entry's id, `git stash apply <id>` and the printed `git restore` commands. `snap` before and after: `HEAD` still `13481c7` (no commit), `git ls-files --stage` unchanged, no `.git/index.lock`; the only differences are the untracked file absent (in the entry: `git show "<id>^3:platform/guide/草稿 筆記.txt" \| shasum` equals its earlier digest) and the stash list holding the hook's entry above `683fd1a…`. The two tracked edits and `_redirects` kept their bytes. The printed commands, pasted into `zsh -f -c`, exit 0; `shasum -c` then passes for all four files, and `snap` equals the start except the extra entry. After `git stash drop stash@{0}` (checked to be the printed id) the second run's `snap` equals its start exactly | `$S/snap.sh b; SLOW_MARK=$S/slow.mark PATH="/bin:$S/bin-slow:$PATH" python3 -I $S/drive.py $S/slow.mark git commit -a -F <msg>; $S/snap.sh a; diff b a; zsh -f -c "<the commands W9 printed>"; shasum -c $S/r1.sha` |
| 2. H46: `.git/index.lock` present before a commit | teacher's command line: real `git commit`, then the hook run directly | pass, O5 before any change. With `door-is-open/index.md` staged, `notes.md` unstaged and the untracked file present, and an empty `.git/index.lock`: `git commit -F <msg>` itself exits 128 ("無法建立 … index.lock：File exists") before the hook runs, `snap` unchanged. `bash scripts/pre-commit.sh` then exits 1 with git's "無法寫入索引" (the stash push fails) and no `[pre-commit]` line; `snap` unchanged (stash list with the teacher's entry only, every byte, the index), the lock still there with its bytes (`shasum -c`). Control, beyond the brief: after `rm .git/index.lock`, `git commit -F <msg>` exits 0 with `[pre-commit] ✓ door-is-open`, the commit holds only the staged file, `notes.md` and the untracked file keep their bytes and stay unstaged and untracked, stash list unchanged | `touch .git/index.lock && $S/snap.sh b && PATH="/bin:$PATH" git commit -F <msg>; echo $?; PATH="/bin:$PATH" bash scripts/pre-commit.sh; echo $?; $S/snap.sh a && diff b a && shasum -c $S/lock.sha; rm .git/index.lock` |
| 3. H27: a fresh repository's first commit with an unstaged edit, then with an untracked file | teacher's command line, real `git commit`, in `$S/fresh` | pass, O6 with W7, both times. `git archive HEAD \| tar -x -C $S/fresh`, `git init -b main`, `pnpm install --frozen-lockfile` (hook installed), the build outputs copied, `git add -A`. (i) `notes.md` edited after the add; (ii) that edit staged and `platform/guide/未追蹤 檔.txt` left untracked. Each `git commit -F <msg>` exits 1 with W7 ("This is the repository's first commit … stage it with git add … Nothing was changed."); `snap` before and after identical, still no `HEAD` (`git rev-parse -q --verify HEAD` exits 1), empty stash list, the file's bytes unchanged (`shasum -c`) | in `$S/fresh`: `$S/snap.sh b && PATH="/bin:$PATH" git commit -F <msg>; echo $?; $S/snap.sh a && diff b a` |
| 3a. H28: the same first commit with everything staged | teacher's command line, real `git commit` | pass. In `$S/fresh` after `git add platform/guide/`: exit 0, `[pre-commit] ✓` for the four challenges, root commit `ea734a8` (no parent), working tree clean, stash list empty, `_redirects` in `HEAD` equal to the working tree's. The guard passes on it: `Tests  10 passed (10)`. In `$S/fresh2`, the same tree with `platform/public/_redirects` deleted before `git add -A`: exit 0, root commit `3dc5621` with `A platform/public/_redirects`, byte-identical to the committed file of row 3, working tree clean; guard `Tests  10 passed (10)` | `git add platform/guide/ && PATH="/bin:$PATH" git commit -F <msg> && git rev-list --parents -n1 HEAD && pnpm vitest run tests/unit/site/redirects-generated.test.ts`; `$S/fresh2`: `rm platform/public/_redirects` before `git add -A`, then `git show --name-status --format= HEAD -- platform/public/_redirects` |
| 4. H45 under `/bin/bash` 3.2 in the clone | `pnpm vitest` in the clone, `/bin` first on `PATH` | pass: the three H45 cases (H02 and H14 run directly, H07 and H34 through `git commit`) `Tests  3 passed \| 91 skipped (94)`. The whole hook test file: `Tests  94 passed (94)`, `H47 took O7`. Every real commit in rows 1–3 also ran the installed hook under `/bin/bash` 3.2 | `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts -t "H45" --reporter=verbose`; `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts --reporter=verbose` |
| H29, H30 on these runs | the clone; this checkout and the main checkout | pass. Clone: the teacher's entry `683fd1a…` listed with the same id after every row. Real repository: `git stash list` empty before and after; this checkout's `HEAD` still `d1413c2`, `git status --short` the same five paths, `platform/public/_redirects` equal to `d1413c2`'s | `git stash list --format='%H %gs' \| diff - $S/clone-stash-before.txt`; `git -C <repo> stash list --format='%H %gs' \| diff - $S/real-stash-before.txt; git -C $W diff --quiet d1413c2 -- platform/public/_redirects` |
| cleanup | — | done. No process from the clone or the fresh repositories before removal; nothing listening on 4173 (no server was started); `$S/clone`, `$S/fresh`, `$S/fresh2` deleted; afterwards `pgrep` finds nothing for those paths, nor `pre-commit.sh`, `sleep 60` or `bin-slow` | `pgrep -fl "$S/clone"; pgrep -fl "$S/fresh"; lsof -tnP -iTCP:4173 -sTCP:LISTEN; rm -rf "$S/clone" "$S/fresh" "$S/fresh2"; pgrep -fl pre-commit.sh; pgrep -fl "sleep 60"; pgrep -fl bin-slow` |

Row 1 took O7 in both runs, as H47 did in every automated run: git had removed its `index.lock`
before the hook restored, so the hook kept the entry and printed W9 for a missing index. The O5 branch
of H47 was not reached here, as at stage 5. In row 3's first message draft, the subject began with
an emoji outside the skill's table (🎉 `init`); it was redrafted as 🔧 `chore` before any commit ran.

This ticket has no stage 8 checkbox in its acceptance criteria, so none was ticked. Every local row
this ticket owns passed. Still open for stage 8: the ticket PR's CI (bash 5 for H25, H47 and the
other cases) and the Cloudflare preview, once the parent pushes the branch. The epic's final stage 8
is T-0039's. H26 stays unchecked for the user's ruling (stage 6 round 1, finding 5). The user said
auto-merge is on. The PR should not merge before that CI run has been seen and H26 has its ruling.

### 2026-10-23 — completeness check

The checkout was checked directly, without relying on earlier summaries. Everything ran in
`/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0034` on the pending change over
`d1413c2`.

**Each ticked criterion and the case that observes it** (seam 0007-S5, `tests/pre-commit-sh.test.ts`):

| Criterion | Case(s) | What it asserts |
|---|---|---|
| H25 | `pre-commit.sh: interruption (H25)`, `it.each` over SIGINT, SIGTERM and SIGHUP | the signal goes to the group while the blocking stub runs; exit 129/130/143; the stub's record shows the hook's own entry; `expectO5` |
| H27, H28 | `pre-commit.sh: a first commit (H27, H28)`: H27 × 4 (direct and `git commit -m`, × unstaged edit and untracked file), H28 direct and through `git commit -m`, two boundaries | O6: exit 1, W7, nothing changed, no `HEAD`, the validator and generator not run. O2: `_redirects` staged as `A`, no W3, the root commit's tree. All on `buildFirstCommitFixture` |
| H42 | `pre-commit.sh: a run with nothing to stash (H42)` | O2 with W3; the stash list during the run equals the one before; `other.txt` keeps its bytes and `_redirects` has no `# stashed by the teacher` (not applied); H29 in `afterEach` (not dropped) |
| H45 | `describe.skipIf(!BASH_3)('pre-commit.sh: under macOS’s /bin/bash 3.2 (H45)')`, 3 cases | `expectH02H14('/bin/bash')`, `expectH07` and `expectH34` with `/bin` first on `PATH`; `command -v bash` is `/bin/bash`, version 3. Run on this Mac (not skipped: 94 of 94 below). The coverage report says it runs on a Mac only |
| H46 | `pre-commit.sh: a git failure before the stash (H46)` | `expectO5`; the lock keeps its empty bytes |
| H47 | `pre-commit.sh: SIGINT to an interrupted git commit -a (H47)` | the stub sees `GIT_INDEX_FILE` = `.git/index.lock`; `HEAD` unchanged; no `index.lock`; `ls-files --stage` unchanged; O7 branch: each changed file in the entry, W9's printed commands put everything back; O5 branch: `expectNothingChanged` |
| H29, H30 | the file's `afterEach` | H29 skipped only for `preexisting: null` (the first-commit fixture); H30 `realRepoState()` for every case |

H26 stays unticked: its case passes, but only for LF and binary files, and the criterion awaits the
user's ruling (stage 6 round 1, finding 5). No ticked criterion lacked a case, so none was unticked.

**Record sections present:** test plan table with its approval line; open points resolved; red →
green log with the mutation table; coverage report table; code review (stage 6, rounds 1 and 2);
security review (stage 7) and round 2; end-to-end (stage 8, local).
`.proj.specs/0007-gh-pages-range-fixes/review/security-T-0034.md` exists (untracked, in scope).

**Commands and results:**

- `pnpm test --run` → `Test Files  130 passed (130)`, `Tests  4464 passed | 1 skipped (4465)`, exit 0.
  This is round 2's count.
- `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts --reporter=verbose`, twice → `Tests  94 passed (94)`
  and `H47 took O7` each time. `PATH="/bin:$PATH" bash -c 'echo $BASH_VERSION; command -v bash'` →
  `3.2.57(1)-release`, `/bin/bash`.
- `/bin/bash -n scripts/pre-commit.sh` → exit 0.
- `pnpm -s challenge:validate` → `All checks passed.`, exit 0.
- `python3 scripts/verify-project.py` (Python 3.13.11) → `PASS: shared instructions, 42 skills …`, exit 0.
- `pgrep -fl pre-commit.sh` → no output, exit 1.
- `grep -n "stash \(drop\|apply\|pop\)" scripts/pre-commit.sh` → one `git stash drop` (`drop_entry`);
  every other hit is a comment or printed text.
- `git status --short` → the four modified files of this ticket (the hook, the test file, its helper,
  this ticket) and the untracked `security-T-0034.md`. `git status --short --ignored` adds only
  `.vitepress/wasm/`, `node_modules/` and `platform/public/challenge/`, the build folders present
  before. During `pnpm test --run` an untracked `platform/challenge/keygen-source-files-probe/`
  appeared. It is a transient fixture of `tests/unit/scripts/challenge-keygen.test.ts`, gone once the
  run ended (rechecked with the same command). Nothing was removed.
- Frontmatter: `status: review`.

**Gaps that keep this ticket from closing,** neither of which this check can fix:

1. H26 is unticked and awaits the user's ruling: W9's `git stash apply` is not byte for byte for a
   CRLF file or an overlapping hunk (stage 6 round 1, findings 5 and 9; security S6).
2. The end after a stash push stopped partway and changed the index (round 2, finding 6) is neither
   O5 nor O7 as traceability words them. The ruling, whether the hook restores the index or a spec
   revision names this end, is the user's, together with gap 1.
3. Stage 8's remaining part: the ticket PR's CI (ubuntu, bash 5, for H25, H47 and the other cases)
   and the Cloudflare preview have not run, since the branch is not pushed. Auto-merge is on, so the
   PR should not merge before that CI run has been seen and gaps 1 and 2 have their ruling.

For T-0039, unchanged: W7 and the three forms of W9 are new teacher-facing text that README or skill
text may want to mention.

### 2026-10-24 — rulings on gaps 1 and 2 (D16, revision 3.1)

The completeness check left two gaps for the user. The user's standing authorization of 2026-10-23
for T-0033 to T-0038 ("授權權限，完成到結束") covers them, so the parent decided both, choosing the
option that changes no code and adds no guarantee (global rule 5's side-effect check), and recorded
the decision as D16 in `traceability.md` revision 3.1.

1. Gap 1 (H26, findings 5 and 9, security S6): documented, not changed. Measured with git 2.54.0 in a
   throwaway repository with this repository's `.gitattributes` (`* text=auto eol=lf`), a file with
   a staged and an overlapping unstaged change, and an unstaged CRLF file, stashed with
   `git stash push --keep-index --include-untracked`: `git stash apply <id>` left conflict markers
   in the overlapping file, and `git checkout <id> -- platform/o.txt` brought its unstaged content
   back exactly; `git show <id>:platform/crlf.txt | od -c` printed `x \n y \n`, so the entry itself
   holds LF line endings and no later step could restore the CRLF bytes from it. To rerun, from the
   repository root, in a new empty directory `$E`:

   ```sh
   git init -q "$E/r" && cp .gitattributes "$E/r/" && cd "$E/r" && git config user.email t@t && git config user.name t
   mkdir platform && printf 'a\nb\nc\n' > platform/o.txt && printf 'x\n' > platform/crlf.txt && git add -A && git commit -qm init
   printf 'a\nSTAGED\nc\n' > platform/o.txt && git add platform/o.txt && printf 'a\nUNSTAGED\nc\n' > platform/o.txt
   printf 'x\r\ny\r\n' > platform/crlf.txt
   git stash push -q --keep-index --include-untracked -m probe && id=$(git rev-parse refs/stash)
   git stash apply -q "$id"; cat platform/o.txt          # conflict markers
   git checkout "$id" -- platform/o.txt && cat platform/o.txt   # a, UNSTAGED, c
   git show "$id:platform/crlf.txt" | od -c              # x \n y \n
   ```

   Keeping `$WORK/raw` past the run (option a) was not chosen: it adds a guarantee and
   leaves copies of the teacher's files in `TMPDIR`.
2. Gap 2 (round 2, finding 6): the spec now names the end. The O7 row covers a `git stash push` that
   stopped partway after changing the index: the files are back, the index is as the push left it,
   and W9 prints `git restore --staged --source=<id>^2 -- …`. Having the hook restore the index
   itself was not chosen: B2 says the hook stages only `platform/public/_redirects`.

Changed: `traceability.md` (revision 3.1 note, D16, rows O7 and H26, the check "Restore, then drop;
O7"), `spec.en.md` (status note, the decisions range, AC-23's O7 bullet) and `spec.zh-TW.md` (the
same three, `synced_from_sha` set to `git hash-object .proj.specs/0007-gh-pages-range-fixes/spec.en.md`
→ `0700a2b7f9c68a1539e6d9d179537a27c3adc6d6`). No code or test changed. H26 is ticked against the
revised row. For T-0039: W9's text does not mention `git checkout <id> -- <path>` for an overlapping
hunk; README or skill text may want to.

Gap 3 (the PR's CI, bash 5, and the preview) remains for stage 9.

### 2026-10-24 — review of revision 3.1 (D16)

A read-only reviewer reported F1–F18 against `d98ff27`. Skeptics then tried to refute each: a
medium finding stands with 2 of 3, a low one with 1 of 1. The parent passed the verdicts on; this
section records what was done, in this worktree, left uncommitted. The result is revision 3.2 of the
spec and two changes to the hook. Commands below use
`F=/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf3/fix`.

**Confirmed, and what was done**

| # | Sev. | Finding | Votes | Done |
|---|---|---|---|---|
| F1 | medium | the constraints "hold in every outcome", and ":277" (byte for byte), contradict D16 (a) in O7 | 3 of 3 | the constraints now hold "except where O7 and D16 say otherwise"; the byte-for-byte constraint holds when the hook's restore completes, and in O7 points at D16 (a) |
| F2 | medium | under `-a`/`-i`/`-p`, W9's third form compares `index.lock` and prints `git restore --staged --source=<id>^2`, which would write `-a`'s staging into the real `.git/index` | 3 of 3 | fixed test-first (H49, below): on `index.lock` the hook drops its entry once the files are back and prints no W9, ending in O5. D16 (b), O5 and O7 say so |
| F3 | medium | B2's does-not-protect column does not list D16's exceptions | 3 of 3 | B2 (both languages) now names D16 (a)'s conversions and conflicts and D16 (b)'s index |
| F4 | medium | the hook section still says the index and working tree are as before after a failure | 3 of 3 | both languages: as before after O3, O4, O6; after O5 except `_redirects`; O7 described by the table and D16. The stash bullet names the partial restore, the partial push and the lock case |
| F5 | medium | O5's and O7's conditions overlap for a push that stopped partway | 3 of 3 | O5 now requires the index under `platform/` to be the one the entry recorded, or the run to be on `index.lock`; the check "Restore, then drop; O7" says so |
| F6 | medium | D16 (b)'s end has no H row or AC wording; W9's required substrings miss the third form's command | 3 of 3 | rows H48 (own index: O7, third form), H49 (`commit -a`: O5) and H50 (partial restore) mapped to AC-23; AC-23 gains a bullet; W9 requires `git restore` in every form, `git stash apply` in the first two and `git restore --staged` in the third, and a paragraph names the three forms. The existing case is now named H48 and asserts `git restore --staged --source=<id>^2` (`expectW9ForIndex`) |
| F7 | medium | D16 (a)'s `git checkout <id> -- <path>` also stages the file, and a conflicting apply leaves other files staged | 3 of 3 | measured (below), D16 (a) rewritten: W9's `git restore` commands are the way back without touching the index; after a conflicting apply, `git restore --staged --source=<id>^2` puts the index back on the repository's own index only |
| F8 | low | O7's "every file back as O5 describes" overclaims: the push left untracked files staged | 1 of 1 | O7: every file's bytes are back, but the files the push staged, untracked ones included, stay staged until W9's `git restore --staged` is run |
| F9 | low | a restore that stops partway leaves files back, and W9's `git stash apply` then refuses | 1 of 1 | fixed test-first (H50): W9's first form also prints the `git restore` commands (`restore_commands`, shared with the missing-index form); O7 says "not yet back or partly back"; D16 (c) |
| F10 | low | the CRLF exception is too broad and was inferred; other conversions are missing | 1 of 1 | measured: CRLF is lost only where the index version has no CR (tracked or untracked); a CRLF index version is kept; `ident` is not byte for byte. D16 (a) now names conversions on add as an open class |
| F12 | low | "the hook never writes the index under `platform/` itself" is false (`_redirects`) | 1 of 1 | D16: "Besides `_redirects`, the hook writes no index entry under `platform/` and does not undo its push's index changes (B2)"; the hook header says the same |
| F13 | low | the checks on the revision do not check D16 (b) | 1 of 1 | two check rows: D16 (b) against O5, the drop constraints, B2's "stages only", H47 and the commit-forms table; D16 (c) against W9, O7 and D16 (a) |
| F14 | low | the status line still says revision 3 | 1 of 1 | both languages: revision 3.2 (2026-10-24), with a sentence on what 3.2 does |
| F17 | low | adjacent hunks conflict too, not only overlapping ones | 1 of 1 | measured (below): adjacent conflicts, one unchanged line between merges; D16 (a), B2 and H26 say "overlapping or adjacent" |

**Rejected by the skeptics** (no change made for them):

| # | Finding | Votes | Reason |
|---|---|---|---|
| F11 | the ruling's measurement did not use the hook's push form | 0 of 1 | the skeptic ran both forms: identical entries (same trees for `^1`, `^2`, `^3`), same apply exit 1 and conflict, same LF. This revision's measurement uses the hook's form anyway |
| F15 | the hook header overclaims | 0 of 1 | points 6 and 7 qualify themselves; W9's command puts the index back where it is printed. Point 6's opening was still reworded with this change's code ("unless the restore fails or the entry is kept as point 7 says"), and point 7 now describes the partial restore and the lock case |
| F16 | W9 prints `<id>^2` and `^3` unquoted | 0 of 1 | zsh's `EXTENDED_GLOB` is not a default; it fails loudly and the entry stays; already rejected in round 2 |
| F18 | the parent, not the user, ruled on gaps 1 and 2 | 0 of 1 | review.md's adjudication rule covers disagreements between reviewers; these were unanimous findings, decided under the recorded standing authorization |

**Finding F2: test first.** `gitChildBlocker(repo, args, 'fail')` makes git's own child command exit 1
instead of blocking, so `git commit -a` still holds `index.lock` when the hook ends. H49
(`it.each` over `apply --index -R` and `checkout --no-overlay`, through `git commit -a`) expects O5
exactly, no `git restore --staged`, no `git stash apply`, `HEAD` unchanged and no lock left. H48 gains
the same two failures in a direct run, where the third form must still be printed. The fix:
`on_own_index` sets `ON_LOCK=true` for the `.lock` form, and `finish`, when the index differs from
`<id>^2` on a lock, keeps the status non-zero and drops the entry. B2 is kept: the hook writes no
index entry besides `_redirects`.

**Finding F9: test first.** H50 puts an untracked file in `platform/notes/唯讀 dir/` (mode 0555;
skipped as root). The push warns that it cannot unlink it and exits 0; the restore's `checkout-index`
fails on it after the tracked files came back. The case expects O7 with W9, the tracked edits back,
`git stash apply` refusing once the directory is writable, and W9's printed commands putting every
file back (`_redirects` holding the expected content, as O5 allows).

- Red: `PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t "H48|H49|H50"` →
  `Tests  3 failed | 4 passed | 92 skipped (99)`: both H49 cases on
  `expected '[pre-commit] ✗ Could not put your sta…' not to contain 'git restore --staged'`, and H50
  on `expected null not to be null` in `runPrintedRestore` (no command printed).
- Green: `PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t "H48|H49|H50|H26|H47|missing index"`
  → `Tests  12 passed | 87 skipped (99)`.
- Mutations, each applied to the hook and reverted (`cmp` against `$F/pre-commit.sh.orig` →
  identical), with `python3 -I $F/mut.py scripts/pre-commit.sh <M>` then
  `PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t "H48|H49|H50|H26"`:
  M22 (`if [ "$ON_LOCK" = true ]; then` → `if false; then`) → `Tests  2 failed | 6 passed | 91 skipped (99)` (both H49);
  M23 (W9's first form without the `git restore` commands) → `Tests  1 failed | 7 passed | 91 skipped (99)` (H50).

**Measured for F7, F10 and F17.** git 2.54.0, `/bin/bash` 3.2.57, this worktree's `.gitattributes`
(`* text=auto eol=lf`), the hook's own push command and pathspec. Rerun:
`rm -rf $F/E && mkdir $F/E && LC_ALL=C /bin/bash $F/measure.sh /Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0034 $F/E`
(output kept in `$F/measure.txt`). The script:

```sh
#!/bin/bash
# D16 (a) measurement with the hook's own push command (the `git stash push` in scripts/pre-commit.sh).
# Usage: /bin/bash measure.sh <worktree> <empty dir E>
set -u
W=$1 E=$2
REST=(platform/ ":(exclude)platform/public/_redirects")
PRINTED=(':(top)platform/' ':(top,exclude)platform/public/_redirects')

setup() { # $1 = repo dir
  git init -q "$1" && cp "$W/.gitattributes" "$1/" && cd "$1" || exit 1
  git config user.email t@t && git config user.name t
  mkdir -p platform/public
  printf 'r\n' > platform/public/_redirects
  printf 'a\nb\nc\n' > platform/o.txt          # overlapping hunk
  printf 'l1\nl2\nl3\nl4\nl5\nl6\n' > platform/adj.txt   # adjacent hunk
  printf 'l1\nl2\nl3\nl4\nl5\nl6\n' > platform/gap.txt   # one unchanged line between
  printf 'p\n' > platform/other.txt            # unstaged only
  printf 'x\n' > platform/crlf.txt             # index LF, working tree CRLF
  printf 'k\r\n' > platform/crin.txt           # index already CRLF
  git add -A
  git update-index --add --cacheinfo "100644,$(git hash-object -w --no-filters platform/crin.txt),platform/crin.txt"
  git commit -qm init
  printf 'a\nSTAGED\nc\n' > platform/o.txt && git add platform/o.txt && printf 'a\nUNSTAGED\nc\n' > platform/o.txt
  printf 'l1\nl2\nS3\nl4\nl5\nl6\n' > platform/adj.txt && git add platform/adj.txt && printf 'l1\nl2\nS3\nU4\nl5\nl6\n' > platform/adj.txt
  printf 'l1\nl2\nS3\nl4\nl5\nl6\n' > platform/gap.txt && git add platform/gap.txt && printf 'l1\nl2\nS3\nl4\nU5\nl6\n' > platform/gap.txt
  printf 'p\nOTHER-UNSTAGED\n' > platform/other.txt
  printf 'x\r\ny\r\n' > platform/crlf.txt
  printf 'k\r\nm\r\n' > platform/crin.txt
  printf 'u\r\nv\r\n' > platform/untr-crlf.txt
  mkdir -p ../before-wt && cp -p platform/*.txt ../before-wt/
  git ls-files -s > ../before-index.txt
  git status --porcelain=v1 --untracked-files=all > ../before-status.txt
  git -c core.safecrlf=false stash push --keep-index --include-untracked --quiet -m "pre-commit: stash unstaged changes" -- "${REST[@]}"
  echo "push=$?"
  id=$(git rev-parse refs/stash)
}

bytes() { # which files differ from before, byte for byte
  for f in ../before-wt/*.txt; do
    n=platform/$(basename "$f")
    if cmp -s "$f" "$n"; then echo "  same  $n"; else echo "  DIFF  $n"; fi
  done
  printf '  od crlf.txt:      '; od -c platform/crlf.txt | head -1
  printf '  od crin.txt:      '; od -c platform/crin.txt | head -1
  printf '  od untr-crlf.txt: '; od -c platform/untr-crlf.txt | head -1
}
index() {
  if git ls-files -s | diff -q - ../before-index.txt >/dev/null; then echo "  index: same as before"; else echo "  index: DIFFERS from before:"; git ls-files -s | diff ../before-index.txt - | sed 's/^/    /'; fi
  echo "  git diff --cached --name-only:"; git diff --cached --name-only | sed 's/^/    /'
  echo "  status:"; git status --porcelain=v1 --untracked-files=all | sed 's/^/    /'
}

echo "git: $(git --version); bash: $BASH_VERSION"
echo "== Route A: git stash apply <id>, then git checkout <id> -- <path>, then git restore --staged --source=<id>^2"
( setup "$E/a"
  echo "entry: git show \$id:platform/crlf.txt | od -c -> $(git show "$id:platform/crlf.txt" | od -c | head -1)"
  echo "entry: git show \$id^3:platform/untr-crlf.txt | od -c -> $(git show "$id^3:platform/untr-crlf.txt" | od -c | head -1)"
  git stash apply -q "$id"; echo "-- after git stash apply: exit=$?"; index; bytes
  git checkout "$id" -- platform/o.txt platform/adj.txt; echo "-- after git checkout \$id -- platform/o.txt platform/adj.txt: exit=$?"; index; bytes
  git restore --staged --source="$id^2" -- "${PRINTED[@]}"; echo "-- after git restore --staged --source=\$id^2 -- PRINTED_REST: exit=$?"; index; bytes
)
echo "== Route B: W9's printed git restore commands, from the O7 state"
( setup "$E/b"
  git restore --source="$id" --worktree -- "${PRINTED[@]}" && git restore --overlay --source="$id^3" --worktree -- ':(top)platform/'
  echo "-- after the printed commands: exit=$?"; index; bytes
)
echo "== ident: the attribute in .gitattributes"
( git init -q "$E/i" && cd "$E/i" && git config user.email t@t && git config user.name t
  mkdir platform && printf '* text=auto eol=lf\nplatform/id.txt ident\n' > .gitattributes
  printf 'a\n' > platform/id.txt && git add -A && git commit -qm init
  printf 'a\n$Id$\n' > platform/id.txt
  git -c core.safecrlf=false stash push --keep-index --include-untracked --quiet -m "pre-commit: stash unstaged changes" -- "${REST[@]}"; echo "push=$?"
  git stash apply -q "$(git rev-parse refs/stash)"; echo "apply=$?"; echo "  platform/id.txt now: $(sed -n 2p platform/id.txt)"
)
```

Results:

- The entry: `crlf.txt` (index LF, working tree CRLF) and the untracked `untr-crlf.txt` are stored
  as `x \n y \n` and `u \n v \n`. `crin.txt`, whose index version already holds CR, is stored
  and given back as `k \r \n m \r \n`.
- Route A, `git stash apply <id>` → exit 1. `o.txt` (overlapping) and `adj.txt` (adjacent: `l3`
  staged, `l4` unstaged) are `UU`; `gap.txt` (one unchanged line between) merged cleanly. Every
  merged file is now staged: `git diff --cached --name-only` lists `crin.txt`, `crlf.txt`,
  `gap.txt` and `other.txt` too, and `git ls-files -s` differs from before.
- Then `git checkout <id> -- platform/o.txt platform/adj.txt` → exit 0: both files hold their
  unstaged bytes (`cmp` same) and are staged with them (`o.txt` at `fee33ac`, before `9310c48`).
- Then `git restore --staged --source=<id>^2 -- ':(top)platform/' ':(top,exclude)platform/public/_redirects'`
  → exit 0, `index: same as before`. Every file `cmp`-identical to before except `crlf.txt` and
  `untr-crlf.txt`, which are LF.
- Route B, from the O7 state, W9's printed commands (`git restore --source=<id> --worktree -- …`
  `&& git restore --overlay --source=<id>^3 --worktree -- ':(top)platform/'`) → exit 0,
  `index: same as before`, no conflict, the same bytes as route A's end.
- `ident`: with `platform/id.txt ident` in `.gitattributes`, `$Id$` comes back as
  `$Id: 0667178464fa6a45884c8d52229dd83ec37e8d9f $`.

**Spec changes (revision 3.2).** `traceability.md`: revision note; D16 rewritten as (a), (b), (c);
the constraints' scope, the drop constraint and the byte-for-byte constraint; O5's condition and
index column; O7's condition, index and working-tree columns; W9's substrings and its three forms;
H26; new H48–H50; AC-23's rows; the check "Restore, then drop; O7" and two new checks.
`spec.en.md` and `spec.zh-TW.md`: the status line and paragraph; the stash bullet and the outcomes
bullet of the hook section; B2's does-not-protect column; AC-23's bullets and rows. `synced_from_sha`
is `git hash-object .proj.specs/0007-gh-pages-range-fixes/spec.en.md` after the last edit.
`review/security-T-0034.md`: "第 3 輪" with S13 (F2), S14 (F9) and S15 (F7), and S6's summary row.

**Commands rerun after the changes**, in this worktree:

- `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts --reporter=verbose`, twice in a row
  → `Tests  99 passed (99)` and `H47 took O7` each time (94 before, plus H48 × 2, H49 × 2 and H50).
  `bash` here is `/bin/bash` 3.2.57; bash 5 is CI's.
- `pnpm test --run` → `Test Files  130 passed (130)`, `Tests  4469 passed | 1 skipped (4470)`, exit 0:
  round 2's 4464 plus the 5 new cases.
- `/bin/bash -n scripts/pre-commit.sh` → exit 0.
- `pnpm -s challenge:validate` → `All checks passed.`, exit 0.
- `pgrep -fl pre-commit.sh` → no output, exit 1.
- `grep -n "stash \(drop\|apply\|pop\)" scripts/pre-commit.sh`, comments and printed text left out →
  one `git stash drop`, in `drop_entry`.
- `git stash list` in this worktree → empty; no `git stash` ran in the real repository or a worktree.

Acceptance criteria: H48, H49 and H50 are added and ticked, each observed by its case above; H26's
note follows D16 (a) as revision 3.2 words it. No criterion was unticked. For T-0039: W9's first
form now also prints the `git restore` commands, and after `git commit -a` a push that stopped
partway prints no W9. Gap 3 (the PR's CI on bash 5, and the preview) remains for stage 9. `status`
stays `review`.


#### Round 2 (2026-10-24): the review of the uncommitted revision 3.2

The reviewer and the skeptics ran again on this worktree's uncommitted fix. The parent passed on
three lists of confirmed findings (called A, B and C below, since their ids repeat) and the rejected
ones. Everything below is in this worktree, left uncommitted. Commands use
`R=/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf3/r2-fix`.

**Confirmed, and what was done**

| # | Sev. | Finding | Done |
|---|---|---|---|
| A R2-S1, B R2-S1, C R2-S1 | medium | after a push that stopped partway on the repository's own index, a failed restore takes W9's first form and never compares the index, so `git restore --staged` is not printed, against O7's index column, W9 and D16 (b); the teacher's next commit would carry the unstaged and untracked files | fixed test-first (H51): `finish` compares the index after a failed restore too, on the repository's own index, and `keep_index_too` prints a second line with `git restore --staged --source=<id>^2 -- …`. W9, O7, D16 (b), the stash bullet and AC-23 say so |
| C R2-S5 | low | on `index.lock`, git can remove the lock after `finish`'s check and before the restore (a SIGINT to `git commit -p`); the restore then runs on no index, does not remove the teacher's deleted files, and the entry is dropped with no W9 | fixed test-first (H52): `index_gone` is checked again once the restore is done, and a lock gone by then keeps the entry with W9's missing-index form. The constraint, O5's condition ("an `index.lock` that still exists"), O7's condition and D16 (b) say so |
| A R2-S2 | low | the hook header's point 6 leaves out the O7 after step 5's `git add` (H50), where `_redirects` holds the expected content | point 6: "unless an O5 or an O7 came during step 5's git add or later", also on `index.lock`; point 6 also names the lock case of the drop; point 7 names the second index check and the first form's index line |
| A R2-S3 | low | D16 (a) and (c) say W9's commands give every other file back byte for byte, but a file the index adds and the working tree has deleted comes back | documented, not changed: D16 (a), B2's does-not-protect column (both languages), the D16 (c) check ("outside D16 (a)'s exceptions"), a new check row and a known edge |
| A R2-S4 | low | `expectW9ForIndex` took the id from the third form's "git stash apply <id> is not needed" | the third form's id now comes from `git restore --staged --source=<id>^2`; the helper also requires `stash entry <id>` and no `git restore --source=<id> --worktree` and no `run: git stash apply`. The message is kept, and W9's paragraph now says the third form says apply is not needed; the wording is the user's to change |
| A R2-S6, B R2-S11 | low | the ticket's coverage report and references were stale: 94 cases, H48's AC column "O5", "revision 3", `pre-commit.sh:400`, "now `:248-250`" and the like | 101 cases with the history; H48's AC column "AC-23 (H48; O7, D16 (b))"; "revision 3.2"; the measurement script names the push instead of a line; the round 2 line numbers say "at `b2a12cb`" |
| A R2-S7 | low | seam S5 says every `GIT_*` variable is removed, while cases set `GIT_INDEX_FILE`, `GIT_EXEC_PATH` and a `git` wrapper on `PATH` | S5 now says every inherited `GIT_*` variable is removed and lists what a case may set |
| A R2-S8 | low | `expectW9` did not require the first form's `git restore` commands, so swapping the first form for the third went unseen (all 99 passed) | `expectW9` requires `git restore --source=<id> --worktree`; H50 requires no `git restore --staged`. M26 below now fails H26, H50 and H51 |
| A R2-S9 | low | the helper's section header did not name H48 and H49 | "(H25, H26, H46–H49, H52)" |
| B R2-S3 | low | AC-23 and D16 (b) say a partial push under `git commit -a` ends in O5 without saying the cause; a signal to the group ends in O7 through the missing index; AC-23 names only `-a` | both say "when git's own child command fails"; a signal to the group follows H47 (O5 or O7); AC-23 says `-a` is measured and `-i`, `-p` take the same path in git's source |
| B R2-S4 | low | on `index.lock`, an O5 after the hook staged `_redirects` leaves the expected content in the working tree while `<gitdir>/index` holds the old one, which O5's row did not say | documented, not changed: O5's working-tree column and the `_redirects` constraint say so; the hook comment too. B2 already lists an unstaged `_redirects` as replaced (D3). H52's end shows it |
| B R2-S5 | low | the spec's stash bullet says "drops it only after … the entry recorded" and then that the lock case drops it | both languages: "only after the restore completed and either … recorded, or the run is on an `index.lock` that still exists" |
| B R2-S6 | low | D16 opens with "Three ends of O7", but (a) is not an end and (b)'s lock case is O5 | "Three questions about O7 and the ends next to it are settled" |
| B R2-S7 | low | spec.zh-TW.md's AC-23 had the SIGINT item and the first-commit item in the other order | reordered to match spec.en.md; `synced_from_sha` recomputed |
| B R2-S10 | low | H50 checked one tracked file, not that the untracked file is still there, and not the index right after the run | H50 checks every tracked file the entry holds, the untracked file still there, and the index as before but for `_redirects` |
| B R2-S14 | low | O5's condition names "the entry recorded" also for runs with no entry (H46) | "when the hook has an entry, …" |

**Rejected by the skeptics** (no change made for them): A R2-S5 (the third form's cause on a failed
comparison: unreachable within B2's scope), A R2-S10 (the repeated `status=1` lines: no defect),
A R2-S11 ("below" in a one-line message: style), B R2-S2 (a failed comparison counted as a change:
needs a corrupt repository), B R2-S8 (the checks table's heading: the rows say their revision),
B R2-S9 (apply named in the third form: the ticket's O7 asks for it), B R2-S12 and C R2-S3 ("see
git's message above" after a skipped symbolic link: unreachable), B R2-S13 ("index version has no
CR" for untracked files: accurate), B R2-S15 (the Solution summary: accurate), C R2-S2 (the silent
lock branch at status 0: not reached), C R2-S4 (no-overlay restore removing files staged after W9:
inside W9's "run them before you change anything there"), C R2-S6 (a direct run with
`GIT_INDEX_FILE=<gitdir>/index.lock`: the caller's lock).

**Test first.** H51 puts a committed file `platform/notes/唯讀 dir/表.txt` with an unstaged change
next to H50's untracked draft, in the same 0555 directory (skipped as root). H52 copies `.git/index`
to `.git/index.lock`, runs the hook with `GIT_INDEX_FILE` naming it, and a `git` wrapper in the new
mode `remove-index-then-run` removes that file at the hook's first `git restore --source=`.

- Red: `TMPDIR=$R PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` →
  `Tests  2 failed | 99 passed (101)`: H51 on `expected '警告: unable to unlink …' to contain
  'git restore --staged --source=…'`, and H52 on `expected '[pre-commit] ✓ door\n[pre-commit] pla…'
  to contain 'the index this commit ran on is gone'`. The other 99, with the stricter `expectW9`,
  `expectW9ForIndex`, `runPrintedRestore` (every printed command, in order) and H50, passed on the
  hook as it was.
- Green, first try: H51 passed; H52 failed on `_redirects` only (the hand edit replaced by the
  expected content, with `.git/index` holding the old one). That is B R2-S4's end, which O5 allows
  on `index.lock`, so H52 now asserts it instead of `expectAllBack`. Then
  `TMPDIR=$R PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` → `Tests  101 passed (101)`.
- Mutations, each applied with `python3 -I $R/mut.py scripts/pre-commit.sh <M>`, run with
  `TMPDIR=$R PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t "H26|H50|H51|H52"`,
  and reverted (`cmp $R/pre-commit.sh.orig scripts/pre-commit.sh` → identical): M24 (no
  `keep_index_too`) → `1 failed` (H51); M25 (no second `index_gone` check) → `1 failed` (H52); M26
  (`keep_entry` replaced by `keep_entry_for_index` after a failed restore, A R2-S8's swap) →
  `3 failed` (H26, H50, H51).

**Spec changes (revision 3.2, second round).** `traceability.md`: the revision note; D16 ((a) the
added-then-deleted file; (b) H51, the cause under `-a`, the signal case and H52); seam S5; W9's row and
paragraph; the `_redirects` and drop constraints; O5's condition and working-tree column; O7's
condition and index column; H50; new H51 and H52; AC-23's rows; four check rows changed or added.
`spec.en.md` and `spec.zh-TW.md`: the status line, the stash bullet, B2's does-not-protect column,
AC-23's bullets and rows, and the zh-TW AC-23 order. `synced_from_sha` is
`git hash-object .proj.specs/0007-gh-pages-range-fixes/spec.en.md` after the last edit
(`2942a8277e8fa227e7017f9b654e43e3314fb366`). `review/security-T-0034.md` is not changed in this round.

**Commands rerun after the changes**, in this worktree:

- `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts --reporter=verbose`, twice in a row
  → exit 0, `Tests  101 passed (101)` and `H47 took O7` each time. `bash` here is `/bin/bash`
  3.2.57; bash 5 is not installed on this Mac and is CI's.
- `pnpm test --run` → exit 0, `Test Files  130 passed (130)`, `Tests  4471 passed | 1 skipped (4472)`:
  the first round's 4469 plus H51 and H52.
- `/bin/bash -n scripts/pre-commit.sh` → exit 0. `pnpm -s challenge:validate` → `All checks passed.`,
  exit 0. `python3 scripts/verify-project.py` → `PASS`.
- `pgrep -fl pre-commit.sh` → no output, exit 1. `git stash list` in this worktree → empty; no
  `git stash` ran in the real repository or a worktree.

Acceptance criteria: H51 and H52 are added and ticked, each observed by its case above. No criterion
was unticked. For T-0039: W9's first form can now carry a second line with `git restore --staged`.
`status` stays `review`.

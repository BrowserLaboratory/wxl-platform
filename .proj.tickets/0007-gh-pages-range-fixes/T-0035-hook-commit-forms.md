---
id: T-0035
title: The pre-commit hook gives the expected _redirects in every commit form it runs in
epic: 0007-gh-pages-range-fixes
status: review
blocked_by: [T-0032]
---

## Context

git hands the pre-commit hook a different index file depending on how the commit was started. A plain
commit and `--amend` give the repository's own index; `-a`, `-i` and `-p` give `index.lock`; a linked
worktree gives its own index. T-0032 implements the predicate that treats these as the hook's own
index and refuses a path commit. This ticket proves, through real `git commit` invocations, that each
of the accepted forms commits the expected `_redirects`, and so does the repair E1 describes.

Spec: `traceability.md` revision 3, "Commit forms" and its measured table, seam 0007-S5.
T-0033 and T-0034 change the same hook and test file, so work these tickets one at a time.

## Deliverable

`--amend`, `-p`, `-i`, a linked worktree, the E1 repair and a merge whose `_redirects` conflict was
resolved that way, each commit the expected `_redirects`.

## Acceptance criteria

- [x] H32: `git commit --amend` that adds a challenge → O2, expected file (AC-22)
- [x] H34: stale committed `_redirects`; `pnpm redirects:generate`, `git add`, `git commit` → expected file (AC-22)
- [x] H35: a merge whose `_redirects` conflict is resolved that way, concluded with `git commit` → expected file (AC-22)
- [x] H36: `git commit -p` with its answers piped on stdin → O2, expected file (AC-22)
- [x] H37: `git commit -i <path>` → O2, expected file (AC-22)
- [x] H38: `git commit` in a linked worktree with unstaged files → O2; unstaged files byte-identical; the shared pre-existing entry still listed (AC-22)
- [x] H29, H30 hold for each of these rows (AC-23)
- [x] If `-p` hands the hook a different `GIT_INDEX_FILE` from the one the measured table infers, update the table in `traceability.md` before closing (`--only` is checked by H33 in T-0032)

## 給使用者（zh-TW）

用真的 `git commit` 驗證 hook 在每一種 commit 方式下都產生正確的 `_redirects`：`--amend`、`-p`、`-i`、linked worktree、照 E1 修復過期的檔，以及解完 `_redirects` 衝突的 merge。若實測發現 `-p` 或 `--only` 交給 hook 的 index 檔和 spec 的推論不同，先更新 traceability 再結案。

## Comments

### 2026-10-23 — test plan (stage 5)

Seam 0007-S5, in `tests/pre-commit-sh.test.ts` with the fixture and helpers of
`tests/__helpers__/preCommitRepo.ts`, as T-0032, T-0033 and T-0034 left them. Every case runs this
checkout's real `scripts/pre-commit.sh` through a real `git commit` at `<mkdtemp>/暫存 repo` (a
space and non-ASCII characters), with `isolatedEnv`: every inherited `GIT_*` variable removed, `HOME`
and `GIT_CONFIG_GLOBAL` isolated. `bash` on this Mac is `/bin/bash` 3.2.57, so every case runs under
3.2 here and under bash 5 in CI's ubuntu. No row of this ticket runs the hook directly.

New harness pieces, both in the helper file:

- **Recording hook shim.** A case may replace the installed `.git/hooks/pre-commit` with a shim
  that writes `GIT_INDEX_FILE` (or `<unset>`) to a log under `<base>/`, copies the file it names to
  `<base>/索引 記錄/`, then runs `exec bash '<HOOK>'`. It changes no tracked file, so `-p`'s hunks
  and `-i`'s paths are the case's own. It gives each form's `GIT_INDEX_FILE`, which the case compares
  with the measured table (physical absolute paths). It also gives the index git handed the hook,
  taken before the hook ran. The oracle is `expectedRedirects(repo, { GIT_INDEX_FILE: <copy> })`. The
  expected index after the commit is that copy's `git ls-files --stage`, `_redirects` excepted. For
  `-p` and `-i` this is the only index that holds the staged snapshot: the case's own `.git/index`
  does not hold it before the commit (open point 6).
- **Linked worktree.** `git worktree add -q -b wt '<base>/連結 worktree'` from the fixture repository.
  It needs `-b`: without it git derives the branch name from the path, which is not a valid one
  (measured). The helper links `node_modules` into the worktree, where the shared
  `.git/info/exclude` already excludes it. It returns a `Repo` for the worktree, so `snapshot` reads
  that worktree's index, its files (the `.git` file excluded) and its untracked lines, and the
  shared `git stash list`.

The outcome check is O2 through a commit form. It extends `expectO2` to a commit:
- status 0;
- the shim's `GIT_INDEX_FILE` is the measured table's row;
- `HEAD:platform/public/_redirects`, the staged one and the working tree's are the oracle;
- `.git/index` (the worktree's own index in H38) equals the expected index, `_redirects` excepted;
- every other working-tree byte, the untracked lines and `git stash list` with ids are as before.

H29 and H30 stay in the file's `afterEach`.

Measured before writing this plan (git 2.54.0, in session directories outside the repository).
Reproduce with
`export SCRATCH=/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0035`
and `/bin/bash "$SCRATCH/measure.sh"`, which prints one line per result:

- `GIT_INDEX_FILE` per form:
  - `git commit` and `--amend`: `.git/index` (relative);
  - `-a`, `-i` and `-p`: `<gitdir>/index.lock`, absolute (so `-p` is as the table infers, and the
    table needs no change);
  - `--only`: `<gitdir>/next-index-<pid>.lock`;
  - a linked worktree: `<gitdir>/worktrees/連結-wt/index` for a plain commit, and the same path plus
    `.lock` for `-a` and `-p`. That is the worktree's `git rev-parse --git-path index`.
- `-p` with `y` and `n` piped on stdin commits only the hunk answered `y`.
- `git commit -i <untracked path>` exits 128 ("did not match any file(s) known to git"), while
  `-i <directory>` of tracked files deleted from the working tree commits their deletion.
- `git worktree add '<dir>/連結 wt'` without `-b` exits 255: "not a valid branch name".
- During a merge whose only conflict, in `_redirects`, is resolved and staged, the hook's push
  succeeds and keeps `.git/MERGE_HEAD`. That push is `git stash push --keep-index
  --include-untracked -- platform/ ':(exclude)platform/public/_redirects'`. The restore and drop
  succeed too, and `git commit --no-edit` then records a commit with two parents.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S5 harness, every case below | H29: the pre-existing entry is still listed with its commit id, in the file's `afterEach`. H30: this checkout's `_redirects` bytes, `git ls-files --stage` and `git stash list` are unchanged, in the same `afterEach`. In H38 the entry is listed from the `refs/stash` both worktrees share | test harness | AC-23 (H29, H30) | Every row below has the pre-existing entry. No case leaves a worktree registered outside `<base>`, so `removeRepo` removes it |
| S5 `git commit --amend`, shim | H32: a commit made with `--no-verify` changes `door/src/app.py`. Then a new challenge `new-chall` (#4) is staged, with unstaged edits to `platform/public/other.txt` and `door/src/app.py` and an untracked `platform/notes/untracked.txt`, and `git commit --amend --no-edit` runs. O2 through the form, with `GIT_INDEX_FILE` `.git/index`. The amended commit's parent is the fixture commit (`HEAD~1` as before the amend). Its tree holds the amended change and `new-chall`. Its `_redirects` has `/c/004 /challenge/new-chall/` beside `FIXTURE_RULES` | hook under `--amend` | AC-22 (H32), AC-23 (H29, H30) | The trigger compares with `HEAD`, the commit being amended (open point 3). The hook stashes during the amend. Expected green at once (T-0032). Mutation: the hook exits 0 before its trigger, which should go red on the missing rule |
| S5 `git commit`, the E1 repair | H34: `expectH34({})`, the helper T-0034 wrote for H45, run with the `bash` on `PATH`, which gives H45's bash 5 side in CI. A stale `_redirects` (door's two rules removed) is committed with `--no-verify`. Then `node --experimental-strip-types scripts/generate-redirects.ts`, the command behind `pnpm redirects:generate`, runs, followed by `git add` of the file and `git commit`. The helper gains three checks, which H45's `/bin/bash` run also gets: the shim's `GIT_INDEX_FILE` is `.git/index`; no W3, since the staged version already was the expected one; and the O2 snapshot checks | hook on a repair | AC-22 (H34), AC-23 (H29, H30, H45) | Passes on a hook that does nothing, by construction (open point 2). Boundary: an untracked numbered challenge `draft` (#4) in the working tree during the repair. The teacher's file then holds `/c/004`, and the commit's file is the oracle without it, `FIXTURE_RULES`. W3, and W4 naming `platform/challenge/draft/`; `draft` byte-identical and untracked. Mutation: generation without `--staged`, which should send the boundary red |
| S5 merge concluded with `git commit`, shim | H35: branch `side` adds challenge `alpha` (#4) and main adds `beta` (#5), each with its regenerated `_redirects`, committed with `--no-verify`. `git merge side` exits 1 with `_redirects` the only unmerged path (asserted, so a fixture that stops conflicting fails loudly). The case resolves it with the generator's command and `git add`, then runs `git commit --no-edit`. Status 0. `GIT_INDEX_FILE` is `.git/index`. `HEAD` has two parents, main's tip and `side`'s, and `.git/MERGE_HEAD` is gone. `HEAD`'s `_redirects` is the oracle, with `/c/004 /challenge/alpha/`, `/c/005 /challenge/beta/` and `FIXTURE_RULES` | hook concluding a merge | AC-22 (H35), AC-23 (H29, H30) | The main case passes on a hook that does nothing (open point 2). Boundary, after the merge stopped: an untracked challenge `draft` (#6) and an unstaged edit to `platform/public/other.txt`. The hook then stashes mid-merge (measured: `MERGE_HEAD` kept). The merge commit's file has no `/c/006`; W3 and W4; `draft` and `other.txt` byte-identical; two parents; the stash list as before. Mutation as H34's |
| S5 `git commit -p`, answers on stdin, shim | H36: a commit made with `--no-verify` adds `platform/notes/long.txt` (20 lines). Then: `test-chall/index.md`'s number goes from 1 to 6; `door/src/app.py` is edited; `long.txt` is edited at its first and last line; and `platform/notes/untracked.txt` is added untracked. `git commit -p -m …` gets `n\ny\ny\nn\n` on stdin, in hunk order: `door/src/app.py`, `test-chall/index.md`, then `long.txt`'s two hunks. O2 through the form, with `GIT_INDEX_FILE` `<gitdir>/index.lock`. `HEAD`'s tree holds number 6, `door/src/app.py` as `HEAD~1`'s, and `long.txt` with only its first hunk. Its `_redirects` holds `/c/006 /challenge/test-chall/` and no `/c/001` | hook on `index.lock` from `-p` | AC-22 (H36), AC-23 (H29, H30) | The unanswered hunks are unstaged relative to `index.lock`, so the hook stashes on it. Afterwards `door/src/app.py` and `long.txt` keep their working-tree bytes, with `long.txt`'s last-line edit still unstaged. If the shim records another `GIT_INDEX_FILE`, the measured table in `traceability.md` is updated first, and this ticket says so. Expected green at once. Mutation: the `"$own.lock"` alternative removed from `on_own_index`, which should go red with W8 |
| S5 `git commit -i <path>`, shim | H37: `new-chall` (#4) is staged with `git add`. Then `test-chall/index.md`'s number goes from 1 to 7 and `door/src/app.py` gets an edit, both unstaged. `git commit -i platform/challenge/test-chall/index.md -m …` runs. O2 through the form, with `GIT_INDEX_FILE` `<gitdir>/index.lock`. `HEAD`'s tree holds `new-chall`, number 7, and `door/src/app.py` as `HEAD~1`'s; the edit is still unstaged afterwards. Its `_redirects` holds `/c/004 /challenge/new-chall/` and `/c/007 /challenge/test-chall/`, and no `/c/001` | hook on `index.lock` from `-i` | AC-22 (H37), AC-23 (H29, H30) | Boundary: `-i platform/challenge/test-chall` after the directory was removed from the working tree. The commit drops `test-chall` and the `/c/001` rule. `-i` takes only tracked paths (measured), so a new challenge cannot be named with it (open point 5). Mutation as H36's |
| S5 `git commit` in a linked worktree, shim | H38: the linked worktree is on branch `wt`. In it, `new-chall` (#4) is staged, with unstaged edits to `platform/public/other.txt` and `door/src/app.py` and an untracked `platform/notes/untracked.txt`; then `git commit -m …` runs there. O2 through the form on the worktree's snapshot, with `GIT_INDEX_FILE` equal to the worktree's `git rev-parse --git-path index`, `<gitdir>/worktrees/<name>/index`. The worktree's unstaged and untracked files are byte-identical. `git stash list`, read from either worktree, equals the one from before, the pre-existing entry with its id included. `wt` advanced and `main` did not | hook in a linked worktree | AC-22 (H38), AC-23 (H29, H30) | Boundary: the main worktree also has an unstaged edit to `platform/public/other.txt` and an untracked file under `platform/`. Its snapshot (index, every byte, untracked lines) is unchanged after the worktree's commit. Expected green at once. Mutation: `own` taken from `git rev-parse --git-common-dir`/`index`, which should go red with W8 |
| stage 6, diff check | The measured table in `traceability.md` matches what the shim recorded for `-p`, `-i`, `--amend` and the linked worktree, or was updated in this change and the ticket says so. The ticket's coverage report says which cases ran under `/bin/bash` 3.2 here and which bash 5 CI gives | spec, ticket record | AC-22 (the ticket's `-p` item) | Not run automatically |
| stage 8, S7, as far as this ticket reaches | A temporary local clone of this branch, never pushed and removed afterwards, with the hook `pnpm install` installs (`simple-git-hooks`) and `/bin/bash` 3.2. In it: `git commit --amend` that adds a challenge; `git commit -p` with piped answers; `git commit -i <path>`; a commit in a `git worktree add` worktree; the E1 repair with the real `pnpm redirects:generate`; and a merge whose `_redirects` conflict is resolved that way. After each commit, its `_redirects` equals what `pnpm redirects:generate` writes over a clean checkout of it, and `pnpm vitest run tests/unit/site/redirects-generated.test.ts` passes there. The commits use `/tw-emoji-commit` (D9) | the teacher's command line | AC-22 (H32, H34–H38) | The epic's final stage 8 is T-0039's. The fixture has no `package.json`, so only this row runs `pnpm redirects:generate` itself (open point 7) |

Approval: The user approved this test plan in advance on 2026-10-23 with the standing instruction "授權權限，完成到結束" (permission granted; carry it through to the end), given together with "ultracode 先確認是否能夠平行，若有風險都選擇順序，完成 T-0033 T-0034 T-0035 T-0037 T-0038".

Open points, to resolve before the first test:

1. **`-p`'s index is as inferred.** The table infers `<gitdir>/index.lock` for `-p`, and the
   measurement gives it (above), in the main worktree and in a linked one. No update to
   `traceability.md` is planned. H36's shim check keeps it measured. The sentence "Measured on
   2026-10-21 … every row except `-p`, `--only` and the direct run" stays, since this ticket's record
   now carries the measurement.
2. **H34 and H35 cannot fail on a hook that does nothing.** Row H34 expects "the commit's
   `_redirects` is the expected one", and the teacher's E1 step already stages that file. A hook that
   exits 0 at once passes. What the rows guard is that the hook does not undo the repair. Each
   gets a boundary with an untracked numbered challenge, where the hook must change the teacher's
   file, plus the shim's `GIT_INDEX_FILE` check. Both boundaries go beyond the rows' literal text.
3. **`--amend` and the trigger.** "**Trigger.** The staged snapshot differs from `HEAD` at a watched
   path". With `--amend`, `HEAD` is the commit being amended. Amending only the message of a commit
   that bypassed the hook with a stale `_redirects` does not trigger, and the stale file stays. That
   follows the rule, and CI's guard (B3) and E1's repair catch it. The plan does not test it and
   proposes it as a known edge.
4. **H38's fixture.** The row says "a linked worktree of the fixture repository". S5 asks for
   "access to the packages they import". The worktree therefore gets its own `node_modules` link,
   excluded by the shared `info/exclude`. Its path holds a space and non-ASCII characters, so the
   branch is named with `-b` (measured).
5. **`-i` names only tracked files.** "a challenge file named with `-i`" can only be a tracked file:
   `-i` with an untracked path exits 128 (measured). H37 changes a tracked challenge's number, and its
   boundary deletes a tracked challenge. A new challenge goes through `git add`, as in H37's main
   case.
6. **The shim goes beyond S5's stubs.** S5 lists "copies of the scripts the hook calls, any of which
   a case may replace with a stub". The shim replaces the installed hook file instead, and then
   runs the real hook, as T-0034's git wrapper went beyond the list. The test file's header says
   the oracle is "taken before the hook runs". For `-p` and `-i` it is the shim's copy of the index
   git hands the hook. The header is updated to say so.
7. **`pnpm redirects:generate` in the fixture.** As in T-0034 (open point 5), the fixture has no
   `package.json`. H34 and H35 run the command behind it,
   `node --experimental-strip-types scripts/generate-redirects.ts`. Stage 8's clone runs the real one.
8. **E1's limit is not this ticket's.** spec.en.md says "E1's repair step runs over the whole working
   tree. An untracked draft without a number makes it refuse". That is the generator's behaviour
   before the hook runs, and the sentences are T-0039's. H34's boundary uses a numbered draft, which
   the generator accepts.

### 2026-10-23 — open points resolved (stage 5)

The planner's open points, each resolved by the spec or by the reading that keeps every other row
true. Commands run from this worktree's root, with
`export SCRATCH=/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0035`.

1. **`-p`'s index is as the table infers.** Rerun: `/bin/bash "$SCRATCH/measure.sh"` (git 2.54.0)
   prints `-p|<gitdir>/index.lock` (absolute), `-i|<gitdir>/index.lock`, `plain|.git/index`,
   `amend|.git/index`, `--only|<gitdir>/next-index-<pid>.lock`, `worktree|<gitdir>/worktrees/連結-wt/index`
   and `worktree-p|<gitdir>/worktrees/連結-wt/index.lock`. Every row of the measured table holds, so
   `traceability.md` is not changed. H36, H37, H32, H34, H35 and H38 assert what the shim recorded
   against the table's row, compared as physical absolute paths (`physicalPath`), so the measurement
   is re-checked on every run, also under bash 5 in CI. The ticket's `-p` checkbox stays for the
   stage 6 diff check, which the plan assigns it to.
2. **H34 and H35 pass on a hook that does nothing.** Accepted, as the plan proposed: their own cases
   guard that the hook leaves the repair as it is, on `.git/index`, with no W3. The teeth are the
   boundaries (an untracked numbered challenge during the repair). Mutation M1 (below) leaves both
   main cases green and sends both boundaries red, as expected.
3. **`--amend` and the trigger.** The spec's rule decides it: "The staged snapshot differs from
   `HEAD` at a watched path", and under `--amend` `HEAD` is the commit being amended. A
   message-only amend of a commit that bypassed the hook with a stale `_redirects` does not trigger
   and keeps the stale file; CI's guard (B3) and E1's repair catch it. Recorded as a known edge, not
   tested.
4. **H38's fixture.** `addWorktree` runs `git worktree add -q -b wt '<base>/連結 worktree'` and links
   `node_modules` into it. git names the worktree's admin directory `連結-worktree`; H38 asserts that
   `git rev-parse --git-path index` there is `<gitdir>/worktrees/連結-worktree/index`. The worktree
   is under `<base>`, so `removeRepo` removes it; its registration lives in the fixture's own `.git`.
5. **`-i` names only tracked files.** As measured (exit 128 for an untracked path). H37 changes a
   tracked challenge's number and stages `new-chall` with `git add`; its boundary names a tracked
   challenge directory deleted from the working tree.
6. **The shim goes beyond S5's stub list.** Kept: `recordingShim` replaces the installed
   `.git/hooks/pre-commit` (shared by every worktree), logs `GIT_INDEX_FILE`, copies the file it
   names, then runs `exec bash '<HOOK>'` as the installed hook does. The headers of
   `tests/pre-commit-sh.test.ts` and `tests/__helpers__/preCommitRepo.ts` now say so, and that for
   `-p` and `-i` the oracle comes from that copy.
7. **`pnpm redirects:generate` in the fixture.** As planned: `repairRedirects()` runs
   `node --experimental-strip-types scripts/generate-redirects.ts`, then `git add` of the file. Only
   stage 8's clone runs the real `pnpm`.
8. **E1's limit.** Not this ticket's; the sentences are T-0039's. H34's boundary uses a numbered
   draft, which the generator accepts.
9. **Stage 8 cost.** Stage 8 is not part of this stage; its row stays as planned, with the
   `/tw-emoji-commit` commits (D9).
10. **Dates.** Subsections are dated 2026-10-23 as instructed; the runs below happened on the
    machine's 2026-10-24. Each result carries its command instead of a date.
11. **Shared helper.** `expectH34` now installs the shim and checks O2 through the form
    (`expectCommitO2`) and no W3. H45's `/bin/bash` run uses it and stays green (103 passed below).

One deviation from the plan, found during the loop: **the plan's mutation for the H34 and H35
boundaries does not send them red.** Dropping only `--staged` switches the generator to write mode,
so the hook's `$WORK/expected` holds `✓ Wrote …` and every O2 case fails for that reason, not the
one meant. The faithful mutation, M2 below (generate over the working tree with `--root`, then copy
the written file), leaves both boundaries green: the hook's stash push (`--include-untracked`) has
already taken the untracked `draft` out of the working tree, so the working tree under `platform/`
is the staged snapshot. Only H20 (an ignored directory, which the stash leaves on disk) pins
`--staged`. The boundaries' teeth are M1.

### 2026-10-23 — red → green log (stage 5)

Every cycle ran `PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t "<filter>"`, so
`bash` was `/bin/bash` 3.2.57. No production file changed: every commit form already gave its
outcome on T-0032–T-0034's hook (`git diff --stat b2a12cb -- scripts/` is empty).

| Cycle | Test (`tests/pre-commit-sh.test.ts`, "commit forms through git commit (AC-22)") | Red | Green |
|---|---|---|---|
| 1 | H32 (`--amend`) with the new harness: `recordingShim`, `physicalPath`, `expectCommitO2`, the validator's stash record | passed at once. M1 turns it red (`expected '# Cloudflare Pages…' to be '# Cloudflare Pages…'`: the rule is missing) | no hook change |
| 2 | H34 through the shim (`expectH34({})`, shared with H45) and its boundary | passed at once. M1 turns the boundary red and leaves H34 green (open point 2) | `expectH34` split into `commitStaleRedirects` and `repairRedirects`, and checks O2 through the form |
| 3 | H35 and its boundary (merge stopped on `_redirects`, resolved with the generator) | passed at once. M1 turns the boundary red, H35 stays green. The boundary's stash record shows the hook's entry mid-merge | no hook change |
| 4 | H36 (`-p`, `n y y n` on stdin) | passed at once. M3 turns it red with W8 | no hook change |
| 5 | H37 (`-i <file>`) and its boundary (`-i <deleted directory>`) | passed at once. M3 turns both red with W8 | no hook change |
| 6 | H38 (linked worktree, main worktree's own work as boundary) | passed at once. M4 turns it red with W8 | `addWorktree` |
| 7 | headers of both test files | — (comment) | open point 6 |

#### Mutation checks (reproducible)

`$SCRATCH/mut.py` is T-0034's runner; `$SCRATCH/mutations.json` holds this ticket's edits. Each run
applies one mutation to `scripts/pre-commit.sh`, runs the whole hook test file (103 cases) with
`/bin` first on `PATH`, restores the hook and checks it byte for byte. Every run printed `restored`.

```sh
python3 -I "$SCRATCH/mut.py" <id>          # whole file
python3 -I "$SCRATCH/mut.py" <id> H34      # one filter
```

| Id | Mutation | Result (whole file) |
|---|---|---|
| M1 | `exit 0` before the trigger | `89 failed`, 14 passed. Among the new cases, H32, both boundaries, H36, H37 × 2 and H38 fail; H34, H35 and H45's H34 pass, as open point 2 says |
| M2 | generation over the working tree (`--root "$TOP"` without `--staged`, then the written file copied) | `1 failed`: H20. Both H34/H35 boundaries stay green (deviation above) |
| M3 | the `"$own.lock"` alternative removed from `on_own_index` | `10 failed`: H36, H37 × 2, H31 × 2, H21 through `-a`, the missing-index cases × 3 and H47 |
| M4 | `own` taken from `git rev-parse --git-common-dir`/`index` | `1 failed`: H38 |
| M5 (stage 6) | the stash step skipped (`if rest_dirty; then` before the raw copy becomes `if false; then`) | `26 failed`, 77 passed; among this ticket's cases H32, H35 boundary, H36 and H38 (each through its stash record). H36 failed only after stage 6 gave it that record |
| M6 (round 2) | after the push, the teacher's entry is dropped and stored again with its own message, so it sits above the hook's during validation and the list is as before once the hook drops its entry | `13 failed`, 90 passed; among this ticket's cases H32, H35 boundary, H36 and H38, each at `expectHookEntryOnTop`. With the round 1 count-only assertion the AC-22 cases all pass (`-t AC-22` → `9 passed`), see round 2 below |

### 2026-10-23 — coverage report (stage 5)

`@vitest/coverage-v8` is not installed:
`pnpm -s vitest run --coverage --coverage.include=scripts/pre-commit.sh tests/pre-commit-sh.test.ts -t H32`
→ `MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'`. None was installed. This
ticket changed only test files, and the hook under test is bash, which V8 coverage would not reach.
"Measured coverage" is the commit form and hook path each row drives, confirmed by the mutations.

Shells: every case ran under `/bin/bash` 3.2.57 here (`PATH="/bin:$PATH"`, the installed hook's
`exec bash`). `pnpm test --run` here resolves `bash` from `PATH` too, which on this Mac is also
`/bin/bash` 3.2: `pnpm -s exec sh -c 'command -v bash; bash -c "echo \$BASH_VERSION"'` prints
`/bin/bash` and `3.2.57(1)-release`, and `which -a bash` lists only `/bin/bash`. CI's ubuntu gives
bash 5 for every case except the H45 block, which it skips. That is by construction, not run here:
`.github/workflows/quality-gates.yml:18` (`runs-on: ubuntu-latest`) and `:69` (`pnpm test --run`) at
`b2a12cb`, and the block's `describe.skipIf(!BASH_3)`, where `BASH_3` asks `/bin/bash` for its major
version (`grep -n 'BASH_3' tests/pre-commit-sh.test.ts`).

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S5 harness | `afterEach` of all 103 cases | H29 (pre-existing entry by id), H30 (real `_redirects`, `ls-files --stage`, `stash list`); in H38 the entry is read from both worktrees | AC-23 (H29, H30) | — |
| S5 `--amend`, shim | H32 | `GIT_INDEX_FILE` `.git/index`; the hook triggers under `--amend` (M1); the hook's entry listed during validation (M5), on top with the earlier ids behind it in order (M6, round 2); parent kept; O2 | AC-22 (H32), AC-23 | the trigger's base: H32 triggers whether it compares with `HEAD` or `HEAD~1`, so which one is not pinned; only a message-only amend of a stale file would tell them apart (known edge, open point 3) |
| S5 E1 repair, shim | H34, H34 boundary, H45's H34 | `.git/index`; no W3 on a correct repair; W3 + W4 and the draft left out when untracked (M1) | AC-22 (H34), AC-23 (H45) | `--staged` not pinned here (M2, deviation above); H20 pins it |
| S5 merge, shim | H35, H35 boundary | `.git/index`; two parents, `MERGE_HEAD` gone; the hook stashes mid-merge (M5), its entry on top (M6, round 2); W3 + W4 (M1) | AC-22 (H35), AC-23 | a merge git concludes itself runs no pre-commit (spec, out of the hook's reach) |
| S5 `-p`, shim | H36 | `<gitdir>/index.lock`; `on_own_index`'s `.lock` branch (M3); the hook stashes on `index.lock`, through the validator's stash record (M5, since stage 6), its entry on top (M6, round 2); the unanswered hunks stay unstaged | AC-22 (H36), AC-23 | — |
| S5 `-i`, shim | H37, H37 boundary | `<gitdir>/index.lock` (M3); a named deleted directory commits its deletion and loses `/c/001` | AC-22 (H37), AC-23 | `-i` with an untracked path (git refuses it, exit 128) |
| S5 linked worktree, shim | H38 | `<gitdir>/worktrees/連結-worktree/index`, `--git-path index` (M4); the hook stashes there (M5), its entry on top of the shared list (M6, round 2); shared `refs/stash`; `wt` advanced, `main` not; the main worktree's snapshot unchanged | AC-22 (H38), AC-23 | `-a`/`-p` in a linked worktree (measured by `measure.sh`, not a case) |
| stage 6 diff check | H32, H34–H38 (the shim's record against the table) | done in stage 6: the table matches (see the code review below) | AC-22 (`-p` item) | — |
| stage 8, S7 | — | not run (stage 8) | AC-22 | stage 8; the epic's final stage 8 is T-0039's |

Commands and results (this worktree, 2026-10-24 local):

| Command | Result |
|---|---|
| `pnpm test --run` | 130 files passed; 4473 passed, 1 skipped |
| `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` | 1 file passed; 103 passed (94 before this ticket) |
| `bash -n scripts/pre-commit.sh` | exit 0 |
| `pnpm -s challenge:validate` | `All checks passed.` |
| `pgrep -fl pre-commit.sh` | nothing listed (exit 1) |
| `/bin/bash "$SCRATCH/measure.sh"` | the measured table's rows, as in open point 1 |

### 2026-10-23 — code review (stage 6)

Round 1, four axes, each finding put to independent skeptics (2 of 3 to confirm medium and high,
1 of 1 for low). Commands run from this worktree's root, with `SCRATCH` as in the open points.
No production file changed: `git diff --stat b2a12cb -- scripts/` is empty in the final state (last row of the rerun table below). It was not empty during the incident recorded below, until the restore.

Confirmed, and what was done:

| # | Axis | Finding | Verdict | Done |
|---|---|---|---|---|
| C1 | Standards | The coverage report's shell claims carried no command | low, 1/1 | The local claim now carries `pnpm -s exec sh -c 'command -v bash; bash -c "echo \$BASH_VERSION"'` (`/bin/bash`, `3.2.57(1)-release`) and `which -a bash` (only `/bin/bash`). The CI claim is marked as by construction, with `.github/workflows/quality-gates.yml:18,69` at `b2a12cb` and the H45 block's `skipIf` |
| C2 | Standards | Duplicated Code: the test file's new `lines()` repeated the helper's private one, and `Shim.recorded` a third time | low, 1/1 | `lines` is exported from `tests/__helpers__/preCommitRepo.ts`; `snapshot`, `stashList`, `readRecord`, `Shim.recorded` and the test file use it. Refactor, no behaviour change |
| C3 | Standards | Locality: `commitStaleRedirects`, `repairRedirects` and `expectH34` sat under the H45 heading, about 850 lines from the AC-22 cases that use them most | low, 1/1 | Moved into the commit-forms helper group just above `describe('pre-commit.sh: commit forms through git commit (AC-22)')`; `expectH34`'s comment says H45 runs it with `/bin` first on `PATH`, as `expectH07`'s does |
| C4 | Spec | The coverage report said H36 shows the hook stashes on `index.lock`, but nothing in H36 observed the stash | medium, 3/3 (two of them argued low) | Test first. New mutation M5 (the stash step skipped) left H36 green: `python3 -I "$SCRATCH/mut.py" M5 H36` → `Tests  1 passed | 102 skipped (103)`. H36 now records `git stash list` at the validator (`stashLogOf`) and asserts the hook's entry was listed above the teacher's, as H32, H35 boundary and H38 do. (As first written, the four cases compared only the count, one more than before; round 2 made the assertion match this sentence, see below.) Its unstaged-paths check is scoped to `platform/`, since the stub replaces the fixture's tracked `scripts/challenge-lint-staged.ts`. Then the same command → `expected [ 1 ] to deeply equal [ 2 ]`, 1 failed; unmutated, `PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t H36` → 1 passed |
| C5 | Spec | The coverage report said H32 shows the trigger compares with the amended commit, but H32 triggers against `HEAD` or `HEAD~1` alike | low, 1/1 | The row now says H32 triggers under `--amend` (M1) and that the base is not pinned; only the known edge of open point 3 would tell them apart. No case added: that case is the edge open point 3 chose not to test |

Rejected by the skeptics (not acted on), with their reason:

| Axis | Finding | Votes | Reason |
|---|---|---|---|
| Standards | H34, H35 main cases pass on a hook that does nothing | 0/3 | The rows' outcome cannot tell; disclosed in the approved plan (open point 2); the main cases still catch a hook that changes the repaired file, the index or the stash; the boundaries carry the teeth (M1) |
| Standards | All new cases passed at once; several tests per cycle | 0/1 | Characterization of T-0032–T-0034's hook, announced in the plan; each case's mutation is listed; T-0015, T-0030, T-0033 settled this form |
| Standards | Mutation edits live only in `$SCRATCH/mutations.json` | 1/3 | workflow.md asks for a command, which each claim has; T-0034 rejected the same finding. Whether to write the (old, new) pairs into the record, as T-0033 did, is for the user |
| Standards | Test plan approved in advance | 0/1 | The user's standing instruction names T-0035; T-0033 rejected the same finding |
| Standards | The `-p` checkbox is unchecked though its condition is met | 0/1 | The approved plan assigns it to the stage 6 diff check (below) |
| Standards | `measure.sh`'s merge measurement ran a push shaped like the hook's, not the hook | 0/1 | The record names the exact push it measured; the real hook mid-merge is H35 boundary |
| Standards | `expectCommitO2` re-implements `expectO2` | 0/1 | Different repo, index base and oracle source; merging needs three parameters |
| Standards | `physicalPath` re-implements `basename` | 0/1 | Not a naming smell; the root-level edge is unreachable from its callers |
| Standards | Two describes both named "commit forms" | 0/1 | The new name is spec.en.md's AC-22 wording |
| Standards | H35 helpers nested, one without a doc comment, tips type repeated | 0/1 | H45's `expectBinBash` is the precedent; names are self-explanatory |
| Standards | Stash asserted through the validator stub (implementation-coupled) | 0/1 | The stash is a spec hook constraint; S5 allows stubs; the pattern predates this ticket |
| Standards | H38 asserts `wt` equals `HEAD` (near-tautological) | 0/1 | Falsifiable; at worst redundant with `wt~1` |
| Standards | `rev-parse` sometimes trimmed | 0/1 | Each comparison is consistent; the trims that exist are needed |
| Standards | `recordingShim` relies on the hook's exec bit and on the main worktree's `Repo` | 0/1 | `writeFileSync` keeps the mode; a wrong `Repo` fails loudly; the doc comment says so |
| Standards | Plan text and shim log location differ | 0/1 | `<base>/索引 記錄/log` is under `<base>/` |
| Standards | "pre-existing entry" vs "teacher's entry" | 0/1 | Not GLOSSARY terms; the spec uses both; the test file uses the latter throughout |
| Standards | No coverage numbers | 0/1 | No provider installed, as every landed ticket records |
| Spec | H34/H35 no-op; boundaries do not pin `--staged` | 0/3 | Disclosed (open point 2, the deviation); H20 pins `--staged` (M2) |
| Spec | `node` command instead of `pnpm redirects:generate` | 0/1 | `package.json:34` runs the same command; stage 8 S7 runs `pnpm` |
| Spec | `-p` AC unchecked; traceability still calls `-p` inferred | 0/1 | Condition not met; the plan keeps the sentence and puts the measurement in this record |
| Spec | Measured table says `<gitdir>/index`, measured `.git/index` | 0/1 | `<gitdir>` is a placeholder and paths are compared resolved; traceability is unchanged by this ticket |
| Spec | S5's stub list does not cover the hook shim | 0/1 | S5 permits stubs, it does not enumerate; disclosed as open point 6, as T-0034's git wrapper |
| Spec | `expectedRedirects`' doc says "before the hook runs" | 0/1 | Existing doc; the shim copy is that moment's index; the headers say so |
| Spec | Reproduce commands depend on the session scratchpad | 0/1 | As T-0034; the measured table is re-checked by every run of the cases |
| Spec | "`pnpm test --run` also resolves 3.2" has no command | 0/1 | Rejected on this axis; the same gap was fixed under C1 |
| Spec | H32/H35 use `arrayContaining` for the rules | 0/1 | The header's rule for changed challenge sets; byte-equality with the oracle pins extra rules |
| Spec | ACs checked before stage 8 S7 | 0/1 | workflow.md's stage 6 entry asks for it; S7 is marked not run |

Stage 6 diff check (the plan's row, AC-22's `-p` item): the shim recorded, through H32, H34–H38,
`.git/index` for a plain commit and `--amend`, `<gitdir>/index.lock` for `-p` and `-i`, and
`<gitdir>/worktrees/連結-worktree/index` for the linked worktree. Each case asserts it against the
row of the measured table in `traceability.md` revision 3 (`grep -n 'expectCommitO2(run' tests/pre-commit-sh.test.ts`
lists the index each case passes), and `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts`
passes (below). The table matches, so `traceability.md` is unchanged, and the `-p` checkbox is now ticked: its
condition ("if `-p` hands the hook a different `GIT_INDEX_FILE`") did not occur.

An incident while rerunning the mutations: a background loop was stopped mid-run, before `mut.py`
restored the hook, and left M1 (`exit 0`) in this worktree's `scripts/pre-commit.sh`. `git diff
b2a12cb -- scripts/` showed it; `git restore --source=b2a12cb -- scripts/pre-commit.sh` put it back,
and `git diff --stat b2a12cb -- scripts/` is empty. Every mutation was then rerun in the foreground.

Commands rerun after the changes (2026-10-24 local):

| Command | Result |
|---|---|
| `python3 -I "$SCRATCH/mut.py" M1` | `89 failed`, 14 passed, `restored` (as before) |
| `python3 -I "$SCRATCH/mut.py" M2` | `1 failed`: H20, `restored` |
| `python3 -I "$SCRATCH/mut.py" M3` | `10 failed`, as before, `restored` |
| `python3 -I "$SCRATCH/mut.py" M4` | `1 failed`: H38, `restored` |
| `python3 -I "$SCRATCH/mut.py" M5` | `26 failed`, 77 passed, H36 among them, `restored` |
| `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` | 1 file passed; 103 passed (run twice) |
| `pnpm test --run` | 130 files passed; 4473 passed, 1 skipped |
| `bash -n scripts/pre-commit.sh` | exit 0 |
| `pnpm -s challenge:validate` | `All checks passed.` |
| `pgrep -fl pre-commit.sh` | nothing listed (exit 1) |
| `git diff --stat b2a12cb -- scripts/` | empty |

### 2026-10-23 — security review (stage 7)

Report: [`.proj.specs/0007-gh-pages-range-fixes/review/security-T-0035.md`](../../.proj.specs/0007-gh-pages-range-fixes/review/security-T-0035.md).
Four candidates, all low, all in test tooling or the ticket record, each rejected 0/1 by its skeptic:
the scratchpad path in this record; `mut.py` not restoring the hook on SIGKILL (it happened once in
stage 6, see the incident above; detected and restored, never committed); `recordingShim` copying the
index git names; H38's `node_modules` link in the linked worktree. No change was made for stage 7.
The user mentioned turning on auto-merge; this record does not verify the PR's state.

### 2026-10-23 — review round 2 (stages 6 and 7)

Round 2 replayed round 1's prompt on the changed worktree; each finding went to independent skeptics
(2 of 3 to confirm medium and high, 1 of 1 for low). Commands run from this worktree's root, with
`SCRATCH` as in the open points. `scripts/` is unchanged (`git diff --stat b2a12cb -- scripts/` is
empty at the end of every command below; `mut.py` printed `restored` each time).

Confirmed, and what was done:

| # | Axis | Finding | Verdict | Done |
|---|---|---|---|---|
| R1 | Standards | `stashLogOf`'s comment and C4 say the hook's entry is listed above the teacher's, but H32, H35 boundary, H36 and H38 compared only the count | low, 1/1 | Took fix (a). New helper `expectHookEntryOnTop(stashLog, before)`: the validator ran once, the top id is a commit id not among `before`'s, and the rest equal `before`'s ids in order, as the stash-entry case does. The four cases call it; `stashLogOf`'s comment now points at it. Test first: new mutation M6 (the teacher's entry moved above the hook's during validation, the list as before afterwards) passes the count-only cases, `python3 -I "$SCRATCH/mut.py" M6 AC-22` with the round 1 assertions → `Tests  9 passed | 94 skipped (103)`; with the helper, `python3 -I "$SCRATCH/mut.py" M6` → `13 failed`, 90 passed, the four at `expected [ Array(1) ] to not include '…'`. M5 still fails them: `python3 -I "$SCRATCH/mut.py" M5 AC-22` → `4 failed | 5 passed` |
| R2 | Standards | The round 1 section said `scripts/`'s diff was empty "after every step", though its own incident left M1 there until the restore | low, 1/1 | The sentence now says the diff is empty in the final state and was not during the incident, until the restore. Record only |

Rejected by the skeptics (not acted on), with their reason:

| Axis | Finding | Votes | Reason |
|---|---|---|---|
| Standards | H36's validator stub adds a fifth `-p` hunk, answered only by stdin's EOF and pinned by no assertion | 1/3 | git stages no unanswered hunk at EOF; the stub is the test's instrument, not the behaviour under test; the hook's O2, the expected file and the `platform/` hunks stay pinned; C4 already records the stub and the `platform/` scope |
| Standards | C2's `lines()` merge left two hand-written `split` + `filter` in the test file | 0/1 | Not in this diff; C2 removed the duplicated function, not every inline split |
| Standards | Some commit-forms helpers take `r: Repo`, others use the module's `repo` | 0/1 | Those taking `r` are the ones H38 calls with the linked worktree; the rest only run on the main fixture, as the file's older helpers do |
| Standards | `stashLogOf` reads like a getter but replaces the tracked validator | 0/1 | Its doc comment says it puts a stub at the validator; `validatorLog` is the same pattern and name form |
| Standards | C1's command is `pnpm exec`, the claim about `pnpm test --run`'s `PATH` | 0/1 | Both prepend `node_modules/.bin`, which holds no `bash`; `which -a bash` lists only `/bin/bash`; H45 checks `command -v bash` inside the runner |
| Standards | Auto-merge is on and stage 8 S7 has not run; the record does not mark it a blocker | 0/1 | Nothing of T-0035 is committed or pushed, so no PR can merge it; workflow.md puts stage 8 before stage 9, which is the parent's and the user's step |
| Spec | C4 and `stashLogOf` claim order; the four cases check length | 0/1 | Rejected on this axis as covered by git's semantics and the stash-entry case; the same gap was fixed under R1 |
| Spec | H37, H37 boundary and H34 boundary stash, but observe no stash; M5 keeps them green | 0/1 | Their matrix rows ask only for O2 and the expected file; the plan promised a stash check only for H32, H35 boundary, H36 and H38 |
| Spec | `expectH34` gaining the shim and no-W3 changes what H45 checks | 0/1 | H45 is H34's outcome under `/bin/bash`; open point 11 and the approved plan say it, and H45 stays green |
| Security | Auto-merge could bypass the stage 7 and 8 gates | 0/1 | See the security report, S5 |
| Security | S2's impact chain is still "unverified" though `package.json:44` settles it; "no commit meanwhile" has no command | 0/1 | See the security report, S6 |
| Security | H36's `-p` relies on EOF to skip the stub's hunk | 0/1 | See the security report, S7 |

Security (stage 7, round 2): three candidates, all rejected 0/1, added to
[`security-T-0035.md`](../../.proj.specs/0007-gh-pages-range-fixes/review/security-T-0035.md) as S5–S7,
with the reviewer's limits. Round 2's change adds assertions only; no security finding stands.

Commands rerun after the changes (2026-10-24 local):

| Command | Result |
|---|---|
| `python3 -I "$SCRATCH/mut.py" M6` | `13 failed`, 90 passed: H32, H35 boundary, H36, H38, the stash-entry case, H25 × 3, H26, the missing-index cases × 3, H47; `restored` |
| `python3 -I "$SCRATCH/mut.py" M6 AC-22`, round 1's count-only assertions swapped in for the run, the file restored after (`cmp` equal) | `9 passed | 94 skipped`; `restored` |
| `python3 -I "$SCRATCH/mut.py" M5 AC-22` | `4 failed | 5 passed | 94 skipped`: H32, H35 boundary, H36, H38; `restored` |
| `PATH="/bin:$PATH" pnpm -s vitest run tests/pre-commit-sh.test.ts -t AC-22` | `9 passed | 94 skipped (103)` |
| `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` | 1 file passed; 103 passed |
| `pnpm test --run` | 130 files passed; 4473 passed, 1 skipped |
| `bash -n scripts/pre-commit.sh` | exit 0 |
| `pnpm -s challenge:validate` | `All checks passed.` |
| `pgrep -fl pre-commit.sh` | nothing listed (exit 1) |
| `git diff --stat b2a12cb -- scripts/` | empty |

### 2026-10-23 — end-to-end (stage 8, local)

Surface for every row: the teacher's command line, in a temporary local clone of this repository
(never pushed, origin removed) on a throwaway branch at `b2a12cb` carrying this worktree's pending
changes, with the hook `pnpm install` installed (`simple-git-hooks`: `.git/hooks/pre-commit` →
`bash scripts/pre-commit.sh`), run through real `git commit` invocations with `/bin` first on `PATH`
(`bash` = `/bin/bash` 3.2.57, git 2.54.0). The hook has no browser part. Not covered here: bash 5
(CI's ubuntu), the PR's CI and the Cloudflare preview, which the parent runs after pushing; the
epic's final stage 8 is T-0039's. Every commit message, the throwaway ones included, was drafted per
`.claude/skills/tw-emoji-commit/SKILL.md`, sanitized with its `scripts/sanitize_commit.py` (each
printed `unchanged`) and passed with `git commit -F`. One deviation: the merge commit's type
`🔀 merge` is not in the skill's emoji table, which has no merge type.

Setup (`$E` = `$SCRATCH/e2e`, `$W` this worktree, `<repo>` the main checkout). The helper scripts
stay in `$E`: `san.sh <name>` sanitizes `$E/msg/<name>.draft` to `.msg`; `rc.sh`, passed as
`SIMPLE_GIT_HOOKS_RC`, is sourced by the installed hook and appends the hook's `GIT_INDEX_FILE` to
`$E/log/index-files.txt` without changing the hook; `check.sh <repo dir> <label>` is the check run
after each commit.

```sh
git -C <repo> stash list --format='%H %gs' > $SCRATCH/real-stash-before.txt   # empty
git clone -q --no-hardlinks <repo> $E/clone && cd $E/clone && git remote remove origin
git checkout -q -b e2e/T-0035-throwaway b2a12cb
git -C $W diff --binary b2a12cb | git apply     # then copy $W's untracked files (git ls-files --others --exclude-standard)
pnpm install --frozen-lockfile                   # simple-git-hooks wrote .git/hooks/pre-commit
cp -Rp $W/.vitepress/wasm .vitepress/ && cp -Rp $W/platform/public/challenge platform/public/
export PATH="/bin:$PATH"
git add -A && git commit -F $E/msg/00-setup.msg  # the pending changes as one commit; hook O1
printf '<!-- teacher edit -->\n' >> platform/public/favicon.svg
git stash push -q -m 'pre-existing teacher entry' -- platform/public/favicon.svg   # dba3813…
git stash list --format='%H %gs' > $E/stash-before.txt
```

`check.sh` after each commit: (1) the committing working tree's `platform/public/_redirects` equals
`git show HEAD:platform/public/_redirects`; (2) in a clean detached checkout of `HEAD`
(`git worktree add --detach`, `node_modules` linked, removed afterwards) `pnpm redirects:generate`
writes a file byte-identical (`cmp`) to `HEAD`'s; (3) there
`pnpm vitest run tests/unit/site/redirects-generated.test.ts` passes. Every row's check printed
`rc=0`, `10 passed (10)`. After every row, `git stash list --format='%H %gs' | diff - $E/stash-before.txt`
was empty (the pre-existing entry `dba3813…` listed with its id), and `shasum -c` of the row's
unstaged and untracked files printed `OK`.

| Row | Result | Reproducing command, in `$E/clone` |
|---|---|---|
| H32: `git commit --amend` that adds a challenge | pass. Base commit: an edit to `door-is-open/src/app.py` (hook `✓ door-is-open`). Then `pnpm create:challenge --name e2e-amend --backend php` (#11), `git add` of the challenge directory only, an unstaged `app.py` edit and an untracked `platform/notes/untracked.txt` (CRLF, no final newline). Exit 0, `[pre-commit] ✓ e2e-amend`; the amended commit's parent is still `e1ca485`; it holds the `app.py` edit, `e2e-amend` and `_redirects` with `/c/011       /challenge/e2e-amend/                302`; unstaged edit and untracked file byte-identical; stash list unchanged | `git add platform/challenge/e2e-amend && git commit --amend -F $E/msg/02-amend.msg && git show --stat HEAD && shasum -c $E/log/amend.sha && $E/check.sh $E/clone amend` |
| H36: `git commit -p`, answers piped | pass. `e2e-amend`'s number 11 → 12 and its TODO line edited (two hunks), with the `app.py` edit still unstaged. `printf 'n\ny\nn\n' \| git commit -p` (hunks: `app.py`, number, TODO): exit 0, `✓ e2e-amend`; the commit holds only the number hunk and `_redirects` with `/c/011` replaced by `/c/012`; the `app.py` and TODO edits stay unstaged, byte-identical. A second run, `printf 'y\n' \| SIMPLE_GIT_HOOKS_RC=$E/rc.sh git commit -p` taking the `app.py` hunk, recorded `GIT_INDEX_FILE` `$E/clone/.git/index.lock` (the measured table's row) and left `_redirects` unchanged | `printf 'n\ny\nn\n' \| git commit -p -F $E/msg/03-p.msg && git show HEAD -- platform/public/_redirects && shasum -c $E/log/p.sha && $E/check.sh $E/clone p`; second run `… -F $E/msg/11-p2.msg`, then `tail -1 $E/log/index-files.txt` and `$E/check.sh $E/clone p2` |
| H37: `git commit -i <path>` | pass. `pnpm create:challenge --name e2e-include --backend php` (#13), `git add` of its directory; `e2e-amend`'s number 12 → 14 unstaged; the working tree's `_redirects` still `create:challenge`'s (with `/c/012`). `SIMPLE_GIT_HOOKS_RC=$E/rc.sh git commit -i platform/challenge/e2e-amend/index.md`: exit 0, `✓ e2e-amend`, `✓ e2e-include`, and W3 (`replaced your version with the one generated from the staged challenges`), as the working tree held a different `_redirects`; `GIT_INDEX_FILE` `$E/clone/.git/index.lock`; the commit's `_redirects` has `/c/013 … e2e-include` and `/c/014 … e2e-amend`, no `/c/012`; the `app.py` edit still unstaged, byte-identical | `git add platform/challenge/e2e-include && SIMPLE_GIT_HOOKS_RC=$E/rc.sh git commit -i platform/challenge/e2e-amend/index.md -F $E/msg/04-i.msg && git show HEAD:platform/public/_redirects \| grep e2e- && $E/check.sh $E/clone i` |
| H38: `git commit` in a linked worktree | pass. `git worktree add -q -b e2e-wt "$E/連結 worktree"`, `pnpm install` there. `create:challenge --name e2e-worktree` exited 3 there (`Template WASM not found …/.vitepress/wasm/…`: the build artifacts are per checkout); after `cp -Rp $E/clone/.vitepress/wasm .vitepress/` and `pnpm challenge:keygen e2e-worktree`, the directory (#15) was staged, without `_redirects`. An unstaged edit to `staff-only/index.md` and an untracked `platform/notes/wt-untracked.txt` there; the main worktree kept its own unstaged `app.py` edit and untracked file. `SIMPLE_GIT_HOOKS_RC=$E/rc.sh git commit`: exit 0, `✓ e2e-worktree`; `GIT_INDEX_FILE` `$E/clone/.git/worktrees/連結-worktree/index` (= `git rev-parse --git-path index` there); the commit's `_redirects` gains `/c/015 … e2e-worktree`; the worktree's unstaged and untracked files byte-identical; stash list unchanged read from either worktree; `e2e-wt` advanced (`e2e-wt~1` = `8f1ee9e`), the main branch did not; the main worktree's index, status, files and `HEAD` unchanged (`diff` of a snapshot taken before) | in `$E/連結 worktree`: `git add platform/challenge/e2e-worktree && SIMPLE_GIT_HOOKS_RC=$E/rc.sh git commit -F $E/msg/05-wt.msg && shasum -c $E/log/wt.sha && git stash list --format='%H %gs' \| diff - $E/stash-before.txt`; then `$E/check.sh "$E/連結 worktree" wt` |
| H34: the E1 repair on a stale committed `_redirects` | pass. `_redirects` without the `e2e-include` rule committed with `git commit --no-verify`; the guard then failed (`1 failed \| 9 passed`, "is byte-identical to what the challenge tree generates"). E1: `pnpm redirects:generate`, `git add platform/public/_redirects`, `SIMPLE_GIT_HOOKS_RC=$E/rc.sh git commit`: exit 0, no W3; `GIT_INDEX_FILE` `.git/index`; the commit restores `/c/013`; the unstaged `app.py` edit and untracked file byte-identical | `pnpm redirects:generate && git add platform/public/_redirects && SIMPLE_GIT_HOOKS_RC=$E/rc.sh git commit -F $E/msg/07-e1.msg && $E/check.sh $E/clone e1`; before it, the guard alone: `pnpm vitest run tests/unit/site/redirects-generated.test.ts` |
| H35: merge with a `_redirects` conflict resolved by E1, concluded with `git commit` | pass. Branch `e2e-side` adds `e2e-alpha` (#15) and the main branch `e2e-beta` (renumbered to #16), each committed through the hook with its regenerated `_redirects`. `git merge --no-edit e2e-side`: exit 1, `_redirects` the only unmerged path. `pnpm redirects:generate` (no conflict markers left), `git add`, then `SIMPLE_GIT_HOOKS_RC=$E/rc.sh git commit` with the unstaged `app.py` edit and the untracked file present mid-merge: exit 0, `✓ e2e-alpha`; `GIT_INDEX_FILE` `.git/index`; `HEAD` has the two parents `4709d5a` (main's tip) and `2b3e35e` (`e2e-side`), `.git/MERGE_HEAD` gone; `HEAD`'s `_redirects` has `/c/015 … e2e-alpha` and `/c/016 … e2e-beta`; files byte-identical | `git merge --no-edit e2e-side; git diff --name-only --diff-filter=U; pnpm redirects:generate && git add platform/public/_redirects && SIMPLE_GIT_HOOKS_RC=$E/rc.sh git commit -F $E/msg/10-merge.msg && git rev-list --parents -n1 HEAD && $E/check.sh $E/clone merge` |
| hook test file in the clone | pass: 103 passed | `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` |
| H29/H30 on real runs | pass. Clone: `dba3813…` listed with its id after every row and at the end. Real repository: `git stash list` empty before and after; this worktree's status unchanged, `HEAD` still `b2a12cb`, `git diff --stat b2a12cb -- scripts/` empty | `git -C <repo> stash list --format='%H %gs' \| diff - $SCRATCH/real-stash-before.txt` |
| cleanup | done. Linked worktree removed, clone deleted; no process under `$E`, no `pre-commit.sh` process, nothing listening on 4173 | `git worktree remove --force "$E/連結 worktree" && rm -rf $E/clone; pgrep -fl "$E"; pgrep -fl pre-commit.sh; lsof -tnP -iTCP:4173 -sTCP:LISTEN` |

Not covered by these rows: `--amend`'s `GIT_INDEX_FILE` on the installed hook (`rc.sh` was added
after that row; `measure.sh` and H32 measure it as `.git/index`); `-a`/`-p` inside a linked
worktree (measured by `measure.sh` only); bash 5. The ticket has no stage 8 checkbox among its
acceptance criteria, so none is ticked. What remains of stage 8 waits for the PR: its CI (bash 5,
`tests/pre-commit-sh.test.ts` on ubuntu) and the Cloudflare preview, which the parent runs after
pushing. The user mentioned turning on auto-merge; nothing of T-0035 is committed or pushed yet.

### 2026-10-23 — completeness check

Checked against the checkout, not earlier summaries. Commands run from this worktree's root (machine
date 2026-10-24, `/bin/bash` 3.2.57, git 2.54.0).

Acceptance criteria, each ticked box against the case that observes it at seam 0007-S5
(`tests/pre-commit-sh.test.ts`, `describe('pre-commit.sh: commit forms through git commit (AC-22)')`;
`grep -n "it('H3[2-8]" tests/pre-commit-sh.test.ts` lists them):

| Box | Observed by |
|---|---|
| H32 | `it('H32: git commit --amend …')`: `expectCommitO2(…, '.git/index')`, parent kept, `/c/004` rule |
| H34 | `it('H34: …')` (`expectH34({})`) and `it('H34 boundary: …')`; H45 runs `expectH34` under `/bin/bash` |
| H35 | `it('H35: …')` and `it('H35 boundary: …')`: two parents, `MERGE_HEAD` gone, O2 |
| H36 | `it('H36: git commit -p …')`: stdin `n\ny\ny\nn\n`, `expectCommitO2(…, '.git/index.lock')` |
| H37 | `it('H37: git commit -i <path> …')` and `it('H37 boundary: …')`: `.git/index.lock` |
| H38 | `it('H38: git commit in a linked worktree …')`: worktree's `--git-path index`, unstaged files and shared stash list checked, main worktree unchanged |
| H29, H30 | the file's `afterEach` (`grep -n -A12 '^afterEach' tests/pre-commit-sh.test.ts`) |
| `-p` table | stage 6 diff check above; `git diff --quiet b2a12cb -- .proj.specs/0007-gh-pages-range-fixes/traceability.md` → exit 0 (table unchanged, as the shim's record matches it) |

All eight boxes have an observing case; none was unticked. The Comments hold the test plan with its
approval line, the red → green log, the coverage report, the code review (rounds 1 and 2), the
security review and the stage 8 (local) subsection; `.proj.specs/0007-gh-pages-range-fixes/review/security-T-0035.md`
exists (190 lines). Frontmatter `status: review`.

| Command | Result |
|---|---|
| `pnpm test --run` | 130 files passed; 4473 passed, 1 skipped |
| `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` | 1 file passed; 103 passed |
| `/bin/bash -n scripts/pre-commit.sh` | exit 0 |
| `pnpm -s challenge:validate` | `All checks passed.` |
| `python3 scripts/verify-project.py` | `PASS: shared instructions, 42 skills …`, exit 0 |
| `pgrep -fl pre-commit.sh` | nothing listed (exit 1) |
| `git diff --quiet b2a12cb -- scripts/ GLOSSARY.md .proj.specs/0007-gh-pages-range-fixes/traceability.md` | exit 0 |
| `git status --short` | `M` this ticket, `tests/__helpers__/preCommitRepo.ts`, `tests/pre-commit-sh.test.ts`; `??` `.proj.specs/0007-gh-pages-range-fixes/review/security-T-0035.md` — all in scope |
| `git status --short --ignored` | the above plus the pre-existing ignored `.vitepress/wasm/`, `node_modules/`, `platform/public/challenge/`; no stray artifact |

No gaps found. Still outside this ticket's local reach, as the stage 8 subsection says: the PR's CI
(bash 5 on ubuntu) and the Cloudflare preview, which run after the parent commits and pushes; the
epic's final stage 8 is T-0039's.

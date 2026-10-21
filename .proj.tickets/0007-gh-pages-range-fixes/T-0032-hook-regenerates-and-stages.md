---
id: T-0032
title: The pre-commit hook regenerates and stages _redirects from the staged snapshot
epic: 0007-gh-pages-range-fixes
status: review
blocked_by: []
---

## Context

Today the pre-commit hook only validates staged `platform/challenge/` paths, so every challenge
change reaches CI with a stale `_redirects`. This ticket makes the hook regenerate and stage the
file. It triggers whenever a commit carries a change at a watched path: either challenge tree, or
`_redirects` itself (D5). It generates over the staged snapshot with the per-tree index slugs, and
puts the teacher's other unstaged work back byte for byte. On an index other than its own, it
refuses, so this ticket can land without the later hook tickets and still leaves `main` safe.

Spec: `traceability.md` revision 3, "The hook" (trigger, commit forms, constraints, O1–O4), the
vocabulary for index slugs and the expected `_redirects`, messages W3, W4, W5 and W8, and seam
0007-S5. S5 replaces the test's own copy of the hook with the real one.

## Deliverable

A commit that adds, translates, deletes, renames or un-retires a challenge, or hand-edits
`_redirects`, carries the expected `_redirects`. Untracked and ignored challenge directories are
left out. Every other unstaged change and untracked file under `platform/` is restored. A path
commit that triggers is refused with W8.

## Acceptance criteria

- [x] H01–H05: new challenge (two working-tree variants, no W3), Traditional Chinese brief, deletion and rename of both trees, application-only change → O2 with the expected file (AC-12)
- [x] H06: nothing at a watched path → O1 (AC-13)
- [x] H07: only `_redirects` hand-edited, through `git commit` → O2, W3; git records a commit that changes nothing (AC-12)
- [x] H08–H10, H19: untracked challenge, unstaged tracked changes, a different unstaged `_redirects` (W3 and W4), overlapping hunks → as the rows say (AC-12, AC-14)
- [x] H11: hand-edited staged `_redirects` with a challenge change → replaced, W3 (AC-12)
- [x] H12, H13, H15: validator failure → O3; Traditional Chinese number mismatch → O4 with W5; today's cases keep their statuses (AC-15)
- [x] H14: only a Traditional Chinese brief → O2, validator does not run (AC-16)
- [x] H16: bypasses are left to the guard; stage 6 confirms the guard is unchanged (AC-17)
- [x] H18, H20, H23, H24, H40, H43: missing `_redirects`; ignored directory; un-retire; type change to a symbolic link; only the brief deleted; unstaged number edit → as the rows say (AC-12)
- [x] H29, H30: the pre-existing stash entry kept; the real repository's `_redirects`, index and stash list unchanged (AC-23)
- [x] H31: `git commit -a` after a `create:challenge`-like change → expected file without the untracked rule, W3 and W4 (AC-22)
- [x] H33: `git commit -- <path>` and `--only <path>` → exit 1, W8, nothing changed, no commit (AC-22)
- [x] H44: a range whose committed `_redirects` has the pre-0007 header → O2 with the new header (AC-22)
- [x] P6: the hook's header comment and the generator's `includeSlug` comment describe the watched paths, the index-slug rule, D3 and the unchanged `ACMRD` filter (AC-24). The D12 sentence that traceability P6 also asks for lands with T-0033

- [x] G01 at stage 6: the guard test's assertion, inclusion rule and CI steps unchanged; `includeSlug`'s new locale argument leaves the guard's call unchanged (AC-17)
- [ ] Stage 8: V03 as far as this ticket's change reaches (AC-20)

## 給使用者（zh-TW）

pre-commit hook 會在 commit 帶有題目變更、或帶有 `_redirects` 本身的變更時，依 staged 的內容重新產生並 stage `_redirects`。未追蹤、被忽略的目錄不會算進去，其他尚未 commit 的工作會原樣還原。帶路徑的 commit（`git commit -- <path>`）在這種情況下會被拒絕，並說明改用 stage 後再 commit。孤兒說明頁、中斷與還原失敗分別由 T-0033、T-0034 處理。

## Comments

### 2026-10-21 — test plan (stage 5)

Seam 0007-S5, in `tests/pre-commit-sh.test.ts`; its fixture builder may move to a helper under
`tests/__helpers__/` for T-0033 to T-0035 to reuse. Every case runs the real `scripts/pre-commit.sh`
of this checkout, by its absolute path, with `bash` at the top level of
`<mkdtemp>/暫存 repo`: directly, or through a real `git commit` whose installed
`.git/hooks/pre-commit` runs that file, as `simple-git-hooks` does. Child processes get the test's
environment with every inherited `GIT_*` variable removed, `HOME` set to a temporary directory and
`GIT_CONFIG_GLOBAL` set to a temporary file holding the identity. `core.quotePath` is left at git's
default.

The fixture (S5) has these parts:

- `platform/challenge/test-chall/` is today's fixture challenge, #1, English only.
- `platform/challenge/door/` (#2) has a Traditional Chinese brief at `platform/zh-TW/challenge/door/`.
- `.archive/challenge/old-chall/` (#3) is a valid retired challenge.
- `platform/public/` holds the committed `_redirects`, which matches the tree, and one other file.
- Copies of the scripts the hook calls, and the `.vitepress/challenge/` modules they import, are committed.
- A `node_modules` link to this checkout's packages is excluded through `.git/info/exclude`: the `node_modules/` pattern does not match a link.
- A `.gitignore` holds `logs/` and `tmp/`.
- One stash entry is made before the run. It changes `platform/public/` files, so applying or dropping it by mistake shows in the byte comparison.

The oracle for "the expected `_redirects`" is `generateRedirects` from this checkout. It runs over
`git checkout-index --all --prefix=<outside dir>/`, taken after the case has staged its change and
before the hook runs. Each case also asserts its literal rule lines, so the oracle never repeats
the hook's method.

Each outcome asserts the same things in every case:

- O1: exit 0, and the index, every working-tree byte and `git stash list` (with commit ids) are unchanged.
- O2: exit 0. The index is unchanged except `:platform/public/_redirects`, which is the expected one.
- O2: every working-tree file other than `_redirects` is byte-identical, `.git` excluded. That covers files outside `platform/`, and symbolic links compared by target.
- O2: the untracked lines of `git status --porcelain=v1 --untracked-files=all` are unchanged, the working tree's `_redirects` equals the staged one (D3), and `git stash list` is unchanged.
- O3 and O4: the given exit status, and the O1 checks with `_redirects` included.
- Only where a row says so: W3 and W4 must be present. Elsewhere they must be absent.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S5 harness, every case | H29: the pre-existing entry is still listed with its commit id. H30: this checkout's `platform/public/_redirects` bytes, `git ls-files --stage` and `git stash list` are equal before and after each case | test harness (fixture builder, snapshot and compare helpers) | AC-23 (H29, H30) | the path holds a space and `暫存 repo`. The pre-existing entry would visibly change files if it were applied. macOS's temporary directory is reached through `/var` → `/private/var`, so git reports physical paths. `bash` on this Mac is `/bin/bash` 3.2.57, so every case runs under 3.2 here and under bash 5 in CI |
| S5 direct run | H15 + H12: today's seven cases against the real hook, each with today's status, plus its outcome's snapshot. The statuses are README only → 0 (O1); valid `index.md` edit → 0 (O2); `git rm` of `flag.txt` → 1 (O3); `git rm` of `app.py` → 1 (O3); staged snapshot without `flag.txt`, which is on disk and untracked → 1 (O3, the flag still untracked and byte-identical); `git rm -r` of the whole challenge → 0 (O2, its rule gone); `git rm` of only `index.md` → 1 (O3) | hook, validator | AC-15 (H12, H15) | an O3 case with an unstaged hand edit of `_redirects` in the working tree, whose bytes are kept, from the constraint that the working tree's `_redirects` bytes are put back. Removing `test-chall` leaves `door` and the retired challenge, so the numbered section stays |
| S5 direct run | H06: O1 when nothing at a watched path is staged | hook trigger | AC-13 (H06) | only `README.md` staged. Only `platform/public/<other file>` staged (under `platform/`, not watched). Unstaged and untracked challenge files present in both cases, and left alone |
| S5 direct run | H01: a new complete challenge `new-chall` (#4) is staged. O2, and the staged `_redirects` gains `/c/004 → /challenge/new-chall/` | hook, generator | AC-12 (H01) | the working tree's `_redirects` is `HEAD`'s. Then again with it already the expected one, as after `pnpm dev`. No W3 in either |
| S5 direct run, recording validator | H02 + H14: only a Traditional Chinese brief `platform/zh-TW/challenge/test-chall/index.md` is staged. O2, the file gains `/zh/c/001`, and the validator is never invoked. The validator copy is renamed, and a stub at its path appends its argv to a log outside the repository, then runs the renamed copy with the same arguments | hook validator gate | AC-12 (H02), AC-16 (H14) | the brief's directory holds only `index.md` |
| S5 direct run | H03, H04, H40: `door` deleted in both trees with `git rm -r` loses `/c/002` and `/zh/c/002`. Renamed in both trees with `git mv` to `gate`, both rules point at `gate`. Only its brief deleted, `/zh/c/002` goes and `/c/002` stays | hook, generator | AC-12 (H03, H04, H40) | the rename keeps numbers. The validator receives the renamed paths and passes |
| S5 direct run, recording validator | H05, H43, H24: the staged `_redirects` keeps `HEAD`'s bytes when there is an application-only change (`door/src/app.py`) or an unstaged number edit (`test-chall/index.md` → 7, unused) with another challenge's application file staged. The unstaged number is back afterwards. The same holds when `test-chall/index.md` changes in type, to a link to `brief.md`, which holds the same bytes and is staged: the validator's argv holds `brief.md` and not `index.md` | hook trigger (type change), validator filter `ACMRD` | AC-12 (H05, H24, H43) | the type change triggers without being validated. The link is followed. H24 needs a filesystem with symbolic links (macOS, CI's ubuntu) |
| S5 direct run | H23: un-retiring with `git mv .archive/challenge/old-chall platform/challenge/old-chall` brings `/c/003` back | hook, generator | AC-12 (H23) | the validator receives the moved paths and passes |
| S5 direct run | H18: `HEAD` holds no `_redirects` (a setup commit removes it), `platform/public/` keeps its other file, and a challenge change is staged. O2, and `git diff --cached --name-status` shows `A platform/public/_redirects` | hook, staging | AC-12 (H18) | no W3: the absent version is `HEAD`'s |
| S5 direct run | H20: an ignored `platform/challenge/logs/index.md` carries number 2, the same as `door`, so counting it would make generation refuse. A challenge change is staged. O2, with no rule for `logs` | hook index slugs | AC-12 (H20) | per tree: `platform/challenge/tmp/`, a valid #6 committed with `git add -f`, and an ignored `platform/zh-TW/challenge/tmp/index.md` #6. `/c/006` is present and `/zh/c/006` absent, because a page counts only when its own tree lists its slug. This needs `includeSlug`'s locale argument |
| S5 `git commit` | H07: only `_redirects` is hand-edited and staged, then committed with `git commit -m`. O2, W3 (`platform/public/_redirects`, `replaced`), and the new commit's tree equals its parent's | hook trigger (D5), installed hook | AC-12 (H07) | git hands `GIT_INDEX_FILE=.git/index` (relative), which counts as the hook's own index |
| S5 direct run | H11: a hand-edited `_redirects` is staged with a challenge change, while other files under `platform/` are unstaged. The staged `_redirects` is replaced with the expected one, with W3, and the unstaged files are byte-identical | hook | AC-12 (H11) | the working tree's `_redirects` holds the same hand edit and ends equal to the staged one |
| S5 direct run | H08 + H09: an untracked challenge `draft` (#5, complete), and unstaged changes to tracked files under `platform/`, are alongside a staged change to `door`. The staged `_redirects` leaves `draft` out. `draft` and every unstaged file are byte-identical, and `draft` is still untracked. No W3 or W4 | hook stash and restore | AC-12 (H08), AC-14 (H08, H09) | the unstaged files include `test-chall/src/app.py`, the other file in `platform/public/`, a file with CRLF and no final newline, a binary file, and names with a space and non-ASCII characters. Untracked files sit under `platform/` outside the watched trees, and outside `platform/` |
| S5 direct run | H10: as after `pnpm dev`, the working tree's `_redirects` holds `draft`'s rule, while `draft` is untracked and a challenge change is staged. O2. The working tree's `_redirects` equals the staged one (D3). W3, and W4 naming `platform/challenge/draft/` and `git add`. `draft` is byte-identical and untracked | hook (D3, W3, W4) | AC-14 (H10) | an untracked directory in the Traditional Chinese tree is named by W4 too. Ignored directories are not named (open point) |
| S5 direct run | H19: `door/src/app.py` has a staged hunk and an unstaged change that overlaps it. O2. The file's working-tree bytes equal its unstaged content from before, and its index entry is unchanged | hook restore | AC-14 (H19) | the overlap is on the same line, where `stash pop` after `--keep-index` conflicts |
| S5 direct run | H13: a staged Traditional Chinese brief carries number 9, while its English page carries 2. O4: exit 1, W5 (the generator's message, "carries different numbers across locale trees"), and everything as before | hook generation failure | AC-15 (H13) | the validator does not run (no `platform/challenge/` path). An unstaged hand edit of `_redirects` is kept |
| S5 `git commit -a` | H31: after a change like `create:challenge`'s (untracked complete `draft` #4, tracked `_redirects` modified to hold `/c/004`), run `git commit -a -m`. The commit's `_redirects` is the expected one, without `/c/004`. W3, and W4 naming `platform/challenge/draft/`. `draft` is untracked and byte-identical. The working tree's `_redirects` equals the committed one | hook on `index.lock` | AC-22 (H31) | git hands an absolute `GIT_INDEX_FILE=<gitdir>/index.lock`, physical path, which counts as the hook's own index |
| S5 `git commit` and direct run | H33 and the commit-forms constraint: `git commit -m x -- door/src/app.py`, then `--only door/src/app.py`, with the file modified. Exit 1 with W8 (`git add`, `git commit`, `staging`). `HEAD` is unchanged, as are `git ls-files --stage` of `.git/index`, every working-tree byte and `git stash list` | hook commit-forms predicate | AC-22 (H33) | `git commit -- README.md`, which does not trigger, still commits (O1 on another index). A direct run with `GIT_INDEX_FILE` set by the test to a copy of the index outside `.git` refuses when it triggers. The same run with `GIT_INDEX_FILE=.git/index` (relative) is the hook's own index. The own-index path is computed with `GIT_INDEX_FILE` removed (open point) |
| S5 `git commit` | H44: the fixture's committed `_redirects` carries the generator header of `a54e917`, as a literal, and a challenge change is staged and committed. The commit's `_redirects` is the expected one, with the current generator's header | hook, generator | AC-22 (H44) | until T-0039 changes the header (G02), the two headers are equal, so this case only bites from then on (open point) |
| S5 direct run, recording generator | constraint "`_redirects` never enters the hook's stash" and "an entry of its own only when `refs/stash` changed". A generator wrapper records `git stash list` while it runs. The one new entry's working-tree, index and untracked commits hold the other unstaged files and no `platform/public/_redirects`. After O2 the new entry is gone and the pre-existing one is untouched | hook stash | AC-23 constraint (B2); the H42 case of a push that saves nothing is T-0034's | `_redirects` both staged with one edit and unstaged with another, alongside unstaged files |
| stage 6, diff check | "drop only after restore": in the hook's text, the drop follows a completed restore and nothing else drops or applies another entry. The failure order is tested by T-0034 (H26, H47) | hook source | AC-23 constraint | not run automatically in this ticket: success shows only the end state |
| stage 6, diff check | H16 and G01: no hook test for bypasses. `git diff a54e917 -- tests/unit/site/redirects-generated.test.ts .github/` is empty. The guard's `includeSlug: (s) => tracked.has(s)` call is unchanged, and `includeSlug`'s new locale argument is optional to its callers | guard and CI | AC-17 (H16, G01) | checked on the diff, not run as an experiment (H16) |
| stage 6, diff check | P6: the hook's header comment and the generator's header and `includeSlug` comment describe the watched paths, the per-tree index-slug rule, D3, and that the validator's filter stays `ACMRD` while a type change only triggers regeneration. D12's sentence is T-0033's | comments | AC-24 (P6) | — |
| stage 8, S7 | V03 as far as this ticket reaches: in a temporary local clone of this branch, never pushed, run `pnpm install`, `pnpm create:challenge --backend php`, `git add` of the challenge, and `git commit` through `/tw-emoji-commit`. The commit holds the expected `_redirects`, the guard test passes on it, and nothing touches `_redirects` by hand. The ticket PR's CI passes | the whole flow | AC-20 (V03) | needs Rust for keygen. Without T-0030, `create:challenge` leaves `_redirects` alone, so only the hook makes it right |

Approval: The user approved this test plan in advance on 2026-10-21 with the standing instruction "所有的都按照你的建議執行、實踐" (follow and carry out every recommendation), given together with "/implement 完成 T-0030-T-0032 T-0036".

### 2026-10-21 — open points resolved (stage 5)

Each point the planner raised, with the reading chosen and why. Where the spec decides, it is
followed; where it does not, the reading kept is the one that leaves every other row true. "Mutation"
means the named rows were rerun with the hook or generator edited as described, then the file put back
(`cmp` against a saved copy); each such run is reproducible by applying the same edit and running
`pnpm vitest run tests/pre-commit-sh.test.ts -t "<rows>"`.

1. **The own-index path is asked for with `GIT_INDEX_FILE` removed** (`own=$(unset GIT_INDEX_FILE;
   git rev-parse --git-path index)`, `scripts/pre-commit.sh` `on_own_index`). Asked naively, git
   answers with the variable itself and every path commit would count as own, so H33 could never
   refuse. Mutation (the naive call) fails H33 three times (`-- <path>`, `--only`, the direct run on an
   index copy). The traceability text ("names the same file as `git rev-parse --git-path index`")
   should say so in a later revision; this ticket does not edit the spec.
2. **Both paths are compared physically**: the directory through `cd … && pwd -P`, plus the basename,
   since `index.lock` may not exist yet. Mutation (comparing the strings as given) fails H31, where git
   hands `/private/var/…/index.lock` while `--git-path` gives `.git/index`.
3. **Environment**: every inherited `GIT_*` variable is removed, then the test sets its own
   `GIT_CONFIG_GLOBAL` (the identity file) and `GIT_CONFIG_NOSYSTEM=1`
   (`tests/__helpers__/preCommitRepo.ts` `isolatedEnv`). H33's two direct-run boundaries set
   `GIT_INDEX_FILE` as their input.
4. **W4 names each wholly untracked directory directly under either watched tree**
   (`platform/challenge/<name>/`, `platform/zh-TW/challenge/<name>/`), from
   `git ls-files --others --exclude-standard --directory --no-empty-directory`. Ignored directories
   are not named (H10 asserts an ignored `logs/` is not mentioned), nor is an untracked directory
   nested inside a tracked challenge.
5. **H09 is paired with a staged challenge change**, so it runs as O2 together with H08. H06 covers
   unstaged and untracked files under O1.
6. **H44's fixture commits a54e917's header as a literal** (`A54E917_HEADER` in the test). Until
   T-0039 changes the header (G02) the two are equal, so the setup commit is made with
   `--allow-empty` and the case only bites from then on.
7. **bash 3.2**: `bash` here resolves to `/bin/bash` 3.2.57, so every case of this ticket ran under
   3.2 (`node -e "…spawnSync('bash',['-c','command -v bash; echo $BASH_VERSION'])…"` printed
   `/bin/bash` and `3.2.57(1)-release`). bash 5 runs only in CI's ubuntu. H45's comparison stays
   T-0034's.
8. **W3 and an absent `_redirects`**: absence is a version, and it counts as `HEAD`'s only when `HEAD`
   has no `_redirects` either. So H18 (no file in `HEAD`, none staged) prints no W3, and a staged
   `git rm` of the file `HEAD` holds is the teacher's version: the hook stages the expected file and
   prints W3. Added as the case "H11 boundary: a staged deletion of the _redirects HEAD holds is
   replaced too, with W3" (AC-12, at S5).
9. **H30 is compared per case**: `realRepoState()` in `beforeEach`, compared in `afterEach`, so
   stash activity in a sibling worktree between cases does not count (B2 puts it outside the model).
10. **H24 and H23 under the real validator**: both pass. The recording validator delegates to the
    real copy, and the real validator accepts a challenge whose `index.md` is a link to an added
    `brief.md`, and the un-retired `old-chall`. No spec conflict.
11. **P6's D12 sentence** is left to T-0033.

Decisions of my own, beyond the planner's points:

- **The hook restores without `git stash pop`.** Tracked files come from the entry's working-tree
  commit (`git restore --source=<entry> --worktree -- platform/ ':(exclude)platform/public/_redirects'`),
  and untracked files from its third parent through a temporary index (`read-tree` +
  `checkout-index`). Neither touches the index. `pop` after `--keep-index` conflicts on overlapping
  hunks. Mutation (in `finish`, `if restore_entry; then drop_entry` replaced by
  `if git stash pop --quiet; then :`) fails H19 and H11; rerun at stage 6 as M3 below.
- **A file staged as new and then deleted from the working tree** is not recorded by `git stash`
  (its working-tree commit keeps the index version; measured with git 2.54.0). The hook lists such
  files before stashing and removes them again after the restore. Covered inside H08+H09; mutation
  (skipping the removal) fails that case, rerun at stage 6 as M4. The measurement, rerun at stage 6
  in a new temporary repository:
  `d=$(mktemp -d) && cd "$d" && git init -q r && cd r && git -c user.name=t -c user.email=t@e commit -q --allow-empty -m init && echo staged > new.txt && git add new.txt && unlink new.txt && git -c user.name=t -c user.email=t@e stash push -q --keep-index --include-untracked && git ls-tree -r --name-only 'stash@{0}' && git diff --name-status 'stash@{0}^2' 'stash@{0}' && ls`
  printed `new.txt` (the entry's working-tree commit holds the index version), an empty diff
  between the entry's index and working-tree commits, and `new.txt` back in the working tree.
- **The validator's arguments are read NUL-separated** (`git diff --cached --name-only -z
  --diff-filter=ACMRD`), so non-ASCII paths reach it unquoted under the default `core.quotePath`.
  The filter is unchanged.
- **The generator's hook entry** is `node --experimental-strip-types scripts/generate-redirects.ts
  --staged --root <top level>`. It prints the file to stdout, restricted to `indexSlugs(root)`
  (per tree, `<tree>/<slug>/index.md` in the index git hands it). The hook writes and stages it only
  after that exit 0. Without flags the script behaves as before.
- **A failed restore keeps the entry** and prints its id with `git stash apply <id>`. This is the
  minimum restore safety needs; W9's wording, O7 and their tests (H26) stay T-0034's.
- **Not handled here, as scoped:** no `HEAD` with unstaged files (O6, W7) fails at `git stash push`
  before any change, with git's own message; T-0034 adds W7. No signal handling beyond the `EXIT`
  trap; T-0034 adds that.
- **Line endings** (superseded at stage 6): this repository's `.gitattributes` holds
  `* text=auto eol=lf`, so git stores a stashed CRLF file with LF and writes it back with LF. The
  stage 5 fixture had no `.gitattributes`, so H09 could not see it. Stage 6 gave the fixture this
  checkout's `.gitattributes`, H09 went red, and the hook now puts every stashed regular file back
  from a raw copy (see the stage 6 entry).

### 2026-10-21 — coverage report (stage 5)

`@vitest/coverage-v8` is not installed (`pnpm vitest run --coverage
--coverage.include=scripts/generate-redirects.ts tests/pre-commit-sh.test.ts
tests/unit/site/redirects-generated.test.ts` printed "MISSING DEPENDENCY Cannot find dependency
'@vitest/coverage-v8'"), and none was installed. Line coverage would not reach the changed code anyway:
the hook is bash, and the generator's `--staged` entry and `indexSlugs` run in the hook's child
process. "Measured coverage" below is therefore the hook's branches each row drives, confirmed by
the red runs and mutations recorded above and in the stage 6 entry. Against `a54e917`'s hook,
swapped in and put back (M7 in the stage 6 entry), 25 of the 37 cases fail; the 12 that pass are
today's six cases other than `git rm -r`, H06 ×2, H05, H43, H24 and H33's `-- README.md`, which
that hook already satisfies. Updated 2026-10-22: the file now has 42 cases, and M7 rerun gives
30 failed | 12 passed (the five new cases fail on that hook too; see the 2026-10-22 entry).

| Seam | Tests (`tests/pre-commit-sh.test.ts`) | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S5 harness | `afterEach` of every case | H29 and H30 asserted in all 44 cases (37 before 2026-10-22, 42 before round 2, 43 before round 3); the fixture carries this checkout's `.gitattributes` (`* text=auto eol=lf`) since stage 6 | AC-23 (H29, H30) | — |
| S5 direct run | "today’s cases (H15)", 7 cases | trigger; validator failure exit (O3) ×5 with nothing changed, `_redirects` hand edit kept; O2 ×2 | AC-15 (H12, H15) | — |
| S5 direct run | "trigger (H06)", 2 cases | the not-triggered exit (O1) with unstaged and untracked challenge files | AC-13 | — |
| S5 direct run | H01 ×2, H02/H14, H03, H04, H40, H05, H43, H24, H23, H18, H20 | generation over the staged snapshot; per-tree index slugs; validator skipped with no `platform/challenge/` path; `ACMRD` with a type change; `_redirects` added | AC-12, AC-16 | — |
| S5 `git commit`, direct run | H07, H11, H11 boundary, H08+H09, H09 "a file the index adds where HEAD has a directory …", H09 "under core.safecrlf true …", H10, H19, H13 | W3 from the index's and the working tree's version; W4 per watched tree, ignored not named; restore of tracked, untracked, deleted and staged-then-deleted files; overlap; generation failure (O4) with W5; since stage 6, the raw-copy restore of a tracked and an untracked CRLF file under `eol=lf` (H09), and the full O2 checks in H18 and H11 boundary; since 2026-10-22, literal rule lines (`FIXTURE_RULES`) in H07, H11 and H19, and the removal of a staged-then-deleted file by git (H08+H09, M4); since round 2 of 2026-10-22, `FIXTURE_RULES` in H18, H11 boundary, H08+H09 and H10 too, a staged-then-deleted `a*.txt` read as a literal path (H08+H09, MG), and a deleted file the index adds over `HEAD`'s directory (H09, D/F); since round 3, the stash push under `core.safecrlf true` with a tracked and an untracked CRLF file (M12), and `FIXTURE_RULES` in "exits 0 when valid challenge files are staged" | AC-12, AC-14, AC-15 | — |
| S5 `git commit -a`, path commits, direct run | H31, H31 with `CDPATH` exported, H33 ×5 (`--`, `--only`, `-- README.md`, index copy, `.git/index`), H44 | the commit-forms predicate on relative, absolute-physical and foreign index paths, also with `CDPATH=.:<dir holding .git>`; W8; since round 3, `FIXTURE_RULES` in H31 | AC-22 | H44 cannot tell the headers apart until T-0039 (point 6) |
| S5 recording generator | "the hook’s stash entry" | the one new entry's index, working-tree and untracked commits; drop by id after restore; the teacher's entry untouched; since 2026-10-22, its literal rule lines | AC-23 constraint (B2) | a push that saves nothing (H42) is T-0034's |
| S5 direct run (2026-10-22) | "S2: newly staged files behind a directory replaced by a link …" | the deletion list limited to paths `HEAD` does not hold as a file (round 2: a directory there counts as lacking); the restore's link check, which skips and names the path on stderr; git's own refusal to remove beyond a link (M8, M9) | B2 "writes no working-tree file outside `platform/`" (AC-23 constraint) | the same check on the raw-copy put-back is not driven: within B2's model git never lists a path behind a link there (see the 2026-10-22 entry) |
| S5 direct run (2026-10-22) | "GIT_LITERAL_PATHSPECS=1 …", "GIT_GLOB_PATHSPECS=1 …", "GIT_NOGLOB_PATHSPECS=1 …", "GIT_ICASE_PATHSPECS=1 …" | the hook's pathspecs read with git's defaults, so `_redirects` stays out of the stash (D3); O2 under each variable (M10); since round 3, a staged-then-deleted file in each, so the removal step runs (M10 rerun: LITERAL, GLOB and ICASE red) | AC-23 constraint (B2), D3 | `GIT_NOGLOB_PATHSPECS` stays green with its `unset` removed: git reads noglob as adding literal, which the removal step's literal setting does not conflict with, and no hook pathspec holds a wildcard (round 3, item 2) |
| hook failure paths | none in this ticket | the `WROTE`/`STAGED` put-back of `_redirects` and the kept-entry branch of `finish` are not driven by any case | AC-23 | they need a failing `git add` or restore (H26) or a signal (H25): T-0034 |
| stage 6 | — | not run | AC-17 (H16, G01), AC-24 (P6, ticked on 2026-10-22; D12's sentence is T-0033's), "drop only after restore" | stage 6. Pre-check for the record: `git diff a54e917 -- tests/unit/site/redirects-generated.test.ts .github/ \| wc -l` printed `0`, and the guard's `includeSlug: (s) => tracked.has(s)` is unchanged |
| stage 8 | — | not run | AC-20 (V03) | stage 8, needs Rust |

Commands and results:

- Stage 6 final state: `pnpm vitest run tests/pre-commit-sh.test.ts` → 37 passed;
  `pnpm test --run` → 127 files passed; 4233 passed, 1 skipped, in each of two runs;
  `pnpm challenge:validate` → "All checks passed."; `/bin/bash -n scripts/pre-commit.sh` → exit 0.
  The stage 5 results follow.
- `pnpm vitest run tests/pre-commit-sh.test.ts` → 36 passed.
- `pnpm test --run`, final state (36 cases in this file) → 127 files passed; 4232 passed, 1 skipped,
  in each of three consecutive runs. The baseline on `a54e917` was 4203 passed, 1 skipped; this file
  went from 7 cases to 36. One earlier full run with the final files, which took 135 s on a loaded
  machine, reported "1 failed | 4231 passed". Its output was not kept, so the failing test is
  unknown, and it did not recur.
- `pnpm challenge:validate` → "All checks passed."
- `/bin/bash -n scripts/pre-commit.sh` → no output, exit 0.
- `pnpm exec vue-tsc --noEmit` → exit 2 with 105 errors, all present before this ticket. The only one
  in a changed file is `scripts/generate-redirects.ts`'s existing `./challenge-numbers.ts` import
  (TS5097), which `git show a54e917:scripts/generate-redirects.ts | grep -n challenge-numbers.ts`
  shows at line 24 there. No typecheck runs in CI or `package.json`.

### 2026-10-21 — code review (stage 6)

Three axes (Spec, Standards, Security), each candidate checked by three skeptics; a finding stands
when at least two of them confirm it. Security candidates are in the stage 7 entry.

Confirmed, and what was done:

1. **Standards — `withoutPaths`'s comment described a predicate** (`tests/__helpers__/preCommitRepo.ts`).
   Fixed: it now says the function returns a copy of the byte map without the given paths.
2. **Standards — `realRepoState`'s comment said the developer's global configuration was kept out,
   while the code read it.** Fixed in the code, so that the comment is true: H30's reads now run with
   `HOME` set to the temporary directory and `GIT_CONFIG_GLOBAL=/dev/null` (system configuration and
   inherited `GIT_*` variables were already out).
3. **Standards — `challengeIndexWithNumber` duplicated the helper's `challengeIndex`.** Fixed: H20
   uses `challengeIndex`, and the copy is gone.
4. **Standards — verification claims without a command** (the swap of `a54e917`'s hook, the stash
   measurement, the CRLF observation, the `git stash pop` mutation). Fixed: the stash measurement now
   carries its command in the stage 5 entry; the mutations and the `a54e917` swap were rerun on the
   final files and are listed below as M1–M7; the CRLF observation was replaced by finding 5's fix.
5. **Spec — under the repository's `* text=auto eol=lf`, a stashed CRLF file came back with LF,
   against O2 and B2's byte for byte.** Fixed test-first. The fixture now carries this checkout's
   `.gitattributes`, and H09 also holds an untracked CRLF file. Red: `pnpm vitest run
   tests/pre-commit-sh.test.ts` → 2 failed | 35 passed, H08+H09 failing on the byte map (the other
   failure is finding 8's new case). Fix (`scripts/pre-commit.sh`): before the push, every regular
   file the stash takes (`git diff -z --name-only --diff-filter=MT` and the untracked list, under
   `platform/` without `_redirects`) is copied raw into `$WORK/raw`, and `restore_entry` copies them
   back after git's restore. The push runs with `-c core.safecrlf=false`, so git neither warns about
   the conversion the copy undoes nor refuses it when the setting is `true`. Side effects checked: the
   stash itself is unchanged, so a file git does not take (an unchanged file, an LFS file) is not
   touched; symbolic links are not copied, and git never lists a path beyond one.
6. **Spec — H18 and H11 boundary skipped part of O2.** Fixed: both call `expectO2`, which already
   handles a `before` without `_redirects`; H18 keeps its `A` name-status check, H11 boundary its W3.
7. **Spec — the `a54e917` swap had no command.** Same as 4: M7 below.
8. **Security — an exported `CDPATH` sent `physical_path`'s `cd` elsewhere, so `git commit -a` was
   refused with W8.** Fixed test-first. New case "H31 with CDPATH exported"
   (`CDPATH=.:<a directory holding .git>`), red with exit 1 and W8; fix `CDPATH= cd -- …`.

Rejected by the skeptics (not acted on), with the reason each was given:

- Standards: H44 cannot fail on this ticket (it fails on `a54e917`'s hook and bites from T-0039; the
  limit was recorded three times); the oracle shares `generateRedirects` (it takes its input another
  way, and the rows it backs are not about rule generation); tests coupled to the stash's parents
  (the entry is part of the spec's contract, O7/W9); `readRecord` swallows errors (ENOENT is the
  expected state, and the positive cases prove the log path); `afterEach` leaks the temporary
  repository on failure (no documented standard; only when H29/H30 fail); the header's "byte for
  byte" (it quotes B2; fixed in substance by finding 5); bash variable casing, `teachers()`'s name,
  `drop_entry`'s silence, the two trees named in the hook, `--staged`'s name, `parseArgs` outside the
  `try`, `D3` in comments, the generator header's length, `indexSlugs`/`rulesOf` duplicating the
  guard's helpers, primitive types, `COPIED_FILES`, `gitRun`/`runHook` and the flag argument (style
  or required by P6/G01); P6 unticked (it is checked at stage 6 and D12's sentence is T-0033's);
  horizontal slicing (the record does not show it); the approval given in advance (the user's own
  standing instruction).
- Spec: `_redirects` in the entry's tree (the constraint means its versions stay out of the restore,
  and the test asserts that); the header's sentence on exits where the index's `_redirects` did not
  change (it repeats `traceability.md` line 268); H44 ticked (the implementation meets the row);
  W4 names only directories directly under a tree (the rows name the challenge directory); W3 compares
  normalized blobs (git's own notion of a version under `eol=lf`); W3 and an absent `_redirects` with
  no `HEAD` (H27/H28 are T-0034's); the kept-entry branch of `finish` (required by the constraint;
  W9/O7/H26 are T-0034's); strict `parseArgs` (no caller passes another flag); small plan
  differences (equivalent); bash 5 unverified (H45 is T-0034's, CI runs bash 5); the unexplained
  failed run (disclosed, not a verification claim); paths relative to the working directory (git runs
  hooks at the top level).
- Residuals the skeptics left to the user, not changed here: the test plan's sentence "Each case also
  asserts its literal rule lines" does not hold for H07, H11, H19 and the stash case, which compare
  with the oracle or `HEAD`'s bytes only; `GIT_LITERAL_PATHSPECS=1` in the environment would make
  `:(exclude)` literal, so `_redirects` could enter the stash (raised by the security reviewer as a
  correctness question).

Mutations, rerun on the final files. Each: `cp scripts/pre-commit.sh <saved>`, apply the edit with
`perl -0pi -e '<edit>' scripts/pre-commit.sh`, run `pnpm vitest run tests/pre-commit-sh.test.ts -t
'<rows>'`, then `cp <saved> scripts/pre-commit.sh && cmp scripts/pre-commit.sh <saved>`:

- M1, naive own-index path: `s/own=\$\(unset GIT_INDEX_FILE; git rev-parse/own=\$(git rev-parse/`,
  rows `H33` → 3 failed | 2 passed (the `--`, `--only` and index-copy cases fail).
- M2, strings compared as given: `s/  own=\$\(physical_path "\$own"\) \|\| return 1\n//;
  s/given=\$\(physical_path "\$GIT_INDEX_FILE"\) \|\| return 1/given=\$GIT_INDEX_FILE/`, rows `H31`
  → 2 failed.
- M3, restore by `git stash pop`: `s/if restore_entry; then\n      drop_entry/if git stash pop
  --quiet; then\n      :/`, rows `H19|H11` → 2 failed | 1 passed (H19 and H11 fail; H11 boundary
  has no unstaged work).
- M4, no removal of staged-then-deleted files: `s/rm -f -- "\$path" \|\| return 1/:/`, rows
  `H08, H09` → 1 failed.
- M5, no raw copy back: `s/cp -p -- "\$WORK\/raw\/\$path" "\$path" \|\| return 1/:/`, rows
  `H08, H09` → 1 failed.
- M6, `CDPATH` not cleared: `s/CDPATH= cd -- /cd /`, rows `CDPATH` → 1 failed.
- M7, `a54e917`'s hook: `git show a54e917:scripts/pre-commit.sh > scripts/pre-commit.sh`, whole
  file → 25 failed | 12 passed. Passing: today's six cases other than `git rm -r`, H06 ×2, H05, H43,
  H24 and `git commit -- README.md`.

Commands rerun, with results:

- `pnpm vitest run tests/pre-commit-sh.test.ts` → 37 passed.
- `pnpm test --run` → 127 files passed; 4233 passed, 1 skipped, in each of two runs.
- `pnpm challenge:validate` → "All checks passed."
- `/bin/bash -n scripts/pre-commit.sh` → exit 0.
- `git diff a54e917 -- tests/unit/site/redirects-generated.test.ts .github/ | wc -l` → `0` (G01, H16):
  the guard's assertion, its `includeSlug: (s) => tracked.has(s)` call and the CI steps are
  unchanged, so H16 and G01 are ticked. P6 stays unticked: D12's sentence is T-0033's.

### 2026-10-21 — security review (stage 7)

Report: [`review/security-T-0032.md`](../../.proj.specs/0007-gh-pages-range-fixes/review/security-T-0032.md).

- S1, `CDPATH` in `physical_path` (low): confirmed 2/3, fixed as stage 6 finding 8.
- S2, `restore_entry`'s `rm` through a symbolically linked parent (medium): confirmed 1/3, so
  rejected and not changed. The reviewer's own scenario (a file in `HEAD`) stops at `git stash
  push` ("beyond a symbolic link"). The variant two skeptics raised was reproduced at stage 7 by
  replaying the hook's git commands with git 2.54.0: a newly staged `platform/challenge/x/src/app.py`
  whose `src/` was replaced by a link to an outside directory lands in the deletion list, the push
  succeeds, the restore brings the link back, and the `rm` deletes the outside `app.py`. Left open
  for the user to decide; the report gives the fix (keep only D entries the index has and `HEAD`
  does not, or refuse a path whose parent is a link) and the test to add.
- S3 `cp` follows a linked `_redirects`, S4 W4 prints raw names, S5 slug grammar in `--staged`,
  S6 a push that fails after writing its entry, S7 the test helper's shell interpolation: 0/3 each,
  rejected; the reasons are in the report. S6 is forwarded to T-0034.
- The stage 6 raw-copy code was checked for new writes: paths come NUL-separated from git, only
  regular files are copied, and writes go only to `$WORK` and the same paths.

### 2026-10-21 — end-to-end (stage 8, local)

Surface for every row: a temporary local clone of this repository (never pushed, origin removed),
on a throwaway branch at `a54e917` carrying this checkout's pending changes, with the hook that
`simple-git-hooks` installed (`.git/hooks/pre-commit` → `bash scripts/pre-commit.sh`), run through
real `git commit` invocations in a shell, with `/bin/bash` 3.2.57. This is the teacher's command-line
surface; the hook has no browser part. The Cloudflare preview and the ticket PR's CI are not covered
here. Every commit message, including the throwaway ones, was drafted per
`.claude/skills/tw-emoji-commit/SKILL.md`, sanitized with its `scripts/sanitize_commit.py` and passed
with `git commit -F`.

Setup (`$S` a scratch directory, `$W` this checkout):

```sh
git -C <repo> stash list > $S/real-stash-before.txt   # empty
git clone -q --no-hardlinks <repo> $S/clone && cd $S/clone && git remote remove origin
git checkout -q -b e2e/T-0032-throwaway a54e917
git -C $W diff --binary a54e917 | git apply   # then copy $W's untracked files (git ls-files --others --exclude-standard)
pnpm install --frozen-lockfile                 # prepare → simple-git-hooks wrote .git/hooks/pre-commit
cp -Rp $W/.vitepress/wasm .vitepress/ && cp -Rp $W/platform/public/challenge platform/public/
git add -A && git commit -F <sanitized message>   # the pending changes as one setup commit; hook O1
```

| Row | Result | Reproducing command, in `$S/clone` |
|---|---|---|
| V03 (local): `create:challenge` + `git add` + `git commit` carries the expected `_redirects` | pass. `pnpm create:challenge --name e2e-probe --backend php` (today's script) left `_redirects` byte-identical (`cmp` with a copy taken before) and scaffolded #11, keygen included. The commit printed `[pre-commit] ✓ e2e-probe` and contains `platform/public/_redirects` with the one added line `/c/011       /challenge/e2e-probe/            302`; no W3 or W4. The working tree's `_redirects` equals `HEAD`'s afterwards | `pnpm create:challenge --name e2e-probe --backend php && git add platform/challenge/e2e-probe && git commit -F <msg> && git show HEAD -- platform/public/_redirects && git diff --quiet HEAD -- platform/public/_redirects` |
| V03 (local): the guard passes on that commit | pass: 10 passed. Control: with the parent commit's `_redirects` put back in the working tree, the same command gave 1 failed \| 9 passed ("is byte-identical to what the challenge tree generates"), then `git checkout -- platform/public/_redirects` | `pnpm vitest run tests/unit/site/redirects-generated.test.ts`; control: `git show HEAD~1:platform/public/_redirects > platform/public/_redirects` first |
| `git commit -a` after editing a tracked challenge file | pass. With `e2e-probe/index.md` edited, an untracked `e2e-probe/notes.txt` (CRLF, no final newline) and a pre-existing stash entry (a `favicon.svg` edit, `git stash push -m 'pre-existing teacher entry' -- platform/public/favicon.svg`): exit 0, the commit holds only `index.md`, `_redirects` unchanged (still the expected file), no W3 or W4, `notes.txt` untracked and byte-identical (`shasum -c`), stash list (ids included) unchanged | `git commit -a -F <msg> && git show --stat HEAD && shasum -c notes.sha && git stash list --format='%H %gs' \| diff - stash-before.txt` |
| `git commit -a` as H31 (untracked challenge, `_redirects` rewritten as `pnpm dev` does) | pass. `pnpm create:challenge --name e2e-probe-two --backend php` (#12, left untracked), then `pnpm redirects:generate` added `/c/012` to the tracked `_redirects`. `git commit -a`: exit 0, W3 (`platform/public/_redirects: replaced your version …`) and W4 (`platform/challenge/e2e-probe-two/ is untracked … git add it`); the commit's tree equals its parent's (no `/c/012`), the working tree's `_redirects` equals `HEAD`'s, `e2e-probe-two/` untracked and byte-identical, stash list unchanged. Following W4, `git add platform/challenge/e2e-probe-two && git commit -F <msg>` committed it with `/c/012       /challenge/e2e-probe-two/            302` | `git commit -a -F <msg> && git diff --quiet HEAD~1 HEAD && git show HEAD:platform/public/_redirects \| grep -c /c/012` (prints `0`) |
| path commit (H33, beyond the brief) | pass. `git commit -F <msg> -- platform/challenge/e2e-probe-two/index.md` with that file modified: exit 1, W8; `HEAD`, `git ls-files --stage`, the touched files' bytes and the stash list unchanged | `git commit -F <msg> -- platform/challenge/e2e-probe-two/index.md; echo $?` |
| hook test file in the clone | pass: 37 passed | `pnpm vitest run tests/pre-commit-sh.test.ts` |
| stash lists (H29/H30 on a real run) | pass. Clone: the one pre-existing entry `eaeecbe…` listed with the same id after every commit. Real repository: `git stash list` empty before and after. This checkout's `platform/public/_redirects` (`shasum -c`) and `git ls-files --stage` digest unchanged | `git stash list --format='%H %gs'` in the clone; `git -C <repo> stash list \| diff - $S/real-stash-before.txt` |
| cleanup | done. No process from the clone, nothing on port 4173; clone deleted | `pgrep -fl "$S/clone"; lsof -tnP -iTCP:4173 -sTCP:LISTEN; rm -rf "$S/clone"` |

Stage 8 stays unticked: V03's other half, "the ticket PR's CI passes", and the preview deployment
are not run yet. They follow once the parent pushes the branch.

### 2026-10-21 — completeness check

Checked against the checkout, not earlier summaries. Surface: this worktree's code-panel runs of
vitest and the hook under `/bin/bash` 3.2.57; no browser surface (the hook has none), no CI.

Acceptance criteria. Every ticked box has an observing case in `tests/pre-commit-sh.test.ts` at
seam S5 (H01–H05, H06 ×2, H07, H08+H09, H10, H11, H12/H15 as today's seven cases, H13, H14 with
H02, H18, H19, H20, H23, H24, H31 ×2, H33 ×5, H40, H43, H44, and H29/H30 in `afterEach` of all
37 cases), or a stage 6 diff check rerun here (H16, G01: `git diff a54e917 --
tests/unit/site/redirects-generated.test.ts .github/ | wc -l` → `0`; the guard's call at
`tests/unit/site/redirects-generated.test.ts:179` is still `includeSlug: (s) => tracked.has(s)`,
and the locale parameter is ignored by that one-argument predicate). No box was unticked. Still
open: P6 (the ticket's wording is met by `scripts/pre-commit.sh` lines 2–28 and the
`generate-redirects.ts` header and `includeSlug` comment, but traceability P6 also requires D12's
sentence, T-0033's, so it stays unticked as decided at stage 6) and stage 8 (the PR's CI and the
preview deployment, not run until the branch is pushed).

Records present: test plan table with the approval line, coverage report table, code review
(stage 6), security review (stage 7) with
`.proj.specs/0007-gh-pages-range-fixes/review/security-T-0032.md`, stage 8 (local). Frontmatter
`status: review`.

| Command | Result |
|---|---|
| `pnpm test --run` | 127 files passed; 4233 passed, 1 skipped |
| `pnpm challenge:validate` | "All checks passed.", exit 0 |
| `pnpm vitest run tests/unit/site/redirects-generated.test.ts tests/unit/site/redirects.test.ts tests/pre-commit-sh.test.ts` | 3 files passed, 59 passed |
| `bash -n scripts/pre-commit.sh` and `/bin/bash -n scripts/pre-commit.sh` | exit 0, no output |
| `/bin/bash --version`; `command -v bash` | `GNU bash, version 3.2.57(1)-release (arm64-apple-darwin25)`; `/bin/bash` |
| `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` | 37 passed. The test file has no option to choose the shell: `runHook` and the installed hook call `bash` from `PATH` (`tests/__helpers__/preCommitRepo.ts:115`, `:196`), so `/bin` was put first; `PATH="/bin:$PATH" node -e "…spawnSync('bash',['-c','command -v bash; echo $BASH_VERSION'])…"` printed `/bin/bash` and `3.2.57(1)-release` |
| `git diff a54e917 -- platform/public/_redirects \| wc -l` | `0` |
| `git status --short` | the ticket, `scripts/generate-redirects.ts`, `scripts/pre-commit.sh`, `tests/pre-commit-sh.test.ts` modified; `tests/__helpers__/preCommitRepo.ts` and `review/security-T-0032.md` untracked; all in scope |
| `git status --short --ignored` | ignored only `node_modules/`, `.vitepress/wasm/`, `platform/public/challenge/` (build artifacts); no test output, coverage folder or temporary repository in the tree |

Gaps left for the user, not fixed here: P6 and stage 8 open as above; security S2 (a newly staged
file under a directory replaced by a symbolic link to an outside directory is deleted outside the
repository by `restore_entry`'s `rm`, reproduced at stage 7) is unfixed and awaits the user's
decision; the stage 6 residuals (`GIT_LITERAL_PATHSPECS=1` making `:(exclude)` literal, and the
test plan's "literal rule lines" sentence not holding for H07, H11, H19 and the stash case) are
still open.

### 2026-10-22 — fixes after stage 6–8

Surface for every row: this worktree's code-panel runs of vitest, with the real hook run by `bash`
from `PATH`, which is `/bin/bash` 3.2.57 here (`PATH="/bin:$PATH" bash -c 'command -v bash; echo
$BASH_VERSION'` printed `/bin/bash` and `3.2.57(1)-release`); git 2.54.0. No browser surface (the
hook has none), no CI. "Mutation" has the meaning of the stage 5 entry; each was run with
`scripts/pre-commit.sh` saved, edited with `perl -0pi -e '<edit>'`, the rows run with
`PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts -t '<rows>'`, and the file put back
and checked with `cmp`.

1. **Security S2: the restore's `rm` could delete a file outside the repository.** Fixed test-first.
   New case "S2: newly staged files behind a directory replaced by a link to outside the repository
   are left alone, and the outside files keep their bytes" (`tests/pre-commit-sh.test.ts`, describe
   "the restore writes nothing outside platform/ (B2)"): a complete challenge `linked` (#4) is
   staged, its `src/` is moved to `<base>/outside src` and linked back, and the outside directory's
   names and bytes must be unchanged after the hook, with O2 and the literal rule lines. Red before
   the fix: "expected [] to deeply equal [ [ 'app.py', …(1) ], …(1) ]" (both outside files
   deleted). Fix (`scripts/pre-commit.sh`):
   - the deletion list keeps only the working-tree deletions whose path `HEAD` lacks
     (`git cat-file -e "HEAD:$path"` fails), the files the index adds that `git stash` does not
     record. A deleted file `HEAD` holds is recorded by the stash and removed by git's own restore;
   - `restore_entry` skips any listed path with a symbolically linked directory above it, up to
     and including `platform/` (`behind_link`, parameter expansion only), and names it on stderr;
   - git performs the removal: `GIT_LITERAL_PATHSPECS=1 git restore --quiet --source=<empty tree>
     --worktree --pathspec-from-file=<list> --pathspec-file-nul`, which removes the paths from the
     working tree only and refuses to remove beyond a link. Measured first in a scratch repository
     (`bash <scratchpad>/wf/T-0032/probe-restore.sh`, a session file, not in the repository): the
     added files went, the index stayed, and with a parent replaced by a link to an outside
     directory the outside file and the link both stayed;
   - the raw-copy put-back skips and names a path behind a link too, and reports the restore as
     failed, so `finish` keeps the entry. Within B2's model git never lists a path behind a link
     there (the paths were regular files under real directories when the stash was taken), so no
     case drives it.
   Mutations: M8, the hook's link check in the removal disabled (`if behind_link "$path"` → `if
   false`), rows `S2` → 1 failed, only on stderr ("expected '[pre-commit] ✓ linked\n' to contain
   'platform/challenge/linked/src/app.py'"): git itself refused, the outside files stayed. M9, M8
   plus `rm -f` in place of `git restore`, rows `S2` → 1 failed, the outside files deleted. M4 rerun
   (the removal replaced by `:`), rows `H08, H09` → 1 failed.
2. **Pathspec variables.** Fixed test-first. New cases "`<name>=1` leaves the outcome unchanged:
   _redirects stays out of the hook's stash (D3)" for `GIT_LITERAL_PATHSPECS`,
   `GIT_GLOB_PATHSPECS`, `GIT_NOGLOB_PATHSPECS` and `GIT_ICASE_PATHSPECS`: a staged and a different
   unstaged `_redirects` edit with other unstaged and untracked files, O2, literal rule lines, W3.
   Red before the fix: the `GIT_LITERAL_PATHSPECS` case failed with git's "pathspec
   ':(exclude)platform/public/_redirects' did not match any file(s)" (printed in the machine's
   Chinese locale) at `git stash push`; the other three passed. Fix: the hook unsets the four
   variables right after `set -euo pipefail`; the removal in item 1 sets `GIT_LITERAL_PATHSPECS=1`
   for its own command only, since its paths are literal. Mutation M10, the `unset` line deleted,
   rows `pathspec variables` → 1 failed | 3 passed.
3. **CDPATH.** Confirmed fixed at stage 6: `physical_path` runs `CDPATH= cd -- "$(dirname "$1")"`,
   the hook's only `cd`. Covered by "H31 with CDPATH exported". Mutation M6 rerun (`CDPATH= cd -- `
   → `cd `), rows `CDPATH` → 1 failed.
4. **Traceability, "Commit forms".** The sentence said the own index "names the same file as `git
   rev-parse --git-path index`". Corrected in `.proj.specs/0007-gh-pages-range-fixes/traceability.md`
   to that path "run with `GIT_INDEX_FILE` removed from its environment", with the reason: inside the
   hook the command answers with the variable itself. Evidence: `GIT_INDEX_FILE=/elsewhere/index-copy
   git rev-parse --git-path index` printed `/elsewhere/index-copy`, and M1 (stage 6) fails H33 three
   times. `spec.en.md` and `spec.zh-TW.md` do not state the detail (`grep -n git-path` on both found
   nothing), so neither changed. This supersedes point 1 of the stage 5 open points ("this ticket does
   not edit the spec").
5. **Literal rule lines.** H07, H11, H19 and "the hook’s stash entry" now assert
   `rulesOf(expected)` equals `FIXTURE_RULES`, a literal of the fixture's five committed rule lines
   (`/c/001`, `/c/002`, `/zh/c/002` and the two `:slug` rules; the retired #3 has none). H07 also
   asserts that the hand-made `/c/999` is absent, H11 and the stash case that the hand edit is gone.
   The new S2 case asserts its six literal lines, `/c/004 /challenge/linked/` among them. These cases
   passed as soon as the assertions were added: they were already correct, and the oracle no longer
   stands alone.
6. **P6 ticked.** The ticket's wording is met: `scripts/pre-commit.sh`'s header names the watched
   paths, the index-slug rule, D3 and the `ACMRD` filter with a type change that only triggers, and
   `scripts/generate-redirects.ts`'s header and `includeSlug` comment state the per-tree index-slug
   rule. The D12 sentence that traceability's P6 also asks for lands with T-0033.
7. **The CRLF fix and bash 5.** Checked by reading `scripts/pre-commit.sh`: the raw copy and its
   put-back use `[ -f ]`, `[ ! -L ]`, `mkdir -p`, `dirname`, `cp -p --`, `printf '%s\0'`,
   `read -r -d ''` and process substitution, which bash 3.2 and 5 share, and `cp -p` and `mkdir -p`
   are POSIX options on GNU coreutils and BSD alike. The new code adds only `${dir%/*}`, `[ -s ]`,
   `local`, `git hash-object -t tree /dev/null` and `git restore --pathspec-from-file`
   (git 2.26 and later). Nothing is bash 3.2-specific. No bash 5 is installed on this machine, so
   bash 5 is verified by the PR's CI: `.github/workflows/quality-gates.yml:69` runs `pnpm test --run`
   on `ubuntu-latest`.

Not changed: S3 (the `_redirects` write follows a linked `platform/public/`) stays rejected, as B2's
"Symbolic links are followed" says; the restore's link check covers only what the restore removes
and writes.

| Command | Result |
|---|---|
| `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` | 42 passed (37 before) |
| `pnpm test --run` | 127 files passed; 4238 passed, 1 skipped |
| `pnpm challenge:validate` | "All checks passed." |
| `bash -n scripts/pre-commit.sh` and `/bin/bash -n scripts/pre-commit.sh` | exit 0, no output |
| `git diff a54e917 -- platform/public/_redirects \| wc -l` | `0` |
| M7 rerun: `git show a54e917:scripts/pre-commit.sh > scripts/pre-commit.sh`, then the whole file | 30 failed \| 12 passed; file put back, `cmp` clean |

This closes the gaps the 2026-10-21 completeness check left for the user (S2, P6, the
`GIT_LITERAL_PATHSPECS` and "literal rule lines" residuals), except stage 8. Status stays `review`:
stage 8's CI half and the preview deployment are still open.

#### Round 2 (2026-10-22): the reviewers' four confirmed findings

Surface and method as in the entry above: code-panel vitest runs, the real hook run by `/bin/bash`
3.2.57 from `PATH`, git 2.54.0, no browser surface, no CI. Each mutation was run with the edited
file saved to `<scratchpad>/wf/T-0032/` (a session directory, not in the repository), edited with
`perl -0pi -e '<edit>'`, the rows run with `PATH="/bin:$PATH" pnpm vitest run
tests/pre-commit-sh.test.ts -t '<rows>'`, and the file copied back and checked with `cmp`.

1. **A deleted file the index adds where `HEAD` has a directory came back after O2.** Fixed
   test-first. The item 1 filter `git cat-file -e "HEAD:$path"` also succeeds when `HEAD` holds a
   tree at the path, so such a path stayed off the removal list, while `git stash` does not record
   its deletion either. New case "H09: a file the index adds where HEAD has a directory, then
   deleted from the working tree, stays deleted": `HEAD` holds `platform/notes/x/inner.txt`, the
   index replaces the directory with the file `platform/notes/x` (`git rm -r`, write, `git add`),
   the working tree deletes it, and a `door` change is staged; the case asserts
   `git cat-file -t HEAD:platform/notes/x` is `tree`, O2, `FIXTURE_RULES` and no W3 or W4. Red
   before the fix (rows `HEAD has a directory`): O2's byte map gained
   `"platform/notes/x" => "-:YSBmaWxlIHdoZXJlIEhFQUQgaGFzIGEgZGlyZWN0b3J5Cg=="`, the file the
   teacher had deleted. Fix in `scripts/pre-commit.sh`: a deleted path is listed unless `HEAD` holds
   it as a file, `[ "$(git cat-file -t "HEAD:$path" 2>/dev/null)" = blob ] || printf …`; a link in
   `HEAD` is a blob too, and its deletion is recorded by the stash. The comment above the loop says
   so. Green after it.
2. **H18 relied on the oracle alone.** H18 now asserts `rulesOf(expected)` equals `FIXTURE_RULES`.
   Mutation M11, in `scripts/generate-redirects.ts`, which the hook's copy in the fixture and the
   oracle share, deleting the `['/zh/c/:slug', '/zh-TW/challenge/:slug/']` entry: rows `H18` →
   1 failed, at the new assertion ("expected [ …(4) ] to deeply equal [ …(5) ]", missing
   `/zh/c/:slug /zh-TW/challenge/:slug/`). O2 alone passes there by construction, since both sides
   lose the line. The reviewers' own scenario (rules dropped when `HEAD` has no `_redirects`) has
   no code path: the generator never reads the old file.
3. **`GIT_LITERAL_PATHSPECS=1` on the removal had no test.** Fixed test-first by extending
   H08+H09: a second staged-then-deleted file `platform/notes/a*.txt` (staged with
   `:(literal)`), next to a tracked `platform/notes/abc.txt` committed with the other notes and left
   unchanged. Mutation MG, the prefix removed (`s/    GIT_LITERAL_PATHSPECS=1 git restore/    git
   restore/`): rows `H08, H09` → 1 failed, O2's byte map lost `"platform/notes/abc.txt"`. With the
   prefix, 1 passed. Measured on the way: a glob-matched sibling with an unstaged edit does not show
   the defect, because the raw-copy put-back restores its bytes after the removal; the first
   extension (`a*.txt` beside the edited `a name.txt`) passed under MG, and only an unchanged
   sibling, which the raw copy does not hold, goes red. The reviewers' probe P1 failed under MG for
   that reason too: its `git add 'platform/notes/a*.txt'` read the name as a glob and staged
   `abc.txt`'s edit, so the file lost was one with a staged change, not an unstaged one (traced
   with `bash -x` on the hook in a throwaway test, deleted afterwards).
4. **"Each case also asserts its literal rule lines" still did not hold.** H11 boundary, H08+H09,
   H10 and "H31 with CDPATH exported" now assert `rulesOf(expected)` equals `FIXTURE_RULES` as well
   (H08+H09's and H10's `/c/005` absence checks are subsumed). The test file's header is narrowed
   to what the suite does: a case that ends in O2 pins its rule lines with literals, the whole
   `FIXTURE_RULES` where the staged challenges are the fixture's, or else the lines its change adds
   or removes; H05, H24 and H43 pin `HEAD`'s committed bytes, which do not come from the oracle.
   The approved test plan's sentence is left as approved and is read in that sense; the O1, O3
   and O4 cases assert that nothing changed, which needs no rule lines. Item 5 above named only
   H07, H11, H19 and the stash case, so its closing "the oracle no longer stands alone" was true
   for those cases only; this round closes the rest.

| Command | Result |
|---|---|
| `PATH="/bin:$PATH" bash -c 'command -v bash; echo $BASH_VERSION'` | `/bin/bash`, `3.2.57(1)-release` |
| `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` | 43 passed (42 before) |
| `pnpm test --run` | 127 files passed; 4239 passed, 1 skipped |
| `pnpm challenge:validate` | "All checks passed." |
| `bash -n scripts/pre-commit.sh` and `/bin/bash -n scripts/pre-commit.sh` | exit 0, no output |
| `git diff a54e917 -- platform/public/_redirects \| wc -l` | `0` |

Status stays `review`: stage 8's CI half and the preview deployment are still open.

#### Round 3 (2026-10-22): residuals

Surface: this worktree's code-panel vitest runs, the real hook run by `/bin/bash` 3.2.57 from
`PATH`, git 2.54.0; no browser surface, no CI. Every mutation ran in a scratch copy, never in this
worktree: `<scratchpad>/wf/T-0032/copy` (a session directory, not in the repository) holds this
worktree's tracked and untracked files, committed into a repository of its own, with
`node_modules` linked to this worktree's. The driver `<scratchpad>/wf/T-0032/mutate-copy.sh
'<perl edit>' '<rows>'` copies this worktree's `scripts/pre-commit.sh`,
`scripts/generate-redirects.ts`, `tests/pre-commit-sh.test.ts` and
`tests/__helpers__/preCommitRepo.ts` into the copy, applies `perl -0pi -e '<edit>'` to the copy's
hook only, prints the diff, and runs `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts
-t '<rows>'` in the copy. An empty edit runs the unmodified hook.

1. **Traceability, the `_redirects` constraint contradicted D3.** The constraint said the hook "puts
   them back on every exit where the index's `_redirects` did not change", while D3, O2 and H10 say
   that after O2 the working tree's `_redirects` equals the staged one, also when the index's
   version did not change (H10: the staged `_redirects` stays `HEAD`'s, while the working
   tree's `pnpm dev` version is replaced). Corrected in
   `.proj.specs/0007-gh-pages-range-fixes/traceability.md` to: the hook "puts them back on every
   exit other than O2 where the index's `_redirects` did not change, unless an O5 interrupted the
   hook once its `git add` of `_redirects` had started. After O2 the working tree's `_redirects`
   equals the staged one (D3); after such an O5 it holds the old bytes or the staged one, as O5
   allows." This matches the code: `finish` puts the saved bytes back only when `WROTE=true` and
   `STAGED=false` (`scripts/pre-commit.sh:162-164`); before the write nothing touched the file, and
   after `git add` returned (`STAGED=true`) the file is left as staged. The hook's header, step 5,
   now says the same, in the same eight lines, so the line numbers the security report cites did
   not move. `spec.en.md` does not hold the sentence: `grep -n "puts them back\|every exit where"
   .proj.specs/0007-gh-pages-range-fixes/spec.en.md` printed nothing (exit 1), so neither spec
   changed.
2. **The GLOB, NOGLOB and ICASE pathspec cases had no discriminating power.** Each of the four
   cases now also stages `platform/notes/staged-then-deleted.txt` and deletes it from the working
   tree, so the hook takes its removal step, `GIT_LITERAL_PATHSPECS=1 git restore`, and O2 asserts
   the file stays deleted. M10 rerun, `mutate-copy.sh 's/^unset GIT_LITERAL_PATHSPECS[^\n]*\n//m'
   'pathspec variables'`: before the extension 1 failed | 3 passed (only LITERAL); after it
   3 failed | 1 passed. LITERAL fails at `git stash push` as before; GLOB and ICASE fail at the
   removal, where git refuses with "global 'literal' pathspec setting is incompatible with all
   other global pathspec settings" (printed in the machine's Chinese locale), and the hook ends in
   O7 (exit 1, W9, the entry kept). Unmodified hook: 4 passed. **NOGLOB stays green and cannot be
   made red this way:** git reads `GIT_NOGLOB_PATHSPECS` as adding literal magic, which does not
   conflict with `GIT_LITERAL_PATHSPECS=1`, and none of the hook's pathspecs holds a wildcard.
   Measured in `<scratchpad>/wf/T-0032/ng` (one committed file `a`): `env GIT_<V>_PATHSPECS=1
   GIT_LITERAL_PATHSPECS=1 git restore --source=HEAD --worktree -- a` exited 128 for GLOB and
   ICASE and 0 for NOGLOB. Removing only NOGLOB from the `unset`, `mutate-copy.sh
   's/ GIT_NOGLOB_PATHSPECS(?= GIT_ICASE)//' 'GIT_NOGLOB_PATHSPECS'`, leaves its case at 1 passed.
   The NOGLOB entry of the `unset` is defensive only; not changed.
3. **`-c core.safecrlf=false` on the stash push had no test.** New case "H09 under core.safecrlf
   true: an unstaged tracked and an untracked CRLF file come back byte-identical": the temporary
   repository gets `core.safecrlf true`, a committed LF `platform/notes/crlf.txt` gets the unstaged
   bytes `a\r\nb, unstaged\r\n`, an untracked `platform/notes/untracked crlf.txt` holds `u\r\nv\r\n`,
   and a `door` change is staged; O2, both files' bytes as literals, `FIXTURE_RULES`, no W3 or W4.
   Mutation M12, `mutate-copy.sh 's/git -c core\.safecrlf=false stash push/git stash push/'
   'core.safecrlf'`: 1 failed, exit 1 instead of 0; git warned for the tracked file and refused
   the untracked one ("fatal: CRLF would be replaced by LF in platform/notes/untracked crlf.txt",
   in Chinese). Unmodified hook: 1 passed.
4. **The security report described the removal filter as `git cat-file -e`.** Corrected in
   `.proj.specs/0007-gh-pages-range-fixes/review/security-T-0032.md` (S2's fix and the 2026-10-22
   check) to `[ "$(git cat-file -t "HEAD:$path" 2>/dev/null)" = blob ]`, with the reason: `-e`
   also succeeds where `HEAD` holds a directory, so a file the index adds over that directory and
   the working tree deletes stayed off the list and came back after O2 (round 2, item 1). The
   report's `:208-211` for the deletion list now reads `:209-212`, the loop's actual lines. Item 1
   of the first 2026-10-22 entry above still names `-e`: it records what was applied then, and
   round 2's item 1 records the change.
5. **The test file's header claimed more than held.** "exits 0 when valid challenge files are
   staged" and H31 stage only the fixture's own challenges but asserted only one rule line
   (`/c/001`) or the absence of `/c/004`. Both now assert `rulesOf(expected)` equals
   `FIXTURE_RULES` (H31's `/c/004` absence check is subsumed), so the header holds as written; it
   is unchanged. M11 rerun in the copy, on the generator: `cd <scratchpad>/wf/T-0032/copy && perl
   -0pi -e "s/  \['\/zh\/c\/:slug', '\/zh-TW\/challenge\/:slug\/'\],\n//"
   scripts/generate-redirects.ts && PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts
   -t 'exits 0 when valid challenge files are staged|H31: git commit -a after'`, then the file
   copied back from this worktree: 2 failed, both at the new assertion ("expected [ …(4) ] to
   deeply equal [ …(5) ]"); their earlier assertions hold under M11. Unmodified: 2 passed.
6. **Known edge, not fixed: an ignored link that replaced a directory of newly staged files.** The
   reviewers found it. A teacher stages new files under `platform/` (here `linked`'s `src/app.py`
   and `src/flag.txt`), moves `src/` out of the repository, links it back, and the link is ignored
   (`.git/info/exclude`); an unstaged change elsewhere under `platform/` makes the hook stash.
   `git stash push --keep-index --include-untracked` turns the link into a real directory holding
   the staged files, ignored entries do not enter the stash, so nothing restores the link, and the
   hook's removal step then removes the files again: `src` disappears. The outside files stay
   intact and the hook exits 0, so B2 holds; O2's byte-identical promise covers tracked and
   untracked files, not ignored entries. The mechanism predates the epic: `a54e917`'s hook used the
   same push. Reproduced with a throwaway probe in the copy, `cd <scratchpad>/wf/T-0032/copy &&
   PROBE_OUT=<scratchpad>/wf/T-0032/edge-probe.txt PATH="/bin:$PATH" pnpm vitest run
   tests/edge-ignored-link.test.ts` (the probe file exists only in the copy): before, `!!
   platform/challenge/linked/src`, a link; exit 0, stderr only the validator's line; after, `src`
   absent, the outside directory still `app.py,flag.txt`. With the copy's hook replaced by `git
   show a54e917:scripts/pre-commit.sh`, the same probe left `src` a real directory holding
   `app.py,flag.txt` (its `stash pop` kept them). Recorded in the security report's new section
   "已知、未修正的邊界情況" as well. No code changed for it.

| Command | Result |
|---|---|
| `PATH="/bin:$PATH" bash -c 'command -v bash; echo $BASH_VERSION'` | `/bin/bash`, `3.2.57(1)-release` |
| `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` | 44 passed (43 before) |
| `pnpm test --run` | 127 files passed; 4240 passed, 1 skipped |
| `pnpm challenge:validate` | "All checks passed." |
| `bash -n scripts/pre-commit.sh` and `/bin/bash -n scripts/pre-commit.sh` | exit 0, no output |
| `git diff a54e917 -- platform/public/_redirects \| wc -l` | `0` |
| M10 rerun (item 2) | 3 failed \| 1 passed (NOGLOB green); unmodified 4 passed |
| NOGLOB only removed from the `unset` (item 2) | 1 passed |
| M12 (item 3) | 1 failed; unmodified 1 passed |
| M11 rerun on the two cases (item 5) | 2 failed; unmodified 2 passed |

Status stays `review`: stage 8's CI half and the preview deployment are still open.

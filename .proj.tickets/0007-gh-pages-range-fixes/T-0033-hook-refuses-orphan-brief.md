---
id: T-0033
title: The pre-commit hook refuses a Traditional Chinese brief left without its English challenge
epic: 0007-gh-pages-range-fixes
status: review
blocked_by: [T-0032]
---

## Context

The existing test "backs every translated slug with a root-locale challenge" fails CI whenever a
Traditional Chinese brief has no English challenge of the same slug. Without a check, the hook from
T-0032 would accept such a commit and regenerate `_redirects` for it: retiring, deleting or renaming
only the English directory, or renaming only the brief. CI would then fail after the push, which is
what this epic exists to stop. The user decided (D12) that the hook refuses such a commit before
generating, and names the brief.

Spec: `traceability.md` revision 3, decision D12, the vocabulary for "orphan brief" and "retiring",
outcome O4, message W6.

## Deliverable

A commit whose staged snapshot holds an orphan brief is refused with exit 1 and W6, with nothing
changed. A retirement that deletes the brief in the same commit passes.

## Acceptance criteria

- [x] H17: retiring a challenge whose brief stays → O4 with W6 (AC-15)
- [x] H21: deleting only the English directory of a translated challenge → O4 with W6 (AC-15)
- [x] H22: renaming only the English directory → O4 with W6 (AC-15)
- [x] H41: renaming only the Traditional Chinese directory → O4 with W6 (AC-15)
- [x] H39: retiring with the brief deleted in the same commit → O2, both rules go (AC-12)
- [x] H29, H30 hold for each of these rows (AC-23)
- [x] P6: the hook's header comment names the refusal (AC-24)

## 給使用者（zh-TW）

如果一個 commit 會讓某個繁中說明頁失去同名的英文題目，例如只下架、只刪除或只改名英文目錄，或只改名繁中目錄，hook 會在產生之前拒絕，並指名那個說明頁，說明要和英文目錄一起處理。下架時同一個 commit 一起刪除繁中說明頁，就會通過，兩條短連結規則也會一起消失。

## Comments

### 2026-10-23 — test plan (stage 5)

Seam 0007-S5, in `tests/pre-commit-sh.test.ts` with the fixture and helpers of
`tests/__helpers__/preCommitRepo.ts`, as T-0032 left them. Every case runs this checkout's real
`scripts/pre-commit.sh`, by its absolute path, at the top level of `<mkdtemp>/暫存 repo` (a space and
non-ASCII characters): directly with `bash`, or through a real `git commit` whose installed
`.git/hooks/pre-commit` runs that file. The fixture's `door` (#2) is the challenge with a Traditional
Chinese brief; `test-chall` (#1) is English only; `.archive/challenge/old-chall/` (#3) is retired.

Terms are traceability's: an orphan brief is a slug in the Traditional Chinese tree's index slugs
(`platform/zh-TW/challenge/<slug>/index.md` in the index git hands the hook) that is not in the
English tree's. Retiring moves `platform/challenge/<slug>/` to `.archive/challenge/<slug>/`.

Each refusal case asserts the same things (O4 with W6):

- exit status 1;
- stderr holds W6 for each orphan slug: `platform/zh-TW/challenge/<slug>/` and `platform/challenge/<slug>/`, and, from D12, the words delete, rename and retire;
- "before generating": a recording stub at `scripts/generate-redirects.ts` (`recordScript`) logs no call with `--staged`, and stderr holds no W5 text (`held by more than one challenge`, `carries different numbers`). The stub does not forbid other calls, so the check may live in the hook or in a node script;
- nothing changed, `_redirects` included (`expectNothingChanged`: `git ls-files --stage`, every working-tree byte with `.git` excluded, the untracked lines of `git status`, and `git stash list` with commit ids). Each case starts with an unstaged hand edit of `_redirects`, an unstaged edit of `platform/public/other.txt` and an untracked file under `platform/`, so a stash and restore, if the hook makes one, is exercised.

H29 and H30 hold for every case in the file through its existing `afterEach`: the pre-existing
entry is still listed with its commit id, and this checkout's `platform/public/_redirects` bytes,
`git ls-files --stage` and `git stash list` equal their values from `beforeEach`.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S5 direct run, recording generator | H17: retiring `door` with `git mv platform/challenge/door .archive/challenge/door` while its brief stays. O4 with W6 naming `door` | hook orphan check | AC-15 (H17) | the destination is outside the watched trees, so the staged diff under `platform/challenge/` is a deletion; the validator receives the deleted paths and passes, as for a removed directory. Read from the code, not yet run: today the generator accepts this snapshot (O2 with an orphan `/zh/c/002`), so the case should be red until the check exists; the red run confirms it |
| S5 direct run, recording generator | H21: only `door`'s English directory deleted with `git rm -r`. O4 with W6 naming `door` | hook orphan check | AC-15 (H21) | the validator receives the deleted paths and passes. Red today for the same reason as H17 |
| S5 direct run, recording generator | H22: only `door`'s English directory renamed with `git mv platform/challenge/door platform/challenge/gate`. O4 with W6 naming `door` (the orphan is the brief's slug, not the new one) | hook orphan check | AC-15 (H22) | the validator receives the renamed paths and passes. Read from the code, not yet run: without the check the generator refuses the snapshot with W5 (number 2 held by `door` and `gate`), so the assertions on W6's paths and on no `--staged` call are what make this case red |
| S5 direct run, recording generator and validator | H41: only the Traditional Chinese directory renamed with `git mv platform/zh-TW/challenge/door platform/zh-TW/challenge/gate`. O4 with W6 naming `gate`: `platform/zh-TW/challenge/gate/` and `platform/challenge/gate/` | hook orphan check | AC-15 (H41) | the validator is never invoked (no `platform/challenge/` path is staged). Without the check the generator refuses with W5, as in H22 |
| S5 `git commit` and `git commit -a` | the refusal at the commit level: H17's change committed with `git commit -m`, and H21's deletion made in the working tree only (`rm -r`) and committed with `git commit -a -m`. Both exit 1 with W6; `HEAD` is unchanged and no commit is made; `.git/index`, every working-tree byte and the stash list are as before | hook orphan check on the index git hands it | AC-15 (H17, H21) | `-a` hands the hook `<gitdir>/index.lock`, so the orphan is seen only in the index the hook runs on, not in `.git/index`. git discards the lock after the refusal |
| S5 direct run, recording validator | the conflict row "D12 × the per-tree index slugs" (K-17's case): a new brief `platform/zh-TW/challenge/fresh/index.md` (#4) staged while the complete English `platform/challenge/fresh/` is untracked, and in the same snapshot a staged brief `ghost` (#5) with no English directory at all. O4, with W6 naming both `fresh` and `ghost` | hook orphan check, index slugs | AC-15 (D12; traceability "Checks on this revision") | an English page present on disk but not in the index does not back a brief. Two orphans in one snapshot are each named. Distinct unused numbers, so without the check the generator would succeed and the case is red on its exit status. The untracked `fresh/` is byte-identical and still untracked afterwards. The validator is never invoked |
| S5 direct run | D12 "a commit whose staged snapshot holds" an orphan: `HEAD` already holds one (a setup commit made with `--no-verify` deletes only `door`'s English directory), and the staged change is an application file of `test-chall`. O4 with W6 naming `door` | hook orphan check over the snapshot, not the diff | AC-15 (D12) | the staged change itself creates no orphan; the snapshot does. The validator passes for `test-chall`, so the refusal is the orphan's |
| S5 direct run | H39: retiring `door` together with its brief: `git mv platform/challenge/door .archive/challenge/door` and `git rm -r platform/zh-TW/challenge/door`. O2 (`expectO2`), and the staged `_redirects` is the oracle's, with rule lines exactly `/c/001 /challenge/test-chall/`, `/c/:slug /challenge/:slug/`, `/zh/c/:slug /zh-TW/challenge/:slug/`: both of `door`'s rules go. No W3, W4 or W6 | hook, generator | AC-12 (H39) | the retired directory carries #2 under `.archive/challenge/`, outside the trees the generator reads. Expected green before the check exists: it guards against a check that reads `HEAD`, the diff or the working tree instead of the index slugs |
| S5 direct run | H39 boundary: the same retirement with the brief removed only from the index (`git rm -r --cached platform/zh-TW/challenge/door`), so it stays on disk untracked. O2 with the same rule lines; the brief is byte-identical and still untracked | hook orphan check, index slugs | AC-12 (H39) | an untracked brief is not in the index slugs, so it is no orphan, as an untracked English page is no backing (K-17's case above) |
| S5 direct run (existing cases, unchanged) | the cases D12 must still let through, rerun with the check in place: H02 + H14 (a brief for an existing English challenge), H03 (both trees deleted), H04 (both trees renamed), H40 (only a brief deleted), H20 (English `tmp` force-added, its brief ignored), H07 (a commit that only repairs `_redirects`). Each still ends in O2 as T-0032 asserts, and none prints W6 | hook orphan check | AC-12 (H02, H03, H04, H20, H40, H07), AC-16 (H14) | no new test: the D12 conflict row names H02 and H40, and the others are the remaining snapshots where a brief and its English page change together. A stderr check for W6's absence is not added to them; their O2 exit status already excludes a refusal |
| S5 harness, every case above | H29 and H30 for each of H17, H21, H22, H41, H39 and the boundaries above, through the file's `afterEach` | test harness | AC-23 (H29, H30) | `bash` here is `/bin/bash` 3.2.57 (`bash -c 'echo $BASH_VERSION'` printed `3.2.57(1)-release`), so every case runs under 3.2 with `set -u` on this Mac and under bash 5 in CI's ubuntu. The whole file is also run with `PATH="/bin:$PATH"`, as the baseline was; the check must not expand an empty array when there is no orphan |
| stage 6, diff check | P6's D12 sentence, left to this ticket by T-0032: `scripts/pre-commit.sh`'s header comment names the orphan-brief refusal: before generating, a Traditional Chinese brief whose slug the English tree's index slugs lack is refused with exit 1 and a message naming it, with nothing changed | comments | AC-24 (P6, T05) | not run automatically. Whether the generator's header also needs the sentence depends on where the check lives (open point) |
| stage 8, S7, as far as this ticket reaches | in a temporary local clone of this branch, never pushed and removed afterwards, with the hook `simple-git-hooks` installs: retire a challenge that has a Traditional Chinese brief with `git mv platform/challenge/<slug> .archive/challenge/<slug>` and `git commit` → refused with W6, nothing committed; then `git rm -r platform/zh-TW/challenge/<slug>` and `git commit` through `/tw-emoji-commit` → the commit's `_redirects` has lost both rules, and the guard test passes on it. The ticket PR's CI passes | the teacher's command-line surface | AC-15 (H17), AC-12 (H39) | the surface is a real `git commit` in a shell, not a browser. The epic's final stage 8 is T-0039's |

Approval: The user approved this test plan in advance on 2026-10-23 with the standing instruction "授權權限，完成到結束" (permission granted; carry it through to the end), given together with "ultracode 先確認是否能夠平行，若有風險都選擇順序，完成 T-0033 T-0034 T-0035 T-0037 T-0038".

### 2026-10-23 — open points resolved (stage 5)

1. **Where the check sits relative to validation.** After validation and before generation, in the
   order of traceability's constraint list (validator, then "Before generating, the hook refuses an
   orphan brief", then generation). A snapshot that both holds an orphan and fails validation ends in
   O3 with the validator's status; O4's row ("1, with W6 or W5") stays true for every orphan
   snapshot that validates. No row tests that combination, and none was added.
2. **W6 for a rename of only the Traditional Chinese directory (H41).** W6 names the orphan slug, as
   the spec's W6 row says: `platform/zh-TW/challenge/gate/` and `platform/challenge/gate/`. The
   message's guidance line says to rename both, which covers the teacher's `door`. Naming the English
   directory that lost its brief would need a rename detection the spec does not ask for.
3. **"exactly what that test would fail in CI".** Not exact, as the planner read: a staged Traditional
   Chinese directory with files but no `index.md`, and no English twin, passes the hook (no index
   slug) and still fails `redirects.test.ts`'s `slugsFor`. Outside this ticket's rows; recorded under
   "Known edges" below for the spec owner and T-0039.
4. **P6's scope.** The check lives in the hook, so `scripts/pre-commit.sh`'s header gets a step of its
   own (step 3; the later steps are renumbered, and step 6 now refers to step 5's `git add`). Since P6
   also lists `generate-redirects.ts`'s header and the `includeSlug` comment, each got one sentence
   saying the hook refuses an orphan brief before calling the generator. Stage 6 checks the wording
   (T05), so the P6 box stays unticked.
5. **"Before generating" observed through the stub.** The check is a separate bash step in the hook,
   ahead of the one `generate-redirects.ts --staged` call, so the "no `--staged` call" assertion holds
   as planned. It is bash rather than a node script: a new script would also have to be copied into
   the fixture (`COPIED_FILES`), and folding it into the `--staged` call would defeat the assertion.
   It reads the index with `git ls-files -z`, the same listing `indexSlugs` reads, and compares
   slugs as whole strings in plain arrays (no associative arrays in bash 3.2; neither array is
   expanded when empty).
6. **Red reasons read from the code.** Confirmed by running the 707be5f hook (M0 below): H17, H21,
   both commit-level cases and the `HEAD` orphan exit 0; K-17 and its boundary exit 0 with W3;
   H22 and H41 end in the generator's refusal ("Cannot generate _redirects", W5) without W6's paths.
   H39 and its `--cached` boundary pass on that hook, as planned.
7. **An orphan already in `HEAD`.** Refused, as D12 reads the snapshot. A range that committed an
   orphan with `--no-verify` must fix it before its next challenge commit; CI already fails such a
   range. Left to T-0039's documents to state, if the user wants it stated.

One boundary was added inside the K-17 row, on the same seam: "K-17 boundary: ignored directories,
which stay on disk through the hook's stash, neither back a brief nor make one". Mutation M1 showed
why: the hook's stash has already removed untracked files under `platform/` when the check runs, so
a check that read the disk differed from the index only on ignored directories, and no planned case
had one. W6 avoids the coined term "orphan brief" in its text ("is a Traditional Chinese brief, but
the index holds no English challenge"), so no GLOSSARY term was added or changed.

### 2026-10-23 — red → green log (stage 5)

| Cycle | Test (`tests/pre-commit-sh.test.ts`, "orphan briefs (D12)") | Red | Green |
|---|---|---|---|
| 1 | H17 | `expected +0 to be 1`: exit 0, stderr `⊘ door (removed)`, `✓ door`, W3 (O2 with the orphan) | the orphan check in `scripts/pre-commit.sh`, after validation, before generation |
| 2 | H21, H22, H41 | passed at once: cycle 1's check covers them. M0 shows each red on the 707be5f hook | no change |
| 3 | H17 through `git commit -m`; H21 through `git commit -a -m` | passed at once (index and `index.lock` read the same way). M0 | no change |
| 4 | K-17 (fresh untracked, ghost) and the `HEAD` orphan | passed at once. M0, M3, M6 | no change |
| 5 | H39, H39 boundary (`--cached`) | green by plan (regression guards); M0 shows them green on the old hook too, M2 red | no change |
| 6 | K-17 boundary (ignored `logs`, `tmp`) | added after M1 survived; passed at once, and M1 turns it red | no change |
| 7 | P6 header comments | — (comments) | hook header step 3; generator header and `includeSlug` comment |
| 8 | "no English index slug at all" (stage 6 finding 1, below) | added after review; passed at once, and M7 turns it red | no change |

#### Mutation checks (reproducible)

The runner is outside the repository, at
`/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0033/mut.py`.
Each run swaps one edit into `scripts/pre-commit.sh`, runs the whole hook file with `/bin/bash`
first on `PATH`, restores the hook and checks it byte for byte. From the worktree root, export
`SCRATCH` first (a prefix assignment would not reach the `"$SCRATCH/mut.py"` on the same line):

```sh
export SCRATCH=/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0033
python3 -I "$SCRATCH/mut.py" M<n>    # M0 also with "orphan briefs" --errors
```

| Id | Mutation | Result (2026-10-23, 55 cases) |
|---|---|---|
| M0 | the hook as on 707be5f (`git show 707be5f:scripts/pre-commit.sh`) | describe only: `9 failed \| 2 passed`: every refusal case; H39 and its boundary pass |
| M1 | `git ls-files -z --cached --others` (the disk, ignored files included) | `1 failed \| 54 passed`: K-17 boundary |
| M2 | the Traditional Chinese list read from `HEAD` | `7 failed \| 48 passed`: H03, H04, H41, K-17, K-17 boundary, H39, H39 boundary |
| M3 | both lists read from the staged diff | `9 failed \| 46 passed`: H02/H14, H40, H13, H17, H21, H22, both commit-level cases, the `HEAD` orphan |
| M4 | `: "${ORPHANS[@]}"` before the guard (an empty array expanded under `set -u`) | `27 failed \| 28 passed`: every O2 case under bash 3.2 |
| M5 | a `--staged` generation ahead of the check | `10 failed \| 45 passed`: the nine refusal cases and "the hook's stash entry" |
| M6 | only the first orphan named (`break`) | `1 failed \| 54 passed`: K-17 |
| M7 | the English list's guard removed (`if true; then`), so an empty `EN_SLUGS` is expanded under `set -u`; run on 56 cases after stage 6 | `1 failed \| 55 passed`: "no English index slug at all", stderr `line 286: EN_SLUGS[@]: unbound variable` and no W6 |

The edits, as `(old, new)` pairs the runner applies once each to `scripts/pre-commit.sh`, with
`LS = 'done < <(git ls-files -z -- "$1")'`:

```python
'M1': [(LS, 'done < <(git ls-files -z --cached --others -- "$1")')],
'M2': [(LS, 'done < <(if [ "$1" = platform/zh-TW/challenge/ ]; then git ls-tree -r -z --name-only HEAD -- "$1"; else git ls-files -z -- "$1"; fi)')],
'M3': [(LS, 'done < <(git diff --cached --name-only -z --no-renames -- "$1")')],
'M4': [('if [ ${#ORPHANS[@]} -gt 0 ]; then', ': "${ORPHANS[@]}"\nif [ ${#ORPHANS[@]} -gt 0 ]; then')],
'M5': [('# ── Orphan briefs (D12) ', 'node --experimental-strip-types scripts/generate-redirects.ts --staged --root "$TOP" >/dev/null || exit 1\n# ── Orphan briefs (D12) ')],
'M6': [('so CI would fail this commit." >&2\n', 'so CI would fail this commit." >&2\n    break\n')],
'M7': [('  if [ ${#EN_SLUGS[@]} -gt 0 ]; then\n', '  if true; then\n')],
```

Every run printed `restored`. A first M2, written as a `case` inside `<( )`, failed 35 cases for a
reason of its own: bash 3.2 misreads a `case` pattern's `)` inside a process substitution. It was
replaced by the `if` form above; the hook's own `case` sits in a function body, not in a substitution.

### 2026-10-23 — coverage report (stage 5)

`@vitest/coverage-v8` is not installed: `pnpm vitest run --coverage --coverage.include=scripts/generate-redirects.ts tests/pre-commit-sh.test.ts`
→ `MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'`. None was installed. The changed
code is bash, and the generator change is comments only, so line coverage would not reach it anyway.
"Measured coverage" is the hook branches each row drives, confirmed by the mutations above.

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S5 direct run, recording generator | H17, H21, H22 | the orphan branch: W6 per slug, `exit 1` before `--staged`, the stash restore on that exit (M0, M3, M5) | AC-15 (H17, H21, H22) | — |
| S5 direct run, recording generator and validator | H41 | the orphan branch with no `platform/challenge/` path staged (validator skipped) | AC-15 (H41) | — |
| S5 `git commit`, `git commit -a` | H17 through `git commit -m`, H21 through `git commit -a -m` | the check on `.git/index` and on `index.lock`; `HEAD` unchanged | AC-15 (H17, H21) | — |
| S5 direct run, recording validator | K-17, K-17 boundary | index slugs only: an untracked or ignored English page backs no brief, an ignored brief is no orphan; two orphans each named (M1, M2, M6) | AC-15 (D12; "Checks on this revision") | — |
| S5 direct run | the `HEAD` orphan | the check over the snapshot, not the diff (M3) | AC-15 (D12) | — |
| S5 direct run | "no English index slug at all" (added at stage 6) | the orphan branch with `EN_SLUGS` empty, under bash 3.2 `set -u` (M7) | AC-15 (D12), AC-23 | — |
| S5 direct run | H39, H39 boundary | the no-orphan branch with the brief deleted, or only unstaged, in the same commit; exact rule lines (M2) | AC-12 (H39) | — |
| S5 existing cases | H02/H14, H03, H04, H40, H20, H07 and the other 38 | the no-orphan branch, `ORPHANS` empty, under bash 3.2 `set -u` (M4) | AC-12, AC-16 | no bash 5 on this Mac (`/bin/bash` is 3.2.57, no other bash installed); CI's ubuntu runs the file under bash 5 |
| S5 harness | `afterEach` of all 56 cases | H29, H30 | AC-23 (H29, H30) | — |
| not driven | — | an orphan snapshot that also fails validation (O3 first, point 1); a `git ls-files` failure inside the check: `set -e` does not see a failure inside `<( )`, so the list comes back empty, the check finds no orphan, and the run goes on to the generator, whose `indexSlugs` runs `git ls-files` again and ends the run with exit 1 if it fails too (read from the code, not run) | — | no row in this ticket; hook failure paths are T-0034's |
| stage 6 | — | not run | AC-24 (P6, T05) | stage 6 reads the header comments on the diff |
| stage 8 | — | not run | AC-15 (H17), AC-12 (H39) on the teacher's command line | stage 8 of this ticket |

Commands and results, in `/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0033`:

- `pnpm test --run` → `Test Files  130 passed (130)`, `Tests  4425 passed | 1 skipped (4426)` (baseline on 707be5f: 4414 passed, 1 skipped; this ticket adds 11 cases). After stage 6: `Tests  4426 passed | 1 skipped (4427)` (12 cases added).
- `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` → `Tests  55 passed (55)` (`bash -c 'echo $BASH_VERSION'` → `3.2.57(1)-release`). After stage 6: `Tests  56 passed (56)`.
- `bash -n scripts/pre-commit.sh` → exit 0; `/bin/bash -n scripts/pre-commit.sh` → exit 0.
- `pnpm -s challenge:validate` → `All checks passed.`, exit 0.
- No typecheck script is configured in `package.json`, so none was run.

#### Known edges

- A staged Traditional Chinese directory without `index.md` and without an English twin passes the
  hook and fails `redirects.test.ts` in CI (point 3).
- An orphan already in `HEAD` blocks every later commit that triggers the hook until it is fixed
  (point 7).

### 2026-10-23 — code review (stage 6)

Review round 1, three axes (Spec, Standards, Security). A medium or high finding stands when at
least two of three skeptics confirm it; a low one when its one skeptic does. Security candidates are
listed in the stage 7 entry below.

Confirmed, and what was done:

1. **Standards (low) — the guard `if [ ${#EN_SLUGS[@]} -gt 0 ]` (`scripts/pre-commit.sh:280`) was
   driven by no case, and the coverage report did not list the gap.** The fixture always holds at
   least one English challenge, so the guard's false branch never ran; only `ORPHANS`'s guard had a
   mutation (M4). Fixed in the tests: new case "no English index slug at all"
   (`tests/pre-commit-sh.test.ts:804`) deletes both English challenges with `git rm -rq`, keeps
   `door`'s brief, and asserts O4 with W6 naming `door`, no `unbound variable` on stderr, and nothing
   changed. The hook was not changed: the guard was already there, so the case passed at once
   (cycle 8). Mutation M7 (the guard replaced by `if true; then`) turns it red under `/bin/bash`
   3.2.57: `1 failed | 55 passed`, stderr `line 286: EN_SLUGS[@]: unbound variable`, no W6. Coverage
   report: a row for the case and M7 was added. Commands, from the worktree root after
   `export SCRATCH=/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0033`
   (corrected in review round 2; rerun in that form, results unchanged):
   `python3 -I "$SCRATCH/mut.py" M7 --errors` → `Tests  1 failed | 55 passed (56)`, `restored`;
   `python3 -I "$SCRATCH/mut.py" M0 "orphan briefs"` → `Tests  10 failed | 2 passed | 44 skipped (56)` (the new case is red on the 707be5f hook too), `restored`.

Rejected by the skeptics (not acted on), with the reasons given:

- Standards: the mutation runner lives in the session scratchpad, so the record's command cannot be
  rerun (1/3: the edit pairs, M0's source, the procedure and the test command are in the record, and
  T-0032 and T-0036 landed with the same form; residual: "runs the whole hook file" means the test
  file `tests/pre-commit-sh.test.ts`, and M0's `"orphan briefs"` is vitest's `-t` filter); red →
  green put several tests in one cycle (each "passed at once" row carries a reproducible mutation,
  the form T-0015 settled and T-0030 used); the K-17 boundary was added without updating the
  approved table (same seam, within the row's boundary; the record says it was added and why); H39
  and its boundary pass without the change (planned regression guards for O2, red under M2); the
  index-slug rule written in bash and in TypeScript (3/3 rejected: the hook already hard-codes both
  trees, the rule is spec vocabulary, comments name each other, and the mutations catch a
  divergence); the "no `--staged` call" assertion observing the stub's argv (S5 allows replacing a
  called script with a stub; "before generating" is a spec order that M5 shows only argv can tell);
  D12's three words matched anywhere on stderr (no other source on these cases prints them); the
  `includeSlug` comment vouching for the hook (the bullet is about the hook's call; P6 asks for it);
  "it" in the generator header (only a script can be called); `generatorLog`/`addTeacherWork` near
  duplicates (thin named wrappers over `recordScript`; different files); `RETIRED_DOOR_RULES`
  declared inside the `describe` (scoped to its two users; the repository has the same form); W6's
  literal `<slug>` (the listed substrings carry real values; W8 uses placeholders too); "orphan
  brief" and "Traditional Chinese brief" missing from GLOSSARY (spec vocabulary, and spec.en.md says
  this epic adds no GLOSSARY term; `challenge-pipeline.md` already uses the second); the check
  failing open when `git ls-files` fails (the generator reads the index again and exits 1; failure
  paths are T-0034's; already in the coverage report); verification claims without a command (point
  3 and the first M2 are reasoning, marked as such); the approval given in advance (the user's own
  standing instruction, the form T-0030, T-0031, T-0032 and T-0036 landed with).
- Spec: W6's `<slug>` placeholder (traceability's substitution rule covers the listed substrings);
  "its index.md is not staged" for a deletion (true of the staged snapshot; the guidance lines cover
  each case); O3 before O4 untested (no row orders them; open point 1 and the coverage report record
  it); the check failing open (as above); "Before calling it" in the generator header (as above);
  `includeSlug`'s "no brief here lacks its page" (as above); `expectW6` matching all of stderr (as
  above); traceability's "exactly what that test would fail in CI" (spec text, not changed here;
  open point 3 and Known edges record it); the runner outside the repository (as above); the advance
  approval (as above); "Traditional Chinese brief" against GLOSSARY's engagement brief (the same
  page in the other tree; existing project usage).
- Residuals the skeptics left to the user, not changed here: an orphan snapshot that also fails
  validation ends in O3 with no W6 (a spec-level ordering choice); the `includeSlug` JSDoc could name
  the hook's `index_slugs` as its twin; W6's "Nothing was changed." precedes the restore (see S2 in
  the stage 7 report).

Commands rerun after the change, in `/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0033`:

- `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts -t "no English index slug"` → `Tests  1 passed | 55 skipped (56)`.
- `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` → `Test Files  1 passed (1)`, `Tests  56 passed (56)`.
- `pnpm test --run` → `Test Files  130 passed (130)`, `Tests  4426 passed | 1 skipped (4427)`.
- `bash -n scripts/pre-commit.sh` → exit 0; `/bin/bash -n scripts/pre-commit.sh` → exit 0.
- `pnpm -s challenge:validate` → `All checks passed.`, exit 0.

P6 stays unticked: no finding disputed the header wording, and the user reads it on the diff.

### 2026-10-23 — security review (stage 7)

Report: [`.proj.specs/0007-gh-pages-range-fixes/review/security-T-0033.md`](../../.proj.specs/0007-gh-pages-range-fixes/review/security-T-0033.md).
Five candidates (S1–S5), each rejected by its skeptic (0/1); none was acted on:

- S1: W6 prints the index's slug without escaping control characters (whoever can put such a path
  into the index can already change the scripts the hook runs; log spoofing is excluded upstream).
- S2: "Nothing was changed." is printed before the restore (O4's contract; a failed restore is O7,
  whose W9 follows as the last line).
- S3: the check runs after the stash, so every refusal goes through a stash and restore (same path as
  O3 and as the 707be5f hook; moving it before the stash would also put it before validation).
- S4: a `git ls-files` failure inside `<( )` passes the check or names every brief (a persistent
  failure stops the generator's own `git ls-files`; a one-off one is outside B2's model; T-0034).
- S5: an orphan already in `HEAD` blocks later commits, and W6's guidance could delete a translation
  (D12 reads the snapshot; merges are outside the hook; `git rm` refuses modified files).

The user's note that auto-merge was turned on is recorded in the report: the PR should not merge
before stage 7's findings are triaged and stage 8 has run.

### 2026-10-23 — review round 2 (stages 6 and 7)

Same rule as round 1: a medium or high finding stands when at least two of three skeptics confirm
it, a low one when its one skeptic does. Round 2 changed records only; the hook, the generator and
the tests are as round 1 left them, so the coverage report stands unchanged.

Confirmed, and what was done:

1. **Standards (medium; the skeptics suggested low) — the mutation runner's commands could not be
   copied.** `SCRATCH=<dir> python3 -I "$SCRATCH/mut.py" …` expands `"$SCRATCH/mut.py"` from the
   current shell before the prefix assignment applies, and the M0 line had no assignment at all.
   Reproduced: `env -u SCRATCH /bin/bash -c 'SCRATCH=<the scratch directory> python3 -I "$SCRATCH/mut.py" M7 --errors'`
   → `can't open file '/mut.py'`, exit 2. Fixed in "Mutation checks (reproducible)" and in round 1's
   point 1: `export SCRATCH=<absolute path>` first, then `python3 -I "$SCRATCH/mut.py" …`, and the
   `<scratchpad>` placeholder replaced by the absolute path. Rerun in the corrected form
   (`env -u SCRATCH /bin/bash -c 'export SCRATCH=…/wf2/T-0033; python3 -I "$SCRATCH/mut.py" M7 --errors; python3 -I "$SCRATCH/mut.py" M0 "orphan briefs"'`)
   → M7 `Tests  1 failed | 55 passed (56)`, `restored`; M0 `Tests  10 failed | 2 passed | 44 skipped (56)`,
   the ten refusal cases, `restored`; `shasum scripts/pre-commit.sh` identical before and after.
2. **Standards (low) — security report S2 cited W8 as saying "Nothing was changed."** W8's text
   (`scripts/pre-commit.sh:85-91`) has no such line, and W8 exits before the stash (`:84-93`, ahead
   of `:233`). Corrected in the report's S2; S2's rejection rests on O4 and O7/W9 and stands.
3. **Standards (low) — security report S3 said "nine refusal cases".** There are ten
   (`tests/pre-commit-sh.test.ts:672` to `:804`, the last added at stage 6). Corrected in the
   report's S3.

Rejected by the skeptics (not acted on), with the reasons given:

- Standards: M0, M3 and M5 in the mutation table count 55 cases (the table header says "55 cases";
  M7's row and round 1's point 1 give the 56-case results; the record is dated). The new test's name
  describes a mechanism (its assertions are on stderr and the outcome; bash 3.2 with `set -u` is a
  hook constraint, traceability.md:267).
- Spec: the mutation table and coverage row were not resynced after round 1 (as above; the coverage
  row names the mutation that tests its claim, not every one that kills it). The new case's
  coverage row cites AC-23 (H45, the matrix's only row for the bash 3.2 constraint, maps to AC-23).
  `git commit -a` stages the "unstaged" changes into `index.lock` (the test plan describes the
  starting state; the untracked file still goes through the stash and restore). An orphan in `HEAD`
  with a commit that does not trigger passes (O1 is "not triggered"; point 7 and Known edges say
  "next challenge commit" and "triggers the hook"). The generator header's "on every commit that
  carries a change at a watched path" (text from 707be5f; a refused commit is never made).
- Security, both recorded in the report as R2-S1 and R2-S2 (0/1 each): W6's "git add it" could
  publish an untracked directory (the hook stages nothing; the same guidance is W5's at
  `scripts/pre-commit.sh:317`, unchanged); auto-merge with no guard before stages 7 and 8 (no
  change here touches merging; by docs/agents/workflow.md the PR opens at stage 9, after stage 8).

For the parent: confirm with the user whether auto-merge is set on the repository or on a PR. If a
PR opens before stage 8 for another reason, open it as a draft or run `gh pr merge --disable-auto`.

Commands rerun, in `/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0033`:

- `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` → `Test Files  1 passed (1)`, `Tests  56 passed (56)` (`/bin/bash -c 'echo $BASH_VERSION'` → `3.2.57(1)-release`).
- `pnpm test --run` → `Test Files  130 passed (130)`, `Tests  4426 passed | 1 skipped (4427)`.
- `bash -n scripts/pre-commit.sh` → exit 0; `/bin/bash -n scripts/pre-commit.sh` → exit 0.
- `pnpm -s challenge:validate` → `All checks passed.`, exit 0.

Security report updated with round 2's candidates, the two corrections and the reviewer's limits:
[`.proj.specs/0007-gh-pages-range-fixes/review/security-T-0033.md`](../../.proj.specs/0007-gh-pages-range-fixes/review/security-T-0033.md), "Review round 2".

### 2026-10-23 — end-to-end (stage 8, local)

Surface for every row: a temporary local clone of this repository (never pushed, origin removed), on
a throwaway branch at `707be5f` carrying this checkout's pending changes, with the hook that
`simple-git-hooks` installed (`.git/hooks/pre-commit` → `bash scripts/pre-commit.sh`), run through
real `git commit` invocations in a shell with `/bin/bash` first on `PATH`
(`PATH="/bin:$PATH" bash -c 'echo $BASH_VERSION'` → `3.2.57(1)-release`). This is the teacher's
command-line surface; the hook has no browser part. Not covered here: the ticket PR's CI (ubuntu,
bash 5) and the Cloudflare preview, which follow once the parent pushes the branch. Every commit
message, the refused ones included, was drafted per `.claude/skills/tw-emoji-commit/SKILL.md`,
sanitized with its `scripts/sanitize_commit.py` and passed with `git commit -F`. The challenge used
is `staff-only` (#2), which has a Traditional Chinese brief; retiring is
`git mv platform/challenge/<slug> .archive/challenge/<slug>` (GLOSSARY "retired challenge", spec
vocabulary).

Setup (`$S` a scratch directory, `$W` this checkout, `<repo>` the main checkout):

```sh
git -C <repo> stash list --format='%H %gs' > $S/real-stash-before.txt   # empty
git clone -q --no-hardlinks <repo> $S/clone && cd $S/clone && git remote remove origin
git checkout -q -b e2e/T-0033-throwaway 707be5f
git -C $W diff --binary 707be5f | git apply   # then copy $W's untracked files (git ls-files --others --exclude-standard)
cmp scripts/pre-commit.sh $W/scripts/pre-commit.sh   # also generate-redirects.ts and the hook test file: identical
pnpm install --frozen-lockfile                 # prepare → simple-git-hooks wrote .git/hooks/pre-commit
cp -Rp $W/.vitepress/wasm .vitepress/ && cp -Rp $W/platform/public/challenge platform/public/
git add -A && PATH="/bin:$PATH" git commit -F <sanitized message>   # setup commit 558176e; hook O1
echo '<!-- teacher edit -->' >> platform/public/favicon.svg
git stash push -q -m 'pre-existing teacher entry' -- platform/public/favicon.svg   # 3e576fc…
```

`snap <file>` records the state each refusal must leave unchanged:

```sh
{ echo "HEAD $(git rev-parse HEAD)"; echo "STAGE $(git ls-files --stage | shasum)"
  echo STATUS; git status --porcelain=v1 --untracked-files=all
  echo STASH; git stash list --format='%H %gs'
  echo "TREE $(find . -path ./.git -prune -o -path ./node_modules -prune -o -type f -print0 | LC_ALL=C sort -z | xargs -0 shasum | shasum)"
} > "$1"
```

| Row | Surface | Result | Reproducing command, in `$S/clone` |
|---|---|---|---|
| 1. H17: retire only the English side, the brief stays | teacher's command line, real `git commit` | pass. Exit 1; stderr `[pre-commit] ✗ platform/zh-TW/challenge/staff-only/ is a Traditional Chinese brief, but the index holds no English challenge platform/challenge/staff-only/ …` and the guidance lines (delete, rename, retire); no commit (`HEAD` still `558176e`); `snap` before and after identical: `HEAD`, `git ls-files --stage`, status, stash list (`3e576fc…` with its id), working-tree bytes | `mkdir -p .archive/challenge && git mv platform/challenge/staff-only .archive/challenge/staff-only && snap b && PATH="/bin:$PATH" git commit -F <msg>; echo $?; snap a && diff b a` |
| 2. H21: delete only the English directory | teacher's command line, real `git commit` | pass. Exit 1 with the same W6 naming `platform/zh-TW/challenge/staff-only/` and `platform/challenge/staff-only/`; no commit; `snap` identical | after undoing row 1 (`git mv .archive/challenge/staff-only platform/challenge/staff-only`): `git rm -rq platform/challenge/staff-only && snap b && PATH="/bin:$PATH" git commit -F <msg>; echo $?; snap a && diff b a` |
| 3. H39: retire with the brief deleted in the same commit | teacher's command line, real `git commit` | pass. Exit 0, commit `bb81450` holds the three renames to `.archive/challenge/staff-only/`, the brief's deletion and `platform/public/_redirects` with exactly two lines removed: `/c/002       /challenge/staff-only/               302` and `/zh/c/002    /zh-TW/challenge/staff-only/         302`; no W3, W4 or W6; the working tree's `_redirects` equals `HEAD`'s; stash list unchanged | after `git checkout -q HEAD -- platform/challenge/staff-only`: `git mv platform/challenge/staff-only .archive/challenge/staff-only && git rm -rq platform/zh-TW/challenge/staff-only && PATH="/bin:$PATH" git commit -F <msg> && git show HEAD -- platform/public/_redirects && git diff --quiet HEAD -- platform/public/_redirects` |
| 3a. the guard passes on that commit | `pnpm vitest` in the clone | pass: `Tests  10 passed (10)` | `pnpm vitest run tests/unit/site/redirects-generated.test.ts` |
| 3b. the CI test the refusal stands in for (beyond the brief) | `pnpm vitest` in the clone | pass on `bb81450`: `Tests  12 passed (12)`. Control: with the brief put back in the working tree, `1 failed \| 11 passed`, "backs every translated slug with a root-locale challenge"; then `git rm -rqf` and `git diff --quiet HEAD` | `pnpm vitest run tests/unit/site/redirects.test.ts`; control: `git checkout -q HEAD~1 -- platform/zh-TW/challenge/staff-only` first |
| hook test file in the clone | `pnpm vitest` in the clone, `/bin/bash` 3.2.57 | pass: `Tests  56 passed (56)` | `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` |
| real repository unchanged | this checkout and the main checkout | pass. `git stash list` empty before and after; this checkout's `HEAD` still `707be5f`, `git status --short` the same five paths, `platform/public/_redirects` equal to `707be5f`'s | `git -C <repo> stash list --format='%H %gs' \| diff - $S/real-stash-before.txt; git -C $W diff --quiet 707be5f -- platform/public/_redirects` |
| cleanup | — | done. No process from the clone, nothing listening on 4173, clone deleted; no server was started | `pgrep -fl "$S/clone"; lsof -tnP -iTCP:4173 -sTCP:LISTEN; rm -rf "$S/clone"` |

The first attempt at row 2 never reached the hook: an `rmdir .archive` in the undo step failed
(`.archive/guide` exists), the `&&` chain stopped, and the `git commit` that followed found nothing
staged ("沒有要提交的檔案"). No commit was made and the stash list was unchanged; the row was rerun as
above. Row 1 was also run twice: the first draft's subject began with an emoji outside the skill's
table; the commit was refused either way, with the same stderr and an identical `snap`.

This ticket has no stage 8 checkbox in its acceptance criteria, so none was ticked. The stage 8 row
of the test plan also asks that "the ticket PR's CI passes"; that half, and the preview deployment,
wait for the parent to push the branch. The user said auto-merge is on: per stage 7 and review
round 2 above, the PR should not merge before that CI run is seen.

### 2026-10-23 — completeness check

Read against the checkout, not earlier summaries, in
`/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0033` (`HEAD` `707be5f`, changes
uncommitted).

| Acceptance criterion | Observer at the named seam (S5 unless stated) | Box |
|---|---|---|
| H17 | `tests/pre-commit-sh.test.ts:672` (direct run) and `:723` (`git commit -m`): `expectW6` (exit 1, both paths, delete/rename/retire, no `--staged` call, no W5) and `expectNothingChanged` | ticked, kept |
| H21 | `:684` (direct run) and `:737` (`git commit -a -m`, orphan only in `index.lock`) | ticked, kept |
| H22 | `:696`: W6 names `door`, not `gate` | ticked, kept |
| H41 | `:709`: W6 names `gate`, validator never invoked | ticked, kept |
| H39 | `:821` and its `--cached` boundary `:835`: `expectO2`, rule lines exactly `RETIRED_DOOR_RULES`, no W3/W4/W6 | ticked, kept |
| H29, H30 | the file's `afterEach` (`:82-88`): pre-existing entry with its id, real repository's `_redirects`, index and stash list unchanged; runs after every case above | ticked, kept |
| P6 | stage 6 review (T05) read the wording with no finding against it; reproducible by `grep -n "orphan brief\|ACMRD\|(D3)\|index slugs\|watched path" scripts/pre-commit.sh` (header lines 4, 13, 16-21, 28) and `grep -n "orphan brief\|D12" scripts/generate-redirects.ts` (header :30-33, `includeSlug` :107-110). P6's other clauses (watched paths, index-slug rule, D3, `ACMRD`) are T-0032's and still present | **ticked here.** It was left unticked at stage 6 although T05 had run; stage 6's entry requires every met criterion checked, and T-0032 ticked its own P6 after stage 6 the same way |

Records present in Comments: test plan table with the approval line; open points; red → green log
with mutation checks M0-M7; coverage report table with known edges; code review (stage 6) and
review round 2; security review (stage 7); end-to-end (stage 8, local). The report
`.proj.specs/0007-gh-pages-range-fixes/review/security-T-0033.md` exists (untracked, part of this
ticket's change). Frontmatter `status: review`.

Commands, rerun now:

- `pnpm test --run` → `Test Files  130 passed (130)`, `Tests  4426 passed | 1 skipped (4427)`.
- `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` → `Test Files  1 passed (1)`, `Tests  56 passed (56)` (`PATH="/bin:$PATH" bash -c 'echo $BASH_VERSION'` → `3.2.57(1)-release`).
- `/bin/bash -n scripts/pre-commit.sh` → exit 0.
- `pnpm -s challenge:validate` → `All checks passed.`, exit 0.
- `python3 scripts/verify-project.py` (Python 3.13.11) → `PASS: shared instructions, 42 skills across Claude/Codex trees, …`, exit 0.
- `git status --short` → the four modified paths (this ticket, `scripts/generate-redirects.ts`, `scripts/pre-commit.sh`, `tests/pre-commit-sh.test.ts`) and the untracked security report; `git status --short --ignored` adds only `.vitepress/wasm/`, `node_modules/`, `platform/public/challenge/`, the pre-existing build folders. No test output, temporary repository, coverage folder or probe challenge in the tree.
- `git -C /Users/phoenix/dev/browserlab/wxl-platform stash list --format='%H %gs' | wc -l` → `0`; `git diff --quiet 707be5f -- platform/public/_redirects` → exit 0.

No gaps in the record. Still open outside it, as stage 8 already says: the ticket PR's CI (ubuntu,
bash 5) and the preview deployment, once the parent pushes the branch. The user has turned
auto-merge on, so the PR should not be allowed to merge before that CI run is seen. T-0039 owns
the documents that may state point 7 and Known edges.

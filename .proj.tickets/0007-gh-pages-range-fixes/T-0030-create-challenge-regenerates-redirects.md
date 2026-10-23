---
id: T-0030
title: create:challenge regenerates _redirects, with exit statuses 1, 2 and 3
epic: 0007-gh-pages-range-fixes
status: done
blocked_by: []
---

## Context

Epic 0007 makes `platform/public/_redirects` keep up with the challenges without the teacher knowing
it exists. Today `pnpm create:challenge` scaffolds a challenge and runs keygen but leaves the file
stale, so a GitHub Pages range's CI fails on the first push. This ticket makes the scaffold step
regenerate the file. It also gives each failure its own exit status (D8, D13): 1 means nothing was
written, 2 means the challenge was created but `_redirects` was not regenerated, and 3 means keygen
failed after the scaffold was written.

Spec: `.proj.specs/0007-gh-pages-range-fixes/spec.en.md` revision 3, "create:challenge" and B5;
`traceability.md` revision 3, seam 0007-S4, messages W1 and W2. This is the first ticket to land, so
its PR also carries the spec directory, the ticket files, and the uncommitted `GLOSSARY.md` and
`.proj.specs/OPEN-QUESTIONS.md` changes ("Landing").

## Deliverable

`create:challenge` exposes an entry that takes argv, a root and a keygen runner, and returns its
status; the CLI calls it with the repository root. After keygen succeeds, it rewrites `_redirects`
over the whole working tree and names the file on stdout. Every failure ends with its documented
status and message.

## Acceptance criteria

- [x] C01: valid arguments, keygen succeeds → `_redirects` equals `generateRedirects(root)` and holds the new `/c/NNN` rule; status 0 (AC-10)
- [x] C02: stdout contains `platform/public/_redirects` (AC-10)
- [x] C03: keygen fails → status 3, stderr holds W2, `_redirects` byte-identical, scaffold stays (AC-11)
- [x] C04: tree holds two challenges with one number → status 2, stderr holds W1, `_redirects` byte-identical, scaffold stays (AC-11)
- [x] C05: an invalid argument; an existing slug → status 1 before any file is written (AC-11)
- [x] C06: a challenge directory whose `index.md` carries no number → status 2, as C04 (AC-11)
- [x] C07: a Traditional Chinese brief with another number → status 2, as C04 (AC-11)
- [x] C08: `_redirects` bytes differing from the generated content → replaced (AC-10)
- [x] C09: `_redirects` cannot be written (it is a directory) → status 2, W1 with the write's error, scaffold stays (AC-11)
- [x] G01 at stage 6: the guard test's assertion, inclusion rule and CI steps are unchanged (AC-17)
- [x] Stage 8: V03 in a temporary local clone (`--backend php`), as far as this ticket's change reaches (AC-20)

## 給使用者（zh-TW）

`pnpm create:challenge` 建好題目、keygen 成功後，會自動重新產生 `_redirects`，並在輸出中說明。失敗時的結束狀態分成三種：1 是什麼都沒寫，2 是題目已建立但 `_redirects` 沒有更新，3 是 keygen 失敗但骨架已建立。每一種都附有說明下一步的訊息。這張是本 epic 第一張 land 的 ticket，spec、GLOSSARY 與 OPEN-QUESTIONS 的修改會跟它的 PR 一起進 `main`。

## Comments

### 2026-10-21 — test plan (stage 5)

Seam 0007-S4: create-challenge's exported entry, called as `run(argv, deps)` with `deps.root` (a
directory the test makes with `mkdtempSync` under `os.tmpdir()`, holding `platform/public/`),
`deps.runKeygen` (a stub that records its calls and succeeds or fails with a known output), and
`deps.stdout` / `deps.stderr` (sinks the test reads; see the open point below). The returned status,
the files under `root` (paths and bytes) and the two sinks are what the tests observe. Every S4 test
lives in a new file, `tests/unit/scripts/create-challenge-run.test.ts`; no test calls the entry with
the repository root.

Fixture used unless a row says otherwise: `platform/challenge/door-is-open/index.md` (number 1),
`platform/zh-TW/challenge/door-is-open/index.md` (number 1), `.archive/challenge/old/index.md`
(number 2), and `platform/public/_redirects`. The run's argv is `--name new-chall --backend php`, so
the new challenge gets number 3. Expected values come from the real `generateRedirects(root)` and
`padChallengeNumber`, computed after the run.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0007-S4 | A successful run regenerates `_redirects` over the whole tree and names it: status 0; the file's bytes equal `generateRedirects(root)`; it holds the rule `/c/003 → /challenge/new-chall/` and keeps `/zh/c/001`; stdout contains `platform/public/_redirects`; the stub ran once with `new-chall` and `root`; the only paths created or changed under `root` are the three scaffold files and `_redirects` | unit (vitest, temporary root, stub keygen) | C01, C02 / AC-10; B5 | `_redirects` matches the tree before the run; the retired number 2 is counted, so the new rule is `/c/003`; stderr holds neither W1 nor W2 |
| 0007-S4 | Bytes that differ from the generated content are replaced: status 0, file equals `generateRedirects(root)` | unit | C08 / AC-10 | a stale file (the `/c/001` line removed) and a hand edit (an extra line appended). Extra case beyond the row: no `_redirects` before the run, after which it exists and equals the generated content |
| 0007-S4 | Keygen failing ends with status 3 and W2, and touches nothing else: stderr contains the stub's output, `platform/challenge/new-chall/` and `pnpm challenge:keygen new-chall`; `_redirects` is byte-identical to before; `index.md`, `src/index.php` and `src/flag.txt` exist | unit | C03 / AC-11 | `_redirects` seeded with bytes that differ from the generated content, so a rewrite would show; the stub reports failure, and the stub throws: both give 3 |
| 0007-S4 | The generator refusing after keygen ends with status 2 and W1: stderr contains the generator's message (read by calling `generateRedirects(root)` after the run and catching it), `platform/challenge/new-chall/`, `platform/public/_redirects` and `git commit`; `_redirects` byte-identical; the scaffold stays; keygen ran once | unit, one `it.each` | C04, C06, C07 / AC-11 | C04: `a` and `b` both number 1 (the new challenge gets 2); C06: `platform/challenge/draft/index.md` whose frontmatter has no `number`; C07: the Traditional Chinese `door-is-open` brief carries 5 against the English 1. `_redirects` seeded with sentinel bytes |
| 0007-S4 | A write failure after keygen ends with status 2 and W1 carrying the write's error: stderr contains W1's substrings and the message of the error the test itself gets from `writeFileSync` on that path; the scaffold stays; `_redirects` is still a directory | unit | C09 / AC-11 | `platform/public/_redirects` is a directory; the expected error text is measured, not hard-coded, so it holds on any platform CI uses |
| 0007-S4 | An invalid argument or an existing slug ends with status 1 before any file is written: every path and byte under `root` equal their snapshot from before the run; the stub was never called; stderr starts with `Error:` | unit, one `it.each` | C05 / AC-11 | argv `[]`; `--name My-Chall`; `--name a_b`; `--name x --backend django`; `--name x --difficulty insane`; an unknown option `--nmae x`; a positional argument; `--name door-is-open` (per-folder `index.md` exists); `--name legacy` with `platform/challenge/legacy.md` present |
| 0007-S4 | The suite never touches the real tree: every `root` is under `os.tmpdir()`, and after the suite the real repository's `platform/public/_redirects` bytes equal their value before it | unit (`beforeAll` / `afterAll` in the same file) | spec Testing Decisions, S4 | runs while the guard test runs in parallel |
| existing tests | `tests/unit/scripts/create-challenge.test.ts` and `tests/unit/scripts/challenge-keygen.test.ts` pass unchanged; the full suite passes | unit, re-run | regression | the pure helpers (`validateArgs`, `checkCollision`, the skeletons, `generateMarkdown`) keep their exports and behaviour |
| CLI guard (not at S4) | The guard calls the entry with the repository root and a runner that executes `pnpm challenge:keygen <slug>` there, and exits with the returned status. Not an automated test: running it would write the real `_redirects`. Checked at stage 6 on the diff and at stage 8 | stage 6 diff review; stage 8 | AC-10, AC-11 (wiring) | — |
| stage 6 | G01: the guard test's assertion and inclusion rule and the CI steps are unchanged, checked with `git diff a54e917 -- tests/unit/site/redirects-generated.test.ts .github/workflows/` (expected empty) | stage 6 diff review | G01 / AC-17 | — |
| stage 8 (S7) | V03 as far as this ticket reaches: in a temporary local clone of the ticket branch under the scratchpad, on a throwaway branch that is never pushed, after `pnpm install` and `pnpm wasm:build`, `pnpm create:challenge --name <slug> --backend php` exits 0 and names `platform/public/_redirects`; the working tree's file holds the new `/c/NNN` rule, and `pnpm redirects:generate` then leaves `git diff` of it unchanged; after `git add platform/challenge/<slug>`, `pnpm vitest run tests/unit/site/redirects-generated.test.ts` passes. With `_redirects` replaced by a directory, a second run's `$?` is 2 through `pnpm`. The commit holding `_redirects` waits for T-0032 (see open points). The clone is removed afterwards | stage 8, CLI in a temporary local clone (terminal only; no page is involved) | V03 / AC-20 (partial) | Rust available; no step edits `_redirects` by hand |

Open points recorded with the plan:

1. Output sinks. The seam names only `root` and `runKeygen` as dependencies ("called with argv and
   the dependencies `root` … and `runKeygen`"), but observes "stdout and stderr", and vitest
   swallows `console.log` (`docs/agents/platform-notes.md:14` at `a54e917`). The entry therefore takes optional
   `stdout` and `stderr` sinks, which the CLI fills with `process.stdout` and `process.stderr`.
2. The runner's contract is not fixed ("`runKeygen` (a stub that succeeds or fails)"). The plan uses
   `runKeygen(slug, root)` returning `{ ok, output }`; a throw counts as failure. W2's "keygen's
   output" is taken as keygen's stderr followed by its stdout, since today's code prints only one of
   them (`scripts/create-challenge.ts:323` at `a54e917`).
3. W1 ahead of its hook. The spec has W1 say "that committing it regenerates `_redirects` from what
   is staged", which is true only once T-0032's hook lands, while this ticket lands first. W1 keeps
   the spec's sentence and also names `pnpm redirects:generate` as the way to rewrite the file once
   the cause is fixed; the message table asks for "at least the listed substrings", so the addition
   is allowed.
4. V03's commit. AC-20 has the clone run "`git add` of the new challenge and `git commit`" and expects
   "a commit holding the expected `_redirects`". Today's hook stashes the unstaged `_redirects`
   (`scripts/pre-commit.sh:28-30` at `a54e917`), so with this ticket alone the commit cannot hold it. This
   ticket's stage 8 stops at the guard on the staged working tree; the commit is T-0032's and
   T-0039's.
5. A scaffold write that fails (for example `EACCES` on `platform/challenge/`) has no status in the
   spec. D13 says "Status 1 then always means nothing was written", but today such a failure reaches
   the catch-all at `scripts/create-challenge.ts:333-336` at `a54e917`, which exits 1 after a partial write. No
   matrix row covers it, so this ticket leaves it as it is and does not test it.

Approval: The user approved this test plan in advance on 2026-10-21 with the standing instruction "所有的都按照你的建議執行、實踐" (follow and carry out every recommendation), given together with "/implement 完成 T-0030-T-0032 T-0036".

### 2026-10-21 — open points resolved (stage 5)

1. Output sinks: kept as planned. `run(argv, deps)` takes optional `deps.stdout` / `deps.stderr`
   (`(text: string) => void`); when absent they write to the process streams. Reason: the seam
   observes stdout and stderr, and vitest swallows `console.log`.
2. Runner contract: `runKeygen(slug, root)` returns `{ ok, output }`; a throw counts as failure and
   its message becomes the output. Both give status 3 (tested). The CLI runner uses `spawnSync` with
   the command string `pnpm challenge:keygen <slug>` in the repository root: on success it forwards
   keygen's stderr (its `[warn]` lines) to the process stderr, as today's inherited stderr did, and
   returns stdout as the output; on failure the output is stderr followed by stdout. Reason: W2 needs
   "keygen's output", and the earlier `err.stderr ?? err.stdout` printed one stream only.
3. W1 ahead of its hook: W1 keeps the spec's sentence ("git commit of the challenge then regenerates
   platform/public/_redirects from what is staged") and also names `pnpm redirects:generate`. Reason:
   the spec fixes W1's content, the messages table allows more than the listed substrings, and the
   added command is true before T-0032 lands. W2 likewise names `pnpm redirects:generate` after
   `pnpm challenge:keygen <slug>`, since a keygen failure leaves `_redirects` stale. P7's wording in
   the wxl-create skills is T-0031's.
4. V03's commit: unchanged. Stage 8 for this ticket stops at the guard test on the staged working
   tree; the commit holding `_redirects` belongs to T-0032 / T-0039.
5. A failing scaffold write (EACCES and similar): not decided by the spec and not covered by any
   row, so it is left as it is. It now ends as an uncaught exception, and node exits 1 with a stack
   trace, the same status as before (read from the code, not run). It contradicts D13's "Status 1 then always means nothing was
   written". **Follow-up for the user:** decide a status for it, or track it as a new ticket.
6. parseArgs errors (unknown option, positional argument) count as invalid arguments: `parseArgs` runs
   inside the validation `try` and returns 1 before any write (tested in C05).
7. The extra C08 case (no `_redirects` before the run) is kept: it holds for the fixture as
   described, and no other row contradicts it.

CLI guard: `process.exitCode = run(process.argv.slice(2), { root: ROOT, runKeygen: runKeygenCli })`.
`exitCode` replaces `process.exit()`, because `exit()` can cut off output still queued for a pipe
where the platform writes to pipes asynchronously (Node's "A note on process I/O"); the agent and
wxl-create read this script's output through a pipe.

### 2026-10-21 — red → green log (stage 5)

| Cycle | Test | Red | Green |
|---|---|---|---|
| 1 | C01, C02 success | `TypeError: run is not a function` (reproduced after the fact as M1) | `run()` exported; `writeRedirects(root)` after keygen |
| 2 | C08 (stale, hand edit, absent) | passed at once: cycle 1's rewrite delivers it. Mutation check M2 | no change |
| 3 | C03 (reports, throws) | `expected 1 to be 3` (reproduced after the fact as M3) | status 3, W2, a throw caught as failure |
| 4 | C04, C06, C07 | the generator's error escaped `run()` (reproduced after the fact as M4) | status 2, W1 |
| 5 | C09 | passed at once: cycle 4's catch covers the write. Mutation check M5 | no change |
| 6 | C05 (9 cases) | passed at once: cycle 1 moved `parseArgs` inside the `try`, which went ahead of that cycle. Mutation check M6 | no change |
| 7 | real-tree guard (`afterAll`) | mutation check M7 | assertions added |

The red outputs of cycles 1, 3 and 4 were observed in the loop; the code that gave them is gone, so
each is reproduced by a mutation of today's code that gives the same failure. Corrected at stage 6:
cycle 2 first said "all 4 tests fail" under M2; the reproducible run shows 8 failures, the 4 of
C01 and C08 plus the 4 of C04, C06, C07 and C09, which expect status 2 and get 0.

#### Mutation checks (reproducible, added at stage 6)

Each line applies one edit with `perl -0pi -e`, runs the S4 file, restores the file from a copy and
checks the restore with `cmp`. Run from the repository root:

```sh
mut() { f=$1; e=$2; b=$(mktemp); cp "$f" "$b"; perl -0pi -e "$e" "$f"; cmp -s "$f" "$b" && echo "did not apply"
  pnpm -s vitest run tests/unit/scripts/create-challenge-run.test.ts 2>&1 | grep -E '^ +(Test Files|Tests) | FAIL |TypeError'
  cp "$b" "$f"; cmp "$f" "$b" && echo restored; rm -f "$b"; }
S=scripts/create-challenge.ts; T=tests/unit/scripts/create-challenge-run.test.ts
mut $S 's/^export function run\(/export function runRenamed(/m'                                   # M1
mut $S 's/^    writeRedirects\(root\)$/    \/\/ writeRedirects(root)/m'                               # M2
mut $S 's/^    return 3$/    return 1/m'                                                             # M3
mut $S 's/(  \} catch \(e\) \{\n)(    \/\/ W1\.)/$1    throw e\n$2/'                                  # M4
mut $S 's/(  \} catch \(e\) \{\n)(    \/\/ W1\.)/$1    if ((e as { code?: string }).code) throw e\n$2/' # M5
mut $S 's/^(  let opts: ScaffoldOptions\n)/  parseArgs({ args: argv, options: { name: { type: "string" }, title: { type: "string" }, backend: { type: "string" }, difficulty: { type: "string" }, flag: { type: "string" } } })\n$1/m' # M6
mut $T 's/^  madeRoots\.push\(root\)$/  madeRoots.push(root, join(REPO_ROOT, "not-a-temp-root"))/m'      # M7
```

| Id | Mutation | Result (run 2026-10-22, after the stage 6 test refactor) |
|---|---|---|
| M1 | `run` no longer exported under that name | `Tests  19 failed (19)`, `TypeError: run is not a function` |
| M2 | `writeRedirects(root)` commented out | `Tests  8 failed \| 11 passed (19)`: C01, the 3 C08 cases, C04, C06, C07, C09 |
| M3 | W2's `return 3` changed to `return 1` | `Tests  2 failed \| 17 passed (19)`: both C03 cases |
| M4 | the W1 catch rethrows every error | `Tests  4 failed \| 15 passed (19)`: C04, C06, C07, C09 |
| M5 | the W1 catch rethrows errors that carry a `code` | `Tests  1 failed \| 18 passed (19)`: C09 |
| M6 | a `parseArgs` call added ahead of the validation `try` | `Tests  2 failed \| 17 passed (19)`: the unknown-option and positional C05 cases |
| M7 | a path inside the repository recorded as a root | `Tests  19 passed (19)`, `Test Files  1 failed (1)`: the `afterAll` check fails the file |

Every run printed `restored`.

### 2026-10-21 — coverage report (stage 5)

No coverage provider is installed: `pnpm vitest run --coverage --coverage.include=scripts/create-challenge.ts tests/unit/scripts/create-challenge-run.test.ts tests/unit/scripts/create-challenge.test.ts`
→ `MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'`. None was installed. Coverage
below is mapped branch by branch on `run()`, not measured.

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0007-S4 | `create-challenge-run.test.ts` › a successful run | not measured (no provider); branch: success path, status 0 | C01, C02 / AC-10 | — |
| 0007-S4 | › _redirects that differ from the generated content (3 cases) | not measured; branch: success path with stale, hand-edited and absent file | C08 / AC-10 | — |
| 0007-S4 | › keygen fails after the scaffold was written (2 cases) | not measured; branches: `!keygen.ok` and the runner's throw | C03 / AC-11 | — |
| 0007-S4 | › the generator refuses the tree after keygen (3 cases) | not measured; branch: `writeRedirects` catch, generator refusal | C04, C06, C07 / AC-11 | — |
| 0007-S4 | › _redirects cannot be written | not measured; branch: `writeRedirects` catch, write error | C09 / AC-11 | — |
| 0007-S4 | › an invalid argument or an existing slug (9 cases) | not measured; branches: validation catch (parseArgs, validateArgs), collision catch | C05 / AC-11 | — |
| 0007-S4 | `afterAll`: roots under `os.tmpdir()`, real `_redirects` unchanged | not measured | spec Testing Decisions | — |
| existing | `create-challenge.test.ts`, `challenge-keygen.test.ts`, full suite | unchanged files, all pass | regression | — |
| CLI guard | none (by design) | 0 automated | AC-10, AC-11 wiring | `runKeygenCli` and the guard run the real keygen and write the real `_redirects`; checked at stage 6 on the diff and at stage 8. Only the status-1 path was run by hand (below) |
| 0007-S4 | none | — | — | the default sinks (`deps.stdout` / `deps.stderr` absent) are used only by the CLI. Only the default stderr sink was exercised, by the two status-1 hand runs below; the default stdout sink, the success path and statuses 2 and 3 through the CLI are left to stage 8 (V03). A failing scaffold write has no row (open point 5) |

Commands and results, in `/Users/phoenix/dev/browserlab/wxl-platform`:

- `pnpm vitest run tests/unit/scripts/create-challenge-run.test.ts` → `Tests  19 passed (19)`
- `pnpm vitest run tests/unit/scripts/` → `Test Files  28 passed (28)`, `Tests  2281 passed | 1 skipped (2282)`
- `pnpm test --run` → `Test Files  128 passed (128)`, `Tests  4222 passed | 1 skipped (4223)` (baseline on a54e917: 127 files, 4203 passed, 1 skipped; the new file adds 19)
- `pnpm -s challenge:validate; echo $?` → `All checks passed.`, `0`
- `pnpm -s create:challenge --nmae x; echo $?` → `Error: Unknown option '--nmae'` and the usage line, `1`; `git status --short` unchanged
- `pnpm -s create:challenge --name door-is-open; echo $?` → `Error: Challenge "door-is-open" already exists: …`, `1`; `git status --short` unchanged
- For reference, ahead of stage 6: `git diff a54e917 --stat -- tests/unit/site/redirects-generated.test.ts .github/workflows/ scripts/generate-redirects.ts` → empty. G01 stays unticked until stage 6 checks it.

No typecheck script is configured (`package.json` has none), so none was run.

Stage 6 update: the S4 file was refactored (shared `SENTINEL`, `NEW_DIR`, `SCAFFOLD_FILES`,
`expectScaffold`, `expectW1`; `SCAFFOLD` derived from `SCAFFOLD_FILES`). It holds the same 19 cases
and the same assertions, so every row above stands. Rerun after the refactor, in the repository
root: `pnpm vitest run tests/unit/scripts/create-challenge-run.test.ts` → `Tests  19 passed (19)`.

### 2026-10-21 — code review (stage 6)

Review: four axes, each candidate checked by three independent skeptics; a finding counts as
confirmed when at least two of the three agree it is real. Confirmed findings and what was done:

| # | Axis | Finding | Verdict | Done |
|---|---|---|---|---|
| F1 | Standards | The red → green log's mutation checks (cycles 2, 5, 6, 7) and red outputs (cycles 1, 3, 4) carry no command that reproduces them | confirmed 3/3 | Fixed: the log now names mutations M1–M7, each a one-line `perl -0pi -e` edit with the test command, the restore and a `cmp` check, and their results. Cycles 1, 3 and 4 are reproduced as mutations of today's code. The block was run verbatim (commands below). It also corrected a claim: M2 fails 8 tests, not the 4 first recorded |
| F2 | Standards | The coverage table said both default sinks were exercised by the hand runs, which both end at status 1 and so reach only stderr | confirmed 3/3 | Fixed: the row now says only the default stderr sink was exercised; the default stdout sink, the success path and statuses 2 and 3 through the CLI are left to stage 8 (V03) |
| F3 | Standards | The stage 8 row called the CLI surface "Code panel only", the project's name for the challenge page's Python panel | confirmed 3/3 | Fixed: "CLI in a temporary local clone (terminal only; no page is involved)" |
| F4 | Standards | Duplicated test code: the scaffold check three times, `SENTINEL` twice, W1's substrings twice | confirmed 2/3 | Fixed: `expectScaffold`, `expectW1`, one `SENTINEL`, `SCAFFOLD` derived from `SCAFFOLD_FILES`. Same 19 cases; behaviour unchanged, so no new red test |
| F5 | Spec | `path:line` references in the open points were not pinned to a commit, and `scripts/create-challenge.ts:323` and `:333-336` now point at other lines | confirmed 3/3 | Fixed: each reference now says "at `a54e917`" (read with `git show a54e917:<path>`; checked below). The claim that a failing scaffold write now ends as an uncaught exception is marked "read from the code, not run" |

Rejected by the skeptics (not acted on), with their reasons in short:

| Axis | Finding | Confirmed | Reason |
|---|---|---|---|
| Standards | Test plan approved by a standing instruction given before the plan | 0/3 | The user's request authorised following every recommendation; the record states the approval's form; no rule requires a per-table approval |
| Standards | `status` went from `todo` to `review` with no `processing` visible | 0/3 | `status` is an overwritten field and nothing was committed, so a diff cannot show the transition; no rule asks for a record of it |
| Standards | `runKeygenCli` uses a shell string, unlike `execFileSync` argument arrays elsewhere | 0/3 | The base `execSync` was already a shell string; the slug is kebab-case by then; no documented convention; `pnpm.cmd` on Windows needs a shell |
| Standards | `runKeygenCli`'s comment "as they happen today" though stderr is forwarded after keygen exits | 0/3 | The comment is about where warnings go; Node's `execSync` also buffered stderr; ordering is unchanged |
| Standards | `runKeygenCli` writes `process.stderr` directly, around `run()`'s sinks | 0/3 | It is the CLI-only adapter; with the CLI the sinks are the process streams; tests replace the runner; the docstring records why |
| Standards | Header says status 1 means "nothing was written" though a failing scaffold write exits 1 | 1/3 | The line describes the two causes it names, both of which return before any write; the write failure is open point 5, already with the user |
| Standards | W1 describes hook behaviour that lands only with T-0032 | 0/3 | The sentence is the spec's (traceability W1 needs `git commit`); W1 also names `pnpm redirects:generate`, true now; open point 3 records it |
| Standards | `process.exitCode` differs from the other scripts' `process.exit()` | 0/3 | No documented convention; Node recommends `exitCode` for piped output; the other scripts are outside the ticket |
| Standards | C01 and C08 compute the expected file with `generateRedirects` | 0/3 | AC-10 defines the expectation as `generateRedirects(root)`; the unit under test is `run()`'s wiring; M2 shows the tests can fail |
| Standards | C04, C06, C07 read the expected message from the generator | 0/3 | W1 is defined as the generator's message; the test checks that `run()` forwards it; a literal would couple the test to the generator's wording |
| Standards | The `afterAll` real-tree guard is tautological and too narrow | 0/3 | It guards the fixture, as the spec's Testing Decisions ask; M7 shows it can fail; a `run()` using the real root fails C01 and C08 first |
| Standards | C09's `platform/public/_redirects` assertion is met by the error text itself | 0/3 | W1 has one template; C04, C06 and C07 assert the same substring where the message lacks it |
| Standards | C08 holds a conditional assertion | 0/3 | It guards only a precondition, fixed per row; the outcome assertions run for every row |
| Standards | Messages hard-code `platform/public/_redirects` instead of `writeRedirects`'s return value | 0/3 | The spec fixes the substring; the return value is absolute and absent on the failure paths |
| Standards | `err` is a mysterious name for the stderr sink | 0/3 | Declared next to `deps.stderr`; catch variables are `e`; common `out`/`err` pairing |
| Standards | Exit statuses 0–3 are bare numbers | 0/3 | The spec's contract is the numbers; the header documents them; repository practice |
| Standards | The test types `deps` as `Parameters<typeof run>[1]`, not `RunDeps` | 0/3 | Same type; existing tests use the same form; no documented rule |
| Standards | `KeygenResult.output`'s comment is imprecise | 0/3 | An interface summary; `runKeygenCli`'s docstring has the detail |
| Standards | stderr and stdout are joined without a separator | 0/3 | W2 only needs keygen's output; both streams end in newlines in practice |
| Standards | `runKeygenCli` sits under the "CLI guard" heading | 0/3 | It runs only from the guard and is not exported; same layout as the base's Main section |
| Standards | The W1 catch comment covers only a generator refusal | 0/3 | The comment is correct for what it says; AC-11 promises byte identity only for a refusal |
| Standards | "Traditional Chinese brief" is not in GLOSSARY | 0/3 | The spec, the matrix and `docs/agents/challenge-pipeline.md` use the phrase; glossary scope is the epic's |
| Spec | W1's `git commit` sentence is untrue while T-0030 lands alone | 0/3 | Spec-mandated; W1 names `pnpm redirects:generate`; landing order was approved at stage 4 |
| Spec | A failing scaffold write exits 1 after a partial write, against D13 | 0/3 | Base behaviour, unchanged; no row covers it; open point 5 hands it to the user |
| Spec | Today's wxl-create Step 2 does not know statuses 2 and 3 | 0/3 | T-0031's scope (`blocked_by: [T-0030]`); status 3 now stops instead of re-asking the name |
| Spec | W2's extra `pnpm redirects:generate` differs from P7 | 0/3 | The table allows more than the listed substrings; the step is needed before T-0032; P7 is T-0031's |
| Spec | C01 hard-codes `/c/003` instead of `padChallengeNumber` | 0/3 | The approved plan's row names `/c/003`; a literal is the stronger oracle |
| Spec | The coverage report has no measured numbers | 0/3 | No provider installed (OQ-009, the repository's standing practice); installing one is outside the ticket |
| Spec | The collision check ignores a Traditional Chinese orphan brief and a retired slug | 0/3 | Unchanged code; C07 specifies status 2 for that tree; a retired number, not slug, is reserved |
| Spec | `spawnSync`'s 1 MiB `maxBuffer` could turn a big keygen output into status 3 | 0/3 | Keygen prints a few hundred bytes; the base `execSync` had the same limit |
| Spec | CI's first-push failure does not go away with T-0030 alone | 0/3 | Staging `_redirects` is the hook's (T-0032); open point 4 records it; no regression |
| Spec | The CLI guard's wiring has no automated observation | 0/3 | The spec forbids running S4 in the real tree; pnpm's status passthrough is measured in the spec; stage 8 covers it |

Stage 6 rows: G01 checked and ticked. Commands and results, in the repository root:

- `git diff a54e917 -- tests/unit/site/redirects-generated.test.ts .github/workflows/ | wc -l` → `0` (G01)
- `git show a54e917:scripts/create-challenge.ts | sed -n '323p;333,336p'` → the `console.error(err.stderr ?? err.stdout ?? err.message)` line and the `main().catch(…)` catch-all (F5)
- `git show a54e917:scripts/pre-commit.sh | sed -n 28,30p` → the `git stash push --keep-index …` block; `git show a54e917:docs/agents/platform-notes.md | sed -n 14p` → the vitest `console.log` note (F5)
- the mutation block above, run verbatim with `bash` → the results in its table, `restored` seven times; `shasum` of both files equal before and after (F1)
- `pnpm vitest run tests/unit/scripts/create-challenge-run.test.ts` → `Tests  19 passed (19)` (F4)
- `pnpm vitest run tests/unit/scripts/` → `Test Files  28 passed (28)`, `Tests  2281 passed | 1 skipped (2282)`
- `pnpm test --run` → `Test Files  128 passed (128)`, `Tests  4222 passed | 1 skipped (4223)`
- `pnpm -s challenge:validate; echo $?` → `0` (`All checks passed.`)

`scripts/create-challenge.ts` was not changed at stage 6.

### 2026-10-21 — security review (stage 7)

Report: [`.proj.specs/0007-gh-pages-range-fixes/review/security-T-0030.md`](../../.proj.specs/0007-gh-pages-range-fixes/review/security-T-0030.md).
Eight candidates against B5; the skeptics rejected each one (0/3), so no security finding is
confirmed and nothing was changed for stage 7. The report records each candidate's location,
attacker prerequisites, data flow, impact, evidence and the skeptics' reasons, and the reviewer's
coverage limits. It does not claim the project is secure.

| # | Candidate | Confirmed | Done |
|---|---|---|---|
| S1 | `runKeygenCli` runs a shell string holding the slug (`shell: true`) | 0/3 | none; optional hardening noted |
| S2 | `writeRedirects` follows a symbolic link | 0/3 | none; spec Out of Scope; chain analysis at close-out |
| S3 | A hand-edited `_redirects` is replaced without warning | 0/3 | none; AC-10 / C08 require it |
| S4 | Untracked drafts' slugs reach the working tree's `_redirects` | 0/3 | none; the spec asks for the whole working tree; deploys rebuild the file |
| S5 | Generator messages and keygen output reach the terminal unescaped | 0/3 | none; base behaviour through `pnpm dev` / `pnpm build` |
| S6 | The collision check reads only `index.md`; existing `src/` files are overwritten | 0/3 | none; base behaviour; possible follow-up |
| S7 | A failing scaffold write exits 1 | 0/3 | none; open point 5 stays with the user |
| S8 | The ticket record holds a local absolute path | 0/3 | none; OQ-010 |

Commands rerun for stage 7 are those of stage 6 above: `pnpm test --run` → `128 passed`,
`4222 passed | 1 skipped`; `pnpm -s challenge:validate` → exit `0`.

### 2026-10-21 — end-to-end (stage 8, local)

Surface for every row: the terminal of a temporary local clone in a scratch directory (`${SCRATCH}`
below), never the Browser panel; no page is rendered by this ticket's change. Clone setup, run from
the repository root on this branch's working tree (base a54e917 plus the uncommitted T-0030 change):

```bash
git clone -q --no-hardlinks . "${SCRATCH}/clone"
git -C "${SCRATCH}/clone" checkout -q -b e2e-throwaway a54e917
git diff a54e917 --binary > "${SCRATCH}/wt.patch" && git -C "${SCRATCH}/clone" apply "${SCRATCH}/wt.patch"
cp .proj.specs/0007-gh-pages-range-fixes/review/security-T-0030.md "${SCRATCH}/clone/.proj.specs/0007-gh-pages-range-fixes/review/"
cp tests/unit/scripts/create-challenge-run.test.ts "${SCRATCH}/clone/tests/unit/scripts/"
git -C "${SCRATCH}/clone" remote remove origin    # nothing can be pushed from the clone
(cd "${SCRATCH}/clone" && pnpm install --frozen-lockfile)   # installs today's simple-git-hooks pre-commit
cp -R .vitepress/wasm "${SCRATCH}/clone/.vitepress/" && cp -R platform/public/challenge "${SCRATCH}/clone/platform/public/"
```

`shasum` of `scripts/create-challenge.ts` and `tests/unit/scripts/create-challenge-run.test.ts`
matched between the checkout and the clone. The remaining commands run in `${SCRATCH}/clone`.

| Row | Surface | Result | Command → observed |
|---|---|---|---|
| E1 no arguments | clone terminal, through pnpm | pass | `pnpm create:challenge; echo $?` → `1`, stderr `Error: Missing required argument: --name <slug>` plus usage; `git status --short` unchanged (nothing written) |
| E2 scaffold + regenerate | clone terminal, through pnpm, real keygen (Rust, wasm-pack) | pass | `pnpm create:challenge --name e2e-probe --backend php; echo $?` → `0`; stdout ends `✓ Keygen complete.` and `✓ Regenerated platform/public/_redirects — challenge is ready.`; `diff` against the pre-run copy → one added line `/c/011       /challenge/e2e-probe/                302` |
| E3 commit through today's hook | clone terminal, `git commit` with the simple-git-hooks pre-commit | pass | `git add platform/challenge/e2e-probe platform/public/_redirects`, message generated with `/tw-emoji-commit` (draft → `sanitize_commit.py` → file), `git commit -F <file>; echo $?` → `0`, hook printed `[pre-commit] ✓ e2e-probe`; `git show --stat HEAD` → the three challenge files and `platform/public/_redirects` (1 insertion); `git stash list \| wc -l` → `0` |
| E4 guard test on the commit | clone terminal, vitest | pass | `git diff --quiet HEAD -- platform/public/_redirects && echo same` → `same`; `pnpm vitest run tests/unit/site/redirects-generated.test.ts` → `Test Files  1 passed (1)`, `Tests  10 passed (10)` |
| E5 control: guard catches a stale file | clone terminal, vitest | pass (fails as expected) | copy the pre-run `_redirects` back, rerun the guard test → exit `1`, `Tests  1 failed \| 9 passed (10)`; `git checkout -- platform/public/_redirects` restored it |

Clean-up: `rm -rf "${SCRATCH}/clone"`; no server was started (`lsof -tnP -iTCP:4173 -sTCP:LISTEN`
→ empty). In the real checkout `git status --short` is as before and `git stash list` is empty.

Reach of this record, as open point 4 says: `_redirects` was staged by the explicit `git add` the
stage 8 instructions name, not by the hook; V03's "no step for `_redirects` by hand" as a whole
needs T-0032's hook and is run at the epic's last ticket (AC-20). The ticket PR's CI and the
Cloudflare preview (V01) are not part of this local run; the parent records them after pushing.

### 2026-10-21 — completeness check

Checked on the working tree (base `a54e917` plus the uncommitted T-0030 change), commands run from
the repository root unless a line says otherwise.

Acceptance criteria, each against the test or command that observes it:

| Criterion | Observed by |
|---|---|
| C01, C02 | `create-challenge-run.test.ts` › "a successful run": status 0, bytes equal `generateRedirects(root)`, `/c/003` rule, stdout names `platform/public/_redirects` |
| C03 | › "keygen fails after the scaffold was written" (reports, throws): status 3, W2's substrings, `_redirects` equals the sentinel, scaffold files exist |
| C04, C06, C07 | › "the generator refuses the tree after keygen" (`it.each`, 3 rows): status 2, the generator's message and W1's substrings, sentinel kept, scaffold exists |
| C05 | › "an invalid argument or an existing slug" (9 rows): status 1, snapshot of every path under `root` unchanged, stub never called |
| C08 | › "_redirects that differ from the generated content" (stale, hand edit, absent): file equals `generateRedirects(root)` |
| C09 | › "_redirects cannot be written": status 2, the measured `writeFileSync` error and W1's substrings, path still a directory, scaffold exists |
| G01 | `git diff a54e917 -- tests/unit/site/redirects-generated.test.ts .github/workflows/ scripts/generate-redirects.ts \| wc -l` → `0` |
| Stage 8 | E1–E5 above, plus the two rows the approved plan named but the stage 8 record left out, run now (below) |

Every ticked box has an observation; none was unticked.

Stage 8 rows the plan named and the record omitted ("`pnpm redirects:generate` then leaves `git diff`
of it unchanged" and "a second run's `$?` is 2 through `pnpm`"), and status 3 through the CLI, which
the coverage report left to stage 8. Run in a temporary local clone made as in the stage 8 setup
(`git clone -q --no-hardlinks . "$W/cc"`, throwaway branch at `a54e917`, the working-tree diff
applied, the new test file copied, `origin` removed, `pnpm install --frozen-lockfile --offline`,
`.vitepress/wasm` and `platform/public/challenge` copied in; `shasum` of `scripts/create-challenge.ts`
equal in both). Surface: the clone's terminal; no page is involved. In `"$W/cc"`:

- `pnpm -s create:challenge --name cc-probe --backend php; echo $?` → `0`; stdout ends
  `✓ Regenerated platform/public/_redirects — challenge is ready.`; `diff` against the pre-run copy →
  one added line `/c/011       /challenge/cc-probe/                 302`
- `pnpm -s redirects:generate` → `0`; `cmp` with the post-run copy → equal (unchanged)
- `git add platform/challenge/cc-probe; pnpm vitest run tests/unit/site/redirects-generated.test.ts`
  → `Test Files  1 passed (1)`, `Tests  10 passed (10)`
- `mv platform/public/_redirects …; mkdir platform/public/_redirects;
  pnpm -s create:challenge --name cc-probe-two --backend php; echo $?` → `2`; stderr is W1 with
  `EISDIR: illegal operation on a directory, open '…/platform/public/_redirects'`; the scaffold's
  `index.md`, `src/index.php`, `src/flag.txt` exist; the path is still a directory. Restored afterwards
- `mv .vitepress/wasm …; pnpm -s create:challenge --name cc-probe-three --backend php; echo $?` → `3`;
  stderr is W2 with keygen's `Template WASM not found: …` and `pnpm challenge:keygen cc-probe-three`;
  `cmp` of `_redirects` with its copy from before the run → equal; the scaffold exists. Restored afterwards
- `rm -rf "$W/cc"`. In the real checkout afterwards: `git status --short` as before,
  `git stash list | wc -l` → `0`, `shasum platform/public/_redirects` unchanged
  (`3ab08354…`), `lsof -tnP -iTCP:4173 -sTCP:LISTEN` → empty

Ticket record: the test plan table with its approval line, the coverage report table, the code review
(stage 6) and security review (stage 7) subsections and the stage 8 subsection are present;
`.proj.specs/0007-gh-pages-range-fixes/review/security-T-0030.md` exists.

Required commands:

- `pnpm test --run`, four runs: the first ended `Test Files  1 failed | 127 passed (128)`,
  `Tests  1 failed | 4221 passed | 1 skipped (4223)`; its output was cut to the summary, so the
  failing test is not identified. The next three passed; the last two in full:
  `Test Files  128 passed (128)`, `Tests  4222 passed | 1 skipped (4223)`. The S4 file alone, five
  runs of `pnpm -s vitest run tests/unit/scripts/create-challenge-run.test.ts` → `Tests  19 passed (19)`
  each time. Recorded as a transient failure not attributed to this change; other worktrees were
  running suites on the same machine at the time
- `pnpm -s challenge:validate; echo $?` → `All checks passed.`, `0`
- `pnpm vitest run tests/unit/site/redirects-generated.test.ts tests/unit/site/redirects.test.ts` →
  `Test Files  2 passed (2)`, `Tests  22 passed (22)`, exit `0`
- `git diff a54e917 -- platform/public/_redirects | wc -l` → `0`

Working tree: `git status --short` → the ticket file and `scripts/create-challenge.ts` modified,
`security-T-0030.md` and `tests/unit/scripts/create-challenge-run.test.ts` untracked; all four are in
the ticket's scope. `git status --short --ignored` lists only ignored folders (build output,
`node_modules`, `test-results/` from 2026-10-14, local `.proj.handoffs/` and `.proj.research/`); no
stray artifact is left. Frontmatter `status: review`.

Still open for the user, not a gap in this ticket's rows: open point 5 (a failing scaffold write
exits 1 after a partial write, against D13).

### 2026-10-23 — landed (stage 9)

PR [#36](https://github.com/BrowserLaboratory/wxl-platform/pull/36), squash-merged into `main` by the
user as `e5ad839` (2026-10-23 08:30 UTC), carrying `a54e917` (the epic's spec, review rounds,
tickets, `GLOSSARY.md` and `OPEN-QUESTIONS.md`) and `1cc71be`. CI: 10 checks passing, none failing;
the Cloudflare Pages preview deployed. No page is involved in this ticket, so stage 8 stays the local
V03 run above. Open point 5 (a failing scaffold write exits 1) is still open for the user.
Frontmatter `status: done`.

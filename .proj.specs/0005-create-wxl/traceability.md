# Traceability: 0005-create-wxl

`{type × field × boundary} → {expected behaviour → acceptance criterion}`. The spec is derived from
this file. Stage 1 decisions: Q1–Q24, E1–E6, F1–F3 (2026-10-14) and R1–R10 (2026-10-16). Where an
R-decision revises an earlier one, it holds: R2 (the setup record holds only `upstream`), R7
(create-wxl asks the setup questions in the terminal and runs `git init`, revising Q1 and Q8b), R8
(create-wxl runs the platform's own fork-init engine, carried inside the package), R9 (Charter).
Seams approved by the user on 2026-10-16, including create-wxl's runtime dependencies `tar` and
`yaml` (revising Q19).

Revision 2 (2026-10-16) applies round 1's disposition (`review/disposition.md`, groups N1–N10) and
the user's decisions D1 and D2 of 2026-10-16. Round 2 found no P0 (`review/round-2.md`), so the stage 3
gate is met. Revision 2.1 (2026-10-16, decision D3) applies round 2's P1 groups Q1–Q6 and the P2
fixes listed in `review/disposition-2.md`, without another review round; rows added in 2.1 start at
C64. Row ids C01–C49 keep their meaning where they survive;
rows added in revision 2 start at C50. The decisions this file relies on, in short (the full
record is the local research note `.proj.research/2026-10-16-w45-create-wxl-upgrade-grill.md`):

| Id | Decision |
|---|---|
| R1 | Deadlines: this epic lands by 2026-10-16 18:00 |
| R2 | `range.json` holds only `upstream` (repository, version, commit); create-wxl writes it; fork:init never does |
| R7 | create-wxl asks five questions, applies them with the engine and runs `git init` plus one commit; `--no-setup` skips that |
| R8 | create-wxl carries the type-stripped engine of the same platform version |
| R9 | The Charter is revised (U4) |
| D3 | Round 2's P1 findings are fixed in revision 2.1 without another round |
| D4 | The user reserves the npm name with a placeholder `create-wxl@0.0.0`; `checkPublish` checks the name's maintainers (X9) |
| D2 | ① rebrand mode leaves `range.json` untouched; ② a tree with `range.json` is not upstream; ③ create-wxl's tests live in `create-wxl/`; ④ `prepack` builds `dist/`, `prepublishOnly` only checks; ⑤ re-asking asks every question; ⑥ `npm create … -- --flags`; ⑮ the override prints a warning; ⑯ dead references in ranges are a known limit |

## Seams

| Seam | Entry point | Observable output |
|---|---|---|
| 0005-S1 | create-wxl's exported `run(argv, io, deps)`. `io`: `stdin`, `stdout`, `stderr` streams and `interactive` (boolean). `deps`: `env` (map), `cwd`, `nodeVersion`, `locale`, `packageVersion` (the package manifest's `version`), `source` (`{ repository, version, commit, engineSha256 }`), `engine` (`{ parseForkInitArgs, runForkInit, deriveGithubPagesOrigin, ForkInitArgError, UPSTREAM_SLUG }`), `fetchArchive(repository, ref, { signal })` resolving, once the whole body is read, to `{ status, body }` with `body` a `Uint8Array`, or rejecting on a network error or abort, `downloadTimeoutMs`, `runGit(args, { cwd, env })` resolving to `{ code, stdout, stderr }` or rejecting with `code: 'ENOENT'`, `fs` (the `node:fs/promises` functions it uses, replaceable one by one to inject a failure), `signals` (an event emitter on which `SIGINT`, `SIGTERM`, `SIGHUP` arrive), `checkpoint(name)` (called as `step-3` … `step-13` at the start of each step and as `question` before each question; a signal emitted from it belongs to that step's window). The `bin` passes the real values: `process` streams, `isTTY` of stdin and stdout, `process.env`, `process.cwd()`, `process.versions.node`, `Intl.DateTimeFormat().resolvedOptions().locale`, the manifest's `version`, `dist/source.json`, `dist/fork-init.mjs`, a `fetch`-based fetcher, 120000, a `child_process.spawn`-based runner, `node:fs/promises`, `process`, and a no-op | files under the test's temporary directory (content and mode); the resolved exit code; the text written to `stdout` and `stderr`; the calls each injected dependency received |
| 0005-S2 | create-wxl's exported `prepareDist({ root, module })` and `checkPublish({ root, module, runGit, archive, npmView })`, called in a test on a temporary git repository holding copies of the files they read (both manifests, both `.gitignore` files, `LICENSE`, the engine, `pnpm-lock.yaml`, `CHANGELOG.md`, `.proj.specs/OPEN-QUESTIONS.md`), with lightweight and annotated tags, with `node_modules` linked to the repository's so that the generated engine resolves `yaml`; `module` is `node:module` or a stand-in without `stripTypeScriptTypes`; `archive` returns the archive of a commit as bytes (the real one runs `git archive --prefix=<name>-<commit>/`); `npmView` returns the registry's maintainers of `create-wxl` (the real one runs `npm view create-wxl maintainers --json`, empty on a 404); `runGit`'s `ls-remote` is stubbed | the returned or thrown result (check id); files in `dist/`; importing the generated engine and calling its `parseForkInitArgs` |
| 0005-S3 | tests in `create-wxl/test/` (which exist only upstream, so need no skip) reading the real tracked files: `.gitattributes`, both manifests, create-wxl's lockfile, `quality-gates.yml` (parsed with `yaml`), `AGENTS.md`, both READMEs, `.proj.specs/OPEN-QUESTIONS.md`, `GLOSSARY.md`, both `wxl-fork-init` skills; and `git archive HEAD` run through the entry rules; plus, in `tests/unit/scripts/upstream-guard.test.ts`, the upstream decision with its new `range.json` input | pass or fail; the archive's path list |
| 0005-S4 | stage 8, local, on the HEAD of the epic's last ticket that changes create-wxl, pushed: in the package directory `pnpm install --frozen-lockfile` then `npm pack` (whose `prepack` builds `dist/`); in an empty temporary directory, the runs of "Stage 8 inputs" with `CREATE_WXL_COMMIT=<HEAD>`, interactive runs driven through a pseudo-terminal (`script -q /dev/null …` on macOS) with the listed input; in each resulting range the reads listed there; afterwards `dist/` and the `.tgz` are removed | exit codes, terminal text, the listed file contents and path lists |

0004-S1 (`parseForkInitArgs` then `runForkInit`) is reused: create-wxl calls exactly that pair on the
new range, so 0004's B1 guarantees apply (chain-analysis N-5 does not arise). Two engine changes, each
an explicit override (see "Overridden contracts"): rebrand mode does not rewrite the root `range.json`
(it is still scanned for residual `wxl`), and `deriveGithubPagesOrigin` is exported.

Tests of S1–S3 live under `create-wxl/test/`, import the engine from the repository's
`scripts/fork-init.ts` (vitest strips types), and run with create-wxl's own vitest and lockfile; they
never enter a range (U1). Like every tracked file outside the upstream guard's keep list, create-wxl's
sources, tests and fixtures never spell the upstream repository slug; they import `UPSTREAM_SLUG`.
Tests that set a parent read-only or check modes skip on Windows and when running as root; git tests
pass `deps.env` = `{ HOME, PATH, XDG_CONFIG_HOME }` pointing at temporary directories.

## Fixed lists

### Vocabulary

| Term | Meaning here |
|---|---|
| create-wxl | the npm package `create-wxl`, run by `npm create wxl` / `pnpm create wxl`; the command that creates a range. Not a dev module (GLOSSARY) |
| platform version V | the `version` of upstream's root manifest at the commit create-wxl was built from; create-wxl's own `version` equals it; it matches `^\d+\.\d+\.\d+$` (X2) |
| package source record | `dist/source.json` inside the package: `{ "repository", "version", "commit" }`. Not the setup record: the setup record is the range's `range.json` (GLOSSARY 設定紀錄) |
| pristine range | GLOSSARY 原廠靶場: the archive of one upstream commit after P1–P4, before any setting is applied. Unrelated to 0004's "upstream-pristine check", which asks whether upstream itself is unconfigured |
| setup | asking S1–S5, applying them with the engine, and the git steps G1–G4 |
| empty directory | an existing directory, by `lstat` not a symbolic link, whose listing has no entries (dotfiles count) |

### Command grammar

```
create-wxl [<directory>] [--author <name>] [--repo <owner/name>] [--host <host>]
           [--origin <url>] [--site-name <name>] [--no-setup] [--lang en|zh-TW]
```

- Flags take their value as the next argument or after `=` (`--author=Ada`). A next argument that
  begins with `-`, or an empty value after `=`, is a missing value. A lone `--` ends flag parsing; what
  follows is positional. A single `-` or any argument beginning with one `-` (before `--`) is an
  unknown flag. `--no-setup` takes no value; `--no-setup=…` is an argument error.
- At most one positional argument, non-empty. Unknown flags, a repeated flag, a flag without a value,
  an empty positional, a second positional, a `--lang` other than `en` or `zh-TW`, or any positional
  equal to `upgrade` (reserved for 0006 wherever it appears; matched exactly) are argument errors
  (CW-E02). Argument errors are checked before the package source record (CW-E13).
- `--no-setup` with any of `--author`, `--repo`, `--host`, `--origin`, `--site-name` is CW-E02.
- `--host`, `--origin`, `--site-name`, `--author`, `--repo` values from flags are passed to the engine
  verbatim (not trimmed); create-wxl does not check them, and the engine's rejections are CW-E06
  (non-interactive) or a re-ask. Only the exact value `cloudflare-pages` makes `--origin` required.
- No `--help` or `--version`: they are unknown flags (CW-E02), whose message names
  `create-wxl <directory>` as the usage.
- Through npm the flags need `--`: `npm create wxl <directory> -- --author …`. pnpm passes them as is.

### Interactive or not

`io.interactive`: in the `bin`, stdin and stdout are both TTYs. Otherwise non-interactive.

### Language

`--lang` if given and valid; otherwise the first of `LC_ALL`, `LC_MESSAGES`, `LANG` in `deps.env`
that is set and non-empty; otherwise `deps.locale`. A value beginning with `zh` (any case) selects
`zh-TW`; anything else (including `C` and `POSIX`) selects `en`. CW-E01 and CW-E02 use the
environment rule only (they happen before or during parsing). Each message, question and next-step
line has an id; the two message tables have the same id set, and each `zh-TW` text differs from its
`en` text in its words (commands, paths and codes inside a line are the same in both). Only text
create-wxl itself prints is translated; the engine's messages and warnings are printed as the engine
wrote them (English).

### Step order

| # | Step | On failure |
|---|---|---|
| 1 | The `bin` checks `process.versions.node` ≥ 22.6.0 before importing anything else (it imports other modules dynamically only after the check); `run` repeats the check on `deps.nodeVersion` | CW-E01 |
| 2 | Parse argv; check `CREATE_WXL_COMMIT` (override grammar; an empty value counts as unset); then check the package source record: present, `repository` equals `engine.UPSTREAM_SLUG`, `version` equals `deps.packageVersion` and matches `^\d+\.\d+\.\d+$`, `commit` matches `^[0-9a-f]{40}$`, `engineSha256` equals the SHA-256 of the engine module file. The `bin` itself prints CW-E13 (environment language) and exits 1 when `dist/source.json` or `dist/fork-init.mjs` cannot be loaded | CW-E02, CW-E13 |
| 3 | Target directory: the positional; if absent, ask (interactive, default `wxl-range`) or fail (non-interactive). An answer beginning with `~` is refused and asked again. Resolve against `deps.cwd` | CW-E03 |
| 4 | Check the target with `lstat`: its parent is an existing directory writable by `fs.access(W_OK)`, and either the target does not exist, or it is an empty directory on the same device as its parent (`stat().dev` equal). When the directory was asked in step 3 (interactive): print the CW-E04 text and ask again; otherwise CW-E04 | CW-E04 |
| 5 | Unless `--no-setup`: collect the answers (Setup questions), build the engine argv as `--flag=value` items in the order author, repo, host, origin, site-name (absent ones omitted; flag values verbatim, question answers trimmed, S3 answers as `github-pages`/`cloudflare-pages`), call `engine.parseForkInitArgs`; a thrown `engine.ForkInitArgError` is a rejection (interactive: print its message and start the second pass; non-interactive: CW-E06); any other thrown error is CW-E14; then the summary. The parsed args of the last accepted call are the ones step 11 applies | CW-E05, CW-E06, CW-E14, CW-E15 |
| 6 | If `CREATE_WXL_COMMIT` is set: CW-W04. Download `https://codeload.github.com/<repository>/tar.gz/<commit>` through `fetchArchive`, aborting if the whole body has not arrived within `downloadTimeoutMs`; any rejection, abort or status other than 200 | CW-E07 |
| 7 | Parse the gzip and tar strictly into an entry list and validate it against the entry rules; any error or violation rejects the archive | CW-E08 |
| 8 | Create the temporary directory with `mkdtemp` in the target's parent, prefix `.create-wxl-`; write exactly the validated entries without the first path component, files with flag `wx` and directories without `recursive`, so any file-system-level collision fails; file mode 0755 when the entry has any execute bit, else 0644, and directories 0755, each masked by the process umask; no owner or time preserved | CW-E09 |
| 9 | Pristine processing P1–P4 in the temporary directory; a rule failure is CW-E10, any other file-system error (reading or writing) CW-E09 | CW-E10, CW-E09 |
| 10 | Re-check the target with step 4's rule (an empty directory created meanwhile is accepted). Move into place: rename the temporary directory to the target when the target does not exist, then set the target's mode to 0755 masked by the umask; otherwise rename each top-level entry into the empty target in sorted order, recording each name, and remove the temporary directory | CW-E04, CW-E11 |
| 11 | Unless `--no-setup`: `engine.runForkInit(args, { projectRoot: target })`; a non-zero `exitCode` or a thrown error | CW-E12 |
| 12 | Unless `--no-setup`: git steps G1–G4 | CW-W01–W03 |
| 13 | Print the next steps | — |

Writes and cleanup:

- Steps 1–7 write nothing anywhere.
- A failure in steps 8–10 removes the temporary directory this run created (by its own path, never
  by pattern) and, for a failure during step 10's entry moves, first renames back into it every
  entry this run moved; the target ends as it was before the run, except when an entry cannot be
  moved back: then CW-E11 names each such entry and the temporary directory's path is kept and named.
- After step 10 the range stays on disk whatever happens.
- Exit code: 0 on success (warnings included); 1 on any CW-E code; 130 on a signal.

### Signals

`SIGINT`, `SIGTERM` and `SIGHUP` are handled alike, from step 3 on (the `bin` registers them on
`process`, and forwards a `readline` interface's own `SIGINT` event to the same handler, so Ctrl-C at
a question ends the run instead of pausing it). After a signal no new file-system operation starts;
the cleanup waits for the operation in flight; further signals during the cleanup are ignored; errors
writing the messages are ignored; a git command that exits non-zero after a signal counts as the
signal, not as CW-W03:

| During | Effect |
|---|---|
| steps 3–7 | stop; nothing was written; exit 130 |
| steps 8–10 | the cleanup above, then exit 130 |
| steps 11–13 | stop; print CW-W05: during step 11, CW-E12's finishing commands; during step 12, the git commands not run; during step 13, nothing is left; exit 130 |

An error that is none of the CW codes (a bug) is handled like a signal in its window, printed as
CW-E14 with the error's message, and exits 1.

### Error and warning codes

Every message begins with its code. Values from outside (arguments, environment values, answers,
paths, archive entry names, engine and git output) are printed as JSON string literals in which C0,
DEL and C1 characters are written as `\uXXXX`, except inside commands printed for copying (N1, N2,
N8, CW-E12, CW-W05), which use POSIX quoting: a word made only of letters, digits and `._-/@%+=:,`
is printed bare, any other as one single-quoted word with `'` written `'\''`, and a directory
beginning with `-` gets the prefix `./`. When a value to be placed in such a command contains a C0,
DEL or C1 character, the command is not printed; the message says the value contains control
characters and shows it escaped.

| Code | Condition | The message also names |
|---|---|---|
| CW-E01 | Node older than 22.6.0 | the running version, the minimum, `https://nodejs.org/` |
| CW-E02 | argument error (grammar), or `CREATE_WXL_COMMIT` not 40 lowercase hex | the offending argument or variable |
| CW-E03 | no directory, non-interactive | `create-wxl <directory>` |
| CW-E04 | target exists and is not an empty directory (a file, any symbolic link including a dangling one, a non-empty directory), is an empty directory on another device than its parent, or its parent is missing or not writable | the resolved path and which condition failed |
| CW-E05 | a required answer missing, non-interactive (`--author`, `--repo`, `--host`; `--origin` for `cloudflare-pages`) | each missing flag, `--no-setup`, and that npm needs `--` before flags |
| CW-E06 | `parseForkInitArgs` rejected the answers, non-interactive | the engine's message |
| CW-E07 | download: network error, abort, status other than 200, or the time limit (all before the body is complete) | the URL, and the status or error |
| CW-E08 | the archive is not valid gzip or tar, or the entry list breaks an entry rule | the rule number and, for the first breaking entry in archive order, its path (for a collision, the later of the two; for rule 2's comment, `pax comment`), or the parse error |
| CW-E09 | a file-system error in steps 8–9: creating the temporary directory, writing an entry, or reading or writing a file during P1–P4 (including writing `range.json`) | the path and the error |
| CW-E10 | a P1–P3 rule failed (file absent, marker absent, empty result, BOM, not JSON, not an object) | the file and the rule |
| CW-E11 | moving into place failed | the target, the error, and any entry left in the target |
| CW-E12 | the engine returned a non-zero `exitCode` or threw | the engine's message; then the commands to finish, for a POSIX shell: `cd <directory>`, `pnpm install`, `pnpm fork:init` with the same argv items, then the printed forms of G1, G2 and G4 |
| CW-E13 | the package source record or engine is missing or inconsistent (step 2) | that the package is broken, and to retry with `npm create wxl@latest` |
| CW-E14 | an unexpected error | the error's message |
| CW-E15 | input ended (EOF) while a question was open | — |
| CW-W01 | git not found, G0 exits non-zero, or git older than 2.20 | that the range is not a git repository yet, `https://git-scm.com/downloads`, and the printed forms of G1, G2, G4 |
| CW-W02 | no explicit committer identity (G3) | `git config --global user.name "<your name>"`, `git config --global user.email "<you@example.com>"`, then the printed form of G4 |
| CW-W03 | a git command exited non-zero (other than G3's exit 1) or `runGit` rejected with another error | the command, its stderr, and the printed forms of the remaining git commands |
| CW-W04 | `CREATE_WXL_COMMIT` is set | the commit, and that it is not a release and is meant for testing |
| CW-W05 | a signal after step 10 | the steps not run, as commands |

### Archive entry rules

The archive is parsed strictly (a damaged header or truncated stream is an error, not a warning).
Pax global and extended headers and GNU long-name and long-link headers are metadata, not entries.
The whole list is checked before step 8. An entry list is valid only when:

1. Every entry is a regular file (types `0`, NUL, `7`) or a directory (type `5`). Any other type
   (symbolic link, hard link, character or block device, FIFO, GNU sparse, unknown) is rejected.
2. Every path's first component is the same, and the pax global header's `comment` equals the commit
   requested (when downloading by commit).
3. After dropping the first component, a file's path is non-empty and does not end in `/`; every path
   is relative, uses `/` only (no ``), has no component that is empty (a directory's single trailing
   `/` excepted), `.`, `..`, or equal to `.git` ignoring case, no component ending in `.` or a space,
   and no C0, DEL or C1 character.
4. No two entries have the same path, or paths equal after Unicode NFC normalisation followed by
   JavaScript `toLowerCase()`; and no file's path is a proper prefix (followed by `/`) of another
   entry's path, whatever their order.
5. The list holds at least one file.

### Pristine processing

Applied in the temporary directory, in this order. 0006 builds pristine ranges with the same
function. Marker lines are compared after removing a trailing `\r`; P1 and P2 write the kept lines
with LF line endings.

| # | File | Rule | Failure (CW-E10) |
|---|---|---|---|
| P1 | `CHANGELOG.md` | keep every line up to and including the first line equal to `## [Unreleased]`; the file ends there with one LF | file missing, or marker absent |
| P2 | `.proj.specs/OPEN-QUESTIONS.md` | keep every line before the first line matching `^## OQ-\d{3} `; drop trailing lines that are blank or `---`; the file ends with one LF | file missing, marker absent, or nothing left |
| P3 | `package.json` | parse; set `version` to `0.1.0` (added last when absent); serialise as fork-init's manifest serialisation (0004 T4) | file missing, BOM, not JSON, or not an object |
| P4 | `range.json` | written as below, replacing any `range.json` in the archive | — |

`range.json` (two-space indent, keys in this order, one trailing LF):

```json
{
  "upstream": {
    "repository": "BrowserLaboratory/wxl-platform",
    "version": "3.0.0",
    "commit": "0123456789abcdef0123456789abcdef01234567"
  }
}
```

`repository` and `version` come from the package source record; `commit` is the commit downloaded.

### Test-download override

`CREATE_WXL_COMMIT`, when set and non-empty, must match `^[0-9a-f]{40}$` (else CW-E02 in step 2). It
replaces the source record's commit in step 6 and in `range.json`; it cannot change the repository;
`version` stays the source record's; CW-W04 is printed. GitHub may serve, under upstream's URL, a
commit from another repository in upstream's fork network, so the override can deliver content that
is not upstream's: it is for testing.

### Setup questions

| Id | Question | Flag | Default | Valid answer |
|---|---|---|---|---|
| S1 | author | `--author` | the current answer, else none | any non-empty text after trimming |
| S2 | GitHub repository, `owner/name` | `--repo` | the current answer, else none | any non-empty text after trimming |
| S3 | host: 1 GitHub Pages, 2 Cloudflare Pages | `--host` | the current answer, else 1 | `1`, `2`, `github-pages`, `cloudflare-pages` (case-insensitive, trimmed), mapped to `github-pages` or `cloudflare-pages` |
| S4 | site address, `https://…` | `--origin` | the current answer, else none | Cloudflare Pages: any non-empty text after trimming. GitHub Pages: empty (no `--origin`; the address is derived) or any text after trimming |
| S5 | site name | `--site-name` | the current answer, else none (keep the current name) | any text after trimming; empty keeps the current name |

"Current answer": the flag's value until the question is answered, then the last answer. A single
`-` answered to S4 or S5 clears the current answer.

- First pass: only the questions whose flag was not given are asked, in order S1–S5.
- An answer that is not valid prints why and asks the same question again.
- Grammar beyond that is the engine's: after the questions, `parseForkInitArgs` runs on the argv.
- Summary (id S6): each answer, and the short-link origin the engine will write: the parsed args'
  `origin` when present, else `engine.deriveGithubPagesOrigin(repo)` for GitHub Pages. Answers are
  trimmed and compared case-insensitively: `y`, `yes` or empty → proceed; `n`, `no` → second pass;
  anything else → asked again.
- Second pass (after an engine rejection or `n`): every question S1–S5 is asked, each with the
  current answer as its default, whatever the flags were.
- Non-interactive: no question; missing required flags → CW-E05; engine rejection → CW-E06.
- Interactive with every flag given: no question in the first pass; the summary is shown.

### Git steps

Every git command runs through `runGit` with the environment `deps.env` minus every variable whose
name starts with `GIT_`, plus exactly `GIT_TERMINAL_PROMPT=0` and `GIT_CONFIG_NOSYSTEM=1`; the
`bin`'s runner resolves `git` from the absolute directories of `PATH` before spawning, without a
shell and never from the target directory.

| # | Command run (cwd = target) | Printed form (for N2, CW-E12, CW-W01–W05) |
|---|---|---|
| G0 | `git --version`, which must report 2.20 or later (detection; not a step of the range) | — |
| G1 | `git init --template=`, then `git symbolic-ref HEAD refs/heads/main` | `git init` and `git symbolic-ref HEAD refs/heads/main` |
| G2 | `git -c core.excludesFile= add -A --force` | `git add -A` |
| G3 | `git config --get user.name` and `git config --get user.email` both exit 0 with non-empty output | — |
| G4 | `git -c user.useConfigOnly=true -c commit.gpgsign=false -c core.hooksPath= commit --no-verify -m "Create range from WXL <V>"` | `git commit -m "Create range from WXL <V>"` with V substituted |

G0 rejects, exits non-zero or reports a version below 2.20 → CW-W01, no other git command. G3: a
`git config --get` exiting 1 or printing nothing → CW-W02 after G1–G2, no G4. Any other non-zero exit
or rejection → CW-W03 and the rest skipped. `--force` is safe only on the fresh tree, so printed forms
never carry it; `--template=` keeps the user's `init.templateDir` hooks out of the new repository. 
G4's message is product output, not an agent's commit: AGENTS.md hard rule 5 and the commit-message
row of `docs/agents/language.md` govern agents' commits and do not apply to it.

### Next steps

Each line has an id and is printed in the run's language, in this order, as a translated label
followed by its commands (quoted as under "Error and warning codes"):

| Id | Line | When |
|---|---|---|
| N1 | `cd <directory>` | always |
| N2 | the printed forms of the git commands still to run, and for CW-W02 the two `git config --global` commands first | CW-W01, CW-W02, CW-W03 or CW-W05 was printed |
| N3 | create an empty GitHub repository `<owner>/<name>` without a README | setup ran |
| N4 | `git remote add origin https://github.com/<owner>/<name>.git` and `git push -u origin main` | setup ran |
| N5 | GitHub Pages: on GitHub, set Settings → Pages → Source to GitHub Actions, and allow `v*` tags in the `github-pages` environment; then `git tag v0.1.0` and `git push origin v0.1.0` | host is GitHub Pages |
| N6 | Cloudflare Pages: follow the README section 「部署到 Cloudflare Pages」/"Deploying to Cloudflare Pages" | host is Cloudflare Pages |
| N7 | `pnpm install` and Rust with `wasm-pack` are needed only to run the site locally (README 「環境需求」/"Prerequisites") | setup ran |
| N8 | `pnpm install`, then `pnpm fork:init` as the README describes | `--no-setup` |

### Package and publishing

`create-wxl/package.json` (exact, apart from the four placeholders `<V>` and `<exact>`; an exact version
is `^\d+\.\d+\.\d+$`, with no range operator):

```json
{
  "name": "create-wxl",
  "version": "<V>",
  "description": "Create a Web eXploitation Laboratory range",
  "type": "module",
  "bin": { "create-wxl": "bin/create-wxl.mjs" },
  "files": ["bin", "src", "dist", "LICENSE"],
  "engines": { "node": ">=22.6.0" },
  "license": "LicenseRef-LICENSE",
  "dependencies": { "tar": "<exact>", "yaml": "<exact>" },
  "devDependencies": { "vitest": "<exact>" },
  "scripts": {
    "prepack": "node scripts/prepare-dist.mjs",
    "prepublishOnly": "node scripts/prepare-dist.mjs && node scripts/check-publish.mjs",
    "test": "vitest run"
  }
}
```

`create-wxl/.gitignore` lists `dist/`, `node_modules/`, `LICENSE` and `*.tgz`; `create-wxl/pnpm-lock.yaml`
is committed. npm runs `prepublishOnly` before `prepack`, so `prepublishOnly` builds `dist/` itself
before checking; `prepack` builds it again for `npm pack` and `npm publish` alike.

`prepareDist`:

1. Remove `dist/` and the package's `LICENSE` copy entirely.
2. Fail (id D1) unless `module.stripTypeScriptTypes` exists.
3. Write `dist/fork-init.mjs` = `stripTypeScriptTypes(<scripts/fork-init.ts>, { mode: 'strip' })`.
4. Write `dist/source.json`: `repository` = the engine's exported `UPSTREAM_SLUG`, `version` = the root
   manifest's `version`, `commit` = `git rev-parse HEAD`, `engineSha256` = the SHA-256 of
   `dist/fork-init.mjs`.
5. Copy the root `LICENSE` to the package root.

`checkPublish` (run by `prepublishOnly`, right after its own `prepareDist`):

| # | Check |
|---|---|
| X1 | `module.stripTypeScriptTypes` exists |
| X2 | create-wxl's `version` equals the root manifest's `version`, and matches `^\d+\.\d+\.\d+$` |
| X3 | tag `v<V>` exists locally and `git rev-parse v<V>^{commit}` equals `HEAD` |
| X4 | `git status --porcelain --untracked-files=all` prints nothing |
| X5 | create-wxl's `yaml` is an exact version equal to the version the root importer resolves for `yaml` in the root `pnpm-lock.yaml` |
| X6 | `git ls-remote https://github.com/<UPSTREAM_SLUG>.git refs/tags/v<V> refs/tags/v<V>^{}` reports `HEAD`'s commit: the `^{}` line's when present (annotated tag), else the plain line's (the tag is pushed to upstream itself) |
| X7 | `git archive --prefix=<name>-<HEAD>/ HEAD` passes the entry rules 1–5 (with rule 2's comment equal to `HEAD`) and P1–P4 |
| X8 | `dist/source.json`'s `commit` equals `HEAD`, its `engineSha256` matches `dist/fork-init.mjs`, and the package's `LICENSE` equals the root's |
| X9 | `npmView()` is empty (the name is unpublished) or lists the maintainer `npm whoami` reports |

At run time, step 2's CW-E13 and the `bin` catch a package whose `dist/` is missing, from another
version or with a changed engine, including one published with lifecycle scripts skipped.

### Upstream configuration

Each item's strings are checked with `grep -F` after collapsing runs of whitespace to one space.

| # | Item | Content |
|---|---|---|
| U1 | `.gitattributes` | becomes exactly: line 1 `# Keep template text and recorded upstream checksums stable across checkouts; keep upstream's own records out of ranges.`, line 2 `* text=auto eol=lf`, then `/.proj.specs/** export-ignore`, `/.proj.specs/OPEN-QUESTIONS.md -export-ignore`, `/.proj.tickets export-ignore`, `/create-wxl export-ignore` (verified 2026-10-16: a directory-level `export-ignore` drops the directory entry; `/**` leaves an empty directory entry `.proj.specs/`, which the unset rule needs) |
| U2 | create-wxl package | the manifest above, `create-wxl/.gitignore`, `create-wxl/pnpm-lock.yaml` |
| U3 | CI | the upstream-only `fork-init-cross-os` job gains a new step after its existing test step, named `Run create-wxl tests`, running exactly `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test`; the existing step is unchanged; `tests/unit/workflows/upstream-only-jobs.test.ts` also pins the new step's `run` |
| U4 | Charter | in `AGENTS.md`, the Serves line becomes `- **Serves:** teachers who start a range of their own from it, and their students.` and the Must bullet becomes `- **Must:** run entirely in the browser; keep each learner's work on the learner's own machine; stay easy to start and to upgrade: `npm create wxl` (or a fork with `pnpm fork:init`) and a static host (Cloudflare Pages or GitHub Pages) are all a teacher needs, and a range can take in later upstream releases.`; `stay forkable` no longer appears. The upgrade clause is a direction that 0006 delivers |
| U5 | READMEs | `README.md`: the introduction's sentence about forking gains `或執行 `npm create wxl``; the Deployment section gains, before the fork section, `### 用 `npm create wxl` 建立靶場` containing `npm create wxl <資料夾>`, `pnpm create wxl <資料夾>`, `npm create wxl <資料夾> -- --no-setup`, `Node.js >= 22.6`, `range.json`, `設定紀錄`, and the list `作者`, `GitHub repository`, `部署主機`, `網站網址`, `網站名稱`. `README.en.md`: the introduction gains `or run `npm create wxl``; the subsection `### Create a range with `npm create wxl`` contains `npm create wxl <folder>`, `pnpm create wxl <folder>`, `npm create wxl <folder> -- --no-setup`, `Node.js >= 22.6`, `range.json`, `setup record`, and the list `author`, `GitHub repository`, `host`, `site address`, `site name`. Neither shows an example `range.json` (it would spell the upstream repository slug outside the anchors). In the same change, GLOSSARY's 設定紀錄 entry drops its `_新造詞_` line, since README now uses the term |
| U6 | Open questions | new entry headed `## OQ-020 — When do the settings half of the setup record and the setup page land?`, stating that the upgrade is epic 0006, the settings half 0007, the setup page 0008, and that 0004's Out of Scope numbering is superseded |
| U7 | Open questions | new entry headed `## OQ-021 — Do `npm create wxl -- <flags>` and `pnpm range:upgrade` work through the registry on the npm and pnpm versions teachers use?`, to be checked by the user after publishing |
| U8 | Open questions | new entry headed `## OQ-022 — Is a terminal run of the packed package adequate stage 8 for create-wxl?`, recording that 0005 and 0006 verify CLI behaviour through a terminal run of the packed package and site results through reads of built files, a non-browser harness |
| U9 | Comments and docs | `scripts/fork-init.ts`'s header names create-wxl as a second caller and says rebrand mode leaves the root `range.json` unrewritten; `quality-gates.yml`'s comment on `fork-init-cross-os` mentions create-wxl's tests; `AGENTS.md`'s repository layout lists `create-wxl/` and its build-and-test list names `pnpm --dir create-wxl test`; both `wxl-fork-init` skills (kept byte-identical, 0004 T78) say rebrand mode leaves `range.json` unrewritten and that `range.json` is an expected hit when searching for the upstream slug |
| U10 | Glossary | 上游 and 設定紀錄 keep the sentence `設定紀錄出現之前建立的靶場沒有設定紀錄` (0004 T79); 開發模組 and 設定紀錄 each gain an `_Avoid_` line recording their former meaning; 設定紀錄 says only the command that creates a range writes it so far, and that applying settings from it comes later; 原廠靶場 gains an `_Avoid_` line distinguishing it from 0004's upstream-pristine check |

### Overridden contracts

| Contract | Was | Now |
|---|---|---|
| 0004 T51 (rebrand mode keeps today's tree-wide swap) | every text file outside the exclusions is rewritten | the root `range.json` is not rewritten; it stays in the residual `wxl` scan, so the inventory still reports it. No other rebrand behaviour changes; the existing rebrand tests stay as they are |
| 0004 T66 and seam 0004-S5 (upstream decision without `GITHUB_REPOSITORY`) | upstream when the manifest's `repository.url` is upstream's and the tree is a git work tree | as before, and additionally no `range.json` at the root; the decision function gains that input; `GITHUB_REPOSITORY`, when set, still decides alone |
| 0004 engine exports | `deriveGithubPagesOrigin` is internal | it is exported, unchanged |
| workflow.md stage 8 (preview deployment) and hard rule 4 | behaviour verified on the ticket's preview deployment, in a browser | create-wxl's behaviour runs in a terminal and is verified there (0005-S4); the built range's title and origin are read from built files (OQ-022). Tickets that change only the engine, CI, documents or the glossary record their stage 8 as the runs of their tests, with 0005-S4 on the epic's last create-wxl ticket |

### Stage 8 inputs

Every run has `CREATE_WXL_COMMIT=<HEAD>` set; "`range.json` as expected" means the schema with the
upstream repository slug, V, and HEAD. Interactive runs go through `script -q /dev/null` with the
input written to its stdin, one answer per line.

| Run | Command | Input | Reads afterwards |
|---|---|---|---|
| 0 | `tar -tzf <tarball>` | — | lists `package/LICENSE`, `package/dist/source.json`, `package/dist/fork-init.mjs`, `package/bin/create-wxl.mjs` |
| I | `npx --yes <tarball> s8-gh` (interactive) | S1 `Stage Eight`, S2 `wxl-test/s8-gh`, S3 `1`, S4 empty, S5 `S8 GH`, S6 `y` | exit 0; `git log --oneline` one line; `range.json` as expected; `git ls-files` equals the files of `tar -tzf` on the downloaded archive minus the prefix and directories, with P4's `range.json` and the engine's workflow added; `pnpm install && pnpm build && pnpm test --run` succeed; the `<title>` of `.vitepress/dist/index.html` after decoding entities is `S8 GH`; some file under `.vitepress/dist/` contains `https://wxl-test.github.io/s8-gh` |
| Ib | `npx --yes <tarball> s8-int` (interactive) | the byte `0x03` (Ctrl-C) at S1 | exit 130; no `s8-int`; no `.create-wxl-*` in the directory |
| II | `npx --yes <tarball> s8-cf --author 'Stage Eight' --repo wxl-test/s8-cf --host cloudflare-pages --origin https://s8-cf.pages.dev --site-name 'S8 CF' </dev/null` | none | exit 0; `range.json` as expected; after `pnpm install && pnpm build`, the `<title>` is `S8 CF` and some file under `.vitepress/dist/` contains `https://s8-cf.pages.dev`; no `.github/workflows/deploy.yml` |
| III | `npx --yes <tarball> s8-raw --no-setup </dev/null` | none | exit 0; no `.git`; `range.json` as expected; `package.json` `version` `0.1.0`; `CHANGELOG.md` ends with the line `## [Unreleased]` |
| IV | in `s8-raw`: `git init && pnpm install && pnpm exec vitest run tests/unit/scripts/upstream-guard.test.ts` | none | the run passes and reports skipped tests (the range is not upstream, because it has `range.json`, though its manifest still names upstream) |

## Matrix

| Row | Type | Field / input | Boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| C01 | env | `deps.nodeVersion` 22.5.0, 21.99.0 / 22.6.0, 22.10.0, 23.0.0 | minimum | CW-E01, exit 1, nothing written, no download / accepted | AC-1 |
| C02 | argv | unknown flag; `--help`; `-h`; `-`; repeated flag; missing value; `--author --repo x`; `--author=`; `--no-setup=x`; empty positional; two positionals; `upgrade` anywhere as a positional; `--lang fr`; with a broken source record as well | grammar | CW-E02 naming it (not CW-E13), exit 1, nothing written | AC-2 |
| C03 | argv | `--no-setup` with a setup flag | grammar | CW-E02 | AC-2 |
| C04 | argv | no directory | interactive / non-interactive | asks with default `wxl-range` / CW-E03 | AC-3 |
| C05 | fs | target missing, parent a writable directory | ok | proceeds | AC-4 |
| C06 | fs | target empty directory; target `.` (cwd empty) | ok | proceeds | AC-4 |
| C07 | fs | target given as an argument: a file; a symbolic link to an empty directory; a dangling symbolic link; a directory holding only `.DS_Store`; parent missing; parent not writable (skipped on Windows and as root); an empty directory on another device than its parent (injected `stat`) | reject | CW-E04 naming the resolved path and the condition, exit 1, nothing written, no download | AC-4 |
| C08 | answers | all setup flags, non-interactive, values with surrounding spaces | ok | no question; `parseForkInitArgs` receives exactly `['--author=…', '--repo=…', '--host=…', ('--origin=…'), ('--site-name=…')]` in that order, values verbatim | AC-5 |
| C09 | answers | a required flag missing, non-interactive, per host; `--host CLOUDFLARE-PAGES` without `--origin` | missing | CW-E05 naming each missing flag / no CW-E05 (only the exact `cloudflare-pages` requires `--origin`); the engine's rejection of the host is CW-E06 | AC-5 |
| C10 | answers | interactive, no flags; answers with surrounding spaces; S3 `2` | first pass | S1–S5 asked in order; Enter takes the default; the argv holds trimmed answers and `--host=cloudflare-pages` | AC-6 |
| C11 | answers | interactive; S2 answered `bad` (engine rejects); interactive with `--repo bad` given as a flag | second pass | the engine's message; S1–S5 all asked again with current answers (the flag's value for the flag case) as defaults; a corrected S2 is accepted; no download before the summary is accepted | AC-6 |
| C12 | answers | non-interactive; engine rejects | reject | CW-E06 with the engine's message, exit 1, nothing written | AC-5 |
| C13 | answers | interactive; summary `n` | second pass | every question asked again with current answers as defaults | AC-6 |
| C14 | download | `fetchArchive` rejects; rejects after an abort mid-body; resolves status 404; does not resolve within `downloadTimeoutMs` | failure | CW-E07 naming the URL, exit 1, target unchanged, no temporary directory created | AC-7 |
| C15 | download | `CREATE_WXL_COMMIT` 40 lowercase hex | override | CW-W04; `fetchArchive(repository, override)`; written to `range.json` | AC-8 |
| C16 | download | `CREATE_WXL_COMMIT` short, uppercase, other text | reject | CW-E02 in step 2, before any question or download | AC-8 |
| C17 | archive | symlink; hardlink; FIFO; char device; block device; GNU sparse | rule 1 | CW-E08 naming the path and rule 1; nothing written | AC-9 |
| C18 | archive | after the prefix: `/abs`; `../x`; `a/../x`; `a//b`; `./x`; `a\b`; `.git/x`; `.GIT/x`; `a/x.`; `a/x `; a file `a/`; a name holding ESC | rule 3 | CW-E08 | AC-9 |
| C19 | archive | two first components; pax `comment` absent or another commit | rule 2 | CW-E08 | AC-9 |
| C20 | archive | file `a` then `a/b`; `a/b` then file `a`; directory `a/` then file `a`; same path twice; `Readme.md` and `README.md`; only the prefix directory | rules 4–5 | CW-E08 naming the later entry, or rule 5 | AC-9 |
| C21 | archive | pax global header with the right `comment`; GNU long-name header; ordinary files and directories | ok | accepted; headers not written as files | AC-9 |
| C22 | extract | valid archive with an executable file, `--no-setup`, umask 022 (modes skipped on Windows) | layout | the target holds every archive file without the prefix, byte-identical except the files P1–P4 change; executable entry mode 0755, others 0644, the target directory 0755 | AC-10 |
| C23 | pristine | `CHANGELOG.md` with versions after the marker; with CRLF lines | P1 | truncated after the marker; every kept line LF-terminated | AC-11 |
| C24 | pristine | `CHANGELOG.md` missing; without marker; `OPEN-QUESTIONS.md` missing; without `OQ-` heading | P1/P2 | CW-E10 naming the file and rule; target unchanged; temporary directory removed | AC-11 |
| C25 | pristine | `OPEN-QUESTIONS.md` with format section, trailing `---`, entries | P2 | format section only | AC-11 |
| C26 | pristine | `package.json` version `3.0.0`; without `version` | P3 | `0.1.0` (added last), other keys kept, fork-init serialisation | AC-11 |
| C27 | pristine | `package.json` missing; with BOM; not JSON; an array | P3 | CW-E10 | AC-11 |
| C28 | record | archive with or without its own `range.json` | P4 | `range.json` byte-equal to the schema with the source record and downloaded commit | AC-12 |
| C29 | move | target missing / empty / `.` | step 10 | the range at the target; the run's temporary directory gone | AC-10 |
| C30 | move | `fs.rename` injected to fail on the 3rd entry (empty target) | rollback | CW-E11; entries 1–2 moved back; target empty as before; temporary directory removed | AC-10 |
| C31 | signal | `SIGINT` emitted at the checkpoints of steps 4, 6, 8, 9 and during the 2nd entry move of step 10 | cleanup | exit 130; target as before; temporary directory removed (steps 8–10) or never created | AC-13 |
| C32 | engine | valid answers | apply | `runForkInit` called once with `{ projectRoot: target }` and the parsed args; A1, A6–A8 and the workflow per host as 0004 specifies | AC-14 |
| C33 | engine | `runForkInit` returns `exitCode` 1 (fixture without A9); `runForkInit` throws | failure | CW-E12 with the message and the finishing commands; range and `range.json` stay; no git step; exit 1 | AC-14 |
| C34 | engine | engine warnings | report | printed after the apply | AC-14 |
| C35 | git | real git; explicit identity in an isolated `HOME`; a global `init.templateDir` with a `post-commit` hook writing a file; `commit.gpgsign=true` | G1–G4 | repository on `main`, exactly one commit `Create range from WXL <V>`, `git ls-files` equals the range's file list, `git status --porcelain --untracked-files=all` empty; the hook did not run | AC-15 |
| C36 | git | `runGit` rejects `ENOENT` on G0; G0 reports 2.19.0 | CW-W01 | no further `runGit` call; exit 0; N2 lists the printed forms of G1, G2, G4 | AC-15 |
| C37 | git | real git without identity (isolated `HOME` and `XDG_CONFIG_HOME`, system config off): `git config --get` exits 1 | CW-W02 | G1, G2 run; no G4; not CW-W03; exit 0; N2 lists the two config commands, then the printed G4 | AC-15 |
| C38 | git | G2 exits 1 | CW-W03 | G3, G4 not run; exit 0; N2 lists the printed G2 and G4 | AC-15 |
| C39 | `--no-setup` | valid run, with and without `CREATE_WXL_COMMIT` | scope | P1–P4 applied; no engine call; no `runGit` call; exactly N1 and N8 printed (CW-W04 does not add N2) | AC-16 |
| C40 | output | success, each host | next steps | the lines of "Next steps" for that case, ids in order | AC-17 |
| C41 | language | `--lang zh-TW`; `LC_ALL=zh_TW.UTF-8`; `LANG=en_US`; none set with `locale` `zh-Hant-TW`; `LANG=C`; `--lang zh-TW` with an argument error under `LANG=en_US` | selection | zh-TW / zh-TW / en / zh-TW / en / CW-E02 in en; both message tables have the same ids and their texts differ outside commands, paths and codes | AC-18 |
| C42 | publish | D1 and each of X1–X9 violated (X6 with lightweight and annotated tags; X7 with an archive holding a symbolic link) | gate | `prepareDist` throws D1 having removed `dist/`; `checkPublish` throws naming the check | AC-19 |
| C43 | publish | all hold | prep | `dist/source.json` as specified; `dist/fork-init.mjs` imports and its `parseForkInitArgs` parses a valid argv; `LICENSE` copied; `checkPublish` passes | AC-19 |
| C44 | upstream | `.gitattributes`; `git archive HEAD` | U1, entry rules | `.gitattributes` exactly as U1; the archive passes entry rules 1–5; `git archive HEAD` lists the directory entry `.proj.specs/` and the file `.proj.specs/OPEN-QUESTIONS.md` and nothing else under `.proj.specs/`, nothing under `.proj.tickets/` or `create-wxl/`; no two archive paths equal after NFC and case folding | AC-20 |
| C45 | upstream | create-wxl package | U2 | manifest equal to the listing apart from the four placeholders, each exact; `version` equals the root's; `.gitignore` and lockfile present | AC-20 |
| C46 | upstream | CI | U3 | the new step with exactly that `run`, after the existing step, which is unchanged; job `if:` unchanged | AC-20 |
| C47 | upstream | Charter, READMEs, open questions, comments, glossary | U4–U10 | each listed string present (Charter compared with whitespace collapsed; `stay forkable` absent); the three words absent from the new README subsections | AC-21 |
| C48 | range | stage 8 runs I and IV | upstream decision | run I's `pnpm test --run` passes; run IV's guard tests report skips | AC-20, AC-22 |
| C49 | stage 8 | runs I–III | 0005-S4 | as "Stage 8 inputs" lists | AC-22 |
| C50 | package | `source` missing; `repository` ≠ `UPSTREAM_SLUG`; `version` ≠ `packageVersion`; `commit` not 40 hex; `engineSha256` mismatched | step 2 | CW-E13, exit 1, nothing written | AC-23 |
| C51 | input | EOF on stdin while a question is open | input | CW-E15, exit 1, nothing written | AC-6 |
| C52 | input | S1 empty; S3 `3` and `CLOUDFLARE-PAGES`; summary `maybe`, ` Y `; directory `~/x` | validity | the same question asked again / asked again, then accepted as `cloudflare-pages` / asked again, then proceeds / asked again | AC-6 |
| C53 | fs | between step 4 and step 10, another process creates at the target a file or a non-empty directory / an empty directory | recheck | CW-E04 at step 10, temporary directory removed, the other process's target untouched / accepted, entries moved into it | AC-10 |
| C54 | fs | `mkdtemp` fails (injected); an entry write fails (injected); writing `range.json` fails (injected); reading `package.json` fails with `EACCES` (injected) | steps 8–9 | CW-E09; target unchanged; temporary directory removed | AC-10 |
| C55 | archive | truncated gzip; a body that is HTML (status 200) | parse | CW-E08 | AC-9 |
| C56 | signal | `SIGTERM` at step 9; `SIGHUP` at step 12; `SIGINT` at step 11; `SIGINT` at the `question` checkpoint; a second `SIGINT` during step 9's cleanup | other signals | as `SIGINT` in their windows; step 12: CW-W05 with the remaining printed git commands; step 11: CW-W05 with CW-E12's finishing commands; question: exit 130, nothing written; the second signal ignored | AC-13 |
| C57 | error | `parseForkInitArgs` throws a plain `Error` at step 5; `fs.readdir` throws an unexpected error at step 4 | bug | CW-E14, nothing written, exit 1 | AC-13 |
| C58 | git env | `deps.env` contains `GIT_DIR=/elsewhere` | isolation | every `runGit` call receives an env without `GIT_DIR` | AC-15 |
| C59 | git | global `core.excludesFile` ignoring `lib/` (isolated `HOME`) and an archive file under `lib/` | excludes | the file is in the commit | AC-15 |
| C60 | output | an archive entry path containing ESC; an unknown argument containing a newline; `CREATE_WXL_COMMIT` containing DEL; a directory `-x`; a directory `my range`; a directory containing ESC (`--no-setup`) | escaping | JSON string literals with `\u001b`, `\n`, `\u007f`; N1 `cd ./-x`; N1 `cd 'my range'`; N1 not printed, the escaped value shown instead | AC-24 |
| C61 | engine | rebrand mode (`--rebrand`) on a tree with a root `range.json` holding the upstream slug | override T51 | `range.json` byte-identical; `residualFiles` still lists it; the existing rebrand tests unchanged and passing | AC-25 |
| C62 | upstream decision | `GITHUB_REPOSITORY` unset; manifest url upstream's; git work tree; with and without root `range.json` | override T66 | not upstream / upstream; with `GITHUB_REPOSITORY` set, unchanged | AC-25 |
| C63 | engine | `deriveGithubPagesOrigin` exported | export | the summary shows `https://alice.github.io` for `alice/alice.github.io`, `https://alice.github.io/r` for `Alice/r`, and for an S4 answer `https://Example.COM` the parsed origin the engine will write | AC-6 |
| C64 | fs | interactive, the directory asked in step 3 is a non-empty directory | re-ask | the CW-E04 text, then the question again; a valid answer proceeds | AC-4 |
| C65 | move | `fs.rename` injected to fail on the 3rd entry and again when moving back the 2nd | rollback failure | CW-E11 naming the 2nd entry and the kept temporary directory; exit 1 | AC-10 |
| C66 | answers | interactive: first pass S3 `2`, S4 `https://a.pages.dev`; summary `n`; second pass S3 `1`, S4 `-` | second pass | the argv has no `--origin`; the summary shows the derived GitHub Pages address | AC-6 |
| C67 | bin | the `bin` run with `dist/` removed; with `dist/fork-init.mjs` altered | bin | CW-E13 in the environment's language, exit 1, nothing written | AC-23 |
| C68 | engine | summary `n`, S5 changed to `a<b` (engine rejects), then to `S8` | last parse | `runForkInit` receives exactly the object the last `parseForkInitArgs` call returned | AC-14 |
| C69 | fs | a full interactive run with `fs` wrapped by a recorder | write scope | every path written, renamed or removed lies under the target or the run's temporary directory | AC-10 |
| C70 | git env | `runGit` calls of C35 | isolation | each env has no `GIT_*` other than `GIT_TERMINAL_PROMPT=0` and `GIT_CONFIG_NOSYSTEM=1` | AC-15 |

## Self-check of the surface (revision 2)

- Every row reaches an AC (AC-1–AC-25); every AC is reached by a row.
- Every CW code has a condition and a row: E01 C01; E02 C02, C03, C16; E03 C04; E04 C07, C53;
  E05 C09; E06 C12; E07 C14; E08 C17–C21, C55; E09 C54; E10 C24, C27; E11 C30; E12 C33; E13 C50;
  E14 C57; E15 C51; W01 C36; W02 C37; W03 C38; W04 C15; W05 C56.
- Every step has a failure exit and every signal window a row (C31, C56).
- Side effects of revision 2's guarantees, checked against existing rules:
  - The re-ask of every question (N2) and the "flags given are not asked" rule now apply to
    different passes, so they no longer conflict.
  - Excluding `range.json` from rebrand (T51 override) touches only that file name; no existing
    rebrand test writes a `range.json`.
  - The upstream decision's extra condition (T66 override) only turns "upstream" into "not upstream"
    for trees with `range.json`; upstream has none (P4 writes it only in ranges), so upstream's own
    CI decision is unchanged.
  - Moving create-wxl's tests into `create-wxl/` with their own lockfile keeps the root lockfile and
    every range unchanged; the new CI step leaves 0004 T72's pinned step as it was.
  - `prepack` builds `dist/` with `commit` = `HEAD`; at release `checkPublish` (X3, X6, X8) requires
    that `HEAD` is the pushed tag's commit, so a published package's commit is the release's.
  - Rule 4's case-folding refuses archives that upstream itself could hold (two paths differing only
    in case): upstream must not hold such pairs, which `git archive HEAD` in C44's test also checks.
  - G2's `--force` adds files the range's own `.gitignore` would ignore; the fresh tree holds only
    archive files, `range.json` and engine edits, all of which belong in the commit.

## Self-check of the surface (revision 2.1)

- New rows C64–C70 each reach an AC; CW codes unchanged except their conditions, all still with rows
  (E09 now also C54's read and `range.json` cases; W01 C36's version case).
- Changes checked against existing rules:
  - `prepublishOnly` now builds `dist/` before checking, matching npm's order (`prepublishOnly`
    before `prepack`); `prepack` building it again yields the same files for the same `HEAD`.
  - S4 is now asked for both hosts, so the round-1 rule "S4 only for Cloudflare" is gone everywhere
    (first pass, second pass, C10); for GitHub Pages an empty answer omits `--origin`, which is what
    the engine derived before.
  - Flag values are verbatim and answers trimmed: the engine's "no trim" contract (0004) holds for
    flags; trimmed answers are what the teacher typed without stray spaces.
  - The T51 override no longer uses the excluded-file list, so the residual inventory still sees
    `range.json` (0004's "never claims complete while a `wxl` remains" holds).
  - G3's exit 1 is CW-W02, not CW-W03; CW-W03 still covers every other non-zero exit.
  - The same-device check for an existing empty target only refuses targets on which step 10's
    renames could not work.
  - `GIT_CONFIG_NOSYSTEM=1` is the one addition to the git environment; tests isolate global
    configuration through `HOME` and `XDG_CONFIG_HOME`, which the runner keeps.


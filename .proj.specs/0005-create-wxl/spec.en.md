# Spec 0005: create-wxl — `npm create wxl` makes a ready range

Status: revision 2.1 (2026-10-16). Round 1 found four P0 findings with two root causes
(`review/round-1.md`); revision 2 applied its disposition (`review/disposition.md`, groups N1–N10) and
the user's decisions D1–D2. Round 2 found no P0 (`review/round-2.md`), so the stage 3 gate is met;
revision 2.1 applies round 2's P1 groups Q1–Q6 (`review/disposition-2.md`) by decision D3, without
another round. Derived from `traceability.md`, which holds the fixed
lists this spec refers to (decisions in short, vocabulary, command grammar, language, step order,
signals, error and warning codes, archive entry rules, pristine processing P1–P4, the `range.json`
schema, the test-download override, setup questions S1–S6, git steps G0–G4, next steps N1–N8, the
package manifest, `prepareDist` and `checkPublish` X1–X8, upstream configuration U1–U10, overridden
contracts, stage 8 inputs) and the seams 0005-S1 to S4. This epic builds on 0004 and is followed by
0006, which reads `range.json` and reuses the pristine processing. The glossary entries 原廠靶場
(new), 上游, 設定紀錄 and 開發模組 (revised, with their former meanings recorded) land with this spec.

## Problem Statement

A teacher who wants a range today forks or clones the upstream repository, installs its
dependencies, and runs `pnpm fork:init` with a long list of flags, then sets up git and a host by
hand. At the 2026-10-17 workshop that path is too long for teachers meeting WXL for the first time.
Worse, the range that results does not know which upstream version it came from: a fork's version
number is reset to `0.1.0` and nothing else records it, so when upstream releases a new version the
teacher has no reliable way to take it in. The ranges built at the workshop are the first
generation; whatever they do not carry on day one cannot be added later.

## Solution

`npm create wxl <folder>` (or `pnpm create wxl <folder>`) downloads exactly the upstream commit its
own version was built from, removes upstream's own records, writes `range.json` recording that
version and commit, asks five setup questions in the terminal, applies them with the same fork-init
engine `pnpm fork:init` uses, and makes the folder a git repository with one commit. It then prints
what is left: create the GitHub repository, push, and set up the host. Only Node is needed. Through
npm, flags follow `--` (`npm create wxl <folder> -- --no-setup`); `--no-setup` stops after the folder
and `range.json`. Everything create-wxl itself prints is in Traditional Chinese or English,
following the system language; messages quoted from the fork-init engine stay in English.

## User Stories

1. As a teacher at the workshop, I want one command that gives me a configured range folder, so that I do not have to install dependencies and type a long `fork:init` command before I can deploy.
2. As a teacher, I want to answer a few questions in the terminal instead of composing flags, so that I cannot mistype a flag name.
3. As a teacher, I want an invalid answer to be explained and every answer offered again for correction, so that a typo — even in a flag I passed — does not end the run.
4. As a teacher, I want the folder to be a git repository with a first commit, so that I only have to create the GitHub repository and push.
5. As a teacher, I want to be told exactly what remains (repository, push, host settings), so that I can finish without searching the README.
6. As a teacher, I want my range to record which upstream version and commit it was created from, so that it can be upgraded later.
7. As a teacher, I want create-wxl to refuse a non-empty folder and to leave it as it was when anything fails or I press Ctrl-C, so that it never damages my files.
8. As a teacher without git or without a git identity, I want the range created anyway with clear instructions, so that a missing tool does not cost me the whole run.
9. As a teacher, I want messages in my system's language, Traditional Chinese or English, so that I understand every step.
10. As a teacher scripting a lab setup, I want to pass every answer as a flag and get a non-zero exit on any problem, so that create-wxl runs unattended.
11. As a teacher who prefers fork:init, I want `--no-setup`, so that I get the folder and the record only.
12. As the upstream maintainer, I want create-wxl to download only the commit its release was built from, so that a moved tag or a later commit cannot change what teachers receive.
13. As the upstream maintainer, I want publishing to fail unless the package, the pushed tag and the platform agree and the release's own files process cleanly, so that a release cannot ship a mismatched engine, commit or unusable archive.
14. As the upstream maintainer, I want the Charter to state that a range is easy to start and to upgrade, so that later epics keep that promise.

## Implementation Decisions

- **Package.** create-wxl lives in `create-wxl/` with the manifest of `traceability.md`, its own
  lockfile, `.gitignore` and vitest; it is not a pnpm workspace member and is excluded from ranges by
  `export-ignore` (U1). Runtime dependencies are exactly `tar` and `yaml`, pinned; `yaml` equals the
  platform lockfile's (X5). The package carries a copy of the platform's `LICENSE`. It is plain JavaScript modules, so it runs on Node ≥ 22.6.0 without a
  TypeScript loader. Its tests live in `create-wxl/test/` and import the engine from
  `scripts/fork-init.ts`; CI runs them in a new step of the upstream-only cross-OS job (U3).
- **One CLI function** `run(argv, io, deps)`, seam 0005-S1. Every outside effect — streams, environment,
  working directory, Node version, locale, the package source record, the engine, the fetcher with its
  time limit, the git runner, file-system calls, signals, and a checkpoint hook — is a parameter; the
  `bin` passes the process's own. The `bin` checks the Node version before importing anything else,
  and refuses with CW-E13 when its `dist/` cannot be loaded.
- **Steps** run in the fixed order of `traceability.md`. Steps 1–7 write nothing; the download happens
  only after the answers are accepted; steps 8–10 clean up after themselves on failure or signal,
  including moving back entries already moved into an empty target, so the target ends as it was.
- **Engine reuse.** `prepareDist` strips the types from the platform's `fork-init.ts` into the package.
  create-wxl builds the engine argv as `--flag=value` items — flag values verbatim, question answers
  trimmed, the host question mapped to the engine's host names — validates it with `parseForkInitArgs`
  in step 5 and applies the last accepted parse with `runForkInit` in step 11. Beyond non-empty answers
  and the host mapping it adds no validation of its own. The summary shows the short-link origin the
  engine will write: the parsed `origin`, else the engine's own `deriveGithubPagesOrigin`, now exported.
- **Package source record and publishing.** `prepareDist` rebuilds `dist/` (engine, source record with
  the engine's SHA-256) and the `LICENSE` copy with `commit` = `HEAD`. npm runs `prepublishOnly` before
  `prepack`, so `prepublishOnly` runs `prepareDist` then `checkPublish` (X1–X9): the version matches,
  the tag `v<V>` is `HEAD` and is pushed to upstream itself (annotated or not), the tree is clean,
  `yaml` matches, the release's own archive passes the entry rules and P1–P4, `dist/` and `LICENSE`
  are the ones for `HEAD`, and the npm name is unpublished or the publisher maintains it. `prepack`
  also runs `prepareDist`, for `npm pack`. At run time CW-E13 refuses a package whose `dist/` is
  missing, from another version or with a changed engine.
- **Download and extraction.** The archive is fetched from GitHub's codeload by full commit SHA, parsed
  strictly, and validated as a whole list (entry rules 1–4, including the pax `comment` equal to the
  commit, no `.git` component, and no duplicate or case-colliding or file-under-file paths) before
  anything is written; entries are written with normalised modes into a `mkdtemp` directory beside the
  target, processed (P1–P4), and moved into place after re-checking the target. GitHub archives apply
  the archived commit's own `export-ignore` (U1); P1–P2 cut upstream's changelog and open-question
  entries down to their headers.
- **`range.json`** holds only `upstream` (R2): repository, version, commit. create-wxl writes it; the
  engine never reads it and, through an override of 0004 T51, rebrand mode does not rewrite it (it is
  still reported in the residual inventory); a tree holding it is never taken for upstream (override of
  0004 T66 and seam 0004-S5), so the upstream-only tests skip in every range from its first local
  `git init`.
- **Questions** S1–S6 are asked with `readline` on the given streams: the first pass asks only for
  answers not given as flags; after an engine rejection or a `n` at the summary, the second pass asks
  every question with the current answers as defaults, so a wrong flag can be corrected. The site
  address is asked for both hosts: required for Cloudflare Pages, optional for GitHub Pages (custom
  domains). Ctrl-C at a question ends the run.
- **Git** steps G0–G4 run with an isolated environment (no `GIT_*` from the caller, system
  configuration off) and fixed options (no template, global excludes off for the fresh tree, hooks and
  signing off, explicit identity required) only after the engine succeeds; failures are warnings,
  because the range is already usable and the next steps list what to run, in printed forms that never
  force-add.
- **Messages** carry codes CW-E01–E15 and CW-W01–W05 at the start, in both languages; outside values
  are printed as escaped JSON string literals, and commands for copying are POSIX-quoted (and withheld
  when a value holds control characters).
- **Upstream changes**: `.gitattributes` (U1), the package (U2), the CI step (U3), the Charter (U4), the
  READMEs (U5), open questions OQ-020–OQ-022 (U6–U8), comments, docs and both `wxl-fork-init` skills
  (U9), the glossary (U10), and the engine changes listed under overridden contracts.

## Trust Boundaries and Threat Model

| # | Boundary | Protects | Does not protect | Outside the model |
|---|---|---|---|---|
| B1 | GitHub archive → the teacher's disk | Content is chosen by full commit SHA and the archive's pax `comment` must equal it; the archive is parsed strictly and every entry validated before any write, so no entry can be a link or device, land outside the target, collide with another, or create a `.git` path; modes are normalised and owners not kept; a rejected archive leaves nothing behind | The bytes GitHub serves for that SHA are trusted as they are; no separate checksum; no size limit beyond the time limit | GitHub or the network path serving different content for a SHA (TLS is relied on) |
| B2 | npm registry → the teacher's machine | The name is reserved by the maintainer before it is advertised (D4) and `checkPublish` refuses to publish under a name someone else maintains (X9); direct dependencies pinned; the shipped engine and source record equal the tagged, pushed platform commit (X1–X8); a package whose `dist/` does not match its version or engine refuses to run (CW-E13) | Transitive dependencies follow npm's ranges (no shrinkwrap); a maintainer who bypasses `prepublishOnly` can still publish a package, which CW-E13 then refuses only if its `dist/` mismatches | A compromised npm account or registry; the maintainer enables 2FA |
| B3 | The teacher's answers → the range's source | Exactly 0004's B1: the answers reach the source only through `parseForkInitArgs` then `runForkInit` (chain-analysis N-5 does not arise) | As 0004 B1 | As 0004 B1 |
| B4 | create-wxl → the teacher's file system | Writes only inside the target and the one temporary directory it created; refuses a target that exists and is not an empty directory (by `lstat`, so any symbolic link), and re-checks it before moving; removes only its own temporary directory, by path; on failure or signal before the range is in place, the target ends as it was | After step 10, an interrupted or failed run leaves a range whose setup is incomplete; CW-E12 and CW-W05 say what is left | Another process writing the target or the temporary directory concurrently |
| B5 | Terminal output → the teacher's terminal | Values from outside (arguments, environment values, answers, paths, archive entry names, engine and git output) are printed as JSON string literals with C0, DEL and C1 escaped; commands for copying are POSIX-quoted, with `./` before a leading `-`, and are not printed at all when a value holds a control character | — | — |
| B6 | The test-download override → the download | `CREATE_WXL_COMMIT` accepts only a 40-character lowercase SHA, cannot change the repository name in the URL, and always prints CW-W04 | GitHub may serve a commit from upstream's fork network under upstream's URL, so whoever sets the variable can deliver non-upstream content; it is for testing | — |
| B7 | Git configuration and environment → the first commit | `GIT_*` variables are removed and system configuration is off; G1 uses no template, G2 ignores global excludes, G4 runs without hooks or signing; an implicit identity is refused (CW-W02); printed commands never force-add, so a later `git add` respects `.gitignore` | The user's other global git configuration still applies | — |
| B8 | Deployed range → learners | Unchanged: create-wxl and `range.json` are not part of the built site (the site's source directory is `platform/`) | — | — |

## Acceptance Criteria

- **AC-1** Node older than 22.6.0 (compared numerically) ends with CW-E01, exit 1, with nothing written and no download; 22.6.0 and later are accepted. (C01)
- **AC-2** Every argument error of the command grammar — unknown, single-dash or repeated flag, missing or empty value, a value given to `--no-setup`, empty or second positional, `upgrade` as any positional, invalid `--lang`, `--no-setup` with a setup flag — ends with CW-E02 naming it (before any CW-E13), exit 1, nothing written. (C02, C03)
- **AC-3** Without a directory argument, an interactive run asks for it with the default `wxl-range`; a non-interactive run ends with CW-E03, exit 1. (C04)
- **AC-4** A target under an existing writable parent that does not exist, or is an empty directory on the parent's device (including `.`), is accepted; when the target came from the argument or the run is non-interactive, a file, any symbolic link (dangling or not), a non-empty directory (a single `.DS_Store` counts), an empty directory on another device, or a missing or unwritable parent ends with CW-E04 naming the resolved path and the condition, exit 1, nothing written, no download; when it was asked interactively, the CW-E04 text is printed and the question asked again. (C05–C07, C64)
- **AC-5** Non-interactive: all required flags given → no question, and `parseForkInitArgs` receives exactly the `--flag=value` items in the fixed order with the flag values verbatim; a required one missing (`--origin` only for the exact host `cloudflare-pages`) → CW-E05 naming each; `parseForkInitArgs` throwing `ForkInitArgError` → CW-E06 with its message; each exits 1 with nothing written. (C08, C09, C12)
- **AC-6** Interactive: the first pass asks S1–S5 in order for the answers not given as flags (S4 for both hosts, required only for Cloudflare Pages); Enter takes the default; an invalid answer asks the same question again; answers are trimmed and S3 maps to the engine's host names; an engine rejection prints its message and, like `n` at the summary, starts the second pass asking every question with the current answers (flag values included) as defaults, where `-` clears S4 or S5; the summary shows the answers and the origin the engine will write; `y`, `yes` or Enter (trimmed, any case) proceed; EOF ends with CW-E15; no download happens before the summary is accepted. (C10, C11, C13, C51, C52, C63, C66)
- **AC-7** A download that rejects (including an abort mid-body), returns a status other than 200, or has not delivered its whole body within the time limit ends with CW-E07 naming the URL, exit 1, the target unchanged and no temporary directory created. (C14)
- **AC-8** `CREATE_WXL_COMMIT` of 40 lowercase hex characters prints CW-W04 and is requested from the source record's repository and written as `commit`; any other non-empty value ends with CW-E02 at step 2. (C15, C16)
- **AC-9** An archive that is not valid gzip or tar, or an entry list breaking entry rules 1–5 (in any order of entries), ends with CW-E08 naming the rule and the first breaking entry as `traceability.md` defines, or the parse error, exit 1, with nothing written; pax and GNU metadata headers are not entries. (C17–C21, C55)
- **AC-10** With `--no-setup`, a valid archive yields, at the target, every archive file without its first component, byte-identical except the files P1–P4 change, with executable files 0755, other files 0644 and a newly created target 0755 (each masked by the umask), whether the target was missing, empty, or `.`; the run's temporary directory is gone afterwards; a file or non-empty directory created at the target by someone else after step 4 ends with CW-E04 at step 10, while an empty directory is used; a file-system error in steps 8–9 ends with CW-E09; a failed move ends with CW-E11 after moving back what was moved; in every failure case the target is as it was before the run, except for entries CW-E11 names as not moved back; every path the run writes, renames or removes lies under the target or its own temporary directory. (C22, C29, C30, C53, C54, C65, C69)
- **AC-11** P1 keeps `CHANGELOG.md` up to and including `## [Unreleased]`; P2 keeps `OPEN-QUESTIONS.md` before its first line matching `^## OQ-\d{3} ` without trailing blank or `---` lines; kept lines end in LF; P3 sets `version` to `0.1.0` in fork-init's serialisation, other keys unchanged; markers match with or without a trailing `\r`; a missing file, missing marker, empty P2 result, BOM, unparsable or non-object manifest ends with CW-E10 naming the file and rule, the target unchanged. (C23–C27)
- **AC-12** `range.json` is byte-equal to the schema with repository and version from the source record and the commit downloaded, replacing any `range.json` in the archive. (C28)
- **AC-13** `SIGINT`, `SIGTERM` or `SIGHUP` (including Ctrl-C at a question) during steps 3–10 exits 130 with the target as it was and no temporary directory left, further signals during the cleanup being ignored; during steps 11–13 exits 130 after CW-W05 lists what is left for that step; an unexpected error is CW-E14 with the same cleanup and exit 1. (C31, C56, C57)
- **AC-14** With setup, `runForkInit` is called once with `{ projectRoot: target }` and exactly the object the last accepted `parseForkInitArgs` call returned, and the range's A1, A6–A8 and workflow reflect the answers as 0004 specifies; its warnings are printed; a non-zero `exitCode` or a throw ends with CW-E12 carrying the message and the finishing commands (`cd`, `pnpm install`, the quoted `pnpm fork:init` command, the printed G1, G2, G4), exit 1, the range and `range.json` left in place and no git step run. (C32–C34, C68)
- **AC-15** With setup and the engine successful, every `runGit` call gets an environment whose only `GIT_*` variables are `GIT_TERMINAL_PROMPT=0` and `GIT_CONFIG_NOSYSTEM=1`; with git 2.20 or later and an explicit identity the target is a repository on `main` with exactly one commit, `Create range from WXL <V>`, whose files are every file of the range (global excludes notwithstanding) and a clean working tree, with no template hook run; git missing, failing G0 or older than 2.20 → CW-W01 and no other git call; no explicit identity (`git config --get` exit 1 or empty) → CW-W02 after G1–G2; any other failing command → CW-W03 and the rest skipped; all exit 0 with N2 listing the printed forms of what is left. (C35–C38, C58, C59, C70)
- **AC-16** `--no-setup` extracts and applies P1–P4, calls neither the engine nor `runGit`, and prints exactly N1 and N8, with or without the override. (C39)
- **AC-17** A successful run prints the next-step lines of `traceability.md` that apply, by id, in order. (C40)
- **AC-18** The language follows the rule in `traceability.md` (CW-E01 and CW-E02 by environment only); both message tables have the same ids, each `zh-TW` text differing from its `en` text outside commands, paths and codes, and every CW message begins with its code. (C41)
- **AC-19** `prepareDist` removes `dist/` and the `LICENSE` copy first and fails D1 without `stripTypeScriptTypes`; otherwise it writes `source.json` as specified, copies `LICENSE`, and writes a `fork-init.mjs` that Node imports and whose `parseForkInitArgs` accepts a valid argv; `checkPublish` fails naming the check for each of X1–X9 violated (X6 for lightweight and annotated tags, X7 for an archive breaking an entry rule) and passes when all hold. (C42, C43)
- **AC-20** Upstream holds U1–U3: `.gitattributes` is exactly U1; `git archive HEAD` passes entry rules 1–5 and lists `.proj.specs/` and `.proj.specs/OPEN-QUESTIONS.md` and nothing else under `.proj.specs/`, nothing under `.proj.tickets/` or `create-wxl/`; the create-wxl package matches the listing; the cross-OS job has the new step with exactly its `run` after the unchanged existing step; a range made by create-wxl is not upstream (stage 8 runs I and IV). (C44–C46, C48)
- **AC-21** U4–U10 hold, each string found by `grep -F` after collapsing whitespace: the Serves line and Must bullet verbatim and no `stay forkable`; the READMEs' strings, with no example `range.json`; 設定紀錄's `_新造詞_` line removed in the same change; the OQ-020, OQ-021 and OQ-022 headings; the U9 strings, with both skills byte-identical; the U10 glossary lines. (C47)
- **AC-22** Stage 8 (0005-S4): runs 0, I, Ib, II, III and IV of "Stage 8 inputs" on the pushed HEAD each produce exactly the listed results. (C48, C49)
- **AC-23** A package source record that is missing, of another repository or version, with an invalid commit, or whose engine hash does not match, ends with CW-E13, exit 1, nothing written; so does a `bin` whose `dist/` cannot be loaded. (C50, C67)
- **AC-24** Arguments, environment values, answers, paths, archive entry names and engine and git output are printed as JSON string literals with C0, DEL and C1 characters escaped; commands for copying are POSIX-quoted with `./` before a leading `-`, and are withheld when a value holds a control character. (C60)
- **AC-25** The overridden contracts hold: rebrand mode leaves the root `range.json` byte-identical and still lists it among the residual files, while the existing rebrand tests pass unchanged; the upstream decision without `GITHUB_REPOSITORY` is "not upstream" when the root holds `range.json` and unchanged otherwise. (C61, C62)

## Testing Decisions

- Tests check external behaviour at the seams: files on disk (content and mode), exit codes, stream
  text matched by message id and code and by named values, and the calls the injected dependencies
  received.
- 0005-S1 fixture archives are built in the test from entry lists `{ path, type, mode, content, linkpath }`
  plus an optional pax global `comment`, writing raw headers with `tar`'s `Header` where the `tar`
  writer refuses a hostile entry; no test reaches the network. The git tests use the real git binary
  with `deps.env` holding only `HOME`, `PATH` and `XDG_CONFIG_HOME`, the first and last pointed at
  temporary directories (the runner adds `GIT_CONFIG_NOSYSTEM=1`). Tests that need read-only
  directories or check modes skip on Windows and when running as root. Signals are emitted on the
  injected emitter from the `checkpoint` hook, which exists only as a parameter.
- 0005-S2 tests run `prepareDist` and `checkPublish` in a temporary git repository with tags and dirty
  trees set by the test and `node_modules` linked; `archive` is the real `git archive`.
- 0005-S3 tests read the real tracked files and are upstream-only through 0004's upstream decision.
- The two engine changes are covered in the existing engine and guard test files (C61, C62).
- Prior art: `tests/unit/scripts/fork-init.test.ts` (temporary fixture trees),
  `tests/unit/scripts/upstream-guard.test.ts` (fixtures from the imported `UPSTREAM_SLUG`,
  upstream-only real-tree tests), 0004-S7 (stage 8 exports).
- Stage 8 is local and terminal-based, the surface where this behaviour runs, with the built range's
  title and origin read from built files: an explicit override of the preview-deployment rule,
  recorded as OQ-022 (U8). Interactive runs go through a pseudo-terminal (`script`). The `npm create wxl -- <flags>` path through the registry cannot run
  before publishing; the user checks it after publishing (OQ-021). Real deployment to either host
  stays the user's manual check before the workshop (OQ-017).

## Out of Scope

- The upgrade command (0006), the settings half of the setup record (0007) and the setup page
  (0008); E5's inference of a fork's upstream version from git history.
- Creating the GitHub repository, pushing, or configuring a host; any remote operation besides the
  archive download.
- `pnpm install` or any dependency installation inside the range.
- Checksums of the archive beyond the SHA and pax `comment`; a size limit; a mirror, an offline
  source, or proxy support (`fetch` does not read `HTTPS_PROXY`; CW-E07 names the URL).
- References and statements in shipped files (READMEs, ADRs, code comments, `AGENTS.md`,
  `docs/agents/`) about open questions, specs, tickets or the `.proj.*` directories that ranges no
  longer carry: a known limit (D2 ⑯).
- The `.archive/` directory and other tracked paths not listed in U1: they stay in ranges as today.
- Windows behaviour beyond the cross-OS unit tests (including retrying a rename that antivirus
  software briefly blocks); the printed commands are for a POSIX shell.
- Requiring the release commit to be on upstream's `main`; refusing an empty target owned by another
  user; `npm-shrinkwrap.json` for transitive dependencies.
- Withdrawing a published version (`npm deprecate`) if upstream history is ever rewritten.
- Publishing to npm, tagging and the GitHub release: user actions at release time, each asked first.

## Further Notes

- The `version` in a range's `package.json` is `0.1.0` from P3, and fork:init's first conversion sets
  the same value (0004 AC-A8), so the two agree.
- `checkPublish` cannot run in CI because the tag does not exist until release; its checks are tested
  on temporary repositories (0005-S2).
- Q19's "only `tar`" became `tar` and `yaml` with the user's approval on 2026-10-16, when it turned
  out that the engine imports `yaml` (since T-0014) and therefore cannot run from an uninstalled range.
- This spec supersedes 0004's Out of Scope numbering of later epics ("0006 setup record", "Until 0006
  a range has no setup record"): see OQ-020 (U6).
- The terms "package source record" (`dist/source.json`) and "setup record" (`range.json`) share keys
  but not purpose; only the second is a glossary term.
- Specs 0002 and 0003 remain the record of the earlier splits; this spec takes 0002's G7 and G12.
- The user reserved the npm name with a placeholder `create-wxl@0.0.0` on 2026-10-16 (D4); X9 checks
  that later releases are published by its maintainer.

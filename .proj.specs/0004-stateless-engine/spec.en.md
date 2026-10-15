# Spec 0004: a stateless fork-init engine, and range CI that stays green

Status: revision 2.2 (revision 2 plus the clarifications approved with the test plans and, in 2.2,
seam 0004-S10 with row T85, all listed in `traceability.md`). Round 1 of adversarial review found no
P0 (`review/round-1.md`), so the stage 3 gate is met; revision 2 applies the round 1 disposition
(`review/disposition.md`, groups M1–M10).
Derived from `traceability.md`, which holds the fixed lists this spec refers to (modes and "today",
repository-slug grammar, first conversion, identity anchors A1–A9, base grammar, workflow states,
upstream repository-slug confinement with the guard's lists, overridden contracts, character rules, origin
grammar, argument check order and messages) and the seams 0004-S1 to S10. Stage 1 decisions: Q1–Q24,
E1–E6 and F1–F3 (2026-10-14). This epic was split from 0003-apply-engine after its round 2
(`.proj.specs/0003-apply-engine/review/round-2.md`): everything that depended on a setup record moved
to a later epic. Later epics are planned as 0005 create-wxl (re-specified; 0002 stays as the split
record), 0006 setup record and 0007 setup page; 0005 builds on this one. The glossary section
靶場與老師的工具 that the Vocabulary cites is a stage 1 output, uncommitted, landing with this spec.

## Problem Statement

`fork:init` turns the upstream platform into a teacher's range. Today it replaces the upstream
repository slug as a substring in every text file, so it rewrites history it should keep (changelog
links to upstream pull requests) and text it should not touch. It does not set the short-link origin
or the site name, so a teacher edits source by hand. It resets the version number on every run. And a
configured range's own CI turns red: three component tests hardcode the upstream address, and a
GitHub Pages range's base is written into the config, which breaks the site smoke and challenge
tests that navigate from `/` and leaves the favicons at the root.

## Solution

Without `--rebrand`, `fork:init` rewrites only a fixed list of identity anchors. Each documentation
anchor is a fixed URL form whose repository slug is a wildcard, so whatever repository slug sits
there — upstream's, the range's earlier one, or the new one — is replaced, and a run that stopped
part-way is finished by running it again. It sets the short-link origin and the site name, and
chooses the GitHub Pages workflow from the host. It keeps no state: every run passes its arguments
in full, and a setting not given leaves its anchor alone. A GitHub Pages range's base path is decided
when the site is deployed, from GitHub's own Pages configuration, so every test in a configured range
still runs at `/` and stays green. CI that only makes sense upstream runs only upstream, and
upstream-only tests catch the engine having been run on upstream itself. `--rebrand` keeps today's
behaviour.

## Vocabulary

From `GLOSSARY.md` (section 靶場與老師的工具): **range**, **teacher**, **upstream**. Also used here:

- **repository slug** — `owner/name` of a GitHub repository. Distinct from the glossary's
  *slug（題目 slug）*, which names a challenge; this spec does not say "slug" alone for it.
- **identity anchor** — one of A1–A9: a place that names the range's own repository or carries one of
  the range's settings. *Doc* anchors (A2–A5) are URL forms in documentation; *code* anchors (A1,
  A6–A9) are locations the site or the package depends on.
- **anchor mode** and **rebrand mode** — a run without and with `--rebrand`.
- **today** — the fork-init CLI's behaviour at `c0f7edf`.
- **first conversion** — defined in `traceability.md`: the manifest still names upstream's
  repository, exactly.
- **short-link origin** — the value of the short-link module's `SITE_ORIGIN`, set by `--origin`.
  Distinct from the glossary's *origin（紀錄來源）*, from git's `origin` remote and from the HTTP
  `Origin` header.
- **host** — where a range is deployed: `github-pages` or `cloudflare-pages`. A URL's host part is
  called its **hostname**.

## User Stories

1. As a teacher, I want configuring my range to change only the places that name my range, so that
   my challenges, notes and the platform's history are never altered.
2. As a teacher, I want to rename my repository or change one setting by running the command again,
   so that I do not have to edit source by hand.
3. As a teacher, I want a run that stopped part-way to be finished by running the same command again,
   so that I never have to repair a half-configured range.
4. As a teacher, I want the short links my site copies to point at my site, so that a handout never
   sends a class elsewhere.
5. As a teacher, I want my range's name in the browser tab and on the home page, so that learners
   know whose range it is.
6. As a teacher, I want a name that would break the page refused with a reason, so that I can pick
   another instead of publishing a broken site.
7. As a teacher, I want to say where I deploy and have the workflow and base path handled, including
   GitHub Pages user sites and custom domains, so that I do not need to understand `--base`.
8. As a teacher who configures with `--host`, I want my range's CI to stay green, so that a red badge
   means I broke something.
9. As a teacher who configured a range with the earlier `fork:init`, I want the new engine (without
   `--rebrand`) to work on it, keep my version number, and tell me exactly what to bring over from
   upstream when my config, template or workflow is too old, so that my site does not silently break.
10. As the upstream maintainer, I want upstream-only CI to stay out of teachers' repositories — even
    rebranded ones — and tests that fail if the engine was ever run on upstream, so that teachers
    never receive upstream's releases and upstream never ships a teacher's identity.

## Implementation Decisions

### Engine interface and errors

- `runForkInit(args, { projectRoot })` remains the one engine and the whole engine stays in the
  fork-init CLI file, which rebrand mode already excludes from its own walk. It imports Node
  built-ins and the `yaml` package (a dev dependency every range installs, used to judge workflows)
  and uses only erasable TypeScript syntax, so the CLI runs under Node's type stripping without
  `tsx` (the parameter property in the argument error class is removed;
  the `fork:init` package script may keep `tsx`). It exports the upstream repository slug as
  `UPSTREAM_SLUG`.
- New arguments: `origin`, `siteName`, `host` (`github-pages` | `cloudflare-pages`), exposed as
  `--origin`, `--site-name`, `--host`. `--author` and `--repo` stay required. Existing arguments keep
  their meaning except where stated.
- Argument errors are thrown by `parseForkInitArgs` as `ForkInitArgError` — including any error
  Node's own argument parser raises, and a flag given twice — in the argument check order of
  `traceability.md`. Each message names its flag and quotes a rejected value with `JSON.stringify`.
  The CLI prints the message on stderr and exits 1.
- Tree errors — a missing, BOM-prefixed, unparsable or non-object manifest; a code anchor being set
  with zero or several candidate lines or an unparsable existing value; a config without A9 or its
  `base: siteBase` line when A9 is needed; a missing or outdated template under `--host`, or one that
  does not derive `SITE_BASE` under `--host github-pages`; in anchor mode, a write that fails — are returned as `exitCode` 1 with a `message` naming the anchor id,
  field or template and the file (relative, with `/`). Messages about something to bring over from
  upstream (T18, T24) contain upstream's repository URL, which the confinement rule lets only the
  engine file carry. The CLI prints only
  `✗ ` and the message, on stderr, and exits 1. On success it prints as today, on stdout (T58).
- Every check and every edit is computed in memory before anything is written; an error found before
  writing writes nothing. In anchor mode each changed file is written to `<file>.fork-init-tmp`
  beside it and renamed over the original, keeping its permission bits — an implementation
  requirement, not observed by any test, as the user decided for seam S1. A write failure part-way
  is a tree error telling the teacher to run the same command again, which converges (T6); rebrand
  mode writes in place and fails as today. The root
  `.gitignore` ignores `*.fork-init-tmp`. A file whose content would not change is not written.

### Identity anchors replace the substring scan (anchor mode)

- The engine writes only A1–A9 (recognition rules in `traceability.md`) and the GitHub Pages
  workflow. Doc anchors A2–A5 replace every occurrence of their form, whatever repository slug it
  holds, with the new one; a doc anchor with no occurrence, or whose file is missing, produces a
  warning. There is no list of old repository slugs to rewrite from, so the result depends only on
  the tree's anchor positions and the arguments.
- A code anchor must have exactly one candidate line when its value is being set and is not required
  otherwise: A6 and A7 with `--site-name`, A8 with a given or derived origin, A9 with `--base` or
  `--host`. An existing A6–A8 value being set must parse (JS string literal for A6 and A8; one YAML
  scalar for A7). New A6–A8 values are written as JSON string literals through a function replacer
  (so replacement patterns such as `$&` and `$'` stay literal). A9 is the stated exception: it is written whole as one of three
  exact lines, the `'…'` form included. Anchors are recognised in CRLF files as in LF ones, and line
  endings are kept.
- Changing a short-link origin that is not upstream's warns with the old and new values, and resetting
  a literal A9 under `--host` warns with the old line and the upstream form: the engine keeps no state, so a run that omits `--origin` must
  not silently replace a custom domain.
- The manifest (A1) is edited structurally: the three repository URLs and `author` on every run;
  `version` = `0.1.0` and `license` = `ECL-2.0` only on first conversion; `name` and `description`
  when given non-empty after trimming. A `repository` or `bugs` that is not a plain object is
  replaced by the object form, in both modes. It is re-serialised as two-space JSON in its existing
  line-ending style.
- **Overridden contracts**, explicitly: every row of the "Overridden contracts" table in
  `traceability.md` — eight fork-init tests and one test title, the fork-template parity test's
  SITE_BASE assertion and its comment, the baseline and "every fork gets a workflow" statements in
  the parity test, toolchain-parity test, template and frozen fixture, and the comments in the
  fork-init module (its `ForkInitArgs.base` type included), the VitePress config, the short-link
  module, the LocaleSwitcher component and its test, and both `wxl-fork-init` skills. Every other
  existing fork-init test passes with its body unchanged; the shared fixture gains the files the new
  anchors need.

### Rebrand mode

`--rebrand` keeps today's code path: the tree-wide swap of the upstream repository slug, the four key
renames, the residual inventory, the unconditional `version` and `license` reset, `name` defaulting
to the rebrand name, a manifest written with LF, files written in place, and the workflow compared
and write failures raised as today. The complete list of
differences is in T51: the base goes through A9 (and warns when the workflow does not derive
`SITE_BASE`); a bad manifest is a tree error and a non-object `repository` or `bugs` becomes an
object; the argument rules apply; errors are found before writing; and every path in the result
uses `/`. `--rebrand` together with `--host`, `--origin` or `--site-name` is an argument error.
Because the upstream repository slug is confined to the files `traceability.md` lists, and
upstream-only CI spells it through `format` while new tests import `UPSTREAM_SLUG`, the tree-wide
swap cannot redirect the upstream-only machinery to a range.

### Host, base and origin

- The VitePress config defines the base once as `const siteBase = process.env.SITE_BASE || '/'`
  (A9, added upstream in this epic, with `base: siteBase`); `base` and the three `head` hrefs use it.
  A resolved `siteBase` outside the base grammar makes the config throw naming `SITE_BASE`. The base
  grammar refuses `.` and `..` segments, for `--base` too.
- The GitHub Pages workflow template runs `actions/configure-pages` (id `pages`) before the build and
  sets `SITE_BASE: ${{ steps.pages.outputs.base_path }}/`. GitHub computes `base_path` for project
  sites, user sites and custom domains alike (`"/my-repo"` or `""`, verified in the pinned action's
  `action.yml` on 2026-10-14), so a range never writes its base into source and follows renames and
  custom domains by itself. A workflow *derives SITE_BASE* when its `pnpm build` step sets exactly
  that value, judged by parsing the YAML. In anchor mode workflows are compared LF-normalised.
- The engine recognises the workflow it wrote before this epic by a list of known old outputs held as
  SHA-256 values (initially one: the template at `72327e2`, which it wrote verbatim; a verbatim copy
  is added as a test fixture, distinct from the parity test's frozen baseline). An upstream-only test
  pins the current template's hash, so changing the template fails it until the old value has
  moved into the engine's list.
- `--host` (either value) needs the tree's template to exist and not be a known old output, and needs
  exactly one A9 and one `base: siteBase` line; `--host github-pages` also needs the template to
  derive `SITE_BASE`. Otherwise it returns `exitCode` 1 saying what to bring over from upstream. It
  sets A9 to its upstream form.
- `--host github-pages`: the workflow is installed when absent, left when equal to the current
  template output, replaced (with a warning) when equal to a known old output, and otherwise left with
  a warning — one that names `SITE_BASE` and the resulting 404s when the workflow does not derive
  `SITE_BASE` (an old upstream workflow that sets a literal `SITE_BASE` included). Without `--origin`,
  the origin is derived on every such run: `https://<owner>.github.io/<name>`, or
  `https://<owner>.github.io` for the user site `<owner>.github.io`, with the owner lowercased. A custom domain needs `--origin`.
- `--host cloudflare-pages`: no workflow; one equal to the current template output or a known old
  output is removed, any other is left with a warning. `--origin` is required and takes no path: the
  `pages.dev` project name is chosen in Cloudflare's dashboard and the engine cannot know it.
- `--host` with `--base`, or an unknown `--host`, is an argument error.
- Without `--host`, today's workflow behaviour stands, compared LF-normalised in anchor mode (installed when absent
  — including on a Cloudflare range whose workflow an earlier run removed, since the engine keeps no
  state — and never replaced); a warning naming `SITE_BASE`, `404` and `--host github-pages` is added,
  in both modes, when A9 is in upstream form and the workflow does not derive `SITE_BASE`. A9 follows
  `--base` (`'/x/'` or `'/'`), and A8 follows `--origin` or stays. A literal base keeps the site at a
  fixed path, so the range's own site smoke and challenge tests, which navigate from `/`, fail in CI;
  the README says so.

### Range CI

- The ShortLinkShare, MergedNav and ChallengeList component tests build their expected strings from
  the `SITE_ORIGIN` they import, so they hold for any origin; the upstream value itself is checked
  by the pristine test.
- The `release` job (release workflow) and a new cross-OS job (quality-gates workflow) carry exactly
  `if: github.repository == format('{0}/{1}', 'BrowserLaboratory', 'wxl-platform')`. The quality-gates
  `test` job and the new job set `WXL_EXPECT_UPSTREAM` to the same comparison, so an upstream-only
  test that wrongly decides "not upstream" fails instead of skipping. The new job runs the fork-init
  and upstream-guard tests on Windows, macOS and Ubuntu with Node 24 and on Ubuntu with Node 22, and
  has no Rust toolchain, Rust cache, install-action or binaryen step.
- The repository-slug guard checks every occurrence in tracked text files, case-insensitively,
  against the rewrite and keep lists. Its classification, a new upstream-pristine check and the
  upstream decision they share are functions tested on fixture maps; the guard, the pristine check
  and the template-hash pin run on the real tree only upstream (`GITHUB_REPOSITORY` when set and
  non-empty; otherwise the manifest's `repository.url` exactly upstream's and a git work tree). The
  pristine check compares A2–A9, the `base: siteBase` line, A1's three URLs, `license` and `author`
  with upstream's values, requires `version` not to be `0.1.0` and no deploy workflow, and reports
  mismatches by field id.

### Documents

README and README.en rewrite their fork section, the `fork:init` command-table row and the
Cloudflare section's sub-path step, with the required and forbidden strings of T77: among them that
every run passes all its arguments, that a Cloudflare range passes `--host cloudflare-pages` every
time (a run without `--host` reinstalls the GitHub Pages workflow) and is served at the domain root,
that `--base` turns the range's site smoke and challenge tests red, and that GitHub Pages ranges
under one owner share the browser's storage. Both trees' `wxl-fork-init/SKILL.md` change as T78
lists and stay equal by `cmp` — an override, for this epic, of the runtimes' freedom to tune their
skills, which also keeps each in its current language, a stated exception to the language rule,
because translating the skill is not this epic's work. The comments of the overridden contracts change as T83 lists. The glossary and the
open-questions register change as T79–T80 list. All of these are checked at stage 6 through 0004-S9.

## Trust Boundaries and Threat Model

| # | Boundary | Protects | Does not protect | Outside the model |
|---|---|---|---|---|
| B1 | CLI arguments → source the site builds from (TypeScript config, short-link module, YAML frontmatter, manifest) and the terminal | No argument can inject code into a module or frontmatter (validated before any write; JSON string literals through a function replacer; A9 written from a fixed set of lines with a validated path); no site name can inject HTML into the home page (`<`, `>`, `&` refused); rejected values are echoed JSON-quoted | `--name` and `--description`, which reach only the manifest through JSON serialisation | a teacher deliberately editing their own source |
| B2 | The engine → the teacher's own content and the platform's history | In anchor mode, writes are confined to A1–A9, the workflow and the engine's own temporary files; a workflow is replaced or removed only when its LF-normalised content equals the current template output or a known old output; a custom short-link origin is not replaced silently | a teacher's own line in an anchor file that matches an anchor form for another repository (rewritten by design); rebrand mode's tree-wide swap and key renames, kept as today | a tree whose anchor file or workflow path is a symbolic link or a hard link; two runs at once on one tree |
| B3 | Upstream repository → teachers' repositories (CI) | Upstream's release and cross-OS jobs never run in a range, including after `--rebrand`; the upstream-only tests skip there, and fail upstream rather than skip | a range's other CI, which runs by design | the upstream organisation being renamed, which would stop the upstream-only jobs (in letter case only, `WXL_EXPECT_UPSTREAM` makes the tests fail) |
| B4 | A configured range → upstream (an accidental run on upstream) | The upstream-pristine test fails in upstream CI, on any anchor, the manifest's identity or a deploy workflow | a local commit before CI runs | — |
| B5 | Deployed range → learners | Unchanged: the engine is not part of the built site; the range stays a static site | GitHub Pages ranges under one owner share one browser origin: their stored work overlaps, a site-wide clear on one also clears the others (against the glossary's 全站清除, which T79 annotates), and a user-site range's challenge service worker can claim the owner's project-site ranges (documented; OQ-018) | — |

## Acceptance Criteria

### Anchors

- **AC-A1** In anchor mode, every occurrence of a doc-anchor form carries the new repository slug, whatever repository slug it held, with no other byte of the file changed; a form with no occurrence, or a missing file, warns with the anchor id and path. (T1, T2)
- **AC-A2** In anchor mode, every file outside A1–A9 and the workflow is byte-identical, A2–A9 files change only inside their anchors, the manifest's fields outside A1 keep their values (in the T4 serialisation), and a code anchor whose value is not being set keeps its lines, need not exist, and leaves its file byte-identical when no other anchor in it is being set. (T3–T5)
- **AC-A3** In anchor mode, for each X of T6 and every subset of X's writes already done, running X ends byte-identical to X run on the unapplied fixture. (T6)
- **AC-A4** In anchor mode, a second identical run reports no changed file, leaves every file's bytes and modification time unchanged, and emits exactly the warnings T7 lists whose condition still holds. (T7)
- **AC-A5** A code anchor being set with exactly one candidate line is written as specified (A6–A8 a JSON string literal; A9 its exact line), replacing an existing value with escapes completely; zero or several candidate lines (a missing file counting as zero), or an unparsable existing A6–A8 value being set, return `exitCode` 1 naming the anchor id and file, with nothing written. (T8–T10)
- **AC-A6** Anchors in CRLF files are recognised (in anchor mode; A9 in both); anchor files other than the manifest keep their line endings and other bytes, and the manifest follows T4. (T11)
- **AC-A7** A missing, BOM-prefixed, unparsable or non-object manifest returns `exitCode` 1 naming it, with nothing written; a `repository` or `bugs` that is not a plain object becomes an object and a plain object keeps its other keys (`repository.type` set to `git`); in anchor mode `name` and `description` change only when given non-empty after trimming. (T12–T14)
- **AC-A8** In anchor mode, `version` becomes `0.1.0` and `license` `ECL-2.0` exactly on first conversion. (T15)

### Host and base

- **AC-H1** An unknown `--host`, or `--host` with `--base`, is an argument error. (T16, T17)
- **AC-H2** `--host` sets A9 to its upstream form, warning with the old line and the upstream form when it was not; `--host` or `--base` on a config without exactly one A9 and one `base: siteBase` line returns `exitCode` 1 with the message strings T18 lists, with nothing written. (T18, T19, T82)
- **AC-H3** `--host github-pages` handles each workflow state as T22 says, with the warning strings T22 names; `--host` with a missing, outdated or (for GitHub Pages) non-deriving template returns `exitCode` 1 with the message strings T24 lists; the template-hash pin holds. (T22, T24, T27)
- **AC-H4** `--host cloudflare-pages` installs no workflow, removes one equal to the current template output or a known old output (listed in `changedFiles`, warning containing `removed` and the path), and leaves any other with a warning containing `left untouched` and the path. (T23)
- **AC-H5** `--base` is accepted exactly by the base grammar or `none`; `--base /x/` and `--base none` write `const siteBase = '/x/'` and `const siteBase = '/'` in both modes; without `--host`, the workflow is handled as T25 says, and a workflow that does not derive `SITE_BASE` next to an upstream-form A9 warns with the strings T26 names, in both modes. (T20, T21, T25, T26)
- **AC-H6** The template runs `configure-pages` with id `pages` before the `pnpm build` step, which sets `SITE_BASE` to `${{ steps.pages.outputs.base_path }}/`, and its header contains `steps.pages.outputs.base_path` and none of the five strings T28 forbids. (T28)
- **AC-H7** The config's `base` and three hrefs are `/`-prefixed with `SITE_BASE` unset or empty and `/x/`-prefixed with `SITE_BASE=/x/`; a resolved base outside the base grammar makes the config throw naming `SITE_BASE`. (T29–T31)

### Short-link origin

- **AC-O1** In anchor mode, `--origin` is accepted exactly when it matches the origin grammar and then sets A8 with the hostname lowercased; each form of T33 is refused, and so is a path under `--host cloudflare-pages`. (T32–T34)
- **AC-O2** `--host cloudflare-pages` without `--origin` is an argument error naming `--origin` and `cloudflare-pages`; `--host github-pages` without `--origin` derives the short-link origin as T36–T37 say on every run; with neither `--host` nor `--origin`, A8 is untouched; replacing an A8 value that is not upstream's warns with the old and new values. (T35–T38, T81)

### Site name

- **AC-N1** A valid `--site-name` (trimmed, 1–60 code points, at least one other than U+200C/U+200D, character rules) sets A6 and both A7; ZWJ emoji are accepted; anything else is an argument error. (T39, T40, T43)
- **AC-N2** `<`, `>` or `&` is an argument error naming the character. (T41)
- **AC-N3** For values containing `"`, `'`, `\`, backtick, `$`, `` $` ``, `$'`, `$$` or `$1`, the written A6 literal evaluates to the value and both frontmatters parse so that `hero.name` equals it. (T42)

### Guard and upstream-only tests

- **AC-G1** The fork-init module exports `UPSTREAM_SLUG`; the guard reports a violation with file and line for the upstream repository slug, in any letter case, in a tracked text file on neither list or outside its anchor forms in a rewrite-list file, and none otherwise (binary files included). (T44, T61–T64)
- **AC-G2** The upstream decision follows a non-empty `GITHUB_REPOSITORY`, comparing exactly, and otherwise requires the manifest's `repository.url` to equal upstream's exactly and a git work tree. (T65, T66)
- **AC-G3** The pristine check reports exactly the field ids of T67 that differ from upstream's values; the guard, pristine and template-hash tests run on the real tree only under the upstream decision, fail when `WXL_EXPECT_UPSTREAM` contradicts the decision, and pass on upstream after this epic. (T67–T69)

### Arguments

- **AC-P1** `--repo` owners and names outside T45 are argument errors. (T45)
- **AC-P2** `--author` outside T46, or a missing or blank `--author` or `--repo`, is an argument error naming the flag. (T46, T47)
- **AC-P3** Any error Node's argument parser raises, or a flag given twice, raises `ForkInitArgError` naming the flag (a positional argument: `positional` and the argument, JSON-quoted); with several failures, the argument check order decides the message. (T48, T49)

### Rebrand mode

- **AC-B1** `--rebrand` with any of `--host`, `--origin`, `--site-name` is an argument error naming `--rebrand` and each of them given. (T50)
- **AC-B2** `--rebrand` behaves as today, every existing rebrand test passing unchanged, with exactly the differences T51 lists. (T51)
- **AC-B3** `--author x --rebrand acme --repo me/x` exits 0 and leaves the upstream-only `if:` and `env` lines, the lines importing `UPSTREAM_SLUG` and the engine file byte-identical. (T52)

### Engine result and CLI

- **AC-E1** A tree error returns `exitCode` 1 with a message naming the anchor id, field or template and the file, printed by the CLI on stderr as `✗ ` and the message, alone, with exit 1; an error found before writing changes, creates and removes no file; in anchor mode a write failure returns `exitCode` 1 naming the file and containing `run the same command again`. (T53–T55)
- **AC-E2** `--dry-run` writes nothing, lists in `changedFiles` everything that would change (workflow installs, replacements and removals included), and reports the same errors and warnings as a real run; every path in the result and its messages uses `/` on every OS. (T56, T57)
- **AC-E3** The CLI copied into a fixture, with the repository's `node_modules` linked, runs under `node --experimental-strip-types` without `tsx`: exit 0 with the T58 stdout on a valid fixture, exit 1 with `✗ ` and the message on stderr for an invalid argument. (T58, T59)
- **AC-E4** The tests listed under "Overridden contracts" are rewritten to their new contract, and every other existing fork-init test passes with its body unchanged. (T60)

### CI

- **AC-C1** The three component tests build their expectations from the imported `SITE_ORIGIN`, contain no upstream hostname, and check that `SITE_ORIGIN` matches the origin grammar. (T70)
- **AC-C2** The `release` job and the new job carry exactly the `if:` of T71, and the `test` job and the new job carry exactly its `env`. (T71)
- **AC-C3** The new job is in the quality-gates workflow with its triggers unchanged and the four `include` entries of T72, runs the two named test files, and adds no Rust toolchain, Rust cache, install-action or binaryen step. (T72)
- **AC-C4** No SourceViewer component test leaves a CodeMirror editor alive after it ends, so the SourceViewer test file's run reports no unhandled error from an editor timer firing after the test environment is torn down. (T85)

### Stage 8

- **AC-X1** On the HEAD of the epic's last ticket branch, in the two exports of 0004-S7, every command exits 0, and the observations of T74 and T75 hold where S7 reads them. (T73–T75)
- **AC-X2** On the preview deployment of the ticket that adds A9, the three favicon URLs return 200, every script and stylesheet or modulepreload URL in `/` and `/zh-TW/` is a same-origin path starting with `/assets/` or a single root-level segment, and both `<title>`s equal production's, fetched in the same check. (T76)

### Documents and comments

- **AC-D1** README, README.en and both `wxl-fork-init/SKILL.md` contain every required string and no forbidden string of T77–T78, and the two skills are equal by `cmp`. (T77, T78)
- **AC-D2** The glossary contains every T79 required string in its block and the glossary test's run passes. (T79)
- **AC-D3** The open-questions register contains every T80 required string in its block. (T80)
- **AC-D4** The comments named in "Overridden contracts" meet T83, and the root `.gitignore` meets T84. (T83, T84)

## Testing Decisions

- Tests assert observable behaviour at seams 0004-S1 to S6: files on disk with their modification
  times, the engine's result, the parsed config and workflows, guard violations
  and pristine mismatches. Nothing is mocked: the component tests read the real `SITE_ORIGIN`. S7 and
  S8 are stage 8; S9 is a stage 6 record of `grep -F`, `cmp` and the glossary test for documents and comments.
  S10 is a vitest run of the SourceViewer component test file, recorded with the ticket that adds it.
- The engine tests extend the existing fixture-in-a-temporary-directory pattern; the shared fixture
  gains A9 and `base: siteBase`, the A2 and A5 forms, both home pages and the short-link module, while
  the legacy config shapes become fixtures for T18, and its template becomes a minimal workflow that
  derives `SITE_BASE`. Idempotence is a second run that changes no
  file's bytes or modification time. Convergence (T6) enumerates every subset of the writes of three
  fixed argument sets, so no write failure needs injecting. A write failure (T55) uses a read-only file in a read-only directory
  and is skipped on Windows and as root. The old template output is a verbatim copy of the template at
  `72327e2`, checked against the engine's list (T27).
- The config module is imported per case with a fresh module registry; frontmatter is parsed with
  the `yaml` package. Character-category tests use only characters whose category is the same in
  Node 22 and 24.
- The guard's classification, the pristine check and the upstream decision are tested on fixtures
  for pass and fail; the upstream-only tests themselves run on the real tree.
- **Stage 8 surface, stated explicitly as an override of the workflow's "preview deployment" rule and
  of AGENTS.md hard rule 4:** no real page is driven. The preview deployment covers the upstream site
  through HTTP responses (AC-X2); a configured range, which no upstream preview contains, is verified
  on local exports from static HTML and JS (AC-X1). This harness is provisional for this epic and is
  recorded as OQ-017. Real deployment of a configured range to both hosts is the user's manual check
  before the workshop.

## Out of Scope

- The setup record `range.json`, merging arguments into earlier ones and replaying them (0006);
  create-wxl (0005); the setup page (0007); the dev module that upgrades a range. Until 0006 a range
  has no setup record: an upgrade can read the repository slug, site name and short-link origin from
  the anchors, and a literal base from A9, but not reliably the host — under `--host` the base is not
  in source, and the workflow's presence, the only trace, is undone by a later run without `--host`.
- Changing rebrand mode beyond T51, including its known limits: it walks the tree without regard to
  `.gitignore`; it rewrites only the literal upstream repository slug, so after a rename a rebranded
  range's A2–A5 keep the range's earlier repository slug while A1 follows `--repo`; a `--repo`
  containing a rename key (for example `me/wxl-locale`) is corrupted on a second identical run; it
  resets `version` and `license` on every run; it cannot use `--host` (T26 still warns).
- Removing a setting once given; separate site names per locale; other places that show "WXL" (the
  hero image's alt text, the navigation and About labels); subdivision-flag emoji in a site name (their
  tag characters are Cf and refused); a site name whose wording the range's prose audit rejects.
- A run interrupted with arguments Y and finished with different arguments X: it converges to X
  except for what first conversion decided on the Y run.
- A configured range whose manifest merge took upstream's `repository.url`: the next run is a first
  conversion and resets `version` and `license`.
- A configured range whose config has A9 and `base: siteBase` but literal head hrefs: favicons 404 on
  a project site, and nothing checks them.
- A GitHub Pages workflow at another path than `.github/workflows/deploy.yml`: not detected.
- Two runs at once on one tree.
- The README quick start's `cd wxl-platform` after the A3 clone line, which is wrong for a range
  whose repository has another name.
- Switching the GitHub Pages workflow from GitHub's interface (OQ-004 remainder); hiding the
  copy-short-link button on GitHub Pages ranges, whose short links 404 (OQ-016).
- Isolating GitHub Pages ranges under one owner from each other (documented; OQ-018).
- A derived GitHub Pages origin whose repository name differs in letter case from GitHub's own
  (the base comes from GitHub and is right; the short-link origin follows `--repo` as typed).
- The release workflow's generated release notes versus the project's release-note rule (OQ-019,
  handled at the 2026-10-16 release); revising the Charter (0005 decides).
- A site name that contains a term the glossary marks as coined, which would fail a range's glossary
  test (recorded; unlikely).

## Further Notes

- The anchors were found by `git grep -n 'BrowserLaboratory/wxl-platform'` on 2026-10-14; every hit
  was an A1–A5 form or in a keep-list file. The guard keeps it that way.
- Because a doc-anchor form is rewritten wherever it appears, upstream's README and CONTRIBUTE can
  hold no example in an A2–A5 form for another repository, and the documents cannot point at
  upstream's repository by URL; the engine's messages carry that URL instead.
- `CONTRIBUTE.md`'s `git remote add upstream` names git's remote for the range's own contributors, so
  it follows the range's repository (A4); it is git's term, not the glossary's *upstream* (T79 adds
  the `_Avoid_`).
- The deploy template has one version in this repository's history (`72327e2`), so the list of known
  old outputs starts with one value. A template from before this repository's first commit (the
  parity test's comment mentions one) is not known; a range carrying it gets T22's "other" warning.
- A Cloudflare range that set `SITE_BASE` in the dashboard without a trailing slash, as the old README
  allowed, gets a build that throws naming `SITE_BASE` once it takes the new config: loud, not silent.
- No `titleTemplate` is configured, so the home page `<title>` is the site title as written; T74 checks
  it with a site name containing `$'` and `$1` (`$&` cannot be tested this way: `&` is refused).
- Specs 0002 and 0003 and their reviews are kept as the record of the two splits.

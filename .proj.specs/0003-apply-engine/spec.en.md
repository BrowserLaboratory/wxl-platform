# Spec 0003: a safe, repeatable apply engine, and range CI that stays green

Status: revision 2, for adversarial review round 2. Derived from `traceability.md`, which holds the
fixed lists this spec refers to (identity anchors A1–A9, overridden contracts, keep list, character
rules, record rules) and the seams 0003-S1 to S8. Stage 1 decisions: Q1–Q24 and E1–E6 (2026-10-14).
Revision 2 applies the user's disposition of round 1 (`review/round-1.md`, groups H1–H14). This epic
is the first of three split from spec 0002; create-wxl (0004) and the setup page (0005) build on it.

## Problem Statement

`fork:init` turns the upstream platform into a teacher's range, and from this release it is also the
engine every later tool replays: the setup page, create-wxl's next steps, and the upgrade module.
Today it cannot carry that load. It replaces the upstream repository slug as a substring in every
text file, so it rewrites history it should keep (changelog links to upstream pull requests), text it
should not touch, and a later rename doubles suffixes. It records nothing, so nothing can be replayed.
It does not set the short-link origin or the site name. And a configured range's own CI turns red:
three component tests hardcode the upstream address, and a GitHub Pages range's base is written into
the config, which breaks the site smoke and challenge tests that navigate from `/` and leaves the
favicons at the root.

## Solution

`fork:init` becomes a small, explicit engine. It rewrites only a fixed list of identity anchors, sets
the short-link origin and the site name, chooses the GitHub Pages workflow from the host, and records
every application in the setup record `range.json`, merging new arguments into what was applied
before. A second identical run changes nothing. A GitHub Pages range's base path is decided when the
site is deployed, from GitHub's own Pages configuration, so every test in a configured range still
runs at `/` and stays green. CI that only makes sense upstream runs only upstream, and an upstream-only
test catches the engine having been run on upstream itself.

## Vocabulary

From `GLOSSARY.md` (section 靶場與老師的工具): **range**, **teacher**, **upstream**, **setup record**.
Also used here:

- **repository slug** — `owner/name` of a GitHub repository. Distinct from the glossary's
  *slug（題目 slug）*, which names a challenge.
- **identity anchor** — one of A1–A9: a place that names the range's own repository or carries one of
  the range's settings. *Doc* anchors (A2–A5) are exact URL forms in documentation; *code* anchors
  (A1, A6–A9) are locations the site depends on.
- **`<from>`** — the set of repository slugs the doc anchors are rewritten from (defined in
  `traceability.md`).
- **first conversion** — a run on a tree whose manifest `repository.url` is still upstream's.
- **short-link origin** — the value of the short-link module's `SITE_ORIGIN`. Distinct from the
  glossary's *origin（紀錄來源）*, from git's `origin` remote and from the HTTP `Origin` header.

## User Stories

1. As a teacher, I want configuring my range to change only the places that name my range, so that
   my challenges, notes and the platform's history are never altered.
2. As a teacher, I want to rename my repository later, or change one setting, by running the command
   with just that argument, so that the rest of my configuration stays as it was.
3. As a teacher, I want the short links my site copies to point at my site, so that a handout never
   sends a class elsewhere.
4. As a teacher, I want my range's name in the browser tab and on the home page, so that learners
   know whose range it is.
5. As a teacher, I want a name that would break the page refused with a reason, so that I can pick
   another instead of publishing a broken site.
6. As a teacher, I want to say where I deploy and have the workflow and base path handled, including
   GitHub Pages user sites and custom domains, so that I do not need to understand `--base`.
7. As a teacher, I want my range's CI to stay green after configuring it, so that a red badge means
   I broke something.
8. As a teacher who configured a range with the earlier `fork:init`, I want the new engine to pick up
   where it left off, so that my version number and repository links are not reset.
9. As the maintainer of a future tool (setup page, upgrade module), I want every application recorded
   in one file, with every current setting, so that I can replay it.
10. As the upstream maintainer, I want upstream-only CI to stay out of teachers' repositories, and a
    test that fails if the engine was ever run on upstream, so that teachers never receive upstream's
    releases and upstream never ships a teacher's identity.

## Implementation Decisions

### Engine interface and errors

- `runForkInit(args, { projectRoot, fs })` remains the one engine; the CLI and every later tool call
  it. `fs` is optional: when given, every read, atomic write and removal goes through it. Engine
  modules import only Node built-ins, so the CLI runs under Node's type stripping without `tsx` or
  `node_modules` (the parameter property in its error class is removed; the `fork:init` package
  script may keep `tsx`).
- New arguments: `origin`, `siteName`, `host` (`github-pages` | `cloudflare-pages`), exposed as
  `--origin`, `--site-name`, `--host`. Existing arguments keep their meaning except where stated.
- Argument errors are thrown by `parseForkInitArgs` as `ForkInitArgError` (the CLI exits 1 and prints
  the message on stderr). Tree-state errors — an invalid record, a manifest that does not parse, a code
  anchor with zero or several matches or an unparsable existing value — are returned as `exitCode` 1
  with a `message` naming the anchor id or record field and the file. Warnings contain the anchor id
  and the file's relative path with `/`.
- Every check and every edit is computed in memory before anything is written; any error writes
  nothing.

### Identity anchors replace the substring scan

- The engine writes only A1–A9 (recognition rules in `traceability.md`), the setup record and the
  GitHub Pages workflow. Doc anchors A2–A5 replace every exact occurrence of their URL form for each
  member of `<from>` = {upstream slug, `applied.repo`, `settings.repo`, and — with no record — the slug
  in the manifest's `repository.url`}, minus the new slug. The fixed delimiters of each form (`.git`,
  `/actions/…`, `/issues`, `#readme`) mean a slug that extends another is never rewritten twice. A doc
  anchor with no occurrence of any of these, and none of the new slug, produces a warning.
- Code anchors must match exactly once when their value is being set; an anchor whose value is not
  being set is not required. An existing value must be a parsable string literal (JS for A6, A8, A9;
  YAML plain, single- or double-quoted scalar for A7). New values are written as JSON string literals
  through a function replacer (so `$&` and friends are literal), and line endings are kept.
- The manifest (A1) is edited structurally: the three repository URLs and `author` on every run;
  `version` = `0.1.0` and `license` = `ECL-2.0` only on first conversion; `name` and `description`
  when given. It is re-serialised as two-space JSON in its existing line-ending style.
- `--rebrand` keeps its four key renames and residual inventory, with three changes: the repository
  slug is handled only by A1–A5 in both modes; the key renames skip the setup record, keep-list files and
  the A6–A8 anchor lines, and the inventory skips the record and keep-list files; and the warning no longer says rebrand renamed the slug.
- **Overridden contracts**, explicitly: every row of the "Overridden contracts" table in
  `traceability.md` — five groups of fork-init tests, the fork-template parity test's SITE_BASE
  assertion, and the comments in the VitePress config, the workflow template, the short-link module,
  the LocaleSwitcher component and its test, the fork-init warning text and both `wxl-fork-init`
  skills. Every other existing fork-init test stands unchanged.

### Host, base and origin

- The base is defined once in the VitePress config as `const siteBase = process.env.SITE_BASE || '/'`
  (A9); `base` and the three `head` hrefs use it. A `SITE_BASE` that is set but does not match
  `^/([A-Za-z0-9._~-]+/)*$` makes the config throw. `--base /x/` (without `--host`) sets A9 to the
  literal `'/x/'`, and `--base none` sets it to `'/'`; nothing deletes the definition.
- The GitHub Pages workflow template runs `actions/configure-pages` (id `pages`) before the build and
  sets `SITE_BASE: ${{ steps.pages.outputs.base_path }}/`. GitHub computes `base_path` for project
  sites, user sites and custom domains alike (`"/my-repo"` or `""`, verified in the pinned action's
  `action.yml` on 2026-10-14), so a range never writes its base into source and follows renames and
  custom domains by itself.
- `--host github-pages`: install the workflow (never clobber); without `--origin`, derive
  `https://<owner>.github.io/<name>`, or `https://<owner>.github.io` when the repository is the user
  site `<owner>.github.io`; a custom domain needs `--origin`. `--host cloudflare-pages`: no workflow,
  remove one equal to the generated workflow, warn about a different one; without `--origin`, the
  `pages.dev` default of T29 with a warning; origins with a path are refused. A derived origin that
  fails the origin rules is an argument error asking for `--origin`. `--host` with `--base`, or an
  unknown `--host`, is an argument error; `--host` with A9 not in its upstream form warns.
- Without `--host`, today's behaviour stands: the workflow is installed when absent and never
  clobbered, A9 follows `--base`, and A8 follows `--origin` or the inherited value.

### Setup record

`range.json` at the range root, committed. Complete example after one CLI run in a fork:

```json
{
  "schema": 1,
  "upstream": {
    "repo": "BrowserLaboratory/wxl-platform",
    "version": null,
    "commit": null
  },
  "createdWith": null,
  "baseline": null,
  "settings": {
    "author": "Lin Mei-Hua",
    "repo": "lin-class/web-range",
    "host": "cloudflare-pages",
    "origin": "https://web-range.pages.dev",
    "siteName": "林老師的資安靶場",
    "base": null,
    "name": null,
    "description": null,
    "rebrand": null
  },
  "applied": {
    "author": "Lin Mei-Hua",
    "repo": "lin-class/web-range",
    "host": "cloudflare-pages",
    "origin": "https://web-range.pages.dev",
    "siteName": "林老師的資安靶場",
    "base": null,
    "name": null,
    "description": null,
    "rebrand": null
  }
}
```

| Field | Type | Written by | Rule |
|---|---|---|---|
| `schema` | integer | engine (new record) | `1`; anything else is refused |
| `upstream.repo` | string | engine (new record) or create-wxl | the upstream slug |
| `upstream.version`, `upstream.commit` | string or null | create-wxl (0004); null when the engine creates the record | null means unknown (E5) |
| `createdWith` | object or null | create-wxl (0004) | preserved |
| `baseline` | object or null | the setup page (0005) | preserved |
| `settings` | object | engine | merged: each argument given replaces its field, every other field is inherited from `applied` (null if none). `base` is a path, `"none"` or null; `origin` holds the value actually written (derived and default included) |
| `applied` | object or null | engine | equal to `settings` after a run whose every write succeeded; otherwise its previous value |
| unknown keys | any | other tools | preserved after the known keys, in their original order |

Validation and format follow the record rules in `traceability.md`. A run validates and computes,
then writes `settings`, then the edits, then `applied`, each as an atomic write (temporary file and
rename). Content that would not change is not written.

### Range CI

- The ShortLinkShare, MergedNav and ChallengeList component tests mock the short-link module's
  `SITE_ORIGIN` and build their expectations from that literal, so they hold for any origin.
- The release job and a new cross-OS job carry exactly
  `if: github.repository == 'BrowserLaboratory/wxl-platform'`. The new job runs the fork-init and guard
  tests on Windows, macOS and Ubuntu with Node 24 and on Ubuntu with Node 22 (the documented floor,
  22.6.0, is not itself tested), and installs no Rust toolchain.
- The repository-slug guard checks every occurrence: a slug in a rewrite-list file outside every
  anchor form, or in a file on neither list, fails naming file and line. It and a new upstream-pristine
  test run only upstream (`GITHUB_REPOSITORY` when set; otherwise the manifest's `repository.url`
  exactly upstream's and a git work tree). The pristine test asserts: no `range.json`; A6, both A7, A8
  and A9 hold upstream's values; the manifest is upstream's.

### Documents

README, README.en and both trees' `wxl-fork-init` skill change as T73–T74 list, including a warning
that GitHub Pages ranges under one owner share the browser's storage. Each skill keeps its current
language: a stated exception to the language rule, because translating the skill is not this epic's
work. The glossary, and the open-questions register, change as T75–T76 list.

## Trust Boundaries and Threat Model

| # | Boundary | Protects | Does not protect | Outside the model |
|---|---|---|---|---|
| B1 | CLI arguments → source the site builds from (TypeScript config, short-link module, YAML frontmatter, manifest) | No argument can inject code into a module or frontmatter (validated before any write; JSON string literals through a function replacer), and no site name can inject HTML into the home page (`<`, `>`, `&` refused) | — | a teacher deliberately editing their own source. The setup page's local endpoint is 0005's boundary |
| B2 | Setup record (committed, possibly from a colleague's pull request or another range) → the engine | Every record field is validated with the argument rules before it is used; forbidden keys are refused; the record is never merged deeply | a valid but unwanted record a teacher accepted | — |
| B3 | The engine → the teacher's own content and the platform's history | Without `--rebrand`, writes are confined to A1–A9, the record and the workflow | `--rebrand`'s four key renames, tree-wide by design (record and keep list excluded) | a tree whose workflow path is a symbolic link out of the repository: running a repository's own scripts already trusts it |
| B4 | Upstream repository → teachers' repositories (CI) | Upstream's release and cross-OS jobs never run in a range; the guard and pristine tests skip there | a range's other CI, which runs by design | the upstream organisation being renamed, which would silently stop the upstream-only jobs |
| B5 | A configured range → upstream (an accidental run on upstream) | The upstream-pristine test fails in upstream CI | a local commit before CI runs | — |
| B6 | Deployed range → learners | Unchanged: the engine is not part of the built site; the range stays static (ADR-0006) | GitHub Pages ranges under one owner share one browser origin, so their stored work and site-wide clears overlap (documented, not fixed) | — |

## Acceptance Criteria

### Anchors

- **AC-A1** Doc anchors are replaced for every member of `<from>` with no other byte of the file changed; an anchor with no occurrence warns with its id and path. (T1, T2)
- **AC-A2** Without `--rebrand`, every file outside A1–A9, the record and the workflow is byte-identical, A2–A9 files change only inside their anchors, the manifest changes only in A1 fields, and a code-anchor file whose value is not being set is byte-identical; with `--rebrand`, only T63's renames are added. (T3–T5)
- **AC-A3** `<from>` is the set defined in `traceability.md` for each record state. (T6)
- **AC-A4** With a new slug that extends a member of `<from>` or contains the upstream slug, a second identical run changes zero files. (T7)
- **AC-A5** A code anchor being set with exactly one match is written as a JSON string literal, replacing an existing value with escapes completely; zero or several matches, or an unparsable existing value, return `exitCode` 1 naming the anchor and file, with nothing written. (T8–T10)
- **AC-A6** Anchor files and the manifest keep their line endings. (T11)
- **AC-A7** The guard reports a violation with file and line for a slug in a file on neither list or outside every anchor form in a rewrite-list file, none otherwise, and runs only under the upstream decision of T15–T16. (T12–T16)
- **AC-A8** Upstream, the pristine test passes only when there is no `range.json` and A6, both A7, A8, A9 and the manifest hold upstream's values. (T17)

### Site name

- **AC-N1** A valid `--site-name` (trimmed, 1–60 code points, character rules) sets A6 and both A7 and is stored trimmed; ZWJ emoji are accepted; anything else is an argument error. (T18, T19, T22, T23)
- **AC-N2** `<`, `>` or `&` is an argument error naming the character. (T20)
- **AC-N3** For values containing `"`, `'`, `\`, backtick, `$`, `$&`, `` $` ``, `$'`, `$$` or `$1`, the written A6 literal evaluates to the value and both frontmatters parse so that `hero.name` equals it. (T21)

### Origin

- **AC-O1** `--origin` accepts exactly the form of T24 and refuses each form of T25 and, with `--host cloudflare-pages`, any path. (T24–T26)
- **AC-O2** Without `--origin`, the origin is derived as T27–T29 say and validated; a derived origin that fails is an argument error asking for `--origin`; with no host and nothing inherited, A8 is untouched. (T27–T31)

### Host and base

- **AC-H1** `--host github-pages` installs the workflow when absent, leaves a different one with a warning, and does not touch A9. (T33)
- **AC-H2** `--host cloudflare-pages` installs no workflow, removes one equal to the generated workflow, and leaves a different one with a warning. (T34)
- **AC-H3** An unknown `--host`, or `--host` with `--base`, is an argument error; `--host` with A9 not in its upstream form warns. (T32, T35, T36)
- **AC-H4** Without `--host`, the workflow is installed when absent and never clobbered; `--base /x/` and `--base none` set A9 to `'/x/'` and `'/'`; A9 missing or repeated returns `exitCode` 1. (T37–T40)
- **AC-H5** The template runs `configure-pages` with id `pages` before the build, the build sets `SITE_BASE` to `${{ steps.pages.outputs.base_path }}/`, and the header contains neither "刻意不設" nor "必須在 .vitepress/config.mts 設". (T41)
- **AC-H6** The config's `base` and three head hrefs are `/`-prefixed with `SITE_BASE` unset or empty and `/x/`-prefixed with `SITE_BASE=/x/`; an invalid `SITE_BASE` makes the config throw naming it. (T42–T44)

### Arguments

- **AC-P1** `--repo` owners and names outside T45 are argument errors. (T45)
- **AC-P3** `--author` outside T46 is an argument error. (T46)

### Setup record

- **AC-R1** With no record, `range.json` is created when `settings` is first written, with `upstream` = {upstream slug, null, null} and null `createdWith` and `baseline`; with a record, `upstream`, `createdWith`, `baseline` and unknown keys are unchanged. (T47, T48)
- **AC-R2** An unparsable record, `schema` ≠ 1, a wrong type, an invalid subfield value or a forbidden key returns `exitCode` 1 naming it, with nothing written; a missing top-level field is null. (T49, T50)
- **AC-R3** A successful run writes `settings`, the edits, then `applied`, each atomically; a write failure part-way returns `exitCode` 1 with `applied` unchanged, and any later run produces the tree one successful run would have produced with the same effective settings; validation, record and anchor failures write nothing. (T51–T54)
- **AC-R4** The record is two-space JSON, known keys in table order then unknown keys, LF, trailing newline. (T55)
- **AC-R5** `--dry-run` writes nothing, lists in `changedFiles` what would change (record included), and reports the same errors as a real run. (T56)
- **AC-R6** `version` becomes `0.1.0` and `license` `ECL-2.0` only on first conversion. (T57)
- **AC-R7** A second identical run reports no changed file and makes no write call. (T58)
- **AC-R8** The tests listed under "Overridden contracts" are rewritten to their new contract, and every other existing fork-init test passes unchanged. (T61)
- **AC-R9** The CLI copied into a fixture runs under `node --experimental-strip-types` without `tsx` or `node_modules`: exit 0 on a valid fixture, exit 1 with the message on stderr for an invalid argument. (T62)
- **AC-R10** `settings` merges: a given argument replaces its field, others are inherited from `applied`; `base` records `"/x/"`, `"none"` or the inherited value. (T59, T60)

### Rebrand

- **AC-B1** With `--rebrand`, the repository slug changes only through A1–A5, the key renames skip the record, keep-list files and the A6–A8 anchor lines, the residual inventory skips the record and keep-list files, and the warning does not claim the slug was renamed by rebrand. (T63, T64)

### CI

- **AC-C1** The three component tests mock `SITE_ORIGIN` as `https://example.test/sub`, build expectations from that literal, and contain no upstream address. (T65)
- **AC-C2** The release job and the new job carry exactly the upstream-only `if:`. (T66)
- **AC-C3** The new job's matrix is the four `include` entries of T67, it runs the two named test files and installs no Rust toolchain; paths in `changedFiles` and warnings use `/` on every OS. (T67, T68)

### Stage 8

- **AC-X1** In separate exports for each host, prepared and run as 0003-S7 lists, every command exits 0; both built hero names equal the site name, `<title>` ends with it, the built short-link origin equals the origin, and favicon hrefs are at `/`, or under `/x/` in a `SITE_BASE=/x/` build. (T69–T71)
- **AC-X2** On the preview deployment of the ticket that changes the config, the three favicon URLs return 200, asset URLs start with `/assets/`, and `<title>` equals the production site's. (T72)

### Documents

- **AC-D1** README, README.en and both `wxl-fork-init` skills contain the T73–T74 changes and none of the statements T73 lists for removal. (T73, T74)
- **AC-D2** The glossary has the T75 changes and its test passes. (T75)
- **AC-D3** The open-questions register has the T76 changes. (T76)

## Testing Decisions

- Tests assert observable behaviour at seams 0003-S1 to S8: files on disk, the engine's result, write
  calls through the injected `fs`, the parsed config and workflows, guard violations.
- The engine tests extend the existing fixture-in-a-temporary-directory pattern; fixtures use the A9
  shape. Idempotence is a second run with no write call. A part-way failure is injected through `fs`,
  so it behaves the same on every OS.
- The config module is imported per case with a fresh module registry (prior art: none here; stage 8
  confirms with real builds). Frontmatter is parsed with the `yaml` package.
- The guard's classification functions are tested on fixtures for fail, skip and pass; the guard test
  itself runs on the real tree.
- **Stage 8 surface, stated explicitly as an override of the workflow's "preview deployment" rule:**
  the preview deployment covers the upstream site (AC-X2); a configured range, which no upstream
  preview contains, is verified on local exports (AC-X1), from static HTML. The non-browser harness is
  recorded as an open question (T76). Real deployment of a configured range to both hosts is the
  user's manual check before the workshop.

## Out of Scope

- create-wxl (0004) and the setup page (0005), including the setup page's local endpoint, the refusal
  to configure the upstream checkout interactively, environment checks and the baseline commit.
- The upgrade module, which will replay `settings` (E5: unknown versions inferred from git history).
- Removing a setting once given (the merge has no "unset"); rebranding beyond today's `--rebrand`;
  separate site names per locale.
- Switching the GitHub Pages workflow from GitHub's interface (OQ-004 remainder); hiding the
  copy-short-link button on GitHub Pages ranges, whose short links 404 (new open question).
- Isolating the browser storage of GitHub Pages ranges under one owner (documented only).
- The release workflow's automatic GitHub Release versus the project's release-note rule (handled at
  the 2026-10-16 release); revising the Charter (0004 decides); shared documents that describe
  upstream remaining as upstream wrote them in a range.
- A site name that contains a term the glossary marks as coined, which would fail a range's glossary
  test (recorded; unlikely).

## Further Notes

- The anchors were found by `git grep -n 'BrowserLaboratory/wxl-platform'` on 2026-10-14; the guard
  keeps the list complete from now on.
- `CONTRIBUTE.md`'s `git remote add upstream` names git's remote for the range's own contributors, so
  it follows the range's repository (A4); it is git's term, not the glossary's *upstream*.
- Round 1's 106 findings and their disposition: `review/round-1.md` and `review/disposition.md`.

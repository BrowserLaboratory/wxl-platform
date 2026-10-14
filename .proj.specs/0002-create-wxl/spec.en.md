# Spec 0002: create-wxl and the range setup module

Status: draft for adversarial review (stage 3). Derived from `traceability.md`; the stage 1 interview
(decisions Q1–Q24, 2026-10-14) is the source of every decision below.

## Problem Statement

A teacher who wants a range of their own today has to fork the repository, read the README, run
`pnpm fork:init` with flags whose meaning depends on hosting details (`--base`), and hand-edit the
short-link origin. Missing that last step is silent: links printed on a handout point at the upstream
site, and once upstream gains a challenge with the same number, a class lands on a different
challenge on a different site. Nothing records how a range was created, so a later upgrade to a new
platform version has nothing to replay. Teachers' machines vary (Windows, macOS, Linux) and may lack
git, which the current path assumes without saying so.

## Solution

Two pieces, used one after the other.

1. **create-wxl**, run as `npm create wxl <folder>` or `pnpm create wxl <folder>`. It checks the Node
   version, downloads the platform at the exact commit its release names, unpacks it safely, drops
   upstream's own records, writes a setup record naming the upstream it came from, and tells the
   teacher to run the setup module. It touches no git, installs nothing, and asks no settings.
2. **The setup module**, the first dev module, run as `pnpm range:setup` (or `npm run range:setup`)
   inside the range. It needs only Node. It opens a bilingual local web page that checks the machine
   (git required; Rust and wasm-pack flagged as needed only for local development, with an
   OS-specific install tutorial for anything missing), takes five settings, and on save applies them
   by rewriting the range's source. The first save also records a baseline commit of the untouched
   copy. The page can be reopened at any time; re-applying the same settings changes nothing. It ends
   with the deployment steps for the chosen host.

## Vocabulary

From `GLOSSARY.md`, section "靶場與老師的工具": **range**, **teacher**, **upstream**, **dev module**,
**setup record**. Also used here:

- **release commit** — the commit tag `v<version>` pointed at when create-wxl `<version>` was
  published.
- **baseline commit** — the first commit of a range created by create-wxl: the tree exactly as
  create-wxl left it, before any setting is applied.
- **edit targets** — the places the setup module may rewrite: package identity fields, the upstream
  slug, the VitePress base, the short-link origin, the site title, the two home-page hero names, and
  the presence of the GitHub Pages workflow.

## User Stories

1. As a teacher, I want one command that gives me a ready folder, so that I do not have to fork and
   read the fork instructions first.
2. As a teacher, I want the command to stop at the start when my Node is too old, so that I do not
   find out half-way.
3. As a teacher, I want the command to refuse to touch a folder that already has files, so that it
   cannot overwrite my work.
4. As a teacher, I want to configure my range on a web page instead of answering terminal prompts,
   so that I can see what I am choosing and come back later to change it.
5. As a teacher, I want the page to tell me what my computer is missing and how to install it on my
   OS, so that an unfamiliar machine does not block me.
6. As a teacher, I want to choose where I deploy and have the technical consequences (base path,
   workflow, short-link address) worked out for me, so that I do not need to understand `--base`.
7. As a teacher, I want my site to carry my range's name, so that learners know whose range it is.
8. As a teacher, I want the short links my site copies to point at my site, so that a handout never
   sends a class to someone else's challenge.
9. As a teacher, I want the page to end with the exact deployment steps for my host, so that I can
   publish without searching.
10. As a teacher who forked on GitHub, I want the same setup page to work on my fork, so that there
    is one path for everyone.
11. As a teacher, I want my range to remember which upstream version it came from and how I set it
    up, so that a later upgrade can replay it.
12. As the upstream maintainer, I want the setup page to refuse to rewrite the upstream repository
    itself, so that running it in the wrong checkout does no damage.

## Implementation Decisions

### create-wxl

- A self-contained npm package in its own directory of this repository, outside any workspace, written
  in plain ESM JavaScript (Node does not strip types inside `node_modules`). Its only runtime
  dependency is `tar`, pinned to an exact version; the repository root carries the same version as a
  devDependency so tests resolve it. Its version always equals the platform's version.
- The published package carries a release file naming the release commit. A pre-publish step reads
  tag `v<version>`, writes the release file, and fails if the tag is missing. The release file is not
  committed.
- A development override names a commit explicitly (40 lowercase hex). It exists for tests and for
  the stage 8 run of an unreleased commit; it can only point at the upstream repository.
- Download: `https://codeload.github.com/<upstream>/tar.gz/<commit>`, with a timeout. Extraction
  goes into a fresh temporary directory beside the target and is moved into place only after the whole
  archive passed; any failure removes what create-wxl created.
- Extraction policy: regular files and directories only; any other entry type, any absolute path, any
  `..` segment, or any path resolving outside the target rejects the whole archive. The single
  top-level directory is stripped.
- After extraction create-wxl writes the changelog and the open-questions register from the platform's
  templates, writes the setup record with `upstream` and `createdWith` filled and `baseline`,
  `settings` and `applied` null, and removes the upstream-only block of `.gitattributes` (delimited by
  marker comments) so the teacher's own archives are complete.
- Locale: Traditional Chinese when `LC_ALL`, `LC_MESSAGES` or `LANG` (first one set) starts with `zh`;
  English otherwise.
- The folder argument is optional on a TTY (prompt, default `my-range`) and required otherwise.

### Upstream-only files

- `.gitattributes` marks upstream-only paths `export-ignore`, so GitHub's tarball omits them: every
  epic directory under the specs root, the tickets root, the open-questions register, the changelog,
  the create-wxl directory, and the tests that only make sense upstream (create-wxl's tests, the
  exported-tree test, the version-alignment test). Everything else in Q5's keep list ships unchanged.
  These rules sit in a block between marker comments, which create-wxl removes (see above).
- The two replacement files come from templates kept in the platform's template directory, so they
  version with the platform.

### fork:init extension

- `runForkInit` stays the single engine for edits and gains four arguments: `origin`, `siteName`,
  `host` (`github-pages` | `cloudflare-pages`) and `fromRepo`, plus `keepVersion`. The CLI keeps
  resetting the package version to `0.1.0` by default; `keepVersion` suppresses it, and the setup
  module passes it whenever the record already has `applied` settings.
- Every edit is "set this target to the value", never "replace the upstream default", so a second
  identical run changes nothing. The slug is the one edit that needs the previous value: `fromRepo`
  (and the upstream slug, if still present) is replaced by `repo`.
- `host` decides the base (`/<repo-name>/` for GitHub Pages; removed for Cloudflare Pages) and the
  workflow: installed for GitHub Pages under the existing never-clobber rule; for Cloudflare Pages
  removed only when its content equals the generated workflow, otherwise left with a warning.
- String values are written as escaped string literals (JSON string syntax, which is valid both in the
  TypeScript config and in YAML double-quoted frontmatter).
- The TypeScript parameter property in the CLI's error class is removed so that the CLI and the setup
  module run under Node's type stripping with no `tsx`.
- Without the new arguments, behaviour is unchanged.

### Setup record

Root of the range, one JSON file with a brand-free name. Complete example after a first save:

```json
{
  "schema": 1,
  "upstream": {
    "repo": "BrowserLaboratory/wxl-platform",
    "version": "3.0.0",
    "commit": "0123456789abcdef0123456789abcdef01234567"
  },
  "createdWith": { "createWxl": "3.0.0" },
  "baseline": { "commit": "89abcdef0123456789abcdef0123456789abcdef" },
  "settings": {
    "author": "Lin Mei-Hua",
    "repo": "lin-class/web-range",
    "host": "cloudflare-pages",
    "origin": "https://web-range.pages.dev",
    "siteName": "林老師的資安靶場"
  },
  "applied": {
    "author": "Lin Mei-Hua",
    "repo": "lin-class/web-range",
    "host": "cloudflare-pages",
    "origin": "https://web-range.pages.dev",
    "siteName": "林老師的資安靶場"
  }
}
```

| Field | Type | Null when | Rule |
|---|---|---|---|
| `schema` | integer | never | `1`; any other value is refused |
| `upstream.repo` | string | never | the upstream slug |
| `upstream.version` | string | never | from create-wxl's release; for a fork, the package version at first setup |
| `upstream.commit` | 40-hex string | fork or clone | the release commit |
| `createdWith` | object | fork or clone | `{ "createWxl": <version> }` |
| `baseline` | object | before the first save; fork or clone | `{ "commit": <40-hex> }` |
| `settings` | object | before the first save | the desired settings, below |
| `applied` | object | until a save has applied every edit | same shape as `settings`: the last settings applied in full; the slug is always replaced from `applied.repo` (or the upstream slug when null) |
| `settings.author` | string | — | 1–100 characters, no control characters |
| `settings.repo` | string | — | `owner/name`, each part `[A-Za-z0-9._-]+` |
| `settings.host` | string | — | `github-pages` or `cloudflare-pages` |
| `settings.origin` | string | — | GitHub Pages: derived `https://<owner, lowercased>.github.io/<name>`; Cloudflare: `https://` + lowercase hostname (`[a-z0-9.-]`), no path, port, query, fragment or userinfo; the default offered is `https://<name>.pages.dev` with the name lowercased and characters outside `[a-z0-9-]` replaced by `-` |
| `settings.siteName` | string | — | 1–60 characters, no control characters or newlines |

Written as two-space JSON with a trailing newline; equal input gives byte-identical output.

### Setup module

- Lives in the range's scripts, outside the site's source directory, so it is never built into the
  site. Its import graph is Node built-ins and repository files only; it starts with no
  `node_modules`. Started by the `range:setup` package script through Node's type stripping.
- Serves a static page (plain HTML, CSS and JavaScript, no build step) and a small JSON API on
  `127.0.0.1` at an OS-assigned port. Prints the URL with a per-start token (32 random bytes, hex) and
  tries to open the browser with the platform's launcher, called without a shell; on failure it only
  prints.
- Every request needs the token. Every request needs a `Host` of `127.0.0.1:<port>` or
  `localhost:<port>`. Every state-changing request needs an `Origin` equal to the server's origin.
  Bodies over 16 KiB are refused; a save while another is running is refused.
- Environment check: probes run without a shell, with a timeout; a failing probe counts as missing.
  git (≥ 2.28) and a configured `user.name` and `user.email` block saving; `cargo` and `wasm-pack`
  are reported as needed only for local development and never block. Each missing item shows the
  tutorial for `process.platform` (`win32`, `darwin`, `linux`; others get generic links).
- Save, in order: validate → refuse if there is no setup record and the `origin` remote is the
  upstream → if there is no `.git`: `git init` on `main`, baseline commit of the current tree, record
  the baseline → write `settings` → apply through `runForkInit`, replacing the slug from
  `applied.repo` (upstream slug when null) and passing `keepVersion` when `applied` exists → set
  `applied` = `settings` → respond with changed files, warnings and next steps. Later saves skip the
  git steps. If applying fails, `applied` is unchanged, so the next save replaces from the right slug
  and finishes the edits.
- Next steps come from a pure function of the record and the locale (T72, T73).
- UI strings live in one table per locale with identical keys. The page defaults to the browser's
  language (`zh*` → Traditional Chinese) and has a toggle. The GitHub Pages origin is shown read-only.

### CI and documents

- A new job in the quality-gates workflow runs the create-wxl, setup-module and fork-init tests on
  Windows, macOS and Ubuntu with Node 24, and on Ubuntu with Node 22.
- README and README.en: quick start becomes create-wxl → `range:setup`; the after-fork section
  becomes `range:setup`; Node and git are stated as the only requirements for creating and publishing.
  Both trees' `wxl-fork-init` skill name `range:setup` as the teacher-facing path and keep
  `fork:init` for GitHub Pages root and custom-domain cases.
- Open questions: OQ-005 resolved; OQ-004 records that Cloudflare ranges get no workflow while the
  in-GitHub switch stays open; a new entry for hiding the copy-short-link button on GitHub Pages
  ranges.

## Trust Boundaries and Threat Model

| # | Boundary | Protects | Does not protect | Outside the model |
|---|---|---|---|---|
| B1 | npm registry → teacher's machine (create-wxl and `tar`) | create-wxl's own code (published from the maintainer's account) and `tar` at an exact version | `tar`'s transitive dependencies, which follow semver ranges; no npm provenance (manual publish) | a compromised maintainer npm account (mitigation: 2FA, a user action) |
| B2 | GitHub → teacher's machine (the platform tarball) | content pinned to the release commit, which a moved tag cannot change; HTTPS; extraction cannot write outside the target or create links | the content of the upstream repository at that commit, which is trusted by definition | a compromised upstream repository |
| B3 | Other web pages in the teacher's browser → the local setup server | the range's files: only token-bearing, same-origin requests to `127.0.0.1` with a matching `Host` can change them (blocks cross-site requests and DNS rebinding) | the token is in the printed URL and the browser history | other local users or malware on the same machine, which can already edit the files |
| B4 | Form input → executable source (the TypeScript config, YAML frontmatter, the short-link module) | every value is validated, and string values are written as escaped literals, so no input can inject code into the config module or the frontmatter | — | a teacher deliberately editing their own source |
| B5 | The setup module → the upstream repository's own checkout | upstream identity: refused when there is no setup record and `origin` is the upstream | an upstream checkout whose `origin` was renamed | — |
| B6 | Deployed range → learners | unchanged: the setup module is never part of the built site (AC-B1). The range remains static; ADR-0006's session-gate model is untouched | — | — |

## Acceptance Criteria

### create-wxl

- **AC-C1** On Node below 22.6.0 it exits 1 with an upgrade message and creates nothing; at or above it proceeds. (T1, T2)
- **AC-C2** Without a folder argument it prompts with default `my-range` on a TTY and exits 1 with usage otherwise. (T3, T4)
- **AC-C3** A non-empty target makes it exit 1 with the target unchanged; an absent or empty target is populated. (T5, T6)
- **AC-C4** It downloads the release commit, or the override when given; a malformed override, or no release commit and no override, exits 1 before any request. (T7–T9)
- **AC-C5** A non-200 response, network error or timeout exits 1 and leaves the target absent or empty, as it was. (T10)
- **AC-C6** An archive with any entry that is not a regular file or directory, or whose path is absolute, contains `..`, or resolves outside the target, is rejected whole, exits 1 and leaves the target as in AC-C5. (T11–T13)
- **AC-C7** The single top-level directory is stripped. (T14)
- **AC-C8** The changelog and open-questions register are written from the templates, the setup record holds `upstream`, `createdWith`, `baseline: null`, `settings: null`, `applied: null`, and `.gitattributes` no longer contains the upstream-only block. (T15)
- **AC-C9** No `.git` exists afterwards, no package was installed, and the only network request was the tarball. (T16)
- **AC-C10** The closing message is Traditional Chinese for a `zh` locale and English otherwise, and names `pnpm range:setup` and `npm run range:setup`. (T17)
- **AC-C11** create-wxl's version equals the platform's, and its `tar` dependency is an exact version equal to the root devDependency. (T18, T19)
- **AC-C12** The pre-publish step writes the release commit of tag `v<version>` and fails when that tag does not exist. (T20)

### Exported tree

- **AC-E1** `git archive HEAD` omits exactly the upstream-only paths of T21 and includes the kept paths of T22. (T21, T22)

### fork:init

- **AC-F1** `origin` sets the short-link origin; invalid values exit 1 with no file written. (T23, T24)
- **AC-F2** `siteName` sets the title and both hero names as escaped literals; invalid values exit 1; names with quotes, backslash, backtick, `$` or `<` round-trip exactly through the config module and the frontmatter. (T25–T27)
- **AC-F3** `github-pages` sets base `/<repo-name>/` and installs the workflow under the never-clobber rule; `cloudflare-pages` removes the base, installs no workflow, removes a workflow equal to the generated one, and leaves a different one with a warning. (T28–T31)
- **AC-F4** `fromRepo` (and the upstream slug, if present) is replaced by `repo`; a malformed `fromRepo` exits 1. (T32, T33)
- **AC-F5** The package version is reset to `0.1.0` unless `keepVersion` is given. (T34)
- **AC-F6** A second run with the same arguments reports zero changed files. (T35)
- **AC-F7** Without the new arguments every existing fork-init test passes unchanged. (T36)
- **AC-F8** The CLI runs under `node --experimental-strip-types` with no `tsx`. (T37)

### Setup record

- **AC-R1** A record whose `schema` is not `1` is refused with a message and nothing is written. (T38)
- **AC-R2** Each field follows the table in Implementation Decisions; any violation returns field errors and writes nothing. (T40–T48)
- **AC-R3** The record is two-space JSON with a trailing newline, byte-identical for equal input. (T39)

### Environment check

- **AC-V1** The Node version is reported. (T53)
- **AC-V2** Missing git, git older than 2.28, or an unset `user.name` or `user.email` blocks saving and shows the tutorial. (T49, T50)
- **AC-V3** Missing `cargo` or `wasm-pack` is shown as "local development only" with a tutorial and does not block. (T51, T52)
- **AC-V4** Tutorials follow `win32`, `darwin` or `linux`; any other platform gets generic links. (T54)
- **AC-V5** Probes run without a shell and with a timeout; a failed or timed-out probe counts as missing. (T55)

### Local server

- **AC-S1** It listens on `127.0.0.1` at an OS-assigned port and prints a URL carrying a 32-byte hex token. (T56)
- **AC-S2** Any request without the right token gets 403. (T57)
- **AC-S3** A wrong `Host`, or a state-changing request without a matching `Origin`, gets 403. (T58, T59)
- **AC-S4** After a save, the only changed paths are edit targets, the setup record and git metadata. (T64)
- **AC-S5** A failed browser launch prints a message and the server keeps running. (T62)
- **AC-S6** Bodies over 16 KiB get 413; a save during another save gets 409. (T60, T61)
- **AC-S7** The setup module imports only `node:` built-ins and repository files, and starts with no `node_modules`. (T63)

### Save flow

- **AC-G1** With no `.git`: init on `main`, baseline commit of the tree as create-wxl left it, baseline recorded, then settings applied. (T65)
- **AC-G2** With `.git` present: no init, no commit, `baseline` null, and the page explains why. (T66)
- **AC-G3** With no setup record and `origin` pointing at the upstream, save is refused with an explanation and nothing is written. (T67)
- **AC-G4** A first setup without a record replaces the slug from the upstream slug, resets the package version, and records the package version, a null commit and a null `createdWith`. (T68)
- **AC-G5** A later save makes no commit, replaces the slug from `applied.repo`, keeps the package version, and sets `applied` to `settings` after success. (T69)
- **AC-G6** If applying fails, `settings` holds the new values, `applied` is unchanged, the error is reported, and the next save completes the edits. (T70)
- **AC-G7** The response lists changed files, warnings and the host's next steps exactly as T72 or T73. (T71–T73)

### UI

- **AC-U1** The `en` and `zh-TW` string tables have the same keys. (T74)
- **AC-U2** The page defaults to the browser's language and the toggle switches it. (T75)
- **AC-U3** In the Browser panel: environment check, fill, first save, edit, second save all succeed. (T77)
- **AC-U4** With GitHub Pages chosen, the origin is shown read-only with the derived value. (T76)

### Build, CI, documents

- **AC-B1** After `pnpm build`, no setup-module file is in the built output. (T79)
- **AC-CI1** The new CI job runs the three test groups on Windows, macOS, Ubuntu (Node 24) and Ubuntu (Node 22), and passes in a range where the upstream-only tests are absent. (T78, T85)
- **AC-D1** README, README.en and both `wxl-fork-init` skills describe create-wxl → `range:setup` and state Node and git as the requirements. (T80)
- **AC-D2** OQ-005 is resolved, OQ-004 records the Cloudflare rule, and the short-link-button entry exists. (T81)
- **AC-D3** The five glossary terms exist and the glossary test passes. (T82)

### Stage 8

- **AC-X1** The packed create-wxl, given the ticket's pushed commit, creates a range from GitHub's tarball. (T83)
- **AC-X2** In that range, `pnpm install && pnpm build` succeeds and the output carries the chosen title, base and origin. (T84)

## Testing Decisions

- Tests assert external behaviour at the seams S1–S11: files on disk, exit codes, HTTP status codes,
  git history, printed messages. No test reaches into a module's internals.
- create-wxl: an injected fetch serves fixture tarballs built in the test (including malicious ones);
  no test touches the network. The environment check takes an injected command runner and platform.
- fork:init: extends the existing fixture-in-a-temporary-directory pattern of the fork-init tests;
  idempotence is asserted by running twice and counting changed files.
- Save flow: real git in temporary directories, with a configured identity.
- Local server: real HTTP requests to an ephemeral port.
- Exported tree: assertions over `git archive HEAD` of the repository itself.
- CI workflow: assertions over the workflow file, after the pattern of the existing workflow parity
  tests.
- UI: only key parity is automated; the end-to-end flow is the stage 8 Browser-panel check (the user
  chose this trade-off for the schedule).
- Stage 8 surfaces: ① packed create-wxl run against the ticket's pushed commit; ② the setup page in
  the Browser panel; ③ build of the generated range. Windows is covered by CI unit tests only, and the
  report says so. Real deployment to both hosts is the user's manual check before the workshop.
- Prior art: the fork-init tests, the workflow parity tests, the glossary test.

## Out of Scope

- The upgrade / migration dev module (its own epic on 2026-10-15), including the definition of the
  boundary between teacher content and platform files. This epic only guarantees its inputs: the
  setup record and the baseline commit.
- The AI challenge-authoring dev module (a later epic, before W5 only if time allows).
- GitHub Pages user or organisation sites and custom domains in the setup page (`fork:init` stays the
  documented path).
- Rebranding, and separate site names per locale.
- Reading settings at build time instead of rewriting source.
- Switching the GitHub Pages workflow from GitHub's interface (OQ-004 remainder).
- Hiding the copy-short-link button on GitHub Pages ranges (new open question).
- Checks for pnpm, wasm-tools and Playwright's Chromium.
- npm provenance; automated real deployments; manual end-to-end runs on Windows.
- A git-based path for receiving upstream updates (the range is a clean copy).

## Further Notes

- Release (2026-10-16): tag `v3.0.0`, GitHub release, and publishing create-wxl `3.0.0` happen only
  with the user's approval at each step; the user publishes to npm from their own account; release
  notes come from `/tw-emoji-release-note`.
- Assumption to verify at stage 8 ①: GitHub's source tarballs honour `export-ignore`.
- Derived during spec writing and flagged to the user: git's `user.name` and `user.email` are part of
  the blocking git check, because the baseline commit cannot be made without them; git ≥ 2.28 is
  required for `git init` on `main`.

# Traceability: 0004-stateless-engine

`{type × field × boundary} → {expected behaviour → acceptance criterion}`. The spec is derived from
this file. Stage 1 decisions: Q1–Q24, E1–E6 and F1–F3 (2026-10-14). This epic was split from
0003-apply-engine after its round 2; the parts of 0003 that depend on a setup record are not here.
Revision 2 applies the disposition of round 1 (`review/disposition.md`, groups M1–M10); row ids of
revision 1 are kept, and rows added in revision 2 start at T81.

## Seams (0003's approved seams; S1, S5, S6 and S7 changed with the user's approval, 2026-10-14)

| Seam | Entry point | Observable output |
|---|---|---|
| 0004-S1 | `parseForkInitArgs(argv)`; `runForkInit(args, { projectRoot })` on a fixture tree in a temporary directory | files on disk and their modification times; the returned `exitCode`, `message`, `changedFiles`, `warnings`, `sensitiveKeys`, `residualFiles`, `residualHits`; a `ForkInitArgError` thrown by `parseForkInitArgs` |
| 0004-S2 | the fork-init CLI file copied into a fixture tree under the real path of the temporary directory (symbolic links resolved), whose manifest has `"type": "module"`; run as `node --experimental-strip-types`, without `tsx` or `node_modules` | exit code, stdout, stderr (an ExperimentalWarning on stderr is allowed) |
| 0004-S3 | the VitePress config module imported in a test after setting or unsetting `SITE_BASE` (fresh module registry per case) | the exported config's `base`, `title` and the three `head` hrefs; a thrown error |
| 0004-S4 | workflow and template files parsed with the `yaml` package (prior art: the fork-template parity test) | step order, step `id`, build-step `env`, job `if:`, job `env`, job matrix, job steps |
| 0004-S5 | the guard's classification function, the upstream-pristine check function and the shared upstream-decision function, each called on a fixture `{ path → content }` map (the decision also on environment values and a work-tree flag); and the upstream-only tests on the real tracked files. All live in `tests/unit/scripts/upstream-guard.test.ts` | the list of violations (file, line); the list of mismatched field ids; the decision; pass or fail |
| 0004-S6 | the ShortLinkShare, MergedNav and ChallengeList component tests, building their expectations from the `SITE_ORIGIN` they import from the short-link module (no mock) | their assertions |
| 0004-S7 | stage 8, local, on the HEAD of the epic's last ticket branch: two exports, each `git archive HEAD` into a temporary directory, then in order `git init && git add -A`, `pnpm install`, the export's `pnpm fork:init` command (below), `pnpm wasm:build`, `pnpm challenge:keygen`, `pnpm test --run`, `pnpm build`, **read T74**, `pnpm exec playwright install chromium`, `CI=1 pnpm test:smoke`, `CI=1 pnpm test:challenges`; the GH export then runs `SITE_BASE=/x/ pnpm build` and **reads T75**. Before each Playwright command, nothing listens on ports 4173 and 5173 (`CI=1` makes a busy port fail instead of being reused) | exit codes; the build output's `index.html`, `zh-TW/index.html`, `challenges.html`, `zh-TW/challenges.html`, and every `.html` and `.js` file, read as text (HTML entities decoded before comparing) |
| 0004-S8 | stage 8, preview: the Cloudflare Pages preview deployment of the ticket that adds A9 | HTTP status of the three favicon URLs; the `src` of every `<script>` and the `href` of every `<link rel="stylesheet">` and `<link rel="modulepreload">` in `/` and `/zh-TW/`; the `<title>` of `/` and `/zh-TW/` |
| 0004-S9 | stage 6, recorded in the ticket with each command and its output: `grep -F` of each listed string in the listed file or block (a glossary entry runs from its `**term**:` line to the next such line or `## ` heading; an open question runs from its `## OQ-NNN` heading to the next `---`); `cmp` of the two skills; the glossary test's run | present or absent; equal or not; pass or fail |

0004-S7's two `fork:init` commands (values shown unquoted; each passed as one argument):

| Export | Arguments | Expected origin |
|---|---|---|
| GH | `--author` Test Teacher, `--repo` test-owner/web-range, `--host` github-pages, `--site-name` 林老師的資安靶場 | `https://test-owner.github.io/web-range` (derived) |
| CF | `--author` Test Teacher, `--repo` test-owner/web-range, `--host` cloudflare-pages, `--origin` https://web-range.pages.dev, `--site-name` Lin's "Web" Range \ $' $1 | `https://web-range.pages.dev` |

## Fixed lists

### Modes and "today"

**Anchor mode**: a run without `--rebrand`. **Rebrand mode**: a run with `--rebrand`. Each row
names its mode; "both" means both modes. **Today** means the behaviour of the fork-init CLI at
`c0f7edf`.

### Repository-slug grammar

A repository slug is `<owner>/<name>`. As a **wildcard** inside an anchor form, `<owner>` matches
`[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?` and `<name>` matches `[A-Za-z0-9._-]+`. As a **value**
given to `--repo`, the rules of T45 apply. The upstream repository slug is
`BrowserLaboratory/wxl-platform`.

### First conversion

Before any edit, the manifest's `repository` is an object whose `url` is exactly
`git+https://github.com/BrowserLaboratory/wxl-platform.git` (case-sensitive). Any other shape or
value is not a first conversion.

### Identity anchors

| Id | File | Anchor | Kind | Recognition rule |
|---|---|---|---|---|
| A1 | package manifest | `repository.url` (`git+https://github.com/<owner>/<name>.git`), `bugs.url` (`https://github.com/<owner>/<name>/issues`), `homepage` (`https://github.com/<owner>/<name>#readme`), `author`; on first conversion also `version` = `0.1.0` and `license` = `ECL-2.0`; `name`, `description` when given | code (structured) | JSON object keys. The manifest must exist, start without a byte-order mark, parse, and be a JSON object |
| A2 | `README.md`, `README.en.md` | `https://github.com/<owner>/<name>/actions/workflows/quality-gates.yml` | doc | every occurrence of the form (the badge line holds two: the image URL, which continues with `/badge.svg`, and the link) |
| A3 | `README.md`, `README.en.md` | `git clone https://github.com/<owner>/<name>.git` | doc | every occurrence of the form followed by the end of the line |
| A4 | `CONTRIBUTE.md` | `git remote add upstream https://github.com/<owner>/<name>.git` | doc | every occurrence of the form followed by the end of the line (leading indentation allowed) |
| A5 | `CONTRIBUTE.md` | `(https://github.com/<owner>/<name>/issues)` | doc | every occurrence of the form, parentheses included (a Markdown link target) |
| A6 | VitePress config | site title | code | candidate lines `^  title: .+,$` (exactly two spaces); must be one, and its value a JS string literal. Not counted: deeper-indented `title:` |
| A7 | `platform/index.md`, `platform/zh-TW/index.md` | hero name | code | inside the first `---` frontmatter block, after the column-0 line `hero:` and before the next column-0 key, candidate lines `^  name: .+$` (exactly two spaces); must be one per file, and its value one YAML scalar (below). Not counted: `name:` at other indents or outside `hero:` |
| A8 | short-link module | short-link origin | code | candidate lines `^export const SITE_ORIGIN = .+$`; must be one, and its value a JS string literal |
| A9 | VitePress config | base definition | code | candidate lines `^const siteBase = .+$`; must be one, and the config must also hold exactly one line `  base: siteBase,`. The upstream form is exactly `const siteBase = process.env.SITE_BASE \|\| '/'` |

"End of the line" and `$` come before a CR, so a CRLF file is recognised as an LF one. A JS string
literal is single- or double-quoted with standard escapes. An A7 value is one YAML scalar when the
`yaml` package parses `name: <value>` as a one-key map whose value is a string, and the value is not
a block scalar (`|`, `>`) and has nothing after it on the line (a trailing `# comment` is
unparsable). New A6–A8 values are written as JSON string literals through a function replacer.
**Exception:** A9 is written whole, as one of exactly three lines: the upstream form,
`const siteBase = '<base>'` for `--base <base>` (single quotes; T21's validation guarantees the value
has no quote or backslash), or `const siteBase = '/'` for `--base none`. Its existing value is not
parsed.

The upstream VitePress config gains A9 in this epic: the inline `base: process.env.SITE_BASE ?? '/'`
becomes the A9 line plus `  base: siteBase,`, and the three `head` hrefs are computed from `siteBase`.

### Base grammar

`/`, or `/` followed by one or more segments each ending in `/`; each segment matches
`[A-Za-z0-9._~-]+` and is not `.` or `..`. Used by `--base` (T21) and by the config's check of the
resolved `siteBase` (T31).

### Workflow states

In anchor mode, `.github/workflows/deploy.yml` is compared after normalising CRLF to LF, with or
without `--host`; rebrand mode compares as today. **Current template output**: the tree's `scripts/templates/deploy.yml.template`,
LF-normalised. **Known old outputs**: a list of SHA-256 values held in the engine, one per earlier
template version; initially one, `0cf52f116082bed48b19462d02b6827123a26cf882a428f841cd6646f73f7276` (the
template at `72327e2`, which the engine wrote verbatim for every argument combination because it
contains no repository slug and no rebrand key). **Derives SITE_BASE**: the file parses with the
`yaml` package and the step whose `run` is exactly `pnpm build` has `env.SITE_BASE` exactly
`${{ steps.pages.outputs.base_path }}/`; a file that does not parse does not derive it. **Other**:
neither the current template output nor a known old output. **Tag-rule warning**: today's warning
on installing the workflow (asserted by the existing test "warns about the github-pages tag rule when
it creates the deploy workflow").

### Upstream repository-slug confinement and the guard's lists

The upstream repository slug as a literal (compared case-insensitively) may appear only in:

- **Rewrite list** — the package manifest, inside A1's three URL fields only; `README.md` and
  `README.en.md`, inside A2 and A3 forms only; `CONTRIBUTE.md`, inside A4 and A5 forms only.
- **Keep list** — `CHANGELOG.md`; the fork-init CLI file `scripts/fork-init.ts`, which this epic makes
  export the upstream repository slug as `UPSTREAM_SLUG` and which holds the whole engine, the four rebrand keys included;
  the fork-init test file; both trees' `wxl-fork-init/SKILL.md`; everything under `.proj.specs/` and
  `.proj.tickets/`.

Every other tracked text file must not contain it (a file is text when its first 8000 bytes hold no
NUL byte). Code that needs it imports `UPSTREAM_SLUG` (the guard and pristine tests build their
fixtures from it); the upstream-only `if:` and `env` of T71 spell it through `format`. Consequence:
rebrand mode's unchanged tree-wide swap finds no literal in the upstream-only machinery, and rebrand
mode's self-exclusion already covers the engine file and its test.

### Overridden contracts

Existing code is named by test title or by the text of the comment, never by line number.

| Contract | Where | New contract |
|---|---|---|
| the repository slug is rewritten wherever it appears, incl. the config's `socialLinks` | fork-init test "rewrites package.json identity and leaves no upstream slug" | A2–A5 forms carry the new repository slug; the fixture config's `socialLinks` keep their value; the manifest assertions stand |
| the changelog's repository slug is rewritten by the scan | fork-init test "rewrites the upstream slug in CHANGELOG.md — scan-driven, not a hardcoded file list" | in anchor mode the changelog is byte-identical |
| an active `dist-*` sibling is scanned | fork-init test "does not treat an active .vitepress/dist-* sibling as build output (path-segment boundary)" | the same assertions, run with the rebrand arguments (the only mode that walks the tree) |
| `base:` line set, replaced, collapsed, or removed by `--base` | fork-init tests "sets base when a path is given and copies the deploy workflow" (base assertion only), "--base none does not declare a base", "replaces an existing base line exactly (H1 replacer branch), $-safe", "collapses an env-conditional base line to a plain literal (upstream shape)", "--base none strips an existing base line, leaving the rest intact" | A9: `/x/` → `const siteBase = '/x/'`, `none` → `const siteBase = '/'`; a config without A9 (a literal `base:` line, the `??` line, or no base line) returns `exitCode` 1 naming A9 |
| `--base none` marks the base for removal | fork-init parse test title "--base none marks base for removal, --rebrand selects B mode, --dry-run sets dryRun" | the title says the base becomes `/`; body unchanged |
| forks get a literal base; the template deliberately omits SITE_BASE | fork-template parity test "deliberately omits SITE_BASE — forks get a literal base instead" and its comment | the `configure-pages` step (id `pages`) precedes the build step, whose `env.SITE_BASE` is `${{ steps.pages.outputs.base_path }}/` |
| the template's expected values derive from the frozen baseline | parity test header ("derive the expected values FROM the baseline"), template header (the baseline paragraph), the header of the frozen baseline `upstream-deploy.yml` | step order and `SITE_BASE` are stated as deliberate departures from the baseline; pins, tools and triggers still derive from it |
| fork:init copies the template into every fork; forks still get a GitHub Pages workflow | parity test header ("copies deploy.yml.template into every fork"), toolchain-parity test comment ("Forks still get a GitHub Pages workflow"), header of the frozen baseline `upstream-deploy.yml` ("forks still get a GitHub Pages workflow") | the template is installed by `--host github-pages` and by runs without `--host`; Cloudflare ranges get none |
| exit code 1 means only a user-input error; mode A is "identity fields, base, upstream-slug swap"; "A + B on every active text file"; the workflow "never clobbers a customized deploy.yml"; the env-conditional base collapses to a literal; `base: null` removes the base | fork-init module comments and the `ForkInitArgs.base` type comment | exit 1 also for tree errors; anchor mode changes only anchors; rebrand mode is today's path with T51's differences; a workflow equal to a known old output is replaced under `--host`; A9; `null` = `const siteBase = '/'` |
| the workflow is copied and an existing different one never overwritten; forks set a literal base; the workflow deliberately sets no SITE_BASE; root sites use `--base none` | deploy template header comment | `--host` decides the workflow; base from `configure-pages`; `--base` only without `--host` |
| nothing sets SITE_BASE; `fork:init --base` rewrites the base line; a sub-path fork edits the head hrefs by hand | VitePress config comments | A9; hrefs follow `siteBase`; the template sets SITE_BASE |
| a fork changes `SITE_ORIGIN` by hand, the way it changes `base` | short-link module comment | the engine sets A8 |
| `fork:init --base` rewrites the config for GitHub Pages forks | LocaleSwitcher component comment and the locale-switcher test comment | GitHub Pages ranges get their base from `SITE_BASE` at deployment |
| the scan covers every file; base table with `--base none` for Cloudflare; Node ≥ 18; the CLI does not change the short-link origin; zero residue of the upstream repository slug | both `wxl-fork-init` skills | T78 |

### Character rules

Apply to `--author` and `--site-name`. Values are trimmed with `String.prototype.trim`; the trimmed
value is validated and written. Length counts Unicode code points, without normalisation; the value
must hold at least one code point other than U+200C and U+200D. Rejected: general categories Cc,
Cs, Zl, Zp; Cf except U+200C and U+200D; the 66 noncharacters (U+FDD0–U+FDEF and every code point
ending in FFFE or FFFF). Categories are those of the running Node's Unicode tables; tests use only
characters whose category is the same in Node 22 and 24. `--repo`, `--origin` and `--base` follow
their own grammars and are not trimmed. In anchor mode `--name` and `--description` are trimmed and
otherwise unrestricted (they reach only the manifest, through JSON serialisation); rebrand mode
handles them as today.

### Origin grammar

`https://` + hostname + path. Hostname: labels joined by `.`, at least two; each label matches
`[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?`; the last label is not all digits; at most 253
characters; written lowercased. Path: zero or more segments `/<segment>`, each matching
`[A-Za-z0-9._~-]+` and not `.` or `..`. Nothing else: no userinfo, port, query, fragment or trailing
slash.

### Argument check order and messages

`parseForkInitArgs` checks in this order and throws on the first failure: T48 (any error Node's
argument parser raises, and a repeated flag) → T47 (`--author`, then `--repo`, missing or empty after
trim) → T50 (rebrand combinations) → T17 (`--host` with `--base`) → T16 (`--host` value) → T35
(Cloudflare without `--origin`) → value checks in this order: `--repo` (T45), `--author` (T46),
`--rebrand` (today's rules), `--base` (T21), `--origin` (T33, then T34), `--site-name` (T40, then
T41). Each message contains the name of the flag it is about (T48 for a positional argument: see the
row; T50: every flag it names), and these distinguishing strings: T17 `--base`; T16 the value; T34
`path`; T41 the refused character. A rejected value is quoted with `JSON.stringify`.

## Matrix

| Row | Seam | Mode | Type × field × boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| T1 | S1 | anchor | Doc anchors A2–A5 × the form holds any repository slug (upstream's, the range's earlier one, the new one) | Every occurrence carries the new repository slug; no other byte of the file changes | AC-A1 |
| T2 | S1 | anchor | Doc anchor × no occurrence in its file, or the file is missing | Warning containing the anchor id and the file's relative path; the run continues | AC-A1 |
| T3 | S1 | anchor | Files other than A1–A9 files and the workflow × any content | Byte-identical (changelog, skills and everything else included) | AC-A2 |
| T4 | S1 | anchor | A2–A9 files × bytes outside the anchors (the fixture config's `socialLinks` included); manifest × fields outside A1 | Unchanged; the manifest is re-serialised as two-space JSON with a trailing newline, every other field's value unchanged, in CRLF when its first line ending is CRLF and LF otherwise | AC-A2 |
| T5 | S1 | anchor | Code anchor × its value not being set (A6/A7 without `--site-name`; A8 without a given or derived origin; A9 without `--base` or `--host`) | Its lines are unchanged and it need not exist; its file is byte-identical when no other anchor in it is being set | AC-A2 |
| T6 | S1 | anchor | Half-applied tree × X ∈ {the GH and CF arguments of S7; `--author a --repo o/n --base /x/ --site-name N --origin https://e.example`}: the unapplied fixture (the shared fixture of T60, with no workflow) with any subset of X's writes (file replacements, workflow installs and removals) already done, every subset tested | X on the unapplied fixture exits 0; re-run with X on each half-applied tree: byte-identical to it | AC-A3 |
| T7 | S1 | anchor | Whole run × identical arguments twice | Second run: `changedFiles` empty; every file's bytes and modification time unchanged; warnings exactly those whose condition still holds — T2, T22 (both kinds of other), T23 (other), T25 (different; template missing), T26 — and never the install, replace or remove warnings or those of T81 and T82 | AC-A4 |
| T8 | S1 | anchor; both for A9 | Code anchor being set × one match | A6–A8 written as a JSON string literal; A9 as the T19/T20 line | AC-A5 |
| T9 | S1 | anchor; both for A9 | Code anchor being set × zero or several candidate lines (a missing anchor file counts as zero), or one whose existing A6–A8 value does not parse | `exitCode` 1, `message` names the anchor id and the file; nothing written | AC-A5 |
| T10 | S1 | anchor | Existing A6–A8 value being set × contains escapes (`\"`, `\\`, `''`) | Fully replaced; the file still parses | AC-A5 |
| T11 | S1 | anchor; both for A9 | Anchor file or manifest × CRLF | Anchors recognised as in an LF file; in anchor files other than the manifest, written lines keep CRLF and other bytes are unchanged; the manifest follows T4 | AC-A6 |
| T12 | S1 | both | Manifest × missing, starting with a byte-order mark, unparsable, not an object | `exitCode` 1 naming the manifest; nothing written | AC-A7 |
| T13 | S1 | both | Manifest × `repository` or `bugs` is not a plain object (string, absent, null, array, number, boolean) / a plain object | Replaced by `{ type: 'git', url }` or `{ url }` / keeps its other keys, with `repository.type` set to `git` | AC-A7 |
| T14 | S1 | anchor | `--name`, `--description` × non-empty after trim / empty after trim or not given | Set to the trimmed value / unchanged | AC-A7 |
| T15 | S1 | anchor | `version`, `license` × first conversion / not | Set to `0.1.0` and `ECL-2.0` / unchanged | AC-A8 |
| T16 | S1 | both | `--host` × not one of the two values | Argument error | AC-H1 |
| T17 | S1 | both | `--host` together with `--base` | Argument error | AC-H1 |
| T18 | S1 | both | `--host` or `--base` × A9 or the `base: siteBase` line not exactly once (a literal `base:` line, the `??` line, no base line, or A9 pasted without `base: siteBase`) | `exitCode` 1; `message` contains `A9`, `.vitepress/config.mts`, `const siteBase = process.env.SITE_BASE \|\| '/'`, `base: siteBase` and `https://github.com/BrowserLaboratory/wxl-platform`; nothing written | AC-H2 |
| T19 | S1 | anchor | `--host` × A9 present | A9 becomes the upstream form | AC-H2 |
| T20 | S1 | both | `--base /x/` / `--base none` × A9 | `const siteBase = '/x/'` / `const siteBase = '/'` | AC-H5 |
| T21 | S1 | both | `--base` × value | Accepted iff it matches the base grammar or is `none`; else argument error (today's tests stand; `.` and `..` segments are newly refused) | AC-H5 |
| T22 | S1 | anchor | `--host github-pages` × workflow absent / current template output / a known old output / other that derives SITE_BASE / other that does not | Installed with the tag-rule warning / nothing / replaced by the current template output, warning containing `replaced` and the path / left, warning containing `left untouched` and the path / left, warning containing the path, `SITE_BASE` and `404` | AC-H3 |
| T23 | S1 | anchor | `--host cloudflare-pages` × workflow absent / current template output or a known old output / other | Nothing / removed, listed in `changedFiles`, warning containing `removed` and the path / left, warning containing `left untouched` and the path | AC-H4 |
| T24 | S1 | anchor | `--host` × the template missing, or its LF-normalised SHA-256 in the known old outputs; `--host github-pages` × a template that does not derive SITE_BASE | `exitCode` 1; `message` contains the template's path and `https://github.com/BrowserLaboratory/wxl-platform`; nothing written | AC-H3 |
| T25 | S1 | anchor | No `--host` × workflow | Today's behaviour, compared LF-normalised: installed from the current template output when absent, with the tag-rule warning (also on a range an earlier `--host cloudflare-pages` run cleared: the engine keeps no state); never replaced; a different one left with today's warning; with the template missing, nothing installed and a warning containing the template's path | AC-H5 |
| T26 | S1 | both | No `--host` × after the run A9 is in upstream form and the workflow exists but does not derive SITE_BASE | Warning containing the workflow path, `SITE_BASE`, `404` and `--host github-pages` | AC-H5 |
| T27 | S5 | — | Known old outputs × the current template and `tests/unit/workflows/fixtures/deploy-template-72327e2.yml` (a new verbatim copy of the template at `72327e2`, distinct from the parity test's frozen baseline `upstream-deploy.yml`) (upstream only) | The current template's LF-normalised SHA-256 equals the test's pinned value and is not in the engine's list; the copy's LF-normalised SHA-256 is the list's first value. The test says: when the template changes, move the pinned value into the engine's list and pin the new one | AC-H3 |
| T28 | S4 | — | Template × steps and header (the comment block before the first non-comment line) | `configure-pages` step with id `pages` before the step whose `run` is `pnpm build`; that step's `env.SITE_BASE` = `${{ steps.pages.outputs.base_path }}/`; the header contains `steps.pages.outputs.base_path` and none of "刻意不設", "必須在 .vitepress/config.mts 設", `--base /<repo>/`, `--base none`, "不會被覆蓋" | AC-H6 |
| T29 | S3 | — | Config × `SITE_BASE` unset or empty | `base` `/`; hrefs `/favicon.svg`, `/favicon.png`, `/apple-touch-icon.png` | AC-H7 |
| T30 | S3 | — | Config × `SITE_BASE=/x/` | `base` `/x/`; the three hrefs prefixed `/x/` | AC-H7 |
| T31 | S3 | — | Config × the resolved `siteBase` not matching the base grammar (e.g. `/sub` without a trailing slash, `/../`) | The module throws naming `SITE_BASE` | AC-H7 |
| T32 | S1 | anchor | `--origin` × valid by the origin grammar (with or without path) | A8 set to it, hostname lowercased | AC-O1 |
| T33 | S1 | anchor | `--origin` × not exactly `https://`, userinfo, port, query, fragment, trailing slash, an invalid or single label, all-numeric last label, hostname over 253, a path segment `.`/`..` or outside its class | Argument error | AC-O1 |
| T34 | S1 | anchor | `--origin` with a path × `--host cloudflare-pages` | Argument error | AC-O1 |
| T35 | S1 | anchor | `--host cloudflare-pages` × no `--origin` | Argument error whose message contains `--origin` and `cloudflare-pages` | AC-O2 |
| T36 | S1 | anchor | `--host github-pages` × no `--origin`; name ≠ `<owner>.github.io` (compared case-insensitively) | A8 = `https://<owner, lowercased>.github.io/<name as given>`, derived on every such run | AC-O2 |
| T37 | S1 | anchor | `--host github-pages` × no `--origin`; name = `<owner>.github.io` | A8 = `https://<owner, lowercased>.github.io` | AC-O2 |
| T38 | S1 | anchor | No `--origin` × no `--host` | A8 untouched | AC-O2 |
| T39 | S1 | anchor | `--site-name` × valid | A6 and both A7 set | AC-N1 |
| T40 | S1 | anchor | `--site-name` × empty after trim, only U+200C/U+200D, over 60 code points, a rejected character | Argument error | AC-N1 |
| T41 | S1 | anchor | `--site-name` × `<`, `>` or `&` | Argument error naming the character | AC-N2 |
| T42 | S1 | anchor | `--site-name` × `"`, `'`, `\`, backtick, `$`, `` $` ``, `$'`, `$$`, `$1` | Accepted; the written A6 literal, evaluated as a JS expression, equals the value; both frontmatters parse (with `yaml`) so that `hero.name` equals it | AC-N3 |
| T43 | S1 | anchor | `--site-name` × leading or trailing white space (incl. U+3000); ZWJ emoji sequence | Trimmed value written; emoji accepted | AC-N1 |
| T44 | S1 | both | `UPSTREAM_SLUG` × the fork-init module | Exported, equal to the upstream repository slug | AC-G1 |
| T45 | S1 | both | `--repo` × owner (alphanumerics and `-`, 1–39, no leading or trailing `-`); name (`[A-Za-z0-9._-]{1,100}`, not `.` or `..`, not ending in `.git` in any case) | Accepted; else argument error | AC-P1 |
| T46 | S1 | both | `--author` × 1–100 code points after trim, character rules | Accepted; else argument error | AC-P2 |
| T47 | S1 | both | `--author` or `--repo` × missing, or empty after trim | Argument error naming the flag (existing tests stand) | AC-P2 |
| T48 | S1 | both | Argument list × any error Node's argument parser raises (unknown flag, positional argument, flag without value, value on a boolean flag); a flag given twice | `ForkInitArgError` naming the flag; for a positional argument, containing `positional` and the argument quoted with `JSON.stringify` | AC-P3 |
| T49 | S1 | both | Argument list × several failures | The argument check order decides which message is thrown | AC-P3 |
| T50 | S1 | rebrand | `--rebrand` × together with any of `--host`, `--origin`, `--site-name` | Argument error naming `--rebrand` and every one of those flags given | AC-B1 |
| T51 | S1 | rebrand | `--rebrand` with any of `--base`, `--name`, `--description`, `--dry-run` | Today's path: tree-wide swap of the upstream repository slug, four key renames, residual inventory, unconditional `version`/`license` reset, `name = --name ?? --rebrand`, manifest written with LF, files written in place, the workflow compared and a write failure raised as today. Every existing rebrand test passes unchanged. The only differences: T11, T18, T20, T21 and T26 for the base; T12 and T13 for the manifest; T44; T45–T50 for arguments; T53, T54 and T57 for errors and paths | AC-B2 |
| T52 | S1 | rebrand | `--author x --rebrand acme --repo me/x` × a fixture holding the upstream-only `if:` and `env` of T71, a test file importing `UPSTREAM_SLUG`, and the engine file | `exitCode` 0; those lines and the engine file are byte-identical afterwards | AC-B3 |
| T53 | S1, S2 | both | Tree error (T9, T12, T18, T24; in anchor mode also T55) | `exitCode` 1 with a `message` naming the anchor id, field or template and the file (relative, with `/`); the CLI prints only `✗ ` followed by the message, on stderr, and exits 1; warnings collected before the error are not printed | AC-E1 |
| T54 | S1 | both | Any argument or tree error found before writing | Nothing written: no file's bytes or modification time changes, no file is created or removed | AC-E1 |
| T55 | S1 | anchor | A file to be written × the write fails (the target file mode 0444 in a directory of mode 0555; POSIX only, skipped when run as root) | `exitCode` 1; `message` names the file and contains `run the same command again`; files already written stay (T6 then applies). Each file is written to `<file>.fork-init-tmp` beside it and renamed over the original, keeping its permission bits; this atomicity is an implementation requirement, not observed (S1 decision of 2026-10-14) | AC-E1 |
| T56 | S1 | anchor | `--dry-run` × each `--host` and none | Nothing written; `changedFiles` lists what would change, workflow installs, replacements and removals included; same errors and warnings as a real run | AC-E2 |
| T57 | S1 | both | `changedFiles`, `residualFiles`, `residualHits[].file`, `sensitiveKeys[].files`, warning and message paths × every OS | Relative paths with `/` | AC-E2 |
| T58 | S2 | both | CLI × valid fixture | Exit 0; stderr empty apart from an ExperimentalWarning; stdout in anchor mode holds, in this order, the message, `Changed files:` with each changed path on its own line, and each warning on a line starting `[i] ` (today's blank lines and two-space path indentation allowed); in rebrand mode stdout is today's | AC-E3 |
| T59 | S2 | both | CLI × invalid argument | Exit 1; stderr is `✗ ` followed by the message | AC-E3 |
| T60 | S1 | both | Overridden-contract tests × | Rewritten as the table says; every other existing fork-init test passes with its body unchanged (the shared fixture gains A9 and `base: siteBase` in its config, the A2 and A5 forms, both home pages, the short-link module, and a template that derives SITE_BASE — a `configure-pages` step with id `pages` and a `pnpm build` step setting it — keeping its `# WXL fork deploy` comment line; the legacy config shapes become T18 fixtures) | AC-E4 |
| T61 | S5 | — | Guard × the upstream repository slug in a text file on neither list | Violation naming file and line | AC-G1 |
| T62 | S5 | — | Guard × the upstream repository slug in a rewrite-list file outside its anchor forms (manifest: outside A1's URL fields) | Violation naming file and line | AC-G1 |
| T63 | S5 | — | Guard × the upstream repository slug only in rewrite-list anchors and keep-list files; a binary file holding it | No violation | AC-G1 |
| T64 | S5 | — | Guard × the upstream repository slug differing only in letter case | Treated as that repository slug | AC-G1 |
| T65 | S5 | — | Upstream decision × `GITHUB_REPOSITORY` set and non-empty | Upstream iff it equals the upstream repository slug exactly | AC-G2 |
| T66 | S5 | — | Upstream decision × `GITHUB_REPOSITORY` unset or empty | Upstream iff the manifest's `repository.url` exactly equals upstream's and the tree is a git work tree (no git installed: not a work tree) | AC-G2 |
| T67 | S5 | — | Pristine check × fixture holding upstream's values | No mismatch. Field ids and upstream's values: `A6` `Web eXploitation Laboratory`; `A7:platform/index.md` and `A7:platform/zh-TW/index.md` `WXL`; `A8` `https://wxl.browserlab.online`; `A9` exactly one line in upstream form; `base` exactly one `  base: siteBase,`; `A2:README.md`, `A2:README.en.md`, `A3:README.md`, `A3:README.en.md`, `A4`, `A5` every form holds the upstream repository slug; `repository.url`, `bugs.url`, `homepage` upstream's; `license` `LicenseRef-LICENSE`; `author` `CXPh03n1x`; `version` not `0.1.0`; `deploy.yml` absent | AC-G3 |
| T68 | S5 | — | Pristine check × one field of T67 changed (each field) | Exactly that field id reported | AC-G3 |
| T69 | S5 | — | Guard, pristine and T27 tests × real tree | Run iff the upstream decision says upstream; pass on upstream's HEAD after this epic; when `WXL_EXPECT_UPSTREAM` is set, fail unless the decision equals (`WXL_EXPECT_UPSTREAM` is `true`) | AC-G3 |
| T70 | S6 | — | Component tests × the imported `SITE_ORIGIN` | Expectations built from it (display text without `https://`); the tests contain no upstream hostname; one assertion checks it matches the origin grammar | AC-C1 |
| T71 | S4 | — | The `release` job in `release.yml`, the new cross-OS job in `quality-gates.yml` × `if:`; the `test` job and the new job × `env` | `if:` exactly `github.repository == format('{0}/{1}', 'BrowserLaboratory', 'wxl-platform')`; `env.WXL_EXPECT_UPSTREAM` exactly `${{ github.repository == format('{0}/{1}', 'BrowserLaboratory', 'wxl-platform') }}` | AC-C2 |
| T72 | S4 | — | New cross-OS job × location, matrix and steps | In `quality-gates.yml`, its triggers unchanged; `include` with four entries: windows-latest/24, macos-latest/24, ubuntu-latest/24, ubuntu-latest/22; runs `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts`; no `dtolnay/rust-toolchain`, `Swatinem/rust-cache`, install-action or binaryen step (the set of jobs using them is unchanged) | AC-C3 |
| T73 | S7 | — | Each export × every command | Exits 0 | AC-X1 |
| T74 | S7 | — | Build output × each export, read where S7 says | In both `index.html` files the text of the `.name` element inside `.VPHero` equals the site name and `<title>` ends with it; `challenges.html` and `zh-TW/challenges.html` each hold one `[data-short-link]` per challenge with a short-link number (four at `c0f7edf`), every one's text starting with the origin without `https://`; no `.html` or `.js` file contains `wxl.browserlab.online`; in both `index.html` files the three favicon hrefs equal `/favicon.svg`, `/favicon.png`, `/apple-touch-icon.png` | AC-X1 |
| T75 | S7 | — | GH export × `SITE_BASE=/x/ pnpm build`, read where S7 says | Exits 0; the three favicon hrefs in `index.html` equal `/x/favicon.svg`, `/x/favicon.png`, `/x/apple-touch-icon.png` | AC-X1 |
| T76 | S8 | — | Preview × upstream | The three favicon URLs return 200; every script `src` and stylesheet or modulepreload `href` of S8 is a same-origin path that starts with `/assets/` or is a single root-level segment; both `<title>`s equal production's, fetched in the same check | AC-X2 |
| T77 | S9 | — | README, README.en | The fork section (from "fork 之後：改寫專案身分" / "After forking: rewrite the project identity" to the next heading of the same or higher level), the `fork:init` row of the command table, and the Cloudflare Pages section's sub-path `SITE_BASE` step are rewritten. Each file contains every T77 required string and no T77 forbidden string | AC-D1 |
| T78 | S9 | — | Both `wxl-fork-init/SKILL.md` | Byte-identical to each other by `cmp` (an override of the runtimes' freedom to tune skills, for this epic, which also keeps each in its current language — a stated exception to the language rule); each contains every T78 required string and no T78 forbidden string | AC-D1 |
| T79 | S9 | — | Glossary | Contains every T79 required string in its block; the glossary test's run passes | AC-D2 |
| T80 | S9 | — | Open questions | Contains every T80 required string in its block | AC-D3 |
| T81 | S1 | anchor | A8 being set × its existing value differs from the new one and is not upstream's | Warning containing `A8`, the old value and the new value | AC-O2 |
| T82 | S1 | anchor | `--host` × A9 was not in upstream form | Warning containing `A9`, the old line and the upstream form | AC-H2 |
| T83 | S9 | — | Comments named in "Overridden contracts" | Each file contains none of its T83 forbidden strings and every T83 required string | AC-D4 |
| T84 | S9 | — | Root `.gitignore` | Contains `*.fork-init-tmp` | AC-D4 |

Listed strings are written as code spans; a string that itself contains a backtick is written in a
double-backtick span, and `grep -F` searches for its content exactly as shown between the delimiters.

### T77 strings

Required in both README files: `--host github-pages`, `--host cloudflare-pages`, `--origin`,
`--site-name`, `configure-pages`, `.vitepress/config.mts`, `const siteBase = process.env.SITE_BASE || '/'`,
`Settings → Pages → Source`, `` `v*` ``. Required in `README.md`: `每次執行都要帶齊參數`,
`` Cloudflare Pages 靶場每次都要帶 `--host cloudflare-pages` ``,
`` 不帶 `--host` 執行會重新裝回 GitHub Pages workflow ``, `Cloudflare Pages 靶場部署在網域根目錄`,
`同一個 owner 的 GitHub Pages 靶場共用瀏覽器儲存空間`,
`` 用 `--base` 的靶場，CI 的 site smoke 與 challenge 測試會失敗 ``. Required in `README.en.md`:
`pass every argument on every run`, `` A Cloudflare Pages range passes `--host cloudflare-pages` on every run ``,
`` a run without `--host` reinstalls the GitHub Pages workflow ``,
`A Cloudflare Pages range is served at the domain root`,
`GitHub Pages ranges of one owner share browser storage`,
`` With `--base`, a range's site smoke and challenge tests fail in CI ``.

Forbidden in `README.md`: `--base <見下方說明>`, `` 刻意不設 `SITE_BASE` ``, `` `fork:init` 不會改短連結的網址 ``,
`` 移除 `base` 宣告 ``, `process.env.SITE_BASE ?? '/'`, `測試時請暫時清掉 base`, `` 腳本也從不寫入 `SITE_BASE` ``,
`` 網站放在子路徑時，加上 `SITE_BASE` ``. Forbidden in `README.en.md`: `--base <see below>`,
`` deliberately sets no `SITE_BASE` ``, `does not touch the short-link origin`, `` removes the `base` declaration ``,
`process.env.SITE_BASE ?? '/'`, `with the base temporarily cleared`, `is never written by the script`,
`` If the site is served from a sub-path, add `SITE_BASE` ``.

### T78 strings

Required: `--host github-pages`, `--host cloudflare-pages`, `--origin`, `--site-name`, `Node.js ≥ 22.6`,
`git grep -n "BrowserLaboratory/wxl-platform" -- README.md README.en.md CONTRIBUTE.md package.json`.
Forbidden: `掃描式`, `Node.js ≥ 18`, `CLI 不會改短連結的網址`, `` GitHub Pages 專案站填 `/<repo>/` ``,
`` 或 Cloudflare Pages 填 `none` ``, `` → `--base '/<repo>/'` ``, `` 或 Cloudflare Pages → `--base none` ``,
`第一條（slug）預期零殘留`, `既有且不同者不覆蓋`.

### T79 strings

In `GLOSSARY.md`, by block: the slug（題目 slug） entry has a line starting `_Avoid_:` that contains
`owner/name`; the upstream（上游） and setup record（設定紀錄） entries each contain
`設定紀錄出現之前建立的靶場沒有設定紀錄`; the upstream（上游） entry has a line starting `_Avoid_:` that
contains `git remote`; the site-wide clear（全站清除） entry contains `同一個 owner 的 GitHub Pages 靶場`.

### T80 strings

In `.proj.specs/OPEN-QUESTIONS.md`, by block: OQ-005 contains `**Status:** resolved`; OQ-004 contains
`--host`; OQ-016 (hiding the copy-short-link button on GitHub Pages ranges) contains `copy-short-link`;
OQ-017 (the stage 8 non-browser harness) contains `provisional` and `Revisit when`; OQ-018 (one owner's
GitHub Pages ranges share a browser origin) contains `storage`, `site-wide clear` and `service worker`;
OQ-019 (the release workflow's generated release notes versus the release-note rule) contains
`generate_release_notes`.

### T83 strings

| File | Forbidden | Required |
|---|---|---|
| `scripts/fork-init.ts` | `minimal fork: identity fields, base, upstream-slug swap`, `A + B on every active text file`, `clobbers a customized deploy.yml`, `collapse the whole line to a`, `null = remove (--base none)`, `1  user input error (missing/invalid flag)`, `A + deterministic rename` | `1  user input error or tree error` |
| `.vitepress/config.mts` | `rewrites this line to a plain literal`, `MUST edit these hrefs`, `Nothing in this repository sets SITE_BASE`, `nothing sets SITE_BASE`, `` rewrites the `base:` line `` | `hrefs follow siteBase` |
| `.vitepress/challenge/shortLink.ts` | `A fork changes it here` | `fork:init --origin` |
| `.vitepress/theme/components/LocaleSwitcher.vue`, `tests/unit/i18n/locale-switcher.test.ts` | `` `pnpm fork:init --base` rewrites `` | — |
| `tests/unit/workflows/fork-template-parity.test.ts` | `copies deploy.yml.template into every fork`, `forks get a literal base instead`, `rewrites .vitepress/config.mts to a plain literal` | `departs from the baseline` |
| `tests/unit/workflows/toolchain-parity.test.ts` | `Forks still get a GitHub Pages workflow` | — |
| `tests/unit/workflows/fixtures/upstream-deploy.yml` | `forks still get a GitHub Pages workflow` | — |
| `scripts/templates/deploy.yml.template` | T28's five strings, in the header (checked by S4) | `刻意偏離凍結基準` |

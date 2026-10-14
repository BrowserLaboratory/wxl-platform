# Traceability: 0003-apply-engine

`{type × field × boundary} → {expected behaviour → acceptance criterion}`. The spec is derived from
this file. Stage 1 decisions: Q1–Q24 and E1–E6 (2026-10-14). Revision 2 applies the user's
disposition of round 1 (groups H1–H14 in `review/round-1.md`, all accepted as recommended).

## Seams (approved by the user, 2026-10-14; S1 extended by the H9 disposition)

| Seam | Entry point | Observable output |
|---|---|---|
| 0003-S1 | `parseForkInitArgs(argv)`; `runForkInit(args, { projectRoot, fs? })` on a fixture tree in a temporary directory. `fs` is optional; when given, every file read, atomic write and removal goes through it | files on disk; the returned `exitCode`, `message`, `changedFiles`, `warnings`; a `ForkInitArgError` thrown by `parseForkInitArgs`; with `fs`, the ordered list of write calls |
| 0003-S2 | the fork-init CLI copied into a fixture tree and run as `node --experimental-strip-types`, without `tsx` or `node_modules` | exit code, stdout, stderr (an ExperimentalWarning on stderr is allowed) |
| 0003-S3 | the VitePress config module imported in a test after setting or unsetting `SITE_BASE` (fresh module registry per case) | the exported config's `base`, `title` and the three `head` hrefs; a thrown error |
| 0003-S4 | workflow and template files parsed with the `yaml` package (prior art: the fork-template parity test) | step order, step `id`, build-step `env`, job `if:`, job matrix, job `run` |
| 0003-S5 | the classification functions of the repository-slug guard, called on a fixture `{ path → content }` map; and the guard test run on the real tracked files | the list of violations (file, line); the skip decision |
| 0003-S6 | the ShortLinkShare, MergedNav and ChallengeList component tests, with the short-link module's `SITE_ORIGIN` mocked | their assertions |
| 0003-S7 | stage 8, local: a `git archive HEAD` export, then `git init && git add -A`, settings applied once per host in separate exports, then `pnpm install`, `pnpm wasm:build`, `pnpm challenge:keygen`, `pnpm test --run`, `pnpm build`, `pnpm exec playwright install chromium`, `pnpm test:smoke` | exit codes; built `index.html` and `zh-TW/index.html` |
| 0003-S8 | stage 8, preview: the Cloudflare Pages preview deployment of the ticket that changes the VitePress config | HTTP status of the three favicon URLs; asset URL prefix; `<title>` |

## Fixed lists

### Identity anchors

`<from>` is the set {upstream slug, `applied.repo`, `settings.repo`, and — when the record is absent
— the slug in the manifest's `repository.url`}, minus the new slug. Doc anchors replace every exact
occurrence of their form for each member of `<from>`.

| Id | File | Anchor | Kind | Recognition rule |
|---|---|---|---|---|
| A1 | package manifest | `repository.url` (`git+https://github.com/<slug>.git`), `bugs.url` (`https://github.com/<slug>/issues`), `homepage` (`https://github.com/<slug>#readme`), `author`; on first conversion also `version` = `0.1.0` and `license` = `ECL-2.0`; `name`, `description` when given | code (structured) | JSON object keys; a manifest that does not parse, or whose `repository` is not an object, is an error |
| A2 | `README.md`, `README.en.md` | `https://github.com/<from>/actions/workflows/quality-gates.yml` | doc | exact substring |
| A3 | `README.md`, `README.en.md` | `git clone https://github.com/<from>.git` | doc | exact substring |
| A4 | `CONTRIBUTE.md` | `git remote add upstream https://github.com/<from>.git` | doc | exact substring |
| A5 | `CONTRIBUTE.md` | `https://github.com/<from>/issues` | doc | exact substring |
| A6 | VitePress config | site title | code | lines matching `^  title: <JS string literal>,$` (exactly two spaces); must be one. Not counted: deeper-indented `title:` (locales, sidebars) |
| A7 | `platform/index.md`, `platform/zh-TW/index.md` | hero name | code | inside the first `---` frontmatter block, after the column-0 line `hero:` and before the next column-0 key, lines matching `^  name: <YAML scalar>$` (exactly two spaces); must be one per file. Not counted: `name:` at other indents or outside `hero:` |
| A8 | short-link module | short-link origin | code | lines matching `^export const SITE_ORIGIN = <JS string literal>$`; must be one |
| A9 | VitePress config | base definition | code | lines matching `^const siteBase = (.+)$`; must be one. The upstream form is exactly `const siteBase = process.env.SITE_BASE \|\| '/'` |

An existing code-anchor value must be a JS string literal (single or double quotes, standard escapes)
for A6, A8 and A9's literal forms, and a YAML plain, single-quoted or double-quoted scalar for A7;
anything else is an error naming the anchor. New values are written as JSON string literals through a
function replacer.

### Overridden contracts

| Contract | Where | New contract |
|---|---|---|
| slug rewritten wherever it appears, incl. the config's `socialLinks` | fork-init test "rewrites package.json identity and leaves no upstream slug" | A1–A5 rewritten; other files untouched (fixture drops `socialLinks`) |
| "rewrites the upstream slug in CHANGELOG.md — scan-driven" | fork-init test | changelog byte-identical |
| "does not treat an active .vitepress/dist-* sibling as build output" | fork-init test | retired: there is no scan; covered by T3 |
| "rewrites the CHANGELOG slug to the NEW repo, never to a brand-renamed link" (rebrand) | fork-init test | changelog byte-identical in rebrand mode too |
| `base:` line set, replaced, collapsed, or removed by `--base` | fork-init tests "sets base when a path is given…", "replaces an existing base line…", "collapses an env-conditional base line…", "--base none does not declare a base", "--base none strips an existing base line…" | A9 shape: `/x/` → `const siteBase = '/x/'`; `none` → `const siteBase = '/'`; fixtures use the A9 shape |
| "deliberately omits SITE_BASE — forks get a literal base instead" | fork-template parity test | build step `SITE_BASE` = `${{ steps.pages.outputs.base_path }}/`, and the `configure-pages` step (id `pages`) precedes the build step |
| head hrefs must be edited by hand for a sub-path fork; nothing sets SITE_BASE | VitePress config comments | head hrefs follow `siteBase`; the template sets SITE_BASE |
| the template deliberately leaves SITE_BASE unset; `--base /<repo>/` is required | template header comment | base comes from `configure-pages` |
| a fork changes `SITE_ORIGIN` by hand | short-link module comment | the engine sets it |
| `fork:init --base` rewrites the base for GitHub Pages forks | LocaleSwitcher component comment and its test comment | wording updated to A9 |
| the upstream slug and the four keys are renamed by rebrand | fork-init warning text and both `wxl-fork-init` skills | the slug is handled by A1–A5; rebrand renames the four keys |

### Keep list (the upstream slug stays)

`CHANGELOG.md`; `scripts/fork-init*.ts`; `tests/unit/scripts/fork-init*.test.ts`; the guard test
(`tests/unit/scripts/slug-guard.test.ts`) and the upstream-pristine test
(`tests/unit/site/upstream-pristine.test.ts`); both trees' `wxl-fork-init` skill; everything under `.proj.specs/` and
`.proj.tickets/`; the quality-gates and release workflows; the setup record.

### Character rules

Values are trimmed with `String.prototype.trim` and the trimmed value is validated and stored. Length
counts Unicode code points, without normalisation. Rejected: general categories Cc, Cs, Zl, Zp, and Cf
except U+200C and U+200D.

### Record rules

`schema` must be `1`. A missing top-level field is null. `settings` and `applied` subfields follow the
argument rules (T45–T46, T18–T30); `host` is one of the two values or null; `base` is a base path,
`"none"` or null. Unknown keys are preserved after the known keys, in their original order. Keys named
`__proto__`, `constructor` or `prototype` anywhere are an error. The record is always LF.

## Matrix

| Row | Seam | Type × field × boundary | Expected behaviour | AC |
|---|---|---|---|---|
| T1 | S1 | Doc anchors A2–A5 × a member of `<from>` present | Replaced with the new slug; no other byte of the file changes | AC-A1 |
| T2 | S1 | Doc anchor × no occurrence for any member of `<from>` and none of the new slug | Warning containing the anchor id and the file path (with `/`); run continues | AC-A1 |
| T3 | S1 | Any file other than A1–A9 files, the record and the workflow × any content | Byte-identical after a run without `--rebrand` (changelog included); with `--rebrand`, only T63's four key renames may change it | AC-A2 |
| T4 | S1 | A2–A9 files × bytes outside the anchors; manifest × fields outside A1 | Unchanged without `--rebrand`; the manifest is re-serialised as two-space JSON keeping its line-ending style, with every other field's value unchanged | AC-A2 |
| T5 | S1 | Code-anchor file × its value not being set | Byte-identical | AC-A2 |
| T6 | S1 | `<from>` × record states (absent with upstream manifest / absent with another manifest slug / `applied` present / `settings.repo` ≠ `applied.repo`) | The set defined above | AC-A3 |
| T7 | S1 | New slug × extends a member of `<from>`, or contains the upstream slug | A second identical run changes zero files | AC-A4 |
| T8 | S1 | Code anchor whose value is set × one match | Set as a JSON string literal | AC-A5 |
| T9 | S1 | Code anchor whose value is set × zero or several matches, or an unparsable existing value | `exitCode` 1, `message` names the anchor and file; nothing written | AC-A5 |
| T10 | S1 | Existing value × contains escapes (`\"`, `\\`, `''`) | Fully replaced by the new value; the file still parses | AC-A5 |
| T11 | S1 | Anchor file or manifest × CRLF | Line endings preserved | AC-A6 |
| T12 | S5 | Fixture × a slug in a file on neither list | Violation naming file and line | AC-A7 |
| T13 | S5 | Fixture × a slug in a rewrite-list file outside every anchor form | Violation naming file and line | AC-A7 |
| T14 | S5 | Fixture × slugs only in anchors and keep-list files | No violation | AC-A7 |
| T15 | S5 | Upstream decision × `GITHUB_REPOSITORY` set | Runs iff it equals `BrowserLaboratory/wxl-platform` | AC-A7 |
| T16 | S5 | Upstream decision × `GITHUB_REPOSITORY` unset | Runs iff the manifest's `repository.url` exactly equals upstream's and the tree is a git work tree | AC-A7 |
| T17 | — | Upstream-pristine test × upstream (decision of T15–T16) | No `range.json`; A8 = `https://wxl.browserlab.online`; A6 = `Web eXploitation Laboratory`; both A7 = `WXL`; A9 in upstream form; manifest `repository.url` upstream's | AC-A8 |
| T18 | S1 | `--site-name` × valid | A6 and both A7 set; idempotent | AC-N1 |
| T19 | S1 | `--site-name` × empty after trim, over 60 code points, a rejected character | Argument error | AC-N1 |
| T20 | S1 | `--site-name` × `<`, `>` or `&` | Argument error naming the character | AC-N2 |
| T21 | S1 | `--site-name` × `"`, `'`, `\`, backtick, `$`, `$&`, `` $` ``, `$'`, `$$`, `$1` | Accepted; the written A6 literal, evaluated as a JS expression, equals the value; both frontmatters parse (with `yaml`) so that `hero.name` equals the value | AC-N3 |
| T22 | S1 | `--site-name` × leading or trailing white space (incl. U+3000) | Trimmed value written and stored | AC-N1 |
| T23 | S1 | `--site-name` × ZWJ emoji sequence | Accepted | AC-N1 |
| T24 | S1 | `--origin` × valid | A8 set, hostname lowercased | AC-O1 |
| T25 | S1 | `--origin` × not exactly `https://` prefix, userinfo, port, query, fragment, trailing slash, invalid label, all-numeric last label, hostname over 253, path segment `.`/`..` or outside `[A-Za-z0-9._~-]` | Argument error | AC-O1 |
| T26 | S1 | `--origin` × path, with `--host cloudflare-pages` | Argument error | AC-O1 |
| T27 | S1 | No `--origin` × `--host github-pages`, name ≠ `<owner>.github.io` | `https://<owner, lowercased>.github.io/<name>` | AC-O2 |
| T28 | S1 | No `--origin` × `--host github-pages`, name = `<owner>.github.io` (any case) | `https://<owner, lowercased>.github.io` | AC-O2 |
| T29 | S1 | No `--origin` × `--host cloudflare-pages` | `https://<name>.pages.dev` (lowercased; outside `[a-z0-9-]` → `-`; runs collapsed; ends trimmed); warning to check | AC-O2 |
| T30 | S1 | Derived origin × fails T25's rules (empty label, label over 63) | Argument error asking for `--origin` | AC-O2 |
| T31 | S1 | Origin × no `--origin`, no `--host`, nothing inherited | A8 untouched | AC-O2 |
| T32 | S1 | `--host` × not one of the two values | Argument error | AC-H3 |
| T33 | S1 | `--host github-pages` × workflow absent / different | Installed / left with a warning; A9 untouched | AC-H1 |
| T34 | S1 | `--host cloudflare-pages` × workflow absent / equal to generated / different | Nothing / removed / left with a warning | AC-H2 |
| T35 | S1 | `--host` together with `--base` | Argument error | AC-H3 |
| T36 | S1 | `--host` × A9 not in upstream form | Warning | AC-H3 |
| T37 | S1 | No `--host` × workflow | Today's behaviour: installed when absent, never clobbered (existing tests stand) | AC-H4 |
| T38 | S1 | `--base /x/` × A9 | `const siteBase = '/x/'` | AC-H4 |
| T39 | S1 | `--base none` × A9 | `const siteBase = '/'` | AC-H4 |
| T40 | S1 | `--base` × A9 missing or several | `exitCode` 1 naming A9 | AC-H4 |
| T41 | S4 | Template × steps | `configure-pages` step with id `pages` before the build step; build `env.SITE_BASE` = `${{ steps.pages.outputs.base_path }}/`; header no longer contains "刻意不設" or "必須在 .vitepress/config.mts 設" | AC-H5 |
| T42 | S3 | Config × `SITE_BASE` unset or empty | `base` `/`; hrefs `/favicon.svg`, `/favicon.png`, `/apple-touch-icon.png` | AC-H6 |
| T43 | S3 | Config × `SITE_BASE=/x/` | `base` `/x/`; hrefs prefixed `/x/` | AC-H6 |
| T44 | S3 | Config × `SITE_BASE` not matching `^/([A-Za-z0-9._~-]+/)*$` | Module throws naming SITE_BASE | AC-H6 |
| T45 | S1 | `--repo` owner × GitHub rule (alphanumerics and `-`, 1–39, no leading or trailing `-`); name × `[A-Za-z0-9._-]{1,100}`, not `.` or `..` | Accepted; else argument error | AC-P1 |
| T46 | S1 | `--author` × 1–100 code points after trim, character rules | Accepted; else argument error | AC-P3 |
| T47 | S1 | Record × absent | Created when `settings` is first written: `upstream` {upstream slug, null, null}, `createdWith` null, `baseline` null | AC-R1 |
| T48 | S1 | Record × valid | `upstream`, `createdWith`, `baseline` and unknown keys unchanged | AC-R1 |
| T49 | S1 | Record × unparsable, `schema` ≠ 1, wrong type, invalid subfield value, forbidden key | `exitCode` 1 naming the problem; nothing written | AC-R2 |
| T50 | S1 | Record × missing top-level field | Treated as null | AC-R2 |
| T51 | S1 (fs) | Write order × success | `settings` → edits → `applied`, each an atomic write | AC-R3 |
| T52 | S1 (fs) | Write failure part-way | `exitCode` 1; `applied` unchanged | AC-R3 |
| T53 | S1 | After T52 × next run with the same or with different arguments | The tree equals what one successful run from the pre-failure tree would produce with the same effective (merged) settings | AC-R3 |
| T54 | S1 | Validation, record or anchor failure | Nothing written | AC-R3 |
| T55 | S1 | Record format × | Two-space JSON, known keys in table order then unknown keys, LF, trailing newline | AC-R4 |
| T56 | S1 | `--dry-run` × valid / invalid | Nothing written; `changedFiles` lists what would change, record included / same errors as a real run | AC-R5 |
| T57 | S1 | `version`, `license` × manifest `repository.url` upstream's / not | Set to `0.1.0` and `ECL-2.0` / unchanged | AC-R6 |
| T58 | S1 | Whole run × identical arguments twice | Second run: `changedFiles` empty, no write call | AC-R7 |
| T59 | S1 | `settings` × argument not given | Inherited from `applied` (null if none) | AC-R10 |
| T60 | S1 | `settings.base` × `--base /x/` / `--base none` / not given | `"/x/"` / `"none"` / inherited | AC-R10 |
| T61 | S1 | Overridden-contract tests × | Rewritten as the table says; every other existing fork-init test passes unchanged | AC-R8 |
| T62 | S2 | CLI × valid fixture / invalid argument | Exit 0 / exit 1 with the message on stderr | AC-R9 |
| T63 | S1 | Rebrand × slug, record, keep list | Slug only via A1–A5; the four key renames skip the record, keep-list files and the A6–A8 anchor lines | AC-B1 |
| T64 | S1 | Rebrand × residual inventory | Excludes keep-list files and the record; warning no longer claims the slug was renamed by rebrand | AC-B1 |
| T65 | S6 | Component tests × `SITE_ORIGIN` mocked to `https://example.test/sub` | Expected strings are that literal plus fixed paths; no upstream address in the tests | AC-C1 |
| T66 | S4 | Release job, new cross-OS job × `if:` | Exactly `github.repository == 'BrowserLaboratory/wxl-platform'` | AC-C2 |
| T67 | S4 | New cross-OS job × matrix and run | `include` with four entries: windows-latest/24, macos-latest/24, ubuntu-latest/24, ubuntu-latest/22; runs `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/slug-guard.test.ts`; installs no Rust toolchain (toolchain-parity job list unchanged) | AC-C3 |
| T68 | S1 | `changedFiles` and warning paths × Windows | Relative paths with `/` | AC-C3 |
| T69 | S7 | Export × each host | Every command exits 0 | AC-X1 |
| T70 | S7 | Built pages × each host | Both hero names equal the site name; `<title>` ends with the site name; built short-link origin equals the origin; favicon hrefs at `/` | AC-X1 |
| T71 | S7 | Built pages × `SITE_BASE=/x/` | Favicon hrefs under `/x/` | AC-X1 |
| T72 | S8 | Preview × upstream | The three favicon URLs return 200; asset URLs start with `/assets/`; `<title>` equals the production site's | AC-X2 |
| T73 | — | README, README.en | Fork section documents `--host`, `--origin`, `--site-name`, `range.json`; removes the statements that the workflow leaves SITE_BASE unset, that `fork:init` never touches short links, that sub-path tests 404, the Cloudflare `--base none` and Cloudflare sub-path advice; warns that GitHub Pages ranges of one owner share browser storage | AC-D1 |
| T74 | — | Both `wxl-fork-init` skills | Same content changes; base table replaced by `--host`; scan description replaced by anchors; Node ≥ 22.6; verification checks the slug only in A1–A5 files; each keeps its current language (stated exception to the language rule) | AC-D1 |
| T75 | — | Glossary | 設定紀錄 notes that the upstream version may be unknown; slug（題目 slug） gains `_Avoid_` for the repository slug; coinage markers removed for coined terms now used in README; glossary test passes | AC-D2 |
| T76 | — | Open questions | OQ-005 resolved; OQ-004 records the Cloudflare rule; new entries: hiding the copy-short-link button on GitHub Pages ranges, and the stage 8 non-browser harness | AC-D3 |

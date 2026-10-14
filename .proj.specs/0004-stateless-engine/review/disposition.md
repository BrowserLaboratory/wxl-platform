# Round 1 disposition — epic 0004

Round 1 found no P0, so the stage 3 gate is met. The user had asked for every later step to follow
the recommendation (2026-10-14); the dispositions below are those recommendations, applied in
revision 2. Each finding is answered claim by claim where it makes more than one; "→" names the
revision-2 rows, sections or ACs that carry the answer. "Declined" and "Recorded" give the reason.
Groups M1–M10 are in `round-1.md`.

## Completeness (C)

| Id | Response |
|---|---|
| C-1 (P1) | Accepted (M1). The history-based check is replaced by a pin of the current template's hash, so no Git history is needed and shallow or single-commit checkouts do not matter → T27, S5 |
| C-2 (P1) | Accepted (M7). S7 runs `CI=1 pnpm test:challenges` after the smoke test. `pnpm challenge:validate` is not added: no anchor touches challenge sources, so this epic cannot change its result → S7, T73 |
| C-3 (P1) | Accepted (M6). Under `--host github-pages` a template that does not derive SITE_BASE is a tree error → T24 |
| C-4 (P1) | Accepted (M2), all four claims resolved by removing leftover clean-up: (1) dry-run and (2) errors no longer interact with any clean-up; (3) there is no search; (4) T3 is untouched. The temporary file is an implementation requirement only (S1 decision) and is ignored by `.gitignore` → T55, T84, spec "Engine interface and errors" |
| C-5 (P1) | Accepted (M8). T78 forbids the old base-table strings and the zero-residue sentence, and requires the rewrite-list `git grep` → T78 strings |
| C-6 | Accepted (M4). Value checks are ordered and complete (T40, `--rebrand` included); T42 removed from the list → argument check order |
| C-7 | Accepted (M5). T7 lists T25's template-missing warning → T7 |
| C-8 | Accepted (M3). Rebrand mode handles `--name` and `--description` as today; the trim rule is anchor-mode only → character rules, T51 |
| C-9 | Accepted (M3). T51's list now names T11 (A9 in CRLF), T26, T44, T50, T53, T54, T57; the in-place write is today's → T51, T11 |
| C-10 | Accepted (M3). T26 applies in both modes → T26, T51 |
| C-11 | Accepted (M6). Story 8 is scoped to `--host`; the README must say that `--base` turns the range's smoke and challenge tests red → story 8, T77 strings, spec "Host, base and origin" |
| C-12 | Recorded (Out of Scope). A config with A9 and `base: siteBase` but literal hrefs only misplaces favicons on a project site, and nothing checks them: checking hrefs textually would add a fragile recogniser |
| C-13 | Accepted (M6). In anchor mode the no-host comparison is LF-normalised too, a stated deviation from today; rebrand mode compares as today → T25, workflow states |
| C-14 | Accepted (M4). Any error Node's parser raises, and a repeated flag, is a `ForkInitArgError` → T48 |
| C-15 | Accepted (M4). Missing or empty after trim is T47 → T47, argument check order |
| C-16 | Accepted (M10). Any non-plain-object `repository` or `bugs` becomes an object; a BOM-prefixed manifest is a tree error → T12, T13 |
| C-17 | Accepted (M10). A site name or author must hold a code point other than U+200C/U+200D → character rules, T40 |
| C-18 | (1) Accepted: workflow installs and removals are writes for T6. (2) Resolved by M2: leftovers are no longer part of any contract. (3) Recorded (Out of Scope): a run interrupted with Y and finished with X converges except for what first conversion decided → T6 |
| C-19 | Recorded (Further Notes). A template from before this repository's first commit is not known; such a range gets T22's "other" warning |
| C-20 | Accepted in part (M10). The pristine check covers A2–A5 and the absence of a deploy workflow. `name` and `description` are not checked: an engine run on upstream always changes A1's URLs and `version`, which already fail the check → T67 |
| C-21 | Accepted (M2). A write failure is a tree error naming the file and asking for a re-run; warnings collected before an error are not printed → T53, T55 |
| C-22 | Accepted (M2). Permission bits are kept by the temporary-file write; rebrand mode writes in place as today → T55, T51 |
| C-23 | Accepted (M7). The CF export's site name contains `\`, `$'` and `$1`, checked on the real VitePress build (`$&` cannot be used: `&` is refused by T41, and T42 no longer lists it) → S7, T42, T74 |
| C-24 | Recorded (Out of Scope). A Pages workflow at another path is not detected |
| C-25 | Recorded (Further Notes). The old README allowed `SITE_BASE` without a trailing slash; the new config throws naming it — loud, not silent |
| C-26 | Accepted (M5). Replacing a non-upstream A8 warns with old and new values → T81 |
| C-27 | Accepted (M8). README must keep `Settings → Pages → Source` and the `` `v*` `` rule → T77 strings |
| C-28 | Accepted (M10). An empty `GITHUB_REPOSITORY` counts as unset; no git installed means not a work tree → T65, T66 |
| C-29 | Accepted (M10). The base grammar refuses `.` and `..` segments, for `--base` and the config → base grammar, T21, T31 |
| C-30 | Accepted (M10). An A7 value is parsed with `yaml`; block scalars are unparsable → identity anchors |
| C-31 | Accepted (M10). The guard scans tracked text files (no NUL in the first 8000 bytes) → confinement section, T63 |
| C-32 | Recorded (Out of Scope). A merge that takes upstream's `repository.url` makes the next run a first conversion, by the definition the user's stateless rule implies |

## Verifiability (V)

| Id | Response |
|---|---|
| V-1 (P1) | Accepted (M3). T52 uses `--author x` and asserts `exitCode` 0 → T52, AC-B3 |
| V-2 (P1) | Accepted (M1). No history is read → T27 |
| V-3 (P1) | Accepted (M1). No ref or history definition is needed → T27 |
| V-4 (P1) | Accepted (M4). Complete ordered list, with the order inside each pair; each message contains its flag's name, and checks on the same flag carry a distinguishing string → argument check order and messages |
| V-5 (P1) | Accepted (M5). T7 enumerates exactly (both kinds of "other", template missing); AC-A4 says "exactly" → T7, AC-A4 |
| V-6 (P1) | Accepted in part (M2). The temporary-file write is declared unobserved (the user's S1 decision: an implementation requirement); what is observed is a write failure's result → T55 |
| V-7 (P1) | Accepted (M2). No clean-up remains, so T3, T54 and T56 cannot collide with it |
| V-8 (P1) | Accepted (M4). T18, T24 and T35 list required message strings → T18, T24, T35 |
| V-9 (P1) | Accepted (M10). X is fixed to three argument sets and every subset of their writes is tested, workflow installs and removals included → T6, AC-A3 |
| V-10 (P1) | Accepted (M7). `CI=1` and free ports before each Playwright command → S7 |
| V-11 (P1) | Accepted (M7). S7 says where T74 and T75 are read → S7 |
| V-12 (P1) | Accepted (M8). Each overridden comment has forbidden and required strings, checked through S9 → T83, AC-D4 |
| V-13 | Accepted (M10). "Today" is defined as `c0f7edf`; T58 states anchor mode's stdout order and keeps rebrand mode's stdout as today → modes and "today", T58 |
| V-14 | Accepted (M6). Same as C-13 → T25 |
| V-15 | Accepted (M10). AC-A2 compares the manifest's other fields by value; T4 defines the serialisation (two spaces, trailing newline, CRLF iff the first line ending is CRLF) → T4, AC-A2 |
| V-16 | Accepted (M3). AC-H5 says T26 holds in both modes → AC-H5 |
| V-17 | Accepted. AC-H4 includes the path → AC-H4 |
| V-18 | Accepted (M10). Messages name anchors by id and use `/` paths → T53, T57 |
| V-19 | Accepted (M10). The header is the comment block before the first non-comment line; the build step is the one whose `run` is `pnpm build` → T28 |
| V-20 | Accepted (M10). Field ids are listed → T67, T68 |
| V-21 | Accepted (M8). Documents are checked through S9; prose items became strings; a section ends at the next heading of the same or higher level; the upstream repository URL is covered by the guard, not by a document string → T77, S9 |
| V-22 | Accepted (M8). Glossary and register changes are required strings → T79, T80 strings |
| V-23 | Accepted (M7). Hero located as `.VPHero .name`; one short link per numbered challenge (four today) in both locales; `.html` and `.js` files only; favicon hrefs compared for equality → T74, S7 |
| V-24 | Accepted (M7). AC-X1 runs on the HEAD of the epic's last ticket branch → S7, AC-X1 |
| V-25 | Accepted (M10). Recognition counts candidate lines; the one candidate's value must parse → identity anchors, T9 |
| V-26 | Accepted (M4). Same as C-15 → T47 |
| V-27 | Accepted (M10). Categories follow the running Node; tests use characters stable across Node 22 and 24 → character rules, Testing Decisions |
| V-28 | Accepted (M10). S2's fixture sits under the temporary directory's real path → S2 |
| V-29 | Accepted (M7). A same-origin path starting with `/assets/` or a single root-level segment → T76 |
| V-30 | Accepted (M10). The keep list names `SKILL.md`; the guard skips binary files; "nothing written" is bytes, modification times, creations and removals → confinement section, T54 |

## Contract conflict (K)

| Id | Response |
|---|---|
| K-1 (P1) | Accepted (M8). Same as C-5; the skill's verification is scoped to the rewrite list, and its "既有且不同者不覆蓋" (now false under `--host`) is forbidden → T78 strings |
| K-2 | Accepted (M8). The parity header, template header and fixture header are on the overridden list; step order and `SITE_BASE` are stated as deliberate departures from the baseline → overridden contracts, T83 |
| K-3 | Accepted (M8). Existing code is named by test title or comment text, never by line → overridden contracts |
| K-4 | Accepted in part (M9). The spec states what an upgrade can read from the anchors and that the host cannot be read reliably (0006 records it); the setup-record entry gains the "no record before it exists" sentence (T79); "upgrade module" is replaced by the glossary's "the dev module that upgrades a range". Whether `fork:init` is a dev module is the glossary's definition and unchanged → Out of Scope, T79 |
| K-5 | Accepted (M9). "Slug" alone replaced by "repository slug"; forms use `<owner>/<name>` (test titles quoted verbatim keep their words) |
| K-6 | Accepted in part (M9). ACs say "short-link origin". No glossary `_Avoid_` for origin（紀錄來源）: short-link origin is a spec term, not domain vocabulary (the same reason 0003 declined K-15) → AC-O1, AC-O2, Vocabulary |
| K-7 | Accepted (M9). The URL part is "hostname" → origin grammar, Vocabulary |
| K-8 | Accepted (M9). The upstream entry gains an `_Avoid_` for git's remote name → T79 strings |
| K-9 | Accepted in part (M9). B5 names the conflict with 全站清除 and T79 annotates that entry. 本站的其他分頁 is not annotated: it describes this site's tabs, and the cross-range case is recorded in OQ-018 → B5, T79 strings |
| K-10 | Accepted (M9). "the range's earlier repository slug" → Solution, T1, Out of Scope |
| K-11 | Accepted in part. The harness is provisional for this epic and recorded so in OQ-017 with its revisit condition; an ADR follows if a later epic keeps it → T80 strings, Testing Decisions |
| K-12 | Accepted. OQ-019 records the generated release notes against the release-note rule → T80, Out of Scope |
| K-13 | Recorded (Out of Scope). A site name the range's prose audit rejects is the teacher's wording |
| K-14 | Accepted in part. Byte-identical skills are stated as an override for this epic; the language exception stays stated in the spec, not registered, because the next skill change reopens it anyway → T78, Documents |
| K-15 | Recorded (Further Notes). Same as C-19 |

## Red team (R)

| Id | Response |
|---|---|
| R-1 (P1) | Accepted (M1). Same as C-1 → T27 |
| R-2 (P1) | Accepted (M6). "Derives SITE_BASE" requires the `pnpm build` step's value to be exactly the configure-pages expression; an old upstream workflow with `SITE_BASE: /wxl-platform/` therefore gets the 404 warning → workflow states, T22, T26 |
| R-3 (P1) | Accepted (M2). (1) and (2) No clean-up exists. (3) Two concurrent runs are outside the model (B2). (4) `.gitignore` ignores `*.fork-init-tmp` → T84 |
| R-4 | Accepted (M2). Anchor mode keeps permission bits (an implementation requirement); rebrand mode writes in place as today; symbolic and hard links are outside the model (B2) → T55, B2 |
| R-5 | Accepted (M2). Same as C-21 → T55 |
| R-6 | Accepted (M10). `WXL_EXPECT_UPSTREAM` makes a wrong "not upstream" decision fail in upstream CI → T69, T71, AC-G3 |
| R-7 | Accepted (M10). Same as C-20 → T67 |
| R-8 | Accepted (M6). Judged by parsing the YAML → workflow states |
| R-9 | Accepted (M5). Same as C-26, plus a warning when `--host` resets a literal A9 → T81, T82 |
| R-10 | Accepted (M6). README requires the Cloudflare "every run" sentence and the sentence that a run without `--host` reinstalls the GitHub Pages workflow, whose `v*` deploys then fail → T77 strings |
| R-11 | Accepted (M10). Same as C-29 → base grammar |
| R-12 | Accepted (M9). B5 and OQ-018 include the service-worker scope → B5, T80 strings |
| R-13 | Accepted (M4). Rejected values are quoted with `JSON.stringify` → argument check order and messages |
| R-14 | Recorded (Further Notes). The engine's messages carry upstream's URL instead → T18, T24 |
| R-15 | Accepted (M10). Same as C-16 → T12, T13 |
| R-16 | Recorded (Out of Scope). Same as C-12 |
| R-17 | Accepted (M3). Same as C-10 → T26 |
| R-18 | Recorded (Out of Scope). Same as C-24 |
| R-19 | Accepted (M7). No `titleTemplate` is set; T74 checks `<title>` on a real build with `$'` and `$1` in the CF site name → Further Notes, S7 |

## Self-check of revision 2

Before publishing revision 2, four checkers (mutual exclusion, disposition coverage, string facts,
derivation) read it against the repository. Their findings were applied in place:

| Finding | Change |
|---|---|
| `$&` listed as accepted while `&` is refused (from revision 1), and put into the CF export's name | `$&` removed from T42 and AC-N3; the CF name uses `$'` and `$1` |
| LF-normalised workflow comparison stated for both modes, not in T51 | anchor mode only; rebrand mode compares as today (T51, workflow states) |
| the shared fixture's stub template does not derive SITE_BASE, so `--host github-pages` cases could not run | T60 and Testing Decisions give the fixture a deriving template; T6 requires each X to exit 0 |
| "frozen fixture" named two different files | the new copy is `tests/unit/workflows/fixtures/deploy-template-72327e2.yml`; the parity file is "the frozen baseline" |
| T58 fixed both modes' stdout; rebrand prints `[!]` blocks | T58 is an order rule for anchor mode; rebrand mode's stdout is today's; `✗ ` prefix stated (T53, T59) |
| T53 counted write failures in rebrand mode | anchor mode only; rebrand mode fails as today (T51) |
| a positional argument has no flag to name | T48 requires `positional` and the JSON-quoted argument |
| permission bits listed as observed although untested | removed from S1 and Testing Decisions |
| T55's read-only directory only fails a temporary-file writer | the target file is read-only too; skipped as root |
| strings with `\`` inside single-backtick spans | rewritten as double-backtick spans, with the convention stated |
| S9 grepped whole files, so entry-scoped strings passed vacuously | S9 greps by block, adds `cmp` and the glossary test's run; T79 and T80 strings are block-scoped and content-bearing |
| T77's forbidden Cloudflare step lies outside the rewritten section | T77's scope includes it; a "served at the domain root" string is required |
| the prose said "no Rust toolchain" but T72 forbade only two steps | T72 and AC-C3 also forbid `dtolnay/rust-toolchain` and `Swatinem/rust-cache` |
| T83 left two stale config claims and the exit-code comment | forbidden strings added; required strings name the new comments |
| smaller wording: A9 "candidate lines", "initially one", "four at `c0f7edf`", T11 vs T4 for the manifest, T13 `repository.type`, T82 shows the upstream form, B2 LF-normalised wording, hard links outside the model, socialLinks moved to T4, favicon hrefs in both `index.html`, later-epic numbers and the uncommitted glossary section stated | applied |

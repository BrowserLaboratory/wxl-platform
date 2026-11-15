# Traceability: 0010-primary-locale-layout

`{type × field × boundary} → {expected behaviour → acceptance criterion}`. The spec (`spec.en.md`)
is derived from this file; a gap here is a gap there.

Revision 1 (2026-11-15), written at `main` `65de8c0`, with the self-check of the same day applied
("Checks on revision 1"). Stage 3 round 1 reviewed it with the frozen prompt in `review/prompt.md`
(`review/round-1-C.md`, `-V.md`, `-K.md`, `-R.md`, read at blobs `f45f078` and `5d3c16c`).

Revision 2 (2026-11-15) applies round 1's disposition (`review/disposition.md`): each of the 76
findings (P1 and P2) is fixed here or declined there with its reason. Round 1 found no P0, so the
stage 3 gate is met; by the 0006 precedent (0006's revision 2: round 1 had no P0, so round 2 was not
run), round 2 is not run and revision 2 is self-checked instead ("Checks on revision 2"). New
decisions D122–D141; new rows B93–B95, S76–S80, Y107–Y113, U149–U154 and V-B7; new criterion AC-61;
the commands and patterns that rows used to quote inside table cells are in "Literal patterns"
(PAT1–PAT5, and PAT6 from the self-check). Row ids keep their meaning; no row is removed. The
self-check's own findings (RV2-01–RV2-22, SC2-01–SC2-10) are applied in this revision and listed at
the end of "Checks on revision 2": they change D67, D121, D122, D124, D125, D129 and D134–D141 in
place and add D142 and PAT6.

**What it rests on.** The stage 1 decisions are recorded in the local research note
`.proj.research/2026-11-02-primary-locale-grill.md`: Q1–Q23 (2026-11-02 to 11-04), R1–R13
(2026-11-06) and, from the re-check at `65de8c0`, facts F1–F26 and decisions R14–R31 (2026-11-15,
approved under the user's standing authorization of that day). R13 sets what this epic holds; R24 adds
fork:init's and create-wxl's anchor paths and the upgrade's move. Everything the note gives to the
next epic (0011) stays out: fork:init's `--primary-locale`, create-wxl's question, the
translation-skeleton command, wxl-create's post-authoring question and R25. Decisions marked
"new" were made in stage 2; each is approved under the user's standing authorization of 2026-11-15
(new decisions are taken on the agent's recommendation and listed for the user, "Integration notes").
That approval covers the spec; as `docs/agents/workflow.md` ("Standing authorization") requires, each
new or changed D-number is still shown to the user as a short decision summary and confirmed before
it is implemented ("Items for the user").

**What it amends.** Each amendment is also a row of "Overridden contracts".

| Spec | Rows and contracts this spec amends |
|---|---|
| 0003 (`apply-engine`) | A7's file list (`platform/index.md` → `platform/en/index.md`); T17's upstream-pristine test reads A7 at the new path (D107, U113–U116) |
| 0004 (`stateless-engine`) | A7's file list (`platform/index.md` → `platform/en/index.md`) and T67's field ids (`A7:platform/index.md` → `A7:platform/en/index.md`), as `upstream-guard.test.ts` spells them (D107, U116) |
| 0005 (`create-wxl`) | R2 ("`range.json` holds only `upstream`"): it may also hold `primaryLocale`, which the build reads (D2) and the upgrade's move writes (D105); fork:init still never writes it in this epic. Trust boundary B8 ("create-wxl and `range.json` are not part of the built site"): `range.json`'s `primaryLocale` now decides the deployed site's root language (TB1, TB3) |
| 0006 (`range-upgrade`) | "Step order" rows 6–10 and its closing paragraph; vocabulary B, T, o and "anchor files"; P-2's and M4/M8/M9/M11's "o as it is"; M5's mode rule; "`range.json` after the plan" (U24); "Codes" (UP-E14, UP-A16 added; the 24-code list); "Report" (report R2–R4 amended, report R6 added); AC-6, AC-9, AC-10; `UP_ARGS`; Out of Scope's "migrations"; Further Notes' ADR-0008 bullet; the "Stage 8 simulation" (historical); rows U21, U24, U69 (fixtures) |
| 0007 (`gh-pages-range-fixes`) | D12 and W6 (the orphan refusal, now re-based on the primary locale); W4's wording; H13 (`number-locales`); the W1/W2 substring lists of `create:challenge`; the vocabulary sentence "Challenges are per-folder (`<slug>/index.md`)"; the vocabulary entries "watched trees" (now `platform/challenge/` and `platform/<L>/challenge/` for every listed `L`, D65), "watched paths" (adds `range.json`, D66), "validator" and its outcome rule "The validator receives the staged paths under `platform/challenge/` …" (it receives every listed locale's brief paths too, Y88–Y90) and "retiring" (moving the declaration folder and deleting every locale's briefs, D63); D5's trigger list (adds `range.json`, D66); outcomes O1–O7 unchanged |
| 0008 (`missing-translation-fallback`) | D4, D6; "Requested locale" rows 2 and 5; decision-table rows A1–A3 (none, unknown, unreadable); W2, W4; D5's and B4's "an address under `/zh-TW/`"; C1, C2 and the lookup row `/en/challenges → C3`; the canonical sentences' link column; vocabulary "primary locale" and "page locale"; goal G2 (BC5, BC19); "Schema: page list (S2)", P1, P2, P7; "Schema: locale challenge data (S4)", E1–E5, E10, AC-6; rows G1–G10 and "Schema: redirect rules (S6)"; D2 and goal G22, read as "each list's copy control opens its own locale" (D30, S69); F4–F6; H1a, H2, H3, H6; its last overridden-contract row; the acceptance criteria fed by the amended rows: AC-2 (A1–A3 → D25, A1–A10), AC-4 (C1, C2 and the lookup row → D27, D28, A14–A18, A39), AC-8 (G1–G10 → D57–D61, S1–S27) and AC-11 (W2, W4 → D26, A25) |

Row ids are prefixed by area: **B** build and routing, **A** learner arrival, **L** challenge lists
and smoke fixtures, **S** short links, numbers and the hook, **Y** the challenge declaration, **U**
the upgrade's move. Rows of other specs are always cited with the spec number (`0008 A5`, `0006 U24`,
`0007 H13`); a bare row id is this spec's. Spec 0008 uses G2, G6 and G7 both for a restated goal (its
first table) and for a matrix row; this spec writes `0008 goal Gn` for the goal and `0008 Gn` for the
row. Q, R and F cite the stage 1 note. In area U, "report R1"
to "report R6" name the upgrade report's lines (0006's R1–R5 and this spec's R6), never stage 1
decisions.

## Decisions

Stage 1 decisions are realised, not reopened. "Was" is the fragment id; "Source" names the stage 1 decision (Q, R) or fact (F) and marks new decisions. Merged duplicates: D13 (B-D13, L-D13), D15 (B-D15, AD12), D48 (L-D12, SD5); YD16 is deferred (Out of Scope).

| D | Was | Source | Decision |
|---|---|---|---|
| D1 | B-D1 | Q1, ADR-0008, R3, Q10 | Pages live only in locale folders: `platform/en/` and `platform/zh-TW/`. No page lives in `platform/` itself or in `platform/challenge/`. `platform/challenge/<slug>/` holds the locale-independent part of a challenge (`src/`, `challenge.yaml`; contents are area Y's). `platform/public/`, `platform/shared/` and `platform/postcss.config.mjs` stay where they are. |
| D2 | B-D2 | Q12, R17 | The primary locale is the string value of the own property `primaryLocale` of the JSON object in `range.json` at the repository root (the parent of `.vitepress/`). An absent `range.json`, or a `range.json` object without an own `primaryLocale` property, gives `zh-TW`. Nothing else chooses it: no environment variable, no flag (D21). Upstream has no `range.json` and is therefore `zh-TW` (Q8). |
| D3 | B-D3 | R19, F17 | A `range.json` the build cannot use fails the build with a layout error: not a regular file by `lstat` (PL-E01), unreadable (PL-E02), not JSON (PL-E03), not an object (PL-E04), `primaryLocale` not a string (PL-E05), not on the locale list (PL-E06). The reasons mirror 0006's J1/J3 tokens (`not-a-file`, `not-json`, `not-object`), including "a BOM is not JSON". The build reads no other key; `upstream` is not checked here (it is the upgrade's, J4). |
| D4 | B-D4 | R6, R23, F22 | The locale list is one import-free module (recommended path `.vitepress/locales.ts`, loadable by Node's `--experimental-strip-types` and by the VitePress config) exporting `LOCALES` (`['en', 'zh-TW']`, in that order), the type `Locale` derived from it, `DEFAULT_PRIMARY_LOCALE = 'zh-TW'`, and `isKnownLocale`. It replaces `KNOWN_LOCALES` and the literal `Locale` union in `.vitepress/theme/i18n/index.ts`, `ShortLinkLocale`, `ChallengeLocale` and every other two-locale enumeration in `.vitepress/` and `platform/shared/` (the replacements outside this area are their areas' rows; this area owns the module). A locale is on the list only if it has an interface string table `.vitepress/theme/i18n/messages/<code>.json` and an entry in the locales-config table (D8). It also exports `LOCALE_ENGLISH_NAMES` (D115). create-wxl's literal copy is D112 and the hook's delegation is D65; fork:init reads no locale in this epic (N11). |
| D5 | B-D5 | R6, R12, R28, F15 | The VitePress configuration checks the source layout when it is evaluated, after the existing `SITE_BASE` check and after reading the primary locale, and before returning the configuration. So `vitepress build` (`pnpm docs:build`, which CI's quality-gates and release workflows run), `vitepress dev` and `vitepress preview` all fail on a bad layout before anything is rendered. The configuration also sets `srcExclude: ['public/**', 'shared/**', 'challenge/*/src/**']` (plus D49's `<code>/smoke-fixtures/**` entries in a production build), so VitePress's own page set equals the page list's (today `pageListFromDir` skips `public/` and `shared/` while VitePress's glob does not). |
| D6 | B-D6 | New, approved under the user's standing authorization of 2026-11-15 | The layout check runs its rules in a fixed order — PL-E07 (symbolic links), PL-E08 (pages outside the locale folders), PL-E09 (entries named like a locale), PL-E10 (primary home page) — and throws for the first rule that has any violation, listing every violating path of that rule, sorted by UTF-16 code unit, one per line. One build reports one code. |
| D7 | B-D7 | Q1, ADR-0008, F12 | `rewrites` is a function: a source path that starts with `<primary>/` is rewritten to the rest of it; every other source path is left as it is. No other rewrite exists. With the layout check passed, the page list holds no two equal entries (proof in B41). |
| D8 | B-D8 | F12, new, approved under the user's standing authorization of 2026-11-15 | `locales` is generated by `localesConfig(primary)` from a per-locale table (label, `lang`, nav, sidebar, each nav and sidebar link written from the locale's own home, e.g. `/guide/python`). The primary locale is `root` with links as written; every other listed locale is keyed by its code with `link: '/<code>/'` and every link prefixed with `/<code>`. `localesConfig('en')` deep-equals today's literal `locales` object (regression pin). Site-level `title` and `description` stay as they are, English, for every locale (open issue B-O5); `<html lang>` follows each locale's `lang`, so the root pages carry the primary's. |
| D9 | B-D9 | F12, new, approved under the user's standing authorization of 2026-11-15 | The page list maps every page through the rewrite: entry = `entryForRelativePath(rewrittenPath(source, primary))`. `entryForSourcePath` is renamed `entryForRelativePath`, with unchanged spelling rules, because its input is VitePress's `relativePath` (the rewritten path) at both callers: `pageListFromDir` and `classifyArrival`. `pageListFromDir` takes the primary locale as a second argument. |
| D10 | B-D10 | F12 | `transformPageData` reads the page's source from `resolve(srcDir, pageData.filePath)`, never `relativePath` (which, for a primary-folder page, names a file that does not exist). Area C adds the `challenge.yaml` merge (R26) to the same function. |
| D11 | B-D11 | F12 | `createContentLoader` does not apply rewrites (it computes `url` from the source path). Every `url` a challenge loader emits is mapped to the page-list entry of the brief it came from, and the locale of an entry is taken from the locale folder of its source, never from the URL's first segment (a primary-locale URL carries no prefix). The loaders' globs name the locale folders (`<code>/challenge/*/index.md` for each listed code). The merge rules themselves are area L's (D38–D43). |
| D12 | B-D12 | ADR-0008 consequence 2, new, approved under the user's standing authorization of 2026-11-15 | VitePress's dead-link check resolves a link against URLs and then compares it with **source** paths, so a link whose URL names the primary folder (`/en/guide/` when `en` is primary, or `../../en/reference/x.md` from a Traditional Chinese page) passes the check and 404s (read from `createMarkdownToVueRenderFn`; V-B1 measures it). The build therefore fails with PL-E11 on a markdown link in a page whose resolved base-less URL path's first segment equals the primary locale. Every other internal markdown link keeps VitePress's dead-link check, and `ignoreDeadLinks` stays unset. ADR-0008's "A dead link fails the build rather than shipping" holds only with this rule; the spec says so (overridden contract BC12). |
| D13 | B-D13, L-D13 | F21, new, approved under the user's standing authorization of 2026-11-15 | A home-page link is written from the page's own locale home (`/challenges/`, `/guide/`) in every locale folder. The home-page link fields are exactly `hero.actions[*].link` and `features[*].link` of a `layout: home` page; no other field is read or changed. The build prefixes it with the page's locale prefix in `transformPageData` (unchanged for the primary locale), so the same source is right under either primary. A home-page link that is not a string, is relative, already carries a listed locale's prefix, or does not name a published page after prefixing fails with PL-E12. External links (a scheme such as `https:` or `mailto:`) and `#` anchors are left as written and not checked. A translation's home page may link only to pages published in its own locale: PL-E12 applies after prefixing, with no fall-back to the primary locale's URL, so a range that keeps `platform/<T>/index.md` but drops a page it links to fails the build (stated in B84 and B86). Rejected: relative links, because `normalizeLink` turns `challenges` into `/challenges` (root) and leaves `./challenges` relative, which resolves wrongly from `/en` without its slash. (Revision 2: a link starting with `//` has no scheme and fails PL-E12, D141.) |
| D14 | B-D14 | F21 | Every list and home page in every locale folder imports `../shared/challenges.data.ts` (today the English pages import `./shared/challenges.data.ts` and the Traditional Chinese ones `../shared/challenges.zh-TW.data.ts`, which D40 deletes; N3). An unresolvable import already fails the Vite build; no new rule. |
| D15 | B-D15, AD12 | F23, new, approved under the user's standing authorization of 2026-11-15 | `.vitepress/theme/Layout.vue`, imported by nothing, is deleted in the ticket that first changes the theme's Layout wiring, so no implementer edits it by mistake. The live Layout is the one `.vitepress/theme/index.ts` defines. |
| D16 | B-D16 | Q16, R13, F21 | `platform/zh-TW/guide/notes.md`'s link to the export-format reference becomes `../reference/attack-log-export-format.md`, the same-folder form, once `platform/zh-TW/reference/attack-log-export-format.md` exists (its content is the documents area's). Every relative link upstream then stays within its locale folder. |
| D17 | B-D17 | New, approved under the user's standing authorization of 2026-11-15 | Layout errors are English, like the existing `SITE_BASE` error and VitePress's own output. The README in both languages lists every PL code with its cause and fix, in the migration section R28 adds (B84). |
| D18 | B-D18 | New, approved under the user's standing authorization of 2026-11-15 | The configuration defines `__WXL_PRIMARY_LOCALE__` (a JSON string of the primary locale) beside `__WXL_PAGES__`, for the theme's locale decisions (runtime area). In the theme, `localeIndex === 'root'` means the primary locale, and any other `localeIndex` is that locale's code; no component maps `root` to `en` (runtime area changes the four components F12 names). |
| D19 | B-D19 | F15, new (constraint on other areas); new, approved under the user's standing authorization of 2026-11-15 | The layout check is an exported pure function. Every command that `pnpm build`, `pnpm dev` or CI runs on `platform/` before VitePress (`challenge:keygen`, `redirects:generate`, `challenge:validate`) calls it first, so an old-layout tree reports PL-E08 whichever command runs first. Full mode only: the generator's `--staged` mode reads the index, where `briefFaults` reports old-layout paths (D69); the `challenge:validate` command runs the check with or without a slug argument, before any challenge check, the function `validateChallenge(root, slug)` does not (N9, Y34). `create:challenge` runs it too, before writing (D82). (Revision 2: "first" means first after reading `P`, D123.) |
| D20 | B-D20 | Q2, 0008 goal G2, R29 (mutual-exclusion check) | The build does not require a page to exist in the primary locale (Q2 is enforced only where it is today, for challenge briefs, by the hook and CI, which R6 re-bases on the primary locale — D64, D86). Enforcing it here would forbid R29's "only English" fixture page in a `zh-TW`-primary test build, and 0008 goal G2 says the platform enforces no more of Q2 than the hook does. The only page the build requires is the primary home page (PL-E10). This overrides ADR-0008's "which every page must exist in" and GLOSSARY 主語系's 「每一頁都一定有它的版本」 explicitly (BC19, B87, B90): every challenge has a primary-locale brief (VM10, D64), upstream has every page in every locale (D52), and a range's article may exist in one translation only. |
| D21 | B-D21 | New, approved under the user's standing authorization of 2026-11-15 | No environment variable or command option overrides the primary locale. Tests choose it through the pure functions' arguments (0010-S1 to 0010-S7) or by a fixture tree with its own `range.json`; R29's fixture pages are switched on by `WXL_SMOKE_PAGES` (D49), which never changes the primary locale; a CI leg for `en` (B-O2) would build a fixture copy with its own `range.json`, never a root `range.json` in upstream's checkout (D136). |
| D22 | B-D22 | F7, constraint | `.vitepress/config.mts` keeps exactly one line matching fork:init's 0003 A6 pattern (`A6_CANDIDATE_RE` in `scripts/fork-init.ts`, `/^ {2}title: .+,\r?$/`: two spaces, CR tolerated; B60 uses the same) and exactly one `const siteBase = ...` line (A9): the generated locale table lives in another module, whose `title`-like keys sit at other indentation. `ANCHOR_PATHS` and `PLATFORM_HOME_RELS` are area U's (R24). |
| D23 | B-D23 | R20, Q8 | On upstream, unprefixed URLs already given out (`/challenge/<slug>/`, `/guide/…`) now serve the Traditional Chinese page; `/en/…` serves English. No redirect is added (R20). |
| D24 | AD1 | R21, F4; keeps 0008 A5 | **Cold-load redirect.** Only a page arrival, only from a primary-locale page, only when the stored value is valid and is `T`, and only to a counterpart that is a page-list entry (0008 D16 spelling, `replace`, base, query and hash kept). A translation page never redirects, whatever is stored — stated as its own condition, not obtained by writing the preference first and reading it back, so a refused write (0008 W6) cannot send an explicit translation URL elsewhere. |
| D25 | AD2 | Q3, R21, F5 | **No default visiting locale.** `DEFAULT_VISITING_LOCALE` is removed with both its readers (`redirectTargetForStoredLocale`, `useArrivals`'s `record`). With no preference, the requested locale of a page arrival is **the page's own locale**: a cold load does not redirect and no line shows. new, recommended: the same fallback applies to a later navigation (0008's "Requested locale" table, last row), so with no preference the line never shows on any page arrival except one carried by a not-found redirect (D27). Checked against 0008 L1: with requested = page locale, 0008 L1 is false by its first condition; no other rule shows the line. |
| D26 | AD3 | R21; keeps 0008 D5, 0008 D13, 0008 D16, 0008 W3, 0008 W5 | **Cold-load write.** A cold load of a published translation page writes `T` (decided after the router renders, from the rendered page). A cold load of a primary-locale page writes nothing — including one reached through `/c/NNN`, a primary-coded short link, or R22's Cloudflare splat rule. The switcher's write (0008 W1, 0008 D14) is unchanged. Nothing else writes. (Revision 2, C-18: the clause is about primary-locale landings; an orphan translation brief's `/c/NNN`, which only a `--no-verify` commit can produce, S-§4.3, lands on the translation page, and that cold load writes `T` by the first sentence, A9.) |
| D27 | AD4 | stage 2 brief; F12 note on `lookupNotFound` / `notFoundRedirect`; new for the primary-path case; new, approved under the user's standing authorization of 2026-11-15 | **Not-found lookup.** A translation path's counterpart is the primary locale's same page (0008 C1 generalised). A primary-code path's counterpart is the path with that segment removed (D28). A primary path's counterpart is the translation locale's same page — spec 0008's C2 kept in its two-locale form — **recommended**, because translation-only articles remain buildable (only orphan challenge briefs are rejected, R6) and R29's smoke fixture includes a page that exists only in one locale; the strict reading ("only ever to the primary locale's page") would turn those into not-found pages. The requested locale is always the not-found path's own locale, never "the other locale of the target" (which is wrong for D28's case). The ja epic must decide the order among several translations for a primary path. (A-O1, resolved: N5.) |
| D28 | AD5 | R22 (GitHub Pages half); new: generic in `P`; new, approved under the user's standing authorization of 2026-11-15 | **Primary-code strip.** A not-found path whose first segment is `P`'s own code (`/zh-TW`, `/zh-TW/`, `/zh-TW/…` when `P` is `zh-TW`; `/en…` when `P` is `en`) is looked up with that one segment removed; the result counts only when it is a primary-locale entry (so `/zh-TW/en/x` and `/zh-TW/zh-TW/x` find nothing). When the stripped path is a primary path (its first segment is not `T`) and is not listed, the lookup falls through to D27's primary-path rule on the stripped path: `/<P>/X` with `/X` unlisted and `/<T>/X` listed goes to `/<T>/X`, requested `P`, the line in `P` (A39). This is still one not-found redirect (0008 C9), and it gives GitHub Pages the landing Cloudflare reaches through the splat rule and the not-found page (`/zh-TW/X` → `/X` → `/<T>/X`). It runs on every host, because Cloudflare Pages serves the same `404.html` for a path no rule covers. Recommended generic (both primaries) rather than a `zh-TW` special case: `/en/…` under `P = en` was never a page, so stripping cannot shadow one; this changes 0008's lookup row `/en/challenges → 0008 C3` to a redirect on an `en`-primary range. |
| D29 | AD6 | R22 consequence; new: accept; new, approved under the user's standing authorization of 2026-11-15 | **Host divergence on old `/<P>/…` URLs.** On Cloudflare Pages the splat rule (D60) answers before the browser: the learner cold-loads the primary-locale page, so D24 applies and a stored `T` redirects to `/<T>/X`. On GitHub Pages the front-end strip is a not-found redirect: it carries the requested locale `P`, no cold-load redirect follows it (0008 C9 and `release`'s order), and the learner stays on `/X`. Neither host writes. Accepted and documented (narrow: an old link, a `zh-TW`-primary range, and a stored `T`; an old link to a page that exists only in `T` lands on `/<T>/X` on both hosts, D28's fall-through); aligning would need either a server rule that knows the preference (impossible) or a second redirect after a not-found redirect (contradicts 0008 C9). (Revision 2: D138 accepts the same kind of divergence for doubled prefixes.) |
| D30 | AD7 | R21 consequence; new: accept; new, approved under the user's standing authorization of 2026-11-15 | **Primary-coded short link.** `/<P>/c/NNN` lands on a primary-locale page, so it does not write and a stored `T` redirects it to the translation when one exists — the mirror of 0008 D6 for `/c/NNN`. `/<T>/c/NNN` lands on a translation page and writes `T`. So 0008 D6's promise that `/en/c/NNN` "opens English for every learner" holds only where `en` is the translation locale. |
| D31 | AD8 | D18; new seam; new, approved under the user's standing authorization of 2026-11-15 | **How routing code learns `P`.** Every locale-routing function of seam 0008 S1 takes `P` as an argument, keeping spec 0008's "the decision functions are pure … read no globals" (`arrival.ts` header). Callers (`useArrivals`, the theme Layout, components) read it from one client module, `primaryLocale()`, shaped like `publishedPages()`: it returns the compile-time constant, and where nothing defines it (vitest) it returns `zh-TW`, the same answer R17 gives for "nothing says". No test may rely on that fallback: every test whose outcome depends on `P` sets it explicitly. |
| D32 | AD9 | F12; new function; new, approved under the user's standing authorization of 2026-11-15 | **Page locale from `localeIndex`.** One function, `pageLocaleOf(localeIndex, P)`: `'root'` → `P`; a translation locale's code → that code; anything else → `P`. `MergedNav`, `ChallengeList`, `HomeContent` and `LocaleSwitcher` use it instead of `localeIndex === 'zh-TW' ? 'zh-TW' : 'en'`. |
| D33 | AD10 | Q20, F12 note on the line; new guard; new, approved under the user's standing authorization of 2026-11-15 | **The line and the mark stay two-locale strings.** The canonical sentences (0008 "Canonical sentences") and the mark are unchanged: with exactly two locales, a line in requested locale `R` is shown only on a page in the other locale, and a borrowed entry in a list of locale `L` comes from the other locale, so each string's implied second locale is right under either `P`. The ja epic must parameterise both (the sentence names the locale the page is shown in; the mark names the version the entry has). A unit test pins this: it fails when the locale list has any number of members other than two, and its message names the ja epic. Checked against R6 (the list is the locales with string tables): no conflict in this epic; in the ja epic the guard fails by design until the strings are parameterised. |
| D34 | AD11 | 0008 B5 generalised | **Switcher menu.** Title: the page locale. Options: the locale list in its order minus the page locale; while the line shows, the page locale is appended (the way back). Each option's label comes from one table keyed by locale code (`en` → `locale_switcher.english_label`, `zh-TW` → `locale_switcher.tw_label`); a list member without a label is a test failure. With two locales the menu is exactly 0008's. Navigation targets are unchanged in kind: `switcherDecision` with the generalised `localizePath`. |
| D35 | AD13 | Q3 consequence (re-check "session gate") | **Session gate reload.** Unchanged behaviour: `cleared` does a full load of `withBase('/')`, which is a cold load of the primary-locale home page and is decided by D24–D26 with the stored value that survived the clear (`wxl-locale` is exempt). The comments that justify skipping the held redirect ("the root load makes its own redirect") and that promise "the page the reload lands on is still in the language that was on screen" are rewritten to say exactly that: the root redirects only for a valid stored `T` whose home page is published; otherwise it shows `P`. |
| D36 | AD14 | R8 | Ranges under one GitHub Pages owner still share `wxl-locale` (OQ-018); `fork:init --rebrand` renames the key, so only ranges with the same key share it. Stated in the trust boundaries; not changed. |
| D37 | L-D1 | R5, R26, F13 | The lists read `title` and `description` from briefs only, and `number`, `difficulty`, `category`, `date`, `tags` from the declaration only. A declaration key present in a brief (refused by D74/PL-E15 anyway) and a brief key in the declaration (PL-E16) are ignored by the lists: neither overrides the other source. `id` is not read anywhere (D77): `ChallengeData.id` is the 1-based position in the shared order (D41). |
| D38 | L-D2 | R6, Q2, 0008 goal G2; stage 2 brief "translation-only = orphan"; new, approved under the user's standing authorization of 2026-11-15 | A challenge is in every list exactly when it has a primary brief. An orphan translation brief is in no list, including its own locale's; its declaration alone (no brief anywhere) is in no list. This replaces `mergeLocaleChallenges`' `chineseOnly` support and 0008 E3/G9; refusing an orphan stays with the hook and CI (R6, area Y/short links). 0008 goal G7 ("every locale's list shows every challenge") is kept with "challenge" read as "listed challenge" (0008 goal G2 makes the primary version what a challenge is). Recommended over keeping orphans borrowed: with only the primary brief as the borrowing source, no rule is needed for which translation an orphan borrows from once a third locale exists. |
| D39 | L-D3 | F12, D11 | `placeOf`'s URL parsing is removed. An entry's locale is the locale folder of its brief's source path, its slug the brief's directory name, its URL the page-list entry of the brief's source path (D7, D9). Slugs compare exactly (UTF-16 code units, case-sensitive): `Door` and `door` are two slugs. |
| D40 | L-D4 | stage 2 brief; R6 (list derived), R23; new, approved under the user's standing authorization of 2026-11-15 | **One loader, derived from the locale list.** `platform/shared/challenges.data.ts` is a VitePress data loader `{ watch, load }` (not `createContentLoader`, whose `url` ignores rewrites, F12) that exports `data: Record<Locale, ChallengeData[]>` with one key per member of `LOCALES`. `platform/shared/challenges.zh-TW.data.ts` is deleted. Every list page and home page, in every locale folder, imports `../shared/challenges.data.ts` and passes `data` unchanged (`<ChallengeList :lists="data" />`, `<HomeContent :lists="data" />`); the component picks `lists[pageLocale]`. The prop is renamed from `challenges` to `lists`; a page that still passes `:challenges="data"` (the documented usage before this epic) renders an empty list, as L32 states, and the component reports it: when `lists` is `undefined`, `ChallengeList` and `HomeContent` each call `console.warn` once per component instance (D131) with LW1 (L-§4.4) naming the page's `relativePath`, which `docs:build` prints during server rendering and the browser console shows after mount (L45). The rename is named in B84, B89 and LH5. Recommended over one file per locale: the import line is the same in every locale folder (so 0011's translation skeleton can copy a page unchanged), no file is named after a privileged locale, and adding `ja` adds no loader. D14 is written to match (N3). |
| D41 | L-D5 | 0008 E4, D77; new order; new, approved under the user's standing authorization of 2026-11-15 | Shared order: listed challenges sorted by slug (UTF-16 code units). `id` = 1-based position in it. Every list holds the same slugs in the same order with the same `id`s, whatever order the files are found in and whichever locale is `P`. Replaces "the English briefs in the order given, then Traditional-Chinese-only by slug". Visible order is unchanged for every upstream challenge (the list sorts by `number` first, and every upstream challenge has one). |
| D42 | L-D6 | R6 (list = locales with string tables); new, approved under the user's standing authorization of 2026-11-15 | The per-locale defaults move from `DEFAULTS` into the string tables as `challenge_list.default_title` and `challenge_list.default_category` (values unchanged: `Web exploitation challenge`/`General`, `網站攻防挑戰`/`綜合`). `mergeLocaleChallenges` reads them from the tables of `LOCALES`; `messages-shape.test.ts` already fails when a table lacks a key the other has. |
| D43 | L-D7 | 0008 chain-analysis N-2; new, approved under the user's standing authorization of 2026-11-15 | Field normalisation (the full table is L-§4.2): `number` a JS number else `undefined` (unchanged); `difficulty` any string as written else `'mystery'` (today: no type check); `category` string else the list locale's default; `date` a string `Date.parse` accepts, or a `Date` (converted with `toISOString()`), else `null` (today an unparsable string reaches the page as "Invalid Date"); `tags` the string members of an array else `[]`; `title` string else default; `description` string else `''`. |
| D44 | L-D8 | R7, R30, F19 | **T-0060, widened.** Every string of `ChallengeList` that is not data is a page-locale string or comes from the list page's own frontmatter, so the static HTML and the hydrated page show the same text in the list locale, in both lists, under either `P`. The full set is the canonical table L-§4.4. The h1 is the list page's frontmatter `title`; the subtitle is its frontmatter `subtitle`, a key VitePress does not read, added to both `challenges.md` (`Choose a challenge to begin`; `選一道題目開始`); an absent, empty or non-string value renders no element. Not `description`: VitePress turns a page's frontmatter `description` into that page's `<meta name="description">`, which would replace the site-level description D8 keeps on the list pages (L46). Recommended over two new string keys: the h1 and the subtitle add no interface string carrying the term 挑戰 that the glossary marks for replacement, and the h1 matches the document `<title>` the same frontmatter already gives. (Revision 2, K-5: D42 does move one existing string that carries 挑戰, `challenge_list.default_title` `網站攻防挑戰`, from `mergeChallenges.ts` into `zh-TW.json`, which already holds 挑戰 five times; it stays with L-O3's open question, B88.) |
| D45 | L-D9 | F19 (date format); new, approved under the user's standing authorization of 2026-11-15 | `formatDate` in `ChallengeList` and `HomeContent` uses the page locale's language tag (`en` → `en-US`, `zh-TW` → `zh-TW`, the `lang` of D8's locale table) and `timeZone: 'UTC'`, with `{ year: 'numeric', month: 'short', day: 'numeric' }`. Today it follows the vue-i18n runtime locale and the machine's time zone: the build (UTC) and a reader in UTC+8 disagree for `staff-only` (`2026-08-17T16:21:14.557Z`), so the hydrated text replaces the served text. Checked: no other component formats `date`. |
| D46 | L-D10 | existing contract (guide `index.md` step 1, troubleshooting `#hardcoded-english`) | Kept: the difficulty filter's four options are the literal `Easy`, `Medium`, `Hard`, `Mystery`, the home page's four difficulty stat labels the same literals, and every difficulty and category badge prints the declared value as written, in every locale. Category filter options are the declared values. The documents' word "frontmatter" for these values becomes 題目宣告 / `challenge.yaml` (LH1, LH2: "Overridden contracts › Area L", H rows). |
| D47 | L-D11 | New (widens R30 to the home page; same defect); new, approved under the user's standing authorization of 2026-11-15 | `HomeContent`'s strings (`home_content.*`) become page-locale strings, and its date follows D45. Under `P = zh-TW` the home page served at `/` is Traditional Chinese, and today its static HTML says `About WXL`, `Platform Statistics`, `Latest Challenges` until hydration. Approved under the user's standing authorization of 2026-11-15 (L-O2). |
| D48 | L-D12, SD5 | R6 (every locale has `/<code>/c/NNN`, no translation → primary page); 0008 F3 | `ChallengeList`'s `hasCopyControl` exception (no control in short mode for a Traditional-Chinese-only entry in the English list, 0008 E3) is removed: every row shows the copy control. What the copy control (0010-S30) copies: in short mode `<SITE_ORIGIN>/<list locale>/c/<NNN>` for an entry with a number, borrowed or not; in page mode `<SITE_ORIGIN>` + the entry URL. An entry without a number keeps today's behaviour (no short link). Every challenge with an included brief has a numbered rule in every form (D58), so every numbered entry in every locale's list has a short link; this inverts 0008 E3, G8 and G9 (merged from SD5). |
| D49 | L-D14 | R29, F14 | **Smoke fixture pages.** Two articles, one per direction: `platform/en/smoke-fixtures/english-only.md` and `platform/zh-TW/smoke-fixtures/traditional-chinese-only.md` (contents in L-§4.5). They are part of the tree (create-wxl and the upgrade carry them like any upstream file) and are published only by a test build. Mechanism: `.vitepress/config.mts` reads `process.env.WXL_SMOKE_PAGES` once; unless it is exactly `'1'`, it adds `<code>/smoke-fixtures/**` for every member of `LOCALES` to `srcExclude` (beside D5's entries), and `pageListFromDir` applies the same predicate (one exported function, `isSmokeFixturePage(sourcePath)`, used by both), so the page list never names an unpublished page. `isSmokeFixturePage` and every `smoke-fixtures` literal live in node-only modules (`.vitepress/pageList.ts` and the configuration), never in a module reachable from `.vitepress/theme/` (the client bundle), so a production build ships no such string (L47). The layout check does not consult it: fixture pages are locale pages in every mode (vocabulary "excluded area"). `smoke-fixtures/` under a locale folder is a reserved name: a teacher's page placed there is never published by a production build. No published page links to a fixture page (a production build would then fail its dead-link check, which is the intended guard); fixture pages link to nothing. The flag never changes the primary locale (D21). |
| D50 | L-D15 | R29, F15 | CI: the `site-smoke` job of `quality-gates.yml` sets `WXL_SMOKE_PAGES: '1'` on its build step; the `build` job (production build) gains one step after `pnpm docs:build` that fails when any path under `.vitepress/dist` contains `smoke-fixtures` or any file there contains that string (so no published page may mention the directory name; the README, which is not published, documents it). `missing-translation.spec.ts` fails fast (one `beforeAll`) when either fixture URL does not answer with its own h1, with a message naming `WXL_SMOKE_PAGES=1`. `AGENTS.md` and both READMEs say `pnpm test:smoke` needs a build made with `WXL_SMOKE_PAGES=1`. |
| D51 | L-D16 | Q16, R13, D16 | `platform/zh-TW/reference/attack-log-export-format.md` exists (agent drafts, the user reviews at stage 6). It keeps every heading, every table row, every fenced block byte-for-byte and every inline code span of the English page; only prose is translated. `zh-TW/guide/notes.md`'s link becomes `../reference/attack-log-export-format.md` (D16). |
| D52 | L-D17 | Q16 ("上游每一頁都要有" for every selectable locale); new guard; new, approved under the user's standing authorization of 2026-11-15 | A new upstream-only unit test fails when a page of the page list (production predicate, so fixture pages excluded) lacks a version in any listed locale. It decides "upstream" with `tests/__helpers__/upstreamDecision.ts`, so it never runs in a range, where translations are optional (Q2). |
| D53 | L-D18 | stage 2 brief (exploit specs' BASE_URL); new, approved under the user's standing authorization of 2026-11-15 | The four exploit specs (`tests/challenges/*.spec.ts`), the `wxl-create` template `templates/exploit-spec.ts.tmpl` and both `SKILL.md` tables (`.claude/`, `.agents/`), and `DEFAULT_BASE_URL_TEMPLATE` in `scripts/challenge-verify-blind.ts` keep `http://localhost:5173/challenge/<slug>/`. It now opens the primary brief: the Traditional Chinese brief upstream, the English one under `P = en`; and `create:challenge` writes only the primary brief (Q17), so the URL always names a page that exists. Playwright's challenge context stores no preference, so A1 (no redirect) holds. The specs read nothing locale-dependent (checked: no text locator in them). |
| D54 | L-D19 | New, approved under the user's standing authorization of 2026-11-15 | The site-smoke suite derives every expected URL from `P`, read with `readPrimaryLocale` (0010-S1) from the repository's `range.json` exactly as the build reads it, through one helper (`localePath(locale, rest)`) — never from a literal `/zh-TW` prefix — so the same suite passes in a range whose `P = en`. `playwright.site.config.ts` keeps its stored `en`; its comment is rewritten (no default visiting locale any more, D25). |
| D55 | L-D20 | R7, R30 | T-0060 is replaced by a ticket of this spec carrying L18–L33 and VL1–VL3; `/to-tickets` records the replacement in T-0060's file; T-0060's status then follows D134. |
| D56 | L-D21 | `readChallengeDeclaration` (0010-S32), D78 | A listed challenge whose declaration `readChallengeDeclaration` (0010-S32) cannot read fails the loader with Y's message for the same case (PL-E13 for `absent`, PL-E14 otherwise), so the build fails with one wording whichever of the loader and `transformPageData` runs first. |
| D57 | SD1 | Q11, Q15, Q23, R6; order new (keeps an en-primary range's rule lines identical to today's); new, approved under the user's standing authorization of 2026-11-15 | The forms are derived from the locale list: `/c/`, then `/<L>/c/` for each `L` in list order, with the legacy alias `/zh/c/` written immediately before `/zh-TW/c/`. The order does not depend on `P`, so switching `P` changes targets only. In this epic the order is `/c/`, `/en/c/`, `/zh/c/`, `/zh-TW/c/`, as today (0008 G5). |
| D58 | SD2 | R6 ("沒有翻譯開主語系頁"), Q21 generalised; the direct target and the third fallback are new, approved under the user's standing authorization of 2026-11-15 | A numbered rule's target, for form locale `L`: the challenge page path in `L` when `L`'s brief is included; otherwise in `P` when the primary brief is included; otherwise in the first locale of the list whose brief is included. With no brief included, the challenge gets no numbered rule. A rule never targets a page known not to exist (today's generator principle). Targets are the page itself: on a zh-TW-primary range `/zh-TW/c/NNN` targets `/challenge/<slug>/`, never `/zh-TW/challenge/<slug>/` (which would hop through the old-address rule). |
| D59 | SD3 | R6; 0008 G4, 0008 D1 | Slug rules: one per form, in form order, after every numbered rule; target `challengePagePath(':slug', formLocale, P)`. A slug rule cannot know whether the page exists; a missing translation reaches the not-found lookup, which sends the learner to the primary page with the line (dependency). On Cloudflare only, a two-step arrival. |
| D60 | SD4 | R22 (Cloudflare half) | When `P = zh-TW` the file ends with the old-address rule `/zh-TW/*  /:splat  302`, its own section, after the slug rules. When `P = en` it is absent. Precedence assumption (stated, verified at stage 8, V-S3): Cloudflare applies the first rule in file order that matches, for dynamic rules too; Cloudflare's documentation (Pages, "Redirects", read 2026-11-15) says "Static redirects should appear before dynamic redirects" and that the top-most redirect for one source is applied, and says nothing about splat versus placeholder priority. If the assumption fails, `/zh-TW/c/NNN` and `/zh-TW/c/<slug>` take one extra hop (`/c/NNN`, `/c/<slug>`) and still land on the same page; nothing breaks, which is why this is a stage 8 check and not a blocker. **See D118 and S-O1.** |
| D61 | SD6 | 0008 Out of Scope (unenforced) kept; computed sentence new, approved under the user's standing authorization of 2026-11-15 | Capacity: the header states Cloudflare's limits and the ceiling computed from `F`: `floor(2000 / F)` = 500 numbered challenges in this epic, for both primaries; dynamic rules used: `F` slug rules (4), plus 1 for the old-address rule when `P = zh-TW`. The ceiling is stated, not enforced. The sentence is generated from `F`, so adding `ja` (F = 5) states 400 without editing prose. |
| D62 | SD7 | R5, R26; removal new, approved under the user's standing authorization of 2026-11-15 | Numbers come from the declaration file only. `readChallengeNumber` reads a YAML file (no frontmatter split). `checkChallengeNumbers` keeps `number` and `number-unique`; `number-locales` is **removed**, not replaced: a challenge has one number by construction. A `number` left in a brief is refused by the declaration validation (R26), not here, and the generator ignores it. |
| D63 | SD8 | R5, F13 (retired tree); legacy read new, approved under the user's standing authorization of 2026-11-15 | `nextChallengeNumber` reserves every live number, every `.archive/challenge/<slug>/challenge.yaml` number, and every legacy `.archive/challenge/<slug>/index.md` frontmatter number (a retired folder may hold either or both; both count). The upgrade move (R14) does not touch `.archive/`, so without the legacy read a teacher's number retired before the move would be reissued, breaking "never reused". Retiring in the new layout = move `platform/challenge/<slug>/` to `.archive/challenge/<slug>/` and delete every brief of the slug in the same commit. |
| D64 | SD9 | R6 ("孤兒說明頁的拒絕與測試改以主語系為準"), R5; widening to (b) and to a declaration-only slug new, approved under the user's standing authorization of 2026-11-15 | The orphan-brief refusal is re-based on the primary locale and widened to the split layout: over the index trees, a brief fault is (a) `missing-primary`: a slug with a translation brief or a declaration file but no primary brief, one fault per slug, whose `present` is the first translation brief in locale-list order, or the declaration file when no brief exists; (b) `missing-declaration`: a brief with no declaration file for its slug, one fault per (slug, brief path), whose `present` is that brief. Both can hold for one slug. Old-layout paths (D69) are one fault per path. Faults are sorted by slug, then kind (W6a, W6b, W6c, W6d, S-§4.5), then `present` (UTF-16). Input and output schemas: S-§4.7. The check is one exported pure function, `briefFaults(trees, P)`, used by the hook (through the generator's `--staged` run, before it prints anything) and by CI (`redirects.test.ts`). The generator's full mode does **not** refuse kind (a) (as 0008 G6: the generator does not refuse an orphan; D58's fallback gives it rules); it refuses kind (b) as a number fault ("no declaration, so no number"). |
| D65 | SD10 | R23; mechanism new (the observable is the hook's stderr; the mechanism may change at `/tdd` without a spec change); new, approved under the user's standing authorization of 2026-11-15 | The hook knows no locale (R23). Its trigger and its untracked-directory listing use the glob pathspec `:(glob)platform/*/challenge/**` beside `platform/challenge/`; the brief check and the primary locale live in `generate-redirects.ts`, which it already calls. 0007 W4's wording, which depends on `P`, is produced by the same script in a second mode (`--describe-untracked <file> --root <top>`: reads the list the hook wrote before its stash, prints one 0007 W4 line per directory), called only when 0007 W3 fires. (Revision 2: the observable trigger set is D126's; paths under `public/`, `shared/` or an unlisted folder do not trigger.) |
| D66 | SD11 | New, approved under the user's standing authorization of 2026-11-15 | `range.json` is a watched path: a staged change to it triggers the hook, which regenerates `_redirects` (a teacher choosing the primary by hand, R13, otherwise commits a stale file that CI refuses). |
| D67 | SD12 | R17, R19; index source new, approved under the user's standing authorization of 2026-11-15 | In `--staged` mode the primary locale comes from the index's `range.json` (`git show :range.json`; not in the index → absent → `zh-TW`), never the working tree's: the hook stashes only under `platform/`, and the index is what CI and the deploy build will read. Full mode reads the working tree's file. The CI guard test reads the index's, so a local run agrees with the hook. A `range.json` error (PL-E01–PL-E06, D114) stops generation in either mode with that code's line. When the commit stages no challenge path, the hook then ends in 0007 O4 with 0007 W5 (S43); when it stages one, validation reads the same index file first and the hook ends in 0007 O3 with the PL line (D122, S76 (c)). (Revision 2 self-check, RV2-04: the qualification is D122's.) |
| D68 | SD13 | New seam; new, approved under the user's standing authorization of 2026-11-15 | `challengePagePath` is the single source of a challenge page's URL for the generator and for the copy control's page mode (`challengeLink`); `challengeLink`'s hard-coded `locale === 'zh-TW' ? '/zh-TW' : ''` goes. |
| D69 | SD14 | R28 ("各工具拿掉舊式支援"); hook refusal new (see S-O4); new, approved under the user's standing authorization of 2026-11-15 | Old-layout pages (`platform/challenge/<slug>/index.md`, `platform/challenge/<slug>.md`) are never read by these tools: not a brief, not a number source. The brief check reports each one in the index as a fault of kind `old-layout`, with the R28 build check's code and README pointer, so the hook refuses the commit before CI's `docs:build` would. |
| D70 | SD15 | Q15 | `/zh/c/NNN` and `/zh/c/:slug` stay on both primaries, never given out (Q15, 0008 F9). |
| D71 | SD16 | 0008 D6, R21 | Consequence, stated not changed: on an en-primary range `/en/c/NNN` targets the unprefixed English page, which R21 may redirect for a learner whose preference differs; 0008 D6's promise ("`/en/c/NNN` opens English for every learner") is met on a zh-TW-primary range (upstream), where it targets `/en/challenge/<slug>/`, a prefixed page R21 never redirects. README states both (S69). |
| D72 | SD17 | R30, F20 | T-0059 and T-0058 (R30): recommend stage 4 takes **T-0059 whole** (into the generator ticket) and **T-0058 whole** (as its own ticket after the hook ticket). Reasons below. |
| D73 | YD1 | R5, Q14, Q10 | One declaration per challenge at `platform/challenge/<slug>/challenge.yaml`, beside `src/` (which does not move, R3). Grammar Y-§2.1. |
| D74 | YD2 | R5, R26 | **Key partition.** A brief's frontmatter keys ⊆ `BRIEF_KEYS`; `challenge.yaml` keys ∩ `BRIEF_KEYS` = ∅. Both violations fail `challenge:validate` (R26) and the build (D78). Recommendation inside R26's wording: the brief side is closed — *any* key outside `BRIEF_KEYS`, including VitePress page keys such as `outline` or `head`, fails — because R26's move sends every non-brief key to `challenge.yaml`, so "a declaration field in the brief" and "any other key in the brief" are the same set. The declaration side stays open: unknown keys pass (today's contract, `config.test.ts` "ignores a leftover commands key rather than rejecting it"); rejecting them would fail every range whose teacher briefs carried a custom key the move put in `challenge.yaml`. Checked against R11/R15 (move output) and R26: no conflict. |
| D75 | YD3 | R26, F13 | `validateChallengeConfig` splits into `validateChallengeDeclaration` (REQUIRED `backend`, `app`; `app` must be a string — new, closes the `app.endsWith` crash on a non-string) and `validateChallengeBrief` (REQUIRED `title` as a non-empty string, `layout` equal to `challenge`; `description` a string when present). `number` stays validate's own check. `ChallengeConfig` splits into `ChallengeDeclaration` and `ChallengeBrief`. |
| D76 | YD4 | New (stage 2 brief: fate of `fs`); new, approved under the user's standing authorization of 2026-11-15 | **Retire `fs`.** Recommendation: `fs` joins `LEGACY_FIELDS`; keygen warns (K1) and deletes it on write; `validateChallengeConfig`'s `deprecated field 'fs'` warning goes; keygen's flat-structure `fs`-map branch goes with the flat layout (D81); `ChallengeLayout`'s `fm.fs` fallback for modules without `wasm_fs_list` goes, because every `runtime.wasm` is rebuilt by the current keygen from the `virtual-fs` template, which exports `wasm_fs_list`. If a loaded module lacks it, the page shows its runtime-error state naming `pnpm challenge:keygen` (Y50). README's sentence that `fs:` still works is removed. Alternative rejected: keep `fs` as a validated key — it would be the only key no tool on the new layout reads. |
| D77 | YD5 | New (stage 2 brief: fate of `id`); new, approved under the user's standing authorization of 2026-11-15 | **Drop `id` as a declaration key.** Recommendation: no upstream challenge, scaffold or skill writes it; `number` is required and is what lists sort and print; `id` only mattered for numberless challenges, which fail validation. An `id` in `challenge.yaml` is an unknown key (passed through, read by nothing); in a brief it fails D74. `ChallengeData.id` becomes the 1-based position in the shared order — the lists own that change (0010-S17, 0010-S18) and 0008's S4 contract "`id` is the English brief's frontmatter `id`" is overridden ("Overridden contracts › Area Y"). Alternative: the lists read `id` from `challenge.yaml` (0010-S17); costs one more declaration reader for no visible behaviour. |
| D78 | YD6 | R26 | **Assembly at build time.** `transformPageData` decides by the page's *source* path (`pageData.filePath`, F12; never `relativePath`, which `rewrites` changes): a source path `<L>/challenge/<slug>/index.md` with `L` on the locale list is a brief path. Brief path + `layout: challenge` → read `challenge.yaml` (0010-S32), check PL-E13–PL-E16, assemble (brief ∪ declaration ∪ `markdownBody` read from `filePath`). Brief path without `layout: challenge` → PL-E17. `layout: challenge` on any other source path → PL-E18. Anything else is untouched. The build checks only what makes assembly well-defined; schema errors (an invalid `backend`, a bad `tools` entry) are `challenge:validate`'s, which CI already runs (`quality-gates.yml`), so the build stays as tolerant as today's `ChallengeLayout` of raw values. Every BD message starts with its code and names the file (R19's convention). |
| D79 | YD7 | New, approved under the user's standing authorization of 2026-11-15 | One parser: `yaml` `parse`/`parseDocument` (core schema) in the build, scripts and loaders, so `date` is the same string everywhere. Today the page frontmatter (gray-matter) turns it into a `Date`; `ChallengeLayout` never reads `date`, and `ChallengeList` accepts both. |
| D80 | YD8 | R27, R15 | **keygen.** Writes `wasmModule` into `challenge.yaml` (and deletes `LEGACY_FIELDS` + `fs`) through `parseDocument` → `toString({ lineWidth: 0 })`; never writes a brief. `getTrackedInputPaths` tracks `challenge.yaml`, the template module, `src/.fsignore` and every scanned `src/` file — no brief in any locale. new guarantees, both recommended: (a) keygen writes `challenge.yaml` only when the bytes change, so a build leaves upstream's four files byte-identical (R15 needs "new layout = transform(previous)" to hold after a build too); (b) a keygen run right after a run that rebuilt a challenge, with no file changed in between, reports `[skip]` for it (the implementation picks the means: write order or the module's mtime). (b) may change today's behaviour — today `index.md` is written after `runtime.wasm`, which plausibly makes every next run stale; stage 5 measures it first (Y-O5). (Revision 2: if (b) cannot hold, D133.) |
| D81 | YD9 | R28, F13 | Every tool finds a challenge by its challenge directory. Flat `platform/challenge/<slug>.md` support is removed from validate, analyze, keygen, lint-staged and `create:challenge`'s collision check; the layout check (0010-S2, PL-E08) makes such a file fail the build with the move-document pointer. The `challenge:validate` command runs the layout check first (D19), which reports legacy-layout pages with PL-E08, and `validateChallenge` reports a page left in a challenge directory through the structure check (D117, VM13), so a commit is stopped before the build is (lint-staged runs `validateChallenge`; the hook does not build). `src/**/*.md` is never a legacy-layout page. |
| D82 | YD10 | Q17, R13, R17 | `create:challenge` writes the primary brief `platform/<P>/challenge/<slug>/index.md`, `challenge.yaml` and `src/`; `P` from `readPrimaryLocale` (0010-S1) (no `range.json`, or no `primaryLocale` key → `zh-TW`). An unusable `range.json` → status 1 with `readPrimaryLocale`'s PL-E01–PL-E06 first line, nothing written (0007 D13: status 1 always means nothing was written). A tree in the legacy layout → status 1 with the PL-E08 first line and its list (`checkSourceLayout`, D19), nothing written, so the tool never writes new-layout files and a `_redirects` that ignores the legacy briefs (D69) into a half-moved tree (Y105). Order: arguments → primary locale → layout check → collision → number → write. |
| D83 | YD11 | New (stage 2 brief: scaffold language follows `P`); new, approved under the user's standing authorization of 2026-11-15 | Scaffold text is a table `SCAFFOLD_TEXT: Record<Locale, { title(slug), body }>` keyed by the `Locale` type of the locale list module (D4), so adding a locale to the list does not type-check until it has scaffold text. Recommendation: `en` → title = slug in Title Case, body `TODO: Write challenge description here.` (unchanged); `zh-TW` → title `未命名題目（<slug>）`, body `TODO：在這裡寫說明頁內文。` (D137). Both bodies keep the literal `TODO` so wxl-create's "no TODO placeholder left" check stays locale-independent. `--title` is used verbatim whatever `P` is. A slug cannot be translated, so the zh-TW default is an explicit placeholder that still differs per challenge in the list. |
| D84 | YD12 | New (stage 2 brief: collision covers `challenge.yaml` and every locale's brief); new, approved under the user's standing authorization of 2026-11-15 | Collision = the challenge directory exists (any content: only `src/`, only `challenge.yaml`, …) **or** `platform/<L>/challenge/<slug>/` exists for any `L` on the locale list (primary or not, so an orphan translation collides). Recommendation: test the directories, not just `index.md`, because `mkdirSync(..., { recursive: true })` over an existing `src/` would overwrite `src/<app>` today. Legacy flat files and `.archive/challenge/<slug>/` are not checked (Y-O11). |
| D85 | YD13 | New (stage 2 brief: L4 brief); new, approved under the user's standing authorization of 2026-11-15 | **The L4 player package reads the primary brief.** Recommendation: Q2 guarantees only the primary brief exists, and `challenge-verify-blind`'s default target `http://localhost:5173/challenge/<slug>/` is the primary page, so description and target agree. Alternative rejected: always English — a zh-TW-primary range need not have one. |
| D86 | YD14 | New (follows R26 + Q2); new, approved under the user's standing authorization of 2026-11-15 | `challenge:validate` validates the declaration once and every brief that exists in a listed locale (check label `brief (<L>)`), and fails when the primary brief is missing (VM10). Discovery = every directory under `platform/challenge/` ∪ every slug with a brief under a listed locale's `challenge/`, so a brief without a declaration and a declaration without a primary brief are both reported. A folder not on the locale list is the build's layout failure (D4, D6, R6); validate ignores it. |
| D87 | YD15 | New, approved under the user's standing authorization of 2026-11-15 | **Dev server.** VitePress caches a page's rendered result by the Markdown source (`createMarkdownToVueRenderFn`'s cache key is `{ src, ts, relativePath }`), so an edit to `challenge.yaml` alone is not seen by a running dev server. Recommendation: accept and document — restart `pnpm dev`, which also re-runs keygen, so the declaration and `runtime.wasm` change together (a dev-server-only reload would show a new `source_visible` over an old module). Stated in CONTRIBUTE, wxl-create Step 6 and wxl-verify. Precedent: 0008 P5. |
| D88 | YD17 | R13 (paths only) | wxl-create, wxl-mutate, wxl-verify change paths and the file each field lives in; this epic's change to each skill file is the same in both trees (`.claude/`, `.agents/`, D135). wxl-create takes the brief path from `create:challenge`'s first scaffold line instead of recomputing `P`; its canonical prose reference becomes the `door-is-open` brief in the same locale folder. |
| D89 | YD18 | New, approved under the user's standing authorization of 2026-11-15 | `challenge:analyze` takes `title` from the primary brief (falling back to the slug, as today when `title` is absent) and every other field from `challenge.yaml`. |
| D90 | YD19 | R26, F13 | `retype` reads and writes `challenge.yaml` only; no brief in any locale changes. This removes today's drift where the zh-TW brief kept old `backend`/`difficulty`/`tags`/`category` after a retype. |
| D91 | UD1 | R10 | The move is decided by content: the teacher's range is moved when its tracked paths or its disk walk (U-§4) hold a legacy page; B is moved when B holds one. Never by version, and `--from <version>` / `--from <commit>` alike |
| D92 | UD2 | F9; R10 | Every check that ends a run before step 7's download (UP-I01, UP-E07, UP-E10 in step 6) or after it (step 7's repeated checks) ends it before any move: a range whose base and target versions are equal without `CREATE_WXL_COMMIT`, or whose base commit equals the target commit, is not moved even if it holds legacy pages. Stated in the spec and in README's move section; the R12 build check is what tells such a teacher |
| D93 | UD3 | R14, F8 | B is transformed physically in its own temporary directory, at the end of step 7, after both pristine ranges are built and before checkpoint `step-8`. The teacher's range is transformed in memory in step 8 (the move plan) and written in step 9 by deleting each `from` and writing each `to`. Nothing is staged; "Steps 1–8 write nothing in the range" stays true (so 0006's Further Notes' prediction that it would be revised is superseded) |
| D94 | UD4 | R14, F8 | The merge runs on B′, o′ and T. The pre-checks P-1–P-10 and the parent check run unchanged on disk; only o is read through the move plan (o′). Final ops: every move op, except that a merge op at the same path replaces it (a merge write's content wins; an 0006 M6 at a destination drops the move op's write and adds no disk delete). A pre-check or row that leaves "o as it is" leaves the move op standing |
| D95 | UD5 | R15 | The transform changes paths and splits front matter only (R11, R26). Lines keep their bytes and endings; groups keep their order; the body after the closing fence is unchanged; a BOM stays in the brief and is not copied to `challenge.yaml`. Relative links, `./shared/` imports and every other difference are left to the three-way merge |
| D96 | UD6 | R14; new (below); new, approved under the user's standing authorization of 2026-11-15 | Stop conditions, all before step 9 writes anything, code UP-E14 with a side (`range`, `base`, `target`) and a token: `target-exists`, `symlink`, `ignored`, `submodule`, `alias`, `new-ignored` (R14), and new: `frontmatter`, `orphan-brief`, `legacy-brief`, `target-layout`. Every failing path of the first side that fails is printed, one line each, sorted by path then by the token order of U-§4; the sides are checked in the order target (7a), base (7b), range (8a), and a side that fails ends the run, so a later side's failures are not collected (U148) |
| D97 | UD7 | New, approved under the user's standing authorization of 2026-11-15 | New. A brief whose front matter is not splittable stops the run (`frontmatter`) instead of being moved unsplit. Recommendation: stop. Reason: an unsplit brief fails the build area's R26 validation anyway, and stopping keeps "nothing written" |
| D98 | UD8 | New, approved under the user's standing authorization of 2026-11-15 | New. A translation brief whose slug has no legacy English brief (`platform/challenge/<slug>/index.md`), no declaration file (`platform/challenge/<slug>/challenge.yaml`) and no new-layout English brief (`platform/en/challenge/<slug>/index.md`) in the same tree stops the run (`orphan-brief`). A translation brief whose slug has a declaration file or a new-layout English brief is already in the new layout and is left untouched (no `strip`, no failure), so a new-layout range holding one stray legacy page is moved by that page alone (U3, U146). Recommendation: stop. Reason: the pre-commit hook already refuses such a brief (D12 of 0008's hook), the old build cannot have built it, and R11 has no English declaration to write |
| D99 | UD9 | New, from R28; new, approved under the user's standing authorization of 2026-11-15 | New. A legacy single-file brief `platform/challenge/<name>.md` stops the run (`legacy-brief`), naming `git mv` to `platform/challenge/<name>/index.md`. Recommendation: stop. Reason: R28 drops the single-file form from every tool; no ≥3.0.0 `create:challenge` writes it (`create-challenge.ts` writes `<slug>/index.md`) |
| D100 | UD10 | New, approved under the user's standing authorization of 2026-11-15 | New. A target in the legacy layout (only reachable with `CREATE_WXL_COMMIT` naming an old commit) stops the run at step 7 (`target-layout`, side `target`). Recommendation: stop. Reason: moving the range while T keeps the old layout would re-add every old page (0006 M5) and delete the moved ones (0006 M6) |
| D101 | UD11 | R13 "英文頁", R3, F8 recheck | Only pages move. Files that are not pages (D117's structure check names any left in a challenge directory; assets beside a page, `platform/public/**`, `platform/shared/**`, `platform/postcss.config.mjs`, `platform/challenge/<slug>/src/**`) stay where they are |
| D102 | UD12 | New (0006 M5 says new files take t's bit; a moved file is the teacher's); new, approved under the user's standing authorization of 2026-11-15 | A moved file takes its source's permission bits (`lstat` mode & 0o777); a declaration file is created like a new non-executable file (`writeFile`'s default under the process umask); a translation brief keeps its own mode (0006's "existing ones keep their mode") |
| D103 | UD13 | 0006 C-4 | Directories emptied by the move's deletions are left in place, as 0006 M6 leaves them (0006 round 2, C-4) |
| D104 | UD14 | R11, R16, F10 | Mismatches are reported only when introduced (R16): attention code UP-A16, one report R3 line per (translation brief, key). The English value is always the one in `challenge.yaml` (R11); for selected-excerpts the base's own `source_files` mismatch is not reported |
| D105 | UD15 | New (R11, R18, R17); new, approved under the user's standing authorization of 2026-11-15 | New refinement of R11/R18 for a case stage 1 did not separate. `primaryLocale: "en"` is appended only in a crossing run (B in the legacy layout) in which the teacher's range is moved (it held a legacy page, D91), and only when `primaryLocale` is not an own key. Such a range was built by legacy code, which serves English at the root, so `en` keeps its root language. A run where the teacher's range is not moved does not write it, whether B is legacy (U2: the teacher moved by hand) or not (U3, U9): that range already builds under the new layout with its recorded value or R17's zh-TW, and writing `en` would change its root locale. A new-layout range holding a stray legacy page does not build (PL-E08), so recording `en` for it changes no root language it serves. Recommendation: this rule. Mutual exclusion checked: Q12 ("keep the teacher's value") holds in every case; R17 keeps meaning; GLOSSARY's working-tree 搬家 sentence 「經由升級搬家、而且還沒記主語系的靶場記成英文」 must say that only a range still on the legacy layout, upgraded from a legacy-layout upstream version, records it; 設定紀錄's working-tree sentence 「從舊版面的上游版本升級而搬家、而且還沒有記主語系的靶場，會記成英文」 already says so (N17, U135; requoted in revision 2 from `GLOSSARY.md` blob `b307335`, C-16, K-3) |
| D106 | UD16 | R14, R24; new (placement); new, approved under the user's standing authorization of 2026-11-15 | Report: move ops are not counted in report R2 and their `from` paths are not report R2 deleted lines. Merge ops at a destination count as 0006 says, with o′'s presence deciding updated vs added. A new entry report R6 lists the moves, printed after report R5 so report R1–R5 keep their order and existing runs print exactly as before. report R4 gains one line in a crossing run whose report R3 holds UP-A12 (R24's "the report says it is expected") |
| D107 | UD17 | R24, F7 | `ANCHOR_PATHS` (`merge-plan.mjs`) becomes `package.json`, `README.md`, `README.en.md`, `CONTRIBUTE.md`, `.vitepress/config.mts`, `.vitepress/challenge/shortLink.ts`, `platform/en/index.md`, `platform/zh-TW/index.md`, `scripts/templates/deploy.yml.template`, compared on B′ and T. fork:init's `PLATFORM_HOME_RELS` becomes `['platform/en/index.md', 'platform/zh-TW/index.md']`. A crossing run always gives UP-A12 (the layout epic changes `config.mts`), expected (R24) |
| D108 | UD18 | R15, F11 | Upstream's one-time move is produced by running `planLayoutMove` on its own tree. A test proves, for every path the transform outputs from the base tag's `platform/`, that the compared tree's file is byte-identical, except paths in the test's own exception table (path → the row that edits it). The base tag is the newest `v*` tag (by semantic version) whose tree holds `platform/index.md`, the last legacy release: `v3.1.1` at `65de8c0` (`platform/` is unchanged from `v3.1.1` to `65de8c0`), and the test asserts that no newer `v*` tag is in the legacy layout (U130), so a legacy release tagged before the switch lands is the one compared; stage 4 re-checks it. The compared tree is the oldest `v*` tag whose tree holds `platform/en/index.md` once one exists, and the working tree until then, chosen by the test itself, so no later ticket switches it and later page edits never break it; R15's rule ("the first new-layout release equals the transform of the one before") is exactly what it then checks. The exception table equals U-§5 at this epic's close-out; a ticket after the epic and before the first new-layout release that edits a moved page adds its own entry naming its ticket. The test decides "upstream" with `tests/__helpers__/upstreamDecision.ts`, as D52 does, and reports skipped in a range or a fork (which has no such tag and whose tree the teacher edits); on upstream a missing tag fails it, and `WXL_EXPECT_UPSTREAM` makes a wrong "not upstream" decision fail, as for `upstream-guard.test.ts` (U139) (Revision 2: every addition to the exception table needs the user's approval, D130.) |
| D109 | UD19 | New, approved under the user's standing authorization of 2026-11-15 | New. No UP-I02. A range that D92 leaves unmoved learns of its legacy pages from the R12 build check, whose message points at README's move section. Recommendation: none added; alternative in U-O5 |
| D110 | UD20 | F8 recheck (create-wxl dependencies) | The yaml parse uses create-wxl's existing dependency `yaml` (2.9.0) with default options: duplicate keys are an error, `maxAliasCount` 100 bounds alias expansion |
| D111 | UD21 | R2, R31, F25 | Stage 8 follows R2: a range made by the published `create-wxl@3.0.0` plus a teacher's own challenge, and a fork without `range.json` (R12's manual steps, and `--from`), with a local tarball packed from the pushed ticket HEAD A and `CREATE_WXL_COMMIT=<A>`. Publishing is not part of the epic (R31); `pnpm range:upgrade` through the registry is checked after a release, outside this epic |
| D112 | UD22 | R23's pattern | create-wxl keeps a literal copy of the locale list (`['en', 'zh-TW']`) in `layout-move.mjs`; a create-wxl test reads the site's module source and requires equality (U133) |
| D113 | integration | R19 (code convention); new, approved under the user's standing authorization of 2026-11-15 | **One code family for build failures.** Every failure this epic adds to the VitePress build is a layout error `PL-E01`…`PL-E18`, one error class (`SiteLayoutError`, `code` property), message first line `<code>: …`. The declaration checks are PL-E13–PL-E18 (the fragment's provisional BD-01–BD-06). The tools that read `range.json` (generator, hook, `create:challenge`, validate, keygen, analyze, verify L1 and L2, `challenge-lint-staged`, the L4 package) report its failures with the same PL-E01–PL-E06 lines, read first (D123). The hook's W6d and the layout check share one message builder for PL-E08. |
| D114 | integration | R17, R19; new, approved under the user's standing authorization of 2026-11-15 | **Two layers for reading `range.json`.** `parsePrimaryLocale(text: string \| undefined)` is pure: `undefined` (no file) and an object without an own `primaryLocale` give `zh-TW`; otherwise PL-E03–PL-E06. `readPrimaryLocale(path)` does the `lstat` and the read (PL-E01, PL-E02) and calls it. The hook's `--staged` mode reads the index: no index entry → `undefined`; an entry whose mode is not a regular file (`120000`, `160000`) → PL-E01; `git show :range.json` failing otherwise → PL-E02 with `unknown`. |
| D115 | integration (S-O3) | R23; new, approved under the user's standing authorization of 2026-11-15 | The locale list module also exports `LOCALE_ENGLISH_NAMES` (`en` → `English`, `zh-TW` → `Traditional Chinese`), total over `LOCALES`, for tool messages (W4b, W6a–W6c, the `_redirects` comments K4). Interface strings never use it. |
| D116 | integration (U-O1) | R12, R28; new, approved under the user's standing authorization of 2026-11-15 | **One page predicate.** "Page" and "excluded area" (vocabulary) are defined once. The layout check exports `classifySourcePath(sourcePath, primary)` → `excluded` \| `locale-page` \| `outside`; create-wxl's move keeps a literal copy (`isLegacyPage`) and a create-wxl test runs both over one shared path table (U136), as D112 does for the locale list. The upgrade's disk walk and its gitlink scan skip exactly what `isLegacyPage`'s classification calls excluded or a locale-folder path (U-§4 "Discovery", U144). (Revision 2: D125 adds a targeted `lstat` of the translation brief paths the transform needs, and D139 reads a page only when it is a regular file.) |
| D117 | integration (B-O7, U-O3) | R12 ("`platform/challenge/<slug>/` 只能有 `src/` 與 `challenge.yaml`"); new, approved under the user's standing authorization of 2026-11-15 | `challenge:validate` fails a challenge directory holding any entry other than `src/`, `challenge.yaml` and dot-prefixed names (check `structure`, message VM13). The build rejects only pages there (PL-E08); the upgrade's move does not stop on such files (D101), so after a move CI's validate names them. |
| D118 | integration (S-O1) | R22; new, approved under the user's standing authorization of 2026-11-15 | **The old-address rule is R22's one splat, gated.** `/zh-TW/*  /:splat  302` is written as R22 says. Its target starts with request text, so it could answer `/zh-TW//evil.example` with a protocol-relative `Location` unless Cloudflare normalises the path. Row S61 is a stage 8 gate of the ticket that adds the rule, and that ticket's stage 7 examines it. If S61 fails, the ticket stops at stage 8 and the user chooses between R22 as written and the form that is safe by construction (one `/zh-TW/<entry>/*  /<entry>/:splat` rule per top-level directory of the primary folder, plus one static rule per top-level page and `/zh-TW/  /`); no rule is changed without that choice. |
| D119 | integration | R2, 0008 D9, 0008 D12; new, approved under the user's standing authorization of 2026-11-15 | **One set of stage 8 fixtures** (section "Stage 8 plan"): `stage8/<ticket-id>` (upstream, `P = zh-TW`, plus challenge `zh-only` #999 with only a Traditional Chinese brief and article `platform/en/stage8-en-only.md`), `stage8/<ticket-id>-en` (upstream plus `range.json` `{"primaryLocale":"en"}` and challenge `en-only` #998 with only an English brief), the temporary GitHub Pages range created from `stage8/<ticket-id>`'s pushed head with a create-wxl tarball packed from that head and `CREATE_WXL_COMMIT` naming it, as V-U1 does, the upgraded range `rel` and the fork `fork` (V-U1, V-U4), and the local clone of V-Y rows. Fixture numbers never enter `main`. |
| D120 | integration (S-O5) | R14, R24; new, approved under the user's standing authorization of 2026-11-15 | A crossing run's report adds `R4: run pnpm redirects:generate, since _redirects follows the range's primary locale` (zh-TW: `R4: 執行 pnpm redirects:generate，因為 _redirects 依靶場的主語系產生`) before `R4: build and test`, because the merged `_redirects` follows upstream's primary locale (`zh-TW`, with the old-address rule) while the moved range records `en`. Runs that are not crossing print exactly what they printed. |
| D121 | integration (S-O8, S-O9, Y-O8) | R6, R26; new, approved under the user's standing authorization of 2026-11-15 | **Who refuses a brief fault at commit time.** The hook's order is unchanged: validation (D86, through `challenge-lint-staged`, which now receives brief paths, Y88) runs before the generator. A fault the commit stages is refused by validation (0007 O3, the validator's message: VM1, VM10 or VM13, or, when the index's `range.json` is unusable, that reason's PL-E01–PL-E06 first line, D122; RV2-04). The generator's `briefFaults` (W6a–W6d, 0007 O4) refuses a fault the index holds that validation did not see, such as one already in `HEAD`. Rows S44 and S73 pin both. |
| D122 | rev 2 (C-2, R-4) | D67, D114, D121; new, approved under the user's standing authorization of 2026-11-15 | **Commit-time validation reads the index's primary locale.** `challenge-lint-staged`, the validation the hook runs (D121), takes `P` from the index's `range.json` through D114's index read (no entry → `zh-TW`; mode `120000` or `160000` → PL-E01; a failing `git show :range.json` → PL-E02 `unknown`), exactly as the generator's `--staged` mode does (D67), so validation and the brief check judge one commit with one `P`. A `range.json` failure ends validation with that code's first line: a commit that stages a challenge path and an unusable `range.json` ends in 0007 O3 with the PL line (validation runs first, D121), and one that stages no challenge path ends in 0007 O4 with 0007 W5, as S43 states. Replaces D67's last sentence for a commit that stages a challenge path (D67 carries the qualification, RV2-04). The `challenge:validate` command, verify L1 and every other tool keep reading the working tree's file. No environment variable or option carries `P` (D21). Rows S42, S76. |
| D123 | rev 2 (C-3) | D5, D19, D82, D113; new, approved under the user's standing authorization of 2026-11-15 | **Every reader of `range.json` reads it first.** Each tool that needs `P` — the generator (both modes), the `challenge:validate` command, verify L1 and L2, keygen, analyze, `challenge-lint-staged` (D122), `buildPlayerPackage` and `create:challenge` — reads it before the layout check and before any challenge, so PL-E01–PL-E06 come before PL-E07–PL-E10 for every tool, as for the build (D5) and `create:challenge` (D82). D19's "calls it first" means first after reading `P`, which `checkSourceLayout(srcDir, primary)` needs. An unusable `range.json` ends the tool with that code's first line as stderr's first line and exit status 1, before any challenge is processed and with nothing written; verify L1 and L2 report `status: 'fail'` with that line as the reason (keygen not spawned); `buildPlayerPackage` throws the `SiteLayoutError`. Rows Y107–Y110 (and Y36, Y73, S10, S11, S43, S76 for the others). |
| D124 | rev 2 (C-6) | D52, D54, D108; new, approved under the user's standing authorization of 2026-11-15 | **Rows on upstream's own content are upstream-only.** A test that asserts on upstream's own tree or built site decides "upstream" with `tests/__helpers__/upstreamDecision.ts` (`realUpstreamDecision` in the site-smoke suite, as its S08 case does) and reports skipped, with the decision's reason, in a range or a fork, where the teacher edits the tree and may set `P = en`: the shipped `"zh-TW"` and the `zh-TW` column on the real tree (B14, B40, B47), upstream's built files and pages (B44, B48, B59, B70, B79's smoke part: the English list at `/en/challenges` rendering upstream's four challenges, B81), the four `challenge.yaml` files equal to Y-§2.4 (Y1, Y55), the upstream briefs (Y22) and upstream's own page files (B78, L40, L41). Each of them is declared through one helper exported by `tests/__helpers__/upstreamDecision.ts` (its name chosen at `/tdd`) that takes the decision's inputs and returns nothing on upstream or the skip reason otherwise; a vitest row passes the reason to `it.skipIf` or `describe.skipIf`, a Playwright row to `test.skip(condition, reason)` (RV2-07). Upstream's CI cannot skip them silently: the `test` job sets `WXL_EXPECT_UPSTREAM`, and its existing expectation check (`upstream-guard.test.ts`, run when the variable is set) fails when the variable is `true` and the decision false; the `site-smoke` job does not set it and reads the same decision, which in CI `GITHUB_REPOSITORY` alone decides, so no workflow and no `upstream-only-jobs.test.ts` case changes (RV2-06). Every other test that reads the real tree derives what it expects from `P` and the tree it runs on (D54), so it passes in a range. Stage 6 checks that every real-tree test is one of the two (B93). CI's `test` and `site-smoke` jobs run in every range (only `fork-init-cross-os` is gated on the repository), so D54's claim is observed in a range at stage 8 (V-B7); A-O5 is restated accordingly. |
| D125 | rev 2 (C-4) | D116, RC1, RC4; new, approved under the user's standing authorization of 2026-11-15 | **Discovery looks at the translation briefs the transform needs.** Besides the walk, which still skips the excluded areas and the locale folder paths (D116), 8a checks, for every slug with an English brief in the teacher's range and every listed locale `L` other than `en`, the path `platform/<L>/challenge/<slug>/index.md` by `lstat`: when the path or a parent inside the range (`platform` itself included, as RC1 and D139 say; RV2-16) is a symbolic link → token `symlink`; when it exists, is not tracked and `git check-ignore -q --no-index` reports it ignored → token `ignored`. A translation brief the transform would have to strip but cannot see (git tracks only a link above it, or ignores it) therefore stops the run instead of surviving unstripped into a PL-E15 build. Each failure line names the checked brief path, whichever parent is the link, as every UP-E14 line names its path (D96); lines are one per (path, token), so a path RC1 also finds `symlink` is printed once, and a linked `platform/zh-TW` above three slugs' briefs gives three lines (RV2-15). Rows U51, U53, U153. |
| D126 | rev 2 (C-8, K-6, R-6) | D65, 0007 "watched trees" as amended (Area S contracts); new, approved under the user's standing authorization of 2026-11-15 | **The hook triggers exactly on the listed locales' challenge paths.** The trigger set is: staged paths under `platform/challenge/`, under `platform/<L>/challenge/` for `L` on the locale list, `platform/public/_redirects` and `range.json`. A commit whose staged changes lie only under `platform/public/challenge/`, `platform/shared/challenge/` or `platform/<x>/challenge/` for an `x` off the list (`ja`, `constructor`, `__proto__`) ends in 0007 O1, and such paths never reach validation or 0007 W4, so W4b's `<L-name>` is always a `LOCALE_ENGLISH_NAMES` value. The hook still knows no locale (R23): the list comes from Node, and the mechanism stays `/tdd`'s (D65). A page in a folder off the list is the build's PL-E08 (the constraint paragraph above T1 says so). Replaces D65's "the glob pathspec `:(glob)platform/*/challenge/**`" as the observable trigger. Rows S36, S37, S80. |
| D127 | rev 2 (C-9) | B-O10, D84, D86; new, approved under the user's standing authorization of 2026-11-15 | **Only `index.md` is a brief.** In `platform/<L>/challenge/<slug>/` only `index.md` is a brief; other files there (images the brief uses, another page such as `hints.md`, B-O10) are not. `deriveSlugs`, `indexTrees`, `briefFaults`, validate's discovery (D86) and the hook's 0007 W4 listing treat a slug folder without `index.md` as no slug; another page there is an ordinary locale page (published; PL-E18 if it sets `layout: challenge`). S32's target check requires the primary challenge folder to hold at least one slug directory with `index.md` and ignores a directory without one. `create:challenge`'s collision still tests the directory (D84). Rows S32, Y111. |
| D128 | rev 2 (C-14) | A29, D44, D47; new, approved under the user's standing authorization of 2026-11-15 | **Other components' server-rendered strings are out of scope.** Components outside the lists and the home page that use `$t` (`FlagSubmit` and the rest of the challenge layout, the guide pages' components) keep server rendering in the `createI18n` default `en` (A29) and show the page locale after hydration, as `/zh-TW/` pages do today; under `P = zh-TW` this now also affects root pages. Widening T-0060 to every component is not this epic's (Out of Scope); an open question is recorded at close-out (B88). |
| D129 | rev 2 (C-17) | D79, D110; new, approved under the user's standing authorization of 2026-11-15 | **How a declaration is parsed.** `readChallengeDeclaration` parses with `yaml`'s `parseDocument(src, { schema: 'core', merge: false, uniqueKeys: true })` and converts with `doc.toJS({ maxAliasCount: 100 })` (`maxAliasCount` is a `toJS` option; with `yaml` 2.9.0 `parseDocument` reports neither an over-limit expansion nor an alias without its anchor in `errors` or `warnings`, and `toJS` throws a `ReferenceError` for both; RV2-11): any `doc.errors` entry (a duplicate key, a syntax error), any `doc.warnings` entry (an unresolved tag such as `!foo`) and any exception `toJS` throws (an alias expansion over the limit, an alias whose anchor is not set before it) give `invalid-yaml`; aliases within the limit are resolved; `<<` is an ordinary key, so it is an unknown key passed through; YAML 1.1 forms such as `yes` and `on` are strings. The brief keeps VitePress's frontmatter parse in the build (PL-E15 on its keys) and `yaml` in validate (VM6, VM15); a brief using `<<` fails validate with VM6, so CI refuses it whichever way the build reads it. VitePress parses frontmatter with gray-matter's js-yaml 3 `safeLoad`, which merges `<<`; that is the only way the two parsers' key sets differ, and validate refuses every brief key outside title, description and layout (VM6), so any difference is refused in CI; a duplicate key is an error in both (VM15 in validate) (SC2-10). The root's and create-wxl's `yaml` versions are not aligned (declined in the disposition). Row Y112. |
| D130 | rev 2 (V-9) | D108, U-§5; new, approved under the user's standing authorization of 2026-11-15 | **Adding an equality exception needs the user.** A path is added to U-§5 (in this epic) or to the test's exception table (after it, D108) only with the user's approval, recorded in that ticket's stage 6 disposition together with the row or ticket that edits the path; at the close-out the test's table still equals U-§5 (AC-53). |
| D131 | rev 2 (V-10) | D40, L32, L45; new, approved under the user's standing authorization of 2026-11-15 | **LW1 once per component instance.** The warning is emitted once in each `ChallengeList` and `HomeContent` instance's `setup` when `lists` is `undefined`, never on a re-render: server rendering prints it once per page and component, the browser once per mount. Replaces D40's "once per render". |
| D132 | rev 2 (V-12) | D4; new, approved under the user's standing authorization of 2026-11-15 | **What counts as a locale enumeration.** Under D4 an enumeration is a literal naming two or more locale codes as a set: an array or a union of code literals, or a comparison chain against two codes. A table keyed by locale code whose declared type is `Record<Locale, …>` (or that `satisfies Record<Locale, …>`) is not one, because adding a code to the list fails its type check until it has an entry: the message map, D8's locales table, D34's label table, `LOCALE_ENGLISH_NAMES`, `SCAFFOLD_TEXT`. One code alone (`createI18n`'s default, a `localesConfig('en')` call) is not one. A comparison chain is two comparisons against two codes joined by `\|\|` (today's `isKnownLocale`). B18 checks both (PAT1): PAT1 finds an enumeration written on one line, in either quote and either order; one written across lines or built another way is found by stage 6's reading of the changed files (revision 2 self-check, RV2-08, SC2-05). |
| D133 | rev 2 (V-22) | D80 (b), Y58, Y-O5; new, approved under the user's standing authorization of 2026-11-15 | **If keygen cannot converge.** When stage 5's measurement (Y-O5) shows that D80 (b) cannot hold through write order or the module's mtime, the ticket stops before Y58's test is written and the user chooses another means or drops (b); AC-39's "converges" is never weakened inside the ticket. |
| D134 | rev 2 (K-12) | D55, `docs/agents/issue-tracker.md` statuses; new, approved under the user's standing authorization of 2026-11-15 | **T-0060's status.** `/to-tickets` records in T-0060's Comments which ticket replaces it and rewrites its `revisit_when` to name that ticket (the user approves both with the stage 4 breakdown). T-0060 stays `pending` until that ticket lands: it is paused by the user's 2026-11-06 decision to take it into this epic. When the replacing ticket lands on `main`, the agent sets T-0060 to `done` after the merge, as the tracker's `done` row says (its scope landed, through the replacement), keeps `pending_reason`, `pending_evidence`, `pending_on` and `revisit_when` as history, and adds a Comments entry naming the landing ticket and the date (revision 2 self-check, RV2-14). A ticket stage 4 declines (T7) is the user's decision and is `pending` with a new `revisit_when`, as the tracker defines. Replaces D55's status sentence. |
| D135 | rev 2 (K-13) | D88, `docs/agents/runtime.md`; new, approved under the user's standing authorization of 2026-11-15 | **Skill trees change alike.** For each of wxl-create, wxl-mutate and wxl-verify, this epic's change to a skill file is the same in both trees: the lines it removes and adds under `.claude/skills/<skill>/` equal those under `.agents/skills/<skill>/` (PAT6: per ticket that changes a file of these skills, from the ticket's merge base with `main` to its head, each tree's `git diff` reduced to its removed and added lines, without the `---` and `+++` headers and without `.agents/skills/<skill>/agents/`, compares equal; RV2-09). Differences between the trees that predate the epic, or that a later vendor tuning adds, are allowed. Replaces D88's "stay byte-identical". |
| D136 | rev 2 (K-14) | D21, B-O2, `tests/__helpers__/upstreamDecision.ts`; new, approved under the user's standing authorization of 2026-11-15 | **A future `en` CI leg uses a fixture tree.** D21's deferred `en` CI leg (B-O2) would build a copy of the tree with its own `range.json`, as stage 8's F-2 does, never add a root `range.json` to upstream's checkout: in CI `GITHUB_REPOSITORY` alone decides the upstream decision (`isUpstreamDecision` ignores `hasRangeJson` when it is set), so upstream would still be called upstream and the upstream-only rows (D124) would run under `P = en` and fail; only a local run without `GITHUB_REPOSITORY` would call that tree a range (revision 2 self-check, RV2-05). B88's open question records the fixture-copy design (it quotes no reason). Replaces D21's last clause. |
| D137 | rev 2 (K-15) | D83, GLOSSARY 委託書 and 說明頁; new, approved under the user's standing authorization of 2026-11-15 | **The Traditional Chinese scaffold body.** `SCAFFOLD_TEXT['zh-TW'].body` is `TODO：在這裡寫說明頁內文。`: the glossary reserves 題目說明 for the page's left column (_Avoid_), and 委託書 is declared `_新造詞_` (GLOSSARY 委託書), so a range's committed scaffold holding 委託書 would fail `glossary.test.ts`'s "does not declare itself new while already in use" case, which reads every `.md` under `platform/`; 說明頁 is already in the corpus and not declared new, so the scaffold never touches the glossary rule and GLOSSARY's 「題目頁本身從不自稱委託書」 stays true (revision 2 self-check, RV2-02). The literal `TODO` stays. Replaces D83's `TODO：在這裡寫題目說明。` and revision 2's `TODO：在這裡寫委託書。`. Row Y78. |
| D138 | rev 2 (R-5) | D28, D29, A17; new, approved under the user's standing authorization of 2026-11-15 | **Double prefixes diverge by host when `P = zh-TW`, accepted.** The old-address rule exists only when `P = zh-TW` (S-§4.1). On Cloudflare Pages it answers `/zh-TW/en/x` with 302 `/en/x`, a cold load of the translation page that writes `en` when the page is published (D26), and `/zh-TW/zh-TW/x` with 302 `/zh-TW/x`, which the same rule sends on to `/x` (two hops, a primary-locale cold load); on GitHub Pages both end on the not-found page (A17). When `P = en` there is no such rule (S-§4.2), so `/en/zh-TW/x` and `/en/en/x` end on the not-found page and its lookup on both hosts alike (A17; RV2-12). Accepted beside D29: the lookup is unchanged, and opening `/<T>/x` directly gives the same write. S60 records Cloudflare's answers. |
| D139 | rev 2 (R-7) | 8a, RC1, TB11; new, approved under the user's standing authorization of 2026-11-15 | **The move reads only regular files.** 8a reads a page's content only after `lstat` reports a regular file. A page path that is a symbolic link, or has one as a parent inside the range, is not read and fails `symlink`; any other kind at a page path (a FIFO, a device, a directory) is not read and ends the run with UP-E11 naming the path, before step 9. So no tracked link can point the transform at `/dev/zero`, a FIFO or a file outside the range. This branch is a defence behind 0006 step 4 against a change after it (a race, TOCTOU): step 4 already ends the run with UP-E03 when a tracked page's working-tree file is no longer what the index records (`git status --porcelain=v1` shows ` M` for a FIFO and ` T` for a link put in place of a regular file, measured in a scratch repository), and a page tracked as a link (mode `120000`) is U51's `symlink`; U154 therefore models the race with a wrapped `deps.fs`, as U56 does (revision 2 self-check, RV2-01). A read error here ends the run at once (D142). Row U154. |
| D140 | rev 2 (R-11) | TB1, TB2, B-T1, create-wxl's `jsonStringifyEscaped`; new, approved under the user's standing authorization of 2026-11-15 | **Build messages quote outside values as create-wxl does.** Every value or path the PL codes quote (`<json>` in PL-E05, PL-E06 and PL-E12; the path lists of PL-E07–PL-E09; PL-E10's path; `<page>` and `<href>` in PL-E11; `<page>` in PL-E12) is printed by one site function equal to create-wxl's `jsonStringifyEscaped`: `JSON.stringify` (which writes `\"`, `\\`, `\n` for a line feed and `\uXXXX` for every other C0 character and for a lone surrogate, ES2019), then its short escapes `\b`, `\f`, `\r` and `\t` rewritten as `\u0008`, `\u000c`, `\u000d` and `\u0009` (a line feed keeps `\n`), then every DEL and C1 character written `\uXXXX`. When `JSON.stringify` throws or returns `undefined` (`undefined`, a function, a `BigInt`, a cycle), the function returns `undefined` and the message prints the value's type name instead (`null`, `array`, or its `typeof`), as create-wxl's messages do (RV2-10). PL-E13–PL-E18 print their paths and `<keys>` bare ("Build error codes"), so a control character in a folder name or a frontmatter key reaches the terminal raw there; B-T2 and the spec's TB2 record it under what is not protected (RV2-03). A site test runs both functions over one table (D112's pattern). Bidirectional formatting characters are printed as they are, as in create-wxl. The hook's lines keep today's raw names (TB-S4; T-0058 item 3 if taken). Row B95. |
| D141 | rev 2 (R-14) | D13, TB2; new, approved under the user's standing authorization of 2026-11-15 | **A protocol-relative home link fails.** A home-page link that starts with `//` fails PL-E12 with the reason `is a protocol-relative link; write a site link from the locale's home page, or an external link with its scheme`, checked before the external-link rule; links with a scheme (`https:`, `mailto:`) and `#` anchors stay unchecked. The reasons are tested in this order, the first that holds giving the line: not a string; starts with `//`; has a scheme or starts with `#` (external: unchecked, no line); relative; carries a listed locale's prefix; names no published page (revision 2 self-check, RV2-13). Row B94. |
| D142 | rev 2 self-check (RV2-15) | D96, D139, U62, U63; new, approved under the user's standing authorization of 2026-11-15 | **A read or git failure in 8a ends the run at once.** When 8a meets a read error (UP-E11: U62's `lstat` or read rejection, D139's non-regular kind) or a git command failure (CW-E14, U63), the run ends with that line as stderr's first line and prints no UP-E14 line, also for failures 8a had already collected; nothing is written. D96's "every failing path of the first side that fails is printed" holds for a run that ends in UP-E14. Rows U62, U63, U154. |

Kept from spec 0008 without change (area A): 0008 D5 (only explicit acts write), 0008 D11 (classify first), 0008 D13 (reload and server redirects are cold loads), 0008 D14, 0008 D15, 0008 D16, 0008 D17, the lookup's steps 1–4, 0008 B1–B7's shape, 0008 C4–C11, 0008 L1–L9, 0008 W5, 0008 W6.

**Area L, mutual-exclusion checks made before adding its new guarantees.** D38 × 0008 goal G7 (refined, not contradicted); D38 × R6 (hook/CI still refuse orphans; the list's omission adds no second refusal); D41 × 0008 E4 (still the same ids in every list); D43 `difficulty` keeps any string so the list badge equals `MergedNav`'s badge for the same challenge; D45 × sorting (sort uses `getTime()`, unaffected) and × other date displays (none); D49 × D20 (the build accepts a page with no primary version, so the "only English" fixture under `P = zh-TW` builds) and × D6 (`smoke-fixtures` is not a locale name, PL-E09 does not fire) and × D52 (fixtures excluded by the production predicate); D44 × fork:init 0003 A6–A8 (it edits home-page hero names, not `challenges.md`); D40 × D14 (resolved, N3).

**D72 reasons.** T-0059: this epic rewrites `numericRules`, `PARAMETERISED`, `indexSlugs` and the
collection in `challenge-numbers.ts`, so the slug-grammar refusal is a few lines in code already
under test; each new form multiplies the shadowing effect it fixes; and slugs now come from two
places (`platform/challenge/` and every locale folder), which raises the chance of a hand-made
directory. T-0058: its item 2 (0007 W4 names nothing when a whole tree is untracked) becomes the common
case in the new layout — a teacher adding a translation creates a whole untracked
`platform/<L>/` folder, which git lists as `platform/<L>/`, a path no 0007 W4 pattern matches; its
item 3 (control characters echoed) moves into the TypeScript that D65 creates, where escaping is
simple; item 1 (cached-only removal ends in 0007 O5) is in the stash code this epic does not otherwise
touch, so it is the one item that could stay pending — taken because the revisit condition fires and
the hook harness is rebuilt for the new layout anyway (S41). If stage 4 declines either, the ticket
must be re-opened as pending with a new `revisit_when`, since this epic satisfies the old one.

**Mutual-exclusion checks on these guarantees.**
- D58's third fallback vs 0008 G6/0008 G9 ("generator does not refuse an orphan"): consistent; 0008 G9's two-rule special case disappears, the refusal stays in the hook and CI (D64).
- D64 (b) vs the generator's full mode refusing a brief without number: same condition, one message source (`checkChallengeNumbers` label `number`); full mode refusal predates this epic in kind (a page with no number).
- D64 (a) on a declaration-only slug vs `challenge-lint-staged`'s "incomplete challenge": both may refuse the same commit; validation runs first (hook order unchanged), so the teacher may see the validator's message instead of 0007 W6. Accepted; AC checks only exit 1, nothing changed, and that stderr names the missing primary brief path from one of the two.
- D66 vs 0007 O6 (first commit): a first commit staging `range.json` triggers; 0007 O6's refusal applies as for any trigger. No conflict.
- D67 vs R19 "the build reads range.json": the build reads the working tree; the hook the index; they differ only while `range.json` has unstaged edits, and the commit then carries the index's file, which CI and the deploy build read. Stated in the README passage (S69).
- D60 vs `redirects.test.ts` "does not hide one rule behind a more general one": the splat matches every path under `/zh-TW/`, so the test must treat it as shadowing every later rule with that prefix; being last, it shadows none (S22).
- D48 vs 0008 E10: an entry without a number still has no short link (unchanged).

## Seams

Existing seams are reused where they exist; **NEW** marks a new public surface (each approved under
the user's standing authorization of 2026-11-15). "Was" names the fragment id, kept only so the
integration can be audited.

| Id | Was | Seam | Public surface | Prior art |
|---|---|---|---|---|
| 0010-S1 | B-S1 | Primary locale | **NEW** `parsePrimaryLocale(text \| undefined): Locale` and `readPrimaryLocale(rangeJsonPath): Locale`, throwing PL-E01–PL-E06 (D114) | 0006's `readRangeJson`; `create-wxl/test/upgrade-base.test.mjs` J1/J3 |
| 0010-S2 | B-S2 | Layout check | **NEW** `checkSourceLayout(srcDir, primary): void` (PL-E07–PL-E10, D6) and `classifySourcePath(sourcePath, primary)` (D116) | `pageListFromDir`'s walk; `tests/unit/i18n/page-list.test.ts` |
| 0010-S3 | B-S3 | Page list (0008 S2, extended) | **NEW** `rewrittenPath(source, primary)`; `entryForRelativePath` (renamed `entryForSourcePath`); `pageListFromDir(srcDir, primary)` | `tests/unit/i18n/page-list.test.ts` |
| 0010-S4 | B-S4 | Locales config | **NEW** `localesConfig(primary)` | — |
| 0010-S5 | B-S5 | Site configuration | The default export of `.vitepress/config.mts` on the real tree: `srcExclude`, `rewrites`, `locales`, `vite.define.__WXL_PAGES__`, `vite.define.__WXL_PRIMARY_LOCALE__`, `transformPageData` | `tests/unit/site/config-base.test.ts` |
| 0010-S6 | B-S6 | Primary-folder link rule | **NEW** markdown-it plugin `primaryFolderLinks(md, primary)` (PL-E11) | — |
| 0010-S7 | B-S7 | Home-page links | **NEW** `localizeHomeLinks(frontmatter, pageLocale, primary, pages)` (PL-E12) | — |
| 0010-S8 | B-S9, SA8, SL5 | Built site (site-smoke) | `pnpm docs:build` output served by `vitepress preview`, driven by Playwright: `site-smoke.spec.ts`, `missing-translation.spec.ts`, **NEW** `list-strings.spec.ts`; built with `WXL_SMOKE_PAGES=1` (D50) | `tests/site-smoke/*.spec.ts` |
| 0010-S9 | B-S10 | Commands on a copy | Exit status and stderr of `pnpm docs:build`, `docs:dev`, `docs:preview`, `pnpm build` on a copy of the tree outside the repository | 0006-S2 simulation |
| 0010-S10 | SA1 | Locale routing (0008 S1) | `redirectTargetForStoredLocale`, `shouldPersistOnColdLoad`, `classifyArrival`, `lookupNotFound`, `notFoundRedirect`, `switcherDecision`, `lineLocale`, `createCarry`, `detectLocaleFromPath`, `localizePath`, `readStoredLocale`; each that depends on the layout gains `P` as an argument (D31) | `initial-locale-redirect.test.ts`, `arrival.test.ts`, `localize-path.test.ts`, `route-locale-sync.test.ts` |
| 0010-S11 | SA2 | Page locale from `localeIndex` | **NEW** `pageLocaleOf(localeIndex, P)` | — |
| 0010-S12 | SA3 | Primary locale on the client | **NEW** `primaryLocale()`, a module of its own (replaceable by `vi.mock`) | `publishedPages()` |
| 0010-S13 | SA4 | The Layout's arrivals | The real theme Layout (`.vitepress/theme/index.ts`) with `useArrivals`: router `go` calls, the rendered line, `wxl-locale` after the arrival | `not-found-wiring.test.ts`, `theme-locale-wiring.test.ts` |
| 0010-S14 | SA5 | Locale switcher | `LocaleSwitcher` under the Layout's provider: title, options, trigger `aria-label`, `choose` | `locale-switcher.test.ts` |
| 0010-S15 | SA6 | The line | `MissingTranslationLine`: text, link text, `href`, `lang` (0008 S3) | existing |
| 0010-S16 | SA7 | Locale-dependent component output | `MergedNav`, `ChallengeList`, `HomeContent` output in SSR and after mount | `MergedNav.test.ts`, `ChallengeList.test.ts`, `HomeContent.test.ts` |
| 0010-S17 | SL1, B-S8 | Merge (0008 S4, amended) | `mergeLocaleChallenges({ briefs, declarations, locales, primary })` → `Record<Locale, ChallengeData[]>`; pure | `merge-challenges.test.ts` |
| 0010-S18 | SL2 | Loader (**NEW** shape) | The default export of `platform/shared/challenges.data.ts` (`watch`, `load`) delegating to `loadChallengeLists(srcDir, files, { locales, primary })` | `challenge-data-loaders.test.ts` (rewritten on a temporary tree) |
| 0010-S19 | SL3 | List and home rendering | `ChallengeList`, `HomeContent` with prop `lists`, by `renderToString` and by `mount` | `ChallengeList.test.ts` ("server rendering"), `HomeContent.test.ts` |
| 0010-S20 | SL4 | Smoke-page switch (**NEW**) | `isSmokeFixturePage(sourcePath)`; the configuration's `srcExclude` and `__WXL_PAGES__` with `WXL_SMOKE_PAGES` set and unset | `config-base.test.ts`, `page-list.test.ts` |
| 0010-S21 | SL6 | CI workflow | `.github/workflows/quality-gates.yml` jobs `build` and `site-smoke` | `tests/unit/workflows/*.test.ts` |
| 0010-S22 | SL7 | Exploit suite | `pnpm test:challenges` (dev server) | existing |
| 0010-S23 | SL8 | Content | `platform/zh-TW/reference/attack-log-export-format.md`; **NEW** `tests/unit/site/locale-completeness.test.ts` | `sentence-map.test.ts` |
| 0010-S24 | S6 (0008) | Redirect rules | `generateRedirects(root, { includeSlug?(slug, tree) })`, `writeRedirects`, `indexSlugs(root)` (keys `declaration` and the locale codes), the committed `platform/public/_redirects` | `redirects.test.ts`, `redirects-generated.test.ts` |
| 0010-S25 | N1 | Brief check | **NEW** `briefFaults(trees, primary): BriefFault[]` (`{ kind, slug, present, missing }`), exported from `scripts/generate-redirects.ts` | `orphanFaults` in `redirects.test.ts`; the hook's D12 block |
| 0010-S26 | N2 | Challenge page path | **NEW** `challengePagePath(slug, locale, primary)` in `.vitepress/challenge/shortLink.ts` | `challengeLink` page mode |
| 0010-S27 | S-num | Challenge numbers | `readChallengeNumber(yamlPath)`, `collectChallengeNumbers(root)`, `checkChallengeNumbers(entries)`, `nextChallengeNumber(root)` | `challenge-numbers.test.ts`, `create-challenge-run.test.ts` |
| 0010-S28 | S-cli | Generator CLI | full mode; `--staged --root <top>`; **NEW** `--describe-untracked <file> --root <top>` | `pre-commit-sh.test.ts` via the hook |
| 0010-S29 | 0007-S5 | The hook | `scripts/pre-commit.sh` on a real repository: exit status, index, working tree, stash list, stderr | `tests/pre-commit-sh.test.ts`, `tests/__helpers__/preCommitRepo.ts` |
| 0010-S30 | S5 (0008) | Copy control | `challengeLink`, `ShortLinkShare` (`locale`, `entryLocale`), `ChallengeList`'s `hasCopyControl`, `MergedNav`'s control | `shortLink.test.ts`, `ShortLinkShare*.test.ts`, `ChallengeList.test.ts`, `MergedNav.test.ts` |
| 0010-S31 | SY1 | Declaration and brief schemas | `validateChallengeDeclaration`, `validateChallengeBrief`, `BRIEF_KEYS`, `LEGACY_FIELDS`, `VALID_TOOLS` in `.vitepress/challenge/config.ts` | `tests/unit/challenge/config.test.ts` |
| 0010-S32 | SY2 | Reading a declaration | **NEW** `readChallengeDeclaration(root, slug)` → `{ ok, path, value }` or `{ ok: false, path, reason, detail }` | New `declaration.test.ts` |
| 0010-S33 | SY3 | Assembly | **NEW** `assembleChallengeFrontmatter(sourcePath, frontmatter, rawSource, readDeclaration, locales)`, called by `transformPageData` with `filePath` | `plugin.test.ts`; site-smoke |
| 0010-S34 | SY4 | Validation CLI | `validateChallenge(root, slug)`, `discoverChallenges(root, target?)`, `main()`'s exit status and labels | `tests/challenge-validate.test.ts` |
| 0010-S35 | SY5 | Analysis CLI | `discoverChallenges`, `validateChallenge`, `analyzeChallenge`, `formatAnalysis` in `challenge-analyze.ts` | `tests/challenge-analyze.test.ts` |
| 0010-S36 | SY6 | keygen | the `challenge:keygen` CLI (`[skip]`/`[stale]`/`[done]`, files written), `getTrackedInputPaths`, `isOutputStale` | `challenge-keygen.test.ts` |
| 0010-S37 | SY7 | retype | `retypeChallenge(args, { projectRoot, runKeygen })` | `challenge-retype-*.test.ts` |
| 0010-S38 | SY8 | Scaffold | `run(argv, deps)`, `checkCollision`, **NEW** `generateBrief(opts, locale)`, `generateDeclaration(opts)`, `SCAFFOLD_TEXT` | `create-challenge.test.ts`, `create-challenge-run.test.ts` |
| 0010-S39 | SY9 | Release gate L1/L2 | `makeDefaultRunners(deps).L1/L2` | `challenge-verify-L1.test.ts`, `-L2.test.ts` |
| 0010-S40 | SY10 | Commit-time validation | `deriveSlugs(paths, locales)`, `runLintStaged(root, slugs)` | `tests/challenge-lint-staged.test.ts` |
| 0010-S41 | SY11 | L4 player package | `buildPlayerPackage(opts)`, `extractDescription` | `build-player-package.test.ts` |
| 0010-S42 | SY12 | Challenge page | the rendered `ChallengeLayout` on the built site, every locale | site-smoke; stage 8 |
| 0010-S43 | SY13 | Agent and human documents | the named skills, READMEs, CONTRIBUTE, `docs/agents/challenge-pipeline.md`, `AGENTS.md`, guide pages | `sentence-map.test.ts`; stage 6 |
| 0010-S44 | US1 | Upgrade run (0006-S1) | `run` with argv `upgrade …` on a real git repository, fixture archives, `deps.fs`, checkpoints `step-3`…`step-10` | `create-wxl/test/upgrade-*.test.mjs` |
| 0010-S45 | US2 | The transform | **NEW** `planLayoutMove({ files })` → `{ legacy, ops, mismatches }` or `{ failures }`, in `create-wxl/src/layout-move.mjs`; no I/O | — |
| 0010-S46 | US3 | Report | `buildReport` with optional `moveOps`, `primaryLocaleWritten`, `crossing` | `upgrade-report.test.mjs` |
| 0010-S47 | US4 | Message tables | `en`, `zhTW` in `messages.mjs`: `UP-E14(…)`, `UP-A16()` | `upgrade-messages.test.mjs`, `language.test.mjs` |
| 0010-S48 | US5 | fork:init engine | `scripts/fork-init.ts` with `--site-name` on a fixture tree; create-wxl's create path through the bundled engine | `fork-init.test.ts`, `upstream-guard.test.ts`, `engine-apply.test.mjs` |
| 0010-S49 | US6 | Upstream equality | **NEW** a test running `planLayoutMove` on `git show v3.1.1:platform/…` and comparing with the working tree | `upstream-config.test.mjs` |
| 0010-S50 | SA9, SL9, S7' | Stage 8, deployed sites | Cloudflare Pages previews of `stage8/<ticket-id>` and `stage8/<ticket-id>-en`, the temporary GitHub Pages range (D119), driven in the Browser panel (challenge pages with it open, hard rule 4) and with `curl -sI` in the terminal | 0008 S7 |
| 0010-S51 | US7 | Stage 8, upgrade terminal | 0006-S2's surface: `npm pack` from the pushed head A, `npx --yes --package <tarball> create-wxl` (npm 11 runs `npx --yes <tarball>` as a path command, `docs/agents/platform-notes.md`, K-4), `CREATE_WXL_COMMIT=<A>`; published `create-wxl@3.0.0` | 0006-S2 |
| 0010-S52 | US8 | Stage 8, upgraded range in the browser | the upgraded range built and served locally (`pnpm build`, `pnpm docs:preview`), Browser panel | 0008 S7 |

0010-S51 and 0010-S52 override the preview-deployment rule for area U, as 0006 did (OQ-022): an
upgrade runs on the teacher's machine and its result is a local tree. Every other area keeps its
preview deployments.

## Constraints on the ticket breakdown

Stage 4's claim table is checked against these. "Green" means every job of `quality-gates.yml` and
the create-wxl tests pass on `main` after each ticket lands, and no command that writes the tree
(`pnpm create:challenge`, `pnpm challenge:keygen`, `pnpm challenge:retype`, the generator) writes a
tree the build then rejects, and no refusal of the hook (brief faults, validation) is weaker than on
the previous ticket. The hook does not check every class the build rejects: it is not triggered by a
non-brief page outside the locale folders (`platform/guide/x.md` is not a watched path) or by a page
in a folder off the locale list (`platform/ja/challenge/s/index.md`, D126), and it never
checks links (PL-E11, PL-E12, VitePress's dead-link check), so a commit it accepts can still fail
`docs:build`, as today.

| Id | Constraint |
|---|---|
| T1 | **The layout switch is one ticket.** These land together, because CI runs keygen, validate, the unit suite (redirect, number, loader, fork:init and page-list tests), `docs:build`, site-smoke and the create-wxl tests on every pull request, and each of them reads brief paths or declaration fields: moving upstream's pages into `platform/en/` and splitting every brief's frontmatter into `challenge.yaml` (produced by `planLayoutMove`, D108); the build's primary locale, `rewrites`, layout check, locales config, page list, `transformPageData` and home links (D1–D13, D18–D22); the routing generalised to `P` and `pageLocaleOf` in the four components (D24–D35), since with no `range.json` upstream's root becomes Traditional Chinese at once; the one loader and the merge (D37–D43); the smoke fixture pages and their CI switch (D49, D50), since the move leaves `missing-translation.spec.ts` without its English-only subject; every reader and writer of the declaration and of brief paths, the skills included (D73–D90); the generator, numbers, brief check and hook (D57–D69); `ANCHOR_PATHS` and `PLATFORM_HOME_RELS` (D107); and every document the switch makes false (B84, A34–A37, Y97–Y100, S69, S70, and B90 except U135's sentences, which T4 carries). Before its first red test, the switch ticket introduces the client module of D31 alone, runs the unit suite, and lists in "Overridden contracts" every existing test that its `zh-TW` fallback flips; a test changed only to set `P` explicitly (an argument, or a mock of that module), with its assertions unchanged, is allowed without its own row, and stage 6 checks that such a test's diff is only that. |
| T2 | `planLayoutMove` and its unit rows (U20–U31, U47, U146) land no later than the switch ticket, which runs it on upstream's tree and adds U130–U134, U136, U139, U142 and U147 (D108, D116). |
| T3 | The locale list module, `parsePrimaryLocale`/`readPrimaryLocale`, `classifySourcePath` and the pure declaration functions (`validateChallengeDeclaration`, `validateChallengeBrief`, `readChallengeDeclaration`) may land before the switch as unused pure modules with their unit rows; nothing reads them until the switch. |
| T4 | The upgrade's move (steps 7–10, report R6, UP-E14, UP-A16, `range.json`'s `primaryLocale`, D91–D106, D109–D112, D120, D125, D139, and U135's GLOSSARY sentences, which describe it, K-9) lands after the switch ticket: its run rows build new-layout targets from the tree the switch produces, and its stage 8 ("Stage 8 plan › Area U") needs A on GitHub with the new layout. |
| T5 | The Traditional Chinese reference page (D51) and the completeness test (D52) land in or after the switch ticket, never before: the smoke fixtures that replace its English-only role (D49) exist only from the switch. |
| T6 | T-0060's widened scope (D44–D47, L23–L33, VL1–VL4) may land in the switch ticket or after it; it needs the `lists` prop (D40). |
| T7 | S50 (T-0058) and S51 (T-0059) are claimed only if stage 4 takes those tickets (D72); a ticket declined must be re-opened as `pending` with a new `revisit_when`, because this epic meets the old one. |
| T8 | Each ticket runs at stage 8 the V rows its own rows reach. The V table of each area runs in full at the last ticket of that area, after the others have landed. |
| T9 | The ticket that adds 0010-S49 (U130–U132, U134, U147; root suite) gives every workflow job that runs the root suite on upstream a checkout with tags (`fetch-depth: 0`, as `prose-audit` has): `quality-gates.yml` `test` (`pnpm test --run`) and `fork-init-cross-os` (which also runs U133 through `pnpm --dir create-wxl test`), and `release.yml` `release` (`pnpm test --run`). Row U142 pins it (U-O7). |

## Fixed lists

### Vocabulary

Glossary terms are used as `GLOSSARY.md` defines them, including its working-tree edit for this
epic: 語系 (locale), 主語系 (primary locale), 翻譯 (translation), 語系清單 (locale list), 語系資料夾
(locale folder), 說明頁 (brief page), 語系偏好 (locale preference), 題目宣告 (challenge declaration),
舊版面 (legacy layout), 搬家 (layout move), 設定紀錄 (setup record, `range.json`), 語系標記 (locale
mark), 短連結 (short link), 下架題目 (retired challenge), 原廠靶場 (pristine range), 上游 (upstream).
The terms below are this spec's. Quoted from the working-tree `GLOSSARY.md` at blob `b307335`
(revision 2, C-16, K-3): 設定紀錄's 「從舊版面的上游版本升級而搬家、而且還沒有記主語系的靶場，會記成英文」
already states D105 (a range is moved only when it holds a legacy page, D91); until B90 lands the
edit, D105 supersedes 搬家's 「經由升級搬家、而且還沒記主語系的靶場記成英文」, which also covers a moved run
that is not crossing (U3, U146), and it reads 「還在舊版面、從舊版面的上游版本升級、而且還沒記主語系的靶場，搬家時會記成英文」
(N17, U135). Where the working-tree edit and
this file differ on 主語系, 翻譯, 語系偏好, 舊版面 or 語系清單, this file holds, and B90 lists the change.

| Term | Meaning in this spec |
|---|---|
| locale | A code on the locale list: `en`, `zh-TW` in this epic. |
| locale list | `LOCALES = ['en', 'zh-TW']`, in that order, exported by the locale list module (D4), with `Locale`, `DEFAULT_PRIMARY_LOCALE = 'zh-TW'`, `isKnownLocale` and `LOCALE_ENGLISH_NAMES` (D115). The only enumeration of locales in `.vitepress/` and `platform/shared/`; create-wxl keeps a literal copy (D112). |
| `P` (primary locale) | The string value of the own property `primaryLocale` of `range.json` at the repository root; `zh-TW` when the file is absent or has no such property (D2, D114). Upstream has no `range.json`, so upstream's `P` is `zh-TW`. Served at the site root. |
| `T` (translation locale) | A locale of the list other than `P`. In this epic exactly one: `zh-TW` when `P = en`, `en` when `P = zh-TW`. |
| locale folder | `platform/<code>/` for a code on the locale list. A folder of `platform/` named otherwise is not a locale folder, whatever it holds. |
| primary folder | The locale folder of `P`. Its name never appears in a URL. |
| source path | A page file's path relative to `platform/`, `/`-separated (`en/guide/python.md`); VitePress's `filePath`. |
| rewritten path | The source path without a leading `<P>/` segment, otherwise unchanged (D7); VitePress's `relativePath`. |
| page-list entry | `entryForRelativePath(rewritten path)`, in spec 0008's spelling (a folder's `index.md` keeps its trailing slash, any other page has none), base-less. |
| excluded area | Where a `.md` file is not a page and no layout rule looks: `platform/public/**`, `platform/shared/**`, `platform/challenge/<slug>/src/**`, any dot-prefixed file or folder at any depth, any `node_modules/` or `dist/` folder at any depth. The same in every build mode: `platform/<code>/smoke-fixtures/**` is not an excluded area; its pages are locale pages for the layout check, the tools and the upgrade, and only publishing them depends on the mode (`isSmokeFixturePage`, D49), which `classifySourcePath` does not consult. |
| searched area | Everything under `platform/` outside the excluded areas, `platform/` itself included: a symbolic link at `platform` is a PL-E07 violation (B91). |
| page | A file under `platform/` whose name ends in `.md` (case-sensitive) and that is outside the excluded areas. One predicate for the build, the tools and the upgrade (D116). |
| legacy page | A page outside every locale folder. A tree **in the legacy layout** holds at least one, whatever its version says (D91). |
| brief path | `platform/<L>/challenge/<slug>/index.md` for `L` on the locale list. The **primary brief** has `L = P`; any other is a **translation brief**. |
| challenge directory | `platform/challenge/<slug>/`: `challenge.yaml` and `src/` only (D117). |
| declaration file | `platform/challenge/<slug>/challenge.yaml` (D73). |
| brief keys | `title`, `description`, `layout`: the only keys a brief's frontmatter may carry (D74). Every other declaration key lives in `challenge.yaml`. |
| assembled frontmatter | What a challenge page receives at build time: the brief's frontmatter ∪ every key of `challenge.yaml` ∪ `markdownBody` (D78). |
| orphan translation brief | A translation brief whose slug has no primary brief. Never listed (D38); refused by validate (VM10) and by the hook and CI (D64). |
| layout error | An error the build throws whose first line starts with `PL-E01`…`PL-E18` and a colon (D113). |
| primary-locale page / translation page | A published page whose entry has no translation-locale segment / whose entry is `/<T>/` or starts with `/<T>/`. Its page locale is `P` / `T`. |
| not-found path (three kinds) | As spec 0008 D11, decided from the first segment after the lookup's steps 1–4: **translation path** (first segment is `T`), **primary-code path** (first segment is `P`; never a page, R22's old URLs), **primary path** (anything else). Its own locale is `T`, `P` and `P` respectively. |
| counterpart | Of `/X` (primary-locale page): `/<T>/X`. Of `/<T>/X`: `/X`. Of a not-found path: translation path `/<T>/X` → `/X`; primary-code path `/<P>/X` → `/X`; primary path `/X` → `/<T>/X` (D27, D28). Counts only when it is a page-list entry. |
| stored value, valid stored value, no preference | As spec 0008 (the `wxl-locale` value or the tab's in-memory choice). Valid = a member of the locale list, compared exactly; anything else, or unreadable storage, is no preference. |
| short-link form | A rule source prefix, in file order `/c/`, `/en/c/`, `/zh/c/`, `/zh-TW/c/` (D57); `F` = 4 forms. Form locale: `/c/` → `P`; `/<L>/c/` → `L`; `/zh/c/` → `zh-TW`. |
| challenge page path | `challengePagePath(slug, L, P)`: `/challenge/<slug>/` when `L = P`, else `/<L>/challenge/<slug>/` (D68). |
| old-address rule | `/zh-TW/*  /:splat  302`, written last, only when `P = zh-TW` (D60, D118). |
| brief fault | `missing-primary`, `missing-declaration` or `old-layout`, as `briefFaults` reports it (D64, D69). |
| list locale, borrowed entry | The locale of the list being built; an entry of a list for `T` taken from the primary brief because no `T` brief exists (carries the mark). Never in the list for `P` (D38). |
| test build / production build | A VitePress build with `WXL_SMOKE_PAGES` exactly `1` / any other value or unset (D49). |
| smoke fixture page | `platform/en/smoke-fixtures/english-only.md` or `platform/zh-TW/smoke-fixtures/traditional-chinese-only.md`, published only by a test build (D49). |
| page-locale string | A string resolved with `t(key, …, { locale: pageLocale })`, never `$t` (D44). |
| static HTML / hydrated | The document as served with JavaScript disabled / after the app mounts and the first list row (`a.ch-list-row`) or `[data-stat="total"]` is attached. |
| B, T, o, B′, o′ | Upgrade (area U): 0006's base pristine range, target pristine range and the teacher's file; B′ = B after the move's transform (B′ = B when B is not in the legacy layout); o′ = what the merge reads as o through the move plan (U-§1). |
| crossing run / moved run | An upgrade in which B was in the legacy layout / in which B or the teacher's range was (D105). |
| move op | `move`, `declare` or `strip`, as `planLayoutMove` returns it (U-§1). |
| report R1–R6 | The upgrade report's lines: 0006's R1–R5 and this spec's R6 (D106). |

**Areas** (owners named in rows): area **B** build and routing (also "build area", "config area",
"page-list area", "locale-list area", "documents area"); area **A** learner arrival ("runtime area",
"routing area"); area **L** lists, home page and smoke fixtures ("lists area", "fixture area"); area
**S** short links, numbers and the hook ("redirects area", "short-links area", "hook area"); area
**Y** the challenge declaration ("declaration area"); area **U** the upgrade ("upgrade area").
Fragment open issues are cited `<area>-O<n>`; "Integration notes" resolves each.

**Section labels.** Inside an area's rows, `A-§4.3`, `L-§4.2`, `S-§4.1`, `Y-§2.4`, `U-§1` and so
on name the fixed list with that label below.

### Literal patterns (PAT1–PAT6)

Commands and patterns that rows cite, written here outside any table so that no `|` is a Markdown
cell separator (revision 2, V-1). Each block is the literal text to run or match; a row cites it by
id. In PAT1–PAT3 `[|]` is a literal vertical bar and a bare `|` is ERE alternation.

PAT1 (B18, D132). Expected: the first command prints nothing; the second prints only lines of the
locale list module; the third prints, for stage 6, every line where `zh-TW` in either quote (or as a
computed key `['zh-TW']`) is followed by `:`, and each such line that is an object key must sit in an
object declared `Record<Locale, …>` or `satisfies Record<Locale, …>`. The second command sees, on one
line, in either quote and either order, a union of two codes, an array of two codes, and a comparison
chain (two comparisons against codes joined by `||`, such as today's
`.vitepress/theme/i18n/index.ts:31`); an enumeration written across lines or built another way is
left to stage 6's reading of the changed files (D132). Revision 2 self-check, RV2-08 and SC2-05.

```sh
git grep -n "KNOWN_LOCALES" -- .vitepress platform/shared
q="[\"']"; c="${q}(en|zh-TW)${q}"
git grep -nE "${c} *[|] *${c}|\[ *${c} *, *${c} *\]|[!=]== *${c} *[|][|] *[A-Za-z_\$][A-Za-z0-9_\$.]* *[!=]== *${c}" -- .vitepress platform/shared
git grep -nE "(${q}zh-TW${q}|\[ *${q}zh-TW${q} *\]) *:" -- .vitepress platform/shared
```

PAT2 (A28, VA4). Expected: no output.

```sh
git grep -nE "localeIndex\.value[[:space:]]*(===|!==|==)" -- .vitepress/theme
```

PAT3 (L18). Expected: no output.

```sh
git grep -nE "Web exploitation challenge|網站攻防挑戰" -- platform/shared
```

PAT4 (L36), the production build check, a shell pipeline. Expected: exit 0 on a production build,
non-zero on a test build.

```sh
! find .vitepress/dist -path '*smoke-fixtures*' | grep -q . && ! grep -rq smoke-fixtures .vitepress/dist
```

PAT5 (S30), the numbered-rule source, a JavaScript regular expression:

```js
/^\/(?:en\/|zh\/|zh-TW\/)?c\/[0-9]{3,}$/
```

PAT6 (D135, AC-43), run at stage 6 on each ticket that changes a file of the three skills, from
its merge base with `main` to its head. Expected: no output. The two trees' removed and added
lines are compared without the `---` and `+++` headers, so the differing path prefixes do not
count, and without `.agents/`'s own `agents/` folders (revision 2 self-check, RV2-09).

```sh
base=$(git merge-base origin/main HEAD)
for s in wxl-create wxl-mutate wxl-verify; do
  a=$(git diff "$base" HEAD -- ".claude/skills/$s/" | grep -E '^[-+]' | grep -vE '^(---|[+][+][+]) ')
  b=$(git diff "$base" HEAD -- ".agents/skills/$s/" ":(exclude).agents/skills/$s/agents/" | grep -E '^[-+]' | grep -vE '^(---|[+][+][+]) ')
  [ "$a" = "$b" ] || echo "$s: the two trees' changes differ"
done
```

### Type × boundary summary

Every input the rules read, with the values the matrix covers. Each value reaches at least one row.

| Input | Values covered | Rows |
|---|---|---|
| `range.json` | absent; `{}`; `{"upstream":…}` only; `primaryLocale` `en`, `zh-TW`; other keys of any type; duplicate key; `__proto__`; not a regular file (directory, symbolic link, FIFO); unreadable; not JSON (empty, BOM, comment, trailing text); not an object; `primaryLocale` not a string; not on the list (`""`, case variants, `zh`, `ja`, whitespace, control characters); in the index (absent, symbolic link entry, staged edit, unstaged edit, staged deletion, `upstream`-only edit, index and working tree disagreeing); every tool that reads it × each state (D123) | B1–B16, S10, S11, S41–S43, S76–S79, Y36, Y37, Y70–Y73, Y107–Y110 |
| primary locale `P` | `en`; `zh-TW` (every row that depends on `P` runs both, unless it names one) | all areas |
| source tree | New layout; old layout (pages in `platform/`, `platform/challenge/<slug>/index.md`, flat `platform/challenge/<slug>.md`); unlisted folder holding a page; folder named like a locale inside a locale folder; symbolic links (searched and excluded areas); excluded areas; dot-prefixed, `node_modules/`, `dist/`; `.MD`; primary home missing; non-primary home missing; translation-only page; smoke fixture pages with the flag on and off | B20–B38, L34–L39, Y34, U11 |
| page link | relative in folder; cross-folder into the primary folder / into a non-primary folder; escaping the locale folder; site-absolute; raw HTML; home-page link (`hero.actions[*].link`, `features[*].link`; absolute, relative, prefixed, external, `#`, not a string, naming no page, naming a page the translation lacks) | B62–B79, B92 |
| arrival | cold load of a primary-locale page, a translation page, three kinds of not-found path; later navigation; switcher choice; failed load; alias URL; server redirect landing; reload; session-gate clear | A1–A33, DT01–DT80, SW01–SW16 |
| stored value | none; `en`; `zh-TW`; invalid (`fr`, `ja`, `zh-tw`, `EN`, `''`, unreadable); storage refusing writes | A1–A25 |
| site base | `/`; `/<repo>/` | A7, L22, B61, V rows |
| host | Cloudflare Pages (rules apply); GitHub Pages (only the not-found page); `vitepress preview`; dev server | A15, S57–S63, V rows |
| per challenge | declaration (valid, absent, malformed, multi-document, not a mapping, brief key, unknown keys, legacy fields); primary brief (present, missing, untracked, ignored, old layout); translation brief (present, missing, untracked, ignored, orphan); stray file in the challenge directory | Y1–Y48, Y103, L1–L18, S1–S11, S35, S44, S73 |
| declaration field | each key of Y-§2.2 × its type and boundary; `date` (ISO string, date-only string, unparsable, `Date`, number); `tags` (array with non-strings, string); `number` (integer, `0`, negative, fraction, string, absent, duplicate) | Y9–Y21, L11–L17, S14–S17 |
| short-link form × list × entry | 4 forms × numbered / slug × translated / borrowed / orphan / unnumbered × short / page mode | S1–S9, S22–S27, S52–S56 |
| number width, retired record | 1–3 digits, ≥ 4 digits; retired `challenge.yaml`, legacy retired `index.md`, both | S14, S20 |
| hook state | trigger paths (listed locales; `public/`, `shared/` and unlisted folders, D126); staged and unstaged `range.json` in both directions; untracked and ignored directories; faults staged and faults already in `HEAD`; first commit; bash 3.2 | S36–S51, S73, S74, S76–S80 |
| upgrade layouts | teacher × B × T each legacy or new; `--from <version>`, `--from <commit>`, `range.json` base; equal versions or commits | U1–U13 |
| brief bytes (move) | LF, CRLF, mixed, no final newline, empty, binary, BOM; multi-line groups, block scalars, comments, quoted keys; broken fences, duplicate keys, anchors across groups, flow mappings | U20–U31 |
| range state (move) | destination exists (tracked, untracked ignored, file in the way); symbolic links; gitlinks; ignored pages; name aliases (case, NFC, 8.3); new path ignored; read errors; git command failures | U50–U64 |
| upgrade `range.json` | absent, `upstream` only, other keys, `primaryLocale` present (string, not a string, unknown code), `__proto__`; crossing or not × the teacher's range moved or not; a kept `zh-TW` with English-only challenges; no `upstream` without `--from`; write failure | U2, U90–U94, U104, U140, U143 |
| interface strings, dates | every list and home string in static HTML and hydrated; time zones UTC, Asia/Taipei, America/Los_Angeles | L23–L33 |

### Schema: `range.json` (area B; D2, D3, D105, D114)

A complete `range.json` of a range created by create-wxl 3.x and upgraded across this epic's
release (the upgrade's own `upstream` rewrite and R18's key order are area U's):

```json
{
  "upstream": {
    "repository": "BrowserLaboratory/wxl-platform",
    "version": "3.2.0",
    "commit": "0123456789abcdef0123456789abcdef01234567"
  },
  "primaryLocale": "en"
}
```

What the build makes of each shape:

| `range.json` | Primary locale | Row |
|---|---|---|
| absent (upstream; a fork without one) | `zh-TW` | B1 |
| `{"upstream": {…}}` (every 3.x create-wxl range today) | `zh-TW` | B2 |
| `{}` | `zh-TW` | B2 |
| `{"primaryLocale": "en"}` (R4's fork:init shape, tools epic) | `en` | B3 |
| `{"upstream": 7, "primaryLocale": "zh-TW", "x": []}` | `zh-TW` (other keys unread) | B4, B11 |
| `{"__proto__": {"primaryLocale": "en"}}` | `zh-TW` (no own `primaryLocale`) | B13 |
| `{"primaryLocale": "en", "primaryLocale": "zh-TW"}` | `zh-TW` (`JSON.parse` keeps the last) | B12 |
| a directory, or a symbolic link to a valid file | PL-E01 | B5 |
| unreadable regular file | PL-E02 | B6 |
| empty, `{`, BOM + `{}`, `// c\n{}`, `{} x` | PL-E03 | B7 |
| `null`, `[]`, `"en"`, `1`, `true` | PL-E04 | B8 |
| `{"primaryLocale": null}`, `{"primaryLocale": 1}`, `{"primaryLocale": true}`, `{"primaryLocale": ["en"]}`, `{"primaryLocale": {}}` | PL-E05 | B9 |
| `{"primaryLocale": ""}`, `{"primaryLocale": "EN"}`, `{"primaryLocale": "zh-tw"}`, `{"primaryLocale": "zh"}`, `{"primaryLocale": "ja"}`, `{"primaryLocale": " en"}`, `{"primaryLocale": "en\n"}` | PL-E06 | B10 |

After a crossing upgrade that moves the teacher's range (area U, D105; target values illustrative):

| Before | After |
|---|---|
| absent (`--from`) | `{"upstream":{…target…},"primaryLocale":"en"}` |
| `{"upstream":{…}}` | `{"upstream":{…target…},"primaryLocale":"en"}` |
| `{"upstream":{…},"x":1}` | `{"upstream":{…target…},"x":1,"primaryLocale":"en"}` |
| `{"x":1}` (`--from`) | `{"upstream":{…target…},"x":1,"primaryLocale":"en"}` |
| `{"primaryLocale":"zh-TW","upstream":{…}}` | `{"primaryLocale":"zh-TW","upstream":{…target…}}` |
| `{"upstream":{…},"primaryLocale":5}` | `{"upstream":{…target…},"primaryLocale":5}` (kept; the build area's R19 refuses it) |

Two-space indent and one trailing LF, as 0006.

### Y-§2.1 Declaration file grammar

- UTF-8 text holding exactly one YAML document whose root is a mapping. A leading `---` document
  marker is allowed; a second document is an error. No closing `---` and no Markdown body.
- Parsed everywhere with the `yaml` package's default (core) schema, so an ISO 8601 `date` stays a
  string (D79). Comments and key order carry no meaning; tools that write the file preserve both
  (`parseDocument` round trip).
- Path: `platform/challenge/<slug>/challenge.yaml`. The slug grammar
  `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` is enforced only by `create:challenge` (epic 0007), and by the
  generator if stage 4 takes T-0059 (D72, S51). Every other tool (validate, keygen, the loader, the
  build, the hook, the upgrade) accepts any directory name as a slug and compares slugs exactly, so
  `Door` and `door` are two slugs (D39, L10); TB6 states what an unchecked name can do.

### Y-§2.2 Declaration keys (type × boundary)

| Key | Type and closed boundary | Required | When absent | Written by | Read by |
|---|---|---|---|---|---|
| `number` | safe integer, 1 ≤ n ≤ 2^53 − 1 (`isChallengeNumber`, changed to `Number.isSafeInteger(n) && n >= 1`; `1e21` and `2**53` are refused, so `padChallengeNumber` never spells an exponent) | yes (validate's `number` check) | validate fails | `create:challenge` (once) | validate, the challenge-number functions (0010-S27), the lists (0010-S17, 0010-S18), `ChallengeLayout` (nav number) |
| `backend` | one of `flask`, `fastapi`, `php` | yes | validate fails | `create:challenge`, `challenge:retype` | validate, analyze, `ChallengeLayout` (runtime, worker registration) |
| `app` | non-empty string, a path relative to `src/` whose extension matches `backend` | yes | validate fails | `create:challenge`, `challenge:retype` | validate, analyze, keygen |
| `difficulty` | string (`challenge:retype` restricts it to `easy`, `medium`, `hard`) | no | list shows `mystery`; page badge empty | `create:challenge`, `challenge:retype` | the lists (0010-S17, 0010-S18), `ChallengeLayout`, analyze |
| `category` | string | no | list shows the list locale's default (`General` / `綜合`) | `create:challenge` (`web`), `challenge:retype` | the lists (0010-S17, 0010-S18), `ChallengeLayout`, analyze |
| `packages` | array of strings | no | `[]` | `create:challenge` (`[]`), wxl-create Step 4, hand | `ChallengeLayout` (micropip installs) |
| `tools` | array, every entry in `VALID_TOOLS` | no | the layout's default (all four tabs) | hand, wxl-create | `ChallengeLayout`, validate, analyze |
| `source_visible` | boolean (`true` / `false` only) | no | `false` (black-box) | wxl-create Step 4, hand | keygen, `ChallengeLayout`, validate |
| `source_files` | array of strings; non-empty only with `source_visible: true` | no | `[]` | hand | keygen, validate |
| `flag` | string, a path relative to `src/` | no | `flag.txt` | hand | validate, analyze, keygen |
| `date` | string (ISO 8601 as `create:challenge` writes it) | no | list date `null` | `create:challenge` | the lists (0010-S17, 0010-S18) |
| `tags` | array of strings | no | `[]` | `create:challenge` (`[]`), `challenge:retype`, wxl-create | the lists (0010-S17, 0010-S18), analyze |
| `wasmModule` | string, `/challenge/<slug>/runtime.wasm` | no (keygen adds it) | the page does not load a runtime | keygen only | `ChallengeLayout` |
| `fs`, `fs_key`, `fsKeyParts`, `encryptedFs`, `flag_verifier` | any | — | — | nobody | keygen warns and deletes them (D76) |
| `title`, `description`, `layout` | — | **forbidden** | — | — | validate fails (Y14); build fails PL-E16 |
| any other key (e.g. `id`, `commands`, `author`) | any | no | — | hand, the layout move | passed through into the assembled frontmatter; no tool reads it (D77, Y19) |

### Y-§2.3 Brief frontmatter keys

| Key | Type and closed boundary | Required | When absent |
|---|---|---|---|
| `title` | non-empty string | yes, in every brief | validate fails |
| `layout` | exactly the string `challenge` | yes, in every brief | validate fails; build fails PL-E17 |
| `description` | string | no | list shows `''` |
| any other key | — | **forbidden** | validate fails (Y24, Y25); build fails PL-E15 |

The brief body (after the frontmatter) is the engagement brief; its first H1 is the page heading.

### Y-§2.4 Complete examples — the four upstream shapes

Each `challenge.yaml` below is the upstream brief's frontmatter at `65de8c0` with the `title`,
`layout` and `description` lines removed and every other line kept byte-for-byte in order. That is
what R15's line-preserving transform yields, and what keygen's write-back leaves unchanged (Y55).
For `selected-excerpts` the English `source_files` (10 entries) is kept, per R11/R16 (F10).

**Black-box, FastAPI, no extra packages — `platform/challenge/door-is-open/challenge.yaml`**

```yaml
number: 1
difficulty: easy
category: web
backend: fastapi
app: app.py
packages: []
tools: [ browser, network, repeater, code ]
source_visible: false
date: 2026-04-02T08:54:17.674Z
tags: [ idor, access-control, fastapi, sqlite ]
wasmModule: /challenge/door-is-open/runtime.wasm
```

**Black-box, Flask, extra packages — `platform/challenge/staff-only/challenge.yaml`**

```yaml
number: 2
difficulty: easy
category: web
backend: flask
app: app.py
packages: [ flask ]
tools: [ browser, network, repeater, code ]
source_visible: false
date: 2026-08-17T16:21:14.557Z
tags: [ sql, injection, flask, sqlite ]
wasmModule: /challenge/staff-only/runtime.wasm
```

**White-box, FastAPI, `source_files` — `platform/challenge/just-a-preview/challenge.yaml`**

```yaml
number: 8
difficulty: easy
category: web
backend: fastapi
app: app.py
packages: []
tools: [ browser, network, repeater, code ]
source_visible: true
source_files: [ /templates/layout.html, /templates/index.html, /templates/detail.html, /templates/preview.html, /templates/_editor.html, /templates/missing.html, /static/app.css ]
date: 2026-09-06T09:23:32.337Z
tags: [ ssti, template-injection, jinja2, fastapi ]
wasmModule: /challenge/just-a-preview/runtime.wasm
```

**White-box, Flask, extra packages and `source_files` — `platform/challenge/selected-excerpts/challenge.yaml`**

```yaml
number: 10
difficulty: medium
category: web
backend: flask
app: app.py
packages: [ flask ]
tools: [ browser, network, repeater, code ]
source_visible: true
source_files: [ /workspace.py, /revisions.py, /course_pack.py, /templates/base.html, /templates/workbench.html, /templates/article.html, /templates/preview.html, /templates/course-pack.html, /templates/missing.html, /static/app.css ]
date: 2026-09-13T13:28:46.765Z
tags: [ idor, access-control, ssti, template-injection, jinja2, flask ]
wasmModule: /challenge/selected-excerpts/runtime.wasm
```

**Briefs.** Upstream's primary is `zh-TW` (Q8), so the primary briefs are
`platform/zh-TW/challenge/<slug>/index.md` and the translations `platform/en/challenge/<slug>/index.md`.
Frontmatter of each, keys in source order (title, layout, description); the bodies are unchanged:

```yaml
# platform/zh-TW/challenge/door-is-open/index.md
---
title: 知的必要
layout: challenge
description: 針對 FileHub 的黑箱滲透測試委託。這家檔案分享服務在產品頁上保證，某個帳號上傳的檔案只有該帳號讀得到。
---
# platform/en/challenge/door-is-open/index.md
---
title: Need to Know
layout: challenge
description: A black-box engagement against FileHub, a file-sharing service whose product page promises that a file uploaded by one account is readable only by that account.
---
```

| Slug | zh-TW `title` | en `title` | `description` |
|---|---|---|---|
| `staff-only` | 僅限員工 | Staff Only | each locale's current `description` line, unchanged |
| `just-a-preview` | 只是預覽而已 | Just a Preview | same |
| `selected-excerpts` | 精選節錄 | Selected Excerpts | same |

**A new challenge from `create:challenge`** (`--name stage8-decl --backend flask`, number 11 for
illustration, `P = zh-TW`, no `--title`):

```yaml
# platform/challenge/stage8-decl/challenge.yaml (before keygen adds wasmModule as the last key)
number: 11
difficulty: easy
category: web
backend: flask
app: app.py
packages: []
date: 2026-11-20T08:00:00.000Z
tags: []
```

```markdown
---
title: 未命名題目（stage8-decl）
layout: challenge
---

# 未命名題目（stage8-decl）

TODO：在這裡寫說明頁內文。
```

With `P = en` the brief is `platform/en/challenge/stage8-decl/index.md`, title `Stage8 Decl`, body
placeholder `TODO: Write challenge description here.` (today's text).

### Y-§2.5 Canonical messages (this repository's own output; pinned by unit tests)

`<path>` is repository-relative with `/` separators. `<keys>` lists offending keys comma-separated,
in the order they appear in the file.

| Id | Where | Text |
|---|---|---|
| VM1 | validate `declaration` | `platform/challenge/<slug>/challenge.yaml not found` |
| VM2 | validate `declaration` | `challenge.yaml is not a YAML mapping` |
| VM3 | validate `declaration` | `invalid YAML in challenge.yaml: <parser message>` |
| VM4 | validate `declaration` | `challenge.yaml holds more than one YAML document` |
| VM5 | validate `declaration` | `challenge.yaml carries brief key(s) <keys>; title, description and layout belong in each brief's frontmatter` |
| VM6 | validate `brief (<L>)` | `<path> carries key(s) <keys> that a brief may not carry; a brief holds only title, description and layout, and the challenge declaration belongs in platform/challenge/<slug>/challenge.yaml` |
| VM7 | validate `brief (<L>)` | `<path>: title must be a non-empty string` |
| VM8 | validate `brief (<L>)` | `<path>: layout must be challenge` |
| VM9 | validate `brief (<L>)` | `<path>: description must be a string` |
| VM10 | validate `brief (<P>)` | `<path> not found; every challenge has a brief in the primary locale (<P>)` |
| VM12 | validate `app` (declaration) | `app must be a string, got <typeof>` |
| VM13 | validate `structure` | `platform/challenge/<slug>/ holds <entries>; a challenge directory holds only src/ and challenge.yaml` — `<entries>` the stray entry names, comma-separated, sorted by UTF-16 code unit; dot-prefixed names are never listed (D117) |
| VM14 | validate `brief (<L>)` | `<path>: no YAML frontmatter found` (Y29) |
| VM15 | validate `brief (<L>)` | `<path>: invalid YAML: <parser message>` (Y29) |
| PL-E13 | build | `PL-E13: <brief path>: no platform/challenge/<slug>/challenge.yaml for this brief` |
| PL-E14 | build | `PL-E14: platform/challenge/<slug>/challenge.yaml: not one YAML mapping (<reason>)` |
| PL-E15 | build | `PL-E15: <brief path>: a brief may carry only title, description and layout, found <keys>` |
| PL-E16 | build | `PL-E16: platform/challenge/<slug>/challenge.yaml: carries brief key(s) <keys>` |
| PL-E17 | build | `PL-E17: <brief path>: a brief must set layout: challenge` |
| PL-E18 | build | `PL-E18: <page path>: layout: challenge is only for platform/<locale>/challenge/<slug>/index.md` |
| KG1 | keygen | `[warn] <slug>: deprecated field '<key>' found — will be removed` (today's text; `fs` joins) |
| CC1 | `create:challenge` collision | `Error: Challenge "<slug>" already exists: <path>/` |
| RT1 | `challenge:retype` not found | `Challenge <slug> not found at <absolute path of challenge.yaml>` |
| VF1 | verify L1, L2 | `challenge.yaml not found: <absolute path>` |
| LS1 | lint-staged | `incomplete challenge (missing challenge.yaml)` |
| PP1 | `buildPlayerPackage` | `buildPlayerPackage: brief not found for slug <slug> (<absolute path>)` |
| GD1 | the two-locale guard (A31, D33) | `The line and the mark are two-locale strings (D33), but the locale list has <n> members, not 2; parameterise them in the Japanese (ja) epic.` — `<n>` the list's length; the sentence reads alike for a list shorter or longer than two (revision 2 self-check, RV2-22) |

VM11 is retired (N9) and never reused.

Existing messages kept verbatim and only re-homed (they now read `challenge.yaml`): every
`validateChallengeConfig` error for `backend`, `source_visible`, `source_files`, `tools`, `flag`, and
`missing required field: <key>` for `backend` and `app`; validate's `number`, `app`, `flag`,
`flag-length`, `flag-shape`, `tools`, `.fsignore` checks, except that the number check's
"no `number` in frontmatter" becomes "no `number` in challenge.yaml".

### Build error codes (PL-E01–PL-E18)

All are instances of one error class (`SiteLayoutError`, `code` property equal to the code; D113).
The first line is fixed below. `<list>` is `en, zh-TW` (the locale list, comma-space joined, in list
order); `<json>` is the value quoted by the site's message quoting (D140, equal to create-wxl's
`jsonStringifyEscaped`: `JSON.stringify`, its short escapes `\b`, `\f`, `\r` and `\t` rewritten
`\uXXXX` with a line feed kept as `\n`, then every DEL and C1 character written `\uXXXX`; a value it
cannot write is printed as its type name).
Paths are repository-relative with `/` separators, quoted per code: in PL-E07–PL-E09 every list line
is the quoted path; in PL-E10 the path is quoted as shown; in PL-E11 and PL-E12 `<page>` is the quoted
source path (relative to `platform/`, vocabulary); in PL-E13–PL-E18 paths are bare. A violating path list follows the first line, one path per
line, each indented two spaces. The quoting escapes every C0, DEL and C1 character, so no control
character reaches the terminal raw through a quoted field (PL-E05–PL-E12); PL-E13–PL-E18 print paths
and `<keys>` bare, so a control character in a folder name or a frontmatter key reaches the terminal
raw there (B-T2 and the spec's TB2 record it as not protected; RV2-03); bidirectional formatting characters are printed
as they are (D140). Layout errors are English,
like the existing `SITE_BASE` error (D17).

| Code | Raised by | When | First line (exact) |
|---|---|---|---|
| PL-E01 | `readPrimaryLocale`; the hook's index read (D114) | `lstat('range.json')` succeeds and is not a regular file (directory, symbolic link — not followed — FIFO, socket, device); in the index, an entry of mode `120000` or `160000` | `PL-E01: range.json is not a regular file; the build reads "primaryLocale" from range.json at the repository root and does not follow a symbolic link.` |
| PL-E02 | same | `lstat` fails with a code other than `ENOENT`, or reading the regular file fails; `git show :range.json` fails for an entry that exists | `PL-E02: range.json could not be read (<errno code>).` — `<errno code>` is the error's `code` (e.g. `EACCES`), or `unknown` when it has none |
| PL-E03 | `parsePrimaryLocale` | The text is not JSON by `JSON.parse` (empty file, a UTF-8 BOM before the JSON, comments, trailing text) | `PL-E03: range.json is not valid JSON.` |
| PL-E04 | same | The JSON value is not an object: `null`, an array, a string, a number, a boolean | `PL-E04: range.json does not hold a JSON object.` |
| PL-E05 | same | Own property `primaryLocale` exists and is not a string | `PL-E05: "primaryLocale" in range.json is not a string: <json>.` |
| PL-E06 | same | `primaryLocale` is a string not on the locale list (exact, case-sensitive, no trimming) | `PL-E06: "primaryLocale" in range.json is <json>, which is not on the locale list: <list>.` |
| PL-E07 | `checkSourceLayout` | A symbolic link in the searched area (including a locale folder itself) | `PL-E07: these paths are symbolic links where the build looks for pages; replace each with the file or folder itself:` |
| PL-E08 | `checkSourceLayout`; the hook's W6d through the same builder | A page outside every locale folder: directly in `platform/`, in `platform/challenge/` outside `<slug>/src/`, or in a folder of `platform/` not named by the locale list | `PL-E08: these pages are outside the locale folders. Every page lives in platform/<locale>/ for a locale on the locale list (<list>); a range on the old layout moves its pages as README.en.md describes in "Moving to the locale folders" (README.md: 「搬到語系資料夾」):` |
| PL-E09 | `checkSourceLayout` | An entry directly inside a locale folder whose name, or whose name minus `.md`, is on the locale list | `PL-E09: these entries of a locale folder are named like a locale on the locale list (<list>); their URLs would collide with that locale's prefix:` |
| PL-E10 | `checkSourceLayout` | `platform/<P>/index.md` is not a page (missing, or the folder is missing) | `PL-E10: the primary locale <code> has no home page: "platform/<code>/index.md" is missing.` |
| PL-E11 | `primaryFolderLinks` | A markdown link in a page resolves to a base-less URL path whose first segment is `P` | `PL-E11: <page> links to <href>, which names the primary locale's folder (<code>/); the primary locale's pages are served without it.` — `<page>` the source path quoted, `<href>` the link as written, quoted |
| PL-E12 | `localizeHomeLinks` | A home-page link is not a string, starts with `//` (D141), is relative, carries a listed locale's prefix, or names no page; tested in D141's order: not a string, `//`, then links with a scheme or a leading `#` set aside unchecked, then relative, prefix, no page (RV2-13, SC2-09) | `PL-E12: <page> has <field> <json>, which <reason>.` — `<field>` is `hero.actions[<i>].link` or `features[<i>].link`, the only fields read (D13); example: `PL-E12: "zh-TW/index.md" has hero.actions[0].link "/zh-TW/challenges/", which already carries a locale prefix; write it from the locale's home page, the build adds the prefix.`; `<reason>` one of: `is not a string`; `is a protocol-relative link; write a site link from the locale's home page, or an external link with its scheme` (D141); `is a relative link; write it from the locale's home page, such as "/guide/"`; `already carries a locale prefix; write it from the locale's home page, the build adds the prefix`; `does not name a published page` |
| PL-E13 | `assembleChallengeFrontmatter` | A brief path with `layout: challenge` whose `challenge.yaml` is absent | `PL-E13: <brief path>: no platform/challenge/<slug>/challenge.yaml for this brief` |
| PL-E14 | same | `challenge.yaml` is not one YAML mapping | `PL-E14: platform/challenge/<slug>/challenge.yaml: not one YAML mapping (<reason>)` — `<reason>` the `readChallengeDeclaration` reason: `invalid-yaml`, `multi-document` or `not-a-mapping` |
| PL-E15 | same | A brief's frontmatter carries a key outside the brief keys | `PL-E15: <brief path>: a brief may carry only title, description and layout, found <keys>` |
| PL-E16 | same | `challenge.yaml` carries a brief key | `PL-E16: platform/challenge/<slug>/challenge.yaml: carries brief key(s) <keys>` |
| PL-E17 | same | A brief path without `layout: challenge` | `PL-E17: <brief path>: a brief must set layout: challenge` |
| PL-E18 | same | `layout: challenge` on any other source path | `PL-E18: <page path>: layout: challenge is only for platform/<locale>/challenge/<slug>/index.md` |

In PL-E13–PL-E18 `<brief path>` and `<page path>` are bare repository-relative paths and `<keys>`
lists the offending keys comma-separated in file order. Order of checks in one configuration
evaluation: `SITE_BASE` (existing), PL-E01→PL-E06, PL-E07→PL-E10 (D6). PL-E11–PL-E18 are raised while
pages render; when several pages fail, the build fails and reports at least one of them (which one
first is not specified).

### Schema: locales config (0010-S4)

`localesConfig('en')` is today's literal. `localesConfig('zh-TW')`:

```json
{
  "root": {
    "label": "繁體中文", "lang": "zh-TW",
    "themeConfig": {
      "nav": [
        { "text": "首頁", "link": "/" },
        { "text": "挑戰", "link": "/challenges/" },
        { "text": "使用手冊", "link": "/guide/" }
      ],
      "sidebar": { "/guide/": [
        { "text": "快速開始", "link": "/guide/" },
        { "text": "Code 面板", "link": "/guide/python" },
        { "text": "Network 與 Repeater", "link": "/guide/network" },
        { "text": "Browser 面板", "link": "/guide/browser" },
        { "text": "Pentest Notes", "link": "/guide/notes" },
        { "text": "疑難排解", "link": "/guide/troubleshooting" }
      ] }
    }
  },
  "en": {
    "label": "English", "lang": "en-US", "link": "/en/",
    "themeConfig": {
      "nav": [
        { "text": "Home", "link": "/en/" },
        { "text": "Challenges", "link": "/en/challenges/" },
        { "text": "Guide", "link": "/en/guide/" }
      ],
      "sidebar": { "/en/guide/": [
        { "text": "Getting Started", "link": "/en/guide/" },
        { "text": "Code Panel", "link": "/en/guide/python" },
        { "text": "Network & Repeater", "link": "/en/guide/network" },
        { "text": "Browser Panel", "link": "/en/guide/browser" },
        { "text": "Pentest Notes", "link": "/en/guide/notes" },
        { "text": "Troubleshooting", "link": "/en/guide/troubleshooting" }
      ] }
    }
  }
}
```

The nav text 挑戰 is the current string; the glossary marks it as an interface string to change
(題目 entry). Changing it is not this area's; this table only moves it.

### Source path → URL

Every page upstream holds after this epic (Q16 adds the Traditional Chinese reference page, so both
folders hold the same 14). `dist` is the output file under `.vitepress/dist/`. Non-pages have no
URL: `challenge/<slug>/challenge.yaml`, `challenge/<slug>/src/**`, `shared/**`,
`postcss.config.mjs`; `public/**` is copied to the output root as it is (static files, not pages).

| Source path (under `platform/`) | Primary `en`: page-list entry | Primary `zh-TW`: page-list entry |
|---|---|---|
| `en/index.md` | `/` (`index.html`) | `/en/` (`en/index.html`) |
| `en/challenges.md` | `/challenges` | `/en/challenges` |
| `en/guide/index.md` | `/guide/` | `/en/guide/` |
| `en/guide/python.md` | `/guide/python` | `/en/guide/python` |
| `en/guide/network.md` | `/guide/network` | `/en/guide/network` |
| `en/guide/browser.md` | `/guide/browser` | `/en/guide/browser` |
| `en/guide/notes.md` | `/guide/notes` | `/en/guide/notes` |
| `en/guide/troubleshooting.md` | `/guide/troubleshooting` | `/en/guide/troubleshooting` |
| `en/guide/workshop.md` | `/guide/workshop` | `/en/guide/workshop` |
| `en/reference/attack-log-export-format.md` | `/reference/attack-log-export-format` | `/en/reference/attack-log-export-format` |
| `en/challenge/door-is-open/index.md` | `/challenge/door-is-open/` | `/en/challenge/door-is-open/` |
| `en/challenge/just-a-preview/index.md` | `/challenge/just-a-preview/` | `/en/challenge/just-a-preview/` |
| `en/challenge/selected-excerpts/index.md` | `/challenge/selected-excerpts/` | `/en/challenge/selected-excerpts/` |
| `en/challenge/staff-only/index.md` | `/challenge/staff-only/` | `/en/challenge/staff-only/` |
| `zh-TW/index.md` | `/zh-TW/` | `/` |
| `zh-TW/challenges.md` | `/zh-TW/challenges` | `/challenges` |
| `zh-TW/guide/index.md` | `/zh-TW/guide/` | `/guide/` |
| `zh-TW/guide/python.md` | `/zh-TW/guide/python` | `/guide/python` |
| `zh-TW/guide/network.md` | `/zh-TW/guide/network` | `/guide/network` |
| `zh-TW/guide/browser.md` | `/zh-TW/guide/browser` | `/guide/browser` |
| `zh-TW/guide/notes.md` | `/zh-TW/guide/notes` | `/guide/notes` |
| `zh-TW/guide/troubleshooting.md` | `/zh-TW/guide/troubleshooting` | `/guide/troubleshooting` |
| `zh-TW/guide/workshop.md` | `/zh-TW/guide/workshop` | `/guide/workshop` |
| `zh-TW/reference/attack-log-export-format.md` (new) | `/zh-TW/reference/attack-log-export-format` | `/reference/attack-log-export-format` |
| `zh-TW/challenge/door-is-open/index.md` | `/zh-TW/challenge/door-is-open/` | `/challenge/door-is-open/` |
| `zh-TW/challenge/just-a-preview/index.md` | `/zh-TW/challenge/just-a-preview/` | `/challenge/just-a-preview/` |
| `zh-TW/challenge/selected-excerpts/index.md` | `/zh-TW/challenge/selected-excerpts/` | `/challenge/selected-excerpts/` |
| `zh-TW/challenge/staff-only/index.md` | `/zh-TW/challenge/staff-only/` | `/challenge/staff-only/` |

The rewritten path is the entry's file form (`/` → `index.md`, `/guide/` → `guide/index.md`,
`/guide/python` → `guide/python.md`); the output file is that path with `.md` → `.html`. With
primary `en` the entries equal today's 27 plus `/zh-TW/reference/attack-log-export-format`.

### Home-page links (0010-S7), upstream

| Source | Field | Written | Primary `en` | Primary `zh-TW` |
|---|---|---|---|---|
| `en/index.md` | `hero.actions[0].link` | `/challenges/` | `/challenges/` | `/en/challenges/` |
| `en/index.md` | `hero.actions[1].link` | `/guide/` | `/guide/` | `/en/guide/` |
| `zh-TW/index.md` | `hero.actions[0].link` | `/challenges/` (today `/zh-TW/challenges/`) | `/zh-TW/challenges/` | `/challenges/` |
| `zh-TW/index.md` | `hero.actions[1].link` | `/guide/` (today `/zh-TW/guide/`) | `/zh-TW/guide/` | `/guide/` |

Rendered `href`s carry the site base as VitePress adds it (`normalizeLink` → `withBase`).
`hero.image` and `features[i].icon.src` are public files and are not home-page links. Upstream's
`features` entries carry no `link`; a `features[<i>].link` a teacher adds is handled as a hero link
(D13, B92).

### A-§4.1 Cold-load decision table (0010-S10, 0010-S13)

Every combination of primary {`en`, `zh-TW`} × arrival kind {primary-locale page, translation page,
three kinds of not-found path} × stored value {none, `en`, `zh-TW`, invalid} × counterpart {exists,
missing}: 80 rows. For a primary-code path (NP), "missing" means neither `/X` nor `/<T>/X` is
listed; `/X` unlisted with `/<T>/X` listed is A39 (D28's fall-through). "invalid" stands for every value under "no preference" in the vocabulary; the
unit tests enumerate at least `fr`, `ja`, `zh-tw`, the empty string and unreadable storage for it.
Every row holds under base `/` and base `/<repo>/` (A7), for a challenge and for an article, with a
query and a hash on the URL. "Redirect" is what happens after the session gate's decision (A6).
"Line" is the line on the page finally shown (for a redirect, on its landing). "Written" is the
cold load's own write. For not-found rows the stored value changes nothing; they are listed in full
because the table is the test's enumeration.

Under `P = en`, rows DT01, DT02, DT07, DT08 (no preference on a primary-locale page: today a
redirect or a `zh-TW` line) and DT25, DT27, DT29, DT31 (`/en/…` not found with `/…` listed: today the
not-found page) differ from spec 0008; every other `P = en` row equals 0008's outcome.

| DT | Primary P (T) | Arrival | Stored value | Counterpart | Redirect | Requested | Line | Written |
|---|---|---|---|---|---|---|---|---|
| DT01 | `en` (`zh-TW`) | PP: primary-locale page `/X` | none | exists | none | `en` (page's own) | none | no |
| DT02 | `en` (`zh-TW`) | PP: primary-locale page `/X` | none | missing | none | `en` (page's own) | none | no |
| DT03 | `en` (`zh-TW`) | PP: primary-locale page `/X` | en | exists | none | `en` | none | no |
| DT04 | `en` (`zh-TW`) | PP: primary-locale page `/X` | en | missing | none | `en` | none | no |
| DT05 | `en` (`zh-TW`) | PP: primary-locale page `/X` | zh-TW | exists | `/zh-TW/X` (replace) | `zh-TW` (carried) | none | no |
| DT06 | `en` (`zh-TW`) | PP: primary-locale page `/X` | zh-TW | missing | none | `zh-TW` | `zh-TW` | no |
| DT07 | `en` (`zh-TW`) | PP: primary-locale page `/X` | invalid | exists | none | `en` (page's own) | none | no |
| DT08 | `en` (`zh-TW`) | PP: primary-locale page `/X` | invalid | missing | none | `en` (page's own) | none | no |
| DT09 | `en` (`zh-TW`) | TP: translation page `/T/X` | none | exists | none | `zh-TW` (prefix) | none | `zh-TW` (0008 W6 if refused) |
| DT10 | `en` (`zh-TW`) | TP: translation page `/T/X` | none | missing | none | `zh-TW` (prefix) | none | `zh-TW` (0008 W6 if refused) |
| DT11 | `en` (`zh-TW`) | TP: translation page `/T/X` | en | exists | none | `zh-TW` (prefix) | none | `zh-TW` (0008 W6 if refused) |
| DT12 | `en` (`zh-TW`) | TP: translation page `/T/X` | en | missing | none | `zh-TW` (prefix) | none | `zh-TW` (0008 W6 if refused) |
| DT13 | `en` (`zh-TW`) | TP: translation page `/T/X` | zh-TW | exists | none | `zh-TW` (prefix) | none | `zh-TW` (0008 W6 if refused) |
| DT14 | `en` (`zh-TW`) | TP: translation page `/T/X` | zh-TW | missing | none | `zh-TW` (prefix) | none | `zh-TW` (0008 W6 if refused) |
| DT15 | `en` (`zh-TW`) | TP: translation page `/T/X` | invalid | exists | none | `zh-TW` (prefix) | none | `zh-TW` (0008 W6 if refused) |
| DT16 | `en` (`zh-TW`) | TP: translation page `/T/X` | invalid | missing | none | `zh-TW` (prefix) | none | `zh-TW` (0008 W6 if refused) |
| DT17 | `en` (`zh-TW`) | NT: not-found translation path `/T/X` | none | exists | `/X` (replace) | `zh-TW` (path's own, carried) | `zh-TW` | no |
| DT18 | `en` (`zh-TW`) | NT: not-found translation path `/T/X` | none | missing | none: not-found page | — | none | no |
| DT19 | `en` (`zh-TW`) | NT: not-found translation path `/T/X` | en | exists | `/X` (replace) | `zh-TW` (path's own, carried) | `zh-TW` | no |
| DT20 | `en` (`zh-TW`) | NT: not-found translation path `/T/X` | en | missing | none: not-found page | — | none | no |
| DT21 | `en` (`zh-TW`) | NT: not-found translation path `/T/X` | zh-TW | exists | `/X` (replace) | `zh-TW` (path's own, carried) | `zh-TW` | no |
| DT22 | `en` (`zh-TW`) | NT: not-found translation path `/T/X` | zh-TW | missing | none: not-found page | — | none | no |
| DT23 | `en` (`zh-TW`) | NT: not-found translation path `/T/X` | invalid | exists | `/X` (replace) | `zh-TW` (path's own, carried) | `zh-TW` | no |
| DT24 | `en` (`zh-TW`) | NT: not-found translation path `/T/X` | invalid | missing | none: not-found page | — | none | no |
| DT25 | `en` (`zh-TW`) | NP: not-found primary-code path `/P/X` (R22) | none | exists | `/X` (replace) | `en` (path's own, carried) | none | no |
| DT26 | `en` (`zh-TW`) | NP: not-found primary-code path `/P/X` (R22) | none | missing | none: not-found page | — | none | no |
| DT27 | `en` (`zh-TW`) | NP: not-found primary-code path `/P/X` (R22) | en | exists | `/X` (replace) | `en` (path's own, carried) | none | no |
| DT28 | `en` (`zh-TW`) | NP: not-found primary-code path `/P/X` (R22) | en | missing | none: not-found page | — | none | no |
| DT29 | `en` (`zh-TW`) | NP: not-found primary-code path `/P/X` (R22) | zh-TW | exists | `/X` (replace) | `en` (path's own, carried) | none | no |
| DT30 | `en` (`zh-TW`) | NP: not-found primary-code path `/P/X` (R22) | zh-TW | missing | none: not-found page | — | none | no |
| DT31 | `en` (`zh-TW`) | NP: not-found primary-code path `/P/X` (R22) | invalid | exists | `/X` (replace) | `en` (path's own, carried) | none | no |
| DT32 | `en` (`zh-TW`) | NP: not-found primary-code path `/P/X` (R22) | invalid | missing | none: not-found page | — | none | no |
| DT33 | `en` (`zh-TW`) | NU: not-found primary path `/X` | none | exists | `/zh-TW/X` (replace) | `en` (path's own, carried) | `en` | no |
| DT34 | `en` (`zh-TW`) | NU: not-found primary path `/X` | none | missing | none: not-found page | — | none | no |
| DT35 | `en` (`zh-TW`) | NU: not-found primary path `/X` | en | exists | `/zh-TW/X` (replace) | `en` (path's own, carried) | `en` | no |
| DT36 | `en` (`zh-TW`) | NU: not-found primary path `/X` | en | missing | none: not-found page | — | none | no |
| DT37 | `en` (`zh-TW`) | NU: not-found primary path `/X` | zh-TW | exists | `/zh-TW/X` (replace) | `en` (path's own, carried) | `en` | no |
| DT38 | `en` (`zh-TW`) | NU: not-found primary path `/X` | zh-TW | missing | none: not-found page | — | none | no |
| DT39 | `en` (`zh-TW`) | NU: not-found primary path `/X` | invalid | exists | `/zh-TW/X` (replace) | `en` (path's own, carried) | `en` | no |
| DT40 | `en` (`zh-TW`) | NU: not-found primary path `/X` | invalid | missing | none: not-found page | — | none | no |
| DT41 | `zh-TW` (`en`) | PP: primary-locale page `/X` | none | exists | none | `zh-TW` (page's own) | none | no |
| DT42 | `zh-TW` (`en`) | PP: primary-locale page `/X` | none | missing | none | `zh-TW` (page's own) | none | no |
| DT43 | `zh-TW` (`en`) | PP: primary-locale page `/X` | en | exists | `/en/X` (replace) | `en` (carried) | none | no |
| DT44 | `zh-TW` (`en`) | PP: primary-locale page `/X` | en | missing | none | `en` | `en` | no |
| DT45 | `zh-TW` (`en`) | PP: primary-locale page `/X` | zh-TW | exists | none | `zh-TW` | none | no |
| DT46 | `zh-TW` (`en`) | PP: primary-locale page `/X` | zh-TW | missing | none | `zh-TW` | none | no |
| DT47 | `zh-TW` (`en`) | PP: primary-locale page `/X` | invalid | exists | none | `zh-TW` (page's own) | none | no |
| DT48 | `zh-TW` (`en`) | PP: primary-locale page `/X` | invalid | missing | none | `zh-TW` (page's own) | none | no |
| DT49 | `zh-TW` (`en`) | TP: translation page `/T/X` | none | exists | none | `en` (prefix) | none | `en` (0008 W6 if refused) |
| DT50 | `zh-TW` (`en`) | TP: translation page `/T/X` | none | missing | none | `en` (prefix) | none | `en` (0008 W6 if refused) |
| DT51 | `zh-TW` (`en`) | TP: translation page `/T/X` | en | exists | none | `en` (prefix) | none | `en` (0008 W6 if refused) |
| DT52 | `zh-TW` (`en`) | TP: translation page `/T/X` | en | missing | none | `en` (prefix) | none | `en` (0008 W6 if refused) |
| DT53 | `zh-TW` (`en`) | TP: translation page `/T/X` | zh-TW | exists | none | `en` (prefix) | none | `en` (0008 W6 if refused) |
| DT54 | `zh-TW` (`en`) | TP: translation page `/T/X` | zh-TW | missing | none | `en` (prefix) | none | `en` (0008 W6 if refused) |
| DT55 | `zh-TW` (`en`) | TP: translation page `/T/X` | invalid | exists | none | `en` (prefix) | none | `en` (0008 W6 if refused) |
| DT56 | `zh-TW` (`en`) | TP: translation page `/T/X` | invalid | missing | none | `en` (prefix) | none | `en` (0008 W6 if refused) |
| DT57 | `zh-TW` (`en`) | NT: not-found translation path `/T/X` | none | exists | `/X` (replace) | `en` (path's own, carried) | `en` | no |
| DT58 | `zh-TW` (`en`) | NT: not-found translation path `/T/X` | none | missing | none: not-found page | — | none | no |
| DT59 | `zh-TW` (`en`) | NT: not-found translation path `/T/X` | en | exists | `/X` (replace) | `en` (path's own, carried) | `en` | no |
| DT60 | `zh-TW` (`en`) | NT: not-found translation path `/T/X` | en | missing | none: not-found page | — | none | no |
| DT61 | `zh-TW` (`en`) | NT: not-found translation path `/T/X` | zh-TW | exists | `/X` (replace) | `en` (path's own, carried) | `en` | no |
| DT62 | `zh-TW` (`en`) | NT: not-found translation path `/T/X` | zh-TW | missing | none: not-found page | — | none | no |
| DT63 | `zh-TW` (`en`) | NT: not-found translation path `/T/X` | invalid | exists | `/X` (replace) | `en` (path's own, carried) | `en` | no |
| DT64 | `zh-TW` (`en`) | NT: not-found translation path `/T/X` | invalid | missing | none: not-found page | — | none | no |
| DT65 | `zh-TW` (`en`) | NP: not-found primary-code path `/P/X` (R22) | none | exists | `/X` (replace) | `zh-TW` (path's own, carried) | none | no |
| DT66 | `zh-TW` (`en`) | NP: not-found primary-code path `/P/X` (R22) | none | missing | none: not-found page | — | none | no |
| DT67 | `zh-TW` (`en`) | NP: not-found primary-code path `/P/X` (R22) | en | exists | `/X` (replace) | `zh-TW` (path's own, carried) | none | no |
| DT68 | `zh-TW` (`en`) | NP: not-found primary-code path `/P/X` (R22) | en | missing | none: not-found page | — | none | no |
| DT69 | `zh-TW` (`en`) | NP: not-found primary-code path `/P/X` (R22) | zh-TW | exists | `/X` (replace) | `zh-TW` (path's own, carried) | none | no |
| DT70 | `zh-TW` (`en`) | NP: not-found primary-code path `/P/X` (R22) | zh-TW | missing | none: not-found page | — | none | no |
| DT71 | `zh-TW` (`en`) | NP: not-found primary-code path `/P/X` (R22) | invalid | exists | `/X` (replace) | `zh-TW` (path's own, carried) | none | no |
| DT72 | `zh-TW` (`en`) | NP: not-found primary-code path `/P/X` (R22) | invalid | missing | none: not-found page | — | none | no |
| DT73 | `zh-TW` (`en`) | NU: not-found primary path `/X` | none | exists | `/en/X` (replace) | `zh-TW` (path's own, carried) | `zh-TW` | no |
| DT74 | `zh-TW` (`en`) | NU: not-found primary path `/X` | none | missing | none: not-found page | — | none | no |
| DT75 | `zh-TW` (`en`) | NU: not-found primary path `/X` | en | exists | `/en/X` (replace) | `zh-TW` (path's own, carried) | `zh-TW` | no |
| DT76 | `zh-TW` (`en`) | NU: not-found primary path `/X` | en | missing | none: not-found page | — | none | no |
| DT77 | `zh-TW` (`en`) | NU: not-found primary path `/X` | zh-TW | exists | `/en/X` (replace) | `zh-TW` (path's own, carried) | `zh-TW` | no |
| DT78 | `zh-TW` (`en`) | NU: not-found primary path `/X` | zh-TW | missing | none: not-found page | — | none | no |
| DT79 | `zh-TW` (`en`) | NU: not-found primary path `/X` | invalid | exists | `/en/X` (replace) | `zh-TW` (path's own, carried) | `zh-TW` | no |
| DT80 | `zh-TW` (`en`) | NU: not-found primary path `/X` | invalid | missing | none: not-found page | — | none | no |

### A-§4.3 Switcher on a page (SW rows, for A21)

"Line" is shown at once (0008 D17). Every row: the choice is written (0008 W1); base kept on navigation (0008 B3);
storage refusing keeps it for the tab (0008 B6).

| SW | `P` (`T`) | Page | Chosen | Counterpart | Decision | Line |
|---|---|---|---|---|---|---|
| SW01 | `en` (`zh-TW`) | primary-locale `/X` | `zh-TW` | `/zh-TW/X` listed | navigate (push) to `/zh-TW/X` | — |
| SW02 | `en` (`zh-TW`) | primary-locale `/X` | `zh-TW` | not listed | stay, no history entry, URL and interface unchanged | `zh-TW` |
| SW03 | `en` (`zh-TW`) | primary-locale `/X` | `en` (own) | — | stay; removes a shown line | none |
| SW04 | `en` (`zh-TW`) | translation `/zh-TW/X` | `en` | `/X` listed | navigate to `/X` | — |
| SW05 | `en` (`zh-TW`) | translation `/zh-TW/X` | `en` | not listed (translation-only page) | stay | `en` |
| SW06 | `en` (`zh-TW`) | translation `/zh-TW/X` | `zh-TW` (own) | — | stay; removes a shown line | none |
| SW07 | `zh-TW` (`en`) | primary-locale `/X` | `en` | `/en/X` listed | navigate (push) to `/en/X` | — |
| SW08 | `zh-TW` (`en`) | primary-locale `/X` | `en` | not listed | stay | `en` |
| SW09 | `zh-TW` (`en`) | primary-locale `/X` | `zh-TW` (own) | — | stay; removes a shown line | none |
| SW10 | `zh-TW` (`en`) | translation `/en/X` | `zh-TW` | `/X` listed | navigate to `/X` | — |
| SW11 | `zh-TW` (`en`) | translation `/en/X` | `zh-TW` | not listed (translation-only page) | stay | `zh-TW` |
| SW12 | `zh-TW` (`en`) | translation `/en/X` | `en` (own) | — | stay; removes a shown line | none |
| SW13 | `en` | not-found page or failed load | either | lookup counterpart listed | navigate to it (0008 B7) | never |
| SW14 | `en` | not-found page or failed load | either | none | stay | never |
| SW15 | `zh-TW` | not-found page or failed load | either | lookup counterpart listed | navigate to it (0008 B7) | never |
| SW16 | `zh-TW` | not-found page or failed load | either | none | stay | never |

### L-§4.1 Merge type × boundary (0010-S17)

For each slug, with `B(L)` = "a brief exists in locale folder `L`" and `D` = "a readable declaration":

| Case | B(P) | B(T) | D | List for `P` | List for `T` |
|---|---|---|---|---|---|
| M-a | yes | yes | yes | from B(P), `locale P`, URL `/challenge/s/` | from B(T), `locale T`, URL `/T/challenge/s/` |
| M-b | yes | no | yes | from B(P) | borrowed from B(P), `locale P`, URL `/challenge/s/`, mark |
| M-c | no | yes | yes/no | absent | absent (orphan) |
| M-d | no | no | yes | absent | absent |
| M-e | yes | any | no / unreadable | loader fails PL-E13 / PL-E14 (D56) | same |

Each case under `P = en` and `P = zh-TW`, and with a three-member fixture `locales = ['en','zh-TW','ja']`
(0010-S17 takes `locales` as an argument), where every non-primary list behaves as `T`.

### L-§4.2 Field normalisation (0010-S17)

| Field | Source | Value given | Entry value |
|---|---|---|---|
| `title` | brief used | string / non-string / absent | as written / `default_title` of the list locale / same |
| `description` | brief used | string / non-string / absent | as written / `''` / `''` |
| `number` | declaration | JS number / any other type / absent | as written / `undefined` / `undefined` |
| `difficulty` | declaration | string / non-string / absent | as written / `'mystery'` / `'mystery'` |
| `category` | declaration | string / non-string / absent | as written / `default_category` of the list locale / same |
| `date` | declaration | string with `Date.parse` finite / string with `Date.parse` NaN / `Date` / other / absent | as written / `null` / `toISOString()` / `null` / `null` |
| `tags` | declaration | array / non-array / absent | its string members in order / `[]` / `[]` |
| `id` | — | — | 1-based position in the slug order |
| `locale` | brief used | — | its locale folder |
| `url` | brief used | — | the page-list entry of its source path (D7, D9), trailing slash, base-less |

### L-§4.3 Schema: challenge lists (0010-S17, 0010-S18)

```ts
// platform/shared/challenges.data.ts
import type { Locale } from '<locale-list module>'          // the locale list module (D4)
export interface ChallengeData {
  id: number              // 1-based position in the slug order (D41); no longer from frontmatter
  number?: number
  title: string
  url: string             // base-less page-list entry of the brief used
  locale: Locale          // the brief's locale folder; ≠ list locale only for a borrowed entry
  difficulty: string      // as declared, or 'mystery'
  category: string
  date: string | null
  tags: string[]
  description: string
}
export interface ChallengeLists extends Record<Locale, ChallengeData[]> {}
declare const data: ChallengeLists
```

Upstream (`P = zh-TW`), plus a stage-8-style primary-only challenge `zh-only` numbered 999:

```json
{
  "zh-TW": [
    { "id": 1, "number": 1, "title": "知的必要", "url": "/challenge/door-is-open/", "locale": "zh-TW",
      "difficulty": "easy", "category": "web", "date": "2026-04-02T08:54:17.674Z",
      "tags": ["idor", "access-control", "fastapi", "sqlite"], "description": "針對 FileHub 的黑箱滲透測試委託。…" },
    { "id": 5, "number": 999, "title": "只有中文的題目", "url": "/challenge/zh-only/", "locale": "zh-TW", "…": "…" }
  ],
  "en": [
    { "id": 1, "number": 1, "title": "Need to Know", "url": "/en/challenge/door-is-open/", "locale": "en", "…": "…" },
    { "id": 5, "number": 999, "title": "只有中文的題目", "url": "/challenge/zh-only/", "locale": "zh-TW",
      "category": "web", "…": "…" }
  ]
}
```

(`id` 5: slug order is `door-is-open`, `just-a-preview`, `selected-excerpts`, `staff-only`, `zh-only`.)
Under `P = en` the same tree after the layout move gives `en` URLs `/challenge/<slug>/` and `zh-TW`
URLs `/zh-TW/challenge/<slug>/`.

The merge's input (0010-S17), built by the loader (0010-S18):

```ts
interface BriefInput {
  locale: Locale          // the locale folder of the brief's source path
  slug: string            // the brief's directory name
  url: string             // the page-list entry of the brief's source path (D39)
  frontmatter: Record<string, unknown> // the brief's own frontmatter (only title, description are read)
}
type DeclarationRead = ReturnType<typeof readChallengeDeclaration> // 0010-S32:
  // { ok: true, path, value } | { ok: false, path, reason: 'absent' | 'not-a-mapping' | 'invalid-yaml' | 'multi-document', detail }
declare function mergeLocaleChallenges(input: {
  briefs: readonly BriefInput[]
  declarations: ReadonlyMap<string, DeclarationRead> // one entry per slug that has a brief or a challenge directory
  locales: readonly Locale[]                          // LOCALES
  primary: Locale
}): ChallengeLists
```

A listed challenge (one with a primary brief, D38) whose `DeclarationRead` is not `ok` makes the
merge throw D56's PL-E13 (`absent`) or PL-E14 (otherwise) error; an unlisted one's read is ignored.
Example: `briefs: [{ locale: 'zh-TW', slug: 'door-is-open', url: '/challenge/door-is-open/',
frontmatter: { title: '知的必要', layout: 'challenge', description: '…' } }]`,
`declarations: Map { 'door-is-open' → { ok: true, path: 'platform/challenge/door-is-open/challenge.yaml', value: { number: 1, … } } }`,
`locales: ['en', 'zh-TW']`, `primary: 'zh-TW'` → the first entry of each list above.

Loader `watch` (relative to `platform/shared/`): `../<code>/challenge/*/index.md` for every code in
`LOCALES`, in list order, then `../challenge/*/challenge.yaml`.

### L-§4.4 Canonical strings (0010-S19, 0010-S8) — T-0060 and D47

"Value" means the string table of the list locale (`messages[<locale>][key]`); tests read the tables,
not literals, and also assert the other table's value is absent (every pair below differs).

| # | Element (selector) | Source after this epic | Today, `zh-TW` list static HTML | Today, after hydration |
|---|---|---|---|---|
| CS1 | `h1` | list page frontmatter `title` (`Challenges` / `挑戰`) | `Challenges` (literal) | same |
| CS2 | subtitle `header p` | list page frontmatter `subtitle` (`Choose a challenge to begin` / `選一道題目開始`; not `description`, D44) | literal English | same |
| CS3 | search `placeholder` | `challenge_list.search_placeholder` | English | English (props not re-applied) |
| CS4 | difficulty select, option `value=""` | `challenge_list.all_difficulties` | English | zh-TW |
| CS5 | category select, option `value=""` | `challenge_list.all_categories` | English | zh-TW |
| CS6 | sort select, 4 options | `challenge_list.sort_by_{id,difficulty,category,date}` | English | zh-TW |
| CS7 | sort-direction button `title` | `challenge_list.sort_dir_asc` / `sort_dir_desc` (by state) | English | English |
| CS8 | grid / list buttons `title` | `challenge_list.view_mode_grid` / `view_mode_list` | English | English |
| CS9 | result count suffix | `challenge_list.count_suffix` | English | zh-TW |
| CS10 | empty state `p` | `challenge_list.empty_state` | (not rendered while the list is non-empty) | zh-TW |
| CS11 | row and card date | D45 | `en-US`, machine zone | `zh-TW`, reader's zone |
| CS12 | difficulty options; badges; category options | D46 literals / declared values | unchanged | unchanged |
| CS13 | mark, progress summary, blocked, read error, retry, done badge, copy control texts | already page-locale strings (0008, 0007) | correct | correct |
| CH1 | `home_content.about_heading`, `about_paragraph`, `stats_heading`, `stats_total_label`, `latest_heading`, `quick_start_heading`, `step1_title`…`step3_desc` | page-locale strings (D47) | English | zh-TW |
| CH2 | home stat labels `Easy` `Medium` `Hard` `Mystery`; card difficulty badge | D46 | unchanged | unchanged |
| CH3 | home card date | D45 | as CS11 | as CS11 |
| LW1 | `console.warn` when the `lists` prop is `undefined`, once per component instance (D40, D131) | `<Component>: the "lists" prop is missing on <relativePath>; pass :lists="data" from ../shared/challenges.data.ts (the "challenges" prop was renamed to "lists").` — `<Component>` is `ChallengeList` or `HomeContent`, `<relativePath>` the page's `relativePath` from `useData()`; English only, a developer message | — | — |

### L-§4.5 Schema: smoke fixture pages (0010-S20)

```md
<!-- platform/en/smoke-fixtures/english-only.md -->
---
title: Smoke fixture — English only
---

# Smoke fixture: English only

This page is published only by a test build (`WXL_SMOKE_PAGES=1`). It has no Traditional Chinese version.
```

```md
<!-- platform/zh-TW/smoke-fixtures/traditional-chinese-only.md -->
---
title: 測試用頁面——只有繁體中文
---

# 測試用頁面：只有繁體中文

這一頁只會出現在測試建置（`WXL_SMOKE_PAGES=1`），沒有英文版。
```

URLs in a test build: `P = zh-TW` → `/en/smoke-fixtures/english-only`, `/smoke-fixtures/traditional-chinese-only`;
`P = en` → `/smoke-fixtures/english-only`, `/zh-TW/smoke-fixtures/traditional-chinese-only`.

Flag value × result: unset, `''`, `'0'`, `'true'`, `' 1'`, `'1 '`, `'01'` → production; `'1'` → test build.

### L-§4.7 `missing-translation.spec.ts` subjects (L38)

`EN_ONLY` / `ZH_ONLY` = the fixture URLs for the build's `P` (L-§4.5). `X(path)` = the path with its
locale segment swapped (counterpart URL that is not a page). Expected outcomes: area A's rows.

| Case today (subject) | New subject(s) | Stored values | Area A row |
|---|---|---|---|
| "a missing translation falls back to the English page" (`/zh-TW` + `REFERENCE`) | `X(ZH_ONLY)` = `/en/smoke-fixtures/traditional-chinese-only`; `X(EN_ONLY)` = `/smoke-fixtures/english-only` | none, `zh-TW`, `en` | A14; D27's primary-path case |
| "the HTML as served carries no line" (`REFERENCE`) | `EN_ONLY`, `ZH_ONLY` | — | 0008 L-rows (line absent from static HTML) |
| "Back after the fallback returns to the page opened before it" | `X(ZH_ONLY)` after `/challenges` | `en` | A20 |
| "at N wide the switcher stays on an English-only article, and the way back removes the line" | `ZH_ONLY` choosing English; `EN_ONLY` choosing 繁體中文 | `zh-TW`; `en` | A21 (SW08/SW09, SW11) |
| "a cold load of an English-only article stays put, with the line" (stored none, `zh-TW`) | `ZH_ONLY` stored `en` (line); `ZH_ONLY` stored none (no line); `EN_ONLY` stored `zh-TW` (no line) | as listed | A4; A1; A5 |
| "a cold load of an English-only article with en stored shows no line" | `ZH_ONLY` stored `zh-TW` | `zh-TW` | A2/A1 (stored = `P`) |

The cases using `/zh-TW/no-such-page` move to `/en/no-such-page` (area A's A17); the others are area A's.

### S-§4.1 Redirect file, `P = zh-TW` (upstream after this epic; no `range.json`, R17)

Upstream's four challenges are translated both ways. Numbered section, in this order (columns padded
by the generator; ACs compare order and the three fields):

```
/c/001        /challenge/door-is-open/        302
/en/c/001     /en/challenge/door-is-open/     302
/zh/c/001     /challenge/door-is-open/        302
/zh-TW/c/001  /challenge/door-is-open/        302
… likewise 002 staff-only, 008 just-a-preview, 010 selected-excerpts
```

A zh-TW-only challenge numbered 5 (`v05-php-check`) would get:

```
/c/005        /challenge/v05-php-check/       302
/en/c/005     /challenge/v05-php-check/       302
/zh/c/005     /challenge/v05-php-check/       302
/zh-TW/c/005  /challenge/v05-php-check/       302
```

Slug section, then the old-address section, always last:

```
/c/:slug        /challenge/:slug/        302
/en/c/:slug     /en/challenge/:slug/     302
/zh/c/:slug     /challenge/:slug/        302
/zh-TW/c/:slug  /challenge/:slug/        302

/zh-TW/*        /:splat                  302
```

### S-§4.2 Redirect file, `P = en` (`range.json` `{"primaryLocale": "en"}`; e.g. a range after the R14 move)

Byte-identical rule lines to today's 0008 schema (door-is-open translated → `/zh/c/001` and
`/zh-TW/c/001` at `/zh-TW/challenge/door-is-open/`; v05 English-only → all four at
`/challenge/v05-php-check/`), the same four slug rules as today, no old-address rule. Only the header
and section comments change (S-§4.4).

### S-§4.3 Orphan reaching the generator (`--no-verify`), both primaries

`P = en`, only `platform/zh-TW/challenge/chinese-only/index.md` and its declaration (number 7):
all four forms → `/zh-TW/challenge/chinese-only/` (was: two rules, 0008 G9).
`P = zh-TW`, only `platform/en/challenge/english-only/index.md` and its declaration (number 7):
all four forms → `/en/challenge/english-only/`.

### S-§4.4 Canonical comment text

Header lines are compared after stripping `# ` and joining with single spaces. `{F}` = form count,
`{N}` = `floor(2000 / F)`, `{P-name}` = display name of `P`.

| Id | Where | Text |
|---|---|---|
| K1 | header, both | `Cloudflare Pages allows 2,000 static and 100 dynamic rules. Every numbered challenge takes one static rule per short-link form, {F} in all, so a range holds at most {N} numbered challenges.` |
| K2 | header, `P = en` | `The slug links take {F} dynamic rules.` |
| K3 | header, `P = zh-TW` | `The slug links take {F} dynamic rules, and the rule for old /zh-TW/ addresses takes 1 more.` |
| K4 | numbered section, both | `Numbered short links, {F} per challenge. A number is assigned once and never reused, so a link printed on a handout keeps pointing at the same challenge even after the challenge is renamed. The copy control gives each locale's own form, /en/c/NNN and /zh-TW/c/NNN; /c/NNN, which opens the primary locale's page, and /zh/c/NNN are kept so links already handed out keep opening. A locale's rules open the {P-name} page, the primary locale's, while the challenge has no page in that locale, or, for a challenge without a primary-locale page, the first locale's page that exists.` followed by today's "These come first on purpose…" paragraph unchanged. |
| K5 | old-address section, `P = zh-TW` | `Addresses under /zh-TW/ from when Traditional Chinese was a translation. This range's primary locale is Traditional Chinese, so its pages are at the root: /zh-TW/<path> goes to /<path>. Last on purpose: every /zh-TW/c/ rule above must match first.` |

### S-§4.5 Canonical hook sentences (0007 W4, 0007 W6 replaced)

`<L-name>`, `<P-name>`: display names. Each line starts `[pre-commit] `.

| Id | When | Text |
|---|---|---|
| W4a | untracked `platform/challenge/<slug>/`, or untracked `platform/<P>/challenge/<slug>/` | `<dir> is untracked, so _redirects leaves it out. To include it, git add it and commit again.` |
| W4b | untracked `platform/<L>/challenge/<slug>/`, `L ≠ P` | `<dir> is untracked, so _redirects does not use it: its challenge's <L-name> short links open the <P-name> page, if there is one. To include it, git add it and commit again.` (On `P = en`, `L = zh-TW` this equals today's text.) |
| W6a | `missing-primary`, from a translation brief | `✗ platform/<L>/challenge/<slug>/ is a <L-name> brief, but the index holds no <P-name> brief platform/<P>/challenge/<slug>/index.md, the primary locale's, so CI would fail this commit.` |
| W6b | `missing-primary`, from a declaration file with no brief in any locale | `✗ platform/challenge/<slug>/challenge.yaml declares a challenge, but the index holds no <P-name> brief platform/<P>/challenge/<slug>/index.md, the primary locale's, so CI would fail this commit.` |
| W6c | `missing-declaration` | `✗ platform/<L>/challenge/<slug>/ is a <L-name> brief, but the index holds no challenge declaration platform/challenge/<slug>/challenge.yaml, so CI would fail this commit.` |
| W6d | `old-layout` | `✗ <path> is outside the locale folders (PL-E08), so CI would fail this commit; move it as README.en.md describes in "Moving to the locale folders".` — built by the same message builder as PL-E08 (D113). |
| W6r | once after any W6a–W6d | A block containing, in this order: `A challenge is platform/challenge/<slug>/ and its briefs under platform/<locale>/challenge/<slug>/`; `delete, rename or retire them together`; `move platform/challenge/<slug>/ to .archive/challenge/<slug>/ and delete its briefs in the same commit (git rm -r platform/<locale>/challenge/<slug>/)`; `If a part exists but is not staged yet, git add it.`; `Nothing was changed.` |

One 0007 W6 line per fault, sorted by slug, then kind in the order W6a, W6b, W6c, W6d, then the
fault's `present` path (UTF-16). A slug has at most one `missing-primary` fault (W6a or W6b) and one
`missing-declaration` fault per brief (W6c each), and may have both kinds (D64, S-§4.7).

### S-§4.6 Type × boundary summary (what the rows below cover)

| Input | Values covered |
|---|---|
| `P` | `en`; `zh-TW` via `range.json`; absent file; file without the key; R19 error (each reason: not a file, not JSON, not an object, not a string, not in the list) |
| per challenge, primary brief | included; not included (missing, untracked, ignored); old layout |
| per challenge, translation brief | included; missing; untracked; ignored |
| declaration file | included with valid number; missing; untracked; malformed YAML; no `number`; `number` not an integer > 0; duplicate number |
| form | `/c/`, `/en/c/`, `/zh/c/`, `/zh-TW/c/`; numbered and slug |
| number width | 1–3 digits (padded to 3), ≥ 4 digits |
| retired folder | none; `challenge.yaml`; legacy `index.md`; both |
| list × entry (copy control) | `en` list, `zh-TW` list × entry translated / borrowed / unnumbered × short / page mode (an orphan translation brief is in no list, D38, so it has no entry) |
| `number` bound | `1`, `999`, `1000`, `Number.MAX_SAFE_INTEGER`; `0`, `-1`, `1.5`, `"1"`, `1e21`, `2**53` (S75, Y104) |

### S-§4.7 Schema: brief faults (0010-S25)

```ts
type Slug = string
interface IndexTrees {
  slugs: Map<'declaration' | Locale, Set<Slug>> // indexSlugs's value: 'declaration' → slugs with
                                                 // platform/challenge/<slug>/challenge.yaml; <L> →
                                                 // slugs with platform/<L>/challenge/<slug>/index.md
  legacyPaths: string[]                          // index paths classifySourcePath calls `outside`
                                                 // under platform/challenge/, sorted (UTF-16)
}
type BriefFault =
  | { kind: 'missing-primary', slug: Slug, present: string, missing: string }
  | { kind: 'missing-declaration', slug: Slug, present: string, missing: string }
  | { kind: 'old-layout', slug: Slug, present: string, missing: null }
declare function indexTrees(paths: readonly string[]): IndexTrees // from `git ls-files -z`'s paths
declare function briefFaults(trees: IndexTrees, primary: Locale): BriefFault[]
```

`indexTrees` builds the input from the repository-relative paths `git ls-files -z` prints (the
index in `--staged` mode, the tracked tree in CI's `redirects.test.ts`); `indexSlugs(root)` returns
its `slugs`. `present` and `missing` are repository-relative paths. `old-layout`'s `slug` is the
directory or file name under `platform/challenge/` (`x` for `platform/challenge/x/index.md` and for
`platform/challenge/x.md`). Example, `P = zh-TW`, index holding `platform/en/challenge/door/index.md`,
`platform/zh-TW/challenge/door/index.md` (no declaration), `platform/en/challenge/gate/index.md`,
`platform/challenge/gate/challenge.yaml`, `platform/challenge/x/index.md`:

```json
[
  { "kind": "missing-declaration", "slug": "door", "present": "platform/en/challenge/door/index.md", "missing": "platform/challenge/door/challenge.yaml" },
  { "kind": "missing-declaration", "slug": "door", "present": "platform/zh-TW/challenge/door/index.md", "missing": "platform/challenge/door/challenge.yaml" },
  { "kind": "missing-primary", "slug": "gate", "present": "platform/en/challenge/gate/index.md", "missing": "platform/zh-TW/challenge/gate/index.md" },
  { "kind": "old-layout", "slug": "x", "present": "platform/challenge/x/index.md", "missing": null }
]
```

(`door` has its primary brief, so no `missing-primary`; its two briefs give two `missing-declaration`
faults.) `briefFaults` returns its faults in D64's order, the order the hook prints them (S-§4.5):
by slug, then kind in the order of W6a, W6b, W6c, W6d (`missing-primary` from a translation brief,
`missing-primary` from a declaration file, `missing-declaration`, `old-layout`), then `present`, each
compared by UTF-16 code unit; the example above is in that order. A test compares the returned array
with `toEqual`, so order is part of S35's and AC-30's criterion (revision 2, V-21). Only a slug
folder holding `index.md` gives a brief path (D127).

### U-§1 Upgrade vocabulary and schema examples

Terms reuse GLOSSARY's working-tree edit: 舊版面 (legacy layout), 搬家 (layout move), 說明頁
(brief page), 語系資料夾 (locale folder), 語系清單 (locale list), 題目宣告 (challenge declaration).
Where that edit says a range moved by the upgrade records `en` whenever it has no primary locale
(搬家's 「經由升級搬家、而且還沒記主語系的靶場記成英文」, blob `b307335`), D105 holds instead until B90 lands
the corrected sentence (N17, U135); 設定紀錄's working-tree sentence already states D105.

| Term | Meaning here |
|---|---|
| locale list (create-wxl copy) | `['en', 'zh-TW']`, a literal in create-wxl (it cannot import the site's module); a test compares it with the site's single source (R23's pattern) |
| locale folder path | `platform/<code>/` for each `<code>` in the locale list, compared literally (case-sensitive) |
| page | A path that starts with `platform/`, ends with `.md` (literal, case-sensitive) and lies outside the excluded areas (`platform/public/**`, `platform/shared/**`, `platform/challenge/<slug>/src/**`, dot-prefixed names, `node_modules/`, `dist/`). One predicate for the build's layout check and create-wxl's copy (D116, U136) |
| legacy page | A page outside every locale folder path: `classifySourcePath` returns `outside` (create-wxl's `isLegacyPage`, D116). A tree is **in the legacy layout** when it holds at least one legacy page (R10: by content, never by version) |
| English brief | A legacy page whose path is exactly `platform/challenge/<slug>/index.md` |
| legacy single-file brief | A legacy page whose path is exactly `platform/challenge/<name>.md` (a direct child of `platform/challenge/`) |
| translation brief | `platform/<L>/challenge/<slug>/index.md` for `<L>` in the locale list, `<L>` ≠ `en` (today `zh-TW`) |
| declared slug | A slug whose tree holds `platform/challenge/<slug>/challenge.yaml` or `platform/en/challenge/<slug>/index.md`: already in the new layout. Its translation briefs are neither stripped nor orphans (D98) |
| orphan translation brief (move) | A translation brief whose slug has no English brief and is not a declared slug (`orphan-brief`, D98) |
| destination of p | `platform/en/` followed by p without its leading `platform/`. For `platform/challenge/s/index.md` it is `platform/en/challenge/s/index.md` |
| declaration file of s | `platform/challenge/<s>/challenge.yaml` |
| front matter | The lines between an opening fence and the next closing fence. Opening fence: the file's first line (after an optional UTF-8 BOM, `EF BB BF`) is exactly `---`, optionally followed by CR. Closing fence: the next line that is exactly `---`, optionally followed by CR |
| key line | A front matter line whose first byte is not space, tab, `#`, CR or LF |
| group | A key line plus every following line up to (not including) the next key line or the closing fence. Lines before the first key line join the first group |
| kept key | `title`, `description`, `layout` (R5, R11, R26) |
| declaration group | A group whose key (from its own parse) is not a kept key |
| splittable | Front matter for which all of SC1–SC6 (U-§4, "Split checks") hold |
| the transform | The pure function `planLayoutMove` (new, 0010-S45) applied to one tree: moves every legacy page to its destination; for an English brief, writes the brief with only its kept groups and writes the declaration file with only its declaration groups; for every translation brief whose slug has an English brief, rewrites it with only its kept groups; leaves every translation brief of a declared slug untouched; fails `orphan-brief` for every other translation brief. Every line keeps its bytes and its own line ending; nothing is reserialised (R15) |
| B′ | B (0006's base pristine range) after the transform has been applied to it in its temporary directory; B′ = B when B is not in the legacy layout |
| move plan | The transform applied, in memory, to the teacher's range: a list of move ops (U-§4); nothing is written before step 9 |
| move op | `{ kind: 'move', from, to, content, mode }` (a legacy page), `{ kind: 'declare', slug, to, content }` (a declaration file), `{ kind: 'strip', path, content }` (a translation brief rewritten in place) |
| o′ | For a path p, what the merge reads as o: the move op's content when a move op writes p; absent when p is a move op's `from`; otherwise o as 0006 defines it (on disk, by `lstat`) |
| mismatch | For a slug s with an English brief and a translation brief in locale L, a declaration key k present in either brief whose values differ: absent on one side, or values not deep-equal as `yaml`'s `parse` (default options, YAML 1.2 core schema) returns them |
| introduced mismatch | A mismatch (s, L, k, enValue, LValue) in the teacher's range for which B, before its transform, does not hold the same mismatch: B has no English brief or no L brief for s, or B's pair (enValue, LValue) for k is not deep-equal to the teacher's pair (R16) |
| crossing run | A run in which B was in the legacy layout |
| moved run | A run in which B or the teacher's range was in the legacy layout |

#### Schema examples

The transform's input and output (0010-S45):

```ts
interface TreeFile {
  path: string        // repository-relative, '/'-separated, starting 'platform/'
  bytes: Uint8Array   // the file's bytes as read (no decoding)
  mode: number        // lstat mode bits of a regular file, e.g. 0o100644
}
type MoveOp =
  | { kind: 'move', from: string, to: string, content: Uint8Array, mode: number }
  | { kind: 'declare', slug: string, to: string, content: Uint8Array }
  | { kind: 'strip', path: string, content: Uint8Array }
interface Mismatch { brief: string, key: string, enValue: unknown, value: unknown } // absent = undefined
type Failure = { token: 'frontmatter' | 'orphan-brief' | 'legacy-brief' | 'target-exists', path: string, to?: string }
declare function planLayoutMove(input: { files: readonly TreeFile[] }):
  | { legacy: boolean, ops: MoveOp[], mismatches: Mismatch[] }
  | { failures: Failure[] }
```

`files` holds every regular file of the tree under `platform/` that the caller read: on B, every
file of the extracted archive; on the teacher's range, every tracked path under `platform/` and every
file the 8a walk found, read from disk by path. Whether a path is tracked, ignored, a link or a
gitlink is not the transform's input: 8a's range checks (RC1–RC6) decide that. Example:
`{ files: [{ path: 'platform/guide/a.md', bytes: <"# A\n">, mode: 0o100644 }] }` →
`{ legacy: true, ops: [{ kind: 'move', from: 'platform/guide/a.md', to: 'platform/en/guide/a.md', content: <"# A\n">, mode: 0o100644 }], mismatches: [] }`.

`challenge.yaml` and the brief, produced from upstream's `platform/challenge/door-is-open/index.md`
at `65de8c0` (lines kept byte for byte; `⏎` marks the LF each line already has):

```
# platform/challenge/door-is-open/challenge.yaml   (declaration groups, original order)
number: 1⏎
difficulty: easy⏎
category: web⏎
backend: fastapi⏎
app: app.py⏎
packages: []⏎
tools: [ browser, network, repeater, code ]⏎
source_visible: false⏎
date: 2026-04-02T08:54:17.674Z⏎
tags: [ idor, access-control, fastapi, sqlite ]⏎
wasmModule: /challenge/door-is-open/runtime.wasm⏎
```

```
# platform/en/challenge/door-is-open/index.md   (fences + kept groups, original order; body unchanged)
---⏎
title: Need to Know⏎
layout: challenge⏎
description: A black-box engagement against FileHub, … only by that account.⏎
---⏎
⏎
# Need to Know⏎
…
```

`platform/zh-TW/challenge/door-is-open/index.md` becomes the same shape: its fences, its own
`title`, `layout` and `description` lines, its body; its declaration groups are dropped (their values
are the English ones in `challenge.yaml`).

A group with continuation lines stays one unit:

```
tags:⏎            ← key line
  - idor⏎         ← continuation
  # teacher note⏎ ← continuation (indented comment)
  - fastapi⏎      ← continuation
```

`range.json` after a crossing run in which the teacher's range was moved (R18, D105; target values illustrative):

| Before | After |
|---|---|
| absent (`--from`) | `{"upstream":{…target…},"primaryLocale":"en"}` |
| `{"upstream":{…}}` | `{"upstream":{…target…},"primaryLocale":"en"}` |
| `{"upstream":{…},"x":1}` | `{"upstream":{…target…},"x":1,"primaryLocale":"en"}` |
| `{"x":1}` (`--from`) | `{"upstream":{…target…},"x":1,"primaryLocale":"en"}` |
| `{"primaryLocale":"zh-TW","upstream":{…}}` | `{"primaryLocale":"zh-TW","upstream":{…target…}}` |
| `{"upstream":{…},"primaryLocale":5}` | `{"upstream":{…target…},"primaryLocale":5}` (kept; the build area's R19 refuses it) |

Two-space indent and one trailing LF, as 0006.

Report of a moved run (en; report R6 is new, U-§4 "Report"):

```
R1: create-wxl "3.2.0"; base "3.0.0" (commit "…"); target "3.2.0" (commit "…")
R2: updated 3 added 0 deleted 0
R3: UP-A16: a translation brief's declaration differed from the English brief's; challenge.yaml holds the English brief's value, or no value where the English brief had none. "platform/zh-TW/challenge/mine/index.md" "tags"
R3: UP-A12: upstream changed files fork:init writes; …
R4: run git status and git diff
R4: resolve the conflict markers above (search for <<<<<<<) and the other attention items
R4: this upgrade moved the range to the locale-folder layout, so UP-A12 is expected: rerun pnpm fork:init as it says
R4: run pnpm redirects:generate, since _redirects follows the range's primary locale
R4: build and test
R4: commit
R4: push a new v* tag to deploy
R5: to undo the whole upgrade before making other changes, run git checkout -- . && git clean -fd
R6: moved to the locale-folder layout: 15 paths
R6: "platform/challenge/mine/index.md" -> "platform/en/challenge/mine/index.md"
R6: "platform/challenge/mine/index.md" -> "platform/challenge/mine/challenge.yaml" (declaration)
R6: "platform/index.md" -> "platform/en/index.md"
…
R6: "platform/zh-TW/challenge/mine/index.md" (declaration removed)
R6: range.json records "primaryLocale": "en"
```

The example elides 11 of the 15 path lines (the `…` line is not output). The primary-locale line
is not a path line and is not counted in `<n>`.

### U-§4 Upgrade rules (amending 0006)

#### Step order, amended (0006 "Step order")

| # | Step (0006 text unchanged unless stated) | Added by this epic | On failure |
|---|---|---|---|
| 6 | Target; pre-download checks | Unchanged. A run ending here is never moved (D92) | as 0006 |
| 7 | Download, validate, repeat step 6's checks, build B and T | After both pristine ranges are built: (7a) if T is in the legacy layout → UP-E14 `target` `target-layout` naming T's first legacy page (sorted); (7b) if B is in the legacy layout → run 0010-S45 on B's files; failures → UP-E14 `base` with each token and path; otherwise apply the ops to B's temporary directory (deletes, then writes) and keep B's `mismatches` in memory; `guard.throwIfRaised()` after 7b | as 0006, plus UP-E14; a read or write error inside B's temporary directory is CW-E09 naming the path, as `extractInto` and `applyPristine` report one (it is not the range's file system) |
| 8 | Plan | (8a) Discover the teacher's legacy pages (below); if any, run 0010-S45 on the teacher's files (read from disk by path, each only after `lstat` reports a regular file, D139), then the range checks RC1–RC6 (below) on every path a move op deletes or writes; collect every failure; any failure → UP-E14 `range` lines, exit 1. (8b) `planMerge` on B′, T and o′ (D94). (8c) Combine (D94). The anchor check runs on B′ and T. Nothing is written in the range | UP-E11 (a read error, as 0006), UP-E14, CW-E14 (a git command, 0006 D19) |
| 9 | Apply | Deletions (every move op's `from`, then 0006's deletions, one sorted list) before writes (every `move` and `declare` op's `to`, every `strip` op's `path`, every merge write, one sorted list), then `range.json` (with D105) | UP-E09 |
| 10 | Report | report R6 after report R5 | — |

#### Discovery in the teacher's range (8a)

- Tracked legacy pages: entries of `git ls-files -z` (0006's call) that are pages.
- Disk walk: walk `platform/` with `lstat`, not following symbolic links, skipping exactly the
  paths `isLegacyPage`'s classification calls excluded (the vocabulary's excluded areas:
  `platform/public/`, `platform/shared/`, `platform/challenge/*/src/`, dot-prefixed names,
  `node_modules/` and `dist/` at any depth) or a locale folder path (D116). A regular file that is a page and not
  tracked is ignored (step 4 left no other untracked file): token `ignored`. A symbolic link whose
  name ends in `.md`, or that `stat` reports as a directory, is token `symlink` (a dangling link is
  neither). 
- Gitlinks: an entry of 0006's `git ls-files -s -z` with mode 160000 whose path starts with
  `platform/` and that the same classification does not skip: token `submodule`.
- Translation brief paths (D125): for every slug with an English brief and every listed locale `L`
  other than `en`, `platform/<L>/challenge/<slug>/index.md` is checked by `lstat` although the walk
  skips locale folder paths: the path or a parent inside the range (`platform` itself included) a
  symbolic link → token `symlink`; the path existing, not tracked, and reported ignored by `git
  check-ignore -q --no-index -- ./<path>` → token `ignored`. Each line names the checked brief path,
  one line per (path, token) (D125).
- Reading (D139): a tracked page is read only after `lstat` reports a regular file. A symbolic link at
  a page path, or as a parent of one inside the range, is token `symlink` and is not read; any other
  non-regular kind (FIFO, device, directory) is not read and ends the run with UP-E11 naming the path.
  This is a defence behind 0006 step 4, which already refuses a tracked page whose working-tree kind
  changed (UP-E03); a read error or git failure ends the run at once, with no UP-E14 line (D139, D142).
- The teacher's range is in the legacy layout when tracked legacy pages exist, or the walk found a
  failure. A walk failure is reported even when no tracked legacy page exists.

#### Split checks (0010-S45; any failure → `frontmatter`)

| # | Check |
|---|---|
| SC1 | The file decodes as UTF-8 (fatal decoder) |
| SC2 | It has an opening fence and a closing fence |
| SC3 | The front matter, parsed by `yaml`'s `parse` (D110), is a mapping without duplicate keys |
| SC4 | Each group, parsed alone, is a mapping with exactly one key, and that key and its value deep-equal the full parse's entry; the groups' keys, in order, equal the full parse's keys (catches anchors and aliases across groups, top-level flow mappings, document markers) |
| SC5 | The kept groups joined, and the declaration groups joined, each parse to the matching subset of the full parse |
| SC6 | An English brief has at least one declaration group (a translation brief may have none) |

#### Range checks RC1–RC6 (8a, on the move plan's paths)

| # | Applies to | Condition | Token |
|---|---|---|---|
| RC1 | every `from`, `to`, declaration file and stripped translation brief | the path or a parent inside the range is a symbolic link (P-3's test) | `symlink` |
| RC2 | same | the path is a gitlink or under one (P-8's test) | `submodule` |
| RC3 | same | P-9's name-on-disk test fails for the path (when it exists) or its deepest existing proper ancestor; or the path differs from another path of tracked ∪ B′ ∪ T ∪ every `to` but equals it after NFC normalisation and case folding (P-4's test); or a `from` is untracked, exists, and `git check-ignore` does not report it ignored (P-10's reasoning) | `alias` |
| RC4 | every `from` and stripped translation brief | not tracked and `git check-ignore -q --no-index -- ./<path>` reports it ignored | `ignored` |
| RC5 | every `to` and declaration file | exists by `lstat` (any kind), or is tracked, or a parent inside the range exists and is not a directory | `target-exists` (message names `from` and `to`) |
| RC6 | every `to` and declaration file | `git check-ignore -q --no-index -- ./<path>` reports it ignored | `new-ignored` |

Content tokens from 0010-S45 for the range side: `frontmatter`, `orphan-brief`, `legacy-brief`. For the
base side: `frontmatter`, `orphan-brief`, `legacy-brief`, `target-exists` (a `to` already in B).
Token order for sorting several failures at one path: `target-layout`, `legacy-brief`,
`orphan-brief`, `frontmatter`, `symlink`, `submodule`, `alias`, `ignored`, `target-exists`,
`new-ignored`.

#### Codes added

| Code | Condition | Message also names |
|---|---|---|
| UP-E14 | a stop of D96 (one line per failure; exit 1; nothing written in the range; temporary directories removed) | the side, the token, the path (and the destination for `target-exists`), and the token's remedy below |
| UP-A16 | an introduced mismatch | report R3 prints the translation brief's path and the key, both escaped |

UP-E11's condition also covers a read or `lstat` error of 8a. CW-E14 also covers the new
`git check-ignore` calls of RC3, RC4 and RC6 exiting outside 0–1 or rejected by `runGit` (0006 D19).

#### Canonical sentences (compared by equality; `<…>` is `jsonValue` of the value)

| Id | en | zh-TW |
|---|---|---|
| UP-E14 head | `UP-E14: the <side> cannot be moved to the locale-folder layout (<token>): <path>` | `UP-E14：<side> 無法搬到語系資料夾版面（<token>）：<path>` |
| side words | `range` → `range`; `base` → `base pristine range`; `target` → `target` | `靶場`；`base 原廠靶場`；`target` |
| `target-exists` | `; <to> already exists. Move or delete it, commit, and run upgrade again.` | `；<to> 已經存在。請把它搬走或刪除、commit 之後再執行 upgrade。` |
| `symlink` | `; a symbolic link is in the way. Replace it with the files it points to, or remove it, commit, and run upgrade again.` | `；路上有符號連結。請換成它指向的檔案或移除它、commit 之後再執行 upgrade。` |
| `ignored` | `; it is ignored, so the restore commands could not undo moving it. Track it with git add -f, or delete it, commit, and run upgrade again.` | `；它被忽略，還原指令無法撤銷對它的搬移。請用 git add -f 納入追蹤或刪除它、commit 之後再執行 upgrade。` |
| `submodule` | `; it is a submodule or inside one, which the restore commands cannot undo. Move its pages out of the submodule, commit, and run upgrade again.` | `；它是子模組或在子模組裡，還原指令無法復原。請把頁面移出子模組、commit 之後再執行 upgrade。` |
| `alias` | `; its name on disk differs from the name git tracks (letter case, Unicode form or a short name). Rename it with git mv to the tracked name, commit, and run upgrade again.` | `；它在磁碟上的名稱和 git 追蹤的名稱不同（大小寫、Unicode 形式或短檔名）。請用 git mv 改成追蹤的名稱、commit 之後再執行 upgrade。` |
| `new-ignored` | `; the range's rules ignore this new path. Remove the rule (in a .gitignore, .git/info/exclude or core.excludesFile), commit, and run upgrade again.` | `；靶場的規則會忽略這個新路徑。請移除這條規則（在某個 .gitignore、.git/info/exclude 或 core.excludesFile 裡）、commit 之後再執行 upgrade。` |
| `frontmatter` | `; its front matter cannot be split line by line into challenge.yaml. Start each top-level key on its own line at column 0, without anchors or aliases between keys, commit, and run upgrade again.` | `；它的前置資料無法逐行拆成 challenge.yaml。請讓每個頂層鍵從第 0 欄自成一行、鍵與鍵之間不用錨點或別名，commit 之後再執行 upgrade。` |
| `orphan-brief` | `; this translation brief has no English brief at platform/challenge/<slug>/index.md and no platform/challenge/<slug>/challenge.yaml. Add the English brief or delete the translation, commit, and run upgrade again.` | `；這份翻譯說明頁沒有對應的英文說明頁 platform/challenge/<slug>/index.md，也沒有 platform/challenge/<slug>/challenge.yaml。請補上英文說明頁或刪除這份翻譯、commit 之後再執行 upgrade。` |
| `legacy-brief` | `; this is the old single-file brief. Move it with git mv to platform/challenge/<name>/index.md, commit, and run upgrade again.` | `；這是舊的單檔說明頁。請用 git mv 搬到 platform/challenge/<name>/index.md、commit 之後再執行 upgrade。` |
| base remedy (any base token) | `; the base comes from --from <commit> or a commit that is not a release. Name a release with --from <version> and run upgrade again.` | `；base 來自 --from <commit> 或不是發布版的 commit。請用 --from <version> 指定一個發布版，再執行 upgrade。` |
| `target-layout` (side target) | `; the target is in the old layout and this create-wxl upgrades only to the locale-folder layout. Unset CREATE_WXL_COMMIT.` | `；target 是舊版面，這個 create-wxl 只能升級到語系資料夾版面。請取消 CREATE_WXL_COMMIT。` |
| UP-A16 | `UP-A16: a translation brief's declaration differed from the English brief's; challenge.yaml holds the English brief's value, or no value where the English brief had none.` | `UP-A16: 翻譯說明頁的題目宣告和英文說明頁不同；challenge.yaml 採用英文說明頁的值，英文說明頁沒有的鍵就不寫。` |
| report R4 crossing | `R4: this upgrade moved the range to the locale-folder layout, so UP-A12 is expected: rerun pnpm fork:init as it says` | `R4: 這次升級把靶場搬到語系資料夾版面，所以出現 UP-A12 是預期的：請照它的說明重新執行 pnpm fork:init` |
| report R4 redirects (D120) | `R4: run pnpm redirects:generate, since _redirects follows the range's primary locale` | `R4: 執行 pnpm redirects:generate，因為 _redirects 依靶場的主語系產生` |
| report R6 count | `R6: moved to the locale-folder layout: <n> paths` (n = the number of report R6 path lines) | `R6: 搬到語系資料夾版面：<n> 個路徑` |
| report R6 move | `R6: <from> -> <to>` | same |
| report R6 declare | `R6: <brief> -> <challenge.yaml> (declaration)` | `R6: <brief> -> <challenge.yaml>（題目宣告）` |
| report R6 strip | `R6: <translation brief> (declaration removed)` | `R6: <translation brief>（移除題目宣告）` |
| report R6 primary locale | `R6: range.json records "primaryLocale": "en"` | `R6: range.json 記下 "primaryLocale": "en"` |

UP-A* texts use an ASCII colon in zh-TW, as the existing table's comment requires. `<token>` is the
literal token. For sides `range` and `target` the UP-E14 line is the head followed by the token's
sentence. For side `base` it is the head followed only by the base remedy: the token's sentence asks
for an edit and a commit, which a downloaded base archive cannot take. In the base remedy,
`<commit>` and `<version>` are literal text, not values. Example (side `base`, U60):
`UP-E14: the base pristine range cannot be moved to the locale-folder layout (orphan-brief): "platform/zh-TW/challenge/x/index.md"; the base comes from --from <commit> or a commit that is not a release. Name a release with --from <version> and run upgrade again.`
(`<path>` is `jsonValue` of the path, as above.)

#### Report, amended (0006 "Report")

| Id | Change |
|---|---|
| report R2 | Counts and deleted lines exclude move ops. A merge op at a destination counts as 0006 says, "updated" when o′ is present and "added" when absent; an 0006 M6 at a destination is counted deleted and listed (the destination path) |
| report R3 | UP-A16 lines: `R3: <UP-A16 text> <path> <key>`, sorted with the other items by path (UTF-16), then by key (UTF-16); UP-A12 still once, last |
| report R4 | The crossing line, after the conflict lines and before `pnpm install`, exactly when the run is a crossing run and report R3 holds UP-A12; then the redirects line (D120) in every crossing run, directly before `R4: build and test` |
| report R6 | New, printed after report R5 exactly in a moved run: the count line; one line per move op of the teacher's range sorted by its first path (UTF-16), a `move` and the `declare` from the same brief sorted move first; the primary-locale line last when D105 wrote it. A crossing run whose teacher's range was not moved prints only the count line with 0 (D105 writes nothing then) |

#### `range.json` after the plan, amended

0006's rule, then: in a crossing run in which the teacher's range was moved (D105), when `primaryLocale` is not an own key of the result, append
`primaryLocale` with the string `"en"` as the last key (defined as an own property, as
`buildRangeJson` does for `__proto__`). Never written after UP-E09.

### U-§5 Upstream-equality exceptions (0010-S49; D108, AC-53)

The exception table of 0010-S49 at this epic's close-out, exactly. Each path differs from (or is
absent from) the transform of the base tag only because of the rows named. Every page other than
these, and every `challenge.yaml` (the four upstream ones are transform outputs unchanged, Y-§2.4),
must match. A listed path absent from the compared tree is not a failure.

| Path | Rows that edit it |
|---|---|
| `platform/en/index.md` | D14, D40 (import `../shared/challenges.data.ts`, `:lists`) |
| `platform/zh-TW/index.md` | D13 (hero links from the locale home), D14, D40 |
| `platform/en/challenges.md` | D14, D40, D44 (`subtitle`) |
| `platform/zh-TW/challenges.md` | D14, D40, D44 |
| `platform/zh-TW/guide/notes.md` | D16 (`../reference/…`) |
| `platform/en/guide/index.md`, `platform/zh-TW/guide/index.md` | LH2, Y100 |
| `platform/en/guide/troubleshooting.md`, `platform/zh-TW/guide/troubleshooting.md` | LH1, LH2, A34, Y100 |
| `platform/en/guide/python.md`, `platform/zh-TW/guide/python.md` | Y100 |
| `platform/zh-TW/reference/attack-log-export-format.md` | D51 (new page) |
| `platform/en/smoke-fixtures/english-only.md`, `platform/zh-TW/smoke-fixtures/traditional-chinese-only.md` | D49 (new pages) |

A stage 5 or stage 6 finding that another page must change for a row of this spec adds that path
here, naming the row, in the same change, and only with the user's approval recorded in that
ticket's stage 6 disposition (D130); nothing else does.

## Overridden contracts

Each changes only as stated; stage 6 checks that the diff changes nothing else in them and that every other test the diff changes is named here. Contract ids BC1–BC19 are area B's.

### Area B

Each changes only as stated, together with the tests that pin it. "Owner" names the area that
writes the change when it is not this area.

| Contract | Where, with the tests that pin it | Now |
|---|---|---|
| BC1. English is the hard-coded `locales.root`; `zh-TW` is the only prefixed locale | `.vitepress/config.mts` `locales` literal | Generated by `localesConfig(primary)` (D8); the literal survives only as B56's expected value |
| BC2. `transformPageData` reads `relativePath` | `.vitepress/config.mts` `transformPageData` | Reads `filePath` (D10) |
| BC3. Source path = URL path; `entryForSourcePath` takes a source path | `.vitepress/theme/i18n/pages.ts` (`entryForSourcePath`, its module doc's spelling examples, `pathCandidates`'s "identified by its source file"); `.vitepress/pageList.ts` (`pageListFromDir(srcDir)`, `NOT_PAGES_AT_TOP` and its comment); `.vitepress/theme/i18n/arrival.ts` `classifyArrival`'s call; `tests/unit/i18n/page-list.test.ts` (`entryForSourcePath` block, `pageListFromDir` blocks "lists every page file…" and "follows a page added…", the oracle in "the page list the site configuration ships") | Renamed `entryForRelativePath`, input is the rewritten path; `pageListFromDir(srcDir, primary)`; exclusions are `srcExclude`'s; the oracle maps through its own rewrite (D9, B42, B43) |
| BC4. The dist HTML set equals the source `.md` set by path | `tests/site-smoke/missing-translation.spec.ts` "the page list spelling matches the pages VitePress published" | Same comparison through the mapping (B44). The rest of that spec is R29's (other area) |
| BC5. 0008's page-list schema and rows: "every `*.md` under `platform/` outside `public/` and `shared/`", spelling examples `/zh-TW/…` as the only prefix, P2's exclusions | `.proj.specs/0008-missing-translation-fallback/traceability.md` "Schema: page list (S2)", P1, P2, P7; Vocabulary "primary locale" ("English, today"), "page locale" (`zh-TW` for `/zh-TW/`, `en` otherwise); goal G2 ("today is English and is served at the site root") | Entries are rewritten paths; exclusions add `challenge/*/src/**`; the page locale is the primary for an unprefixed entry and the prefix's code otherwise. The new spec states it overrides these 0008 rows |
| BC6. A `.md` in `platform/public/` would be a VitePress page while the page list skips it | VitePress default glob; `pageListFromDir`'s comment "public/ is copied verbatim and never rendered" | True by `srcExclude` (D5, B25) |
| BC7. `KNOWN_LOCALES` (unused) and the literal `Locale` union; `isKnownLocale`'s literal comparison | `.vitepress/theme/i18n/index.ts`; `tests/unit/i18n/messages-shape.test.ts` (two literal imports) | From the locale-list module (D4, B17–B19). Owner of the other enumerations (`ShortLinkLocale`, `ChallengeLocale`, `otherLocale`, `detectLocaleFromPath`, `localizePath`): runtime and lists areas |
| BC8. Loaders glob `challenge/*/index.md` and `zh-TW/challenge/*/index.md`; `placeOf` reads the URL's first segment | `platform/shared/challenges.data.ts`, `challenges.zh-TW.data.ts`, `mergeChallenges.ts`; `challenge-data-loaders.test.ts`, `merge-challenges.test.ts` | D11; L1–L3, L19 (N3). Owner of the merge rules: lists area |
| BC9. Home-page hero links written with their final prefix | `platform/index.md`, `platform/zh-TW/index.md` frontmatter | Written from the locale home and prefixed by the build (D13, B70) |
| BC10. English pages import `./shared/…` | `platform/index.md`, `platform/challenges.md` | `../shared/…` from `platform/en/` (D14) |
| BC11. The one cross-folder link `../../reference/…` | `platform/zh-TW/guide/notes.md` | `../reference/…` (D16, B78) |
| BC12. ADR-0008 consequence 2, "A dead link fails the build rather than shipping" | `docs/adr/0008-locale-folders-primary-chosen-at-build.md` | Holds with PL-E11 added; VitePress's check alone misses links naming the primary folder (D12). The spec amends the ADR's consequence text explicitly rather than silently |
| BC13. Upstream's unprefixed URLs are English | the built site; `tests/site-smoke/site-smoke.spec.ts` (`goto('/')`, `goto('/challenge/door-is-open/')` with English assertions); `playwright.site.config.ts`'s storage-state comment | Unprefixed is Traditional Chinese on upstream; English assertions use `/en/` (B81, B82) |
| BC14. `localeIndex` `'root'` means English | `MergedNav.vue`'s comment and mapping; `ChallengeList.vue`, `HomeContent.vue`, `LocaleSwitcher.vue` mappings; `tests/unit/components/ChallengeList.test.ts` (parameterised on `'root' \| 'zh-TW'`) | `'root'` means the primary locale (D18, B46). Owner: runtime area |
| BC15. Comments in the configuration | `.vitepress/config.mts`: the `SRC_DIR` comment ("The page list below reads it too"), the `cleanUrls` comment's `/zh-TW/challenges` example, the `__WXL_PAGES__` comment ("read from the source tree") | State the rewrite: the page list maps sources through it; the example uses a non-primary prefix in general terms |
| BC16. `.vitepress/theme/Layout.vue` exists | the file | Deleted (D15) |
| BC17. Pages live in `platform/` and `platform/zh-TW/`; `challenge/<slug>/` holds `index.md` | `AGENTS.md` Repository layout (`challenge/<slug>/ … index.md brief + src/`, `zh-TW/ … a page without one is shown in English`); `docs/agents/challenge-pipeline.md`'s two-tree table; `README.md`/`README.en.md` architecture and challenge-format sections; `CONTRIBUTE.md` | Locale folders (D1). Owner: documents area; listed here so no H row misses them |
| BC18. The build reads no setup record | `GLOSSARY.md` 設定紀錄 (_Avoid_: 設定檔 — "不是平台在建置時讀取的設定"), 主語系 ("上游目前…主語系是英文" by implication in its _Avoid_), 題目 (_Avoid_ "英文是上游目前的主語系"), as committed at `65de8c0`; the working-tree edit (blob `b307335`) has already rewritten all three (設定紀錄's 【已為假的舊說法】「平台在建置時不讀它」, 題目's 「英文那時是上游的主語系；自 epic 0010 起上游的主語系是繁中」) | The build reads `primaryLocale` from it (D2). Owner: documents area (F26); stage 6 confirms the rewritten lines land unchanged with B90 |
| BC19. "The primary locale … which every page must exist in" | `docs/adr/0008-locale-folders-primary-chosen-at-build.md` (first paragraph of the decision); `GLOSSARY.md` working tree 主語系 (「每一頁都一定有它的版本」) and 翻譯 (「一頁內容在主語系以外某個語系的版本」) | A content rule, not a build invariant: every challenge has a primary-locale brief (VM10, D64), upstream has every page in every locale (D52), and a range's article may exist in one translation only (D20, D27, D49). Stated by B87's dated note and B90's GLOSSARY wording. Owner: documents area |

Contracts this area checked and leaves unchanged: `config-base.test.ts` (base and head hrefs;
`range.json` is absent upstream so evaluation succeeds); fork:init's A6/0003 A9 cases (B60); the page
list's lookup algorithm (`pathCandidates`, `firstListedEntry`); `cleanUrls: true`.

### Area A

Each changes only as stated; stage 6 checks that nothing else in them changes and that any other
test the diff changes is named here.

| Contract | Where, with the tests that pin it | Now |
|---|---|---|
| A visitor with no preference is sent to `zh-TW` (`DEFAULT_VISITING_LOCALE`) | `DEFAULT_VISITING_LOCALE` and its doc block; `redirectTargetForStoredLocale`'s "No preference is not 'no opinion'…" comment and its `?? DEFAULT_VISITING_LOCALE`; `initial-locale-redirect.test.ts`: its import, "sends a visitor with no stored preference to the default visiting locale", "treats a stored value naming no known locale as no preference" (expects a redirect), "treats an unreachable localStorage as no preference" (expects a redirect), "preserves the query string and the hash with no stored preference", "keeps the locale segment inside the base with no stored preference", the "with the page list (spec 0008)" table's `none`, `unknown` and `unreadable` columns of its A1 rows, and the comments that call `zh-TW` the default; spec 0008 D4, "Requested locale" rows 2 and 5, decision rows A1–A3's "none, unknown, unreadable" | D25, A1: no redirect, requested = page's own locale |
| The line's requested locale falls back to the default | `useArrivals`'s `record` and its comment ("else the stored preference or the default"); `not-found-wiring.test.ts`: "stays on an English-only page with no stored value, the line in the default zh-TW (A2)" (now no line), the `none`/`unknown`/`unreadable` columns of "the decision table A1–A5, A7, every column" for its A1–A3 rows, the comment on "keeps the choice for the tab when storage refuses it…" ("differs from the default visiting locale"); `missing-translation.spec.ts`: "a cold load of an English-only article stays put, with the line, stored none" | D25, A1, A11 |
| Tests that obtain a cold-load redirect from the default | `not-found-wiring.test.ts`: "sends an alias of a translated page to its counterpart entry, once, with replace (A1)", "after an A1 redirect, a later page asks with the stored value, not the carried one (0008 L6)", "writes no preference on a cold-load redirect or the navigation after it (0008 W5)", and — vacuous without a redirect to withhold — "does not apply the cold-load redirect after the learner left the page and came back", "does not redirect when a navigation the learner started is still loading", "does not apply the cold-load redirect to a page reached by a link while the gate asked"; `missing-translation.spec.ts`: "a cold load of an alias goes to the counterpart's list entry, and writes nothing" (stores nothing, expects `/zh-TW/challenges`) | Each stores a valid `T` explicitly, so the redirect it asserts or withholds exists |
| English is the unprefixed tree; `zh-TW` is the only prefix | `detectLocaleFromPath` and its doc ("everything else resolves to `'en'`", binary fallback); `localizePath` and its doc; `isKnownLocale`, `KNOWN_LOCALES`, `otherLocale` and its comment; `detectInitialLocale`; `route-locale-sync.test.ts` ("path %s → locale %s"); `localize-path.test.ts` (all tables); `locale-switcher.test.ts` "detectInitialLocale: the URL alone decides (spec.md table)" | A26, A27, A29: decided from the locale list and `P` (0010-S10 gains `P`) |
| A cold load writes `zh-TW` for a `/zh-TW/` page | `shouldPersistOnColdLoad` (`=== 'zh-TW'`) and its doc; `useArrivals`'s `prefixed` (`=== 'zh-TW'`), `recordColdLoad` (`persistLocale('zh-TW')`) and header comment; the theme Layout's `onMounted` comment ("stores `zh-TW` for a published `/zh-TW/` page (0008 W2)"); `initial-locale-redirect.test.ts` "shouldPersistOnColdLoad" table; `theme-locale-wiring.test.ts` "the real theme: cold-load persistence" ("updates the stored preference once the Layout mounts on a published prefixed page" and the prefixed-path cases); `missing-translation.spec.ts` "a cold load of a published /zh-TW/ page stores zh-TW", "a failed load of a /zh-TW/ page shows the not-found page and stores nothing" (its chunk pattern); spec 0008 W2, 0008 W4, D5's and B4's "opening an address under `/zh-TW/`", and B4's "no link sets it to English in this epic" | D26, A5, A25: the translation page's `T`; under `P = zh-TW` a link to `/en/…` sets `en` |
| The cold-load redirect leaves only the unprefixed tree, toward `zh-TW` | `redirectTargetForStoredLocale` (`wanted === 'en'`, `!== 'en'`) and doc; `theme-locale-wiring.test.ts` "the real Layout: cold-load redirect", "…: the shared-machine session gate", "…: the deferred redirect does not outlive the layout" (outcomes unchanged under `P = en`; each also runs under `P = zh-TW` with stored `en`) | D24 |
| A not-found path's counterpart is "the other locale"; requested is "the other locale of the target" | `lookupNotFound` and doc ("the same page in the other locale"); `notFoundRedirect` and doc; `switcherDecision`'s doc ("the menu there offers only the other locale"); `arrival.test.ts` "notFoundRedirect" ("sends a missing Traditional Chinese page to the English page, asking for zh-TW", "sends a missing English page to the Traditional Chinese page, asking for en"), "notFoundRedirect: one redirect per arrival", "switcherDecision"; `not-found-wiring.test.ts` "the real Layout: a not-found arrival", "…: around the not-found redirect", "…: the line after a redirect", "…: a not-found page while a challenge page is still asking" (all run under both `P`); spec 0008 lookup table row `/en/challenges → 0008 C3`, 0008 C1, 0008 C2 wording | D27, D28: three kinds of not-found path; requested = own locale; `/<P>/…` stripped |
| `localeIndex` `'root'` means English | `MergedNav`'s `locale` computed and its comment ("`'root'` for English … hence the mapping"); `ChallengeList`'s and `HomeContent`'s `pageLocale`; `LocaleSwitcher`'s `pageLocale`, `labelOf`, `options`; `locale-switcher.test.ts`'s `mockLocaleIndex` type and `mountAt` mapping, "LocaleSwitcher without the Layout's provider"; the `localeIndex` mocks in `MergedNav.test.ts`, `ChallengeList.test.ts`, `HomeContent.test.ts`, `tests/unit/theme/challenge-rwd.test.ts` | D32, D34, A22, A28 |
| The line's link is `/zh-TW/challenges` or `/challenges` | spec 0008 "Canonical sentences" link-target column; `MissingTranslationLine` (unchanged code, changed outcome via `localizePath`); `missing-translation.spec.ts` "a missing translation falls back to the English page, stored language …" (`href` `/zh-TW/challenges`) | A30: by requested locale and `P` |
| The upstream build has an English-only article at `/reference/attack-log-export-format` and puts English at the root | `missing-translation.spec.ts`'s `REFERENCE` and every case using it (the fallback cases, "Back after the fallback…", the width cases, "on the not-found page a choice with no counterpart…"); `site-smoke.spec.ts`'s `SITE_PAGES` paths, `pageUrlOf`/`expectedUrlFor` and its store-the-page's-locale setup | Subjects come from R29's fixture pages and the upstream build's `P = zh-TW` (R29's fixture is another area's; area A states only the expectations, A1–A5, A14–A17, A30) |
| A `cleared` reload's root "makes its own redirect"; the reload "is still in the language that was on screen" | The theme Layout's `onMounted` hold comment; `useSessionGate`'s clear doc; `SessionGate`'s `goToRoot` comment (checked, kept if true) | D35, A33 |
| Documents | `platform/guide/troubleshooting.md` and `platform/zh-TW/guide/troubleshooting.md` (`missing-translation` "Why" and "Which language the site remembers"); `README.md` and `README.en.md` short-link passage (preference sentences); `GLOSSARY.md` 主語系 `_Avoid_`【易混】; spec 0008's H2 and 0008 H3 rows as current statements | A34, A35, A37 |
| Comments (A36) | `arrival.ts` header and `classifyArrival`, `notFoundRedirect`, `switcherDecision`, `lineLocale` docs; `pages.ts` header (entries are URL paths, D9); `i18n/index.ts` docs of `detectLocaleFromPath`, `localizePath`, `detectInitialLocale`, `readStoredLocale`, `shouldPersistOnColdLoad`, `redirectTargetForStoredLocale`; `useArrivals` header; the theme Layout's `onMounted` and `enhanceApp` comments, including `.vitepress/theme/index.ts`'s "stores `zh-TW` for a published `/zh-TW/` page (W2)" and its comment naming `platform/challenges.md, platform/zh-TW/challenges.md` (new source paths `platform/en/…`); `.vitepress/theme/composables/localStorageKeys.ts`'s module doc and the `OWNED_LOCAL_STORAGE_KEYS` entry comment for the locale key ("Written on every cold load of a published `/zh-TW/` page"); `useSessionGate.ts`'s comment on the locale written "of a published `/zh-TW/` page, as the Layout mounts"; `MergedNav`'s "correct `/zh-TW/challenges/` href" example; `MergedNav`, `ChallengeList`, `HomeContent`, `LocaleSwitcher` page-locale comments; `MissingTranslationLine` doc. Each is restated in terms of "a published translation page". Checked and kept (true under either `P`, since they speak of a page's locale, not its address): `ShortLinkShare.vue`'s and `ChallengeDoneBadge.vue`'s "static HTML of a zh-TW page" | D24–D34 |
| `.vitepress/theme/Layout.vue` exists | the file | D15: deleted |

### Area L

| Contract | Where, with the tests that pin it | Now |
|---|---|---|
| Lists hold every slug of both trees; a Traditional-Chinese-only challenge is borrowed into the English list; `id` = English `id`, then Traditional Chinese `id`, then position (English order, then zh-only by slug); per-brief fields; `placeOf` reads the URL | `mergeLocaleChallenges` and its header comment, `DEFAULTS`, `placeOf`, `toData`; 0008 traceability "Schema: locale challenge data (CS4)" merge rules, rows 0008 E1–E5, 0008 E10, AC-6; `merge-challenges.test.ts` (all cases: `EN`/`ZH` helpers' URL shapes, `door.zh`'s `category: '網頁'`, "keeps a Traditional Chinese-only challenge…", "borrows a Traditional Chinese-only challenge…", "give Traditional Chinese-only challenges position ids…", "take the Traditional Chinese id…", the `id: 11`/`99` expectations) | D37–D43, L1–L18 |
| One content loader per locale tree, both reading both trees, `createContentLoader` with literal globs | `challenges.data.ts`, `challenges.zh-TW.data.ts` and their comments, `ChallengeLocale`; `challenge-data-loaders.test.ts` (`LOADERS`, the glob regex, `mergeLocaleChallenges(raw, '<locale>')`, "the shared merge maps every field…", "reads the number from frontmatter"); 0008's last overridden-contract row; D11, D14 (sibling) | D40, 0010-S18, L19–L20 |
| `ChallengeList`/`HomeContent` take `challenges: ChallengeData[]` (renamed `lists`, with LW1 when it is missing, D40, L45); page locale `localeIndex === 'zh-TW' ? 'zh-TW' : 'en'` | both components' props and `pageLocale`; every `mount`/`ssr` call in `ChallengeList.test.ts` and `HomeContent.test.ts`, `mockLocaleIndex`'s type `'root' \| 'zh-TW'`, N01/N02 (`['root','en']`), N04 `copiedFrom(…,'root')`, the URL-text click cases parameterised by `'root' \| 'zh-TW'`, the progress-summary table `['root', 'Solved', …]`, "ships the English list's mark…" (`'root'`), `mockChallenges`/`BORROWED`/`CHINESE_ONLY`/`HOME` fixtures (URL shapes, `locale`, `'綜合'` categories); A's overridden row "`localeIndex` 'root' means English" | `lists` prop, `pageLocaleOf` (0010-S11), L23–L32 |
| The toolbar uses `$t`; the h1 and subtitle are literals; the placeholder defect "is not fixed here" | `ChallengeList`'s `tp` comment block (the paragraph ending "it is not fixed here"), its template; T-0060's deliverable and ACs (incl. "A site-smoke case checks one toolbar title on `/zh-TW/challenges`") | D44, D55, L23–L25, L33 |
| Dates follow the runtime locale and the machine's zone | `formatDate` in both components; T-0060 `pending_evidence` ("dates read 2026年4月2日 while…") | D45, L26 |
| Home strings use `$t` | `HomeContent`'s template | D47 |
| The English list gives no copy control for a Traditional-Chinese-only entry in short mode | `hasCopyControl` and its comment (0008 E3, 0008 G9); 0008 revision 3.5's reading of 0008 E3 | D48, S53 |
| `REFERENCE` is "the upstream tree's one English-only article" | `missing-translation.spec.ts` header and `REFERENCE`, every case of L-§4.7; the unit files that use the path as a synthetic `PAGES` entry stay (re-check: they do not read the tree) | D49, L37–L39 |
| Site-smoke URLs hard-code `/zh-TW` and an unprefixed English tree; the config comment says the site sends an unprefixed path to "its default visiting locale" | `site-smoke.spec.ts` `SITE_PAGES`, `pageUrlOf`, `expectedUrlFor` (`path.includes('/zh-TW/')`), the selected-excerpts title-click case's path builder, the page-mode nav case's target lookup, "homepage renders", "reference challenge page mounts", "client-side navigation leaves an extensionless URL…" (expects `/challenges`); `playwright.site.config.ts`'s `storageState` comment | D54 |
| CI builds one site for both `build` and `site-smoke` with the same command | `quality-gates.yml` (both jobs' "Build VitePress site" steps); `upstream-only-jobs.test.ts`/`toolchain-parity.test.ts` pin only job sets (re-checked: unaffected) | D50, L36 |
| `pnpm test:smoke` runs "against a built site" | `AGENTS.md` Build and test commands; `README.md`/`README.en.md` scripts table row | D50 |
| Upstream has one page without a Traditional Chinese version | 0008 Out of Scope ("Writing a Traditional Chinese version…"); OQ-023 history (no edit needed; recorded here) | D51, L40 |
| Hero links are absolute and per-locale prefixed | D13 owns; L only changes the import and prop of `platform/<L>/index.md` | D40, D13 |

H rows (stage 6, L44):

| Row | Passage | Says after this epic |
|---|---|---|
| LH1 | `guide/troubleshooting.md` `#hardcoded-english` table, both languages | The row "題目清單頁標題 `Challenges`、`Choose a challenge to begin`" (and its English) is removed; the difficulty-badge row says the value written in `challenge.yaml` (題目宣告), not frontmatter. |
| LH2 | `guide/troubleshooting.md` paragraph after the table and `guide/index.md` step 1, both languages | Every list holds every challenge that has a primary-locale version; a challenge without a version in a list's locale shows its primary-locale title and description with the mark; "frontmatter 的原始字串" → 題目宣告裡寫的值. A passage may use 主語系 (0008 H7) only together with B90's removal of 主語系's `_新造詞_` line in the same change; `glossary.test.ts` passing decides (K-1, V-7). |
| LH3 | `GLOSSARY.md` 語系標記 | Still true; add that it appears only in lists of a locale other than the primary locale. 題目 entry's _Avoid_ 挑戰 line unchanged (D44 adds no 挑戰; D42 moves the existing `網站攻防挑戰` default into `zh-TW.json`, which L-O3's open question covers, K-5). |
| LH4 | `AGENTS.md`, `README.md`, `README.en.md` | D50's `WXL_SMOKE_PAGES=1` sentence; `smoke-fixtures/` named as reserved in the README section on locale folders. |
| LH5 | Release note input (stage 9, via `/tw-emoji-release-note`) | A page that imported `challenges.zh-TW.data.ts` or iterated `data` as an array must use `../shared/challenges.data.ts` and `data[<locale>]`; a page using `ChallengeList` or `HomeContent` must pass `:lists="data"` instead of `:challenges="data"` (the prop was renamed; the old one renders an empty list with LW1's warning, D40). |

### Area S

Each changes only as stated; stage 6 checks the diff changes nothing else in them.

| Contract | Where, with the tests that pin it | Now |
|---|---|---|
| Two locale trees, `root` = English at `platform/challenge/` | `CHALLENGE_TREES`; `indexSlugs` (keys `root`, `zh-TW`); `GenerateOptions.includeSlug(slug, locale)`; `redirects.test.ts` "gives every challenge in git's index its four rules…" (`slugs.get('root')`, `readChallengeNumber(…'challenge', slug, 'index.md')`); `redirects-generated.test.ts` `writeChallenge(root, 'root' \| 'zh-TW', …)` and "is byte-identical…" (`tracked.get('root')`); `challenge-numbers.test.ts` `writeChallenge`/`writeRetired`; `create-challenge-run.test.ts` `DEFAULT_TREE` | Index trees `declaration` + locale codes; numbers from `challenge.yaml`; `P` from `range.json` |
| A Traditional Chinese rule opens the English page when untranslated; an English-only challenge's rules | 0008 G1–G3, 0008 G8 and its schema; `numericRules` (`english`/`chinese` variables, `FORMS[].chinese`); `redirects-generated.test.ts` "writes the schema…", "orders by number…", "re-points, not removes…"; `pre-commit-sh.test.ts` `TEST_CHALL_RULES`, `DOOR_RULES`, `DOOR_RULES_AT_ENGLISH`, `FIXTURE_RULES` and every case using them | D58: per form locale, the page in that locale, else the primary page. On `P = en` the literals are unchanged; `P = zh-TW` cases are added |
| 0008 G9: a Traditional-Chinese-only challenge gets only two rules; 0008 E3: the English list has no short link for it | 0008 E3, 0008 G8, 0008 G9; `numericRules`' 0008 G9 branch; `redirects-generated.test.ts` "gives a challenge with only a Traditional Chinese brief its two…" and "groups whatever set of pages is included…"; `ChallengeList.vue` `hasCopyControl`; `ChallengeList.test.ts` cases for the 0008 E3 entry | D48: every form for every challenge with an included brief; copy control for every numbered entry |
| Slug rules fixed to `/challenge/:slug/` and `/zh-TW/challenge/:slug/` | `PARAMETERISED`; `redirects.test.ts` `PARAMETERISED_RULES`, "ends with the four parameterised classroom rules (0008 G4)"; `redirects-generated.test.ts` "ends with the four parameterised rules (0008 G4)"; `pre-commit-sh.test.ts` `PARAMETERISED_RULES` | D59 per P; on `P = zh-TW` the file ends with the old-address rule, so "ends with" becomes "the slug rules are the last four before the old-address section, or the last four" |
| Only numbered and parameterised rules exist; placeholders pair by name; shadowing by segment count | `redirects.test.ts` "admits no rule that is neither parameterised nor a numbered short link", `NUMBERED_SOURCE`, "pairs every placeholder…", `shadows`, "does not hide one rule behind a more general one", `isParameterised` | The old-address rule is admitted by exact value; `*` pairs with `:splat`; a splat shadows every later source under its prefix (S30, S31) |
| URL `/<prefix>/<slug>/` = `platform/<prefix>/<slug>/index.md` | `redirects.test.ts` `targetDir`, `targetPage`, `slugsFor`, `targetDirectoryFaults`, `rootRule`; "resolves every parameterised target prefix…", "resolves every literal target…", "accepts a range with no Traditional Chinese challenge directory", "…is empty", "refuses a range with no English challenge directory" | Resolution through the page-path mapping; required directory is the primary's; cases per P (S32, S34) |
| Orphan = Traditional Chinese brief without English challenge; checked in bash | 0007 D12, 0007 W6; `scripts/pre-commit.sh` 0007 D12 block (`index_slugs`, `EN_SLUGS`, `ORPHANS`, its two messages); `redirects.test.ts` `orphanFaults`, "backs every translated slug with a root-locale challenge", "refuses a translated slug with no root-locale challenge (0008 G6)"; `pre-commit-sh.test.ts` `expectW6` (incl. its "no `--staged` call" assertion) and the 0007 H17, 0007 H21, 0007 H22, 0007 H41, 0007 H17-commit, 0007 H21-commit-a, K-17, K-17 boundary, 0007 D12-HEAD, "no English index slug at all", 0007 H39, 0007 H39 boundary cases; 0008 G6 | D64: `briefFaults` in Node, kinds a/b/(old-layout), W6a–W6d + W6r; the generator **is** called with `--staged` and refuses with empty stdout |
| Watched paths | `scripts/pre-commit.sh` `WATCHED`, the `git ls-files --others` listing for 0007 W4, the validation pathspec; `pre-commit-sh.test.ts` 0007 H06 | D65, D66: `platform/challenge/`, `:(glob)platform/*/challenge/**`, `_redirects`, `range.json` |
| 0007 W4 wording | `pre-commit.sh` 0007 W4 `case`; `pre-commit-sh.test.ts` `w4LeftOut`, `w4EnglishPage` (the literal "…Traditional Chinese short links open the English page, if there is one."), 0007 H10, 0007 H10-Traditional-Chinese-tree; 0008 H1a | W4a/W4b (S-§4.5); produced by `generate-redirects.ts --describe-untracked`; `w4EnglishPage` holds for `P = en`, a `P = zh-TW` twin is added |
| `number-locales`: a translation's number must equal the English one | `checkChallengeNumbers`; `challenge-numbers.test.ts` "rejects a challenge numbered differently in the two locale trees"; `pre-commit-sh.test.ts` 0007 H13 ("…ends in 0007 O4 with 0007 W5", `carries different numbers across locale trees`); `expectW6`'s `not.toContain('carries different numbers')` | Removed (D62); 0007 H13 replaced by S48 |
| Retired numbers from `.archive/challenge/<slug>/index.md` frontmatter only | `nextChallengeNumber`; `challenge-numbers.test.ts` "clears every number a retired challenge carries"; `pre-commit-sh.test.ts` fixture `.archive/challenge/old-chall/` and 0007 H17's `git mv … .archive/challenge/door` | D63: `challenge.yaml` and legacy `index.md`; retiring moves the declaration folder and deletes the briefs |
| Capacity text "four static rules … four dynamic … at most 500" | `HEADER`; `redirects-generated.test.ts` "states the 500-challenge limit in its header (0008 G8)"; the committed file's header; 0008 G8 | K1–K3 computed from F (S26) |
| Section comments | `NUMERIC_SECTION`, `PARAMETERISED_SECTION`; the committed file | K4, K5 |
| Page URL in page mode: `/zh-TW` for zh-TW, nothing for English | `challengeLink`; `shortLink.test.ts` page-mode cases; `ShortLinkShare.test.ts`, `ShortLinkShare.mode-default.test.ts` page-mode expectations; `site-smoke.spec.ts` `expectedUrlFor`; 0008 F4–F6 | `challengePagePath(slug, entryLocale, P)` (D68) |
| Hook fixture | `tests/__helpers__/preCommitRepo.ts` doc comment, `COPIED_FILES` (gains the locale-list module and the `range.json` reader), `buildFixture`, `buildFirstCommitFixture`, `writeChallenge`, `writeBrief`, `challengeIndex`, `expectedRedirects` (oracle gains the index's `range.json`) | New layout; `en` and `zh-TW` variants |
| `/en/c/NNN` "opens like `/c/NNN`" | 0008 D6; README.md / README.en.md short-link passage | D71 per P |
| Orphan remedy in README | README.md / README.en.md "Committing challenges" item | S70 |
| Short link glossary entry | `GLOSSARY.md` short link | S71 |
| `_redirects` header is one fixed string | `pre-commit-sh.test.ts` 0007 H44 (a range whose committed file has `a54e917`'s header) | Still passes: the hook writes the current generator's file; its expected value follows P |
| 0007 vocabulary "watched trees" (`platform/challenge/` and `platform/zh-TW/challenge/`), "watched paths" (adds `platform/public/_redirects`) and D5's trigger list | `.proj.specs/0007-gh-pages-range-fixes/traceability.md` vocabulary and decision D5 | D65, D66: `platform/challenge/` and `platform/<L>/challenge/` for every listed `L`; `range.json` joins the watched paths and the triggers |
| 0007 vocabulary "validator" and its outcome rule "The validator receives the staged paths under `platform/challenge/` that today's filter (`ACMRD`) selects" | 0007 traceability vocabulary and "Outcomes" rules | Y88–Y90: it also receives every listed locale's staged brief paths; the filter stays `ACMRD` |
| 0007 vocabulary "retiring" ("There is no retired tree for Traditional Chinese briefs, so a retired challenge's brief is deleted in the same commit") | 0007 traceability vocabulary | D63: retiring moves `platform/challenge/<slug>/` (the declaration folder) to `.archive/challenge/<slug>/` and deletes every locale's brief in the same commit |
| 0008 D2 and goal G22, read as "each list's copy control opens its own locale" | `.proj.specs/0008-missing-translation-fallback/traceability.md` D2, goals G22 and G23 | D30, D48: a short link coded with the primary locale (and `/c/NNN`) follows the learner's stored preference, so on a `zh-TW`-primary range the `zh-TW` list's `/zh-TW/c/NNN` opens English for a learner who chose English; a translation-coded link always opens that translation. S69 and S71 state it |

### Area Y

Each changes only as stated; stage 6 checks that the diff changes nothing else in them and that any
other test the diff changes is named here.

| Contract | Where, with the tests that pin it | Now |
|---|---|---|
| One schema for the whole challenge frontmatter; REQUIRED `title`, `backend`, `app`; `fs` warned as deprecated | `validateChallengeConfig`, `ChallengeConfig`, `REQUIRED` in `.vitepress/challenge/config.ts`; `config.test.ts` (its `minimal` fixture with `title` and `fs`, "throws when title is missing", "accepts config without fs (fs is now optional/deprecated)", every fixture carrying `fs`, "exports LEGACY_FIELDS constant") | D75: two validators; `title` is the brief's; `fs` ∈ `LEGACY_FIELDS` (D76) |
| `processChallengeFrontmatter` validates one frontmatter carrying everything | `.vitepress/challenge/plugin.ts`; `plugin.test.ts` (fixture with `fs`, "returns public metadata from frontmatter") | Kept, re-pointed: takes the assembled frontmatter and runs both validators (Y-O12) |
| `transformPageData` reads the source through `relativePath` and only adds `markdownBody` | `.vitepress/config.mts` | D78: `filePath`, assembly, PL-E13–PL-E18 |
| The page's slug falls back to a flat file name; the runtime falls back to frontmatter `fs` | `ChallengeLayout`'s slug computed and its `fsPaths` comment and code | Y49, Y50 |
| validate reads `platform/challenge/<slug>/index.md`, supports flat `<slug>.md`, checks one English page | `validateChallenge`, `discoverChallenges`, the file header and the `main()` comment on "agreement across locale trees" in `scripts/challenge-validate.ts`; `tests/challenge-validate.test.ts` — the whole `legacy structure` block, every `per-folder structure` fixture (written as `index.md`), "fails when frontmatter is missing", "fails when required fields are missing", "fails when the frontmatter carries no number", and in `discoverChallenges` "discovers legacy challenges", "filters by target slug (legacy)", "prefers per-folder over legacy with same slug" | D86, D81; Y1–Y37 |
| analyze reads the English `index.md`, supports flat files, prints that page's title | `scripts/challenge-analyze.ts` (`ChallengeFile`, `discoverChallenges`, `validateChallenge`, `analyzeChallenge`); `tests/challenge-analyze.test.ts` ("discovers legacy .md challenges", "reports error when frontmatter is missing", "reports error when file cannot be read", every fixture, `formatAnalysis`'s expected title) | D89; Y66–Y69 |
| keygen reads and rewrites the English `index.md`; tracks it as an input; supports flat files with an `fs` map | the header steps 1 and 8, `processChallenge`, `getTrackedInputPaths` (its doc "challenge markdown"), `main`'s legacy discovery and its flat-structure warning in `scripts/challenge-keygen.ts`; `challenge-keygen.test.ts` ("includes the challenge markdown file" and the other `getTrackedInputPaths` cases' `index.md` fixtures, "challenge-keygen CLI rejects an unusable source_files entry" fixtures, "keygen aborts, names the slug, and leaves frontmatter and the published module alone…" and its case "…leaving index.md and runtime.wasm untouched") | D80; Y52–Y61 |
| retype reads and writes `platform/challenge/<slug>/index.md` | `retypeChallenge`, `splitFrontmatter`/`serializeIndex` in `scripts/challenge-retype.ts`, its header; `challenge-retype-errors.test.ts` ("returns exit code 1 when slug not found" and fixtures), `-metadata`, `-same-family`, `-cross-family`, `-spec-sync` fixtures | D90; Y62–Y65 |
| `create:challenge` writes one `index.md` holding the whole frontmatter in the English tree; English scaffold text; collision on `<slug>/index.md` or `<slug>.md` | `generateMarkdown`, `getTitle`, `checkCollision`, `run`'s scaffold block and W1/W2 texts, the file header in `scripts/create-challenge.ts`; `create-challenge.test.ts` (`checkCollision`'s three cases; `generateMarkdown`'s "generates valid YAML frontmatter parseable by validateChallengeConfig", "writes the assigned number into the frontmatter", "emits a number the numbering validation accepts", "does not include legacy fields", "includes all required frontmatter fields", "uses index.php…", "uses app.py…", "includes a date field…", "includes a tags field…"); `create-challenge-run.test.ts` (`NEW_DIR`, `SCAFFOLD_FILES`, `SCAFFOLD`, `expectScaffold`, `expectW1`/W2 helpers, the stdout scaffold lines) | D82–D84; Y70–Y85. 0007's W1/W2 substring lists (0007 traceability, messages table) gain the brief path; 0007's vocabulary sentence "Challenges are per-folder (`<slug>/index.md`), as `create:challenge` makes them" (its *page URL* entry) becomes historical |
| verify L1/L2 require `platform/challenge/<slug>/index.md` | `makeDefaultRunners` in `scripts/challenge-verify.ts`; `challenge-verify-L1.test.ts` ("fails when index.md is missing" and its fixture), `challenge-verify-L2.test.ts` fixtures, `challenge-verify-blind-orchestration.test.ts` and `-blind-cleanup.test.ts` fixtures | Y86, Y87 |
| lint-staged derives slugs from `platform/challenge/` only, accepts flat `.md`, reports "missing index.md" | `deriveSlugs`, `runLintStaged`, header in `scripts/challenge-lint-staged.ts`; `tests/challenge-lint-staged.test.ts` ("derives slug from legacy flat file", "mixes per-folder and legacy in one batch", "ignores files directly under platform/challenge/ that are not .md", "errors on incomplete slug (directory exists but no index.md)", and every fixture) | Y88–Y90 |
| The hook validates only staged paths under `platform/challenge/` | `scripts/pre-commit.sh` header item 2 and the ACMRD `git diff` for `$WORK/validate`; `tests/pre-commit-sh.test.ts` | Y90 (owned with the hook (0010-S29)) |
| The L4 package reads `platform/challenge/<slug>/index.md` (English) | `buildPlayerPackage` and the file header in `scripts/wxl-solver/build-player-package.ts`; `build-player-package.test.ts` fixtures and its not-found expectation | D85; Y91–Y93 |
| `ChallengeData.id` is the English brief's frontmatter `id`, else the Traditional Chinese brief's, else the position | `mergeLocaleChallenges`' header in `platform/shared/mergeChallenges.ts`; 0008 traceability "Schema: locale challenge data (S4)" | D77: the position (the lists (0010-S17, 0010-S18) implements) |
| README: "every challenge is a Markdown file whose YAML frontmatter declares its settings"; `fs:` still accepted with a deprecation warning; validate "frontmatter and file layout" | `README.md` / `README.en.md` challenge-format section, the `fs:` sentence, the command table | Y97 |
| CONTRIBUTE: `create:challenge` makes a Markdown file under `platform/challenge/`; "do not edit `index.md` frontmatter"; keygen reads and updates the frontmatter | `CONTRIBUTE.md` create, retype and keygen sections | Y98 |
| Layout tables put `index.md` beside `src/` | `docs/agents/challenge-pipeline.md` (two-tree table), `AGENTS.md` Repository layout | Y99 |
| Skills edit `platform/challenge/<slug>/index.md` frontmatter | wxl-create (`SKILL.md`, `SKILL.zhTW.md`, both trees), wxl-mutate, wxl-verify (both trees) | Y94–Y96 |
| Learner pages say challenges declare packages and difficulty "in frontmatter" | `guide/python.md`, `guide/index.md`, `guide/troubleshooting.md` in `platform/en/` and `platform/zh-TW/` | Y100 |
| GLOSSARY 題目宣告 "_Avoid_: frontmatter" | already rewritten in the working tree for epic 0010 | unchanged by this area |

Not overridden (checked): `extractMarkdownBody`; `extract-flag.ts` (reads `src/flag.txt`, unchanged
path); `challenge-sw.js` and the runtime workers (no declaration read); E1/Z1 sentences.

### Area U

Each changes only as stated; stage 6 rejects a change to any other test or comment.

| Contract | Where, with what pins it | Now |
|---|---|---|
| Steps 1–8 write nothing in the range; 0006's Further Notes say the layout epic "will revise step 8's 'nothing is written'" | 0006 traceability "Step order" closing paragraph; spec.en.md Further Notes (ADR-0008 bullet) | **Kept.** Step 8 still writes nothing (D93); the Further Notes bullet is superseded by this spec: step 7 changes B′ in its temporary directory, step 8 plans the move, step 9 writes it |
| Step 7 builds B and T and stops there | 0006 "Step order" row 7; `runUpgradeBody`'s step 7 comment | 7a (`target-layout`) and 7b (B's transform) after both pristine ranges are built |
| Step 8: for every path in B ∪ T ∪ tracked … read o | 0006 "Step order" row 8; vocabulary rows B, T and o; `planMerge`'s JSDoc | 8a (move plan, RC1–RC6) first; the merge reads B′ and o′ (D94); the pre-checks still read the disk |
| Step 9: deletions then writes, then `range.json` | 0006 row 9; `merge-apply.mjs` header | Deletions include every move `from`; writes include every `move` and `declare` `to` and every `strip` `path` (C-5); `range.json` per D105 |
| P-2 "leave o as it is"; 0006 M4/0006 M8/0006 M9/0006 M11 "keep o" | 0006 pre-check and merge tables | For a path a move op writes, "as it is" is the move op's content (D94) |
| 0006 M5: new files take t's executable bit | 0006 merge table; `planMerge`'s 0006 M5 comment (`newFileExecutable`) | A destination takes its source's mode bits (D102) |
| Anchor files list | 0006 vocabulary "anchor files"; `ANCHOR_PATHS` and its comment in `planMerge`; T-0027's note leaving it to this epic | D107's list, compared on B′ and T; UP-A12 expected in a crossing run |
| AC-6 "teacher-own files are untouched and unreported" | 0006 spec AC-6, row U21; `upgrade-merge.test.mjs` U21 | Except a teacher-own legacy page, which is moved and listed in report R6 (U70). U21's fixture (no `platform/` page) is unchanged and still passes |
| AC-9 / U24 "`upstream` replaced, other keys deep-equal and in order, created when absent" | 0006 spec AC-9; traceability "`range.json` after the plan", U24; `buildRangeJson`'s comment; `upgrade-record.test.mjs` "range.json after the plan (U24)" | Plus D105's append in a crossing run. U24's cases ③, ④ and ⑦ keep their results (their B is not legacy) |
| AC-10 "report R1–R5 by id in order"; report R2 counts; report R3 one line per item `code path` | 0006 spec AC-10; "Report" table; `buildReport`, `countsFromOps`, `sortAttention`, `buildR4Lines` | report R6 after report R5 in a moved run; report R2 excludes move ops; UP-A16's report R3 line also carries the key; report R4's crossing line |
| UP-A* texts take no fields | `messages.mjs` comment above `UP-A1` | Holds: UP-A16 takes none; report R3 adds path and key |
| "every one of the 24 codes (E01–E11, I01, A1–A12)" | `upgrade-report.test.mjs` (already stale: lacks E12, E13, A13–A15) | Updated to the full list including UP-E14 and UP-A16 |
| `UP_ARGS` | `upgrade-messages.test.mjs` | Gains UP-E14 and UP-A16 (U106) |
| Out of Scope: "Migrations beyond the three-way merge … added when the first format change needs one" | 0006 spec Out of Scope | This epic adds the first: the layout move |
| B4 "never commits, stages … keeps the teacher's content in every case it cannot settle" | 0006 threat model B4 | Unchanged in what it protects; "Trust boundaries › Area U" adds the move's limits |
| 0006-S2 stage 8 paths (`platform/index.md` tagline, `platform/challenge/door-is-open/index.md`, `…/staff-only/index.md`) | 0006 traceability "Stage 8 simulation" | Historical (0006's run); not rerun. This epic's stage 8 is "Stage 8 plan › Area U" |
| U69's NFC and drive-root fixtures use legacy pages (`platform/café.md`, `platform/a.md`) in B, T and the range | `upgrade-aliases.test.mjs` U69 cases | Their paths move off `platform/` page paths (for example `docs/café.md`, `docs/a.md`) so the run reaches P-9 as before; expected results unchanged |
| `PLATFORM_HOME_RELS = ['platform/index.md', 'platform/zh-TW/index.md']` | `scripts/fork-init.ts`; `tests/unit/scripts/fork-init.test.ts` (fixture `w('platform/index.md', …)`, `A7_HOME_FILES`, the 0003 A7 cases, the dry-run file list, the `T9` missing-file case); `tests/unit/scripts/upstream-guard.test.ts` (its field-id union member `'A7:platform/index.md'`, 0004 T67); `create-wxl/test/helpers/fixtures.mjs` `ENGINE_READY_FIXTURE`; `engine-apply.test.mjs` home assertions; README.md/README.en.md "both home pages" sentence (still true) | `['platform/en/index.md', 'platform/zh-TW/index.md']`; every listed test reads or writes `platform/en/index.md` instead of `platform/index.md`, and `upstream-guard.test.ts`'s member becomes `'A7:platform/en/index.md'` (U116) |
| GLOSSARY working-tree sentence (blob `b307335`): 搬家 「經由升級搬家、而且還沒記主語系的靶場記成英文」 (設定紀錄's 「從舊版面的上游版本升級而搬家、而且還沒有記主語系的靶場，會記成英文」 already states D105) | `GLOSSARY.md` (uncommitted stage 1 edit) | 搬家 must say the range is upgraded from a legacy-layout upstream version (D105), (N17, U135); both land with T4 (B90, K-9) |
| README's upgrade section | README.md / README.en.md "Upgrade a range: `pnpm range:upgrade`" | Gains: the move, report R6, UP-A16, D92's sentence, the move section R28 points at (shared with the build area) |

## Trust boundaries

Every boundary the epic touches. No finding in this epic can be expected under ADR-0005: it touches no challenge's taught vulnerability, and flag exposure through the assembled page data or the display copy is ADR-0005's defect class 3, never expected (Y106). Ranges under one GitHub Pages owner still share the locale preference (R8, OQ-018); `fork:init --rebrand` renames the `wxl-locale` key, so only ranges with the same key share it.

### Area B

| Id | Boundary | What crosses | Rule |
|---|---|---|---|
| B-T1 | Repository content → build: `range.json` | Anyone who can commit or merge to the range (a co-teacher, a merged pull request; ADR-0009's same population) chooses the primary locale. | The value is used only after it equals a member of the locale list; it is never interpolated into code, paths or HTML. `lstat` without following a link, so `range.json` cannot point the build at another file (B5). Messages quote its values (PL-E05, PL-E06) with the site's message quoting, which escapes C0, DEL and C1 characters (D140, B10, B95). PL-E07 does not look inside the excluded areas: a symbolic link at `platform/challenge/<slug>/src` or under `platform/public/` is followed by keygen and by Vite's copy as before this epic (pre-existing, R-16). Worst case: the deployed site's root language changes, or the deploy build fails — both visible, both the same power as editing any page. |
| B-T2 | Repository content → build: page file names and links | File and folder names under `platform/`, link targets in pages, frontmatter strings | Names reach only the error messages: JSON-quoted in PL-E07–PL-E12, bare in PL-E13–PL-E18 (D140). Not protected: in PL-E13–PL-E18 a control character in a folder name or a frontmatter key reaches the terminal raw, as the hook's lines print raw names (TB-S4; RV2-03). Home-page links are rewritten only by prefixing a listed code and are checked against the page list (D13), so the build adds no open-redirect-like link of its own. PL-E11 and VitePress's check bound internal markdown links to published pages. |
| B-T3 | Build constants → learner's browser | `__WXL_PAGES__`, `__WXL_PRIMARY_LOCALE__` | Fixed at build time, the same trust as the page list in 0008 (S2). Nothing at run time can change them. |
| — | Unchanged | Learner storage, the challenge runtimes, `_redirects` (other areas), hosting. | The uncommitted working tree is not a boundary: hosts build from the commit, so a `range.json` left uncommitted changes local builds only (the README states it; documents area). |

### Area A

| # | Boundary | Protects | Does not protect | Change |
|---|---|---|---|---|
| TA1 | URL → where the learner is sent (0008 B2) | A target is still the base followed by a page-list entry, navigated through the router. The strip (D28) runs after decoding and after the `//`, `\`, `..` rejection, removes one whole segment, and its result must be a primary-locale entry, or, when the stripped path is an unlisted primary path, its translation counterpart's entry (D28's fall-through, still a list entry), so `/<P>//host/…`, encoded slashes, backslashes, `..` and malformed encoding end at the not-found page (A18). | A path naming a real page sends the learner there, which is the purpose. | New input class (primary-code paths); same guarantee. |
| TA2 | Learner's acts → stored preference → routing (0008 B4) | Only the list's codes are honoured, exactly; any other value or unreadable storage is no preference (A13). Only a switcher choice and a cold load of a published translation page write. | Any page anywhere can link to a `/<T>/` address and set `T`. Under `P = zh-TW` that is `en`: a link can now set English, which 0008 B4 said no link could. Ranges under one GitHub Pages owner still share `wxl-locale` (OQ-018, R8, D36); `fork:init --rebrand` renames the key, so only ranges with the same key share it; with different primaries, one range's choice still means the same code on the other. | Writer set re-stated per `P`; one consequence widened. |
| TA3 | Build → primary locale on the client (new, D18) | `P` reaches the client as a build-time constant from the teacher's own `range.json`, validated by the build (R19); the client never reads `range.json` and has no runtime input that changes `P`. | A teacher who sets `P` gets that root language on their own site, which is the purpose. | New, inert input. |
| TA4 | Session gate → navigation (0008 B5, ADR-0006) | Unchanged: the cold-load redirect, the not-found redirect and their lines wait for the gate's decision; a switcher line does not (0008 D17). | As ADR-0006. | Reasoning comments only (D35). |

No challenge's taught vulnerability is touched (ADR-0005; see the preamble).

### Area L

- **Teacher content → list HTML.** Titles, descriptions, categories and tags now come from two
  files instead of one; they are still rendered by Vue text interpolation and attribute binding
  (escaped). The loader's output is embedded with `JSON.stringify` by VitePress' loader plugin, as
  today. No new sink. The entry URL is built from the directory name and passed through `withBase`
  into `href`, as `createContentLoader`'s was; a slug cannot carry a scheme (it never starts the
  string; Y's slug grammar).
- **Build environment → published pages.** `WXL_SMOKE_PAGES` is a new build input. Set to `1` in a
  production deploy, it publishes two static test pages with no script, no link and no data: an
  integrity/cosmetic exposure, not a confidentiality one. Documented (LH4); CI's production build
  asserts their absence (L36). It does not reach the client except through the page list.
- **No storage change.** The lists read progress as today; nothing in this area writes
  `wxl-locale` (following a borrowed entry is a later navigation, 0008 D5, area A).
- **Exploit specs** stay on `localhost:5173`; no new origin.
- R8 (OQ-018, shared preference under one GitHub Pages owner) is area A's statement; not touched.

### Area S

| Id | Boundary | What crosses | Rule |
|---|---|---|---|
| TB-S1 | `_redirects` → Cloudflare edge → the learner's browser | A `Location` the edge builds from a request path | Every target is same-origin by construction: a fixed first segment (`/challenge/`, `/<L>/challenge/`) with one `:slug` segment, or a literal page. The old-address rule `/:splat` is the exception: its target **begins** with a value taken from the request, so `/zh-TW//evil.example` may produce `//evil.example`, a protocol-relative off-site redirect on the teacher's domain, unless Cloudflare normalises the path first. S61 is a stage 8 gate; D118 records the fallback that is safe by construction. The rule is written on every `zh-TW`-primary range, including one created after this release that never served `/zh-TW/…` addresses (R22 as written, accepted, R-3); S61 judges the rule, not the range. The safety rests on Cloudflare's normalisation as S61 observes it once; an open question asks for a re-check when Cloudflare changes its redirect handling (B88, R-2). |
| TB-S2 | Directory names → rule text | Slugs from `platform/challenge/` and every locale folder | A name with whitespace or a newline splits or adds a rule field; an all-digit slug can shadow a number. T-0059 (D72) closes it; until then, as today, every target stays on the site except TB-S1. |
| TB-S3 | `range.json` (teacher-controlled, possibly via a merged pull request) → generator, hook, CI | `primaryLocale` | Validated by the R19 reader; only selects among locale-list values, never interpolated into a rule or a shell command. The hook never sources or parses it in bash; Node reads the index's blob (`git show :range.json`) as data. |
| TB-S4 | Hook → the teacher's terminal | Directory names in 0007 W4 and 0007 W6 | As today the names are printed as they are (T-0058 item 3 escapes control characters if taken). |
| TB-S5 | Learner preference shared across ranges of one owner on GitHub Pages | — | Not changed here (R8, OQ-018); stated by the routing area. |

No new network access, credential, or storage key.

### Area Y

| Boundary | Change | Statement for the spec |
|---|---|---|
| Build output → every learner's browser (page data) | The assembled frontmatter, i.e. the whole `challenge.yaml` including unknown keys, ships in every locale's page data | Same exposure as today's frontmatter, now once per locale page from one file. Every key of `challenge.yaml`, VitePress page keys (`head`, `sidebar`, `navbar`, `pageClass`, …) included, now reaches every locale page's frontmatter, so such a key acts on every locale page instead of one; the population that writes it is the one that wrote briefs, and D74 keeps the declaration side open (no denylist, R-8). `challenge.yaml` must hold no secret; `flag` is a path, never a value. Nothing in this epic adds an automated check that the flag value is absent from `challenge.yaml` and every brief (deferred, N20); stage 7 checks it once for this epic's change (Y106): the files newly listed on the Traditional Chinese selected-excerpts page are exactly those the English page already lists, and no scalar of any `challenge.yaml`, at any depth, contains its challenge's flag (compared without one trailing newline, V-6). A finding there is ADR-0005 class 3. |
| Authorisation surface (`tools`, `source_visible`) | Was copied per locale; a translation could grant a different tab set or show source | Now one value per challenge for every locale (Y38, Y51). No translation can widen it. |
| `range.json` (teacher-edited between epics, R13) → `create:challenge`, validate, `buildPlayerPackage` | New reader | Read only through `readPrimaryLocale` (0010-S1); an unusable file stops the tool before it writes anything (Y36, Y73). |
| Repository files → build | `challenge.yaml` is read by the build for the slug a source path names | The slug comes from a path under `srcDir` matching the brief-path pattern; no path from file contents is followed. No new network or runtime input. |
| L4 blind agent input | The package may now be Traditional Chinese | Still a whitelist (H1 + first paragraph) of one brief; `challenge.yaml` is never read into it (Y93). |
| Same-owner locale preference (OQ-018, R8) | none | not touched by this area |

### Area U (0006 B1–B6)

| # | Boundary | Protects (added) | Does not protect (added) | Outside the model |
|---|---|---|---|---|
| B1 | GitHub archives → the range | B and T are only files and directories (0005 entry rules), so B's transform meets no link; B's front matter is parsed with `yaml`'s default limits (D110); a malformed or hostile brief in a `--from <commit>` base stops the run (UP-E14 `base`) | A `--from <commit>` base chosen so that b′ equals o′ at a destination hides an upstream change there (0006 B1's case, now also through the transform) | — |
| B3 | `range.json` → the upgrade | `primaryLocale` is never overwritten (D105) | Anyone who can edit `range.json` can add `primaryLocale` before a crossing run, which keeps `en` from being recorded (the build then uses that value); a wrong `--from` (B1) decides whether the run is crossing, and so whether `en` is recorded for a range that is itself on the legacy layout (D105) | — |
| B4 | The upgrade → the teacher's repository | The move writes and deletes only tracked pages and new, non-ignored paths, never through a symbolic link, a submodule or a name alias (RC1–RC6); it reads a page only after `lstat` reports a regular file (D139) and stops on a translation brief it cannot see (D125); it stages nothing; the restore commands undo it (U120–U122); a stop leaves the range as it was | Relative links and asset imports from a moved page to a file that did not move (an image beside the page, `./shared/` in a teacher's own page), and links into the old paths from other files (README, notes), are not rewritten (D95, D101; U-O3); a translation's dropped declaration value is reported only when introduced (R16), so a divergence the teacher shares with the base is dropped silently; on a case-insensitive file system, a tracked page spelled `Platform/…` is not a legacy page (literal prefix) and is left for the build check; RC3 inherits P-9's file-system limits (0006 B4) | Another process changing the range during the run (0006) |
| B5 | Terminal output | Paths, destinations and declaration keys escaped (`jsonValue`) | — | — |
| B6 | Deployed range → learners | Unchanged: nothing moved is deployed until the teacher commits | — | — |

## Matrix

### Area B — build and routing

Test level: **unit** (vitest; fixture trees and fixture `range.json` files in temporary
directories, never in the repository), **smoke** (Playwright site-smoke on the `pnpm docs:build`
output of the real tree, which upstream builds with primary `zh-TW`), **stage 8** ("Stage 8 plan › Area B").
"Both primaries" means the row is run once with `en` and once with `zh-TW`.

#### Primary locale from `range.json` (0010-S1; D2, D3)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion (pass/fail at the seam) | Level |
|---|---|---|---|---|
| B1 | file × presence × absent (`ENOENT`) | `zh-TW` | `readPrimaryLocale(p)` for a nonexistent `p` returns `'zh-TW'`, equal to `DEFAULT_PRIMARY_LOCALE`. | unit |
| B2 | object × `primaryLocale` × no own property (`{}`, `{"upstream":{…}}`) | `zh-TW` | Returns `'zh-TW'` for each shape in the schema table marked B2. | unit |
| B3 | `primaryLocale` × value × `"en"` | `en` | Returns `'en'`. | unit |
| B4 | `primaryLocale` × value × `"zh-TW"` | `zh-TW` | Returns `'zh-TW'`. | unit |
| B5 | file × kind × not regular (directory; symbolic link to a valid `{"primaryLocale":"en"}` file; FIFO) | PL-E01; the link is not followed | Throws an error whose `code` is `PL-E01` and whose message's first line equals the canonical line; for the symbolic link, no read of the target happens (the result is PL-E01, not `en`). | unit |
| B6 | file × read × fails other than `ENOENT` (a regular file with mode `000`, run as a non-root user; a path whose parent is a regular file, `ENOTDIR`) | PL-E02 with the error code | First line is `PL-E02: range.json could not be read (EACCES).` / `(ENOTDIR).` respectively. Skipped, not failed, when the runner is root (`EACCES` cannot occur). | unit |
| B7 | text × syntax × not JSON (empty; `{`; `﻿{}`; `// c\n{}`; `{} x`) | PL-E03 | Each throws PL-E03 with the canonical first line. | unit |
| B8 | JSON × type × not object (`null`, `[]`, `"en"`, `1`, `true`) | PL-E04 | Each throws PL-E04. | unit |
| B9 | `primaryLocale` × type × not string: the whole files `{"primaryLocale": null}`, `{"primaryLocale": 1}`, `{"primaryLocale": true}`, `{"primaryLocale": ["en"]}`, `{"primaryLocale": {}}` | PL-E05 with the value | First line is `PL-E05: "primaryLocale" in range.json is not a string: null.` (and `1`, `true`, `["en"]`, `{}`). | unit |
| B10 | `primaryLocale` × string × not on the list (`""`, `"EN"`, `"zh-tw"`, `"zh"`, `"ja"`, `" en"`, `"en\n"`, `"\u001b[31m"`) | PL-E06 with the JSON-quoted value | First line is `PL-E06: "primaryLocale" in range.json is "ja", which is not on the locale list: en, zh-TW.`; the line contains `JSON.stringify(value)`: for `"en\n"` the six characters `"`, `e`, `n`, `\`, `n`, `"`, and for the escape value the characters `"\u001b[31m"` with one backslash; no character of the line is below U+0020. | unit |
| B11 | object × other keys × any (`upstream` of any type, unknown keys) | Not read | `{"upstream": 7, "primaryLocale": "zh-TW", "x": []}` returns `'zh-TW'`; `{"upstream": 7}` returns `'zh-TW'`. | unit |
| B12 | object × `primaryLocale` × duplicated key | `JSON.parse` semantics: the last wins | `{"primaryLocale":"en","primaryLocale":"zh-TW"}` returns `'zh-TW'`. | unit |
| B13 | object × `primaryLocale` × only inherited / `__proto__` | Only an own property counts | `{"__proto__":{"primaryLocale":"en"}}` returns `'zh-TW'`. | unit |
| B14 | configuration × source of the primary locale | Only `range.json` at the repository root (D21) | The shipped `__WXL_PRIMARY_LOCALE__` depends only on `range.json` at the repository root (SC2-01): in each of the 16 environments `SITE_BASE` ∈ {unset, `/repo/`} × `CF_PAGES` ∈ {unset, `1`} × `WXL_SMOKE_PAGES` ∈ {unset, `1`} × a probe `WXL_PRIMARY_LOCALE` ∈ {unset, `en`}, the shipped `__WXL_PRIMARY_LOCALE__` on the real (upstream) tree is `"zh-TW"`. Only the root file is read, observed without a spy (V-13): on a fixture tree whose root `range.json` is `{"primaryLocale":"en"}` and whose `platform/range.json` and `.vitepress/range.json` are `{"primaryLocale":"zh-TW"}`, the shipped value is `"en"` in each environment. The real-tree part is upstream-only (D124). | unit |
| B15 | command × `pnpm docs:dev` × `range.json` edited while running | Takes effect after a restart (like a page added, 0008 P5); no automatic reload is promised | V-B6's observations on F-6: after the edit and a reload `/guide/python` is still Traditional Chinese; after a restart and a reload it is English, and `/zh-TW/guide/python` Traditional Chinese. The README text is B85's. | stage 8 (V-B6) |
| B16 | configuration × order × `SITE_BASE` invalid and `range.json` invalid | The `SITE_BASE` error comes first | With `SITE_BASE=x` and a PL-E03 file, importing the configuration throws the `SITE_BASE` error. (Unit via the pure-function order: `SITE_BASE` check, then `readPrimaryLocale`.) | unit |

#### Locale list (D4)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| B17 | module × exports | `LOCALES` = `['en', 'zh-TW']`; `DEFAULT_PRIMARY_LOCALE` = `'zh-TW'`, a member; `isKnownLocale(v)` true exactly for members (case-sensitive; `'EN'`, `'zh-tw'`, `''`, `null`, `1` false) | A unit test pins each value. | unit |
| B18 | repository × other enumerations (D132) | None left in `.vitepress/` and `platform/shared/`; tables keyed by code are typed `Record<Locale, …>` | PAT1: the first command prints nothing; the second prints only lines of the locale-list module (no union, array or comparison chain of codes elsewhere); stage 6 reads the third command's output and finds each keyed object declared `Record<Locale, …>` or `satisfies Record<Locale, …>`, and reads the changed files for an enumeration PAT1 cannot see on one line (D132). | unit (a test running the first two over tracked files); stage 6 |
| B19 | list × member × has a string table and a locales-config entry | Every listed code has `.vitepress/theme/i18n/messages/<code>.json` and an entry in the locales-config table; no messages file exists for an unlisted code | `messages-shape.test.ts` iterates `LOCALES` (not two literal imports); a test lists `messages/*.json` and compares the set of basenames with `LOCALES`; `Object.keys(localesConfig(p))` has `LOCALES.length` keys for each `p`. | unit |

#### Layout check (0010-S2; D1, D5, D6, D20)

Each row runs on a fixture tree that is otherwise valid: `en/index.md`, `zh-TW/index.md`,
`challenge/x/challenge.yaml`, `challenge/x/src/app.py`, `public/favicon.svg`,
`shared/challenges.data.ts`, `postcss.config.mjs`, for both primaries unless stated.

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| B20 | tree × layout × valid new layout | No error | `checkSourceLayout` returns for both primaries; also with an empty `zh-TW/` and with `zh-TW/` absent (primary `en`), and with an empty `en/` and with `en/` absent (primary `zh-TW`) (C-10). | unit |
| B21 | `.md` × place × directly in `platform/` (`index.md`, `challenges.md`) | PL-E08 listing each | First line canonical; the following lines are exactly `  "platform/challenges.md"`, `  "platform/index.md"` (sorted). | unit |
| B22 | `.md` × place × in an unlisted top folder (`guide/x.md`, `reference/x.md`, `ja/index.md`, `fr/a.md`, `zh-tw/index.md`, `EN/index.md`, `docs/a.md`) | PL-E08 listing each | Each path appears in the PL-E08 list. The case variants `zh-tw/index.md` and `EN/index.md` are each written into a fixture tree of their own that holds no `zh-TW/` or `en/` folder (only the primary folder of the other code), so on a case-insensitive file system (darwin's default APFS) they cannot land inside a real locale folder; when the temporary directory is case-insensitive and the variant would collide anyway, that case is skipped with the reason, as U55 does. | unit |
| B23 | `.md` × place × `platform/challenge/` outside `<slug>/src/` (`challenge/x/index.md`, legacy `challenge/x.md`, `challenge/x/notes.md`, `challenge/x/sub/a.md`, `challenge/src/a.md`) | PL-E08 (R28: the legacy flat brief included) | Each path appears in the PL-E08 list. | unit |
| B24 | `.md` × place × `challenge/<slug>/src/**` (`src/README.md`, `src/a/b/c.md`) | Not a page; no error (R28) | `checkSourceLayout` returns; `pageListFromDir` does not list it; VitePress's `srcExclude` holds `challenge/*/src/**`. | unit |
| B25 | `.md` × place × `public/**`, `shared/**` | Not a page; no error (D5); `public/` files are copied as static files | `checkSourceLayout` returns; `pageListFromDir` does not list them; `srcExclude` holds `public/**` and `shared/**`. | unit |
| B26 | name × dot-prefixed, `node_modules/`, `dist/` × any depth, inside or outside locale folders | Ignored: not a page, not checked | `platform/.draft.md`, `platform/en/.x/a.md`, `platform/node_modules/p/README.md`, `platform/en/dist/old.md` give no error and no entry. | unit |
| B27 | file × non-`.md` × outside locale folders (`platform/foo.txt`, `platform/assets/logo.png`, `postcss.config.mjs`); folder × unlisted name × holding no page (`platform/assets/`, empty `platform/ja/`) | Allowed; R6's "locale folder outside the list" is a folder holding a page, which is B22 | No error. | unit |
| B28 | extension × case × `.MD`, `.Md` | Not a page (VitePress's glob is case-sensitive) and not checked | `platform/README.MD` gives no error and no entry. | unit |
| B29 | primary folder × home page × missing (`platform/<p>/index.md` absent; `platform/<p>/` absent) | PL-E10 | For primary `en` with `en/` absent: first line `PL-E10: the primary locale en has no home page: "platform/en/index.md" is missing.`; same shape for `zh-TW`. | unit |
| B30 | non-primary folder × home page × missing | Allowed (a translation is optional, Q2) | Primary `zh-TW` with `en/guide/a.md` and no `en/index.md`: no error. | unit |
| B31 | locale folder × direct entry × named like a listed locale (`zh-TW/en/a.md`, `en/zh-TW/`, `zh-TW/zh-TW/a.md`, `en/en.md`, `zh-TW/en.md`, `en/zh-TW.md`) | PL-E09, for every primary (primary-independent) | Each path appears in the PL-E09 list (`en/en.md` and `en/zh-TW.md` are what the move makes of legacy `platform/en.md` and `platform/zh-TW.md`, U150). | unit |
| B32 | locale folder × entry × named like an unlisted code, or deeper (`zh-TW/ja/a.md`, `en/guide/zh-TW/a.md`) | Allowed | No error. | unit |
| B33 | symbolic link × place × searched area (`platform/en` → a folder; `platform/zh-TW/guide/a.md` → a file; `platform/challenge/x/notes` → a folder) | PL-E07 | Each path appears in the PL-E07 list; the walk does not descend into a linked folder. | unit |
| B34 | symbolic link × place × excluded area (`public/x`, `shared/x`, `challenge/x/src/y`) | Not checked | No error. | unit |
| B35 | tree × several rules violated (a symbolic link, an old-layout page and a missing primary home) | Only the first rule in D6's order is reported, with all its paths | The error is PL-E07; after removing the link it is PL-E08; after moving the page, PL-E10. | unit |
| B36 | page × translation × no primary version (`zh-TW/guide/only.md`, primary `en`) | Allowed by the build (D20); the rule for challenge briefs is validate's and the hook's (VM10, D64) | No error; the page is in the page list as `/zh-TW/guide/only`. | unit |
| B37 | command × where the check runs | Configuration evaluation, so every VitePress command fails before rendering | On a copy of the tree with `platform/index.md` restored (old layout), `pnpm docs:build`, `pnpm docs:dev` and `pnpm docs:preview` each exit non-zero and their stderr contains the PL-E08 first line followed by the listed paths, and no other PL line (pnpm's banner and VitePress's own prefix such as `build error:` may come first; their wording is not pinned). | stage 8 (V-B1) |
| B38 | command × tools before VitePress (`challenge:keygen`, `redirects:generate`, `challenge:validate`) × old layout | Each calls `checkSourceLayout` first (D19) | On the same copy, each command invoked as `node --experimental-strip-types scripts/<tool>.ts` exits non-zero, the PL-E08 first line is the first line on its stderr, and no challenge is processed (no `[skip]`, `[done]` or `✓` line, no file written); through `pnpm` the same holds after pnpm's banner. Unit: each tool's entry function, given an old-layout fixture `srcDir`, throws PL-E08 before discovery (rows owned by each tool's area; listed here so none is missed). | unit, stage 8 (V-B1) |

#### Rewrites and the page list (0010-S3, 0010-S5; D7, D9)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| B39 | source × prefix × in the primary folder / in another locale folder | Primary prefix removed / unchanged | For both primaries, `rewrittenPath` maps every source in the "Source path → URL" table to the file form of its entry; `rewrittenPath('zh-TW/x.md','en')` is `'zh-TW/x.md'`; `rewrittenPath('en/x.md','en')` is `'x.md'`; `rewrittenPath('english/x.md','en')` is unchanged (a whole segment only). | unit |
| B40 | configuration × `rewrites` | A function equal to `rewrittenPath(·, primary)`; no object rules | On the real tree, `typeof config.rewrites === 'function'` and it returns the `zh-TW` column's file form for every source in the table (upstream-only, D124). | unit |
| B41 | page list × duplicates × any tree passing 0010-S2 | No two pages share an entry. Proof: only primary-folder sources are rewritten; a primary entry equals a non-primary entry only if it starts with `/<code>/`, `/<code>` or equals `/<code>/`, which needs a direct entry of the primary folder named like a listed code — PL-E09 | For both primaries, on the fixture trees of B20–B36 that pass, `new Set(list).size === list.length`; the existing duplicate assertion on the shipped list stays. | unit |
| B42 | page list × entries × fixture tree holding every source in the table | Equals the table's column | `pageListFromDir(root, 'en')` equals the `en` column sorted; `pageListFromDir(root, 'zh-TW')` the `zh-TW` column sorted. | unit |
| B43 | page list × real tree × oracle | The shipped `__WXL_PAGES__` equals an oracle built by the test's own walk and its own mapping: the test reads `range.json` itself (absent or keyless → `zh-TW`), strips `<primary>/` and applies the spelling rule | `the page list the site configuration ships` passes with the new oracle; upstream gives the `zh-TW` column. | unit |
| B44 | built site × published HTML × real tree | The dist HTML set equals the source set mapped by the same independent rule | `the page list spelling matches the pages VitePress published` passes with the mapping; `dist/index.html` is the Traditional Chinese home and `dist/en/index.html` the English home. Upstream-only (D124). | smoke |
| B45 | rendered page × `relativePath` × arrival | `entryForRelativePath(page.relativePath)` is the page's list entry | `classifyArrival` given `relativePath: 'guide/python.md'` returns entry `/guide/python`, and given `'en/guide/python.md'` returns `/en/guide/python`; both are in the shipped list of the matching primary. | unit |
| B46 | rendered page × `localeIndex` | `'root'` on a primary page, the code on another | `localesConfig(p)` has key `root` and exactly the other listed codes; VitePress's `getLocaleForPath` (matching `^/<key>/` against `relativePath`) therefore gives `root` for `guide/python.md` and `en` for `en/guide/python.md` when `zh-TW` is primary. Consumers' mapping is the runtime area's (D18). | unit |
| B47 | configuration × `__WXL_PRIMARY_LOCALE__` | JSON string of the primary | On the real tree it is `"\"zh-TW\""` (upstream-only, D124); on a fixture tree with `{"primaryLocale":"en"}` it is `"\"en\""`. | unit |
| B48 | output × file placement | Primary pages at the output root, others under `<code>/` | Upstream build: `dist/guide/python.html` holds the Traditional Chinese Code-panel guide, `dist/en/guide/python.html` the English one; no `dist/zh-TW/` folder exists. Upstream-only (D124). | smoke |
| B49 | dev server × URL → source | VitePress's rewrites middleware serves the primary page at the unprefixed URL | `pnpm docs:dev` on upstream: `/guide/python` renders the Traditional Chinese page, `/en/guide/python` the English one. | stage 8 (V-B6) |

#### Page data and loaders (D10, D11)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| B50 | `transformPageData` × challenge page × in the primary folder (`relativePath` ≠ `filePath`) | Reads `platform/<filePath>` | Given `{relativePath: 'challenge/x/index.md', filePath: 'zh-TW/challenge/x/index.md', frontmatter: {layout: 'challenge'}}` and a `srcDir` holding only the latter, `markdownBody` equals that file's body (today's code throws `ENOENT`). | unit |
| B51 | `transformPageData` × challenge page × in a non-primary folder (`relativePath` = `filePath`) | Same | `markdownBody` equals the file's body. | unit |
| B52 | `transformPageData` × page × `layout` ≠ `challenge` | No `markdownBody` | `frontmatter.markdownBody` stays undefined. | unit |

#### Locales config and pages' chrome (0010-S4; D8, D22)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| B56 | `localesConfig` × primary `en` | Today's object | Deep-equals the `locales` literal of `.vitepress/config.mts` at `65de8c0` (copied into the test). | unit |
| B57 | `localesConfig` × primary `zh-TW` | The schema example | Deep-equals the JSON in "Schema: locales config". | unit |
| B58 | `localesConfig` × keys and links | `root` has no `link`; every other key `k` has `link: '/k/'` and every nav and sidebar link (and sidebar key) starts with `/k/` | Checked for both primaries over every entry. | unit |
| B59 | built HTML × `<html lang>` | The page locale's `lang` | Upstream build: `dist/index.html` and `dist/guide/notes.html` have `lang="zh-TW"`; `dist/en/index.html` and `dist/en/guide/notes.html` have `lang="en-US"`. Upstream-only (D124). | smoke |
| B60 | site × `title`, `description` | Unchanged, site-level, for every locale | The configuration's `title` is `"Web eXploitation Laboratory"` and `description` today's string; the configuration file has exactly one line matching fork:init's `A6_CANDIDATE_RE` (`/^ {2}title: .+,\r?$/`, imported from `scripts/fork-init.ts`, the pattern D22 quotes) and exactly one `const siteBase = ` line, and fork:init's existing A6 and 0003 A9 cases on the real configuration pass unchanged. | unit |
| B61 | nav bar title × link | The page locale's home | Upstream build: the nav title link on `dist/en/guide/notes.html` has `href="/en/"`; on `dist/guide/notes.html` `href="/"` (base `/`). | smoke; stage 8: V-B3 (base `/`) and V-B4 (base `/<repo>/`) (V-3) |

#### Home-page links (0010-S7; D13)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| B62 | link × site-absolute, unprefixed × page in the primary folder | Unchanged | `localizeHomeLinks` returns `/challenges/` for an `en` page with primary `en`. | unit |
| B63 | link × site-absolute, unprefixed × page in another folder | Prefixed with `/<code>` | `/challenges/` → `/en/challenges/` for an `en` page with primary `zh-TW`; `/guide/` → `/zh-TW/guide/` for a `zh-TW` page with primary `en`; `/` → `/en/`. | unit |
| B64 | link × external (`https://example.com/`, `mailto:a@b`) or `#x` | Unchanged, unchecked | Returned as written. | unit |
| B65 | link × relative (`challenges`, `./guide/`, `../x`) | PL-E12 `is a relative link…` | Throws with `<field>` naming the index, e.g. `hero.actions[0].link`. | unit |
| B66 | link × carries a listed prefix (`/zh-TW/guide/`, `/en/`, `/en`) / a first segment that only starts like a code (`/english/`, `/enroll/`, `/zh-TWx/`) | PL-E12 `already carries a locale prefix…` / not that reason (a whole first segment only, C-11) | Throws, for both primaries and both page locales; with fixture pages `platform/<L>/english/index.md`, `enroll/index.md` and `zh-TWx/index.md` present in the page's locale the three links pass, and without them they throw only the `does not name a published page` reason. | unit |
| B67 | link × names no page after prefixing (`/nope/`, `/c/001`, `/challenges/x`; on a translation home, a page the translation does not have, such as `/guide/` with `platform/<T>/guide/` deleted) | PL-E12 `does not name a published page`, with no fall-back to the primary locale's URL (D13) | Throws; the match uses the not-found lookup's candidates (query and hash removed, trailing slash either way), so `/challenges/` and `/challenges?x#y` pass. | unit |
| B68 | link × not a string (`null`, `1`, `{}`) | PL-E12 `is not a string` | Throws. | unit |
| B69 | page × `layout` ≠ `home` × has `hero`/`features` | Ignored | Returned unchanged; no error. | unit |
| B70 | upstream home pages × both primaries | The "Home-page links" table | Unit on the real files for both primaries; smoke on upstream: `dist/index.html`'s hero buttons have `href="/challenges/"` and `"/guide/"`, `dist/en/index.html`'s `"/en/challenges/"` and `"/en/guide/"`. Upstream-only (D124). | unit, smoke |

#### Links and imports in content (0010-S6; D12, D14, D16; ADR-0008)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| B71 | markdown link × relative, same folder (`./network`, `../reference/x.md`) | Resolves inside the page's locale for both primaries; VitePress's check applies | Plugin: no error for both primaries. Built upstream: `dist/guide/notes.html`'s export-format link resolves to `/reference/attack-log-export-format` (the Traditional Chinese page) and `dist/en/guide/notes.html`'s to `/en/reference/attack-log-export-format`. | unit, smoke |
| B72 | markdown link × resolves to a URL whose first segment is the primary (`../../en/reference/x.md` from `zh-TW/guide/notes.md`, primary `en`; `../../zh-TW/guide/x.md` from `en/guide/a.md`, primary `zh-TW`; absolute `/en/guide/` with primary `en`; `/zh-TW` with primary `zh-TW`) / a first segment that only starts like the code (`/english/x`, `../../enroll/x.md` with primary `en`; `/zh-TWx/y` with primary `zh-TW`) | PL-E11 / not PL-E11 (the first segment must equal the code, D12; C-11) | The plugin, rendering with `env.relativePath` of the page, throws PL-E11 naming the page and the href; for the second group it throws nothing (VitePress's own dead-link check then judges those links). | unit; stage 8 (V-B1) measures that VitePress's own check passes such a link |
| B73 | markdown link × cross-folder into a non-primary folder (`../zh-TW/guide/x.md` from `en/guide/a.md`, primary `en`) | Works; VitePress's check applies | No PL-E11; built URL `/zh-TW/guide/x`. | unit |
| B74 | markdown link × escapes the locale folder (`../../reference/x.md` from `zh-TW/guide/notes.md`, today's form) | Primary `en`: VitePress passes it and it opens the English page (crosses locale; accepted, ADR-0008). Primary `zh-TW`: resolves outside `srcDir`, VitePress reports a dead link and the build fails | Stage 8 V-B1 reproduces both. The upstream file no longer has this link (B78). | stage 8 |
| B75 | markdown link × site-absolute, not naming the primary (`/guide/python`) | VitePress's check against the URL; may cross locale (accepted, ADR-0008); upstream has none | Plugin: no error. `git grep -nE '\]\(/' -- 'platform/*.md'` finds nothing upstream (documented as the convention in the README, documents area). | unit |
| B76 | link × raw HTML `<a href>` in markdown, links built by components | Not checked by PL-E11 (as VitePress's check does not see them) | B84's authoring paragraph, in both READMEs, states that these links are not checked. | stage 6 (document review) |
| B77 | configuration × `ignoreDeadLinks` | Unset | `config.ignoreDeadLinks` is `undefined` on the real tree. | unit |
| B78 | `platform/zh-TW/guide/notes.md` × export-format link | `../reference/attack-log-export-format.md` | The file holds that link and no `../../`; B71's smoke href holds. Upstream-only (D124). | unit (grep), smoke |
| B79 | page × data import × every list and home page in both locale folders (`en/index.md`, `en/challenges.md`, `zh-TW/index.md`, `zh-TW/challenges.md`) | `../shared/challenges.data.ts`, `data` passed whole (D14, D40) | Each of the four files imports `../shared/challenges.data.ts` and no file imports `challenges.zh-TW.data.ts`; the upstream build succeeds and the English list at `/en/challenges` renders the four challenges (`site-smoke.spec.ts`); this smoke part is upstream-only and skipped in a range or a fork (D124; RV2-17). | unit (grep), smoke |

#### Dead code, upstream site and existing tests (D15, D23)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| B80 | `.vitepress/theme/Layout.vue` | Deleted | The file does not exist; `git grep -n "theme/Layout"` finds nothing; the build succeeds. | unit (file check) |
| B81 | upstream × root language | `zh-TW` at `/`, English at `/en/` | Smoke with stored value `zh-TW` (so no cold-load redirect runs): `/` shows 開始挑戰; `/en/` with stored value `en` shows `Start Challenge`. Upstream-only (D124). | smoke |
| B82 | `site-smoke.spec.ts` × English assertions | Navigate to `/en/…` instead of `/…` | The spec's `goto` paths for English assertions start with `/en/`; it passes. `playwright.site.config.ts`'s pinned-locale comment says why. | smoke |
| B83 | `tests/challenges/*.spec.ts` × `/challenge/<slug>/` | Now the Traditional Chinese brief; the exploit drives the runtime, not the text | `pnpm test:challenges` passes unchanged. | L3 |

#### Documents added in integration (N22)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| B84 | `README.md` and `README.en.md` × section "Moving to the locale folders" (「搬到語系資料夾」) | Exists in both languages and gives the manual move for a range that does not use the upgrade (a fork without `range.json`), as numbered steps in this order: (1) merge the release first (its new `.vitepress/`, `scripts/`, `platform/shared/`, `platform/public/`, `package.json`, `pnpm-lock.yaml` and upstream's moved pages); the move is meaningless on the old code; if the merge stops on a page upstream renamed and the fork edited, keep upstream's new path and carry the fork's edit there; (2) move every page outside the locale folders to `platform/en/` keeping its path; (3) write each English brief's frontmatter lines other than `title`, `description` and `layout` unchanged into `platform/challenge/<slug>/challenge.yaml` and delete them from every brief; (4) in every list and home page of every locale folder, import `../shared/challenges.data.ts` (replacing `./shared/challenges.data.ts` and `../shared/challenges.zh-TW.data.ts`, which no longer exists) and pass `:lists="data"` instead of `:challenges="data"` (D40); (5) write every home-page link from the locale's own home, dropping a `/zh-TW` prefix (`/zh-TW/challenges/` → `/challenges/`, D13); a translation's home page may link only to pages that translation has; (6) move files a moved page uses that stayed behind; (7) add `"primaryLocale": "en"` to `range.json` (creating it when absent) to keep English at the root: a fork without `range.json`, or without the key, now serves Traditional Chinese at the root (R17), even when it has no page of its own to move; (8) run `pnpm build`. It then says: a root `range.json` also makes the tree a range for the upstream decision (0005's override of 0004 T66), so upstream-only tests skip there, as in any range; a range whose `range.json` has no `upstream` upgrades only with `--from <version>`; without it `pnpm range:upgrade` stops with UP-E06 `upstream` until epic 0011 (R25, U143). An authoring paragraph states that raw HTML links and component-built links are not checked (B76). It lists every code PL-E01–PL-E18 with its cause and fix (D17), names `smoke-fixtures/` as reserved (D49) and says that a page moved there, by hand or by the upgrade (a legacy `platform/smoke-fixtures/x.md` becomes `platform/en/smoke-fixtures/x.md`), is not published by a production build (R-12), and says that an uncommitted `range.json` changes local builds only. | Stage 6: both headings are exactly the ones PL-E08 names; each listed step, in that order, and one line per code exist in both languages; stage 8 V-U4 (b) and (c) follow it on F-5 and the build passes. | stage 6; stage 8 |
| B85 | READMEs × changing the primary locale later (Q18) | States the cost and that no tool does it: edit and commit `range.json` (the hook regenerates `_redirects`, or run `pnpm redirects:generate`); restart `pnpm dev` (B15); the site root changes language; `/c/NNN` opens the new primary locale's page; links already handed out without a locale code open the new primary locale's page, and `/<old primary>/…` links reach the root only through the old-address rule (`zh-TW`) or the not-found page's strip (D28); the brief every challenge must have becomes the new primary locale's (VM10), so a commit that changes `primaryLocale` while some challenge lacks the new primary locale's brief is refused by the hook with W6a naming it (S74), and each such brief must be written first; hero and nav links follow by themselves (D8, D13); a `challenge.yaml` edit shows in the list after a reload and on the challenge page after a restart (N18). | Stage 6: each listed consequence is in both languages and is true under D2, D13, D28, D58, D60, D86, D87. | stage 6 |
| B86 | READMEs × the setup record (`range.json`) | Names `primaryLocale`, its values (the locale list), the default `zh-TW` when the file or the key is absent, the failures PL-E01–PL-E06, and that until epic 0011 a teacher chooses it by editing the file (R13). Also: a translation's home page may link only to pages that translation has (D13, PL-E12); a range that reruns `pnpm fork:init --site-name` must keep both home pages, since fork:init still requires them (U145, U-O8); a `range.json` without `upstream` needs `--from` for `pnpm range:upgrade` (U143). | Stage 6 reading against D2, D13, D114, U143, U145. | stage 6 |
| B87 | `docs/adr/0008-locale-folders-primary-chosen-at-build.md` × consequence 2 and the decision's "which every page must exist in" | Two dated notes (2026-11-15, spec 0010), the decision's own text unchanged: under consequence 2, a link naming the primary locale's folder passes VitePress's dead-link check, so the build adds PL-E11 (BC12); under the decision paragraph, "every page must exist in the primary locale" holds for challenge briefs (VM10, D64) and for upstream (D52), while a range's article may exist in one translation only (D20, BC19). The consequence-2 note also names what the build still lets through (K-7): raw HTML links and component-built links (TB2, B76), and a translation locale's nav and sidebar links, which D8 prefixes without checking them against the page list (a missing page there reaches the not-found lookup, which sends the learner to the primary locale's page). | Stage 6: both notes exist and the consequence-2 note names the three exceptions; every other line of the file is byte-identical. | stage 6 |
| B88 | `.proj.specs/OPEN-QUESTIONS.md` × epic close-out | OQ-024 closed: `**Status:** closed (<close-out date>, epic 0010)`; a new `**Update on <close-out date> (epic 0010).**` paragraph saying the layout epic landed it and pointing at `.proj.specs/0010-primary-locale-layout/spec.en.md` AC-1, AC-4, AC-9 and AC-24; the **Evidence** paragraph's paths marked as read at 2026-10-24 (historical); `**Revisit when.**` becomes "None: closed by epic 0010."; OQ-020 updated (the setup record now holds `primaryLocale`; 0005 R2 amended); OQ-018 updated (R8: ranges under one GitHub Pages owner still share the preference; `fork:init --rebrand` renames the `wxl-locale` key, so only ranges with the same key share it); new entries for the interface word 挑戰 (L-O3, including the `challenge_list.default_title` value `網站攻防挑戰` D42 moves, K-5), the flag-exposure check (N20), an `en`-primary CI build (B-O2, built on a fixture copy with its own `range.json`, never a root `range.json` in upstream's checkout, D136), the server-rendered `$t` strings outside the lists and home page (D128), and a re-check of S61 when Cloudflare changes its redirect handling (R22's splat relies on Cloudflare's path normalisation as S61 observed it, R-2). | Close-out: each entry holds that content. | close-out |
| B89 | Release-note input (R20, R31) | The epic's retrospective lists, for the next release's `/tw-emoji-release-note` run: upstream's unprefixed URLs now open Traditional Chinese and English moved to `/en/` (R20, D23); a page that imports `challenges.zh-TW.data.ts` or uses `data` as an array must import `../shared/challenges.data.ts` and use `data[<locale>]` (D40); `id` is no longer a declaration key (D77) and `fs` is retired (D76); a short link coded with the primary locale follows the preference (D30); the upgrade moves a legacy range and records `en` (D105); `ChallengeList` and `HomeContent` take `:lists="data"` in place of `:challenges="data"` (D40, LH5); a fork without `range.json` (or without its `primaryLocale`) now serves Traditional Chinese at the root, and `{"primaryLocale":"en"}` in `range.json` keeps English (R17, V-U5). | Close-out: the retrospective's release-note section holds each item. | close-out |
| B90 | `GLOSSARY.md` × the working-tree edit of stage 1 (blob `b307335`) | Lands with the switch ticket (T1), except U135's 設定紀錄 and 搬家 sentences on the upgrade's `en`, which land with the upgrade's move (T4), so `main` never describes behaviour it does not have (AGENTS.md's same-change rule, K-9). Every entry it changes is true after this epic and before epic 0011. Changed: 主語系 says every challenge has a primary-locale brief, upstream has every page in every locale, and a range's article may exist in one translation only (BC19; 「每一頁都一定有它的版本」 goes), and its 【已為假的舊說法】 _Avoid_ line's 「他看到的就是主語系」 becomes 「他看到的是他打開的那個網址的語系」 (D25, K-2); 語系偏好's definition sentence 「還沒有語系偏好的學習者看到的就是主語系」 becomes 「還沒有語系偏好的學習者看到的是他打開的那個網址的語系」 (D25, K-2), and its _Avoid_ line becomes 「以為在同一個分頁裡跟著站內連結走也會改變它」 and says that any full load of a translation page's address (a link from outside the site, a link opened in a new tab, a reload) sets it (D26, TA2, K-10); 翻譯 gains an _Avoid_ line against reading a translation-only page as an error; 短連結's uncoded-form _Avoid_ line keeps 「導向主語系那一頁」 and adds 「題目沒有主語系說明頁時，開它唯一存在的那一頁」 (D58, S71, K-11); 舊版面 is 「至少有一個頁面不在任何語系資料夾裡」 (D91), without making per-locale declarations part of it, and 舊版面 and 搬家 say 說明頁, not 題目頁, for the brief file; 語系清單's 「靶場裡也不能有清單以外的語系資料夾」 becomes 「清單以外的資料夾裡不能有頁面」 (PL-E08 fails only on a page there, D6; recorded under "Items for the user"). Every term marked `_新造詞_` that this epic's corpus files (`README.md`, `CONTRIBUTE.md`, `AGENTS.md`, `platform/**/*.md`, `zh-TW.json`; `glossary.test.ts`'s corpus) start to use loses its `_新造詞_` line and its 「此前只出現在…」 clause in the same change (K-1): at least 語系資料夾 (B84's heading 「搬到語系資料夾」, PL-E08) and 題目宣告 (Y100, LH1), and 主語系, 語系清單, 舊版面, 搬家 and 委託書 wherever this epic's corpus text uses them. | `pnpm vitest run tests/unit/site/glossary.test.ts` passes on the switch ticket's commit and on the upgrade ticket's commit (its "does not declare itself new while already in use" cases included); stage 6 reads each changed entry against D2, D6, D20, D24–D30, D38, D58, D73, D91, D105; no entry says that a learner with no preference sees the primary locale. | unit; stage 6 |
| B91 | searched area × `platform` itself a symbolic link (to a valid tree) | PL-E07 listing `"platform"`; the walk does not follow it | `checkSourceLayout` on a fixture whose `srcDir` is a symbolic link throws PL-E07 with the list `"platform"` (non-Windows; skipped elsewhere with the reason). | unit |
| B92 | home-page link field × `features[*].link` (`/guide/`, relative `guide`, `/zh-TW/x`, `null`) on a translation home; a `features` entry without `link`; a field outside the two (`hero.image.src`, `features[0].icon.src`) | Prefixed / PL-E12 relative / PL-E12 prefix / PL-E12 not a string, each naming `features[<i>].link`; no error; never read | `localizeHomeLinks` returns or throws as stated; the two other fields are returned byte-identical. | unit |
| B93 | real-tree tests × repository kind (D124) | The D124 rows are upstream-only; every other real-tree test derives from `P` and the tree | D124's helper, called with the upstream decision's inputs stubbed (as U139 does), returns the decision's skip reason for a range and for a fork and nothing for upstream; stage 6 checks with `git grep` that each D124 row's test is declared through that helper (RV2-07), and that every other test reading the real tree computes its expectation from `P` and the tree it runs on (D54). That upstream's CI never skips them silently rests on the `test` job's existing expectation check (`upstream-guard.test.ts`, run when `WXL_EXPECT_UPSTREAM` is set), which fails when `WXL_EXPECT_UPSTREAM=true` and the decision is false; the `site-smoke` job reads the same decision and sets no such variable (D124; RV2-06). V-B7 observes the skips in a range. | unit; stage 6 |
| B94 | home-page link × protocol-relative (`//evil.example/`, `//evil.example`) in `hero.actions[*].link` and `features[*].link`, both primaries, both page locales (D141) | PL-E12 `is a protocol-relative link…` | `localizeHomeLinks` throws PL-E12 naming the field; `https://example.org/`, `mailto:a@example.org` and `#top` still pass unchecked. | unit |
| B95 | message quoting × values with DEL and C1 characters (`"\u007f"`, `"\u0085"`, `"\u009b[31m"`), a lone surrogate (`"\ud800"`), C0 characters (tab, CR, LF, ESC) and values `JSON.stringify` cannot write (`undefined`, a function) (D140) | One site quoting function, equal to create-wxl's `jsonStringifyEscaped` | PL-E06's first line for `"\u009b[31m"` holds `"\u009b[31m"` with one backslash; the function writes a tab as `"\u0009"`, CR as `"\u000d"`, LF as `"\n"`, ESC as `"\u001b"`, the lone surrogate as `"\ud800"` and DEL as `"\u007f"` (one backslash each, lowercase hex), and returns `undefined` for `undefined` and for a function (the message then prints the type name); no character of a first line or path list line of PL-E05–PL-E12 is below U+0020 or in U+007F–U+009F (PL-E13–PL-E18 print paths and keys bare, D140; RV2-03, RV2-10); a site test runs the site function and create-wxl's `jsonStringifyEscaped` (read from `create-wxl/src/text.mjs`) over one table of values and requires equal output. | unit |

### Area A — learner arrival

The cold-load decision table (A-§4.1) and the switcher table (A-§4.3) are under "Fixed lists"; their rows DT01–DT80 and SW01–SW16 are matrix rows.

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion (pass/fail at the named seam) | Level |
|---|---|---|---|---|
| A1 | Cold load, primary-locale page, no preference (DT01, 02, 07, 08, 41, 42, 47, 48) | No redirect, no line, nothing written, whether or not the counterpart exists. | 0010-S10: `redirectTargetForStoredLocale` returns `null` for each row × both bases × challenge and article × every invalid value; 0010-S13: the real Layout calls no `go`, renders no `[data-missing-translation]` (no `data-line` value other than `none`), and `wxl-locale` is unchanged after the gate releases. | unit; smoke (P=zh-TW) |
| A2 | Cold load, primary-locale page, stored = `P` (DT03, 04, 45, 46) | No redirect, no line, nothing written. | As A1 for these rows. | unit |
| A3 | Cold load, primary-locale page, stored = `T`, counterpart listed (DT05, 43) | `replace` to the counterpart's list entry, base, query and hash kept; carries `T`; no line on the landing; nothing written. | 0010-S10 returns `base + '/<T>' + entry + search + hash` (e.g. `P=zh-TW`: `/repo/en/guide/python?q=1#h`); 0010-S13: exactly one `go(target, { replace: true })`, no line after landing, `wxl-locale` unchanged. | unit; smoke; stage 8 |
| A4 | Cold load, primary-locale page, stored = `T`, counterpart not listed (DT06, 44) | No redirect; the line in `T` after the gate's decision; nothing written. | 0010-S10 returns `null`; 0010-S13: no `go`, the line's `lang` is `T` after the gate decides and absent before; `wxl-locale` unchanged. | unit; smoke; stage 8 |
| A5 | Cold load, translation page, any stored value, either counterpart (DT09–16, 49–56) | No redirect, no line; `T` written. With `setItem` refusing: nothing throws, nothing is written, and still no redirect. | 0010-S10: `redirectTargetForStoredLocale` returns `null` and `shouldPersistOnColdLoad(arrival, P)` is `true` exactly for page arrivals whose entry's locale is `T`; 0010-S13: no `go`, no line, `wxl-locale === T` (or unchanged, with no throw and no `go`, when `setItem` throws, even with a stored `P`). | unit; smoke; stage 8 |
| A6 | Every DT row with a redirect or a line | Both wait for the session gate's decision on the cold load's page (0008 A6, 0008 C11); a switcher choice's line does not (0008 D17). | 0010-S13: the existing session-gate cases (`theme-locale-wiring.test.ts` "the real Layout: the shared-machine session gate", `not-found-wiring.test.ts` gate cases) pass with `P` set to each value and a stored `T`. | unit |
| A7 | Base `/<repo>/` | Entries base-less, lookup strips the base, targets keep it. | 0010-S10 and 0010-S13 cases of A1–A5 and A14–A17 run under `/` and `/repo/`. | unit; stage 8 (VA2) |
| A8 | Alias URL rendering a primary-locale page (`/challenges.html`, `/guide/index.html`, trailing slash) | Identity is the rendered page's entry (0008 D16); a redirect targets the counterpart's entry. | 0010-S10: with `P=zh-TW`, stored `en`, entry `/challenges`, URL `/challenges.html` → `/en/challenges`; with `P=en`, stored `zh-TW` → `/zh-TW/challenges`; with no preference → `null` for both. | unit; smoke |
| A9 | Cold load landing after a server redirect or a reload: `/c/NNN`, `/<T>/c/NNN`, `/<P>/c/NNN`, Cloudflare's R22 splat, a reload | Classified by the landing page (0008 D13): a translation landing is A5 (writes `T`); a primary-locale landing is A1–A4 (writes nothing; a stored `T` may redirect) (D26, D30); an orphan translation brief's `/c/NNN` (S-§4.3) lands on the translation page and writes `T` (C-18). | 0010-S13: a cold load arriving at a translation entry writes `T`; at a primary-locale entry writes nothing — the same cases as A1–A5, plus the orphan's landing writing `T`; stage 8 VA1e, VA1f, VA1l observe it through real server redirects. | unit; stage 8 |
| A10 | Upstream's old unprefixed English URLs once `P = zh-TW` (R20, F18) | No redirect rule. A stored `en` reaches `/en/X` by A3 when listed; no preference shows the `zh-TW` page by A1. | No row of its own beyond A1/A3; stage 8 VA1k observes `/guide/python` with stored none (zh-TW, no line) and stored `en` (`/en/guide/python`). The release note records it (R20; release area). | stage 8 |
| A11 | Requested locale, every arrival kind | Cold load of a translation page: `T`. Cold load of a primary-locale page and every later navigation: the valid stored value, else the page's own locale (D25). Switcher choice: the chosen locale. Not-found arrival: the path's own locale. A redirect 0008 S1 made carries its arrival's value to its landing only (0008 L6). | 0010-S13: with no preference, a later navigation onto a page whose counterpart is missing shows no line (both `P`, both page kinds); with stored `T`, a later navigation onto a primary-locale page without a `T` version shows the line in `T`; with stored `P`, onto a translation page without a `P` version, the line in `P`. | unit |
| A12 | `DEFAULT_VISITING_LOCALE` | Removed, with its doc block. | Terminal (VA4): `git grep -n DEFAULT_VISITING_LOCALE -- .vitepress tests platform` prints nothing; the unit suite passes. | unit; stage 8 (terminal) |
| A13 | `readStoredLocale` | Returns a valid stored value, else `null`; never throws; the in-memory choice first (0008 D14). Validity is membership of the locale list (D4), exact match. | 0010-S10: `null` for `fr`, `ja`, `zh-tw`, `EN`, `''`, unreadable storage; the value for `en` and `zh-TW`. | unit |
| A14 | Not-found translation path, counterpart listed (DT17, 19, 21, 23, 57, 59, 61, 63) | `replace` with `/X`'s entry, query and hash kept; the line in `T` on the landing (0008 C1 generalised). | 0010-S10: `notFoundRedirect` returns `{ entry: '/X…', requested: T }` (e.g. `P=zh-TW`: `/en/guide/zh-only` → `/guide/zh-only`, requested `en`); 0010-S13: one `go(…, { replace: true })`, landing line `lang = T`, `wxl-locale` unchanged. | unit; smoke; stage 8 |
| A15 | Primary-code path, `/X` listed (DT25, 27, 29, 31, 65, 67, 69, 71) (D28) | `replace` with `/X`'s entry; requested `P`; no line on the landing; nothing written. Includes `/<P>` and `/<P>/` → `/`, `/<P>/index.html` → `/`, `/<P>/guide/python.html` → `/guide/python`. | 0010-S10: `notFoundRedirect` returns `{ entry: '/X…', requested: P }` for each input, under both `P` and both bases; 0010-S13: one `go` with `replace`, no `[data-missing-translation]` on the landing, `wxl-locale` unchanged, and no cold-load redirect afterwards even with a stored `T` (D29). | unit; smoke (P=zh-TW); stage 8 (VA2) |
| A16 | Primary path not found, `/<T>/X` listed (DT33, 35, 37, 39, 73, 75, 77, 79) (D27) | `replace` with `/<T>/X`'s entry; the line in `P` on the landing (0008 C2 in two-locale form). | 0010-S10: `notFoundRedirect` returns `{ entry: '/<T>/X…', requested: P }`; 0010-S13: landing line `lang = P`. | unit |
| A17 | Not-found path whose counterpart is not listed (every "missing" not-found DT row; for a primary-code path, neither `/X` nor `/<T>/X` listed), and the double or malformed prefixes `/<P>/<P>/x`, `/<P>/<T>/x`, `/<T>/<T>/x`, `/<T>/<P>/x`, `/<P>foo` (no separator: a primary path) | The not-found page; no line; nothing written (0008 C3). | 0010-S10: `lookupNotFound` returns `null` and `notFoundRedirect` returns `null` for each input under both `P`; 0010-S13: no `go`, no line, `wxl-locale` unchanged. | unit; smoke |
| A18 | Crafted paths with a locale segment, under both `P`: `/<P>//evil.example/x`, `/<P>/%2F%2Fevil.example`, `/<P>/\evil.example`, `/<P>/%E0%A4%A`, `/<P>/../x`, and the same with `/<T>/` (0008 C10) | The not-found page; no throw; any target is the base followed by a list entry. | 0010-S10: `lookupNotFound` returns `null` and does not throw for each, including `/<P>/%E0%A4%A` and `/<T>/%E0%A4%A`, for which `decodeURIComponent` throws `URIError`; for every input that does redirect in A14–A16 and A39, the target starts with the base and its base-less path is a list entry. | unit |
| A19 | Not-found and failed-load bookkeeping, both `P` | No not-found arrival or failed load writes (0008 C5, 0008 W3); a failed load is left alone (0008 C8); at most one not-found redirect per arrival (0008 C9); no cold-load redirect after a not-found redirect. | 0010-S13: the existing 0008 C5, 0008 C8, 0008 C9 cases pass with `P` set to each value, plus the D29 case in A15. | unit |
| A20 | Not-found reached by cold load and by client navigation; Back afterwards | Both as A14–A17 (0008 C4); Back returns to the page before the not-found path (0008 C7). | 0010-S13 for both entries; smoke for Back on the upstream build. | unit; smoke |
| A21 | Switcher on a page: `P` × page kind × chosen × counterpart (SW01–SW16, A-§4.3) | As A-§4.3. | 0010-S10: `switcherDecision` per SW row; 0010-S13: `choose` returns `navigate` or `stay` per row, the line per row at once, `wxl-locale` = chosen afterwards. | unit; smoke; stage 8 |
| A22 | Switcher menu (D34) | Title = page locale; options = list order minus page locale, plus the page locale while the line shows; labels from the code-keyed table. | 0010-S14, both `P`, `localeIndex` `'root'` and the translation code: `[data-locale-current]` text and the trigger `aria-label` name the page locale's label; the option list is exactly `[T]` on a primary-locale page and `[P]` on a translation page, gaining the page locale while the line shows; a test iterates `LOCALES` and fails for a member whose label key is absent from the code-keyed table or from any string table, which stage 6 verifies once by temporarily adding a third code (not committed), as A31 (V-11). | unit; stage 6 |
| A23 | Switcher on the not-found page or a failed load (0008 B7) | Navigates to the generalised lookup's counterpart (D27, D28) whatever is chosen; else writes and stays; never a line. | 0010-S10: `switcherDecision` with a not-found arrival returns the A14–A16 target or `stay`; 0010-S13: `wxl-locale` = chosen, no line. | unit |
| A24 | Storage refusing a switcher write (0008 B6, 0008 D14) | Nothing throws; the choice is kept for the tab and read as the stored value by later arrivals. | 0010-S13: the existing 0008 B6/W6 case passes with `P` set to each value; its comment no longer refers to a default visiting locale. | unit |
| A25 | Every writer of `wxl-locale` | Written only by a switcher choice (the chosen locale) and by a cold load of a published translation page (`T`). A primary-locale cold load, a not-found arrival or redirect, a failed load, a cold-load redirect, a link, Back and Forward write nothing. | 0010-S10 `shouldPersistOnColdLoad` table under both `P`; 0010-S13: `wxl-locale` after each of those arrivals, under both `P`. | unit |
| A26 | `detectLocaleFromPath(path, P)` | `T` when the first segment is `T`'s code, terminated by `/` or the end; `P` otherwise. | 0010-S10 table, both `P`: `/` → P; `/guide/` → P; `/<T>` → T; `/<T>/` → T; `/<T>/x` → T; `/<T>foo` → P; `/<P>/x` → P; lowercase `/zh-tw/x` → P. | unit |
| A27 | `localizePath(path, locale, P)` | Removes a leading `T` segment, then adds `/<locale>` unless `locale` is `P`; `/<T>` alone maps to `/`; never strips `P`'s code (D28 is the lookup's, not this function's); idempotent for inputs starting with `/`; takes base-less input. | 0010-S10 table, both `P`: `P=zh-TW`: (`/challenges`, `en`) → `/en/challenges`; (`/en/challenges`, `zh-TW`) → `/challenges`; (`/en`, `zh-TW`) → `/`; (`/`, `en`) → `/en/`; applying twice equals once; the existing `withBase` ordering case passes for both `P`. `P=en`: today's cases. | unit |
| A28 | `pageLocaleOf(localeIndex, P)` and its four users (D32) | `'root'` → P; T's code → T; anything else → P. `MergedNav`, `ChallengeList`, `HomeContent`, `LocaleSwitcher` derive the page locale only through it. | 0010-S11 table, both `P`. 0010-S16/0010-S14, both `P`: with `localeIndex = 'root'` and `P = zh-TW`, `MergedNav`'s challenge-list link is `/challenges` and its labels are zh-TW; `ChallengeList` gives `/zh-TW/c/NNN`; `HomeContent` marks an `en`-borrowed card `只有英文`; `LocaleSwitcher`'s title is the zh-TW label — in the SSR output and after mount; with `localeIndex = 'en'` the English counterparts (`/en/challenges`, `/en/c/NNN`, `Traditional Chinese only`, the English label). PAT2 prints nothing, and each of `MergedNav.vue`, `ChallengeList.vue`, `HomeContent.vue` and `LocaleSwitcher.vue` imports `pageLocaleOf`. | unit |
| A29 | Interface (vue-i18n runtime) locale on the client | Set from the URL by `detectLocaleFromPath(location.pathname, P)` at bootstrap and on every route change; the stored value never overrides it. SSR keeps the `createI18n` default (`en`), unchanged in this epic. | 0010-S13: `theme-locale-wiring.test.ts`'s "sets the runtime locale from the URL alone" and route-watcher cases under both `P` (e.g. `P=zh-TW`: `/guide/` → `zh-TW`, `/en/guide/` → `en`). | unit |
| A30 | The line's text and link, both `P` (D33) | Canonical sentence and link text per requested locale, unchanged; `lang` the literal code; link `withBase(localizePath('/challenges', requested, P))`. | 0010-S15: requested `zh-TW` → `這一頁沒有繁體中文版本，所以顯示英文版。` / `前往繁體中文題目清單`, href `/zh-TW/challenges` (P=en) or `/challenges` (P=zh-TW); requested `en` → `This page has no English version, so it is shown in Traditional Chinese.` / `Go to the English challenge list`, href `/challenges` (P=en) or `/en/challenges` (P=zh-TW); with base `/repo/` the base is in front. Exact equality. | unit; smoke |
| A31 | Two-locale guard (D33) | A test fails when the locale list's length is not 2, with message GD1 (Y-§2.5), which names the ja epic as the place the line and the mark get parameterised (V-24); the message reads alike for a shorter and a longer list (RV2-22). | 0010-S10/messages-shape: the case exists, passes at two, and fails (verified once at stage 6 by temporarily adding a third code, not committed). | unit |
| A32 | The mark, both `P` | Unchanged strings (0008 E rows): a `zh-TW` list or home card marks an entry borrowed from `en` `只有英文`; an `en` one marks an entry borrowed from `zh-TW` `Traditional Chinese only`. Which list is at the root does not change the strings. | 0010-S16: `ChallengeList` and `HomeContent` under both `P` with `localeIndex` `'root'` and the translation code. | unit |
| A33 | Session gate `cleared` reload (D35) | Full load of `withBase('/')`; the held cold-load redirect of the cleared page is not run; the root's own cold load follows DT rows for the primary-locale home with the stored value that survived the clear. | 0010-S13: "does not redirect when the learner chooses to clear" passes under both `P`; a cold load of `/` with stored `T` and `/<T>/` listed redirects there (A3), with no preference stays (A1). | unit; stage 8 (VA1j) |
| A34 | Troubleshooting, both languages: `missing-translation` entry's "Why" and "Which language the site remembers" paragraphs | States, true under either `P`: with nothing remembered, a page is shown in the language of its address and no line appears (the "it then assumes Traditional Chinese" clause goes); the remembered language changes only by a switcher choice and by opening directly (typing, pasting, a short link, reloading) a page whose address starts with a language code (`/en/` or `/zh-TW/`), which sets that language; an address without a language code sets nothing, and that includes a short link or an old address that opens the page without one; following links, Back, Forward and the site's own redirects change nothing. | Stage 6 reading against 0010-S10's rules: each statement listed in the expected column is present in both languages; no sentence names a fixed root language, contains 「預設」 or "assumes" for a learner with nothing remembered, or says that a link inside the site sets the language (V-7). | stage 6 |
| A35 | README (both languages), the short-link passage's preference sentences | "learners with a Traditional Chinese preference, or none, are taken to the Traditional Chinese translation" and "opening a `/zh-TW/` page … sets … Traditional Chinese" are rewritten to the A34 rules (no preference → stays; a locale-coded page sets its locale; the primary-coded short link opens the root page and sets nothing, D30). | Stage 6 reading, as A34. (The rest of the passage is the short-link area's.) | stage 6 |
| A36 | Code comments that state locale rules | Each states this area's rule, not 0008's two-locale-with-English-root rule: the list in "Overridden contracts › Area A", row "Comments (A36)". | Stage 6: every comment named in that row is changed or confirmed true; none says "English is the root", "`'root'` for English", "the default visiting locale" or "stores `zh-TW` for a `/zh-TW/` page"; the phrase "the other locale" appears only in comments that cite D33 (the two-locale line and mark), which `git grep -n "the other locale" -- .vitepress` lists for stage 6 (V-7). | stage 6 |
| A37 | `GLOSSARY.md` 主語系 entry's last `_Avoid_`【易混】 line (upstream sends no-preference learners to zh-TW while the primary is English) | Becomes false with D25; rewritten or removed in the same change (docs area owns the wording). | Stage 6: the line no longer claims a redirect for learners with no preference, and does not say they see the primary locale: they see the locale of the address they opened (B90, K-2). | stage 6 |
| A39 | Primary-code path, `/X` not listed, `/<T>/X` listed (D28's fall-through), every stored value, both `P` and both bases (e.g. `P = zh-TW`: `/zh-TW/en-only-article` with only `/en/en-only-article` published) | `replace` with `/<T>/X`'s entry; requested `P`; the line in `P` on the landing; nothing written; no cold-load redirect afterwards; the same landing as Cloudflare's splat-then-not-found path | 0010-S10: `notFoundRedirect` returns `{ entry: '/<T>/X…', requested: P }`; `/<P>/<T>/x` (stripped path a translation path) still returns `null` (A17); 0010-S13: one `go` with `replace`, landing line `lang = P`, `wxl-locale` unchanged | unit; stage 8 (VA2h) |

### Area L — lists, home page, smoke fixtures

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion (seam) | Level |
|---|---|---|---|---|
| **Merge** | | | | |
| L1 | M-a, list `P`, `P` ∈ {en, zh-TW} | Entry from B(P), `locale P`, URL `/challenge/<s>/`, not borrowed. | 0010-S17 returns, for `lists[P]`, an entry `toEqual` the fixture's expected object for both values of `P`. | unit |
| L2 | M-a, list `T` | Entry from B(T), `locale T`, URL `/<T>/challenge/<s>/`; declaration fields equal to `lists[P]`'s. | 0010-S17: `lists[T]` entry `toEqual` expected; its `number`, `difficulty`, `category`, `date`, `tags`, `id` equal the `lists[P]` entry's. Both `P`. | unit |
| L3 | M-b, list `T` | Borrowed: title and description of B(P), `locale P`, URL `/challenge/<s>/`. | 0010-S17: `lists[T]` entry has `locale === P`, `url === '/challenge/<s>/'`, the primary brief's title and description. Both `P`. | unit |
| L4 | M-c (orphan), lists `P` and `T`, with and without a declaration | Absent from every list, including the orphan's own locale's. | 0010-S17: no entry with slug `<s>` in any list, both `P`, and in the three-locale fixture; the other challenges' `id`s are unchanged by adding the orphan. | unit |
| L5 | M-d (declaration only) | Absent from every list. | 0010-S17: no entry for the slug in any list. | unit |
| L6 | M-e (listed slug, declaration `absent`, `invalid-yaml`, `multi-document`, `not-a-mapping`) | Loader fails with Y's PL-E13 (absent) or PL-E14 (others) message. | 0010-S18: `loadChallengeLists` on a temporary tree rejects with an error whose message starts with `PL-E13: ` / `PL-E14: ` and equals the text the formatter of `readChallengeDeclaration` (0010-S32) gives for that path and reason. | unit |
| L7 | Three-locale fixture (`['en','zh-TW','ja']`, `P` each of the three) | Every non-primary list borrows from the primary brief only; every list has the same slugs, order, ids. | 0010-S17: for each `P`, each list's slug sequence and `id`s are equal; every entry of a non-primary list whose locale folder lacks the slug has `locale === P`. | unit |
| L8 | Key sets | `lists` has exactly one key per member of `locales`, also when a locale folder has no `challenge/` directory or does not exist. | 0010-S17 and 0010-S18: `Object.keys(lists)` equals `locales` (order kept); a locale with no briefs gets every listed challenge as borrowed entries (or `[]` when it is `P` and has none). | unit |
| L9 | Order and `id` (D41), files given in reverse, shuffled and sorted order | Slug order; `id` = position; same in every list; independent of input order and of `P`. | 0010-S17: for three input orders and both `P`, `lists[L].map(e => [slugOf(e.url), e.id])` equals the slug-sorted sequence for every `L`. | unit |
| L10 | Slug comparison | Exact, case-sensitive; `Door` (T only) and `door` (P only) are two slugs, the first an orphan. | 0010-S17: `door` listed; no entry for `Door`. | unit |
| L11 | Field `title`/`description` × string / non-string / absent (L-§4.2) | As L-§4.2, per list locale. | 0010-S17: one fixture per cell; entry values equal L-§4.2's, default texts equal the list locale's table values `challenge_list.default_title` / `''`. | unit |
| L12 | `number` × number / `'7'` / `'seven'` / absent | L-§4.2; never derived from position. | 0010-S17: `number` as L-§4.2; for every cell `number !== id` unless declared so. | unit |
| L13 | `difficulty` × `'easy'` / `'insane'` / `3` / absent | L-§4.2 (any string kept). | 0010-S17 values `'easy'`, `'insane'`, `'mystery'`, `'mystery'`. | unit |
| L14 | `category` × `'web'` / `1` / absent, list `en` and `zh-TW` | L-§4.2; default per list locale. | 0010-S17: `'web'` in every list; `General` in `lists.en`, `綜合` in `lists['zh-TW']` for the other two cells (values read from the tables). | unit |
| L15 | `date` × ISO string / `'2026-04-02'` / `'not a date'` / `Date` / `2026` / absent | L-§4.2. | 0010-S17: as written, as written, `null`, `toISOString()` value, `null`, `null`. | unit |
| L16 | `tags` × `['a', 3, null, 'b']` / `'a'` / absent | L-§4.2. | 0010-S17: `['a','b']`, `[]`, `[]`. | unit |
| L17 | Ignored keys: brief carrying `number: 99`, `difficulty: hard`; declaration carrying `title`, `description`, `id: 42` | Lists ignore them (D37). | 0010-S17: the entry's `number`, `difficulty`, `title`, `description`, `id` come from L-§4.2's sources only. | unit |
| L18 | Defaults source (D42) | `DEFAULTS` gone; defaults from string tables. | PAT3 prints nothing; `messages-shape.test.ts` passes with both new keys in both tables. | unit |
| **Loader** | | | | |
| L19 | `watch` globs (L-§4.3) | Derived from `LOCALES`; covers `challenge.yaml`. | 0010-S18: the exported `watch` equals L-§4.3's list built from `LOCALES`. | unit |
| L20 | Brief frontmatter parse; declaration parse | One parser (D79); a brief's `date`-like value never matters (D37). | 0010-S18 on a temporary tree whose declaration has `date: 2026-04-02T08:54:17.674Z` gives `date` `'2026-04-02T08:54:17.674Z'` (string, core schema). | unit |
| L21 | Dev server: editing a declaration or a brief | The list follows on reload without restarting `pnpm docs:dev` (the file is in `watch`). | Stage 8 VL7. | stage 8 |
| L22 | Site base `/` and `/repo/` | Entry URLs base-less; components add the base with `withBase` once. | 0010-S19 with `withBase` prefixing `/repo`: every row and card `href` is `/repo` + entry URL; 0010-S17 URLs never start with the base. | unit |
| **Rendering** | | | | |
| L23 | Page locale × (`P`, `localeIndex`) ∈ {(zh-TW,'root'), (zh-TW,'en'), (en,'root'), (en,'zh-TW')}, runtime locale the other | The component renders `lists[pageLocale]` (`pageLocaleOf` (0010-S11)) and every CS3–CS10 and CH1 string (L-§4.4) in the page locale. | 0010-S19 SSR and mount, each of the 4 combinations: rendered titles are exactly `lists[pageLocale]`'s, in order; for every CS3–CS10 and CH1 key the text or attribute equals the page locale's table value and does not contain the other table's value. | unit |
| L24 | CS1, CS2 × frontmatter `title` and `subtitle` (D44; not `description`), each a string / `''` / absent / non-string | Element shows the value; otherwise not rendered. | 0010-S19 SSR, each key alone (the other a string): for `title` the `h1` text equals the string, and there is no `h1` for the other three cells; for `subtitle` the `header p` text equals the string, and there is no `header p` for the other three cells; a `description` key on the page never renders in `header p` (C-1). | unit |
| L25 | CS10 empty state | Page-locale string in static HTML (empty input) and after filtering to zero. | 0010-S19 SSR with every list `[]`: text equals the page locale's `empty_state`; mount: after setting a query that matches nothing and advancing the 300 ms debounce, the same text. | unit |
| L26 | CS11/CH3 date × time zone (`process.env.TZ` = `UTC`, `Asia/Taipei`, `America/Los_Angeles`) × date `2026-08-17T16:21:14.557Z`, `2026-04-02` | Same text in every zone: the UTC calendar day in the page locale's tag. | 0010-S19 SSR and mount under each zone: the date text equals `new Intl.DateTimeFormat(tag, { year:'numeric', month:'short', day:'numeric', timeZone:'UTC' }).format(new Date(d))` computed in the test, `tag` = `en-US` or `zh-TW`; the three zones give one value. | unit |
| L27 | Borrowed entry rendering, list `T` (both `P`) | Mark in the list locale (D33's two-locale strings), `lang = P` on title and description, list and grid view and home latest cards; static HTML already carries them. | 0010-S19 SSR: `[data-locale-mark]` text equals `messages[T].missing_translation.mark`; `lang` attribute equals `P` on the borrowed title and summary; absent on non-borrowed rows. | unit |
| L28 | List `P` | No borrowed entry exists, so no mark and no `lang` attribute on any row. | 0010-S19 with 0010-S17 output for an upstream-shaped fixture: no `[data-locale-mark]`, no `[lang]` inside rows. | unit |
| L30 | Home counts and latest (0008 E7) | Counts over `lists[pageLocale]`; equal in every locale; latest 3 by date among entries with a non-null date. | 0010-S19: `[data-stat]` values equal for both page locales on one `lists` value; latest cards are the three newest dated entries, borrowed included. | unit |
| L31 | Search, filters, sort, solved badge on borrowed entries (0008 E8, 0008 E9) | Unchanged behaviour; progress keyed by slug from the entry URL (`/challenge/<s>/` and `/<T>/challenge/<s>/` give `<s>`). | 0010-S19: existing cases rerun with the new URL shapes; `slugOf` gives `<s>` for both shapes, with and without trailing slash. | unit |
| L32 | Prop boundary: `lists` missing, or lacking the page locale's key | Renders an empty list (count 0, empty state), throws nothing; only a missing prop warns (L45). | 0010-S19 mount with `{}` and with no prop: no throw; count text `0 <count_suffix>`; with `{}` no `console.warn`. | unit |
| L33 | Built zh-TW and en lists and homes, static HTML and hydrated (T-0060 end-to-end) | L-§4.4 values for the list locale in both states. | 0010-S8 `list-strings.spec.ts`, upstream test build: for `/challenges` (zh-TW, stored `zh-TW`) and `/en/challenges` (stored `en`), CS1–CS9 equal the list locale's values with JavaScript disabled and after hydration; the date text of one row is identical in both states; same for CH1 on `/` and `/en/`. Paths built by D54's helper. | smoke |
| **Smoke fixture pages** | | | | |
| L34 | Flag value (L-§4.5 list) | Only `'1'` publishes the fixtures. | 0010-S20: `loadConfig` with each value: `srcExclude` contains `<code>/smoke-fixtures/**` for every code in `LOCALES` exactly when the value is not `'1'`; `__WXL_PAGES__` contains the two fixture entries exactly when it is `'1'`. | unit |
| L35 | Page list and VitePress agree | `pageListFromDir` and `srcExclude` use `isSmokeFixturePage`. | 0010-S20: for a fixture tree, the page list with the flag off lacks both fixture entries, with it on contains them; `isSmokeFixturePage` is true for `<code>/smoke-fixtures/x.md` for each listed code and false for `smoke-fixtures/x.md`, `challenge/smoke-fixtures/x.md`, `xx/smoke-fixtures/x.md`. | unit |
| L36 | Production build output | No trace of the fixtures. | 0010-S21: the `build` job's new step runs PAT4 and passes on `main`; it fails on a build made with `WXL_SMOKE_PAGES=1` (checked once at stage 8, VL6). | CI; stage 8 |
| L37 | Test build output | Both fixtures published at L-§4.5's URLs. | 0010-S8 `beforeAll`: both URLs answer 200 and show their h1; otherwise every test fails with the message naming `WXL_SMOKE_PAGES=1`. | smoke |
| L38 | Subjects of `missing-translation.spec.ts` (R29, F14) | Each case that used `REFERENCE` runs on the fixture that gives its direction (table L-§4.7); expectations are area A's rows. | 0010-S8: every case in L-§4.7 exists and passes on the upstream test build; `git grep -n "attack-log-export-format" -- tests/site-smoke` prints nothing. | smoke |
| L39 | Page-list oracle on the test build | The oracle's source walk includes the fixtures when the build had the flag. | 0010-S8 "the page list spelling matches the pages VitePress published" passes on the test build (URL mapping is B's). | smoke |
| **Reference page and completeness** | | | | |
| L40 | `zh-TW/reference/attack-log-export-format.md` (D51) | Exists; structure identical to English. | 0010-S23: the two files have the same number of headings per level, the same table row count per table, byte-identical fenced blocks and the same multiset of inline code spans; stage 6 records the user's review of the prose. Upstream-only (D124). | unit; stage 6 |
| L41 | Notes link (D16) | Same-folder link; resolves to the zh-TW reference page under either `P`. | Source contains `](../reference/attack-log-export-format.md)` in `zh-TW/guide/notes.md`; 0010-S8: on the test build the link's `href` on the zh-TW notes page equals the zh-TW reference page's URL. Upstream-only (D124). | unit; smoke |
| L42 | Upstream completeness (D52) | Upstream: every non-fixture page exists in every listed locale. In a range: test skipped. | 0010-S23 passes on upstream; with `isUpstreamDecision` false it reports skipped; on a fixture page list missing one translation it fails naming the page and locale. | unit |
| **Exploit specs** | | | | |
| L43 | `BASE_URL` of the four specs, the template, the blind default (D53) | Unchanged string; opens the primary brief; no redirect; specs pass. | 0010-S22: `pnpm test:challenges` passes on the ticket branch; for each spec, after `page.goto(BASE_URL)` the URL path is still `/challenge/<slug>/` and the page's `<html lang>` is the primary locale's (`zh-TW` upstream) — asserted once at stage 8 (VL8), not added to the specs. | CI; stage 8 |
| **Documents (stage 6)** | | | | |
| L44 | The H rows LH1–LH5 ("Overridden contracts › Area L") | Each passage says what this area gives it. | Stage 6 confirms each H row on the diff, in both languages where the document has two. | stage 6 |
| L45 | `ChallengeList` and `HomeContent` × the old prop (`:challenges="data"`, no `lists`) | Empty list as L32; one LW1 warning per component instance naming the page (D131) | 0010-S19, SSR and mount, with `relativePath` mocked to `challenges.md`: `console.warn` called exactly once per component instance with LW1's text (one server render; one mount followed by a forced re-render, still one call, D131); no throw. | unit |
| L46 | List page × `<meta name="description">` | The site-level description, not the subtitle (D44, D8) | Built upstream (smoke): `dist/challenges.html` and `dist/en/challenges.html` carry the site's `description` in `<meta name="description">` and the subtitle only in `header p`. | smoke |
| L47 | Where `isSmokeFixturePage` and `smoke-fixtures` literals live (D49) | Node-only modules | A unit test resolves the static import graph of `.vitepress/theme/index.ts` (the client entry) and finds neither the module exporting `isSmokeFixturePage` nor any file containing `smoke-fixtures`; L36 then holds on a real production build. | unit |

### Area S — short links, numbers, the hook

Test levels: **unit** = vitest (including `pre-commit-sh.test.ts`, which runs the real hook through
real git); **smoke** = Playwright against a built site; **stage 8** = the S7' surfaces.

#### Numbered rule targets (0010-S24; D58, D48)

Each row's AC is judged with `generateRedirects` on a temporary tree holding `range.json` as stated,
the declaration files and briefs as stated, comparing the challenge's numbered rules `{from, to,
status}` in order with the literal list.

| Row | P × primary brief × translation brief | Expected (`/c/`, `/en/c/`, `/zh/c/`, `/zh-TW/c/` → target) | AC | Level |
|---|---|---|---|---|
| S1 | en × included × zh-TW included | `/challenge/s/`, `/challenge/s/`, `/zh-TW/challenge/s/`, `/zh-TW/challenge/s/` | Equals the S-§4.2 door-is-open list. | unit |
| S2 | en × included × zh-TW missing | all four `/challenge/s/` | Equals the S-§4.2 v05 list. | unit |
| S3 | en × included × zh-TW on disk, not included (`includeSlug` excludes `zh-TW`) | all four `/challenge/s/` (0008 G3) | Equals S2's list; the rule count is unchanged from S1 (re-pointed, not removed). | unit |
| S4 | zh-TW × included × en included | `/challenge/s/`, `/en/challenge/s/`, `/challenge/s/`, `/challenge/s/` | Equals the S-§4.1 door-is-open list. | unit |
| S5 | zh-TW × included × en missing | all four `/challenge/s/` | Equals the S-§4.1 v05 list. | unit |
| S6 | zh-TW × included × en on disk, not included | all four `/challenge/s/` | Equals S5's list; count unchanged from S4. | unit |
| S7 | en × not included × zh-TW included (orphan) | all four `/zh-TW/challenge/s/` | Equals S-§4.3 (en); `/en/c/NNN` and `/c/NNN` exist (0008 G9 inverted). | unit |
| S8 | zh-TW × not included × en included (orphan) | all four `/en/challenge/s/` | Equals S-§4.3 (zh-TW). | unit |
| S9 | either × not included × not included, declaration included | no numbered rule | The file holds no rule ending `/c/<padded>`; generation succeeds. | unit |
| S10 | `range.json` absent; and `range.json` `{"upstream":{…}}` without `primaryLocale` | as `P = zh-TW` (S4–S6) | The generated file is byte-identical to the one generated with `{"primaryLocale":"zh-TW"}`. | unit |
| S11 | `range.json` with each R19 reason | no file | `generateRedirects` throws; the message's first line is the PL-E01–PL-E06 line for that reason (D3, D114); `writeRedirects` leaves no file and an existing file unchanged. | unit |

#### Order, padding, numbers (0010-S24, 0010-S27; D57, D62)

| Row | Type × field × boundary | Expected | AC | Level |
|---|---|---|---|---|
| S12 | Order, both P | By number; within a number `/c/`, `/en/c/`, `/zh/c/`, `/zh-TW/c/` | For challenges numbered 10 (`aaa`) and 2 (`zzz`), the numbered rules are 002's four then 010's four, in form order, on `P = en` and on `P = zh-TW`. | unit |
| S13 | Determinism, both P | Same bytes whatever order directories were created in | Two trees with the same content created in different orders give identical strings. | unit |
| S14 | Padding, both P | Padded to 3; ≥ 4 digits kept | Numbers 7 and 1234 give `<form>007` and `<form>1234` in all four forms; no `<form>7` or `<form>1`. | unit |
| S15 | Declaration: no `number`; malformed YAML; `number: "007"`; `number: 0`; `number: 1.5` | Refused, naming the file | `generateRedirects` throws; the message names the slug and `platform/challenge/<slug>/challenge.yaml`; no file written. | unit |
| S16 | Two declarations, same number | Refused, naming both | Throws; message contains both slugs (`number-unique`). | unit |
| S17 | A brief carrying `number: 9` beside a declaration with `number: 4` | Number 4 used; no refusal here | Rules use `004`; `checkChallengeNumbers` returns no failed result; no result has label `number-locales`. | unit |
| S18 | A brief included, its declaration not included / absent (full mode) | Refused (D64 b) | Throws; message names `platform/<L>/challenge/<slug>/index.md` and the missing `platform/challenge/<slug>/challenge.yaml`. | unit |
| S19 | `collectChallengeNumbers` | One entry per declaration file; old-layout `platform/challenge/<slug>/index.md` and briefs are not entries | For a tree with 2 declarations, 3 briefs and 1 old-layout page, it returns exactly 2 entries whose `path` is the declaration file. | unit |
| S20 | `nextChallengeNumber`: empty; live 1 and 5; retired yaml 9; retired legacy `index.md` 12; a folder holding both (yaml 3, legacy 14); a brief's number 50 | 1; 6; 10; 13; 15; not counted | Each value as listed, in its own temporary tree. | unit |
| S21 | Locale folder not in the list (`platform/fr/challenge/x/index.md`) | Ignored by the generator and the brief check | Output equals the output without that folder (R6's build check refuses it elsewhere). | unit |
| S75 | `number` × bound (S-§4.6): `1`, `999`, `1000`, `Number.MAX_SAFE_INTEGER` / `0`, `-1`, `1.5`, `"1"`, `1e21`, `2**53` | Accepted, padded as D62 / refused as a number fault | 0010-S27: `isChallengeNumber` true / false for each; the generator's rule for `Number.MAX_SAFE_INTEGER` is `/c/9007199254740991` and matches S30's regex; `1e21` gives the number fault naming the file, never a rule spelled `1e+21`. | unit |

#### Slug and old-address rules, header (0010-S24; D59, D60, D61)

| Row | Type × field × boundary | Expected | AC | Level |
|---|---|---|---|---|
| S22 | Slug rules, `P = en` | `/c/:slug`, `/en/c/:slug` → `/challenge/:slug/`; `/zh/c/:slug`, `/zh-TW/c/:slug` → `/zh-TW/challenge/:slug/` | The four rules after the last numbered rule equal this list (as today). | unit |
| S23 | Slug rules, `P = zh-TW` | `/c/:slug` → `/challenge/:slug/`; `/en/c/:slug` → `/en/challenge/:slug/`; `/zh/c/:slug`, `/zh-TW/c/:slug` → `/challenge/:slug/` | Equals S-§4.1's slug section. | unit |
| S24 | Old-address rule | Last rule iff `P = zh-TW` | `P = zh-TW`: the last rule is `{from: '/zh-TW/*', to: '/:splat', status: 302}` and appears once. `P = en`: no rule contains `*`. | unit |
| S25 | Static before dynamic | Every numbered rule precedes every slug and old-address rule | Index of the last numbered rule < index of the first rule containing `:` or `*`, both P. | unit |
| S26 | Header capacity | K1 + K2 (`P = en`) or K1 + K3 (`P = zh-TW`), with F = 4, N = 500 | The joined header contains K1 and the P-specific sentence verbatim; it matches `/500 numbered challenges/` and `/2,000 static/` and not `/2100/`. A test with a form list of length 5 (injected) states `400`. | unit |
| S27 | Section comments | K4 (both), K5 (`P = zh-TW` only) | Joined section text contains K4 with `{P-name}` filled; K5 present iff `P = zh-TW`, directly above the old-address rule. | unit |

#### The committed file and the tree checks (0010-S24, 0010-S25; D64, D67)

| Row | Type × field × boundary | Expected | AC | Level |
|---|---|---|---|---|
| S28 | Committed `_redirects` | Byte-identical to generation over git's index, with the index's `range.json` | `readFileSync('platform/public/_redirects')` equals `generateRedirects(REPO_ROOT, { includeSlug: (slug, tree) => indexSlugs(REPO_ROOT).get(tree)?.has(slug) ?? false })` with `P` from `git show :range.json` (absent → zh-TW). On upstream this is the S-§4.1 file. | unit |
| S29 | Committed rules per challenge | Every challenge in the index's declaration tree has its four numbered rules per D58 | For each such slug, the rules ending `/c/<padded>` equal the D58 list computed from the index trees and `P`; the numbered-rule count is `4 ×` (slugs with an included brief). | unit |
| S30 | Rule shapes | Every rule is numbered (PAT5), a slug rule (one of S22/S23), or the old-address rule | No other shape; the slug rules equal the P-specific list; placeholder pairing passes, with `*` in the source paired with `:splat` in the target. | unit |
| S31 | Shadowing | No rule is matched by every request a later rule could serve | The shadow check treats `/zh-TW/*` as shadowing any later rule whose source starts with `/zh-TW/`; no pair is reported on the committed file or on either generated schema. | unit |
| S32 | Target resolution, through the page-path mapping | A slug rule targeting the primary (`/challenge/:slug/`) needs `platform/<P>/challenge/` to exist and hold at least one slug directory with `index.md`, and a directory without `index.md` is no slug and is ignored (D127); one targeting `/<L>/challenge/:slug/` (`L ≠ P`) may have a missing or empty `platform/<L>/challenge/`; every literal target maps to an existing brief; the old-address rule is not a directory target | `targetDirectoryFaults` (rewritten on the mapping) returns `[]` on the repository; `targetDir`'s URL = `platform/<prefix>` assumption is gone. | unit |
| S33 | Brief faults on the repository | None | `briefFaults(indexSlugs(REPO_ROOT), P)` equals `[]`. | unit |
| S34 | Other ranges × P, through `targetDirectoryFaults` | `P = en`: no `platform/zh-TW/challenge/` → accepted; empty → accepted; no `platform/en/challenge/` → 2 faults (`/c/:slug`, `/en/c/:slug`). `P = zh-TW`: no / empty `platform/en/challenge/` → accepted; no `platform/zh-TW/challenge/` → 3 faults (`/c/:slug`, `/zh/c/:slug`, `/zh-TW/c/:slug`) | Fault counts and each fault's source as listed. | unit |
| S35 | `briefFaults` kinds × P | (i) translation brief, no primary brief → `missing-primary`; (ii) declaration only → `missing-primary`; (iii) brief, no declaration → `missing-declaration`; (iv) translation brief only, no declaration → both; (v) old-layout `platform/challenge/s/index.md` or `platform/challenge/s.md` in the index → `old-layout`; (vi) primary brief + declaration, any translations → none | Each case, on `P = en` and `P = zh-TW` (primary brief path follows `P`), returns exactly the listed kinds with `present`/`missing` paths as S-§4.7 defines them: (i) 1 fault; (ii) 1; (iii) 1 per brief; (iv) 2 (one of each kind); (v) 1 per path; (vi) 0; plus S-§4.7's example verbatim. | unit |

#### The hook (0010-S29; D64–D67)

Fixture: rebuilt in the new layout (overridden contracts). Two variants: `en` (`range.json`
`{"primaryLocale":"en"}`, keeping today's literal rule lines) and `zh-TW` (no `range.json`).
Outcomes 0007 O1–O7 as in epic 0007.

| Row | Type × field × boundary | Expected | AC | Level |
|---|---|---|---|---|
| S36 | Trigger (D126) | A staged change under `platform/challenge/`, under `platform/<L>/challenge/` for a listed `L`, `platform/public/_redirects` or `range.json` triggers; any other path → 0007 O1 (S80 for `public/`, `shared/` and unlisted folders) | One case per path kind (including `platform/zh-TW/challenge/door/index.md`, `platform/en/challenge/door/index.md`, `range.json`) ends in 0007 O2 or 0007 O4, never 0007 O1; a change only to `README.md` or `platform/public/other.txt` ends in 0007 O1 (0007 H06 kept). | unit |
| S37 | Validation scope | Staged ACMRD paths under `platform/challenge/` and under `platform/<L>/challenge/` for every listed `L` reach the validator (D126) | With the recording validator, staging `platform/en/challenge/door/index.md` records that path in its argv; staging only a `platform/challenge/door/src/` file records only that path. (What it concludes is the declaration area's; R26's "brief carries `number`" case replaces 0007 H13, S48.) | unit |
| S38 | New challenge, both P | Declaration + primary brief staged → four rules per D58 | 0007 O2; staged `_redirects` equals the oracle; its new rule lines equal the literal D58 list for that P; no 0007 W3. (0007 H01) | unit |
| S39 | Adding / deleting a translation brief, both P | Re-points that locale's rules; never adds or removes a rule | `P = en`: adding `platform/zh-TW/challenge/test-chall/index.md` turns `/zh/c/001`, `/zh-TW/c/001` to `/zh-TW/challenge/test-chall/`; deleting door's zh-TW brief turns them back (0007 H02, 0007 H40). `P = zh-TW`: adding `platform/en/challenge/<slug>/index.md` turns only `/en/c/NNN` to `/en/challenge/<slug>/`; deleting it turns it back. Rule count equal before and after in all four cases. | unit |
| S40 | Untracked or ignored translation brief, both P | Not used (0008 G3) | 0007 O2; that locale's rules at the primary page; an ignored directory is not named by 0007 W4. (0008 G3 case, 0007 H20) | unit |
| S41 | `range.json` staged change `en` → `zh-TW` (`primaryLocale` edited and staged), on the `en` fixture after every challenge has both briefs (test-chall gains a committed zh-TW brief first) | Every rule re-targeted to the S-§4.1 shape | 0007 O2; staged `_redirects` equals the oracle generated with the index's `range.json`; it ends with the old-address rule. | unit |
| S74 | `range.json` staged change `en` → `zh-TW` on the `en` fixture as built (test-chall #001 has no zh-TW brief) | Refused: under the new `P` test-chall has no primary brief | 0007 O4: exit 1; stderr holds W6a naming `platform/en/challenge/test-chall/` and the missing `platform/zh-TW/challenge/test-chall/index.md`, and W6r once; nothing changed (`range.json` and `_redirects` still staged as before the commit). B85 states the consequence. | unit |
| S42 | `range.json` unstaged edit only (working tree says `zh-TW`, index says `en`), with a staged challenge change | Index wins, for the generator (D67) and for validation (D122) | 0007 O2; the staged file is the `P = en` shape; the working tree's `range.json` keeps its bytes. S76 adds the cases where the two sources would judge differently. | unit |
| S43 | `range.json` staged with each R19 reason, and the index-only entries of D114: a staged symbolic link (`git add` of a link, mode 120000); a gitlink at `range.json` (`git update-index --add --cacheinfo 160000,<sha>,range.json`); `git show :range.json` failing (stubbed); no challenge path is staged (S76 (c) is the case with one, D122; SC2-08) | Refused | 0007 O4 with 0007 W5: exit 1, stderr holds the PL-E01–PL-E06 first line for that reason (PL-E01 for both index entries; `PL-E02: range.json could not be read (unknown).` for the failing read), nothing changed (`_redirects` included). | unit |
| S44 | Brief faults the index already holds, both P (D121) | 0007 O4 with W6a–W6d and W6r | For each fault, the fixture first commits it with `--no-verify`, then stages an unrelated change to another challenge's `src/` file and commits: door's declaration folder moved to `.archive/challenge/door/` while both briefs stay (W6c twice, one per brief); only door's primary brief deleted (W6a for door, from its translation); only door's primary brief folder renamed to `gate` (W6a for door, W6c for gate); only door's translation folder renamed to `gate` (W6a and W6c for gate); the primary brief of untranslated test-chall deleted (W6b); an old-layout `platform/challenge/x/index.md` added (W6d): exit 1; each expected W6 line present verbatim; W6r present once; nothing changed; the generator printed nothing to stdout; no 0007 W5 number text. Both fixtures, the primary brief path following P. (0007 H17, H21, H22, H41) | unit |
| S45 | Brief check reads the index only | A part on disk but not in the index backs nothing; ignored directories neither back nor make a fault; a fault HEAD already holds refuses a commit that creates none | K-17, K-17 boundary and 0007 D12-HEAD cases rewritten on the new layout, both P: outcomes as today (0007 O4 / 0007 W6). | unit |
| S46 | Retiring, both P | Move the declaration folder to `.archive/challenge/<slug>/`, delete every brief → its four rules go; un-retiring brings them back | 0007 O2; the slug's rules absent / present as the oracle says; `nextChallengeNumber` on the result never returns the retired number. (0007 H39, 0007 H23) | unit |
| S47 | 0007 W4 wording × P × directory kind | W4a / W4b per S-§4.5 | With 0007 W3 forced (a hand edit of `_redirects`): untracked `platform/challenge/draft/` → W4a; untracked `platform/<P>/challenge/draft/` → W4a; untracked translation brief directory → W4b with the right names on each P (`P = en`: today's sentence; `P = zh-TW`, `L = en`: `…its challenge's English short links open the Traditional Chinese page, if there is one.`). Ignored directories never named. Without 0007 W3, no 0007 W4. | unit |
| S48 | 0007 H13 replaced: a brief carrying `number` | Refused by validation (R26) | Staging a brief whose frontmatter carries `number` ends in 0007 O3 with the validator's status, nothing changed; stderr does not contain `carries different numbers across locale trees`. | unit |
| S49 | Everything else in the hook (stash, restore, signals, commit forms, first commit, bash 3.2, pathspec variables, 0007 B2) | Unchanged | Every other existing case passes on the rebuilt `en` fixture with only its path literals changed per the overridden contracts; 0007 H45 (bash 3.2) also runs S44's first case. | unit |
| S50 | T-0058, if taken: a whole untracked locale folder | 0007 W4 names it | With 0007 W3 forced and nothing under `platform/en/` tracked on a `P = zh-TW` fixture, 0007 W4 names `platform/en/` (or each untracked brief under it) with W4b's effect; a directory name with a control character is printed escaped. Cached-only removal of a translation folder exits 0 (T-0058's ACs). | unit |
| S51 | T-0059, if taken | Slug grammar refusal | A slug outside `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` in the declaration tree or any brief tree, and an all-digit slug equal to another challenge's padded number, stop generation (full and `--staged`) with a message naming it; a slug equal to its own padded number does not (T-0059's ACs, on both P). | unit |
| S73 | Brief faults the commit itself stages, with the real validator, both P (D121) | Refused by validation before the generator runs (0007 O3) | Staging only the deletion of door's primary brief ends with exit 1 and VM10 naming `platform/<P>/challenge/door/index.md`; staging a translation brief of a slug with no `challenge.yaml` ends with VM1; staging `platform/challenge/door/index.md` (old layout) beside door's `challenge.yaml` ends with VM13; in each case nothing changed and stderr holds no W6 line. | unit |
| S76 | `range.json` differs between the index and the working tree, with a staged challenge change (D122): (a) index `{"primaryLocale":"en"}`, working tree `zh-TW` unstaged, a new challenge staged with only its English brief and its declaration; (b) index without `range.json`, working tree `{"primaryLocale":"en"}` untracked or unstaged, the same staged challenge; (c) the index's `range.json` failing with each R19 reason (and D114's index-only entries) while a challenge path is staged | Validation and the generator both use the index's `P` | (a) 0007 O2, no VM10, the staged `_redirects` the `P = en` shape; (b) 0007 O3: exit 1, VM10 naming `platform/zh-TW/challenge/<slug>/index.md`, no W6 line, nothing changed; (c) 0007 O3: exit 1, stderr holds that reason's PL-E01–PL-E06 first line and no 0007 W5, nothing changed. In each case the working tree's `range.json` keeps its bytes. | unit |
| S77 | `range.json` `{"primaryLocale":"en"}` added and staged on the `zh-TW` fixture while a challenge has only its zh-TW brief (C-7) | Refused: under the new `P` that challenge has no primary brief | 0007 O4: exit 1; W6a naming `platform/zh-TW/challenge/<slug>/` and the missing `platform/en/challenge/<slug>/index.md`, W6r once; nothing changed (S74's mirror). | unit |
| S78 | staged deletion of `range.json` (`en` → absent → `zh-TW`) on the `en` fixture: (a) after every challenge has both briefs; (b) while test-chall has no zh-TW brief (C-7) | Re-targeted / refused | (a) 0007 O2; the staged `_redirects` equals the oracle for `P = zh-TW` and ends with the old-address rule; (b) 0007 O4 with W6a naming test-chall and W6r once; nothing changed. | unit |
| S79 | staged `range.json` change of `upstream` only, `primaryLocale` unchanged (present `en`; and absent) (C-7) | Triggers; nothing re-targeted | Exit 0; `git diff --cached -- platform/public/_redirects` is empty (the regenerated file equals `HEAD`'s); the commit holds the `range.json` change. | unit |
| S80 | paths that are not the listed locales' challenge paths (D126): staged changes only under `platform/public/challenge/x/notes.txt`, `platform/shared/challenge/x.ts`, `platform/ja/challenge/s/index.md`, `platform/constructor/challenge/s/index.md`, `platform/__proto__/challenge/s/index.md` (RV2-19); and an untracked `platform/ja/challenge/s/` while 0007 W3 fires for another path | No trigger; never in validation or 0007 W4 | Each staged-only case ends in 0007 O1 (exit 0, no regeneration, the recording validator not called); with 0007 W3 forced by a listed path, stderr holds no W4 line naming `platform/ja/challenge/s/`, and no W4b line holds `undefined` or a function's text. | unit |

#### Copy control (0010-S30, 0010-S26; D48, D68)

| Row | Type × field × boundary | Expected | AC | Level |
|---|---|---|---|---|
| S52 | `challengePagePath` | `('s','en','en')` → `/challenge/s/`; `('s','zh-TW','en')` → `/zh-TW/challenge/s/`; `('s','zh-TW','zh-TW')` → `/challenge/s/`; `('s','en','zh-TW')` → `/en/challenge/s/`; `(':slug', L, P)` keeps `:slug` | Equality for each; the generator's targets (S1–S8, S22–S23) are produced by it (one import, checked by a test that the generator module imports it). | unit |
| S53 | Short mode × list locale × entry, both P | Every numbered entry has a control giving `<origin>/<list locale>/c/NNN`: translated and borrowed (untranslated in that list) entries alike; an orphan translation brief is in no list (D38) | `ChallengeList` rendered (SSR and mounted) for the `en` list and the `zh-TW` list, on `P = en` and `P = zh-TW`, with one translated and one borrowed entry: each shows one control; its copied URL is as stated; `hasCopyControl` is true for all numbered entries. An entry without a number has none (0008 E10). | unit |
| S54 | Page mode × entry, both P | `<origin>` + `challengePagePath(slug, entryLocale, P)` | `P = zh-TW`: a zh-TW entry in the `en` list → `<origin>/challenge/<slug>/`; an en entry → `<origin>/en/challenge/<slug>/`. `P = en`: as 0008 F4–F6. Displayed text = URL without scheme. | unit |
| S55 | Nav control on a challenge page, both P | The page's locale (0008 F7) | On `P = zh-TW`, `/challenge/door-is-open/` gives `/zh-TW/c/001` (short) or `<origin>/challenge/door-is-open/` (page); `/en/challenge/door-is-open/` gives `/en/c/001` or `<origin>/en/challenge/door-is-open/`. | unit |
| S56 | Built site, smoke | The upstream build (`P = zh-TW`) | On the built site, `/challenges` and `/en/challenges` each show one control per numbered challenge in page mode (the smoke build sets no `CF_PAGES`, D50). Short mode is fixed at build time (`__WXL_SHORT_LINKS__`), so its texts are S53's unit cases and V-S5 on the Cloudflare previews. | smoke |

#### End to end (0010-S50; D58–D60, D71)

The first hop is observed with `curl -sI` (terminal surface: status and `Location` only); the final
page with the Browser panel (challenge pages with it open, hard rule 4). Where the learner lands
after the hop is R21's, quoted for the observer, not owned here.

| Row | Type × field × boundary | Expected | AC | Level |
|---|---|---|---|---|
| S57 | zh-TW-primary preview × four forms × {001 translated, fixture 999 zh-TW-only} | `Location` per S-§4.1 | Eight requests; each first hop is 302 with the `Location` path of S-§4.1 (`/en/c/999` → `/challenge/<fixture>/`). | stage 8 |
| S58 | zh-TW-primary preview × slug forms | `/en/c/door-is-open` → `/en/challenge/door-is-open/` (200 on follow); `/en/c/<fixture>` → `/en/challenge/<fixture>/`, 404 page, then the client replaces it with `/challenge/<fixture>/` and shows the line | `curl` shows the first hop; the Browser panel shows the final URL and the line. | stage 8 |
| S59 | Precedence (D60) | The `/zh-TW/c/` rules win over the old-address rule | `curl -sI /zh-TW/c/001` gives `Location: /challenge/door-is-open/` (not `/c/001`); `/zh-TW/c/door-is-open` gives `/challenge/door-is-open/` (not `/c/door-is-open`). If either shows the splat's target, the assumption is recorded as false (one extra hop, the same landing) and the epic keeps going (D60); this is not a failure. S61 alone is the gate that stops a ticket (D118). | stage 8 |
| S60 | Old addresses (R22) | `/zh-TW/`, `/zh-TW/challenges`, `/zh-TW/guide/notes`, `/zh-TW/challenge/door-is-open/` → 302 to `/`, `/challenges`, `/guide/notes`, `/challenge/door-is-open/` | `Location` path as listed. `/zh-TW` (no slash) and a query string (`/zh-TW/challenges?x=1`) are observed and **recorded, not judged** (third-party behaviour, retrospective 0009); so are the double prefixes `/zh-TW/en/guide/notes` and `/zh-TW/zh-TW/guide/notes` (D138: expected 302 `/en/guide/notes`, and 302 `/zh-TW/guide/notes` then `/guide/notes`), and a static file added on F-1 as `platform/public/zh-TW/stage8.txt` (whether `/zh-TW/stage8.txt` is served or redirected, R-13). | stage 8 |
| S61 | Open-redirect safety (D118) | No crafted path yields an off-origin `Location` | For `/zh-TW//evil.example`, `/zh-TW//evil.example/x`, `/zh-TW/%2F%2Fevil.example`, `/zh-TW/%2f%2fevil.example`, `/zh-TW/%2F/evil.example`, `/zh-TW/%252F%252Fevil.example`, `/zh-TW/%5Cevil.example`, `/zh-TW/%5C%5Cevil.example`, `/zh-TW/%5C/evil.example`, `/zh-TW/%09/evil.example`, `/zh-TW/%0A/evil.example`, `/zh-TW/%0D/evil.example`, and the raw `/zh-TW/\evil.example` and `/zh-TW/\/evil.example` (curl `--path-as-is`; R-1), `new URL(location, previewOrigin).origin === previewOrigin` (checked with `node -e`), or there is no redirect. Any off-origin result fails stage 8. | stage 8 |
| S62 | en-primary preview (`range.json` `"en"`) × four forms × {001, en-only fixture 998} | `Location` per S-§4.2; no old-address rule | Eight first hops as S-§4.2; `curl -sI /zh-TW/challenges` is 200 (a page), `/en/challenges` is not a redirect. | stage 8 |
| S63 | Copy control in the Browser panel | S53–S54 on the deployed previews | On the zh-TW-primary preview, `/en/challenges` shows a control for fixture 999 (zh-TW only) reading `wxl.browserlab.online/en/c/999` (`SITE_ORIGIN` without the scheme: copy controls on a preview show the production origin, `.vitepress/challenge/shortLink.ts`); the target is checked by requesting `<preview origin>/en/c/999` on the preview (`curl -sI` for the first hop, `Location: /challenge/<fixture>/`, then the Browser panel), never by following the copied URL, which leaves the preview. On a temporary GitHub Pages range from the same commit, the controls show page-mode URLs per S54. | stage 8 |

#### Documents (stage 6)

| Row | Item | Must state | AC | Level |
|---|---|---|---|---|
| S64 | `generate-redirects.ts` file header, `FORMS`, `PARAMETERISED`, `numericRules`, `GenerateOptions.includeSlug`, `indexSlugs` comments | D57–D61, D64, D67 in the present tense; no "English tree", "root tree" or "Traditional Chinese rules open the English page" left except as the `P = en` instance | Stage 6 diff review (V-7): each listed comment cites the D-number it states; none contains `English tree`, `root tree`, `root-locale`, `English page first` or a fixed `zh-TW`/`en` where the primary locale is meant, except inside a sentence labelled as the `P = en` or `P = zh-TW` instance. | stage 6 |
| S65 | `challenge-numbers.ts` header and comments (`CHALLENGE_TREES` gone, `RETIRED_TREE`, `nextChallengeNumber`) | "written down in frontmatter" → "in `challenge.yaml`"; D63's legacy read | as S64 | stage 6 |
| S66 | `scripts/pre-commit.sh` header points 2–4 and the 0007 D12 block comment | D64–D66; no tree list in bash | as S64 | stage 6 |
| S67 | `shortLink.ts` (`ShortLinkLocale` comment "for a page URL, `/zh-TW` before the page path or nothing for English", `challengeLink`), `ChallengeList`'s `hasCopyControl` comment ("The English list has no short link…") | D48, D68 | as S64 | stage 6 |
| S68 | `redirects.test.ts` header ("HOW TARGETS ARE RESOLVED" says whoever introduces `rewrites` restates it; "CAUGHT" list's "Traditional Chinese page whose root-locale counterpart is missing"; the subset paragraph) | Restated on the page-path mapping and `briefFaults` | as S64 | stage 6 |
| S69 | README.md and README.en.md, short-link passage | Copied links carry the list's locale code on both primaries; every numbered challenge has every locale's link, which opens the primary locale's page when that locale has none; `/c/NNN` is the primary locale's page; D71 per primary (replaces "For now `/en/c/NNN` opens like `/c/NNN`"); on a Traditional-Chinese-primary range old `/zh-TW/…` addresses go to the root (Cloudflare by rule, elsewhere by the not-found page), and on Cloudflare a file under `platform/public/zh-TW/` is redirected by that rule too (S-O7, R-13); after changing `primaryLocale`, commit `range.json` (the hook regenerates `_redirects`) or run `pnpm redirects:generate`; and, stated positively, a short link coded with the primary locale, and `/c/NNN`, follows the learner's stored preference (a learner who chose the translation is taken there when it exists, D30), while a translation-coded short link always opens that translation | Both languages say the same; the zh-TW text follows docs/agents/language.md. | stage 6 |
| S70 | README.md and README.en.md, "Committing challenges" orphan item (`git rm -r platform/zh-TW/challenge/<slug>/`) | A brief without its primary-locale brief or without `challenge.yaml`, and a `challenge.yaml` without a primary-locale brief, are refused; the remedy names `platform/<locale>/challenge/<slug>/` and `.archive/challenge/<slug>/` (D63 retiring) | as S69 | stage 6 |
| S71 | `GLOSSARY.md` short link entry | No sentence contradicts D58, D71 or D30. An addition such as 「每個語系都有帶語系代碼的短連結；那個語系沒有這道題目的頁面時，它開主語系那一頁；題目沒有主語系說明頁時，開它唯一存在的那一頁。」and the uncoded form's line keeps 「導向主語系那一頁」 with the same last clause (D58's third fallback, K-11); no sentence says the Traditional Chinese form opens the English page; the entry states positively that the primary-coded form (and the uncoded one) follows the learner's 語系偏好, while a translation-coded form always opens that translation (D30), so the coded form is not presented as independent of the preference on every range | stage 6 reads the entry against D30, D58, D71. | stage 6 |
| S72 | `docs/agents/challenge-pipeline.md` `_redirects` paragraph; `.claude/skills/wxl-create/SKILL*.md`, `.agents/skills/wxl-create/SKILL*.md`, `wxl-fork-init` SKILL `_redirects` sentences | Still true (generated, regenerated by the hook and `create:challenge`); any brief path updated by the layout area | Stage 6 (V-7): every sentence of these passages about `_redirects` says it is generated and regenerated by the hook and by `create:challenge`; every brief path they name is `platform/<locale>/challenge/<slug>/index.md` or the primary brief; none names `platform/challenge/<slug>/index.md` as the brief. | stage 6 |

### Area Y — the challenge declaration

`{type × field × boundary} → expected behaviour → acceptance criterion (pass/fail at a named seam) → level`.
"Fixture tree" = a temporary directory holding `platform/challenge/<slug>/{challenge.yaml,src/}`,
`platform/<L>/challenge/<slug>/index.md` and, where stated, `range.json`; `P` is `zh-TW` unless the
row says otherwise. Every validate row is checked for `P = zh-TW` and `P = en` unless it says one.

#### Declaration file (0010-S32, 0010-S34)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| Y1 | each of the four Y-§2.4 files, as committed | parsed to a mapping equal to Y-§2.4; validate passes every check | At 0010-S32, `readChallengeDeclaration(root, slug)` returns `ok: true` and a value deep-equal to Y-§2.4 for each of the four; at 0010-S34, `validateChallenge` on the real tree reports `allPassed: true` for each; upstream-only (D124) | unit |
| Y2 | challenge directory with `src/` and no `challenge.yaml` | validate fails | At 0010-S34, the result holds a failed `declaration` check whose message is VM1 and no other check runs; 0010-S32 returns `reason: 'absent'` | unit |
| Y3 | `challenge.yaml` of 0 bytes, or only comments | not a mapping | 0010-S32 `reason: 'not-a-mapping'`; 0010-S34 `declaration` fails with VM2 | unit |
| Y4 | unparseable YAML (e.g. `backend: [flask`) | parse error | 0010-S32 `reason: 'invalid-yaml'`; 0010-S34 message starts `invalid YAML in challenge.yaml: ` | unit |
| Y5 | two documents (`---` between two mappings) | rejected | 0010-S32 `reason: 'multi-document'`; 0010-S34 message VM4 | unit |
| Y6 | root is a sequence, a string, a number, `null` | not a mapping | 0010-S32 `reason: 'not-a-mapping'` for each; 0010-S34 VM2 | unit |
| Y7 | one document with a leading `---` line | accepted | 0010-S32 `ok: true`, value equal to the same file without the marker | unit |
| Y8 | `date: 2026-04-02T08:54:17.674Z` | a string | 0010-S32 value's `date` is the string `2026-04-02T08:54:17.674Z` (`typeof === 'string'`) | unit |

#### Declaration keys (0010-S31, 0010-S34)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| Y9 | `backend` absent / `null` | required | `validateChallengeDeclaration` throws `missing required field: backend`; 0010-S34 `declaration` fails with it | unit |
| Y10 | `app` absent / `null` | required | throws `missing required field: app` | unit |
| Y11 | `backend: django` | not in the enum | throws today's `backend must be one of flask, fastapi, php, got: django` | unit |
| Y12 | `app: 3`, `app: true`, `app: []` | not a string | throws VM12 with `number`, `boolean`, `object`; 0010-S34 does not crash in the `backend` check | unit |
| Y13 | `number` absent; `0`, `-1`, `1.5`, `"7"` | validate's number check | 0010-S34 `number` fails: absent → ``no `number` in challenge.yaml; assign one greater than every number ever assigned``; others → today's "is not an integer greater than zero" text | unit |
| Y14 | `title`, `description` or `layout` in `challenge.yaml` (each alone; all three) | forbidden | `validateChallengeDeclaration` throws VM5 listing exactly the present brief keys in file order; 0010-S34 `declaration` fails | unit |
| Y15 | `source_visible` as `"true"`, `null` (bare line), `1` | non-boolean | throws today's three messages unchanged (quoting hint, null hint, no hint) | unit |
| Y16 | `source_files` as a string, an array with a number, a non-empty array with `source_visible` false or absent; `[]` with `false` | today's rules | first three throw today's messages; `[]` with `false` passes | unit |
| Y17 | `tools` as a string; containing `terminal`; `[]`; absent | today's rules | string and `terminal` throw; `[]` passes and is preserved; absent passes as `undefined` | unit |
| Y18 | `flag: 5` | non-string | throws `flag must be a string, got: number` | unit |
| Y19 | unknown keys `id: 7`, `commands: []`, `author: x` | passed through | `validateChallengeDeclaration` does not throw; 0010-S33's assembled frontmatter carries each unchanged; no 0010-S34–0010-S41 output mentions them | unit |
| Y20 | `fs: {…}` or any `LEGACY_FIELDS` key | retired | validate passes and prints no `fs` warning; keygen (0010-S36) prints KG1 for each such key and the rewritten `challenge.yaml` no longer has it | unit |
| Y21 | every optional key absent | defaults | `validateChallengeDeclaration` returns `source_visible: false`, `source_files: []`, `packages: []`, `tools: undefined`, `flag: undefined`; keygen reads the flag from `src/flag.txt` | unit |
| Y104 | `number` × bound: `Number.MAX_SAFE_INTEGER`; `1e21`; `2**53` | accepted; refused; refused (Y-§2.2) | `validateChallenge`'s `number` check passes for the first and fails for the other two with the number check's existing message (re-homed, Y-§2.5) | unit |
| Y112 | `challenge.yaml` YAML boundaries (D129): a duplicate key; an alias (`&a` … `*a`) within the limit; an alias expansion over `maxAliasCount` (a billion-laughs document); an alias whose anchor is not set (`x: *nowhere`); `base: &base {x: 1}` followed by `<<: *base`; values `yes` and `on`; a custom tag `!foo bar`; a brief whose frontmatter holds `<<: {x: 1}` beside `title` and `layout`; a brief whose frontmatter holds `title` twice (RV2-11, RV2-21, SC2-10) | as D129 | `readChallengeDeclaration` reports `invalid-yaml` for the duplicate key, the expansion over the limit, the unset anchor and the custom tag; resolves the alias; returns `<<` as an ordinary key holding `{x: 1}`, which `validateChallengeDeclaration` passes through; returns `yes` and `on` as strings; validate fails the `<<` brief with VM6 naming `<<` and the duplicate-key brief with VM15 | unit |

#### Brief frontmatter (0010-S31, 0010-S34)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| Y22 | each upstream brief, both locales (`title`, `layout`, `description`) | passes | 0010-S34 reports `brief (zh-TW)` and `brief (en)` passed for each of the four slugs; upstream-only (D124) | unit |
| Y23 | brief with `title` and `layout` only | passes | `validateChallengeBrief` returns `description: undefined`; 0010-S34 passes | unit |
| Y24 | brief carrying a known declaration key (`backend`; `number`; `tools`; `wasmModule`) — primary, then translation | forbidden | 0010-S34 `brief (<L>)` fails with VM6 naming the path and the keys; the declaration check still runs and reports separately | unit |
| Y25 | brief carrying a key no tool knows (`outline`, `id`, `fs`, `head`) | forbidden (D74 closure) | same as Y24 | unit |
| Y26 | `title` absent, `null`, `''`, `2048` | required non-empty string | 0010-S34 `brief (<L>)` fails with VM7 for each | unit |
| Y27 | `layout` absent, `doc`, `Challenge` | must equal `challenge` | VM8 for each | unit |
| Y28 | `description: 42` / `description: [a]` | must be a string | VM9 | unit |
| Y29 | brief with no frontmatter block; with unparseable frontmatter | invalid | `brief (<L>)` fails with VM14 / VM15 | unit |

#### Which files exist, per slug (0010-S34; D86, Q2)

`D` = `challenge.yaml`, `Pb` = primary brief, `Tb` = a translation brief.

| Row | `D` | `Pb` | `Tb` | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|---|---|
| Y30 | yes | yes | any | passes (other checks permitting) | 0010-S34 `allPassed: true` on a fixture tree with only `D`+`Pb`, and with `D`+`Pb`+`Tb` | unit |
| Y31 | yes | no | no / yes | primary brief missing | 0010-S34 `brief (<P>)` fails with VM10; with `P = en` the path is `platform/en/challenge/<slug>/index.md`, with `P = zh-TW` it is `platform/zh-TW/…` | unit |
| Y32 | no (and no challenge directory) | yes / no | yes / no (at least one brief) | discovered from the brief; declaration missing | `discoverChallenges(root)` returns the slug; 0010-S34 `declaration` fails with VM1 | unit |
| Y33 | — | — | brief in `platform/ja/challenge/<slug>/` while `ja` is not on the list | not this area's | `discoverChallenges` does not return a slug that only an unlisted folder holds (the build's layout check fails on it, D4, D6, R6) | unit |
| Y34 | — | — | — | legacy-layout pages: `platform/challenge/<slug>/index.md`; `platform/challenge/<slug>/notes.md`; flat `platform/challenge/<slug>.md`. Not one: `platform/challenge/<slug>/src/README.md` | the `challenge:validate` command without a slug exits 1 with the PL-E08 first line followed by each legacy file, before any challenge check (D19, D81); with a slug argument (`pnpm challenge:validate door-is-open`) on the same tree it also exits 1 with the PL-E08 first line before any check; with only the `src/` file it passes | unit |
| Y35 | target slug | | | `pnpm challenge:validate <slug>` | finds the slug by challenge directory or brief; an unknown slug prints `Challenge not found: <slug>` and exits 1 (today's text) | unit |
| Y36 | `range.json` unusable (each R19 reason) | | | primary locale unknown | validate prints `readPrimaryLocale`'s PL-E01–PL-E06 first line and exits 1 before any challenge check | unit |
| Y37 | `range.json` absent; present without `primaryLocale`; `{"primaryLocale":"en"}`; `{"primaryLocale":"zh-TW"}` | | | `P` follows `readPrimaryLocale` (0010-S1) | Y31's required path is `zh-TW`, `zh-TW`, `en`, `zh-TW` respectively | unit |
| Y103 | yes | yes | any | challenge directory holding a stray entry: `diagram.png`, `index.md`, `notes/`; not stray: `.DS_Store`, `src/`, `challenge.yaml` (D117) | `validateChallenge` reports a failed `structure` check whose message is VM13 listing exactly the stray entries, sorted; with only the entries that are not stray the check passes | unit |

#### Assembly at build time (0010-S33; D78)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| Y38 | each upstream slug × each listed locale's brief | assembled | `assembleChallengeFrontmatter` returns the brief's keys ∪ every key of that slug's `challenge.yaml` ∪ `markdownBody`; for one slug, the declaration-key projection is deep-equal across locales | unit |
| Y39 | built site, each upstream slug, primary page and `/en/challenge/<slug>/` | same declaration on both | on the built site (`playwright.site.config.ts`), both pages show the same difficulty and category badge text and number, the same set of tool tabs, and a Source tab exactly when `source_visible` is `true`; on each page the response for the page's `wasmModule` URL is 200 and, within 30 s, the Browser panel's address input (`[data-panel="browser"] input`) is enabled, which `ChallengeLayout` allows only once the runtime and the service worker are ready (`toolsDisabled`) | smoke |
| Y40 | brief path, `layout: challenge`, no `challenge.yaml` | build fails | 0010-S33 throws PL-E13; `pnpm docs:build` on that fixture exits non-zero with output containing `PL-E13: platform/<L>/challenge/<slug>/index.md` | unit (0010-S33, and the 0010-S9 command on a temporary copy for the exit); stage 8 V-B1 |
| Y41 | `challenge.yaml` unparseable, multi-document, or not a mapping | build fails | 0010-S33 throws PL-E14 whose reason names the 0010-S32 `reason` | unit |
| Y42 | brief frontmatter with a key outside `BRIEF_KEYS` | build fails | 0010-S33 throws PL-E15 listing the keys | unit |
| Y43 | `challenge.yaml` with a brief key | build fails | 0010-S33 throws PL-E16 listing the keys | unit |
| Y44 | source path `<L>/challenge/<slug>/index.md` without `layout: challenge` | build fails | 0010-S33 throws PL-E17 | unit |
| Y45 | `layout: challenge` at `<L>/guide/x.md`, `<L>/challenge/index.md`, `<L>/challenge/<a>/<b>/index.md`, `<L>/challenge/<slug>.md` | build fails | 0010-S33 throws PL-E18 for each | unit |
| Y46 | primary brief served at `/challenge/<slug>/` (its `relativePath` rewritten), translation at `/en/challenge/<slug>/` | each page gets its own body | 0010-S33, called as `transformPageData` calls it (`filePath`, not `relativePath`), gives the zh-TW page the zh-TW body and the en page the en body; a test with rewrites in place fails if `relativePath` is used | unit |
| Y47 | `challenge.yaml` with an invalid `backend` or a `tools: [terminal]` | build succeeds | 0010-S33 returns the assembled frontmatter unchanged (schema is validate's, D78) | unit |
| Y48 | any page that is neither a brief path nor `layout: challenge` (home, list, guide, reference) | untouched | 0010-S33 returns `null`; `transformPageData` leaves `pageData.frontmatter` deep-equal | unit |
| Y113 | assembly × `challenge.yaml` holding `__proto__: { polluted: 1 }` and `constructor: x` (R-9) | own keys; no prototype change | `assembleChallengeFrontmatter`'s result has `__proto__` and `constructor` as own properties (`Object.hasOwn`), `Object.getPrototypeOf(result) === Object.prototype`, and `({}).polluted` is `undefined` afterwards; the list loader's entry for that challenge satisfies the same | unit |

#### Challenge page at run time (0010-S42)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| Y49 | `relativePath` `challenge/<slug>/index.md` (primary, rewritten) and `<L>/challenge/<slug>/index.md` | slug = parent directory | `ChallengeLayout`'s slug (extracted to a pure helper, e.g. `slugFromRelativePath`) returns `<slug>` for both; the flat `<slug>.md` branch is gone | unit |
| Y50 | a loaded module without `wasm_fs_list` | runtime-error state | `ChallengeLayout` shows its runtime error with text naming `pnpm challenge:keygen`, and reads no `fm.fs` | unit (mounted with a module double) |
| Y51 | each upstream challenge, primary and translation page | identical tool surface | stage 8 V-Y6: the same tabs, difficulty and category badges and number on both; white-box Source tab on both, listing the same files (10 for `selected-excerpts`) | stage 8 |

#### keygen (0010-S36; D80, D81)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| Y52 | challenge directory without `challenge.yaml` | not a challenge | the CLI with no slug does not process it; `pnpm challenge:keygen <slug>` for it prints `Challenge not found: <slug>` and exits 1 | unit (CLI) |
| Y53 | no challenge directory with `challenge.yaml` | nothing to do | exits 1 with today's `No challenge files found` | unit (CLI) |
| Y54 | a rebuild of a challenge | write-back target | afterwards `challenge.yaml` has `wasmModule: /challenge/<slug>/runtime.wasm`, no `LEGACY_FIELDS`/`fs` key, every other line unchanged; every brief in every locale is byte-identical to before | unit (CLI) |
| Y55 | each of the four Y-§2.4 files, `--force` | fixpoint | after `pnpm challenge:keygen --force`, each `challenge.yaml` is byte-identical to its Y-§2.4 text; upstream-only (D124) | unit: the keygen CLI on a temporary copy of the repository's `platform/`, `.vitepress/` and `scripts/` (which hold the template module); when stage 5 finds the run needs `wasm-pack`, the row moves to stage 8 V-Y5 in the same change, and the ticket records why |
| Y56 | a rebuild whose write-back would produce identical bytes | no write | `challenge.yaml`'s mtime is unchanged | unit (CLI) |
| Y57 | inputs changed after a rebuild: (a) a brief in any locale, (b) `challenge.yaml`, (c) a `src/` file, (d) `src/.fsignore`, (e) the template module | stale only for (b)–(e) | `getTrackedInputPaths` returns `challenge.yaml`, the template, `.fsignore` when present and every scanned `src/` file, and no path under `platform/<L>/`; the CLI prints `[skip] <slug>` for (a) and `[stale] <slug>` for (b)–(e) | unit |
| Y58 | a second run right after a rebuild, nothing changed between | converged | the second run prints `[skip] <slug>` | unit (CLI); measured first (Y-O5) |
| Y59 | the built module fails the payload check | abort | exits non-zero with `[<slug>]` and `payload integrity`; `challenge.yaml` and `runtime.wasm` byte-identical to before (today's test, re-pointed from `index.md`) | unit (CLI) |
| Y60 | a flat `platform/challenge/<slug>.md` beside challenge directories | ignored | not processed; no "legacy flat file structure" warning (the warning and branch are gone) | unit (CLI) |
| Y61 | today's `source_files` CLI failures (non-entry path, non-UTF-8, short flag, unbracketed, unshaped flag, list under false switch) | unchanged | every existing case in "challenge-keygen CLI rejects an unusable source_files entry" passes with its fixture's fields in `challenge.yaml` and a brief holding only brief keys | unit |
| Y107 | keygen × `range.json`: absent; `{"primaryLocale":"en"}`; each R19 reason (D123) | `P` read first | absent and `en`: the run processes challenges as Y52–Y61; each failure: exit 1, the PL-E01–PL-E06 first line is stderr's first line, no `[skip]`, `[done]` or `[stale]` line, and no `runtime.wasm` or `challenge.yaml` written | unit (CLI) |

#### retype (0010-S37; D90)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| Y62 | `--difficulty`, `--tags`, `--category` on a slug with `challenge.yaml` and briefs in both locales | only the declaration changes | the named keys change in `challenge.yaml`; its other lines (comments, key order, untouched keys) and both briefs are byte-identical | unit |
| Y63 | slug without `challenge.yaml` (none, or only briefs) | not found | exit 1 with RT1; no file written | unit |
| Y64 | same-family `--backend` swap | today's flow | `backend` and `app` change in `challenge.yaml`, `src/` app rewritten, `runKeygen` called once; cross-family swap exits 2 with nothing written (today's) | unit |
| Y65 | a brief that (wrongly) carries `backend` | not retype's job | retype neither reads nor rewrites the brief; the brief is byte-identical afterwards | unit |

#### analyze (0010-S35; D89)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| Y66 | slug with `challenge.yaml` and a primary brief | title from the primary brief | `analyzeChallenge` returns `title` = the primary brief's `title` (`P = zh-TW`: `知的必要`; `P = en`: `Need to Know`), other fields from `challenge.yaml`; `formatAnalysis` prints `=== <that title> ===` | unit |
| Y67 | primary brief missing | slug fallback | `title` = slug (validate reports the missing brief, Y31) | unit |
| Y68 | `challenge.yaml` absent / invalid | errors | `validateChallenge` returns `No challenge.yaml found` / `Invalid YAML in challenge.yaml: <message>`; the other existing errors (`src/` missing, app missing, flag missing, required fields) keep their text | unit |
| Y69 | discovery | by challenge directory with `challenge.yaml` | `discoverChallenges` returns `{ slug, declarationPath, briefPath }` for each, `briefPath` the primary brief's; flat `.md` files are not returned | unit |
| Y108 | analyze × `range.json`: absent; `{"primaryLocale":"en"}`; each R19 reason (D123) | `P` read first | absent: `title` from `platform/zh-TW/challenge/<slug>/index.md`; `en`: from `platform/en/…`; each failure: exit 1 with that code's first line first on stderr and no challenge analysed | unit |

#### create:challenge (0010-S38; D82–D84)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| Y70 | no `range.json` | `P = zh-TW` | `run` writes `platform/zh-TW/challenge/<slug>/index.md`, `platform/challenge/<slug>/challenge.yaml`, `src/<app>`, `src/flag.txt` and no other file; stdout's scaffold block lists those four paths, brief first | unit |
| Y71 | `range.json` `{ "upstream": {…} }` (no `primaryLocale`) | `P = zh-TW` (R17) | as Y70 | unit |
| Y72 | `range.json` `{ "primaryLocale": "en" }` | `P = en` | brief at `platform/en/challenge/<slug>/index.md`; nothing under `platform/zh-TW/` | unit |
| Y73 | `range.json` unusable (each R19 reason) | refuse | status 1; stderr carries `readPrimaryLocale`'s PL-E01–PL-E06 first line; the tree is byte-identical before and after (no directory created, `_redirects` untouched, keygen not called) | unit |
| Y105 | a tree in the legacy layout (`platform/index.md` present) | refuse before writing (D82, D19) | status 1; stderr's first line is PL-E08's, followed by the listed paths; the tree is byte-identical before and after (no directory created, `_redirects` untouched, keygen not called) | unit |
| Y74 | brief content | brief keys only | frontmatter keys exactly `title`, `layout` (`challenge`) in that order; body `\n# <title>\n\n<SCAFFOLD_TEXT[P].body>\n`; `validateChallengeBrief` accepts it | unit |
| Y75 | `challenge.yaml` content | declaration only | keys exactly `number, difficulty, category, backend, app, packages, date, tags` in that order, values as today's `generateMarkdown`; no brief key; no `wasmModule` before keygen; after keygen `wasmModule` is the last key | unit |
| Y76 | no `--title`, `P = en` / `P = zh-TW` | default title | `Stage8 Decl` / `未命名題目（stage8-decl）` for slug `stage8-decl`, in `title` and the H1 | unit |
| Y77 | `--title "X Y"` with either `P` | verbatim | `title: X Y` and `# X Y` | unit |
| Y78 | body placeholder | per `P` | `TODO: Write challenge description here.` / `TODO：在這裡寫說明頁內文。` (D137); stage 6 confirms that no word of the zh-TW body is a term GLOSSARY.md declares `_新造詞_` (RV2-02) | unit; stage 6 |
| Y79 | `SCAFFOLD_TEXT` | total over the list | a test iterates `LOCALES` of the locale list module (D4) and finds an entry with a non-empty title for slug `a-b` and a body containing `TODO` for each | unit |
| Y80 | collision: challenge directory exists — with only `src/`; only `challenge.yaml`; both | refuse | status 1 with CC1 naming `platform/challenge/<slug>/`; the existing `src/` files byte-identical | unit |
| Y81 | collision: `platform/<L>/challenge/<slug>/` exists for `L = P`; for `L ≠ P` only (orphan translation) | refuse | status 1 with CC1 naming that directory; nothing written | unit |
| Y82 | no collision; a flat `platform/challenge/<slug>.md` exists | not a collision | proceeds (the build rejects the flat file through the layout check (0010-S2, PL-E08)) | unit |
| Y83 | the scaffold just written | valid | `validateChallenge(root, slug)` reports `allPassed: true` for `P = en` and `P = zh-TW` (keygen double succeeding) | unit |
| Y84 | keygen fails (status 3) / `_redirects` not regenerated (status 2) | messages | W2 and W1 keep 0007's substrings (`platform/challenge/<slug>/`, …) and add the brief path `platform/<P>/challenge/<slug>/index.md` | unit |
| Y85 | number | from declarations | the written `number` is `nextChallengeNumber(root)` as the challenge-number functions define it over `challenge.yaml` files (live and retired) (0010-S27) | unit (0010-S27) |

#### Release gate, commit-time validation, L4 (0010-S39–0010-S41)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| Y86 | verify L1, `challenge.yaml` absent / present | gate | absent → `status: 'fail'`, reason VF1; present → runs `validateChallenge(root, slug)` and on failure the reason is `validate failed: <failed labels>` (e.g. `brief (zh-TW)`) | unit |
| Y87 | verify L2, `challenge.yaml` absent | gate | `status: 'fail'`, reason VF1, keygen not spawned | unit |
| Y88 | `deriveSlugs` inputs: `platform/challenge/s/challenge.yaml`; `platform/challenge/s/src/app.py`; `platform/zh-TW/challenge/s/index.md`; `platform/en/challenge/s/index.md`; `platform/ja/challenge/s/index.md` (`ja` unlisted); `platform/challenge/s.md`; `platform/en/guide/x.md`; absolute and backslash forms of each | slugs | returns `s` for the first four (and their absolute/backslash forms) and nothing for the last three | unit |
| Y89 | `runLintStaged`: challenge directory without `challenge.yaml`; neither directory nor any brief; a brief without directory | outcomes | LS1 error; `[pre-commit] ⊘ s (removed)` and no error; validate's `declaration` failure (VM1) reported | unit |
| Y90 | the hook's selection | briefs reach the script | a commit that stages only `platform/<L>/challenge/<slug>/index.md` with a forbidden key is blocked with VM6 (the hook (0010-S29) widens the ACMRD path list; the locale filter is the script's, R23) | unit (`pre-commit-sh.test.ts`) |
| Y91 | `buildPlayerPackage`, `P = zh-TW` / `P = en` | primary brief | `description.md` = `extractDescription` of `platform/<P>/challenge/<slug>/index.md` (`# 知的必要` + first paragraph / `# Need to Know` + first paragraph) | unit |
| Y92 | primary brief missing | error | throws PP1 | unit |
| Y93 | package contents | whitelist | the package holds exactly `description.md` and `META.yaml`; neither file contains, as a substring, the value of `wasmModule`, `app` or `flag`, or any `source_files` entry, of that challenge's `challenge.yaml` (V-5: only these four keys' values are compared; short values such as `number` or `category` are not) | unit |
| Y109 | verify L1 and L2 × `range.json` with each R19 reason (D123) | fail before any check | `status: 'fail'` with that code's PL-E01–PL-E06 first line as the reason; L2 does not spawn keygen | unit |
| Y110 | `buildPlayerPackage` × `range.json`: absent; `{"primaryLocale":"en"}`; each R19 reason (D123) | `P` read first | absent: the zh-TW brief (Y91); `en`: the English brief; each failure: throws a `SiteLayoutError` with that code, and the output folder holds no file | unit |
| Y111 | brief folder entries (D127), on a fixture with no `range.json` (`P = zh-TW`), `platform/challenge/s/challenge.yaml` present and no `challenge.yaml` for `t` or `u` (RV2-18): `platform/zh-TW/challenge/s/hints.md` beside `index.md`; `platform/zh-TW/challenge/t/diagram.png` with no `index.md`; `platform/zh-TW/challenge/u/` holding only `notes.md`; a contrast case adding `platform/challenge/t/challenge.yaml`; and, with 0007 W3 forced by another path, `platform/zh-TW/challenge/t/` untracked (SC2-02) | only `index.md` is a brief | `deriveSlugs` returns `s` for `…/s/index.md` only and nothing for `…/s/hints.md`, `…/t/diagram.png` or `…/u/notes.md`; `indexTrees`' slugs hold `s`, not `t` or `u`; `briefFaults` reports nothing for `t` or `u`, and in the contrast case reports `missing-primary` for `t` from its declaration (W6b), so D127 changes only how a slug is derived from a brief; the hook's stderr holds no 0007 W4 line naming `platform/zh-TW/challenge/t/`; validate discovers no slug `t` or `u`; `targetDirectoryFaults` ignores `u`; `create:challenge --name t` still refuses with CC1 (D84); `…/s/hints.md` builds as an ordinary page | unit |

#### Skills, documents, dev server (0010-S43; D87–D88)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion | Level |
|---|---|---|---|---|
| Y94 | wxl-create `SKILL.md` and `SKILL.zhTW.md`, `.claude/` and `.agents/` | paths and field homes | Step 4.1 edits `description` in the brief and `tags`, `source_visible`, `packages` in `challenge.yaml`, and names which keys stay as scaffolded in which file; Step 4.2's canonical prose reference is the `door-is-open` brief in the new brief's locale folder; Step 4.3 writes over "the `TODO` placeholder" without quoting the English text; Step 4.6 says "translation" / "primary-locale brief" (not "locale mirror" / "root-locale"); Step 6 restarts `pnpm dev` after `challenge.yaml` edits; the file list and Verification list `platform/<P>/challenge/<slug>/index.md` and `platform/challenge/<slug>/challenge.yaml`; `git grep -n "challenge/<slug>/index.md"` in these four files finds only `platform/<P>/…` forms; `diff` of each `.claude/` file with its `.agents/` twin is empty; `sentence-map.test.ts` passes | stage 6 + unit |
| Y95 | wxl-mutate `SKILL.md`, both trees | ban moves | the ban names `backend`, `difficulty`, `tags`, `category` in `challenge.yaml`; the "why" sentence says `description` lives in the brief; trees identical | stage 6 |
| Y96 | wxl-verify `SKILL.md`, both trees | L1 wording | the description and body call L1 "declaration / brief / structure lint"; its fix line says to correct `challenge.yaml` for declaration keys and the brief's frontmatter for brief keys; trees identical | stage 6 |
| Y97 | `README.md` / `README.en.md` "題目設定格式" / challenge-format section; command table row for `challenge:validate`; the `fs:` sentence | rewritten | the example shows a `challenge.yaml` (Y-§2.4 `door-is-open`) and a brief's three keys; the `fs:` compatibility sentence is gone; the validate row says it checks the declaration, every brief and the layout | stage 6 |
| Y98 | `CONTRIBUTE.md`: the `create:challenge` paragraph, the retype paragraph ("do not edit `index.md` frontmatter"), the keygen steps and skip note | rewritten | each names `challenge.yaml` (and the primary brief for `create:challenge`); the keygen skip note says it checks `wasmModule` in `challenge.yaml`; the dev-restart rule (D87) is stated | stage 6 |
| Y99 | `docs/agents/challenge-pipeline.md` layout table; `AGENTS.md` Repository layout | rewritten | `platform/challenge/<slug>/` = `challenge.yaml` + `src/`; briefs under `platform/<locale>/challenge/<slug>/`; E1 untouched | stage 6 |
| Y100 | learner guide, both locales: `guide/python.md` (packages a challenge declares in its frontmatter), `guide/index.md` (difficulty badge prints the raw frontmatter string), `guide/troubleshooting.md` (difficulty badge row) | wording | each says "challenge declaration" (`題目宣告`) instead of frontmatter; nothing else in those sentences changes | stage 6 |
| Y101 | `pnpm dev` running; `difficulty` edited in `challenge.yaml` | documented limit | stage 8 V-Y8: a reload still shows the old badge; after restarting `pnpm dev` it shows the new one | stage 8 |
| Y106 | flag exposure × this epic's change (ADR-0005 class 3) | none | Stage 7: the source files newly shown on the Traditional Chinese selected-excerpts page (R16) are exactly those the English page already lists; for each upstream challenge, with `F` the flag file's content minus at most one trailing LF or CRLF, no scalar of `challenge.yaml` at any depth (a list member included) contains `F` as a substring (V-6) | stage 7 |

### Area U — the upgrade's move

The AC column names this spec's AC.

Level: **unit** = 0010-S45/0010-S46/0010-S47 pure calls; **run** = 0010-S44 (real git, temporary repository, fixture
archives; create-wxl's own vitest); **root** = the root vitest suite
(0010-S48, 0010-S49); **S8** = stage 8 (0010-S51, 0010-S52). "Nothing written" means: `git status --porcelain=v1
--untracked-files=all` empty, every tracked file equal to `HEAD`, `range.json` bytes unchanged, no
`create-wxl-upgrade-` entry left under `tmpRoot`. Unless a row says otherwise, B and T are fixture
archives; "legacy B" holds `platform/index.md`, `platform/guide/a.md`,
`platform/challenge/s1/index.md` (+ `src/app.py`) and `platform/zh-TW/challenge/s1/index.md`; "new T"
holds the transform of legacy B with one stated change.

#### When the move happens (D91, D92, D100)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion (seam) | AC | Level |
|---|---|---|---|---|---|
| U1 | layout: teacher legacy × B legacy × T new | Both moved; merge on B′/o′/T | 0010-S44: after the run the range holds every destination, no legacy page, `platform/challenge/s1/challenge.yaml`; report R6 present; exit 0 | AC-44 | run |
| U2 | teacher new × B legacy × T new (teacher moved by hand per README) | Only B moved; no range move ops; the teacher's range is not moved, so D105 writes nothing | 0010-S44: report R6 is exactly the count line with 0; `range.json` gains no `primaryLocale` (with or without one before); no path outside the merge's ops changes | AC-44, AC-49 | run |
| U3 | teacher legacy × B new × T new (teacher added `platform/guide/mine.md` after a crossing; every challenge already declared) | Only the teacher's page moved; its translation briefs are of declared slugs, so untouched (D98); not a crossing run | 0010-S44: exit 0; `platform/en/guide/mine.md` written, source gone; report R6 is the count line with 1 and that move line only (no `strip`, no `declare`); no UP-E14; no report R4 crossing line; `range.json` has no `primaryLocale` added (D105) | AC-44, AC-49 | run |
| U4 | teacher new × B new × T new | No move | 0010-S44: no report R6 line; the report equals the expected report of 0006's existing test for the same fixture (reused unchanged), and every existing `upgrade-*.test.mjs` case passes unchanged | AC-44 | run |
| U5 | teacher legacy; `range.json` version = target version, different commit, no `CREATE_WXL_COMMIT` | UP-I01 at step 6 | 0010-S44: stdout exactly the UP-I01 line, exit 0, `fetchArchive` not called, nothing written, legacy pages unchanged | AC-44 | run |
| U6 | teacher legacy; base commit = target commit (`range.json` / `--from <commit>`) | UP-I01 at step 6 | as U5 | AC-44 | run |
| U7 | teacher legacy; `--from <commit>` whose archive version equals the target's (no override) / is above / is below 3.0.0 | UP-I01 / UP-E07 / UP-E10 after download, before 7a | 0010-S44: the code, `fetchArchive` called twice, nothing written, no UP-E14 even when T is legacy | AC-44 | run |
| U8 | teacher legacy × `--from <version>` naming a legacy release; `--from <commit>` naming a legacy commit; base from `range.json` naming a legacy release | B and the teacher's range moved in each | 0010-S44: report R6 present and `primaryLocale` appended in all three | AC-44 | run |
| U9 | `--from <commit>` naming a new-layout commit, teacher's range wholly legacy (a wrong `--from`, 0006 B1, TB3's B3) | Teacher moved, not crossing: every legacy page moved, each English brief split, each translation brief of its slugs stripped; no `primaryLocale` (D105) | 0010-S44: exit 0; report R6 holds every move, declare and strip line of the teacher's range and its count; no report R4 crossing line; `range.json` gains no `primaryLocale`, so the range builds with `zh-TW` at the root and each English-only challenge then fails validate's VM10 at `platform/zh-TW/…` (as U140; C-13) | AC-44, AC-49 | run |
| U10 | T legacy (`CREATE_WXL_COMMIT` = a legacy commit), B legacy or new, teacher legacy or new | UP-E14 `target` `target-layout` at 7a | 0010-S44: stderr holds exactly one UP-E14 line naming T's first legacy page (sorted); exit 1; nothing written | AC-47 | run |
| U11 | page predicate × path: `platform/x.md`; `platform/guide/x.md`; `platform/challenge/s/index.md`; `platform/challenge/s/notes.md`; `platform/challenge/index.md`; `platform/challenge/s/src/README.md`; `platform/public/x.md`; `platform/shared/x.md`; `platform/zh-TW/x.md`; `platform/en/x.md`; `platform/x.MD`; `platform/postcss.config.mjs`; `docs/x.md`; `Platform/x.md`; `platform/ZH-TW/x.md` | legacy page: yes; yes (non-brief); yes (English brief); yes (non-brief); yes (non-brief); no; no; no (excluded area); no; no; no; no; no; no (literal prefix); yes (not a locale folder path) | 0010-S45: `legacy` and each op as stated, for a tree holding exactly that path | AC-44 | unit |
| U12 | `platform/challenge/s.md` (single-file brief) | `legacy-brief` | 0010-S45: `failures` = `[{token:'legacy-brief', path:'platform/challenge/s.md'}]` | AC-47 | unit |
| U13 | B in new layout but T in new layout with B ≡ T for every page | No report R6, no UP-A12 caused by pages | 0010-S44: report R3 has no UP-A12 when `config.mts` and `shortLink.ts` are also equal | AC-51 | run |
| U151 | teacher new layout × B new × T new, `P = zh-TW` (no `primaryLocale`), plus a stray legacy English brief `platform/challenge/s2/index.md` carrying declaration keys (no declaration file, no translation) (C-13) | Moved, not crossing: the brief moved and split; no `primaryLocale` (D105) | 0010-S44: exit 0; report R6 holds the move and declare lines for s2 and its count; `range.json` unchanged; afterwards `pnpm challenge:validate s2` fails VM10 at `platform/zh-TW/challenge/s2/index.md` (accepted as U140; the README's upgrade section says so, U137) | AC-44, AC-49 | run |

#### The transform (0010-S45; D95, D97, D98, D102)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion (seam) | AC | Level |
|---|---|---|---|---|---|
| U20 | non-brief page, LF / CRLF / no final newline / empty file / binary bytes | `move` op, content identical | 0010-S45: `op.content` byte-identical to the input for each | AC-45 | unit |
| U21 | upstream `door-is-open` English brief at `65de8c0` | `move` + `declare` | 0010-S45: contents equal U-§1's two schema examples byte for byte | AC-45 | unit |
| U22 | brief with kept and declaration keys interleaved (`title`, `number`, `layout`, `tags`, `description`, `date`) | each part keeps the original relative order | 0010-S45: brief lines = fences + `title`, `layout`, `description` groups; yaml = `number`, `tags`, `date` groups | AC-45 | unit |
| U23 | CRLF brief; mixed CRLF/LF lines; BOM brief | endings per line kept; BOM stays in the brief only | 0010-S45: every output line's ending equals its input line's; `challenge.yaml` does not start with `EF BB BF`; the brief does | AC-45 | unit |
| U24 | multi-line group: block sequence, block scalar `>-`, indented comment, blank line inside a group, quoted key `"number": 1`, comment and blank line before the first key | grouped as U-§1 states; quoted key is a declaration | 0010-S45: outputs equal the hand-written expected bytes | AC-45 | unit |
| U25 | SC1–SC6 each broken: invalid UTF-8; no opening fence; unclosed fence; fence `--- ` with trailing space (not a fence → unclosed); scalar or sequence at top level; duplicate key; anchor in `tags` aliased by `keywords`; top-level `{ a: 1 }` on one line; English brief with only `title`/`description`/`layout` | `frontmatter` | 0010-S45: one failure `{token:'frontmatter', path}` per case; no ops | AC-47 | unit |
| U26 | brief with no `title` (only declarations) | split: brief keeps only the fences | 0010-S45: brief = `---⏎---⏎` + body | AC-45 | unit |
| U27 | translation brief: declarations present; none present; no front matter | `strip` op / no op (content unchanged) / `frontmatter` | 0010-S45: as stated | AC-45, AC-47 | unit |
| U28 | translation brief whose slug has no English brief and is not declared; the same brief beside `platform/challenge/<slug>/challenge.yaml`; beside `platform/en/challenge/<slug>/index.md` | `orphan-brief` / untouched / untouched (D98) | 0010-S45: one failure naming the translation brief / no failure and no op for it / no failure and no op for it | AC-47 | unit |
| U29 | `to` already present in the input (`platform/x.md` and `platform/en/x.md` both in B) | `target-exists` | 0010-S45: failure with `path` and `to` | AC-47 | unit |
| U30 | a tree with no legacy page (new layout, or `platform/` absent) | no-op | 0010-S45: `{ legacy: false, ops: [], mismatches: [] }` | AC-45 | unit |
| U31 | same input twice | same output | 0010-S45: deep-equal results | AC-45 | unit |
| U146 | a new-layout tree (`platform/en/…`, `platform/zh-TW/…`, `platform/challenge/s1/challenge.yaml`, `platform/zh-TW/challenge/s1/index.md`) plus one stray `platform/guide/mine.md` | one `move` op; the translation brief of the declared slug untouched | 0010-S45: `{ legacy: true, ops: [{ kind: 'move', from: 'platform/guide/mine.md', to: 'platform/en/guide/mine.md', … }], mismatches: [] }`; no `strip`, no `failures` | AC-45 | unit |
| U150 | legacy pages named like a locale: `platform/en.md`, `platform/zh-TW.md` (C-12) | moved like any page, to `platform/en/en.md` and `platform/en/zh-TW.md`; no stop | 0010-S45: two `move` ops with those destinations, no `failures`; the next build fails with PL-E09 naming both (B31), whose README line says to rename them (accepted: the move does not rename pages, D95) | AC-45 | unit |
| U32 | moved file modes (non-Windows): source 0644; source 0755; declaration file; stripped brief 0600 | dest 0644; 0755; 0644 under umask 022; 0600 kept | 0010-S44: `lstat` modes after the run | AC-48 | run |

#### Mismatches (D104, R16)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion (seam) | AC | Level |
|---|---|---|---|---|---|
| U40 | teacher's en and zh-TW declarations deep-equal | no UP-A16 | 0010-S44: report R3 has no UP-A16 line | AC-46 | run |
| U41 | teacher changed en `tags` of an upstream challenge; zh-TW unchanged | UP-A16 `(zh-TW brief, "tags")`; yaml holds en | 0010-S44: exactly that report R3 line; `challenge.yaml`'s `tags` group is the teacher's en line | AC-46 | run |
| U42 | key only in en / only in zh-TW | UP-A16 each; zh-TW-only value dropped | 0010-S44: one line per key; no group for the zh-TW-only key in `challenge.yaml` | AC-46 | run |
| U43 | upstream `selected-excerpts` untouched (B's `source_files` en 10 / zh-TW 7, teacher's identical) | not reported | 0010-S44 with B built from `v3.1.1`'s two briefs: no UP-A16 for it | AC-46 | run |
| U44 | teacher changed en `source_files` of `selected-excerpts` | pair differs from B's → reported | 0010-S44: UP-A16 `(…/selected-excerpts/index.md, "source_files")` | AC-46 | run |
| U45 | teacher made zh-TW `source_files` equal to en | no mismatch in the range → not reported | 0010-S44: no UP-A16 | AC-46 | run |
| U46 | teacher's own challenge (absent from B) with a mismatch | reported | 0010-S44: UP-A16 line | AC-46 | run |
| U47 | values `[ a, b ]` vs `[a, b]`; `1` vs `"1"`; `true` vs `"true"`; same date text | equal / mismatch / mismatch / equal | 0010-S45: `mismatches` as stated | AC-46 | unit |
| U48 | three keys mismatched across two briefs; a key holding an ANSI escape | lines sorted by path then key; key escaped | 0010-S44/0010-S46: report R3 order and `jsonValue` escaping | AC-46, AC-50 | run, unit |
| U49 | B side: B has a mismatch, teacher's range not legacy (U2 shape) | nothing reported (only the teacher's moved briefs are compared) | 0010-S44: no UP-A16 | AC-46 | run |

#### Stops (D96; R14)

Token rows (U50, U51, U53–U61, U64, U153, U154 (a), and U56's two `alias` cases): exit 1; nothing
written; stderr lines each starting `UP-E14`, exactly one per failure as D96 orders them (one per
path and token, D125); no UP-E09; `HEAD` and the index unchanged. U52 and U56's NFD case: the run
completes (exit 0) and the path is byte-identical and untouched. U62, U154 (b) and (d): exit 1,
stderr's first line is UP-E11 naming the path, no UP-E14 (D142), nothing written, `HEAD` and the index
unchanged (RV2-15). U154 (c): 0006's UP-E03 at step 4.
U63: exit 1, CW-E14 naming the git command, no UP-E14, nothing written.

| Row | Type × field × boundary | Expected token (side) | AC | Level |
|---|---|---|---|---|
| U50 | destination exists: tracked `platform/en/guide/a.md`; untracked ignored `platform/en/guide/a.md`; `platform/en` a regular file; `platform/challenge/s1/challenge.yaml` tracked | `target-exists` (range), message names `from` and `to` | AC-47 | run |
| U51 | legacy page is a tracked symbolic link; `platform/guide` a tracked symbolic link to a directory; an untracked ignored `platform/notes.md` symbolic link; `platform/en` a symbolic link; `platform/zh-TW` a symbolic link (stripped brief under it; reached through D125's translation brief check, C-4) (non-Windows) | `symlink` (range) | AC-47 | run |
| U52 | dangling symbolic link `platform/x.png` (not `.md`) | no stop; left untouched | AC-47 | run |
| U53 | untracked page ignored by `.gitignore`, by `.git/info/exclude`, by `core.excludesFile`; zh-TW brief untracked and ignored (reached through D125's translation brief check, C-4) | `ignored` (range) | AC-47 | run |
| U54 | gitlink `platform/ext` (clean submodule); gitlink `platform/en` | `submodule` (range) | AC-47 | run |
| U55 | on a case-insensitive file system: tracked `platform/Guide/a.md` while the directory on disk is `platform/guide`; directory `platform/EN/` on disk before the run | `alias` (range) | AC-47 | run (on a case-insensitive file system only, skipped elsewhere with the reason; executed by the `fork-init-cross-os` job's `macos-latest` and `windows-latest` legs, which run `pnpm --dir create-wxl test`) |
| U56 | wrapped `deps.fs`: `realpath` of a tracked legacy page `platform/guide/a.md` returning `<root>/platform/Guide/a.md` (a letter-case model); `realpath` returning its NFD form (no stop, as 0006 U69); `realpath` of `platform` (the deepest existing ancestor of every destination) returning `<root>/PLATFO~1` (an 8.3 model) | `alias` (range) / none / `alias` (range) | AC-47 | run |
| U57 | tracked `platform/Guide.md` and `platform/guide.md` both legacy (fold collision of their destinations) | `alias` (range), both paths | AC-47 | run |
| U58 | rule `platform/en/` in `.gitignore`; rule `*.yaml`; rule in `core.excludesFile` only | `new-ignored` (range) | AC-47 | run |
| U59 | teacher's brief fails SC2; teacher's orphan zh-TW brief (no English brief, slug not declared); teacher's `platform/challenge/x.md` | `frontmatter` / `orphan-brief` / `legacy-brief` (range) | AC-47 | run |
| U60 | B (from `--from <commit>`) with an unsplittable brief / an orphan / a single-file brief / both `platform/x.md` and `platform/en/x.md` | same tokens, side `base`, at step 7; each line equals the head followed only by the base remedy (the orphan case is U-§4's example, byte for byte) | AC-47 | run |
| U61 | three failures at two paths | three lines sorted by path, then token order | AC-47 | run |
| U62 | `lstat` rejecting `EACCES` on a legacy page; reading a legacy page rejecting `EACCES` | UP-E11 naming the path, not UP-E14 | AC-47 | run |
| U63 | `git check-ignore` of RC4/RC6 exiting 128; `runGit` rejecting `EIO` for it | CW-E14 naming the command (0006 D19) | AC-47 | run |
| U64 | U50 and U61, run with `--lang zh-TW` | zh-TW sentences, same tokens and paths | AC-50 | run |
| U144 | untracked ignored `platform/.draft.md`; untracked ignored `platform/node_modules/x/README.md`; a symbolic link `platform/shared/x.md`; a gitlink `platform/shared/ext` (excluded areas, D116) | none: the run completes, each path byte-identical and untouched | AC-47 | run |
| U148 | B (from `--from <commit>`) with an orphan translation brief, and the teacher's range with an unsplittable brief | only the base line (side `base`, at 7b); no `range` line, since 8a never runs (D96) | AC-47 | run |
| U153 | a slug with an English brief in the teacher's legacy range and: (a) `platform/zh-TW/challenge/<slug>/index.md` untracked and ignored; (b) `platform/zh-TW` a tracked symbolic link to a directory holding that brief (non-Windows); (c) `platform/zh-TW/challenge` a tracked symbolic link (non-Windows; untracked it would end at 0006 step 4 with UP-E03); (d) as (b) with three such slugs (D125; RV2-15) | (a) `ignored` (range) naming the brief; (b) and (c) `symlink` (range) naming the brief path `platform/zh-TW/challenge/<slug>/index.md`, one line; (d) three `symlink` lines, one per brief path; nothing written | AC-47 | run |
| U154 | reading (D139), the race behind 0006 step 4 modelled with a wrapped `deps.fs` as U56 does (RV2-01): (a) `lstat` of a tracked legacy page reporting a symbolic link; (b) `lstat` of a tracked legacy page reporting a FIFO; (c) without the wrapper, a tracked page replaced on disk by a FIFO (non-Windows); (d) (b) together with another legacy page that fails SC2 (D142) | (a) `symlink` (range), the wrapper recording no read of that path; (b) UP-E11 naming the path, the wrapper recording no read of it (the run does not block); (c) 0006's UP-E03 at step 4 (`git status` reports the page modified), nothing read; (d) UP-E11 only, no UP-E14 `frontmatter` line; nothing written in each | AC-47 | run |

#### Plan, merge and apply (D93, D94, D103; R14, R15)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion (seam) | AC | Level |
|---|---|---|---|---|---|
| U70 | teacher's own legacy page (absent from B and T) | P-2 on its destination; the move op stands | 0010-S44: destination bytes = source bytes; source gone; status shows ` D <from>` and `?? <to>`; `git diff --cached` empty; `HEAD` unchanged; report R2 counts 0; report R6 lists it | AC-48 | run |
| U71 | upstream page untouched by teacher; t ≡ b′ | P-2 | 0010-S44: destination = t; not counted in report R2 | AC-48 | run |
| U72 | upstream page untouched; t ≢ b′ | 0006 M5 at the destination | 0010-S44: destination = t; report R2 `updated` +1 (o′ present) | AC-48 | run |
| U73 | teacher edited a moved page; t ≡ b′ | P-2, teacher's text kept | 0010-S44: destination = teacher's bytes | AC-48 | run |
| U74 | teacher edited line X, upstream edited line Y of the same page (the `./shared/` import of `challenges.md`) | 0006 M12 clean | 0010-S44: destination holds both changes; report R2 `updated` +1; no UP-A1 | AC-48 | run |
| U75 | overlapping edits on a moved page | 0006 M12 conflict at the destination | 0010-S44: markers with labels `range`, base version, target version; UP-A1 naming the destination | AC-48 | run |
| U76 | upstream deleted a page (b′ present, t absent), teacher untouched | 0006 M6 at the destination | 0010-S44: neither path exists after the run; report R2 `deleted` 1 and an report R2 line naming the destination; report R6 still lists the move | AC-48 | run |
| U77 | upstream deleted a page, teacher edited | 0006 M8 at the destination | 0010-S44: destination = teacher's bytes; UP-A3 naming the destination | AC-48 | run |
| U78 | teacher deleted an upstream page, upstream changed it | 0006 M7 at the destination | 0010-S44: destination absent; UP-A5 naming it | AC-48 | run |
| U79 | `challenge.yaml`: teacher changed `tags`, upstream added `hint: x` on its own line | 0006 M12 clean | 0010-S44: both in the yaml; no UP-A1 | AC-48 | run |
| U80 | stripped zh-TW brief: teacher edited body, upstream edited another body line | 0006 M12 clean at the brief's own path | 0010-S44: both changes; report R2 `updated` +1 | AC-48 | run |
| U81 | B legacy, teacher new (U2 shape) with a teacher edit in `platform/en/guide/a.md` and T changing another line | ordinary 0006 M12 against b′ | 0010-S44: clean merge | AC-48 | run |
| U82 | a teacher's ignored file `platform/en/notes.local` already on disk (directory `platform/en/` exists, no destination exists) | allowed; ignored file untouched | 0010-S44: run completes; the ignored file byte-identical; `git ls-files --others --ignored --exclude-standard` same before and after | AC-48, AC-52 | run |
| U83 | all pages of `platform/guide/` moved | directory `platform/guide/` left, empty | 0010-S44: `git status` shows no line for it; `readdir` empty | AC-48 | run |
| U84 | teacher's CRLF page vs LF b′ with the same text | ≡ after CRLF normalisation | 0010-S44: P-2 or 0006 M5 as for LF; CRLF bytes kept when P-2 | AC-48 | run |
| U85 | 0006 U17 fixture (every merge branch) with legacy pages added to B, T(new) and the teacher's range | every 0006 branch still ends as its row states | 0010-S44: 0006 U17's assertions, unchanged, plus U70–U72 | AC-48 | run |
| U149 | layout: teacher legacy × B legacy × T new (crossing, as U1); the teacher's own challenge `<own>` (absent from B and T) with a legacy English brief `platform/challenge/<own>/index.md` and a zh-TW brief `platform/zh-TW/challenge/<own>/index.md` that both carry declaration keys (C-5; RV2-20) | the move, declare and strip ops of `<own>` are written in step 9 | 0010-S44: exit 0; `platform/en/challenge/<own>/index.md` holds the English brief's fences, kept groups and body, `platform/challenge/<own>/challenge.yaml` its declaration groups (as U1), and after the run `platform/zh-TW/challenge/<own>/index.md`'s bytes equal its fences, kept groups and body (the strip op's `content`), with no declaration key left; `git status --short` shows it ` M`; report R6 holds its `(declaration removed)` line | AC-48 | run |

#### `range.json` (D105; R18)

| Row | Before (crossing run unless stated) | After | AC | Level |
|---|---|---|---|---|
| U90 | each row of U-§1's `range.json` table | as that table | AC-49 | run |
| U91 | `{"__proto__":{…},"upstream":{…}}` | `__proto__` kept as an own key, `primaryLocale` appended after it | AC-49 | run |
| U92 | `{"upstream":{…},"primaryLocale":null}` / `"fr"` / `{}` | kept unchanged, nothing appended | AC-49 | run |
| U93 | not a crossing run (B new): absent / `{"upstream":{…}}` | `{"upstream":…}` only (0006 U24 unchanged) | AC-49 | run |
| U94 | crossing run, `fs.rename` failing on the 2nd write of step 9 | UP-E09; `range.json` bytes unchanged | AC-49, AC-52 | run |
| U140 | crossing run, teacher's range moved, `{"primaryLocale":"zh-TW","upstream":{…}}`, and a teacher's own challenge with only an English brief | `primaryLocale` kept (R18); the run exits 0 and its report says nothing about the challenge (accepted); the challenge then has no brief in the kept primary locale, so `pnpm challenge:validate <slug>` fails VM10 at `platform/zh-TW/challenge/<slug>/index.md` and the hook refuses its next commit (D64); the README upgrade section says so (U137) | AC-49 | run |
| U143 | `{"primaryLocale":"en"}` (the README's manual steps, B84) with no `upstream`, `range:upgrade` without `--from` | 0006's UP-E06 with reason `upstream` (0006 J4), unchanged until epic 0011's R25; exit 1; nothing written | AC-49 | run |

#### Report and codes (D106; R14, R16, R24)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion (seam) | AC | Level |
|---|---|---|---|---|---|
| U100 | moved run | report R1–R5 as 0006, then report R6 | 0010-S44: line ids in order report R1, report R2…, report R3…, report R4…, report R5, report R6…; report R6 count n equals report R6 path lines | AC-50 | run |
| U101 | report R6 ordering: `platform/index.md`, `platform/challenge/s1/index.md` (move + declare), zh-TW strip | sorted by first path, move before declare | 0010-S46: lines equal the expected array | AC-50 | unit |
| U102 | report R2 in a moved run with 12 moves and one 0006 M5 | counts exclude moves; no report R2 line names a `from` | 0010-S44 | AC-50 | run |
| U103 | report R4 crossing line × (crossing, UP-A12) ∈ {yes,yes; yes,no; no,yes; no,no} | present only in the first | 0010-S46 | AC-50 | unit |
| U104 | report R6 primary-locale line × (crossing, teacher's range moved, own key) ∈ {yes, no}³ | present only for (yes, yes, absent) | 0010-S46: all eight combinations; 0010-S44: (yes, yes, absent), (yes, no, absent) and (no, yes, absent) | AC-50 | unit, run |
| U105 | both languages for every new line and code | sentences of U-§4 | 0010-S46, 0010-S47: equality | AC-50 | unit |
| U106 | `UP_ARGS` | gains `UP-E14` (`{ side: 'range', token: 'target-exists', path: 'platform/a.md', to: 'platform/en/a.md' }`) and `UP-A16` (`{}`); each message starts with its code in both tables | 0010-S47 | AC-50 | unit |
| U107 | a destination or key holding an ANSI escape or a newline | escaped (`jsonValue`), one line | 0010-S46 | AC-50 | unit |
| U108 | every report built without the new inputs (all existing `buildReport` calls) | output unchanged | 0010-S46: existing `upgrade-report.test.mjs` passes unchanged | AC-50 | unit |

#### Anchors and fork:init (D107; R24, F7)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion (seam) | AC | Level |
|---|---|---|---|---|---|
| U110 | crossing run with T's `config.mts` ≢ B's | one UP-A12, last | 0010-S44 | AC-51 | run |
| U111 | B legacy, B′'s `platform/en/index.md` ≡ T's, and every other anchor equal | no UP-A12 (the old `platform/index.md` is not an anchor) | 0010-S44 | AC-51 | run |
| U112 | `ANCHOR_PATHS` | the nine paths of D107, in that order | `ANCHOR_PATHS` is exported from `merge-plan.mjs` and deep-equals D107's nine-path literal, in order | AC-51 | unit |
| U113 | fork:init `--site-name` on a new-layout tree | hero name rewritten in `platform/en/index.md` and `platform/zh-TW/index.md` | 0010-S48: both files' 0003 A7 line; nothing else changed | AC-51 | root |
| U114 | fork:init `--site-name` on a legacy tree (only `platform/index.md`) | 0003 A7's tree error, its format unchanged, naming the new path | 0010-S48: stderr contains `A7: platform/en/index.md is missing`; exit 1; nothing written | AC-51 | root |
| U115 | create (0005) on a new-layout archive with `--site-name` | both new-layout homes rewritten | 0010-S48: `engine-apply.test.mjs` on the updated `ENGINE_READY_FIXTURE` | AC-51 | run |
| U116 | upstream's pristine check (`upstream-guard.test.ts`) | reads 0003 A7 at `platform/en/index.md` | 0010-S48: its field-id union holds `'A7:platform/en/index.md'` in place of `'A7:platform/index.md'` (0004 T67), and the test passes | AC-51 | root |
| U145 | fork:init `--site-name` on a new-layout tree without `platform/zh-TW/index.md` (a range that deleted its translation home, which the build allows) | known conflict until epic 0011 (U-O8): 0003 A7 still requires both home pages | 0010-S48: stderr contains `A7: platform/zh-TW/index.md is missing`; exit 1; nothing written. The READMEs say a range that reruns fork:init keeps both home pages (B86) | AC-51 | root |
| U152 | fork:init `--site-name` on a `P = zh-TW` new-layout tree without `platform/en/index.md` (the translation home deleted, which the build allows) (C-15) | the same known conflict until epic 0011 (U-O8) | 0010-S48: stderr contains `A7: platform/en/index.md is missing`; exit 1; nothing written; the READMEs' sentence (B86) covers it | AC-51 | root |

#### Restore and signals (0006 AC-11 kept)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion (seam) | AC | Level |
|---|---|---|---|---|---|
| U120 | after U85's run | report R5's commands restore `HEAD` | 0010-S44: run `git checkout -- .` then `git clean -fd`, each exit 0; porcelain empty; every file equals `HEAD`; ignored files byte-identical; no destination, no `challenge.yaml` left | AC-52 | run |
| U121 | `fs.rename` failing on the first destination write (after every `from` was deleted) | UP-E09 naming it with the restore line; exit 1 | 0010-S44: then U120's restore check passes | AC-52 | run |
| U122 | `SIGTERM` during step 9 between deletions and writes | UP-E09 with the signal; exit 130 | 0010-S44: then U120's restore check passes | AC-52 | run |
| U123 | `SIGINT` at checkpoint `step-8` in a crossing run | exit 130; nothing written; B′'s directory removed | 0010-S44 | AC-52 | run |
| U124 | UP-E14 at 7a/7b and at 8a | temporary directories (B, B′, T, merge inputs) removed | 0010-S44: no `create-wxl-upgrade-` entry left | AC-52 | run |

#### Upstream's own move and the locale list copy (D108; R15, R23)

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion (seam) | AC | Level |
|---|---|---|---|---|---|
| U130 | upstream; every 0010-S45 output for the base tag's `platform/` (the newest legacy-layout `v*` tag, D108: `v3.1.1` at `65de8c0`) | equals the compared tree's file (the oldest new-layout `v*` tag once one exists, else the working tree), byte for byte, unless the path is in the exception table | 0010-S49: one assertion per path naming it; one assertion that no `v*` tag newer than the base tag holds `platform/index.md` | AC-53 | root |
| U131 | upstream; every page and `challenge.yaml` of the compared tree | each is a 0010-S45 output for the base tag, or untouched by 0010-S45 (`platform/zh-TW/` pages other than briefs), or in the exception table | 0010-S49 | AC-53 | root |
| U132 | upstream (`isUpstreamDecision` true); the base tag missing in the checkout | the test fails naming the tag (not skipped) | 0010-S49 | AC-53 | root |
| U133 | create-wxl's locale list literal vs the site's module | equal | a create-wxl test reading the site module's source | AC-53 | run |
| U134 | 0010-S45 imported by the 0010-S49 test | the same module create-wxl publishes (`create-wxl/src/layout-move.mjs`) | the import path | AC-53 | root |
| U139 | a range or a fork (`isUpstreamDecision` false), with the base tag present and with it absent | the test is skipped | 0010-S49 with the decision's inputs stubbed: reports skipped in both cases, never failed; with `WXL_EXPECT_UPSTREAM=true` and the decision false it fails, as `upstream-guard.test.ts` does | AC-53 | root |
| U147 | upstream; `planLayoutMove` on `git show <tag>:platform/…` for each of `v3.0.0`, `v3.1.0`, `v3.1.1` (every legacy release create-wxl accepts as a base, `MINIMUM_BASE_VERSION` 3.0.0) | no failure, so the base remedy never fires for a release | 0010-S49: `failures` absent for each tag; `mismatches` hold exactly `(platform/zh-TW/challenge/selected-excerpts/index.md, source_files)` for each (checked at `65de8c0`) | AC-53 | root |
| U142 | the workflow jobs that run the root suite on upstream (T9) | each checkout has the tags | a unit test in the style of `tests/unit/workflows/upstream-only-jobs.test.ts` parses `quality-gates.yml` and `release.yml`: the checkout step of jobs `test`, `fork-init-cross-os` and `release` has `fetch-depth: 0` | AC-53 | root |

#### Added in integration

| Row | Type × field × boundary | Expected behaviour | Acceptance criterion (seam) | AC | Level |
|---|---|---|---|---|---|
| U135 | `GLOSSARY.md` 設定紀錄 and 搬家 (N17) | Both say `primaryLocale` `en` is recorded, when it has none, for a range still on the legacy layout that is upgraded from a legacy-layout upstream version (D105) | Stage 6: neither entry says that every range the upgrade moves records `en`; each states all three conditions, each one present (V-8): the upgrade is from a legacy-layout upstream version (the entry contains 「從舊版面的上游版本升級」); the range itself is moved (the same sentence contains 「搬家」 or 「還在舊版面」); it has no primary locale recorded yet (the same sentence contains 「還沒有記主語系」 or 「還沒記主語系」); 設定紀錄's working-tree sentence 「從舊版面的上游版本升級而搬家、而且還沒有記主語系的靶場，會記成英文」 meets all three; `glossary.test.ts` passes | AC-54 | stage 6 |
| U136 | page predicate × one shared path table (U11's paths and B21–B28's) | create-wxl's `isLegacyPage` is true exactly where `classifySourcePath` returns `outside` (D116) | a JSON table under `create-wxl/test/` lists each path with its class; the root suite runs `classifySourcePath` and the create-wxl suite runs `isLegacyPage` over it; both pass | AC-53 | run, root |
| U137 | READMEs × "Upgrade a range: `pnpm range:upgrade`" | Gains the move (decided by content, D91), report R6, UP-A16, D92's sentence (a range at the target's version is not moved and learns of its pages from PL-E08), the report R4 lines (D106, D120) and a pointer to "Moving to the locale folders" (B84); that `en` is recorded only when the range itself was on the legacy layout (D105); and that a range whose `range.json` already names another primary locale keeps it, so each challenge it has only in English then needs a brief in that locale before validate and the hook accept it (U140); and that a range moved in a run that is not crossing keeps its primary locale (`zh-TW` when none is recorded), so an English brief the move takes in also needs a brief in that locale (U9, U151, C-13) | Stage 6: each listed item is present in both languages (V-7), and no sentence contradicts D91–D106 or D120 | AC-54 | stage 6 |
| U138 | report R4 × crossing run ∈ {yes, no} | The redirects line (D120) exactly in a crossing run, directly before `R4: build and test`, in both languages | 0010-S46: present only when crossing; text equal to U-§4's canonical sentences | AC-50 | unit |

## Stage 8 plan

Stage 8 verifies on the surface that runs the behaviour (hard rule 4) and names that surface in
every report. Challenge pages are opened with their Browser panel open. The not-found page is
identified by VitePress's `.NotFound` element, not by its wording (0009 retrospective). Pushing a
throwaway branch, creating or deleting a temporary GitHub Pages range, and deleting a branch each
need the user's approval first (0008 D12). Fixture commits on throwaway branches are made with
`/tw-emoji-commit`; the throwaway branches are not ticket branches (hard rule 1 does not apply), as
in 0008 D12. Publishing create-wxl is not part of this epic (R31); upgrade rows and F-3 use a local
tarball. Copy controls on every preview show the production origin (`SITE_ORIGIN` in
`.vitepress/challenge/shortLink.ts`), so a copied link's target is checked by requesting the same
path on the preview, never by following the copied URL.

### Fixtures and surfaces (D119)

| Id | What | Built from | Used by |
|---|---|---|---|
| F-1 | `stage8/<ticket-id>`: the ticket branch plus one fixture commit: challenge `zh-only` (#999, dated after every other challenge, only `platform/zh-TW/challenge/zh-only/index.md` and its `challenge.yaml`) and article `platform/en/stage8-en-only.md` (no Traditional Chinese version), and the static file `platform/public/zh-TW/stage8.txt` (S60, R-13; SC2-06). No `range.json`, so `P = zh-TW`. Its Cloudflare Pages preview, base `/`. | ticket branch | V-B3, VA1a–VA1m, VL1–VL4, VL6, V-S1–V-S3, V-S5, V-Y6 |
| F-2 | `stage8/<ticket-id>-en`: the ticket branch plus `range.json` `{"primaryLocale":"en"}` and challenge `en-only` (#998, only `platform/en/challenge/en-only/index.md` and its `challenge.yaml`). Its Cloudflare Pages preview. | ticket branch | VA3a–VA3e, VL9, V-S4, V-S5, V-S7, V-B7 |
| F-3 | A temporary GitHub Pages range, base `/<repo>/`, created from F-1's pushed head: `npm pack` the create-wxl tarball from that head (so its bundled fork:init engine names the new home pages); in an empty directory run `CREATE_WXL_COMMIT=<F-1 head> npx --yes --package <tarball> create-wxl <name> --author 'Stage Eight' --repo <owner>/<name> --host github-pages --site-name 'Stage Eight Range' </dev/null`; create the GitHub repository and enable Pages (the user's approval first); push. Its `range.json` has no `primaryLocale`, so `P = zh-TW`. Second deploy: one commit that writes `range.json` `{"upstream":…,"primaryLocale":"en"}` and deletes F-1's `zh-only` challenge (its brief and its declaration folder), which would be an orphan under `en` that the hook refuses (D64); push. | F-1 | V-B4 and VA2i–VA2l (second deploy), VA2a–VA2h, VL5, V-S6 (first deploy) |
| F-4 | `rel`: a range made by the published `create-wxl@3.0.0` plus a teacher's own challenge, upgraded with the tarball packed from the pushed head A (`CREATE_WXL_COMMIT=<A>`); `P = en` after the move. Built and served locally. | V-U1 | V-U1–V-U3 |
| F-5 | `fork`: a clone of `v3.1.1` after `pnpm fork:init`, without `range.json`, with one page of its own; and `fork0`, the same without a page of its own (V-U5). | V-U4, V-U5 | V-U4, V-U5, V-B5 |
| F-6 | A temporary local clone of the ticket branch in a scratch directory, never pushed. | ticket branch | V-B1, V-B2, V-B6, V-Y1–V-Y5, V-Y7, V-Y8, VL7, VL8, VA4 |

Where an area's rows below name "the upgraded 3.0.0 range" or "the upgrade area's stage 8 range",
they mean F-4; "the stage 8 range with primary `en`" is F-2; "`stage8/<ticket-id>`" is F-1; "the temporary
GitHub Pages range" is F-3. A row's `<zh-only>` is F-1's `zh-only` and `<en-only>` its
`stage8-en-only` article.

### Area B

Copies of the tree are made outside the repository (for example `git worktree add` into a
temporary folder, or a `git archive` extract), so nothing is written into the checkout. Each row
names its surface.

| Row | Surface | Action | Observed (rows) |
|---|---|---|---|
| V-B1 | Terminal, `pnpm docs:build` (and `pnpm docs:dev`, `pnpm docs:preview` for PL-E08 only) on a temporary copy of the ticket's commit (F-6) | One copy per case: make each failing `range.json` of the schema table (PL-E01…PL-E06, including a symbolic link and a BOM file); link `platform/en` to a folder (PL-E07); restore `platform/index.md` and `platform/challenge/door-is-open/index.md` (PL-E08); add `platform/zh-TW/en/a.md` (PL-E09); set `"primaryLocale": "en"` and remove `platform/en/index.md` (PL-E10); in `platform/zh-TW/guide/notes.md` write `../../en/reference/attack-log-export-format.md` with `"primaryLocale": "en"` (PL-E11), and, with that rule temporarily disabled in the copy, build again (measures D12's premise); set a hero link to `challenges` (PL-E12); delete `platform/challenge/door-is-open/challenge.yaml` (PL-E13); make it two YAML documents (PL-E14); remove `layout` from `platform/en/challenge/door-is-open/index.md` (PL-E17); add `layout: challenge` to `platform/zh-TW/guide/notes.md` (PL-E18); restore the old `../../reference/…` link under each primary (B74). PL-E15 and PL-E16 are V-Y3's | Per case: PL-E01–PL-E14, PL-E17, PL-E18: non-zero exit, stderr holds the canonical first line and, for list codes, the listed paths (B5–B10, B21–B23, B29, B31, B33, B37, B65, B72, Y40, Y41, Y44, Y45); PL-E11 with its rule disabled: exit 0 (VitePress's own check passes the link, the premise measured); B74 under `en`: exit 0, and the built href opens the English reference page; B74 under `zh-TW`: non-zero exit with VitePress's dead-link report (its wording not pinned) |
| V-B2 | Terminal, `pnpm docs:build` on a temporary copy with `{"primaryLocale": "en"}` | List `.vitepress/dist` | Files follow the `en` column of "Source path → URL"; `dist/index.html` has `lang="en-US"`, `dist/zh-TW/index.html` `lang="zh-TW"`; hero hrefs per the home-page-links table (B42, B48 for `en`, B59, B70) |
| V-B3 | Browser panel, F-1's Cloudflare Pages preview (`stage8/<ticket-id>`: upstream, primary `zh-TW`, base `/`; V-4) | Stored value `zh-TW`: open `/`, click both hero buttons; open `/guide/notes`, follow the export-format link; stored value `en`: open `/en/`, click both hero buttons, then the nav bar title on `/en/guide/notes`; open `/en/challenge/door-is-open/` with the Browser panel open and load the challenge in the Browser tab | `/` is the Traditional Chinese home; buttons reach `/challenges` and `/guide/` (Traditional Chinese); the link opens the Traditional Chinese reference page; `/en/` buttons reach `/en/challenges` and `/en/guide/`; the title returns to `/en/`; the English brief renders and the challenge loads in the Browser tab (B61, B70, B71, B81) |
| V-B4 | Browser panel, F-3 redeployed after committing `range.json` `{"primaryLocale":"en"}` (base `/<repo>/`) | The same steps with the prefixes swapped (`/<repo>/` English, `/<repo>/zh-TW/` Traditional Chinese) | Mirror of V-B3 under base `/<repo>/`; hrefs carry the base (B61, B70, B71) |
| V-B5 | Terminal, `pnpm build` on a fork-shaped copy without `range.json` at the old layout (the tree at `65de8c0`, plus this epic's `.vitepress/`, `scripts/`, `platform/shared/` and `package.json`, so `pnpm build` runs this epic's build command, V-20) | Run it | Exits non-zero; stderr holds the PL-E08 first line, listing the old-layout pages and pointing to the README section, and no PL line other than PL-E08; no tool that `pnpm build` runs after `wasm:build` prints output before that line (B37, B38) |
| V-B6 | Terminal and Browser panel, `pnpm docs:dev` in F-6 (the scratch clone; nothing is written in the checkout) | Open `/guide/python` and `/en/guide/python`; write F-6's `range.json` as `{"primaryLocale":"en"}` while the dev server runs; reload `/guide/python`; restart the dev server; reload `/guide/python` and `/zh-TW/guide/python` | Before the edit: Traditional Chinese at `/guide/python`, English at `/en/guide/python`; after the edit and a reload: still Traditional Chinese at `/guide/python`; after the restart: English at `/guide/python`, Traditional Chinese at `/zh-TW/guide/python` (B15, B49) |
| V-B7 | Terminal, a scratch clone of F-2 (`stage8/<ticket-id>-en`: a range for the upstream decision, `P = en`) | `pnpm install && pnpm test --run`; then `WXL_SMOKE_PAGES=1 pnpm build && pnpm test:smoke` | Both pass; the D124 rows report skipped with the upstream decision's reason; every URL the smoke suite derives is `P = en`'s (English at `/`, Traditional Chinese under `/zh-TW/`) (B93, D54, D124) |

### Area A

Driven with `/agent-browser` or the host's browser tools; every challenge page with its Browser panel
open (hard rule 4). Before each action: a new tab, and the stored value set as stated (`none` =
`wxl-locale` removed). Each observation reports its surface. The not-found page is identified by
VitePress's `.NotFound` element, as read in VitePress 2.0.0-alpha.16's `NotFound.vue` — an
identification, not a criterion on its wording (0009 retrospective). Fixtures are D119's:
`<zh-only>` is F-1's challenge `zh-only` (#999, only a Traditional Chinese brief) and `<en-only>`
F-1's article `stage8-en-only`, which the build accepts (D20).

| Row | Surface | Action | Stored | Expected (rows) |
|---|---|---|---|---|
| VA1a | Cloudflare Pages preview of `stage8/<ticket-id>` (upstream, no `range.json` → `P = zh-TW`, base `/`) | Cold load `/guide/` | none | Stays; zh-TW page; no line; stored still none (A1) |
| VA1b | same | Cold load `/guide/` | `en` | `/en/guide/` by replace (Back does not return to `/guide/`); stored `en` (A3) |
| VA1c | same, Browser panel open | Cold load `/challenge/<zh-only>/` | `en`; none | `en`: stays, the line in `en` after the session gate's decision, its link opens `/en/challenges` (A4, A30); none: no line (A1) |
| VA1d | same | Cold load `/en/guide/` | none; `zh-TW` | Stays; no line; stored becomes `en` (A5) |
| VA1e | same | Request `/zh-TW/guide/python` | `en` | Server redirect to `/guide/python`, then `/en/guide/python` by the cold-load redirect; stored `en` (A9, D29) — depends on D60's splat rule |
| VA1f | same | Request `/zh-TW/guide/python`, then `/zh-TW/c/001` | none | `/guide/python` and the primary page of 001, zh-TW, no line, stored still none (A9, D30) |
| VA1g | same | Request `/en/c/001` | none | The English page of 001; stored becomes `en` (A9) |
| VA1h | same | Request `/en/challenge/<zh-only>/` | none | Replaced by `/challenge/<zh-only>/`; the line in `en` (A14) |
| VA1i | same | Request `/en/no-such-page` | any | The not-found page; no line; stored unchanged (A17) |
| VA1j | same, Browser panel open | On `/en/challenge/door-is-open/` reached by the switcher from the zh-TW page (stored `en`), store an attack record; close the tab and open the same URL in a new tab (a new tab has an empty `sessionStorage`, so the session gate, which keeps its answer under `wxl-session-gate` there, asks again; `localStorage` and the record are kept); in the gate's dialog choose its clear action | `en` | The clear reloads `/`, which then goes to `/en/` (A33) |
| VA1k | same | Cold load `/guide/python` | none; `en` | none: zh-TW, no line; `en`: `/en/guide/python` (A10) |
| VA1l | same, at 1280, 1024 and 375 wide | On `/guide/`, open the locale switcher and choose English; then on `/challenge/<zh-only>/` (Browser panel open) choose English | `zh-TW` | Only the custom switcher shows (0008 B4); title is the zh-TW label and the one option is English (A22); `/guide/` → `/en/guide/` by push, Back returns (SW07); on `<zh-only>`: stays, the line in `en` at once, the menu then offers the page's own locale, choosing it removes the line (SW08, SW09) |
| VA1m | same | Cold load `/en/<en-only>`, then choose 繁體中文 | `zh-TW` | Cold load: stays, no line, stored `en` (A5); choice: stays, the line in `zh-TW` (SW11). |
| VA2a | F-3, first deploy (created from F-1's pushed head with the packed tarball; its `range.json` has no `primaryLocale` → `P = zh-TW`, R17; base `/<repo>/`) | Request `/<repo>/zh-TW/guide/python` | none | GitHub Pages' 404 response, then replaced by `/<repo>/guide/python`; zh-TW; no line; stored still none (A15, A7) |
| VA2b | same | Same | `en` | Same landing, stays (no cold-load redirect after a not-found redirect); stored `en` (A15, D29) |
| VA2c | same | Request `/<repo>/zh-TW/` and `/<repo>/zh-TW` | none | `/<repo>/` (A15) |
| VA2d | same | Request `/<repo>/zh-TW//evil.example/x` and `/<repo>/zh-TW/%2F%2Fevil.example` | none | The not-found page; the address stays on the range's origin (A18) |
| VA2e | same | Cold load `/<repo>/guide/` | `en` | `/<repo>/en/guide/` (A3, A7) |
| VA2f | same (first deploy) | Request `/<repo>/en/challenge/<zh-only>/` (NT: a translation path without its page) | none | GitHub Pages' 404 response, then replaced by `/<repo>/challenge/<zh-only>/`; the line in `en`; stored still none (A14 on GitHub Pages) |
| VA2g | same (first deploy) | Request `/<repo>/<en-only>` (NU: a primary path without its page) | none | GitHub Pages' 404 response, then replaced by `/<repo>/en/<en-only>`; the line in `zh-TW`; stored still none (A16) |
| VA2h | same (first deploy) | Request `/<repo>/zh-TW/<en-only>` (an old address to a page that exists only in English) | none | Replaced by `/<repo>/en/<en-only>`, the line in `zh-TW` (A39, D28's fall-through) |
| VA2i | F-3, second deploy (`P = en`, base `/<repo>/`) | Cold load `/<repo>/guide/` | `zh-TW` | `/<repo>/zh-TW/guide/` by replace (A3 under `P = en`) |
| VA2j | same (second deploy) | Request `/<repo>/en/guide/` | none | GitHub Pages' 404 response, then replaced by `/<repo>/guide/`; English; no line (A15 under `P = en`) |
| VA2k | same (second deploy) | Request `/<repo>/zh-TW/<en-only>` (NT under `P = en`) | none | Replaced by `/<repo>/<en-only>`; the line in `zh-TW` (A14) |
| VA2l | same (second deploy) | On `/<repo>/guide/` open the locale switcher and choose 繁體中文 | `en` | `/<repo>/zh-TW/guide/` by push; stored `zh-TW`; Back returns (SW rows under `P = en`) |
| VA3a | F-2's Cloudflare Pages preview (`range.json` `{"primaryLocale":"en"}`, base `/`), driven in the Browser panel | Cold load `/guide/` | none | Stays; English; no line (A1 — the 0008 behaviour it replaces sent this learner to `/zh-TW/guide/`) |
| VA3b | same | Cold load `/guide/` | `zh-TW` | `/zh-TW/guide/` (A3) |
| VA3c | same | Cold load `/zh-TW/guide/` | none | Stays; stored becomes `zh-TW` (A5) |
| VA3d | same | Request `/en/guide/` | none | Not-found response (no rule covers it under `P = en`), then replaced by `/guide/`; no line (A15 under `P = en`, on Cloudflare) |
| VA3e | same, Browser panel open | Cold load `/challenge/en-only/` (F-2's English-only #998) | `zh-TW` | Stays; the line in `zh-TW`, link `/zh-TW/challenges` (A4, A30) |
| VA4 | Terminal, F-6 | `git grep -n DEFAULT_VISITING_LOCALE -- .vitepress tests platform`; PAT2; `git grep -L pageLocaleOf -- .vitepress/theme/components/MergedNav.vue .vitepress/theme/components/ChallengeList.vue .vitepress/theme/components/HomeContent.vue .vitepress/theme/components/LocaleSwitcher.vue`; `test -e .vitepress/theme/Layout.vue`; `pnpm test` | — | No output; no output; no output; false; the named unit files pass (A12, A28, B80) |

### Area L

Fixtures: the stage 8 branch's `<zh-only>` challenge (primary-only, `P = zh-TW`, numbered 999,
dated after every other challenge; area A's fixture), never merged (0008 D9/D12). Surfaces named per
row; challenge pages with their Browser panel open (hard rule 4).

| Row | Surface | Action | Stored | Expected (rows) |
|---|---|---|---|---|
| VL1 | Terminal, `curl -s` on the Cloudflare preview of `stage8/<ticket-id>` | Fetch `/challenges`, `/en/challenges`, `/`, `/en/` | — | `/challenges`: CS1 `<h1>` `挑戰`, CS2 subtitle `選一道題目開始`, CS3 `placeholder`, CS4 and CS5 the `value=""` option texts, CS6 the four sort option texts, CS7 the sort-direction `title`, CS8 both view `title`s and CS9 the count suffix equal the zh-TW table values (every CS1–CS9 text recorded, V-16); `/en/challenges`: the English values; `/` and `/en/`: the CH1 strings in each locale (L33) |
| VL2 | Browser panel, same preview | Open `/challenges` and `/en/challenges` in list and grid view; compare each CS1–CS9 text and the dates with VL1's | `zh-TW`; `en` | Identical to VL1 after hydration; dates identical (L26, L33); `/en/challenges` shows `<zh-only>` with mark `Traditional Chinese only`, `lang="zh-TW"` on its title; `/challenges` shows no mark (L27, L28) |
| VL3 | Browser panel, same preview | In `/en/challenges` read `<zh-only>`'s copy control text; click the row | `en` | Text `wxl.browserlab.online/en/c/999` (`SITE_ORIGIN` without the scheme; S53, S63); clicking the row lands on `/challenge/<zh-only>/` (Browser panel open), area A's line in English; stored still `en` (A rows). The short link itself is checked by requesting `/en/c/999` on the preview (V-S3), not by following the copied text |
| VL4 | Browser panel, same preview | `/challenges`: type `zzzz-no-match`; `/`: read stats and latest cards | `zh-TW` | Empty-state text equals the zh-TW table value (L25); stats equal on `/` and `/en/`; `<zh-only>` first among latest cards, marked only on `/en/` (L30) |
| VL5 | Temporary GitHub Pages range from the stage 8 commit (base `/<repo>/`) | Open `/<repo>/en/challenges` and click a row | `en` | Row `href`s start with `/<repo>/` once (L22); page-mode copy text is `SITE_ORIGIN` + entry URL (S54) |
| VL6 | Terminal, the ticket branch | `pnpm docs:build` then the L36 check; `WXL_SMOKE_PAGES=1 pnpm docs:build` then the same check; request `/en/smoke-fixtures/english-only` on the Cloudflare preview | — | First passes, second fails (L36); the preview answers with the not-found page (L34) |
| VL7 | Terminal + Browser panel, `pnpm docs:dev` | Change `difficulty` in `platform/challenge/door-is-open/challenge.yaml` to `hard`, reload `/challenges`; change the zh-TW brief's `title`, reload; revert both | `zh-TW` | Badge `hard`, then the new title, without restarting the dev server (L21); tree clean after revert (`git status --short` empty) |
| VL8 | Terminal + Browser panel, dev server | `pnpm test:challenges`; open `http://localhost:5173/challenge/door-is-open/` with no stored value, Browser panel open | none | Suite passes; path unchanged, `<html lang="zh-TW">`, brief title 知的必要, the Browser panel loads the app (L43) |
| VL9 | F-2's Cloudflare Pages preview (`P = en`): static HTML by `curl -s` in the terminal, hydrated in the Browser panel (V-17) | Fetch, then open, `/zh-TW/challenges` and `/challenges` | `zh-TW`; `en` | F-2's English-only #998 in `/zh-TW/challenges` with mark `只有英文`, `lang="en"`; `/challenges` English, no marks; CS1–CS9 in each locale in the `curl` output and after hydration (L23, L27, L33 under `P = en`) |

### Area S

Throwaway branches F-1 (`stage8/<ticket-id>`, `P = zh-TW`, fixture challenge 999 with only a
Traditional Chinese brief) and F-2 (`stage8/<ticket-id>-en`, `range.json` `{"primaryLocale":"en"}`,
fixture challenge 998 with only an English brief), D119, as 0008 D12 allows. The `-en` branch does
not carry 999, which would be an orphan there. Pushing them, their Cloudflare Pages previews, and a temporary GitHub Pages range
each need the user's approval; all are deleted afterwards with approval. Fixture numbers never enter
`main`.

| Row | Surface | Action | Observed / gate |
|---|---|---|---|
| V-S1 | Terminal, `curl -sI` against the zh-TW-primary preview | S57, S59, S60 | First-hop status and `Location` as the rows state; S60's `/zh-TW`, query, two double-prefix (D138) and `/zh-TW/stage8.txt` results recorded (SC2-06) |
| V-S2 | Terminal, `curl -sI --path-as-is` + `node -e` origin check, zh-TW-primary preview | S61 | Gate: no off-origin `Location` |
| V-S3 | Browser panel (challenge pages with it open), zh-TW-primary preview, new tab per request, stored preference none / `en` / `zh-TW` | Open `/en/c/001`, `/c/001`, `/zh-TW/c/001`, `/en/c/999`, `/en/c/<fixture-slug>` | Derived from D24–D30, D58, D59 and 0008 L1, 0008 C9 (V-18); "stored" is `wxl-locale` afterwards. `/en/c/001`: every preference → `/en/challenge/door-is-open/`, no line, stored `en` (D26; D71, 0008 D6 met). `/c/001` and `/zh-TW/c/001` (S59's numbered rule, not the splat): none → `/challenge/door-is-open/`, no line, stored none; `en` → `/en/challenge/door-is-open/` by the cold-load redirect, no line, stored `en`; `zh-TW` → `/challenge/door-is-open/`, no line, stored `zh-TW`. `/en/c/999` (target `/challenge/zh-only/`, D58's primary fallback): none → stays, no line, stored none; `en` → stays, the line in `en` (no English version), stored `en`; `zh-TW` → stays, no line, stored `zh-TW`. `/en/c/zh-only` (slug rule to `/en/challenge/zh-only/`, which is not a page): every preference → the not-found redirect to `/challenge/zh-only/` with the line in `en`, no cold-load redirect after it, stored unchanged. Any other observation fails the row |
| V-S4 | Terminal + Browser panel, en-primary preview | S62; open `/en/c/998`, `/zh-TW/c/998` | `/zh-TW/c/998` → `/challenge/<fixture>/` (English page, untranslated); no old-address rule |
| V-S5 | Browser panel, both previews, `CF_PAGES=1` builds | S63 short mode | Controls in every list; each copied text is `wxl.browserlab.online/<list locale>/c/NNN` (`SITE_ORIGIN`, not the preview host); each target is checked by requesting the same path on the preview (V-S1, V-S4) |
| V-S6 | Browser panel, temporary GitHub Pages range from `stage8/<ticket-id>` | S63 page mode; cold load `/<repo>/zh-TW/challenges` | Page-mode URLs per S54; the old address reaches `/<repo>/challenges` by the not-found page (routing area's row; observed here because short links do nothing on GitHub Pages) |
| V-S7 | Terminal, a scratch clone of `stage8/<ticket-id>-en` with the hook installed (`pnpm install`) | Stage a zh-TW translation for 998 and commit; then change `primaryLocale` to `zh-TW`, stage and commit | First commit: `_redirects` staged with `/zh/c/998`, `/zh-TW/c/998` at `/zh-TW/challenge/<fixture>/`; second: the S-§4.1 shape with the old-address rule (S39, S41 on a real range, not the test fixture) |

### Area Y

Each observation names its surface. Terminal rows run in a temporary local clone of the ticket
branch in a scratch directory (`pnpm install`, Rust and `wasm-pack` available), on a throwaway branch
never pushed and removed afterwards. Browser rows use the Cloudflare Pages preview of
`stage8/<ticket-id>`, challenge pages with the Browser panel open (AGENTS.md hard rule 4).

| Row | Surface | Action | Observed | Rows |
|---|---|---|---|---|
| V-Y1 | terminal, clone without `range.json` (upstream, `P = zh-TW`) | `pnpm create:challenge --name stage8-decl --backend flask`; `pnpm challenge:validate stage8-decl`; `pnpm challenge:verify stage8-decl --layers L1,L2` | four paths printed, brief first under `platform/zh-TW/`; brief title `未命名題目（stage8-decl）` and the zh-TW TODO body; `challenge.yaml` ends with `wasmModule`; validate all ✓; L1 and L2 pass | Y70, Y74–Y76, Y78, Y83, Y86, Y87 |
| V-Y2 | same clone after `git clean`, with `range.json` `{"primaryLocale":"en"}` | the same `create:challenge` | brief under `platform/en/`, title `Stage8 Decl`, English TODO | Y72, Y76, Y78 |
| V-Y3 | same clone | add `backend: flask` to `platform/en/challenge/door-is-open/index.md`; run `pnpm challenge:validate door-is-open`, `pnpm docs:build`; revert; add `title: x` to its `challenge.yaml`; same two commands; revert | validate ✗ `brief (en)` with VM6, build exits non-zero with `PL-E15: platform/en/challenge/door-is-open/index.md`; then ✗ `declaration` with VM5, build `PL-E16` | Y24, Y14, Y42, Y43 |
| V-Y4 | same clone | `pnpm challenge:retype door-is-open --difficulty hard`; `git status --short` | exactly `platform/challenge/door-is-open/challenge.yaml` modified | Y62 |
| V-Y5 | same clone | `pnpm challenge:keygen` twice; edit a sentence in the en brief of `staff-only`; `pnpm challenge:keygen`; edit `tags` in its `challenge.yaml`; `pnpm challenge:keygen` twice; `git status --short` after the first pair | second run all `[skip]`; brief edit → `[skip] staff-only`; `challenge.yaml` edit → `[stale] staff-only`, then `[skip]`; no `challenge.yaml` modified by keygen alone; when Y55 moved here (its row says why), also `pnpm challenge:keygen --force` then `git diff --exit-code -- platform/challenge/` exits 0, each file byte-identical to Y-§2.4 (V-14) | Y55–Y58 |
| V-Y6 | Browser panel, CF preview | for each of the four challenges open `/challenge/<slug>/` and `/en/challenge/<slug>/` | same badges, number and tabs on both; in Browser, a request to the app's `/` answers 200 on both; Source tab on both for `just-a-preview` and `selected-excerpts`, the latter listing on both exactly the 10 `source_files` entries of Y-§2.4 (`/workspace.py`, `/revisions.py`, `/course_pack.py`, `/templates/base.html`, `/templates/workbench.html`, `/templates/article.html`, `/templates/preview.html`, `/templates/course-pack.html`, `/templates/missing.html`, `/static/app.css`; V-15) | Y39, Y51 |
| V-Y7 | terminal, the clone | `node --experimental-strip-types -e` calling `buildPlayerPackage` for `door-is-open` into a scratch folder (no agent is run) | the package's `description.md` starts `# 知的必要` and holds only that heading and the brief's first paragraph; neither file contains, as a substring, the value of `wasmModule`, `app` or `flag` or any `source_files` entry (Y93) | Y91, Y93 |
| V-Y8 | Browser panel on `pnpm dev` from the clone | open `/challenge/door-is-open/`; change `difficulty` to `hard` in `challenge.yaml`; reload; restart `pnpm dev`; reload | badge `easy` after the first reload; `hard` after the restart | Y101 |

### Area U

Surface named per row. A = the pushed HEAD of the ticket running stage 8 (it must be on GitHub:
codeload serves `CREATE_WXL_COMMIT=<A>` and `git pull`). The tarball is `npm pack` from A. Fixture
commits inside temporary ranges are test fixtures (0006's exception to hard rules 1 and 5). Before:
`git -C <upstream checkout> rev-parse v3.0.0^{commit}` and `v3.1.1^{commit}` recorded.

| Row | Surface | Steps | Expected |
|---|---|---|---|
| V-U1 | terminal (0010-S51) | In an empty directory: `npx --yes create-wxl@3.0.0 rel --author 'Stage Eight' --repo wxl-test/rel --host github-pages --site-name 'Stage Eight Range' </dev/null`. In `rel`: `pnpm install`, then `pnpm create:challenge --name teacher-own` (English only, 3.0.0's script); add `platform/zh-TW/challenge/teacher-own/index.md` copied from the English brief with its `tags` line changed; add `platform/guide/teacher.md`; change one body line of `platform/guide/index.md`; change the English `tags` of `door-is-open`; change one line of `platform/challenges.md` other than the `./shared/` import; commit. Then `CREATE_WXL_COMMIT=<A> npx --yes --package <tarball> create-wxl upgrade`; then `pnpm install && pnpm test --run` (D124) | exit 0; CW-W04; report R1 base `3.0.0` with v3.0.0's commit, target commit A; report R3 includes UP-A16 for `platform/zh-TW/challenge/teacher-own/index.md` `"tags"` and for `platform/zh-TW/challenge/door-is-open/index.md` `"tags"`, no UP-A16 for `selected-excerpts`, and UP-A12 last (other items are not pinned: `rel` is many commits behind A, as in 0006-S2 step 6); report R4 holds the crossing line; report R6 holds, among upstream's own move, declare and strip lines, exactly these teacher lines: `R6: "platform/challenge/teacher-own/index.md" -> "platform/en/challenge/teacher-own/index.md"`, `R6: "platform/challenge/teacher-own/index.md" -> "platform/challenge/teacher-own/challenge.yaml" (declaration)`, `R6: "platform/guide/teacher.md" -> "platform/en/guide/teacher.md"` and `R6: "platform/zh-TW/challenge/teacher-own/index.md" (declaration removed)`, then the primary-locale line last; the count equals the path lines; `range.json` = `{"upstream":{…A…},"primaryLocale":"en"}`; `git diff --cached` empty; `platform/en/guide/index.md` holds the teacher's line; `platform/en/challenges.md` holds the teacher's line and, when A changes its `./shared/` import (the content area's row), that change too; `platform/challenge/teacher-own/challenge.yaml` exists with the English `tags`; no page left outside the locale folders; `pnpm test --run` passes, with the D124 rows reported skipped (the teacher changed door-is-open's `tags`) |
| V-U2 | terminal (0010-S51) | In `rel` after V-U1: `pnpm fork:init --author 'Stage Eight' --repo wxl-test/rel --host github-pages --site-name 'Stage Eight Range'`; `pnpm install && pnpm build`; then `git checkout -- . && git clean -fd` | fork:init exits 0 and leaves both homes' hero names as `Stage Eight Range`; build succeeds (the R12 check passes); after the restore, porcelain status empty and the fixture commit's files |
| V-U3 | Browser panel (0010-S52) | Rerun V-U1's upgrade and V-U2's fork:init and build; `pnpm docs:preview`; open `/`, `/zh-TW/`, `/challenge/teacher-own/` and `/zh-TW/challenge/teacher-own/` with the challenge view open, `/zh-TW/challenge/selected-excerpts/` | `/` is the English home (`primaryLocale` `en`); `/zh-TW/` the Chinese home; both teacher-own pages show the tools of the English declaration; the zh-TW selected-excerpts page's source file list has the 10 English entries (R16); restore afterwards gives an empty status |
| V-U4 | terminal (0010-S51) | In an empty directory: `git clone --branch v3.1.1 https://github.com/<upstream>.git fork`; in `fork`: `pnpm fork:init --author 'Stage Eight' --repo wxl-test/fork --host cloudflare-pages --origin https://fork.example.pages.dev`; add `platform/guide/teacher.md`; commit (no `range.json`). (a) `CREATE_WXL_COMMIT=<A> npx --yes --package <tarball> create-wxl upgrade --from 3.1.1`; then `pnpm install && pnpm build`; restore. (b) Instead, `git pull --no-rebase <upstream URL> <A's branch>`; if the merge stops, record the conflicting paths, resolve each in favour of A (`git checkout --theirs -- <path>`) except the fork's own files (`platform/guide/teacher.md`, `create-wxl/`, `.proj.specs/`), `git add` them and commit; then `pnpm build`; then follow README's move section (B84) by hand from step 2, including `range.json` `{"primaryLocale":"en"}`; `pnpm build` again; restore. (c) From the same fork commit, without pulling upstream's pages: check out every path of A outside `platform/`, then A's `platform/shared/` and `platform/public/` (`git checkout <A> -- . ':!platform' && git checkout <A> -- platform/shared platform/public`), which stands in for README step 1; then follow README steps 2–8 literally (V-2), including its home-link and `:lists` steps on the fork's own `platform/index.md`, `platform/zh-TW/index.md`, `platform/challenges.md` and `platform/zh-TW/challenges.md`; `pnpm install && pnpm build` | (a) exit 0; report R1 base `3.1.1` with v3.1.1's commit; report R6 lists `platform/guide/teacher.md -> platform/en/guide/teacher.md` among the moves; `range.json` created as `{"upstream":{…A…},"primaryLocale":"en"}`; the fork's own `create-wxl/` and `.proj.specs/` untouched (P-2); build succeeds; restore gives an empty status. (b) the conflicting paths are recorded (not judged); the first build exits non-zero with stderr holding the PL-E08 first line and naming README's move section, listing `"platform/guide/teacher.md"` unless git's directory-rename detection already moved it to `platform/en/guide/teacher.md` (recorded which; either is accepted, V-19); after the manual steps the build succeeds; restore gives an empty status. (c) the build succeeds with no PL line, `dist/index.html` is English, and both list pages show the four challenges (the README's steps alone suffice) |
| V-U5 | terminal (0010-S51) | In an empty directory: `git clone --branch v3.1.1 https://github.com/<upstream>.git fork0`; in `fork0`: `pnpm fork:init --author 'Stage Eight' --repo wxl-test/fork0 --host cloudflare-pages --origin https://fork0.example.pages.dev`; commit (no page of its own, no `range.json`); `git pull --no-rebase <upstream URL> <A's branch>` (git follows the renames; resolve as V-U4 (b) if it stops); `pnpm install && pnpm build`; then add `range.json` `{"primaryLocale":"en"}`, `pnpm build` again | First build: exit 0, no PL line, and `.vitepress/dist/index.html` has `lang="zh-TW"`: the fork's root silently became Traditional Chinese (R17), accepted and stated in B84 step 7 and B89; second build: `dist/index.html` has `lang="en-US"` |

Not run (R31): `pnpm range:upgrade` through the registry; it is checked after the next release
together with 0005's `npm create` check (OQ-021). The temporary ranges are deleted after the run.

## Integration notes

This file was integrated from six area fragments written in parallel (B, A, L, S, Y, U). Row ids keep
their fragment prefix and number; rows removed as duplicates leave a gap, and rows added in
integration are numbered after the fragment's last row. Decisions and seams were renumbered (D1–D121,
0010-S1–0010-S52); the "Was" column of each table keeps the fragment id.

### Conflicts resolved

| # | Conflict | Resolution |
|---|---|---|
| N1 | Build-time codes: area B defined PL-E01–PL-E12, area Y a provisional BD-01–BD-06, areas S and Y cited "the R19 code" | One family (D113): Y's codes are PL-E13–PL-E18 with the `PL-Exx: ` first-line form; every "R19 code" is PL-E01–PL-E06. Y-O1 closed. |
| N2 | `readPrimaryLocale(path)` (B) versus a reader of the index's text that the hook needs (S) | Split into `parsePrimaryLocale(text \| undefined)` and `readPrimaryLocale(path)`, with the index-entry rule (D114). |
| N3 | One loader exporting `Record<Locale, …>` (L-D4 → D40) versus "loader file names unchanged" (B-D14) and B's loader rows | D40 kept; D14 rewritten (every list and home page imports `../shared/challenges.data.ts`); B53–B55 removed (covered by L1–L3, L19 and D39); B79 rewritten; B-S8 merged into 0010-S17; L-O1 and B-O6 closed. |
| N4 | How R29's fixture pages reach a test build: a test-only tree with its own `range.json` (B-O9) versus `WXL_SMOKE_PAGES=1` and reserved `smoke-fixtures/` folders (L-D14 → D49) | D49 kept; it never changes `P`, so D21 holds. |
| N5 | Whether translation-only articles build (A-O2) and whether a not-found primary path redirects to the translation (A-O1) | They build (D20); D27 keeps 0008 C2's two-locale form. Translation-only challenge briefs are not listed (D38) and are refused by validate and the hook (VM10, D64). |
| N6 | `.vitepress/theme/Layout.vue` deleted in two areas (B-D15, AD12) | One decision, D15; A38 removed (B80 covers it). |
| N7 | The copy control decided in two areas (L-D12, SD5) | One decision, D48; L29 removed (S53, S54 cover it). |
| N8 | Hero links decided in two areas (B-D13, L-D13) | D13; L-D13 removed. |
| N9 | Legacy-layout pages in validate: its own VM11 message (Y-YD9) versus "every tool runs the layout check first" (B-D19) | The `challenge:validate` command runs `checkSourceLayout` first (D19) and reports PL-E08; VM11 removed; Y34 rewritten; D81 rewritten. The generator's `--staged` mode does not run the working-tree check; `briefFaults` reports old-layout paths from the index (D69, W6d with PL-E08's builder). S-O4 closed. |
| N10 | Display names for tool messages had no owner (S-O3) | `LOCALE_ENGLISH_NAMES` in the locale list module (D115). |
| N11 | B-D4 named an "area D" for fork:init's copy of the locale list | No fork:init copy in this epic: fork:init reads no locale until 0011's `--primary-locale`. create-wxl's copy is D112; the hook delegates to Node (D65). |
| N12 | The page predicate of the upgrade's move (U, `platform/shared/x.md` a legacy page) versus the build's excluded areas (B) (U-O1) | One predicate (D116): `platform/shared/**`, dot-prefixed, `node_modules/` and `dist/` are excluded everywhere; U11's expected value for `platform/shared/x.md` is now "no"; U136 tests create-wxl's copy against the site's. |
| N13 | R12's "a challenge directory holds only `src/` and `challenge.yaml`" had no enforcer (B-O7, U-O3) | Validate's `structure` check (D117, VM13, Y103); the build and the move stay as they are. |
| N14 | The hook ran validation first, so most of S44's faults would end in validation's refusal, not in W6 (S-O8, S-O9, Y-O8) | D121: S44 now observes faults already in `HEAD`; new S73 observes staged faults refused by validation. |
| N15 | R22's splat may be an open redirect (S-O1) | R22 kept as written; S61 is a gate; the safe-by-construction fallback goes to the user only if S61 fails (D118). |
| N16 | An upgraded `en` range would receive upstream's `zh-TW`-shaped `_redirects` through the merge (S-O5) | D120 adds a report R4 line in a crossing run; the hook and `pnpm build` regenerate the file anyway. New row U138. |
| N17 | `primaryLocale: "en"` written whenever the upgrade moves a range (GLOSSARY 設定紀錄, 搬家 working-tree wording) versus only in a crossing run (UD15 → D105, U-O2) | D105 kept, narrowed in the self-check to a crossing run that moves the teacher's range: writing `en` into a range made from a new-layout release that only left a page in the old place, or into one the teacher moved by hand, would flip its root locale. **The working-tree `GLOSSARY.md` must change** (row U135). Requoted in revision 2 from blob `b307335` (C-16, K-3): 設定紀錄's 「從舊版面的上游版本升級而搬家、而且還沒有記主語系的靶場，會記成英文」 already states D105; 搬家's 「經由升級搬家、而且還沒記主語系的靶場記成英文」 must say the range was upgraded from a legacy-layout upstream version (for example 「還在舊版面、從舊版面的上游版本升級、而且還沒記主語系的靶場，搬家時會記成英文」). Both land with T4 (B90, K-9). |
| N18 | Dev server and `challenge.yaml`: the list follows an edit on reload (L21, VL7) while the challenge page needs a restart (D87, Y101, V-Y8) | Both hold: the loader watches `challenge.yaml`, page data does not. The documents state both (Y98, B85). |
| N19 | Stage 8 fixtures differed per area (A `<zh-only>`, `<en-only>`; L #999; S #999 and #998; Y `stage8-decl`; U `rel`, `fork`) | One set, F-1–F-6 (D119). |
| N20 | Upstream's flag-exposure check (YD16) was optional new scope | Deferred: Out of Scope, with an open question (B88); Y102 removed. |
| N21 | Id collisions: 0008's A/B/C/L/W/D rows, 0007's H/O/W rows, 0006's M/U/B rows and this spec's B/L/S rows; L's canonical strings S1–S13/H1–H3; Y's messages M1–M12, K1, C1, R1, V1, L1, P1; U's split checks S1–S6 and range checks C1–C6; B's contracts C1–C18 | Other specs' ids carry the spec number; L's strings are CS1–CS13 and CH1–CH3; Y's messages are VM1–VM10 and VM12–VM15 (VM11 retired, VM14 and VM15 added in the self-check), KG1, CC1, RT1, VF1, LS1, PP1; L's warning is LW1; U's checks are SC1–SC6 and RC1–RC6; B's contracts are BC1–BC19 (BC19 added in the self-check). |
| N22 | Documents no fragment owned: README's move section, the cost of changing `P` later (Q18), ADR-0008's consequence 2 (BC12), the open questions, the release-note input (R20), the GLOSSARY landing | New rows B84–B90. |

### Fragment open issues

| Id | Resolution |
|---|---|
| B-O1 | Kept PL-E11; V-B1 measures its premise. |
| B-O2 | No `en`-primary CI build in this epic; unit rows and stage 8 cover it (V-B7 runs the suites in an `en` range); recorded as an open question (B88); a future leg builds a fixture copy with its own `range.json` (D136). |
| B-O3 | B84 adopts the README headings PL-E08 names. |
| B-O4 | D19 constrains areas S and Y; their rows cite B38. |
| B-O5 | The site `description` stays English on Traditional Chinese pages; Out of Scope. |
| B-O6 | Superseded by D40 (N3). |
| B-O7 | D117 (N13). |
| B-O8 | A page whose URL starts with a short-link form (`/c/`, `/<L>/c/`, `/zh/c/`) is shadowed by the rules on Cloudflare, whichever locale folder holds it: under `P = zh-TW` that includes `platform/zh-TW/c/…` and `platform/zh-TW/zh/c/…` (`zh` is not on the locale list, so PL-E09 does not fire, R-15); pre-existing; Out of Scope. |
| B-O9 | Superseded by D49 (N4). |
| B-O10 | `platform/<L>/challenge/<slug>/` may hold files beside `index.md` (images the brief uses); no rule. |
| B-O11 | Accepted. |
| A-O1, A-O2 | N5. |
| A-O3 | D29 and D30 accepted (new, approved); documented by A34, A35 and the release-note input (B89). |
| A-O4 | No mirror `/en/*` rule for `P = en` (R22 is `zh-TW` only); D28's strip works on every host. |
| A-O5 | Restated in revision 2 (C-6, D124): upstream's CI smoke builds upstream (`P = zh-TW`), and every range's CI runs the same suite on its own tree (the `site-smoke` job is not gated on the repository); D54 and D124 make it pass there, and V-B7 observes it in an `en` range. `P = en` is otherwise unit and stage 8. |
| A-O6 | Covered by D44 and D47. |
| A-O7 | Accepted (D31). |
| A-O8 | Accepted: the line's link is not gated on the page list. |
| L-O1 | N3. |
| L-O2 | D47 accepted (new, approved). |
| L-O3 | The interface word 挑戰 stays; recorded as an open question (B88); Out of Scope. |
| L-O4 | Accepted with D77; the release-note input names it (B89). |
| L-O5 | Residual ICU skew; VL1 and VL2 observe it. |
| L-O6 | D85: the L4 package reads the primary brief, the page the default URL opens. |
| L-O7, L-O8 | Accepted. |
| S-O1 | N15. |
| S-O2 | D71 accepted and documented (S69). |
| S-O3 | N10. |
| S-O4 | N9. |
| S-O5 | N16. |
| S-O6 | No generalised old-address rule in this epic. |
| S-O7 | S69's README passage states that `platform/public/zh-TW/…` files are redirected on a `zh-TW`-primary range. |
| S-O8, S-O9 | N14. |
| S-O10 | Recorded at stage 8 (S60), not pinned. |
| Y-O1 | N1. |
| Y-O2 | D77 with D41. |
| Y-O3 | D74's closed brief key set accepted (new, approved). |
| Y-O4 | D83's Traditional Chinese default title accepted (new, approved). |
| Y-O5 | Stage 5 measures keygen's convergence before writing Y58's test; if (b) cannot hold, the ticket stops for the user (D133). |
| Y-O6 | Unknown declaration keys pass; accepted. |
| Y-O7 | N20. |
| Y-O8 | N14. |
| Y-O9 | D63. |
| Y-O10 | D95 and U24 confirm the line-preserving transform; Y55 guards keygen. |
| Y-O11 | `create:challenge` does not check `.archive/`; unchanged. |
| Y-O12 | `processChallengeFrontmatter` and `detectLegacyFields` are kept, re-pointed. |
| U-O1 | N12. |
| U-O2 | N17. |
| U-O3 | N13. |
| U-O4 | Superseded in the self-check: the test picks its compared tree itself (the oldest new-layout `v*` tag once one exists, else the working tree, D108), so no release ticket switches it. |
| U-O5 | No UP-I02 (D109). |
| U-O6 | D97–D100 accepted (new, approved). |
| U-O7 | T9. |
| U-O8 | fork:init's A7 with a deleted home page (either locale) is epic 0011's; until then U145 pins today's refusal and the READMEs say a range that reruns fork:init keeps both home pages (B86). |
| U-O9 | B84 and PL-E08. |

### Items for the user

Every new decision is approved under the standing authorization of 2026-11-15 and listed here so the
user can see them: D113–D121 (integration), and the fragment decisions whose source says "new". Two
need a look before stage 3 because they touch work outside these two files: **N17** (one GLOSSARY
sentence in the working-tree edit, 搬家's, must change; it lands with T4 together with 設定紀錄's
sentence, which already states D105 (B90); until then the Vocabulary and U-§1 state that D105
supersedes it; SC2-04) and **N15** (R22's rule may need the fallback after stage 8).

Three places realise a stage 1 decision more narrowly than its wording, each with its reason:

- **R23** says fork:init's engine keeps a literal copy of the locale list. This epic keeps none
  (N11): fork:init reads no locale until epic 0011's `--primary-locale`, so a copy would be dead code
  and an equality test with nothing to protect; create-wxl's copy is D112. Epic 0011 adds fork:init's.
- **R12** says `platform/challenge/<slug>/` holds only `src/` and `challenge.yaml`, read as a build
  failure. This epic fails only pages there in the build (PL-E08) and every other stray entry in
  `challenge:validate` (VM13, D117): failing the build on non-page files would break every moved range
  that keeps images beside its brief (D101) until the teacher moves them; CI's validate still names
  them.
- **R6** says no locale folder off the list may exist (GLOSSARY 語系清單 「靶場裡也不能有清單以外的語系資料夾」).
  The build fails only when such a folder holds a page (PL-E08, D6), and names the page, not the
  locale; a folder of images builds. B90 softens the GLOSSARY sentence to 「清單以外的資料夾裡不能有頁面」.

New decisions of revision 2 (round 1's disposition, approved under the same standing authorization,
recommended by the agent; each listed with its finding in `review/disposition.md`): D122 (commit-time
validation reads the index's `range.json`), D123 (every tool reads `range.json` first), D124 (rows on
upstream's own content are upstream-only), D125 (the move checks the translation briefs it must
strip), D126 (the hook triggers only on listed locales), D127 (only `index.md` is a brief), D128
(other components' SSR strings out of scope), D129 (declaration YAML rules), D130 (equality exceptions
need the user), D131 (LW1 once per instance), D132 (what a locale enumeration is), D133 (keygen
convergence failure stops the ticket), D134 (T-0060 becomes `done` when its replacement lands), D135
(skill trees change alike), D136 (a future `en` CI leg uses a fixture), D137 (the zh-TW scaffold body,
see below), D138 (double prefixes diverge by host), D139 (the move reads only regular
files), D140 (build messages quote as create-wxl does), D141 (a protocol-relative home link fails). The revision 2 self-check changes D67, D121, D122,
D124, D125, D129 and D134–D141 in place (each still approved under the same standing authorization)
and adds D142 (a read or git failure in 8a ends the run at once, with no UP-E14 line); D137's body is
now `TODO：在這裡寫說明頁內文。`.
As `docs/agents/workflow.md` requires (K-8), each new or changed D-number of this spec, these
included, is shown to the user as a short decision summary and confirmed before it is implemented;
stage 4's breakdown names, per ticket, the D-numbers to confirm. N17 now concerns one sentence, 搬家's
(設定紀錄's working-tree sentence already states D105).

New decisions of the self-check (approved under the same standing authorization, recommended by the
agent): D105 narrowed to a crossing run that moves the teacher's range; D28's fall-through to the
translation for an old address whose page exists only there (A39); D40's LW1 warning for the renamed
prop; D44's `subtitle` key instead of `description`; `number` bounded to safe integers (Y-§2.2,
S75, Y104); `create:challenge` runs the layout check (D82, Y105); D108's test choosing its compared
tree and base tag itself; base-side UP-E14 lines without the token's sentence (U-§4).

## Acceptance criteria index

Every row reaches at least one AC below; the rows listed after the table reach two, and each AC
judges the part of the row it names. Every AC cites rows. The spec states each criterion in
full. Claim-ready: stage 4's claim table maps each AC id (and through it, each row) to one ticket.

| AC | Area | Rows |
|---|---|---|
| AC-1 | B | B1–B16, B95 |
| AC-2 | B | B17–B19 |
| AC-3 | B | B20–B38, B91 |
| AC-4 | B | B39–B49 |
| AC-5 | B | B50–B52 |
| AC-6 | B | B56–B61 |
| AC-7 | B | B62–B70, B92, B94 |
| AC-8 | B | B71–B79 |
| AC-9 | B | B80–B83 |
| AC-10 | B | B84–B90 |
| AC-11 | A | A1–A10, DT01–DT80 |
| AC-12 | A | A11–A13 |
| AC-13 | A | A14–A20, A39 |
| AC-14 | A | A21–A24, SW01–SW16 |
| AC-15 | A | A25 |
| AC-16 | A | A26–A29 |
| AC-17 | A | A30–A32 |
| AC-18 | A | A33 |
| AC-19 | A | A34–A37 |
| AC-20 | L | L1–L18 |
| AC-21 | L | L19–L22 |
| AC-22 | L | L23–L28, L30–L33, L45, L46 |
| AC-23 | L | L34–L39, L47 |
| AC-24 | L | L40–L42 |
| AC-25 | L | L43 |
| AC-26 | L | L44 |
| AC-27 | S | S1–S11 |
| AC-28 | S | S12–S21, S75 |
| AC-29 | S | S22–S27 |
| AC-30 | S | S28–S35 |
| AC-31 | S | S36–S49, S73, S74, S76–S80 |
| AC-32 | S | S50, S51 (only if stage 4 takes T-0058 / T-0059, T7) |
| AC-33 | S | S52–S56 |
| AC-34 | S | S64–S72 |
| AC-35 | Y | Y1–Y21, Y104, Y112 |
| AC-36 | Y | Y22–Y37, Y103 |
| AC-37 | Y | Y38–Y48, Y106, Y113 |
| AC-38 | Y | Y49–Y51 |
| AC-39 | Y | Y52–Y61, Y107 |
| AC-40 | Y | Y62–Y69, Y108 |
| AC-41 | Y | Y70–Y85, Y105 |
| AC-42 | Y | Y86–Y93, Y109–Y111 |
| AC-43 | Y | Y94–Y101 |
| AC-44 | U | U1–U9, U11, U151 |
| AC-45 | U | U20–U24, U26, U27, U30, U31, U146, U150 |
| AC-46 | U | U40–U49 |
| AC-47 | U | U10, U12, U25, U27–U29, U50–U63, U144, U148, U153, U154 |
| AC-48 | U | U32, U70–U85, U149 |
| AC-49 | U | U2, U3, U9, U90–U94, U140, U143, U151 |
| AC-50 | U | U48, U64, U100–U108, U138 |
| AC-51 | U | U13, U110–U116, U145, U152 |
| AC-52 | U | U82, U94, U120–U124 |
| AC-53 | U | U130–U134, U136, U139, U142, U147 |
| AC-54 | U | U135, U137 |
| AC-55 | B (stage 8) | V-B1–V-B6 |
| AC-56 | A (stage 8) | VA1a–VA1m, VA2a–VA2l, VA3a–VA3e, VA4 |
| AC-57 | L (stage 8) | VL1–VL9 |
| AC-58 | S (stage 8) | S57–S63, V-S1–V-S7 |
| AC-59 | Y (stage 8) | V-Y1–V-Y8 |
| AC-60 | U (stage 8) | V-U1–V-U5 |
| AC-61 | B (and stage 8) | B93, V-B7 |

Rows that appear under two ACs: U2, U3, U9 and U151 (AC-44 for the move, AC-49 for `range.json`), U27 (AC-45
and AC-47), U48 (AC-46 and AC-50), U82 and U94 (AC-48/AC-49 and AC-52), as area U's fragment
assigned them; and the DT and SW rows: DT17–DT40 and DT57–DT80 (the not-found rows) reach AC-11 for
the cold-load outcome (redirect or stay, line, write) and AC-13 through A14–A17 for the lookup's
target and requested locale; SW01–SW16 reach AC-14 directly and through A21, one judgement. Each AC
judges the part of the row it names. Rows removed in integration (B53–B55, A38, L29, Y102) reach no AC; see
"Integration notes".

Claim-ready list: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12,
AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-20, AC-21, AC-22, AC-23, AC-24, AC-25, AC-26,
AC-27, AC-28, AC-29, AC-30, AC-31, AC-32, AC-33, AC-34, AC-35, AC-36, AC-37, AC-38, AC-39, AC-40,
AC-41, AC-42, AC-43, AC-44, AC-45, AC-46, AC-47, AC-48, AC-49, AC-50, AC-51, AC-52, AC-53, AC-54,
AC-55, AC-56, AC-57, AC-58, AC-59, AC-60, AC-61.

## Checks on this revision

Each new guarantee was checked against the existing rules for mutual exclusion (global rule 5).

- **D20 (no build requirement for a primary version) against Q2 and D38, D64, D86.** Q2 is enforced
  for challenge briefs by validate (VM10), the hook and CI (D64); articles may exist in one
  translation only, which R29's fixture needs (D49). The lists omit orphan briefs (D38), adding no
  second refusal.
- **D25 (no default visiting locale) against 0008 L1.** With the requested locale equal to the page
  locale, L1 is false; only a not-found redirect carries another (D27).
- **D28 (strip `/<P>/`) against 0008 C9 and D60.** One not-found redirect per arrival; on Cloudflare
  the server rule answers first, on GitHub Pages the strip does (D29 accepts the divergence).
- **D49 (fixtures) against D21, D6, D52.** The flag never changes `P`; `smoke-fixtures` is not a
  locale name, so PL-E09 does not fire; the completeness test uses the production predicate.
- **D58 (direct targets) against D60.** `/zh-TW/c/` rules never target `/zh-TW/…` pages on a
  `zh-TW`-primary range, so no rule hops through the old-address rule; S59 checks the precedence.
- **D64 and D121 against D86.** Validation runs first; `briefFaults` sees only what validation could
  not; both exit 1 with nothing changed.
- **D74 (closed brief keys) against D95 (move output).** The move writes only `title`, `description`,
  `layout` to a brief; every other key goes to `challenge.yaml`, whose key set stays open.
- **D80 (keygen writes only on change) against D108 (upstream = transform).** A build leaves the four
  upstream `challenge.yaml` files byte-identical, so U130 holds after `pnpm build`.
- **D105 (`en` only in a crossing run that moves the teacher's range) against Q12, R17, R18.** The
  teacher's value is never overwritten; a range that already builds under the new layout is not
  moved, so it keeps its root locale; the GLOSSARY sentences change (N17).
- **D107 (anchors) against D22.** `config.mts` keeps one 0003 A6 line and one 0003 A9 line; a
  crossing run reports UP-A12, which R24 accepts and D106 explains.
- **D113 (one code family) against 0006's codes.** PL codes are the site build's; UP codes stay the
  upgrade's; no code is reused.
- **D117 (structure) against D101 (move keeps non-pages) and keygen.** `runtime.wasm` is written under
  `platform/public/`, never in the challenge directory; a stray file after a move fails validate, not
  the upgrade.
- **D118 (gate) against R22.** The rule is written as R22 says; the gate adds a check, not a change.
- **D120 (report line) against 0006 AC-10 and U108.** Only crossing runs print it; every other report
  is unchanged.
- **T1–T9 against each other.** No cycle: pure modules (T3) and `planLayoutMove` (T2) before or with
  the switch (T1); the reference page (T5) and the upgrade's move (T4) after it.

## Checks on revision 1

The self-check of 2026-11-15 ran three lenses (surface, acceptance criteria, contracts) over revision
1. Ids repeat across lenses, so each is cited with its lens. Every finding is listed with its
disposition; "applied" names where. New guarantees were checked for mutual exclusion first (below the
table). New rows are numbered after each area's last row (B91–B92, A39, L45–L47, S74–S75,
Y104–Y106, U139–U148, VA2f–VA2l, V-U5); U141 is not used.

| Finding | Disposition |
|---|---|
| surface SC-01 (P0) | Applied: D108 and U130–U132 decide "upstream" with `upstreamDecision.ts`; U139 (skipped in a range or fork, tag present or absent); AC-53. |
| surface SC-02 (P0) | Applied: D98 and U-§1 ("declared slug", "orphan translation brief (move)", the transform) leave translation briefs of declared slugs untouched; `orphan-brief` sentence; U3, U28, U146; AC-45. |
| surface SC-03 (P1) | Applied: D105 appends `en` only in a crossing run that moves the teacher's range; U2, U104, U-§1 table header, report R6, "`range.json` after the plan", N17, U135, B3; AC-49, AC-54. |
| surface SC-04 (P1) | Applied (acceptance option): U140 pins the outcome (exit 0, kept `zh-TW`, VM10 afterwards); U137's README sentence; AC-49. No new report line. |
| surface SC-05 (P1) | Applied: B84 step 7, B89, V-U5 (fork without own pages builds `zh-TW` at the root); F-5; AC-10, AC-60. |
| surface SC-06 (P1) | Applied, option (b): D40 and L-§4.4 LW1 warning, L32, L45; LH5, B84, B89; AC-22. |
| surface SC-07 (P1) | Applied: B84's eight ordered steps (merge first, `../shared/challenges.data.ts`, `:lists`, home links without `/zh-TW`); V-U4 (c), README-only; AC-10, AC-60. |
| surface SC-08 (P1) | Applied: BC19, D20, B87 (second dated note), B90 (主語系, 翻譯); spec Build bullet; AC-10. |
| surface SC-09 (P1) | Applied: "orphan" removed from S53, S-§4.6 and AC-33. |
| surface SC-10 (P1) | Applied: S41 on a fully translated fixture; S74 (switching `P` with an untranslated challenge → 0007 O4, W6a); B85; AC-31. |
| surface SC-11 (P1) | Applied: T9 names `quality-gates.yml` `test` and `fork-init-cross-os` and `release.yml` `release` with `fetch-depth: 0`; U142. |
| surface SC-12 (P1) | Applied: F-3 is created with `npx --yes <tarball>` packed from F-1's pushed head and `CREATE_WXL_COMMIT`; D119. |
| surface SC-13 (P1) | Applied: VA2f–VA2h (GitHub Pages, missing translation both ways, old address to an English-only page), VA2i–VA2l (F-3 second deploy, `P = en`), VA3a–VA3e moved to F-2's Cloudflare preview; AC-56. |
| surface SC-14 (P1) | Applied: every stale label replaced by an existing heading or row (A36, L44, D46's H rows, "Stage 8 plan › Area B/U", "Trust boundaries › Area U", 0010-S45, A-§4.3, S53–S54); AC-19, AC-26. |
| surface SC-15 (P1) | Applied: S-§4.7 gives `IndexTrees`, `BriefFault`, `indexTrees` and a JSON example; D64. |
| surface SC-16 (P1) | Applied: D64 (`missing-primary` per slug, `missing-declaration` per brief, `old-layout` per path), S-§4.5 sort (slug, kind, path), S35 counts; AC-30. |
| surface SC-17 (P2) | Applied: 15 → 14 ("Source path → URL"; checked with `git ls-files` at `65de8c0`). |
| surface SC-18 (P2) | Applied: the report example shows an elision line and says the primary-locale line is not counted. |
| surface SC-19 (P2) | Applied: S62 uses 998. |
| surface SC-20 (P2) | Applied: a base-side UP-E14 line is the head and the base remedy only; example line; U60. |
| surface SC-21 (P2) | Applied: U147 runs `planLayoutMove` on `v3.0.0`, `v3.1.0`, `v3.1.1` (checked read-only at `65de8c0`: only selected-excerpts' `source_files` differs); AC-53. |
| surface SC-22 (P2) | Applied (variant): D108's test picks its compared tree itself (oldest new-layout `v*` tag once one exists, else the working tree), so later edits never break it and no release ticket switches it; U-O4 superseded; Further Notes. |
| surface SC-23 (P2) | Applied: U-§4 "Discovery" walk and gitlink scan skip exactly the excluded areas and locale folder paths; D116; U144. |
| surface SC-24 (P2) | Applied: D13 closes the fields (`hero.actions[*].link`, `features[*].link`) and keeps PL-E12 for a translation home's link to a missing page; B67, B92, B84, B86, PL-E12 example; AC-7. |
| surface SC-25 (P2) | Applied: D49 puts `isSmokeFixturePage` and every literal in node-only modules; L47; AC-23. |
| surface SC-26 (P2) | Applied: K4 reworded for a challenge without a primary-locale page. |
| surface SC-27 (P2) | Applied: Comments (A36) row gains `localStorageKeys.ts`, `useSessionGate.ts`, `theme/index.ts` and `MergedNav`'s example (each read at `65de8c0`). |
| surface SC-28 (P2) | Applied, first option: D28 falls through to D27's primary-path rule on the stripped path; D29, TA1, TB4; A17, A39, the DT note, VA2h; AC-13. |
| surface SC-29 (P2) | Applied: Y-§2.1 says the grammar is enforced only by `create:challenge` (and the generator if T-0059 is taken), citing D39, L10, TB6. |
| surface SC-30 (P2) | Applied: Y-§2.2 bounds `number` with `Number.isSafeInteger`; S75, Y104; AC-28, AC-35. |
| surface SC-31 (P2) | Applied: vocabulary "searched area", B91 (`platform` a link); TypeScript schemas and examples for `planLayoutMove`'s input (U-§1) and `mergeLocaleChallenges`' input (L-§4.3). |
| surface SC-32 (P2) | Applied: Area Y row says "Kept, re-pointed". |
| surface SC-33 (P2) | Applied: the constraint now covers the commands that write the tree and the hook's own refusals, and names what the hook does not check. |
| surface SC-34 (P2) | Applied: the subtitle key is `subtitle` (D44, CS2); L46 pins the site-level meta description. |
| surface SC-35 (P2) | Applied: D22 and B60 both cite `A6_CANDIDATE_RE` (`/^ {2}title: .+,\r?$/`, read in `scripts/fork-init.ts`). |
| surface SC-36 (P2) | Applied: the AC index says "at least one" and lists the DT and SW rows with the part each AC judges. |
| ac SC-01 (P1) | Applied: AC-3, B37, B38 and V-B5 distinguish VitePress commands (stderr contains the line) from direct `node` tool runs (first line, nothing processed). |
| ac SC-02 (P1) | Applied: A18 uses `/<P>/%E0%A4%A` and states the `URIError` case. |
| ac SC-03 (P1) | Applied with surface SC-14: AC-19, A36, AC-26, L44. |
| ac SC-04 (P2) | Applied: L23, S63, S64 (D57–D61), U59 (SC2), the B-matrix intro, the transform (0010-S45), T4 and the Area U contracts. |
| ac SC-05 (P1) | Applied: U-§5 fixes the exception list; AC-53 "equals U-§5 at the close-out; a path outside it that differs fails". |
| ac SC-06 (P1) | Applied: S59 is recorded, not a gate, and no longer points at D118; AC-58 makes S61 the only gate. |
| ac SC-07 (P1) | Applied: VL3, S63, V-S5 expect `wxl.browserlab.online/…` and check targets on the preview; stage 8 preamble; AC-57, AC-58. |
| ac SC-08 (P1) | Applied with surface SC-12. |
| ac SC-09 (P1) | Applied: the Stops header covers the token rows; U52, U56 (NFD), U62, U63 have their own outcomes; AC-47. |
| ac SC-10 (P1) | Applied: U-§1 "legacy page" is a page outside every locale folder path. |
| ac SC-11 (P1) | Applied, first option: V-B1 adds PL-E13, PL-E14, PL-E17, PL-E18 (PL-E15, PL-E16 are V-Y3's); AC-55. |
| ac SC-12 (P2) | Applied: Y39 observes the `wasmModule` response and the Browser panel's enabled address input (read in `ChallengeLayout.vue`, `BrowserPanel.vue`); AC-37. |
| ac SC-13 (P2) | Applied with surface SC-19. |
| ac SC-14 (P2) | Applied, second option: S56 asserts page mode only; short mode stays with S53 and V-S5. |
| ac SC-15 (P2) | Applied: V-B1's Observed column gives each case its own outcome. |
| ac SC-16 (P2) | Applied: V-B6 runs wholly in F-6. |
| ac SC-17 (P2) | Applied: B22's case variants use their own fixture trees, skipped with a reason if they would still collide. |
| ac SC-18 (P2) | Applied: B10 phrased as `JSON.stringify(value)` with the characters spelled out. |
| ac SC-19 (P2) | Applied: B9 and the schema table write whole files. |
| ac SC-20 (P2) | Applied: B14 enumerates 16 environments; AC-1. |
| ac SC-21 (P2) | Applied: B15's AC is V-B6's observations; B76 cites B84's authoring paragraph; AC-1 cites V-B6. |
| ac SC-22 (P2) | Applied with surface SC-36. |
| ac SC-23 (P2) | Applied: U4 compares with 0006's existing expected report. |
| ac SC-24 (P2) | Applied with surface SC-23. |
| ac SC-25 (P2) | Applied: AC-30 names S30's three shapes; AC-31 names S-§4.5's texts and S47. |
| ac SC-26 (P2) | Applied: AC-32 states the exit when stage 4 declines. |
| ac SC-27 (P2) | Applied: A28 and VA4 grep any `localeIndex.value` comparison and require the `pageLocaleOf` import. |
| ac SC-28 (P2) | Applied: V-U4 (b) states the merge procedure and its outcome. |
| ac SC-29 (P2) | Applied: V-U1 lists the four teacher R6 lines. |
| ac SC-30 (P2) | Applied: VA1j names the new tab (empty `sessionStorage`, key `wxl-session-gate`, read in `useSessionGate.ts`). |
| ac SC-31 (P2) | Applied: Y40 is unit (0010-S33 and the 0010-S9 command on a copy) plus V-B1; Y55 is decided as unit on a temporary copy, moving to V-Y5 only if `wasm-pack` is needed. |
| ac SC-32 (P2) | Applied: Y34 adds the slug case; D19 says "with or without a slug"; AC-36. |
| ac SC-33 (P2) | Applied: VM14, VM15 added for Y29's messages; the table ordered by id; VM11 marked retired; Testing Decisions. |
| ac SC-34 (P2) | Applied: "Build error codes" states the quoting per code, with a complete PL-E12 example line. |
| ac SC-35 (P2) | Applied: B88 quotes OQ-024's new Status, Update, Evidence and Revisit values. |
| ac SC-36 (P2) | Applied: U112 requires the exported list; U114 pins `A7: platform/en/index.md is missing`. |
| ac SC-37 (P2) | Applied: S43 adds the staged link, the gitlink and the failing `git show` (`unknown`). |
| ac SC-38 (P2) | Applied with surface SC-35. |
| ac SC-39 (P2) | Applied: U55 runs in the `fork-init-cross-os` job's macOS and Windows legs (read in `quality-gates.yml`). |
| ac SC-40 (P2) | Applied: V-Y7 calls `buildPlayerPackage` without an agent. |
| ac SC-41 (P2) | Applied: the substituted phrases in D39, D48, D77, D83, D86, L6, Y33, Y79, Y85 and L-§4.2 rewritten. |
| contract CC-01 (P1) | Applied with surface SC-08. |
| contract CC-02 (P1) | Applied: spec Solution paragraph 2 and User Story 12 say only a translation page's cold load (and the switcher) writes. |
| contract CC-03 (P1) | Applied: User Story 12 says "inside the site"; B90 rewrites 語系偏好's _Avoid_ line. |
| contract CC-04 (P1) | Applied, second option: the Vocabulary and U-§1 say D105 supersedes the two sentences until B90; "Items for the user". GLOSSARY.md itself is not edited here. |
| contract CC-05 (P1) | Applied with surface SC-03 (first option, no new caveat). |
| contract CC-06 (P1) | Applied: the 0007 amends row and four Area S contract rows (watched trees, watched paths, validator and its outcome rule, retiring, D5). |
| contract CC-07 (P2) | Applied: a 0004 amends row; the Area U row and U116 use the real literal `'A7:platform/index.md'`. |
| contract CC-08 (P2) | Applied with ac SC-36; AC-51 says 0003's format is unchanged. |
| contract CC-09 (P2) | Applied: 0005 B8 in the amends table. |
| contract CC-10 (P2) | Applied: trust-boundary wording (traceability preamble, Area A, spec) and Y106 (stage 7 check); AC-37. |
| contract CC-11 (P2) | Applied: S69 and S71 state the preference rule positively; an Area S row for 0008 D2 and goal G22; 0008 amends row. |
| contract CC-12 (P2) | Applied with surface SC-27; `ShortLinkShare.vue` and `ChallengeDoneBadge.vue` checked and kept (they speak of a page's locale). |
| contract CC-13 (P2) | Applied: T1 and Testing Decisions add the stage 5 step and the pre-authorised `P`-only test edit. |
| contract CC-14 (P2) | Applied: header convention `0008 goal Gn` versus `0008 Gn`; D20, D38, the Area L check, BC5 and the 0008 amends row. |
| contract CC-15 (P1) | Applied: B84 and B86 state the `--from` need and the upstream decision; U143 pins UP-E06 `upstream`. |
| contract CC-16 (P2) | Applied, first option: D96 prints the first failing side only; U148; AC-47. |
| contract CC-17 (P2) | Applied: UP-A16 reworded in both languages (and the report example). |
| contract CC-18 (P2) | Applied: D108's base tag is the newest legacy-layout `v*` tag, asserted by U130; stage 4 re-checks. |
| contract CC-19 (P1) | Applied with surface SC-21. |
| contract CC-20 (P2) | Applied, first option: VA3a–VA3e and VL9 run on F-2's Cloudflare preview; F-4 serves only area U. |
| contract CC-21 (P2) | Applied: B90 aligns 舊版面 with D91 and uses 說明頁. The optional PL-E15 pointer is not applied: it would add a sentence to a pinned first line for a tree that PL-E08 already names when any page is outside a locale folder. |
| contract CC-22 (P2) | Applied, first option: B90 softens 語系清單; the narrowing of R6 is under "Items for the user". |
| contract CC-23 (P2) | Applied: R23 and R12 deviations (and R6's) listed under "Items for the user" with reasons. |
| contract CC-24 (P2) | Applied with surface SC-25; the vocabulary makes `smoke-fixtures/**` mode-independent for `classifySourcePath`. |
| contract CC-25 (P2) | Applied: D82 order gains the layout check; D19; Y105; AC-41. |
| contract CC-26 (P2) | Applied: spec Solution paragraphs 1 and 4 reworded. |
| contract CC-27 (P2) | Applied: User Story 13 qualified. |
| contract CC-28 (P2) | Applied: U145 pins fork:init's A7 for a deleted translation home until 0011; B86; U-O8; AC-51. |
| contract CC-29 (P2) | Applied: the 0008 amends row names AC-2, AC-4, AC-8 and AC-11 with the rows that replace them. |

**Mutual-exclusion checks on the guarantees added here.**

- **D28's fall-through against D28's own "counts only when it is a primary-locale entry", A17 and
  0008 C9.** It applies only when the stripped path is a primary path, so `/<P>/<T>/x` and
  `/<P>/<P>/x` still find nothing (A17); it yields one not-found redirect, never two (0008 C9); every
  target is still a list entry (TA1, TB4). D29's accepted divergence (a stored `T` after the splat)
  is unchanged.
- **D105 narrowed against Q12, R17, R18 and 0006 U24.** Q12 holds (no overwrite); R18's order holds
  when it writes; U24's cases are not crossing runs, so unchanged; U2's range keeps its root locale.
- **D98 narrowed against D64 and R11.** A translation brief of a declared slug is already new-layout
  content, so R11 has nothing to split; D64 still refuses a real orphan at commit time.
- **LW1 against L32.** L32's empty render stays; the warning is output only, on the missing-prop
  case, and not on `lists` lacking a key.
- **`subtitle` against D8.** The site description is no longer replaced on the list pages (L46);
  `title` still drives both the h1 and `<title>`.
- **`Number.isSafeInteger` against today's tests and D62.** No upstream or fixture number exceeds
  999; the change only refuses values that `padChallengeNumber` could not spell; validate's message
  is the existing one.
- **`create:challenge`'s layout check against 0007 D13 and D82.** Status 1 still means nothing was
  written; the check runs before collision and number, which read no legacy brief (D69).
- **D108's self-chosen compared tree against R15 and R31.** Until the first new-layout release the
  working tree must equal the transform plus U-§5, which is R15's condition for that release; after
  it the tag is fixed, so the test needs no ticket (R31 unaffected); the upstream decision keeps it
  off ranges (D52's pattern).
- **The base-side UP-E14 form against U105.** Both languages keep one canonical sentence per side;
  the token sentences are unchanged for `range` and `target`.
- **The excluded-area change for `smoke-fixtures/**` against D49 and PL-E09.** Fixture pages sit in
  locale folders, so they never violate a layout rule in either mode; publishing still follows
  `isSmokeFixturePage`.
- **PL-E12 without fall-back against Q2.** Translations stay optional; only a translation home's link
  must name a page of its own locale, as B84 and B86 now say.

## Checks on revision 2

Revision 2 applies round 1's disposition (`review/disposition.md`). Round 1 found no P0; by the 0006
precedent round 2 is not run, and this self-check takes its place. It ran three lenses over the
changed and added surface (surface, acceptance criteria, contracts), with the reviewers' frozen
depth (the round 1 prompt, `review/prompt.md`) as the yardstick, and checked every new guarantee for
mutual exclusion with the existing rules before adding it (global rule 5).

**Mutual-exclusion checks on the guarantees added here.**

- **D122 (validation reads the index's `range.json`) against D21, D67, D121, S42, S43 and Y36.** No
  environment variable or option carries `P` (D21 holds); the source is the one D67 already gives the
  generator, so the two checks of one commit agree; D121's order is unchanged, so a staged challenge
  path plus an unusable `range.json` now ends in 0007 O3 (validation first) and S43's case, which
  stages no challenge path, still ends in 0007 O4 with W5; AC-31 states both. The
  `challenge:validate` command (Y36, Y37) keeps the working tree, which is what CI checks out.
  `challenge-lint-staged` has one caller, the hook (`scripts/pre-commit.sh:466`).
- **D123 (every reader reads `range.json` first) against D5, D19, D82 and AC-3.** The build (D5) and
  `create:challenge` (D82) already read it first; `checkSourceLayout(srcDir, primary)` cannot run
  without `P`, so D19's "first" was already "first after `P`". AC-3's PL-E08 cases use a usable (or
  absent) `range.json`, so their first line is unchanged.
- **D124 (upstream-only rows) against D52, D54, D108 and B84.** Same mechanism as D52 and D108; D54's
  claim gains an observation (V-B7) instead of changing; B84 already says a root `range.json` makes
  the tree a range, which is why F-2 is a range for V-B7.
- **D125 (translation brief check) against D116, RC1, RC4, D98 and U144.** The walk still skips
  exactly the excluded areas and locale folder paths (D116); the new check looks only at the paths
  the transform would strip, so U144's excluded-area cases still cause no stop; a translation brief
  of a declared slug is not looked at (D98: its slug has no English brief).
- **D126 (trigger) against D65, D66, the amended 0007 "watched trees" (Area S contracts), S50 and
  R23.** It makes S36 agree with the watched-tree amendment, which already names only listed
  locales; `range.json` stays watched (D66); T-0058's whole-untracked-folder case (S50) concerns a
  listed locale's folder; the list comes from Node, so the hook still lists no locale in bash.
- **D127 (only `index.md`) against D84, D86, B-O10, PL-E18 and S32.** Collision still tests the
  directory (D84); discovery (D86) already meant slugs with a brief, now spelled; B-O10's other files
  stay allowed; a non-index page there is an ordinary page, which PL-E18 already covers; S32 is
  rewritten to ignore a folder without `index.md`.
- **D128 (SSR scope) against US1, A29, D44 and D47.** A29 already said SSR keeps `en`; D44 and D47
  widen T-0060 to the lists and the home page only; the scope line and the open question add no
  rule.
- **D129 (YAML rules) against D79, D110 and SC3/SC4.** One parser and the core schema (D79);
  create-wxl's own defaults (D110) already make a duplicate key an error. A brief the move splits
  with a custom tag passes the move's checks and then fails the build with PL-E14 (`invalid-yaml`),
  which names the file: accepted, no stop added.
- **D130 (exceptions need the user) against D108 and AC-53.** It adds a condition to D108's
  post-epic rule and to U-§5's in-epic rule; the close-out equality is unchanged.
- **D131 (LW1 per instance) against L32, L45 and AC-22.** The empty render is unchanged; only the
  count's unit changes, and L45 now forces a re-render to show it.
- **D132 (enumeration) against D4, D8, D34, D83 and D115.** Each named table is total over `Locale`
  by type, which is what D4's single source needs; B18 keeps its two greps and adds a stage 6 read.
- **D133 (keygen convergence) against D80 and AC-39.** It adds only the exit when (b) cannot hold.
- **D134 (T-0060 `done`) against D55, T7 and the tracker.** `done` means landed on `main`, which the
  replacement makes true of T-0060's scope; T7's declined tickets stay `pending` as the user's
  decision.
- **D135 (skill trees alike) against D88, Y94–Y96 and `docs/agents/runtime.md`.** Today every file the
  three skills have in both trees is byte-identical (checked with `cmp` at `65de8c0`; `.agents/` also
  holds an `agents/` folder of its own), so equal diffs keep them identical in this epic, and
  runtime.md's per-vendor tuning stays possible later.
- **D136 (fixture CI leg) against D21 and `upstreamDecision.ts`.** It removes a clause that would
  have contradicted D124's rows: with `GITHUB_REPOSITORY` set the decision ignores a root
  `range.json`, so upstream's upstream-only rows would run under `P = en` and fail (this bullet's
  first version gave a skip as the reason, which `isUpstreamDecision` contradicts; corrected, RV2-05);
  no row depended on it.
- **D137 (scaffold body) against D83, Y78, AC-41, wxl-create's TODO check and `glossary.test.ts`.**
  The literal `TODO` stays; Y78 and the Y-§2.4 scaffold example carry the new text. This bullet's
  first version said 委託書 enters the corpus only if a document quotes it; that was wrong, since the
  test reads every `.md` under `platform/`, a scaffolded brief a range commits included, and 委託書
  is declared `_新造詞_` (RV2-02). The body is now `TODO：在這裡寫說明頁內文。`: 說明頁 is in the corpus
  and not declared new, no GLOSSARY `_Avoid_` line names it, and GLOSSARY's 委託書 entry stays true.
- **D138 (doubled prefixes) against D28, D29, A17 and D26.** The lookup is unchanged (A17 holds on
  GitHub Pages); on Cloudflare the server answers first, and the resulting cold load follows D26
  exactly as a direct visit would.
- **D139 (regular files only) against 8a, RC1, UP-E11 and 0006 step 4.** RC1 still covers every
  path of the plan; D139 only moves the link test before the read; UP-E11 is 0006's read-error code,
  reused for a path it cannot read safely. Step 4 already refuses a tracked page whose working-tree
  kind changed (UP-E03), so D139's non-regular branch is reached only after step 4; U154 models that
  race with a wrapped `deps.fs` and pins step 4's UP-E03 for the real FIFO (RV2-01).
- **D140 (quoting) against B10, B-T1, TB1 and create-wxl's B5.** For every value B10 lists, the new
  function's output equals `JSON.stringify`'s (none holds a backspace, form feed, CR, tab, DEL or C1),
  so B10 is unchanged; UP codes
  keep create-wxl's own `jsonValue`; the hook's lines keep raw names (TB-S4).
- **D141 (`//` link) against D13 and upstream's home pages.** D13's external links are those with a
  scheme, which `//` lacks; no upstream home link starts with `//` (the "Home-page links" table).
- **Wording corrections that change no rule:** D26 (orphan landing, C-18), D44's rationale (K-5),
  D105's quotations and the vocabulary (C-16, K-3), D12/AC-8's "first segment equals" (C-11), step 9's
  `strip` paths (C-5: D94 already made every move op a final op), S-§4.7's order (V-21: D64 already
  sorted the faults). Each was checked against the decision it restates.

**Lens results.**

| Lens | Check | Result |
|---|---|---|
| surface | every new row reaches an AC in the index, and every new D is cited by a row or an AC | B93 → AC-61; B94 → AC-7; B95 → AC-1; S76–S80 → AC-31; Y107 → AC-39; Y108 → AC-40; Y109–Y111 → AC-42; Y112 → AC-35; Y113 → AC-37; U149 → AC-48; U150 → AC-45; U151 → AC-44, AC-49; U152 → AC-51; U153, U154 → AC-47; V-B7 → AC-61. D122–D142 each cited (D134 by D55, D136 by D21 and B88, D137 by Y78, D142 by U154 and the Stops header); PAT6 by D135 and AC-43 |
| surface | no command or regular expression left inside a table cell with `\|` | Only TypeScript union notation remains escaped (D114, D116, seam table, overridden-contract rows); PAT1–PAT5 hold the commands |
| surface | stale literals | none of 「在這裡寫題目說明」, "once per render", "byte-identical per skill file" or `npx --yes <tarball>` remains in a live row (the last stays only in "Checks on revision 1", a historical record) |
| ac | every changed AC names its rows and each new row's literal values sit in the row | AC-1, AC-2, AC-7, AC-8, AC-14, AC-17, AC-19, AC-22, AC-30, AC-31, AC-35, AC-37, AC-39, AC-40, AC-42–AC-45, AC-47–AC-49, AC-51, AC-53, AC-54, AC-58, AC-60, AC-61 checked |
| ac | table shape | every new row has its table's column count (checked by counting unescaped `|`) |
| contracts | new overridden contracts | none: D122–D141 change no existing test's assertion; the upstream-only gate (D124) is added to rows of this spec, and the hook trigger (D126) restores the amended 0007 watched-tree contract already listed |
| contracts | GLOSSARY quotations | requoted from blob `b307335` (`GLOSSARY.md` 設定紀錄 and 搬家 entries); BC18 marks its three sentences as already rewritten there |

Nothing in this revision contradicts an earlier analysis of this file except the two GLOSSARY
quotations (revision 1 quoted sentences the working tree no longer holds; corrected above) and
S-O7's claim that S69 already mentioned `platform/public/zh-TW/` (it did not; S69 now does).

**Self-check findings on revision 2 (RV2-01–RV2-22, SC2-01–SC2-10).** A second self-check pass ran
two lenses over revision 2 (new surface, disposition), with the same frozen depth. Each finding is
answered claim by claim; every rule or row it adds or changes was first checked for mutual exclusion
with the existing ones (the bullets after the table). "Fixed" means this file changed and the spec
and `review/disposition.md` follow it.

| Id | Sev. | Disposition |
|---|---|---|
| RV2-01 | P1 | Fixed. Claim "U154 cannot reach 8a through a real `run`, 0006 step 4 ends it with UP-E03": confirmed (` M` for a FIFO, ` T` for a link); U154 now models the race with a wrapped `deps.fs` as U56 does ((a) link, (b) FIFO), and (c) pins step 4's UP-E03 for a real FIFO. Claim "D139's non-regular branch is only a TOCTOU defence": D139 and the Discovery bullet say so. Claim "AC-47 as written is unreachable": AC-47 rewritten. |
| RV2-02 | P1 | Fixed, option (a). Claim "a range's scaffold makes `glossary.test.ts` fail": confirmed (the test walks `platform/`, 委託書 is `_新造詞_`); D137's body becomes `TODO：在這裡寫說明頁內文。` (說明頁 is in the corpus and not declared new), with D83, Y78 (plus a stage 6 check that no body word is `_新造詞_`) and the Y-§2.4 example. Claim "GLOSSARY's 「題目頁本身從不自稱委託書」 no longer holds": holds again, so GLOSSARY.md needs no change. Claim "D137's mutual-exclusion check is wrong": rewritten. |
| RV2-03 | P1 | Fixed, option (a). B95's universal assertion is limited to PL-E05–PL-E12; the "Build error codes" preamble, D140, B-T1, B-T2 and the spec's Build bullet and TB2 no longer claim every name is quoted (TB1 is about `range.json`'s values, which PL-E05 and PL-E06 quote, so it stays); PL-E13–PL-E18's bare paths and keys are recorded as not protected. |
| RV2-04 | P2 | Fixed. D67's last sentence is qualified (O4 with W5 only when no challenge path is staged; O3 with the PL line otherwise); D122 says which D67 sentence it replaces; D121's message list adds the PL-E01–PL-E06 first lines. |
| RV2-05 | P2 | Fixed. D136's reason now follows `isUpstreamDecision` (in CI `GITHUB_REPOSITORY` alone decides, so the upstream-only rows would run under `P = en` and fail); B88 quotes no reason, so it is unchanged; the D136 check bullet is corrected. |
| RV2-06 | P2 | Fixed, option (a) in substance. B93, D124 and AC-61 no longer require each D124 test to fail under `WXL_EXPECT_UPSTREAM`; the silent-skip guard is the `test` job's existing expectation check, which reads the decision every D124 row reads, and the `site-smoke` job reads the same decision. No workflow or `upstream-only-jobs.test.ts` change, so "new overridden contracts: none" stays true. |
| RV2-07 | P2 | Fixed. D124 names the seam: one helper in `tests/__helpers__/upstreamDecision.ts` that every D124 test is declared through; B93 tests the helper with stubbed inputs and stage 6 checks by `git grep` that each D124 row uses it. |
| RV2-08 | P2 | Fixed. PAT1's second command now finds unions and arrays in either quote and order and the `\|\|` comparison chain (it lists today's `i18n/index.ts:31`, measured at `65de8c0`); the third finds double-quoted and computed `zh-TW` keys; D132 defines the chain and leaves multi-line forms to stage 6's reading; B18 and AC-2 follow. |
| RV2-09 | P2 | Fixed. PAT6 gives the command, the base (each ticket's merge base with `main`), the header removal and the exclusion of `.agents/`'s own `agents/` folders; D135 and AC-43 cite it. |
| RV2-10 | P2 | Fixed. D140 and the preamble describe the whole function (short escapes rewritten, LF kept as `\n`, DEL and C1 and lone surrogates as `\uXXXX`, the type name when it returns `undefined`); B95 states the literal for tab, CR, LF, ESC, a lone surrogate and DEL; D140's field list is PL-E11's `<page>` and `<href>` and PL-E12's `<page>` and `<json>`. |
| RV2-11 | P2 | Fixed. Confirmed with `yaml` 2.9.0 (`parseDocument` reports nothing; `toJS` throws `ReferenceError`). D129 now parses, then converts with `toJS({ maxAliasCount: 100 })`, and counts a `toJS` exception as `invalid-yaml`; Y112 adds the alias without an anchor; AC-35 follows. |
| RV2-12 | P2 | Fixed. D138 is limited to `P = zh-TW`; under `P = en` both hosts land alike on the not-found page (A17); the spec's Learner arrival bullet follows. |
| RV2-13 | P2 | Fixed (with SC2-09). PL-E12's When column adds `//` and states the order, which D141 now fixes: not a string, `//`, external set aside, relative, prefix, no page. |
| RV2-14 | P2 | Fixed. D134 no longer says "never left `pending`": T-0060 stays `pending` (the user's decision of 2026-11-06) with `revisit_when` naming the replacing ticket from stage 4, which the user approves with the breakdown; on landing the agent sets `done` after the merge (the tracker's `done` row), keeps the `pending_*` fields and `revisit_when` as history and adds a Comments entry. |
| RV2-15 | P2 | Fixed. (1) The Stops header lists U153 and U154 and gives U154's UP-E11 and UP-E03 outcomes. (2) D125: a line names the checked brief path, one per (path, token), so an RC1 `symlink` on the same path is printed once; U153 adds (d), three slugs under one link. (3) U153 (c) says tracked, and why. (4) New D142: a read or git failure in 8a ends the run at once with no UP-E14 line, also for collected failures; U154 (d). |
| RV2-16 | P2 | Fixed in part. Claim "D125's boundary differs from RC1's and D139's": D125 and the Discovery bullet now say "inside the range (`platform` itself included)". Suggested extra U153 case for `platform` itself a link: not added. Reason: with `platform` a tracked link git tracks no page under it, so no slug has an English brief and D125 has no path to check, and the walk does not descend a link; such a case would test nothing D125 decides. |
| RV2-17 | P2 | Fixed, option (a). B79's smoke part is upstream-only and skipped in a range or a fork; the `localePath(T, 'challenges')` sentence is deleted; D124 names B79's smoke part. |
| RV2-18 | P2 | Fixed. Y111 states the fixture (no `range.json`, so `P = zh-TW`; `s` declared; `t` and `u` undeclared) and adds the contrast case: `t` declared gives `missing-primary` from its declaration (W6b; with no brief in any locale it is W6b, not the W6a the finding names). |
| RV2-19 | P2 | Fixed. S80 adds `platform/__proto__/challenge/s/index.md`. |
| RV2-20 | P2 | Fixed. U149 states the crossing layout (as U1) and the same run's move and declare results. |
| RV2-21 | P2 | Fixed. Y112's brief holds `<<: {x: 1}` (VM6 naming `<<`); the same flaw in the declaration case (`<<: *base` with no anchor would be `invalid-yaml` through `toJS`) is fixed by `base: &base {x: 1}` first. |
| RV2-22 | P2 | Fixed. GD1 reads `…, but the locale list has <n> members, not 2; parameterise them in the Japanese (ja) epic.`, true for any length other than two; A31 follows. |
| SC2-01 | P2 | Fixed. B14 opens with the observable ("the shipped value depends only on the root `range.json`") instead of the call's argument; disposition V-13 now matches. |
| SC2-02 | P2 | Fixed. Y111 adds the hook cell: with 0007 W3 forced, an untracked `platform/zh-TW/challenge/t/` without `index.md` gives no W4 line; AC-42 follows. |
| SC2-03 | P2 | Fixed. The spec's Further Notes now says U135's 設定紀錄 and 搬家 sentences land with T4 and the rest with T1, as B90, T1, T4 and the Area U contract row say. |
| SC2-04 | P2 | Fixed. "Items for the user" now says N17 is one sentence, 搬家's, landing with T4. |
| SC2-05 | P2 | Fixed, as RV2-08 (AC-2 names the comparison chain). |
| SC2-06 | P2 | Fixed. F-1 adds `platform/public/zh-TW/stage8.txt`; V-S1 records the double prefixes and that file. |
| SC2-07 | P2 | Fixed. One standard: a finding whose reviewer offered alternatives is fixed when one is adopted; it counts as fixed in part only when a claim it makes is not fixed. K-8, R-3 and R-8 leave the partial list; V-7 (B86's and the prose's residual), which the old count missed, joins it; R-11 (bidi) stays in it; K-7, R-2, R-12 and R-15 stay fixed. New count: 74 fixed, 6 of them in part (C-12, C-14's behaviour, C-17, K-12, R-11, V-7); 2 declined. |
| SC2-08 | P2 | Fixed. S43's input says no challenge path is staged and points at S76 (c). |
| SC2-09 | P2 | Fixed, as RV2-13. |
| SC2-10 | P2 | Fixed. Disposition C-17 answers the key-set claim in full: gray-matter's js-yaml 3 merges `<<`, the only key-set difference, and validate refuses every brief key outside the three (VM6); a duplicate key fails both, VM15 in validate; D129 says so and Y112 adds the duplicate-key brief. |

**Mutual-exclusion checks on the self-check's rules and rows.**

- **D142 against D96, U62, U63 and AC-47.** U62 and U63 already end without an UP-E14 line; AC-47
  already says read errors and git failures come without one. D142 extends that to failures 8a had
  collected, and limits D96's "every failing path is printed" to runs that end in UP-E14; no row
  expects UP-E14 lines beside an UP-E11 or a CW-E14.
- **D125's line naming against D96, RC1, U51 and U153.** D96 prints "the path"; naming the checked
  brief path keeps that, and (path, token) de-duplication keeps "one line per failure" true when RC1
  flags the same path. U153 (b) and (c) changed from "naming the link" to the brief path; U51's
  `platform/zh-TW` case names no path, so it holds.
- **D141's order against B66, B72 and B94.** `//` links fail before any other test; no existing row
  expects a `//` link to give another reason or pass; the relative, prefix and no-page reasons keep
  their relative order.
- **D124's helper and the B93 rewrite against 0007's S08, `upstream-only-jobs.test.ts` and AC-61.**
  S08 is not a D124 row and keeps its direct `realUpstreamDecision` call; no workflow changes, so
  `upstream-only-jobs.test.ts` stays as it is; AC-61 is rewritten to the same claim.
- **D134 against the tracker and T7.** `pending` stays the user's decision until the landing, `done`
  is set by the agent after the merge as the tracker says; T7's declined tickets are unchanged.
- **PAT6 against Y94–Y96, AC-43 and `docs/agents/runtime.md`.** It is D135's rule written as a
  command; per-vendor tuning that predates a ticket is outside its diff range.
- **D137's new body against AC-41, wxl-create's TODO check, GLOSSARY 說明頁 and B90.** `TODO` stays;
  no 說明頁 `_Avoid_` line names the word; B90's `_新造詞_` rule is untouched.
- **D138 against S-§4.2, S60 and A17.** S60 observes only `P = zh-TW`, which is now D138's whole
  claim; the `P = en` sentence restates A17.
- **D129's `toJS` step against Y1–Y8 and AC-35.** Upstream's four files hold no alias, so their
  values are unchanged; AC-35's `invalid-yaml` list gains the alias without an anchor.
- **PAT1's widened commands against B18 and the locale list module.** At `65de8c0` the second command
  lists only `i18n/index.ts` lines and two other union types (`shortLink.ts:61`,
  `challenges.data.ts:5`), which D4 already names for replacement (`ShortLinkLocale`, `ChallengeLocale`); ChallengeList.vue:114 (an `&&` of
  two different operands) is not a chain under D132 and is not listed.
- **GD1's new text against A31 and V-24.** No other row quotes the old sentence.
- **B95 narrowed, B-T2 and TB2 widened against TB6 and TB-S4.** Bare names in PL-E13–PL-E18 sit beside
  the hook's raw names (TB-S4, T-0058); nothing claims otherwise any more.

Nothing here contradicts an earlier analysis of this file except the two revision 2 statements the
findings disproved and this pass corrected: D136's reason (RV2-05) and the D137 corpus claim
(RV2-02); D125's "inside `platform/`" (RV2-16) and U153's "naming the link" (RV2-15) were narrowed or
changed as stated above.

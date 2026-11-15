# Spec 0010: Primary-locale layout — every locale in its own folder, the range chooses the root

Status: revision 2 (2026-11-15). Revision 1, with the same day's self-check applied (traceability
"Checks on revision 1"), was reviewed in stage 3 round 1 (`review/round-1-C.md`, `-V.md`, `-K.md`,
`-R.md`). Revision 2 applies round 1's disposition (`review/disposition.md`): every P1 and P2 finding
is fixed or declined with its reason; it adds decisions D122–D141, rows B93–B95, S76–S80, Y107–Y113,
U149–U154 and V-B7, and criterion AC-61; its own self-check (traceability "Checks on revision 2",
RV2-01–RV2-22 and SC2-01–SC2-10) changes D67, D121, D122, D124, D125, D129 and D134–D141 in place
and adds D142 and PAT6. Round 1 found no P0, so the stage 3 gate is met; by the
0006 precedent (round 1 without P0, round 2 not run), round 2 is not run and revision 2 is
self-checked instead (traceability "Checks on revision 2"). Derived from `traceability.md`, which
holds:

- the decisions D1–D142 (stage 1 decisions realised, and the new decisions of stage 2 and of
  revision 2, each approved under the user's standing authorization of 2026-11-15; as
  `docs/agents/workflow.md` requires, each new or changed D-number is still confirmed by the user
  from a short decision summary before it is implemented);
- the seams 0010-S1 to 0010-S52 and the ticket constraints T1–T9;
- the vocabulary, the literal patterns PAT1–PAT6, the type × boundary summary, the `range.json` and `challenge.yaml` schemas with
  complete examples, the source-path to URL table for both primary locales, the build error codes
  PL-E01–PL-E18, the cold-load decision table (DT01–DT80) and the switcher table (SW01–SW16), the
  list schemas and canonical strings, the redirect files and the short-link target matrix, the hook's
  sentences, and the upgrade's rules, codes, canonical sentences and report;
- the overridden contracts of specs 0003, 0005, 0006, 0007 and 0008, and the trust boundaries;
- the matrix rows of areas B (build and routing), A (learner arrival), L (lists and smoke fixtures),
  S (short links, numbers, the hook), Y (the challenge declaration) and U (the upgrade's move);
- the stage 8 plan (fixtures F-1–F-6 and the V rows), the integration notes and the AC index.

Stage 1 is recorded in the local research note `.proj.research/2026-11-02-primary-locale-grill.md`
(Q1–Q23; R1–R13 of 2026-11-06; facts F1–F26 and decisions R14–R31 of 2026-11-15). This is the first
of the two epics R13 splits the primary-locale work into; the second (0011) adds the ways to choose
the primary locale without editing a file, and Japanese comes after both.

## Problem Statement

WXL has two locales, and English is privileged by construction. English pages sit directly in the
site's content folder and are served at the root; Traditional Chinese pages sit in a subfolder and
are served under `/zh-TW/`. Every tool that finds a challenge (validation, key generation, numbering,
the redirect generator, the pre-commit hook, the scaffold, the release gate) looks for the English
page first, and each Traditional Chinese brief carries its own copy of the challenge's declaration
(backend, tools, number, whether the source is visible).

For a teacher whose students read Traditional Chinese, which is upstream's main audience (Q8), this
means:

- The range cannot put Traditional Chinese at the root. A first-time visitor is redirected from an
  English page to its Traditional Chinese counterpart by a hard-coded default, and the Traditional
  Chinese challenge list's served HTML still shows English interface text until scripts run (T-0060).
- A challenge must exist in English, even when the teacher writes only Chinese: `create:challenge`
  writes an English brief, the hook refuses a Chinese brief without one, and every tool reads the
  English page first.
- The two copies of a challenge's declaration drift. Upstream already ships one: the Traditional
  Chinese brief of `selected-excerpts` lists 7 source files where the English one lists 10 (F10), so
  the Traditional Chinese page shows a different Source tab. A translation can grant a different set
  of attack tools than the original.
- A third locale would deepen the special case: every tool would have to know that one locale lives
  at the folder root and the others in subfolders (ADR-0008).

ADR-0008 decided the remedy: one folder per locale, none privileged, and a build-time setting that
chooses which one is served at the root. Ranges that already exist (create-wxl 3.x ranges, and forks)
are on the old layout and must cross to the new one without losing the teacher's own pages, which a
plain three-way merge would strand outside every locale folder without a word.

## Solution

Every page of a range lives in the folder of its locale (English in its own folder like every other
locale), and each challenge's application, flag and declaration live once, outside every locale
folder. The setup record (`range.json`) names the range's primary locale; without one, or without
that key, it is Traditional Chinese, so upstream, and every range create-wxl creates from this
release until epic 0011, are Traditional-Chinese-primary; a range created before this release records
English when the upgrade moves it. The build serves the primary locale at the site root and every other
locale under its code (`/en/`, `/zh-TW/`), and fails with a coded message when the setup record is
unusable or a page sits outside the locale folders.

A learner with no stored preference sees the page they opened, in the language of its address; a
learner whose preference is another locale is taken from a primary-locale page to that locale's
version when it exists. Cold-loading a published page whose address carries a translation locale's
code sets that locale; the locale switcher is the only other writer. An address coded with the
primary locale (an old `/zh-TW/…` link, `/<P>/c/NNN`) lands on a primary-locale page and sets nothing
(D26, D30). On a Traditional-Chinese-primary range, old `/zh-TW/…` addresses reach the same page at
the root, or its English version when that is the only one. Every locale keeps its own short link, and `/c/NNN` opens the primary
locale's page.

A challenge needs a brief only in the primary locale; translations are optional. Its declaration is
one `challenge.yaml` beside its application; a brief keeps only its title, summary and layout, and
the build assembles the two into the challenge page of every locale. Every tool reads the
declaration from that file. The challenge lists render their interface text in the list's locale in
the static HTML as well as after hydration (T-0060, widened to the home page).

`range:upgrade` moves a range off the old layout before it merges: the English pages of the
teacher's range and of the base pristine range go into the English folder, each declaration is
extracted line by line into `challenge.yaml`, and a range that was itself on the old layout, upgraded
from an old-layout base, records `"primaryLocale": "en"` so its root does not change language. The
report lists every moved path. A range moved without the upgrade (for example a fork without
`range.json`) gets a build error pointing at a README section that gives the manual steps; a fork with
no page of its own to move builds without one and serves Traditional Chinese at the root until it
records `en`. Upstream's own move is produced by the same transform and a test proves it.

## User Stories

1. As a teacher whose students read Traditional Chinese, I want Traditional Chinese at my site's
   root, so that my students land on pages they can read without choosing a language first.
2. As a teacher, I want to choose my range's primary locale by writing one key in `range.json`, so
   that an English-teaching range keeps English at the root.
3. As a teacher, I want the build to stop with a message naming the file, the problem and the fix
   when `range.json` or my page layout is wrong, so that I never deploy a site with the wrong root
   language or a stranded page.
4. As a teacher, I want to write a challenge only in my primary locale and have it complete, so
   that I do not have to write an English version I do not need.
5. As a teacher, I want each challenge's declaration in one file shared by every locale, so that a
   translation can never show different tools, source files or a different number.
6. As a teacher, I want `create:challenge` to write the primary-locale brief and the declaration, in
   my primary locale's scaffold text, so that a new challenge builds and validates as scaffolded.
7. As a teacher upgrading a range made before this release, I want the upgrade to move my pages,
   including my own challenges and articles, into the new layout and list every moved path, so that
   nothing I wrote is stranded or silently lost.
8. As a teacher whose translation and English declaration disagreed, I want the upgrade to keep the
   English values and name each disagreement I introduced, so that I can check them.
9. As a teacher with a fork, I want a build error that points at manual move steps, so that I can
   cross to the new layout without the upgrade.
10. As a learner with no stored language, I want to stay on the page I opened, in the language of its
    address, so that a shared link shows me what the sender saw.
11. As a learner who chose a language, I want a primary-locale page to take me to my language's
    version when it exists, and to tell me when it does not, so that I read my language wherever it
    exists.
12. As a learner, I want opening a translation page's address, or choosing in the locale switcher,
    to be the only things that change my remembered language, so that following links inside the
    site in the same tab never changes it.
13. As a learner holding an old `/zh-TW/…` link to a Traditional-Chinese-primary range, I want it to
    open the same page at the root (in my chosen language when that version exists), so that
    printed handouts keep working.
14. As a teacher, I want every challenge in every list, its locale-coded short link for every
    locale, and the list's interface text in the list's language even before scripts run, so that
    students find every challenge and read the list in their language.
15. As a teacher, I want the hook and CI to refuse a challenge whose primary-locale brief or
    declaration is missing, so that every published challenge has a page in the primary locale.
16. As a maintainer, I want upstream's move produced by the same transform the upgrade uses, with a
    test that compares them, so that a teacher's base and upstream's new layout merge cleanly.

## Implementation Decisions

**Content layout (schema; D1, D73, D117).** Every locale has its own folder; no page lives anywhere
else. The application, flag and declaration of a challenge live once, outside the locale folders:

```
platform/
  en/                       English locale folder (pages only)
    index.md  challenges.md  guide/…  reference/…
    challenge/<slug>/index.md        English brief
  zh-TW/                    Traditional Chinese locale folder (pages only)
    index.md  challenges.md  guide/…  reference/…
    challenge/<slug>/index.md        Traditional Chinese brief
  challenge/<slug>/         challenge directory: only these two entries
    challenge.yaml          the challenge declaration
    src/                    the application and its flag
  public/  shared/          static files and data loaders (not pages)
range.json                  setup record at the repository root (optional)
```

**Setup record (schema; D2, D3, D105, D114).** The build reads one key and nothing else:

```json
{
  "upstream": { "repository": "BrowserLaboratory/wxl-platform", "version": "3.2.0",
                "commit": "0123456789abcdef0123456789abcdef01234567" },
  "primaryLocale": "en"
}
```

`primaryLocale` is the own property's string value and must be on the locale list. No file, or no
own `primaryLocale` property, gives `zh-TW` (R17); upstream has no file, so its primary locale is
`zh-TW`. No environment variable or option overrides it (D21). A file that is not a regular file, is
unreadable, is not JSON, is not an object, has a non-string value or a value off the list fails with
PL-E01–PL-E06 (D3). One pure parser takes the text or its absence; a reader adds the file system;
the pre-commit hook feeds the parser from the index (D114).

**Challenge declaration and brief (schema; D73–D79).** `challenge.yaml` holds one YAML mapping
(core schema, so an ISO date stays a string; comments and key order kept by every writer) with every
key the old frontmatter held except the brief keys; unknown keys pass through. A brief's frontmatter
holds only `title` (required), `layout: challenge` (required) and `description`:

```yaml
# challenge.yaml of door-is-open (every key but title, layout and description)
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

```yaml
# the Traditional Chinese brief's frontmatter (the body is unchanged)
title: 知的必要
layout: challenge
description: 針對 FileHub 的黑箱滲透測試委託。這家檔案分享服務在產品頁上保證，某個帳號上傳的檔案只有該帳號讀得到。
```

The traceability's Y-§2.2 gives every key's type and boundary and Y-§2.4 all four upstream files.
`fs` is retired (keygen warns and deletes it, D76); `id` is no longer read (D77). The build
assembles brief ∪ declaration ∪ body into every locale's challenge page, deciding by the page's
source path, and fails with PL-E13–PL-E18 when the two do not fit together (a brief without a
declaration, a declaration that is not one mapping, a key on the wrong side, a brief without the
challenge layout, the challenge layout elsewhere) (D78). Schema errors stay `challenge:validate`'s.

**The locale list (D4, D115, D112).** One import-free module is the only enumeration of locales:
`LOCALES = ['en', 'zh-TW']`, the `Locale` type, `DEFAULT_PRIMARY_LOCALE = 'zh-TW'`, `isKnownLocale`
and English display names for tool messages. A locale is on it only with a string table and a
locales-config entry. create-wxl keeps a literal copy, tested equal; the hook asks Node instead of
listing locales in bash; fork:init needs no copy until epic 0011.

**Build: root, routes and layout check (D5–D12, D18–D22, D113, D116).** The VitePress
configuration, when evaluated (so `docs:build`, which CI runs, `docs:dev` and `docs:preview`
alike), reads the primary locale, then checks the source layout, then returns:

- `rewrites` removes the primary locale's folder segment from its pages' paths and nothing else; the
  page list (spec 0008's) maps every page through the same rewrite, so it holds URL paths (D7, D9).
- The layout check walks the searched area (everything under `platform/` outside the excluded areas,
  `platform/` itself included) and fails, for the first rule in
  this order that has any violation, listing every violating path: a symbolic link (PL-E07), a page
  outside every locale folder (PL-E08, pointing at the README's move section), an entry of a locale
  folder named like a locale (PL-E09), a missing primary home page (PL-E10) (D6). One predicate
  decides what a page is, for the build, the tools and the upgrade (D116). The check is a pure
  function every tool that `pnpm build`, `pnpm dev` or CI runs before VitePress calls first (D19).
- `locales` is generated from a per-locale table: the primary locale is `root`, every other locale is
  keyed by its code with its links prefixed; with `en` primary it equals today's object (D8).
  `localeIndex === 'root'` means the primary locale everywhere (D18).
- The build defines the primary locale for the client beside the page list (D18).
- `transformPageData` reads the page's source through its source path, never its rewritten path (D10).
- A markdown link whose resolved URL's first path segment equals the primary locale's code fails
  with PL-E11, since VitePress's dead-link check compares against source paths and would pass it
  (D12); home-page links, exactly `hero.actions[*].link` and `features[*].link`, are written from the
  locale's own home and prefixed by the build, and a bad one fails with PL-E12, including a
  translation home's link to a page that translation lacks and a protocol-relative `//` link (D13,
  D141).
- Translation-only pages build: the build requires only the primary home page (D20). This overrides
  ADR-0008's "which every page must exist in" explicitly: every challenge has a primary-locale brief
  (validate, the hook, CI), upstream has every page in every locale, and a range's article may exist
  in one translation only (BC19; ADR-0008 gains a dated note).
- Every build failure added here is one error class with a coded first line `PL-Exx: …`, in English
  (D17, D113); the values and paths PL-E05–PL-E12 quote are escaped as create-wxl escapes them,
  C0, DEL and C1 characters included, while PL-E13–PL-E18 print paths and keys bare (D140).
- The dead `Layout.vue` is deleted (D15). Upstream's unprefixed URLs now open Traditional Chinese and
  English moves to `/en/`; no redirect is added (D23, R20).

**Learner arrival (D24–D36).** Every routing function takes the primary locale `P` as an argument
and stays pure; the client reads `P` from one module (D31), and components derive the page locale
only through `pageLocaleOf(localeIndex, P)` (D32).

- Cold load: only a primary-locale page redirects, only when the stored value is valid and is the
  translation locale, and only to a counterpart in the page list (`replace`, base, query and hash
  kept). A translation page never redirects, whatever is stored or written (D24). The default
  visiting locale is removed: with no preference, the requested locale is the page's own, so no
  redirect and no line (D25).
- Writing: a cold load of a published translation page writes its locale; a cold load of a
  primary-locale page writes nothing, including one reached through a short link or a server
  redirect; the switcher writes its choice; nothing else writes (D26).
- Not-found lookup: a translation path goes to the primary locale's same page; a primary-code path
  (`/<P>/…`, R22's old URLs) goes to the path without that segment, on every host, or, when that path
  is not a page but its translation is, to the translation (D28's fall-through, so both hosts land
  alike); a primary path goes to the translation's page (0008 C2 kept). The requested locale is always the path's own (D27,
  D28). On Cloudflare the old-address rule answers first, so a stored translation locale may then
  redirect; on GitHub Pages the strip is a not-found redirect and no cold-load redirect follows it —
  accepted (D29); when `P = zh-TW` a doubled prefix (`/zh-TW/en/x`, `/zh-TW/zh-TW/x`) also lands
  differently on the two hosts, accepted, while under `P = en`, which has no old-address rule, both
  hosts land alike on the not-found page (D138). A short link coded with the primary locale lands on a primary-locale page, so it
  follows the preference (D30): on a Traditional-Chinese-primary range `/zh-TW/c/NNN` opens English
  for a learner who chose English, while a translation-coded link always opens that translation.
- The line and the mark keep their two-locale sentences, correct under either primary locale; a
  unit test fails at any other list length and names the Japanese epic (D33). The switcher menu is
  the list minus the page locale, plus the page locale while the line shows (D34). The session
  gate's clear reloads the root, decided by these rules (D35).

**Challenge lists, home page and interface strings (D37–D56).** One loader derived from the locale
list exports `Record<Locale, ChallengeData[]>`; every list and home page passes it whole as the
renamed `lists` prop and the component picks its page locale's list; a page still passing the old
`challenges` prop renders an empty list and a console warning naming the page, once per component
instance (D40, D131, LW1). A challenge is listed exactly when it has a primary
brief; a translation-only brief is in no list (D38). Lists read `title` and `description` from
briefs and the rest from the declaration; an entry's locale is its brief's folder (D37, D39).
Order is by slug, `id` is the position (D41); per-locale defaults move into the string tables (D42);
field values are normalised by a fixed table (D43). Every non-data string of the list is a
page-locale string or comes from the list page's frontmatter (`title`, and `subtitle`, a key
VitePress does not turn into the page's meta description), so static HTML and hydrated page agree
in both lists under either primary (D44, widening T-0060), and so are the home page's (D47); dates
use the page locale's language tag in UTC (D45). Every numbered row has a copy control (D48).

**Smoke fixture pages (D49, D50).** Two test-only articles, one English-only and one
Traditional-Chinese-only, live in a reserved `smoke-fixtures` folder of each locale folder and are
published only when the build runs with `WXL_SMOKE_PAGES` exactly `1`; CI's smoke job sets it and
the production build job fails if any trace of them ships, so the predicate and every
`smoke-fixtures` literal live in node-only modules, never in the client bundle. The flag never
changes the primary locale, and the layout check treats fixture pages as ordinary locale pages in
every mode. The Traditional Chinese reference page is added (D51), and an upstream-only test requires
every page in every locale (D52). Every test that asserts on upstream's own content is
upstream-only too, and every other test derives what it expects from the primary locale and the
tree it runs on, so a range's CI, which runs the same jobs, passes (D54, D124). Exploit specs keep their URL, which now opens the primary brief
(D53).

**Short links, numbers and the hook (D57–D72, D118, D121).** The rule forms come from the locale
list in a fixed order, `/c/`, `/en/c/`, `/zh/c/`, `/zh-TW/c/` (D57). A numbered rule for form locale
`L` targets the challenge's page in `L`, else in the primary locale, else in the first listed locale
with a brief, and always the page itself, never an address that would hop (D58). Slug rules follow
the same mapping (D59). On a Traditional-Chinese-primary range the file ends with R22's old-address
rule `/zh-TW/*  /:splat  302` (D60); because its target starts with request text, an open-redirect
check is a stage 8 gate, and only if it fails does the user choose a rule set that is safe by
construction (D118). The header states the capacity computed from the form count (D61). Numbers are safe integers from 1 to 2^53 − 1 and come
from `challenge.yaml` only; `number-locales` goes; retired numbers are read from retired
declarations and from legacy retired briefs (D62, D63). One pure function reports brief faults
over git's index: `missing-primary` once per slug, `missing-declaration` once per brief without a
declaration, `old-layout` once per path (schema S-§4.7); only a slug folder holding `index.md`
gives a brief (D127); the hook's validation refuses faults a commit stages, and the generator's
check refuses faults the index already holds (D64, D69, D121). The hook knows no locale: it watches
the challenge paths of the listed locales' folders (nothing under `public/`, `shared/` or a folder
off the list) and `range.json`, and both its validation and its brief check read the primary locale
from the index (D65–D67, D122, D126). One function gives a challenge
page's path for the generator and the copy control (D68). Whether T-0058 and T-0059 are taken is
stage 4's call; the spec recommends both (D72).

**Tools on the declaration (D80–D90, D123, D129).** Every tool that reads `range.json` reads it
first and stops on an unusable one with its PL line before touching any challenge (D123). A
declaration with a duplicate key, an unresolved tag, too many aliases or an alias without its
anchor is invalid YAML (D129).
keygen writes `wasmModule` into `challenge.yaml` only when
its bytes change and tracks the declaration and `src/`, never a brief (D80). Flat single-file
challenges are gone from every tool (D81). `create:challenge` runs the layout check first and
refuses a legacy-layout tree, then writes the primary brief, the declaration and `src/`, with
scaffold text keyed by locale, and refuses a slug that any challenge directory or locale brief
folder already holds (D82–D84). The slug grammar is enforced only there (and by the generator if
T-0059 is taken); other tools accept any directory name. The L4 player package reads the primary
brief (D85). Validation checks the declaration once, every brief that exists, the primary brief's
presence and the challenge directory's structure (D86, D117). A running dev server shows a
declaration edit in the lists after a reload and on the challenge page after a restart (D87, N18).
retype changes only `challenge.yaml`; analyze takes the title from the primary brief (D89, D90).

**The upgrade's move (D91–D112, D120).** A range is moved because of its content, never its version
(D91); a run that ends at the pre-download checks moves nothing (D92). Step 7 transforms the base
pristine range in its temporary directory; step 8 plans the teacher's move in memory; step 9 deletes
each old path and writes each new one, staging nothing; steps 1–8 still write nothing in the range
(D93). The merge reads the base after its move and the teacher's file through the move plan; a merge
write at a moved path wins over the move (D94). The transform changes paths and splits frontmatter
only, line by line with original bytes and endings (D95). It stops before writing anything, with
UP-E14 and a token, for every case R14 lists and for an unsplittable brief, an orphan translation (no
English brief and no declaration; a translation of an already declared challenge is left untouched),
a single-file brief and a legacy target, printing every failure of the first side that fails
(D96–D100). The disk walk skips exactly the excluded areas and the locale folder paths; for each English
brief's slug the move also checks the translation brief paths, so one it cannot see (ignored, or
under a symbolic link) stops the run, and it reads a page only after `lstat` reports a regular file
(D116, D125, D139). Only pages move (D101); moved files keep their
mode (D102). Mismatched declaration values are reported as UP-A16 only where the teacher introduced
them (D104). `"primaryLocale": "en"` is appended only in a crossing run that moves the teacher's range, and only
when absent (D105).
Report R6 lists the moves after R5, R2 does not count them, and report R4 explains the expected
UP-A12 and asks for `pnpm redirects:generate` (D106, D120). The anchor paths of the upgrade and of
fork:init name the new home pages (D107). Upstream's move is the transform of the last legacy release (`v3.1.1`),
proven by an upstream-only test that skips in a range or a fork and picks its compared tree itself:
the working tree until the first new-layout release is tagged, that tag afterwards (D108).

## Trust Boundaries and Threat Model

| # | Boundary | Protects | Does not protect | Outside the model |
|---|---|---|---|---|
| TB1 | Repository content → build: `range.json` (traceability B-T1, U B3) | Its value is used only after it equals a member of the locale list; never interpolated into code, paths, HTML, rules or shell commands; a symbolic link is not followed; values reach messages quoted with C0, DEL and C1 characters escaped (D140). The upgrade never overwrites an existing `primaryLocale` | Anyone who can commit or merge to the range (a co-teacher, a merged pull request, ADR-0009's population) changes the root language or breaks the deploy build, the same power as editing any page; adding `primaryLocale` before a crossing upgrade keeps `en` from being recorded; bidirectional formatting characters reach messages as they are; the layout check does not look inside the excluded areas, so a symbolic link at `platform/challenge/<slug>/src` or under `platform/public/` is followed by keygen and by Vite's copy as before this epic | An uncommitted `range.json` changes local builds only; hosts build from the commit |
| TB2 | Repository content → build: page names, links, frontmatter (B-T2, Y) | Names reach only error messages, quoted in PL-E07–PL-E12 (D140); home-page links are only prefixed with a listed code and checked against the page list, and a protocol-relative one fails (D141); internal markdown links are bounded to published pages by PL-E11 and VitePress's check. The assembled frontmatter ships the declaration once per locale page, as frontmatter shipped before; a translation can no longer widen `tools` or `source_visible` | PL-E13–PL-E18 print paths and frontmatter keys bare, so a control character in a folder name or a key reaches the terminal raw there (D140); `challenge.yaml` ships whole to every learner's browser in page data, so it must hold no secret; every key in it, VitePress page keys such as `head` included, now acts on every locale page instead of one (the population that writes it is the one that wrote briefs; no denylist, D74); no automated check that the flag's value is absent from it is added (deferred, Out of Scope); stage 7 checks it once for this change (Y106) | Raw HTML links and component-built links are not checked (documented) |
| TB3 | Build → client constants (B-T3, A TA3) | The page list and the primary locale are fixed at build time; nothing at run time changes them | A teacher's chosen root language, which is the purpose | — |
| TB4 | URL → where the learner is sent (A TA1, 0008 B2) | Every redirect target is the base followed by a page-list entry, through the router. The primary-code strip runs after decoding and after the `//`, `\`, `..` rejection, removes one whole segment and must land on a primary-locale entry, or, for an unlisted primary path, on its translation counterpart's entry | A path naming a real page sends the learner there, which is the purpose | — |
| TB5 | `_redirects` → Cloudflare's edge → the learner (S TB-S1) | Every rule's target is same-origin by construction (a fixed first segment with one slug segment, or a literal page), except the old-address rule `/:splat`, whose target begins with request text; S61 gates it at stage 8 (D118) | Until S61 passes, whether Cloudflare normalises `//` and `\` before matching is unverified; a fallback rule set exists if it does not. The rule is written on every Traditional-Chinese-primary range, also one created after this release that never served `/zh-TW/…` addresses (R22 as written); S61 is observed once, and an open question asks for a re-check when Cloudflare changes its redirect handling (B88) | Cloudflare's own behaviour beyond what S60 and S61 observe |
| TB6 | Directory names → rule text and terminal (S TB-S2, TB-S4) | Slugs come from directory names; as today the targets stay on the site | Without T-0059, a name with whitespace splits a rule and an all-digit slug can shadow a number; without T-0058, names with control characters reach the hook's terminal raw | — |
| TB7 | Learner's acts → stored preference → routing (A TA2, 0008 B4) | Only listed codes are honoured, exactly; only a switcher choice and a cold load of a published translation page write | Any page can link to a `/<T>/` address and set `T`; on a Traditional-Chinese-primary range a link can now set English. Ranges under one GitHub Pages owner still share the preference (R8, OQ-018); `fork:init --rebrand` renames the `wxl-locale` key, so only ranges with the same key share it | — |
| TB8 | Session gate → navigation (A TA4, ADR-0006) | Unchanged: redirects and their lines wait for the gate's decision; a switcher's line does not | As ADR-0006: the gate is a notice, not access control | — |
| TB9 | Build environment → published pages (L) | `WXL_SMOKE_PAGES` publishes only two static pages with no script, link or data; CI's production build fails if they ship | Set to `1` in a production deploy, it publishes those two pages (integrity, not confidentiality) | — |
| TB10 | GitHub archives → the range, during an upgrade (U 0006 B1) | The base and target pristine ranges hold only files and directories; frontmatter is parsed with `yaml`'s default limits; a hostile brief in a `--from <commit>` base stops the run | A `--from <commit>` base chosen so that its moved file equals the teacher's hides an upstream change there, as 0006 B1 states | — |
| TB11 | The upgrade → the teacher's repository (U 0006 B4) | The move writes and deletes only tracked pages and new, non-ignored paths, never through a symbolic link, a submodule or a name alias; it reads a page only after `lstat` reports a regular file, and stops on a translation brief it cannot see (D125, D139); it stages nothing; the restore commands undo it; a stop writes nothing; outside values are escaped in the report | Relative links and asset imports from a moved page to a file that did not move, and links into old paths from other files, are not rewritten; a declaration value the teacher's range shares with its base's divergence is dropped without a report; on a case-insensitive file system a page spelled `Platform/…` is left to the build check | Another process changing the range during the run (0006) |

No finding in this epic can be expected under ADR-0005: it touches no challenge's taught
vulnerability, and flag exposure through the assembled page data or the display copy is ADR-0005's
defect class 3. Stage 7 checks that the files newly listed on the Traditional Chinese
selected-excerpts page are exactly those the English page already lists, and that no
scalar of any `challenge.yaml`, at any depth, contains its challenge's flag, compared without one trailing newline (Y106). The L4 player package still carries only
the primary brief's heading and first paragraph, never the declaration.

## Acceptance Criteria

"Both primaries" means the criterion holds with `P = en` and with `P = zh-TW`. Each criterion is
judged at the seam its rows name; the rows hold the literal values.

### Build and routing (area B)

- **AC-1** `readPrimaryLocale` returns `zh-TW` for an absent file, an object without an own
  `primaryLocale` (including `{}`, `{"upstream":…}`, `__proto__` only, other keys of any type), the
  last value for a duplicated key, and the value for `"en"` and `"zh-TW"`; it throws a
  `SiteLayoutError` whose code and exact first line are PL-E01 for a directory, FIFO or symbolic link
  (the target never read), PL-E02 with the errno for an unreadable file (skipped as root), PL-E03 for
  empty, unbalanced, BOM-prefixed, commented or trailing text, PL-E04 for every non-object, PL-E05
  for every non-string value, PL-E06 for every string off the list (with C0, DEL and C1 characters
  escaped by one quoting function equal to create-wxl's `jsonStringifyEscaped`, B95); the
  configuration reads only the repository root's `range.json` (a fixture whose root file says `en`
  and whose `platform/` and `.vitepress/` files say `zh-TW` ships `"en"`) and ships `"zh-TW"`
  upstream in each of B14's 16 environments (`SITE_BASE`, `CF_PAGES`, `WXL_SMOKE_PAGES` and a probe
  `WXL_PRIMARY_LOCALE`, each set or unset), and reports an invalid `SITE_BASE` before a `range.json`
  error; a `range.json` edit takes effect in `pnpm docs:dev` only after a restart, as V-B6 observes.
  (B1–B16, B95)
- **AC-2** The locale list module exports exactly `['en', 'zh-TW']`, `zh-TW` as the default primary
  and an exact-match `isKnownLocale`; outside it, `.vitepress/` and `platform/shared/` hold no
  `KNOWN_LOCALES`, no union, array or `||` comparison chain of locale codes (PAT1; one written across
  lines is found by stage 6's reading, D132), and every table keyed by locale code is
  typed `Record<Locale, …>` (D132); the set of message files equals the list and `localesConfig` has
  one key per member. (B17–B19)
- **AC-3** `checkSourceLayout` returns for a valid new-layout tree under both primaries (also with
  the translation folder empty or absent), and otherwise throws, for the first violated rule only,
  PL-E07 (symbolic links in the searched area, `platform` itself included; the walk does not
  descend), PL-E08 (every page
  directly in `platform/`, in an unlisted top folder, or in `platform/challenge/` outside `src/`,
  the flat legacy brief included), PL-E09 (an entry of a locale folder named like a listed locale) or
  PL-E10 (the primary home page missing), listing every violating path sorted; `src/**`, `public/**`,
  `shared/**`, dot-prefixed, `node_modules/`, `dist/`, `.MD` files and non-page files are neither
  pages nor violations; a missing non-primary home page and a translation-only page are allowed; on a
  copy of the tree at the old layout, `docs:build`, `docs:dev` and `docs:preview` each exit non-zero
  and their stderr contains the PL-E08 first line followed by the listed paths, with no other PL line
  (pnpm's banner and VitePress's own prefix may come first); `challenge:keygen`, `redirects:generate`
  and `challenge:validate`, invoked as `node --experimental-strip-types scripts/<tool>.ts`, each exit
  non-zero with the PL-E08 first line as the first line on stderr and process no challenge (no
  `[skip]`, `[done]` or `✓` line, no file written). (B20–B38, B91)
- **AC-4** `rewrittenPath` removes exactly a leading primary-folder segment; `rewrites` is that
  function; for both primaries `pageListFromDir` equals the "Source path → URL" column and holds no
  duplicate entry; the shipped page list equals an independent oracle that reads `range.json` itself;
  the published HTML set equals the source set mapped the same way; `classifyArrival` maps a rendered
  `relativePath` to its entry; `localeIndex` is `root` on primary pages and the code elsewhere;
  `__WXL_PRIMARY_LOCALE__` is `"zh-TW"` upstream; upstream's output puts the Traditional Chinese
  pages at the root and the English ones under `en/`, with no `zh-TW/` folder; the dev server serves
  the same mapping. (B39–B49)
- **AC-5** `transformPageData` reads a challenge page's body through its source path, for a primary
  page (whose rewritten path names no file) and for a translation page, and adds no body to other
  layouts. (B50–B52)
- **AC-6** `localesConfig('en')` deep-equals today's literal and `localesConfig('zh-TW')` the schema
  example; every non-root key carries its code as link and prefix; built pages carry their locale's
  `lang`; the site title and description stay site-level and the configuration keeps exactly one
  0003 A6 `title:` line and one A9 `siteBase` line; the nav-bar title links to the page locale's home,
  under both bases. (B56–B61)
- **AC-7** `localizeHomeLinks` reads exactly `hero.actions[*].link` and `features[*].link`; it
  leaves a primary page's site-absolute link as written, prefixes a translation page's with its
  code, leaves external links and anchors unchecked, and throws PL-E12 naming the field for a
  relative link, a protocol-relative `//` link (B94), a link whose whole first segment is a listed
  code (`/english/` and `/zh-TWx/` are not), a link that names no published page
  (a translation home's link to a page that translation lacks included, with no fall-back), and a
  non-string; other fields are returned unchanged; only `layout: home` pages are touched; upstream's built
  hero buttons have the hrefs of the "Home-page links" table under both primaries. (B62–B70, B92,
  B94)
- **AC-8** A same-folder relative link resolves inside its locale under both primaries; a link whose
  resolved URL's first path segment equals the primary locale's code throws PL-E11 naming the page
  and the link (and stage 8 shows VitePress's own check passes it), while `/english/x` or `/zh-TWx/y`
  does not; a link into a non-primary folder resolves to that folder's page (B73);
  `ignoreDeadLinks` stays unset; the Traditional Chinese notes page links to
  `../reference/attack-log-export-format.md`; every list and home page imports the one loader. (B71–B79)
- **AC-9** `.vitepress/theme/Layout.vue` is gone and nothing names it; upstream serves Traditional
  Chinese at `/` and English at `/en/`; `site-smoke.spec.ts`'s English assertions use `/en/`; the
  exploit suite passes unchanged. (B80–B83)
- **AC-10** The READMEs' move section (headings exactly as PL-E08 names them, B84's eight manual
  steps in order — merge the release first, move the pages, split the declarations, the one loader
  and `:lists`, home links from the locale home, stray files, `primaryLocale` `en` even for a fork
  with nothing to move, build — the `--from` note, one line per PL code, the reserved
  `smoke-fixtures/`), their passages on changing the primary locale
  later and on `primaryLocale` in the setup record, ADR-0008's two dated notes (PL-E11; which pages must exist in
  the primary locale), the close-out's
  open-question updates, the retrospective's release-note input and the GLOSSARY edit (with
  `glossary.test.ts` passing) each hold the content its row lists. (B84–B90)

### Learner arrival (area A)

- **AC-11** For every DT row, under base `/` and `/repo/`, for a challenge and an article, with a
  query and a hash, the cold load redirects or stays, shows the line or not after the session gate's
  decision, and writes or not, exactly as the row states; a redirect is one `go(target, { replace:
  true })` to the base plus a list entry; an alias URL is identified by its rendered page; a landing
  after a server redirect or a reload is classified by the landing page. (A1–A10, DT01–DT80)
- **AC-12** With no preference, no page arrival shows the line except a not-found redirect's
  landing; with a stored translation locale, a later navigation onto a primary page without it shows
  the line in that locale, and the reverse; `DEFAULT_VISITING_LOCALE` exists nowhere; `readStoredLocale`
  returns exactly `en` and `zh-TW` and `null` for every other value and for unreadable storage.
  (A11–A13)
- **AC-13** Each not-found input of A14–A18, under both primaries and both bases, gives the stated
  target and requested locale (translation path → `/X` with the line in `T`; primary-code path →
  `/X` with no line, including `/<P>`, `/<P>/`, `.html` forms, or, when only `/<T>/X` is listed,
  `/<T>/X` with the line in `P`; primary path → `/<T>/X` with the line in `P`) or the not-found page; double, malformed and crafted prefixes end on the not-found page
  without a throw; every target is the base plus a list entry; nothing is written; at most one
  not-found redirect and no cold-load redirect after it; cold load and client navigation behave
  alike; Back returns to the page before. (A14–A20, A39)
- **AC-14** Each SW row's decision, history behaviour, line and write hold through `switcherDecision`
  and the real Layout; the menu's title is the page locale's label, its options are the list minus
  the page locale plus the page locale while the line shows, and a test iterating the list fails for a member without a label key (shown
  once at stage 6 by adding a third code temporarily); on the not-found page or a failed load the switcher navigates to the lookup's
  counterpart or stays, never with a line; with storage refusing writes the choice holds for the tab.
  (A21–A24, SW01–SW16)
- **AC-15** Under both primaries `wxl-locale` changes only after a switcher choice (to the choice)
  and a cold load of a published translation page (to its locale); a primary-locale cold load, a
  not-found arrival or redirect, a failed load, a cold-load redirect, a link, Back and Forward leave
  it unchanged. (A25)
- **AC-16** `detectLocaleFromPath`, `localizePath` and `pageLocaleOf` give every tabled result under
  both primaries (`localizePath` never strips the primary's code and is idempotent); `MergedNav`,
  `ChallengeList`, `HomeContent` and `LocaleSwitcher` derive the page locale only through
  `pageLocaleOf`, in SSR output and after mount; the interface locale follows the URL on bootstrap and
  on every route change. (A26–A29)
- **AC-17** The line's sentence, link text, `lang` and `href` equal the canonical literals for each
  requested locale under both primaries and both bases; the mark's strings are unchanged under both
  primaries; a unit test fails when the locale list has other than two members, with message GD1, which names
  the Japanese epic. (A30–A32)
- **AC-18** A session-gate "clear" does a full load of the root without running the held redirect,
  and the root's cold load then follows A1–A3. (A33)
- **AC-19** The troubleshooting pages, the READMEs' preference sentences, every code comment named in
  the traceability's "Overridden contracts › Area A" row "Comments (A36)", and the GLOSSARY 主語系
  entry state the rules above and are true under both primaries; none
  says English is the root, `'root'` means English, that a default visiting locale exists, or that a
  learner with no preference sees the primary locale (they see the locale of the address they
  opened).
  (A34–A37)

### Lists, home page, smoke fixtures (area L)

- **AC-20** `mergeLocaleChallenges` returns one list per listed locale; a challenge with a primary
  brief is in every list (from its own brief, or borrowed from the primary brief with the primary's
  locale and URL), a challenge without one is in no list; order is by slug and `id` is the position,
  equal in every list and independent of input order and of `P`; slugs compare exactly; every field
  follows L-§4.2 with defaults from the list locale's string table; keys on the wrong side are
  ignored; this holds with a three-locale argument; no default text remains in `platform/shared/`.
  (L1–L18)
- **AC-21** The loader's `watch` is built from the locale list and covers `challenge.yaml`; it
  parses dates with the one YAML parser; a listed challenge whose declaration is absent or invalid
  fails the loader with PL-E13 or PL-E14's text; a dev server reload follows a declaration or brief
  edit; entry URLs are base-less and the components add the base once. (L19–L22)
- **AC-22** For each of the four (`P`, `localeIndex`) combinations, in SSR output and after mount
  with the runtime locale set to the other locale, `ChallengeList` and `HomeContent` render
  `lists[pageLocale]` and every CS3–CS10 and CH1 string in the page locale and never the other's; the
  h1 comes from the list page's frontmatter `title` and the subtitle from its `subtitle`, each absent
  when the value is empty, absent or not a string (L24); the empty state and the dates
  (UTC, the page locale's tag, identical in three time zones) are page-locale; borrowed entries carry
  the mark and the primary's `lang`, the primary's list has neither; home counts are equal across
  locales; search, filters, sort and the solved badge pass their existing cases with the new URLs
  (L31); a missing `lists` prop (the old `:challenges="data"` included) renders an empty list and
  calls `console.warn` once per component instance with LW1 naming the page (D131), while `lists` without the page locale's key warns nothing; the
  list pages' `<meta name="description">` stays the site's; on the built upstream test build, `/challenges`, `/en/challenges`, `/` and
  `/en/` show the same strings with JavaScript disabled and after hydration. (L23–L28, L30–L33,
  L45, L46)
- **AC-23** Only `WXL_SMOKE_PAGES=1` publishes the two fixture pages, and the page list and
  `srcExclude` agree through `isSmokeFixturePage`, which, like every `smoke-fixtures` literal,
  is outside the client entry's import graph; CI's production build fails if any trace of
  `smoke-fixtures` ships; the smoke suite fails fast with a message naming the flag when a fixture
  is missing; `missing-translation.spec.ts`'s cases run on the fixtures (no case names the export
  format reference) and pass; the page-list spelling test passes on the test build. (L34–L39, L47)
- **AC-24** The Traditional Chinese export-format reference has the English page's headings, table
  rows, fenced blocks and inline code; the notes page links to it in its own folder; the
  upstream-only completeness test passes upstream, is skipped in a range, and fails naming page and
  locale when a translation is missing. (L40–L42)
- **AC-25** The exploit specs, the template and the blind default keep
  `http://localhost:5173/challenge/<slug>/`, which opens the primary brief without a redirect, and
  `pnpm test:challenges` passes. (L43)
- **AC-26** Each passage LH1–LH5 (traceability "Overridden contracts › Area L", H rows) says what
  its row states, in both languages. (L44)

### Short links, numbers and the hook (area S)

- **AC-27** For each P × primary brief × translation brief case, a challenge's four numbered rules
  equal the S-§4.1 or S-§4.2 lists (targets in the form's locale, else the primary's, else the first
  locale with a brief; never an address that would hop); untracked or ignored translations re-point
  rules rather than removing them; an orphan gets all four rules to its only page; a challenge with no
  brief gets none; no `range.json` and a keyless one generate the same bytes as `zh-TW`; each
  `range.json` failure throws its PL line and leaves any existing file unchanged. (S1–S11)
- **AC-28** Rules are ordered by number and then form, deterministically, padded to three digits
  with four-digit numbers kept; a declaration without a valid number, or two with one number, are
  refused naming the files; a brief's `number` is ignored and `number-locales` is gone; a brief
  without a declaration is refused in full mode; `collectChallengeNumbers` reads only declarations;
  `nextChallengeNumber` reserves live, retired-declaration and legacy retired numbers; an unlisted
  locale folder changes nothing; `isChallengeNumber` accepts exactly the safe integers from 1 and
  the generator never spells a number with an exponent. (S12–S21, S75)
- **AC-29** The slug rules follow S-§4.1 or S-§4.2 by `P`; the old-address rule is the last rule
  exactly when `P = zh-TW`; every numbered rule precedes every dynamic rule; the header and section
  comments equal K1–K5 with the computed counts (400 with an injected fifth form). (S22–S27)
- **AC-30** The committed `_redirects` is byte-identical to generation over git's index with the
  index's `range.json`; every committed rule matches one of S30's three shapes (the numbered regex, the
  `P`-specific slug list, the old-address rule); the shadow check treats the splat as shadowing every
  later `/zh-TW/` rule and finds nothing (S31); every target resolves through the page-path mapping,
  with the primary's challenge folder required and a slug folder without `index.md` ignored (D127); `briefFaults` returns `[]` on
  the repository and, for each fixture case under both primaries, exactly the faults S35 counts
  (one `missing-primary` per slug, one `missing-declaration` per brief, one `old-layout` per path),
  returned in S-§4.7's order, with S-§4.7's example verbatim. (S28–S35)
- **AC-31** The hook triggers on every challenge path of the listed locales' folders, `_redirects` and
  `range.json`, and on nothing else (a change only under `platform/public/challenge/`,
  `platform/shared/challenge/` or an unlisted folder ends in 0007 O1 and never reaches validation or
  W4, S80); brief paths of listed locales reach validation; a new challenge, an added or
  deleted translation, untracked and ignored translations, a staged `range.json` change in either direction,
  its staged deletion, an `upstream`-only change and an unstaged one each end as their rows state
  with the staged `_redirects` equal to the oracle (S41, S42, S74, S77–S79); validation and the
  generator both take the primary locale from the index, so a working tree that disagrees changes
  neither outcome (S76, D122); a `range.json` failure ends in 0007 O4 with its PL line and nothing
  changed, or in 0007 O3 with the same line when the commit also stages a challenge path; faults already in the
  index end in 0007 O4 with the exact W6 lines and W6r once; faults the commit stages end in 0007 O3
  with the validator's message and no W6 line; retiring and un-retiring move the rules; W4a and W4b
  equal S-§4.5's texts with `<dir>`, `<L-name>` and `<P-name>` filled, per S47's cases; a staged
  `primaryLocale` change while a challenge lacks the new primary locale's brief ends in 0007 O4 with
  W6a naming it and nothing changed; a brief carrying `number` is refused by
  validation; every other existing hook case passes on the rebuilt fixtures. (S36–S49, S73, S74, S76–S80)
- **AC-32** If stage 4 takes them: a whole untracked locale folder is named by W4 with control
  characters escaped and a cached-only removal exits 0 (T-0058); slugs outside the grammar and
  number-shadowing slugs stop generation in both modes (T-0059). If stage 4 declines either ticket,
  AC-32's part for it leaves the claim table and the close-out checks that the ticket's file has
  status `pending` with a new `revisit_when` (T7). (S50, S51)
- **AC-33** `challengePagePath` gives the four tabled results and is the generator's only source of
  targets; in both lists and both primaries every numbered entry (translated or borrowed; an
  orphan translation brief is in no list) has one copy control giving `<origin>/<list locale>/c/NNN` in short mode and the page-path URL in
  page mode; an unnumbered entry has none; the nav control follows the page's locale; the built
  upstream site shows one page-mode control per numbered challenge in both lists. (S52–S56)
- **AC-34** The comments, README passages, GLOSSARY entry and skill sentences of S64–S72 are true for
  both primaries, in both languages where two exist. (S64–S72)

### The challenge declaration (area Y)

- **AC-35** `readChallengeDeclaration` reads each upstream file to the Y-§2.4 value, keeps dates as
  strings, accepts a leading document marker, and reports `absent`, `not-a-mapping`, `invalid-yaml`
  and `multi-document` for the listed inputs (`invalid-yaml` also for a duplicate key, an alias
  expansion over the limit, an alias without its anchor and an unresolved tag; `<<` an ordinary key; `yes` a string, D129); `validateChallengeDeclaration` requires `backend` and
  `app` (a string), keeps today's messages for every other key, rejects brief keys with VM5 in file
  order, passes unknown keys through, retires the legacy fields with no `fs` warning, returns the
  stated defaults, and accepts `number` only as a safe integer ≥ 1. (Y1–Y21, Y104, Y112)
- **AC-36** Upstream briefs validate in both locales; a brief carrying any key but `title`,
  `layout`, `description` fails with VM6; `title`, `layout` and `description` failures give VM7–VM9;
  a brief without frontmatter or with invalid YAML fails with VM14 or VM15; a missing primary brief fails with VM10 at
  the primary's path for each `range.json` state; a brief without a declaration is discovered and
  fails with VM1; an unlisted locale folder is ignored; the command, with or without a slug, reports
  legacy pages with PL-E08 before any check; an unknown slug and an unusable `range.json` exit 1 as stated;
  a stray entry in a challenge directory fails the `structure` check with VM13. (Y22–Y37, Y103)
- **AC-37** `assembleChallengeFrontmatter`, called with the source path, returns brief ∪
  declaration ∪ body for every upstream brief in both locales (the declaration projection equal
  across locales) and `null` for other pages, gives each locale page its own body under rewrites,
  passes schema errors through to validate, keeps `__proto__` and `constructor` as own keys without
  changing any prototype (Y113), and throws PL-E13–PL-E18 for the listed cases, which
  `docs:build` reports; both locales' built challenge pages show the same badges, number, tool tabs
  and Source tab, and on each the `wasmModule` response is 200 and the Browser panel's address input
  is enabled within 30 s; stage 7 finds both of Y106's checks hold (the Traditional Chinese
  selected-excerpts page lists exactly the English page's files, and no scalar of any
  `challenge.yaml` contains its flag, compared without one trailing newline). (Y38–Y48, Y106, Y113)
- **AC-38** `ChallengeLayout`'s slug comes from the parent folder for both path shapes; a module
  without `wasm_fs_list` shows the runtime error naming `pnpm challenge:keygen`; stage 8 shows the
  same tool surface on both locale pages. (Y49–Y51)
- **AC-39** keygen processes only challenge directories with a `challenge.yaml`, writes `wasmModule`
  there (deleting legacy fields, other lines unchanged, no brief touched), leaves each upstream file
  byte-identical after `--force`, writes nothing when the bytes would not change, is stale only for
  the declaration, `src/`, `.fsignore` and the template, converges on a second run (or the ticket
  stops for the user, D133), aborts on a
  payload failure with both files unchanged, ignores flat files, keeps every `source_files`
  failure, and on an unusable `range.json` exits 1 with its PL line first and writes nothing
  (Y107). (Y52–Y61, Y107)
- **AC-40** retype changes only the named keys of `challenge.yaml` (comments, order and briefs
  byte-identical), refuses a slug without one, keeps the backend-swap flow, and never reads a brief;
  analyze titles from the primary brief (slug fallback), reads the rest from the declaration,
  discovers only challenge directories, and on an unusable `range.json` exits 1 with its PL line
  first. (Y62–Y69, Y108)
- **AC-41** `create:challenge` writes the primary brief for each `range.json` state (and nothing in
  another locale), refuses an unusable `range.json` with its PL line and a byte-identical tree, writes
  the brief with exactly `title` and `layout` and the declaration with exactly the eight listed keys
  in order, uses the locale's default title and `TODO` body unless `--title` is given, has scaffold
  text for every listed locale, refuses a slug held by any challenge directory or locale brief folder
  with CC1 and nothing written, produces a scaffold that validates, names the brief path in W1
  and W2, and refuses a legacy-layout tree with PL-E08 before writing anything. (Y70–Y85, Y105)
- **AC-42** The release gate's L1 and L2 fail with VF1 without a declaration, with the PL line on an
  unusable `range.json` (Y109), and report failed labels otherwise; `deriveSlugs` maps declaration,
  `src/` and listed-locale brief paths (absolute and backslash forms too) to slugs and ignores the
  rest, a brief folder's other files and a folder without `index.md` included, also in the hook's 0007 W4 listing (Y111, D127); lint-staged reports LS1, removal and VM1 as
  stated; the hook blocks a brief with a forbidden key; the L4 package is the primary brief's heading
  and first paragraph for each `range.json` state (and throws the PL error on an unusable one,
  Y110), throws PP1 without it, and contains no `wasmModule`, `app`, `flag` or `source_files` value
  of `challenge.yaml` as a substring. (Y86–Y93, Y109–Y111)
- **AC-43** The wxl-create, wxl-mutate and wxl-verify skills (this epic's change the same in both
  trees, D135, as PAT6 checks per ticket), the READMEs,
  CONTRIBUTE, the pipeline and layout docs and the learner guides say what Y94–Y100 state; with
  `pnpm dev` running a `challenge.yaml` edit shows on the challenge page only after a restart.
  (Y94–Y101)

### The upgrade's move (area U)

- **AC-44** The teacher's range is moved exactly when it holds a legacy page and the base exactly
  when the base does, whatever the version or `--from` form; a run that ends at step 6 or at step 7's
  repeated checks moves and writes nothing; the page predicate classifies each tabled path as stated.
  (U1–U9, U11, U151)
- **AC-45** `planLayoutMove` moves each legacy page to the English folder with identical bytes,
  splits an English brief into the brief (fences, kept groups, body) and `challenge.yaml`
  (declaration groups), each line byte-identical with its own ending, groups in order, a BOM only in
  the brief; strips the declaration groups of each translation brief whose challenge has an English brief,
  leaves those of an already declared challenge untouched (a new-layout tree with one stray page gives
  that page's move alone); is deterministic; moves a legacy page named like a locale like any other page, which the next
  build then refuses with PL-E09 (U150); and is a no-op on a tree without legacy pages. (U20–U24,
  U26, U27, U30, U31, U146, U150)
- **AC-46** UP-A16 is reported once per (translation brief, key) exactly for introduced mismatches,
  comparing values as `yaml` parses them; `challenge.yaml` always carries the English value; the
  base's own `selected-excerpts` mismatch is not reported. (U40–U49)
- **AC-47** Each token row's stop ends the run with one UP-E14 line per failure of the first side
  that fails (target, base, range), in the stated order, side and sentence (a base line is the head
  and the base remedy only), exit 1, before step 9, with nothing written and no temporary directory
  left; a dangling non-page link, an NFD name and the excluded areas cause no stop and stay
  untouched; an ignored or symbolically linked translation brief the transform would strip stops
  the run, one line per brief path (U153, D125); a page path that becomes a link or a FIFO after
  0006 step 4 is never read, the link failing `symlink` and the FIFO ending the run with UP-E11
  without blocking, while a page replaced before the run ends at step 4 with UP-E03 (U154, D139);
  read errors are UP-E11 and git command failures CW-E14, each without an UP-E14 line, also beside
  failures already collected (D142). (U10, U12, U25, U27–U29, U50–U63, U144, U148, U153, U154)
- **AC-48** The merge runs on the moved base, the teacher's file through the move plan and the
  target, each destination ending as 0006's row for it says, the move op standing wherever the merge
  leaves the teacher's file; sources are deleted and destinations, stripped translation briefs included (U149), written only
  in step 9; `HEAD` and
  the index never change; moved files keep their mode; emptied folders stay. (U32, U70–U85, U149)
- **AC-49** After a completed crossing run that moves the teacher's range, `range.json` has
  `"primaryLocale": "en"` as its last key exactly when it had no such own key; an existing value of
  any kind is kept (a kept `zh-TW` then leaves English-only challenges without a primary brief, which
  validate reports, U140); a run that is not crossing, or does not move the teacher's range, writes
  0006's result, so an English-only challenge such a run moves then fails VM10 in the kept primary
  locale (U9, U151); UP-E09 leaves it unchanged; a `range.json` without `upstream` and no `--from` still
  stops with 0006's UP-E06 `upstream`. (U2, U3, U9, U90–U94, U140, U143, U151)
- **AC-50** The report prints report R6 after R5 exactly in a moved run with the stated lines and
  order; R2 excludes move ops; R3 prints UP-A16 with path and key; R4's crossing line and its
  redirects line appear exactly in a crossing run (the crossing line only when R3 holds UP-A12);
  every new code exists in both tables and starts with its code; outside values are escaped; reports
  of runs without a move are unchanged. (U48, U64, U100–U108, U138)
- **AC-51** `ANCHOR_PATHS` is the nine paths of D107 and fork:init's home paths are the two new home
  pages; a crossing run reports UP-A12 when an anchor differs on the moved base and the target;
  fork:init rewrites both new home pages and refuses a legacy tree with its A7 missing-file error in
  0003's unchanged format (`A7: platform/en/index.md is missing`), and, until epic 0011, a tree
  without its translation home the same way, under either primary (`platform/zh-TW/index.md` or
  `platform/en/index.md` missing, U145, U152); create-wxl's create path and the upstream-pristine test
  read the new paths. (U13, U110–U116, U145, U152)
- **AC-52** After a completed or failed moved run, `git checkout -- . && git clean -fd` gives an
  empty porcelain status, `HEAD`'s files and byte-identical ignored files; signals and failures leave
  no temporary directory. (U82, U94, U120–U124)
- **AC-53** On upstream, the transform of the last legacy release's `platform/` (`v3.1.1`; no newer
  `v*` tag is in the legacy layout) equals the compared tree (the working tree until the first
  new-layout `v*` tag exists, that tag afterwards) except the paths of the test's exception table,
  which equals U-§5 at the close-out, every addition to either approved by the user and recorded in
  that ticket's stage 6 disposition (D130); a path outside it that differs fails; the test fails (not
  skips) on upstream without the tag, is skipped in a range or a fork with or without the tag, and
  imports the published module; the transform of each of `v3.0.0`, `v3.1.0` and `v3.1.1` has no
  failure and only selected-excerpts' `source_files` mismatch; every job that runs the root suite
  on upstream checks out tags; create-wxl's locale list and page predicate equal the site's.
  (U130–U134, U136, U139, U142, U147)
- **AC-54** The GLOSSARY's 設定紀錄 and 搬家 entries each state D105's three conditions for recording
  `en` (upgraded from a legacy-layout upstream version, the range itself moved, no primary locale
  recorded yet), each present as U135 spells it, and the READMEs' upgrade section states the move as
  U137 lists, both languages. (U135, U137)

### Stage 8

- **AC-55** On copies of the tree (F-6), each case of PL-E01–PL-E14, PL-E17 and PL-E18 fails
  `docs:build` with its first line (PL-E15 and PL-E16 are V-Y3's), VitePress's own check passes the
  PL-E11 link with that rule disabled, and the old `../../reference/…` link builds under `en` and
  fails VitePress's dead-link check under `zh-TW`; an `en`-primary build lays out files per the `en`
  column; on F-1's preview and on F-3 (redeployed with `en`) the home buttons, the reference link
  and the nav title reach the stated pages; a fork at the old layout fails `pnpm build` with PL-E08 as its only PL line; on F-6 the dev
  server serves both locales and follows a `range.json` edit only after a restart.
  Surfaces: terminal and Browser panel as each row names. (V-B1–V-B6)
- **AC-56** Each VA row's redirect, landing, line and stored value holds on its surface: F-1's
  Cloudflare preview (including the old address through the server rule, short links, a not-found
  path, the session-gate clear, the switcher at 1280, 1024 and 375 wide), F-3 on GitHub Pages
  (including the old address through the not-found strip and crafted paths staying on the origin,
  a missing translation in each direction and an old address to an English-only page,
  and, redeployed with `P = en`, a cold-load redirect, the `/en/` strip, a missing translation and
  the switcher), and F-2's Cloudflare preview with `P = en`; the terminal greps of VA4 print nothing.
  (VA1a–VA1m, VA2a–VA2l, VA3a–VA3e, VA4)
- **AC-57** The served and hydrated list and home strings, dates, marks, copy controls, empty state,
  stats, fixture absence from production, dev-server list updates, the exploit page's primary brief
  and F-2's `P = en` lists hold as VL1–VL9 state on their surfaces; copy controls on a preview show
  `wxl.browserlab.online` (`SITE_ORIGIN`). (VL1–VL9)
- **AC-58** On F-1's and F-2's previews each short link's first hop is the stated 302 and
  `Location`; S59's precedence is observed and recorded (true or false; false means one extra hop and
  is not a failure, D60); old addresses reach the root, and doubled prefixes and a `platform/public/zh-TW/` file are
  observed and recorded (S60, D138); no crafted path, single- or double-encoded slashes and
  backslashes, tab, CR and LF included, gives an off-origin `Location` (S61, the only gate: a failure stops the ticket for the user's choice, D118); the copy
  controls show `wxl.browserlab.online/<list locale>/c/NNN` and their targets are checked by
  requesting the same path on the preview; on a scratch clone of F-2 the hook re-targets
  rules after a translation and after a `primaryLocale` change. (S57–S63, V-S1–V-S7)
- **AC-59** On F-6, `create:challenge` writes the primary-locale scaffold for each primary, a
  misplaced key fails validate and the build with the stated codes, retype and keygen change only
  what they state, the L4 package built without running an agent is the primary brief, a dev
  server shows a declaration edit only after a restart; on F-1's preview both locale pages of each challenge show the same tool surface.
  (V-Y1–V-Y8)
- **AC-60** With the tarball from the pushed head, a `create-wxl@3.0.0` range with the teacher's own
  challenge and pages upgrades as V-U1 states (report items, `range.json`, moved and merged files);
  fork:init and `pnpm build` then pass and the restore commands empty the status; the upgraded range
  serves English at `/`, Traditional Chinese at `/zh-TW/` and the English declaration on both
  challenge pages; a fork of `v3.1.1` upgrades with `--from 3.1.1`; the same fork after pulling the release
  (conflicts resolved for the release and recorded) fails with PL-E08 and builds after the README's
  manual steps (its teacher page listed by PL-E08, or already moved by git's rename detection,
  either recorded), and the README's steps 2–8 alone, after checking out every path of the release
  outside `platform/` plus `platform/shared/` and `platform/public/` in place of step 1, also give a
  building site; the upgraded range's unit suite passes; a fork with no page of its own pulls the release, builds and serves Traditional Chinese at
  the root until `range.json` records `en`. (V-U1–V-U5)
- **AC-61** Each test D124 lists is upstream-only: declared through one helper that skips it with
  the upstream decision's reason in a range and in a fork and runs it on upstream (stage 6 checks
  each uses the helper); upstream's CI cannot skip them silently, because the `test` job's existing
  expectation check fails under `WXL_EXPECT_UPSTREAM=true` when the decision is false and the smoke
  job reads the same decision; every other test that reads the real tree derives its expectation from the
  primary locale and the tree (stage 6); on a scratch clone of F-2 (`P = en`, a range) `pnpm test
  --run` and the smoke suite on a test build pass. Surface: terminal. (B93, V-B7)

## Testing Decisions

- Test external behaviour at the seams of the traceability's seam table: pure functions over their
  arguments (the primary-locale parser, the layout check, the page list, the routing decisions, the
  merge, the brief check, the transform, the report builder); components rendered by SSR and by
  mount; command-line tools run on temporary trees outside the repository; the upgrade's `run` on a
  real git repository with fixture archives; the hook on a real repository. No test asserts on
  internal state.
- Every rule that depends on the primary locale runs under both primaries. No test relies on the
  client module's fallback value; each sets `P` explicitly (D31). Before its first red test, the
  switch ticket adds that module alone and runs the suite; every existing test its `zh-TW` fallback
  flips is listed under "Overridden contracts", except a test changed only to set `P` (an argument
  or a mock of that module) with its assertions unchanged, which is allowed and which stage 6 checks
  is changed only so (T1). Tests choose `P` through function
  arguments or a fixture tree's own `range.json`, never an environment variable (D21).
- Messages are pinned by literal equality: PL-E01–PL-E18 first lines, VM1–VM10 and VM12–VM15 (VM11
  retired), the hook's W4a–W6r, the `_redirects` comments K1–K5, UP-E14's head, token sentences and
  base remedy in both languages, UP-A16, the list components' LW1 warning, the two-locale guard's
  GD1, the report's R4 and R6
  lines, the line's sentences and the list strings (read from the string tables).
  Third-party wording (VitePress's not-found page, ICU date output, Cloudflare behaviour) is never
  pinned: it is identified by element, computed in the test, or recorded at stage 8.
- Prior art: `page-list.test.ts` and `config-base.test.ts` (configuration and page list),
  `initial-locale-redirect.test.ts`, `arrival.test.ts`, `not-found-wiring.test.ts`,
  `theme-locale-wiring.test.ts`, `locale-switcher.test.ts` (routing), `ChallengeList.test.ts`,
  `HomeContent.test.ts`, `merge-challenges.test.ts` (lists), `redirects*.test.ts`,
  `challenge-numbers.test.ts`, `pre-commit-sh.test.ts` (short links and hook), `config.test.ts`,
  `challenge-validate.test.ts`, `challenge-keygen.test.ts`, `create-challenge*.test.ts` (declaration),
  `create-wxl/test/upgrade-*.test.mjs` (upgrade), the site-smoke suites on a test build.
- Existing tests named under "Overridden contracts" change with this epic; stage 6 checks each change
  is the one that table states and rejects a change to any other test.
- Upstream's CI smoke builds upstream (`P = zh-TW`) with `WXL_SMOKE_PAGES=1`; every range's CI
  runs the same unit and smoke jobs on its own tree, so a test that asserts on upstream's own
  content is upstream-only (D124) and every other one derives its expectation from the primary
  locale (D54); V-B7 runs both suites in an `en` range. `P = en` is otherwise covered by unit rows
  and stage 8. Stage 8 runs on the fixtures F-1–F-6 (D119), on the surface each row names, with
  challenge pages opened with their Browser panel open; the upgrade's rows run locally with a tarball,
  since publishing is not part of this epic (R31).
- Keygen's convergence (Y58) is measured in a scratch clone at stage 5 before its test is written.

## Out of Scope

- Epic 0011: create-wxl's primary-locale question, fork:init's `--primary-locale` (and its R2
  revision, R4), the translation-skeleton command, wxl-create's question after authoring, and R25
  (UP-E04's wording when `range.json` has no `upstream`). Until then a teacher chooses the primary
  locale by editing `range.json` (R13).
- Japanese (`ja`): its content, interface strings and create-wxl option; the parameterised line and
  mark the two-locale guard points at (D33); the order among several translations for a not-found
  primary path (D27).
- Isolating the locale preference between ranges under one GitHub Pages owner (OQ-018, R8); note that
  `fork:init --rebrand` renames the `wxl-locale` key, so only ranges sharing the key share it.
- Publishing create-wxl or a release (R31): the epic's close-out does not wait for a release; the
  next release waits for T-0074 (handoff), and `pnpm range:upgrade` through the registry is checked
  after it.
- T-0064 (G4's empty `core.hooksPath`, a maintenance ticket of epic 0005's chain analysis): not touched here; it stays a maintenance ticket outside this epic.
- A redirect for upstream's old unprefixed English URLs (R20); the release note says so.
- A mirror old-address rule for `/en/` on English-primary ranges, or any other primary (S-O6).
- A flag-exposure check on `challenge.yaml` and briefs (deferred, N20; an open question at close-out).
- Replacing the interface word 挑戰 in navigation, lists and the home page (L-O3; an open question),
  including the `challenge_list.default_title` value `網站攻防挑戰` that D42 moves into the string
  table.
- Server-rendered `$t` strings outside the lists and the home page (the challenge layout, guide
  components): they render `en` until hydration, as on `/zh-TW/` pages today, now also on a
  Traditional-Chinese-primary root (D128; an open question).
- A per-locale site `description` (B-O5); a short-link rule shadowing a page whose URL starts with a
  rule form (`/c/`, `/<L>/c/`, `/zh/c/`), in any locale folder (B-O8); a CI build of an
  `en`-primary site (B-O2), which would use a fixture copy with its own `range.json` (D136).
- A tool that changes the primary locale later (Q18): the README states the cost.
- Rewriting relative links or asset references in moved pages (D95, D101).

## Further Notes

- Upstream's own move is produced by `planLayoutMove` on its tree, so a teacher's base pristine range
  after its move equals what upstream ships and merges cleanly (R15, D108). The upstream-equality
  test (0010-S49) compares the working tree until the first new-layout release is tagged and that
  tag afterwards, choosing by itself, so no release ticket has to switch it and later page edits do
  not break it; it is skipped in ranges and forks (U-O4, superseded).
- A crossing upgrade always reports UP-A12, because this epic changes `.vitepress/config.mts`; the
  report says it is expected (R24, D106).
- N17's GLOSSARY sentence (搬家's; 設定紀錄's working-tree sentence already states D105) must
  change. U135's two sentences on the upgrade's `en`, 設定紀錄's and 搬家's, land with the upgrade's
  move ticket (T4), and the rest of the working-tree GLOSSARY edit lands with the switch ticket (T1)
  (U135, B90, which also aligns 主語系, 翻譯, 語系偏好, 短連結, 舊版面 and 語系清單 with this
  spec and removes the `_新造詞_` line of every term this epic's corpus starts to use); until then
  this spec's vocabulary states that D105 supersedes it; and the old-address rule's open-redirect gate (D118) may bring a rule-set
  choice to the user at stage 8.
- Ticket order (T1–T9): one switch ticket carries the content move, the declaration split and every
  reader of either, with the build, routing, loader, smoke fixtures, generator, hook and anchors;
  pure modules and the transform may land before it; the reference page and the upgrade's move land
  after it.
- Spec 0006's Further Notes predicted that this epic would revise step 8's "nothing is written"; it
  does not: step 7 changes the base in its temporary directory, step 8 plans, step 9 writes (D93).

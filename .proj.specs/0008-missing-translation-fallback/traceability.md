# Traceability: 0008-missing-translation-fallback

`{type × field × boundary} → {expected behaviour → acceptance criterion}`. The spec (`spec.en.md`)
is derived from this file; a gap here is a gap there.

Revision 3.4 (2026-11-05) names, before T-0055 changes them, the existing tests its approved test plan
rewrites that the switcher contracts did not name: the rest of `locale-switcher.test.ts`'s `select`
cases (the base cases, query and hash, the runtime-locale disagreement, the three EN/zh-TW path cases,
`buildTargetPath`, the keyboard case, "closes the dropdown when an option is chosen"), and the
harness of its whole "LocaleSwitcher UI" block: the `vitepress` mock (the switcher reads only the
page's locale now), `mountAt` (mounted under the Layout's provider, with its `choose` and line
fixtures) and the `setPathname` calls the component no longer reads; the `beforeEach` of
`not-found-wiring.test.ts`, `initial-locale-redirect.test.ts` and `locale-switcher.test.ts`, which
reset the choice D14 keeps in memory; the `LocaleSwitcher` stub in
`not-found-wiring.test.ts`, which also hands the test the Layout's `choose`; and
`missing-translation.spec.ts`'s "a choice in the custom locale switcher on an article is stored",
which gains Back. No behaviour changes and the spec text is unchanged. See T-0055's record.

Revision 3.3 (2026-11-05) names the tests T-0056 changes that the table did not name, found while
its test plan was checked and in its stage 6 review: in the first overridden contract, the
`pre-commit-sh.test.ts` cases that spell a challenge's rules ("exits 0 when entire challenge
directory is removed", H03, H04, H10, H23, `commitStaleRedirects`, the S2/B2 symlinked-source case,
H28); in the second, `redirects-generated.test.ts`'s padding, unpadded, numeric-before-parameterised and
byte-identical cases and `redirects.test.ts`'s orphan check, and that an empty Traditional Chinese directory is
accepted like a missing one; in the fourth, `ShortLinkShare.mode-default.test.ts` and the shape of
the two inputs the user approved in T-0056's test plan. No behaviour changes and the spec text is
unchanged. See T-0056's record.

Revision 3.2 (2026-11-05) completes the "Overridden contracts" table after T-0054's stage 6 review,
with no change of behaviour: the redirect row now names the wiring tests whose expected targets
follow D16 (`theme-locale-wiring.test.ts`'s cold-load redirect and session-gate cases and its
`setPath` double, `not-found-wiring.test.ts`'s T-0053 case that pinned the detour), and records
that the redirect no longer reads the location's path; the persistence row names the block by its
new title. The spec text is unchanged. See T-0054's record.

Revision 3.1 (2026-11-05) records three decisions taken in T-0053's stage 6 and 7 reviews, with no
change of behaviour beyond them: U12 moves W5 (the route watcher writes nothing) into T-0053; U14
moves D7 into T-0053 and removes `USE_CUSTOM_LOCALE_SWITCHER` instead of flipping it, since a flag
that can no longer be turned back serves nothing; U15 makes the page-list oracle, like VitePress,
skip dot-prefixed files and directories. See `review/security-T-0053.md` and T-0053's record.

Revision 3 (2026-11-04) applies round 2's disposition (`review/disposition-2.md`, groups J1–J11 of
`review/round-2.md`) and the user's decisions U8–U11, recorded here as D12–D15. Round 2 found no P0,
so stage 3's gate is met; two rounds is the ceiling, so revision 3 is self-checked ("Checks on this
revision") rather than reviewed again. Revision 2 applied round 1's disposition (`review/disposition.md`)
and U1–U6 (D5–D10), and renamed the line's rows from D1–D7 to L1–L7 so that D names only decisions.
Revision 1 was written the same day. Row ids keep their meaning where they survive; rows added in a
revision are numbered after the earlier rows of the same letter. The V rows were rewritten in
revision 3.

The decisions come from stage 1, recorded in the local research note
`.proj.research/2026-11-02-primary-locale-grill.md` (the user confirmed it on 2026-11-04), and from
stages 2 and 3. Only the rows marked "epic 1" in that note bind this epic; the primary-locale and
Japanese epics that follow it do not.

## Decisions

| Id | Decision |
|---|---|
| G2 | Every page has a version in the primary locale, which today is English and is served at the site root; a translation is optional, and a page without one is complete. This epic relies on that rule and does not enforce more of it than the pre-commit hook already does. |
| G6 | The cold-load redirect and the locale switcher go only to a translation that exists. Otherwise the learner stays on the page and sees one line saying the page has no version in the locale they asked for. |
| G7 | Every locale's challenge list shows every challenge. A challenge with no version in that locale shows its title and summary from the version it has, carries a mark naming that locale, and opens that version. |
| G20 | The line in G6 is written in the locale the learner asked for, not in the page's locale. |
| G21 | A challenge without a Traditional Chinese brief still gets its Traditional Chinese short link, which opens the English page. |
| G22 | The Traditional Chinese short link is always `/zh-TW/c/NNN`. The copy control gives it from this epic on. `/zh/c/NNN` is no longer given out, but every `/zh/c/` link keeps opening. |
| G23 | Every locale has a short link carrying its locale code: `/en/c/NNN` and `/zh-TW/c/NNN`. `/c/NNN` keeps redirecting to the primary locale's page (where the learner then lands is A1–A4, D6). |
| D1 | (2026-11-04) When the site would show its not-found page for a path that is not a published page, and the same page exists in the other locale, the learner is sent there instead and sees the line, written in the locale the path named. This covers slug short links (wildcard rules that cannot check a page exists), hand-edited URLs, old links, and GitHub Pages, which serves the not-found page for every unknown path. |
| D2 | (2026-11-04) The copy control gives the locale-coded short link on both locales: `/en/c/NNN` on English pages and lists, `/zh-TW/c/NNN` on Traditional Chinese ones. `/c/NNN` is no longer given out but keeps opening. |
| D3 | Whether a page exists is decided from a page list made at build time, the same set of pages the build publishes. Nothing probes the network to find out. |
| D4 | The first-time visitor's default stays Traditional Chinese (`DEFAULT_VISITING_LOCALE`). Making the primary locale the default is the primary-locale epic's (stage 1 note, Q3). |
| D5 | (U1, 2026-11-04) Only an explicit choice writes the stored preference: choosing a locale in the locale switcher, and a cold load of a published page whose path carries a locale prefix (including one reached through a short link's redirect, and a reload, D13). Nothing else writes it: not a link followed across locales (an untranslated entry in a list, an article linking to a page in the other locale), not Back or Forward, not a cold-load redirect, not a not-found redirect, and not a cold load of a prefixed path that is not a published page. The interface locale still follows the URL. This overrides the Layout route watcher's write and the tests that pin it (see "Overridden contracts"). |
| D6 | (U2, 2026-11-04) D2 stands, and the spec says what `/en/c/NNN` does in this epic: it opens the unprefixed English page, which the cold-load redirect treats as it treats `/c/NNN`. A learner whose stored preference is Traditional Chinese, or who has none, is taken to the Traditional Chinese version when one exists. `/en/c/NNN` opens English for every learner only once the primary-locale epic gives English its own prefix. |
| D7 | (U3, 2026-11-04; revised by J1; U14, 2026-11-05: lands with T-0053, and the flag is removed rather than flipped) `USE_CUSTOM_LOCALE_SWITCHER` becomes `true`: every page uses `LocaleSwitcher` (in `MergedNav` on challenge pages, in the nav bar slot on default-theme pages). VitePress's three built-in translation menus — `VPNavBarTranslations` (1280 and wider), the translations group inside `VPNavBarExtra` (768 to 1279) and `VPNavScreenTranslations` (the mobile screen) — are hidden by CSS that does not depend on a class added at run time, so they are hidden in the static HTML too. |
| D8 | (U4, 2026-11-04) The line carries one link to the requested locale's challenge list. |
| D9 | (U5, 2026-11-04) Stage 8's English-only challenge exists only on a throwaway branch and the surfaces built from it (D12). It is never merged and never enters `main`'s number record. Verification is driven with `/agent-browser` or the host's native browser tools; a challenge page is checked with its Browser panel open (hard rule 4), as epic 0007's V02 did. |
| D10 | (U6, 2026-11-04) On a challenge page the line is a full-width bar directly below `MergedNav` and above the runtime-reset banner, visible whether or not the description panel is collapsed. On a default-theme page it is in the layout's top slot (L4). Apart from the line, the content area's layout does not change; D7 and B5 change the locale menu. |
| D11 | (G2) An arrival is classified before anything else decides, from what the router rendered: a page arrival (rows A, B, L) when it rendered a page, a not-found arrival (rows C) when it rendered the not-found page for a path not in the page list, and a failed load (C8) when it rendered the not-found page for a path in the page list. |
| D12 | (U8, 2026-11-04) Stage 8 runs on a throwaway branch, which explicitly overrides `docs/agents/workflow.md`'s "the preview deployment that Cloudflare Pages builds for the ticket branch" and the stage 8 gate in AGENTS.md's pipeline table, as epic 0007's D9 did; OQ-017 records it. The branch is `stage8/<ticket-id>`: the ticket branch plus one fixture commit, made with `/tw-emoji-commit`. It is not a ticket branch (hard rule 1 does not apply). Pushing it, creating the temporary GitHub Pages range, and deleting both afterwards each need the user's approval first. |
| D13 | (U9, 2026-11-04) Reloading a page under `/zh-TW/` is a cold load of a prefixed published page and writes `zh-TW` (W2), also after a not-found redirect (C2) or a followed link brought the learner there. Accepted and documented; no history marker. |
| D14 | (U10, 2026-11-04) When the stored preference cannot be written, a switcher choice is kept in memory for the tab and used as the stored value for the rest of that tab's arrivals. |
| D15 | (U11, 2026-11-04) The line cannot be dismissed. Stage 8 confirms that a challenge page's panels stay usable with the line shown at 375 wide. |
| D16 | (J4) Every decision about a page uses one identity: the page the router rendered, as its page-list entry. A not-found path is identified by the lookup algorithm. Redirect and switcher targets are page-list entries, never URL text. |
| D17 | (J8) A switcher choice is an explicit act and the session gate is not modal (ADR-0006), so the line a choice produces (B2) shows at once. The line of a cold load or of a not-found arrival waits for the gate's decision, on the page it lands on. |

## Seams

| Id | Seam | Public surface | Prior art |
|---|---|---|---|
| S1 | Locale routing | The pure functions that classify an arrival and decide where a cold load, a switcher choice and a not-found path go, which locale was requested, and whether the stored preference is written. Each takes the location, the site base, the stored value, the page list (S2) and the router's result (the rendered page's source path, or not-found) as arguments. | `tests/unit/i18n/initial-locale-redirect.test.ts`, `locale-switcher.test.ts`, `localize-path.test.ts`, `route-locale-sync.test.ts`, `theme-locale-wiring.test.ts` |
| S2 | Page list | The build-time list of published pages, the mapping from a source path to its entry, and the lookup algorithm for a not-found path. | `tests/unit/site/challenge-data-loaders.test.ts` |
| S3 | The line | The rendered line: when it shows, its exact text and link in each locale, its `lang`, where it sits. | `tests/unit/components/SessionGate-truth.test.ts` (literal sentences compared by equality) |
| S4 | Locale challenge data | The list each locale's challenge list and home page receive, and how `ChallengeList` and `HomeContent` render it. | `ChallengeList.test.ts`, `HomeContent.test.ts`, `challenge-data-loaders.test.ts` |
| S5 | Challenge link | `challengeLink` and the copy control (`ShortLinkShare`) in the list and the nav. | `ShortLinkShare.test.ts`, `ShortLinkShare.mode-default.test.ts`, `tests/unit/challenge/shortLink.test.ts`, `MergedNav.test.ts` |
| S6 | Redirect rules | `generateRedirects` and the committed `platform/public/_redirects`. | `tests/unit/site/redirects.test.ts`, `redirects-generated.test.ts`, `tests/pre-commit-sh.test.ts` |
| S7 | Stage 8 | The built site in a browser, per D9 and D12: the Cloudflare Pages preview of `stage8/<ticket-id>`, and a temporary GitHub Pages range created from its commit. | epic 0007's T-0039, V02 |

## Constraints on the ticket breakdown

Stage 4's claim table is checked against these.

| Id | Constraint |
|---|---|
| T1 | S6 (the redirect rules) lands no later than S5 (the copied forms); one ticket for both is preferred. Otherwise `main` would give out `/en/c/` and `/zh-TW/c/` links with no rule behind them. |
| T2 | S1 lands no earlier than S2. |
| T3 | S4 (untranslated entries in the lists) lands no earlier than D5's change to the route watcher and S1. Otherwise clicking an untranslated entry would write `en` into a Traditional Chinese reader's preference. |
| T4 | Each ticket runs at stage 8 the V rows its own rows reach. The full V table runs at the last ticket, after the others have landed. |

## Fixed lists

### Vocabulary

| Term | Meaning in this spec |
|---|---|
| locale | `en` or `zh-TW` (glossary: locale). |
| primary locale | English, today: the locale served without a path prefix. The glossary's primary locale is the concept; this epic does not make it selectable. |
| translation | A page's version in a locale other than the primary locale (glossary: translation). |
| page | A published page of the site: a challenge brief or an article. Identified by its page-list entry. |
| page locale | `zh-TW` for a page under `/zh-TW/`, `en` otherwise. |
| counterpart | The same page in the other locale: `/X` ↔ `/zh-TW/X`, computed by `localizePath` on a page-list entry or a lookup candidate. |
| arrival | One page shown to the learner: by a cold load, a switcher choice, a not-found redirect, or a later navigation. A navigation that changes only the hash or the query is not an arrival. |
| requested locale | The locale the learner asked for on this arrival. Fixed in "Requested locale" below. |
| untranslated | Of a challenge in a list: having no version in the list's locale. |
| the line | The missing-translation line of G6. Fixed in "Canonical sentences" below. |
| locale switcher | `LocaleSwitcher`, the only locale menu after D7. The spec calls it nothing else. |
| stored value | The stored preference, or, after D14, the tab's in-memory choice when storage could not be written. |

### Requested locale

Exactly one source applies to an arrival (D11 classifies it first).

| Arrival | Requested locale |
|---|---|
| Cold load of a page whose path carries a locale prefix | That prefix's locale (an explicit request). |
| Cold load of a page with no prefix | The stored value when it names a known locale; otherwise `DEFAULT_VISITING_LOCALE`. |
| Switcher choice | The locale chosen. |
| Not-found arrival (rows C) | The locale the not-found path named: `zh-TW` for a `/zh-TW/` path, `en` otherwise. |
| Later navigation: a link, Back, Forward | The stored value when it names a known locale; otherwise `DEFAULT_VISITING_LOCALE`. |

A redirect that S1 itself makes (a cold-load redirect, a not-found redirect) carries the arrival's
requested locale to the page it lands on; it is not a later navigation. The carried value is bound to
that redirect's target and is discarded at the next arrival, whether or not it was used (L6).

### Canonical sentences

The line, compared by exact equality (S3). It is in the requested locale and carries `lang` with the
literal value in the first column.

| Requested locale (`lang`) | Page shown in | Sentence | Link text | Link target |
|---|---|---|---|---|
| `zh-TW` | `en` | `這一頁沒有繁體中文版本，所以顯示英文版。` | `前往繁體中文題目清單` | `/zh-TW/challenges` |
| `en` | `zh-TW` | `This page has no English version, so it is shown in Traditional Chinese.` | `Go to the English challenge list` | `/challenges` |

Link targets are base-less; the base is added as every internal link adds it.

The list's mark (S4), on an untranslated challenge, resolved in the list's or page's locale (so the
static HTML already carries it):

| List locale | Version the challenge has | Mark |
|---|---|---|
| `zh-TW` | `en` | `只有英文` |
| `en` | `zh-TW` | `Traditional Chinese only` |

### Schema: page list (S2)

A set of base-less paths, one per published page. Spelling: a directory's `index.md` keeps its
trailing slash (`/`, `/guide/`, `/challenge/door-is-open/`, `/zh-TW/`); any other page file has none
(`/challenges`, `/guide/python`). This is the spelling `cleanUrls` gives in `.vitepress/config.mts`.
At `5d3c173`, when this revision was written, the real tree had these 27 pages; the oracle, not this
note, is what AC-1 compares with:

```json
[
  "/", "/challenges", "/guide/", "/guide/python", "/guide/network", "/guide/browser",
  "/guide/notes", "/guide/troubleshooting", "/guide/workshop",
  "/reference/attack-log-export-format",
  "/challenge/door-is-open/", "/challenge/just-a-preview/",
  "/challenge/selected-excerpts/", "/challenge/staff-only/",
  "/zh-TW/", "/zh-TW/challenges", "/zh-TW/guide/", "/zh-TW/guide/python",
  "/zh-TW/guide/network", "/zh-TW/guide/browser", "/zh-TW/guide/notes",
  "/zh-TW/guide/troubleshooting", "/zh-TW/guide/workshop",
  "/zh-TW/challenge/door-is-open/", "/zh-TW/challenge/just-a-preview/",
  "/zh-TW/challenge/selected-excerpts/", "/zh-TW/challenge/staff-only/"
]
```

The oracle is independent of VitePress's own page list: every `*.md` file under `platform/` outside
`platform/public/` and `platform/shared/`, skipping dot-prefixed files and directories (which
VitePress never publishes; revision 3.1), mapped by the spelling rule above. The not-found page is not
a page and is not in the list.

**A page arrival** is identified by the source path of the page the router rendered, mapped by the
spelling rule (`zh-TW/challenges.md` → `/zh-TW/challenges`). VitePress also renders some alias URLs
(a different letter case, `_` for `/`); such an arrival is the page it rendered, and every decision
uses that entry (D16).

**A not-found path** is looked up by this algorithm, and nothing in it throws:

1. Strip the base. Decode percent-encoding once; if decoding fails, the path is not in the list.
2. If the decoded path contains `//`, `\` or a `..` segment, it is not in the list.
3. Remove a trailing `.html`, then a trailing `/index`.
4. The candidates are the result with a trailing slash and without one.
5. A candidate matches when it equals a list entry exactly (case-sensitive). For a not-found arrival,
   the counterpart of each candidate is looked up the same way, and the matching entry is the target.

| Not-found path | Result |
|---|---|
| `/zh-TW/challenge/v05-php-check/` (untranslated) | counterpart `/challenge/v05-php-check/` matches → C1 |
| `/zh-TW/challenge/v05-php-check` | candidates `…check` and `…check/`; counterpart `/challenge/v05-php-check/` matches → C1 |
| `/zh-TW/challenge/v05-php-check/index.html` | as above → C1 |
| `/zh-TW/reference/attack-log-export-format.html` | counterpart `/reference/attack-log-export-format` matches → C1 |
| `/zh-TW/%E0%A4%A` | decoding fails → not in the list → C3 |
| `/zh-TW//evil.example/x`, `//evil.example/challenges`, `/zh-TW/%2F%2Fevil.example`, `/zh-TW/\evil.example` | step 2 → C3 |
| `/en/challenges` | no candidate and no counterpart matches → C3 |

### Schema: locale challenge data (S4)

`ChallengeData` gains one field. Everything else is unchanged.

```ts
interface ChallengeData {
  // …existing fields…
  /** The locale of the page `url` points at. Equal to the list's locale unless the challenge is
   * untranslated, in which case it is the locale whose version the entry was taken from. */
  locale: 'en' | 'zh-TW'
}
```

Merge rules: entries are keyed by slug (the challenge's directory name). A borrowed entry takes title,
summary, number, difficulty, category, tags and date from the brief it has; a field that brief leaves
out takes the list locale's default (`綜合`, not `General`, in the Traditional Chinese list). `id` is
the English brief's frontmatter `id` when it has one, otherwise the Traditional Chinese brief's,
otherwise the 1-based position in one shared order: the English loader's order, then challenges with
only a Traditional Chinese brief, by slug. Both locales use that rule, so both lists hold the same
challenges with the same `id`s.

An untranslated entry in the `zh-TW` list, for a challenge `v05-php-check` numbered 5:

```json
{ "id": 5, "number": 5, "title": "PHP Check", "url": "/challenge/v05-php-check/", "locale": "en",
  "difficulty": "easy", "category": "web", "tags": ["php"], "description": "…" }
```

### Schema: redirect rules (S6)

For a translated challenge numbered 1 (`door-is-open`) and an untranslated one numbered 5
(`v05-php-check`), the numbered section holds these rules, in this order (columns are padded by the
generator; AC-8 compares the order and the three fields, not the padding):

```
/c/001        /challenge/door-is-open/        302
/en/c/001     /challenge/door-is-open/        302
/zh/c/001     /zh-TW/challenge/door-is-open/  302
/zh-TW/c/001  /zh-TW/challenge/door-is-open/  302
/c/005        /challenge/v05-php-check/       302
/en/c/005     /challenge/v05-php-check/       302
/zh/c/005     /challenge/v05-php-check/       302
/zh-TW/c/005  /challenge/v05-php-check/       302
```

and the parameterised section, always last:

```
/c/:slug        /challenge/:slug/        302
/en/c/:slug     /challenge/:slug/        302
/zh/c/:slug     /zh-TW/challenge/:slug/  302
/zh-TW/c/:slug  /zh-TW/challenge/:slug/  302
```

A challenge with only a Traditional Chinese brief (refused by the pre-commit hook and by CI's tree
check, but reachable through `--no-verify`) gets only its two Traditional Chinese rules, pointing at
its Traditional Chinese page (G9).

Cloudflare Pages allows 2,000 static and 100 dynamic rules in `_redirects` (Cloudflare Pages
documentation, "Redirects", read 2026-11-04). Numbered rules are static, four per challenge, and the
parameterised rules are dynamic, four in all, so a range holds at most 500 numbered challenges.

## Overridden contracts

This epic changes these existing contracts on purpose, together with every test that pins them.
Each changes only as stated; stage 6 checks that the diff changes nothing else in them, and that any
other test the diff changes is named here.

| Contract | Where, with the tests that pin it | Now |
|---|---|---|
| A new challenge gains one `/c/NNN` rule; a Traditional Chinese short-link rule exists only when the challenge has a Traditional Chinese brief, and goes when the brief goes; an untracked or ignored Traditional Chinese directory gets no rule | epic 0007 traceability H01, H02, H14, H20, H37, H39, H40, and its vocabulary entry for short link, link forms X1–X2 and rows L01–L02; `generateRedirects`'s header and comments on `numericRules`, `includeSlug` and `PARAMETERISED`; `scripts/pre-commit.sh`'s header and its W4 message; `tests/pre-commit-sh.test.ts` (`FIXTURE_RULES` and the assertions that use it, `RETIRED_DOOR_RULES`, the H20, H37 and H39 cases, and, from revision 3.3, H03, H04, H10, H23, "exits 0 when entire challenge directory is removed", `commitStaleRedirects`, the S2/B2 symlinked-source case and H28) | G1–G5, G9: a numbered challenge gains four rules; adding or deleting a Traditional Chinese brief, or leaving its directory untracked or ignored, re-points its two Traditional Chinese rules between the Traditional Chinese and the English page instead of adding or removing them |
| Two parameterised rules; numbered sources are `/c/` and `/zh/c/`; a translated slug's target directory must exist | `tests/unit/site/redirects.test.ts` (`PARAMETERISED_RULES`, `NUMBERED_SOURCE`, "ends with the two parameterised classroom rules, unchanged", the unpadded-form check, the target-directory checks); `tests/unit/site/redirects-generated.test.ts` ("keeps the two parameterised rules unchanged and last", its `/zh/c/001` expectations, its numbered-rule pattern; from revision 3.3, "pads to three digits…", "does not emit the unpadded spelling", "places every numeric rule before…" (its title) and "is byte-identical…", whose slug filter becomes per tree like the hook's); from revision 3.3, `redirects.test.ts`'s "backs every translated slug with a root-locale challenge" | Four parameterised rules; numbered sources add `/en/c/` and `/zh-TW/c/` (G10 keeps them padded); the target-directory check accepts a range with no Traditional Chinese challenge directory, or an empty one, which G2 allows |
| The copied short path is `/c/NNN` or `/zh/c/NNN`; a challenge has one canonical link wherever the reader meets it | `shortLinkPath` and its comment; the "one canonical link" comments in `shortLink.ts` and `ShortLinkShare.vue`; `tests/unit/challenge/shortLink.test.ts`, `ShortLinkShare.test.ts`, `ChallengeList.test.ts`, `MergedNav.test.ts` | F1–F3, F7: one link per locale, and the nav and the list can give different locales for one challenge |
| `ShortLinkShare`'s `locale` prop is both the link's and the label's locale | `ShortLinkShare`'s prop documentation and tests (`ShortLinkShare.test.ts`, and from revision 3.3 `ShortLinkShare.mode-default.test.ts`) | F10: two inputs. As approved in T-0056: `locale`, the list's or page's, for the text and the short link; `entryLocale`, the locale of the page the entry opens, for the page URL. The component picks by mode |
| The Layout route watcher persists the URL's locale on every cross-locale route change | `.vitepress/theme/index.ts` Layout setup and its comment; `route-locale-sync.test.ts` ("browser back … updates locale to en" and the stored-value assertions); `theme-locale-wiring.test.ts`, which keeps its own copy of the watcher | D5: it sets the interface locale only |
| A cold load of any prefixed path persists its locale, decided in `enhanceApp` from the URL | `shouldPersistOnColdLoad` and its documentation; the `enhanceApp` comment; `initial-locale-redirect.test.ts` (its two-argument cases); `theme-locale-wiring.test.ts` ("enhanceApp runs at app bootstrap", the block "the real theme: cold-load persistence"); the comments that say where `wxl-locale` is written (`localStorageKeys.ts`, `useSessionGate.ts`, `useSessionGate.test.ts`, `local-storage-ownership.test.ts`) | D5, D16, W2/W3: decided after the router resolves, for a published page only |
| The cold-load redirect takes no page list | `redirectTargetForStoredLocale`; `initial-locale-redirect.test.ts`; `theme-locale-wiring.test.ts` (the expected targets of its cold-load redirect and session-gate cases, and its `setPath` double, which now says what the router renders); `not-found-wiring.test.ts` ("shows no line on a page it is about to redirect away from", which pinned the cold-load detour through a missing translation) | S1 signature gains the page list and the router's result, and the location's path is no longer read: the target is the counterpart's list entry (D16), so `/challenges/` rendered from `challenges.md` goes to `/zh-TW/challenges`; an unprefixed page without a published counterpart stays (A2, A3) |
| Switching from any path navigates to its counterpart; the menu lists only the locale the page is not in; choosing the page's own locale does nothing; the current-locale title is not interactive | `LocaleSwitcher`'s comments, `select` and its early return; `locale-switcher.test.ts` (cases switching from paths that are not pages, "offers exactly", the non-interactive title; from revision 3.4, every other `select` case — the base cases, query and hash, the runtime-locale disagreement, the three EN/zh-TW path cases, `buildTargetPath`, the keyboard case, "closes the dropdown when an option is chosen" — the harness of its "LocaleSwitcher UI" block — the `vitepress` mock, `mountAt` and its fixtures, the `setPathname` calls — and its `beforeEach`); from revision 3.4, `not-found-wiring.test.ts`'s `LocaleSwitcher` stub and `beforeEach`, `initial-locale-redirect.test.ts`'s `beforeEach`, and `missing-translation.spec.ts`'s "a choice in the custom locale switcher on an article is stored" | B1, B2, B5, B7 |
| The switcher changes the runtime locale on choice | `LocaleSwitcher`'s comments and `select` | B2: not when it stays |
| Flipping the switcher flag needs no spec change; the built-in menus are hidden by a class added on mount | `USE_CUSTOM_LOCALE_SWITCHER` comment; `style.css`'s rule and comment; the Layout's `onMounted` body class | D7: the comment names this spec; hiding does not depend on run time |
| One content loader per locale tree; `id` falls back to the position in its own array | `tests/unit/site/challenge-data-loaders.test.ts` | The merge rules |

## Matrix

### Page list (S2)

| Row | Type × field × boundary | Expected behaviour | AC |
|---|---|---|---|
| P1 | Every published page, both locales | In the list once, in the schema's spelling; the real tree's list equals the oracle's set. | AC-1 |
| P2 | `platform/public/`, `platform/shared/`, components, the not-found page | Not in the list. | AC-1 |
| P3 | Each not-found path in the lookup table | Gives the stated result; no input throws. | AC-1 |
| P4 | Site base `/` and `/<repo>/` | The list holds base-less paths; the lookup strips the base first. | AC-1 |
| P5 | A page added or removed | The next build's list follows; under `pnpm dev` the list follows after the dev server restarts. | AC-1 |
| P6 | An open tab after a redeploy | Keeps the list it loaded. A known limit: a switcher choice can navigate to a page since removed, which shows the not-found page (C8), and Back returns; a translation added since loading is still treated as missing, so the line can say there is none. | AC-9 (documented, H3) |
| P7 | A page source path, including one rendered from an alias URL | Maps to its entry by the spelling rule. | AC-1 |

### Cold load of a page (S1, S2) — decision table

Applies to a page arrival by cold load (D11). "Counterpart" is the other locale's version. "Any stored
value" means none, `en`, `zh-TW`, an unknown value such as `fr`, or unreadable storage; the last two act
as none.

| Row | Path | Stored value | Counterpart | Expected behaviour | AC |
|---|---|---|---|---|---|
| A1 | Unprefixed, challenge or article | none, `zh-TW`, unknown, unreadable | In the list | Redirect to its list entry, as today (`replace`, base, query and hash kept). No line. Preference not written. | AC-2 |
| A2 | Unprefixed challenge | none, `zh-TW`, unknown, unreadable | Not in the list | No redirect. The line, in `zh-TW`. Preference not written. | AC-2 |
| A3 | Unprefixed article | none, `zh-TW`, unknown, unreadable | Not in the list | As A2. | AC-2 |
| A4 | Unprefixed, challenge or article | `en` | Either | No redirect, no line, as today. Preference not written (W4). | AC-2 |
| A5 | `/zh-TW/` prefixed, challenge or article | Any | Either | No redirect (an explicit request, as today). No line. Preference written as `zh-TW` when storage is writable (W2); otherwise W6. | AC-2 |
| A6 | Any of A1–A5 | — | — | The redirect and the line wait for the session gate's decision exactly as the redirect does today. | AC-2 |
| A7 | Any of A1–A5 with base `/<repo>/` | — | — | The lookup uses the base-less entry; a redirect keeps the base. | AC-2 |

A5's "Either" is reachable only for the Traditional Chinese side today (G2 makes every English page
exist), and is still decided the same way.

### Locale switcher (S1, S2; D7)

| Row | Type × field × boundary | Expected behaviour | AC |
|---|---|---|---|
| B1 | On a page, chosen locale's counterpart in the list | Navigate to the counterpart's list entry and write the choice. | AC-3 |
| B2 | On a page, chosen locale's counterpart not in the list (either direction) | Stay. Write the choice. No history entry is added. The URL and the interface keep the page's locale. The line shows at once, in the chosen locale, whether or not the session gate has decided (D17). | AC-3 |
| B3 | Site base `/<repo>/` | As B1/B2, base stripped for the lookup and kept on navigation. | AC-3 |
| B4 | Every place the switcher appears — `MergedNav` on challenge pages, the nav bar slot on default-theme pages — at 1280, 1024 and 375 wide | Reachable and behaving as B1/B2 in each. None of the three built-in translation menus is shown at any width, in the static HTML or after hydration. | AC-3 |
| B5 | Menu structure | The title is always the page's locale. Without the line, the menu offers one option, the other locale, as today. While the line shows, it offers two: the other locale and the page's own locale. Choosing the page's own locale writes it, removes the line and does not navigate. | AC-3 |
| B6 | Storage cannot be written | Nothing throws. The choice is kept in memory for the tab (D14) and used as the stored value for the tab's later arrivals; the rest of B1/B2 holds. | AC-3 |
| B7 | On the not-found page (C3 or C8) | Counterpart (by the lookup algorithm) in the list: navigate to it. Otherwise: write the choice and stay. The line never shows on the not-found page. | AC-3 |

### Not-found arrival (S1, S2; D1, D11)

| Row | Type × field × boundary | Expected behaviour | AC |
|---|---|---|---|
| C1 | `/zh-TW/X` not in the list, counterpart matches by the lookup algorithm | Replace (not push) the route with the matching list entry, keeping query and hash. The line, in `zh-TW`, on the page it lands on. | AC-4 |
| C2 | `/X` not in the list, `/zh-TW/X` counterpart matches | Replace with the matching entry. The line, in `en`. | AC-4 |
| C3 | No candidate and no counterpart matches (including the lookup table's C3 inputs) | The not-found page. No line. | AC-4 |
| C4 | Reached by a cold load (Cloudflare Pages' or GitHub Pages' 404 page) and by client-side navigation | Both as C1–C3. | AC-4 |
| C5 | Preference | Not written by a not-found arrival or its redirect, on a cold load or otherwise (W3, W5). | AC-4 |
| C6 | Site base `/<repo>/` | As C1–C3 on the base-less path; the base is kept. | AC-4 |
| C7 | Back after C1/C2 | Returns to the page before the not-found path. | AC-4 |
| C8 | A not-found route whose path is in the list (a failed load) | The not-found page. No redirect, no line. | AC-4 |
| C9 | The page a C redirect lands on is itself not-found | C8 applies; at most one C redirect per arrival. | AC-4 |
| C10 | Crafted paths of the lookup table | End at C3; the redirect target, when there is one, is the base followed by a list entry, navigated through the router, and every result is same-origin. | AC-4 |
| C11 | Session gate | C1 and C2 redirect after the gate's decision on the not-found page, as A6; the line on the page they land on waits for that page's gate decision. | AC-4 |

### The line (S3; D8, D10, D15, D17)

| Row | Type × field × boundary | Expected behaviour | AC |
|---|---|---|---|
| L1 | When it shows | On a page arrival, exactly when the requested locale differs from the page locale and the page's counterpart is not in the list — after the session gate's decision for a cold load or not-found arrival (A6, C11), at once for a switcher choice (B2). Never on the not-found page. | AC-5 |
| L2 | Text | The canonical sentence and link text for the requested locale, by exact equality; `lang` is `en` or `zh-TW`; the link goes to the stated target with the base added. | AC-5 |
| L3 | Challenge page | A full-width bar directly below `MergedNav` and above the runtime-reset banner, visible with the description panel open and collapsed. | AC-5 |
| L4 | Default-theme page | In the layout's top slot: `doc-before` for the doc layout, `page-top` for the page layout, `home-hero-before` for the home layout. | AC-5 |
| L5 | Later navigation | Re-evaluated for the new page with the later-navigation requested locale; gone where L1 is false. | AC-5 |
| L6 | A redirect S1 made (A1 landing on a translation; C1/C2) | The carried requested locale is used on the page the redirect lands on and nowhere else; it is discarded at the next arrival, and when the redirect lands on a not-found page (C9). | AC-5 |
| L7 | Static HTML | Absent; it depends on the reader's stored value, which the build cannot know. | AC-5 |
| L8 | A navigation that changes only the hash or the query | Not an arrival; the line stays as it is. | AC-5 |
| L9 | Dismissal | The line has no close control (D15). | AC-5 |

### Writing the stored preference (S1; D5, D13, D14)

| Row | Type × field × boundary | Expected behaviour | AC |
|---|---|---|---|
| W1 | A switcher choice | Written: the chosen locale (B1, B2, B5, B7). | AC-11 |
| W2 | Cold load of a published page with a `/zh-TW/` prefix, including one reached through a short link's redirect and a reload (D13) | Written: `zh-TW`. Decided after the router resolves, from the rendered page (D16). | AC-11 |
| W3 | Cold load of a `/zh-TW/` path that is not a published page, or a failed load (C8) | Not written. | AC-11 |
| W4 | Cold load of an unprefixed path | Not written, as today. | AC-11 |
| W5 | Any client-side navigation that crosses locales: a link (including an untranslated list entry and the guide's notes page linking to the reference page), Back, Forward, a cold-load redirect, a not-found redirect | Not written. The interface locale follows the URL. | AC-11 |
| W6 | Storage cannot be written | Never throws; nothing written to storage; a switcher choice is kept in memory for the tab (D14). | AC-11 |

### Locale challenge data (S4)

| Row | Type × field × boundary | Expected behaviour | AC |
|---|---|---|---|
| E1 | `zh-TW` list, translated challenge | Entry from the Traditional Chinese brief, `locale: 'zh-TW'`, `id` per the merge rules. | AC-6 |
| E2 | `zh-TW` list, untranslated challenge | Entry per the merge rules from the English brief, `locale: 'en'`, `url` the English page, mark `只有英文`; its title and summary carry `lang="en"`. | AC-6 |
| E3 | `en` list, challenge with only a Traditional Chinese brief | Entry from it, mark `Traditional Chinese only`, `lang="zh-TW"`, no short link. Unreachable in a committed tree today (the hook and CI refuse such a brief); covered at S4 with its own fixture entry. | AC-6 |
| E4 | Order and `id` | Both lists hold the same challenges with the same `id`s, per the merge rules; the default display order is therefore the same. | AC-6 |
| E5 | Defaults | A field the borrowed brief leaves out takes the list locale's default. | AC-6 |
| E6 | Where the mark shows | List view, grid view, and the home page's latest-challenge cards, resolved in the page's locale so the static HTML carries it. | AC-6 |
| E7 | Home page counts | Count untranslated challenges too. | AC-6 |
| E8 | Search and filters | Apply to an untranslated entry through the text it shows. | AC-6 |
| E9 | Solved badge | Shows for an untranslated entry as for any other (keyed by slug). | AC-6 |
| E10 | Entry without a number (its own S4-only fixture entry) | No short link, as today. | AC-6 |

### Challenge link and copy control (S5; G22, G23, D2, D6)

| Row | Type × field × boundary | Expected behaviour | AC |
|---|---|---|---|
| F1 | Short mode, `en` | `<origin>/en/c/NNN`. | AC-7 |
| F2 | Short mode, `zh-TW` | `<origin>/zh-TW/c/NNN`. | AC-7 |
| F3 | Short mode, untranslated entry in the `zh-TW` list | `<origin>/zh-TW/c/NNN` (the list's locale; G21 makes it open the English page). | AC-7 |
| F4 | Page mode, `en` | `<origin>/challenge/<slug>/`, as today. | AC-7 |
| F5 | Page mode, `zh-TW` translated | `<origin>/zh-TW/challenge/<slug>/`, as today. | AC-7 |
| F6 | Page mode, untranslated entry in the `zh-TW` list | `<origin>/challenge/<slug>/`. | AC-7 |
| F7 | Nav copy control on a challenge page | The page's locale: F1/F2 in short mode, F4/F5 in page mode. On an English page reached from the Traditional Chinese list this is `/en/c/NNN`, while the list gives `/zh-TW/c/NNN` for the same challenge; both open it. | AC-7 |
| F8 | Displayed text | Matches the copied URL without its scheme, with epic 0007's ellipsis rule. | AC-7 |
| F9 | `/c/NNN` and `/zh/c/NNN` | Never given out. | AC-7 |
| F10 | The control's label, copied and failed texts, in the list and the nav | In the list's or page's locale, never the entry's; only the link follows F1–F6. | AC-7 |

### Redirect rules (S6; G21, G22, G23)

| Row | Type × field × boundary | Expected behaviour | AC |
|---|---|---|---|
| G1 | Numbered challenge with an English brief | `/c/NNN` and `/en/c/NNN` redirect to its English page. What the learner then sees is A1–A4 (D6). | AC-8 |
| G2 | Numbered, translated | `/zh-TW/c/NNN` and `/zh/c/NNN` redirect to its Traditional Chinese page. | AC-8 |
| G3 | Numbered, untranslated, or with a Traditional Chinese directory that is untracked or ignored | `/zh-TW/c/NNN` and `/zh/c/NNN` redirect to its English page. | AC-8 |
| G4 | Parameterised | The four slug rules of the schema, after every numbered rule. A slug rule to a missing translation lands on C1. | AC-8 |
| G5 | Order | By number, then `/c/`, `/en/c/`, `/zh/c/`, `/zh-TW/c/`; regenerating gives no diff. | AC-8 |
| G6 | A Traditional Chinese brief with no English challenge | Refused by the pre-commit hook (epic 0007's D12) and by CI's tree check in `redirects.test.ts`, as today. The generator does not refuse it (G9). | AC-8 |
| G7 | Committed file | Regenerated and committed in the same change; the CI staleness check passes. | AC-8 |
| G8 | Rule count | 4N numbered rules for N challenges with an English brief, plus G9's, and 4 parameterised rules; the generator's header states the 500-challenge limit. | AC-8 |
| G9 | A challenge with only a Traditional Chinese brief, reaching the generator (its own fixture) | Only `/zh/c/NNN` and `/zh-TW/c/NNN`, pointing at its Traditional Chinese page. | AC-8 |
| G10 | Padding | Every numbered rule, in all four forms, uses the padded number; no unpadded form appears. | AC-8 |

### Documents (stage 6)

| Row | Passage | Expected behaviour | AC |
|---|---|---|---|
| H1a | Short-link comments: the generator's header, section comments, `numericRules`, `includeSlug` and `PARAMETERISED`; `shortLinkPath`; the "one canonical link" comments in `shortLink.ts` and `ShortLinkShare.vue`; `ChallengeList`'s short-link comment; `scripts/pre-commit.sh`'s header and W4 message | Each states the behaviour this spec gives it: `/en/c/` and `/zh-TW/c/` given out, `/c/` and `/zh/c/` kept for old links, four rules per challenge, an untracked or ignored Traditional Chinese directory re-pointing rather than removing. | AC-9 |
| H1b | Locale comments: `LocaleSwitcher`'s menu and runtime-locale comments; the `USE_CUSTOM_LOCALE_SWITCHER` comment; the hiding rule's comment in `style.css`; the Layout route watcher's comment; `shouldPersistOnColdLoad`'s documentation; the `enhanceApp` comment | Each states the behaviour this spec gives it (D5, D7, D16, B5). | AC-9 |
| H2 | README (both languages), the short-link passage | Copied short links carry a locale code; `/c/` and `/zh/c/` links keep working; in this epic `/en/c/` opens like `/c/` (D6); opening a `/zh-TW/` page, also through a short link or a reload, sets the learner's language (D5, D13); a range upgrading to this release regenerates `_redirects` with `pnpm redirects:generate` when CI reports it stale. | AC-9 |
| H3 | Guide (both languages): troubleshooting's passages on the traffic log and switching locale, on the locale switcher navigating to the other locale's URL, on the two lists holding different challenges and numbering independently, and its symptom index; the guide index's sentences that switching language empties the Network log and that the two lists number independently; `guide/network.md`'s sentence that switching locale navigates and clears the log | Rewritten to state B2 (the switcher can stay on the page), E4 (both lists hold the same challenges), that the `#NNN` badge is the permanent number, and that switching locale empties the log only when it navigates. A new troubleshooting entry, listed in the symptom index, describes the line, says it is not an error, and states P6 and D13. | AC-9 |
| H4 | `OPEN-QUESTIONS.md` | OQ-023 closed by this epic. OQ-016's resolved paragraph no longer lists OQ-023 as a live limit. OQ-017 records D12. OQ-018 records that ranges under one owner still share the preference and that it now yields the line instead of a 404. OQ-024 records that translations are optional (stage 1 note, ADR-0008) and that the root-locale move is the primary-locale epic's. | AC-9 |
| H5 | `AGENTS.md` Repository layout | `platform/zh-TW/` described as the Traditional Chinese translations, not "the mirror of every page". | AC-9 |
| H6 | `GLOSSARY.md` | The short-link entry says the zh-prefixed form stopped being given out with this epic and registers `/c/NNN` as the address that redirects to the primary locale's page, kept working but not given out; the locale entry describes the switcher as choosing a locale, not moving between them. | AC-9 |
| H7 | Wording | No document this epic changes in the glossary's corpus (`README.md`, `platform/`, the guide) uses the term 主語系. | AC-9 |

### Stage 8 (S7; D9, D12)

Driven with `/agent-browser` or the host's native browser tools; challenge pages checked with their
Browser panel open. Each observation reports the surface it covers. The fixture is one English-only
challenge numbered 999, dated after every other challenge. Before every action, open a new tab and set
the stored value as the row states.

| Row | Surface | Observed | AC |
|---|---|---|---|
| V1 | Cloudflare Pages preview of `stage8/<ticket-id>` | Rows V1a–V1l below. Short links are requested on the preview's own host; the copy control is checked only for the string it shows and copies. | AC-10 |
| V2 | Temporary GitHub Pages range created with create-wxl from the `stage8/<ticket-id>` commit (base `/<repo>/`) | Stored value none: a cold load of `/<repo>/challenge/<fixture>/` gives A2 and A7; a cold load of `/<repo>/zh-TW/challenge/<fixture>/` gets GitHub Pages' 404 page and then C1 (C4, C6); the Traditional Chinese list's copy control shows the English page URL (F6); B3 on the reference page. | AC-10 |
| V3 | The reference page, on either surface | Stored value `en`: A4 on a cold load; then, at 1280, 1024 and 375 wide, choosing 繁體中文 gives B2 (no navigation, no history entry, the line in `zh-TW`) and B5 (choosing English removes it); no built-in translation menu at any of the three widths, in the static HTML (with scripts disabled) or after hydration (B4). On `/zh-TW/no-such-page`, choosing English gives B7. | AC-10 |

| V1 row | Action | Stored value | Expected (row) |
|---|---|---|---|
| V1a | Cold load the fixture's URL | none; `zh-TW` | A2; L2 with its link; L3 |
| V1b | Same | `en` | A4 |
| V1c | Request `/zh-TW/c/<fixture-slug>`, then, in a new tab, `/zh/c/<fixture-slug>` | none; `zh-TW`; `en` | C1; C5 (stored value unchanged) |
| V1d | Request `/c/999`, `/en/c/999`, `/zh/c/999`, `/zh-TW/c/999`, each in a new tab | none; `en` | G1, G3; then A2 (none) or A4 (`en`) |
| V1e | Request `/zh/c/001` and `/zh-TW/c/001` (translated), each in a new tab | `en` | G2; then A5 and W2 (stored value becomes `zh-TW`) |
| V1f | Request `/c/001` and `/en/c/001`, each in a new tab | none; `en` | G1; then A1 (none) or A4 (`en`) — D6 |
| V1g | Open `/zh-TW/challenges` (list and grid view) and `/zh-TW/` | `zh-TW` | E2, E6, E7; F3 string `wxl.browserlab.online/zh-TW/c/999`; F10 |
| V1h | In `/zh-TW/challenges`, click the fixture | `zh-TW` | L5 (the line on the English page); W5 (stored value still `zh-TW`); the line's link opens `/zh-TW/challenges` |
| V1i | In a new tab and new session, with a stored attack record for the fixture, cold load the fixture and choose to continue in the session gate | none | A6, L1: the line appears only after the choice |
| V1j | Open `/challenges`, then in the same tab request `/zh-TW/c/<fixture-slug>`, then Back, then Forward | `en` | C7: Back returns to `/challenges`; W5: stored value still `en` |
| V1k | Request `/en/challenges` | none | C3: the not-found page, no line |
| V1l | On the fixture's page at 375 wide with the Browser panel open, choose 繁體中文, then English | `en` | B2, B5; D15: the description, Code and Browser panels stay usable with the line shown |

After stage 8, with the user's approval, the `stage8/<ticket-id>` branch, its preview deployment and
the temporary GitHub Pages range are deleted (D12).

## Acceptance criteria index

| AC | Rows |
|---|---|
| AC-1 | P1–P5, P7 |
| AC-2 | A1–A7 |
| AC-3 | B1–B7 |
| AC-4 | C1–C11 |
| AC-5 | L1–L9 |
| AC-6 | E1–E10 |
| AC-7 | F1–F10 |
| AC-8 | G1–G10 |
| AC-9 | H1a, H1b, H2–H7, P6 |
| AC-10 | V1–V3 |
| AC-11 | W1–W6 |

## Checks on this revision

Each rule added in revisions 2 and 3 was checked against the existing ones for mutual exclusion
(review.md, "Two rounds, then split"). Revision 3's checks come first.

- **B7 against L1 and B2.** B2 applies on a page; B7 on the not-found page. Neither shows the line on
  the not-found page, so L1 holds; B7 writes the choice, as every switcher choice does (W1).
- **B5 against the menu's one-option contract.** The one-option menu stays whenever the line is not
  shown; the second option appears only with the line. The contract is listed as overridden.
- **D17 against A6, C11 and the trust boundary.** Only the switcher's line skips the wait; it is
  produced by the learner's own act on a page the gate already allows them to use (ADR-0006: the gate
  is not modal). The cold-load and not-found lines still wait. The trust-boundary row says the same.
- **D16 against the lookup algorithm.** A page arrival never reaches the algorithm: it uses its
  rendered page's entry. The algorithm runs only for a not-found path and for B7. A1 and B1 targets
  are entries, so an alias URL never becomes a redirect target.
- **W2 after the router resolves, against the cold-load redirect.** The redirect already waits until
  the Layout is mounted and the gate has decided (A6), so deciding W2 after the router resolves
  changes no ordering the redirect relies on. A4 and A5 read the stored value before W2 writes it.
- **D13 against W5 and US6.** A reload is a cold load, not a client-side navigation, so W5 does not
  cover it and W2 does; US6 and H2 state that opening a `/zh-TW/` page, including by reload, sets the
  language.
- **D14 against B6 and W6.** The in-memory choice is the stored value only within the tab and only
  when the write failed; with writable storage it never exists.
- **L6 against C9.** A redirect that lands on a not-found page discards the carried locale, so L1's
  "never on the not-found page" and B7 are not affected by it.
- **G9 against G6.** G6 says who refuses an orphan brief (the hook, CI); G9 says what the generator
  emits if one reaches it anyway. The CI check still fails such a tree, so G9 is a fallback, not a
  supported state.
- **G3 against epic 0007's H20.** An untracked or ignored Traditional Chinese directory no longer
  removes rules; it leaves them pointing at the English page. The overridden-contracts table lists
  H20 and the W4 message, and H1a rewrites the message.
- **D10 against D7 and B5.** D10 now limits itself to the content area; the menu changes are D7's and
  B5's.
- **T3 against T1, T2.** No cycle: S2 before S1; S1 and the watcher change before S4; S6 no later
  than S5.

Revision 2's checks:

- **D11 against A and C.** Every arrival is exactly one of: page arrival (A on cold load, B on
  switcher, L5 on later navigation), not-found arrival (C), or failed load (C8). A1 and C2 cannot meet:
  A requires a page, C requires a path not in the list.
- **D5 against A5 and the explicit-request rule.** A5 writes `zh-TW` because the path is an explicit
  request for a published page (W2), the rule `shouldPersistOnColdLoad` already states; D5 narrows it
  to published pages (W3). The requested locale on A5 is the prefix's, so the old "stored `en`, line in
  `en`" case cannot arise.
- **D5 against L5 and L6.** A redirect S1 makes is not a later navigation, so C1's line survives its
  own replace, and the watcher no longer writes, so nothing reads a value the redirect changed.
- **D5 against B2.** B2 writes the choice and does not navigate; no watcher runs. B5 is the way back,
  and W1 covers it.
- **D8 against L2.** The link is part of the canonical text and is compared by equality with it.
- **F10 against F3/F6.** Only the link follows the entry; the control's own text does not.
- **G1 against D6.** G1 states where the rule points; what the learner then sees is A1–A4.
- **C10 against C1/C2.** The replace target is a list entry, never URL text; query and hash are kept
  from the URL but cannot change the origin under `router.go`.
- **E3 and the fixture.** E3 has its own fixture entry, used at S1 and S4 only; G9 has its own S6
  fixture.
- **T1, T2.** Constraints on stage 4, not behaviour; checked in the claim table.

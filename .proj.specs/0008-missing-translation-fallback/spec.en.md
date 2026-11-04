# Spec 0008: Missing-translation fallback — no 404 for a page that has no translation, and every challenge in every list

Status: revision 3.1 (2026-11-05): T-0053's reviews moved W5 and D7 into that ticket, removed the
switcher flag instead of flipping it, and made the page-list oracle skip dot-prefixed paths
(traceability, revision 3.1). Revision 3 (2026-11-04). Round 1 of adversarial review found four P0s and round 2 none
(`review/round-1.md`, `review/round-2.md`), so the stage 3 gate is met. Revision 2 applied round 1's
disposition (`review/disposition.md`) and the user's decisions U1–U6; revision 3 applies round 2's
(`review/disposition-2.md`) and U8–U11. Two rounds is the ceiling, so revision 3 is self-checked
rather than reviewed again. Derived from `traceability.md`, which holds:

- the decisions G2, G6, G7, G20–G23 (stage 1) and D1–D17 (stages 2 and 3);
- the seams 0008-S1 to S7 and the ticket constraints T1–T4;
- the vocabulary, the requested-locale table, the canonical sentences, links and marks;
- the schemas of the page list (with its lookup algorithm), the locale challenge data (with its merge
  rules) and the redirect rules;
- the overridden contracts;
- rows P, A, B, C, L, W, E, F, G, H and V.

Stage 1 is recorded in the local research note `.proj.research/2026-11-02-primary-locale-grill.md`.
It splits the work into three epics; this is the first. The second lets a range choose its primary
locale (ADR-0008), and the third adds Japanese. Nothing here anticipates them beyond what is stated
under Further Notes.

## Problem Statement

A teacher who adds a challenge in English only, as `pnpm create:challenge` and the wxl-create skill
both do, publishes a challenge that most of their students cannot reach. The site sends a visitor
who has not chosen a language, and one who chose Traditional Chinese, from an English page to its
Traditional Chinese counterpart without checking that it exists. They land on the not-found page.
The Traditional Chinese challenge list leaves the challenge out, so they cannot find it there either
(OQ-023, reproduced on 2026-10-24 on a temporary GitHub Pages range).

Articles have the same defect. On 2026-11-04 the production site showed it on its one English-only
article, the attack-log export format reference. A cold load of that page sent a visitor with no
stored preference, and one whose stored preference was Traditional Chinese, to a 404. Choosing
繁體中文 in the locale switcher on that page also gave a 404. And a 404 at a `/zh-TW/` path wrote
Traditional Chinese into the visitor's stored preference, so a learner who had chosen English lost
that choice by following a broken link.

## Solution

The site never sends a learner to a translation that does not exist. When the learner's language has
no version of a page, they stay on the version that exists and see one line, in their language,
saying so, with a link to the challenge list in their language. That holds for a cold load, for the
locale switcher, and for any path that would otherwise end on the not-found page: a short link by
slug, an edited URL, an old link, or GitHub Pages' 404.

The stored language preference changes only when the learner chooses: by the locale switcher, or by
opening a page whose address names a language — directly, through a short link, or by reloading it.
Following a link into a page in the other language, pressing Back, or being sent on by the site's own
redirects no longer changes it. When the browser cannot store the choice, the tab remembers it.

Every challenge list shows every challenge. A challenge with no version in the list's language shows
its title and summary from the version it has, with a mark such as 「只有英文」, and opens that
version.

The copy control gives a short link that names its language: `/en/c/NNN` or `/zh-TW/c/NNN`. Every
challenge has both, and the Traditional Chinese one opens the English page when there is no
Traditional Chinese brief. `/c/NNN` and `/zh/c/NNN` are no longer given out, and every one already
printed keeps opening. In this epic `/en/c/NNN` opens the English page the way `/c/NNN` does, so a
learner whose language is Traditional Chinese is still taken to the Traditional Chinese version when
there is one; it opens English for everyone once the primary-locale epic gives English its own
address prefix.

## User Stories

1. As a teacher, I want a challenge I wrote only in English to appear in the Traditional Chinese list, so that students on the default language can find it.
2. As a teacher, I want a link to any challenge or article to open for every student, whatever language their browser has stored, so that a link I hand out never ends on a 404.
3. As a learner, I want to be told when a page has no version in my language, in my language, so that I know the site is not broken and why the page is in another language.
4. As a learner, I want a way back to the challenge list in my language from a page shown in another language, so that I do not keep reading in a language I did not choose.
5. As a learner, I want the locale switcher to keep me on the page when it has no version in the language I pick, and to remember my pick, so that I do not lose the page I was on.
6. As a learner, I want my language to change only when I choose it — with the locale switcher, or by opening an address that names a language — so that following a link, pressing Back or landing on a broken address does not switch it for me.
7. As a teacher, I want the short link I copy to name its language, so that it keeps opening that language after the upstream site changes its primary locale.
8. As a teacher, I want the `/c/NNN` and `/zh/c/NNN` links already printed on my handouts to keep working, so that I do not have to reprint them.

## Implementation Decisions

- **Page list (S2, D3).** The build produces the set of published pages as base-less paths in the
  `cleanUrls` spelling and ships it to the client, in `pnpm dev` (after a restart) as in `pnpm build`.
  A page arrival is identified by the page the router rendered, mapped to its entry; a not-found path
  by the lookup algorithm, which decodes once, refuses `//`, `\` and `..`, strips `.html` and
  `/index`, tries the path with and without a trailing slash, and never throws. No network request
  decides whether a page exists. An open tab keeps the list it loaded (a documented limit).
- **Classifying an arrival (S1, D11, D16).** Before any other decision, an arrival is a page arrival,
  a not-found arrival (path not in the list), or a failed load (the not-found page for a path in the
  list, shown with nothing else done). Every decision about a page uses its list entry; redirect and
  switcher targets are list entries, never URL text.
- **Locale routing (S1).** The decisions are pure functions over the location, the site base, the
  stored value, the page list and the router's result:
  - The cold-load redirect keeps its rules (it leaves only the unprefixed tree, it waits for the
    session gate's decision, it uses `replace`) and goes only to a counterpart in the list; otherwise
    it stays and the line shows (decision table A1–A7).
  - The locale switcher navigates only when the chosen locale's counterpart is in the list. Otherwise
    it writes the choice, stays without adding a history entry, leaves the URL and the interface
    locale as they are, and the line shows at once. While the line shows, the menu offers the page's
    own locale too, as the way back. On the not-found page it navigates to a counterpart that exists
    and otherwise only writes the choice.
  - A not-found arrival is replaced by its counterpart when the counterpart is in the list, once per
    arrival, through the router, after the session gate's decision.
  - Each decision yields the arrival's requested locale. A redirect S1 makes carries it to the page it
    lands on, and the carried value is discarded at the next arrival.
- **Writing the preference (D5, D13, D14).** Only a switcher choice and a cold load of a published
  page under `/zh-TW/` (also through a short link's redirect or a reload) write the stored preference,
  the latter decided after the router resolves rather than in `enhanceApp`. The Layout's route watcher
  keeps setting the interface locale from the URL and no longer writes the preference. When storage
  cannot be written, a switcher choice is kept in memory for the tab.
- **One locale switcher (D7).** `USE_CUSTOM_LOCALE_SWITCHER` is removed and its `true` branch kept, so
  default-theme pages use `LocaleSwitcher` in the nav bar slot; challenge pages keep theirs in `MergedNav`. All three built-in
  translation menus (`VPNavBarTranslations`, the translations group in `VPNavBarExtra`,
  `VPNavScreenTranslations`) are hidden by CSS that does not depend on a class added at run time.
- **The line (S3, D8, D10, D15, D17).** A theme component, client-only, re-evaluated on every arrival
  (a change of hash or query alone is not one). On a challenge page it is a full-width bar directly
  below `MergedNav` and above the runtime-reset banner; on a default-theme page it is in the layout's
  top slot (`doc-before`, `page-top` or `home-hero-before`). It renders the canonical sentence and link
  of the requested locale, from that locale's message file, with `lang` set to `en` or `zh-TW`. It
  cannot be dismissed and never renders on the not-found page. The line of a cold load or not-found
  arrival waits for the session gate's decision; the line of a switcher choice does not.
- **Locale challenge data (S4).** Each locale's data loader returns every challenge per the merge
  rules: keyed by slug, borrowed fields (category included) from the brief that exists, defaults from
  the list's locale, one shared `id` rule, and the new `locale` field. `ChallengeList` shows the mark in
  list and grid view and `HomeContent` on its latest-challenge cards, both resolved in the page's locale
  so the static HTML carries it; a borrowed title and summary carry the `lang` of their locale. An
  entry with only a Traditional Chinese brief shows no short link in the English list.
- **Challenge link (S5).** The short path is `/<locale code>/c/NNN`. `ShortLinkShare` takes two
  inputs: the locale of its own text (the list's or page's) and the locale of the link (in short
  mode the list's or page's, in page mode the entry's page). The mode rule of epic 0007 (`CF_PAGES`)
  is unchanged.
- **Redirect rules (S6).** `generateRedirects` writes four padded numbered rules per challenge with an
  English brief and four parameterised rules, in the schema's order; a Traditional Chinese numbered
  rule points at the English page when the challenge has no Traditional Chinese brief, or when its
  Traditional Chinese directory is untracked or ignored. A challenge with only a Traditional Chinese
  brief, which the pre-commit hook and CI's tree check refuse, gets only its two Traditional Chinese
  rules if it reaches the generator. The header states the 500-challenge limit that Cloudflare's 2,000
  static rules impose.
- **Message keys.** Keys for the line's sentence, the line's link text and the mark, each in both
  message files. Stage 6 checks on the diff that no other key changes.
- **Overridden contracts.** The traceability's table lists every existing contract this epic changes
  on purpose, with the tests that pin it — among them epic 0007's rows H01, H02, H14, H20, H37, H39
  and H40, the route watcher's write, the switcher's one-option menu, and where the built-in menus are
  hidden. Each changes only as stated there, and stage 6 rejects any other test change.
- **What stays.** `DEFAULT_VISITING_LOCALE` stays `zh-TW` (D4). `create:challenge`, the pre-commit
  hook's triggers and refusals, and wxl-create are unchanged.

## Trust Boundaries and Threat Model

| # | Boundary | Protects | Does not protect | Outside the model |
|---|---|---|---|---|
| B1 | Build → page list shipped to the client | The list holds only paths of pages the build publishes. It adds no exposure: every built page already carries VitePress's page hash map, which names every published page | Nothing new. A page meant to be found only by its URL was never hidden, and is not now | The static host |
| B2 | URL → where the learner is sent | A redirect target is the site base followed by an entry of the page list, and navigation goes through the router, so a crafted path (`//host/…`, encoded slashes, backslashes, `..`, malformed encoding) cannot send the learner off the site, to a page that is not published, or into an error (C10, lookup algorithm). Query and hash are kept from the URL, as the cold-load redirect keeps them today | A path naming a real page in the other locale sends the learner there, which is the purpose | — |
| B3 | Built site → learner's screen and clipboard | As epic 0007's B4: link text comes only from `SITE_ORIGIN`, the padded number and a slug within the slug grammar, through Vue's escaping bindings. The line's text is a fixed message | A `SITE_ORIGIN` naming the wrong site still gives links that open that site (0007's D10). Ranges under one GitHub Pages owner share the stored preference (OQ-018): one range's choice decides another range's redirect and line, though no longer a 404 | — |
| B4 | Learner's choices → stored preference → routing | Only `en` and `zh-TW` are honoured; any other value, or unreadable storage, is no preference. Only the learner's choices write it: the switcher, and opening an address under `/zh-TW/` (D5, D13) | Any page, here or elsewhere, can link to a `/zh-TW/` address, and opening it sets the language to Traditional Chinese; no link sets it to English in this epic. A learner who edits storage can choose either language, which is the switcher's purpose | — |
| B5 | Session gate → navigation (ADR-0006) | The gate protects the attribution and truthfulness of what the site reports about saved work; the previous learner on a shared machine is not an adversary, and the gate is a notice, not access control (ADR-0006). The cold-load redirect, the not-found redirect, and the line they produce wait for the gate's decision, as the cold-load redirect does today | The line a switcher choice produces does not wait: the choice is the learner's own act, and the gate is not modal (D17). Anything ADR-0006 already says the gate does not protect | — |

No intended vulnerability of any challenge is touched, so ADR-0005 does not apply.

## Acceptance Criteria

- **AC-1** For a fixture tree and for the real tree, the page list equals the oracle's set (every
  `*.md` under `platform/` outside `public/` and `shared/`, skipping dot-prefixed paths, in the
  `cleanUrls` spelling); the not-found
  page and non-page files are absent; every source path, including one rendered from an alias URL,
  maps to its entry; each not-found path of the lookup table gives the stated result and none throws;
  the list follows a page added or removed, under `pnpm dev` after a restart. (P1–P5, P7)
- **AC-2** The cold-load decision, for every row of the decision table A1–A5 (each stored value it
  names × challenge and article × base `/` and `/repo/`), redirects or stays, shows the line or not,
  and writes the preference or not, exactly as the row states; a redirect goes to a list entry, keeps
  base, query and hash and uses `replace`; the redirect and the line wait for the session gate's
  decision. (A1–A7)
- **AC-3** The switcher writes the choice on every choice; on a page with the counterpart in the list
  it navigates to it; without it, it does not navigate, adds no history entry, leaves the URL and
  interface locale unchanged and shows the line in the chosen locale at once, also before the session
  gate decides; the menu's title is the page's locale, it offers one option without the line and two
  with it, and choosing the page's own locale writes it and removes the line; on the not-found page it
  navigates to an existing counterpart or else only writes; this holds in `MergedNav` and in the
  default-theme nav bar, for both bases; at 1280, 1024 and 375 wide (stage 8, V3 and V1l) none of the
  three built-in translation menus is shown, in the static HTML or after hydration; with storage that
  cannot be written nothing throws and the choice holds for the tab. (B1–B7)
- **AC-4** A not-found arrival whose counterpart matches by the lookup algorithm is replaced by that
  list entry once, keeping base, query and hash, and shows the line in the locale the path named on the
  page it lands on; with no match, and for every crafted path of the lookup table, the not-found page
  shows with no line and the result is same-origin; a failed load shows the not-found page with no
  redirect; all of this holds for a cold load and for client-side navigation, the redirect waits for
  the gate's decision and the line for the landing page's, no preference is written, and Back returns to
  the page before the not-found path. (C1–C11)
- **AC-5** The line renders exactly when L1 holds, never on the not-found page, after the gate's
  decision for a cold load or not-found arrival and at once for a switcher choice; its sentence and link
  text equal the canonical ones for the requested locale, `lang` is the literal `en` or `zh-TW`, and the
  link goes to the stated list with the base added; on a challenge page it is the bar below `MergedNav`
  and above the runtime-reset banner, visible with the description panel open and collapsed; on a
  default-theme page it is in the layout's top slot named in L4; it is re-evaluated on every arrival,
  unchanged by a hash- or query-only navigation, kept across a redirect S1 made and discarded after it,
  has no close control, and is absent from the static HTML. (L1–L9)
- **AC-6** With a fixture of one translated challenge, one English-only challenge that omits
  `category`, one challenge with only a Traditional Chinese brief and one challenge without a number,
  both locales' data hold all four with the same `id`s and the `locale` field of the schema; the
  English-only entry in the Traditional Chinese list has the English title, summary and URL, the
  category `綜合` for the field its brief omits, `lang="en"` and the mark `只有英文`; the reverse entry shows
  `Traditional Chinese only` and no short link; the mark shows in list view, grid view and the home
  page's latest cards, already in the static HTML; the home page counts all four; search, filters and
  the solved badge work on borrowed entries; the entry without a number has no short link. (E1–E10)
- **AC-7** The helper and the copy control give exactly the URLs of rows F1–F7 in both modes and both
  locales, including the untranslated entry; the control's label and status texts are in the list's or
  page's locale whatever the link's locale; the displayed text matches the URL as today; no output
  contains `/zh/c/` or a `/c/` path without a locale code before it. (F1–F10)
- **AC-8** For a fixture of one translated and one English-only challenge, and for the real tree, the
  generated file holds, in order, four padded numbered rules per challenge as the schema states (the
  English-only challenge's Traditional Chinese rules pointing at its English page), then the four
  parameterised rules; the comparison is on rule order and the three fields, not padding; regenerating
  gives no diff; an untracked or ignored Traditional Chinese directory re-points rather than removes
  its rules; for a separate fixture with a challenge that has only a Traditional Chinese brief, the
  generator emits only its two Traditional Chinese rules, and the pre-commit hook and CI's tree check
  still refuse such a tree; the committed file matches the generator; the header states the
  500-challenge limit. (G1–G10)
- **AC-9** Stage 6 confirms on the diff that every passage of rows H1a–H7 says what its row states, in
  both languages where the document has two, that P6 and D13 are documented as H3 states, and that no
  changed document in the glossary's corpus uses the term 主語系. (H1a, H1b, H2–H7, P6)
- **AC-10** Stage 8, driven with `/agent-browser` or the host's native browser tools and with challenge
  pages' Browser panel open, observes rows V1 (V1a–V1l), V2 and V3 on the surfaces they name, opens a
  new tab and sets the stored value as each row states before every action, reports which surface each
  observation covers, and runs per T4. (V1–V3)
- **AC-11** The stored preference is written by a switcher choice and by a cold load (including a
  reload or a short link's redirect) of a published `/zh-TW/` page, decided after the router resolves,
  and by nothing in rows W3–W5, including Back, Forward, an untranslated list entry, the guide's link to
  the reference page, a cold-load redirect, a not-found redirect and a failed load; the interface locale
  still follows the URL; storage that cannot be written never throws and a switcher choice holds for
  the tab. (W1–W6)

## Testing Decisions

- Test external behaviour at the seams: the routing and preference decisions as pure functions over
  location, base, stored value, page list and the router's result (S1); the page list against its
  independent oracle and the lookup table (S2); the rendered line, list and home page as components
  (S3, S4); the link helper and copy control (S5); the generator's output (S6). No test asserts on
  internal state.
- The line's sentences, link texts and the list's marks are pinned by literal equality, the way
  `SessionGate-truth.test.ts` pins the session gate's copy.
- The S4 fixture carries one translated challenge, one English-only challenge without `category`, one
  challenge with only a Traditional Chinese brief, one challenge without a number, and one English-only
  article; S1 and S2 reuse its pages. S6 uses its first two challenges, and a separate fixture for the
  challenge with only a Traditional Chinese brief (G9), because the generator throws on a challenge
  without a number.
- Existing tests named under "Overridden contracts" change with this epic; stage 6 checks each change
  is the one that table states, and rejects a change to any test not named there.
- Stage 8 is the browser surface (S7): the session gate's hold, hydration, the hidden built-in menus,
  the route watcher and each host's 404 handling sit between the unit-tested decisions and the learner.

## Out of Scope

- Choosing a primary locale, moving pages into per-locale folders, `range.json`, create-wxl and
  fork:init flags, moving challenge declarations, and making the primary locale the default for a
  first-time visitor: the primary-locale epic (ADR-0008; stage 1 note Q1, Q3, Q8–Q18).
- Japanese: the third epic.
- Writing a Traditional Chinese version of the attack-log export format reference: the primary-locale
  epic (stage 1 note Q16). This epic makes its absence harmless.
- Isolating the stored preference between ranges under one GitHub Pages owner (OQ-018).
- Refreshing the page list in a tab that stays open across a redeploy (P6).
- A history marker that would stop a reload from counting as a choice (D13).
- Refusing to generate `_redirects` beyond 500 numbered challenges; the limit is stated, not enforced.
- A close control for the line (D15).
- Changing `create:challenge`, wxl-create or the pre-commit hook's triggers and refusals.

## Further Notes

- The rules are written in terms of "the counterpart" and "the requested locale" so that the
  primary-locale epic can replace the two-locale counterpart with "the same page in the primary
  locale" without rewriting them.
- `/en/c/NNN` is given out from this epic on so that a link printed now opens English after the
  upstream site makes Traditional Chinese its primary locale (stage 1 note Q8, Q23). Until then it
  behaves as `/c/NNN` does (D6).
- A path such as `/en/challenges` is not a page in this epic and ends on the not-found page (C3); it
  becomes a page in the primary-locale epic.
- A range that upgrades to the release carrying this epic gets a new `_redirects` layout; its CI
  staleness check asks for `pnpm redirects:generate`, as the README already says (H2).
- Ticket order: S6 lands no later than S5, S1 no earlier than S2, and S4 no earlier than S1 and the
  route watcher's change (traceability T1–T3). Stage 8 runs per T4 on a throwaway branch (D12), and the
  branch, its preview and the temporary range are deleted afterwards with the user's approval.
- `CHANGELOG.md` mentions `/zh/c/001` as history and is not changed.

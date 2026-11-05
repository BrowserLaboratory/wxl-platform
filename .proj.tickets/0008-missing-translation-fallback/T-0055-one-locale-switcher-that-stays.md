---
id: T-0055
title: One locale switcher on every page, which stays on the page when the chosen locale has no version
epic: 0008-missing-translation-fallback
status: done
blocked_by: [T-0054]
---

## Context

Default-theme pages use VitePress's built-in translation menus, which link straight to the
counterpart without asking whether it exists; on the production reference page, choosing 繁體中文
gives a 404. There are three of them, one per width range. The challenge pages' `LocaleSwitcher`
navigates unconditionally too. T-0053 already made `LocaleSwitcher` the only menu on every page and
hid the three built-in menus without a script (D7, moved there by U14 on 2026-11-05, which also
removed `USE_CUSTOM_LOCALE_SWITCHER` instead of flipping it). This ticket makes the switcher stay,
with the line, when the chosen locale has no version (U3, U10).

Spec: `spec.en.md` revision 3.1, "Locale routing" (the switcher bullet), "One locale switcher",
"Writing the preference"; `traceability.md` revision 3.4, decisions D14, D17 (D7 landed with T-0053),
rows B1–B7, W1, W6, and the overridden contracts for the switcher's menu, `select` and its early
return, and its runtime-locale change. Blocked by T-0054, which changes the same routing module and
the preference writes this ticket builds on (`done`, PR #52).

## Deliverable

Choosing a locale always writes it (in memory for the tab when storage cannot
be written); the switcher navigates only to a counterpart that is a published page, and otherwise
stays, adds no history entry, keeps the URL and interface locale, and shows the line at once in the
chosen locale. While the line shows, the menu also offers the page's own locale as the way back. On
the not-found page it navigates to an existing counterpart or only writes the choice.

## Acceptance criteria

> Note: D7 itself — `LocaleSwitcher` on every page, the flag removed, the three built-in menus hidden without a script — landed with T-0053 (U14, 2026-11-05). What remains here is the switcher's behaviour below.

- [x] B1–B7: navigate or stay; no history entry; interface locale unchanged; the line at once, also before the gate decides; menu title and one or two options; the way back; storage that cannot be written; the not-found page; `MergedNav` and the default-theme nav bar; both bases (AC-3)
- [x] W1, W6: every choice writes; storage that cannot be written never throws and the choice holds for the tab (AC-11)
- [x] L1 exercised for switcher choices (AC-5)
- [x] H1b (this ticket's part): `LocaleSwitcher`'s menu and runtime-locale comments state B2 and B5 (AC-9). The flag's comment went with the flag, and the hiding rule's comment in `style.css` states D7 since T-0053.
- [x] H3 (this ticket's part): troubleshooting's passages on switching locale and the traffic log, on the switcher navigating to the other locale's URL; the guide index's sentence on the Network log; `guide/network.md`'s sentence; both languages (AC-9)
- [x] H7 (AC-9)
- [x] Overridden contracts touched here (the switcher's menu, `select` and its early return, its runtime-locale change; the flag comment and the hiding rule changed with T-0053) change only as the traceability table states
- [x] Stage 8 (T4): V3 at 1280, 1024 and 375 wide, including the static HTML with scripts disabled, and V1l with the Browser panel open, on the Cloudflare preview of `stage8/T-0055` (AC-10)

## 給使用者（zh-TW）

每一頁只剩自訂語系選單、內建的三個翻譯選單全部隱藏，這部分已隨 T-0053 落地（U14）；這張票負責選單的行為，第 8 階段再確認隱藏在三種寬度與停用 script 時都成立。選了某個語系，如果這一頁有那個語系的版本就過去；沒有就留在原頁，顯示提示那一行，並記住選擇。提示顯示時，選單會多一個「回到頁面本身語系」的選項。瀏覽器不能存資料時，選擇記在這個分頁裡。

## Comments

### 2026-11-05 — test plan (stage 5)

Read for this plan: this ticket (its body corrected first: D7, the flag and the hiding rule landed with
T-0053, U14); `spec.en.md` revision 3.1 ("Locale routing", "One locale switcher", "Writing the
preference", AC-3, AC-5, AC-11, the trust boundaries B4, B5) and `traceability.md` revision 3.3 (D14,
D16, D17, the requested-locale table, rows B1–B7, W1, W6, L1, L5, L8, H1b, H3, H7, the overridden
contracts); T-0053's and T-0054's records; and, at `e4fdb46`, `.vitepress/theme/components/{LocaleSwitcher,MergedNav}.vue`,
`.vitepress/theme/index.ts` (Layout, `provide(MISSING_TRANSLATION_LOCALE, …)`, the nav slot, `holdLine`),
`.vitepress/theme/composables/useArrivals.ts`, `.vitepress/theme/i18n/{index,arrival,pages,lookup}.ts`,
`tests/unit/i18n/{locale-switcher,not-found-wiring,initial-locale-redirect}.test.ts`,
`tests/unit/components/MergedNav.test.ts`, `tests/site-smoke/missing-translation.spec.ts`. Before
approval the draft was checked by two independent reviewers (completeness, design; workflow
`wf_5a3c4674-751`); their findings are folded in.

Working names, not fixed by the spec:
- `switcherDecision({ chosen, arrival, location, base, pages })` in `arrival.ts` (S1, pure): `navigate`
  with a target built by `targetUrl` from a list entry (D16, never URL text), or `stay`. On a page: the
  chosen locale's counterpart of the arrival's entry, when listed; the page's own locale is always
  `stay`. On the not-found page or a failed load: `lookupNotFound(location.pathname, base, pages)`, the
  lookup algorithm as it stands (B7: the path's counterpart, whatever was chosen; there the menu only
  offers the other locale, since the line never shows on the not-found page).
- `rememberChoice(locale)` in `i18n/index.ts`: writes `wxl-locale`; when that throws, keeps the choice
  in the module for the tab. `readStoredLocale()` returns the kept choice first, so it is "used as the
  stored value for the rest of that tab's arrivals" (D14) even where an older value is still readable;
  a later successful write clears it. `_resetRememberedChoiceForTests()` clears it, after the pattern
  of `_resetSourceViewerSettingsForTests`. `persistLocale` (the cold-load write, W2) is unchanged.
- `useArrivals` gains `choose(locale)`: a switcher choice is an arrival (requested-locale table). It
  writes the choice (W1) and ends the cold load's claim to a redirect (L5). It navigates with
  `router.go(target)` — a push, as the switcher does today, so Back returns — with no carry (the
  landing is in the chosen locale, and the stored value already names it); or it stays: requested
  becomes the chosen locale and the line shows at once, on a path of its own that ignores `holdLine`
  and the first release (D17), while the cold-load and not-found lines keep waiting (A6, C11). It
  returns which it did.
- The Layout provides `choose` under a new injection key beside `MISSING_TRANSLATION_LOCALE`;
  `LocaleSwitcher` injects both and reads nothing else new from VitePress (it keeps `localeIndex`;
  `useRouter` and `site` go). The menu: title the page's locale; options the other locale first, then,
  while the line shows, the page's own locale; each option `role="option"`, `aria-selected="false"`,
  operable by click, Enter and Space (B5). It sets the runtime locale only when `choose` reports a
  navigation (B2). Without a provider (a component mounted alone) the line is absent and a choice is
  only remembered.

Scope notes:
- The real tree has no English-only challenge, so the switcher staying on a challenge page is covered
  by the `MergedNav` component case and at stage 8 on fixture #999 (V1l at 375; the same choice at 1280
  and 1024 recorded alongside). B1 on a challenge page is built-site (`/challenge/selected-excerpts/`).
- B4's hiding half and the switcher being visible at 1280, 1024 and 375 landed with T-0053
  (`missing-translation.spec.ts`, "at <width> wide an article shows only the custom locale switcher",
  green in CI); this ticket adds the switcher's behaviour at the same widths.
- V2's B3 part (GitHub Pages range) is T-0057's full V table; B3 is covered here at S1 and wiring
  level with base `/repo/`.
- Traceability revision 3.4, written before the first existing test is changed (no behaviour change,
  spec text unchanged), names the existing tests this ticket changes that the switcher contracts do
  not name yet: the rest of `locale-switcher.test.ts`'s `select` cases (the base cases, query and hash,
  the runtime-locale disagreement, the three EN/zh-TW path cases, `buildTargetPath`, the keyboard case,
  "closes the dropdown when an option is chosen"); the `beforeEach` of `not-found-wiring.test.ts`,
  `initial-locale-redirect.test.ts` and `locale-switcher.test.ts` gaining the reset; the
  `LocaleSwitcher` stub in `not-found-wiring.test.ts` (it keeps `data-locale-switcher-stub` and also
  injects `choose`, exposing it to the test); and `missing-translation.spec.ts`'s "a choice in the
  custom locale switcher on an article is stored" (it gains Back, B1 being a push). The ticket's spec
  references move to 3.4.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0008-S1 | where a choice goes: a listed counterpart's entry, or stay | `tests/unit/i18n/arrival.test.ts`, `switcherDecision` | B1, B2, B3, B5, B7, D16 — AC-3 | page `/guide/python` choose `zh-TW` → `/zh-TW/guide/python?q=1#h` (query, hash kept); alias: `/challenges/` and `/challenges.html` rendered from `challenges.md` choose `zh-TW` → `/zh-TW/challenges` (entry, not URL text); English-only `/reference/attack-log-export-format` choose `zh-TW` → stay; `/zh-TW/guide/python` choose `en` → `/guide/python`; a `zh-TW`-only fixture page choose `en` → stay; the page's own locale → stay; base `/repo/` → `/repo/zh-TW/guide/python` and stay for the reference page; not-found `/zh-TW/no-such-page` choose `en` → stay; failed load of `/challenges` choose `zh-TW` → `/zh-TW/challenges`, of `/zh-TW/challenges` choose `en` → `/challenges` |
| 0008-S1 | a choice is remembered even when storage cannot be written | `tests/unit/i18n/initial-locale-redirect.test.ts`, new block, `rememberChoice`, `readStoredLocale` | W1, W6, B6, D14 — AC-11, AC-3 | writable → stored and read back; `setItem` throws → no throw, nothing stored, read back from memory; memory wins over an older stored `en`; `getItem` throws too → memory; a later successful write clears the memory; the reset clears it |
| 0008-S1 wiring | the Layout carries a choice through to the line and the router | `tests/unit/i18n/not-found-wiring.test.ts` (its harness controls `page`, the page list, the base and the gate; the switcher stub hands the test the provided `choose`), the real Layout and `useArrivals` | B1, B2, B3, B5, B6, B7, L1, L5, L8, W1, D17 — AC-3, AC-5, AC-11 | English-only article, stored `en`, choose `zh-TW` → `stay`, no `router.go`, line `zh-TW` in `doc-before`, stored `zh-TW`, `i18n` locale still `en`; then a hash-only navigation → line stays (L8); then choose `en` → line gone, stored `en`, no `router.go`; A3 (stored `zh-TW`, cold load of the reference page, the line from the cold load) choose `en` → line gone, stored `en`; challenge page with the gate asking (`markerPresent` false, `gateShouldAsk`, undecided) and an untranslated entry → line in the challenge layout at once, gate still undecided; translated page → `router.go('/zh-TW/…')` once, without `{ replace: true }`; base `/repo/` → `router.go('/repo/zh-TW/guide/python')`, and stay on the reference page; a choice while a cold load's gate asks on a translated page → no cold-load redirect after "continue"; not-found page → no line after a choice; `setItem` throwing → no throw, and the next later arrival on an English-only page uses the kept `zh-TW` (line `zh-TW`) |
| 0008-S1 component | the menu shows the right options and delegates the choice | `tests/unit/i18n/locale-switcher.test.ts` (overridden: the `select` cases, "offers exactly", the non-interactive title; rev 3.4 names the rest), mounted with `choose` and the line locale provided | B2, B5 — AC-3 | no line → one option, the other locale; line → two options in order (other, own), both `aria-selected="false"`, title still the page's locale; click, Enter and Space on either → `choose` with that locale, menu closed; runtime locale changed only when `choose` returns `navigate`; no provider → mounts, one option, a choice is remembered and nothing navigates; ARIA and Escape cases unchanged |
| 0008-S1 component | the switcher inside `MergedNav` gets the same provider | `tests/unit/components/MergedNav.test.ts`, new case providing `choose` and the line locale | B4, B5 — AC-3 | line provided → the nav's switcher offers two options; a choice calls the provided `choose` |
| 0008-S7 (built site) | the switcher stays on the reference page at every width, and the way back | `tests/site-smoke/missing-translation.spec.ts`, at 1280, 1024 and 375 wide | B2, B4, B5, W1 — AC-3, AC-11 | stored `en`, the English-only reference article: choose 繁體中文 → same URL, `history.length` unchanged, line `lang="zh-TW"`, `html lang` still English, stored `zh-TW`; choose English → line gone, stored `en`; red on `e4fdb46` (it navigates to the 404) |
| 0008-S7 (built site) | a choice that navigates still stores, on an article and on a challenge page, and Back returns | same file (overridden: "a choice in the custom locale switcher on an article is stored", rev 3.4); new: `/challenge/selected-excerpts/` at 1280, 1024 and 375 | B1, B4, W1 — AC-3 | `/zh-TW/guide/python`, choose English → `/guide/python`, stored `en`, Back → `/zh-TW/guide/python`; `/challenge/selected-excerpts/` (stored `en`), choose 繁體中文 in `MergedNav` → `/zh-TW/challenge/selected-excerpts/`, stored `zh-TW` |
| 0008-S7 (built site) | B7 on the not-found page | same file | B7 — AC-3 | `/zh-TW/no-such-page`, choose English → stays on the not-found page, no line, stored `en` |
| stage 6 diff check (not automated) | documents and comments | `git diff` against the branch's base | H1b (`LocaleSwitcher`'s menu, runtime-locale, `select` and navigation comments; `useArrivals`' line and "nothing else writes" passages; the Layout's line comment; `readStoredLocale`'s documentation), H3 (`platform/guide/troubleshooting.md` and its zh-TW twin at the switching passages and `#missing-translation`'s causes and "what to do" — the switcher staying and the way back; `guide/index.md`'s Network-log sentence; `guide/network.md`'s sentence; both languages), H7 — AC-9 | no changed document in the glossary's corpus uses 主語系 |
| stage 8 (not automated) | the switcher on real hosts | V3 (1280, 1024, 375; served HTML with scripts disabled via `curl` and Playwright `javaScriptEnabled: false`) and V1l (375 wide, Browser panel open), with the fixture's B2 also at 1280 and 1024, on the Cloudflare preview of `stage8/T-0055` | AC-10 | fixture #999; the surface of each observation stated |

Mutation checks, each recorded as a replace-and-run line with its command: the "stays" cases
(decision, wiring, built site) with the counterpart check removed (always navigate) must go red; the
"at once while the gate asks" wiring case with the switcher's line waiting for the gate again must go
red; the two-option menu case with the page's own locale never offered must go red; the D14 case with
the in-memory fallback removed must go red.

Regression gate for every cycle: `npx vitest run` (baseline rerun on this branch before the first
test); `npx vue-tsc --noEmit -p tsconfig.json` stays at 107 errors; site-smoke (`pnpm docs:build &&
npx playwright test --config playwright.site.config.ts`, after clearing port 4173) before stage 6. The
existing cold-load and not-found gate-wait wiring cases must stay green.

Approval: the user approved this test plan on 2026-11-05 ("核准計畫表"), including the in-memory read order for D14 shown with it (the kept choice is read first, even over an older readable value; a later successful write clears it).

### 2026-11-05 — coverage report (stage 5)

Branch `tickets/T-0055/one-locale-switcher-that-stays`, working tree on `e4fdb46`, not yet
committed; figures after stage 6's fixes. Baseline: the first `npx vitest run` on this branch ran
while the first red cycle was being written (a deviation from the plan's "rerun before the first
test"): 1 failed file of 135, 10 failed, 4793 passed, 1 skipped — no product file had changed yet,
so the 4793 are `e4fdb46`'s suite, all green, and the 10 are the new `switcherDecision` cases, red.
After: `npx vitest run` → 135 files, 4824 passed, 1 skipped. `pnpm docs:build && npx playwright test
--config playwright.site.config.ts` → 86 passed (79 before, 7 new). `npx vue-tsc --noEmit -p
tsconfig.json` → 107 errors, unchanged. `python3 scripts/prose-audit/run.py
platform/guide/troubleshooting.md platform/zh-TW/guide/troubleshooting.md platform/guide/index.md
platform/zh-TW/guide/index.md platform/guide/network.md platform/zh-TW/guide/network.md --out <dir>`
→ PASS, 0 blocking. H7: `git diff e4fdb46 -- platform | grep '^+' | grep -c 主語系` → 0. Coverage is
not measured (OQ-009).

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0008-S1 | `arrival.test.ts`, "switcherDecision" (10: B1 with query and hash, D16 aliases ×2, B2 both directions, B5 ×2, B3, B7 not-found, B7 failed load ×2) | R1 below: all 10 red at `e4fdb46`'s `arrival.ts`; M1 turns the four "stays" cases red | B1, B2, B3, B5, B7 — AC-3 | — |
| 0008-S1 | `initial-locale-redirect.test.ts`, "rememberChoice" (6); its `beforeEach` resets the kept choice | R2: the whole file red at `e4fdb46`'s `i18n/index.ts` (no `_resetRememberedChoiceForTests`, so every `beforeEach` throws); M4 turns three red | W1, W6, B6, D14 — AC-11, AC-3 | — |
| 0008-S1 wiring | `not-found-wiring.test.ts`, "the real Layout: a locale switcher choice" (10, including the choice before the first release, the B7 navigation from a held not-found page, and B6 with a kept `en` that only the memory can explain); the stub hands the test the provided `choose`; `beforeEach` resets the kept choice | R3: all 10 red at `e4fdb46`'s `theme/index.ts` (nothing provided); M1 five red, M2 both D17 cases, M4 the B6 case, M5 the before-release case | B1, B2, B3, B5, B6, B7, L1, L5, L8, W1, D17 — AC-3, AC-5, AC-11 | the B7 navigation and Back across it on a real host: stage 8 |
| 0008-S1 component | `locale-switcher.test.ts`: the `select` cases assert the provided `choose` ("hands … to the provided choice" ×2, keyboard, Space, the runtime-locale disagreement, the title not interactive); runtime locale set only on `navigate` (×2) and left on `stay`; "with the line showing" (6); "without the Layout's provider" (1) | R4 (below) is not a clean red: `e4fdb46`'s component needs `useRouter` and `site`, which this file's mock no longer gives, so most of the file errors at mount; M3 turns five "line showing" cases red | B2, B5 — AC-3 | — |
| 0008-S1 component | `MergedNav.test.ts`, "the bar's switcher offers the way back while the line shows and hands the choice to the Layout" | green when written; R5: red at `e4fdb46`'s `LocaleSwitcher.vue` (one option; this file's mock still provides `useRouter`); M3 red | B4, B5 — AC-3 | — |
| 0008-S7 (built site) | `missing-translation.spec.ts`: the B2/B5 case ×3 widths, now also reading the vue-i18n runtime locale; the B1 challenge-page case ×3; B7 (waits for the network to settle before checking it stayed); "a choice … is stored, and Back returns" | R6: 4 red on a build of `e4fdb46`'s six theme files (B2 ×3, B7); the four B1 cases are guards, green on both builds | B1, B2, B4, B5, B7, W1 — AC-3, AC-11 | B2 on a challenge page (no English-only challenge in the real tree): stage 8; base `/repo/` on a real range: T-0057's V2 |
| documents | `LocaleSwitcher.vue`, `useArrivals.ts` (module comment, `holdLine`, `choose`), `theme/index.ts` (two comments), `i18n/index.ts` (`localizePath`, `readStoredLocale`, `rememberChoice`), `missingTranslation.ts`; the guide's switching passages in `troubleshooting.md`, `index.md`, `network.md`, both languages | stage 6 diff check (below) | H1b, H3, H7 — AC-9 | — |
| stage 8 | — | — | V3, V1l — AC-10 | not run yet |

Reproductions. Each replaces one file (R1–R5) or six (R6) with `e4fdb46`'s version, runs the
tests, and restores the copy taken first; on the ticket's commit `git checkout -- <files>` restores
instead. Taken with `python3 <scratchpad>/red55.py`, which does exactly this:

```
# R1  red: 10 of 29
git show e4fdb46:.vitepress/theme/i18n/arrival.ts > .vitepress/theme/i18n/arrival.ts
npx vitest run tests/unit/i18n/arrival.test.ts
# R2  red: 104 of 104
git show e4fdb46:.vitepress/theme/i18n/index.ts > .vitepress/theme/i18n/index.ts
npx vitest run tests/unit/i18n/initial-locale-redirect.test.ts
# R3  red: 10 of 84, the switcher block
git show e4fdb46:.vitepress/theme/index.ts > .vitepress/theme/index.ts
npx vitest run tests/unit/i18n/not-found-wiring.test.ts
# R4, R5  red: 29 of 94 (the component file errors at mount), and MergedNav's new case
git show e4fdb46:.vitepress/theme/components/LocaleSwitcher.vue > .vitepress/theme/components/LocaleSwitcher.vue
npx vitest run tests/unit/i18n/locale-switcher.test.ts tests/unit/components/MergedNav.test.ts
# R6  4 failed, 8 passed (zsh: an array, not a word-split string)
FILES=(.vitepress/theme/components/LocaleSwitcher.vue .vitepress/theme/composables/useArrivals.ts .vitepress/theme/index.ts .vitepress/theme/i18n/arrival.ts .vitepress/theme/i18n/index.ts .vitepress/theme/i18n/missingTranslation.ts)
for f in $FILES; do git show e4fdb46:$f > $f; done
pnpm docs:build && npx playwright test --config playwright.site.config.ts tests/site-smoke/missing-translation.spec.ts -g "switcher|B7|Back returns"
```

R6's grep selects 12 tests (`--list` shows them, T-0053's "Back after the fallback returns to the page
opened before it" among them): the three hiding cases, the four B1 guards and that one pass.

Mutations, rerun after stage 6's fixes. Each replaces one string, runs the tests named, and
restores the file (`python3 <scratchpad>/mutate55.py`):

```
# M1  i18n/arrival.ts: always navigate — red 9 (four switcherDecision "stays", five wiring)
#   entry = detectLocaleFromPath(arrival.entry) !== chosen && pages.includes(counterpart) ? counterpart : null
#   → entry = counterpart
npx vitest run tests/unit/i18n/arrival.test.ts tests/unit/i18n/not-found-wiring.test.ts -t "stays|switcher choice"
# M2  composables/useArrivals.ts: the choice's line waits for the gate — red 2 (both D17 cases)
#   requested.value === null || (!lineAtOnce.value && holdLine())  →  requested.value === null || holdLine()
npx vitest run tests/unit/i18n/not-found-wiring.test.ts -t D17
# M3  components/LocaleSwitcher.vue: the page's own locale never offered — red 6
#   lineLocale.value ? [otherLocale(pageLocale.value), pageLocale.value] : [otherLocale(pageLocale.value)]
#   → [otherLocale(pageLocale.value)]
npx vitest run tests/unit/i18n/locale-switcher.test.ts tests/unit/components/MergedNav.test.ts -t "line showing|way back"
# M4  i18n/index.ts: no in-memory fallback — red 4 (three rememberChoice, the B6 wiring case)
#   rememberedChoice = locale  →  rememberedChoice = null
npx vitest run tests/unit/i18n/initial-locale-redirect.test.ts tests/unit/i18n/not-found-wiring.test.ts -t "rememberChoice|storage refuses"
# M5  composables/useArrivals.ts: the choice's line waits for the first release — red 1
#   released: released.value || lineAtOnce.value })  →  released: released.value })
npx vitest run tests/unit/i18n/not-found-wiring.test.ts -t D17
```

Changes beyond the approved plan:
- The baseline overlapped the first red cycle (above).
- The wiring cases B1 and B3 store `en` first: with nothing stored, `/guide/python`'s cold load
  redirects to its translation on its own (A1), which the first run showed as a second `router.go`.
- One D17 wiring case reaches the challenge page by a later arrival from `/guide/python`, since the
  harness renders the switcher stub only in the default-theme nav; the gate asks there all the same.
  The other D17 case covers the choice before the first release on a held article.
- `locale-switcher.test.ts` drops "preserves the query string and hash across a switch" and
  "delegates path building to the single-sourced localizePath": the component builds no path any
  more (`switcherDecision` does; `arrival.test.ts` covers query, hash and base), and
  `defineExpose({ buildTargetPath })` is gone. Both are among the cases revision 3.4 names, which
  the approved plan's scope note listed.
- Revision 3.4 also names, after stage 6, the harness of the "LocaleSwitcher UI" block (`vitepress`
  mock, `mountAt` and its fixtures, the `setPathname` calls).

### 2026-11-05 — stage 6 review and its disposition

Workflow `wf_8ddae5fe-e1b`: one `harness-reviewer` per axis (Standards, Spec) on the same packet
(`git diff HEAD` on `e4fdb46`, every changed file, a manifest), and one independent
`harness-reviewer` per axis checking each finding. Standards: 25 findings (16 confirmed, 9 partly).
Spec: 16 findings (11 confirmed, 5 partly). No high-severity finding, no new or changed D-number.
All are in this ticket's scope and fixed or recorded below; on 2026-11-06 the user said to follow the
recommendation on every later question ("以下後續問題都按照建議").

| Finding | Disposition |
|---|---|
| Std F1, F2, F25; Spec F7 (red claims without commands; a restore that needs a commit; `\|` in table commands; counts) | Fixed: R1–R6 and M1–M5 are code blocks with their commands, the restore is a copy (or `git checkout` on the commit). Counts rerun: R6 selects 12 tests, not 11 (`--list` shows T-0053's "Back after the fallback…" among them), so "4 failed, 8 passed" stands; "with the line showing" is 6 after the new cases |
| Std F3 | Partly refuted by `--list` (12 tests); the line-showing count corrected |
| Std F4 | Fixed: the 86-test site-smoke run on this branch covers T-0053's three visibility cases |
| Std F5 | Recorded as a change beyond the plan (the baseline overlapped the first red cycle) |
| Std F6 | Fixed: the H7 grep and its result are in the report; H1b and H3 are this stage's diff check, done (rows below) |
| Std F7, Spec F6 (`mountAt` and the UI block's harness not named) | Fixed: traceability 3.4 names them |
| Std F8 (two tests deleted) | Kept: the approved plan's scope note and revision 3.4 named both; `arrival.test.ts` covers query, hash and base |
| Std F9 (stale test comments on the early return) | Fixed |
| Std F10, Spec F4 (`useArrivals` comments) | Fixed: client-only entry points and `holdLine` |
| Std F11 (zh-TW: 語系切換 for the control) | Fixed: 語系切換按鈕 in `troubleshooting.md` and `network.md` |
| Std F12 ("Network log") | Kept: the panel's proper name, in an untouched half of the sentence and in the same page's table |
| Std F13, F14; Spec F9 (dead `useRouter`/`site` mocks, assertions that cannot fail, `setPathname`) | Fixed: removed |
| Std F15, F22 (duplicate provider objects, dynamic imports) | Fixed: `mountAt` takes an i18n instance; static imports in `MergedNav.test.ts` |
| Std F16 (`chosen` named twice) | Fixed: `lineAtOnce`, with a comment where it counts as released |
| Std F17 (`'navigate' \| 'stay'` repeated) | Fixed: `ChoiceOutcome` |
| Std F18, Spec F16 (`rememberChoice` without a `window` guard) | Fixed |
| Std F19 (`LOCALE_CHOICE` in `missingTranslation.ts`) | Kept, with a module comment: the module now holds what the Layout provides to the locale menus |
| Std F20 (no-provider default) | Kept: approved in the plan and commented |
| Std F21 (`otherOf` alias) | Fixed |
| Std F23 (reset tested with behaviour) | Fixed: its own case |
| Std F24 (B7 smoke checks an absence at once) | Fixed: waits for the network to settle, then 500 ms; still red on the `e4fdb46` build (R6) |
| Spec F1 (D17 before the first release untested) | Fixed: new wiring case; M5 turns it red |
| Spec F2 (B6 case not discriminating) | Fixed: the kept `en` differs from the default; a `zh-TW`-only page then shows the line in `en`; M4 turns it red |
| Spec F3 (`localizePath` doc) | Fixed |
| Spec F5 ("reloads the page") | Fixed in both languages: "goes to that version, which is a different page" |
| Spec F8 (the built site's "interface" read from `html lang`) | Fixed: the B2 case reads the vue-i18n runtime locale too |
| Spec F10 (L5 case used a choice the menu cannot offer) | Fixed: chooses `zh-TW`, the offered option, which navigates; no cold-load redirect follows |
| Spec F11 (D14 "for the tab") | Recorded, following the recommendation: the kept choice lives in the module, as D14 and W6 say "in memory"; a reload or the gate's clear starts without it |
| Spec F12 (a choice during a redirect's carry) | Fixed: a choice discards any carry, whatever it does |
| Spec F13 (B7 navigation not wired) | Fixed: new wiring case, a push from a held not-found page; Back across it is stage 8's |
| Spec F14 (Space on the other locale, click on the page's own) | Fixed: both cases added |
| Spec F15 (ticks overstate scope) | Recorded: the coverage table's "Uncovered" column names what stage 8 and T-0057 take |

Diff check of the documents (H1b, H3, H7), on the packet after these fixes: `LocaleSwitcher.vue`'s
comments state B2 (runtime locale only on navigation) and B5 (the way back); `useArrivals.ts`,
`theme/index.ts` and `i18n/index.ts` state D14, D17 and the switcher's write; the guide's six passages
state that the switcher stays when the page has no version in the chosen language and that the line's
menu offers the way back, in both languages; no 主語系.

### 2026-11-05 — stage 7 security review and its disposition

Report: `review/security-T-0055.md` (workflow `wf_f6cc0740-9bd`; one candidate pass, one independent
false-positive check per candidate, on the working tree after stage 6's fixes). Eleven candidates,
all judged not a vulnerability; nothing changed in this stage. Recorded for the epic's chain
analysis: S-3 (a choice writes and shows its line while the gate asks — D17), S-4 (a crafted `%2F`
not-found path offers 繁體中文 and lands on the English page, writing `zh-TW` — within B4), S-5 (the
kept choice outranks a newer value another tab wrote — D14), S-7 (a choice during a navigation still
loading can be decided from the old page).

### 2026-11-05 — stage 8

Surface, per D12: the throwaway branch `stage8/T-0055` = this ticket's `f2cf401` plus fixture commit
`d076fca` (made with `/tw-emoji-commit`: `git checkout 41b9dc7 -- platform/challenge/stage8-english-only`,
then `pnpm redirects:generate`; `grep 999 platform/public/_redirects` showed four rules). Pushing and
deleting it were authorized in advance for T-0055–T-0057. Cloudflare Pages preview
`https://stage8-t-0055.wxl-platform.pages.dev` (deployment `5bd395d4`, check run "Cloudflare Pages" on
`d076fca`: success).

**V3, B4's hiding half (headless Chromium, `@playwright/test`'s browser):**
`node <scratchpad>/v3-menus.cjs https://stage8-t-0055.wxl-platform.pages.dev /reference/attack-log-export-format`
opens the page at 1280, 1024 and 375 wide, once with `javaScriptEnabled: false` (the HTML as served)
and once hydrated (opening the "…" menu at 1024 and the hamburger at 375), and reads each built-in
menu's computed `display` and the custom switcher's visibility. Result: `.VPNavBarTranslations` (1280)
and `.VPNavBarExtra .translations` (1024) are `display: none` in both; `.VPNavScreenTranslations`
(375) is absent from the served HTML (the mobile screen renders only once opened) and `display: none`
after hydration; the custom switcher is visible in all six.

**V3, B2/B5/B7, and the fixture (the host's built-in browser):** each row cleared `localStorage` and
`sessionStorage`, set the stored value and loaded the page in full; the viewport was emulated per
width. At 1280 the menu was operated with real clicks; at 1024 and 375 (and the fixture at 1024 and
1280) with `click()` on the visible element from the page's script.

| Row | Width | Result |
|---|---|---|
| V3 A4 | 1280, 1024, 375 | pass: stored `en`, a cold load of the reference page stays with no line |
| V3 B2 | 1280, 1024, 375 | pass: choosing 繁體中文 (labelled "Traditional Chinese" on the English page) keeps the URL, adds no history entry (`history.length` unchanged), shows the line `lang="zh-TW"`; `html lang="en-US"` and the vue-i18n runtime locale stay `en`; stored becomes `zh-TW` |
| V3 B5 | 1280, 1024, 375 | pass: the menu then offers two options (`zh-TW`, `en`); choosing English removes the line, keeps the URL and history, stores `en` |
| V3 B7 | 1280 | pass: on `/zh-TW/no-such-page` (served 404, the not-found page) the menu offers only English; choosing it stays, shows no line, stores `en` |
| fixture B2/B5 | 1280, 1024 | pass: on `/challenge/stage8-english-only/`, stored `en`, the same as V3; the line's previous sibling is `.merged-nav` |
| V1l | 375 | pass, with the Browser panel open on the fixture's app (screenshot in the session): real clicks; choosing Traditional Chinese keeps the URL and history, shows the line below the nav (full width, 63 px high) and stores `zh-TW`; with the line shown, "Collapse description" works and the Code tab opens (D15); choosing English then removes the line and stores `en` |

Cleanup, under the same authorization: the preview origin's `localStorage`, `sessionStorage` and
IndexedDB (`challenge-tools`) cleared; `git push origin --delete stage8/T-0055` and the local branch
deleted; deployment `5bd395d4` stays (not deletable from here). The viewport emulation was reset.

### 2026-11-05 — landed (stage 9)

PR [#56](https://github.com/BrowserLaboratory/wxl-platform/pull/56), squash-merged into `main` as
`293678f` on 2026-11-05 (16:54Z), from head `24b1845`, with a squash message from the project
`tw-emoji-commit` skill, under the user's advance authorization for this ticket's PRs. The PR's CI:
10 checks passing after one rerun of the failed jobs. The first run had two failures, neither in this
ticket's code: `challenge-verify` (`door-is-open.spec.ts` timed out after 120 s waiting for the
runtime; `npx playwright test --config playwright.config.ts tests/challenges/door-is-open.spec.ts`
passed locally in 6 s) and `fork-init-cross-os (windows-latest, 24)` (two `create-wxl` `bin.test.mjs`
cases timed out at 5000 ms; `create-wxl/` is untouched here). `gh run rerun 42067759016 --failed` →
both passed. The PR branch is deleted on `origin`. T-0057 is unblocked once this record lands.
Frontmatter `status: done`.

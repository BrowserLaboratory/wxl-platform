---
id: T-0054
title: The cold-load redirect goes only to a translation that exists, and only explicit choices write the preference
epic: 0008-missing-translation-fallback
status: done
blocked_by: [T-0053]
---

## Context

The cold-load redirect sends a learner with no stored preference, or one who chose Traditional
Chinese, from an unprefixed page to its `/zh-TW/` counterpart without checking it exists (OQ-023).
Separately, the Layout's route watcher writes the URL's locale into the stored preference on every
cross-locale navigation, so a Traditional Chinese reader who follows a link to an English-only page
silently becomes an English reader. This ticket makes the cold-load redirect consult the page list and
narrows preference writes to explicit choices (U1).

Spec: `spec.en.md` revision 3, "Locale routing" (the cold-load bullet), "Writing the preference";
`traceability.md` revision 3, decisions D4, D5, D13, D16, the requested-locale table, the decision
table A1–A7, rows W2–W5, and the overridden contracts for the route watcher, `shouldPersistOnColdLoad`
and the cold-load redirect. Blocked by T-0053, which changes the same theme and i18n modules and
provides the page list, the classification and the line.

## Deliverable

A cold load of an unprefixed page redirects to its `/zh-TW/` counterpart only when the counterpart is
a published page; otherwise the learner stays and sees the line in `zh-TW`. A cold load of a
published `/zh-TW/` page, including through a short link's redirect or a reload, writes `zh-TW`,
decided after the router resolves. Nothing else writes the preference: not links, Back, Forward, or the
site's own redirects. The interface locale still follows the URL.

## Acceptance criteria

- [x] A1–A7: the full decision table — stored values × challenge and article × base — redirect or stay, line or not, write or not; redirect to a list entry with `replace`, base, query and hash; gate wait (AC-2)
- [x] W2–W4: written only by a cold load of a published `/zh-TW/` page (reload and short-link redirect included), decided after the router resolves; not by a not-published path, a failed load, or an unprefixed cold load (AC-11). W5 — the route watcher writes nothing — landed with T-0053 (U12, 2026-11-05).
- [x] L1, L5, L6 exercised for cold-load arrivals and later navigation (AC-5)
- [x] H1b (this ticket's part): the route watcher's comment, `shouldPersistOnColdLoad`'s documentation and the `enhanceApp` comment state D5, D13 and D16 (AC-9)
- [x] H3 (this ticket's part): the troubleshooting entry states D13, both languages (AC-9)
- [x] H7 (AC-9)
- [x] Overridden contracts touched here (`shouldPersistOnColdLoad`, `redirectTargetForStoredLocale`) change only as the traceability table states; the route watcher's was changed by T-0053
- [x] Stage 8 (T4): V1a, V1b, V1i, V1j on the Cloudflare preview of `stage8/T-0054` (AC-10) — V1j with `/zh/c/<slug>` until T-0056

## 給使用者（zh-TW）

讓直接打開網址時的語系導向，只在繁中版真的存在時才導過去；不存在就留在英文頁，顯示提示那一行。同時改掉「每次跨語系導覽都寫入偏好」的舊行為：只有在語系選單上的選擇，以及打開（含重新整理、經由短連結）一個存在的 `/zh-TW/` 頁面，才會改變學生的語系偏好；跟著連結走、按上一頁或下一頁、網站自己的轉址都不會改。

## Comments

### 2026-11-05 — test plan (stage 5)

Read for this plan: this ticket; `spec.en.md` and `traceability.md` revision 3.1; T-0053's record and
`review/security-T-0053.md` (S-2, S-5); and, at `d05976e`, `.vitepress/theme/index.ts`,
`.vitepress/theme/i18n/{index,arrival,pages,lookup,publishedPages}.ts`,
`.vitepress/theme/composables/useArrivals.ts`, `tests/unit/i18n/{initial-locale-redirect,theme-locale-wiring,not-found-wiring}.test.ts`,
`tests/site-smoke/missing-translation.spec.ts`, `platform/guide/troubleshooting.md` (`#missing-translation`).

Working names, not fixed by the spec:
- `redirectTargetForStoredLocale(location, base, pages, arrival)` (overridden contract: gains the
  page list and the router's result). It still reads the stored value itself, so its existing cases
  keep their arrangement; it returns a target only for a page arrival, built from the arrival's list
  entry (D16, S-5), and only when that counterpart is in the list (A1–A3).
- `shouldPersistOnColdLoad(arrival)` (overridden contract: decided after the router resolves, from
  the rendered page). True only for a page arrival whose entry is under `/zh-TW/`.
- The write moves from `enhanceApp` to `useArrivals`' cold-load record, which runs in the Layout's
  `onMounted`, after VitePress's router has resolved the first route (it mounts the app only then:
  `node_modules/vitepress/dist/client/app/index.js:132-136`, `router.go(…).then(() => app.mount(…))`).
  It does not wait for the session gate: `wxl-locale` is exempt from the gate's clear, and A5 asks
  only the redirect and the line to wait. `enhanceApp` keeps setting the interface locale from the URL.

Scope notes:
- With this ticket the cold-load detour of T-0053 (redirect to a missing `/zh-TW/` page, then C1
  back) is gone: A2/A3 stay put. The comment of T-0053's smoke test "the detour through a missing
  translation keeps the stored language" describes that detour; only its comment changes, its
  assertions still hold.
- V1j requests `/zh-TW/c/<fixture-slug>`, whose rule arrives with T-0056; until then that path is
  C3. Stage 8 here uses `/zh/c/<fixture-slug>` for V1j, as T-0053 did for V1c.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0008-S1 | the cold-load redirect goes only to a counterpart in the list, spelled as its entry | `tests/unit/i18n/initial-locale-redirect.test.ts`, `redirectTargetForStoredLocale` (overridden contract); existing cases gain the two arguments, and their expected targets become list-entry spellings | A1–A5, A7 — AC-2 | stored none, `zh-TW`, `fr`, unreadable storage, `en` × translated challenge, English-only challenge, translated article, English-only article (fixture list); A1 → `/zh-TW/…` entry with `?q=1#h` kept; A2/A3 → null; A4 → null; A5 (`/zh-TW/` page) → null; S-5: alias `/Challenges`, `/challenges.html`, `/challenges/` and `/guide/index.html`, rendered as their source file, → `/zh-TW/challenges` and `/zh-TW/guide/`; base `/repo/` kept on the target and stripped for the lookup; not-found and failed-load arrivals → null |
| 0008-S1 | only a cold load of a published `/zh-TW/` page writes | same file, `shouldPersistOnColdLoad(arrival)` (overridden contract; the existing three-argument cases are rewritten as arrivals) | W2, W3, W4 — AC-11 | page `/zh-TW/guide/` → true; page `/zh-TW/` → true; page reached by the alias `/zh-TW/Challenges` (entry `/zh-TW/challenges`) → true; page `/challenges` → false; not-found `/zh-TW/no-such-page` → false; failed load of `/zh-TW/challenges` → false (S-2) |
| 0008-S1 wiring | the write happens after the router resolves, not at bootstrap | `tests/unit/i18n/theme-locale-wiring.test.ts`, block "the real theme: cold-load persistence" (overridden contract: "enhanceApp runs at app bootstrap") — `enhanceApp` writes nothing; the real Layout mounted with `page` controlled writes | W2, W3, W4, A5 — AC-11, AC-2 | `enhanceApp` on `/zh-TW/guide/` → nothing stored, interface `zh-TW`; Layout on a rendered `/zh-TW/guide/` with stored `en` → `zh-TW`; failed load on `/zh-TW/challenges` (`isNotFound`, path in the list) → stays `en`; not-found `/zh-TW/no-such-page` → stays; unprefixed page with none → still none; `setItem` throwing → mount does not throw |
| 0008-S1 wiring | the Layout's cold load: stay with the line, or redirect to the entry | new block in `tests/unit/i18n/not-found-wiring.test.ts` (its harness already controls `page`, `__WXL_PAGES__` and the gate) | A1–A4, A6, A7, L1, L5, L6 — AC-2, AC-5 | English-only article, stored `zh-TW` → no `router.go`, line `zh-TW` in `doc-before`; English-only challenge with the gate asking → no `router.go` and no line until "continue", then the line; stored `en` → no go, no line; translated page, stored none → `go('/zh-TW/…', { replace: true })` once, built from the entry for an alias path; base `/repo/`; after A2, a later navigation to a translated page removes the line and to another English-only page shows it in the stored locale (L5); after A1 the carried locale is discarded at the next arrival (L6) |
| 0008-S7 (built site) | the cold load on the production bundle | new cases in `tests/site-smoke/missing-translation.spec.ts`, stored value set per case | A3, A4, A1, W2, W3, W4 — AC-2, AC-11 | the reference page, stored none and `zh-TW`: stays, the line in `zh-TW`, and no `history.replaceState` to a `/zh-TW/` URL (red on `d05976e`); stored `en`: no line, stored `en`; `/challenges.html` with stored none → ends at `/zh-TW/challenges` (entry, not URL text; red on `d05976e`), stored still none; `/zh-TW/guide/` with stored `en` → `zh-TW`; S-2: `/zh-TW/challenges` with its page chunk aborted → the not-found page, stored still `en` (red on `d05976e`) |
| stage 6 diff check (not automated) | documents | `git diff` against the branch's base | H1b (route watcher comment, `shouldPersistOnColdLoad`'s documentation, the `enhanceApp` comment state D5, D13, D16), H3 (the `#missing-translation` entry states D13, both languages), H7 — AC-9 | no changed document in the glossary's corpus uses 主語系 |
| stage 8 (not automated) | the cold load on a real host | V1a, V1b, V1i, V1j (with `/zh/c/<fixture-slug>`) on the Cloudflare preview of `stage8/T-0054`; approvals per D12 | AC-10 | host's browser tools; challenge pages with the Browser panel open |

Mutation checks: the "stays put" and "writes after the router resolves" cases are each run once
against the old behaviour put back (the URL-text target; the write in `enhanceApp`) and must go red.

Regression gate for every cycle: `npx vitest run` (baseline from the handoff, at `36debe4` ≡
`d05976e`: 135 files, 4630 passed, 1 skipped, rerun before the first test), and for the built-site
rows `pnpm docs:build && npx playwright test --config playwright.site.config.ts`.

Approval: the user approved this test plan on 2026-11-05 ("核准計畫表").

### 2026-11-05 — coverage report (stage 5)

Branch `tickets/T-0054/cold-load-redirect-and-preference-writes`, working tree on `d05976e`, not yet
committed. Baseline: the first `npx vitest run` gave 1 failed of 4630 (the output was cut to its
summary, so the test is not known); the rerun gave 135 files, 4630 passed, 1 skipped — recorded as
a flaky test, not this ticket's. After: `npx vitest run` → 135 files, 4708 passed, 1 skipped.
`pnpm docs:build && npx playwright test --config playwright.site.config.ts` → 81 passed (75 before).
`npx vue-tsc --noEmit -p tsconfig.json` → 107 errors, unchanged; the one in this ticket's files is
the pre-existing `DefaultTheme.enhanceApp?.({ app })`. `python3 scripts/prose-audit/run.py` on both
troubleshooting files → PASS, 0 blocking. Coverage is not measured (OQ-009).

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0008-S1 | `initial-locale-redirect.test.ts`, "redirectTargetForStoredLocale with the page list": A2 (1), S-5 URL-text cases (5; 4 after stage 6), the decision table — 5 stored values × 6 rows × 2 bases, with query and hash (60; 70 after stage 6), non-page arrivals (2); the existing cases moved to the new signature (overridden contract) | not measured (OQ-009) | A1–A5, A7 — AC-2 | — |
| 0008-S1 | same file, `shouldPersistOnColdLoad(arrival)` (7, rewritten; overridden contract) | not measured | W2–W4 — AC-11 | — |
| 0008-S1 wiring | `theme-locale-wiring.test.ts`, "the real theme: cold-load persistence" (8; overridden contract) | mutation: the URL-based write put back in `enhanceApp` turns the bootstrap and failed-load cases red (the unwritable-storage case went red only because the mutation wrote without `persistLocale`'s guard — stage 6, Spec F4) | W2–W4, W6, A5 — AC-11, AC-2 | — |
| 0008-S1 wiring | `not-found-wiring.test.ts`, "the real Layout: a cold load of an unprefixed page" (7) and the rewritten A3 case | mutation: the URL-text redirect of `d05976e` put back in `release` turns 5 red | A1–A4, A6, L1, L5, L6, W5 — AC-2, AC-5, AC-11 | A7 at the wiring level is `theme-locale-wiring.test.ts` "keeps the locale segment inside a non-empty site base"; L6's carry on an A1 landing is not observable on its own (the landing is in the requested locale), so the case checks that it ends there |
| 0008-S7 (built site) | `missing-translation.spec.ts` (6 new) | red on a build of `d05976e`'s three source files: A3 stays put (stored none, `zh-TW`), the failed load (S-2) | A3, A4, A1, W2, W3, W4 — AC-2, AC-11 | the alias case (`/challenges.html`) is a guard, green on both builds: the router drops `.html` when it navigates. A letter-case alias (`/Challenges`) is the not-found page on the built site (served 404, `PAGE NOT FOUND`), so the alias half of S-5 is observable only below the built site: which URL renders which page is `classifyArrival`'s, and the redirect's target is built from the entry whatever the URL's text (unit cases) |
| documents | `platform/guide/troubleshooting.md` and its Traditional Chinese twin, `#missing-translation` (A2/A3 cause; a new paragraph on which language the site remembers, D13); `.vitepress/theme/index.ts` (`onMounted` and `enhanceApp` comments), `i18n/index.ts` (`shouldPersistOnColdLoad`, `redirectTargetForStoredLocale`), `useArrivals.ts` module comment | stage 6 diff check | H1b, H3, H7 — AC-9 | — |
| stage 8 | — | — | V1a, V1b, V1i, V1j — AC-10 | not run yet |

Changes beyond the approved plan, each to a test this epic or this ticket owns:
- `initial-locale-redirect.test.ts` "treats an unreachable localStorage as no preference" restores
  its spy by its handle. It leaked into every later case, which hid until the decision table needed
  `en` to be readable: nothing in that file or `vitest.config.ts` restores mocks (the environment is
  happy-dom, `vitest.config.ts:47`), and an `afterEach(() => vi.restoreAllMocks())` did not restore
  it either when tried (probe in the stage 6 record).
- `not-found-wiring.test.ts` "shows no line on a page it is about to redirect away from" (T-0053)
  pinned the detour this ticket removes; it is now "stays on an English-only article with the line
  in zh-TW, instead of redirecting away". Its fixture list gains `/guide/english-only` for L5.
- `theme-locale-wiring.test.ts`'s `setPath` also sets what the router renders (the page double
  T-0053 added), and the expected redirect targets are list entries (`/zh-TW/challenges`, not
  `/zh-TW/challenges/`).

A correction to T-0053's record: `review/security-T-0053.md` dismissed S-5's "a letter-case variant
becomes a 404" because VitePress looks pages up in lower case. On the production bundle it does
not: `/Challenges` is served 404 and shows the not-found page before any redirect runs. The
conclusion stands (not a vulnerability), on different grounds.

### 2026-11-05 — stage 6 review and its disposition

Workflow `wf_7037fd0a-319`: one `harness-reviewer` per axis on the same packet (manifest, `git diff
HEAD` on `d05976e`, the final content of the 10 changed files; no untracked files), then one
independent `harness-reviewer` per axis checking each finding (confirmed, partly, refuted). Standards:
20 findings (6 medium, 14 low; 11 confirmed, 8 partly, 1 refuted). Spec: 14 (2 medium, 12 low; 13
confirmed, 1 partly). The user's instruction for this ticket was to carry it through to the end
("一路做到此 ticket 結束", 2026-11-05), so findings within the ticket's scope were fixed and the rest
are recorded here for the user's review.

| Finding | Disposition |
|---|---|
| Spec F9 | Fixed: `release` records the cold load again, so the redirect and the line read the stored value once, when the gate lets the page go. Test: `not-found-wiring.test.ts` "decides the redirect and the line from the same stored value when it changes while the gate asks" (red before). |
| Spec F10 | Fixed (and tightened in stage 7, S-2 and S-3): the cold-load redirect applies only while the cold load is still the current arrival; a page reached by a link while the gate asked is a later navigation. Test: "does not apply the cold-load redirect to a page reached by a link while the gate asked" (red before). The defect predates this ticket (`d05976e` had the same `current()` call). |
| Spec F2, F3 | Added: `not-found-wiring.test.ts` "the decision table A1–A5, A7, every column" — 5 rows × 5 stored values × 2 bases (50), each asserting the redirect, the line and the stored value as the row states; A5 without a counterpart (`/zh-TW/guide/zh-only`) added there and to the unit table (70). Mutation: dropping the cold-load write turns the 16 A5 cases whose stored value was not already `zh-TW` red. |
| Std F3, Spec F1, Spec F8 | Traceability revision 3.2 names the wiring tests the redirect row changes and records that the location's path is no longer read; no behaviour changes and the spec text is unchanged. The AC line for overridden contracts stays checked on that basis. |
| Std F1, F15 | Reproduction added below; the VitePress mount order is cited at the plan (`index.js:132-136`). |
| Std F2 | Corrected: happy-dom, not jsdom; the comment and the plan-deviation note now say what was observed. |
| Std F4, F5, F10, F18; Spec F12, F13 | Comments updated: the persistence block's header; the redirect's inline comment and its "without a DOM"; the unit file's header (no `theme-redirect.test.ts`); "under `/zh-TW/`"; "stage 1 decision G6" and `wanted` for the locale; the five comments that still said `enhanceApp` writes `wxl-locale` (`localStorageKeys.ts` ×2, `useSessionGate.ts`, `useSessionGate.test.ts`, `local-storage-ownership.test.ts`) — comments only; the `enhanceApp` comment names D13. |
| Std F6, F8; Spec F7 | The S-5 unit cases are renamed for what they check — the target is built from the entry whatever the URL's path — with no letter-case example; `arrival.ts`'s comment no longer calls a letter-case variant an alias; `security-T-0053.md` carries a dated correction. |
| Std F7; Spec F5 | Renamed: "after an A1 redirect, a later page asks with the stored value, not the carried one (L6)", with a note that the carry is not visible on an A1 landing. |
| Std F9 | Fixed: `targetUrl(entry, base, location)` in `pages.ts` builds both redirect targets. |
| Std F12 | T-0053's "the detour … keeps the stored language" smoke cases are folded into the new "stays put" cases (which gained `toBeVisible`); the duplicate unit helper `page` is gone. |
| Std F13 | The decision table's expected targets are literals per base. |
| Std F14; Spec F11 | Troubleshooting, both languages: the site, not the learner, remembers the language; the cause covers a learner with nothing stored; "the site's own redirects" is now "the site taking you to another page by itself once a page has opened", which no longer reads as including a short link's server redirect. |
| Std F17 | `networkidle` waits with a 10 s timeout, as `site-smoke.spec.ts` does. |
| Std F19 | `setPath`'s table holds what the router renders, the not-found path included, and an unlisted path throws. |
| Spec F4, F6 | The W6 case also asserts the interface locale; the coverage report no longer counts it as mutation-checked. The bootstrap case asserts the interface locale `zh-TW`. |
| Std F11 | Kept: `index.ts` imports the `Arrival` type only, which is erased; `arrival.ts` imports values from `index.ts`, so no cycle runs. |
| Std F16 | Refuted by the check: workflow.md's stage 6 entry requires met criteria to be checked. |
| Std F20 | Recorded: on `d05976e` T-0053 is still `review`, so T-0054 is blocked by derivation until PR #51 (T-0053 → `done`) merges. #51 lands before this ticket's PR. |
| Spec F14 | Kept, as D16 states: a cold load of `/zh-TW_challenges` renders `zh-TW/challenges.md` (VitePress maps `/` to `_` when it looks a page up, and decodes `%2F` first, so `/zh-TW%2Fchallenges` does the same — stage 7, S-1), so it stores `zh-TW` while the interface follows the URL (`en`). Reaching it needs a hand-made URL; B4 already says any page can link to a `/zh-TW/` page. |

Reproduction (working tree on `d05976e`; scratch copies outside the checkout):

```bash
# Mutation, enhanceApp write (theme-locale-wiring): add to .vitepress/theme/index.ts
#   import { isPublishedPath } from './i18n/pages'; import { publishedPages } from './i18n/publishedPages'
#   and after `i18n.global.locale.value = detectInitialLocale()`:
#   if (detectInitialLocale() === 'zh-TW' && isPublishedPath(window.location.pathname, '/', publishedPages())) window.localStorage.setItem('wxl-locale', 'zh-TW')
npx vitest run tests/unit/i18n/theme-locale-wiring.test.ts   # bootstrap and failed-load cases red
# Mutation, URL-text redirect (not-found-wiring): in useArrivals.ts `release`, replace the target with
#   current().kind === 'page' && (readStoredLocale() ?? 'zh-TW') === 'zh-TW' && detectLocaleFromPath(location.pathname) === 'en'
#     ? '/zh-TW' + location.pathname + location.search + location.hash : null
npx vitest run tests/unit/i18n/not-found-wiring.test.ts
# Mutation, no cold-load write: replace `if (shouldPersistOnColdLoad(arrival)) persistLocale('zh-TW')` with `void arrival`
npx vitest run tests/unit/i18n/not-found-wiring.test.ts      # 16 decision-table cases red
# Built site on d05976e's sources
for f in .vitepress/theme/index.ts .vitepress/theme/i18n/index.ts .vitepress/theme/composables/useArrivals.ts; do git show d05976e:$f > $f; done
pnpm docs:build && npx playwright test --config playwright.site.config.ts tests/site-smoke/missing-translation.spec.ts
# Letter-case alias on the built site
npx vitepress preview --port 4173 & curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4173/Challenges   # 404
```

`restoreAllMocks` probe (vitest 4.1, happy-dom), run once as `tests/unit/zz-probe.test.ts` and
deleted: a test spying `window.localStorage.getItem` to throw, then a second test with
`afterEach(() => vi.restoreAllMocks())` between them reading a stored value — the read still threw;
with the spy's own `mockRestore()` it returned the value. The first baseline run's single failure is
unidentified (output cut to the summary); the rerun passed in full, so it is recorded as unknown, not
as this ticket's.

Checks after the fixes, working tree on `d05976e`: `npx vitest run` → 135 files, 4769 passed, 1
skipped; `pnpm docs:build` → complete; `npx playwright test --config playwright.site.config.ts` → 79
passed (T-0053's two detour cases folded in); `npx vue-tsc --noEmit -p tsconfig.json` → 107 errors,
unchanged.

### 2026-11-05 — stage 7 security review and its disposition

Report: `.proj.specs/0008-missing-translation-fallback/review/security-T-0054.md` (workflow
`wf_7086a524-e48`). One candidate pass and one independent false-positive pass per candidate
(`harness-reviewer`): nine candidates, none a vulnerability. Two were functional defects in stage 6's
F10 fix and are fixed under the same instruction:

- **S-2.** A link the learner followed is in the address bar while its page still loads; the gate's
  answer no longer replaces it with the cold load's redirect (`release` also requires
  `window.location.pathname` to be the cold load's). Test: `not-found-wiring.test.ts` "does not
  redirect when a navigation the learner started is still loading" (red before).
- **S-3.** Any later arrival ends the cold load's redirect, a return to the same path included
  (`coldLoadCurrent`, cleared by the route watcher). Test: "does not apply the cold-load redirect
  after the learner left the page and came back" (red before).

S-1 (`%2F` alias) is added to Spec F14's record; S-4 to S-9 are recorded in the report only.

Checks, working tree on `d05976e`: `npx vitest run` → 135 files, 4771 passed, 1 skipped; `pnpm
docs:build` → complete; `npx playwright test --config playwright.site.config.ts` → 79 passed; `npx
vue-tsc --noEmit -p tsconfig.json` → 107 errors, unchanged.

### 2026-11-05 — stage 8

Surface, per D12: the throwaway branch `stage8/T-0054` = this ticket's `2971056` plus fixture commit
`e7590de` (made with `/tw-emoji-commit`: T-0053's `stage8-english-only` fixture, cherry-picked from
`41b9dc7`, number 999, English brief only; `pnpm redirects:generate` gave the same `_redirects`).
Pushing it was covered by the user's instruction to carry the ticket to the end (2026-11-05).
Cloudflare Pages preview `https://stage8-t-0054.wxl-platform.pages.dev` (deployment `5ddd13e6`,
check run "Cloudflare Pages" on `e7590de`: success). Driven in the host's built-in browser, reading
the page with JavaScript after each load; the challenge page was checked with its Browser panel open.
Each row cleared `localStorage` and `sessionStorage`, set the stored value, and loaded the page in
full, so each was a cold load in a new session.

`curl -s -o /dev/null -w '%{http_code} %{redirect_url}'` on the preview: `/challenge/stage8-english-only/`
→ 200; `/zh/c/stage8-english-only` → 302 `/zh-TW/challenge/stage8-english-only/`;
`/zh-TW/challenge/stage8-english-only/` → 404; `/c/999` → 302 `/challenge/stage8-english-only/`.

| Row | Stored value | Result |
|---|---|---|
| V1a | none | pass: stays at `/challenge/stage8-english-only/`; the line `lang="zh-TW"`, 「這一頁沒有繁體中文版本，所以顯示英文版。」, link 「前往繁體中文題目清單」 → `/zh-TW/challenges` (L2); the line's previous sibling is `.merged-nav` (L3); the Browser panel loads the fixture's app (screenshot in the session); stored still none |
| V1a | `zh-TW` | pass: the session gate asked (the previous row's Browser panel had left attack records in IndexedDB); no line while it asked; after 「Continue with this work」 the same line, same URL; stored still `zh-TW` |
| V1b | `en` | pass: the gate asked; after continuing, no redirect, no line, interface `en-US`; stored still `en` (A4) |
| V1i | none, with `pentest-draft-stage8-english-only` stored, new tab and session | pass: the gate asked and no line showed; after continuing, the line in `zh-TW`; stored still none (A6, L1) |
| V1j | `en`; `/challenges`, then `/zh/c/stage8-english-only` in the same tab | pass: ends at `/challenge/stage8-english-only/` with the line in `zh-TW` (C1); Back (`history.back()`) → `/challenges`, no line; Forward → the fixture with no line (a later navigation asks with `en`: L5, L6); stored `en` throughout (W5) |

Seen in passing: the first tab opened `/guide/` with nothing stored and ended at `/zh-TW/guide/`
(A1 on the preview).

Cleanup, under the same instruction: `git push origin --delete stage8/T-0054` and the local branch
deleted (its preview alias goes with it); deployment `5ddd13e6` cannot be deleted from here and stays.

### 2026-11-05 — landed (stage 9)

PR [#52](https://github.com/BrowserLaboratory/wxl-platform/pull/52), squash-merged into `main` as
`e5a1c36` on 2026-11-05 (13:44Z), from head `240e4c7`, with a squash message from the project
`tw-emoji-commit` skill; the user approved the merge order ("依序合併"). PR #51 (T-0053 → `done`)
was merged first as `c7c2e30`, so T-0054's blocker was `done` on `main` before it landed. The PR's
CI: 10 checks passing, none failing. Both PR branches are deleted on `origin`. T-0055 is unblocked.
Frontmatter `status: done`.

---
id: T-0036
title: Off Cloudflare Pages, the copy control shows and copies the challenge page's URL
epic: 0007-gh-pages-range-fixes
status: done
blocked_by: []
---

## Context

The copy button beside each challenge gives a short link, which only Cloudflare Pages resolves, so on
a GitHub Pages range the teacher hands out a 404. The build decides the link mode (Q7, Q8): only
`CF_PAGES=1` gives short links, and every other build gives the page URL (`SITE_ORIGIN` followed by
the challenge page's path, with no base added). The mode is a compile-time constant, so the HTML as
served, the hydrated page and anything set at run time agree. This ticket builds the mode, the link
helper, the control and its callers, and the cut with an ellipsis. T-0037 adds selection, title
priority and the minimum width.

Spec: `spec.en.md` revision 3, "Link mode", "Link helper", "The copy control", "Callers", B1, B4;
`traceability.md` revision 3, mode rule, link forms X1–X6, seams 0007-S1, S2, S3 and S8.

## Deliverable

A GitHub Pages range's list and nav, in both languages, show and copy each challenge's page URL. A
Cloudflare Pages build shows short links exactly as today. A URL that does not fit is cut with an
ellipsis, shows whole on hover, and never makes the page scroll sideways.

## Acceptance criteria

- [x] M01–M04: `__WXL_SHORT_LINKS__` is `'true'` only for `CF_PAGES=1`; `base` and `head` unchanged (AC-1)
- [x] L19: an undefined constant means page mode (AC-1)
- [x] L01–L03: short mode, X1, X2, padding (AC-2)
- [x] L04–L07: page mode, X3–X5, origin path kept, no base added (AC-3)
- [x] L08: the URL text's `title` is the copied URL (AC-4)
- [x] L09–L11, L16, L20: what renders nothing at the control and returns none at the helper (AC-5)
- [x] L12–L15, L18: copy status, label, locale, the button's click inside an anchor; stage 6 confirms no message key changed (AC-6)
- [x] N01–N07: props from `ChallengeList`, `MergedNav` and `ChallengeLayout`; copied URL with a non-root `withBase`; the badge and grid view unchanged (AC-7)
- [x] S01, S02: no sideways scroll; each shown URL text is non-inline, `nowrap`, hidden overflow, ellipsis, whole content and `title` (AC-8)
- [x] S04, S05, S09: HTML as served equals hydrated text; the clipboard holds the page URL; a run-time `window` flag does not switch the mode (AC-9)
- [x] F01: one fork:init anchor line each in `shortLink.ts` and `config.mts`; `fork-init.test.ts` and `upstream-guard.test.ts` pass (AC-25)
- [x] P4: the comments on `SITE_ORIGIN` and the "same string" header line in `shortLink.ts` describe both modes (AC-24)
- [x] Stage 8: V01 on the ticket's Cloudflare preview and V02 on a local build, challenge pages with their Browser panel open (AC-20)

## 給使用者（zh-TW）

依建置環境決定複製按鈕給什麼：只有 Cloudflare Pages 自己的建置（`CF_PAGES=1`）給短連結，其他建置都顯示並複製題目頁的網址，例如 `https://<owner>.github.io/<repo>/zh-TW/challenge/<slug>/`。列表與導覽列兩種語言都改。放不下的網址用省略號截斷，滑鼠停留時顯示全文，頁面不會橫向捲動。點選選取、標題優先與 6ch 最小寬度由 T-0037 處理。

## Comments

### 2026-10-21 — test plan (stage 5)

Read for this plan: this ticket; `spec.en.md` and `traceability.md` revision 3 (mode rule, link
forms X1–X6, seams 0007-S1, S2, S3, S8, rows M, L, N, S, F, P4); and, at `a54e917`,
`.vitepress/config.mts`, `.vitepress/challenge/shortLink.ts`, `ShortLinkShare.vue`,
`ChallengeList.vue`, `MergedNav.vue`, `ChallengeLayout.vue`, `tests/unit/site/config-base.test.ts`,
`tests/unit/components/{ShortLinkShare,ChallengeList,MergedNav}.test.ts`,
`tests/unit/layouts/ChallengeLayout.test.ts`, `tests/site-smoke/site-smoke.spec.ts` and
`playwright.site.config.ts`. Working names, not fixed by the spec: the link helper `challengeLink`
in `shortLink.ts`, returning `{ url, display }` or `null`; the mode module
`.vitepress/theme/linkMode.ts`, which `ShortLinkShare` imports and the S2 tests replace with
`vi.mock` (kept out of `shortLink.ts`, which `scripts/challenge-numbers.ts` imports under Node).
Every S2 expectation is built from the imported `SITE_ORIGIN` with plain string operations, never
by calling the helper (T70/AC-C1). Rows L17, L21, S03, S06–S08, S10 and P5 are T-0037's and are not
planned here.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0007-S1 | `__WXL_SHORT_LINKS__` is the source text `true` only for the exact `CF_PAGES` value `1` | new cases in `tests/unit/site/config-base.test.ts`, using its fresh-import pattern (`vi.resetModules()`, set or delete `process.env.CF_PAGES`, import `config.mts`), reading `vite.define.__WXL_SHORT_LINKS__`; `CF_PAGES` restored after each case | M01, M02, M03 — AC-1 | `1` → `'true'`; unset, `''`, `0`, `true`, ` 1`, `1 ` → `'false'`; asserted as the strings `'true'` and `'false'` (4 and 5 characters), not as booleans |
| 0007-S1 | `base` and `head` do not depend on `CF_PAGES` | same file: the existing SITE_BASE cases run under each `CF_PAGES` value | M04 — AC-1 | every `CF_PAGES` value of the row above × every SITE_BASE case of `config-base.test.ts`: unset, `''`, `/x/`, `/a/b/` give the base and head hrefs asserted today; the six refused values (`/sub`, `sub/`, `/../`, `/./`, `/a/../`, `/a b/`) still reject naming `SITE_BASE` |
| 0007-S8 | short mode: the helper gives the short link and its displayed text, and ignores the slug | new `tests/unit/challenge/shortLink.test.ts`, origin passed as an argument | L01, L02, L03, L11 — AC-2, AC-5 | X1 (en, n = 1); X2 (zh-TW, n = 42 → `042`); n = 1234 stays `1234`; slug undefined, `''` and `My Chall` still return the short link; displayed text is the copied URL without `https://` |
| 0007-S8 | page mode: the helper gives the page URL, keeping the origin's path and adding no base | same file | L04, L05, L06, L07 — AC-3 | X3 (en, wxl origin); X4 (zh-TW, origin `https://teacher.github.io/my-range`, path kept); X5 (en, n = 1234, origin with no path; the number appears nowhere in the URL); the origin is appended as given, not normalised ("O is appended to as it is", Link forms) |
| 0007-S8 | the helper returns none | same file | L10, L16, L20 (X6) — AC-5 | page mode: slug undefined, `''`, `My Chall` (X6), `a_b`, `-a`, plus the grammar's edges `a` (returns a URL) and `a-` (none); both modes: number undefined, `0`, `-1`, `1.5` (L20) |
| 0007-S2 | `ShortLinkShare` in short mode keeps today's output, now with the copied URL as `title` | `tests/unit/components/ShortLinkShare.test.ts`; mode set by a mutable `vi.mock` of the mode module; today's short-link assertions move under short mode | L01, L02, L03, L08, L11 — AC-2, AC-4, AC-5 | en n = 1, zh-TW n = 42, en n = 1234; no `slug` prop given; `[data-short-link]` text, its `title`, and the `writeText` argument |
| 0007-S2 | `ShortLinkShare` in page mode shows and copies the page URL with the real `SITE_ORIGIN`, `title` included | same file | L04, L05, L06, L07, L08 — AC-3, AC-4 | en `door-is-open` (X3's shape), zh-TW `selected-excerpts` (X4's shape), en n = 1234 `staff-only` (X5's shape); page locale decides the path (`/challenge/` or `/zh-TW/challenge/`) |
| 0007-S2 | the control renders nothing for an unusable number, and in page mode for an unusable slug | same file | L09, L10, L16 — AC-5 | both modes, page mode with a valid slug: number missing, `null`, `0`, `-1`, `1.5`, `""`, `"abc"` → no `[data-short-link]`, no button; `"7"` renders as 7 in both modes; page mode with a valid number: slug missing, `''`, `My Chall`, `a_b`, `-a` → nothing (short mode with no slug is the row above) |
| 0007-S2 | copy status: confirmation reverts, failure stays, nothing escapes | same file, each test run in both modes | L12, L13 — AC-6 | `writeText` resolves → `short_link.copied`, empty once fake timers pass 2000 ms; `writeText` rejects, and `navigator.clipboard` undefined → `short_link.copy_failed`, still shown once fake timers pass 2000 ms; no `unhandledRejection` |
| 0007-S2 | the label and every string follow the page locale | same file, both modes × both locales | L14, L15 — AC-6 | `aria-label` and the button's `title` equal `short_link.copy_label`; `locale` prop differing from the runtime i18n locale (prop `en` with runtime `zh-TW`, and the reverse) → label, `copied` and `copy_failed` follow the prop. That no message key is added, removed or changed is checked at stage 6 on the diff, not by a test: `git diff a54e917 -- .vitepress/theme/i18n/messages/` prints nothing |
| 0007-S2 | the copy button's click does not reach an enclosing anchor | same file, both modes | L18 — AC-6 | control mounted inside `<a href="#elsewhere">`; a real `MouseEvent('click', { bubbles: true, cancelable: true })` dispatched on `[data-copy-link]` has `defaultPrevented` true, the anchor's own click listener is not called, and `location.href` is unchanged |
| 0007-S2 | an undefined constant means page mode | a test file of its own (`vi.mock` is hoisted per file), with the mode module not mocked, under vitest, where `__WXL_SHORT_LINKS__` is not defined | L19 — AC-1 | the real mode module reports page mode without throwing a `ReferenceError`; `ShortLinkShare` with n = 1 and `door-is-open` shows and copies `SITE_ORIGIN` + `/challenge/door-is-open/` |
| 0007-S2 | the list passes each row's number, row slug and the page locale | `tests/unit/components/ChallengeList.test.ts`, list view, `findAllComponents(ShortLinkShare)` | N01, N02 — AC-7 | English list (`localeIndex` `root`, runtime `zh-TW`) → `locale` `en`; Traditional Chinese list (`localeIndex` `zh-TW`) → `zh-TW`; `slug` equals `slugOf`'s row slug for each of the three fixture rows |
| 0007-S2 | the nav passes number, slug and page locale to both its controls | `tests/unit/components/MergedNav.test.ts`, new `slug` prop in its fixture props | N03 — AC-7 | en and zh-TW pages, including page locale ≠ runtime locale; exactly two `ShortLinkShare` instances (desktop and mobile), each with `number`, `slug` and `locale`; today's short-link cases run under short mode via `vi.mock` |
| 0007-S2 | in page mode the copied URL is the page URL, with no base added | `ChallengeList.test.ts` and `MergedNav.test.ts`; `withBase` made to prefix `/my-range/` only in these cases (the list's mock via `mockImplementation`, the nav's via `mockBase`), so other cases keep their identity base | N04 — AC-7 (and AC-3's "no base is added" at the component) | list: fixture urls `/challenge/sqli-demo` and `/challenge/sqli-demo/` both copy `SITE_ORIGIN` + `/challenge/sqli-demo/`, and a zh-TW row copies `SITE_ORIGIN` + `/zh-TW/challenge/<slug>/`, while the row's `href` does carry `/my-range/`; nav: en and zh-TW, the copied URL holds no `/my-range` |
| 0007-S2 | the list's `#NNN` badge and its grid view are unchanged in both modes | `ChallengeList.test.ts`, both modes | N05, N06 — AC-7 | `#001`, `#002`, `#003` in list view; grid view renders no `[data-short-link]` and no `ShortLinkShare` |
| 0007-S2 (supplement, upstream of N07) | the layout gives the nav the slug it derives from the page | `tests/unit/layouts/ChallengeLayout.test.ts`: the `MergedNav` stub declares `slug` and `number` | N07 (unit half) — AC-7 | per-folder `relativePath` fixture → `slug` prop `sqli-demo`, the same slug `BrowserPanel` receives; `number` passed as today. The built-page half is the S3 row below |
| 0007-S3 | the clipboard holds the challenge's page URL after a copy, from the list and from the nav | new cases in `tests/site-smoke/site-smoke.spec.ts`, against `pnpm docs:build` without `CF_PAGES`, Chromium, `clipboard-read` and `clipboard-write` granted, read back with `navigator.clipboard.readText()` | S05, N07 — AC-9, AC-7 | English and Traditional Chinese lists: the `selected-excerpts` row; English and Traditional Chinese `selected-excerpts` pages: the nav's shown control at 375×812 (mobile row) and 1280×800 (desktop); expected `SITE_ORIGIN` (imported from `shortLink.ts`) + `/challenge/selected-excerpts/` or `/zh-TW/challenge/selected-excerpts/` |
| 0007-S3 | the URL text in the HTML as served equals the text after hydration | same file; served HTML fetched with `page.request.get` and its `[data-short-link]` texts compared, in order, with the hydrated page's | S04 — AC-9 | each page (both lists, both `selected-excerpts` pages) at each of the five viewports; the served text is already the page URL's displayed text |
| 0007-S3 | a run-time `window` flag does not switch the mode | same file; `addInitScript` sets `window.__WXL_SHORT_LINKS__ = true` before any page script | S09 — AC-9 | each page at 375×812; after hydration every shown URL text is the page URL's displayed text |
| 0007-S3 | the document never scrolls sideways | same file | S01 — AC-8 | each page × 360×740, 375×812, 768×1024, 1024×768, 1280×800 × each state: at rest; `short_link.copied` (held with `page.clock` so the 2000 ms revert cannot race the measurement); `short_link.copy_failed` (init script makes `writeText` reject); completed (challenge pages, a progress record written to the site's own IndexedDB before a reload). Status produced by clicking copy on the list row with the longest displayed text and on the nav's shown control. `document.documentElement.scrollWidth` ≤ the viewport width |
| 0007-S3 | each shown URL text is cut with an ellipsis and keeps its whole text and `title` | same file, same pages × viewports × states | S02 — AC-8 | every `[data-short-link]` whose own and every ancestor's computed `display` is not `none`: `display` ≠ `inline`, `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`; where `scrollWidth` > `clientWidth`, `textContent` is the whole displayed text and `title` the copied URL |
| fork:init anchors (existing tests, no new test) | the anchor lines stay one each | `pnpm test --run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts` (upstream-guard reads the real `shortLink.ts` and `config.mts`); plus `grep -c '^export const SITE_ORIGIN = ' .vitepress/challenge/shortLink.ts`, `grep -cE '^const siteBase = ' .vitepress/config.mts` and `grep -cE '^  title: .+,$' .vitepress/config.mts`, each printing `1` | F01 — AC-25 | after every change of this ticket; the new `define` entry and helper add no line matching A6, A8 or A9 |
| stage 6 diff check (not automated) | the comments on `SITE_ORIGIN` and the header line "the same string whether it is printed on a handout, shown on screen, or copied" describe both link modes | `git diff a54e917 -- .vitepress/challenge/shortLink.ts` | P4 — AC-24 | both modes named; nothing else in P1–P3 or P5–P8 is touched by this ticket |
| stage 8 (not automated) | short mode on Cloudflare; page mode on a local build | V01: the ticket branch's Cloudflare Pages preview, list and nav in both languages, challenge pages with the Browser panel open. V02: `pnpm build` without `CF_PAGES`, served by `pnpm docs:preview`, driven with `/agent-browser` or the host's browser tools at 375 wide and 1280×800, Browser panel open; T-0037 adds V02's selection check | V01, V02 — AC-20 | V01: short links with `SITE_ORIGIN`, and `/c/NNN`, `/zh/c/NNN` on the preview's own host open their challenges. V02: page URLs displayed and copied; at 375 wide a URL that does not fit ends in an ellipsis and its `title` is the whole URL |

Regression gate for every cycle: `pnpm test --run` (baseline on `a54e917`: 127 files, 4203 passed,
1 skipped) and, for the S3 rows, `pnpm docs:build && pnpm test:smoke`.

Approval: The user approved this test plan in advance on 2026-10-21 with the standing instruction "所有的都按照你的建議執行、實踐" (follow and carry out every recommendation), given together with "/implement 完成 T-0030-T-0032 T-0036".

### 2026-10-21 — decisions during implementation (stage 5)

The planner's open points, resolved by the spec where it decides them, otherwise by the reading
that keeps every other row true:

1. **S01 in `copy_failed` at 360 wide.** T-0036 asserts S01 in every state, `copy_failed` at
   360×740 included. The status text got `min-w-0 whitespace-normal`, as the spec allows ("The status
   text may wrap"); the 6ch floor (S10) is left to T-0037. For information only, not as a
   verification of any row: a one-off Playwright script against `pnpm docs:preview` (session scratch
   file `wf/T-0036/measure.mjs`, run with `node` from the worktree root, not committed) measured,
   while `copy_failed` shows at 360 wide, the longest list row's URL text at 122 px (English) and
   152 px (Traditional Chinese), and the nav's mobile-row URL text at 180 px. Whether that is at
   least 6ch is T-0037's S10. Since 2026-10-22, `min-w-0 whitespace-normal` applies only while
   `copy_failed` shows; the confirmation is `shrink-0 whitespace-nowrap` (see "fixes after stage
   6–8" below).
2. **L06 and L07 at S2.** Accepted as stated: with upstream's `SITE_ORIGIN` (no path) they assert
   the same as L04 there. The origin path being kept is shown at S8 (X4), and "no base added" at the
   component by N04 (`withBase` prefixing `/my-range`).
3. **L18 under happy-dom.** Observed as planned: `defaultPrevented` is true, the anchor's own click
   listener is not called, and `location.href` is unchanged. Real navigation is left to stage 8 and
   T-0037's S06.
4. **S05.** Headless Chromium on `http://localhost:4173` with `clipboard-read` and `clipboard-write`
   granted gives the real clipboard back through `navigator.clipboard.readText()`, so the fallback
   spy was not needed. The smoke's init script passes `writeText` through to the real clipboard in
   these cases (`__wxlClipboard = 'real'`).
5. **S04 at all five viewports.** It is done inside the per-page × viewport layout test, on the same
   load, so it costs no extra page loads. S09 runs only at 375×812.
6. **M04** includes the six refused `SITE_BASE` values under every `CF_PAGES` value.
7. **Names.** The mode module is `.vitepress/theme/linkMode.ts` exporting `linkMode(): 'short' |
   'page'`; the helper is `challengeLink(mode, n, slug, locale, origin = SITE_ORIGIN)` in
   `shortLink.ts`, returning `{ url, display }` or `null`. `__WXL_SHORT_LINKS__` is declared in the
   root `env.d.ts`. `linkMode` guards with `typeof`, so an undefined constant is page mode. L19 lives
   in `tests/unit/components/ShortLinkShare.mode-default.test.ts`, where nothing mocks the module.
8. **P5 comments.** Left to T-0037 as scoped. Between the two tickets these are now stale, for stage
   6 to note: `ChallengeList.vue`'s line-3 comment ("has to stay readable and selectable at any
   width"), `ShortLinkShare.vue`'s "the text is left alone because selecting it is the fallback path",
   and `MergedNav.vue`'s "Short link: the address a reader is given" and the `number` prop's "The
   short link is built from it".
9. **Completed state.** After the first load (which creates the `challenge-tools` database at
   version 7), the smoke sets `sessionStorage['wxl-session-gate'] = 'decided'`, puts a
   `challenge-progress` record `{ challengeSlug: 'selected-excerpts', firstCompletedAt, lastAttemptAt,
   attemptCount: 1 }` (the shape `useChallengePersistence` writes), reloads, and checks that the done
   badge is visible. It also checks `copy_failed` while completed, the widest state of the nav.

Found during implementation:

- **A pre-existing defect, fixed in scope.** The nav's desktop control had `class="hidden
  md:inline-flex"`, but `ShortLinkShare`'s root is itself `inline-flex`, which UnoCSS emits after
  `.hidden` in the stylesheet. The caller's `hidden` therefore lost, and below 768 wide the desktop
  control showed in row 1 (35 px wide at 360) beside the mobile row's own. Both classes are already
  there at `a54e917`, so this predates the ticket:
  `git show a54e917:.vitepress/theme/components/ShortLinkShare.vue | grep -n inline-flex` prints line
  71 (`<span v-if="value !== null" class="inline-flex items-center gap-1 min-w-0">`), and
  `git show a54e917:.vitepress/theme/components/MergedNav.vue | grep -n '<ShortLinkShare class='`
  prints line 137 (`class="hidden md:inline-flex"`). It contradicts the vocabulary's "shown URL text"
  (the desktop control from 768 wide, the mobile row's below it). Fixed with `class="max-md:hidden"`,
  a media-query rule that comes after both. The smoke assertion that a challenge page shows exactly
  one URL text (`site-smoke.spec.ts` line 205, "the nav shows both its controls") fails before the fix
  and passes after. Reproduced at stage 6: put the old class back with
  `perl -pi.bak -e 's/<ShortLinkShare class="max-md:hidden"/<ShortLinkShare class="hidden md:inline-flex"/' .vitepress/theme/components/MergedNav.vue`,
  run `env -u CF_PAGES pnpm docs:build`, restore with
  `mv .vitepress/theme/components/MergedNav.vue.bak .vitepress/theme/components/MergedNav.vue`, then
  `CI=1 pnpm test:smoke -g "selected-excerpts at 3(60|75)"` → 4 failed (the four layout cases, English
  and Traditional Chinese at 360×740 and 375×812, each on "the nav shows both its controls … (at
  rest)"), 4 passed (the clipboard and run-time flag cases the pattern also matches). After
  rebuilding with the fix, `CI=1 pnpm test:smoke` → 48 passed. Reproduce the CSS order with
  `grep -boE '\.hidden\{display:none\}|\.inline-flex\{display:inline-flex\}' .vitepress/dist/assets/style.*.css`
  after `env -u CF_PAGES pnpm docs:build` (offset 102061 before 103025).
- **Not checked, outside scope.** The nav's done badge uses the same `hidden md:inline-flex` pattern
  on a root whose `ch-badge-done` shortcut includes `inline-flex`, so it may show twice below 768
  when completed. It was not measured; a follow-up or T-0037 should look.
- **The constant is replaced at compile time.** In a page-mode build no `__WXL_SHORT_LINKS__`
  identifier is left in the output (`grep -rl __WXL_SHORT_LINKS__ .vitepress/dist` prints nothing),
  and the minifier dropped the short branch of `challengeLink` from the theme chunk
  (`/usr/bin/grep -oE '.{200}/challenge/\$\{.{40}' .vitepress/dist/assets/chunks/theme.*.js` shows
  only the page-URL branch). That is why S09's run-time flag has nothing to switch. Short mode in a
  built site is still stage 8's V01.
- **Rows that passed on their first run.** M04, L20 at S8, the S2 page-mode, renders-nothing, status,
  label, locale and anchor rows, N04–N06, and S04, S05, S09 rest on implementation from an earlier
  cycle or on today's behaviour. Mutation checks show the S2 rows can fail. Each was rerun at stage 6
  with the command below, and the file restored from its `.bak` afterwards:
  - Mode forced to short:
    `perl -pi.bak -e "s/^const mode = linkMode\(\)\$/const mode = 'short'/" .vitepress/theme/components/ShortLinkShare.vue && pnpm vitest run tests/unit/components/ShortLinkShare.test.ts; mv .vitepress/theme/components/ShortLinkShare.vue.bak .vitepress/theme/components/ShortLinkShare.vue`
    → 9 failed, 43 passed: the 3 page-mode URL cases (L04–L08), `"7"` rendering as 7 (L09), and the
    five page-mode slug cases (L10, L16). Stage 5's record said "fails the 3 page-mode cases"; the
    rerun shows 9, so that count was wrong.
  - `typeof` guard dropped:
    `perl -pi.bak -e "s/typeof __WXL_SHORT_LINKS__ !== 'undefined' && //" .vitepress/theme/linkMode.ts && pnpm vitest run tests/unit/components/ShortLinkShare.mode-default.test.ts; mv .vitepress/theme/linkMode.ts.bak .vitepress/theme/linkMode.ts`
    → both L19 cases fail with `ReferenceError: __WXL_SHORT_LINKS__ is not defined`.
  - The button's `title` read from the runtime locale (stage 6, for the L15 assertion added then):
    `perl -pi.bak -e "s/:title=\"tp\('short_link.copy_label'\)\"/:title=\"\\\$t('short_link.copy_label')\"/" .vitepress/theme/components/ShortLinkShare.vue && pnpm vitest run tests/unit/components/ShortLinkShare.test.ts; mv .vitepress/theme/components/ShortLinkShare.vue.bak .vitepress/theme/components/ShortLinkShare.vue`
    → 4 failed (L15, both directions, both modes), 48 passed.
- **Typecheck.** No typecheck script is configured. `pnpm exec vue-tsc --noEmit -p tsconfig.json`
  reports 105 errors on this branch, and the same 105 on `a54e917`, so this change adds none.
  Reproduced at stage 6, with `W` the worktree and `B` an empty scratch directory:
  `git -C $W archive a54e917 | tar -x -C $B && ln -s $W/node_modules $B/node_modules && cp -R $W/.vitepress/wasm $B/.vitepress/wasm`
  (the WASM build output is not in Git; without it `a54e917` reports one more error, a missing
  `virtual_fs.js`), then `(cd $B && $W/node_modules/.bin/vue-tsc --noEmit -p tsconfig.json > base.txt)`
  and `(cd $W && pnpm exec vue-tsc --noEmit -p tsconfig.json > head.txt)`, and
  `diff <(grep 'error TS' base.txt | sed -E 's/^[^:(]+\([0-9]+,[0-9]+\): //' | sort) <(grep 'error TS' head.txt | sed -E 's/^[^:(]+\([0-9]+,[0-9]+\): //' | sort)`
  prints nothing; `grep -c 'error TS'` gives 105 for each.

### 2026-10-21 — coverage report (stage 5)

Line or branch coverage was not measured: `pnpm vitest run --coverage ...` stops with
`MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'`, and no provider was installed.
The table therefore reports coverage by matrix row.

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0007-S1 | `tests/unit/site/config-base.test.ts`: "link mode from CF_PAGES" (7 cases) and "site base with CF_PAGES … (M04)" (7 values × 10 cases) | rows M01–M04, every boundary in the plan | AC-1 | none |
| 0007-S8 | `tests/unit/challenge/shortLink.test.ts` (21 cases) | X1–X6; L01–L07, L10, L11, L16, L20; grammar edges `a` and `a-`; origin not normalised | AC-2, AC-3, AC-5 | none |
| 0007-S2 | `tests/unit/components/ShortLinkShare.test.ts` (52 cases, 41 new), `ShortLinkShare.mode-default.test.ts` (2) | L01–L16 at the component in both modes (L06 and L07 as noted in decision 2; since stage 6, L15 also checks the button's `title`), L18, L19 | AC-1 to AC-6 | L17 and L21 are T-0037's. That no message key changed is stage 6's diff check; `git diff a54e917 -- .vitepress/theme/i18n/messages/` prints nothing now |
| 0007-S2 | `tests/unit/components/ChallengeList.test.ts` (10 new cases) and `MergedNav.test.ts` (4 new cases) | N01–N06: props from both lists and both nav controls, page locale ≠ runtime locale, `withBase` prefixing `/my-range`, fixture urls with and without a trailing slash, zh-TW row, badge, grid | AC-7 | none |
| 0007-S2 (supplement) | `tests/unit/layouts/ChallengeLayout.test.ts`: "passes MergedNav the slug it derives from the page" | N07's unit half | AC-7 | none |
| 0007-S3 | `tests/site-smoke/site-smoke.spec.ts`, 30 new cases: 20 layout (4 pages × 5 viewports × rest, copied, copy_failed, and on challenge pages completed and completed + copy_failed, with S04 on the same load), 6 clipboard (S05, N07), 4 run-time flag (S09) | S01, S02, S04, S05, S09, N07, plus one shown URL text per challenge page | AC-7, AC-8, AC-9 | S03, S06–S08 and S10 are T-0037's. Chromium only, as the spec scopes it |
| 0007-S3 (regression, not a matrix row) | `tests/site-smoke/site-smoke.spec.ts`, `expectStatusWhole`, called in each of the 20 layout cases while `short_link.copied` shows (added 2026-10-22; strengthened in round 2) | the copied status in both locales, list and nav, at all five viewports: `scrollWidth` ≤ `clientWidth`, one line box, height under 1.5 line heights, and since round 2 its box inside the viewport and inside every ancestor whose overflow is not `visible`, with `elementFromPoint` at its middle hitting it | none numbered; guards D7's direction (the URL text gives up the width) against stage 8's finding. Round 2's mutation (URL text `shrink-0`) fails it at 360 and 375 | the `copy_failed` layout and the 6ch minimum are T-0037's (S10) |
| 0007-S3 (regression, not a matrix row) | same file, "the mobile nav with the brief collapsed" (4 cases, round 2): both `selected-excerpts` pages × 360×740, 375×812, brief collapsed × rest, copied, completed, completed + copied, completed + copy_failed; `expectRowItemsWhole` | the mobile row's badges, done badge and 📖 brief toggle stay inside the 32 px row and uncut; `expectStatusWhole` while copied; S01, S02 in every state | none numbered; guards D7's direction against round 2's finding (the toggle squeezed to 3 lines) | the `copy_failed` layout on this row is T-0037's (S10, the row that may grow); only S01 and S02 are checked there |
| fork:init anchors | `tests/unit/scripts/fork-init.test.ts`, `tests/unit/scripts/upstream-guard.test.ts`, three `grep -c` | F01 | AC-25 | none |
| P4 | none (stage 6 diff check) | `shortLink.ts`'s header and the `SITE_ORIGIN` comment were rewritten to name both modes | AC-24 | stage 6 confirms it on `git diff a54e917 -- .vitepress/challenge/shortLink.ts` |
| V01, V02 | none (stage 8) | — | AC-20 | stage 8 |

Commands run at the end of stage 5, in this worktree, and their results:

- `pnpm test --run` → 129 files passed; 4358 tests passed, 1 skipped (baseline on `a54e917`: 127
  files, 4203 passed, 1 skipped).
- `env -u CF_PAGES pnpm docs:build` → build complete, exit 0.
- `CI=1 pnpm test:smoke` → 47 passed, 1 failed: `code-panel-platform.spec.ts` "the flag file is
  unreachable from the Code panel", whose `[data-run]` stayed disabled for the full 180 s boot timeout.
  Rerun alone, `CI=1 pnpm test:smoke tests/site-smoke/code-panel-platform.spec.ts` → 9 passed; the
  machine's load average was about 21 at the time (`uptime`). The failure is a cold runtime boot
  under load, in a spec this ticket does not touch. `CI=1` keeps Playwright from reusing a preview
  server another worktree may have on port 4173; the port was cleared afterwards with
  `for P in $(lsof -tnP -iTCP:4173 -sTCP:LISTEN); do kill -9 $P; done`.
- `CI=1 pnpm test:smoke -g "copy control"` → 30 passed (after the last build).
- `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts`
  → 2 files passed; 1992 tests passed, 1 skipped.
- `grep -c '^export const SITE_ORIGIN = ' .vitepress/challenge/shortLink.ts`,
  `grep -cE '^const siteBase = ' .vitepress/config.mts` and
  `grep -cE '^  title: .+,$' .vitepress/config.mts` → each prints `1`.
- `git diff a54e917 -- .vitepress/theme/i18n/messages/ | wc -l` → `0`.

Not ticked, waiting on later stages: L12–L15 and L18, whose S2 tests pass but whose criterion also
needs stage 6's message-key diff check; P4 (stage 6); and stage 8's V01 and V02.

### 2026-10-21 — code review (stage 6)

Three axes (Standards, Spec, Security), each candidate checked by three independent skeptics; a
finding is confirmed when at least two of three agree it is real.

Confirmed and acted on:

| # | Axis | Finding | Verdict | What was done |
|---|---|---|---|---|
| C1 | Standards (medium) | "failed at 360 and 375 before the fix (4 failures)" and "the same at `a54e917`" carried no reproducing command | 3/3 real | Reproduced, and the record now gives the `git show a54e917:…` commands with their line numbers and the revert, build, restore and smoke commands with their result (4 failed, 4 passed), under "A pre-existing defect" |
| C2 | Standards (low) | The mutation checks named no command | 3/3 real | Each check now carries its `perl -pi.bak …`, `pnpm vitest run …` and restore command. The rerun corrected the record: forcing short mode fails 9 cases, not the 3 stage 5 wrote |
| C3 | Spec (medium) | The P4 comments said the host decides the mode and "only Cloudflare Pages reads `_redirects`"; `config.mts` said "no other host reads" them | 3/3 real | `shortLink.ts`'s header and its `SITE_ORIGIN` comment, and the `define` comment in `config.mts`, now say the build decides (`CF_PAGES=1` short links, every other build the page URL, Direct Upload, Workers, and other hosts that read `_redirects` included). Comments only, no behaviour change |
| C4 | Spec (low) | The P4 header said shown and copied text are "the same string" | 2/3 real | The header now says that what is copied is the canonical URL and that what is shown is the same URL without its scheme |
| C5 | Spec (low) | L15 did not check the button's `title` while the page locale differs from the runtime locale | 3/3 real | Added `expect(ok.find('[data-copy-link]').attributes('title')).toBe(messages[page].short_link.copy_label)` to the L15 case in `ShortLinkShare.test.ts`. The implementation was already right, so the test passed on its first run. A mutation check shows it can fail: reading `title` with `$t` fails 4 cases (command under "Rows that passed on their first run") |
| C6 | Spec (low) | Several verification claims carried no command: (1) the pre-fix failures, (2) the mutation checks, (3) the `git archive` typecheck comparison, (4) the decision 1 measurement | 3/3 real for (1) and (2); (3) partly; (4) rejected | (1) and (2) are done as C1 and C2. (3): reproduced, and the record now gives the extract, link, copy and diff commands. The rerun found that `a54e917` without the untracked `.vitepress/wasm` output reports 106 errors, not 105, so the copy step is now stated. (4) declined: decision 1 marks the measurement "for information only, not as a verification of any row", so the ticket-record rule does not reach it |

Rejected by the skeptics, recorded and not acted on (0/3 real unless stated):

- Standards: smoke's `pageUrlOf` rebuilds the expectation with the implementation's formula. Rejected: the expectation is built as the spec prescribes (T70/AC-C1), the prefix rule is pinned by literals at S8, and the smoke can still disagree with the built page.
- Standards: `expectedUrlFor` copies `slugOf`'s derivation. Rejected: its input is the rendered row `href`, which is observable, and the slugs are pinned by literals at N01/N02 and S05.
- Standards: the scratch measurement, the happy-dom observation and the case counts are not reproducible. Rejected: the measurement is labelled information only, L18 has a committed test, and counts describe test files rather than verifying anything.
- Standards: the test plan approval was blanket and given in advance. Rejected: the record states this plainly, quoting the user's own words, and no documented rule requires approval table by table.
- Standards: rows passed on their first run, so there was no red. Rejected: they are regression rows or re-checks at another seam, and the record already says so.
- Standards: the coverage report has no line coverage. Rejected: OQ-009 records the user's choice not to install a provider, and the record says why it was not measured.
- Standards: `SLUG_GRAMMAR` duplicates `create-challenge.ts`'s `SLUG_RE`. Rejected: the spec fixes the grammar as a literal, and `create-challenge.ts` belongs to T-0030's scope.
- Standards: `SCHEME` is declared after the function that uses it. Rejected: it is only read inside function bodies, and no repository rule is broken.
- Standards: `ShortLinkLocale` and its comment speak only of short links. Rejected: both lines predate this ticket, which does not change them, and P1–P8 do not name them.
- Standards: the comment at the top of `ChallengeList` mentions only short links. Rejected: this ticket does not change it, it is still true in page mode, and P5 does not list it.
- Standards: comments stay stale between this ticket and T-0037. Rejected: P5 belongs to T-0037, and decision 8 discloses it.
- Standards: only one place got the `hidden md:inline-flex` fix, and the done badge keeps the old pattern. Rejected: the badge's `inline-flex` comes from a shortcut, which is emitted before `.hidden`, so `hidden` wins. After `env -u CF_PAGES pnpm docs:build`, `grep -boE '\.hidden\{display:none\}|\.inline-flex\{display:inline-flex\}|\.ch-badge-done\{' .vitepress/dist/assets/style.*.css` prints `.ch-badge-done{` at 94380, before `.hidden{display:none}` at 102061. The "may show twice" guess under "Not checked, outside scope" is therefore unlikely to hold. It was still not measured in a browser.
- Standards: the `linkMode` `vi.mock` is repeated in three files and mocks a module of this project. Rejected: `vi.mock` is hoisted per file, the spec requires it, and a global mock would break L19.
- Standards: N01–N03 compare the full props with `toEqual`. Rejected: the props are the seam the matrix names.
- Standards: `mountShare` takes a rest tuple and casts with `as number`. Rejected: the helper has to tell an explicit `undefined` from no argument (L09), and the cast does not change what reaches the component at run time.
- Standards: the expectation branches on the mode. Rejected: both branches are independent literals.
- Standards: the smoke reads the messages JSON relative to the current directory. Rejected: every documented way to run it starts at the repository root.
- Standards: the smoke's setup depends on sibling order and on the IndexedDB schema. Rejected: this is fixture coupling in the setup, the approved plan prescribes it, and a change breaks the test loudly.
- Standards: S04 parses the HTML as served with a regex and does not decode entities. Rejected: the compared text can contain no character that would be escaped.
- Standards: `challengeLink` takes five positional parameters. Rejected: it has one production caller, and the module already passes positional parameters this way.
- Standards: the `LinkMode` type and its reader live in different files. Rejected: this follows decision 7, and moving the type would invert the dependency direction.
- Standards: the new `ChallengeLayout` test repeats a `BrowserPanel` slug assertion. Rejected: that assertion is half of what the test claims.
- Standards: `data-short-link` and `ShortLinkShare` now also name a page URL. Rejected: the spec keeps the names (`spec.en.md` lines 99–100, 351).
- Spec: L06 is not observed at S2, yet the whole row is ticked. Rejected: the spec defines it this way, and decision 2 records it.
- Spec: N04's "each row" checks only the first row. Rejected: every row of each fixture is checked, and N01/N02 pin each row's props.
- Spec: the status text wrapping and S01 at 360 wide with `copy_failed` belong to T-0037. Rejected: S01's "each state" is this ticket's row, and T-0037 re-checks it.
- Spec: the nav's `max-md:hidden` change and the assertion that a challenge page shows one URL text were not asked for. Rejected: the vocabulary's "shown URL text" requires both, and S02, S05 and S09 depend on it.
- Spec: the mobile row's fixed `h-[32px]` may overflow vertically now that the status wraps. Rejected: the height predates this ticket, the spec allows the row to grow but does not require it, and the case belongs to T-0037. Noted here for T-0037: measure the mobile row's `scrollHeight` against its `clientHeight` while `copy_failed` shows at 360 wide.
- Spec: the done badge issue is only recorded in Comments. Rejected: see the CSS order above.
- Spec: AC-6 and P4 are unticked. Rejected: both criteria name stage 6 as where they are checked. They are ticked below.
- Spec: M04 rewrites the SITE_BASE cases. Rejected: the two lists are identical today.
- Security: three candidates. All rejected; see stage 7 below.

Stage 6 checks that close criteria:

- AC-6, the message keys: `git diff a54e917 -- .vitepress/theme/i18n/messages/ | wc -l` prints `0`, so no message key was added, removed or changed. L12–L15 and L18 are ticked.
- AC-24, P4: `git diff a54e917 -- .vitepress/challenge/shortLink.ts` shows the header and the `SITE_ORIGIN` comment naming both link modes, decided by the build (after C3 and C4). P4 is ticked.

Commands rerun at stages 6 and 7, in this worktree:

- `pnpm vitest run tests/unit/components/ShortLinkShare.test.ts tests/unit/components/ShortLinkShare.mode-default.test.ts` → 2 files, 54 passed.
- `pnpm test --run` → first run: 1 failed, 4357 passed, 1 skipped. The failure was a 10 s hook timeout in `tests/unit/scripts/challenge-keygen.test.ts`, a file this ticket does not touch, at a load average of about 20 (`uptime`). `pnpm vitest run tests/unit/scripts/challenge-keygen.test.ts` → 79 passed alone. Second full run → 129 files passed; 4358 passed, 1 skipped.
- `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts` → 2 files passed; 1992 passed, 1 skipped.
- `grep -c '^export const SITE_ORIGIN = ' .vitepress/challenge/shortLink.ts`, `grep -cE '^const siteBase = ' .vitepress/config.mts` and `grep -cE '^  title: .+,$' .vitepress/config.mts` → each prints `1` (F01).
- `env -u CF_PAGES pnpm docs:build` → exit 0. Then `grep -rl __WXL_SHORT_LINKS__ .vitepress/dist | wc -l` → `0`.
- `CI=1 pnpm test:smoke` → 48 passed. Afterwards `lsof -tnP -iTCP:4173 -sTCP:LISTEN` printed nothing, so no preview server was left to stop.
- The pre-fix smoke reproduction, the three mutation checks and the typecheck comparison, with their commands and results, under "Found during implementation".

### 2026-10-21 — security review (stage 7)

Report: [`security-T-0036.md`](../../.proj.specs/0007-gh-pages-range-fixes/review/security-T-0036.md).

| # | Candidate | Verdict | What was done |
|---|---|---|---|
| S-1 | The smoke reads and writes the developer's real clipboard, so a failure might print what was on it (`tests/site-smoke/site-smoke.spec.ts:146`, `:308`–`:329`) | 0/3, rejected | None. The skeptics hold that headless Chromium uses an in-process clipboard and that the test reads back only the URL it wrote. None of them tested this. The report gives a sentinel check with `pbcopy` and `pbpaste` that would settle it; it has not been run |
| S-2 | The recorded cleanup command kills whatever listens on 4173 (this ticket, line 228) | 0/3, rejected | None. The command is the project's documented cleanup in `docs/agents/platform-notes.md:24`, and it is not a security boundary |
| S-3 | In page mode, a fork that never ran fork:init copies URLs that point at upstream (`.vitepress/challenge/shortLink.ts:37`, `:114`) | 0/3, rejected | None. B4's "Does not protect" column already accepts this, and D10 is out of scope |

No security finding was confirmed, and no change was made for stage 7. The report lists the limits
of the review, as the reviewer stated them. It does not claim the project is secure.

### 2026-10-21 — end-to-end (stage 8, local)

Surface: the built site in page mode, as a browser renders it. Built in this worktree with
`env -u CF_PAGES pnpm docs:build` (exit 0; `grep -rl __WXL_SHORT_LINKS__ .vitepress/dist | wc -l` →
`0`), served with `pnpm docs:preview --port 4391 --strictPort`, and driven in headless Chrome with
the agent-browser CLI 0.29.1 (`AGENT_BROWSER_SESSION=t0036`). Not covered: short mode, the
Cloudflare Pages host, other browsers, and real touch input.

How it was driven. The session scratch scripts in `wf/T-0036/v02/` are not committed:

- `run.sh <name> <path> <locale> <width> <height> <slug|nav>` sets the viewport, stores the page's
  language (`localStorage['wxl-locale']`, so the D6 redirect does not move an English page) and
  `sessionStorage['wxl-session-gate'] = 'decided'`, opens the page and waits for hydration. On a
  challenge page it also waits for the Browser panel's `iframe[srcdoc]`, and below 768 wide it clicks
  `◀` so the Browser panel takes the width. It then runs `measure.js`: `document.documentElement.scrollWidth`
  against `innerWidth`, and for every shown `[data-short-link]` its text, `title`, computed `display`,
  `white-space`, `overflow-x` and `text-overflow`, and `scrollWidth` against `clientWidth`. It takes a
  screenshot, clicks the list row's or the nav's shown copy button, prints
  `agent-browser clipboard read` and the URL before and after, and measures and screenshots again.
- `grant.mjs` attaches to each page target over CDP, sends `Browser.grantPermissions`
  (`clipboardReadWrite`, `clipboardSanitizedWrite`) for `http://localhost:4391`, and keeps the
  connection open. The grant ends when the connection closes, and without it
  `agent-browser clipboard read` fails with "Read permission denied". Run it in the background with
  `node grant.mjs "$(agent-browser get cdp-url)" http://localhost:4391`.
- Lists: `run.sh en-list /challenges en W H selected-excerpts` and
  `run.sh zh-list /zh-TW/challenges zh-TW W H selected-excerpts`. Challenge pages:
  `run.sh en-selected-excerpts /challenge/selected-excerpts/ en W H nav` and
  `run.sh zh-selected-excerpts /zh-TW/challenge/selected-excerpts/ zh-TW W H nav`. Each was run at
  `W H` = `1280 800` and `375 812`.

Screenshots are in the session scratch directory `wf/T-0036/`, named
`v02-<page>-<width>x<height>-{rest,copied}.png`.

| Row | Surface | Result | Evidence |
|---|---|---|---|
| V02: the list displays page URLs | built site in a browser, English and Traditional Chinese lists, 1280×800 and 375×812 | pass | Every shown URL text is `wxl.browserlab.online[/zh-TW]/challenge/<slug>/` for each of the four rows, and its `title` is the same with `https://`. `v02-{en,zh}-list-{1280x800,375x812}-rest.png` |
| V02: the list copies page URLs | same | pass | After a click on the `selected-excerpts` row's copy button, the clipboard reads `https://wxl.browserlab.online/challenge/selected-excerpts/` (English) or `https://wxl.browserlab.online/zh-TW/challenge/selected-excerpts/` (Traditional Chinese) at both sizes. The status reads `Copied` or `已複製`, and the page URL stays `/challenges` or `/zh-TW/challenges`. A check before the full run copied `door-is-open` first and read back its URL, so the read is not left over from an earlier copy |
| V02: the nav displays and copies page URLs, with the Browser panel open | built site in a browser, English and Traditional Chinese `selected-excerpts`, 1280×800 and 375×812 | pass | One shown URL text, `wxl.browserlab.online[/zh-TW]/challenge/selected-excerpts/`, whose `title` is the full URL. The clipboard after a copy holds the same URL. The Browser panel shows the challenge rendered with its styles: `iframe[srcdoc]` at 778×650 at 1280 wide and 353×534 at 375 wide once `◀` is clicked. `v02-{en,zh}-selected-excerpts-{1280x800,375x812}-{rest,copied}.png`, `v02-zh-selected-excerpts-375x812-panel-expanded.png` |
| V02: at 375 wide a URL that does not fit ends in an ellipsis and its `title` is the whole URL | built site in a browser, all four pages at 375×812, at rest and after a copy | pass | Every shown URL text is cut (`scrollWidth` > `clientWidth`). List rows: 325–405 px in 259 px, or 234/239 px for the row showing a status. The nav: 361/405 px in 96–195 px. Each has computed `display: block`, `white-space: nowrap`, `overflow-x: hidden` and `text-overflow: ellipsis`, its `textContent` is the whole displayed URL, and its `title` the whole copied URL. The ellipsis is visible in `v02-zh-list-375x812-copied.png` and `v02-zh-selected-excerpts-375x812-panel-expanded.png`. At 1280 wide nothing is cut |
| V02: the page does not scroll sideways | all four pages × both sizes × at rest and copied | pass | `document.documentElement.scrollWidth` equals `innerWidth` (1280 or 375) in every measurement |
| V02: a click on the URL text selects it without leaving the page | — | not-run | T-0037's (V02's last clause, S03) |
| V01: Cloudflare preview, short mode | — | not-run | Needs the branch pushed and its preview built; the parent runs it later |

Found during this run. No V02 row above names it, but it is visible on the surface:

- **At 375 wide the copy status is squeezed until it cannot be read.** While a status shows, the
  status text gets only a few pixels. English `Copied` is cut, not wrapped: on the nav its
  `clientWidth` is 18 px with `scrollWidth` 38 px (10 px once the brief is collapsed), and on the
  list row 25 px against 38 px. The screenshot shows `Copie`
  (`v02-en-selected-excerpts-375x812-status-collapsed-no.png`). Traditional Chinese `已複製` wraps
  one character per line, 15–20 px wide and 72 px tall. In the nav's mobile row, whose height is a
  fixed 32 px, it spills over row 1 and loses its last character
  (`v02-zh-selected-excerpts-375x812-status.png`). The English case comes from this ticket's
  `min-w-0` on the status (decision 1). `git show a54e917:.vitepress/theme/components/ShortLinkShare.vue | grep -n -A3 data-copy-status`
  shows no `min-w-0` at `a54e917`. An in-page experiment that removed the class, with the source
  untouched (`wf/T-0036/v02/experiment.js`), kept `Copied` at 38 px. The URL text yielded
  (157 px on the nav, 221 px on the list) and `scrollWidth` stayed at 375. The Traditional Chinese
  case wrapped the same way without `min-w-0`, because CJK text can break between any two
  characters. Recommendation: before landing, decide whether T-0036 or T-0037 gives the status a
  floor, for example one that keeps a short status on one line while the URL text yields first (D7,
  D14), and whether the mobile row may grow (stage 6 already noted the fixed `h-[32px]` for
  T-0037). S01 and S02 still hold in this state, so the smoke stays green.
  **Fixed on 2026-10-22**: the confirmation no longer shrinks or wraps, and a smoke assertion now
  covers it; see "Re-driven on 2026-10-22" below and "fixes after stage 6–8".
- Outside scope, and present at `a54e917`: the list's heading `Challenges` and its subtitle are
  hard-coded English in `ChallengeList.vue` (lines 229–230), so the Traditional Chinese list shows
  them in English (`v02-zh-list-1280x800-rest.png`).

Cleanup: `agent-browser close`; `pkill -f wf/T-0036/v02/grant.mjs`;
`for P in $(lsof -tnP -iTCP:4391 -sTCP:LISTEN); do kill $P; done`. Afterwards
`lsof -tnP -iTCP:4391 -sTCP:LISTEN` printed nothing. No throwaway repository or commit was needed.

Re-driven on 2026-10-22, after the status fix. Surface: the built site in page mode in a real
browser, Playwright's Chromium (headless) driven by the session scratch script
`wf/T-0036/v02/v02-fix.mjs` (not committed). Built with `env -u CF_PAGES pnpm docs:build` (exit 0;
`grep -rl __WXL_SHORT_LINKS__ .vitepress/dist | wc -l` → `0`), served with
`pnpm docs:preview --port 4391 --strictPort`, and driven with
`node <scratch>/wf/T-0036/v02/v02-fix.mjs` from the worktree root; output in `wf/T-0036/v02/v02-fix.log`.
The script grants `clipboard-read` and `clipboard-write` to `http://localhost:4391`, stores the page's
language and the shared-machine choice, waits on challenge pages for the Browser panel's
`iframe[srcdoc]`, and below 768 wide measures twice: as the page opens, and once `◀` is clicked so the
Browser panel takes the width. Before each copy it writes `sentinel-before-copy` to the clipboard, so
the read-back is not left over. It then refuses the clipboard, copies again and measures
`copy_failed`. Screenshots: `wf/T-0036/v02-fix-<page>-<width>x<height>[-panel]-{copied,copy_failed}.png`.

| Row | Surface | Result | Evidence |
|---|---|---|---|
| The copied status is whole and on one line (regression check) | both lists and both `selected-excerpts` nav controls, 375×812 (nav as opened and with the Browser panel taking the width) and 1280×800 | pass | `Copied` 38/38 px (`scrollWidth`/`clientWidth`), `已複製` 34/34 px, one line box, 24 px tall at a 24 px line height, `white-space: nowrap`, in all 10 copied measurements. `v02-fix-en-list-375x812-copied.png` shows `Copied` whole; `v02-fix-zh-selected-excerpts-375x812-panel-copied.png` shows `已複製` on one line inside the 32 px mobile row |
| The URL text gives up the width (D7) | same, 375×812 | pass | URL text cut with an ellipsis while the status shows: list 221 px (English) and 225 px (Traditional Chinese) of 361/405 px; nav 157/161 px as opened, 68/120 px with the Browser panel taking the width. Its `title` is the whole copied URL in each case. At 1280 wide it is not cut |
| V02: list and nav copy page URLs | same pages and sizes | pass | The clipboard reads `https://wxl.browserlab.online[/zh-TW]/challenge/selected-excerpts/` after each copy (sentinel replaced), and the page URL stays where it was |
| S01 in `copied` and `copy_failed` | same pages and sizes | pass | `document.documentElement.scrollWidth` equals `innerWidth` (375 or 1280) in all 20 measurements. `copy_failed` wraps (3–8 lines at 375 wide, 1–2 at 1280) and the URL text yields further (56–167 px at 375); whether the nav's fixed 32 px mobile row should grow for it is T-0037's. Round 2 correction: this re-drive did not measure the brief collapsed or the completed state, where `copy_failed` runs to 10–12 lines and English `yourself` is cut; see round 2 under "fixes after stage 6–8" |
| V02: the Browser panel is open on challenge pages | `selected-excerpts`, both locales | pass | `iframe[srcdoc]` 778×650 at 1280 wide; at 375 wide 73×630 as opened and 353×534 once `◀` is clicked |

Cleanup: the preview was stopped, then `for P in $(lsof -tnP -iTCP:4391 -sTCP:LISTEN); do kill $P; done`;
afterwards `lsof -tnP -iTCP:4391 -sTCP:LISTEN` printed nothing. The script closes its own browser.

The stage 8 checkbox stays unticked. V01 has not run (it needs the push and the Cloudflare
preview) and V02's selection clause is T-0037's. The status finding above is fixed.

### 2026-10-21 — completeness check

Checked against the checkout, not against the records above.

Ticked criteria and the test that observes each at its seam (every one found, none unticked):

| Criterion | Seam | Observed by |
|---|---|---|
| M01–M04 | 0007-S1 | `tests/unit/site/config-base.test.ts`, "link mode from CF_PAGES" and "site base with CF_PAGES %j (M04)" |
| L19 | 0007-S2 | `tests/unit/components/ShortLinkShare.mode-default.test.ts` (no `linkMode` mock) |
| L01–L03 | 0007-S8, S2 | `tests/unit/challenge/shortLink.test.ts` "challengeLink in short mode"; `ShortLinkShare.test.ts` "ShortLinkShare" (short mode) |
| L04–L07 | 0007-S8, S2 | `shortLink.test.ts` "challengeLink in page mode" (X3–X5, origin not normalised); `ShortLinkShare.test.ts` "ShortLinkShare in page mode" |
| L08 | 0007-S2 | `ShortLinkShare.test.ts` "carries the copied URL as the URL text's title (L08)" and the page-mode case (L04-L08) |
| L09–L11, L16, L20 | 0007-S2, S8 | `ShortLinkShare.test.ts` "in %s mode renders nothing", "in page mode without a usable slug"; `shortLink.test.ts` "challengeLink returns none", L11 case |
| L12–L15, L18 | 0007-S2, stage 6 diff | `ShortLinkShare.test.ts` "copy behaviour in %s mode" (L12–L15, L18); `git diff a54e917 -- .vitepress/theme/i18n/messages/ \| wc -l` → `0` |
| N01–N07 | 0007-S2, S3 | `ChallengeList.test.ts` (N01, N02, N04–N06), `MergedNav.test.ts` (N03, N04), `ChallengeLayout.test.ts` "passes MergedNav the slug …" and `site-smoke.spec.ts` "what is copied (S05, N07)" (N07) |
| S01, S02 | 0007-S3 | `site-smoke.spec.ts` "layout and the HTML as served" (`expectLayoutHolds`) |
| S04, S05, S09 | 0007-S3 | same file: S04 in the layout cases, "what is copied (S05, N07)", "a run-time flag does not switch the mode (S09)" |
| F01 | fork:init anchors | the vitest command and three `grep -c` below |
| P4 | stage 6 diff | `git diff a54e917 -- .vitepress/challenge/shortLink.ts` shows the header and the `SITE_ORIGIN` comment naming both modes |

Records present: test plan table with its approval line, decisions, coverage report table, code
review (stage 6), security review (stage 7) with
`.proj.specs/0007-gh-pages-range-fixes/review/security-T-0036.md` present (102 lines), and the local
stage 8 subsection.

Commands run in this worktree, and their results:

- `pnpm test --run` → 129 files passed; 4358 passed, 1 skipped.
- `CF_PAGES=1 pnpm docs:build` → exit 0. The `[data-short-link]` texts in
  `.vitepress/dist/challenges.html` are `wxl.browserlab.online/c/{001,002,008,010}`, in
  `zh-TW/challenges.html` `wxl.browserlab.online/zh/c/{001,002,008,010}`, and on the
  `selected-excerpts` pages `…/c/010` and `…/zh/c/010` (read with
  `grep -oE 'data-short-link[^>]*>[^<]*<' <file>`).
- `env -u CF_PAGES pnpm docs:build` → exit 0. The same grep gives
  `wxl.browserlab.online[/zh-TW]/challenge/<slug>/` for the four rows of each list and for each
  `selected-excerpts` page. `grep -rl __WXL_SHORT_LINKS__ .vitepress/dist | wc -l` → `0`.
  `.vitepress/dist` is left as this default build.
- `CI=1 pnpm test:smoke` (on the default build) → 48 passed; afterwards
  `lsof -tnP -iTCP:4173 -sTCP:LISTEN` printed nothing.
- `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts`
  → 2 files passed; 1992 passed, 1 skipped.
- `grep -c '^export const SITE_ORIGIN = ' .vitepress/challenge/shortLink.ts`,
  `grep -cE '^const siteBase = ' .vitepress/config.mts`, `grep -cE '^  title: .+,$' .vitepress/config.mts`
  → each `1`.
- `git status --short` → 14 modified and 4 new files, all in the ticket's scope (the ticket, the
  security report, `shortLink.ts`, `config.mts`, `env.d.ts`, `linkMode.ts`, the four components and
  layout, and their tests). `git status --short --ignored` adds only `.vitepress/dist/`,
  `.vitepress/wasm/`, `node_modules/`, `platform/public/challenge/` and an empty `test-results/`;
  `find . -name '*.bak' -not -path './node_modules/*'` prints nothing.
- Frontmatter: `status: review`.

Open, so the ticket is not ready to land:

1. The stage 8 criterion is unticked: V01 (Cloudflare preview, short mode) needs the branch pushed;
   V02's selection clause is T-0037's.
2. ~~The stage 8 finding that at 375 wide the copy status is squeezed (`Copie`, `已複製` one character
   per line spilling over the nav's fixed 32 px row) waits for a decision on which ticket gives the
   status a floor. S01 and S02 still hold, so no test catches it.~~ Fixed on 2026-10-22 in this
   ticket, with a smoke assertion; see "fixes after stage 6–8".

### 2026-10-22 — fixes after stage 6–8

| # | Item | Fix | Test that now covers it |
|---|---|---|---|
| 1 | Stage 8 (V02): at 375 wide the copied status cannot be read. English `Copied` is cut to `Copie` by the `min-w-0` this ticket put on the status; Traditional Chinese `已複製` stacks one character per line and spills out of the nav's 32 px mobile row | `ShortLinkShare.vue`: a `confirmed` ref, set while `short_link.copied` shows. The status text is `shrink-0 whitespace-nowrap` then, so the URL text, not the status, gives up the width (D7's direction); while `copy_failed` shows it keeps `min-w-0 whitespace-normal`, so the long message may wrap and does not scroll the page sideways. No T-0037 row was implemented (no click-to-select, no title priority S07, no 6ch minimum S10, no `copy_failed` layout) | `tests/site-smoke/site-smoke.spec.ts`, `expectStatusWhole`, run in each "copy control in page mode: layout and the HTML as served" case (4 pages × 360×740, 375×812, 768×1024, 1024×768, 1280×800) while `short_link.copied` shows: `scrollWidth` ≤ `clientWidth`, one line box (counted from a `Range`'s client rects), and a height under 1.5 line heights. This is a regression test the traceability matrix does not number. S01 and S02 stay covered by `expectLayoutHolds` in the same cases, `copy_failed` included |

Red, then green (TDD, one seam: 0007-S3, the built site):

- Red, on the build from before the fix (`grep -oE 'data-copy-status[^>]*' .vitepress/dist/challenges.html`
  showed `class="min-w-0 whitespace-normal …"`): `CI=1 pnpm test:smoke -g "layout and the HTML as served"`
  → 10 failed, 10 passed. Failing: both lists and both challenge pages at 360 and 375, and both
  challenge pages at 768 (the nav's desktop place). English is cut, e.g. nav at 375
  `{"scrollWidth":38,"clientWidth":18,"lines":1}`; Traditional Chinese wraps, e.g. nav at 375
  `{"scrollWidth":15,"clientWidth":15,"lines":3,"height":72,"lineHeight":24}`, and at 768 `"lines":2`.
- Fix, then `env -u CF_PAGES pnpm docs:build` → exit 0; the built CSS has `.shrink-0{flex-shrink:0}`
  and `.whitespace-nowrap{white-space:nowrap}`
  (`grep -oE '\.shrink-0\{[^}]*\}|\.whitespace-nowrap\{[^}]*\}' .vitepress/dist/assets/style.*.css`).
- Green: `CI=1 pnpm test:smoke -g "layout and the HTML as served"` → 20 passed.
- Stage 8 re-drive at 375×812 and 1280×800 in a real browser with the Browser panel open: under
  "Re-driven on 2026-10-22" in the stage 8 subsection above (all rows pass).

Records updated: decision 1, the coverage report (a new 0007-S3 regression row), the stage 8
subsection (the finding marked fixed, the re-drive table), the completeness check's open item 2, and
the security report's 2026-10-22 addendum and S-1 line numbers
(`.proj.specs/0007-gh-pages-range-fixes/review/security-T-0036.md`; no security impact: the class
values are source literals and the status text still comes only from the two message keys).

Commands run in this worktree after the fix, and their results:

- `pnpm test --run` → 129 files passed; 4358 passed, 1 skipped.
- `env -u CF_PAGES pnpm docs:build` → exit 0; `grep -rl __WXL_SHORT_LINKS__ .vitepress/dist | wc -l` → `0`.
- `CI=1 pnpm test:smoke` → 48 passed. Before and after, `lsof -tnP -iTCP:4173 -sTCP:LISTEN` printed nothing.
- `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts`
  → 2 files passed; 1992 passed, 1 skipped.
- `git diff a54e917 -- .vitepress/theme/i18n/messages/ | wc -l` → `0` (no message key changed).
- Frontmatter: `status: review`. Still open: V01 (Cloudflare preview) and V02's selection clause
  (T-0037), as above.

#### Round 2 (2026-10-22)

Three findings from the review of round 1, each confirmed by at least two of three skeptics.
`<scratch>` below is `/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf/T-0036`.

| # | Finding | Decision and fix | Test that now covers it |
|---|---|---|---|
| R2-1 (medium) | With the brief collapsed on a phone, the mobile nav's 📖 toggle gives up width instead of the URL text. Traditional Chinese `📖 題目` is squeezed to 3 lines (33–34×80 px) and spills 24 px out of the 32 px row, hiding `目`; at `a54e917` it was 2 lines (44–46×56, 12 px). English was 2 lines (81×56) before and after | Fixed here, because this ticket's long page URL caused it, and round 1 fixed the same pattern for the status. `MergedNav.vue`: the row-2 toggle is `shrink-0 whitespace-nowrap`, with a comment. No T-0037 row is implemented (no title priority S07, no 6ch minimum S10) | `site-smoke.spec.ts`, "copy control in page mode: the mobile nav with the brief collapsed", 4 cases (both `selected-excerpts` pages × 360×740, 375×812): `expectRowItemsWhole` (each badge, the done badge and the toggle inside the row and not cut) at rest, copied, completed and completed + copied; `expectStatusWhole` while copied; S01, S02 in every state, completed + copy_failed included |
| R2-2 (low) | `copy_failed` is still cut by the same `min-w-0` (English `yourself`, `scrollWidth` 43 > `clientWidth` 26 at 360) and runs past the 100dvh shell's top; the comment in `ShortLinkShare.vue` said a long message "neither widens the row nor crowds out the URL text", and round 1's re-drive did not measure the completed state | Layout change declined: `copy_failed` on the mobile row is T-0037's (S10 and the row that may grow). The comment now says the message never widens the row or scrolls the page sideways, but shares the width with the URL text, is cut and runs out of the row, and that the layout is T-0037's. Round 1's S01 re-drive row now carries a correction. Measurements below, handed to T-0037 | S01 and S02 only, in the new collapsed cases (completed + copy_failed); no assertion on the message's own layout, which is T-0037's |
| R2-3 (medium) | `expectStatusWhole` measured only the status's own box. A `shrink-0` status always holds its text, so with the URL text made `shrink-0` (it no longer yields) the status sat outside the list's `overflow-hidden` box and the shell, out of sight, and every layout case at 360 and 375 still passed | Fixed in the test. `expectStatusWhole` also requires the status's box to lie inside the viewport and inside every ancestor whose computed `overflow-x` or `overflow-y` is not `visible`, and `elementFromPoint` at the box's middle to hit the status. That covers "the URL text gives up the width" as a reader sees it, so no separate URL-text assertion was added | the same function, in the 20 layout cases and the 4 new collapsed cases |

Red, then green:

- R2-3, red on a mutation (a test-only change, so the red is a build with D7 broken): in the scratch copy
  `<scratch>/review-r1-testq/copy` (this worktree's tree except `ShortLinkShare.vue` line 100,
  `block shrink-0 truncate`, built with `env -u CF_PAGES pnpm docs:build`; its Playwright config
  serves on 4517), with the strengthened spec copied in:
  `CI=1 pnpm exec playwright test --config playwright.site.config.ts tests/site-smoke/site-smoke.spec.ts -g "layout and the HTML as served"`
  → 11 failed, 9 passed (`<scratch>/r2/mut-red.log`). All 8 cases at 360 and 375 now fail on the new
  assertions, e.g. English list at 375: status 355–393 px, `inViewport` false, clipped by
  `div.rounded-xl…overflow-hidden` ending at 351, middle not hit; English nav at 375: 379–417 px against
  the `h-100dvh overflow-hidden` shell ending at 375. The other 3 (768, 1024) are the same click timeout
  the reviewer's run showed. Before the change that run gave 3 failed, 17 passed, none on a layout
  assertion. Green on this worktree's build: `CI=1 pnpm test:smoke -g "layout and the HTML as served"`
  → 20 passed (`<scratch>/r2/a-green.log`).
- R2-1, red on this worktree's build before the fix:
  `CI=1 pnpm test:smoke -g "brief collapsed|layout and the HTML as served"` → 4 failed, 20 passed
  (`<scratch>/r2/b-red.log`): the toggle `{"width":81,"height":56,"top":-12,"bottom":12}` (English) and
  `{"width":33,"height":80,"top":-24,"bottom":24}` / `34×80` (Traditional Chinese) spills out of its
  32 px row. Fix, `env -u CF_PAGES pnpm docs:build` → exit 0 (the served `data-desc-toggle` button
  carries `shrink-0 whitespace-nowrap`), then the same command → 24 passed (`<scratch>/r2/b-green.log`).

Measured after the fix, on this worktree's page-mode build served by
`pnpm docs:preview --port 4393 --strictPort`, with `node <scratch>/r2/probe.mjs http://localhost:4393 <scratch>/r2`
from the worktree root (output `<scratch>/r2/probe.log`, screenshots `<scratch>/r2/*-copy_failed.png`;
afterwards `lsof -tnP -iTCP:4393 -sTCP:LISTEN` printed nothing). Brief collapsed, `selected-excerpts`;
`document.documentElement.scrollWidth` equals the viewport width in every state:

| State | 360 English | 360 Traditional Chinese | 375 English | 375 Traditional Chinese |
|---|---|---|---|---|
| toggle (w×h, past the row's bottom) | 99×32, 0 | 58×32, 0 | 99×32, 0 | 58×32, 0 |
| URL text `clientWidth`, at rest / copied | 72 / 34 | 113 / 80 | 87 / 49 | 128 / 95 |
| same, completed | 37 / 0 | 78 / 45 | 52 / 14 | 93 / 60 |
| `copy_failed`: status `scrollWidth`/`clientWidth`, lines, top | 43/34, 12, −88 | 40/40, 7, −28 | 43/41, 10, −64 | 46/46, 5, −4 |
| same, completed | 43/18, 12, −88 | 28/28, 10, −64 | 43/25, 12, −88 | 33/33, 10, −64 |

Handed to T-0037 with these numbers (none of them a T-0036 row; S01 and S02 hold throughout):

- `copy_failed` on the mobile row with the brief collapsed: 5–12 lines, up to 88 px above the shell's top
  where the `h-100dvh overflow-hidden` shell clips it, and English `yourself` cut (`scrollWidth` 43 >
  `clientWidth` 18–41). Before round 2's toggle fix this was seen only once the challenge was completed
  (`clientWidth` 26 at 360, 33 at 375); with the toggle now whole it also happens before completion in
  English. This is S10's floor and the row that may grow.
- The English toggle on one line is 99 px, 18 px wider than its old two-line box, so with the done badge
  shown the URL text has 37 px (360) and 52 px (375) at rest and 0 px (360) and 14 px (375) for the
  2 s the confirmation shows, below S10's 6ch. The title is already 0 px there, so S07 frees nothing on
  this row.
- `copy_failed` in the nav's desktop place (row 1, a fixed `h-[40px]`), added in round 3 below: from
  768 to 1024 wide it wraps to 2–4 lines in English and 2–3 in Traditional Chinese and runs 4–28 px
  above the nav's top edge. The spec lets the mobile row grow and says nothing of the desktop row, so
  T-0037 decides the layout there within S01, S10 and D14.

Records updated: the coverage report (the `expectStatusWhole` row and a new row for the collapsed
nav), round 1's S01 re-drive row (the correction above), the comments in `MergedNav.vue` and
`ShortLinkShare.vue`, and the security report (S-1's line numbers and a round 2 addendum; no
security impact: the new class values are source literals, the toggle's text still comes only from
`merged_nav.description_toggle_label`, and the new tests use the fake `resolve`/`reject` clipboard).

Commands run in this worktree after round 2, and their results:

- `pnpm test --run` → 129 files passed; 4358 passed, 1 skipped (`<scratch>/r2/unit.log`).
- `env -u CF_PAGES pnpm docs:build` → exit 0; `grep -rl __WXL_SHORT_LINKS__ .vitepress/dist | wc -l` → `0`.
- `CI=1 pnpm test:smoke` → 52 passed (48 before, plus the 4 collapsed cases; `<scratch>/r2/smoke.log`).
  Before and after, `lsof -tnP -iTCP:4173 -sTCP:LISTEN` printed nothing.
- `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts`
  → 2 files passed; 1992 passed, 1 skipped.
- `git diff a54e917 -- .vitepress/theme/i18n/messages/ | wc -l` → `0`; the three F01 `grep -c` each → `1`.
- `pnpm exec vue-tsc --noEmit -p .` → 105 errors, the same set as round 1's head
  (`diff <(grep "error TS" <scratch>/tsc-head.txt | sort) <(grep "error TS" <scratch>/r2/tsc.txt | sort)`
  prints nothing); none is in a file round 2 changed.
- Frontmatter: `status: review`. Still open: V01 (Cloudflare preview) and V02's selection clause (T-0037).

#### Round 3 (2026-10-22)

One residual: round 2 handed T-0037 the `copy_failed` overflow only for the nav's 32 px mobile row.
`<scratch>` is the same directory as in round 2.

| # | Item | Fix | Test that now covers it |
|---|---|---|---|
| R3-1 | The handoff left out the nav's desktop place (row 1, a fixed `h-[40px]`). There `copy_failed` wraps and runs above the nav's top edge at 768, 800 and 1024 wide, in both languages (measurements below). The status is not cut there (`scrollWidth` = `clientWidth`), and S01 and S02 hold | Documentation only, no behaviour change: a bullet added to round 2's "Handed to T-0037" list, the comment above `data-copy-status` in `ShortLinkShare.vue` now names both rows, and a dated note in T-0037's Comments says T-0037 handles the `copy_failed` layout in both nav rows (the spec lets the mobile row grow; for the desktop row it says nothing, so T-0037 decides within S01, S10 and D14) | None added: the message's own layout is T-0037's, and this round changes no behaviour, so there is no new red to see. S01 and S02 stay covered by `expectLayoutHolds` at 768×1024 and 1024×768, `copy_failed` included |

Measured on this worktree's page-mode build (`env -u CF_PAGES pnpm docs:build`) served by
`pnpm docs:preview --port 4527 --strictPort`, with
`node <scratch>/rev2-spec/probe.mjs http://localhost:4527 <scratch>/r3` from the worktree root
(output `<scratch>/r3/probe.log`; it matches `<scratch>/rev2-spec/probe.log` line for line, compared
with `diff <(sed 's/,"offscreen".*//' <scratch>/rev2-spec/probe.log) <(sed 's/,"offscreen".*//' <scratch>/r3/probe.log)`,
which prints nothing; afterwards `lsof -tnP -iTCP:4527 -sTCP:LISTEN` printed nothing). Page
`selected-excerpts`, viewport height 800, clipboard faked to reject. Each cell is the status's height
and lines (24 px line box; the 24 px confirmation sits at top 8 in the 40 px row, so the row starts at
0) and its top edge, a negative top being that many pixels above the nav. `scrollWidth` equals
`clientWidth` and `document.documentElement.scrollWidth` equals the viewport width in every cell:

| Width | English, brief open | English, collapsed | Traditional Chinese, open | Traditional Chinese, collapsed |
|---|---|---|---|---|
| 768 | 72 px, 3 lines, −16 | 96 px, 4 lines, −28 | 48 px, 2 lines, −4 | 72 px, 3 lines, −16 |
| 800 | 72 px, 3 lines, −16 | 72 px, 3 lines, −16 | 48 px, 2 lines, −4 | 72 px, 3 lines, −16 |
| 1024 | 48 px, 2 lines, −4 | 72 px, 3 lines, −16 | 48 px, 2 lines, −4 | 48 px, 2 lines, −4 |

Commands run in this worktree after round 3, and their results:

- `pnpm test --run` → 129 files passed; 4358 passed, 1 skipped (`<scratch>/r3/unit.log`).
- `env -u CF_PAGES pnpm docs:build` → exit 0 (`<scratch>/r3/build.log`);
  `grep -rl __WXL_SHORT_LINKS__ .vitepress/dist | wc -l` → `0`.
- `CI=1 pnpm test:smoke` → 52 passed (`<scratch>/r3/smoke.log`). Before and after,
  `lsof -tnP -iTCP:4173 -sTCP:LISTEN` printed nothing.
- `git diff a54e917 -- .vitepress/theme/i18n/messages/ | wc -l` → `0`.
- Frontmatter: `status: review`. Still open: V01 (Cloudflare preview) and V02's selection clause (T-0037).

### 2026-10-23 — end-to-end V01 (stage 8, Cloudflare preview)

Surface: PR [#39](https://github.com/BrowserLaboratory/wxl-platform/pull/39)'s Cloudflare Pages
preview for `6abec71` (the branch tip after the rebase onto `e5ad839`), opened at its commit URL
`https://0915ba99.wxl-platform.pages.dev` in the desktop app's built-in browser at 1024 wide, plus
`curl` for the redirect statuses. Not covered: other widths, other browsers, real touch input. The
pane's `clipboard-write` permission is `denied`, so a click ends in `short_link.copy_failed`; the
copied value was read by wrapping `navigator.clipboard.writeText` to record its argument before
calling through. The PR's CI: 10 checks passing, none failing.

| Row | Result | Evidence |
|---|---|---|
| V01: the list shows short links whose origin is `SITE_ORIGIN`, both languages | pass | `/challenges` and `/zh-TW/challenges`: the four shown URL texts are `wxl.browserlab.online[/zh]/c/{001,002,008,010}`, each `title` the same with `https://`; `scrollWidth` equals `innerWidth` |
| V01: the list copies them | pass | English row 4 → `https://wxl.browserlab.online/c/010`; Traditional Chinese row 1 → `https://wxl.browserlab.online/zh/c/001` |
| V01: the nav shows and copies them, Browser panel open | pass | `/challenge/selected-excerpts/` and `/zh-TW/challenge/selected-excerpts/`: one shown URL text, `wxl.browserlab.online[/zh]/c/010`, copied as the same with `https://`; one visible copy button; the Browser panel's `iframe[srcdoc]` at 611×616 renders the challenge (screenshots in the session) |
| V01: `/c/NNN` and `/zh/c/NNN` on the preview's host open their challenges | pass | `curl -w '%{http_code} %{redirect_url}'`: `/c/001` → 302 `/challenge/door-is-open/`, `/c/010` → 302 `/challenge/selected-excerpts/`, `/zh/c/001` → 302 `/zh-TW/challenge/door-is-open/`, `/zh/c/010` → 302 `/zh-TW/challenge/selected-excerpts/`. In the browser, `/c/001` and `/zh/c/010` opened the challenge pages with the Browser panel rendering the application |

Stage 8 box ticked: V01 above and V02 (2026-10-21, local). V02's selection clause stays with
T-0037. Frontmatter `status: review` until the PR lands.

### 2026-10-23 — landed (stage 9)

PR [#39](https://github.com/BrowserLaboratory/wxl-platform/pull/39), rebased onto `e5ad839` (T-0030,
#36) with the epic's docs commit `a54e917` dropped (patch-id unchanged), squash-merged into `main`
as `8a8af74` on 2026-10-23, from head `14f9318`. The PR's CI: 10 checks passing, none failing. Stage 8: V02 (local, page mode) and V01 (the PR's Cloudflare preview, short mode) both passed, recorded above. V02's selection clause and the `copy_failed` layout in both nav rows stay with T-0037.
Frontmatter `status: done`.

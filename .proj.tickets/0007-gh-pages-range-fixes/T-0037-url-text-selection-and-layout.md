---
id: T-0037
title: The URL text selects on a click, yields to the title, and keeps six characters
epic: 0007-gh-pages-range-fixes
status: done
blocked_by: [T-0036]
---

## Context

The URL text is how a teacher copies by hand when the copy button fails. In the list it sits inside
the row's anchor, so a click on it opens the challenge instead. Three decisions settle its behaviour:
- D4: a plain primary click selects the whole text and does not navigate. L21: a click with a
  modifier key is left to the browser.
- D7: in the nav, the title keeps priority and the URL text gives up width first.
- D14: the URL text never gets narrower than six `0` characters of its font, including while
  `short_link.copy_failed` shows.

Spec: `spec.en.md` revision 3, "The copy control" and "Callers"; `traceability.md` revision 3, D4,
D7, D14, the vocabulary for "shown URL text" and "6ch width", "Each page" and "Each state" of S3.

## Deliverable

On both lists and both `selected-excerpts` pages, at every S3 viewport and state, a plain click on the
URL text selects it without leaving the page, the nav's title is cut only after the URL text reached
its minimum, and the URL text is never narrower than 6ch.

## Acceptance criteria

- [x] L17: a primary click without a modifier has `defaultPrevented` set and does not run the copy handler (AC-8)
- [x] L21: a click with Ctrl, Meta, Shift or Alt is not prevented (AC-8)
- [x] S03: one plain click on the first list row's and the nav's URL text, at rest and while `copy_failed` shows, selects the whole text, page URL unchanged (AC-8)
- [x] S06: a click elsewhere in a list row opens the challenge (AC-8)
- [x] S07: wherever the nav title is cut, the URL text's `clientWidth` ≤ 6ch + 1 px (AC-8)
- [x] S08, upstream-only: at 375×812 the Traditional Chinese `selected-excerpts` nav URL text overflows (AC-8)
- [x] S10: each shown URL text's `clientWidth` ≥ 6ch − 1 px, in every state, including 1024×768 and the completed state (AC-8)
- [x] S01 still holds while `copy_failed` shows at 360 wide (the status text may wrap; the mobile row may grow) (AC-8)
- [x] P5: the comments in `ShortLinkShare`, `ChallengeList` and `MergedNav` that D2, D4, D7 and D14 override describe the new behaviour and both modes (AC-24)
- [x] Stage 8: V02 at 375 wide and 1280×800, challenge pages with their Browser panel open (AC-20)

## 給使用者（zh-TW）

網址文字的互動與版面：
- 直接點一下就選取全文，不會開題目；按著修飾鍵點則交給瀏覽器。
- 導覽列裡標題優先，網址文字先縮。
- 網址文字至少保留 6 個字元寬。複製失敗訊息出現時、題目已完成時，以及 1024 寬時都要成立。

## Comments

### 2026-10-22 — handed over from T-0036

T-0037 must handle the `short_link.copy_failed` layout in both nav rows, not only the mobile one.
T-0036 measured it (its Comments, "fixes after stage 6–8", rounds 2 and 3): on the 32 px mobile row
with the brief collapsed it takes 5–12 lines, runs up to 88 px above the shell's top and has English
`yourself` cut; in the desktop place (row 1, a fixed `h-[40px]`), from 768 to 1024 wide, it wraps to
2–4 lines in English and 2–3 in Traditional Chinese and runs 4–28 px above the nav's top edge. The spec
lets the mobile row grow; for the desktop row it says nothing, so T-0037 decides the layout there within
S01, S10 and D14.

### 2026-10-23 — test plan (stage 5)

Read for this plan: this ticket and its handover note; `spec.en.md` and `traceability.md` revision 3
(decisions D2, D4, D7, D14; seams 0007-S2, S3, S7; the vocabulary for "shown URL text" and "6ch
width"; "Each page" and "Each state"; rows L17, L21, S01, S03, S06–S08, S10, T05, P5, V02); T-0036's
record (test plan, decisions, the coverage report, and "fixes after stage 6–8", rounds 2 and 3); and,
at `707be5f`, `ShortLinkShare.vue`, `ChallengeList.vue`, `MergedNav.vue`,
`tests/unit/components/{ShortLinkShare,ChallengeList,MergedNav}.test.ts`,
`tests/site-smoke/site-smoke.spec.ts`, `playwright.site.config.ts`, the `isUpstreamDecision` function
in `tests/unit/scripts/upstream-guard.test.ts`, and VitePress's router click listener
(`node_modules/vitepress/dist/client/app/router.js` line 110), which ignores a click whose
`defaultPrevented` is set or that carries a modifier key.

**Layout decision for `short_link.copy_failed` in the nav** (T-0037's, within S01, S10 and D14; the
spec decides only the mobile row, "The mobile row may grow taller while a status shows"): in both nav
rows the message is laid out inside the nav, and the row that holds it grows to fit it. The desktop
row 1 therefore stops being a fixed 40 px while the message shows, as the mobile row's 32 px already
may. The message is never cut inside a word, never runs above the nav or out of the shell, never
covers another item of its row, and never takes the URL text below its 6ch width. Not chosen: an
overlay below the control, which would cover the brief or the workspace for as long as the message
stands (it stays until acted on, by design); and a message kept on one line and cut, which is an
instruction nobody can read. The mechanism (for instance the message on a line of its own under the
URL text) is chosen during implementation and recorded under the decisions subsection. The tests
below fix only what a reader sees.

Working names, not fixed by the spec: `data-nav-title` on both nav title spans (a markup-only test
hook; today neither carries an attribute); the upstream decision moved from
`upstream-guard.test.ts` into a shared test module (the matrix allows it: "the implementation may
move it into a shared helper"), imported by `upstream-guard.test.ts` and the smoke spec, so S08 and
T-0039's S6 use one decision; and in the smoke spec, `sixChWidth(el)` (the width of `000000` in a
span given the URL text's computed `font-family`, `font-size`, `font-weight`, `font-style` and
`letter-spacing`, absolutely positioned, appended to `body` and removed after measuring) and
`expectMessageWhole` (T-0036's `expectStatusWhole` without the one-line clauses, plus the nav's box).

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0007-S2 | a plain primary click on the URL text is prevented and does not copy | `tests/unit/components/ShortLinkShare.test.ts`, both modes through the existing mutable `vi.mock` of `linkMode`; the control mounted alone and inside `<a href="#elsewhere">` | L17 — AC-8 | a real `MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })` dispatched on `[data-short-link]` with no modifier: `defaultPrevented` true; the `navigator.clipboard.writeText` spy is not called; `[data-copy-status]` stays empty; inside the anchor `location.href` is unchanged. Short mode (n = 1, en) and page mode (n = 1, `door-is-open`, en; n = 42, `selected-excerpts`, zh-TW) |
| 0007-S2 | a click with a modifier key on the URL text is left to the browser | same file, same mounts, both modes | L21 — AC-8 | `ctrlKey`, `metaKey`, `shiftKey`, `altKey` each alone, and `ctrlKey` + `shiftKey` together: `defaultPrevented` false; `writeText` not called. Supplement beyond the row, from the spec's Further Notes ("A middle click … opens the challenge, as on any link"): a synthetic click with `button: 1` and no modifier is not prevented either |
| 0007-S2 | inside the list's row anchor, the URL text's plain click is prevented, a modifier click is not, and the rest of the row is untouched | `tests/unit/components/ChallengeList.test.ts`, list view, both modes, English (`localeIndex` `root`) and Traditional Chinese (`zh-TW`) lists | L17, L21 — AC-8 (and S06's unit counterpart, a supplement) | on the first `a.ch-list-row`'s `[data-short-link]`: plain button-0 click → `defaultPrevented` true, `writeText` not called; each of the four modifiers → false. A plain click on the same row's title span → `defaultPrevented` false (the row's link still opens). The existing "does not navigate when the copy control is activated" (L18) stays green |
| 0007-S2 | both nav controls behave the same | `tests/unit/components/MergedNav.test.ts`, both modes, en and zh-TW, with the `slug` prop | L17, L21 — AC-8 | each of the two `[data-short-link]` (desktop and mobile places): plain click → prevented, no copy; each modifier → not prevented |
| 0007-S3 | one plain click selects the whole displayed text and leaves the page where it is | `tests/site-smoke/site-smoke.spec.ts`, inside the existing "layout and the HTML as served" cases (same load); `locator.click()` at the URL text's centre, button 0, no modifier; built with `env -u CF_PAGES pnpm docs:build` | S03 — AC-8 | each page (both lists, both `selected-excerpts` pages) × 360×740, 375×812, 768×1024, 1024×768, 1280×800; at rest and while `short_link.copy_failed` shows. List: the first row's URL text, while the failure shows on the longest row (the matrix's status row) and, when that is a different row, also while it shows on the first row itself. Nav: the shown URL text. `getSelection().toString()` equals the whole displayed text, also where `scrollWidth` > `clientWidth` (cut). `location.href` is unchanged after `networkidle`, an init-script counter on `history.pushState` stays 0, and no main-frame `framenavigated` fires |
| 0007-S3 | a click elsewhere in a list row still opens that challenge | same file, a describe of its own | S06 — AC-8 | English and Traditional Chinese lists, the `selected-excerpts` row, at 375×812 and 1280×800: first a plain click on its URL text (no navigation, as S03), then a click on its title → the pathname becomes `/challenge/selected-excerpts/` or `/zh-TW/challenge/selected-excerpts/` and the nav's shown URL text appears. The first click proves the observation in S03 can see a navigation that did not happen |
| 0007-S3 | in the nav the title keeps priority: wherever the title is cut, the URL text is already at its minimum | same file, in the layout cases and in the "mobile nav with the brief collapsed" cases | S07 — AC-8 (D7) | both `selected-excerpts` pages × the five viewports × at rest, copied, copy_failed, completed, completed + copy_failed; and at 360×740, 375×812 with the brief collapsed × at rest, copied, completed, completed + copied, completed + copy_failed. For the shown `[data-nav-title]`, if `scrollWidth` > `clientWidth`, the shown URL text's `clientWidth` ≤ `sixChWidth` + 1. Guard against a vacuous pass: on the English page at 360×740, completed with the brief collapsed (T-0036 measured the title at 0 px there), the title is cut, so the check applies at least once |
| 0007-S3 (upstream-only) | the cut really happens on upstream's origin | same file; `test.skip` with the reason when the shared upstream decision says the tree is not upstream | S08 — AC-8 | the Traditional Chinese `selected-excerpts` page at 375×812, at rest: the shown URL text's `scrollWidth` > `clientWidth`. Decided as `upstream-guard.test.ts` decides today: `GITHUB_REPOSITORY` when set and non-empty, else `package.json`'s repository URL, a Git work tree and no root `range.json`. `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` passes after the move |
| 0007-S3 | the URL text never gets narrower than 6ch | same file, every place `expectLayoutHolds` runs, so every state it covers | S10 — AC-8 (D14) | every shown URL text (every list row, the nav's shown control) on each page × the five viewports × at rest, copied, copy_failed, and on challenge pages completed and completed + copy_failed; plus the collapsed mobile cases above, where T-0036 measured 37 px (360) and 52 px (375) at rest when completed, and 0 px and 14 px while the confirmation shows. `clientWidth` ≥ `sixChWidth` − 1, with 1024×768 and the completed state named in the failure message |
| 0007-S3 | the page still never scrolls sideways while the failure message shows | existing `expectLayoutHolds` (T-0036's S01), unchanged, in the layout and collapsed cases | S01 — AC-8 | `copy_failed` at 360×740, both lists and both challenge pages, brief open and brief collapsed, completed or not: `document.documentElement.scrollWidth` ≤ `innerWidth`. The status may wrap and the row may grow |
| 0007-S3 (the layout decision above, not a matrix row) | while `copy_failed` shows the message can be read, inside the nav, and covers nothing | same file, `expectMessageWhole` and a desktop-row version of T-0036's `expectRowItemsWhole`, called wherever the failure is produced | none numbered; the decision is made within S01, S10 and D14 | both challenge pages × the five viewports, brief open, and collapsed at 360 and 375 (T-0036 measured 5–12 lines, up to 88 px above the shell) and at 768×1024 (4 lines, 28 px above the nav in English); both lists × the five viewports. The message's `scrollWidth` ≤ `clientWidth` (no word cut, any number of lines); its box lies inside the viewport, inside every ancestor whose overflow is not `visible`, and on challenge pages inside `nav.merged-nav`'s box; `elementFromPoint` at its middle hits it. The row's other items (brand, back link, badges, done badge, brief toggle, the right section's controls) lie inside their row, are not cut, and are hit at their own middle. T-0036's `expectStatusWhole` (the confirmation on one line) and `expectRowItemsWhole` stay as they are |
| stage 6 diff check (not automated) | the comments that D2, D4, D7 and D14 override describe the new behaviour and both link modes | `git diff 707be5f -- .vitepress/theme/components/ShortLinkShare.vue .vitepress/theme/components/ChallengeList.vue .vitepress/theme/components/MergedNav.vue` | P5 (row T05) — AC-24 | `ShortLinkShare`: "the text is left alone because selecting it is the fallback path", and the status comment that hands the layout to T-0037; `ChallengeList`: the template comment "Line 3: the short link … has to stay readable and selectable at any width" and `paddedId`'s "the badge and the short link beside it"; `MergedNav`: "Short link: the address a reader is given", the `number` prop's "The short link is built from it", and the mobile row's measured title width comment. Each describes D4, D2, D7, D14 and names both modes. Nothing in P1–P4 or P6–P8 is touched |
| stage 8 (not automated) | page mode on a local build, in a real browser | `env -u CF_PAGES pnpm build`, served by `pnpm docs:preview`, driven with `/agent-browser` or the host's browser tools at 375 wide and 1280×800; challenge pages with their Browser panel open (hard rule 4) | V02 — AC-20 | both lists and both `selected-excerpts` pages: page URLs displayed and copied; at 375 wide a URL that does not fit ends in an ellipsis and its `title` is the whole URL; a click on the URL text selects it without leaving the page (the clause T-0036 left here); the failure message laid out as decided above. V01, V03–V05 are T-0039's run against the whole epic |

Regression gate for every cycle: `pnpm test --run` (baseline on `707be5f`: 130 files, 4414 passed,
1 skipped) and, for the S3 rows, `env -u CF_PAGES pnpm docs:build && CI=1 pnpm test:smoke`, with the
preview port checked free before and after (`lsof -tnP -iTCP:4173 -sTCP:LISTEN`).

Approval: The user approved this test plan in advance on 2026-10-23 with the standing instruction "授權權限，完成到結束" (permission granted; carry it through to the end), given together with "ultracode 先確認是否能夠平行，若有風險都選擇順序，完成 T-0033 T-0034 T-0035 T-0037 T-0038".

### 2026-10-23 — open points resolved (stage 5)

`<scratch>` below is `/private/tmp/claude-501/-Users-phoenix-dev-browserlab-wxl-platform/9d2ad28a-5ecd-41b7-9894-89a8012ae1c4/scratchpad/wf2/T-0037`.

1. **VitePress's router listens in the capture phase.** This is new; the plan did not raise it. The
   plan read the router's listener (`node_modules/vitepress/dist/client/app/router.js`, line 110) as
   one that skips a click whose default is prevented. That is true, but the listener is registered with
   `{ capture: true }` on `window`, so it runs before any listener on the URL text and has already
   called `router.go`. Seen on a build whose handler sat on the element: every list case still failed
   S03 with "the page's URL changed" (`<scratch>/s3-red-1.log`), while the unit tests passed, since
   they have no router. Resolution: the control installs one `click` listener on `window`, in the
   capture phase, when its module is first evaluated. VitePress evaluates the theme's modules
   (`import RawTheme from '@theme/index'`) before `createApp` creates the router, so this listener
   runs first, and the router then skips the click (`e.defaultPrevented`). The unit mounts that
   dispatch a click are attached to `document.body`, so the event reaches `window`.
   The red is reproduced on the current code by mutation OP1 (handler back on the element) under
   "Mutation checks" below.
2. Desktop row: the mechanism is chosen and recorded under decisions below. The failure message takes
   a line of its own in its row, and the row grows to hold it.
3. Room at rest on the mobile row: a contradiction, as predicted. At 8 px gaps the row's minimum was
   342 px of 336 px (English, 360 wide, completed, brief collapsed: badges 58.2 + 38.2, URL text 6ch
   43.3, button 28, done badge 27, toggle 99.3, six gaps 48). The toggle wrapped onto a second line at
   rest (row 64 px, `<scratch>/probe/probe-1.log`). Resolution, keeping every row true without
   growing the row at rest: the mobile row's column gap is 6 px (`gap-x-1.5`), which leaves 330 px of
   336. The row is now 32 px at rest in every measured case (`<scratch>/probe/probe-2.log`, below).
   The probe numbers are for information. Since stage 6 the heights at rest are asserted
   (`expectRowsAtRest`), and mutation MS6 (the 8 px gap back) reproduces the 64 px row.
4. Brief collapsed: kept as planned. S07 and S10 run in the collapsed cases too, through
   `expectLayoutHolds`, and also in a new desktop collapsed case at 768×1024 and 1024×768.
5. S03 rows: both readings are covered. The failure is shown on the longest row and, where that is
   not the first row, also on the first row itself.
6. S07 guard: added. In "the mobile nav with the brief collapsed", the English page at 360×740,
   completed, must have its title cut. It is cut. The width, 6 px of 114, is from
   `<scratch>/probe/probe-2.log` and is for information; the cut itself is the committed guard.
7. Upstream decision: moved into `tests/__helpers__/upstreamDecision.ts` (`isUpstreamDecision`,
   `realUpstreamDecision(root)`). `upstream-guard.test.ts` and the smoke spec import it. T-0039's S6
   should import the same module. `data-nav-title` was added to both nav titles as markup only.
8. Middle click and modifier click in a real browser: not added at S3, as planned. A synthetic
   `button: 1` click is at S2.
9. "The page's URL does not change": the plan's three checks are used. The idle wait is bounded.
   Once, under load, `waitForLoadState('networkidle')` did not settle within the 30 s test timeout
   on the first challenge page (`<scratch>/s3-run2.log`, English `selected-excerpts` at 360). The
   same case passed four times on a rerun (`<scratch>/s3-rep.log`); at review round 2 the rerun was
   repeated on the final build with
   `CI=1 pnpm exec playwright test --config <scratch>/r1/pw.config.ts --repeat-each 4 -g 'layout and the HTML as served English selected-excerpts at 360×740'`
   → `4 passed` (`<scratch>/r2/rep.log`). The wait is now 10 s, falling
   back to 1 s more. That is ample: the router pushes its history entry as soon as it handles the
   click, and S06's first step shows the checks catch a navigation.
10. Stage 8: V02 only, at stage 8, as planned.
11. GLOSSARY.md: no term was added or changed, so it was not edited.
12. The relayed note on auto-merge did not affect this stage. No PR was opened and no ref was changed.

### 2026-10-23 — decisions during implementation (stage 5)

1. **The control lays its parts out in its caller's row.** The root of `ShortLinkShare` is now
   `display: contents`. A box around the URL text cannot pass on both of its sizes at once. The text
   never wraps, so the box's minimum would be the whole URL. Only the row's own flex layout sees the
   URL text's `min-w-[6ch]` (D14) and its full width (`max-w-max`) together. All three callers lay
   the parts out on a flex row that wraps: list line 3 (`gap-x-1`, today's 4 px), the nav's desktop
   left section, and its mobile row. The markup is still one component (D2). Below md, `max-md:hidden`
   still wins over `contents`: S02 finds exactly one shown control on every challenge page.
2. **Title priority (D7)** without shrink ratios. Both nav titles and the URL text start from
   nothing (`basis-0`) and grow up to their full width. The title grows by a factor of 1 000 000,
   the URL text by 1. The URL text's share while the title still has room to grow is therefore under
   a millionth of the free space, so the title is cut only once the URL text sits at 6ch. That is what
   S07 checks. Because both start from nothing, a wrapping row does not break lines at rest. On the
   mobile row, `mr-auto` on the title keeps the other items at the row's end, as `flex-1` did.
3. **`short_link.copy_failed`** takes a line of its own (`order-last basis-full`), as wide as its row
   (list line 3, the desktop left section, the mobile row). It wraps there, and the row grows to hold
   it: row 1 is `min-h-[40px]`, row 2 is `min-h-[32px]`. Measured (below), it is one line in every
   nav case, so row 1 grows to 56 px and row 2 to 56–60 px. A first version let the message share
   line 1 when it fit. Measured, it then took the title's room at 768–1024 wide (English title 3 px
   of 122 at 768). Every planned check still passed (mutation MS2), so `expectTitleKept` was added:
   while the message shows, the title stays as wide as it was before.
4. **The confirmation** keeps T-0036's rule: it stays one line beside the button, and the URL text
   yields for it down to 6ch. Where even that does not fit, the wrapping row moves it, with the items
   after it, onto a second line for the 2 s it shows. This happens only on the mobile row with the
   brief collapsed, in English: at 360, completed or not, and at 375 when completed (row 64 px).
5. **An empty status** is `absolute`. It is out of the row, so it costs no gap, and it stays in the
   page as the live region.
6. Mobile row gap 6 px: see open point 3.

Measured on the final page-mode build (`env -u CF_PAGES pnpm docs:build`), served by
`pnpm docs:preview --port 4639 --strictPort`, with `node <scratch>/probe/probe.mjs http://localhost:4639`
from the worktree root. The output is `<scratch>/probe/probe-2.log`. Afterwards
`lsof -tnP -iTCP:4639 -sTCP:LISTEN` printed nothing. Both `selected-excerpts` pages were measured at
360, 375, 768, 800, 1024 and 1280 wide, completed or not, brief open or collapsed:
- At rest, every nav row is 40 px (row 1) and 32 px (row 2), and every list row is 114 px.
- `copy_failed` is one line, 24 px, in every case. Row 1 is 56 px from 768 up. Row 2 is 56 px with
  the brief open and 60 px collapsed.
- The title keeps its at-rest width while the message shows.
- `document.documentElement.scrollWidth` equals the viewport width throughout.

These measurements are for information, not the verification of any row. `probe.mjs` is a scratch
script, not committed. What a row needs is asserted by the smoke: the heights at rest by
`expectRowsAtRest` (added at stage 6), the message and the items by `expectMessageWhole`,
`expectNavItemsWhole` and `expectTitleKept`.

### 2026-10-23 — red → green log (stage 5)

| Cycle | Seam, rows | Red | Green |
|---|---|---|---|
| 1 | S2, L17 (`ShortLinkShare.test.ts`, 3 mounts × alone/anchor) | 6 failed, `expected false to be true` on `defaultPrevented` (`<scratch>/c1-red.log`); reproduced by mutation U1, whose 14 failures include these 6 | 76 passed (`<scratch>/c1-green.log`); handler first on the element. On the final code `pnpm vitest run tests/unit/components/ShortLinkShare.test.ts` → `76 passed` (`<scratch>/r2/sls-unit.log`) |
| 2 | S2, L21 (same file, 6 click kinds × 3 mounts) | passed at once: nothing prevented a modified click yet. Mutation U2 below | no change |
| 3 | S2, L17, L21, row title (`ChallengeList.test.ts`, both modes × en/zh-TW) | passed at once: cycle 1's handler delivers it. Mutations U1, U2, U4 | no change |
| 4 | S2, L17, L21 (`MergedNav.test.ts`, both modes × en/zh-TW, both controls) | passed at once. Mutation U1 | no change |
| 5 | S3, S03 and S06 (lists) | on the build of `707be5f`: 14 failed, every list case "S03: … the page's URL changed" (`<scratch>/s3-red-base.log`); with the handler on the element, still failing (open point 1, `<scratch>/s3-red-1.log`). Reproduced at stage 6: BASE (the three components as at `707be5f`, 4 S06 cases failed on S03's click), MSU1 (the `window` listener removed, 14 failed) and OP1 (the handler on the element, 14 failed) | handler moved to a `window` capture listener; the unit mounts attached; S03 and S06 pass (`<scratch>/s3-run3.log`, after the S06 locator and idle-wait fixes of open point 9). On the final code: `CI=1 pnpm exec playwright test --config <scratch>/r1/pw.config.ts -g "$ALL"` (`$ALL` under "Mutation checks") → `33 passed` (`<scratch>/r2/all.log`), and `CI=1 pnpm test:smoke` → `61 passed`, which adds S06 and S08 |
| 6 | S3, S07 (both challenge pages, every viewport and state) | reproducible red: mutation MS3 (both titles shrinking again, as at `707be5f`, on the final code) → 6 failed on S07, the English and Traditional Chinese pages at 360 and 375, e.g. "S07: the title is cut (114 > 94) while the URL text is 94 px, over its 6ch width 43.4 px + 1, on English selected-excerpts (360×740, at rest)" (`<scratch>/r1/MS3.log`). Historical, not reproducible by any command here: on the cycle-5 build, where the URL text still grew without `basis-0` and had no `min-w-[6ch]` yet, 16 S07 test cases failed, at 768 and 1024 too (`<scratch>/s3-red-1.log`). The final code's URL text already gives way, so restoring only the titles fails fewer cases | decision 2; S07 passes (`<scratch>/s3-run3.log`, 33 passed). On the final code, the `$ALL` run of cycle 5 → `33 passed` |
| 7 | S3, S10 | passed once decision 2 landed (S10 needs the same `min-w-[6ch]`). Mutation MS1 | no change |
| 8 | S3, the `copy_failed` layout (`expectMessageWhole`, `expectNavItemsWhole`) | T-0036's measurements (5–12 lines, up to 88 px above the shell); here, mutation MS5 | decision 3 |
| 9 | S3, the title keeps its room (`expectTitleKept`) | mutation MS2 passed every earlier check, so this test was added; MS2b shows it red | decision 3 (`basis-full`); 33 passed (`<scratch>/s3-run4.log`). On the final code, the `$ALL` run of cycle 5 → `33 passed` |
| 10 | S3, S08 (upstream-only) | passed at once: on upstream's origin the URL text is already cut at 375. Mutation MS4 | no change |
| 11 | S3, S01 | T-0036's `expectLayoutHolds`, unchanged, passed throughout | no change |

#### Mutation checks

Every mutation below was rerun at stage 6 (2026-10-23) with the commands given here, from the
worktree root. The mutations stage 5 ran gave the same counts again, so the tables give one result;
MSU1, OP1, BASE, MS6a, MS6, MS7a and MS7 are new at stage 6. `<scratch>/r1/mut.sh`
applies each `perl -0pi -e` edit, then runs either the three component unit files or a page-mode
build and the smoke cases whose title matches the grep, and finally restores each file from its copy
and checks it with `cmp`. Every run printed `restored` for every file it edited, and
`git status --short` afterwards listed only this ticket's changes. The script:

```zsh
#!/bin/zsh
# Usage, from the worktree root: mut.sh <id> unit|<smoke-grep> <file> <perl-expr> [<file> <perl-expr> ...]
# Applies each perl -0pi edit, runs the three component unit files or builds and runs the smoke
# cases whose title matches <smoke-grep>, then restores every file and checks it with cmp.
S=${0:a:h}
id=$1; g=$2; shift 2
files=()
while (( $# >= 2 )); do
  f=$1; e=$2; shift 2
  cp -p $f $S/$id.$#.bak; files+=("$f:$S/$id.$#.bak")
  perl -0pi -e "$e" $f
  cmp -s $f $S/$id.$#.bak && echo "$id: $f did not change"
done
if [[ $g == unit ]]; then
  pnpm vitest run tests/unit/components/ShortLinkShare.test.ts tests/unit/components/ChallengeList.test.ts tests/unit/components/MergedNav.test.ts > $S/$id.log 2>&1
  echo "$id: $(grep -E '^ +Tests ' $S/$id.log)"
  grep -E '^ (FAIL|×) ' $S/$id.log | sed -E 's/ [0-9]+ms$//' | cut -c1-140 | sort | uniq -c | head -12
else
  env -u CF_PAGES pnpm docs:build > $S/$id-build.log 2>&1 || echo "$id: build failed"
  CI=1 pnpm exec playwright test --config $S/pw.config.ts -g "$g" > $S/$id.log 2>&1
  echo "$id: $(grep -E '^ +[0-9]+ (passed|failed|skipped|flaky)' $S/$id.log | tr -s ' ' | tr '\n' ' ')"
  grep -E '^ +Error: ' $S/$id.log | sed -E 's/ \(.*//; s/: \{.*//' | cut -c1-110 | sort | uniq -c | sort -rn | head -8
fi
for p in $files; do cp -p ${p#*:} ${p%%:*}; cmp ${p%%:*} ${p#*:} && echo "$id: ${p%%:*} restored"; done
```

`<scratch>/r1/pw.config.ts` is `playwright.site.config.ts` serving on port 4637, so that it does not
meet another worktree's preview on 4173. It was made with
`sed -e "s|testDir: 'tests/site-smoke'|testDir: '$PWD/tests/site-smoke'|" -e 's|localhost:4173|localhost:4637|g' -e "s|command: 'pnpm docs:preview',|command: 'pnpm docs:preview --port 4637 --strictPort', cwd: '$PWD',|" playwright.site.config.ts > <scratch>/r1/pw.config.ts`,
which is byte for byte the stage 5 `<scratch>/pw.config.ts` (`diff` printed nothing). On that port the
six "what is copied (S05, N07)" cases fail, since they grant clipboard access to
`http://localhost:4173` only, so the greps leave them out. Logs: `<scratch>/r1/<id>.log`.

Unit, with `M=<scratch>/r1/mut.sh` and `F=.vitepress/theme/components/ShortLinkShare.vue`:

```zsh
$M U1 unit $F 's/^  window\.addEventListener\(.click., selectUrlText, \{ capture: true \}\)\n//m'
$M U2 unit $F 's/^  if \(event\.button !== 0 [^\n]*\n//m'
$M U3 unit $F 's/event\.button !== 0 \|\| //'
$M U4 unit $F 's/closest\(.\[data-short-link\].\)/closest("a, [data-short-link]")/'
$M UC unit .vitepress/theme/components/ChallengeList.vue 's/(\n( +):href="withBase\(c\.url\)"\n +class="ch-list-row no-underline")/$1\n$2\@click.prevent/'
```

| Id | Mutation | Result |
|---|---|---|
| U1 | the `window.addEventListener('click', selectUrlText, …)` line removed | `Tests  14 failed \| 178 passed (192)`: ShortLinkShare L17 (6), ChallengeList L17 (4), MergedNav (4) |
| U2 | the modifier and button guard removed | `26 failed \| 166 passed`: ShortLinkShare L21 (18), ChallengeList L21 (4), MergedNav (4) |
| U3 | `event.button !== 0 \|\|` removed | `3 failed \| 189 passed`: ShortLinkShare's `button: 1` cases |
| U4 | `closest('[data-short-link]')` widened to `closest("a, [data-short-link]")` | `4 failed \| 188 passed`: the row-title cases |
| UC | `@click.prevent` added to the list's row anchor (`ChallengeList.vue`) | `8 failed \| 184 passed`: the row-title cases and L21 |

Smoke, `<scratch>/r1/run-smoke-muts.sh` (each run builds with `env -u CF_PAGES pnpm docs:build`; the
final build was rebuilt afterwards, exit 0). Its mutation lines, with `M` as above:

```zsh
SLS=.vitepress/theme/components/ShortLinkShare.vue; NAV=.vitepress/theme/components/MergedNav.vue; SPEC=tests/site-smoke/site-smoke.spec.ts
ALL='copy control in page mode: (layout|the mobile nav|the desktop nav|the rest of a list|the Traditional Chinese nav)'
LISTS='layout and the HTML as served.*list at|S06'
$M MSU1 "$LISTS" $SLS 's/^  window\.addEventListener\(.click., selectUrlText, \{ capture: true \}\)\n//m'
$M OP1 "$LISTS" $SLS 's/^  window\.addEventListener\(.click., selectUrlText, \{ capture: true \}\)\n//m; s/(\n( +)data-short-link\n)/$1$2\@click="selectUrlText"\n/'
$M MS1 "$ALL" $SLS 's/min-w-\[6ch\]/min-w-0/'
$M MS2 "$ALL" $SLS "s/'order-last basis-full min-w-0 whitespace-normal'/'min-w-0 whitespace-normal'/" $SPEC 's/^ *(if \(target\.challenge\) )?await expectTitleKept\(.*\n//mg'
$M MS2b "$ALL" $SLS "s/'order-last basis-full min-w-0 whitespace-normal'/'min-w-0 whitespace-normal'/"
$M MS3 "$ALL" $NAV 's/basis-0 grow-\[1000000\] min-w-0 max-w-max mr-auto/min-w-0 flex-1/; s/basis-0 grow-\[1000000\] min-w-0 max-w-max/min-w-0/'
$M MS4 "S08" $SLS 's/min-w-\[6ch\]/min-w-max/'
$M MS5 "$ALL" $NAV 's/min-h-\[40px\]/h-[40px]/; s/min-h-\[32px\]/h-[32px]/'
$M MS6a "$ALL" $NAV 's/gap-x-1\.5/gap-x-2/' $SPEC 's/^ *await expectRowsAtRest\(.*\n//mg'
$M MS6 "$ALL" $NAV 's/gap-x-1\.5/gap-x-2/'
$M MS7a "$ALL" $SLS 's/block basis-0 grow min-w/block grow min-w/' $SPEC 's/^ *await expectRowsAtRest\(.*\n//mg'
$M MS7 "$ALL" $SLS 's/block basis-0 grow min-w/block grow min-w/'
```

BASE puts back the three components as at `707be5f` with this spec, builds, and runs only S06,
whose first step is S03's plain click on a list row's URL text; then it restores them:

```zsh
for f in $SLS $NAV .vitepress/theme/components/ChallengeList.vue; do cp -p $f $S/BASE.${f:t}.bak; git show 707be5f:$f > $f; done
env -u CF_PAGES pnpm docs:build > $S/BASE-build.log 2>&1 || echo "BASE: build failed"
CI=1 pnpm exec playwright test --config $S/pw.config.ts -g 'S06' > $S/BASE.log 2>&1
for f in $SLS $NAV .vitepress/theme/components/ChallengeList.vue; do cp -p $S/BASE.${f:t}.bak $f; cmp $f $S/BASE.${f:t}.bak && echo "BASE: $f restored"; done
env -u CF_PAGES pnpm docs:build > $S/rebuild.log 2>&1; echo "rebuild $?"
```

(`$S` is `<scratch>/r1`, `$SLS` and `$NAV` as above; the restore loop copies each file back and checks it with `cmp`.)

| Id | Mutation | Result |
|---|---|---|
| BASE | the three components as at `707be5f` (cycle 5's red) | 4 failed of 4: "S03: the selected-excerpts row on … list: the page's URL changed" |
| MSU1 | the `window` listener removed (as U1) | 14 failed of 14 list cases: "S03: … the page's URL changed" |
| OP1 | the `window` listener removed and `@click="selectUrlText"` put on the URL text (open point 1) | 14 failed of 14, the same message: the router navigates before an element listener runs |
| MS1 | URL text `min-w-[6ch]` → `min-w-0` | 5 failed, 28 passed: S10 on both challenge pages |
| MS2 | the failure message without `order-last basis-full`, and the spec's `expectTitleKept` calls removed (the spec without cycle 9's check) | 33 passed |
| MS2b | the same component edit with the whole spec | 5 failed, 28 passed: "the copy_failed message took the title's room" |
| MS3 | both nav titles back to shrinking (`min-w-0`, and `min-w-0 flex-1` on the mobile row) | 6 failed, 27 passed: S07 |
| MS4 | URL text `min-w-max` (never cut) | 1 failed: S08 |
| MS5 | nav rows back to a fixed `h-[40px]` / `h-[32px]` | 18 failed, 15 passed: 16 "copy_failed message …" (out of the nav or covered), 2 brief toggle spills |
| MS6a | the mobile row's gap back to 8 px (`gap-x-2`), and the spec's `expectRowsAtRest` calls removed | 33 passed: before stage 6, nothing saw the row wrap at rest |
| MS6 | the same gap with the whole spec | 1 failed, 32 passed: "the mobile row grew past its 32 px on English selected-excerpts (completed, brief collapsed): {"row1":40,"mobileRow":64}" at 360×740 |
| MS7a | the URL text without `basis-0`, and the `expectRowsAtRest` calls removed | 5 failed, 28 passed: S07 on the challenge pages; every list case passed |
| MS7 | the same with the whole spec | 18 failed, 15 passed: also "the button wrapped below …" on both lists at 360 and 375, and "row 1 grew past its 40 px" / "the mobile row grew past its 32 px" in the nav |

### 2026-10-23 — coverage report (stage 5)

No coverage provider is installed (`node_modules/@vitest/` does not exist, and `package.json`
configures none), so none was installed. Coverage below is mapped row by row, not measured. The
mutation table above shows each test can fail.

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0007-S2 | `ShortLinkShare.test.ts` › "URL text clicks in %s mode" (short n = 1 en; page n = 1 `door-is-open` en; page n = 42 `selected-excerpts` zh-TW) × alone / in `<a href="#elsewhere">`: plain click (6) | not measured (no provider); branch: guard false, `closest` hit, `preventDefault` | L17 — AC-8 | — |
| 0007-S2 | same › Ctrl, Meta, Shift, Alt, Ctrl+Shift, `button: 1` (18) | not measured; branch: guard true | L21 — AC-8 | a real middle click (`auxclick`) and real touch input: not observable in happy-dom, and S3 has no row for them (open point 8) |
| 0007-S2 | `ChallengeList.test.ts` › "URL text clicks in %s mode": plain, four modifiers, row title (12) | not measured; branch: `closest` miss (title) | L17, L21 — AC-8; S06's unit counterpart | — |
| 0007-S2 | `MergedNav.test.ts` › "URL text clicks in %s mode" (4), both controls | not measured | L17, L21 — AC-8 | — |
| 0007-S3 | `site-smoke.spec.ts` › "layout and the HTML as served" (20): `expectClickSelects` at rest and with `copy_failed`, lists also with the failure on the first row | not measured (browser) | S03 — AC-8 | — |
| 0007-S3 | › "the rest of a list row opens the challenge (S06)" (4); the title is clicked through `[data-row-title]` (stage 6) | not measured | S06 — AC-8 | — |
| 0007-S3 | `expectLayoutHolds` (S07 part) in the layout, mobile collapsed and desktop collapsed cases; guard `navTitleIsCut` at 360 en | not measured | S07 — AC-8 | — |
| 0007-S3 | › "the Traditional Chinese nav URL text is cut at 375×812 (S08, upstream-only)" (1), `test.skip` off upstream | not measured; ran here (upstream decision true) | S08 — AC-8 | the skip branch itself is not exercised here; the decision's range inputs are covered by `upstream-guard.test.ts` |
| 0007-S3 | `expectLayoutHolds` (S10 part), every shown URL text in every state, failure message naming viewport and state | not measured | S10 — AC-8 | — |
| 0007-S3 | `expectLayoutHolds` (S01), unchanged | not measured | S01 — AC-8 | — |
| 0007-S3 | `expectMessageWhole`, `expectNavItemsWhole`, `expectTitleKept` wherever the failure shows; new "the desktop nav with the brief collapsed" (4); `expectRowsAtRest` (stage 6) at rest and while the confirmation shows: row 1 40 px, the mobile row 32 px at rest, each list row's URL text and button on one line | not measured | none numbered (the layout decision) | the mobile row's height while a status shows is not bounded: the spec lets it grow. List rows are checked at rest only |
| upstream decision | `upstream-guard.test.ts` › "upstream decision" (unchanged cases, importing the moved function) | not measured | T65–T66 (regression) | — |
| stage 6 | P5 comments rewritten in `ShortLinkShare.vue`, `ChallengeList.vue`, `MergedNav.vue` | diff check at stage 6 | P5 (T05) — AC-24 | stage 6 confirms them |
| stage 8 | none | — | V02 — AC-20 | stage 8 |

Commands and results, in `/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0037`:

- `pnpm test --run` → `Test Files  130 passed (130)`, `Tests  4454 passed | 1 skipped (4455)`. Rerun after the last test edit (a type cast in `ShortLinkShare.test.ts`): the same counts
  (`<scratch>/final-unit-2.log`). `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` → `44 passed`. The
  baseline on `707be5f` was 4414 passed; the 40 new cases are ShortLinkShare 24, ChallengeList 12 and
  MergedNav 4. Log: `<scratch>/final-unit.log`.
- `env -u CF_PAGES pnpm docs:build` → exit 0; `grep -rl __WXL_SHORT_LINKS__ .vitepress/dist | wc -l` → `0`.
- `CI=1 pnpm test:smoke` → `61 passed`. That is T-0036's 52, plus 4 desktop collapsed cases, 4 S06
  cases and S08 (`<scratch>/final-smoke.log`). Before and after, `lsof -tnP -iTCP:4173 -sTCP:LISTEN`
  printed nothing.
- `git diff 707be5f -- .vitepress/theme/i18n/messages/ | wc -l` → `0`.
- `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts`
  → 2 files passed, `1992 passed | 1 skipped (1993)`. The fork:init anchors were not touched, but
  `upstream-guard.test.ts` was.
- `pnpm exec vue-tsc --noEmit -p .` → 106 errors at head and 106 at `707be5f`. The base count was
  taken with the base versions of the changed files put back in place and restored afterwards. The
  two sets are equal once line numbers are removed:
  `diff <(grep "error TS" <scratch>/tsc-base.txt | sed -E 's/\([0-9]+,[0-9]+\)//' | sort) <(grep "error TS" <scratch>/tsc-head.txt | sed -E 's/\([0-9]+,[0-9]+\)//' | sort)`
  prints nothing.
- Short mode keeps its behaviour. The short-mode unit cases (L17 and L21 included) pass. In a built
  site, short mode is V01, which T-0039 runs; since D4 also applies in short mode, V01 should include
  a click on the URL text.

Ticked: L17, L21, S03, S06, S07, S08, S10 and S01, each by the tests and runs above. P5 waits for
stage 6's diff check, and V02 for stage 8. Frontmatter: `status: review`.

### 2026-10-23 — code review (stage 6)

Three axes (Standards, Spec, Security). Each candidate went to independent skeptics: a medium or
high one is confirmed when two of three agree it is real, a low one when its one skeptic does.

Confirmed and acted on:

| # | Axis | Finding | Verdict | What was done |
|---|---|---|---|---|
| C1 | Spec (medium) | Nothing observed that the rows do not wrap or grow at rest: every row is now a wrapping flex row with a `min-h`, so an item pushed onto a second line stays inside a taller row and passes every box check | 3/3 real | Added `expectRowsAtRest` to the smoke spec. At rest (layout cases at rest and completed; mobile collapsed at rest and completed; desktop collapsed at rest) row 1 is 40 px, the mobile row 32 px, and on the lists each row's URL text and button share one line. While the confirmation shows, row 1 is still 40 px; the mobile row is exempt, as the spec allows. The implementation was already right, so it passed on its first run (61 passed, below). Mutations show it can fail where nothing else did: MS6a / MS6 (the 8 px gap of open point 3: 33 passed without it, 1 failed with it, `{"row1":40,"mobileRow":64}`) and MS7a / MS7 (the URL text without `basis-0`: every list case passed without it, 4 list cases failed with it) |
| C2 | Standards (medium) | Several verification claims had only a scratch log: the red cells of cycles 1, 5 and 6, open point 1's element-handler build, the mutations' edits, the scratch config, the probe numbers | 3/3 real | Every mutation was rerun with the commands now written out under "Mutation checks": the driver script itself, each `perl -0pi -e` expression, the config's `sed` command, and the BASE commands. Cycle 1's red is U1; cycle 5's is BASE, MSU1 and OP1; cycle 6's is MS3; open point 1 is OP1. Every mutation stage 5 ran gave the same count again. The probe numbers (decisions, open points 3 and 6) are now marked for information, and the heights at rest they stood in for are asserted (C1) |
| C3 | Spec (low) | Red and green cells cite `<scratch>` logs without the command that made them | 1/1 real | Done with C2 for the red cells and the mutations. The green cells and open point 9's rerun were still without a command; review round 2 (R2-5) added them |
| C4 | Standards (low) | S06 clicked the row title through the UnoCSS class `.font-medium` | 1/1 real | The row title span in `ChallengeList.vue` carries `data-row-title`, a markup-only test hook like `data-nav-title`, and S06 clicks `row.locator('[data-row-title]')`. No unit test changed: the row-title cases find the span by its text |
| C5 | Standards (low) | The `__wxlPushStates` read and its cast were repeated four times | 1/1 real | Extracted `pushStates(page)` next to `waitForHydration`. The counter in the init script stays where it is, since it runs in the page |

Rejected by the skeptics, recorded and not acted on (0 of n real unless stated):

- Standards: L21's `expect(event.button).toBe(init.button ?? 0)` is tautological (1/3). Rejected: it checks the fixture, not the component; L21's behaviour is asserted by `defaultPrevented` and `writeText`, and U3 shows those fail.
- Standards: two test comments describe the listener as on the URL text (0/1). Rejected: they state only the order, which is right for a `window` capture listener, and the next comment says it listens on `window`.
- Standards: `expectClickSelects` waits for `networkidle` and swallows its timeout (0/3). Rejected: the router calls `pushState` within a microtask of the click and Playwright's `click()` waits for a navigation it starts, so the checks do not depend on the wait; the approved plan names `networkidle`; no documented rule forbids it.
- Standards: the listener is a module side effect coupled to load order (0/3). Rejected: VitePress creates its router before `enhanceApp`, so evaluation time is the only place that runs first; two eager import paths load the module; the comment at `ShortLinkShare.vue` lines 8–13 records it; S03 fails if it breaks (MSU1).
- Standards: `display: contents` spreads the layout over three callers (0/1). Rejected: each caller's comment states the contract, their gaps differ on purpose, and D2 holds.
- Standards: `expectNavItemsWhole` duplicates `expectRowItemsWhole` (0/1). Rejected: the approved plan asks for a desktop version and keeps T-0036's helper as it is; they differ in the sections, the hit check and the toggle assertion.
- Standards: `expectNavItemsWhole` infers the sections from the DOM (0/1). Rejected: T-0036's landed helper uses the same derivation, and it still guards `items.length > 0`.
- Standards: `navTitleWidth` and `navTitleIsCut` destructure without a length check (0/1). Rejected: every call follows `expectLayoutHolds` in the same state, which asserts exactly one title.
- Standards: `expectLayoutHolds` reassigns its `state` parameter (0/1). Rejected: no lint rule or documented style forbids it, and every later use wants the extended value.
- Standards: S08 roots the upstream decision at `process.cwd()` (0/1). Rejected: the documented entry runs at the package root, CI decides by `GITHUB_REPOSITORY`, and elsewhere it skips; see stage 7, S-3.
- Standards: `upstreamDecision.ts` exports three helpers no one imports (0/1). Rejected: they were moved, not invented, and no rule requires a test helper to hide them.
- Standards: the new `MergedNav` test unmounts outside `finally` (0/1). Rejected: nothing else in the file is attached to `document`, so a leftover cannot change another test.
- Standards: the "never labelled" comment lost its measurement (0/1). Rejected: the old numbers described the old layout; P5 asks for D4, D2, D7, D14 and both modes, which it gives.
- Standards: a comment still says "this 32px row" (0/1). Rejected: it tells why the toggle does not shrink, and the row is 32 px at rest; C1 now asserts that.
- Standards: a blank line before `</script>` (0/1). Rejected: no formatter or documented rule.
- Standards: the status class is a nested ternary (0/1). Rejected: three exclusive states, each described in the template comment above it.
- Standards: `INSTALLED` and `__wxlUrlTextClick` are unclear names (0/1). Rejected: used within three lines under a comment, in the style of the repository's other `__wxl` globals.
- Standards: product code selects by the `data-short-link` "test hook" (0/1). Rejected: the spec defines the URL text by that attribute, and T-0036's review kept the name.
- Standards: a product comment cites the row id L21 (0/1). Rejected: the spec cites L21 for D4's limit, and the rule is written out before it.
- Standards: the unit mutation logs `mut-M1…4` do not match the ids U1–U4 (0/1). Rejected: one to one, with matching counts; the rerun's logs are now named by id (`<scratch>/r1/U1.log` …).
- Standards: the test plan was approved in advance, and the added tests were not re-approved (0/3). Rejected: no documented rule requires approval table by table (T-0030, T-0031, T-0032 and T-0036 decided the same); the tdd skill re-asks only when a seam changes, and none did.
- Standards: the record keeps a relayed note on auto-merge (0/1). Rejected: no rule keeps conversation out of a record, and the note records that no PR or ref was touched.
- Standards: several tests never saw red without this change (0/1). Rejected: L17 and S07 did (BASE, MS3); L21, S08 and S01 hold on the base by nature, the record says so, and U2, U3, MS4 show they can fail.
- Standards: L17's "alone" host also asserts `location.href` (0/1). Rejected: it watches an independent outcome that S03 requires in the nav; it is not computed by the implementation.
- Spec: S03's "including any part cut from view" has no guard against a vacuous pass (0/1). Rejected: S08 asserts the cut on the same page, width and state upstream, and the matrix accepts that a range's shorter origin may not cut.
- Spec: the 6ch probe copies only five font properties (0/1). Rejected: no stylesheet sets another font property on the URL text or its ancestors, and the probe inherits the same values from `body`.
- Spec: the JS selection path may pass only through CSS `select-all` (0/1). Rejected: S03 asserts the outcome the spec names, and touch and WebKit are out of scope.
- Spec: D4 depends on VitePress's evaluation order (0/1). Rejected: documented in the component, and S03 fails if it changes (MSU1, OP1).
- Spec: S03's "URL unchanged" has a time bound (0/1). Rejected: a full navigation is requested during `click()`, which waits for it to commit, and the router path is counted by `pushState`.
- Spec: traceability's description of where the upstream decision lives is stale (0/1). Rejected: the matrix allows the move, the function keeps its name, and open point 7 records the new path.
- Spec: the comment at the top of `ChallengeList` speaks only of short mode (0/1). Rejected: unchanged by this ticket, true in both modes, and not in P5's list (T-0036's review decided the same).
- Security: four candidates, all rejected; see stage 7 below.

Stage 6 check that closes a criterion:

- P5 (row T05, AC-24): `git diff 707be5f -- .vitepress/theme/components/ShortLinkShare.vue .vitepress/theme/components/ChallengeList.vue .vitepress/theme/components/MergedNav.vue`. Each passage the plan lists is rewritten: for each of "selecting it is the fallback path", "T-0037" (the status comment's hand-over), "has to stay readable and selectable at any width", "the badge and the short link beside it", "Short link: the address a reader is given" and "The short link is built from it", `git show 707be5f:<file> | tr '\n' ' ' | tr -s ' ' | grep -c "<phrase>"` prints `1` and `tr '\n' ' ' < <file> | tr -s ' ' | grep -c "<phrase>"` prints `0` in its file. (Corrected at review round 2, R2-3: the first version of this check grepped line by line, and the `ChallengeList` sentence had only moved across a line break; it was rewritten then.) The new text names D4, D2, D7 and D14 and both link modes (the Cloudflare Pages build's short link, every other build's page URL), and the mobile row's measured title width comment gives the page-mode measurement. No other file of P1–P4 or P6–P8 is in the diff. P5 is ticked.

Commands rerun at stages 6 and 7, in `/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0037`:

- The unit and smoke mutations, with their commands and results, under "Mutation checks".
- `pnpm vitest run tests/unit/components/ShortLinkShare.test.ts tests/unit/components/ChallengeList.test.ts tests/unit/components/MergedNav.test.ts` → 3 files, 192 passed.
- `pnpm test --run` → `Test Files  130 passed (130)`, `Tests  4454 passed | 1 skipped (4455)` (`<scratch>/r1/g-unit.log`). The same counts as stage 5: stage 6 added assertions to the smoke, no unit case.
- `env -u CF_PAGES pnpm docs:build` → exit 0; `grep -rl __WXL_SHORT_LINKS__ .vitepress/dist | wc -l` → `0`.
- `CI=1 pnpm test:smoke` → `61 passed` (`<scratch>/r1/g-smoke.log`). `lsof -tnP -iTCP:4173 -sTCP:LISTEN` printed nothing before and after.
- `git diff 707be5f -- .vitepress/theme/i18n/messages/ | wc -l` → `0`.
- `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts` → 2 files passed, `1992 passed | 1 skipped (1993)`. The fork:init anchors were not touched.
- `pnpm exec vue-tsc --noEmit -p .` → 106 errors, the same set as `707be5f`: `diff <(grep "error TS" <scratch>/tsc-base.txt | sed -E 's/\([0-9]+,[0-9]+\)//' | sort) <(grep "error TS" <scratch>/r1/tsc-r1.txt | sed -E 's/\([0-9]+,[0-9]+\)//' | sort)` prints nothing.

GLOSSARY.md: `data-row-title` is a markup-only test hook, not a domain term, so it was not edited.
The relayed note that auto-merge is on did not change this stage: no commit, PR or ref was made.

### 2026-10-23 — security review (stage 7)

Report: [`security-T-0037.md`](../../.proj.specs/0007-gh-pages-range-fixes/review/security-T-0037.md).

| # | Candidate | Verdict | What was done |
|---|---|---|---|
| S-1 | The `window` capture listener acts on any element with `data-short-link`, including one in the notes preview's unsanitised `v-html` (`ShortLinkShare.vue:14-30`; `NoteEditor.vue:71`) | 0/1, rejected | None. Only the viewer can put HTML in their own notes, and whoever can already runs script there; the worst outcome is a selected text. The `v-html` predates this ticket |
| S-2 | The install flag is a non-configurable `window` property that an earlier same-origin script could take, so the listener is not installed (`ShortLinkShare.vue:26-30`) | 0/1, rejected | None. A script that runs first on the origin already controls the page; the worst outcome is the base behaviour |
| S-3 | S08's upstream decision runs `git` and reads `package.json` at `process.cwd()` (`site-smoke.spec.ts:779`; `upstreamDecision.ts:37-65`) | 0/1, rejected | None. Choosing the directory already means choosing the config and the code; off the root the case skips with its reason |
| S-4 | The committed record carries local absolute paths (this ticket: the `<scratch>` definition under "open points resolved (stage 5)", and the worktree path in "Commands and results" under the stage 5 coverage report and in "Commands rerun at stages 6 and 7") | 0/1, rejected | None. The same user name, uid and session id are already committed at `707be5f` (T-0036 line 524, T-0030 line 207) |

No security finding was confirmed, and no change was made for stage 7. Stage 6's changes (a value-less
`data-row-title` attribute and smoke assertions that only read the DOM) were checked for a new attack
surface and add none. The report lists the limits of the review, as the reviewer stated them. It does
not claim the project is secure.

Ticked after stages 6 and 7: P5. Waiting: V02 at stage 8. Frontmatter: `status: review`.

### 2026-10-23 — review round 2 (stages 6 and 7)

The same three axes and the same rule as round 1: a medium or high candidate is confirmed when two
of three skeptics agree it is real, a low one when its one skeptic does. Security candidates and
their dispositions are also in the report (R2-S1 … R2-S4).

Confirmed and acted on:

| # | Axis | Finding | Verdict | What was done |
|---|---|---|---|---|
| R2-1 | Standards (low) | S-4 located the absolute paths by ticket line numbers that stage 6's additions had moved (one now pointed at a mutation command), and the report's scope note said stage 6 changed only `ChallengeList.vue:400` and the smoke spec | 1/1 real | The stage 7 table's S-4 row and the report's S-4 now locate the paths by section name (the `<scratch>` definition under "open points resolved (stage 5)", "Commands and results" and "Commands rerun at stages 6 and 7"); the report gives the `grep` that finds their current lines, and its scope note now lists the ticket record's changes. No uncommitted file is cited by line any more for S-4 |
| R2-2 | Standards (low) | Cycle 6's red said 16 S07 failures, reproduced by MS3, which gives 6, with no word on the difference | 1/1 real | Cycle 6's red now gives MS3's 6 failures and one of its messages as the reproducible red, and marks the 16 as historical: the cycle-5 build's URL text still grew without `basis-0` and had no `min-w-[6ch]`, so restoring only the titles on the final code fails fewer cases |
| R2-3 | Spec (medium) | P5's evidence was wrong: "has to stay readable and selectable at any width" was still in `ChallengeList.vue`, only split across a line break, so the line-by-line `grep -c` printed 0; and "readable … at any width" sat beside "cut with an ellipsis … never narrower than 6ch" | 2/3 real (the third skeptic agreed on the facts, not on the impact) | The line 3 comment in `ChallengeList.vue` was rewritten: it keeps as much of the URL in view as the row allows, stays selectable at any width, is cut with an ellipsis (D2) with the whole URL in its title, never narrower than 6ch (D14), and a plain click selects all of it (D4). The P5 check now joins lines first (`tr '\n' ' ' \| tr -s ' ' \| grep -c`); rerun below, every phrase prints `1` at `707be5f` and `0` now. P5 stays ticked on that evidence |
| R2-4 | Spec (low) | `expectRowsAtRest`'s comment said only the mobile row grows while a status shows, but row 1 grows from md up while `copy_failed` shows (decision 3) | 1/1 real | The comment now says: the mobile row may grow while any status shows, row 1 only while the failure shows and stays 40 px while the confirmation shows, and the helper is never called while the failure shows (`expectMessageWhole`, `expectNavItemsWhole` and `expectRowItemsWhole` check the rows then). Comment only; no assertion changed |
| R2-5 | Spec (low) | C2/C3 were only partly done: the green cells of cycles 1, 5, 6 and 9 and open point 9's rerun still had a log and no command | 1/1 real (the skeptic rejected the sub-claim that "reproduced" overstated cycle 6, since the record gave the 6; R2-2 rewrote the cell anyway) | Each green cell now also gives the command on the final code and its result (`pnpm vitest run tests/unit/components/ShortLinkShare.test.ts` → 76 passed; the `$ALL` run on `<scratch>/r1/pw.config.ts` → 33 passed). Open point 9's rerun was repeated with `--repeat-each 4` and the command written out → 4 passed. C3's row now says what round 1 left |
| R2-6 | Spec (low) | The security report's S-4 line numbers are stale | 1/1 real | Same defect as R2-1, fixed with it |
| R2-7 | Security (low, P2) | S-4's line number in the report and in this ticket's stage 7 table is stale, and the scope note is wrong | 1/1 real | Same defect as R2-1, fixed with it; the report records it as R2-S1. Not an exploitable defect: no trust boundary B1–B5 is involved |

Rejected by the skeptics, recorded and not acted on (0 of n real unless stated):

- Standards: P5's grep does not prove "has to stay readable and selectable at any width" was rewritten (0/1). Rejected: the `git diff` named first carries the claim, and P5 asks what the comment describes. Its facts overlap R2-3, which was confirmed on the Spec axis and fixed.
- Standards: stage 6/7 candidates are dismissed by skeptic vote with no user ruling recorded (0/1). Rejected: `docs/agents/review.md`'s adjudication rule is stage 3's; the security-review skill asks for independent false-positive filtering and keeps rejected candidates with reasons, which this record does; T-0030, T-0031, T-0032 and T-0036 use the same form.
- Standards: the old smoke test names list only S01, S02 (S04) while they also assert S03, S07, S10 (0/1). Rejected: every assertion message carries its row id, the coverage report maps the rows, and no recorded grep filters by those ids.
- Standards: `expectRowsAtRest` and its `statusShows` flag are a mysterious name and a flag argument (0/1). Rejected: a named option, one rule behind all its branches, the list no-op recorded in the coverage report ("List rows are checked at rest only").
- Standards: `expectMessageWhole` duplicates `expectStatusWhole` (0/1). Rejected: the approved plan derives it from that helper and keeps T-0036's as it is; Playwright's `evaluate` callbacks cannot share module code without more indirection.
- Standards: the `__wxlClipboard` cast is repeated after C5 extracted `pushStates` (0/1). Rejected: five of the six writes predate this ticket; changing them is outside its scope.
- Standards: the new `MergedNav` test does not reuse `mountIn` (0/1). Rejected: 15 tests in that file mount directly, the neighbouring N03 tests do the same, and `mountIn` has no `attachTo`.
- Standards: product comments quote measurements from the uncommitted probe (0/1). Rejected: no rule covers product comments, the theme has a dozen such "Measured" comments, and the behaviour they explain is asserted by the smoke.
- Standards: the smoke results do not name their surface (0/1). Rejected: the plan's S03 row and the regression gate name the page-mode build and Playwright's Chromium, V02 at stage 8 is the Browser panel run, and T-0036's landed record writes the stage 6/7 rerun the same way.
- Standards: some wording in the security report may not be Taiwan usage (腳本, 消毒, 目錄配置) (0/1). Rejected: none is in `docs/agents/language.md`'s replacement list, 配置 here means layout, and the spec's zh-TW text and `security-T-0032.md` use 腳本.
- Spec: with the brief open, "completed + copied" runs no S07, S10 or row-height check (0/1). Rejected: the matrix's "Each state" lists four states, not their cross product; the approved plan's state list is what the code runs; the layout cases come from T-0036.
- Spec: the guarantee that nothing wraps at rest has a 6 px margin, measured on macOS fonts only (0/3). Rejected: VitePress ships Inter for the Latin text, the monospace 6ch differs by under 1 px between Menlo and Liberation Mono, the emoji's difference is estimated at a few px, and `expectRowsAtRest` would show a wrap. Follow-up for the PR: confirm the site smoke is green on CI and record it.
- Spec: the list in the copied state does not check that line 3 keeps the confirmation on its line (0/1). Rejected: no requirement bounds a list row while a status shows, and the line's minimum (6ch, button, message, gaps) is far below the card's width at 360.
- Spec: `MergedNav`'s measured numbers come from the uncommitted probe (0/1). Rejected: as the Standards candidate above; the base comment already carried such numbers, and the new one adds the width, page, mode and date.
- Spec: auto-merge is on while V02 at stage 8 is unticked (0/1). Rejected: no PR exists and no ref was changed; stage 8 runs before the merge, and V02 needs only a local build. For the parent: run V02 before the PR can auto-merge.
- Security: the BASE commands overwrite working-tree files with `git show` (0/1). Rejected: see the report, R2-S2.
- Security: `mut.sh` has no `trap` and does not check its backup (0/1). Rejected: see the report, R2-S3.
- Security: the `sed` that writes the Playwright config puts an unescaped `$PWD` in a TypeScript string (0/1). Rejected: see the report, R2-S4.

Commands rerun at review round 2, in the worktree named under "Commands and results" above; logs in
`<scratch>/r2/`:

- `pnpm vitest run tests/unit/components/ShortLinkShare.test.ts` → `76 passed` (`sls-unit.log`).
- `pnpm vitest run tests/unit/components/ShortLinkShare.test.ts tests/unit/components/ChallengeList.test.ts tests/unit/components/MergedNav.test.ts` → 3 files, `192 passed` (`components.log`).
- `pnpm test --run` → `Test Files  130 passed (130)`, `Tests  4454 passed | 1 skipped (4455)` (`g-unit.log`). The same counts as stage 5: round 2 changed comments only.
- `env -u CF_PAGES pnpm docs:build` → exit 0 (`g-build.log`); `grep -rl __WXL_SHORT_LINKS__ .vitepress/dist | wc -l` → `0`.
- `CI=1 pnpm test:smoke` → `61 passed` (`g-smoke.log`). `lsof -tnP -iTCP:4173 -sTCP:LISTEN` printed nothing before and after.
- `CI=1 pnpm exec playwright test --config <scratch>/r1/pw.config.ts -g "$ALL"` → `33 passed` (`all.log`); `CI=1 pnpm exec playwright test --config <scratch>/r1/pw.config.ts --repeat-each 4 -g 'layout and the HTML as served English selected-excerpts at 360×740'` → `4 passed` (`rep.log`). Afterwards `lsof -tnP -iTCP:4637 -sTCP:LISTEN` printed nothing.
- `git diff 707be5f -- .vitepress/theme/i18n/messages/ | wc -l` → `0`.
- `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts` → 2 files passed, `1992 passed | 1 skipped (1993)` (`g-fork.log`). The fork:init anchors were not touched.
- P5, newline-insensitive, for each phrase and its file: `git show 707be5f:<file> | tr '\n' ' ' | tr -s ' ' | grep -c "<phrase>"` → `1` and `tr '\n' ' ' < <file> | tr -s ' ' | grep -c "<phrase>"` → `0`, for all six phrases P5 lists, and also for the shorter "readable and selectable at any width" in `ChallengeList.vue`.
- `grep -n -E '/Users/phoenix|/private/tmp' .proj.tickets/0007-gh-pages-range-fixes/T-0037-url-text-selection-and-layout.md` → four lines: one in each of the three sections S-4 now names, and this command's own line.
- Not rerun: `vue-tsc` and `tests/pre-commit-sh.test.ts`; round 2 changed no executable code (two comments, this record and the report).

Coverage report: no test was added or changed in behaviour (one comment in the smoke spec), so the
stage 5 coverage report stands. GLOSSARY.md: no term changed. The relayed note that auto-merge is on
did not change this round: no commit, PR or ref was made. V02 must still run at stage 8 before the
PR merges. Frontmatter: `status: review`.

### 2026-10-23 — end-to-end (stage 8, local)

Surface: the built site in page mode, as a real browser renders it, with challenge pages' Browser
panel open (hard rule 4). Built in this worktree with `env -u CF_PAGES pnpm docs:build` (exit 0;
`grep -rl __WXL_SHORT_LINKS__ .vitepress/dist | wc -l` → `0`), served with
`pnpm docs:preview --port 4392 --strictPort`, and driven in headless Chrome with the agent-browser
CLI 0.29.1 (`AGENT_BROWSER_SESSION=t0037`). Not covered: short mode and the Cloudflare Pages host
(the parent runs them on the PR's preview), the PR's CI, other browsers, real touch input, and the
viewports 360, 768 and 1024 wide (the site smoke covers those, see the coverage report).

How it was driven. The scripts are in `<scratch>/v02/`, adapted from T-0036's `wf/T-0036/v02/`, and
are not committed:

- The session was opened with `agent-browser --init-script <scratch>/v02/init.js open http://localhost:4392/challenges`.
  `init.js` runs before any page script: it stores the page's own language
  (`localStorage['wxl-locale']`) and `sessionStorage['wxl-session-gate'] = 'decided'`, counts
  `history.pushState` calls (the router's client-side navigations), and wraps
  `navigator.clipboard.writeText` so the driver can refuse it (`window.__wxlClipboard = 'reject'`,
  a `NotAllowedError`, as the site smoke forces `short_link.copy_failed`) or pass it to the real
  clipboard (`'real'`).
- `node <scratch>/v02/grant.mjs "$(agent-browser get cdp-url)" http://localhost:4392`, in the
  background, grants `clipboardReadWrite` over CDP and holds the connection open, so
  `agent-browser clipboard read` can read the copy back.
- `<scratch>/v02/all.sh > <scratch>/v02/v02.log` runs `run.sh <name> <path> <width> <height>` for
  `en-list /challenges`, `zh-list /zh-TW/challenges`, `en-selected-excerpts /challenge/selected-excerpts/`
  and `zh-selected-excerpts /zh-TW/challenge/selected-excerpts/`, each at `375 812` and `1280 800`.
  `run.sh` opens the page and waits for hydration. On a challenge page it also waits for the Browser
  panel's `iframe[srcdoc]`. It runs one phase, and on a challenge page below 768 wide a second phase
  after `agent-browser find role button click --name "◀"`, so the Browser panel takes the width.
  Each phase:
  1. `mark.js` marks the target: the first list row's URL text, copy button and `[data-row-title]`,
     or the nav's shown URL text and copy button.
  2. `measure.js` measures every shown `[data-short-link]`: its text, `title`, `text-overflow`,
     `scrollWidth` and `clientWidth`. Its 6ch width is `000000` in a hidden span set in the URL
     text's computed font, as the smoke's `sixChWidth`. It also measures
     `document.documentElement.scrollWidth` against `innerWidth`, the Browser panel's iframe, the
     shown `[data-nav-title]` and every non-empty status. Then a screenshot.
  3. Plain click: `pre-click.js` clears the selection and stores `location.href`, the push count and
     a token that a full page load would wipe. Then `agent-browser click` on the URL text (a real
     button-0 click at its centre, no modifier), 1.5 s wait, and `post-click.js` compares
     `getSelection().toString()` with the URL text's `textContent`.
  4. Copy: the clipboard is set to `sentinel-before-copy`, the copy button is clicked, and
     `agent-browser clipboard read` is compared with the URL text's `title`. Measure, screenshot.
  5. `copy_failed`: the clipboard is refused, the button is clicked, measure, screenshot, and the
     plain click of step 3 again while the message shows.
  6. The failure is then acted on (a real copy, and a 2.6 s wait for the confirmation to revert), so
     the next phase starts at rest.
  On a list, `run.sh` finally clicks the first row's title and reads the path and the nav's shown
  URL text (`after-title.js`).
- `python3 -I <scratch>/v02/summarize.py <scratch>/v02/v02.log > <scratch>/v02/v02-summary.txt`
  prints one `PASS`/`FAIL` line per check and `FAILURES 0`: 64 `PASS` lines, none failing.

Screenshots: `<scratch>/v02/<page>-<width>x<height>[-panel]-{rest,copied,copy_failed}.png` and,
for the lists, `<page>-<width>x<height>-after-title-click.png` (34 files).

| Row | Surface | Result | Evidence |
|---|---|---|---|
| V02: the lists display page URLs | built site in headless Chrome, English and Traditional Chinese lists, 375×812 and 1280×800 | pass | 4 shown URL texts per list, each `wxl.browserlab.online[/zh-TW]/challenge/<slug>/`, with a `title` that is the same text with `https://` (the summary's `REST` lines). `{en,zh}-list-{375x812,1280x800}-rest.png` |
| V02: the lists copy page URLs | same | pass | After a click on the first row's copy button, the clipboard (sentinel replaced) reads `https://wxl.browserlab.online/challenge/door-is-open/` or `https://wxl.browserlab.online/zh-TW/challenge/door-is-open/`, equal to the URL text's `title`. The status reads `Copied` or `已複製`, and the page stays `/challenges` or `/zh-TW/challenges` (`COPY` lines) |
| V02: the nav displays and copies page URLs, with the Browser panel open | built site in headless Chrome, English and Traditional Chinese `selected-excerpts`, 375×812 (as opened, and with `◀` clicked) and 1280×800 | pass | 1 shown URL text, `wxl.browserlab.online[/zh-TW]/challenge/selected-excerpts/`, whose `title` is the full URL, and the clipboard after a copy holds that URL, in all 6 phases. The Browser panel's `iframe[srcdoc]` is 778×650 at 1280 wide, 73×630 at 375 as opened, and 353×534 once `◀` is clicked; the screenshots show the challenge rendered in it, e.g. `en-selected-excerpts-375x812-panel-copy_failed.png` |
| V02: at 375 wide a URL that does not fit ends in an ellipsis, and its `title` is the whole URL | all four pages at 375×812, every state | pass | Every shown URL text is cut (`scrollWidth` > `clientWidth`) with `text-overflow: ellipsis`, and its `title` is the whole copied URL: list rows 311–405 px in 263 px (221 or 225 px for the row showing `Copied` or `已複製`), the nav 361/405 px in 43–151 px. At 1280 wide nothing is cut |
| S03 (V02's last clause): one plain click on the first list row's and the nav's URL text selects the whole text, page URL unchanged, at rest | all four pages × both sizes, and the 375 challenge pages with `◀` clicked (10 phases) | pass | `getSelection().toString()` equals the URL text's whole `textContent`, also where it is cut (all 375 cases); `location.href` unchanged, 0 `pushState` calls, the page-load token still there (`S03 click … at rest` lines) |
| S03: the same while `copy_failed` shows | same 10 phases, with the failure shown on the clicked control | pass | The same four checks, with the message still shown after the click (`S03 click … while copy_failed shows` lines). `{en,zh}-list-375x812-copy_failed.png` show the row's URL text selected |
| S06: a click elsewhere in the row opens the challenge | both lists × both sizes, the first row's title | pass | The path becomes the row's `href` (`/challenge/door-is-open/` or `/zh-TW/challenge/door-is-open/`), the router pushed 1 entry, and the nav shows that challenge's URL text (`S06` lines, `*-after-title-click.png`). Together with the S03 click before it on the same row, the observation can see a navigation |
| S10: a URL text is never narrower than 6ch | every shown URL text, all four pages × both sizes × at rest, copied, copy_failed, and both 375 challenge phases | pass | 6ch is 43.4 px in every case. The smallest `clientWidth` − 6ch is −0.4 px (43 px, English `selected-excerpts`, 375×812 with `◀` clicked, in every state), within the smoke's tolerance (≥ 6ch − 1). Each measurement line has `allAtLeast6ch` true |
| S07: the nav title is cut only once the URL text is at its minimum | both `selected-excerpts` pages, every phase | pass | The title is cut only on the English page at 375 with `◀` clicked: 54/114 px at rest and with `copy_failed`, 10/114 px while `Copied` shows. The URL text is 43 px there, ≤ 6ch + 1. Elsewhere the title is whole (114, 52, 122, 56 px) |
| No sideways scroll | all four pages × both sizes × every state and phase (30 measurements) | pass | `document.documentElement.scrollWidth` equals `innerWidth` (375 or 1280) in each |
| The `copy_failed` layout decided in stage 5 | same | pass | The message is never cut inside a word (`scrollWidth` = `clientWidth` in all 10). On the nav it is one 24 px line on a line of its own, 351 px at 375 and 1090/1100 px at 1280. The row grows for it, and the Browser panel's iframe gives up 24 px (630 → 606, 534 → 506, 650 → 634). On the lists it is one line, except English at 375 (2 lines, 48 px, 295 px wide). The screenshots show it inside the nav below its row, covering nothing (`*-copy_failed.png`). The box and hit-test checks of `expectMessageWhole` are the smoke's and were not repeated here |

Seen during the run, outside this ticket and already recorded by T-0036: the Traditional Chinese
list's heading `Challenges` and its subtitle are hard-coded English in `ChallengeList.vue` (line 231
for the subtitle), and this ticket's diff does not touch them (`zh-list-375x812-copy_failed.png`).

Cleanup: the preview and `grant.mjs` were stopped, then `AGENT_BROWSER_SESSION=t0037 agent-browser close`.
Afterwards `lsof -tnP -iTCP:4392 -sTCP:LISTEN` printed nothing, and `git -C <repository root> stash list`
was the same as before the run (empty). No throwaway repository or commit was needed, and no ref
was changed.

Stage 8 box ticked: V02, its last clause (S03) included, passed on a local page-mode build.
Still to do, by the parent, on the PR: the CI checks, and the Cloudflare preview in short mode
(V01 is T-0039's row, and the coverage report asks it to include a click on the URL text). Those
are not part of this box. The relayed note that auto-merge is on: once the PR is open it can merge
as soon as its required checks pass, possibly before the parent's preview run. Frontmatter:
`status: review`.

### 2026-10-23 — completeness check

Checked against the checkout, not against the earlier subsections. Commands run in
`/Users/phoenix/dev/browserlab/wxl-platform/.claude/worktrees/T-0037`; logs in `<scratch>/cc/`.

Each ticked criterion and the test that observes it at its seam:

| Row | Seam | Observed by |
|---|---|---|
| L17 | 0007-S2 | `ShortLinkShare.test.ts` "prevents a plain primary click and does not copy, %s (L17)" (`defaultPrevented` true, `writeText` not called, status empty, `location.href` unchanged); `ChallengeList.test.ts` "prevents a plain primary click on the first row's URL text … (L17)"; `MergedNav.test.ts` "prevents a plain click and leaves a modifier click, on both controls" |
| L21 | 0007-S2 | `ShortLinkShare.test.ts` "leaves a click with %s to the browser (L21)" (Ctrl, Meta, Shift, Alt, Ctrl+Shift, `button: 1`); `ChallengeList.test.ts` "leaves a modifier click on the URL text to the row's link … (L21)"; the same `MergedNav.test.ts` case |
| S03 | 0007-S3 | `site-smoke.spec.ts` `expectClickSelects` in "layout and the HTML as served" (4 pages × 5 viewports, at rest and while `copy_failed` shows; lists also with the failure on the first row) |
| S06 | 0007-S3 | `site-smoke.spec.ts` "the rest of a list row opens the challenge (S06)" (both lists, 375×812 and 1280×800) |
| S07 | 0007-S3 | `expectLayoutHolds` (S07 part) in the layout, mobile collapsed and desktop collapsed cases; non-vacuity guard `navTitleIsCut` at 360, English, completed, brief collapsed |
| S08 | 0007-S3 | `site-smoke.spec.ts` "the Traditional Chinese nav URL text is cut at 375×812 (S08, upstream-only)"; ran, not skipped (the smoke log reports 61 passed and no skip) |
| S10 | 0007-S3 | `expectLayoutHolds` (S10 part) for every shown URL text in every state it runs, 1024×768 included, completed and completed + `copy_failed` on challenge pages; the viewport and state are in the failure message |
| S01 | 0007-S3 | `expectLayoutHolds` (S01) while `copy_failed` shows at 360×740 on both lists and both challenge pages (brief open, completed or not) and with the brief collapsed when completed |
| P5 | stage 6 | the newline-insensitive `git diff` / `grep -c` check under "Stage 6 check that closes a criterion" and review round 2 |
| V02 | stage 8 | "end-to-end (stage 8, local)": `<scratch>/v02/v02-summary.txt` has 64 `PASS` lines and `FAILURES 0` (`grep -E '^FAILURES' <scratch>/v02/v02-summary.txt` → `FAILURES 0`); 34 screenshots |

Every ticked box has a test or command; none was unticked.

One deviation from the approved plan, recorded here because the coverage report did not: the plan's
S01 row lists `copy_failed` at 360×740 "brief open and brief collapsed, completed or not". With the
brief collapsed, the mobile collapsed case shows `copy_failed` only in the completed state, so
"brief collapsed, not completed, `copy_failed`" is not exercised. The matrix's S01 ("each page, each
state", where "Each state" lists four states and no brief state) and the ticket's S01 box are still
observed; the completed state is the tighter row (it adds the done badge). Not a code change.

Record: the test plan table with its approval line, the open points, the decisions, the red → green
log with the mutation checks, the coverage report, the code review (stage 6) and its round 2, the
security review (stage 7), and the stage 8 subsection are all present.
`.proj.specs/0007-gh-pages-range-fixes/review/security-T-0037.md` exists (176 lines).

Commands rerun:

- `pnpm test --run` → `Test Files  130 passed (130)`, `Tests  4454 passed | 1 skipped (4455)` (`<scratch>/cc/unit.log`).
- `PATH="/bin:$PATH" pnpm vitest run tests/pre-commit-sh.test.ts` → `44 passed` (`<scratch>/cc/precommit.log`).
- `env -u CF_PAGES pnpm docs:build` → exit 0 (`<scratch>/cc/build.log`); `grep -rl __WXL_SHORT_LINKS__ .vitepress/dist | wc -l` → `0`.
- `lsof -tnP -iTCP:4173 -sTCP:LISTEN` → nothing, before and after the smoke.
- `CI=1 pnpm test:smoke` → `61 passed (2.0m)` (`<scratch>/cc/smoke.log`). Surface: the page-mode build in Playwright's Chromium.
- `git diff 707be5f -- .vitepress/theme/i18n/messages/ | wc -l` → `0`.
- `python3 scripts/verify-project.py` → exit 0, `PASS: shared instructions, 42 skills …` (`<scratch>/cc/verify.log`).

Tree: `git status --short` lists the three components, the four test files, `site-smoke.spec.ts`,
this ticket, and the untracked `tests/__helpers__/upstreamDecision.ts` and `security-T-0037.md`, all
in the plan's scope. `git status --short --ignored` also listed `test-results/`, which held only
Playwright's `.last-run.json` from the smoke run above (`{"status": "passed", "failedTests": []}`);
it was removed. What remains ignored is `node_modules/` and the build folders `.vitepress/dist/`,
`.vitepress/wasm/` and `platform/public/challenge/`. No ref was changed. Frontmatter: `status: review`.

### 2026-10-24 — end-to-end on the PR's Cloudflare preview (short mode)

Beyond the ticket's V02 (local, page mode): the same behaviour in short mode. Surface: PR
[#42](https://github.com/BrowserLaboratory/wxl-platform/pull/42)'s Cloudflare Pages preview for
`fdfb683`, at its commit URL `https://91f84259.wxl-platform.pages.dev`, in the desktop app's built-in
browser, at 1024 wide and at 375×812 (the pane's mobile emulation), the browser's language being
Traditional Chinese. The pane denies `clipboard-write`, so a click on the copy button ends in
`short_link.copy_failed`; that is the state checked below. Measured with `getComputedStyle`,
`clientWidth`/`scrollWidth`, `getBoundingClientRect` and `String(window.getSelection())` from the
page; 6ch measured as the width of a hidden `000000` span in the URL text's font. Not covered: other
browsers, real touch input, the English pages on this host.

| Check | Result | Evidence |
|---|---|---|
| list, 1024: a plain click on row 1's URL text selects it and stays | pass | selection `wxl.browserlab.online/zh/c/001`, URL still `/zh-TW/challenges` |
| list, 1024: the same while `copy_failed` shows | pass | status `複製失敗——請反白畫面上這段網址自行複製` on its own line under the URL text; selection as above; `scrollWidth` 1009 ≤ `innerWidth` 1024 |
| list, 1024: a click elsewhere in the row opens the challenge (S06) | pass | a click on row 1's description → `/zh-TW/challenge/door-is-open/` |
| list, 1024: 6ch minimum (S10) | pass | each URL text 217 px ≥ 43 px |
| nav, 1024, `door-is-open`, Browser panel open: click selects, page stays | pass | selection `wxl.browserlab.online/zh/c/001`, URL unchanged; the Browser panel's iframe 611×600 shows FileHub |
| nav, 1024: `copy_failed` in the desktop row | pass | the nav grew to 0–56 px and the message sits at 32–56 px, inside it (T-0036 measured it running 4–28 px above the nav at this width); URL text 217 px, not cut; title not cut; `scrollWidth` = 1024 |
| nav, 375×812, `selected-excerpts`: D7 and S10 | pass | URL text cut (151 px of 217) and ≥ 43 px; the title `精選節錄` not cut; `scrollWidth` = 375 |
| nav, 375×812: click selects, page stays | pass | selection `wxl.browserlab.online/zh/c/010`, URL unchanged |
| nav, 375×812: `copy_failed` on the mobile row | pass | message on its own line at 72–96 px, not cut (`scrollWidth` ≤ `clientWidth`), the row grown; `scrollWidth` = 375; Browser panel rendering the challenge (screenshot in the session) |

### 2026-10-24 — landed (stage 9)

PR [#42](https://github.com/BrowserLaboratory/wxl-platform/pull/42), squash-merged into `main` by
GitHub auto-merge as `101a982` on 2026-10-23, from head `82f9b3f`; auto-merge was enabled with a squash message
from the project `tw-emoji-commit` skill. The PR's CI: 10 checks passing, none failing. Stage 8 in short mode was checked on the PR's Cloudflare preview before auto-merge was enabled (recorded above).
Frontmatter `status: done`.

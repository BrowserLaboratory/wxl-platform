---
id: T-0038
title: create-wxl and fork:init describe the origin as the range's address
epic: 0007-gh-pages-range-fixes
status: done
blocked_by: [T-0036]
---

## Context

After T-0036, `SITE_ORIGIN` is the origin of every copied link, not only of short links. create-wxl's
setup summary still prints it as "short link origin" / 「短連結網址」, and fork:init's usage comment and
warning call it the short-link origin. A teacher on a GitHub Pages range then underestimates what a
wrong origin breaks (D10). This is the create-wxl and fork:init part of passage P3. The README and
skill parts land with T-0039. create-wxl ships with its own release, so its strings reach teachers
on the next create-wxl publish.

Spec: `traceability.md` revision 3, passage P3; D10.

## Deliverable

create-wxl's summary line in both languages, its comment on the S6 question, and fork:init's usage
comment and warning name the value as the range's address, the origin of every copied link.

## Acceptance criteria

- [x] P3: create-wxl's `S6-ORIGIN` message in English and Traditional Chinese, and the matching comment in its questions module (AC-24)
- [x] P3: fork:init's usage comment (`--origin` and A8) and its warning about replacing a custom origin (AC-24)
- [x] `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test` passes
- [x] `fork-init.test.ts` passes (AC-25)
- [x] No message key or engine behaviour changes; only wording

## 給使用者（zh-TW）

把 create-wxl 設定摘要裡的「短連結網址」，以及 fork:init 的說明與警告，改成「靶場網址」，也就是每一條複製連結的 origin，讓老師知道這個值設錯時，影響的不只是短連結。create-wxl 的字串會在它下一次發布時生效。

## Comments

### 2026-10-23 — test plan (stage 5)

Read for this plan: this ticket; `spec.en.md` and `traceability.md` revision 3 (passages table P3
and P8, D10, vocabulary `SITE_ORIGIN`, rows F01 and T05, AC-24, AC-25); T-0036's record; and, at
`707be5f`, `create-wxl/src/messages.mjs`, `create-wxl/src/questions.mjs`, `scripts/fork-init.ts`,
`create-wxl/test/messages.test.mjs`, `create-wxl/test/setup-questions.test.mjs`,
`tests/unit/scripts/fork-init.test.ts` and `GLOSSARY.md` (the `range`, `short link` and
`origin（紀錄來源）` entries). P3's line numbers, given for HEAD `7820bb8`, still hold at `707be5f`:
`messages.mjs:229` and `:304`, `questions.mjs:200`, `fork-init.ts:21`, `:31` and `:1487`
(`grep -n "short link origin\|短連結網址\|short-link origin" create-wxl/src/messages.mjs create-wxl/src/questions.mjs scripts/fork-init.ts`).

The epic's seams 0007-S1 to S8 hold none of these outputs, so the two automated rows use the seams
the existing tests already use: create-wxl's message catalogue (`en` and `zhTW` exported by
`messages.mjs`, called directly, as `messages.test.mjs` does) and fork:init's engine
(`runForkInit`'s returned `warnings`, as `fork-init.test.ts` does). Planned wording, fixed at
implementation and checked by the substrings below, not by whole strings:
`  range address, the origin of every copied link: "<origin>"` and
`  靶場網址（複製出來的每一條連結都從它開始）："<origin>"`; the A8 warning ends
`a custom range address (SITE_ORIGIN, the origin of every copied link) is replaced only when
--origin (or a derived GitHub Pages origin) says so.` The zh-TW line avoids bare `origin`, which
GLOSSARY.md reserves for `origin（紀錄來源）`, and `複製連結`, which the `short link` entry lists
under _Avoid_. No existing test asserts the old strings: `setup-questions.test.mjs` (lines 732,
842, 843) builds its expectation by calling `en['S6-ORIGIN']`, and the A8 tests in
`fork-init.test.ts` match on `A8` and the two values, so no expectation changes.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| create-wxl message catalogue (`en`, `zhTW` from `create-wxl/src/messages.mjs`) | `S6-ORIGIN` names the value as the range's address, the origin of every copied link, in both languages, and no longer as the short links' origin | new `describe` in `create-wxl/test/messages.test.mjs` | P3 (create-wxl part), D10 — AC-24 | en: contains `range address` and `every copied link`, not `short link`; zh-TW: contains `靶場網址` and `每一條連結`, not `短連結`, `複製連結` or `origin`; both contain `jsonValue(origin)` for `https://alice.github.io/r` and for an origin holding `"` (the value is still printed as a JSON string literal); zh-TW differs from en after `stripPunctuation` |
| fork:init engine (`runForkInit` → `warnings`) | the warning about replacing a custom origin names it as the range's address, the origin of every copied link | the existing A8 warning tests in `tests/unit/scripts/fork-init.test.ts` extended with wording assertions: "warns when a custom existing value is replaced by --origin", "... by a derived GitHub Pages origin", and T81 "re-derives on every run" | P3 (fork:init warning), D10 — AC-24; F01 — AC-25 | each of the three cases: the warning still starts `A8:` and holds both values, contains `range address` and `every copied link`, not `short-link origin`; the three no-warning cases (same value, differently quoted, no origin given) stay unchanged |
| create-wxl summary through `run()` (existing, not rewritten) | the summary still prints the S6-ORIGIN line with the parsed or derived origin | the existing C63 and C66 cases of `create-wxl/test/setup-questions.test.mjs`, run unchanged | P3 "create-wxl's own tests pass" — AC-24 | `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test` passes |
| stage 6 diff check (not automated) | the usage comment's `--origin` line (21) and mode-A line naming A8 (31), and the comment at `questions.mjs:200`, name the value as the range's address, the origin of every copied link | `git diff 707be5f -- scripts/fork-init.ts create-wxl/src/questions.mjs` | P3 (fork:init usage comment, create-wxl comment) — AC-24 | only comment lines and the A8 warning string change in `fork-init.ts`; the `Usage:` block's flag grammar is unchanged |
| stage 6 diff check (not automated) | no message key, export or engine behaviour changes; only wording | `git diff 707be5f -U0 -- create-wxl/src/messages.mjs` shows exactly the two `'S6-ORIGIN'` lines changed; `git diff --stat 707be5f` lists only the three source files, the two test files, this ticket and nothing under `README*`, `.claude/skills/`, `.agents/skills/` or `GLOSSARY.md` (T-0039's part of P3 and P8) | ticket AC "No message key or engine behaviour changes" — AC-24 | `S6-ORIGIN-ANSWER` and `S4` keep their wording (outside P3's list) |
| fork:init anchors and the guard (existing tests, run unchanged) | the anchor lines fork:init edits are untouched, and the fork-init and upstream-guard suites pass | `git diff --exit-code 707be5f -- .vitepress/challenge/shortLink.ts .vitepress/config.mts`; `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts`; then `pnpm test --run` against the baseline (130 files, 4414 passed, 1 skipped) plus the new cases | F01 — AC-25 | exactly one line matching each anchor (`SITE_ORIGIN`, `siteBase`, `title`), unchanged because this ticket does not touch either file |
| stage 8 (not this ticket) | — | the epic's stage 8 is T-0039's; the strings here are CLI output with no browser surface, and create-wxl's reach teachers only on its next publish. The surface these rows cover is Node: the catalogue functions, `run()` with a fake IO (the CLI minus `bin/`), and `runForkInit` | — | — |

Approval: The user approved this test plan in advance on 2026-10-23 with the standing instruction "授權權限，完成到結束" (permission granted; carry it through to the end), given together with "ultracode 先確認是否能夠平行，若有風險都選擇順序，完成 T-0033 T-0034 T-0035 T-0037 T-0038".

### 2026-10-23 — open points resolved (stage 5)

1. **P3's clause against its line list.** P3 says "Every passage that names `--origin` or
   `SITE_ORIGIN` as only the short links' origin", and the stage 5 completion check is
   `grep -rn "short link origin\|short-link origin\|短連結網址" create-wxl/src scripts/fork-init.ts`
   returning nothing, which covers the whole of `scripts/fork-init.ts`. Changing only the listed
   lines would leave that grep failing. So the internal comments that call the value the
   short-link origin changed too (707be5f lines 851, 856, 1082, 1364, 1453, 1481), comment-only.
   Comments that say "short-link module" (lines 997, 1514) name the file `shortLink.ts`, not the
   value, and stay. The stage 6 diff row still holds: outside comments, the only change in
   `fork-init.ts` is the A8 warning string (split into two concatenated literals to keep the line
   length near the file's other lines; the joined string is the planned one).
2. **Two names for one value in the create-wxl summary.** S4 (`Site address` / 「網站網址」) and
   S6-ORIGIN-ANSWER (`site address answered` / 「回答的網站網址」) are outside P3's list, and the
   ticket AC says only wording in P3 changes, so they stay. The summary now prints
   「回答的網站網址」 and 「靶場網址（…）」 for the same value; flagged for stage 6.
3. **GLOSSARY.md.** No change. 「靶場網址」 / "range address" is the existing `range（靶場）` term
   plus a plain noun, not a new term, and GLOSSARY.md:218 already calls this value 「印在講義上的
   靶場網址」. P8, which rewrites that wording, belongs to T-0039, which edits GLOSSARY.md in
   parallel. If an entry is wanted, it goes to T-0039.
4. **zh-TW wording limits.** The zh-TW line is 「靶場網址（複製出來的每一條連結都從它開始）」: no bare
   `origin` (the name of 「origin（紀錄來源）」) and no `複製連結` (under _Avoid_ in the
   `short link` entry). The test checks both. The ticket's own zh-TW section above keeps its
   wording, since it is the user-facing description written at stage 4.
5. **Older specs** (`.proj.specs/0005-create-wxl/traceability.md:252`, `0004-stateless-engine`,
   T-0015) are records of closed epics and are not in P3's list: untouched.
6. **No existing test asserted the old strings.** Confirmed: `pnpm --dir create-wxl test` and
   `pnpm vitest run tests/unit/scripts/fork-init.test.ts` pass with no expectation edited other
   than the three A8 cases extended by the plan.
7. **CHANGELOG.** `create-wxl/` has no CHANGELOG of its own; the root `CHANGELOG.md` keeps an
   `## [Unreleased]` section (`grep -n "Unreleased" CHANGELOG.md` → line 8). No entry is written
   by hand; at create-wxl's next release, /tw-emoji-release-note should note that the setup
   summary's origin line now reads "range address, the origin of every copied link" /
   「靶場網址（複製出來的每一條連結都從它開始）」, and that fork:init's A8 warning names it the same way.
8. **The user's note that auto-merge is on** is information only; nothing in stage 5 depends on it.

### 2026-10-23 — red → green log (stage 5)

Node v24.13.0 (`node -v`), so create-wxl's publish tests (Node >= 22.13) run.

| # | Seam / row | Red | Green |
|---|---|---|---|
| 1 | create-wxl message catalogue: new `describe` "S6-ORIGIN names the value as the range's address…" (2 cases) in `create-wxl/test/messages.test.mjs` | `cd create-wxl && npx vitest run test/messages.test.mjs` → 2 failed, 12 passed (`expected '  短連結網址："https://alice.github.io/r"' to contain '靶場網址'`; en: `range address` missing) | `S6-ORIGIN` en → `  range address, the origin of every copied link: ${jsonValue(origin)}`, zh-TW → `  靶場網址（複製出來的每一條連結都從它開始）：${jsonValue(origin)}`; same command → 14 passed |
| 2 | fork:init engine `runForkInit` → `warnings`: helper `expectRangeAddressWording` added to the three A8 warning cases (T81 "re-derives on every run", "…replaced by --origin", "…by a derived GitHub Pages origin") | `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "A8"` → 3 failed, 96 passed (`expected 'A8: .vitepress/challenge/shortLink.ts…' to contain 'range address'`) | warning tail → `a custom range address (SITE_ORIGIN, the origin of every copied link) is replaced only when --origin (or a derived GitHub Pages origin) says so.`; same command → 99 passed, 1796 skipped. The three no-warning cases are unchanged and pass |
| 3 | stage 6 diff rows (not automated): usage comment lines 21 and 31, `questions.mjs:200`, internal comments (open point 1) | — | `git diff 707be5f -- scripts/fork-init.ts \| grep '^[-+]' \| grep -v '^[-+] *\(\*\|//\|/\*\*\)'` → only the A8 warning literal lines; `git diff 707be5f -U0 -- create-wxl/src/messages.mjs` → exactly the two `'S6-ORIGIN'` lines |
| 4 | create-wxl summary through `run()` (C63, C66, existing) | not applicable: existing cases build their expectation from `en['S6-ORIGIN']` | `cd create-wxl && npx vitest run test/setup-questions.test.mjs -t "summary origin"` → 3 passed; whole package below |

Every planned row went red first, so no mutation check was needed for a row that passed at once.

### 2026-10-23 — coverage report (stage 5)

No coverage provider is installed: `pnpm vitest run --coverage --coverage.include=scripts/fork-init.ts tests/unit/scripts/fork-init.test.ts`
→ `MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'`; create-wxl has no
`node_modules/@vitest/coverage-*` either (`ls create-wxl/node_modules/@vitest/`). None was
installed. Coverage below is by inspection of which test reaches each changed line.

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| create-wxl message catalogue (`en`/`zhTW` `S6-ORIGIN`, `messages.mjs:229`, `:304`) | `create-wxl/test/messages.test.mjs` "S6-ORIGIN names the value…" (2 cases); C63/C66 in `setup-questions.test.mjs` through `run()` | not measured (no provider); both changed lines are called by the new cases, for two origins each | P3 create-wxl part, D10 — AC-24 | none of the changed lines |
| fork:init engine A8 warning (`fork-init.ts` warning literal) | `tests/unit/scripts/fork-init.test.ts` three A8 warning cases with `expectRangeAddressWording`; three no-warning cases unchanged | not measured (no provider); the warning literal is reached by all three warning cases | P3 fork:init warning, D10 — AC-24; F01 — AC-25 | none |
| comments (`fork-init.ts` usage lines 21 and 31 and internal comments; `questions.mjs:200`) | none (comments carry no behaviour) | not applicable | P3 usage comment and create-wxl comment — AC-24 | comments: checked by the stage 6 diff and the grep below, not by a test |
| fork:init anchors and the upstream guard | `tests/unit/scripts/fork-init.test.ts`, `tests/unit/scripts/upstream-guard.test.ts` (existing) | not measured | F01 — AC-25 | none; `shortLink.ts` and `config.mts` are unchanged |

Commands and results (all in this worktree, 2026-10-23):

- `pnpm test --run` → 130 files passed, 4414 passed, 1 skipped (baseline 707be5f: the same; this
  ticket extends three existing root cases and adds none).
- `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test` → 21 files
  passed, 437 tests passed (the 2 new catalogue cases included).
- `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts`
  → 2 files passed, 1992 passed, 1 skipped.
- `grep -rn "short link origin\|short-link origin\|短連結網址" create-wxl/src scripts/fork-init.ts`
  → no output, exit 1.
- `git diff --exit-code 707be5f -- .vitepress/challenge/shortLink.ts .vitepress/config.mts` →
  exit 0 (anchor lines untouched).
- `git diff --stat 707be5f` → `create-wxl/src/messages.mjs`, `create-wxl/src/questions.mjs`,
  `create-wxl/test/messages.test.mjs`, `scripts/fork-init.ts`,
  `tests/unit/scripts/fork-init.test.ts` and this ticket; nothing under `README*`,
  `.claude/skills/`, `.agents/skills/` or `GLOSSARY.md`.

Typechecking: the root `package.json` has no typecheck script (`grep -n '"typecheck' package.json`
→ none); the test change adds a typed helper (`warning: string | undefined`) that vitest's
transform accepts.

Stage 8: not this ticket. These strings are CLI output with no browser surface; the surface
verified here is Node (catalogue functions, `run()` with a fake IO, `runForkInit`). The epic's
stage 8 is T-0039's.

### 2026-10-23 — code review (stage 6)

Round 1. Three axes (Standards, Spec, Security). A medium or high candidate is confirmed when at
least two of three independent skeptics hold it real; a low one when its one skeptic does.
**No finding was confirmed**, so no production or test code changed at stage 6. The candidates the
skeptics rejected, recorded and not acted on (0/1 real unless stated):

| # | Axis | Finding | Verdict | Reason |
|---|---|---|---|---|
| R1 | Standards | The create-wxl summary names one value 「網站網址」 (S6-ORIGIN-ANSWER) and 「靶場網址」 (S6-ORIGIN) | 0/3, rejected | The two labels predate this ticket (`707be5f`: 「回答的網站網址」 and 「短連結網址」); the lines print different values (`current.origin` as answered at `questions.mjs:207-218`, against the parsed or derived origin the engine writes); P3 (`traceability.md:201`) lists only the `S6-ORIGIN` lines and `questions.mjs:200`. Open point 2; unifying S4 and S6-ORIGIN-ANSWER would be a follow-up ticket |
| R2 | Standards | 「靶場網址」 / "range address" is not in GLOSSARY.md | rejected | It is the existing `range（靶場）` term plus a plain noun; `spec.en.md:165-168` adds no term beyond stage 1's four edits; GLOSSARY.md:218 already calls the value 「印在講義上的靶場網址」, and P8 there is T-0039's (open point 3) |
| R3 | Standards | The A8 warning calls the value "range address" and then "a derived GitHub Pages origin" | rejected | The "(or a derived GitHub Pages origin)" clause predates this ticket; the new parenthesis binds range address, `SITE_ORIGIN` and origin in the same sentence; the wording was fixed in the approved plan |
| R4 | Standards | `fork-init.ts:856`'s JSDoc line is not rewrapped | rejected | The repository has no line-width standard (no prettier, eslint or editorconfig config); 45 lines of the file already reach 106 characters (`grep -cE '^.{106,}$' scripts/fork-init.ts`) |
| R5 | Standards | The test helper sits between an existing comment and its `describe`, outside the `describe` | rejected | No documented rule places helpers; the file already has several top-level helpers used by one `describe` |
| R6 | Standards | The `describe` is still named "short-link origin (A8)" | rejected | That line is context, unchanged since T-0015; it is developer-facing, not in P3's list, and keeps the A8 anchor-table name for tracing |
| R7 | Standards | The catalogue test computes its expectation with the implementation's `jsonValue` | rejected | The test checks the template, not `jsonValue`; `create-wxl/test/helpers/expect-codes.mjs:4-8` documents `jsonValue` as the escaping oracle; an unescaped template fails the `"` case |
| R8 | Standards | Several assertions would pass without this change | rejected | Red is per test case in this repository's records; every new or extended case went red first (red → green log rows 1 and 2) |
| R9 | Standards | The negative assertions check one spelling only | rejected | Each one blocks the exact old string of its surface; the positive assertions pin the new wording; the completion grep covers all three spellings |
| R10 | Standards | The same appositive repeats in several places | rejected | Each place is one P3 names; internal comments carry only "range address"; comments, CLI strings and i18n strings cannot share one constant |
| R11 | Standards | The en summary label is much longer than the other labels | rejected | No documented label standard; P3 asks for this wording, and the approved plan fixed it |
| R12 | Standards | The typechecking note has no reproducing command | rejected | The record states there is no typecheck script (`grep -n '"typecheck' package.json` → none) and claims no typecheck; the vitest run that executes the helper is recorded |
| R13 | Standards | The citation of GLOSSARY.md:218 names no commit | rejected | The plan states the file was read at `707be5f`, and `git diff --stat 707be5f` shows GLOSSARY.md unchanged. Optional: the line is at `707be5f` |
| R14 | Standards | The test plan was approved in advance by a standing instruction | rejected | The record quotes the user's words and the form of approval; no rule requires per-table approval (T-0030 and T-0036 rejected the same finding) |
| R15 | Standards | Auto-merge is on and could merge the PR before stages 6–7 close | rejected | Not a defect in the diff; `docs/agents/workflow.md` opens the PR only at stage 9, after stages 6–8 pass. Noted for the parent: open the PR only after the gates close |
| R16 | Standards | The ticket's zh-TW section uses 「複製連結」 and bare origin | rejected | That section is unchanged stage 4 text (context in the diff), and open point 4 keeps it on purpose |
| R17 | Spec | The internal comment rewrites go beyond P3's line numbers | rejected | `spec.en.md:151-155` says "every description … in fork:init's comments", and P3 opens with "Every passage"; the extra edits are comment-only |
| R18 | Spec | The "stage 5 completion check" grep is not in the spec | rejected | Open point 1 rests on P3's "Every passage"; the grep is recorded with its command and result, which is what the ticket-record rule asks. It came from the stage 5 task instructions |
| R19 | Spec | The create-wxl summary uses two names for one value (same as R1) | rejected | Same reasons as R1 |
| R20 | Spec | The `questions.mjs` comment cites 0005's traceability, which still says short-link origin | rejected | P3 names that comment; the citation locates the derivation rule, which is unchanged, and older specs are closed records (open point 5) |
| R21 | Spec | The `fork-init.test.ts` `describe` title still says short-link origin (same as R6) | rejected | Same reasons as R6 |
| R22 | Spec | The ticket's zh-TW section uses 「複製連結」 and bare origin (same as R16) | rejected | Same reasons as R16 |
| R23 | Spec | AC-24 is a stage 6 check, yet its P3 boxes were ticked at stage 5 | rejected | `docs/agents/workflow.md:123-124` requires the met criteria ticked on entry to stage 6; this review is the T05 check, and it found the P3 wording in place |
| R24 | Security | The A8 warning prints the old value with `JSON.stringify` | rejected | See stage 7 below |

Stage 6 check that closes AC-24 (T05): this review of the diff confirmed the P3 wording at
`scripts/fork-init.ts:21`, `:31`, `:1487`, `create-wxl/src/messages.mjs:229`, `:304` and
`create-wxl/src/questions.mjs:200`, with the old wording gone (grep below). The boxes stay ticked.

Commands rerun at stages 6 and 7, in this worktree (no code changed since stage 5):

- `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test` → 21 files
  passed, 437 passed.
- `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts`
  (`ls tests/unit/scripts/ | grep -i guard` → `upstream-guard.test.ts`) → 2 files passed; 1992
  passed, 1 skipped.
- `grep -rn "short link origin\|short-link origin\|短連結網址" create-wxl/src scripts/fork-init.ts`
  → no output, exit 1.
- `git diff --exit-code 707be5f -- .vitepress/challenge/shortLink.ts .vitepress/config.mts` → exit 0.
- `pnpm test --run` → 130 files passed; 4414 passed, 1 skipped (first run, at a load average of
  about 32 per `uptime`; no rerun needed).

The coverage report is unchanged: no test changed at stages 6 and 7.

### 2026-10-23 — security review (stage 7)

Report: [`security-T-0038.md`](../../.proj.specs/0007-gh-pages-range-fixes/review/security-T-0038.md).

| # | Candidate | Verdict | What was done |
|---|---|---|---|
| S1 | (Pre-existing) the A8 warning prints the old `SITE_ORIGIN` with `JSON.stringify`, which leaves DEL, C1 and bidi characters unescaped (`scripts/fork-init.ts:1486`, printed at `:1777`) | 0/1, rejected | None. The expression is unchanged context in this diff: the ticket only replaced the warning's fixed tail. The spec sets no escaping rule for fork:init's warnings, and anyone able to edit `shortLink.ts` can already edit the `fork-init.ts` the teacher runs next. Unifying the escaping with create-wxl's `text.mjs` could be a follow-up, not T-0038's |

No security finding was confirmed, and no change was made for stage 7. The report lists the limits
of the review as the reviewer stated them. It does not claim the project is secure.

### 2026-10-23 — end-to-end (stage 8, local)

Surface: the teacher's terminal, macOS, Node v24.13.0, run from this worktree's pending state on
`707be5f`. Pushing, the PR's CI and the Cloudflare preview are the parent's, later; these strings
have no browser surface (test plan, last row), so no preview row belongs to this ticket.

**create-wxl.** The published `bin/create-wxl.mjs` downloads the upstream archive from
`codeload.github.com`, and the setup summary prints only on the interactive branch
(`io.interactive` needs both stdin and stdout to be a TTY, `src/run.mjs:229`). So the run used a
driver that builds the bin's own `deps` and `io` (`process.stdin`/`stdout`, `signals: process`,
the real engine `scripts/fork-init.ts`) except for the two the tests also replace: `fetchArchive`
returns the tests' `ENGINE_READY_FIXTURE` archive and `runGit` is the tests' all-success git stub.
It ran under `script(1)` for a pseudo-terminal, with answers typed after each prompt by a delayed
feeder (all answers sent at once are discarded when readline switches the terminal to raw mode, and
the run ends with CW-E15; that is the pty, not the product). The driver, saved as
`drive-create-wxl.mjs` outside the checkout:

<details><summary>drive-create-wxl.mjs</summary>

```js
// Stage 8 driver for T-0038: runs this worktree's create-wxl `run()` against the real process
// stdin/stdout (a pty under `script`), with the bin's own deps except the two that would reach
// the network or a real repository: `fetchArchive` (the tests' ENGINE_READY_FIXTURE archive) and
// `runGit` (the tests' all-success git stub). Usage: node drive-create-wxl.mjs <worktree> <cwd> [argv...]
import * as fsp from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const [worktree, cwd, ...argv] = process.argv.slice(2)
const cw = (p) => pathToFileURL(join(worktree, 'create-wxl', p)).href

const { run } = await import(cw('src/run.mjs'))
const { makeFetchArchive } = await import(cw('test/helpers/archive.mjs'))
const { ENGINE_READY_FIXTURE } = await import(cw('test/helpers/fixtures.mjs'))
const { makeGitStub } = await import(cw('test/helpers/git-stub.mjs'))
const { ENGINE_FILE, ENGINE_SHA256, FIXED_COMMIT, PACKAGE_VERSION } = await import(cw('test/helpers/deps.mjs'))
const engine = await import(pathToFileURL(ENGINE_FILE).href)

const deps = {
  env: process.env,
  cwd,
  nodeVersion: process.versions.node,
  locale: Intl.DateTimeFormat().resolvedOptions().locale,
  packageVersion: PACKAGE_VERSION,
  source: { repository: engine.UPSTREAM_SLUG, version: PACKAGE_VERSION, commit: FIXED_COMMIT, engineSha256: ENGINE_SHA256 },
  engine,
  engineFile: ENGINE_FILE,
  fetchArchive: makeFetchArchive(ENGINE_READY_FIXTURE, { commit: FIXED_COMMIT }),
  downloadTimeoutMs: 120000,
  runGit: makeGitStub().runGit,
  fs: fsp,
  signals: process,
  checkpoint: () => {},
}
const io = {
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
  interactive: Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY),
}
process.stderr.write(`[driver] interactive=${io.interactive}\n`)
process.exitCode = await run(argv, io, deps)
```

</details>

Commands (`S` a scratch directory, `W` this worktree, each run in an empty `$S/cw-*`):

- en, GitHub Pages, derived origin: `cd $S/cw-en && (sleep 4; for a in Ada alice/r 1 '' '' y; do printf '%s\r' "$a"; sleep 1.5; done; sleep 4) | LANG=en_US.UTF-8 script -q $S/cw-en.typescript node $S/drive-create-wxl.mjs $W $S/cw-en d` → exit 0
- zh-TW, Cloudflare Pages, answered origin: same in `$S/cw-zh` with answers `Ada alice/r 2 https://r.pages.dev '' y` and `LANG=zh_TW.UTF-8` → exit 0
- zh-TW, GitHub Pages, derived origin: same in `$S/cw-zh2` with the en answers and `LANG=zh_TW.UTF-8` → reached `下一步：cd d` (`grep -c "下一步：cd d" $S/cw-zh2.typescript` → 1)

Captured summary lines (verbatim from the pty):

```
  author: "Ada"
  repository: "alice/r"
  host: "github-pages"
  range address, the origin of every copied link: "https://alice.github.io/r"
Apply these settings? [Y/n]
```

```
  作者："Ada"
  GitHub repository："alice/r"
  部署目標："cloudflare-pages"
  回答的網站網址："https://r.pages.dev"
  靶場網址（複製出來的每一條連結都從它開始）："https://r.pages.dev"
要套用這些設定嗎？[Y/n]
```

```
  靶場網址（複製出來的每一條連結都從它開始）："https://alice.github.io/r"
```

`grep -c "短連結網址\|short link origin" $S/cw-*.typescript` → 0 in all three.

**fork:init.** A throwaway clone of this worktree's pending state:
`git clone -q --no-hardlinks $W $S/fork-clone && cd $S/fork-clone && git remote remove origin && git -C $W diff 707be5f --binary > $S/pending.patch && git apply $S/pending.patch`,
plus the untracked `security-T-0038.md` copied in and `node_modules` linked to the worktree's;
`git remote -v` → empty; `diff <(git -C $W diff 707be5f) <(git diff 707be5f)` → identical. No commit
was made in the clone (fork:init does not need one), so hard rule 5 had nothing to cover.

1. `pnpm fork:init --help` → `✗ unknown flag: "--help"`, exit 1: fork:init has no help flag; its
   usage text is the file's header comment, read with `sed -n '10,33p' scripts/fork-init.ts`. The
   lines naming the value:
   ```
    *   --origin sets the range address, the origin of every copied link (A8); --host github-pages
    *                        name, from --site-name), A8 (the range address, the origin of every
   ```
2. `pnpm fork:init --author Ada --repo alice/r --host cloudflare-pages --origin https://old-range.pages.dev`
   → exit 0, 5 files changed, no A8 warning (the old value was upstream's own); `SITE_ORIGIN` →
   `"https://old-range.pages.dev"`.
3. `pnpm fork:init --author Ada --repo alice/r --host cloudflare-pages --origin https://new-range.pages.dev`
   → exit 0, 1 file changed, and:
   ```
   [i] A8: .vitepress/challenge/shortLink.ts changes from "https://old-range.pages.dev" to "https://new-range.pages.dev" — a custom range address (SITE_ORIGIN, the origin of every copied link) is replaced only when --origin (or a derived GitHub Pages origin) says so.
   ```
4. `pnpm fork:init --author Ada --repo alice/r --host github-pages` (derived origin over the custom
   one) → exit 0, and:
   ```
   [i] A8: .vitepress/challenge/shortLink.ts changes from "https://new-range.pages.dev" to "https://alice.github.io/r" — a custom range address (SITE_ORIGIN, the origin of every copied link) is replaced only when --origin (or a derived GitHub Pages origin) says so.
   ```

| Row | Surface | Result | Reproducing command |
|---|---|---|---|
| create-wxl summary names the range address (en) | teacher's terminal (pty), create-wxl `run()` with the bin's deps, fixture archive, git stub | pass | en command above; summary line `range address, the origin of every copied link: "https://alice.github.io/r"` |
| create-wxl summary names the range address (zh-TW) | same, `LANG=zh_TW.UTF-8` | pass | zh-TW commands above; `靶場網址（複製出來的每一條連結都從它開始）："https://r.pages.dev"` and `…："https://alice.github.io/r"` |
| fork:init warning on replacing a custom origin | teacher's terminal, `pnpm fork:init` (tsx) in a local clone with no remote | pass | steps 2–4 above; both A8 warnings name "a custom range address (SITE_ORIGIN, the origin of every copied link)" |
| fork:init usage text | the header comment as printed by `sed` (no `--help` flag exists) | pass | step 1 above; `--origin` line and mode A's A8 line name the range address |

Not covered: the published package's own `bin/create-wxl.mjs` path (its network download of the
upstream archive, `dist/` built by `prepare-dist.mjs`, and step 12's real git commands; the driver
replaces exactly these with what the tests use, so the summary text and the engine are the
worktree's own); a TTY other than `script(1)`'s pty on macOS; Windows; and the strings reaching
teachers, which waits for create-wxl's next publish.

Cleanup: `rm -rf $S/fork-clone $S/cw-en $S/cw-zh $S/cw-zh2 $S/*.typescript $S/pending.patch` and the
driver; no server was started; `pgrep -fl "drive-create-wxl|fork-init.ts"` → nothing. In the real
repository `git stash list | wc -l` → 0 before and after.

Stage 8 checkbox: this ticket's acceptance criteria hold none (its test plan puts the epic's stage 8
with T-0039), so nothing was ticked. Every local row passed. What remains is the PR's CI, run by the
parent after the push.

### 2026-10-23 — completeness check

Checked against the checkout, not earlier summaries. Every ticked box has an observer at its seam,
so none was unticked:

| Acceptance criterion | Observed by | Result |
|---|---|---|
| P3: `S6-ORIGIN` en and zh-TW, and the `questions.mjs` comment (AC-24) | `cd create-wxl && npx vitest run test/messages.test.mjs -t "S6-ORIGIN names"` (catalogue seam); the comment by the stage 6 review (T05) and `git diff 707be5f -- create-wxl/src/questions.mjs` | 2 passed; comment at `questions.mjs:200-202` names the range address |
| P3: fork:init usage comment and A8 warning (AC-24) | `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "A8"` (`runForkInit` → `warnings`); usage lines by `sed -n '21p;31,32p' scripts/fork-init.ts` and the stage 6 review | 99 passed, 1796 skipped; lines 21 and 31-32 name the range address |
| `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test` passes | that command | 21 files passed, 437 passed |
| `fork-init.test.ts` passes (AC-25) | `pnpm vitest run tests/unit/scripts/fork-init.test.ts` | 1 file passed, 1895 passed |
| No message key or engine behaviour changes | `git diff 707be5f -U0 -- create-wxl/src/messages.mjs \| grep '^[-+] '` → only the two `'S6-ORIGIN'` lines; `git diff 707be5f -- scripts/fork-init.ts \| grep '^[-+][^-+]' \| grep -v '^[-+] *\(\*\|//\|/\*\*\)'` → only the A8 warning literal | holds |

Other commands, run in this worktree:

- `pnpm test --run` → 130 files passed; 4414 passed, 1 skipped (baseline the same).
- `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` → 1 file passed; 97 passed, 1 skipped.
- `python3 scripts/verify-project.py` → `PASS`, exit 0.
- `grep -rn "short link origin\|short-link origin\|短連結網址" create-wxl/src scripts/fork-init.ts` → no output, exit 1.
- `git diff --exit-code 707be5f -- .vitepress/challenge/shortLink.ts .vitepress/config.mts` → exit 0.

Record: the test plan table with its approval line, the red → green log, the coverage report table,
the code review (stage 6), security review (stage 7) and stage 8 subsections are present, and
`ls .proj.specs/0007-gh-pages-range-fixes/review/security-T-0038.md` finds the report.

Tree: `git status --short` lists only the five source and test files, this ticket and the untracked
`security-T-0038.md`, all in scope; `git status --short --ignored` adds only `.vitepress/wasm/`,
`platform/public/challenge/`, `node_modules/` and `create-wxl/node_modules/`, which predate this
ticket. No stray artifact was found or removed. Frontmatter `status: review`.

No gaps.

### 2026-10-24 — landed (stage 9)

PR [#41](https://github.com/BrowserLaboratory/wxl-platform/pull/41), squash-merged into `main` by
GitHub auto-merge as `6f1b839` on 2026-10-23, from head `b334927`; auto-merge was enabled with a squash message
from the project `tw-emoji-commit` skill. The PR's CI: 10 checks passing, none failing. create-wxl's new wording reaches teachers with its next publish.
Frontmatter `status: done`.

# Open questions

Architecture-level decisions that are deferred. Distinct from a ticket with `status: pending`: those
exist and are paused, these are not yet tickets because something upstream has to settle first.

Each entry records why it was deferred, the evidence behind that call, what it blocks, and the
condition that should bring it back. Number them `OQ-001`, `OQ-002`, … and keep resolved ones in
place with their resolution, so the reasoning survives.

Entries follow this shape:

---

## OQ-NNN — <the question, as a question>

**Deferred on:** YYYY-MM-DD
**Status:** open | resolved

**Reason.** Why this cannot be decided yet. Name what has to happen first.

**Evidence.** What is already known, with `path:line`, command output, or an external source for
each claim. Say which claims are verified and which are inferred.

**Blocks.** What downstream decisions or pipeline stages wait on this. List the candidate options
already ruled in or out.

**Not blocked.** What is already settled despite this question being open, so the deferral does not
stall more than it has to.

**Revisit when.** The condition that should bring this back — not a date, a state.

---

## OQ-001 — Does clearing stored work still misreport while the database deletion is in flight?

**Deferred on:** 2026-10-10
**Status:** resolved

**Reason.** Carried over from an earlier review register of the shared-machine session gate, which
listed two defects of the in-flight window: a deletion timeout that rejects without cancelling the
request (K5), and a "continue with the stored work" offer that stayed clickable while the deletion
was awaited (K6).

**Evidence.** Both are addressed (verified by reading; line numbers re-checked on 2026-10-14):

- `.vitepress/theme/composables/useSessionGate.ts:276` — `markClearStarted()` sets
  `clearStartedState` and persists it to `sessionStorage`; `clearEverything` calls it at line 552,
  before `deleteDatabase()` at line 573. While it is set, continue is withdrawn on screen
  (`.vitepress/theme/components/SessionGate.vue:220`) and refused by `keepExistingData`
  (`useSessionGate.ts:472`).
- `.vitepress/theme/composables/useChallengePersistence.ts:551` — the timeout still only races the
  request and does not cancel it, but the failure copy does not claim nothing was deleted:
  `session_gate.clear_unconfirmed` reads "The outcome could not be confirmed."
  (`.vitepress/theme/i18n/messages/en.json:132`).

**Re-checked on 2026-10-14 (epic 0001).** The revisit condition was met: epic 0001 changed
`clearEverything`. The in-flight withdrawal described above still holds under that epic's spec:
continue is refused in every state but the untouched question and a refused first run (T11a in
`.proj.specs/0001-truthful-clear-reports/traceability.md`), and dismiss is refused while a run is in
flight (T13). The flag this entry's first version named, `storedWorkGone`, is now `databaseDeleted`
(renamed in T-0001, with no alias).

**Blocks.** Nothing.

**Not blocked.** The meaning of `databaseDeleted` (K2–K4: an empty database reported as deleted
work, the continue offer withdrawn on that path, and the wrong half named on retry) was epic 0001's
subject and is not covered by this entry.

**Revisit when.** A change touches `clearEverything` in `useSessionGate.ts` or `deleteDatabase` in
`useChallengePersistence.ts`.

---

## OQ-002 — How should the session-gate backdrop block the page behind it?

**Deferred on:** 2026-10-10
**Status:** open

**Reason.** Two defects pull in opposite directions, and fixing either alone recreates the other
(K10, K11). It needs a design decision, not a patch.

**Evidence.**

- Verified: the backdrop is `pointer-events-none` with only the card taking the pointer
  (`.vitepress/theme/components/SessionGate.vue:115`, `:119`), so the controls under it — the flag
  input, the submit button, the panel tabs, the link back to the challenge list — stay clickable
  while the learner cannot read them (K11).
- Inferred from the earlier register, not re-measured here: the hint text uses `--ch-text-2`
  (`SessionGate.vue:137`; `#4b5563` light, `#94a3b8` dark in `.vitepress/theme/style.css:16`, `:62`)
  and measured below WCAG AA contrast under the `rgba(0,0,0,0.55)` backdrop in both themes (K10).
- The backdrop stopped taking the pointer so that ARIA, focus order and hit-testing agree: the
  dialog is not `aria-modal` because nothing behind it is `inert` (`SessionGate.vue:91–103`).

**Blocks.** Any change to the gate's dialog semantics. Options so far: make the page behind `inert`
and the dialog `aria-modal` (fixes K11, needs focus handling); darken the backdrop (helps K10,
hides K11 further); let the backdrop take the pointer again (fixes K11, breaks the ARIA agreement).

**Not blocked.** The gate's decision logic and its copy.

**Revisit when.** An epic touches the session gate's presentation or accessibility.

---

## OQ-003 — What should pin the truth of the session gate's failure messages?

**Deferred on:** 2026-10-10
**Status:** open

**Reason.** Carried over from the earlier review register (K13): tests pinned which message a failure
path shows, not whether the message is true on that path. Epic 0001 pinned a fixed set of strings and
states by literal comparison (below); what stays open is everything outside that set.

**Evidence.**

- Before epic 0001, inferred from the register and not re-verified: rewriting a failure hint into a
  sentence that is false on its path turned no test red. The routing assertions in
  `tests/unit/components/SessionGate.test.ts` read the message files, so they still cannot tell a true
  sentence from a false one.
- Since epic 0001, verified: seam S2 (`tests/unit/components/SessionGate-truth.test.ts`) builds each
  state with the real composable over fake-indexeddb, asserts its preconditions, then compares the
  strings below with literals written in the test, by exact equality, in en and zh-TW, so any rewrite
  of one of them in a listed state fails its test. Keys of `session_gate`,
  and the states (`.proj.specs/0001-truthful-clear-reports/traceability.md:61-85`) in which each is
  compared:

  | Key | States |
  |---|---|
  | `title` | P0, P1, P4, P5, P11a |
  | `body` | P0, P12 |
  | `body_unconfirmed` | P1, P2, P3, P3x, P6, P7, P8, P10b, P10c, P11a, P11r, P13 |
  | `body_cleared` | P4, P5, P9, P10, P14 |
  | `sweep_failed`, `sweep_failed_hint` | P4, P5, P9, P10, P14 |
  | `clear_unconfirmed`, `clear_unconfirmed_hint` | P2, P3, P3x, P7, P8, P10b, P10c, P13 |
  | `clear_not_started`, `clear_not_started_hint` | P12 |
  | `clear_retry_not_started_hint` | P10, P10b, P10c, P11r |
  | `keep` | P0, P12 |
  | `clear` | P0, P1, P4, P5, P11a |
  | `reload` | P2, P3, P3x, P7, P8, P10b, P10c, P11r, P13 |
  | `dismiss` | P4, P5, P9, P10, P14 |

  On the site root as well: P10b (`clear_unconfirmed`, `clear_retry_not_started_hint`, `reload`) and
  P10c (`clear_retry_not_started_hint`, `reload`) in en and zh-TW; P11a (`title`, `body_unconfirmed`,
  `clear`) and P11r (`body_unconfirmed`, `clear_retry_not_started_hint`, `reload`) in en. The built
  site pins T36 (P4) and T37 (P7) in en only (`tests/site-smoke/session-gate-clear-report.spec.ts`).

**Blocks.** Nothing directly. Not compared by literal: a key in a state its row above does not name
(for example `title` and `clear` in P2), P11b (which T28 gives the same columns as P11a, untested),
and P15, which shows no gate. There a false sentence still passes.

**Not blocked.** Fixes to the gate's logic, which have their own tests.

**Revisit when.** A gate string is added or rewritten, or a failure path is added, without a literal
S2 test for it.

---

## OQ-004 — Should GitHub Pages deployment be switchable without editing files?

**Deferred on:** 2026-10-10
**Status:** open

**Reason.** A fork deploys to GitHub Pages only when `pnpm fork:init --host github-pages` installs
`.github/workflows/deploy.yml` from `scripts/templates/deploy.yml.template`; a Cloudflare Pages fork
(`--host cloudflare-pages`) gets no such workflow, and a run with that value removes one that is
already there only when it matches the current or a known old template output (an existing,
differently-shaped file is left in place with a warning instead). Switching a configured range from
one host to the other today means running `fork:init` again with the other `--host` value. A
repository variable read by the workflow would let a teacher switch it from the GitHub UI instead,
but that needs its own design and tests.

**Evidence.** Verified (epic 0004-stateless-engine), `scripts/fork-init.ts`: under `--host
github-pages` (`:1554-1588`) the workflow is installed when absent (`:1557-1567`), replaced when it
matches a known old template output (`:1568-1578`), left untouched with no warning when it matches
the current template (the `'current'` branch falls through at `:1588`), and left untouched with a
warning otherwise (`:1579-1588`); under `--host cloudflare-pages` (`:1589-1605`) it is removed when
it matches the current or a known old template output (`:1590-1601`), and otherwise left untouched
with a warning (`:1603-1604`). A run without `--host` (with or without `--base`) keeps the behaviour
from before this epic (`:1606-1631`): the workflow is installed when absent, and never replaced when
it already exists with different content, whether that content matches a known old output or
neither.

**Blocks.** Nothing for the current workshop material, which documents both hosts.

**Not blocked.** Cloudflare Pages deployment, which needs no workflow in the repository.

**Revisit when.** Teachers report needing to switch hosts from the GitHub UI alone, or the fork
workflow is next changed.

---

## OQ-005 — Should `fork:init` rewrite the short-link origin?

**Deferred on:** 2026-10-10
**Status:** resolved

**Reason (state at the original deferral).** Short links copy `SITE_ORIGIN` from
`.vitepress/challenge/shortLink.ts`, and a fork must change it by hand; `fork:init` does not touch
it. An `--origin` flag is the obvious automation, but it adds a third identity to keep consistent
with `--repo` and `--base`.

**Evidence.** Verified on 2026-10-10: `SITE_ORIGIN` is a literal in
`.vitepress/challenge/shortLink.ts` and `scripts/fork-init.ts` never mentions it; the README tells
forks to edit it by hand.

**Resolved on 2026-10-15 (epic 0004-stateless-engine).** `fork:init` gained `--origin`, which sets
A8 (spec 0004-stateless-engine, the short-link origin anchor). Verified, `scripts/fork-init.ts`:
without `--host` and without `--origin`, A8 is left untouched
(`finalOrigin` stays `undefined`, `:1440-1441`); under `--host github-pages` without `--origin`, A8
is re-derived from `--repo` on every run (`deriveGithubPagesOrigin`, `:1075-1080`, used at `:1441`),
and overwriting a value that is neither the new one nor upstream's default warns naming the old and
the new origin (`:1460-1469`; T36-T37/T81 in
`.proj.specs/0004-stateless-engine/traceability.md`). Reproduce with
`pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "re-derives on every run"`.

**Blocks.** Nothing (resolved).

**Not blocked.** Every other part of `fork:init`.

**Revisit when.** The fork workflow is next changed, or a fork ships short links that point here.

---

## OQ-006 — Should the project follow upstream in renaming `CONTEXT.md` to `GLOSSARY.md`?

**Deferred on:** 2026-10-11
**Status:** resolved

**Reason.** Upstream `mattpocock/skills` commit `d80fa0f` (2026-09-17) renamed the domain-glossary
convention from `CONTEXT.md` / `CONTEXT-MAP.md` to `GLOSSARY.md` / `GLOSSARY-MAP.md` in every skill at
once. The project's glossary, its shared instructions and its glossary test all use the old name, and
an epic is in flight whose tickets name `CONTEXT.md`. A rename is only safe when done everywhere in one
change, which is too wide to take mid-epic.

**Evidence.** Verified on 2026-10-11:
- Upstream's commit message and file list: it touches ten skills; the seven this project carries are
  `domain-modeling` (`CONTEXT-FORMAT.md` renamed to `GLOSSARY-FORMAT.md`), `tdd`, `diagnosing-bugs`,
  `improve-codebase-architecture`, `setup-matt-pocock-skills` (`SKILL.md` and `domain.md`),
  `wait-what` and `codebase-design` (`DESIGN-IT-TWICE.md`).
- A file-by-file diff of the project's `domain-modeling` against upstream `main`: the only differences
  are that rename; `ADR-FORMAT.md` and `agents/openai.yaml` are identical.
- Local references to the old name: both skill trees for the seven skills above, `AGENTS.md`,
  `docs/agents/domain.md`, `docs/agents/review.md`, `docs/agents/challenge-pipeline.md`,
  `tests/unit/site/context-glossary.test.ts`, and epic 0001's spec and tickets.

**Resolved on 2026-10-14.** The user chose to rename everywhere in one change, before W4.5
(`create-wxl`) ships the glossary convention to new forks. The glossary is now `GLOSSARY.md`, and
`CONTEXT-FORMAT.md` is `GLOSSARY-FORMAT.md` in both trees. Both trees' `domain-modeling` files
(`SKILL.md`, `GLOSSARY-FORMAT.md`, `ADR-FORMAT.md`) are byte-identical to upstream `d80fa0f`: fetch
each with `gh api "repos/mattpocock/skills/contents/skills/engineering/domain-modeling/<file>?ref=d80fa0f4ebe0c5714af0adf8670336065233ecc6" --jq .content | base64 -d`
and compare with `cmp`. The seven OQ-006 adaptations in `docs/agents/skill-sources.json` are removed:
`setup-matt-pocock-skills` and `tdd` are back to their wording before `f480dcf`, and the five
entries that held only this adaptation are gone. The glossary test now also fails if a
`CONTEXT.md` reappears at the root. Epic 0001's spec and tickets keep the old name as a record of
what was true when they were written, as upstream kept its changelog.

**Blocks.** Nothing. The options as they stood before the decision:
- Keep `CONTEXT.md` permanently and leave the recorded adaptation in place. Ruled in.
- Rename everywhere in one change: the glossary file, the shared instructions, the three
  `docs/agents/` documents, the seven skills in both trees, the glossary test, and references in
  specs and tickets still open. Ruled in.
- Update only some skills. Ruled out: a skill told to create `GLOSSARY.md` when none exists, beside
  others that read `CONTEXT.md`, produces two glossaries.

**Not blocked.** Skill updates that did not touch the glossary name. While this was open, the
adaptation was recorded per skill in `docs/agents/skill-sources.json`, so an upstream comparison
would not mistake the old name for drift.

**Revisit when.** Upstream renames the glossary convention again.

---

## OQ-007 — Can state held in memory be saved back after a site-wide clear?

**Deferred on:** 2026-10-14
**Status:** open

**Reason.** Epic 0001 made the gate's reports truthful about storage; it did not change who may
write to storage. The gate is a notice and a choice, not access control on the machine: what it
guards is readable through the browser's developer tools, and it offers to continue with it. Pages
load stored state into memory without consulting the gate, and every write reopens the database
without consulting it either. Closing that needs a decision about the read and write paths, which was
outside the epic (spec 0001, T41, which names the attack session).

**Evidence.** Verified by reading, not reproduced in a browser:
- `.vitepress/theme/composables/useChallengePersistence.ts:409-415` — `saveAttackSession` is
  `const db = await getDb()` … `await db.put('attack-sessions', plain)`, with no gate check.
  `recordAttempt` checks first (`:599`, called at `:601`): `if (!isProgressAccessAllowed()) throw …`.
  No other write does: `deleteAttackSession` (`:448-450`), `saveActivityTrace` (`:463-465`),
  `saveCodeDraft` (`:629-631`), `saveNote` (`:647-649`) and `deleteNote` (`:658-660`) each start with
  `const db = await getDb()`.
- Stored state is loaded at mount whatever the gate says: notes and the note draft
  (`.vitepress/theme/composables/usePentestNotes.ts:44-50`, `loadNotesBySlug` and
  ``localStorage.getItem(`pentest-draft-${slug}`)``), and the code draft
  (`.vitepress/theme/components/CodeEditorPanel.vue:178`, `loadCodeDraft`), which is saved again after
  an edit (`:89`). On a shared machine that is the previous learner's content.
- The attack session is held in `useAttackSession`'s closure
  (`.vitepress/theme/composables/useAttackSession.ts:92`).
- `.vitepress/theme/composables/useSessionGate.ts:623-624` — a sweep failure ends
  `clearFailurePhaseState.value = 'sweep'` then `return`: the page is not reloaded, so what it loaded
  stays in memory, and the next write recreates the database the delete removed. After a sweep
  failure acknowledged with dismiss, an edit to a note or the code draft can write the previous
  learner's content back.
- `useSessionGate.ts:628` and `:633` — on success `writeMarker()` runs before `reload()`. The two run
  in one synchronous step, so nothing writes between them; the window is after `reload()` has asked
  for the site root and before this document unloads, with the marker already written.

Inferred, not verified:
- Whose attack session: in the tab that runs the clear, the gate was unanswered at load, so
  `useAttackSession` started a new session for the current visitor (`useAttackSession.ts:141-158`);
  another tab of the site that answered continue resumed the previous one.
- `.proj.specs/0001-truthful-clear-reports/review/security-T-0004.md` (F2, confidence 0.4, and its
  note; not reproduced): after a successful clear and reload, such a tab can save its attack session
  back. The decision marker is per tab (`sessionStorage`), so it says nothing about that tab.
- Timing during the delete: a connection taken before `deleteDatabase` calls `forgetDb()`
  (`useChallengePersistence.ts:532`), or opened before the delete request is issued (`:552`), is
  closed for the delete (`:536`, and `blocking()` at `:375-383`) and does not recreate the database.
  A `getDb()` called after the request is issued opens behind the delete and recreates the stores
  once it completes (the upgrade at `:267-384`); if that open outlasts its own timeout
  (`OPEN_TIMEOUT_MS`, `:227`), the request is not cancelled and can still leave an empty database.

More consequences, from the epic's chain analysis
(`.proj.specs/0001-truthful-clear-reports/review/chain-analysis.md`), inferred and not reproduced:
- `localStorage` is written back as well, not only the database: the code-draft checkpoint
  (`.vitepress/theme/composables/codeDraftSnapshot.ts:9`, from `CodeEditorPanel.vue:96`) and saved
  Repeater requests (`.vitepress/theme/components/RepeatPanel.vue:45`, `:63-64`) can restore keys the
  sweep removed.
- A tab that ran a successful clear has the decision marker, so if another tab of the site saves the
  previous learner's attack session back afterwards, this tab resumes that attempt without asking
  (`useAttackSession.ts:112-143`) — chain B.
- A write whose `getDb()` is called after the delete request is issued can land after a successful
  clear, and the tab then loads the previous learner's code draft without asking — chain C.
- The comments that justify dismiss (`useSessionGate.ts:489-500`, `SessionGate.vue:232-245`) weigh the
  current visitor's attack session and a queued delete, not the previous learner's notes and draft
  held in memory.

The epic's close-out ruled (2026-10-14, the user, option A) that this is not a chain that opens a
ticket within epic 0001: the gate is not access control, the reports are true when shown, and the
behaviour predates the epic (`72327e2` already had `dismissClearFailure` and no reload after a sweep
failure), which narrowed the dismiss exit. It is the first candidate for a later epic.

**Blocks.** Any claim that a site-wide clear leaves nothing behind once the report says the database
was deleted. Options: a gate check on every write without one, as `recordAttempt` has (the smallest;
reads keep working); discarding the notes and drafts held in memory when the sweep-failure report is
dismissed; making `getDb()` refuse once a delete has resolved in the document (blocks reads too, for
the rest of the document); a reload after a sweep failure as well (rejected by the epic: it recreates
the locked door dismiss exists to avoid, `SessionGate.vue:14-20`); telling other tabs through a
broadcast channel. `deleteDatabase` does not go through `getDb()` (`useChallengePersistence.ts:528-558`),
so none of these affects a retry.

**Not blocked.** The truth of the reports themselves, which describe the moment they are shown.

**Revisit when.** The session gate's read or write paths change, or a read or write is added to
`useChallengePersistence.ts`.

---

## OQ-008 — Should the gate's fixed sentences stop presupposing saved work where nothing was detected?

**Deferred on:** 2026-10-14
**Status:** open

**Reason.** Spec 0001 kept the strings that presuppose saved work (`title`, `body`,
`body_unconfirmed`, `clear_not_started_hint`) as a stated trade-off, CI-2
(`.proj.specs/0001-truthful-clear-reports/traceability.md:39-44`). Rewriting them is a copy change
outside that epic (T44).

**Evidence.** Verified by reading. The gate usually asks because detection found learner evidence:
`hasData = listLearnerEvidenceKeys().length > 0 || (await hasAnyStoredData())`
(`.vitepress/theme/composables/useSessionGate.ts:425`), then `shouldAskState.value = true` (`:453`).
On two paths it asks without that evidence, and the presupposition is unbacked:
- a restored start record: `if (readClearStarted()) clearStartedState.value = true`, then
  `if (clearStartedState.value) { shouldAskState.value = true … return }` (`useSessionGate.ts:393-401`),
  before any detection;
- detection that throws: `} catch { … shouldAskState.value = true … return }`
  (`useSessionGate.ts:426-435`), where unreadable is treated as unknown.

**Blocks.** A copy rewrite of the gate. Options: separate sentences for the two paths; neutral
wording for all paths.

**Not blocked.** The banned-term rule CI-1 on the strings epic 0001 changed.

**Revisit when.** The gate's fixed copy is rewritten.

---

## OQ-009 — Should the project measure test coverage?

**Deferred on:** 2026-10-14
**Status:** open

**Reason.** The workflow's coverage report table has a "Measured coverage" column, and no coverage
provider is installed, so every table in epic 0001 reads "Not measured". The user chose not to add one
during that epic (T-0001, stage 6).

**Evidence.** Verified: no `@vitest/coverage-*` package in `package.json`; the coverage report tables
under `.proj.tickets/0001-truthful-clear-reports/` record "Not measured" (or "—" for a whole-project
row).

**Blocks.** Measured numbers in coverage report tables. Options: add a provider and report numbers;
keep the column and state "Not measured" by policy.

**Not blocked.** The test plan and coverage tables themselves, which name what is and is not tested.

**Revisit when.** A ticket needs a measured number to decide, or test tooling is next changed.

---

## OQ-010 — Should tracked files be checked for local absolute paths?

**Deferred on:** 2026-10-14
**Status:** open

**Reason.** Review records once carried local absolute paths into tracked files (T-0001 security S-1).
They are caught by hand today. A check needs an allowlist first, because some tracked files contain
such paths on purpose.

**Evidence.** Verified on 2026-10-14: tracked content matching `/Users/<name>` or `/home/<name>`
includes skill scripts and documents under `.claude/skills/` and `.agents/skills/`, pages under
`.archive/`, and test fixtures (`tests/challenge-lint-staged.test.ts:46`,
`tests/unit/composables/usePhpRuntime-adapter.test.ts:14`) — examples, fixtures and path-handling
code, not leaks. A `~/` pattern also matches skill files and binary font files, so it needs the same
allowlist.

**Blocks.** Nothing; the check is manual. Options: a rule in `scripts/verify-project.py`; a CI step
over changed files only.

**Not blocked.** Every review, which already scans its own records.

**Revisit when.** A local path reaches `main`, or `verify-project.py` is next extended.

---

## OQ-011 — Should `vue-tsc` run in CI?

**Deferred on:** 2026-10-14
**Status:** open

**Reason.** Nothing typechecks the project in CI, so a renamed export can silently become
`undefined` in a consumer (T-0001 security S-2). `pnpm exec vue-tsc --noEmit -p tsconfig.json`
reports existing errors, which have to be cleared or baselined first.

**Evidence.** Verified on 2026-10-14: `vue-tsc` is a dev dependency in `package.json`; no workflow
under `.github/` runs it; the command reports 100 errors. Epic 0001's tickets each compared their
run with that baseline (one interim run in T-0005 counted 101 before a fix).

**Blocks.** Typechecking as a gate. Options: fix the 100 errors, then gate; gate on "no new errors"
against a baseline.

**Not blocked.** Running it locally and comparing with the baseline, as epic 0001's tickets did.

**Revisit when.** The 100 errors are cleared, or a renamed export breaks a consumer.

---

## OQ-012 — What should the locale redirect's hold guard while the session-gate choice is open?

**Deferred on:** 2026-10-14
**Status:** open

**Reason.** The redirect to the stored locale waits until the browser session has a decision, on a
page that puts the choice on screen. Its comment used to say the clear deletes `wxl-locale`; the key is exempt
from the clear, so that reason no longer holds, and no other has been recorded (T-0008).

**Evidence.** Verified by reading: the hold and its comment, `.vitepress/theme/index.ts:120-170`; the
exemption, `.vitepress/theme/composables/localStorageKeys.ts:135`. On a page that does not put the
choice on screen the redirect is released when the check settles (`index.ts:145-147`). The `cleared`
decision's own hold, against a navigation racing the reload, is separate and not in question
(`index.ts:149-154`).

**Blocks.** Nothing. Options: release the redirect while the choice is open; keep the hold and
record its reason.

**Not blocked.** The gate's decisions and reports.

**Revisit when.** The locale redirect or the gate's decision values change.

---

## OQ-013 — Should the gate's two untested defensive guards get tests?

**Deferred on:** 2026-10-14
**Status:** open

**Reason.** Two guards are reached by no test, and by reading by no path today either (T-0008,
security review C1, C2, C6). Removing either turns nothing red: verified on 2026-10-14 by deleting
each in turn and running the unit suite (2173 tests passed both times).

**Evidence.** Verified by reading:
- `.vitepress/theme/composables/useSessionGate.ts:444` — `evaluate`'s `if (databaseDeletedState.value)
  return`. `evaluate` runs once per document, at mount, before any clear can start; after a clear
  stopped at the sweep it returns earlier on `clearStarted`.
- `.vitepress/theme/components/SessionGate.vue:220` — the `!databaseDeleted` term of the continue
  `v-if`. Wherever the choice is on screen with the flag set, `clearStarted` is set too.
- `.proj.specs/0001-truthful-clear-reports/review/security-T-0008.md`.

**Blocks.** Nothing today. Both become live if `evaluate` gains a second call site.

**Not blocked.** Everything else in the gate, which its tests cover.

**Revisit when.** `evaluate` gains a call site, or either guard changes.

---

## OQ-014 — Should the gate survive a start record it cannot read back?

**Deferred on:** 2026-10-14
**Status:** open

**Reason.** Spec 0001 lists as an existing limit, with no revisit condition, that a new document which
cannot read the start record treats the machine as untouched
(`.proj.specs/0001-truthful-clear-reports/spec.en.md`, Out of Scope). The epic's chain analysis (chain
D, `.proj.specs/0001-truthful-clear-reports/review/chain-analysis.md`) traced where that leads.

**Evidence.** Inferred from reading, not reproduced: from a state where a delete may be queued (P2,
P7), `sessionStorage` becoming unreadable mid-page, then a refused press and the reload, lands in a
document where `readClearStarted` returns false (`.vitepress/theme/composables/useSessionGate.ts:254-264`);
the gate asks with `body` ("Nothing is deleted unless you choose to delete it") and offers continue,
while the queued delete may still go through. The consequence falls on the current learner only; no
other learner's data is involved (`security-T-0007.md`, F-1, F-5).

**Blocks.** Nothing. Options: a second, independent record (for example in IndexedDB metadata or
`localStorage`); a body that does not promise nothing is deleted when the start record cannot be read.

**Not blocked.** Every path where storage stays readable.

**Revisit when.** A report of storage turning unreadable mid-session in a supported browser, or a
change to how the start record is stored.

---

## OQ-015 — Does the dismiss exit's reasoning hold in Firefox and WebKit?

**Deferred on:** 2026-10-14
**Status:** open

**Reason.** Dismiss is offered only after the latest run failed in the sweep, on the reasoning that its
delete resolved and, since deletes of one database are processed in order, no delete issued before it
is still pending (`.vitepress/theme/composables/useSessionGate.ts:489-494`). That ordering is what the
IndexedDB specification requires, and it was observed in Chromium only (`security-T-0006.md`, I-4).

**Evidence.** Verified: the reasoning and its comment. Not verified: Firefox and WebKit behaviour; the
epic's browser checks ran in Chromium (Playwright smoke and the Browser panel).

**Blocks.** Nothing. If a browser broke the ordering, an earlier delete could still land after dismiss,
with the consequence falling on the current learner's own data.

**Not blocked.** Chromium, where the behaviour was observed.

**Revisit when.** The smoke suite gains a Firefox or WebKit project, or a supported browser is added.

---

## OQ-016 — Should the copy-short-link button hide itself on a GitHub Pages range?

**Deferred on:** 2026-10-14
**Status:** open

**Reason.** `platform/public/_redirects` is the file that makes a short link resolve, and only
Cloudflare Pages reads it; GitHub Pages ignores it, so a short link printed from a GitHub Pages
range's copy-short-link button 404s for whoever opens it. The button itself does not know which host
it is running on (spec 0004-stateless-engine, Out of Scope).

**Evidence.** Verified by reading: the button and its handler are
`.vitepress/theme/components/ShortLinkShare.vue`, used by
`.vitepress/theme/components/ChallengeList.vue:437` and
`.vitepress/theme/components/MergedNav.vue:137,248`; none of the three read a host setting — there
is none to read, since `fork:init` decides the host once, at configure time, and nothing on the
built site records it afterwards.

On a user-site range (`<owner>.github.io`, whose derived short-link origin has no path:
`scripts/fork-init.ts:1078`), a short link is not always a 404: its path is `/c/NNN` or
`/zh/c/NNN` (`.vitepress/challenge/shortLink.ts:49-57`), and if the same owner has a repository named
`c` or `zh` with Pages enabled, GitHub Pages serves that project site under the path, so the link opens
that site's `/NNN` page (repository `c`) or `/c/NNN` page (repository `zh`) (inferred from GitHub
Pages' project-site paths, not reproduced; line numbers at `c142833`). Found by
epic 0004's chain analysis (`.proj.specs/0004-stateless-engine/review/chain-analysis.md`, chain B);
the user decided on 2026-10-16 to record it here rather than open a ticket, since the build-time host
constant below closes it too.

**Blocks.** Hiding or warning on the copy-short-link button for a GitHub Pages range. Options: record
the chosen host as a build-time constant the component can read; detect the host at runtime from the
page's own origin.

**Not blocked.** Cloudflare Pages ranges, where the button already works.

**Revisit when.** A teacher reports a handout short link that 404s, or the fork workflow records the
chosen host in a place the built site can read.

**Decided on 2026-10-20 (spec 0007-gh-pages-range-fixes); closes when 0007 lands.** A teacher did
report it, at the 2026-10-17 workshop. The button neither hides nor records the host. The site
configuration reads `CF_PAGES` at build time (`1` only on Cloudflare Pages' own build), and the
control shows and copies the short link in that case and the challenge page's URL otherwise. A
GitHub Pages range's button therefore no longer hands out an address that depends on redirect rules
the host ignores, and the user-site case above closes too, since no `/c/` or `/zh/c/` path is
handed out there. The page URL still fails to open the range in these cases:
- a `SITE_ORIGIN` that does not name the range's real address, which spec 0007 lists under B4;
- a renamed challenge, under Q10 and Further Notes;
- a learner redirected to a missing Traditional Chinese page (OQ-023), under B4.

Mode rule, link forms and rows M01–M04, L01–L21:
`.proj.specs/0007-gh-pages-range-fixes/traceability.md`. At 0007's close-out, set the status to
resolved and record the verifying evidence here.

---

## OQ-017 — Is driving static build output an adequate stage 8 harness for a configured range?

**Deferred on:** 2026-10-14
**Status:** open

**Reason.** Workflow stage 8 expects behaviour verified on a preview deployment, with a real page
driven in a browser (AGENTS.md hard rule 4). A configured range has no preview: it only exists as
local exports built from `git archive HEAD` into a temporary directory, so epic 0004-stateless-engine's
stage 8 reads the two exports' static HTML and JS directly instead (0004-S7, spec 0004 "Testing
Decisions"). This harness is **provisional** for that epic, stated as an explicit override of both
the workflow's preview-deployment rule and hard rule 4.

**Evidence.** Verified: spec 0004-stateless-engine names the override and says real deployment of a
configured range to both hosts is the user's manual check before the workshop; 0004-S8 still drives
the real, upstream preview deployment through HTTP responses for AC-X2.

**Blocks.** Nothing today. A future epic that changes configured-range behaviour again inherits this
same gap unless it is closed first.

**Not blocked.** The upstream preview, which stage 8 already drives as a real deployment (0004-S8).

**Revisit when.** This project gains a harness that can drive a configured range's build output in a
real browser without deploying it, or the user decides local static-file reads are the permanent
answer and this entry is promoted to an ADR.

**A third override, on 2026-10-21 (spec 0007-gh-pages-range-fixes, D9).** Page mode cannot appear on
a Cloudflare Pages preview, which sets `CF_PAGES=1`. So 0007's stage 8 drives the preview for short
links (V01), and verifies page URLs two other ways. One is a local `pnpm build` without `CF_PAGES`,
served by `pnpm docs:preview` and driven in a real browser (V02). The other is a real, temporary
GitHub Pages range (V04, V05). Hard rule 4 is not overridden: challenge pages are checked with their
Browser panel open. V02 is the kind of harness "Revisit when" asks for, for upstream's own build: a
real browser driving build output that was never deployed. It does not yet drive a configured
range's export, so this entry stays open.

---

## OQ-018 — Can GitHub Pages ranges under one owner be isolated from each other?

**Deferred on:** 2026-10-14
**Status:** open

**Reason.** A GitHub Pages project site is served at `<owner>.github.io/<repo>/`, and every project
site under the same owner shares that owner's one `<owner>.github.io` origin. A learner's browser
therefore gives every GitHub Pages range under one owner the same storage: the same IndexedDB and
localStorage, visible to whichever range's service worker is active, and a site-wide clear run on one
range clears what another range under the same owner stored too (spec 0004-stateless-engine, trust
boundary B5; the glossary's site-wide clear, which this entry annotates).

**Evidence.** Verified by reading: the service worker is registered with no explicit `scope` option,
`navigator.serviceWorker.register(`${import.meta.env.BASE_URL}challenge-sw.js`)`
(`.vitepress/theme/index.ts:253`), so its scope defaults to the directory of that script URL —
`BASE_URL` itself. For a GitHub Pages project site, `BASE_URL` is `/<repo>/`, so the service worker's
own scope is already limited to that project's sub-path; for a GitHub Pages user site
(`<owner>.github.io`, base `/`), its scope is `/`, which spans every other GitHub Pages project site
under the same owner too (spec 0004-stateless-engine, trust boundary B5). That scope does not close
the storage-sharing risk this entry is about: IndexedDB and localStorage are already shared per
browser origin (scheme + host), independent of any service worker's scope. `security-T-0010.md`
records the same origin-sharing fact and that the service worker does not check a
`REGISTER_CHALLENGE` message's sender, and that this ticket made the project-site base automatic, so
the number of working, same-origin GitHub Pages ranges under one owner may grow, not shrink, compared
with the hand-edited `--base` this engine replaces.

**Blocks.** Any claim that a GitHub Pages range's storage, or a site-wide clear run on it, is isolated
from another range under the same owner. Options: a scoped service worker registration path per
range — already the case for a GitHub Pages project site, whose scope is already `BASE_URL`
(e.g. `/<repo>/`), but it does not stop storage sharing, since IndexedDB and localStorage are shared
per origin regardless of service worker scope; a storage key prefix per range (does not stop a
site-wide clear from reading or removing another range's keys); documenting the sharing and leaving
isolation to Cloudflare Pages or a custom domain, each of which gets its own origin.

**Not blocked.** A single range on its own origin (a Cloudflare Pages range, a custom domain, or the
only GitHub Pages range under an owner).

**Revisit when.** A teacher reports storage from one GitHub Pages range appearing in another under
the same owner, or isolating them is designed.

---

## OQ-019 — Do the release workflow's generated release notes satisfy the project's release-note rule?

**Deferred on:** 2026-10-14
**Status:** open

**Reason.** `release.yml` creates a GitHub release with `generate_release_notes` set, which asks
GitHub to compose notes from merged pull requests and contributors. AGENTS.md's Git rule requires
every release note to come from the `tw-emoji-release-note` skill instead, generated and sanitised
before `gh release create` runs. The two mechanisms were never reconciled; epic 0004-stateless-engine
leaves the workflow as it found it (spec 0004, Out of Scope: "handled at the 2026-10-16 release").

**Evidence.** Verified by reading: `.github/workflows/release.yml:83` sets
`generate_release_notes: true` on the release-creation step; `AGENTS.md:78` (hard rule 5, "Skills
own their output") requires every release note to come from the `tw-emoji-release-note` skill
instead, and `docs/agents/language.md:15` requires that note to be in Traditional Chinese.

**Blocks.** Trusting the workflow's own release page as the authoritative release note. Options: turn
off `generate_release_notes` and rely solely on the skill's note; keep both, with the skill's note as
the release body and the generated list kept only as a supplementary, clearly labelled section.

**Not blocked.** Every release already following the skill-driven process by hand.

**Revisit when.** The 2026-10-16 release is cut, which this entry says is when this gets decided.

---

## OQ-020 — When do the settings half of the setup record and the setup page land?

**Deferred on:** 2026-10-16
**Status:** open

**Reason.** Epic 0005 (create-wxl) writes `range.json`'s `upstream` half only (R2): the repository,
version and commit a range was created from. The settings a teacher answered at setup time
(author, repository, host, origin, site name) are not recorded there yet, so a later upgrade has
no stored record of them to reapply. 0004's own Out of Scope section numbered this differently;
this entry supersedes that numbering. The upgrade itself is epic 0006, which `range.json`'s
upstream half makes possible; the settings half of the setup record is epic 0007; the setup page
(a browser UI replacing or complementing create-wxl's terminal questions) is epic 0008.

**Evidence.** Verified by reading: `.proj.specs/0005-create-wxl/traceability.md:22` (decision R2,
"`range.json` holds only `upstream` (repository, version, commit); create-wxl writes it; fork:init
never does") and `:212` (P4's `range.json` schema, which has no settings fields); GLOSSARY.md's
setup record entry ("老師的設定值還沒有記進去").

**Blocks.** Any claim that `pnpm range:upgrade` (or an equivalent) can reapply a teacher's settings
automatically, or that a setup page exists. Options: epic 0007 extends `range.json`'s schema with
the settings half once the upgrade (0006) itself has landed; epic 0008 designs the setup page
against whichever schema 0007 settles on.

**Not blocked.** The upstream half of `range.json` (0005) and any upgrade logic that only needs the
upstream half (0006).

**Revisit when.** Epic 0006 lands and the settings half (0007) or the setup page (0008) is
scheduled.

**Renumbered on 2026-10-20.** The 2026-10-18 stage 1 interview
(`.proj.research/2026-10-18-dev-image-gh-pages-grill.md`, Q1) deferred both epics. Three epics
come first, in order: 0007 is the GitHub Pages range fixes (`.proj.specs/0007-gh-pages-range-fixes/`),
followed by starting without Rust, then the container development environment. Those two take the
next numbers when their specs are written. The settings half and the setup page no longer hold 0007
and 0008: each takes the next free number when it is scheduled. Where this entry says 0007 or 0008
above, read "the settings-half epic" and "the setup-page epic".

---

## OQ-021 — Do `npm create wxl -- <flags>` and `pnpm range:upgrade` work through the registry on the npm and pnpm versions teachers use?

**Deferred on:** 2026-10-16
**Status:** open

**Reason.** create-wxl's own test suite (0005-S1–S3) calls `run()`, `prepareDist` and `checkPublish`
directly (and, for the `bin`, as a subprocess run from a locally-built package directory); stage 8's
terminal runs (0005-S4) run `npx --yes <tarball>` against a tarball `npm pack` built locally. Neither
level ever runs `npm create wxl` or `pnpm create wxl` through the real npm/pnpm registry resolution,
and neither exercises every npm/pnpm version combination a teacher might have installed, nor
`pnpm range:upgrade` (which does not exist until epic 0006). Decision D4 reserves the package name
with a placeholder `create-wxl@0.0.0`, but the registry's own behaviour under real-world npm/pnpm
versions is unverified until the user actually publishes and a teacher runs the command for real.

**Evidence.** Verified by reading: `.proj.specs/0005-create-wxl/traceability.md:27` (decision D4)
and `:350` (X9: `checkPublish` checks only the package name's maintainers, not that the registry
serves the tarball correctly to every client); the ticket's Notes record that publishing to npm is
left to the user, outside this ticket's scope.

**Blocks.** Any claim that `npm create wxl` or `pnpm range:upgrade` is known to work on a teacher's
own machine before the user has published the package and tried it there.

**Not blocked.** create-wxl's own unit and stage-8 tests, which exercise the packed tarball
locally.

**Revisit when.** The user publishes `create-wxl` to npm and a teacher (or the user) runs
`npm create wxl` / `pnpm create wxl` against the published package on their own machine.

---

## OQ-022 — Is a terminal run of the packed package adequate stage 8 for create-wxl?

**Deferred on:** 2026-10-16
**Status:** open

**Reason.** Stage 8 (workflow.md) normally verifies behaviour on the ticket's preview deployment,
in a browser (hard rule 4). create-wxl has no browser surface of its own: it is a terminal command
that creates a range, which is itself a static site verified the usual, browser-based way once it
exists. Epic 0005 and epic 0006 (the upgrade) both verify create-wxl's own CLI behaviour through a
terminal run of the packed package (`npm pack` then `npx <tarball>`), and verify the resulting
range's site results by reading the built files (`.vitepress/dist/`) rather than opening a browser
— a non-browser harness, overriding workflow.md's stage 8 and hard rule 4 for these two epics only
(traceability.md "Overridden contracts").

**Evidence.** Verified by reading: `.proj.specs/0005-create-wxl/traceability.md:372-379`
("Overridden contracts": "create-wxl's behaviour runs in a terminal and is verified there
(0005-S4); the built range's title and origin are read from built files (OQ-022)") and `:381-394`
("Stage 8 inputs": 0005-S4's six runs, 0 and I–IV, all terminal commands and file reads).

**Blocks.** Any claim that create-wxl's own CLI behaviour has been verified in a browser, or that a
terminal-and-file-reads harness is adequate for the ranges create-wxl's downstream epics eventually
expose through a browser UI (e.g. epic 0008's setup page).

**Not blocked.** The ranges create-wxl produces, which are still verified in the browser once built
and deployed, the same as any other range.

**Revisit when.** Epic 0006 (the upgrade) or epic 0008 (the setup page) adds a browser-facing
surface of create-wxl's own, at which point that surface needs the usual browser-based stage 8.

---

## OQ-023 — Should the language redirect send a learner to a Traditional Chinese page that does not exist?

**Deferred on:** 2026-10-21
**Status:** open

**Reason.** Found in stage 3 of epic 0007 (round 1, finding C-1). The user decided on 2026-10-21
(D6 in `.proj.specs/0007-gh-pages-range-fixes/traceability.md`) to record it here rather than fix it
in 0007: it is a defect of the language redirect, independent of the deployment host, and short
links reach it today too.

**Evidence.** Verified by reading:
- `.vitepress/theme/i18n/index.ts`: `DEFAULT_VISITING_LOCALE` is `zh-TW`, and
  `redirectTargetForStoredLocale` sends a learner whose stored preference is missing or `zh-TW` from
  an unprefixed path to its `/zh-TW/` counterpart, without checking that the page exists.
- `.vitepress/theme/index.ts` runs that redirect on the client.
- `pnpm create:challenge` scaffolds only `platform/challenge/<slug>/`, with no Traditional Chinese
  brief (`scripts/create-challenge.ts`).

Inferred, not reproduced: a learner with no stored preference who opens an English page URL, or a
short link that redirects to one, lands on the site's 404 page for such a challenge.

**Blocks.** Any claim that an English page URL or short link always opens its challenge for a
first-time visitor. Options: redirect only when the target page exists; never redirect challenge
pages; scaffold a Traditional Chinese brief with every new challenge.

**Not blocked.** Epic 0007, which states the limit (B4, Further Notes) and verifies English URLs in a
browser profile whose stored language is English (V04).

**Revisit when.** A teacher reports a learner reaching a 404 from a copied English link, or an epic
changes the language redirect or the challenge scaffold.


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

**Reason.** A fork deploys to GitHub Pages only if `.github/workflows/deploy.yml` exists, which
`pnpm fork:init` installs from `scripts/templates/deploy.yml.template`. Turning it off means deleting
the file. A repository variable read by the workflow would let a teacher switch it in the GitHub
UI, but that needs its own design and tests.

**Evidence.** Verified: `scripts/templates/deploy.yml.template` is copied unconditionally by
`fork:init` unless a different `deploy.yml` already exists (README, "After forking").

**Blocks.** Nothing for the current workshop material, which documents both hosts.

**Not blocked.** Cloudflare Pages deployment, which needs no workflow in the repository.

**Revisit when.** Teachers report needing to switch hosts, or the fork workflow is next changed.

---

## OQ-005 — Should `fork:init` rewrite the short-link origin?

**Deferred on:** 2026-10-10
**Status:** open

**Reason.** Short links copy `SITE_ORIGIN` from `.vitepress/challenge/shortLink.ts`, and a fork must
change it by hand; `fork:init` does not touch it. An `--origin` flag is the obvious automation, but
it adds a third identity to keep consistent with `--repo` and `--base`.

**Evidence.** Verified: `SITE_ORIGIN` is a literal in `.vitepress/challenge/shortLink.ts` and
`scripts/fork-init.ts` never mentions it; the README tells forks to edit it by hand.

**Blocks.** Nothing; the manual step is documented.

**Not blocked.** Every other part of `fork:init`.

**Revisit when.** The fork workflow is next changed, or a fork ships short links that point here.

---

## OQ-006 — Should the project follow upstream in renaming `CONTEXT.md` to `GLOSSARY.md`?

**Deferred on:** 2026-10-11
**Status:** open

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

**Blocks.** Nothing today: every skill and document still names the same file. Options:
- Keep `CONTEXT.md` permanently and leave the recorded adaptation in place. Ruled in.
- Rename everywhere in one change: the glossary file, the shared instructions, the three
  `docs/agents/` documents, the seven skills in both trees, the glossary test, and references in
  specs and tickets still open. Ruled in.
- Update only some skills. Ruled out: a skill told to create `GLOSSARY.md` when none exists, beside
  others that read `CONTEXT.md`, produces two glossaries.

**Not blocked.** Skill updates that do not touch the glossary name. The adaptation is recorded per
skill in `docs/agents/skill-sources.json`, so the next upstream comparison does not mistake the old
name for drift.

**Revisit when.** Epic 0001 has landed, and before any scaffolder or template ships the glossary
convention to new forks, whichever comes first.

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

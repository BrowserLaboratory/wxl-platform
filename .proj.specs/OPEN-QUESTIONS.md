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

**Evidence.** Both are addressed in the code this repository starts from (verified by reading):

- `.vitepress/theme/composables/useSessionGate.ts:238` — `markClearStarted()` sets
  `clearStartedState` before `deleteDatabase()` is called at line 486, and persists it to
  `sessionStorage`; the offer to continue is withdrawn while it is set (line 157).
- `.vitepress/theme/composables/useChallengePersistence.ts:551` — the timeout still only races the
  request and does not cancel it, but the failure copy no longer claims nothing was deleted:
  `session_gate.clear_unconfirmed` reads "The outcome could not be confirmed."
  (`.vitepress/theme/i18n/messages/en.json`).

**Blocks.** Nothing.

**Not blocked.** The meaning of `storedWorkGone` (K2–K4: an empty database reported as deleted
work, the continue offer withdrawn on that path, and the wrong half named on retry) is a separate
epic and is not covered by this entry.

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

**Reason.** Carried over from the earlier review register (K13). Tests pin which message a failure
path shows, not whether the message is true on that path.

**Evidence.** Inferred from the register, not re-verified here: rewriting a failure hint into a
sentence that is false on its path (for example, telling the learner to close other tabs on a path
where no tab is involved) turns no test red. The routing assertions live in
`tests/unit/components/SessionGate.test.ts`.

**Blocks.** Nothing directly; it lowers the value of the gate's tests as evidence for copy changes.

**Not blocked.** Fixes to the gate's logic, which have their own tests.

**Revisit when.** The K2–K4 epic changes the gate's failure paths, or the gate's copy is rewritten.

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

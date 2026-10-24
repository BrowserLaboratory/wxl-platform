# Workflow

The nine stages of the delivery pipeline, in order. `AGENTS.md` carries the summary table and the
hard rules; this file carries the entry conditions, gates, and exceptions.

The unit of work is the **epic**: one spec, one pass through stages 1–9, one demoable increment.
Agile principle 7 is the yardstick — working software is the measure of progress, so every epic ends
with something that runs, not with a document.

## Round 0: the walking skeleton

This repository's round 0 was not a skeleton: the platform already existed when the workflow
was adopted, so round 0 was the adoption itself, guarded by the gates that already existed. See
[ADR-0004](../adr/0004-adopt-harness-agile-in-a-running-product.md). The rest of this section is
the general rule, kept for reference.

A **walking skeleton** is the thinnest path that runs end to end. Every layer is the worst possible
version of itself, and every layer is genuinely connected — no mocks, no TODOs, no architecture
diagram standing in for a running process.

It exists to make **seams** real. `/to-spec` requires you to sketch the seams a feature will be
tested at, preferring existing seams; in an empty repository there are none to prefer, so a spec
written first can only describe imagined seams. The skeleton produces the real ones.

**The exemption:** round 0 skips stage 2 (spec) and stage 3 (adversarial review).

**Its expiry:** the exemption ends when the skeleton merges to `main`. From that merge onward every
ticket has a spec behind it. The merge is the terminating ritual, which is why the skeleton still
takes a branch — `tickets/T-0000/walking-skeleton` — rather than committing straight to `main`.

**Its output is the seams, not the code.** Expect most of the skeleton's implementation to be
replaced by the epics that follow. That is the plan working, not the plan failing.

## Stage 1 — Converge the requirement

Run `/grill-with-docs`. It is user-invoked; ask the user to run it rather than trying to invoke it
yourself.

Grilling produces decisions. When a decision is hard to reverse, surprising without context, and the
result of a real trade-off, record it as an ADR (`docs/adr/`) as it settles rather than batching them
at the end.

**Gate:** the user confirms shared understanding. Not "the agent stopped asking questions."

## Stage 2 — Write the spec

Run `/to-spec`. It publishes to `.proj.specs/NNNN-<epic-slug>/spec.en.md`.

Alongside the spec, write `traceability.md`: a single table mapping
`{type × field × boundary} → {expected behaviour → acceptance criterion}`. The spec's prose is
derived from this matrix, so a gap in the matrix is a gap in the spec. This is the single source of
truth that stops the "fix A, miss B" class of revision failure.

When the spec or the matrix points at existing code, name the function, component or test, not a
line number. Lines move during implementation, and a line number pinned to an old commit keeps
reading as current after it has stopped being true.

**Gate:** spec and traceability matrix both exist, every row of the matrix reaches an acceptance
criterion, and the spec's trust-boundary section names every boundary the epic touches or states
that it touches none.

## Stage 3 — Adversarial review

Four independent reviewers, four fixed axes, at most two rounds. Use the active
host's native agents and available models as described in [runtime.md](runtime.md);
run in batches if its concurrency limit is lower than four. Axes, grading, and the frozen-prompt
mechanism live in [review.md](review.md).

**Gate:** zero P0 findings.

**Escalation:** P0 findings surviving round 2 are a signal that the epic is too large, not a reason
to open round 3. Split the epic and restart at stage 1. Adding rounds is how a review stops
converging — the ruler drifts upward and "not converged" becomes an artefact of the moving
threshold rather than a property of the spec.

## Stage 4 — Break into tickets

Run `/to-tickets`. Tickets are **tracer bullets**: each one cuts a narrow but complete path through
every layer and is demoable on its own.

Ticket ids are allocated globally and sequentially (`T-0001`, `T-0002`, …) and never change, because
branch names embed them. Files live under `.proj.tickets/NNNN-<epic-slug>/`. Layout and frontmatter:
[issue-tracker.md](issue-tracker.md).

With the breakdown, show a claim table that maps every row of `traceability.md` to the ticket that
delivers it. A row that no ticket claims is a gap in the breakdown, not a detail for later.

When the epic's behaviour depends on a host (a deployment platform, its CI), the first ticket that
touches deployment runs its stage 8 on a real, temporary instance of that host, not only the
ticket that lands last. Tickets that change the same file in turn are merged into one, or ordered so
that each starts only after the previous one lands.

**Gate:** the user approves the breakdown — granularity, blocking edges, and what each ticket
delivers — and every traceability row is claimed by a ticket.

## Stage 5 — Implement

Branch first: `tickets/<ticket-id>/<ticket-slug>`.

Run `/implement`, which uses `/tdd`. Two tables bracket the loop:

**Before the first test — the test plan table.** The user approves it before any test is written.
This satisfies `/tdd`'s rule that no test is written at an unconfirmed seam.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|

**Between the tables — the red → green loop, governed by `/tdd`.** One seam, one failing test, one
minimal implementation, repeat. Writing every test up front is the horizontal-slicing anti-pattern:
bulk tests verify imagined behaviour. Coverage is not a meaningful number here, because the code
under test does not exist yet.

**When the ticket closes — the coverage report table.** Now the numbers are real.

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|

**Ticket records.** From here through stage 8, every claim in a ticket record that something was
verified carries a command that reproduces it, or a `path:line` pinned to a named commit. When a
record compares against an earlier commit, read that commit with `git show <commit>:<path>` from
the start rather than inferring from the current file.

**Standing authorization.** A standing authorization covers the tickets it names. A new or changed
spec decision (a new D-number) is shown to the user as a short decision summary and confirmed before
it is implemented, even under that authorization.

**Gate:** test plan table approved before the loop starts; coverage report table produced before
stage 6.

## Stage 6 — Review the change

**Entry:** the ticket's `status` is `review`, and every acceptance criterion the implementation
meets is checked in the ticket file.

Run `/code-review`. It reviews on two axes: does the code follow this repo's documented standards,
and does it match what the spec asked for. Direction and requirement are what matter here;
Quality-only cleanup is a separate optional task; use a host-provided simplify
command when available or review the proposed cleanup directly.

## Stage 7 — Security review

Load the active runtime's project `security-review/SKILL.md` on the diff. The cross-cutting chain analysis is not part of this stage; it
runs at epic close-out. See [review.md](review.md).

## Stage 8 — End-to-end

Verify the behaviour against the surface that actually runs it.

- **Browser-reachable surface:** use `/agent-browser` or available native browser tools
  that provide equivalent evidence. For accessibility, verify the applicable criteria
  with accessibility-tree inspection, keyboard interaction and any other required checks.
  `/chrome-devtools-mcp:a11y-debugging` is one option. Unless the user requires that exact
  tool, use an available equivalent before requesting installation. If no tool can obtain
  the required evidence, report the missing capability and leave that criterion unverified;
  dependent gates remain blocked. Screenshots alone do not prove keyboard accessibility.
- **Any other surface** — a native client, a daemon, a CLI, a game server, a device: use a harness
  this project supplies. `/agent-browser` drives Chrome/Chromium and Electron over CDP, so anything
  outside that is outside its reach.

Here the surface is the preview deployment that Cloudflare Pages builds for the ticket branch:
stage 8 runs there before the pull request merges. A challenge page is checked with its Browser
panel open; see [platform-notes.md](platform-notes.md).

Report which surface a verification covered. A browser screenshot is evidence about a browser
surface, and saying so keeps it from being read as evidence about anything else.

Record the choice of non-browser harness as an ADR once it is made; until then it belongs in
`.proj.specs/OPEN-QUESTIONS.md`.

## Stage 9 — Land it

Open a PR from the ticket branch into `main` with `gh pr create`; generate the description with
the project `tw-emoji-pr-note` skill and pass its UTF-8 file with `--body-file`. It merges by
squash, so the ticket's red–green commits become one commit on `main`; generate the squash message
with `tw-emoji-commit` and put the ticket id in its subject. A problem found after landing opens a
new ticket, which names the original ticket in its context.

A PR opened before stage 8 ends, for its preview deployment or its CI, is opened as a draft. Mark it
ready and enable auto-merge only once the ticket's stage 8 record is written. A merge, auto-merge
included, does not notify the agent, so the user says when the PR has landed.

Every `git commit` variant uses `tw-emoji-commit`. Existing user authorization for
landing work remains valid; report unresolved decisions instead of silently choosing
an unexpected remote or base. Update ticket status to `done` once the change is on `main`.

## Epic close-out

After the last ticket of an epic lands:

1. **Vulnerability chain analysis.** Input: every security finding from the epic's tickets, plus the
   trust boundaries the spec describes. Question: can individually low-severity defects be composed
   into a chain? This is epic-scoped rather than ticket-scoped because a chain by definition spans
   units.
2. **Evidence report.** Run `/evidence-report` to produce a standalone HTML report of what the epic
   delivered and what the evidence for it is.
3. **Retrospective.** Agile principle 12 — what to change about how the next epic runs. Decisions
   worth keeping become ADRs; questions not yet answerable go to `.proj.specs/OPEN-QUESTIONS.md`.

## Deferred decisions

Two different things, kept apart:

- A **ticket with `status: pending`** exists and is deliberately paused. It lives in
  `.proj.tickets/` with its reason and evidence in frontmatter.
- An **open question** is not yet a ticket: an architecture-level decision that blocks work
  downstream of it. It lives in `.proj.specs/OPEN-QUESTIONS.md`.

Both record why they were deferred, the evidence behind that call, and the condition that should
bring them back. Before deferring something a teacher or learner would see, reproduce it once on the
surface that runs it, and write what they see into the reason.

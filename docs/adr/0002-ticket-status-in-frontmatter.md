---
status: accepted
date: 2026-10-09
---

# Ticket status lives in frontmatter; the six statuses are views

A ticket file sits at a fixed path, `.proj.tickets/NNNN-<epic-slug>/T-NNNN-<slug>.md`, for its whole
life. Its status is a frontmatter field, and the six statuses (`todo`, `processing`, `review`,
`done`, `pending`, blocked) are queries over the tree rather than directories files move between.

Status-as-directory was the original requirement. It was rejected on three counts: a rename on every
state change produces merge conflicts across concurrent ticket branches; a ticket's path changes, so
every reference to it from a spec, another ticket's `blocked_by`, or a PR description breaks; and a
`block/` directory would duplicate the `blocked_by` edges that already determine blocking, giving
two truths that drift apart.

## Consequences

- Blocked is **derived**, never written: a ticket is blocked when any id in `blocked_by` is not yet
  `done`. There is no way to record a blocked state that contradicts the edges.
- `pending` carries structured reasoning in frontmatter (`pending_reason`, `pending_evidence`,
  `pending_on`, `revisit_when`), which a directory name could not hold. The requirement that a paused
  ticket show why it was paused and with what evidence is what forced this.
- "What can I work on" is a query, not a directory listing. `docs/agents/issue-tracker.md` defines
  the four views.

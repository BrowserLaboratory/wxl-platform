---
status: accepted
date: 2026-10-09
---

# Walking skeleton first, then one pipeline pass per epic

The pipeline in `AGENTS.md` runs **once per epic**, not once per project. Ahead of the first epic,
round 0 builds a **walking skeleton** — the thinnest end-to-end path — and is exempt from the spec
and adversarial-review stages, an exemption that expires when the skeleton merges to `main`.

The exemption exists because `/to-spec` takes seams as input and prefers existing ones, and a new
repository has no source code and therefore no seams. A spec written first could only describe
imagined seams, and an adversarial review of imagined seams is the standard way a review fails to
converge: round 1 fills with "please state this precisely" findings, and every revision adds
specification surface faster than the review retires it. The skeleton's deliverable is the seams;
most of its implementation is expected to be replaced.

## Considered options

- **One pass for the whole project.** Closest to a literal reading of a linear pipeline, but the
  first runnable artefact arrives around two-thirds of the way through, adversarial review has to
  cover a whole-project spec, and any requirement change rewrites that spec. Rejected: it trades
  away Agile principles 1, 2 and 7 to buy nothing.
- **One pass per epic, no skeleton.** Cuts the review surface to one epic and makes change cheap,
  but the *first* epic's spec is still written against zero known seams. Rejected as incomplete.
- **Skeleton, then one pass per epic.** Chosen.

## Consequences

- Round 0 deliberately bypasses two of this project's own rules. The bypass is bounded by the merge
  to `main`, and the skeleton takes a branch (`tickets/T-0000/walking-skeleton`) specifically so that
  merge exists as the terminating event.
- The skeleton's code is disposable by design. Treating it as an architectural foundation would
  defeat its purpose.
- Defining the skeleton is the first question `/grill-with-docs` has to answer, and it needs the
  Project Charter, not the repository.

---
status: accepted
date: 2026-10-09
---

# Adversarial review: four fixed axes, a frozen prompt, two rounds maximum

Spec review runs four independent subagents using the active runtime's available model on four fixed axes — completeness, verifiability, contract
conflict, red team — for at most two rounds, where round 2 replays round 1's prompt file verbatim
and only the spec version changes.

The failure this prevents is a review that never converges because its standard rises between
rounds: free-form reviewers regenerate their own criteria on every run, so "not converged" partly
measures a moving threshold rather than the spec. Fixed axes plus a checked-in prompt file
(`.proj.specs/<epic>/review/prompt.md`) make the ruler an artefact rather than an intention.

## Consequences

- Two rounds is a ceiling, not a target. Surviving P0 findings after round 2 mean the epic is too
  large: split it and restart at stage 1. Adding a third round is the failure mode this ADR exists to
  prevent.
- Findings are graded P0 (blocks ticket creation) / P1 (ticket carries it) / P2 (recorded only), so
  "converged" is checkable rather than a judgement call.
- Reviewers will contradict each other. The user adjudicates; agents do not vote and no arbiter agent
  is added, because either would reintroduce a standard that varies per run.
- The review depends on `traceability.md` existing, which is why stage 2's gate requires it.

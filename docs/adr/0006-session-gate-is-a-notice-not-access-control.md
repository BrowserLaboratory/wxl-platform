---
status: accepted
date: 2026-10-14
---

# The session gate is a notice and a choice, not access control

The session gate asks, on a shared machine, whether the stored work belongs to the person at the
keyboard, and offers to continue with it or to delete it with a site-wide clear. It does not keep the
previous learner's work from the next learner: the gate is not modal and the page behind it stays
usable (OQ-002), pages load notes, drafts and saved requests before anyone answers, and anything stored
is readable through the browser's developer tools. What it does guard is **attribution** — the next
learner's attempts and progress are not joined to the previous learner's records unless they choose
continue (`isProgressAccessAllowed`, `useAttackSession`) — and the **truth of its reports** about what
a site-wide clear removed, at the moment each report is shown. Reviews and specs treat that as the
threat model: the previous learner is not an adversary (they could control the whole browser profile),
and a chain is judged against attribution and report truth, not confidentiality.

Decided at epic 0001's close-out, where a chain (a sweep failure, dismiss, then an edit writing the
previous learner's in-memory notes back) split the chain analysis on whether "previous learner versus
next learner" is a trust boundary; the user ruled it is not one that the gate enforces
(`.proj.specs/0001-truthful-clear-reports/review/chain-analysis.md`). The write-back itself stays open
as OQ-007.

## Considered options

- Treat the gate as access control and hide stored work until the question is answered. Rejected for
  now: it needs a modal gate with `inert` and focus handling (OQ-002) and a gate check on every read
  and write (OQ-007), a redesign rather than a fix; revisit through those open questions.
- Leave the threat model implicit. Rejected: epic 0001's chain analysis had to derive it, and the
  analyst and the challenger derived opposite answers from the same code.

## Consequences

- A spec that touches the session gate states this threat model in its trust-boundary section instead
  of deriving one.
- Making the gate access control later supersedes this ADR.

---
status: accepted
date: 2026-10-14
---

# Session gate copy is pinned by literal truth tests, preconditions first

The session gate's sentences claim things about the machine — that a database was deleted, that an
outcome is unknown, that nothing was deleted. Tests that check which message key a path selects cannot
tell a true sentence from a false one; OQ-003 records, from an earlier review, that rewriting a hint
into a sentence false on its path turned no test red. So the gate's copy is pinned at seam S2
(`tests/unit/components/SessionGate-truth.test.ts`): each test builds the state with the real
composable over fake-indexeddb, asserts the machine state the sentence describes, then compares the
rendered string with a literal written in the test, by exact equality, in en and zh-TW. A copy change
on a pinned path changes the literal in the same commit, and a new gate string or failure path comes
with such a test.

Adopted by epic 0001 (spec seam S2, AC-7). Mutation checks in T-0004, T-0007 and T-0009 turned these
tests red where a key-routing test stayed green, and listing what they pin exposed a state no ticket had
claimed (T34). OQ-003 lists the keys and states pinned today.

## Considered options

- Compare against the message files (`en.session_gate.*`). Rejected: a false sentence in the message
  file passes, which is the defect this exists to catch.
- Snapshot the rendered gate. Rejected: a snapshot is regenerated, not reasoned about, and it asserts
  nothing about the machine state the sentence describes.

---
status: accepted
date: 2026-10-09
---

# Security review separates a challenge's lesson from a defect by its boundary

Every challenge is vulnerable on purpose, so a security review that reports every vulnerability
would block every challenge ticket. A finding is **expected** — recorded, never blocking — when all
three hold: it lives in a challenge's own application (`platform/challenge/<slug>/src/`), it is the
vulnerability that challenge's spec says it teaches, and its effect stays inside the challenge
runtime. Everything else is a **defect** and follows the normal grading:

1. **An unintended solution** — the flag is reachable without exploiting the taught vulnerability.
   Security review flags the candidate; the blind solve (L4) confirms it.
2. **Escaping the challenge runtime** — reaching the platform page, another challenge, or the
   learner's stored work.
3. **Leaking the real flag** — through a white-box challenge's display copy or a build artefact.
4. **Any vulnerability in the platform or CI** — theme, workers, scripts, workflows.

## Considered options

- Exempt everything under `platform/challenge/*/src/` by path. Rejected: unintended solutions and
  runtime escapes both live in exactly that code, and they are the defects that destroy a
  challenge's teaching value or reach the learner's data.
- Skip security review for challenge code and rely on the release-blocking gate. Rejected: the
  blind solve finds unintended solutions but not runtime escapes or flag leaks.

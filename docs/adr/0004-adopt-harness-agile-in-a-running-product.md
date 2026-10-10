---
status: accepted
date: 2026-10-09
---

# Adopt harness-agile in a platform that already runs

This repository starts from a platform that was already in use rather than from an empty
directory, so round 0 was the adoption itself instead of a walking skeleton: the seams already
existed and were already covered by tests. Round 0 carried no spec and no adversarial review; it
had to pass the gates that already guarded the platform — the unit suite, the site build, the
site smoke test, `scripts/verify-project.py` and CI. It is the repository's first commit.

## Consequences

- The previous spec-driven workflow is retired with its tooling: the living capability specs, the
  change archive, the spec-drift CI gate and the multi-lens review protocol. The specs were not
  migrated, because this workflow writes one spec per epic and freezes it after review.
- The site's source root moved from `docs/` to `platform/`, so `docs/` holds only this workflow's
  documents (`docs/agents/`, `docs/adr/`, `docs/security/`) and none of them is published.
- Only Claude Code and Codex are configured. The Gemini and Copilot agent configurations are gone;
  `pnpm challenge:verify --blind --agents` still accepts `gemini`, because that is a product feature
  that spawns runtimes to solve a challenge, not an agent configuration.
- The `wxl-*` challenge skills keep one copy per runtime tree, like every other skill.

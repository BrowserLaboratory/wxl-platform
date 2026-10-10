---
title: Consensus Severity Escalation
kind: method
refs:
  - wiki/concepts/argumentation/argument-quality.md
  - wiki/concepts/argumentation/informal-fallacies.md
  - wiki/raw/papers/doi-10.18653_V1_E17-1017/abstract.md
---

The audit dispatches four sub-agent personas over the same document: SLP (style/listicle), ILL (illogical/argumentation), SHL (shallow/coherence), and HUM (humane signal). Each persona returns its own finding list with character-offset spans, a rule id, and a severity in `{low, medium, high, critical}`. `scripts/output_aggregator.py` then merges these four streams into the final report.

The aggregator groups findings by overlapping span (Jaccard overlap on character offsets at or above 0.5) and counts how many distinct personas flagged each group. When all four personas agree on a span — `N = 4` — the aggregator bumps the merged severity by exactly one tier: `low → medium`, `medium → high`, `high → critical`. The bump is capped at `critical`; a span already at `critical` stays there. Agreement at `N = 3` or below leaves severity untouched, even when three personas concur, because three-of-four is the working majority but not consensus. Disagreement at `N = 1` or `N = 2` likewise produces no bump and no penalty; the finding is reported with its original severity and an `agreement: N/4` field.

## Why four-of-four matters

Treating multi-agent agreement as evidence is itself an argument-quality move (see argument-quality.md, and Stab & Gurevych on argument structure). Four independent personas attacking the same span from four different angles — style, logic, coherence, humane signal — converge only when the underlying problem crosses category boundaries. The escalation rule encodes that intuition: a span flagged by every persona is structurally weaker than one flagged on a single axis, and the report should rank it accordingly. The one-tier cap prevents a single consensus event from saturating the severity scale, which would defeat the purpose of having four tiers in the first place. Aggregator output records `personas: [SLP, ILL, SHL, HUM]` alongside the bumped severity so downstream reviewers can audit the escalation.

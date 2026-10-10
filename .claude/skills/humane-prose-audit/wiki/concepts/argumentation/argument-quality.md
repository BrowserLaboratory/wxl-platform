---
title: Argument Quality (Wachsmuth Framework)
area: argumentation
refs:
  - wiki/raw/papers/doi-10.18653_V1_E17-1017/abstract.md
---

Wachsmuth and colleagues (EACL 2017) consolidate decades of scattered quality criteria into a fifteen-dimension taxonomy organised under three top-level concerns: **cogency** (whether the premises are acceptable, relevant, and sufficient for the claim), **effectiveness** (whether the argument persuades its intended audience — credibility, emotional appeal, clarity, appropriateness, arrangement), and **reasonableness** (whether it contributes to resolving the issue — global acceptability, relevance, and sufficiency). The framework's value is that it separates concerns most writers conflate: a vivid, well-arranged paragraph can be highly effective yet fail cogency, and a meticulously sourced one can be cogent yet unreasonable in context.

## How ILL uses it

The `illogical_critic.md` persona's HUM6 sub-rule on **manufactured-logic chains** leans directly on this taxonomy. LLM-generated prose often produces a paragraph that scans as argument — connectives in the right places, claims handed off cleanly to subclaims — while failing several Wachsmuth dimensions at once: premises that don't actually license the claim (cogency-relevance), examples that don't generalise (cogency-sufficiency), or a conclusion that drifts from the question under discussion (reasonableness-global-relevance). ILL treats this surface coherence as the signal to read more slowly, then names the specific dimension the chain breaks.

**Known limits.** The fifteen dimensions overlap and interact, and Wachsmuth's own annotation study reports only moderate inter-annotator agreement on the finer-grained labels. ILL uses the framework as a diagnostic vocabulary, not a scoring rubric.

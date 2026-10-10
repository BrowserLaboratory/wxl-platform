---
title: Humane Signal Pipeline
kind: method
refs:
  - wiki/concepts/perplexity-and-burstiness/burstiness-definition.md
  - wiki/raw/papers/arXiv-2401.12070/abstract.md
  - wiki/concepts/ai-tells/imperative-fog.md
  - wiki/concepts/readability-and-style/lexical-diversity-mtld.md
---

Phase 4 of the five-phase audit workflow turns the raw signals collected in Phases 1–3 into a single scalar, `humane_score`, on the closed interval `[0, 100]`. The score is a linear weighted combination of five normalised features, each already mapped so that higher means more humane:

- `burstiness` — sentence-length variance, normalised against the corpus baseline (see burstiness-definition.md; the Binoculars paper, arXiv-2401.12070, uses a related cross-perplexity ratio).
- `1 − ai_tells_density` — one minus the per-100-token rate of catalogued tells (delve/tapestry/navigate, em-dash overuse, listicle padding).
- `1 − imperative_fog_density` — one minus the rate of vague directives ("ensure", "leverage", "utilise") per 100 tokens.
- `lexical_diversity_normalized` — MTLD divided by a fixed reference value (default 80) and clipped to `[0, 1]`.
- `1 − boilerplate_stamp_density` — one minus the rate of stock closers ("in conclusion", "it is important to note") per 100 tokens.

## Scoring and verdict interaction

Default weights are `(0.30, 0.20, 0.20, 0.15, 0.15)`, summing to 1.0. The pipeline multiplies the weighted sum by 100 and rounds to one decimal. The default threshold is 60: scores at or above 60 receive `humane_band: high`, scores in `[40, 60)` receive `mid`, scores below 40 receive `low`.

The band is an annotation only. It is appended to the existing verdict (PASS, WARN, or FAIL) as a tag — for example `PASS/humane_band=mid` or `FAIL/humane_band=low` — and never overrides it. A document with zero rule violations can still surface as `PASS/humane_band=low` if its prose is uniform, list-heavy, and lexically thin; conversely a `FAIL` document can carry `humane_band=high` when the failure is a single isolated rule.

Weights and threshold live in `config/humane_signals.yaml`. Tuning is done by replaying a labelled corpus and minimising disagreement between `humane_band` and human prose-quality ratings; no signal is re-weighted at run time.

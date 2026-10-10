---
title: Burstiness in Prose
area: perplexity-and-burstiness
refs:
  - wiki/raw/papers/arXiv-2401.12070/abstract.md
---

Burstiness describes the unevenness of a text along some local statistic — most often the per-token log-probability under a reference model, but in plainer settings the per-sentence token length. Human writers tend to alternate short, punchy sentences with longer, looser ones; the variance of those lengths is what we call burstiness. LLM-generated prose, by contrast, drifts toward a steady cadence: sentences of similar shape, similar length, similar rhythm.

## Why sentence length works as a proxy

The Binoculars work (Hans et al., 2024) frames machine text as text that sits unusually flat under a language model — the per-token surprisal has low variance. We do not run a language model in this audit. The check at `humane-prose-audit/checks/burstiness.py` computes the variance (and coefficient of variation) of token counts across sentences, which is a cheap, deterministic stand-in: rhythm at the sentence scale correlates with the perplexity rhythm Binoculars cares about, without any forward pass. This is a deliberate non-goal in `design.md` — no model weights, no GPU, no flaky network calls.

Limitations are real. Translated text, technical writing with rigid templates, and short pieces (fewer than roughly a dozen sentences) all collapse the signal. Heavy editing by a human after a model first draft can also raise burstiness back into the human range. Treat a low score as a smell, not a verdict.

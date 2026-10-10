---
title: DetectGPT — Curvature of Log-Probability
area: perplexity-and-burstiness
refs:
  - wiki/raw/papers/arXiv-2301.11305/abstract.md
---

Mitchell et al. (2023) propose DetectGPT, a zero-shot detector built on a geometric observation: text sampled from a language model tends to occupy local maxima of that model's log-probability surface. If you perturb a machine-generated passage — paraphrase a span, swap a few tokens — the perturbed version almost always has lower log-probability than the original. Human text shows no such curvature; perturbations move the score roughly symmetrically up or down.

## What we borrow, what we skip

DetectGPT compares the original log-probability against the average log-probability of many perturbations and flags a sharp drop. The signal is principled and per-passage, but it costs hundreds of LLM forward passes plus a perturbation model (the paper uses T5). The check at `humane-prose-audit/checks/burstiness.py` does not implement DetectGPT. Per `design.md`, this audit stays deterministic and offline: no model loading, no perturbation sampling, no log-probability scoring. DetectGPT lives here as conceptual grounding — it is the reason we believe sentence-level variance is worth measuring at all, because the curvature it exposes is one face of the same flatness that shrinks sentence-length variance in machine prose.

Known limits of DetectGPT itself: it assumes white-box access to the generating model (or a close surrogate), degrades under sampling temperature changes, and is fragile to light human editing. Subsequent work — notably Binoculars — sidesteps the white-box requirement.

---
title: Binoculars — Two-Model Contrast Score
area: perplexity-and-burstiness
refs:
  - wiki/raw/papers/arXiv-2401.12070/abstract.md
---

Hans et al. (2024) introduce Binoculars, a zero-shot detector that scores a passage by contrasting two pre-trained LLMs of similar size — an observer model and a performer model. The score is the ratio of the observer's perplexity on the text to the cross-perplexity between observer and performer. Human prose pushes the ratio one way; machine prose, which the two models agree on much more tightly, pushes it the other. Binoculars reports state-of-the-art detection without fine-tuning and without access to the original generator, which was DetectGPT's main constraint.

## Relation to the deterministic checks

Both `humane-prose-audit/checks/burstiness.py` and `humane-prose-audit/checks/lexical_diversity.py` are deterministic proxies inspired by this family of work, not implementations of it. Binoculars and its peers measure flatness in token-level log-probability space using actual language models. The audit measures flatness in sentence-length space and vocabulary-spread space using counts. The trade is honest: we lose detection accuracy and gain reproducibility, zero dependencies, and the ability to run inside a CI hook without GPU or network.

Limitations worth flagging: Binoculars itself struggles on very short inputs, on multilingual text where the chosen observer/performer pair is undertrained, and on text that has been hand-edited after generation. The proxies inherit these failure modes and add their own — a score from `burstiness.py` is a hint that something is worth a closer human read, never a label.

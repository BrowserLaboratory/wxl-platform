---
title: Listicle Structure — Three or Five Parallel Bullets
area: ai-tells
refs:
  - wiki/raw/papers/arXiv-1906.04043/abstract.md
---

When asked to explain almost anything, current LLMs reach for a bulleted list of three or five items whose sentences share the same shape: same opening part of speech, similar length, and a short bold lead-in followed by a colon. Human writers use lists too, but the lengths vary, items break parallel form when the content demands it, and the surrounding prose carries most of the argument.

## Why it reads as a tell

Three and five are local maxima in the model's prior over list lengths: long enough to look thorough, short enough to fit a typical response budget. Strict parallelism is a byproduct of autoregressive sampling — once the first bullet establishes a template, each subsequent bullet's most-probable continuation matches that template. *GLTR* ([Gehrmann et al. 2019]) visualizes this directly: bullet starts in machine text are dominated by top-rank tokens, whereas human bullet starts scatter across the rank distribution.

Two checks cooperate. `checks/ai_tells.py` flags documents whose bullet-list lengths cluster at 3 or 5 across multiple lists. `checks/repetition_fingerprint.py` measures syntactic similarity between sibling bullets — shared opening n-grams, matching POS prefixes, length variance below a threshold — and reports the highest-similarity group.

Technical reference material legitimately uses parallel bullets (API parameter tables, step-by-step procedures). The check is calibrated to fire on explanatory and persuasive prose, where a wall of identically shaped bullets usually signals that the model defaulted to structure instead of writing the argument out.

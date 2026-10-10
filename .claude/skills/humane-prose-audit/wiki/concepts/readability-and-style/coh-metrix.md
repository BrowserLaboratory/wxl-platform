---
title: Coh-Metrix
area: readability-and-style
refs:
  - wiki/raw/papers/doi-10.3758_BF03195564/abstract.md
---

Coh-Metrix (Graesser, McNamara, Louwerse, & Cai, 2004) is a text analysis
framework that produces more than a hundred measures of cohesion,
coherence, lexical diversity, syntactic complexity, and readability. Its
guiding idea is that a single readability number hides more than it
reveals: two texts with the same Flesch score can differ wildly in how
well one sentence connects to the next, how varied the vocabulary is, and
how heavy the syntax sits.

The framework groups its measures into families. Referential and
semantic cohesion track noun and content-word overlap across adjacent
sentences. Connective and discourse-marker density approximates how
explicitly the author signals logical structure. Lexical diversity
families include type-token ratio variants. Syntactic complexity
measures pull from parse trees.

## How the audit uses it

`humane-prose-audit` does not embed Coh-Metrix as a dependency. Instead,
three checks each re-implement a narrow slice of one Coh-Metrix family:

- `checks/discourse_marker_density.py` — connective frequency, the
  cohesion-marker family.
- `checks/lexical_diversity.py` — MTLD, the diversity family.
- `checks/burstiness.py` — sentence-length variance, a rough proxy for
  the syntactic-rhythm family.

Each check is a focused signal designed to fire on a specific AI-prose
tell, not to reconstruct the full Coh-Metrix profile.

The framework's limits are honest ones the authors flag themselves:
parser quality bounds the syntactic measures, English-language norms
shape every threshold, and any single index is too thin to call a text
"good" or "bad" on its own.

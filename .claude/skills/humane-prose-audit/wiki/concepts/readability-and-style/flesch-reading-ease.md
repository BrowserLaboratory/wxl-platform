---
title: Flesch Reading Ease
area: readability-and-style
refs:
  - wiki/raw/papers/doi-10.3758_BF03195564/abstract.md
---

Flesch Reading Ease (Flesch, 1948) is one of the oldest text difficulty
scores still in everyday use. It maps a passage to a single number on a
roughly 0–100 scale: higher means easier. A score near 60 is what most
American newspapers aim for; academic prose often sits below 30.

The formula is fixed and refreshingly small:

```
206.835 − 1.015 × (words / sentences) − 84.6 × (syllables / words)
```

Only two surface signals matter: average sentence length and average
syllables per word. The score punishes long sentences and Latinate
vocabulary, which is why technical writing tends to look "hard" even when
the ideas are simple.

## How the audit uses it

`humane-prose-audit/checks/readability_metrics.py` extracts paragraphs
that look like English (≥80% ASCII letters and spaces), runs `textstat`'s
Flesch implementation per paragraph, and averages the result. A
configurable band (`flesch_min`, `flesch_max` in `config.yaml`) decides
whether to emit a Medium finding. The check intentionally skips
non-English paragraphs because syllable estimation collapses on CJK text.

Known limits, also surveyed in Graesser et al.'s Coh-Metrix work, are
worth keeping in mind. The formula is English-only; syllable counting is
heuristic and brittle on names and neologisms; and the score is blind to
cohesion, argument structure, and word familiarity. A clear text full of
short, choppy fragments can score higher than a well-crafted long
sentence. Treat Flesch as a coarse smoke test, not a verdict.

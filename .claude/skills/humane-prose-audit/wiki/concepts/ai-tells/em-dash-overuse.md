---
title: Em Dash Overuse as Rhetorical Pivot
area: ai-tells
refs:
  - wiki/raw/papers/arXiv-2401.12070/abstract.md
---

Em dashes (and to a lesser extent en dashes used as em dashes) appear in LLM output at rates several times higher than in matched human corpora. The giveaway is not a single em dash — most careful writers use them — but the pattern: nearly every paragraph contains one, and the dash typically sits mid-sentence to pivot from a claim to a softening qualifier or restatement.

## Why it reads as a tell

The em dash is rhetorically cheap. It lets the model hedge or amplify without committing to a new sentence boundary, which is useful when the next clause has been sampled to sound balanced rather than to say something specific. Detectors that compare a passage's perplexity against a reference model see the same hedging from a different angle: the dashed continuation is exactly the kind of low-surprise, high-fluency token sequence that *Binoculars* ([Hans et al. 2024]) reports as separating machine from human text even at short lengths.

`checks/ai_tells.py` counts em and en dashes per 100 words and flags documents above a configurable density, and separately flags paragraphs containing two or more em dashes. The output includes raw counts so reviewers can distinguish a stylistic preference from a fingerprint.

Caveats: fiction, personal essays, and some house styles (parts of *The New Yorker*, for instance) use dashes heavily by design. The rule earns its keep on technical, business, and educational prose, where the baseline rate is low.

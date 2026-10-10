---
title: Lexical Diversity (MTLD)
area: readability-and-style
refs:
  - wiki/raw/papers/doi-10.3758_BRM.42.2.381/abstract.md
---

Measure of Textual Lexical Diversity (MTLD), introduced by McCarthy and
Jarvis (2010), tries to fix a well-known flaw in the simplest vocabulary
metric. Plain type-token ratio (TTR) — unique words divided by total
words — collapses as a text grows longer, because the same function
words keep reappearing. MTLD sidesteps the length problem by counting
how *quickly* a running TTR decays.

## Mechanism

Walk the text token by token, keeping a running TTR over the current
sub-sequence. The moment TTR falls to or below 0.72 (the factor
threshold the paper validated empirically), close that sub-sequence,
count it as one *factor*, and start a new one. After the forward pass,
repeat backwards from the end. MTLD is the mean of `total_tokens /
factors` across both directions, with a fractional credit for the
trailing partial sub-sequence. Higher values mean the writer refreshes
vocabulary more often before the TTR floor is hit.

`humane-prose-audit/checks/lexical_diversity.py` implements this
faithfully: code fences are stripped first (repeated identifiers would
otherwise pull MTLD down), tokens are lower-cased, and `MIN_WORDS = 50`
guards against scoring tiny snippets. Severity bands are MTLD ≥ 60 no
finding, 40–60 low, below 40 medium — the band of "noticeably narrow
vocabulary" that LLM output often falls into when a model recycles its
favourite anchors.

Known limits: MTLD still needs enough text to stabilise (the 50-word
floor is conservative, not generous), it is lemma-blind so inflected
forms count as distinct types, and it has no notion of whether the
recycled words are *content* words or harmless function-word noise.

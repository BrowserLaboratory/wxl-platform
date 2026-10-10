---
title: Centering Theory
area: coherence
refs:
  - wiki/raw/papers/doi-10.3115_1614049.1614066/abstract.md
---

Centering Theory, formalised by Grosz, Joshi, and Weinstein in 1995, models *local* coherence — the glue between one utterance and the next. Each utterance has a set of forward-looking centers (the entities it mentions, ranked by grammatical salience) and a single backward-looking center (the entity it is "about", inherited from the previous utterance). Transitions between utterances are typed: Continue, Retain, Smooth-Shift, Rough-Shift. Coherent text prefers Continues; jumpy text piles up Shifts.

The theory's most-used downstream claim is the pronoun rule: if any entity is pronominalised, the backward-looking center must be. Violations correlate with reader confusion about who "she" or "it" refers to.

## How the audit uses it

`checks/pronoun_consistency.py` is a thin implementation of that rule. For each adjacent sentence pair it picks the most salient antecedent in the prior sentence (subject preferred over object, named entity preferred over indefinite) and asks whether the next sentence's pronoun resolves to it. When a pronoun could plausibly attach to two ranked candidates, the check flags an attention-shift ambiguity rather than guessing. The thresholds for "too many shifts per paragraph" come from Karamanis (2006), who evaluated Centering-based metrics for sentence ordering and reported per-domain shift rates for human-written prose.

Known limits: Centering was specified for spoken dialogue and short paragraphs; long expository prose has multiple competing center chains. The check uses a single-chain approximation and will miss legitimate topic shifts that a human reader would accept. It is calibrated for false-positive tolerance, not recall.

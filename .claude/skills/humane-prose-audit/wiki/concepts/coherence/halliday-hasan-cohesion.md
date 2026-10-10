---
title: Halliday and Hasan's Cohesion
area: coherence
refs:
  - wiki/raw/papers/doi-10.3758_BF03195564/abstract.md
---

Halliday and Hasan's 1976 book *Cohesion in English* separates two ideas that earlier work had run together. *Coherence* is the reader's sense that a text hangs together. *Cohesion* is the inventory of surface devices that produce that sense: reference (pronouns, demonstratives), substitution, ellipsis, conjunction (the connective vocabulary), and lexical cohesion (reiteration, synonymy, and chains of related content words). Cohesion is necessary but not sufficient — a text can be cohesive and still incoherent, and a text can cohere through purely inferential links — but cohesive ties are what an analyst can actually count.

The framework's lasting contribution is the *lexical chain*: a sequence of content words across a text that refer to the same concept by repetition, synonym, hyponym, or collocation. Dense, well-formed chains track the topic; broken or runaway chains track drift.

## How the audit uses it

Two checks lean on this taxonomy. `checks/repetition_fingerprint.py` is a lexical-chain proxy — it tracks repeated lemmas and near-synonyms across a sliding window, flagging both abnormal repetition (a chain that loops on the same noun) and abnormal drift (no chain survives past two sentences). `checks/discourse_marker_density.py` covers the conjunction category, counting explicit connectives per paragraph. Both thresholds are tuned against Coh-Metrix (Graesser et al. 2004), which operationalises Halliday and Hasan's cohesion categories at corpus scale and reports baseline distributions for expository writing.

Known limits: surface counts conflate good cohesion with verbose cohesion; lexical chains via lemma matching miss pronoun-mediated reference. The checks complement, not replace, the ILL critic's reading.

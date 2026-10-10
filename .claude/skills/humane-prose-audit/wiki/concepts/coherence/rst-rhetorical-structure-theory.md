---
title: Rhetorical Structure Theory (RST)
area: coherence
refs:
  - wiki/raw/papers/doi-10.3758_BF03195564/abstract.md
---

Rhetorical Structure Theory, introduced by Mann and Thompson in 1988, treats a text as a tree. Each span of prose is either a nucleus (the part that carries the main load) or a satellite (material that supports it), and adjacent spans are joined by a named rhetorical relation: Elaboration, Contrast, Cause, Background, Evidence, and roughly two dozen others. The whole document collapses, recursively, into a single root nucleus.

The theory makes two claims worth keeping. First, coherent prose has a recoverable tree — a reader can name why one sentence follows the next. Second, those relations are usually signalled at the surface by discourse markers ("however", "because", "for example"), though the signal is noisy and sometimes absent. RST became the spine of most discourse parsers and of the RST Discourse Treebank.

## How the audit uses it

`checks/discourse_marker_density.py` does not parse RST trees; it tracks the per-paragraph rate of explicit connectives. Over-clustering ("Moreover... Furthermore... Additionally...") flags a writer who is naming relations the prose has not earned. `prompts/illogical_critic.md` reasons one level up — the ILL persona asks whether the implied nucleus-satellite structure actually holds, or whether a "therefore" is bridging two unrelated claims. Coh-Metrix (Graesser et al. 2004) operationalises RST-adjacent connective and relation densities, and the check uses thresholds tuned against its reported ranges.

Known limits: RST annotation has poor inter-annotator agreement on relation labels, trees are not unique, and marker counts ignore the many relations that are implicit. The check is therefore a coarse smoke alarm, not a parse.

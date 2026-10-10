---
title: Delve, Tapestry, Navigate — Signature LLM Vocabulary
area: ai-tells
refs:
  - wiki/raw/papers/arXiv-1906.04043/abstract.md
---

A small set of English words appears at vastly higher rates in LLM output than in human-written prose of comparable register: *delve*, *tapestry*, *navigate*, *leverage*, *realm*, *deep dive*, *comprehensive understanding*, *play a crucial role*. These are not rare or wrong words on their own. What flags them is the joint distribution — several of them clustering in one short passage, regardless of topic.

## Why it reads as a tell

Instruction-tuned models inherit a strong prior toward elevated, reassuring register because their reward signal favors confident, polished completions. Token-probability detectors notice the same thing from below: in a long passage of human writing, surprising word choices show up regularly; in model output, every word sits near the top of the rank list ([Gehrmann et al. 2019]). The vocabulary cluster is the human-visible shadow of that flatness.

`checks/ai_tells.py` matches a curated lexicon against the token stream and flags any document where the per-thousand-token rate of these terms crosses a configurable threshold, or where two or more occur within a single paragraph. It reports counts and offsets rather than a single score, so reviewers can read the actual sentences before judging.

The list is a moving target. Models drift, fine-tuners deliberately suppress known tells, and some domains (literary criticism, policy writing) legitimately use this register. The check is a smoke alarm, not a verdict.

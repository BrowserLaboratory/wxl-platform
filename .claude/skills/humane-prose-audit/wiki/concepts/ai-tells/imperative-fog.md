---
title: Imperative Fog — Vague Action Verbs
area: ai-tells
refs:
  - wiki/raw/papers/arXiv-2301.11305/abstract.md
---

*Imperative fog* names a family of soft directives that sound actionable but specify no action: *ensure that…*, *make sure to…*, *consider…*, *it is important to…*, *be mindful of…*, *strive to…*. A human writer giving instructions usually names the actor and the verb (*the reviewer checks the diff*, *run `pytest -x`*). LLM output tends to address an unnamed reader and gesture at a category of behavior.

## Why it reads as a tell

Instruction-tuned models are trained to be helpful without being presumptuous, which biases them toward sentences that can never be wrong because they assert nothing falsifiable. The result reads like a checklist with the checks removed. From the detector side, *DetectGPT* ([Mitchell et al. 2023]) shows that model text sits in a flat region of log-probability where small perturbations barely change the likelihood — exactly what you would expect from sentences whose content is generic enough to survive paraphrase.

`checks/imperative_fog.py` matches a phrase list against sentence-initial positions and across short windows, then reports density per 100 sentences and flags sentences where the fog phrase carries the only verb. That last condition matters: *ensure the build passes by running `make test`* is fine; *ensure that quality is maintained* is not.

The check has false positives in genuine policy and safety writing, where vague directives are sometimes required by regulation. Tune the threshold per domain.

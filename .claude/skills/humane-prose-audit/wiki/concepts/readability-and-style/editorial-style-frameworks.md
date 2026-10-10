---
title: Editorial Style Frameworks
area: readability-and-style
refs:
  - wiki/raw/papers/doi-10.3758_BF03195564/abstract.md
---

Where Coh-Metrix and MTLD give numbers, editorial style frameworks give
rules. Four bodies of advice sit behind the sentence-level judgements
this skill makes about prose:

- **Strunk & White, *The Elements of Style*** — terse maxims: omit
  needless words, use the active voice, prefer the specific to the
  general.
- **Joseph Williams, *Style: Toward Clarity and Grace* (1981)** — a more
  analytical successor that talks about characters as subjects, actions
  as verbs, old-information-first sentence flow, and nominalisation as
  the central style smell.
- **The Associated Press Stylebook** — newsroom conventions: short
  leads, attribution norms, numerals, the serial-comma question.
- **The Chicago Manual of Style** — the long-form publishing reference
  for citation, hyphenation, capitalisation, and structural editing.

None of these is a paper one can cite in the academic sense; together
they form the working canon a copy editor carries.

## How the audit uses them

`humane-prose-audit/prompts/sloppy_writer.md` is the SLP (Sloppy-writer
Linter Persona) prompt. It asks the LLM reviewer to read the target
text the way a copy editor schooled in the four sources above would:
flagging nominalised verbs, buried subjects, mushy hedges, redundant
pairs, and AP/Chicago house-style slips. These are exactly the
sentence-level violations that Coh-Metrix-style metrics cannot see —
two passages can share an MTLD score and a Flesch number while one
follows Williams's character-action principle and the other does not.

The limit is the usual one for rule-based style advice: the rules were
written for American journalism and academic English, and do not
transplant cleanly into fiction, dialogue, or technical reference. The
SLP prompt is calibrated for non-fiction explanatory prose; outside
that register its findings need a human filter.

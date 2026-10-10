# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a **Claude Code skill plugin** that teaches Claude to emulate Phoenix's popular science writing style — Traditional Chinese (Taiwan) educational articles on **any technical or educational domain**, combining academic rigour with a conversational, humorous tone. The skill includes a **visual content system** for specifying AI-generated illustrations, and a **domain reference framework** that separates domain-specific content (e.g., infosec legal frameworks, CTF exercises) from the core style guide.

## Structure

```
SKILL.md                          — The skill definition: frontmatter + full style guide (domain-agnostic)
reference/                        — Detailed examples, templates, catalogs referenced by SKILL.md
  templates.md                    — General writing templates (chapter opening, closing, objectives, callouts)
  dialogue-voices.md              — Five reader dialogue voice types with examples
  kaomoji-catalog.md              — Kaomoji catalog with usage-context notes
  humor-patterns.md               — Self-deprecation patterns and humor guidelines
  concept-escalation-example.md   — 10-step concept escalation worked example (generalized)
  tw-vocabulary.md                — Taiwan Traditional Chinese vocabulary conventions
  visual-guide.md                 — Visual content system examples, style prefix library, prompt guide
  editorial-rules.md              — 15 paragraph-level editorial rules + EAL+ verification framework
  domain-infosec.md               — Domain reference: information security (CTF, legal framing, ethical questions)
temp-reference/                   — Local reference .docx files (gitignored, not part of the skill)
.claude/                          — Claude Code local settings
```

## Key Files

- **`SKILL.md`** — The single source of truth for the skill. The YAML frontmatter (`name`, `description`) is what the Claude Code harness uses to register and invoke this skill. The body is the style guide Claude reads at runtime.

## Skill Invocation

The skill is triggered when the user says: `"write in Phoenix style"`, `"continue writing this book chapter with Phoenix"`, `"use Phoenix's tone"`, or asks to convert technical content into Traditional Chinese popular science prose.

## Editing the Skill

When modifying `SKILL.md`:
- The frontmatter `description:` field is what the harness matches against to decide when to auto-invoke the skill — keep it precise and trigger-phrase-rich. Do not add domain-specific terms (e.g., "information security") here.
- Style rules in sections 1–11 are the operative instructions Claude follows. Changes here directly affect writing output.
- Kaomoji examples in the table (section 3) must be accurate Unicode — copy from verified sources rather than typing from memory.
- Section 9 (Visual Content System) defines the visual taxonomy, spec format, and rhythm rules. When adding visual types or changing rules, update `reference/visual-guide.md` examples accordingly.
- The "Things to Avoid" table (section 10) is a negative constraint list — additions here carry equal weight to the positive rules.

When modifying domain reference files (`reference/domain-*.md`):
- Follow the 5-section structure: Overview, Contextual Framing Implementation, Hands-on Practice Format, Rhetorical Devices & Closing Extensions, Domain Vocabulary.
- Domain-specific content must NOT leak back into SKILL.md — keep SKILL.md domain-agnostic.
- When adding a new domain, use `domain-infosec.md` as a structural template.

## Editorial Rules Structure

```
reference/
  editorial-rules.md              — 15 paragraph-level editorial rules (authoritative definitions)
```

- **`reference/editorial-rules.md`** contains the full rule definitions, EAL+ verification framework, and rule evolution methodology. SKILL.md §10.5 has a compact summary table; full details live in this reference file.
- Section 10.5 and §11 EAL+ overview in SKILL.md reference this file — keep them in sync when rules change.

## Adding New Editorial Rules

When a manual editing pattern is observed repeatedly, it may warrant a new rule. Follow this protocol (full details in `reference/editorial-rules.md` § Rule Evolution):

1. **Identify**: Same editing pattern appears 3+ times across different files/sections
2. **Formalize**: Write a rule definition with judgment criteria and violation/compliance examples. The rule's is/not judgment must be objective, or resolved via a judgment checklist (like P-1's 5-point checklist)
3. **Test**: Run 4 tests — positive (known violations caught), negative (good passages produce zero false positives), boundary (ambiguous cases resolved), cross-impact (fixing rule A doesn't violate rule B)
4. **Add**: Update `reference/editorial-rules.md` with the new rule, update SKILL.md §10.5 summary table, and if the rule is programmatically detectable, update the validator scripts

## Spectra

Specs and changes for this skill are managed in the parent directory (`custom_skills/openspec/`). See the parent `CLAUDE.md` for Spectra workflow instructions.

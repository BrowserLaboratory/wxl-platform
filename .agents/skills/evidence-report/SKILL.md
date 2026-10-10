---
name: evidence-report
description: Produce a standalone HTML report whose every claim is traced to its evidence. Use at a grilling convergence point, when reporting adversarial-review findings, at epic close-out, or whenever a decision, comparison, or set of findings needs to be presented to the user with sources they can check. Output is a single self-contained .html file in the repo, written in Traditional Chinese.
---

# Evidence Report

A report the user can audit. Every factual claim carries its source and a confidence tier, so the
reader can tell what was verified from what was inferred without re-doing the work.

Reach for it when the output is a **decision, a comparison, or a body of findings** — the shapes
where a reader needs to check the reasoning. Prose in the terminal is right for a status update.

## Output contract

- **One self-contained `.html` file.** All CSS and JS inline, images as `data:` URIs, **zero external
  requests**. Standalone means it opens offline, from a file path, in five years.
- **System font stack only.** A webfont CDN degrades silently offline, which discards the typography
  the report was designed with. Use `-apple-system, "Segoe UI", "PingFang TC", "Noto Sans TC",
  sans-serif` and a matching serif or mono stack for secondary roles.
- **Location.** Epic-scoped: `.proj.specs/<NNNN-epic-slug>/reports/<slug>.html`. Project-scoped:
  `.proj.specs/_reports/<slug>.html`. Committed.
- **Language.** Traditional Chinese, Taiwan usage — see `docs/agents/language.md`. Technical terms
  that Taiwan practice keeps in English stay in English.
- **Naming.** Descriptive: `q1-pipeline-cadence.html`, not `report.html`. A rewrite becomes
  `<slug>-v2.html`; keep the previous version.

## The evidence table

Every report ends with a table listing each factual claim, its source, and its tier. Three tiers,
and the distinction between them is the point of the report:

| Tier | Meaning |
|---|---|
| **已驗證** | Read the file, ran the command, saw the output. Cite `path:line` or the command. |
| **推論** | Derived from verified facts, not directly observed. Say what it was derived from. |
| **外部** | From the web or a document outside the repo. Cite the source. |

Two rules make the tiering worth trusting:

- **Tier claims, not sentences.** If a paragraph mixes an observed fact with an inference, it holds
  two claims and they get separate rows.
- **State what the report does not claim.** A short section naming what is out of scope stops an
  illustrative example from being read as a decision.

## Structure

1. **The answer first.** The recommendation or conclusion, before the reasoning.
2. **The question restated.** What is actually being decided, and what depends on the answer.
3. **The body.** Options, findings, or comparison — whatever the report is for.
4. **The evidence chain.** Why the conclusion follows, as a traceable sequence rather than an
   assertion.
5. **The cost.** What the recommendation gives up. A report that lists only upside is not auditable.
6. **The evidence table**, plus the out-of-scope note.
7. **The decision the user has to make**, stated as a question they can answer in one line.

## Design

Design the page for its subject. The report is read once, carefully, by one person deciding
something — that calls for typographic hierarchy, considered spacing, and a deliberate palette, not
decoration.

- **Encode information in structure.** Numbered markers belong on an actual sequence; a severity
  stripe belongs on something with severity. A structural device that encodes nothing is noise.
- **Pick the neutral.** A grey biased slightly toward the accent reads as chosen; a pure mid-grey
  reads as a default.
- **Spend boldness once.** One accent, used where the reader's attention should land — usually the
  recommendation. Everything else stays quiet.
- **Both themes.** Define the full light palette on bare `:root`, redefine the tokens under
  `@media (prefers-color-scheme: dark)`, and set an explicit `background` on `body`. A colour whose
  only definition sits inside a media query renders one theme's text on the other theme's ground.
- **Wide content scrolls in its own container.** Tables and diagrams get `overflow-x: auto`; the page
  body never scrolls sideways.
- **Avoid the generated look.** Cream grounds with a serif display and terracotta accent, near-black
  with one acid-green pop, purple-to-blue gradient heroes, Inter or Space Grotesk as the safe face,
  emoji as section markers, everything centred, rounded cards with an accent rail. Where the user
  names a direction, follow it exactly.

## Before handing it over

Open the file and confirm: it renders with no network, the evidence table's every row maps to a claim
in the body, and each tier is honest — an inference labelled 已驗證 is the one failure that makes the
whole report worthless.

Give the user the file path.

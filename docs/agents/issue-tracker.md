# Issue tracker: local markdown

Specs and tickets live as committed markdown files in this repo. They are the evidence chain behind
every review and every deferral, which is why they are versioned rather than scratch.

## Layout

```
.proj.specs/
  OPEN-QUESTIONS.md
  NNNN-<epic-slug>/
    spec.en.md
    spec.zh-TW.md
    traceability.md
    review/prompt.md
    review/round-1.md
    review/round-2.md
    reports/<slug>.html
  _reports/<slug>.html
.proj.tickets/
  NNNN-<epic-slug>/
    T-NNNN-<slug>.md
```

Epic numbers (`NNNN-<epic-slug>`) are sequential per epic. Ticket ids (`T-NNNN`) are **global**,
sequential across the whole project, and permanent — `git branch tickets/<ticket-id>/<slug>` depends
on them never changing. Allocate the next id by scanning every epic directory for the highest
`T-NNNN`, not just the current epic's.

Specs freeze after review; tickets churn. They live in separate roots so a spec directory's diff
stays readable.

## Ticket format

Status lives in **frontmatter**, never in the path. Moving files between status directories would
break the ticket's own references, produce rename conflicts across concurrent branches, and split
one truth across two places.

```md
---
id: T-0007
title: Load a scenario definition from disk
epic: 0001-scenario-loading
status: todo
blocked_by: [T-0005, T-0006]
---

## Context

Why this ticket exists, in the project's glossary vocabulary.

## Deliverable

The end-to-end behaviour this ticket makes work.

## Acceptance criteria

Traced back to rows of the epic's `traceability.md`.

## 給使用者（zh-TW）

這張票要做什麼、做完之後長什麼樣。供使用者稽核用；正文以 en 為準。

## Comments
```

Tickets are single-file and English-primary, with the one Traditional Chinese section above for the
user's audit. They change too often for a parallel translated file to stay in sync — see
[language.md](language.md).

## The six statuses

Five are written to `status:`. One is derived.

| Status | Meaning | Set by |
|---|---|---|
| `todo` | ready to start | `/to-tickets` |
| `processing` | claimed, work in progress | the agent, before the first edit |
| `review` | implementation done, in stages 6–8 | the agent |
| `done` | landed on `main` | the agent, after the merge |
| `pending` | deliberately paused | the user's decision, recorded |
| `blocked` | **derived**, never written | computed from `blocked_by` |

**Blocking is computed.** A ticket is blocked when any id in `blocked_by` is not yet `done`. Writing
a blocked state by hand would create a second truth that drifts from the edges.

**`pending` carries its reasoning.** Add these to frontmatter when setting it:

```yaml
status: pending
pending_reason: <why it was paused>
pending_evidence: <file:line, command output, or link that supports the call>
pending_on: <YYYY-MM-DD>
revisit_when: <the condition that should bring it back>
```

A `pending` ticket stays out of "what can I work on" answers. When the user asks what is left, name
it, state why it was paused, when, and show the evidence.

## Views, not directories

The six statuses are **queries** over the tree, not folders:

- **Frontier** — what can start now: `status: todo` and every `blocked_by` id is `done`. Lowest
  ticket id first.
- **Blocked** — `status: todo` with at least one `blocked_by` id not `done`. Report which ones.
- **In flight** — `status: processing` or `status: review`.
- **Paused** — `status: pending`. Surfaced only when the user asks what is left.

## When a skill says "publish to the issue tracker"

Create the file under the layout above. Create the epic directory if it does not exist.

## When a skill says "fetch the relevant ticket"

The user will normally pass the ticket id or path. Given only an id, search
`.proj.tickets/*/T-NNNN-*.md`.

## Triage labels

`/to-spec` and `/to-tickets` reference a triage vocabulary. This repo does not use one: a spec that
has cleared adversarial review is ready by construction, and ticket readiness is the derived
frontier above.

## Wayfinding operations

Decision maps precede implementation specs. Keep them in
`.proj.specs/_discovery/<effort>/map.md`, with one child at
`.proj.specs/_discovery/<effort>/decisions/D-NNNN-<slug>.md`.
These are decision ids local to a map, separate from permanent implementation
ticket ids. Creating a decision map does not satisfy the product spec gate.

- **Map:** use wayfinder's Destination, Notes, Decisions so far, Not yet specified
  and Out of scope sections. Link each resolved decision once.
- **Child:** frontmatter has `id`, `type` (`research`, `prototype`, `grilling`,
  `task`), `status` (`todo`, `processing`, `done`, `pending`), `blocked_by` and
  optional `owner`. Put the decision under `## Question`.
- **Frontier:** children with `status: todo` whose blockers are all `done`, ordered
  by local decision id. The claim operation sets `processing` and `owner` before
  work. A single writer allocates ids and updates the map; concurrent researchers
  return findings to that writer instead of racing on shared files.
- **Resolve:** append evidence under `## Answer`, set `done`, and link from the
  map's Decisions so far. An out-of-scope closure records its reason and links from
  Out of scope instead. `pending` carries the same reason/evidence/revisit fields
  as implementation tickets.
- **Research:** resolve with the project `research` skill (it decides whether to
  delegate the reading); the main session saves the findings beside the decision
  and links it.

Map labels and issue assignments in upstream wayfinder instructions map to these
frontmatter fields. Use these paths rather than its generic `.scratch/` examples.

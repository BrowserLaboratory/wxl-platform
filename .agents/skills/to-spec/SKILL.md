---
name: to-spec
description: "Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed."
---

This skill takes the current conversation context and codebase understanding and produces a spec. Do NOT interview the user; just synthesize what you already know.

Read `docs/agents/issue-tracker.md` for paths, statuses and publication rules, and
`docs/agents/language.md` for spec language and translation timing. If the tracker
configuration is missing, ask the user to run `/setup-matt-pocock-skills`.

## Process

1. Reuse the confirmed conversation and codebase context. Read affected interfaces and relevant glossary or ADR entries to resolve remaining factual gaps.

2. Map each required behavior and boundary to an observable public seam. Prefer existing seams at the highest useful boundary; use as many as needed for coverage without duplicating tests.

Reuse already-approved seams. Confirm only new or materially changed seams with the user before proceeding.

3. Build `traceability.md` with `{type × field × boundary} → {expected behavior → acceptance criterion}` for applicable combinations. Derive the spec from it using the template below, then save both through the configured tracker. Every matrix row must reach an acceptance criterion. Follow configured statuses; saving the spec does not authorize tickets or implementation.

<spec-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A numbered list of distinct user stories covering the agreed requirements. Each user story uses:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

Cover each agreed behavior without padding or invented features. Put boundary detail in acceptance criteria and traceability rather than repeating stories to increase length.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts, not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this spec.

## Further Notes

Any further notes about the feature.

</spec-template>

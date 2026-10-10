# Skill mechanics

The skill-specific branch of [`writing-for-agents`](SKILL.md): what changes when the document is a skill (frontmatter, the invocation choice, and router skills). Everything else about writing it is the universal reference in `SKILL.md`.

## Invocation

Two choices, trading the two loads:

- A **model-invoked** skill keeps a `description`, so the agent can fire it autonomously, and other skills can reach it. You can still type its name: model-invocation always _includes_ user reach; a description only ever adds agent discovery, never removes the human's. The description is the skill's top-level context pointer, forced to stay loaded at all times: permanent context load in exchange for discoverability. A model-invoked skill whose content is all reference is also one home for shared reference: another skill can invoke it, so reference needed by several skills lives in one place. Mechanics: omit `disable-model-invocation`, and write a model-facing description carrying the trigger branches (the pointer-writing rules in `SKILL.md` apply in full).
- A **user-invoked** skill requires explicit user invocation. Set `disable-model-invocation: true` and, for this project's Codex entry, `agents/openai.yaml` with `policy.allow_implicit_invocation: false`. Keep a concise human-facing description. Catalog visibility and context cost depend on the host; manual-only policy is not proof that metadata is absent from context. Preserve both policies and follow the active runtime adapter.

Pick model-invocation when the coding assistant or another skill needs to reach it autonomously. If it should run only on explicit user invocation, make it user-invoked; choose this boundary for user control, not an assumed context-cost saving.

When user-invoked skills need shared guidance, put it in a referenced document or a model-invoked reference skill. Reuse authorized context without bypassing another skill's manual-only boundary.

## Splitting by invocation

The invocation cut of splitting (the sequence cut lives in `SKILL.md`): split off a model-invoked skill when you have a distinct leading word that should trigger it on its own (a trigger word you actually use in your prompts), or another skill must reach it. You pay context load for the new always-loaded description, so that independent reach has to be worth it.

## Router skills

Use a **router skill** when a single entrypoint makes related workflows easier to select. State each branch's condition and load only that branch. A router may load reference skills, as grill-with-docs does; it does not silently authorize an unrelated manual-only workflow. Existing explicit user invocation carries forward under runtime.md.

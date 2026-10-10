# GPT-6 family audit criteria

Source: OpenAI, "Rethinking skills and prompts for GPT-6 Astra"
(<https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra>),
read 2026-09-28. Written for GPT-6 Astra; this project treats it as the general
guidance for the GPT-6 family until OpenAI publishes model-specific pages.
Paraphrased; re-read the source when it changes.

Each criterion names what to look for and the usual fix.

## Skill descriptions

- **Over-broad trigger.** A description that fires on a whole domain ("use when
  working with databases") instead of the specific branch the skill handles.
  Fix: name the precise situations.
- **Length.** Many skills with long descriptions get shortened by Codex, so each
  loses meaning. Fix: shortest wording that still says when it applies.
- **Overlap.** Two descriptions that claim the same trigger, contradict each
  other, or over-emphasise when to load. Fix: give each a distinct trigger.

## Skill bodies

- **Recipe.** A long fixed itinerary where the model could judge the steps.
  Over-specific guidance now tends to hurt. Fix: state outcome, constraints and
  evidence; keep exact steps only where exactness is load-bearing (scripts,
  contracts, gates).
- **No router.** A skill with several workflows loaded as one document. Fix: a
  short root that routes to per-branch references and scripts.
- **Other readers.** Repository skills also steer contributors' agents on other
  models. Note when a change would over-constrain or under-guide them.

## Instructions (AGENTS.md, codex.md, roles)

- **Blanket reading.** "Read X, Y, Z before every edit." Fix: contextual
  pointers ("use X for service boundaries, Y for schema changes").
- **Verification nudges.** Encouragement to run tests or double-check. GPT-6 does
  this unprompted; the nudge causes extra testing. Fix: remove, keeping
  project-required checks.
- **Over-strong boundaries.** Emphatic "ask first" language written to hold back
  earlier, more eager models; GPT-6 may take it too seriously and stop early.
  Fix: soften to the real boundary, unless it is a project gate.
- **Missing permission.** Safe routine workflows (a local test suite with
  disposable fixtures) without explicit permission to run, fix and rerun. Fix:
  grant it for that workflow.

## Persistence

- **Undefined completion.** GPT-6 can stop after a first implementation. Fix:
  define done up front, including running, inspecting and fixing the result.
- **Early review stops.** A "stop for review after the first implementation"
  pulls the stop earlier. Fix: keep it only where the user truly decides there.
- **Open exploration.** For work beyond a first pass, say what to explore and
  where to stop.

---
name: tune-skills
description: Re-tune this project's Codex skills and Codex instructions for the model the user runs.
---

# Tune the Codex skills

`.agents/skills/` is tuned for the model recorded in
`docs/agents/skill-sources.json` under `runtime_trees.codex_tuned_for`. Re-tune it
when the user's model differs. You own the Codex surfaces only; the Claude tree
has its own copy of this job.

**Done means**: the user has approved or declined every proposed edit, the
approved ones are applied and pass the checks below, and the record is updated.
Carry the work through to that point; the stops in this skill are the user's
decisions (budget, approval), not review checkpoints.

## Scope

| Surface | Reader | Where an edit may go |
| --- | --- | --- |
| `.agents/skills/**`, `agents/openai.yaml` descriptions | the user's Codex model | that file |
| `docs/agents/codex.md`, `.codex/agents/*.toml` | same (Codex roles inherit the session model) | that file |
| `AGENTS.md`, `docs/agents/*.md` shared docs | Codex **and** Claude | runtime-neutral wording only; Codex-only guidance goes to `codex.md` |

## Model guidance

Use the reference for the user's model family:

- GPT-6 family: [references/gpt-6.md](references/gpt-6.md)

If none matches, research OpenAI's official prompting guidance for that model
first (a `harness-researcher` task is fine), save it as a new reference with its
source URL and date, and have the user confirm it before auditing.

## Work

1. **Need.** Compare the user's model with `codex_tuned_for`; if they match, report
   and stop. Habits the user mentions (language, delegation, commit style) become
   proposed lines in `AGENTS.md` or `codex.md`, not skill rewrites.
2. **Budget.** Agree a spending cap before any Codex Agent runs.
3. **Audit** every file in scope against the model reference. Record each finding
   with an ID, file:line, the guidance it follows and the proposed text. Keep
   intact, whatever the reference says:
   - project gates (the two test tables, frozen review prompt, zero P0, stage-6
     axes, security false-positive filtering, the ticket approval loop): these are
     decisions the user needs, not over-cautious boundaries;
   - exact scripts and contracts, including every sentence a skill's own tests
     assert (find them with `grep -rn` in its `test/` or `tests/` folder);
   - commit, PR, release, spec, ticket, ADR and CONTEXT templates;
   - license and modification notices of vendored skills.
4. **Approval.** Save the report and combined patch to
   `docs/agents/skill-tuning/<YYYY-MM-DD>-<model>.md` (patch beside it) and let the
   user approve per skill.
5. **Apply and check.** Apply the approved patch. You may run these checks and
   fix failures your edits caused without asking at each step; they are local and
   touch no external system:
   - `scripts/verify-project.py`, the template tests if `tests/` exists, and each
     changed skill's own test suite, compared with a run before the patch;
   - `grep -rn` for each removed or reworded sentence, updating any file that
     still quotes it.
   For edits that change behaviour (delegation, stopping points, what a skill
   writes or runs), one `harness-reviewer` pass within the budget; you adjudicate
   from the source files and show the user rejected findings with reasons. Record
   remaining P2 findings as deferred.
6. **Record.** Update `runtime_trees.codex_tuned_for` (model, date, report path)
   and the Codex-tree adaptation notes in `skill-sources.json`. Report each check's
   result line. Committing follows AGENTS.md hard rule 5.

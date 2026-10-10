---
name: tune-skills
description: Re-tune this project's Claude skills and role files for the main session's model.
disable-model-invocation: true
---

# Tune the Claude skills

`.claude/skills/` is tuned for one main-session model, recorded in
`docs/agents/skill-sources.json` under `runtime_trees.claude_tuned_for`. This skill
re-tunes it when the user's main model differs, following that model's official
prompting guidance. It changes only the Claude tree and `.claude/agents/`; the
Codex tree has its own copy of this job.

## 1. Decide whether tuning is needed

Read `runtime_trees.claude_tuned_for`. Ask the user which model and effort they
usually run the main session on (offer the current session's model as the
default). When model and effort match the record, report that and stop.

Sort any habits the user mentions (language, delegation appetite, commit style,
verbosity) into project instructions rather than skill rewrites: propose the
line for `AGENTS.md` or `CLAUDE.md` and apply it once the user approves.
`AGENTS.md` is also read by Codex, so keep lines there runtime-neutral and put
Claude-only guidance in `CLAUDE.md`. Only model differences reach step 2.

## 2. Agree the budget

Before any subagent runs, state the plan and ask the user for a spending cap:
the audit in step 3, and a reviewer in step 5 only for edits that change
behaviour. Behaviour probes (running a skill before and after in a headless
session) cost the most; offer them only for the edits the user names.

## 3. Audit

Run `/claude-api prompt-audit` over the Claude surfaces. If that
skill is unavailable, stop and tell the user; do not improvise the audit.
Give it the reader of each surface:

- `.claude/skills/**`: the main-session model from step 1.
- `.claude/agents/*.md` and the docs those roles are told to read: each role's
  own model, per `docs/agents/claude-orchestration.md`.

Judge each surface against its reader's official prompting page (links in
`claude-orchestration.md`) and the all-models best-practices page. Keep, and
pass to the audit as its keep list:

- Project gates: the two test tables, the frozen review prompt, zero P0, the
  stage-6 axes, security false-positive filtering, the ticket approval loop.
- Exact scripts and contracts: Git commands, sanitizer invocations, CLI and
  schema contracts, and every sentence a test asserts verbatim. Find those with
  `grep -rn` over each skill's `test/` or `tests/` folder before proposing an
  edit to that skill.
- Commit, PR, release, spec, ticket, ADR and CONTEXT templates.
- License and modification notices of vendored skills.

Model names stay out of skill text; model-specific guidance goes in
`claude-orchestration.md`. The audit is complete when every file under the
surfaces is either listed clean or has findings with a proposed hunk.

## 4. Get approval

Save the report (finding ID, file:line, reason, proposed text) to
`docs/agents/skill-tuning/<YYYY-MM-DD>-<model>.md` and the combined patch beside
it. Walk the user through it grouped by skill; apply only the hunks they approve.

## 5. Apply and verify

Apply the approved patch (`git apply --check` first). Then, in this order:

1. Run the deterministic checks and compare them with a run on the unpatched
   tree: `scripts/verify-project.py`, the template tests if `tests/` exists,
   and each changed skill's own test suite (for example
   `node --test` under `.claude/skills/archify`). Any new failure is a
   regression to fix or a hunk to revert.
2. `grep -rn` each removed or reworded sentence across the repository; every
   other file that quotes or relies on it is updated or the hunk reverted.
3. Only for hunks that change behaviour (delegation, stopping points, what the
   skill writes or runs): one `harness-reviewer` pass over those hunks within
   the budget. You adjudicate its findings from the source files and show the
   user the rejected ones with reasons. Stop when no P0 or P1 remains; record
   remaining P2 findings as deferred in the report.

## 6. Record and hand over

Update `runtime_trees.claude_tuned_for` (model, effort, date, report path) and
add the changed skills to the Claude-tree adaptation note in
`docs/agents/skill-sources.json`, so upstream updates reapply the edits. Report
the checks with their result lines. Committing follows AGENTS.md hard rule 5.

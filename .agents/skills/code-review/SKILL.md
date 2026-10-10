---
name: code-review
description: Review a branch, PR, work in progress, or changes since a ref against repository standards and the originating requirements.
---

Review a captured change on two independent axes: **Standards** (repository rules)
and **Spec** (the originating requirements). Keep their findings separate.

## 1. Capture the requested scope

Use the requested base and scope, including any already established in the task.
For a WIP-only review with no base, use HEAD. For a branch or PR, use its known
target; if the target is unknown, ask. Resolve base, HEAD and merge-base to commit IDs.

Follow [review-surface.md](references/review-surface.md) to capture the review packet.
A branch/PR review covers committed changes unless pending work was requested;
an implementation review includes the pending work being implemented. State exclusions.
An invalid ref stops capture. An empty committed diff alone does not stop a WIP
review. If every requested layer is empty, report no changes without launching
reviewers or claiming a review pass.

## 2. Find requirements and standards

Read `docs/agents/issue-tracker.md` when resolving tracker artifacts. If missing,
ask the user to run `/setup-matt-pocock-skills`. Find requirements in this order:

1. The approved spec or maintenance plan already supplied in the task.
2. A path or issue reference supplied by the user.
3. Issue references in captured commit messages, using the configured tracker.
4. A matching spec under the configured tracker paths.
5. If none is found, ask where the requirements are. If the user confirms there
   are none, skip Spec and report "no spec available"; do not claim compliance.

Find applicable repository standards such as AGENTS.md, CONTRIBUTING.md and
CODING_STANDARDS.md. For the Standards axis, also load
[the smell baseline](references/smell-baseline.md). These are labeled heuristics;
documented repository standards override them. Skip checks already enforced by tooling.

## 3. Run independent reviews

Run Standards and Spec as parallel read-only subagents using the runtime adapter.
Give both the same captured diffs, relevant file contents, scope manifest,
base/HEAD IDs and commit list. A diff command alone is not a snapshot.
Keep the checkout stable while they read surrounding context.

**Standards assignment:** Include applicable standards and the loaded smell
baseline. Report each documented-standard breach with file:line, the rule and
evidence. Report smells separately as judgment calls, naming the smell and quoting
the relevant hunk. Explain the impact; repository rules override the baseline.

**Spec assignment:** Include the requirements. Report missing or partial behavior,
unrequested scope, and incorrect implementations. Cite the requirement and the
captured file:line for each finding, explaining the impact.

Ask each reviewer for a concise report (normally under 400 words); preserve the
evidence needed to assess each finding. If Spec has no source, run only Standards.
If independent contexts are unavailable, use isolated passes and disclose that limit.

## 4. Report

Check the snapshot for drift as described in review-surface.md. Present findings
under `## Standards` and `## Spec`, verbatim or lightly cleaned; do not merge or
rerank them across axes. End with finding counts and the worst issue within each
axis. State the reviewed scope, skipped coverage and evidence limits.

A change can follow standards while implementing the wrong requirement, or match
requirements while violating standards. One axis passing does not imply the other.

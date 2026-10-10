# Codex execution boundaries

Use this reference for Codex work; shared workflow gates remain in AGENTS.md and
workflow.md. Model and effort selection stay with the host.

- Load a Skill when its trigger matches the task or the user explicitly invokes it.
  Read the required branch and its references; a catalog entry is not a request to
  load every related Skill. Preserve manual-only invocation policy.
- Continue through the work already requested or approved, including necessary
  fixes and affected checks. Use the current stage's deliverable and gate as the
  stopping condition. A partial implementation is not completion; a real approval
  gate is not permission to proceed. Ask only for missing decisions or material
  scope changes, carrying forward approvals already given.
- Use the project's required checks and the surface that runs the behavior.
  After passing checks, repeat or broaden them only for new changes, failures or
  unresolved coverage. Report the checks actually run and any unverified area.
- Outside prescribed independent reviews, delegate a bounded investigation only
  when it can run independently alongside useful local work. Resolve small known
  lookups directly. The lead continues independent work while a Codex Agent runs.
- Shared Skills describe outcomes, constraints and evidence. Keep Codex-specific
  tool adaptations here or in conditional references; they are not Claude settings.

These boundaries target unnecessary loading, repeated approval and premature stops.
Their effectiveness is task-dependent; structural validation alone does not measure
model behavior, token savings or successful delivery.

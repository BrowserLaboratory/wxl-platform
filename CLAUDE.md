# Claude Code entrypoint

@AGENTS.md

Use the shared rules above. Before using runtime-specific tools, read
`docs/agents/runtime.md` (Claude Code section). Claude's project skills live in
`.claude/skills/`, a Claude-tuned copy; `.agents/skills/` belongs to Codex.

Project roles in `.claude/agents/` run on assigned Claude models: `harness-reviewer`
(red team), `harness-challenger` (devil's advocacy, alternatives), `harness-executor`
(applies approved changes) and `harness-researcher` (inherits this session's model).
Before delegating, read `docs/agents/claude-orchestration.md` for when to use each
role and how findings reach the user. The parent captures Git diffs and saves
reports; only the executor changes the checkout, and only as approved.

For pipeline stage 7, read `.claude/skills/security-review/SKILL.md` explicitly:
Claude's built-in `/security-review` can have the same command name.

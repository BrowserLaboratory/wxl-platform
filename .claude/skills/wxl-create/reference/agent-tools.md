# Shared tool matrix — Claude Code / Codex

The `wxl-create` skill (and its sibling `wxl-mutate`, `wxl-verify`, and `wxl-crosscheck` skills) is runtime-neutral, so its prose only references tools that both supported runtimes provide. This document is the authoritative list.

## Always-available shared tools

These seven tools form the shared baseline. Skill prose may invoke them without conditional fallback.

| Tool | Claude Code | Codex | Purpose in this skill |
|------|-------------|-------|-----------------------|
| `Bash` | ✓ | ✓ | Run `pnpm` scripts, `git`, `wasm-tools`, shell utilities. |
| `Read` | ✓ | ✓ | Read skeletons, frontmatter, configs, references. |
| `Write` | ✓ | ✓ | Create new files (vuln code, spec, frontmatter rewrites). |
| `Edit` | ✓ | ✓ | Patch existing files (frontmatter fields, vuln code revisions). |
| `Glob` | ✓ | ✓ | Discover files by pattern. |
| `Grep` | ✓ | ✓ | Search file contents (verify checks, frontmatter inspection). |
| `WebFetch` | ✓ | ✓ | Fetch external documentation when looking up vuln payloads. |

## Forbidden categories of primitives

Skill prose in `wxl-create` and its siblings `wxl-mutate`, `wxl-verify` and `wxl-crosscheck` MUST NOT reference any of the following host-agent-specific primitive categories. Each row lists the cross-runtime substitute that skill prose uses instead.

| Forbidden category | Cross-runtime substitute |
|--------------------|--------------------------|
| Platform-specific user-question primitive (a tool whose only purpose is to prompt the user with multiple-choice options) | Plain-text question block emitted by the agent; user replies as the next message. |
| Platform plan-mode entry / exit primitives | Inline plain-text confirmation block before any destructive operation. |
| Platform task-tracker primitives (create / update tasks in a built-in todo system) | Direct edits to `tasks.md` checkboxes through the `Edit` tool. |
| In-process sub-agent dispatchers (host tool that spawns a same-session sub-agent with a typed role) | Out-of-process spawn of a fresh agent CLI session via `scripts/wxl-solver/spawn-runtime.ts` (used for L4 blind-solve only). |

The literal list of forbidden token strings and the enforcement regex are deliberately **not** included in this document — they live in `CONTRIBUTE.md` and the project's CI verification step, where their presence does not pollute the skill prose's own grep enforcement.

## Optional MCP servers (best-effort)

These MCP servers MAY be referenced by skill prose, but every call site MUST declare a graceful degradation path because MCP-server availability differs across runtimes and user environments.

### `chrome-devtools-mcp`

Maturity across runtimes:

| Runtime | Status | Notes |
|---------|--------|-------|
| Claude Code | Full support | Plugin available; tools include `navigate_page`, `evaluate_script`, `take_snapshot`, `list_console_messages`, etc. |
| Codex CLI | Supported on Codex v0.20+ | MCP server discovered via `~/.codex/config.toml`; tool names match Claude Code. |

Best-effort degradation: when `chrome-devtools-mcp` is unavailable, the skill SHALL skip the Create-stage self-test and emit a "please run `pnpm challenge:verify <slug>` manually" notice. The skill SHALL NOT fail the Create flow on missing MCP.

The Create-stage MCP self-test is best-effort. The release-blocking gate is `pnpm challenge:verify` (Verify stage), which never depends on MCP for L1–L3.

#!/usr/bin/env bash
# PreToolUse guard for harness-executor (declared in its frontmatter, so it runs
# only inside that subagent). Git commands that rewrite the working tree, the
# index or the branch need the user's approval: the executor once used
# `git stash` despite a written ban in its handoff.
cmd=$(jq -r '.tool_input.command // empty')
# git, then any global options (-C <dir>, -c <k=v>, --no-pager, ...), then the subcommand.
pattern='(^|[;&|(`[:space:]])git([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*[[:space:]]+(stash|checkout|switch|reset|restore)([[:space:]]|$)'
if printf '%s' "$cmd" | grep -Eq "$pattern"; then
  jq -n '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "ask",
    permissionDecisionReason: "harness-executor：git stash、checkout、switch、reset、restore 需要使用者核准"}}'
fi
exit 0

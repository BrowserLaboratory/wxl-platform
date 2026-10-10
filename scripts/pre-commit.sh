#!/usr/bin/env bash
# pre-commit hook for challenge validation
#
# 1. Queries staged files (including deletions) via git diff --cached
# 2. Filters for platform/challenge/** paths
# 3. Stashes unstaged changes so validation sees only the staged snapshot
# 4. Runs challenge-lint-staged.ts on affected files
# 5. Restores the stash regardless of validation result

set -euo pipefail

# Get staged challenge files (Added, Copied, Modified, Renamed, Deleted)
CHALLENGE_FILES=$(git diff --cached --name-only --diff-filter=ACMRD -- 'platform/challenge/')

# If no challenge files are staged, exit early
if [ -z "$CHALLENGE_FILES" ]; then
  exit 0
fi

# Check if there are unstaged changes or untracked files under platform/ to stash
HAS_STASHABLE=false
if ! git diff --quiet -- platform/ || [ -n "$(git ls-files --others --exclude-standard -- platform/)" ]; then
  HAS_STASHABLE=true
fi

# Stash only platform/ unstaged changes + untracked files so we validate the staged snapshot
# Scoped to platform/ to avoid stashing scripts/ or other project files the hook needs
if [ "$HAS_STASHABLE" = true ]; then
  git stash push --keep-index --include-untracked --quiet -m "pre-commit: stash unstaged changes" -- platform/
fi

# Run validation; capture exit code.
# Avoid `xargs` because GNU xargs (Linux/CI) translates any child exit in 1–125
# into 123, while BSD xargs (macOS) forwards the child code unchanged. We build
# the file list into a positional array via a `read` loop (bash 3.2-compatible,
# unlike `mapfile`) and invoke the node script directly so `$?` observes its
# native exit code on every platform.
VALIDATION_EXIT=0
CHALLENGE_FILE_LIST=()
while IFS= read -r line; do
  [ -n "$line" ] && CHALLENGE_FILE_LIST+=("$line")
done <<< "$CHALLENGE_FILES"
node --experimental-strip-types scripts/challenge-lint-staged.ts "${CHALLENGE_FILE_LIST[@]}" || VALIDATION_EXIT=$?

# Restore stash if we stashed
if [ "$HAS_STASHABLE" = true ]; then
  git stash pop --quiet
fi

exit $VALIDATION_EXIT

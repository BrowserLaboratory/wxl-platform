#!/usr/bin/env bash
# pre-commit hook: validate staged challenges and regenerate platform/public/_redirects
#
# It triggers when the staged snapshot differs from HEAD at a watched path:
# platform/challenge/, platform/zh-TW/challenge/ or platform/public/_redirects
# itself (added, copied, modified, renamed, deleted or changed in type). Any
# other commit passes through untouched.
#
# When it triggers:
# 1. Puts the staged snapshot in the working tree under platform/: every other
#    unstaged change and untracked file under platform/ goes into a stash entry
#    of the hook's own. _redirects never enters that entry.
# 2. Validates the staged platform/challenge/ paths that the ACMRD filter
#    selects, as before (challenge-lint-staged.ts), and only when there is one.
#    A type change (T) triggers regeneration but is not validated.
# 3. Generates _redirects over the staged snapshot, restricted to the index
#    slugs: per tree, the slugs whose <tree>/<slug>/index.md is in the index.
#    A page counts only when its own tree lists its slug, so ignored and
#    untracked challenge directories are left out.
# 4. Writes and stages _redirects only after validation and generation
#    succeeded. Afterwards the working tree's _redirects equals the staged one,
#    even if it held an unstaged change before (D3).
# 5. On every exit, puts the stashed files back byte for byte, and drops the
#    hook's own entry only after that restore completed. git stores a stashed
#    file through the repository's attributes (`eol=lf` turns CRLF into LF), so
#    each stashed regular file is put back from a raw copy taken before. On every
#    exit other than O2 where the index's _redirects did not change, the working
#    tree's _redirects keeps the bytes it had before, unless an O5 came during
#    step 4's git add or later. The restore neither removes nor writes a path with a
#    symbolically linked directory above it: it skips and names it on stderr.

set -euo pipefail

# Every pathspec below is read with git's default magic, whatever the
# environment asks for: under GIT_LITERAL_PATHSPECS=1, ':(exclude)' would be a
# literal name, and _redirects would enter the hook's stash.
unset GIT_LITERAL_PATHSPECS GIT_GLOB_PATHSPECS GIT_NOGLOB_PATHSPECS GIT_ICASE_PATHSPECS

REDIRECTS=platform/public/_redirects
WATCHED=(platform/challenge/ platform/zh-TW/challenge/ "$REDIRECTS")
# Everything under platform/ except _redirects: what the hook stashes and restores.
REST=(platform/ ":(exclude)$REDIRECTS")

# ── Trigger ─────────────────────────────────────────────────────────────────
changed=0
git diff --cached --quiet --no-renames -- "${WATCHED[@]}" || changed=$?
case $changed in
  0) exit 0 ;;
  1) ;;
  *) exit "$changed" ;;
esac

# ── Commit forms ────────────────────────────────────────────────────────────
# git hands the hook the index it commits from in GIT_INDEX_FILE. The index is
# the repository's own when the variable is unset, or names the same file as
# `git rev-parse --git-path index`, or that path followed by `.lock` (`-a`,
# `-i`, `-p`). That path is asked for with GIT_INDEX_FILE removed, since git
# rev-parse would otherwise answer with the variable itself. Both sides are
# compared as physical absolute paths: git hands `.git/index` relative for a
# plain commit, and an absolute, symlink-resolved path for `-a`. Any other
# index is a temporary one (`git commit <path>`, `--only`), where the outcomes
# below cannot hold, so a run that triggers there is refused. CDPATH is cleared
# for the `cd`: an exported one would send a relative `cd .git` elsewhere, or
# make `cd` print the directory into the result.
physical_path() {
  local dir
  dir=$(CDPATH= cd -- "$(dirname "$1")" 2>/dev/null && pwd -P) || return 1
  printf '%s/%s\n' "$dir" "$(basename "$1")"
}
on_own_index() {
  [ -n "${GIT_INDEX_FILE+set}" ] || return 0
  local own given
  own=$(unset GIT_INDEX_FILE; git rev-parse --git-path index) || return 1
  own=$(physical_path "$own") || return 1
  given=$(physical_path "$GIT_INDEX_FILE") || return 1
  [ "$given" = "$own" ] || [ "$given" = "$own.lock" ]
}
if ! on_own_index; then
  cat >&2 <<'EOF'
[pre-commit] ✗ This commit names its files (git commit <path>, or --only), so git commits
[pre-commit]   them from a temporary index, where the hook cannot regenerate
[pre-commit]   platform/public/_redirects. Stage the files instead with git add <path>,
[pre-commit]   then run git commit without paths. An editor that commits the files ticked
[pre-commit]   in a list does the same; use its staging area instead.
EOF
  exit 1
fi

TOP=$(git rev-parse --show-toplevel)
WORK=$(mktemp -d "${TMPDIR:-/tmp}/wxl-pre-commit.XXXXXX")
OWN_ENTRY=""
WROTE=false
STAGED=false
WT_EXISTED=false

# True when a directory above the path, up to and including platform/, is a
# symbolic link: removing or writing the path could then reach outside
# platform/. Paths are relative to the top level, so this needs no `dirname`.
behind_link() {
  local dir=$1
  while [ "${dir%/*}" != "$dir" ]; do
    dir=${dir%/*}
    [ -L "$dir" ] && return 0
  done
  return 1
}

# Put the working tree back from the hook's own stash entry, without touching
# the index: tracked files from the entry's working-tree commit, untracked
# files from its third parent, and files the teacher had deleted from the
# working tree removed again. Then every stashed regular file gets its raw
# bytes back from the copy in $WORK/raw. No path behind a symbolic link is
# removed or written: git itself refuses to remove one, and the hook skips and
# reports any such path before asking git to.
restore_entry() {
  git restore --source="$OWN_ENTRY" --worktree -- "${REST[@]}" || return 1
  if git rev-parse -q --verify "$OWN_ENTRY^3" >/dev/null; then
    GIT_INDEX_FILE="$WORK/untracked-index" git read-tree "$OWN_ENTRY^3" || return 1
    GIT_INDEX_FILE="$WORK/untracked-index" git checkout-index --all --force || return 1
  fi
  local path result=0
  : > "$WORK/remove"
  while IFS= read -r -d '' path; do
    if behind_link "$path"; then
      echo "[pre-commit] $path: left alone, because a directory above it is a symbolic link. The hook removes nothing outside platform/." >&2
    else
      printf '%s\0' "$path" >> "$WORK/remove"
    fi
  done < "$WORK/deleted"
  # Restoring the listed paths from the empty tree removes them from the
  # working tree only. git reads each one as a literal path.
  if [ -s "$WORK/remove" ]; then
    GIT_LITERAL_PATHSPECS=1 git restore --quiet --source="$(git hash-object -t tree /dev/null)" --worktree \
      --pathspec-from-file="$WORK/remove" --pathspec-file-nul || return 1
  fi
  while IFS= read -r -d '' path; do
    if behind_link "$path"; then
      echo "[pre-commit] $path: not put back, because a directory above it is a symbolic link. The hook writes nothing outside platform/." >&2
      result=1
      continue
    fi
    cp -p -- "$WORK/raw/$path" "$path" || return 1
  done < "$WORK/copied"
  return "$result"
}

# Drop the hook's own entry, found by its commit id; never any other entry.
drop_entry() {
  local n=0 id
  while id=$(git rev-parse -q --verify "refs/stash@{$n}"); do
    if [ "$id" = "$OWN_ENTRY" ]; then
      git stash drop --quiet "stash@{$n}"
      return
    fi
    n=$((n + 1))
  done
}

finish() {
  local status=$?
  set +e
  if [ "$WROTE" = true ] && [ "$STAGED" = false ]; then
    if [ "$WT_EXISTED" = true ]; then cp "$WORK/saved" "$REDIRECTS"; else rm -f "$REDIRECTS"; fi
  fi
  if [ -n "$OWN_ENTRY" ]; then
    if restore_entry; then
      drop_entry
    else
      echo "[pre-commit] ✗ Could not put your unstaged changes under platform/ back. They are kept in stash entry $OWN_ENTRY; once the cause is fixed, run: git stash apply $OWN_ENTRY" >&2
      [ "$status" -ne 0 ] || status=1
    fi
  fi
  rm -rf "$WORK"
  exit "$status"
}
trap finish EXIT

# ── The versions of _redirects before the hook ──────────────────────────────
# Each is a blob id, or `none` when absent. An absent version is HEAD's when
# HEAD has no _redirects either.
blob_of() { git rev-parse -q --verify "$1" 2>/dev/null || echo none; }
HEAD_BLOB=$(blob_of "HEAD:$REDIRECTS")
INDEX_BLOB=$(blob_of ":$REDIRECTS")
WT_BLOB=none
if [ -e "$REDIRECTS" ] || [ -L "$REDIRECTS" ]; then
  cp "$REDIRECTS" "$WORK/saved"
  WT_EXISTED=true
  WT_BLOB=$(git hash-object -- "$REDIRECTS")
fi

# Untracked challenge directories directly under either watched tree, for W4.
# Ignored directories are not listed.
UNTRACKED_DIRS=""
while IFS= read -r -d '' path; do
  rest=${path#platform/zh-TW/challenge/}
  rest=${rest#platform/challenge/}
  case "$rest" in
    "$path" | */*/) ;;
    */) UNTRACKED_DIRS="$UNTRACKED_DIRS$path"$'\n' ;;
  esac
done < <(git ls-files -z --others --exclude-standard --directory --no-empty-directory -- platform/challenge/ platform/zh-TW/challenge/)

# ── Stash everything else under platform/ ───────────────────────────────────
# Files the index adds (HEAD has no file at the path, perhaps a directory) and
# the working tree has deleted are not recorded by git stash; they are listed
# here and removed again after the restore. A deleted file that HEAD holds as
# a file is recorded, and git's restore removes it. git also lists a path
# behind a symbolic link as deleted.
: > "$WORK/deleted"
while IFS= read -r -d '' path; do
  [ "$(git cat-file -t "HEAD:$path" 2>/dev/null)" = blob ] || printf '%s\0' "$path" >> "$WORK/deleted"
done < <(git diff -z --name-only --diff-filter=D -- "${REST[@]}")
: > "$WORK/copied"
if ! git diff --quiet -- "${REST[@]}" || [ -n "$(git ls-files --others --exclude-standard -- "${REST[@]}")" ]; then
  # A raw copy of every regular file the stash takes, modified or untracked,
  # for the restore. Symbolic links are stored by git as they are.
  while IFS= read -r -d '' path; do
    if [ -f "$path" ] && [ ! -L "$path" ]; then
      mkdir -p "$WORK/raw/$(dirname "$path")"
      cp -p -- "$path" "$WORK/raw/$path"
      printf '%s\0' "$path" >> "$WORK/copied"
    fi
  done < <(git diff -z --name-only --diff-filter=MT -- "${REST[@]}"; git ls-files -z --others --exclude-standard -- "${REST[@]}")
  before=$(git rev-parse -q --verify refs/stash || true)
  # core.safecrlf=false: the conversion is undone by the raw copy, so git neither
  # warns about it nor, when the setting is true, refuses it.
  git -c core.safecrlf=false stash push --keep-index --include-untracked --quiet -m "pre-commit: stash unstaged changes" -- "${REST[@]}"
  after=$(git rev-parse -q --verify refs/stash || true)
  # The hook's own entry is the one refs/stash gained; a push that saved
  # nothing leaves refs/stash alone, and then there is nothing to restore.
  if [ -n "$after" ] && [ "$after" != "$before" ]; then
    OWN_ENTRY=$after
  fi
fi

# ── Validate ────────────────────────────────────────────────────────────────
# Avoid `xargs` because GNU xargs (Linux/CI) translates any child exit in 1–125
# into 123, while BSD xargs (macOS) forwards the child code unchanged. The list
# is built with a `read` loop (bash 3.2-compatible, unlike `mapfile`) and the
# validator is skipped when it is empty: bash 3.2 under `set -u` rejects the
# expansion of an empty array.
VALIDATE=()
while IFS= read -r -d '' path; do
  VALIDATE+=("$path")
done < <(git diff --cached --name-only -z --diff-filter=ACMRD -- platform/challenge/)
if [ ${#VALIDATE[@]} -gt 0 ]; then
  validation=0
  node --experimental-strip-types scripts/challenge-lint-staged.ts "${VALIDATE[@]}" || validation=$?
  [ "$validation" -eq 0 ] || exit "$validation"
fi

# ── Generate, then write and stage ──────────────────────────────────────────
node --experimental-strip-types scripts/generate-redirects.ts --staged --root "$TOP" > "$WORK/expected" || exit 1
mkdir -p platform/public
WROTE=true
cp "$WORK/expected" "$REDIRECTS"
git add -- "$REDIRECTS"
STAGED=true

# ── W3, W4 ──────────────────────────────────────────────────────────────────
# W3 when the hook replaced a version, in the index or in the working tree,
# that was neither HEAD's nor the expected one: a version the teacher made.
EXPECTED_BLOB=$(blob_of ":$REDIRECTS")
teachers() { [ "$1" != "$HEAD_BLOB" ] && [ "$1" != "$EXPECTED_BLOB" ]; }
if teachers "$INDEX_BLOB" || teachers "$WT_BLOB"; then
  echo "[pre-commit] platform/public/_redirects: replaced your version with the one generated from the staged challenges. It is generated; do not edit it by hand." >&2
  while IFS= read -r dir; do
    [ -n "$dir" ] || continue
    echo "[pre-commit] $dir is untracked, so _redirects leaves it out. To include it, git add it and commit again." >&2
  done <<< "$UNTRACKED_DIRS"
fi

exit 0

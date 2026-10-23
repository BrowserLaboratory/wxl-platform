#!/usr/bin/env bash
# pre-commit hook: validate staged challenges and regenerate platform/public/_redirects
#
# It triggers when the staged snapshot differs from HEAD at a watched path:
# platform/challenge/, platform/zh-TW/challenge/ or platform/public/_redirects
# itself (added, copied, modified, renamed, deleted or changed in type). Any
# other commit passes through untouched.
#
# A first commit (no HEAD) that triggers is refused before any change when
# something under platform/ other than _redirects is unstaged or untracked
# (O6): git cannot stash before the first commit, so the message asks for
# every change under platform/ to be staged with git add.
#
# When it triggers:
# 1. Puts the staged snapshot in the working tree under platform/: every other
#    unstaged change and untracked file under platform/ goes into a stash entry
#    of the hook's own. _redirects never enters that entry.
# 2. Validates the staged platform/challenge/ paths that the ACMRD filter
#    selects, as before (challenge-lint-staged.ts), and only when there is one.
#    A type change (T) triggers regeneration but is not validated.
# 3. Before generating, refuses an orphan brief (D12): a slug in the
#    Traditional Chinese tree's index slugs that the English tree's index slugs
#    lack, which CI would fail. It exits 1 with a message naming
#    platform/zh-TW/challenge/<slug>/ and platform/challenge/<slug>/, and
#    nothing is changed. The check reads the whole staged snapshot, not only
#    the staged change.
# 4. Generates _redirects over the staged snapshot, restricted to the index
#    slugs: per tree, the slugs whose <tree>/<slug>/index.md is in the index.
#    A page counts only when its own tree lists its slug, so ignored and
#    untracked challenge directories are left out.
# 5. Writes and stages _redirects only after validation and generation
#    succeeded. Afterwards the working tree's _redirects equals the staged one,
#    even if it held an unstaged change before (D3).
# 6. On every exit, restores the stashed files byte for byte, unless the
#    restore fails or the entry is kept as point 7 says, and drops the hook's
#    own entry only after that restore completed and the index under
#    platform/ is still the one the entry recorded, or the run is on
#    index.lock (point 7). git stores a stashed
#    file through the repository's attributes (`eol=lf` turns CRLF into LF), so
#    each stashed regular file is put back from a raw copy taken before. On every
#    exit other than O2 where the index's _redirects did not change, the working
#    tree's _redirects keeps the bytes it had before, unless an O5 or an O7 came
#    during step 5's git add or later: it then holds those bytes or the expected
#    content, also on index.lock, where git discards the staged one. The
#    restore neither removes nor writes a path with a symbolically linked
#    directory above it: it skips and names it on stderr.
# 7. Every way the run ends goes through that restore (O5). A failed git
#    command ends the run under `set -e`; each git listing is written to a file
#    first, since a failure inside `< <( )` would go unseen. SIGINT, SIGTERM
#    and SIGHUP end it with 128 + the signal's number once the foreground
#    command, which got the same signal, has ended. A run that ends once the
#    stash push has started, before the hook recorded its entry, reads
#    refs/stash again at the end and claims the entry it gained. While
#    restoring, the hook ignores INT, TERM and HUP. When the restore fails, or
#    stops partway, the entry stays and the hook prints its id, `git stash
#    apply <id>`, and the `git restore` commands that put the files back
#    without touching the index, for when apply refuses because some files
#    are already back (O7). Applying the entry is not byte for byte in the
#    cases D16 (a) names. The hook never drops its entry when the index is
#    missing: when the file GIT_INDEX_FILE names is gone (git removes its
#    index.lock when an interrupted `git commit -a` ends), it does not
#    restore, and the entry stays the same way, with the same `git restore`
#    commands. git can remove the file while the restore runs, so the hook
#    looks for it again once the restore is done. A push
#    that stopped after storing its entry can leave the index under platform/
#    changed. On the repository's own index, the hook then puts the files
#    back, keeps the entry, and W9 prints the `git restore --staged` command
#    that puts the index back; when the restore failed too, W9 prints that
#    command after its first form's. On index.lock (`-a`, `-i`, `-p`), git
#    discards the changed lock when the hook fails, so the hook puts the files
#    back and drops the entry (O5).
#    Besides _redirects the hook writes no index entry under platform/ and
#    does not undo its push's, so it runs none of these commands itself. Their
#    pathspecs start at the top level, so they work in any directory.

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
# make `cd` print the directory into the result. ON_LOCK records the `.lock`
# form: git discards that file when the hook fails, so whatever the run changed
# in it does not stay.
ON_LOCK=false
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
  [ "$given" = "$own" ] && return 0
  [ "$given" = "$own.lock" ] || return 1
  ON_LOCK=true
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

# True when something under platform/ other than _redirects is unstaged or
# untracked: what the hook stashes. A git failure ends the run (O5).
rest_dirty() {
  local differs=0 untracked
  git diff --quiet -- "${REST[@]}" || differs=$?
  case $differs in
    0) ;;
    1) return 0 ;;
    *) exit "$differs" ;;
  esac
  untracked=$(git ls-files --others --exclude-standard -- "${REST[@]}") || exit
  [ -n "$untracked" ]
}

# ── A first commit (O6) ─────────────────────────────────────────────────────
# git cannot stash before the first commit. With no HEAD, the hook refuses
# before any change when something under platform/ other than _redirects is
# unstaged or untracked; an unstaged _redirects alone needs no stash (D3).
if ! git rev-parse -q --verify HEAD >/dev/null && rest_dirty; then
  cat >&2 <<'EOF'
[pre-commit] ✗ This is the repository's first commit, and something under platform/ is
[pre-commit]   unstaged or untracked. git cannot stash before the first commit, so every
[pre-commit]   change under platform/ must be staged for it: stage it with git add (or remove
[pre-commit]   what should stay out), then run git commit again. Nothing was changed.
EOF
  exit 1
fi

TOP=$(git rev-parse --show-toplevel)
WORK=$(mktemp -d "${TMPDIR:-/tmp}/wxl-pre-commit.XXXXXX")
OWN_ENTRY=""
# Set once the stash push may have started, with refs/stash as it was before.
PUSH_STARTED=false
before=""
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

# The pathspecs of the commands W9 prints: everything under platform/ except
# _redirects, read from the top level (`:(top)`) whatever directory the
# teacher runs them in.
PRINTED_REST="':(top)platform/' ':(top,exclude)$REDIRECTS'"

# The commands W9 prints to put every file back from the entry without
# touching the index: tracked files from its working-tree commit, untracked
# files from its third parent. They overwrite what is there, which W9 says.
restore_commands() {
  local remedy="git restore --source=$OWN_ENTRY --worktree -- $PRINTED_REST"
  if git rev-parse -q --verify "$OWN_ENTRY^3" >/dev/null 2>&1; then
    remedy="$remedy && git restore --overlay --source=$OWN_ENTRY^3 --worktree -- ':(top)platform/'"
  fi
  printf '%s\n' "$remedy"
}

# W9, for O7: the entry stays, and the message says how to apply it. A restore
# that stopped partway leaves some files back, and `git stash apply` then
# refuses ("would be overwritten", "already exists"), so the commands that put
# the files back without the index are printed too.
keep_entry() {
  echo "[pre-commit] ✗ Could not put your unstaged changes under platform/ back: $1. They are kept in stash entry $OWN_ENTRY; once the cause is fixed, run: git stash apply $OWN_ENTRY. If it refuses because some of those files are already back, use the commands below instead. They overwrite the files under platform/ with the entry's, so run them before you change anything there; to put them back without touching the index, run: $(restore_commands)" >&2
}

# W9 for a missing index. The files git commit had staged still hold those
# changes, so `git stash apply` can refuse ("would be overwritten").
keep_entry_without_index() {
  echo "[pre-commit] ✗ Could not put your unstaged changes under platform/ back: the index this commit ran on is gone (git removes it when an interrupted commit ends). They are kept in stash entry $OWN_ENTRY. git stash apply $OWN_ENTRY can refuse here, since the files the commit had staged still hold those changes. The commands below overwrite the files under platform/ with the entry's, so run them before you change anything there; to put them back without touching the index, run: $(restore_commands)" >&2
}

# True when the index under platform/ is the one the entry recorded (its index
# commit). git stash push with a pathspec stores the entry first, then runs
# `git add`, `git apply --index -R` and `git checkout --no-overlay` (git
# 2.54.0), so a push stopped between those steps leaves the index changed. A
# failed comparison counts as a change.
index_as_stashed() {
  git diff --cached --quiet "$OWN_ENTRY^2" -- "${REST[@]}"
}

# W9's first form gains this line when the push also changed the repository's
# own index: once the files are back, the entry's index commit gives back what
# was staged. The line ends with its command, as the first form's does.
keep_index_too() {
  echo "[pre-commit]   The stash push also stopped partway and changed the index: stash entry $OWN_ENTRY keeps what was staged. Once the files are back, the command below overwrites what is staged under platform/, so run it before you stage anything there; to put the index back without touching the working tree, run: git restore --staged --source=$OWN_ENTRY^2 -- $PRINTED_REST" >&2
}

# True when the file GIT_INDEX_FILE names is gone: git removes its index.lock
# when an interrupted commit ends.
index_gone() {
  [ -n "${GIT_INDEX_FILE+set}" ] && [ ! -e "$GIT_INDEX_FILE" ]
}

# W9 when the files are back but the index is not: the entry's index commit
# holds what was staged.
keep_entry_for_index() {
  echo "[pre-commit] ✗ Could not put your staged changes under platform/ back: the stash push stopped partway and changed the index. Your unstaged changes and untracked files are back in the working tree, so git stash apply $OWN_ENTRY is not needed; stash entry $OWN_ENTRY keeps what was staged. The command below overwrites what is staged under platform/, so run it before you stage anything there; to put the index back without touching the working tree, run: git restore --staged --source=$OWN_ENTRY^2 -- $PRINTED_REST" >&2
}

finish() {
  local status=$?
  # Nothing interrupts the restore: INT, TERM and HUP are ignored from here
  # on, and the processes the restore starts inherit that.
  trap '' INT TERM HUP
  set +e
  # A signal, or a failed read of refs/stash, can end the run after the push
  # started and before the entry was recorded. The entry refs/stash gained
  # across the push is still the hook's own; refs/stash unread leaves none.
  if [ -z "$OWN_ENTRY" ] && [ "$PUSH_STARTED" = true ]; then
    local top
    top=$(git rev-parse -q --verify refs/stash 2>/dev/null) || top=""
    if [ -n "$top" ] && [ "$top" != "$before" ]; then OWN_ENTRY=$top; fi
  fi
  if [ "$WROTE" = true ] && [ "$STAGED" = false ]; then
    if [ "$WT_EXISTED" = true ]; then cp "$WORK/saved" "$REDIRECTS"; else rm -f "$REDIRECTS"; fi
  fi
  if [ -n "$OWN_ENTRY" ]; then
    # The hook never drops its entry when the index is missing: git removes its
    # index.lock when an interrupted `git commit -a` ends, and the commit the
    # hook ran for is gone with it. The entry then stays, as when the restore
    # fails, and W9 says how to apply it. git can remove the lock after this
    # check, while the restore runs (a SIGINT to `git commit -p`); a restore
    # on no index does not remove the files the teacher deleted, so the index
    # is checked again after it, and the entry stays the same way.
    if index_gone; then
      keep_entry_without_index
      [ "$status" -ne 0 ] || status=1
    elif ! restore_entry; then
      keep_entry "the restore failed (see git's message above)"
      # A push that stopped partway can have changed the repository's own
      # index as well; git discards a changed index.lock itself.
      if [ "$ON_LOCK" = false ] && ! index_as_stashed; then keep_index_too; fi
      [ "$status" -ne 0 ] || status=1
    elif index_gone; then
      keep_entry_without_index
      [ "$status" -ne 0 ] || status=1
    elif ! index_as_stashed; then
      if [ "$ON_LOCK" = true ]; then
        # On index.lock (`-a`, `-i`, `-p`) the changed index is git's lock,
        # which git discards when the hook fails: the repository's index never
        # changed, so the entry is not needed and W9 is not printed. The status
        # stays non-zero, so git does discard the lock.
        [ "$status" -ne 0 ] || status=1
        drop_entry
      else
        # The entry's index commit is then the only record of what was staged.
        keep_entry_for_index
        [ "$status" -ne 0 ] || status=1
      fi
    else
      drop_entry
    fi
  fi
  rm -rf "$WORK"
  exit "$status"
}
# A signal ends the run through finish with 128 + its number, the same under
# bash 3.2 and bash 5. bash runs the trap once the foreground command (the
# generator, or git), which got the same signal, has ended.
on_signal() {
  trap '' INT TERM HUP
  exit "$1"
}
trap finish EXIT
trap 'on_signal 129' HUP
trap 'on_signal 130' INT
trap 'on_signal 143' TERM

# The commit id refs/stash names, or nothing when there is no stash. Any other
# failure ends the run: an unread refs/stash would make the teacher's newest
# entry look like the hook's own.
stash_top() {
  local id status=0
  id=$(git rev-parse -q --verify refs/stash) || status=$?
  case $status in
    0) printf '%s\n' "$id" ;;
    1) ;;
    *) exit "$status" ;;
  esac
}

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
# Each git listing below is written to a file first: a failure inside `< <( )`
# would escape `set -e`, and the loop would read an empty list.
git ls-files -z --others --exclude-standard --directory --no-empty-directory -- platform/challenge/ platform/zh-TW/challenge/ > "$WORK/untracked-dirs"
UNTRACKED_DIRS=""
while IFS= read -r -d '' path; do
  rest=${path#platform/zh-TW/challenge/}
  rest=${rest#platform/challenge/}
  case "$rest" in
    "$path" | */*/) ;;
    */) UNTRACKED_DIRS="$UNTRACKED_DIRS$path"$'\n' ;;
  esac
done < "$WORK/untracked-dirs"

# ── Stash everything else under platform/ ───────────────────────────────────
# Files the index adds (HEAD has no file at the path, perhaps a directory) and
# the working tree has deleted are not recorded by git stash; they are listed
# here and removed again after the restore. A deleted file that HEAD holds as
# a file is recorded, and git's restore removes it. git also lists a path
# behind a symbolic link as deleted.
: > "$WORK/deleted"
git diff -z --name-only --diff-filter=D -- "${REST[@]}" > "$WORK/deleted-all"
while IFS= read -r -d '' path; do
  [ "$(git cat-file -t "HEAD:$path" 2>/dev/null)" = blob ] || printf '%s\0' "$path" >> "$WORK/deleted"
done < "$WORK/deleted-all"
: > "$WORK/copied"
if rest_dirty; then
  # A raw copy of every regular file the stash takes, modified or untracked,
  # for the restore. Symbolic links are stored by git as they are.
  git diff -z --name-only --diff-filter=MT -- "${REST[@]}" > "$WORK/to-copy"
  git ls-files -z --others --exclude-standard -- "${REST[@]}" >> "$WORK/to-copy"
  while IFS= read -r -d '' path; do
    if [ -f "$path" ] && [ ! -L "$path" ]; then
      mkdir -p "$WORK/raw/$(dirname "$path")"
      cp -p -- "$path" "$WORK/raw/$path"
      printf '%s\0' "$path" >> "$WORK/copied"
    fi
  done < "$WORK/to-copy"
  before=$(stash_top)
  # core.safecrlf=false: the conversion is undone by the raw copy, so git neither
  # warns about it nor, when the setting is true, refuses it.
  pushed=0
  PUSH_STARTED=true
  git -c core.safecrlf=false stash push --keep-index --include-untracked --quiet -m "pre-commit: stash unstaged changes" -- "${REST[@]}" || pushed=$?
  after=$(stash_top)
  # The hook's own entry is the one refs/stash gained, even when the push then
  # reported a failure; a push that saved nothing leaves refs/stash alone, and
  # then there is nothing to restore.
  if [ -n "$after" ] && [ "$after" != "$before" ]; then
    OWN_ENTRY=$after
  fi
  [ "$pushed" -eq 0 ] || exit "$pushed"
fi

# ── Validate ────────────────────────────────────────────────────────────────
# Avoid `xargs` because GNU xargs (Linux/CI) translates any child exit in 1–125
# into 123, while BSD xargs (macOS) forwards the child code unchanged. The list
# is built with a `read` loop (bash 3.2-compatible, unlike `mapfile`) and the
# validator is skipped when it is empty: bash 3.2 under `set -u` rejects the
# expansion of an empty array.
git diff --cached --name-only -z --diff-filter=ACMRD -- platform/challenge/ > "$WORK/validate"
VALIDATE=()
while IFS= read -r -d '' path; do
  VALIDATE+=("$path")
done < "$WORK/validate"
if [ ${#VALIDATE[@]} -gt 0 ]; then
  validation=0
  node --experimental-strip-types scripts/challenge-lint-staged.ts "${VALIDATE[@]}" || validation=$?
  [ "$validation" -eq 0 ] || exit "$validation"
fi

# ── Orphan briefs (D12) ─────────────────────────────────────────────────────
# A Traditional Chinese brief whose slug the English tree's index slugs lack
# would fail CI ("backs every translated slug with a root-locale challenge"),
# so it is refused before generating. Both lists come from the index the hook
# runs on, as the generator's index slugs do, and are compared as whole
# strings in plain arrays (bash 3.2 has no associative arrays). Neither array
# is expanded when empty: bash 3.2 under `set -u` rejects that.
# index_slugs <tree> <file> reads the tree's `git ls-files -z` from <file>, which
# the caller writes at the top level, where `set -e` sees git fail.
index_slugs() {
  local path rest
  while IFS= read -r -d '' path; do
    rest=${path#"$1"}
    case "$rest" in
      */*/*) ;;
      */index.md) printf '%s\0' "${rest%/index.md}" ;;
    esac
  done < "$2"
}
git ls-files -z -- platform/challenge/ > "$WORK/ls-en"
git ls-files -z -- platform/zh-TW/challenge/ > "$WORK/ls-zh"
EN_SLUGS=()
while IFS= read -r -d '' slug; do EN_SLUGS+=("$slug"); done < <(index_slugs platform/challenge/ "$WORK/ls-en")
ORPHANS=()
while IFS= read -r -d '' slug; do
  found=false
  if [ ${#EN_SLUGS[@]} -gt 0 ]; then
    for en in "${EN_SLUGS[@]}"; do
      if [ "$en" = "$slug" ]; then found=true; break; fi
    done
  fi
  [ "$found" = true ] || ORPHANS+=("$slug")
done < <(index_slugs platform/zh-TW/challenge/ "$WORK/ls-zh")
if [ ${#ORPHANS[@]} -gt 0 ]; then
  for slug in "${ORPHANS[@]}"; do
    echo "[pre-commit] ✗ platform/zh-TW/challenge/$slug/ is a Traditional Chinese brief, but the index holds no English challenge platform/challenge/$slug/ (its index.md is not staged), so CI would fail this commit." >&2
  done
  cat >&2 <<'EOF'
[pre-commit]   Delete, rename or retire each brief together with its English directory: delete
[pre-commit]   both, rename both, or, when you retire the challenge to .archive/challenge/,
[pre-commit]   delete its brief in the same commit (git rm -r platform/zh-TW/challenge/<slug>/).
[pre-commit]   If the English challenge exists but is not staged yet, git add it. Nothing was changed.
EOF
  exit 1
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

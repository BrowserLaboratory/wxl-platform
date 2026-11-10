// D19 (traceability.md revision 3.1; T-0061, moved here in T-0062 so step 8 shares it): runs one
// git command and, when `runGit` rejects (not an exit code -- the spawn itself failed), rethrows it
// as a bug whose message names the command, so CW-E14 says which git command failed. A signal
// already received, or a `SignalAbort`, passes through unchanged so the run still exits 130.

import { SignalAbort } from './signals.mjs'
import { buildGitEnv } from './git-env.mjs'

export async function runGitNamed(deps, guard, args, opts, name) {
  try {
    return await deps.runGit(args, opts)
  } catch (err) {
    if (err instanceof SignalAbort) throw err
    guard.throwIfRaised()
    throw new Error(`git ${name} failed: ${err?.message ?? String(err)}`, { cause: err })
  }
}

/** P-5 and D15 (traceability.md "Pre-checks", step 5; Vocabulary's own "ignored path" -- "a path
 * that is not tracked and that `git check-ignore -q --no-index -- ./<path>` reports as ignored by
 * the range's rules"); shared by both since T-0062 (S1). `check-ignore`'s own exit codes are 0
 * (ignored) and 1 (not ignored); any other exit code, or a `runGit` rejection, is a bug naming the
 * command -- fail closed (D6, D19), never silently read as either answer. Called only for a path
 * the caller has already found untracked (a force-added, tracked file that also matches an ignore
 * rule is never P-5, and never D15). */
export async function isIgnoredPath(deps, guard, rangeRoot, path) {
  // `./` keeps the path literal: `check-ignore` refuses every pathspec magic (`--literal-pathspecs`
  // included), and a path starting with `:` would otherwise be read as magic and check another path.
  const name = `check-ignore -- ./${path}`
  const result = await runGitNamed(
    deps,
    guard,
    ['check-ignore', '-q', '--no-index', '--', `./${path}`],
    { cwd: rangeRoot, env: buildGitEnv(deps.env) },
    name,
  )
  // A signal this process already received while that `runGit` call was in flight wins over
  // interpreting its result, the same way `runMergeFile` already does.
  guard.throwIfRaised()
  if (result.code === 0) return true
  if (result.code === 1) return false
  throw new Error(`git ${name} failed (exit code ${result.code}): ${result.stderr}`)
}

// D19 (traceability.md revision 3.1; T-0061, moved here in T-0062 so step 8 shares it): runs one
// git command and, when `runGit` rejects (not an exit code -- the spawn itself failed), rethrows it
// as a bug whose message names the command, so CW-E14 says which git command failed. A signal
// already received, or a `SignalAbort`, passes through unchanged so the run still exits 130.

import { SignalAbort } from './signals.mjs'

export async function runGitNamed(deps, guard, args, opts, name) {
  try {
    return await deps.runGit(args, opts)
  } catch (err) {
    if (err instanceof SignalAbort) throw err
    guard.throwIfRaised()
    throw new Error(`git ${name} failed: ${err?.message ?? String(err)}`, { cause: err })
  }
}

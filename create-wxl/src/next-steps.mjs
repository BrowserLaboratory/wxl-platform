// Step 13's "Next steps" lines (traceability.md "Next steps"), built from the run's directory,
// whether setup ran, the last accepted setup parse (`parsedArgs`, for N3-N6) and the git steps'
// result (`gitResult`, for N2).

/**
 * Returns the ordered array of already-rendered next-step lines this run should print.
 * `noSetup`: true selects N1 and N8 only. `parsedArgs`: the last accepted `parseForkInitArgs`
 * result (`.repo`, `.host`), required unless `noSetup`. `gitResult`: `runGitSteps`'s own result
 * (S-12, passed whole); a `null` `warningId` omits N2 (CW-W05's signal path is T-0024's).
 */
export function buildNextSteps({ t, directory, noSetup, parsedArgs, gitResult }) {
  const lines = [t['N1']({ directory })]

  if (gitResult.warningId !== null) {
    lines.push(t['N2']({ remainingCommands: gitResult.remainingCommands }))
  }

  if (noSetup) {
    lines.push(t['N8']())
    return lines
  }

  const [owner, name] = parsedArgs.repo.split('/')
  lines.push(t['N3']({ owner, name }))
  lines.push(t['N4']({ owner, name }))
  lines.push(parsedArgs.host === 'github-pages' ? t['N5']() : t['N6']())
  lines.push(t['N7']())
  return lines
}

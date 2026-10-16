// Wraps a `runGit` function (the real runner, or a stub) with a recorder that pushes every call's
// `{ args, cwd, env }` in order, without changing its behaviour (T-0023 ticket Notes, fixture ⑥).

export function recordGit(runGit) {
  const calls = []
  const recorded = (args, opts) => {
    calls.push({ args, cwd: opts.cwd, env: opts.env })
    return runGit(args, opts)
  }
  return { runGit: recorded, calls }
}

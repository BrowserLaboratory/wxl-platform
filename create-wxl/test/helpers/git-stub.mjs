// A `runGit` stub that answers by which "Git steps" command the args belong to (T-0023 ticket
// Notes, fixture ⑤). Every command succeeds by default; `overrides` replaces one command's
// response with a fixed `{ code, stdout, stderr }`, a rejection (pass an `Error`), or a function
// `(args, opts) => ...` for a case that needs to look at the call itself. Every call -- matched or
// not -- is pushed to `calls` as `{ args, cwd, env }`.

function classify(args) {
  if (args[0] === '--version') return 'version'
  if (args.includes('init')) return 'init'
  if (args.includes('symbolic-ref')) return 'symbolic-ref'
  if (args.includes('add')) return 'add'
  if (args.includes('config') && args.includes('user.name')) return 'config-name'
  if (args.includes('config') && args.includes('user.email')) return 'config-email'
  if (args.includes('commit')) return 'commit'
  return 'unknown'
}

const DEFAULTS = {
  version: { code: 0, stdout: 'git version 2.54.0\n', stderr: '' },
  init: { code: 0, stdout: '', stderr: '' },
  'symbolic-ref': { code: 0, stdout: '', stderr: '' },
  add: { code: 0, stdout: '', stderr: '' },
  'config-name': { code: 0, stdout: 'Ada\n', stderr: '' },
  'config-email': { code: 0, stdout: 'ada@example.com\n', stderr: '' },
  commit: { code: 0, stdout: '', stderr: '' },
  unknown: { code: 0, stdout: '', stderr: '' },
}

export function makeGitStub(overrides = {}) {
  const calls = []
  const runGit = async (args, opts) => {
    calls.push({ args, cwd: opts.cwd, env: opts.env })
    const key = classify(args)
    const override = overrides[key]
    if (override === undefined) return DEFAULTS[key]
    if (typeof override === 'function') return override(args, opts)
    if (override instanceof Error) throw override
    return override
  }
  return { runGit, calls }
}

// Git steps (traceability.md "Git steps", G0-G4): turns the configured range into a git
// repository on `main` with exactly one commit, isolated from the teacher's global git
// configuration. `runGitSteps` runs G0-G4 in order and classifies any failure into one of
// CW-W01 (G0), CW-W02 (G3: no identity) or CW-W03 (any other command failure).

import { buildGitEnv } from './git-env.mjs'
import { parseGitVersion, isGitVersionOk } from './git-version.mjs'

const CONFIG_GLOBAL_NAME = 'git config --global user.name "<your name>"'
const CONFIG_GLOBAL_EMAIL = 'git config --global user.email "<you@example.com>"'

/** The printed forms of G1, G2 and G4 (traceability.md "Git steps", "Printed form" column), the
 * one source `cwE12FinishingCommands` (messages.mjs) also builds from (S-09). */
export function printedForms(version) {
  return {
    init: 'git init',
    symbolicRef: 'git symbolic-ref HEAD refs/heads/main',
    add: 'git add -A',
    commit: `git commit -m "Create range from WXL ${version}"`,
  }
}

/** Runs `run(args)`, turning a rejection into the same shape a resolved call has (`threw: true`
 * instead of a `code`), so every call site classifies both the same way. */
async function attempt(run, args) {
  try {
    const result = await run(args)
    return { threw: false, code: result.code, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
  } catch (err) {
    return { threw: true, error: err }
  }
}

/** The text CW-W03 and N2 print for a command's failure: its stderr when it ran (even empty), or
 * the rejection's own message when it never returned at all. */
function detailOf(result) {
  return result.threw ? (result.error?.message ?? String(result.error)) : result.stderr
}

/** G3's own rule (traceability.md "Git steps" and the revision 2.1 self-check "G3's exit 1 is
 * CW-W02, not CW-W03"): exit 1, or exit 0 with empty output, is "no identity" (CW-W02); a
 * rejection or any other exit code (e.g. 128, "fatal: bad config") is CW-W03 ("error"). */
function classifyConfigGet(result) {
  if (result.threw) return 'error'
  if (result.code === 1) return 'missing'
  if (result.code === 0 && result.stdout.trim() === '') return 'missing'
  if (result.code === 0) return 'ok'
  return 'error'
}

/**
 * Runs G0-G4 in order through `runGit(args, { cwd, env })` with `buildGitEnv(env)`. Returns
 * `{ warningId: null }` on success, or one of:
 * - `{ warningId: 'CW-W01', remainingCommands }` (G0 rejected, exited non-zero, or reported an
 *   unparsable or too-old version)
 * - `{ warningId: 'CW-W02', remainingCommands }` (G3: no explicit committer identity)
 * - `{ warningId: 'CW-W03', command, detail, remainingCommands }` (any other git command failure,
 *   decision 4: a G1-G4 rejection is always CW-W03, never CW-W01)
 * `remainingCommands` are the printed forms (traceability.md "Git steps") still to run, in order;
 * for CW-W02 the two `git config --global` commands come first.
 */
export async function runGitSteps({ runGit, cwd, env: rawEnv, version }) {
  const env = buildGitEnv(rawEnv)
  const run = (args) => runGit(args, { cwd, env })
  const forms = printedForms(version)
  const orderedForms = [forms.init, forms.symbolicRef, forms.add, forms.commit]

  const versionResult = await attempt(run, ['--version'])
  if (versionResult.threw || versionResult.code !== 0 || !isGitVersionOk(parseGitVersion(versionResult.stdout))) {
    return { warningId: 'CW-W01', remainingCommands: orderedForms }
  }

  const mainArgs = [
    ['init', '--template='],
    ['symbolic-ref', 'HEAD', 'refs/heads/main'],
    ['-c', 'core.excludesFile=', 'add', '-A', '--force'],
  ]
  for (let i = 0; i < mainArgs.length; i++) {
    const result = await attempt(run, mainArgs[i])
    if (result.threw || result.code !== 0) {
      return { warningId: 'CW-W03', command: orderedForms[i], detail: detailOf(result), remainingCommands: orderedForms.slice(i) }
    }
  }

  const nameResult = await attempt(run, ['config', '--get', 'user.name'])
  const nameClass = classifyConfigGet(nameResult)
  if (nameClass === 'error') {
    return {
      warningId: 'CW-W03',
      command: 'git config --get user.name',
      detail: detailOf(nameResult),
      remainingCommands: [forms.commit],
    }
  }
  const emailResult = await attempt(run, ['config', '--get', 'user.email'])
  const emailClass = classifyConfigGet(emailResult)
  if (emailClass === 'error') {
    return {
      warningId: 'CW-W03',
      command: 'git config --get user.email',
      detail: detailOf(emailResult),
      remainingCommands: [forms.commit],
    }
  }
  if (nameClass === 'missing' || emailClass === 'missing') {
    return { warningId: 'CW-W02', remainingCommands: [CONFIG_GLOBAL_NAME, CONFIG_GLOBAL_EMAIL, forms.commit] }
  }

  const commitResult = await attempt(run, [
    '-c',
    'user.useConfigOnly=true',
    '-c',
    'commit.gpgsign=false',
    '-c',
    'core.hooksPath=',
    'commit',
    '--no-verify',
    '-m',
    `Create range from WXL ${version}`,
  ])
  if (commitResult.threw || commitResult.code !== 0) {
    return { warningId: 'CW-W03', command: forms.commit, detail: detailOf(commitResult), remainingCommands: [forms.commit] }
  }

  return { warningId: null }
}

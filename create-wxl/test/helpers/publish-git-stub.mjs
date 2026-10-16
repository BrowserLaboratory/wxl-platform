// A `checkPublish`-shaped `runGit` for `publish.test.mjs`: every real git command is forwarded to
// the fixture's own isolated environment (ticket test plan table, 0005-S2 "X1-X9 全部成立" row:
// "runGit 包真的 git（隔離 env）") -- never the caller's `env`, which `checkPublish` itself does
// not control in a test -- except `ls-remote`, which answers from a programmable string instead
// of ever reaching the network, so X6's four scenarios can be driven without a real upstream push.

import { spawn } from 'node:child_process'

function spawnGit(args, { cwd, env }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('git', args, { cwd, env, shell: false })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }))
  })
}

export function makePublishGitStub(isolatedEnv) {
  let lsRemoteOutput = ''
  const calls = []
  async function runGit(args, opts) {
    calls.push({ args, cwd: opts?.cwd })
    if (args[0] === 'ls-remote') return { code: 0, stdout: lsRemoteOutput, stderr: '' }
    return spawnGit(args, { cwd: opts?.cwd, env: isolatedEnv })
  }
  return {
    runGit,
    calls,
    setLsRemote(output) {
      lsRemoteOutput = output
    },
  }
}

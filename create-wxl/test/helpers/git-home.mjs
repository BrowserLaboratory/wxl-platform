// Isolated git identity/config fixtures (T-0023 ticket Notes, fixture ①-③): a `HOME` whose
// `.gitconfig` sets an explicit identity, a global `init.templateDir` whose `post-commit` hook
// writes a marker file OUTSIDE the target, `commit.gpgsign=true` with a non-existent `gpg.program`
// (so a run that forgets `-c commit.gpgsign=false` fails loudly instead of silently finding the
// real system `gpg`), and (C59) an optional global `core.excludesFile`.

import { mkdir, writeFile, chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { makeTmpRoot } from './tmp.mjs'

/** `\` is git config's own escape character, so a Windows path written as-is into a `.gitconfig`
 * value (S-14) breaks parsing; forward slashes are accepted on every platform git supports. */
function gitConfigPath(path) {
  return path.replace(/\\/g, '/')
}

/** One gitconfig builder (S-22), instead of the identity/template/gpg block written out twice:
 * `excludesFile` is optional (C59's variant only). */
function buildGitconfig({ tplDir, gpgProgram, excludesFile }) {
  const lines = [
    '[user]',
    '\tname = Ada',
    '\temail = ada@example.com',
    '[init]',
    `\ttemplateDir = ${gitConfigPath(tplDir)}`,
    '[commit]',
    '\tgpgsign = true',
    '[gpg]',
    `\tprogram = ${gitConfigPath(gpgProgram)}`,
  ]
  if (excludesFile !== undefined) {
    lines.push('[core]', `\texcludesFile = ${gitConfigPath(excludesFile)}`)
  }
  lines.push('')
  return lines.join('\n')
}

/** C35's isolated `HOME`: explicit identity, a template hook, and gpg signing pointed at a path
 * that does not exist. Returns `{ homeDir, hookMarkerFile }` — the hook, if it ever ran, writes
 * `hookMarkerFile`. */
export async function makeGitHomeWithHook() {
  const homeDir = await makeTmpRoot()
  const tplDir = join(homeDir, 'tpl')
  const hooksDir = join(tplDir, 'hooks')
  await mkdir(hooksDir, { recursive: true })
  const hookMarkerFile = join(homeDir, 'hook-ran')
  await writeFile(join(hooksDir, 'post-commit'), `#!/bin/sh\necho ran > ${JSON.stringify(hookMarkerFile)}\n`)
  await chmod(join(hooksDir, 'post-commit'), 0o755)

  const gpgProgram = join(homeDir, 'no-such-gpg')
  await writeFile(join(homeDir, '.gitconfig'), buildGitconfig({ tplDir, gpgProgram }))

  return { homeDir, hookMarkerFile }
}

/** C59's variant: the same as above, plus a global `core.excludesFile` ignoring `lib/`. */
export async function makeGitHomeWithExcludes() {
  const { homeDir, hookMarkerFile } = await makeGitHomeWithHook()
  const excludesFile = join(homeDir, 'global-ignore')
  await writeFile(excludesFile, 'lib/\n')
  const tplDir = join(homeDir, 'tpl')
  const gpgProgram = join(homeDir, 'no-such-gpg')
  await writeFile(join(homeDir, '.gitconfig'), buildGitconfig({ tplDir, gpgProgram, excludesFile }))
  return { homeDir, hookMarkerFile }
}

/** C37's empty `HOME`: no identity, no template, no excludes -- just an empty directory so git
 * cannot fall back to the real `$HOME`'s own config. */
export async function makeEmptyGitHome() {
  return makeTmpRoot()
}

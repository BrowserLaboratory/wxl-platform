// G0 (traceability.md "Git steps"): `git --version` must report 2.20 or later. `git --version`'s
// own output is `git version <major>.<minor>.<patch>[<anything>]` (a Homebrew/Xcode suffix like
// `(Apple Git-154)`, or a Windows suffix like `.windows.1`); only the leading `\d+\.\d+(\.\d+)?` is
// read, compared with `numeric-version.mjs`'s shared helper (S-11) so `2.9.5` is not mistaken
// for newer than `2.20.0`.

import { isAtLeast } from './numeric-version.mjs'

export const MINIMUM_GIT_VERSION = [2, 20]

const VERSION_PREFIX_RE = /^git version (\d+)\.(\d+)(?:\.(\d+))?/

/** Returns `[major, minor, patch]` (patch 0 when absent), or `null` when `stdout` does not start
 * with a recognisable `git version <N>.<N>` prefix. */
export function parseGitVersion(stdout) {
  const match = VERSION_PREFIX_RE.exec(String(stdout))
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? '0')]
}

/** `parsed`: `parseGitVersion`'s result. `null` (unparsable) is never ok. */
export function isGitVersionOk(parsed, minimum = MINIMUM_GIT_VERSION) {
  if (parsed === null) return false
  return isAtLeast(parsed, minimum)
}

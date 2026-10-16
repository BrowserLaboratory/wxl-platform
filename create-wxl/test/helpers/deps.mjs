import { EventEmitter } from 'node:events'
import { createHash } from 'node:crypto'
import { readFileSync, mkdtempSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as fsp from 'node:fs/promises'
import { vi } from 'vitest'
import * as engineModule from '../../../scripts/fork-init.ts'
import { makeFetchArchive } from './archive.mjs'
import { PRISTINE_FIXTURE } from './fixtures.mjs'

export const ENGINE_FILE = fileURLToPath(new URL('../../../scripts/fork-init.ts', import.meta.url))
const ENGINE_BYTES = readFileSync(ENGINE_FILE)
export const ENGINE_SHA256 = createHash('sha256').update(ENGINE_BYTES).digest('hex')

export const FIXED_COMMIT = '0123456789abcdef0123456789abcdef01234567'
export const PACKAGE_VERSION = '3.0.0'

// T-0022 ticket Notes (7): `deps.env`'s default is a fixed `{ LANG, HOME }`, not `{}`, so a test
// that does not override `env` still runs as if HOME were a harmless, unrelated directory (never
// read by any production code today -- `questions.mjs`' `~` handling never expands it -- but
// pinned here so a later ticket that does read it cannot silently inherit the real `$HOME`).
const DEFAULT_HOME = mkdtempSync(join(tmpdir(), 'create-wxl-test-home-'))

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof EventEmitter)
}

function mergeOverrides(base, overrides) {
  const result = { ...base }
  for (const [key, value] of Object.entries(overrides)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = { ...result[key], ...value }
    } else {
      result[key] = value
    }
  }
  return result
}

/** A real `node:fs/promises` namespace spread into an overridable, call-recording-free object. */
function realFs() {
  return { ...fsp }
}

export function makeDeps(overrides = {}) {
  const base = {
    env: { LANG: 'en_US.UTF-8', HOME: DEFAULT_HOME },
    // No default: every test must pass its own `cwd` (S-33) so a run never touches the real
    // working directory by accident; `path.resolve` throws loudly if one is missing.
    cwd: undefined,
    nodeVersion: '22.6.0',
    locale: 'en-US',
    packageVersion: PACKAGE_VERSION,
    source: {
      repository: engineModule.UPSTREAM_SLUG,
      version: PACKAGE_VERSION,
      commit: FIXED_COMMIT,
      engineSha256: ENGINE_SHA256,
    },
    engine: {
      parseForkInitArgs: vi.fn(engineModule.parseForkInitArgs),
      runForkInit: vi.fn(engineModule.runForkInit),
      deriveGithubPagesOrigin: vi.fn(engineModule.deriveGithubPagesOrigin),
      ForkInitArgError: engineModule.ForkInitArgError,
      UPSTREAM_SLUG: engineModule.UPSTREAM_SLUG,
    },
    engineFile: ENGINE_FILE,
    // Resolves to a fresh, valid pristine archive by default (the approved plan's Notes); tests
    // of a rejection path assert `not.toHaveBeenCalled()` rather than relying on this throwing.
    fetchArchive: makeFetchArchive(PRISTINE_FIXTURE, { commit: FIXED_COMMIT }),
    // T-0022 ticket Notes (5): rejects with a `code: 'ENOENT'` error, matching what T-0023's git
    // step will see when `git` is not on `PATH` (CW-W01), not a generic "must not be called".
    // `--no-setup` and step-11-only runs never call this at all (asserted with
    // `not.toHaveBeenCalled()`), so the rejection reason is otherwise never observed.
    runGit: vi.fn(async () => {
      const err = new Error('runGit must not be called before T-0023 implements the git steps')
      err.code = 'ENOENT'
      throw err
    }),
    downloadTimeoutMs: 1000,
    fs: realFs(),
    signals: new EventEmitter(),
    checkpoint: vi.fn(),
  }
  return mergeOverrides(base, overrides)
}

import { EventEmitter } from 'node:events'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
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
    env: {},
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
    runGit: vi.fn(async () => {
      throw new Error('runGit must not be called by a --no-setup run')
    }),
    downloadTimeoutMs: 1000,
    fs: realFs(),
    signals: new EventEmitter(),
    checkpoint: vi.fn(),
  }
  return mergeOverrides(base, overrides)
}

// Stage 6/7 fix assignment section A (S-05/P-08/C-02, P-23, S-24, S-08/S-09): the real IO
// `scripts/check-publish.mjs` wires into `checkPublish` (`npm view`'s E404-only mapping, the
// platform-correct npm binary name, and a shared, UTF-8-safe spawn capture), kept testable in
// `src/` so the script itself stays a thin wiring layer with no logic of its own.

import { describe, it, expect } from 'vitest'
import { parseNpmViewMaintainers, npmCommand } from '../src/publish-io.mjs'

describe('parseNpmViewMaintainers', () => {
  it('returns [] on an E404 (the name is unpublished)', () => {
    const result = { code: 1, stdout: '', stderr: 'npm error code E404\nnpm error 404 Not Found - GET https://registry.npmjs.org/create-wxl\n' }
    expect(parseNpmViewMaintainers(result)).toEqual([])
  })

  it('throws on a non-zero exit that is not E404 (a network error, a registry failure, ...)', () => {
    const result = { code: 1, stdout: '', stderr: 'npm error code ETIMEDOUT\nnpm error network request to https://registry.npmjs.org/create-wxl failed\n' }
    expect(() => parseNpmViewMaintainers(result)).toThrow()
  })

  it('returns the parsed array for multiple maintainers', () => {
    const result = { code: 0, stdout: '["Ada <ada@example.com>","Bea <bea@example.com>"]\n', stderr: '' }
    expect(parseNpmViewMaintainers(result)).toEqual(['Ada <ada@example.com>', 'Bea <bea@example.com>'])
  })

  it('normalises a single maintainer (npm prints a bare string, not a one-item array)', () => {
    const result = { code: 0, stdout: '"Ada <ada@example.com>"\n', stderr: '' }
    expect(parseNpmViewMaintainers(result)).toEqual(['Ada <ada@example.com>'])
  })

  it('returns [] for empty output', () => {
    const result = { code: 0, stdout: '', stderr: '' }
    expect(parseNpmViewMaintainers(result)).toEqual([])
  })
})

describe('npmCommand', () => {
  it('is npm.cmd on win32 (bare `npm` is a .cmd shim there; spawning it without a shell ENOENTs)', () => {
    expect(npmCommand('win32')).toBe('npm.cmd')
  })

  it('is npm elsewhere', () => {
    expect(npmCommand('darwin')).toBe('npm')
    expect(npmCommand('linux')).toBe('npm')
  })
})

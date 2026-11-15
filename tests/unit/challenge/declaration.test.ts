import { describe, it, expect, vi } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readChallengeDeclaration } from '../../../.vitepress/challenge/declaration'

function writeDeclaration(root: string, slug: string, text: string) {
  const dir = join(root, 'platform', 'challenge', slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'challenge.yaml'), text)
}

describe('Y7: a leading document marker is accepted', () => {
  it('returns the same value with and without the leading ---', () => {
    const root = mkdtempSync(join(tmpdir(), 'wxl-declaration-'))
    try {
      writeDeclaration(root, 'with-marker', '---\nbackend: flask\napp: app.py\n')
      writeDeclaration(root, 'without-marker', 'backend: flask\napp: app.py\n')

      const withMarker = readChallengeDeclaration(root, 'with-marker')
      const withoutMarker = readChallengeDeclaration(root, 'without-marker')

      expect(withMarker.ok).toBe(true)
      expect(withMarker.value).toEqual({ backend: 'flask', app: 'app.py' })
      expect(withoutMarker.ok).toBe(true)
      expect(withoutMarker.value).toEqual(withMarker.value)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('Y8: an ISO date stays a string', () => {
  it('keeps date as a string under the core schema', () => {
    const root = mkdtempSync(join(tmpdir(), 'wxl-declaration-'))
    try {
      writeDeclaration(
        root,
        'with-date',
        'backend: flask\napp: app.py\ndate: 2026-04-02T08:54:17.674Z\n',
      )
      const result = readChallengeDeclaration(root, 'with-date')
      expect(result.value.date).toBe('2026-04-02T08:54:17.674Z')
      expect(typeof result.value.date).toBe('string')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('D145: a mapping key that is not a scalar throws (working test, claims no row)', () => {
  function expectThrowsWithoutWarning(text: string) {
    const root = mkdtempSync(join(tmpdir(), 'wxl-declaration-'))
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      writeDeclaration(root, 'non-scalar-key', text)
      expect(() => readChallengeDeclaration(root, 'non-scalar-key')).toThrow()
      expect(emitWarning).not.toHaveBeenCalled()
      expect(consoleWarn).not.toHaveBeenCalled()
      expect(stderrWrite).not.toHaveBeenCalled()
    } finally {
      emitWarning.mockRestore()
      consoleWarn.mockRestore()
      stderrWrite.mockRestore()
      rmSync(root, { recursive: true, force: true })
    }
  }

  it('a top-level non-scalar key throws without warning', () => {
    expectThrowsWithoutWarning('backend: flask\n[x]: 1\n')
  })

  it('a collection key nested under tags throws without warning', () => {
    expectThrowsWithoutWarning('backend: flask\ntags:\n  [x]: 1\n')
  })

  it('an explicit key syntax throws without warning', () => {
    expectThrowsWithoutWarning('backend: flask\n? [x]\n')
  })

  it('an alias used as a key throws without warning, even when its anchor holds a scalar', () => {
    // A space before the colon avoids yaml's own unresolved-alias exception on `*n:` (delta
    // review F2): without it, `toJS` throws for an unrelated reason even with the D145 guard
    // removed, so the case cannot tell the guard apart from that pre-existing behaviour.
    expectThrowsWithoutWarning('backend: flask\nnumber: &n 1\n*n : 2\n')
  })
})

describe('D147: the site parser resolves no YAML 1.1 tag (working test, claims no row)', () => {
  // The invalid-yaml half (returning { ok: false } for these four inputs) is T-0077's (Y2-Y6, a
  // doc.warnings check); this block only pins D147's own contract: no writer fires, and the
  // returned value never holds a Date, Uint8Array/Buffer, Set or Map, and a !!merge key does not
  // merge into the top-level mapping.
  function assertNoKnownTagInstances(value: unknown, seen = new Set<unknown>()) {
    if (value === null || typeof value !== 'object') return
    expect(value).not.toBeInstanceOf(Date)
    expect(value).not.toBeInstanceOf(Uint8Array)
    expect(value).not.toBeInstanceOf(Set)
    expect(value).not.toBeInstanceOf(Map)
    if (seen.has(value)) return
    seen.add(value)
    for (const v of Object.values(value as Record<string, unknown>)) {
      assertNoKnownTagInstances(v, seen)
    }
  }

  function readWithoutWriters(slug: string, text: string) {
    const root = mkdtempSync(join(tmpdir(), 'wxl-declaration-'))
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      writeDeclaration(root, slug, text)
      const result = readChallengeDeclaration(root, slug)
      expect(emitWarning).not.toHaveBeenCalled()
      expect(consoleWarn).not.toHaveBeenCalled()
      expect(stderrWrite).not.toHaveBeenCalled()
      return result
    } finally {
      emitWarning.mockRestore()
      consoleWarn.mockRestore()
      stderrWrite.mockRestore()
      rmSync(root, { recursive: true, force: true })
    }
  }

  it('a !!timestamp tag on a key raises no warning and keeps the key a plain string', () => {
    const result = readWithoutWriters(
      'timestamp-key',
      'backend: flask\napp: app.py\n!!timestamp 2001-01-01: 1\n',
    )
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ backend: 'flask', app: 'app.py', '2001-01-01': 1 })
    assertNoKnownTagInstances(result.value)
  })

  it('a !!binary tag on a key raises no warning and keeps the key a plain string', () => {
    const result = readWithoutWriters(
      'binary-key',
      'backend: flask\napp: app.py\n!!binary aGk=: 1\n',
    )
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ backend: 'flask', app: 'app.py', 'aGk=': 1 })
    assertNoKnownTagInstances(result.value)
  })

  it('a !!merge tag used as a key raises no warning and does not merge into the top-level mapping', () => {
    const result = readWithoutWriters(
      'merge-key',
      'backend: flask\napp: app.py\n!!merge x: {k: v}\n',
    )
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ backend: 'flask', app: 'app.py', x: { k: 'v' } })
    expect(Object.prototype.hasOwnProperty.call(result.value, 'k')).toBe(false)
    assertNoKnownTagInstances(result.value)
  })

  it('a !!set tag as a value raises no warning and stays a plain mapping', () => {
    const result = readWithoutWriters(
      'set-value',
      'backend: flask\napp: app.py\ntags: !!set {a: null}\n',
    )
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ backend: 'flask', app: 'app.py', tags: { a: null } })
    assertNoKnownTagInstances(result.value)
  })
})

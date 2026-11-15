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

describe('Y2: challenge.yaml absent', () => {
  it('returns { ok: false, reason: "absent", path }', () => {
    const root = mkdtempSync(join(tmpdir(), 'wxl-declaration-'))
    try {
      mkdirSync(join(root, 'platform', 'challenge', 'no-decl', 'src'), { recursive: true })
      const result = readChallengeDeclaration(root, 'no-decl')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toBe('absent')
        expect(result.path).toBe(join(root, 'platform', 'challenge', 'no-decl', 'challenge.yaml'))
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('Y3: challenge.yaml is not a YAML mapping (0 bytes, comments only)', () => {
  it('returns reason not-a-mapping for a 0-byte file', () => {
    const root = mkdtempSync(join(tmpdir(), 'wxl-declaration-'))
    try {
      writeDeclaration(root, 'empty', '')
      const result = readChallengeDeclaration(root, 'empty')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('not-a-mapping')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('returns reason not-a-mapping for a comments-only file', () => {
    const root = mkdtempSync(join(tmpdir(), 'wxl-declaration-'))
    try {
      writeDeclaration(root, 'comments-only', '# just a comment\n# another\n')
      const result = readChallengeDeclaration(root, 'comments-only')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('not-a-mapping')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('Y6: root is a sequence, a string, a number, null', () => {
  it.each([
    ['sequence', '- a\n- b\n'],
    ['string', '"just a string"\n'],
    ['number', '42\n'],
    ['null', 'null\n'],
  ])('returns reason not-a-mapping for a %s root', (_label, text) => {
    const root = mkdtempSync(join(tmpdir(), 'wxl-declaration-'))
    try {
      writeDeclaration(root, 'bad-root', text)
      const result = readChallengeDeclaration(root, 'bad-root')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('not-a-mapping')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('Y5: two YAML documents', () => {
  it('returns reason multi-document', () => {
    const root = mkdtempSync(join(tmpdir(), 'wxl-declaration-'))
    try {
      writeDeclaration(root, 'two-docs', 'backend: flask\napp: app.py\n---\nbackend: fastapi\napp: app2.py\n')
      const result = readChallengeDeclaration(root, 'two-docs')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('multi-document')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('a single leading --- stays accepted (Y7 unchanged)', () => {
    const root = mkdtempSync(join(tmpdir(), 'wxl-declaration-'))
    try {
      writeDeclaration(root, 'one-doc', '---\nbackend: flask\napp: app.py\n')
      const result = readChallengeDeclaration(root, 'one-doc')
      expect(result.ok).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('Y4: unparseable YAML', () => {
  it('returns reason invalid-yaml for an unclosed flow collection', () => {
    const root = mkdtempSync(join(tmpdir(), 'wxl-declaration-'))
    try {
      writeDeclaration(root, 'bad-yaml', 'backend: [flask\n')
      const result = readChallengeDeclaration(root, 'bad-yaml')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('invalid-yaml')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

// D149 (Overridden contracts): a non-scalar key now returns { ok: false, reason: 'invalid-yaml' }
// under Y2-Y6, instead of the throw this block pinned in T-0076. "No writer fires" still holds and
// is still asserted.
describe('Y112: D129 YAML boundaries (read half)', () => {
  function readText(slug: string, text: string) {
    const root = mkdtempSync(join(tmpdir(), 'wxl-declaration-'))
    try {
      writeDeclaration(root, slug, text)
      return readChallengeDeclaration(root, slug)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }

  it('a duplicate key is invalid-yaml', () => {
    const result = readText('dup-key', 'backend: flask\napp: app.py\napp: app2.py\n')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid-yaml')
  })

  it('an alias within the limit is resolved', () => {
    const result = readText(
      'alias-ok',
      'backend: flask\napp: app.py\nnumber: &n 1\nother: *n\n',
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.other).toBe(1)
  })

  it('an alias expansion over maxAliasCount is invalid-yaml (billion laughs)', () => {
    const lines = ['backend: flask', 'app: app.py', 'a0: &a0 ["x","x","x","x","x","x","x","x","x","x"]']
    for (let i = 1; i <= 10; i++) {
      lines.push(`a${i}: &a${i} [*a${i - 1},*a${i - 1},*a${i - 1},*a${i - 1},*a${i - 1},*a${i - 1},*a${i - 1},*a${i - 1},*a${i - 1},*a${i - 1}]`)
    }
    lines.push('bomb: *a10')
    const result = readText('billion-laughs', lines.join('\n') + '\n')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid-yaml')
  })

  it('an alias whose anchor is not set is invalid-yaml', () => {
    const result = readText('unset-anchor', 'backend: flask\napp: app.py\nx: *nowhere\n')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid-yaml')
  })

  it('<< is an ordinary key, holding the aliased mapping', () => {
    const result = readText(
      'merge-key-alias',
      'backend: flask\napp: app.py\nbase: &base {x: 1}\n<<: *base\n',
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value['<<']).toEqual({ x: 1 })
      expect(result.value.x).toBeUndefined()
    }
  })

  it('yes and on stay strings', () => {
    const result = readText('yes-on', 'backend: flask\napp: app.py\na: yes\nb: on\n')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.a).toBe('yes')
      expect(result.value.b).toBe('on')
    }
  })

  it('a custom tag is invalid-yaml', () => {
    const result = readText('custom-tag', 'backend: flask\napp: app.py\nx: !foo bar\n')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid-yaml')
  })
})

describe('D145: a mapping key that is not a scalar throws (working test, claims no row)', () => {
  function expectInvalidYamlWithoutWarning(text: string) {
    const root = mkdtempSync(join(tmpdir(), 'wxl-declaration-'))
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      writeDeclaration(root, 'non-scalar-key', text)
      const result = readChallengeDeclaration(root, 'non-scalar-key')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('invalid-yaml')
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

  it('a top-level non-scalar key is invalid-yaml without warning (D149)', () => {
    expectInvalidYamlWithoutWarning('backend: flask\n[x]: 1\n')
  })

  it('a collection key nested under tags is invalid-yaml without warning (D149)', () => {
    expectInvalidYamlWithoutWarning('backend: flask\ntags:\n  [x]: 1\n')
  })

  it('an explicit key syntax is invalid-yaml without warning (D149)', () => {
    expectInvalidYamlWithoutWarning('backend: flask\n? [x]\n')
  })

  it('an alias used as a key is invalid-yaml without warning, even when its anchor holds a scalar (D149)', () => {
    // A space before the colon avoids yaml's own unresolved-alias exception on `*n:` (delta
    // review F2): without it, `toJS` throws for an unrelated reason even with the D145 guard
    // removed, so the case cannot tell the guard apart from that pre-existing behaviour.
    expectInvalidYamlWithoutWarning('backend: flask\nnumber: &n 1\n*n : 2\n')
  })
})

// D149 (Overridden contracts): these four cases now return { ok: false, reason: 'invalid-yaml' }
// under Y2-Y6's doc.warnings check, instead of the { ok: true } this block pinned in T-0076. D147's
// own contract — no writer fires — still holds and is still asserted; D147's "the returned value
// never holds a Date/Buffer/Set/Map, and !!merge does not merge" is moot once the parse itself is
// invalid-yaml, so that half is dropped here (no row claims it changed; the reason is test-only).
describe('D147: the site parser resolves no YAML 1.1 tag (working test, claims no row)', () => {
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

  it('a !!timestamp tag on a key raises no warning, and is invalid-yaml (D149)', () => {
    const result = readWithoutWriters(
      'timestamp-key',
      'backend: flask\napp: app.py\n!!timestamp 2001-01-01: 1\n',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid-yaml')
  })

  it('a !!binary tag on a key raises no warning, and is invalid-yaml (D149)', () => {
    const result = readWithoutWriters(
      'binary-key',
      'backend: flask\napp: app.py\n!!binary aGk=: 1\n',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid-yaml')
  })

  it('a !!merge tag used as a key raises no warning, and is invalid-yaml (D149)', () => {
    const result = readWithoutWriters(
      'merge-key',
      'backend: flask\napp: app.py\n!!merge x: {k: v}\n',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid-yaml')
  })

  it('a !!set tag as a value raises no warning, and is invalid-yaml (D149)', () => {
    const result = readWithoutWriters(
      'set-value',
      'backend: flask\napp: app.py\ntags: !!set {a: null}\n',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid-yaml')
  })
})

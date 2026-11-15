import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { planLayoutMove } from '../src/layout-move.mjs'

const FIXTURES = fileURLToPath(new URL('./fixtures/layout-move/door-is-open/', import.meta.url))

const MODE = 0o100644

function file(path, text) {
  return { path, bytes: Buffer.from(text, 'utf8'), mode: MODE }
}

describe('U11: the page predicate per path, observed as legacy and ops', () => {
  it.each([
    ['platform/x.md', 'platform/en/x.md'],
    ['platform/guide/x.md', 'platform/en/guide/x.md'],
    ['platform/challenge/s/notes.md', 'platform/en/challenge/s/notes.md'],
    ['platform/challenge/index.md', 'platform/en/challenge/index.md'],
    ['platform/ZH-TW/x.md', 'platform/en/ZH-TW/x.md'],
  ])('%s is legacy and moves to %s', (from, to) => {
    const result = planLayoutMove({ files: [file(from, '# x\n')] })
    expect(result.legacy).toBe(true)
    expect(result.ops).toEqual([
      { kind: 'move', from, to, content: Buffer.from('# x\n', 'utf8'), mode: MODE },
    ])
  })

  it('an English brief moves and declares', () => {
    const content = '---\ntitle: S\nlayout: challenge\nnumber: 1\n---\n'
    const result = planLayoutMove({ files: [file('platform/challenge/s/index.md', content)] })
    expect(result.legacy).toBe(true)
    const move = result.ops.find((op) => op.kind === 'move')
    const declare = result.ops.find((op) => op.kind === 'declare')
    expect(move).toMatchObject({ from: 'platform/challenge/s/index.md', to: 'platform/en/challenge/s/index.md' })
    expect(declare).toMatchObject({ slug: 's', to: 'platform/challenge/s/challenge.yaml' })
  })

  it.each([
    'platform/challenge/s/src/README.md',
    'platform/public/x.md',
    'platform/shared/x.md',
    'platform/zh-TW/x.md',
    'platform/en/x.md',
    'platform/x.MD',
    'platform/postcss.config.mjs',
    'docs/x.md',
    'Platform/x.md',
  ])('%s is a no-op', (path) => {
    const result = planLayoutMove({ files: [file(path, '# x\n')] })
    expect(result).toEqual({ legacy: false, ops: [], mismatches: [] })
  })
})

describe('U12: a single-file brief stops the move', () => {
  it('platform/challenge/s.md gives the legacy-brief failure alone', () => {
    const result = planLayoutMove({ files: [file('platform/challenge/s.md', '# s\n')] })
    expect(result).toEqual({
      failures: [{ token: 'legacy-brief', path: 'platform/challenge/s.md' }],
    })
  })
})

describe('U20: a non-brief page moves with identical bytes', () => {
  it('matches U-§1\'s LF example exactly', () => {
    const result = planLayoutMove({
      files: [{ path: 'platform/guide/a.md', bytes: Buffer.from('# A\n', 'utf8'), mode: 0o100644 }],
    })
    expect(result).toEqual({
      legacy: true,
      ops: [
        {
          kind: 'move',
          from: 'platform/guide/a.md',
          to: 'platform/en/guide/a.md',
          content: Buffer.from('# A\n', 'utf8'),
          mode: 0o100644,
        },
      ],
      mismatches: [],
    })
  })

  it.each([
    ['CRLF', Buffer.from('# A\r\n', 'utf8')],
    ['no final newline', Buffer.from('# A', 'utf8')],
    ['empty file', Buffer.from('', 'utf8')],
    ['binary bytes', Buffer.from([0x00, 0xff, 0xfe, 0x80])],
  ])('is byte-identical for %s, with mode passed through', (_label, bytes) => {
    const mode = 0o100755
    const result = planLayoutMove({ files: [{ path: 'platform/guide/b.md', bytes, mode }] })
    expect(result.ops).toHaveLength(1)
    expect(Buffer.from(result.ops[0].content)).toEqual(Buffer.from(bytes))
    expect(result.ops[0].mode).toBe(mode)
  })
})

describe("U21: upstream door-is-open English brief splits into U-§1's two examples", () => {
  it('declares challenge.yaml and moves en-index.md, both byte-equal to the fixtures', () => {
    const sourceBytes = readFileSync(FIXTURES + 'source-index.md')
    const expectedChallengeYaml = readFileSync(FIXTURES + 'challenge.yaml')
    const expectedEnIndex = readFileSync(FIXTURES + 'en-index.md')

    const result = planLayoutMove({
      files: [{ path: 'platform/challenge/door-is-open/index.md', bytes: sourceBytes, mode: 0o100644 }],
    })

    const declare = result.ops.find((op) => op.kind === 'declare')
    const move = result.ops.find((op) => op.kind === 'move')

    expect(declare).toMatchObject({ slug: 'door-is-open', to: 'platform/challenge/door-is-open/challenge.yaml' })
    expect(Buffer.from(declare.content)).toEqual(expectedChallengeYaml)

    expect(move).toMatchObject({ to: 'platform/en/challenge/door-is-open/index.md' })
    expect(Buffer.from(move.content)).toEqual(expectedEnIndex)
  })
})

describe('U22: interleaved keys keep their relative order', () => {
  it('keeps kept keys and declaration keys each in their own original order', () => {
    const input =
      '---\ntitle: T\nnumber: 1\nlayout: challenge\ntags: [ a ]\ndescription: D\n' +
      'date: 2026-01-01T00:00:00.000Z\n---\nbody\n'
    const result = planLayoutMove({
      files: [file('platform/challenge/s/index.md', input)],
    })
    const move = result.ops.find((op) => op.kind === 'move')
    const declare = result.ops.find((op) => op.kind === 'declare')
    expect(Buffer.from(move.content).toString('utf8')).toBe(
      '---\ntitle: T\nlayout: challenge\ndescription: D\n---\nbody\n',
    )
    expect(Buffer.from(declare.content).toString('utf8')).toBe(
      'number: 1\ntags: [ a ]\ndate: 2026-01-01T00:00:00.000Z\n',
    )
  })
})

describe('U23: line endings per line and the BOM', () => {
  it('keeps CRLF on every output line for an all-CRLF brief', () => {
    const input = '---\r\ntitle: T\r\nlayout: challenge\r\nnumber: 1\r\n---\r\nbody\r\n'
    const result = planLayoutMove({ files: [file('platform/challenge/s/index.md', input)] })
    const move = result.ops.find((op) => op.kind === 'move')
    const declare = result.ops.find((op) => op.kind === 'declare')
    expect(Buffer.from(move.content).toString('utf8')).toBe(
      '---\r\ntitle: T\r\nlayout: challenge\r\n---\r\nbody\r\n',
    )
    expect(Buffer.from(declare.content).toString('utf8')).toBe('number: 1\r\n')
  })

  it('keeps each line\'s own ending in a mixed brief', () => {
    const input = '---\ntitle: T\r\nnumber: 1\nlayout: challenge\r\nbackend: flask\n---\nbody\n'
    const result = planLayoutMove({ files: [file('platform/challenge/s/index.md', input)] })
    const move = result.ops.find((op) => op.kind === 'move')
    const declare = result.ops.find((op) => op.kind === 'declare')
    expect(Buffer.from(move.content).toString('utf8')).toBe(
      '---\ntitle: T\r\nlayout: challenge\r\n---\nbody\n',
    )
    expect(Buffer.from(declare.content).toString('utf8')).toBe('number: 1\nbackend: flask\n')
  })

  it('keeps the BOM only in the brief, never in challenge.yaml', () => {
    const bytes = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('---\ntitle: T\nlayout: challenge\nnumber: 1\n---\nbody\n', 'utf8'),
    ])
    const result = planLayoutMove({
      files: [{ path: 'platform/challenge/s/index.md', bytes, mode: 0o100644 }],
    })
    const move = result.ops.find((op) => op.kind === 'move')
    const declare = result.ops.find((op) => op.kind === 'declare')
    expect(Buffer.from(move.content).subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]))
    expect(Buffer.from(declare.content).subarray(0, 3)).not.toEqual(Buffer.from([0xef, 0xbb, 0xbf]))
  })
})

describe('U24: multi-line groups stay one unit; a quoted key is a declaration', () => {
  it('joins a leading comment+blank into the first group, keeps a block sequence, a block scalar, a blank line inside a group, and treats a quoted key as a declaration', () => {
    const input =
      '---\n# a note\n\ntitle: T\nlayout: challenge\ndescription: >-\n  Some\n  text\n' +
      'tags:\n  - a\n  # comment\n  - b\n"number": 1\n\nbackend: flask\n---\nbody\n'
    const result = planLayoutMove({ files: [file('platform/challenge/s/index.md', input)] })
    const move = result.ops.find((op) => op.kind === 'move')
    const declare = result.ops.find((op) => op.kind === 'declare')
    expect(Buffer.from(move.content).toString('utf8')).toBe(
      '---\n# a note\n\ntitle: T\nlayout: challenge\ndescription: >-\n  Some\n  text\n---\nbody\n',
    )
    expect(Buffer.from(declare.content).toString('utf8')).toBe(
      'tags:\n  - a\n  # comment\n  - b\n"number": 1\n\nbackend: flask\n',
    )
  })
})

describe('U25: each split check broken gives frontmatter', () => {
  const BRIEF_PATH = 'platform/challenge/s/index.md'

  function expectFrontmatterFailure(bytes) {
    const result = planLayoutMove({
      files: [{ path: BRIEF_PATH, bytes: Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, 'utf8'), mode: 0o100644 }],
    })
    expect(result).toEqual({ failures: [{ token: 'frontmatter', path: BRIEF_PATH }] })
  }

  it('SC1: invalid UTF-8 in the front matter', () => {
    expectFrontmatterFailure(
      Buffer.concat([
        Buffer.from('---\ntitle: T\nlayout: challenge\nx: '),
        Buffer.from([0xff]),
        Buffer.from('\n---\nbody\n'),
      ]),
    )
  })

  it('SC2: no opening fence', () => {
    expectFrontmatterFailure('title: T\nlayout: challenge\n')
  })

  it('SC2: unclosed fence', () => {
    expectFrontmatterFailure('---\ntitle: T\nlayout: challenge\nnumber: 1\n')
  })

  it('SC2: a closing fence with a trailing space is not a fence (unclosed)', () => {
    expectFrontmatterFailure('---\ntitle: T\nlayout: challenge\nnumber: 1\n--- \nbody\n')
  })

  it('SC3: a top-level scalar', () => {
    expectFrontmatterFailure('---\nhello\n---\nbody\n')
  })

  it('SC3: a top-level sequence', () => {
    expectFrontmatterFailure('---\n- a\n- b\n---\nbody\n')
  })

  it('SC3: a duplicate key', () => {
    expectFrontmatterFailure('---\ntitle: T\ntitle: U\nlayout: challenge\nnumber: 1\n---\nbody\n')
  })

  it('SC4: an anchor in tags aliased by keywords', () => {
    expectFrontmatterFailure(
      '---\ntitle: T\nlayout: challenge\ntags: &t [ a, b ]\nkeywords: *t\nnumber: 1\n---\nbody\n',
    )
  })

  it('SC4: a top-level flow mapping on one line', () => {
    expectFrontmatterFailure('---\n{ a: 1 }\n---\nbody\n')
  })

  it('SC6: an English brief with only title, description, layout', () => {
    expectFrontmatterFailure('---\ntitle: T\ndescription: D\nlayout: challenge\n---\nbody\n')
  })

  it('D144: an unknown tag whose value holds ESC, inside tags, raises no warning to the terminal', () => {
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      expectFrontmatterFailure(
        '---\ntitle: T\nlayout: challenge\ntags: [ !foo "\\u001b" ]\nnumber: 1\n---\nbody\n',
      )
      expect(emitWarning).not.toHaveBeenCalled()
      expect(consoleWarn).not.toHaveBeenCalled()
      expect(stderrWrite).not.toHaveBeenCalled()
    } finally {
      emitWarning.mockRestore()
      consoleWarn.mockRestore()
      stderrWrite.mockRestore()
    }
  })

  it('D144: an unknown tag whose value holds ESC, on a key, raises no warning to the terminal', () => {
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      expectFrontmatterFailure(
        '---\ntitle: T\nlayout: challenge\n!foo "\\u001b": 1\nnumber: 2\n---\nbody\n',
      )
      expect(emitWarning).not.toHaveBeenCalled()
      expect(consoleWarn).not.toHaveBeenCalled()
      expect(stderrWrite).not.toHaveBeenCalled()
    } finally {
      emitWarning.mockRestore()
      consoleWarn.mockRestore()
      stderrWrite.mockRestore()
    }
  })

  it('D145: a top-level non-scalar key raises no warning to the terminal', () => {
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      expectFrontmatterFailure(
        '---\ntitle: T\nlayout: challenge\n[x]: 1\nnumber: 1\n---\nbody\n',
      )
      expect(emitWarning).not.toHaveBeenCalled()
      expect(consoleWarn).not.toHaveBeenCalled()
      expect(stderrWrite).not.toHaveBeenCalled()
    } finally {
      emitWarning.mockRestore()
      consoleWarn.mockRestore()
      stderrWrite.mockRestore()
    }
  })

  it('D145: a collection key nested under tags raises no warning to the terminal', () => {
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      expectFrontmatterFailure(
        '---\ntitle: T\nlayout: challenge\ntags:\n  [x]: 1\nnumber: 1\n---\nbody\n',
      )
      expect(emitWarning).not.toHaveBeenCalled()
      expect(consoleWarn).not.toHaveBeenCalled()
      expect(stderrWrite).not.toHaveBeenCalled()
    } finally {
      emitWarning.mockRestore()
      consoleWarn.mockRestore()
      stderrWrite.mockRestore()
    }
  })

  it('D145: an explicit key syntax raises no warning to the terminal', () => {
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      expectFrontmatterFailure(
        '---\ntitle: T\nlayout: challenge\n? [x]\nnumber: 1\n---\nbody\n',
      )
      expect(emitWarning).not.toHaveBeenCalled()
      expect(consoleWarn).not.toHaveBeenCalled()
      expect(stderrWrite).not.toHaveBeenCalled()
    } finally {
      emitWarning.mockRestore()
      consoleWarn.mockRestore()
      stderrWrite.mockRestore()
    }
  })

  it('D145: an alias used as a key raises no warning to the terminal, even when its anchor holds a scalar', () => {
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      // The anchor and the alias are nested inside the same group's value (delta review F2): a
      // top-level alias key always starts its own front-matter group (U-§1 "key line"), so the
      // group-level reparse loses the anchor and fails on "unresolved alias" during toJS even
      // with the D145 guard removed, regardless of spacing — the case cannot then tell the guard
      // apart from that unrelated failure. Keeping both lines in one group, and a space before
      // the colon to avoid yaml's own "implicit map keys"/"alias ending in :" diagnostics, makes
      // this case pass without the guard and fail only once the guard runs.
      expectFrontmatterFailure(
        '---\ntitle: T\nlayout: challenge\ntags:\n  number: &n 1\n  *n : 2\nnumber: 1\n---\nbody\n',
      )
      expect(emitWarning).not.toHaveBeenCalled()
      expect(consoleWarn).not.toHaveBeenCalled()
      expect(stderrWrite).not.toHaveBeenCalled()
    } finally {
      emitWarning.mockRestore()
      consoleWarn.mockRestore()
      stderrWrite.mockRestore()
    }
  })

  it('D146: a YAML 1.1 !!timestamp tag on a key raises no warning to the terminal', () => {
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      expectFrontmatterFailure(
        '---\ntitle: T\nlayout: challenge\n!!timestamp 2026-01-01: 1\nnumber: 1\n---\nbody\n',
      )
      expect(emitWarning).not.toHaveBeenCalled()
      expect(consoleWarn).not.toHaveBeenCalled()
      expect(stderrWrite).not.toHaveBeenCalled()
    } finally {
      emitWarning.mockRestore()
      consoleWarn.mockRestore()
      stderrWrite.mockRestore()
    }
  })

  it('D146: a YAML 1.1 !!binary tag on a key raises no warning to the terminal', () => {
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      expectFrontmatterFailure(
        '---\ntitle: T\nlayout: challenge\n!!binary aGVsbG8=: 1\nnumber: 1\n---\nbody\n',
      )
      expect(emitWarning).not.toHaveBeenCalled()
      expect(consoleWarn).not.toHaveBeenCalled()
      expect(stderrWrite).not.toHaveBeenCalled()
    } finally {
      emitWarning.mockRestore()
      consoleWarn.mockRestore()
      stderrWrite.mockRestore()
    }
  })

  it('D146: a YAML 1.1 !!merge tag used as a key raises no warning to the terminal', () => {
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      expectFrontmatterFailure(
        '---\ntitle: T\nlayout: challenge\n!!merge foo: {x: 1}\nnumber: 1\n---\nbody\n',
      )
      expect(emitWarning).not.toHaveBeenCalled()
      expect(consoleWarn).not.toHaveBeenCalled()
      expect(stderrWrite).not.toHaveBeenCalled()
    } finally {
      emitWarning.mockRestore()
      consoleWarn.mockRestore()
      stderrWrite.mockRestore()
    }
  })

  it('D146: a YAML 1.1 !!set tag as a value raises no warning to the terminal', () => {
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      expectFrontmatterFailure(
        '---\ntitle: T\nlayout: challenge\ntags: !!set\n  ? a\n  ? b\nnumber: 1\n---\nbody\n',
      )
      expect(emitWarning).not.toHaveBeenCalled()
      expect(consoleWarn).not.toHaveBeenCalled()
      expect(stderrWrite).not.toHaveBeenCalled()
    } finally {
      emitWarning.mockRestore()
      consoleWarn.mockRestore()
      stderrWrite.mockRestore()
    }
  })
})

describe('Final review F3: a .nan value does not misjudge a well-formed brief as frontmatter', () => {
  it('a declaration group holding .nan still splits and declares (SC4/SC5)', () => {
    const input = '---\ntitle: T\nlayout: challenge\nnumber: .nan\n---\nbody\n'
    const result = planLayoutMove({
      files: [file('platform/challenge/s/index.md', input)],
    })
    expect(result.failures).toBeUndefined()
    const declare = result.ops.find((op) => op.kind === 'declare')
    expect(declare).toBeDefined()
    expect(Buffer.from(declare.content).toString('utf8')).toBe('number: .nan\n')
  })
})

describe('U26: a brief with only declarations keeps only its fences', () => {
  it('leaves an empty kept group between the fences', () => {
    const input = '---\nnumber: 1\nbackend: flask\n---\n# Body\n'
    const result = planLayoutMove({ files: [file('platform/challenge/s/index.md', input)] })
    const move = result.ops.find((op) => op.kind === 'move')
    const declare = result.ops.find((op) => op.kind === 'declare')
    expect(Buffer.from(move.content).toString('utf8')).toBe('---\n---\n# Body\n')
    expect(Buffer.from(declare.content).toString('utf8')).toBe('number: 1\nbackend: flask\n')
  })
})

describe('U27: a translation brief is stripped, left alone, or fails frontmatter', () => {
  const englishBrief = file('platform/challenge/s/index.md', '---\ntitle: S\nlayout: challenge\nnumber: 1\n---\n')

  it('strips the declaration key, keeping the kept keys and the body', () => {
    const translation = file(
      'platform/zh-TW/challenge/s/index.md',
      '---\ntitle: 甲\nnumber: 1\nlayout: challenge\n---\nbody\n',
    )
    const result = planLayoutMove({ files: [englishBrief, translation] })
    expect(result.ops).toContainEqual({
      kind: 'strip',
      path: 'platform/zh-TW/challenge/s/index.md',
      content: Buffer.from('---\ntitle: 甲\nlayout: challenge\n---\nbody\n', 'utf8'),
    })
  })

  it('leaves it with no op when it has no declaration key', () => {
    const translation = file(
      'platform/zh-TW/challenge/s/index.md',
      '---\ntitle: 甲\nlayout: challenge\n---\nbody\n',
    )
    const result = planLayoutMove({ files: [englishBrief, translation] })
    expect(result.ops.find((op) => op.path === 'platform/zh-TW/challenge/s/index.md')).toBeUndefined()
  })

  it('fails frontmatter when it has no front matter', () => {
    const translation = file('platform/zh-TW/challenge/s/index.md', 'no front matter here\n')
    const result = planLayoutMove({ files: [englishBrief, translation] })
    expect(result.failures).toContainEqual({
      token: 'frontmatter',
      path: 'platform/zh-TW/challenge/s/index.md',
    })
  })
})

describe('U28: an orphan translation brief stops; a declared slug\'s is untouched', () => {
  const translation = file(
    'platform/zh-TW/challenge/s/index.md',
    '---\ntitle: 甲\nnumber: 1\nlayout: challenge\n---\nbody\n',
  )
  // Note 5: each tree also holds a legacy page so it is not a no-op tree (U30).
  const anchor = file('platform/index.md', '# home\n')

  it('is orphan-brief alone when its slug has no English brief and is not declared', () => {
    const result = planLayoutMove({ files: [translation, anchor] })
    expect(result.failures).toEqual([{ token: 'orphan-brief', path: 'platform/zh-TW/challenge/s/index.md' }])
  })

  it('is untouched beside a declaration file', () => {
    const declarationFile = file('platform/challenge/s/challenge.yaml', 'number: 1\n')
    const result = planLayoutMove({ files: [translation, declarationFile, anchor] })
    expect(result.failures).toBeUndefined()
    expect(result.ops.find((op) => op.path === 'platform/zh-TW/challenge/s/index.md')).toBeUndefined()
  })

  it('is untouched beside a new-layout English brief', () => {
    const newLayoutBrief = file('platform/en/challenge/s/index.md', '---\ntitle: S\nlayout: challenge\n---\nbody\n')
    const result = planLayoutMove({ files: [translation, newLayoutBrief, anchor] })
    expect(result.failures).toBeUndefined()
    expect(result.ops.find((op) => op.path === 'platform/zh-TW/challenge/s/index.md')).toBeUndefined()
  })
})

describe('U29: a destination already present', () => {
  it('fails target-exists, naming the from and the to', () => {
    const result = planLayoutMove({
      files: [file('platform/x.md', '# x\n'), file('platform/en/x.md', '# existing\n')],
    })
    expect(result.failures).toEqual([
      { token: 'target-exists', path: 'platform/x.md', to: 'platform/en/x.md' },
    ])
  })

  it('fails target-exists for a declare op, naming the English brief as the from', () => {
    const content = '---\ntitle: S\nlayout: challenge\nnumber: 1\n---\n'
    const result = planLayoutMove({
      files: [
        file('platform/challenge/s/index.md', content),
        file('platform/challenge/s/challenge.yaml', 'number: 1\n'),
      ],
    })
    expect(result.failures).toEqual([
      {
        token: 'target-exists',
        path: 'platform/challenge/s/index.md',
        to: 'platform/challenge/s/challenge.yaml',
      },
    ])
  })
})

describe('U30: no legacy page is a no-op', () => {
  it('a new-layout tree, with a translation brief carrying a declaration key, is a no-op', () => {
    const result = planLayoutMove({
      files: [
        file('platform/en/index.md', '# home\n'),
        file('platform/zh-TW/index.md', '# home\n'),
        file('platform/challenge/s1/challenge.yaml', 'number: 1\n'),
        file('platform/zh-TW/challenge/s1/index.md', '---\ntitle: 甲\nnumber: 1\nlayout: challenge\n---\nbody\n'),
      ],
    })
    expect(result).toEqual({ legacy: false, ops: [], mismatches: [] })
  })

  it('an empty tree is a no-op', () => {
    expect(planLayoutMove({ files: [] })).toEqual({ legacy: false, ops: [], mismatches: [] })
  })
})

describe('U146: a new-layout tree with one stray page moves that page alone', () => {
  it('moves only the stray page; no strip, no failures', () => {
    const result = planLayoutMove({
      files: [
        file('platform/en/index.md', '# home\n'),
        file('platform/zh-TW/index.md', '# home\n'),
        file('platform/challenge/s1/challenge.yaml', 'number: 1\n'),
        file('platform/zh-TW/challenge/s1/index.md', '---\ntitle: 甲\nnumber: 1\nlayout: challenge\n---\nbody\n'),
        file('platform/guide/mine.md', '# mine\n'),
      ],
    })
    expect(result).toEqual({
      legacy: true,
      ops: [
        {
          kind: 'move',
          from: 'platform/guide/mine.md',
          to: 'platform/en/guide/mine.md',
          content: Buffer.from('# mine\n', 'utf8'),
          mode: MODE,
        },
      ],
      mismatches: [],
    })
  })
})

describe("U47: mismatches compare values as yaml parses them", () => {
  function run(englishDeclLine, translationDeclLine) {
    const englishBrief = file(
      'platform/challenge/s/index.md',
      `---\ntitle: S\nlayout: challenge\nbackend: flask\n${englishDeclLine}\n---\nbody\n`,
    )
    const translation = file(
      'platform/zh-TW/challenge/s/index.md',
      `---\ntitle: 甲\nlayout: challenge\nbackend: flask\n${translationDeclLine}\n---\nbody\n`,
    )
    return planLayoutMove({ files: [englishBrief, translation] })
  }

  it('tags with different flow-sequence spacing are not a mismatch', () => {
    const result = run('tags: [ a, b ]', 'tags: [a, b]')
    expect(result.mismatches).toEqual([])
  })

  it('number vs a quoted "1" is a mismatch', () => {
    const result = run('number: 1', 'number: "1"')
    expect(result.mismatches).toEqual([
      { brief: 'platform/zh-TW/challenge/s/index.md', key: 'number', enValue: 1, value: '1' },
    ])
  })

  it('source_visible vs a quoted "true" is a mismatch', () => {
    const result = run('source_visible: true', 'source_visible: "true"')
    expect(result.mismatches).toEqual([
      {
        brief: 'platform/zh-TW/challenge/s/index.md',
        key: 'source_visible',
        enValue: true,
        value: 'true',
      },
    ])
  })

  it('the same core-schema date text is not a mismatch', () => {
    const result = run(
      'date: 2026-04-02T08:54:17.674Z',
      'date: 2026-04-02T08:54:17.674Z',
    )
    expect(result.mismatches).toEqual([])
  })

  it('revision 2.2 O-1: a __proto__ key present only in the translation is a mismatch, not swallowed by the inherited Object.prototype', () => {
    const englishBrief = file(
      'platform/challenge/s/index.md',
      '---\ntitle: S\nlayout: challenge\nbackend: flask\n---\nbody\n',
    )
    const translation = file(
      'platform/zh-TW/challenge/s/index.md',
      '---\ntitle: 甲\nlayout: challenge\nbackend: flask\n__proto__: {}\n---\nbody\n',
    )
    const result = planLayoutMove({ files: [englishBrief, translation] })
    expect(result.mismatches).toEqual([
      {
        brief: 'platform/zh-TW/challenge/s/index.md',
        key: '__proto__',
        enValue: undefined,
        value: {},
      },
    ])
  })

  it('revision 2.2 O-1: a constructor key present only in the English brief reads as a mismatch against undefined, not the inherited Object constructor', () => {
    const englishBrief = file(
      'platform/challenge/s/index.md',
      '---\ntitle: S\nlayout: challenge\nbackend: flask\nconstructor: 5\n---\nbody\n',
    )
    const translation = file(
      'platform/zh-TW/challenge/s/index.md',
      '---\ntitle: 甲\nlayout: challenge\nbackend: flask\n---\nbody\n',
    )
    const result = planLayoutMove({ files: [englishBrief, translation] })
    expect(result.mismatches).toEqual([
      {
        brief: 'platform/zh-TW/challenge/s/index.md',
        key: 'constructor',
        enValue: 5,
        value: undefined,
      },
    ])
  })
})

describe('U150: legacy pages named like a locale move like any page', () => {
  it('moves platform/en.md and platform/zh-TW.md with no failures', () => {
    const result = planLayoutMove({
      files: [file('platform/en.md', '# en\n'), file('platform/zh-TW.md', '# zh\n')],
    })
    expect(result.failures).toBeUndefined()
    const tos = result.ops.filter((op) => op.kind === 'move').map((op) => op.to)
    expect(tos.sort()).toEqual(['platform/en/en.md', 'platform/en/zh-TW.md'])
  })
})

describe('U31: deterministic', () => {
  it('two calls on fresh input arrays agree', () => {
    const buildFiles = () => [
      {
        path: 'platform/challenge/door-is-open/index.md',
        bytes: readFileSync(FIXTURES + 'source-index.md'),
        mode: 0o100644,
      },
      file(
        'platform/zh-TW/challenge/door-is-open/index.md',
        '---\ntitle: 甲\nnumber: 1\nlayout: challenge\n---\nbody\n',
      ),
      file('platform/guide/mine.md', '# mine\n'),
    ]
    const first = planLayoutMove({ files: buildFiles() })
    const second = planLayoutMove({ files: buildFiles() })
    expect(first).toEqual(second)
  })
})

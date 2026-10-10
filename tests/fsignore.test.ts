import { describe, it, expect } from 'vitest'
import { parseFsIgnore } from '../scripts/fsignore'

// ─── Empty / trivial input ───────────────────────────────────────────────────

describe('parseFsIgnore — empty input', () => {
  it('returns a function that ignores nothing when content is empty', () => {
    const isIgnored = parseFsIgnore('')
    expect(isIgnored('foo.py', false)).toBe(false)
    expect(isIgnored('bar/baz.txt', false)).toBe(false)
    expect(isIgnored('dir', true)).toBe(false)
  })
})

// ─── Comments and blank lines ────────────────────────────────────────────────

describe('parseFsIgnore — comments and blank lines', () => {
  it('skips blank lines and comment lines', () => {
    const content = `
# This is a comment

# Another comment

`
    const isIgnored = parseFsIgnore(content)
    expect(isIgnored('anything.txt', false)).toBe(false)
    expect(isIgnored('some/path', true)).toBe(false)
  })
})

// ─── Simple glob patterns ────────────────────────────────────────────────────

describe('parseFsIgnore — simple glob patterns', () => {
  it('matches *.pyc files at root level', () => {
    const isIgnored = parseFsIgnore('*.pyc')
    expect(isIgnored('foo.pyc', false)).toBe(true)
    expect(isIgnored('bar.pyc', false)).toBe(true)
    expect(isIgnored('foo.py', false)).toBe(false)
    expect(isIgnored('foo.pyc.bak', false)).toBe(false)
  })

  it('matches *.pyc files at any depth (unanchored pattern)', () => {
    const isIgnored = parseFsIgnore('*.pyc')
    expect(isIgnored('sub/foo.pyc', false)).toBe(true)
    expect(isIgnored('a/b/c/foo.pyc', false)).toBe(true)
  })

  it('matches a specific filename at any depth', () => {
    const isIgnored = parseFsIgnore('Thumbs.db')
    expect(isIgnored('Thumbs.db', false)).toBe(true)
    expect(isIgnored('images/Thumbs.db', false)).toBe(true)
    expect(isIgnored('a/b/Thumbs.db', false)).toBe(true)
    expect(isIgnored('Thumbs.db.bak', false)).toBe(false)
  })
})

// ─── Directory-only patterns ─────────────────────────────────────────────────

describe('parseFsIgnore — directory patterns', () => {
  it('matches directory named __pycache__/ only when isDirectory is true', () => {
    const isIgnored = parseFsIgnore('__pycache__/')
    expect(isIgnored('__pycache__', true)).toBe(true)
    expect(isIgnored('__pycache__', false)).toBe(false) // file, not directory
    expect(isIgnored('sub/__pycache__', true)).toBe(true)
  })

  it('matches test_data/ directory at any depth', () => {
    const isIgnored = parseFsIgnore('test_data/')
    expect(isIgnored('test_data', true)).toBe(true)
    expect(isIgnored('sub/test_data', true)).toBe(true)
    expect(isIgnored('test_data', false)).toBe(false) // file
  })
})

// ─── Root-anchored patterns ─────────────────────────────────────────────────

describe('parseFsIgnore — root-anchored patterns', () => {
  it('matches /build only at root level', () => {
    const isIgnored = parseFsIgnore('/build')
    expect(isIgnored('build', false)).toBe(true)
    expect(isIgnored('build', true)).toBe(true)
    expect(isIgnored('sub/build', false)).toBe(false) // not at root
    expect(isIgnored('sub/build', true)).toBe(false)
  })

  it('matches /dist/ only at root level and only if directory', () => {
    const isIgnored = parseFsIgnore('/dist/')
    expect(isIgnored('dist', true)).toBe(true)
    expect(isIgnored('dist', false)).toBe(false) // trailing / means directory only
    expect(isIgnored('sub/dist', true)).toBe(false) // not at root
  })
})

// ─── Negation patterns ───────────────────────────────────────────────────────

describe('parseFsIgnore — negation patterns', () => {
  it('negates a previously matching pattern', () => {
    const content = `*.pyc
!important.pyc`
    const isIgnored = parseFsIgnore(content)
    expect(isIgnored('foo.pyc', false)).toBe(true)
    expect(isIgnored('important.pyc', false)).toBe(false) // negated
    expect(isIgnored('sub/important.pyc', false)).toBe(false) // negated at any depth
  })

  it('negation only un-ignores, does not ignore new files', () => {
    const content = `!foo.txt`
    const isIgnored = parseFsIgnore(content)
    // foo.txt was never ignored, negation doesn't change that
    expect(isIgnored('foo.txt', false)).toBe(false)
    expect(isIgnored('bar.txt', false)).toBe(false)
  })
})

// ─── Double-star patterns ────────────────────────────────────────────────────

describe('parseFsIgnore — double-star patterns', () => {
  it('matches **/*.log at any depth', () => {
    const isIgnored = parseFsIgnore('**/*.log')
    expect(isIgnored('app.log', false)).toBe(true)
    expect(isIgnored('logs/app.log', false)).toBe(true)
    expect(isIgnored('a/b/c/app.log', false)).toBe(true)
    expect(isIgnored('app.txt', false)).toBe(false)
  })

  it('matches platform/**/*.tmp — .tmp files under platform/', () => {
    const isIgnored = parseFsIgnore('platform/**/*.tmp')
    expect(isIgnored('platform/file.tmp', false)).toBe(true)
    expect(isIgnored('platform/sub/file.tmp', false)).toBe(true)
    expect(isIgnored('platform/a/b/c/file.tmp', false)).toBe(true)
    expect(isIgnored('other/file.tmp', false)).toBe(false)
    expect(isIgnored('file.tmp', false)).toBe(false)
  })

  it('matches a/**/b pattern', () => {
    const isIgnored = parseFsIgnore('a/**/b')
    expect(isIgnored('a/b', false)).toBe(true)
    expect(isIgnored('a/x/b', false)).toBe(true)
    expect(isIgnored('a/x/y/b', false)).toBe(true)
    expect(isIgnored('b', false)).toBe(false)
    expect(isIgnored('x/a/b', false)).toBe(false) // anchored because contains /
  })
})

// ─── Patterns containing a slash (mid-path) are anchored ─────────────────────

describe('parseFsIgnore — slash-containing patterns are anchored', () => {
  it('pattern with / in middle is anchored to root', () => {
    const isIgnored = parseFsIgnore('src/test')
    expect(isIgnored('src/test', false)).toBe(true)
    expect(isIgnored('foo/src/test', false)).toBe(false) // anchored
  })
})

// ─── Real-world .fsignore ────────────────────────────────────────────────────

describe('parseFsIgnore — real-world example', () => {
  it('handles a mixed .fsignore correctly', () => {
    const content = `# Python artifacts
*.pyc
__pycache__/

# Test data (don't ship to WASM)
test_data/
/tests/

# But keep this test fixture
!test_data/required_fixture.json

# Logs
**/*.log

# Build output at root only
/build
/dist/

# Temporary files under docs
platform/**/*.tmp
`
    const isIgnored = parseFsIgnore(content)

    // *.pyc
    expect(isIgnored('app.pyc', false)).toBe(true)
    expect(isIgnored('sub/app.pyc', false)).toBe(true)

    // __pycache__/
    expect(isIgnored('__pycache__', true)).toBe(true)
    expect(isIgnored('pkg/__pycache__', true)).toBe(true)
    expect(isIgnored('__pycache__', false)).toBe(false)

    // test_data/
    expect(isIgnored('test_data', true)).toBe(true)
    expect(isIgnored('test_data', false)).toBe(false)

    // /tests/ — root-anchored directory
    expect(isIgnored('tests', true)).toBe(true)
    expect(isIgnored('tests', false)).toBe(false) // dir-only
    expect(isIgnored('sub/tests', true)).toBe(false) // root-anchored

    // !test_data/required_fixture.json — negation
    expect(isIgnored('test_data/required_fixture.json', false)).toBe(false)

    // **/*.log
    expect(isIgnored('server.log', false)).toBe(true)
    expect(isIgnored('logs/server.log', false)).toBe(true)

    // /build — root-only, any type
    expect(isIgnored('build', false)).toBe(true)
    expect(isIgnored('build', true)).toBe(true)
    expect(isIgnored('sub/build', false)).toBe(false)

    // /dist/ — root-only, directory
    expect(isIgnored('dist', true)).toBe(true)
    expect(isIgnored('dist', false)).toBe(false)

    // platform/**/*.tmp
    expect(isIgnored('platform/notes.tmp', false)).toBe(true)
    expect(isIgnored('platform/sub/notes.tmp', false)).toBe(true)
    expect(isIgnored('other/notes.tmp', false)).toBe(false)

    // Normal files should NOT be ignored
    expect(isIgnored('app.py', false)).toBe(false)
    expect(isIgnored('index.html', false)).toBe(false)
    expect(isIgnored('src/main.py', false)).toBe(false)
  })
})

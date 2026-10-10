import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { scanSrcDirectory, matchesGlob, DEFAULT_EXCLUDES } from '../scripts/challenge-utils'

describe('matchesGlob', () => {
  it('matches exact basename', () => {
    expect(matchesGlob('.DS_Store', '.DS_Store', false)).toBe(true)
    expect(matchesGlob('.DS_Store', 'other.txt', false)).toBe(false)
  })

  it('matches wildcard patterns against basename', () => {
    expect(matchesGlob('*.pyc', 'module.pyc', false)).toBe(true)
    expect(matchesGlob('*.pyc', 'module.py', false)).toBe(false)
    expect(matchesGlob('*.pyc', 'deep/module.pyc', false)).toBe(true)
  })

  it('trailing / only matches directories', () => {
    expect(matchesGlob('__pycache__/', '__pycache__', true)).toBe(true)
    expect(matchesGlob('__pycache__/', '__pycache__', false)).toBe(false)
  })

  it('pattern without / matches basename of nested paths', () => {
    expect(matchesGlob('*.swp', 'deep/nested/file.swp', false)).toBe(true)
    expect(matchesGlob('.DS_Store', 'subdir/.DS_Store', false)).toBe(true)
  })
})

describe('scanSrcDirectory', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'scan-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('scans flat directory and returns correct virtual paths', () => {
    writeFileSync(join(tmpDir, 'flag.txt'), 'flag{test}')
    writeFileSync(join(tmpDir, 'app.py'), 'print("hello")')

    const results = scanSrcDirectory(tmpDir)
    const paths = results.map(r => r.virtualPath).sort()

    expect(paths).toEqual(['/app.py', '/flag.txt'])
    // Check absolutePath is correct
    const flagResult = results.find(r => r.virtualPath === '/flag.txt')!
    expect(flagResult.absolutePath).toBe(join(tmpDir, 'flag.txt'))
  })

  it('scans nested directories and returns correct virtual paths', () => {
    mkdirSync(join(tmpDir, 'templates'), { recursive: true })
    mkdirSync(join(tmpDir, 'static', 'css'), { recursive: true })
    writeFileSync(join(tmpDir, 'app.py'), '')
    writeFileSync(join(tmpDir, 'templates', 'index.html'), '<html></html>')
    writeFileSync(join(tmpDir, 'static', 'css', 'style.css'), 'body {}')

    const results = scanSrcDirectory(tmpDir)
    const paths = results.map(r => r.virtualPath).sort()

    expect(paths).toEqual([
      '/app.py',
      '/static/css/style.css',
      '/templates/index.html',
    ])
  })

  it('excludes __pycache__/ directories and their contents', () => {
    mkdirSync(join(tmpDir, '__pycache__'), { recursive: true })
    writeFileSync(join(tmpDir, '__pycache__', 'module.cpython-311.pyc'), '')
    writeFileSync(join(tmpDir, 'app.py'), '')

    const results = scanSrcDirectory(tmpDir)
    const paths = results.map(r => r.virtualPath)

    expect(paths).toEqual(['/app.py'])
  })

  it('excludes *.pyc files', () => {
    writeFileSync(join(tmpDir, 'app.py'), '')
    writeFileSync(join(tmpDir, 'app.pyc'), '')
    writeFileSync(join(tmpDir, 'module.pyo'), '')

    const results = scanSrcDirectory(tmpDir)
    const paths = results.map(r => r.virtualPath)

    expect(paths).toEqual(['/app.py'])
  })

  it('excludes .DS_Store', () => {
    writeFileSync(join(tmpDir, '.DS_Store'), '')
    writeFileSync(join(tmpDir, 'app.py'), '')
    mkdirSync(join(tmpDir, 'sub'), { recursive: true })
    writeFileSync(join(tmpDir, 'sub', '.DS_Store'), '')
    writeFileSync(join(tmpDir, 'sub', 'file.txt'), '')

    const results = scanSrcDirectory(tmpDir)
    const paths = results.map(r => r.virtualPath).sort()

    expect(paths).toEqual(['/app.py', '/sub/file.txt'])
  })

  it('does not exclude regular files that do not match any pattern', () => {
    writeFileSync(join(tmpDir, 'main.py'), '')
    writeFileSync(join(tmpDir, 'config.json'), '')
    writeFileSync(join(tmpDir, 'flag.txt'), '')
    writeFileSync(join(tmpDir, 'requirements.txt'), '')

    const results = scanSrcDirectory(tmpDir)
    const paths = results.map(r => r.virtualPath).sort()

    expect(paths).toEqual(['/config.json', '/flag.txt', '/main.py', '/requirements.txt'])
  })

  it('works with external isExcluded function', () => {
    mkdirSync(join(tmpDir, 'secret'), { recursive: true })
    writeFileSync(join(tmpDir, 'app.py'), '')
    writeFileSync(join(tmpDir, 'notes.md'), '')
    writeFileSync(join(tmpDir, 'secret', 'key.pem'), '')

    const isExcluded = (relativePath: string, isDirectory: boolean) => {
      if (isDirectory && relativePath === 'secret') return true
      if (relativePath.endsWith('.md')) return true
      return false
    }

    const results = scanSrcDirectory(tmpDir, isExcluded)
    const paths = results.map(r => r.virtualPath)

    expect(paths).toEqual(['/app.py'])
  })

  it('returns empty array for empty directory', () => {
    const results = scanSrcDirectory(tmpDir)
    expect(results).toEqual([])
  })
})

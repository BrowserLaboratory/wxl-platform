import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { deriveSlugs, runLintStaged } from '../scripts/challenge-lint-staged'

describe('deriveSlugs', () => {
  it('derives slug from a single per-folder file', () => {
    const result = deriveSlugs(['platform/challenge/sqli-demo/index.md'])
    expect(result).toEqual(['sqli-demo'])
  })

  it('deduplicates multiple files in the same challenge', () => {
    const result = deriveSlugs([
      'platform/challenge/sqli-demo/index.md',
      'platform/challenge/sqli-demo/src/app.py',
    ])
    expect(result).toEqual(['sqli-demo'])
  })

  it('derives slugs from multiple challenges', () => {
    const result = deriveSlugs([
      'platform/challenge/sqli-demo/src/app.py',
      'platform/challenge/php-demo/index.md',
    ])
    expect(result).toEqual(expect.arrayContaining(['sqli-demo', 'php-demo']))
    expect(result).toHaveLength(2)
  })

  it('returns empty array for non-challenge files', () => {
    const result = deriveSlugs([
      'scripts/foo.ts',
      'README.md',
      'package.json',
    ])
    expect(result).toEqual([])
  })

  it('derives slug from legacy flat file', () => {
    const result = deriveSlugs(['platform/challenge/old-chall.md'])
    expect(result).toEqual(['old-chall'])
  })

  it('handles absolute paths with platform/challenge/ segment', () => {
    const result = deriveSlugs([
      '/Users/dev/project/platform/challenge/fastapi-demo/src/app.py',
    ])
    expect(result).toEqual(['fastapi-demo'])
  })

  it('handles Windows-style backslash paths', () => {
    const result = deriveSlugs([
      'C:\\project\\platform\\challenge\\xss-basic\\index.md',
    ])
    expect(result).toEqual(['xss-basic'])
  })

  it('returns empty for empty input', () => {
    expect(deriveSlugs([])).toEqual([])
  })

  it('ignores files directly under platform/challenge/ that are not .md', () => {
    const result = deriveSlugs(['platform/challenge/.gitkeep'])
    expect(result).toEqual([])
  })

  it('mixes per-folder and legacy in one batch', () => {
    const result = deriveSlugs([
      'platform/challenge/sqli-demo/index.md',
      'platform/challenge/old-chall.md',
    ])
    expect(result).toEqual(expect.arrayContaining(['sqli-demo', 'old-chall']))
    expect(result).toHaveLength(2)
  })
})

describe('runLintStaged', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'lint-staged-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('catches backend/app extension mismatch (full validator check)', () => {
    // This check only exists in challenge-validate.ts, not in challenge-analyze.ts.
    // If lint-staged only calls the analyze validator, this will incorrectly pass.
    const slugDir = join(tmpDir, 'bad-ext')
    const srcDir = join(slugDir, 'src')
    mkdirSync(srcDir, { recursive: true })

    // backend is "flask" (expects .py) but app file is .php — extension mismatch
    writeFileSync(join(slugDir, 'index.md'), [
      '---',
      'title: "Bad Extension"',
      'backend: flask',
      'app: app.php',
      '---',
      '',
      'Mismatch test',
    ].join('\n'))
    writeFileSync(join(srcDir, 'app.php'), '<?php echo "hi"; ?>')
    writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{test_case}')

    const result = runLintStaged(tmpDir, ['bad-ext'])
    expect(result.hasErrors).toBe(true)
  })

  it('passes when challenge is fully valid', () => {
    const slugDir = join(tmpDir, 'good-chall')
    const srcDir = join(slugDir, 'src')
    mkdirSync(srcDir, { recursive: true })

    writeFileSync(join(slugDir, 'index.md'), [
      '---',
      'title: "Good Challenge"',
      'number: 1',
      'backend: flask',
      'app: app.py',
      '---',
      '',
      'Valid test',
    ].join('\n'))
    writeFileSync(join(srcDir, 'app.py'), 'from flask import Flask')
    writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{test_case}')

    const result = runLintStaged(tmpDir, ['good-chall'])
    expect(result.hasErrors).toBe(false)
  })

  it('catches invalid tools values (full validator check)', () => {
    const slugDir = join(tmpDir, 'bad-tools')
    const srcDir = join(slugDir, 'src')
    mkdirSync(srcDir, { recursive: true })

    writeFileSync(join(slugDir, 'index.md'), [
      '---',
      'title: "Bad Tools"',
      'backend: flask',
      'app: app.py',
      'tools:',
      '  - browser',
      '  - nonexistent-tool',
      '---',
      '',
      'Tools test',
    ].join('\n'))
    writeFileSync(join(srcDir, 'app.py'), 'from flask import Flask')
    writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{test_case}')

    const result = runLintStaged(tmpDir, ['bad-tools'])
    expect(result.hasErrors).toBe(true)
  })

  it('skips nonexistent slug (whole challenge removed)', () => {
    // A slug that doesn't exist on disk should be skipped, not errored.
    // This handles the case where an entire challenge directory is deleted.
    const result = runLintStaged(tmpDir, ['nonexistent-slug'])
    expect(result.hasErrors).toBe(false)
    expect(result.errors).toHaveLength(0)
  })

  it('errors on incomplete slug (directory exists but no index.md)', () => {
    // If the slug directory exists but has no index.md, the challenge is incomplete
    const slugDir = join(tmpDir, 'incomplete-slug')
    const srcDir = join(slugDir, 'src')
    mkdirSync(srcDir, { recursive: true })
    writeFileSync(join(srcDir, 'app.py'), 'from flask import Flask')

    const result = runLintStaged(tmpDir, ['incomplete-slug'])
    expect(result.hasErrors).toBe(true)
    expect(result.errors[0].messages[0]).toContain('incomplete challenge')
  })
})

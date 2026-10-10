import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateChallenge, discoverChallenges } from '../scripts/challenge-validate'

describe('validateChallenge', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'challenge-validate-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  // ── Per-folder structure tests ──────────────────────────────────────────

  describe('per-folder structure', () => {
    it('passes all checks for valid challenge', () => {
      const slugDir = join(tmpDir, 'test-challenge')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "Test Challenge"',
        'number: 1',
        'backend: fastapi',
        'app: app.py',
        'source_visible: false',
        '---',
        '',
        '# Test',
      ].join('\n'))

      writeFileSync(join(srcDir, 'app.py'), 'from fastapi import FastAPI')
      writeFileSync(join(srcDir, 'flag.txt'), 'flag{test123}')

      const result = validateChallenge(join(slugDir, 'index.md'))
      expect(result.slug).toBe('test-challenge')
      expect(result.allPassed).toBe(true)
      expect(result.checks.every(c => c.passed)).toBe(true)
    })

    it('fails when frontmatter is missing', () => {
      const slugDir = join(tmpDir, 'no-fm')
      mkdirSync(slugDir, { recursive: true })
      writeFileSync(join(slugDir, 'index.md'), '# No frontmatter here\n')

      const result = validateChallenge(join(slugDir, 'index.md'))
      expect(result.allPassed).toBe(false)
      expect(result.checks[0].label).toBe('frontmatter')
      expect(result.checks[0].passed).toBe(false)
    })

    it('fails when required fields are missing', () => {
      const slugDir = join(tmpDir, 'missing-fields')
      mkdirSync(slugDir, { recursive: true })
      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "Missing Backend"',
        '---',
        '',
        '# Test',
      ].join('\n'))

      const result = validateChallenge(join(slugDir, 'index.md'))
      expect(result.allPassed).toBe(false)
      expect(result.checks.some(c => c.label === 'frontmatter' && !c.passed)).toBe(true)
    })

    // The number is what a printed handout names. Its absence is a defect at the
    // page level, before anything cross-challenge is looked at.
    it('fails when the frontmatter carries no number', () => {
      const slugDir = join(tmpDir, 'no-number')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "No Number"',
        'backend: fastapi',
        'app: app.py',
        '---',
      ].join('\n'))
      writeFileSync(join(srcDir, 'app.py'), 'print("hello")')
      writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{no_number_here}')

      const result = validateChallenge(join(slugDir, 'index.md'))
      const numberCheck = result.checks.find(c => c.label === 'number')
      expect(numberCheck?.passed).toBe(false)
      expect(numberCheck?.message).toMatch(/number/)
      expect(result.allPassed).toBe(false)
    })

    it('fails when the number is not an integer greater than zero', () => {
      const slugDir = join(tmpDir, 'bad-number')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "Bad Number"',
        'number: "007"',
        'backend: fastapi',
        'app: app.py',
        '---',
      ].join('\n'))
      writeFileSync(join(srcDir, 'app.py'), 'print("hello")')
      writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{bad_number_x}')

      const result = validateChallenge(join(slugDir, 'index.md'))
      const numberCheck = result.checks.find(c => c.label === 'number')
      expect(numberCheck?.passed).toBe(false)
      expect(numberCheck?.message).toContain('007')
    })

    it('fails when backend does not match app file extension', () => {
      const slugDir = join(tmpDir, 'bad-ext')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "Bad Extension"',
        'backend: flask',
        'app: app.php',
        'source_visible: false',
        '---',
      ].join('\n'))

      writeFileSync(join(srcDir, 'app.php'), '<?php echo "hello"; ?>')
      writeFileSync(join(srcDir, 'flag.txt'), 'flag{test_case}')

      const result = validateChallenge(join(slugDir, 'index.md'))
      const backendCheck = result.checks.find(c => c.label === 'backend')
      expect(backendCheck?.passed).toBe(false)
      expect(backendCheck?.message).toContain('.py')
    })

    it('fails when app file does not exist', () => {
      const slugDir = join(tmpDir, 'no-app')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "No App"',
        'backend: fastapi',
        'app: app.py',
        'source_visible: false',
        '---',
      ].join('\n'))

      writeFileSync(join(srcDir, 'flag.txt'), 'flag{test_case}')

      const result = validateChallenge(join(slugDir, 'index.md'))
      const appCheck = result.checks.find(c => c.label === 'app')
      expect(appCheck?.passed).toBe(false)
      expect(appCheck?.message).toContain('not found')
    })

    it('fails when flag file does not exist', () => {
      const slugDir = join(tmpDir, 'no-flag')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "No Flag"',
        'backend: fastapi',
        'app: app.py',
        'source_visible: false',
        '---',
      ].join('\n'))

      writeFileSync(join(srcDir, 'app.py'), 'print("hello")')

      const result = validateChallenge(join(slugDir, 'index.md'))
      const flagCheck = result.checks.find(c => c.label === 'flag')
      expect(flagCheck?.passed).toBe(false)
      expect(flagCheck?.message).toContain('not found')
    })

    // The white-box build redacts the displayed source by replacing the flag's content
    // wherever it occurs. A short flag makes that replace hit ordinary identifiers, and
    // the build refuses it; validation is where an author first hears about it.
    it('fails when the flag is shorter than the redaction minimum', () => {
      const slugDir = join(tmpDir, 'short-flag')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "Short Flag"',
        'backend: fastapi',
        'app: app.py',
        '---',
      ].join('\n'))

      writeFileSync(join(srcDir, 'app.py'), 'print("hello")')
      writeFileSync(join(srcDir, 'flag.txt'), 'admin\n')

      const result = validateChallenge(join(slugDir, 'index.md'))
      const lengthCheck = result.checks.find(c => c.label === 'flag-length')
      expect(lengthCheck?.passed).toBe(false)
      expect(lengthCheck?.message).toMatch(/5 characters/)
      expect(lengthCheck?.message).toMatch(/at least 12/)
      expect(result.allPassed).toBe(false)
    })

    it('measures the flag after trimming, so a trailing newline does not count', () => {
      const slugDir = join(tmpDir, 'trimmed-flag')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "Trimmed Flag"',
        'backend: fastapi',
        'app: app.py',
        '---',
      ].join('\n'))

      writeFileSync(join(srcDir, 'app.py'), 'print("hello")')
      // Eleven visible characters plus a newline: twelve bytes, eleven after trim.
      writeFileSync(join(srcDir, 'flag.txt'), 'flag{abcde}\n')

      const result = validateChallenge(join(slugDir, 'index.md'))
      const lengthCheck = result.checks.find(c => c.label === 'flag-length')
      expect(lengthCheck?.passed).toBe(false)
      expect(lengthCheck?.message).toMatch(/11 characters/)
    })

    it('fails when the flag is long enough but not FLAG{...}/CTF{...} shaped', () => {
      const slugDir = join(tmpDir, 'unshaped-flag')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "Unshaped Flag"',
        'backend: fastapi',
        'app: app.py',
        '---',
      ].join('\n'))

      writeFileSync(join(srcDir, 'app.py'), 'print("hello")')
      writeFileSync(join(srcDir, 'flag.txt'), 'return request\n')

      const result = validateChallenge(join(slugDir, 'index.md'))
      expect(result.checks.find(c => c.label === 'flag-length')?.passed).toBe(true)
      const shapeCheck = result.checks.find(c => c.label === 'flag-shape')
      expect(shapeCheck?.passed).toBe(false)
      expect(shapeCheck?.message).toMatch(/not FLAG/)
      expect(result.allPassed).toBe(false)
    })

    it('supports custom flag path', () => {
      const slugDir = join(tmpDir, 'custom-flag')
      const srcDir = join(slugDir, 'src')
      mkdirSync(join(srcDir, 'secrets'), { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "Custom Flag"',
        'number: 1',
        'backend: flask',
        'app: app.py',
        'flag: secrets/flag.txt',
        'source_visible: false',
        '---',
      ].join('\n'))

      writeFileSync(join(srcDir, 'app.py'), 'from flask import Flask')
      writeFileSync(join(srcDir, 'secrets', 'flag.txt'), 'flag{custom}')

      const result = validateChallenge(join(slugDir, 'index.md'))
      expect(result.allPassed).toBe(true)
      const flagCheck = result.checks.find(c => c.label === 'flag')
      expect(flagCheck?.passed).toBe(true)
      expect(flagCheck?.message).toContain('secrets/flag.txt')
    })

    it('detects invalid tools', () => {
      const slugDir = join(tmpDir, 'bad-tools')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "Bad Tools"',
        'backend: fastapi',
        'app: app.py',
        'source_visible: false',
        'tools:',
        '  - browser',
        '  - hacker-tool',
        '---',
      ].join('\n'))

      writeFileSync(join(srcDir, 'app.py'), 'print("hello")')
      writeFileSync(join(srcDir, 'flag.txt'), 'flag{test_case}')

      // validateChallengeConfig will catch invalid tools in check 2
      const result = validateChallenge(join(slugDir, 'index.md'))
      expect(result.allPassed).toBe(false)
    })



    it('lists tabs in canonical order, not the order the author wrote', () => {
      const slugDir = join(tmpDir, 'author-order')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---', 'title: "Order"', 'backend: fastapi', 'app: app.py',
        'tools: [code, network]', '---',
      ].join('\n'))
      writeFileSync(join(srcDir, 'app.py'), 'from fastapi import FastAPI')
      writeFileSync(join(srcDir, 'flag.txt'), 'flag{test_case}')

      const toolsCheck = validateChallenge(join(slugDir, 'index.md')).checks.find(c => c.label === 'tools')
      expect(toolsCheck?.message).toBe('[browser, network, code]')
    })

    it('names the tabs the default yields when tools is absent', () => {
      const slugDir = join(tmpDir, 'no-tools')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "No Tools"',
        'backend: fastapi',
        'app: app.py',
        '---',
      ].join('\n'))

      writeFileSync(join(srcDir, 'app.py'), 'from fastapi import FastAPI')
      writeFileSync(join(srcDir, 'flag.txt'), 'flag{test_case}')

      const toolsCheck = validateChallenge(join(slugDir, 'index.md')).checks.find(c => c.label === 'tools')
      expect(toolsCheck?.message).toBe(
        'not specified (default: browser, network, repeater, code)',
      )
    })

    // Regression for the branch VALID_TOOLS shrinking flipped: with `terminal` gone,
    // an explicit list of every remaining tool now satisfies `rendered.length ===
    // VALID_TOOLS.length`, so the reported message switches from the explicit tab list
    // to 'all enabled'. Before the shrink this input reported '[browser, network,
    // repeater, code]'. Pin the new branch so the flip cannot happen again unnoticed.
    it('reports an explicit full tool list as all enabled', () => {
      const slugDir = join(tmpDir, 'all-tools')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "All Tools"',
        'backend: fastapi',
        'app: app.py',
        'tools:',
        '  - browser',
        '  - network',
        '  - repeater',
        '  - code',
        '---',
      ].join('\n'))

      writeFileSync(join(srcDir, 'app.py'), 'from fastapi import FastAPI')
      writeFileSync(join(srcDir, 'flag.txt'), 'flag{test_case}')

      const toolsCheck = validateChallenge(join(slugDir, 'index.md')).checks.find(c => c.label === 'tools')
      expect(toolsCheck?.passed).toBe(true)
      expect(toolsCheck?.message).toBe('all enabled')
    })


    it('validates .fsignore when present', () => {
      const slugDir = join(tmpDir, 'with-fsignore')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "With fsignore"',
        'number: 1',
        'backend: flask',
        'app: app.py',
        'source_visible: false',
        '---',
      ].join('\n'))

      writeFileSync(join(srcDir, 'app.py'), 'from flask import Flask')
      writeFileSync(join(srcDir, 'flag.txt'), 'flag{test_case}')
      writeFileSync(join(srcDir, '.fsignore'), '*.log\n__pycache__/\n')

      const result = validateChallenge(join(slugDir, 'index.md'))
      expect(result.allPassed).toBe(true)
      const fsCheck = result.checks.find(c => c.label === '.fsignore')
      expect(fsCheck?.passed).toBe(true)
      expect(fsCheck?.message).toContain('parseable')
    })

    it('reports .fsignore not present when absent', () => {
      const slugDir = join(tmpDir, 'no-fsignore')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "No fsignore"',
        'backend: flask',
        'app: app.py',
        'source_visible: false',
        '---',
      ].join('\n'))

      writeFileSync(join(srcDir, 'app.py'), 'from flask import Flask')
      writeFileSync(join(srcDir, 'flag.txt'), 'flag{test_case}')

      const result = validateChallenge(join(slugDir, 'index.md'))
      const fsCheck = result.checks.find(c => c.label === '.fsignore')
      expect(fsCheck?.passed).toBe(true)
      expect(fsCheck?.message).toContain('not present')
    })

    it('handles PHP backend correctly', () => {
      const slugDir = join(tmpDir, 'php-test')
      const srcDir = join(slugDir, 'src')
      mkdirSync(srcDir, { recursive: true })

      writeFileSync(join(slugDir, 'index.md'), [
        '---',
        'title: "PHP Challenge"',
        'number: 1',
        'backend: php',
        'app: index.php',
        'source_visible: false',
        '---',
      ].join('\n'))

      writeFileSync(join(srcDir, 'index.php'), '<?php echo "hello"; ?>')
      writeFileSync(join(srcDir, 'flag.txt'), 'flag{php_test_1}')

      const result = validateChallenge(join(slugDir, 'index.md'))
      expect(result.allPassed).toBe(true)
      const backendCheck = result.checks.find(c => c.label === 'backend')
      expect(backendCheck?.message).toContain('PHP')
    })
  })

  // ── Legacy structure tests ──────────────────────────────────────────────

  describe('legacy structure', () => {
    it('passes all checks for valid legacy challenge', () => {
      writeFileSync(join(tmpDir, 'legacy-test.md'), [
        '---',
        'title: "Legacy Challenge"',
        'number: 1',
        'backend: flask',
        'app: app.py',
        'source_visible: false',
        'fs:',
        '  /flag.txt: flag.txt',
        '  /templates/index.html: templates/index.html',
        '---',
        '',
        '# Legacy',
      ].join('\n'))

      writeFileSync(join(tmpDir, 'app.py'), 'from flask import Flask')
      writeFileSync(join(tmpDir, 'flag.txt'), 'flag{legacy}')
      mkdirSync(join(tmpDir, 'templates'), { recursive: true })
      writeFileSync(join(tmpDir, 'templates', 'index.html'), '<html></html>')

      const result = validateChallenge(join(tmpDir, 'legacy-test.md'))
      expect(result.slug).toBe('legacy-test')
      expect(result.allPassed).toBe(true)
    })

    it('fails when legacy fs map has no /flag.txt', () => {
      writeFileSync(join(tmpDir, 'no-flag-legacy.md'), [
        '---',
        'title: "No Flag Legacy"',
        'backend: flask',
        'app: app.py',
        'source_visible: false',
        'fs:',
        '  /templates/index.html: templates/index.html',
        '---',
      ].join('\n'))

      writeFileSync(join(tmpDir, 'app.py'), 'from flask import Flask')
      mkdirSync(join(tmpDir, 'templates'), { recursive: true })
      writeFileSync(join(tmpDir, 'templates', 'index.html'), '<html></html>')

      const result = validateChallenge(join(tmpDir, 'no-flag-legacy.md'))
      const flagCheck = result.checks.find(c => c.label === 'flag')
      expect(flagCheck?.passed).toBe(false)
      expect(flagCheck?.message).toContain('no /flag.txt')
    })

    it('reports .fsignore as not applicable for legacy', () => {
      writeFileSync(join(tmpDir, 'legacy-fsignore.md'), [
        '---',
        'title: "Legacy fsignore"',
        'backend: flask',
        'app: app.py',
        'source_visible: false',
        'fs:',
        '  /flag.txt: flag.txt',
        '---',
      ].join('\n'))

      writeFileSync(join(tmpDir, 'app.py'), 'from flask import Flask')
      writeFileSync(join(tmpDir, 'flag.txt'), 'flag{test_case}')

      const result = validateChallenge(join(tmpDir, 'legacy-fsignore.md'))
      const fsCheck = result.checks.find(c => c.label === '.fsignore')
      expect(fsCheck?.passed).toBe(true)
      expect(fsCheck?.message).toContain('not applicable')
    })
  })
})

describe('discoverChallenges', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'discover-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('discovers per-folder challenges', () => {
    const slug1 = join(tmpDir, 'challenge-a')
    const slug2 = join(tmpDir, 'challenge-b')
    mkdirSync(slug1, { recursive: true })
    mkdirSync(slug2, { recursive: true })
    writeFileSync(join(slug1, 'index.md'), '---\ntitle: A\n---\n')
    writeFileSync(join(slug2, 'index.md'), '---\ntitle: B\n---\n')

    const files = discoverChallenges(tmpDir)
    expect(files).toHaveLength(2)
    expect(files.some(f => f.includes('challenge-a'))).toBe(true)
    expect(files.some(f => f.includes('challenge-b'))).toBe(true)
  })

  it('discovers legacy challenges', () => {
    writeFileSync(join(tmpDir, 'legacy.md'), '---\ntitle: Legacy\n---\n')

    const files = discoverChallenges(tmpDir)
    expect(files).toHaveLength(1)
    expect(files[0]).toContain('legacy.md')
  })

  it('filters by target slug (per-folder)', () => {
    const slug1 = join(tmpDir, 'alpha')
    const slug2 = join(tmpDir, 'beta')
    mkdirSync(slug1, { recursive: true })
    mkdirSync(slug2, { recursive: true })
    writeFileSync(join(slug1, 'index.md'), '---\ntitle: Alpha\n---\n')
    writeFileSync(join(slug2, 'index.md'), '---\ntitle: Beta\n---\n')

    const files = discoverChallenges(tmpDir, 'alpha')
    expect(files).toHaveLength(1)
    expect(files[0]).toContain('alpha')
  })

  it('filters by target slug (legacy)', () => {
    writeFileSync(join(tmpDir, 'one.md'), '---\ntitle: One\n---\n')
    writeFileSync(join(tmpDir, 'two.md'), '---\ntitle: Two\n---\n')

    const files = discoverChallenges(tmpDir, 'one')
    expect(files).toHaveLength(1)
    expect(files[0]).toContain('one.md')
  })

  it('returns empty for non-existent directory', () => {
    const files = discoverChallenges(join(tmpDir, 'nonexistent'))
    expect(files).toEqual([])
  })

  it('prefers per-folder over legacy with same slug', () => {
    const slugDir = join(tmpDir, 'dup')
    mkdirSync(slugDir, { recursive: true })
    writeFileSync(join(slugDir, 'index.md'), '---\ntitle: Folder\n---\n')
    writeFileSync(join(tmpDir, 'dup.md'), '---\ntitle: Legacy\n---\n')

    const files = discoverChallenges(tmpDir)
    // Only the per-folder version should be returned, legacy is excluded
    expect(files).toHaveLength(1)
    expect(files[0]).toContain('index.md')
  })
})

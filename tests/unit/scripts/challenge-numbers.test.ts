import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  collectChallengeNumbers,
  checkChallengeNumbers,
  padChallengeNumber,
  nextChallengeNumber,
} from '../../../scripts/challenge-numbers'

// A challenge's number is the one thing about it that outlives its name. It is
// written into frontmatter by hand, so nothing about the file system enforces
// it — these are the checks that stand in for that.
//
// The number is deliberately NOT derived from any ordering. A derived number
// shifts the moment a challenge is added out of order or retired, and every
// link already printed on a handout then points at a different challenge. That
// is the failure the whole capability exists to prevent, so the fixtures below
// always write the number down rather than inferring it from directory order.

/** Write a challenge page carrying `number`, or carrying none when it is undefined. */
function writeChallenge(root: string, locale: 'root' | 'zh-TW', slug: string, number?: unknown): void {
  const dir = locale === 'root'
    ? join(root, 'platform', 'challenge', slug)
    : join(root, 'platform', 'zh-TW', 'challenge', slug)
  mkdirSync(dir, { recursive: true })
  const lines = ['---', `title: ${slug}`, 'layout: challenge']
  if (number !== undefined) lines.push(`number: ${number}`)
  lines.push('---', '', `# ${slug}`)
  writeFileSync(join(dir, 'index.md'), lines.join('\n'), 'utf-8')
}

/** Write a retired challenge — same shape, under the archive tree. */
function writeRetired(root: string, slug: string, number?: unknown): void {
  const dir = join(root, '.archive', 'challenge', slug)
  mkdirSync(dir, { recursive: true })
  const lines = ['---', `title: ${slug}`, 'layout: challenge']
  if (number !== undefined) lines.push(`number: ${number}`)
  lines.push('---', '', `# ${slug}`)
  writeFileSync(join(dir, 'index.md'), lines.join('\n'), 'utf-8')
}

/** The failures a check run produced, as one string per failing check. */
function failures(root: string): string[] {
  return checkChallengeNumbers(collectChallengeNumbers(root))
    .filter((c) => !c.passed)
    .map((c) => c.message)
}

describe('challenge number validation', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'challenge-numbers-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('accepts a tree where every challenge carries a distinct positive integer', () => {
    writeChallenge(root, 'root', 'first', 1)
    writeChallenge(root, 'zh-TW', 'first', 1)
    writeChallenge(root, 'root', 'second', 42)
    writeChallenge(root, 'zh-TW', 'second', 42)

    expect(failures(root)).toEqual([])
  })

  it('rejects a challenge with no number and names it', () => {
    writeChallenge(root, 'root', 'unnumbered')

    const messages = failures(root)
    expect(messages).not.toEqual([])
    expect(messages.join('\n')).toContain('unnumbered')
  })

  // The Example table in the challenge-file-structure delta, one row per case.
  // `"007"` is the interesting one: it is the padded spelling the URL uses, so
  // it is exactly what someone would type into frontmatter by mistake.
  it.each([
    ['zero', 0],
    ['a negative number', -3],
    ['a fraction', 1.5],
    ['a quoted string', '"007"'],
  ])('rejects %s and names the challenge', (_label, value) => {
    writeChallenge(root, 'root', 'badly-numbered', value)

    const messages = failures(root)
    expect(messages).not.toEqual([])
    expect(messages.join('\n')).toContain('badly-numbered')
  })

  it('rejects two challenges sharing a number and names both', () => {
    writeChallenge(root, 'root', 'earlier', 3)
    writeChallenge(root, 'root', 'later', 3)

    const joined = failures(root).join('\n')
    expect(joined).toContain('earlier')
    expect(joined).toContain('later')
  })

  it('rejects a challenge numbered differently in the two locale trees', () => {
    writeChallenge(root, 'root', 'disagreeing', 4)
    writeChallenge(root, 'zh-TW', 'disagreeing', 5)

    const messages = failures(root)
    expect(messages).not.toEqual([])
    expect(messages.join('\n')).toContain('disagreeing')
  })

  it('does not require a translation to exist', () => {
    // An untranslated challenge is an expected state, not a numbering fault.
    writeChallenge(root, 'root', 'untranslated', 7)

    expect(failures(root)).toEqual([])
  })
})

describe('padChallengeNumber', () => {
  it.each([
    [1, '001'],
    [42, '042'],
    [700, '700'],
    [1234, '1234'],
  ])('writes %i as %s', (input, expected) => {
    // Three digits is the minimum width, not a maximum: a four-digit number
    // keeps its own width rather than being truncated into a wrong link.
    expect(padChallengeNumber(input)).toBe(expected)
  })
})

describe('nextChallengeNumber', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'challenge-next-number-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('starts at one on an empty tree', () => {
    expect(nextChallengeNumber(root)).toBe(1)
  })

  it('clears every number a live challenge carries', () => {
    writeChallenge(root, 'root', 'first', 1)
    writeChallenge(root, 'root', 'second', 5)

    expect(nextChallengeNumber(root)).toBe(6)
  })

  it('clears every number a retired challenge carries', () => {
    // A retired challenge keeps its number reserved forever. Reissuing it would
    // point an already-printed link at a different challenge.
    writeChallenge(root, 'root', 'live', 2)
    writeRetired(root, 'retired', 9)

    expect(nextChallengeNumber(root)).toBe(10)
  })
})

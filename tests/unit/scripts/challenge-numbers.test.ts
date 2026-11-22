import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  collectChallengeNumbers,
  checkChallengeNumbers,
  padChallengeNumber,
  nextChallengeNumber,
  isChallengeNumber,
} from '../../../scripts/challenge-numbers'

// A challenge's number is the one thing about it that outlives its name. It is
// written into the challenge's declaration (`challenge.yaml`) by hand (D62), so nothing about the file system enforces
// it — these are the checks that stand in for that.
//
// The number is deliberately NOT derived from any ordering. A derived number
// shifts the moment a challenge is added out of order or retired, and every
// link already printed on a handout then points at a different challenge. That
// is the failure the whole capability exists to prevent, so the fixtures below
// always write the number down rather than inferring it from directory order.

/** Write a challenge's declaration (`challenge.yaml`) carrying `number`, or none when it is undefined. */
function writeDeclaration(root: string, slug: string, number?: unknown): void {
  const dir = join(root, 'platform', 'challenge', slug)
  mkdirSync(dir, { recursive: true })
  const lines = [`slug: ${slug}`]
  if (number !== undefined) lines.push(`number: ${number}`)
  writeFileSync(join(dir, 'challenge.yaml'), lines.join('\n') + '\n', 'utf-8')
}

/** Write a brief, `platform/<locale>/challenge/<slug>/index.md`; its number, if any, is not read. */
function writeBrief(root: string, locale: string, slug: string, number?: unknown): void {
  const dir = join(root, 'platform', locale, 'challenge', slug)
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
    writeDeclaration(root, 'first', 1)
    writeBrief(root, 'en', 'first')
    writeBrief(root, 'zh-TW', 'first')
    writeDeclaration(root, 'second', 42)
    writeBrief(root, 'en', 'second')
    writeBrief(root, 'zh-TW', 'second')

    expect(failures(root)).toEqual([])
  })

  it('rejects a challenge with no number and names it', () => {
    writeDeclaration(root, 'unnumbered')

    const messages = failures(root)
    expect(messages).not.toEqual([])
    expect(messages.join('\n')).toContain('unnumbered')
  })

  // The Example table in the challenge-file-structure delta, one row per case.
  // `"007"` is the interesting one: it is the padded spelling the URL uses, so
  // it is exactly what someone would type into the challenge's declaration (`challenge.yaml`) by mistake.
  it.each([
    ['zero', 0],
    ['a negative number', -3],
    ['a fraction', 1.5],
    ['a quoted string', '"007"'],
  ])('rejects %s and names the challenge', (_label, value) => {
    writeDeclaration(root, 'badly-numbered', value)

    const messages = failures(root)
    expect(messages).not.toEqual([])
    expect(messages.join('\n')).toContain('badly-numbered')
  })

  it('rejects two challenges sharing a number and names both', () => {
    writeDeclaration(root, 'earlier', 3)
    writeDeclaration(root, 'later', 3)

    const joined = failures(root).join('\n')
    expect(joined).toContain('earlier')
    expect(joined).toContain('later')
  })

  it('S19: one entry per declaration file; briefs and an old-layout page are not entries', () => {
    writeDeclaration(root, 'alpha', 1)
    writeDeclaration(root, 'beta', 2)
    writeBrief(root, 'en', 'alpha')
    writeBrief(root, 'zh-TW', 'alpha')
    writeBrief(root, 'en', 'beta')
    // An old-layout page: the index.md beside where the declaration now lives.
    const old = join(root, 'platform', 'challenge', 'x')
    mkdirSync(old, { recursive: true })
    writeFileSync(join(old, 'index.md'), '---\ntitle: x\nnumber: 7\n---\n', 'utf-8')

    expect(collectChallengeNumbers(root)).toEqual([
      { slug: 'alpha', value: 1, path: 'platform/challenge/alpha/challenge.yaml' },
      { slug: 'beta', value: 2, path: 'platform/challenge/beta/challenge.yaml' },
    ])
  })

  it('S17: a brief\'s number beside the declaration\'s is ignored, and no result is labelled number-locales', () => {
    writeDeclaration(root, 's', 4)
    writeBrief(root, 'en', 's', 9)

    const entries = collectChallengeNumbers(root)
    expect(entries.map((e) => e.value)).toEqual([4])
    const results = checkChallengeNumbers(entries)
    expect(results.filter((r) => r.passed === false)).toEqual([])
    expect(results.map((r) => r.label)).not.toContain('number-locales')
  })

  it('does not require a translation to exist', () => {
    // An untranslated challenge is an expected state, not a numbering fault.
    writeDeclaration(root, 'untranslated', 7)
    writeBrief(root, 'en', 'untranslated')

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

/** Write a retired challenge's declaration, `.archive/challenge/<slug>/challenge.yaml`. */
function writeRetiredDeclaration(root: string, slug: string, number: number): void {
  const dir = join(root, '.archive', 'challenge', slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'challenge.yaml'), `slug: ${slug}\nnumber: ${number}\n`, 'utf-8')
}

// S20 (D63): one greater than every number ever assigned. A retired number stays reserved
// whichever shape its folder has; a brief's number is not an assignment.
describe('nextChallengeNumber', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'challenge-next-number-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it.each<[string, (r: string) => void, number]>([
    ['an empty tree', () => {}, 1],
    ['live declarations 1 and 5', (r) => { writeDeclaration(r, 'first', 1); writeDeclaration(r, 'second', 5) }, 6],
    ['live 2 and a retired challenge.yaml 9', (r) => { writeDeclaration(r, 'live', 2); writeRetiredDeclaration(r, 'r', 9) }, 10],
    ['live 2 and a retired legacy index.md 12', (r) => { writeDeclaration(r, 'live', 2); writeRetired(r, 'r', 12) }, 13],
    ['one retired folder holding challenge.yaml 3 and a legacy index.md 14', (r) => {
      writeRetiredDeclaration(r, 'r', 3)
      writeRetired(r, 'r', 14)
    }, 15],
    ['live 1 and a brief carrying number 50 (not counted)', (r) => { writeDeclaration(r, 'a', 1); writeBrief(r, 'en', 'a', 50) }, 2],
    ['live 2 and 6, retired challenge.yaml 11 as the largest (Y85)', (r) => {
      writeDeclaration(r, 'a', 2)
      writeDeclaration(r, 'b', 6)
      writeRetiredDeclaration(r, 'r', 11)
    }, 12],
  ])('%s', (_label, build, expected) => {
    build(root)
    expect(nextChallengeNumber(root)).toBe(expected)
  })
})

// S75, Y104: the one shared definition of a usable number: a safe integer, at least one.
describe('isChallengeNumber (S75, Y104)', () => {
  it.each([
    [1, true],
    [999, true],
    [1000, true],
    [Number.MAX_SAFE_INTEGER, true],
    [0, false],
    [-1, false],
    [1.5, false],
    ['1', false],
    [1e21, false],
    [2 ** 53, false],
  ])('%s is %s', (value, expected) => {
    expect(isChallengeNumber(value)).toBe(expected)
  })
})

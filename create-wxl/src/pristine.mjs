import { join } from 'node:path'

export class PristineError extends Error {
  constructor(file, rule) {
    super(`pristine rule failed: ${file} (${rule})`)
    this.name = 'PristineError'
    this.file = file
    this.rule = rule
  }
}

function stripCR(line) {
  return line.endsWith('\r') ? line.slice(0, -1) : line
}

/** P1: keep every line up to and including `## [Unreleased]`; LF endings. */
export async function applyChangelog(fs, dir) {
  const path = join(dir, 'CHANGELOG.md')
  let raw
  try {
    raw = await fs.readFile(path, 'utf8')
  } catch {
    throw new PristineError('CHANGELOG.md', 'missing')
  }
  const lines = raw.split('\n')
  const idx = lines.findIndex((line) => stripCR(line) === '## [Unreleased]')
  if (idx === -1) throw new PristineError('CHANGELOG.md', 'marker-absent')
  const kept = lines.slice(0, idx + 1).map(stripCR)
  await fs.writeFile(path, kept.join('\n') + '\n')
}

/** P2: keep every line before the first `^## OQ-\d{3} ` line; drop trailing blank/`---` lines. */
export async function applyOpenQuestions(fs, dir) {
  const path = join(dir, '.proj.specs/OPEN-QUESTIONS.md')
  let raw
  try {
    raw = await fs.readFile(path, 'utf8')
  } catch {
    throw new PristineError('.proj.specs/OPEN-QUESTIONS.md', 'missing')
  }
  const lines = raw.split('\n')
  const markerRe = /^## OQ-\d{3} /
  const idx = lines.findIndex((line) => markerRe.test(stripCR(line)))
  if (idx === -1) throw new PristineError('.proj.specs/OPEN-QUESTIONS.md', 'marker-absent')
  const kept = lines.slice(0, idx).map(stripCR)
  while (kept.length > 0 && (kept[kept.length - 1] === '' || kept[kept.length - 1] === '---')) {
    kept.pop()
  }
  if (kept.length === 0) throw new PristineError('.proj.specs/OPEN-QUESTIONS.md', 'empty')
  await fs.writeFile(path, kept.join('\n') + '\n')
}

/** P3: parse, set `version` to `0.1.0` (added last when absent), serialise with fork-init's
 * manifest serialisation (`JSON.stringify(obj, null, 2) + '\n'`, 0004 T4). This is the happy path
 * (LF input); T4 also preserves CRLF, which T-0021's C26 adds here (S-26). */
export async function applyPackageJson(fs, dir) {
  const path = join(dir, 'package.json')
  let raw
  try {
    raw = await fs.readFile(path, 'utf8')
  } catch {
    throw new PristineError('package.json', 'missing')
  }
  let obj
  try {
    obj = JSON.parse(raw)
  } catch {
    throw new PristineError('package.json', 'not-json')
  }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new PristineError('package.json', 'not-object')
  }
  obj.version = '0.1.0'
  await fs.writeFile(path, JSON.stringify(obj, null, 2) + '\n')
}

/** P4: write `range.json`, replacing any copy the archive carried. */
export async function writeRangeJson(fs, dir, { repository, version, commit }) {
  const path = join(dir, 'range.json')
  const body = { upstream: { repository, version, commit } }
  await fs.writeFile(path, JSON.stringify(body, null, 2) + '\n')
}

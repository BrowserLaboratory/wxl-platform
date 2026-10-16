import { join } from 'node:path'
import { tagReportPath } from './text.mjs'

export class PristineError extends Error {
  constructor(file, reason, rule) {
    super(`pristine rule failed: ${file} (${reason})`)
    this.name = 'PristineError'
    this.file = file
    this.reason = reason
    this.rule = rule
  }
}

function stripCR(line) {
  return line.endsWith('\r') ? line.slice(0, -1) : line
}

/** Only `ENOENT` means "the file is missing" (P-09/C-10): any other read error (`EACCES`,
 * `EISDIR`, ...) is not a pristine-rule failure, so it is rethrown for CW-E09 to report
 * (T-0024) instead of being misreported here as CW-E10 "missing". */
async function readPristineFile(fs, path, file, rule) {
  try {
    return await fs.readFile(path, 'utf8')
  } catch (err) {
    if (err && err.code === 'ENOENT') throw new PristineError(file, 'missing', rule)
    throw tagReportPath(err, path)
  }
}

/** Writes through `fs.writeFile`, tagging a non-ENOENT failure with the path CW-E09 (run.mjs)
 * reports: the write calls below have no `readPristineFile`-style catch of their own. */
async function writePristineFile(fs, path, content) {
  try {
    await fs.writeFile(path, content)
  } catch (err) {
    throw tagReportPath(err, path)
  }
}

/** T4/T11 (scripts/fork-init.ts): a manifest's line ending, decided by its first line break only.
 * Copied rather than imported: `fork-init.ts` does not export it (traceability.md only adds
 * `deriveGithubPagesOrigin` to the engine's exports). */
function firstLineEnding(raw) {
  const nl = raw.indexOf('\n')
  return nl > 0 && raw[nl - 1] === '\r' ? '\r\n' : '\n'
}

/** P1: keep every line up to and including `## [Unreleased]`; LF endings. */
export async function applyChangelog(fs, dir) {
  const path = join(dir, 'CHANGELOG.md')
  const raw = await readPristineFile(fs, path, 'CHANGELOG.md', 'P1')
  const lines = raw.split('\n')
  const idx = lines.findIndex((line) => stripCR(line) === '## [Unreleased]')
  if (idx === -1) throw new PristineError('CHANGELOG.md', 'marker-absent', 'P1')
  const kept = lines.slice(0, idx + 1).map(stripCR)
  await writePristineFile(fs, path, kept.join('\n') + '\n')
}

/** P2: keep every line before the first `^## OQ-\d{3} ` line; drop trailing blank/`---` lines. */
export async function applyOpenQuestions(fs, dir) {
  const path = join(dir, '.proj.specs/OPEN-QUESTIONS.md')
  const raw = await readPristineFile(fs, path, '.proj.specs/OPEN-QUESTIONS.md', 'P2')
  const lines = raw.split('\n')
  const markerRe = /^## OQ-\d{3} /
  const idx = lines.findIndex((line) => markerRe.test(stripCR(line)))
  if (idx === -1) throw new PristineError('.proj.specs/OPEN-QUESTIONS.md', 'marker-absent', 'P2')
  const kept = lines.slice(0, idx).map(stripCR)
  while (kept.length > 0 && (kept[kept.length - 1] === '' || kept[kept.length - 1] === '---')) {
    kept.pop()
  }
  if (kept.length === 0) throw new PristineError('.proj.specs/OPEN-QUESTIONS.md', 'empty', 'P2')
  await writePristineFile(fs, path, kept.join('\n') + '\n')
}

/** P3: parse, set `version` to `0.1.0` (added last when absent), serialise with fork-init's
 * manifest serialisation (`JSON.stringify(obj, null, 2) + '\n'`, 0004 T4), reapplying CRLF when
 * the input's first line break was CRLF (T4 also preserves CRLF; T-0021's C26). A leading BOM is
 * its own failure reason (distinct from "not JSON": `JSON.parse` rejects it too, but spec lists
 * it as its own condition), checked before parsing. */
export async function applyPackageJson(fs, dir) {
  const path = join(dir, 'package.json')
  const raw = await readPristineFile(fs, path, 'package.json', 'P3')
  if (raw.charCodeAt(0) === 0xfeff) throw new PristineError('package.json', 'bom', 'P3')
  let obj
  try {
    obj = JSON.parse(raw)
  } catch {
    throw new PristineError('package.json', 'not-json', 'P3')
  }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new PristineError('package.json', 'not-object', 'P3')
  }
  obj.version = '0.1.0'
  const serialized = JSON.stringify(obj, null, 2) + '\n'
  const eol = firstLineEnding(raw)
  await writePristineFile(fs, path, eol === '\r\n' ? serialized.replace(/\n/g, '\r\n') : serialized)
}

/** P4: write `range.json`, replacing any copy the archive carried. */
export async function writeRangeJson(fs, dir, { repository, version, commit }) {
  const path = join(dir, 'range.json')
  const body = { upstream: { repository, version, commit } }
  await writePristineFile(fs, path, JSON.stringify(body, null, 2) + '\n')
}

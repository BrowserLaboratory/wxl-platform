/**
 * upstream-guard.test.ts
 *
 * S5 (traceability.md): the guard's classification, the upstream decision, the upstream-pristine
 * check and the expectation check — each tested first on fixture `{ path -> content }` maps, then
 * (T69) on the real tracked tree, gated on the upstream decision itself. The upstream decision
 * also takes whether the tree root has a range.json (0005-create-wxl override of 0004 T66).
 *
 * This file is NOT on the keep list (traceability.md, "Upstream repository-slug confinement"), so
 * it must never spell the upstream repository slug as a literal: every fixture below builds it
 * from the imported `UPSTREAM_SLUG`, `.toLowerCase()` and `.toUpperCase()` (ticket T-0011, Note
 * 11) — otherwise the real-tree guard test below would catch this file flagging itself.
 */
import { readFileSync, statSync, lstatSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { describe, it, expect } from 'vitest'
import {
  UPSTREAM_SLUG,
  KNOWN_OLD_DEPLOY_SHA256,
  DOC_ANCHORS,
  A6_CANDIDATE_RE,
  A6_VALUE_RE,
  A8_CANDIDATE_RE,
  A8_VALUE_RE,
  A9_CANDIDATE_RE,
  A9_UPSTREAM_LINE,
  BASE_SITEBASE_RE,
  findA7Candidates,
  parseA7ScalarValue,
  isJsStringLiteral,
  evalJsStringLiteral,
  normalizeLf,
  sha256Hex,
  type DocAnchor,
} from '../../../scripts/fork-init'

const REPO_ROOT = resolve(__dirname, '../../..')

/** Escapes `literal` for safe embedding inside a `RegExp` source. */
function escapeRe(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ─── the guard's classification (T61-T64) ───────────────────────────────────

/** Files the confinement rule lets hold the upstream repository slug freely (traceability.md,
 *  "keep list"). */
const KEEP_LIST_EXACT = new Set([
  'CHANGELOG.md',
  'scripts/fork-init.ts',
  'tests/unit/scripts/fork-init.test.ts',
  '.agents/skills/wxl-fork-init/SKILL.md',
  '.claude/skills/wxl-fork-init/SKILL.md',
])
const KEEP_LIST_PREFIXES = ['.proj.specs/', '.proj.tickets/']

function isKeepListed(path: string): boolean {
  if (KEEP_LIST_EXACT.has(path)) return true
  return KEEP_LIST_PREFIXES.some((prefix) => path.startsWith(prefix))
}

/** traceability.md: "a file is text when its first 8000 bytes hold no NUL byte." `content` is
 *  always read byte-preserving (latin1) by every caller here — both fixtures (whose literal
 *  characters are all code points 0-255) and `realTreeFiles` below — so decoding it back to bytes
 *  with `latin1`, not `utf8`, is required: a `utf8` re-encoding would turn every 0x80-0xFF
 *  character into two bytes, shrinking the real 8000-byte window the guard is supposed to check
 *  (T-0011). */
function isBinary(content: string): boolean {
  return Buffer.from(content, 'latin1').subarray(0, 8000).includes(0)
}

/** Line indices (0-based) in a package-manifest `content` holding one of A1's three URL fields —
 *  `repository.url`, `bugs.url`, `homepage` — located structurally (which enclosing object a
 *  `"url"` key sits in), not merely by key name, so a `funding.url` or any other nested `url` key
 *  is never exempt (traceability.md, T62's manifest boundary; Note 7: a two-space-indented JSON
 *  fixture, one key per line; a manifest compressed to one line is out of scope and not handled).
 *  A tiny structural walk suffices for that shape: each line opening a nested object (`"key": {`)
 *  pushes `key`; a line that is only a closing brace (`}` or `},`) pops one. */
function manifestA1UrlLines(content: string): Set<number> {
  const lines = content.split('\n')
  const exempt = new Set<number>()
  const stack: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*\}/.test(line)) {
      stack.pop()
      continue
    }
    const keyMatch = /^\s*"([^"]+)"\s*:\s*(\{)?/.exec(line)
    if (!keyMatch) continue
    const [, key, opensObject] = keyMatch
    if (opensObject) {
      stack.push(key)
      continue
    }
    const path = [...stack, key].join('.')
    if (path === 'repository.url' || path === 'bugs.url' || path === 'homepage') exempt.add(i)
  }
  return exempt
}

/** Character ranges (offsets into `content`) covered by one of `DOC_ANCHORS`' A2-A5 forms for
 *  `path` — reused from the engine (Note 8) instead of re-implementing A2-A5 recognition here. */
function anchoredRanges(path: string, content: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  for (const anchor of DOC_ANCHORS) {
    if (anchor.file !== path) continue
    for (const m of content.matchAll(anchor.regex)) {
      ranges.push([m.index!, m.index! + m[0].length])
    }
  }
  return ranges
}

// Built once (not per file, not per line, and not rebuilt as `new RegExp(slugRe.source, ...)` on
// every line as before): `matchAll` never mutates a regex's own `lastIndex` (it clones
// internally), so this single global instance is safe to reuse across every `matchAll` call below.
const SLUG_MATCH_ALL_RE = new RegExp(escapeRe(UPSTREAM_SLUG), 'gi')

/** Violations of the confinement rule (traceability.md, T61-T64): every case-insensitive
 *  occurrence of the upstream repository slug, in a tracked text file, that is neither in a
 *  keep-list file nor inside a rewrite-list file's own anchor form — one violation per occurrence,
 *  so two occurrences on the same line (or in the same file) are each reported (T-0011 ticket,
 *  approved test plan, T61 row: several occurrences in one file are each reported separately). */
function guardViolations(files: Record<string, string>): Array<{ file: string; line: number }> {
  const out: Array<{ file: string; line: number }> = []
  for (const [path, content] of Object.entries(files)) {
    if (isKeepListed(path)) continue
    if (isBinary(content)) continue
    const isManifest = path === 'package.json'
    const ranges = isManifest ? [] : anchoredRanges(path, content)
    const exemptLines = isManifest ? manifestA1UrlLines(content) : new Set<number>()
    const lines = content.split('\n')
    let offset = 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (isManifest) {
        if (!exemptLines.has(i)) {
          for (const _m of line.matchAll(SLUG_MATCH_ALL_RE)) {
            out.push({ file: path, line: i + 1 })
          }
        }
      } else {
        for (const m of line.matchAll(SLUG_MATCH_ALL_RE)) {
          const absStart = offset + m.index!
          const absEnd = absStart + m[0].length
          const covered = ranges.some(([s, e]) => absStart >= s && absEnd <= e)
          if (!covered) out.push({ file: path, line: i + 1 })
        }
      }
      offset += line.length + 1
    }
  }
  return out
}

describe('upstream guard — confinement', () => {
  // T61/AC-G1: the slug in a text file on neither list is always a violation, at the line it
  // occurs on; a file not even listed below (e.g. `.github/workflows/x.yml`) hits the same branch.
  it.each([
    ['docs/x.md', `See https://github.com/${UPSTREAM_SLUG} for history.\n`, 1],
    ['.github/workflows/x.yml', `# mirrors https://github.com/${UPSTREAM_SLUG}\nname: x\n`, 1],
    ['tests/unit/scripts/upstream-guard.test.ts', `// NOT the real copy: ${UPSTREAM_SLUG}\n`, 1],
    ['.claude/skills/wxl-create/SKILL.md', `fork of ${UPSTREAM_SLUG}\n`, 1],
    ['.proj.specs-old/a.md', `${UPSTREAM_SLUG}\n`, 1],
    ['docs/.proj.specs/a.md', `${UPSTREAM_SLUG}\n`, 1],
    ['scripts/fork-init.ts.bak', `${UPSTREAM_SLUG}\n`, 1],
  ] as const)('reports a violation for %s at line %i', (path, content, line) => {
    expect(guardViolations({ [path]: content })).toEqual([{ file: path, line }])
  })

  // T61: several occurrences in one file are each reported separately — each occurrence of the
  // slug is its own violation, even when two sit on the same line or in the same file.
  it('reports each occurrence on its own when two sit on the same line', () => {
    const content = `${UPSTREAM_SLUG} and ${UPSTREAM_SLUG} again\n`
    expect(guardViolations({ 'docs/x.md': content })).toEqual([
      { file: 'docs/x.md', line: 1 },
      { file: 'docs/x.md', line: 1 },
    ])
  })

  it('reports each occurrence on its own when two sit on different lines of the same file', () => {
    const content = `${UPSTREAM_SLUG}\nsomething else\n${UPSTREAM_SLUG}\n`
    expect(guardViolations({ 'docs/x.md': content })).toEqual([
      { file: 'docs/x.md', line: 1 },
      { file: 'docs/x.md', line: 3 },
    ])
  })

  // T62/AC-G1: a rewrite-list file's slug outside its own anchor form is still a violation.
  it('reports the manifest description or name field holding the slug', () => {
    const manifest = [
      '{',
      '  "name": "x",',
      `  "description": "fork of ${UPSTREAM_SLUG}",`,
      '  "repository": {',
      '    "type": "git",',
      `    "url": "git+https://github.com/${UPSTREAM_SLUG}.git"`,
      '  }',
      '}',
      '',
    ].join('\n')
    expect(guardViolations({ 'package.json': manifest })).toEqual([{ file: 'package.json', line: 3 }])
  })

  it('reports the manifest name field holding the slug', () => {
    const manifest = [
      '{',
      `  "name": "fork of ${UPSTREAM_SLUG}",`,
      '  "repository": {',
      '    "type": "git",',
      `    "url": "git+https://github.com/${UPSTREAM_SLUG}.git"`,
      '  }',
      '}',
      '',
    ].join('\n')
    expect(guardViolations({ 'package.json': manifest })).toEqual([{ file: 'package.json', line: 2 }])
  })

  it('reports a bare issues link that is not the A2/A3 form', () => {
    const readme = `Found a bug? https://github.com/${UPSTREAM_SLUG}/issues\n`
    expect(guardViolations({ 'README.md': readme })).toEqual([{ file: 'README.md', line: 1 }])
  })

  it('reports an A3 form followed by extra text on the same line', () => {
    const readme = `git clone https://github.com/${UPSTREAM_SLUG}.git please\n`
    expect(guardViolations({ 'README.md': readme })).toEqual([{ file: 'README.md', line: 1 }])
  })

  it('reports an A4 form followed by extra text, and an A5 form missing its closing paren', () => {
    const contribute = [
      `git remote add upstream https://github.com/${UPSTREAM_SLUG}.git now`,
      `See [GitHub Issues](https://github.com/${UPSTREAM_SLUG}/issues`,
      '',
    ].join('\n')
    expect(guardViolations({ 'CONTRIBUTE.md': contribute })).toEqual([
      { file: 'CONTRIBUTE.md', line: 1 },
      { file: 'CONTRIBUTE.md', line: 2 },
    ])
  })

  it('reports a bare slug sharing a line with a valid A2 form', () => {
    const readme =
      `[![Quality Gates](https://github.com/${UPSTREAM_SLUG}/actions/workflows/quality-gates.yml/badge.svg)]` +
      `(https://github.com/${UPSTREAM_SLUG}/actions/workflows/quality-gates.yml) also see ${UPSTREAM_SLUG}\n`
    expect(guardViolations({ 'README.md': readme })).toEqual([{ file: 'README.md', line: 1 }])
  })

  it('reports an A4 form appearing in README.md (A4 belongs only to CONTRIBUTE.md)', () => {
    const readme = `git remote add upstream https://github.com/${UPSTREAM_SLUG}.git\n`
    expect(guardViolations({ 'README.md': readme })).toEqual([{ file: 'README.md', line: 1 }])
  })

  // T63/AC-G1: the slug only in rewrite-list anchors or keep-list files, and in a binary file —
  // never a violation.
  it('does not report a badge line holding two valid A2 forms', () => {
    const readme =
      `[![Quality Gates](https://github.com/${UPSTREAM_SLUG}/actions/workflows/quality-gates.yml/badge.svg)]` +
      `(https://github.com/${UPSTREAM_SLUG}/actions/workflows/quality-gates.yml)\n`
    expect(guardViolations({ 'README.md': readme })).toEqual([])
  })

  it('does not report A3/A4 forms ending in a CRLF line, or an indented A4 form', () => {
    const readme = `git clone https://github.com/${UPSTREAM_SLUG}.git\r\n`
    const contribute = `   git remote add upstream https://github.com/${UPSTREAM_SLUG}.git\r\n`
    expect(guardViolations({ 'README.md': readme, 'CONTRIBUTE.md': contribute })).toEqual([])
  })

  it('does not report the manifest’s three A1 URL fields', () => {
    // Standard 2-space-indented JSON, each field on its own line — the shape the guard's line-level
    // rule assumes (Note 7); a manifest squashed to one line is out of scope.
    const manifest = [
      '{',
      '  "repository": {',
      '    "type": "git",',
      `    "url": "git+https://github.com/${UPSTREAM_SLUG}.git"`,
      '  },',
      '  "bugs": {',
      `    "url": "https://github.com/${UPSTREAM_SLUG}/issues"`,
      '  },',
      `  "homepage": "https://github.com/${UPSTREAM_SLUG}#readme"`,
      '}',
      '',
    ].join('\n')
    expect(guardViolations({ 'package.json': manifest })).toEqual([])
  })

  it('reports a funding.url field holding the slug (only A1’s three URL fields are exempt)', () => {
    const manifest = [
      '{',
      '  "funding": {',
      `    "url": "https://github.com/sponsors/${UPSTREAM_SLUG}"`,
      '  }',
      '}',
      '',
    ].join('\n')
    expect(guardViolations({ 'package.json': manifest })).toEqual([{ file: 'package.json', line: 3 }])
  })

  it('does not report any keep-list file, deep .proj.specs/.proj.tickets paths included', () => {
    const files: Record<string, string> = {
      'CHANGELOG.md': `${UPSTREAM_SLUG}\n`,
      'scripts/fork-init.ts': `${UPSTREAM_SLUG}\n`,
      'tests/unit/scripts/fork-init.test.ts': `${UPSTREAM_SLUG}\n`,
      '.agents/skills/wxl-fork-init/SKILL.md': `${UPSTREAM_SLUG}\n`,
      '.claude/skills/wxl-fork-init/SKILL.md': `${UPSTREAM_SLUG}\n`,
      '.proj.specs/0004-stateless-engine/a.md': `${UPSTREAM_SLUG}\n`,
      '.proj.tickets/0004-stateless-engine/T-9999.md': `${UPSTREAM_SLUG}\n`,
    }
    expect(guardViolations(files)).toEqual([])
  })

  it('treats a NUL within the first 8000 bytes as binary (not reported)', () => {
    const content = '\0' + 'x'.repeat(100) + UPSTREAM_SLUG
    expect(guardViolations({ 'asset.bin': content })).toEqual([])
  })

  it('treats a NUL after byte 8000 as text (still reported)', () => {
    const content = 'x'.repeat(8100) + '\0' + `\n${UPSTREAM_SLUG}\n`
    expect(guardViolations({ 'asset.bin': content })).toEqual([{ file: 'asset.bin', line: 2 }])
  })

  it('treats a NUL at exactly byte index 7999 (the window’s last byte) as binary', () => {
    const content = 'x'.repeat(7999) + '\0' + `\n${UPSTREAM_SLUG}\n`
    expect(guardViolations({ 'asset.bin': content })).toEqual([])
  })

  it('treats a NUL at exactly byte index 8000 (just past the window) as text', () => {
    const content = 'x'.repeat(8000) + '\0' + `\n${UPSTREAM_SLUG}\n`
    expect(guardViolations({ 'asset.bin': content })).toEqual([{ file: 'asset.bin', line: 2 }])
  })

  // T64/AC-G1: letter case alone never changes the classification, either direction.
  it.each([
    ['lowercase', UPSTREAM_SLUG.toLowerCase()],
    ['uppercase', UPSTREAM_SLUG.toUpperCase()],
    ['mixed case', UPSTREAM_SLUG[0].toUpperCase() + UPSTREAM_SLUG.slice(1).toLowerCase()],
  ])('reports the slug in %s in a file on neither list', (_label, variant) => {
    expect(guardViolations({ 'docs/x.md': `${variant}\n` })).toEqual([{ file: 'docs/x.md', line: 1 }])
  })

  it('does not report a case-differing slug inside an A2 form or a keep-list file', () => {
    const variant = UPSTREAM_SLUG.toUpperCase()
    const readme =
      `[![Quality Gates](https://github.com/${variant}/actions/workflows/quality-gates.yml/badge.svg)]` +
      `(https://github.com/${variant}/actions/workflows/quality-gates.yml)\n`
    expect(
      guardViolations({ 'README.md': readme, 'CHANGELOG.md': `${variant}\n` }),
    ).toEqual([])
  })
})

// ─── the upstream decision (T65-T66) ────────────────────────────────────────

/** T65-T66/AC-G2: whether the tree currently running is upstream itself. `hasRangeJson` is the
 *  0005-create-wxl override of 0004 T66: a root range.json (create-wxl's setup record) means the
 *  tree is a created range, never upstream itself, when the decision falls back to the manifest
 *  and work tree; GITHUB_REPOSITORY, when set, still decides alone and ignores it. */
function isUpstreamDecision(
  githubRepository: string | undefined,
  manifest: unknown,
  isWorkTree: boolean,
  hasRangeJson: boolean,
): boolean {
  if (githubRepository !== undefined && githubRepository !== '') {
    return githubRepository === UPSTREAM_SLUG
  }
  const repository = typeof manifest === 'object' && manifest !== null ? (manifest as Record<string, unknown>).repository : undefined
  const url = typeof repository === 'object' && repository !== null ? (repository as Record<string, unknown>).url : undefined
  return url === `git+https://github.com/${UPSTREAM_SLUG}.git` && isWorkTree && !hasRangeJson
}

describe('upstream decision', () => {
  // T65/AC-G2: GITHUB_REPOSITORY set and non-empty decides alone.
  it('is upstream iff GITHUB_REPOSITORY equals the upstream slug exactly', () => {
    expect(isUpstreamDecision(UPSTREAM_SLUG, { repository: { url: 'anything' } }, false, false)).toBe(true)
  })

  it.each([
    ['different case', UPSTREAM_SLUG.toUpperCase()],
    ['a different slug', 'someone/else'],
    ['leading whitespace', ` ${UPSTREAM_SLUG}`],
    ['trailing whitespace', `${UPSTREAM_SLUG} `],
  ])('is not upstream when GITHUB_REPOSITORY is set to %s, regardless of manifest/work-tree', (_label, value) => {
    expect(
      isUpstreamDecision(value, { repository: { url: `git+https://github.com/${UPSTREAM_SLUG}.git` } }, true, false),
    ).toBe(false)
  })

  it('a non-upstream GITHUB_REPOSITORY still overrides an upstream manifest + work tree', () => {
    expect(
      isUpstreamDecision('someone/else', { repository: { url: `git+https://github.com/${UPSTREAM_SLUG}.git` } }, true, false),
    ).toBe(false)
  })

  it('an upstream GITHUB_REPOSITORY overrides a non-upstream manifest and a non-work-tree', () => {
    expect(isUpstreamDecision(UPSTREAM_SLUG, { repository: { url: 'git+https://github.com/someone/else.git' } }, false, false)).toBe(true)
  })

  // T66/AC-G2: GITHUB_REPOSITORY unset or empty falls back to manifest + work tree.
  it.each([
    ['unset', undefined],
    ['empty string', ''],
  ])('falls back to the manifest and work tree when GITHUB_REPOSITORY is %s', (_label, value) => {
    const upstreamManifest = { repository: { url: `git+https://github.com/${UPSTREAM_SLUG}.git` } }
    expect(isUpstreamDecision(value, upstreamManifest, true, false)).toBe(true)
    expect(isUpstreamDecision(value, upstreamManifest, false, false)).toBe(false)
  })

  // C62/AC-25 (0005-create-wxl override of 0004 T66): without GITHUB_REPOSITORY, a root range.json
  // turns an otherwise-upstream-shaped tree (upstream manifest url + work tree) into "not
  // upstream" — the setup record is create-wxl's signal that the tree is a created range, not
  // upstream itself.
  it.each([
    ['unset', undefined, false, true],
    ['unset', undefined, true, false],
    ['empty string', '', false, true],
    ['empty string', '', true, false],
  ])(
    'without GITHUB_REPOSITORY (%s, value %j), hasRangeJson=%s → upstream %s',
    (_label, value, hasRangeJson, expected) => {
      const upstreamManifest = { repository: { url: `git+https://github.com/${UPSTREAM_SLUG}.git` } }
      expect(isUpstreamDecision(value, upstreamManifest, true, hasRangeJson)).toBe(expected)
    },
  )

  // C62/AC-25: when GITHUB_REPOSITORY is set and non-empty, range.json never enters the decision —
  // toggling ONLY hasRangeJson, with the other inputs fixed at the shape where it would otherwise
  // matter (an upstream manifest, in a work tree), changes nothing.
  it('with GITHUB_REPOSITORY set, a root range.json never changes the decision', () => {
    const upstreamManifest = { repository: { url: `git+https://github.com/${UPSTREAM_SLUG}.git` } }
    expect(isUpstreamDecision(UPSTREAM_SLUG, upstreamManifest, true, false)).toBe(true)
    expect(isUpstreamDecision(UPSTREAM_SLUG, upstreamManifest, true, true)).toBe(true)
    expect(isUpstreamDecision('other/repo', upstreamManifest, true, false)).toBe(false)
    expect(isUpstreamDecision('other/repo', upstreamManifest, true, true)).toBe(false)
  })

  it.each([
    ['a different-case url', { repository: { url: `git+https://github.com/${UPSTREAM_SLUG.toUpperCase()}.git` } }],
    ['a url missing .git', { repository: { url: `git+https://github.com/${UPSTREAM_SLUG}` } }],
    ['repository as a string', { repository: `git+https://github.com/${UPSTREAM_SLUG}.git` }],
    ['no repository at all', {}],
  ])('is not upstream, in a work tree, with %s', (_label, manifest) => {
    expect(isUpstreamDecision(undefined, manifest, true, false)).toBe(false)
  })
})

// ─── the upstream-pristine check (T67-T68) ──────────────────────────────────

type FieldId =
  | 'A6'
  | 'A7:platform/index.md'
  | 'A7:platform/zh-TW/index.md'
  | 'A8'
  | 'A9'
  | 'base'
  | 'A2:README.md'
  | 'A2:README.en.md'
  | 'A3:README.md'
  | 'A3:README.en.md'
  | 'A4'
  | 'A5'
  | 'repository.url'
  | 'bugs.url'
  | 'homepage'
  | 'license'
  | 'author'
  | 'version'
  | 'deploy.yml'

/** Every slug `DOC_ANCHORS` found for `id`/`file` in `content` — reusing the engine's own A2-A5
 *  recognition (`DOC_ANCHORS`, whose capture group holds exactly the slug it recognised) instead
 *  of re-deriving the slug's boundaries with a second regex (Note 8, T-0011). */
function docAnchorSlugs(id: DocAnchor['id'], file: string, content: string): string[] {
  const slugs: string[] = []
  for (const anchor of DOC_ANCHORS) {
    if (anchor.id !== id || anchor.file !== file) continue
    for (const m of content.matchAll(anchor.regex)) {
      slugs.push(m[1])
    }
  }
  return slugs
}

function decodeValueLine(line: string | undefined, valueRe: RegExp): string | undefined {
  if (line === undefined) return undefined
  const m = valueRe.exec(line)
  if (!m || !isJsStringLiteral(m[1])) return undefined
  return evalJsStringLiteral(m[1])
}

/** T67-T68/AC-G3: field ids whose value differs from upstream's (traceability.md, T67's table).
 *  `files` is a fixture `{ path -> content }` map, the same shape the guard uses. */
function pristineMismatches(files: Record<string, string>): FieldId[] {
  const mismatches: FieldId[] = []
  const get = (path: string): string | undefined => files[path]

  const cfg = get('.vitepress/config.mts')
  const cfgLines = cfg !== undefined ? cfg.split('\n') : []

  // A6
  const a6Lines = cfgLines.filter((l) => A6_CANDIDATE_RE.test(l))
  const a6Value = a6Lines.length === 1 ? decodeValueLine(a6Lines[0], A6_VALUE_RE) : undefined
  if (a6Value !== 'Web eXploitation Laboratory') mismatches.push('A6')

  // A7 (platform/index.md, platform/zh-TW/index.md)
  for (const file of ['platform/index.md', 'platform/zh-TW/index.md'] as const) {
    const fid = `A7:${file}` as FieldId
    const raw = get(file)
    if (raw === undefined) {
      mismatches.push(fid)
      continue
    }
    const lines = raw.split('\n')
    const candidates = findA7Candidates(lines)
    // A7's value is one YAML scalar (traceability.md), not a JS string literal — decoded with the
    // engine's own `parseA7ScalarValue` (Note 8, T-0011), never a second, hand-rolled regex.
    const value = candidates.length === 1 ? parseA7ScalarValue(lines[candidates[0]]) : null
    if (value !== 'WXL') mismatches.push(fid)
  }

  // A8
  const sl = get('.vitepress/challenge/shortLink.ts')
  const slLines = sl !== undefined ? sl.split('\n') : []
  const a8Lines = slLines.filter((l) => A8_CANDIDATE_RE.test(l))
  const a8Value = a8Lines.length === 1 ? decodeValueLine(a8Lines[0], A8_VALUE_RE) : undefined
  if (a8Value !== 'https://wxl.browserlab.online') mismatches.push('A8')

  // A9
  const a9Lines = cfgLines.filter((l) => A9_CANDIDATE_RE.test(l))
  if (!(a9Lines.length === 1 && a9Lines[0].replace(/\r$/, '') === A9_UPSTREAM_LINE)) mismatches.push('A9')

  // base
  const baseLines = cfgLines.filter((l) => BASE_SITEBASE_RE.test(l))
  if (baseLines.length !== 1) mismatches.push('base')

  // A2/A3 (README.md, README.en.md), A4/A5 (CONTRIBUTE.md): every form must hold the upstream
  // slug (case-sensitive, Note 6) — zero forms is itself a mismatch (Note 6, option A).
  for (const [id, file] of [
    ['A2', 'README.md'],
    ['A2', 'README.en.md'],
    ['A3', 'README.md'],
    ['A3', 'README.en.md'],
  ] as const) {
    const fid = `${id}:${file}` as FieldId
    const raw = get(file)
    if (raw === undefined) {
      mismatches.push(fid)
      continue
    }
    const slugs = docAnchorSlugs(id, file, raw)
    if (slugs.length === 0 || slugs.some((s) => s !== UPSTREAM_SLUG)) mismatches.push(fid)
  }
  for (const id of ['A4', 'A5'] as const) {
    const raw = get('CONTRIBUTE.md')
    if (raw === undefined) {
      mismatches.push(id)
      continue
    }
    const slugs = docAnchorSlugs(id, 'CONTRIBUTE.md', raw)
    if (slugs.length === 0 || slugs.some((s) => s !== UPSTREAM_SLUG)) mismatches.push(id)
  }

  // A1 + license/author/version, and whether deploy.yml exists at all
  let pkg: Record<string, unknown> = {}
  try {
    pkg = JSON.parse(get('package.json') ?? '') as Record<string, unknown>
  } catch {
    pkg = {}
  }
  const repository = typeof pkg.repository === 'object' && pkg.repository !== null ? (pkg.repository as Record<string, unknown>) : {}
  const bugs = typeof pkg.bugs === 'object' && pkg.bugs !== null ? (pkg.bugs as Record<string, unknown>) : {}
  if (repository.url !== `git+https://github.com/${UPSTREAM_SLUG}.git`) mismatches.push('repository.url')
  if (bugs.url !== `https://github.com/${UPSTREAM_SLUG}/issues`) mismatches.push('bugs.url')
  if (pkg.homepage !== `https://github.com/${UPSTREAM_SLUG}#readme`) mismatches.push('homepage')
  if (pkg.license !== 'LicenseRef-LICENSE') mismatches.push('license')
  if (pkg.author !== 'CXPh03n1x') mismatches.push('author')
  if (pkg.version === '0.1.0') mismatches.push('version')
  if (get('.github/workflows/deploy.yml') !== undefined) mismatches.push('deploy.yml')

  return mismatches
}

/** A fully upstream-pristine fixture tree (T67): every field at its upstream value, no
 *  `deploy.yml`. Each T68 case overrides exactly one path. */
function pristineFixtureFiles(): Record<string, string> {
  const readme =
    `[![Quality Gates](https://github.com/${UPSTREAM_SLUG}/actions/workflows/quality-gates.yml/badge.svg)]` +
    `(https://github.com/${UPSTREAM_SLUG}/actions/workflows/quality-gates.yml)\n` +
    `git clone https://github.com/${UPSTREAM_SLUG}.git\n`
  return {
    'package.json': JSON.stringify(
      {
        name: 'wxl',
        version: '3.0.0',
        author: 'CXPh03n1x',
        license: 'LicenseRef-LICENSE',
        repository: { type: 'git', url: `git+https://github.com/${UPSTREAM_SLUG}.git` },
        bugs: { url: `https://github.com/${UPSTREAM_SLUG}/issues` },
        homepage: `https://github.com/${UPSTREAM_SLUG}#readme`,
      },
      null,
      2,
    ) + '\n',
    '.vitepress/config.mts': [
      "const siteBase = process.env.SITE_BASE || '/'",
      '',
      'export default {',
      '  base: siteBase,',
      '  title: "Web eXploitation Laboratory",',
      '}',
      '',
    ].join('\n'),
    'platform/index.md': ['---', 'hero:', '  name: "WXL"', '---', ''].join('\n'),
    'platform/zh-TW/index.md': ['---', 'hero:', '  name: "WXL"', '---', ''].join('\n'),
    '.vitepress/challenge/shortLink.ts': "export const SITE_ORIGIN = 'https://wxl.browserlab.online'\n",
    'README.md': readme,
    'README.en.md': readme,
    'CONTRIBUTE.md':
      `git remote add upstream https://github.com/${UPSTREAM_SLUG}.git\n` +
      `See [GitHub Issues](https://github.com/${UPSTREAM_SLUG}/issues)\n`,
  }
}

describe('upstream pristine check', () => {
  it('reports no mismatch for a fixture holding every upstream value', () => {
    expect(pristineMismatches(pristineFixtureFiles())).toEqual([])
  })

  it('does not report A6 when only its quote style changes (value compared, not bytes, Note 6)', () => {
    const files = pristineFixtureFiles()
    files['.vitepress/config.mts'] = files['.vitepress/config.mts'].replace(
      '"Web eXploitation Laboratory"',
      "'Web eXploitation Laboratory'",
    )
    expect(pristineMismatches(files)).toEqual([])
  })

  it('does not report A7 when the value is an unquoted plain YAML scalar (value compared, not quote style)', () => {
    const files = pristineFixtureFiles()
    files['platform/index.md'] = files['platform/index.md'].replace('  name: "WXL"', '  name: WXL')
    expect(pristineMismatches(files)).toEqual([])
  })

  it.each([
    ['A6', (f: Record<string, string>) => { f['.vitepress/config.mts'] = f['.vitepress/config.mts'].replace('Web eXploitation Laboratory', 'Changed') }],
    ['A7:platform/index.md', (f: Record<string, string>) => { f['platform/index.md'] = f['platform/index.md'].replace('"WXL"', '"Changed"') }],
    ['A7:platform/zh-TW/index.md', (f: Record<string, string>) => { f['platform/zh-TW/index.md'] = f['platform/zh-TW/index.md'].replace('"WXL"', '"Changed"') }],
    ['A8', (f: Record<string, string>) => { f['.vitepress/challenge/shortLink.ts'] = "export const SITE_ORIGIN = 'https://example.test'\n" }],
    ['A9', (f: Record<string, string>) => { f['.vitepress/config.mts'] = f['.vitepress/config.mts'].replace("const siteBase = process.env.SITE_BASE || '/'", "const siteBase = '/x/'") }],
    ['A9', (f: Record<string, string>) => {
      f['.vitepress/config.mts'] =
        f['.vitepress/config.mts'] + "\nconst siteBase = process.env.SITE_BASE || '/'\n"
    }],
    ['base', (f: Record<string, string>) => { f['.vitepress/config.mts'] = f['.vitepress/config.mts'].replace('  base: siteBase,', '') }],
    ['base', (f: Record<string, string>) => { f['.vitepress/config.mts'] = f['.vitepress/config.mts'] + '  base: siteBase,\n' }],
    ['base', (f: Record<string, string>) => { f['.vitepress/config.mts'] = f['.vitepress/config.mts'].replace('  base: siteBase,', "  base: '/x/',") }],
    // Only the badge line (A2) is touched — a global replace would also hit the A3 clone line
    // below it, since both share the same upstream slug text.
    ['A2:README.md', (f: Record<string, string>) => {
      const [badgeLine, ...rest] = f['README.md'].split('\n')
      f['README.md'] = [badgeLine.replace(new RegExp(UPSTREAM_SLUG, 'g'), 'me/x'), ...rest].join('\n')
    }],
    ['A2:README.en.md', (f: Record<string, string>) => {
      const [badgeLine, ...rest] = f['README.en.md'].split('\n')
      f['README.en.md'] = [badgeLine.replace(new RegExp(UPSTREAM_SLUG, 'g'), 'me/x'), ...rest].join('\n')
    }],
    // Only one of the badge line's two A2 forms is rewritten (`String.prototype.replace` with a
    // plain-string search replaces only the first match); the other form keeps the upstream slug.
    ['A2:README.md', (f: Record<string, string>) => {
      const [badgeLine, ...rest] = f['README.md'].split('\n')
      f['README.md'] = [badgeLine.replace(UPSTREAM_SLUG, 'me/x'), ...rest].join('\n')
    }],
    ['A2:README.en.md', (f: Record<string, string>) => {
      const [badgeLine, ...rest] = f['README.en.md'].split('\n')
      f['README.en.md'] = [badgeLine.replace(UPSTREAM_SLUG, 'me/x'), ...rest].join('\n')
    }],
    // Both A2 forms keep the right shape and the right owner/name split, differing only in letter
    // case — still a mismatch, since the pristine check's A2-A5 comparison is case-sensitive
    // (Note 6, settled).
    ['A2:README.md', (f: Record<string, string>) => {
      const [badgeLine, ...rest] = f['README.md'].split('\n')
      f['README.md'] = [badgeLine.replace(new RegExp(UPSTREAM_SLUG, 'g'), UPSTREAM_SLUG.toUpperCase()), ...rest].join('\n')
    }],
    ['A3:README.md', (f: Record<string, string>) => { f['README.md'] = f['README.md'].replace(`git clone https://github.com/${UPSTREAM_SLUG}.git`, '') }],
    ['A3:README.en.md', (f: Record<string, string>) => { f['README.en.md'] = f['README.en.md'].replace(`git clone https://github.com/${UPSTREAM_SLUG}.git`, '') }],
    ['A3:README.md', (f: Record<string, string>) => { f['README.md'] = f['README.md'].replace(`git clone https://github.com/${UPSTREAM_SLUG}.git`, 'git clone https://github.com/me/x.git') }],
    ['A3:README.en.md', (f: Record<string, string>) => { f['README.en.md'] = f['README.en.md'].replace(`git clone https://github.com/${UPSTREAM_SLUG}.git`, 'git clone https://github.com/me/x.git') }],
    ['A4', (f: Record<string, string>) => { f['CONTRIBUTE.md'] = f['CONTRIBUTE.md'].replace(`git remote add upstream https://github.com/${UPSTREAM_SLUG}.git`, '') }],
    ['A4', (f: Record<string, string>) => { f['CONTRIBUTE.md'] = f['CONTRIBUTE.md'].replace(`git remote add upstream https://github.com/${UPSTREAM_SLUG}.git`, 'git remote add upstream https://github.com/me/x.git') }],
    ['A5', (f: Record<string, string>) => { f['CONTRIBUTE.md'] = f['CONTRIBUTE.md'].replace(`[GitHub Issues](https://github.com/${UPSTREAM_SLUG}/issues)`, '') }],
    ['A5', (f: Record<string, string>) => { f['CONTRIBUTE.md'] = f['CONTRIBUTE.md'].replace(`[GitHub Issues](https://github.com/${UPSTREAM_SLUG}/issues)`, '[GitHub Issues](https://github.com/me/x/issues)') }],
    ['repository.url', (f: Record<string, string>) => { f['package.json'] = f['package.json'].replace(/"url": "git\+[^"]*"/, '"url": "git+https://github.com/me/x.git"') }],
    ['bugs.url', (f: Record<string, string>) => { f['package.json'] = f['package.json'].replace(/"url": "https:\/\/github\.com\/[^"]*\/issues"/, '"url": "https://github.com/me/x/issues"') }],
    ['homepage', (f: Record<string, string>) => { f['package.json'] = f['package.json'].replace(/"homepage": "[^"]*"/, '"homepage": "https://github.com/me/x#readme"') }],
    ['license', (f: Record<string, string>) => { f['package.json'] = f['package.json'].replace('"license": "LicenseRef-LICENSE"', '"license": "ECL-2.0"') }],
    ['author', (f: Record<string, string>) => { f['package.json'] = f['package.json'].replace('"author": "CXPh03n1x"', '"author": "someone"') }],
    ['version', (f: Record<string, string>) => { f['package.json'] = f['package.json'].replace('"version": "3.0.0"', '"version": "0.1.0"') }],
    ['deploy.yml', (f: Record<string, string>) => { f['.github/workflows/deploy.yml'] = 'name: Deploy\n' }],
    // Even a deploy.yml whose content is the tree's own current template output is a mismatch:
    // T67 requires the file be ABSENT, not merely different from the template.
    ['deploy.yml', (f: Record<string, string>) => {
      f['.github/workflows/deploy.yml'] = readFileSync(resolve(REPO_ROOT, 'scripts/templates/deploy.yml.template'), 'utf8')
    }],
  ] as const)('reports exactly %s when only it changes', (fieldId, mutate) => {
    const files = pristineFixtureFiles()
    mutate(files)
    expect(pristineMismatches(files)).toEqual([fieldId])
  })

  it('does not report version 0.1.1 (only exactly 0.1.0 is a mismatch)', () => {
    const files = pristineFixtureFiles()
    files['package.json'] = files['package.json'].replace('"version": "3.0.0"', '"version": "0.1.1"')
    expect(pristineMismatches(files)).toEqual([])
  })
})

// ─── the template-hash pin (T27) and the real tree (T69) — upstream only ────

const CURRENT_TEMPLATE_PATH = resolve(REPO_ROOT, 'scripts/templates/deploy.yml.template')
const FROZEN_72327E2_PATH = resolve(REPO_ROOT, 'tests/unit/workflows/fixtures/deploy-template-72327e2.yml')

/** `git ls-files -z` from the repo root, decoded with `/` path separators on every OS (ticket
 *  T-0011, approved test plan, T69 row: paths always use `/`). Throws, rather than silently
 *  returning an empty list, when `git` itself fails (a non-zero exit or a spawn error) — a failure
 *  here must be loud (Note 15, T-0011), not read as "zero tracked files". */
function trackedFiles(): string[] {
  const res = spawnSync('git', ['ls-files', '-z'], { cwd: REPO_ROOT, encoding: 'buffer' })
  if (res.error || res.status !== 0) {
    throw new Error(`git ls-files -z failed: ${res.error?.message ?? `exit code ${res.status}`}`)
  }
  return res.stdout
    .toString('utf8')
    .split('\0')
    .filter((p) => p.length > 0)
}

/** Reads one file exactly as `realTreeFiles` does: byte-preserving (latin1), so the guard's own
 *  NUL/binary rule applies to the real bytes read from disk, never a UTF-8 replacement-character-
 *  corrupted decoding. Exposed standalone so a test can exercise this exact reading path against a
 *  synthetic file on disk (T63's 8000-byte boundary with real high-bit bytes), not only against a
 *  fixture string already in memory. */
function readTreeFile(abs: string): string {
  return readFileSync(abs).toString('latin1')
}

/** Every tracked file, read with `readTreeFile`. A path git reports that the work tree does not
 *  hold as a regular file — missing entirely, or a directory (a submodule's gitlink entry resolves
 *  to its own directory in the work tree, not a file: reading it as one would throw `EISDIR`, not
 *  silently skip) — is excluded. */
function realTreeFiles(): Record<string, string> {
  const files: Record<string, string> = {}
  for (const rel of trackedFiles()) {
    const abs = join(REPO_ROOT, rel)
    let stat: ReturnType<typeof statSync>
    try {
      stat = statSync(abs)
    } catch {
      continue // tracked by git, but absent from this work tree
    }
    if (!stat.isFile()) continue // not a regular file (e.g. a submodule's own directory)
    files[rel] = readTreeFile(abs)
  }
  return files
}

/** Whether `REPO_ROOT` is a git work tree at all (T66's fallback condition). `spawnSync` itself
 *  never throws — a missing `git` executable surfaces as `res.error`, not an exception — so there
 *  is nothing here for a `try`/`catch` to catch. */
function isGitWorkTree(): boolean {
  const res = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: REPO_ROOT, encoding: 'utf8' })
  if (res.error || res.status !== 0) return false
  return res.stdout.trim() === 'true'
}

function realManifest(): unknown {
  try {
    return JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'))
  } catch {
    return undefined
  }
}

/** Whether `REPO_ROOT` itself has a root range.json (0005-create-wxl override of 0004 T66): this
 *  repository is upstream and never carries one, but a range created by create-wxl would. */
function hasRootRangeJson(): boolean {
  try {
    return lstatSync(resolve(REPO_ROOT, 'range.json')).isFile()
  } catch {
    return false
  }
}

const REAL_DECISION = isUpstreamDecision(process.env.GITHUB_REPOSITORY, realManifest(), isGitWorkTree(), hasRootRangeJson())

describe.runIf(REAL_DECISION)('deploy template hash pin (upstream only)', () => {
  it('the current template’s LF-normalised SHA-256 is pinned and not in the engine’s known-old list', () => {
    const currentLf = normalizeLf(readFileSync(CURRENT_TEMPLATE_PATH, 'utf8'))
    const PINNED_CURRENT_HASH = '2a6b8a55d5738429388056c4342e766d1282d23f20b9d4c77e565d479c92635d'
    expect(
      sha256Hex(currentLf),
      'the template changed — move this pinned value into KNOWN_OLD_DEPLOY_SHA256 and pin the new hash',
    ).toBe(PINNED_CURRENT_HASH)
    expect(KNOWN_OLD_DEPLOY_SHA256).not.toContain(sha256Hex(currentLf))
  })

  it('the frozen 72327e2 fixture’s LF-normalised SHA-256 (CRLF included) is the known-old list’s first value', () => {
    const lf = normalizeLf(readFileSync(FROZEN_72327E2_PATH, 'utf8'))
    expect(sha256Hex(lf)).toBe(KNOWN_OLD_DEPLOY_SHA256[0])
    const crlf = lf.replace(/\n/g, '\r\n')
    expect(sha256Hex(normalizeLf(crlf))).toBe(KNOWN_OLD_DEPLOY_SHA256[0])
  })
})

describe.runIf(REAL_DECISION)('real tree (upstream only)', () => {
  it('finds at least one tracked file (the guard/pristine checks below are not vacuous)', () => {
    expect(Object.keys(realTreeFiles()).length).toBeGreaterThan(0)
  })

  it('the guard finds no violation among the tracked files', () => {
    expect(guardViolations(realTreeFiles())).toEqual([])
  })

  it('the pristine check finds no mismatch', () => {
    expect(pristineMismatches(realTreeFiles())).toEqual([])
  })

  it('treats a real file with high-bit bytes and a NUL at byte index 7999 as binary, via the real-tree reading path', () => {
    // Regression test for the utf8-vs-latin1 re-encoding bug (T-0011): bytes 0x80-0xFF, written to
    // disk and then read through `readTreeFile` exactly as `realTreeFiles` reads every tracked
    // file. A NUL at the window's last byte, and the slug placed just after byte 8000, so a
    // misclassification as text would show up as a reported violation.
    const dir = mkdtempSync(join(tmpdir(), 'upstream-guard-binary-'))
    try {
      const highBitBytes = Buffer.alloc(7999, 0xaa)
      const nul = Buffer.from([0])
      const tail = Buffer.from(`\n${UPSTREAM_SLUG}\n`, 'latin1')
      const content = Buffer.concat([highBitBytes, nul, tail])
      const file = join(dir, 'asset.bin')
      writeFileSync(file, content)
      const read = readTreeFile(file)
      expect(guardViolations({ 'asset.bin': read })).toEqual([])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

/** S5's expectation check (traceability.md: "the expectation check, called on a decision and a
 *  `WXL_EXPECT_UPSTREAM` value … pass or fail"). Returns a result distinguishable from a real
 *  pass/fail when `raw` is unset, so the caller can render that case as skipped rather than as an
 *  assertion-free pass. */
type ExpectationResult = 'skip' | 'pass' | 'fail'
function expectationHolds(decision: boolean, raw: string | undefined): ExpectationResult {
  if (raw === undefined) return 'skip'
  return decision === (raw === 'true') ? 'pass' : 'fail'
}

describe('expectation check (WXL_EXPECT_UPSTREAM)', () => {
  // T69/AC-G3: not set -> skip; exactly 'true' or 'false' decide; any other value (`TRUE`, `1`) is
  // "not true", so it only passes when the decision is false.
  it.each([
    ['decision true, unset', true, undefined, 'skip'],
    ['decision false, unset', false, undefined, 'skip'],
    ['decision true, true', true, 'true', 'pass'],
    ['decision false, true', false, 'true', 'fail'],
    ['decision true, false', true, 'false', 'fail'],
    ['decision false, false', false, 'false', 'pass'],
    ['decision true, TRUE', true, 'TRUE', 'fail'],
    ['decision false, TRUE', false, 'TRUE', 'pass'],
    ['decision true, 1', true, '1', 'fail'],
    ['decision false, 1', false, '1', 'pass'],
  ] as const)('%s -> %s', (_label, decision, raw, expected) => {
    expect(expectationHolds(decision, raw)).toBe(expected)
  })
})

// T69/AC-G3: skipped (not vacuously passed) when WXL_EXPECT_UPSTREAM is unset; runs — and can fail
// — whenever it is set, even when the tree is not upstream, so a contradiction between the
// decision and WXL_EXPECT_UPSTREAM always fails rather than silently skipping.
it.runIf(process.env.WXL_EXPECT_UPSTREAM !== undefined)(
  'WXL_EXPECT_UPSTREAM, when set, matches the upstream decision',
  () => {
    expect(expectationHolds(REAL_DECISION, process.env.WXL_EXPECT_UPSTREAM)).toBe('pass')
  },
)

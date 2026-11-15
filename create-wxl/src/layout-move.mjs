// The transform (seam 0010-S45; D95, D97-D99, D104, D110, D112). `planLayoutMove({ files })` is a
// pure function with no I/O. create-wxl cannot import the site's modules (D112), so the locale
// list and the page predicate (`isLegacyPage`, D116) are literal copies here, tested equal to the
// site's single source by U136 (the switch ticket, T-0077).

import { parseDocument, visit, isScalar } from 'yaml'

// D112: literal copy of the site's locale list (`.vitepress/locales.ts`).
export const LOCALES = ['en', 'zh-TW']

const LOCALE_FOLDER_PREFIXES = LOCALES.map((code) => `platform/${code}/`)

// U-§1 "kept key".
const KEPT_KEYS = ['title', 'description', 'layout']

function isExcluded(path) {
  if (path.startsWith('platform/public/') || path.startsWith('platform/shared/')) return true
  if (/^platform\/challenge\/[^/]+\/src\//.test(path)) return true
  const segments = path.split('/')
  for (const segment of segments) {
    if (segment.startsWith('.')) return true
    if (segment === 'node_modules' || segment === 'dist') return true
  }
  return false
}

function isPage(path) {
  return path.startsWith('platform/') && path.endsWith('.md') && !isExcluded(path)
}

function isLocaleFolderPath(path) {
  return LOCALE_FOLDER_PREFIXES.some((prefix) => path.startsWith(prefix))
}

// D116: "page" and "excluded area" are defined once; create-wxl keeps a literal copy
// (`isLegacyPage`) of the site's `classifySourcePath === 'outside'` predicate.
export function isLegacyPage(path) {
  return isPage(path) && !isLocaleFolderPath(path)
}

function destinationOf(path) {
  return `platform/en/${path.slice('platform/'.length)}`
}

// U-§1 "English brief" / "translation brief".
const ENGLISH_BRIEF_RE = /^platform\/challenge\/([^/]+)\/index\.md$/
const TRANSLATION_BRIEF_RE = /^platform\/([^/]+)\/challenge\/([^/]+)\/index\.md$/

// D99, D143: a direct child of `platform/challenge/`, `<name>` other than `index`;
// `platform/challenge/index.md` is an ordinary page.
const LEGACY_SINGLE_FILE_BRIEF_RE = /^platform\/challenge\/([^/]+)\.md$/

function deepEqual(a, b) {
  if (a === b) return true
  // Final review F3: the core schema's `.nan` parses to `NaN` (SC4/SC5, D110); `NaN === NaN` is
  // `false`, so without this, a well-formed brief whose value is `.nan` fails SC4's group/full
  // comparison and is wrongly reported as `frontmatter`. `0`/`-0` are already equal under `===`
  // above and are left as is (declined, final review F3, low confidence).
  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return false
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }
  if (typeof a === 'object') {
    const ak = Object.keys(a)
    const bk = Object.keys(b)
    if (ak.length !== bk.length) return false
    return ak.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]))
  }
  return false
}

// D145: a mapping key that is not a scalar (a flow or block collection, or an alias) fails the
// parse before `toJS` is called. For a collection key, `toJS` would otherwise stringify it and
// have `yaml` write a warning to the terminal through `process.emitWarning` (D144). An alias key
// fails for a second, independent reason even when its anchor holds a scalar (final review F6):
// `toJS` then resolves it to that scalar value with no warning, so D145's rule there is policy —
// a stringified or alias-resolved key in challenge.yaml is never what an author meant (SR-1) —
// not only a warning-avoidance measure.
function hasNonScalarKey(doc) {
  let found = false
  visit(doc, {
    Pair(_, pair) {
      if (!isScalar(pair.key)) {
        found = true
        return visit.BREAK
      }
    },
  })
  return found
}

// D110, D129: `yaml`'s `parseDocument` with the core schema, `merge: false`, `uniqueKeys: true`,
// `resolveKnownTags: false` (D146: an explicit YAML 1.1 tag such as `!!timestamp` or `!!merge` is
// then an unknown tag instead of resolving, so it lands in `doc.warnings` below), converted with
// `toJS({ maxAliasCount: 100 })`. Any entry in `doc.errors` or `doc.warnings`
// (D144: a warning, such as an unknown tag, is a failure here too, so the move never writes a
// declaration the next build would reject, and `parse` is never called, so `yaml` never writes to
// the terminal), a mapping key that is not a scalar (D145), or an exception `toJS` throws, is a
// failed parse.
function parseStrict(text) {
  let doc
  try {
    doc = parseDocument(text, { schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false })
  } catch {
    return { ok: false }
  }
  if (doc.errors.length > 0 || doc.warnings.length > 0) return { ok: false }
  if (hasNonScalarKey(doc)) return { ok: false }
  let value
  try {
    value = doc.toJS({ maxAliasCount: 100 })
  } catch {
    return { ok: false }
  }
  return { ok: true, doc, value }
}

function isPlainMapping(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Splits the raw bytes into front-matter lines (byte ranges, so key-line and body bytes stay
// byte-identical) and the body. SC1 (UTF-8) and SC2 (fences) live here.
function splitFrontMatterBytes(bytes) {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return { ok: false }
  }

  let offset = 0
  let bom = false
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    bom = true
    offset = 3
  }

  const lines = []
  let lineStart = offset
  for (let i = offset; i < bytes.length; i++) {
    if (bytes[i] === 0x0a) {
      let end = i
      let ending = '\n'
      if (end > lineStart && bytes[end - 1] === 0x0d) {
        end -= 1
        ending = '\r\n'
      }
      lines.push({ start: lineStart, end, ending })
      lineStart = i + 1
    }
  }
  if (lineStart < bytes.length) {
    lines.push({ start: lineStart, end: bytes.length, ending: '' })
  }

  const decode = (start, end) => Buffer.from(bytes.subarray(start, end)).toString('utf8')

  if (lines.length === 0 || decode(lines[0].start, lines[0].end) !== '---') {
    return { ok: false }
  }

  let closeIndex = -1
  for (let i = 1; i < lines.length; i++) {
    if (decode(lines[i].start, lines[i].end) === '---') {
      closeIndex = i
      break
    }
  }
  if (closeIndex === -1) {
    return { ok: false }
  }

  const fmLines = lines.slice(1, closeIndex)
  const bodyStart = lines[closeIndex].end + lines[closeIndex].ending.length
  const bodyBytes = Buffer.from(bytes.subarray(bodyStart))

  // U-§1 "group": a key line plus every following line up to the next key line or the closing
  // fence; lines before the first key line join the first group (so they stay with it, rather
  // than forming a key-less group of their own).
  const groups = []
  let pending = []
  let current = null
  for (const line of fmLines) {
    const first = line.end > line.start ? bytes[line.start] : null
    const isKey = first !== null && first !== 0x20 && first !== 0x09 && first !== 0x23
    if (isKey) {
      current = { lines: [...pending, line] }
      pending = []
      groups.push(current)
    } else if (current === null) {
      pending.push(line)
    } else {
      current.lines.push(line)
    }
  }
  if (pending.length > 0) {
    // No key line at all: the whole front matter is comments/blanks, kept as its own (key-less)
    // group so a later parse fails cleanly instead of silently dropping bytes.
    groups.push({ lines: pending })
  }

  const groupText = (g) => g.lines.map((l) => decode(l.start, l.end) + l.ending).join('')
  const fullText = fmLines.map((l) => decode(l.start, l.end) + l.ending).join('')

  return {
    ok: true,
    bom,
    openFenceEnding: lines[0].ending,
    closeFenceEnding: lines[closeIndex].ending,
    groups,
    groupText,
    fullText,
    bodyBytes,
  }
}

// SC1-SC6 (U-§4 "Split checks"). `englishBrief` gates SC6 (an English brief needs at least one
// declaration group; a translation brief may have none).
function trySplit(bytes, { englishBrief }) {
  const split = splitFrontMatterBytes(bytes)
  if (!split.ok) return { ok: false }

  const full = parseStrict(split.fullText)
  if (!full.ok) return { ok: false }
  if (!isPlainMapping(full.value)) return { ok: false }
  if (full.doc.contents && full.doc.contents.flow) return { ok: false }

  const fullKeys = Object.keys(full.value)

  const parsedGroups = []
  for (const g of split.groups) {
    const text = split.groupText(g)
    const parsed = parseStrict(text)
    if (!parsed.ok) return { ok: false }
    if (!isPlainMapping(parsed.value)) return { ok: false }
    const keys = Object.keys(parsed.value)
    if (keys.length !== 1) return { ok: false }
    const key = keys[0]
    if (!Object.prototype.hasOwnProperty.call(full.value, key)) return { ok: false }
    if (!deepEqual(parsed.value[key], full.value[key])) return { ok: false }
    parsedGroups.push({ key, text })
  }

  const groupKeys = parsedGroups.map((p) => p.key)
  if (JSON.stringify(groupKeys) !== JSON.stringify(fullKeys)) return { ok: false }

  const keptGroups = parsedGroups.filter((p) => KEPT_KEYS.includes(p.key))
  const declarationGroups = parsedGroups.filter((p) => !KEPT_KEYS.includes(p.key))

  const keptText = keptGroups.map((p) => p.text).join('')
  const declText = declarationGroups.map((p) => p.text).join('')

  if (keptGroups.length > 0) {
    const keptParsed = parseStrict(keptText)
    if (!keptParsed.ok || !isPlainMapping(keptParsed.value)) return { ok: false }
    if (Object.keys(keptParsed.value).length !== keptGroups.length) return { ok: false }
    for (const p of keptGroups) {
      if (!deepEqual(keptParsed.value[p.key], full.value[p.key])) return { ok: false }
    }
  }
  if (declarationGroups.length > 0) {
    const declParsed = parseStrict(declText)
    if (!declParsed.ok || !isPlainMapping(declParsed.value)) return { ok: false }
    if (Object.keys(declParsed.value).length !== declarationGroups.length) return { ok: false }
    for (const p of declarationGroups) {
      if (!deepEqual(declParsed.value[p.key], full.value[p.key])) return { ok: false }
    }
  }

  if (englishBrief && declarationGroups.length === 0) return { ok: false }

  return {
    ok: true,
    bom: split.bom,
    openFenceEnding: split.openFenceEnding,
    closeFenceEnding: split.closeFenceEnding,
    keptText,
    declText,
    declarationKeys: declarationGroups.map((p) => p.key),
    declarationValue: Object.fromEntries(declarationGroups.map((p) => [p.key, full.value[p.key]])),
    bodyBytes: split.bodyBytes,
    fullValue: full.value,
  }
}

function buildBriefContent(split) {
  return Buffer.concat([
    split.bom ? Buffer.from([0xef, 0xbb, 0xbf]) : Buffer.alloc(0),
    Buffer.from('---' + split.openFenceEnding, 'utf8'),
    Buffer.from(split.keptText, 'utf8'),
    Buffer.from('---' + split.closeFenceEnding, 'utf8'),
    split.bodyBytes,
  ])
}

function buildDeclarationContent(split) {
  return Buffer.from(split.declText, 'utf8')
}

function isDeclaredSlug(files, slug) {
  return files.some(
    (f) =>
      f.path === `platform/challenge/${slug}/challenge.yaml` ||
      f.path === `platform/en/challenge/${slug}/index.md`,
  )
}

export function planLayoutMove({ files }) {
  const legacyFiles = files.filter((f) => isLegacyPage(f.path))
  if (legacyFiles.length === 0) {
    return { legacy: false, ops: [], mismatches: [] }
  }

  const failures = []
  for (const f of legacyFiles) {
    const singleFileBriefMatch = LEGACY_SINGLE_FILE_BRIEF_RE.exec(f.path)
    if (singleFileBriefMatch && singleFileBriefMatch[1] !== 'index') {
      failures.push({ token: 'legacy-brief', path: f.path })
    }
  }

  const englishSlugs = new Set()
  for (const f of legacyFiles) {
    const m = ENGLISH_BRIEF_RE.exec(f.path)
    if (m) englishSlugs.add(m[1])
  }

  const englishDeclarations = new Map()
  const ops = []
  for (const f of legacyFiles) {
    if (LEGACY_SINGLE_FILE_BRIEF_RE.test(f.path) && !ENGLISH_BRIEF_RE.test(f.path)) {
      // already recorded above (and is not moved further)
      const m = LEGACY_SINGLE_FILE_BRIEF_RE.exec(f.path)
      if (m[1] !== 'index') continue
    }

    const to = destinationOf(f.path)

    const briefMatch = ENGLISH_BRIEF_RE.exec(f.path)
    if (briefMatch) {
      const slug = briefMatch[1]
      const split = trySplit(f.bytes, { englishBrief: true })
      if (!split.ok) {
        failures.push({ token: 'frontmatter', path: f.path })
        continue
      }
      englishDeclarations.set(slug, split.declarationValue)
      ops.push({ kind: 'move', from: f.path, to, content: buildBriefContent(split), mode: f.mode })
      ops.push({
        kind: 'declare',
        slug,
        to: `platform/challenge/${slug}/challenge.yaml`,
        content: buildDeclarationContent(split),
        from: f.path,
      })
      continue
    }

    ops.push({ kind: 'move', from: f.path, to, content: f.bytes, mode: f.mode })
  }

  // D98: a translation brief whose slug has an English brief (legacy, moved above) is stripped
  // of its declaration groups; one of a declared slug is already new-layout and left untouched;
  // any other is an orphan.
  const mismatches = []
  for (const f of files) {
    const m = TRANSLATION_BRIEF_RE.exec(f.path)
    if (!m) continue
    const [, locale, slug] = m
    if (locale === 'en' || !LOCALES.includes(locale)) continue

    if (isDeclaredSlug(files, slug)) continue

    if (englishSlugs.has(slug)) {
      const split = trySplit(f.bytes, { englishBrief: false })
      if (!split.ok) {
        failures.push({ token: 'frontmatter', path: f.path })
        continue
      }
      const enDecl = englishDeclarations.get(slug) ?? {}
      const trDecl = split.declarationValue
      const keys = new Set([...Object.keys(enDecl), ...Object.keys(trDecl)])
      for (const key of keys) {
        // revision 2.2 O-1: an own-property check, not a plain index, so an absent key reads as
        // `undefined` rather than an inherited `Object.prototype` property (`__proto__`,
        // `constructor`, `toString`).
        const enValue = Object.hasOwn(enDecl, key) ? enDecl[key] : undefined
        const value = Object.hasOwn(trDecl, key) ? trDecl[key] : undefined
        if (!deepEqual(enValue, value)) {
          mismatches.push({ brief: f.path, key, enValue, value })
        }
      }

      if (split.declarationKeys.length === 0) continue
      ops.push({ kind: 'strip', path: f.path, content: buildBriefContent(split) })
      continue
    }

    failures.push({ token: 'orphan-brief', path: f.path })
  }

  const existingPaths = new Set(files.map((f) => f.path))
  for (const op of ops) {
    const to = op.kind === 'strip' ? undefined : op.to
    if (to !== undefined && existingPaths.has(to)) {
      failures.push({ token: 'target-exists', path: op.from, to })
    }
  }

  if (failures.length > 0) {
    return { failures }
  }

  return { legacy: true, ops, mismatches }
}

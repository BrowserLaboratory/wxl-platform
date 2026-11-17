// The challenge declaration reader (seam 0010-S32; D73-D75, D129). `readChallengeDeclaration`
// reads `platform/challenge/<slug>/challenge.yaml` under `root` and parses it with
// `parseDocument({ schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false })`,
// then `toJS({ maxAliasCount: 100 })`. A leading `---` document marker is accepted.
// D147: `resolveKnownTags: false` matches the transform's own call (D146,
// `create-wxl/src/layout-move.mjs`), so an explicit YAML 1.1 tag (`!!timestamp`, `!!binary`,
// `!!merge`, `!!set`) never resolves to a `Date`, `Buffer`, merge or `Set`/`Map` here either; it
// resolves to the plain scalar/mapping the core schema would otherwise give it, and a `!!merge`
// key is kept unmerged, same as `merge: false` already does for an untagged `<<` key.
// T-0077 (Y2-Y6, Y112): a read or parse failure returns `{ ok: false, reason, path }` instead of
// throwing. `reason` is `'absent'` (ENOENT), `'multi-document'` (more than one YAML document),
// `'not-a-mapping'` (an empty/comments-only file, or a root that is a sequence, scalar or `null`)
// or `'invalid-yaml'` (any `doc.errors`/`doc.warnings` entry — a duplicate key, a syntax error, an
// unresolved or YAML 1.1 tag, D129/D146 — a non-scalar mapping key (D145), or a `toJS` exception:
// an alias expansion over `maxAliasCount` or an alias whose anchor is not set, D129).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseDocument, parseAllDocuments, visit, isScalar, type Pair } from 'yaml'
import { SiteLayoutError } from '../layout-error.ts'

// D145: a mapping key that is not a scalar (a flow or block collection, or an alias) fails the
// parse before `toJS` is called, because `toJS` would otherwise stringify it and have `yaml` write
// a warning to the terminal through `process.emitWarning` (D144).
function hasNonScalarKey(doc: ReturnType<typeof parseDocument>): boolean {
  let found = false
  visit(doc, {
    Pair(_, pair: Pair) {
      if (!isScalar(pair.key)) {
        found = true
        return visit.BREAK
      }
    },
  })
  return found
}

export type DeclarationReason = 'absent' | 'not-a-mapping' | 'invalid-yaml' | 'multi-document'

export type DeclarationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; reason: DeclarationReason; path: string }

/**
 * The error for a brief whose declaration could not be read (D56): PL-E13 when there is none,
 * PL-E14 for any other reason. The one place the two texts are written, so the page build (plugin)
 * and the list loader fail with the same words. `briefSourcePath` is the brief's path relative to
 * the site's source directory, `<locale>/challenge/<slug>/index.md`.
 */
export function declarationReadError(briefSourcePath: string, slug: string, reason: DeclarationReason): SiteLayoutError {
  if (reason === 'absent') {
    return new SiteLayoutError(
      'PL-E13',
      `PL-E13: ${briefSourcePath}: no platform/challenge/${slug}/challenge.yaml for this brief`,
    )
  }
  return new SiteLayoutError(
    'PL-E14',
    `PL-E14: platform/challenge/${slug}/challenge.yaml: not one YAML mapping (${reason})`,
  )
}

export function readChallengeDeclaration(root: string, slug: string): DeclarationResult {
  const path = join(root, 'platform', 'challenge', slug, 'challenge.yaml')
  let src: string
  try {
    src = readFileSync(path, 'utf8')
  } catch {
    return { ok: false, reason: 'absent', path }
  }
  const docs = parseAllDocuments(src, { schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false })
  if (docs.length > 1) {
    return { ok: false, reason: 'multi-document', path }
  }
  const doc = parseDocument(src, { schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false })
  if (doc.errors.length > 0 || doc.warnings.length > 0) {
    return { ok: false, reason: 'invalid-yaml', path }
  }
  if (hasNonScalarKey(doc)) {
    return { ok: false, reason: 'invalid-yaml', path }
  }
  let value: unknown
  try {
    value = doc.toJS({ maxAliasCount: 100 })
  } catch {
    // D129: an alias expansion over maxAliasCount, or an alias whose anchor is not set before it,
    // is a `ReferenceError` from `toJS` itself, not a `doc.errors`/`doc.warnings` entry.
    return { ok: false, reason: 'invalid-yaml', path }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, reason: 'not-a-mapping', path }
  }
  return { ok: true, value: value as Record<string, unknown> }
}

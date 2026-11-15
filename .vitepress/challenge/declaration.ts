// The challenge declaration reader (seam 0010-S32; D73-D75, D129). `readChallengeDeclaration`
// reads `platform/challenge/<slug>/challenge.yaml` under `root` and parses it with
// `parseDocument({ schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false })`,
// then `toJS({ maxAliasCount: 100 })`. A leading `---` document marker is accepted.
// D147: `resolveKnownTags: false` matches the transform's own call (D146,
// `create-wxl/src/layout-move.mjs`), so an explicit YAML 1.1 tag (`!!timestamp`, `!!binary`,
// `!!merge`, `!!set`) never resolves to a `Date`, `Buffer`, merge or `Set`/`Map` here either; it
// resolves to the plain scalar/mapping the core schema would otherwise give it, and a `!!merge`
// key is kept unmerged, same as `merge: false` already does for an untagged `<<` key. This alone
// does not make the parse fail for these four shapes, because nothing here reads `doc.warnings`
// yet: the `doc.errors`/`doc.warnings` check that D129 requires for an `invalid-yaml` result, the
// `ok: false` shape and the `path` field are T-0077's (Y2-Y6, note 4); until then this function
// assumes a well-formed declaration and throws on a read or parse failure instead of returning
// `ok: false`.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseDocument, visit, isScalar, type Pair } from 'yaml'

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

export function readChallengeDeclaration(root: string, slug: string): { ok: true; value: Record<string, unknown> } {
  const path = join(root, 'platform', 'challenge', slug, 'challenge.yaml')
  const src = readFileSync(path, 'utf8')
  const doc = parseDocument(src, { schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false })
  if (hasNonScalarKey(doc)) {
    throw new Error(`challenge.yaml for ${slug} has a mapping key that is not a scalar (D145)`)
  }
  const value = doc.toJS({ maxAliasCount: 100 }) as Record<string, unknown>
  return { ok: true, value }
}

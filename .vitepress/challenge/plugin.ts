import { validateChallengeBrief, validateChallengeDeclaration, LEGACY_FIELDS, BRIEF_KEYS } from './config'
import { declarationReadError, type DeclarationResult } from './declaration'
import { SiteLayoutError } from '../layout-error'

/**
 * Strip YAML frontmatter from raw Markdown content and return the body.
 */
export function extractMarkdownBody(rawContent: string): string {
  return rawContent.replace(/^---[\s\S]*?---\n?/, '')
}

export interface ProcessedChallenge {
  title: string
  backend: string
  packages: string[]
  wasmModule?: string           // path to per-challenge WASM binary
  difficulty?: string
  category?: string
  description?: string
  sourceVisible: boolean
  tools?: string[]              // UI tab allowlist
}

/**
 * Process challenge frontmatter into public metadata.
 *
 * Encryption is no longer handled here — it's done by the build script
 * (scripts/challenge-keygen.ts) which produces per-challenge WASM binaries.
 * This function only extracts public metadata for the page component.
 *
 * App source is deliberately NOT part of that metadata, in either mode. White-box
 * display source travels the same route as the executed source — encrypted inside the
 * WASM payload — so there is no mode in which this function carries a challenge's code
 * into page hydration data. The field that used to carry app source out of here had no
 * production caller, and leaving it would have read as the white-box source of truth to
 * the next person to open this file.
 */
export function processChallengeFrontmatter(raw: unknown): ProcessedChallenge {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('challenge config must be an object')
  }
  const obj = raw as Record<string, unknown>

  const briefProjection: Record<string, unknown> = {}
  const declarationProjection: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    if ((BRIEF_KEYS as readonly string[]).includes(key)) {
      briefProjection[key] = obj[key]
    } else {
      declarationProjection[key] = obj[key]
    }
  }

  const brief = validateChallengeBrief(briefProjection)
  const declaration = validateChallengeDeclaration(declarationProjection)

  const result: ProcessedChallenge = {
    title: brief.title,
    backend: declaration.backend,
    packages: declaration.packages,
    sourceVisible: declaration.source_visible,
    wasmModule: declaration.wasmModule,
    difficulty: declaration.difficulty,
    category: declaration.category,
    description: brief.description,
    tools: declaration.tools,
  }

  return result
}

/**
 * Check for deprecated legacy fields in frontmatter and return warnings.
 */
export function detectLegacyFields(raw: Record<string, unknown>): string[] {
  const warnings: string[] = []
  for (const field of LEGACY_FIELDS) {
    if (field in raw) {
      warnings.push(`deprecated field '${field}' found in frontmatter — this field is ignored and should be removed`)
    }
  }
  return warnings
}

export type ReadDeclaration = (slug: string) => DeclarationResult

/**
 * A brief source path's slug, or `undefined` when `sourcePath` is not of the shape
 * `<L>/challenge/<slug>/index.md` for an `L` on `locales` (0010-S33, D78).
 */
function briefSlug(sourcePath: string, locales: readonly string[]): string | undefined {
  const segments = sourcePath.split('/')
  if (segments.length !== 4) return undefined
  if (!locales.includes(segments[0])) return undefined
  if (segments[1] !== 'challenge') return undefined
  if (segments[3] !== 'index.md') return undefined
  return segments[2]
}

/**
 * Assembly at build time (seam 0010-S33; D78). Decides by `sourcePath` — the page's
 * *source* path, which `transformPageData` must pass as `filePath`, never `relativePath`
 * (Y46). A brief path with `layout: challenge` reads its slug's `challenge.yaml`
 * (`readDeclaration`), checks PL-E13–PL-E16 and returns `brief ∪ declaration ∪
 * markdownBody`; a brief path without `layout: challenge` throws PL-E17; `layout:
 * challenge` on any other source path throws PL-E18; anything else returns `null`
 * untouched (Y48). Schema errors (an invalid `backend`, a bad `tools` entry) are not
 * checked here — that is `challenge:validate`'s job (D78).
 *
 * The merge uses object spread, not `Object.assign`: a declaration whose parsed value
 * carries an own `__proto__`/`constructor` key (Y113, R-9) stays an own key of the result
 * under spread, but `Object.assign`'s `[[Set]]` semantics would instead invoke
 * `Object.prototype`'s `__proto__` accessor and repoint the result's own prototype —
 * confirmed against both plain objects and the `yaml` parser's own `toJS()` output before
 * choosing this over the alternative the plan left open.
 */
export function assembleChallengeFrontmatter(
  sourcePath: string,
  frontmatter: Record<string, unknown>,
  rawSource: string,
  readDeclaration: ReadDeclaration,
  locales: readonly string[],
): Record<string, unknown> | null {
  const slug = briefSlug(sourcePath, locales)

  if (slug === undefined) {
    if (frontmatter.layout === 'challenge') {
      throw new SiteLayoutError(
        'PL-E18',
        `PL-E18: ${sourcePath}: layout: challenge is only for platform/<locale>/challenge/<slug>/index.md`,
      )
    }
    return null
  }

  if (frontmatter.layout !== 'challenge') {
    throw new SiteLayoutError('PL-E17', `PL-E17: ${sourcePath}: a brief must set layout: challenge`)
  }

  const declResult = readDeclaration(slug)
  if (!declResult.ok) {
    throw declarationReadError(sourcePath, slug, declResult.reason)
  }

  const briefKeys = Object.keys(frontmatter)
  const unknownBriefKeys = briefKeys.filter((key) => !(BRIEF_KEYS as readonly string[]).includes(key))
  if (unknownBriefKeys.length > 0) {
    throw new SiteLayoutError(
      'PL-E15',
      `PL-E15: ${sourcePath}: a brief may carry only title, description and layout, found ${unknownBriefKeys.join(', ')}`,
    )
  }

  const declarationBriefKeys = Object.keys(declResult.value).filter((key) =>
    (BRIEF_KEYS as readonly string[]).includes(key),
  )
  if (declarationBriefKeys.length > 0) {
    throw new SiteLayoutError(
      'PL-E16',
      `PL-E16: platform/challenge/${slug}/challenge.yaml: carries brief key(s) ${declarationBriefKeys.join(', ')}`,
    )
  }

  const markdownBody = extractMarkdownBody(rawSource)
  return { ...frontmatter, ...declResult.value, markdownBody }
}

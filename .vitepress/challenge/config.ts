export type BackendType = 'flask' | 'fastapi' | 'php'

export const LEGACY_FIELDS = ['fs', 'fs_key', 'fsKeyParts', 'encryptedFs', 'flag_verifier'] as const
export const VALID_TOOLS = ['browser', 'network', 'repeater', 'code'] as const

// D74: a brief's frontmatter keys are exactly this closed set; every other key belongs in
// challenge.yaml instead (VM5, VM6).
export const BRIEF_KEYS = ['title', 'description', 'layout'] as const
const BRIEF_ONLY_KEYS = BRIEF_KEYS

export interface ChallengeDeclaration {
  backend: BackendType
  app: string
  source_visible: boolean
  /**
   * Virtual paths shown in the white-box source viewer in addition to the app file.
   * Normalised to `[]` when omitted, so the build step never has to distinguish
   * "nothing extra" from "field missing".
   */
  source_files: string[]
  packages: string[]
  wasmModule?: string
  /** Relative path to flag file under src/. Defaults to "flag.txt". */
  flag?: string
  /** Array of valid tab IDs to enable for this challenge. */
  tools?: (typeof VALID_TOOLS)[number][]
  // optional metadata
  difficulty?: string
  category?: string
  date?: string
  tags?: string[]
}

const VALID_BACKENDS: BackendType[] = ['flask', 'fastapi', 'php']

// A brief's frontmatter (D74, VM6-VM15). The value checks (VM7-VM9: title, layout, description) live
// here, without a path, so the build and `challenge:validate` fail with the same words; validate
// prefixes the brief's path (`<path>: <message>`). The key set (VM6) and the frontmatter's
// presence and syntax (VM14, VM15) are validate's own (scripts/challenge-validate.ts).
export interface ChallengeBrief {
  title: string
  layout: 'challenge'
  description?: string
}

export function validateChallengeBrief(raw: Record<string, unknown>): ChallengeBrief {
  if (typeof raw.title !== 'string' || raw.title === '') {
    throw new Error('title must be a non-empty string')
  }
  if (raw.layout !== 'challenge') {
    throw new Error('layout must be challenge')
  }
  if (raw.description !== undefined && typeof raw.description !== 'string') {
    throw new Error('description must be a string')
  }
  return {
    title: raw.title as string,
    layout: raw.layout as 'challenge',
    description: raw.description as string | undefined,
  }
}

// The challenge declaration (seam 0010-S31; D73-D75). `title` is not required: it is the brief's
// key (D75), not the declaration's.
const DECLARATION_REQUIRED: string[] = ['backend', 'app']

export function validateChallengeDeclaration(raw: unknown): ChallengeDeclaration {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('challenge config must be an object')
  }
  const obj = raw as Record<string, unknown>

  for (const field of DECLARATION_REQUIRED) {
    if (obj[field] === undefined || obj[field] === null) {
      throw new Error(`missing required field: ${field}`)
    }
  }

  if (!VALID_BACKENDS.includes(obj.backend as BackendType)) {
    throw new Error(`backend must be one of ${VALID_BACKENDS.join(', ')}, got: ${obj.backend}`)
  }

  if (typeof obj.app !== 'string') {
    throw new Error(`app must be a string, got ${typeof obj.app}`)
  }

  // Y14/VM5: title, description and layout are brief frontmatter keys (D74), not declaration
  // keys. Listed in file order (the order Object.keys gives for string keys, D129).
  const briefKeysPresent = Object.keys(obj).filter((key) => BRIEF_ONLY_KEYS.includes(key as typeof BRIEF_ONLY_KEYS[number]))
  if (briefKeysPresent.length > 0) {
    throw new Error(
      `challenge.yaml carries brief key(s) ${briefKeysPresent.join(', ')}; title, description and layout belong in each brief's frontmatter`,
    )
  }

  if (obj.flag !== undefined && typeof obj.flag !== 'string') {
    throw new Error(`flag must be a string, got: ${typeof obj.flag}`)
  }

  if (obj.source_visible !== undefined && typeof obj.source_visible !== 'boolean') {
    const value = obj.source_visible
    const hint = typeof value === 'string'
      ? ' (a quoted YAML value is a string)'
      : value === null
        ? ' (a bare `source_visible:` line with no value parses as null)'
        : ''
    throw new Error(
      `source_visible must be a boolean, got ${value === null ? 'null' : typeof value}: ${JSON.stringify(value)}${hint}`,
    )
  }

  if (obj.source_files !== undefined) {
    if (!Array.isArray(obj.source_files)) {
      throw new Error('source_files must be an array of virtual paths')
    }
    for (const entry of obj.source_files as unknown[]) {
      if (typeof entry !== 'string') {
        throw new Error(`source_files entries must be strings, got: ${typeof entry}`)
      }
    }
    if ((obj.source_files as unknown[]).length > 0 && obj.source_visible !== true) {
      throw new Error(
        'source_files lists paths to display but source_visible is not true; set source_visible: true or remove source_files',
      )
    }
  }

  if (obj.tools !== undefined) {
    if (!Array.isArray(obj.tools)) {
      throw new Error('tools must be an array of valid tab IDs')
    }
    for (const tool of obj.tools as string[]) {
      if (!(VALID_TOOLS as readonly string[]).includes(tool)) {
        throw new Error(`invalid tools entry: ${tool}. Must be one of ${VALID_TOOLS.join(', ')}`)
      }
    }
  }

  return {
    backend: obj.backend as BackendType,
    app: obj.app as string,
    source_visible: obj.source_visible === true,
    source_files: (Array.isArray(obj.source_files) ? obj.source_files : []) as string[],
    packages: (Array.isArray(obj.packages) ? obj.packages : []) as string[],
    wasmModule: obj.wasmModule as string | undefined,
    flag: (obj.flag as string) ?? undefined,
    tools: obj.tools as (typeof VALID_TOOLS)[number][] | undefined,
    difficulty: obj.difficulty as string | undefined,
    category: obj.category as string | undefined,
    date: obj.date as string | undefined,
    tags: (Array.isArray(obj.tags) ? obj.tags : undefined) as string[] | undefined,
  }
}

export type BackendType = 'flask' | 'fastapi' | 'php'

export const LEGACY_FIELDS = ['fs_key', 'fsKeyParts', 'encryptedFs', 'flag_verifier'] as const
export const VALID_TOOLS = ['browser', 'network', 'repeater', 'code'] as const

export interface ChallengeConfig {
  title: string
  backend: BackendType
  app: string
  /** @deprecated Use src/ auto-scan instead. Kept for backward compatibility during migration. */
  fs?: Record<string, string>
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
  description?: string
  date?: string
  tags?: string[]
}

const REQUIRED: (keyof ChallengeConfig)[] = ['title', 'backend', 'app']
const VALID_BACKENDS: BackendType[] = ['flask', 'fastapi', 'php']

export function validateChallengeConfig(raw: unknown): ChallengeConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('challenge config must be an object')
  }
  const obj = raw as Record<string, unknown>

  for (const field of REQUIRED) {
    if (obj[field] === undefined || obj[field] === null) {
      throw new Error(`missing required field: ${field}`)
    }
  }

  if (!VALID_BACKENDS.includes(obj.backend as BackendType)) {
    throw new Error(`backend must be one of ${VALID_BACKENDS.join(', ')}, got: ${obj.backend}`)
  }

  // Deprecated field warning
  if (obj.fs !== undefined) {
    console.warn("deprecated field 'fs' — use src/ auto-scan instead")
  }

  // Validate flag
  if (obj.flag !== undefined && typeof obj.flag !== 'string') {
    throw new Error(`flag must be a string, got: ${typeof obj.flag}`)
  }

  // Validate source_visible. The build script and the challenge page both test this
  // field with strict equality against `true`, so a quoted YAML value — the string
  // "true" — fails closed in both: no display copy is built and no Source tab appears,
  // and neither says why. This is the only step an author runs that can say why.
  if (obj.source_visible !== undefined && typeof obj.source_visible !== 'boolean') {
    const value = obj.source_visible
    // The hint is for the one slip the hint describes. A bare `source_visible:` line
    // parses as null, a `1` as a number; telling either author about quoting sends them
    // looking for quotes that are not there.
    const hint = typeof value === 'string'
      ? ' (a quoted YAML value is a string)'
      : value === null
        ? ' (a bare `source_visible:` line with no value parses as null)'
        : ''
    throw new Error(
      `source_visible must be a boolean, got ${value === null ? 'null' : typeof value}: ${JSON.stringify(value)}${hint}`,
    )
  }

  // Validate source_files. Rejected here rather than at keygen time so that a
  // malformed whitelist fails in `pnpm challenge:validate`, which authors run, and not
  // only in the build that produces the WASM.
  if (obj.source_files !== undefined) {
    if (!Array.isArray(obj.source_files)) {
      throw new Error('source_files must be an array of virtual paths')
    }
    for (const entry of obj.source_files as unknown[]) {
      if (typeof entry !== 'string') {
        throw new Error(`source_files entries must be strings, got: ${typeof entry}`)
      }
    }
    // A non-empty whitelist is the author saying "display these". Accepting it while
    // the display switch is off would make that intent silently inert: the build
    // succeeds, the challenge runs, and nothing is shown.
    if ((obj.source_files as unknown[]).length > 0 && obj.source_visible !== true) {
      throw new Error(
        'source_files lists paths to display but source_visible is not true; set source_visible: true or remove source_files',
      )
    }
  }

  // Validate tools
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
    title: obj.title as string,
    backend: obj.backend as BackendType,
    app: obj.app as string,
    fs: obj.fs as Record<string, string> | undefined,
    source_visible: obj.source_visible === true,
    source_files: (Array.isArray(obj.source_files) ? obj.source_files : []) as string[],
    packages: (Array.isArray(obj.packages) ? obj.packages : []) as string[],
    wasmModule: obj.wasmModule as string | undefined,
    flag: (obj.flag as string) ?? undefined,
    tools: obj.tools as (typeof VALID_TOOLS)[number][] | undefined,
    difficulty: obj.difficulty as string | undefined,
    category: obj.category as string | undefined,
    description: obj.description as string | undefined,
    date: obj.date as string | undefined,
    tags: (Array.isArray(obj.tags) ? obj.tags : undefined) as string[] | undefined,
  }
}

import { validateChallengeConfig, LEGACY_FIELDS, type ChallengeConfig } from './config'

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
  const config = validateChallengeConfig(raw)

  const result: ProcessedChallenge = {
    title: config.title,
    backend: config.backend,
    packages: config.packages,
    sourceVisible: config.source_visible,
    wasmModule: config.wasmModule,
    difficulty: config.difficulty,
    category: config.category,
    description: config.description,
    tools: config.tools,
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

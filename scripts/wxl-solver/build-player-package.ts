/**
 * wxl-solver/build-player-package.ts
 *
 * Assemble the ephemeral player-package for L4 blind solve.
 *
 * Output (under `tmp/wxl-verify/<slug>/player-package/`):
 *   - description.md   H1 + first paragraph of platform/challenge/<slug>/index.md,
 *                      stripped of maintainer-only frontmatter and trailing
 *                      sections (everything after the first paragraph after H1).
 *   - META.yaml        base_url / flag_regex / turn_budget / verification_run_id
 *
 * Not included by design (Decision 6):
 *   - src/ copies
 *   - flag.txt
 *   - tests/challenges/<slug>.spec.ts
 *   - any solution/ or trace artefacts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export interface PlayerPackageMeta {
  base_url: string
  flag_regex: string
  turn_budget: number
  verification_run_id: string
}

export interface BuildPlayerPackageOptions {
  slug: string
  projectRoot: string
  workDir: string
  meta: PlayerPackageMeta
}

export interface PlayerPackagePaths {
  packageDir: string
  descriptionPath: string
  metaPath: string
}

/**
 * Pull the H1 + the first contiguous body paragraph following it.
 * Strip leading frontmatter, then look for `# Title\n\n<paragraph>`.
 *
 * Why whitelist not blacklist: maintainer-only blocks (hints, secrets, source
 * pointers) MUST NOT leak into the blind solver's context — the safer policy
 * is to extract a known-safe subset rather than to redact known-bad blocks.
 */
export function extractDescription(indexMd: string): string {
  // Strip YAML frontmatter
  const withoutFm = indexMd.replace(/^---\n[\s\S]*?\n---\n?/, '')

  // Match the first H1 and capture it.
  const h1Match = withoutFm.match(/^[ \t]*#\s+([^\n]+)\n/m)
  if (!h1Match) {
    throw new Error('description extraction: index.md is missing an H1 heading')
  }
  const title = h1Match[1].trim()
  const afterH1 = withoutFm.slice((h1Match.index ?? 0) + h1Match[0].length)

  // Skip blank lines, then grab everything up to the next blank line OR the next heading.
  const trimmed = afterH1.replace(/^\s*\n+/, '')
  const stop = trimmed.match(/\n\s*\n|\n#{1,6}\s+/)
  const firstParagraph = stop ? trimmed.slice(0, stop.index ?? trimmed.length) : trimmed
  const body = firstParagraph.trim()

  if (!body) {
    return `# ${title}\n`
  }
  return `# ${title}\n\n${body}\n`
}

function renderMetaYaml(meta: PlayerPackageMeta): string {
  return [
    `base_url: "${meta.base_url}"`,
    `flag_regex: "${meta.flag_regex}"`,
    `turn_budget: ${meta.turn_budget}`,
    `verification_run_id: "${meta.verification_run_id}"`,
    '',
  ].join('\n')
}

export function buildPlayerPackage(opts: BuildPlayerPackageOptions): PlayerPackagePaths {
  const indexPath = resolve(opts.projectRoot, 'platform', 'challenge', opts.slug, 'index.md')
  if (!existsSync(indexPath)) {
    throw new Error(`buildPlayerPackage: index.md not found for slug ${opts.slug} (${indexPath})`)
  }

  const indexMd = readFileSync(indexPath, 'utf8')
  const description = extractDescription(indexMd)

  const packageDir = resolve(opts.workDir, 'player-package')
  mkdirSync(packageDir, { recursive: true })

  const descriptionPath = resolve(packageDir, 'description.md')
  const metaPath = resolve(packageDir, 'META.yaml')

  writeFileSync(descriptionPath, description, 'utf8')
  writeFileSync(metaPath, renderMetaYaml(opts.meta), 'utf8')

  return { packageDir, descriptionPath, metaPath }
}

/** Helper: ensure the parent directory exists. */
export function ensureWorkDir(workDir: string): void {
  mkdirSync(dirname(workDir), { recursive: true })
  mkdirSync(workDir, { recursive: true })
}

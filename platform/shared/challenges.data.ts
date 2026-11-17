import { readFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { mergeLocaleChallenges, type BriefInput, type DeclarationRead } from './mergeChallenges'
import { LOCALES, type Locale } from '../../.vitepress/locales'
import { readPrimaryLocale } from '../../.vitepress/primary-locale'
import { rewrittenPath } from '../../.vitepress/pageList'
import { readChallengeDeclaration } from '../../.vitepress/challenge/declaration'
import { entryForRelativePath } from '../../.vitepress/theme/i18n/pages'

/** One challenge in one locale's list (L-§4.3). */
export interface ChallengeData {
  /** The 1-based position in the one slug order every list shares (D41); never read from frontmatter. */
  id: number
  /**
   * The challenge's permanent number, straight from its declaration.
   *
   * Deliberately not defaulted to a position the way `id` is: a derived number shifts when a
   * challenge is added out of order or retired, and `/c/003` would then point at a different
   * challenge than the handout that named it. A challenge without one shows no short link at all.
   */
  number?: number
  title: string
  /** The base-less page-list entry of the brief used (D39). */
  url: string
  /** The locale folder of the brief used: the list's locale unless the entry is borrowed. */
  locale: Locale
  difficulty: string
  category: string
  date: string | null
  tags: string[]
  description: string
}

/** One list per locale in `LOCALES`, each in the one shared slug order. */
export interface ChallengeLists extends Record<Locale, ChallengeData[]> {}

/** Relative to this file: every locale folder's briefs, in list order, then every declaration. */
export const watch = [...LOCALES.map((code) => `../${code}/challenge/*/index.md`), '../challenge/*/challenge.yaml']

/** A brief's own frontmatter, parsed by the one YAML parser (core schema, D79); `{}` when it has none. */
function frontmatterOf(text: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  if (!match) return {}
  try {
    const value: unknown = parse(match[1], { schema: 'core' })
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/**
 * Reads the briefs and the declarations among `files` (absolute paths) and merges them into one
 * list per locale. `srcDir` is the site's source directory (`platform/`); the declarations are
 * read relative to the repository root above it. Exported for the loader's own tests; VitePress
 * calls the default export.
 */
export async function loadChallengeLists(
  srcDir: string,
  files: readonly string[],
  { locales, primary }: { locales: readonly Locale[]; primary: Locale },
): Promise<ChallengeLists> {
  const root = resolve(srcDir, '..')
  const briefs: BriefInput[] = []
  const slugs = new Set<string>()
  for (const file of [...files].sort()) {
    const rel = relative(srcDir, file).split(sep).join('/')
    const brief = /^([^/]+)\/challenge\/([^/]+)\/index\.md$/.exec(rel)
    if (brief && (locales as readonly string[]).includes(brief[1])) {
      slugs.add(brief[2])
      briefs.push({
        locale: brief[1] as Locale,
        slug: brief[2],
        url: entryForRelativePath(rewrittenPath(rel, primary)),
        frontmatter: frontmatterOf(readFileSync(file, 'utf8')),
      })
      continue
    }
    const declaration = /^challenge\/([^/]+)\/challenge\.yaml$/.exec(rel)
    if (declaration) slugs.add(declaration[1])
  }
  const declarations = new Map<string, DeclarationRead>()
  for (const slug of slugs) declarations.set(slug, readChallengeDeclaration(root, slug))
  return mergeLocaleChallenges({ briefs, declarations, locales, primary })
}

export default {
  watch,
  async load(files: string[]): Promise<ChallengeLists> {
    const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    return loadChallengeLists(srcDir, files, {
      locales: LOCALES,
      primary: readPrimaryLocale(resolve(srcDir, '..', 'range.json')),
    })
  },
}

declare const data: ChallengeLists
export { data }

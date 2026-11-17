/**
 * Every challenge in every locale's list (0010-S17; D37-D44, L-§4.1-L-§4.3).
 *
 * The loader reads the briefs and the declarations and hands them here. A challenge is keyed by
 * its slug, its directory name, and is listed exactly when it has a brief in the primary locale's
 * folder (D38). A brief supplies `title` and `description`; the challenge's declaration supplies
 * `number`, `difficulty`, `category`, `date` and `tags` (D37). `id` is the 1-based position in one
 * slug order shared by every list (D41).
 *
 * No VitePress import: the loader runs inside the build, and this has to be importable by tests.
 */
import type { ChallengeData, ChallengeLists } from './challenges.data'
import type { Locale } from '../../.vitepress/locales'
import { declarationReadError, type DeclarationResult } from '../../.vitepress/challenge/declaration'
import en from '../../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../../.vitepress/theme/i18n/messages/zh-TW.json'

/** The string tables the defaults are read from (D42); a locale without one never reaches a default. */
const TABLES: Record<Locale, { challenge_list: { default_title: string; default_category: string } }> = {
  en,
  'zh-TW': zhTW,
}

/** Read only when a field needs its default, so a locale with no string table works when none is needed. */
const defaultOf = (locale: Locale, key: 'default_title' | 'default_category'): string => TABLES[locale].challenge_list[key]

/** A value when it is a string, else undefined: YAML reads `title: 2048` as a number. */
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

/** One challenge brief as the loader gives it (L-§4.3). */
export interface BriefInput {
  locale: Locale
  slug: string
  /** The page-list entry of the brief's source path: base-less, with a trailing slash (D39). */
  url: string
  frontmatter: Record<string, unknown>
}

export type DeclarationRead = DeclarationResult

export interface MergeInput {
  briefs: readonly BriefInput[]
  declarations: ReadonlyMap<string, DeclarationRead>
  locales: readonly Locale[]
  primary: Locale
}

/** A date as the list shows it: a string `Date.parse` accepts as written, a `Date` as ISO text, else null. */
function dateOf(value: unknown): string | null {
  if (typeof value === 'string') return Number.isFinite(Date.parse(value)) ? value : null
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString()
  return null
}

/**
 * One list entry, built field by field from the two sources of L-§4.2 and never by spreading
 * either (D37, Y113): the brief gives `title`, `description`, `locale` and `url`; the declaration
 * gives the rest. `number` is the declared number or nothing, never a position (a handout prints it).
 */
function toData(brief: BriefInput, declaration: Record<string, unknown>, id: number, listLocale: Locale): ChallengeData {
  return {
    id,
    number: typeof declaration.number === 'number' ? declaration.number : undefined,
    title: text(brief.frontmatter.title) ?? defaultOf(listLocale, 'default_title'),
    url: brief.url,
    locale: brief.locale,
    difficulty: text(declaration.difficulty) ?? 'mystery',
    category: text(declaration.category) ?? defaultOf(listLocale, 'default_category'),
    date: dateOf(declaration.date),
    tags: Array.isArray(declaration.tags) ? declaration.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    description: text(brief.frontmatter.description) ?? '',
  }
}

/**
 * The declaration of a listed challenge, or the D56 error: a listed challenge (it has a primary
 * brief) whose declaration is missing from `declarations` or unreadable fails the merge, with the
 * brief path of the primary locale. The read of an unlisted challenge is never looked at.
 */
function declarationOf(primaryBrief: BriefInput, declarations: ReadonlyMap<string, DeclarationRead>): Record<string, unknown> {
  const read = declarations.get(primaryBrief.slug)
  if (read?.ok) return read.value
  throw declarationReadError(`${primaryBrief.locale}/challenge/${primaryBrief.slug}/index.md`, primaryBrief.slug, read?.reason ?? 'absent')
}

export function mergeLocaleChallenges({ briefs, declarations, locales, primary }: MergeInput): ChallengeLists {
  const bySlug = new Map<string, Map<Locale, BriefInput>>()
  for (const b of briefs) {
    const entry = bySlug.get(b.slug) ?? new Map<Locale, BriefInput>()
    entry.set(b.locale, b)
    bySlug.set(b.slug, entry)
  }
  // UTF-16 code unit order (the default comparison, not localeCompare): one order, every list (D41).
  const listed = [...bySlug.keys()].filter((slug) => bySlug.get(slug)!.has(primary)).sort()
  const lists = {} as ChallengeLists
  for (const locale of locales) {
    lists[locale] = listed.map((slug, index) => {
      const own = bySlug.get(slug)!
      return toData((own.get(locale) ?? own.get(primary))!, declarationOf(own.get(primary)!, declarations), index + 1, locale)
    })
  }
  return lists
}

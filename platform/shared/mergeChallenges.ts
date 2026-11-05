/**
 * Every challenge in every locale's list (spec 0008, seam S4, G7).
 *
 * Both content loaders read both locale trees and hand every brief here with their own locale.
 * A challenge is keyed by its slug, its directory name. The list takes the brief in its own
 * locale when there is one, and otherwise borrows the brief the challenge has; `locale` names the
 * locale of the brief used, which is the locale of the page `url` opens. A field the used brief
 * leaves out takes the list locale's default. `id` is the English brief's frontmatter `id`, else
 * the Traditional Chinese brief's, else the 1-based position in one shared order — the English
 * briefs in the order given, then challenges with only a Traditional Chinese brief, by slug — so
 * both lists hold the same challenges with the same `id`s, in the same order, whichever order the
 * loader lists the two trees in.
 *
 * No VitePress import: the loaders run inside the build, and this has to be importable by tests.
 */
import type { ChallengeData, ChallengeLocale as Locale } from './challenges.data'

/** One challenge brief as a content loader gives it: its base-less page URL and its frontmatter. */
export interface ChallengeBrief {
  url: string
  frontmatter: Record<string, unknown>
}

/** What a list shows for a field the brief leaves out, in the list's own locale. */
const DEFAULTS: Record<Locale, { title: string; category: string }> = {
  en: { title: 'Web exploitation challenge', category: 'General' },
  'zh-TW': { title: '網站攻防挑戰', category: '綜合' },
}

/** The locale tree a brief's page is in, and its slug: `/zh-TW/challenge/<slug>/` or `/challenge/<slug>/`. */
function placeOf(url: string): { locale: Locale; slug: string } {
  const segments = url.replace(/\.html$/, '').split('/').filter((s) => s !== '')
  return { locale: segments[0] === 'zh-TW' ? 'zh-TW' : 'en', slug: segments[segments.length - 1] ?? '' }
}

/** A frontmatter value when it is a string, else undefined: YAML reads `title: 2048` as a number. */
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

function toData(brief: ChallengeBrief, locale: Locale, listLocale: Locale, id: number | string): ChallengeData {
  const fm = brief.frontmatter
  // Fields the list searches and sorts as text take the default when they are not strings: one
  // tree's brief now reaches both lists, so a stray number would break both (stage 7, S-1).
  return {
    id,
    // Read from frontmatter and never derived: a number is what a handout prints.
    number: typeof fm.number === 'number' ? fm.number : undefined,
    title: text(fm.title) ?? DEFAULTS[listLocale].title,
    url: brief.url,
    locale,
    difficulty: (fm.difficulty as ChallengeData['difficulty']) ?? 'mystery',
    category: text(fm.category) ?? DEFAULTS[listLocale].category,
    date: (fm.date as string | undefined) ?? null,
    tags: Array.isArray(fm.tags) ? fm.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    description: text(fm.description) ?? '',
  }
}

/** The list for `listLocale`, from every brief of both locale trees. */
export function mergeLocaleChallenges(briefs: readonly ChallengeBrief[], listLocale: Locale): ChallengeData[] {
  const bySlug = new Map<string, Partial<Record<Locale, ChallengeBrief>>>()
  const englishOrder: string[] = []
  for (const brief of briefs) {
    const { locale, slug } = placeOf(brief.url)
    const entry = bySlug.get(slug) ?? {}
    entry[locale] = brief
    bySlug.set(slug, entry)
    if (locale === 'en') englishOrder.push(slug)
  }
  const chineseOnly = [...bySlug.keys()].filter((slug) => !bySlug.get(slug)!.en).sort()
  return [...englishOrder, ...chineseOnly].map((slug, index) => {
    const entry = bySlug.get(slug)!
    const id = (entry.en?.frontmatter.id ?? entry['zh-TW']?.frontmatter.id ?? index + 1) as number | string
    const used: Locale = entry[listLocale] ? listLocale : listLocale === 'en' ? 'zh-TW' : 'en'
    return toData(entry[used]!, used, listLocale, id)
  })
}

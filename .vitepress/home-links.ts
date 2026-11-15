// Home-page links (seam 0010-S7; D13, D141, B62–B70, B92, B94). `localizeHomeLinks` reads exactly
// `hero.actions[*].link` and `features[*].link` of a `layout: home` page's frontmatter. This
// function runs only on a locale's home page, whose source path is always `<pageLocale>/index.md`
// — that is PL-E12's `<page>`.

import { LOCALES, type Locale } from './locales.ts'
import { SiteLayoutError, jsonStringifyEscaped } from './layout-error.ts'
import { pathCandidates, firstListedEntry } from './theme/i18n/pages'

const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/

function withPrefix(path: string, locale: Locale): string {
  return path === '/' ? `/${locale}/` : `/${locale}${path}`
}

function firstSegment(path: string): string | undefined {
  return path.slice(1).split('/')[0] || undefined
}

function hasListedPrefix(path: string): boolean {
  const segment = firstSegment(path)
  return segment !== undefined && (LOCALES as readonly string[]).includes(segment)
}

function pl12(page: string, field: string, value: unknown, reason: string): SiteLayoutError {
  return new SiteLayoutError(
    'PL-E12',
    `PL-E12: ${jsonStringifyEscaped(page)} has ${field} ${jsonStringifyEscaped(value)}, which ${reason}.`,
  )
}

function localizeLink(
  link: unknown,
  field: string,
  page: string,
  pageLocale: Locale,
  primary: Locale,
  pages: readonly string[],
): unknown {
  if (typeof link !== 'string') {
    throw pl12(page, field, link, 'is not a string')
  }
  if (link.startsWith('//')) {
    throw pl12(page, field, link, 'is a protocol-relative link; write a site link from the locale’s home page, or an external link with its scheme')
  }
  if (SCHEME_RE.test(link) || link.startsWith('#')) {
    return link
  }
  if (!link.startsWith('/')) {
    throw pl12(page, field, link, 'is a relative link; write it from the locale’s home page, such as "/guide/"')
  }
  if (hasListedPrefix(link)) {
    throw pl12(page, field, link, 'already carries a locale prefix; write it from the locale’s home page, the build adds the prefix')
  }
  const localized = pageLocale === primary ? link : withPrefix(link, pageLocale)
  const forLookup = localized.replace(/[?#].*$/, '')
  if (firstListedEntry(pathCandidates(forLookup, '/'), pages) === null) {
    throw pl12(page, field, link, 'does not name a published page')
  }
  return localized
}

interface HeroAction {
  link?: unknown
  [key: string]: unknown
}

interface Feature {
  link?: unknown
  [key: string]: unknown
}

/**
 * `frontmatter` with every `hero.actions[*].link` and `features[*].link` localized for
 * `pageLocale` under `primary`: unchanged on the primary locale's home page, prefixed with
 * `pageLocale` on a translation's. Every other field, including `hero.image.src` and
 * `features[i].icon.src`, is returned byte-identical and never read. Only a `layout: home` page
 * is touched; anything else is returned unchanged.
 */
export function localizeHomeLinks(
  frontmatter: Record<string, unknown>,
  pageLocale: Locale,
  primary: Locale,
  pages: readonly string[],
): Record<string, unknown> {
  if (frontmatter.layout !== 'home') return frontmatter
  const page = `${pageLocale}/index.md`
  const hero = frontmatter.hero as { actions?: HeroAction[] } | undefined
  const features = frontmatter.features as Feature[] | undefined
  const newHero = hero?.actions
    ? {
        ...hero,
        actions: hero.actions.map((action, i) =>
          'link' in action
            ? { ...action, link: localizeLink(action.link, `hero.actions[${i}].link`, page, pageLocale, primary, pages) }
            : action,
        ),
      }
    : hero
  const newFeatures = features?.map((feature, i) =>
    'link' in feature
      ? { ...feature, link: localizeLink(feature.link, `features[${i}].link`, page, pageLocale, primary, pages) }
      : feature,
  )
  const result: Record<string, unknown> = { ...frontmatter }
  if (hero) result.hero = newHero
  if (features) result.features = newFeatures
  return result
}

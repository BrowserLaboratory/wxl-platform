/**
 * shortLink.ts
 *
 * A challenge's number, and the links the copy control gives: the short link
 * built from the number, or the challenge page's URL built from its slug.
 *
 * Shared by the build scripts and the site, so nothing here may import a Node
 * built-in, or read the build's link-mode constant: `scripts/challenge-numbers.ts`
 * re-exports the number helpers for the tree walk, and the theme imports the
 * link helpers for the page.
 *
 * The build decides the link mode, not the host it is served from. Cloudflare
 * Pages' own Git build (`CF_PAGES=1`) gives the short link, zero-padded, which
 * is also what a handout prints. Every other build gives the challenge page's
 * URL: a GitHub Pages build, a Cloudflare Direct Upload or Workers build, and a
 * build served by any other host, including one that reads `_redirects`.
 * In either mode a challenge has one canonical link: what is copied is that
 * URL, and what is shown is the same URL without its scheme.
 */

/** Minimum width of the decimal spelling used in URLs and on screen. */
export const NUMBER_PAD_WIDTH = 3

/**
 * The range's public address: the origin of every copied link, in both link
 * modes, the short link of a `CF_PAGES=1` build and the challenge page's URL of
 * every other build. For a GitHub Pages project site it ends in `/<repo>`, the
 * same path as the site base, so a page URL appends the page's path to it with
 * no base added.
 *
 * Deliberately not `location.origin`. The link exists to be handed to a class,
 * so a teacher copying it from a local preview has to get the address the class
 * can reach, not `http://localhost:5173`. `pnpm fork:init --origin <url>` sets
 * this; `--host github-pages` without `--origin` derives it, and `--host
 * cloudflare-pages` requires `--origin`.
 */
export const SITE_ORIGIN = 'https://wxl.browserlab.online'

/**
 * Whether a frontmatter value is a usable challenge number.
 *
 * Integer and greater than zero. A string is rejected even when it spells a
 * number, because `"007"` is the padded URL spelling and is exactly what gets
 * copied into frontmatter by mistake — accepting it would let two challenges
 * hold `7` and `"007"` and pass a uniqueness check.
 */
export function isChallengeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

/** The decimal spelling used in URLs and on screen: at least three digits, never truncated. */
export function padChallengeNumber(n: number): string {
  return String(n).padStart(NUMBER_PAD_WIDTH, '0')
}

/** The locale segment a short link carries, if any. */
export type ShortLinkLocale = 'en' | 'zh-TW'

/** The path a redirect rule maps: `/c/001`, or `/zh/c/001` in Traditional Chinese. */
export function shortLinkPath(n: number, locale: ShortLinkLocale): string {
  const padded = padChallengeNumber(n)
  return locale === 'zh-TW' ? `/zh/c/${padded}` : `/c/${padded}`
}

/** What is copied: the absolute URL, scheme included, because it is pasted into a message. */
export function shortLinkUrl(n: number, locale: ShortLinkLocale, origin: string = SITE_ORIGIN): string {
  return `${origin}${shortLinkPath(n, locale)}`
}

/**
 * What is shown: host and path, without the scheme.
 *
 * The scheme is noise on screen and the reader does not have to type it, but it
 * has to be in what gets pasted — hence the two spellings.
 */
export function shortLinkDisplay(n: number, locale: ShortLinkLocale, origin: string = SITE_ORIGIN): string {
  return `${origin.replace(SCHEME, '')}${shortLinkPath(n, locale)}`
}

/** The leading `<scheme>://` that the displayed text leaves out. */
const SCHEME = /^[a-z]+:\/\//

/** The slug grammar `create:challenge` enforces; a page URL is only built from a slug inside it. */
const SLUG_GRAMMAR = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

/** `short` copies the short link; `page` copies the challenge page's URL. Fixed once per build. */
export type LinkMode = 'short' | 'page'

/** What the copy control shows and copies: the copied URL, and the same without its scheme. */
export interface ChallengeLink {
  url: string
  display: string
}

/**
 * The link the copy control gives for a mode, or null when there is none to give.
 *
 * Takes the mode as an argument rather than reading the build's constant: the build scripts
 * import this module under Node, where that constant does not exist. The origin is appended
 * to as given, not normalised.
 */
export function challengeLink(
  mode: LinkMode,
  n: number | undefined,
  slug: string | undefined,
  locale: ShortLinkLocale,
  origin: string = SITE_ORIGIN,
): ChallengeLink | null {
  if (!isChallengeNumber(n)) return null
  if (mode === 'short') {
    return { url: shortLinkUrl(n, locale, origin), display: shortLinkDisplay(n, locale, origin) }
  }
  if (slug === undefined || !SLUG_GRAMMAR.test(slug)) return null
  const url = `${origin}${locale === 'zh-TW' ? '/zh-TW' : ''}/challenge/${slug}/`
  return { url, display: url.replace(SCHEME, '') }
}

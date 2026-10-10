/**
 * shortLink.ts
 *
 * A challenge's number and the short link built from it.
 *
 * Shared by the build scripts and the site, so nothing here may import a Node
 * built-in: `scripts/challenge-numbers.ts` re-exports the number helpers for
 * the tree walk, and the theme imports the link helpers for the page.
 *
 * There is one canonical spelling per challenge — zero-padded, and the same
 * string whether it is printed on a handout, shown on screen, or copied.
 */

/** Minimum width of the decimal spelling used in URLs and on screen. */
export const NUMBER_PAD_WIDTH = 3

/**
 * The public origin the short links belong to.
 *
 * Deliberately not `location.origin`. The link exists to be handed to a class,
 * so a teacher copying it from a local preview has to get the address the class
 * can reach, not `http://localhost:5173`. A fork changes it here, the way it
 * changes `base` in `.vitepress/config.mts`.
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
  return `${origin.replace(/^[a-z]+:\/\//, '')}${shortLinkPath(n, locale)}`
}

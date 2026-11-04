/**
 * The page list: the published pages of the site, as base-less paths, and the questions
 * epic 0008's locale decisions ask of it (spec 0008, seam S2).
 *
 * **Spelling.** The one `cleanUrls` gives: a directory's `index.md` keeps its trailing
 * slash (`/`, `/guide/`, `/challenge/x/`, `/zh-TW/`), any other page file has none
 * (`/challenges`, `/guide/python`). Every entry is spelled this way, and a not-found
 * redirect is always given an entry as its target, never URL text.
 *
 * No imports: the site configuration loads this module in Node to build the list.
 */

/** The page-list entry of a source file, given its path relative to the site's source directory. */
export function entryForSourcePath(source: string): string {
  const path = source.replace(/\.md$/, '')
  if (path === 'index') return '/'
  if (path.endsWith('/index')) return `/${path.slice(0, -'index'.length)}`
  return `/${path}`
}

/**
 * The pathname with the site base taken off, or null when the pathname is not under the
 * base. The base is `/` or a path like `/repo/`.
 */
export function withoutBase(pathname: string, base: string): string | null {
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base
  if (!prefix) return pathname
  return pathname === prefix || pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) || '/' : null
}

/**
 * The URL a redirect navigates to: a list entry with the site base put back in front, and the
 * query and hash of the location the learner arrived at kept. Every redirect target is built
 * here, from an entry, never from the URL's text (spec 0008, D16).
 */
export function targetUrl(entry: string, base: string, location: { search?: string; hash?: string }): string {
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base
  return prefix + entry + (location.search ?? '') + (location.hash ?? '')
}

/**
 * The page-list spellings a pathname could be, for a path the router could not render
 * (spec 0008, "Schema: page list", the lookup algorithm). Nothing here throws:
 *
 *   1. strip the site base, and decode percent-encoding once — a path that fails to decode
 *      names no page;
 *   2. a decoded path holding `//`, `\` or a `..` segment names no page;
 *   3. drop a trailing `.html`, then a trailing `/index`;
 *   4. the candidates are the result with a trailing slash and without one;
 *   5. a candidate matches when it equals a list entry exactly (case-sensitive) — see
 *      `firstListedEntry`.
 *
 * A page the router DID render is identified by its source file instead (`entryForSourcePath`).
 */
export function pathCandidates(pathname: string, base: string): string[] {
  const local = withoutBase(pathname, base)
  if (local === null) return []
  let path: string
  try {
    path = decodeURIComponent(local)
  } catch {
    return []
  }
  if (!path.startsWith('/') || path.includes('//') || path.includes('\\')) return []
  if (path.split('/').includes('..')) return []
  path = path.replace(/\.html$/, '').replace(/\/index$/, '/')
  const bare = path.length > 1 ? path.replace(/\/$/, '') : path
  return bare === '/' ? ['/'] : [bare, `${bare}/`]
}

/** The first of the spellings that is a list entry, or null. */
export function firstListedEntry(spellings: readonly string[], pages: readonly string[]): string | null {
  return spellings.find((p) => pages.includes(p)) ?? null
}

/** Whether the pathname itself names a published page. */
export function isPublishedPath(pathname: string, base: string, pages: readonly string[]): boolean {
  return firstListedEntry(pathCandidates(pathname, base), pages) !== null
}

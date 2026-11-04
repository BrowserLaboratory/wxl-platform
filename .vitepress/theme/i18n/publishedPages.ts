/**
 * The site's published pages (spec 0008, seam S2), as `.vitepress/config.mts` listed them
 * when the build — or the dev server — started.
 *
 * `__WXL_PAGES__` is replaced at compile time with the list itself, so the static HTML and
 * the hydrated page read the same list. Where nothing replaces it, as under vitest, it is
 * undefined and the list is empty: `typeof` keeps that from throwing. Its own module, like
 * `linkMode.ts`, so a test can replace it with `vi.mock`.
 */
export function publishedPages(): readonly string[] {
  return typeof __WXL_PAGES__ !== 'undefined' ? __WXL_PAGES__ : []
}

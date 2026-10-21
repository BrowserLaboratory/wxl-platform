import type { LinkMode } from '../challenge/shortLink'

/**
 * The build's link mode: `short` only when Cloudflare Pages built the site.
 *
 * `__WXL_SHORT_LINKS__` is replaced at compile time (`.vitepress/config.mts`, `vite.define`),
 * so the HTML as served and the hydrated page read the same literal, and nothing set at run
 * time, `window.__WXL_SHORT_LINKS__` included, can switch it. Where nothing replaces it, as
 * under vitest, the constant is undefined and the mode is `page`: `typeof` keeps that from
 * throwing a ReferenceError.
 *
 * Its own module, and not part of `shortLink.ts`, because the build scripts import that one
 * under Node, where the constant does not exist; and so a component test can replace the mode
 * with `vi.mock`.
 */
export function linkMode(): LinkMode {
  return typeof __WXL_SHORT_LINKS__ !== 'undefined' && __WXL_SHORT_LINKS__ ? 'short' : 'page'
}

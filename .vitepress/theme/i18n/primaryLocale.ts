import type { Locale } from '../../locales'

/**
 * How routing code learns `P` (D31, seam 0010-S12): one client module, shaped like
 * `publishedPages()`, so a test can replace it with `vi.mock`.
 *
 * `__WXL_PRIMARY_LOCALE__` is replaced at compile time (`.vitepress/config.mts`, `vite.define`),
 * so the HTML as served and the hydrated page read the same literal. Where nothing replaces it,
 * as under vitest, the constant is undefined and the answer is `zh-TW`, the same answer R17
 * gives for "nothing says"; `typeof` keeps that from throwing a ReferenceError. No test may rely
 * on that fallback: every test whose outcome depends on `P` sets it explicitly (D31).
 */
export function primaryLocale(): Locale {
  return typeof __WXL_PRIMARY_LOCALE__ !== 'undefined' ? __WXL_PRIMARY_LOCALE__ : 'zh-TW'
}

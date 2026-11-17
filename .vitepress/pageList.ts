import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { entryForRelativePath } from './theme/i18n/pages'
import { LOCALES, type Locale } from './locales.ts'

/** Directories VitePress never builds pages from, at any depth (its own glob ignores them too). */
const NEVER_PAGES = new Set(['node_modules', 'dist'])

/**
 * Top-level directories of the source directory that hold no pages: `public/` is copied
 * verbatim and never rendered, and `shared/` holds the data loaders (spec 0008, the page-list
 * oracle).
 */
const NOT_PAGES_AT_TOP = new Set(['public', 'shared'])

/** `challenge/<slug>/src/**`: a challenge's own application code, never a page (B24). */
const CHALLENGE_SRC_RE = /^challenge\/[^/]+\/src$/

/**
 * A smoke fixture page (D49): a source under `<locale code>/smoke-fixtures/`, at any depth below
 * it, as the `<code>/smoke-fixtures/**` glob matches. Only a test build (`WXL_SMOKE_PAGES=1`)
 * publishes these. This module and the site configuration are the only places that spell the
 * folder name: both run in Node, so a production client bundle never carries it (L47).
 */
export function isSmokeFixturePage(sourcePath: string): boolean {
  const segments = sourcePath.split('/')
  return segments.length > 2 && (LOCALES as readonly string[]).includes(segments[0]) && segments[1] === 'smoke-fixtures'
}

/** The `srcExclude` globs that keep the smoke fixtures out of a production build: one per locale code. */
export const SMOKE_FIXTURE_GLOBS: readonly string[] = LOCALES.map((code) => `${code}/smoke-fixtures/**`)

/**
 * `source` (relative to the site's source directory) with the primary locale's own prefix
 * segment removed, when it has one; unchanged otherwise (BC3, B39). A whole segment only:
 * `rewrittenPath('english/x.md', 'en')` is unchanged, because `'english/x.md'` does not start
 * with the literal `'en/'`.
 */
export function rewrittenPath(source: string, primary: Locale | undefined): string {
  if (primary === undefined) return source
  const prefix = `${primary}/`
  return source.startsWith(prefix) ? source.slice(prefix.length) : source
}

/**
 * The page list of a source directory (spec 0008, seam S2): one entry per `*.md` file, in the
 * page-list spelling, sorted. Runs in Node when the site configuration is evaluated, so a page
 * added under `pnpm dev` appears once the dev server restarts. `primary` rewrites a primary-folder
 * source's path before it is turned into an entry (D9); omitted, no path is rewritten. A smoke
 * fixture page (`isSmokeFixturePage`) is listed only when `options.smokePages` is `true`; omitted
 * is a production build (D49). The environment is read by the configuration, never here (L-q4).
 */
export function pageListFromDir(srcDir: string, primary?: Locale, options?: { smokePages?: boolean }): string[] {
  const entries: string[] = []
  const walk = (dir: string, top: boolean, rel: string) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      // Dot-prefixed files and directories are never published: VitePress's page glob does
      // not match them, so listing one would name a page that does not exist.
      if (item.name.startsWith('.')) continue
      const childRel = rel ? `${rel}/${item.name}` : item.name
      if (item.isDirectory()) {
        if (NEVER_PAGES.has(item.name)) continue
        if (top && NOT_PAGES_AT_TOP.has(item.name)) continue
        if (CHALLENGE_SRC_RE.test(childRel)) continue
        walk(join(dir, item.name), false, childRel)
      } else if (item.isFile() && item.name.endsWith('.md')) {
        if (options?.smokePages !== true && isSmokeFixturePage(childRel)) continue
        entries.push(entryForRelativePath(rewrittenPath(childRel, primary)))
      }
    }
  }
  walk(srcDir, true, '')
  return entries.sort()
}

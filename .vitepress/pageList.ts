import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { entryForRelativePath } from './theme/i18n/pages'
import type { Locale } from './locales.ts'

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
 * source's path before it is turned into an entry (D9); omitted, no path is rewritten.
 */
export function pageListFromDir(srcDir: string, primary?: Locale): string[] {
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
        entries.push(entryForRelativePath(rewrittenPath(childRel, primary)))
      }
    }
  }
  walk(srcDir, true, '')
  return entries.sort()
}

import { readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { entryForSourcePath } from './theme/i18n/pages'

/** Directories VitePress never builds pages from, at any depth (its own glob ignores them too). */
const NEVER_PAGES = new Set(['node_modules', 'dist'])

/**
 * Top-level directories of the source directory that hold no pages: `public/` is copied
 * verbatim and never rendered, and `shared/` holds the data loaders (spec 0008, the page-list
 * oracle).
 */
const NOT_PAGES_AT_TOP = new Set(['public', 'shared'])

/**
 * The page list of a source directory (spec 0008, seam S2): one entry per `*.md` file, in the
 * page-list spelling, sorted. Runs in Node when the site configuration is evaluated, so a page
 * added under `pnpm dev` appears once the dev server restarts.
 */
export function pageListFromDir(srcDir: string): string[] {
  const entries: string[] = []
  const walk = (dir: string, top: boolean) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      // Dot-prefixed files and directories are never published: VitePress's page glob does
      // not match them, so listing one would name a page that does not exist.
      if (item.name.startsWith('.')) continue
      if (item.isDirectory()) {
        if (NEVER_PAGES.has(item.name)) continue
        if (top && NOT_PAGES_AT_TOP.has(item.name)) continue
        walk(join(dir, item.name), false)
      } else if (item.isFile() && item.name.endsWith('.md')) {
        entries.push(entryForSourcePath(relative(srcDir, join(dir, item.name)).split(sep).join('/')))
      }
    }
  }
  walk(srcDir, true)
  return entries.sort()
}

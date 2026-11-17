// The layout check (seam 0010-S2): `checkSourceLayout` (D1, D5, D6, D20; PL-E07–PL-E10) and the
// page predicate `classifySourcePath` (D116). Both rest on `isExcluded` and `isLocaleFolderPath`
// below. `sourcePath` is relative to `platform/` (as PL-E11's `<page>` is).

import { readdirSync, lstatSync } from 'node:fs'
import { join } from 'node:path'
import { LOCALES, type Locale } from './locales.ts'
import { SiteLayoutError, jsonStringifyEscaped } from './layout-error.ts'

const LOCALE_FOLDER_PREFIXES = LOCALES.map((code) => `${code}/`)

function isExcluded(sourcePath: string): boolean {
  if (sourcePath.startsWith('public/') || sourcePath.startsWith('shared/')) return true
  if (/^challenge\/[^/]+\/src\//.test(sourcePath)) return true
  for (const segment of sourcePath.split('/')) {
    if (segment.startsWith('.')) return true
    if (segment === 'node_modules' || segment === 'dist') return true
  }
  return false
}

function isPage(sourcePath: string): boolean {
  return sourcePath.endsWith('.md') && !isExcluded(sourcePath)
}

function isLocaleFolderPath(sourcePath: string): boolean {
  return LOCALE_FOLDER_PREFIXES.some((prefix) => sourcePath.startsWith(prefix))
}

export type SourcePathClass = 'excluded' | 'locale-page' | 'outside'

// D116: one predicate, shared with create-wxl's literal copy (`isLegacyPage`, U136). `primary`
// does not change the classification (D116: the predicate is one for every tool); it is kept as
// a parameter so a future caller can read it without a new seam.
export function classifySourcePath(sourcePath: string, _primary: Locale): SourcePathClass {
  if (!isPage(sourcePath)) return 'excluded'
  return isLocaleFolderPath(sourcePath) ? 'locale-page' : 'outside'
}

// ─── checkSourceLayout (0010-S2; B20–B36, B91; PL-E07–PL-E10, D6) ───────────────────────────────

function pathList(code: string, firstLine: string, paths: readonly string[]): SiteLayoutError {
  const quoted = paths.map((p) => `  ${jsonStringifyEscaped(p)}`)
  return new SiteLayoutError(code, [firstLine, ...quoted].join('\n'))
}

/** Whether a directory's own contents are excluded (public/, shared/, a challenge's src/, dot-
 *  prefixed, node_modules, dist), by testing a hypothetical file directly inside it against the
 *  same rule `isExcluded` applies to a full source path. */
function isExcludedDir(childRel: string): boolean {
  return isExcluded(`${childRel}/x`)
}

/** Every `.md` page anywhere beneath `dir` (relative to the source root, as `rel`), skipping the
 *  same excluded areas `checkSourceLayout`'s main walk does. A symbolic link beneath `dir` is
 *  recorded in `v.e07` and not followed. Used only for a direct entry of a locale folder that is
 *  itself named like a listed locale (B31): every page under it still collides with that locale's
 *  URL prefix. */
function mdFilesBeneath(dir: string, rel: string, v: Violations): string[] {
  const found: string[] = []
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const childRel = `${rel}/${item.name}`
    if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist') continue
    if (item.isSymbolicLink()) {
      v.e07.push(childRel)
      continue
    }
    if (item.isDirectory()) {
      found.push(...mdFilesBeneath(join(dir, item.name), childRel, v))
    } else if (item.isFile() && item.name.endsWith('.md')) {
      found.push(childRel)
    }
  }
  return found
}

interface Violations {
  e07: string[]
  e08: string[]
  e09: string[]
}

function walkSourceTree(srcDir: string, dir: string, rel: string, primary: Locale, v: Violations): void {
  const topLocaleCode = rel !== '' && !rel.includes('/') && (LOCALES as readonly string[]).includes(rel) ? rel : null
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const childRel = rel ? `${rel}/${item.name}` : item.name
    if (isExcludedDir(childRel)) continue
    if (item.isSymbolicLink()) {
      v.e07.push(childRel)
      continue
    }
    if (topLocaleCode !== null) {
      // B31: a direct entry of a locale folder named like a listed locale (file minus `.md`, or
      // a folder name). Every page it holds collides with that locale's URL prefix; a page-less
      // entry (an empty folder, or a folder holding nothing but excluded content) is reported by
      // itself.
      const base = item.isDirectory() ? item.name : item.name.replace(/\.md$/, '')
      if ((LOCALES as readonly string[]).includes(base)) {
        if (item.isDirectory()) {
          const pages = mdFilesBeneath(join(dir, item.name), childRel, v)
          if (pages.length > 0) v.e09.push(...pages)
          else v.e09.push(`${childRel}/`)
        } else {
          v.e09.push(childRel)
        }
        continue
      }
    }
    if (item.isDirectory()) {
      walkSourceTree(srcDir, join(dir, item.name), childRel, primary, v)
    } else if (item.isFile() && item.name.endsWith('.md')) {
      if (!isLocaleFolderPath(childRel)) v.e08.push(childRel)
    }
  }
}

function hasPrimaryHome(srcDir: string, primary: Locale): boolean {
  try {
    return lstatSync(join(srcDir, primary, 'index.md')).isFile()
  } catch {
    return false
  }
}

/**
 * The layout check (D1, D5, D6, D20): throws `SiteLayoutError` (PL-E07–PL-E10) on the first rule
 * a source tree violates, in that order; returns otherwise. Paths in every thrown list are
 * repository-relative, `platform/`-prefixed (the root itself, when it is the violation, is
 * reported as bare `platform`, B91).
 */
export function checkSourceLayout(srcDir: string, primary: Locale): void {
  if (lstatSync(srcDir).isSymbolicLink()) {
    throw pathList('PL-E07', PL_E07_FIRST_LINE, ['platform'])
  }
  const v: Violations = { e07: [], e08: [], e09: [] }
  walkSourceTree(srcDir, srcDir, '', primary, v)
  if (v.e07.length > 0) throw pathList('PL-E07', PL_E07_FIRST_LINE, v.e07.map((p) => `platform/${p}`).sort())
  if (v.e08.length > 0) throw pathList('PL-E08', PL_E08_FIRST_LINE, v.e08.map((p) => `platform/${p}`).sort())
  if (v.e09.length > 0) throw pathList('PL-E09', PL_E09_FIRST_LINE, v.e09.map((p) => `platform/${p}`).sort())
  if (!hasPrimaryHome(srcDir, primary)) {
    throw new SiteLayoutError(
      'PL-E10',
      `PL-E10: the primary locale ${primary} has no home page: ${jsonStringifyEscaped(`platform/${primary}/index.md`)} is missing.`,
    )
  }
}

const PL_E07_FIRST_LINE =
  'PL-E07: these paths are symbolic links where the build looks for pages; replace each with the file or folder itself:'
/** Where a range on the old layout finds how to move its pages; PL-E08 and the pre-commit hook's W6d both say it (D113). */
export const PL_E08_MOVE = 'README.en.md describes in "Moving to the locale folders"'

/** The pre-commit hook's W6d line for one old-layout path, without the hook's prefix (D113: one wording with PL-E08). */
export function legacyPageLine(path: string): string {
  return `${path} is outside the locale folders (PL-E08), so CI would fail this commit; move it as ${PL_E08_MOVE}.`
}

const PL_E08_FIRST_LINE =
  `PL-E08: these pages are outside the locale folders. Every page lives in platform/<locale>/ for a locale on the locale list (${LOCALES.join(', ')}); a range on the old layout moves its pages as ${PL_E08_MOVE} (README.md: 「搬到語系資料夾」):`
const PL_E09_FIRST_LINE =
  `PL-E09: these entries of a locale folder are named like a locale on the locale list (${LOCALES.join(', ')}); their URLs would collide with that locale's prefix:`

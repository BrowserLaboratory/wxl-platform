import { readdirSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

export interface ScanResult {
  virtualPath: string   // e.g. "/flag.txt", "/templates/index.html"
  absolutePath: string  // full filesystem path
}

/** Built-in patterns always excluded from src/ scanning */
export const DEFAULT_EXCLUDES = [
  '__pycache__/',
  '*.pyc', '*.pyo',
  '*.egg-info/',
  '.venv/', 'venv/',
  '.DS_Store', 'Thumbs.db',
  '*.swp', '*.swo', '*~',
  '.git/',
  '.fsignore',
]

/**
 * Simple glob matcher for DEFAULT_EXCLUDES patterns.
 *
 * - `*` matches any sequence of non-/ characters
 * - Trailing `/` in the pattern means only match directories
 * - Pattern without `/` matches the basename only
 *
 * @param pattern  The glob pattern (e.g. "*.pyc", "__pycache__/")
 * @param path     The relative path to test (e.g. "deep/module.pyc")
 * @param isDir    Whether the path refers to a directory
 */
export function matchesGlob(pattern: string, path: string, isDir: boolean): boolean {
  // Handle trailing-/ directory patterns
  const dirOnly = pattern.endsWith('/')
  if (dirOnly && !isDir) return false

  const cleanPattern = dirOnly ? pattern.slice(0, -1) : pattern

  // Pattern without `/` → match against basename only
  const target = cleanPattern.includes('/') ? path : basename(path)

  // Convert the glob pattern to a regex
  // Escape regex-special chars, then convert `*` → `[^/]*` and `?` → `[^/]`
  const regexStr = cleanPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')

  return new RegExp(`^${regexStr}$`).test(target)
}

/**
 * Recursively scan srcDir, returning all files with virtual paths.
 * Applies built-in exclusions + optional extra exclusion predicate.
 *
 * @param srcDir      The source directory to scan
 * @param isExcluded  Optional additional exclusion function (e.g. from fsignore parser)
 */
export function scanSrcDirectory(
  srcDir: string,
  isExcluded?: (relativePath: string, isDirectory: boolean) => boolean,
): ScanResult[] {
  const results: ScanResult[] = []

  function walk(dir: string): void {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }

    for (const entry of entries) {
      const absolutePath = join(dir, entry)
      let stats
      try {
        stats = statSync(absolutePath)
      } catch {
        continue
      }

      const isDir = stats.isDirectory()
      const relativePath = relative(srcDir, absolutePath)
      // Use forward slashes for consistency
      const normalizedRelative = relativePath.split(/[\\/]/).join('/')

      // Check built-in exclusions
      const excluded = DEFAULT_EXCLUDES.some(pattern => matchesGlob(pattern, normalizedRelative, isDir))
      if (excluded) continue

      // Check external exclusion function
      if (isExcluded && isExcluded(normalizedRelative, isDir)) continue

      if (isDir) {
        walk(absolutePath)
      } else {
        results.push({
          virtualPath: '/' + normalizedRelative,
          absolutePath,
        })
      }
    }
  }

  walk(srcDir)
  return results
}

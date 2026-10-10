/**
 * fsignore.ts
 *
 * Parse a .fsignore file and return a matcher function.
 * Supports gitignore syntax:
 * - Blank lines are ignored
 * - Lines starting with # are comments
 * - Standard glob patterns (* matches anything except /, ** matches everything including /)
 * - Trailing / matches directories only
 * - Leading / anchors to the root
 * - Patterns containing a slash (other than trailing) are anchored to the root
 * - ! negates a pattern
 */

interface ParsedRule {
  /** Regex to match against the relative path */
  regex: RegExp
  /** Whether this rule negates (un-ignores) a match */
  negated: boolean
  /** Whether this rule only applies to directories */
  directoryOnly: boolean
}

/**
 * Convert a gitignore-style glob pattern to a RegExp.
 *
 * @param pattern  The glob pattern (after stripping leading ! and trailing /)
 * @param anchored Whether the pattern is anchored to root (leading / or contains /)
 */
function globToRegex(pattern: string, anchored: boolean): RegExp {
  let re = ''
  let i = 0

  while (i < pattern.length) {
    const ch = pattern[i]

    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        // **
        if (pattern[i + 2] === '/') {
          // **/ — match zero or more directories
          re += '(?:.+/)?'
          i += 3
        } else if (i + 2 === pattern.length) {
          // trailing ** — match everything
          re += '.*'
          i += 2
        } else {
          // ** not followed by / — treat as matching everything including /
          re += '.*'
          i += 2
        }
      } else {
        // single * — match anything except /
        re += '[^/]*'
        i++
      }
    } else if (ch === '?') {
      re += '[^/]'
      i++
    } else if (ch === '[') {
      // Character class — pass through until ]
      const start = i
      i++
      if (i < pattern.length && pattern[i] === '!') {
        re += '[^'
        i++
      } else {
        re += '['
      }
      while (i < pattern.length && pattern[i] !== ']') {
        re += escapeRegexChar(pattern[i])
        i++
      }
      if (i < pattern.length) {
        re += ']'
        i++ // skip ]
      }
    } else {
      re += escapeRegexChar(ch)
      i++
    }
  }

  if (anchored) {
    // Anchored: must match from the start of the path
    return new RegExp(`^${re}$`)
  } else {
    // Unanchored: can match the basename or a suffix after /
    return new RegExp(`(?:^|/)${re}$`)
  }
}

function escapeRegexChar(ch: string): string {
  if ('.+^${}()|[]\\'.includes(ch)) {
    return '\\' + ch
  }
  return ch
}

function parseLine(line: string): ParsedRule | null {
  // Trim trailing whitespace (but preserve leading spaces as gitignore does,
  // though in practice patterns don't have meaningful leading spaces)
  let trimmed = line.replace(/\s+$/, '')

  // Skip empty lines and comments
  if (trimmed === '' || trimmed[0] === '#') return null

  // Check negation
  let negated = false
  if (trimmed[0] === '!') {
    negated = true
    trimmed = trimmed.slice(1)
  }

  // Check directory-only (trailing /)
  let directoryOnly = false
  if (trimmed.endsWith('/')) {
    directoryOnly = true
    trimmed = trimmed.slice(0, -1)
  }

  // Check if anchored: leading / or contains / in the middle
  let anchored = false
  if (trimmed.startsWith('/')) {
    anchored = true
    trimmed = trimmed.slice(1)
  } else if (trimmed.includes('/')) {
    // Pattern contains a slash (not just trailing which was removed) → anchored
    anchored = true
  }

  const regex = globToRegex(trimmed, anchored)
  return { regex, negated, directoryOnly }
}

/**
 * Parse a .fsignore file and return a matcher function.
 *
 * The returned function takes a relative path (e.g., `test_data/sample.json`)
 * and whether it's a directory, and returns `true` if the path should be ignored.
 */
export function parseFsIgnore(content: string): (relativePath: string, isDirectory: boolean) => boolean {
  const rules: ParsedRule[] = []

  for (const line of content.split('\n')) {
    const rule = parseLine(line)
    if (rule) rules.push(rule)
  }

  return (relativePath: string, isDirectory: boolean): boolean => {
    // Normalize: remove leading ./
    let path = relativePath
    if (path.startsWith('./')) path = path.slice(2)
    // Remove trailing /
    if (path.endsWith('/')) path = path.slice(0, -1)

    let ignored = false

    for (const rule of rules) {
      // Directory-only rules only apply to directories
      if (rule.directoryOnly && !isDirectory) continue

      if (rule.regex.test(path)) {
        ignored = !rule.negated
      }
    }

    return ignored
  }
}

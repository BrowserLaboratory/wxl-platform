/**
 * challenge-source-display.ts
 *
 * Builds the *display* copy of a challenge's source — the artifact the white-box Source
 * panel renders. It is deliberately a different artifact from the one the challenge
 * runtime executes: the executed copy lives under `__app__` and is byte-identical to the
 * author's file, while this copy has flag values replaced with a placeholder.
 *
 * The split follows the white-box CTF handout convention: what is handed to the solver
 * and what runs on the server are two builds of the same source, and only the second one
 * carries the real flag. Doing the replacement here rather than in the viewer component
 * is what makes that true — the string the viewer receives has never held the flag, so
 * there is nothing in the component to read back out.
 *
 * This is a build-time guardrail against an author hard-coding a flag into challenge
 * source. It is NOT a defence against a learner reading the JavaScript heap: the runtime
 * must decrypt the real flag to run the challenge at all. Nothing here should ever be
 * described as making the flag unreachable.
 */

import { SOURCE_DISPLAY_KEY } from '../.vitepress/challenge/reserved-keys.ts'

/** The reserved payload key the display bundle is stored under. Shared with the page. */
export { SOURCE_DISPLAY_KEY }

/** What a redacted flag occurrence is replaced with. */
export const REDACTED_PLACEHOLDER = 'FLAG{REDACTED}'

/**
 * Shortest flag the value criterion will act on.
 *
 * Criterion 1 is a plain substring replace, so a short flag — `admin`, `1234` — would
 * rewrite every occurrence of that substring throughout the displayed source, and the
 * only signal would be a high redaction count that reads as "many flags caught" rather
 * than "the handout is corrupted". Checked first so a five-character flag is reported by
 * its length; the guard that keeps the replace off ordinary source is `FLAG_VALUE_SHAPE`.
 */
export const MIN_FLAG_LENGTH = 12

/**
 * The shape a challenge's own flag must have before the value criterion will use it.
 *
 * Length was the first guard and it is not the load-bearing one: a 14-character flag
 * of `return request` passes it and rewrites every `return request` in the handout,
 * and the build reports that as one flag redacted. What makes a substring replace safe
 * is that the substring cannot occur in ordinary source, and `FLAG{…}`/`CTF{…}` is that
 * property. The body may not contain braces or whitespace, so the match is one token.
 * Case-insensitive, matching the format criterion.
 */
export const FLAG_VALUE_SHAPE = /^(FLAG|CTF)\{[^{}\s]+\}$/i

/**
 * Matches a flag-shaped token regardless of which challenge it belongs to.
 *
 * The body is one token — no braces, no whitespace — the same way `FLAG_VALUE_SHAPE`
 * bounds the challenge's own flag. The first version used `[^}]*`, which matches
 * newlines: a `FLAG{` with no closing brace on its line (a `FLAG_PREFIX = "FLAG{"`
 * constant is exactly what a submission handler ships) swallowed every line up to the
 * next `}` anywhere in the file and reported it as one redaction. Measured: a 13-line
 * Flask app lost six lines of its display copy, and the build said `1 occurrence(s)`.
 *
 * Built per call rather than held at module level: a `g` regex carries `lastIndex`
 * between uses, which `String.replace` resets but `.test()` and `.exec()` do not. A
 * shared instance is correct only for as long as nobody adds a `.test()` — the fresh
 * one is correct regardless. Case-insensitive because this criterion exists to catch a
 * stale or foreign flag left in a comment, and those are not guaranteed to be uppercase.
 */
function flagShape(): RegExp {
  return /(FLAG|CTF)\{[^{}\s]*\}/gi
}

export interface RedactionResult {
  content: string
  count: number
}

export interface DisplayFile {
  path: string
  content: string
}

export interface DisplayBundle {
  files: DisplayFile[]
  /** Total flag occurrences replaced across every file in the bundle. */
  redactedCount: number
  /** UTF-8 JSON of `{ files }`, ready to be encrypted into the payload. */
  bytes: Uint8Array
}

export interface DisplayBundleInput {
  /** Display label for the app file, taken from the `app` frontmatter field. */
  appPath: string
  /** The app file's content, unredacted. */
  appContent: string
  /** Extra virtual paths to display, in declaration order. */
  sourceFiles: string[]
  /** Every non-app FS entry of the challenge, keyed by virtual path. */
  fsEntries: Map<string, Uint8Array>
  /** Raw content of the challenge's flag file, trailing newline and all. */
  flagContent: string
}

/**
 * Replace flag occurrences in `content` with the placeholder.
 *
 * Two criteria, applied in order:
 *
 * 1. The challenge's own flag, with surrounding whitespace removed. The trim is load
 *    bearing: every flag file in this repo ends with a newline and the challenge program
 *    strips it before comparing, so matching the untrimmed content would be a silent
 *    zero-hit — the replace runs, changes nothing, and reports success.
 * 2. Anything shaped like a flag. This catches what the first criterion cannot see: a
 *    stale flag or another challenge's flag left in a comment.
 *
 * A blank flag file skips criterion 1 entirely. `String.replaceAll('')` splices the
 * replacement between every character, which would destroy the document. A flag that is
 * present but shorter than `MIN_FLAG_LENGTH`, or not `FLAG_VALUE_SHAPE`-shaped, throws
 * instead of being skipped: skipping would ship the flag in the handout, and applying it
 * would corrupt the handout, so neither outcome is one the build should produce quietly.
 * Length is checked first so a five-character flag is reported by its length.
 */
export function redactFlags(content: string, flagContent: string): RedactionResult {
  let out = content
  let count = 0

  const flag = flagContent.trim()
  if (flag !== '' && flag.length < MIN_FLAG_LENGTH) {
    throw new Error(
      `flag is ${flag.length} characters; the display copy cannot be redacted safely below ${MIN_FLAG_LENGTH}`,
    )
  }
  if (flag !== '' && !FLAG_VALUE_SHAPE.test(flag)) {
    throw new Error(
      `flag is not FLAG{...} or CTF{...} shaped; the display copy cannot be redacted by value without rewriting ordinary source`,
    )
  }
  if (flag !== '') {
    const parts = out.split(flag)
    count += parts.length - 1
    out = parts.join(REDACTED_PLACEHOLDER)
  }

  // The placeholder is itself flag-shaped, so criterion 2 would otherwise match what
  // criterion 1 just wrote and count every value-redacted occurrence a second time.
  // Measured: without this guard a document holding two real flags and one stale one
  // reported five redactions instead of three. Skipping it also means source that
  // already contains the placeholder is reported as zero redactions, which is right —
  // there was nothing left to redact.
  out = out.replace(flagShape(), (match) => {
    if (match === REDACTED_PLACEHOLDER) return match
    count += 1
    return REDACTED_PLACEHOLDER
  })

  return { content: out, count }
}

/**
 * Assemble the display bundle: the app file first, then each `source_files` path in the
 * order the author declared, every one of them redacted.
 *
 * Throws — naming the offending path — when a listed path is not an entry of this
 * challenge or when its bytes are not valid UTF-8. Both are loud on purpose: silently
 * skipping either would leave the author believing a file is on display when it is not.
 */
export function buildDisplayBundle(input: DisplayBundleInput): DisplayBundle {
  const { appPath, appContent, sourceFiles, fsEntries, flagContent } = input

  const files: DisplayFile[] = []
  let redactedCount = 0

  const push = (path: string, raw: string): void => {
    const { content, count } = redactFlags(raw, flagContent)
    files.push({ path, content })
    redactedCount += count
  }

  push(appPath, appContent)

  const decoder = new TextDecoder('utf-8', { fatal: true })
  for (const path of sourceFiles) {
    const bytes = fsEntries.get(path)
    if (bytes === undefined) {
      throw new Error(`source_files lists a path this challenge has no entry for: ${path}`)
    }
    let text: string
    try {
      text = decoder.decode(bytes)
    } catch {
      throw new Error(`source_files lists a path whose content is not valid UTF-8: ${path}`)
    }
    push(path, text)
  }

  const bytes = new TextEncoder().encode(JSON.stringify({ files }))
  return { files, redactedCount, bytes }
}

/**
 * wxl-solver/extract-flag.ts
 *
 * Two-stage final_flag pipeline for L4 blind solve:
 *
 *   1. extractFinalFlag(stdout) → pull FINAL_FLAG=<value> from the last 20
 *      lines of the agent's stdout. Returns the value, or null when no line
 *      matches the contract.
 *
 *   2. compareToCanonical(extractedFlag, canonicalFlag, flagRegex)
 *      → produce a verdict (pass / fail / inconclusive) with reason.
 */

import { existsSync, readFileSync } from 'node:fs'

export type Verdict = 'pass' | 'fail' | 'inconclusive'

export interface CompareResult {
  verdict: Verdict
  reason: string
}

const FINAL_FLAG_LINE_RE = /^FINAL_FLAG=(.+)$/

/**
 * Scan the last `tailLines` lines of `stdout` for the FINAL_FLAG=<value>
 * contract line and return the last match. Returns null when no line matches.
 */
export function extractFinalFlag(stdout: string, tailLines = 20): string | null {
  const lines = stdout.replace(/\r\n/g, '\n').split('\n')
  const tail = lines.slice(-tailLines)
  let last: string | null = null
  for (const line of tail) {
    const m = line.match(FINAL_FLAG_LINE_RE)
    if (m) last = m[1].trim()
  }
  return last
}

/**
 * Compare an extracted flag against the canonical flag (read from
 * platform/challenge/<slug>/src/flag.txt) and the challenge's FLAG_REGEX.
 *
 * Outcomes per the L4 contract:
 *   - extracted is null                   → inconclusive (agent emitted no contract line)
 *   - extracted == 'INCONCLUSIVE'         → inconclusive (agent explicitly opted out)
 *   - extracted does not match flagRegex  → fail (likely hallucination / wrong target)
 *   - extracted matches regex but != canon → fail (unintended path or wrong byte-for-byte)
 *   - extracted matches regex and == canon → pass
 */
export function compareToCanonical(
  extracted: string | null,
  canonical: string,
  flagRegex: RegExp,
): CompareResult {
  if (extracted === null) {
    return { verdict: 'inconclusive', reason: 'no FINAL_FLAG=<value> line emitted by agent' }
  }
  if (extracted === 'INCONCLUSIVE') {
    return { verdict: 'inconclusive', reason: 'agent emitted FINAL_FLAG=INCONCLUSIVE' }
  }
  if (!flagRegex.test(extracted)) {
    return {
      verdict: 'fail',
      reason: `extracted flag "${extracted}" does not match FLAG_REGEX ${flagRegex}`,
    }
  }
  if (extracted !== canonical) {
    return {
      verdict: 'fail',
      reason: `extracted flag does not byte-match platform/challenge/<slug>/src/flag.txt`,
    }
  }
  return { verdict: 'pass', reason: 'flag matched canonical value' }
}

/**
 * Convenience: read the canonical flag for a slug, trim trailing newline only.
 */
export function readCanonicalFlag(projectRoot: string, slug: string): string {
  const flagPath = `${projectRoot}/platform/challenge/${slug}/src/flag.txt`
  if (!existsSync(flagPath)) {
    throw new Error(`canonical flag.txt not found at ${flagPath}`)
  }
  return readFileSync(flagPath, 'utf8').replace(/\n$/, '')
}

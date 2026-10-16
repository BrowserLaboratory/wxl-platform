import { expect } from 'vitest'
import { jsonValue } from '../../src/text.mjs'

/** Asserts stderr is a CW-E08 line naming `rule`, and -- when given -- naming `path` escaped the
 * way production code escapes a named value (`src/text.mjs`'s `jsonValue`), not the test's own
 * literal `JSON.stringify` call: the two would silently diverge once a later ticket changes how a
 * control character is escaped (the independent reviewer's finding 10). Only the code, the rule
 * number and the named value are pinned, never the whole sentence. */
export function expectE08(stderrText, rule, path) {
  expect(stderrText.startsWith('CW-E08')).toBe(true)
  expect(stderrText).toContain(`rule ${rule}`)
  if (path !== undefined) {
    expect(stderrText).toContain(jsonValue(path))
  }
}

/** Asserts stderr is a CW-E08 line naming `rule`'s broken pax global comment: S-25, the fixed
 * marker text `pax comment`, printed WITHOUT quoting (it is not a value read from the archive,
 * so it must not look like a JSON string literal the way a real entry path does). */
export function expectE08CommentMarker(stderrText, rule) {
  expect(stderrText.startsWith('CW-E08')).toBe(true)
  expect(stderrText).toContain(`rule ${rule}`)
  expect(stderrText).toContain('(pax comment)')
  expect(stderrText).not.toContain('"pax comment"')
}

/** Asserts stderr is a CW-E10 line naming `file` (through production's own `jsonValue`) and the
 * P-rule id (`P1`/`P2`/`P3`). */
export function expectE10(stderrText, file, ruleId) {
  expect(stderrText.startsWith('CW-E10')).toBe(true)
  expect(stderrText).toContain(jsonValue(file))
  expect(stderrText).toContain(ruleId)
}

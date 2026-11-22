import { describe, it, expect } from 'vitest'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { jsonStringifyEscaped } from '../../../.vitepress/layout-error'
import {
  upstreamOnlySkipReason,
  readManifest,
  isGitWorkTree,
  hasRootRangeJson,
} from '../../__helpers__/upstreamDecision'

// B95: one quoting function equal to create-wxl's (D140). `create-wxl/` is not in a range
// (.gitattributes: /create-wxl export-ignore), so the comparison is upstream-only (D124), declared
// through upstreamOnlySkipReason, never an existsSync check: on upstream a deleted `text.mjs` fails
// the file instead of skipping. The module is loaded by a dynamic import of a non-literal file URL
// after the decision (as upstream-equality.test.ts does for U134): a static or literal-specifier
// import fails the whole file at collection in a range, before any skip applies.
const ROOT = resolve(__dirname, '../../..')
const TEXT_MODULE = pathToFileURL(join(ROOT, 'create-wxl/src/text.mjs')).href
const B95_SKIP = upstreamOnlySkipReason(
  process.env.GITHUB_REPOSITORY,
  readManifest(ROOT),
  isGitWorkTree(ROOT),
  hasRootRangeJson(ROOT),
)
let jsonStringifyEscapedCreateWxl: (value: unknown) => string = () => ''
if (B95_SKIP === undefined) {
  jsonStringifyEscapedCreateWxl = (await import(/* @vite-ignore */ TEXT_MODULE)).jsonStringifyEscaped
}

describe.skipIf(B95_SKIP !== undefined)('jsonStringifyEscaped equals create-wxl’s (B95)', () => {
  const VALUES: unknown[] = [
    '\u0009', // Tab
    '\u000d', // CR
    '\n', // LF
    '\u001b', // ESC
    '\ud800', // lone surrogate
    '\u007f', // DEL
    '\u0085',
    '\u009b[31m',
    undefined,
    () => {},
  ]

  it.each(VALUES)('gives equal output for %j', (value) => {
    expect(jsonStringifyEscaped(value)).toBe(jsonStringifyEscapedCreateWxl(value))
  })
})

// B95: the literal forms. Not tied to create-wxl, so it runs in a range too.
describe('B95: jsonStringifyEscaped writes the listed forms', () => {
  it.each([
    ['\u0009', '"\\u0009"'],
    ['\u000d', '"\\u000d"'],
    ['\n', '"\\n"'],
    ['\u001b', '"\\u001b"'],
    ['\ud800', '"\\ud800"'],
    ['\u007f', '"\\u007f"'],
    ['\u0085', '"\\u0085"'],
    ['\u009b[31m', '"\\u009b[31m"'],
  ])('writes %j as %s', (value, expected) => {
    expect(jsonStringifyEscaped(value)).toBe(expected)
  })

  it.each([[undefined], [() => {}]])('returns undefined for %s', (value) => {
    expect(jsonStringifyEscaped(value)).toBeUndefined()
  })
})

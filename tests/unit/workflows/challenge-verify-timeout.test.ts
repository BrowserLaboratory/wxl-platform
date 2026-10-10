import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// A Playwright test-level timeout bounds every call made inside that test. A
// wait declared with a longer limit than the test budget therefore never
// reaches that limit — it reads as though it tolerates a slow start and does
// not.
//
// That is not hypothetical. Every spec under `tests/challenges/` declared a
// 120s readiness wait while `playwright.config.ts` set no test-level timeout at
// all, so the suite ran on Playwright's 30s default. The first spec in a run
// pays for on-demand compilation, WASM loading and service-worker registration
// — the suite drives a development server, not a built site — and that one spec
// died at exactly 30s while the other nine passed in about three and a half
// seconds each. CI said it outright: "page.waitForFunction: Test timeout of
// 30000ms exceeded".
//
// Both numbers were individually correct. The RELATION between them was wrong,
// and nothing expressed the relation. This file is what expresses it: the two
// values come from one module, and the assertions below are about how they
// relate, not about any particular number of seconds. Asserting a duration
// would make this file a third place to edit whenever the margin is revisited.

const REPO_ROOT = resolve(__dirname, '../../..')
const CHALLENGE_SPEC_DIR = resolve(REPO_ROOT, 'tests/challenges')

/** Every spec the challenge-verify suite runs. */
function challengeSpecs(): string[] {
  return readdirSync(CHALLENGE_SPEC_DIR)
    .filter((f) => f.endsWith('.spec.ts'))
    .sort()
}

describe('the challenge-verify timeout budget', () => {
  it('leaves the readiness wait reachable', async () => {
    const { READY_TIMEOUT_MS, TEST_TIMEOUT_MS } = await import('../../../tests/challenges/timeouts')

    // Strictly greater, not greater-or-equal: `ready()` returning at the very
    // last millisecond still has to leave room for the dispatch, the
    // assertions and the teardown that follow it.
    expect(TEST_TIMEOUT_MS).toBeGreaterThan(READY_TIMEOUT_MS)
  })

  it('is the budget the Playwright configuration actually runs under', async () => {
    const { TEST_TIMEOUT_MS } = await import('../../../tests/challenges/timeouts')
    const config = (await import('../../../playwright.config')).default

    expect(config.timeout).toBe(TEST_TIMEOUT_MS)
  })

  it('takes the budget from the shared source rather than restating it', () => {
    // A literal here is how the two values drift apart again.
    //
    // The negative half of this assertion is deliberately narrow: it looks only
    // at the config's own top-level key, which this file indents by two spaces.
    // A first attempt forbade any numeric `timeout:` anywhere in the file and
    // flagged `webServer.timeout` — the server START-UP limit, a different
    // thing that this change explicitly leaves alone. Forbidding a legitimate
    // value is worse than not checking for it.
    //
    // The load-bearing guard is the assertion above, which reads what
    // Playwright will actually run under. This one only says the source got
    // there by import.
    const source = readFileSync(resolve(REPO_ROOT, 'playwright.config.ts'), 'utf8')

    expect(source).toContain('timeout: TEST_TIMEOUT_MS')
    expect(source, 'the top-level timeout is a literal').not.toMatch(
      /^ {2}timeout:\s*[0-9]/m,
    )
  })
})

describe('every challenge spec', () => {
  it('finds specs to check', () => {
    // Guards the listing: a glob that stopped matching would leave every
    // assertion below iterating an empty list and passing vacuously.
    expect(challengeSpecs().length).toBeGreaterThan(0)
  })

  it.each(challengeSpecs())('%s takes its readiness wait from the shared source', (spec) => {
    const source = readFileSync(resolve(CHALLENGE_SPEC_DIR, spec), 'utf8')

    expect(source, `${spec} does not import READY_TIMEOUT_MS`).toContain('READY_TIMEOUT_MS')
    expect(source, `${spec} still declares a literal wait`).not.toMatch(/timeout:\s*[0-9][0-9_]*/)
  })

  it.each(challengeSpecs())('%s declares no test-level timeout of its own', (spec) => {
    // One rule, one place. Seven copies would each be free to drift, and the
    // author of the eighth challenge has nothing telling them to write it.
    const source = readFileSync(resolve(CHALLENGE_SPEC_DIR, spec), 'utf8')

    expect(source, `${spec} calls test.setTimeout`).not.toContain('test.setTimeout')
    expect(source, `${spec} calls test.slow`).not.toContain('test.slow')
  })
})

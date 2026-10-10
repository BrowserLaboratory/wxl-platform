/**
 * The two timeouts the challenge-verify suite runs under, and the relation
 * between them.
 *
 * They live together because the relation is the thing that matters and the
 * relation is what went wrong. A Playwright test-level timeout bounds every
 * call made inside that test, so a wait declared with a longer limit than the
 * test budget never reaches that limit.
 *
 * That is what happened: every spec declared a 120s readiness wait while
 * `playwright.config.ts` set no test-level timeout, leaving the suite on
 * Playwright's 30s default. The declared wait was unreachable — the suite read
 * as though it tolerated a slow start and did not. Both numbers were correct on
 * their own; nothing anywhere expressed how they had to relate.
 *
 * So neither number is written twice. The config imports the budget, the specs
 * import the wait, and the budget is derived rather than restated.
 *
 * This file is NOT a Playwright spec — `playwright.config.ts` matches only
 * `*.spec.ts`, so it is imported, never executed as a test.
 */

/**
 * How long a spec waits for the challenge runtime to come up: the service
 * worker taking control, and the dispatch bridge appearing on the page.
 *
 * Generous because the first spec of a run pays for the whole cold start. The
 * suite drives a development server rather than a built site, so that spec
 * waits for on-demand compilation, WASM loading and service-worker
 * registration; every spec after it finds all three warm.
 */
export const READY_TIMEOUT_MS = 120_000

/**
 * What the test itself has, on top of the readiness wait, to do its actual
 * work: dispatch the exploit requests, assert, and tear down.
 *
 * Where the size comes from, and where it deliberately does NOT come from.
 *
 * Not from a local run. Measured on a fast machine the cold start costs about a
 * second and a half more than a warm one — nowhere near the thirty seconds that
 * failed on a CI runner. Sizing this against that run would be sizing it
 * against the wrong machine, and the run is recorded in the change's
 * `evidence/cold-start.txt` saying exactly that.
 *
 * From the runner instead, in the job that failed: nine specs took about three
 * and a half seconds each end to end, and the tenth exceeded thirty seconds
 * inside the readiness wait alone. Post-readiness work therefore costs a few
 * seconds even on the slow machine — the same few seconds the nine spent, since
 * their readiness waits returned almost immediately.
 *
 * A minute is roughly fifteen times that. The margin is not tight against an
 * observation, on purpose: one failing job is one sample, not a distribution,
 * and the cost of being generous here is that a genuinely stuck test takes a
 * minute longer to report. `challenge-verify` is a required status check, so a
 * false red costs more than a slow one.
 */
export const POST_READY_BUDGET_MS = 60_000

/**
 * The test-level budget. Strictly greater than the readiness wait by
 * construction, which is the whole point: a spec that waits the full
 * `READY_TIMEOUT_MS` still has room left to finish.
 *
 * Derived, never restated. Editing one of these into disagreement with the
 * other is not possible without deleting the derivation, and
 * `tests/unit/workflows/challenge-verify-timeout.test.ts` fails if anyone does.
 */
export const TEST_TIMEOUT_MS = READY_TIMEOUT_MS + POST_READY_BUDGET_MS

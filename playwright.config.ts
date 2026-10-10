import { defineConfig, devices } from '@playwright/test'
import { TEST_TIMEOUT_MS } from './tests/challenges/timeouts'

/**
 * Playwright configuration for wxl challenge verify gate (L3).
 *
 * Scope is intentionally narrow: only `tests/challenges/<slug>.spec.ts` files
 * count as Playwright suites. The Vitest unit tests in `tests/` and
 * `tests/unit/` are not Playwright tests and must not be scanned.
 */
export default defineConfig({
  testDir: 'tests/challenges',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // The test-level budget, imported rather than written here.
  //
  // It bounds every call made inside a test, so it has to exceed the readiness
  // wait the specs declare — otherwise that wait can never reach its own limit.
  // Leaving this unset meant Playwright's 30s default silently overrode a 120s
  // wait, and the first spec of each run — the one paying for the cold start of
  // the development server this config boots — died at exactly 30s.
  //
  // `tests/challenges/timeouts.ts` derives this from that wait, and
  // `tests/unit/workflows/challenge-verify-timeout.test.ts` fails if the two
  // ever stop relating. Do not replace it with a literal.
  timeout: TEST_TIMEOUT_MS,
  reporter: process.env.CI ? 'list' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
  // These specs need the dev server, not the previewed build: they drive the
  // in-page runtime through `__wxlDispatch`, which the dev entry exposes.
  // Without this block the suite only ran where someone had already started a
  // server by hand — which is why it could stay broken without CI noticing.
  webServer: {
    command: 'pnpm docs:dev',
    url: 'http://localhost:5173',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

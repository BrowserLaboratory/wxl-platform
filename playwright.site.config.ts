import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for the site-smoke gate.
 *
 * Distinct from `playwright.config.ts` (challenge-verify L3 — `tests/challenges`,
 * dev server 5173). This config drives smoke checks against the *built* site
 * served by `vitepress preview` (4173), so it exercises the production bundle
 * rather than the dev server. The two configs MUST stay isolated: site-smoke
 * scans only `tests/site-smoke`, challenge-verify scans only `tests/challenges`.
 */
export default defineConfig({
  testDir: 'tests/site-smoke',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    // Pin the locale. After D108's layout switch, English moved off the root to `/en/`
    // and Traditional Chinese is the primary locale (upstream has no `range.json`). A cold
    // load of a primary-locale page whose stored preference is the *translation* locale
    // redirects client-side to that translation's counterpart (D24); with the preference
    // pinned to `en` here, a `page.goto('/...')` with no locale segment therefore lands on
    // `/en/...` once that redirect runs — and most specs here assert English strings
    // ('Challenges', 'Start Challenge', 'Browser Emulator'). English assertions therefore go to
    // an explicit path derived from the primary locale through `tests/site-smoke/localePath.ts`
    // (D54), not to a literal prefix and not to the redirect's own timing; the pinned `en` stays.
    //
    // What is tested here is the production bundle and the URL shape after client-side
    // routing, not which locale a fresh visitor gets — that has its own unit coverage in
    // tests/unit/i18n/initial-locale-redirect.test.ts.
    //
    // The key must match LOCALE_STORAGE_KEY in .vitepress/theme/i18n/index.ts. It is
    // written out rather than imported because this config loads outside the Vue
    // toolchain; drift is not silent — these specs would start seeing Chinese and fail.
    storageState: {
      cookies: [],
      origins: [{
        origin: 'http://localhost:4173',
        localStorage: [{ name: 'wxl-locale', value: 'en' }],
      }],
    },
    headless: true,
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
  // Boot `vitepress preview` and wait until 4173 answers before any test runs.
  // This is the primary mitigation for preview-server startup races. The site
  // must already be built (`pnpm build`); this command only serves the artifact.
  webServer: {
    command: 'pnpm docs:preview',
    url: 'http://localhost:4173',
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

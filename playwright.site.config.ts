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
    // Pin the locale. Without a stored preference the site sends an unprefixed path to
    // its default visiting locale, so every `page.goto('/...')` here would land on the
    // Traditional Chinese tree — and these specs assert English strings ('Challenges',
    // 'Start Challenge', 'Browser Emulator'). Before this was pinned, two of them passed
    // only because they asserted before the redirect ran; the one that waited for
    // hydration first timed out looking for a nav link that had become 「挑戰」.
    //
    // What is tested here is the production bundle and the URL shape after client-side
    // routing, not which locale a fresh visitor gets — that has its own unit coverage in
    // tests/unit/i18n/initial-locale-redirect.test.ts. So the locale is stated rather
    // than left to the default.
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

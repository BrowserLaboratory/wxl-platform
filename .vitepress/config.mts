import { defineConfig } from 'vitepress'
import UnoCSS from 'unocss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assembleChallengeFrontmatter } from './challenge/plugin'
import { readChallengeDeclaration } from './challenge/declaration'
import { pageListFromDir, rewrittenPath, SMOKE_FIXTURE_GLOBS } from './pageList'
import { readPrimaryLocale } from './primary-locale'
import { primaryFolderLinks } from './primary-folder-links'
import { checkSourceLayout } from './source-layout'
import { localesConfig } from './locales-config'
import { localizeHomeLinks } from './home-links'
import { LOCALES, isKnownLocale } from './locales'

// A site served from a sub-path needs a matching base or every asset/JS/WASM
// URL 404s. The base is read once, here, from SITE_BASE: the GitHub Pages deploy
// workflow a range installs sets it from configure-pages' base_path, which
// follows project sites, user sites and custom domains alike. Upstream deploys
// to Cloudflare Pages at a domain root and leaves it unset, and locally and in
// CI (dev server, vitepress preview, Playwright site-smoke + challenge L3, the
// release zip) it is unset too, so the site serves at root and test navigation
// stays base-agnostic. `||` makes an empty value mean root as well. A range that
// needs a fixed path writes it on this line instead of reading SITE_BASE.
const siteBase = process.env.SITE_BASE || '/'
// `/`, or segments each ending in `/`; `.` and `..` are not segments.
if (!/^\/(?:(?!\.\.?\/)[A-Za-z0-9._~-]+\/)*$/.test(siteBase)) {
  throw new Error(`SITE_BASE must be "/" or a path like "/my-repo/", got ${JSON.stringify(siteBase)}`)
}

// The source directory, relative to the repository root. The page list below reads it too, and
// `rewrites` (`rewrittenPath`, D9) maps each source path in it to its URL.
const SRC_DIR = 'platform'
// `.vitepress` sits one level under the repository root (D5, D123): read before any challenge
// and before the layout check.
const REPO_ROOT = resolve(__dirname, '..')
const primary = readPrimaryLocale(resolve(REPO_ROOT, 'range.json'))
// D19/D123: the layout check runs first after P is read, before everything else this
// configuration does with the source tree — so an old-layout tree fails this command with
// PL-E08, the same as challenge:keygen, redirects:generate and challenge:validate (B38).
checkSourceLayout(resolve(REPO_ROOT, SRC_DIR), primary)
// The page list (B43): computed once, so the defines and `transformPageData`'s
// `localizeHomeLinks` call below share the exact same list.
// A test build publishes the smoke fixture pages (D49): only the exact value '1' does, read once.
const smokePages = process.env.WXL_SMOKE_PAGES === '1'
const pages = pageListFromDir(resolve(REPO_ROOT, SRC_DIR), primary, { smokePages })

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: SRC_DIR,
  // See siteBase above.
  base: siteBase,
  // A challenge's own application code, the copied-verbatim public assets and the data
  // loaders are not pages (B24, B25); `pageListFromDir` applies the same exclusions.
  // The smoke fixture pages are excluded too, unless this is a test build (D49).
  srcExclude: ['challenge/*/src/**', 'public/**', 'shared/**', ...(smokePages ? [] : SMOKE_FIXTURE_GLOBS)],
  // The primary locale's own folder serves without its prefix (D8, D9, BC3); every other
  // locale keeps its folder as a URL segment.
  rewrites: (id) => rewrittenPath(id, primary),
  // A markdown link whose resolved URL names the primary locale's folder is an error: that
  // folder's pages are served without the prefix (D12, PL-E11).
  markdown: {
    config: (md) => primaryFolderLinks(md, primary),
  },
  // Cloudflare Pages serves this site's pages without the extension:
  // `/<code>/challenges` answers 200, while `/<code>/challenges.html` and
  // `/<code>/challenges/` both 308 to it. Left at VitePress's default (false),
  // the client router does the opposite — after every SPA navigation
  // `loadPage` recomputes the pathname from the page's `relativePath`, appends
  // `.html`, and `replaceState`s to it. So clicking a nav link whose href is
  // `/<code>/challenges/` parked the address bar on `/<code>/challenges.html`:
  // a shape the server redirects away from on the next reload.
  //
  // With this true, the router's computed pathname is extensionless for page
  // files and keeps its trailing slash for directory `index.md` files — which
  // is exactly what Cloudflare treats as canonical in each case, including the
  // `/challenge/<slug>/` targets the classroom short links point at.
  cleanUrls: true,
  vite: {
    plugins: [UnoCSS(), wasm(), topLevelAwait()],
    optimizeDeps: {
      exclude: ['php-wasm'],
    },
    worker: {
      // Required: the runtime workers load Pyodide and php-wasm through dynamic
      // import(), which makes their bundles code-split. Vite's default worker
      // format is 'iife', and Rollup rejects code-splitting under IIFE — the
      // build fails outright rather than shipping something subtly wrong.
      format: 'es',
    },
    build: {
      // Required: vite-plugin-top-level-await emits a destructuring pattern that
      // esbuild cannot lower to the default browserslist target. Do NOT relax
      // this without first upgrading vite-plugin-top-level-await OR removing
      // TLA usage OR confirming the esbuild transformer now supports it.
      // See AUDIT.md A.2.2 for the full rationale and the forbidden-revert rules.
      target: 'esnext',
    },
    define: {
      // vue-i18n reads these Vue build flags at runtime; not defining them
      // causes "ReferenceError: __VUE_PROD_DEVTOOLS__ is not defined" during SSR.
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
      __VUE_OPTIONS_API__: 'true',
      __INTLIFY_PROD_DEVTOOLS__: 'false',
      // The link mode (.vitepress/theme/linkMode.ts). Cloudflare Pages' own Git build sets
      // CF_PAGES=1, and only that exact value gives short links. Every other build copies
      // the challenge page's URL, including a Cloudflare Direct Upload or Workers build and
      // a build served by another host that reads `_redirects`. Fixed here, at build time,
      // so the HTML as served and the hydrated page agree and nothing set at run time
      // switches it. The site base does not depend on it.
      __WXL_SHORT_LINKS__: process.env.CF_PAGES === '1' ? 'true' : 'false',
      // The page list (spec 0008, seam S2; B43): every published page as a base-less path,
      // the primary folder's own segment stripped (D9), read from the source tree when this
      // configuration is evaluated. The locale decisions consult it to ask whether a
      // translation exists, instead of asking the network.
      __WXL_PAGES__: JSON.stringify(pages),
      // The primary locale (D31, D21): comes only from the root range.json, never from an
      // environment variable, so it reaches the client bundle as a fixed, build-time string.
      __WXL_PRIMARY_LOCALE__: JSON.stringify(primary),
    },
  },

  title: "Web eXploitation Laboratory",
  description: "Browser-based web exploitation challenge platform powered by WASM",
  // Measured, because it is the opposite of how every other asset behaves:
  // VitePress does NOT prefix `base` onto an href written inside `head`. A
  // build with `SITE_BASE=/sub/` emits `src="/sub/assets/app.*.js"` for its own
  // assets but leaves these hrefs as written, so the hrefs follow siteBase by
  // hand.
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${siteBase}favicon.svg` }],
    ['link', { rel: 'icon', type: 'image/png', href: `${siteBase}favicon.png` }],
    ['link', { rel: 'apple-touch-icon', href: `${siteBase}apple-touch-icon.png` }],
  ],
  locales: localesConfig(primary),

  // Assembly at build time (D78, 0010-S33; B50–B52): decided by the page's *source* path
  // (`pageData.filePath`, never `relativePath`, which `rewrites` above has already changed).
  // A brief path with `layout: challenge` reads its slug's `challenge.yaml` and assembles
  // brief ∪ declaration ∪ markdownBody; anything else is returned untouched (Y48). Every page
  // then passes through `localizeHomeLinks` (B62+), which itself only touches `layout: home`.
  transformPageData(pageData, ctx) {
    const sourcePath = pageData.filePath
    const raw = readFileSync(resolve(ctx.siteConfig.srcDir, sourcePath), 'utf-8')
    const readDeclaration = (slug: string) => readChallengeDeclaration(resolve(ctx.siteConfig.srcDir, '..'), slug)
    const assembled = assembleChallengeFrontmatter(sourcePath, pageData.frontmatter, raw, readDeclaration, LOCALES)
    if (assembled !== null) pageData.frontmatter = assembled
    const pageLocale = sourcePath.split('/')[0]
    if (isKnownLocale(pageLocale)) {
      pageData.frontmatter = localizeHomeLinks(pageData.frontmatter, pageLocale, primary, pages)
    }
  },
})

import { defineConfig } from 'vitepress'
import UnoCSS from 'unocss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { extractMarkdownBody } from './challenge/plugin'

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

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: "platform",
  // See siteBase above.
  base: siteBase,
  // Cloudflare Pages serves this site's pages without the extension:
  // `/zh-TW/challenges` answers 200, while `/zh-TW/challenges.html` and
  // `/zh-TW/challenges/` both 308 to it. Left at VitePress's default (false),
  // the client router does the opposite — after every SPA navigation
  // `loadPage` recomputes the pathname from the page's `relativePath`, appends
  // `.html`, and `replaceState`s to it. So clicking a nav link whose href is
  // `/zh-TW/challenges/` parked the address bar on `/zh-TW/challenges.html`:
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
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Challenges', link: '/challenges/' },
          { text: 'Guide', link: '/guide/' },
        ],
        sidebar: {
          '/guide/': [
            { text: 'Getting Started', link: '/guide/' },
            { text: 'Code Panel', link: '/guide/python' },
            { text: 'Network & Repeater', link: '/guide/network' },
            { text: 'Browser Panel', link: '/guide/browser' },
            { text: 'Pentest Notes', link: '/guide/notes' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          ],
        },
      },
    },
    'zh-TW': {
      label: '繁體中文',
      lang: 'zh-TW',
      link: '/zh-TW/',
      themeConfig: {
        nav: [
          { text: '首頁', link: '/zh-TW/' },
          { text: '挑戰', link: '/zh-TW/challenges/' },
          { text: '使用手冊', link: '/zh-TW/guide/' },
        ],
        sidebar: {
          '/zh-TW/guide/': [
            { text: '快速開始', link: '/zh-TW/guide/' },
            { text: 'Code 面板', link: '/zh-TW/guide/python' },
            { text: 'Network 與 Repeater', link: '/zh-TW/guide/network' },
            { text: 'Browser 面板', link: '/zh-TW/guide/browser' },
            { text: 'Pentest Notes', link: '/zh-TW/guide/notes' },
            { text: '疑難排解', link: '/zh-TW/guide/troubleshooting' },
          ],
        },
      },
    },
  },

  transformPageData(pageData, ctx) {
    if (pageData.frontmatter.layout !== 'challenge') return
    const filePath = resolve(ctx.siteConfig.srcDir, pageData.relativePath)
    const raw = readFileSync(filePath, 'utf-8')
    pageData.frontmatter.markdownBody = extractMarkdownBody(raw)
  },
})

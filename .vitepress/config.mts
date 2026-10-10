import { defineConfig } from 'vitepress'
import UnoCSS from 'unocss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { extractMarkdownBody } from './challenge/plugin'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: "platform",
  // A site served from a sub-path needs a matching base or every asset/JS/WASM
  // URL 404s. Nothing in this repository sets SITE_BASE any more: the upstream
  // site deploys to Cloudflare Pages at a domain root, which is configured in
  // the Cloudflare dashboard and deliberately leaves the variable unset. The
  // env-conditional is kept because it is the seam a sub-path deployment plugs
  // into — set SITE_BASE in the build environment and the base follows —
  // and because locally and in CI (dev server, vitepress preview, Playwright
  // site-smoke + challenge L3, the release zip) it is unset, so the site serves
  // at root and test navigation stays base-agnostic. `pnpm fork:init --base`
  // rewrites this line to a plain literal for forks that need a fixed path.
  base: process.env.SITE_BASE ?? '/',
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
  // assets and `href="/favicon.png"` for these lines, unchanged. Upstream that is
  // correct — `base` is `/` and nothing sets SITE_BASE (see the note above it).
  // A fork that passes `pnpm fork:init --base /sub/` rewrites the `base:` line
  // and MUST edit these hrefs to match; nothing checks it for them.
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
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

// https://vitepress.dev/guide/custom-theme

// vue-i18n's prebuilt ESM (loaded externally by VitePress SSR) references
// Vue build-time flags as bare globals. Define them on globalThis before any
// `app.use(i18n)` runs to prevent ReferenceError during `pnpm docs:build`.
// Unconditional assignment (not `??=`) — any prior value would be a hijack
// surface for re-enabling devtools in a production bundle.
;(globalThis as any).__VUE_PROD_DEVTOOLS__ = false
;(globalThis as any).__VUE_PROD_HYDRATION_MISMATCH_DETAILS__ = false
;(globalThis as any).__VUE_OPTIONS_API__ = true
;(globalThis as any).__INTLIFY_PROD_DEVTOOLS__ = false

import { computed, defineComponent, h, onMounted, onUnmounted, watch } from 'vue'
import type { Theme } from 'vitepress'
import { useData, useRoute, useRouter } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { createPinia } from 'pinia'
import 'virtual:uno.css'
import './style.css'
import ChallengeLayout from './layouts/ChallengeLayout.vue'
import SourceViewer from './components/SourceViewer.vue'
import ChallengeList from './components/ChallengeList.vue'
import HomeContent from './components/HomeContent.vue'
import LocaleSwitcher from './components/LocaleSwitcher.vue'
import SessionGate from './components/SessionGate.vue'
import { useSessionGate, hasGateDecision, shouldPresentGateHere } from './composables/useSessionGate'
import {
  i18n,
  detectInitialLocale,
  detectLocaleFromPath,
  persistLocale,
  redirectTargetForStoredLocale,
  shouldPersistOnColdLoad,
} from './i18n'

/**
 * Locale-switcher selection flag.
 *
 * - `false` (default): use VitePress's built-in `VPNavBarTranslations`
 *   dropdown on default-theme pages. A route watcher in the Layout setup
 *   syncs `i18n.global.locale.value` and `localStorage` whenever the URL
 *   prefix changes.
 * - `true`: use the custom `LocaleSwitcher.vue` component, mounted into
 *   the `nav-bar-content-before` slot. The built-in dropdown is hidden
 *   via CSS scoped to `body.use-custom-locale-switcher`.
 *
 * Challenge pages always render the custom LocaleSwitcher through
 * MergedNav.vue regardless of this flag — it only governs the default
 * theme nav.
 *
 * Flip this and rebuild; no spec change is required (the i18n-runtime
 * spec covers both modes).
 */
const USE_CUSTOM_LOCALE_SWITCHER = false as boolean

export default {
  ...DefaultTheme,
  Layout: defineComponent({
    name: 'Layout',
    setup() {
      const { frontmatter, site } = useData()
      const isChallenge = computed(() => frontmatter.value.layout === 'challenge')

      // Route watcher — syncs vue-i18n's `locale.value` and `localStorage`
      // whenever the URL prefix crosses locale boundaries (SPA navigation,
      // browser back/forward, or built-in dropdown selection). Idempotent:
      // a no-op when the detected locale already matches. Reuses the
      // single-sourced `detectLocaleFromPath` rule (mirrors LocaleSwitcher
      // semantics) and `persistLocale` helper (SSR-safe).
      const route = useRoute()
      const router = useRouter()
      const stopRouteWatch = watch(
        () => route.path,
        (newPath) => {
          const target = detectLocaleFromPath(newPath)
          if (i18n.global.locale.value === target) return
          i18n.global.locale.value = target
          persistLocale(target)
        },
        // `flush: 'pre'` runs the watcher BEFORE child components update on
        // the same tick, so any component using `t()` re-renders with the
        // already-synchronised locale rather than the stale one. Vue 3's
        // default is `'pre'`, but we set it explicitly so the contract is
        // audit-proof and survives future Vue defaults changing.
        { flush: 'pre' },
      )

      // The shared-machine choice. The CHECK is site-wide, because what it finds is a
      // fact about this browser rather than about this page, and a page that skips it
      // would write no record of having looked. Where the choice is PUT ON SCREEN is a
      // separate question, answered per page by `shouldPresentGateHere`: the platform has
      // no site-wide download or upload, so outside the challenges there is nothing of a
      // previous learner's that a visitor could act on.
      const gate = useSessionGate()

      // The gate's answer can arrive after this layout is gone, and the watcher that
      // waits for it is created inside a promise continuation — outside the effect
      // scope Vue disposes on unmount, because that scope is only active while setup
      // and the lifecycle hooks themselves are running. So both halves are manual:
      // nothing is created once the unmount has happened, and whatever was created is
      // stopped in `onUnmounted` below.
      let unmounted = false
      let stopDecisionWatch: (() => void) | null = null

      onMounted(() => {
        // Cold-load redirect: the stored locale preference is expressed as a
        // NAVIGATION, because the URL is the single authority for the locale.
        // Overriding the URL in place instead let the address bar and the page
        // describe different locales, which surfaced as an English nav bar above
        // Chinese panels.
        //
        // `replace`, not push: pushing would leave the pre-redirect URL one step
        // back, so Back would return to it and be redirected again — a trap with
        // no way out.
        const runLocaleRedirect = () => {
          const target = redirectTargetForStoredLocale(window.location, site.value.base)
          if (target) router.go(target, { replace: true })
        }

        // The preference this redirect reads is `wxl-locale`, and that is one of the
        // keys the gate deletes when a learner chooses to start fresh. Redirecting
        // first would take them into the previous learner's locale tree and then need
        // a second navigation to undo it.
        //
        // The marker is read synchronously, so the ordinary path — this session has
        // already answered — navigates in the same tick it always did, with no await
        // and nothing else consulted.
        if (hasGateDecision()) {
          runLocaleRedirect()
        } else {
          void gate.evaluate().then(() => {
            // The layout that would be navigated is already gone. Redirecting now would
            // drive a router this component no longer owns, and a watcher started here
            // would never be stopped by anything.
            if (unmounted) return
            // Released immediately on a page that does not put the choice on screen —
            // which covers the old `not-needed` exit and one more that is new and silent:
            // a page with stored data that this page does not ask about. The decision
            // there never leaves `undecided`, so a redirect waiting for it would wait for
            // an answer nobody will be asked for, and a learner whose preference names
            // another locale would sit on the wrong locale tree with nothing left that
            // could move them off it. Every assertion about asking stays green through
            // that, which is why it is checked by its own test.
            if (!shouldPresentGateHere(isChallenge.value)) {
              runLocaleRedirect()
              return
            }
            // Held until the choice stops being on screen. The guard reads whether a
            // full page load is already coming, which is the fact the redirect's own
            // truth depends on — `cleared` replaces this page with a load of the site
            // root, so navigating here would be a second navigation racing the first.
            // Every other value leaves the page in place and the learner reading it, so
            // every other value must release the redirect.
            //
            // It read `=== 'kept'` before, and that is a different fact that merely
            // coincided with this one while `kept` was the only non-destructive exit.
            // Adding `dismissed` separated them: the value fell past the allowlist to
            // the teardown below, so the watcher stopped itself without ever running the
            // redirect — the destructive half of this block without the constructive
            // half, leaving the learner parked on the previous learner's locale tree
            // with nothing left that could move them off it.
            stopDecisionWatch = watch(gate.decision, (decision) => {
              if (decision === 'undecided') return
              if (decision !== 'cleared') runLocaleRedirect()
              stopDecisionWatch?.()
              stopDecisionWatch = null
            })
          })
        }

        // Challenge-specific global styles
        document.body.classList.toggle('challenge-page', isChallenge.value)
        // Custom-switcher CSS scope — when true, scopes the CSS hide rule
        // for `.VPNavBarTranslations` so the built-in dropdown disappears.
        if (USE_CUSTOM_LOCALE_SWITCHER) {
          document.body.classList.add('use-custom-locale-switcher')
        }
      })
      onUnmounted(() => {
        document.body.classList.remove('challenge-page')
        document.body.classList.remove('use-custom-locale-switcher')
        stopRouteWatch()
        unmounted = true
        stopDecisionWatch?.()
        stopDecisionWatch = null
      })

      // Rendered beside whichever layout applies, never instead of it: the gate is a
      // question about the stored data, not a barrier to reading the site.
      const withGate = (layout: unknown) => [
        layout,
        // Told which kind of page it is beside, from the same frontmatter value that
        // chose the layout on the line above. The gate does not read the route itself:
        // two rules for "is this a challenge page" would disagree the first time a path
        // shape changed.
        h(SessionGate, { isChallengePage: isChallenge.value }),
      ]

      return () => {
        if (isChallenge.value) return withGate(h(ChallengeLayout))
        // Default-theme nav: when the flag is true, inject the custom
        // LocaleSwitcher into the `nav-bar-content-before` slot. When
        // false, render no slot — VitePress's built-in dropdown takes
        // over and the route watcher above keeps vue-i18n in sync.
        if (USE_CUSTOM_LOCALE_SWITCHER) {
          return withGate(h(DefaultTheme.Layout, null, {
            'nav-bar-content-before': () => h(LocaleSwitcher),
          }))
        }
        return withGate(h(DefaultTheme.Layout))
      }
    },
  }),
  enhanceApp({ app }: { app: any }) {
    // Call DefaultTheme's enhanceApp first
    DefaultTheme.enhanceApp?.({ app })

    // Pinia — installed once at app level; pyodide and php-wasm are lazy-loaded
    // per-challenge page to avoid loading heavy WASM on every page
    app.use(createPinia())

    app.use(i18n)

    // Client-only init: the URL alone decides the locale — the same rule the
    // route watcher applies on every later navigation. Guarded so VitePress SSR
    // rendering (which has no `window`) keeps the createI18n default ('en').
    //
    // Persistence is CONDITIONAL. Writing the detected locale unconditionally
    // would store the default on every cold load of the unprefixed tree, wiping
    // the stored preference before the cold-load redirect below could read it.
    if (typeof window !== 'undefined') {
      const detected = detectInitialLocale()
      i18n.global.locale.value = detected
      if (shouldPersistOnColdLoad(window.location.pathname, import.meta.env.BASE_URL ?? '/')) {
        persistLocale(detected)
      }
    }

    // SourceViewer is used in challenge pages via markdown
    app.component('SourceViewer', SourceViewer)

    // ChallengeList requires a `challenges: ChallengeData[]` prop; each locale's
    // challenges page (platform/challenges.md, platform/zh-TW/challenges.md) passes it
    // via <ChallengeList :challenges="data" /> after loading its own data file.
    app.component('ChallengeList', ChallengeList)

    // HomeContent is used in platform/index.md via <HomeContent />
    app.component('HomeContent', HomeContent)

    // Register Service Worker (challenge router)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}challenge-sw.js`).catch((err: Error) => {
        console.warn('[challenge-sw] registration failed:', err)
      })
    }
  },
} satisfies Theme

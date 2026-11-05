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

import { computed, defineComponent, h, onMounted, onUnmounted, provide, watch } from 'vue'
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
import MissingTranslationLine from './components/MissingTranslationLine.vue'
import { useSessionGate, hasGateDecision, shouldPresentGateHere } from './composables/useSessionGate'
import { i18n, detectInitialLocale, detectLocaleFromPath } from './i18n'
import { useArrivals } from './composables/useArrivals'
import { LOCALE_CHOICE, MISSING_TRANSLATION_LOCALE } from './i18n/missingTranslation'

export default {
  ...DefaultTheme,
  Layout: defineComponent({
    name: 'Layout',
    setup() {
      const { frontmatter, page, site } = useData()
      const isChallenge = computed(() => frontmatter.value.layout === 'challenge')

      const route = useRoute()
      const router = useRouter()

      // Route watcher — sets vue-i18n's `locale.value` whenever the URL prefix crosses
      // locale boundaries (SPA navigation, browser back/forward, a redirect), because
      // the URL decides the interface locale. It does not write the stored preference:
      // only the learner's own choices do (spec 0008, D5) — a link followed into the
      // other locale, Back, or a redirect the site made are not choices. Idempotent: a
      // no-op when the detected locale already matches.
      const stopRouteWatch = watch(
        () => route.path,
        (newPath) => {
          const target = detectLocaleFromPath(newPath)
          if (i18n.global.locale.value === target) return
          i18n.global.locale.value = target
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

      // Arrivals and the missing-translation line (spec 0008): see `useArrivals`. The line
      // of a cold load or a not-found arrival, on a page that puts the gate's choice on
      // screen, waits for the answer (C11), like the redirects do; the line of a locale
      // switcher choice does not (D17). The switcher, in the nav slot below and in
      // MergedNav, makes its choice through `LOCALE_CHOICE`.
      const arrivals = useArrivals({
        route,
        router,
        page,
        base: () => site.value.base,
        holdLine: () => shouldPresentGateHere(isChallenge.value) && gate.decision.value === 'undecided' && !hasGateDecision(),
      })
      provide(MISSING_TRANSLATION_LOCALE, arrivals.lineLocale)
      provide(LOCALE_CHOICE, arrivals.choose)
      const renderLine = () =>
        arrivals.lineLocale.value ? h(MissingTranslationLine, { locale: arrivals.lineLocale.value }) : null

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
        //
        // It goes only to a translation that exists, named by its page-list entry;
        // otherwise the learner stays and the missing-translation line says why
        // (spec 0008, A1–A3). `useArrivals.release` runs it, and before it the
        // not-found redirect: both wait for the gate as below. `recordColdLoad`
        // does not wait: it stores `zh-TW` for a published `/zh-TW/` page (W2).
        const runLocaleRedirect = arrivals.release
        arrivals.recordColdLoad()

        // Held until this session has a recorded decision; on a page that does not put
        // the choice on screen it is released as soon as the check settles (below). The
        // hold is not about the preference itself: `wxl-locale` is exempt from the clear
        // (`localStorageKeys.ts`), so a clear leaves the value this redirect reads as it
        // was. What the hold should guard while the choice is open is not settled.
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
      })
      onUnmounted(() => {
        document.body.classList.remove('challenge-page')
        stopRouteWatch()
        arrivals.stop()
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
        // The missing-translation line on a default-theme page: in the top slot of
        // whichever layout renders (L4).
        const lineSlots = {
          'doc-before': renderLine,
          'page-top': renderLine,
          'home-hero-before': renderLine,
        }
        // Default-theme nav: the custom LocaleSwitcher in the `nav-bar-content-before`
        // slot, the same control challenge pages have in MergedNav. It is the only locale
        // menu (spec 0008, D7): VitePress's three built-in translation menus are hidden by
        // `style.css`, and a choice made in it is the learner's, so it is stored — the
        // route watcher above no longer stores anything. It goes to the chosen locale's
        // version only when that version is published, and otherwise stays (B1, B2).
        return withGate(h(DefaultTheme.Layout, null, {
          ...lineSlots,
          'nav-bar-content-before': () => h(LocaleSwitcher),
        }))
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

    // Client-only init: the URL alone decides the interface locale — the same rule
    // the route watcher applies on every later navigation. Guarded so VitePress SSR
    // rendering (which has no `window`) keeps the createI18n default ('en').
    //
    // Nothing is written to the stored preference here (spec 0008, D5, D16): only the
    // URL is known at bootstrap, and the URL cannot tell a published page from a
    // missing translation or a failed load. The cold load's write — a reload and a
    // short link's server redirect are cold loads too (D13) — is decided once the
    // router has rendered the page (`useArrivals`).
    if (typeof window !== 'undefined') {
      i18n.global.locale.value = detectInitialLocale()
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

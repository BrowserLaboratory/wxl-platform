<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { useData, useRouter } from 'vitepress'
import { localizePath, persistLocale, type Locale } from '../i18n'

const { t, locale } = useI18n()
const { localeIndex, site } = useData()
const router = useRouter()

// Everything DISPLAYED here is derived from the page locale, not from the
// vue-i18n runtime locale. The runtime instance starts at `en` and is only
// corrected client-side, so rendering from it puts English text — including the
// button's accessible name — into the static HTML of a zh-TW page. MergedNav
// was rewritten for exactly this reason in the same commit; round 1 of review
// caught that this component was left on the old pattern.
//
// `locale` (the runtime ref) is still ASSIGNED in select(), because switching
// the running app's language is precisely what it is for. Read from the page,
// write to the runtime.
const pageLocale = computed<Locale>(() => (localeIndex.value === 'zh-TW' ? 'zh-TW' : 'en'))

// Unique per mount: the heading's id is referenced by the listbox's
// aria-labelledby, and a hard-coded id would collide the moment two switchers
// mount together, silently pointing both listboxes at the first heading.
const headingId = useId()
const menuId = useId()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const tp = (key: string) => t(key, {}, { locale: pageLocale.value })

const currentLabel = computed(() =>
  pageLocale.value === 'zh-TW' ? tp('locale_switcher.tw_label') : tp('locale_switcher.english_label')
)

// The menu lists the locale the PAGE is not in. Both values derive from
// `pageLocale`, so no CJK literal enters the template.
const otherLocale = computed<Locale>(() => (pageLocale.value === 'zh-TW' ? 'en' : 'zh-TW'))
const otherLabel = computed(() =>
  otherLocale.value === 'zh-TW' ? tp('locale_switcher.tw_label') : tp('locale_switcher.english_label')
)

function select(target: Locale) {
  open.value = false
  // Guard on the PAGE locale, because that is what the menu presented: the one
  // offered entry is `otherLocale`, derived from `pageLocale`. Comparing the
  // vue-i18n runtime ref here made the offered entry a no-op whenever the two
  // disagreed — and they do disagree on a cold load of a non-prefixed URL when
  // `wxl-locale` holds `zh-TW`, because detectInitialLocale lets the stored
  // value win and the route watcher carries no `immediate`. Before the round-1
  // fix moved display onto `pageLocale` this line was unreachable; the fix made
  // it reachable and turned the switcher into a dead control.
  if (pageLocale.value === target) return

  locale.value = target
  persistLocale(target)

  if (typeof window !== 'undefined') {
    // `window.location.pathname` INCLUDES the site base, and `localizePath`
    // requires a base-less path — its docstring says so, and `MergedNav`'s
    // `navLink` obeys it. Strip the base off, localise, put it back.
    //
    // A non-empty base is a supported configuration (`config.mts` reads
    // `SITE_BASE`, and `pnpm fork:init --base` rewrites it for GitHub Pages
    // forks). Feeding the prefixed path in emitted `/zh-TW/<base>/...` — the
    // locale segment outside the base — and, switching the other way, returned
    // the path unchanged so the navigation silently did nothing while the
    // runtime locale and localStorage had already been written.
    //
    // `router.go` needs the base back on: VitePress's loadPage recovers the
    // relative path with `route.path.slice(site.base.length)`.
    const base = site.value.base || '/'
    const path = window.location.pathname
    const bare = path.startsWith(base) ? path.slice(base.length - 1) : path
    const nextPath =
      base.slice(0, -1) + localizePath(bare, target) +
      window.location.search +
      window.location.hash
    router.go(nextPath)
  }
}

function onDocumentClick(ev: MouseEvent) {
  if (!rootEl.value) return
  if (!rootEl.value.contains(ev.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', onDocumentClick)
  }
})
onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', onDocumentClick)
  }
})

// The exposed name is kept for the existing test surface, but it now points at
// the single-sourced rule. A test asserts this identity: if anyone reinstates a
// local copy of the prefixing logic, that assertion is the thing that goes red.
defineExpose({ buildTargetPath: localizePath })
</script>

<template>
  <div ref="rootEl" class="relative inline-block shrink-0">
    <button
      data-locale-switcher-toggle
      class="ch-nav-icon-btn flex items-center gap-1"
      :aria-label="`${tp('locale_switcher.button_aria')} — ${currentLabel}`"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-controls="menuId"
      @keydown.escape="open = false"
      @keydown.down.prevent="open = true"
      @click="open = !open"
    >
      <!-- Translate glyph, matching VitePress's own VPNavBarTranslations control
           so the site does not present two differently-shaped switchers. -->
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
      </svg>
      <!-- Static, not rotated on open: rotation is animated state with no test
           coverage, and the only thing it conveys is "the menu is open", which
           the expanded menu already shows. -->
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full mt-1 min-w-[140px] rounded border border-[var(--ch-border)] bg-[var(--ch-bg-card)] shadow-lg py-1 z-50"
    >
      <!-- The current locale is a heading, not a choice, so it sits OUTSIDE the
           listbox and names it via aria-labelledby. It is deliberately NOT
           aria-hidden: it was, and with the trigger's text label removed that
           left screen-reader users no way to learn the active locale. The
           trigger's accessible name now carries it too, so this is not the only
           such place — it is the only VISIBLE one. -->
      <p
        :id="headingId"
        data-locale-current
        class="px-3 py-1.5 m-0 text-[0.85em] font-semibold color-[var(--ch-text-1)]"
      >{{ currentLabel }}</p>
      <ul
        :id="menuId"
        data-locale-switcher-menu
        role="listbox"
        :aria-labelledby="headingId"
        class="list-none m-0 pl-0"
      >
        <li
          class="cursor-pointer px-3 py-1.5 text-[0.85em] color-[var(--ch-text-2)] hover:bg-[var(--ch-bg-soft)] hover:color-[var(--ch-accent)] whitespace-nowrap"
          role="option"
          :aria-selected="false"
          tabindex="0"
          :data-locale-option="otherLocale"
          @click="select(otherLocale)"
          @keydown.enter.prevent="select(otherLocale)"
          @keydown.space.prevent="select(otherLocale)"
          @keydown.escape="open = false"
        >{{ otherLabel }}</li>
      </ul>
    </div>
  </div>
</template>

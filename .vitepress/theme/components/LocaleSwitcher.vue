<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { useData } from 'vitepress'
import { rememberChoice, otherLocale, type Locale } from '../i18n'
import { LOCALE_CHOICE, MISSING_TRANSLATION_LOCALE, type ChoiceOutcome } from '../i18n/missingTranslation'

const { t, locale } = useI18n()
const { localeIndex } = useData()

// Where a choice goes is the theme Layout's (spec 0008, B1–B7): it writes the choice, then
// navigates to a published counterpart or stays with the line. Mounted with no Layout above it,
// the switcher only remembers the choice.
const choose = inject(LOCALE_CHOICE, (chosen: Locale): ChoiceOutcome => {
  rememberChoice(chosen)
  return 'stay'
})
const lineLocale = inject(MISSING_TRANSLATION_LOCALE, computed(() => null))

// Everything DISPLAYED here is derived from the page locale, not from the
// vue-i18n runtime locale. The runtime instance starts at `en` and is only
// corrected client-side, so rendering from it puts English text — including the
// button's accessible name — into the static HTML of a zh-TW page. MergedNav
// was rewritten for exactly this reason in the same commit; round 1 of review
// caught that this component was left on the old pattern.
//
// The runtime locale is ASSIGNED here only when a choice navigates (spec 0008, B2): the
// interface follows the URL, and a choice that stays keeps both the URL and the interface in
// the page's locale. Read from the page, write to the runtime.
const pageLocale = computed<Locale>(() => (localeIndex.value === 'zh-TW' ? 'zh-TW' : 'en'))

// Unique per mount: the heading's id is referenced by the listbox's
// aria-labelledby, and a hard-coded id would collide the moment two switchers
// mount together, silently pointing both listboxes at the first heading.
const headingId = useId()
const menuId = useId()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const tp = (key: string) => t(key, {}, { locale: pageLocale.value })
const labelOf = (l: Locale) => (l === 'zh-TW' ? tp('locale_switcher.tw_label') : tp('locale_switcher.english_label'))

const currentLabel = computed(() => labelOf(pageLocale.value))

// The menu (spec 0008, B5): its title is always the page's locale. It offers the locale the
// page is not in; while the missing-translation line shows, it also offers the page's own
// locale, the way back, which removes the line without navigating. Every label derives from a
// locale code, so no CJK literal enters the template.
const options = computed<Locale[]>(() =>
  lineLocale.value ? [otherLocale(pageLocale.value), pageLocale.value] : [otherLocale(pageLocale.value)],
)

function select(target: Locale) {
  open.value = false
  // The Layout decides and writes; the switcher only follows a navigation with the interface.
  if (choose(target) === 'navigate') locale.value = target
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
          v-for="option in options"
          :key="option"
          class="cursor-pointer px-3 py-1.5 text-[0.85em] color-[var(--ch-text-2)] hover:bg-[var(--ch-bg-soft)] hover:color-[var(--ch-accent)] whitespace-nowrap"
          role="option"
          :aria-selected="false"
          tabindex="0"
          :data-locale-option="option"
          @click="select(option)"
          @keydown.enter.prevent="select(option)"
          @keydown.space.prevent="select(option)"
          @keydown.escape="open = false"
        >{{ labelOf(option) }}</li>
      </ul>
    </div>
  </div>
</template>

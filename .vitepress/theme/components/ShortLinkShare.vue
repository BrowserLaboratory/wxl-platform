<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { challengeLink, type ShortLinkLocale } from '../../challenge/shortLink'
import { linkMode } from '../linkMode'

// One control, used in the challenge list and beside the challenge title, so a
// challenge presents one spelling of its link wherever the reader meets it.
//
// The URL is rendered as selectable text and the button is only a shortcut. A
// clipboard write can be refused — an insecure origin, a denied permission, an
// older browser — and a control that only reported the failure would leave the
// reader with nothing to do about it. That is why the failure message points at
// the text rather than merely saying the copy did not work.

const props = defineProps<{
  /** The challenge's frontmatter number. Anything else renders nothing. */
  number?: number | string | null
  /**
   * The challenge's slug, which the page URL is built from. Unused for a short link, so a
   * caller in short mode may leave it out; in page mode a missing slug, or one outside the
   * slug grammar, renders nothing.
   */
  slug?: string
  /**
   * The locale of the page this sits on, not the vue-i18n runtime locale. The
   * runtime instance starts at `en` and only reaches the right value after
   * hydration, which would ship an English label into the static HTML of a
   * zh-TW page — the same reason MergedNav takes its locale from the page.
   */
  locale: ShortLinkLocale
}>()

const { t } = useI18n()
const tp = (key: string) => t(key, {}, { locale: props.locale })

/** Fixed by the build, so the HTML as served and the hydrated page give the same link. */
const mode = linkMode()

/**
 * The link to show and copy, or null when there is none — a challenge without a number has no
 * link, and in page mode neither has one without a usable slug. A string number is converted
 * with `Number()` first.
 */
const link = computed(() => {
  const raw = typeof props.number === 'string' ? Number(props.number) : props.number
  return challengeLink(mode, raw ?? undefined, props.slug, props.locale)
})

const display = computed(() => link.value?.display ?? '')
const url = computed(() => link.value?.url ?? '')

/** How long the confirmation stays up before the control returns to rest. */
const CONFIRMATION_MS = 2000

const status = ref('')
/**
 * Whether the status showing is the confirmation. It is one short word, kept whole on one line
 * so the URL text gives up the width instead; the failure message is long and may wrap.
 */
const confirmed = ref(false)
let revert: ReturnType<typeof setTimeout> | undefined

async function copy(): Promise<void> {
  clearTimeout(revert)
  try {
    // Read inside the try: on an insecure origin `navigator.clipboard` is
    // undefined and this throws synchronously, which would otherwise take the
    // handler down instead of reaching the message below.
    await navigator.clipboard.writeText(url.value)
    status.value = tp('short_link.copied')
    confirmed.value = true
    revert = setTimeout(() => { status.value = ''; confirmed.value = false }, CONFIRMATION_MS)
  } catch {
    // Left standing on purpose. The confirmation reverts because nothing more
    // is asked of the reader; this one is an instruction, and it stays until it
    // has been acted on.
    status.value = tp('short_link.copy_failed')
    confirmed.value = false
  }
}

onUnmounted(() => clearTimeout(revert))
</script>

<template>
  <span v-if="link" class="inline-flex items-center gap-1 min-w-0 max-w-full">
    <!--
      Selectable text, not a control. In the list this sits inside a row that is
      itself an anchor, so the copy button stops the click; the text is left
      alone because selecting it is the fallback path.

      A box that never wraps: a page URL is long, so where it does not fit it is
      cut with an ellipsis rather than widening the row, and the title holds the
      whole copied URL for hover.
    -->
    <span
      data-short-link
      :title="url"
      class="block min-w-0 truncate font-mono text-[0.75em] color-[var(--ch-text-3)] select-all"
    >{{ display }}</span>

    <button
      data-copy-link
      type="button"
      class="ch-nav-icon-btn shrink-0"
      :aria-label="tp('short_link.copy_label')"
      :title="tp('short_link.copy_label')"
      @click.stop.prevent="copy"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    </button>

    <!--
      The confirmation does not shrink and does not wrap: `Copied` cut to `Copie`, or `已複製`
      stacked one character per line, cannot be read, so the URL text gives up the width (D7).
      The failure message keeps `min-w-0` and may wrap, so it never widens the row or scrolls the
      page sideways. It still shares the width with the URL text, though: on the nav's 32px mobile
      row with the brief collapsed, it is squeezed to a few dozen pixels, a long word such as
      `yourself` is cut, and its 10–12 lines run out of the row. In the nav's desktop place (row 1, a
      fixed 40px) it wraps too: from 768 to 1024 wide it takes 2–4 lines in English and 2–3 in
      Traditional Chinese, and runs 4–28px above the nav's top edge. The layout in both rows is
      T-0037's: the spec lets the mobile row grow and says nothing of the desktop row, so T-0037
      decides there within S01, S10 and D14.
    -->
    <span
      data-copy-status
      role="status"
      aria-live="polite"
      class="text-[0.7em] color-[var(--ch-text-3)]"
      :class="confirmed ? 'shrink-0 whitespace-nowrap' : 'min-w-0 whitespace-normal'"
    >{{ status }}</span>
  </span>
</template>

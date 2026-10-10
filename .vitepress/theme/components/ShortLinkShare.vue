<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  isChallengeNumber,
  shortLinkDisplay,
  shortLinkUrl,
  type ShortLinkLocale,
} from '../../challenge/shortLink'

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
   * The locale of the page this sits on, not the vue-i18n runtime locale. The
   * runtime instance starts at `en` and only reaches the right value after
   * hydration, which would ship an English label into the static HTML of a
   * zh-TW page — the same reason MergedNav takes its locale from the page.
   */
  locale: ShortLinkLocale
}>()

const { t } = useI18n()
const tp = (key: string) => t(key, {}, { locale: props.locale })

/** The number, or null when there is not one — a challenge without a number has no short link. */
const value = computed<number | null>(() => {
  const raw = typeof props.number === 'string' ? Number(props.number) : props.number
  return isChallengeNumber(raw) ? raw : null
})

const display = computed(() => (value.value === null ? '' : shortLinkDisplay(value.value, props.locale)))
const url = computed(() => (value.value === null ? '' : shortLinkUrl(value.value, props.locale)))

/** How long the confirmation stays up before the control returns to rest. */
const CONFIRMATION_MS = 2000

const status = ref('')
let revert: ReturnType<typeof setTimeout> | undefined

async function copy(): Promise<void> {
  clearTimeout(revert)
  try {
    // Read inside the try: on an insecure origin `navigator.clipboard` is
    // undefined and this throws synchronously, which would otherwise take the
    // handler down instead of reaching the message below.
    await navigator.clipboard.writeText(url.value)
    status.value = tp('short_link.copied')
    revert = setTimeout(() => { status.value = '' }, CONFIRMATION_MS)
  } catch {
    // Left standing on purpose. The confirmation reverts because nothing more
    // is asked of the reader; this one is an instruction, and it stays until it
    // has been acted on.
    status.value = tp('short_link.copy_failed')
  }
}

onUnmounted(() => clearTimeout(revert))
</script>

<template>
  <span v-if="value !== null" class="inline-flex items-center gap-1 min-w-0">
    <!--
      Selectable text, not a control. In the list this sits inside a row that is
      itself an anchor, so the copy button stops the click; the text is left
      alone because selecting it is the fallback path.
    -->
    <span
      data-short-link
      class="font-mono text-[0.75em] color-[var(--ch-text-3)] whitespace-nowrap select-all"
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

    <span
      data-copy-status
      role="status"
      aria-live="polite"
      class="text-[0.7em] color-[var(--ch-text-3)]"
    >{{ status }}</span>
  </span>
</template>

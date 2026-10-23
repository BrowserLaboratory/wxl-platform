<script lang="ts">
/**
 * A plain primary click on a URL text selects the whole text, for copying by hand, and does nothing
 * else: inside the list's row anchor it does not open the challenge (D4). A click with Ctrl, Meta,
 * Shift or Alt held, or with another button, is left to the browser, so in the list it opens the
 * row's link as on any link (L21). Both link modes behave the same.
 *
 * Listened for on `window`, in the capture phase, and installed when this module is first
 * evaluated, not on the element. VitePress's router takes a click on an inbound link in its own
 * capture-phase listener on `window`, and skips one whose default is already prevented. That
 * listener is added when the app is created, after the theme's modules have been evaluated, so this
 * one runs before it; a listener on the element would run after the router had already navigated.
 */
function selectUrlText(event: MouseEvent): void {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
  const text = event.target instanceof Element ? event.target.closest('[data-short-link]') : null
  if (!text) return
  event.preventDefault()
  const range = document.createRange()
  range.selectNodeContents(text)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

const INSTALLED = '__wxlUrlTextClick'
if (typeof window !== 'undefined' && !(INSTALLED in window)) {
  Object.defineProperty(window, INSTALLED, { value: true })
  window.addEventListener('click', selectUrlText, { capture: true })
}
</script>

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
 * beside the button, where the URL text gives up width for it down to its 6ch minimum (and the
 * row wraps it below where even that is not enough); the failure message is long, takes a line
 * of its own and may wrap.
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
  <!--
    `display: contents`: the URL text, the button and the status are laid out as items of the
    caller's own flex row (the list's line 3, the nav's desktop row and its mobile row), not inside
    a box of their own. That is what lets the row see the URL text's 6ch minimum and its full width
    at once, which a box around them cannot pass on: its minimum would be the whole URL, since the
    text never wraps. The caller's row therefore has to be a flex row that wraps (see below), with
    the gap it wants between the URL text and the button.
  -->
  <span v-if="link" class="contents">
    <!--
      Selectable text, not a control. In the list this sits inside a row that is itself an anchor,
      so the copy button stops the click, and a plain primary click on the text selects it, in both
      link modes, without opening the challenge (D4; `selectUrlText` above). A click with a
      modifier key is left to the browser (L21).

      A box that never wraps (D2: one rule in the list and the nav): a URL is long, a page URL
      especially, so where it does not fit it is cut with an ellipsis rather than widening the row,
      and the title holds the whole copied URL for hover. It starts from nothing (`basis-0`) and grows
      to its full width (`max-w-max`) out of whatever its row leaves, but never gets narrower than six
      `0` characters of its own font (D14), in every state. In the nav the title takes the row's room
      first and the URL text yields down to that minimum (D7, MergedNav).
    -->
    <span
      data-short-link
      :title="url"
      class="block basis-0 grow min-w-[6ch] max-w-max truncate font-mono text-[0.75em] color-[var(--ch-text-3)] select-all"
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
      stacked one character per line, cannot be read. It follows the button; where the row has no
      room for it beside the URL text at its minimum, the row wraps it onto a line below (with the
      items after it), for the 2 s it shows.

      The failure message is long, and it stays until acted on. It takes a line of its own below
      the row's items (`order-last basis-full`), as wide as the row, and may wrap there onto as many
      lines as it needs; the row grows to hold it, in the list and in both nav rows alike. So it
      neither widens the row, nor takes the URL text below its minimum, nor the title's room, and it
      never runs out of the row or covers another item.

      While no status shows, the live region is taken out of the row (`absolute`), so an empty
      status costs the row no gap; it stays in the page so that what it later says is announced.
    -->
    <span
      data-copy-status
      role="status"
      aria-live="polite"
      class="text-[0.7em] color-[var(--ch-text-3)]"
      :class="!status ? 'absolute' : confirmed ? 'shrink-0 whitespace-nowrap' : 'order-last basis-full min-w-0 whitespace-normal'"
    >{{ status }}</span>
  </span>
</template>

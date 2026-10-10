<script setup lang="ts">
/**
 * "You have solved this one."
 *
 * One component for all three places it appears — the list rows, the list cards, and
 * the challenge page's nav — so completion looks like one thing and says one sentence
 * wherever the learner meets it.
 *
 * The label arrives as a prop rather than being translated in here. The nav renders at
 * the *page* locale, not at the vue-i18n runtime locale, because the runtime instance
 * starts at `en` and only reaches the right value after hydration; a component that
 * translated for itself would ship English text into the static HTML of a zh-TW
 * challenge page. Taking the string from the caller lets each call site translate the
 * way that surface already translates.
 */
const props = withDefaults(defineProps<{
  /**
   * The badge's own words. Always its accessible name, at every width and in every
   * mode — `sr-only` hides text from sight, not from the accessibility tree.
   */
  label: string
  /**
   * When the label is *visible*. This is a statement about the CONTAINER, which is why
   * it is the caller's to make and not a breakpoint baked in here.
   *
   *   'always'  the container has free space at every width it renders at, so the
   *             label costs nothing that matters. The grid card's badge row is this:
   *             it wraps, and nothing on it is truncated.
   *   'never'   the container has free space at NO width it renders at. The merged
   *             nav's mobile title row is this: its title is `flex-1`, so the title
   *             holds the free space itself and everything added comes out of it.
   *   'wide'    the container has free space above a measured width and none below it.
   *             The challenge list's rows are this.
   *
   * An earlier version hard-coded 'wide' for everyone at the `sm` breakpoint. Two things
   * were wrong with that. The grid card was silently stripped of its label at widths
   * where it had room to spare; and `sm` is 640px while the list row's measured boundary
   * is 500px, so between them the marker was icon-only at widths where the row could
   * have carried the word. The boundary below is the measured one — see the G-E block in
   * evidence/gates.txt for the sweep it comes from.
   */
  labelMode?: 'always' | 'never' | 'wide'
}>(), { labelMode: 'wide' })

const labelClass = {
  always: '',
  never: 'sr-only',
  // 560px, not a named breakpoint, and not the icon's boundary either. Two different
  // numbers fall out of the sweep in evidence/gates.txt G-E: the 27px icon stops
  // costing any row width at 500px, the 67px labelled badge at 560px. Revealing the
  // label at the icon's boundary put a 67px badge into rows with room for 27px and
  // displacement jumped straight back to -33.7px. This is the labelled badge's number.
  wide: 'sr-only min-[560px]:not-sr-only',
}[props.labelMode]
</script>

<template>
  <span data-challenge-done class="ch-badge-done" :title="label">
    <svg
      width="11" height="11" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 8.5 L6.5 12.5 L13.5 3.5" />
    </svg>
    <span :class="labelClass">{{ label }}</span>
  </span>
</template>

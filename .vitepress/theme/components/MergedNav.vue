<script setup lang="ts">
import { ref, computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { useI18n } from 'vue-i18n'
import { localizePath, type Locale } from '../i18n'
import LocaleSwitcher from './LocaleSwitcher.vue'
import ShortLinkShare from './ShortLinkShare.vue'
import ChallengeDoneBadge from './ChallengeDoneBadge.vue'

const props = defineProps<{
  title: string
  difficulty: string
  category: string
  runtimeReady: boolean
  runtimeError: string | null
  noteCount: number
  descriptionCollapsed: boolean
  /**
   * The challenge's permanent number. The short link is built from it and sits
   * beside the title here rather than in the description panel, which spends
   * most of a challenge collapsed.
   */
  number?: number
  /**
   * Whether the learner has already solved this challenge.
   *
   * Supplied by the layout, which is where the read of local progress belongs. This
   * bar renders on every challenge page; opening the database from here would tie the
   * page's chrome to storage being available, and would put a second reader of the
   * same fact beside the one the layout already has.
   *
   * It earns its place beyond consistency with the list: since C1, re-opening a solved
   * challenge starts a fresh attack session and keeps the old one, so nothing else on
   * the page distinguishes a repeat from a first attempt.
   */
  completed?: boolean
}>()

defineEmits<{
  'open-notes': []
  'toggle-description': []
}>()

const { isDark, localeIndex } = useData()

// Locale comes from the page, not from the vue-i18n runtime. The i18n instance
// is initialised to `en` and only reaches the right value after hydration, so
// reading it here would ship English hrefs in the static HTML of zh-TW pages
// and correct them on hydration — a visible flash, and wrong for no-JS readers
// and crawlers. VitePress resolves `localeIndex` from each page's own
// relativePath, so it is already correct when the page is rendered.
//
// `localeIndex` is `'root'` for English (the locales key), hence the mapping.
// Binary fallback matches detectLocaleFromPath: recognised, or English.
const locale = computed<Locale>(() => (localeIndex.value === 'zh-TW' ? 'zh-TW' : 'en'))

// localizePath takes a base-less path and withBase wraps its OUTPUT. Reversing
// the two emits the locale segment outside the site base.
const navLink = (path: string) => withBase(localizePath(path, locale.value))

// Translatable labels in this bar are rendered at the PAGE locale, not at the
// vue-i18n runtime locale, and that is what `tp` is for. The runtime instance
// starts at `en` and only reaches the right value after hydration, so
// translating in the template against the instance ships English text into the
// static HTML of a zh-TW page — the exact defect the href fix above exists to
// avoid. Round 1 caught the href half fixed and the label half still carrying
// the bug: the built zh-TW page emitted an English back-link label beside a
// correct `/zh-TW/challenges/` href.
//
// Which strings are exempt is NOT stated here. Three rounds of review each
// found one more hardcoded English string in this bar, and each time the fix
// came with a comment asserting the class was now closed — a claim the next
// round falsified from this same file. A comment cannot be falsified by CI.
//
// The allowlist and the check both live in
// tests/unit/components/MergedNav.test.ts, in the test named
// "renders no untranslated user-visible string": it mounts the bar in both
// locales and fails on any rendered string that is identical in the two and is
// not explicitly exempted. Add an untranslated string and that test goes red.
const { t } = useI18n()
const tp = (key: string) => t(key, {}, { locale: locale.value })

function toggleDark() {
  isDark.value = !isDark.value
}

const hamburgerOpen = ref(false)

const difficultyBadge: Record<string, string> = {
  easy: 'ch-badge-easy',
  medium: 'ch-badge-medium',
  hard: 'ch-badge-hard',
  mystery: 'ch-badge-mystery',
}

const categoryBadge: Record<string, string> = {
  web: 'ch-badge-web',
}
</script>

<template>
  <nav class="merged-nav border-b border-[var(--ch-border)] bg-[var(--ch-bg)] color-[var(--ch-text-1)]">
    <!-- Row 1: Desktop/Tablet = full row; Mobile = brand + back + utilities -->
    <div class="flex items-center h-[40px] px-3 gap-2">
      <!-- Left section: brand + back + title(desktop/tablet only) + badges(desktop/tablet only) -->
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <!-- Brand -->
        <span class="font-bold text-[0.875em] color-[var(--ch-accent)] shrink-0">WXL</span>

        <span class="ch-nav-sep">|</span>

        <!-- Back link -->
        <a
          :href="navLink('/challenges/')"
          class="text-[0.8125em] color-[var(--ch-accent)] no-underline whitespace-nowrap hover:underline shrink-0"
          :aria-label="tp('merged_nav.challenges_label')"
        >
          <span class="hidden lg:inline">← {{ tp('merged_nav.challenges_label') }}</span>
          <span class="lg:hidden">←</span>
        </a>

        <!-- Title + badges: visible on md+ (tablet/desktop), hidden on mobile -->
        <span class="ch-nav-sep hidden md:inline">|</span>
        <span class="hidden md:inline font-semibold text-[0.875em] truncate">{{ title }}</span>
        <span
          v-if="difficulty"
          data-badge="difficulty"
          :class="[difficultyBadge[difficulty] ?? 'ch-badge', 'hidden md:inline-block']"
        >{{ difficulty }}</span>
        <span
          v-if="category"
          data-badge="category"
          :class="[categoryBadge[category] ?? 'ch-badge', 'hidden md:inline-block']"
        >{{ category }}</span>

        <!-- Short link: the address a reader is given, next to the title it names. -->
        <ShortLinkShare class="hidden md:inline-flex" :number="number" :locale="locale" />

        <!--
          `tp`, not `$t`: the label follows the page locale like every other string in
          this bar. Translated against the runtime instance it would ship English into
          the static HTML of a zh-TW challenge page and correct itself on hydration.
        -->
        <!-- Only rendered from md up, where this row has room; always labelled. -->
        <ChallengeDoneBadge
          v-if="completed"
          class="hidden md:inline-flex shrink-0"
          label-mode="always"
          :label="tp('challenge_progress.completed_badge')"
        />
      </div>

      <!-- Right section -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Runtime status -->
        <span
          v-if="runtimeReady"
          data-runtime-status="ready"
          class="w-[8px] h-[8px] rounded-full bg-green-500"
          :title="tp('merged_nav.runtime_ready')"
        />
        <span
          v-else-if="runtimeError"
          data-runtime-status="error"
          class="w-[8px] h-[8px] rounded-full bg-red-500"
          :title="runtimeError"
        />
        <span
          v-else
          data-runtime-status="loading"
          class="w-[8px] h-[8px] rounded-full bg-yellow-500 animate-pulse"
          :title="tp('merged_nav.runtime_loading')"
        />

        <!-- Description toggle (hidden on mobile row 1, visible on md+ when collapsed) -->
        <button
          v-if="descriptionCollapsed"
          data-desc-toggle
          class="ch-nav-pill-btn text-[0.75em] hidden md:flex"
          @click="$emit('toggle-description')"
        >📖 {{ tp('merged_nav.description_toggle_label') }}</button>

        <!-- Notes button -->
        <button
          data-notes-btn
          class="ch-nav-pill-btn"
          :aria-label="tp('merged_nav.notes_label')"
          @click="$emit('open-notes')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span class="hidden lg:inline">{{ tp('merged_nav.notes_label') }}</span>
          <span
            v-if="noteCount > 0"
            class="inline-flex items-center justify-center min-w-[16px] h-[16px] px-[3px] rounded-full bg-[var(--ch-accent)] color-white text-[10px] font-bold leading-none"
          >{{ noteCount }}</span>
        </button>

        <!-- Dark mode toggle -->
        <button
          data-darkmode-toggle
          class="ch-nav-icon-btn"
          :title="tp(isDark ? 'merged_nav.darkmode_to_light' : 'merged_nav.darkmode_to_dark')"
          @click="toggleDark"
        >
          <svg v-if="isDark" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>

        <!-- Locale switcher -->
        <LocaleSwitcher />

        <!-- Hamburger menu (mobile only) -->
        <button
          data-hamburger
          class="ch-nav-icon-btn md:hidden"
          :aria-label="tp('merged_nav.menu_label')"
          :aria-expanded="hamburgerOpen"
          aria-controls="merged-nav-menu"
          @click="hamburgerOpen = !hamburgerOpen"
        ><span aria-hidden="true">☰</span></button>
      </div>
    </div>

    <!-- Row 2: Mobile only — title + badges + 📖 toggle -->
    <div class="flex items-center h-[32px] px-3 gap-2 md:hidden border-t border-[var(--ch-border)]">
      <span class="font-semibold text-[0.8125em] truncate flex-1">{{ title }}</span>
      <span
        v-if="difficulty"
        data-badge="difficulty"
        :class="difficultyBadge[difficulty] ?? 'ch-badge'"
      >{{ difficulty }}</span>
      <span
        v-if="category"
        data-badge="category"
        :class="categoryBadge[category] ?? 'ch-badge'"
      >{{ category }}</span>
      <ShortLinkShare :number="number" :locale="locale" />
      <!--
        Never labelled, at any width this row renders at. The row has no free space to
        absorb a badge: its title is `flex-1`, so the title IS the free space and
        anything added comes out of it.
        Measured at 360px: the title is 45px with no marker, 10px with the icon, and
        collapses past measuring with the label shown. The 45-to-0 figure is the one
        this decision rests on — an earlier version of this comment quoted 45-to-10,
        which is what icon-only PRODUCES, not what it avoids.
      -->
      <ChallengeDoneBadge v-if="completed" label-mode="never" :label="tp('challenge_progress.completed_badge')" />
      <button
        v-if="descriptionCollapsed"
        data-desc-toggle
        class="ch-nav-pill-btn text-[0.75em] md:hidden"
        @click="$emit('toggle-description')"
      >📖 {{ tp('merged_nav.description_toggle_label') }}</button>
    </div>

    <!-- Hamburger dropdown (mobile only) -->
    <div
      v-if="hamburgerOpen"
      id="merged-nav-menu"
      data-hamburger-menu
      class="md:hidden border-t border-[var(--ch-border)] bg-[var(--ch-bg-soft)] px-3 py-2 flex flex-col gap-1"
    >
      <a :href="navLink('/')" class="text-[0.8125em] color-[var(--ch-text-1)] no-underline py-1 hover:color-[var(--ch-accent)]">{{ tp('merged_nav.home_label') }}</a>
      <!-- /guide/, not /docs/: srcDir is "platform", so /docs/ would need a
           platform/docs/ directory. It has never resolved in either locale. -->
      <a :href="navLink('/guide/')" class="text-[0.8125em] color-[var(--ch-text-1)] no-underline py-1 hover:color-[var(--ch-accent)]">{{ tp('merged_nav.docs_label') }}</a>
    </div>
  </nav>
</template>

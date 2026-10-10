<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { useI18n } from 'vue-i18n'
import type { ChallengeData } from '../../../platform/shared/challenges.data'

const { locale } = useI18n()

const props = defineProps<{
  challenges: ChallengeData[]
}>()

// Stats computation
const totalCount = computed(() => props.challenges.length)
const easyCount = computed(() => props.challenges.filter(c => c.difficulty === 'easy').length)
const mediumCount = computed(() => props.challenges.filter(c => c.difficulty === 'medium').length)
const hardCount = computed(() => props.challenges.filter(c => c.difficulty === 'hard').length)
const mysteryCount = computed(() => props.challenges.filter(c => !['easy','medium','hard'].includes(c.difficulty ?? '')).length)

// Latest 3 challenges sorted by date desc
const latestChallenges = computed(() => {
  return [...props.challenges]
    .filter(c => c.date)
    .sort((a, b) => {
      const da = new Date(a.date!).getTime()
      const db = new Date(b.date!).getTime()
      return db - da
    })
    .slice(0, 3)
})

const difficultyBadge: Record<string, string> = {
  easy:    'ch-badge-easy',
  medium:  'ch-badge-medium',
  hard:    'ch-badge-hard',
  mystery: 'ch-badge-mystery',
}

function formatDate(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString(locale.value === 'zh-TW' ? 'zh-TW' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="home-content-wrapper px-6 pb-20">
    <!-- Platform intro -->
    <section class="max-w-screen-lg mx-auto mb-16 text-center">
      <h2 class="text-2xl font-bold mb-4 color-[var(--ch-text-1)]">{{ $t('home_content.about_heading') }}</h2>
      <p class="text-base color-[var(--ch-text-2)] leading-loose text-justify">
        {{ $t('home_content.about_paragraph') }}
      </p>
    </section>

    <!-- Stats -->
    <section class="max-w-screen-lg mx-auto mb-16">
      <h2 class="text-2xl font-bold mb-8 text-center color-[var(--ch-text-1)]">{{ $t('home_content.stats_heading') }}</h2>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="bg-[var(--ch-bg-soft)] rounded-xl p-5 text-center border border-[var(--ch-border)]">
          <div class="text-3xl font-bold color-[var(--ch-accent)] mb-1">{{ totalCount }}</div>
          <div class="text-sm color-[var(--ch-text-2)]">{{ $t('home_content.stats_total_label') }}</div>
        </div>
        <div class="bg-[var(--ch-bg-soft)] rounded-xl p-5 text-center border border-[var(--ch-border)]">
          <div class="text-3xl font-bold color-[var(--ch-easy-fg)] mb-1">{{ easyCount }}</div>
          <div class="text-sm color-[var(--ch-text-2)]">Easy</div>
        </div>
        <div class="bg-[var(--ch-bg-soft)] rounded-xl p-5 text-center border border-[var(--ch-border)]">
          <div class="text-3xl font-bold color-[var(--ch-med-fg)] mb-1">{{ mediumCount }}</div>
          <div class="text-sm color-[var(--ch-text-2)]">Medium</div>
        </div>
        <div class="bg-[var(--ch-bg-soft)] rounded-xl p-5 text-center border border-[var(--ch-border)]">
          <div class="text-3xl font-bold color-[var(--ch-hard-fg)] mb-1">{{ hardCount }}</div>
          <div class="text-sm color-[var(--ch-text-2)]">Hard</div>
        </div>
        <div class="bg-[var(--ch-bg-soft)] rounded-xl p-5 text-center border border-[var(--ch-border)]">
          <div class="text-3xl font-bold color-[var(--ch-myst-fg)] mb-1">{{ mysteryCount }}</div>
          <div class="text-sm color-[var(--ch-text-2)]">Mystery</div>
        </div>
      </div>
    </section>

    <!-- Latest challenges -->
    <section v-if="latestChallenges.length > 0" class="max-w-screen-lg mx-auto mb-16">
      <h2 class="text-2xl font-bold mb-8 text-center color-[var(--ch-text-1)]">{{ $t('home_content.latest_heading') }}</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          v-for="c in latestChallenges"
          :key="c.url"
          :href="withBase(c.url)"
          class="no-underline bg-[var(--ch-bg-soft)] rounded-xl p-5 border border-[var(--ch-border)] hover:border-[var(--ch-accent)] transition-colors cursor-pointer block"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="font-semibold color-[var(--ch-text-1)] text-base">{{ c.title }}</span>
            <span
              v-if="c.difficulty"
              :class="difficultyBadge[c.difficulty ?? 'mystery'] ?? 'ch-badge'"
              class="shrink-0"
            >{{ c.difficulty }}</span>
          </div>
          <p v-if="c.description" class="text-sm color-[var(--ch-text-2)] mb-2 line-clamp-2 m-0">{{ c.description }}</p>
          <div class="text-xs color-[var(--ch-text-3)]">{{ formatDate(c.date) }}</div>
        </a>
      </div>
    </section>

    <!-- Quick start -->
    <section class="max-w-screen-lg mx-auto">
      <h2 class="text-2xl font-bold mb-8 text-center color-[var(--ch-text-1)]">{{ $t('home_content.quick_start_heading') }}</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="text-center">
          <div class="w-12 h-12 rounded-full bg-[var(--ch-accent-soft)] flex items-center justify-center text-xl font-bold color-[var(--ch-accent)] mx-auto mb-4">1</div>
          <h3 class="font-semibold mb-2 color-[var(--ch-text-1)]">{{ $t('home_content.step1_title') }}</h3>
          <p class="text-sm color-[var(--ch-text-2)] leading-relaxed">{{ $t('home_content.step1_desc') }}</p>
        </div>
        <div class="text-center">
          <div class="w-12 h-12 rounded-full bg-[var(--ch-accent-soft)] flex items-center justify-center text-xl font-bold color-[var(--ch-accent)] mx-auto mb-4">2</div>
          <h3 class="font-semibold mb-2 color-[var(--ch-text-1)]">{{ $t('home_content.step2_title') }}</h3>
          <p class="text-sm color-[var(--ch-text-2)] leading-relaxed">{{ $t('home_content.step2_desc') }}</p>
        </div>
        <div class="text-center">
          <div class="w-12 h-12 rounded-full bg-[var(--ch-accent-soft)] flex items-center justify-center text-xl font-bold color-[var(--ch-accent)] mx-auto mb-4">3</div>
          <h3 class="font-semibold mb-2 color-[var(--ch-text-1)]">{{ $t('home_content.step3_title') }}</h3>
          <p class="text-sm color-[var(--ch-text-2)] leading-relaxed">{{ $t('home_content.step3_desc') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

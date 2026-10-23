<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { withBase, useData } from 'vitepress'
import { useI18n } from 'vue-i18n'
import type { ChallengeData } from '../../../platform/shared/challenges.data'
import ShortLinkShare from './ShortLinkShare.vue'
import ChallengeDoneBadge from './ChallengeDoneBadge.vue'
import { useChallengeProgress } from '../composables/useChallengeProgress'
import { useProgressBlockReason } from '../composables/useSessionGate'
import type { ShortLinkLocale } from '../../challenge/shortLink'

const { locale, t } = useI18n()
const { localeIndex } = useData()

// The short link's locale comes from the page, not from the vue-i18n runtime.
// The runtime instance starts at `en` and only reaches the right value after
// hydration, so reading it here would ship `/c/001` into the static HTML of the
// zh-TW list and correct it to `/zh/c/001` on hydration — a visible flip, and
// the wrong link for a reader who copies before that happens.
const pageLocale = computed<ShortLinkLocale>(() => (localeIndex.value === 'zh-TW' ? 'zh-TW' : 'en'))

/**
 * Translate at the PAGE locale, the way the merged nav's `tp` does.
 *
 * `$t` reads the vue-i18n runtime instance, which starts at `en` and only reaches the
 * right value after hydration. Measured on a real build, the zh-TW list page ships
 * `placeholder="Search challenges, descriptions, tags…"` — and it is NEVER corrected.
 * Sibling `$t` strings rendered as text children do get fixed on hydration (the
 * difficulty select's first option, the result count), but a placeholder is an element
 * prop and Vue's hydration does not re-apply props. An earlier version of this comment
 * said hydration corrects it; that was wrong, and it made the defect sound temporary.
 * It is a pre-existing defect across this component's toolbar and it is not fixed here.
 *
 * The two strings below are kept out of it for two DIFFERENT reasons, and an earlier
 * version of this comment gave only the first and applied it to both:
 *
 *  - `completed_badge` also renders in the merged nav, which already translates at the
 *    page locale. Left on `$t` it would say different words on the two surfaces of one
 *    zh-TW page.
 *  - `progress_summary` renders here and nowhere else, so that reason does not apply to
 *    it. It is on `tp` because it is the only string in this toolbar that states a fact
 *    about the reader, and shipping "Solved 0 of 9" into a zh-TW page is worse than
 *    shipping an English placeholder: it reads as an assertion, not as furniture.
 *
 * An earlier version of this comment claimed the cost was a mixed-language toolbar on
 * the built zh-TW page. Measured, that state never occurs: the summary is gated on the
 * progress read, so the static HTML contains no summary at all, and after hydration the
 * result count beside it is Chinese too. The real cost is narrower — the placeholder
 * above stays English for good — and it is not caused by this decision.
 */
const tp = (key: string, named?: Record<string, unknown>) =>
  named ? t(key, named, { locale: pageLocale.value }) : t(key, {}, { locale: pageLocale.value })

const props = defineProps<{
  challenges: ChallengeData[]
}>()

// ─── Reactive state ─────────────────────────────────────────────────────────
const searchQuery = ref('')
const debouncedQuery = ref('')
const difficultyFilter = ref('')
const categoryFilter = ref('')
const sortField = ref<'id' | 'difficulty' | 'category' | 'date'>('id')
const sortDir = ref<'asc' | 'desc'>('asc')
const viewMode = ref<'grid' | 'list'>('list')

// ─── Completion ──────────────────────────────────────────────────────────────
//
// Read after mount, never during render. Progress lives in this visitor's own
// browser storage: it does not exist at build time and it does not exist on the
// server, so the statically rendered list shows every challenge as uncompleted and
// the markers arrive on hydration. Rendering the list inside <ClientOnly> would
// avoid the change but drop the whole list out of the static HTML, which costs
// crawlers and no-JS readers the content to save one badge.
//
// Failed reads offer retry; only successful reads support a completion count.
const { completedSlugs, settled: progressSettled, failed: progressFailed, load: loadProgress } = useChallengeProgress()
onMounted(() => { void loadProgress() })

/**
 * Why the numbers are not here, when they are not.
 *
 * Withholding them is not new; saying why is. The shared-machine choice is put on screen
 * on the challenge pages only — there is nothing of a previous learner's to act on out
 * here — so a learner who lands on this page first is never asked, and the pair of numbers
 * waits on something they have to go and do.
 *
 * Read from the gate rather than derived from `progressSettled`: that flag cannot tell
 * "the check has not finished" from "the check finished and the answer is no", and those
 * two call for opposite things. While it is still running, saying anything would be an
 * instruction withdrawn on the next tick.
 */
const progressBlockReason = useProgressBlockReason()

/**
 * The key a challenge's progress is stored under, recovered from its URL.
 *
 * The recording side keys by the challenge's directory name, taken from the page's
 * relativePath. That same name is the last path segment here — `/challenge/door-is-
 * open/` — so the two halves agree without the list needing a second field. The URL
 * arrives with a trailing slash from the build and without one from a hand-written
 * fixture, and both have to resolve to the same key.
 */
function slugOf(c: ChallengeData): string {
  const path = (c.url ?? '').replace(/\.html$/, '').replace(/\/+$/, '')
  return path.split('/').pop() ?? ''
}

function isCompleted(c: ChallengeData): boolean {
  return completedSlugs.value.has(slugOf(c))
}

/**
 * How many of the challenges on this page the learner has solved.
 *
 * Counted over `props.challenges`, not over `filteredChallenges`: the pair of numbers
 * is about progress through the platform, and a total that moved while someone typed
 * in the search box would be reporting something else entirely.
 *
 * Intersected with the received challenges rather than counting the stored records:
 * a retired or renamed challenge leaves its progress behind, and counting those would
 * put the completed count above the total.
 */
const completedCount = computed(() => props.challenges.filter(isCompleted).length)

// ─── Inline debounce (300ms) ─────────────────────────────────────────────────
let debounceTimer: ReturnType<typeof setTimeout>
watch(searchQuery, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { debouncedQuery.value = val }, 300)
})

// ─── Computed ────────────────────────────────────────────────────────────────
const categories = computed(() =>
  [...new Set(props.challenges.map(c => c.category).filter(Boolean))] as string[]
)

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'mystery']

const filteredChallenges = computed(() => {
  let list = props.challenges

  // Text search: title + description + tags
  const q = debouncedQuery.value.toLowerCase().trim()
  if (q) {
    list = list.filter(c => {
      const inTitle = c.title.toLowerCase().includes(q)
      const inDesc  = (c.description ?? '').toLowerCase().includes(q)
      const inTags  = (c.tags ?? []).join(' ').toLowerCase().includes(q)
      return inTitle || inDesc || inTags
    })
  }

  // Difficulty filter
  if (difficultyFilter.value) {
    list = list.filter(c => c.difficulty === difficultyFilter.value)
  }

  // Category filter
  if (categoryFilter.value) {
    list = list.filter(c => c.category === categoryFilter.value)
  }

  // Sort
  const dir = sortDir.value === 'asc' ? 1 : -1
  list = [...list].sort((a, b) => {
    if (sortField.value === 'id') {
      // Same resolution as the badge, so sorting by ID orders by the number the
      // row displays rather than by a second, invisible one.
      const ai = typeof a.number === 'number' ? a.number : (typeof a.id === 'number' ? a.id : parseInt(String(a.id ?? 0)))
      const bi = typeof b.number === 'number' ? b.number : (typeof b.id === 'number' ? b.id : parseInt(String(b.id ?? 0)))
      return (ai - bi) * dir
    }
    if (sortField.value === 'difficulty') {
      const ai = DIFFICULTY_ORDER.indexOf(a.difficulty ?? 'mystery')
      const bi = DIFFICULTY_ORDER.indexOf(b.difficulty ?? 'mystery')
      return (ai - bi) * dir
    }
    if (sortField.value === 'category') {
      return ((a.category ?? '').localeCompare(b.category ?? '')) * dir
    }
    if (sortField.value === 'date') {
      const da = a.date ? new Date(a.date).getTime() : 0
      const db = b.date ? new Date(b.date).getTime() : 0
      return (da - db) * dir
    }
    return 0
  })

  return list
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
const difficultyBadge: Record<string, string> = {
  easy:    'ch-badge-easy',
  medium:  'ch-badge-medium',
  hard:    'ch-badge-hard',
  mystery: 'ch-badge-mystery',
}
const categoryBadge: Record<string, string> = {
  web: 'ch-badge-web',
}

/**
 * The number shown on the row, `#001`.
 *
 * Prefers the frontmatter number so the badge and a short link below it, on a
 * Cloudflare Pages build, are the same number; on any other build the link is the
 * challenge page's URL, built from the slug. `id` remains the fallback for a
 * challenge that has not been numbered yet; that one shows a badge and no link.
 */
function paddedId(c: ChallengeData): string {
  const n = typeof c.number === 'number' ? c.number : (typeof c.id === 'number' ? c.id : parseInt(String(c.id ?? 0)))
  return `#${String(n).padStart(3, '0')}`
}

function formatDate(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString(locale.value === 'zh-TW' ? 'zh-TW' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function toggleSortDir(): void {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
}
</script>

<template>
  <div class="max-w-screen-xl mx-auto px-6 py-10">
    <header class="mb-8">
      <h1 class="text-[2em] font-bold m-0 mb-2 color-[var(--ch-text-1)]">Challenges</h1>
      <p class="m-0 color-[var(--ch-text-2)]">Choose a challenge to begin</p>
    </header>

    <!-- Toolbar -->
    <div class="flex flex-wrap gap-3 mb-6 items-center">
      <!-- Search -->
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="$t('challenge_list.search_placeholder')"
        class="ch-input flex-1 min-w-[180px]"
      />

      <!-- Difficulty filter -->
      <select v-model="difficultyFilter" class="ch-select">
        <option value="">{{ $t('challenge_list.all_difficulties') }}</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
        <option value="mystery">Mystery</option>
      </select>

      <!-- Category filter -->
      <select v-model="categoryFilter" class="ch-select">
        <option value="">{{ $t('challenge_list.all_categories') }}</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>

      <!-- Sort field -->
      <select v-model="sortField" class="ch-select">
        <option value="id">{{ $t('challenge_list.sort_by_id') }}</option>
        <option value="difficulty">{{ $t('challenge_list.sort_by_difficulty') }}</option>
        <option value="category">{{ $t('challenge_list.sort_by_category') }}</option>
        <option value="date">{{ $t('challenge_list.sort_by_date') }}</option>
      </select>

      <!-- Sort direction toggle -->
      <button
        :class="['ch-view-btn', 'text-sm font-mono']"
        :title="$t(sortDir === 'asc' ? 'challenge_list.sort_dir_asc' : 'challenge_list.sort_dir_desc')"
        @click="toggleSortDir"
      >{{ sortDir === 'asc' ? '↑' : '↓' }}</button>

      <!-- Grid/List toggle -->
      <div class="flex gap-1 ml-auto">
        <button
          :class="viewMode === 'grid' ? 'ch-view-btn-active' : 'ch-view-btn'"
          :title="$t('challenge_list.view_mode_grid')"
          @click="viewMode = 'grid'"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
            <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
          </svg>
        </button>
        <button
          :class="viewMode === 'list' ? 'ch-view-btn-active' : 'ch-view-btn'"
          :title="$t('challenge_list.view_mode_list')"
          @click="viewMode = 'list'"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/>
            <rect x="1" y="12" width="14" height="2" rx="1"/>
          </svg>
        </button>
      </div>

      <!--
        Two different counts sit next to each other on purpose. The one on the left
        answers "how much have I solved" and never moves while filtering; the one on
        the right answers "how many am I looking at" and moves with every keystroke.

        The left one renders only once a read has come back. Absence of a marker is an
        absence and can be shipped in static HTML honestly; a NUMBER cannot. An earlier
        version rendered it unconditionally, so every built page — and every no-JS
        reader and crawler, permanently — was told "Solved 0 of 9" about a visitor the
        build had never met.
      -->
      <span
        v-if="progressSettled && !progressFailed"
        data-progress-summary
        class="text-sm color-[var(--ch-text-3)] whitespace-nowrap"
      >{{ tp('challenge_progress.progress_summary', { completed: completedCount, total: challenges.length }) }}</span>

      <!--
        The place the pair would occupy, when the pair is waiting on the learner rather
        than on a read. Carries no number: "Solved 0 of 9" here would be a claim about a
        visitor this page has not been allowed to look up, which is the mistake the
        summary above was written to stop shipping in static HTML.

        `undecided` only. `checking` renders nothing, because the numbers may arrive on the
        next tick and an instruction that is withdrawn as it is read is worse than silence.
      -->
      <span
        v-if="progressBlockReason === 'undecided'"
        data-progress-blocked
        class="text-sm color-[var(--ch-text-3)]"
      >{{ tp('challenge_progress.blocked_undecided') }}</span>

      <span v-if="progressFailed" data-progress-error role="alert" class="text-sm color-[var(--ch-warn)]">
        {{ tp('challenge_progress.read_error') }}
        <button data-progress-retry class="underline cursor-pointer" @click="loadProgress">{{ tp('challenge_progress.retry') }}</button>
      </span>

      <!-- Result count -->
      <span class="text-sm color-[var(--ch-text-3)] whitespace-nowrap">{{ filteredChallenges.length }} {{ $t('challenge_list.count_suffix') }}</span>
    </div>

    <!-- Empty state -->
    <div
      v-if="filteredChallenges.length === 0"
      class="py-20 text-center color-[var(--ch-text-3)]"
    >
      <div class="text-4xl mb-4">🔍</div>
      <p class="text-base">{{ $t('challenge_list.empty_state') }}</p>
    </div>

    <!-- Grid view -->
    <div
      v-else-if="viewMode === 'grid'"
      class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
    >
      <a
        v-for="c in filteredChallenges"
        :key="c.url"
        data-challenge-card
        data-challenge-link
        :href="withBase(c.url)"
        class="ch-card flex flex-col"
      >
        <!-- Title line: ID + Title -->
        <div class="flex items-center gap-2 mb-2">
          <span class="font-mono text-[0.75em] color-[var(--ch-accent)] font-bold shrink-0">{{ paddedId(c) }}</span>
          <span class="font-semibold text-[1.1em] color-[var(--ch-text-1)] leading-snug">{{ c.title }}</span>
        </div>
        <!-- Badges line -->
        <div class="flex gap-[6px] flex-wrap mb-3">
          <span v-if="c.difficulty" :class="difficultyBadge[c.difficulty] ?? 'ch-badge'">{{ c.difficulty }}</span>
          <span v-if="c.category" :class="categoryBadge[c.category] ?? 'ch-badge'">{{ c.category }}</span>
          <!-- The card's badge row wraps and truncates nothing, so it can afford the
               word at every width. -->
          <ChallengeDoneBadge v-if="isCompleted(c)" label-mode="always" :label="tp('challenge_progress.completed_badge')" />
        </div>
        <!-- Description block -->
        <p v-if="c.description" class="m-0 mb-3 text-[0.85em] color-[var(--ch-text-2)] line-clamp-2 leading-relaxed">
          {{ c.description }}
        </p>
        <!-- Footer: Tags + Date -->
        <div class="flex items-center gap-2 mt-auto">
          <div v-if="c.tags && c.tags.length > 0" class="flex flex-wrap gap-1">
            <span v-for="tag in c.tags" :key="tag" class="ch-tag">{{ tag }}</span>
          </div>
          <span class="flex-1"></span>
          <span v-if="c.date" class="text-[0.75em] color-[var(--ch-text-3)] shrink-0 whitespace-nowrap">{{ formatDate(c.date) }}</span>
        </div>
      </a>
    </div>

    <!-- List view -->
    <div v-else class="rounded-xl border border-[var(--ch-border)] overflow-hidden">
      <a
        v-for="c in filteredChallenges"
        :key="c.url"
        :href="withBase(c.url)"
        class="ch-list-row no-underline"
      >
        <!-- Line 1: ID + Title + Badges + Date -->
        <div class="flex items-center gap-2 w-full">
          <span class="font-mono text-[0.75em] color-[var(--ch-accent)] font-bold shrink-0">{{ paddedId(c) }}</span>
          <span data-row-title class="font-medium color-[var(--ch-text-1)] truncate">{{ c.title }}</span>
          <span v-if="c.difficulty" :class="difficultyBadge[c.difficulty] ?? 'ch-badge'" class="shrink-0">{{ c.difficulty }}</span>
          <span v-if="c.category" :class="categoryBadge[c.category] ?? 'ch-badge'" class="shrink-0">{{ c.category }}</span>
          <!--
            Last of the badges, immediately before the `ml-auto` date, which holds the
            row's free space. Where that free space exists the badge's arrival comes out
            of it and nothing already on the line moves; where it does not, the title is
            the only shrinkable item and the title pays. Both halves are true and the
            boundary between them is measured, not assumed — see the G-E sweep in
            evidence/gates.txt for the per-row numbers and where they cross zero.

            Two earlier designs failed here and both failed the same way, by being
            described more confidently than they had been measured. One reserved a fixed
            slot for every reader at every width; the other claimed absorption without
            qualification. The measurement that settled it had to render an actual marker
            on every row — a sweep with no marker, or with one on the shortest-titled row
            only, reports a boundary that is not the list's.
          -->
          <ChallengeDoneBadge
            v-if="isCompleted(c)"
            class="shrink-0"
            :label="tp('challenge_progress.completed_badge')"
          />
          <span class="text-[0.75em] color-[var(--ch-text-3)] shrink-0 ml-auto whitespace-nowrap">{{ formatDate(c.date) }}</span>
        </div>
        <!-- Line 2: Description + Tags -->
        <div class="flex items-center gap-2 w-full" v-if="c.description || (c.tags && c.tags.length > 0)">
          <span v-if="c.description" class="text-[0.8em] color-[var(--ch-text-2)] truncate">{{ c.description }}</span>
          <div v-if="c.tags && c.tags.length > 0" class="flex gap-1 shrink-0 ml-auto">
            <span v-for="tag in c.tags" :key="tag" class="ch-tag">{{ tag }}</span>
          </div>
        </div>
        <!--
          Line 3: the link, the short link on a Cloudflare Pages build and the challenge page's
          URL on any other. Its own line rather than squeezed onto line 1, so that it keeps as
          much of the URL in view as the row allows and stays selectable at any width: selecting
          it by hand is the path a reader takes when the clipboard is refused. Where it does not
          fit it is cut with an ellipsis, as in the nav (D2), and its title shows the whole URL on
          hover; it never gets narrower than 6ch (D14), and a plain click on it selects all of it,
          the cut part too, instead of opening the challenge (D4). The control lays its parts out
          on this line, which wraps so the failure message can take a line below when it needs one.
        -->
        <div class="flex flex-wrap items-center gap-x-1 gap-y-0.5 w-full">
          <ShortLinkShare :number="c.number" :slug="slugOf(c)" :locale="pageLocale" />
        </div>
      </a>
    </div>
  </div>
</template>

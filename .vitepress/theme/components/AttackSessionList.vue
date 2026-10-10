<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { AttackSession, ActivityTrace } from '../composables/useChallengePersistence'
import type { ProgressBlockReason } from '../composables/useSessionGate'

const props = defineProps<{
  /** Every attempt stored for the open challenge, in whatever order the store holds them. */
  load: () => Promise<AttackSession[]>
  /** Every removal recorded for the open challenge. */
  loadTraces?: () => Promise<ActivityTrace[]>
  /**
   * The attempt the page is holding. The clear never takes it, so it is also what the
   * count of removable attempts is measured against.
   */
  currentSessionId?: string | null
  /** The attempt currently chosen for export, or `null` for the attempt in progress. */
  selectedId?: string | null
  blocked?: boolean
  blockReason?: ProgressBlockReason
}>()
const emit = defineEmits<{ select: [string | null]; import: []; clear: [number] }>()

const sessions = ref<AttackSession[]>([])
const traces = ref<ActivityTrace[]>([])
const failed = ref(false)
const loaded = ref(false)

const blockedMessageKey = computed(() =>
  props.blockReason === 'checking' ? 'flag_submission.checking' : 'flag_submission.awaiting_decision',
)

/**
 * Most recently started first, sorted here rather than trusted from the caller.
 *
 * The store's index is keyed by slug, so rows sharing a slug come back in whatever
 * order it holds them, and the reading order the learner needs is the opposite of the
 * oldest-first order the storage layer returns.
 */
const ordered = computed(() => [...sessions.value].sort((a, b) => b.startedAt - a.startedAt))

/** Most recent first, the same reading order the attempts use. */
const orderedTraces = computed(() => [...traces.value].sort((a, b) => b.at - a.at))

/**
 * How many attempts a clear would take.
 *
 * The attempt in progress is excluded because the clear never takes it — showing a
 * count that included it would promise a removal that does not happen.
 */
const removableCount = computed(() =>
  sessions.value.filter(session => session.sessionId !== props.currentSessionId).length)

async function reload(): Promise<void> {
  // Reading is itself the thing withheld, not just the rendering of what was read. On a
  // shared machine these rows can be the previous person's, and whose they are is
  // exactly what the stored-work decision has not yet answered.
  if (props.blocked) return
  failed.value = false
  try {
    const [loadedSessions, loadedTraces] = await Promise.all([
      props.load(),
      props.loadTraces?.() ?? Promise.resolve([]),
    ])
    sessions.value = loadedSessions
    traces.value = loadedTraces
    loaded.value = true
  } catch {
    sessions.value = []
    traces.value = []
    loaded.value = false
    failed.value = true
  }
}

onMounted(reload)
// The decision can be answered after this list is on screen; the rows appear then
// rather than on the next page load.
watch(() => props.blocked, blocked => { if (!blocked) void reload() })

defineExpose({ reload })

const when = (at: number) => new Date(at).toLocaleString()
</script>
<template>
  <!--
    The disclosure lives here rather than around this component, so the panel is named
    exactly once and by visible text.
    An `aria-label` was tried and is wrong on this page: the site is server-rendered in
    the default locale and switches after hydration, and Vue patches mismatched text but
    leaves mismatched attributes at their server value. A translated attribute is
    therefore frozen in the wrong language for the life of the page, with nothing on
    screen to show it. `<summary>` is text, so it is patched.
  -->
  <details class="session-list">
    <summary>{{ $t('attack_session_list.heading') }}</summary>
    <p v-if="blocked" data-session-list-blocked>{{ $t(blockedMessageKey) }}</p>
    <p v-else-if="failed" role="alert">{{ $t('attack_session_list.failed') }}</p>
    <template v-else>
      <p v-if="loaded && ordered.length === 0">{{ $t('attack_session_list.empty') }}</p>
      <ul v-else>
        <li v-for="session in ordered" :key="session.sessionId" :data-session-row="session.sessionId">
          <span>{{ $t('attack_session_list.started') }} {{ when(session.startedAt) }}</span>
          <span>{{ session.solvedAt === null ? $t('attack_session_list.unsolved') : $t('attack_session_list.solved') }}</span>
          <span>{{ $t('attack_session_list.events') }} <b data-session-events>{{ session.events.length }}</b></span>
          <span>{{ $t('attack_session_list.source') }} {{ session.origin ? $t('attack_session_list.source_imported') : $t('attack_session_list.source_local') }}</span>
          <button
            type="button"
            data-session-select
            :aria-pressed="selectedId === session.sessionId"
            @click="emit('select', selectedId === session.sessionId ? null : session.sessionId)"
          >{{ selectedId === session.sessionId ? $t('attack_session_list.deselect') : $t('attack_session_list.select') }}</button>
        </li>
      </ul>
      <p v-if="ordered.length">{{ $t('attack_session_list.selected_note') }}</p>

      <template v-if="orderedTraces.length">
        <h4>{{ $t('attack_log_deletion.trace_heading') }}</h4>
        <ul>
          <!--
            Traces carry no select control. A trace is not an attempt: there is nothing
            to export, and offering the same button on both would say there is.
          -->
          <li v-for="trace in orderedTraces" :key="trace.id" :data-trace-row="trace.id">
            <template v-if="trace.kind === 'removed'">{{ $t('attack_log_deletion.trace_line_removed', { count: trace.removed.length, when: when(trace.at) }) }}</template>
            <template v-else-if="trace.kind === 'exported'">{{ $t('attack_log_deletion.trace_line_exported', { when: when(trace.at), mode: $t(`attack_log_deletion.trace_mode_${trace.mode}`) }) }}</template>
            <template v-else>{{ $t('attack_log_deletion.trace_line_imported', { when: when(trace.at) }) }}</template>
          </li>
        </ul>
        <p>{{ $t('attack_log_deletion.trace_bound') }}</p>
      </template>
    </template>
    <p v-if="!blocked && loaded && removableCount === 0">{{ $t('attack_log_deletion.nothing_to_remove') }}</p>
    <div class="actions">
      <button
        type="button"
        data-import-open
        :disabled="blocked"
        @click="emit('import')"
      >{{ $t('attack_log_import.title') }}</button>
      <button
        type="button"
        data-clear-open
        :disabled="blocked || removableCount === 0"
        @click="emit('clear', removableCount)"
      >{{ $t('attack_log_deletion.clear') }}</button>
    </div>
  </details>
</template>
<style scoped>
.session-list { border: 1px solid var(--ch-border); border-radius: 8px; padding: 12px; }
summary { cursor: pointer; font-size: 0.9rem; }
h4 { font-size: 0.9rem; margin: 12px 0 4px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
li { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 8px; border: 1px solid var(--ch-border); border-radius: 4px; font-size: 0.85rem; }
button { margin-left: auto; border: 1px solid var(--ch-border); border-radius: 4px; padding: 4px 12px; }
button[aria-pressed='true'] { border-color: currentColor; font-weight: 600; }
p { font-size: 0.85rem; margin: 8px 0 0; }
</style>

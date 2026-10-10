<script setup lang="ts">
import { ref } from 'vue'
import type { TrafficEntry } from '../composables/useTrafficLog'

const props = withDefaults(defineProps<{
  trafficLog: TrafficEntry[]
  /** False when the challenge withheld the Repeater tab — hides the send action. */
  canSendToRepeater?: boolean
}>(), { canSendToRepeater: true })

const emit = defineEmits<{
  clear: []
  sendToRepeater: [rawRequest: string]
}>()

const selectedId = ref<number | null>(null)
const detailTab = ref<'request' | 'response'>('request')

function toggleRow(id: number) {
  if (selectedId.value === id) {
    selectedId.value = null
  } else {
    selectedId.value = id
    detailTab.value = 'request'
  }
}

const selectedEntry = () => props.trafficLog.find(e => e.id === selectedId.value) ?? null

function statusClass(status: number): string {
  if (status >= 500) return 'color-red-400'
  if (status >= 400) return 'color-orange-400'
  if (status >= 300) return 'color-yellow-400'
  return 'color-green-400'
}

function formatPath(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url
  }
}

function formatRawRequest(entry: TrafficEntry): string {
  const path = formatPath(entry.url)
  const headerLines = entry.requestHeaders.map(([k, v]) => `${k}: ${v}`)
  const parts = [
    `${entry.method} ${path} HTTP/1.1`,
    ...headerLines,
    '',
    entry.requestBody ?? '',
  ]
  return parts.join('\r\n')
}

function sendToRepeater(entry: TrafficEntry) {
  emit('sendToRepeater', formatRawRequest(entry))
}

function onClear() {
  selectedId.value = null
  emit('clear')
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Toolbar -->
    <div class="flex items-center gap-2 flex-shrink-0 px-3 py-1.5 border-b border-[var(--ch-border)] bg-[var(--ch-bg)]">
      <span class="text-[0.75em] color-[var(--ch-text-2)] font-mono select-none">Network Traffic</span>
      <span
        data-entry-count
        class="text-[0.75em] color-[var(--ch-text-2)] select-none"
      >{{ trafficLog.length }} request{{ trafficLog.length === 1 ? '' : 's' }}</span>
      <div class="flex-1" />
      <button
        data-clear-btn
        class="px-2 py-1 rounded text-[0.8em] border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-1)] cursor-pointer hover:border-[var(--ch-accent)]"
        @click="onClear"
      >
        Clear
      </button>
    </div>

    <!-- Empty state -->
    <div
      v-if="trafficLog.length === 0"
      data-empty-state
      class="flex-1 flex items-center justify-center text-[0.85em] color-[var(--ch-text-2)] select-none"
    >
      No requests recorded yet
    </div>

    <!-- Traffic list + detail -->
    <div v-else class="flex flex-col flex-1 overflow-hidden">
      <!-- Header row -->
      <div class="flex items-center gap-0 flex-shrink-0 px-3 py-1 bg-[var(--ch-bg-soft)] border-b border-[var(--ch-border)] text-[0.72em] color-[var(--ch-text-2)] font-medium select-none">
        <span class="w-6 flex-shrink-0">#</span>
        <span class="w-14 flex-shrink-0">Method</span>
        <span class="flex-1 min-w-0">URL</span>
        <span class="w-14 flex-shrink-0 text-right">Status</span>
        <span class="w-16 flex-shrink-0 text-right">Time</span>
      </div>

      <!-- Scrollable list -->
      <div class="flex-1 overflow-y-auto">
        <template v-for="entry in trafficLog" :key="entry.id">
          <!-- Row -->
          <div
            data-traffic-row
            class="flex items-center gap-0 px-3 py-1.5 border-b border-[var(--ch-border)] cursor-pointer text-[0.8em] font-mono hover:bg-[var(--ch-bg-soft)] transition-colors"
            :class="{ 'bg-[var(--ch-bg-soft)]': selectedId === entry.id }"
            @click="toggleRow(entry.id)"
          >
            <span class="w-6 flex-shrink-0 color-[var(--ch-text-2)]">{{ entry.id }}</span>
            <span class="w-14 flex-shrink-0 font-semibold color-[var(--ch-accent)]">{{ entry.method }}</span>
            <span class="flex-1 min-w-0 truncate color-[var(--ch-text-1)]">{{ formatPath(entry.url) }}</span>
            <span :class="['w-14 flex-shrink-0 text-right font-semibold', statusClass(entry.status)]">{{ entry.status }}</span>
            <span class="w-16 flex-shrink-0 text-right color-[var(--ch-text-2)]">{{ entry.duration }}ms</span>
          </div>

          <!-- Detail panel for selected entry -->
          <div
            v-if="selectedId === entry.id"
            data-entry-detail
            class="border-b border-[var(--ch-border)] bg-[var(--ch-bg)]"
          >
            <!-- Sub-tab bar -->
            <div class="flex items-center gap-0 px-3 pt-2 border-b border-[var(--ch-border)]">
              <button
                data-tab-request
                class="px-3 py-1 text-[0.78em] border-b-2 mr-1 cursor-pointer bg-transparent"
                :class="detailTab === 'request'
                  ? 'border-[var(--ch-accent)] color-[var(--ch-accent)]'
                  : 'border-transparent color-[var(--ch-text-2)] hover:color-[var(--ch-text-1)]'"
                @click.stop="detailTab = 'request'"
              >
                Request
              </button>
              <button
                data-tab-response
                class="px-3 py-1 text-[0.78em] border-b-2 cursor-pointer bg-transparent"
                :class="detailTab === 'response'
                  ? 'border-[var(--ch-accent)] color-[var(--ch-accent)]'
                  : 'border-transparent color-[var(--ch-text-2)] hover:color-[var(--ch-text-1)]'"
                @click.stop="detailTab = 'response'"
              >
                Response
              </button>
              <div class="flex-1" />
              <button
                v-if="props.canSendToRepeater"
                data-send-to-repeater
                class="px-2 py-1 mb-1 rounded text-[0.75em] border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-1)] cursor-pointer hover:border-[var(--ch-accent)] hover:color-[var(--ch-accent)]"
                @click.stop="sendToRepeater(entry)"
              >
                Send to Repeater
              </button>
            </div>

            <!-- Authoring diagnostic: the runtime failed, not the app. Kept out
                 of the header list because no real server sends it. -->
            <div
              v-if="entry.runtimeDiagnostic"
              data-runtime-diagnostic
              class="mx-3 mt-2 px-3 py-2 rounded border border-[var(--ch-warn,#b42318)] bg-[var(--ch-warn-bg,#fef3f2)] text-[0.75em] color-[var(--ch-warn,#b42318)]"
            >
              <strong>Runtime diagnostic:</strong>
              {{ entry.runtimeDiagnostic }}
            </div>

            <!-- Detail content: no whitespace inside <pre> to avoid leading spaces -->
            <!-- eslint-disable-next-line vue/html-indent -->
            <pre data-detail-content class="m-0 p-3 overflow-auto font-mono text-[0.78em] leading-relaxed whitespace-pre-wrap color-[var(--ch-text-1)] max-h-48">{{ detailTab === 'request' ? formatRawRequest(entry) : `HTTP/1.1 ${entry.status}\n${entry.responseHeaders.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${entry.responseBody}` }}</pre>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

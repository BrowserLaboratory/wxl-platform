<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const props = defineProps<{
  slug: string
  dispatch: (request: Request) => Promise<Response>
  disabled?: boolean
  injectedRequest?: string | null
}>()

const requestText = ref(`GET / HTTP/1.1\r\nHost: challenge-${props.slug}.localhost\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\nAccept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\nAccept-Language: en-US,en;q=0.9\r\nAccept-Encoding: gzip, deflate, br\r\nConnection: keep-alive\r\n\r\n`)

watch(
  () => props.injectedRequest,
  (val) => {
    if (val) requestText.value = val
  },
)
const responseText = ref('')
const localStorageSnapshots = useLocalStorage(`challenge-${props.slug}.localhost:repeater-snapshots`, "[]")
const snapshots = ref<{ name: string; content: string }[]>([])

async function send() {
  const req = parseRawRequest(requestText.value)
  if (!req) { responseText.value = 'Error: invalid request format'; return }

  try {
    const res = await props.dispatch(req)
    const body = await res.text()
    const headerLines: string[] = []
    res.headers.forEach((v, k) => headerLines.push(`${k}: ${v}`))
    responseText.value = [
      `HTTP/1.1 ${res.status} ${res.statusText || ''}`,
      ...headerLines,
      '',
      body,
    ].join('\n')
  } catch (err) {
    responseText.value = `Error: ${(err as Error).message}`
  }
}

function snapshotSave2LocalStorage() {
  localStorageSnapshots.value = JSON.stringify(snapshots.value)
}

function snapshotLoadFromLocalStorage() {
  snapshots.value = Array.from(JSON.parse(localStorageSnapshots.value))
}

const showSaveModal = ref(false)
const saveModalName = ref('')

function openSaveModal() {
  saveModalName.value = ''
  showSaveModal.value = true
}

function confirmSave() {
  const name = saveModalName.value.trim()
  if (!name) return
  snapshots.value.push({ name, content: requestText.value })
  snapshotSave2LocalStorage()
  showSaveModal.value = false
}

function cancelSave() {
  showSaveModal.value = false
}

function restoreSnapshot(content: string) {
  requestText.value = content
}

function deleteSnapshot(idx: number) {
  snapshots.value.splice(idx, 1)
  snapshotSave2LocalStorage()
}

function parseRawRequest(raw: string): Request | null {
  const crlf = raw.includes('\r\n') ? '\r\n' : '\n'
  const [headerSection, ...bodyParts] = raw.split(crlf + crlf)
  const lines = headerSection.split(crlf)
  const requestLine = lines[0]
  if (!requestLine) return null

  const parts = requestLine.split(' ')
  const method = parts[0]
  const path = parts[1] ?? '/'

  const headerMap: Record<string, string> = {}
  let host = `challenge-${props.slug}.localhost`
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const name = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    headerMap[name] = value
    if (name.toLowerCase() === 'host') host = value
  }

  // Cookie is a forbidden request header in the Fetch API — transport via X-Wxlsh-Cookie
  const cookieKey = Object.keys(headerMap).find(k => k.toLowerCase() === 'cookie')
  if (cookieKey) {
    headerMap['X-Wxlsh-Cookie'] = headerMap[cookieKey]
    delete headerMap[cookieKey]
  }

  const bodyStr = bodyParts.join(crlf + crlf)
  const url = `https://${host}${path}`

  return new Request(url, {
    method,
    headers: headerMap,
    body: bodyStr || undefined,
  })
}

onMounted(() => {
  snapshotLoadFromLocalStorage()
})
</script>

<template>
  <div class="flex h-full overflow-hidden gap-0">

    <!-- Main pane: request + response (vertical split) -->
    <div class="flex flex-col flex-1 overflow-hidden">

      <!-- Toolbar -->
      <div class="flex items-center gap-2 flex-shrink-0 px-3 py-1.5 border-b border-[var(--ch-border)] bg-[var(--ch-bg)]">
        <span class="text-[0.75em] color-[var(--ch-text-2)] font-mono select-none">Raw HTTP Request</span>
        <div class="flex-1" />
        <button
          data-save-snapshot
          class="px-2 py-1 rounded text-[0.8em] border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-1)] cursor-pointer hover:border-[var(--ch-accent)]"
          @click="openSaveModal"
        >
          + Save
        </button>
        <button
          data-send
          class="px-3 py-1 rounded text-[0.8em] font-medium border-none"
          :class="props.disabled ? 'opacity-40 cursor-not-allowed bg-[var(--ch-bg-soft)] color-[var(--ch-text-2)]' : 'bg-[var(--ch-accent)] color-white cursor-pointer hover:opacity-90'"
          :disabled="props.disabled"
          @click="send"
        >
          Send
        </button>
      </div>

      <!-- Save snapshot modal -->
      <div
        v-if="showSaveModal"
        data-save-modal
        class="flex items-center gap-2 px-3 py-2 border-b border-[var(--ch-border)] bg-[var(--ch-bg-soft)]"
      >
        <span class="text-[0.75em] color-[var(--ch-text-2)] select-none">Snapshot name:</span>
        <input
          v-model="saveModalName"
          type="text"
          class="flex-1 px-2 py-1 rounded border border-[var(--ch-border)] bg-[var(--ch-bg)] color-[var(--ch-text-1)] font-mono text-[0.82em] outline-none focus:border-[var(--ch-accent)]"
          @keydown.enter="confirmSave"
          @keydown.escape="cancelSave"
        />
        <button
          data-save-confirm
          class="px-2 py-1 rounded text-[0.8em] font-medium border-none bg-[var(--ch-accent)] color-white cursor-pointer hover:opacity-90"
          @click="confirmSave"
        >Save</button>
        <button
          data-save-cancel
          class="px-2 py-1 rounded text-[0.8em] border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-2)] cursor-pointer hover:border-[var(--ch-accent)]"
          @click="cancelSave"
        >Cancel</button>
      </div>

      <!-- Request textarea -->
      <textarea
        data-request-input
        v-model="requestText"
        class="flex-1 p-3 border-b border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-1)] font-mono text-[0.82em] leading-relaxed resize-none outline-none focus:bg-[var(--ch-bg)] transition-colors"
        style="min-height: 120px; max-height: 50%;"
        spellcheck="false"
      />

      <!-- Response pane -->
      <div class="flex flex-col flex-1 overflow-hidden">
        <div class="px-3 py-1 text-[0.75em] color-[var(--ch-text-2)] border-b border-[var(--ch-border)] select-none flex-shrink-0">
          Response
        </div>
        <pre
          data-response-output
          class="flex-1 m-0 p-3 overflow-auto color-[var(--ch-text-1)] font-mono text-[0.8em] leading-relaxed whitespace-pre-wrap bg-[var(--ch-bg)]"
        >{{ responseText }}</pre>
      </div>
    </div>

    <!-- Sidebar: saved snapshots -->
    <div
      class="flex-shrink-0 w-44 border-l border-[var(--ch-border)] flex flex-col overflow-hidden bg-[var(--ch-bg-soft)]"
    >
      <div class="px-3 py-1.5 text-[0.75em] font-medium color-[var(--ch-text-2)] border-b border-[var(--ch-border)] select-none flex-shrink-0">
        Saved Snapshots
      </div>

      <ul
        v-if="snapshots.length"
        class="flex-1 overflow-y-auto m-0 p-1 list-none"
      >
        <li
          v-for="(snap, idx) in snapshots"
          :key="snap.name"
          data-snapshot-item
          class="group flex items-center gap-1 px-2 py-1.5 rounded mb-0.5 cursor-pointer text-[0.8em] color-[var(--ch-text-1)] hover:bg-[var(--ch-bg)] hover:color-[var(--ch-accent)] transition-colors"
          @click="restoreSnapshot(snap.content)"
          :title="snap.name"
        >
          <span class="flex-1 truncate font-mono">{{ snap.name }}</span>
          <button
            class="opacity-0 group-hover:opacity-100 px-1 text-[0.85em] color-[var(--ch-text-2)] hover:color-red-400 border-none bg-transparent cursor-pointer leading-none transition-opacity"
            @click.stop="deleteSnapshot(idx)"
            title="Delete snapshot"
          >×</button>
        </li>
      </ul>

      <div
        v-else
        class="flex-1 flex items-center justify-center text-[0.78em] color-[var(--ch-text-2)] px-3 text-center leading-snug"
      >
        No snapshots yet
      </div>
    </div>

  </div>
</template>

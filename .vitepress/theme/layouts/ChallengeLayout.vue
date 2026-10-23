<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onUnmounted } from 'vue'
import { useData, withBase } from 'vitepress'
import { Content } from 'vitepress/client'
import BrowserPanel from '../components/BrowserPanel.vue'
import RepeatPanel from '../components/RepeatPanel.vue'
import NetworkPanel from '../components/NetworkPanel.vue'
import CodeEditorPanel from '../components/CodeEditorPanel.vue'
import FlagSubmit from '../components/FlagSubmit.vue'
import AttackLogExportDialog from '../components/AttackLogExportDialog.vue'
import AttackLogImportDialog from '../components/AttackLogImportDialog.vue'
import AttackSessionList from '../components/AttackSessionList.vue'
import DeleteAttemptsDialog from '../components/DeleteAttemptsDialog.vue'
import type { ExportOptions } from '../lib/attackLogExport'
import PersistenceWarning from '../components/PersistenceWarning.vue'
import MergedNav from '../components/MergedNav.vue'
import SourceViewer from '../components/SourceViewer.vue'
import NotesModal from '../components/NotesModal.vue'
import { transportCookie } from '../composables/usePythonRuntime'
import { createChallengeRuntimeHost, createToolsRuntimeHost, type ChallengeRuntimeHost, type ToolsRuntimeHost } from '../workers/runtimeHost'
import { createChallengeWorker, createToolsWorker } from '../workers/workerFactories'
import { decodeCookieCarrier } from '../composables/cookieCarrier'
import { useTrafficLog } from '../composables/useTrafficLog'
import { useAttackSession, type AttackEvent } from '../composables/useAttackSession'
import { submitFlag, useFlagSubmission } from '../composables/flagSubmission'
import { useChallengePersistence, persistenceError, type AttackSession } from '../composables/useChallengePersistence'
import { prepareImport, type ImportOutcome } from '../lib/attackLogImport'
import { useAttackLogDeletion } from '../composables/useAttackLogDeletion'
import { useProgressAccess, useProgressBlockReason } from '../composables/useSessionGate'
import { useChallengeProgress } from '../composables/useChallengeProgress'
import type { CodeHistoryEntry } from '../composables/codeHistoryLabel'
import { usePentestNotes } from '../composables/usePentestNotes'
import { extractCustomSection } from '../composables/useWasmLoader'
import { APP_KEY, SOURCE_DISPLAY_KEY, RESERVED_FS_KEYS } from '../../challenge/reserved-keys'

// Module-level executionId for linking code_execution ↔ http_request events
let currentExecutionId: string | null = null

const { frontmatter, page } = useData()

// Derive slug from per-folder relativePath: "challenge/door-is-open/index.md" → "door-is-open"
const slug = computed(() => {
  const rel: string = page.value.relativePath ?? ''
  const parts = rel.replace(/\.md$/, '').split('/')
  // Per-folder: take parent dir name; flat fallback: take filename
  return parts.length >= 2 ? parts[parts.length - 2] : parts[parts.length - 1]
})

const fm = computed(() => frontmatter.value)

// ─── Runtime state ───────────────────────────────────────────────────────────
const runtimeReady = ref(false)
const runtimeError = ref<string | null>(null)

// The Code panel's runner. shallowRef because the host owns a Worker and a
// message map; Vue's reactive proxy has no business wrapping either.
const toolsRunner = shallowRef<ToolsRuntimeHost | null>(null)
/**
 * The same host, held independently of readiness.
 *
 * `toolsRunner` is the panel's gating ref and goes null whenever the runner is
 * not usable — during the first warm-up, and during the rebuild a Stop starts.
 * Reaching the host for teardown through that ref meant leaving the page inside
 * either window skipped `destroy()` entirely, and the worker kept its Pyodide
 * download, or its running learner code, for a page nobody is on.
 */
let toolsHost: ToolsRuntimeHost | null = null
const toolsLoading = ref(false)
const toolsError = ref<string | null>(null)

// Set when a runaway execution destroyed the runtime. The learner's session and
// any files their requests wrote are gone by then; without saying so, being
// logged out mid-challenge reads as the challenge being broken.
const runtimeWasReset = ref(false)

// ─── SW readiness gate ───────────────────────────────────────────────────────
// swReady is true only when navigator.serviceWorker.controller is non-null.
// Without this, tools appear enabled before SW can intercept requests.
const swReady = ref(
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    ? navigator.serviceWorker.controller != null
    : false,
)

const toolsDisabled = computed(() => !runtimeReady.value || !swReady.value)

// The runtime lives in a Worker. It is never constructed on this thread: a
// synchronous WebAssembly loop occupies the event loop of whatever thread runs
// it, so a deadline armed here is the only one that can fire.
let runtimeHost: ChallengeRuntimeHost | null = null
let challengePort: MessagePort | null = null  // port1 — page listens here

// ─── Collapsible description panel ───────────────────────────────────────────
const descriptionCollapsed = ref(false)
function toggleDescription() {
  descriptionCollapsed.value = !descriptionCollapsed.value
}

// ─── Tab switching ────────────────────────────────────────────────────────────
type Tab = 'browser' | 'repeater' | 'code' | 'network' | 'source'
const ALL_TABS: { id: Tab; label: string }[] = [
  { id: 'browser', label: 'Browser' },
  { id: 'network', label: 'Network' },
  { id: 'repeater', label: 'Repeater' },
  { id: 'code', label: 'Code' },
]
const DEFAULT_TABS: Tab[] = ['browser', 'network', 'repeater', 'code']

/**
 * White-box mode, read straight from frontmatter.
 *
 * `=== true` rather than truthiness: `source_visible: 'true'` is a YAML string, and the
 * build script gates the payload entry the same way. A typo has to fail closed on both
 * sides or the two disagree.
 */
const sourceVisible = computed(() => fm.value.source_visible === true)

const tabs = computed(() => {
  // Raw frontmatter, so config.ts's array check has not run. A bare `tools:`
  // line parses as null; anything malformed falls back rather than throwing.
  const allowedTools: unknown = fm.value.tools
  const toolTabs = !Array.isArray(allowedTools)
    ? ALL_TABS.filter(t => DEFAULT_TABS.includes(t.id))
    // An explicit allowlist always keeps Browser — every challenge here is web
    // exploitation, so a page with no browser is never what the author meant.
    : ALL_TABS.filter(t => t.id === 'browser' || allowedTools.includes(t.id))
  // Source is NOT part of `tools`. It is governed by `source_visible` alone, so an
  // author cannot end up with a white-box challenge whose source is invisible because
  // a second field went unedited — that failure would be silent in build and at runtime.
  return sourceVisible.value
    ? [...toolTabs, { id: 'source' as Tab, label: 'Source' }]
    : toolTabs
})
const hasTab = (id: Tab) => tabs.value.some(t => t.id === id)
const activeTab = ref<Tab>('browser')

function selectTab(id: Tab): void {
  activeTab.value = id
  if (id === 'code') void ensureToolsPyodide()
}

// ─── Challenge dispatch: directly call runtime (bypasses SW round-trip) ──────
async function dispatch(request: Request): Promise<Response> {
  if (!runtimeHost) {
    return new Response(JSON.stringify({ error: 'runtime not ready' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    return await runtimeHost.handleRequest(request)
  } catch (err: unknown) {
    // The host throws when it has no worker to hand the request to. Panel
    // callers have always been able to assume a Response comes back, and the
    // traffic-log wrapper records one — letting a rejection through loses the
    // log entry as well as the answer.
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ─── Traffic log ──────────────────────────────────────────────────────────────
const { trafficLog, wrap: wrapDispatch, clear: clearTrafficLog } = useTrafficLog()
const trackedDispatch = wrapDispatch(dispatch)

// ─── Forbidden header transport ──────────────────────────────────────────────
// Cookie is a forbidden request-header and Set-Cookie is a forbidden
// response-header in the Fetch API. new Request() and new Response() silently
// drop them. We transport via X-Wxlsh-Cookie / X-Wxlsh-Set-Cookie and convert
// back at the runtime boundary (usePythonRuntime.handleRequest).


// ─── Attack session ──────────────────────────────────────────────────────────
const attackSession = useAttackSession(slug.value, fm.value.title ?? '')
const { loadCodeDraft, listAttackSessions, saveAttackSession, listActivityTraces, saveActivityTrace } = useChallengePersistence()
const { clearChallenge } = useAttackLogDeletion()

// ─── Completion ──────────────────────────────────────────────────────────────
//
// Read here and handed to the nav as a prop, so the bar has no storage dependency of
// its own. Read after mount for the same reason the list does: progress is this
// visitor's, it does not exist on the server, and a render that assumed an answer
// would be asserting one learner's history into every reader's HTML.
//
// Since C1 re-opening a solved challenge starts a fresh attack session and keeps the
// earlier one, so without this the page a returning learner lands on looks exactly
// like a first attempt.
const progressAccess = useProgressAccess()
// One source for both flag entry points: the expanded form and the collapsed bar are
// separate mounts, and the spec requires them to agree about why submission is blocked.
const progressBlockReason = useProgressBlockReason()
const { completedSlugs, failed: progressFailed, load: loadChallengeProgress } = useChallengeProgress()
onMounted(() => { void loadChallengeProgress() })
const challengeCompleted = computed(() => completedSlugs.value.has(slug.value))

// ─── Pentest notes ────────────────────────────────────────────────────────────
const pentestNotes = usePentestNotes(attackSession, slug.value)
const notesModalVisible = ref(false)

function makeSourceDispatch(source: 'browser' | 'repeater' | 'code') {
  return async (request: Request): Promise<Response> => {
    const response = await trackedDispatch(request)
    // After trackedDispatch, the last trafficLog entry is the one just recorded
    const entry = trafficLog.value[trafficLog.value.length - 1]
    if (entry) {
      attackSession.addHttpEvent(entry, source, source === 'code' ? currentExecutionId : null)
    }
    return response
  }
}

const browserDispatch = makeSourceDispatch('browser')
const repeaterDispatch = makeSourceDispatch('repeater')
const codeDispatch = makeSourceDispatch('code')

// ─── Recording callback for the Code panel ───────────────────────────────────
function onCodeExecuted(event: { code: string; output: string; error: boolean; duration: number }) {
  const execId = crypto.randomUUID()
  currentExecutionId = execId
  void attackSession.addCodeExecution(event.code, event.output, event.error, event.duration, execId)
    .then(refreshCodeHistory)
  currentExecutionId = null
}

// ─── Execution history for the Code panel's restore dropdown ─────────────────
//
// Recomputed explicitly rather than derived: `getSession()` returns a plain object, not a
// reactive one, so pushing an event into it changes nothing a computed could observe. The
// two points where the event list can change are session init and each recorded
// execution, and both call this.
const codeHistory = ref<CodeHistoryEntry[]>([])

function refreshCodeHistory(): void {
  const events = attackSession.getSession()?.events ?? []
  codeHistory.value = events
    .filter((e): e is Extract<AttackEvent, { type: 'code_execution' }> => e.type === 'code_execution')
    .map(e => ({ executionId: e.executionId, timestamp: e.timestamp, code: e.code, error: e.error }))
}

// ─── Send to Repeater ─────────────────────────────────────────────────────────
const repeaterInjectedRequest = ref<string | null>(null)
function onSendToRepeater(rawRequest: string) {
  // Honour the allowlist: without a Repeater tab there is no way back out of
  // the panel, so a challenge that withheld it must not be navigated into it.
  if (!hasTab('repeater')) return
  repeaterInjectedRequest.value = rawRequest
  activeTab.value = 'repeater'
}

// ─── Flag verification (via WASM) ────────────────────────────────────────────
// wasm_verify_flag is set after WASM init; holds a reference to the export
let wasmVerifyFlag: ((flagBytes: Uint8Array) => boolean) | null = null

async function verify(submitted: string) {
  if (!progressAccess.value) throw new Error('Progress access requires a stored-work decision')
  return submitFlag(submitted, wasmVerifyFlag, attackSession.addFlagAttempt)
}
const flagSubmission = useFlagSubmission(verify)

/**
 * Whether a session exists to export.
 *
 * A plain ref set where the session is known to have arrived, not a computed over
 * `getSession()`. `getSession()` returns the composable's own non-reactive variable, so a
 * computed reading it settles on the first render — before the async `init()` has run —
 * and never recomputes. Measured: with a healthy database, the export button was missing
 * from a solved challenge, and no unit test saw it because the mock returned a session
 * from the first render.
 */
const hasSession = ref(false)

/**
 * Withheld when there is no session, so `FlagSubmit` renders no export button at all.
 * Measured with the database blocked: the button was present, produced no file, and said
 * nothing — present-and-inert is the failure the warning banner exists to end.
 */
const exportDialogVisible = ref(false)
const exportHandler = computed(() => (hasSession.value ? () => { exportDialogVisible.value = true } : undefined))

// ─── Stored attempts: listing, choosing, importing ───────────────────────────

const importDialogVisible = ref(false)
const sessionList = ref<InstanceType<typeof AttackSessionList> | null>(null)
/**
 * The attempt chosen for export, or `null` for the attempt in progress.
 *
 * It decides what `exportSession` writes and nothing else. Which attempt receives new
 * events stays with `useAttackSession.init`, whose rules exist to keep one person's
 * work from being appended to another's — a choice made on this screen is not evidence
 * about whose the stored attempts are.
 */
const selectedSessionId = ref<string | null>(null)
const storedSessions = ref<AttackSession[]>([])

const clearDialogCount = ref<number | null>(null)

/** Every removal recorded for this challenge, read alongside the attempts. */
function loadStoredTraces() {
  return listActivityTraces(slug.value)
}

/**
 * Remove this challenge's stored attempts apart from the one the page is holding.
 *
 * The attempt in progress is named from the composable rather than from the list, so
 * the removal and the resume rule cannot disagree about which one it is. With no
 * session yet there is nothing the page is holding and nothing that needs excluding,
 * and the empty string matches no id.
 */
function onClear() {
  return clearChallenge(slug.value, attackSession.getSession()?.sessionId ?? '')
}

async function loadStoredSessions(): Promise<AttackSession[]> {
  const sessions = await listAttackSessions(slug.value)
  storedSessions.value = sessions
  return sessions
}

const selectedSession = computed(() => storedSessions.value.find(s => s.sessionId === selectedSessionId.value))

/**
 * Store what one export file describes, or say why it was not stored.
 *
 * The refusal comes back from `prepareImport` unchanged: deciding what makes a package
 * unacceptable belongs to the export-package capability, and restating it here would be
 * a second copy to keep in step. Only the write failure is added, because only the write
 * happens here.
 */
async function onImport(text: string): Promise<ImportOutcome> {
  const prepared = await prepareImport(text, slug.value)
  if (!prepared.ok) return prepared
  try {
    await saveAttackSession(prepared.session)
  } catch {
    return { ok: false, kind: 'write-failed' }
  }
  // Only a stored record is something that happened. A refused file changed nothing, so
  // it leaves nothing — a trace for every attempt would fill the list with non-events
  // and make the ones that matter harder to find.
  //
  // The two ids are what lets someone holding both files line them up without this
  // device ever adopting the other one's traces: what came in, and what it is called here.
  try {
    await saveActivityTrace(slug.value, {
      kind: 'imported',
      sessionId: prepared.session.sessionId,
      sourceSessionId: prepared.session.origin!.sourceSessionId,
      sourceExportedAt: prepared.session.origin!.sourceExportedAt,
    })
  } catch { /* an unrecorded import is still an import */ }
  return { ok: true }
}

async function onExport(options: ExportOptions) {
  let draft: { code: string; updatedAt: number } | null = null
  try {
    const stored = await loadCodeDraft(slug.value)
    if (stored) draft = { code: stored.code, updatedAt: stored.updatedAt }
  } catch {
    // An unreadable draft costs the export one field; it must not cost the export.
  }
  await attackSession.exportSession({
    difficulty: fm.value.difficulty,
    category: fm.value.category,
    backend: fm.value.backend,
    description: fm.value.description,
    fullDescription: fm.value.markdownBody,
  }, draft, options, selectedSession.value)
}

/** Map backend type to its required base micropip packages */
const BASE_PACKAGES: Record<string, string[]> = {
  flask:   ['flask', 'sqlite3'],
  fastapi: ['fastapi', 'anyio', 'sqlite3'],
}

// ─── White-box display source ────────────────────────────────────────────────

/*
 * `RESERVED_FS_KEYS` — the payload keys the challenge's own filesystem must never see —
 * is imported rather than declared here. The build script writes those keys and this
 * page withholds them; spelling them out on both sides let the two drift apart, and a
 * key the page no longer recognised would fall through the filter into the challenge's
 * directory listing as a file its author never wrote.
 */

interface DisplaySourceFile {
  path: string
  content: string
}

/**
 * Three states, and the empty panel is deliberately not one of them: a white-box
 * challenge whose WASM predates this feature has no `__source__` entry, and rendering
 * nothing would read as "this challenge has no source" instead of "re-run keygen".
 */
const STALE_SOURCE_PAYLOAD_MESSAGE =
  'This challenge is marked white-box, but its WASM carries no source payload. Re-run pnpm challenge:keygen for it.'

// Distinct from the stale-payload message on purpose: "re-run keygen" is the wrong
// instruction when the payload was never opened because the runtime did not start.
const RUNTIME_UNAVAILABLE_SOURCE_MESSAGE =
  'The challenge runtime did not start, so its source could not be read. See the runtime status above.'

const displaySourceFiles = ref<DisplaySourceFile[]>([])
const displaySourceLoading = ref(true)
const displaySourceError = ref<string | null>(null)

function loadDisplaySource(
  read: (path: string) => Uint8Array,
  list: (() => string) | undefined,
): void {
  try {
    const present = typeof list === 'function'
      ? (JSON.parse(list()) as string[]).includes(SOURCE_DISPLAY_KEY)
      : false
    if (!present) {
      displaySourceError.value = STALE_SOURCE_PAYLOAD_MESSAGE
      return
    }
    const parsed = JSON.parse(new TextDecoder().decode(read(SOURCE_DISPLAY_KEY))) as {
      files?: DisplaySourceFile[]
    }
    const files = Array.isArray(parsed.files) ? parsed.files : []
    if (files.length === 0) {
      displaySourceError.value = STALE_SOURCE_PAYLOAD_MESSAGE
      return
    }
    displaySourceFiles.value = files
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    displaySourceError.value = `${STALE_SOURCE_PAYLOAD_MESSAGE} (${detail})`
  } finally {
    displaySourceLoading.value = false
  }
}

// ─── Runtime initialization ───────────────────────────────────────────────────

async function initRuntime(): Promise<void> {
  const backend: string = fm.value.backend ?? 'flask'
  const wasmModule: string | undefined = fm.value.wasmModule
  const extraPackages: string[] = fm.value.packages ?? []



  // Guard: skip if frontmatter doesn't have wasmModule (not yet processed)
  if (!wasmModule) {
    runtimeError.value = 'Challenge WASM not available (run pnpm challenge:keygen first)'
    return
  }

  // 1. Fetch per-challenge WASM binary and extract custom section payload.
  //    wasmModule is a base-agnostic root path (e.g. /challenge/<slug>/runtime.wasm);
  //    withBase() prepends the VitePress base so it resolves under a project-site
  //    deployment (/wxl-platform/...) as well as at root locally.
  const wasmResponse = await fetch(withBase(wasmModule))
  const wasmBytes = new Uint8Array(await wasmResponse.arrayBuffer())
  const payloadBytes = extractCustomSection(wasmBytes, 'chall-data')

  if (!payloadBytes) {
    runtimeError.value = 'No chall-data section found in WASM binary'
    return
  }

  // 2. Instantiate the per-challenge WASM module
  const { default: initWasm, wasm_fs_init, wasm_fs_read, wasm_fs_list, wasm_verify_flag } = await import(
    '../../wasm/virtual-fs/virtual_fs.js'
  )
  await initWasm()

  // 3. Initialize FS from the custom section payload (key derivation happens inside WASM)
  wasm_fs_init(slug.value, payloadBytes)

  // 4. Store flag verifier reference for later use
  wasmVerifyFlag = wasm_verify_flag

  // 5. Decrypt all FS entries; separate __app__ from the rest
  //    wasm_fs_read no longer needs an external key — it uses the internally-derived key
  const fsEntries: Record<string, Uint8Array> = {}
  let appCode = ''

  // Read __app__ entry
  const appBytes: Uint8Array = wasm_fs_read(APP_KEY)
  appCode = new TextDecoder().decode(appBytes)

  // Read the display copy, which exists only for white-box challenges. It is a separate
  // payload entry from `__app__` and is never handed to the runtime: the challenge runs
  // the author's source, the learner reads a redacted copy of it.
  if (sourceVisible.value) {
    loadDisplaySource(wasm_fs_read, wasm_fs_list)
  } else {
    displaySourceLoading.value = false
  }

  // Read other FS entries: use wasm_fs_list() to auto-discover all encrypted paths,
  // falling back to frontmatter fs field for legacy WASM binaries without wasm_fs_list.
  const fsPaths: string[] = typeof wasm_fs_list === 'function'
    ? (JSON.parse(wasm_fs_list()) as string[]).filter((p: string) => !RESERVED_FS_KEYS.has(p))
    : Object.keys(fm.value.fs ?? {})
  for (const path of fsPaths) {
    fsEntries[path] = wasm_fs_read(path)
  }

  if (!appCode) {
    runtimeError.value = 'App code not found in encrypted FS'
    return
  }

  // 5. Determine packages: backend defaults + extra from frontmatter
  const packages = [...(BASE_PACKAGES[backend] ?? []), ...extraPackages]

  // 6. Hand the runtime to a Worker (only once — idempotency via initPromise).
  //    Readiness is driven by the host rather than set here, because a rebuild
  //    after a runaway has to move it back to false and then to true again.
  runtimeHost = createChallengeRuntimeHost({
    createWorker: createChallengeWorker,
    onReadyChange: (value) => { runtimeReady.value = value },
    onReset: () => { runtimeWasReset.value = true },
  })
  await runtimeHost.initialize({ backend, appCode, fsEntries, packages })
}

// ─── Code panel runtime (tool layer) ─────────────────────────────────────────
// Deliberately NOT the challenge runtime's Pyodide: that instance owns the
// challenge's virtual filesystem, flag file included, so sharing it let one
// file read bypass every challenge. A separate instance has a separate
// WebAssembly memory and therefore a separate filesystem.
//
// Loaded on first Code tab activation rather than at page init. It costs a
// second Pyodide (measured at roughly three seconds and ~29 MB), and a student
// who never opens the panel should not pay for it. Loading eagerly is also
// worse than it looks: if the student has switched away, background-tab
// throttling stretches the same work several-fold.
let toolsPromise: Promise<void> | null = null

async function ensureToolsPyodide(): Promise<void> {
  if (toolsPromise) return toolsPromise
  toolsLoading.value = true
  toolsError.value = null
  toolsPromise = (async () => {
    try {
      // Learner HTTP is handed back to this thread rather than sent straight to
      // the challenge worker: the traffic log is recorded here, and a direct
      // worker-to-worker channel would bypass the panel the learner reads.
      // Declared first so the callbacks below can name it: they only ever run
      // after a message from the worker, by which point the assignment has
      // happened.
      let host: ToolsRuntimeHost
      host = createToolsRuntimeHost({
        createWorker: createToolsWorker,
        onDispatch: (request) => codeDispatch(request),
        // Readiness moves the ref the panel actually gates on. Storing it in a
        // flag of its own would leave Run offered over a dead worker, which is
        // what shipped for three rounds: the host published `ready` and nothing
        // read it. A Stop passes through false and back to true, which is how
        // Run stays disabled until the replacement has loaded.
        onReadyChange: (isReady) => { toolsRunner.value = isReady ? host : null },
        // Withdrawing the runner without a cause turns the panel into a
        // permanent spinner. `toolsPromise` is cleared so reopening the tab
        // starts a fresh attempt rather than returning the settled one.
        onFailure: (reason) => {
          toolsError.value = reason.message
          toolsPromise = null
        },
      })
      // Held for teardown from the moment it exists, not once it works. The
      // warm-up below is a tens-of-megabytes download, and leaving the page
      // during it is exactly when the worker most needs to be taken with it.
      toolsHost = host
      // Warmed here rather than on the first Run: the download then overlaps
      // with the learner reading the challenge instead of with them waiting.
      // Awaited, not fired and forgotten. `warmUp()` only constructs the
      // worker; the Pyodide download happens inside it, so returning here left
      // the overlay cleared and Run enabled while nothing was loaded yet, and a
      // failed load had no path back at all.
      await host.warmUp()
      toolsRunner.value = host
    } catch (err: unknown) {
      // Surface it. Silently falling back to the challenge runtime's instance
      // would restore the very bypass this split exists to close.
      toolsError.value = err instanceof Error ? err.message : String(err)
      toolsPromise = null
    } finally {
      toolsLoading.value = false
    }
  })()
  return toolsPromise
}

// ─── HANDLE_REQUEST listener ──────────────────────────────────────────────────

async function handleRequest(event: MessageEvent): Promise<void> {
  if (event.data?.type !== 'HANDLE_REQUEST') return
  const { method, url, headers, body, responsePort } = event.data

  try {
    // Transport Cookie past the Fetch API forbidden-header filter
    const reqHeaders: Record<string, string> = {}
    for (const [k, v] of (headers ?? [])) reqHeaders[k] = v
    transportCookie(reqHeaders)

    const request = new Request(url, {
      method,
      headers: reqHeaders,
      body: (method !== 'GET' && method !== 'HEAD' && body) ? body : undefined,
    })

    const response = await trackedDispatch(request)
    const resBodyBuffer = await response.arrayBuffer()

    // Restore X-Wxlsh-Set-Cookie → set-cookie for the Service Worker
    const resHeaders: [string, string][] = []
    for (const [k, v] of response.headers.entries()) {
      if (k.toLowerCase() === 'x-wxlsh-set-cookie') {
        for (const c of decodeCookieCarrier(v)) resHeaders.push(['set-cookie', c])
      } else {
        resHeaders.push([k, v])
      }
    }

    responsePort.postMessage(
      { status: response.status, headers: resHeaders, body: resBodyBuffer },
      [resBodyBuffer],
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    responsePort.postMessage({ status: 500, headers: [], body: new TextEncoder().encode(JSON.stringify({ error: message })).buffer })
  }
}

// ─── Register challenge and set up MessageChannel ─────────────────────────────

function registerWithSW(mc: MessageChannel): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage(
      { type: 'REGISTER_CHALLENGE', slug: slug.value, backend: fm.value.backend ?? 'flask', port: mc.port2 },
      [mc.port2],
    )
  })
}

/**
 * Relay ports this page has replaced. They keep listening for a bounded window
 * — see rebuildChannelAndRegister — then close. Whatever is still here on
 * unmount is closed with the rest.
 *
 * The window is bounded because closing a port is what revokes it: the far end
 * was transferred into the worker and can otherwise invoke handleRequest with
 * any method, url, headers and body and read back the full response, decoded
 * set-cookie carrier included. Retiring forever would trade a hang for a
 * capability that outlives its purpose, and would grow this list without bound
 * every time registerWithSW silently no-ops on a null reg.active.
 */
const retiredPorts: MessagePort[] = []

/**
 * How long a retired port keeps answering. Matches the worker's registration
 * timeout: that is the longest a worker can still be holding the old entry and
 * relaying into it.
 */
const RETIRED_PORT_TTL_MS = 3000

function revokeRetiredPort(port: MessagePort): void {
  const idx = retiredPorts.indexOf(port)
  if (idx === -1) return
  retiredPorts.splice(idx, 1)
  port.removeEventListener('message', handleRequest)
  port.close()
}

/**
 * Retire the current relay channel and register a brand new one.
 *
 * Three things trigger this — the initial mount, a new worker taking control,
 * and the worker asking after it was terminated and restarted. All three need
 * the same four steps, and reusing the existing port is wrong in every one of
 * them: the port's far end lives in the worker, and the worker being replaced
 * or restarted is precisely what these triggers have in common.
 */
function rebuildChannelAndRegister(): void {
  const mc = new MessageChannel()
  // The old port is retired, not closed. registerWithSW defers the actual
  // REGISTER_CHALLENGE behind navigator.serviceWorker.ready, so between this
  // call and the worker recording the new port, the worker may still hold the
  // old entry and relay into it — and postMessage on a closed port is a silent
  // no-op, which hangs that fetch forever rather than failing it. A retired
  // port that keeps listening answers those stragglers; onUnmounted closes them.
  if (challengePort) {
    const retired = challengePort
    retiredPorts.push(retired)
    setTimeout(() => revokeRetiredPort(retired), RETIRED_PORT_TTL_MS)
  }
  challengePort = mc.port1
  challengePort.addEventListener('message', handleRequest)
  challengePort.start()
  registerWithSW(mc)
}

/**
 * The worker broadcasts to every window client, so a page holding a different
 * challenge hears this too. Answering it would hand the worker a channel for
 * the wrong slug.
 */
function onServiceWorkerMessage(event: MessageEvent): void {
  const msg = event.data as { type?: string; slug?: string } | null
  if (msg?.type !== 'REQUEST_REGISTRATION' || msg.slug !== slug.value) return
  rebuildChannelAndRegister()
}

onMounted(async () => {
  // Set up the relay channel — port1 stays in page, port2 goes to SW
  rebuildChannelAndRegister()

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Re-register on SW update with a fresh MessageChannel
      rebuildChannelAndRegister()
      // SW now controls the page — unlock the readiness gate
      swReady.value = true
    })

    // The worker asks for this when its registry comes up empty, which is what
    // an idle-terminated worker looks like after it restarts. controllerchange
    // does not fire in that case — same script, same controller — so without
    // this listener the page never learns it has to register again and every
    // request stays 503 until a reload.
    navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage)

    // Fallback: if controllerchange fired between setup() and onMounted
    // (race when SW installs/activates before the listener is attached),
    // the event was missed. Check the controller directly.
    if (navigator.serviceWorker.controller) {
      swReady.value = true
    } else {
      // First visit or hard refresh: SW may be active but not controlling.
      // dispatch() bypasses the SW (calls runtime directly), and
      // registerWithSW() uses reg.active.postMessage() — neither requires
      // the SW to "control" the page. So active is sufficient.
      navigator.serviceWorker.ready.then((reg) => {
        if (navigator.serviceWorker.controller || reg.active) {
          swReady.value = true
        }
      })
    }
  }

  // Initialize runtime (lazy, idempotent)
  try {
    await initRuntime()
  } catch (err) {
    runtimeError.value = err instanceof Error ? err.message : String(err)
  } finally {
    // The loading flag is cleared inside `initRuntime` only once decryption has run.
    // Every exit before that point — a failed fetch, a WASM without a payload section, a
    // thrown initialiser — would otherwise leave the Source panel announcing a load that
    // will never finish, on a `role="status"` region a screen reader keeps waiting on.
    if (displaySourceLoading.value) {
      displaySourceLoading.value = false
      if (displaySourceError.value === null) {
        displaySourceError.value = RUNTIME_UNAVAILABLE_SOURCE_MESSAGE
      }
    }
  }

  // L3 Playwright spec hook: expose the in-page dispatcher so Playwright e2e
  // tests can drive the runtime without the SW round-trip. Dev/test builds only.
  if (import.meta.env.DEV) {
    ;(globalThis as unknown as { __wxlDispatch?: (req: Request) => Promise<Response> }).__wxlDispatch = trackedDispatch
  }

  // Initialize attack session (non-blocking), then pentest notes
  attackSession.init()
    .then(() => {
      hasSession.value = attackSession.getSession() !== null
      refreshCodeHistory()
      // The panel mounts before `init` has written this visit's record, so its first
      // read finds a challenge with nothing stored and says so — on a first visit that
      // sentence is on screen while the record it denies is being written. Re-read once
      // the attempt exists.
      void sessionList.value?.reload()
    })
    .then(() => pentestNotes.init(slug.value))
    .catch(() => {})
})

onUnmounted(() => {
  // The runtimes now live in Workers, which outlive the component that made
  // them. Before this change a discarded runtime was simply garbage; now
  // leaving the page without this keeps two threads alive, each holding a
  // loaded WebAssembly runtime, for as long as the tab is open.
  runtimeHost?.destroy()
  runtimeHost = null
  toolsHost?.destroy()
  toolsHost = null
  toolsRunner.value = null
  toolsPromise = null

  challengePort?.removeEventListener('message', handleRequest)
  challengePort?.close()
  challengePort = null
  for (const port of retiredPorts.splice(0)) {
    port.removeEventListener('message', handleRequest)
    port.close()
  }
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage)
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: 'UNREGISTER_CHALLENGE', slug: slug.value })
    })
  }
})

</script>

<template>
  <div class="flex flex-col h-100dvh overflow-hidden bg-[var(--ch-bg)] color-[var(--ch-text-1)]">
    <!-- Merged navigation bar (replaces VitePress nav + old challenge header) -->
    <!-- Nothing below this point is being saved while the banner is up. -->
    <PersistenceWarning v-if="persistenceError" :reason="persistenceError" />

    <div v-if="progressFailed" data-progress-error role="alert" class="shrink-0 px-3 py-2 color-[var(--ch-warn)]">
      {{ $t('challenge_progress.read_error') }}
      <button data-progress-retry class="underline cursor-pointer" @click="loadChallengeProgress">{{ $t('challenge_progress.retry') }}</button>
    </div>

    <MergedNav
      :title="fm.title ?? ''"
      :difficulty="fm.difficulty ?? ''"
      :category="fm.category ?? ''"
      :number="typeof fm.number === 'number' ? fm.number : undefined"
      :slug="slug"
      :completed="challengeCompleted"
      :runtimeReady="runtimeReady"
      :runtimeError="runtimeError"
      :noteCount="pentestNotes.noteCount.value"
      :descriptionCollapsed="descriptionCollapsed"
      @open-notes="notesModalVisible = true"
      @toggle-description="toggleDescription"
    />

    <!--
      A runaway execution took the runtime down and a fresh one replaced it. The
      learner's native session and any files their requests wrote are gone; said
      nowhere, being logged out mid-challenge reads as the challenge being
      broken. Dismissible, because it describes something that already finished.
    -->
    <div
      v-if="runtimeWasReset"
      data-runtime-reset
      role="status"
      class="flex items-center gap-2 px-3 py-1.5 text-[0.8em] border-b border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-2)]"
    >
      <span>The challenge runtime was restarted after a request ran too long. Any login or uploaded files from this challenge are gone.</span>
      <button
        data-runtime-reset-dismiss
        class="ml-auto bg-transparent border-none cursor-pointer color-[var(--ch-text-2)] hover:color-[var(--ch-text)]"
        title="Dismiss"
        @click="runtimeWasReset = false"
      >×</button>
    </div>

    <!-- Main content: left + right columns -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left column: description + flag submit -->
      <aside
        data-description-panel
        class="description-column flex flex-col border-r border-[var(--ch-border)] relative overflow-hidden"
        :class="{ collapsed: descriptionCollapsed }"
      >
        <button
          data-description-toggle
          class="absolute top-2 right-2 z-1 bg-[var(--ch-bg-soft)] border border-[var(--ch-border)] rounded px-[6px] py-[2px] cursor-pointer text-[0.75em] color-[var(--ch-text-2)] hover:border-[var(--ch-accent)]"
          :title="descriptionCollapsed ? 'Expand description' : 'Collapse description'"
          @click="toggleDescription"
        >
          {{ descriptionCollapsed ? '▶' : '◀' }}
        </button>

        <div v-show="!descriptionCollapsed" class="vp-doc description-content flex-1 overflow-y-auto p-4 pr-10">
          <Content />
        </div>

        <div v-show="!descriptionCollapsed" class="flex-shrink-0 p-3 border-t border-[var(--ch-border)] bg-[var(--ch-bg)]">
          <AttackSessionList
            ref="sessionList"
            class="mb-2"
            :load="loadStoredSessions"
            :selectedId="selectedSessionId"
            :blocked="!progressAccess"
            :blockReason="progressBlockReason"
            :loadTraces="loadStoredTraces"
            :currentSessionId="attackSession.getSession()?.sessionId ?? null"
            @select="id => selectedSessionId = id"
            @import="importDialogVisible = true"
            @clear="count => clearDialogCount = count"
          />
          <FlagSubmit
            :blocked="!progressAccess"
            :blockReason="progressBlockReason"
            :verify="verify"
            :submission="flagSubmission"
            :onExport="exportHandler"
            :onExportNotes="() => pentestNotes.downloadMarkdown(fm.title, slug)"
          />
        </div>
      </aside>

      <!-- Right column: interaction panels -->
      <main class="vp-raw flex flex-col flex-1 overflow-hidden bg-[var(--ch-bg-panel)]">
        <nav class="flex gap-1 px-3 py-2 border-b border-[var(--ch-border)] flex-shrink-0 overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :data-tab="tab.id"
            :class="['ch-tab-btn', { 'ch-tab-btn-active': activeTab === tab.id }]"
            @click="selectTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </nav>

        <div v-show="activeTab === 'browser'" data-panel="browser" class="flex-1 overflow-auto p-3">
          <BrowserPanel :slug="slug" :dispatch="browserDispatch" :disabled="toolsDisabled" />
        </div>
        <div v-show="activeTab === 'repeater'" data-panel="repeater" class="flex-1 overflow-hidden">
          <RepeatPanel :slug="slug" :dispatch="repeaterDispatch" :disabled="toolsDisabled" :injectedRequest="repeaterInjectedRequest" />
        </div>
        <div v-show="activeTab === 'code'" data-panel="code" class="flex-1 overflow-hidden">
          <CodeEditorPanel :slug="slug" :dispatch="codeDispatch" :disabled="toolsDisabled" :runner="toolsRunner" :runnerLoading="toolsLoading" :runnerError="toolsError" :onCodeExecuted="onCodeExecuted" :codeHistory="codeHistory" />
        </div>
        <div v-show="activeTab === 'network'" data-panel="network" class="flex-1 overflow-hidden">
          <NetworkPanel :trafficLog="trafficLog" :canSendToRepeater="hasTab('repeater')" @clear="clearTrafficLog" @sendToRepeater="onSendToRepeater" />
        </div>
        <div v-if="hasTab('source')" v-show="activeTab === 'source'" data-panel="source" class="flex-1 overflow-hidden">
          <div v-if="displaySourceLoading" data-source-loading role="status" class="p-3 text-[0.85em] color-[var(--ch-text-2)]">
            Loading challenge source&hellip;
          </div>
          <div v-else-if="displaySourceError" data-source-error role="alert" class="p-3 text-[0.85em] color-[var(--ch-text-2)]">
            {{ displaySourceError }}
          </div>
          <SourceViewer v-else :files="displaySourceFiles" />
        </div>
      </main>
    </div>

    <!-- Persistent flag submit bar (visible when description is collapsed) -->
    <div
      v-if="descriptionCollapsed"
      data-flag-bar
      class="shrink-0 px-3 py-2 border-t border-[var(--ch-border)] bg-[var(--ch-bg)]"
    >
      <FlagSubmit
        :blocked="!progressAccess"
        :blockReason="progressBlockReason"
        :verify="verify"
        :submission="flagSubmission"
        :onExport="exportHandler"
        :onExportNotes="() => pentestNotes.downloadMarkdown(fm.title, slug)"
      />
    </div>

    <AttackLogExportDialog v-if="exportDialogVisible" :generate="onExport" @close="exportDialogVisible = false" />

    <AttackLogImportDialog
      v-if="importDialogVisible"
      :run="onImport"
      :blocked="!progressAccess"
      :blockReason="progressBlockReason"
      @imported="sessionList?.reload()"
      @close="importDialogVisible = false"
    />

    <DeleteAttemptsDialog
      v-if="clearDialogCount !== null"
      :count="clearDialogCount"
      :run="onClear"
      @cleared="sessionList?.reload()"
      @close="clearDialogCount = null"
    />

    <!-- Pentest Notes Modal -->
    <NotesModal
      v-if="notesModalVisible"
      :pentestNotes="pentestNotes"
      :challengeTitle="fm.title ?? ''"
      @close="notesModalVisible = false"
    />
  </div>
</template>

<style scoped>
/* Minimal scoped block: only transition rules not expressible as UnoCSS utilities */
.description-column {
  width: 38%;
  min-width: 280px;
  max-width: 480px;
  transition: width 0.25s ease, min-width 0.25s ease, opacity 0.2s ease;
}
.description-column.collapsed {
  width: 0;
  min-width: 0;
  max-width: 0;
  opacity: 0;
  border-right: none;
  overflow: hidden;
  pointer-events: none;
}
</style>

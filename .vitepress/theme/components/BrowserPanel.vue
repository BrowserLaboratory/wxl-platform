<script setup lang="ts">
import { ref, computed, watch, useTemplateRef, onMounted, onUnmounted } from 'vue'
import BrowserChrome from './BrowserChrome.vue'
import { decodeCookieCarrier } from '../composables/cookieCarrier'

const props = defineProps<{
  slug: string
  dispatch: (request: Request) => Promise<Response>
  disabled?: boolean
}>()

const url = ref(`https://challenge-${props.slug}.localhost/`)
const iframeRef = useTemplateRef<HTMLIFrameElement>('iframeEl')

// ─── Request context metadata (consumed by useTrafficLog for display headers) ─
// Forbidden request headers (User-Agent, Referer, Sec-*, etc.) cannot be set
// on Request objects via the Fetch API. Instead, we pass context via custom
// X-Wxlsh-* headers; useTrafficLog.wrap() reads them, strips them, and uses
// them to build the full simulated browser header set for the traffic log.

function withContext(init: RequestInit, context: string, referer?: string): RequestInit {
  const headers = new Headers(init.headers)
  headers.set('X-Wxlsh-Context', context)
  if (referer) headers.set('X-Wxlsh-Referer', referer)
  return { ...init, headers }
}

type ResponseState =
  | { type: 'idle' }
  | { type: 'html'; content: string }
  | { type: 'text'; content: string }

const responseState = ref<ResponseState>({ type: 'idle' })

// ─── Cookie jar ──────────────────────────────────────────────────────────────
// Simulates browser cookie storage. Intercepts Set-Cookie response headers and
// injects Cookie request headers — enabling session-based challenges.

const cookieJar = new Map<string, string>()

// The jar is a plain Map, so nothing that reads it can be tracked. This ref is
// the reactive mirror: every mutation writes it, and every comparison reads it.
// Without it the cached-view warning is a computed over an untracked source —
// it evaluates once when the strip appears and then never again, which is the
// one failure mode the warning exists to rule out.
const cookieHeaderRef = ref('')

/** Canonical form for comparison only: insertion order must not read as change. */
function canonicalCookies(header: string): string {
  return header.split('; ').filter(Boolean).sort().join('; ')
}

function extractCookies(res: Response): void {
  // Set-Cookie is a forbidden response-header name in the Fetch API — both
  // runtimes hand it over on X-Wxlsh-Set-Cookie instead. The carrier format is
  // owned by cookieCarrier.ts and decoded there: a consumer that splits the
  // header itself is a second definition of the contract, and this panel is
  // where that already went wrong once.
  const raw = res.headers.get('x-wxlsh-set-cookie')
  if (!raw) return

  for (const cookie of decodeCookieCarrier(raw, (reason) => {
    console.warn(`[BrowserPanel] ${reason}`)
  })) {
    const match = cookie.match(/^\s*([^=]+)=([^;]*)/)
    if (!match) continue
    const name = match[1].trim()
    const value = match[2]
    if (/max-age=0/i.test(cookie) || /expires=\s*Thu,\s*01[- ]Jan[- ]1970/i.test(cookie)) {
      cookieJar.delete(name)
    } else {
      cookieJar.set(name, value)
    }
  }
  cookieHeaderRef.value = cookieHeaderNow()
}

/** The jar serialized exactly as it is sent, used both to send and to compare. */
function cookieHeaderNow(): string {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

function injectCookies(request: Request): Request {
  if (cookieJar.size === 0) return request
  const cookieHeader = cookieHeaderNow()
  const headers = new Headers(request.headers)
  // Cookie is a forbidden request header in the Fetch API — setting it on a
  // Request's Headers is silently ignored. Transport via X-Wxlsh-Cookie instead;
  // useTrafficLog and usePythonRuntime convert it back to a real Cookie header.
  headers.set('X-Wxlsh-Cookie', cookieHeader)
  return new Request(request, { headers })
}

/**
 * Dispatch with automatic cookie injection / extraction.
 *
 * `gen` gates the extraction: a navigation the user has abandoned must not
 * rotate the session behind their back. Without the gate, pressing back while
 * a request to a session-destroying endpoint is outstanding restores the
 * signed-in view while the response quietly signs them out — and the jar is
 * forward-only, so there is no undo and nothing to disclose it.
 */
async function browserFetch(request: Request, gen?: number): Promise<Response> {
  const res = await props.dispatch(injectCookies(request))
  if (gen === undefined || gen === navGeneration) extractCookies(res)
  return res
}

/**
 * Inject a postMessage-based interceptor script into an HTML string.
 * The script captures link clicks and form submissions inside the iframe
 * and relays them to the parent via postMessage, so that allow-same-origin
 * is not needed in the sandbox (which would defeat the sandbox).
 */
function injectInterceptor(html: string): string {
  const script = `<script>(function(){
  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest&&e.target.closest('a');
    if(!a)return;
    var href=a.getAttribute('href');
    if(!href||href.charAt(0)==='#')return;
    e.preventDefault();
    parent.postMessage({type:'WXLSH_LINK_CLICK',href:href},'*');
  });
  document.addEventListener('submit',function(e){
    e.preventDefault();
    var form=e.target;
    var fields=[];
    var els=form.elements;
    for(var i=0;i<els.length;i++){if(els[i].name)fields.push([els[i].name,els[i].value]);}
    parent.postMessage({type:'WXLSH_FORM_SUBMIT',action:form.getAttribute('action')||'',method:(form.getAttribute('method')||'GET').toUpperCase(),enctype:form.getAttribute('enctype')||'application/x-www-form-urlencoded',fields:fields},'*');
  });
})()<` + `/script>`

  const bodyClose = html.lastIndexOf('</body>')
  if (bodyClose !== -1) return html.slice(0, bodyClose) + script + html.slice(bodyClose)
  return html + script
}

// ─── History stack ───────────────────────────────────────────────────────────
// An entry is committed at the terminal render step, never when a navigation
// starts, so every entry is guaranteed to have a view that can be restored.
// Entries carry no method, body or enctype: nothing here ever replays a request.

interface HistoryEntry {
  url: string
  /** Stored by reference — handleResponse always assigns a fresh object. */
  state: ResponseState
  capturedAt: number
  cookieHeaderAtCapture: string
}

const historyStack = ref<HistoryEntry[]>([])
/** -1 means "nothing committed yet" and is the only empty-stack representation. */
const historyIndex = ref(-1)
const viewIsRestored = ref(false)
const navFailed = ref(false)
const reloadInFlight = ref(false)
/** True once the user edits the URL input after a navigation has started. */
let urlEditedSinceNav = false

function onUrlInput(value: string): void {
  url.value = value
  urlEditedSinceNav = true
}

const canGoBack = computed(() => historyIndex.value > 0)
const canGoForward = computed(
  () => historyIndex.value >= 0 && historyIndex.value < historyStack.value.length - 1,
)

const restoredEntry = computed(() =>
  viewIsRestored.value && historyIndex.value >= 0 ? historyStack.value[historyIndex.value] : null,
)
const cookieChangedSinceCapture = computed(
  () =>
    restoredEntry.value !== null &&
    canonicalCookies(restoredEntry.value.cookieHeaderAtCapture) !==
      canonicalCookies(cookieHeaderRef.value),
)
// Date included: "captured 14:32:10" on a tab left open overnight is
// indistinguishable from ten seconds ago, and staleness is the whole point.
const capturedAtLabel = computed(() =>
  restoredEntry.value ? new Date(restoredEntry.value.capturedAt).toLocaleString('en-GB') : '',
)

// A response superseded by a later navigation or by a cursor move is discarded
// rather than allowed to overwrite the view. A generation counter is used
// instead of an in-flight flag because a rejected dispatch would never clear
// the flag — the link-click path attaches no catch — and the controls would
// stay inert for the rest of the session.
let navGeneration = 0

function commit(
  resolvedUrl: string,
  state: ResponseState,
  asReplace: boolean,
  cookieHeaderAtRequest: string,
): void {
  const entry: HistoryEntry = {
    url: resolvedUrl,
    state,
    capturedAt: Date.now(),
    // Sampled when the request went out, not now: this response may itself have
    // minted the cookie, and folding it in would make the entry compare equal
    // to a jar it never ran under.
    cookieHeaderAtCapture: cookieHeaderAtRequest,
  }
  const current = historyIndex.value >= 0 ? historyStack.value[historyIndex.value] : null
  const atTip = historyIndex.value === historyStack.value.length - 1
  // A replace must leave the entry's URL alone, so it is only available when the
  // committed URL already matches. A reload that redirects away is a navigation.
  const sameUrl = current !== null && resolvedUrl === current.url
  if (current && sameUrl && (asReplace || atTip)) {
    // Replace in place: the forward entries survive.
    historyStack.value.splice(historyIndex.value, 1, entry)
  } else {
    historyStack.value.splice(historyIndex.value + 1)
    historyStack.value.push(entry)
    historyIndex.value = historyStack.value.length - 1
  }
  viewIsRestored.value = false
}

/** Moves the cursor and restores a view. Issues no request and touches no cookie. */
function applyEntry(index: number): void {
  const entry = historyStack.value[index]
  if (!entry) return
  navGeneration++
  historyIndex.value = index
  url.value = entry.url
  responseState.value = entry.state
  navFailed.value = false
  viewIsRestored.value = true
}

function back(): void {
  if (canGoBack.value) applyEntry(historyIndex.value - 1)
}

function forward(): void {
  if (canGoForward.value) applyEntry(historyIndex.value + 1)
}

// ─── Redirect + response rendering ───────────────────────────────────────────

const MAX_REDIRECTS = 5

/**
 * Shared response handler — follows redirects, then updates responseState, the
 * url bar and the history stack. Intermediate redirect hops never reach the
 * terminal step, so a chain collapses to a single entry at its final URL.
 */
async function handleResponse(
  res: Response,
  resolvedUrl: string,
  gen: number,
  cookieHeaderAtRequest: string,
  asReplace = false,
  redirectCount = 0,
): Promise<void> {
  if (gen !== navGeneration) return

  // Follow 3xx redirects (redirect as GET, matching browser behavior for 301/302/303)
  if (res.status >= 300 && res.status < 400 && redirectCount < MAX_REDIRECTS) {
    const location = res.headers.get('location')
    if (location) {
      const base = `https://challenge-${props.slug}.localhost/`
      const target = new URL(location, base).href
      // The url bar is deliberately NOT written here: it must never move ahead
      // of the response that will actually be rendered.
      const req = new Request(target, withContext({ method: 'GET' }, 'navigation'))
      const hopCookies = cookieHeaderNow()
      const redirectRes = await browserFetch(req, gen)
      return handleResponse(redirectRes, target, gen, hopCookies, asReplace, redirectCount + 1)
    }
  }

  const ct = res.headers.get('content-type') ?? ''
  const text = await res.text()
  if (gen !== navGeneration) return

  let state: ResponseState
  if (ct.includes('text/html')) {
    state = { type: 'html', content: injectInterceptor(text) }
  } else {
    let formatted = text
    if (ct.includes('application/json')) {
      try { formatted = JSON.stringify(JSON.parse(text), null, 2) } catch { /* keep raw */ }
    }
    state = { type: 'text', content: formatted }
  }

  // The user's unsubmitted text is theirs: a load finishing underneath it must
  // not stamp the committed URL over what they are typing.
  if (!urlEditedSinceNav) url.value = resolvedUrl
  responseState.value = state
  navFailed.value = false
  commit(resolvedUrl, state, asReplace, cookieHeaderAtRequest)
}

/**
 * Every dispatch path funnels its failure here, so a link click that fails is
 * as visible as a reload that fails. Before this the reload path was the only
 * one with a catch, and deleting the optimistic url-bar write meant a failed
 * link click changed nothing on screen at all.
 */
async function runNavigation(
  gen: number,
  resolvedUrl: string,
  build: () => Request,
  asReplace = false,
): Promise<void> {
  const cookiesAtRequest = cookieHeaderNow()
  try {
    const res = await browserFetch(build(), gen)
    await handleResponse(res, resolvedUrl, gen, cookiesAtRequest, asReplace)
  } catch {
    if (gen === navGeneration) navFailed.value = true
  }
}

function startNavigation(): number {
  urlEditedSinceNav = false
  return ++navGeneration
}

async function navigate() {
  if (props.disabled) return
  const gen = startNavigation()
  const target = url.value
  await runNavigation(gen, target, () =>
    new Request(target, withContext({ method: 'GET' }, 'navigation')))
}

/**
 * Re-issues the committed entry as a GET. Never resends a request body: doing
 * so would re-mint session tokens and destructively overwrite the cookie jar,
 * which has no undo. Deliberate resending is the Repeater's job.
 */
async function reload() {
  if (props.disabled || reloadInFlight.value) return
  const entry = historyIndex.value >= 0 ? historyStack.value[historyIndex.value] : null
  // Reverts unsubmitted typing before dispatching, so the request matches what
  // the address bar shows.
  const target = entry ? entry.url : url.value
  const gen = startNavigation()
  url.value = target

  reloadInFlight.value = true
  try {
    // Keeps the rendered view and the entry untouched on failure; runNavigation
    // surfaces it on the shared strip.
    await runNavigation(gen, target, () =>
      new Request(target, withContext({ method: 'GET' }, 'navigation')), true)
  } finally {
    reloadInFlight.value = false
  }
}

// ─── postMessage handler: receives link/form events from sandboxed iframe ─────
// The iframe runs with sandbox="allow-scripts allow-forms" (no allow-same-origin),
// so its JS cannot access the parent DOM. Instead, an injected script inside
// the srcdoc posts structured messages that are handled here.

function handleIframeMessage(event: MessageEvent) {
  // A restored view is a live page: its links and forms still dispatch. The
  // same gate that stops navigate() and reload() must stop them, otherwise a
  // cached page drives requests into a runtime that is not ready.
  if (props.disabled) return
  if (event.source !== iframeRef.value?.contentWindow) return
  const data = event.data
  if (!data?.type) return

  const base = `https://challenge-${props.slug}.localhost/`
  const referer = url.value

  if (data.type === 'WXLSH_LINK_CLICK') {
    const href = data.href as string
    if (!href || href.startsWith('#')) return
    const resolved = new URL(href, base).href
    // The url bar is written when the response commits, not when the click is
    // relayed — otherwise a failed navigation leaves the bar lying about what
    // is on screen, and reload would target something the user cannot see.
    const gen = startNavigation()
    runNavigation(gen, resolved, () =>
      new Request(resolved, withContext({ method: 'GET' }, 'link', referer)))
  } else if (data.type === 'WXLSH_FORM_SUBMIT') {
    const { action, method, enctype, fields } = data as {
      action: string
      method: string
      enctype: string
      fields: [string, string][]
    }
    const resolvedUrl = action ? new URL(action, base).href : url.value
    const gen = startNavigation()

    if (method === 'GET') {
      const params = new URLSearchParams(fields)
      const sep = resolvedUrl.includes('?') ? '&' : '?'
      const target = params.toString() ? `${resolvedUrl}${sep}${params}` : resolvedUrl
      runNavigation(gen, target, () =>
        new Request(target, withContext({ method: 'GET' }, 'form-get', referer)))
    } else if (enctype === 'multipart/form-data') {
      runNavigation(gen, resolvedUrl, () => {
        const body = new FormData()
        for (const [k, v] of fields) body.append(k, v)
        return new Request(resolvedUrl, withContext({ method, body }, 'form-post', referer))
      })
    } else {
      runNavigation(gen, resolvedUrl, () =>
        new Request(resolvedUrl, withContext({
          method,
          body: new URLSearchParams(fields).toString(),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }, 'form-post', referer)))
    }
  }
}

onMounted(() => {
  window.addEventListener('message', handleIframeMessage)
})

// Auto-navigate when runtime becomes ready (disabled transitions false)
watch(() => props.disabled, (newVal, oldVal) => {
  if (oldVal && !newVal) navigate()
})

onUnmounted(() => {
  window.removeEventListener('message', handleIframeMessage)
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Browser chrome (URL bar + nav buttons) -->
    <BrowserChrome
      :model-value="url"
      :disabled="props.disabled"
      :busy="reloadInFlight"
      :can-go-back="canGoBack"
      :can-go-forward="canGoForward"
      @update:model-value="onUrlInput"
      @navigate="navigate"
      @reload="reload"
      @back="back"
      @forward="forward"
    />

    <!--
      Disclosure, not silence: a restored view is a capture, and saying so is
      the only honest mitigation available — the cookie jar is forward-only, so
      a restored page's forms will submit under the CURRENT identity.
      No traffic-log id is cited here: clearing the log restarts its id
      sequence, so a cited id could name an unrelated later request.
    -->
    <div
      v-if="restoredEntry"
      data-cached-view
      :data-cookie-changed="cookieChangedSinceCapture ? 'true' : 'false'"
      class="px-3 py-1 text-[0.75em] border-b border-[var(--ch-border)]"
      :class="cookieChangedSinceCapture
        ? 'bg-[var(--ch-warn-bg,#fef3f2)] color-[var(--ch-warn,#b42318)]'
        : 'bg-[var(--ch-bg-soft)] color-[var(--ch-text-2)]'"
    >
      cached view · captured {{ capturedAtLabel }} · press ↻ to refetch<span
        v-if="cookieChangedSinceCapture"
      > · session cookies have changed since this capture</span>
    </div>

    <div
      v-if="navFailed"
      data-reload-error
      class="px-3 py-1 text-[0.75em] border-b border-[var(--ch-border)] bg-[var(--ch-warn-bg,#fef3f2)] color-[var(--ch-warn,#b42318)]"
    >
      Navigation failed — the challenge runtime did not respond
    </div>

    <!-- Response viewport -->
    <iframe
      v-if="responseState.type === 'html'"
      ref="iframeEl"
      sandbox="allow-scripts allow-forms"
      :srcdoc="responseState.content"
      class="flex-1 w-full rounded border border-[var(--ch-border)] bg-white"
    />
    <pre
      v-else-if="responseState.type === 'text'"
      data-response-text
      class="flex-1 m-0 p-3 rounded border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-1)] text-[0.8em] font-mono overflow-auto whitespace-pre-wrap"
    >{{ responseState.content }}</pre>
    <div
      v-else
      class="flex-1 flex items-center justify-center color-[var(--ch-text-2)] text-[0.85em]"
    >
      Enter a URL and press Go
    </div>
  </div>
</template>

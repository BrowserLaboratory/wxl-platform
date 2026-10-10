/**
 * Challenge Service Worker
 * Intercepts https://challenge-<slug>.localhost/* and routes to the
 * appropriate runtime via MessageChannel relay (Python) or PHP dispatch.
 *
 * Protocol:
 *   Page → SW: { type: 'REGISTER_CHALLENGE', slug, backend, port: MessagePort }
 *   SW  → Page (broadcast): { type: 'REQUEST_REGISTRATION', slug }
 *   SW  → Page (via port): { type: 'HANDLE_REQUEST', method, url, headers, body, responsePort }
 *   Page → SW (via responsePort): { status, headers, body: ArrayBuffer }
 */

const CHALLENGE_HOST_RE = /^challenge-[^.]+\.localhost$/

/** slug → { backend: string, port: MessagePort } */
const registry = new Map()

/** slug → Array of resolve callbacks waiting for registration */
const pendingRegistrations = new Map()

/**
 * slug → timestamp of the last REQUEST_REGISTRATION broadcast.
 *
 * The suppression window has to track the *ask*, not the wait. A waiter lives
 * for the whole registration timeout, so keying on `pendingRegistrations` would
 * mean a page that mounts late — after an ask nobody could answer — is never
 * asked again, and its request 503s having triggered no broadcast at all.
 * Overlapping requests could extend that suppression indefinitely.
 *
 * Erring short is safe: a superfluous broadcast now only costs one extra
 * channel rebuild, because retired ports keep answering instead of being closed.
 */
const lastAskAt = new Map()
const ASK_DEBOUNCE_MS = 250

/**
 * How long a relayed request waits for the page before the worker gives up.
 *
 * A postMessage to a relay port whose peer is gone — a closed tab, a page that
 * unloaded before UNREGISTER_CHALLENGE, a port already close()d by the retired-
 * port TTL — is a silent no-op. It throws nothing and fires no messageerror, so
 * the response promise never settles and event.respondWith() holds that fetch
 * open for as long as this worker lives. Measured in a real browser at twenty
 * seconds and still pending, with every later request hanging the same way.
 *
 * This value is a fuse, not a measurement of how long a legitimate relay takes.
 * A legitimate relay has no upper bound: the PHP runtime serializes every
 * request onto one promise chain and php-wasm cannot be interrupted. What the
 * value must satisfy is an arithmetic —
 *
 *     RELAY_TIMEOUT_MS + REGISTRATION_TIMEOUT_MS = 18000 < 30000
 *
 * — where 30000 is the Playwright action timeout and the left side is the worst
 * case one browser-visible failure costs: this request burns the deadline, its
 * registration is evicted, and the next request pays a full registration wait.
 * Past 27000 a relay-exercising e2e dies on its own timeout instead of seeing
 * the 504, and the failure stops being attributable.
 *
 * The lower bound is measured, not argued: the second Pyodide the Code panel
 * boots occupies the same main thread the page answers relays on for roughly
 * three seconds. Fifteen seconds is five times that.
 */
const RELAY_TIMEOUT_MS = 15000

/** Names the bare 3000 the registration wait below already used. Only a name. */
const REGISTRATION_TIMEOUT_MS = 3000

/**
 * How often one slug can lose its registration to a relay deadline.
 *
 * Twice the deadline, and the factor is load-bearing. The loop this guards is:
 * a relay times out, its registration is evicted, the next request misses and
 * broadcasts, the page rebuilds its channel, and the rebuilt port times out too
 * — so the second eviction lands about one deadline after the first, and a
 * window equal to the deadline would never catch it. The identity check below
 * does not catch it either: on that second turn the registry really is holding
 * the port that just timed out.
 *
 * A window equal to the deadline is unreachable for the other case as well: two
 * relays that time out one after another are by construction at least one
 * deadline apart, and concurrent ones are already stopped by the identity check
 * because the first eviction leaves no port to match.
 *
 * This window governs how often an eviction may happen. It is not part of the
 * arithmetic above and never lengthens any single request.
 */
const EVICT_DEBOUNCE_MS = RELAY_TIMEOUT_MS * 2
const lastEvictAt = new Map()

/**
 * Not an error. A peer that never answered is a different thing from a runtime
 * that threw, and the two must stay distinguishable at the call site: only the
 * first evicts. Returned rather than thrown so the existing catch is untouched.
 */
const RELAY_TIMED_OUT = Symbol('relay-timed-out')

const production = self.location.hostname !== 'localhost'

// ─── Message handling ─────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const msg = event.data
  if (!msg?.type) return

  if (msg.type === 'REGISTER_CHALLENGE') {
    const entry = { backend: msg.backend ?? 'flask', port: msg.port ?? null }
    registry.set(msg.slug, entry)
    event.source?.postMessage({ type: 'REGISTERED' })

    // Resolve any fetches that arrived before registration
    const resolvers = pendingRegistrations.get(msg.slug)
    if (resolvers) {
      resolvers.forEach(r => r(entry))
      pendingRegistrations.delete(msg.slug)
    }
  } else if (msg.type === 'UNREGISTER_CHALLENGE') {
    registry.delete(msg.slug)
    lastAskAt.delete(msg.slug)
    // Every per-slug map is torn down together, or the ones left behind go on
    // governing a registration that no longer exists. An eviction window earned
    // by the page that just left would otherwise refuse to evict the next page's
    // dead port for the rest of the window — 504 after 504 with no self-heal.
    //
    // Deliberately not done on REGISTER_CHALLENGE, and that asymmetry is
    // load-bearing: the second turn of the rebuild loop this window exists to
    // break is *always* preceded by a re-registration, so clearing it there
    // would disable the guard entirely. An unregister is a teardown; a register
    // is the loop.
    lastEvictAt.delete(msg.slug)
  }
})

// ─── Ask the page to register again ───────────────────────────────────────────

/**
 * The registry lives in this worker's global scope, and the browser terminates
 * an idle worker after roughly thirty seconds — taking the registry and every
 * MessagePort transferred into it. `controllerchange` does not fire when the
 * same script restarts, so the page has no other signal that it must register
 * again. Asking is the signal.
 *
 * Never rejects: no clients to ask, or an ask that throws, is not an error for
 * the request that triggered it. It falls through to the registration timeout
 * and answers 503 — the same shape as when nobody answers.
 */
async function requestRegistration(slug) {
  try {
    // Window clients only. What keeps this from being a slug-hijack primitive is
    // that BrowserPanel renders challenge HTML with sandbox="allow-scripts
    // allow-forms" and *without* allow-same-origin: that iframe is an opaque
    // origin, so it is not a window client, cannot receive this broadcast, and
    // cannot answer with REGISTER_CHALLENGE. Granting allow-same-origin there
    // would let challenge code claim a slug and read every subsequent request's
    // headers, cookies and body. That sandbox flag is load-bearing here.
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clients) {
      try {
        client.postMessage({ type: 'REQUEST_REGISTRATION', slug })
      } catch (err) {
        // One unreachable client must not stop the others being asked. Say so
        // in dev: every failure on this path otherwise collapses into the same
        // 503 as "nobody answered", and the two need different fixes.
        if (!production) console.warn('[challenge-sw] could not ask a client to register', slug, err)
      }
    }
  } catch (err) {
    // clients.matchAll() itself failed. Nothing to do but let the wait time out.
    if (!production) console.warn('[challenge-sw] clients.matchAll() failed while asking for', slug, err)
  }
}

// ─── Wait for registration (safety net for SW-intercepted sub-resource loads) ─

function waitForRegistration(slug, timeoutMs) {
  return new Promise((resolve) => {
    const resolvers = pendingRegistrations.get(slug) ?? []

    function onRegistered(entry) {
      clearTimeout(timer)
      resolve(entry)
    }

    const timer = setTimeout(() => {
      const current = pendingRegistrations.get(slug)
      if (current) {
        const idx = current.indexOf(onRegistered)
        if (idx !== -1) current.splice(idx, 1)
        if (current.length === 0) pendingRegistrations.delete(slug)
      }
      resolve(undefined)
    }, timeoutMs)

    resolvers.push(onRegistered)
    pendingRegistrations.set(slug, resolvers)
  })
}

// ─── Fetch interception ───────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (!CHALLENGE_HOST_RE.test(url.hostname)) return  // pass through

  // Intercepts both regular fetch and navigation requests (request.mode === 'navigate'),
  // e.g. when BrowserPanel iframe link clicks are handled via dispatch().
  event.respondWith(handleChallengeRequest(event.request, url))
})

async function handleChallengeRequest(request, url) {
  const slug = url.hostname.replace(/^challenge-/, '').replace(/\.localhost$/, '')
  let entry = registry.get(slug)

  if (!entry) {
    // Ask once per burst, not once per miss. A page load after an idle
    // termination misses on the document and on every sub-resource at the same
    // moment; one ask each means the page rebuilds its channel that many times.
    const now = Date.now()
    const alreadyAsking = now - (lastAskAt.get(slug) ?? -Infinity) < ASK_DEBOUNCE_MS
    // Install the waiter first, ask second. A page that answers synchronously
    // would otherwise arrive before anyone is listening, and this request would
    // sit out the full timeout for nothing.
    const waiting = waitForRegistration(slug, REGISTRATION_TIMEOUT_MS)
    if (!alreadyAsking) {
      lastAskAt.set(slug, now)
      // Shape-identical to the router's call site. requestRegistration already
      // swallows its own failures, but a bare floating promise here would turn
      // any future edit that lets one escape into an unhandled rejection.
      requestRegistration(slug).catch(() => {})
    }
    entry = await waiting
  }

  if (!entry) {
    return jsonResponse({ error: 'challenge not registered' }, 503)
  }

  try {
    const { backend, port } = entry

    if (backend === 'flask' || backend === 'fastapi' || backend === 'php') {
      if (!port) {
        return jsonResponse({ error: 'runtime not ready (no port registered)' }, 503)
      }
      const relayed = await relayRequest(port, request)
      if (relayed !== RELAY_TIMED_OUT) return relayed

      // Eviction is the only door back to a broadcast. This function asks for a
      // re-registration only on a registry miss, and `entry` was destructured
      // before the relay started, so nothing here re-reads the registry: leave a
      // dead port in place and every later request hits, relays into the same
      // black hole, times out, and never triggers one REQUEST_REGISTRATION.
      //
      // Identity-checked, because UNREGISTER_CHALLENGE deletes by slug alone and
      // would take a live entry with it. A relay that started a deadline ago must
      // not repeat that against a registration that landed since.
      //
      // Debounced, because a page whose queue is legitimately deeper than the
      // deadline is not dead, and evicting it on every timed-out request turns
      // one slow page into a rebuild loop — a loop that also closes the retired
      // port the slow answer is still travelling towards.
      //
      // Deliberately does NOT broadcast here, and deliberately does NOT touch
      // lastAskAt. Not broadcasting is the harder call: our own broadcast is what
      // makes a page rebuild its channel, so "somebody re-registered" cannot tell
      // "it is alive and answered me" apart from "another tab took over from the
      // dead one" — anything built on that signal is built on a tautology. Not
      // touching lastAskAt keeps the ask debounce doing its job: a burst of
      // sub-resources that all time out costs one broadcast on the next miss,
      // not one each.
      const now = Date.now()
      if (
        registry.get(slug)?.port === port &&
        now - (lastEvictAt.get(slug) ?? -Infinity) >= EVICT_DEBOUNCE_MS
      ) {
        lastEvictAt.set(slug, now)
        registry.delete(slug)
      }

      // Say which failure this was. Every failure on this path otherwise
      // collapses into the same 504, and they need different fixes.
      if (!production) {
        console.warn('[challenge-sw] relay timed out; peer never answered', slug, url.pathname)
      }
      return jsonResponse({ error: 'challenge runtime did not respond' }, 504)
    }

    return jsonResponse({ error: `unknown backend: ${backend}` }, 501)
  } catch (err) {
    if (production) {
      return jsonResponse({ error: 'Internal Server Error' }, 500)
    }
    return jsonResponse({ error: err.message, stack: err.stack }, 500)
  }
}

/**
 * Relay an HTTP request to the challenge page via MessageChannel.
 * Creates a per-request channel, sends request data to the page, waits for response.
 */
async function relayRequest(challengePort, request) {
  // Serialize request
  const method = request.method
  const url = request.url
  const headers = [...request.headers.entries()]
  const bodyBuffer = request.body
    ? (await request.arrayBuffer())
    : null

  // Per-request channel: SW listens on port1, page gets port2 as responsePort
  const rc = new MessageChannel()

  const responsePromise = new Promise((resolve, reject) => {
    rc.port1.onmessage = (event) => {
      rc.port1.close()
      resolve(event.data)
    }
    rc.port1.onmessageerror = (event) => {
      rc.port1.close()
      reject(new Error('MessageChannel error: ' + String(event)))
    }
  })

  // Send request to page; transfer body buffer and responsePort
  const transferables = [rc.port2]
  if (bodyBuffer) transferables.push(bodyBuffer)

  challengePort.postMessage(
    { type: 'HANDLE_REQUEST', method, url, headers, body: bodyBuffer, responsePort: rc.port2 },
    transferables,
  )

  // Await the serialized response from the page, but not forever.
  let timer
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve(RELAY_TIMED_OUT), RELAY_TIMEOUT_MS)
  })

  let settled
  try {
    settled = await Promise.race([responsePromise, deadline])
  } finally {
    // Success and messageerror both land here. On the deadline branch the timer
    // has already fired and clearing it is a no-op. A relay that resolves must
    // not leave an armed timer behind.
    clearTimeout(timer)
  }

  if (settled === RELAY_TIMED_OUT) {
    // Discard whatever the page may still send. Promise.race already attached a
    // handler to responsePromise, so a late messageerror rejection is swallowed
    // here rather than becoming an unhandled rejection.
    rc.port1.close()
    return RELAY_TIMED_OUT
  }

  const { status, headers: resHeaders, body: resBody } = settled

  const responseHeaders = new Headers()
  for (const [k, v] of (resHeaders ?? [])) {
    // append, not set: a response may legitimately carry several Set-Cookie
    // headers, and set() keeps only the last. The page decodes the cookie
    // carrier into one entry per cookie precisely so they arrive separable —
    // collapsing them here would throw that away one step from the browser.
    responseHeaders.append(k, v)
  }

  // A zero-length body is still a body as far as the Response constructor is
  // concerned, and a null-body status (204/205/304) rejects it. The page sends
  // an empty ArrayBuffer for those, which is not nullish, so the length has to
  // be the test.
  const body = resBody && resBody.byteLength > 0 ? resBody : null
  return new Response(body, { status, headers: responseHeaders })
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

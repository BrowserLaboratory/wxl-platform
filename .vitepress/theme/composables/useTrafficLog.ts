import { ref } from 'vue'
import { decodeCookieCarrier } from './cookieCarrier'
import { readDiagnostics } from './runtimeDiagnostics'

export interface TrafficEntry {
  id: number
  timestamp: number
  method: string
  url: string
  requestHeaders: [string, string][]
  requestBody: string | null
  status: number
  responseHeaders: [string, string][]
  responseBody: string
  duration: number
  /**
   * A message from the runtime to whoever is authoring the challenge — set when
   * the interpreter itself failed, as opposed to the app returning an error.
   * Absent on a normal response. Keyed to the response object by the runtime
   * rather than carried on it, so it never reaches the student.
   */
  runtimeDiagnostic?: string
}

// ─── Simulated browser header augmentation ───────────────────────────────────
// Forbidden request headers (User-Agent, Referer, Sec-*, etc.) cannot be set
// on Request objects via the Fetch API. BrowserPanel passes request context via
// X-Wxlsh-Context / X-Wxlsh-Referer headers; we strip them here and use them
// to build the full simulated browser header set for display in the traffic log.

/** Convert a lowercase header name to HTTP/1.1 Title-Case (e.g. content-type → Content-Type). */
function toTitleCase(name: string): string {
  return name.replace(/(?:^|-)([a-z])/g, (_, c) => _.slice(0, -1) + c.toUpperCase())
}

/**
 * Build display request headers following Chrome's actual ordering convention.
 *
 * GET navigation:  Host > Connection > sec-ch-ua group > Upgrade-Insecure-Requests >
 *                  User-Agent > Accept > Sec-Fetch-* > Accept-Encoding > Accept-Language
 *
 * GET link/form:   ... > Referer (before Sec-Fetch-*)
 *
 * POST form:       Host > Connection > Content-Length > sec-ch-ua group >
 *                  Origin > Upgrade-Insecure-Requests > Content-Type >
 *                  User-Agent > Accept > Referer > Sec-Fetch-* >
 *                  Accept-Encoding > Accept-Language
 */
function buildDisplayHeaders(
  url: string,
  _method: string,
  actualHeaders: [string, string][],
  context: string | null,
  referer: string | null,
  bodyLength: number | null,
  cookie: string | null = null,
): [string, string][] {
  const parsedUrl = new URL(url)
  const isPost = context === 'form-post'

  // Index actual request headers (stripped of metadata) for Content-Type lookup
  const actual = new Map<string, string>()
  for (const [k, v] of actualHeaders) {
    const lower = k.toLowerCase()
    if (lower !== 'x-wxlsh-context' && lower !== 'x-wxlsh-referer' && lower !== 'x-wxlsh-cookie') actual.set(lower, v)
  }

  // Build in Chrome's conventional order; use Map to deduplicate by lowercase key.
  // Map preserves insertion order, so we add in the exact sequence we want to display.
  const h = new Map<string, string>()

  const set = (name: string, value: string) => h.set(name.toLowerCase(), value)

  // 1. Host
  set('Host', parsedUrl.host)

  // 2. Connection (always second for HTTP/1.1)
  set('Connection', 'keep-alive')

  // 3. Content-Length — early for POST (Chrome puts it right after Connection)
  if (isPost && bodyLength !== null) set('Content-Length', String(bodyLength))

  // 4–6. Client hints group
  set('Sec-Ch-Ua', '"Chromium";v="120", "Google Chrome";v="120", "Not-A.Brand";v="24"')
  set('Sec-Ch-Ua-Mobile', '?0')
  set('Sec-Ch-Ua-Platform', '"macOS"')

  // 7. Origin — POST only, between client hints and Upgrade-Insecure-Requests
  if (isPost) set('Origin', `${parsedUrl.protocol}//${parsedUrl.host}`)

  // 8. Upgrade-Insecure-Requests
  set('Upgrade-Insecure-Requests', '1')

  // 9. Content-Type — POST only, from the actual request (preserves multipart boundary)
  if (isPost && actual.has('content-type')) set('Content-Type', actual.get('content-type')!)

  // 10. User-Agent
  set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

  // 11. Accept
  set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7')

  // 12. Referer — link / form contexts (before Sec-Fetch-*)
  if (referer && context !== 'navigation') set('Referer', referer)

  // 13–16. Sec-Fetch group
  set('Sec-Fetch-Site', context === 'navigation' ? 'none' : 'same-origin')
  set('Sec-Fetch-Mode', 'navigate')
  if (context !== 'link') set('Sec-Fetch-User', '?1')  // navigation, form-get, form-post
  set('Sec-Fetch-Dest', 'document')

  // 17–18. Accept-Encoding / Accept-Language — always last
  set('Accept-Encoding', 'gzip, deflate, br')
  set('Accept-Language', 'en-US,en;q=0.9')

  // 19. Cookie — from X-Wxlsh-Cookie transport (real Cookie header is forbidden in Fetch API)
  if (cookie) set('Cookie', cookie)

  // Append any remaining actual headers not already represented (e.g. custom app headers)
  for (const [k, v] of actual) {
    if (!h.has(k)) h.set(k, v)
  }

  return [...h.entries()].map(([k, v]) => [toTitleCase(k), v])
}

export function useTrafficLog() {
  const trafficLog = ref<TrafficEntry[]>([])
  let nextId = 1

  function wrap(
    dispatch: (req: Request) => Promise<Response>,
  ): (req: Request) => Promise<Response> {
    return async (request: Request): Promise<Response> => {
      const start = performance.now()
      const method = request.method
      const url = request.url

      // Read X-Wxlsh-* metadata before cloning / dispatching
      const context = request.headers.get('X-Wxlsh-Context')
      const referer = request.headers.get('X-Wxlsh-Referer')
      const cookie = request.headers.get('X-Wxlsh-Cookie')

      // Build a clean request (strip metadata headers) for actual dispatch
      const cleanHeaders = new Headers(request.headers)
      cleanHeaders.delete('X-Wxlsh-Context')
      cleanHeaders.delete('X-Wxlsh-Referer')
      const cleanRequest = new Request(request, { headers: cleanHeaders })

      // Clone clean request to read body after dispatch
      const reqClone = cleanRequest.clone()

      const response = await dispatch(cleanRequest)
      const duration = Math.round(performance.now() - start)

      // Read request body from clone
      let requestBody: string | null = null
      let bodyLength: number | null = null
      if (method !== 'GET' && method !== 'HEAD') {
        try {
          const text = await reqClone.text()
          if (text) {
            requestBody = text
            bodyLength = new TextEncoder().encode(text).byteLength
          }
        } catch {
          requestBody = null
        }
      }

      // Clone response to read body without consuming the original
      const resClone = response.clone()
      let responseBody = ''
      try {
        responseBody = await resClone.text()
      } catch {
        responseBody = ''
      }

      const actualHeaders = [...cleanRequest.headers] as [string, string][]
      const requestHeaders = buildDisplayHeaders(url, method, actualHeaders, context, referer, bodyLength, cookie)
      const responseHeaders: [string, string][] = []
      for (const [k, v] of [...response.headers] as [string, string][]) {
        if (k.toLowerCase() === 'x-wxlsh-set-cookie') {
          // Restore transported Set-Cookie headers for display
          for (const cookie of decodeCookieCarrier(v)) responseHeaders.push(['Set-Cookie', cookie])
        } else {
          responseHeaders.push([toTitleCase(k), v])
        }
      }
      // Keyed on the response object, so a diagnostic raised on a path that
      // never reaches this wrapper cannot drift onto a later entry.
      const messages = readDiagnostics(response)
      const runtimeDiagnostic = messages.length > 0 ? messages.join(' — ') : undefined

      trafficLog.value.push({
        id: nextId++,
        timestamp: Date.now(),
        method,
        url,
        requestHeaders,
        requestBody,
        status: response.status,
        responseHeaders,
        responseBody,
        duration,
        ...(runtimeDiagnostic ? { runtimeDiagnostic } : {}),
      })

      return response
    }
  }


  function clear() {
    trafficLog.value = []
    nextId = 1
  }

  return { trafficLog, wrap, clear }
}

import { encodeCookieCarrier, decodeCookieCarrier } from './cookieCarrier'

export type LoadPyodideFn = (opts?: Record<string, unknown>) => Promise<PyodideInstance>

/**
 * The slice of the Pyodide instance that panels are allowed to touch.
 *
 * Deliberately narrower than `PyodideInstance`: a panel runs code and reads or
 * writes globals, and nothing else. `runPythonAsync`'s second parameter is
 * optional but must stay declared — a caller passing `{ globals }` type-checks
 * against this and would not against a one-parameter signature.
 */
export interface PyodidePublicAPI {
  runPythonAsync(code: string, options?: { globals?: unknown }): Promise<unknown>
  globals: { get(name: string): unknown; set(name: string, value: unknown): void }
}

/**
 * Python code that monkey-patches requests.adapters.HTTPAdapter.send()
 * to route HTTP through the async JS dispatch bridge injected as
 * `_wxlsh_dispatch_bridge` on Pyodide globals.
 *
 * The bridge returns a JSON string { status, headers, body } to avoid
 * JsProxy issues across the Pyodide boundary.
 */
const REQUESTS_MONKEY_PATCH = `
import requests
from requests.adapters import HTTPAdapter
import json as _json
from pyodide.ffi import run_sync as _run_sync

import http.client as _http_client


class _WxlOriginalResponse:
    """Stands in for urllib3's _original_response; only .msg is consulted."""

    def __init__(self, msg):
        self.msg = msg

    def isclosed(self):
        return True

    def close(self):
        pass


class _WxlRawResponse:
    """Minimal urllib3.HTTPResponse stand-in carrying the Set-Cookie headers."""

    def __init__(self, set_cookies):
        msg = _http_client.HTTPMessage()
        for value in set_cookies:
            if value:
                msg.add_header("Set-Cookie", value)
        self.headers = msg
        self._original_response = _WxlOriginalResponse(msg)

    def read(self, *args, **kwargs):
        return b""

    def release_conn(self):
        pass

    def close(self):
        pass


_original_send = HTTPAdapter.send

def _patched_send(self, request, stream=False, timeout=None, verify=True, cert=None, proxies=None):
    """Synchronous send that routes through the async JS dispatch bridge.

    The JS bridge (_wxlsh_dispatch_bridge) is async, but requests.send() is
    synchronous. We use pyodide.ffi.run_sync to bridge the gap — it drives
    the event loop until the JS Promise resolves, then returns the result.
    """
    method = request.method or "GET"
    url = request.url
    headers = dict(request.headers or {})
    body = request.body

    if body and isinstance(body, bytes):
        body = body.decode("utf-8", errors="replace")

    try:
        bridge = _wxlsh_dispatch_bridge
    except NameError:
        raise ConnectionError(
            "WXL dispatch bridge not initialized: _wxlsh_dispatch_bridge is not set. "
            "Ensure ChallengeLayout injects the bridge before requests is used."
        )

    try:
        headers_json = _json.dumps(headers)
        # bridge() returns a JS Promise (PyodideFuture); run_sync resolves it
        raw_json = _run_sync(bridge(method, url, headers_json, body or ""))
        result = _json.loads(raw_json)

        status = int(result["status"])
        resp_headers = result.get("headers", {})
        resp_body = (result.get("body", "") or "").encode("utf-8")

        # Set-Cookie values arrive unjoined in "set_cookies". Older payloads only
        # carry the comma-joined copy inside "headers"; fall back to that rather
        # than raising, but prefer the array — cookie attributes contain commas
        # of their own, so the joined form cannot be split back apart.
        set_cookies = result.get("set_cookies")
        if set_cookies is None:
            set_cookies = []
            for _k, _v in resp_headers.items():
                if _k.lower() == "set-cookie" and _v:
                    set_cookies = [_v]

        from requests.models import Response
        resp = Response()
        resp.status_code = status
        resp.headers.update(resp_headers)
        resp._content = resp_body
        resp.encoding = "utf-8"
        resp.url = url
        resp.request = request
        # requests.Session.send() populates its cookie jar via
        # extract_cookies_to_jar(jar, request, r.raw), which returns immediately
        # unless r.raw has a truthy _original_response whose .msg exposes
        # get_all("Set-Cookie"). Leaving raw unset is why the jar was always
        # empty and no challenge login ever stuck.
        resp.raw = _WxlRawResponse(set_cookies)
        return resp
    except ConnectionError:
        raise
    except Exception as e:
        raise ConnectionError(f"WXL dispatch bridge error: {e}") from e

HTTPAdapter.send = _patched_send
`

/** Pyodide built-in packages that must be loaded via loadPackage(), not micropip */
const PYODIDE_NATIVE_PKGS = new Set(['sqlite3', 'ssl', 'lzma', 'numpy', 'pandas'])

type AsgiSendEvent =
  | { type: 'http.response.start'; status: number; headers: [string, string][] }
  | { type: 'http.response.body'; body: Uint8Array; more_body: boolean }

type AsgiAppCallable = (
  scope: Record<string, unknown>,
  receive: () => Promise<{ type: string; body: Uint8Array; more_body: boolean }>,
  send: (event: AsgiSendEvent) => Promise<void>,
) => Promise<void>

interface PyodideInstance {
  runPythonAsync(code: string): Promise<unknown>
  loadPackage(packages: string | string[]): Promise<void>
  FS: { writeFile(path: string, data: Uint8Array | string): void }
  globals: { get(name: string): unknown; set(name: string, value: unknown): void }
}

/**
 * Manages a single Pyodide instance per challenge session.
 * Loads Pyodide exactly once; subsequent initialize() calls are no-ops.
 */
export class PythonRuntime {
  private pyodide: PyodideInstance | null = null
  private initPromise: Promise<void> | null = null
  private readonly loadPyodide: LoadPyodideFn

  /** Returns the Pyodide instance after initialization, or null if not ready. */
  getPyodide(): PyodideInstance | null { return this.pyodide }

  constructor(loadPyodide: LoadPyodideFn) {
    this.loadPyodide = loadPyodide
  }

  async initialize(appCode: string, fsEntries: Record<string, Uint8Array> = {}, packages: string[] = []): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = this._init(appCode, fsEntries, packages)
    return this.initPromise
  }

  private async _init(appCode: string, fsEntries: Record<string, Uint8Array>, packages: string[]): Promise<void> {
    this.pyodide = await this.loadPyodide()
    for (const [path, data] of Object.entries(fsEntries)) {
      // Ensure parent directories exist (e.g. /templates/login.html → mkdir /templates)
      const parts = path.split('/').slice(1, -1)
      let current = ''
      for (const part of parts) {
        current += '/' + part
        try { this.pyodide.FS.mkdir(current) } catch { /* already exists */ }
      }
      this.pyodide.FS.writeFile(path, data)
    }
    const nativePkgs = packages.filter((p) => PYODIDE_NATIVE_PKGS.has(p))
    const pipPkgs = packages.filter((p) => !PYODIDE_NATIVE_PKGS.has(p))

    if (nativePkgs.length > 0) {
      await this.pyodide.loadPackage(nativePkgs)
    }
    if (pipPkgs.length > 0) {
      await this.pyodide.loadPackage('micropip')
      const pkgJson = JSON.stringify(pipPkgs)
      await this.pyodide.runPythonAsync(
        `import micropip; await micropip.install(${pkgJson})`,
      )
    }
    await this.pyodide.runPythonAsync(appCode)

    // Install requests and monkey-patch HTTPAdapter.send to route through JS dispatch bridge
    await this._installAndPatchRequests()

    // Inject ASGI/WSGI bridge: auto-detects Flask (WSGI) vs FastAPI (ASGI) and
    // serialises the response as JSON (body base64-encoded) to avoid Pyodide proxy issues.
    await this.pyodide.runPythonAsync(`
import json as _json, base64 as _b64, inspect as _inspect, io as _io

def _is_wsgi(application):
    """True if app looks like a 2-arg WSGI callable (not a coroutine function)."""
    if _inspect.iscoroutinefunction(application):
        return False
    try:
        params = [
            p for p in _inspect.signature(application).parameters.values()
            if p.default is _inspect.Parameter.empty
        ]
        return len(params) == 2
    except (ValueError, TypeError):
        return False

async def _asgi_bridge(method, path, query_string, js_headers, body_bytes):
    body = bytes(body_bytes) if body_bytes else b""
    headers_pairs = js_headers.to_py() if js_headers else []

    if _is_wsgi(app):
        # ── WSGI path (Flask) ────────────────────────────────────────────────
        environ = {
            "REQUEST_METHOD": method.upper(),
            "SCRIPT_NAME": "",
            "PATH_INFO": path,
            "QUERY_STRING": query_string or "",
            "SERVER_NAME": "localhost",
            "SERVER_PORT": "443",
            "SERVER_PROTOCOL": "HTTP/1.1",
            "wsgi.version": (1, 0),
            "wsgi.url_scheme": "https",
            "wsgi.input": _io.BytesIO(body),
            "wsgi.errors": _io.StringIO(),
            "wsgi.multithread": False,
            "wsgi.multiprocess": False,
            "wsgi.run_once": False,
        }
        for k, v in headers_pairs:
            key = k.upper().replace("-", "_")
            if key == "CONTENT_TYPE":
                environ["CONTENT_TYPE"] = v
            elif key == "CONTENT_LENGTH":
                environ["CONTENT_LENGTH"] = v
            else:
                environ["HTTP_" + key] = v
        # Always override CONTENT_LENGTH with actual body size so Flask/Werkzeug
        # can read the body even when the caller omits the Content-Length header.
        environ["CONTENT_LENGTH"] = str(len(body))
        _w_status = [200]
        _w_headers = [[]]
        def _start_response(status, response_headers, exc_info=None):
            _w_status[0] = int(status.split(" ", 1)[0])
            _w_headers[0] = [[k, v] for k, v in response_headers]
        wsgi_result = app(environ, _start_response)
        wsgi_body = b"".join(wsgi_result)
        return _json.dumps({
            "status": _w_status[0],
            "headers": _w_headers[0],
            "body": _b64.b64encode(wsgi_body).decode("ascii"),
        })
    else:
        # ── ASGI path (FastAPI / async Flask) ────────────────────────────────
        scope = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": method.upper(),
            "path": path,
            "raw_path": path.encode("utf-8"),
            "query_string": query_string.encode("utf-8") if query_string else b"",
            "root_path": "",
            "scheme": "https",
            "headers": [(k.encode("utf-8"), v.encode("utf-8")) for k, v in headers_pairs],
            "server": ("localhost", 443),
        }
        _called = False
        async def receive():
            nonlocal _called
            if not _called:
                _called = True
                return {"type": "http.request", "body": body, "more_body": False}
            return {"type": "http.disconnect"}
        resp_status = 200
        resp_headers = []
        resp_body = b""
        async def send(event):
            nonlocal resp_status, resp_headers, resp_body
            t = event.get("type", "")
            if t == "http.response.start":
                resp_status = int(event["status"])
                resp_headers = [
                    (hk.decode("utf-8", "replace"), hv.decode("utf-8", "replace"))
                    for hk, hv in event.get("headers", [])
                ]
            elif t == "http.response.body":
                resp_body += event.get("body", b"")
        await app(scope, receive, send)
        return _json.dumps({
            "status": resp_status,
            "headers": resp_headers,
            "body": _b64.b64encode(resp_body).decode("ascii"),
        })
`)
  }

  /**
   * Install the real `requests` library via micropip and monkey-patch
   * HTTPAdapter.send() to route all HTTP through the JS dispatch bridge.
   */
  private async _installAndPatchRequests(): Promise<void> {
    if (!this.pyodide) return
    // Ensure micropip is available
    await this.pyodide.loadPackage('micropip')
    await this.pyodide.runPythonAsync(
      `import micropip; await micropip.install('requests')`,
    )
    // Monkey-patch the transport layer so requests uses the JS bridge
    await this.pyodide.runPythonAsync(REQUESTS_MONKEY_PATCH)
  }

  async handleRequest(request: Request): Promise<Response> {
    if (!this.pyodide) throw new Error('PythonRuntime not initialized')

    const bridge = this.pyodide.globals.get('_asgi_bridge') as (
      method: string, path: string, qs: string,
      headers: [string, string][], body: Uint8Array,
    ) => Promise<string>

    const url = new URL(request.url)
    const bodyBytes = request.body
      ? new Uint8Array(await request.arrayBuffer())
      : new Uint8Array()
    const headers = [...request.headers.entries()]
      .filter(([k]) => !k.toLowerCase().startsWith('x-wxlsh-'))
      .map(([k, v]) => [k.toLowerCase(), v] as [string, string])

    // Cookie is a forbidden request header in the Fetch API, so BrowserPanel
    // transports it via X-Wxlsh-Cookie. Convert back to a real cookie header.
    const transportedCookie = request.headers.get('x-wxlsh-cookie')
    if (transportedCookie) headers.push(['cookie', transportedCookie])

    const raw = await bridge(request.method.toUpperCase(), url.pathname, url.search.slice(1), headers, bodyBytes)
    const result: { status: number; headers: [string, string][]; body: string } = JSON.parse(raw as unknown as string)

    const responseHeaders = new Headers()
    const setCookies: string[] = []
    for (const [k, v] of result.headers) {
      // Set-Cookie is a forbidden response-header name in the Fetch API —
      // new Response() silently drops it. Collect and transport via custom header.
      if (k.toLowerCase() === 'set-cookie') setCookies.push(v)
      else responseHeaders.set(k, v)
    }
    if (setCookies.length > 0) {
      responseHeaders.set('X-Wxlsh-Set-Cookie', encodeCookieCarrier(setCookies))
    }

    const body = Uint8Array.from(atob(result.body), (c) => c.charCodeAt(0))
    return new Response(body, { status: result.status, headers: responseHeaders })
  }

  get isReady(): boolean {
    return this.pyodide !== null
  }
}

/**
 * The single place the Pyodide distribution URL is written down.
 *
 * It used to appear twice inside ChallengeLayout — once for the challenge
 * runtime, once for the tool layer — which meant the two could drift apart and
 * silently stop sharing the browser's HTTP cache. It also made both call sites
 * untestable: Node refuses to `import()` an https URL, so any unit test that
 * drove them died with "Only URLs with a scheme in: file and data are
 * supported". Keeping the import behind an exported function lets tests mock
 * this module instead.
 */
/**
 * Cookie is a forbidden *request* header in the Fetch API and Set-Cookie a
 * forbidden *response* header name, so both travel under X-Wxlsh-* names.
 * These two helpers are the only places that renaming happens.
 */

/**
 * Rename an outbound Cookie header so `new Request()` does not drop it.
 *
 * Matched case-insensitively, because the spelling is the learner's. The Python
 * patch hands over `dict(request.headers)` and `requests`' CaseInsensitiveDict
 * preserves whatever the caller typed, so `headers={'COOKIE': …}` arrives as
 * `COOKIE` — while `new Request()` drops a forbidden Cookie header case-
 * insensitively and in silence. Testing two spellings meant a learner who chose
 * a third was logged out with no error anywhere, which is the exact symptom
 * this carrier exists to prevent and which this platform has shipped once.
 */
export function transportCookie(headers: Record<string, string>): Record<string, string> {
  const names = Object.keys(headers).filter(k => k.toLowerCase() === 'cookie')
  // Last wins, matching how a header map with duplicate spellings would be
  // collapsed downstream; in practice there is one.
  const cookie = names.length ? headers[names[names.length - 1]] : undefined
  if (cookie) {
    headers['X-Wxlsh-Cookie'] = cookie
    for (const name of names) delete headers[name]
  }
  return headers
}

/** The JSON shape the Python dispatch bridge receives back. */
export interface BridgePayload {
  status: number
  headers: Record<string, string>
  /** Each Set-Cookie value, unjoined. */
  set_cookies: string[]
  body: string
}

/**
 * Turn a dispatched Response into the bridge payload.
 *
 * `set_cookies` exists because `headers` is a single-valued map and cannot hold
 * two Set-Cookie values. The previous transport joined them with ", ", which is
 * not reversible: `Expires=Thu, 01-Jan-1970 00:00:00 GMT` contains a comma, so
 * splitting the joined string tears cookies apart. The joined copy stays under
 * `headers['set-cookie']` so the field keeps its old shape for anything still
 * reading it.
 */
export function buildBridgePayload(res: Response, body: string): BridgePayload {
  const headers: Record<string, string> = {}
  const setCookies: string[] = []
  for (const [k, v] of res.headers.entries()) {
    if (k.toLowerCase() === 'x-wxlsh-set-cookie') {
      setCookies.push(...decodeCookieCarrier(v))
    } else {
      headers[k] = v
    }
  }
  if (setCookies.length > 0) headers['set-cookie'] = setCookies.join(', ')
  return { status: res.status, headers, set_cookies: setCookies, body }
}

export const PYODIDE_CDN_URL = 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.js'

/** Load the Pyodide distribution and return its `loadPyodide` entry point. */
export async function loadPyodideFromCdn(): Promise<LoadPyodideFn> {
  await import(/* @vite-ignore */ PYODIDE_CDN_URL)
  const loadPyodide = (globalThis as unknown as { loadPyodide?: LoadPyodideFn }).loadPyodide
  if (typeof loadPyodide !== 'function') {
    throw new Error('loadPyodide not available after loading pyodide.js')
  }
  return loadPyodide
}

/**
 * Install requests and apply monkey-patch on any Pyodide instance.
 * Used by ChallengeLayout to patch the standalone tool-layer Pyodide
 * for non-Python backends (e.g., PHP).
 */
export async function installRequestsPatch(
  pyodide: PyodideInstance,
  dispatchBridge?: (method: string, url: string, headersJson: string, body: string) => Promise<string>,
): Promise<void> {
  await pyodide.loadPackage('micropip')
  await pyodide.runPythonAsync(
    `import micropip; await micropip.install('requests')`,
  )
  if (dispatchBridge) {
    pyodide.globals.set('_wxlsh_dispatch_bridge', dispatchBridge)
  }
  await pyodide.runPythonAsync(REQUESTS_MONKEY_PATCH)
}

/**
 * `loadToolsPyodide` used to live here: it built the Code panel's Pyodide on the
 * page's own thread. It was removed with `runtime-execution-guard`, which moved
 * that instance into a Worker, and it is not coming back — a main-thread tools
 * Pyodide is the exact condition that change exists to remove, and leaving an
 * exported, working one behind meant a developer restoring the old panel wiring
 * would find it and it would work. The layout guard now forbids the name as
 * well as the two runtime constructors.
 */

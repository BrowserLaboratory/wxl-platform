import { attachDiagnostics } from './runtimeDiagnostics'
import { encodeCookieCarrier, base64EncodeUtf8 } from './cookieCarrier'

/**
 * The php-wasm surface this module drives.
 *
 * Only the members the adapter touches are named. `refresh` and `flush` live on
 * php-wasm's `PhpBase`, which both `PhpWeb` and `PhpNode` extend, so an adapter
 * built here works against either — the browser build and the Node build used by
 * the integration tests.
 */
export interface PhpWasmModule {
  binary: Promise<{ FS: EmscriptenFs }>
  run(code: string): Promise<number>
  refresh(): Promise<unknown>
  flush(): void
  addEventListener(type: string, listener: (event: Event) => void): void
}

interface EmscriptenFs {
  writeFile(path: string, data: Uint8Array | string): void
  readFile(path: string): Uint8Array
  unlink(path: string): void
  readdir(path: string): string[]
  stat(path: string): { mode: number }
  isDir(mode: number): boolean
}

/**
 * What `PhpRuntime` is allowed to ask of the interpreter.
 *
 * `run` deliberately reports no response headers. php-wasm exposes `header()`
 * output through `headers_list()` inside PHP rather than through the JS return
 * value, so headers are recovered by a metadata probe run instead. Keeping an
 * always-empty `headers` field here is what previously convinced readers that
 * headers were unreachable.
 */
export interface PhpInstance {
  run(code: string): Promise<{ output: string; exitCode: number }>
  /** Resets interpreter state — declarations, globals, constants, headers, ini. Never the filesystem. */
  refresh(): Promise<void>
  /**
   * Forces php-wasm's byte buffers to emit whatever they are still holding, and
   * returns those bytes as a string after removing them from the capture buffer.
   */
  flush(): string
  writeFile(path: string, data: Uint8Array): void
  readFile(path: string): Uint8Array
  deleteFile(path: string): void
  /**
   * Every regular file reachable from the root, excluding the device subtrees.
   * Synchronous because the Emscripten filesystem is — and because `resetFs()`
   * has to be able to complete without an await.
   */
  listFiles(): string[]
}

/**
 * Subtrees that are kernel interfaces rather than challenge state.
 *
 * `/proc/self/fd` throws on stat in the real runtime, and the `/dev` nodes are
 * character devices whose contents are meaningless to snapshot. Walking either
 * one turns a filesystem snapshot into an exception.
 */
const DEVICE_SUBTREES = ['/dev', '/proc']

function isDeviceSubtree(path: string): boolean {
  return DEVICE_SUBTREES.some((root) => path === root || path.startsWith(`${root}/`))
}

/**
 * Wraps a php-wasm instance in the interface `PhpRuntime` consumes.
 *
 * The output listener is attached once and never removed. Attaching per request
 * and detaching after `run()` resolves loses anything php-wasm emits afterwards —
 * and php-wasm does emit afterwards, because its byte buffers only dispatch on a
 * newline or an explicit flush. A single permanent listener plus an explicit
 * buffer reset per request has no such window.
 */
export async function createPhpAdapter(php: PhpWasmModule): Promise<PhpInstance> {
  const { FS } = await php.binary
  let buffer: string[] = []
  php.addEventListener('output', (event: Event) => {
    buffer.push((event as CustomEvent<string[]>).detail[0])
  })

  return {
    async run(code: string) {
      buffer = []
      const exitCode = await php.run(code)
      return { output: buffer.join(''), exitCode }
    },

    async refresh() {
      await php.refresh()
    },

    flush() {
      // Whatever is in the buffer at this point belongs to an execution that has
      // already reported its own output, so dropping it loses nothing.
      buffer = []
      php.flush()
      const residue = buffer.join('')
      buffer = []
      return residue
    },

    writeFile(path: string, data: Uint8Array) {
      FS.writeFile(path, data)
    },

    readFile(path: string) {
      return FS.readFile(path)
    },

    deleteFile(path: string) {
      FS.unlink(path)
    },

    listFiles() {
      const found: string[] = []
      const walk = (dir: string): void => {
        let entries: string[]
        try {
          entries = FS.readdir(dir)
        } catch {
          // A directory the runtime refuses to list is not challenge state.
          return
        }
        for (const entry of entries) {
          if (entry === '.' || entry === '..') continue
          const path = dir === '/' ? `/${entry}` : `${dir}/${entry}`
          if (isDeviceSubtree(path)) continue
          let mode: number
          try {
            mode = FS.stat(path).mode
          } catch {
            continue
          }
          if (FS.isDir(mode)) walk(path)
          else found.push(path)
        }
      }
      walk('/')
      return found
    },
  }
}

/**
 * Read back the response headers and status the app set.
 *
 * Runs as its own execution so its output never mixes with the response body,
 * and before `refresh()` because that clears both.
 */

const META_PROBE = `<?php echo json_encode([
  'h' => headers_list(),
  's' => http_response_code(),
  'lvl' => ob_get_level(),
  'sid' => session_id(),
]); ?>`

interface ResponseMeta {
  headers: string[]
  status: number
  /** Output-buffer depth after the app ran; see the session hook. */
  bufferLevel: number
  /** Non-empty once a session has been started, on every request thereafter. */
  sessionId: string
  /** True when the probe output could not be read; the response is not trustworthy. */
  unreadable: boolean
}

/**
 * `http_response_code()` returns `false` when nothing has set a status, which is
 * PHP's way of saying 200 rather than an error.
 *
 * Unparseable probe output falls back instead of throwing: a challenge whose
 * response metadata cannot be read is still a challenge that should answer.
 */
function parseResponseMeta(raw: string): ResponseMeta {
  try {
    const parsed = JSON.parse(raw) as { h?: unknown; s?: unknown; lvl?: unknown; sid?: unknown }
    const headers = Array.isArray(parsed.h) ? parsed.h.filter((h): h is string => typeof h === 'string') : []
    // http_response_code() returns false when nothing set a status, which is
    // PHP's way of saying 200 rather than an error.
    const status = typeof parsed.s === 'number' ? parsed.s : 200
    const bufferLevel = typeof parsed.lvl === 'number' ? parsed.lvl : 0
    const sessionId = typeof parsed.sid === 'string' ? parsed.sid : ''
    return { headers, status, bufferLevel, sessionId, unreadable: false }
  } catch {
    // Do NOT fabricate a 200 here. A challenge that answered 403 with a
    // Set-Cookie would be silently downgraded to a success that set no cookie,
    // and the student would be debugging a lie.
    return { headers: [], status: 500, bufferLevel: 0, sessionId: '', unreadable: true }
  }
}

/**
 * Coerce PHP's status into one `Response` will accept.
 *
 * `http_response_code()` takes any integer, while `new Response` throws a
 * RangeError outside 200-599 and a TypeError for a null-body status carrying a
 * body. Either would kill the whole request rather than the challenge, so the
 * status is clamped and the body dropped where the status forbids one.
 */
const NULL_BODY_STATUSES = new Set([204, 205, 304])

function coerceStatus(status: number): number {
  if (!Number.isFinite(status)) return 200
  return Math.min(599, Math.max(200, Math.trunc(status)))
}

export type LoadPhpFn = () => Promise<PhpInstance>

/**
 * Wraps php-wasm to execute PHP challenge code.
 * Initialized once per session; superglobals are set per-request.
 */
export class PhpRuntime {
  private php: PhpInstance | null = null
  private initPromise: Promise<void> | null = null
  private appCode = ''
  private snapshot: Map<string, Uint8Array> | null = null
  /** Tail of the request chain; see handleRequest. */
  private queue: Promise<void> = Promise.resolve()
  /** Decided once from the app source; see appUsesSession. */
  private needsSessionHook = false
  /** Set when a reset failed; every later request fails closed rather than serving stale state. */
  private poisoned = false
  /** Diagnostics raised while assembling the response currently in flight. */
  private pending: string[] = []
  private readonly loadPhp: LoadPhpFn
  private readonly onDiagnostic?: (message: string) => void

  /**
   * @param onDiagnostic Reports runtime-level failures to whoever is authoring
   *   the challenge. Deliberately a callback rather than a response header: the
   *   Service Worker path calls `handleRequest` directly, so anything attached
   *   to the response reaches the student's simulated browser on that path no
   *   matter what a downstream consumer strips.
   */
  constructor(loadPhp: LoadPhpFn, options: { onDiagnostic?: (message: string) => void } = {}) {
    this.loadPhp = loadPhp
    this.onDiagnostic = options.onDiagnostic
  }

  async initialize(appCode: string, fsEntries: Record<string, Uint8Array> = {}): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = this._init(appCode, fsEntries)
    return this.initPromise
  }

  private async _init(appCode: string, fsEntries: Record<string, Uint8Array>): Promise<void> {
    this.php = await this.loadPhp()
    this.appCode = appCode
    // Scan the mounted files as well as the entry point. `app:` names only the
    // entry, and a challenge whose session_start() lives in a required sibling
    // would otherwise get no hook and silently discard every $_SESSION write.
    this.needsSessionHook = appUsesSession(appCode, Object.values(fsEntries))
    for (const [path, data] of Object.entries(fsEntries)) {
      this.php.writeFile(path, data)
    }
    // Snapshot after mounting, so resetFs() restores the challenge as the
    // student first met it rather than as an empty filesystem.
    this.snapshot = new Map()
    for (const path of this.php.listFiles()) {
      try {
        this.snapshot.set(path, this.php.readFile(path))
      } catch {
        // Unreadable at mount time means it is not challenge state worth restoring.
      }
    }
  }

  /**
   * Return the filesystem to what it held once initialization finished.
   *
   * `refresh()` clears interpreter state between requests but deliberately never
   * touches the filesystem, because that is where a PHP challenge keeps anything
   * that must outlive a request. That leaves no way back once a student has
   * written to it — short of reloading the page, which also discards their
   * progress. This is that way back.
   *
   * Session files live under /tmp and are inside the snapshot's reach, so a reset
   * challenge is also a logged-out challenge.
   */
  resetFs(): void {
    if (!this.php || !this.snapshot) throw new Error('PhpRuntime not initialized')
    const snapshot = this.snapshot
    const php = this.php

    for (const path of php.listFiles()) {
      if (!snapshot.has(path)) {
        try {
          php.deleteFile(path)
        } catch {
          // A path that refuses deletion is not something the challenge created.
        }
      }
    }
    for (const [path, data] of snapshot) {
      php.writeFile(path, data)
    }
  }

  /**
   * Serialize every request through the one interpreter.
   *
   * `handleRequest` awaits several times, so two callers could interleave — and
   * the interleaving was destructive rather than untidy: the adapter clears its
   * capture buffer at the start of each execution, so a second request discarded
   * the first's collected bytes and BOTH callers received the concatenation of
   * both bodies. `refresh()` from one request also wiped the other's session,
   * globals and emitted headers mid-flight. On a pentest lab that is an
   * unauthorised route's response carrying an authorised route's content.
   *
   * A promise chain suffices because nothing inside re-enters `handleRequest`:
   * the body only drives `run`/`refresh`/`flush` on the adapter, and the Code
   * panel's Pyodide is a separate instance that arrives through dispatch rather
   * than nesting. There is no path that could deadlock on this.
   */
  async handleRequest(request: Request): Promise<Response> {
    const exclusive = this.queue.then(
      () => this._handleRequest(request),
      () => this._handleRequest(request),
    )
    // Swallow into the chain so one failed request cannot block every later one.
    this.queue = exclusive.then(() => undefined, () => undefined)
    return exclusive
  }

  private async _handleRequest(request: Request): Promise<Response> {
    if (!this.php) throw new Error('PhpRuntime not initialized')
    if (this.poisoned) {
      // Failing closed: a contaminated interpreter would serve one challenge's
      // headers, session and globals to another.
      return new Response(
        'The challenge runtime could not be reset after an earlier failure and has been stopped. Reload the page.',
        { status: 500, headers: { 'Content-Type': 'text/plain; charset=UTF-8' } },
      )
    }

    this.pending = []
    const url = new URL(request.url)
    const method = request.method.toUpperCase()
    const getParams = Object.fromEntries(url.searchParams)

    const rawBody = request.body ? await request.text() : ''
    const contentType = request.headers.get('content-type') ?? ''

    // Any method may carry a form body, not just POST. A challenge that accepts
    // a PUT or DELETE otherwise sees an empty $_POST for a body PHP would have
    // parsed on a real deployment.
    let postParams: Record<string, string> = {}
    if (contentType.includes('application/x-www-form-urlencoded')) {
      postParams = Object.fromEntries(new URLSearchParams(rawBody))
    }

    const cookieHeader = request.headers.get('cookie') ?? request.headers.get('x-wxlsh-cookie') ?? ''
    const cookieParams = parseCookieHeader(cookieHeader)

    const code = [
      buildSuperglobalPrologue({
        get: getParams,
        post: postParams,
        cookie: cookieParams,
        server: buildServerVars(method, url),
        rawInput: rawBody,
      }, this.needsSessionHook),
      this.appCode,
    ].join('\n')

    let output: string
    let exitCode: number
    let metaOutput: string
    try {
      ;({ output, exitCode } = await this.php.run(code))

    // Recover the response metadata in its own execution. php-wasm reports only
    // an exit code to JS; `header()` and `http_response_code()` results live
    // inside the interpreter and are readable from PHP, so a second execution
    // reads them out before refresh() wipes them.
    //
    // The two executions need no delimiter: the adapter clears its capture
    // buffer at the start of each one, so each reports only its own output.
    // That rests on php-wasm flushing its byte buffers before run()'s promise
    // settles — internal behaviour, not a documented contract. The integration
    // test that ends a body on a non-newline character is what guards it.
      ;({ output: metaOutput } = await this.php.run(META_PROBE))
    } finally {
      // Always reset, even when php-wasm itself rejected. Leaving this on the
      // success path meant a rejection handed the NEXT request the previous
      // one's headers, session, globals and declarations — reopening the very
      // cross-request leak this runtime exists to close.
      await this.resetInterpreter()
    }

    // Reset the interpreter before the next request sees it. Without this, the
    // same PHP process serves every request in the session: a second request
    // re-executing the app's function declarations dies with `Cannot redeclare`,
    // and globals, constants and already-emitted headers all carry over.
    // `refresh()` clears declarations, globals, constants, `$_SESSION`, emitted
    // headers, `ini_set()` values and the included-files list. It deliberately
    // leaves the filesystem alone — that is the only cross-request state channel
    // a PHP challenge has.

    const meta = parseResponseMeta(metaOutput)
    const responseHeaders = new Headers()
    const setCookies: string[] = []
    for (const header of meta.headers) {
      const idx = header.indexOf(':')
      if (idx === -1) continue
      const name = header.slice(0, idx).trim()
      // The X-Wxlsh- prefix is this platform's own transport namespace. An app
      // emitting one would have its value decoded by every consumer as if the
      // runtime had written it — the Set-Cookie carrier in particular becomes
      // real cookies in the simulated browser's jar. The carrier cannot move off
      // headers the way the diagnostic did, so the namespace is reserved here.
      if (name.toLowerCase().startsWith('x-wxlsh-')) {
        this.report(`this challenge emitted the reserved header ${name}; it was dropped`)
        continue
      }
      const value = header.slice(idx + 1).trim()
      // Set-Cookie is a forbidden response-header name in the Fetch API. The
      // Python runtime already carries it as X-Wxlsh-Set-Cookie, which
      // ChallengeLayout unpacks back into real set-cookie headers for the
      // Service Worker. PHP joins that pipeline rather than opening a second.
      if (name.toLowerCase() === 'set-cookie') {
        setCookies.push(value)
        continue
      }
      try {
        responseHeaders.set(name, value)
      } catch {
        // A name or value the Headers constructor rejects — a challenge with a
        // header-injection bug can produce one. Skipping it keeps the response
        // alive; letting it throw would turn the bug into a dead runtime.
        console.warn(`[PhpRuntime] dropped unrepresentable response header: ${name}`)
      }
    }
    // PHP only emits a Content-Type once something sets one. A response that
    // never called header() arrives with none, and the upstream default for a
    // PHP deployment is text/html at UTF-8.
    if (!responseHeaders.has('Content-Type')) {
      responseHeaders.set('Content-Type', 'text/html; charset=UTF-8')
    }
    // Encoded rather than merely separated: see cookieCarrier for why no plain
    // separator character survives a challenge that controls a cookie's value.
    if (setCookies.length > 0) {
      responseHeaders.set('X-Wxlsh-Set-Cookie', encodeCookieCarrier(setCookies))
    }

    // A non-zero exit code means PHP died on a parse or fatal error. The body
    // and status stay exactly as PHP produced them: a real deployment with
    // display_errors on behaves the same way, and challenges that leak a path
    // through error text need that. Forcing a 500 would fake it away. The author
    // still needs to tell "the runtime broke" from "my logic is wrong", so the
    // signal rides a carrier header that useTrafficLog lifts into the Network
    // panel and ChallengeLayout strips before the response reaches the student.
    if (meta.unreadable) {
      this.report('response metadata could not be read; the status and headers this challenge set were lost')
    }

    // A session was started that no hook was injected for — the source scan
    // missed a dynamically constructed call. Read from session_id() rather than
    // from a PHPSESSID header: PHP emits that cookie only when it MINTS an id,
    // so a header-based check reports once and then goes quiet while the defect
    // continues on every request. session_id() stays readable for the life of
    // the session.
    if (!this.needsSessionHook && meta.sessionId !== '') {
      this.report(
        'this challenge started a session that the source scan did not detect ' +
        '(a dynamically constructed session_start call, most likely), so session data will NOT ' +
        'persist across requests; call session_start() directly so the runtime can see it',
      )
    }

    // The app tore down the runtime's output buffer, taking whatever it had
    // collected with it. Legal, and PHP does the same on a real deployment for
    // the app's own buffers — but here it also costs the response body, so the
    // author needs to know rather than wondering where the output went.
    if (this.needsSessionHook && meta.bufferLevel === 0) {
      this.report(
        'this challenge discarded the runtime output buffer (ob_end_clean or ob_end_flush ' +
        'without a buffer of its own), so part of the response body was lost; the session was ' +
        'still written',
      )
    }


    if (exitCode !== 0) {
      this.report(
        `PHP execution ended with exit code ${exitCode}; the response body contains PHP's own error output`,
      )
    }

    const status = coerceStatus(meta.status)
    if (status !== meta.status && !meta.unreadable) {
      // parseResponseMeta was just changed NOT to fabricate a 200 because the
      // student would be debugging a lie; rewriting the status here without a
      // word would be the same trap in a new place.
      this.report(
        `this challenge set status ${meta.status}, which a response cannot carry; it was changed to ${status}`,
      )
    }
    // A null-body status may not carry one. PHP asked for the status, so the
    // body is what gives way.
    const dropsBody = NULL_BODY_STATUSES.has(status)
    if (dropsBody && output.length > 0) {
      this.report(`status ${status} cannot carry a body, so the ${output.length} bytes this challenge emitted were dropped`)
    }
    const body = dropsBody ? null : output
    const response = new Response(body, { status, headers: responseHeaders })
    // Attach by identity rather than by timing. A single slot on the consumer
    // is only correct while every response passes through that consumer — and
    // the Service Worker path does not, so an unclaimed diagnostic would drift
    // onto whichever request happened to be logged next. Keying on the response
    // object cannot mis-attribute, and it holds every diagnostic rather than
    // only the last one.
    if (this.pending.length > 0) attachDiagnostics(response, this.pending)
    return response
  }

  /**
   * Return the interpreter to a clean state for the next request.
   *
   * Runs from a `finally`, so it must never throw: an error raised here would
   * replace whatever error was already propagating and hide the real cause.
   */
  private async resetInterpreter(): Promise<void> {
    if (!this.php) return
    try {
      await this.php.refresh()
      // PHP runs shutdown functions during refresh(), and refresh() does not
      // flush. Their bytes would otherwise sit in php-wasm's internal buffer
      // until the NEXT request's run() dispatched them — arriving ahead of that
      // request's own output. Discarding beats merging: folding them into the
      // next response is the cross-request contamination this isolation exists
      // to remove, and folding them into this one is impossible because it has
      // already been read.
      const residue = this.php.flush()
      if (residue.length > 0) {
        console.warn(
          `[PhpRuntime] discarded ${residue.length} bytes emitted after the request completed ` +
          '(most likely a register_shutdown_function that echoes); shutdown output cannot reach a response',
        )
      }
    } catch (err) {
      // The one failure that reopens the cross-request leak this runtime exists
      // to close, so it must not be the one failure that stays quiet. Mark the
      // interpreter poisoned: continuing to serve from contaminated state is
      // failing open, and invisibly.
      this.poisoned = true
      this.report(
        `interpreter reset failed, so its state is contaminated and every later request would ` +
        `inherit it: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  /**
   * Surface a runtime-level failure to the challenge author.
   *
   * Goes to the console always, and to the host's callback when one was
   * supplied. Never to the response: see the constructor.
   */
  private report(message: string): void {
    this.pending.push(message)
    console.warn(`[PhpRuntime] ${message}`)
    try {
      this.onDiagnostic?.(message)
    } catch (err) {
      // A reporting channel that can reject the request it is reporting on is
      // worse than no channel.
      console.warn('[PhpRuntime] the diagnostic callback threw; the response is unaffected', err)
    }
  }

  get isReady(): boolean {
    return this.php !== null
  }
}

/**
 * Write an open session to disk before the execution finishes.
 *
 * PHP normally does this during request shutdown, but shutdown here is deferred
 * until `refresh()`, by which point the data is gone. Three placements were
 * measured; only this one works:
 *
 *   - appending `session_write_close()` after the app: breaks outright on an app
 *     that never leaves PHP mode, because the appended `<?php` is then a syntax
 *     error — and a challenge written as a pure PHP file is the normal case;
 *   - calling it from the metadata probe: the session is no longer active by then;
 *   - a registered shutdown function: runs too late, same as the default.
 *
 * An output-buffer callback runs while the session is still active AND still
 * runs when the app calls `exit` or dies on a fatal error, because PHP flushes
 * output buffers on both paths. That is what makes session data survive an early
 * exit here. The callback may fire more than once; the status check makes the
 * repeat calls no-ops.
 *
 * The buffer is deliberately left REMOVABLE. Locking it (`flags = 0`) stops a
 * challenge from destroying it — but it also stops `ob_get_level()` from ever
 * reaching zero, and `while (ob_get_level()) ob_end_clean();` is a stock idiom
 * before serving raw output. Under a locked buffer that loop never terminates,
 * and php-wasm cannot be interrupted, so the request never settles and the
 * serialized queue wedges every request behind it: a silently frozen tab in
 * place of a silently swallowed body. The swallowed body is the better failure,
 * and it is not even silent any more — the metadata probe reports the buffer
 * depth and the runtime says so.
 *
 * Discarding the buffer does NOT cost the session: `ob_end_clean()` still fires
 * the handler, so `session_write_close()` has already run by then.
 */
const SESSION_FLUSH_HOOK = `ob_start(function ($chunk) {
  if (session_status() === PHP_SESSION_ACTIVE) { session_write_close(); }
  return $chunk;
});`

/**
 * Whether this app needs the session hook at all.
 *
 * The hook is not free. An always-open output buffer makes `headers_sent()`
 * report false after output, so `header()` succeeds where a real deployment
 * ignores it — a fidelity gap that changes which header-injection exploits
 * work. Injecting it only where sessions are actually used confines that gap to
 * challenges about sessions, which are not the ones about header injection.
 *
 * A source scan cannot see a dynamically constructed call. That miss is caught
 * rather than prevented: see the PHPSESSID check on the response metadata.
 */
function appUsesSession(appCode: string, mountedFiles: Uint8Array[] = []): boolean {
  const mentions = (source: string) =>
    /\bsession_[a-z_]+\s*\(/i.test(source) || /\$_SESSION\b/.test(source)
  if (mentions(appCode)) return true
  const decoder = new TextDecoder('utf-8', { fatal: false })
  return mountedFiles.some((bytes) => mentions(decoder.decode(bytes)))
}



interface SuperglobalPayload {
  get: Record<string, string>
  post: Record<string, string>
  cookie: Record<string, string>
  server: Record<string, string>
  rawInput: string
}

/**
 * Only the request-derived part of `$_SERVER`.
 *
 * These are assigned outright rather than merged onto whatever the interpreter
 * already holds. Merging left the host process's environment — HOME, PATH, PWD,
 * USER and friends — sitting in `$_SERVER`, which no PHP deployment exposes and
 * which any challenge printing `$_SERVER` would reveal.
 *
 * The set is deliberately the three the previous transport already provided.
 * Filling it out to a deployment's real shape is a separate change: a wrong
 * value for something like PHP_SELF is worse than a missing one, because a
 * missing key reads as null and is noticed while a wrong one silently passes.
 */
function buildServerVars(method: string, url: URL): Record<string, string> {
  return {
    REQUEST_METHOD: method,
    REQUEST_URI: url.pathname + (url.search || ''),
    HTTP_HOST: url.hostname,
  }
}

/**
 * Hand the superglobals to PHP as base64-wrapped JSON.
 *
 * The previous transport escaped every key and value into single-quoted PHP
 * literals. That representation cannot express a NUL byte, so a request carrying
 * one turned the generated prologue into a parse error and killed the request
 * outright — and a NUL is a stock PHP payload, so students hit it on purpose.
 * Base64 removes PHP string escaping from the path entirely: the payload is one
 * token with no quoting to get wrong, whatever bytes it contains.
 *
 * `$_ENV` is emptied for the same reason `$_SERVER` is assigned rather than
 * merged — it otherwise carries the host process's environment.
 */
function buildSuperglobalPrologue(payload: SuperglobalPayload, withSessionHook: boolean): string {
  const encoded = base64EncodeUtf8(JSON.stringify(payload))
  return `<?php
${withSessionHook ? SESSION_FLUSH_HOOK : ''}
$__wxl = json_decode(base64_decode('${encoded}'), true);
$_GET = $__wxl['get'];
$_POST = $__wxl['post'];
$_COOKIE = $__wxl['cookie'];
$_SERVER = $__wxl['server'];
$_ENV = [];
$_REQUEST = array_merge($__wxl['get'], $__wxl['post']);
$GLOBALS['_RAW_INPUT'] = $__wxl['rawInput'];
unset($__wxl);
?>`
}


function parseCookieHeader(header: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!header) return cookies
  for (const pair of header.split(';')) {
    const trimmed = pair.trim()
    if (!trimmed) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) {
      // name-only cookie with no value
      cookies[trimmed] = ''
    } else {
      const name = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      // Last-value-wins for duplicate names
      cookies[name] = value
    }
  }
  return cookies
}

/**
 * Integration coverage for PhpRuntime against the real php-wasm interpreter.
 *
 * Every other PHP test in this suite substitutes a double for the loader, which
 * is why the defects this change fixes went unnoticed: a double cannot produce
 * `Cannot redeclare`, cannot leak a header between requests, and cannot fail to
 * parse a null byte. Those only appear when a real interpreter runs the code.
 *
 * Uses PhpNode rather than PhpWeb because the test environment has no browser
 * wasm loader. Both extend php-wasm's PhpBase and their `run` bodies are
 * identical, so interpreter behaviour transfers; only the binary differs.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import FIXTURE_SOURCE from '../../fixtures/php/stateful-app.php?raw'
import { PhpRuntime, createPhpAdapter, type PhpInstance, type PhpWasmModule } from '../../../.vitepress/theme/composables/usePhpRuntime'
import { decodeCookieCarrier } from '../../../.vitepress/theme/composables/cookieCarrier'
import { readDiagnostics } from '../../../.vitepress/theme/composables/runtimeDiagnostics'

const FLAG = 'wxl{integration}'

/** php-wasm takes a moment to instantiate; every case in this file shares one budget. */
const TIMEOUT_MS = 60_000

async function makeRuntime(appCode: string, fsEntries: Record<string, Uint8Array> = {}) {
  const { PhpNode } = await import('php-wasm/PhpNode.mjs')
  let adapter: PhpInstance | null = null
  const runtime = new PhpRuntime(async () => {
    adapter = await createPhpAdapter(new PhpNode() as unknown as PhpWasmModule)
    return adapter
  })
  await runtime.initialize(appCode, {
    '/flag.txt': new TextEncoder().encode(FLAG),
    ...fsEntries,
  })
  return { runtime, adapter: adapter as unknown as PhpInstance }
}

const get = (path = '/') => new Request(`https://challenge-test.localhost${path}`)

// vi.spyOn on an already-spied method returns the SAME spy, so a case that
// leaves console.warn spied hands its recorded calls to the next case.
afterEach(() => { vi.restoreAllMocks() })

describe('PhpRuntime against real php-wasm — per-request isolation', () => {
  beforeAll(() => { /* placeholder so the suite reports even if a case throws early */ })

  it(
    'serves an app that declares a function more than once',
    async () => {
      const app = `<?php function render($n) { return "hi $n"; } echo render('x'); ?>`
      const { runtime } = await makeRuntime(app)

      const bodies: string[] = []
      for (let i = 0; i < 3; i++) {
        bodies.push(await (await runtime.handleRequest(get())).text())
      }

      expect(bodies).toEqual(['hi x', 'hi x', 'hi x'])
      for (const body of bodies) expect(body).not.toContain('Cannot redeclare')
    },
    TIMEOUT_MS,
  )

  it(
    'does not carry a global variable from one request into the next',
    async () => {
      const app = `<?php $counter = ($counter ?? 0) + 1; echo "counter=$counter"; ?>`
      const { runtime } = await makeRuntime(app)

      const first = await (await runtime.handleRequest(get())).text()
      const second = await (await runtime.handleRequest(get())).text()

      expect(first).toBe('counter=1')
      expect(second).toBe('counter=1')
    },
    TIMEOUT_MS,
  )

  it(
    'does not carry a response header from one request into the next',
    async () => {
      const app = `<?php
        if (($_GET['set'] ?? '') === '1') { header('X-Leaked: from-request-1'); }
        echo json_encode(headers_list());
      ?>`
      const { runtime } = await makeRuntime(app)

      await runtime.handleRequest(get('/?set=1'))
      const second = await (await runtime.handleRequest(get('/'))).text()

      expect(second).not.toContain('X-Leaked')
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — residual shutdown output', () => {
  it(
    'does not prepend a shutdown function\'s output to the next response',
    async () => {
      // PHP runs shutdown functions during refresh(), and their bytes stop in
      // php-wasm's internal buffer undispatched. Left there, the next run()
      // flushes them ahead of that request's own output.
      const app = `<?php
        if (($_GET['noisy'] ?? '') === '1') {
          register_shutdown_function(function () { echo "LEAKED-FROM-SHUTDOWN"; });
        }
        echo "body-" . ($_GET['n'] ?? '0');
      ?>`
      const { runtime } = await makeRuntime(app)

      await runtime.handleRequest(get('/?noisy=1&n=1'))
      const second = await (await runtime.handleRequest(get('/?n=2'))).text()

      expect(second).toBe('body-2')
      expect(second).not.toContain('LEAKED-FROM-SHUTDOWN')
    },
    TIMEOUT_MS,
  )

  it(
    'warns naming the discarded byte count when residue is dropped',
    async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const app = `<?php
        register_shutdown_function(function () { echo "RESIDUE"; });
        echo "body";
      ?>`
      const { runtime } = await makeRuntime(app)

      await runtime.handleRequest(get('/'))

      const messages = warn.mock.calls.map((c) => c.join(' '))
      expect(messages.some((m) => m.includes('7'))).toBe(true)
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — response headers and status', () => {
  it(
    'carries header() and http_response_code() onto the response',
    async () => {
      const app = `<?php header('X-A: 1'); http_response_code(404); echo "body"; ?>`
      const { runtime } = await makeRuntime(app)

      const response = await runtime.handleRequest(get('/'))

      expect(await response.text()).toBe('body')
      expect(response.headers.get('x-a')).toBe('1')
      expect(response.status).toBe(404)
    },
    TIMEOUT_MS,
  )

  it(
    'recovers metadata even when the app exits early',
    async () => {
      const app = `<?php header('Content-Type: text/plain'); http_response_code(403); echo "denied"; exit; ?>`
      const { runtime } = await makeRuntime(app)

      const response = await runtime.handleRequest(get('/'))

      expect(await response.text()).toBe('denied')
      expect(response.status).toBe(403)
      expect(response.headers.get('content-type')).toContain('text/plain')
    },
    TIMEOUT_MS,
  )

  it(
    'still returns a response when the app hits a fatal error',
    async () => {
      const app = `<?php echo "before"; nosuchfunction(); ?>`
      const { runtime } = await makeRuntime(app)

      const response = await runtime.handleRequest(get('/'))
      const body = await response.text()

      expect(body).toContain('before')
      expect(body).toContain('Fatal error')
    },
    TIMEOUT_MS,
  )

  it(
    'maps an unset status code to 200 and supplies the PHP default content type',
    async () => {
      const app = `<?php echo "plain body"; ?>`
      const { runtime } = await makeRuntime(app)

      const response = await runtime.handleRequest(get('/'))

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/html; charset=UTF-8')
      // Without this the test cannot tell "the probe reported no status, so 200"
      // from "the probe is broken, so 200 by fallback" — both produce 200 and
      // the same content type. A header only a working probe can supply is what
      // separates them.
      expect(response.headers.get('x-powered-by')).toContain('PHP')
    },
    TIMEOUT_MS,
  )

  it.each([
    { set: '', expected: 200 },
    { set: '404', expected: 404 },
    { set: '403', expected: 403 },
  ])(
    'maps http_response_code $set to status $expected',
    async ({ set, expected }) => {
      const app = set === ''
        ? `<?php echo "b"; ?>`
        : `<?php http_response_code(${set}); echo "b"; ?>`
      const { runtime } = await makeRuntime(app)

      expect((await runtime.handleRequest(get('/'))).status).toBe(expected)
    },
    TIMEOUT_MS,
  )

  it(
    'forwards X-Powered-By, as a real PHP deployment does',
    async () => {
      const { runtime } = await makeRuntime(`<?php echo "x"; ?>`)

      const response = await runtime.handleRequest(get('/'))

      expect(response.headers.get('x-powered-by')).toContain('PHP')
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — probe/body separation', () => {
  it(
    'keeps app output that looks like probe output in the body',
    async () => {
      // The body and the probe are separate executions, so nothing the app
      // prints can be mistaken for metadata. Were they sharing one capture
      // window, this payload is what would hijack the split.
      const app = `<?php echo '{"h":["X-Fake: 1"],"s":500}'; ?>`
      const { runtime } = await makeRuntime(app)

      const response = await runtime.handleRequest(get('/'))

      expect(await response.text()).toBe('{"h":["X-Fake: 1"],"s":500}')
      expect(response.status).toBe(200)
      expect(response.headers.get('x-fake')).toBeNull()
    },
    TIMEOUT_MS,
  )

  it(
    'delivers a body whose last character is not a newline',
    async () => {
      // GUARD for a php-wasm behaviour that is internal, not contractual:
      // run() flushes its byte buffers before the promise settles, which is the
      // only reason two executions can be told apart without a delimiter. The
      // buffers otherwise dispatch on newline, so a body that does not end in
      // one is exactly the case that would lose its tail if upstream changed.
      // If this test starts failing, the separation strategy needs a delimiter
      // again — see the design note on this dependency.
      const tail = 'no-trailing-newline-here'
      const app = `<?php echo "${tail}"; ?>`
      const { runtime } = await makeRuntime(app)

      const body = await (await runtime.handleRequest(get('/'))).text()

      expect(body).toBe(tail)
      expect(body.endsWith('e')).toBe(true)
    },
    TIMEOUT_MS,
  )

})

describe('PhpRuntime against real php-wasm — Set-Cookie transport', () => {
  it(
    'moves setcookie() output onto the X-Wxlsh-Set-Cookie carrier',
    async () => {
      // Set-Cookie is a forbidden response header in the Fetch API, so it cannot
      // ride on the Response directly. The Python runtime already carries it as
      // X-Wxlsh-Set-Cookie and ChallengeLayout restores it for the SW; PHP joins
      // that pipeline rather than inventing a second one.
      const app = `<?php setcookie('session', 'abc'); echo "ok"; ?>`
      const { runtime } = await makeRuntime(app)

      const response = await runtime.handleRequest(get('/'))

      expect(decodeCookieCarrier(response.headers.get('x-wxlsh-set-cookie') ?? ''))
        .toEqual([expect.stringContaining('session=abc')])
      expect(response.headers.get('set-cookie')).toBeNull()
    },
    TIMEOUT_MS,
  )

  it(
    'keeps two cookies separable rather than joining them into one value',
    async () => {
      const app = `<?php setcookie('a', '1'); setcookie('b', '2'); echo "ok"; ?>`
      const { runtime } = await makeRuntime(app)

      const carrier = (await runtime.handleRequest(get('/'))).headers.get('x-wxlsh-set-cookie') ?? ''
      const parts = decodeCookieCarrier(carrier)

      expect(parts.some((l) => l.startsWith('a=1'))).toBe(true)
      expect(parts.some((l) => l.startsWith('b=2'))).toBe(true)
      expect(parts).toHaveLength(2)
      // The separator must be legal in a header value; a newline is not,
      // and a real browser rejects the whole Headers.set for one while
      // happy-dom accepts it.
      // The carrier must stay legal in a header value, and must not be
      // splittable by anything the app emitted.
      expect(/[\r\n]/.test(carrier)).toBe(false)
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — native sessions', () => {
  const SESSION_APP = `<?php
    session_id('FIXEDSID');
    session_start();
    if (($_GET['login'] ?? '') === '1') { $_SESSION['user'] = 'alice'; echo "in"; }
    else { echo "user=" . ($_SESSION['user'] ?? 'ANON'); }
  ?>`

  it(
    'reads back session data written by an earlier request',
    async () => {
      // PHP defers the session write to request shutdown, and shutdown here does
      // not run until refresh() — by which point the data is gone. An epilogue
      // appended to the app closes the session inside the same execution.
      const { runtime } = await makeRuntime(SESSION_APP)

      await runtime.handleRequest(get('/?login=1'))
      const second = await (await runtime.handleRequest(get('/'))).text()

      expect(second).toBe('user=alice')
    },
    TIMEOUT_MS,
  )

  it(
    'keeps a session write made before an early exit',
    async () => {
      // PHP flushes output buffers on the exit path too, so the buffer callback
      // that closes the session still runs. An appended epilogue would not have.
      const app = `<?php
        session_id('EXITSID');
        session_start();
        if (($_GET['set'] ?? '') === '1') { $_SESSION['role'] = 'admin'; echo "set"; exit; }
        echo "role=" . ($_SESSION['role'] ?? 'NONE');
      ?>`
      const { runtime } = await makeRuntime(app)

      await runtime.handleRequest(get('/?set=1'))
      const second = await (await runtime.handleRequest(get('/'))).text()

      expect(second).toBe('role=admin')
    },
    TIMEOUT_MS,
  )

  it(
    'keeps a session write made before a fatal error',
    async () => {
      const app = `<?php
        session_id('FATALSID');
        session_start();
        if (($_GET['set'] ?? '') === '1') { $_SESSION['role'] = 'admin'; echo "set"; nosuchfunction(); }
        echo "role=" . ($_SESSION['role'] ?? 'NONE');
      ?>`
      const { runtime } = await makeRuntime(app)

      await runtime.handleRequest(get('/?set=1'))
      const second = await (await runtime.handleRequest(get('/'))).text()

      expect(second).toContain('role=admin')
    },
    TIMEOUT_MS,
  )

  it(
    'works for an app that never leaves PHP mode',
    async () => {
      // A challenge written as a pure PHP file has no closing tag. Appending a
      // `<?php` epilogue to one is a syntax error, which is why the session
      // hook lives in the prologue instead.
      const app = `<?php session_id('PURESID'); session_start(); $_SESSION['n'] = ($_SESSION['n'] ?? 0) + 1; echo "n=" . $_SESSION['n'];`
      const { runtime } = await makeRuntime(app)

      expect(await (await runtime.handleRequest(get('/'))).text()).toBe('n=1')
      expect(await (await runtime.handleRequest(get('/'))).text()).toBe('n=2')
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — authoring diagnostics', () => {
  it(
    'reports a non-zero exit code without altering the response the student sees',
    async () => {
      // display_errors is on in a real PHP deployment too, and challenges that
      // leak a path through error text depend on the body being untouched. The
      // author still needs a signal, so it rides a separate carrier header and
      // the console rather than the status code.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { runtime } = await makeRuntime(`<?php echo "before"; nosuchfunction(); ?>`)

      const response = await runtime.handleRequest(get('/'))
      const body = await response.text()

      expect(body).toContain('before')
      expect(body).toContain('Fatal error')
      expect(response.status).toBe(200)
      // The diagnostic goes to the author's console, never onto the response.
      expect(response.headers.get('x-wxlsh-runtime-diagnostic')).toBeNull()
      expect(warn.mock.calls.some((c) => c.join(' ').includes('exit code'))).toBe(true)
    },
    TIMEOUT_MS,
  )

  it(
    'emits no diagnostic when the app completes normally',
    async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { runtime } = await makeRuntime(`<?php echo "fine"; ?>`)

      const response = await runtime.handleRequest(get('/'))

      expect(response.headers.get('x-wxlsh-runtime-diagnostic')).toBeNull()
      expect(warn.mock.calls.some((c) => c.join(' ').includes('exit code'))).toBe(false)
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — superglobal transport', () => {
  it(
    'carries a parameter value containing a null byte through intact',
    async () => {
      // The old transport escaped values into single-quoted PHP literals, which
      // cannot express a NUL: the generated prologue became a parse error and
      // the whole request died. %00 is a stock PHP payload, so a student typing
      // one broke the runtime rather than probing the challenge.
      const app = `<?php echo bin2hex($_GET['a'] ?? ''); ?>`
      const { runtime } = await makeRuntime(app)

      const url = 'https://challenge-test.localhost/?a=' + encodeURIComponent('a\u0000b')
      const response = await runtime.handleRequest(new Request(url))

      expect(await response.text()).toBe('610062')
      expect(response.headers.get('x-wxlsh-runtime-diagnostic')).toBeNull()
    },
    TIMEOUT_MS,
  )

  it(
    'treats a parameter value that looks like PHP source as data',
    async () => {
      const app = `<?php echo $_GET['a'] ?? ''; ?>`
      const { runtime } = await makeRuntime(app)

      const payload = "'; system('id'); $x='"
      const url = 'https://challenge-test.localhost/?a=' + encodeURIComponent(payload)

      expect(await (await runtime.handleRequest(new Request(url))).text()).toBe(payload)
    },
    TIMEOUT_MS,
  )

  it(
    'preserves non-ASCII keys and values',
    async () => {
      const app = `<?php echo implode(',', array_keys($_GET)) . '|' . implode(',', array_values($_GET)); ?>`
      const { runtime } = await makeRuntime(app)

      const url = 'https://challenge-test.localhost/?' + new URLSearchParams({ 'ключ': '中文😀' })

      expect(await (await runtime.handleRequest(new Request(url))).text()).toBe('ключ|中文😀')
    },
    TIMEOUT_MS,
  )

  it(
    'keeps host environment variables out of $_SERVER and $_ENV',
    async () => {
      // array_merge onto the interpreter's existing $_SERVER left the CLI
      // environment in place. A real deployment's $_SERVER has none of this, so
      // var_dump($_SERVER) in a challenge gave the game away.
      const app = `<?php echo implode(',', array_keys($_SERVER)) . '|env=' . count($_ENV); ?>`
      const { runtime } = await makeRuntime(app)

      const body = await (await runtime.handleRequest(get('/'))).text()
      const [keys, env] = body.split('|')

      for (const leaked of ['HOME', 'PATH', 'PWD', 'USER', 'LOGNAME', 'argc', 'argv']) {
        expect(keys.split(',')).not.toContain(leaked)
      }
      expect(keys.split(',')).toContain('REQUEST_METHOD')
      expect(env).toBe('env=0')
    },
    TIMEOUT_MS,
  )

  it(
    'populates $_REQUEST from the query string merged with the form body',
    async () => {
      const app = `<?php ksort($_REQUEST); echo json_encode($_REQUEST); ?>`
      const { runtime } = await makeRuntime(app)

      const response = await runtime.handleRequest(new Request(
        'https://challenge-test.localhost/?a=1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'b=2',
        },
      ))

      expect(JSON.parse(await response.text())).toEqual({ a: '1', b: '2' })
    },
    TIMEOUT_MS,
  )

  it(
    'parses a form body on a method other than POST',
    async () => {
      const app = `<?php echo json_encode(['post' => $_POST, 'raw' => $GLOBALS['_RAW_INPUT']]); ?>`
      const { runtime } = await makeRuntime(app)

      const response = await runtime.handleRequest(new Request('https://challenge-test.localhost/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'a=1',
      }))

      const parsed = JSON.parse(await response.text())
      expect(parsed.post).toEqual({ a: '1' })
      expect(parsed.raw).toBe('a=1')
    },
    TIMEOUT_MS,
  )

  it(
    'leaves $_POST empty for a JSON body while preserving the raw input',
    async () => {
      const app = `<?php echo json_encode(['post' => $_POST, 'raw' => $GLOBALS['_RAW_INPUT']]); ?>`
      const { runtime } = await makeRuntime(app)

      const response = await runtime.handleRequest(new Request('https://challenge-test.localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"role":"admin"}',
      }))

      const parsed = JSON.parse(await response.text())
      expect(parsed.post).toEqual([])
      expect(parsed.raw).toBe('{"role":"admin"}')
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — filesystem snapshot', () => {
  const WRITER_APP = `<?php
    if (($_GET['write'] ?? '') === '1') {
      file_put_contents('/added.txt', 'new');
      file_put_contents('/flag.txt', 'TAMPERED');
      echo "wrote";
    } else {
      echo (file_exists('/added.txt') ? 'added' : 'no-added') . '|' . file_get_contents('/flag.txt');
    }
  ?>`

  it(
    'keeps files written by one request visible to the next',
    async () => {
      // refresh() deliberately leaves the filesystem alone: it is the only
      // cross-request state channel a PHP challenge has, carrying SQLite files,
      // session files and anything a write-primitive vulnerability produces.
      const { runtime } = await makeRuntime(WRITER_APP)

      await runtime.handleRequest(get('/?write=1'))
      const after = await (await runtime.handleRequest(get('/'))).text()

      expect(after).toBe('added|TAMPERED')
    },
    TIMEOUT_MS,
  )

  it(
    'restores the initialization snapshot when resetFs is called',
    async () => {
      const { runtime } = await makeRuntime(WRITER_APP)

      await runtime.handleRequest(get('/?write=1'))
      runtime.resetFs()
      const after = await (await runtime.handleRequest(get('/'))).text()

      expect(after).toBe(`no-added|${FLAG}`)
    },
    TIMEOUT_MS,
  )

  it(
    'clears session files so a reset challenge is logged out',
    async () => {
      const app = `<?php
        session_id('RESETSID');
        session_start();
        if (($_GET['login'] ?? '') === '1') { $_SESSION['user'] = 'alice'; echo "in"; }
        else { echo 'user=' . ($_SESSION['user'] ?? 'ANON'); }
      ?>`
      const { runtime } = await makeRuntime(app)

      await runtime.handleRequest(get('/?login=1'))
      expect(await (await runtime.handleRequest(get('/'))).text()).toBe('user=alice')

      runtime.resetFs()

      expect(await (await runtime.handleRequest(get('/'))).text()).toBe('user=ANON')
    },
    TIMEOUT_MS,
  )
})

/**
 * The fixture is a challenge-shaped app rather than a one-liner: it declares a
 * class and functions, keeps a session, sets cookies and status codes, reads a
 * mounted file and writes one. Running the whole runtime against it is what
 * catches an interaction that the single-behaviour cases above cannot.
 */
const FIXTURE = FIXTURE_SOURCE

describe('PhpRuntime against real php-wasm — challenge-shaped fixture', () => {
  const form = (path: string, body: string) => new Request(
    `https://challenge-test.localhost${path}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    },
  )

  it(
    'runs a class-declaring, session-keeping app across a whole flow',
    async () => {
      const { runtime } = await makeRuntime(FIXTURE)

      // Anonymous first: the app declares a class and two functions, so a
      // runtime without per-request isolation dies on the second request here.
      const anon = await runtime.handleRequest(get('/?action=whoami'))
      expect(anon.status).toBe(403)

      const login = await runtime.handleRequest(form('/?action=login', 'user=alice'))
      expect(login.status).toBe(200)
      expect(decodeCookieCarrier(login.headers.get('x-wxlsh-set-cookie') ?? '')
        .some((c) => c.startsWith('logged_in=1'))).toBe(true)

      const who = await runtime.handleRequest(get('/?action=whoami'))
      expect(who.status).toBe(200)
      expect(await who.text()).toContain('alice')

      // Filesystem writes accumulate across requests.
      await runtime.handleRequest(get('/?action=note&text=first'))
      const second = await runtime.handleRequest(get('/?action=note&text=second'))
      expect(await second.text()).toContain('2')

      // A mounted file, served as text/plain rather than the html default.
      const flag = await runtime.handleRequest(get('/?action=flag'))
      expect(flag.headers.get('content-type')).toContain('text/plain')
      expect(await flag.text()).toBe(FLAG)

      // resetFs puts it back to a fresh challenge: notes gone, session gone.
      runtime.resetFs()
      const afterReset = await runtime.handleRequest(get('/?action=whoami'))
      expect(afterReset.status).toBe(403)
      const notes = await runtime.handleRequest(get('/?action=note&text=again'))
      expect(await notes.text()).toContain('1')
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — request serialization', () => {
  it(
    'does not interleave two overlapping requests',
    async () => {
      // One interpreter serves every request, and the adapter resets its capture
      // buffer at the start of each run. Two requests in flight at once therefore
      // reset each other's buffer and refresh() each other's interpreter mid-run:
      // both responses came back as the concatenation of both bodies. On a
      // pentest lab that is an unauthorised route's response carrying an
      // authorised route's content.
      const app = `<?php
        $r = $_GET['r'] ?? 'fast';
        if ($r === 'slow') { $x = 0; for ($i = 0; $i < 300000; $i++) { $x += $i; } echo "SLOW-BODY"; }
        else { echo "FAST-BODY"; }
      ?>`
      const { runtime } = await makeRuntime(app)

      const [slow, fast] = await Promise.all([
        runtime.handleRequest(get('/?r=slow')),
        runtime.handleRequest(get('/?r=fast')),
      ])

      expect(await slow.text()).toBe('SLOW-BODY')
      expect(await fast.text()).toBe('FAST-BODY')
    },
    TIMEOUT_MS,
  )

  it(
    'keeps sessions apart when requests overlap',
    async () => {
      const app = `<?php
        session_id($_GET['sid'] ?? 'x');
        session_start();
        if (isset($_GET['set'])) { $_SESSION['v'] = $_GET['set']; echo "set"; }
        else { echo "v=" . ($_SESSION['v'] ?? 'NONE'); }
      ?>`
      const { runtime } = await makeRuntime(app)

      await Promise.all([
        runtime.handleRequest(get('/?sid=A&set=alpha')),
        runtime.handleRequest(get('/?sid=B&set=beta')),
      ])
      const a = await (await runtime.handleRequest(get('/?sid=A'))).text()
      const b = await (await runtime.handleRequest(get('/?sid=B'))).text()

      expect(a).toBe('v=alpha')
      expect(b).toBe('v=beta')
    },
    TIMEOUT_MS,
  )

  it(
    'still resets the interpreter when an execution rejects',
    async () => {
      // refresh() sat after the awaits rather than in a finally, so a rejection
      // from php-wasm itself skipped it and the next request inherited the
      // previous one's headers, session and declarations.
      // The failing request sets a header; the following one sets none. If the
      // reset was skipped, the second response still carries the first's header.
      const app = `<?php
        if (($_GET['leak'] ?? '') === '1') { header('X-Leak: from-failed-request'); }
        echo "ok";
      ?>`
      const { runtime, adapter } = await makeRuntime(app)

      const realRun = adapter.run.bind(adapter)
      let failNext = true
      adapter.run = async (code: string) => {
        const result = await realRun(code)
        if (failNext && !code.includes('headers_list()')) {
          failNext = false
          throw new Error('simulated php-wasm failure')
        }
        return result
      }

      await expect(runtime.handleRequest(get('/?leak=1'))).rejects.toThrow('simulated php-wasm failure')

      const after = await runtime.handleRequest(get('/'))
      expect(after.headers.get('x-leak')).toBeNull()
      expect(await after.text()).toBe('ok')
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — cookie carrier cannot be split by the app', () => {
  it(
    'keeps an attacker-supplied TAB inside one cookie',
    async () => {
      // PHP's header() rejects CR and LF but passes a TAB through, so a separator
      // that is merely "excluded from cookie-octet" is still reachable: a
      // challenge doing header("Set-Cookie: sid=" . $_GET['v']) let a student
      // send v=x%09role=admin and split one cookie into two real ones. That is a
      // solve path which exists only in this lab.
      const app = `<?php header("Set-Cookie: sid=" . ($_GET['v'] ?? '')); echo "ok"; ?>`
      const { runtime } = await makeRuntime(app)

      const url = 'https://challenge-test.localhost/?v=' + encodeURIComponent('x\trole=admin')
      const carrier = (await runtime.handleRequest(new Request(url)))
        .headers.get('x-wxlsh-set-cookie') ?? ''

      expect(decodeCookieCarrier(carrier)).toEqual(['sid=x\trole=admin'])
    },
    TIMEOUT_MS,
  )

  it.each([
    { name: 'comma', payload: 'x,role=admin' },
    { name: 'tab', payload: 'x\trole=admin' },
    { name: 'base64 padding', payload: 'x=YWJj,ZGVm==' },
  ])(
    'keeps an attacker-supplied $name inside one cookie',
    async ({ payload }) => {
      const app = `<?php header("Set-Cookie: sid=" . ($_GET['v'] ?? '')); echo "ok"; ?>`
      const { runtime } = await makeRuntime(app)

      const url = 'https://challenge-test.localhost/?v=' + encodeURIComponent(payload)
      const carrier = (await runtime.handleRequest(new Request(url)))
        .headers.get('x-wxlsh-set-cookie') ?? ''

      expect(decodeCookieCarrier(carrier)).toHaveLength(1)
      expect(decodeCookieCarrier(carrier)[0]).toBe('sid=' + payload)
    },
    TIMEOUT_MS,
  )

  it(
    'still separates two cookies the app genuinely set',
    async () => {
      const app = `<?php setcookie('a', '1'); setcookie('b', '2'); echo "ok"; ?>`
      const { runtime } = await makeRuntime(app)

      const carrier = (await runtime.handleRequest(get('/')))
        .headers.get('x-wxlsh-set-cookie') ?? ''
      const parts = decodeCookieCarrier(carrier)

      expect(parts.some((c) => c.startsWith('a=1'))).toBe(true)
      expect(parts.some((c) => c.startsWith('b=2'))).toBe(true)
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — the session hook stays out of the way', () => {
  it(
    'leaves headers_sent() semantics alone for a challenge that has no session',
    async () => {
      // The hook is an output buffer, and an open buffer makes headers_sent()
      // report false after output — so header() succeeds where a real deployment
      // would ignore it. That changes which header-injection exploits work, so
      // the hook is only injected for challenges that actually use sessions.
      const app = `<?php
        echo "body";
        @header('X-Late: 1');
        echo " sent=" . (headers_sent() ? 'Y' : 'N') . " lvl=" . ob_get_level();
      ?>`
      const { runtime } = await makeRuntime(app)

      const response = await runtime.handleRequest(get('/'))

      expect(await response.text()).toContain('sent=Y')
      expect(await (await runtime.handleRequest(get('/'))).text()).toContain('lvl=0')
      expect(response.headers.get('x-late')).toBeNull()
    },
    TIMEOUT_MS,
  )

  it(
    'lets a challenge drain the output buffer, and says so, rather than hanging',
    async () => {
      // The buffer is left removable on purpose. Locking it stops a challenge
      // from discarding the runtime's layer, but it also stops ob_get_level()
      // from ever reaching zero — and `while (ob_get_level()) ob_end_clean();`
      // is a stock idiom. Under a locked buffer that loop never terminates, and
      // php-wasm cannot be interrupted, so the request never settles and the
      // serialized queue wedges every request behind it. A lost body that is
      // reported beats a frozen tab that is not.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const app = `<?php
        session_id('OB');
        session_start();
        $_SESSION['u'] = 'alice';
        echo "discarded-by-the-app";
        @ob_end_clean();
        echo "|after";
      ?>`
      const { runtime } = await makeRuntime(app)

      const body = await (await runtime.handleRequest(get('/'))).text()

      expect(body).toBe('|after')
      expect(warn.mock.calls.some((c) => c.join(' ').includes('output buffer'))).toBe(true)
    },
    TIMEOUT_MS,
  )

  it(
    'still persists the session when the app drains the buffer',
    async () => {
      // ob_end_clean() fires the handler on its way out, so session_write_close()
      // has already run by the time the buffer is discarded.
      const app = `<?php
        session_id('OB2');
        session_start();
        if (isset($_GET['login'])) { $_SESSION['u'] = 'alice'; echo "in"; @ob_end_clean(); }
        else { echo "u=" . ($_SESSION['u'] ?? 'ANON'); }
      ?>`
      const { runtime } = await makeRuntime(app)

      await runtime.handleRequest(get('/?login=1'))

      expect(await (await runtime.handleRequest(get('/'))).text()).toBe('u=alice')
    },
    TIMEOUT_MS,
  )

  it(
    'terminates the standard drain idiom',
    async () => {
      const app = `<?php
        session_id('OB3');
        session_start();
        $i = 0;
        while (ob_get_level() && $i < 50) { @ob_end_clean(); $i++; }
        echo "iters=$i level=" . ob_get_level();
      ?>`
      const { runtime } = await makeRuntime(app)

      const body = await (await runtime.handleRequest(get('/'))).text()

      // One iteration clears the runtime's single layer and the loop exits.
      expect(body).toBe('iters=1 level=0')
    },
    TIMEOUT_MS,
  )

  it(
    'still lets a challenge use output buffering of its own',
    async () => {
      const app = `<?php
        session_id('NEST');
        session_start();
        ob_start();
        echo "inner";
        $c = ob_get_clean();
        echo "[" . $c . "]";
      ?>`
      const { runtime } = await makeRuntime(app)

      expect(await (await runtime.handleRequest(get('/'))).text()).toBe('[inner]')
    },
    TIMEOUT_MS,
  )

  it(
    'warns when a session was started that the hook could not have persisted',
    async () => {
      // Detection is a static scan of the app source, so a dynamic call slips
      // past it. The session then silently fails to persist — unless the runtime
      // notices, which it can: session_id() stays readable for the life of the
      // session, on every request, unlike the PHPSESSID cookie PHP sends only
      // when it mints an id.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      // Every session reference here is constructed at runtime, so the source
      // scan genuinely cannot see it — which is the case being tested. A literal
      // session_id() call anywhere in the source would defeat the point.
      const app = `<?php
        $start = 'session_' . 'start';
        $setId = 'session_' . 'id';
        $setId('DYN');
        $start();
        $GLOBALS['_SESSION']['v'] = 'ghost';
        echo "set";
      ?>`
      const { runtime } = await makeRuntime(app)

      await runtime.handleRequest(get('/'))

      expect(warn.mock.calls.some((c) => c.join(' ').includes('did not detect'))).toBe(true)
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — failing loudly instead of fabricating success', () => {
  it(
    'reports a 500 rather than a fabricated 200 when the metadata cannot be read',
    async () => {
      // The fallback used to return { headers: [], status: 200 }, so a challenge
      // that answered 403 with a Set-Cookie was silently downgraded to a 200 that
      // set no cookie. A response whose metadata could not be read is not a
      // success and must not be presented as one.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { runtime, adapter } = await makeRuntime(`<?php echo "body"; ?>`)

      const realRun = adapter.run.bind(adapter)
      adapter.run = async (code: string) =>
        code.includes('headers_list()')
          ? { output: 'not json at all', exitCode: 0 }
          : realRun(code)

      const response = await runtime.handleRequest(get('/'))

      expect(response.status).toBe(500)
      expect(response.headers.get('x-wxlsh-runtime-diagnostic')).toBeNull()
      expect(warn.mock.calls.some((c) => c.join(' ').includes('metadata'))).toBe(true)
    },
    TIMEOUT_MS,
  )

  it.each([
    { code: 204, name: 'no content' },
    { code: 205, name: 'reset content' },
    { code: 304, name: 'not modified' },
  ])(
    'drops the body for $code $name rather than failing the request',
    async ({ code }) => {
      // new Response(body, { status: 204 }) throws a TypeError, which would kill
      // the whole request instead of the challenge. The status is what PHP asked
      // for; the body is what has to give.
      const app = `<?php http_response_code(${code}); echo "body that cannot ship"; ?>`
      const { runtime } = await makeRuntime(app)

      const response = await runtime.handleRequest(get('/'))

      expect(response.status).toBe(code)
      expect(await response.text()).toBe('')
    },
    TIMEOUT_MS,
  )

  it.each([
    { code: 99 },
    { code: 700 },
  ])(
    'clamps an out-of-range status $code instead of throwing',
    async ({ code }) => {
      const app = `<?php http_response_code(${code}); echo "body"; ?>`
      const { runtime } = await makeRuntime(app)

      const response = await runtime.handleRequest(get('/'))

      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThanOrEqual(599)
      expect(await response.text()).toBe('body')
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — the diagnostic never reaches the student', () => {
  it(
    'delivers the diagnostic through a callback, not a response header',
    async () => {
      // The strip used to live in useTrafficLog.wrap, but the Service Worker
      // path calls runtime.handleRequest directly and bypasses it — so the
      // carrier reached the student's simulated browser on that path. Reporting
      // out of band removes the header from every path at once.
      const seen: string[] = []
      const { PhpNode } = await import('php-wasm/PhpNode.mjs')
      const runtime = new PhpRuntime(
        async () => createPhpAdapter(new PhpNode() as unknown as PhpWasmModule),
        { onDiagnostic: (message) => seen.push(message) },
      )
      await runtime.initialize(`<?php echo "before"; nosuchfunction(); ?>`, {
        '/flag.txt': new TextEncoder().encode(FLAG),
      })

      const response = await runtime.handleRequest(get('/'))

      expect(seen.some((m) => m.includes('exit code'))).toBe(true)
      for (const [name] of response.headers) {
        expect(name.toLowerCase().startsWith('x-wxlsh-runtime-diagnostic')).toBe(false)
      }
    },
    TIMEOUT_MS,
  )

  it(
    'emits no diagnostic for a request that succeeded',
    async () => {
      const seen: string[] = []
      const { PhpNode } = await import('php-wasm/PhpNode.mjs')
      const runtime = new PhpRuntime(
        async () => createPhpAdapter(new PhpNode() as unknown as PhpWasmModule),
        { onDiagnostic: (message) => seen.push(message) },
      )
      await runtime.initialize(`<?php echo "fine"; ?>`, {})

      await runtime.handleRequest(get('/'))

      expect(seen).toEqual([])
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — audit round 2 contracts', () => {
  const makeWithDiagnostics = async (app: string, fsEntries: Record<string, Uint8Array> = {}) => {
    const seen: string[] = []
    const { PhpNode } = await import('php-wasm/PhpNode.mjs')
    let adapter: PhpInstance | null = null
    const runtime = new PhpRuntime(
      async () => {
        adapter = await createPhpAdapter(new PhpNode() as unknown as PhpWasmModule)
        return adapter
      },
      { onDiagnostic: (m) => seen.push(m) },
    )
    await runtime.initialize(app, { '/flag.txt': new TextEncoder().encode(FLAG), ...fsEntries })
    return { runtime, seen, adapter: adapter as unknown as PhpInstance }
  }

  it(
    'fails closed after a reset failure instead of serving contaminated state',
    async () => {
      const { runtime, seen, adapter } = await makeWithDiagnostics(`<?php echo "ok"; ?>`)
      const realRefresh = adapter.refresh.bind(adapter)
      let breakOnce = true
      adapter.refresh = async () => {
        if (breakOnce) { breakOnce = false; throw new Error('simulated reset failure') }
        return realRefresh()
      }

      await runtime.handleRequest(get('/'))
      const after = await runtime.handleRequest(get('/'))

      expect(after.status).toBe(500)
      expect(await after.text()).toContain('could not be reset')
      expect(seen.some((m) => m.includes('contaminated'))).toBe(true)
    },
    TIMEOUT_MS,
  )

  it(
    'detects session use that lives in a mounted sibling file',
    async () => {
      // `app:` names only the entry point; a require'd file is just as much the
      // challenge's source. Missing it means every $_SESSION write is discarded.
      // The entry point must mention nothing session-related, or the scan finds
      // it there and the mounted file is never consulted — which would make this
      // test pass with or without the fix.
      const app = `<?php require '/auth.php'; echo current_user(); ?>`
      const auth = new TextEncoder().encode(
        `<?php
          session_id('SIB');
          session_start();
          if (isset($_GET['login'])) { $_SESSION['u'] = 'alice'; }
          function current_user() { return 'u=' . ($_SESSION['u'] ?? 'ANON'); }
        ?>`,
      )
      const { runtime, seen } = await makeWithDiagnostics(app, { '/auth.php': auth })

      await runtime.handleRequest(get('/?login=1'))
      const second = await (await runtime.handleRequest(get('/'))).text()

      expect(second).toBe('u=alice')
      expect(seen.some((m) => m.includes('did not detect'))).toBe(false)
    },
    TIMEOUT_MS,
  )

  it(
    'reports a status it had to rewrite',
    async () => {
      const { runtime, seen } = await makeWithDiagnostics(`<?php http_response_code(99); echo "b"; ?>`)

      const response = await runtime.handleRequest(get('/'))

      expect(response.status).toBe(200)
      expect(seen.some((m) => m.includes('99'))).toBe(true)
    },
    TIMEOUT_MS,
  )

  it(
    'reports a body it had to drop',
    async () => {
      const { runtime, seen } = await makeWithDiagnostics(`<?php http_response_code(204); echo "lost"; ?>`)

      await runtime.handleRequest(get('/'))

      expect(seen.some((m) => m.includes('cannot carry a body'))).toBe(true)
    },
    TIMEOUT_MS,
  )

  it(
    'drops a reserved X-Wxlsh- header the challenge tried to emit',
    async () => {
      // Otherwise the app controls a transport every consumer decodes: an
      // app-written Set-Cookie carrier becomes real cookies in the jar.
      const app = `<?php header('X-Wxlsh-Set-Cookie: ' . base64_encode('injected=yes')); echo "ok"; ?>`
      const { runtime, seen } = await makeWithDiagnostics(app)

      const response = await runtime.handleRequest(get('/'))

      expect(response.headers.get('x-wxlsh-set-cookie')).toBeNull()
      expect(seen.some((m) => m.includes('reserved header'))).toBe(true)
    },
    TIMEOUT_MS,
  )

  it(
    'survives a diagnostic callback that throws',
    async () => {
      const { PhpNode } = await import('php-wasm/PhpNode.mjs')
      const runtime = new PhpRuntime(
        async () => createPhpAdapter(new PhpNode() as unknown as PhpWasmModule),
        { onDiagnostic: () => { throw new Error('host callback blew up') } },
      )
      await runtime.initialize(`<?php echo "before"; nosuchfn(); ?>`, {})

      const response = await runtime.handleRequest(get('/'))

      expect(await response.text()).toContain('before')
    },
    TIMEOUT_MS,
  )
})

describe('PhpRuntime against real php-wasm — diagnostics ride the response object', () => {
  it(
    'attaches its diagnostics to the response it produced them for',
    async () => {
      // A consumer reads them by identity. Without this the Network panel sees
      // nothing on the paths that do not supply an onDiagnostic callback.
      const { runtime } = await makeRuntime(`<?php echo "before"; nosuchfn(); ?>`)

      const response = await runtime.handleRequest(get('/'))

      expect(readDiagnostics(response).some((m) => m.includes('exit code'))).toBe(true)
    },
    TIMEOUT_MS,
  )

  it(
    'attaches nothing to a response that raised nothing',
    async () => {
      const { runtime } = await makeRuntime(`<?php echo "fine"; ?>`)

      expect(readDiagnostics(await runtime.handleRequest(get('/')))).toEqual([])
    },
    TIMEOUT_MS,
  )

  it(
    'keeps both diagnostics when one request raises two',
    async () => {
      // A single slot kept only the last, hiding the message that explained the
      // status. 204 with a body raises the drop; the fatal raises the exit code.
      const { runtime } = await makeRuntime(`<?php http_response_code(204); echo "body"; nosuchfn(); ?>`)

      const messages = readDiagnostics(await runtime.handleRequest(get('/')))

      expect(messages.some((m) => m.includes('cannot carry a body'))).toBe(true)
      expect(messages.some((m) => m.includes('exit code'))).toBe(true)
    },
    TIMEOUT_MS,
  )
})

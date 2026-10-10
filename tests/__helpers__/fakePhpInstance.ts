import { vi } from 'vitest'
import type { PhpInstance } from '../../.vitepress/theme/composables/usePhpRuntime'

/**
 * A `PhpInstance` double for tests that assert on the PHP source the runtime
 * generates, rather than on what a real interpreter does with it.
 *
 * `PhpRuntime` executes twice per request — the app, then the metadata probe —
 * so a double whose `run` always answers the same thing makes the probe return
 * nonsense and pushes every response through the parse fallback. This one
 * recognises the probe by the `headers_list()` call it contains and answers it
 * with well-formed metadata, leaving the app execution to return the body.
 */
export interface FakePhp {
  instance: PhpInstance
  loadPhp: () => Promise<PhpInstance>
  /** Only the app executions, in order — the metadata probe is filtered out. */
  appRuns: () => string[]
  run: ReturnType<typeof vi.fn>
  writeFile: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  flush: ReturnType<typeof vi.fn>
}

const isMetaProbe = (code: string) => code.includes('headers_list()')

export function makeFakePhp(options: {
  output?: string
  exitCode?: number
  /** Header lines the fake reports as though PHP had emitted them. */
  headers?: string[]
  /** What `http_response_code()` reports; `false` means "never set". */
  status?: number | false
} = {}): FakePhp {
  const { output = '', exitCode = 0, headers = [], status = false } = options

  const run = vi.fn(async (code: string) => {
    if (isMetaProbe(code)) {
      return { output: JSON.stringify({ h: headers, s: status }), exitCode: 0 }
    }
    return { output, exitCode }
  })
  const writeFile = vi.fn()
  const refresh = vi.fn(async () => {})
  const flush = vi.fn(() => '')

  const instance: PhpInstance = {
    run,
    writeFile,
    refresh,
    flush,
    readFile: vi.fn(() => new Uint8Array()),
    deleteFile: vi.fn(),
    listFiles: vi.fn(() => [] as string[]),
  }

  return {
    instance,
    loadPhp: vi.fn(async () => instance),
    appRuns: () => run.mock.calls.map((c) => c[0] as string).filter((c) => !isMetaProbe(c)),
    run,
    writeFile,
    refresh,
    flush,
  }
}

/**
 * Recover the superglobals from a generated prologue.
 *
 * The runtime hands PHP one base64 token rather than PHP literals, so a test
 * cannot assert on the source text and should not want to: what matters is the
 * values PHP ends up with, not how they were spelled on the way in.
 */
export function decodeSuperglobals(generatedCode: string): {
  get: Record<string, string>
  post: Record<string, string>
  cookie: Record<string, string>
  server: Record<string, string>
  rawInput: string
} {
  const match = generatedCode.match(/base64_decode\('([A-Za-z0-9+/=]*)'\)/)
  if (!match) throw new Error('no base64 superglobal payload found in generated code')
  const binary = atob(match[1])
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

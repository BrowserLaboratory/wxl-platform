import { describe, it, expect, vi } from 'vitest'
import { PythonRuntime, installRequestsPatch } from '../../../.vitepress/theme/composables/usePythonRuntime'

const APP_CODE = 'app = lambda scope, receive, send: None'

function makeMockPyodide() {
  const runPythonAsync = vi.fn().mockResolvedValue(undefined)
  const pyodide = {
    runPythonAsync,
    loadPackage: vi.fn().mockResolvedValue(undefined),
    FS: { writeFile: vi.fn() },
    globals: { get: vi.fn().mockReturnValue(vi.fn()), set: vi.fn() },
  }
  const loadPyodide = vi.fn().mockResolvedValue(pyodide)
  return { loadPyodide, pyodide, runPythonAsync }
}

describe('PythonRuntime - requests monkey-patch', () => {
  it('installs requests via micropip during initialization', async () => {
    const { loadPyodide, runPythonAsync } = makeMockPyodide()
    const runtime = new PythonRuntime(loadPyodide)

    await runtime.initialize(APP_CODE, {}, ['flask'])

    const calls = runPythonAsync.mock.calls.map((c: string[]) => c[0] as string)
    const requestsInstall = calls.find(c => c.includes('requests'))
    expect(requestsInstall).toBeDefined()
  })

  it('monkey-patches HTTPAdapter.send after installing requests', async () => {
    const { loadPyodide, runPythonAsync } = makeMockPyodide()
    const runtime = new PythonRuntime(loadPyodide)

    await runtime.initialize(APP_CODE, {}, ['flask'])

    const calls = runPythonAsync.mock.calls.map((c: string[]) => c[0] as string)
    const patchCall = calls.find(c => c.includes('HTTPAdapter') && c.includes('send'))
    expect(patchCall).toBeDefined()
  })

  it('requests install and patch happen after app code execution', async () => {
    const { loadPyodide, runPythonAsync } = makeMockPyodide()
    const runtime = new PythonRuntime(loadPyodide)

    await runtime.initialize(APP_CODE, {}, ['flask'])

    const calls = runPythonAsync.mock.calls.map((c: string[]) => c[0] as string)
    const appCodeIdx = calls.findIndex(c => c === APP_CODE)
    const patchIdx = calls.findIndex(c => c.includes('HTTPAdapter'))
    expect(patchIdx).toBeGreaterThan(appCodeIdx)
  })
})

/**
 * The Code panel runs on its own Pyodide instance for every backend now, not
 * only for the non-Python ones, so requests has to be installed and patched
 * there too. `loadToolsPyodide` composes `loadPyodideFromCdn` with this
 * function; the CDN import itself cannot run under Node, so the composition is
 * covered by the built-site check in tests/site-smoke/code-panel-platform.spec.ts
 * and the two steps are pinned here.
 */
describe('Install real requests library in Pyodide - tool layer', () => {
  it('installs requests via micropip on the tool-layer instance', async () => {
    const { pyodide, runPythonAsync } = makeMockPyodide()

    await installRequestsPatch(pyodide as never, vi.fn())

    expect(pyodide.loadPackage).toHaveBeenCalledWith('micropip')
    const calls = runPythonAsync.mock.calls.map((c: string[]) => c[0] as string)
    expect(calls.some(c => c.includes('micropip.install') && c.includes('requests'))).toBe(true)
  })

  it('monkey-patches HTTPAdapter.send on the tool-layer instance', async () => {
    const { pyodide, runPythonAsync } = makeMockPyodide()

    await installRequestsPatch(pyodide as never, vi.fn())

    const calls = runPythonAsync.mock.calls.map((c: string[]) => c[0] as string)
    expect(calls.some(c => c.includes('HTTPAdapter.send = _patched_send'))).toBe(true)
  })

  it('injects the dispatch bridge before the patch runs', async () => {
    const { pyodide, runPythonAsync } = makeMockPyodide()
    const bridge = vi.fn()

    await installRequestsPatch(pyodide as never, bridge)

    expect(pyodide.globals.set).toHaveBeenCalledWith('_wxlsh_dispatch_bridge', bridge)
    const setOrder = pyodide.globals.set.mock.invocationCallOrder[0]
    const patchIdx = runPythonAsync.mock.calls.findIndex((c: string[]) => String(c[0]).includes('HTTPAdapter.send = _patched_send'))
    expect(runPythonAsync.mock.invocationCallOrder[patchIdx]).toBeGreaterThan(setOrder)
  })

  it('builds Response.raw so requests can extract cookies into the jar', async () => {
    const { pyodide, runPythonAsync } = makeMockPyodide()

    await installRequestsPatch(pyodide as never, vi.fn())

    const patch = runPythonAsync.mock.calls
      .map((c: string[]) => c[0] as string)
      .find(c => c.includes('HTTPAdapter.send = _patched_send')) as string
    // extract_cookies_to_jar returns immediately unless raw carries a truthy
    // _original_response whose .msg answers get_all("Set-Cookie").
    expect(patch).toContain('resp.raw = _WxlRawResponse(set_cookies)')
    expect(patch).toContain('_original_response')
    expect(patch).toContain('result.get("set_cookies")')
  })
})

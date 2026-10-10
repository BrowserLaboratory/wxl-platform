import { describe, it, expect, vi } from 'vitest'
import { PythonRuntime } from '../../../.vitepress/theme/composables/usePythonRuntime'

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

describe('PythonRuntime.initialize()', () => {
  it('loads Pyodide and executes app_code on first call', async () => {
    const { loadPyodide, runPythonAsync } = makeMockPyodide()
    const runtime = new PythonRuntime(loadPyodide)

    await runtime.initialize(APP_CODE)

    expect(loadPyodide).toHaveBeenCalledOnce()
    expect(runPythonAsync).toHaveBeenCalledWith(APP_CODE)
  })

  it('does NOT re-load Pyodide on second initialize call', async () => {
    const { loadPyodide } = makeMockPyodide()
    const runtime = new PythonRuntime(loadPyodide)

    await runtime.initialize(APP_CODE)
    await runtime.initialize(APP_CODE)

    expect(loadPyodide).toHaveBeenCalledOnce()
  })
})

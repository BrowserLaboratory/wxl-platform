import { describe, it, expect, vi } from 'vitest'
import { PythonRuntime } from '../../../.vitepress/theme/composables/usePythonRuntime'

const FLAG_CONTENT = 'CTF{test_flag_12345}'
const APP_CODE = 'app = lambda scope, receive, send: None'

function makeMockPyodideWithFS() {
  const fsWriteFile = vi.fn()
  let capturedFlagContent: string | undefined

  const runPythonAsync = vi.fn().mockImplementation(async (code: string) => {
    if (code.includes("open('/flag.txt').read()")) {
      return capturedFlagContent
    }
  })

  const pyodide = {
    runPythonAsync,
    FS: {
      writeFile: vi.fn().mockImplementation((path: string, data: Uint8Array) => {
        if (path === '/flag.txt') {
          capturedFlagContent = new TextDecoder().decode(data)
        }
        fsWriteFile(path, data)
      }),
    },
    loadPackage: vi.fn().mockResolvedValue(undefined),
    globals: { get: vi.fn().mockReturnValue(vi.fn()), set: vi.fn() },
  }
  const loadPyodide = vi.fn().mockResolvedValue(pyodide)
  return { loadPyodide, pyodide, fsWriteFile, runPythonAsync }
}

describe('PythonRuntime FS mount', () => {
  it('mounts FS entries into Pyodide MEMFS before app init', async () => {
    const { loadPyodide, pyodide, fsWriteFile } = makeMockPyodideWithFS()
    const runtime = new PythonRuntime(loadPyodide)

    const fsEntries: Record<string, Uint8Array> = {
      '/flag.txt': new TextEncoder().encode(FLAG_CONTENT),
    }

    await runtime.initialize(APP_CODE, fsEntries)

    expect(fsWriteFile).toHaveBeenCalledWith('/flag.txt', expect.any(Uint8Array))
    const writeCallOrder = fsWriteFile.mock.invocationCallOrder[0]
    const appCodeCallOrder = pyodide.runPythonAsync.mock.invocationCallOrder[0]
    expect(writeCallOrder).toBeLessThan(appCodeCallOrder)
  })

  it('does NOT expose FS content to window or globalThis', async () => {
    const { loadPyodide } = makeMockPyodideWithFS()
    const runtime = new PythonRuntime(loadPyodide)

    const fsEntries: Record<string, Uint8Array> = {
      '/flag.txt': new TextEncoder().encode(FLAG_CONTENT),
    }
    await runtime.initialize(APP_CODE, fsEntries)

    expect((globalThis as Record<string, unknown>)['flag']).toBeUndefined()
    expect((globalThis as Record<string, unknown>)['/flag.txt']).toBeUndefined()
    for (const key of Object.keys(globalThis)) {
      const val = (globalThis as Record<string, unknown>)[key]
      expect(typeof val === 'string' && val.includes(FLAG_CONTENT)).toBe(false)
    }
  })
})

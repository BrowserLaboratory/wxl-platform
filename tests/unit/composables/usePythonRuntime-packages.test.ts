import { describe, it, expect, vi } from 'vitest'
import { PythonRuntime } from '../../../.vitepress/theme/composables/usePythonRuntime'

const APP_CODE = 'app = lambda scope, receive, send: None'

function makeMockPyodide(micropipInstall?: ReturnType<typeof vi.fn>) {
  const install = micropipInstall ?? vi.fn().mockResolvedValue(undefined)
  const runPythonAsync = vi.fn().mockImplementation(async (code: string) => {
    // simulate micropip being importable via runPythonAsync
    if (code.startsWith('import micropip')) return install
    return undefined
  })
  const pyodide = {
    runPythonAsync,
    loadPackage: vi.fn().mockResolvedValue(undefined),
    FS: { writeFile: vi.fn() },
    globals: { get: vi.fn().mockReturnValue(vi.fn()), set: vi.fn() },
  }
  const loadPyodide = vi.fn().mockResolvedValue(pyodide)
  return { loadPyodide, pyodide, runPythonAsync, install }
}

describe('PythonRuntime - micropip packages', () => {
  it('[RED] installs packages via micropip before executing app_code', async () => {
    const { loadPyodide, runPythonAsync } = makeMockPyodide()
    const runtime = new PythonRuntime(loadPyodide)

    await runtime.initialize(APP_CODE, {}, ['flask', 'requests'])

    // micropip.install() should be called before app_code
    const calls = runPythonAsync.mock.calls.map((c: string[]) => c[0] as string)
    const micropipCallIdx = calls.findIndex((c) => c.includes('micropip'))
    const appCodeCallIdx = calls.findIndex((c) => c === APP_CODE)
    expect(micropipCallIdx).toBeGreaterThanOrEqual(0)
    expect(appCodeCallIdx).toBeGreaterThan(micropipCallIdx)
    expect(calls[micropipCallIdx]).toContain('flask')
    expect(calls[micropipCallIdx]).toContain('requests')
  })

  it('[RED] skips user-package micropip when packages is empty (but still installs requests)', async () => {
    const { loadPyodide, runPythonAsync } = makeMockPyodide()
    const runtime = new PythonRuntime(loadPyodide)

    await runtime.initialize(APP_CODE, {}, [])

    const calls = runPythonAsync.mock.calls.map((c: string[]) => c[0] as string)
    // No user-specified micropip install call (the one before app code)
    const userMicropipIdx = calls.findIndex(c => c.includes('micropip.install') && !c.includes('requests'))
    expect(userMicropipIdx).toBe(-1)
    // But requests is always installed (after app code)
    const requestsInstall = calls.some(c => c.includes("micropip.install('requests')"))
    expect(requestsInstall).toBe(true)
  })

  it('[RED] skips user-package micropip when packages is not provided (but still installs requests)', async () => {
    const { loadPyodide, runPythonAsync } = makeMockPyodide()
    const runtime = new PythonRuntime(loadPyodide)

    await runtime.initialize(APP_CODE)

    const calls = runPythonAsync.mock.calls.map((c: string[]) => c[0] as string)
    const userMicropipIdx = calls.findIndex(c => c.includes('micropip.install') && !c.includes('requests'))
    expect(userMicropipIdx).toBe(-1)
    const requestsInstall = calls.some(c => c.includes("micropip.install('requests')"))
    expect(requestsInstall).toBe(true)
  })

  it('[RED] routes native packages (sqlite3) to loadPackage, not micropip.install', async () => {
    const { loadPyodide, pyodide, runPythonAsync } = makeMockPyodide()
    const runtime = new PythonRuntime(loadPyodide)

    await runtime.initialize(APP_CODE, {}, ['sqlite3', 'flask'])

    // sqlite3 must be passed to loadPackage (native Pyodide package)
    const loadPackageCalls = pyodide.loadPackage.mock.calls.map((c: unknown[]) => c[0])
    const nativeCall = loadPackageCalls.find(
      (arg: unknown) => Array.isArray(arg) && (arg as string[]).includes('sqlite3'),
    )
    expect(nativeCall).toBeDefined()

    // flask must appear in micropip.install call
    const micropipInstallCode = runPythonAsync.mock.calls
      .map((c: string[]) => c[0] as string)
      .find((c) => c.includes('micropip.install'))
    expect(micropipInstallCode).toBeDefined()
    expect(micropipInstallCode).toContain('flask')

    // sqlite3 must NOT be passed to micropip.install
    expect(micropipInstallCode).not.toContain('sqlite3')
  })

  it('[RED] skips user-package micropip when all packages are native (but still installs requests)', async () => {
    const { loadPyodide, runPythonAsync } = makeMockPyodide()
    const runtime = new PythonRuntime(loadPyodide)

    await runtime.initialize(APP_CODE, {}, ['sqlite3'])

    const calls = runPythonAsync.mock.calls.map((c: string[]) => c[0] as string)
    // No user-specified micropip install call with sqlite3
    const userMicropipWithSqlite = calls.some(c => c.includes('micropip.install') && c.includes('sqlite3'))
    expect(userMicropipWithSqlite).toBe(false)
    // requests is always installed
    const requestsInstall = calls.some(c => c.includes("micropip.install('requests')"))
    expect(requestsInstall).toBe(true)
  })

  it('[RED] rejects initialize() when micropip install fails', async () => {
    const { loadPyodide, runPythonAsync } = makeMockPyodide()
    runPythonAsync.mockImplementation(async (code: string) => {
      if (code.includes('micropip')) throw new Error('PackageNotFoundError: nonexistent-pkg')
      return undefined
    })
    const runtime = new PythonRuntime(loadPyodide)

    await expect(runtime.initialize(APP_CODE, {}, ['nonexistent-pkg'])).rejects.toThrow(/nonexistent-pkg/)
  })
})

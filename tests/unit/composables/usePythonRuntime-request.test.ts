import { describe, it, expect, vi } from 'vitest'
import { PythonRuntime } from '../../../.vitepress/theme/composables/usePythonRuntime'

const APP_CODE = 'app = lambda scope, receive, send: None'

/**
 * Build a mock Pyodide that responds to globals.get('_asgi_bridge') with a
 * function returning the given status/body/headers as the JSON string format
 * that PythonRuntime.handleRequest() expects.
 */
function makeMockFlaskPyodide(status: number, body: string, headers: [string, string][] = []) {
  const responseJson = JSON.stringify({ status, headers, body: btoa(body) })
  const pyodide = {
    runPythonAsync: vi.fn().mockResolvedValue(undefined),
    loadPackage: vi.fn().mockResolvedValue(undefined),
    FS: { writeFile: vi.fn() },
    globals: {
      get: vi.fn().mockImplementation((name: string) => {
        if (name === '_asgi_bridge') {
          return vi.fn().mockResolvedValue(responseJson)
        }
      }),
      set: vi.fn(),
    },
  }
  const loadPyodide = vi.fn().mockResolvedValue(pyodide)
  return { loadPyodide }
}

describe('PythonRuntime.handleRequest()', () => {
  it('returns correct status and body from Flask app for GET request', async () => {
    const { loadPyodide } = makeMockFlaskPyodide(200, 'Hello, World!')
    const runtime = new PythonRuntime(loadPyodide)

    await runtime.initialize(APP_CODE)

    const request = new Request('https://challenge-test.localhost/hello', { method: 'GET' })
    const response = await runtime.handleRequest(request)

    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toBe('Hello, World!')
  })

  it('passes correct arguments to _asgi_bridge for GET /users?id=1', async () => {
    const bridgeSpy = vi.fn().mockResolvedValue(
      JSON.stringify({ status: 200, headers: [], body: btoa('') }),
    )
    const pyodide = {
      runPythonAsync: vi.fn().mockResolvedValue(undefined),
      loadPackage: vi.fn().mockResolvedValue(undefined),
      FS: { writeFile: vi.fn() },
      globals: {
        get: vi.fn().mockImplementation((name: string) => {
          if (name === '_asgi_bridge') return bridgeSpy
        }),
        set: vi.fn(),
      },
    }
    const loadPyodide = vi.fn().mockResolvedValue(pyodide)
    const runtime = new PythonRuntime(loadPyodide)
    await runtime.initialize(APP_CODE)

    const request = new Request('https://challenge-test.localhost/users?id=1')
    await runtime.handleRequest(request)

    expect(bridgeSpy).toHaveBeenCalledOnce()
    const [method, path, qs] = bridgeSpy.mock.calls[0] as [string, string, string, ...unknown[]]
    expect(method).toBe('GET')
    expect(path).toBe('/users')
    expect(qs).toBe('id=1')
  })
})

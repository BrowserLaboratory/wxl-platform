/**
 * End-to-end test: Flask SQLi demo challenge
 * Validates: frontmatter parsing → SW routing → Python runtime → response
 *
 * Uses mocked Pyodide to simulate Flask app response.
 */
import { describe, it, expect, vi } from 'vitest'
import { createRouter } from '../../.vitepress/workers/router'
import { PythonRuntime } from '../../.vitepress/theme/composables/usePythonRuntime'

const SLUG = 'sqli-demo'
const APP_CODE = `
# Simulated Flask SQLi app
app = 'sqli_app'
`

function makeMockFlaskPyodide(output: string, status = 200) {
  const responseJson = JSON.stringify({
    status,
    headers: [['content-type', 'text/html']],
    body: btoa(output),
  })
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
  return vi.fn().mockResolvedValue(pyodide)
}

describe('Flask SQLi demo — end-to-end', () => {
  it('routes challenge request through SW → Python runtime → returns response', async () => {
    const loadPyodide = makeMockFlaskPyodide('<html><body>Users list</body></html>')
    const runtime = new PythonRuntime(loadPyodide)
    await runtime.initialize(APP_CODE)

    const pythonDispatch = (req: Request) => runtime.handleRequest(req)
    const router = createRouter({ python: pythonDispatch })

    // Register the challenge
    router.handleMessage({ type: 'REGISTER_CHALLENGE', slug: SLUG, backend: 'flask' })

    const request = new Request(`https://challenge-${SLUG}.localhost/users`)
    const response = await router.dispatch(request)

    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('Users list')
  })

  it('returns 503 for unregistered challenge', async () => {
    const router = createRouter({})
    const req = new Request('https://challenge-unknown.localhost/')
    const res = await router.dispatch(req)
    expect(res.status).toBe(503)
  })
})

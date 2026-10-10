import { describe, it, expect, vi } from 'vitest'
import { attachDiagnostics } from '../../../.vitepress/theme/composables/runtimeDiagnostics'
import { useTrafficLog } from '../../../.vitepress/theme/composables/useTrafficLog'

describe('useTrafficLog', () => {
  it('records a GET request entry after dispatch', async () => {
    const { trafficLog, wrap } = useTrafficLog()
    const mockDispatch = vi.fn().mockResolvedValue(
      new Response('Hello', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
    )
    const tracked = wrap(mockDispatch)

    await tracked(new Request('https://challenge-test.localhost/api'))

    expect(trafficLog.value).toHaveLength(1)
    const entry = trafficLog.value[0]
    expect(entry.method).toBe('GET')
    expect(entry.url).toBe('https://challenge-test.localhost/api')
    expect(entry.status).toBe(200)
    expect(entry.responseBody).toBe('Hello')
    expect(entry.duration).toBeGreaterThanOrEqual(0)
    expect(entry.id).toBe(1)
  })

  it('records request headers and body for POST request', async () => {
    const { trafficLog, wrap } = useTrafficLog()
    const mockDispatch = vi.fn().mockResolvedValue(new Response('ok', { status: 201 }))
    const tracked = wrap(mockDispatch)

    const req = new Request('https://challenge-test.localhost/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=admin&password=secret',
    })
    await tracked(req)

    const entry = trafficLog.value[0]
    expect(entry.method).toBe('POST')
    expect(entry.requestBody).toBe('username=admin&password=secret')
    expect(entry.requestHeaders.map(([k]) => k.toLowerCase())).toContain('content-type')
  })

  it('records response headers', async () => {
    const { trafficLog, wrap } = useTrafficLog()
    const mockDispatch = vi.fn().mockResolvedValue(
      new Response('body', { status: 200, headers: { 'X-Custom': 'value' } }),
    )
    const tracked = wrap(mockDispatch)

    await tracked(new Request('https://challenge-test.localhost/'))

    const entry = trafficLog.value[0]
    expect(entry.responseHeaders.map(([k]) => k.toLowerCase())).toContain('x-custom')
  })

  it('records multiple entries with incrementing ids', async () => {
    const { trafficLog, wrap } = useTrafficLog()
    const mockDispatch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const tracked = wrap(mockDispatch)

    await tracked(new Request('https://challenge-test.localhost/a'))
    await tracked(new Request('https://challenge-test.localhost/b'))

    expect(trafficLog.value).toHaveLength(2)
    expect(trafficLog.value[0].id).toBe(1)
    expect(trafficLog.value[1].id).toBe(2)
  })

  it('clears all entries when clear() is called', async () => {
    const { trafficLog, wrap, clear } = useTrafficLog()
    const mockDispatch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const tracked = wrap(mockDispatch)

    await tracked(new Request('https://challenge-test.localhost/'))
    expect(trafficLog.value).toHaveLength(1)

    clear()
    expect(trafficLog.value).toHaveLength(0)
  })

  it('returns the original response unchanged', async () => {
    const { wrap } = useTrafficLog()
    const mockDispatch = vi.fn().mockResolvedValue(
      new Response('data', { status: 404, headers: { 'X-Flag': 'abc' } }),
    )
    const tracked = wrap(mockDispatch)

    const result = await tracked(new Request('https://challenge-test.localhost/'))
    expect(result.status).toBe(404)
    const body = await result.text()
    expect(body).toBe('data')
    expect(result.headers.get('x-flag')).toBe('abc')
  })

  it('requestBody is null for GET requests', async () => {
    const { trafficLog, wrap } = useTrafficLog()
    const mockDispatch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const tracked = wrap(mockDispatch)

    await tracked(new Request('https://challenge-test.localhost/'))
    expect(trafficLog.value[0].requestBody).toBeNull()
  })
})

// ─── buildDisplayHeaders: simulated browser header augmentation ───────────────

describe('useTrafficLog — simulated browser headers via X-Wxlsh-Context', () => {
  function makeTracked() {
    const { trafficLog, wrap } = useTrafficLog()
    const mockDispatch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    return { trafficLog, tracked: wrap(mockDispatch) }
  }

  function getHeaders(entry: { requestHeaders: [string, string][] }): Record<string, string> {
    return Object.fromEntries(entry.requestHeaders.map(([k, v]) => [k.toLowerCase(), v]))
  }

  it('strips X-Wxlsh-* metadata headers from the request passed to dispatch', async () => {
    const { trafficLog, tracked } = makeTracked()
    const req = new Request('https://challenge-test.localhost/', {
      headers: { 'X-Wxlsh-Context': 'navigation' },
    })
    await tracked(req)
    const headers = getHeaders(trafficLog.value[0])
    expect(headers['x-wxlsh-context']).toBeUndefined()
    expect(headers['x-wxlsh-referer']).toBeUndefined()
  })

  it('injects static browser headers for navigation context', async () => {
    const { trafficLog, tracked } = makeTracked()
    const req = new Request('https://challenge-test.localhost/', {
      headers: { 'X-Wxlsh-Context': 'navigation' },
    })
    await tracked(req)
    const headers = getHeaders(trafficLog.value[0])
    expect(headers['user-agent']).toContain('Chrome/120')
    expect(headers['accept-language']).toBe('en-US,en;q=0.9')
    expect(headers['accept-encoding']).toBe('gzip, deflate, br')
    expect(headers['sec-ch-ua']).toContain('Google Chrome')
    expect(headers['upgrade-insecure-requests']).toBe('1')
  })

  it('sets Sec-Fetch-Site: none and Sec-Fetch-User: ?1 for navigation context', async () => {
    const { trafficLog, tracked } = makeTracked()
    const req = new Request('https://challenge-test.localhost/', {
      headers: { 'X-Wxlsh-Context': 'navigation' },
    })
    await tracked(req)
    const headers = getHeaders(trafficLog.value[0])
    expect(headers['sec-fetch-site']).toBe('none')
    expect(headers['sec-fetch-user']).toBe('?1')
    expect(headers['sec-fetch-dest']).toBe('document')
    expect(headers['sec-fetch-mode']).toBe('navigate')
  })

  it('sets Referer and Sec-Fetch-Site: same-origin for link context', async () => {
    const { trafficLog, tracked } = makeTracked()
    const req = new Request('https://challenge-test.localhost/page', {
      headers: {
        'X-Wxlsh-Context': 'link',
        'X-Wxlsh-Referer': 'https://challenge-test.localhost/',
      },
    })
    await tracked(req)
    const headers = getHeaders(trafficLog.value[0])
    expect(headers['referer']).toBe('https://challenge-test.localhost/')
    expect(headers['sec-fetch-site']).toBe('same-origin')
    expect(headers['sec-fetch-user']).toBeUndefined()
  })

  it('sets Referer and Sec-Fetch-User: ?1 for form-get context', async () => {
    const { trafficLog, tracked } = makeTracked()
    const req = new Request('https://challenge-test.localhost/search', {
      headers: {
        'X-Wxlsh-Context': 'form-get',
        'X-Wxlsh-Referer': 'https://challenge-test.localhost/form',
      },
    })
    await tracked(req)
    const headers = getHeaders(trafficLog.value[0])
    expect(headers['referer']).toBe('https://challenge-test.localhost/form')
    expect(headers['sec-fetch-site']).toBe('same-origin')
    expect(headers['sec-fetch-user']).toBe('?1')
  })

  it('sets Origin and Content-Length for form-post urlencoded context', async () => {
    const { trafficLog, tracked } = makeTracked()
    const body = 'username=admin&password=secret'
    const req = new Request('https://challenge-test.localhost/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Wxlsh-Context': 'form-post',
        'X-Wxlsh-Referer': 'https://challenge-test.localhost/login',
      },
      body,
    })
    await tracked(req)
    const headers = getHeaders(trafficLog.value[0])
    expect(headers['origin']).toBe('https://challenge-test.localhost')
    expect(headers['referer']).toBe('https://challenge-test.localhost/login')
    expect(headers['content-length']).toBe(String(new TextEncoder().encode(body).byteLength))
    expect(headers['content-type']).toBe('application/x-www-form-urlencoded')
  })

  it('sets Host header derived from the request URL', async () => {
    const { trafficLog, tracked } = makeTracked()
    const req = new Request('https://challenge-sqli.localhost/path', {
      headers: { 'X-Wxlsh-Context': 'navigation' },
    })
    await tracked(req)
    const headers = getHeaders(trafficLog.value[0])
    expect(headers['host']).toBe('challenge-sqli.localhost')
  })
})

describe('useTrafficLog runtime diagnostics', () => {
  it('attaches diagnostics the runtime keyed to this response', async () => {
    const { trafficLog, wrap } = useTrafficLog()
    const tracked = wrap(async () => {
      const r = new Response('body', { status: 200 })
      attachDiagnostics(r, ['PHP execution ended with exit code 255'])
      return r
    })

    await tracked(new Request('https://challenge-test.localhost/'))

    expect(trafficLog.value.at(-1)!.runtimeDiagnostic).toContain('exit code 255')
  })

  it('keeps every diagnostic, not only the last one raised', async () => {
    // Three sites can report within one request. A single slot kept only the
    // last, hiding the message that explained why the status was a 500.
    const { trafficLog, wrap } = useTrafficLog()
    const tracked = wrap(async () => {
      const r = new Response('body', { status: 500 })
      attachDiagnostics(r, ['metadata could not be read', 'exit code 255'])
      return r
    })

    await tracked(new Request('https://challenge-test.localhost/'))

    const shown = trafficLog.value.at(-1)!.runtimeDiagnostic ?? ''
    expect(shown).toContain('metadata could not be read')
    expect(shown).toContain('exit code 255')
  })

  it('leaves runtimeDiagnostic undefined for a response that carried none', async () => {
    const { trafficLog, wrap } = useTrafficLog()
    const tracked = wrap(async () => new Response('body', { status: 200 }))

    await tracked(new Request('https://challenge-test.localhost/'))

    expect(trafficLog.value.at(-1)!.runtimeDiagnostic).toBeUndefined()
  })

  it('cannot attach a diagnostic raised for a response this wrapper never saw', async () => {
    // The Service Worker path bypasses wrap() entirely. With a shared slot its
    // diagnostic drifted onto the next logged entry; keyed on the response it
    // cannot.
    const { trafficLog, wrap } = useTrafficLog()
    const unseen = new Response('elsewhere', { status: 500 })
    attachDiagnostics(unseen, ['raised on the service worker path'])

    const tracked = wrap(async () => new Response('body', { status: 200 }))
    await tracked(new Request('https://challenge-test.localhost/'))

    expect(trafficLog.value.at(-1)!.runtimeDiagnostic).toBeUndefined()
  })

  it('never displays an X-Wxlsh- header among the response headers', async () => {
    const { trafficLog, wrap } = useTrafficLog()
    const tracked = wrap(async () => new Response('body', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }))

    await tracked(new Request('https://challenge-test.localhost/'))

    const names = trafficLog.value.at(-1)!.responseHeaders.map(([k]) => k.toLowerCase())
    expect(names.some((n) => n.startsWith('x-wxlsh-'))).toBe(false)
  })
})

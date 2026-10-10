import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BrowserPanel from '../../../.vitepress/theme/components/BrowserPanel.vue'
import { encodeCookieCarrier } from '../../../.vitepress/theme/composables/cookieCarrier'

describe('BrowserPanel', () => {
  it('renders HTML response in iframe on navigate', async () => {
    const mockDispatch = vi.fn().mockResolvedValue(
      new Response('<h1>Hello</h1>', {
        headers: { 'Content-Type': 'text/html' },
      }),
    )

    const wrapper = mount(BrowserPanel, {
      props: { slug: 'test', dispatch: mockDispatch },
    })

    const goBtn = wrapper.find('[data-go]')
    expect(goBtn.exists()).toBe(true)
    await goBtn.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('sandbox')).toContain('allow-scripts')
    expect(iframe.attributes('sandbox')).toContain('allow-forms')
    // allow-same-origin must NOT be present — it defeats the sandbox
    expect(iframe.attributes('sandbox')).not.toContain('allow-same-origin')
  })

  it('does NOT render HTTP method selector', () => {
    const mockDispatch = vi.fn()
    const wrapper = mount(BrowserPanel, {
      props: { slug: 'test', dispatch: mockDispatch },
    })
    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('displays JSON response as formatted text, not iframe', async () => {
    const mockDispatch = vi.fn().mockResolvedValue(
      new Response('{"key":"value"}', {
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const wrapper = mount(BrowserPanel, {
      props: { slug: 'test', dispatch: mockDispatch },
    })

    await wrapper.find('[data-go]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const pre = wrapper.find('[data-response-text]')
    expect(pre.exists()).toBe(true)
    expect(pre.text()).toContain('key')
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(false)
  })

  it('triggers navigate on Enter key in URL input', async () => {
    const mockDispatch = vi.fn().mockResolvedValue(
      new Response('OK', { headers: { 'Content-Type': 'text/plain' } }),
    )

    const wrapper = mount(BrowserPanel, {
      props: { slug: 'test', dispatch: mockDispatch },
    })

    const input = wrapper.find('[data-url-input]')
    expect(input.exists()).toBe(true)
    await input.trigger('keydown.enter')
    await wrapper.vm.$nextTick()

    expect(mockDispatch).toHaveBeenCalledOnce()
    const req: Request = mockDispatch.mock.calls[0][0]
    expect(req.method).toBe('GET')
  })

  it('dispatches GET-only requests', async () => {
    const mockDispatch = vi.fn().mockResolvedValue(
      new Response('OK', { headers: { 'Content-Type': 'text/plain' } }),
    )

    const wrapper = mount(BrowserPanel, {
      props: { slug: 'test', dispatch: mockDispatch },
    })

    await wrapper.find('[data-go]').trigger('click')
    await wrapper.vm.$nextTick()

    const req: Request = mockDispatch.mock.calls[0][0]
    expect(req.method).toBe('GET')
  })

  it('shows disabled state when disabled prop is true', () => {
    const mockDispatch = vi.fn()
    const wrapper = mount(BrowserPanel, {
      props: { slug: 'test', dispatch: mockDispatch, disabled: true },
    })
    const goBtn = wrapper.find('[data-go]')
    expect(goBtn.attributes('disabled')).toBeDefined()
  })
})

// ─── Form submit / link click via postMessage ─────────────────────────────────
// The iframe sandbox no longer includes allow-same-origin, so the injected script
// inside srcdoc relays events via parent.postMessage. Tests simulate this by
// dispatching MessageEvent on window with source=iframeEl.contentWindow.

/** Mount BrowserPanel, navigate to get the HTML iframe, and return helpers. */
async function mountWithIframe(slug: string, dispatch: ReturnType<typeof vi.fn>) {
  const wrapper = mount(BrowserPanel, {
    props: { slug, dispatch },
    attachTo: document.body,
  })
  // First call: navigate to render the iframe
  await wrapper.find('[data-go]').trigger('click')
  await flushPromises()

  const iframeEl = wrapper.find('iframe').element as HTMLIFrameElement
  return { wrapper, iframeEl }
}

/** Simulate the injected script posting a link click from inside the iframe. */
function postLinkClick(iframeEl: HTMLIFrameElement, href: string) {
  window.dispatchEvent(
    new MessageEvent('message', {
      source: iframeEl.contentWindow,
      data: { type: 'WXLSH_LINK_CLICK', href },
    }),
  )
}

/** Simulate the injected script posting a form submission from inside the iframe. */
function postFormSubmit(
  iframeEl: HTMLIFrameElement,
  opts: {
    action?: string
    method?: string
    enctype?: string
    fields?: [string, string][]
  } = {},
) {
  window.dispatchEvent(
    new MessageEvent('message', {
      source: iframeEl.contentWindow,
      data: {
        type: 'WXLSH_FORM_SUBMIT',
        action: opts.action ?? '',
        method: (opts.method ?? 'GET').toUpperCase(),
        enctype: opts.enctype ?? 'application/x-www-form-urlencoded',
        fields: opts.fields ?? [],
      },
    }),
  )
}

// ─── withContext: request context metadata headers ────────────────────────────
// Forbidden request headers (User-Agent, Sec-*, etc.) cannot be set on Request
// objects in JS. BrowserPanel passes context via X-Wxlsh-* metadata headers;
// useTrafficLog.wrap() uses them to build the full simulated header set for display.

describe('BrowserPanel — request context metadata (withContext)', () => {
  it('address bar navigation sets X-Wxlsh-Context: navigation', async () => {
    const mockDispatch = vi.fn().mockResolvedValue(
      new Response('OK', { headers: { 'Content-Type': 'text/plain' } }),
    )
    const wrapper = mount(BrowserPanel, {
      props: { slug: 'test', dispatch: mockDispatch },
    })
    await wrapper.find('[data-go]').trigger('click')
    await wrapper.vm.$nextTick()

    const req: Request = mockDispatch.mock.calls[0][0]
    expect(req.headers.get('X-Wxlsh-Context')).toBe('navigation')
    expect(req.headers.get('X-Wxlsh-Referer')).toBeNull()
  })

  it('link click sets X-Wxlsh-Context: link and X-Wxlsh-Referer', async () => {
    const mockDispatch = vi.fn()
      .mockResolvedValueOnce(new Response('<a href="/page2">link</a>', { headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(new Response('page2', { headers: { 'Content-Type': 'text/plain' } }))
    const { iframeEl } = await mountWithIframe('test', mockDispatch)

    postLinkClick(iframeEl, '/page2')
    await flushPromises()

    const req: Request = mockDispatch.mock.calls[1][0]
    expect(req.headers.get('X-Wxlsh-Context')).toBe('link')
    expect(req.headers.get('X-Wxlsh-Referer')).toBeTruthy()
  })

  it('form POST sets X-Wxlsh-Context: form-post and X-Wxlsh-Referer', async () => {
    const mockDispatch = vi.fn()
      .mockResolvedValueOnce(new Response('<h1>page</h1>', { headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(new Response('ok', { headers: { 'Content-Type': 'text/plain' } }))
    const { iframeEl } = await mountWithIframe('sqli-demo', mockDispatch)

    postFormSubmit(iframeEl, {
      method: 'POST',
      action: '/login',
      fields: [['username', 'admin'], ['password', 'secret']],
    })
    await flushPromises()

    const req: Request = mockDispatch.mock.calls[1][0]
    expect(req.headers.get('X-Wxlsh-Context')).toBe('form-post')
    expect(req.headers.get('X-Wxlsh-Referer')).toBeTruthy()
  })

  it('form GET sets X-Wxlsh-Context: form-get and X-Wxlsh-Referer', async () => {
    const mockDispatch = vi.fn()
      .mockResolvedValueOnce(new Response('<h1>page</h1>', { headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(new Response('results', { headers: { 'Content-Type': 'text/plain' } }))
    const { iframeEl } = await mountWithIframe('test', mockDispatch)

    postFormSubmit(iframeEl, {
      method: 'GET',
      action: '/search',
      fields: [['q', 'test']],
    })
    await flushPromises()

    const req: Request = mockDispatch.mock.calls[1][0]
    expect(req.headers.get('X-Wxlsh-Context')).toBe('form-get')
    expect(req.headers.get('X-Wxlsh-Referer')).toBeTruthy()
  })
})

// ─── Form submit interception tests ───────────────────────────────────────────

describe('BrowserPanel — form submit interception', () => {
  it('3.1 POST form with default enctype is submitted via dispatch with urlencoded content-type', async () => {
    const mockDispatch = vi.fn()
      .mockResolvedValueOnce(new Response('<h1>page</h1>', { headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(new Response('<p>ok</p>', { headers: { 'Content-Type': 'text/html' } }))

    const { iframeEl } = await mountWithIframe('sqli-demo', mockDispatch)

    postFormSubmit(iframeEl, {
      method: 'POST',
      action: '/login',
      enctype: 'application/x-www-form-urlencoded',
      fields: [['username', 'admin'], ['password', "' OR 1=1--"]],
    })
    await flushPromises()

    expect(mockDispatch).toHaveBeenCalledTimes(2)
    const req: Request = mockDispatch.mock.calls[1][0]
    expect(req.method).toBe('POST')
    expect(req.url).toBe('https://challenge-sqli-demo.localhost/login')
    expect(req.headers.get('content-type')).toContain('application/x-www-form-urlencoded')
  })

  it('3.2 POST form with multipart/form-data enctype dispatches without manually set content-type boundary', async () => {
    const mockDispatch = vi.fn()
      .mockResolvedValueOnce(new Response('<h1>page</h1>', { headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(new Response('<p>ok</p>', { headers: { 'Content-Type': 'text/html' } }))

    const { iframeEl } = await mountWithIframe('test', mockDispatch)

    postFormSubmit(iframeEl, {
      method: 'POST',
      action: '/upload',
      enctype: 'multipart/form-data',
      fields: [['file_name', 'test.txt']],
    })
    await flushPromises()

    expect(mockDispatch).toHaveBeenCalledTimes(2)
    const req: Request = mockDispatch.mock.calls[1][0]
    expect(req.method).toBe('POST')
    expect(req.url).toBe('https://challenge-test.localhost/upload')
    // content-type for FormData body is set by the fetch API (includes boundary),
    // or null — either way it must NOT be the urlencoded type
    const ct = req.headers.get('content-type')
    expect(ct).not.toContain('application/x-www-form-urlencoded')
  })

  it('3.3 GET form appends fields to query string', async () => {
    const mockDispatch = vi.fn()
      .mockResolvedValueOnce(new Response('<h1>page</h1>', { headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(new Response('<p>results</p>', { headers: { 'Content-Type': 'text/html' } }))

    const { iframeEl } = await mountWithIframe('test', mockDispatch)

    postFormSubmit(iframeEl, {
      method: 'GET',
      action: '/search',
      fields: [['q', 'hello world']],
    })
    await flushPromises()

    expect(mockDispatch).toHaveBeenCalledTimes(2)
    const req: Request = mockDispatch.mock.calls[1][0]
    expect(req.method).toBe('GET')
    const reqUrl = new URL(req.url)
    expect(reqUrl.hostname).toBe('challenge-test.localhost')
    expect(reqUrl.pathname).toBe('/search')
    expect(reqUrl.searchParams.get('q')).toBe('hello world')
  })

  it('3.4 form action relative URL resolves to challenge origin, not localhost:5173', async () => {
    const mockDispatch = vi.fn()
      .mockResolvedValueOnce(new Response('<h1>page</h1>', { headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(new Response('<p>ok</p>', { headers: { 'Content-Type': 'text/html' } }))

    const { iframeEl } = await mountWithIframe('sqli-demo', mockDispatch)

    postFormSubmit(iframeEl, { method: 'POST', action: '/login' })
    await flushPromises()

    const req: Request = mockDispatch.mock.calls[1][0]
    expect(req.url).toBe('https://challenge-sqli-demo.localhost/login')
    expect(req.url).not.toContain('localhost:5173')
  })

  it('3.5 form with no action attribute submits to current url.value', async () => {
    const mockDispatch = vi.fn()
      .mockResolvedValueOnce(new Response('<h1>page</h1>', { headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(new Response('<p>ok</p>', { headers: { 'Content-Type': 'text/html' } }))

    const { wrapper, iframeEl } = await mountWithIframe('sqli-demo', mockDispatch)

    // Default url.value is https://challenge-sqli-demo.localhost/
    postFormSubmit(iframeEl, { method: 'POST' /* no action */ })
    await flushPromises()

    const req: Request = mockDispatch.mock.calls[1][0]
    expect(req.url).toContain('challenge-sqli-demo.localhost')
    wrapper.unmount()
  })
})

// ─── Auto-navigation on runtime ready ──────────────────────────────────────────

describe('BrowserPanel — auto-navigation on runtime ready', () => {
  it('auto-navigates when disabled transitions from true to false', async () => {
    const mockDispatch = vi.fn().mockResolvedValue(
      new Response('<h1>Welcome</h1>', { headers: { 'Content-Type': 'text/html' } }),
    )

    const wrapper = mount(BrowserPanel, {
      props: { slug: 'sqli-demo', dispatch: mockDispatch, disabled: true },
    })

    // Initially disabled — no dispatch should have been called
    expect(mockDispatch).not.toHaveBeenCalled()

    // Runtime becomes ready
    await wrapper.setProps({ disabled: false })
    await flushPromises()

    // Should have auto-navigated
    expect(mockDispatch).toHaveBeenCalledOnce()
    const req: Request = mockDispatch.mock.calls[0][0]
    expect(req.method).toBe('GET')
    expect(req.url).toBe('https://challenge-sqli-demo.localhost/')
  })

  it('does not auto-navigate if disabled stays false (no transition)', async () => {
    const mockDispatch = vi.fn().mockResolvedValue(
      new Response('OK', { headers: { 'Content-Type': 'text/plain' } }),
    )

    // Mount with disabled=false from the start — the watch should not trigger
    // (watch only fires on true→false transition, not initial false)
    mount(BrowserPanel, {
      props: { slug: 'test', dispatch: mockDispatch, disabled: false },
    })
    await flushPromises()

    // No auto-navigation — dispatch not called
    expect(mockDispatch).not.toHaveBeenCalled()
  })
})

describe('BrowserPanel — browser history stack', () => {
  /** Mounts the panel and drives it through a list of URLs via the URL bar. */
  async function mountWithHistory(bodies: Record<string, string>) {
    const dispatch = vi.fn(async (req: Request) => {
      const body = bodies[req.url]
      if (body === undefined) throw new Error(`unexpected url ${req.url}`)
      return new Response(body, { headers: { 'Content-Type': 'text/html' } })
    })
    const wrapper = mount(BrowserPanel, {
      props: { slug: 'test', dispatch },
    })
    return { wrapper, dispatch }
  }

  async function goTo(wrapper: ReturnType<typeof mount>, url: string) {
    await wrapper.find('[data-url-input]').setValue(url)
    await wrapper.find('[data-go]').trigger('click')
    await flushPromises()
  }

  const urlValue = (wrapper: ReturnType<typeof mount>) =>
    (wrapper.find('[data-url-input]').element as HTMLInputElement).value

  const isDisabled = (wrapper: ReturnType<typeof mount>, sel: string) =>
    (wrapper.find(sel).element as HTMLButtonElement).disabled

  const A = 'https://challenge-test.localhost/a'
  const B = 'https://challenge-test.localhost/b'
  const C = 'https://challenge-test.localhost/c'
  const D = 'https://challenge-test.localhost/d'

  it('restores the earlier view on back without dispatching', async () => {
    const { wrapper, dispatch } = await mountWithHistory({
      [A]: '<h1>page A</h1>',
      [B]: '<h1>page B</h1>',
    })
    await goTo(wrapper, A)
    await goTo(wrapper, B)

    const before = dispatch.mock.calls.length
    await wrapper.find('[data-nav-back]').trigger('click')
    await flushPromises()

    expect(urlValue(wrapper)).toBe(A)
    expect(wrapper.find('iframe').attributes('srcdoc')).toContain('page A')
    // Equality, not an upper bound: a restore that dispatches is the defect.
    expect(dispatch.mock.calls.length).toBe(before)
  })

  it('restores the later view on forward without dispatching', async () => {
    const { wrapper, dispatch } = await mountWithHistory({
      [A]: '<h1>page A</h1>',
      [B]: '<h1>page B</h1>',
    })
    await goTo(wrapper, A)
    await goTo(wrapper, B)

    const before = dispatch.mock.calls.length
    await wrapper.find('[data-nav-back]').trigger('click')
    await flushPromises()
    // Assert the cursor actually moved. Without this the test would pass on a
    // dead forward button, because B is already on screen.
    expect(urlValue(wrapper)).toBe(A)

    await wrapper.find('[data-nav-forward]').trigger('click')
    await flushPromises()

    expect(urlValue(wrapper)).toBe(B)
    expect(wrapper.find('iframe').attributes('srcdoc')).toContain('page B')
    expect(dispatch.mock.calls.length).toBe(before)
  })

  it('disables both controls while the history stack is empty', async () => {
    const dispatch = vi.fn()
    const wrapper = mount(BrowserPanel, {
      props: { slug: 'test', dispatch, disabled: true },
    })

    expect(isDisabled(wrapper, '[data-nav-back]')).toBe(true)
    expect(isDisabled(wrapper, '[data-nav-forward]')).toBe(true)

    await wrapper.find('[data-nav-back]').trigger('click')
    await wrapper.find('[data-nav-forward]').trigger('click')
    await flushPromises()

    expect(dispatch).not.toHaveBeenCalled()
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('commits one history entry for a redirect chain and never moves the url bar ahead of the response', async () => {
    let releaseTarget: (r: Response) => void = () => {}
    const dispatch = vi.fn(async (req: Request) => {
      if (req.url === A) {
        return new Response('', { status: 302, headers: { Location: '/b' } })
      }
      return new Promise<Response>((resolve) => { releaseTarget = resolve })
    })
    const wrapper = mount(BrowserPanel, { props: { slug: 'test', dispatch } })

    await wrapper.find('[data-url-input]').setValue(A)
    await wrapper.find('[data-go]').trigger('click')
    await flushPromises()

    // The redirect has been followed and its target request is in flight. The
    // url bar must still show the requested URL, not the redirect target.
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(urlValue(wrapper)).toBe(A)

    releaseTarget(new Response('<h1>page B</h1>', { headers: { 'Content-Type': 'text/html' } }))
    await flushPromises()

    expect(urlValue(wrapper)).toBe(B)
    expect(wrapper.find('iframe').attributes('srcdoc')).toContain('page B')
    // The whole chain is one entry, so there is nothing to go back to. Back
    // being disabled is also true of an EMPTY stack, so prove an entry exists:
    // a reload re-issues the committed entry's URL, which only works if the
    // chain committed one.
    expect(isDisabled(wrapper, '[data-nav-back]')).toBe(true)

    await wrapper.find('[data-url-input]').setValue(C)
    await wrapper.find('[data-nav-reload]').trigger('click')
    await flushPromises()
    const reloaded: Request = dispatch.mock.calls[dispatch.mock.calls.length - 1][0]
    expect(reloaded.url).toBe(B)
  })

  it('discards the forward entries when a new navigation commits', async () => {
    const { wrapper } = await mountWithHistory({
      [A]: '<h1>page A</h1>',
      [B]: '<h1>page B</h1>',
      [C]: '<h1>page C</h1>',
      [D]: '<h1>page D</h1>',
    })
    await goTo(wrapper, A)
    await goTo(wrapper, B)
    await goTo(wrapper, C)

    await wrapper.find('[data-nav-back]').trigger('click')
    await wrapper.find('[data-nav-back]').trigger('click')
    await flushPromises()
    expect(urlValue(wrapper)).toBe(A)

    await goTo(wrapper, D)

    expect(isDisabled(wrapper, '[data-nav-forward]')).toBe(true)
    await wrapper.find('[data-nav-forward]').trigger('click')
    await flushPromises()
    expect(urlValue(wrapper)).toBe(D)
  })

  it('drops a response superseded by a back activation', async () => {
    let release: (r: Response) => void = () => {}
    const dispatch = vi.fn(async (req: Request) => {
      if (req.url === C) {
        return new Promise<Response>((resolve) => { release = resolve })
      }
      const body = req.url === A ? '<h1>page A</h1>' : '<h1>page B</h1>'
      return new Response(body, { headers: { 'Content-Type': 'text/html' } })
    })
    const wrapper = mount(BrowserPanel, { props: { slug: 'test', dispatch } })

    await goTo(wrapper, A)
    await goTo(wrapper, B)

    // Start a navigation that never settles, then go back.
    await wrapper.find('[data-url-input]').setValue(C)
    await wrapper.find('[data-go]').trigger('click')
    await wrapper.find('[data-nav-back]').trigger('click')
    await flushPromises()

    const forwardBefore = isDisabled(wrapper, '[data-nav-forward]')

    release(new Response('<h1>page C</h1>', { headers: { 'Content-Type': 'text/html' } }))
    await flushPromises()

    expect(urlValue(wrapper)).toBe(A)
    expect(wrapper.find('iframe').attributes('srcdoc')).toContain('page A')
    expect(isDisabled(wrapper, '[data-nav-forward]')).toBe(forwardBefore)
  })

  // ─── Reload re-issues the current history entry ────────────────────────────

  it('reloads the committed entry, not the unsubmitted input text', async () => {
    const { wrapper, dispatch } = await mountWithHistory({
      [A]: '<h1>page A</h1>',
      [B]: '<h1>page B</h1>',
    })
    await goTo(wrapper, A)

    await wrapper.find('[data-url-input]').setValue(B)
    await wrapper.find('[data-nav-reload]').trigger('click')
    await flushPromises()

    const last: Request = dispatch.mock.calls[dispatch.mock.calls.length - 1][0]
    expect(last.url).toBe(A)
    expect(last.method).toBe('GET')
    expect(urlValue(wrapper)).toBe(A)
  })

  it('keeps the forward entries across a reload', async () => {
    const { wrapper } = await mountWithHistory({
      [A]: '<h1>page A</h1>',
      [B]: '<h1>page B</h1>',
    })
    await goTo(wrapper, A)
    await goTo(wrapper, B)
    await wrapper.find('[data-nav-back]').trigger('click')
    await flushPromises()
    // The cursor must really be on A, otherwise the reload below replaces B and
    // the forward assertion becomes vacuous.
    expect(urlValue(wrapper)).toBe(A)

    await wrapper.find('[data-nav-reload]').trigger('click')
    await flushPromises()
    // A reload replaces in place; it must not move the cursor.
    expect(urlValue(wrapper)).toBe(A)

    expect(isDisabled(wrapper, '[data-nav-forward]')).toBe(false)
    await wrapper.find('[data-nav-forward]').trigger('click')
    await flushPromises()
    expect(urlValue(wrapper)).toBe(B)
    expect(wrapper.find('iframe').attributes('srcdoc')).toContain('page B')
  })

  it('keeps the current view when a reload is rejected', async () => {
    let fail = false
    const dispatch = vi.fn(async () => {
      if (fail) throw new Error('runtime down')
      return new Response('<h1>page A</h1>', { headers: { 'Content-Type': 'text/html' } })
    })
    const wrapper = mount(BrowserPanel, { props: { slug: 'test', dispatch } })
    await goTo(wrapper, A)

    fail = true
    await wrapper.find('[data-nav-reload]').trigger('click')
    await flushPromises()

    expect(wrapper.find('iframe').attributes('srcdoc')).toContain('page A')
    expect(urlValue(wrapper)).toBe(A)
    expect(wrapper.find('[data-reload-error]').exists()).toBe(true)
    expect(isDisabled(wrapper, '[data-nav-reload]')).toBe(false)
  })

  it('leaves back and forward usable while the panel is disabled, but not reload', async () => {
    const { wrapper, dispatch } = await mountWithHistory({
      [A]: '<h1>page A</h1>',
      [B]: '<h1>page B</h1>',
    })
    await goTo(wrapper, A)
    await goTo(wrapper, B)

    await wrapper.setProps({ disabled: true })
    const before = dispatch.mock.calls.length

    expect(isDisabled(wrapper, '[data-nav-back]')).toBe(false)
    expect(isDisabled(wrapper, '[data-nav-reload]')).toBe(true)

    await wrapper.find('[data-nav-back]').trigger('click')
    await flushPromises()
    expect(urlValue(wrapper)).toBe(A)

    await wrapper.find('[data-nav-reload]').trigger('click')
    await flushPromises()
    expect(dispatch.mock.calls.length).toBe(before)
  })

  // ─── Auto-navigation on runtime ready ──────────────────────────────────────

  it('establishes the first history entry from the automatic load', async () => {
    // A fresh Response per call: a body can only be read once, and reusing one
    // instance makes the second navigation fail rather than commit.
    const mockDispatch = vi.fn(async () =>
      new Response('<h1>home</h1>', { headers: { 'Content-Type': 'text/html' } }))
    const wrapper = mount(BrowserPanel, {
      props: { slug: 'test', dispatch: mockDispatch, disabled: true },
    })

    await wrapper.setProps({ disabled: false })
    await flushPromises()

    expect(mockDispatch).toHaveBeenCalledOnce()
    expect(isDisabled(wrapper, '[data-nav-back]')).toBe(true)
    expect(isDisabled(wrapper, '[data-nav-forward]')).toBe(true)

    // Both buttons are also disabled when NOTHING was committed, so the two
    // assertions above cannot tell one entry from none. Observe the entry
    // itself: navigating away must make back enabled and land on the auto-
    // loaded URL, which is only possible if the auto-load committed.
    await goTo(wrapper, A)
    expect(isDisabled(wrapper, '[data-nav-back]')).toBe(false)
    await wrapper.find('[data-nav-back]').trigger('click')
    await flushPromises()
    expect(urlValue(wrapper)).toBe('https://challenge-test.localhost/')
  })

  // ─── Cached-view disclosure ────────────────────────────────────────────────

  it('discloses a restored view and warns when the cookie header has changed', async () => {
    const dispatch = vi.fn(async (req: Request) => {
      const headers: Record<string, string> = { 'Content-Type': 'text/html' }
      // Set-Cookie is a forbidden response header in the Fetch API; the runtime
      // hands it to the panel on the X-Wxlsh-Set-Cookie carrier. The fixture is
      // built with the encoder rather than written by hand, so the test is tied
      // to the contract and not to one snapshot of its bytes.
      if (req.url === B) headers['X-Wxlsh-Set-Cookie'] = encodeCookieCarrier(['sid=second; Path=/'])
      return new Response(`<h1>${req.url}</h1>`, { headers })
    })
    const wrapper = mount(BrowserPanel, { props: { slug: 'test', dispatch } })

    await goTo(wrapper, A)
    await goTo(wrapper, B)
    await wrapper.find('[data-nav-back]').trigger('click')
    await flushPromises()

    const strip = wrapper.find('[data-cached-view]')
    expect(strip.exists()).toBe(true)
    expect(strip.text()).toMatch(/\d{2}:\d{2}:\d{2}/)
    expect(strip.attributes('data-cookie-changed')).toBe('true')

    await goTo(wrapper, A)
    expect(wrapper.find('[data-cached-view]').exists()).toBe(false)
  })

  // ─── Round-1 review fixes ──────────────────────────────────────────────────

  it('updates the cookie warning after the jar changes while a view is restored', async () => {
    let rotate = false
    const dispatch = vi.fn(async (req: Request) => {
      const headers: Record<string, string> = { 'Content-Type': 'text/html' }
      if (rotate) headers['X-Wxlsh-Set-Cookie'] = encodeCookieCarrier(['sid=rotated; Path=/'])
      return new Response(`<h1>${req.url}</h1>`, { headers })
    })
    const wrapper = mount(BrowserPanel, { props: { slug: 'test', dispatch } })

    await goTo(wrapper, A)
    await goTo(wrapper, B)
    await wrapper.find('[data-nav-back]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-cached-view]').attributes('data-cookie-changed')).toBe('false')

    // Rotate the jar via a reload of the entry at the cursor. The reload
    // commits, so the strip goes away and the entry is re-captured under the
    // pre-rotation header.
    rotate = true
    await wrapper.find('[data-nav-reload]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-cached-view]').exists()).toBe(false)

    // The cursor is at index 0, so back is disabled — reach a restored view by
    // going forward to B and back to A.
    await wrapper.find('[data-nav-forward]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-nav-back]').trigger('click')
    await flushPromises()
    const strip = wrapper.find('[data-cached-view]')
    expect(strip.exists()).toBe(true)
    expect(strip.attributes('data-cookie-changed')).toBe('true')
  })

  it('does not apply cookies from a navigation the user abandoned', async () => {
    let release: (r: Response) => void = () => {}
    const dispatch = vi.fn(async (req: Request) => {
      if (req.url === C) return new Promise<Response>((resolve) => { release = resolve })
      return new Response(`<h1>${req.url}</h1>`, { headers: { 'Content-Type': 'text/html' } })
    })
    const wrapper = mount(BrowserPanel, { props: { slug: 'test', dispatch } })

    await goTo(wrapper, A)
    await goTo(wrapper, B)
    await wrapper.find('[data-url-input]').setValue(C)
    await wrapper.find('[data-go]').trigger('click')
    await wrapper.find('[data-nav-back]').trigger('click')
    await flushPromises()

    release(new Response('<h1>C</h1>', {
      headers: { 'Content-Type': 'text/html', 'X-Wxlsh-Set-Cookie': encodeCookieCarrier(['sid=leaked; Path=/']) },
    }))
    await flushPromises()

    // The abandoned response must not have rotated the session, so the restored
    // entry still matches the jar.
    expect(wrapper.find('[data-cached-view]').attributes('data-cookie-changed')).toBe('false')
    await goTo(wrapper, A)
    const last: Request = dispatch.mock.calls[dispatch.mock.calls.length - 1][0]
    expect(last.headers.get('X-Wxlsh-Cookie')).toBeNull()
  })

  it('keeps text the user typed while a navigation was in flight', async () => {
    let release: (r: Response) => void = () => {}
    const dispatch = vi.fn(async () => new Promise<Response>((resolve) => { release = resolve }))
    const wrapper = mount(BrowserPanel, {
      props: { slug: 'test', dispatch, disabled: true },
    })

    await wrapper.setProps({ disabled: false })
    await wrapper.find('[data-url-input]').setValue(D)
    release(new Response('<h1>home</h1>', { headers: { 'Content-Type': 'text/html' } }))
    await flushPromises()

    expect(urlValue(wrapper)).toBe(D)
  })

  it('pushes rather than replaces when a reload lands on a different url', async () => {
    let redirect = false
    const dispatch = vi.fn(async (req: Request) => {
      if (req.url === A && redirect) {
        return new Response('', { status: 302, headers: { Location: '/b' } })
      }
      return new Response(`<h1>${req.url}</h1>`, { headers: { 'Content-Type': 'text/html' } })
    })
    const wrapper = mount(BrowserPanel, { props: { slug: 'test', dispatch } })

    await goTo(wrapper, A)
    redirect = true
    await wrapper.find('[data-nav-reload]').trigger('click')
    await flushPromises()

    expect(urlValue(wrapper)).toBe(B)
    // A must still be reachable: the replaced entry's url was not overwritten.
    expect(isDisabled(wrapper, '[data-nav-back]')).toBe(false)
    await wrapper.find('[data-nav-back]').trigger('click')
    await flushPromises()
    expect(urlValue(wrapper)).toBe(A)
  })

  it('does not disable Go while a reload is in flight', async () => {
    let release: (r: Response) => void = () => {}
    let pend = false
    const dispatch = vi.fn(async (req: Request) => {
      if (pend) return new Promise<Response>((resolve) => { release = resolve })
      return new Response(`<h1>${req.url}</h1>`, { headers: { 'Content-Type': 'text/html' } })
    })
    const wrapper = mount(BrowserPanel, { props: { slug: 'test', dispatch } })
    await goTo(wrapper, A)

    pend = true
    await wrapper.find('[data-nav-reload]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(isDisabled(wrapper, '[data-nav-reload]')).toBe(true)
    expect(isDisabled(wrapper, '[data-go]')).toBe(false)

    release(new Response('<h1>A</h1>', { headers: { 'Content-Type': 'text/html' } }))
    await flushPromises()
  })

  it('surfaces a failure from a link click, not only from a reload', async () => {
    let fail = false
    const dispatch = vi.fn(async (req: Request) => {
      if (fail) throw new Error('runtime down')
      return new Response('<a href="/b">go</a>', { headers: { 'Content-Type': 'text/html' } })
    })
    const wrapper = mount(BrowserPanel, {
      props: { slug: 'test', dispatch },
      attachTo: document.body,
    })
    await goTo(wrapper, A)

    fail = true
    const iframeEl = wrapper.find('iframe').element as HTMLIFrameElement
    window.dispatchEvent(new MessageEvent('message', {
      source: iframeEl.contentWindow,
      data: { type: 'WXLSH_LINK_CLICK', href: '/b' },
    }))
    await flushPromises()

    expect(wrapper.find('[data-reload-error]').exists()).toBe(true)
    expect(urlValue(wrapper)).toBe(A)
  })
  // ─── Carrier decoding ──────────────────────────────────────────────────────
  //
  // The panel is the fourth consumer of the X-Wxlsh-Set-Cookie carrier. Every
  // fixture below is produced by the shared encoder: a hand-written literal
  // would keep passing if the encoding changed, which is exactly the failure
  // these tests exist to rule out.

  it('stores a cookie from a redirect and sends it on the next dispatch', async () => {
    const dispatch = vi.fn(async (req: Request) => {
      if (req.url === A) {
        return new Response('', {
          status: 302,
          headers: {
            Location: '/files',
            'X-Wxlsh-Set-Cookie': encodeCookieCarrier(['session_user=guest; Path=/']),
          },
        })
      }
      return new Response('<h1>files</h1>', { headers: { 'Content-Type': 'text/html' } })
    })
    const wrapper = mount(BrowserPanel, { props: { slug: 'test', dispatch } })

    await goTo(wrapper, A)

    expect(dispatch).toHaveBeenCalledTimes(2)
    const followed: Request = dispatch.mock.calls[1][0]
    expect(followed.url).toBe('https://challenge-test.localhost/files')
    expect(followed.headers.get('X-Wxlsh-Cookie')).toBe('session_user=guest')
  })

  it('yields every cookie in a carrier holding several, including comma-bearing attributes', async () => {
    // A comma inside an attribute is the reason the carrier base64-encodes each
    // value instead of joining the raw strings: with a plain separator these two
    // cookies are indistinguishable from four.
    const dispatch = vi.fn(async (req: Request) => {
      const headers: Record<string, string> = { 'Content-Type': 'text/html' }
      if (req.url === A) {
        headers['X-Wxlsh-Set-Cookie'] = encodeCookieCarrier([
          'a=1; Expires=Thu, 01 Jan 2027 00:00:00 GMT',
          'b=2; Expires=Fri, 02 Jan 2027 00:00:00 GMT; Path=/',
        ])
      }
      return new Response(`<h1>${req.url}</h1>`, { headers })
    })
    const wrapper = mount(BrowserPanel, { props: { slug: 'test', dispatch } })

    await goTo(wrapper, A)
    await goTo(wrapper, B)

    const sent: Request = dispatch.mock.calls[dispatch.mock.calls.length - 1][0]
    const cookie = sent.headers.get('X-Wxlsh-Cookie') ?? ''
    expect(cookie.split('; ').sort()).toEqual(['a=1', 'b=2'])
  })

  it('reports a segment the encoder did not produce and leaves the jar as it was', async () => {
    // The jar is seeded first, so "unchanged" is distinguishable from "empty" —
    // an empty jar would also satisfy an assertion that the bad carrier added
    // nothing, and would prove nothing about whether the jar was cleared.
    let carrier = encodeCookieCarrier(['seeded=yes; Path=/'])
    const dispatch = vi.fn(async (req: Request) => {
      return new Response(`<h1>${req.url}</h1>`, {
        headers: { 'Content-Type': 'text/html', 'X-Wxlsh-Set-Cookie': carrier },
      })
    })
    const wrapper = mount(BrowserPanel, { props: { slug: 'test', dispatch } })
    await goTo(wrapper, A)

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    carrier = 'not@base64!'
    await goTo(wrapper, B)
    // Snapshot before restoring: mockRestore() also resets the recorded calls,
    // so asserting on the spy afterwards reads an emptied log and passes for
    // the wrong reason in the direction that hides a missing report.
    const warnings = warn.mock.calls.map((c) => String(c[0]))
    warn.mockRestore()

    const sent: Request = dispatch.mock.calls[dispatch.mock.calls.length - 1][0]
    expect(sent.headers.get('X-Wxlsh-Cookie')).toBe('seeded=yes')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('[BrowserPanel]')
  })
})

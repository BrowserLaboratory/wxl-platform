import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NetworkPanel from '../../../.vitepress/theme/components/NetworkPanel.vue'
import type { TrafficEntry } from '../../../.vitepress/theme/composables/useTrafficLog'

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    id: 1,
    timestamp: Date.now(),
    method: 'GET',
    url: 'https://challenge-test.localhost/',
    requestHeaders: [['host', 'challenge-test.localhost']],
    requestBody: null,
    status: 200,
    responseHeaders: [['content-type', 'text/html']],
    responseBody: '<h1>Hello</h1>',
    duration: 42,
    ...overrides,
  }
}

describe('NetworkPanel', () => {
  it('shows empty state when no traffic entries', () => {
    const wrapper = mount(NetworkPanel, { props: { trafficLog: [] } })
    expect(wrapper.find('[data-empty-state]').exists()).toBe(true)
    expect(wrapper.find('[data-traffic-row]').exists()).toBe(false)
  })

  it('displays traffic entries in chronological order', () => {
    const entries = [
      makeEntry({ id: 1, method: 'GET', url: 'https://challenge-test.localhost/', status: 200 }),
      makeEntry({ id: 2, method: 'POST', url: 'https://challenge-test.localhost/login', status: 302 }),
    ]
    const wrapper = mount(NetworkPanel, { props: { trafficLog: entries } })
    const rows = wrapper.findAll('[data-traffic-row]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('GET')
    expect(rows[1].text()).toContain('POST')
    expect(rows[1].text()).toContain('302')
  })

  it('shows total entry count', () => {
    const entries = [makeEntry({ id: 1 }), makeEntry({ id: 2 })]
    const wrapper = mount(NetworkPanel, { props: { trafficLog: entries } })
    expect(wrapper.find('[data-entry-count]').text()).toContain('2')
  })

  it('expands entry detail when row is clicked', async () => {
    const entry = makeEntry({ id: 1 })
    const wrapper = mount(NetworkPanel, { props: { trafficLog: [entry] } })

    expect(wrapper.find('[data-entry-detail]').exists()).toBe(false)

    await wrapper.find('[data-traffic-row]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-entry-detail]').exists()).toBe(true)
  })

  it('collapses detail when same row is clicked again', async () => {
    const entry = makeEntry({ id: 1 })
    const wrapper = mount(NetworkPanel, { props: { trafficLog: [entry] } })

    await wrapper.find('[data-traffic-row]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-entry-detail]').exists()).toBe(true)

    await wrapper.find('[data-traffic-row]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-entry-detail]').exists()).toBe(false)
  })

  it('shows request content in Request sub-tab by default', async () => {
    const entry = makeEntry({ id: 1, requestBody: 'username=admin', responseBody: '{"token":"abc"}' })
    const wrapper = mount(NetworkPanel, { props: { trafficLog: [entry] } })

    await wrapper.find('[data-traffic-row]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-detail-content]').text()).toContain('username=admin')
  })

  it('switches to Response sub-tab and shows response body', async () => {
    const entry = makeEntry({ id: 1, requestBody: 'x=1', responseBody: '{"token":"abc"}' })
    const wrapper = mount(NetworkPanel, { props: { trafficLog: [entry] } })

    await wrapper.find('[data-traffic-row]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-tab-response]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-detail-content]').text()).toContain('{"token":"abc"}')
  })

  it('emits clear event when Clear button is clicked', async () => {
    const entry = makeEntry({ id: 1 })
    const wrapper = mount(NetworkPanel, { props: { trafficLog: [entry] } })

    await wrapper.find('[data-clear-btn]').trigger('click')
    expect(wrapper.emitted('clear')).toBeTruthy()
  })

  it('omits the Send to Repeater button when the challenge withheld the Repeater', async () => {
    const wrapper = mount(NetworkPanel, {
      props: { trafficLog: [makeEntry({ id: 1 })], canSendToRepeater: false },
    })

    await wrapper.find('[data-traffic-row]').trigger('click')
    await wrapper.vm.$nextTick()

    // A visible button that silently does nothing is worse than no button.
    expect(wrapper.find('[data-send-to-repeater]').exists()).toBe(false)
  })

  it('emits sendToRepeater with formatted raw HTTP request on click', async () => {
    const entry = makeEntry({
      id: 1,
      method: 'POST',
      url: 'https://challenge-test.localhost/login',
      requestHeaders: [
        ['host', 'challenge-test.localhost'],
        ['content-type', 'application/x-www-form-urlencoded'],
      ],
      requestBody: 'username=admin&password=secret',
    })
    const wrapper = mount(NetworkPanel, { props: { trafficLog: [entry] } })

    await wrapper.find('[data-traffic-row]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-send-to-repeater]').trigger('click')

    const emitted = wrapper.emitted('sendToRepeater')
    expect(emitted).toBeTruthy()
    const rawRequest = emitted![0][0] as string
    expect(rawRequest).toContain('POST /login HTTP/1.1')
    expect(rawRequest).toContain('host: challenge-test.localhost')
    expect(rawRequest).toContain('username=admin&password=secret')
  })

  it('displays duration in entry row', () => {
    const entry = makeEntry({ id: 1, duration: 123 })
    const wrapper = mount(NetworkPanel, { props: { trafficLog: [entry] } })
    expect(wrapper.find('[data-traffic-row]').text()).toContain('123')
  })
})

describe('NetworkPanel runtime diagnostic', () => {
  const entryWith = (extra: Record<string, unknown>) => ({
    id: 1,
    timestamp: 0,
    method: 'GET',
    url: 'https://challenge-test.localhost/',
    requestHeaders: [] as [string, string][],
    requestBody: null,
    status: 200,
    responseHeaders: [['Content-Type', 'text/html']] as [string, string][],
    responseBody: 'body',
    duration: 1,
    ...extra,
  })

  it('shows the diagnostic banner when an entry carries one', async () => {
    const wrapper = mount(NetworkPanel, {
      props: {
        trafficLog: [entryWith({ runtimeDiagnostic: 'PHP execution ended with exit code 255' })],
        canSendToRepeater: false,
      },
    })
    await wrapper.find('[data-traffic-row]').trigger('click')

    const banner = wrapper.find('[data-runtime-diagnostic]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('exit code 255')
  })

  it('shows no banner for an entry without a diagnostic', async () => {
    const wrapper = mount(NetworkPanel, {
      props: { trafficLog: [entryWith({})], canSendToRepeater: false },
    })
    await wrapper.find('[data-traffic-row]').trigger('click')

    expect(wrapper.find('[data-runtime-diagnostic]').exists()).toBe(false)
  })
})

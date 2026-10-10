import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import List from '../../../.vitepress/theme/components/AttackSessionList.vue'

const attempt = (over: Record<string, unknown> = {}) => ({
  sessionId: 'a', challengeSlug: 'sqli-demo', challengeTitle: 'SQL Injection Demo',
  startedAt: 1_000_000, solvedAt: null,
  events: [{ type: 'challenge_start', timestamp: 1_000_000 }],
  ...over,
})

const IMPORTED = { kind: 'imported', importedAt: 5000, sourceSessionId: 'elsewhere', sourceExportedAt: '2026-09-16T10:00:00+08:00' }

async function mounted(sessions: unknown[], props: Record<string, unknown> = {}) {
  const load = vi.fn().mockResolvedValue(sessions)
  const wrapper = mount(List, { props: { load, ...props } })
  await flushPromises()
  return { wrapper, load }
}

describe('Attack session list', () => {
  it('lists every stored attempt for the challenge, most recently started first', async () => {
    const { wrapper } = await mounted([
      attempt({ sessionId: 'oldest', startedAt: 1_000_000 }),
      attempt({ sessionId: 'newest', startedAt: 3_000_000 }),
      attempt({ sessionId: 'middle', startedAt: 2_000_000 }),
    ])

    const rows = wrapper.findAll('[data-session-row]')
    expect(rows.map(r => r.attributes('data-session-row'))).toEqual(['newest', 'middle', 'oldest'])
  })

  it('shows how many events each attempt holds, whether it was solved, and where it came from', async () => {
    const { wrapper } = await mounted([
      attempt({ sessionId: 'local-solved', solvedAt: 2_000_000, events: [{ type: 'challenge_start', timestamp: 1 }, { type: 'note', timestamp: 2 }] }),
      attempt({ sessionId: 'brought-in', startedAt: 500_000, origin: IMPORTED, draft: null }),
    ])

    const solved = wrapper.find('[data-session-row="local-solved"]')
    expect(solved.text()).toContain('已解出')
    expect(solved.find('[data-session-events]').text()).toBe('2')
    expect(solved.text()).toContain('本機')

    const imported = wrapper.find('[data-session-row="brought-in"]')
    expect(imported.text()).toContain('未解出')
    expect(imported.text()).toContain('匯入')
  })

  it('shows nothing stored while progress access is denied', async () => {
    const { wrapper, load } = await mounted([attempt()], { blocked: true, blockReason: 'undecided' })

    // Not merely hidden rows: a shared machine's stored attempts can be the previous
    // person's, and the stored-work decision is the question of whose they are. Reading
    // them before it is answered is the read this state exists to prevent.
    expect(load).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-session-row]')).toHaveLength(0)
    expect(wrapper.text()).toContain('請先完成沿用或清除的選擇')
  })

  it('says the device is being checked without telling the learner to act', async () => {
    const { wrapper } = await mounted([attempt()], { blocked: true, blockReason: 'checking' })
    expect(wrapper.text()).toContain('正在檢查這台裝置上的紀錄。')
    for (const instruction of ['請先完成', '重新載入']) {
      expect(wrapper.text()).not.toContain(instruction)
    }
  })

  it('picks up a newly imported attempt without the page being reloaded', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce([attempt({ sessionId: 'only-one' })])
      .mockResolvedValueOnce([attempt({ sessionId: 'only-one' }), attempt({ sessionId: 'brought-in', startedAt: 9_000_000, origin: IMPORTED })])
    const wrapper = mount(List, { props: { load } })
    await flushPromises()
    expect(wrapper.findAll('[data-session-row]')).toHaveLength(1)

    await (wrapper.vm as unknown as { reload: () => Promise<void> }).reload()
    await flushPromises()

    expect(wrapper.findAll('[data-session-row]').map(r => r.attributes('data-session-row'))).toEqual(['brought-in', 'only-one'])
  })

  it('reports the choice of attempt and nothing more', async () => {
    const { wrapper } = await mounted([attempt({ sessionId: 'older', startedAt: 1 }), attempt({ sessionId: 'newer', startedAt: 2 })])

    await wrapper.find('[data-session-row="older"] [data-session-select]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['older']])

    // Choosing the same one again clears the choice, which is how the learner gets back
    // to exporting the attempt in progress without reloading.
    await wrapper.setProps({ selectedId: 'older' })
    await wrapper.find('[data-session-row="older"] [data-session-select]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['older'], [null]])
  })

  it('says so when the challenge holds no stored attempt', async () => {
    const { wrapper } = await mounted([])
    expect(wrapper.findAll('[data-session-row]')).toHaveLength(0)
    expect(wrapper.text()).toContain('沒有')
  })

  it('reports a read that failed rather than showing an empty challenge', async () => {
    const load = vi.fn().mockRejectedValue(new Error('database unavailable'))
    const wrapper = mount(List, { props: { load } })
    await flushPromises()

    // An unreadable database and a challenge never attempted look identical as an empty
    // list, and they call for opposite responses from the learner.
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('沒有')
  })
})

it('asks the page to open the import dialog and is withheld with the rest of the panel', async () => {
  const { wrapper } = await mounted([attempt()])
  await wrapper.find('[data-import-open]').trigger('click')
  expect(wrapper.emitted('import')).toHaveLength(1)

  const blocked = await mounted([attempt()], { blocked: true, blockReason: 'undecided' })
  expect((blocked.wrapper.find('[data-import-open]').element as HTMLButtonElement).disabled).toBe(true)
})

describe('clearing from the list', () => {
  const TRACE = (over: Record<string, unknown> = {}) => ({
    id: 't1', challengeSlug: 'sqli-demo', at: 5_000_000,
    removed: [{ startedAt: 1000, solved: false }], ...over,
  })

  async function withTraces(sessions: unknown[], traces: unknown[], props: Record<string, unknown> = {}) {
    const load = vi.fn().mockResolvedValue(sessions)
    const loadTraces = vi.fn().mockResolvedValue(traces)
    const wrapper = mount(List, { props: { load, loadTraces, ...props } })
    await flushPromises()
    return { wrapper, load, loadTraces }
  }

  it('asks the page to clear and says how many would go', async () => {
    const { wrapper } = await withTraces(
      [attempt({ sessionId: 'old-1', startedAt: 1 }), attempt({ sessionId: 'old-2', startedAt: 2 }), attempt({ sessionId: 'now', startedAt: 3 })],
      [], { currentSessionId: 'now' },
    )

    await wrapper.find('[data-clear-open]').trigger('click')
    // The count excludes the attempt in progress, which the clear never takes.
    expect(wrapper.emitted('clear')).toEqual([[2]])
  })

  it('has nothing to remove when the only attempt is the one in progress', async () => {
    const { wrapper } = await withTraces([attempt({ sessionId: 'now' })], [], { currentSessionId: 'now' })

    expect((wrapper.find('[data-clear-open]').element as HTMLButtonElement).disabled).toBe(true)
    expect(wrapper.text()).toContain('沒有其他紀錄')
  })

  it('is withheld with the rest of the panel while the decision is unanswered', async () => {
    const { wrapper, loadTraces } = await withTraces(
      [attempt({ sessionId: 'old' }), attempt({ sessionId: 'now', startedAt: 9 })],
      [TRACE()], { currentSessionId: 'now', blocked: true, blockReason: 'undecided' },
    )

    expect((wrapper.find('[data-clear-open]').element as HTMLButtonElement).disabled).toBe(true)
    expect(loadTraces).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-trace-row]')).toHaveLength(0)
    expect(wrapper.text()).toContain('請先完成沿用或清除的選擇')
  })

  it('stops offering the clear when access is revoked after the list has loaded', async () => {
    const { wrapper } = await withTraces(
      [attempt({ sessionId: 'old', startedAt: 1 }), attempt({ sessionId: 'now', startedAt: 9 })],
      [], { currentSessionId: 'now' },
    )
    expect((wrapper.find('[data-clear-open]').element as HTMLButtonElement).disabled).toBe(false)

    // Clearing can begin while this panel is on screen, and the stored-work capability
    // already requires a revoked read not to leave the previous state showing. Asserting
    // this from a list that never loaded cannot tell the two apart: with nothing loaded
    // the control is disabled for having nothing to remove, whatever `blocked` says.
    await wrapper.setProps({ blocked: true, blockReason: 'undecided' })

    expect((wrapper.find('[data-clear-open]').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('lists a deletion trace alongside the attempts and tells them apart', async () => {
    const { wrapper } = await withTraces(
      [attempt({ sessionId: 'now' })],
      [TRACE({ removed: [{ startedAt: 1000, solved: false }, { startedAt: 2000, solved: true }] })],
      { currentSessionId: 'now' },
    )

    const rows = wrapper.findAll('[data-trace-row]')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('2')
    // A trace is not an attempt: it must not be selectable as an export target.
    expect(rows[0].find('[data-session-select]').exists()).toBe(false)
  })

  it('picks up a trace written by a clear without the page being reloaded', async () => {
    const load = vi.fn().mockResolvedValue([attempt({ sessionId: 'now' })])
    const loadTraces = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([TRACE()])
    const wrapper = mount(List, { props: { load, loadTraces, currentSessionId: 'now' } })
    await flushPromises()
    expect(wrapper.findAll('[data-trace-row]')).toHaveLength(0)

    await (wrapper.vm as unknown as { reload: () => Promise<void> }).reload()
    await flushPromises()

    expect(wrapper.findAll('[data-trace-row]')).toHaveLength(1)
  })

  it('describes a trace without claiming it cannot be removed', async () => {
    const { wrapper } = await withTraces([attempt({ sessionId: 'now' })], [TRACE()], { currentSessionId: 'now' })

    const shown = wrapper.text()
    // The same shape of boundary the integrity check states: say what it is, and say
    // what it is not. A whole-database clear takes the traces too.
    expect(shown).toContain('清除本機全部紀錄時，痕跡會一併消失')
    // It now covers three acts, so it must not describe itself as being only about removals.
    expect(shown).toContain('這裡發生過什麼')
    for (const overclaim of ['稽核', '防竄改', '未經竄改', '無法刪除', '永久保留']) {
      expect(shown).not.toContain(overclaim)
    }
  })

  it('renders no control for removing a single attempt', async () => {
    const { wrapper } = await withTraces(
      [attempt({ sessionId: 'old' }), attempt({ sessionId: 'now', startedAt: 9 })], [], { currentSessionId: 'now' },
    )

    // The data layer has the action; the panel deliberately does not offer it.
    expect(wrapper.find('[data-session-delete]').exists()).toBe(false)
  })
})

it.each([
  ['removed', { kind: 'removed', removed: [{ startedAt: 1, solved: false }, { startedAt: 2, solved: true }] }, '2'],
  ['exported', { kind: 'exported', sessionId: 's-1', mode: 'thinned', identitySupplied: true }, '匯出'],
  ['imported', { kind: 'imported', sessionId: 'new', sourceSessionId: 'old', sourceExportedAt: '2026-09-16T10:00:00+08:00' }, '匯入'],
] as const)('renders a %s trace without reaching for another kind\'s fields', async (kind, detail, fragment) => {
  const load = vi.fn().mockResolvedValue([attempt({ sessionId: 'now' })])
  const loadTraces = vi.fn().mockResolvedValue([{ id: `t-${kind}`, challengeSlug: 'sqli-demo', at: 5_000_000, ...detail }])
  const wrapper = mount(List, { props: { load, loadTraces, currentSessionId: 'now' } })
  await flushPromises()

  // One template reading `trace.removed.length` for every kind throws on the two that
  // have no such field, and takes the whole page down with it.
  const row = wrapper.find(`[data-trace-row="t-${kind}"]`)
  expect(row.exists()).toBe(true)
  expect(row.text()).toContain(fragment)
})

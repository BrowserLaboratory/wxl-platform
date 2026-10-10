import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'

// MergedNav's responsive behaviour is carried by utility classes on specific
// elements. Whole-file source greps cannot tell which element carries which
// class, so they go red on every restyle while still not proving the class is
// on the right node. The MergedNav assertions below mount instead.
vi.mock('vitepress', () => ({
  useData: vi.fn(() => ({
    // Real refs: a plain object is not unwrapped in templates and reads as
    // truthy, so any template branch on it takes the same path either way.
    isDark: ref(false),
    localeIndex: ref('root'),
    site: { value: { themeConfig: {} } },
  })),
  useRouter: vi.fn(() => ({ go: vi.fn(), route: { path: '/' } })),
  withBase: (url: string) => url,
}))

const mergedNavVue = readFileSync(
  resolve(__dirname, '../../../.vitepress/theme/components/MergedNav.vue'),
  'utf-8',
)

const challengeLayoutVue = readFileSync(
  resolve(__dirname, '../../../.vitepress/theme/layouts/ChallengeLayout.vue'),
  'utf-8',
)

import MergedNav from '../../../.vitepress/theme/components/MergedNav.vue'

const navProps = {
  title: 'Demo',
  difficulty: 'easy',
  category: 'web',
  runtimeReady: true,
  runtimeError: null as string | null,
  noteCount: 0,
  descriptionCollapsed: false,
}

/** The element carrying the back link's full-width label. */
function backLinkLabel() {
  const wrapper = mount(MergedNav, { props: navProps })
  return wrapper.find('a[href="/challenges/"]').find('span.lg\\:inline')
}

describe('RWD - Desktop (≥1024px)', () => {
  it('MergedNav shows the full back-link label on lg breakpoint', () => {
    const label = backLinkLabel()
    expect(label.exists()).toBe(true)
    // Arrow plus the translated label — the label text itself is locale-driven
    // and is asserted per-locale in MergedNav.test.ts.
    expect(label.text().startsWith('←')).toBe(true)
    expect(label.text().length).toBeGreaterThan(1)
  })

  it('MergedNav shows "Notes" text on lg breakpoint', () => {
    const wrapper = mount(MergedNav, { props: navProps })
    const notesLabel = wrapper.find('[data-notes-btn]').find('span.lg\\:inline')
    expect(notesLabel.exists()).toBe(true)
    expect(notesLabel.text()).toBe('Notes')
  })

  it('ChallengeLayout uses two-column flex layout', () => {
    expect(challengeLayoutVue).toContain('description-column')
    expect(challengeLayoutVue).toContain('flex-1')
  })
})

describe('RWD - Tablet (768–1023px)', () => {
  it('MergedNav back link shows icon-only below lg', () => {
    const wrapper = mount(MergedNav, { props: navProps })
    const link = wrapper.find('a[href="/challenges/"]')
    // Two variants on the same link: the full label hidden below lg, and a
    // bare arrow shown only below lg. `hidden` is the half that makes it
    // icon-only — without asserting it, removing that class kept this green.
    const wide = link.find('span.lg\\:inline')
    expect(wide.exists()).toBe(true)
    expect(wide.classes()).toContain('hidden')
    expect(link.find('span.lg\\:hidden').text()).toBe('←')
  })

  it('MergedNav Notes button shows icon-only below lg', () => {
    const label = mount(MergedNav, { props: navProps }).find('[data-notes-btn]').find('span.lg\\:inline')
    expect(label.classes()).toContain('hidden')
  })
})

describe('RWD - Mobile (<768px)', () => {
  it('MergedNav has mobile-specific layout classes', () => {
    // Should have md: breakpoint responsive classes
    expect(mergedNavVue).toContain('md:')
  })

  it('ChallengeLayout tab nav supports horizontal scrolling on mobile', () => {
    expect(challengeLayoutVue).toMatch(/overflow-x-auto|overflow-auto/)
  })
})

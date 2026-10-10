import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChallengeDoneBadge from '../../../.vitepress/theme/components/ChallengeDoneBadge.vue'

describe('ChallengeDoneBadge', () => {
  it('renders the label it is given as visible text', () => {
    const wrapper = mount(ChallengeDoneBadge, { props: { label: '已完成' } })
    expect(wrapper.text()).toContain('已完成')
  })

  // Colour is not allowed to be the only difference between a solved challenge and an
  // unsolved one, and the platform already carries an unfixed contrast defect in its
  // light theme. Stripping every class must leave the badge still readable.
  it('says what it means without any of its styling', () => {
    const wrapper = mount(ChallengeDoneBadge, { props: { label: 'Solved' } })
    const el = wrapper.get('[data-challenge-done]').element as HTMLElement
    el.className = ''
    expect(el.textContent?.trim()).toBe('Solved')
  })

  // Below `sm` only the tick is drawn and the word is `sr-only`. That is a width
  // decision: a list row at 390px has no free space, and the full badge costs 67px
  // against 27px for the tick — measured, in evidence/gates.txt G-E.
  //
  // Asserted on the class contract, because that is all this environment can see:
  // happy-dom applies no stylesheet and evaluates no media query, so there is no width
  // at which this test could observe the label actually disappearing. The measurement
  // that does observe it is the browser one; this assertion exists so that deleting the
  // rule from the template is not silent.
  it.each([
    // mode      visually hidden below the boundary?   shown above it?
    ['wide',    true,  true],
    ['always',  false, false],
    ['never',   true,  false],
  ] as const)('in labelMode=%s the label is hidden=%s / revealed-above-boundary=%s', (mode, hidden, revealed) => {
    const wrapper = mount(ChallengeDoneBadge, { props: { label: 'Solved', labelMode: mode } })
    const label = wrapper.get('[data-challenge-done] > span')
    expect(label.classes().includes('sr-only')).toBe(hidden)
    expect(label.classes().includes('min-[560px]:not-sr-only')).toBe(revealed)
    // Announced at every width in every mode: sr-only hides from sight, not from the
    // accessibility tree, and the badge carries the same word as its title.
    expect(wrapper.get('[data-challenge-done]').attributes('title')).toBe('Solved')
    expect(label.text()).toBe('Solved')
  })

  it('defaults to the wide mode', () => {
    const wrapper = mount(ChallengeDoneBadge, { props: { label: 'Solved' } })
    const label = wrapper.get('[data-challenge-done] > span')
    expect(label.classes()).toContain('sr-only')
    expect(label.classes()).toContain('min-[560px]:not-sr-only')
  })

  // The tick carries nothing a screen reader needs, and announcing it alongside the
  // label would read the state twice. The label is the accessible name because it is
  // the only thing left unhidden.
  it('hides the icon from assistive technology', () => {
    const wrapper = mount(ChallengeDoneBadge, { props: { label: 'Solved' } })
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
  })

  // Every colour it uses comes from a --ch-* token through the named shortcut. A literal
  // hex here would be invisible to the theme and would not follow the dark palette.
  it('carries no literal colour of its own', () => {
    const wrapper = mount(ChallengeDoneBadge, { props: { label: 'Solved' } })
    const html = wrapper.html()
    expect(html).toContain('ch-badge-done')
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(html).not.toMatch(/rgba?\(/)
  })
})

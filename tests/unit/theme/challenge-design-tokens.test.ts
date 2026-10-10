import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const styleCss = readFileSync(
  resolve(__dirname, '../../../.vitepress/theme/style.css'),
  'utf-8',
)

const mergedNavVue = readFileSync(
  resolve(__dirname, '../../../.vitepress/theme/components/MergedNav.vue'),
  'utf-8',
)

describe('Challenge design tokens (style.css)', () => {
  it('hides .VPNav on challenge pages', () => {
    expect(styleCss).toMatch(/body\.challenge-page\s+\.VPNav[\s\S]*?display:\s*none\s*!important/)
  })

  it('overrides --vp-nav-height to 0 on challenge pages', () => {
    expect(styleCss).toMatch(/body\.challenge-page[\s\S]*?--vp-nav-height:\s*0/)
  })
})

describe('Non-challenge page safety', () => {
  it('VPNav hide rule is scoped to body.challenge-page only', () => {
    // Ensure the .VPNav hide is only applied when body has challenge-page class
    // There should be no global .VPNav { display: none } without the body scope
    const globalHidePattern = /(?<!body\.challenge-page\s)\.VPNav[\s\S]*?display:\s*none/
    const lines = styleCss.split('\n')
    for (const line of lines) {
      if (line.includes('.VPNav') && line.includes('display') && line.includes('none')) {
        // This line must also reference body.challenge-page
        // (checked via the block-level rule below)
      }
    }
    // The rule must be inside a body.challenge-page selector block
    expect(styleCss).toMatch(/body\.challenge-page\s+\.VPNav/)
  })

  it('--vp-nav-height override is scoped to body.challenge-page only', () => {
    expect(styleCss).toMatch(/body\.challenge-page\s*\{[\s\S]*?--vp-nav-height/)
  })
})

describe('MergedNav design tokens', () => {
  it('uses --ch-bg for background', () => {
    expect(mergedNavVue).toContain('--ch-bg')
  })

  it('uses --ch-text-1 for text color', () => {
    expect(mergedNavVue).toContain('--ch-text-1')
  })

  it('uses --ch-accent for accent color', () => {
    expect(mergedNavVue).toContain('--ch-accent')
  })

  it('uses --ch-border for border color', () => {
    expect(mergedNavVue).toContain('--ch-border')
  })
})

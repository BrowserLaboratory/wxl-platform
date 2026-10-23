import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '../../../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../../../.vitepress/theme/i18n/messages/zh-TW.json'
import ShortLinkShare from '../../../.vitepress/theme/components/ShortLinkShare.vue'
import { linkMode } from '../../../.vitepress/theme/linkMode'
import { SITE_ORIGIN } from '../../../.vitepress/challenge/shortLink'

// L19. Its own file because ShortLinkShare.test.ts replaces the mode module for every test in it
// (`vi.mock` is hoisted per file). Here nothing replaces it, and vitest does not define the
// build's `__WXL_SHORT_LINKS__`: an undefined constant means page mode, without a ReferenceError.

describe('the link mode with the build constant undefined (L19)', () => {
  it('is page mode, read without throwing', () => {
    expect(() => linkMode()).not.toThrow()
    expect(linkMode()).toBe('page')
  })

  it('makes the control show and copy the page URL', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(globalThis.navigator, 'clipboard', { value: { writeText }, configurable: true, writable: true })
    const wrapper = mount(ShortLinkShare, {
      props: { number: 1, slug: 'door-is-open', locale: 'en' },
      global: {
        plugins: [createI18n({ legacy: false, locale: 'en', messages: { en, 'zh-TW': zhTW }, missingWarn: false, fallbackWarn: false })],
      },
    })

    expect(wrapper.find('[data-short-link]').text()).toBe(`${SITE_ORIGIN.replace(/^https:\/\//, '')}/challenge/door-is-open/`)
    await wrapper.find('[data-copy-link]').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(`${SITE_ORIGIN}/challenge/door-is-open/`)
  })
})

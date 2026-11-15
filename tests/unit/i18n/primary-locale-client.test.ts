import { describe, it, expect, afterEach, vi } from 'vitest'
import { primaryLocale } from '../../../.vitepress/theme/i18n/primaryLocale'

// D31 first step (0010-S12): nothing defines `__WXL_PRIMARY_LOCALE__` under vitest, so the
// client module falls back to `zh-TW` — the same answer R17 gives for "nothing says".

describe('primary locale on the client, with the build constant undefined (0010-S12)', () => {
  it('is zh-TW', () => {
    expect(primaryLocale()).toBe('zh-TW')
  })
})

describe('primary locale on the client, with the build constant stubbed (0010-S12)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is en when the build constant is en', () => {
    vi.stubGlobal('__WXL_PRIMARY_LOCALE__', 'en')
    expect(primaryLocale()).toBe('en')
  })

  it('is zh-TW when the build constant is zh-TW', () => {
    vi.stubGlobal('__WXL_PRIMARY_LOCALE__', 'zh-TW')
    expect(primaryLocale()).toBe('zh-TW')
  })
})

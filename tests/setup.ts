import { config } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '../.vitepress/theme/i18n/messages/en.json'
import zhTW from '../.vitepress/theme/i18n/messages/zh-TW.json'

// Install a default vue-i18n plugin for all component tests. Component tests
// that need a specific locale/messages can still pass their own plugin via
// `mount(C, { global: { plugins: [createI18n(...)] } })` — the local override
// replaces this default. Without this setup, every component that uses $t()
// throws "$t is not a function" at mount time.
// Default locale is `zh-TW` because the pre-i18n tests under
// tests/unit/components/ assert against the original Traditional Chinese UI
// strings (e.g. `title="格線模式"`). With `en` default the assertions would
// have to be rewritten en-masse. New tests can override per-mount with
// `global: { plugins: [createI18n({ locale: 'en', ... })] }`.
const defaultI18n = createI18n({
  legacy: false,
  locale: 'zh-TW',
  fallbackLocale: 'en',
  globalInjection: true,
  messages: { en, 'zh-TW': zhTW },
  missingWarn: false,
  fallbackWarn: false,
})

config.global.plugins = [defaultI18n]

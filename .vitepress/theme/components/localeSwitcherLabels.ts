import { LOCALES, type Locale } from '../../locales'

/**
 * A22, D34: one i18n message key per member of `LOCALES`, not a two-branch ternary. Growing
 * the locale list without adding its entry here is a loud failure (`localeSwitcherLabelKey`
 * throws) rather than a silent fallback to one of the two existing labels.
 */
export const LOCALE_SWITCHER_LABEL_KEYS: Record<Locale, string> = {
  en: 'locale_switcher.english_label',
  'zh-TW': 'locale_switcher.tw_label',
}

/** The i18n message key for `locale`'s menu/heading label, or a thrown error naming the gap. */
export function localeSwitcherLabelKey(locale: Locale): string {
  const key = LOCALE_SWITCHER_LABEL_KEYS[locale]
  if (!key) {
    throw new Error(`LocaleSwitcher: LOCALES carries "${locale}" with no label key in LOCALE_SWITCHER_LABEL_KEYS`)
  }
  return key
}

/** Every member of `LOCALES` has a label key here — the guard a third locale would trip. */
export function assertEveryLocaleHasALabel(): void {
  for (const code of LOCALES) localeSwitcherLabelKey(code)
}

import type { ComputedRef, InjectionKey } from 'vue'
import type { Locale } from './index'

// What the theme's Layout provides to the locale menus below it (spec 0008): the locale of the
// missing-translation line, and the switcher's choice, which may bring that line up.

/** What a locale switcher choice did: went to the chosen locale's version, or stayed. */
export type ChoiceOutcome = 'navigate' | 'stay'

/**
 * The locale the missing-translation line is written in on this page, or null when it does
 * not show. Decided by the theme's Layout (spec 0008, seam S1) and provided to the challenge
 * layout, which places the line below its nav (L3).
 */
export const MISSING_TRANSLATION_LOCALE: InjectionKey<ComputedRef<Locale | null>> = Symbol('missing-translation-locale')

/**
 * Makes a locale switcher choice (spec 0008, B1–B7): provided by the theme's Layout, used by
 * `LocaleSwitcher` wherever it renders. Returns whether the choice navigated or stayed.
 */
export const LOCALE_CHOICE: InjectionKey<(locale: Locale) => ChoiceOutcome> = Symbol('locale-choice')

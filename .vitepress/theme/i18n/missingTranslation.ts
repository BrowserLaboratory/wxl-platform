import type { ComputedRef, InjectionKey } from 'vue'
import type { Locale } from './index'

/**
 * The locale the missing-translation line is written in on this page, or null when it does
 * not show. Decided by the theme's Layout (spec 0008, seam S1) and provided to the challenge
 * layout, which places the line below its nav (L3).
 */
export const MISSING_TRANSLATION_LOCALE: InjectionKey<ComputedRef<Locale | null>> = Symbol('missing-translation-locale')

/**
 * The cold-load decision table (A-§4.1, DT01–DT80) and the switcher table (A-§4.3, SW01–SW16),
 * transcribed column for column from `.proj.specs/0010-primary-locale-layout/traceability.md`.
 *
 * DT01–DT40 (`P = en`, `T = zh-TW`) carry the same shape as DT41–DT80 (`P = zh-TW`, `T = en`),
 * but DT41–DT80 is NOT a mechanical "swap the two locale codes, keep the row order" transform
 * of DT01–40: the source table's own PP block (DT41–48) reorders its `stored = P` and
 * `stored = T` pairs relative to DT01–08's order (DT05/06's content — `stored = T` — lands at
 * DT43/44, and DT03/04's content — `stored = P` — lands at DT45/46; a generated mirror that
 * keeps DT01–08's position would put DT05/06's content at DT45/46 instead, silently wrong).
 * `DT01_40` and `DT41_80` below are both literal transcriptions of the source table, row by
 * row, checked id by id against it — not generated from one another — so this file cannot drift
 * from the source the way a positional generator already did once.
 *
 * `X` (one challenge, one article) and the two bases are NOT part of this table: callers
 * instantiate a row's `/X`-shaped fields against a concrete entry and base of their own choosing
 * (spec 0010-S10/S13's boundary conditions).
 */
import type { Locale } from '../../.vitepress/theme/i18n'

export type ArrivalKind = 'PP' | 'TP' | 'NT' | 'NP' | 'NU'
export type StoredValue = 'none' | 'en' | 'zh-TW' | 'invalid'
export type Counterpart = 'exists' | 'missing'

export interface DTRow {
  id: string
  P: Locale
  T: Locale
  arrival: ArrivalKind
  stored: StoredValue
  counterpart: Counterpart
  /** 'none': stays (page arrivals) or lands on the not-found page (not-found arrivals).
   *  'to-P': redirects to the counterpart's unprefixed (P) entry.
   *  'to-T': redirects to the counterpart's T-prefixed entry. */
  redirect: 'none' | 'to-P' | 'to-T'
  /** The locale carried to the landing page / asked for by the arrival, or null when the
   *  arrival lands on (or stays at) the not-found page with nothing to request. */
  requested: Locale | null
  /** The missing-translation line's locale on the page finally shown, or null when it does not show. */
  line: Locale | null
  /** The locale the cold load's own write stores, or null when nothing is written. */
  written: Locale | null
}

// DT01–DT40, `P = en`, `T = zh-TW` — transcribed literally from traceability.md.
const DT01_40: DTRow[] = [
  // PP: primary-locale page /X (DT01–DT08)
  { id: 'DT01', P: 'en', T: 'zh-TW', arrival: 'PP', stored: 'none', counterpart: 'exists', redirect: 'none', requested: 'en', line: null, written: null },
  { id: 'DT02', P: 'en', T: 'zh-TW', arrival: 'PP', stored: 'none', counterpart: 'missing', redirect: 'none', requested: 'en', line: null, written: null },
  { id: 'DT03', P: 'en', T: 'zh-TW', arrival: 'PP', stored: 'en', counterpart: 'exists', redirect: 'none', requested: 'en', line: null, written: null },
  { id: 'DT04', P: 'en', T: 'zh-TW', arrival: 'PP', stored: 'en', counterpart: 'missing', redirect: 'none', requested: 'en', line: null, written: null },
  { id: 'DT05', P: 'en', T: 'zh-TW', arrival: 'PP', stored: 'zh-TW', counterpart: 'exists', redirect: 'to-T', requested: 'zh-TW', line: null, written: null },
  { id: 'DT06', P: 'en', T: 'zh-TW', arrival: 'PP', stored: 'zh-TW', counterpart: 'missing', redirect: 'none', requested: 'zh-TW', line: 'zh-TW', written: null },
  { id: 'DT07', P: 'en', T: 'zh-TW', arrival: 'PP', stored: 'invalid', counterpart: 'exists', redirect: 'none', requested: 'en', line: null, written: null },
  { id: 'DT08', P: 'en', T: 'zh-TW', arrival: 'PP', stored: 'invalid', counterpart: 'missing', redirect: 'none', requested: 'en', line: null, written: null },
  // TP: translation page /T/X (DT09–DT16) — every stored value, every counterpart: no redirect,
  // requested is always the prefix, no line, and the write is attempted regardless of whether
  // storage accepts it (0008 W6).
  { id: 'DT09', P: 'en', T: 'zh-TW', arrival: 'TP', stored: 'none', counterpart: 'exists', redirect: 'none', requested: 'zh-TW', line: null, written: 'zh-TW' },
  { id: 'DT10', P: 'en', T: 'zh-TW', arrival: 'TP', stored: 'none', counterpart: 'missing', redirect: 'none', requested: 'zh-TW', line: null, written: 'zh-TW' },
  { id: 'DT11', P: 'en', T: 'zh-TW', arrival: 'TP', stored: 'en', counterpart: 'exists', redirect: 'none', requested: 'zh-TW', line: null, written: 'zh-TW' },
  { id: 'DT12', P: 'en', T: 'zh-TW', arrival: 'TP', stored: 'en', counterpart: 'missing', redirect: 'none', requested: 'zh-TW', line: null, written: 'zh-TW' },
  { id: 'DT13', P: 'en', T: 'zh-TW', arrival: 'TP', stored: 'zh-TW', counterpart: 'exists', redirect: 'none', requested: 'zh-TW', line: null, written: 'zh-TW' },
  { id: 'DT14', P: 'en', T: 'zh-TW', arrival: 'TP', stored: 'zh-TW', counterpart: 'missing', redirect: 'none', requested: 'zh-TW', line: null, written: 'zh-TW' },
  { id: 'DT15', P: 'en', T: 'zh-TW', arrival: 'TP', stored: 'invalid', counterpart: 'exists', redirect: 'none', requested: 'zh-TW', line: null, written: 'zh-TW' },
  { id: 'DT16', P: 'en', T: 'zh-TW', arrival: 'TP', stored: 'invalid', counterpart: 'missing', redirect: 'none', requested: 'zh-TW', line: null, written: 'zh-TW' },
  // NT: not-found translation path /T/X (DT17–DT24) — the stored value changes nothing.
  { id: 'DT17', P: 'en', T: 'zh-TW', arrival: 'NT', stored: 'none', counterpart: 'exists', redirect: 'to-P', requested: 'zh-TW', line: 'zh-TW', written: null },
  { id: 'DT18', P: 'en', T: 'zh-TW', arrival: 'NT', stored: 'none', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT19', P: 'en', T: 'zh-TW', arrival: 'NT', stored: 'en', counterpart: 'exists', redirect: 'to-P', requested: 'zh-TW', line: 'zh-TW', written: null },
  { id: 'DT20', P: 'en', T: 'zh-TW', arrival: 'NT', stored: 'en', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT21', P: 'en', T: 'zh-TW', arrival: 'NT', stored: 'zh-TW', counterpart: 'exists', redirect: 'to-P', requested: 'zh-TW', line: 'zh-TW', written: null },
  { id: 'DT22', P: 'en', T: 'zh-TW', arrival: 'NT', stored: 'zh-TW', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT23', P: 'en', T: 'zh-TW', arrival: 'NT', stored: 'invalid', counterpart: 'exists', redirect: 'to-P', requested: 'zh-TW', line: 'zh-TW', written: null },
  { id: 'DT24', P: 'en', T: 'zh-TW', arrival: 'NT', stored: 'invalid', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  // NP: not-found primary-code path /P/X, R22 (DT25–DT32)
  { id: 'DT25', P: 'en', T: 'zh-TW', arrival: 'NP', stored: 'none', counterpart: 'exists', redirect: 'to-P', requested: 'en', line: null, written: null },
  { id: 'DT26', P: 'en', T: 'zh-TW', arrival: 'NP', stored: 'none', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT27', P: 'en', T: 'zh-TW', arrival: 'NP', stored: 'en', counterpart: 'exists', redirect: 'to-P', requested: 'en', line: null, written: null },
  { id: 'DT28', P: 'en', T: 'zh-TW', arrival: 'NP', stored: 'en', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT29', P: 'en', T: 'zh-TW', arrival: 'NP', stored: 'zh-TW', counterpart: 'exists', redirect: 'to-P', requested: 'en', line: null, written: null },
  { id: 'DT30', P: 'en', T: 'zh-TW', arrival: 'NP', stored: 'zh-TW', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT31', P: 'en', T: 'zh-TW', arrival: 'NP', stored: 'invalid', counterpart: 'exists', redirect: 'to-P', requested: 'en', line: null, written: null },
  { id: 'DT32', P: 'en', T: 'zh-TW', arrival: 'NP', stored: 'invalid', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  // NU: not-found primary path /X (DT33–DT40)
  { id: 'DT33', P: 'en', T: 'zh-TW', arrival: 'NU', stored: 'none', counterpart: 'exists', redirect: 'to-T', requested: 'en', line: 'en', written: null },
  { id: 'DT34', P: 'en', T: 'zh-TW', arrival: 'NU', stored: 'none', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT35', P: 'en', T: 'zh-TW', arrival: 'NU', stored: 'en', counterpart: 'exists', redirect: 'to-T', requested: 'en', line: 'en', written: null },
  { id: 'DT36', P: 'en', T: 'zh-TW', arrival: 'NU', stored: 'en', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT37', P: 'en', T: 'zh-TW', arrival: 'NU', stored: 'zh-TW', counterpart: 'exists', redirect: 'to-T', requested: 'en', line: 'en', written: null },
  { id: 'DT38', P: 'en', T: 'zh-TW', arrival: 'NU', stored: 'zh-TW', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT39', P: 'en', T: 'zh-TW', arrival: 'NU', stored: 'invalid', counterpart: 'exists', redirect: 'to-T', requested: 'en', line: 'en', written: null },
  { id: 'DT40', P: 'en', T: 'zh-TW', arrival: 'NU', stored: 'invalid', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
]

// DT41–DT80, `P = zh-TW`, `T = en` — transcribed literally from traceability.md (NOT generated
// from DT01_40: see the module doc comment above for why the PP block's row order differs).
const DT41_80: DTRow[] = [
  // PP: primary-locale page /X (DT41–DT48)
  { id: 'DT41', P: 'zh-TW', T: 'en', arrival: 'PP', stored: 'none', counterpart: 'exists', redirect: 'none', requested: 'zh-TW', line: null, written: null },
  { id: 'DT42', P: 'zh-TW', T: 'en', arrival: 'PP', stored: 'none', counterpart: 'missing', redirect: 'none', requested: 'zh-TW', line: null, written: null },
  { id: 'DT43', P: 'zh-TW', T: 'en', arrival: 'PP', stored: 'en', counterpart: 'exists', redirect: 'to-T', requested: 'en', line: null, written: null },
  { id: 'DT44', P: 'zh-TW', T: 'en', arrival: 'PP', stored: 'en', counterpart: 'missing', redirect: 'none', requested: 'en', line: 'en', written: null },
  { id: 'DT45', P: 'zh-TW', T: 'en', arrival: 'PP', stored: 'zh-TW', counterpart: 'exists', redirect: 'none', requested: 'zh-TW', line: null, written: null },
  { id: 'DT46', P: 'zh-TW', T: 'en', arrival: 'PP', stored: 'zh-TW', counterpart: 'missing', redirect: 'none', requested: 'zh-TW', line: null, written: null },
  { id: 'DT47', P: 'zh-TW', T: 'en', arrival: 'PP', stored: 'invalid', counterpart: 'exists', redirect: 'none', requested: 'zh-TW', line: null, written: null },
  { id: 'DT48', P: 'zh-TW', T: 'en', arrival: 'PP', stored: 'invalid', counterpart: 'missing', redirect: 'none', requested: 'zh-TW', line: null, written: null },
  // TP: translation page /T/X (DT49–DT56)
  { id: 'DT49', P: 'zh-TW', T: 'en', arrival: 'TP', stored: 'none', counterpart: 'exists', redirect: 'none', requested: 'en', line: null, written: 'en' },
  { id: 'DT50', P: 'zh-TW', T: 'en', arrival: 'TP', stored: 'none', counterpart: 'missing', redirect: 'none', requested: 'en', line: null, written: 'en' },
  { id: 'DT51', P: 'zh-TW', T: 'en', arrival: 'TP', stored: 'en', counterpart: 'exists', redirect: 'none', requested: 'en', line: null, written: 'en' },
  { id: 'DT52', P: 'zh-TW', T: 'en', arrival: 'TP', stored: 'en', counterpart: 'missing', redirect: 'none', requested: 'en', line: null, written: 'en' },
  { id: 'DT53', P: 'zh-TW', T: 'en', arrival: 'TP', stored: 'zh-TW', counterpart: 'exists', redirect: 'none', requested: 'en', line: null, written: 'en' },
  { id: 'DT54', P: 'zh-TW', T: 'en', arrival: 'TP', stored: 'zh-TW', counterpart: 'missing', redirect: 'none', requested: 'en', line: null, written: 'en' },
  { id: 'DT55', P: 'zh-TW', T: 'en', arrival: 'TP', stored: 'invalid', counterpart: 'exists', redirect: 'none', requested: 'en', line: null, written: 'en' },
  { id: 'DT56', P: 'zh-TW', T: 'en', arrival: 'TP', stored: 'invalid', counterpart: 'missing', redirect: 'none', requested: 'en', line: null, written: 'en' },
  // NT: not-found translation path /T/X (DT57–DT64) — the stored value changes nothing.
  { id: 'DT57', P: 'zh-TW', T: 'en', arrival: 'NT', stored: 'none', counterpart: 'exists', redirect: 'to-P', requested: 'en', line: 'en', written: null },
  { id: 'DT58', P: 'zh-TW', T: 'en', arrival: 'NT', stored: 'none', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT59', P: 'zh-TW', T: 'en', arrival: 'NT', stored: 'en', counterpart: 'exists', redirect: 'to-P', requested: 'en', line: 'en', written: null },
  { id: 'DT60', P: 'zh-TW', T: 'en', arrival: 'NT', stored: 'en', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT61', P: 'zh-TW', T: 'en', arrival: 'NT', stored: 'zh-TW', counterpart: 'exists', redirect: 'to-P', requested: 'en', line: 'en', written: null },
  { id: 'DT62', P: 'zh-TW', T: 'en', arrival: 'NT', stored: 'zh-TW', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT63', P: 'zh-TW', T: 'en', arrival: 'NT', stored: 'invalid', counterpart: 'exists', redirect: 'to-P', requested: 'en', line: 'en', written: null },
  { id: 'DT64', P: 'zh-TW', T: 'en', arrival: 'NT', stored: 'invalid', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  // NP: not-found primary-code path /P/X, R22 (DT65–DT72)
  { id: 'DT65', P: 'zh-TW', T: 'en', arrival: 'NP', stored: 'none', counterpart: 'exists', redirect: 'to-P', requested: 'zh-TW', line: null, written: null },
  { id: 'DT66', P: 'zh-TW', T: 'en', arrival: 'NP', stored: 'none', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT67', P: 'zh-TW', T: 'en', arrival: 'NP', stored: 'en', counterpart: 'exists', redirect: 'to-P', requested: 'zh-TW', line: null, written: null },
  { id: 'DT68', P: 'zh-TW', T: 'en', arrival: 'NP', stored: 'en', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT69', P: 'zh-TW', T: 'en', arrival: 'NP', stored: 'zh-TW', counterpart: 'exists', redirect: 'to-P', requested: 'zh-TW', line: null, written: null },
  { id: 'DT70', P: 'zh-TW', T: 'en', arrival: 'NP', stored: 'zh-TW', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT71', P: 'zh-TW', T: 'en', arrival: 'NP', stored: 'invalid', counterpart: 'exists', redirect: 'to-P', requested: 'zh-TW', line: null, written: null },
  { id: 'DT72', P: 'zh-TW', T: 'en', arrival: 'NP', stored: 'invalid', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  // NU: not-found primary path /X (DT73–DT80)
  { id: 'DT73', P: 'zh-TW', T: 'en', arrival: 'NU', stored: 'none', counterpart: 'exists', redirect: 'to-T', requested: 'zh-TW', line: 'zh-TW', written: null },
  { id: 'DT74', P: 'zh-TW', T: 'en', arrival: 'NU', stored: 'none', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT75', P: 'zh-TW', T: 'en', arrival: 'NU', stored: 'en', counterpart: 'exists', redirect: 'to-T', requested: 'zh-TW', line: 'zh-TW', written: null },
  { id: 'DT76', P: 'zh-TW', T: 'en', arrival: 'NU', stored: 'en', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT77', P: 'zh-TW', T: 'en', arrival: 'NU', stored: 'zh-TW', counterpart: 'exists', redirect: 'to-T', requested: 'zh-TW', line: 'zh-TW', written: null },
  { id: 'DT78', P: 'zh-TW', T: 'en', arrival: 'NU', stored: 'zh-TW', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
  { id: 'DT79', P: 'zh-TW', T: 'en', arrival: 'NU', stored: 'invalid', counterpart: 'exists', redirect: 'to-T', requested: 'zh-TW', line: 'zh-TW', written: null },
  { id: 'DT80', P: 'zh-TW', T: 'en', arrival: 'NU', stored: 'invalid', counterpart: 'missing', redirect: 'none', requested: null, line: null, written: null },
]

export const DT: readonly DTRow[] = [...DT01_40, ...DT41_80]

export interface SWRow {
  id: string
  P: Locale
  T: Locale
  /** 'primary' | 'translation': a page arrival. 'not-found': the not-found page or a failed load. */
  page: 'primary' | 'translation' | 'not-found'
  /** The chosen locale, relative to the row: 'other' (not the page's own) or 'own'. For a
   *  not-found page the choice is 'either' (SW13–16 do not depend on which). */
  chosen: 'own' | 'other' | 'either'
  counterpart: 'listed' | 'unlisted' | null
  decision: 'navigate' | 'stay'
  /** The missing-translation line's locale shown at once when the choice stays (0008 D17), or
   *  null when none shows. */
  line: Locale | null
}

export const SW: readonly SWRow[] = [
  { id: 'SW01', P: 'en', T: 'zh-TW', page: 'primary', chosen: 'other', counterpart: 'listed', decision: 'navigate', line: null },
  { id: 'SW02', P: 'en', T: 'zh-TW', page: 'primary', chosen: 'other', counterpart: 'unlisted', decision: 'stay', line: 'zh-TW' },
  { id: 'SW03', P: 'en', T: 'zh-TW', page: 'primary', chosen: 'own', counterpart: null, decision: 'stay', line: null },
  { id: 'SW04', P: 'en', T: 'zh-TW', page: 'translation', chosen: 'other', counterpart: 'listed', decision: 'navigate', line: null },
  { id: 'SW05', P: 'en', T: 'zh-TW', page: 'translation', chosen: 'other', counterpart: 'unlisted', decision: 'stay', line: 'en' },
  { id: 'SW06', P: 'en', T: 'zh-TW', page: 'translation', chosen: 'own', counterpart: null, decision: 'stay', line: null },
  { id: 'SW07', P: 'zh-TW', T: 'en', page: 'primary', chosen: 'other', counterpart: 'listed', decision: 'navigate', line: null },
  { id: 'SW08', P: 'zh-TW', T: 'en', page: 'primary', chosen: 'other', counterpart: 'unlisted', decision: 'stay', line: 'en' },
  { id: 'SW09', P: 'zh-TW', T: 'en', page: 'primary', chosen: 'own', counterpart: null, decision: 'stay', line: null },
  { id: 'SW10', P: 'zh-TW', T: 'en', page: 'translation', chosen: 'other', counterpart: 'listed', decision: 'navigate', line: null },
  { id: 'SW11', P: 'zh-TW', T: 'en', page: 'translation', chosen: 'other', counterpart: 'unlisted', decision: 'stay', line: 'zh-TW' },
  { id: 'SW12', P: 'zh-TW', T: 'en', page: 'translation', chosen: 'own', counterpart: null, decision: 'stay', line: null },
  { id: 'SW13', P: 'en', T: 'zh-TW', page: 'not-found', chosen: 'either', counterpart: 'listed', decision: 'navigate', line: null },
  { id: 'SW14', P: 'en', T: 'zh-TW', page: 'not-found', chosen: 'either', counterpart: 'unlisted', decision: 'stay', line: null },
  { id: 'SW15', P: 'zh-TW', T: 'en', page: 'not-found', chosen: 'either', counterpart: 'listed', decision: 'navigate', line: null },
  { id: 'SW16', P: 'zh-TW', T: 'en', page: 'not-found', chosen: 'either', counterpart: 'unlisted', decision: 'stay', line: null },
]

/** DT rows whose arrival is a page (PP or TP) — the `redirectTargetForStoredLocale` /
 *  `shouldPersistOnColdLoad` table (DT01–DT16, DT41–DT56). */
export const DT_PAGE: readonly DTRow[] = DT.filter((r) => r.arrival === 'PP' || r.arrival === 'TP')

/** DT rows whose arrival is a not-found path (NT, NP or NU) — the `notFoundRedirect` table
 *  (DT17–DT40, DT57–DT80). */
export const DT_NOT_FOUND: readonly DTRow[] = DT.filter((r) => r.arrival === 'NT' || r.arrival === 'NP' || r.arrival === 'NU')

/** The two `X` instances the spec names: one challenge, one article (A-§4.1 preamble). */
export const X_INSTANCES: readonly { label: string; entry: string }[] = [
  { label: 'challenge', entry: '/challenge/s/' },
  { label: 'article', entry: '/guide/python' },
]

/** The two bases the spec names (A7). */
export const BASES: readonly { label: string; base: string; prefix: string }[] = [
  { label: '/', base: '/', prefix: '' },
  { label: '/repo/', base: '/repo/', prefix: '/repo' },
]

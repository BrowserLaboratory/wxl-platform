/**
 * The cold-load decision table (A-§4.1, DT01–DT80) and the switcher table (A-§4.3, SW01–SW16),
 * transcribed column for column from `.proj.specs/0010-primary-locale-layout/traceability.md`.
 *
 * DT01–DT40 (`P = en`, `T = zh-TW`) and DT41–DT80 (`P = zh-TW`, `T = en`) are the same 40 rows
 * with the two locale codes swapped (confirmed row by row against the source table: DT01↔DT41,
 * DT05↔DT43, DT06↔DT44, DT33↔DT73, … every pair). `DT01_40` below is the literal transcription;
 * `DT` is it followed by its locale-swapped mirror, so the generation cannot drift from the
 * source without the mirroring itself being wrong in a way a swapped-row diff would show.
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

function swap(locale: Locale): Locale {
  return locale === 'en' ? 'zh-TW' : 'en'
}

function swapRow(row: DTRow, index: number): DTRow {
  return {
    ...row,
    id: `DT${index}`,
    P: swap(row.P),
    T: swap(row.T),
    stored: row.stored === 'en' || row.stored === 'zh-TW' ? swap(row.stored) : row.stored,
    requested: row.requested === null ? null : swap(row.requested),
    line: row.line === null ? null : swap(row.line),
    written: row.written === null ? null : swap(row.written),
  }
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

export const DT: readonly DTRow[] = [
  ...DT01_40,
  ...DT01_40.map((row, i) => swapRow(row, i + 41)),
]

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
  /** Whether the navigation is a push (no replace) vs a push with no history semantics noted —
   *  every SW decision that navigates is a push (0008 B3); kept for documentation only. */
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

// Primary locale (seam 0010-S1; D2, D3, D114). `parsePrimaryLocale` is a pure parser over the
// file's text or its absence; `readPrimaryLocale` adds the file system.

import { readFileSync, lstatSync } from 'node:fs'
import { DEFAULT_PRIMARY_LOCALE, LOCALES, isKnownLocale, type Locale } from './locales.ts'
import { SiteLayoutError, jsonStringifyEscaped } from './layout-error.ts'

const PL_E01 =
  'PL-E01: range.json is not a regular file; the build reads "primaryLocale" from range.json at the repository root and does not follow a symbolic link.'

function pl02(err: unknown): SiteLayoutError {
  const code = (err as NodeJS.ErrnoException)?.code ?? 'unknown'
  return new SiteLayoutError('PL-E02', `PL-E02: range.json could not be read (${code}).`)
}

export function parsePrimaryLocale(text: string | undefined): Locale {
  if (text === undefined) return DEFAULT_PRIMARY_LOCALE
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new SiteLayoutError('PL-E03', 'PL-E03: range.json is not valid JSON.')
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SiteLayoutError('PL-E04', 'PL-E04: range.json does not hold a JSON object.')
  }
  const obj = value as Record<string, unknown>
  if (!Object.prototype.hasOwnProperty.call(obj, 'primaryLocale')) {
    return DEFAULT_PRIMARY_LOCALE
  }
  const primaryLocale = obj.primaryLocale
  if (typeof primaryLocale !== 'string') {
    throw new SiteLayoutError(
      'PL-E05',
      `PL-E05: "primaryLocale" in range.json is not a string: ${jsonStringifyEscaped(primaryLocale)}.`,
    )
  }
  if (!isKnownLocale(primaryLocale)) {
    throw new SiteLayoutError(
      'PL-E06',
      `PL-E06: "primaryLocale" in range.json is ${jsonStringifyEscaped(primaryLocale)}, which is not on the locale list: ${LOCALES.join(', ')}.`,
    )
  }
  return primaryLocale
}

export function readPrimaryLocale(path: string): Locale {
  let stat
  try {
    stat = lstatSync(path)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return parsePrimaryLocale(undefined)
    }
    throw pl02(err)
  }
  if (!stat.isFile()) {
    throw new SiteLayoutError('PL-E01', PL_E01)
  }
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch (err) {
    throw pl02(err)
  }
  return parsePrimaryLocale(text)
}

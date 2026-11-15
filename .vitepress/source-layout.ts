// The layout check's page predicate (seam 0010-S2; D116). `checkSourceLayout` is T-0077's;
// `classifySourcePath` is the predicate it is built on, exported here. `sourcePath` is relative
// to `platform/` (as PL-E11's `<page>` is).

import { LOCALES, type Locale } from './locales.ts'

const LOCALE_FOLDER_PREFIXES = LOCALES.map((code) => `${code}/`)

function isExcluded(sourcePath: string): boolean {
  if (sourcePath.startsWith('public/') || sourcePath.startsWith('shared/')) return true
  if (/^challenge\/[^/]+\/src\//.test(sourcePath)) return true
  for (const segment of sourcePath.split('/')) {
    if (segment.startsWith('.')) return true
    if (segment === 'node_modules' || segment === 'dist') return true
  }
  return false
}

function isPage(sourcePath: string): boolean {
  return sourcePath.endsWith('.md') && !isExcluded(sourcePath)
}

function isLocaleFolderPath(sourcePath: string): boolean {
  return LOCALE_FOLDER_PREFIXES.some((prefix) => sourcePath.startsWith(prefix))
}

export type SourcePathClass = 'excluded' | 'locale-page' | 'outside'

// D116: one predicate, shared with create-wxl's literal copy (`isLegacyPage`, U136). `primary`
// does not change the classification (D116: the predicate is one for every tool); it is kept as
// a parameter so a future caller can read it without a new seam.
export function classifySourcePath(sourcePath: string, _primary: Locale): SourcePathClass {
  if (!isPage(sourcePath)) return 'excluded'
  return isLocaleFolderPath(sourcePath) ? 'locale-page' : 'outside'
}

// "Language" (traceability.md): `--lang` if given and valid; otherwise the first of `LC_ALL`,
// `LC_MESSAGES`, `LANG` in `deps.env` that is set and non-empty; otherwise `deps.locale`. CW-E01
// and CW-E02 use the environment rule only (they happen before or during parsing): callers pass no
// `explicitLang` for those. Every message after argv has parsed passes `parsed.lang` here.

export function selectLanguage(deps, explicitLang) {
  if (explicitLang === 'en' || explicitLang === 'zh-TW') return explicitLang
  const candidates = [deps.env?.LC_ALL, deps.env?.LC_MESSAGES, deps.env?.LANG]
  for (const candidate of candidates) {
    if (candidate) return /^zh/i.test(candidate) ? 'zh-TW' : 'en'
  }
  const locale = deps.locale ?? ''
  return /^zh/i.test(locale) ? 'zh-TW' : 'en'
}

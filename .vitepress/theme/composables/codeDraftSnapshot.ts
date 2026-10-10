import type { CodeDraft } from './useChallengePersistence'

export const CODE_DRAFT_PREFIX = 'wxl-code-draft-'

/** Runs in the edit callback, before a reload can cancel the database debounce. */
export function checkpointCodeDraft(challengeSlug: string, code: string): void {
  const key = CODE_DRAFT_PREFIX + challengeSlug
  try {
    localStorage.setItem(key, JSON.stringify({ challengeSlug, code, updatedAt: Date.now() }))
  } catch (error) {
    // A stale checkpoint must not conceal a later successful database fallback.
    try { localStorage.removeItem(key) } catch { /* storage is unavailable */ }
    throw error
  }
}

export function readCodeDraftSnapshot(challengeSlug: string): CodeDraft | null {
  try {
    const draft = JSON.parse(localStorage.getItem(CODE_DRAFT_PREFIX + challengeSlug) ?? 'null')
    return draft && draft.challengeSlug === challengeSlug && typeof draft.code === 'string'
      && typeof draft.updatedAt === 'number' && Number.isFinite(draft.updatedAt) ? draft : null
  } catch { return null }
}

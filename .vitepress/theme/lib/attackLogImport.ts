import { verifyExportPackage } from './attackLogExport'
import type { AttackSession, AttackEvent } from '../composables/useChallengePersistence'

/**
 * Why an export file was not accepted.
 *
 * `invalid` carries the verifier's own words rather than a sentence written here.
 * Import holds no opinion about what makes a package unacceptable — the export-package
 * capability owns that, and a second wording would drift from it the first time the
 * package format changes.
 */
export type ImportRefusal =
  | { ok: false; kind: 'unparseable' }
  | { ok: false; kind: 'invalid'; reason: string }
  | { ok: false; kind: 'wrong-challenge'; fileSlug: string; openSlug: string }

export type ImportResult = { ok: true; session: AttackSession } | ImportRefusal

/** Every event the store's declared shape requires: a named kind at a point in time. */
function conformingEvent(value: unknown): value is AttackEvent {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const event = value as Record<string, unknown>
  return typeof event.type === 'string' && typeof event.timestamp === 'number' && Number.isFinite(event.timestamp)
}

/**
 * Turn the text of an export file into a record ready to be stored, or say why not.
 *
 * Pure with respect to storage: it opens no database and writes nothing, so a refusal
 * cannot have left anything behind. Two ambient reads remain — a fresh session id and
 * the time of import — because both belong to the record being made, not to the caller.
 *
 * Validity is decided entirely by the export-package verifier. The only structural
 * check made here is that each event has the kind and timestamp the stored record's
 * own type declares, which the verifier does not speak to: it validates a package, and
 * an event that satisfies it can still be an object this store cannot describe.
 */
export async function prepareImport(text: string, openSlug: string): Promise<ImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, kind: 'unparseable' }
  }

  const verdict = await verifyExportPackage(parsed)
  if (!verdict.valid) return { ok: false, kind: 'invalid', reason: verdict.reason ?? 'Invalid package' }

  // Narrowed only after the verifier has accepted it; every field read below is one it
  // checked the type of.
  const pkg = parsed as {
    meta: { exportedAt: string }
    challenge: { slug: string; title: string }
    session: { sessionId: string; startedAt: number; solvedAt: number | null; events: unknown[]; draft: { code: string; updatedAt: number } | null }
  }

  if (pkg.challenge.slug !== openSlug) {
    return { ok: false, kind: 'wrong-challenge', fileSlug: pkg.challenge.slug, openSlug }
  }
  if (!pkg.session.events.every(conformingEvent)) {
    return { ok: false, kind: 'invalid', reason: 'Malformed data' }
  }

  return {
    ok: true,
    session: {
      // A new key, not the file's. The store is keyed by this id, so reusing the
      // file's would make a re-import a replacement — of the very record the file was
      // exported from, when the file came from this browser.
      sessionId: crypto.randomUUID(),
      challengeSlug: openSlug,
      challengeTitle: pkg.challenge.title,
      startedAt: pkg.session.startedAt,
      solvedAt: pkg.session.solvedAt,
      events: pkg.session.events,
      origin: {
        kind: 'imported',
        importedAt: Date.now(),
        sourceSessionId: pkg.session.sessionId,
        sourceExportedAt: pkg.meta.exportedAt,
      },
      // Kept on the record rather than written to the challenge's live editor draft,
      // which holds what the learner has in the editor now.
      draft: pkg.session.draft,
    },
  }
}

/**
 * What happened to an import attempt, from the point of view of the surface that ran it.
 *
 * `prepareImport`'s refusals plus the one failure that happens after it: the database
 * would not take the record. Kept distinct from `invalid` because nothing is wrong with
 * the file — retrying is the right advice, and telling the learner their file failed a
 * check would send them looking for a problem that is not there.
 */
export type ImportOutcome = { ok: true } | ImportRefusal | { ok: false; kind: 'write-failed' }

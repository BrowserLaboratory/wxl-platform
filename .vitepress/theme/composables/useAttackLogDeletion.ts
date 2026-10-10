import { useChallengePersistence, type AttackSession, type ActivityTraceDetail } from './useChallengePersistence'

/**
 * What a removal did.
 *
 * A discriminated union rather than a count alone: two of these three outcomes are
 * states the learner has to be told about, and a bare number lets a caller render
 * "removed 1" for all three without noticing.
 *
 * - `partial`: the removal stopped part way. `removed` is how many actually went.
 * - `no-trace`: the attempts are gone and the trace could not be written, so this
 *   removal left no mark. Reporting success here would claim a mark that is not there.
 */
export type ClearOutcome =
  | { ok: true; removed: number }
  | { ok: false; kind: 'partial'; removed: number }
  | { ok: false; kind: 'no-trace'; removed: number }

/** What a trace keeps about one removed attempt: facts, never content. */
function summarize(session: AttackSession): Extract<ActivityTraceDetail, { kind: 'removed' }>['removed'][number] {
  return { startedAt: session.startedAt, solved: session.solvedAt !== null }
}

export function useAttackLogDeletion() {
  const { listAttackSessions, deleteAttackSession, saveActivityTrace } = useChallengePersistence()

  /**
   * Remove every stored attempt at one challenge except the one in progress.
   *
   * `currentSessionId` is required, not optional. The attempt in progress is held in a
   * variable inside the session composable, so removing its row leaves that variable
   * pointing at it and the next event appended writes the whole record back — the
   * removal silently does not happen. A caller that forgets to name it would produce
   * exactly that, and an optional parameter is how callers forget.
   *
   * The trace is written after the removals and describes what actually went, so a
   * removal that stops part way is recorded as what happened rather than as what was
   * attempted. Nothing is removed when there is nothing to remove, and no empty trace
   * is written for it.
   */
  async function clearChallenge(challengeSlug: string, currentSessionId: string): Promise<ClearOutcome> {
    const doomed = (await listAttackSessions(challengeSlug))
      .filter(session => session.sessionId !== currentSessionId)

    const removed: Extract<ActivityTraceDetail, { kind: 'removed' }>['removed'] = []
    let stoppedEarly = false
    for (const session of doomed) {
      try {
        await deleteAttackSession(session.sessionId)
      } catch {
        stoppedEarly = true
        break
      }
      removed.push(summarize(session))
    }

    // Nothing removed means nothing to record: an empty trace would put a line on the
    // learner's screen saying a removal happened when none did. This is also the whole
    // of the "nothing to remove" case — an early return above it would be a second
    // guard on the same condition.
    if (removed.length > 0) {
      try {
        await saveActivityTrace(challengeSlug, { kind: 'removed', removed })
      } catch {
        return { ok: false, kind: 'no-trace', removed: removed.length }
      }
    }

    return stoppedEarly
      ? { ok: false, kind: 'partial', removed: removed.length }
      : { ok: true, removed: removed.length }
  }

  return { clearChallenge }
}

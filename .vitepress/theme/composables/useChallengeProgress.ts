import { ref, readonly, watch, getCurrentScope, onScopeDispose, type Ref } from 'vue'
import { useChallengePersistence } from './useChallengePersistence'
import { useProgressAccess } from './useSessionGate'

/** Per-surface progress, released only after the stored-work decision. */
export function useChallengeProgress() {
  const completedSlugs = ref<Set<string>>(new Set())
  const settled = ref(false)
  const failed = ref(false)
  const access = useProgressAccess()
  let started = false
  let disposed = false
  let generation = 0

  async function load(): Promise<void> {
    if (disposed) return
    started = true
    const request = ++generation
    completedSlugs.value = new Set()
    settled.value = false
    failed.value = false
    if (!access.value) return
    const current = () => !disposed && request === generation && access.value
    try {
      const records = await useChallengePersistence().listAllProgress()
      if (current()) completedSlugs.value = new Set(
        records.filter(r => r.firstCompletedAt !== null).map(r => r.challengeSlug),
      )
    } catch {
      if (current()) failed.value = true
    } finally {
      if (current()) settled.value = true
    }
  }

  const stop = watch(access, () => { if (started) void load() }, { flush: 'sync' })
  if (getCurrentScope()) onScopeDispose(() => { disposed = true; generation++; stop() })

  return {
    completedSlugs: readonly(completedSlugs) as Readonly<Ref<ReadonlySet<string>>>,
    settled: readonly(settled) as Readonly<Ref<boolean>>,
    failed: readonly(failed),
    load,
  }
}

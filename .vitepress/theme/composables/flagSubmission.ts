import { ref } from 'vue'

export interface FlagSubmissionResult {
  correct: boolean
  saved: boolean
}

/** One controller per challenge page, shared by its expanded and collapsed entry points. */
export function useFlagSubmission(verify: (flag: string) => Promise<FlagSubmissionResult>) {
  const state = ref<'idle' | 'success' | 'failure' | 'error'>('idle')
  const pending = ref(false)
  const saved = ref<boolean | null>(null)

  async function submit(flag: string) {
    if (pending.value) return
    pending.value = true
    state.value = 'idle'
    saved.value = null
    try {
      const result = await verify(flag)
      state.value = result.correct ? 'success' : 'failure'
      saved.value = result.saved
    } catch {
      state.value = 'error'
    } finally {
      pending.value = false
    }
  }
  return { state, pending, saved, submit }
}

/** Verification and storage answer different questions; a storage error cannot change the answer. */
export async function submitFlag(
  submitted: string,
  verify: ((bytes: Uint8Array) => boolean) | null,
  record: (submitted: string, correct: boolean) => Promise<void>,
): Promise<FlagSubmissionResult> {
  if (!verify) throw new Error('Flag verifier is not ready')
  const correct = verify(new TextEncoder().encode(submitted))
  try {
    await record(submitted, correct)
    return { correct, saved: true }
  } catch {
    // The session write can succeed before progress fails. Do not claim rollback.
    return { correct, saved: false }
  }
}

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFlagSubmission, type FlagSubmissionResult } from '../composables/flagSubmission'
import type { ProgressBlockReason } from '../composables/useSessionGate'

const props = defineProps<{
  verify: (flag: string) => Promise<FlagSubmissionResult>
  blocked?: boolean
  /**
   * Why submission is unavailable, when the caller knows.
   *
   * Optional, and absent means `'undecided'`: a caller that does not distinguish the two
   * gets the sentence that asks the learner to answer, which is what this surface said
   * before the distinction existed. Only `'checking'` changes the wording, and it never
   * changes whether the button is disabled — that stays bound to `blocked`.
   */
  blockReason?: ProgressBlockReason
  submission?: ReturnType<typeof useFlagSubmission>
  onExport?: () => void
  onExportNotes?: () => void
}>()

const blockedMessageKey = computed(() =>
  props.blockReason === 'checking' ? 'flag_submission.checking' : 'flag_submission.awaiting_decision',
)

const flag = ref('')
const { state, pending, saved, submit: send } = props.submission ?? useFlagSubmission(value => props.verify(value))

async function submit() {
  if (props.blocked) return
  await send(flag.value)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex gap-2">
      <input
        data-flag-input
        v-model="flag"
        :disabled="pending || props.blocked"
        type="text"
        placeholder="CTF{...}"
        class="flex-1 px-3 py-2 rounded border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-1)] font-mono text-[0.9em] outline-none focus:border-[var(--ch-accent)]"
      />
      <button
        data-submit
        :disabled="pending || props.blocked"
        :aria-busy="pending"
        class="px-4 py-2 rounded bg-[var(--ch-accent)] color-white text-[0.9em] font-medium cursor-pointer border-none hover:opacity-90"
        @click="submit"
      >{{ $t('flag_submission.submit') }}</button>
    </div>

    <div v-if="props.blocked" data-progress-blocked role="status">{{ $t(blockedMessageKey) }}</div>
    <div v-if="pending" data-pending role="status">{{ $t('flag_submission.pending') }}</div>
    <div v-if="state === 'error'" data-verification-error role="alert">{{ $t('flag_submission.verification_error') }}</div>
    <div v-if="saved === false" data-save-error role="alert" class="color-[var(--ch-warn)]">{{ $t('flag_submission.incomplete') }}</div>
    <div v-if="saved === true" data-saved role="status">{{ $t('flag_submission.saved') }}</div>

    <div v-if="props.onExport">
      <button
        v-if="props.onExport"
        data-export
        class="px-3 py-1 rounded text-[0.85em] border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-1)] cursor-pointer hover:border-[var(--ch-accent)]"
        @click="props.onExport?.()"
      >{{ $t('flag_submit.export_attack_log') }}</button>
    </div>

    <div
      v-if="state === 'success'"
      data-success
      class="flex items-center gap-2 px-3 py-2 rounded bg-[var(--ch-easy-bg)] color-[var(--ch-easy-fg)] text-[0.875em] font-medium"
    >
      <span>{{ $t('flag_submission.correct') }}</span>

      <button
        v-if="props.onExportNotes"
        data-export-notes
        class="px-3 py-1 rounded text-[0.85em] border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-1)] cursor-pointer hover:border-[var(--ch-accent)]"
        @click="props.onExportNotes?.()"
      >{{ $t('flag_submit.export_pentest_notes') }}</button>
    </div>
    <div
      v-if="state === 'failure'"
      data-failure
      class="px-3 py-2 rounded bg-[var(--ch-hard-bg)] color-[var(--ch-hard-fg)] text-[0.875em]"
    >
      {{ $t('flag_submission.incorrect') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ImportOutcome } from '../lib/attackLogImport'
import type { ProgressBlockReason } from '../composables/useSessionGate'

const props = defineProps<{
  /**
   * Store the record this text describes, or say why it was not stored.
   *
   * Takes text rather than a `File` so the dialog owns the one thing it is positioned
   * to own — reading what the learner chose — and the caller owns the database.
   */
  run: (text: string) => Promise<ImportOutcome>
  blocked?: boolean
  /**
   * Why importing is unavailable, when the caller knows.
   *
   * Absent means `'undecided'`, matching the flag entry points: a caller that does not
   * distinguish the two gets the sentence that asks the learner to answer.
   */
  blockReason?: ProgressBlockReason
}>()
const emit = defineEmits<{ close: []; imported: [] }>()

const dialog = ref<HTMLDialogElement>()
const chosen = ref<File | null>(null)
const pending = ref(false)
const done = ref(false)
const failure = ref<ImportOutcome | null>(null)

onMounted(() => dialog.value?.showModal())

// The same two message keys the flag entry points read. Sharing the keys rather than
// the wording is what keeps the two controls from disagreeing about the same condition.
const blockedMessageKey = computed(() =>
  props.blockReason === 'checking' ? 'flag_submission.checking' : 'flag_submission.awaiting_decision',
)

function pick(event: Event) {
  chosen.value = (event.target as HTMLInputElement).files?.[0] ?? null
  failure.value = null
}

function cancel() { if (!pending.value) emit('close') }

async function submit() {
  // Blocked is checked here and not only on the control: the form can be submitted with
  // Enter, and a disabled fieldset is a rendering fact rather than a rule.
  if (pending.value || props.blocked || !chosen.value) return
  pending.value = true
  failure.value = null
  try {
    const outcome = await props.run(await chosen.value.text())
    if (outcome.ok) {
      done.value = true
      emit('imported')
    } else {
      failure.value = outcome
    }
  } catch {
    failure.value = { ok: false, kind: 'write-failed' }
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <dialog ref="dialog" aria-labelledby="attack-import-title" @cancel.prevent="cancel">
    <form @submit.prevent="submit">
      <h2 id="attack-import-title">{{ $t('attack_log_import.title') }}</h2>
      <fieldset :disabled="pending || blocked || done">
        <label>{{ $t('attack_log_import.choose') }}
          <input type="file" accept="application/json,.json" data-import-file @change="pick" />
        </label>
        <p>{{ $t('attack_log_import.hint') }}</p>
        <p>{{ $t('attack_log_import.carry_on') }}</p>
        <div class="actions">
          <button type="button" data-import-cancel @click="cancel">{{ $t('attack_log_import.cancel') }}</button>
          <button type="submit" data-import-confirm>{{ pending ? $t('attack_log_import.pending') : $t('attack_log_import.submit') }}</button>
        </div>
      </fieldset>
      <p v-if="blocked" data-import-blocked>{{ $t(blockedMessageKey) }}</p>
      <p v-if="done" role="status" data-import-done>{{ $t('attack_log_import.added') }}</p>
      <div v-if="done" class="actions">
        <button type="button" data-import-close @click="emit('close')">{{ $t('attack_log_import.close') }}</button>
      </div>
      <p v-if="failure && !failure.ok" role="alert">
        <template v-if="failure.kind === 'unparseable'">{{ $t('attack_log_import.error_unparseable') }}</template>
        <template v-else-if="failure.kind === 'invalid'">{{ $t('attack_log_import.error_invalid', { reason: failure.reason }) }}</template>
        <template v-else-if="failure.kind === 'wrong-challenge'">{{ $t('attack_log_import.error_wrong_challenge', { file: failure.fileSlug, open: failure.openSlug }) }}</template>
        <template v-else>{{ $t('attack_log_import.error_write') }}</template>
      </p>
    </form>
  </dialog>
</template>
<style scoped>
dialog { margin: auto; width: min(92vw, 480px); max-height: 90vh; overflow: auto; padding: 24px; border: 1px solid var(--ch-border); border-radius: 12px; color: var(--ch-text); background: var(--ch-bg); }
dialog::backdrop { background: #0008; }
h2 { font-size: 1.2rem; margin: 0 0 16px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
label { display: flex; flex-direction: column; gap: 6px; margin: 12px 0; }
input { width: 100%; padding: 6px; border: 1px solid var(--ch-border); border-radius: 4px; background: var(--ch-bg); }
p { font-size: 0.85rem; margin: 12px 0; }
.actions { display: flex; justify-content: flex-end; gap: 12px; }
button { border: 1px solid var(--ch-border); border-radius: 4px; padding: 6px 16px; }
button:disabled { opacity: .5; }
</style>

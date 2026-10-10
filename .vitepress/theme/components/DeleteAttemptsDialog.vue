<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ClearOutcome } from '../composables/useAttackLogDeletion'

const props = defineProps<{
  /** How many attempts the removal will take. Shown before it becomes irreversible. */
  count: number
  run: () => Promise<ClearOutcome>
}>()
const emit = defineEmits<{ close: []; cleared: [] }>()

const dialog = ref<HTMLDialogElement>()
const pending = ref(false)
const outcome = ref<ClearOutcome | null>(null)

onMounted(() => dialog.value?.showModal())

function cancel() { if (!pending.value) emit('close') }

async function submit() {
  if (pending.value || outcome.value) return
  pending.value = true
  try {
    const result = await props.run()
    outcome.value = result
    // Emitted on anything actually removed, not on success. A removal that stopped part
    // way still changed what is stored, and a page that only reloads its list on the
    // clean outcome would keep showing records that are no longer there.
    if (result.removed > 0) emit('cleared')
  } catch {
    // A removal that threw is a removal that did not finish, and the caller cannot say
    // how much of it happened. Reporting it as the partial case is the honest reading:
    // it tells the learner to look again rather than to assume either extreme.
    outcome.value = { ok: false, kind: 'partial', removed: 0 }
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <dialog ref="dialog" aria-labelledby="attack-delete-title" @cancel.prevent="cancel">
    <form @submit.prevent="submit">
      <h2 id="attack-delete-title">{{ $t('attack_log_deletion.title') }}</h2>
      <template v-if="!outcome">
        <fieldset :disabled="pending">
          <p>{{ $t('attack_log_deletion.confirm_body', { count }) }}</p>
          <p>{{ $t('attack_log_deletion.no_undo') }}</p>
          <p>{{ $t('attack_log_deletion.progress_note') }}</p>
          <div class="actions">
            <button type="button" data-delete-cancel @click="cancel">{{ $t('attack_log_deletion.cancel') }}</button>
            <button type="submit" data-delete-confirm>{{ pending ? $t('attack_log_deletion.pending') : $t('attack_log_deletion.confirm') }}</button>
          </div>
        </fieldset>
      </template>
      <template v-else>
        <p v-if="outcome.ok" role="status" data-delete-done>{{ $t('attack_log_deletion.done', { count: outcome.removed }) }}</p>
        <p v-else role="alert">
          {{ outcome.kind === 'partial'
            ? $t('attack_log_deletion.partial', { count: outcome.removed })
            : $t('attack_log_deletion.no_trace', { count: outcome.removed }) }}
        </p>
        <div class="actions">
          <button type="button" data-delete-close @click="emit('close')">{{ $t('attack_log_deletion.close') }}</button>
        </div>
      </template>
    </form>
  </dialog>
</template>
<style scoped>
dialog { margin: auto; width: min(92vw, 440px); padding: 24px; border: 1px solid var(--ch-border); border-radius: 12px; color: var(--ch-text); background: var(--ch-bg); }
dialog::backdrop { background: #0008; }
h2 { font-size: 1.2rem; margin: 0 0 16px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
p { font-size: 0.85rem; margin: 12px 0; }
.actions { display: flex; justify-content: flex-end; gap: 12px; }
button { border: 1px solid var(--ch-border); border-radius: 4px; padding: 6px 16px; }
button:disabled { opacity: .5; }
</style>

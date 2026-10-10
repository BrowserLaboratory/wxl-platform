<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ExportOptions } from '../lib/attackLogExport'
const props = defineProps<{ generate: (options: ExportOptions) => Promise<void> }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const format = ref<ExportOptions['format']>('json')
const mode = ref<ExportOptions['mode']>('full')
const name = ref('')
const className = ref('')
const pending = ref(false)
const failed = ref(false)
onMounted(() => dialog.value?.showModal())
function cancel() { if (!pending.value) emit('close') }
async function submit() {
  if (pending.value) return
  pending.value = true
  failed.value = false
  try {
    await props.generate({ format: format.value, mode: mode.value, identity: { name: name.value, className: className.value } })
    emit('close')
  } catch {
    failed.value = true
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <dialog ref="dialog" aria-labelledby="attack-export-title" @cancel.prevent="cancel">
    <form @submit.prevent="submit">
      <h2 id="attack-export-title">匯出攻擊紀錄</h2>
      <fieldset :disabled="pending">
        <label>格式 <select v-model="format" data-export-format><option value="json">JSON</option><option value="markdown">Markdown</option></select></label>
        <label>內容 <select v-model="mode" data-export-mode><option value="full">完整（full）</option><option value="thinned">精簡（thinned）</option></select></label>
        <p>精簡版省略 HTTP 回應本文與面板檢視事件，保留請求本文、程式碼、筆記、旗標嘗試與草稿。</p>
        <label>姓名（選填）<input v-model="name" maxlength="80" autocomplete="off" data-export-name /></label>
        <label>班級（選填）<input v-model="className" maxlength="80" autocomplete="off" data-export-class /></label>
        <p>姓名與班級各保留前 40 個字，只用於這次匯出的檔案與檔名，不會儲存。</p>
        <p>完整性檢查可比對內容是否與檔內雜湊一致，無法證明作者身分。</p>
        <div class="actions">
          <button type="button" data-export-cancel @click="cancel">取消</button>
          <button type="submit" data-export-confirm>{{ pending ? '準備中…' : '下載' }}</button>
        </div>
      </fieldset>
      <p v-if="failed" role="alert">匯出失敗，請重試。原有紀錄仍保留。</p>
    </form>
  </dialog>
</template>
<style scoped>
dialog { margin: auto; width: min(92vw, 480px); max-height: 90vh; overflow: auto; padding: 24px; border: 1px solid var(--ch-border); border-radius: 12px; color: var(--ch-text); background: var(--ch-bg); }
dialog::backdrop { background: #0008; }
h2 { font-size: 1.2rem; margin: 0 0 16px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
label { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 12px 0; }
input, select { width: 60%; padding: 6px; border: 1px solid var(--ch-border); border-radius: 4px; background: var(--ch-bg); }
p { font-size: 0.85rem; margin: 12px 0; }
.actions { display: flex; justify-content: flex-end; gap: 12px; }
button { border: 1px solid var(--ch-border); border-radius: 4px; padding: 6px 16px; }
button:disabled { opacity: .5; }
[role=alert] { color: var(--vp-c-danger-1); }
</style>

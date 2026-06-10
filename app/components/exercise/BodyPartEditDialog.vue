<script setup lang="ts">
// 部位カテゴリの追加/編集（色＝HEX・カレンダードットの源泉 §9.7）。
import type { BodyPart } from '~/types/db'

const props = defineProps<{ model?: BodyPart | null }>()
const emit = defineEmits<{
  submit: [payload: { name: string; color: string }]
  archive: [id: string]
  close: []
}>()

const isEdit = computed(() => !!props.model)
const name = ref(props.model?.name ?? '')
const color = ref(props.model?.color ?? '#4f8cff')

const HEX_RE = /^#[0-9A-Fa-f]{6}$/
const validColor = computed(() => HEX_RE.test(color.value))
const canSave = computed(() => name.value.trim() !== '' && validColor.value)

function onSubmit() {
  if (!canSave.value) return
  emit('submit', { name: name.value.trim(), color: color.value })
}
</script>

<template>
  <UiModalDialog :title="isEdit ? '部位を編集' : '部位を追加'" @close="emit('close')">
    <form @submit.prevent="onSubmit">
      <label class="field">
        部位名
        <input v-model="name" type="text" required />
      </label>

      <div class="field">
        色（HEX）
        <div class="color-row">
          <input v-model="color" type="color" class="swatch" />
          <input v-model="color" type="text" maxlength="7" placeholder="#4f8cff" />
        </div>
        <small v-if="!validColor" class="error-text">#RRGGBB 形式で入力してください</small>
      </div>

      <div class="btn-row">
        <button v-if="isEdit" type="button" class="btn btn-danger spacer" @click="emit('archive', props.model!.id)">
          アーカイブ
        </button>
        <button type="button" class="btn" @click="emit('close')">キャンセル</button>
        <button type="submit" class="btn btn-primary" :disabled="!canSave">保存</button>
      </div>
    </form>
  </UiModalDialog>
</template>

<style scoped>
.color-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.swatch {
  width: 44px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: none;
}
.color-row input[type='text'] {
  flex: 1;
  padding: 0.55rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 1rem;
}
.error-text {
  margin-top: 0.2rem;
}
</style>

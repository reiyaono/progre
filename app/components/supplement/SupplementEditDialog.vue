<script setup lang="ts">
// サプリ名の追加/編集（名前のみのマスタ）。MethodEditDialog 踏襲。
import type { Supplement } from '~/types/db'

const props = defineProps<{ model?: Supplement | null }>()
const emit = defineEmits<{
  submit: [payload: { name: string }]
  archive: [id: string]
  close: []
}>()

const isEdit = computed(() => !!props.model)
const name = ref(props.model?.name ?? '')
const canSave = computed(() => name.value.trim() !== '')

function onSubmit() {
  if (!canSave.value) return
  emit('submit', { name: name.value.trim() })
}
</script>

<template>
  <UiModalDialog :title="isEdit ? 'サプリを編集' : 'サプリを追加'" @close="emit('close')">
    <form @submit.prevent="onSubmit">
      <label class="field">
        サプリ名
        <input v-model="name" type="text" placeholder="例: クレアチン" required />
      </label>

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

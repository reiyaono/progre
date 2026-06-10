<script setup lang="ts">
// 種目の追加/編集（screens.md §4.4）。部位必須・方法任意・同名は警告のみ（§9.8）。
// 永続化は親（exercises.vue）が composable で行い、本ダイアログは入力に専念。
import type { BodyPart, TrainingMethod, Exercise } from '~/types/db'

const props = defineProps<{
  bodyParts: BodyPart[]
  methods: TrainingMethod[]
  model?: Exercise | null // 指定で編集モード
  defaultBodyPartId?: string | null
  checkDuplicate: (name: string, excludeId?: string) => boolean
}>()

const emit = defineEmits<{
  submit: [payload: { name: string; body_part_id: string; training_method_id: string | null }]
  archive: [id: string]
  close: []
}>()

const isEdit = computed(() => !!props.model)

const name = ref(props.model?.name ?? '')
const bodyPartId = ref<string>(props.model?.body_part_id ?? props.defaultBodyPartId ?? props.bodyParts[0]?.id ?? '')
const methodId = ref<string>(props.model?.training_method_id ?? '')

const duplicate = computed(() => name.value.trim() !== '' && props.checkDuplicate(name.value, props.model?.id))
const canSave = computed(() => name.value.trim() !== '' && bodyPartId.value !== '')

function onSubmit() {
  if (!canSave.value) return
  emit('submit', {
    name: name.value.trim(),
    body_part_id: bodyPartId.value,
    training_method_id: methodId.value || null,
  })
}
</script>

<template>
  <UiModalDialog :title="isEdit ? '種目を編集' : '種目を追加'" @close="emit('close')">
    <form @submit.prevent="onSubmit">
      <label class="field">
        種目名
        <input v-model="name" type="text" required />
      </label>

      <label class="field">
        部位（必須）
        <select v-model="bodyPartId" required>
          <option v-for="b in bodyParts" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </label>

      <label class="field">
        トレーニング方法（任意）
        <select v-model="methodId">
          <option value="">（なし）</option>
          <option v-for="m in methods" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </label>

      <p v-if="duplicate" class="warn">同名の種目が既にあります（登録は可能です）。</p>

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

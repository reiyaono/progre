<script setup lang="ts">
// トレーニング方法の追加/編集。固定カタログから任意のアイコンを設定できる。
import type { TrainingMethod } from '~/types/db'
import { TRAINING_METHOD_ICONS, isTrainingMethodIconKey } from '~/utils/trainingMethodIcon'
import type { TrainingMethodIconKey } from '~/utils/trainingMethodIcon'

const props = defineProps<{
  model?: TrainingMethod | null
  checkDuplicate: (name: string, excludeId?: string) => boolean
}>()
const emit = defineEmits<{
  submit: [payload: { name: string; icon_key: TrainingMethodIconKey | null }]
  archive: [id: string]
  close: []
}>()

const isEdit = computed(() => !!props.model)
const name = ref(props.model?.name ?? '')
const initialIconKey = props.model?.icon_key ?? null
const iconKey = ref<TrainingMethodIconKey | ''>(
  isTrainingMethodIconKey(initialIconKey) ? initialIconKey : '',
)
const duplicate = computed(() => name.value.trim() !== '' && props.checkDuplicate(name.value, props.model?.id))
const canSave = computed(() => name.value.trim() !== '' && !duplicate.value)

function onSubmit() {
  if (!canSave.value) return
  emit('submit', { name: name.value.trim(), icon_key: iconKey.value || null })
}
</script>

<template>
  <UiModalDialog :title="isEdit ? '方法を編集' : '方法を追加'" @close="emit('close')">
    <form @submit.prevent="onSubmit">
      <label class="field">
        方法名
        <input v-model="name" type="text" required />
      </label>
      <small v-if="duplicate" class="error-text">同じ名前のトレーニング方法が既に登録されています。</small>

      <fieldset class="icon-field">
        <legend>アイコン（任意）</legend>
        <div class="icon-options">
          <label class="icon-option" :class="{ selected: iconKey === '' }">
            <input v-model="iconKey" type="radio" value="" />
            <span class="none-icon">なし</span>
          </label>
          <label
            v-for="icon in TRAINING_METHOD_ICONS"
            :key="icon.key"
            class="icon-option"
            :class="{ selected: iconKey === icon.key }"
          >
            <input v-model="iconKey" type="radio" :value="icon.key" />
            <UiTrainingMethodIcon :icon-key="icon.key" :size="26" />
            <span>{{ icon.label }}</span>
          </label>
        </div>
      </fieldset>

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
.icon-field { margin: 0; padding: 0; border: 0; }
.icon-field legend { margin-bottom: 0.4rem; }
.icon-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}
.icon-option {
  min-height: 68px;
  padding: 0.5rem 0.25rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.75rem;
}
.icon-option.selected {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--bg);
}
.icon-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.none-icon {
  min-height: 26px;
  display: flex;
  align-items: center;
}
</style>

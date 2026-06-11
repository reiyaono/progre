<script setup lang="ts">
// サプリ摂取の追加/編集。サプリ選択（必須）＋タイミング選択（任意）＋数量。
// マスタは useSupplementMaster を再利用（load は guarded なので二重取得しない）。
import type { SupplementIntake } from '~/types/db'

const props = defineProps<{ model?: SupplementIntake | null }>()
const emit = defineEmits<{
  submit: [payload: { supplement_id: string; timing_id: string | null; quantity: number }]
  remove: [id: string]
  close: []
}>()

const sm = useSupplementMaster()
const { supplements, timings } = sm
onMounted(() => sm.load())

const isEdit = computed(() => !!props.model)
const supplementId = ref<string>(props.model?.supplement_id ?? '')
const timingId = ref<string>(props.model?.timing_id ?? '') // '' = 指定なし
const quantity = ref<number>(props.model?.quantity ?? 1)

const canSave = computed(() => !!supplementId.value && quantity.value >= 1)

function stepQty(d: number) {
  quantity.value = Math.max(1, Math.min(999, (Number(quantity.value) || 1) + d))
}

function onSubmit() {
  if (!canSave.value) return
  emit('submit', {
    supplement_id: supplementId.value,
    timing_id: timingId.value === '' ? null : timingId.value,
    quantity: Number(quantity.value),
  })
}
</script>

<template>
  <UiModalDialog :title="isEdit ? '摂取を編集' : 'サプリを記録'" @close="emit('close')">
    <form @submit.prevent="onSubmit">
      <label class="field">
        サプリ
        <select v-model="supplementId" required>
          <option value="" disabled>選択してください</option>
          <option v-for="s in supplements" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </label>
      <p v-if="!supplements.length" class="muted">
        サプリが未登録です。「マスタ管理」で追加してください。
      </p>

      <label class="field">
        タイミング（任意）
        <select v-model="timingId">
          <option value="">指定なし</option>
          <option v-for="t in timings" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </label>

      <div class="field">
        <span>数量（粒/回）</span>
        <div class="qty">
          <button type="button" class="btn" @click="stepQty(-1)">−</button>
          <input v-model.number="quantity" type="number" min="1" max="999" inputmode="numeric" />
          <button type="button" class="btn" @click="stepQty(1)">＋</button>
        </div>
      </div>

      <div class="btn-row">
        <button v-if="isEdit" type="button" class="btn btn-danger spacer" @click="emit('remove', props.model!.id)">
          削除
        </button>
        <button type="button" class="btn" @click="emit('close')">キャンセル</button>
        <button type="submit" class="btn btn-primary" :disabled="!canSave">保存</button>
      </div>
    </form>
  </UiModalDialog>
</template>

<style scoped>
.qty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.qty input {
  width: 5rem;
  text-align: center;
}
.muted {
  color: var(--muted);
  font-size: 0.8rem;
  margin: -0.3rem 0 0.6rem;
}
</style>

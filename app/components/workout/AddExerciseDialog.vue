<script setup lang="ts">
// 種目ピッカー（日別→種目追加）。部位タブで絞り、種目タップで親に exerciseId を渡す。
// マスタは useExerciseMaster を再利用（F-03 連携・screens.md §4.2）。
import BodyPartTabs from '~/components/exercise/BodyPartTabs.vue'
import type { BodyPart } from '~/types/db'
import { isTrainingMethodIconKey } from '~/utils/trainingMethodIcon'
import type { TrainingMethodIconKey } from '~/utils/trainingMethodIcon'

const emit = defineEmits<{ pick: [exerciseId: string]; close: [] }>()

const em = useExerciseMaster()
const { bodyParts, selectedBodyPartId, pickerExercises, loading, methodById } = em
onMounted(() => em.load())

// ピッカー内ではタブ追加/編集はしない（選択のみ）
function noop(_?: BodyPart) {}

function methodIcon(id: string | null): TrainingMethodIconKey | null {
  const key = methodById(id)?.icon_key ?? null
  return isTrainingMethodIconKey(key) ? key : null
}
</script>

<template>
  <UiModalDialog title="種目を追加" @close="emit('close')">
    <BodyPartTabs
      :body-parts="bodyParts"
      :selected-id="selectedBodyPartId"
      @select="selectedBodyPartId = $event"
      @add="noop"
      @edit="noop"
    />

    <p v-if="loading" class="muted">読み込み中…</p>
    <ul v-else-if="pickerExercises.length" class="picklist">
      <li v-for="e in pickerExercises" :key="e.id">
        <button type="button" class="pick" @click="emit('pick', e.id)">
          <UiTrainingMethodIcon
            v-if="methodIcon(e.training_method_id)"
            :icon-key="methodIcon(e.training_method_id)!"
            :size="24"
          />
          <span class="exercise-name">{{ e.name }}</span>
          <span v-if="methodById(e.training_method_id)" class="method-name">
            {{ methodById(e.training_method_id)?.name }}
          </span>
        </button>
      </li>
    </ul>
    <p v-else class="muted">この部位の種目がありません。種目マスタで追加してください。</p>
  </UiModalDialog>
</template>

<style scoped>
.picklist {
  list-style: none;
  margin: 0.8rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 50vh;
  overflow-y: auto;
}
.pick {
  width: 100%;
  text-align: left;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  cursor: pointer;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
}
.exercise-name {
  min-width: 0;
  flex: 1;
}
.method-name {
  color: var(--muted);
  font-size: 0.75rem;
}
.muted {
  color: var(--muted);
  margin: 0.8rem 0 0;
}
</style>

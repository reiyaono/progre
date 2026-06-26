<script setup lang="ts">
// 種目ピッカー（日別→種目追加）。部位タブで絞り、種目タップで親に exerciseId を渡す。
// マスタは useExerciseMaster を再利用（F-03 連携・screens.md §4.2）。
import BodyPartTabs from '~/components/exercise/BodyPartTabs.vue'
import type { BodyPart } from '~/types/db'

const emit = defineEmits<{ pick: [exerciseId: string]; close: [] }>()

const em = useExerciseMaster()
const { bodyParts, selectedBodyPartId, pickerExercises, loading } = em
onMounted(() => em.load())

// ピッカー内ではタブ追加/編集はしない（選択のみ）
function noop(_?: BodyPart) {}
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
        <button type="button" class="pick" @click="emit('pick', e.id)">{{ e.name }}</button>
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
}
.muted {
  color: var(--muted);
  margin: 0.8rem 0 0;
}
</style>

<script setup lang="ts">
// 選択部位の種目一覧。タップで編集。空状態は「種目を追加」導線（screens.md §4.4）。
import type { Exercise, TrainingMethod } from '~/types/db'

defineProps<{
  exercises: Exercise[]
  methodById: (id: string | null) => TrainingMethod | null
}>()
const emit = defineEmits<{ edit: [exercise: Exercise]; add: [] }>()
</script>

<template>
  <div>
    <ul v-if="exercises.length" class="list">
      <li v-for="e in exercises" :key="e.id">
        <button type="button" class="row" @click="emit('edit', e)">
          <span class="name">{{ e.name }}</span>
          <span v-if="methodById(e.training_method_id)" class="method">
            {{ methodById(e.training_method_id)?.name }}
          </span>
        </button>
      </li>
    </ul>

    <div v-else class="empty">
      <p>この部位の種目はまだありません。</p>
      <button type="button" class="btn btn-primary" @click="emit('add')">種目を追加</button>
    </div>
  </div>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;
  text-align: left;
}
.name {
  font-size: 0.95rem;
}
.method {
  font-size: 0.75rem;
  color: var(--muted);
  background: var(--bg);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
}
.empty {
  text-align: center;
  color: var(--muted);
  padding: 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}
</style>

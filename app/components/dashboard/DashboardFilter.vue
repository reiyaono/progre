<script setup lang="ts">
// ダッシュボードのフィルタUI（期間/部位/種目）。状態は親(useDashboardFilter)が保持し v-model で連携。
import type { BodyPart, Exercise } from '~/types/db'
import type { DashboardFilter } from '~/composables/useDashboardFilter'

const props = defineProps<{
  modelValue: DashboardFilter
  bodyParts: BodyPart[]
  exercises: Exercise[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: DashboardFilter] }>()

const WEEK_OPTIONS = [4, 8, 12, 24]

function patch(part: Partial<DashboardFilter>) {
  emit('update:modelValue', { ...props.modelValue, ...part })
}
</script>

<template>
  <div class="filter">
    <label class="f">
      期間
      <select
        :value="modelValue.weeks"
        @change="patch({ weeks: Number(($event.target as HTMLSelectElement).value) })"
      >
        <option v-for="w in WEEK_OPTIONS" :key="w" :value="w">直近{{ w }}週</option>
      </select>
    </label>

    <label class="f">
      部位
      <select
        :value="modelValue.bodyPartId ?? ''"
        @change="patch({ bodyPartId: ($event.target as HTMLSelectElement).value || null })"
      >
        <option value="">すべて</option>
        <option v-for="b in bodyParts" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
    </label>

    <label class="f">
      種目
      <select
        :value="modelValue.exerciseId ?? ''"
        @change="patch({ exerciseId: ($event.target as HTMLSelectElement).value || null })"
      >
        <option value="">すべて</option>
        <option v-for="e in exercises" :key="e.id" :value="e.id">{{ e.name }}</option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.f {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--muted);
  flex: 1;
  min-width: 90px;
}
select {
  padding: 0.45rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.9rem;
  background: var(--surface);
  color: var(--text);
}
</style>

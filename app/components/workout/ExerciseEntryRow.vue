<script setup lang="ts">
// 日別画面の種目エントリ1行（SS9準拠）。部位色・種目名・トップセット・ボリューム・メモ要約。
// タップでセット記録へ。削除ボタンあり。
import type { DayEntry } from '#shared/types/api'

defineProps<{ entry: DayEntry }>()
const emit = defineEmits<{ open: []; delete: [] }>()
</script>

<template>
  <div class="entry">
    <button type="button" class="main" @click="emit('open')">
      <span class="dot" :style="{ background: entry.bodyPartColor }" />
      <span class="body">
        <span class="name">{{ entry.exerciseName }}</span>
        <span class="stats">
          <template v-if="entry.measureType === 'cardio'">
            <template v-if="entry.setCount > 0">
              合計 {{ Math.round((entry.durationSec ?? 0) / 60) }}分・{{ entry.setCount }}セット
            </template>
            <template v-else>未記録</template>
          </template>
          <template v-else-if="entry.measureType === 'bodyweight'">
            <template v-if="entry.setCount > 0">
              最高 {{ entry.topReps ?? 0 }}回・{{ entry.setCount }}セット
            </template>
            <template v-else>未記録</template>
          </template>
          <template v-else-if="entry.topSet">
            トップ {{ Number(entry.topSet.weight) }}kg × {{ entry.topSet.reps }}
            ・{{ entry.setCount }}セット・ボリューム {{ entry.volume }}
          </template>
          <template v-else>セット未記録</template>
        </span>
        <span v-if="entry.memo" class="memo">📝 {{ entry.memo }}</span>
      </span>
      <span class="chevron" aria-hidden="true">›</span>
    </button>
    <button type="button" class="del" aria-label="種目を削除" @click="emit('delete')">削除</button>
  </div>
</template>

<style scoped>
.entry {
  display: flex;
  align-items: stretch;
  gap: 0.4rem;
}
.main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;
  text-align: left;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.name {
  font-size: 0.98rem;
  font-weight: 600;
}
.stats {
  font-size: 0.78rem;
  color: var(--muted);
}
.memo {
  font-size: 0.75rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chevron {
  color: var(--muted);
  font-size: 1.2rem;
}
.del {
  flex: 0 0 auto;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--danger);
  border-radius: 10px;
  padding: 0 0.7rem;
  font-size: 0.8rem;
  cursor: pointer;
}
</style>

<script setup lang="ts">
// カレンダーで選択した日の「メニュー」をインライン表示（読み取り専用プレビュー）。
// 種目名・セット数・サマリを並べ、行/ボタンのタップで日別詳細へ。
// データは日別と同じ /api/day/[date]（measureType で表示出し分け）。
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import { formatJst } from '~/utils/date'
import type { DayResponse } from '#shared/types/api'

const props = defineProps<{ date: string }>()
const emit = defineEmits<{ open: [] }>() // 日別詳細へ遷移（親がルーティング）

// 選択日が変わるたび取得。lazy でカレンダー操作をブロックしない。
const { data, pending } = useFetch<DayResponse>(() => `/api/day/${props.date}`, {
  watch: [() => props.date],
  lazy: true,
  default: () => ({ workoutId: null, place: null, entries: [] }),
})
const entries = computed(() => data.value?.entries ?? [])
const place = computed(() => data.value?.place ?? null)
</script>

<template>
  <div class="preview">
    <!-- 見出し: 日付＋詳細リンク -->
    <button type="button" class="preview-head" @click="emit('open')">
      <span class="date">{{ formatJst(date) }}</span>
      <span v-if="place" class="place">📍 {{ place }}</span>
      <span class="to-detail">詳細 ›</span>
    </button>

    <LoadingSpinner v-if="pending && !entries.length" />

    <!-- 種目リスト（読み取り専用。タップで詳細へ） -->
    <div v-else-if="entries.length" class="list">
      <button
        v-for="e in entries"
        :key="e.workoutExerciseId"
        type="button"
        class="row"
        @click="emit('open')"
      >
        <span class="bar" :style="{ background: e.bodyPartColor }" />
        <span class="body">
          <span class="name">{{ e.exerciseName }}</span>
          <span class="stats">
            <template v-if="e.measureType === 'cardio'">
              <template v-if="e.setCount > 0">
                合計 {{ Math.round((e.durationSec ?? 0) / 60) }}分・{{ e.setCount }}セット
              </template>
              <template v-else>未記録</template>
            </template>
            <template v-else-if="e.measureType === 'bodyweight'">
              <template v-if="e.setCount > 0">
                最高 {{ e.topReps ?? 0 }}回・{{ e.setCount }}セット
              </template>
              <template v-else>未記録</template>
            </template>
            <template v-else-if="e.topSet">
              トップ {{ Number(e.topSet.weight) }}kg × {{ e.topSet.reps }}
              ・{{ e.setCount }}セット・ボリューム {{ e.volume }}
            </template>
            <template v-else>セット未記録</template>
          </span>
        </span>
        <span class="chevron" aria-hidden="true">›</span>
      </button>
    </div>

    <!-- 記録なし -->
    <button v-else type="button" class="empty" @click="emit('open')">
      この日の記録はありません。タップして追加 ›
    </button>
  </div>
</template>

<style scoped>
.preview {
  margin-top: 0.75rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 見出し（日付＋詳細リンク） */
.preview-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: transparent;
  border: none;
  padding: 0.1rem 0.1rem 0.4rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  color: var(--text);
  font-family: inherit;
  text-align: left;
}
.date {
  font-size: 1rem;
  font-weight: 700;
}
.place {
  font-size: 0.78rem;
  color: var(--muted);
}
.to-detail {
  margin-left: auto;
  font-size: 0.82rem;
  color: var(--accent);
  font-weight: 600;
  flex-shrink: 0;
}

/* 種目リスト */
.list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.55rem 0.4rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text);
  font-family: inherit;
  text-align: left;
}
.row:active {
  background: var(--bg);
}
.bar {
  width: 4px;
  align-self: stretch;
  min-height: 28px;
  border-radius: 2px;
  flex: 0 0 auto;
}
.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.name {
  font-size: 0.95rem;
  font-weight: 600;
}
.stats {
  font-size: 0.76rem;
  color: var(--muted);
}
.chevron {
  color: var(--muted);
  font-size: 1.15rem;
  flex-shrink: 0;
}

/* 記録なし */
.empty {
  width: 100%;
  background: transparent;
  border: none;
  padding: 0.8rem 0.4rem;
  color: var(--muted);
  font-size: 0.85rem;
  text-align: center;
  cursor: pointer;
  font-family: inherit;
}
</style>

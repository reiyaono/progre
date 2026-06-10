<script setup lang="ts">
// セット記録の1行表示コンポーネント。編集・削除イベントを親へ委譲する。

defineProps<{
  set: {
    set_no: number
    weight: number
    reps: number
    interval_sec: number | null
  }
}>()

const emit = defineEmits<{ edit: []; delete: [] }>()
</script>

<template>
  <div class="set-row">
    <!-- 左側: セット番号・重量×回数・インターバル -->
    <div class="info">
      <span class="set-no">{{ set.set_no }}セット</span>
      <span class="volume">{{ Number(set.weight) }}kg × {{ set.reps }}回</span>
      <span v-if="set.interval_sec !== null" class="interval">
        休 {{ set.interval_sec }}秒
      </span>
    </div>

    <!-- 右側: 編集・削除ボタン -->
    <div class="actions">
      <button type="button" class="btn" @click="emit('edit')">編集</button>
      <button type="button" class="btn btn-danger" @click="emit('delete')">削除</button>
    </div>
  </div>
</template>

<style scoped>
.set-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem 0.9rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.info {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.4rem 0.6rem;
}

/* セット番号: 控えめな見出し */
.set-no {
  font-size: 0.78rem;
  color: var(--muted);
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* 重量×回数: 主情報として大きく */
.volume {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
}

/* インターバル: 補足情報として控えめに */
.interval {
  font-size: 0.78rem;
  color: var(--muted);
}

.actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}
</style>

<script setup lang="ts">
// セット記録画面上部に前回トップセットと全期間自己ベストを表示するバッジ（§9.4 前回比較）
import { formatJst } from '~/utils/date'

defineProps<{
  /** 前回（この日より前）のトップセット。無ければ null */
  lastTopSet: { date: string; weight: number; reps: number } | null
  /** 全期間の自己ベスト重量(kg)。無ければ null */
  bestWeight: number | null
}>()
</script>

<template>
  <div class="badge-row">
    <!-- 前回トップセット -->
    <span v-if="lastTopSet" class="chip">
      <span class="label">前回:</span>
      {{ Number(lastTopSet.weight) }}kg × {{ lastTopSet.reps }}
      <span class="date">（{{ formatJst(lastTopSet.date) }}）</span>
    </span>
    <span v-else class="chip chip--muted">前回記録なし</span>

    <!-- 自己ベスト重量（null のとき非表示） -->
    <span v-if="bestWeight !== null" class="chip chip--accent">
      <span class="label">自己ベスト:</span>
      {{ Number(bestWeight) }}kg
    </span>
  </div>
</template>

<style scoped>
/* バッジ全体: 横並び・モバイルで折り返し */
.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* 共通チップ */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.65rem;
  font-size: 0.8rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
  white-space: nowrap;
}

/* ラベル文字（"前回:" など） */
.chip .label {
  color: var(--muted);
  font-size: 0.75rem;
}

/* 日付部分 */
.chip .date {
  color: var(--muted);
}

/* 前回記録なし: 全体をミュートカラーに */
.chip--muted {
  color: var(--muted);
}

/* 自己ベスト: アクセントカラーで強調 */
.chip--accent {
  border-color: var(--accent);
  color: var(--accent);
}
.chip--accent .label {
  color: var(--accent);
  opacity: 0.75;
}
</style>

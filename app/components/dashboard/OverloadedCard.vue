<script setup lang="ts">
// 1部位ぶんのオーバーロード達成カード（ダッシュボード §9.2）
import type { OverloadedRow } from '#shared/types/api'

defineProps<{ row: OverloadedRow }>()
</script>

<template>
  <div class="card">
    <!-- 上部: 部位色ドット + 部位名 -->
    <div class="header">
      <span class="dot" :style="{ background: row.bodyPartColor }" />
      <span class="part-name">{{ row.bodyPartName }}</span>
    </div>

    <!-- バッジ -->
    <div v-if="row.isNew" class="badge badge-new">New（比較対象なし）</div>
    <div v-else-if="row.achieved" class="badge badge-achieved">OVERLOADED</div>

    <!-- 中段: ボリューム -->
    <div class="volumes">
      <span class="vol-item">
        今週 <strong>{{ Number(row.thisVolume) }}</strong>
      </span>
      <span class="sep">/</span>
      <span class="vol-item muted">
        先週
        <strong>{{ row.prevVolume !== null ? Number(row.prevVolume) : '—' }}</strong>
      </span>
    </div>

    <!-- 前週比（diff があるときのみ） -->
    <div v-if="row.diff !== null" class="diff" :class="Number(row.diff) >= 0 ? 'diff-pos' : 'diff-neg'">
      {{ Number(row.diff) >= 0 ? `(+${Number(row.diff)})` : `(${Number(row.diff)})` }}
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

/* 上部 */
.header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.part-name {
  font-weight: 700;
  font-size: 0.95rem;
}

/* バッジ */
.badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  align-self: flex-start;
}
.badge-new {
  background: var(--bg);
  color: var(--muted);
  border: 1px solid var(--border);
}
.badge-achieved {
  background: var(--accent);
  color: #fff;
}

/* ボリューム行 */
.volumes {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-size: 0.9rem;
}
.sep {
  color: var(--border);
}
.muted {
  color: var(--muted);
}

/* 前週比 */
.diff {
  font-size: 0.78rem;
  align-self: flex-start;
}
.diff-pos {
  color: var(--accent);
}
.diff-neg {
  color: var(--danger);
}
</style>

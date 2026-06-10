<script setup lang="ts">
// 汎用ローディング表示（CSSスピナー＋任意ラベル）。DB取得中の中継表示に使う。
withDefaults(defineProps<{ label?: string }>(), { label: '読み込み中…' })
</script>

<template>
  <div class="loading" role="status" aria-live="polite">
    <span class="spinner" aria-hidden="true" />
    <span v-if="label" class="label">{{ label }}</span>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1.5rem 0;
  color: var(--muted);
}
.spinner {
  width: 26px;
  height: 26px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.label {
  font-size: 0.85rem;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 2s;
  }
}
</style>

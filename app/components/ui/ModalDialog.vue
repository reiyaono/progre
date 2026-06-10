<script setup lang="ts">
// 汎用モーダル（オーバーレイ＋カード）。各編集ダイアログの土台。
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <header class="modal-head">
        <h2>{{ title }}</h2>
        <button class="x" type="button" aria-label="閉じる" @click="emit('close')">×</button>
      </header>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: grid;
  place-items: center;
  padding: 1rem;
  z-index: 50;
}
.modal {
  width: 100%;
  max-width: 380px;
  background: var(--surface);
  border-radius: 12px;
  border: 1px solid var(--border);
  overflow: hidden;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}
.modal-head h2 {
  margin: 0;
  font-size: 1rem;
}
.x {
  border: 0;
  background: transparent;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: var(--muted);
}
.modal-body {
  padding: 1rem;
}
</style>

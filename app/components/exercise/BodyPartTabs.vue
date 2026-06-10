<script setup lang="ts">
// 部位タブ（横スクロール）。色ドット＋名前。選択中はハイライト。
// 末尾に「＋」で部位追加、選択中タブに「✎」で部位編集。
import type { BodyPart } from '~/types/db'

defineProps<{ bodyParts: BodyPart[]; selectedId: string | null }>()
const emit = defineEmits<{
  select: [id: string]
  add: []
  edit: [bodyPart: BodyPart]
}>()
</script>

<template>
  <div class="tabs">
    <div class="tab-scroll">
      <button
        v-for="b in bodyParts"
        :key="b.id"
        type="button"
        class="tab"
        :class="{ active: b.id === selectedId }"
        @click="emit('select', b.id)"
      >
        <span class="dot" :style="{ background: b.color }" />
        <span class="tab-name">{{ b.name }}</span>
        <span
          v-if="b.id === selectedId"
          class="edit"
          role="button"
          aria-label="部位を編集"
          @click.stop="emit('edit', b)"
        >✎</span>
      </button>
    </div>
    <button type="button" class="add-tab" aria-label="部位を追加" @click="emit('add')">＋</button>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.tab-scroll {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.2rem;
  flex: 1;
}
.tab {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}
.tab.active {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.edit {
  font-size: 0.85rem;
  color: var(--muted);
  cursor: pointer;
}
.add-tab {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border: 1px dashed var(--border);
  border-radius: 50%;
  background: var(--surface);
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--muted);
}
</style>

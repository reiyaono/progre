<script setup lang="ts">
import type { TrainingMethodIconKey } from '~/utils/trainingMethodIcon'

defineProps<{ iconKey: TrainingMethodIconKey; size?: number }>()
</script>

<template>
  <svg
    class="method-icon"
    :width="size ?? 22"
    :height="size ?? 22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="iconKey === 'bodyweight'">
      <circle cx="8" cy="5" r="2" />
      <path d="m7 8 4 3 4-1M10 10l-2 5-4 4M9 15l5 1 4 3" />
    </template>
    <template v-else-if="iconKey === 'machine'">
      <path d="M5 21V3h14v18M8 6h3v7H8zM15 6v8M12 10h6M12 14h6M8 17h8" />
    </template>
    <template v-else-if="iconKey === 'free_weight'">
      <path d="m3 10 3-3M3 14l7-7M14 17l7-7M18 17l3-3M7 7l10 10M5 9l10 10M9 5l10 10" />
    </template>
    <template v-else-if="iconKey === 'cardio'">
      <circle cx="14" cy="4.5" r="2" />
      <path d="m12 8-3 4 4 2 2 5M12 8l4 3 3-1M9 12l-4 6M13 14l-4 5" />
    </template>
    <template v-else>
      <path d="m13 2-8 12h7l-1 8 8-12h-7z" />
    </template>
  </svg>
</template>

<style scoped>
.method-icon { display: block; flex: 0 0 auto; }
</style>

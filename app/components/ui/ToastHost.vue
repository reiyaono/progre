<script setup lang="ts">
// トースト表示ホスト。default レイアウトに常設し、useToast のキューを画面下に重ねる。
// タップで即時消去。種別で色分け（success/error/info）。
const { toasts, dismiss } = useToast()

const ICONS = { success: '✓', error: '✕', info: 'ℹ' } as const
</script>

<template>
  <div class="toast-host" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <button
        v-for="t in toasts"
        :key="t.id"
        type="button"
        class="toast"
        :class="`toast--${t.type}`"
        @click="dismiss(t.id)"
      >
        <span class="ic" aria-hidden="true">{{ ICONS[t.type] }}</span>
        <span class="msg">{{ t.message }}</span>
      </button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 4.5rem); /* ボトムナビの上 */
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0 1rem;
  pointer-events: none; /* ホスト自体はクリック透過。各トーストのみ受ける */
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 92vw;
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.9rem;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
}

.ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  flex: 0 0 auto;
}
.toast--success .ic {
  background: #2e9e5b;
}
.toast--error .ic {
  background: var(--danger);
}
.toast--info .ic {
  background: var(--accent);
}

.toast--success {
  border-color: #2e9e5b;
}
.toast--error {
  border-color: var(--danger);
}

.msg {
  line-height: 1.3;
}

/* 出入りアニメーション */
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>

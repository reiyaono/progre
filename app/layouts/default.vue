<script setup lang="ts">
// 共通レイアウト（screens.md §5）。上部ヘッダ＋下部ボトムナビ。
// スマホ前提のため主要導線はボトムナビに置く。
import ToastHost from '~/components/ui/ToastHost.vue'

const { logout } = useAuth()
const { toggle } = useTheme()

const navItems = [
  { to: '/', label: 'カレンダー', icon: '📅' },
  { to: '/exercises', label: '種目', icon: '🏋️' },
  { to: '/supplements', label: 'サプリ', icon: '💊' },
  { to: '/dashboard', label: '分析', icon: '📈' },
]

async function onLogout() {
  await logout()
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <span class="brand">PROGRE</span>
      <div class="actions">
        <button class="icon-btn" type="button" aria-label="テーマ切替" @click="toggle">
          <span class="i-moon">🌙</span><span class="i-sun">☀️</span>
        </button>
        <button class="logout" type="button" @click="onLogout">ログアウト</button>
      </div>
    </header>

    <main class="app-main">
      <slot />
    </main>

    <nav class="bottom-nav">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-item"
      >
        <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <!-- トースト通知（操作の成否表示） -->
    <ToastHost />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border, #e2e2e2);
  background: var(--surface, #fff);
}
.brand {
  font-weight: 700;
  letter-spacing: 0.04em;
}
.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.icon-btn {
  border: 1px solid var(--border, #ccc);
  background: transparent;
  border-radius: 8px;
  padding: 0.3rem 0.55rem;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
}
/* アイコンは data-theme に応じCSSで切替（SSR静的化＝ハイドレーション不一致回避） */
.i-sun {
  display: none;
}
:root[data-theme='dark'] .i-moon {
  display: none;
}
:root[data-theme='dark'] .i-sun {
  display: inline;
}
.logout {
  border: 1px solid var(--border, #ccc);
  background: transparent;
  color: var(--text);
  border-radius: 8px;
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
  cursor: pointer;
}
.app-main {
  flex: 1;
  padding: 1rem;
  padding-bottom: 5rem; /* ボトムナビ分の余白 */
}
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  border-top: 1px solid var(--border, #e2e2e2);
  background: var(--surface, #fff);
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.55rem 0;
  text-decoration: none;
  color: var(--muted, #777);
  font-size: 0.7rem;
}
.nav-item.router-link-exact-active {
  color: var(--accent, #1f6feb);
  font-weight: 600;
}
.nav-icon {
  font-size: 1.2rem;
}
</style>

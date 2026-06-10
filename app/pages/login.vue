<script setup lang="ts">
// ログイン（F-01 / §9.3）。ナビ無しの素のレイアウト。
definePageMeta({ layout: 'auth' })

const { login } = useAuth()

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

async function onSubmit() {
  errorMsg.value = ''
  loading.value = true
  try {
    await login(email.value, password.value)
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'ログインに失敗しました'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth">
    <form class="card" @submit.prevent="onSubmit">
      <h1>ログイン</h1>

      <label>
        メールアドレス
        <input v-model="email" type="email" autocomplete="email" required />
      </label>

      <label>
        パスワード
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? '送信中…' : 'ログイン' }}
      </button>

      <p class="switch">
        アカウントが無い方は
        <NuxtLink to="/signup">新規登録</NuxtLink>
      </p>
    </form>
  </main>
</template>

<style scoped>
.auth {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 1rem;
}
.card {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid var(--border, #e2e2e2);
  border-radius: 12px;
  background: var(--surface, #fff);
}
h1 {
  margin: 0;
  font-size: 1.25rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
}
input {
  padding: 0.6rem;
  border: 1px solid var(--border, #ccc);
  border-radius: 8px;
  font-size: 1rem;
}
button {
  padding: 0.7rem;
  border: 0;
  border-radius: 8px;
  background: var(--accent, #1f6feb);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: default;
}
.error {
  margin: 0;
  color: var(--danger, #c0392b);
  font-size: 0.85rem;
}
.switch {
  margin: 0;
  font-size: 0.85rem;
  text-align: center;
}
</style>

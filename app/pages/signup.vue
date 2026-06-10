<script setup lang="ts">
// 新規登録（F-01 / §9.3: PW 8文字以上・メール確認オフ＝即ログイン）。
definePageMeta({ layout: 'auth' })

const { signup } = useAuth()

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

const MIN_PW = 8

async function onSubmit() {
  errorMsg.value = ''
  // クライアント事前チェック（最終防衛は Supabase Auth の minimum_password_length=8）。
  if (password.value.length < MIN_PW) {
    errorMsg.value = `パスワードは${MIN_PW}文字以上で入力してください`
    return
  }
  loading.value = true
  try {
    await signup(email.value, password.value)
  } catch (e: any) {
    errorMsg.value = e?.message ?? '登録に失敗しました'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth">
    <form class="card" @submit.prevent="onSubmit">
      <p class="brand">PROGRE</p>
      <h1>新規登録</h1>

      <label>
        メールアドレス
        <input v-model="email" type="email" autocomplete="email" required />
      </label>

      <label>
        パスワード（{{ MIN_PW }}文字以上）
        <input
          v-model="password"
          type="password"
          autocomplete="new-password"
          :minlength="MIN_PW"
          required
        />
      </label>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? '送信中…' : '登録して始める' }}
      </button>

      <p class="switch">
        すでにアカウントをお持ちの方は
        <NuxtLink to="/login">ログイン</NuxtLink>
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
.brand {
  margin: 0;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--accent);
  text-align: center;
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

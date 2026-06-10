<script setup lang="ts">
// カレンダー（ホーム / F-02）。M4 で実装。M2 時点はプレースホルダ。
const { user } = useAuth()
</script>

<template>
  <section>
    <h1>カレンダー</h1>
    <p class="muted">ようこそ {{ user?.email }} さん</p>
    <p class="muted">（M4 で月グリッド・部位色ドットを実装します）</p>
  </section>
</template>

<style scoped>
h1 {
  font-size: 1.25rem;
  margin: 0 0 0.5rem;
}
.muted {
  color: var(--muted);
  margin: 0.25rem 0;
}
</style>

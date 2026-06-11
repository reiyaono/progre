<script setup lang="ts">
// サプリ・マスタ管理（サプリ名／タイミングの追加・編集・論理削除）。exercises.vue 簡易版。
import SupplementEditDialog from '~/components/supplement/SupplementEditDialog.vue'
import SupplementTimingEditDialog from '~/components/supplement/SupplementTimingEditDialog.vue'
import type { Supplement, SupplementTiming } from '~/types/db'

const sm = useSupplementMaster()
const { supplements, timings, error } = sm
const toast = useToast()

onMounted(() => sm.load())

async function run(fn: () => Promise<void>, okMsg?: string) {
  try {
    await fn()
    if (okMsg) toast.success(okMsg)
  } catch (e: any) {
    toast.error(e?.message ?? '操作に失敗しました')
  }
}

// サプリ
const supDialog = ref<{ open: boolean; model: Supplement | null }>({ open: false, model: null })
function openAddSup() { supDialog.value = { open: true, model: null } }
function openEditSup(s: Supplement) { supDialog.value = { open: true, model: s } }
function closeSup() { supDialog.value = { open: false, model: null } }
async function submitSup(p: { name: string }) {
  await run(async () => {
    if (supDialog.value.model) await sm.updateSupplement(supDialog.value.model.id, p)
    else await sm.addSupplement(p)
    closeSup()
  }, 'サプリを保存しました')
}
async function archiveSup(id: string) {
  await run(async () => { await sm.archiveSupplement(id); closeSup() }, 'サプリを削除しました')
}

// タイミング
const timDialog = ref<{ open: boolean; model: SupplementTiming | null }>({ open: false, model: null })
function openAddTim() { timDialog.value = { open: true, model: null } }
function openEditTim(t: SupplementTiming) { timDialog.value = { open: true, model: t } }
function closeTim() { timDialog.value = { open: false, model: null } }
async function submitTim(p: { name: string }) {
  await run(async () => {
    if (timDialog.value.model) await sm.updateTiming(timDialog.value.model.id, p)
    else await sm.addTiming(p)
    closeTim()
  }, 'タイミングを保存しました')
}
async function archiveTim(id: string) {
  await run(async () => { await sm.archiveTiming(id); closeTim() }, 'タイミングを削除しました')
}
</script>

<template>
  <section class="page">
    <header class="head">
      <NuxtLink to="/supplements" class="back">‹ サプリ</NuxtLink>
      <h1>サプリ・マスタ管理</h1>
    </header>

    <p v-if="error" class="error-text">{{ error }}</p>

    <!-- サプリ名 -->
    <div class="section-head">
      <h2>サプリ</h2>
      <button type="button" class="btn btn-primary" @click="openAddSup">サプリを追加</button>
    </div>
    <ul class="pill-list">
      <li v-for="s in supplements" :key="s.id">
        <button type="button" class="pill" @click="openEditSup(s)">{{ s.name }}</button>
      </li>
      <li v-if="!supplements.length" class="muted">サプリは未登録です。</li>
    </ul>

    <!-- タイミング -->
    <div class="section-head timings-head">
      <h2>タイミング</h2>
      <button type="button" class="btn" @click="openAddTim">タイミングを追加</button>
    </div>
    <ul class="pill-list">
      <li v-for="t in timings" :key="t.id">
        <button type="button" class="pill" @click="openEditTim(t)">{{ t.name }}</button>
      </li>
      <li v-if="!timings.length" class="muted">タイミングは未登録です。</li>
    </ul>

    <!-- ダイアログ -->
    <SupplementEditDialog
      v-if="supDialog.open"
      :model="supDialog.model"
      @submit="submitSup"
      @archive="archiveSup"
      @close="closeSup"
    />
    <SupplementTimingEditDialog
      v-if="timDialog.open"
      :model="timDialog.model"
      @submit="submitTim"
      @archive="archiveTim"
      @close="closeTim"
    />
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.head {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.back {
  font-size: 0.85rem;
  text-decoration: none;
}
h1 {
  font-size: 1.25rem;
  margin: 0;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.section-head h2 {
  font-size: 1rem;
  margin: 0;
}
.timings-head {
  margin-top: 1rem;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}
.pill-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.pill {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text);
}
.muted {
  color: var(--muted);
  margin: 0;
}
</style>

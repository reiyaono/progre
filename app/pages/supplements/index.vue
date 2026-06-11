<script setup lang="ts">
// サプリ摂取の日次記録（💊サプリタブ）。“今日”既定・前後移動。記録済み一覧＋追加/編集/削除。
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import SupplementIntakeDialog from '~/components/supplement/SupplementIntakeDialog.vue'
import { todayJst, addDays, formatJst } from '~/utils/date'
import type { SupplementIntake } from '~/types/db'

const today = todayJst()
const date = ref(today)

const sm = useSupplementMaster()
const { supplementById, timingById } = sm
const { intakes, loading, load, add, update, remove } = useSupplementDay(date)
const toast = useToast()

onMounted(() => {
  sm.load()
  load()
})

const isToday = computed(() => date.value === today)
function shiftDay(d: number) { date.value = addDays(date.value, d) }
function goToday() { date.value = today }

// 表示名（マスタから解決）
function nameOf(i: SupplementIntake) { return supplementById(i.supplement_id)?.name ?? '（削除済み）' }
function timingOf(i: SupplementIntake) { return timingById(i.timing_id)?.name ?? null }

// ダイアログ（追加/編集兼用）
const dialog = ref<{ open: boolean; model: SupplementIntake | null }>({ open: false, model: null })
function openAdd() { dialog.value = { open: true, model: null } }
function openEdit(i: SupplementIntake) { dialog.value = { open: true, model: i } }
function close() { dialog.value = { open: false, model: null } }

async function onSubmit(p: { supplement_id: string; timing_id: string | null; quantity: number }) {
  try {
    if (dialog.value.model) await update(dialog.value.model.id, p)
    else await add(p)
    close()
    toast.success(dialog.value.model ? '摂取を更新しました' : 'サプリを記録しました')
  } catch (e: any) {
    toast.error(e?.message ?? '保存に失敗しました')
  }
}
async function onRemove(id: string) {
  try {
    await remove(id)
    close()
    toast.success('摂取を削除しました')
  } catch (e: any) {
    toast.error(e?.message ?? '削除に失敗しました')
  }
}
</script>

<template>
  <section class="page">
    <header class="head">
      <h1>サプリ 💊</h1>
      <NuxtLink to="/supplements/manage" class="manage">マスタ管理 ✎</NuxtLink>
    </header>

    <!-- 日付ナビ -->
    <div class="datenav">
      <button type="button" class="btn nav" aria-label="前日" @click="shiftDay(-1)">‹</button>
      <span class="date">{{ formatJst(date) }}</span>
      <button type="button" class="btn nav" aria-label="翌日" @click="shiftDay(1)">›</button>
      <button type="button" class="btn today" :disabled="isToday" @click="goToday">今日</button>
    </div>

    <LoadingSpinner v-if="loading && !intakes.length" />

    <div v-else-if="intakes.length" class="list">
      <div v-for="i in intakes" :key="i.id" class="row">
        <button type="button" class="main" @click="openEdit(i)">
          <span class="name">{{ nameOf(i) }}</span>
          <span class="meta">
            ×{{ i.quantity }}
            <span v-if="timingOf(i)" class="timing">・{{ timingOf(i) }}</span>
          </span>
        </button>
        <button type="button" class="del" aria-label="削除" @click="onRemove(i.id)">削除</button>
      </div>
    </div>
    <p v-else class="empty">この日のサプリ記録はまだありません。</p>

    <button type="button" class="btn btn-primary add" @click="openAdd">＋ サプリを記録</button>

    <SupplementIntakeDialog
      v-if="dialog.open"
      :model="dialog.model"
      @submit="onSubmit"
      @remove="onRemove"
      @close="close"
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
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}
h1 {
  font-size: 1.25rem;
  margin: 0;
}
.manage {
  font-size: 0.82rem;
  text-decoration: none;
  color: var(--accent);
}
.datenav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.datenav .date {
  flex: 1;
  text-align: center;
  font-weight: 600;
}
.nav {
  width: 38px;
}
.today {
  font-size: 0.8rem;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.row {
  display: flex;
  align-items: stretch;
  gap: 0.4rem;
}
.main {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;
  text-align: left;
  color: var(--text);
}
.name {
  font-size: 0.98rem;
  font-weight: 600;
}
.meta {
  font-size: 0.85rem;
  color: var(--muted);
}
.timing {
  color: var(--muted);
}
.del {
  flex: 0 0 auto;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--danger);
  border-radius: 10px;
  padding: 0 0.7rem;
  font-size: 0.8rem;
  cursor: pointer;
}
.empty {
  text-align: center;
  color: var(--muted);
  padding: 1.5rem 0;
}
.add {
  align-self: stretch;
}
</style>

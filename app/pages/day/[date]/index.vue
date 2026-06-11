<script setup lang="ts">
// 日別ワークアウト（F-04）。その日の種目エントリ一覧＋種目追加/削除。
import ExerciseEntryRow from '~/components/workout/ExerciseEntryRow.vue'
import AddExerciseDialog from '~/components/workout/AddExerciseDialog.vue'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import { formatJst } from '~/utils/date'

const route = useRoute()
const date = route.params.date as string

const {
  entries, pending, addEntry, deleteEntry,
  place, placeSuggestions, loadPlaceSuggestions, setPlace,
} = useWorkout(date)

const showAdd = ref(false)

// 場所入力（取得した place と同期。変化時のみ保存）
const placeInput = ref('')
watch(place, (v) => { placeInput.value = v ?? '' }, { immediate: true })
onMounted(() => loadPlaceSuggestions())

async function savePlace() {
  if (placeInput.value.trim() === (place.value ?? '')) return
  try {
    await setPlace(placeInput.value.trim())
  } catch (e: any) {
    alert(e?.message ?? '場所の保存に失敗しました')
  }
}

async function onPick(exerciseId: string) {
  try {
    await addEntry(exerciseId)
    showAdd.value = false
  } catch (e: any) {
    alert(e?.message ?? '追加に失敗しました')
  }
}

async function onDelete(weId: string) {
  if (!confirm('この種目を削除しますか？（セットも消えます）')) return
  try {
    await deleteEntry(weId)
  } catch (e: any) {
    alert(e?.message ?? '削除に失敗しました')
  }
}

function openSets(weId: string) {
  navigateTo(`/day/${date}/exercise/${weId}`)
}
</script>

<template>
  <section class="page">
    <header class="head">
      <NuxtLink :to="`/?month=${date.slice(0, 7)}`" class="back">‹ カレンダー</NuxtLink>
      <h1>{{ formatJst(date) }}</h1>
    </header>

    <!-- 場所（過去の場所名を頻出順で候補表示） -->
    <div class="place-box">
      <label for="place-input">場所</label>
      <input
        id="place-input"
        v-model="placeInput"
        list="place-list"
        placeholder="例: 〇〇ジム"
        @blur="savePlace"
        @keyup.enter="savePlace"
      />
      <datalist id="place-list">
        <option v-for="p in placeSuggestions" :key="p" :value="p" />
      </datalist>
    </div>

    <!-- プリフェッチ済みなら即描画。空かつ取得中のときだけスピナー（裏で refresh） -->
    <LoadingSpinner v-if="pending && !entries.length" />

    <template v-else>
      <div v-if="entries.length" class="list">
        <ExerciseEntryRow
          v-for="e in entries"
          :key="e.workoutExerciseId"
          :entry="e"
          @open="openSets(e.workoutExerciseId)"
          @delete="onDelete(e.workoutExerciseId)"
        />
      </div>
      <div v-else class="empty">
        <p>この日の記録はまだありません。種目を追加しましょう。</p>
      </div>

      <button type="button" class="btn btn-primary add" @click="showAdd = true">＋ 種目を追加</button>
    </template>

    <AddExerciseDialog v-if="showAdd" @pick="onPick" @close="showAdd = false" />
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
  font-size: 1.15rem;
  margin: 0;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.empty {
  text-align: center;
  color: var(--muted);
  padding: 1.5rem 0;
}
.add {
  align-self: stretch;
}
.place-box {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.place-box label {
  font-size: 0.8rem;
  color: var(--muted);
}
.place-box input {
  padding: 0.55rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--surface);
  color: var(--text);
}
.muted {
  color: var(--muted);
}
</style>

<script setup lang="ts">
// セット記録（F-04 / §9.1・§9.4・§9.5）。+/− 増減でセット追加/編集、メモ、前回比較。
import SetRow from '~/components/workout/SetRow.vue'
import LastRecordBadge from '~/components/workout/LastRecordBadge.vue'
import LineChart from '~/components/chart/LineChart.vue'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import { isValidWeight, isValidReps, isValidInterval, WEIGHT_STEP } from '~/utils/validation'
import type { MaxWeightResponse } from '#shared/types/api'

const route = useRoute()
const date = route.params.date as string
const weId = route.params.weId as string

const supabase = useSupabaseClient()
const { sets, loading: setsLoading, load, addSet, deleteSet, updateSet } = useSetEditor(weId)

// 種目エントリのメタ（種目名・exercise_id・メモ）
const exerciseId = ref<string | null>(null)
const exerciseName = ref('')
const memo = ref('')

async function loadMeta() {
  const { data } = await supabase
    .from('workout_exercise')
    .select('memo, exercise(id, name)')
    .eq('id', weId)
    .single()
  const ex = (data as any)?.exercise
  exerciseId.value = ex?.id ?? null
  exerciseName.value = ex?.name ?? ''
  memo.value = (data as any)?.memo ?? ''
}

onMounted(() => {
  loadMeta()
  load()
})

// 前回比較（§9.4）
const { last } = useLastRecord(exerciseId, date)

// ミニグラフ: この種目の最大重量推移（v_exercise_max_weight 経由）
const { data: maxTrend } = useFetch<MaxWeightResponse>('/api/dashboard/max-weight', {
  query: computed(() => ({ exerciseId: exerciseId.value })),
  immediate: false,
  watch: [exerciseId],
  default: () => ({ series: [] }),
})

// ---- セット入力フォーム（+/− ステッパー） ---------------------------------
const editingId = ref<string | null>(null)
const weight = ref(20)
const reps = ref(10)
const interval = ref<number | null>(null)

const weightOk = computed(() => isValidWeight(weight.value))
const repsOk = computed(() => isValidReps(reps.value))
const intervalOk = computed(() => isValidInterval(interval.value))
const canSave = computed(() => weightOk.value && repsOk.value && intervalOk.value)
const isEditing = computed(() => editingId.value !== null)

function stepWeight(d: number) {
  const v = Math.round((weight.value + d) * 4) / 4
  weight.value = Math.min(999, Math.max(0, v))
}
function stepReps(d: number) {
  reps.value = Math.min(99, Math.max(1, reps.value + d))
}
function stepInterval(d: number) {
  const base = interval.value ?? 0
  interval.value = Math.max(0, base + d)
}

function startEdit(id: string) {
  const s = sets.value.find((x) => x.id === id)
  if (!s) return
  editingId.value = id
  weight.value = Number(s.weight)
  reps.value = s.reps
  interval.value = s.interval_sec
}
function cancelEdit() {
  editingId.value = null
}

async function onSubmit() {
  if (!canSave.value) return
  const input = { weight: weight.value, reps: reps.value, interval: interval.value }
  try {
    if (editingId.value) await updateSet(editingId.value, input)
    else await addSet(input)
    editingId.value = null
  } catch (e: any) {
    alert(e?.message ?? '保存に失敗しました')
  }
}

async function onDelete(id: string) {
  try {
    await deleteSet(id)
    if (editingId.value === id) editingId.value = null
  } catch (e: any) {
    alert(e?.message ?? '削除に失敗しました')
  }
}

// メモ保存
const memoSaving = ref(false)
async function saveMemo() {
  memoSaving.value = true
  try {
    await supabase.from('workout_exercise').update({ memo: memo.value }).eq('id', weId)
  } finally {
    memoSaving.value = false
  }
}
</script>

<template>
  <section class="page">
    <header class="head">
      <NuxtLink :to="`/day/${date}`" class="back">‹ 戻る</NuxtLink>
      <h1>{{ exerciseName || '種目' }}</h1>
    </header>

    <LastRecordBadge
      :last-top-set="last?.lastTopSet ?? null"
      :best-weight="last?.bestWeight ?? null"
    />

    <!-- ミニグラフ: 最大重量推移 -->
    <ClientOnly>
      <div v-if="(maxTrend?.series?.length ?? 0) > 0" class="mini-chart">
        <LineChart :series="maxTrend?.series ?? []" x-type="day" unit="kg" />
      </div>
    </ClientOnly>

    <!-- セット一覧 -->
    <LoadingSpinner v-if="setsLoading && !sets.length" />
    <div v-else-if="sets.length" class="list">
      <SetRow
        v-for="s in sets"
        :key="s.id"
        :set="s"
        @edit="startEdit(s.id)"
        @delete="onDelete(s.id)"
      />
    </div>
    <p v-else class="muted">最初のセットを追加しましょう。</p>

    <!-- 入力フォーム -->
    <form class="entry-form" @submit.prevent="onSubmit">
      <h2>{{ isEditing ? 'セットを編集' : 'セットを追加' }}</h2>

      <div class="stepper">
        <label>重量(kg)</label>
        <div class="ctrl">
          <button type="button" class="btn" @click="stepWeight(-WEIGHT_STEP)">−</button>
          <input v-model.number="weight" type="number" step="0.25" min="0" max="999" inputmode="decimal" />
          <button type="button" class="btn" @click="stepWeight(WEIGHT_STEP)">＋</button>
        </div>
      </div>

      <div class="stepper">
        <label>回数</label>
        <div class="ctrl">
          <button type="button" class="btn" @click="stepReps(-1)">−</button>
          <input v-model.number="reps" type="number" step="1" min="1" max="99" inputmode="numeric" />
          <button type="button" class="btn" @click="stepReps(1)">＋</button>
        </div>
      </div>

      <div class="stepper">
        <label>インターバル(秒・任意)</label>
        <div class="ctrl">
          <button type="button" class="btn" @click="stepInterval(-30)">−</button>
          <input v-model.number="interval" type="number" step="1" min="0" inputmode="numeric" placeholder="未記録" />
          <button type="button" class="btn" @click="stepInterval(30)">＋</button>
        </div>
      </div>

      <p v-if="!canSave" class="error-text">
        入力値を確認してください（重量0〜999の0.25刻み / 回数1〜99 / 休憩0以上）。
      </p>

      <div class="btn-row">
        <button v-if="isEditing" type="button" class="btn" @click="cancelEdit">キャンセル</button>
        <button type="submit" class="btn btn-primary" :disabled="!canSave">
          {{ isEditing ? '更新' : 'セットを追加' }}
        </button>
      </div>
    </form>

    <!-- メモ -->
    <div class="memo-box">
      <h2>メモ</h2>
      <textarea v-model="memo" rows="2" placeholder="この種目のメモ" />
      <div class="btn-row">
        <button type="button" class="btn" :disabled="memoSaving" @click="saveMemo">
          {{ memoSaving ? '保存中…' : 'メモを保存' }}
        </button>
      </div>
    </div>
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
h2 {
  font-size: 0.95rem;
  margin: 0 0 0.6rem;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.entry-form,
.memo-box {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 1rem;
}
.stepper {
  margin-bottom: 0.8rem;
}
.stepper label {
  display: block;
  font-size: 0.8rem;
  color: var(--muted);
  margin-bottom: 0.3rem;
}
.ctrl {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.ctrl .btn {
  width: 44px;
  font-size: 1.1rem;
}
.ctrl input {
  flex: 1;
  text-align: center;
  padding: 0.55rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 1.1rem;
}
textarea {
  width: 100%;
  padding: 0.55rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
}
.muted {
  color: var(--muted);
}
</style>

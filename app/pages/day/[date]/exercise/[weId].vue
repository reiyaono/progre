<script setup lang="ts">
// セット記録（F-04 / §9.1・§9.4・§9.5）。+/− 増減でセット追加/編集、メモ、前回比較。
import SetRow from '~/components/workout/SetRow.vue'
import LastRecordBadge from '~/components/workout/LastRecordBadge.vue'
import LineChart from '~/components/chart/LineChart.vue'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import { isValidWeight, isValidReps, isValidInterval, isValidDuration, WEIGHT_STEP } from '~/utils/validation'
import type { MaxWeightResponse } from '#shared/types/api'

const route = useRoute()
const date = route.params.date as string
const weId = route.params.weId as string

const supabase = useSupabaseClient()
const toast = useToast()
const {
  sets, loading: setsLoading, load, addSet, deleteSet, updateSet,
  addCardioSet, updateCardioSet, addBodyweightSet, updateBodyweightSet,
} = useSetEditor(weId)

// 種目エントリのメタ（種目名・exercise_id・メモ・有酸素判定）
const exerciseId = ref<string | null>(null)
const exerciseName = ref('')
const memo = ref('')
const isCardio = ref(false) // 部位「有酸素」なら分のみ
const isBodyweight = ref(false) // トレーニング方法「自重」なら回数のみ

async function loadMeta() {
  const { data } = await supabase
    .from('workout_exercise')
    .select('memo, exercise(id, name, body_part(name), training_method(name))')
    .eq('id', weId)
    .single()
  const ex = (data as any)?.exercise
  exerciseId.value = ex?.id ?? null
  exerciseName.value = ex?.name ?? ''
  isCardio.value = ex?.body_part?.name === '有酸素'
  isBodyweight.value = !isCardio.value && ex?.training_method?.name === '自重'
  memo.value = (data as any)?.memo ?? ''
  // 未seed（直接アクセス）または seed と実種別がズレた場合に、正しいグラフだけ取得する。
  // seed 済みで種別一致なら immediate で取得済みのため二重取得しない。
  const freshType = isCardio.value ? 'cardio' : isBodyweight.value ? 'bodyweight' : 'strength'
  if (!cachedEntry || freshType !== cachedEntry.measureType) refreshTrends()
}

// 日別から遷移した場合はキャッシュ済み DayEntry でメタを即 seed。
// → exerciseId/種別が mount 時点で確定し、グラフが直列待ちなく即発火・必要分だけ取得できる。
// 未キャッシュ（直接アクセス/リロード）時は loadMeta で従来通り解決。
const cachedEntry = useDayCache().get(date)?.entries.find((e) => e.workoutExerciseId === weId)
if (cachedEntry) {
  exerciseId.value = cachedEntry.exerciseId
  exerciseName.value = cachedEntry.exerciseName
  isCardio.value = cachedEntry.measureType === 'cardio'
  isBodyweight.value = cachedEntry.measureType === 'bodyweight'
  memo.value = cachedEntry.memo ?? ''
}
// 表示対象のグラフ種別（seed 済みなら即確定）。
const isStrength = computed(() => !isCardio.value && !isBodyweight.value)

onMounted(() => {
  loadMeta() // メタはキャッシュの有無に関わらず裏で最新化（メモ等）。
  load()
})

// 前回比較（§9.4）
const { last } = useLastRecord(exerciseId, date)

// トップセット推移（日次の最大重量・v_exercise_max_weight 経由）。筋トレのみ表示。
// seed 済み（exerciseId 既知）かつ筋トレなら mount で即発火。未seed時は exerciseId 確定で発火。
const { data: maxTrend, refresh: refreshMax } = useFetch<MaxWeightResponse>('/api/dashboard/max-weight', {
  query: computed(() => ({ exerciseId: exerciseId.value })),
  immediate: !!exerciseId.value && isStrength.value,
  watch: false, // 取得契機は immediate（seed時）＋ loadMeta の refreshTrends（miss/種別変更時）に限定
  default: () => ({ series: [] }),
})

// 筋ボリューム推移（日次 Σweight×reps・専用エンドポイント）。筋トレのみ表示。
const { data: volumeTrend, refresh: refreshVolume } = useFetch<MaxWeightResponse>(
  () => `/api/exercise/${exerciseId.value}/volume`,
  {
    immediate: !!exerciseId.value && isStrength.value,
    watch: false,
    default: () => ({ series: [] }),
  },
)

// 種目別最大回数推移（日次・自重のみ。v_exercise_max_reps 経由）。
const { data: repsTrend, refresh: refreshReps } = useFetch<MaxWeightResponse>('/api/dashboard/max-reps', {
  query: computed(() => ({ exerciseId: exerciseId.value })),
  immediate: !!exerciseId.value && isBodyweight.value,
  watch: false,
  default: () => ({ series: [] }),
})

// セット変更後にグラフを連動更新（筋トレ＝重量系／自重＝回数）
function refreshTrends() {
  if (isCardio.value) return
  if (isBodyweight.value) {
    refreshReps()
    return
  }
  refreshMax()
  refreshVolume()
}

// ---- セット入力フォーム（+/− ステッパー） ---------------------------------
const editingId = ref<string | null>(null)
const weight = ref(20)
const reps = ref(10)
const interval = ref<number | null>(null)
const durationMin = ref(20) // 有酸素の時間（分）

const weightOk = computed(() => isValidWeight(weight.value))
const repsOk = computed(() => isValidReps(reps.value))
const intervalOk = computed(() => isValidInterval(interval.value))
const durationOk = computed(() => isValidDuration(durationMin.value))
const canSave = computed(() =>
  isCardio.value
    ? durationOk.value
    : isBodyweight.value
      ? repsOk.value
      : weightOk.value && repsOk.value && intervalOk.value,
)
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
function stepDuration(d: number) {
  durationMin.value = Math.min(999, Math.max(1, durationMin.value + d))
}

function startEdit(id: string) {
  const s = sets.value.find((x) => x.id === id)
  if (!s) return
  editingId.value = id
  if (isCardio.value) {
    durationMin.value = Math.round((s.duration_sec ?? 0) / 60) || 1
  } else if (isBodyweight.value) {
    reps.value = s.reps ?? 1
  } else {
    weight.value = Number(s.weight ?? 0)
    reps.value = s.reps ?? 1
    interval.value = s.interval_sec
  }
}
function cancelEdit() {
  editingId.value = null
}

async function onSubmit() {
  if (!canSave.value) return
  const wasEditing = editingId.value !== null
  try {
    if (isCardio.value) {
      if (editingId.value) await updateCardioSet(editingId.value, durationMin.value)
      else await addCardioSet(durationMin.value)
    } else if (isBodyweight.value) {
      if (editingId.value) await updateBodyweightSet(editingId.value, reps.value)
      else await addBodyweightSet(reps.value)
    } else {
      const input = { weight: weight.value, reps: reps.value, interval: interval.value }
      if (editingId.value) await updateSet(editingId.value, input)
      else await addSet(input)
    }
    editingId.value = null
    refreshTrends()
    toast.success(wasEditing ? 'セットを更新しました' : 'セットを追加しました')
  } catch (e: any) {
    toast.error(e?.message ?? '保存に失敗しました')
  }
}

async function onDelete(id: string) {
  try {
    await deleteSet(id)
    if (editingId.value === id) editingId.value = null
    refreshTrends()
    toast.success('セットを削除しました')
  } catch (e: any) {
    toast.error(e?.message ?? '削除に失敗しました')
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

    <!-- 前回比較バッジ（筋トレのみ・最上部に残す） -->
    <LastRecordBadge
      v-if="!isCardio && !isBodyweight"
      :last-top-set="last?.lastTopSet ?? null"
      :best-weight="last?.bestWeight ?? null"
    />

    <!-- ① セット表 -->
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

      <!-- 有酸素: 時間（分）のみ -->
      <div v-if="isCardio" class="stepper">
        <label>時間(分)</label>
        <div class="ctrl">
          <button type="button" class="btn" @click="stepDuration(-5)">−</button>
          <input v-model.number="durationMin" type="number" step="1" min="1" max="999" inputmode="numeric" />
          <button type="button" class="btn" @click="stepDuration(5)">＋</button>
        </div>
      </div>

      <!-- 自重: 回数のみ -->
      <div v-else-if="isBodyweight" class="stepper">
        <label>回数</label>
        <div class="ctrl">
          <button type="button" class="btn" @click="stepReps(-1)">−</button>
          <input v-model.number="reps" type="number" step="1" min="1" max="99" inputmode="numeric" />
          <button type="button" class="btn" @click="stepReps(1)">＋</button>
        </div>
      </div>

      <!-- 筋トレ: 重量・回数・インターバル -->
      <template v-else>
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
      </template>

      <p v-if="!canSave" class="error-text">
        {{ isCardio
          ? '時間は1〜999分で入力してください。'
          : isBodyweight
            ? '回数は1〜99で入力してください。'
            : '入力値を確認してください（重量0〜999の0.25刻み / 回数1〜99 / 休憩0以上）。' }}
      </p>

      <div class="btn-row">
        <button v-if="isEditing" type="button" class="btn" @click="cancelEdit">キャンセル</button>
        <button type="submit" class="btn btn-primary" :disabled="!canSave">
          {{ isEditing ? '更新' : 'セットを追加' }}
        </button>
      </div>
    </form>

    <!-- ③ メモ -->
    <div class="memo-box">
      <h2>メモ</h2>
      <textarea v-model="memo" rows="2" placeholder="この種目のメモ" />
      <div class="btn-row">
        <button type="button" class="btn" :disabled="memoSaving" @click="saveMemo">
          {{ memoSaving ? '保存中…' : 'メモを保存' }}
        </button>
      </div>
    </div>

    <!-- ④⑤ 推移グラフ（筋トレ＝重量系） -->
    <template v-if="!isCardio && !isBodyweight">
      <div class="chart-box">
        <h2>筋ボリューム推移</h2>
        <ClientOnly>
          <LineChart :series="volumeTrend?.series ?? []" x-type="day" unit="volume" />
        </ClientOnly>
      </div>

      <div class="chart-box">
        <h2>トップセット推移（最大重量）</h2>
        <ClientOnly>
          <LineChart :series="maxTrend?.series ?? []" x-type="day" unit="kg" />
        </ClientOnly>
      </div>
    </template>

    <!-- 推移グラフ（自重＝最大回数） -->
    <div v-else-if="isBodyweight" class="chart-box">
      <h2>最大回数の推移</h2>
      <ClientOnly>
        <LineChart :series="repsTrend?.series ?? []" x-type="day" unit="回" />
      </ClientOnly>
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
.memo-box,
.chart-box {
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

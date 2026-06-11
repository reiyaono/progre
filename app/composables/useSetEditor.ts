// セット編集（F-04 / §9.5）。取得は SDK、追加/削除は RPC（set_no を 1..n に保つ）。
import type { WorkoutSet } from '~/types/db'

export interface SetInput {
  weight: number
  reps: number
  interval: number | null
}

export function useSetEditor(weId: string) {
  const supabase = useSupabaseClient()
  const sets = ref<WorkoutSet[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    const { data, error: e } = await supabase
      .from('workout_set').select('*').eq('workout_exercise_id', weId).order('set_no')
    if (e) error.value = e.message
    else sets.value = (data ?? []) as WorkoutSet[]
    loading.value = false
  }

  /** 末尾にセット追加（サーバで set_no 採番）。 */
  async function addSet(input: SetInput) {
    const { error: e } = await supabase.rpc('fn_add_set', {
      // interval_sec は null 許容列。生成型は非nullだが実行時nullは正しく挿入される。
      p_we: weId, p_weight: input.weight, p_reps: input.reps, p_interval: input.interval as number,
    })
    if (e) throw e
    await load()
  }

  /** セット削除（残りを 1..n に再採番）。 */
  async function deleteSet(id: string) {
    const { error: e } = await supabase.rpc('fn_delete_set', { p_set: id })
    if (e) throw e
    await load()
  }

  /** セット値の更新（set_no は不変なので SDK 直＋RLS）。 */
  async function updateSet(id: string, input: SetInput) {
    const { error: e } = await supabase
      .from('workout_set')
      .update({ weight: input.weight, reps: input.reps, interval_sec: input.interval })
      .eq('id', id)
    if (e) throw e
    await load()
  }

  // ---- 有酸素（分のみ）---------------------------------------------------------
  /** 有酸素セット追加（weight/reps=null・duration_sec=分*60）。 */
  async function addCardioSet(durationMin: number) {
    const { error: e } = await supabase.rpc('fn_add_cardio_set', {
      p_we: weId, p_duration_sec: durationMin * 60,
    })
    if (e) throw e
    await load()
  }

  /** 有酸素セットの更新（時間のみ。weight/reps は null のまま）。 */
  async function updateCardioSet(id: string, durationMin: number) {
    const { error: e } = await supabase
      .from('workout_set')
      .update({ duration_sec: durationMin * 60, weight: null, reps: null, interval_sec: null })
      .eq('id', id)
    if (e) throw e
    await load()
  }

  // ---- 自重（回数のみ）---------------------------------------------------------
  /** 自重セット追加（weight/interval/duration=null・reps=値）。 */
  async function addBodyweightSet(reps: number) {
    const { error: e } = await supabase.rpc('fn_add_bodyweight_set', {
      p_we: weId, p_reps: reps,
    })
    if (e) throw e
    await load()
  }

  /** 自重セットの更新（回数のみ。weight/interval/duration は null のまま）。 */
  async function updateBodyweightSet(id: string, reps: number) {
    const { error: e } = await supabase
      .from('workout_set')
      .update({ reps, weight: null, interval_sec: null, duration_sec: null })
      .eq('id', id)
    if (e) throw e
    await load()
  }

  return {
    sets, loading, error, load, addSet, deleteSet, updateSet,
    addCardioSet, updateCardioSet, addBodyweightSet, updateBodyweightSet,
  }
}

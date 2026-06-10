// 日別ワークアウト（F-04）。取得は /api/day/[date]、変更整合は RPC（SECURITY INVOKER＋RLS）。
import type { DayResponse } from '#shared/types/api'

export function useWorkout(date: string) {
  const supabase = useSupabaseClient()

  const { data, pending, error, refresh } = useFetch<DayResponse>(`/api/day/${date}`, {
    lazy: true, // 取得でブロックしない（遅い本番でも即描画＋スピナー）
    default: () => ({ workoutId: null, entries: [] }),
  })
  const entries = computed(() => data.value?.entries ?? [])

  /** 種目エントリ追加（workout は get-or-create・同日同種目は冪等）。 */
  async function addEntry(exerciseId: string) {
    const { error: e } = await supabase.rpc('fn_add_exercise_entry', { p_date: date, p_exercise: exerciseId })
    if (e) throw e
    await refresh()
  }

  /** 種目エントリ削除（最後の1件なら workout も自動削除＝§7）。 */
  async function deleteEntry(weId: string) {
    const { error: e } = await supabase.rpc('fn_delete_exercise_entry', { p_we: weId })
    if (e) throw e
    await refresh()
  }

  /** メモ更新（SDK直＋RLS）。 */
  async function updateMemo(weId: string, memo: string) {
    const { error: e } = await supabase.from('workout_exercise').update({ memo }).eq('id', weId)
    if (e) throw e
    await refresh()
  }

  return { data, entries, pending, error, refresh, addEntry, deleteEntry, updateMemo }
}

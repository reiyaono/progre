// 日別ワークアウト（F-04）。取得は /api/day/[date]、変更整合は RPC（SECURITY INVOKER＋RLS）。
import type { DayResponse } from '#shared/types/api'

export function useWorkout(date: string) {
  const supabase = useSupabaseClient()

  // カレンダーから遷移した場合はプリフェッチ済みデータで即描画（裏で /api/day を refresh）。
  const cached = useDayCache().get(date)

  const { data, pending, error, refresh } = useFetch<DayResponse>(`/api/day/${date}`, {
    lazy: true, // 取得でブロックしない（遅い本番でも即描画＋スピナー）
    default: (): DayResponse => ({
      workoutId: null,
      place: cached?.place ?? null,
      entries: cached?.entries ?? [],
    }),
  })
  const entries = computed(() => data.value?.entries ?? [])
  const place = computed(() => data.value?.place ?? null)

  // 過去に使った場所名（頻出順）。候補表示用。
  const placeSuggestions = ref<string[]>([])
  async function loadPlaceSuggestions() {
    const { data: rows } = await supabase
      .from('v_place_frequency')
      .select('place_name, cnt')
      .order('cnt', { ascending: false })
      .order('place_name')
    placeSuggestions.value = (rows ?? []).map((r: any) => r.place_name as string)
  }

  /** 場所設定（workout を get-or-create して 1:1 リンク。空文字でクリア）。 */
  async function setPlace(name: string) {
    const { error: e } = await supabase.rpc('fn_set_workout_place', { p_date: date, p_place: name })
    if (e) throw e
    await Promise.all([refresh(), loadPlaceSuggestions()])
  }

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

  return {
    data, entries, place, pending, error, refresh,
    addEntry, deleteEntry, updateMemo,
    placeSuggestions, loadPlaceSuggestions, setPlace,
  }
}

// 種目の日次「最大セットボリューム」推移（その日で最も weight×reps が大きい1セットの値）。
// 詳細画面のグラフ用。v_set_detail の volume を日付ごとに MAX（有酸素＝volume null は除外）。RLS継承。
import { serverSupabaseClient } from '#supabase/server'
import type { Series } from '#shared/types/api'

export interface ExerciseTopVolumeResponse {
  series: Series[]
}

export default defineEventHandler(async (event): Promise<ExerciseTopVolumeResponse> => {
  const id = getRouterParam(event, 'id')
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!id || !UUID_RE.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid exercise id' })
  }
  const q = getQuery(event)
  const from = (q.from as string) ?? new Date(Date.now() - 84 * 864e5).toISOString().slice(0, 10)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('v_set_detail')
    .select('date, volume')
    .eq('exercise_id', id)
    .not('volume', 'is', null)
    .gte('date', from)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // 日付ごとに最大値（＝その日の一番重かったセットの weight×reps）
  const byDate = new Map<string, number>()
  for (const r of (data ?? []) as any[]) {
    const v = Number(r.volume)
    const cur = byDate.get(r.date as string)
    if (cur === undefined || v > cur) byDate.set(r.date as string, v)
  }
  const points = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([x, y]) => ({ x, y }))

  return { series: points.length ? [{ label: '最大セットボリューム', color: '#e8590c', points }] : [] }
})

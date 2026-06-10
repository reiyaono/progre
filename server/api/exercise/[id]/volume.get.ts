// 種目の筋ボリューム推移（日次 Σweight×reps）。詳細画面のグラフ用。
// v_set_detail の volume を日付で合算（有酸素＝volume null は除外）。RLS継承。
import { serverSupabaseClient } from '#supabase/server'
import type { Series } from '#shared/types/api'

export interface ExerciseVolumeResponse {
  series: Series[]
}

export default defineEventHandler(async (event): Promise<ExerciseVolumeResponse> => {
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

  // 日付ごとに合算
  const byDate = new Map<string, number>()
  for (const r of (data ?? []) as any[]) {
    byDate.set(r.date as string, (byDate.get(r.date as string) ?? 0) + Number(r.volume))
  }
  const points = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([x, y]) => ({ x, y }))

  return { series: points.length ? [{ label: '筋ボリューム', color: '#1f6feb', points }] : [] }
})

// 種目の実施時間推移（日次・分）。有酸素種目の詳細画面グラフ用。
// v_set_detail の duration_sec を日付で合算し、秒→分に変換（重量系＝duration null は除外）。RLS継承。
import { serverSupabaseClient } from '#supabase/server'
import type { Series } from '#shared/types/api'

export interface ExerciseDurationResponse {
  series: Series[]
}

export default defineEventHandler(async (event): Promise<ExerciseDurationResponse> => {
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
    .select('date, duration_sec')
    .eq('exercise_id', id)
    .not('duration_sec', 'is', null)
    .gte('date', from)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // 日付ごとに秒を合算
  const byDate = new Map<string, number>()
  for (const r of (data ?? []) as any[]) {
    byDate.set(r.date as string, (byDate.get(r.date as string) ?? 0) + Number(r.duration_sec))
  }
  const points = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([x, sec]) => ({ x, y: Math.round(sec / 60) })) // 秒→分（四捨五入）

  return { series: points.length ? [{ label: '実施時間', color: '#2f9e44', points }] : [] }
})

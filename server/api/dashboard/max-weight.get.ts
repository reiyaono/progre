// ダッシュボード: 種目別最大重量推移（F-05-②）
// v_exercise_max_weight を日次集計し、種目ごとの Series[] で返す。
import { serverSupabaseClient } from '#supabase/server'
import type { MaxWeightResponse } from '#shared/types/api'

export default defineEventHandler(async (event): Promise<MaxWeightResponse> => {
  const q = getQuery(event)

  // from 未指定時は今日から84日前（約12週）を既定にする
  const defaultFrom = new Date(Date.now() - 84 * 864e5).toISOString().slice(0, 10)
  const from = (q.from as string) ?? defaultFrom
  const exerciseId = q.exerciseId as string | undefined

  // from フォーマット検証
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid from (YYYY-MM-DD)' })
  }

  const client = await serverSupabaseClient(event)

  // v_exercise_max_weight から取得（RLSが効くため user_id 条件は不要）
  let query = client
    .from('v_exercise_max_weight')
    .select('date, exercise_id, exercise_name, max_weight')
    .gte('date', from)
    .order('date')

  if (exerciseId) {
    query = query.eq('exercise_id', exerciseId)
  }

  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // exercise_id ごとにグルーピングして Series[] に整形（種目画面の他グラフと被らない紫）
  const map = new Map<string, { label: string; color: string; points: { x: string; y: number }[] }>()
  for (const row of (data ?? []) as any[]) {
    const id: string = row.exercise_id
    if (!map.has(id)) {
      map.set(id, {
        label: row.exercise_name,
        color: '#9c36b5',
        points: [],
      })
    }
    map.get(id)!.points.push({ x: row.date as string, y: Number(row.max_weight) })
  }

  return { series: Array.from(map.values()) }
})

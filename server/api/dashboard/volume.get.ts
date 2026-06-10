// ダッシュボード: 部位別ボリューム推移（F-05-①）
// v_weekly_bodypart_volume を週次集計し、部位ごとの Series[] で返す。
import { serverSupabaseClient } from '#supabase/server'
import type { VolumeResponse } from '#shared/types/api'

export default defineEventHandler(async (event): Promise<VolumeResponse> => {
  const q = getQuery(event)

  // from 未指定時は今日から84日前（約12週）を既定にする
  const defaultFrom = new Date(Date.now() - 84 * 864e5).toISOString().slice(0, 10)
  const from = (q.from as string) ?? defaultFrom
  const bodyPartId = q.bodyPartId as string | undefined

  // from フォーマット検証
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid from (YYYY-MM-DD)' })
  }

  const client = await serverSupabaseClient(event)

  // v_weekly_bodypart_volume から取得（RLSが効くため user_id 条件は不要）
  let query = client
    .from('v_weekly_bodypart_volume')
    .select('week_start, body_part_id, body_part_name, body_part_color, volume')
    .gte('week_start', from)
    .order('week_start')

  if (bodyPartId) {
    query = query.eq('body_part_id', bodyPartId)
  }

  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // body_part_id ごとにグルーピングして Series[] に整形
  const map = new Map<string, { label: string; color: string; points: { x: string; y: number }[] }>()
  for (const row of (data ?? []) as any[]) {
    const id: string = row.body_part_id
    if (!map.has(id)) {
      map.set(id, {
        label: row.body_part_name,
        color: row.body_part_color,
        points: [],
      })
    }
    map.get(id)!.points.push({ x: row.week_start as string, y: Number(row.volume) })
  }

  return { series: Array.from(map.values()) }
})

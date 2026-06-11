// ダッシュボード4指標をまとめて1回で返す（F-05 / もっさり対策）。
// 以前は volume/max-weight/est-1rm/overloaded を別エンドポイントで4往復していた。
// 1サーバ呼び出し＋1 Supabase接続で並列集計し、ブラウザ↔サーバ往復と接続数を削減する。
// 各指標の集計ロジックは個別エンドポイントと同一（値は一致）。
import { serverSupabaseClient } from '#supabase/server'
import type {
  VolumeResponse,
  MaxWeightResponse,
  Est1rmResponse,
  OverloadedResponse,
  OverloadedRow,
} from '#shared/types/api'

export interface DashboardSummaryResponse {
  volume: VolumeResponse
  maxWeight: MaxWeightResponse
  est1rm: Est1rmResponse
  overloaded: OverloadedResponse
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default defineEventHandler(async (event): Promise<DashboardSummaryResponse> => {
  const q = getQuery(event)

  const defaultFrom = new Date(Date.now() - 84 * 864e5).toISOString().slice(0, 10)
  const from = (q.from as string) ?? defaultFrom
  const week = (q.week as string) ?? new Date().toISOString().slice(0, 10)
  const bodyPartId = q.bodyPartId as string | undefined
  const exerciseId = q.exerciseId as string | undefined

  if (!DATE_RE.test(from)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid from (YYYY-MM-DD)' })
  }
  if (!DATE_RE.test(week)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid week (YYYY-MM-DD)' })
  }

  const client = await serverSupabaseClient(event)

  // ① 部位別ボリューム推移（週次）
  let volumeQuery = client
    .from('v_weekly_bodypart_volume')
    .select('week_start, body_part_id, body_part_name, body_part_color, volume')
    .gte('week_start', from)
    .order('week_start')
  if (bodyPartId) volumeQuery = volumeQuery.eq('body_part_id', bodyPartId)

  // ② 種目別最大重量推移（日次）
  let maxWeightQuery = client
    .from('v_exercise_max_weight')
    .select('date, exercise_id, exercise_name, max_weight')
    .gte('date', from)
    .order('date')
  if (exerciseId) maxWeightQuery = maxWeightQuery.eq('exercise_id', exerciseId)

  // ④ 推定1RM推移（日次）
  let est1rmQuery = client
    .from('v_exercise_est_1rm')
    .select('date, exercise_id, exercise_name, est_1rm')
    .gte('date', from)
    .order('date')
  if (exerciseId) est1rmQuery = est1rmQuery.eq('exercise_id', exerciseId)

  // ③ 週次OVERLOADED（RPC）
  const overloadedQuery = client.rpc('fn_overloaded_report', { p_week: week })

  const [volRes, mwRes, e1Res, ovRes] = await Promise.all([
    volumeQuery,
    maxWeightQuery,
    est1rmQuery,
    overloadedQuery,
  ])
  if (volRes.error) throw createError({ statusCode: 500, statusMessage: volRes.error.message })
  if (mwRes.error) throw createError({ statusCode: 500, statusMessage: mwRes.error.message })
  if (e1Res.error) throw createError({ statusCode: 500, statusMessage: e1Res.error.message })
  if (ovRes.error) throw createError({ statusCode: 500, statusMessage: ovRes.error.message })

  // ① 部位ごとに Series 化
  const volMap = new Map<string, { label: string; color: string; points: { x: string; y: number }[] }>()
  for (const row of (volRes.data ?? []) as any[]) {
    const id: string = row.body_part_id
    if (!volMap.has(id)) volMap.set(id, { label: row.body_part_name, color: row.body_part_color, points: [] })
    volMap.get(id)!.points.push({ x: row.week_start as string, y: Number(row.volume) })
  }

  // ② 種目ごとに Series 化
  const mwMap = new Map<string, { label: string; points: { x: string; y: number }[] }>()
  for (const row of (mwRes.data ?? []) as any[]) {
    const id: string = row.exercise_id
    if (!mwMap.has(id)) mwMap.set(id, { label: row.exercise_name, points: [] })
    mwMap.get(id)!.points.push({ x: row.date as string, y: Number(row.max_weight) })
  }

  // ④ 種目ごとに Series 化
  const e1Map = new Map<string, { label: string; points: { x: string; y: number }[] }>()
  for (const row of (e1Res.data ?? []) as any[]) {
    const id: string = row.exercise_id
    if (!e1Map.has(id)) e1Map.set(id, { label: row.exercise_name, points: [] })
    e1Map.get(id)!.points.push({ x: row.date as string, y: Number(row.est_1rm) })
  }

  // ③ スネーク→キャメル
  const rows: OverloadedRow[] = ((ovRes.data ?? []) as any[]).map((row) => ({
    bodyPartId: row.body_part_id,
    bodyPartName: row.body_part_name,
    bodyPartColor: row.body_part_color,
    thisVolume: Number(row.this_volume),
    prevVolume: row.prev_volume == null ? null : Number(row.prev_volume),
    diff: row.diff == null ? null : Number(row.diff),
    achieved: row.achieved,
    isNew: row.is_new,
  }))

  return {
    volume: { series: Array.from(volMap.values()) },
    maxWeight: { series: Array.from(mwMap.values()) },
    est1rm: { series: Array.from(e1Map.values()) },
    overloaded: { week, rows },
  }
})

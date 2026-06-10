// ダッシュボード: 週次OVERLOADEDレポート（F-05-③）
// fn_overloaded_report RPC を呼び出し、部位ごとの達成状況を返す。
import { serverSupabaseClient } from '#supabase/server'
import type { OverloadedResponse, OverloadedRow } from '#shared/types/api'

export default defineEventHandler(async (event): Promise<OverloadedResponse> => {
  const q = getQuery(event)

  // week 未指定時は今日の日付を使う
  const week = (q.week as string) ?? new Date().toISOString().slice(0, 10)

  // week フォーマット検証
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid week (YYYY-MM-DD)' })
  }

  const client = await serverSupabaseClient(event)

  // fn_overloaded_report RPC 呼び出し（RLSが効くため認証済みユーザーのデータのみ返る）
  const { data, error } = await client.rpc('fn_overloaded_report', { p_week: week })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // スネークケース → キャメルケースにマッピング
  const rows: OverloadedRow[] = ((data ?? []) as any[]).map((row) => ({
    bodyPartId: row.body_part_id,
    bodyPartName: row.body_part_name,
    bodyPartColor: row.body_part_color,
    thisVolume: Number(row.this_volume),
    prevVolume: row.prev_volume == null ? null : Number(row.prev_volume),
    diff: row.diff == null ? null : Number(row.diff),
    achieved: row.achieved,
    isNew: row.is_new,
  }))

  return { week, rows }
})

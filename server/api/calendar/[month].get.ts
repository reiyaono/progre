// カレンダー月次ドット（F-02 / §9.7）。
// 各日の「実施部位」のユニーク色配列を返す（最大4＋n の見せ方はフロント側）。
// 重い集約は Nitro 側＋RLS（api.md §1）。種目を追加した時点で色が出るよう
// workout→workout_exercise→exercise→body_part を辿る（セット未入力でもドット表示）。
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const month = getRouterParam(event, 'month')
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid month (YYYY-MM)' })
  }
  const [y, m] = month.split('-').map(Number) as [number, number]
  const start = `${month}-01`
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('workout')
    .select('date, workout_exercise(exercise(body_part(id,color)))')
    .gte('date', start)
    .lt('date', next)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const days: Record<string, string[]> = {}
  for (const w of (data ?? []) as any[]) {
    const seen = new Set<string>()
    const colors: string[] = []
    for (const we of w.workout_exercise ?? []) {
      const bp = we.exercise?.body_part
      if (bp && !seen.has(bp.id)) {
        seen.add(bp.id)
        colors.push(bp.color)
      }
    }
    days[w.date] = colors
  }
  return { days }
})

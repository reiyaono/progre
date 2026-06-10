// 前回記録参照（§9.4）。指定日(before)より前の「前回トップセット」と全期間自己ベスト重量を返す。
// v_top_set（種目エントリ毎のトップセット）と v_exercise_max_weight（日次最大）を利用。RLS継承。
import { serverSupabaseClient } from '#supabase/server'
import type { LastRecordResponse } from '#shared/types/api'

export default defineEventHandler(async (event): Promise<LastRecordResponse> => {
  const id = getRouterParam(event, 'id')
  const before = getQuery(event).before as string | undefined
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!id || !UUID_RE.test(id)) throw createError({ statusCode: 400, statusMessage: 'invalid exercise id' })
  if (!before || !/^\d{4}-\d{2}-\d{2}$/.test(before)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid before (YYYY-MM-DD)' })
  }
  const client = await serverSupabaseClient(event)

  // 前回トップセット = before より前で最も新しい日のトップセット（重量降順で代表1件）
  const { data: lastRows, error: lErr } = await client
    .from('v_top_set')
    .select('date, weight, reps, workout_exercise_id')
    .eq('exercise_id', id)
    .lt('date', before)
    .order('date', { ascending: false })
    .order('weight', { ascending: false })
    .limit(1)
  if (lErr) throw createError({ statusCode: 500, statusMessage: lErr.message })
  const last = lastRows?.[0]

  // 全期間自己ベスト重量（v_exercise_max_weight の最大）
  const { data: bestRows, error: bErr } = await client
    .from('v_exercise_max_weight')
    .select('max_weight')
    .eq('exercise_id', id)
    .order('max_weight', { ascending: false })
    .limit(1)
  if (bErr) throw createError({ statusCode: 500, statusMessage: bErr.message })
  const best = bestRows?.[0]

  return {
    lastTopSet: last
      ? {
          date: last.date as string,
          weight: Number(last.weight),
          reps: Number(last.reps),
          workoutExerciseId: last.workout_exercise_id as string,
        }
      : null,
    bestWeight: best ? Number(best.max_weight) : null,
  }
})

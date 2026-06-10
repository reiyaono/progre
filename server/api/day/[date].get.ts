// 日別ワークアウト（F-04）。その日の種目エントリ一覧＋各トップセット/ボリュームを返す。
// 集計は Nitro 側＋RLS（api.md §1）。トップセットは v_top_set、ボリューム合算は v_set_detail。
import { serverSupabaseClient } from '#supabase/server'
import type { DayResponse } from '#shared/types/api'

export default defineEventHandler(async (event): Promise<DayResponse> => {
  const date = getRouterParam(event, 'date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid date (YYYY-MM-DD)' })
  }
  const client = await serverSupabaseClient(event)

  // 当日の workout（場所 workout_place→place も結合）
  const { data: workout, error: wErr } = await client
    .from('workout').select('id, workout_place(place(name))').eq('date', date).maybeSingle()
  if (wErr) throw createError({ statusCode: 500, statusMessage: wErr.message })
  if (!workout) return { workoutId: null, place: null, entries: [] }
  // workout_place / place は to-one だが PostgREST が配列で返す場合にも備える
  const wpRaw = (workout as any).workout_place
  const wp = Array.isArray(wpRaw) ? wpRaw[0] : wpRaw
  const placeRaw = wp?.place
  const placeObj = Array.isArray(placeRaw) ? placeRaw[0] : placeRaw
  const place: string | null = placeObj?.name ?? null

  // 種目エントリ（exercise / body_part を結合。有酸素判定に name も取得）
  const { data: entriesRaw, error: eErr } = await client
    .from('workout_exercise')
    .select('id, memo, sort_order, exercise(id, name, body_part(name, color))')
    .eq('workout_id', workout.id)
    .order('sort_order')
  if (eErr) throw createError({ statusCode: 500, statusMessage: eErr.message })

  const entries = (entriesRaw ?? []) as any[]
  const weIds = entries.map((e) => e.id)

  // トップセット（v_top_set・筋トレのみ）／ボリューム・時間・件数（v_set_detail）を取得
  const topByWe = new Map<string, { weight: number; reps: number }>()
  const volByWe = new Map<string, number>()
  const durByWe = new Map<string, number>()
  const cntByWe = new Map<string, number>()
  if (weIds.length) {
    const [tops, sets] = await Promise.all([
      client.from('v_top_set').select('workout_exercise_id, weight, reps').in('workout_exercise_id', weIds),
      client.from('v_set_detail').select('workout_exercise_id, volume, duration_sec').in('workout_exercise_id', weIds),
    ])
    if (tops.error) throw createError({ statusCode: 500, statusMessage: tops.error.message })
    if (sets.error) throw createError({ statusCode: 500, statusMessage: sets.error.message })
    for (const t of tops.data ?? []) {
      topByWe.set(t.workout_exercise_id as string, { weight: Number(t.weight), reps: Number(t.reps) })
    }
    for (const s of sets.data ?? []) {
      const we = s.workout_exercise_id as string
      volByWe.set(we, (volByWe.get(we) ?? 0) + Number(s.volume ?? 0))
      if (s.duration_sec != null) durByWe.set(we, (durByWe.get(we) ?? 0) + Number(s.duration_sec))
      cntByWe.set(we, (cntByWe.get(we) ?? 0) + 1)
    }
  }

  return {
    workoutId: workout.id,
    place,
    entries: entries.map((e) => {
      const isCardio = e.exercise?.body_part?.name === '有酸素'
      return {
        workoutExerciseId: e.id,
        exerciseId: e.exercise?.id,
        exerciseName: e.exercise?.name,
        bodyPartColor: e.exercise?.body_part?.color ?? '#999999',
        memo: e.memo,
        sortOrder: e.sort_order,
        measureType: isCardio ? 'cardio' : 'strength',
        topSet: isCardio ? null : topByWe.get(e.id) ?? null,
        volume: isCardio ? 0 : volByWe.get(e.id) ?? 0,
        durationSec: isCardio ? durByWe.get(e.id) ?? 0 : null,
        setCount: cntByWe.get(e.id) ?? 0,
      }
    }),
  }
})

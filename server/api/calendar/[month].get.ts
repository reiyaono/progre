// カレンダー月次（F-02 / §9.7）。
// その月の「ドット（実施部位色）」＋「各日の種目メニュー」＋「場所」を1回でまとめて返す。
// 日付タップごとの /api/day 往復をなくし、以降はクライアントキャッシュで即時表示する。
// 重い集約は Nitro 側＋RLS（api.md §1）。集計は v_top_set / v_set_detail を月範囲で取得。
import { serverSupabaseClient } from '#supabase/server'
import type { CalendarMonthResponse, DayEntry } from '#shared/types/api'

export default defineEventHandler(async (event): Promise<CalendarMonthResponse> => {
  const month = getRouterParam(event, 'month')
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid month (YYYY-MM)' })
  }
  const [y, m] = month.split('-').map(Number) as [number, number]
  const start = `${month}-01`
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

  const client = await serverSupabaseClient(event)

  // ① その月の workout＋種目メタ（場所・部位・方法も結合。セット未入力でもエントリは出す）
  // ② 集計（v_top_set＝トップセット / v_set_detail＝ボリューム・時間・件数・最大回数）
  // をまとめて並列取得（月範囲フィルタ＝RLSでユーザーに限定）。
  const [wRes, topRes, setRes, supRes] = await Promise.all([
    client
      .from('workout')
      .select(
        'date, workout_place(place(name)), workout_exercise(id, memo, sort_order, exercise(id, name, body_part(id, name, color), training_method(name)))',
      )
      .gte('date', start)
      .lt('date', next),
    client.from('v_top_set').select('workout_exercise_id, weight, reps').gte('date', start).lt('date', next),
    client
      .from('v_set_detail')
      .select('workout_exercise_id, volume, duration_sec, weight, reps')
      .gte('date', start)
      .lt('date', next),
    // サプリ摂取のある日（💊マーク用）。日付だけ取得して集合化。
    client.from('supplement_intake').select('date').gte('date', start).lt('date', next),
  ])
  if (wRes.error) throw createError({ statusCode: 500, statusMessage: wRes.error.message })
  if (topRes.error) throw createError({ statusCode: 500, statusMessage: topRes.error.message })
  if (setRes.error) throw createError({ statusCode: 500, statusMessage: setRes.error.message })

  // 摂取のある日付集合（💊マーク）。非必須機能のため、テーブル未適用等で失敗しても
  // カレンダー本体は壊さず空で返す（本番マイグレーション未適用時のフォールバック）。
  const supplements: Record<string, boolean> = {}
  if (!supRes.error) {
    for (const r of supRes.data ?? []) supplements[r.date as string] = true
  }

  // workout_exercise_id ごとの集計マップ（day API と同一ロジック）
  const topByWe = new Map<string, { weight: number; reps: number }>()
  const volByWe = new Map<string, number>()
  const durByWe = new Map<string, number>()
  const cntByWe = new Map<string, number>()
  const repsByWe = new Map<string, number>() // 自重: 最大回数
  for (const t of topRes.data ?? []) {
    topByWe.set(t.workout_exercise_id as string, { weight: Number(t.weight), reps: Number(t.reps) })
  }
  for (const s of setRes.data ?? []) {
    const we = s.workout_exercise_id as string
    volByWe.set(we, (volByWe.get(we) ?? 0) + Number(s.volume ?? 0))
    if (s.duration_sec != null) durByWe.set(we, (durByWe.get(we) ?? 0) + Number(s.duration_sec))
    if (s.weight == null && s.reps != null) {
      repsByWe.set(we, Math.max(repsByWe.get(we) ?? 0, Number(s.reps)))
    }
    cntByWe.set(we, (cntByWe.get(we) ?? 0) + 1)
  }

  const days: Record<string, string[]> = {}
  const entries: Record<string, DayEntry[]> = {}
  const places: Record<string, string | null> = {}

  for (const w of (wRes.data ?? []) as any[]) {
    const date = w.date as string

    // 場所（to-one だが PostgREST が配列で返す場合にも備える）
    const wpRaw = w.workout_place
    const wp = Array.isArray(wpRaw) ? wpRaw[0] : wpRaw
    const placeRaw = wp?.place
    const placeObj = Array.isArray(placeRaw) ? placeRaw[0] : placeRaw
    places[date] = placeObj?.name ?? null

    // sort_order 昇順で種目メニュー＋ドット色を構築
    const wes = [...(w.workout_exercise ?? [])].sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    )
    const list: DayEntry[] = []
    const seenBp = new Set<string>()
    const colors: string[] = []
    for (const e of wes) {
      const bp = e.exercise?.body_part
      const isCardio = bp?.name === '有酸素'
      const isBodyweight = !isCardio && e.exercise?.training_method?.name === '自重'
      const measureType = isCardio ? 'cardio' : isBodyweight ? 'bodyweight' : 'strength'
      const color: string = bp?.color ?? '#999999'
      list.push({
        workoutExerciseId: e.id,
        exerciseId: e.exercise?.id,
        exerciseName: e.exercise?.name,
        bodyPartColor: color,
        memo: e.memo,
        sortOrder: e.sort_order,
        measureType,
        topSet: measureType === 'strength' ? topByWe.get(e.id) ?? null : null,
        volume: measureType === 'strength' ? volByWe.get(e.id) ?? 0 : 0,
        durationSec: isCardio ? durByWe.get(e.id) ?? 0 : null,
        topReps: isBodyweight ? repsByWe.get(e.id) ?? 0 : null,
        setCount: cntByWe.get(e.id) ?? 0,
      })
      // ドット: 部位IDでユニーク化（セット未入力でも色は出す）
      if (bp?.id && !seenBp.has(bp.id)) {
        seenBp.add(bp.id)
        colors.push(color)
      }
    }
    entries[date] = list
    days[date] = colors
  }

  return { days, entries, places, supplements }
})

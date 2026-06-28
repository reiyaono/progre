#!/usr/bin/env node
// prod の対象ユーザーの全データを JSON スナップショットとして書き出す（読み取りのみ）。
// 使い方: node migration/backup_user_data.mjs
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '..', '.env.production') })

const USER_ID = 'de0af00d-496f-4cfc-87e2-900a4a24fd71'
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const die = (m) => { console.error('❌ ' + m); process.exit(1) }
const PAGE = 1000
// PostgREST のデフォルト上限(1000)を超える場合に備え range でページング。
// val が配列なら 200件ずつに分割（URL長/IN句対策）して結合。
const selChunk = async (table, col, val) => {
  const out = []
  let from = 0
  for (;;) {
    let q = sb.from(table).select('*').range(from, from + PAGE - 1)
    q = Array.isArray(val) ? q.in(col, val) : q.eq(col, val)
    const { data, error } = await q
    if (error) die(`${table}: ${error.message}`)
    out.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}
const sel = async (table, col, val) => {
  if (!Array.isArray(val)) return selChunk(table, col, val)
  const out = []
  for (let i = 0; i < val.length; i += 200) out.push(...(await selChunk(table, col, val.slice(i, i + 200))))
  return out
}

const snap = {}
snap.body_part = await sel('body_part', 'user_id', USER_ID)
snap.training_method = await sel('training_method', 'user_id', USER_ID)
snap.exercise = await sel('exercise', 'user_id', USER_ID)
snap.workout = await sel('workout', 'user_id', USER_ID)
const workoutIds = snap.workout.map((w) => w.id)
snap.workout_exercise = workoutIds.length ? await sel('workout_exercise', 'workout_id', workoutIds) : []
const weIds = snap.workout_exercise.map((we) => we.id)
snap.workout_set = weIds.length ? await sel('workout_set', 'workout_exercise_id', weIds) : []
snap.workout_place = workoutIds.length ? await sel('workout_place', 'workout_id', workoutIds) : []
// 任意マスタ系（存在すれば）
for (const t of ['place', 'supplement', 'supplement_timing', 'supplement_intake']) {
  try { snap[t] = await sel(t, 'user_id', USER_ID) } catch { snap[t] = [] }
}

const counts = Object.fromEntries(Object.entries(snap).map(([k, v]) => [k, v.length]))
const out = { exported_at_user_local: 'see filename', user_id: USER_ID, counts, data: snap }
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const file = resolve(__dirname, `prod_backup_${USER_ID.slice(0, 8)}_${stamp}.json`)
writeFileSync(file, JSON.stringify(out, null, 2))
console.log('件数:', counts)
console.log('保存:', file)

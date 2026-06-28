#!/usr/bin/env node
// 現在の prod の対象ユーザーデータを supabase/seed.sql として書き出す。
// ローカル `supabase db reset` 時に自動ロードされ、固定UUIDの auth ユーザーで
// ログインして本番同等のデータを確認できる。
//
// 使い方:
//   SEED_EMAIL=me@example.com SEED_PASSWORD=mypassword \
//     node migration/generate_seed.mjs
//
// 読み取りのみ（prod へ書き込まない）。出力先: supabase/seed.sql
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
dotenv.config({ path: resolve(REPO_ROOT, '.env.production') })

const USER_ID = 'de0af00d-496f-4cfc-87e2-900a4a24fd71'
// ローカル専用の throwaway 資格情報（公開リポジトリに入っても無害なダミー）。
// 自分用に変えたい場合は SEED_EMAIL / SEED_PASSWORD を環境変数で渡して再生成する
// （その生成物はコミットしないこと）。
const EMAIL = process.env.SEED_EMAIL || 'local@example.com'
const PASSWORD = process.env.SEED_PASSWORD || 'localdev1234'
if (PASSWORD.length < 8) { console.error('❌ password は8文字以上'); process.exit(1) }

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const die = (m) => { console.error('❌ ' + m); process.exit(1) }

const PAGE = 1000
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

// SQL リテラル整形
const lit = (v) => {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
  return `'${String(v).replace(/'/g, "''")}'`
}
// 列順を固定して INSERT 文を生成
const insertStmts = (table, rows, cols) => {
  if (!rows.length) return `-- ${table}: 0 行\n`
  const colList = cols.join(', ')
  const lines = rows.map((r) => `  (${cols.map((c) => lit(r[c])).join(', ')})`)
  // 1000行ずつに分割（巨大 VALUES 対策）
  const CH = 1000
  let out = ''
  for (let i = 0; i < lines.length; i += CH) {
    out += `insert into public.${table} (${colList}) values\n` + lines.slice(i, i + CH).join(',\n') + ';\n'
  }
  return `-- ${table}: ${rows.length} 行\n` + out
}

// --- データ取得（現在の prod 状態） ---
const bodyPart = await sel('body_part', 'user_id', USER_ID)
const method = await sel('training_method', 'user_id', USER_ID)
const exercise = await sel('exercise', 'user_id', USER_ID)
const workout = await sel('workout', 'user_id', USER_ID)
const wIds = workout.map((w) => w.id)
const we = wIds.length ? await sel('workout_exercise', 'workout_id', wIds) : []
const weIds = we.map((x) => x.id)
const set = weIds.length ? await sel('workout_set', 'workout_exercise_id', weIds) : []
const place = await sel('place', 'user_id', USER_ID)
const workoutPlace = wIds.length ? await sel('workout_place', 'workout_id', wIds) : []
const supplement = await sel('supplement', 'user_id', USER_ID)
const supTiming = await sel('supplement_timing', 'user_id', USER_ID)
const supIntake = await sel('supplement_intake', 'user_id', USER_ID)

const counts = { bodyPart: bodyPart.length, method: method.length, exercise: exercise.length, workout: workout.length, we: we.length, set: set.length, place: place.length, workoutPlace: workoutPlace.length, supplement: supplement.length, supTiming: supTiming.length, supIntake: supIntake.length }
console.log('取得件数:', counts)

// --- 列定義（スキーマ準拠・明示順） ---
const COLS = {
  body_part: ['id', 'user_id', 'name', 'color', 'sort_order', 'is_archived', 'created_at'],
  training_method: ['id', 'user_id', 'name', 'sort_order', 'is_archived', 'created_at'],
  exercise: ['id', 'user_id', 'name', 'body_part_id', 'training_method_id', 'sort_order', 'is_archived', 'created_at'],
  workout: ['id', 'user_id', 'date', 'created_at'],
  workout_exercise: ['id', 'workout_id', 'exercise_id', 'sort_order', 'memo', 'created_at'],
  workout_set: ['id', 'workout_exercise_id', 'set_no', 'weight', 'reps', 'interval_sec', 'duration_sec', 'created_at'],
  place: ['id', 'user_id', 'name', 'is_archived', 'created_at'],
  workout_place: ['workout_id', 'place_id', 'created_at'],
  supplement: ['id', 'user_id', 'name', 'sort_order', 'is_archived', 'created_at'],
  supplement_timing: ['id', 'user_id', 'name', 'sort_order', 'is_archived', 'created_at'],
  supplement_intake: ['id', 'user_id', 'date', 'supplement_id', 'timing_id', 'quantity', 'sort_order', 'created_at'],
}

const sql = `-- ============================================================================
-- supabase/seed.sql — 本番 user(${USER_ID}) の現状スナップショット（ローカル確認用）
-- 自動生成: migration/generate_seed.mjs（手で編集しない）
-- 取得件数: ${JSON.stringify(counts)}
--
-- ローカル専用ログイン（throwaway・公開可のダミー）: email=${EMAIL} / password=${PASSWORD}
-- ※本物の資格情報ではない。変えたい場合は SEED_EMAIL/SEED_PASSWORD を渡して再生成（生成物は非コミット）。
-- 仕組み: 固定UUIDで auth ユーザーを作成 → on_auth_user_created トリガが入れる
--         デフォルトマスタを削除 → 本番スナップショットを投入。
-- 冪等: 主要 insert は同一UUIDで再投入時 on conflict do nothing。
-- ============================================================================
begin;

-- 1) auth ユーザー（固定UUID）。pgcrypto で bcrypt パスワード。
-- token系の text 列は NULL だと GoTrue が scan に失敗するため '' を明示する。
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
  confirmation_token, recovery_token,
  email_change_token_new, email_change, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '${USER_ID}',
  'authenticated', 'authenticated',
  ${lit(EMAIL)},
  crypt(${lit(PASSWORD)}, gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  false, false,
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

-- email/password ログインに必要な identity
insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  '${USER_ID}',
  '${USER_ID}',
  ${lit({ sub: USER_ID, email: EMAIL, email_verified: true, phone_verified: false })},
  'email', now(), now(), now()
) on conflict (provider_id, provider) do nothing;

-- 2) トリガが入れたデフォルトマスタを掃除（cascade で子も消える）
delete from public.supplement_intake where user_id = '${USER_ID}';
delete from public.workout            where user_id = '${USER_ID}';
delete from public.exercise           where user_id = '${USER_ID}';
delete from public.place              where user_id = '${USER_ID}';
delete from public.supplement         where user_id = '${USER_ID}';
delete from public.supplement_timing  where user_id = '${USER_ID}';
delete from public.body_part          where user_id = '${USER_ID}';
delete from public.training_method    where user_id = '${USER_ID}';

-- 3) 本番スナップショット投入（親→子）
${insertStmts('body_part', bodyPart, COLS.body_part)}
${insertStmts('training_method', method, COLS.training_method)}
${insertStmts('exercise', exercise, COLS.exercise)}
${insertStmts('place', place, COLS.place)}
${insertStmts('supplement', supplement, COLS.supplement)}
${insertStmts('supplement_timing', supTiming, COLS.supplement_timing)}
${insertStmts('workout', workout, COLS.workout)}
${insertStmts('workout_exercise', we, COLS.workout_exercise)}
${insertStmts('workout_set', set, COLS.workout_set)}
${insertStmts('workout_place', workoutPlace, COLS.workout_place)}
${insertStmts('supplement_intake', supIntake, COLS.supplement_intake)}
commit;
`

const outPath = resolve(REPO_ROOT, 'supabase', 'seed.sql')
writeFileSync(outPath, sql)
console.log('書き出し:', outPath, `(${(sql.length / 1024).toFixed(0)} KB)`)

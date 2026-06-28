#!/usr/bin/env node
// 旧アプリ CSV → prod Supabase 移行スクリプト（1回限り・冪等）
//
// 使い方:
//   1) リポジトリ直下に .env.production を作成（gitignore 済み）:
//        SUPABASE_URL=https://hzcodjzvjsivdqdvrsff.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=<prod service-role key>
//   2) ドライラン（書き込みなし、集計のみ）:
//        node migration/import_to_prod.mjs --dry-run
//   3) 本実行:
//        node migration/import_to_prod.mjs
//
// service-role で接続するため RLS をバイパスし、全行に user_id を明示挿入する。
// 全 insert は UNIQUE 制約 + upsert(onConflict) で冪等。再実行しても重複しない。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

dotenv.config({ path: resolve(REPO_ROOT, '.env.production') })

// ---- 定数 ----------------------------------------------------------------
const USER_ID = 'de0af00d-496f-4cfc-87e2-900a4a24fd71'
const CUTOFF = '2026-03-14' // この日より前（exclusive）のみ対象
const CSV_PATH = resolve(__dirname, 'ovld_export_2026-06-28T060206.csv')
const DRY_RUN = process.argv.includes('--dry-run')
const ALLOW_LOCAL = process.argv.includes('--allow-local')
// CSV 部位名 → prod body_part 名 のマッピング（腹筋→腹、他は同名）
const BODY_PART_ALIAS = { 腹筋: '腹' }
const METHOD_NAMES = ['フリーウェイト', 'マシン', '自重']
const CHUNK = 500

// ---- ユーティリティ ------------------------------------------------------
const log = (...a) => console.log(...a)
const die = (msg) => { console.error('\n❌ ' + msg); process.exit(1) }
const roundQuarter = (w) => Math.round(w * 4) / 4

function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

async function upsertAll(sb, table, rows, onConflict) {
  const out = []
  for (const part of chunk(rows, CHUNK)) {
    const { data, error } = await sb
      .from(table)
      .upsert(part, { onConflict, ignoreDuplicates: false })
      .select()
    if (error) die(`upsert ${table} 失敗: ${error.message}`)
    out.push(...data)
  }
  return out
}

// ---- CSV パース ----------------------------------------------------------
// 値にカンマ/引用符を含まない単純CSV（調査済み）。改行 \r も除去。
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  lines.shift() // ヘッダ除去
  return lines.map((line) => {
    const [date, name, bodyPart, type, setIdx, weight, reps] = line.split(',')
    return {
      date,
      name,
      bodyPart,
      type,
      setIdx: Number(setIdx),
      weight: Number(weight),
      reps: Number(reps),
    }
  })
}

// ---- セット値の正規化 ----------------------------------------------------
// 戻り値 null = スキップ。それ以外 = { weight, reps, duration_sec }
const stats = { strength: 0, bodyweight: 0, cardio: 0, skippedReps0: 0, rounded: 0 }
function normalizeSet(row) {
  if (row.bodyPart === '有酸素') {
    stats.cardio++
    return { weight: null, reps: null, duration_sec: Math.round(row.reps) * 60 }
  }
  if (row.reps === 0) {
    stats.skippedReps0++
    return null
  }
  if (row.weight === 0) {
    stats.bodyweight++
    return { weight: null, reps: row.reps, duration_sec: null }
  }
  const w = roundQuarter(row.weight)
  if (w !== row.weight) stats.rounded++
  if (w < 0 || w > 999) die(`重量が範囲外: ${row.date} ${row.name} ${row.weight}`)
  if (row.reps < 1 || row.reps > 99) die(`回数が範囲外: ${row.date} ${row.name} ${row.reps}`)
  stats.strength++
  return { weight: w, reps: row.reps, duration_sec: null }
}

// ---- メイン --------------------------------------------------------------
async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) die('.env.production に SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください')
  if (/127\.0\.0\.1|localhost/.test(url) && !ALLOW_LOCAL) {
    die(`SUPABASE_URL が local を指しています (${url})。prod の URL を設定してください（テスト目的なら --allow-local）`)
  }
  log(`接続先: ${url}`)
  log(`対象 user_id: ${USER_ID}`)
  log(`対象範囲: date < ${CUTOFF}`)
  log(DRY_RUN ? '【DRY-RUN】書き込みは行いません\n' : '【本実行】prod に書き込みます\n')

  const sb = createClient(url, key, { auth: { persistSession: false } })

  // --- CSV 読み込み・絞り込み ---
  const all = parseCsv(readFileSync(CSV_PATH, 'utf8'))
  const rows = all.filter((r) => r.date < CUTOFF)
  log(`CSV 全 ${all.length} 行 → 対象 ${rows.length} 行`)

  // --- 既存マスタ取得 ---
  const fetchMaster = async (table) => {
    const { data, error } = await sb.from(table).select('*').eq('user_id', USER_ID)
    if (error) die(`${table} 取得失敗: ${error.message}（service-role キー/URL を確認）`)
    return data
  }
  const bodyParts = await fetchMaster('body_part')
  let methods = await fetchMaster('training_method')
  let exercises = await fetchMaster('exercise')
  const bpByName = new Map(bodyParts.map((b) => [b.name, b]))
  log(`既存マスタ: body_part=${bodyParts.length}, training_method=${methods.length}, exercise=${exercises.length}`)

  // --- body_part 解決（CSV部位名 → エイリアス → 既存id） ---
  const csvBodyParts = [...new Set(rows.map((r) => r.bodyPart))]
  const bpResolve = new Map() // csvName -> body_part row
  const missingBp = []
  for (const csvName of csvBodyParts) {
    const target = BODY_PART_ALIAS[csvName] ?? csvName
    const bp = bpByName.get(target)
    if (!bp) missingBp.push(`${csvName}${target !== csvName ? `→${target}` : ''}`)
    else bpResolve.set(csvName, bp)
  }
  log('\n部位マッピング:')
  for (const [c, bp] of bpResolve) log(`  ${c} → ${bp.name} (${bp.id})`)
  if (missingBp.length) die(`prod に存在しない部位があります: ${missingBp.join(', ')}（先にマスタ追加が必要）`)

  // --- training_method 解決（不足は作成） ---
  const usedMethods = [...new Set(rows.map((r) => r.type))]
  const methodByName = new Map(methods.map((m) => [m.name, m]))
  const methodsToCreate = usedMethods.filter((m) => !methodByName.has(m))
  if (methodsToCreate.length) {
    log(`\n作成予定 training_method: ${methodsToCreate.join(', ')}`)
    if (!DRY_RUN) {
      const baseOrder = methods.reduce((mx, m) => Math.max(mx, m.sort_order), 0)
      const created = await upsertAll(
        sb,
        'training_method',
        methodsToCreate.map((name, i) => ({ user_id: USER_ID, name, sort_order: baseOrder + 1 + i })),
        'id'
      )
      methods = methods.concat(created)
      created.forEach((m) => methodByName.set(m.name, m))
    }
  }

  // --- exercise 解決（name で照合、不足は作成） ---
  // 各 name の (部位, タイプ) は CSV 内 1:1（調査済み）
  const exMeta = new Map() // name -> { bodyPart, type }
  for (const r of rows) if (!exMeta.has(r.name)) exMeta.set(r.name, { bodyPart: r.bodyPart, type: r.type })
  const exByName = new Map(exercises.map((e) => [e.name, e]))
  const toCreate = [...exMeta.keys()].filter((n) => !exByName.has(n))
  const reused = [...exMeta.keys()].filter((n) => exByName.has(n))
  log(`\n種目: 既存再利用 ${reused.length} / 新規作成 ${toCreate.length}`)
  log('  再利用: ' + (reused.join(', ') || '(なし)'))
  log('  新規作成:')
  for (const n of toCreate) {
    const meta = exMeta.get(n)
    log(`    ${n}  [${meta.bodyPart} / ${meta.type}]`)
  }

  if (!DRY_RUN && toCreate.length) {
    const baseOrder = exercises.reduce((mx, e) => Math.max(mx, e.sort_order), 0)
    const payload = toCreate.map((name, i) => {
      const meta = exMeta.get(name)
      return {
        user_id: USER_ID,
        name,
        body_part_id: bpResolve.get(meta.bodyPart).id,
        training_method_id: methodByName.get(meta.type)?.id ?? null,
        sort_order: baseOrder + 1 + i,
      }
    })
    const created = await upsertAll(sb, 'exercise', payload, 'id')
    exercises = exercises.concat(created)
    created.forEach((e) => exByName.set(e.name, e))
  }

  // --- レコード正規化・グルーピング ---
  // 行順を保持して (date, name) ごとにセット配列を作る
  const groups = new Map() // key=date|name -> { date, name, sets: [{weight,reps,duration_sec}] }
  const dateSet = new Set()
  const dateExerciseOrder = new Map() // date -> [name...] 初出順
  for (const r of rows) {
    dateSet.add(r.date)
    const ns = normalizeSet(r)
    if (!ns) continue
    const key = r.date + '|' + r.name
    if (!groups.has(key)) {
      groups.set(key, { date: r.date, name: r.name, sets: [] })
      if (!dateExerciseOrder.has(r.date)) dateExerciseOrder.set(r.date, [])
      dateExerciseOrder.get(r.date).push(r.name)
    }
    groups.get(key).sets.push(ns)
  }
  // 全セットがスキップされた (date,name) は除外
  for (const [key, g] of groups) if (g.sets.length === 0) groups.delete(key)

  const totalSets = [...groups.values()].reduce((s, g) => s + g.sets.length, 0)
  log('\n=== 集計 ===')
  log(`workout(日数)       : ${dateSet.size}`)
  log(`workout_exercise    : ${groups.size}`)
  log(`workout_set         : ${totalSets}`)
  log(`  筋トレ            : ${stats.strength}`)
  log(`  自重              : ${stats.bodyweight}`)
  log(`  有酸素            : ${stats.cardio}`)
  log(`  スキップ(回数0)   : ${stats.skippedReps0}`)
  log(`  重量を0.25へ丸め  : ${stats.rounded}`)

  if (DRY_RUN) {
    log('\n【DRY-RUN 完了】書き込みは行っていません。内容を確認のうえ本実行してください。')
    return
  }

  // --- workout upsert ---
  const dates = [...dateSet].sort()
  const wRows = await upsertAll(sb, 'workout', dates.map((date) => ({ user_id: USER_ID, date })), 'user_id,date')
  const workoutIdByDate = new Map(wRows.map((w) => [w.date, w.id]))
  log(`\nworkout upsert: ${wRows.length}`)

  // --- workout_exercise upsert ---
  const wePayload = []
  for (const [date, names] of dateExerciseOrder) {
    const wid = workoutIdByDate.get(date)
    names.forEach((name, idx) => {
      // 全スキップで消えた (date,name) は groups に無いので除外
      if (!groups.has(date + '|' + name)) return
      wePayload.push({ workout_id: wid, exercise_id: exByName.get(name).id, sort_order: idx })
    })
  }
  const weRows = await upsertAll(sb, 'workout_exercise', wePayload, 'workout_id,exercise_id')
  const weIdByPair = new Map(weRows.map((we) => [we.workout_id + '|' + we.exercise_id, we.id]))
  log(`workout_exercise upsert: ${weRows.length}`)

  // --- workout_set upsert（set_no を 1..n で振り直し） ---
  const setPayload = []
  for (const g of groups.values()) {
    const wid = workoutIdByDate.get(g.date)
    const eid = exByName.get(g.name).id
    const weId = weIdByPair.get(wid + '|' + eid)
    g.sets.forEach((s, i) => {
      setPayload.push({
        workout_exercise_id: weId,
        set_no: i + 1,
        weight: s.weight,
        reps: s.reps,
        duration_sec: s.duration_sec,
      })
    })
  }
  const setRows = await upsertAll(sb, 'workout_set', setPayload, 'workout_exercise_id,set_no')
  log(`workout_set upsert: ${setRows.length}`)

  // --- 投入後の検証 ---
  const countFor = async (table, col, ids) => {
    // 簡易: 直接 count は別途。ここでは挿入件数で確認済みとする。
  }
  log('\n=== 検証（prod 件数）===')
  const { count: woCount } = await sb
    .from('workout').select('*', { count: 'exact', head: true })
    .eq('user_id', USER_ID).lt('date', CUTOFF)
  log(`workout (date < ${CUTOFF}): ${woCount}`)

  log('\n✅ 移行完了')
}

main().catch((e) => die(e?.stack || String(e)))

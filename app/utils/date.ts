// JST 固定の日付ユーティリティ（frontend.md §3・§9.6）。
// 端末TZに依存させず、すべて Asia/Tokyo 基準で「暦日(YYYY-MM-DD)」を扱う。
// 日本にDSTは無いため、暦日演算は UTC midnight 上で行えば安全にずれない。
// 週境界は DB の fn_week_start（日曜始まり）と同一規則にそろえる。

export type IsoDate = string // 'YYYY-MM-DD'

const JST_TZ = 'Asia/Tokyo'

/** 今日の JST 暦日を 'YYYY-MM-DD' で返す。 */
export function todayJst(): IsoDate {
  // en-CA ロケールは 'YYYY-MM-DD' 形式を返す。
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: JST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** 'YYYY-MM-DD' を UTC midnight の Date に変換（暦日演算の内部表現）。 */
function parseIso(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d))
}

/** UTC midnight の Date を 'YYYY-MM-DD' に整形。 */
function toIso(dt: Date): IsoDate {
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 暦日に日数を加減算した 'YYYY-MM-DD' を返す。 */
export function addDays(date: IsoDate, days: number): IsoDate {
  const dt = parseIso(date)
  dt.setUTCDate(dt.getUTCDate() + days)
  return toIso(dt)
}

/**
 * 週開始日（日曜）を返す。DB の fn_week_start と同規則。
 * 例: weekStartJst('2026-06-06'(土)) = '2026-05-31'(日)
 *     weekStartJst('2026-06-07'(日)) = '2026-06-07'(日)
 */
export function weekStartJst(date: IsoDate): IsoDate {
  const dt = parseIso(date)
  const dow = dt.getUTCDay() // 0=日 .. 6=土
  return addDays(date, -dow)
}

/** 月初の 'YYYY-MM-01' を返す（month は 'YYYY-MM' か 'YYYY-MM-DD'）。 */
export function monthStart(month: string): IsoDate {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return `${y}-${String(m).padStart(2, '0')}-01`
}

/** 表示用に 'YYYY-MM-DD' を 'YYYY/M/D（曜）' へ整形（JST曜日）。 */
const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土']
export function formatJst(date: IsoDate): string {
  const dt = parseIso(date)
  return `${dt.getUTCFullYear()}/${dt.getUTCMonth() + 1}/${dt.getUTCDate()}（${WEEKDAY_JA[dt.getUTCDay()]}）`
}

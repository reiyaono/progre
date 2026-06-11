// server/api と app（composable/コンポーネント）で共有するレスポンス型。
// Nuxt 4 の shared/ に置き、両側から #shared/types/api で参照する。

export interface DayEntry {
  workoutExerciseId: string
  exerciseId: string
  exerciseName: string
  bodyPartColor: string
  memo: string | null
  sortOrder: number
  measureType: 'strength' | 'cardio' | 'bodyweight' // 有酸素は分のみ／自重は回数のみ
  topSet: { weight: number; reps: number } | null // 筋トレのみ
  volume: number // 筋トレのみ（有酸素・自重は0）
  durationSec: number | null // 有酸素の合計秒
  topReps: number | null // 自重の最大回数（筋トレ・有酸素は null）
  setCount: number
}

export interface DayResponse {
  workoutId: string | null
  place: string | null // ワークアウトの場所名（1:1）
  entries: DayEntry[]
}

// カレンダー月次（F-02）。ドット＋その月の全日メニューを1回でまとめ取得し、
// 日付タップ時のネット往復をなくす（クライアントキャッシュで即時表示）。
export interface CalendarMonthResponse {
  days: Record<string, string[]> // 'YYYY-MM-DD' -> 実施部位のユニーク色配列（ドット用）
  entries: Record<string, DayEntry[]> // 'YYYY-MM-DD' -> その日の種目メニュー
  places: Record<string, string | null> // 'YYYY-MM-DD' -> 場所名
}

export interface LastRecordResponse {
  // workoutExerciseId は前回セット編集画面へのリンク用
  lastTopSet: { date: string; weight: number; reps: number; workoutExerciseId: string } | null
  bestWeight: number | null
}

// ---- ダッシュボード（M5・F-05） --------------------------------------------
// 推移系3指標は共通の Series 形で返し、<LineChart> で共用する（frontend.md §2）。
export interface SeriesPoint {
  x: string // 'YYYY-MM-DD'（週次は週開始日／日次はその日）
  y: number
}
export interface Series {
  label: string // 系列名（部位名 or 種目名）
  color?: string // 線の色（部位色など。無ければフロントで自動採番）
  points: SeriesPoint[]
}

/** ① 部位別ボリューム推移（週次・部位ごとの系列） */
export interface VolumeResponse {
  series: Series[]
}
/** ② 種目別最大重量推移（日次・種目ごとの系列） */
export interface MaxWeightResponse {
  series: Series[]
}
/** ④ 推定1RM/Max推移（日次・種目ごとの系列） */
export interface Est1rmResponse {
  series: Series[]
}

/** ③ 週次OVERLOADEDレポート（fn_overloaded_report の行） */
export interface OverloadedRow {
  bodyPartId: string
  bodyPartName: string
  bodyPartColor: string
  thisVolume: number
  prevVolume: number | null
  diff: number | null
  achieved: boolean
  isNew: boolean // 先週データ無し→「New（比較対象なし）」（§9.2）
}
export interface OverloadedResponse {
  week: string // 正規化済みの週開始日（日曜）
  rows: OverloadedRow[]
}

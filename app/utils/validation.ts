// セット入力の事前バリデーション（§9.1）。最終防衛は workout_set の DB CHECK。
//   weight  : 0..999, 0.25刻み（自重種目は 0 可）
//   reps    : 1..99 の整数
//   interval: 任意（null/未入力可）, 0以上の整数

export function isValidWeight(w: number): boolean {
  return Number.isFinite(w) && w >= 0 && w <= 999 && Number.isInteger(w * 4)
}

export function isValidReps(r: number): boolean {
  return Number.isInteger(r) && r >= 1 && r <= 99
}

export function isValidInterval(sec: number | null): boolean {
  return sec === null || (Number.isInteger(sec) && sec >= 0)
}

/** 有酸素の時間（分）: 1..999 の整数。 */
export function isValidDuration(min: number): boolean {
  return Number.isInteger(min) && min >= DURATION_MIN && min <= DURATION_MAX
}
export const DURATION_MIN = 1
export const DURATION_MAX = 999

export const WEIGHT_STEP = 0.25
export const REPS_MIN = 1
export const REPS_MAX = 99
export const WEIGHT_MIN = 0
export const WEIGHT_MAX = 999

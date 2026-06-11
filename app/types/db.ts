// 生成型（database.types.ts）から、アプリで使いやすい行/Insert/Update のエイリアスを公開する。
// テーブル/ビューを直接 string 指定するより、ここを単一の参照点にする。
import type { Tables, TablesInsert, TablesUpdate } from './database.types'

// マスタ系
export type BodyPart = Tables<'body_part'>
export type TrainingMethod = Tables<'training_method'>
export type Exercise = Tables<'exercise'>
export type Supplement = Tables<'supplement'>
export type SupplementTiming = Tables<'supplement_timing'>

// 記録系
export type Workout = Tables<'workout'>
export type WorkoutExercise = Tables<'workout_exercise'>
export type WorkoutSet = Tables<'workout_set'>
export type SupplementIntake = Tables<'supplement_intake'>

// Insert/Update（CRUD で利用）
export type ExerciseInsert = TablesInsert<'exercise'>
export type ExerciseUpdate = TablesUpdate<'exercise'>
export type BodyPartInsert = TablesInsert<'body_part'>
export type BodyPartUpdate = TablesUpdate<'body_part'>
export type TrainingMethodInsert = TablesInsert<'training_method'>
export type TrainingMethodUpdate = TablesUpdate<'training_method'>
export type WorkoutInsert = TablesInsert<'workout'>
export type WorkoutExerciseInsert = TablesInsert<'workout_exercise'>
export type WorkoutSetInsert = TablesInsert<'workout_set'>
export type WorkoutSetUpdate = TablesUpdate<'workout_set'>
export type SupplementInsert = TablesInsert<'supplement'>
export type SupplementUpdate = TablesUpdate<'supplement'>
export type SupplementTimingInsert = TablesInsert<'supplement_timing'>
export type SupplementTimingUpdate = TablesUpdate<'supplement_timing'>
export type SupplementIntakeInsert = TablesInsert<'supplement_intake'>
export type SupplementIntakeUpdate = TablesUpdate<'supplement_intake'>

// 集計ビューの行（ダッシュボード等で利用・M5）
export type VTopSet = Tables<'v_top_set'>
export type VExerciseMaxWeight = Tables<'v_exercise_max_weight'>
export type VExerciseEst1rm = Tables<'v_exercise_est_1rm'>
export type VWeeklyBodypartVolume = Tables<'v_weekly_bodypart_volume'>

export const TRAINING_METHOD_ICONS = [
  { key: 'bodyweight', label: '自重' },
  { key: 'machine', label: 'マシン' },
  { key: 'free_weight', label: 'フリーウェイト' },
  { key: 'cardio', label: '有酸素' },
  { key: 'other', label: 'その他' },
] as const

export type TrainingMethodIconKey = (typeof TRAINING_METHOD_ICONS)[number]['key']

export function isTrainingMethodIconKey(value: string | null): value is TrainingMethodIconKey {
  return TRAINING_METHOD_ICONS.some((icon) => icon.key === value)
}

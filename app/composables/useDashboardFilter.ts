// ダッシュボードのフィルタ横断状態（既定 直近12週・§9.2）。useState で共有（frontend.md §1）。
import { todayJst, addDays } from '~/utils/date'

export interface DashboardFilter {
  weeks: number // 期間（週数）
  bodyPartId: string | null // ①ボリューム推移の部位絞り込み
  exerciseId: string | null // ②④の種目絞り込み
}

export function useDashboardFilter() {
  const filter = useState<DashboardFilter>('dash:filter', () => ({
    weeks: 12,
    bodyPartId: null,
    exerciseId: null,
  }))

  // 期間開始日（JST基準で today から weeks*7 日前）
  const from = computed(() => addDays(todayJst(), -filter.value.weeks * 7))

  return { filter, from }
}

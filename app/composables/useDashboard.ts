// ダッシュボード4指標の取得（F-05）。集計は server/api/dashboard/summary 1本に集約し、
// ブラウザ↔サーバの往復と Supabase 接続数を削減（もっさり対策）。
import { todayJst } from '~/utils/date'
import type { DashboardFilter } from '~/composables/useDashboardFilter'
import type {
  VolumeResponse, MaxWeightResponse, Est1rmResponse, OverloadedResponse,
} from '#shared/types/api'

interface DashboardSummaryResponse {
  volume: VolumeResponse
  maxWeight: MaxWeightResponse
  est1rm: Est1rmResponse
  overloaded: OverloadedResponse
}

export function useDashboard(filter: Ref<DashboardFilter>, from: Ref<string>) {
  // フィルタ（期間/部位/種目）＋今週を1リクエストのクエリにまとめる。
  const query = computed(() => ({
    from: from.value,
    week: todayJst(),
    ...(filter.value.bodyPartId ? { bodyPartId: filter.value.bodyPartId } : {}),
    ...(filter.value.exerciseId ? { exerciseId: filter.value.exerciseId } : {}),
  }))

  const { data, pending } = useFetch<DashboardSummaryResponse>('/api/dashboard/summary', {
    query,
    lazy: true,
    default: () => ({
      volume: { series: [] },
      maxWeight: { series: [] },
      est1rm: { series: [] },
      overloaded: { week: '', rows: [] },
    }),
  })

  const volume = computed(() => data.value?.volume)
  const maxWeight = computed(() => data.value?.maxWeight)
  const est1rm = computed(() => data.value?.est1rm)
  const overloaded = computed(() => data.value?.overloaded)

  return { volume, maxWeight, est1rm, overloaded, pending }
}

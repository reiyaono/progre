// ダッシュボード4指標の取得（F-05）。集計は server/api/dashboard/* 経由（api.md §1）。
import { todayJst } from '~/utils/date'
import type { DashboardFilter } from '~/composables/useDashboardFilter'
import type {
  VolumeResponse, MaxWeightResponse, Est1rmResponse, OverloadedResponse,
} from '#shared/types/api'

export function useDashboard(filter: Ref<DashboardFilter>, from: Ref<string>) {
  // ① 部位別ボリューム推移（週次）
  const volumeQuery = computed(() => ({
    from: from.value,
    ...(filter.value.bodyPartId ? { bodyPartId: filter.value.bodyPartId } : {}),
  }))
  const { data: volume, pending: p1 } = useFetch<VolumeResponse>('/api/dashboard/volume', {
    query: volumeQuery, lazy: true, default: () => ({ series: [] }),
  })

  // ②④ 種目別 最大重量 / 推定1RM（日次）— 種目フィルタ共通
  const exQuery = computed(() => ({
    from: from.value,
    ...(filter.value.exerciseId ? { exerciseId: filter.value.exerciseId } : {}),
  }))
  const { data: maxWeight, pending: p2 } = useFetch<MaxWeightResponse>('/api/dashboard/max-weight', {
    query: exQuery, lazy: true, default: () => ({ series: [] }),
  })
  const { data: est1rm, pending: p3 } = useFetch<Est1rmResponse>('/api/dashboard/est-1rm', {
    query: exQuery, lazy: true, default: () => ({ series: [] }),
  })

  // ③ 週次OVERLOADED（今週）
  const { data: overloaded, pending: p4 } = useFetch<OverloadedResponse>('/api/dashboard/overloaded', {
    query: { week: todayJst() }, lazy: true, default: () => ({ week: '', rows: [] }),
  })

  // いずれかが取得中なら全体ローディング扱い
  const pending = computed(() => p1.value || p2.value || p3.value || p4.value)

  return { volume, maxWeight, est1rm, overloaded, pending }
}

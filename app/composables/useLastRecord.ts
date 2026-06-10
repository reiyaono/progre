// 前回比較（§9.4）。/api/exercise/[id]/last から前回トップセット＋自己ベストを取得。
import type { LastRecordResponse } from '#shared/types/api'

export function useLastRecord(exerciseId: Ref<string | null>, before: string) {
  const { data, pending, refresh } = useFetch<LastRecordResponse>(
    () => `/api/exercise/${exerciseId.value}/last`,
    {
      query: { before },
      immediate: !!exerciseId.value,
      watch: [exerciseId],
      default: () => ({ lastTopSet: null, bestWeight: null }),
    },
  )
  return { last: computed(() => data.value), pending, refresh }
}

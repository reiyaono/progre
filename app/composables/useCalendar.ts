// カレンダー月次（F-02）。/api/calendar/[month] からドット＋その月の全日メニュー＋場所を
// 1回でまとめ取得し、日付タップ時はこのキャッシュを使う（ネット往復ゼロで即時表示）。
import type { CalendarMonthResponse } from '#shared/types/api'

export function useCalendar(month: Ref<string>) {
  const { data, pending, error, refresh } = useFetch<CalendarMonthResponse>(
    () => `/api/calendar/${month.value}`,
    {
      watch: [month],
      lazy: true, // 取得でナビゲーションをブロックしない（遅い本番でも即描画＋スピナー）
      default: () => ({ days: {}, entries: {}, places: {} }),
    },
  )
  const days = computed(() => data.value?.days ?? {})
  const entriesByDate = computed(() => data.value?.entries ?? {})
  const placesByDate = computed(() => data.value?.places ?? {})
  return { days, entriesByDate, placesByDate, pending, error, refresh }
}

// カレンダー月次（F-02）。/api/calendar/[month] からドット＋その月の全日メニュー＋場所を
// 1回でまとめ取得し、日付タップ時はこのキャッシュを使う（ネット往復ゼロで即時表示）。
import type { CalendarMonthResponse } from '#shared/types/api'

export function useCalendar(month: Ref<string>) {
  const { data, pending, error, refresh } = useFetch<CalendarMonthResponse>(
    () => `/api/calendar/${month.value}`,
    {
      watch: [month],
      lazy: true, // 取得でナビゲーションをブロックしない（遅い本番でも即描画＋スピナー）
      default: () => ({ days: {}, entries: {}, places: {}, supplements: {} }),
    },
  )
  const days = computed(() => data.value?.days ?? {})
  const entriesByDate = computed(() => data.value?.entries ?? {})
  const placesByDate = computed(() => data.value?.places ?? {})
  const supplementsByDate = computed(() => data.value?.supplements ?? {})

  // 取得した月データを日別共有キャッシュへ流し込む（日別ページの初期表示を即時化）。
  const { setMany } = useDayCache()
  watch(
    data,
    (d) => {
      if (d) setMany(d.entries ?? {}, d.places ?? {})
    },
    { immediate: true },
  )

  return { days, entriesByDate, placesByDate, supplementsByDate, pending, error, refresh }
}

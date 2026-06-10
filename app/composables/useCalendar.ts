// カレンダー月次（F-02）。/api/calendar/[month] から各日の部位色配列を取得（frontend.md）。
export function useCalendar(month: Ref<string>) {
  const { data, pending, error, refresh } = useFetch(() => `/api/calendar/${month.value}`, {
    watch: [month],
    default: () => ({ days: {} as Record<string, string[]> }),
  })
  const days = computed(() => data.value?.days ?? {})
  return { days, pending, error, refresh }
}

<script setup lang="ts">
// カレンダー（ホーム / F-02 / §9.5）。常に今日を含む当月を初期表示。
import CalendarMonth from '~/components/calendar/CalendarMonth.vue'
import CalendarDayPreview from '~/components/calendar/CalendarDayPreview.vue'
import { todayJst } from '~/utils/date'

const today = todayJst()
// ?month=YYYY-MM があればその月を初期表示（日別から戻ったとき元の月を維持）。
const route = useRoute()
const queryMonth = route.query.month
const initialMonth =
  typeof queryMonth === 'string' && /^\d{4}-\d{2}$/.test(queryMonth)
    ? queryMonth
    : today.slice(0, 7)
const month = ref(initialMonth)
const { days, entriesByDate, placesByDate, pending } = useCalendar(month)

// 選択中の日付。1回目タップでプレビュー表示、同じ日をもう一度タップで詳細へ。
const selectedDate = ref<string | null>(null)

// プレビューは月取得済みキャッシュから引く（タップ時のネット往復なし）。
const selectedEntries = computed(() =>
  selectedDate.value ? entriesByDate.value[selectedDate.value] ?? [] : [],
)
const selectedPlace = computed(() =>
  selectedDate.value ? placesByDate.value[selectedDate.value] ?? null : null,
)

function shiftMonth(m: string, delta: number): string {
  const [y, mm] = m.split('-').map(Number) as [number, number]
  const idx = y * 12 + (mm - 1) + delta
  const ny = Math.floor(idx / 12)
  const nm = (idx % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

// 日セルのタップ: 未選択/別日なら選択してメニュー表示、同じ日の再タップで詳細へ。
function onSelectDate(date: string) {
  if (selectedDate.value === date) openDetail(date)
  else selectedDate.value = date
}

function openDetail(date: string) {
  navigateTo(`/day/${date}`)
}

// 月を移動したら選択を解除（別月の旧プレビューが残らないように）。
function changeMonth(m: string) {
  selectedDate.value = null
  month.value = m
}
</script>

<template>
  <section>
    <CalendarMonth
      :month="month"
      :days="days"
      :today="today"
      :selected="selectedDate"
      :loading="pending"
      @select="onSelectDate"
      @prev="changeMonth(shiftMonth(month, -1))"
      @next="changeMonth(shiftMonth(month, 1))"
      @go-today="changeMonth(today.slice(0, 7))"
    />

    <!-- 選択日のメニュー（1回目タップで表示・行/詳細リンクで日別へ）。
         データは月取得済みキャッシュから（タップ時のネット往復なし）。 -->
    <CalendarDayPreview
      v-if="selectedDate"
      :date="selectedDate"
      :entries="selectedEntries"
      :place="selectedPlace"
      :loading="pending"
      @open="openDetail(selectedDate)"
    />
  </section>
</template>

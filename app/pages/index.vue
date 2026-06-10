<script setup lang="ts">
// カレンダー（ホーム / F-02 / §9.5）。常に今日を含む当月を初期表示。
import CalendarMonth from '~/components/calendar/CalendarMonth.vue'
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
const { days, pending } = useCalendar(month)

function shiftMonth(m: string, delta: number): string {
  const [y, mm] = m.split('-').map(Number) as [number, number]
  const idx = y * 12 + (mm - 1) + delta
  const ny = Math.floor(idx / 12)
  const nm = (idx % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

function openDay(date: string) {
  navigateTo(`/day/${date}`)
}
</script>

<template>
  <section>
    <CalendarMonth
      :month="month"
      :days="days"
      :today="today"
      :loading="pending"
      @select="openDay"
      @prev="month = shiftMonth(month, -1)"
      @next="month = shiftMonth(month, 1)"
      @go-today="month = today.slice(0, 7)"
    />
  </section>
</template>

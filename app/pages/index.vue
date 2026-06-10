<script setup lang="ts">
// カレンダー（ホーム / F-02 / §9.5）。常に今日を含む当月を初期表示。
import CalendarMonth from '~/components/calendar/CalendarMonth.vue'
import { todayJst } from '~/utils/date'

const today = todayJst()
const month = ref(today.slice(0, 7)) // 'YYYY-MM'
const { days } = useCalendar(month)

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
      @select="openDay"
      @prev="month = shiftMonth(month, -1)"
      @next="month = shiftMonth(month, 1)"
      @go-today="month = today.slice(0, 7)"
    />
  </section>
</template>

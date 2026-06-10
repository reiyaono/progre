<script setup lang="ts">
// 月カレンダーグリッド。ヘッダ（月送り）＋曜日見出し＋日セル群を表示する。
import { computed } from 'vue'
import CalendarDayCell from './CalendarDayCell.vue'

const props = defineProps<{
  month: string                    // 'YYYY-MM'（表示対象の月）
  days: Record<string, string[]>   // 'YYYY-MM-DD' -> その日の実施部位のユニーク色配列
  today: string                    // 'YYYY-MM-DD'（今日。JST想定で親が渡す）
}>()

const emit = defineEmits<{
  select: [date: string]  // 日セルが選ばれたら上に伝播
  prev: []                // 前月へ
  next: []                // 翌月へ
  goToday: []             // 今日へ
}>()

// 「YYYY年M月」形式のヘッダ文字列
const headerLabel = computed(() => {
  const [y, m] = props.month.split('-').map(Number) as [number, number]
  return `${y}年${m}月`
})

// 曜日ラベル（日曜始まり）
const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

// グリッドセル配列を computed で生成（42セル固定 = 6週）
type Cell = { date: string; day: number } | { date: null; day: null }

const cells = computed<Cell[]>(() => {
  const [y, m] = props.month.split('-').map(Number) as [number, number]
  // UTCベースの純カレンダー演算でTZ依存を排除
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()  // 0=日..6=土
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()

  const result: Cell[] = []

  // 月初前の空白セル
  for (let i = 0; i < firstDow; i++) {
    result.push({ date: null, day: null })
  }

  // 月内の日セル
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    result.push({ date: dateStr, day: d })
  }

  // 42セルになるまで末尾を空白セルで埋める
  while (result.length < 42) {
    result.push({ date: null, day: null })
  }

  return result
})

// 空状態の判定：キーが無い、またはすべての色配列が空
const isEmpty = computed(() =>
  Object.values(props.days).every((colors) => colors.length === 0)
)
</script>

<template>
  <div class="calendar">
    <!-- 月送りヘッダ -->
    <div class="header">
      <button type="button" class="nav-btn" aria-label="前月" @click="emit('prev')">◀</button>
      <span class="month-label">{{ headerLabel }}</span>
      <button type="button" class="nav-btn" aria-label="翌月" @click="emit('next')">▶</button>
      <button type="button" class="btn today-btn" @click="emit('goToday')">今日</button>
    </div>

    <!-- 曜日見出し行 -->
    <div class="dow-row">
      <span
        v-for="(label, i) in DOW_LABELS"
        :key="label"
        class="dow"
        :class="{ 'dow-sun': i === 0, 'dow-sat': i === 6 }"
      >{{ label }}</span>
    </div>

    <!-- 日グリッド（42セル） -->
    <div class="grid">
      <CalendarDayCell
        v-for="(cell, idx) in cells"
        :key="cell.date ?? `empty-${idx}`"
        :date="cell.date"
        :day="cell.day"
        :colors="cell.date ? (days[cell.date] ?? []) : []"
        :is-today="cell.date === today"
        @select="emit('select', $event)"
      />
    </div>

    <!-- 空状態メッセージ（§9.8） -->
    <p v-if="isEmpty" class="empty-msg">記録がありません。日付をタップして開始</p>
  </div>
</template>

<style scoped>
.calendar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.75rem;
}

/* ヘッダ */
.header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.nav-btn {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-size: 0.9rem;
  cursor: pointer;
  color: var(--text);
}
.nav-btn:hover {
  background: var(--bg);
}
.month-label {
  flex: 1;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}
.today-btn {
  flex: 0 0 auto;
  font-size: 0.8rem;
  padding: 0.25rem 0.65rem;
}

/* 曜日見出し */
.dow-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 0.3rem;
}
.dow {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted);
  padding: 0.2rem 0;
}
.dow-sun {
  color: var(--danger);
}
.dow-sat {
  color: var(--accent);
}

/* 日グリッド */
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

/* 空状態メッセージ */
.empty-msg {
  text-align: center;
  font-size: 0.85rem;
  color: var(--muted);
  margin-top: 0.75rem;
  padding: 0.5rem 0;
}
</style>

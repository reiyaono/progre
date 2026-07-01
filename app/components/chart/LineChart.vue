<script setup lang="ts">
// 推移系3指標（部位別ボリューム／種目別最大重量／推定1RM）共用の折れ線チャートラッパ。
// 呼び出し側は <ClientOnly> で包むこと。
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js'
import type { Series } from '#shared/types/api'

// モジュールスコープで一度だけ登録（SSRでも問題なし）
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title)

// 色未指定の系列に index で割り当てるパレット
const PALETTE = [
  '#1f6feb',
  '#e8590c',
  '#2f9e44',
  '#9c36b5',
  '#1098ad',
  '#e03131',
  '#f08c00',
  '#5c7cfa',
]

const props = defineProps<{
  series: Series[]
  xType: 'week' | 'day' // 週次 or 日次（いずれもカテゴリ軸）
  unit?: string          // y軸の単位（例 'kg'）。任意
}>()

// データが存在するかどうか
const hasData = computed(() =>
  props.series.length > 0 && props.series.some((s) => s.points.length > 0),
)

// 全系列の x をまとめてユニーク＆昇順ソートした labels
const labels = computed<string[]>(() => {
  const xs = new Set<string>()
  for (const s of props.series) {
    for (const p of s.points) xs.add(p.x)
  }
  return [...xs].sort()
})

// chart.js に渡す { labels, datasets }
const chartData = computed(() => ({
  labels: labels.value,
  datasets: props.series.map((s, i) => {
    const color = s.color ?? PALETTE[i % PALETTE.length]
    return {
      label: s.label,
      data: labels.value.map((x) => s.points.find((p) => p.x === x)?.y ?? null),
      borderColor: color,
      backgroundColor: color,
      spanGaps: true,
      tension: 0.2,
      pointRadius: 2,
    }
  }),
}))

// chart.js オプション
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: {
        usePointStyle: true, // 太い色バーではなく小さな点で凡例をコンパクトに
        pointStyle: 'circle',
        boxWidth: 8,
        boxHeight: 8,
        padding: 10,
        font: { size: 11 },
      },
    },
    title: { display: false },
  },
  scales: {
    y: {
      beginAtZero: false,
      title: {
        display: !!props.unit,
        text: props.unit ?? '',
      },
    },
  },
}))
</script>

<template>
  <!-- 空データ時は「データがありません」を表示 -->
  <div v-if="!hasData" class="empty">データがありません</div>
  <div v-else class="chart-wrap">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart-wrap {
  height: 260px;
}
.empty {
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 0.9rem;
}
</style>

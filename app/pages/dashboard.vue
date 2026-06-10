<script setup lang="ts">
// ダッシュボード（F-05 / §9.2）。4指標を期間/部位/種目フィルタで表示。
import LineChart from '~/components/chart/LineChart.vue'
import OverloadedCard from '~/components/dashboard/OverloadedCard.vue'
import DashboardFilter from '~/components/dashboard/DashboardFilter.vue'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'

const em = useExerciseMaster()
const { bodyParts, exercises } = em
onMounted(() => em.load())

const { filter, from } = useDashboardFilter()
const { volume, maxWeight, est1rm, overloaded, pending } = useDashboard(filter, from)

// 全体が空か（空状態メッセージ §9.2）
const isEmpty = computed(() =>
  (volume.value?.series.length ?? 0) === 0 &&
  (maxWeight.value?.series.length ?? 0) === 0 &&
  (est1rm.value?.series.length ?? 0) === 0 &&
  (overloaded.value?.rows.length ?? 0) === 0,
)
</script>

<template>
  <section class="page">
    <h1>分析ダッシュボード</h1>

    <DashboardFilter v-model="filter" :body-parts="bodyParts" :exercises="exercises" />

    <LoadingSpinner v-if="pending" label="集計を読み込み中…" />

    <div v-else-if="isEmpty" class="empty">
      <p>まだ記録がありません。トレーニングを記録するとここに推移が表示されます。</p>
      <NuxtLink to="/" class="btn btn-primary">カレンダーへ</NuxtLink>
    </div>

    <template v-else>
      <!-- ③ 週次OVERLOADED -->
      <div class="block">
        <h2>今週のOVERLOADED</h2>
        <div v-if="overloaded?.rows.length" class="cards">
          <OverloadedCard v-for="r in overloaded.rows" :key="r.bodyPartId" :row="r" />
        </div>
        <p v-else class="muted">今週の記録がありません。</p>
      </div>

      <!-- ① 部位別ボリューム推移（週次） -->
      <div class="block">
        <h2>部位別ボリューム推移（週次）</h2>
        <ClientOnly>
          <LineChart :series="volume?.series ?? []" x-type="week" unit="volume" />
        </ClientOnly>
      </div>

      <!-- ② 種目別最大重量推移（日次） -->
      <div class="block">
        <h2>種目別 最大重量推移</h2>
        <ClientOnly>
          <LineChart :series="maxWeight?.series ?? []" x-type="day" unit="kg" />
        </ClientOnly>
      </div>

      <!-- ④ 推定1RM / Max推移（日次） -->
      <div class="block">
        <h2>推定1RM 推移（Epley）</h2>
        <ClientOnly>
          <LineChart :series="est1rm?.series ?? []" x-type="day" unit="kg" />
        </ClientOnly>
      </div>
    </template>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
h1 {
  font-size: 1.25rem;
  margin: 0;
}
.block h2 {
  font-size: 0.95rem;
  margin: 0 0 0.6rem;
}
.cards {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.empty {
  text-align: center;
  color: var(--muted);
  padding: 2rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}
.muted {
  color: var(--muted);
  margin: 0;
}
</style>

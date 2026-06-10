<script setup lang="ts">
// 種目マスタ（F-03 / §9.5・§9.8）。部位タブで絞り込み、種目/部位/方法を CRUD。
import type { Exercise, BodyPart, TrainingMethod } from '~/types/db'
import BodyPartTabs from '~/components/exercise/BodyPartTabs.vue'
import ExerciseList from '~/components/exercise/ExerciseList.vue'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import ExerciseEditDialog from '~/components/exercise/ExerciseEditDialog.vue'
import BodyPartEditDialog from '~/components/exercise/BodyPartEditDialog.vue'
import MethodEditDialog from '~/components/exercise/MethodEditDialog.vue'

const em = useExerciseMaster()
const {
  bodyParts, methods, selectedBodyPartId, loading, error,
  filteredExercises, bodyPartById, methodById, isDuplicateExerciseName,
} = em

// 初期ロードはクライアントで（RLSはユーザーセッション前提・SSR副作用を避ける）。
onMounted(() => { em.load() })

// ---- ダイアログ状態 --------------------------------------------------------
const exerciseDialog = ref<{ open: boolean; model: Exercise | null }>({ open: false, model: null })
const bodyPartDialog = ref<{ open: boolean; model: BodyPart | null }>({ open: false, model: null })
const methodDialog = ref<{ open: boolean; model: TrainingMethod | null }>({ open: false, model: null })

const selectedBodyPart = computed(() => bodyPartById(selectedBodyPartId.value))

async function run(fn: () => Promise<void>) {
  try {
    await fn()
  } catch (e: any) {
    alert(e?.message ?? '操作に失敗しました')
  }
}

// 種目
function openAddExercise() { exerciseDialog.value = { open: true, model: null } }
function openEditExercise(ex: Exercise) { exerciseDialog.value = { open: true, model: ex } }
function closeExercise() { exerciseDialog.value = { open: false, model: null } }
async function submitExercise(p: { name: string; body_part_id: string; training_method_id: string | null }) {
  await run(async () => {
    if (exerciseDialog.value.model) await em.updateExercise(exerciseDialog.value.model.id, p)
    else await em.addExercise(p)
    closeExercise()
  })
}
async function archiveExercise(id: string) {
  await run(async () => { await em.archiveExercise(id); closeExercise() })
}

// 部位
function openAddBodyPart() { bodyPartDialog.value = { open: true, model: null } }
function openEditBodyPart(b: BodyPart) { bodyPartDialog.value = { open: true, model: b } }
function closeBodyPart() { bodyPartDialog.value = { open: false, model: null } }
async function submitBodyPart(p: { name: string; color: string }) {
  await run(async () => {
    if (bodyPartDialog.value.model) await em.updateBodyPart(bodyPartDialog.value.model.id, p)
    else await em.addBodyPart(p)
    closeBodyPart()
  })
}
async function archiveBodyPart(id: string) {
  await run(async () => { await em.archiveBodyPart(id); closeBodyPart() })
}

// 方法
function openAddMethod() { methodDialog.value = { open: true, model: null } }
function openEditMethod(m: TrainingMethod) { methodDialog.value = { open: true, model: m } }
function closeMethod() { methodDialog.value = { open: false, model: null } }
async function submitMethod(p: { name: string }) {
  await run(async () => {
    if (methodDialog.value.model) await em.updateMethod(methodDialog.value.model.id, p)
    else await em.addMethod(p)
    closeMethod()
  })
}
async function archiveMethod(id: string) {
  await run(async () => { await em.archiveMethod(id); closeMethod() })
}
</script>

<template>
  <section class="page">
    <h1>種目マスタ</h1>

    <p v-if="error" class="error-text">{{ error }}</p>

    <BodyPartTabs
      :body-parts="bodyParts"
      :selected-id="selectedBodyPartId"
      @select="selectedBodyPartId = $event"
      @add="openAddBodyPart"
      @edit="openEditBodyPart"
    />

    <div class="section-head">
      <h2>{{ selectedBodyPart?.name ?? '種目' }}</h2>
      <button v-if="bodyParts.length" type="button" class="btn btn-primary" @click="openAddExercise">
        種目を追加
      </button>
    </div>

    <LoadingSpinner v-if="loading" />
    <ExerciseList
      v-else
      :exercises="filteredExercises"
      :method-by-id="methodById"
      @edit="openEditExercise"
      @add="openAddExercise"
    />

    <!-- トレーニング方法の管理 -->
    <div class="section-head methods-head">
      <h2>トレーニング方法</h2>
      <button type="button" class="btn" @click="openAddMethod">方法を追加</button>
    </div>
    <ul class="method-list">
      <li v-for="m in methods" :key="m.id">
        <button type="button" class="method-row" @click="openEditMethod(m)">{{ m.name }}</button>
      </li>
      <li v-if="!methods.length" class="muted">方法は未登録です。</li>
    </ul>

    <!-- ダイアログ -->
    <ExerciseEditDialog
      v-if="exerciseDialog.open"
      :body-parts="bodyParts"
      :methods="methods"
      :model="exerciseDialog.model"
      :default-body-part-id="selectedBodyPartId"
      :check-duplicate="isDuplicateExerciseName"
      @submit="submitExercise"
      @archive="archiveExercise"
      @close="closeExercise"
    />
    <BodyPartEditDialog
      v-if="bodyPartDialog.open"
      :model="bodyPartDialog.model"
      @submit="submitBodyPart"
      @archive="archiveBodyPart"
      @close="closeBodyPart"
    />
    <MethodEditDialog
      v-if="methodDialog.open"
      :model="methodDialog.model"
      @submit="submitMethod"
      @archive="archiveMethod"
      @close="closeMethod"
    />
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
h1 {
  font-size: 1.25rem;
  margin: 0;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.section-head h2 {
  font-size: 1rem;
  margin: 0;
}
.methods-head {
  margin-top: 1rem;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}
.method-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.method-row {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  cursor: pointer;
  font-size: 0.85rem;
}
.muted {
  color: var(--muted);
  margin: 0;
}
</style>

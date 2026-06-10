// 種目マスタ（F-03）のデータアクセス＝SDK直＋RLS（api.md §1）。
// 横断状態は useState に閉じ込め、各コンポーネントはこの composable 経由で触る（frontend.md §1）。
// 削除はマスタ系のため論理削除（is_archived）のみ（§7・ops.md §3）。
import type {
  BodyPart,
  TrainingMethod,
  Exercise,
  ExerciseInsert,
  ExerciseUpdate,
  BodyPartInsert,
  BodyPartUpdate,
  TrainingMethodInsert,
  TrainingMethodUpdate,
} from '~/types/db'

export function useExerciseMaster() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const bodyParts = useState<BodyPart[]>('em:bodyParts', () => [])
  const methods = useState<TrainingMethod[]>('em:methods', () => [])
  const exercises = useState<Exercise[]>('em:exercises', () => [])
  const selectedBodyPartId = useState<string | null>('em:selectedBodyPartId', () => null)
  const loading = useState<boolean>('em:loading', () => false)
  const error = useState<string | null>('em:error', () => null)

  // ログインユーザーID。useSupabaseUser が未ハイドレートの瞬間でも
  // セッションから確実に取得する（insert の user_id 用）。
  async function uid(): Promise<string> {
    if (user.value?.id) return user.value.id
    const { data } = await supabase.auth.getSession()
    const id = data.session?.user?.id
    if (!id) throw new Error('未ログインです')
    return id
  }

  /** 全マスタ（非アーカイブ）を取得。並びは sort_order 昇順→作成順（screens.md §4.4）。 */
  async function load() {
    loading.value = true
    error.value = null
    try {
      const [bp, tm, ex] = await Promise.all([
        supabase.from('body_part').select('*').eq('is_archived', false)
          .order('sort_order').order('created_at'),
        supabase.from('training_method').select('*').eq('is_archived', false)
          .order('sort_order').order('created_at'),
        supabase.from('exercise').select('*').eq('is_archived', false)
          .order('sort_order').order('created_at'),
      ])
      if (bp.error) throw bp.error
      if (tm.error) throw tm.error
      if (ex.error) throw ex.error
      bodyParts.value = bp.data ?? []
      methods.value = tm.data ?? []
      exercises.value = ex.data ?? []
      // 初期選択は先頭の部位タブ（§9.5）。選択中が消えていたら先頭に戻す。
      const exists = bodyParts.value.some((b) => b.id === selectedBodyPartId.value)
      if (!exists) selectedBodyPartId.value = bodyParts.value[0]?.id ?? null
    } catch (e: any) {
      error.value = e?.message ?? 'マスタの取得に失敗しました'
    } finally {
      loading.value = false
    }
  }

  // 表示用ヘルパ
  const filteredExercises = computed(() =>
    exercises.value.filter((e) => e.body_part_id === selectedBodyPartId.value),
  )
  function bodyPartById(id: string | null) {
    return bodyParts.value.find((b) => b.id === id) ?? null
  }
  function methodById(id: string | null) {
    return id ? methods.value.find((m) => m.id === id) ?? null : null
  }

  /** 同名種目の重複判定（§9.8: 警告のみ・制約は課さない）。部位横断で判定。 */
  function isDuplicateExerciseName(name: string, excludeId?: string) {
    const n = name.trim()
    return exercises.value.some((e) => e.id !== excludeId && e.name === n)
  }

  // ---- exercise CRUD --------------------------------------------------------
  async function addExercise(input: { name: string; body_part_id: string; training_method_id: string | null }) {
    const row: ExerciseInsert = { ...input, user_id: await uid() }
    const { error: e } = await supabase.from('exercise').insert(row)
    if (e) throw e
    await load()
  }
  async function updateExercise(id: string, patch: ExerciseUpdate) {
    const { error: e } = await supabase.from('exercise').update(patch).eq('id', id)
    if (e) throw e
    await load()
  }
  async function archiveExercise(id: string) {
    const { error: e } = await supabase.from('exercise').update({ is_archived: true }).eq('id', id)
    if (e) throw e
    await load()
  }

  // ---- body_part CRUD -------------------------------------------------------
  async function addBodyPart(input: { name: string; color: string }) {
    const row: BodyPartInsert = { ...input, user_id: await uid() }
    const { error: e } = await supabase.from('body_part').insert(row)
    if (e) throw e
    await load()
  }
  async function updateBodyPart(id: string, patch: BodyPartUpdate) {
    const { error: e } = await supabase.from('body_part').update(patch).eq('id', id)
    if (e) throw e
    await load()
  }
  async function archiveBodyPart(id: string) {
    const { error: e } = await supabase.from('body_part').update({ is_archived: true }).eq('id', id)
    if (e) throw e
    await load()
  }

  // ---- training_method CRUD -------------------------------------------------
  async function addMethod(input: { name: string }) {
    const row: TrainingMethodInsert = { ...input, user_id: await uid() }
    const { error: e } = await supabase.from('training_method').insert(row)
    if (e) throw e
    await load()
  }
  async function updateMethod(id: string, patch: TrainingMethodUpdate) {
    const { error: e } = await supabase.from('training_method').update(patch).eq('id', id)
    if (e) throw e
    await load()
  }
  async function archiveMethod(id: string) {
    const { error: e } = await supabase.from('training_method').update({ is_archived: true }).eq('id', id)
    if (e) throw e
    await load()
  }

  return {
    bodyParts, methods, exercises, selectedBodyPartId, loading, error,
    filteredExercises, bodyPartById, methodById, isDuplicateExerciseName,
    load,
    addExercise, updateExercise, archiveExercise,
    addBodyPart, updateBodyPart, archiveBodyPart,
    addMethod, updateMethod, archiveMethod,
  }
}

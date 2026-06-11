// サプリ・タイミングのマスタ（F-サプリ）。データアクセス＝SDK直＋RLS（api.md §1）。
// 横断状態は useState に閉じ込め、各コンポーネントはこの composable 経由で触る（frontend.md §1）。
// 削除はマスタ系のため論理削除（is_archived）のみ（§7・ops.md §3）。useExerciseMaster 踏襲。
import type {
  Supplement,
  SupplementTiming,
  SupplementInsert,
  SupplementUpdate,
  SupplementTimingInsert,
  SupplementTimingUpdate,
} from '~/types/db'

export function useSupplementMaster() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const supplements = useState<Supplement[]>('sm:supplements', () => [])
  const timings = useState<SupplementTiming[]>('sm:timings', () => [])
  const loading = useState<boolean>('sm:loading', () => false)
  const error = useState<string | null>('sm:error', () => null)
  // セッション内でロード済みか（重複ロード抑止）。CRUD は load(true) で強制更新する。
  const loaded = useState<boolean>('sm:loaded', () => false)

  // ユーザーが変わったらキャッシュ破棄（別アカウントのマスタ混入を防ぐ）。次回 load で再取得。
  watch(
    () => user.value?.id,
    (id, prev) => {
      if (prev !== undefined && id !== prev) {
        loaded.value = false
        supplements.value = []
        timings.value = []
      }
    },
  )

  // ログインユーザーID（insert の user_id 用）。未ハイドレート時もセッションから取得。
  async function uid(): Promise<string> {
    if (user.value?.id) return user.value.id
    const { data } = await supabase.auth.getSession()
    const id = data.session?.user?.id
    if (!id) throw new Error('未ログインです')
    return id
  }

  /** マスタ（非アーカイブ）取得。セッション内で取得済みなら既定でスキップ。CRUD 後は force=true。 */
  async function load(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    error.value = null
    try {
      const [sup, tim] = await Promise.all([
        supabase.from('supplement').select('*').eq('is_archived', false)
          .order('sort_order').order('created_at'),
        supabase.from('supplement_timing').select('*').eq('is_archived', false)
          .order('sort_order').order('created_at'),
      ])
      if (sup.error) throw sup.error
      if (tim.error) throw tim.error
      supplements.value = sup.data ?? []
      timings.value = tim.data ?? []
      loaded.value = true
    } catch (e: any) {
      error.value = e?.message ?? 'サプリマスタの取得に失敗しました'
    } finally {
      loading.value = false
    }
  }

  // 表示用ヘルパ（intake の名前解決）
  function supplementById(id: string | null) {
    return id ? supplements.value.find((s) => s.id === id) ?? null : null
  }
  function timingById(id: string | null) {
    return id ? timings.value.find((t) => t.id === id) ?? null : null
  }

  /** 同名サプリの重複判定（警告のみ・制約は課さない）。 */
  function isDuplicateSupplementName(name: string, excludeId?: string) {
    const n = name.trim()
    return supplements.value.some((s) => s.id !== excludeId && s.name === n)
  }

  // ---- supplement CRUD ------------------------------------------------------
  async function addSupplement(input: { name: string }) {
    const row: SupplementInsert = { ...input, user_id: await uid() }
    const { error: e } = await supabase.from('supplement').insert(row)
    if (e) throw e
    await load(true)
  }
  async function updateSupplement(id: string, patch: SupplementUpdate) {
    const { error: e } = await supabase.from('supplement').update(patch).eq('id', id)
    if (e) throw e
    await load(true)
  }
  async function archiveSupplement(id: string) {
    const { error: e } = await supabase.from('supplement').update({ is_archived: true }).eq('id', id)
    if (e) throw e
    await load(true)
  }

  // ---- supplement_timing CRUD ----------------------------------------------
  async function addTiming(input: { name: string }) {
    const row: SupplementTimingInsert = { ...input, user_id: await uid() }
    const { error: e } = await supabase.from('supplement_timing').insert(row)
    if (e) throw e
    await load(true)
  }
  async function updateTiming(id: string, patch: SupplementTimingUpdate) {
    const { error: e } = await supabase.from('supplement_timing').update(patch).eq('id', id)
    if (e) throw e
    await load(true)
  }
  async function archiveTiming(id: string) {
    const { error: e } = await supabase.from('supplement_timing').update({ is_archived: true }).eq('id', id)
    if (e) throw e
    await load(true)
  }

  return {
    supplements, timings, loading, error,
    load, supplementById, timingById, isDuplicateSupplementName,
    addSupplement, updateSupplement, archiveSupplement,
    addTiming, updateTiming, archiveTiming,
  }
}

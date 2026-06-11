// 日次のサプリ摂取記録（フラット1テーブル supplement_intake）。SDK直＋RLS（集計不要）。
// 日付は Ref で受け取り、変化時に自動リロード（サプリタブの前後移動に追従）。
import type { SupplementIntake, SupplementIntakeUpdate } from '~/types/db'

export interface IntakeInput {
  supplement_id: string
  timing_id: string | null
  quantity: number
}

export function useSupplementDay(dateRef: Ref<string>) {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const intakes = ref<SupplementIntake[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function uid(): Promise<string> {
    if (user.value?.id) return user.value.id
    const { data } = await supabase.auth.getSession()
    const id = data.session?.user?.id
    if (!id) throw new Error('未ログインです')
    return id
  }

  async function load() {
    loading.value = true
    error.value = null
    const { data, error: e } = await supabase
      .from('supplement_intake')
      .select('*')
      .eq('date', dateRef.value)
      .order('sort_order')
      .order('created_at')
    if (e) error.value = e.message
    else intakes.value = (data ?? []) as SupplementIntake[]
    loading.value = false
  }

  // 日付が変わったら再取得
  watch(dateRef, load)

  /** 摂取を1件追加（末尾 sort_order）。 */
  async function add(input: IntakeInput) {
    const next = (intakes.value.at(-1)?.sort_order ?? -1) + 1
    const { error: e } = await supabase.from('supplement_intake').insert({
      user_id: await uid(),
      date: dateRef.value,
      supplement_id: input.supplement_id,
      timing_id: input.timing_id,
      quantity: input.quantity,
      sort_order: next,
    })
    if (e) throw e
    await load()
  }

  /** 摂取の更新（サプリ/タイミング/数量）。 */
  async function update(id: string, patch: IntakeInput) {
    const up: SupplementIntakeUpdate = {
      supplement_id: patch.supplement_id,
      timing_id: patch.timing_id,
      quantity: patch.quantity,
    }
    const { error: e } = await supabase.from('supplement_intake').update(up).eq('id', id)
    if (e) throw e
    await load()
  }

  /** 摂取の削除（記録系のため物理削除）。 */
  async function remove(id: string) {
    const { error: e } = await supabase.from('supplement_intake').delete().eq('id', id)
    if (e) throw e
    await load()
  }

  return { intakes, loading, error, load, add, update, remove }
}

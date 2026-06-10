// 認証 composable（frontend.md: useSupabaseUser をラップ）。
// CRUD は SDK＋RLS（api.md §1）。認証もクライアントの Supabase SDK で行う。
export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const isLoggedIn = computed(() => !!user.value)

  /** メール＋パスワードでログイン。成功でカレンダーへ。 */
  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await navigateTo('/')
  }

  /**
   * 新規登録（§9.3: PW 8文字以上・メール確認オフ）。
   * メール確認オフのため signUp 成功で即セッション確立 → カレンダーへ。
   */
  async function signup(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    await navigateTo('/')
  }

  /** ログアウトしてログイン画面へ。 */
  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    await navigateTo('/login')
  }

  return { user, isLoggedIn, login, signup, logout }
}

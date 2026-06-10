// ログイン済みユーザーが /login・/signup に来たらカレンダーへ退避（screens.md §2）。
// 未ログイン→/login のリダイレクトは @nuxtjs/supabase の組込ミドルウェアが担当する。
const AUTH_PAGES = ['/login', '/signup']

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  if (user.value && AUTH_PAGES.includes(to.path)) {
    return navigateTo('/')
  }
})

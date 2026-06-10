// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/supabase'],

  // @nuxtjs/supabase は SUPABASE_URL / SUPABASE_KEY(anon) を環境変数から読む（ops.md §1）。
  // 認証リダイレクトはモジュール組込で制御し、ログイン済みの login/signup 退避は
  // クライアントミドルウェアで補う（screens.md §2・M2 で追加）。
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/',
      exclude: ['/signup'],
    },
  },

  runtimeConfig: {
    // service-role はサーバ専用。public ではない側に置き server/api でのみ使用（ops.md §1）。
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
})

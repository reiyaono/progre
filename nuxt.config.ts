// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/supabase'],

  css: ['~/assets/css/main.css'],

  // @nuxtjs/supabase は SUPABASE_URL / SUPABASE_KEY(anon) を環境変数から読む（ops.md §1）。
  // 認証リダイレクトはモジュール組込で制御し、ログイン済みの login/signup 退避は
  // クライアントミドルウェアで補う（screens.md §2・M2 で追加）。
  supabase: {
    // login: 未ログインの誘導先。callback はメール確認/OAuth 用だが本アプリは
    // パスワード認証のみで未使用 → '/' を保護対象に残すため未使用ルートを指定。
    // exclude で /signup を公開。これ以外は要ログイン（screens.md §2）。
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/signup'],
    },
  },

  runtimeConfig: {
    // service-role はサーバ専用。public ではない側に置き server/api でのみ使用（ops.md §1）。
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
})

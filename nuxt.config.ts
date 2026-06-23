// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/supabase'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'PROGRE',
      meta: [
        { name: 'description', content: '筋トレの記録と漸進性過負荷（progressive overload）を可視化するアプリ' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        // PWA: iOS でホーム画面アイコンをスタンドアロン起動させる（Safari の X/下部バーを消し、
        // 毎回 start_url='/'=今日の月のカレンダーから開く）。設定が無いと iOS は Web クリップ作成時の
        // 起点URLを焼き付け、起動のたびにその日付へ戻ってしまう。
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'PROGRE' },
        { name: 'theme-color', content: '#14171a' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/favicon.svg' },
      ],
      // FOUC防止: ハイドレーション前にテーマを <html> へ反映（保存値→OS設定）。
      script: [
        {
          innerHTML:
            "(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();",
          tagPosition: 'head',
        },
      ],
    },
  },

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

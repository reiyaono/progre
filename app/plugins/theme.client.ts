// 起動時にテーマ（保存値 or OS設定）を反映する。FOUC は app.head の inline script で先に防ぐ。
export default defineNuxtPlugin(() => {
  useTheme().init()
})

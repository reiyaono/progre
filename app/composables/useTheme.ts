// ライト/ダークのテーマ切替。配色は CSS 変数（main.css）で切替え、
// <html data-theme="..."> を付け替えるだけ。選択は localStorage に永続化。
export type Theme = 'light' | 'dark'

export function useTheme() {
  const theme = useState<Theme>('theme', () => 'light')

  function set(t: Theme) {
    theme.value = t
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', t)
      try {
        localStorage.setItem('theme', t)
      } catch {
        // localStorage 不可環境は無視
      }
    }
  }

  function toggle() {
    set(theme.value === 'dark' ? 'light' : 'dark')
  }

  /** 起動時: 保存値 → 無ければ OS 設定で初期化（クライアントのみ）。 */
  function init() {
    if (!import.meta.client) return
    let t: Theme = 'light'
    try {
      const saved = localStorage.getItem('theme') as Theme | null
      t = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    } catch {
      t = 'light'
    }
    set(t)
  }

  return { theme, set, toggle, init }
}

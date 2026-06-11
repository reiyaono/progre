// 軽量トースト通知。横断状態は useState に持ち、<ToastHost> が描画する（frontend.md §1）。
// 操作の成否を画面下に短時間表示して「入力できたか」を分かりやすくする。
export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

// クライアント操作でのみ発火するため、モジュールレベルの連番でID付与。
let idSeq = 0

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  /** トースト表示。duration<=0 で自動消去なし。 */
  function show(message: string, type: Toast['type'] = 'success', duration = 2200) {
    const id = ++idSeq
    toasts.value = [...toasts.value, { id, message, type }]
    if (import.meta.client && duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }

  const success = (m: string, d?: number) => show(m, 'success', d)
  const error = (m: string, d?: number) => show(m, 'error', d)
  const info = (m: string, d?: number) => show(m, 'info', d)

  return { toasts, show, success, error, info, dismiss }
}

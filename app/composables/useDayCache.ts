// 日別データの共有キャッシュ（もっさり対策・タスク#3）。
// カレンダーが月一括取得した entries/places をここへ流し込み、日別ページは初期表示に使う
// （即描画→裏で /api/day を refresh）。月をまたいでも壊れず、未キャッシュ日は通常fetch。
import type { DayEntry } from '#shared/types/api'

export interface CachedDay {
  entries: DayEntry[]
  place: string | null
}

export function useDayCache() {
  const cache = useState<Record<string, CachedDay>>('dayCache', () => ({}))

  /** カレンダー月データ（date→entries / date→place）をまとめて投入。 */
  function setMany(
    entries: Record<string, DayEntry[]>,
    places: Record<string, string | null>,
  ) {
    const next: Record<string, CachedDay> = { ...cache.value }
    for (const date of Object.keys(entries)) {
      next[date] = { entries: entries[date] ?? [], place: places[date] ?? null }
    }
    cache.value = next
  }

  /** 指定日の初期表示用スナップショット（無ければ null）。 */
  function get(date: string): CachedDay | null {
    return cache.value[date] ?? null
  }

  return { cache, setMany, get }
}

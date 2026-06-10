# 状態管理・グラフ・タイムゾーン方針（§6-7）

## 1. 状態管理 = useState ＋ composables（決定）

Pinia は**導入しない**。個人利用MVPの規模では Nuxt 組込の `useState` ＋ composables で十分、
依存とボイラープレートを増やさない（ユーザー決定）。

- **サーバデータ**: `useAsyncData` / `useFetch` / `$fetch`（SSRキャッシュ・再取得制御）を中心に取得。
  生データのクライアント集計はしない（集計はDB側・api.md §1）。
- **横断状態**: `useState` ベースの composable に閉じ込める。コンポーネントから直接 `useState` を触らない。
- **責務分離**: 「取得・整形」は composable、「描画」はコンポーネント。

### composable 構成案

| composable | 役割 | 主データ源 |
|---|---|---|
| `useAuth()` | ログインユーザー・ログイン/ログアウト | `@nuxtjs/supabase`（`useSupabaseUser` ラップ） |
| `useCalendar(month)` | 月次の部位色ドット | `GET server/api/calendar/[month]` |
| `useWorkout(date)` | 日別の種目エントリ＋トップセット | workout/we ＋ `v_top_set` |
| `useSetEditor(weId)` | セットCRUD・`set_no`再採番連携 | workout_set（SDK＋server/api） |
| `useLastRecord(exerciseId, before)` | 前回トップセット＋自己ベスト（§9.4） | `GET server/api/exercise/[id]/last` |
| `useExerciseMaster()` | 種目/部位/方法のCRUD・部位タブ絞り込み | exercise/body_part/training_method（SDK＋RLS） |
| `useDashboardFilter()` | 期間/部位/種目の選択状態（既定 直近12週） | `useState`（横断状態） |
| `useDashboard(filter)` | 4指標データ取得 | `server/api/dashboard/*` |

## 2. グラフ = Chart.js（`vue-chartjs`）

design.md §5 で第一候補確定。凝る場合のみ ECharts 検討（今回はLater）。

- **共通ラッパ `<LineChart>`** を1つ作り、推移系3指標（部位別ボリューム／種目別最大重量／推定1RM）で再利用。
  props: `series`（ラベル＋点列）, `xType`（週/日）, `unit`。
- **OVERLOADED は折れ線ではなくカード** `<OverloadedCard>`（前週比テキスト＋達成バッジ／「New」）。
- Chart.js は必要なコントローラ/エレメントのみ `register` する（バンドル削減）。
- SSR考慮: グラフは `<ClientOnly>` でクライアント描画（canvas依存）。

### コンポーネント分割
```
components/
  chart/LineChart.vue        # Chart.js ラッパ（推移系3指標で共用）
  dashboard/OverloadedCard.vue
  dashboard/DashboardFilter.vue
  calendar/CalendarMonth.vue, CalendarDayCell.vue
  workout/ExerciseEntryRow.vue, SetRow.vue, LastRecordBadge.vue
  exercise/BodyPartTabs.vue, ExerciseList.vue, *EditDialog.vue
```

## 3. タイムゾーン = JST 固定（§9.6）

- 「今日」・表示日付・週境界はクライアントでも **Asia/Tokyo 基準**で算出する。端末TZに依存させない。
- **日付ユーティリティ `utils/date.ts`（実装フェーズ）**:
  - `todayJst(): 'YYYY-MM-DD'`、`formatJst(date)`、`weekStartJst(date)`（日曜始まり）。
  - `weekStartJst` はDBの `fn_week_start`（`aggregations.sql`）と**同じ規則（日曜始まり）**にそろえる。
- 集計はDB側で週境界済みなので、クライアントで再変換しない（二重変換による境界バグ防止・design.md リスク）。
- `workout.date` は `date` 型（時刻なし）でやり取り。ISO文字列の時刻付与・UTC変換を挟まない。

## 4. 実装フェーズへの申し送り
- composable は「1画面1〜複数」を目安に薄く保ち、ロジックの本体（集計）はSQL側に置く。
- `<LineChart>` のオプション（軸・凡例）は4指標で共通化できる範囲を最大化する。

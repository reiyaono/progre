# API / データアクセス方針（§6-5）

`docs/design.md`（案A: Nuxt + Supabase）と `docs/design/*.sql`（DDL/RLS/集計）を前提に、
クライアント〜Nitro〜Postgres のデータアクセス層を設計する。

## 1. 二層方針

| 種別 | 経路 | 認可 | 例 |
|---|---|---|---|
| 単純CRUD | クライアント → `@nuxtjs/supabase` SDK → Postgres | **RLS**（`user_id=auth.uid()`） | 記録(workout/we/set)・種目マスタ(exercise/body_part/training_method) |
| 重い集計 | クライアント → Nitro `server/api/*` → view/RPC | RLS継承（後述） | ダッシュボード4指標・カレンダー月次ドット・前回記録参照 |

- **単純CRUD**は SDK 直叩き＋RLS で十分（行レベル分離は `rls.sql` が単一の砦）。ボイラープレートを増やさない。
- **重い集計**は Postgres の view/RPC（`docs/design/aggregations.sql`）に寄せ、Nitro 経由で取得。
  サーバレスのコールドスタート/10秒制限を避ける（design.md §7）。クライアントで生データを引いて集計しない。

## 2. 認可とキーの扱い（重要）

- クライアントが持つのは **anon キー**のみ。RLS が全テーブルで有効なので、anon＋ユーザーJWT で「自分の行」しか触れない。
- **service-role キーはサーバ専用**（`server/api` のみ）。クライアントへ絶対に渡さない（詳細は `ops.md`）。
- 集計エンドポイントでも「呼び出しユーザーのデータだけ」を返す必要がある。方針:
  - Nitro では **呼び出しユーザーのJWTを引き継いだ Supabase クライアント**（`serverSupabaseClient`）で view/RPC を呼ぶ → RLS がそのまま効く。
  - `v_*` ビューは `security_invoker=true`、`fn_overloaded_report` は SECURITY INVOKER なので、**呼び出しユーザーのRLSが適用**される（`aggregations.sql` で確認済み）。
  - service-role を使う集計は原則設けない。やむを得ず使う場合は `where user_id = <検証済みuid>` を必須とし、uid はサーバで検証したJWTから取得する。

## 3. エンドポイント表（画面 → アクセス手段）

| 画面 / 用途 | 必要データ | アクセス手段 | 参照オブジェクト |
|---|---|---|---|
| カレンダー（月） | 各日の実施部位色（ユニーク・最大4＋n） | `GET server/api/calendar/[month]` | workout × workout_exercise × exercise × body_part を集約 |
| 日別ワークアウト | その日の種目リスト＋各トップセット/ボリューム | `GET server/api/day/[date]` または SDK＋`v_top_set` | workout / workout_exercise / `v_top_set` |
| セット記録 | セット一覧、メモ | SDK直＋RLS | workout_set / workout_exercise |
| 前回記録参照 | 前回トップセット＋全期間自己ベスト（§9.4） | `GET server/api/exercise/[id]/last?before=[date]` | `v_top_set` ＋ max(weight) |
| ダッシュボード① 部位別ボリューム推移 | 週次Σ | `GET server/api/dashboard/volume` | `v_weekly_bodypart_volume` |
| ダッシュボード② 種目別最大重量推移 | 日次max | `GET server/api/dashboard/max-weight` | `v_exercise_max_weight` |
| ダッシュボード③ OVERLOADED | 今週vs先週 | `GET server/api/dashboard/overloaded?week=[date]` | `fn_overloaded_report` |
| ダッシュボード④ 推定1RM推移 | 日次Epley | `GET server/api/dashboard/est-1rm` | `v_exercise_est_1rm` |
| 種目マスタ CRUD | 種目/部位/方法 | SDK直＋RLS | exercise / body_part / training_method |
| 記録 CRUD | workout/we/set 作成・編集・削除 | SDK直＋RLS（＋下記トランザクション） | workout / workout_exercise / workout_set |

- 集計系GETは期間/部位/種目で絞り込み（クエリパラメータ）。既定 直近12週（§9.2）。

## 4. バリデーション・整合の方針

- **多層防御**: クライアントで §9.1（weight 0.25刻み/0〜999、reps 1〜99、interval 任意≥0）を事前チェック。**最終防衛はDBのCHECK制約**（`schema.sql` で検証済み）。
- **`set_no` 振り直し（§9.5・歯抜けなし）**: セット追加/削除時にサーバ（`server/api/...` のトランザクション）で 1..n に再採番。クライアント単独の連番依存にしない。
- **最後の種目を消した日の workout 自動削除（§7）**: workout_exercise 全削除時にサーバ側トランザクションで親 workout も削除し、カレンダーのドットを消す。
- **同名種目は警告のみ（§9.8）**: 一意制約は課さず、クライアントで重複警告のみ表示。

## 5. 実装フェーズでの落とし込み（参考）

- `server/utils/supabase.ts` 等で `serverSupabaseClient`（ユーザーJWT）/ service-role の取得を分離。
- 集計エンドポイントは view/RPC を1回呼ぶだけの薄いラッパに保つ（ロジックはSQL側）。

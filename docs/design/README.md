# 詳細設計（`docs/design/`）

`docs/design.md`（技術選定: 案A Nuxt + Supabase）を前提に、§6 の作業項目 **1〜9** を
確定した成果物。1〜4 は実際に動く SQL（docker Postgres 16 で検証済み）、5〜9 は設計文書＋
`.env.example`（実ファイル）。

## ファイル一覧と責務

### データ/バックエンド核（§6-1〜4・動くSQL）
| ファイル | §6 | 責務 |
|---|---|---|
| `schema.sql` | 1 | 6テーブルのDDL。`auth.users` 参照、CHECK制約（§9.1）、UNIQUE、索引、削除方針コメント |
| `rls.sql` | 3 | 全テーブルRLS有効化。トップレベルは `user_id=auth.uid()`、子は親JOIN。末尾にカバレッジ表 |
| `seed.sql` | 2 | `handle_new_user()`＋`auth.users` トリガで新規ユーザーに 部位6/方法3/種目6 を投入 |
| `aggregations.sql` | 4 | 週次ボリューム(日曜始まり)/Epley 1RM/種目別最大/トップセット/OVERLOADED前週比RPC |

### アプリ設計（§6-5〜9・設計文書）
| ファイル | §6 | 責務 |
|---|---|---|
| `api.md` | 5 | データアクセス二層方針（CRUDはSDK＋RLS／集計はNitro→view/RPC）、エンドポイント表、キー扱い |
| `screens.md` | 6 | ルートマップ・認証ミドルウェア・画面遷移図・各画面仕様（空状態/初期表示含む） |
| `frontend.md` | 7 | 状態管理=useState＋composables、Chart.jsラッパ、JST日付ユーティリティ方針 |
| `ops.md` | 8,9 | 環境変数・anon/service-role 切り分け表、マイグレーション運用（`supabase/migrations`昇格規約） |
| `../../.env.example` | 8 | 環境変数テンプレート（実ファイル成果物） |

## 適用順（重要）

依存関係があるため必ずこの順で適用する:

```
schema.sql  →  rls.sql  →  seed.sql  →  aggregations.sql
```

> Supabase本番では `auth.users` は既存。`seed.sql` のトリガはそのまま使える。
> ビューは `security_invoker = true`、RPC は SECURITY INVOKER のため、基底テーブルの
> RLS が呼び出しユーザーに対して効く。

## ダッシュボード4指標（F-05）との対応

| 指標 | 集計オブジェクト |
|---|---|
| ① 部位別ボリューム推移（週次） | `v_weekly_bodypart_volume` |
| ② 種目別最大重量推移（日次） | `v_exercise_max_weight` |
| ③ 週次OVERLOADEDレポート（今週vs先週） | `fn_overloaded_report(p_week)` |
| ④ 推定1RM / Max推移（Epley・日次） | `v_exercise_est_1rm` |
| （記録画面）前回トップセット参照（§9.4） | `v_top_set` |

## 検証（再現手順）

psql 未導入環境のため docker で throwaway Postgres を使う:

1. `docker run -d --name ovld_pgtest -e POSTGRES_PASSWORD=pw postgres:16`
2. `auth` スキーマのスタブ（`auth.users` ＋ セッションGUC `test.uid` を読む `auth.uid()`）を作成
3. `schema → rls → seed → aggregations` を順に適用
4. 2ユーザー＋2〜3週ぶんのサンプルを投入し、以下をアサート（全PASS確認済み）:
   - 週境界: 土(06-06)→週開始05-31 / 日(06-07)→週開始06-07（日曜始まり）
   - 週次ボリューム: 先週胸=1500 / 今週胸=1700 / 今週脚=600
   - Epley: 100kg×10 → 推定1RM 133.3
   - OVERLOADED: 胸 achieved(+200) / 脚 is_new（先週データ無し→「New」§9.2）
   - トップセット: 今週ベンチ最大=80kg
   - RLS: 非特権ロール `app_user` で u1 は自分の3件のみ、u2 は0件（行レベル分離）
   - CHECK: weight 60.10（0.25刻み違反）は拒否

> docker内Postgresは `auth.uid()` を完全再現しないため RLS は「ポリシー定義の構文＋
> JOIN論理」の検証が主目的。本番相当の最終確認は実装フェーズで
> `supabase start`（ローカルスタック）で行う。

## 次フェーズ（実装）

設計フェーズ（§6-1〜9）は完了。次は実装フェーズ:

- `supabase init` ＋ `docs/design/*.sql` を `supabase/migrations` へ昇格（`ops.md` §3）。
- Nuxt プロジェクト初期化（`@nuxtjs/supabase` / `vue-chartjs`）、認証ミドルウェア、画面・composable 実装（`screens.md` / `frontend.md`）。
- `server/api/*` 集計エンドポイント（`api.md`）。
- 実装フェーズで開発ルール（言語/FW/テスト）を `CLAUDE.md` に追記、RLS必須などの規約も反映（`ops.md` §3）。

# 環境・シークレット・マイグレーション運用（§6-8・§6-9）

## 1. 環境変数

| 変数 | 用途 | クライアント露出 | 置き場所 |
|---|---|---|---|
| `SUPABASE_URL` | Supabase プロジェクトURL | 可 | `@nuxtjs/supabase` `url` |
| `SUPABASE_KEY` | **anon** public key | **可** | `@nuxtjs/supabase` `key`（公開設定） |
| `SUPABASE_SERVICE_ROLE_KEY` | **service-role** key（RLSバイパス） | **不可** | `runtimeConfig`（サーバのみ・`server/api`） |

### キー切り分けの原則
- ブラウザに出るのは `SUPABASE_URL` と **anon キー**だけ。RLS が全テーブル有効なので anon でも「自分の行」しか触れない。
- **service-role キーは絶対にクライアントへ出さない**。`runtimeConfig`（`public` ではない側）に置き、`server/api` 内でのみ使用。
- 集計エンドポイントは原則 **ユーザーJWTを引き継いだクライアント**（`serverSupabaseClient`）で view/RPC を呼び、RLS を効かせる（api.md §2）。service-role は本当に必要な管理操作に限定。

### `@nuxtjs/supabase` / runtimeConfig 設定イメージ（実装フェーズ）
```ts
// nuxt.config.ts（抜粋・実装フェーズで作成）
supabase: {
  // url/key は anon。redirect は middleware で制御（screens.md §2）
  redirectOptions: { login: '/login', callback: '/', exclude: ['/signup'] },
},
runtimeConfig: {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // server only
}
```

## 2. `.env.example`（リポジトリ直下・実ファイル）

実値は `.env` に置く。`.gitignore` は `.env` / `.env.*` を無視し `!.env.example` のみ追跡する設定済み
（流出防止確認済み）。内容は `/.env.example` を参照。

## 3. マイグレーション運用（§6-9）

設計成果物の `docs/design/*.sql` を、実装フェーズで Supabase migration に**昇格**してバージョン管理する。

### 手順（実装フェーズ）
1. `supabase init` でプロジェクト構成を作成。
2. `docs/design/*.sql` を `supabase/migrations/<timestamp>_*.sql` にコピーし、**適用順をタイムスタンプ昇順**に対応づける:

   | 順 | 元ファイル | migration 例 |
   |---|---|---|
   | 1 | `schema.sql` | `20260610090001_schema.sql` |
   | 2 | `rls.sql` | `20260610090002_rls.sql` |
   | 3 | `seed.sql` | `20260610090003_seed.sql` |
   | 4 | `aggregations.sql` | `20260610090004_aggregations.sql` |

   ※ `seed.sql` の `handle_new_user()` は `auth.users` への AFTER INSERT トリガ。本番 `auth.users` 既存環境でそのまま機能する。
3. ローカル検証: `supabase start` → `supabase db reset`（migration 全適用）。
4. 本番反映: `supabase db push`（または CI から）。
5. **変更は必ず新規 migration を追加**（既存ファイルは編集しない＝再現性確保）。

### 規約（CLAUDE.md への追記候補）
- **新テーブルを追加したら必ず RLS を有効化＋CRUDポリシーを書く**（`rls.sql` の様式・カバレッジ表を踏襲）。
- 集計ロジックは**SQL側（view/RPC）に置く**。アプリ側で生データ集計しない。
- 週境界は `fn_week_start`（日曜始まり）に統一。クライアントの日付ユーティリティも同規則（frontend.md §3）。
- マスタ系は論理削除（`is_archived`）、記録系は物理削除（§7）。

## 4. デプロイ（参考・design.md §5）
- ホスティング: Vercel（Nuxt親和）。環境変数（上記3種）をプロジェクト設定に登録。
- Supabase 無料枠の自動一時停止（1週間無アクセス→再開~30秒）に留意（design.md §7）。

# 設計書

> `docs/requirements.md`（MVPスコープ確定版）を前提に、技術選定〜設計を記述する。

最終更新: 2026-06-10 / ステータス: **設計フェーズ完了（§6-1〜9）。SQLはdocker検証済み・成果物は `docs/design/`。次は実装フェーズ**

---

# 技術選定

> 無料枠の数値は2026年6月時点の一般公開情報に基づく概算であり、各社の最新仕様を都度確認すること。

## 1. 前提の効き方
- スマホブラウザ前提・オフライン非対応 → サーバ／DB前提で素直に作れる。
- クラウドDB・ID/PASS認証・ユーザー間の行レベル分離が必須 → 認証＋RLSの実装容易性が重要。
- 機能の核が集計・時系列グラフ（週次ボリュームΣ(weight×reps)、Epley推定1RM、部位/種目別推移、今週vs先週のOVERLOADED判定、週は**日曜始まり**）→ SQL集計の書きやすさが効く＝RDB有利。
- データモデルが明確なリレーショナル構造 → RDBが自然。
- 開発者はNuxt慣れ・無料枠志向・学習目的（Claude Code機能習得）が主眼。

## 2. 技術スタック3案
- **案A: Nuxt フルスタック + Supabase**（Postgres + Auth + RLS）
- **案B: Vue SPA + Supabase**（ブラウザから直接SDK、静的ホスティング）
- **案C: Nuxt + Firebase**（Firestore + Firebase Auth）

## 3. 比較表

| 評価軸 | 案A: Nuxt + Supabase | 案B: Vue SPA + Supabase | 案C: Nuxt + Firebase |
|---|---|---|---|
| 無料枠の現実性 | ◎ DB 500MB/帯域5GB/MAU5万 ＋ホスティング無料 | ◎ 同上＋静的で更に軽い | ○ Spark無料だが集計で読取消費増 |
| 認証＋RLSの実装 | ◎ Postgres RLSで `user_id=auth.uid()` を宣言的に強制 | ○ 同RLSだがクライアント直叩き＝RLSが唯一の砦 | △ Security Rulesが独自で学習コスト |
| 集計・グラフとの相性 | ◎ `date_trunc`/`GROUP BY`/window、ビュー/RPC化 | ○ DBは同等だがRPC/クライアント集計中心 | △ Firestoreは集計が弱い |
| Nuxt慣れとの整合 | ◎ Nuxtフル活用＋サーバ機能 | ○ Vue知識は活きるがNuxt未使用 | ○ Nuxtは活きるが思想が別物 |
| 学習/運用/ロックイン | 低〜中 / 低 / 中（標準PG＝移行容易）| 低 / 最小 / 中 | 中〜高 / 低 / 高（NoSQL独自）|

凡例: ◎優 / ○可 / △やや難

## 4. 推奨案: 案A「Nuxt フルスタック + Supabase」
- **集計が全部SQLで書ける**のが決定打（週次ボリューム・Epley・前週比すべて `GROUP BY`/window/`date_trunc`）。
- **認証＋RLSが宣言的**で「行レベル分離」を1か所に集約できる（要件F-01）。
- **Nuxt慣れと完全整合**。`@nuxtjs/supabase` でクッキーセッション・サーバルート・ミドルウェアまで一気通貫。機微な集計はNitroサーバ側に置けRLS漏れの単一障害点を低減。
- 無料枠で個人利用は十分、標準Postgresで移行容易＝ロックイン軽。
- 学習目的に対し技術側の認知負荷を最小化。

## 5. 推奨案の具体構成
- **フロント**: Nuxt 3/4（SSR/フルスタック、`<script setup>`+TS、Nitroサーバルート併用）
- **BaaS**: Supabase（重い集計は Postgres のビュー or RPC に寄せ、`server/api` 経由で呼ぶ）
- **DB**: Supabase Postgres。要件のデータモデルをDDL化、`UNIQUE(workout_id, exercise_id)`・`UNIQUE(user_id, date)` 等
- **認証**: Supabase Auth（メール＋パスワード）。Nuxtは `@nuxtjs/supabase` のクッキーセッション＋ルートミドルウェアで未ログイン誘導
- **グラフ**: Chart.js（`vue-chartjs`）第一候補、凝るならECharts
- **ホスティング**: Vercel（Nuxt親和性高）／代替 Cloudflare Pages
- **無料枠の主要リミット（概算・2026時点）**:
  - Supabase: DB 500MB / 帯域 ~5GB月 / MAU 5万 / アクティブPJ2つ / 1週間無アクセスで自動一時停止（再開~30秒）
  - Vercel Hobby: 帯域 ~100GB月 / 関数 ~10万呼/月 / 実行 ~10秒 / 1シート

## 6. 設計フェーズの作業項目
> **全項目（1〜9）完了**。成果物は `docs/design/`（索引は `docs/design/README.md`）。1〜4のSQLは docker Postgres 16 で適用＋アサーション検証済み。5〜9は設計文書＋ `.env.example`（実ファイル）。

1. ~~**DDL作成**~~ ✅ → `docs/design/schema.sql`（6テーブル＝Userは`auth.users`に集約。型/NOT NULL/FK/UNIQUE/CHECK/索引/HEX色）
2. ~~**シードデータ設計**~~ ✅ → `docs/design/seed.sql`（`handle_new_user()`＋`auth.users`トリガで部位6/方法3/種目6を投入）
3. ~~**RLSポリシー設計**~~ ✅ → `docs/design/rls.sql`（全テーブルRLS有効化。トップレベル`user_id=auth.uid()`、子は親JOIN、CRUD毎＋カバレッジ表）
4. ~~**集計クエリ設計（最重要）**~~ ✅ → `docs/design/aggregations.sql`（週次ボリューム[日曜始まり`fn_week_start`]/Epley推定1RM/トップセット[window]/OVERLOADED前週比RPC）
5. ~~**API/データアクセス方針**~~ ✅ → `docs/design/api.md`（二層: CRUDはSDK＋RLS／集計はNitro→view/RPC、エンドポイント表、キー扱い）
6. ~~**画面遷移設計**~~ ✅ → `docs/design/screens.md`（ルートマップ・認証ミドルウェア・遷移図・各画面仕様/空状態/初期表示）
7. ~~**状態管理・グラフ方針**~~ ✅ → `docs/design/frontend.md`（**useState＋composables**に決定／Chart.jsラッパ／JST日付ユーティリティ）
8. ~~**環境・シークレット管理**~~ ✅ → `docs/design/ops.md` ＋ `.env.example`（anon/service-role 切り分け表）
9. ~~**マイグレーション運用**~~ ✅ → `docs/design/ops.md` §3（`docs/design/*.sql` を `supabase/migrations/<timestamp>_*.sql` へ昇格する規約）

## 7. 注意点・リスク
- Supabase無料枠の**自動一時停止**（1週間無アクセス→再開~30秒のコールドスタート）
- Vercelサーバレスの**コールドスタート/10秒実行制限** → 集計はDB側（ビュー/RPC）に寄せて回避
- **集計の重さ**: FK列・`date`・`exercise_id` にインデックス。頻出集計はビュー/マテビュー検討
- **RLS設計漏れ**: 子テーブルは親JOINで正しく書く。テーブル追加時はRLS必須を `CLAUDE.md` に規約化推奨
- **週=日曜始まりの境界バグ**: `date_trunc('week')` は月曜始まり。オフセット＋TZをテストで固定
- 無料枠の数値は変動 → 着手時に各公式pricing再確認

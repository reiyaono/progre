# CLAUDE.md — ovld_cp プロジェクト規約

筋トレメモWebアプリ（OVLD参考の自作版）。Claude Code 機能の習得を兼ねたプロジェクト。

## 進め方の原則
- フェーズ順: 要件定義 → 設計 → 実装 → テスト/レビュー。各フェーズの成果物は `docs/` に残す。
- 大きめのタスクに入る前は **plan mode** で計画を立てて合意してから着手する。
- お手本アプリ（OVLD）の著作物（画像・ロゴ・文言・コード）は流用しない。機能とUXのみ参考にする。

## ドキュメント
- 要件定義: `docs/requirements.md`
- 設計: `docs/design.md`（技術選定〜設計）＋ 詳細設計索引 `docs/design/README.md`
- 既知の制限・将来TODO: `docs/known-issues.md`

## 開発ルール（実装フェーズで確定）
- **言語/FW**: TypeScript + Nuxt 4（`<script setup>`、`app/` srcDir、Nitro サーバルート併用）。
- **BaaS/DB**: Supabase（ローカルは Supabase CLI＝docker）。Postgres + Auth(メール/PW・確認オフ・最小8文字)。
- **状態管理**: `useState` ＋ composables（Pinia 不採用）。横断状態はコンポーネントから直接 `useState` を触らず composable 経由。
- **スタイル**: プレーンCSS（`<style scoped>`＋`app/assets/css/main.css` のCSS変数）。UIライブラリ/Tailwind 不採用。
- **データアクセス（二層）**: 単純CRUDは SDK直＋RLS／重い集計は Nitro `server/api/*` 経由で view・RPC を呼ぶ。クライアントで生データ集計しない（api.md）。集計は JWT継承クライアント（`serverSupabaseClient`）で RLS を効かせる。service-role は `server/api` 限定・原則不使用。
- **RLS 必須**: 新テーブルを追加したら必ず RLS 有効化＋CRUDポリシーを書く（`docs/design/rls.sql` の様式・カバレッジ表を踏襲）。
- **削除方針**: マスタ系（exercise/body_part/training_method）は論理削除（`is_archived`）、記録系は物理削除（§7）。
- **整合の要る記録操作**は SECURITY INVOKER の RPC に集約（`set_no` 再採番／最後の種目で workout 自動削除など）。
- **週境界**: 日曜始まりに統一。DBは `fn_week_start`、クライアントは `app/utils/date.ts`（同規則）。日付は JST 固定、`workout.date` は時刻なし `date` 型。
- **マイグレーション**: `supabase/migrations/<timestamp>_*.sql`。変更は必ず**新規追加**（既存は編集しない＝再現性。ops.md §3）。
- **型**: `npx supabase gen types` で `app/types/database.types.ts` を再生成。server/app 共有型は `shared/types/api.ts`（`#shared`）。
- **キー**: anon のみクライアント露出可（`.env`／git無視）、service-role は `runtimeConfig`（非public）。
- **テスト**: MVP は手動E2E＋型チェック中心。リグレッションは `.claude/agents/regression-tester.md`（typecheck＋Supabase E2E＋HTTPスモーク）。重い集計ロジックはSQL側で検証済み。
- **コミット**: 作業単位で小さくコミット。コミット/プッシュはユーザー指示があるときのみ。

## Claude Code 活用メモ（学習用）
- **Skills**: 繰り返す定型作業は自作スラッシュコマンド化する（例: 機能追加フロー）。
- **Subagent(Task)**: 独立した機能・調査は並列で投げる。実績: M4 のリーフUI4本・M5 のAPI/グラフ/カードを並列実装。リグレッション専任の `regression-tester` を `.claude/agents/` に常備。
- **Workflow**: 設計の複数案比較やレビューのファンアウトに使う。
- **plan mode**: 大きめタスクは計画合意してから着手（M1〜M5 の各実装前に使用）。

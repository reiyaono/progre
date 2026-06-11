# 既知の制限・将来TODO

MVP では未対応だが、機能拡張時に対処すべき事項を記録する。

## 1. アカウント削除時の FK カスケード順序（記録系）

**現象**: `auth.users` を直接 DELETE（＝将来のアカウント削除機能）すると、
`workout_exercise.exercise_id → exercise(id)` の FK が `ON DELETE CASCADE` でないため、
ユーザー削除のカスケード順序によっては FK 制約違反になり得る。

**なぜ通常運用で問題にならないか**:
- マスタ（exercise/body_part/training_method）は**論理削除（`is_archived`）**前提（§7・M3）で、
  ハード削除しない。`exercise` への RESTRICT は「使用中マスタの誤削除防止」として意図的。
- ハード削除が走るのは `auth.users` のカスケードのみ。MVP にアカウント削除機能は無い。

**将来の対処案（いずれか）**:
- `auth.users` 削除前トリガで、当該ユーザーの `workout`（→`workout_exercise`→`workout_set` は既存 cascade）
  を先に削除してから `exercise` 等を消す。
- もしくは記録系の所有関係を見直し、ユーザー削除専用の後始末関数を用意する。
- 変更は**新規マイグレーション**で行う（既存は編集しない・ops.md §3.5）。

**発見**: M5 後のリグレッションテスト（`.claude/agents/regression-tester.md`）の後始末工程。

## 2. 自重種目で前回比較バッジ（LastRecordBadge）が非表示

**現象**: 自重（回数のみ）種目のセット記録画面では、前回比較バッジを出していない
（有酸素と同様に `v-if="!isCardio && !isBodyweight"` で抑止）。

**理由**: `useLastRecord` / `last` API が**重量ベース**（トップセット＝最大重量・ベスト重量）の
比較を返す実装で、回数のみの自重には意味のある値を出せないため。進捗は「最大回数の推移」
グラフ（`v_exercise_max_reps`）で代替している。

**将来の対処案**:
- `last` API に「回数ベースの前回比較」（前回の最大回数・自己ベスト回数）を追加し、
  自重時はそれを `LastRecordBadge` に渡して表示する。
- 変更は**新規マイグレーション**不要（API/ビュー側のみ）だが、`v_exercise_max_reps` の
  自己ベスト集計を流用できる。

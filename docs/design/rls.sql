-- ============================================================================
-- ovld_cp — rls.sql （RLSポリシー / 設計フェーズ成果物・§6-3）
-- 前提: schema.sql 適用後に実行する。
-- 方針（要件 F-01 / design.md §4・リスク「RLS設計漏れ」）:
--   ・全テーブル RLS 有効化。「行レベル分離」を auth.uid() に集約する。
--   ・トップレベル（user_id を直接持つ）は  user_id = auth.uid()。
--   ・子テーブル（workout_exercise / workout_set）は親JOINで所有者を辿る。
--   ・CRUD（select / insert / update / delete）ごとにポリシーを書く。
--   ・新テーブル追加時は RLS 必須を CLAUDE.md に規約化（design.md リスク）。
-- ============================================================================

alter table public.body_part        enable row level security;
alter table public.training_method  enable row level security;
alter table public.exercise         enable row level security;
alter table public.workout          enable row level security;
alter table public.workout_exercise enable row level security;
alter table public.workout_set      enable row level security;

-- ----------------------------------------------------------------------------
-- body_part（トップレベル）
-- ----------------------------------------------------------------------------
create policy body_part_select on public.body_part
  for select using (user_id = auth.uid());
create policy body_part_insert on public.body_part
  for insert with check (user_id = auth.uid());
create policy body_part_update on public.body_part
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy body_part_delete on public.body_part
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- training_method（トップレベル）
-- ----------------------------------------------------------------------------
create policy training_method_select on public.training_method
  for select using (user_id = auth.uid());
create policy training_method_insert on public.training_method
  for insert with check (user_id = auth.uid());
create policy training_method_update on public.training_method
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy training_method_delete on public.training_method
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- exercise（トップレベル）
-- ※ body_part_id / training_method_id の所有者一致はアプリ層で担保。
--   （他人のマスタIDを挿そうとしても select 不能で実用上参照できない）
-- ----------------------------------------------------------------------------
create policy exercise_select on public.exercise
  for select using (user_id = auth.uid());
create policy exercise_insert on public.exercise
  for insert with check (user_id = auth.uid());
create policy exercise_update on public.exercise
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exercise_delete on public.exercise
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- workout（トップレベル）
-- ----------------------------------------------------------------------------
create policy workout_select on public.workout
  for select using (user_id = auth.uid());
create policy workout_insert on public.workout
  for insert with check (user_id = auth.uid());
create policy workout_update on public.workout
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workout_delete on public.workout
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- workout_exercise（子: workout 経由で所有者を辿る）
-- ----------------------------------------------------------------------------
create policy workout_exercise_select on public.workout_exercise
  for select using (exists (
    select 1 from public.workout w
    where w.id = workout_exercise.workout_id and w.user_id = auth.uid()
  ));
create policy workout_exercise_insert on public.workout_exercise
  for insert with check (exists (
    select 1 from public.workout w
    where w.id = workout_exercise.workout_id and w.user_id = auth.uid()
  ));
create policy workout_exercise_update on public.workout_exercise
  for update using (exists (
    select 1 from public.workout w
    where w.id = workout_exercise.workout_id and w.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.workout w
    where w.id = workout_exercise.workout_id and w.user_id = auth.uid()
  ));
create policy workout_exercise_delete on public.workout_exercise
  for delete using (exists (
    select 1 from public.workout w
    where w.id = workout_exercise.workout_id and w.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- workout_set（孫: workout_exercise → workout 経由で所有者を辿る）
-- ----------------------------------------------------------------------------
create policy workout_set_select on public.workout_set
  for select using (exists (
    select 1 from public.workout_exercise we
    join public.workout w on w.id = we.workout_id
    where we.id = workout_set.workout_exercise_id and w.user_id = auth.uid()
  ));
create policy workout_set_insert on public.workout_set
  for insert with check (exists (
    select 1 from public.workout_exercise we
    join public.workout w on w.id = we.workout_id
    where we.id = workout_set.workout_exercise_id and w.user_id = auth.uid()
  ));
create policy workout_set_update on public.workout_set
  for update using (exists (
    select 1 from public.workout_exercise we
    join public.workout w on w.id = we.workout_id
    where we.id = workout_set.workout_exercise_id and w.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.workout_exercise we
    join public.workout w on w.id = we.workout_id
    where we.id = workout_set.workout_exercise_id and w.user_id = auth.uid()
  ));
create policy workout_set_delete on public.workout_set
  for delete using (exists (
    select 1 from public.workout_exercise we
    join public.workout w on w.id = we.workout_id
    where we.id = workout_set.workout_exercise_id and w.user_id = auth.uid()
  ));

-- ============================================================================
-- RLS カバレッジ表（漏れ検出用・○=ポリシー定義あり）
-- ----------------------------------------------------------------------------
--   table              | SELECT | INSERT | UPDATE | DELETE | 所有者判定
--   -------------------+--------+--------+--------+--------+--------------------
--   body_part          |   ○    |   ○    |   ○    |   ○    | user_id = auth.uid()
--   training_method    |   ○    |   ○    |   ○    |   ○    | user_id = auth.uid()
--   exercise           |   ○    |   ○    |   ○    |   ○    | user_id = auth.uid()
--   workout            |   ○    |   ○    |   ○    |   ○    | user_id = auth.uid()
--   workout_exercise   |   ○    |   ○    |   ○    |   ○    | workout 経由 JOIN
--   workout_set        |   ○    |   ○    |   ○    |   ○    | workout_exercise→workout JOIN
-- ----------------------------------------------------------------------------
-- 注: 集計ビュー（aggregations.sql の v_*）は基底テーブルのRLSを継承する
--     （security_invoker な通常ビュー）。RPC fn_overloaded_report は
--     SECURITY INVOKER のため呼び出しユーザーのRLSが効く。
-- ============================================================================

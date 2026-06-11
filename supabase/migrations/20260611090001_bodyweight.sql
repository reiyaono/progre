-- ============================================================================
-- 自重（トレーニング方法「自重」）は重量を取らず「回数」だけ記録する。
-- 種別カラムは足さず、データ形で区別（有酸素と同方式）:
--   筋トレ = weight + reps / 有酸素 = duration_sec / 自重 = reps のみ。
-- 入力フォームの出し分けのみ training_method.name='自重' で判定（アプリ層）。
-- 表示・集計は weight IS NULL AND reps IS NOT NULL で判別する。
-- ※ 既存マイグレーションは編集せず新規追加（ops.md §3.5）。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) workout_set: 「回数のみ」モードを mode_check に追加
--    （weight/reps は既に NULL 許容済み＝有酸素対応で変更済み）
-- ----------------------------------------------------------------------------
alter table public.workout_set drop constraint workout_set_mode_check;
alter table public.workout_set add constraint workout_set_mode_check check (
  (weight is not null and reps is not null)                          -- 筋トレ
  or duration_sec is not null                                        -- 有酸素
  or (weight is null and reps is not null and duration_sec is null)  -- 自重（回数のみ）
);

-- ----------------------------------------------------------------------------
-- 2) ビュー: 種目別最大回数推移（日次）— 自重系のみ（weight NULL ＋ reps あり）
--    v_set_detail は weight NULL 時に volume/est_1rm を NULL にするため、
--    重量系ビュー（v_exercise_max_weight 等）は自動的に自重を除外済み。
-- ----------------------------------------------------------------------------
create or replace view public.v_exercise_max_reps
with (security_invoker = true) as
select
  user_id, exercise_id,
  max(exercise_name) as exercise_name,
  date,
  max(reps)          as max_reps
from public.v_set_detail
where weight is null and reps is not null
group by user_id, exercise_id, date;

-- ----------------------------------------------------------------------------
-- 3) RPC: 自重セット追加（末尾 set_no 採番・weight/interval/duration=NULL・reps=値）
--    SECURITY INVOKER（plpgsql既定）＝呼び出しユーザーのRLSが効く。
-- ----------------------------------------------------------------------------
create or replace function public.fn_add_bodyweight_set(p_we uuid, p_reps smallint)
returns public.workout_set
language plpgsql
as $$
declare
  v_next smallint;
  v_row  public.workout_set;
begin
  select coalesce(max(set_no), 0) + 1 into v_next
  from public.workout_set where workout_exercise_id = p_we;

  insert into public.workout_set(workout_exercise_id, set_no, weight, reps, interval_sec, duration_sec)
  values (p_we, v_next, null, p_reps, null, null)
  returning * into v_row;

  return v_row;
end;
$$;

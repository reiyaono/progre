-- ============================================================================
-- 有酸素（部位「有酸素」）は重量×回数ではなく「分」だけ記録する。
-- 種別カラムは足さず、データ形で区別: 有酸素セット = weight/reps NULL ＋ duration_sec。
-- 入力フォームの出し分けのみ body_part.name='有酸素' で判定（アプリ層）。
-- 表示・集計は weight IS NULL で判別する。
-- ※ 既存マイグレーションは編集せず新規追加（ops.md §3.5）。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) workout_set: weight/reps を NULL 許容にし、duration_sec を追加
-- ----------------------------------------------------------------------------
alter table public.workout_set alter column weight drop not null;
alter table public.workout_set alter column reps   drop not null;

-- 既存 CHECK を NULL 許容版へ貼り直し
alter table public.workout_set drop constraint workout_set_weight_check;
alter table public.workout_set add  constraint workout_set_weight_check
  check (weight is null or (weight >= 0 and weight <= 999 and (weight * 4) = floor(weight * 4)));

alter table public.workout_set drop constraint workout_set_reps_check;
alter table public.workout_set add  constraint workout_set_reps_check
  check (reps is null or (reps between 1 and 99));

-- 時間（秒）。有酸素はここに記録。
alter table public.workout_set add column duration_sec integer
  check (duration_sec is null or duration_sec >= 0);

-- 最低1モードは必須（筋トレ=weight+reps / 有酸素=duration_sec）
alter table public.workout_set add constraint workout_set_mode_check
  check ((weight is not null and reps is not null) or duration_sec is not null);

-- ----------------------------------------------------------------------------
-- 2) 集計ビュー: volume/est_1rm を NULL 安全化＋duration_sec 追加、重量系は weight 除外
-- ----------------------------------------------------------------------------
create or replace view public.v_set_detail
with (security_invoker = true) as
select
  ws.id                       as workout_set_id,
  w.user_id                   as user_id,
  w.date                      as date,
  public.fn_week_start(w.date) as week_start,
  we.id                       as workout_exercise_id,
  e.id                        as exercise_id,
  e.name                      as exercise_name,
  bp.id                       as body_part_id,
  bp.name                     as body_part_name,
  bp.color                    as body_part_color,
  ws.set_no                   as set_no,
  ws.weight                   as weight,
  ws.reps                     as reps,
  (case when ws.weight is not null and ws.reps is not null
        then ws.weight * ws.reps end)                          as volume,
  (case when ws.weight is not null and ws.reps is not null
        then round(ws.weight * (1 + ws.reps / 30.0), 1) end)   as est_1rm,
  ws.duration_sec             as duration_sec
from public.workout_set ws
join public.workout_exercise we on we.id = ws.workout_exercise_id
join public.workout         w  on w.id  = we.workout_id
join public.exercise        e  on e.id  = we.exercise_id
join public.body_part       bp on bp.id = e.body_part_id;

-- ① 部位別ボリューム推移（週次）— 重量系のみ
create or replace view public.v_weekly_bodypart_volume
with (security_invoker = true) as
select
  user_id, week_start, body_part_id,
  max(body_part_name)  as body_part_name,
  max(body_part_color) as body_part_color,
  sum(volume)          as volume
from public.v_set_detail
where weight is not null
group by user_id, week_start, body_part_id;

-- ② 種目別最大重量推移（日次）— 重量系のみ
create or replace view public.v_exercise_max_weight
with (security_invoker = true) as
select
  user_id, exercise_id,
  max(exercise_name) as exercise_name,
  date,
  max(weight)        as max_weight
from public.v_set_detail
where weight is not null
group by user_id, exercise_id, date;

-- ④ 推定1RM推移（日次）— 重量系のみ
create or replace view public.v_exercise_est_1rm
with (security_invoker = true) as
select
  user_id, exercise_id,
  max(exercise_name) as exercise_name,
  date,
  max(est_1rm)       as est_1rm
from public.v_set_detail
where weight is not null
group by user_id, exercise_id, date;

-- トップセット（前回比較）— 重量系のみ
create or replace view public.v_top_set
with (security_invoker = true) as
select
  user_id, date, week_start,
  workout_exercise_id, exercise_id, exercise_name,
  body_part_id, body_part_name, body_part_color,
  set_no, weight, reps, volume, est_1rm
from (
  select d.*,
         row_number() over (
           partition by d.workout_exercise_id
           order by d.weight desc, d.reps desc, d.set_no asc
         ) as rn
  from public.v_set_detail d
  where d.weight is not null
) ranked
where rn = 1;

-- ----------------------------------------------------------------------------
-- 3) RPC: 有酸素セット追加（末尾 set_no 採番・weight/reps=NULL・duration_sec=値）
--    SECURITY INVOKER（plpgsql既定）＝呼び出しユーザーのRLSが効く。
-- ----------------------------------------------------------------------------
create or replace function public.fn_add_cardio_set(p_we uuid, p_duration_sec integer)
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
  values (p_we, v_next, null, null, null, p_duration_sec)
  returning * into v_row;

  return v_row;
end;
$$;

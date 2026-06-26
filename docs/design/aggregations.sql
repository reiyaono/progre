-- ============================================================================
-- ovld_cp — aggregations.sql （集計クエリ / 設計フェーズ成果物・§6-4・最重要）
-- 前提: schema.sql / rls.sql 適用後に実行する。
-- 要件: docs/requirements.md §5.1（計算ロジック）/ §9.2（ダッシュボード）
--       / §9.6（JST固定）。design.md §4・§6-4・リスク「週=日曜始まり」。
-- ----------------------------------------------------------------------------
-- 設計メモ:
--  ・workout.date は JST暦日の date 型なので集計時のTZ変換は不要（§9.6）。
--  ・週は「日曜始まり」（§5.1確定）。Postgres の date_trunc('week') は月曜
--    始まりのため、+1日して切り捨て -1日 のオフセットで日曜始まりにする。
--  ・ビューは security_invoker=true で基底テーブルの RLS を継承させる
--    （呼び出しユーザーの行だけが見える）。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 週開始日（日曜）を返すヘルパー。fn_week_start('2026-06-06'(土)) = 05-31(日)
--                                fn_week_start('2026-06-07'(日)) = 06-07(日)
-- ----------------------------------------------------------------------------
create or replace function public.fn_week_start(d date)
returns date
language sql
immutable
as $$
  select (date_trunc('week', (d + 1)::timestamp)::date - 1);
$$;

-- ----------------------------------------------------------------------------
-- 基底ビュー: セット1行に user/date/週/部位/種目 と volume・推定1RM を付与。
-- 以降の集計はこのビューから組み立てる。
--   volume    = weight * reps（§5.1）
--   est_1rm   = Epley: weight * (1 + reps/30)（§5.1）
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
  (ws.weight * ws.reps)                       as volume,
  round(ws.weight * (1 + ws.reps / 30.0), 1)  as est_1rm
from public.workout_set ws
join public.workout_exercise we on we.id = ws.workout_exercise_id
join public.workout         w  on w.id  = we.workout_id
join public.exercise        e  on e.id  = we.exercise_id
join public.body_part       bp on bp.id = e.body_part_id;

-- ----------------------------------------------------------------------------
-- F-05① 部位別ボリューム推移（週次 Σ(weight×reps)）。OVERLOADED の基盤。
-- ----------------------------------------------------------------------------
create or replace view public.v_weekly_bodypart_volume
with (security_invoker = true) as
select
  user_id,
  week_start,
  body_part_id,
  max(body_part_name)  as body_part_name,
  max(body_part_color) as body_part_color,
  sum(volume)          as volume
from public.v_set_detail
group by user_id, week_start, body_part_id;

-- ----------------------------------------------------------------------------
-- F-05② 種目別最大重量推移（日次の最大重量）
-- ----------------------------------------------------------------------------
create or replace view public.v_exercise_max_weight
with (security_invoker = true) as
select
  user_id,
  exercise_id,
  max(exercise_name) as exercise_name,
  date,
  max(weight)        as max_weight
from public.v_set_detail
group by user_id, exercise_id, date;

-- ----------------------------------------------------------------------------
-- F-05④ 推定1RM 推移（日次・種目の各セット最大の Epley 値を採用 §9.4/§5.1）
-- ----------------------------------------------------------------------------
create or replace view public.v_exercise_est_1rm
with (security_invoker = true) as
select
  user_id,
  exercise_id,
  max(exercise_name) as exercise_name,
  date,
  max(est_1rm)       as est_1rm
from public.v_set_detail
group by user_id, exercise_id, date;

-- ----------------------------------------------------------------------------
-- トップセット（種目エントリ内の最大重量セット・§5.1/§9.4）
-- 同一最大重量が複数あれば reps の大きい方→set_no 小さい方を採用。
-- ----------------------------------------------------------------------------
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
) ranked
where rn = 1;

-- ----------------------------------------------------------------------------
-- F-05③ OVERLOADED レポート（指定週 vs 前週の部位別ボリューム前週比）
--   引数 p_week は任意日でも可（内部で週開始日に正規化）。
--   戻り:
--     prev_volume が NULL = 先週データ無し → is_new=true（§9.2「New」）
--     achieved   = 今週 > 先週（先週ありのときのみ true）
--   RLS: SECURITY INVOKER（既定）＋ auth.uid() で当該ユーザーに限定。
-- ----------------------------------------------------------------------------
create or replace function public.fn_overloaded_report(p_week date)
returns table (
  body_part_id    uuid,
  body_part_name  text,
  body_part_color text,
  this_volume     numeric,
  prev_volume     numeric,
  diff            numeric,
  achieved        boolean,
  is_new          boolean
)
language sql
stable
as $$
  with wk as (
    select public.fn_week_start(p_week)                       as this_week,
           public.fn_week_start(p_week) - 7                   as prev_week
  ),
  cur as (
    select v.body_part_id, v.body_part_name, v.body_part_color, v.volume
    from public.v_weekly_bodypart_volume v, wk
    where v.user_id = auth.uid() and v.week_start = wk.this_week
  ),
  prv as (
    select v.body_part_id, v.volume
    from public.v_weekly_bodypart_volume v, wk
    where v.user_id = auth.uid() and v.week_start = wk.prev_week
  )
  select
    cur.body_part_id,
    cur.body_part_name,
    cur.body_part_color,
    cur.volume                              as this_volume,
    prv.volume                              as prev_volume,
    cur.volume - coalesce(prv.volume, 0)    as diff,
    (prv.volume is not null and cur.volume > prv.volume) as achieved,
    (prv.volume is null)                                 as is_new
  from cur
  left join prv on prv.body_part_id = cur.body_part_id
  order by cur.body_part_name;
$$;

-- ----------------------------------------------------------------------------
-- 種目の使用頻度ビュー（頻出順の種目ピッカー用）。
-- workout_exercise を種目ごとに集計。RLS は workout/workout_exercise の
-- 既存ポリシー経由で効くため security_invoker（新規ポリシー不要）。
-- ※実装は supabase/migrations/20260626090001_exercise_frequency.sql
-- ----------------------------------------------------------------------------
create view public.v_exercise_frequency
with (security_invoker = true) as
select w.user_id,
       we.exercise_id,
       count(*)::int as cnt,        -- その種目を行った日数の合計（全期間）
       max(w.date)   as last_used    -- 同数のときの並び替え用（直近優先）
from public.workout_exercise we
join public.workout w on w.id = we.workout_id
group by w.user_id, we.exercise_id;

-- ============================================================================
-- 集計オブジェクト一覧（ダッシュボード4指標との対応・要件 F-05）
-- ----------------------------------------------------------------------------
--   v_weekly_bodypart_volume … ① 部位別ボリューム推移（週次）
--   v_exercise_max_weight    … ② 種目別最大重量推移（日次）
--   fn_overloaded_report     … ③ 週次OVERLOADEDレポート（今週vs先週）
--   v_exercise_est_1rm       … ④ 推定1RM / Max推移（Epley・日次）
--   v_top_set                … 記録画面の「前回トップセット」参照（§9.4）に利用
--   v_exercise_frequency     … 種目ピッカーの頻出順（全期間の使用日数）
-- 期間/部位/種目の絞り込みは呼び出し側（WHERE）で行う（既定 直近12週・§9.2）。
-- ============================================================================

-- 種目の使用頻度ビュー（頻出順の種目ピッカー用）。
-- workout_exercise を種目ごとに集計。RLS は workout/workout_exercise の
-- 既存ポリシー経由で効くため security_invoker（新規ポリシー不要）。
create view public.v_exercise_frequency
with (security_invoker = true) as
select w.user_id,
       we.exercise_id,
       count(*)::int as cnt,        -- その種目を行った日数の合計（全期間）
       max(w.date)   as last_used    -- 同数のときの並び替え用（直近優先）
from public.workout_exercise we
join public.workout w on w.id = we.workout_id
group by w.user_id, we.exercise_id;

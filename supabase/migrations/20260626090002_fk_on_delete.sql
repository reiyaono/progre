-- record→master の外部キーに ON DELETE 動作を付与し、workout_place（cascade 済み）と揃える。
-- 目的: アカウント削除（auth.users 削除）時のカスケードを順序非依存でクリーンにする。
-- 通常運用では masters は論理削除（is_archived）のため、これらの制約は物理削除＝
-- アカウント削除時のみ発動する（論理削除方針は不変）。
-- NOT NULL 参照は cascade、nullable 参照は set null。
-- ops.md §3: 既存マイグレーションは編集せず、新規ファイルで制約を張り替える。

-- exercise → body_part（NOT NULL）
alter table public.exercise
  drop constraint exercise_body_part_id_fkey,
  add  constraint exercise_body_part_id_fkey
    foreign key (body_part_id) references public.body_part (id) on delete cascade;

-- exercise → training_method（nullable）: master 物理削除でも種目は残し参照のみ NULL 化
alter table public.exercise
  drop constraint exercise_training_method_id_fkey,
  add  constraint exercise_training_method_id_fkey
    foreign key (training_method_id) references public.training_method (id) on delete set null;

-- workout_exercise → exercise（NOT NULL）
alter table public.workout_exercise
  drop constraint workout_exercise_exercise_id_fkey,
  add  constraint workout_exercise_exercise_id_fkey
    foreign key (exercise_id) references public.exercise (id) on delete cascade;

-- supplement_intake → supplement（NOT NULL）
alter table public.supplement_intake
  drop constraint supplement_intake_supplement_id_fkey,
  add  constraint supplement_intake_supplement_id_fkey
    foreign key (supplement_id) references public.supplement (id) on delete cascade;

-- supplement_intake → supplement_timing（nullable）: master 物理削除でも記録は残し参照のみ NULL 化
alter table public.supplement_intake
  drop constraint supplement_intake_timing_id_fkey,
  add  constraint supplement_intake_timing_id_fkey
    foreign key (timing_id) references public.supplement_timing (id) on delete set null;

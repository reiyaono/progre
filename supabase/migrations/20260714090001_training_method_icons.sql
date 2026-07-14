-- トレーニング方法へ任意の固定アイコンを割り当てる。
-- 既存行は NULL のまま維持し、新規ユーザーの初期方法だけ既定値を設定する。

alter table public.training_method
  add column icon_key text null;

alter table public.training_method
  add constraint training_method_icon_key_check
  check (icon_key is null or icon_key in ('bodyweight', 'machine', 'free_weight', 'cardio', 'other'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bp_chest uuid; bp_shoulder uuid; bp_arm uuid; bp_back uuid;
  bp_legs  uuid; bp_abs uuid;      bp_cardio uuid;
  tm_body uuid; tm_machine uuid; tm_free uuid;
begin
  insert into public.body_part (user_id, name, color, sort_order) values
    (new.id, '胸',    '#E5484D', 1) returning id into bp_chest;
  insert into public.body_part (user_id, name, color, sort_order) values
    (new.id, '肩',    '#F2A93B', 2) returning id into bp_shoulder;
  insert into public.body_part (user_id, name, color, sort_order) values
    (new.id, '腕',    '#12A594', 3) returning id into bp_arm;
  insert into public.body_part (user_id, name, color, sort_order) values
    (new.id, '背中',  '#30A46C', 4) returning id into bp_back;
  insert into public.body_part (user_id, name, color, sort_order) values
    (new.id, '脚',    '#3E63DD', 5) returning id into bp_legs;
  insert into public.body_part (user_id, name, color, sort_order) values
    (new.id, '腹',    '#8E4EC6', 6) returning id into bp_abs;
  insert into public.body_part (user_id, name, color, sort_order) values
    (new.id, '有酸素', '#0091FF', 7) returning id into bp_cardio;

  insert into public.training_method (user_id, name, icon_key, sort_order) values
    (new.id, '自重', 'bodyweight', 1) returning id into tm_body;
  insert into public.training_method (user_id, name, icon_key, sort_order) values
    (new.id, 'マシン', 'machine', 2) returning id into tm_machine;
  insert into public.training_method (user_id, name, icon_key, sort_order) values
    (new.id, 'フリーウェイト', 'free_weight', 3) returning id into tm_free;

  insert into public.exercise (user_id, name, body_part_id, training_method_id, sort_order) values
    (new.id, 'ベンチプレス',     bp_chest,    tm_free,    1),
    (new.id, 'ショルダープレス', bp_shoulder, tm_machine, 2),
    (new.id, 'アームカール',     bp_arm,      tm_free,    3),
    (new.id, 'ラットプルダウン', bp_back,     tm_machine, 4),
    (new.id, 'スクワット',       bp_legs,     tm_free,    5),
    (new.id, 'クランチ',         bp_abs,      tm_body,    6),
    (new.id, 'トレッドミル',     bp_cardio,   tm_machine, 7);

  -- 直前の最新版 handle_new_user() に含まれるサプリ摂取タイミングも維持する。
  insert into public.supplement_timing (user_id, name, sort_order) values
    (new.id, '朝',      1),
    (new.id, '筋トレ後', 2),
    (new.id, '就寝前',  3);

  return new;
end;
$$;

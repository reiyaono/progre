-- ============================================================================
-- サプリ摂取タイミングの初期シード（朝/筋トレ後/就寝前）。サプリ名マスタは空で開始。
-- 1) handle_new_user() を更新 → 以後の新規ユーザーはタイミング3件付きで開始。
-- 2) 既存ユーザーへ冪等にバックフィル（タイミング未登録のユーザーにのみ挿入）。
--
-- ※ 重要: handle_new_user() は create or replace で全文上書きになる。
--   直前の最新版（20260610090006_seed_add_arm.sql の本体）を必ずベースにすること。
--   腕(bp_arm)を含む 7部位 / 3方法 / 7種目の seed を落とすと、以後の新規ユーザーの
--   腕部位・アームカールが消えるため、本体をそのまま継承し末尾にタイミングを足すだけにする。
-- ※ 既存マイグレーションは編集せず新規追加（ops.md §3.5）。
-- ============================================================================

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
  -- 部位カテゴリ（腕を肩↔背中の間に。sort_order を連番で振り直し）
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

  insert into public.training_method (user_id, name, sort_order) values
    (new.id, '自重',         1) returning id into tm_body;
  insert into public.training_method (user_id, name, sort_order) values
    (new.id, 'マシン',       2) returning id into tm_machine;
  insert into public.training_method (user_id, name, sort_order) values
    (new.id, 'フリーウェイト', 3) returning id into tm_free;

  -- 代表種目（部位順に並べ替え。腕にアームカールを追加）
  insert into public.exercise (user_id, name, body_part_id, training_method_id, sort_order) values
    (new.id, 'ベンチプレス',     bp_chest,    tm_free,    1),
    (new.id, 'ショルダープレス', bp_shoulder, tm_machine, 2),
    (new.id, 'アームカール',     bp_arm,      tm_free,    3),
    (new.id, 'ラットプルダウン', bp_back,     tm_machine, 4),
    (new.id, 'スクワット',       bp_legs,     tm_free,    5),
    (new.id, 'クランチ',         bp_abs,      tm_body,    6),
    (new.id, 'トレッドミル',     bp_cardio,   tm_machine, 7);

  -- サプリ摂取タイミング初期値（編集可マスタ。サプリ名マスタは空で開始）
  insert into public.supplement_timing (user_id, name, sort_order) values
    (new.id, '朝',      1),
    (new.id, '筋トレ後', 2),
    (new.id, '就寝前',  3);

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 既存ユーザーへのバックフィル（冪等: タイミングが1件でもあればスキップ）。
-- supplement（サプリ名）は空開始なのでバックフィル不要。
-- ----------------------------------------------------------------------------
do $$
declare
  rec record;
begin
  for rec in select distinct user_id from public.body_part loop
    if exists (
      select 1 from public.supplement_timing where user_id = rec.user_id
    ) then
      continue;
    end if;

    insert into public.supplement_timing (user_id, name, sort_order) values
      (rec.user_id, '朝',      1),
      (rec.user_id, '筋トレ後', 2),
      (rec.user_id, '就寝前',  3);
  end loop;
end $$;

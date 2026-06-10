-- ============================================================================
-- 部位「腕」をシードに追加（肩と背中の間）。色は未使用のティール #12A594。
-- 各部位に代表種目1つの方針に合わせ「アームカール」も付与。
-- 1) handle_new_user() を更新 → 以後の新規ユーザーは腕を含む7部位/7種目で開始。
-- 2) 既存ユーザーへ冪等にバックフィル（腕が無ければ肩の直後に挿入）。
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

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 既存ユーザーへのバックフィル（冪等: 腕があればスキップ）。
-- 肩の直後に来るよう、肩より後ろの sort_order を +1 して隙間を空けてから挿入。
-- 肩が見つからない（改名等）場合は末尾に追加。代表種目アームカールも付与。
-- ----------------------------------------------------------------------------
do $$
declare
  rec record;
  v_shoulder int;
  v_arm uuid;
  v_free uuid;
begin
  for rec in select distinct user_id from public.body_part loop
    if exists (
      select 1 from public.body_part
      where user_id = rec.user_id and name = '腕'
    ) then
      continue;
    end if;

    select sort_order into v_shoulder
    from public.body_part
    where user_id = rec.user_id and name = '肩'
    order by sort_order limit 1;

    if v_shoulder is null then
      select coalesce(max(sort_order), 0) + 1 into v_shoulder
      from public.body_part where user_id = rec.user_id;
      insert into public.body_part (user_id, name, color, sort_order)
      values (rec.user_id, '腕', '#12A594', v_shoulder)
      returning id into v_arm;
    else
      update public.body_part
      set sort_order = sort_order + 1
      where user_id = rec.user_id and sort_order > v_shoulder;
      insert into public.body_part (user_id, name, color, sort_order)
      values (rec.user_id, '腕', '#12A594', v_shoulder + 1)
      returning id into v_arm;
    end if;

    -- 代表種目アームカール（フリーウェイト方法があれば紐づけ）
    select id into v_free
    from public.training_method
    where user_id = rec.user_id and name = 'フリーウェイト' limit 1;

    insert into public.exercise (user_id, name, body_part_id, training_method_id, sort_order)
    values (
      rec.user_id, 'アームカール', v_arm, v_free,
      (select coalesce(max(sort_order), 0) + 1 from public.exercise where user_id = rec.user_id)
    );
  end loop;
end $$;

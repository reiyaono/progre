-- ============================================================================
-- ovld_cp — seed.sql （新規ユーザー初期データ / 設計フェーズ成果物・§6-2）
-- 前提: schema.sql 適用後に実行する。
-- 目的（要件 §7「初期データ」/ §9.8）:
--   新規ユーザー作成時に 部位6 ＋ 方法3 ＋ 代表種目を数個 投入し、
--   各画面の空状態を最小限にする。以後はユーザーが自由に編集できる。
-- 仕組み: auth.users への AFTER INSERT トリガで handle_new_user() を実行。
--         SECURITY DEFINER で RLS を越えて当該ユーザー分の行を作成する。
-- ----------------------------------------------------------------------------
-- 色（HEX）は OVLD の配色を流用せず独自に割当（CLAUDE.md: 著作物流用禁止）。
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- 部位IDを種目シードで参照するため控える
  bp_chest uuid; bp_shoulder uuid; bp_back uuid;
  bp_legs  uuid; bp_abs uuid;      bp_cardio uuid;
  -- 方法ID
  tm_body uuid; tm_machine uuid; tm_free uuid;
begin
  -- 部位カテゴリ（色・並び順つき）
  insert into public.body_part (user_id, name, color, sort_order) values
    (new.id, '胸',    '#E5484D', 1) returning id into bp_chest;
  insert into public.body_part (user_id, name, color, sort_order) values
    (new.id, '肩',    '#F2A93B', 2) returning id into bp_shoulder;
  insert into public.body_part (user_id, name, color, sort_order) values
    (new.id, '背中',  '#30A46C', 3) returning id into bp_back;
  insert into public.body_part (user_id, name, color, sort_order) values
    (new.id, '脚',    '#3E63DD', 4) returning id into bp_legs;
  insert into public.body_part (user_id, name, color, sort_order) values
    (new.id, '腹',    '#8E4EC6', 5) returning id into bp_abs;
  insert into public.body_part (user_id, name, color, sort_order) values
    (new.id, '有酸素', '#0091FF', 6) returning id into bp_cardio;

  -- トレーニング方法
  insert into public.training_method (user_id, name, sort_order) values
    (new.id, '自重',         1) returning id into tm_body;
  insert into public.training_method (user_id, name, sort_order) values
    (new.id, 'マシン',       2) returning id into tm_machine;
  insert into public.training_method (user_id, name, sort_order) values
    (new.id, 'フリーウェイト', 3) returning id into tm_free;

  -- 代表種目（部位 NOT NULL / 方法は任意。各部位に最低1つ）
  insert into public.exercise (user_id, name, body_part_id, training_method_id, sort_order) values
    (new.id, 'ベンチプレス',       bp_chest,    tm_free,    1),
    (new.id, 'ショルダープレス',   bp_shoulder, tm_machine, 2),
    (new.id, 'ラットプルダウン',   bp_back,     tm_machine, 3),
    (new.id, 'スクワット',         bp_legs,     tm_free,    4),
    (new.id, 'クランチ',           bp_abs,      tm_body,    5),
    (new.id, 'トレッドミル',       bp_cardio,   tm_machine, 6);

  return new;
end;
$$;

-- auth.users への INSERT 後にシードを実行
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 注（検証用）: docker等のスタブ環境で auth.users にトリガを張れない場合は、
--   select public.handle_new_user_for(<uuid>);  のように直接呼ぶ代わりに、
--   テスト側で擬似行を auth.users に insert してトリガ発火を確認する。
--   （aggregations の検証手順は docs/design/README.md を参照）
-- ----------------------------------------------------------------------------

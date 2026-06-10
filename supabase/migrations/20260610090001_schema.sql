-- ============================================================================
-- ovld_cp — schema.sql （DDL / 設計フェーズ成果物・§6-1）
-- 前提: Supabase Postgres。ユーザーは auth.users を正とし user_id で参照する
--       （独自 User テーブルは作らない）。
-- 適用順: schema.sql → rls.sql → seed.sql → aggregations.sql
-- 要件: docs/requirements.md §7（データモデル）/ §9.1（バリデーション）
-- ----------------------------------------------------------------------------
-- 削除方針（要件 §7 / §9.0）:
--   マスタ系（body_part / training_method / exercise）は論理削除（is_archived）
--   のみで物理削除しない＝過去記録・集計・カレンダーのドットを保持する。
--   記録系（workout_exercise / workout_set）は物理削除可。
--   最後の種目エントリを消した日の workout 自動削除は「アプリ層」で対応する
--   （実装フェーズ。本DDLでは workout を残す＝空 workout が一時的に存在しうる）。
-- ============================================================================

-- gen_random_uuid() 用（Supabaseでは既定で有効なことが多いが明示）
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 部位カテゴリ: 色を持ち、カレンダーのドット色の源泉（要件 §9.7）
-- ----------------------------------------------------------------------------
create table public.body_part (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  color       text        not null check (color ~ '^#[0-9A-Fa-f]{6}$'),  -- HEX
  sort_order  integer     not null default 0,
  is_archived boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- トレーニング方法: 自重 / マシン / フリーウェイト 等（編集可・任意付与）
-- ----------------------------------------------------------------------------
create table public.training_method (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  sort_order  integer     not null default 0,
  is_archived boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 種目マスタ: 部位は NOT NULL（色ドットの前提・§9.8）、方法は任意
-- ----------------------------------------------------------------------------
create table public.exercise (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users (id) on delete cascade,
  name               text        not null,
  body_part_id       uuid        not null references public.body_part (id),
  training_method_id uuid            null references public.training_method (id),
  sort_order         integer     not null default 0,
  is_archived        boolean     not null default false,
  created_at         timestamptz not null default now()
);
-- 同名種目はユーザー内で「警告のみで許容」＝一意制約は課さない（要件 §9.8）。

-- ----------------------------------------------------------------------------
-- ワークアウト: 1ユーザー × 1日 で1件。date は JST暦日として扱う（§9.6）
-- ----------------------------------------------------------------------------
create table public.workout (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  date       date        not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ----------------------------------------------------------------------------
-- その日やった種目エントリ: メモを持つ。同日同種目は1エントリ（§10）
-- ----------------------------------------------------------------------------
create table public.workout_exercise (
  id          uuid        primary key default gen_random_uuid(),
  workout_id  uuid        not null references public.workout (id) on delete cascade,
  exercise_id uuid        not null references public.exercise (id),
  sort_order  integer     not null default 0,
  memo        text            null,
  created_at  timestamptz not null default now(),
  unique (workout_id, exercise_id)
);

-- ----------------------------------------------------------------------------
-- セット: 重量×回数＋インターバル。set_no は1から歯抜けなし（§9.5）
-- バリデーション（要件 §9.1）を CHECK で表現:
--   weight  : 0..999, 0.25刻み（自重種目は 0kg 可）
--   reps    : 1..99 の整数
--   interval: 任意（NULL=未記録）, 0以上の整数
-- ----------------------------------------------------------------------------
create table public.workout_set (
  id                  uuid         primary key default gen_random_uuid(),
  workout_exercise_id uuid         not null references public.workout_exercise (id) on delete cascade,
  set_no              smallint     not null check (set_no >= 1),
  weight              numeric(5,2) not null check (weight >= 0 and weight <= 999
                                                   and (weight * 4) = floor(weight * 4)),
  reps                smallint     not null check (reps between 1 and 99),
  interval_sec        integer          null check (interval_sec is null or interval_sec >= 0),
  created_at          timestamptz  not null default now(),
  unique (workout_exercise_id, set_no)
);

-- ----------------------------------------------------------------------------
-- インデックス（要件 §7注 / design.md リスク: FK・date・exercise_id に付与）
-- 集計（部位別ボリューム・種目別推移）と所有者フィルタ（RLS）を支える。
-- ※ UNIQUE 制約により (user_id,date) / (workout_id,exercise_id) /
--    (workout_exercise_id,set_no) には既に索引が張られるため重複定義しない。
-- ----------------------------------------------------------------------------
create index idx_body_part_user        on public.body_part (user_id);
create index idx_training_method_user  on public.training_method (user_id);
create index idx_exercise_user_bodypart on public.exercise (user_id, body_part_id);
create index idx_workout_user_date      on public.workout (user_id, date);
create index idx_workout_exercise_wo    on public.workout_exercise (workout_id);
create index idx_workout_exercise_ex    on public.workout_exercise (exercise_id);
create index idx_workout_set_we         on public.workout_set (workout_exercise_id);

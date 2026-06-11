-- ============================================================================
-- サプリ摂取記録（💊）。種目→ワークアウトと同じ「マスタ＋記録」パターンを踏襲。
-- ・マスタ2種: supplement（サプリ名）/ supplement_timing（朝・筋トレ後 等）。論理削除。
-- ・記録は workout のような日次ヘッダを持たず、フラット1テーブル supplement_intake。
--   サプリには place のような日次メタが無く、ヘッダは (user_id,date) だけの冗長になるため。
--   単純 INSERT/DELETE で完結し、整合RPCは不要（CLAUDE.md「整合の要る操作だけRPC」）。
-- ・新テーブルは RLS 必須（CLAUDE.md）。3つともトップレベル様式（user_id = auth.uid()）。
-- ※ 既存マイグレーションは編集せず新規追加（ops.md §3.5）。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) テーブル
-- ----------------------------------------------------------------------------
-- マスタ: サプリ名（body_part/training_method 様式・論理削除）
create table public.supplement (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  sort_order  integer     not null default 0,
  is_archived boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- マスタ: 摂取タイミング（朝/筋トレ後/就寝前 等。ユーザー編集可）
create table public.supplement_timing (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  sort_order  integer     not null default 0,
  is_archived boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- 記録: フラット（1摂取 = 1行）。same サプリ × 別タイミングを許す（UNIQUE 制約なし）。
-- timing は任意（null = 指定なし）。quantity は粒/回の整数。
create table public.supplement_intake (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users (id) on delete cascade,
  date          date        not null,
  supplement_id uuid        not null references public.supplement (id),
  timing_id     uuid            null references public.supplement_timing (id),
  quantity      integer     not null default 1 check (quantity > 0),
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now()
);

create index idx_supplement_user         on public.supplement (user_id);
create index idx_supplement_timing_user  on public.supplement_timing (user_id);
create index idx_supplement_intake_user_date on public.supplement_intake (user_id, date);

-- ----------------------------------------------------------------------------
-- 2) RLS（3テーブルとも トップレベル様式: user_id = auth.uid()）
--    supplement_id / timing_id の所有者一致はアプリ層で担保（他人IDは select 不能）。
-- ----------------------------------------------------------------------------
alter table public.supplement         enable row level security;
alter table public.supplement_timing  enable row level security;
alter table public.supplement_intake  enable row level security;

-- supplement
create policy supplement_select on public.supplement
  for select using (user_id = auth.uid());
create policy supplement_insert on public.supplement
  for insert with check (user_id = auth.uid());
create policy supplement_update on public.supplement
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy supplement_delete on public.supplement
  for delete using (user_id = auth.uid());

-- supplement_timing
create policy supplement_timing_select on public.supplement_timing
  for select using (user_id = auth.uid());
create policy supplement_timing_insert on public.supplement_timing
  for insert with check (user_id = auth.uid());
create policy supplement_timing_update on public.supplement_timing
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy supplement_timing_delete on public.supplement_timing
  for delete using (user_id = auth.uid());

-- supplement_intake
create policy supplement_intake_select on public.supplement_intake
  for select using (user_id = auth.uid());
create policy supplement_intake_insert on public.supplement_intake
  for insert with check (user_id = auth.uid());
create policy supplement_intake_update on public.supplement_intake
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy supplement_intake_delete on public.supplement_intake
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS カバレッジ表（rls.sql の様式）
--   table              | SELECT | INSERT | UPDATE | DELETE | 所有者判定
--   -------------------+--------+--------+--------+--------+--------------------
--   supplement         |   ○    |   ○    |   ○    |   ○    | user_id = auth.uid()
--   supplement_timing  |   ○    |   ○    |   ○    |   ○    | user_id = auth.uid()
--   supplement_intake  |   ○    |   ○    |   ○    |   ○    | user_id = auth.uid()
-- ----------------------------------------------------------------------------

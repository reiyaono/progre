-- ============================================================================
-- ワークアウトに「場所」を追加（正規化: place マスタ＋workout_place 中間表）。
-- 1ワークアウト=1場所(1:1) は workout_place.workout_id PRIMARY KEY で担保。
-- 将来「月別の場所別集計」等に備える。新テーブルは RLS 必須（CLAUDE.md）。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- テーブル
-- ----------------------------------------------------------------------------
create table public.place (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  is_archived boolean     not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, name)  -- 同名の場所は1つ（候補の重複防止・再利用）
);
create index idx_place_user on public.place (user_id);

create table public.workout_place (
  workout_id uuid        primary key references public.workout(id) on delete cascade, -- 1:1
  place_id   uuid        not null    references public.place(id)    on delete cascade,
  created_at timestamptz not null default now()
);
create index idx_workout_place_place on public.workout_place (place_id);

-- ----------------------------------------------------------------------------
-- RLS（rls.sql の様式踏襲）
-- ----------------------------------------------------------------------------
alter table public.place         enable row level security;
alter table public.workout_place enable row level security;

-- place（トップレベル: user_id=auth.uid()）
create policy place_select on public.place
  for select using (user_id = auth.uid());
create policy place_insert on public.place
  for insert with check (user_id = auth.uid());
create policy place_update on public.place
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy place_delete on public.place
  for delete using (user_id = auth.uid());

-- workout_place（子: 親 workout 経由で所有者を辿る）
create policy workout_place_select on public.workout_place
  for select using (exists (
    select 1 from public.workout w
    where w.id = workout_place.workout_id and w.user_id = auth.uid()
  ));
create policy workout_place_insert on public.workout_place
  for insert with check (exists (
    select 1 from public.workout w
    where w.id = workout_place.workout_id and w.user_id = auth.uid()
  ));
create policy workout_place_update on public.workout_place
  for update using (exists (
    select 1 from public.workout w
    where w.id = workout_place.workout_id and w.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.workout w
    where w.id = workout_place.workout_id and w.user_id = auth.uid()
  ));
create policy workout_place_delete on public.workout_place
  for delete using (exists (
    select 1 from public.workout w
    where w.id = workout_place.workout_id and w.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- 頻出候補ビュー（place × 使用回数。未使用は cnt=0）
-- ----------------------------------------------------------------------------
create or replace view public.v_place_frequency
with (security_invoker = true) as
select
  p.user_id,
  p.id   as place_id,
  p.name as place_name,
  count(wp.workout_id) as cnt
from public.place p
left join public.workout_place wp on wp.place_id = p.id
where p.is_archived = false
group by p.user_id, p.id, p.name;

-- ----------------------------------------------------------------------------
-- 場所設定 RPC: workout・place を get-or-create し 1:1 リンクを upsert。
--   空文字 → リンク解除（場所クリア）。SECURITY INVOKER＋RLS。
-- ----------------------------------------------------------------------------
create or replace function public.fn_set_workout_place(p_date date, p_place text)
returns void
language plpgsql
as $$
declare
  v_uid  uuid := auth.uid();
  v_w    uuid;
  v_pid  uuid;
  v_name text := nullif(btrim(p_place), '');
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- get-or-create workout（1ユーザー×1日）
  select id into v_w from public.workout where user_id = v_uid and date = p_date;
  if v_w is null then
    insert into public.workout(user_id, date) values (v_uid, p_date) returning id into v_w;
  end if;

  -- 空入力なら場所リンクを解除して終了
  if v_name is null then
    delete from public.workout_place where workout_id = v_w;
    return;
  end if;

  -- get-or-create place（同名は再利用）
  select id into v_pid from public.place where user_id = v_uid and name = v_name;
  if v_pid is null then
    insert into public.place(user_id, name) values (v_uid, v_name) returning id into v_pid;
  end if;

  -- 1:1 リンク upsert
  insert into public.workout_place(workout_id, place_id)
  values (v_w, v_pid)
  on conflict (workout_id) do update set place_id = excluded.place_id;
end;
$$;

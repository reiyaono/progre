-- ============================================================================
-- M4 記録フローの整合用 RPC。
-- すべて plpgsql の既定 = SECURITY INVOKER のため、呼び出しユーザーの RLS が効く
-- （api.md §2／ops.md）。クライアント(SDK) から rpc() で安全に呼べる。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 種目エントリ追加: (user,date) の workout を get-or-create し、末尾に種目を追加。
-- 同日同種目は1エントリ（§10・UNIQUE(workout_id,exercise_id)）→ 既存なら冪等に返す。
-- ----------------------------------------------------------------------------
create or replace function public.fn_add_exercise_entry(p_date date, p_exercise uuid)
returns public.workout_exercise
language plpgsql
as $$
declare
  v_uid     uuid := auth.uid();
  v_workout uuid;
  v_next    integer;
  v_row     public.workout_exercise;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- get-or-create workout（1ユーザー×1日）
  select id into v_workout
  from public.workout
  where user_id = v_uid and date = p_date;

  if v_workout is null then
    insert into public.workout(user_id, date) values (v_uid, p_date)
    returning id into v_workout;
  end if;

  -- 既存エントリがあれば冪等に返す
  select * into v_row
  from public.workout_exercise
  where workout_id = v_workout and exercise_id = p_exercise;
  if found then
    return v_row;
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_next
  from public.workout_exercise where workout_id = v_workout;

  insert into public.workout_exercise(workout_id, exercise_id, sort_order)
  values (v_workout, p_exercise, v_next)
  returning * into v_row;

  return v_row;
end;
$$;

-- ----------------------------------------------------------------------------
-- 種目エントリ削除: 子セットは FK cascade。親 workout が空になれば自動削除（§7）。
-- ----------------------------------------------------------------------------
create or replace function public.fn_delete_exercise_entry(p_we uuid)
returns void
language plpgsql
as $$
declare
  v_workout   uuid;
  v_remaining integer;
begin
  select workout_id into v_workout
  from public.workout_exercise where id = p_we;
  if v_workout is null then
    return; -- 不在 or RLS不可視
  end if;

  delete from public.workout_exercise where id = p_we;

  select count(*) into v_remaining
  from public.workout_exercise where workout_id = v_workout;

  if v_remaining = 0 then
    delete from public.workout where id = v_workout;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- セット追加: 末尾の set_no（max+1）で挿入。値の妥当性は workout_set の CHECK が最終防衛。
-- ----------------------------------------------------------------------------
create or replace function public.fn_add_set(
  p_we uuid, p_weight numeric, p_reps smallint, p_interval integer
)
returns public.workout_set
language plpgsql
as $$
declare
  v_next smallint;
  v_row  public.workout_set;
begin
  select coalesce(max(set_no), 0) + 1 into v_next
  from public.workout_set where workout_exercise_id = p_we;

  insert into public.workout_set(workout_exercise_id, set_no, weight, reps, interval_sec)
  values (p_we, v_next, p_weight, p_reps, p_interval)
  returning * into v_row;

  return v_row;
end;
$$;

-- ----------------------------------------------------------------------------
-- セット削除＋1..n 再採番（歯抜けなし・§9.5）。
-- UNIQUE(workout_exercise_id,set_no) の一時衝突を避けるため、一旦 +1000 退避してから振り直す。
-- ----------------------------------------------------------------------------
create or replace function public.fn_delete_set(p_set uuid)
returns void
language plpgsql
as $$
declare
  v_we uuid;
begin
  select workout_exercise_id into v_we
  from public.workout_set where id = p_set;
  if v_we is null then
    return; -- 不在 or RLS不可視
  end if;

  delete from public.workout_set where id = p_set;

  -- 退避（既存値と新値の範囲を分離して UNIQUE 衝突を回避）
  update public.workout_set
  set set_no = set_no + 1000
  where workout_exercise_id = v_we;

  -- set_no 昇順で 1..n に振り直し
  update public.workout_set ws
  set set_no = sub.rn
  from (
    select id, row_number() over (order by set_no) as rn
    from public.workout_set
    where workout_exercise_id = v_we
  ) sub
  where ws.id = sub.id;
end;
$$;

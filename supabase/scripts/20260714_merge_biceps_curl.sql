-- One-off production data correction for user de0af00d-496f-4cfc-87e2-900a4a24fd71.
-- Merge "バイセップカール" into "バイセップスカール" and archive the source master.
begin;

do $merge$
declare
  v_user_id          uuid := 'de0af00d-496f-4cfc-87e2-900a4a24fd71';
  v_source_id        uuid := '62995289-bbee-4197-8fdb-5da9ec757beb';
  v_target_id        uuid := '550a45fc-87fb-479e-a029-ab55fa976661';
  v_source_name      text;
  v_target_name      text;
  v_source_archived  boolean;
  v_source_refs      integer;
  v_target_refs      integer;
  v_overlap_count    integer;
  v_updated_count    integer;
begin
  select name, is_archived
    into strict v_source_name, v_source_archived
    from public.exercise
   where id = v_source_id and user_id = v_user_id
   for update;

  select name
    into strict v_target_name
    from public.exercise
   where id = v_target_id and user_id = v_user_id
   for update;

  if v_source_name <> 'バイセップカール'
     or v_target_name <> 'バイセップスカール'
     or v_source_archived then
    raise exception 'exercise precondition failed: source=%, target=%, archived=%',
      v_source_name, v_target_name, v_source_archived;
  end if;

  select count(*) into v_source_refs
    from public.workout_exercise
   where exercise_id = v_source_id;

  select count(*) into v_target_refs
    from public.workout_exercise
   where exercise_id = v_target_id;

  if v_source_refs <> 10 or v_target_refs <> 12 then
    raise exception 'reference count changed: source=%, target=%', v_source_refs, v_target_refs;
  end if;

  select count(*) into v_overlap_count
    from public.workout_exercise source_we
    join public.workout_exercise target_we
      on target_we.workout_id = source_we.workout_id
     and target_we.exercise_id = v_target_id
   where source_we.exercise_id = v_source_id;

  if v_overlap_count <> 0 then
    raise exception 'merge would violate unique(workout_id, exercise_id): % overlaps', v_overlap_count;
  end if;

  update public.workout_exercise
     set exercise_id = v_target_id
   where exercise_id = v_source_id;
  get diagnostics v_updated_count = row_count;

  if v_updated_count <> v_source_refs then
    raise exception 'updated % references; expected %', v_updated_count, v_source_refs;
  end if;

  update public.exercise
     set is_archived = true
   where id = v_source_id and user_id = v_user_id;

  if exists (select 1 from public.workout_exercise where exercise_id = v_source_id)
     or (select count(*) from public.workout_exercise where exercise_id = v_target_id) <> 22
     or not (select is_archived from public.exercise where id = v_source_id) then
    raise exception 'postcondition failed';
  end if;
end
$merge$;

commit;

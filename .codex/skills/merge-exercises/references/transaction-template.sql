-- Replace every {{...}} placeholder with values confirmed immediately before execution.
begin;

do $merge$
declare
  v_user_id       uuid := '{{USER_ID}}';
  v_source_id     uuid := '{{SOURCE_EXERCISE_ID}}';
  v_target_id     uuid := '{{TARGET_EXERCISE_ID}}';
  v_source_refs   integer;
  v_target_refs   integer;
  v_overlap_count integer;
  v_updated_count integer;
begin
  perform 1 from public.exercise
   where id = v_source_id and user_id = v_user_id
     and name = '{{SOURCE_NAME}}' and not is_archived
   for update;
  if not found then raise exception 'source precondition failed'; end if;

  perform 1 from public.exercise
   where id = v_target_id and user_id = v_user_id
     and name = '{{TARGET_NAME}}' and not is_archived
   for update;
  if not found then raise exception 'target precondition failed'; end if;

  select count(*) into v_source_refs from public.workout_exercise where exercise_id = v_source_id;
  select count(*) into v_target_refs from public.workout_exercise where exercise_id = v_target_id;
  if v_source_refs <> {{EXPECTED_SOURCE_REFS}} or v_target_refs <> {{EXPECTED_TARGET_REFS}} then
    raise exception 'reference count changed: source=%, target=%', v_source_refs, v_target_refs;
  end if;

  select count(*) into v_overlap_count
    from public.workout_exercise s
    join public.workout_exercise t on t.workout_id = s.workout_id and t.exercise_id = v_target_id
   where s.exercise_id = v_source_id;
  if v_overlap_count <> 0 then
    raise exception 'overlapping workouts require an explicit conflict-resolution plan: %', v_overlap_count;
  end if;

  update public.workout_exercise set exercise_id = v_target_id where exercise_id = v_source_id;
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> v_source_refs then raise exception 'updated count mismatch'; end if;

  update public.exercise set is_archived = true where id = v_source_id and user_id = v_user_id;

  if exists (select 1 from public.workout_exercise where exercise_id = v_source_id)
     or (select count(*) from public.workout_exercise where exercise_id = v_target_id)
        <> v_source_refs + v_target_refs then
    raise exception 'postcondition failed';
  end if;
end
$merge$;

commit;

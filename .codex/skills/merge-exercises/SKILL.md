---
name: merge-exercises
description: Safely merge duplicate exercise masters in the ovld_cp Supabase database. Use when a user wants to consolidate two exercise names while preserving workout entries, sets, memos, and aggregate history, including production data corrections.
---

# Merge Exercises

Merge one source exercise into one target exercise without losing workout history. Keep the target master and archive the source master.

## Workflow

1. Read `AGENTS.md` and the current schema/migrations before acting.
2. Identify the user, source exercise, and target exercise by both name and UUID. Confirm both belong to the same user.
3. Read both masters and all referencing `workout_exercise` rows. Compare body part, training method, archive state, reference counts, memos, and workout dates.
4. Detect workouts containing both exercises. Never update through a `(workout_id, exercise_id)` collision.
   - If there are no overlaps, repoint source entries directly.
   - If overlaps exist, stop and design an explicit per-workout merge for memo, sort order, and `workout_set`. Renumber `set_no` without transient unique conflicts. Ask for agreement when conflict-resolution semantics are not already specified.
5. Generate a single transaction using `references/transaction-template.sql` as the safety baseline. Pin UUIDs and expected counts observed immediately before execution. Lock both exercise rows and abort on any mismatch.
6. Execute through the authorized Supabase production surface only after the user approves the plan. Do not expose keys, passwords, tokens, or connection strings.
7. Re-query the production database and verify:
   - the source has zero `workout_exercise` references;
   - the target has the expected combined reference count;
   - the source has `is_archived = true`;
   - sets and workout entries were not lost.
8. Save one-off SQL under `supabase/scripts/`, not migrations. A user-specific data correction must not replay in every environment.

## Project Rules

- Treat `exercise` as a logical-delete master: archive the source; do not physically delete it.
- Preserve `workout_exercise.id`, so its memo and child `workout_set` rows remain attached.
- Scope every assertion to the intended user and exact UUIDs.
- Use a transaction and fail closed. Do not weaken preconditions merely to make execution succeed.
- Do not commit or push unless the user explicitly requests it.

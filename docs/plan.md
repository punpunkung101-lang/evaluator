# Phase 0: Implementation plan

## Scope and current state

The requested work is the evaluation-form replacement described by the supplied `AGENTS.md` and `AGENT_PROMPTS.md`. The repository is currently on branch `change-question`; it is not `main` or `master`, so this phase keeps that branch. The working tree already contains a user-provided modification to root `AGENTS.md`; preserve it and exclude it from the Phase 0 commit.

At Phase 0 inspection, neither source document was in the repository and the brief was not in the supplied archives. For Phase 1, both files were located in Downloads and copied into `docs/`; question content below is derived from those files.

## Proposed data model for later phases

- `forms` identify a system and `assessment_type`; `form_versions` hold immutable published versions and status/timestamps. An evaluation stores the selected `form_version_id` so reports can interpret historic answers.
- Questions have a stable ID, optional system association, assessment type, step/section/order, Thai and optional English text, `answer_type`, JSON options, required/scored flags, `indicator_group` (`core` or `specific`), `visible_when`, role visibility, `allow_na`, `allow_other`, `max_select`, and active status.
- Shared Core questions are defined once with no system association. Specific questions point to one system. Satisfaction Core S1–S4 are likewise defined once; each of the 21 systems gets its own specific satisfaction question.
- Option sets are database rows with keys and JSON options; dependent option sets reference a parent question and value, so the cascading demographic dropdown flow can be edited in Admin.
- Evaluation answers are rows keyed to evaluation and question/version, storing a typed JSON value (scalar, array, or structured value as appropriate) plus a snapshot of question text/type. Keep `users.role` as account authorization; respondent role is a separate answer.
- Store conditional visibility and contradiction rules as JSON data. Validate them in shared frontend logic and again in the API.

## Work map by phase

| Phase | Main areas |
|---|---|
| 0: preparation | `docs/plan.md`, `docs/decisions.md`; baseline and drift inspection only |
| 1: question bank | `docs/project_brief_evaluation_platform.md`, `docs/system_specific_questions.md`, `database/question-bank.json`, `database/build/validate-question-bank.cjs` and tests |
| 2: database/mock | `database/schema.sql`, seed/build scripts, `database/evaluator.db`, mock generators/export, `database/README.md`, database tests |
| 3: scoring/API | `frontend/assets/js/admin/effectiveness-scoring.js` and tests, shared conditional engine and tests, `backend/src/main.cpp` |
| 4: user form | `frontend/user/effectiveness/`, `frontend/user/satisfaction/`, shared user question renderer and workflow modules under `frontend/assets/js/` |
| 5: Admin/results | `frontend/admin/manage/assessment-management.html`, its JS, dashboard/results pages and shared Admin modules |
| 6: integration | regenerate the full question→seed→DB→mock→snapshot chain, update docs, run all checks and commit |

Likely legacy areas to replace after their callers are checked: `assessment_questions`, `evaluations.before_answers/after_answers`, `satisfactions`, `assessment_answers`, `quantitative_records`, migration-specific question handling, mock SQL/snapshot, and old question form logic in `backend/src/main.cpp`; frontend `core/systems-data.js`, `core/demo-mode.js`, `core/api.js`, `user/effectiveness-examples.js`, `user/evaluation-locale.js`, `user/quantitative*.js`, `admin/effectiveness-scoring.js`, and assessment management. Do not remove shared login, navigation, theme, or unrelated pages.

## Phase 0 baseline

- Branch: `change-question` (already active).
- `node --test "frontend/assets/js/**/*.test.cjs"`: 117 tests, 115 passed, 2 failed. The authorization test expects a literal `/auth/me` route condition that does not match the current backend source; the dedupe test expects an `if(!deduped)` pattern absent from the migration implementation. Both are source-shape assertions, not runtime test failures.
- `node --test "tests/**/*.test.cjs"`: 9 passed, 0 failed.
- Current database integrity check is `ok`; foreign-key check is empty. `auth_sessions` contains 2 rows at inspection time (not the 5 stated as an expected prior observation). Do not clear sessions in Phase 0 because this phase must not modify DB data.

## Database drift observed

- `assessment_questions.system_id` is nullable in the DB but `NOT NULL` in `schema.sql`.
- DB `assessment_questions` has no `UNIQUE(system_id, assessment_type, sort_order)` constraint that appears in `schema.sql`.
- DB `users.id`, `username`, and `display_name` omit the length/digit constraints in `schema.sql`; DB `users.role` omits the role `CHECK` constraint.
- `evaluations.user_role` does have the expected `student/teacher/staff` check; do not alter `users.role` for respondent roles.
- DB has two migration records (`assessment_questions_csv_v1`, `assessment_questions_dedupe_v2`) and stale/legacy columns/tables: before/after answer arrays, the satisfaction table, and quantitative records.
- At inspection: `systems` 21; `assessment_questions` 571; `evaluations` 279; `satisfactions` 279; `assessment_answers` 6,675; `quantitative_records` 285; `users` 41; `auth_sessions` 2. The DB has integrity `ok` and no foreign-key violations.

## API and current question fields

- `GET /questions` selects only `id`, `assessment_type`, `sort_order`, `text`, `text_en`, and `active`; it does not expose the richer answer/visibility metadata.
- `POST /questions/replace` deletes/reinserts per-system questions and hard-codes `answer_type='likert5'`.
- `POST /evaluations` writes before/after arrays, averages, satisfaction arrays, and answer snapshots. It is not a general typed-answer/versioned submission contract.
- `POST /quantitative` stores a JSON record in `quantitative_records`; `GET /quantitative` reads those rows.
- The current user evaluation page uses `quantitative.js` and `quantitative-data.js` with before/after workflow fields. Admin assessment management uses question text, type/scale, order, and active state from its catalog; its HTML exposes only the old Likert scale choice. The shared API comments also document numeric satisfaction and before/after arrays.

## Phase 0 boundaries

This phase changes documentation only. No schema, database, backend, frontend, generated data, or test files are changed here. Commit only the Phase 0 documentation plus the provided system-specific question source. Keep the dirty root `AGENTS.md` out of the commit.

## Phase 1 result

The brief and the updated system-specific source were copied into `docs/`. `database/question-bank.json` now contains 189 questions across the four steps, with 58 shared Core entries and 131 Specific entries, plus editable option sets for respondent roles/profile fields and SYS018 work categories, paths, and statuses. A validator and colocated tests verify IDs, answer types, options, question/system references, role lists, visibility dependencies, cycles, satisfaction coverage, and required system coverage.

## Phase 2 result

The versioned schema and deterministic build scripts now create 42 published forms/versions, 189 question definitions, 1,349 form-question links, 315 mock accounts, 630 typed mock submissions, and 18,759 typed answers. The database rebuild reports `integrity_check=ok`, no foreign-key violations, and no sessions. Backend schema bootstrap was updated and compiled; the `/health` smoke check returned `{"status":"ok"}`. Frontend/demo snapshot regeneration remains deferred to the later integration phase.

# Database setup and mock baseline

`database/evaluator.db` is the committed SQLite baseline. It contains the shared account/system catalog, 42 published forms (effectiveness and satisfaction for each system), the question bank, and synthetic submissions for local development. Mock rows are marked by `evaluations.is_mock = 1` and `mock-*` / `mock_*` IDs. They are not operational data and must not be reported as actual faculty results.

## Pull and start

After `git pull`, use the committed `database/evaluator.db` directly. It has 21 systems, 189 question definitions (1,349 published form links including shared Core questions), 42 published form versions, 315 mock accounts, 630 mock submissions (15 respondents per system for each assessment type), and the default Admin-adjustable improvement criteria. The baseline has no authentication sessions. Logging in adds a local session row; restore the tracked baseline before committing or when you need to clear local sessions:

```powershell
git restore database/evaluator.db
```

The initial administrator account remains `Admin` with ID `00000000`. Account roles remain `student`, `teacher`, `staff`, and `admin`; the respondent's system-specific role is stored separately on each evaluation.

The shared user form now reads the published version and dependent option sets from the API. It posts typed answers with `formVersionId`; the backend validates visibility, respondent role, required answers, answer types, allowed choices, and mutually exclusive options before saving. The satisfaction form uses S1–S4 plus the selected system's specific item.

## Source files

The reproducible build chain is:

```text
docs/project_brief_evaluation_platform.md
docs/system_specific_questions.md
        ↓ maintain the structured source
database/question-bank.json
        ↓ node database/build/generate-questions-seed.cjs
database/questions_seed.sql
        ↓ node database/build/build-db.cjs
database/evaluator.db
```

The deterministic mock SQL is generated separately from the same question bank:

```powershell
node database/mock/generate-mock-data.cjs
```

## Rebuild or reset the full baseline

Run these commands from the repository root with Node.js 24 or later (the build uses the built-in `node:sqlite` module):

```powershell
node database/build/validate-question-bank.cjs
node database/build/generate-questions-seed.cjs
node database/mock/generate-mock-data.cjs
node database/build/build-db.cjs
node database/mock/export-mock-snapshot.cjs
```

The build always creates a clean database from `schema.sql`, `seed.sql`, `questions_seed.sql`, and `mock/mock-data.sql`. It replaces `database/evaluator.db`, so stop the backend first. It then checks SQLite integrity, foreign keys, the empty-session requirement, and expected row counts.

To remove only mock data from a local database while retaining real submissions and accounts, stop the backend and run:

```powershell
sqlite3 database/evaluator.db < database/mock/reset-mock-data.sql
```

To restore all systems, forms, questions, and mock submissions to the committed baseline, run `git restore database/evaluator.db` or rebuild using the commands above.

## Data model

- `users` and `auth_sessions` hold the shared identity and login state. `users.role` is the account permission role; it is not the evaluation respondent role.
- `systems` stores the 21 system records and whether each has tracking workflow.
- `assessment_forms` and `form_versions` define a versioned form per system and `assessment_type`.
- `assessment_questions` stores each Core question once (`system_id IS NULL`) and each Specific question against its system. Answer type, options, role visibility, conditional visibility, scoring flags, and N/A/Other metadata are stored as data.
- `option_sets` holds editable and dependent choice lists.
- `form_version_questions` maps shared Core and system-specific questions into each published form version.
- `evaluations` stores one submission per system and assessment type, including the form version and respondent role. `evaluation_answers` stores typed JSON answers plus question/type snapshots and an optional rating score.

There is no separate satisfaction or quantitative legacy table in the new schema. Satisfaction uses `assessment_type = 'satisfaction'` and has S1–S4 plus one system-specific question for every system. No operational statistics are fabricated or stored.

## Expected baseline checks

```powershell
node database/build/build-db.cjs
node --test "tests/**/*.test.cjs"
```

The built database contains 316 users (Admin plus 315 mock accounts), 21 systems, 42 forms and versions, 189 question definitions, 1,349 form-question links, 630 submissions, and 18,759 typed answers. It also has one `improvement_scoring` setting row. `auth_sessions` is empty in the committed baseline. There are no `-journal`, `-wal`, or `-shm` files to commit. The exported Demo snapshot contains the same mock evaluations and system-specific published question payloads as the backend API.

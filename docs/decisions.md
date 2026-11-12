# Decisions

## Phase 0

- Keep the existing `change-question` branch because it is already a task branch and the instructions only require creating/switching away from `main` or `master`.
- Preserve the pre-existing modified root `AGENTS.md`. It was supplied as the project's current instruction set, but it is outside the Phase 0 documentation commit.
- Use the existing 2 `assessment_type` values and retain the shared account role model. Store respondent role as a form answer, not in `users.role`.
- Model shared Core questions once and attach Specific questions to systems; keep a published form version on every submission and store typed answer values with a question snapshot.
- Do not clear current auth sessions or rebuild the DB during Phase 0. The actual DB has 2 sessions, and this phase prohibits data/code changes.
- The required project brief is not available in the repository or the supplied archives. Do not invent missing question text; block content authoring until that source is available.
- Baseline frontend results include two existing failures: an authorization route source-pattern assertion and a dedupe migration source-pattern assertion. Database/mock baseline passes.

# Decisions

## Phase 0

- Keep the existing `change-question` branch because it is already a task branch and the instructions only require creating/switching away from `main` or `master`.
- Preserve the pre-existing modified root `AGENTS.md`. It was supplied as the project's current instruction set, but it is outside the Phase 0 documentation commit.
- Use the existing 2 `assessment_type` values and retain the shared account role model. Store respondent role as a form answer, not in `users.role`.
- Model shared Core questions once and attach Specific questions to systems; keep a published form version on every submission and store typed answer values with a question snapshot.
- Do not clear current auth sessions or rebuild the DB during Phase 0. The actual DB has 2 sessions, and this phase prohibits data/code changes.
- The required project brief is not available in the repository or the supplied archives. Do not invent missing question text; block content authoring until that source is available.
- Baseline frontend results include two existing failures: an authorization route source-pattern assertion and a dedupe migration source-pattern assertion. Database/mock baseline passes.

## Phase 1

- Located `project_brief_evaluation_platform.md` and the updated `system_specific_questions.md` in Downloads and copied both source documents into `docs/` before creating the bank.
- Keep Core indicator questions and S1–S4 once as shared records; add one Specific satisfaction rating for each of the 21 systems. Use stable IDs derived from indicator codes or system IDs.
- Use Yes/No for role-specific prompts worded as “or not?” and assign each prompt to the role named in the source. SYS018 role questions and the seven maintenance-specific indicators are system-specific.
- The brief does not name department values or all profile-list choices. Seed editable, provisional Allied Health department choices and broad usage choices; dependent profile option sets are keyed by respondent role so Admin can refine them.
- Where a specific-system S question gives no choices (for example, frequency), use the shared frequency choices from the brief. Keep the question itself as supplied.
- Represent the SYS018 work categories, Path A/B/C, and eight work states as system-specific option sets. Tracking Core questions carry a `has_tracking` system visibility predicate.
- Resolve respondent-role options from the selected system, then resolve the dependent profile option sets through that role. Defaults are stored as editable data rather than UI logic.
- Treat the source documents as editable source text and `database/question-bank.json` as the structured bank used by later phases. The one-time draft converter used while composing the bank is not part of the committed implementation.

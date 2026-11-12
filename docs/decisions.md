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

## Phase 2

- Use SQLite `user_version = 2` for the new schema. Backend startup recreates the old evaluation schema when it does not match version 2, then loads the current schema and idempotent system/question/form seeds. This intentionally does not migrate old evaluation data, as authorized by the phase instructions.
- Keep each shared Core question as one row and map it into each relevant system form through `form_version_questions`. Publish a version 1 form for each system and each assessment type (42 forms total).
- Store one evaluation per `(system_id, assessment_type)` and typed answers as JSON values with rating-only numeric scores and an N/A flag. Keep account authorization in `users.role`; respondent role is a separate evaluation field and answer.
- Generate 15 mock respondents per system, paired across effectiveness and satisfaction. Use 4 low-score systems (SYS001–SYS004), 9 middle-score systems (SYS005–SYS013), and 8 higher-score systems (SYS014–SYS021), with deterministic spread and occasional N/A.
- Mock evaluator credentials are intentionally unusable. The fixed placeholder hash is deterministic and exists only to satisfy the account schema.
- Use Node 24's built-in `node:sqlite` for building and round-trip checks; this avoids adding a package dependency.
- Keep snapshot export for the later integration phase because Phase 2 explicitly does not modify frontend files. Its existing exporter/test uses the legacy schema and is deferred with the frontend snapshot regeneration work.

## Phase 3

- Use the brief's five interpretation bands: 4.51, 3.51, 2.51, and 1.51. Only scored `rating5` answers contribute; N/A is counted separately and excluded from averages.
- Default the improvement signal to a minimum n of 10, category/satisfaction concern below 2.61, and 30% low ratings for review or 50% for urgent review. Keep all thresholds in the scoring configuration so Admin can tune them later.
- Treat a low sample as “ข้อมูลไม่เพียงพอ” before interpreting other indicators. Otherwise combine low indicator categories, satisfaction, low ratings, frequent problems, and selected improvements; include reasons in every signal.
- Use one pure shared conditional engine in the core assets. Server validation implements the persisted `visible_when` and `answer_rules` contract in C++, and checks required fields, respondent roles, rating values, and choice options before saving.
- Version Admin question replacements by creating a new published form version and immutable question rows. This keeps already submitted answers tied to their original questions.
- Return no records for retired quantitative-system-stat endpoints and reject writes with HTTP 410; actual operational statistics are not in the evaluation submission schema and should not be presented as user survey answers.

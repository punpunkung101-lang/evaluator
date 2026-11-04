# Quantitative evaluation prototype

Run a static server from the repository root (for example VS Code Live Server), then open `frontend/Effectiveness_Of_It/main/index.html`. Use the same server origin for both survey modules so browser storage is shared.

The site uses localStorage only; the recently added C++/SQLite service has been removed. Open with Live Server on port 5500; no backend or token is needed. Configurations, drafts and records use it_quant_config_v1, it_quant_draft_v1 and it_quant_records_v1. Use fictional names only. Admin is a frontend simulation without server authorization. The quantitative dashboard includes a button to download browser evaluation records as JSON. Data from SQLite test files was exported to data-exports/sqlite-evaluations-2026-11-03.json, with each source clearly labeled as automated test data; this export is not loaded as real survey data.

## Try the complete flow

1. From the homepage developer Prototype tools, open the process/indicator editor. Select an IT system. Add before and after steps, descriptions, and required time fields. Reorder or disable steps. Save.
2. Add indicators with a name, unit, common measurement basis, and direction. Target mode means closeness to an exact target; overshooting can be worse. Disable irrelevant indicators and save. Preview the configuration.
3. Open the evaluation page, choose the same system, enter a fictional profile, and complete all five steps. No preloaded numerical sample is represented as faculty data. For a test, enter total time 240 before and 30 after: the change is -210 minutes, -87.5%, and improvement.
4. Try missing fields, negative values, zero values, unknown and not applicable states. Return to prior steps. Save a draft and refresh to resume. The draft snapshots its configuration; changing systems starts with that system's latest configuration.
5. At review, cancel the confirmation dialog: no submitted record should exist. Confirm once, including repeated clicking: only one record should be saved. Storage failures must show an error.
6. Open the quantitative dashboard. Filter by system, category, and date; inspect record details and before/after mean bars. Averages group only identical system, configuration version, indicator, unit, basis, direction and target. They are not an overall effectiveness score. Existing catalog has no category taxonomy, so its category filter is a single 'all' group until category data is supplied.
7. Change steps and indicators after submission, save, and start a new evaluation. The old result must retain its original snapshot.
8. Follow the sidebar to the existing satisfaction profile, evaluation and questionnaire and back. Its questions and calculations remain unchanged. Check desktop, tablet and mobile, keyboard focus, confirmation dialog and navigation.

Automated checks: `node --test tests/quantitative.test.cjs`. Real browser layout and end-to-end interaction still require manual verification. The new quantitative UI is Thai; existing translation controls and questionnaires remain as before.

The dashboard shows prototype entries only, separate from satisfaction results. It does not average incompatible units or label resource reduction as effectiveness. No IT catalog management is duplicated: the existing satisfaction Admin manages that shared catalog. New numeric indicators and processes are configured per existing system ID.

# AGENTS.md — NUAHS IT Evaluation

> Single source of truth for AI coding agents. Replaces `Skill.md` and `infomation.md`.
> After this file is in place, delete those two files (grep for references first).

## 1. Role

You are a full-stack developer maintaining **NUAHS IT Evaluation**, a website for the Faculty of Allied Health Sciences, Naresuan University.

- Inspect the existing implementation before changing anything.
- Preserve working features. **Never rebuild from scratch** unless explicitly told to.
- Never assume a feature is missing (or present) until you have read the code.

## 2. Product Model

**One website. Two evaluation systems. One shared identity. One shared database.**

| Evaluation system | Purpose | `assessment_type` |
|---|---|---|
| Effectiveness of IT | Compare work processes/metrics before vs. after using an IT system | `effectiveness` |
| Satisfaction Survey | Measure users' satisfaction with an IT system | `satisfaction` |

The two systems are separated **by data and workflow, not by folder**:

- Separate questions, steps, submissions and results, always distinguishable by `assessment_type` + `system_id`.
- Shared pages, components, styles, auth, header, sidebar and theme. Never copy a component into a second place.

## 3. Target Frontend Structure

The frontend is organized **by role (user / admin) and shared assets**, not by evaluation system.

```text
evaluator/
├── AGENTS.md
├── frontend/
│   ├── user/
│   │   ├── index.html              # main portal (was Effectiveness_Of_It/main/index.html)
│   │   ├── satisfaction/           # satisfaction survey pages
│   │   └── effectiveness/          # effectiveness wizard (3 steps)
│   ├── admin/
│   │   ├── dashboard.html          # "ภาพรวมระบบ"
│   │   ├── results.html            # "ผลประเมินรายระบบ"
│   │   └── manage/                 # assessment / process management
│   └── assets/
│       ├── css/                    # tokens, base, components, pages
│       ├── js/
│       │   ├── core/               # api, auth, guards, theme, i18n
│       │   ├── layout/             # site-header, sidebar (ONE implementation)
│       │   ├── user/
│       │   ├── admin/
│       │   └── **/*.test.cjs       # tests live next to the code they test
│       └── img/                    # logos/images (replaces misspelled "Publice")
├── backend/src/                    # C++ REST API — do not modify unless told
├── database/                       # schema.sql, seed.sql, evaluator.db, migrations
└── tests/                          # backend/API/DB tests and fixtures only
```

Rules for the structure:

1. `frontend/Effectiveness_Of_It/` and `frontend/Satisfaction_Survey/` are **legacy**. Once migrated they must not be recreated.
2. No page may reference another page's private files. Shared code lives only in `frontend/assets/`.
3. Header and sidebar are rendered by **one** script from **one** NAV config. Never paste `<aside>` / `<header>` markup into individual HTML files.
4. Colors, spacing and typography come from `tokens.css`. No raw hex colors in page CSS.
5. Test files (`*.test.cjs`) must be excluded from deployment/serving.
6. Always verify the real tree before editing; this section describes the target, not necessarily the current state.

## 4. Navigation (must match Header)

Admin sidebar contains exactly two entries, and their labels, links and active state come from the same NAV config as the Header:

1. ภาพรวมระบบ
2. ผลประเมินรายระบบ

Management features (assessments, processes, metrics) live as tabs inside these two pages, not as extra sidebar items.

## 5. Effectiveness Wizard: 3 Steps

| # | Step | Content |
|---|---|---|
| 1 | เลือกระบบ | Choose the IT system (and evaluator info as today) |
| 2 | ตอบคำถาม | Before/after processes and metrics on one page, in clearly separated sections |
| 3 | ตรวจสอบและส่ง | Review, save draft, submit (unchanged behavior) |

Requirements:

- Total steps is derived from `steps.length`. **Never hardcode 5 (or 3).**
- Each question offers selectable examples; hovering an option shows a tooltip with the example. Must also work with keyboard focus and touch/tap, not hover only.
- Every question has "อื่น ๆ (ระบุเอง)" which reveals a required free-text field.
- Examples adapt to the selected system, using wording appropriate to that system (not "repair request" wording for every system). Examples are stored as data, not hardcoded in logic.
- Old drafts (steps 0–4) must still load. Map: 0→1, 1–3→2, 4→3. No data loss.
- Payload sent to the backend keeps its current shape.

## 6. Shared Authentication

- One user table, one login. A user accesses both systems with one account.
- Passwords are hashed, never stored in plaintext.
- Authorization (user vs. admin) is enforced in the **backend**, not only in JavaScript.
- Responses are linked to the authenticated user where applicable. Guest evaluation only if the existing implementation supports it.
- Never expose DB files, password hashes or credentials to the browser.

## 7. Shared Database

- Location: `database/evaluator.db`; schema: `database/schema.sql` (SQLite, matching the existing backend).
- Real data only. Never show mock data as real results; show a clear empty state when there are no submissions.
- Assessment topics, questions and workflow steps are stored in the database, and admins can add / edit / delete / reorder / enable / disable them.
- Store system code and display name in separate fields (`SYS001` + `รายชื่อบุคลากร`), never one combined string as an identifier.
- Use primary/foreign keys and indexes. **No cascading deletes** that destroy historical results. Prefer deactivating over deleting.
- Every answer is linked to the correct user, system, question and submission. Never mix answers across systems.

### Migration safety

1. Inspect the current schema and data first.
2. Back up `evaluator.db` before any destructive change.
3. Use migrations; never recreate the DB from `schema.sql` over existing data.
4. If a change could break existing data, explain the risk and propose a safe migration before acting.
5. Keep `database/README.md` in sync with the schema.

## 8. Backend

- **Do not modify `backend/` or `database/`** unless the task explicitly says so.
- Verify whether `backend/src/main.cpp` serves static files or hardcodes frontend paths (look for static mounts, file reads, redirects, `Effectiveness_Of_It`, `Satisfaction_Survey`, `Publice`, CORS/origin config).
  - If it does: report it first, then change **only that single path** to match the new structure.
  - If it does not: state that no change is needed and touch nothing.
- A successful frontend action is not "saved" until the backend confirms persistence.
- Backend uses parameterized SQL, transactions for related writes, and server-side validation.

## 9. Working Method

Work in **phases**. One phase per task. Never combine phases.

| Phase | Scope |
|---|---|
| 0 | Branch + baseline test run |
| 1 | Folder restructure only (no logic or UI changes) |
| 2 | Single shared Header/Sidebar |
| 3 | Effectiveness wizard 5 → 3 steps |
| 4 | Admin pages + theme |
| 5 | Remove unused files, final verification, docs |

For every task:

1. Inspect files, dependencies, database.
2. State the plan briefly (for deletions/moves, list them first).
3. Make the smallest suitable change.
4. Run tests; never claim a test passed unless it actually ran and passed.
5. **Commit once per phase** with a clear message.
6. Report: files changed, behavior changed, tests run + results, remaining issues.

Do not add dependencies, features or refactors outside the current phase.

## 10. Common Mistakes to Avoid

1. **Doing several phases in one task.** File moves and UI edits get mixed and cannot be undone cleanly.
2. **Fixing paths only in HTML.** Also check `url()` in CSS, `fetch`, `import`/`require`, `location.href`, redirects and `<script>`/`<link>` tags.
3. **Leaving old rules behind.** Do not follow the legacy rule "keep the two systems in separate folders"; this file overrides it.
4. **Hardcoding the step count** (e.g. "ขั้นที่ 2 จาก 5") or breaking old drafts.
5. **Hover-only interaction.** Tooltips must work on keyboard and touch.
6. **Duplicating header/sidebar markup** or CSS per page instead of using the shared implementation.
7. **Deleting files without proof.** Grep for references before every deletion and list them for approval.
8. **Touching backend/database without being asked**, or overwriting `evaluator.db`.
9. **Not committing between phases**, which removes the ability to roll back.
10. **Committing binaries**: `.exe`, `*.bak`, and `.db` files belong in `.gitignore`.

## 11. Testing

- JS tests: `node --test "frontend/assets/js/**/*.test.cjs"`; backend/API/DB tests: `tests/`.
- Use isolated test DBs/fixtures. Never delete real data to make a test pass.
- Before closing any phase, verify:
  1. Register/login works and one account reaches both systems.
  2. Each system loads its own correct questions.
  3. Submissions persist and stay distinguishable by system.
  4. Admin pages show real saved results (or a clear empty state).
  5. Adding/editing/disabling a question works and historical results remain.
  6. Non-admins are rejected by the backend on admin operations.
  7. No 404s or console errors on any page (check at 1280px and 390px).

## 12. Definition of Done (per phase)

- Scope limited to the phase.
- Tests pass (reported honestly), no broken links or 404s.
- No leftover references to removed paths (`grep` clean).
- Committed.
- Report delivered in the format from §9.

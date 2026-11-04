# Development Skill — NUAHS IT Evaluation

## 1. Role

You are a full-stack developer responsible for maintaining, improving, and testing the NUAHS IT Evaluation project.

Your responsibility is to understand the existing codebase, organize the project structure, maintain a shared database, and ensure that both evaluation systems work correctly.

**Do not rebuild the project from scratch.** Inspect the existing implementation before modifying any files. Preserve working features and make changes according to the requirements below.

## 2. Current Project Status

The project contains two separate evaluation systems:

### System A: Satisfaction Survey

Directory: `frontend/Satisfaction_Survey/`

- `user/`: User-facing pages for evaluating satisfaction.
- `admin/`: Admin dashboard for managing the system and viewing evaluation results.
- `assets/`: CSS, JavaScript, and shared resources belonging to this system.

### System B: Effectiveness of IT

Directory: `frontend/Effectiveness_Of_It/`

- `main/`: Main entry page and user-facing effectiveness evaluation pages.
- `admin/`: Admin pages for managing evaluations and viewing results, if not already present elsewhere in the existing structure.

Both systems must have their own User and Admin interfaces. Keep their user interfaces and evaluation workflows logically separated.

Before creating directories or files, inspect the repository and reuse existing implementations whenever appropriate.

## 3. Main Website Entry Point

The initial entry point is the `index` page in `frontend/Effectiveness_Of_It/main/`.

This page serves as the main portal connecting the two evaluation systems.

Users must be able to navigate to either:

1. Effectiveness of IT — ระบบประเมินประสิทธิผลของระบบ IT
2. Satisfaction Survey — ระบบประเมินความพึงพอใจ

Provide clear navigation between the two systems without mixing their assessment questions or results.

Authentication must be shared between the two systems.

## 4. Shared User Accounts and Authentication

Both systems must use the same user identity and account records.

Requirements:

- Users can register and log in through the shared authentication system.
- An existing user must be able to access both evaluation systems without creating another account.
- Store user accounts in the shared database.
- Associate evaluation responses with the correct user when the user is authenticated.
- Allow guest evaluation only if it is compatible with the existing requirements and implementation.
- Distinguish user and administrator permissions.
- Never store plaintext passwords. Use an appropriate password-hashing method.
- Validate authentication and authorization on the backend, not only in frontend JavaScript.

Do not create separate user tables or independent authentication systems for each evaluation project.

## 5. Shared SQL Database

The two systems must connect to one shared database.

The intended database location is:

`database/evaluator.db`

The database schema should be maintained in:

`database/schema.sql`

Use SQLite if it matches the existing backend architecture. If the repository already uses a different database engine, inspect the implementation and explain the migration implications before replacing it.

The database must store real data rather than relying on hardcoded frontend mock data.

### Required data categories

Organize the schema into appropriate related tables for:

- User accounts and roles.
- Evaluation systems and assessment categories.
- Assessment topics and questions.
- Evaluation sessions or submissions.
- User responses and answers.
- Evaluation progress and submission timestamps, where needed.

Use primary keys, foreign keys, suitable constraints, and indexes where appropriate.

Design relationships so that the same user can submit evaluations to either system, with every response linked to the correct user, system, question, and submission.

Keep the two systems distinguishable through a system identifier or equivalent relationship.

Do not duplicate account records or mix answers from different systems.

## 6. Dynamic Assessment Configuration

Assessment topics, questions, and workflow steps must be stored in the database rather than being permanently hardcoded into HTML or JavaScript.

The Admin Dashboard must provide appropriate functionality to:

- Add, edit, and delete assessment topics.
- Add, edit, and delete questions.
- Change question wording and display order.
- Enable or disable topics and questions when appropriate.
- Configure the evaluation steps and their displayed titles.
- View evaluation results and identify which system each result belongs to.

For example, a system option may be displayed as:

`SYS001 - รายชื่อบุคลากร`

Store the system code and its display name in structured database fields. Do not use the entire display string as an inflexible identifier.

Another example is the progress heading:

`ขั้นที่ 1 จาก 5 — ข้อมูลผู้ประเมิน`

The step title, order, and other appropriate configuration should be manageable without rewriting the entire evaluation page.

For the Satisfaction Survey, an example question is:

`สามารถดำเนินงานให้เสร็จได้อย่างรวดเร็ว`

Administrators should be able to add or remove questions of this type through the Admin interface.

Use a normalized schema where practical. Preserve existing assessment data when topics or questions are edited or deactivated. Avoid cascading deletes that unintentionally destroy historical evaluation results.

## 7. Admin Dashboard Requirements

Each system must provide an appropriate Admin interface.

Administrators should be able to manage the configuration relevant to their system and review its evaluation data.

Shared user accounts and database infrastructure may be common, but the interfaces should display the correct system-specific topics, questions, submissions, and statistics.

Do not display mock results as real evaluation results.

If no submissions exist, display a clear empty state.

Ensure that administrative actions are protected by backend authorization.

## 8. Backend and Data Flow

Inspect the existing backend before choosing how to implement database access.

Create or reuse a suitable API or service layer for:

- Registration and login.
- Retrieving active assessment topics and questions.
- Saving evaluation sessions and answers.
- Managing topics, questions, and workflow configuration.
- Retrieving results for the relevant Admin Dashboard.

Both frontend systems must use the same database connection strategy and shared user identity.

Validate incoming data on the backend. Use parameterized SQL queries and transactions when saving related records.

A successful frontend submission must not be treated as saved until the backend confirms that the data has been persisted.

Do not expose database files, password hashes, or privileged credentials to the browser.

## 9. Test Directory Organization

Inspect the existing `test/` directory and reorganize it into a clear, maintainable structure appropriate to the current technology stack.

A possible structure is:

```text
test/
├── unit/
│   ├── auth/
│   ├── database/
│   └── evaluation/
├── integration/
│   ├── shared-auth/
│   ├── effectiveness/
│   ├── satisfaction/
│   └── database/
├── e2e/
│   ├── user/
│   └── admin/
└── README.md
```

This is a suggested structure, not a requirement to create empty directories. Adapt it to the existing test framework and actual application architecture.

Organize tests around real functionality, remove duplication where appropriate, update test paths and configuration, and preserve useful existing tests.

## 10. Required Testing

After making changes, run the available tests and verify the following scenarios:

1. A user can register and log in.
2. The same account can access both evaluation systems.
3. Both systems retrieve the correct topics and questions.
4. An evaluation submission is persisted in the shared database.
5. Answers from each system remain distinguishable.
6. The Admin Dashboard displays actual saved results.
7. Adding, editing, disabling, or removing a question behaves correctly.
8. Historical evaluation results remain available after assessment configuration changes.
9. Unauthorized users cannot perform administrative operations.
10. Both systems remain functional after the database schema and test structure are updated.

Run the project's existing build, lint, and test commands when available.

Use a separate test database or isolated test fixtures where possible. Do not delete production or existing user data to make tests pass.

If any test fails, investigate and fix the underlying issue where feasible. Never claim that a test passed unless it was actually executed successfully.

## 11. Database Migration and Safety

Before changing `database/schema.sql` or the existing database:

- Inspect the current schema and data.
- Identify existing tables and relationships.
- Back up existing data before making destructive changes.
- Use migrations or a safe schema-upgrade process when necessary.
- Preserve compatible existing records.
- Update database documentation to match the implemented schema.

Do not overwrite `evaluator.db` simply to recreate tables from a new schema file.

If a proposed schema change could break existing data or application functionality, explain the risk and implement a safe migration.

## 12. Working Rules

Follow this order when working on a task:

1. Inspect the repository, existing files, dependencies, and database.
2. Identify the relevant system and shared components.
3. Explain the planned changes briefly.
4. Implement the smallest suitable set of changes.
5. Update the schema, migrations, and tests where necessary.
6. Run tests and inspect the results.
7. Report the files changed, features implemented, tests executed, and any remaining issues.

Avoid unnecessary dependencies, duplicated code, and unrelated changes.

Do not assume a feature is missing until you have inspected the existing implementation.

## 13. Final Project Principle

**One website project. Two evaluation systems. One shared user identity. One shared database. Separate assessment workflows and clearly distinguishable results.**

Both systems must remain maintainable, secure, and independently understandable while sharing the infrastructure necessary to support a unified user experience.

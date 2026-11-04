PRAGMA foreign_keys = ON;

-- One account and one SQLite file are shared by both evaluation services.
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'staff', 'admin')),
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_iterations INTEGER NOT NULL DEFAULT 120000,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS systems (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assessment_questions (
    id TEXT PRIMARY KEY,
    system_id TEXT REFERENCES systems(id) ON DELETE CASCADE,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('effectiveness', 'satisfaction')),
    section TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL,
    text_en TEXT NOT NULL DEFAULT '',
    answer_type TEXT NOT NULL DEFAULT 'likert5',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL REFERENCES systems(id),
    system_name TEXT NOT NULL DEFAULT '',
    evaluator_id TEXT NOT NULL,
    evaluator_name TEXT NOT NULL DEFAULT '',
    user_role TEXT NOT NULL CHECK (user_role IN ('student', 'teacher', 'staff')),
    before_answers TEXT NOT NULL DEFAULT '[]',
    after_answers TEXT NOT NULL DEFAULT '[]',
    before_average REAL,
    after_average REAL,
    comparable_count INTEGER NOT NULL DEFAULT 0,
    feedback TEXT NOT NULL DEFAULT '',
    submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS satisfactions (
    evaluation_id TEXT PRIMARY KEY REFERENCES evaluations(id) ON DELETE CASCADE,
    answers TEXT NOT NULL DEFAULT '[]',
    average REAL
);

-- Keep each submitted response addressable by question for reporting and
-- preserve the question text/type as it existed when the response was made.
CREATE TABLE IF NOT EXISTS assessment_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    question_id TEXT,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('effectiveness', 'satisfaction')),
    phase TEXT NOT NULL DEFAULT 'submitted' CHECK (phase IN ('before', 'after', 'submitted')),
    question_text TEXT NOT NULL,
    answer_value TEXT NOT NULL,
    UNIQUE (evaluation_id, question_id, assessment_type, phase)
);

CREATE INDEX IF NOT EXISTS idx_evaluations_system_id ON evaluations(system_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_submitted_at ON evaluations(submitted_at);
CREATE INDEX IF NOT EXISTS idx_questions_assessment ON assessment_questions(assessment_type, system_id, active, sort_order);
CREATE INDEX IF NOT EXISTS idx_answers_evaluation ON assessment_answers(evaluation_id);

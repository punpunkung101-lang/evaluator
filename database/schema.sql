PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL,
    system_name TEXT NOT NULL DEFAULT '',
    evaluator_id TEXT NOT NULL,
    evaluator_name TEXT NOT NULL DEFAULT '',
    user_role TEXT NOT NULL CHECK (user_role IN ('student', 'teacher', 'staff')),
    before_answers TEXT NOT NULL,
    after_answers TEXT NOT NULL,
    before_average REAL,
    after_average REAL,
    comparable_count INTEGER NOT NULL DEFAULT 0,
    feedback TEXT NOT NULL DEFAULT '',
    submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS satisfactions (
    evaluation_id TEXT PRIMARY KEY REFERENCES evaluations(id) ON DELETE CASCADE,
    answers TEXT NOT NULL,
    average REAL
);

CREATE INDEX IF NOT EXISTS idx_evaluations_system_id ON evaluations(system_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_submitted_at ON evaluations(submitted_at);

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    evaluator_id TEXT NOT NULL UNIQUE,
    user_role TEXT NOT NULL CHECK (user_role IN ('student', 'teacher', 'staff')),
    is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
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
    user_id TEXT REFERENCES users(id),
    answers TEXT NOT NULL,
    average REAL
);

CREATE INDEX IF NOT EXISTS idx_evaluations_system_id ON evaluations(system_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_submitted_at ON evaluations(submitted_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

PRAGMA foreign_keys = ON;
PRAGMA user_version = 2;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY CHECK (length(id) = 8 AND id NOT GLOB '*[^0-9]*'),
    username TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(username) BETWEEN 1 AND 20),
    display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 20),
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'staff', 'admin')),
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_iterations INTEGER NOT NULL DEFAULT 120000,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS systems (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    has_tracking INTEGER NOT NULL DEFAULT 0 CHECK (has_tracking IN (0, 1))
);

CREATE TABLE IF NOT EXISTS assessment_forms (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('effectiveness', 'satisfaction')),
    title TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    current_version_id TEXT,
    UNIQUE (system_id, assessment_type),
    FOREIGN KEY (current_version_id) REFERENCES form_versions(id)
);

CREATE TABLE IF NOT EXISTS form_versions (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES assessment_forms(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'retired')),
    content_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (form_id, version_number)
);

CREATE TABLE IF NOT EXISTS assessment_questions (
    id TEXT PRIMARY KEY,
    system_id TEXT REFERENCES systems(id) ON DELETE CASCADE,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('effectiveness', 'satisfaction')),
    section TEXT NOT NULL,
    text TEXT NOT NULL,
    text_en TEXT NOT NULL DEFAULT '',
    answer_type TEXT NOT NULL CHECK (answer_type IN ('rating5', 'dropdown', 'radio', 'checkbox', 'short_text', 'long_text', 'number', 'date', 'yes_no', 'ranking')),
    options_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(options_json)),
    required INTEGER NOT NULL DEFAULT 1 CHECK (required IN (0, 1)),
    is_scored INTEGER NOT NULL DEFAULT 0 CHECK (is_scored IN (0, 1)),
    indicator_group TEXT NOT NULL CHECK (indicator_group IN ('core', 'specific')),
    step INTEGER NOT NULL CHECK (step BETWEEN 1 AND 4),
    question_order INTEGER NOT NULL CHECK (question_order > 0),
    roles_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(roles_json)),
    visible_when_json TEXT NOT NULL DEFAULT '{"all":[]}' CHECK (json_valid(visible_when_json)),
    allow_na INTEGER NOT NULL DEFAULT 0 CHECK (allow_na IN (0, 1)),
    allow_other INTEGER NOT NULL DEFAULT 0 CHECK (allow_other IN (0, 1)),
    max_select INTEGER CHECK (max_select IS NULL OR max_select > 0),
    option_set_ref TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    CHECK ((indicator_group = 'core' AND system_id IS NULL) OR (indicator_group = 'specific' AND system_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS option_sets (
    id TEXT PRIMARY KEY,
    system_id TEXT REFERENCES systems(id) ON DELETE CASCADE,
    options_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(options_json)),
    values_by_system_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(values_by_system_json)),
    values_by_role_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(values_by_role_json)),
    depends_on_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(depends_on_json)),
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json))
);

CREATE TABLE IF NOT EXISTS form_version_questions (
    form_version_id TEXT NOT NULL REFERENCES form_versions(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES assessment_questions(id) ON DELETE RESTRICT,
    step INTEGER NOT NULL CHECK (step BETWEEN 1 AND 4),
    sort_order INTEGER NOT NULL CHECK (sort_order > 0),
    PRIMARY KEY (form_version_id, question_id),
    UNIQUE (form_version_id, sort_order)
);

CREATE TABLE IF NOT EXISTS answer_rules (
    id TEXT NOT NULL,
    form_version_id TEXT NOT NULL REFERENCES form_versions(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL,
    question_ids_json TEXT NOT NULL CHECK (json_valid(question_ids_json)),
    rule_json TEXT NOT NULL CHECK (json_valid(rule_json)),
    PRIMARY KEY (form_version_id, id)
);

CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL REFERENCES systems(id),
    system_name TEXT NOT NULL,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('effectiveness', 'satisfaction')),
    form_version_id TEXT NOT NULL REFERENCES form_versions(id),
    evaluator_id TEXT NOT NULL REFERENCES users(id),
    respondent_role TEXT NOT NULL,
    respondent_role_label TEXT NOT NULL,
    profile_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(profile_json)),
    is_mock INTEGER NOT NULL DEFAULT 0 CHECK (is_mock IN (0, 1)),
    submitted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluation_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES assessment_questions(id),
    question_text TEXT NOT NULL,
    answer_type TEXT NOT NULL,
    answer_json TEXT NOT NULL CHECK (json_valid(answer_json)),
    score_value REAL CHECK (score_value IS NULL OR score_value BETWEEN 1 AND 5),
    is_na INTEGER NOT NULL DEFAULT 0 CHECK (is_na IN (0, 1)),
    UNIQUE (evaluation_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_forms_system_type ON assessment_forms(system_id, assessment_type, active);
CREATE INDEX IF NOT EXISTS idx_questions_type_system ON assessment_questions(assessment_type, system_id, active, step, question_order);
CREATE INDEX IF NOT EXISTS idx_form_questions_order ON form_version_questions(form_version_id, step, sort_order);
CREATE INDEX IF NOT EXISTS idx_evaluations_system_type_time ON evaluations(system_id, assessment_type, submitted_at);
CREATE INDEX IF NOT EXISTS idx_evaluations_form_version ON evaluations(form_version_id);
CREATE INDEX IF NOT EXISTS idx_answers_evaluation ON evaluation_answers(evaluation_id, question_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_score ON evaluation_answers(question_id, score_value);

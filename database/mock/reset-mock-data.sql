PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
DELETE FROM evaluations WHERE is_mock = 1;
DELETE FROM users WHERE substr(username, 1, 5) = 'mock_';
COMMIT;

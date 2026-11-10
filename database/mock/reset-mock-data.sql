-- Remove development mock submissions and accounts only; preserve real users and all catalog data.
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
DELETE FROM assessment_answers WHERE evaluation_id IN (SELECT id FROM evaluations WHERE id GLOB 'mock-eval-*');
DELETE FROM satisfactions WHERE evaluation_id GLOB 'mock-eval-*';
DELETE FROM evaluations WHERE id GLOB 'mock-eval-*';
DELETE FROM quantitative_records WHERE id GLOB 'mock-quant-*';
DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM users WHERE username GLOB 'mock_*');
DELETE FROM users WHERE username GLOB 'mock_*';
COMMIT;

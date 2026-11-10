// Tests for backend/src/db_compat.h. Run from the project root:
//   g++ -std=c++17 tests/backend/db_compat_test.cpp -lsqlite3 -o db_compat_test && ./db_compat_test
// (or build target db_compat_test with -DEVALUATOR_BUILD_TESTS=ON). Uses temporary files only.
#include "../../backend/src/db_compat.h"

#include <chrono>
#include <fstream>
#include <sstream>

namespace fs = std::filesystem;
static int failures = 0;
#define CHECK(c) do { if (!(c)) { std::cerr << "FAIL line " << __LINE__ << ": " #c "\n"; ++failures; } } while (0)

static std::string readFile(const fs::path& p) {
  std::ifstream f(p, std::ios::binary);
  std::stringstream s; s << f.rdbuf();
  return s.str();
}
static sqlite3* openDb(const fs::path& p) {
  sqlite3* db = nullptr;
  sqlite3_open(p.string().c_str(), &db);
  return db;
}
static bool execOk(sqlite3* db, const std::string& sql) {
  std::string err;
  bool ok = dbcompat::run(db, sql, err);
  if (!ok) std::cerr << "  sql error: " << err << "\n";
  return ok;
}
static std::string scalar(sqlite3* db, const std::string& sql) {
  sqlite3_stmt* q = nullptr; std::string v = "<none>";
  if (sqlite3_prepare_v2(db, sql.c_str(), -1, &q, nullptr) == SQLITE_OK) {
    if (sqlite3_step(q) == SQLITE_ROW) v = dbcompat::textAt(q, 0);
    sqlite3_finalize(q);
  }
  return v;
}
static bool hasColumn(sqlite3* db, const std::string& t, const std::string& c) {
  for (const auto& col : dbcompat::columnsOf(db, t)) if (dbcompat::lower(col.name) == c) return true;
  return false;
}

int main() {
  const fs::path repo = ".";
  const std::string schema = readFile(repo / "database/schema.sql");
  const std::string seed = readFile(repo / "database/seed.sql");
  CHECK(!schema.empty());
  CHECK(!seed.empty());

  fs::path tmp = fs::temp_directory_path() /
                 ("evaluator-dbcompat-" + std::to_string(std::chrono::steady_clock::now().time_since_epoch().count()));
  fs::create_directories(tmp);
  const std::string backups = (tmp / "backups").string();

  // 1) Old users table without display_name / password_iterations / created_at (the reported error).
  {
    sqlite3* db = openDb(tmp / "old.db");
    CHECK(execOk(db,
      "CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,"
      " role TEXT NOT NULL DEFAULT 'student', password_hash TEXT NOT NULL, password_salt TEXT NOT NULL);"
      "INSERT INTO users VALUES ('12345678','alice','teacher','hash','salt');"));
    // Reproduce the bug first: without the upgrade, seed.sql fails exactly like the report.
    sqlite3* probe = openDb(tmp / "probe.db");
    execOk(probe, "CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, role TEXT, password_hash TEXT, password_salt TEXT);");
    CHECK(execOk(probe, schema));  // CREATE TABLE IF NOT EXISTS skips the old users table
    std::string e; CHECK(!dbcompat::run(probe, seed, e));
    CHECK(e.find("display_name") != std::string::npos);
    sqlite3_close(probe);

    dbcompat::Report rep;
    CHECK(dbcompat::upgradeLegacySchema(db, schema, backups, &rep));
    CHECK(rep.problems.empty());
    CHECK(!rep.actions.empty());
    CHECK(!rep.backupPath.empty() && fs::exists(rep.backupPath));
    CHECK(hasColumn(db, "users", "display_name"));
    CHECK(hasColumn(db, "users", "password_iterations"));
    CHECK(hasColumn(db, "users", "created_at"));
    CHECK(execOk(db, schema));   // now succeeds
    CHECK(execOk(db, seed));     // the statement that used to fail
    CHECK(scalar(db, "SELECT display_name FROM users WHERE username='alice'") == "alice");
    CHECK(scalar(db, "SELECT role FROM users WHERE username='alice'") == "teacher");          // data kept
    CHECK(scalar(db, "SELECT password_iterations FROM users WHERE username='alice'") == "120000");
    CHECK(scalar(db, "SELECT length(created_at) > 0 FROM users WHERE username='alice'") == "1");
    CHECK(scalar(db, "SELECT count(*) FROM schema_migrations WHERE name LIKE 'auto_add_column_users_%'") != "0");
    // The backup contains the OLD shape (no display_name).
    sqlite3* bak = openDb(rep.backupPath);
    CHECK(!hasColumn(bak, "users", "display_name"));
    CHECK(scalar(bak, "SELECT count(*) FROM users") == "1");
    sqlite3_close(bak);

    // Idempotent: a second run changes nothing and makes no new backup.
    size_t before = 0; for (auto& _ : fs::directory_iterator(backups)) { (void)_; ++before; }
    dbcompat::Report rep2;
    CHECK(dbcompat::upgradeLegacySchema(db, schema, backups, &rep2));
    CHECK(rep2.actions.empty() && rep2.backupPath.empty());
    size_t after = 0; for (auto& _ : fs::directory_iterator(backups)) { (void)_; ++after; }
    CHECK(before == after);
    sqlite3_close(db);
  }

  // 2) Not upgradable: an old REQUIRED column the new schema does not know. Nothing may change.
  {
    sqlite3* db = openDb(tmp / "incompatible.db");
    CHECK(execOk(db,
      "CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL, legacy_token TEXT NOT NULL,"
      " role TEXT, password_hash TEXT, password_salt TEXT);"
      "INSERT INTO users VALUES ('12345678','bob','t','student','h','s');"));
    const std::string backups2 = (tmp / "backups2").string();
    dbcompat::Report rep;
    CHECK(!dbcompat::upgradeLegacySchema(db, schema, backups2, &rep));
    CHECK(!rep.problems.empty());
    CHECK(!hasColumn(db, "users", "display_name"));            // untouched
    CHECK(!fs::exists(backups2));                              // no backup, no changes
    CHECK(scalar(db, "SELECT count(*) FROM users") == "1");
    sqlite3_close(db);
  }

  // 3) Brand-new empty database and a database already created from the current schema: no-ops.
  {
    sqlite3* db = openDb(tmp / "new.db");
    dbcompat::Report rep;
    CHECK(dbcompat::upgradeLegacySchema(db, schema, (tmp / "b3").string(), &rep));
    CHECK(rep.actions.empty());
    CHECK(execOk(db, schema));
    CHECK(execOk(db, seed));
    dbcompat::Report rep2;
    CHECK(dbcompat::upgradeLegacySchema(db, schema, (tmp / "b3").string(), &rep2));
    CHECK(rep2.actions.empty() && rep2.problems.empty());
    CHECK(!fs::exists(tmp / "b3"));
    sqlite3_close(db);
  }

  std::error_code ec; fs::remove_all(tmp, ec);
  if (failures) { std::cerr << failures << " check(s) failed\n"; return 1; }
  std::cout << "db_compat tests passed\n";
  return 0;
}

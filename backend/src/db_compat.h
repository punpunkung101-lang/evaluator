// db_compat.h - upgrade an evaluator.db created by an OLDER version so that
// database/schema.sql (CREATE TABLE IF NOT EXISTS ...) and seed.sql can run.
//
// Problem it fixes: "table users has no column named display_name".
// CREATE TABLE IF NOT EXISTS never adds columns to a table that already exists,
// and evaluator.db is not stored in Git, so every developer's file can be older
// than the code they pull.
//
// How it works (no hardcoded column list; schema.sql is the source of truth):
//   1. Build the expected schema in an in-memory database from schema.sql.
//   2. For every table that already exists in the real database, find columns
//      that the current schema has but the real table lacks.
//   3. If every missing column can be added with ALTER TABLE ... ADD COLUMN,
//      back up the database (SQLite backup API) and add them in ONE transaction.
//   4. Otherwise change nothing and report exactly what is incompatible.
// Existing rows are never deleted or overwritten.
#pragma once

#include <sqlite3.h>

#include <cctype>
#include <filesystem>
#include <iostream>
#include <set>
#include <string>
#include <vector>

namespace dbcompat {

struct Column {
  std::string name, type, dflt;
  bool notNull = false, hasDefault = false;
  int pk = 0;
};

struct Report {
  std::vector<std::string> actions;   // what was changed
  std::vector<std::string> problems;  // why automatic upgrade is impossible
  std::string backupPath;             // empty when nothing was changed
};

inline std::string lower(std::string s) {
  for (auto& c : s) c = (char)std::tolower((unsigned char)c);
  return s;
}

inline std::string quoteId(const std::string& s) {
  std::string o = "\"";
  for (char c : s) { if (c == '"') o += "\"\""; else o += c; }
  return o + "\"";
}

inline std::string textAt(sqlite3_stmt* q, int i) {
  const unsigned char* t = sqlite3_column_text(q, i);
  return t ? std::string((const char*)t) : std::string();
}

inline bool run(sqlite3* db, const std::string& sql, std::string& err) {
  char* e = nullptr;
  int rc = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &e);
  if (rc != SQLITE_OK) { err = e ? e : sqlite3_errmsg(db); sqlite3_free(e); return false; }
  return true;
}

inline std::vector<std::string> userTables(sqlite3* db) {
  std::vector<std::string> v;
  sqlite3_stmt* q = nullptr;
  if (sqlite3_prepare_v2(db, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
                         -1, &q, nullptr) != SQLITE_OK) return v;
  while (sqlite3_step(q) == SQLITE_ROW) v.push_back(textAt(q, 0));
  sqlite3_finalize(q);
  return v;
}

inline std::vector<Column> columnsOf(sqlite3* db, const std::string& table) {
  std::vector<Column> v;
  sqlite3_stmt* q = nullptr;
  std::string sql = "PRAGMA table_info(" + quoteId(table) + ")";
  if (sqlite3_prepare_v2(db, sql.c_str(), -1, &q, nullptr) != SQLITE_OK) return v;
  while (sqlite3_step(q) == SQLITE_ROW) {
    Column c;
    c.name = textAt(q, 1);
    c.type = textAt(q, 2);
    c.notNull = sqlite3_column_int(q, 3) != 0;
    c.hasDefault = sqlite3_column_type(q, 4) != SQLITE_NULL;
    c.dflt = textAt(q, 4);
    c.pk = sqlite3_column_int(q, 5);
    v.push_back(c);
  }
  sqlite3_finalize(q);
  return v;
}

// ALTER TABLE ADD COLUMN only accepts constant defaults.
inline bool isConstantDefault(const std::string& d) {
  if (d.empty()) return false;
  std::string l = lower(d);
  if (l == "null" || l == "true" || l == "false") return true;
  if (d.size() >= 2 && d.front() == '\'' && d.back() == '\'') return true;
  size_t i = 0;
  if (d[i] == '+' || d[i] == '-') ++i;
  bool digit = false;
  for (; i < d.size(); ++i) {
    if (std::isdigit((unsigned char)d[i])) digit = true;
    else if (d[i] != '.') return false;
  }
  return digit;
}

inline std::string fallbackFor(const std::string& type) {
  std::string t = lower(type);
  for (const char* k : {"int", "real", "num", "bool", "dec", "floa", "doub"})
    if (t.find(k) != std::string::npos) return "0";
  return "''";
}

inline bool backupTo(sqlite3* src, const std::string& path, std::string& err) {
  sqlite3* dst = nullptr;
  if (sqlite3_open(path.c_str(), &dst) != SQLITE_OK) {
    err = dst ? sqlite3_errmsg(dst) : "cannot open backup file";
    sqlite3_close(dst);
    return false;
  }
  sqlite3_backup* b = sqlite3_backup_init(dst, "main", src, "main");
  if (!b) { err = sqlite3_errmsg(dst); sqlite3_close(dst); return false; }
  sqlite3_backup_step(b, -1);
  int rc = sqlite3_backup_finish(b);
  sqlite3_close(dst);
  if (rc != SQLITE_OK) { err = "SQLite backup failed"; return false; }
  return true;
}

// Returns true when the database is ready for schema.sql (nothing to do, or upgraded).
// Returns false (and changes nothing) when it cannot be upgraded safely.
inline bool upgradeLegacySchema(sqlite3* db, const std::string& schemaSql, const std::string& backupDir,
                                Report* out = nullptr) {
  Report local;
  Report& r = out ? *out : local;

  sqlite3* mem = nullptr;
  if (sqlite3_open(":memory:", &mem) != SQLITE_OK) { std::cerr << "[db] cannot open in-memory database\n"; return false; }
  struct Guard { sqlite3* d; ~Guard() { sqlite3_close(d); } } guard{mem};

  std::string err;
  if (!run(mem, schemaSql, err)) { std::cerr << "[db] database/schema.sql is invalid: " << err << "\n"; return false; }

  std::set<std::string> realTables;
  for (const auto& t : userTables(db)) realTables.insert(lower(t));

  struct Plan { std::string table, column, alter, backfill; };
  std::vector<Plan> plans;

  for (const auto& table : userTables(mem)) {
    if (!realTables.count(lower(table))) continue;  // schema.sql will create it
    auto want = columnsOf(mem, table);
    auto have = columnsOf(db, table);
    std::set<std::string> haveNames, wantNames;
    for (const auto& c : have) haveNames.insert(lower(c.name));
    for (const auto& c : want) wantNames.insert(lower(c.name));

    for (const auto& c : want) {
      if (haveNames.count(lower(c.name))) continue;
      if (c.pk > 0) { r.problems.push_back(table + "." + c.name + " (primary key) is missing"); continue; }
      bool constant = c.hasDefault && isConstantDefault(c.dflt);
      std::string def = constant ? c.dflt : (c.notNull ? fallbackFor(c.type) : std::string());
      Plan p;
      p.table = table;
      p.column = c.name;
      p.alter = "ALTER TABLE " + quoteId(table) + " ADD COLUMN " + quoteId(c.name);
      if (!c.type.empty()) p.alter += " " + c.type;
      if (c.notNull) p.alter += " NOT NULL";
      if (!def.empty()) p.alter += " DEFAULT " + def;
      if (c.hasDefault && !constant) {  // e.g. DEFAULT (strftime(...)): fill existing rows afterwards
        p.backfill = "UPDATE " + quoteId(table) + " SET " + quoteId(c.name) + " = (" + c.dflt + ") WHERE " +
                     quoteId(c.name) + (def.empty() ? " IS NULL" : " = " + def) + ";";
      }
      if (lower(table) == "users" && lower(c.name) == "display_name")
        p.backfill = "UPDATE users SET display_name = substr(username, 1, 20) WHERE display_name = '';";
      plans.push_back(p);
    }
    for (const auto& c : have)  // an old required column the new code never fills would break INSERTs
      if (!wantNames.count(lower(c.name)) && c.notNull && !c.hasDefault && c.pk == 0)
        r.problems.push_back(table + "." + c.name + " is NOT NULL without a default and is not in the current schema");
  }

  if (!r.problems.empty()) {
    std::cerr << "[db] database/evaluator.db was created by an older version and cannot be upgraded automatically:\n";
    for (const auto& p : r.problems) std::cerr << "     - " << p << "\n";
    std::cerr << "     Nothing was changed. Back up database/evaluator.db, delete it, then start the backend again\n"
                 "     (it will be recreated from database/schema.sql and database/seed.sql).\n";
    return false;
  }
  if (plans.empty()) return true;

  // Back up first. If the backup fails, stop: never modify without a copy.
  std::string stamp = "unknown";
  {
    sqlite3_stmt* q = nullptr;
    if (sqlite3_prepare_v2(mem, "SELECT strftime('%Y%m%d-%H%M%S','now','localtime')", -1, &q, nullptr) == SQLITE_OK) {
      if (sqlite3_step(q) == SQLITE_ROW) stamp = textAt(q, 0);
      sqlite3_finalize(q);
    }
  }
  std::error_code ec;
  std::filesystem::create_directories(backupDir, ec);
  std::string backupPath = backupDir + "/evaluator.db.pre-schema-upgrade-" + stamp + ".bak";
  if (!backupTo(db, backupPath, err)) {
    std::cerr << "[db] cannot back up the database before upgrading (" << err << "). Nothing was changed.\n";
    return false;
  }

  if (!run(db, "BEGIN IMMEDIATE;", err)) { std::cerr << "[db] " << err << "\n"; return false; }
  bool ok = run(db,
                "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL "
                "DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')));",
                err);
  for (const auto& p : plans) {
    if (!ok) break;
    ok = run(db, p.alter, err);
    if (ok && !p.backfill.empty()) ok = run(db, p.backfill, err);
    if (ok) ok = run(db, "INSERT OR IGNORE INTO schema_migrations(name) VALUES('auto_add_column_" + p.table + "_" + p.column + "');", err);
  }
  if (!ok) {
    std::string ignored;
    run(db, "ROLLBACK;", ignored);
    std::cerr << "[db] upgrade failed and was rolled back: " << err << "\n";
    return false;
  }
  if (!run(db, "COMMIT;", err)) { std::cerr << "[db] " << err << "\n"; return false; }

  r.backupPath = backupPath;
  std::cerr << "[db] Upgraded an older database (backup: " << backupPath << ")\n";
  for (const auto& p : plans) {
    r.actions.push_back("added " + p.table + "." + p.column);
    std::cerr << "     + added column " << p.table << "." << p.column << "\n";
  }
  return true;
}

}  // namespace dbcompat

#define WIN32_LEAN_AND_MEAN
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <bcrypt.h>
#include <sqlite3.h>
#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <ctime>
#include <cstring>
#include <fstream>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

struct Json
{
    enum Type
    {
        Null,
        Bool,
        Number,
        String,
        Array,
        Object
    } type = Null;
    std::string value;
    std::vector<Json> array;
    std::map<std::string, Json> object;
    const Json &get(const std::string &key) const
    {
        static Json empty;
        auto it = object.find(key);
        return it == object.end() ? empty : it->second;
    }
};
class Parser
{
    const std::string &s;
    size_t i = 0;
    void ws()
    {
        while (i < s.size() && std::isspace((unsigned char)s[i]))
            ++i;
    }
    std::string string()
    {
        std::string o;
        ++i;
        while (i < s.size())
        {
            char c = s[i++];
            if (c == '"')
                break;
            if (c == '\\' && i < s.size())
            {
                char e = s[i++];
                switch (e)
                {
                case 'n':
                    o += '\n';
                    break;
                case 'r':
                    o += '\r';
                    break;
                case 't':
                    o += '\t';
                    break;
                case 'b':
                    o += '\b';
                    break;
                case 'f':
                    o += '\f';
                    break;
                default:
                    o += e;
                }
            }
            else
                o += c;
        }
        return o;
    }
    Json value()
    {
        ws();
        Json j;
        if (i >= s.size())
            return j;
        char c = s[i];
        if (c == '"')
        {
            j.type = Json::String;
            j.value = string();
        }
        else if (c == '{')
        {
            j.type = Json::Object;
            ++i;
            ws();
            while (i < s.size() && s[i] != '}')
            {
                if (s[i] != ',')
                {
                    std::string k = string();
                    ws();
                    if (i < s.size())
                        ++i;
                    j.object[k] = value();
                }
                else
                    ++i;
                ws();
            }
            if (i < s.size())
                ++i;
        }
        else if (c == '[')
        {
            j.type = Json::Array;
            ++i;
            ws();
            while (i < s.size() && s[i] != ']')
            {
                if (s[i] != ',')
                    j.array.push_back(value());
                else
                    ++i;
                ws();
            }
            if (i < s.size())
                ++i;
        }
        else if (s.compare(i, 4, "true") == 0)
        {
            j.type = Json::Bool;
            j.value = "true";
            i += 4;
        }
        else if (s.compare(i, 5, "false") == 0)
        {
            j.type = Json::Bool;
            j.value = "false";
            i += 5;
        }
        else if (s.compare(i, 4, "null") == 0)
            i += 4;
        else
        {
            j.type = Json::Number;
            size_t b = i;
            while (i < s.size() && (std::isdigit((unsigned char)s[i]) || s[i] == '-' || s[i] == '+' || s[i] == '.' || s[i] == 'e' || s[i] == 'E'))
                ++i;
            j.value = s.substr(b, i - b);
        }
        return j;
    }

public:
    explicit Parser(const std::string &x) : s(x) {}
    Json parse() { return value(); }
};
struct Response
{
    int status = 200;
    std::string body;
    std::string headers;
};
struct User
{
    std::string id, username, fullName, email, evaluatorId, role;
    bool isAdmin = false;
};
static std::string quote(const std::string &s)
{
    std::string o = "\"";
    for (unsigned char c : s)
    {
        switch (c)
        {
        case '"':
            o += "\\\"";
            break;
        case '\\':
            o += "\\\\";
            break;
        case '\n':
            o += "\\n";
            break;
        case '\r':
            o += "\\r";
            break;
        case '\t':
            o += "\\t";
            break;
        default:
            if (c < 32)
            {
                char b[7];
                std::snprintf(b, sizeof b, "\\u%04x", c);
                o += b;
            }
            else
                o += c;
        }
    }
    return o + '"';
}
static std::string raw(const Json &j)
{
    if (j.type == Json::Array)
    {
        std::string o = "[";
        for (size_t i = 0; i < j.array.size(); ++i)
        {
            if (i)
                o += ',';
            o += raw(j.array[i]);
        }
        return o + "]";
    }
    if (j.type == Json::Null)
        return "null";
    if (j.type == Json::String)
        return quote(j.value);
    if (j.type == Json::Object)
        return "{}";
    return j.value;
}
static std::string text(const Json &j) { return j.type == Json::String ? j.value : j.type == Json::Null ? ""
                                                                                                        : j.value; }
static double number(const Json &j, double fallback = 0) { return j.type == Json::Number ? std::strtod(j.value.c_str(), nullptr) : fallback; }
static void bindText(sqlite3_stmt *q, int n, const std::string &v) { sqlite3_bind_text(q, n, v.c_str(), -1, SQLITE_TRANSIENT); }
static void bindNum(sqlite3_stmt *q, int n, const Json &j)
{
    if (j.type == Json::Number)
        sqlite3_bind_double(q, n, number(j));
    else
        sqlite3_bind_null(q, n);
}
static std::string col(sqlite3_stmt *q, int n)
{
    const unsigned char *p = sqlite3_column_text(q, n);
    return p ? (const char *)p : "";
}
static bool exec(sqlite3 *db, const std::string &sql)
{
    char *e = nullptr;
    int rc = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &e);
    if (rc != SQLITE_OK)
    {
        std::cerr << (e ? e : sqlite3_errmsg(db)) << "\n";
        sqlite3_free(e);
        return false;
    }
    return true;
}
static bool hasColumn(sqlite3 *db, const char *table, const char *column)
{
    std::string sql = "PRAGMA table_info(" + std::string(table) + ")";
    sqlite3_stmt *q = nullptr;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &q, nullptr) != SQLITE_OK)
        return false;
    bool found = false;
    while (sqlite3_step(q) == SQLITE_ROW)
        if (col(q, 1) == column)
            found = true;
    sqlite3_finalize(q);
    return found;
}
static bool initialize(sqlite3 *db)
{
    std::ifstream f("database/schema.sql");
    if (!f)
    {
        std::cerr << "Cannot read database/schema.sql (run from project root)\n";
        return false;
    }
    std::stringstream b;
    b << f.rdbuf();
    if (!exec(db, b.str()))
        return false;
    if (!hasColumn(db, "users", "is_admin") && !exec(db, "ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0,1))"))
        return false;
    if (!hasColumn(db, "evaluations", "user_id") && !exec(db, "ALTER TABLE evaluations ADD COLUMN user_id TEXT REFERENCES users(id)"))
        return false;
    if (!hasColumn(db, "satisfactions", "user_id") && !exec(db, "ALTER TABLE satisfactions ADD COLUMN user_id TEXT REFERENCES users(id)"))
        return false;
    return exec(db, "CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON evaluations(user_id);");
}
static std::string hex(const unsigned char *p, size_t n)
{
    static const char *d = "0123456789abcdef";
    std::string o;
    for (size_t i = 0; i < n; ++i)
    {
        o += d[p[i] >> 4];
        o += d[p[i] & 15];
    }
    return o;
}
static bool unhex(const std::string &s, std::vector<unsigned char> &out)
{
    if (s.size() % 2)
        return false;
    out.clear();
    for (size_t i = 0; i < s.size(); i += 2)
    {
        unsigned int v = 0;
        std::istringstream in(s.substr(i, 2));
        in >> std::hex >> v;
        if (in.fail())
            return false;
        out.push_back((unsigned char)v);
    }
    return true;
}
static bool randomBytes(unsigned char *out, ULONG n) { return BCryptGenRandom(nullptr, out, n, BCRYPT_USE_SYSTEM_PREFERRED_RNG) == 0; }
static bool digest(const unsigned char *data, ULONG len, unsigned char *out)
{
    BCRYPT_ALG_HANDLE alg = nullptr;
    BCRYPT_HASH_HANDLE hash = nullptr;
    DWORD size = 0, got = 0;
    bool ok = false;
    if (BCryptOpenAlgorithmProvider(&alg, BCRYPT_SHA256_ALGORITHM, nullptr, 0) == 0 && BCryptGetProperty(alg, BCRYPT_OBJECT_LENGTH, (PUCHAR)&size, sizeof size, &got, 0) == 0)
    {
        std::vector<unsigned char> object(size);
        if (BCryptCreateHash(alg, &hash, object.data(), size, nullptr, 0, 0) == 0 && BCryptHashData(hash, (PUCHAR)data, len, 0) == 0 && BCryptFinishHash(hash, out, 32, 0) == 0)
            ok = true;
    }
    if (hash)
        BCryptDestroyHash(hash);
    if (alg)
        BCryptCloseAlgorithmProvider(alg, 0);
    return ok;
}
static bool passwordHash(const std::string &password, std::string &encoded)
{
    unsigned char salt[16], key[32];
    if (!randomBytes(salt, sizeof salt))
        return false;
    BCRYPT_ALG_HANDLE alg = nullptr;
    if (BCryptOpenAlgorithmProvider(&alg, BCRYPT_SHA256_ALGORITHM, nullptr, BCRYPT_ALG_HANDLE_HMAC_FLAG) != 0)
        return false;
    NTSTATUS rc = BCryptDeriveKeyPBKDF2(alg, (PUCHAR)password.data(), (ULONG)password.size(), salt, sizeof salt, 210000, key, sizeof key, 0);
    BCryptCloseAlgorithmProvider(alg, 0);
    if (rc != 0)
        return false;
    encoded = "pbkdf2_sha256$210000$" + hex(salt, sizeof salt) + "$" + hex(key, sizeof key);
    return true;
}
static bool passwordMatches(const std::string &password, const std::string &encoded)
{
    std::vector<std::string> parts;
    std::stringstream ss(encoded);
    std::string p;
    while (std::getline(ss, p, '$'))
        parts.push_back(p);
    if (parts.size() != 4 || parts[0] != "pbkdf2_sha256")
        return false;
    std::vector<unsigned char> salt, expected;
    if (!unhex(parts[2], salt) || !unhex(parts[3], expected) || expected.size() != 32)
        return false;
    unsigned long rounds = std::strtoul(parts[1].c_str(), nullptr, 10);
    if (rounds < 100000 || rounds > 1000000)
        return false;
    unsigned char key[32];
    BCRYPT_ALG_HANDLE alg = nullptr;
    if (BCryptOpenAlgorithmProvider(&alg, BCRYPT_SHA256_ALGORITHM, nullptr, BCRYPT_ALG_HANDLE_HMAC_FLAG) != 0)
        return false;
    NTSTATUS rc = BCryptDeriveKeyPBKDF2(alg, (PUCHAR)password.data(), (ULONG)password.size(), salt.data(), (ULONG)salt.size(), rounds, key, sizeof key, 0);
    BCryptCloseAlgorithmProvider(alg, 0);
    if (rc != 0)
        return false;
    unsigned char diff = 0;
    for (size_t i = 0; i < 32; ++i)
        diff |= key[i] ^ expected[i];
    return diff == 0;
}
static std::string newId(const char *prefix)
{
    unsigned char b[16];
    if (!randomBytes(b, sizeof b))
        return std::string(prefix) + std::to_string(GetTickCount64());
    return std::string(prefix) + hex(b, sizeof b);
}
static bool loadUser(sqlite3 *db, const std::string &id, User &u)
{
    sqlite3_stmt *q = nullptr;
    if (sqlite3_prepare_v2(db, "SELECT id,username,full_name,email,evaluator_id,user_role,is_admin FROM users WHERE id=?", -1, &q, nullptr) != SQLITE_OK)
        return false;
    bindText(q, 1, id);
    bool found = sqlite3_step(q) == SQLITE_ROW;
    if (found)
        u = {col(q, 0), col(q, 1), col(q, 2), col(q, 3), col(q, 4), col(q, 5), sqlite3_column_int(q, 6) != 0};
    sqlite3_finalize(q);
    return found;
}
static std::string userJson(const User &u) { return "{\"id\":" + quote(u.id) + ",\"username\":" + quote(u.username) + ",\"fullName\":" + quote(u.fullName) + ",\"email\":" + quote(u.email) + ",\"evaluatorId\":" + quote(u.evaluatorId) + ",\"role\":" + quote(u.role) + ",\"isAdmin\":" + (u.isAdmin ? "true" : "false") + "}"; }
static std::string cookieValue(const std::string &cookie, const std::string &name)
{
    size_t p = 0;
    while (p < cookie.size())
    {
        while (p < cookie.size() && (cookie[p] == ' ' || cookie[p] == ';'))
            ++p;
        size_t e = cookie.find(';', p);
        if (e == std::string::npos)
            e = cookie.size();
        size_t eq = cookie.find('=', p);
        if (eq < e && cookie.substr(p, eq - p) == name)
            return cookie.substr(eq + 1, e - eq - 1);
        p = e + 1;
    }
    return "";
}
static bool authenticate(sqlite3 *db, const std::string &cookie, User &user)
{
    std::string token = cookieValue(cookie, "ahs_session");
    if (token.size() < 32 || token.size() > 128)
        return false;
    unsigned char hash[32];
    if (!digest((const unsigned char *)token.data(), (ULONG)token.size(), hash))
        return false;
    sqlite3_stmt *q = nullptr;
    if (sqlite3_prepare_v2(db, "SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')", -1, &q, nullptr) != SQLITE_OK)
        return false;
    bindText(q, 1, hex(hash, sizeof hash));
    bool ok = sqlite3_step(q) == SQLITE_ROW;
    std::string id = ok ? col(q, 0) : "";
    sqlite3_finalize(q);
    return ok && loadUser(db, id, user);
}
static bool createSession(sqlite3 *db, const User &user, Response &r, bool secureCookie)
{
    unsigned char bytes[32], hash[32];
    if (!randomBytes(bytes, sizeof bytes))
        return false;
    std::string token = hex(bytes, sizeof bytes);
    if (!digest((const unsigned char *)token.data(), (ULONG)token.size(), hash))
        return false;
    sqlite3_stmt *q = nullptr;
    const char *sql = "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now','+7 days'))";
    if (sqlite3_prepare_v2(db, sql, -1, &q, nullptr) != SQLITE_OK)
        return false;
    bindText(q, 1, hex(hash, sizeof hash));
    bindText(q, 2, user.id);
    bool ok = sqlite3_step(q) == SQLITE_DONE;
    sqlite3_finalize(q);
    if (ok)
        r.headers += "Set-Cookie: ahs_session=" + token + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800" + (secureCookie ? "; Secure" : "") + "\r\n";
    return ok;
}
static std::string recordJson(sqlite3_stmt *q) { return "{\"id\":" + quote(col(q, 0)) + ",\"systemId\":" + quote(col(q, 1)) + ",\"systemName\":" + quote(col(q, 2)) + ",\"evaluatorId\":" + quote(col(q, 3)) + ",\"evaluatorName\":" + quote(col(q, 4)) + ",\"userRole\":" + quote(col(q, 5)) + ",\"beforeAnswers\":" + col(q, 6) + ",\"afterAnswers\":" + col(q, 7) + ",\"beforeAverage\":" + (sqlite3_column_type(q, 8) == SQLITE_NULL ? "null" : std::to_string(sqlite3_column_double(q, 8))) + ",\"afterAverage\":" + (sqlite3_column_type(q, 9) == SQLITE_NULL ? "null" : std::to_string(sqlite3_column_double(q, 9))) + ",\"comparableCount\":" + std::to_string(sqlite3_column_int(q, 10)) + ",\"satisfactionAnswers\":" + col(q, 11) + ",\"satisfactionAverage\":" + (sqlite3_column_type(q, 12) == SQLITE_NULL ? "null" : std::to_string(sqlite3_column_double(q, 12))) + ",\"feedback\":" + quote(col(q, 13)) + ",\"submittedAt\":" + quote(col(q, 14)) + "}"; }
static Response error(int status, const std::string &message) { return {status, "{\"error\":" + quote(message) + "}", ""}; }
static Response handle(sqlite3 *db, const std::string &method, const std::string &path, const std::string &body, const std::string &cookie, bool secureCookie)
{
    if (method == "GET" && path == "/health")
        return {200, "{\"status\":\"ok\"}", ""};
    if (method == "POST" && path == "/auth/register")
    {
        Json j = Parser(body).parse();
        std::string username = text(j.get("username")), password = text(j.get("password")), name = text(j.get("fullName")), email = text(j.get("email")), evaluator = text(j.get("evaluatorId")), role = text(j.get("role"));
        if (username.size() < 3 || username.size() > 64 || password.size() < 10 || name.empty() || email.empty() || evaluator.empty())
            return error(400, "Username, password (at least 10 characters), full name, email, and evaluator ID are required");
        if (role != "student" && role != "teacher" && role != "staff")
            return error(400, "Role must be student, teacher, or staff");
        std::string hash;
        if (!passwordHash(password, hash))
            return error(500, "Password hashing failed");
        std::string id = newId("usr_");
        sqlite3_stmt *q = nullptr;
        const char *sql = "INSERT INTO users(id,username,password_hash,full_name,email,evaluator_id,user_role) VALUES(?,?,?,?,?,?,?)";
        if (sqlite3_prepare_v2(db, sql, -1, &q, nullptr) != SQLITE_OK)
            return error(500, "Account creation failed");
        bindText(q, 1, id);
        bindText(q, 2, username);
        bindText(q, 3, hash);
        bindText(q, 4, name);
        bindText(q, 5, email);
        bindText(q, 6, evaluator);
        bindText(q, 7, role);
        int rc = sqlite3_step(q);
        sqlite3_finalize(q);
        if (rc != SQLITE_DONE)
            return error(rc == SQLITE_CONSTRAINT ? 409 : 500, rc == SQLITE_CONSTRAINT ? "Username, email, or evaluator ID is already registered" : "Account creation failed");
        User u{id, username, name, email, evaluator, role};
        Response r{201, "{\"success\":true,\"user\":" + userJson(u) + "}", ""};
        if (!createSession(db, u, r, secureCookie))
            return error(500, "Could not start session");
        return r;
    }
    if (method == "POST" && path == "/auth/login")
    {
        Json j = Parser(body).parse();
        std::string username = text(j.get("username")), password = text(j.get("password"));
        if (username.empty() || password.empty())
            return error(400, "Username and password are required");
        sqlite3_stmt *q = nullptr;
        if (sqlite3_prepare_v2(db, "SELECT id,password_hash FROM users WHERE username=? COLLATE NOCASE", -1, &q, nullptr) != SQLITE_OK)
            return error(500, "Login failed");
        bindText(q, 1, username);
        bool found = sqlite3_step(q) == SQLITE_ROW;
        std::string id = found ? col(q, 0) : "", hash = found ? col(q, 1) : "";
        sqlite3_finalize(q);
        User u;
        if (!found || !passwordMatches(password, hash) || !loadUser(db, id, u))
            return error(401, "Invalid username or password");
        Response r{200, "{\"success\":true,\"user\":" + userJson(u) + "}", ""};
        if (!createSession(db, u, r, secureCookie))
            return error(500, "Could not start session");
        return r;
    }
    if (method == "POST" && path == "/auth/logout")
    {
        std::string token = cookieValue(cookie, "ahs_session");
        if (token.size() >= 32 && token.size() <= 128)
        {
            unsigned char hash[32];
            if (digest((const unsigned char *)token.data(), (ULONG)token.size(), hash))
            {
                sqlite3_stmt *q = nullptr;
                if (sqlite3_prepare_v2(db, "DELETE FROM sessions WHERE token_hash=?", -1, &q, nullptr) == SQLITE_OK)
                {
                    bindText(q, 1, hex(hash, sizeof hash));
                    sqlite3_step(q);
                    sqlite3_finalize(q);
                }
            }
        }
        return {200, "{\"success\":true}", "Set-Cookie: ahs_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0\r\n"};
    }
    User user;
    if (method == "GET" && path == "/auth/me")
    {
        if (!authenticate(db, cookie, user))
            return error(401, "Authentication required");
        return {200, userJson(user), ""};
    }
    if (!authenticate(db, cookie, user))
        return error(401, "Authentication required");
    if (method == "DELETE" && path == "/evaluations")
    {
        if (!user.isAdmin)
            return error(403, "Administrator account required");
        if (!exec(db, "BEGIN IMMEDIATE") || !exec(db, "DELETE FROM satisfactions") || !exec(db, "DELETE FROM evaluations") || !exec(db, "COMMIT"))
        {
            exec(db, "ROLLBACK");
            return error(500, "Database clear failed");
        }
        return {200, "{\"success\":true}", ""};
    }
    if (method == "GET" && path == "/evaluations")
    {
        if (!user.isAdmin)
            return error(403, "Administrator account required");
        sqlite3_stmt *q = nullptr;
        const char *sql = "SELECT e.id,e.system_id,e.system_name,e.evaluator_id,e.evaluator_name,e.user_role,e.before_answers,e.after_answers,e.before_average,e.after_average,e.comparable_count,COALESCE(s.answers,'[]'),s.average,e.feedback,e.submitted_at FROM evaluations e LEFT JOIN satisfactions s ON s.evaluation_id=e.id ORDER BY e.submitted_at DESC";
        if (sqlite3_prepare_v2(db, sql, -1, &q, nullptr) != SQLITE_OK)
            return error(500, "Database query failed");
        std::string out = "[";
        bool first = true;
        while (sqlite3_step(q) == SQLITE_ROW)
        {
            if (!first)
                out += ',';
            first = false;
            out += recordJson(q);
        }
        sqlite3_finalize(q);
        return {200, out + "]", ""};
    }
    if (method == "POST" && path == "/evaluations")
    {
        Json j = Parser(body).parse();
        if (j.type != Json::Object || text(j.get("systemId")).empty())
            return error(400, "systemId is required");
        std::string id = text(j.get("id"));
        if (id.empty())
            id = newId("eval_");
        sqlite3_stmt *check = nullptr;
        if (sqlite3_prepare_v2(db, "SELECT user_id FROM evaluations WHERE id=?", -1, &check, nullptr) != SQLITE_OK)
            return error(500, "Database query failed");
        bindText(check, 1, id);
        if (sqlite3_step(check) == SQLITE_ROW)
        {
            std::string owner = col(check, 0);
            sqlite3_finalize(check);
            if (owner != user.id)
                return error(409, "Evaluation ID already belongs to another account");
        }
        else
            sqlite3_finalize(check);
        Json before = j.get("beforeAnswers"), after = j.get("afterAnswers");
        if (before.type != Json::Array)
            before.type = Json::Array;
        if (after.type != Json::Array)
            after.type = Json::Array;
        std::string ba = raw(before), aa = raw(after);
        if (!exec(db, "BEGIN IMMEDIATE"))
            return error(500, "Database transaction failed");
        sqlite3_stmt *q = nullptr;
        const char *sql = "INSERT INTO evaluations(id,user_id,system_id,system_name,evaluator_id,evaluator_name,user_role,before_answers,after_answers,before_average,after_average,comparable_count,feedback,submitted_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET system_name=excluded.system_name,before_answers=excluded.before_answers,after_answers=excluded.after_answers,before_average=excluded.before_average,after_average=excluded.after_average,comparable_count=excluded.comparable_count,feedback=excluded.feedback,submitted_at=excluded.submitted_at WHERE evaluations.user_id=excluded.user_id";
        if (sqlite3_prepare_v2(db, sql, -1, &q, nullptr) != SQLITE_OK)
        {
            exec(db, "ROLLBACK");
            return error(500, "Database insert failed");
        }
        bindText(q, 1, id);
        bindText(q, 2, user.id);
        bindText(q, 3, text(j.get("systemId")));
        bindText(q, 4, text(j.get("systemName")));
        bindText(q, 5, user.evaluatorId);
        bindText(q, 6, user.fullName);
        bindText(q, 7, user.role);
        bindText(q, 8, ba);
        bindText(q, 9, aa);
        bindNum(q, 10, j.get("beforeAverage"));
        bindNum(q, 11, j.get("afterAverage"));
        sqlite3_bind_int(q, 12, (int)number(j.get("comparableCount")));
        bindText(q, 13, text(j.get("feedback")));
        std::string date = text(j.get("submittedAt"));
        if (date.empty())
            date = "datetime('now')";
        bindText(q, 14, date);
        bool ok = sqlite3_step(q) == SQLITE_DONE;
        sqlite3_finalize(q);
        if (ok)
        {
            Json sat = j.get("satisfactionAnswers");
            if (sat.type != Json::Array)
                sat.type = Json::Array;
            std::string answers = raw(sat);
            sqlite3_stmt *s = nullptr;
            const char *satSql = "INSERT INTO satisfactions(evaluation_id,user_id,answers,average) VALUES(?,?,?,?) ON CONFLICT(evaluation_id) DO UPDATE SET user_id=excluded.user_id,answers=excluded.answers,average=excluded.average";
            if (sqlite3_prepare_v2(db, satSql, -1, &s, nullptr) != SQLITE_OK)
                ok = false;
            else
            {
                bindText(s, 1, id);
                bindText(s, 2, user.id);
                bindText(s, 3, answers);
                bindNum(s, 4, j.get("satisfactionAverage"));
                ok = sqlite3_step(s) == SQLITE_DONE;
                sqlite3_finalize(s);
            }
        }
        if (!ok || !exec(db, "COMMIT"))
        {
            exec(db, "ROLLBACK");
            return error(500, "Database write failed");
        }
        return {201, "{\"id\":" + quote(id) + ",\"success\":true}", ""};
    }
    return error(404, "not found");
}
static std::string header(const std::string &headers, const std::string &name)
{
    std::istringstream in(headers);
    std::string line;
    std::string lowerName = name;
    std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), [](unsigned char c)
                   { return (char)std::tolower(c); });
    while (std::getline(in, line))
    {
        if (!line.empty() && line.back() == '\r')
            line.pop_back();
        size_t p = line.find(':');
        if (p == std::string::npos)
            continue;
        std::string key = line.substr(0, p);
        std::transform(key.begin(), key.end(), key.begin(), [](unsigned char c)
                       { return (char)std::tolower(c); });
        if (key == lowerName)
        {
            size_t v = p + 1;
            while (v < line.size() && line[v] == ' ')
                ++v;
            return line.substr(v);
        }
    }
    return "";
}
static bool isLocalOrigin(const std::string &origin)
{
    if (origin == "null")
        return true;
    for (const std::string scheme : {"http://", "https://"})
        if (origin.rfind(scheme, 0) == 0)
        {
            std::string host = origin.substr(scheme.size());
            size_t end = host.find_first_of("/: ");
            if (end != std::string::npos)
                host.resize(end);
            std::transform(host.begin(), host.end(), host.begin(), [](unsigned char c)
                           { return (char)std::tolower(c); });
            return host == "localhost" || host == "127.0.0.1";
        }
    return false;
}
static bool bootstrapAdmin(sqlite3 *db)
{
    const char *username = std::getenv("EVALUATOR_ADMIN_USERNAME");
    if (!username || !*username)
        return true;
    const char *password = std::getenv("EVALUATOR_ADMIN_PASSWORD");
    const char *email = std::getenv("EVALUATOR_ADMIN_EMAIL");
    const char *evaluator = std::getenv("EVALUATOR_ADMIN_EVALUATOR_ID");
    const char *name = std::getenv("EVALUATOR_ADMIN_FULL_NAME");
    if (!password || std::strlen(password) < 14 || !email || !evaluator)
    {
        std::cerr << "Bootstrap admin requires EVALUATOR_ADMIN_PASSWORD (14+ chars), EVALUATOR_ADMIN_EMAIL, and EVALUATOR_ADMIN_EVALUATOR_ID\n";
        return false;
    }
    sqlite3_stmt *q = nullptr;
    if (sqlite3_prepare_v2(db, "SELECT is_admin FROM users WHERE username=? COLLATE NOCASE", -1, &q, nullptr) != SQLITE_OK)
        return false;
    bindText(q, 1, username);
    if (sqlite3_step(q) == SQLITE_ROW)
    {
        bool admin = sqlite3_column_int(q, 0) != 0;
        sqlite3_finalize(q);
        if (!admin)
            std::cerr << "Bootstrap username already exists as a regular account; choose a different admin username\n";
        return admin;
    }
    sqlite3_finalize(q);
    std::string hash;
    if (!passwordHash(password, hash))
        return false;
    sqlite3_stmt *insert = nullptr;
    const char *sql = "INSERT INTO users(id,username,password_hash,full_name,email,evaluator_id,user_role,is_admin) VALUES(?,?,?,?,?,?,?,1)";
    if (sqlite3_prepare_v2(db, sql, -1, &insert, nullptr) != SQLITE_OK)
        return false;
    bindText(insert, 1, newId("usr_"));
    bindText(insert, 2, username);
    bindText(insert, 3, hash);
    bindText(insert, 4, name && *name ? name : "Evaluator Administrator");
    bindText(insert, 5, email);
    bindText(insert, 6, evaluator);
    bindText(insert, 7, "staff");
    bool ok = sqlite3_step(insert) == SQLITE_DONE;
    sqlite3_finalize(insert);
    if (ok)
        std::cout << "Bootstrap administrator account created for " << username << "\n";
    return ok;
}
static void client(SOCKET sock, sqlite3 *db)
{
    std::string req;
    char buf[8192];
    int n;
    while ((n = recv(sock, buf, sizeof(buf), 0)) > 0)
    {
        req.append(buf, n);
        auto p = req.find("\r\n\r\n");
        if (p != std::string::npos)
        {
            size_t len = 0;
            std::string h = req.substr(0, p);
            size_t x = h.find("Content-Length:");
            if (x != std::string::npos)
                len = std::strtoul(h.c_str() + x + 15, nullptr, 10);
            if (req.size() >= p + 4 + len)
                break;
        }
    }
    size_t end = req.find("\r\n\r\n");
    if (end == std::string::npos)
    {
        closesocket(sock);
        return;
    }
    std::istringstream first(req.substr(0, req.find("\r\n")));
    std::string method, path, ver;
    first >> method >> path >> ver;
    std::string headers = req.substr(0, end), body = req.substr(end + 4);
    std::string origin = header(headers, "Origin");
    bool localOrigin = isLocalOrigin(origin);
    bool secureCookie = origin.rfind("https://", 0) == 0;
    Response r;
    if (method == "OPTIONS")
    {
        r = {204, "", ""};
    }
    else
        r = handle(db, method, path, body, header(headers, "Cookie"), secureCookie);
    std::string label = r.status == 200 ? "OK" : r.status == 201 ? "Created"
                                             : r.status == 204   ? "No Content"
                                             : r.status == 400   ? "Bad Request"
                                             : r.status == 401   ? "Unauthorized"
                                             : r.status == 403   ? "Forbidden"
                                             : r.status == 404   ? "Not Found"
                                             : r.status == 409   ? "Conflict"
                                                                 : "Internal Server Error";
    std::string cors = "";
    if (localOrigin && !origin.empty())
        cors = "Access-Control-Allow-Origin: " + origin + "\r\nAccess-Control-Allow-Credentials: true\r\nVary: Origin\r\n";
    std::string resp = "HTTP/1.1 " + std::to_string(r.status) + " " + label + "\r\nContent-Type: application/json; charset=utf-8\r\n" + cors + "Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\n" + r.headers + "Connection: close\r\nContent-Length: " + std::to_string(r.body.size()) + "\r\n\r\n" + r.body;
    send(sock, resp.c_str(), (int)resp.size(), 0);
    closesocket(sock);
}
int main(int argc, char **argv)
{
    int port = argc > 1 ? std::atoi(argv[1]) : 8080;
    sqlite3 *db = nullptr;
    if (sqlite3_open("database/evaluator.db", &db) != SQLITE_OK)
    {
        std::cerr << "Cannot open database/evaluator.db\n";
        return 1;
    }
    sqlite3_busy_timeout(db, 5000);
    if (!initialize(db) || !bootstrapAdmin(db))
        return 1;
    WSADATA w;
    if (WSAStartup(MAKEWORD(2, 2), &w))
    {
        std::cerr << "Winsock startup failed\n";
        return 1;
    }
    SOCKET server = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    addr.sin_port = htons((u_short)port);
    int yes = 1;
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, (char *)&yes, sizeof yes);
    if (bind(server, (sockaddr *)&addr, sizeof addr) == SOCKET_ERROR || listen(server, SOMAXCONN) == SOCKET_ERROR)
    {
        std::cerr << "Cannot listen on port " << port << "\n";
        return 1;
    }
    std::cout << "Evaluator C++ API listening on http://localhost:" << port << "\nDatabase: database/evaluator.db\n";
    for (;;)
    {
        SOCKET s = accept(server, nullptr, nullptr);
        if (s != INVALID_SOCKET)
            client(s, db);
    }
    sqlite3_close(db);
    WSACleanup();
    return 0;
}

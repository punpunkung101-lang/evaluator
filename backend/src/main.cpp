#include <winsock2.h>
#include <ws2tcpip.h>
#include <bcrypt.h>
#include <sqlite3.h>
#include <algorithm>
#include <chrono>
#include <cctype>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <map>
#include <sstream>
#include <set>
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
    std::string str(const std::string &fallback = "") const { return type == String || type == Number ? value : fallback; }
    double number(double fallback = 0) const { return type == Number ? std::strtod(value.c_str(), nullptr) : fallback; }
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
    {
        std::string o = "{";
        bool first = true;
        for (const auto &entry : j.object)
        {
            if (!first) o += ',';
            first = false;
            o += quote(entry.first) + ":" + raw(entry.second);
        }
        return o + "}";
    }
    return j.value;
}
static std::string text(const Json &j) { return j.type == Json::String ? j.value : j.type == Json::Null ? ""
                                                                                                        : j.value; }
static size_t utf8Length(const std::string &s)
{
    size_t count = 0;
    for (unsigned char c : s)
        if ((c & 0xC0) != 0x80)
            ++count;
    return count;
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
static std::string errorJson(const std::string &message) { return "{\"error\":" + quote(message) + "}"; }
static std::string hex(const unsigned char *data, size_t n)
{
    static const char *d = "0123456789abcdef";
    std::string o;
    o.reserve(n * 2);
    for (size_t i = 0; i < n; ++i)
    {
        o += d[data[i] >> 4];
        o += d[data[i] & 15];
    }
    return o;
}
static bool passwordHash(const std::string &password, std::string &saltHex, std::string &hashHex)
{
    unsigned char salt[16], out[32];
    if (BCryptGenRandom(nullptr, salt, sizeof salt, BCRYPT_USE_SYSTEM_PREFERRED_RNG) < 0)
        return false;
    BCRYPT_ALG_HANDLE alg = nullptr;
    if (BCryptOpenAlgorithmProvider(&alg, BCRYPT_SHA256_ALGORITHM, nullptr, BCRYPT_ALG_HANDLE_HMAC_FLAG) < 0)
        return false;
    NTSTATUS rc = BCryptDeriveKeyPBKDF2(alg, (PUCHAR)password.data(), (ULONG)password.size(), salt, sizeof salt, 120000, out, sizeof out, 0);
    BCryptCloseAlgorithmProvider(alg, 0);
    if (rc < 0)
        return false;
    saltHex = hex(salt, sizeof salt);
    hashHex = hex(out, sizeof out);
    return true;
}
static std::string derive(const std::string &password, const std::string &saltHex)
{
    if (saltHex.size() != 32)
        return "";
    unsigned char salt[16], out[32];
    auto digit = [](char c)
    { return c >= '0' && c <= '9' ? c - '0' : c >= 'a' && c <= 'f' ? c - 'a' + 10
                                          : c >= 'A' && c <= 'F'   ? c - 'A' + 10
                                                                   : -1; };
    for (size_t i = 0; i < 16; ++i)
    {
        int a = digit(saltHex[2 * i]), b = digit(saltHex[2 * i + 1]);
        if (a < 0 || b < 0)
            return "";
        salt[i] = (unsigned char)((a << 4) | b);
    }
    BCRYPT_ALG_HANDLE alg = nullptr;
    if (BCryptOpenAlgorithmProvider(&alg, BCRYPT_SHA256_ALGORITHM, nullptr, BCRYPT_ALG_HANDLE_HMAC_FLAG) < 0)
        return "";
    NTSTATUS rc = BCryptDeriveKeyPBKDF2(alg, (PUCHAR)password.data(), (ULONG)password.size(), salt, sizeof salt, 120000, out, sizeof out, 0);
    BCryptCloseAlgorithmProvider(alg, 0);
    return rc < 0 ? "" : hex(out, sizeof out);
}
static bool constantEqual(const std::string &a, const std::string &b)
{
    if (a.size() != b.size())
        return false;
    unsigned char d = 0;
    for (size_t i = 0; i < a.size(); ++i)
        d |= (unsigned char)(a[i] ^ b[i]);
    return d == 0;
}
static bool sessionUser(sqlite3 *db, const std::string &token, std::string &id, std::string &username, std::string &display, std::string &role)
{
    if (token.empty())
        return false;
    sqlite3_stmt *q = nullptr;
    if (sqlite3_prepare_v2(db, "SELECT u.id,u.username,u.display_name,u.role FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?", -1, &q, nullptr) != SQLITE_OK)
        return false;
    sqlite3_bind_text(q, 1, token.c_str(), -1, SQLITE_TRANSIENT);
    bool ok = sqlite3_step(q) == SQLITE_ROW;
    if (ok)
    {
        id = col(q, 0);
        username = col(q, 1);
        display = col(q, 2);
        role = col(q, 3);
    }
    sqlite3_finalize(q);
    return ok;
}
static bool adminSession(sqlite3 *db, const std::string &token, std::string &id, std::string &username, std::string &display, std::string &role, int &status)
{
    if (!sessionUser(db, token, id, username, display, role))
    {
        status = 401;
        return false;
    }
    if (role != "admin")
    {
        status = 403;
        return false;
    }
    return true;
}
static bool newSession(sqlite3 *db, const std::string &id, std::string &token)
{
    unsigned char b[32];
    if (BCryptGenRandom(nullptr, b, sizeof b, BCRYPT_USE_SYSTEM_PREFERRED_RNG) < 0)
        return false;
    token = hex(b, sizeof b);
    sqlite3_stmt *q = nullptr;
    if (sqlite3_prepare_v2(db, "INSERT INTO auth_sessions(token,user_id) VALUES(?,?)", -1, &q, nullptr) != SQLITE_OK)
        return false;
    sqlite3_bind_text(q, 1, token.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(q, 2, id.c_str(), -1, SQLITE_TRANSIENT);
    bool ok = sqlite3_step(q) == SQLITE_DONE;
    sqlite3_finalize(q);
    return ok;
}
static std::string userJson(const std::string &id, const std::string &u, const std::string &display, const std::string &role, const std::string &token = "")
{
    std::string s = "{\"success\":true,\"user\":{\"id\":" + quote(id) + ",\"username\":" + quote(u) + ",\"displayName\":" + quote(display) + ",\"role\":" + quote(role) + "}";
    if (!token.empty())
        s += ",\"token\":" + quote(token);
    return s + "}";
}
static std::string param(const std::string &path, const std::string &key)
{
    size_t q = path.find('?');
    if (q == std::string::npos)
        return "";
    std::string x = path.substr(q + 1), p = key + "=";
    size_t i = x.find(p);
    if (i == std::string::npos)
        return "";
    size_t e = x.find('&', i);
    return x.substr(i + p.size(), e == std::string::npos ? e : e - i - p.size());
}
static std::string auth(sqlite3 *db, const std::string &path, const std::string &body, const std::string &token, int &status)
{
    Json j = Parser(body).parse();
    if (path == "/auth/session")
    {
        std::string id, u, d, r;
        if (!sessionUser(db, token, id, u, d, r))
        {
            status = 401;
            return errorJson("login required");
        }
        status = 200;
        return userJson(id, u, d, r);
    }
    if (path == "/auth/logout")
    {
        sqlite3_stmt *q = nullptr;
        sqlite3_prepare_v2(db, "DELETE FROM auth_sessions WHERE token=?", -1, &q, nullptr);
        sqlite3_bind_text(q, 1, token.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_step(q);
        sqlite3_finalize(q);
        status = 200;
        return "{\"success\":true}";
    }
    std::string username = text(j.get("username")), password = text(j.get("password"));
    if (username.empty() || utf8Length(username) > 20 || password.size() < 8)
    {
        status = 400;
        return errorJson("username must be 1-20 characters and password at least 8 characters");
    }
    if (path == "/auth/register")
    {
        std::string display = text(j.get("displayName")), role = text(j.get("role"));
        if (display.empty() || utf8Length(display) > 20)
        {
            status = 400;
            return errorJson("display name must be 1-20 characters");
        }
        if (role != "student" && role != "teacher" && role != "staff")
            role = "student";
        std::string salt, hash;
        if (!passwordHash(password, salt, hash))
        {
            status = 500;
            return errorJson("password hashing failed");
        }
        sqlite3_stmt *seq = nullptr;
        if (sqlite3_prepare_v2(db, "SELECT COALESCE(MAX(CAST(id AS INTEGER)),0)+1 FROM users WHERE length(id)=8 AND id NOT GLOB '*[^0-9]*'", -1, &seq, nullptr) != SQLITE_OK)
        {
            status = 500;
            return errorJson("could not allocate user ID");
        }
        sqlite3_step(seq);
        unsigned int n = (unsigned int)sqlite3_column_int64(seq, 0);
        sqlite3_finalize(seq);
        if (n > 99999999)
        {
            status = 409;
            return errorJson("no user IDs available");
        }
        char b[9];
        std::snprintf(b, sizeof b, "%08u", n);
        std::string id = b;
        sqlite3_stmt *q = nullptr;
        if (sqlite3_prepare_v2(db, "INSERT INTO users(id,username,display_name,role,password_hash,password_salt,password_iterations) VALUES(?,?,?,?,?,?,120000)", -1, &q, nullptr) != SQLITE_OK)
        {
            status = 500;
            return errorJson("account creation failed");
        }
        sqlite3_bind_text(q, 1, id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(q, 2, username.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(q, 3, display.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(q, 4, role.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(q, 5, hash.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(q, 6, salt.c_str(), -1, SQLITE_TRANSIENT);
        int rc = sqlite3_step(q);
        sqlite3_finalize(q);
        if (rc != SQLITE_DONE)
        {
            status = rc == SQLITE_CONSTRAINT ? 409 : 500;
            return errorJson(rc == SQLITE_CONSTRAINT ? "username already exists" : "account creation failed");
        }
        std::string session;
        if (!newSession(db, id, session))
        {
            status = 500;
            return errorJson("session creation failed");
        }
        status = 201;
        return userJson(id, username, display, role, session);
    }
    sqlite3_stmt *q = nullptr;
    if (sqlite3_prepare_v2(db, "SELECT id,username,display_name,role,password_hash,password_salt FROM users WHERE username=? COLLATE NOCASE OR id=? LIMIT 1", -1, &q, nullptr) != SQLITE_OK)
    {
        status = 500;
        return errorJson("login failed");
    }
    sqlite3_bind_text(q, 1, username.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(q, 2, username.c_str(), -1, SQLITE_TRANSIENT);
    if (sqlite3_step(q) != SQLITE_ROW)
    {
        sqlite3_finalize(q);
        status = 401;
        return errorJson("invalid username or password");
    }
    std::string id = col(q, 0), u = col(q, 1), d = col(q, 2), r = col(q, 3), saved = col(q, 4), salt = col(q, 5);
    sqlite3_finalize(q);
    if (!constantEqual(saved, derive(password, salt)))
    {
        status = 401;
        return errorJson("invalid username or password");
    }
    std::string session;
    if (!newSession(db, id, session))
    {
        status = 500;
        return errorJson("session creation failed");
    }
    status = 200;
    return userJson(id, u, d, r, session);
}
static std::string recordJson(sqlite3_stmt *q) { return "{\"id\":" + quote(col(q, 0)) + ",\"systemId\":" + quote(col(q, 1)) + ",\"systemName\":" + quote(col(q, 2)) + ",\"evaluatorId\":" + quote(col(q, 3)) + ",\"evaluatorName\":" + quote(col(q, 4)) + ",\"userRole\":" + quote(col(q, 5)) + ",\"beforeAnswers\":" + col(q, 6) + ",\"afterAnswers\":" + col(q, 7) + ",\"beforeAverage\":" + (sqlite3_column_type(q, 8) == SQLITE_NULL ? "null" : std::to_string(sqlite3_column_double(q, 8))) + ",\"afterAverage\":" + (sqlite3_column_type(q, 9) == SQLITE_NULL ? "null" : std::to_string(sqlite3_column_double(q, 9))) + ",\"comparableCount\":" + std::to_string(sqlite3_column_int(q, 10)) + ",\"satisfactionAnswers\":" + col(q, 11) + ",\"satisfactionAverage\":" + (sqlite3_column_type(q, 12) == SQLITE_NULL ? "null" : std::to_string(sqlite3_column_double(q, 12))) + ",\"feedback\":" + quote(col(q, 13)) + ",\"submittedAt\":" + quote(col(q, 14)) + "}"; }
static void bindText(sqlite3_stmt *q, int i, const Json &j)
{
    std::string s = text(j);
    sqlite3_bind_text(q, i, s.c_str(), -1, SQLITE_TRANSIENT);
}
static void bindNum(sqlite3_stmt *q, int i, const Json &j)
{
    if (j.type == Json::Number)
        sqlite3_bind_double(q, i, j.number());
    else
        sqlite3_bind_null(q, i);
}
static std::string questionRows(sqlite3 *db, const std::string &system, const std::string &type, int &status, bool includeInactive = false)
{
    sqlite3_stmt *q = nullptr;
    const char *sql = "SELECT q.id,q.system_id,q.assessment_type,q.section,q.text,q.text_en,q.answer_type,q.options_json,q.required,q.is_scored,q.indicator_group,q.step,q.question_order,q.roles_json,q.visible_when_json,q.allow_na,q.allow_other,q.max_select,v.id,q.option_set_ref,q.metadata_json,q.active FROM assessment_forms f JOIN form_versions v ON v.id=f.current_version_id JOIN form_version_questions fq ON fq.form_version_id=v.id JOIN assessment_questions q ON q.id=fq.question_id WHERE f.system_id=? AND (?='' OR f.assessment_type=?) AND f.active=1 AND (?=1 OR q.active=1) ORDER BY f.assessment_type,fq.step,fq.sort_order";
    if (sqlite3_prepare_v2(db, sql, -1, &q, nullptr) != SQLITE_OK)
    {
        status = 500;
        return errorJson("question query failed");
    }
    sqlite3_bind_text(q, 1, system.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(q, 2, type.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(q, 3, type.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(q, 4, includeInactive ? 1 : 0);
    std::string o = "[";
    bool first = true;
    while (sqlite3_step(q) == SQLITE_ROW)
    {
        if (!first)
            o += ',';
        first = false;
        o += "{\"id\":" + quote(col(q, 0)) + ",\"systemId\":" + (sqlite3_column_type(q,1)==SQLITE_NULL ? "null" : quote(col(q,1))) + ",\"assessmentType\":" + quote(col(q, 2)) + ",\"section\":" + quote(col(q, 3)) + ",\"text\":" + quote(col(q, 4)) + ",\"text_en\":" + quote(col(q, 5)) + ",\"answer_type\":" + quote(col(q, 6)) + ",\"options\":" + raw(Parser(col(q,7)).parse()) + ",\"required\":" + (sqlite3_column_int(q,8) ? "true" : "false") + ",\"is_scored\":" + (sqlite3_column_int(q,9) ? "true" : "false") + ",\"indicator_group\":" + quote(col(q,10)) + ",\"step\":" + std::to_string(sqlite3_column_int(q,11)) + ",\"order\":" + std::to_string(sqlite3_column_int(q,12)) + ",\"roles\":" + raw(Parser(col(q,13)).parse()) + ",\"visible_when\":" + raw(Parser(col(q,14)).parse()) + ",\"allow_na\":" + (sqlite3_column_int(q,15) ? "true" : "false") + ",\"allow_other\":" + (sqlite3_column_int(q,16) ? "true" : "false") + ",\"max_select\":" + (sqlite3_column_type(q,17)==SQLITE_NULL ? "null" : std::to_string(sqlite3_column_int(q,17))) + ",\"formVersionId\":" + quote(col(q,18)) + ",\"optionSetRef\":" + (sqlite3_column_type(q,19)==SQLITE_NULL?"null":quote(col(q,19))) + ",\"metadata\":" + raw(Parser(col(q,20)).parse()) + ",\"active\":" + (sqlite3_column_int(q,21) ? "true" : "false") + "}";
    }
    sqlite3_finalize(q);
    status = 200;
    return o + "]";
}
static bool conditionPass(const Json &condition, const std::map<std::string,Json> &answers, const std::string &system, bool hasTracking)
{
    if(condition.type!=Json::Object) return true;
    const Json &all=condition.get("all"); if(all.type==Json::Array) for(const auto &item:all.array) if(!conditionPass(item,answers,system,hasTracking)) return false;
    const Json &any=condition.get("any"); if(any.type==Json::Array && !any.array.empty()){bool one=false;for(const auto &item:any.array)if(conditionPass(item,answers,system,hasTracking))one=true;if(!one)return false;}
    const Json &notj=condition.get("not");if(notj.type!=Json::Null && conditionPass(notj,answers,system,hasTracking))return false;
    std::string qid=text(condition.get("question_id"));if(qid.empty())qid=text(condition.get("questionId"));
    if(!qid.empty()){auto it=answers.find(qid);bool answered=it!=answers.end() && it->second.type!=Json::Null && !(it->second.type==Json::String&&it->second.value.empty());std::string op=text(condition.get("operator"));const Json &expected=condition.get("value");if(op=="is_answered"){if(answered!=(expected.type!=Json::Bool||expected.value!="false"))return false;}else if(!answered)return false;else if(op=="in"){if(expected.type!=Json::Array)return false;bool found=false;for(const auto &v:expected.array)if(raw(v)==raw(it->second))found=true;if(!found)return false;}else if(op=="not_equals"){if(raw(it->second)==raw(expected))return false;}else if(op=="contains"){bool found=false;if(it->second.type==Json::Array)for(const auto &v:it->second.array)if(raw(v)==raw(expected))found=true;if(!found)return false;}else if(raw(it->second)!=raw(expected))return false;}
    const Json &sys=condition.get("system");if(sys.type==Json::Object){if(text(sys.get("id"))!=""&&text(sys.get("id"))!=system)return false;if(sys.get("has_tracking").type==Json::Bool&&((sys.get("has_tracking").value=="true")!=hasTracking))return false;}
    return true;
}
static Json optionSetValues(sqlite3 *db, const std::string &ref, const std::string &system, const std::string &roleValue, const std::string &roleLabel)
{
    sqlite3_stmt *q=nullptr;Json result;sqlite3_prepare_v2(db,"SELECT options_json,values_by_system_json,values_by_role_json FROM option_sets WHERE id=? AND (system_id IS NULL OR system_id=?)",-1,&q,nullptr);sqlite3_bind_text(q,1,ref.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(q,2,system.c_str(),-1,SQLITE_TRANSIENT);
    if(sqlite3_step(q)==SQLITE_ROW){Json options=Parser(col(q,0)).parse(),bySystem=Parser(col(q,1)).parse(),byRole=Parser(col(q,2)).parse();if(bySystem.type==Json::Object&&bySystem.get(system).type==Json::Array)result=bySystem.get(system);else if(byRole.type==Json::Object&&byRole.get(roleValue).type==Json::Array)result=byRole.get(roleValue);else if(byRole.type==Json::Object&&byRole.get(roleLabel).type==Json::Array)result=byRole.get(roleLabel);else result=options;}
    sqlite3_finalize(q);if(result.type!=Json::Array){result.type=Json::Array;result.array.clear();}return result;
}
static std::string handle(sqlite3 *db, const std::string &method, const std::string &path, const std::string &body, const std::string &token, int &status)
{
    std::string route = path.substr(0, path.find('?'));
    if (method == "GET" && route == "/health")
    {
        status = 200;
        return "{\"status\":\"ok\"}";
    }
    if (method == "GET" && route == "/auth/me")
    {
        std::string id, u, d, r;
        if (!sessionUser(db, token, id, u, d, r))
        {
            status = 401;
            return errorJson("login required");
        }
        status = 200;
        return userJson(id, u, d, r);
    }
    if (method == "POST" && (route == "/auth/login" || route == "/auth/register" || route == "/auth/session" || route == "/auth/logout"))
        return auth(db, route, body, token, status);
    if (route == "/settings/improvement" && (method == "GET" || method == "PUT"))
    {
        std::string uid, u, d, r;
        if (!adminSession(db, token, uid, u, d, r, status))
            return errorJson(status == 401 ? "login required" : "ไม่มีสิทธิ์เข้าถึง Admin");
        if (method == "GET")
        {
            sqlite3_stmt *q = nullptr;
            if (sqlite3_prepare_v2(db, "SELECT value_json FROM app_settings WHERE setting_key='improvement_scoring'", -1, &q, nullptr) != SQLITE_OK)
            { status = 500; return errorJson("settings query failed"); }
            std::string value = sqlite3_step(q) == SQLITE_ROW ? col(q, 0) : "{}";
            sqlite3_finalize(q); status = 200; return "{\"improvement\":" + value + "}";
        }
        Json payload = Parser(body).parse();
        const Json &settings = payload.get("improvement");
        const char *numericFields[] = {"minimumRespondents","categoryLowBelow","satisfactionLowBelow","lowRatingAtOrBelow","lowRatingShareForReview","lowRatingShareForUrgent","commonProblemShareForReview","commonImprovementShareForReview","urgentLowCategoryCount","urgentProblemShare"};
        if (settings.type != Json::Object) { status = 400; return errorJson("improvement settings are required"); }
        for (const char *field : numericFields)
        {
            const Json &value = settings.get(field);
            if (value.type != Json::Number || !std::isfinite(value.number())) { status = 400; return errorJson(std::string("invalid setting: ") + field); }
            const double n = value.number();
            if ((std::string(field) == "minimumRespondents" && (n < 1 || n > 100000 || std::floor(n) != n)) ||
                (std::string(field) == "urgentLowCategoryCount" && (n < 1 || n > 6 || std::floor(n) != n)) ||
                ((std::string(field) == "categoryLowBelow" || std::string(field) == "satisfactionLowBelow" || std::string(field) == "lowRatingAtOrBelow") && (n < 1 || n > 5)) ||
                ((std::string(field) != "minimumRespondents" && std::string(field) != "urgentLowCategoryCount" && std::string(field) != "categoryLowBelow" && std::string(field) != "satisfactionLowBelow" && std::string(field) != "lowRatingAtOrBelow") && (n < 0 || n > 1)))
            { status = 400; return errorJson(std::string("setting out of range: ") + field); }
        }
        const Json &categories = settings.get("coreCategories");
        if (categories.type != Json::Array || categories.array.empty()) { status = 400; return errorJson("coreCategories must be a non-empty array"); }
        const std::string value = raw(settings);
        sqlite3_stmt *save = nullptr;
        if (sqlite3_prepare_v2(db, "INSERT INTO app_settings(setting_key,value_json,updated_at) VALUES('improvement_scoring',?,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(setting_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at", -1, &save, nullptr) != SQLITE_OK)
        { status = 500; return errorJson("settings update failed"); }
        sqlite3_bind_text(save, 1, value.c_str(), -1, SQLITE_TRANSIENT);
        const bool ok = sqlite3_step(save) == SQLITE_DONE; sqlite3_finalize(save);
        if (!ok) { status = 500; return errorJson("settings update failed"); }
        status = 200; return "{\"success\":true}";
    }
    if (method == "GET" && route == "/systems")
    {
        sqlite3_stmt *q = nullptr;
        sqlite3_prepare_v2(db, "SELECT id,name,name_en,has_tracking FROM systems WHERE active=1 ORDER BY sort_order,id", -1, &q, nullptr);
        std::string o = "[";
        bool first = true;
        while (sqlite3_step(q) == SQLITE_ROW)
        {
            if (!first)
                o += ',';
            first = false;
            o += "{\"id\":" + quote(col(q, 0)) + ",\"name\":" + quote(col(q, 1)) + ",\"name_en\":" + quote(col(q, 2)) + ",\"has_tracking\":" + (sqlite3_column_int(q,3)?"true":"false") + "}";
        }
        sqlite3_finalize(q);
        status = 200;
        return o + "]";
    }
    if (method == "GET" && route == "/option-sets")
    {
        std::string system=param(path,"system_id"); if(system.empty()){status=400;return errorJson("system_id is required");}
        sqlite3_stmt *q=nullptr;const char *sql="SELECT id,system_id,options_json,values_by_system_json,values_by_role_json,depends_on_json FROM option_sets WHERE system_id IS NULL OR system_id=? ORDER BY id";
        if(sqlite3_prepare_v2(db,sql,-1,&q,nullptr)!=SQLITE_OK){status=500;return errorJson("option set query failed");}
        sqlite3_bind_text(q,1,system.c_str(),-1,SQLITE_TRANSIENT);std::string o="[";bool first=true;
        while(sqlite3_step(q)==SQLITE_ROW){if(!first)o+=',';first=false;o+="{\"id\":"+quote(col(q,0))+",\"systemId\":"+(sqlite3_column_type(q,1)==SQLITE_NULL?"null":quote(col(q,1)))+",\"options\":"+raw(Parser(col(q,2)).parse())+",\"valuesBySystem\":"+raw(Parser(col(q,3)).parse())+",\"valuesByRole\":"+raw(Parser(col(q,4)).parse())+",\"dependsOn\":"+raw(Parser(col(q,5)).parse())+"}";}
        sqlite3_finalize(q);status=200;return o+"]";
    }
    if (method == "POST" && route == "/option-sets/replace")
    {
        std::string uid, u, d, r;
        if (!adminSession(db, token, uid, u, d, r, status))
            return errorJson(status == 401 ? "login required" : "ไม่มีสิทธิ์เข้าถึง Admin");
        Json payload = Parser(body).parse();
        const std::string system = text(payload.get("systemId"));
        const Json &items = payload.get("optionSets");
        if (system.empty() || items.type != Json::Array) { status = 400; return errorJson("systemId and optionSets are required"); }
        if (!exec(db, "BEGIN IMMEDIATE")) { status = 500; return errorJson("database transaction failed"); }
        bool ok = true;
        for (const Json &item : items.array)
        {
            const std::string id = text(item.get("id"));
            const std::string scope = text(item.get("systemId"));
            const Json &options = item.get("options"), &bySystem = item.get("valuesBySystem"), &byRole = item.get("valuesByRole"), &depends = item.get("dependsOn"), &metadata = item.get("metadata");
            if (id.empty() || (!scope.empty() && scope != system) || (options.type != Json::Array && options.type != Json::Null) ||
                (bySystem.type != Json::Object && bySystem.type != Json::Null) || (byRole.type != Json::Object && byRole.type != Json::Null) ||
                (depends.type != Json::Object && depends.type != Json::Null) || (metadata.type != Json::Object && metadata.type != Json::Null)) { ok = false; break; }
            const std::string optionsJson = options.type == Json::Null ? "[]" : raw(options);
            const std::string bySystemJson = bySystem.type == Json::Null ? "{}" : raw(bySystem);
            const std::string byRoleJson = byRole.type == Json::Null ? "{}" : raw(byRole);
            const std::string dependsJson = depends.type == Json::Null ? "{}" : raw(depends);
            const std::string metadataJson = metadata.type == Json::Null ? "{}" : raw(metadata);
            sqlite3_stmt *save = nullptr;
            const char *sql = "INSERT INTO option_sets(id,system_id,options_json,values_by_system_json,values_by_role_json,depends_on_json,metadata_json) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET system_id=excluded.system_id,options_json=excluded.options_json,values_by_system_json=excluded.values_by_system_json,values_by_role_json=excluded.values_by_role_json,depends_on_json=excluded.depends_on_json,metadata_json=excluded.metadata_json WHERE option_sets.system_id IS NULL OR option_sets.system_id=excluded.system_id";
            if (sqlite3_prepare_v2(db, sql, -1, &save, nullptr) != SQLITE_OK) { ok = false; break; }
            sqlite3_bind_text(save, 1, id.c_str(), -1, SQLITE_TRANSIENT);
            if (scope.empty()) sqlite3_bind_null(save, 2); else sqlite3_bind_text(save, 2, scope.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(save, 3, optionsJson.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(save, 4, bySystemJson.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(save, 5, byRoleJson.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(save, 6, dependsJson.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(save, 7, metadataJson.c_str(), -1, SQLITE_TRANSIENT);
            ok = sqlite3_step(save) == SQLITE_DONE && sqlite3_changes(db) == 1;
            sqlite3_finalize(save);
            if (!ok) break;
        }
        if (!ok || !exec(db, "COMMIT")) { exec(db, "ROLLBACK"); status = 400; return errorJson("option set update failed; check IDs and JSON fields"); }
        status = 200; return "{\"success\":true}";
    }
    if (method == "GET" && route == "/questions")
    {
        std::string system = param(path, "system_id");
        const bool includeInactive = param(path, "include_inactive") == "1";
        if (system.empty())
        {
            status = 400;
            return errorJson("system_id is required");
        }
        if (includeInactive)
        {
            std::string uid, u, d, r;
            if (!adminSession(db, token, uid, u, d, r, status))
                return errorJson(status == 401 ? "login required" : "ไม่มีสิทธิ์เข้าถึง Admin");
        }
        return questionRows(db, system, param(path, "assessment_type"), status, includeInactive);
    }
    if (method == "POST" && route == "/questions/replace")
    {
        std::string uid, u, d, r;
        if (!adminSession(db, token, uid, u, d, r, status))
            return errorJson(status == 401 ? "login required" : "ไม่มีสิทธิ์เข้าถึง Admin");
        Json j = Parser(body).parse();
        std::string system = text(j.get("systemId")), kind=text(j.get("assessmentType"));
        const Json &items = j.get("questions");
        if (system.empty() || items.type != Json::Array || (kind!="effectiveness"&&kind!="satisfaction"))
        {
            status = 400;
            return errorJson("systemId, assessmentType, and questions are required");
        }
        if (!exec(db, "BEGIN IMMEDIATE"))
        {
            status = 500;
            return errorJson("database transaction failed");
        }
        sqlite3_stmt *lookup=nullptr;sqlite3_prepare_v2(db,"SELECT f.id,COALESCE(MAX(v.version_number),0),f.current_version_id FROM assessment_forms f LEFT JOIN form_versions v ON v.form_id=f.id WHERE f.system_id=? AND f.assessment_type=? AND f.active=1 GROUP BY f.id",-1,&lookup,nullptr);sqlite3_bind_text(lookup,1,system.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(lookup,2,kind.c_str(),-1,SQLITE_TRANSIENT);
        bool found=sqlite3_step(lookup)==SQLITE_ROW;std::string formId=found?col(lookup,0):"",oldVersion=found?col(lookup,2):"";int nextVersion=found?sqlite3_column_int(lookup,1)+1:0;sqlite3_finalize(lookup);
        if(!found){exec(db,"ROLLBACK");status=404;return errorJson("assessment form not found");}
        std::string versionId=formId+"_v"+std::to_string(nextVersion),created="2026-11-12T00:00:00Z";
        sqlite3_stmt *ver=nullptr;sqlite3_prepare_v2(db,"INSERT INTO form_versions(id,form_id,version_number,status,content_hash,created_at) VALUES(?,?,?,'published',?,?)",-1,&ver,nullptr);sqlite3_bind_text(ver,1,versionId.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(ver,2,formId.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_int(ver,3,nextVersion);sqlite3_bind_text(ver,4,"admin-update",-1,SQLITE_STATIC);sqlite3_bind_text(ver,5,created.c_str(),-1,SQLITE_TRANSIENT);bool ok=sqlite3_step(ver)==SQLITE_DONE;sqlite3_finalize(ver);
        sqlite3_stmt *copy=nullptr;sqlite3_prepare_v2(db,"INSERT INTO form_version_questions(form_version_id,question_id,step,sort_order) SELECT ?,q.id,fq.step,fq.sort_order FROM form_version_questions fq JOIN assessment_questions q ON q.id=fq.question_id WHERE fq.form_version_id=? AND NOT(q.system_id=? AND q.assessment_type=?)",-1,&copy,nullptr);sqlite3_bind_text(copy,1,versionId.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(copy,2,oldVersion.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(copy,3,system.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(copy,4,kind.c_str(),-1,SQLITE_TRANSIENT);ok=ok&&sqlite3_step(copy)==SQLITE_DONE;sqlite3_finalize(copy);
        sqlite3_stmt *rulesCopy=nullptr;sqlite3_prepare_v2(db,"INSERT INTO answer_rules(form_version_id,id,rule_type,question_ids_json,rule_json) SELECT ?,id,rule_type,question_ids_json,rule_json FROM answer_rules WHERE form_version_id=?",-1,&rulesCopy,nullptr);sqlite3_bind_text(rulesCopy,1,versionId.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(rulesCopy,2,oldVersion.c_str(),-1,SQLITE_TRANSIENT);ok=ok&&sqlite3_step(rulesCopy)==SQLITE_DONE;sqlite3_finalize(rulesCopy);
        for (size_t i = 0; ok && i < items.array.size(); ++i)
        {
            const Json &q = items.array[i];
            std::string base=text(q.get("id")),id=base+"_v"+std::to_string(nextVersion),th=text(q.get("text")),en=text(q.get("text_en")),answerType=text(q.get("answer_type"));
            if(base.empty()||th.empty()||answerType.empty()){ok=false;break;}
            static const std::set<std::string> types={"rating5","dropdown","radio","checkbox","short_text","long_text","number","date","yes_no","ranking"};if(!types.count(answerType)){ok=false;break;}
            std::string section=text(q.get("section"));if(section.empty())section=kind;std::string group=text(q.get("indicator_group"));if(group.empty())group="specific";if(group!="specific"){ok=false;break;}
            std::string options=raw(q.get("options"));if(q.get("options").type==Json::Null)options="[]";std::string roles=raw(q.get("roles"));if(q.get("roles").type==Json::Null)roles="[]";std::string visible=raw(q.get("visible_when"));if(q.get("visible_when").type==Json::Null)visible="{\"all\":[]}";std::string metadata=q.get("metadata").type==Json::Null?"{}":raw(q.get("metadata"));
            int step=(int)q.get("step").number(3),order=(int)q.get("order").number((double)i+1);
            sqlite3_stmt *ins=nullptr;sqlite3_prepare_v2(db,"INSERT INTO assessment_questions(id,system_id,assessment_type,section,text,text_en,answer_type,options_json,required,is_scored,indicator_group,step,question_order,roles_json,visible_when_json,allow_na,allow_other,max_select,option_set_ref,metadata_json,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",-1,&ins,nullptr);
            sqlite3_bind_text(ins,1,id.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(ins,2,system.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(ins,3,kind.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(ins,4,section.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(ins,5,th.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(ins,6,en.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(ins,7,answerType.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(ins,8,options.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_int(ins,9,q.get("required").type==Json::Bool&&q.get("required").value=="false"?0:1);sqlite3_bind_int(ins,10,q.get("is_scored").type==Json::Bool&&q.get("is_scored").value=="true"?1:0);sqlite3_bind_text(ins,11,group.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_int(ins,12,step);sqlite3_bind_int(ins,13,order);sqlite3_bind_text(ins,14,roles.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(ins,15,visible.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_int(ins,16,q.get("allow_na").type==Json::Bool&&q.get("allow_na").value=="true");sqlite3_bind_int(ins,17,q.get("allow_other").type==Json::Bool&&q.get("allow_other").value=="true");if(q.get("max_select").type==Json::Number)sqlite3_bind_int(ins,18,(int)q.get("max_select").number());else sqlite3_bind_null(ins,18);std::string optionSet=text(q.get("optionSetRef"));if(optionSet.empty())sqlite3_bind_null(ins,19);else sqlite3_bind_text(ins,19,optionSet.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(ins,20,metadata.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_int(ins,21,q.get("active").type==Json::Bool&&q.get("active").value=="false"?0:1);ok=sqlite3_step(ins)==SQLITE_DONE;sqlite3_finalize(ins);
            if(ok){sqlite3_stmt *link=nullptr;sqlite3_prepare_v2(db,"INSERT INTO form_version_questions(form_version_id,question_id,step,sort_order) VALUES(?,?,?,?)",-1,&link,nullptr);sqlite3_bind_text(link,1,versionId.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(link,2,id.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_int(link,3,step);sqlite3_bind_int(link,4,10000+order);ok=sqlite3_step(link)==SQLITE_DONE;sqlite3_finalize(link);}
        }
        if(ok){sqlite3_stmt *up=nullptr;sqlite3_prepare_v2(db,"UPDATE assessment_forms SET current_version_id=? WHERE id=?",-1,&up,nullptr);sqlite3_bind_text(up,1,versionId.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(up,2,formId.c_str(),-1,SQLITE_TRANSIENT);ok=sqlite3_step(up)==SQLITE_DONE;sqlite3_finalize(up);}
        if (!ok || !exec(db, "COMMIT"))
        {
            exec(db, "ROLLBACK");
            status = 500;
            return errorJson("question update failed");
        }
        status = 200;
        return "{\"success\":true}";
    }
    if (method == "POST" && route == "/questions/replace-core")
    {
        std::string uid, u, d, r;
        if (!adminSession(db, token, uid, u, d, r, status))
            return errorJson(status == 401 ? "login required" : "ไม่มีสิทธิ์เข้าถึง Admin");
        Json j = Parser(body).parse();
        const std::string kind = text(j.get("assessmentType"));
        const Json &items = j.get("questions");
        if ((kind != "effectiveness" && kind != "satisfaction") || items.type != Json::Array)
        {
            status = 400;
            return errorJson("assessmentType and questions are required");
        }
        struct CoreForm { std::string id, current; int next; };
        std::vector<CoreForm> forms;
        sqlite3_stmt *formQuery = nullptr;
        const char *formSql = "SELECT f.id,f.current_version_id,COALESCE(MAX(v.version_number),0)+1 FROM assessment_forms f LEFT JOIN form_versions v ON v.form_id=f.id WHERE f.assessment_type=? AND f.active=1 GROUP BY f.id ORDER BY f.system_id";
        if (sqlite3_prepare_v2(db, formSql, -1, &formQuery, nullptr) != SQLITE_OK)
        { status = 500; return errorJson("form query failed"); }
        sqlite3_bind_text(formQuery, 1, kind.c_str(), -1, SQLITE_TRANSIENT);
        while (sqlite3_step(formQuery) == SQLITE_ROW) forms.push_back({col(formQuery, 0), col(formQuery, 1), sqlite3_column_int(formQuery, 2)});
        sqlite3_finalize(formQuery);
        if (forms.empty()) { status = 404; return errorJson("no active forms for assessment type"); }
        if (!exec(db, "BEGIN IMMEDIATE")) { status = 500; return errorJson("database transaction failed"); }
        bool ok = true;
        const std::string stamp = std::to_string(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count());
        std::vector<std::tuple<std::string, int, int>> coreLinks;
        for (size_t i = 0; ok && i < items.array.size(); ++i)
        {
            const Json &q = items.array[i];
            const std::string base = text(q.get("baseId")).empty() ? text(q.get("id")) : text(q.get("baseId"));
            const std::string questionId = base + "_core_" + stamp;
            const std::string th = text(q.get("text")), en = text(q.get("text_en")), answerType = text(q.get("answer_type"));
            const std::string section = text(q.get("section")), options = q.get("options").type == Json::Null ? "[]" : raw(q.get("options"));
            const std::string roles = q.get("roles").type == Json::Null ? "[]" : raw(q.get("roles"));
            const std::string visible = q.get("visible_when").type == Json::Null ? "{\"all\":[]}" : raw(q.get("visible_when"));
            const std::string metadata = q.get("metadata").type == Json::Null ? "{}" : raw(q.get("metadata"));
            static const std::set<std::string> types = {"rating5","dropdown","radio","checkbox","short_text","long_text","number","date","yes_no","ranking"};
            if (base.empty() || th.empty() || !types.count(answerType)) { ok = false; break; }
            sqlite3_stmt *insert = nullptr;
            const char *sql = "INSERT INTO assessment_questions(id,system_id,assessment_type,section,text,text_en,answer_type,options_json,required,is_scored,indicator_group,step,question_order,roles_json,visible_when_json,allow_na,allow_other,max_select,option_set_ref,metadata_json,active) VALUES(?,NULL,?,?,?,?,?,?,?,?, 'core',?,?,?,?,?,?,?,?,?,?)";
            if (sqlite3_prepare_v2(db, sql, -1, &insert, nullptr) != SQLITE_OK) { ok = false; break; }
            sqlite3_bind_text(insert, 1, questionId.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(insert, 2, kind.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(insert, 3, section.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(insert, 4, th.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(insert, 5, en.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(insert, 6, answerType.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(insert, 7, options.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_int(insert, 8, q.get("required").type == Json::Bool && q.get("required").value == "false" ? 0 : 1);
            sqlite3_bind_int(insert, 9, q.get("is_scored").type == Json::Bool && q.get("is_scored").value == "true" ? 1 : 0);
            sqlite3_bind_int(insert, 10, (int)q.get("step").number(3));
            sqlite3_bind_int(insert, 11, (int)q.get("order").number((double)i + 1));
            sqlite3_bind_text(insert, 12, roles.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(insert, 13, visible.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_int(insert, 14, q.get("allow_na").type == Json::Bool && q.get("allow_na").value == "true");
            sqlite3_bind_int(insert, 15, q.get("allow_other").type == Json::Bool && q.get("allow_other").value == "true");
            if (q.get("max_select").type == Json::Number) sqlite3_bind_int(insert, 16, (int)q.get("max_select").number()); else sqlite3_bind_null(insert, 16);
            sqlite3_bind_text(insert, 17, text(q.get("optionSetRef")).c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(insert, 18, metadata.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_int(insert, 19, q.get("active").type == Json::Bool && q.get("active").value == "false" ? 0 : 1);
            ok = sqlite3_step(insert) == SQLITE_DONE;
            sqlite3_finalize(insert);
            coreLinks.emplace_back(questionId, (int)q.get("step").number(3), (int)q.get("order").number((double)i + 1));
        }
        for (const auto &form : forms)
        {
            if (!ok) break;
            const std::string versionId = form.id + "_v" + std::to_string(form.next);
            sqlite3_stmt *version = nullptr;
            const char *versionSql = "INSERT INTO form_versions(id,form_id,version_number,status,content_hash,created_at) VALUES(?,?,?,'published','admin-core-update','2026-11-12T00:00:00Z')";
            sqlite3_prepare_v2(db, versionSql, -1, &version, nullptr);
            sqlite3_bind_text(version, 1, versionId.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(version, 2, form.id.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_int(version, 3, form.next);
            ok = sqlite3_step(version) == SQLITE_DONE;
            sqlite3_finalize(version);
            if (!ok) break;
            sqlite3_stmt *copy = nullptr;
            sqlite3_prepare_v2(db, "INSERT INTO form_version_questions(form_version_id,question_id,step,sort_order) SELECT ?,q.id,fq.step,fq.sort_order FROM form_version_questions fq JOIN assessment_questions q ON q.id=fq.question_id WHERE fq.form_version_id=? AND q.indicator_group='specific'", -1, &copy, nullptr);
            sqlite3_bind_text(copy, 1, versionId.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(copy, 2, form.current.c_str(), -1, SQLITE_TRANSIENT);
            ok = sqlite3_step(copy) == SQLITE_DONE;
            sqlite3_finalize(copy);
            if (!ok) break;
            sqlite3_stmt *rules = nullptr;
            sqlite3_prepare_v2(db, "INSERT INTO answer_rules(form_version_id,id,rule_type,question_ids_json,rule_json) SELECT ?,id,rule_type,question_ids_json,rule_json FROM answer_rules WHERE form_version_id=?", -1, &rules, nullptr);
            sqlite3_bind_text(rules, 1, versionId.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(rules, 2, form.current.c_str(), -1, SQLITE_TRANSIENT);
            ok = sqlite3_step(rules) == SQLITE_DONE;
            sqlite3_finalize(rules);
            for (size_t i = 0; ok && i < coreLinks.size(); ++i)
            {
                const auto &[questionId, step, order] = coreLinks[i];
                sqlite3_stmt *link = nullptr;
                sqlite3_prepare_v2(db, "INSERT INTO form_version_questions(form_version_id,question_id,step,sort_order) VALUES(?,?,?,?)", -1, &link, nullptr);
                sqlite3_bind_text(link, 1, versionId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(link, 2, questionId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_int(link, 3, step);
                sqlite3_bind_int(link, 4, 10000 + order);
                ok = sqlite3_step(link) == SQLITE_DONE;
                sqlite3_finalize(link);
            }
            sqlite3_stmt *update = nullptr;
            if (ok)
            {
                sqlite3_prepare_v2(db, "UPDATE assessment_forms SET current_version_id=? WHERE id=?", -1, &update, nullptr);
                sqlite3_bind_text(update, 1, versionId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(update, 2, form.id.c_str(), -1, SQLITE_TRANSIENT);
                ok = sqlite3_step(update) == SQLITE_DONE;
            }
            if (update) sqlite3_finalize(update);
        }
        if (!ok || !exec(db, "COMMIT"))
        {
            exec(db, "ROLLBACK");
            status = 500;
            return errorJson("core question update failed");
        }
        status = 200;
        return "{\"success\":true}";
    }
    if (method == "POST" && route == "/evaluations")
    {
        Json j = Parser(body).parse();
        std::string sys=text(j.get("systemId")), kind=text(j.get("assessmentType")), version=text(j.get("formVersionId")), respondent=text(j.get("respondentRole"));
        const Json &answers=j.get("answers");
        if (j.type != Json::Object || sys.empty() || version.empty() || respondent.empty() || answers.type!=Json::Array || (kind!="effectiveness" && kind!="satisfaction"))
        {
            status = 400; return errorJson("systemId, assessmentType, formVersionId, respondentRole, and answers are required");
        }
        std::string uid, u, d, role;
        if (!sessionUser(db, token, uid, u, d, role))
        {
            status = 401;
            return errorJson("กรุณาเข้าสู่ระบบก่อนส่งแบบประเมิน");
        }
        std::map<std::string,Json> submitted;
        for(const auto &a:answers.array){ std::string qid=text(a.get("questionId")); if(qid.empty() || !a.get("value").type){status=400;return errorJson("each answer needs questionId and value");} submitted[qid]=a.get("value"); }
        if (!exec(db, "BEGIN IMMEDIATE"))
        {
            status = 500;
            return errorJson("database transaction failed");
        }
        sqlite3_stmt *check=nullptr;
        sqlite3_prepare_v2(db,"SELECT s.name,v.form_id FROM form_versions v JOIN assessment_forms f ON f.id=v.form_id JOIN systems s ON s.id=f.system_id WHERE v.id=? AND f.system_id=? AND f.assessment_type=? AND f.active=1 AND v.status='published'",-1,&check,nullptr);
        sqlite3_bind_text(check,1,version.c_str(),-1,SQLITE_TRANSIENT); sqlite3_bind_text(check,2,sys.c_str(),-1,SQLITE_TRANSIENT); sqlite3_bind_text(check,3,kind.c_str(),-1,SQLITE_TRANSIENT);
        std::string sysName; bool versionOk=sqlite3_step(check)==SQLITE_ROW; if(versionOk) sysName=col(check,0); sqlite3_finalize(check);
        if(!versionOk){exec(db,"ROLLBACK");status=400;return errorJson("form version does not match the requested system and assessment type");}
        sqlite3_stmt *formq=nullptr;
        sqlite3_prepare_v2(db,"SELECT q.id,q.text,q.answer_type,q.options_json,q.required,q.is_scored,q.allow_na,q.roles_json,q.visible_when_json,q.allow_other,q.max_select,q.option_set_ref FROM form_version_questions fq JOIN assessment_questions q ON q.id=fq.question_id WHERE fq.form_version_id=? AND q.active=1 ORDER BY fq.sort_order",-1,&formq,nullptr);
        sqlite3_bind_text(formq,1,version.c_str(),-1,SQLITE_TRANSIENT);
        sqlite3_stmt *trackq=nullptr;sqlite3_prepare_v2(db,"SELECT has_tracking FROM systems WHERE id=?",-1,&trackq,nullptr);sqlite3_bind_text(trackq,1,sys.c_str(),-1,SQLITE_TRANSIENT);bool hasTracking=sqlite3_step(trackq)==SQLITE_ROW&&sqlite3_column_int(trackq,0);sqlite3_finalize(trackq);
        std::map<std::string,std::string> meta; std::set<std::string> visibleIds; bool validationOk=true; std::string validationError="invalid or missing answer";
        while(sqlite3_step(formq)==SQLITE_ROW){std::string qid=col(formq,0),atype=col(formq,2); meta[qid]=atype; auto it=submitted.find(qid);
            Json visible=Parser(col(formq,8)).parse();bool isVisible=conditionPass(visible,submitted,sys,hasTracking);if(!isVisible){if(it!=submitted.end()){validationOk=false;validationError="answer supplied for a hidden question";break;}continue;}
            Json roles=Parser(col(formq,7)).parse(); bool roleAllowed=true;if(roles.type==Json::Array && !roles.array.empty()){roleAllowed=false;for(const auto &rj:roles.array)if(text(rj)==respondent)roleAllowed=true;}if(!roleAllowed){if(it!=submitted.end()){validationOk=false;validationError="question is not available to this respondent role";break;}continue;}visibleIds.insert(qid);
            if(it==submitted.end()){if(sqlite3_column_int(formq,4)){validationOk=false;validationError="required answer missing";break;}continue;}
            const Json &v=it->second; bool na=(v.type==Json::String && v.value=="N/A"); if(na && !sqlite3_column_int(formq,6)){validationOk=false;break;}
            if(atype=="rating5" && !na && !(v.type==Json::Number && v.number()>=1 && v.number()<=5)){validationOk=false;break;}
            const Json &selectedValue=v.type==Json::Object?(v.get("values").type!=Json::Null?v.get("values"):v.get("value")):v;
            if((atype=="radio"||atype=="dropdown") && selectedValue.type!=Json::String){validationOk=false;break;}
            if((atype=="checkbox"||atype=="ranking") && selectedValue.type!=Json::Array){validationOk=false;break;}
            if((atype=="short_text"||atype=="long_text"||atype=="date") && v.type!=Json::String){validationOk=false;break;}
            if(atype=="number" && v.type!=Json::Number){validationOk=false;break;}
            if(atype=="yes_no" && !(v.type==Json::Bool||(v.type==Json::String&&(v.value=="yes"||v.value=="no")))){validationOk=false;break;}
            Json opts=Parser(col(formq,3)).parse();if(opts.type!=Json::Array||opts.array.empty()){const Json &roleAnswer=submitted.count("respondent_role")?submitted.at("respondent_role"):Json();opts=optionSetValues(db,col(formq,11),sys,text(roleAnswer),respondent);}
            if(atype=="radio"||atype=="dropdown"||atype=="checkbox"||atype=="ranking") {std::vector<Json> vals=selectedValue.type==Json::Array?selectedValue.array:std::vector<Json>{selectedValue};if(sqlite3_column_type(formq,10)!=SQLITE_NULL&&(int)vals.size()>sqlite3_column_int(formq,10)){validationOk=false;break;}bool otherSelected=false;for(const auto &selected:vals){bool found=false,optionAllowsOther=false;if(opts.type==Json::Array)for(const auto &op:opts.array)if(text(op.get("value"))==text(selected)){found=true;optionAllowsOther=op.get("allow_other").type==Json::Bool&&op.get("allow_other").value=="true";}if(!found){validationOk=false;break;}otherSelected=otherSelected||optionAllowsOther;}if(!validationOk)break;if(v.type==Json::Object){if(!sqlite3_column_int(formq,9)||!otherSelected||text(v.get("otherText")).empty()){validationOk=false;break;}}else if(otherSelected){validationOk=false;break;}}
            if(!validationOk)break;
        }
        sqlite3_finalize(formq);
        if(!validationOk){exec(db,"ROLLBACK");status=400;return errorJson(validationError);}
        for(const auto &entry:submitted)if(!meta.count(entry.first)){exec(db,"ROLLBACK");status=400;return errorJson("answer question is not in the submitted form version");}
        sqlite3_stmt *ruleq=nullptr;sqlite3_prepare_v2(db,"SELECT rule_type,rule_json FROM answer_rules WHERE form_version_id=?",-1,&ruleq,nullptr);sqlite3_bind_text(ruleq,1,version.c_str(),-1,SQLITE_TRANSIENT);while(sqlite3_step(ruleq)==SQLITE_ROW){if(col(ruleq,0)!="mutually_exclusive")continue;Json rule=Parser(col(ruleq,1)).parse();const Json &ids=rule.get("question_ids"),&exclusive=rule.get("exclusive_option_values");if(ids.type!=Json::Array||exclusive.type!=Json::Array)continue;for(const auto &qidj:ids.array){auto it=submitted.find(text(qidj));if(it==submitted.end())continue;const Json &selected=it->second.type==Json::Object?it->second.get("values"):it->second;if(selected.type!=Json::Array)continue;bool picked=false;for(const auto &answer:selected.array)for(const auto &x:exclusive.array)if(raw(answer)==raw(x))picked=true;if(picked&&selected.array.size()>1){sqlite3_finalize(ruleq);exec(db,"ROLLBACK");status=400;return errorJson("mutually exclusive answers were selected together");}}}sqlite3_finalize(ruleq);
        std::string id = text(j.get("id")); if (id.empty()) id = "eval_" + std::to_string(GetTickCount64());
        std::string submittedAt=text(j.get("submittedAt")); if(submittedAt.empty()) submittedAt="2026-11-12T00:00:00Z";
        sqlite3_stmt *q = nullptr;
        const char *sql = "INSERT INTO evaluations(id,system_id,system_name,assessment_type,form_version_id,evaluator_id,respondent_role,respondent_role_label,profile_json,is_mock,submitted_at) VALUES(?,?,?,?,?,?,?,?,?,0,?)";
        bool ok = sqlite3_prepare_v2(db, sql, -1, &q, nullptr) == SQLITE_OK;
        if (ok)
        {
            sqlite3_bind_text(q, 1, id.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(q,2,sys.c_str(),-1,SQLITE_TRANSIENT); sqlite3_bind_text(q,3,sysName.c_str(),-1,SQLITE_TRANSIENT); sqlite3_bind_text(q,4,kind.c_str(),-1,SQLITE_TRANSIENT); sqlite3_bind_text(q,5,version.c_str(),-1,SQLITE_TRANSIENT); sqlite3_bind_text(q,6,uid.c_str(),-1,SQLITE_TRANSIENT); sqlite3_bind_text(q,7,respondent.c_str(),-1,SQLITE_TRANSIENT); std::string respondentLabel=text(j.get("respondentRoleLabel")); sqlite3_bind_text(q,8,respondentLabel.c_str(),-1,SQLITE_TRANSIENT); std::string profile=raw(j.get("profile"));sqlite3_bind_text(q,9,profile.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(q,10,submittedAt.c_str(),-1,SQLITE_TRANSIENT);
            ok = sqlite3_step(q) == SQLITE_DONE;
        }
        sqlite3_finalize(q);
        for(const auto &entry:submitted){ if(!ok)break; sqlite3_stmt *find=nullptr; sqlite3_prepare_v2(db,"SELECT text,is_scored,allow_na FROM assessment_questions WHERE id=?",-1,&find,nullptr);sqlite3_bind_text(find,1,entry.first.c_str(),-1,SQLITE_TRANSIENT);bool got=sqlite3_step(find)==SQLITE_ROW;std::string qtext=got?col(find,0):"";bool scored=got&&sqlite3_column_int(find,1);bool allowNa=got&&sqlite3_column_int(find,2);sqlite3_finalize(find);const Json &v=entry.second;bool na=(v.type==Json::String&&v.value=="N/A");double score=(scored&&meta[entry.first]=="rating5"&&!na)?v.number():0;sqlite3_stmt *ins=nullptr;sqlite3_prepare_v2(db,"INSERT INTO evaluation_answers(evaluation_id,question_id,question_text,answer_type,answer_json,score_value,is_na) VALUES(?,?,?,?,?,?,?)",-1,&ins,nullptr);sqlite3_bind_text(ins,1,id.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(ins,2,entry.first.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(ins,3,qtext.c_str(),-1,SQLITE_TRANSIENT);sqlite3_bind_text(ins,4,meta[entry.first].c_str(),-1,SQLITE_TRANSIENT);std::string value=raw(v);sqlite3_bind_text(ins,5,value.c_str(),-1,SQLITE_TRANSIENT);if(score>0)sqlite3_bind_double(ins,6,score);else sqlite3_bind_null(ins,6);sqlite3_bind_int(ins,7,na&&allowNa);ok=sqlite3_step(ins)==SQLITE_DONE;sqlite3_finalize(ins);}
        if (!ok || !exec(db, "COMMIT"))
        {
            exec(db, "ROLLBACK");
            status = 500;
            return errorJson("database write failed");
        }
        status = 201;
        return "{\"id\":" + quote(id) + ",\"success\":true}";
    }
    if (method == "DELETE" && route == "/evaluations")
    {
        std::string uid, u, d, r;
        if (!adminSession(db, token, uid, u, d, r, status))
            return errorJson(status == 401 ? "login required" : "ไม่มีสิทธิ์เข้าถึง Admin");
        if (!exec(db, "BEGIN IMMEDIATE") || !exec(db, "DELETE FROM evaluations") || !exec(db, "COMMIT"))
        {
            exec(db, "ROLLBACK");
            status = 500;
            return errorJson("database clear failed");
        }
        status = 200;
        return "{\"success\":true}";
    }
    if (method == "GET" && route == "/evaluations")
    {
        std::string uid, u, d, r;
        if (!adminSession(db, token, uid, u, d, r, status))
            return errorJson(status == 401 ? "login required" : "ไม่มีสิทธิ์เข้าถึง Admin");
        sqlite3_stmt *q = nullptr;
        const char *sql = "SELECT e.id,e.system_id,e.system_name,e.assessment_type,e.form_version_id,e.evaluator_id,e.respondent_role,e.respondent_role_label,e.profile_json,e.is_mock,e.submitted_at FROM evaluations e ORDER BY e.submitted_at DESC";
        if (sqlite3_prepare_v2(db, sql, -1, &q, nullptr) != SQLITE_OK)
        {
            status = 500;
            return errorJson("database query failed");
        }
        std::string o = "[";
        bool first = true;
        while (sqlite3_step(q) == SQLITE_ROW)
        {
            if (!first)
                o += ',';
            first = false;
            std::string eid=col(q,0), answers="[";
            sqlite3_stmt *a=nullptr;
            sqlite3_prepare_v2(db,"SELECT question_id,question_text,answer_type,answer_json,score_value,is_na FROM evaluation_answers WHERE evaluation_id=? ORDER BY id",-1,&a,nullptr);
            sqlite3_bind_text(a,1,eid.c_str(),-1,SQLITE_TRANSIENT);
            bool fa=true;
            while(sqlite3_step(a)==SQLITE_ROW){ if(!fa) answers+=','; fa=false; answers+="{\"questionId\":"+quote(col(a,0))+",\"questionText\":"+quote(col(a,1))+",\"answerType\":"+quote(col(a,2))+",\"value\":"+raw(Parser(col(a,3)).parse())+",\"scoreValue\":"+(sqlite3_column_type(a,4)==SQLITE_NULL?"null":std::to_string(sqlite3_column_double(a,4)))+",\"isNa\":"+(sqlite3_column_int(a,5)?"true":"false")+"}"; }
            sqlite3_finalize(a); answers+="]";
            o += "{\"id\":"+quote(eid)+",\"systemId\":"+quote(col(q,1))+",\"systemName\":"+quote(col(q,2))+",\"assessmentType\":"+quote(col(q,3))+",\"formVersionId\":"+quote(col(q,4))+",\"evaluatorId\":"+quote(col(q,5))+",\"respondentRole\":"+quote(col(q,6))+",\"respondentRoleLabel\":"+quote(col(q,7))+",\"profile\":"+raw(Parser(col(q,8)).parse())+",\"isMock\":"+(sqlite3_column_int(q,9)?"true":"false")+",\"submittedAt\":"+quote(col(q,10))+",\"answers\":"+answers+"}";
        }
        sqlite3_finalize(q);
        status = 200;
        return o + "]";
    }
    status = 404;
    return errorJson("not found");
}
static bool initialize(sqlite3 *db)
{
    sqlite3_stmt *versionQuery = nullptr;
    int userVersion = 0;
    if (sqlite3_prepare_v2(db, "PRAGMA user_version", -1, &versionQuery, nullptr) == SQLITE_OK && sqlite3_step(versionQuery) == SQLITE_ROW)
        userVersion = sqlite3_column_int(versionQuery, 0);
    if (versionQuery)
        sqlite3_finalize(versionQuery);
    sqlite3_stmt *tableQuery = nullptr;
    bool hasVersionedForms = false;
    if (sqlite3_prepare_v2(db, "SELECT 1 FROM sqlite_master WHERE type='table' AND name='assessment_forms'", -1, &tableQuery, nullptr) == SQLITE_OK)
        hasVersionedForms = sqlite3_step(tableQuery) == SQLITE_ROW;
    if (tableQuery)
        sqlite3_finalize(tableQuery);
    if (userVersion != 2 || !hasVersionedForms)
    {
        const char *resetOldSchema = "PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;"
                                     "DROP TABLE IF EXISTS evaluation_answers;"
                                     "DROP TABLE IF EXISTS assessment_answers;"
                                     "DROP TABLE IF EXISTS evaluations;"
                                     "DROP TABLE IF EXISTS answer_rules;"
                                     "DROP TABLE IF EXISTS form_version_questions;"
                                     "DROP TABLE IF EXISTS form_versions;"
                                     "DROP TABLE IF EXISTS assessment_forms;"
                                     "DROP TABLE IF EXISTS assessment_questions;"
                                     "DROP TABLE IF EXISTS option_sets;"
                                     "DROP TABLE IF EXISTS quantitative_records;"
                                     "DROP TABLE IF EXISTS satisfactions;"
                                     "DROP TABLE IF EXISTS auth_sessions;"
                                     "DROP TABLE IF EXISTS schema_migrations;"
                                     "DROP TABLE IF EXISTS systems;"
                                     "DROP TABLE IF EXISTS users;"
                                     "PRAGMA user_version=0; COMMIT; PRAGMA foreign_keys=ON;";
        if (!exec(db, resetOldSchema))
            return false;
    }
    std::ifstream f("database/schema.sql");
    if (!f)
    {
        std::cerr << "Cannot read database/schema.sql (run from project root)\n";
        return false;
    }
    std::stringstream schema;
    schema << f.rdbuf();
    if (!exec(db, schema.str()))
        return false;
    std::ifstream seed("database/seed.sql");
    if (seed)
    {
        std::stringstream data;
        data << seed.rdbuf();
        if (!exec(db, data.str()))
            return false;
    }
    std::ifstream questions("database/questions_seed.sql");
    if (!questions)
    {
        std::cerr << "Cannot read database/questions_seed.sql\n";
        return false;
    }
    std::stringstream questionData;
    questionData << questions.rdbuf();
    if (!exec(db, questionData.str()))
        return false;
    return true;
}
static void client(SOCKET sock, sqlite3 *db)
{
    DWORD timeout = 3000;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char *)&timeout, sizeof timeout);
    setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, (const char *)&timeout, sizeof timeout);
    std::string req;
    char buf[8192];
    int n;
    size_t headerEnd = std::string::npos, contentLength = 0;
    bool complete = false;
    while ((n = recv(sock, buf, sizeof buf, 0)) > 0)
    {
        req.append(buf, n);
        if (headerEnd == std::string::npos)
        {
            headerEnd = req.find("\r\n\r\n");
            if (headerEnd != std::string::npos)
            {
                std::string headers = req.substr(0, headerEnd), lowerHeaders = headers;
                std::transform(lowerHeaders.begin(), lowerHeaders.end(), lowerHeaders.begin(), [](unsigned char c)
                               { return (char)std::tolower(c); });
                size_t h = lowerHeaders.find("content-length:");
                if (h != std::string::npos)
                    contentLength = std::strtoul(lowerHeaders.c_str() + h + 15, nullptr, 10);
            }
        }
        if (headerEnd != std::string::npos && req.size() >= headerEnd + 4 + contentLength)
        {
            complete = true;
            break;
        }
    }
    if (!complete)
    {
        std::cerr << "Incomplete HTTP request; closing stalled connection\n";
        closesocket(sock);
        return;
    }
    std::istringstream first(req.substr(0, req.find("\r\n")));
    std::string method, path, version;
    first >> method >> path >> version;
    std::string body = req.substr(headerEnd + 4, contentLength), token, headers = req.substr(0, headerEnd), lowerHeaders = headers;
    std::transform(lowerHeaders.begin(), lowerHeaders.end(), lowerHeaders.begin(), [](unsigned char c)
                   { return (char)std::tolower(c); });
    size_t a = lowerHeaders.find("authorization:");
    if (a != std::string::npos)
    {
        size_t v = a + 15;
        while (v < headers.size() && headers[v] == ' ')
            ++v;
        if (lowerHeaders.compare(v, 7, "bearer ") == 0)
        {
            size_t e = headers.find("\r\n", v);
            token = headers.substr(v + 7, e == std::string::npos ? e : e - v - 7);
        }
    }
    int status = 200;
    std::string out = handle(db, method, path, body, token, status);
    std::string label = status == 200 ? "OK" : status == 201 ? "Created"
                                           : status == 400   ? "Bad Request"
                                           : status == 401   ? "Unauthorized"
                                           : status == 403   ? "Forbidden"
                                           : status == 404   ? "Not Found"
                                           : status == 409   ? "Conflict"
                                           : status == 410   ? "Gone"
                                                             : "Internal Server Error";
    std::string resp;
    if (method == "OPTIONS")
        resp = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, Authorization\r\nConnection: close\r\nContent-Length: 0\r\n\r\n";
    else
        resp = "HTTP/1.1 " + std::to_string(status) + " " + label + "\r\nContent-Type: application/json; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, Authorization\r\nConnection: close\r\nContent-Length: " + std::to_string(out.size()) + "\r\n\r\n" + out;
    size_t sent = 0;
    while (sent < resp.size())
    {
        int count = send(sock, resp.data() + sent, (int)(resp.size() - sent), 0);
        if (count <= 0)
            break;
        sent += (size_t)count;
    }
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
    if (!initialize(db))
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

#pragma once

#include <winsock2.h>
#include <sqlite3.h>
#include <string>

std::string handle(sqlite3* db, const std::string& method, const std::string& path,
                   const std::string& body, const std::string& token, int& status);
bool initialize(sqlite3* db);
void client(SOCKET sock, sqlite3* db);

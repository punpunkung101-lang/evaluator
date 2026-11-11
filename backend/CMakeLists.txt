cmake_minimum_required(VERSION 3.16)
project(evaluator_backend LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
find_package(SQLite3 REQUIRED)
add_executable(evaluator_backend src/main.cpp src/http_server.cpp)
target_link_libraries(evaluator_backend PRIVATE SQLite3::SQLite3 ws2_32 bcrypt)
set(EVALUATOR_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}" CACHE PATH
    "Directory for evaluator_backend.exe (defaults to backend/)")
set_target_properties(evaluator_backend PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${EVALUATOR_OUTPUT_DIRECTORY}"
)

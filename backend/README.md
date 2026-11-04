# Evaluator Project --- Setup & Run Guide

# คู่มือการติดตั้งและใช้งานโปรเจกต์ Evaluator

เอกสารนี้อธิบายการเตรียมเครื่องและการรัน **C++ Backend (SQLite)** บน Windows
หลังจาก Clone หรือ Download โปรเจกต์จาก GitHub

This guide explains how to set up and run the **C++ Backend (SQLite)**
on Windows after cloning or downloading this project from GitHub.

------------------------------------------------------------------------

## ภาษาไทย

### 1. สิ่งที่ต้องติดตั้ง

เตรียมเครื่อง Windows และติดตั้งเครื่องมือต่อไปนี้

1.  **Git** --- สำหรับ Clone โปรเจกต์จาก GitHub
    -   ดาวน์โหลด: <https://git-scm.com/downloads>
2.  **MSYS2** --- ใช้ติดตั้ง Compiler และ SQLite development library
    -   ดาวน์โหลด: <https://www.msys2.org/>
3.  **CMake** --- จำเป็นเฉพาะกรณีเลือก Build ด้วย CMake
    -   ดาวน์โหลด: <https://cmake.org/download/>

> วิธีที่แนะนำในคู่มือนี้คือใช้ MSYS2 UCRT64 และ Build ด้วย `g++` โดยตรง
> ซึ่งไม่จำเป็นต้องติดตั้ง CMake

### 2. ติดตั้ง Compiler และ SQLite3 ผ่าน MSYS2

1.  เปิด **MSYS2 UCRT64** จาก Start Menu (ต้องเป็น UCRT64 ไม่ใช่ MSYS หรือ
    MinGW 32-bit)
2.  รันคำสั่ง:

``` bash
pacman -Syu
```

หากโปรแกรมแจ้งให้ปิดหน้าต่าง ให้ปิดแล้วเปิด MSYS2 UCRT64 ใหม่
จากนั้นรันคำสั่งอัปเดตอีกครั้งตามที่ระบบแนะนำ

3.  ติดตั้งเครื่องมือที่จำเป็น:

``` bash
pacman -S --needed mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-sqlite3 mingw-w64-ucrt-x86_64-pkgconf
```

4.  เพิ่มโฟลเดอร์นี้ใน Windows `PATH`:

``` text
C:\msys64\ucrt64\bin
```

5.  ปิดแล้วเปิด Terminal ใหม่ จากนั้นตรวจสอบ:

``` powershell
g++ --version
pkg-config --modversion sqlite3
```

ถ้าคำสั่งแสดงเวอร์ชัน แสดงว่าเครื่องมือหลักพร้อมใช้งาน

### 3. ดาวน์โหลดโปรเจกต์จาก GitHub

เปิด PowerShell หรือ Terminal แล้วเปลี่ยนไปยังโฟลเดอร์ที่ต้องการเก็บโปรเจกต์
จากนั้นรัน:

``` powershell
git clone <GITHUB_REPOSITORY_URL>
cd <REPOSITORY_FOLDER>
```

แทนที่ `<GITHUB_REPOSITORY_URL>` ด้วย URL ของ Repository และ
`<REPOSITORY_FOLDER>` ด้วยชื่อโฟลเดอร์ที่ได้จากการ Clone

หากดาวน์โหลดเป็น ZIP ให้แตกไฟล์ก่อน แล้วเปิด Terminal ที่โฟลเดอร์หลักของโปรเจกต์
ซึ่งควรมีโฟลเดอร์ `backend`, `database` และ `frontend`

### 4. Build Backend ด้วย g++ (วิธีแนะนำ)

ต้องรันคำสั่งจาก **โฟลเดอร์หลักของโปรเจกต์** ซึ่งเป็นโฟลเดอร์ที่มี `backend` และ
`database`

ตรวจสอบตำแหน่งปัจจุบัน:

``` powershell
pwd
```

ตรวจสอบว่า Compiler มองเห็น SQLite3:

``` powershell
pkg-config --cflags --libs sqlite3
```

จากนั้น Build:

``` powershell
g++ -std=c++17 backend/src/main.cpp -lsqlite3 -lws2_32 -lbcrypt -o backend/evaluator_backend.exe
```

ถ้า Build สำเร็จ จะได้ไฟล์:

``` text
backend/evaluator_backend.exe
```

หากพบข้อผิดพลาดเกี่ยวกับ `sqlite3.h` หรือ `-lsqlite3` ให้ตรวจสอบว่าเปิดใช้
`C:\msys64\ucrt64\bin` ใน PATH และติดตั้งแพ็กเกจ SQLite3 สำหรับ UCRT64 แล้ว

### 5. Run Backend

**สำคัญ:** ต้องรันจากโฟลเดอร์หลักของโปรเจกต์ ไม่ใช่จากโฟลเดอร์ `backend`
เพราะโปรแกรมใช้ path แบบ relative เพื่ออ่านไฟล์ฐานข้อมูลและ Schema

รัน:

``` powershell
.\backend\evaluator_backend.exe
```

เมื่อเริ่มทำงานสำเร็จ ควรเห็นข้อความใกล้เคียงกับ:

``` text
Evaluator C++ API listening on http://localhost:8080
Database: database/evaluator.db (shared users, systems and assessment records)
```

เปิด Terminal อีกหน้าต่างหนึ่งเพื่อทดสอบ API โดยปล่อยหน้าต่างที่รัน Backend เปิดค้างไว้

### 6. ทดสอบ Backend

เปิด Browser แล้วเข้า:

<http://localhost:8080/health>

ผลลัพธ์ที่คาดหวังคือ:

``` json
{"status":"ok"}
```

หรือใช้ PowerShell:

``` powershell
Invoke-RestMethod http://localhost:8080/health
```

Endpoint ที่ Backend รองรับ:

  Method   Endpoint         รายละเอียด
  -------- ---------------- ----------------------
  GET      `/health`        ตรวจสอบสถานะ Backend
  GET      `/evaluations`   อ่านรายการผลการประเมิน
  POST     `/evaluations`   บันทึกผลการประเมิน
  DELETE   `/evaluations`   ลบข้อมูลการประเมิน

Backend ใช้ Port `8080` เป็นค่าเริ่มต้น หากต้องการใช้ Port อื่น สามารถส่งหมายเลข
Port เป็น argument ได้ เช่น:

``` powershell
.\backend\evaluator_backend.exe 8081
```

จากนั้นทดสอบที่ `http://localhost:8081/health`

### 7. ฐานข้อมูล

เมื่อ Backend เริ่มทำงาน โปรแกรมจะเปิดหรือสร้างไฟล์:

``` text
database/evaluator.db
```

และนำคำสั่งจากไฟล์นี้ไปใช้เตรียมโครงสร้างฐานข้อมูล:

``` text
database/schema.sql
```

ควรรัน Backend จากโฟลเดอร์หลักของโปรเจกต์เสมอ เพื่อให้โปรแกรมหาไฟล์เหล่านี้เจอ

### 8. การ Build ด้วย CMake (ทางเลือก)

หากติดตั้ง CMake และมี SQLite3 development package ที่ CMake ค้นหาได้
ให้รันจากโฟลเดอร์หลัก:

``` powershell
cmake -S backend -B backend/build -G "MinGW Makefiles"
cmake --build backend/build
```

ไฟล์โปรแกรมที่ได้จะอยู่ในโฟลเดอร์ Build ตามการตั้งค่าของ CMake

### 9. การแก้ปัญหาเบื้องต้น

**ปัญหา: `g++` is not recognized**

-   ตรวจสอบว่าติดตั้ง MSYS2 UCRT64 แล้ว
-   เพิ่ม `C:\msys64\ucrt64\bin` ใน Windows `PATH`
-   ปิดและเปิด Terminal ใหม่

**ปัญหา: `pkg-config` หา SQLite3 ไม่พบ**

-   ตรวจสอบว่าติดตั้ง `mingw-w64-ucrt-x86_64-sqlite3` แล้ว
-   ตรวจสอบว่าใช้ Terminal จาก MSYS2 UCRT64 หรือ Windows Terminal ที่มี UCRT64
    อยู่ใน PATH

**ปัญหา: `sqlite3.h: No such file or directory` หรือ Linker หา SQLite3
ไม่พบ**

-   ตรวจสอบการติดตั้ง SQLite3 development package
-   รัน `pkg-config --cflags --libs sqlite3` เพื่อดู Include และ Library
    flags

**ปัญหา: `ERR_CONNECTION_REFUSED`**

-   ตรวจสอบว่า Backend ยังเปิดทำงานอยู่หรือไม่
-   ตรวจสอบว่าแสดงข้อความ Listening ที่ Port `8080` หรือ Port ที่กำหนด
-   ทดสอบ `http://localhost:8080/health`
-   หาก Backend ปิดไปแล้ว ให้เปิดใหม่จากโฟลเดอร์หลัก

**ปัญหา: `Cannot read database/schema.sql`**

-   สาเหตุที่พบบ่อยคือรันโปรแกรมจากโฟลเดอร์ผิด
-   กลับไปยังโฟลเดอร์หลักของโปรเจกต์ แล้วรัน `.\backend\evaluator_backend.exe`
    อีกครั้ง

------------------------------------------------------------------------

## English

### 1. Prerequisites

Prepare a Windows machine and install the following tools:

1.  **Git** --- to clone the repository.
    -   Download: <https://git-scm.com/downloads>
2.  **MSYS2** --- to install the compiler and SQLite development
    library.
    -   Download: <https://www.msys2.org/>
3.  **CMake** --- required only if you choose the CMake build method.
    -   Download: <https://cmake.org/download/>

> The recommended method in this guide is to use MSYS2 UCRT64 and
> compile directly with `g++`. CMake is optional for this method.

### 2. Install the compiler and SQLite3 with MSYS2

1.  Open **MSYS2 UCRT64** from the Start Menu. Make sure it is UCRT64,
    not the MSYS shell or 32-bit MinGW shell.
2.  Run:

``` bash
pacman -Syu
```

If the terminal asks you to close it, close and reopen MSYS2 UCRT64,
then run the update command again as instructed.

3.  Install the required packages:

``` bash
pacman -S --needed mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-sqlite3 mingw-w64-ucrt-x86_64-pkgconf
```

4.  Add this directory to the Windows `PATH`:

``` text
C:\msys64\ucrt64\bin
```

5.  Open a new terminal and verify the installation:

``` powershell
g++ --version
pkg-config --modversion sqlite3
```

Both commands should print version information.

### 3. Clone the repository

Open PowerShell or a terminal, navigate to the directory where you want
to store the project, and run:

``` powershell
git clone <GITHUB_REPOSITORY_URL>
cd <REPOSITORY_FOLDER>
```

Replace `<GITHUB_REPOSITORY_URL>` with the repository URL and
`<REPOSITORY_FOLDER>` with the folder created by Git.

If you downloaded a ZIP file, extract it first and open a terminal in
the project root. The root directory should contain `backend`,
`database`, and `frontend`.

### 4. Build the backend with g++ (recommended)

Run the command from the **project root** --- the directory containing
`backend` and `database`.

Check the current directory:

``` powershell
pwd
```

Check that SQLite3 is available:

``` powershell
pkg-config --cflags --libs sqlite3
```

Build the backend:

``` powershell
g++ -std=c++17 backend/src/main.cpp -lsqlite3 -lws2_32 -lbcrypt -o backend/evaluator_backend.exe
```

If the build succeeds, the executable will be created at:

``` text
backend/evaluator_backend.exe
```

If the compiler cannot find `sqlite3.h` or the linker cannot find
`-lsqlite3`, verify that `C:\msys64\ucrt64\bin` is in your PATH and that
the UCRT64 SQLite3 package is installed.

### 5. Run the backend

**Important:** Run the executable from the project root, not from the
`backend` directory. The program uses relative paths to access the
database and schema files.

Run:

``` powershell
.\backend\evaluator_backend.exe
```

On successful startup, you should see output similar to:

``` text
Evaluator C++ API listening on http://localhost:8080
Database: database/evaluator.db (shared users, systems and assessment records)
```

Keep this terminal open while the backend is running. Open a second
terminal window for testing.

### 6. Test the backend

Open this URL in a browser:

<http://localhost:8080/health>

Expected response:

``` json
{"status":"ok"}
```

You can also test it in PowerShell:

``` powershell
Invoke-RestMethod http://localhost:8080/health
```

Available API endpoints:

  Method   Endpoint         Description
  -------- ---------------- -----------------------------
  GET      `/health`        Check backend health
  GET      `/evaluations`   Retrieve evaluation records
  POST     `/evaluations`   Save an evaluation
  DELETE   `/evaluations`   Delete evaluation records

The default port is `8080`. To use a different port, pass it as the
first argument:

``` powershell
.\backend\evaluator_backend.exe 8081
```

Then test `http://localhost:8081/health`.

### 7. Database

At startup, the backend opens or creates:

``` text
database/evaluator.db
```

It applies the schema from:

``` text
database/schema.sql
```

Always launch the backend from the project root so these relative paths
resolve correctly.

### 8. Build with CMake (optional)

If CMake and a discoverable SQLite3 development package are installed,
run these commands from the project root:

``` powershell
cmake -S backend -B backend/build -G "MinGW Makefiles"
cmake --build backend/build
```

The executable will be placed in the CMake build directory according to
the project configuration.

### 9. Troubleshooting

**`g++` is not recognized**

-   Make sure MSYS2 UCRT64 is installed.
-   Add `C:\msys64\ucrt64\bin` to the Windows `PATH`.
-   Close and reopen the terminal.

**`pkg-config` cannot find SQLite3**

-   Make sure `mingw-w64-ucrt-x86_64-sqlite3` is installed.
-   Verify that UCRT64 is available in the terminal's PATH.

**`sqlite3.h: No such file or directory` or SQLite linker errors**

-   Verify that the SQLite3 development package is installed.
-   Run `pkg-config --cflags --libs sqlite3` to inspect the include and
    library flags.

**`ERR_CONNECTION_REFUSED`**

-   Make sure the backend process is still running.
-   Check that it reports listening on port `8080` (or the custom port
    you selected).
-   Test `http://localhost:8080/health`.
-   If the backend process has stopped, launch it again from the project
    root.

**`Cannot read database/schema.sql`**

-   This usually means the executable was launched from the wrong
    working directory.
-   Return to the project root and run `.\backend\evaluator_backend.exe`
    again.

------------------------------------------------------------------------

## Notes / หมายเหตุ

-   This guide covers building, running, and testing the C++ backend.
    The frontend setup is not specified here because its start command
    depends on the frontend files and configuration in the repository.
-   คู่มือนี้ครอบคลุมการ Build, Run และทดสอบ C++ Backend ส่วนวิธีเปิด Frontend
    ต้องดูจากไฟล์และการตั้งค่าภายในโฟลเดอร์ `frontend` ของ Repository ก่อน
-   Do not commit personal database records or local build artifacts
    unless they are intentionally part of the project.
-   ไม่ควร Commit ข้อมูลประเมินส่วนตัวหรือไฟล์ Build ในเครื่องขึ้น Git
    เว้นแต่ตั้งใจให้เป็นส่วนหนึ่งของโปรเจกต์


# NUAHS IT Evaluation Projects

ระบบประเมินประสิทธิผลและระบบประเมินความพึงพอใจใช้ C++ API และ SQLite ฐานข้อมูลเดียวกัน มีบัญชีและรายชื่อระบบสารสนเทศร่วมกัน

## โครงสร้างโครงการ

```text
evaluator/
├── frontend/
│   ├── user/                      # หน้าหลักและแบบประเมิน
│   ├── admin/                     # Dashboard, ผลประเมิน และจัดการระบบ
│   └── assets/                    # CSS, JavaScript, รูปภาพ และ frontend tests
├── backend/src/                   # C++ REST API
├── database/                      # schema.sql, seed.sql และ evaluator.db
└── tests/                         # การทดสอบ backend/API/ฐานข้อมูลและ fixtures
```

## เริ่มใช้งาน

1. Build และรัน backend จากโฟลเดอร์หลักของโครงการ
2. เปิดด้วย VS Code Live Server ที่ตั้ง `liveServer.settings.root` เป็น `/frontend`: `http://127.0.0.1:5500/user/index.html` (กรณีเปิด Live Server จาก root โปรเจกต์โดยไม่ตั้งค่า root ให้ใช้ `http://127.0.0.1:5500/frontend/user/index.html`)
3. ใช้ปุ่มเข้าสู่ระบบเพื่อสร้างบัญชีหรือเข้าสู่ระบบ บัญชีเดียวกันใช้ได้กับทั้งสองแบบประเมิน

Backend สร้างหรือเปิด `database/evaluator.db` และนำ schema/ข้อมูลตั้งต้นจาก `database/schema.sql` และ `database/seed.sql` มาใช้

```powershell
g++ -std=c++17 backend/src/main.cpp -lsqlite3 -lws2_32 -lbcrypt -o backend/evaluator_backend.exe
.\backend\evaluator_backend.exe
```

ตรวจสอบ backend ที่ `http://localhost:8080/health` ทดสอบ JavaScript จาก root โปรเจกต์ด้วย `node --test "frontend/assets/js/**/*.test.cjs"`.

บัญชีผู้ดูแลเริ่มต้น: username `Admin`, password `00000000`, ID `00000000` (role `admin`) ส่วนการสมัครทั่วไปกำหนด ID 8 หลักอัตโนมัติ โดยเริ่มจาก `00000001`; username และชื่อที่ใช้แสดงรองรับไม่เกิน 20 ตัวอักษร

```

# NUAHS IT Evaluation Projects

ระบบประเมินประสิทธิผลและระบบประเมินความพึงพอใจใช้ C++ API และ SQLite ฐานข้อมูลเดียวกัน มีบัญชีและรายชื่อระบบสารสนเทศร่วมกัน

## โครงสร้างโครงการ

```text
evaluator/
├── frontend/
│   ├── user/
│   │   ├── index.html             # portal หลักและจุด mount ของ shared Header
│   │   ├── effectiveness/         # แบบประเมินประสิทธิผล IT
│   │   └── satisfaction/          # หน้าประเมินความพึงพอใจ
│   ├── admin/
│   │   ├── dashboard.html         # ภาพรวมระบบ
│   │   ├── results.html           # ผลประเมินรายระบบ
│   │   └── manage/                # จัดการแบบประเมินและกระบวนการ
│   └── assets/
│       ├── css/                   # tokens, base, layouts และ page styles
│       ├── js/
│       │   ├── core/              # API, auth, guards, theme, i18n, runtime URL
│       │   ├── layout/            # shared Header/Sidebar และ NAV config
│       │   ├── user/              # logic ของแบบประเมินและ portal
│       │   ├── admin/             # logic ของผู้ดูแล
│       │   └── **/*.test.cjs      # tests อยู่ข้างโค้ดที่ทดสอบ
│       └── img/                   # โลโก้และรูปภาพ
│   ├── Effectiveness_Of_It/       # legacy, รออนุมัติแผน cleanup
│   └── Satisfaction_Survey/       # legacy, รออนุมัติแผน cleanup
├── backend/src/                   # C++ REST API
├── database/                      # schema.sql, seed.sql และ evaluator.db
└── tests/                         # การทดสอบ backend/API/ฐานข้อมูลและ fixtures
```

หน้า portal และหน้าแบบประเมินโหลด Header จาก `frontend/assets/js/layout/site-header.js` และใช้สไตล์จาก `frontend/assets/css/layouts/site-header.css` ชุดเดียวกัน ส่วน `theme-lang.js` ทำหน้าที่แปลข้อความและใช้ปุ่มธีม/ภาษาใน Header โดยหน้าเว็บกำหนด `data-translation-only="true"` เพื่อไม่ให้สร้างแถบปุ่มซ้ำ

## เริ่มใช้งาน

### Quick start

1. ติดตั้งส่วนขยาย VS Code **Live Server** (`ritwickdey.LiveServer`) เมื่อเปิดโฟลเดอร์โครงการครั้งแรก
2. เปิดโฟลเดอร์ `evaluator` ทั้งโฟลเดอร์ใน VS Code ไม่ใช่เปิดเฉพาะ `frontend/`
3. Build และรัน backend ตามคำสั่งด้านล่างจาก Terminal ที่ root ของ `evaluator` แล้วปล่อยให้ทำงานอยู่
4. คลิกขวาที่ `index.html` แล้วเลือก **Open with Live Server** หรือกด **Go Live**
5. เปิดเว็บที่ URL มาตรฐาน: `http://127.0.0.1:5500/frontend/user/index.html` (หรือ `http://127.0.0.1:5500/` ซึ่งจะ redirect ไปหน้าเดียวกัน)
6. ใช้ปุ่มเข้าสู่ระบบเพื่อสร้างบัญชีหรือเข้าสู่ระบบ บัญชีเดียวกันใช้ได้กับทั้งสองแบบประเมิน

เปิด Live Server จาก root ของ repository เพื่อให้ URL มาตรฐาน `/frontend/user/index.html` ทำงานโดยไม่ต้องตั้งค่า `liveServer.settings.root` เพิ่ม

### ข้อควรระวังเรื่อง localhost

Frontend ตั้ง API base เป็น `http://127.0.0.1:8080` โดยปริยาย ส่วน `localhost` และ `127.0.0.1` เป็นคนละ origin สำหรับ browser แม้จะชี้มายังเครื่องเดียวกันก็ตาม Backend ปัจจุบันอนุญาต CORS ด้วย `Access-Control-Allow-Origin: *` และอนุญาต `Authorization`, `Content-Type` และ OPTIONS preflight จึงรองรับหน้าเว็บที่เปิดผ่านทั้ง `http://127.0.0.1:5500` และ `http://localhost:5500` เมื่อ backend ทำงานบนพอร์ต 8080 หากมีการเปลี่ยนค่า API base หรือ CORS ในอนาคต ให้เปิด Console/Network ตรวจคำขอ API ด้วย

Backend สร้างหรือเปิด `database/evaluator.db` และนำ schema/ข้อมูลตั้งต้นจาก `database/schema.sql` และ `database/seed.sql` มาใช้

```powershell
g++ -std=c++17 backend/src/main.cpp -lsqlite3 -lws2_32 -lbcrypt -o backend/evaluator_backend.exe
.\backend\evaluator_backend.exe
```

ตรวจสอบ backend ได้ที่ `http://127.0.0.1:8080/health` หรือ `http://localhost:8080/health` ทดสอบ JavaScript จาก root โปรเจกต์ด้วย `node --test "frontend/assets/js/**/*.test.cjs"`.

บัญชีผู้ดูแลเริ่มต้น: username `Admin`, password `00000000`, ID `00000000` (role `admin`) ส่วนการสมัครทั่วไปกำหนด ID 8 หลักอัตโนมัติ โดยเริ่มจาก `00000001`; username และชื่อที่ใช้แสดงรองรับไม่เกิน 20 ตัวอักษร

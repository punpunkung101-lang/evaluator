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

ตรวจสอบ backend ได้ที่ `http://127.0.0.1:8080/health` หรือ `http://localhost:8080/health`
ทดสอบ JavaScript จาก root โปรเจกต์ด้วย:
- `node --test "frontend/assets/js/**/*.test.cjs"` (การทดสอบ frontend ทั้งหมด)
- `node --test "tests/**/*.test.cjs"` (การทดสอบชุดข้อมูลจำลองและฐานข้อมูล)

บัญชีผู้ดูแลเริ่มต้น: username `Admin`, password `00000000`, ID `00000000` (role `admin`) ส่วนการสมัครทั่วไปกำหนด ID 8 หลักอัตโนมัติ โดยเริ่มจาก `00000001`; username และชื่อที่ใช้แสดงรองรับไม่เกิน 20 ตัวอักษร

## ข้อมูลตัวอย่างหน้า Admin และการรีเซ็ต

`database/evaluator.db` ใน Git เป็น baseline สำหรับพัฒนาหน้า Admin และมี mock data ที่ติด marker ชัดเจน ครอบคลุม 21 ระบบ โดยแต่ละระบบสุ่ม 10–20 ผู้ประเมิน (จากกลุ่มผู้ใช้จำลอง 40 คน) ยกเว้น SYS019/SYS020 (ไม่มีข้อมูล), SYS017 (ประสิทธิผลอย่างเดียว) และ SYS018 (ความพึงพอใจอย่างเดียว) บัญชีที่ login ได้มีเพียง `Admin` / `00000000`; ผู้ใช้ `mock_*` ไม่มีรหัสผ่านที่ใช้งานได้

การจัดการข้อมูลในฐานข้อมูล:
- **(ก) กลับ mock ล่าสุด:** `git restore database/evaluator.db`
- **(ข) ลบเฉพาะ mock:** `sqlite3 database/evaluator.db < database/mock/reset-mock-data.sql` *(แนะนำวิธีนี้หากต้องการคงคำถาม 571 แถวทั้งหมดตามฐานข้อมูลที่ commit)*
- **(ค) ล้างเป็นศูนย์:** ลบ `database/evaluator.db` แล้วเปิด backend ใหม่ *(วิธีนี้ backend จะ seed คำถามเริ่มต้น 315 ข้อตาม `questions_seed.sql` ซึ่งต่างจาก DB ที่ commit ที่มี 571 แถว)*
ดูรายละเอียดและจำนวนแถวที่ได้จากการทดสอบจริงได้ที่ [`database/README.md`](database/README.md)

### โหมดข้อมูลตัวอย่าง (Demo) สำหรับดู Dashboard โดยไม่ต้องรัน backend

เปิดหน้า Admin พร้อมต่อท้าย `?demo=1` เช่น `http://127.0.0.1:5500/frontend/admin/dashboard.html?demo=1` จะแสดงข้อมูล mock จาก `frontend/assets/data/mock-snapshot.js` ทันที (ตาราง 21 ระบบ, กราฟ, ผลรายระบบ) โดยไม่ต้อง build/รัน backend และไม่ต้อง login

- โหมดนี้ **อ่านอย่างเดียว** ทุกคำขอ POST/PUT/DELETE ถูกปฏิเสธ จึงไม่มีอะไรถูกเขียนลง SQL; เมื่อไม่ได้เปิดโหมดนี้ ระบบเขียน/อ่าน SQLite ผ่าน C++ backend เหมือนเดิมทุกอย่าง
- ออกจากโหมดได้ด้วย `?demo=0`, ลิงก์ที่แถบด้านล่างจอ หรือ login ตามปกติ
- ถ้า backend ปิดอยู่ หน้า "ตรวจสอบสิทธิ์ไม่สำเร็จ" จะมีปุ่ม **ดูข้อมูลตัวอย่าง (Demo)** และถ้าฐานข้อมูลว่าง Dashboard จะมีลิงก์ไปโหมดนี้
- snapshot สร้างจากแถว mock ใน `database/evaluator.db` (ต้องใช้ Node 22+): `node database/mock/export-mock-snapshot.cjs` และมีเทสต์ `tests/database/mock-snapshot.test.cjs` ตรวจว่าตรงกับ DB เสมอ

**เพื่อนที่ clone แล้วต้องการข้อมูล mock ลงในฐานข้อมูลของตัวเอง** (ไม่ใช่แค่ดูเฉย ๆ):

```powershell
sqlite3 database/evaluator.db < database/mock/mock-data.sql
```

(หรือ `git restore database/evaluator.db` เพื่อกลับไปใช้ DB ที่ commit ไว้ ซึ่งมี mock อยู่แล้ว) จากนั้นรัน backend และ login `Admin` / `00000000` ตามปกติ

### ข้อควรระวังสำหรับเพื่อนร่วมทีม

DB นี้ถูก track ใน Git แล้ว backend จะแก้ไฟล์เมื่อมีการล็อกอิน (`auth_sessions`) ห้าม `git add` ไฟล์ DB ที่ใช้งานแล้ว ก่อน commit ต้องไม่มีไฟล์ DB ใน stage เว้นแต่ตั้งใจรีเฟรช mock และตรวจ `auth_sessions` ว่าง, ถ้า `git pull` ติดเพราะ DB ในเครื่องเปลี่ยน ให้สำรองไฟล์ก่อนแล้ว `git restore`

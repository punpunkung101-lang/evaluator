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

### ข้อควรระวังสำหรับเพื่อนร่วมทีม

DB นี้ถูก track ใน Git แล้ว backend จะแก้ไฟล์เมื่อมีการล็อกอิน (`auth_sessions`) ห้าม `git add` ไฟล์ DB ที่ใช้งานแล้ว ก่อน commit ต้องไม่มีไฟล์ DB ใน stage เว้นแต่ตั้งใจรีเฟรช mock และตรวจ `auth_sessions` ว่าง, ถ้า `git pull` ติดเพราะ DB ในเครื่องเปลี่ยน ให้สำรองไฟล์ก่อนแล้ว `git restore`

### ทำชุดสาธิตซ้ำจาก clean clone

เครื่อง Windows ต้องมี Git, Node.js 22.13 ขึ้นไป (ใช้ `node:sqlite`), MSYS2 UCRT64 `g++` และ SQLite development package ตาม [คู่มือ backend](backend/README.md) รวมถึง Python 3 สำหรับตรวจผลฐานข้อมูล

จาก root ของ clone:

```powershell
g++ -std=c++17 backend/src/main.cpp -lsqlite3 -lws2_32 -lbcrypt -o backend/evaluator_backend.exe
Remove-Item database/evaluator.db
.\backend\evaluator_backend.exe
```

รอให้ backend สร้าง DB และแสดงข้อความ listening แล้วหยุด backend ด้วย Ctrl+C จากนั้น seed mock และเริ่ม backend ใหม่:

```powershell
sqlite3 database/evaluator.db ".read database/mock/mock-data.sql"
.\backend\evaluator_backend.exe
```

เปิดอีก terminal แล้วตรวจ `Invoke-RestMethod http://127.0.0.1:8080/health` ว่าได้ `status: ok`; เปิด Live Server จาก root เพื่อเข้า `http://127.0.0.1:5500/frontend/admin/dashboard.html` และล็อกอินด้วย Admin ก่อนดูผล mock แบนเนอร์บนหน้า Admin ระบุว่าข้อมูลเป็นข้อมูลจำลอง สคริปต์ `node database/mock/generate-mock-data.cjs` สร้าง SQL ซ้ำได้แบบ deterministic โดยไม่ต้องใช้ dependency เพิ่ม

ผล clean-clone verification (11 พฤศจิกายน 2569): clone จาก commit ใน Git แยกจาก working tree, build backend, ลบ DB ใน clone เพื่อให้ backend สร้าง schema/seed ใหม่, สร้าง mock SQL สองครั้งได้ SHA-256 เดียวกัน, import SQL และตรวจ `integrity_check=ok` / foreign key violations `0`; `/health` ตอบ `ok`, Admin login ผ่าน และ API ตอบข้อมูล 284 quantitative records กับ 279 evaluations ส่วนหน้า HTML และ assets หลักตอบ HTTP 200 จาก static server. **ยังไม่ได้ตรวจภาพหน้า Dashboard ใน browser** จึงยังยืนยันการเรนเดอร์กราฟ/รายละเอียดด้วยสายตาไม่ได้; ให้ตรวจใน browser ก่อนสาธิตจริง อย่าคัดลอก DB หรือไฟล์ที่ไม่อยู่ใน Git จากเครื่องต้นทาง

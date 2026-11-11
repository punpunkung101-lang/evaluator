# Database และข้อมูลจำลองสำหรับพัฒนา

`evaluator.db` เป็น SQLite ฐานข้อมูลเดียวที่ Backend เปิดเมื่อเริ่มทำงาน โดยใช้ `schema.sql`, `seed.sql` และ `questions_seed.sql` เพื่อสร้างโครงสร้างและข้อมูลตั้งต้น

## ข้อมูลในฐานข้อมูลที่ commit

`evaluator.db` ที่อยู่ใน Git เป็นฐานข้อมูลพัฒนาสำหรับตัวอย่างหน้า Admin มีบัญชีที่เข้าสู่ระบบได้เฉพาะบัญชีเริ่มต้น `Admin` / `00000000` (ID `00000000`) ผู้ประเมินตัวอย่างสังเคราะห์มี 40 บัญชี username ขึ้นต้น `mock_evaluator_01` ถึง `mock_evaluator_40`, ID `90000001` ถึง `90000040` บทบาทกระจาย (student/teacher/staff) และไม่มีรหัสผ่านที่ใช้งานได้

submission จำลองใช้ ID ขึ้นต้น `mock-` ครอบคลุม 21 ระบบ โดยแต่ละระบบสุ่ม 10–20 ผู้ประเมิน (แยกกันระหว่างประสิทธิผลและความพึงพอใจ) ยกเว้น SYS019/SYS020 (ไม่มีข้อมูล), SYS017 (ประสิทธิผลอย่างเดียว) และ SYS018 (ความพึงพอใจอย่างเดียว) วันที่กระจายครอบคลุมทุกเดือนพฤษภาคม–พฤศจิกายน 2569 ข้อมูลนี้ใช้พัฒนาและตรวจหน้าจอเท่านั้น ห้ามรายงานว่าเป็นผลจริงของคณะ

ชื่อแสดงของบัญชี mock ถูกจำกัดไม่เกิน 20 ตัวอักษรตาม CHECK constraint ของ schema เพื่อให้ seed ทำงานได้กับ DB ที่สร้างใหม่

ไฟล์สคริปต์และ SQL ที่เกี่ยวข้อง:

- `database/mock/generate-mock-data.cjs` สคริปต์ Node.js แบบ deterministic สำหรับสร้างชุดข้อมูล mock และเขียนไฟล์ SQL
- `database/mock/mock-data.sql` เพิ่มหรือแทนที่ข้อมูลจำลอง โดยลบเฉพาะแถวที่มี marker mock ก่อนใส่ชุดเดิมกลับ
- `database/mock/reset-mock-data.sql` ลบข้อมูลจำลองและผู้ใช้ `mock_*` ทั้งหมด โดยคง Admin, ระบบ, คำถาม และข้อมูลจริงไว้
- `database/mock/baseline-statuses.json` บันทึกสถานะ baseline ของทั้ง 21 ระบบ เพื่อพิสูจน์ว่าการสุ่ม 10–20 คนไม่ทำให้สถานะของระบบใดเปลี่ยน

## การจัดการและรีเซ็ตข้อมูลผลประเมิน

เลือกวิธีการตามลักษณะงานที่ต้องการ:

### (ก) กลับชุดข้อมูล mock ล่าสุด (จาก Git Baseline)

หากทดลองประเมินหรือแก้ไขข้อมูลไปแล้วต้องการคืนค่าฐานข้อมูลพัฒนาที่มี mock 10–20 คนต่อระบบกลับมาตาม baseline ล่าสุด:

```powershell
git restore database/evaluator.db
```

*(หรือสร้างชุด mock ขึ้นใหม่ด้วยคำสั่ง `node database/mock/generate-mock-data.cjs`)*

### (ข) ลบเฉพาะข้อมูลจำลอง (Mock Data) ออกจากฐานข้อมูล

ใช้คำสั่งรันสคริปต์ `reset-mock-data.sql` เพื่อลบเฉพาะแถวจำลอง (ที่มี marker `mock-*` / `mock_*`) โดยรักษาบัญชีผู้ดูแลระบบ รายชื่อระบบ และคำถามทั้งหมดไว้:

```powershell
sqlite3 database/evaluator.db < database/mock/reset-mock-data.sql
```

*(หรือเปิด `database/evaluator.db` ใน DB Browser for SQLite แล้ว Execute SQL ไฟล์ `database/mock/reset-mock-data.sql`)*

### สร้างชุด mock บนฐานข้อมูลใหม่จาก clean clone

หลัง clone ให้ build และเปิด backend หนึ่งครั้งเพื่อสร้าง schema, Admin, systems และคำถาม จากนั้นหยุด backend แล้วโหลดชุด mock ที่ติดตามใน Git:

```powershell
g++ -std=c++17 backend/src/main.cpp -lsqlite3 -lws2_32 -lbcrypt -o backend/evaluator_backend.exe
Remove-Item database/evaluator.db
.\backend\evaluator_backend.exe
```

เมื่อ backend เริ่มฟังแล้ว กด Ctrl+C แล้วรัน:

```powershell
sqlite3 database/evaluator.db ".read database/mock/mock-data.sql"
```

เปิด backend ใหม่จาก root และเปิด frontend ผ่าน Live Server จาก root ตาม README หลัก การสร้าง SQL แบบ deterministic ใช้ `node database/mock/generate-mock-data.cjs` (ต้องใช้ Node.js ที่รองรับ `node:sqlite`) โดยไม่เพิ่ม dependency

**ผลการทดสอบจริงกับสำเนาโปรเจกต์ (ก่อน / หลัง รันคำสั่ง):**
- ตาราง `users`: ก่อน **41** แถว (Admin + 40 mock) $\rightarrow$ หลัง **1** แถว (เหลือเฉพาะ Admin `00000000`)
- ตาราง `evaluations`: ก่อน **279** แถว $\rightarrow$ หลัง **0** แถว
- ตาราง `satisfactions`: ก่อน **279** แถว $\rightarrow$ หลัง **0** แถว
- ตาราง `quantitative_records`: ก่อน **284** แถว $\rightarrow$ หลัง **0** แถว
- ตาราง `assessment_answers`: ก่อน **6,675** แถว $\rightarrow$ หลัง **0** แถว
- ตาราง `auth_sessions`: ก่อน **0** แถว $\rightarrow$ หลัง **0** แถว
- ตาราง `systems`: ก่อน **21** แถว $\rightarrow$ หลัง **21** แถว (คงเดิมทุกระบบ)
- ตาราง `assessment_questions`: ก่อน **571** แถว $\rightarrow$ หลัง **571** แถว (คงเดิมทุกคำถาม)

### (ค) ล้างฐานข้อมูลเป็นศูนย์อย่างสมบูรณ์ (Clean Zero State)

เมื่อต้องการเริ่มต้นระบบใหม่จากศูนย์แท้จริง โดยให้ backend สร้างโครงสร้างและข้อมูลเริ่มต้นใหม่ทั้งหมด:

1. ปิด Backend process
2. ลบไฟล์ฐานข้อมูล:
   ```powershell
   Remove-Item database/evaluator.db
   ```
3. เปิด Backend จาก root ของ repo:
   ```powershell
   .\backend\evaluator_backend.exe
   ```
Backend จะสร้าง `evaluator.db` ใหม่ พร้อมรัน `schema.sql`, `seed.sql`, `questions_seed.sql` และ migrations โดยอัตโนมัติ

**ผลการทดสอบจริงกับสำเนาโปรเจกต์ (หลัง backend สร้าง DB ใหม่):**
- ตาราง `users`: **1** แถว (เฉพาะ Admin `00000000`)
- ตาราง `systems`: **21** แถว (ครบ 21 ระบบตาม catalog)
- ตาราง `assessment_questions`: **315** แถว (210 คำถามประสิทธิผล active + 105 คำถามความพึงพอใจ active)
- ตาราง `evaluations`: **0** แถว
- ตาราง `satisfactions`: **0** แถว
- ตาราง `quantitative_records`: **0** แถว
- ตาราง `assessment_answers`: **0** แถว
- ตาราง `auth_sessions`: **0** แถว
- ตาราง `schema_migrations`: **2** แถว (`assessment_questions_csv_v1`, `assessment_questions_dedupe_v2`)

> [!IMPORTANT]
> **หมายเหตุเรื่องจำนวนแถว `assessment_questions` (315 vs 571 แถว):**
> ฐานข้อมูลที่สร้างใหม่จากวิธี (ค) จะได้คำถาม **315** ข้อ (มาจาก `questions_seed.sql` ทั้งหมด 210 ข้อประสิทธิผล + 105 ข้อความพึงพอใจ ซึ่งเป็นชุดคำถาม active ที่ระบบใช้งานจริง) ต่างจาก `evaluator.db` ที่ commit ไว้ใน Git ซึ่งมี **571** แถว เนื่องจากฐานข้อมูลใน Git มีข้อมูลประวัติการพัฒนาเดิมติดอยู่ด้วย ได้แก่ คำถาม generic 25 ข้อที่ `system_id` เป็น NULL และคำถาม duplicate เก่า 231 ข้อที่ถูก de-dupe เป็น inactive (`active = 0`)
> **ข้อแนะนำ:** หากต้องการคงคำถามทั้งหมด 571 แถวตามฐานข้อมูลที่ commit ไว้ แนะนำให้เลือกใช้ **วิธี (ข)** (`reset-mock-data.sql`) แทนวิธี (ค)

## ข้อควรระวังสำหรับเพื่อนร่วมทีม

DB นี้ถูก track ใน Git แล้ว backend จะแก้ไฟล์เมื่อมีการล็อกอิน (`auth_sessions`) ห้าม `git add` ไฟล์ DB ที่ใช้งานแล้ว ก่อน commit ต้องไม่มีไฟล์ DB ใน stage เว้นแต่ตั้งใจรีเฟรช mock และตรวจ `auth_sessions` ว่าง, ถ้า `git pull` ติดเพราะ DB ในเครื่องเปลี่ยน ให้สำรองไฟล์ก่อนแล้ว `git restore`

- การเข้าสู่ระบบทุกครั้งเพิ่มแถวใน `auth_sessions` ของ `evaluator.db` ฐานข้อมูลใน Git เป็น baseline ที่ไม่มี session ค้างอยู่
- สำรอง DB ก่อนการลบหรือแก้ข้อมูลจริง และอย่า commit ไฟล์สำรอง `*.bak` หรือฐานข้อมูลส่วนตัว
- ตรวจสอบความถูกต้องของ DB ด้วยคำสั่ง:
  ```powershell
  python -c "import sqlite3; c=sqlite3.connect('database/evaluator.db'); print(c.execute('PRAGMA integrity_check').fetchall()); print(c.execute('PRAGMA foreign_key_check').fetchall())"
  ```

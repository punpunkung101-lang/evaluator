# Database และข้อมูลจำลองสำหรับพัฒนา

`evaluator.db` เป็น SQLite ฐานข้อมูลเดียวที่ Backend เปิดเมื่อเริ่มทำงาน โดยใช้ `schema.sql`, `seed.sql` และ `questions_seed.sql` เพื่อสร้างโครงสร้างและข้อมูลตั้งต้น

## ข้อมูลในฐานข้อมูลที่ commit

`evaluator.db` ที่อยู่ใน Git เป็นฐานข้อมูลพัฒนาสำหรับตัวอย่างหน้า Admin มีบัญชีที่เข้าสู่ระบบได้เฉพาะบัญชีเริ่มต้น `Admin` / `00000000` (ID `00000000`) ผู้ประเมินตัวอย่างสังเคราะห์มี 40 บัญชี username ขึ้นต้น `mock_evaluator_01` ถึง `mock_evaluator_40`, ID `90000001` ถึง `90000040` บทบาทกระจาย (student/teacher/staff) และไม่มีรหัสผ่านที่ใช้งานได้

submission จำลองใช้ ID ขึ้นต้น `mock-` ครอบคลุม 21 ระบบ โดยแต่ละระบบสุ่ม 10–20 ผู้ประเมิน (แยกกันระหว่างประสิทธิผลและความพึงพอใจ) ยกเว้น SYS019/SYS020 (ไม่มีข้อมูล), SYS017 (ประสิทธิผลอย่างเดียว) และ SYS018 (ความพึงพอใจอย่างเดียว) วันที่กระจายครอบคลุมทุกเดือนพฤษภาคม–พฤศจิกายน 2569 ข้อมูลนี้ใช้พัฒนาและตรวจหน้าจอเท่านั้น ห้ามรายงานว่าเป็นผลจริงของคณะ

ไฟล์สคริปต์และ SQL ที่เกี่ยวข้อง:

- `database/mock/generate-mock-data.cjs` สคริปต์ Node.js แบบ deterministic สำหรับสร้างชุดข้อมูล mock และเขียนไฟล์ SQL
- `database/mock/mock-data.sql` เพิ่มหรือแทนที่ข้อมูลจำลอง โดยลบเฉพาะแถวที่มี marker mock ก่อนใส่ชุดเดิมกลับ
- `database/mock/reset-mock-data.sql` ลบข้อมูลจำลองและผู้ใช้ `mock_*` ทั้งหมด โดยคง Admin, ระบบ, คำถาม และข้อมูลจริงไว้
- `database/mock/baseline-statuses.json` บันทึกสถานะ baseline ของทั้ง 21 ระบบ เพื่อพิสูจน์ว่าการสุ่ม 10–20 คนไม่ทำให้สถานะของระบบใดเปลี่ยน

## รีเซ็ตผลประเมินให้เป็นศูนย์

**วิธี 1: สร้างฐานข้อมูลเริ่มต้นใหม่**

1. ปิด Backend
2. สำรองไฟล์ที่ต้องการเก็บ แล้วลบ `database/evaluator.db`
3. เปิด Backend จาก root ของ repo Backend จะสร้าง DB ใหม่จาก schema และ seed
4. ตรวจว่า `evaluations`, `satisfactions`, `assessment_answers` และ `quantitative_records` เป็นศูนย์; users เหลือ Admin และยังมี 21 ระบบ

ผลการทดสอบจริงกับสำเนาโฟลเดอร์ชั่วคราว: Backend สร้าง DB ใหม่สมบูรณ์, users เหลือ 1 รายการ (`Admin`), systems 21 รายการ, assessment_questions 571 รายการ, auth_sessions 0 รายการ และ evaluations/satisfactions/assessment_answers/quantitative_records เป็น 0

**วิธี 2: ใช้ sqlite3 รัน reset script** จาก root ของ repo:

```powershell
sqlite3 database/evaluator.db ".read database/mock/reset-mock-data.sql"
```

ผลการทดสอบจริงกับสำเนา DB: users จาก 41 เหลือ 1 (เฉพาะ Admin `00000000`), evaluations จาก 279 เหลือ 0, quantitative_records จาก 284 เหลือ 0, assessment_answers จาก 6675 เหลือ 0, systems ยังคง 21 ระบบ และคำถามยังคง 571 รายการ

**วิธี 3: ใช้ DB Browser for SQLite**

เปิด `database/evaluator.db`, เลือก Execute SQL, เปิดและรันเนื้อหา `database/mock/reset-mock-data.sql`, แล้วกด Write Changes

## กู้สถานะ mock ล่าสุดกลับมา

หากต้องการกู้ชุดข้อมูล mock กลับมาเป็น baseline ล่าสุด:

```powershell
git restore database/evaluator.db
```

หรือสร้างชุด mock ใหม่ด้วยสคริปต์:

```powershell
node database/mock/generate-mock-data.cjs
```

## ข้อควรระวังสำหรับเพื่อนร่วมทีม

DB นี้ถูก track ใน Git แล้ว backend จะแก้ไฟล์เมื่อมีการล็อกอิน (`auth_sessions`) ห้าม `git add` ไฟล์ DB ที่ใช้งานแล้ว ก่อน commit ต้องไม่มีไฟล์ DB ใน stage เว้นแต่ตั้งใจรีเฟรช mock และตรวจ `auth_sessions` ว่าง, ถ้า `git pull` ติดเพราะ DB ในเครื่องเปลี่ยน ให้สำรองไฟล์ก่อนแล้ว `git restore`

- การเข้าสู่ระบบทุกครั้งเพิ่มแถวใน `auth_sessions` ของ `evaluator.db` ฐานข้อมูลใน Git เป็น baseline ที่ไม่มี session ค้างอยู่
- สำรอง DB ก่อนการลบหรือแก้ข้อมูลจริง และอย่า commit ไฟล์สำรอง `*.bak` หรือฐานข้อมูลส่วนตัว
- ตรวจสอบความถูกต้องของ DB ด้วยคำสั่ง:
  ```powershell
  python -c "import sqlite3; c=sqlite3.connect('database/evaluator.db'); print(c.execute('PRAGMA integrity_check').fetchall()); print(c.execute('PRAGMA foreign_key_check').fetchall())"
  ```

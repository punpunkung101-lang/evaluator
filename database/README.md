# Database และข้อมูลจำลองสำหรับพัฒนา

`evaluator.db` เป็น SQLite ฐานข้อมูลเดียวที่ Backend เปิดเมื่อเริ่มทำงาน โดยใช้ `schema.sql`, `seed.sql` และ `questions_seed.sql` เพื่อสร้างโครงสร้างและข้อมูลตั้งต้น

## ข้อมูลในฐานข้อมูลที่ commit

`evaluator.db` ที่อยู่ใน Git เป็นฐานข้อมูลพัฒนาสำหรับตัวอย่างหน้า Admin มีบัญชีที่เข้าสู่ระบบได้เฉพาะบัญชีเริ่มต้น `Admin` / `00000000` (ID `00000000`) ผู้ประเมินตัวอย่างมี username ขึ้นต้น `mock_`, ID ตั้งแต่ `90000001` และไม่มีรหัสผ่านที่ใช้งานได้

submission จำลองใช้ ID ขึ้นต้น `mock-` ครอบคลุม 21 ระบบ ทั้งประสิทธิผลและความพึงพอใจ รวมกรณีข้อมูลไม่ครบ ตัวอย่างน้อย ผลดีขึ้น ผลใกล้เคียง ผลแย่ลง และระบบไม่มีข้อมูล หน้า Admin แสดงป้ายแจ้งเมื่อพบ submission ที่มี marker ข้อมูลนี้ใช้พัฒนาและตรวจหน้าจอเท่านั้น ห้ามรายงานว่าเป็นผลจริงของคณะ

ไฟล์ SQL ที่เกี่ยวข้อง:

- `database/mock/mock-data.sql` เพิ่มหรือแทนที่ข้อมูลจำลอง โดยลบเฉพาะแถวที่มี marker mock ก่อนใส่ชุดเดิมกลับ
- `database/mock/reset-mock-data.sql` ลบข้อมูลจำลองและผู้ใช้ `mock_` เท่านั้น โดยคง Admin, ระบบ, คำถาม และข้อมูลที่ไม่มี marker ไว้

## รีเซ็ตผลประเมินให้เป็นศูนย์

**วิธี 1: สร้างฐานข้อมูลเริ่มต้นใหม่**

1. ปิด Backend
2. สำรองไฟล์ที่ต้องการเก็บ แล้วลบ `database/evaluator.db`
3. เปิด Backend จาก root ของ repo Backend จะสร้าง DB ใหม่จาก schema และ seed
4. ตรวจว่า `evaluations`, `satisfactions`, `assessment_answers` และ `quantitative_records` เป็นศูนย์; users เหลือ Admin และยังมี 21 ระบบ

วิธีนี้ทดสอบแล้วในโฟลเดอร์ชั่วคราวโดยไม่แตะ DB จริง: Backend ตอบ `/health` เป็น `ok`, มี users 1 รายการ (Admin), systems 21 รายการ, sessions 0 และ evaluations, satisfactions, assessment_answers, quantitative_records เป็น 0

**วิธี 2: ใช้ sqlite3** จาก root ของ repo:

```powershell
sqlite3 database/evaluator.db ".read database/mock/reset-mock-data.sql"
```

**วิธี 3: ใช้ DB Browser for SQLite**

เปิด `database/evaluator.db`, เลือก Execute SQL, เปิดและรันเนื้อหา `database/mock/reset-mock-data.sql`, แล้วกด Write Changes

## เพิ่มข้อมูลจำลองกลับ

จาก root ของ repo ใช้คำสั่ง:

```powershell
sqlite3 database/evaluator.db ".read database/mock/mock-data.sql"
```

หรือเปิดและรันไฟล์เดียวกันใน DB Browser for SQLite จากนั้น refresh หน้า Admin ข้อมูลจะกลับมาและมีป้ายระบุว่าเป็นข้อมูลจำลอง

## ข้อควรระวัง

การเข้าสู่ระบบทุกครั้งเพิ่มแถวใน `auth_sessions` ของ `evaluator.db` ฐานข้อมูลใน Git เป็น baseline ที่ไม่มี session การใช้งาน Backend หรือสมัคร/ส่งแบบประเมินบนเครื่องตนเองจะทำให้ DB เปลี่ยน อย่า commit DB หลังใช้งานเครื่องส่วนตัว หาก `git status` แสดงว่า `database/evaluator.db` ถูกแก้ ให้คืนไฟล์ baseline ด้วย `git restore database/evaluator.db` ก่อน commit งานอื่น

สำรอง DB ก่อนการลบหรือแก้ข้อมูลจริง และอย่า commit ไฟล์สำรอง `*.bak` หรือฐานข้อมูลส่วนตัว

# NUAHS IT Evaluation Projects

พื้นที่เก็บโครงการประเมินระบบสารสนเทศของคณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร แยกงานประเมินประสิทธิผลออกจากงานสำรวจความพึงพอใจ เพื่อให้แต่ละโครงการพัฒนาและติดตั้งได้อย่างอิสระ

## โครงสร้างโครงการ

```text
evaluator/
├── frontend/
│   ├── Satisfaction_Survey/       # HTML, CSS และ JavaScript ของแบบสำรวจ
│   └── Effectiveness_Of_It/
│       └── main/                  # จุดเริ่มต้นสำหรับเว็บประเมินประสิทธิผล
├── backend/                       # โค้ด C++ และพื้นที่บริการหลังบ้าน
└── database/                      # schema และข้อมูลเริ่มต้น SQL
```

## เริ่มใช้งานแบบสำรวจความพึงพอใจ

เริ่ม Backend ก่อน แล้วเปิด `frontend/Effectiveness_Of_It/main/index.html` ผ่าน Live Server หรือเว็บเซิร์ฟเวอร์ในเครื่อง (อย่าเปิดเป็น `file://`) บัญชีใหม่สร้างได้จากหน้าต่างเข้าสู่ระบบ ข้อมูลบัญชีใช้รหัสผ่านแบบ PBKDF2 และ session cookie ฝั่ง Backend

## สถานะโครงการประเมินประสิทธิผล

`frontend/Effectiveness_Of_It/main` มีโครงสร้างเริ่มต้นแล้ว โค้ดของระบบนี้ยังไม่ได้เริ่มพัฒนา ดูขอบเขตการเริ่มงานได้จากไฟล์ README ภายในโฟลเดอร์ดังกล่าว


### ขั้นตอนหลักมีแค่ 3 คำสั่ง

เปิด Terminal ที่โฟลเดอร์ `evaluator`

1\. Build (เฉพาะกรณี EXE ยังไม่มี หรือแก้โค้ด)

```
g++ -std=c++17 backend/src/main.cpp -lsqlite3 -lws2_32 -lbcrypt -o backend/evaluator_backend.exe
```

2\. Run Backend

```
.\backend\evaluator_backend.exe
```

3\. ทดสอบ

เปิด Browser:

```
http://localhost:8080/health
```

ถ้าได้ `{"status":"ok"}` แสดงว่าพร้อมใช้งานครับ

จากนั้นเปิดหน้าแรกผ่าน Live Server แล้วสร้างบัญชีหรือเข้าสู่ระบบก่อนเริ่มแบบประเมิน

จำไว้: ครั้งต่อไปถ้าไม่ได้แก้ `main.cpp` และยังมีไฟล์ `.exe` อยู่ ข้ามขั้นตอน Build ไปได้เลยครับ 😁

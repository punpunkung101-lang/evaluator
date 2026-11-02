# NUAHS IT Evaluation Projects

พื้นที่เก็บโครงการประเมินระบบสารสนเทศของคณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร แยกงานประเมินประสิทธิผลออกจากงานสำรวจความพึงพอใจ เพื่อให้แต่ละโครงการพัฒนาและติดตั้งได้อย่างอิสระ

## โครงสร้างโครงการ

```text
NUAHS/
├── Effectiveness_Of_It/
│   ├── frontend/                  # จุดเริ่มต้นสำหรับเว็บประเมินประสิทธิผล
│   ├── backend/                   # สงวนไว้สำหรับบริการหลังบ้านในอนาคต
│   └── README.md                  # ขอบเขตและแนวทางเริ่มต้นของโครงการ
└── Satisfaction_Survey/
    ├── frontend/                  # HTML, CSS และ JavaScript ของแบบสำรวจ
    ├── backend/                   # โค้ด C++ ที่มีอยู่ในปัจจุบัน
    └── database/                  # schema และข้อมูลเริ่มต้น SQL
```

## เริ่มใช้งานแบบสำรวจความพึงพอใจ

เปิดไฟล์ [NUAHS/Satisfaction_Survey/frontend/user/index.html](NUAHS/Satisfaction_Survey/frontend/user/index.html) ในเว็บเบราว์เซอร์ หรือเปิดโฟลเดอร์ `NUAHS/Satisfaction_Survey` ด้วย VS Code และใช้ Live Server

## สถานะโครงการประเมินประสิทธิผล

`NUAHS/Effectiveness_Of_It` มีโครงสร้างเริ่มต้นแล้ว โดยแยก `frontend` และ `backend` ชัดเจน โค้ดของระบบนี้ยังไม่ได้เริ่มพัฒนา ดูขอบเขตการเริ่มงานได้จากไฟล์ README ภายในโฟลเดอร์ดังกล่าว

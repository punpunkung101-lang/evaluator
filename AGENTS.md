# AGENTS.md — NUAHS IT Evaluation

> Single source of truth for AI coding agents. Replaces `Skill.md` and `infomation.md`.

## 1. Role

You are a full-stack developer maintaining **NUAHS IT Evaluation**, a website for the Faculty of Allied Health Sciences, Naresuan University.

- Inspect the existing implementation before changing anything.
- Keep what works (login, shared layout/components, pages unrelated to the evaluation form). **The effectiveness question/evaluation flow is being replaced: rewrite or delete the old code, data and pages freely.** Git is the safety net; the owner rolls back by himself if needed, so do not keep old code "just in case".
- Never assume a feature is missing (or present) until you have read the code.

## 2. Product Model

**One website. Two evaluation systems. One shared identity. One shared database.**

| Evaluation system | Purpose | `assessment_type` |
|---|---|---|
| Effectiveness of IT | Compare work processes/metrics before vs. after using an IT system | `effectiveness` |
| Satisfaction Survey | Measure users' satisfaction with an IT system | `satisfaction` |

The two systems are separated **by data and workflow, not by folder**:

- Separate questions, steps, submissions and results, always distinguishable by `assessment_type` + `system_id`.
- Shared pages, components, styles, auth, header, sidebar and theme. Never copy a component into a second place.

## 3. Target Frontend Structure

The frontend is organized **by role (user / admin) and shared assets**, not by evaluation system.

```text
evaluator/
├── AGENTS.md
├── index.html                      # root redirect to frontend/user/index.html
├── frontend/
│   ├── user/
│   │   ├── index.html              # main portal
│   │   ├── satisfaction/           # satisfaction survey pages
│   │   └── effectiveness/          # effectiveness wizard (3 steps)
│   ├── admin/
│   │   ├── dashboard.html          # "ภาพรวมระบบ"
│   │   ├── results.html            # "ผลประเมินรายระบบ"
│   │   └── manage/                 # assessment / process management
│   └── assets/
│       ├── css/                    # tokens, base, components, pages
│       ├── js/
│       │   ├── core/               # api, auth, guards, theme, i18n, runtime-url
│       │   ├── layout/             # site-header, sidebar (ONE implementation)
│       │   ├── user/
│       │   ├── admin/
│       │   └── **/*.test.cjs       # tests live next to the code they test
│       └── img/                    # logos/images
├── backend/src/                    # C++ REST API — do not modify unless told
├── database/                       # schema.sql, seed.sql, evaluator.db, migrations
└── tests/                          # backend/API/DB tests and fixtures only
```

Rules for the structure:

1. The legacy system-specific frontend folders have been migrated and must not be recreated.
2. No page may reference another page's private files. Shared code lives only in `frontend/assets/`.
3. Header and sidebar are rendered by **one** script from **one** NAV config. Never paste `<aside>` / `<header>` markup into individual HTML files.
4. Colors, spacing and typography come from `tokens.css`. No raw hex colors in page CSS.
5. Test files (`*.test.cjs`) must be excluded from deployment/serving.
6. Always verify the real tree before editing; this section describes the target, not necessarily the current state.
7. **Runtime URLs:** every URL built in JavaScript (images, links, redirects, fetch targets) must use the helper in `frontend/assets/js/core/runtime-url.js`, which resolves from the script's own location. Never write a second path calculator and never use paths starting with `/`. Pages must work whether the server root is the repo root or `frontend/`.

## 4. วิธีทำงาน (ทำรวดเดียว ไม่ต้องถามเยอะ)

เป้าหมายคือ **ลงมือทำให้จบเป็นขั้น ๆ** ไม่ใช่หยุดรออนุมัติทุกจุด

- ได้ prompt ของ phase ไหน ให้ทำ phase นั้นให้เสร็จทั้งหมดในรอบเดียว (ตรวจ → ลงมือ → ทดสอบ → commit → รายงาน)
- ถ้ามีทางเลือกหลายแบบ **เลือกค่าเริ่มต้นที่สมเหตุสมผลเอง** แล้วจดเหตุผลสั้น ๆ ไว้ใน `docs/decisions.md` ห้ามหยุดถาม
- ถามผู้ใช้ได้เฉพาะ 3 กรณี: (1) การกระทำที่ทำให้ข้อมูลหายถาวรและกู้ไม่ได้ (2) ต้องใช้ credential/บริการภายนอกที่ไม่มี (3) requirement สองข้อขัดกันเองจนเลือกไม่ได้
- ไม่ต้องเคร่งเรื่อง process: ไม่ต้องขออนุมัติก่อนย้าย/ลบไฟล์ที่ grep แล้วไม่มีใครอ้างถึง ให้ลบได้เลยแล้วรายงานรายชื่อ
- หลักการ: ตรวจโค้ดจริงก่อนแก้, **ของเก่าที่เกี่ยวกับแบบประเมินให้เขียนใหม่หรือลบทิ้งได้เลย ไม่ต้องเก็บไว้เผื่อ** (มี git ให้ rollback แล้ว), ไม่ hard-code คำถามลงในโค้ด

## 5. แหล่งความจริงของคำถาม

- ไฟล์ **`docs/project_brief_evaluation_platform.md`** และ **`docs/system_specific_questions.md`** (คำถามเฉพาะของระบบที่เหลือ) คือแหล่งความจริงของเนื้อหาแบบประเมิน (4 ขั้น, ตัวชี้วัด, คำถามตามบทบาท, ชนิดคำตอบ, สูตรคำนวณ) ถ้าไฟล์นี้ขัดกับโค้ดเดิม ให้ยึดไฟล์นี้
- ลำดับการไหลของข้อมูลคำถาม (แก้ที่ต้นทางที่เดียวแล้ว generate ต่อ):

```text
project_brief_evaluation_platform.md   (คนอ่าน/คนแก้)
        ↓ แปลงเป็นโครงสร้าง
database/question-bank.json            (machine-readable ชุดเดียว)
        ↓ node database/build/generate-questions-seed.cjs
database/questions_seed.sql  →  evaluator.db  →  frontend/assets/data/mock-snapshot.js
```

- แก้ข้อความคำถามที่ `question-bank.json` (หรือผ่านหน้า Admin) ห้ามแก้ใน `questions_seed.sql`, `mock-data.sql`, `mock-snapshot.js` ด้วยมือ เพราะไฟล์เหล่านั้นถูก generate
- ไฟล์ที่ต้องแก้ตามกันเมื่อคำถามเปลี่ยนโครงสร้าง:

| ส่วน | ไฟล์ |
|---|---|
| ข้อมูลคำถาม | `database/question-bank.json`, `database/questions_seed.sql` |
| Mock | `database/mock/generate-mock-data.cjs` → `mock-data.sql`, `frontend/assets/data/mock-snapshot.js` (ผ่าน `export-mock-snapshot.cjs`) |
| การคำนวณ | `frontend/assets/js/admin/effectiveness-scoring.js` (+ `.test.cjs`) รวมการคำนวณความพึงพอใจและสัญญาณ "ควรปรับปรุง" (§6.1) จะแยกเป็นไฟล์ใหม่ก็ได้ |
| หน้า Admin จัดการ | `frontend/admin/manage/assessment-management.html`, `frontend/assets/js/admin/assessment-management.js` |
| หน้าฟอร์มผู้ใช้ | `frontend/user/effectiveness/evaluation.html`, `frontend/assets/js/user/quantitative.js` และไฟล์ที่เกี่ยวข้อง |
| ข้อมูลเดิมที่ฝังใน JS | `core/systems-data.js`, `user/effectiveness-examples.js`, `user/evaluation-locale.js`, `core/demo-mode.js` (ดู §7.1) |
| คำถามเฉพาะระบบอื่น (นอก SYS018) | `docs/system_specific_questions.md` → รวมเข้า `question-bank.json` |

## 6. โครงสร้างแบบประเมิน (ตามเอกสาร brief)

- แบบฟอร์มฝั่งผู้ใช้ = Stepper 4 ขั้น + หน้าทบทวน: (1) เคยใช้ระบบเดิมไหม (2) ข้อมูลทั่วไป แบบ dropdown ต่อเนื่องตาม flow (3) ตัวชี้วัด (4) ปัญหา/ข้อเสนอแนะ จำนวนขั้นมาจากข้อมูล ไม่ hard-code
- ตัวชี้วัดมี 2 ระดับ: **Core** (ใช้ร่วมทุกระบบ) กับ **Specific** (เฉพาะระบบ เช่น ระบบแจ้งซ่อม) Admin เปิด/ปิดได้
- ไม่ใช่ทุกข้อเป็น Rating 1–5 ชนิดคำตอบที่ต้องรองรับ: `rating5, dropdown, radio, checkbox, short_text, long_text, number, date, yes_no, ranking`
- ทุกคำถามมี: `required`, `is_scored` (นับคะแนนหรือเป็นข้อมูลประกอบ), `visible_when` (เงื่อนไขแสดง), `roles` (บทบาทที่เห็น), `allow_na`, `allow_other`, `max_select`
- คะแนน: คิดเฉพาะ rating 1–5, **ไม่นำ N/A มาคิด**, แสดง n กำกับเสมอ, แปลผลตามเกณฑ์ 5 ระดับใน brief §9.2 (ปรับได้ที่ config) ห้ามสรุป "ควรปรับปรุงหรือไม่" จากค่าเฉลี่ยค่าเดียว
- แยกความคิดเห็นผู้ใช้ (perception) ออกจากสถิติจริงของระบบ ห้ามสร้างสถิติปลอมแล้วแสดงเป็นของจริง ถ้าไม่มีให้แสดง "ยังไม่มีข้อมูลจากระบบต้นทาง"
- ตรวจความขัดแย้งของคำตอบ เช่น เลือก "ไม่พบปัญหา" แล้วเลือกปัญหาอื่นไม่ได้

### 6.1 ความพึงพอใจ (Satisfaction) ต้องเป็นของจริงในทุกระบบและทุกหน้าผล

- ทุกระบบทั้ง 21 ระบบมีคำถามความพึงพอใจ = **S1–S4 (Core)** + ข้อเฉพาะระบบ 1 ข้อ (อยู่ท้าย `docs/system_specific_questions.md`) เก็บเป็น `assessment_type = satisfaction` ห้ามให้ระบบไหนไม่มีข้อความพึงพอใจ
- เหตุผล: ถ้าคำถามพึงพอใจไม่อยู่ในคลังใหม่ Dashboard จะว่างและไม่ถูกนำไปคิดสัญญาณ "ควรปรับปรุง" (เกิดขึ้นแล้วกับ mock รอบก่อน)
- Dashboard/Results ต้องมีมุมมองความพึงพอใจ: ค่าเฉลี่ย S1–S4 + ข้อเฉพาะระบบพร้อม n, แยกบทบาท, เทียบกับคะแนนประสิทธิผล (แยกให้เห็นว่าเป็นความรู้สึกผู้ใช้ ไม่ใช่หลักฐานประสิทธิภาพ)
- **สัญญาณ "ควรปรับปรุง" ต่อระบบ** คิดจากหลายปัจจัยรวมกัน ไม่ใช่ค่าเฉลี่ยเดียว (ตาม brief §7.4/§9.3):
  1. ค่าเฉลี่ยรายหมวดตัวชี้วัด (U, E, EF, D, T, R) ต่ำกว่าเกณฑ์กี่หมวด
  2. ค่าเฉลี่ยความพึงพอใจ (S) ต่ำกว่าเกณฑ์หรือไม่
  3. สัดส่วนคำตอบคะแนน ≤ 2 ในหมวดสำคัญ
  4. ปัญหาที่พบบ่อยและความต้องการปรับปรุงที่ถูกเลือกมาก
  5. จำนวนผู้ตอบ n เพียงพอหรือไม่ (n ต่ำ → "ข้อมูลยังไม่เพียงพอ")
- ผลลัพธ์เป็นระดับ เช่น `ควรปรับปรุงเร่งด่วน / ควรตรวจสอบเพิ่มเติม / จุดแข็งควรรักษา / ข้อมูลไม่เพียงพอ` พร้อม **รายการเหตุผล** ที่ทำให้ได้ระดับนั้น เกณฑ์ทุกตัวเป็น config ที่ Admin ปรับได้ (ค่าเริ่มต้นให้ Agent ตั้งและจดใน `docs/decisions.md`) ห้าม hard-code และห้ามตั้งผ่าน/ไม่ผ่านโดยไม่มีเกณฑ์

## 7. Database

หลักการ: **เพื่อนร่วมทีม `git pull` แล้วได้ฐานข้อมูลที่ mock เสร็จและรันได้ทันที**

- ใช้ SQLite `database/evaluator.db` เป็น baseline ที่ commit ได้ (ได้รับอนุญาตเต็มที่ให้แก้ schema/seed/mock/ตัว .db)
- ทำให้ **สร้างซ้ำได้จากไฟล์ข้อความ**: `schema.sql` + `seed.sql` + `questions_seed.sql` + `mock/mock-data.sql` แล้วมีสคริปต์ `database/build/build-db.cjs` ประกอบเป็น `evaluator.db` ได้ผลเหมือนกันทุกครั้ง (git diff ของ .db อ่านไม่ได้ จึงต้องมีต้นทางที่เป็นข้อความ)
- `schema.sql` เป็นต้นทางเดียวของโครงสร้าง (ของเดิมหลุดกับ `.db` อยู่ ไม่ต้องพยายามให้เข้ากับของเก่า เขียนใหม่ให้สะอาดแล้วสร้าง .db จากมัน)
- แก้ schema ได้ตรง ๆ ที่ `schema.sql` แล้ว rebuild DB ใหม่ได้เลย ไม่ต้องทำ migration เพื่อรักษาข้อมูลเก่า และไม่ต้องสำรอง .db (ใช้ git แทน) เป้าหมายคือ DB ใหม่ที่สะอาดและตรงกับ `schema.sql`
- ก่อน commit .db ตรวจว่า: `PRAGMA integrity_check = ok`, `foreign_key_check` ว่าง, `auth_sessions` ว่าง (ปัจจุบันใน repo มีค้าง 5 แถว ให้ล้าง), ไม่มี `-journal/-wal`
- Mock data: ใช้ marker `mock-*` / `mock_*` ต่อไป, สร้างแบบ deterministic, ครอบคลุม 21 ระบบ **ทั้งคำตอบประสิทธิผลและความพึงพอใจ** (ทุกระบบต้องมีข้อมูล S) และให้คะแนนมีความต่างระหว่างระบบ (บางระบบสูง บางระบบกลาง บางระบบต่ำ) เพื่อให้สัญญาณ "ควรปรับปรุง" แสดงครบทุกระดับ, **ต้องสอดคล้องกับ conditional logic จริง** (คนที่ตอบ "ไม่เคยใช้ระบบเดิม" ต้องไม่มีคำตอบเปรียบเทียบ, ผู้ตอบแต่ละบทบาทตอบเฉพาะข้อของบทบาทนั้น, ไม่เลือก "ไม่พบปัญหา" คู่กับปัญหาอื่น) และห้ามรายงานว่าเป็นผลจริง
- ผลตอบ: เก็บ `form_version` ทุกชุดคำตอบ ไม่ต้องห่วงเรื่องรักษาผลเก่า
- เก็บรหัสระบบกับชื่อแยกฟิลด์ (`SYS001` + ชื่อ) ผู้ตอบ "บทบาท" ในขั้นที่ 2 เป็นคำตอบ แยกจากบทบาทบัญชี (`users.role`) อย่าแก้ `users.role`
- อัปเดต `database/README.md` ให้ตรงกับของจริงทุกครั้งที่เปลี่ยน รวมวิธี "pull แล้วเริ่มใช้" และวิธี rebuild/reset

### 7.1 ข้อมูลเก่า กับทางที่หน้าจอดึงข้อมูล (สำคัญ)

ปัจจุบันหน้าเว็บดึงข้อมูลได้ **2 ทาง** และทั้งสองทางยังเป็นรูปแบบเก่า (คำถาม likert5 ล้วน, คำตอบก่อน/หลังเป็น array 10 ข้อ, role แค่ student/teacher/staff):

| ทาง | ใช้เมื่อ | ต้นทางข้อมูล |
|---|---|---|
| A. Backend API | ใช้งานปกติ (backend รันอยู่) | `database/evaluator.db` |
| B. Demo mode (`?demo=1`) | Admin ดูตัวอย่างโดยไม่ต้องรัน backend | `frontend/assets/data/mock-snapshot.js` (export จาก .db โดย `export-mock-snapshot.cjs`) |

กฎ:
1. **ข้อมูลทั้งสองทางต้องมาจากชุดเดียวกัน** คือ `evaluator.db` ใหม่ ทางลัดที่แยกข้อมูลกันเองห้ามมี
2. `mock-snapshot.js` ต้องมีรูปแบบ JSON **เท่ากับที่ backend ตอบ** (`/systems`, `/questions`, `/evaluations` ฯลฯ ในรูปแบบใหม่) ให้ frontend ใช้โค้ดชุดเดียวอ่านได้ทั้งสองทาง และมี test ตรวจว่า snapshot = ข้อมูลใน .db (มีอยู่แล้วที่ `tests/database/mock-snapshot.test.cjs` ให้ปรับ)
3. หลังเปลี่ยนโครงสร้าง ต้อง regenerate snapshot ทุกครั้ง (`node database/mock/export-mock-snapshot.cjs`) ไม่แก้ด้วยมือ
4. **ของเก่าที่ต้องจัดการ (ไม่ปล่อยค้างปนกับของใหม่):**
   - ใน DB: คำถามเก่า likert5 ทั้งหมด (รวม generic ที่ `system_id` NULL และ duplicate ที่ `active=0`) และ mock เก่า (`mock-*`/`mock_*`) **ให้ลบทิ้งแล้วสร้างใหม่** ไม่ต้อง flag legacy หรือเก็บไว้ ห้ามให้มีคำถามเก่าปนกับใหม่
   - ใน JS: ไฟล์ที่ผูกกับรูปแบบเก่าต้องปรับหรือเลิกใช้ ได้แก่ `core/systems-data.js` (รายชื่อ/ข้อความเดิม), `user/effectiveness-examples.js` (ตัวอย่างตัวชี้วัดเดิม), `user/quantitative*.js`, `user/evaluation-locale.js` (คำแปลของคำถามเดิม), `admin/effectiveness-scoring.js` และ comment schema ใน `core/api.js` (before/after 10 ข้อ) ทุกที่ที่ hard-code ข้อความคำถามหรือจำนวนข้อ ให้เปลี่ยนไปอ่านจาก API/snapshot
   - หลังเปลี่ยน ใช้ `grep` ตรวจว่าไม่มีโค้ดอ่าน field เก่าหรือคำถามเก่าเหลืออยู่ แล้วรายงานรายการที่ลบ/ย้าย
5. ข้อมูลใหม่ที่หน้าจอต้องแสดงจาก mock: ฟอร์มผู้ใช้ (คำถามจาก DB), หน้า Admin ทั้งภาพรวมและผลรายระบบ (ผล mock ใหม่) ถ้า demo mode ยังแสดงข้อมูลเก่า ถือว่างานไม่เสร็จ

## 8. Backend (C++ `backend/src/main.cpp`)

- อนุญาตให้แก้ **เท่าที่จำเป็น** เพื่อรองรับชนิดคำถามใหม่และ schema ใหม่ (เช่น `/questions` คืนฟิลด์ใหม่, `/questions/replace` ที่ปัจจุบัน hard-code `likert5`, `/evaluations` บันทึกคำตอบหลายชนิด) แล้วรายงานจุดที่แก้
- แก้ API ได้ตามที่ต้องการ ไม่ต้อง backward compatible กับฟอร์มเก่า (ฟอร์มเก่าถูกแทนที่อยู่แล้ว) ใช้ parameterized SQL, transaction สำหรับการเขียนที่เกี่ยวข้องกัน, validate ฝั่ง server
- Backend build ด้วย Windows (winsock, `.exe`) ถ้า sandbox ที่ทำงานคอมไพล์ไม่ได้ ให้บอกตรง ๆ ว่า "ยังไม่ได้ compile/ทดสอบ" ห้ามบอกว่าผ่าน
- การตรวจสิทธิ์ admin ต้องอยู่ที่ backend ไม่ใช่แค่ JavaScript

## 9. Frontend

- ใช้ตัว render คำถามตัวเดียวแยกตาม `answer_type` และ engine เงื่อนไข (`visible_when`) เป็น pure function ที่มี test ไม่ copy ไปหลายหน้า
- ใช้ `tokens.css`, shared header/sidebar, `runtime-url.js` ตามกฎใน §3
- รองรับ keyboard + touch, ใช้ได้ที่ 1280px และ 390px, ไม่มี 404/console error
- ไม่ต้องรองรับ draft เก่า ใช้ชื่อ key ของ draft ใหม่ ของเก่าทิ้งได้

## 10. Git

- ทำงานบน branch (`Dev` หรือ `phase-N-*`) ถ้าอยู่บน `main/master` ให้สร้าง branch ใหม่เองได้เลย ผู้ใช้จะ rollback เองด้วย git ดังนั้น **commit เป็น checkpoint ทุกครั้งที่จบ phase** เพื่อให้ย้อนได้เป็นขั้น
- commit ทุกครั้งที่จบ sub-task ที่ test ผ่าน ข้อความ `feat|fix|refactor|docs|chore(scope): summary` ถ้า test แดงเพราะของเดิมที่ไม่เกี่ยวกับงาน ให้ระบุในรายงาน
- `git add` ระบุ path ชัดเจน (ไม่ใช้ `add -A`/`add .`) ตรวจ `git diff --cached --stat` ก่อน commit
- **ห้าม** `git push`, `--force`, `reset --hard`, `clean -fd`, `stash drop`, rewrite history (ผู้ใช้เป็นคน push เอง)
- ไฟล์ที่ห้าม commit: `.exe`, `*.bak`, `node_modules`, `.db` อื่นนอกจาก `database/evaluator.db` ที่ผ่านเช็กลิสต์ใน §7

## 11. Testing

- Frontend: `node --test "frontend/assets/js/**/*.test.cjs"`  /  Database + mock: `node --test "tests/**/*.test.cjs"`
- เพิ่ม test ให้ส่วนใหม่ที่เป็น logic (conditional engine, scoring, validator ของ question-bank, ความสอดคล้องของ mock) ใช้ DB/fixture แยก ห้ามลบข้อมูลจริงเพื่อให้ test ผ่าน
- รายงานตามจริงว่า test ไหนรัน/ไม่ได้รัน
- ก่อนปิด phase ที่แตะ DB/UI ตรวจ: ล็อกอินได้, ฟอร์มโหลดคำถามถูกระบบ, ส่งแล้วบันทึกจริง, Admin เห็นผล, เพิ่ม/ปิดคำถามผ่าน Admin แล้วฟอร์มกับ Dashboard เปลี่ยนตาม, non-admin ถูกปฏิเสธที่ backend

## 12. รายงานท้ายงาน (สั้น)

1. ไฟล์ที่เปลี่ยน/สร้าง/ลบ  2. พฤติกรรมที่เปลี่ยน  3. test ที่รัน + ผล  4. การตัดสินใจที่เลือกเอง (ลิงก์ `docs/decisions.md`)  5. สิ่งที่ค้าง  6. ถ้าแตะ DB: ขั้นตอนให้เพื่อนร่วมทีม pull แล้วใช้ต่อ

## 13. ข้อควรหลีกเลี่ยง

1. เขียนคำถามลงในโค้ด/HTML/JS แทนที่จะอยู่ใน DB
2. แก้ไฟล์ที่ถูก generate ด้วยมือ แล้ว regenerate ทับหาย
3. เก็บโค้ด/ข้อมูลเก่าไว้ปนกับของใหม่ "เผื่อใช้" จนหน้าจอดึงผิดชุด
3.1 ลืมใส่คำถาม/ข้อมูลความพึงพอใจของบางระบบ ทำให้ Dashboard ว่างหรือสัญญาณ "ควรปรับปรุง" ไม่ครบ
4. commit `evaluator.db` ที่มี session ค้างหรือรันค้างอยู่
5. Mock ที่ขัดกับเงื่อนไขของแบบประเมิน ทำให้สถิติผิดเพี้ยน
6. คิดคะแนนรวมคำถามคนละชนิด/คนละลักษณะเข้าด้วยกันโดยไม่มีเหตุผล
7. แก้ path ใน HTML อย่างเดียวแล้วลืม CSS `url()`, `fetch`, redirect และ URL ที่สร้างใน JS
8. ใช้ hover อย่างเดียว (ต้องใช้ได้ทั้ง keyboard และ touch)

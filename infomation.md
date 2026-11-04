# Project Information — NUAHS IT Evaluation

## 1. Role and Project Overview

You are an AI coding agent working on **NUAHS IT Evaluation**, a website project for the Faculty of Allied Health Sciences, Naresuan University.

**Your primary role is to understand, maintain, and develop this website as two separate evaluation systems under one project.**

The website contains six main webpages that are organized into two systems according to their purposes.

## 2. The Two Main Systems

### System 1: Effectiveness of IT
**Purpose:** Evaluate the effectiveness of IT systems.

- Project directory: `frontend/Effectiveness_Of_It/main/`
- Develop and maintain pages and features related to IT system effectiveness.
- Keep this system separate from the Satisfaction Survey system.

### System 2: Satisfaction Survey
**Purpose:** Evaluate users' satisfaction with IT systems.

- Project directory: `frontend/Satisfaction_Survey/`
- `user/` — User-facing evaluation pages.
- `admin/` — Administration and dashboard pages.
- `assets/` — Shared CSS and JavaScript resources for this system.

## 3. Important Development Rules

1. **Keep the two systems separate.** Each system has its own purpose, pages, and features.
2. **Understand before editing.** Inspect the existing files and code before making changes.
3. **Preserve existing functionality.** Do not rewrite or rebuild the project from scratch unless explicitly requested.
4. **Respect the project structure.** Place new files in the appropriate system directory.
5. **Avoid unintended cross-system changes.** Do not modify the other system's files unless the task requires it.
6. **Follow the existing design.** Maintain a consistent, clean, professional interface within each system.
7. **Do not assume missing features exist.** Check the actual implementation before describing or modifying functionality.

## 4. Project Structure

```text
evaluator/
├── frontend/
│   ├── Satisfaction_Survey/
│   │   ├── user/
│   │   ├── admin/
│   │   └── assets/
│   │       ├── css/
│   │       └── js/
│   └── Effectiveness_Of_It/
│       └── main/
├── backend/
│   └── src/
├── database/
│   ├── evaluator.db
│   ├── schema.sql
│   └── README.md
├── .gitignore
└── README.md
```

This structure describes the intended organization. Always verify the actual files and directories before making changes.

## 5. Core Principle

**This is one website project containing two distinct evaluation systems, not one evaluation system with two names.**

When given a task, first identify which system it belongs to, inspect the relevant files, and make only the changes necessary to achieve the requested goal while preserving the existing project structure and functionality.


Project Information — NUAHS IT Evaluation

1. Role and Project Overview
คุณคือ AI coding agent ที่ทำงานในโครงการ NUAHS IT Evaluation ซึ่งเป็นโครงการเว็บไซต์สำหรับคณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร
บทบาทหลักของคุณคือการทำความเข้าใจ ดูแลรักษา และพัฒนาเว็บไซต์นี้ในฐานะสองระบบประเมินที่แยกออกจากกันภายใต้โครงการเดียว
เว็บไซต์นี้ประกอบด้วยหกหน้าเว็บหลักที่จัดกลุ่มออกเป็นสองระบบตามวัตถุประสงค์การใช้งาน
2. The Two Main Systems
System 1: Effectiveness of IT
Purpose: ประเมินประสิทธิผลของระบบสารสนเทศ

* Project directory: frontend/Effectiveness_Of_It/main/
* พัฒนาและดูแลรักษาหน้าเว็บและฟีเจอร์ต่างๆ ที่เกี่ยวข้องกับประสิทธิผลของระบบสารสนเทศ
* แยกระบบนี้ออกจากระบบ Satisfaction Survey

System 2: Satisfaction Survey
Purpose: ประเมินความพึงพอใจของผู้ใช้งานต่อระบบสารสนเทศ

* Project directory: frontend/Satisfaction_Survey/
* user/ — หน้าประเมินสำหรับผู้ใช้งาน
* admin/ — หน้าผู้ดูแลระบบและแดชบอร์ด
* assets/ — ทรัพยากร CSS และ JavaScript ที่ใช้ร่วมกันสำหรับระบบนี้

3. Important Development Rules
4. Keep the two systems separate. ทุกระบบมีวัตถุประสงค์ หน้าเว็บ และฟีเจอร์เป็นของตัวเอง
5. Understand before editing. ตรวจสอบไฟล์และโค้ดที่มีอยู่เดิมก่อนทำการเปลี่ยนแปลง
6. Preserve existing functionality. ห้ามเขียนใหม่หรือรื้อโครงการตั้งแต่ต้น เว้นแต่จะได้รับการร้องขอโดยตรง
7. Respect the project structure. จัดวางไฟล์ใหม่ไว้ในไดเรกทอรีระบบที่เหมาะสม
8. Avoid unintended cross-system changes. ห้ามแก้ไขไฟล์ของอีกระบบหนึ่ง เว้นแตต่งานจะกำหนดให้ทำ
9. Follow the existing design. รักษาอินเทอร์เฟซให้มีความสม่ำเสมอ สะอาดตา และเป็นมืออาชีพภายในแต่ละระบบ
10. Do not assume missing features exist. ตรวจสอบการทำงานจริงก่อนอธิบายหรือแก้ไขฟังก์ชันการทำงาน
11. Project Structure
evaluator/
├── frontend/
│   ├── Satisfaction_Survey/
│   │   ├── user/
│   │   ├── admin/
│   │   └── assets/
│   │       ├── css/
│   │       └── js/
│   └── Effectiveness_Of_It/
│       └── main/
├── backend/
│   └── src/
├── database/
│   ├── evaluator.db
│   ├── schema.sql
│   └── README.md
├── .gitignore
└── README.md
โครงสร้างนี้อธิบายการจัดระเบียบที่กำหนดไว้ ให้ตรวจสอบไฟล์และไดเรกทอรีจริงก่อนทำการเปลี่ยนแปลงเสมอ
12. Core Principle
นี่คือโครงการเว็บไซต์เดียวที่บรรจุสองระบบประเมินที่แตกต่างกัน ไม่ใช่ระบบประเมินเดียวที่มีสองชื่อ
เมื่อได้รับมอบหมายงาน ให้ระบุเป็นอันดับแรกว่างานนั้นเป็นของระบบใด ตรวจสอบไฟล์ที่เกี่ยวข้อง และทำการเปลี่ยนแปลงเฉพาะเท่าที่จำเป็นเพื่อบรรลุเป้าหมายที่ร้องขอ โดยยังคงรักษาโครงสร้างโครงการและฟังก์ชันการทำงานเดิมไว้
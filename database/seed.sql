INSERT OR IGNORE INTO systems(id, name, name_en, sort_order, has_tracking) VALUES
('SYS001','รายชื่อบุคลากร','Personnel Directory',1,0),
('SYS002','ระบบลาออนไลน์','Online Leave System',2,1),
('SYS003','ลงเวลาปฏิบัติงาน','Time & Attendance System',3,0),
('SYS004','ฐานข้อมูลงานวิจัย','Research Database',4,0),
('SYS005','คุณสมบัติอาจารย์ผู้รับผิดชอบหลักสูตร','Program Director Qualifications',5,0),
('SYS006','AHS KM Hub','AHS KM Hub',6,0),
('SYS007','ภาระงานสายวิชาการ','Academic Staff Workload',7,1),
('SYS008','ภาระงานสายสนับสนุน','Support Staff Workload',8,1),
('SYS009','แผนปฏิบัติการประจำปี','Annual Action Plan',9,1),
('SYS010','ระบบ KPI / แผนกลยุทธ์','KPI & Strategic Plan System',10,1),
('SYS011','ระบบรับส่งหนังสือ','Document Dispatch System',11,1),
('SYS012','กรรมการภายในต่างๆ','Internal Committees System',12,0),
('SYS013','ระบบเสนอของบอิเล็กทรอนิกส์','Electronic Budget Proposal System',13,1),
('SYS014','AHS eForm','AHS eForm',14,1),
('SYS015','ดาวน์โหลดแบบฟอร์ม','Form Downloads',15,0),
('SYS016','ระบบบริหารจัดการอาคารและห้อง','Building & Room Management System',16,1),
('SYS017','ระบบบริหารจัดการครุภัณฑ์','Asset & Equipment Management System',17,1),
('SYS018','ระบบซ่อมและบำรุงรักษา','Repair & Maintenance System',18,1),
('SYS019','ระบบขอรับบริการจากหน่วยประชาสัมพันธ์','Public Relations Service Request',19,1),
('SYS020','ระบบลูกหนี้เงินยืม','Loan Debtors System',20,1),
('SYS021','ระบบ AHS e-donation','AHS e-Donation System',21,1);

-- Bootstrap administrator account requested for initial access.
INSERT OR IGNORE INTO users(id, username, display_name, role, password_hash, password_salt, password_iterations, created_at)
VALUES ('00000000', 'Admin', 'Admin', 'admin', 'cc3de12561d96c61e93402757182d018495425e492dd7f6934fd79158aa23cdd', '00000000000000000000000000000000', 120000, '2026-11-12T00:00:00Z');

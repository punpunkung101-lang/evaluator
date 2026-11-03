# Task: Design Effectiveness of IT Homepage Based on AHS NU Website

Please develop the homepage for the **Effectiveness_Of_It** project, using the uploaded `ahs.nu.ac.th` website source code as the primary design reference.

**Target directory:**
`frontend/Effectiveness_Of_It/main/`

## 1. Reference Website and Design

Use the uploaded AHS NU website as a reference for the overall design.

Study its existing HTML, CSS, layout, navigation, header, typography, spacing, colors, hover effects, and responsive behavior before implementation.

The new website should look and feel similar to the official Faculty of Allied Health Sciences website at Naresuan University.

Use the faculty's Thai name:

**คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร**

Do not simply copy the original website. Adapt its design to our evaluation system.

## 2. Top Header

Create a top header with the following elements:

**Left section:**
- University/faculty logo.
- Use this image: `./frontend/Public/Nu_bage.png`
- Display the faculty name: คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร.

**Right section:**
Arrange these controls:
- Contact Us button.
- Dark Theme / Light Theme toggle.
- Thai / English language toggle.
- User Login button.

The Login button should allow users to access the login page or login interface.

Keep the header clean and consistent with the reference website.

## 3. Main Navigation Bar

Create a navigation bar similar to the original website.

For the Thai version, use these four main navigation items:

### 1. หน้าหลัก
- Navigate to the homepage.

### 2. เกี่ยวกับ
- Display a dropdown menu when hovering over it.
- Include two items:
  - ประเมินประสิทธิผลระบบ IT
  - ประเมินความพึงพอใจ

### 3. ประสิทธิผลระบบ
- Display a dropdown menu when hovering over it.
- Include the following 21 evaluation systems:

```html
<option value="SYS001">SYS001 - รายชื่อบุคลากร</option>
<option value="SYS002">SYS002 - ระบบลาออนไลน์</option>
<option value="SYS003">SYS003 - ลงเวลาปฏิบัติงาน</option>
<option value="SYS004">SYS004 - ฐานข้อมูลงานวิจัย</option>
<option value="SYS005">SYS005 - คุณสมบัติอาจารย์ผู้รับผิดชอบหลักสูตร</option>
<option value="SYS006">SYS006 - AHS KM Hub</option>
<option value="SYS007">SYS007 - ภาระงานสายวิชาการ</option>
<option value="SYS008">SYS008 - ภาระงานสายสนับสนุน</option>
<option value="SYS009">SYS009 - แผนปฏิบัติการประจำปี</option>
<option value="SYS010">SYS010 - ระบบ KPI / แผนกลยุทธ์</option>
<option value="SYS011">SYS011 - ระบบรับส่งหนังสือ</option>
<option value="SYS012">SYS012 - กรรมการภายในต่างๆ</option>
<option value="SYS013">SYS013 - ระบบเสนอของบอิเล็กทรอนิกส์</option>
<option value="SYS014">SYS014 - AHS eForm</option>
<option value="SYS015">SYS015 - ดาวน์โหลดแบบฟอร์ม</option>
<option value="SYS016">SYS016 - ระบบบริหารจัดการอาคารและห้อง</option>
<option value="SYS017">SYS017 - ระบบบริหารจัดการครุภัณฑ์</option>
<option value="SYS018">SYS018 - ระบบซ่อมและบำรุงรักษา</option>
<option value="SYS019">SYS019 - ระบบขอรับบริการจากหน่วยประชาสัมพันธ์</option>
<option value="SYS020">SYS020 - ระบบลูกหนี้เงินยืม</option>
<option value="SYS021">SYS021 - ระบบ AHS e-donation</option>
```

Each item must be clickable and navigate to its corresponding evaluation page.

Use existing project routes or configuration if available. Do not invent external URLs.

### 4. ประเมินความพึงพอใจ
- Display a dropdown menu on hover.
- Use this menu to access the satisfaction evaluation section.

## 4. Main Content Section: Evaluation Services

Create a content section inspired by the original AHS NU website's service/platform section.

Use this section title:

**การเรียนรู้ตลอดชีพ**

However, instead of displaying four service items like the original website, display only two large service cards.

### Card 1: ประเมินประสิทธิผลระบบ IT
- Use image: `./frontend/Public/S1`
- Title: ประเมินประสิทธิผลระบบ IT
- Provide a short description.
- Make the entire card clickable.
- Navigate to the existing IT effectiveness evaluation page.

### Card 2: ประเมินความพึงพอใจ
- Use image: `./frontend/Public/S2`
- Title: ประเมินความพึงพอใจ
- Provide a short description.
- Make the entire card clickable.
- Navigate to:

`./frontend/Satisfaction_Survey/user/index.html`

Use the original AHS NU website's card layout, image presentation, spacing, hover animations, and visual hierarchy as design inspiration.

## 5. CSS and Visual Design

Make the CSS closely resemble the reference website.

Pay particular attention to:

- Header height and alignment.
- Navigation bar appearance.
- Dropdown menus and hover animations.
- Font family and typography.
- Background colors.
- Content width and spacing.
- Image proportions and card layouts.
- Shadows, borders, and hover transitions.
- Responsive layout for desktop, tablet, and mobile.

Avoid unnecessary modern redesigns that make the page look completely different from the reference.

## 6. Dark Mode and Language Support

Implement functional controls:

**Theme**
- Light Theme
- Dark Theme
- Apply the selected theme consistently across the entire page.

**Language**
- Thai (TH)
- English (EN)
- Translate navigation labels, section titles, card titles, descriptions, and other visible text.
- Use a centralized translation object or dictionary rather than duplicating HTML pages.

## 7. Technical Requirements

1. Work only inside `frontend/Effectiveness_Of_It/main/`, unless an existing shared resource must be referenced.
2. Inspect the existing project structure before making changes.
3. Reuse existing assets and code where appropriate.
4. Keep the Satisfaction_Survey project unchanged.
5. Do not modify backend or database.
6. Do not break existing evaluation functionality.
7. Use relative paths correctly.
8. Ensure all navigation links work.
9. Make dropdowns usable on both desktop and mobile (hover and click/tap).
10. Keep the code organized and maintainable.

## 8. Final Verification

After implementation:

- Verify that the logo loads correctly.
- Verify that S1 and S2 images load correctly.
- Test all four navigation items.
- Test all 21 system dropdown entries.
- Test both language modes.
- Test Dark Mode and Light Mode.
- Test the Login and Contact Us controls.
- Verify that the satisfaction card navigates to the correct existing page.
- Check the layout on desktop and mobile.

Finally, provide a short summary of the files created or modified and any remaining issues.

**Important:** Focus on faithfully adapting the original AHS NU website's visual design while making the new homepage functional as an evaluation-system portal.
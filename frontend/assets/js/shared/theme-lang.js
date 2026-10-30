/**
 * IT Evaluator - Centralized Theme & i18n Language Controller
 * Faculty of Allied Health Sciences, Naresuan University
 *
 * Features:
 *  - Centralized TH/EN translation dictionary
 *  - Global `t(key, params)` helper
 *  - DOM translation via `data-i18n`, `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-aria`, etc.
 *  - Dark / Light theme toggle (persisted in localStorage)
 *  - TH / EN language switch (persisted in localStorage)
 *  - Dynamic page re-translation without page reloading
 *  - Top-right floating toolbar injection
 *  - Admin session detection for login/user display
 */

(function () {
    "use strict";

    /* =====================================================================
       CENTRALIZED TRANSLATION DICTIONARY
       ===================================================================== */
    const i18n = {
        th: {
            // General & Common
            app_title: "IT Evaluator",
            app_subtitle: "ระบบประเมินประสิทธิภาพและประสิทธิผลของระบบเทคโนโลยีสารสนเทศ",
            institution: "คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร",
            footer_text: "ระบบประเมินประสิทธิภาพ IT © 2026 | คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร",
            login: "เข้าสู่ระบบ",
            logout: "ออกจากระบบ",
            admin: "ผู้ดูแลระบบ",
            darkMode: "โหมดมืด",
            lightMode: "โหมดสว่าง",
            langLabel: "EN",
            lang_toggle: "EN",
            back_to_categories: "กลับสู่หน้ารายการหมวดหมู่",
            back_to_systems: "กลับสู่หน้ารายการระบบ IT",
            back_to_dashboard: "กลับสู่แดชบอร์ดหลัก",
            back_to_user_portal: "กลับสู่หน้าผู้ใช้งานทั่วไป",
            next: "ข้อถัดไป",
            previous: "ย้อนกลับ",
            submit: "ส่งผลการประเมิน",
            cancel: "ยกเลิก",
            close: "ปิด",
            dismiss: "ปิดข้อความ",
            details: "รายละเอียด",
            loading: "กำลังโหลดข้อมูล...",
            checking_system: "กำลังตรวจสอบข้อมูลระบบ...",
            system_code: "รหัสระบบ: {code}",
            systems_count: "{count} ระบบ",
            users_count: "{count} คน",
            items_count: "{count} รายการ",
            score_out_of_5: "{score} / 5",
            score_full_5: "คะแนนเต็ม 5.00",
            no_data: "ไม่มีข้อมูล",

            // Roles
            role_select_prompt: "-- โปรดเลือกประเภทผู้ใช้งาน --",
            role_student: "นิสิต",
            role_teacher: "อาจารย์ / นักวิจัย",
            role_staff: "บุคลากรสายสนับสนุน",
            role_all: "ผู้ประเมินทุกกลุ่ม",

            // Gallery (user/index.html)
            gallery_title: "ระบบประเมินประสิทธิภาพและประสิทธิผลของระบบ IT | คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร",
            gallery_section_title: "เลือกหมวดหมู่ระบบสารสนเทศที่ต้องการประเมิน",
            gallery_view_systems: "เข้าสู่ระบบ",
            gallery_aria_item: "{name} มี {count} ระบบ",

            // Systems Directory (user/systems.html)
            systems_page_title: "รายการระบบเทคโนโลยีสารสนเทศ | IT Evaluator",
            systems_page_desc: "กรุณาเลือกระบบสารสนเทศที่ท่านเคยใช้งานเพื่อเริ่มทำแบบประเมิน",
            systems_aria_card: "เข้าสู่แบบประเมิน {name} รหัส {id}",
            category_not_found: "ไม่พบข้อมูลหมวดหมู่",
            category_not_found_desc: "ไม่พบรหัสหมวดหมู่ระบบสารสนเทศที่ระบุ",

            // Evaluation (user/evaluation.html)
            evaluation_page_title: "แบบประเมินประสิทธิภาพระบบ IT | IT Evaluator",
            evaluation_header: "แบบประเมินประสิทธิภาพและประสิทธิผลระบบ IT",
            evaluator_profile_title: "ข้อมูลผู้ประเมิน",
            evaluator_profile_desc: "โปรดระบุข้อมูลเบื้องต้นเพื่อใช้ประกอบการวิเคราะห์ทางสถิติของหน่วยงาน",
            evaluator_name_label: "ชื่อ-นามสกุล หรือ รหัสผู้ใช้งาน",
            evaluator_name_placeholder: "กรอกชื่อ-นามสกุล หรือนามสมมุติ",
            evaluator_role_label: "ประเภทบุคลากร / ผู้ใช้งาน",
            evaluator_start_btn: "เริ่มต้นการประเมิน",
            evaluator_role_required: "กรุณาเลือกประเภทผู้ใช้งาน",
            anonymous_evaluator: "ผู้ใช้งานไม่ประสงค์ออกนาม",
            system_not_found: "ไม่พบระบบ IT ที่เลือก",
            phase_1_label: "ช่วงที่ 1: ก่อนการนำระบบ IT มาใช้ (การปฏิบัติงานเดิม)",
            phase_2_label: "ช่วงที่ 2: หลังการนำระบบ IT มาใช้ (ปัจจุบัน)",
            phase_1_desc: "โปรดพิจารณาการปฏิบัติงานตามวิธีการทำงานเดิม ก่อนเริ่มนำระบบ IT เข้ามาใช้งาน",
            phase_2_desc: "โปรดพิจารณาความสะดวก รวดเร็ว และประสิทธิภาพในการปฏิบัติงานจริงผ่านระบบ IT นี้",
            question_counter: "ข้อที่ {current} / {total}",
            question_caption: "เกณฑ์การประเมินประสิทธิภาพ",
            rating_prompt: "โปรดเลือกระดับความคิดเห็น",
            rating_skipped: "ระบุ: ไม่สามารถประเมินได้ (ข้ามข้อนี้)",
            rating_point_label: "{score} คะแนน — {label}",
            rating_scale_1: "น้อยที่สุด",
            rating_scale_2: "น้อย",
            rating_scale_3: "ปานกลาง",
            rating_scale_4: "มาก",
            rating_scale_5: "มากที่สุด",
            skip_title: "ไม่สามารถประเมินข้อนี้ได้?",
            skip_desc: "หากท่านไม่เคยมีประสบการณ์ในขั้นตอนดังกล่าว หรือไม่ทราบข้อมูลเกี่ยวกับข้อคำถามนี้ สามารถกดปุ่มด้านล่างเพื่อข้ามข้อนี้ได้ โดยระบบจะไม่นำคำถามนี้ไปคำนวณถ่วงน้ำหนัก",
            skip_btn: "ข้ามคำถามข้อนี้ (ไม่มีข้อมูล / ไม่เคยปฏิบัติงาน)",
            btn_to_phase_2: "ไปยังช่วงที่ 2 (หลังใช้ระบบ IT)",
            btn_to_results: "ดูผลการเปรียบเทียบ",
            result_title: "สรุปผลการเปรียบเทียบประสิทธิภาพ",
            result_subtitle: "ผลต่างคะแนนเฉลี่ยระหว่างก่อนและหลังการนำระบบ IT มาใช้ในการปฏิบัติงาน",
            score_before_system: "คะแนนเฉลี่ยก่อนใช้ระบบ",
            score_after_system: "คะแนนเฉลี่ยหลังใช้ระบบ",
            direction_increase: "เพิ่มขึ้น",
            direction_decrease: "ลดลง",
            direction_same: "คงที่",
            score_diff_summary: "คะแนนเฉลี่ย{direction} {diff} คะแนน",
            score_diff_percentage: "คิดเป็นผลต่าง {pct} จุดเปอร์เซ็นต์ (คำนวณจาก {count} ข้อคำถามที่ตอบครบทั้งสองช่วง)",
            score_no_comparison: "ไม่สามารถเปรียบเทียบได้",
            score_no_comparison_desc: "ไม่มีข้อคำถามที่ได้รับการประเมินครบทั้งช่วงก่อนและหลังการใช้งาน",
            btn_restart: "ทำแบบประเมินใหม่อีกครั้ง",
            btn_to_satisfaction: "ดำเนินการประเมินความพึงพอใจต่อ",

            // 10 Evaluation Questions
            eval_q1: "สามารถดำเนินงานให้เสร็จได้อย่างรวดเร็ว",
            eval_q2: "สามารถดำเนินงานได้สะดวก ไม่ยุ่งยาก",
            eval_q3: "ขั้นตอนการดำเนินงานมีความกระชับ ไม่ซับซ้อน",
            eval_q4: "สามารถดำเนินงานได้อย่างถูกต้อง",
            eval_q5: "การดำเนินงานมีข้อผิดพลาดน้อย",
            eval_q6: "สามารถดำเนินงานโดยใช้เอกสารกระดาษน้อย",
            eval_q7: "สามารถตรวจสอบหรือติดตามสถานะงานได้ง่าย",
            eval_q8: "สามารถค้นหาและเข้าถึงข้อมูลที่จำเป็นได้สะดวก",
            eval_q9: "สามารถดำเนินงานจนบรรลุวัตถุประสงค์ที่ต้องการ",
            eval_q10: "สามารถดำเนินงานได้อย่างมีประสิทธิภาพโดยรวม",

            // Criteria Short Names (Dashboard Chart)
            crit_1: "ความรวดเร็ว",
            crit_2: "ความสะดวก",
            crit_3: "ขั้นตอนกระชับ",
            crit_4: "ความถูกต้อง",
            crit_5: "ข้อผิดพลาดน้อย",
            crit_6: "ใช้กระดาษน้อย",
            crit_7: "ติดตามงานง่าย",
            crit_8: "เข้าถึงข้อมูลง่าย",
            crit_9: "บรรลุวัตถุประสงค์",
            crit_10: "ประสิทธิภาพโดยรวม",

            // Satisfaction (user/satisfaction.html)
            sat_page_title: "แบบประเมินความพึงพอใจการใช้งานระบบ IT | IT Evaluator",
            sat_header: "แบบประเมินความพึงพอใจต่อระบบ IT",
            sat_subtitle: "ความพึงพอใจหลังการใช้งานระบบ",
            sat_prompt: "โปรดเลือกระดับความพึงพอใจ",
            sat_rating_label: "{score} คะแนน — ระดับ{label}",
            sat_level_1: "น้อยที่สุด",
            sat_level_2: "น้อย",
            sat_level_3: "ปานกลาง",
            sat_level_4: "มาก",
            sat_level_5: "มากที่สุด",
            btn_to_feedback: "ไปยังข้อเสนอแนะเพิ่มเติม",
            feedback_title: "ข้อเสนอแนะเพื่อการพัฒนาระบบ",
            feedback_desc: "ท่านมีข้อคิดเห็นหรือข้อเสนอแนะเพิ่มเติมเพื่อปรับปรุงระบบ IT นี้หรือไม่",
            feedback_placeholder: "พิมพ์ข้อเสนอแนะของท่านที่นี่ (ไม่บังคับระบุ)",
            char_counter: "{count} / 250 ตัวอักษร",
            btn_submit_eval: "บันทึกและส่งผลการประเมิน",
            sat_success_title: "บันทึกผลการประเมินสำเร็จ",
            sat_score_label: "คะแนนความพึงพอใจเฉลี่ยของท่าน",
            sat_success_msg: "ระบบได้บันทึกข้อมูลผลการประเมินประสิทธิภาพและระดับความพึงพอใจเรียบร้อยแล้ว",
            sat_callout: "ข้อมูลได้รับการจัดเก็บลงในระบบฐานข้อมูลเรียบร้อยแล้ว",
            alert_no_draft: "ไม่พบข้อมูลการประเมินเบื้องต้น กรุณาเริ่มทำแบบประเมินใหม่อีกครั้ง",
            alert_id_mismatch: "ข้อมูลรหัสระบบไม่สอดคล้องกัน กรุณาเริ่มทำแบบประเมินใหม่อีกครั้ง",

            // 5 Satisfaction Questions
            sat_q1: "ความสะดวกในการเข้าใช้งานและการดำเนินงานผ่านระบบ",
            sat_q2: "ความรวดเร็วในการประมวลผลและการตอบสนองของระบบ",
            sat_q3: "ความถูกต้องและความน่าเชื่อถือของข้อมูลและผลลัพธ์",
            sat_q4: "ความชัดเจนของหน้าจอ เมนูคำสั่ง และคู่มือการใช้งาน",
            sat_q5: "ความพึงพอใจต่อภาพรวมของการใช้งานระบบ IT นี้",

            // Login (admin/login.html)
            login_page_title: "เข้าสู่ระบบบริหารจัดการ | IT Evaluator Admin",
            login_system_title: "IT Evaluator Admin",
            login_subtitle: "ระบบบริหารจัดการและสรุปผลการประเมิน",
            login_username_label: "ชื่อผู้ใช้ หรือ อีเมลหน่วยงาน",
            login_password_label: "รหัสผ่าน",
            login_btn: "เข้าสู่ระบบ",
            login_notice: "สำหรับผู้ดูแลระบบและเจ้าหน้าที่สารสนเทศ คณะสหเวชศาสตร์",
            login_error_invalid: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
            login_error_empty: "กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน",

            // Dashboard (admin/dashboard.html)
            dash_page_title: "ระบบบริหารจัดการและสรุปผลการประเมิน IT | IT Evaluator Admin Dashboard",
            dash_brand_sub: "ระบบบริหารจัดการข้อมูล",
            nav_overview: "ภาพรวมระบบ",
            nav_evaluation: "เปรียบเทียบก่อน–หลัง",
            nav_satisfaction: "ระดับความพึงพอใจ",
            nav_reports: "รายงานตามหมวดหมู่",
            nav_systems: "ผลประเมินรายระบบ",
            dash_header_title: "ระบบรายงานผลการประเมินประสิทธิภาพระบบ IT",
            dash_header_sub: "สรุปผลการวิเคราะห์ข้อมูลความพึงพอใจและประสิทธิผลการปฏิบัติงาน คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร",
            dash_checking_conn: "กำลังตรวจสอบการเชื่อมต่อข้อมูล...",
            dash_connected: "เชื่อมต่อข้อมูล ({source}: {count} รายการ)",
            dash_no_records: "ยังไม่มีข้อมูลการประเมิน",
            dash_data_fetch_err: "เกิดข้อผิดพลาดในการโหลดข้อมูล: {error}",
            period_all: "ข้อมูลทุกช่วงเวลา",
            period_month: "ข้อมูลประจำเดือนนี้",
            period_year: "ข้อมูลประจำปีนี้",
            btn_import_json: "นำเข้า JSON",
            btn_export_html: "ส่งออก HTML",
            btn_export_pdf: "ส่งออก PDF",
            stat_total_systems: "ระบบสารสนเทศทั้งหมด",
            stat_total_systems_sub: "จาก 6 หมวดหมู่ภารกิจ",
            stat_total_users: "จำนวนผู้ร่วมประเมิน",
            stat_total_users_sub: "นิสิต / อาจารย์ / บุคลากร",
            stat_total_evals: "จำนวนชุดข้อมูลการประเมิน",
            stat_total_evals_sub: "รายการที่จัดเก็บสมบูรณ์",
            stat_overall_sat: "คะแนนความพึงพอใจเฉลี่ยรวม",
            stat_overall_sat_sub: "จากเกณฑ์คะแนนเต็ม 5",
            chart_before_after_title: "เปรียบเทียบผลการดำเนินงานก่อน–หลังการใช้ระบบ IT",
            chart_before_after_sub: "คะแนนเฉลี่ยจำแนกตามเกณฑ์การประเมิน 10 ด้าน (เต็ม 5 คะแนน)",
            chart_empty_before_after: "ไม่มีข้อมูลการประเมินในช่วงเวลาที่กำหนด",
            chart_before_label: "ก่อนนำระบบ IT มาใช้",
            chart_after_label: "หลังนำระบบ IT มาใช้",
            chart_status_title: "สัดส่วนระบบที่ได้รับการประเมิน",
            chart_status_sub: "ความครอบคลุมของการประเมินระบบ",
            chart_empty_status: "ไม่มีข้อมูลสถานะการประเมิน",
            legend_evaluated: "มีผลการประเมิน",
            legend_pending: "ยังไม่มีการประเมิน",
            chart_sat_breakdown_title: "ระดับความพึงพอใจของผู้ใช้",
            chart_sat_breakdown_sub: "จำแนกตามเกณฑ์ระดับคะแนนมาตรฐาน",
            sat_high: "ระดับพึงพอใจสูง (3.50 – 5.00)",
            sat_medium: "ระดับปานกลาง (2.50 – 3.49)",
            sat_low: "ควรปรับปรุงแก้ไข (< 2.50)",
            chart_category_title: "ผลการประเมินจำแนกตามหมวดหมู่งาน",
            chart_category_sub: "คะแนนเฉลี่ยความพึงพอใจ 6 กลุ่มภารกิจ",
            chart_empty_category: "ไม่มีข้อมูลจำแนกตามหมวดหมู่",
            chart_category_dataset: "คะแนนเฉลี่ยความพึงพอใจ (เต็ม 5)",
            chart_trend_title: "แนวโน้มความพึงพอใจย้อนหลัง",
            chart_trend_sub: "การเปลี่ยนแปลงของคะแนนเฉลี่ยตามช่วงเวลา",
            chart_empty_trend: "ไม่มีข้อมูลแนวโน้มคะแนน",
            chart_trend_dataset: "คะแนนเฉลี่ยความพึงพอใจ",
            table_section_title: "ตารางสรุปผลการประเมินประสิทธิภาพรายระบบ",
            table_section_sub: "ข้อมูลสถิติที่คำนวณจากชุดข้อมูลการประเมินจริง",
            filter_all_categories: "ทุกหมวดหมู่ภารกิจ",
            th_no: "ลำดับ",
            th_system_id: "รหัสระบบ",
            th_system_name: "ชื่อระบบสารสนเทศ",
            th_category: "หมวดหมู่งาน",
            th_evaluators: "จำนวนผู้ประเมิน",
            th_before: "ก่อนใช้ / 5",
            th_after: "หลังใช้ / 5",
            th_diff: "ส่วนต่างคะแนน",
            th_satisfaction: "ความพึงพอใจ / 5",
            th_actions: "การดำเนินงาน",
            table_empty: "ไม่พบระบบสารสนเทศตามหมวดหมู่ที่เลือก",
            modal_import_title: "นำเข้าข้อมูลผลการประเมิน (JSON Dataset)",
            modal_import_sub: "เลือกหรือลากไฟล์ JSON บันทึกผลการประเมินเพื่อนำเข้าและประมวลผลบนแดชบอร์ด",
            dropzone_main: "คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่",
            dropzone_sub: "รองรับเฉพาะไฟล์เอกสารรูปแบบ .json ที่มีโครงสร้างตรงตามมาตรฐาน",
            btn_clear_data: "ล้างชุดข้อมูลนำเข้าทั้งหมด",
            alert_select_json: "กรุณาเลือกไฟล์เอกสารที่มีนามสกุล .json เท่านั้น",
            alert_import_success: "นำเข้าชุดข้อมูลสำเร็จ: นำเข้าเพิ่ม {count} รายการ (จากทั้งหมด {total} รายการในระบบ)",
            alert_import_error: "เกิดข้อผิดพลาดในการนำเข้าไฟล์ JSON: {error}",
            confirm_clear_data: "คุณแน่ใจหรือไม่ว่าต้องการล้างชุดข้อมูลผลการประเมินที่นำเข้าทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้",
            alert_clear_success: "ล้างชุดข้อมูลนำเข้าเรียบร้อยแล้ว",

            // Detail Page (admin/evaluation-detail.html)
            detail_page_title: "รายละเอียดผลการประเมินรายระบบ | IT Evaluator Admin",
            detail_system_meta: "หมวดหมู่: {category} | รหัสระบบ: {id}",
            detail_evaluators: "จำนวนผู้ประเมินทั้งหมด",
            detail_evaluators_sub: "จากแบบสำรวจในระบบ",
            detail_before: "คะแนนเฉลี่ยก่อนใช้",
            detail_after: "คะแนนเฉลี่ยหลังใช้",
            detail_sat: "ความพึงพอใจเฉลี่ย",
            feedback_heading: "ข้อเสนอแนะเพื่อการพัฒนาระบบ",
            feedback_sub: "ความคิดเห็นจากผู้ใช้งานที่มีต่อระบบนี้",
            empty_feedback: "ไม่มีข้อเสนอแนะเพิ่มเติมสำหรับระบบนี้",
            empty_system_eval: "ยังไม่มีข้อมูลการประเมินสำหรับระบบนี้",

            // Categories
            cat_personnel: "บุคลากรและการปฏิบัติงาน",
            cat_research: "วิจัยและวิชาการ",
            cat_workload: "ภาระงานและแผนยุทธศาสตร์",
            cat_documents: "สารบรรณและเอกสาร",
            cat_resources: "ทรัพยากรและบริการ",
            cat_finance: "การเงิน",

            // Systems
            sys_SYS001: "รายชื่อบุคลากร",
            sys_SYS002: "ระบบลาออนไลน์",
            sys_SYS003: "ลงเวลาปฏิบัติงาน",
            sys_SYS004: "ฐานข้อมูลงานวิจัย",
            sys_SYS005: "คุณสมบัติอาจารย์ผู้รับผิดชอบหลักสูตร",
            sys_SYS006: "AHS KM Hub",
            sys_SYS007: "ภาระงานสายวิชาการ",
            sys_SYS008: "ภาระงานสายสนับสนุน",
            sys_SYS009: "แผนปฏิบัติการประจำปี",
            sys_SYS010: "ระบบ KPI / แผนกลยุทธ์",
            sys_SYS011: "ระบบรับส่งหนังสือ",
            sys_SYS012: "กรรมการภายในต่างๆ",
            sys_SYS013: "ระบบเสนอของบอิเล็กทรอนิกส์",
            sys_SYS014: "AHS eForm",
            sys_SYS015: "ดาวน์โหลดแบบฟอร์ม",
            sys_SYS016: "ระบบบริหารจัดการอาคารและห้อง",
            sys_SYS017: "ระบบบริหารจัดการครุภัณฑ์",
            sys_SYS018: "ระบบซ่อมและบำรุงรักษา",
            sys_SYS019: "ระบบขอรับบริการจากหน่วยประชาสัมพันธ์",
            sys_SYS020: "ระบบลูกหนี้เงินยืม",
            sys_SYS021: "ระบบ AHS e-donation",

            // Assessment Management
            nav_assessment_mgmt: "การจัดการแบบประเมิน",
            mgmt_title: "การจัดการหัวข้อและแบบประเมิน",
            mgmt_subtitle: "จัดการหัวข้อการประเมิน (ระบบ IT) และข้อคำถามภายใต้แต่ละหมวดหมู่หลัก",
            mgmt_level1: "หมวดหมู่หลัก",
            mgmt_level2: "หัวข้อการประเมิน",
            mgmt_level3: "ข้อคำถาม",
            mgmt_select_cat: "เลือกหมวดหมู่หลัก:",
            mgmt_topics_title: "หัวข้อการประเมินในหมวดหมู่:",
            mgmt_btn_add_topic: "เพิ่มหัวข้อการประเมิน",
            mgmt_btn_manage_q: "จัดการข้อคำถาม",
            mgmt_btn_rename: "เปลี่ยนชื่อ",
            mgmt_btn_delete: "ลบ",
            mgmt_btn_add_q: "เพิ่มข้อคำถาม",
            mgmt_btn_edit_q: "แก้ไข",
            mgmt_btn_delete_q: "ลบ",
            mgmt_btn_back: "ย้อนกลับรายการหัวข้อ",
            mgmt_btn_reset: "คืนค่าเริ่มต้น",
            mgmt_th_code: "รหัส",
            mgmt_th_name: "ชื่อหัวข้อการประเมิน",
            mgmt_th_q_count: "จำนวนข้อคำถาม",
            mgmt_th_actions: "การจัดการ",
            mgmt_th_q_no: "ข้อที่",
            mgmt_th_q_text: "ข้อความคำถาม",
            mgmt_th_q_type: "กลุ่มเกณฑ์",
            mgmt_th_q_scale: "รูปแบบการให้คะแนน",
            mgmt_modal_add_topic_title: "เพิ่มหัวข้อการประเมินใหม่",
            mgmt_modal_rename_topic_title: "เปลี่ยนชื่อหัวข้อการประเมิน",
            mgmt_modal_add_q_title: "เพิ่มข้อคำถามใหม่",
            mgmt_modal_edit_q_title: "แก้ไขข้อคำถาม",
            mgmt_field_cat: "หมวดหมู่หลัก",
            mgmt_field_code: "รหัสหัวข้อ / รหัสระบบ (เช่น SYS022)",
            mgmt_field_name_th: "ชื่อหัวข้อการประเมิน (ภาษาไทย)",
            mgmt_field_name_en: "ชื่อหัวข้อการประเมิน (English)",
            mgmt_field_q_no: "ลำดับข้อที่",
            mgmt_field_q_type: "ประเภทเกณฑ์การประเมิน",
            mgmt_type_efficiency: "เกณฑ์การประเมินประสิทธิภาพ (10 ด้าน)",
            mgmt_type_satisfaction: "เกณฑ์วัดความพึงพอใจ (5 ด้าน)",
            mgmt_type_custom: "เกณฑ์เพิ่มเติม / กำหนดเอง",
            mgmt_field_q_text_th: "ข้อความคำถาม (ภาษาไทย)",
            mgmt_field_q_text_en: "ข้อความคำถาม (English)",
            mgmt_field_scale: "รูปแบบระดับคะแนน",
            mgmt_scale_likert5: "สเกล 5 ระดับ (1 = น้อยที่สุด, 5 = มากที่สุด)",
            mgmt_confirm_delete_topic_title: "ยืนยันการลบหัวข้อการประเมิน",
            mgmt_confirm_delete_topic_msg: 'คุณต้องการลบหัวข้อ "{name}" ใช่หรือไม่? ข้อคำถามทั้งหมดภายใต้หัวข้อนี้จะถูกลบออกด้วย',
            mgmt_confirm_delete_q_title: "ยืนยันการลบข้อคำถาม",
            mgmt_confirm_delete_q_msg: 'คุณต้องการลบข้อคำถาม "{text}" ใช่หรือไม่?',
            mgmt_confirm_reset_msg: "คุณต้องการคืนค่าหมวดหมู่ หัวข้อการประเมิน และข้อคำถามทั้งหมดกลับเป็นค่าเริ่มต้นของระบบใช่หรือไม่?",
            mgmt_empty_topics: 'ไม่พบหัวข้อการประเมินในหมวดหมู่นี้ กดปุ่ม "เพิ่มหัวข้อการประเมิน" เพื่อสร้างใหม่',
            mgmt_empty_questions: 'ยังไม่มีข้อคำถามในหัวข้อนี้ กดปุ่ม "เพิ่มข้อคำถาม" เพื่อเพิ่มข้อใหม่',
            mgmt_alert_fill_required: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน",
            btn_save: "บันทึกข้อมูล",
            btn_confirm_delete: "ยืนยันการลบ"
        },

        en: {
            // General & Common
            app_title: "IT Evaluator",
            app_subtitle: "Information Technology Systems Performance & Effectiveness Evaluation",
            institution: "Faculty of Allied Health Sciences, Naresuan University",
            footer_text: "IT Performance Evaluation System © 2026 | Faculty of Allied Health Sciences, Naresuan University",
            login: "Login",
            logout: "Sign Out",
            admin: "Administrator",
            darkMode: "Dark mode",
            lightMode: "Light mode",
            langLabel: "ไทย",
            lang_toggle: "ไทย",
            back_to_categories: "Back to Categories",
            back_to_systems: "Back to Systems Directory",
            back_to_dashboard: "Back to Main Dashboard",
            back_to_user_portal: "Back to User Portal",
            next: "Next",
            previous: "Previous",
            submit: "Submit",
            cancel: "Cancel",
            close: "Close",
            dismiss: "Dismiss",
            details: "Details",
            loading: "Loading data...",
            checking_system: "Checking system information...",
            system_code: "System Code: {code}",
            systems_count: "{count} Systems",
            users_count: "{count} Users",
            items_count: "{count} Items",
            score_out_of_5: "{score} / 5",
            score_full_5: "Out of 5.00",
            no_data: "No Data",

            // Roles
            role_select_prompt: "-- Please select user type --",
            role_student: "Student",
            role_teacher: "Faculty / Researcher",
            role_staff: "Support Staff",
            role_all: "All Evaluator Groups",

            // Gallery (user/index.html)
            gallery_title: "IT Systems Performance & Effectiveness Evaluation | Faculty of Allied Health Sciences, Naresuan University",
            gallery_section_title: "Select Information System Category to Evaluate",
            gallery_view_systems: "View Systems",
            gallery_aria_item: "{name} has {count} systems",

            // Systems Directory (user/systems.html)
            systems_page_title: "Information Systems Directory | IT Evaluator",
            systems_page_desc: "Please select an information system you have used to start the evaluation",
            systems_aria_card: "Start evaluation for {name} ({id})",
            category_not_found: "Category Not Found",
            category_not_found_desc: "The specified system category could not be found.",

            // Evaluation (user/evaluation.html)
            evaluation_page_title: "IT System Performance Assessment | IT Evaluator",
            evaluation_header: "IT System Performance & Effectiveness Assessment",
            evaluator_profile_title: "Evaluator Profile",
            evaluator_profile_desc: "Please provide basic information for institutional statistical analysis.",
            evaluator_name_label: "Full Name or User ID",
            evaluator_name_placeholder: "Enter full name or pseudonym",
            evaluator_role_label: "User / Personnel Type",
            evaluator_start_btn: "Start Evaluation",
            evaluator_role_required: "Please select a user type",
            anonymous_evaluator: "Anonymous Evaluator",
            system_not_found: "Selected IT system not found",
            phase_1_label: "Phase 1: Before IT System Adoption (Traditional Methods)",
            phase_2_label: "Phase 2: After IT System Adoption (Current Operations)",
            phase_1_desc: "Please evaluate your work performance using previous/traditional methods before this IT system was introduced.",
            phase_2_desc: "Please evaluate convenience, speed, and efficiency when performing actual work through this IT system.",
            question_counter: "Question {current} / {total}",
            question_caption: "Performance Evaluation Criteria",
            rating_prompt: "Please select your rating",
            rating_skipped: "Status: Unable to evaluate (Skipped)",
            rating_point_label: "{score} Points — {label}",
            rating_scale_1: "Lowest",
            rating_scale_2: "Low",
            rating_scale_3: "Moderate",
            rating_scale_4: "High",
            rating_scale_5: "Highest",
            skip_title: "Unable to evaluate this item?",
            skip_desc: "If you have no prior experience with this procedure or lack relevant information, you can skip this item below. It will be excluded from score calculations.",
            skip_btn: "Skip this question (No data / Not applicable)",
            btn_to_phase_2: "Proceed to Phase 2 (After IT System)",
            btn_to_results: "View Comparison Results",
            result_title: "Performance Comparison Summary",
            result_subtitle: "Average score difference between before and after IT system adoption",
            score_before_system: "Average Score Before System",
            score_after_system: "Average Score After System",
            direction_increase: "increased by",
            direction_decrease: "decreased by",
            direction_same: "remained unchanged at",
            score_diff_summary: "Average score {direction} {diff} points",
            score_diff_percentage: "Equivalent to a difference of {pct}% (calculated from {count} questions completed in both phases)",
            score_no_comparison: "Cannot Compare",
            score_no_comparison_desc: "No questions were evaluated across both before and after phases.",
            btn_restart: "Retake Assessment",
            btn_to_satisfaction: "Proceed to Satisfaction Survey",

            // 10 Evaluation Questions
            eval_q1: "Tasks can be completed quickly and promptly",
            eval_q2: "Operations are convenient and hassle-free",
            eval_q3: "Workflow procedures are streamlined and non-complex",
            eval_q4: "Tasks are performed with high accuracy",
            eval_q5: "Operational errors and mistakes are minimal",
            eval_q6: "Work relies on minimal paper documentation",
            eval_q7: "Work status can be tracked and monitored easily",
            eval_q8: "Required information can be searched and accessed conveniently",
            eval_q9: "Operations successfully attain intended objectives",
            eval_q10: "Overall operational efficiency is high",

            // Criteria Short Names (Dashboard Chart)
            crit_1: "Speed",
            crit_2: "Convenience",
            crit_3: "Concise Steps",
            crit_4: "Accuracy",
            crit_5: "Low Errors",
            crit_6: "Paperless",
            crit_7: "Easy Tracking",
            crit_8: "Data Access",
            crit_9: "Goal Attainment",
            crit_10: "Overall Efficiency",

            // Satisfaction (user/satisfaction.html)
            sat_page_title: "IT System Satisfaction Survey | IT Evaluator",
            sat_header: "IT System User Satisfaction Survey",
            sat_subtitle: "Post-Usage System Satisfaction",
            sat_prompt: "Please select your satisfaction level",
            sat_rating_label: "{score} Points — Level: {label}",
            sat_level_1: "Very Low",
            sat_level_2: "Low",
            sat_level_3: "Moderate",
            sat_level_4: "High",
            sat_level_5: "Very High",
            btn_to_feedback: "Proceed to Suggestions",
            feedback_title: "Suggestions for System Improvement",
            feedback_desc: "Do you have any comments or suggestions to improve this IT system?",
            feedback_placeholder: "Type your suggestions here (optional)",
            char_counter: "{count} / 250 characters",
            btn_submit_eval: "Save & Submit Evaluation",
            sat_success_title: "Evaluation Submitted Successfully",
            sat_score_label: "Your Average Satisfaction Score",
            sat_success_msg: "Your performance and satisfaction evaluation has been recorded successfully.",
            sat_callout: "Data has been securely stored in the system database.",
            alert_no_draft: "Initial evaluation draft not found. Please restart the evaluation.",
            alert_id_mismatch: "System ID mismatch detected. Please restart the evaluation.",

            // 5 Satisfaction Questions
            sat_q1: "Ease of access and convenience of operations through the system",
            sat_q2: "Processing speed and responsiveness of the system",
            sat_q3: "Accuracy and reliability of data and system outputs",
            sat_q4: "Clarity of user interface, menu navigation, and guides",
            sat_q5: "Overall satisfaction with using this IT system",

            // Login (admin/login.html)
            login_page_title: "Administrator Sign In | IT Evaluator Admin",
            login_system_title: "IT Evaluator Admin",
            login_subtitle: "Management & Evaluation Analytics System",
            login_username_label: "Username or Institutional Email",
            login_password_label: "Password",
            login_btn: "Sign In",
            login_notice: "For administrators and IT personnel, Faculty of Allied Health Sciences",
            login_error_invalid: "Invalid username or password",
            login_error_empty: "Please enter both username and password",

            // Dashboard (admin/dashboard.html)
            dash_page_title: "IT Evaluation Analytics & Management System | IT Evaluator Admin Dashboard",
            dash_brand_sub: "Data Management System",
            nav_overview: "System Overview",
            nav_evaluation: "Before-After Comparison",
            nav_satisfaction: "Satisfaction Levels",
            nav_reports: "Category Reports",
            nav_systems: "System-by-System Results",
            dash_header_title: "IT Systems Performance Evaluation Report",
            dash_header_sub: "Summary analytics of user satisfaction and operational effectiveness, Faculty of Allied Health Sciences, Naresuan University",
            dash_checking_conn: "Checking data connection...",
            dash_connected: "Data Connected ({source}: {count} records)",
            dash_no_records: "No evaluation records yet",
            dash_data_fetch_err: "Error loading data: {error}",
            period_all: "All Time Periods",
            period_month: "This Month",
            period_year: "This Year",
            btn_import_json: "Import JSON",
            btn_export_html: "Export HTML",
            btn_export_pdf: "Export PDF",
            stat_total_systems: "Total Information Systems",
            stat_total_systems_sub: "Across 6 mission categories",
            stat_total_users: "Total Evaluators",
            stat_total_users_sub: "Students / Faculty / Support Staff",
            stat_total_evals: "Total Evaluation Datasets",
            stat_total_evals_sub: "Fully submitted records",
            stat_overall_sat: "Overall Satisfaction Average",
            stat_overall_sat_sub: "Out of 5.00 maximum score",
            chart_before_after_title: "Before-After Operational Performance Comparison",
            chart_before_after_sub: "Average scores across 10 evaluation criteria (out of 5.00)",
            chart_empty_before_after: "No evaluation data available for selected period",
            chart_before_label: "Before IT System Adoption",
            chart_after_label: "After IT System Adoption",
            chart_status_title: "Evaluation Coverage Ratio",
            chart_status_sub: "Coverage across all information systems",
            chart_empty_status: "No evaluation status data available",
            legend_evaluated: "Evaluated",
            legend_pending: "Not Yet Evaluated",
            chart_sat_breakdown_title: "User Satisfaction Distribution",
            chart_sat_breakdown_sub: "Categorized by standard rating criteria",
            sat_high: "High Satisfaction (3.50 – 5.00)",
            sat_medium: "Moderate Satisfaction (2.50 – 3.49)",
            sat_low: "Needs Improvement (< 2.50)",
            chart_category_title: "Evaluation Results by Work Category",
            chart_category_sub: "Average satisfaction scores across 6 categories",
            chart_empty_category: "No category evaluation data available",
            chart_category_dataset: "Average Satisfaction Score (out of 5)",
            chart_trend_title: "Historical Satisfaction Trend",
            chart_trend_sub: "Average score trend over time",
            chart_empty_trend: "No satisfaction trend data available",
            chart_trend_dataset: "Average Satisfaction Score",
            table_section_title: "System Performance Evaluation Summary Table",
            table_section_sub: "Statistical metrics calculated from actual evaluation data",
            filter_all_categories: "All Mission Categories",
            th_no: "No.",
            th_system_id: "System ID",
            th_system_name: "Information System Name",
            th_category: "Category",
            th_evaluators: "Evaluators",
            th_before: "Before / 5",
            th_after: "After / 5",
            th_diff: "Score Diff",
            th_satisfaction: "Satisfaction / 5",
            th_actions: "Actions",
            table_empty: "No information systems found in selected category",
            modal_import_title: "Import Evaluation Data (JSON Dataset)",
            modal_import_sub: "Select or drag & drop an evaluation JSON file to import and visualize on the dashboard.",
            dropzone_main: "Click to select file or drag & drop here",
            dropzone_sub: "Supports only standard structured .json format files",
            btn_clear_data: "Clear All Imported Data",
            alert_select_json: "Please select a valid .json file only",
            alert_import_success: "Import successful: Added {count} records (Total {total} records in system)",
            alert_import_error: "Error importing JSON file: {error}",
            confirm_clear_data: "Are you sure you want to clear all imported evaluation datasets? This action cannot be undone.",
            alert_clear_success: "All imported evaluation datasets have been cleared.",

            // Detail Page (admin/evaluation-detail.html)
            detail_page_title: "System Evaluation Details | IT Evaluator Admin",
            detail_system_meta: "Category: {category} | System ID: {id}",
            detail_evaluators: "Total Evaluators",
            detail_evaluators_sub: "From submitted system surveys",
            detail_before: "Average Score Before",
            detail_after: "Average Score After",
            detail_sat: "Average Satisfaction",
            feedback_heading: "Suggestions for System Improvement",
            feedback_sub: "Feedback and comments submitted by users for this system",
            empty_feedback: "No additional suggestions submitted for this system yet.",
            empty_system_eval: "No evaluation records available for this system yet.",

            // Categories
            cat_personnel: "Personnel & Operations",
            cat_research: "Research & Academics",
            cat_workload: "Workload & Strategic Planning",
            cat_documents: "Documents & General Correspondence",
            cat_resources: "Resources & Services",
            cat_finance: "Finance & Accounting",

            // Systems
            sys_SYS001: "Personnel Directory",
            sys_SYS002: "Online Leave System",
            sys_SYS003: "Time & Attendance System",
            sys_SYS004: "Research Database",
            sys_SYS005: "Program Director Qualifications",
            sys_SYS006: "AHS KM Hub",
            sys_SYS007: "Academic Staff Workload",
            sys_SYS008: "Support Staff Workload",
            sys_SYS009: "Annual Action Plan",
            sys_SYS010: "KPI & Strategic Plan System",
            sys_SYS011: "Document Dispatch System",
            sys_SYS012: "Internal Committees System",
            sys_SYS013: "Electronic Budget Proposal System",
            sys_SYS014: "AHS eForm",
            sys_SYS015: "Form Downloads",
            sys_SYS016: "Building & Room Management System",
            sys_SYS017: "Asset & Equipment Management System",
            sys_SYS018: "Repair & Maintenance System",
            sys_SYS019: "Public Relations Service Request",
            sys_SYS020: "Loan Debtors System",
            sys_SYS021: "AHS e-Donation System",

            // Assessment Management
            nav_assessment_mgmt: "Assessment Management",
            mgmt_title: "Assessment Management",
            mgmt_subtitle: "Manage assessment topics (IT systems) and questions under each main category",
            mgmt_level1: "Main Category",
            mgmt_level2: "Assessment Topic",
            mgmt_level3: "Questions",
            mgmt_select_cat: "Select Main Category:",
            mgmt_topics_title: "Assessment Topics in Category:",
            mgmt_btn_add_topic: "Add Assessment Topic",
            mgmt_btn_manage_q: "Manage Questions",
            mgmt_btn_rename: "Rename",
            mgmt_btn_delete: "Delete",
            mgmt_btn_add_q: "Add Question",
            mgmt_btn_edit_q: "Edit",
            mgmt_btn_delete_q: "Delete",
            mgmt_btn_back: "Back to Topics",
            mgmt_btn_reset: "Reset Defaults",
            mgmt_th_code: "Code / ID",
            mgmt_th_name: "Assessment Topic Name",
            mgmt_th_q_count: "Questions Count",
            mgmt_th_actions: "Actions",
            mgmt_th_q_no: "No.",
            mgmt_th_q_text: "Question Text",
            mgmt_th_q_type: "Criteria Group",
            mgmt_th_q_scale: "Rating Scale",
            mgmt_modal_add_topic_title: "Add New Assessment Topic",
            mgmt_modal_rename_topic_title: "Rename Assessment Topic",
            mgmt_modal_add_q_title: "Add New Question",
            mgmt_modal_edit_q_title: "Edit Question",
            mgmt_field_cat: "Main Category",
            mgmt_field_code: "Topic / System Code (e.g. SYS022)",
            mgmt_field_name_th: "Topic Name (Thai)",
            mgmt_field_name_en: "Topic Name (English)",
            mgmt_field_q_no: "Question Order",
            mgmt_field_q_type: "Criteria Group",
            mgmt_type_efficiency: "Operational Efficiency Criteria (10 items)",
            mgmt_type_satisfaction: "User Satisfaction Criteria (5 items)",
            mgmt_type_custom: "Custom Criteria",
            mgmt_field_q_text_th: "Question Text (Thai)",
            mgmt_field_q_text_en: "Question Text (English)",
            mgmt_field_scale: "Rating Scale Format",
            mgmt_scale_likert5: "5-Point Likert Scale (1 = Lowest, 5 = Highest)",
            mgmt_confirm_delete_topic_title: "Confirm Topic Deletion",
            mgmt_confirm_delete_topic_msg: 'Are you sure you want to delete topic "{name}"? All questions under this topic will also be removed.',
            mgmt_confirm_delete_q_title: "Confirm Question Deletion",
            mgmt_confirm_delete_q_msg: 'Are you sure you want to delete question "{text}"?',
            mgmt_confirm_reset_msg: "Are you sure you want to reset all categories, topics, and questions to system defaults?",
            mgmt_empty_topics: 'No assessment topics found in this category. Click "Add Assessment Topic" to create one.',
            mgmt_empty_questions: 'No questions in this topic yet. Click "Add Question" to add one.',
            mgmt_alert_fill_required: "Please fill in all required fields.",
            btn_save: "Save Changes",
            btn_confirm_delete: "Confirm Delete"
        }
    };

    /* =====================================================================
       PREFERENCE STORAGE HELPERS
       ===================================================================== */
    const THEME_KEY = "it_eval_theme";   // "dark" | "light"
    const LANG_KEY  = "it_eval_lang";    // "th"   | "en"

    function getTheme() {
        return localStorage.getItem(THEME_KEY) || "light";
    }

    function getLang() {
        const stored = localStorage.getItem(LANG_KEY);
        if (stored === "en" || stored === "th") return stored;
        return "th";
    }

    function saveTheme(val) {
        localStorage.setItem(THEME_KEY, val);
    }

    function saveLang(val) {
        localStorage.setItem(LANG_KEY, val);
    }

    /* =====================================================================
       TRANSLATION HELPER: t(key, params)
       ===================================================================== */
    function t(key, params) {
        const lang = getLang();
        const dict = i18n[lang] || i18n.th;
        let text = dict[key];
        if (text === undefined) {
            text = i18n.th[key] !== undefined ? i18n.th[key] : key;
        }
        if (params && typeof params === "object") {
            for (const p in params) {
                text = text.replace(new RegExp(`\\{${p}\\}`, "g"), params[p]);
            }
        }
        return text;
    }

    /* =====================================================================
       CATEGORY & SYSTEM NAME HELPERS
       ===================================================================== */
    function getCategoryName(category, lang) {
        if (!category) return "";
        const l = lang || getLang();
        const key = "cat_" + category.id;
        if (i18n[l] && i18n[l][key]) {
            return i18n[l][key];
        }
        if (l === "en" && category.name_en) return category.name_en;
        return category.name || "";
    }

    function getSystemName(system, lang) {
        if (!system) return "";
        const l = lang || getLang();
        const key = "sys_" + system.id;
        if (i18n[l] && i18n[l][key]) {
            return i18n[l][key];
        }
        if (l === "en" && system.name_en) return system.name_en;
        return system.name || "";
    }

    /* =====================================================================
       DOM TRANSLATION ENGINE
       ===================================================================== */
    function applyTranslations(root) {
        const container = root || document;
        const lang = getLang();
        document.documentElement.lang = lang;

        // 1. Text elements
        container.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            if (!key) return;
            const val = t(key);

            if (el.tagName === "TITLE") {
                document.title = val;
                return;
            }

            // If element has only text nodes, replace textContent
            const elementChildren = Array.from(el.childNodes).filter(n => n.nodeType === Node.ELEMENT_NODE);
            if (elementChildren.length === 0) {
                el.textContent = val;
            } else {
                // Has elements (e.g. svg icon or badges), find non-empty text node to replace
                let foundTextNode = false;
                for (let i = 0; i < el.childNodes.length; i++) {
                    const node = el.childNodes[i];
                    if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() !== "") {
                        node.nodeValue = " " + val + " ";
                        foundTextNode = true;
                        break;
                    }
                }
                if (!foundTextNode) {
                    el.textContent = val;
                }
            }
        });

        // 2. Placeholders
        container.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
            const key = el.getAttribute("data-i18n-placeholder");
            if (key) el.placeholder = t(key);
        });

        // 3. Titles
        container.querySelectorAll("[data-i18n-title]").forEach(el => {
            const key = el.getAttribute("data-i18n-title");
            if (key) el.title = t(key);
        });

        // 4. Aria labels
        container.querySelectorAll("[data-i18n-aria]").forEach(el => {
            const key = el.getAttribute("data-i18n-aria");
            if (key) el.setAttribute("aria-label", t(key));
        });

        // 5. HTML content
        container.querySelectorAll("[data-i18n-html]").forEach(el => {
            const key = el.getAttribute("data-i18n-html");
            if (key) el.innerHTML = t(key);
        });
    }

    /* =====================================================================
       THEME APPLICATION
       ===================================================================== */
    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
    }

    /* =====================================================================
       LANGUAGE APPLICATION
       Fires a custom event so page-specific scripts can respond
       ===================================================================== */
    function applyLang(lang) {
        document.documentElement.lang = lang === "en" ? "en" : "th";
        applyTranslations(document);
        document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
    }

    /* =====================================================================
       LOGIN STATE
       ===================================================================== */
    function getAdminUser() {
        try {
            const raw = sessionStorage.getItem("adminUser");
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    function isAdminPage() {
        return window.location.pathname.includes("/admin/");
    }

    function isLoginPage() {
        return window.location.pathname.endsWith("login.html");
    }

    /* =====================================================================
       TOOLBAR HTML
       ===================================================================== */
    function buildToolbar() {
        const lang  = getLang();
        const theme = getTheme();
        const tObj  = i18n[lang];
        const user  = getAdminUser();
        const isDark = theme === "dark";

        // Moon / Sun SVG icons
        const moonSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>`;
        const sunSvg  = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06a.996.996 0 0 0 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0zM7.05 18.36l-1.06 1.06a.996.996 0 0 0 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0z"/></svg>`;

        // Person SVG
        const personSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`;

        // Login button or username display
        let loginHtml = "";
        if (user && user.username) {
            // Show logged-in username with logout option
            loginHtml = `
                <div class="tl-user-menu" id="tlUserMenu">
                    <button class="tl-btn tl-user-btn" id="tlUserBtn" aria-expanded="false" aria-haspopup="true">
                        ${personSvg}
                        <span class="tl-user-name">${escapeHtml(user.username)}</span>
                        <svg class="tl-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5z"/></svg>
                    </button>
                    <div class="tl-dropdown" id="tlDropdown" hidden>
                        <div class="tl-dropdown-info">
                            <span class="tl-dropdown-role">${tObj.admin}</span>
                            <span class="tl-dropdown-email">${escapeHtml(user.username)}</span>
                        </div>
                        <hr class="tl-divider">
                        <button class="tl-dropdown-item tl-logout-btn" id="tlLogoutBtn">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
                            ${tObj.logout}
                        </button>
                    </div>
                </div>`;
        } else {
            // Show login button only on admin pages (not the login page itself)
            if (isAdminPage() && !isLoginPage()) {
                loginHtml = `
                    <a href="login.html" class="tl-btn tl-login-btn" id="tlLoginBtn">
                        ${personSvg}
                        <span>${tObj.login}</span>
                    </a>`;
            }
        }

        return `
<div class="tl-toolbar" id="tlToolbar" role="toolbar" aria-label="Toolbar">
    <!-- Theme Toggle -->
    <button class="tl-btn tl-icon-btn" id="tlThemeBtn"
            aria-label="${isDark ? tObj.lightMode : tObj.darkMode}"
            title="${isDark ? tObj.lightMode : tObj.darkMode}">
        ${isDark ? sunSvg : moonSvg}
    </button>

    <!-- Language Switch -->
    <button class="tl-btn tl-lang-btn" id="tlLangBtn"
            aria-label="Switch language"
            title="Switch language">
        ${tObj.langLabel}
    </button>

    <!-- Login / User -->
    ${loginHtml}
</div>`;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    /* =====================================================================
       INJECT TOOLBAR INTO DOM
       ==================================================================== */
    function injectToolbar() {
        const existing = document.getElementById("tlToolbar");
        if (existing) existing.remove();

        const div = document.createElement("div");
        div.innerHTML = buildToolbar();
        const toolbar = div.firstElementChild;

        document.body.appendChild(toolbar);
        bindToolbarEvents();
    }

    /* =====================================================================
       BIND TOOLBAR EVENTS
       ===================================================================== */
    function bindToolbarEvents() {
        // --- Theme toggle ---
        const themeBtn = document.getElementById("tlThemeBtn");
        if (themeBtn) {
            themeBtn.addEventListener("click", () => {
                const next = getTheme() === "dark" ? "light" : "dark";
                saveTheme(next);
                applyTheme(next);
                injectToolbar();
            });
        }

        // --- Language switch ---
        const langBtn = document.getElementById("tlLangBtn");
        if (langBtn) {
            langBtn.addEventListener("click", () => {
                const next = getLang() === "th" ? "en" : "th";
                saveLang(next);
                applyLang(next);
                injectToolbar();
            });
        }

        // --- User dropdown ---
        const userBtn = document.getElementById("tlUserBtn");
        const dropdown = document.getElementById("tlDropdown");
        if (userBtn && dropdown) {
            userBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const isOpen = !dropdown.hidden;
                dropdown.hidden = isOpen;
                userBtn.setAttribute("aria-expanded", String(!isOpen));
            });

            document.addEventListener("click", () => {
                if (!dropdown.hidden) {
                    dropdown.hidden = true;
                    userBtn.setAttribute("aria-expanded", "false");
                }
            });
        }

        // --- Logout ---
        const logoutBtn = document.getElementById("tlLogoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                sessionStorage.removeItem("adminUser");
                window.location.href = "login.html";
            });
        }
    }

    /* =====================================================================
       INIT
       ===================================================================== */
    function init() {
        applyTheme(getTheme());
        applyLang(getLang());
        injectToolbar();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Expose global methods
    window.t = t;
    window.getCategoryName = getCategoryName;
    window.getSystemName = getSystemName;
    window.applyTranslations = applyTranslations;
    window.ThemeLang = {
        getTheme,
        getLang,
        saveLang,
        applyLang,
        getAdminUser,
        i18n,
        t,
        getCategoryName,
        getSystemName,
        applyTranslations
    };

})();

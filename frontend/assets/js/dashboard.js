
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // ADMIN DASHBOARD - DEMO MODE
    // ข้อมูลทั้งหมดเป็นข้อมูลจำลองรายผู้ประเมิน
    // ==========================================

    const categoryList =
        typeof categories !== "undefined" ? categories : [];

    const systems = categoryList.flatMap(category =>
        (category.systems || []).map(system => ({
            ...system,
            categoryId: String(category.id),
            categoryName: category.name
        }))
    );

    const questionNames = [
        "ความรวดเร็ว",
        "ความสะดวก",
        "ขั้นตอนกระชับ",
        "ความถูกต้อง",
        "ข้อผิดพลาดน้อย",
        "ใช้กระดาษน้อย",
        "ติดตามงานง่าย",
        "เข้าถึงข้อมูลง่าย",
        "บรรลุวัตถุประสงค์",
        "ประสิทธิภาพโดยรวม"
    ];

    const roles = ["student", "teacher", "staff"];

    // ==========================================
    // 1. ฟังก์ชันช่วยคำนวณ
    // ==========================================

    const clamp = number =>
        Math.max(1, Math.min(5, number));

    function average(values) {
        const valid = values.filter(value =>
            typeof value === "number" &&
            Number.isFinite(value)
        );

        if (valid.length === 0) return null;

        return valid.reduce(
            (sum, value) => sum + value, 0
        ) / valid.length;
    }

    function formatScore(value) {
        return value === null
            ? "ไม่มีข้อมูล"
            : value.toFixed(2);
    }

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }

    // ==========================================
    // 2. วันที่สำหรับกรองข้อมูล
    // ==========================================

    const today = new Date();

    const todayISO = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    const currentMonth = todayISO.slice(0, 7);
    const currentYear = todayISO.slice(0, 4);

    function getMonth(date) {
        return date.slice(0, 7);
    }

    // ==========================================
    // 3. สร้างข้อมูลจำลองรายผู้ประเมิน
    // หนึ่งรายการ = หนึ่งคนประเมินหนึ่งระบบ
    // ==========================================

    const demoEvaluations = [];

    systems.forEach((system, systemIndex) => {

        // บางระบบยังไม่มีผู้ประเมิน
        if (systemIndex % 7 === 0) return;

        const count =
            7 + (systemIndex * 3) % 12;

        for (let i = 0; i < count; i++) {

            const personId =
                (systemIndex * 11 + i * 7) % 65;

            const role =
                roles[personId % roles.length];

            // คะแนนก่อนใช้ระบบ 10 ข้อ
            const beforeAnswers = questionNames.map(
                (_, questionIndex) => {

                    if (
                        (systemIndex + i + questionIndex) % 13 === 0
                    ) {
                        return null;
                    }

                    return clamp(
                        2 + (
                            (systemIndex + i + questionIndex) % 3
                        )
                    );
                }
            );

            // คะแนนหลังใช้ระบบ 10 ข้อ
            const afterAnswers = questionNames.map(
                (_, questionIndex) => {

                    if (
                        (systemIndex + i + questionIndex) % 17 === 0
                    ) {
                        return null;
                    }

                    return clamp(
                        3 + (
                            (systemIndex + i * 2 + questionIndex) % 3
                        )
                    );
                }
            );

            // ความพึงพอใจ 5 ข้อ
            const satisfactionAnswers =
                Array.from({ length: 5 }, (_, questionIndex) =>
                    clamp(
                        1 + (
                            (
                                personId +
                                systemIndex * 2 +
                                i +
                                questionIndex
                            ) % 5
                        )
                    )
                );

            // วันที่ส่งแบบประเมินจำลอง
            const date = new Date(
                today.getFullYear(),
                today.getMonth() -
                    ((systemIndex + i) % 6),
                Math.min(today.getDate(), 15)
            );

            const submittedAt = [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0")
            ].join("-");

            demoEvaluations.push({
                systemId: system.id,
                evaluatorId: `demo-user-${personId}`,
                userRole: role,
                beforeAnswers,
                afterAnswers,
                satisfactionAnswers,
                submittedAt
            });
        }
    });

    // ==========================================
    // 4. ตั้งค่ากราฟ
    // ==========================================

    const blue = "#55c4e8";
    const red = "#f04b40";
    const muted = "#b8b9d3";

    if (typeof Chart !== "undefined") {
        Chart.defaults.color = muted;
        Chart.defaults.font.family = "Kanit";
    }

    const charts = {};

    function drawChart(id, config) {
        const canvas = document.getElementById(id);

        if (!canvas || typeof Chart === "undefined") {
            return;
        }

        if (charts[id]) {
            charts[id].destroy();
        }

        charts[id] = new Chart(canvas, config);
    }

    function chartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: "#f6f6fa"
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: muted },
                    grid: { display: false }
                },
                y: {
                    min: 0,
                    max: 5,
                    ticks: {
                        color: muted,
                        stepSize: 1
                    },
                    grid: {
                        color: "#3c3d68"
                    }
                }
            }
        };
    }

    // ==========================================
    // 5. ตัวกรอง
    // ==========================================

    const categoryFilter =
        document.getElementById("categoryFilter");

    const roleFilter =
        document.getElementById("userTypeFilter");

    const periodFilter =
        document.getElementById("periodFilter");

    const tableBody =
        document.getElementById("systemsTableBody");

    categoryList.forEach(category => {

        if (!categoryFilter) return;

        const option = document.createElement("option");

        option.value = String(category.id);
        option.textContent = category.name;

        categoryFilter.appendChild(option);
    });

    // ==========================================
    // 6. แบ่งระดับความพึงพอใจ
    // ==========================================

    function satisfactionLevel(score) {
        if (score >= 3.5) return "happy";
        if (score >= 2.5) return "neutral";
        return "unhappy";
    }

    // เปรียบเทียบเฉพาะข้อที่มีคะแนนครบ
    // ทั้งก่อนและหลังใช้ระบบ

    function comparableAverages(record) {

        const before = [];
        const after = [];

        for (let i = 0; i < 10; i++) {

            const beforeScore = record.beforeAnswers[i];
            const afterScore = record.afterAnswers[i];

            if (
                typeof beforeScore === "number" &&
                typeof afterScore === "number"
            ) {
                before.push(beforeScore);
                after.push(afterScore);
            }
        }

        return {
            before: average(before),
            after: average(after)
        };
    }

    // ==========================================
    // 7. อัปเดต Dashboard
    // ==========================================

    function updateDashboard() {

        const selectedCategory =
            categoryFilter?.value || "all";

        const selectedRole =
            roleFilter?.value || "all";

        const selectedPeriod =
            periodFilter?.value || "all";

        // กรองระบบ IT ตามหมวดหมู่
        const visibleSystems = systems.filter(system =>
            selectedCategory === "all" ||
            system.categoryId === selectedCategory
        );

        const visibleIds = new Set(
            visibleSystems.map(system => system.id)
        );

        // กรองรายการประเมิน
        const records = demoEvaluations.filter(record => {

            const matchSystem =
                visibleIds.has(record.systemId);

            const matchRole =
                selectedRole === "all" ||
                record.userRole === selectedRole;

            const matchPeriod =
                selectedPeriod === "all" ||
                (
                    selectedPeriod === "month" &&
                    getMonth(record.submittedAt) === currentMonth
                ) ||
                (
                    selectedPeriod === "year" &&
                    record.submittedAt.startsWith(currentYear)
                );

            return matchSystem && matchRole && matchPeriod;
        });

        const satisfactionScores = records
            .map(record => average(record.satisfactionAnswers))
            .filter(score => score !== null);

        // ======================================
        // 8. SUMMARY CARDS
        // ======================================

        const uniqueUsers = new Set(
            records.map(record => record.evaluatorId)
        );

        setText("totalSystems", visibleSystems.length);
        setText("totalUsers", uniqueUsers.size);
        setText("totalEvaluations", records.length);

        setText(
            "averageSatisfaction",
            formatScore(average(satisfactionScores))
        );

        // ======================================
        // 9. BEFORE / AFTER CHART
        // ======================================

        const beforeScores = [];
        const afterScores = [];

        questionNames.forEach((_, questionIndex) => {

            const pairedRecords = records.filter(record =>
                typeof record.beforeAnswers[questionIndex] === "number" &&
                typeof record.afterAnswers[questionIndex] === "number"
            );

            beforeScores.push(
                average(
                    pairedRecords.map(record =>
                        record.beforeAnswers[questionIndex]
                    )
                )
            );

            afterScores.push(
                average(
                    pairedRecords.map(record =>
                        record.afterAnswers[questionIndex]
                    )
                )
            );
        });

        drawChart("beforeAfterChart", {
            type: "bar",
            data: {
                labels: questionNames,
                datasets: [
                    {
                        label: "ก่อนใช้ระบบ",
                        data: beforeScores,
                        backgroundColor: red,
                        borderRadius: 4
                    },
                    {
                        label: "หลังใช้ระบบ",
                        data: afterScores,
                        backgroundColor: blue,
                        borderRadius: 4
                    }
                ]
            },
            options: chartOptions()
        });

        // ======================================
        // 10. EVALUATION STATUS CHART
        // ======================================

        const evaluated = new Set(
            records.map(record => record.systemId)
        ).size;

        drawChart("evaluationStatusChart", {
            type: "doughnut",
            data: {
                labels: [
                    "มีผลประเมิน",
                    "ยังไม่มีผลประเมิน"
                ],
                datasets: [{
                    data: [
                        evaluated,
                        visibleSystems.length - evaluated
                    ],
                    backgroundColor: [
                        blue,
                        "#777a9c"
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "70%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: "#f6f6fa"
                        }
                    }
                }
            }
        });

        // ======================================
        // 11. SATISFACTION EMOJI
        // คำนวณจากผู้ประเมินแต่ละรายการ
        // ======================================

        const levels = {
            happy: 0,
            neutral: 0,
            unhappy: 0
        };

        satisfactionScores.forEach(score => {
            const level = satisfactionLevel(score);
            levels[level]++;
        });

        const totalSatisfaction =
            satisfactionScores.length;

        function percent(count) {
            if (totalSatisfaction === 0) return "0%";

            return (
                count / totalSatisfaction * 100
            ).toFixed(1) + "%";
        }

        setText(
            "happyPercent",
            percent(levels.happy)
        );

        setText(
            "neutralPercent",
            percent(levels.neutral)
        );

        setText(
            "unhappyPercent",
            percent(levels.unhappy)
        );

        // ======================================
        // 12. CATEGORY CHART
        // ======================================

        const shownCategories = categoryList.filter(category =>
            selectedCategory === "all" ||
            String(category.id) === selectedCategory
        );

        const categoryScores = shownCategories.map(category => {

            const categoryRecords = records.filter(record =>
                systems.some(system =>
                    system.id === record.systemId &&
                    system.categoryId === String(category.id)
                )
            );

            return average(
                categoryRecords.map(record =>
                    average(record.satisfactionAnswers)
                )
            );
        });

        drawChart("categoryChart", {
            type: "bar",
            data: {
                labels: shownCategories.map(
                    category => category.name
                ),
                datasets: [{
                    label: "ความพึงพอใจเฉลี่ย / 5",
                    data: categoryScores,
                    backgroundColor: blue,
                    borderRadius: 5
                }]
            },
            options: chartOptions()
        });

        // ======================================
        // 13. SATISFACTION TREND CHART
        // ======================================

        const months = Array.from(
            { length: 6 },
            (_, index) => {

                const date = new Date(
                    today.getFullYear(),
                    today.getMonth() - (5 - index),
                    1
                );

                return [
                    date.getFullYear(),
                    String(date.getMonth() + 1).padStart(2, "0")
                ].join("-");
            }
        );

        const trendScores = months.map(month => {

            const monthRecords = records.filter(record =>
                getMonth(record.submittedAt) === month
            );

            return average(
                monthRecords.map(record =>
                    average(record.satisfactionAnswers)
                )
            );
        });

        drawChart("satisfactionTrendChart", {
            type: "line",
            data: {
                labels: months.map(month => {

                    const [year, monthNumber] =
                        month.split("-").map(Number);

                    return new Date(
                        year,
                        monthNumber - 1,
                        1
                    ).toLocaleDateString("th-TH", {
                        month: "short",
                        year: "2-digit"
                    });
                }),
                datasets: [{
                    label: "ความพึงพอใจเฉลี่ย / 5",
                    data: trendScores,
                    borderColor: blue,
                    backgroundColor: "rgba(85,196,232,0.15)",
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5
                }]
            },
            options: chartOptions()
        });

        // ======================================
        // 14. SYSTEM TABLE
        // ======================================

        if (tableBody) {

            tableBody.replaceChildren();

            visibleSystems.forEach((system, index) => {

                const systemRecords = records.filter(
                    record => record.systemId === system.id
                );

                const paired = systemRecords.map(
                    comparableAverages
                );

                const before = average(
                    paired.map(record => record.before)
                );

                const after = average(
                    paired.map(record => record.after)
                );

                const satisfaction = average(
                    systemRecords.map(record =>
                        average(record.satisfactionAnswers)
                    )
                );

                const uniqueSystemUsers = new Set(
                    systemRecords.map(record =>
                        record.evaluatorId
                    )
                ).size;

                const row = document.createElement("tr");

                const cells = [
                    index + 1,
                    system.id,
                    system.name,
                    system.categoryName,
                    uniqueSystemUsers,
                    formatScore(before),
                    formatScore(after),
                    formatScore(satisfaction)
                ];

                cells.forEach(value => {

                    const cell = document.createElement("td");
                    cell.textContent = value;

                    row.appendChild(cell);
                });

                const actionCell =
                    document.createElement("td");

                const link =
                    document.createElement("a");

                link.className = "detail-btn";

                link.href =
                    "evaluation-detail.html?system=" +
                    encodeURIComponent(system.id);

                link.textContent = "ดูรายละเอียด";

                actionCell.appendChild(link);
                row.appendChild(actionCell);

                tableBody.appendChild(row);
            });
        }
    }

    // ==========================================
    // 15. เมื่อเปลี่ยนตัวกรองให้อัปเดตทั้งหมด
    // ==========================================

    [
        categoryFilter,
        roleFilter,
        periodFilter
    ].forEach(element => {

        element?.addEventListener(
            "change",
            updateDashboard
        );
    });

    updateDashboard();

    // ==========================================
    // 16. SIDEBAR NAVIGATION + GLOW
    // ==========================================

    const navLinks = document.querySelectorAll(
        ".sidebar-nav .nav-link"
    );

    navLinks.forEach(link => {

        link.addEventListener("click", event => {

            const targetId =
                link.getAttribute("href");

            if (
                !targetId ||
                !targetId.startsWith("#")
            ) {
                return;
            }

            const target =
                document.querySelector(targetId);

            if (!target) return;

            event.preventDefault();

            navLinks.forEach(item =>
                item.classList.remove("active")
            );

            link.classList.add("active");

            if (targetId === "#overview") {

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

                return;
            }

            target.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            target.classList.remove(
                "section-highlight"
            );

            void target.offsetWidth;

            target.classList.add(
                "section-highlight"
            );

            target.addEventListener(
                "animationend",
                () => target.classList.remove(
                    "section-highlight"
                ),
                { once: true }
            );
        });
    });

    console.log(
        "IT Evaluator Dashboard - DEMO MODE",
        demoEvaluations.length,
        "evaluations"
    );
});

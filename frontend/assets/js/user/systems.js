/**
 * IT Evaluator - Systems List Logic (User Module)
 * Faculty of Allied Health Sciences, Naresuan University
 */

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get("category");

    const categoryTitle = document.getElementById("category-title");
    const systemsList = document.getElementById("systems-list");

    const categoryList = typeof categories !== "undefined" ? categories : (window.categories || []);
    const selectedCategory = categoryList.find(category => category.id === categoryId);

    function renderSystems() {
        if (selectedCategory && categoryTitle && systemsList) {
            const catName = window.getCategoryName ? window.getCategoryName(selectedCategory) : selectedCategory.name;
            categoryTitle.textContent = catName;
            systemsList.innerHTML = "";

            selectedCategory.systems.forEach(system => {
                const sysName = window.getSystemName ? window.getSystemName(system) : system.name;
                const card = document.createElement("a");
                card.className = "system-card";
                card.href = `evaluation.html?system=${encodeURIComponent(system.id)}`;

                const ariaLabel = window.t
                    ? window.t("systems_aria_card", { name: sysName, id: system.id })
                    : `เข้าสู่แบบประเมิน ${sysName} รหัส ${system.id}`;
                card.setAttribute("aria-label", ariaLabel);

                const info = document.createElement("div");
                info.className = "system-card-info";

                const name = document.createElement("h3");
                name.textContent = sysName;

                const code = document.createElement("span");
                code.className = "system-card-code";
                code.textContent = window.t
                    ? window.t("system_code", { code: system.id })
                    : `รหัสระบบ: ${system.id}`;

                info.appendChild(name);
                info.appendChild(code);

                const actionIcon = document.createElement("div");
                actionIcon.className = "card-action-icon";
                actionIcon.innerHTML = `
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13h11.86l-5.43 5.43 1.42 1.42L21.14 12l-8.29-7.85-1.42 1.42 5.43 5.43H5v2z"/></svg>
                `;

                card.appendChild(info);
                card.appendChild(actionIcon);

                systemsList.appendChild(card);
            });
        } else if (categoryTitle && systemsList) {
            categoryTitle.textContent = window.t ? window.t("category_not_found") : "ไม่พบข้อมูลหมวดหมู่";

            const emptyNotice = document.createElement("div");
            emptyNotice.className = "empty-systems-notice";
            const emptyDesc = window.t
                ? window.t("category_not_found_desc")
                : "ไม่พบรหัสหมวดหมู่ระบบสารสนเทศที่ระบุ";
            const backText = window.t ? window.t("back_to_categories") : "กลับสู่หน้ารายการหมวดหมู่";

            emptyNotice.innerHTML = `
                <p style="font-size: 1rem; margin-bottom: 16px; color: var(--text-primary);">${emptyDesc}</p>
                <a href="index.html" class="btn btn-primary">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 11H7.14l5.43-5.43L11.15 4.15 2.86 12.43l8.29 8.28 1.42-1.42-5.43-5.43H19v-2.86z"/></svg>
                    <span>${backText}</span>
                </a>
            `;
            systemsList.innerHTML = "";
            systemsList.appendChild(emptyNotice);
        }
    }

    renderSystems();
    document.addEventListener("langchange", renderSystems);
});

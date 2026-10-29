/**
 * IT Evaluator - Category Gallery Logic (User Module)
 * Faculty of Allied Health Sciences, Naresuan University
 */

document.addEventListener("DOMContentLoaded", () => {
    const gallery = document.getElementById("gallery");
    const categoryList = typeof categories !== "undefined" ? categories : (window.categories || []);

    if (gallery && categoryList.length > 0) {
        gallery.innerHTML = "";

        categoryList.forEach((category) => {
            const item = document.createElement("div");
            item.className = "gallery-item";
            item.setAttribute("role", "button");
            item.setAttribute("tabindex", "0");
            item.setAttribute("aria-label", `${category.name} มี ${category.systems.length} ระบบ`);

            const imagePath = `../assets/images/categories/${category.image}`;
            item.style.backgroundImage = `url("${imagePath}")`;

            const content = document.createElement("div");
            content.className = "gallery-content";

            const title = document.createElement("h3");
            title.textContent = category.name;

            const meta = document.createElement("div");
            meta.className = "gallery-meta";

            const countBadge = document.createElement("span");
            countBadge.className = "count-badge";
            countBadge.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6zm2 2v8h12V8H6zm-4 4H0v8a2 2 0 002 2h18v-2H2v-8z"/></svg>
                ${category.systems.length} ระบบ
            `;

            const actionText = document.createElement("span");
            actionText.className = "action-text";
            actionText.innerHTML = `
                เข้าสู่ระบบ
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13h11.86l-5.43 5.43 1.42 1.42L21.14 12l-8.29-7.85-1.42 1.42 5.43 5.43H5v2z"/></svg>
            `;

            meta.appendChild(countBadge);
            meta.appendChild(actionText);

            content.appendChild(title);
            content.appendChild(meta);

            item.appendChild(content);

            const navigate = () => {
                window.location.href = `systems.html?category=${encodeURIComponent(category.id)}`;
            };

            item.addEventListener("click", navigate);
            item.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate();
                }
            });

            gallery.appendChild(item);
        });
    }
});

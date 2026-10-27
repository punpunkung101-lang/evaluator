
// อ่านค่า category จาก URL
const params = new URLSearchParams(window.location.search);

const categoryId = params.get("category");

// ค้นหาหมวดหมู่ที่ตรงกับ URL
const selectedCategory = categories.find(
    category => category.id === categoryId
);

// เลือกตำแหน่ง HTML ที่จะแสดงผล
const categoryTitle = document.getElementById("category-title");
const systemsList = document.getElementById("systems-list");

if (selectedCategory) {

    // แสดงชื่อหมวดหมู่
    categoryTitle.textContent = selectedCategory.name;

    // สร้างการ์ดให้แต่ละระบบ
    selectedCategory.systems.forEach(system => {

        const card = document.createElement("a");
        card.className = "system-card";

        // ส่งรหัสระบบไปยังหน้าประเมิน
        card.href = `evaluation.html?system=${encodeURIComponent(system.id)}`;

        const info = document.createElement("div");

        const name = document.createElement("h3");
        name.textContent = system.name;

        const code = document.createElement("p");
        code.textContent = `รหัสระบบ: ${system.id}`;

        const arrow = document.createElement("span");
        arrow.className = "card-arrow";
        arrow.textContent = "→";

        info.appendChild(name);
        info.appendChild(code);

        card.appendChild(info);
        card.appendChild(arrow);

        systemsList.appendChild(card);
    });

} else {

    categoryTitle.textContent = "ไม่พบหมวดหมู่";

    const message = document.createElement("p");
    message.textContent = "กรุณากลับไปเลือกหมวดหมู่จากหน้าแรก";

    systemsList.appendChild(message);
}

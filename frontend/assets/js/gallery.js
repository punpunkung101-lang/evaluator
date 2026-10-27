
const gallery = document.getElementById("gallery");

categories.forEach((category) => {

    // สร้างการ์ดหนึ่งใบ
    const item = document.createElement("div");
    item.className = "gallery-item";

    // กำหนดรูปภาพพื้นหลัง
    const imagePath =
        `../assets/images/categories/${category.image}`;

    item.style.backgroundImage = `url("${imagePath}")`;

    // สร้างส่วนแสดงข้อความ
    const content = document.createElement("div");
    content.className = "gallery-content";

    const title = document.createElement("h3");
    title.textContent = category.name;

    const count = document.createElement("p");
    count.textContent =
        `${category.systems.length} ระบบ`;

    content.appendChild(title);
    content.appendChild(count);
    item.appendChild(content);

    // เมื่อคลิกการ์ด ไปหน้ารายการระบบ
    item.addEventListener("click", () => {
        window.location.href =
            `systems.html?category=${category.id}`;
    });

    // เพิ่มการ์ดลงใน Gallery
    gallery.appendChild(item);
});

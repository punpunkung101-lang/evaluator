(function () {
    "use strict";
    const base = window.ENV?.API_BASE_URL || "http://127.0.0.1:8080";
    const page = `${location.pathname}${location.search}${location.hash}`;
    const home = new URL("../../Effectiveness_Of_It/main/index.html", location.href);
    document.documentElement.classList.add("auth-pending");
    const guardStyle = document.createElement("style");
    guardStyle.textContent = "html.auth-pending body{visibility:hidden}.admin-denied-overlay{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:rgba(12,25,43,.78);padding:24px}.admin-denied-overlay>div{width:min(520px,100%);padding:32px;border-radius:16px;background:#fff;color:#17263c;text-align:center;box-shadow:0 18px 70px #0005}.admin-denied-overlay h1{margin:0 0 12px}.admin-denied-overlay a{display:inline-block;margin-top:16px;padding:10px 18px;border-radius:8px;background:#173b68;color:white;text-decoration:none}";
    document.head.append(guardStyle);
    function requireLogin() {
        home.searchParams.set("login", "1");
        home.searchParams.set("returnTo", page);
        location.replace(home.href);
    }
    function deny(title = "ไม่มีสิทธิ์เข้าถึง Admin", message = "บัญชีนี้ไม่มีสิทธิ์ดูแดชบอร์ดหรือแก้ไขคำถาม") {
        document.documentElement.classList.remove("auth-pending");
        const overlay = document.createElement("section");
        overlay.className = "admin-denied-overlay";
        overlay.setAttribute("role", "alertdialog");
        overlay.setAttribute("aria-modal", "true");
        const content = document.createElement("div");
        const heading = document.createElement("h1");
        heading.textContent = title;
        const detail = document.createElement("p");
        detail.textContent = message;
        const link = document.createElement("a");
        link.href = "../../Effectiveness_Of_It/main/index.html";
        link.textContent = "กลับหน้าหลัก";
        content.append(heading, detail, link);
        overlay.append(content);
        document.body.append(overlay);
        Array.from(document.body.children).forEach(el => { if (el !== overlay) el.inert = true; });
    }
    (async () => {
        const token = sessionStorage.getItem("evaluatorToken");
        if (!token) return requireLogin();
        try {
            const response = await fetch(`${base}/auth/me`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.status === 401) return requireLogin();
            if (!response.ok) throw new Error(`session check failed (HTTP ${response.status})`);
            const result = await response.json();
            if (result.user.role !== "admin") return deny();
            sessionStorage.setItem("evaluatorProfile", JSON.stringify({
                id: result.user.id, username: result.user.username, name: result.user.displayName,
                evaluatorName: result.user.displayName, role: result.user.role, userRole: result.user.role
            }));
            document.documentElement.classList.remove("auth-pending");
        } catch (error) {
            console.error("[AdminGuard] Could not verify dashboard role", error);
            deny("ตรวจสอบสิทธิ์ไม่สำเร็จ", "เชื่อมต่อระบบตรวจสอบบัญชีไม่ได้ กรุณาลองใหม่อีกครั้ง");
        }
    })();
})();

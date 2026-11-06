(function () {
    "use strict";
    const base = window.ENV?.API_BASE_URL || "http://127.0.0.1:8080";
    const page = `${location.pathname}${location.search}${location.hash}`;
    const home = new URL("../../Effectiveness_Of_It/main/index.html", location.href);
    const pendingClass = "auth-pending";
    let domReady = document.readyState === "complete";
    document.addEventListener("DOMContentLoaded", () => { domReady = true; }, { once: true });
    document.documentElement.classList.add(pendingClass);
    const style = document.createElement("style");
    style.textContent = `html.${pendingClass} body{visibility:hidden}.admin-gate{min-height:100vh;display:grid;place-items:center;padding:24px;background:rgba(12,25,43,.96);font:16px/1.5 'Kanit',sans-serif}.admin-gate>div{width:min(520px,100%);padding:32px;border-radius:16px;background:#fff;color:#17263c;text-align:center;box-shadow:0 18px 70px #0005}.admin-gate h1{margin:0 0 12px}.admin-gate a,.admin-gate button{display:inline-block;margin-top:16px;padding:10px 18px;border:0;border-radius:8px;background:#173b68;color:white;text-decoration:none;font:inherit;cursor:pointer}`;
    document.head.append(style);

    function clearExpiredSession() {
        sessionStorage.removeItem("evaluatorToken");
        sessionStorage.removeItem("evaluatorProfile");
    }
    function requireLogin() {
        home.searchParams.set("login", "1");
        home.searchParams.set("returnTo", page);
        location.replace(home.href);
    }
    async function waitForPageScripts() {
        if (!domReady) await new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    async function showGate(title, message, canRetry = false) {
        await waitForPageScripts();
        const panel = document.createElement("div");
        const heading = document.createElement("h1");
        heading.textContent = title;
        const detail = document.createElement("p");
        detail.textContent = message;
        panel.append(heading, detail);
        if (canRetry) {
            const retry = document.createElement("button");
            retry.type = "button";
            retry.textContent = "ลองอีกครั้ง";
            retry.addEventListener("click", () => location.reload());
            panel.append(retry);
        }
        const homeLink = document.createElement("a");
        homeLink.href = "../../Effectiveness_Of_It/main/index.html";
        homeLink.textContent = "กลับหน้าหลัก";
        panel.append(homeLink);
        const gate = document.createElement("main");
        gate.className = "admin-gate";
        gate.setAttribute("role", "alert");
        gate.append(panel);
        document.body.replaceChildren(gate);
        document.documentElement.classList.remove(pendingClass);
    }

    const ready = (async () => {
        const token = sessionStorage.getItem("evaluatorToken");
        if (!token) {
            clearExpiredSession();
            requireLogin();
            throw new Error("login required");
        }
        try {
            const response = await fetch(`${base}/auth/me`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.status === 401) {
                clearExpiredSession();
                requireLogin();
                throw new Error("login required");
            }
            if (!response.ok) throw new Error(`session check failed (HTTP ${response.status})`);
            const result = await response.json();
            const user = result.user;
            if (!user?.id || user.role !== "admin") {
                await showGate("ไม่มีสิทธิ์เข้าถึง Admin", "บัญชีนี้ไม่มีสิทธิ์ดูแดชบอร์ดหรือจัดการข้อมูล");
                throw new Error("admin role required");
            }
            document.documentElement.classList.remove(pendingClass);
            return user;
        } catch (error) {
            if (error.message === "login required" || error.message === "admin role required") throw error;
            console.error("[AdminGuard] Could not verify dashboard role", error);
            await showGate("ตรวจสอบสิทธิ์ไม่สำเร็จ", "เชื่อมต่อระบบตรวจสอบบัญชีไม่ได้ กรุณาลองใหม่อีกครั้ง", true);
            throw error;
        }
    })();
    // The page scripts await this shared gate; attach a handler to avoid a browser-level
    // unhandled-rejection warning when the browser redirects a guest before they run.
    ready.catch(() => {});
    window.AdminGuard = { ready };
})();

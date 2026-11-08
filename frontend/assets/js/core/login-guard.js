(function () {
    "use strict";
    const scriptUrl = document.currentScript?.src;
    const base = window.ENV?.API_BASE_URL || "http://127.0.0.1:8080";
    const page = `${location.pathname}${location.search}${location.hash}`;
    const home = new URL(window.EvaluatorRuntimeUrl.fromScript("../../../user/index.html", scriptUrl));
    function askForLogin() {
        home.searchParams.set("login", "1");
        home.searchParams.set("returnTo", page);
        location.replace(home.href);
    }
    document.documentElement.classList.add("auth-pending");
    const guardStyle = document.createElement("style");
    guardStyle.textContent = "html.auth-pending body{visibility:hidden}.auth-check-error{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:#0c192bcc}.auth-check-error>div{width:min(520px,100%);padding:28px;border-radius:14px;background:#fff;color:#17263c;font:16px/1.5 sans-serif}.auth-check-error button{margin-top:12px;padding:9px 16px;cursor:pointer}";
    document.head.append(guardStyle);
    function showVerificationError(error) {
        const render = () => {
            document.documentElement.classList.remove("auth-pending");
            const overlay = document.createElement("section");
            overlay.className = "auth-check-error";
            overlay.setAttribute("role", "alert");
            const panel = document.createElement("div");
            const heading = document.createElement("h1");
            heading.textContent = "ตรวจสอบการเข้าสู่ระบบไม่ได้";
            const detail = document.createElement("p");
            detail.textContent = `Backend ยังยืนยัน session ไม่ได้: ${error.message}`;
            const retry = document.createElement("button");
            retry.type = "button";
            retry.textContent = "ลองอีกครั้ง";
            retry.addEventListener("click", () => location.reload());
            panel.append(heading, detail, retry);
            overlay.append(panel);
            document.body.append(overlay);
        };
        if (document.body) render();
        else document.addEventListener("DOMContentLoaded", render, { once: true });
    }
    (async () => {
        const token = sessionStorage.getItem("evaluatorToken");
        if (!token) return askForLogin();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(`${base}/auth/session`, {
                method: "POST",
                signal: controller.signal,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: "{}"
            });
            if (!response.ok) {
                if (response.status === 401) {
                    sessionStorage.removeItem("evaluatorToken");
                    sessionStorage.removeItem("evaluatorProfile");
                    return askForLogin();
                }
                throw new Error(`HTTP ${response.status}`);
            }
            const result = await response.json();
            sessionStorage.setItem("evaluatorProfile", JSON.stringify({
                id: result.user.id, username: result.user.username, name: result.user.displayName,
                evaluatorName: result.user.displayName, role: result.user.role, userRole: result.user.role
            }));
            document.documentElement.classList.remove("auth-pending");
        } catch (error) {
            console.error("[EvaluatorAuth] Protected assessment page could not verify session", error);
            showVerificationError(error.name === "AbortError" ? new Error("หมดเวลารอ Backend ตอบกลับ") : error);
        } finally {
            clearTimeout(timeout);
        }
    })();
})();

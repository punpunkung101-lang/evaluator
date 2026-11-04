(function (root) {
    "use strict";
    const base = root.ENV?.API_BASE_URL || "http://localhost:8080";
    const auth = {
        async request(path, values) {
            let response;
            try {
                response = await fetch(`${base}${path}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values)
                });
            } catch (error) {
                throw new Error(`เชื่อมต่อฐานข้อมูลไม่ได้ (${base}): ${error.message}`);
            }
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
            return result.user;
        },
        login(username, password) { return this.request("/auth/login", { username, password }); },
        register(username, password, displayName, role) {
            return this.request("/auth/register", { username, password, displayName, role });
        },
        saveSession(user) {
            sessionStorage.setItem("evaluatorProfile", JSON.stringify({
                id: user.id, username: user.username, name: user.displayName,
                evaluatorName: user.displayName, role: user.role, userRole: user.role
            }));
            return user;
        },
        current() {
            try { return JSON.parse(sessionStorage.getItem("evaluatorProfile") || "null"); }
            catch (_) { return null; }
        }
    };
    root.EvaluatorAuth = auth;
})(typeof window !== "undefined" ? window : globalThis);

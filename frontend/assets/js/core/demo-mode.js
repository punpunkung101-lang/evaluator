/**
 * Read-only demo mode for the Admin pages.
 *
 * Turn on : open any Admin page with ?demo=1 (e.g. frontend/admin/dashboard.html?demo=1)
 * Turn off: ?demo=0, the banner's exit link, or sign in normally (a real login token turns it off).
 *
 * In demo mode the Admin GET endpoints are answered from frontend/assets/data/mock-snapshot.js
 * (development mock rows exported from database/evaluator.db), so the dashboard works with no
 * backend. Writes are NOT faked: every POST/PUT/DELETE is rejected, so nothing is ever saved to
 * SQL in demo mode. Outside demo mode this file does nothing and the C++ backend/SQLite flow is
 * unchanged. Real data is never exposed: the snapshot contains only mock-* rows.
 */
(function (root) {
    "use strict";
    const FLAG = "evaluatorDemo";
    const store = (() => { try { return root.sessionStorage; } catch (_) { return null; } })();
    const params = new URLSearchParams(root.location?.search || "");

    if (params.get("demo") === "0") store?.removeItem(FLAG);
    else if (params.get("demo") === "1") store?.setItem(FLAG, "1");
    else if (store?.getItem("evaluatorToken")) store.removeItem(FLAG); // a real login wins over demo

    const active = store?.getItem(FLAG) === "1";
    const scriptSrc = document.currentScript?.src;
    const user = Object.freeze({ id: "demo", username: "demo", displayName: "Demo (mock data)", display_name: "Demo (mock data)", role: "admin", demo: true });
    root.EvaluatorDemo = Object.freeze({ active, user });
    if (!active) return;

    // The snapshot is ~1.5 MB, so it is only loaded (synchronously, before the guard runs) in demo mode.
    if (!root.EvaluatorMockSnapshot && scriptSrc) {
        document.write('<script src="' + new URL("../../data/mock-snapshot.js", scriptSrc).href + '"><\/script>');
    }
    const getSnapshot = () => root.EvaluatorMockSnapshot || { systems: [], questions: {}, evaluations: [], quantitative: [] };
    window.addEventListener("DOMContentLoaded", () => {
        if (!root.EvaluatorMockSnapshot) console.warn("[Demo] frontend/assets/data/mock-snapshot.js is missing; run: node database/mock/export-mock-snapshot.cjs");
    }, { once: true });

    const base = String(root.ENV?.API_BASE_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");
    const realFetch = root.fetch?.bind(root);
    const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    const clone = value => JSON.parse(JSON.stringify(value));

    root.fetch = function (input, init) {
        const url = new URL(typeof input === "string" ? input : input.url, root.location.href);
        if (url.origin !== new URL(base).origin) return realFetch(input, init);
        const method = String(init?.method || (typeof input !== "string" && input.method) || "GET").toUpperCase();
        const route = url.pathname;
        if (method !== "GET") {
            return Promise.resolve(json(403, { error: "โหมดข้อมูลตัวอย่าง (Demo) อ่านอย่างเดียว ไม่บันทึกลงฐานข้อมูล" }));
        }
        if (route === "/health") return Promise.resolve(json(200, { status: "ok", demo: true }));
        if (route === "/auth/me" || route === "/auth/session") return Promise.resolve(json(200, { user: clone(user) }));
        if (route === "/systems") return Promise.resolve(json(200, clone(getSnapshot().systems)));
        if (route === "/evaluations") return Promise.resolve(json(200, clone(getSnapshot().evaluations)));
        if (route === "/quantitative") return Promise.resolve(json(200, clone(getSnapshot().quantitative)));
        if (route === "/questions") {
            const type = url.searchParams.get("assessment_type") || "";
            const rows = getSnapshot().questions[url.searchParams.get("system_id")] || [];
            return Promise.resolve(json(200, clone(rows.filter(q => !type || q.assessmentType === type))));
        }
        return realFetch(input, init);
    };

    function showBanner() {
        const bar = document.createElement("div");
        bar.setAttribute("role", "status");
        bar.style.cssText = "position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483000;max-width:calc(100% - 24px);" +
            "padding:8px 16px;border-radius:999px;background:#7c2d12;color:#fff;font:14px/1.4 'Kanit',sans-serif;box-shadow:0 4px 18px #0004;text-align:center";
        bar.append("โหมดข้อมูลตัวอย่าง (Mock) · อ่านอย่างเดียว ไม่ใช่ผลประเมินจริง · ");
        const exit = document.createElement("a");
        const target = new URL(root.location.href);
        target.searchParams.set("demo", "0");
        exit.href = target.href;
        exit.textContent = "ออกจากโหมดตัวอย่าง";
        exit.style.cssText = "color:#fde68a;text-decoration:underline";
        bar.append(exit);
        document.body.append(bar);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showBanner, { once: true });
    else showBanner();
})(typeof window !== "undefined" ? window : globalThis);
